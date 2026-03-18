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

// GET /api/agents/:id/memories — memories with art
router.get('/:id/memories', (req, res) => {
  res.set('Cache-Control', 'no-store');
  const db = getDb();
  const memories = db.prepare(
    'SELECT id, memory_type, content, art_url, art_ipfs_cid, art_prompt, trainer_wallet, created_at FROM agent_memories WHERE agent_id = ? ORDER BY created_at DESC LIMIT 50'
  ).all(req.params.id);
  res.json(memories);
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
