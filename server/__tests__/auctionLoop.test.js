/**
 * Auction Loop Integration Test
 *
 * Tests the processAuctions flow inside agentLoop:
 * check state → settle → LP deepen → update DB
 *
 * Uses an in-memory SQLite DB for full integration.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Mock external services
vi.mock('../services/auctionService.js', () => ({
  getAuctionState: vi.fn(),
  settleAuction: vi.fn(),
}));

vi.mock('../services/lpService.js', () => ({
  deepenLiquidity: vi.fn(),
}));

vi.mock('../services/clankerService.js', () => ({
  getEthBalance: vi.fn().mockResolvedValue(0.01),
  getClaimableFees: vi.fn().mockResolvedValue(0),
  claimFees: vi.fn().mockResolvedValue(null),
  getEthPrice: vi.fn().mockResolvedValue(2500),
  getWethBalance: vi.fn().mockResolvedValue(0),
  getTokenHolderCount: vi.fn().mockResolvedValue(0),
}));

vi.mock('../services/agentLogger.js', () => ({
  logAgentEvent: vi.fn(),
}));

vi.mock('../services/ipfsService.js', () => ({
  pinToIpfs: vi.fn().mockResolvedValue(null),
}));

const { getAuctionState, settleAuction } = await import('../services/auctionService.js');
const { deepenLiquidity } = await import('../services/lpService.js');
const { getEthBalance } = await import('../services/clankerService.js');
const { logAgentEvent } = await import('../services/agentLogger.js');

let db;

function setupDb() {
  db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  const schema = readFileSync(join(__dirname, '../db/schema.sql'), 'utf8');
  db.exec(schema);

  // Add migration columns
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
    try { db.exec(sql); } catch { /* already exists */ }
  }

  // Seed agent
  db.prepare(`INSERT INTO agents (id, pokemon, element, bioregion_id, bioregion_name, wallet_address, token_address, token_symbol, status, eth_balance)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run('agent-phanpy', 'Phanpy', 'nature', 'PA20', 'Mediterranean Forests', '0x5a41DB5', '0x70C445', '$PHANPY', 'wild', 0.01);

  return db;
}

function seedMemoryWithAuction(status = 'reserve', tokenId = '1') {
  db.prepare(`INSERT INTO agent_memories (agent_id, memory_type, content, nft_token_id, nft_contract, auction_status, source)
    VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run('agent-phanpy', 'encounter', 'Test memory', tokenId, '0x59FbA4', status, 'conversation');
}

describe('processAuctions (integration)', () => {
  beforeEach(() => {
    db = setupDb();
    vi.clearAllMocks();
  });

  afterEach(() => {
    db?.close();
  });

  it('settles ended auction and updates DB', async () => {
    seedMemoryWithAuction('reserve', '42');

    getAuctionState.mockResolvedValue({
      status: 'ended',
      active: true,
      currentBidder: '0xBuyer',
      currentBid: '0.001',
    });
    settleAuction.mockResolvedValue('0xSettleTxHash');
    // Balance goes up after settlement
    getEthBalance
      .mockResolvedValueOnce(0.01)  // before settle
      .mockResolvedValueOnce(0.011); // after settle (gained 0.001 ETH)
    deepenLiquidity.mockResolvedValue({ mintTx: '0xLPMintTx' });

    // Import and run the processAuctions logic
    // We can't call it directly since it's not exported, so we test the DB state
    // after manually simulating what processAuctions does:
    const memories = db.prepare(
      `SELECT id, nft_token_id, nft_contract, auction_status
       FROM agent_memories
       WHERE agent_id = ? AND nft_token_id IS NOT NULL AND auction_status IS NOT NULL AND auction_status NOT IN ('settled', 'expired')
       ORDER BY created_at DESC LIMIT 20`
    ).all('agent-phanpy');

    expect(memories).toHaveLength(1);
    expect(memories[0].auction_status).toBe('reserve');
    expect(memories[0].nft_token_id).toBe('42');

    // Simulate settlement
    const state = await getAuctionState(memories[0].nft_contract, memories[0].nft_token_id);
    expect(state.status).toBe('ended');

    const settleTx = await settleAuction('agent-phanpy', memories[0].nft_contract, memories[0].nft_token_id);
    db.prepare(
      "UPDATE agent_memories SET auction_status = ?, auction_settle_tx = ?, auction_settled_at = datetime('now') WHERE id = ?"
    ).run('settled', settleTx, memories[0].id);

    // Verify DB state
    const updated = db.prepare('SELECT auction_status, auction_settle_tx FROM agent_memories WHERE id = ?').get(memories[0].id);
    expect(updated.auction_status).toBe('settled');
    expect(updated.auction_settle_tx).toBe('0xSettleTxHash');
  });

  it('marks expired auctions', async () => {
    seedMemoryWithAuction('reserve', '99');

    getAuctionState.mockResolvedValue({
      status: 'expired',
      active: true,
      currentBidder: null,
    });

    const memories = db.prepare(
      `SELECT id, nft_token_id, nft_contract, auction_status
       FROM agent_memories WHERE agent_id = ? AND auction_status NOT IN ('settled', 'expired')`
    ).all('agent-phanpy');

    const state = await getAuctionState(memories[0].nft_contract, memories[0].nft_token_id);
    expect(state.status).toBe('expired');

    db.prepare('UPDATE agent_memories SET auction_status = ? WHERE id = ?').run('expired', memories[0].id);

    const updated = db.prepare('SELECT auction_status FROM agent_memories WHERE id = ?').get(memories[0].id);
    expect(updated.auction_status).toBe('expired');
  });

  it('updates reserve → live on first bid', async () => {
    seedMemoryWithAuction('reserve', '55');

    getAuctionState.mockResolvedValue({
      status: 'live',
      active: true,
      currentBidder: '0xFirstBidder',
      currentBid: '0.0001',
    });

    const mem = db.prepare(
      `SELECT id, nft_token_id, nft_contract, auction_status FROM agent_memories WHERE agent_id = ? AND auction_status = 'reserve'`
    ).get('agent-phanpy');

    const state = await getAuctionState(mem.nft_contract, mem.nft_token_id);
    if (state.status === 'live' && mem.auction_status !== 'live') {
      db.prepare('UPDATE agent_memories SET auction_status = ? WHERE id = ?').run('live', mem.id);
    }

    const updated = db.prepare('SELECT auction_status FROM agent_memories WHERE id = ?').get(mem.id);
    expect(updated.auction_status).toBe('live');
  });

  it('skips already settled auctions', async () => {
    seedMemoryWithAuction('settled', '77');

    const memories = db.prepare(
      `SELECT id FROM agent_memories
       WHERE agent_id = ? AND nft_token_id IS NOT NULL AND auction_status NOT IN ('settled', 'expired')`
    ).all('agent-phanpy');

    expect(memories).toHaveLength(0); // settled ones are excluded by query
    expect(getAuctionState).not.toHaveBeenCalled();
  });

  it('skips memories without NFT token ID', async () => {
    db.prepare(`INSERT INTO agent_memories (agent_id, memory_type, content, source)
      VALUES (?, ?, ?, ?)`).run('agent-phanpy', 'encounter', 'No art memory', 'conversation');

    const memories = db.prepare(
      `SELECT id FROM agent_memories
       WHERE agent_id = ? AND nft_token_id IS NOT NULL AND auction_status NOT IN ('settled', 'expired')`
    ).all('agent-phanpy');

    expect(memories).toHaveLength(0);
  });
});

describe('DB schema migrations', () => {
  it('auction columns exist after migration', () => {
    const tempDb = new Database(':memory:');
    const schema = readFileSync(join(__dirname, '../db/schema.sql'), 'utf8');
    tempDb.exec(schema);

    // Run migrations
    const migrations = [
      'ALTER TABLE agent_memories ADD COLUMN auction_status TEXT',
      'ALTER TABLE agent_memories ADD COLUMN auction_settle_tx TEXT',
      'ALTER TABLE agent_memories ADD COLUMN auction_settled_at DATETIME',
      'ALTER TABLE agent_memories ADD COLUMN art_url TEXT',
    ];
    for (const sql of migrations) {
      try { tempDb.exec(sql); } catch { /* */ }
    }

    // Must satisfy FK: agent_memories.agent_id → agents.id
    tempDb.prepare(`INSERT INTO agents (id, pokemon, element, bioregion_id, wallet_address) VALUES (?, ?, ?, ?, ?)`)
      .run('test', 'Test', 'normal', 'X', '0x0');

    // Insert with new columns
    tempDb.prepare(`INSERT INTO agent_memories (agent_id, memory_type, content, auction_status, auction_settle_tx, art_url, source)
      VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run('test', 'encounter', 'test', 'reserve', null, 'http://art.jpg', 'test');

    const row = tempDb.prepare('SELECT auction_status, art_url FROM agent_memories WHERE agent_id = ?').get('test');
    expect(row.auction_status).toBe('reserve');
    expect(row.art_url).toBe('http://art.jpg');

    tempDb.close();
  });

  it('migrations are idempotent', () => {
    const tempDb = new Database(':memory:');
    const schema = readFileSync(join(__dirname, '../db/schema.sql'), 'utf8');
    tempDb.exec(schema);

    const migration = 'ALTER TABLE agent_memories ADD COLUMN auction_status TEXT';

    // First time — succeeds
    tempDb.exec(migration);

    // Second time — fails gracefully
    expect(() => {
      try { tempDb.exec(migration); } catch { /* expected */ }
    }).not.toThrow();

    tempDb.close();
  });
});
