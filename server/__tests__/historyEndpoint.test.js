/**
 * History Endpoint Tests
 *
 * Tests GET /api/agents/:id/history — the unified transaction timeline.
 * Uses in-memory SQLite + direct function call (no HTTP server needed).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

let db;

function setupDb() {
  db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  const schema = readFileSync(join(__dirname, '../db/schema.sql'), 'utf8');
  db.exec(schema);

  // Migrations
  const migrations = [
    'ALTER TABLE agent_memories ADD COLUMN auction_status TEXT',
    'ALTER TABLE agent_memories ADD COLUMN auction_settle_tx TEXT',
    'ALTER TABLE agent_memories ADD COLUMN auction_settled_at DATETIME',
    'ALTER TABLE agent_memories ADD COLUMN art_url TEXT',
    'ALTER TABLE agent_memories ADD COLUMN art_ipfs_cid TEXT',
    'ALTER TABLE agent_memories ADD COLUMN art_prompt TEXT',
    'ALTER TABLE agent_memories ADD COLUMN nft_token_id TEXT',
    'ALTER TABLE agent_memories ADD COLUMN nft_contract TEXT',
  ];
  for (const sql of migrations) {
    try { db.exec(sql); } catch { /* */ }
  }

  // Seed agent
  db.prepare(`INSERT INTO agents (id, pokemon, element, bioregion_id, wallet_address, status)
    VALUES (?, ?, ?, ?, ?, ?)`)
    .run('agent-phanpy', 'Phanpy', 'nature', 'PA20', '0xWallet', 'wild');

  return db;
}

/**
 * Reproduces the history endpoint logic from agents.js
 */
function getHistory(agentId, limit = 50) {
  const txHeartbeats = db.prepare(
    `SELECT id, action, tx_hash, eth_balance, weth_claimable, created_at
     FROM agent_heartbeats
     WHERE agent_id = ? AND action IN ('fee_claim', 'survival_mode', 'death')
     ORDER BY created_at DESC LIMIT ?`
  ).all(agentId, limit);

  const nftEvents = db.prepare(
    `SELECT id, nft_token_id, nft_contract, auction_status, auction_settle_tx, auction_settled_at, art_url, content, created_at
     FROM agent_memories
     WHERE agent_id = ? AND nft_token_id IS NOT NULL
     ORDER BY created_at DESC LIMIT ?`
  ).all(agentId, limit);

  const captures = db.prepare(
    `SELECT id, catcher_wallet, astral_proof_hash, status, created_at
     FROM capture_proofs
     WHERE agent_id = ?
     ORDER BY created_at DESC LIMIT ?`
  ).all(agentId, limit);

  const events = [];

  for (const h of txHeartbeats) {
    events.push({ type: h.action, txHash: h.tx_hash, ethBalance: h.eth_balance, timestamp: h.created_at });
  }

  for (const m of nftEvents) {
    events.push({ type: 'nft_mint', nftTokenId: m.nft_token_id, nftContract: m.nft_contract, artUrl: m.art_url, content: m.content, timestamp: m.created_at });
    if (m.auction_status === 'settled' && m.auction_settle_tx) {
      events.push({ type: 'auction_settle', nftTokenId: m.nft_token_id, txHash: m.auction_settle_tx, timestamp: m.auction_settled_at || m.created_at });
    }
  }

  for (const c of captures) {
    events.push({ type: c.status === 'released' ? 'release' : 'capture', wallet: c.catcher_wallet, proofHash: c.astral_proof_hash, timestamp: c.created_at });
  }

  events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  return events.slice(0, limit);
}

describe('History endpoint', () => {
  beforeEach(() => { db = setupDb(); });
  afterEach(() => { db?.close(); });

  it('returns empty array for agent with no events', () => {
    const events = getHistory('agent-phanpy');
    expect(events).toEqual([]);
  });

  it('includes fee_claim heartbeats', () => {
    db.prepare(`INSERT INTO agent_heartbeats (agent_id, action, tx_hash, eth_balance) VALUES (?, ?, ?, ?)`)
      .run('agent-phanpy', 'fee_claim', '0xFeeTx', 0.01);

    const events = getHistory('agent-phanpy');
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('fee_claim');
    expect(events[0].txHash).toBe('0xFeeTx');
  });

  it('excludes regular heartbeats (only fee_claim, survival_mode, death)', () => {
    db.prepare(`INSERT INTO agent_heartbeats (agent_id, action, eth_balance) VALUES (?, ?, ?)`)
      .run('agent-phanpy', 'heartbeat', 0.01);

    const events = getHistory('agent-phanpy');
    expect(events).toHaveLength(0);
  });

  it('includes NFT mint events', () => {
    db.prepare(`INSERT INTO agent_memories (agent_id, memory_type, content, nft_token_id, nft_contract, art_url, source)
      VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run('agent-phanpy', 'encounter', 'A visitor asked about my forest', '5', '0xNFT', 'http://art.jpg', 'conversation');

    const events = getHistory('agent-phanpy');
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('nft_mint');
    expect(events[0].nftTokenId).toBe('5');
    expect(events[0].content).toBe('A visitor asked about my forest');
  });

  it('includes auction_settle as separate event for settled NFTs', () => {
    db.prepare(`INSERT INTO agent_memories (agent_id, memory_type, content, nft_token_id, nft_contract, auction_status, auction_settle_tx, auction_settled_at, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)`)
      .run('agent-phanpy', 'encounter', 'Memory', '10', '0xNFT', 'settled', '0xSettleTx', 'conversation');

    const events = getHistory('agent-phanpy');
    expect(events).toHaveLength(2); // nft_mint + auction_settle
    const types = events.map(e => e.type);
    expect(types).toContain('nft_mint');
    expect(types).toContain('auction_settle');
    expect(events.find(e => e.type === 'auction_settle').txHash).toBe('0xSettleTx');
  });

  it('does NOT create auction_settle event for non-settled NFTs', () => {
    db.prepare(`INSERT INTO agent_memories (agent_id, memory_type, content, nft_token_id, nft_contract, auction_status, source)
      VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run('agent-phanpy', 'encounter', 'Memory', '11', '0xNFT', 'reserve', 'conversation');

    const events = getHistory('agent-phanpy');
    expect(events).toHaveLength(1); // only nft_mint
    expect(events[0].type).toBe('nft_mint');
  });

  it('includes capture events', () => {
    db.prepare(`INSERT INTO capture_proofs (agent_id, catcher_wallet, matching_card_token_id, latitude, longitude, bioregion_verified, astral_proof_hash, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run('agent-phanpy', '0xCatcher', '2302', 41.38, 2.17, 'PA20', '0xProof', 'verified');

    const events = getHistory('agent-phanpy');
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('capture');
    expect(events[0].wallet).toBe('0xCatcher');
  });

  it('sorts all events by timestamp descending', () => {
    // Insert events with different timestamps
    db.prepare(`INSERT INTO agent_heartbeats (agent_id, action, tx_hash, eth_balance, created_at) VALUES (?, ?, ?, ?, ?)`)
      .run('agent-phanpy', 'fee_claim', '0xTx1', 0.01, '2026-03-18 10:00:00');

    db.prepare(`INSERT INTO agent_memories (agent_id, memory_type, content, nft_token_id, nft_contract, source, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run('agent-phanpy', 'encounter', 'Memory', '1', '0xNFT', 'conversation', '2026-03-18 12:00:00');

    db.prepare(`INSERT INTO agent_heartbeats (agent_id, action, tx_hash, eth_balance, created_at) VALUES (?, ?, ?, ?, ?)`)
      .run('agent-phanpy', 'fee_claim', '0xTx2', 0.02, '2026-03-18 14:00:00');

    const events = getHistory('agent-phanpy');
    expect(events).toHaveLength(3);
    // Most recent first
    expect(events[0].txHash).toBe('0xTx2'); // 14:00
    expect(events[1].type).toBe('nft_mint'); // 12:00
    expect(events[2].txHash).toBe('0xTx1'); // 10:00
  });

  it('respects limit parameter', () => {
    for (let i = 0; i < 10; i++) {
      db.prepare(`INSERT INTO agent_heartbeats (agent_id, action, tx_hash, eth_balance) VALUES (?, ?, ?, ?)`)
        .run('agent-phanpy', 'fee_claim', `0xTx${i}`, 0.01 * i);
    }

    const events = getHistory('agent-phanpy', 3);
    expect(events).toHaveLength(3);
  });
});

describe('Memories endpoint with auction fields', () => {
  beforeEach(() => { db = setupDb(); });
  afterEach(() => { db?.close(); });

  it('returns auction_status in memories query', () => {
    db.prepare(`INSERT INTO agent_memories (agent_id, memory_type, content, nft_token_id, nft_contract, auction_status, art_url, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run('agent-phanpy', 'encounter', 'Test', '1', '0xNFT', 'live', 'http://art.jpg', 'conversation');

    const memories = db.prepare(
      'SELECT id, memory_type, content, art_url, nft_token_id, nft_contract, auction_status, auction_settle_tx, auction_settled_at, created_at FROM agent_memories WHERE agent_id = ? ORDER BY created_at DESC LIMIT 50'
    ).all('agent-phanpy');

    expect(memories).toHaveLength(1);
    expect(memories[0].auction_status).toBe('live');
    expect(memories[0].nft_token_id).toBe('1');
  });
});
