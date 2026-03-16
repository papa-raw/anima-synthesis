import { Router } from 'express';
import { getDb } from '../db/init.js';

const router = Router();

// GET /api/heartbeats/:agentId — heartbeat history for an agent
router.get('/:agentId', (req, res) => {
  const db = getDb();
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const heartbeats = db.prepare(
    'SELECT * FROM agent_heartbeats WHERE agent_id = ? ORDER BY created_at DESC LIMIT ?'
  ).all(req.params.agentId, limit);

  res.json(heartbeats);
});

export default router;
