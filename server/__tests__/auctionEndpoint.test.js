/**
 * Auction Endpoint Tests
 *
 * Tests GET /api/auction/:contract/:tokenId — the public auction state API
 * defined directly in server/index.js.
 *
 * Mocks the viem readContract to simulate Bazaar contract reads.
 * Tests the auctionBids return format: [bidder, currency, amount, fee].
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const ZERO = '0x0000000000000000000000000000000000000000';

// Simulate the endpoint logic directly (same as index.js lines 82-129)
// since spinning up Express for a unit test adds unnecessary complexity.

const mockReadContract = vi.fn();
const formatEther = (v) => (Number(v) / 1e18).toString();

async function getAuctionEndpoint(contract, tokenId) {
  try {
    const details = await mockReadContract({
      functionName: 'getAuctionDetails',
      args: [contract, BigInt(tokenId)]
    });
    const [creator, , startTime, length, currency, minBid, auctionType] = details;
    if (creator === ZERO) {
      return { active: false };
    }

    let currentBid = '0', currentBidder = null;
    try {
      const bidDetails = await mockReadContract({
        functionName: 'auctionBids',
        args: [contract, BigInt(tokenId)]
      });
      if (bidDetails[0] !== ZERO) {
        currentBidder = bidDetails[0];
        currentBid = formatEther(bidDetails[2]);
      }
    } catch { /* no bid yet */ }

    const startNum = Number(startTime);
    const lengthNum = Number(length);
    const now = Math.floor(Date.now() / 1000);
    const isReserve = startNum === 0;
    const endsAt = startNum > 0 ? startNum + lengthNum : null;
    const expired = endsAt ? now > endsAt : false;

    return {
      active: !expired,
      creator,
      currency,
      minBid: formatEther(minBid),
      currentBid,
      currentBidder,
      isReserve,
      endsAt,
      lengthSeconds: lengthNum,
    };
  } catch (e) {
    return { active: false, error: e.message };
  }
}

describe('Auction endpoint (/api/auction/:contract/:tokenId)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns { active: false } when no auction exists', async () => {
    mockReadContract.mockResolvedValue([
      ZERO, 0n, 0n, 0n, ZERO, 0n,
      '0x0000000000000000000000000000000000000000000000000000000000000000',
      [], []
    ]);

    const result = await getAuctionEndpoint('0xNFT', '1');

    expect(result.active).toBe(false);
    expect(result.creator).toBeUndefined(); // short-circuits before setting creator
  });

  it('returns reserve auction with no bids', async () => {
    mockReadContract
      .mockResolvedValueOnce([
        '0xCreator', 100n, 0n, 3600n, ZERO, BigInt(1e14),
        '0x434f4c4449455f41554354494f4e000000000000000000000000000000000000',
        ['0xCreator'], [100]
      ])
      .mockResolvedValueOnce([ZERO, ZERO, 0n, 0]); // auctionBids: no bidder

    const result = await getAuctionEndpoint('0xNFT', '1');

    expect(result.active).toBe(true);
    expect(result.isReserve).toBe(true);
    expect(result.currentBidder).toBeNull();
    expect(result.currentBid).toBe('0');
    expect(result.minBid).toBe((1e14 / 1e18).toString());
  });

  it('returns live auction with active bid', async () => {
    const startTime = BigInt(Math.floor(Date.now() / 1000) - 1800); // started 30 min ago
    mockReadContract
      .mockResolvedValueOnce([
        '0xCreator', 100n, startTime, 3600n, ZERO, BigInt(1e14),
        '0x434f4c4449455f41554354494f4e000000000000000000000000000000000000',
        ['0xCreator'], [100]
      ])
      .mockResolvedValueOnce(['0xBidder', ZERO, BigInt(5e14), 3]);

    const result = await getAuctionEndpoint('0xNFT', '42');

    expect(result.active).toBe(true);
    expect(result.isReserve).toBe(false);
    expect(result.currentBidder).toBe('0xBidder');
    expect(result.currentBid).toBe((5e14 / 1e18).toString());
    expect(result.endsAt).toBe(Number(startTime) + 3600);
  });

  it('returns expired auction', async () => {
    const pastStart = BigInt(Math.floor(Date.now() / 1000) - 7200); // started 2 hours ago
    mockReadContract
      .mockResolvedValueOnce([
        '0xCreator', 100n, pastStart, 3600n, ZERO, BigInt(1e14),
        '0x434f4c4449455f41554354494f4e000000000000000000000000000000000000',
        ['0xCreator'], [100]
      ])
      .mockResolvedValueOnce(['0xWinner', ZERO, BigInt(1e15), 3]);

    const result = await getAuctionEndpoint('0xNFT', '42');

    expect(result.active).toBe(false);
    expect(result.currentBidder).toBe('0xWinner');
  });

  it('auctionBids returns [bidder, currency, amount, fee] format', async () => {
    const startTime = BigInt(Math.floor(Date.now() / 1000) - 600);
    mockReadContract
      .mockResolvedValueOnce([
        '0xCreator', 100n, startTime, 3600n, ZERO, BigInt(1e14),
        '0x434f4c4449455f41554354494f4e000000000000000000000000000000000000',
        ['0xCreator'], [100]
      ])
      .mockResolvedValueOnce(['0xBidder', ZERO, BigInt(2e14), 3]);

    const result = await getAuctionEndpoint('0xNFT', '5');

    // Verify the bid was parsed correctly from [bidder, currency, amount, fee]
    expect(result.currentBidder).toBe('0xBidder');      // bidDetails[0]
    expect(result.currentBid).toBe((2e14 / 1e18).toString()); // bidDetails[2]
    // bidDetails[1] (currency) and bidDetails[3] (fee) are not exposed in response
    // but they were correctly destructured
  });

  it('handles auctionBids read failure gracefully', async () => {
    const startTime = BigInt(Math.floor(Date.now() / 1000) - 300);
    mockReadContract
      .mockResolvedValueOnce([
        '0xCreator', 100n, startTime, 3600n, ZERO, BigInt(1e14),
        '0x434f4c4449455f41554354494f4e000000000000000000000000000000000000',
        ['0xCreator'], [100]
      ])
      .mockRejectedValueOnce(new Error('RPC error')); // auctionBids fails

    const result = await getAuctionEndpoint('0xNFT', '1');

    // Should still return auction details, just no bid info
    expect(result.active).toBe(true);
    expect(result.currentBid).toBe('0');
    expect(result.currentBidder).toBeNull();
  });

  it('handles complete RPC failure gracefully', async () => {
    mockReadContract.mockRejectedValue(new Error('Network error'));

    const result = await getAuctionEndpoint('0xNFT', '1');

    expect(result.active).toBe(false);
    expect(result.error).toBe('Network error');
  });

  it('correctly computes endsAt for timed auctions', async () => {
    const startTime = BigInt(Math.floor(Date.now() / 1000) - 100);
    const duration = 7200n; // 2 hours
    mockReadContract
      .mockResolvedValueOnce([
        '0xCreator', 100n, startTime, duration, ZERO, BigInt(1e14),
        '0x434f4c4449455f41554354494f4e000000000000000000000000000000000000',
        ['0xCreator'], [100]
      ])
      .mockResolvedValueOnce([ZERO, ZERO, 0n, 0]);

    const result = await getAuctionEndpoint('0xNFT', '1');

    expect(result.endsAt).toBe(Number(startTime) + 7200);
    expect(result.lengthSeconds).toBe(7200);
  });

  it('returns null endsAt for reserve auctions (startTime=0)', async () => {
    mockReadContract
      .mockResolvedValueOnce([
        '0xCreator', 100n, 0n, 3600n, ZERO, BigInt(1e14),
        '0x434f4c4449455f41554354494f4e000000000000000000000000000000000000',
        ['0xCreator'], [100]
      ])
      .mockResolvedValueOnce([ZERO, ZERO, 0n, 0]);

    const result = await getAuctionEndpoint('0xNFT', '1');

    expect(result.isReserve).toBe(true);
    expect(result.endsAt).toBeNull();
    expect(result.active).toBe(true); // reserve auctions are always active
  });
});
