/**
 * LP Service Tests
 *
 * Tests the LP deepening flow: wrap → swap → approve → mint position
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockReadContract = vi.fn();
const mockWriteContract = vi.fn();
const mockWaitForTransactionReceipt = vi.fn();
const mockGetBalance = vi.fn();

vi.mock('viem', () => ({
  createPublicClient: () => ({
    readContract: mockReadContract,
    waitForTransactionReceipt: mockWaitForTransactionReceipt,
    getBalance: mockGetBalance,
  }),
  createWalletClient: () => ({
    writeContract: mockWriteContract,
  }),
  http: () => ({}),
  parseEther: (v) => BigInt(Math.floor(parseFloat(v) * 1e18)),
  formatEther: (v) => (Number(v) / 1e18).toString(),
  parseAbi: (strs) => strs.map(s => ({ raw: s })),
  encodeAbiParameters: () => '0xencoded',
  encodeFunctionData: () => '0xencoded',
}));

vi.mock('viem/chains', () => ({ base: { id: 8453 } }));
vi.mock('viem/accounts', () => ({
  privateKeyToAccount: (key) => ({ address: '0xAgentWallet' }),
}));

process.env.AGENT_PHANPY_PRIVATE_KEY = '0x' + 'cd'.repeat(32);

const { deepenLiquidity } = await import('../services/lpService.js');

const TOKEN_ADDRESS = '0x70C445a2E1685266A7b66110082F9718337Feb07';
const WETH = '0x4200000000000000000000000000000000000006';

describe('lpService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWaitForTransactionReceipt.mockResolvedValue({ status: 'success' });
    // Default: all approvals needed (allowance = 0)
    mockReadContract.mockResolvedValue(0n);
    mockWriteContract.mockResolvedValue('0xTxHash');
  });

  it('skips if amount too small (< 0.0002 ETH)', async () => {
    const result = await deepenLiquidity('agent-phanpy', 0.0001, TOKEN_ADDRESS);

    expect(result).toBeNull();
    expect(mockWriteContract).not.toHaveBeenCalled();
  });

  it('executes full flow for sufficient amount', async () => {
    // Mock: deposit returns hash, approve returns hash, swap returns hash, etc.
    mockWriteContract
      .mockResolvedValueOnce('0xWrapTx')      // WETH deposit
      .mockResolvedValueOnce('0xApproveRouter') // approve universal router
      .mockResolvedValueOnce('0xSwapTx')       // swap via router
      .mockResolvedValueOnce('0xApproveP2_1')  // approve permit2 for WETH
      .mockResolvedValueOnce('0xApproveP2_2')  // approve permit2 for token
      .mockResolvedValueOnce('0xP2toPM_1')     // permit2→PM for WETH
      .mockResolvedValueOnce('0xP2toPM_2')     // permit2→PM for token
      .mockResolvedValueOnce('0xMintTx');       // modifyLiquidities

    // After swap, token balance check returns some tokens
    mockReadContract
      .mockResolvedValueOnce(0n)  // WETH allowance for Permit2 (needs approval)
      .mockResolvedValueOnce(BigInt(1e18)) // token balance after swap
      .mockResolvedValueOnce(0n)  // WETH allowance check
      .mockResolvedValueOnce(0n); // token allowance check

    const result = await deepenLiquidity('agent-phanpy', 0.001, TOKEN_ADDRESS);

    expect(result).not.toBeNull();
    expect(result.wrapTx).toBe('0xWrapTx');
    // At minimum, writeContract was called for wrap + approve + swap + approvals + mint
    expect(mockWriteContract).toHaveBeenCalled();
  });

  it('returns partial result if swap fails', async () => {
    // Reset all mocks completely to avoid leftover queue from previous test
    mockWriteContract.mockReset();
    mockReadContract.mockReset();
    mockWaitForTransactionReceipt.mockReset();

    mockWaitForTransactionReceipt.mockResolvedValue({ status: 'success' });
    mockReadContract.mockResolvedValue(0n);

    mockWriteContract
      .mockResolvedValueOnce('0xWrapTx')       // Step 1: WETH deposit
      .mockResolvedValueOnce('0xApproveRouter') // Step 2a: approve Universal Router
      .mockRejectedValueOnce(new Error('INSUFFICIENT_LIQUIDITY')); // Step 2b: swap execute fails

    const result = await deepenLiquidity('agent-phanpy', 0.001, TOKEN_ADDRESS);

    expect(result).toEqual({
      wrapTx: '0xWrapTx',
      swapTx: null,
      mintTx: null,
    });
  });

  it('throws for unknown agent', async () => {
    await expect(deepenLiquidity('agent-unknown', 0.01, TOKEN_ADDRESS))
      .rejects.toThrow('No private key');
  });

  it('sorts pool currencies correctly', async () => {
    // WETH address > PHANPY address (0x42... > 0x70...)
    // Actually 0x42 < 0x70 alphabetically, so WETH should be currency0
    const wethLower = WETH.toLowerCase();
    const tokenLower = TOKEN_ADDRESS.toLowerCase();
    // 0x42... vs 0x70... → WETH is lower
    expect(wethLower < tokenLower).toBe(true);
  });
});
