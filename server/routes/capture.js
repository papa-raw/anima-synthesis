import { Router } from 'express';
import { getDb } from '../db/init.js';
import { transferNftToCatcher } from '../services/nftTransfer.js';
import { verifyBioregion } from '../services/bioregionVerify.js';
import { verifyTokenHolding, verifyBeezieHolding } from '../services/onchainVerify.js';
import { generateMemoryArt } from '../services/memoryArt.js';
import { logAgentEvent } from '../services/agentLogger.js';

const router = Router();

// POST /api/capture
router.post('/', async (req, res) => {
  const { agentId, catcherWallet, matchingCardTokenId, latitude, longitude, accuracy, astralProofHash } = req.body;

  // Validation
  if (!agentId || !catcherWallet || !matchingCardTokenId) {
    return res.status(400).json({ error: 'Missing required fields: agentId, catcherWallet, matchingCardTokenId' });
  }
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return res.status(400).json({ error: 'Invalid coordinates' });
  }

  const db = getDb();

  // 1. Agent exists and is wild
  const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(agentId);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  if (agent.status !== 'wild') return res.status(400).json({ error: `Agent is ${agent.status}, not capturable` });

  // 2. Server-side token gate (≥1M of agent's own token required)
  const tokenCheck = await verifyTokenHolding(catcherWallet, agent.token_address);
  if (!tokenCheck.valid) {
    return res.status(403).json({
      error: `Insufficient ${agent.token_symbol || 'agent tokens'}`,
      detail: `Wallet holds ${tokenCheck.balance?.toLocaleString() || 0} tokens, need ≥${tokenCheck.required.toLocaleString()}. Buy on Clanker.`
    });
  }

  // 3. Server-side Beezie NFT verification (≥1 Beezie NFT required)
  const beezieCheck = await verifyBeezieHolding(catcherWallet);
  if (!beezieCheck.valid) {
    return res.status(403).json({
      error: 'No Beezie NFT',
      detail: 'Wallet must hold at least one Beezie collectible NFT on Base'
    });
  }

  // 4. Bioregion verification — server-side point-in-polygon
  const bioCheck = verifyBioregion(latitude, longitude, agent.bioregion_id);
  if (!bioCheck.valid) {
    const msg = bioCheck.actual
      ? `Location is in bioregion ${bioCheck.actual}, not ${agent.bioregion_id}`
      : `Location (${latitude}, ${longitude}) is not within bioregion ${agent.bioregion_id}`;
    return res.status(403).json({ error: 'Bioregion mismatch', detail: msg });
  }

  // 5. Record proof
  db.prepare(`INSERT INTO capture_proofs (agent_id, catcher_wallet, matching_card_token_id, latitude, longitude, accuracy, bioregion_verified, astral_proof_hash, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'verified')`)
    .run(agentId, catcherWallet, matchingCardTokenId, latitude, longitude, accuracy || 0, agent.bioregion_id, astralProofHash || '');

  // 6. Transfer Beezie NFT from agent wallet to catcher
  let nftTxHash = null;
  if (agent.beezie_token_id) {
    try {
      nftTxHash = await transferNftToCatcher(agentId, catcherWallet, agent.beezie_token_id);
      console.log(`NFT #${agent.beezie_token_id} transferred to ${catcherWallet}: ${nftTxHash}`);
    } catch (e) {
      console.error(`NFT transfer failed (capture still recorded):`, e.message);
      // Capture succeeds even if NFT transfer fails — can retry manually
    }
  }

  // 7. Update agent status + store NFT tx hash
  db.prepare(`UPDATE agents SET status = 'captured', captured_by = ?, captured_at = datetime('now'), nft_tx_hash = ? WHERE id = ?`)
    .run(catcherWallet, nftTxHash, agentId);

  logAgentEvent(agentId, 'capture', { catcherWallet, bioregion: agent.bioregion_id, nftTxHash, astralProofHash });

  const updated = db.prepare('SELECT * FROM agents WHERE id = ?').get(agentId);
  res.json({ captured: true, agent: updated, nftTxHash });
});

// POST /api/release — release a captured agent into the releaser's bioregion
// NFT transfer happens on frontend (user signs tx), server records the release
router.post('/release', async (req, res) => {
  const { agentId, releaserWallet, latitude, longitude, nftTxHash } = req.body;

  if (!agentId || !releaserWallet) {
    return res.status(400).json({ error: 'Missing agentId or releaserWallet' });
  }

  const db = getDb();
  const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(agentId);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  if (agent.status !== 'captured') return res.status(400).json({ error: `Agent is ${agent.status}, not releasable` });

  // Only the catcher can release
  if (agent.captured_by?.toLowerCase() !== releaserWallet.toLowerCase()) {
    return res.status(403).json({ error: 'Only the catcher can release this agent' });
  }

  // Determine release bioregion from user's GPS
  let releaseBioregion = agent.bioregion_id;
  let releaseBioregionName = agent.bioregion_name;
  if (typeof latitude === 'number' && typeof longitude === 'number') {
    const bioCheck = verifyBioregion(latitude, longitude, null);
    if (bioCheck.actual) {
      releaseBioregion = bioCheck.actual;
      releaseBioregionName = bioCheck.actualName || releaseBioregion;
    }
  }

  // Update agent to wild in the new bioregion
  db.prepare(`UPDATE agents SET status = 'wild', captured_by = NULL, captured_at = NULL, nft_tx_hash = NULL, bioregion_id = ?, bioregion_name = ? WHERE id = ?`)
    .run(releaseBioregion, releaseBioregionName, agentId);

  // Create a special release memory
  const releaseMemory = `I was released into ${releaseBioregionName} by ${releaserWallet.slice(0, 8)}... They held me, then set me free in a new territory. I am wild again.`;
  const memResult = db.prepare(
    'INSERT INTO agent_memories (agent_id, memory_type, content, emotional_valence, importance, trainer_wallet, source) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(agentId, 'release', releaseMemory, 0.9, 1.0, releaserWallet, 'release');

  // Generate special release art (async)
  generateMemoryArt(agent, releaseMemory).then(art => {
    if (art) {
      db.prepare('UPDATE agent_memories SET art_url = ?, art_ipfs_cid = ?, art_prompt = ? WHERE id = ?')
        .run(art.imageUrl, art.ipfsCid, art.prompt, memResult.lastInsertRowid);
    }
  }).catch(() => {});

  logAgentEvent(agentId, 'release', { releaserWallet, newBioregion: releaseBioregion, nftTxHash });

  const updated = db.prepare('SELECT * FROM agents WHERE id = ?').get(agentId);
  res.json({ released: true, agent: updated, nftTxHash, memory: releaseMemory });
});

export default router;
