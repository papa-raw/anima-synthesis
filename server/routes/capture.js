import { Router } from 'express';
import { getDb } from '../db/init.js';
import { transferNftToCatcher } from '../services/nftTransfer.js';
import { verifyBioregion } from '../services/bioregionVerify.js';
import { verifyAzusdHolding, verifyBeezieHolding } from '../services/onchainVerify.js';

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

  // 2. Server-side AZUSD verification (≥5 AZUSD required)
  const azusdCheck = await verifyAzusdHolding(catcherWallet);
  if (!azusdCheck.valid) {
    return res.status(403).json({
      error: 'Insufficient AZUSD',
      detail: `Wallet holds ${azusdCheck.balance} AZUSD, need ≥${azusdCheck.required}. Mint at app.azos.finance`
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

  const updated = db.prepare('SELECT * FROM agents WHERE id = ?').get(agentId);
  res.json({ captured: true, agent: updated, nftTxHash });
});

export default router;
