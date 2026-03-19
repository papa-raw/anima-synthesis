/**
 * DIEM Service Tests
 *
 * Tests the autonomous Venice AI compute acquisition pipeline:
 *   - getStakedVvv: reads staked balance
 *   - shouldAcquireCompute: threshold logic
 *   - buyAndStakeVvv: swap ETH→VVV, approve, stake
 *
 * All contract calls are mocked — we test our logic, not the chain.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockReadContract = vi.fn();
const mockWriteContract = vi.fn();
const mockWaitForTransactionReceipt = vi.fn();

vi.mock('viem', () => ({
  createPublicClient: () => ({
    readContract: mockReadContract,
    waitForTransactionReceipt: mockWaitForTransactionReceipt,
  }),
  createWalletClient: () => ({
    writeContract: mockWriteContract,
  }),
  http: () => ({}),
  parseEther: (v) => BigInt(Math.floor(parseFloat(v) * 1e18)),
  formatEther: (v) => (Number(v) / 1e18).toString(),
  parseAbi: (arr) => arr.map(s => ({ raw: s })),
}));

vi.mock('viem/chains', () => ({ base: { id: 8453 } }));
vi.mock('viem/accounts', () => ({
  privateKeyToAccount: (key) => ({ address: '0xAgentWallet' }),
}));

// Set env before import
process.env.AGENT_PHANPY_PRIVATE_KEY = '0x' + 'ab'.repeat(32);

const { getStakedVvv, buyAndStakeVvv, shouldAcquireCompute, MIN_ETH_FOR_VVV_PURCHASE } = await import('../services/diemService.js');

describe('diemService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWaitForTransactionReceipt.mockResolvedValue({ status: 'success' });
  });

  describe('getStakedVvv', () => {
    it('returns staked balance as float', async () => {
      // 100 VVV = 100 * 1e18 wei
      mockReadContract.mockResolvedValue(BigInt(100e18));

      const staked = await getStakedVvv('0xAgentWallet');

      expect(staked).toBe(100);
      expect(mockReadContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'stakes',
          args: ['0xAgentWallet'],
        })
      );
    });

    it('returns 0 on contract read failure', async () => {
      mockReadContract.mockRejectedValue(new Error('RPC timeout'));

      const staked = await getStakedVvv('0xAgentWallet');

      expect(staked).toBe(0);
    });

    it('returns 0 for zero staked balance', async () => {
      mockReadContract.mockResolvedValue(0n);

      const staked = await getStakedVvv('0xAgentWallet');

      expect(staked).toBe(0);
    });
  });

  describe('shouldAcquireCompute', () => {
    it('returns false when ETH balance below threshold', async () => {
      const result = await shouldAcquireCompute('agent-phanpy', 0.01, '0xAgentWallet');
      expect(result).toBe(false);
    });

    it('returns false when ETH balance exactly at threshold boundary (below MIN)', async () => {
      // MIN_ETH_FOR_VVV_PURCHASE is 0.05, balance must be >= 0.05
      const result = await shouldAcquireCompute('agent-phanpy', 0.04, '0xAgentWallet');
      expect(result).toBe(false);
    });

    it('returns true when balance sufficient and no VVV staked', async () => {
      mockReadContract.mockResolvedValue(0n); // no staked VVV

      const result = await shouldAcquireCompute('agent-phanpy', 0.1, '0xAgentWallet');

      expect(result).toBe(true);
    });

    it('returns false when balance sufficient but already has staked VVV', async () => {
      mockReadContract.mockResolvedValue(BigInt(50e18)); // already staked

      const result = await shouldAcquireCompute('agent-phanpy', 0.1, '0xAgentWallet');

      expect(result).toBe(false);
    });
  });

  describe('buyAndStakeVvv', () => {
    it('executes full buy → approve → stake flow', async () => {
      // Call sequence:
      // 1. writeContract: swapExactETHForTokens (buy VVV)
      // 2. readContract: balanceOf (check VVV balance)
      // 3. readContract: allowance (check approval)
      // 4. writeContract: approve (if needed)
      // 5. writeContract: stake

      mockWriteContract
        .mockResolvedValueOnce('0xBuyTxHash')     // swap
        .mockResolvedValueOnce('0xApproveTxHash')  // approve
        .mockResolvedValueOnce('0xStakeTxHash');   // stake

      mockReadContract
        .mockResolvedValueOnce(BigInt(500e18))  // balanceOf: 500 VVV
        .mockResolvedValueOnce(0n);             // allowance: 0 (needs approval)

      const result = await buyAndStakeVvv('agent-phanpy', 0.01);

      expect(result.buyTxHash).toBe('0xBuyTxHash');
      expect(result.stakeTxHash).toBe('0xStakeTxHash');
      expect(result.vvvStaked).toBe(500);

      // Verify swap call
      const swapCall = mockWriteContract.mock.calls[0][0];
      expect(swapCall.functionName).toBe('swapExactETHForTokens');

      // Verify stake call
      const stakeCall = mockWriteContract.mock.calls[2][0];
      expect(stakeCall.functionName).toBe('stake');
      expect(stakeCall.args[1]).toBe(BigInt(500e18)); // stakes full balance
    });

    it('skips approval when allowance is sufficient', async () => {
      mockWriteContract
        .mockResolvedValueOnce('0xBuyTxHash')   // swap
        .mockResolvedValueOnce('0xStakeTxHash'); // stake (no approve needed)

      mockReadContract
        .mockResolvedValueOnce(BigInt(100e18))   // balanceOf: 100 VVV
        .mockResolvedValueOnce(BigInt(200e18));   // allowance: 200 (sufficient)

      const result = await buyAndStakeVvv('agent-phanpy', 0.01);

      // Only 2 writeContract calls (swap + stake, no approve)
      expect(mockWriteContract).toHaveBeenCalledTimes(2);
      expect(result.stakeTxHash).toBe('0xStakeTxHash');
    });

    it('throws for unknown agent', async () => {
      await expect(buyAndStakeVvv('agent-unknown', 0.01))
        .rejects.toThrow('No private key');
    });
  });

  describe('MIN_ETH_FOR_VVV_PURCHASE', () => {
    it('is 0.05 ETH', () => {
      expect(MIN_ETH_FOR_VVV_PURCHASE).toBe(0.05);
    });
  });
});
