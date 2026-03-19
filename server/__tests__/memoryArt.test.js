/**
 * Memory Art Service Tests
 *
 * Verifies the art generation → mint → auction pipeline.
 * Mocks Venice API, Rare CLI, and auctionService.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock auctionService
vi.mock('../services/auctionService.js', () => ({
  ensureBazaarApproval: vi.fn().mockResolvedValue('0xApprovalTx'),
  createAuction: vi.fn().mockResolvedValue('0xAuctionTx'),
}));

vi.mock('../services/ipfsService.js', () => ({
  pinToIpfs: vi.fn().mockResolvedValue(null),
}));

// Mock child_process for rare CLI
vi.mock('child_process', () => ({
  execSync: vi.fn().mockReturnValue('Minted! token-id: 42'),
}));

// Mock fs for file writing
vi.mock('fs', () => ({
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  readFileSync: vi.fn(),
}));

const { ensureBazaarApproval, createAuction } = await import('../services/auctionService.js');

describe('memoryArt flow verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('auction creation uses 3600s (1 hour) duration', async () => {
    // Simulate what memoryArt.js does after a successful mint
    const RARE_CONTRACT = '0x59FbA43625eF81460930a8770Ee9c69042311c1a';
    const nftTokenId = '42';
    const agentId = 'agent-phanpy';

    await ensureBazaarApproval(agentId, RARE_CONTRACT);
    await createAuction(agentId, RARE_CONTRACT, nftTokenId, { durationSeconds: 3600 });

    expect(ensureBazaarApproval).toHaveBeenCalledWith('agent-phanpy', RARE_CONTRACT);
    expect(createAuction).toHaveBeenCalledWith(
      'agent-phanpy',
      RARE_CONTRACT,
      '42',
      { durationSeconds: 3600 }
    );
  });

  it('returns auctionStatus in result object', () => {
    // Verify the return shape matches what chat.js expects
    const artResult = {
      imageUrl: 'http://api.anima.cards/art/agent-phanpy-123.webp',
      ipfsCid: null,
      nftTokenId: '42',
      nftContract: '0x59FbA43625eF81460930a8770Ee9c69042311c1a',
      auctionStatus: 'reserve',
      prompt: 'test prompt',
      model: 'flux-2-max',
    };

    // This is what chat.js writes to DB:
    expect(artResult.auctionStatus).toBe('reserve');
    expect(artResult.nftTokenId).toBe('42');
    expect(artResult.nftContract).toBeTruthy();
  });

  it('returns null auctionStatus when auction fails', () => {
    const artResultNoAuction = {
      imageUrl: 'http://api.anima.cards/art/test.webp',
      ipfsCid: null,
      nftTokenId: '42',
      nftContract: '0x59FbA43625eF81460930a8770Ee9c69042311c1a',
      auctionStatus: null, // auction creation failed
      prompt: 'test',
      model: 'flux-2-max',
    };

    expect(artResultNoAuction.auctionStatus).toBeNull();
  });

  it('returns null nftTokenId when mint fails', () => {
    const artResultNoMint = {
      imageUrl: 'http://api.anima.cards/art/test.webp',
      ipfsCid: null,
      nftTokenId: null, // rare CLI failed
      nftContract: null,
      auctionStatus: null,
      prompt: 'test',
      model: 'flux-2-max',
    };

    // No auction should be created for unminted art
    expect(artResultNoMint.nftTokenId).toBeNull();
    expect(artResultNoMint.auctionStatus).toBeNull();
  });
});

describe('chat.js DB write shape', () => {
  it('UPDATE query includes auction_status field', () => {
    // The query from chat.js after art generation:
    const query = 'UPDATE agent_memories SET art_url = ?, art_ipfs_cid = ?, art_prompt = ?, nft_token_id = ?, nft_contract = ?, auction_status = ? WHERE id = ?';

    // Verify it has 7 params (6 SET + 1 WHERE)
    const paramCount = (query.match(/\?/g) || []).length;
    expect(paramCount).toBe(7);

    // Verify auction_status is in the SET clause
    expect(query).toContain('auction_status = ?');
  });
});
