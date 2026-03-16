#!/usr/bin/env node
/**
 * Reset an agent to wild status
 * Usage: node scripts/reset-agent.js [agent-id]
 * Default: agent-phanpy
 */
import { initDb } from '../server/db/init.js';

const id = process.argv[2] || 'agent-phanpy';
const db = initDb();
db.prepare('UPDATE agents SET status = ?, captured_by = NULL, captured_at = NULL WHERE id = ?').run('wild', id);
console.log(`${id} → WILD`);
process.exit(0);
