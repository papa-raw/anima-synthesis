/**
 * History Endpoint — New Event Types
 *
 * Tests the compute_acquired, auction_settle, lp_deepen, and basename_register
 * heartbeat actions that were added to the history endpoint's IN clause.
 *
 * The real route (agents.js) filters heartbeats by:
 *   action IN ('fee_claim', 'survival_mode', 'death', 'basename_register',
 *              'auction_settle', 'lp_deepen', 'compute_acquired')
 *
 * Previous historyEndpoint.test.js only tested fee_claim, survival_mode, death.
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

  const migrations = [
    'ALTER TABLE agent_memories ADD COLUMN auction_status TEXT',
    'ALTER TABLE agent_memories ADD COLUMN auction_settle_tx TEXT',
    'ALTER TABLE agent_memories ADD COLUMN auction_settled_at DATETIME',
    'ALTER TABLE agent_memories ADD COLUMN art_url TEXT',
    'ALTER TABLE agent_memories ADD COLUMN art_ipfs_cid TEXT',
    'ALTER TABLE agent_memories ADD COLUMN art_prompt TEXT',
    'ALTER TABLE agent_memories ADD COLUMN nft_token_id TEXT',
    'ALTER TABLE agent_memories ADD COLUMN nft_contract TEXT',
    'ALTER TABLE agents ADD COLUMN ens_name TEXT',
  ];
  for (const sql of migrations) {
    try { db.exec(sql); } catch { /* */ }
  }

  db.prepare(`INSERT INTO agents (id, pokemon, element, bioregion_id, wallet_address, status)
    VALUES (?, ?, ?, ?, ?, ?)`)
    .run('agent-phanpy', 'Phanpy', 'nature', 'PA20', '0xWallet', 'wild');

  return db;
}

/**
 * Reproduces the REAL history endpoint logic from routes/agents.js,
 * including the full action IN clause with all 7 event types.
 */
function getHistory(agentId, limit = 50) {
  const txHeartbeats = db.prepare(
    `SELECT id, action, tx_hash, eth_balance, weth_claimable, created_at
     FROM agent_heartbeats
     WHERE agent_id = ? AND action IN ('fee_claim', 'survival_mode', 'death', 'basename_register', 'auction_settle', 'lp_deepen', 'compute_acquired')
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

  // Genesis event
  const agent = db.prepare('SELECT created_at, pokemon FROM agents WHERE id = ?').get(agentId);
  if (agent) {
    events.push({
      type: 'ensouled',
      content: `${agent.pokemon} was ensouled`,
      timestamp: agent.created_at,
    });
  }

  events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  return events.slice(0, limit);
}

describe('History endpoint — new event types', () => {
  beforeEach(() => { db = setupDb(); });
  afterEach(() => { db?.close(); });

  it('includes compute_acquired heartbeats', () => {
    db.prepare(`INSERT INTO agent_heartbeats (agent_id, action, tx_hash, eth_balance, created_at) VALUES (?, ?, ?, ?, ?)`)
      .run('agent-phanpy', 'compute_acquired', '0xBuyVvvTx', 0.04, '2026-03-19 10:00:00');

    const events = getHistory('agent-phanpy');
    const compute = events.find(e => e.type === 'compute_acquired');

    expect(compute).toBeDefined();
    expect(compute.txHash).toBe('0xBuyVvvTx');
    expect(compute.ethBalance).toBe(0.04);
  });

  it('includes auction_settle heartbeats from agentLoop', () => {
    db.prepare(`INSERT INTO agent_heartbeats (agent_id, action, tx_hash, eth_balance, created_at) VALUES (?, ?, ?, ?, ?)`)
      .run('agent-phanpy', 'auction_settle', '0xSettleTx', 0.0005, '2026-03-19 11:00:00');

    const events = getHistory('agent-phanpy');
    const settle = events.find(e => e.type === 'auction_settle');

    expect(settle).toBeDefined();
    expect(settle.txHash).toBe('0xSettleTx');
  });

  it('includes lp_deepen heartbeats', () => {
    db.prepare(`INSERT INTO agent_heartbeats (agent_id, action, tx_hash, eth_balance, created_at) VALUES (?, ?, ?, ?, ?)`)
      .run('agent-phanpy', 'lp_deepen', '0xLpMintTx', 0.001, '2026-03-19 12:00:00');

    const events = getHistory('agent-phanpy');
    const lp = events.find(e => e.type === 'lp_deepen');

    expect(lp).toBeDefined();
    expect(lp.txHash).toBe('0xLpMintTx');
  });

  it('includes basename_register heartbeats', () => {
    db.prepare(`INSERT INTO agent_heartbeats (agent_id, action, tx_hash, eth_balance, created_at) VALUES (?, ?, ?, ?, ?)`)
      .run('agent-phanpy', 'basename_register', '0xNameTx', 0, '2026-03-19 09:00:00');

    const events = getHistory('agent-phanpy');
    const name = events.find(e => e.type === 'basename_register');

    expect(name).toBeDefined();
    expect(name.txHash).toBe('0xNameTx');
  });

  it('excludes regular heartbeat actions from history', () => {
    db.prepare(`INSERT INTO agent_heartbeats (agent_id, action, eth_balance) VALUES (?, ?, ?)`)
      .run('agent-phanpy', 'heartbeat', 0.05);
    db.prepare(`INSERT INTO agent_heartbeats (agent_id, action, eth_balance) VALUES (?, ?, ?)`)
      .run('agent-phanpy', 'idle', 0.05);

    const events = getHistory('agent-phanpy');
    const types = events.map(e => e.type);

    expect(types).not.toContain('heartbeat');
    expect(types).not.toContain('idle');
  });

  it('includes ensouled genesis event', () => {
    const events = getHistory('agent-phanpy');
    const genesis = events.find(e => e.type === 'ensouled');

    expect(genesis).toBeDefined();
    expect(genesis.content).toBe('Phanpy was ensouled');
  });

  it('sorts mixed event types by timestamp descending', () => {
    db.prepare(`INSERT INTO agent_heartbeats (agent_id, action, tx_hash, eth_balance, created_at) VALUES (?, ?, ?, ?, ?)`)
      .run('agent-phanpy', 'compute_acquired', '0xComputeTx', 0.04, '2026-03-19 08:00:00');
    db.prepare(`INSERT INTO agent_heartbeats (agent_id, action, tx_hash, eth_balance, created_at) VALUES (?, ?, ?, ?, ?)`)
      .run('agent-phanpy', 'auction_settle', '0xSettleTx', 0.001, '2026-03-19 12:00:00');
    db.prepare(`INSERT INTO agent_heartbeats (agent_id, action, tx_hash, eth_balance, created_at) VALUES (?, ?, ?, ?, ?)`)
      .run('agent-phanpy', 'lp_deepen', '0xLpTx', 0.0005, '2026-03-19 10:00:00');

    const events = getHistory('agent-phanpy');
    // Filter to just the 3 inserted events (ignore ensouled)
    const txEvents = events.filter(e => e.txHash);

    expect(txEvents[0].type).toBe('auction_settle');  // 12:00 — most recent
    expect(txEvents[1].type).toBe('lp_deepen');        // 10:00
    expect(txEvents[2].type).toBe('compute_acquired'); // 08:00
  });

  it('handles auction_settle from both heartbeats AND memories', () => {
    // Heartbeat-sourced auction_settle (from agentLoop.js)
    db.prepare(`INSERT INTO agent_heartbeats (agent_id, action, tx_hash, eth_balance, created_at) VALUES (?, ?, ?, ?, ?)`)
      .run('agent-phanpy', 'auction_settle', '0xSettleFromLoop', 0.001, '2026-03-19 14:00:00');

    // Memory-sourced auction_settle (from NFT with settled status)
    db.prepare(`INSERT INTO agent_memories (agent_id, memory_type, content, nft_token_id, nft_contract, auction_status, auction_settle_tx, auction_settled_at, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run('agent-phanpy', 'encounter', 'A collector loved my forest memory', '7', '0xNFT', 'settled', '0xSettleFromMemory', '2026-03-19 13:00:00', 'conversation');

    const events = getHistory('agent-phanpy');
    const settles = events.filter(e => e.type === 'auction_settle');

    // Both sources produce auction_settle events
    expect(settles).toHaveLength(2);
    const txHashes = settles.map(e => e.txHash);
    expect(txHashes).toContain('0xSettleFromLoop');
    expect(txHashes).toContain('0xSettleFromMemory');
  });
});
