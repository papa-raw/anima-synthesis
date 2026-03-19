import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
let db = null;

export function initDb() {
  if (db) return db;
  db = new Database(join(__dirname, 'anima.db'));
  db.pragma('journal_mode = WAL');
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema);

  // Migrations — add auction columns to agent_memories
  const migrations = [
    'ALTER TABLE agent_memories ADD COLUMN auction_status TEXT',
    'ALTER TABLE agent_memories ADD COLUMN auction_settle_tx TEXT',
    'ALTER TABLE agent_memories ADD COLUMN auction_settled_at DATETIME',
    'ALTER TABLE agents ADD COLUMN ens_name TEXT',
    'ALTER TABLE agents ADD COLUMN svvv_staked REAL DEFAULT 0',
    'ALTER TABLE agent_memories ADD COLUMN art_url TEXT',
    'ALTER TABLE agent_memories ADD COLUMN art_ipfs_cid TEXT',
    'ALTER TABLE agent_memories ADD COLUMN art_prompt TEXT',
    'ALTER TABLE agent_memories ADD COLUMN nft_token_id TEXT',
    'ALTER TABLE agent_memories ADD COLUMN nft_contract TEXT',
  ];
  for (const sql of migrations) {
    try { db.exec(sql); } catch { /* column already exists */ }
  }

  console.log('Database initialized');
  return db;
}

export function getDb() {
  if (!db) throw new Error('Database not initialized. Call initDb() first.');
  return db;
}
