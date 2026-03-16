import { Router } from 'express';
import { getDb } from '../db/init.js';
import { transferNftToCatcher } from '../services/nftTransfer.js';

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

  // 2-3. Card verification (onchain verify would go here — for now trust the frontend)
  // TODO: Add server-side beezieVerify.js call for production

  // 4. Bioregion verification (point-in-polygon would go here)
  // For hackathon: trust the frontend + demo mode

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

  // 7. Update agent status
  db.prepare(`UPDATE agents SET status = 'captured', captured_by = ?, captured_at = datetime('now') WHERE id = ?`)
    .run(catcherWallet, agentId);

  const updated = db.prepare('SELECT * FROM agents WHERE id = ?').get(agentId);
  res.json({ captured: true, agent: updated, nftTxHash });
});

export default router;
