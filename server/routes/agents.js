import { Router } from 'express';
import { getDb } from '../db/init.js';

const router = Router();

// GET /api/agents — all agents with live status
router.get('/', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  const db = getDb();
  const agents = db.prepare('SELECT * FROM agents ORDER BY created_at').all();
  res.json(agents);
});

// GET /api/agents/:id/status — single agent full state + recent heartbeats
router.get('/:id/status', (req, res) => {
  const db = getDb();
  const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });

  const heartbeats = db.prepare(
    'SELECT * FROM agent_heartbeats WHERE agent_id = ? ORDER BY created_at DESC LIMIT 10'
  ).all(req.params.id);

  res.json({ ...agent, recentHeartbeats: heartbeats });
});

// GET /api/agents/:id/memories — memories with art + auction status
router.get('/:id/memories', (req, res) => {
  res.set('Cache-Control', 'no-store');
  const db = getDb();
  const memories = db.prepare(
    'SELECT id, memory_type, content, art_url, art_ipfs_cid, art_prompt, nft_token_id, nft_contract, auction_status, auction_settle_tx, auction_settled_at, trainer_wallet, created_at FROM agent_memories WHERE agent_id = ? ORDER BY created_at DESC LIMIT 50'
  ).all(req.params.id);
  res.json(memories);
});

// GET /api/agents/:id/history — unified transaction timeline
router.get('/:id/history', (req, res) => {
  res.set('Cache-Control', 'no-store');
  const db = getDb();
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);

  // Fee claims + survival mode from heartbeats
  const txHeartbeats = db.prepare(
    `SELECT id, action, tx_hash, eth_balance, weth_claimable, created_at
     FROM agent_heartbeats
     WHERE agent_id = ? AND action IN ('fee_claim', 'survival_mode', 'death', 'basename_register')
     ORDER BY created_at DESC LIMIT ?`
  ).all(req.params.id, limit);

  // NFT mints + auction settlements from memories
  const nftEvents = db.prepare(
    `SELECT id, nft_token_id, nft_contract, auction_status, auction_settle_tx, auction_settled_at, art_url, content, created_at
     FROM agent_memories
     WHERE agent_id = ? AND nft_token_id IS NOT NULL
     ORDER BY created_at DESC LIMIT ?`
  ).all(req.params.id, limit);

  // Capture/release events
  const captures = db.prepare(
    `SELECT id, catcher_wallet, astral_proof_hash, status, created_at
     FROM capture_proofs
     WHERE agent_id = ?
     ORDER BY created_at DESC LIMIT ?`
  ).all(req.params.id, limit);

  // Build unified timeline
  const events = [];

  for (const h of txHeartbeats) {
    events.push({
      type: h.action,
      txHash: h.tx_hash,
      ethBalance: h.eth_balance,
      timestamp: h.created_at,
    });
  }

  for (const m of nftEvents) {
    events.push({
      type: 'nft_mint',
      nftTokenId: m.nft_token_id,
      nftContract: m.nft_contract,
      artUrl: m.art_url,
      content: m.content,
      timestamp: m.created_at,
    });
    if (m.auction_status === 'settled' && m.auction_settle_tx) {
      events.push({
        type: 'auction_settle',
        nftTokenId: m.nft_token_id,
        txHash: m.auction_settle_tx,
        timestamp: m.auction_settled_at || m.created_at,
      });
    }
  }

  for (const c of captures) {
    events.push({
      type: c.status === 'released' ? 'release' : 'capture',
      wallet: c.catcher_wallet,
      txHash: c.astral_proof_hash || null,
      timestamp: c.created_at,
    });
  }

  // Genesis event — agent creation
  const agent = db.prepare('SELECT created_at, pokemon FROM agents WHERE id = ?').get(req.params.id);
  if (agent) {
    events.push({
      type: 'ensouled',
      content: `${agent.pokemon} was ensouled`,
      timestamp: agent.created_at,
    });
  }

  // Sort by timestamp descending
  events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  res.json(events.slice(0, limit));
});

// POST /api/agents/:id/set-name — store Basename after capture
router.post('/:id/set-name', (req, res) => {
  const { name, txHash, registrant } = req.body;
  if (!name) return res.status(400).json({ error: 'Missing name' });

  const db = getDb();
  const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });

  // Only the catcher can name a captured agent
  if (agent.status !== 'captured' || !agent.captured_by) {
    return res.status(403).json({ error: 'Agent must be captured to be named' });
  }
  if (registrant && agent.captured_by.toLowerCase() !== registrant.toLowerCase()) {
    return res.status(403).json({ error: 'Only the catcher can name this agent' });
  }

  db.prepare('UPDATE agents SET ens_name = ? WHERE id = ?').run(name, req.params.id);

  // Record naming event in heartbeats for history timeline
  if (txHash) {
    db.prepare(
      `INSERT INTO agent_heartbeats (agent_id, action, tx_hash, eth_balance) VALUES (?, 'basename_register', ?, 0)`
    ).run(req.params.id, txHash);
  }

  res.json({ named: true, name, txHash });
});

// GET /api/agents/:id/heartbeats — heartbeat history
router.get('/:id/heartbeats', (req, res) => {
  const db = getDb();
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const heartbeats = db.prepare(
    'SELECT * FROM agent_heartbeats WHERE agent_id = ? ORDER BY created_at DESC LIMIT ?'
  ).all(req.params.id, limit);

  res.json(heartbeats);
});

export default router;
