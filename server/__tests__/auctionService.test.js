/**
 * Auction Service Tests
 *
 * Tests the full auction lifecycle: approval → create → state checks → settlement
 * All contract calls are mocked — we test our logic, not the chain.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock viem before importing the service
const mockReadContract = vi.fn();
const mockWriteContract = vi.fn();
const mockWaitForTransactionReceipt = vi.fn();

vi.mock('viem', () => ({
  createPublicClient: () => ({
    readContract: mockReadContract,
    waitForTransactionReceipt: mockWaitForTransactionReceipt,
    getBalance: vi.fn().mockResolvedValue(0n),
  }),
  createWalletClient: () => ({
    writeContract: mockWriteContract,
  }),
  http: () => ({}),
  parseEther: (v) => BigInt(Math.floor(parseFloat(v) * 1e18)),
  formatEther: (v) => (Number(v) / 1e18).toString(),
}));

vi.mock('viem/chains', () => ({ base: { id: 8453 } }));
vi.mock('viem/accounts', () => ({
  privateKeyToAccount: (key) => ({ address: '0xAgentWallet' }),
}));

// Set env before import
process.env.AGENT_PHANPY_PRIVATE_KEY = '0x' + 'ab'.repeat(32);

const { ensureBazaarApproval, createAuction, getAuctionState, settleAuction } = await import('../services/auctionService.js');

const NFT_CONTRACT = '0x59FbA43625eF81460930a8770Ee9c69042311c1a';
const BAZAAR = '0x51c36ffb05e17ed80ee5c02fa83d7677c5613de2';
const ZERO = '0x0000000000000000000000000000000000000000';

describe('auctionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWaitForTransactionReceipt.mockResolvedValue({ status: 'success' });
  });

  describe('ensureBazaarApproval', () => {
    it('skips if already approved', async () => {
      mockReadContract.mockResolvedValue(true);

      const result = await ensureBazaarApproval('agent-phanpy', NFT_CONTRACT);

      expect(result).toBeNull();
      expect(mockWriteContract).not.toHaveBeenCalled();
    });

    it('sets approval if not approved', async () => {
      mockReadContract.mockResolvedValue(false);
      mockWriteContract.mockResolvedValue('0xApprovalTxHash');

      const result = await ensureBazaarApproval('agent-phanpy', NFT_CONTRACT);

      expect(result).toBe('0xApprovalTxHash');
      expect(mockWriteContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: NFT_CONTRACT,
          functionName: 'setApprovalForAll',
          args: [BAZAAR, true],
        })
      );
    });

    it('throws for unknown agent', async () => {
      await expect(ensureBazaarApproval('agent-unknown', NFT_CONTRACT))
        .rejects.toThrow('No private key');
    });
  });

  describe('createAuction', () => {
    it('creates a 1-hour reserve auction with correct params', async () => {
      mockWriteContract.mockResolvedValue('0xAuctionTxHash');

      const result = await createAuction('agent-phanpy', NFT_CONTRACT, '42', {
        durationSeconds: 3600,
        startingPriceEth: '0.0001',
      });

      expect(result).toBe('0xAuctionTxHash');
      const call = mockWriteContract.mock.calls[0][0];
      expect(call.address).toBe(BAZAAR);
      expect(call.functionName).toBe('configureAuction');
      // args: [auctionType, nftContract, tokenId, startingAmount, currency, duration, startTime, splitAddrs, splitRatios]
      expect(call.args[1]).toBe(NFT_CONTRACT); // origin contract
      expect(call.args[2]).toBe(42n); // token ID
      expect(call.args[4]).toBe('0x4200000000000000000000000000000000000006'); // WETH currency
      expect(call.args[5]).toBe(3600n); // 1 hour
      expect(call.args[6]).toBe(0n); // startTime = 0 (reserve)
      expect(call.args[7]).toEqual(['0xAgentWallet']); // 100% to agent
      expect(call.args[8]).toEqual([100]); // full split
    });

    it('defaults to 1hr and 0.0001 ETH', async () => {
      mockWriteContract.mockResolvedValue('0xHash');

      await createAuction('agent-phanpy', NFT_CONTRACT, '1');

      const call = mockWriteContract.mock.calls[0][0];
      expect(call.args[5]).toBe(3600n); // duration
      expect(call.args[6]).toBe(0n); // startTime
      // 0.0001 ETH = 100000000000000 wei
      expect(call.args[3]).toBe(BigInt(Math.floor(0.0001 * 1e18)));
    });
  });

  describe('getAuctionState', () => {
    it('returns "none" when no auction exists (zero creator)', async () => {
      mockReadContract.mockResolvedValue([
        ZERO, // auctionCreator = zero = no auction
        0n, 0n, 0n, ZERO, 0n,
        '0x0000000000000000000000000000000000000000000000000000000000000000',
        [], []
      ]);

      const state = await getAuctionState(NFT_CONTRACT, '1');

      expect(state.status).toBe('none');
      expect(state.active).toBe(false);
    });

    it('returns "reserve" when auction configured but no bids', async () => {
      // getAuctionDetails returns config with creator but startTime=0
      mockReadContract
        .mockResolvedValueOnce([
          '0xCreator', // auctionCreator (non-zero = exists)
          100n, // creationBlock
          0n, // startTime = 0 (reserve, no bids yet)
          3600n, // lengthOfAuction
          ZERO, // currencyAddress
          BigInt(1e14), // minimumBid (0.0001 ETH)
          '0x434f4c4449455f41554354494f4e000000000000000000000000000000000000',
          ['0xCreator'],
          [100]
        ])
        // currentBidDetailsOfToken: no bids
        .mockResolvedValueOnce([0n, ZERO]);

      const state = await getAuctionState(NFT_CONTRACT, '1');

      expect(state.status).toBe('reserve');
      expect(state.active).toBe(true);
      expect(state.isReserve).toBe(true);
      expect(state.currentBidder).toBeNull();
    });

    it('returns "live" when auction has bids and time remaining', async () => {
      const futureStart = Math.floor(Date.now() / 1000) - 1800; // started 30 min ago
      mockReadContract
        .mockResolvedValueOnce([
          '0xCreator',
          100n,
          BigInt(futureStart), // startTime (30 min ago)
          3600n, // 1 hour duration → 30 min left
          ZERO,
          BigInt(1e14),
          '0x434f4c4449455f41554354494f4e000000000000000000000000000000000000',
          ['0xCreator'],
          [100]
        ])
        .mockResolvedValueOnce([BigInt(2e14), '0xBidder']); // has bid

      const state = await getAuctionState(NFT_CONTRACT, '1');

      expect(state.status).toBe('live');
      expect(state.currentBidder).toBe('0xBidder');
      expect(state.currentBid).toBe((2e14 / 1e18).toString());
    });

    it('returns "ended" when time expired and has winning bid', async () => {
      const pastStart = Math.floor(Date.now() / 1000) - 7200; // started 2 hours ago
      mockReadContract
        .mockResolvedValueOnce([
          '0xCreator',
          100n,
          BigInt(pastStart),
          3600n, // 1hr duration → ended 1 hour ago
          ZERO,
          BigInt(1e14),
          '0x434f4c4449455f41554354494f4e000000000000000000000000000000000000',
          ['0xCreator'],
          [100]
        ])
        .mockResolvedValueOnce([BigInt(5e14), '0xWinner']); // winning bid

      const state = await getAuctionState(NFT_CONTRACT, '1');

      expect(state.status).toBe('ended');
      expect(state.currentBidder).toBe('0xWinner');
    });

    it('returns "expired" when time expired and no bids', async () => {
      const pastStart = Math.floor(Date.now() / 1000) - 7200;
      mockReadContract
        .mockResolvedValueOnce([
          '0xCreator',
          100n,
          BigInt(pastStart),
          3600n,
          ZERO,
          BigInt(1e14),
          '0x434f4c4449455f41554354494f4e000000000000000000000000000000000000',
          ['0xCreator'],
          [100]
        ])
        .mockResolvedValueOnce([0n, ZERO]); // no bids

      const state = await getAuctionState(NFT_CONTRACT, '1');

      expect(state.status).toBe('expired');
      expect(state.currentBidder).toBeNull();
    });

    it('handles contract read errors gracefully', async () => {
      mockReadContract.mockRejectedValue(new Error('RPC timeout'));

      const state = await getAuctionState(NFT_CONTRACT, '1');

      expect(state.status).toBe('none');
      expect(state.active).toBe(false);
    });
  });

  describe('settleAuction', () => {
    it('calls settleAuction on Bazaar contract', async () => {
      mockWriteContract.mockResolvedValue('0xSettleTxHash');

      const result = await settleAuction('agent-phanpy', NFT_CONTRACT, '42');

      expect(result).toBe('0xSettleTxHash');
      const call = mockWriteContract.mock.calls[0][0];
      expect(call.address).toBe(BAZAAR);
      expect(call.functionName).toBe('settleAuction');
      expect(call.args).toEqual([NFT_CONTRACT, 42n]);
    });
  });
});
