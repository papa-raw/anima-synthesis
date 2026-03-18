/**
 * Server-side onchain verification for capture requirements.
 * Checks agent token holding and Beezie NFT ownership on Base.
 */

import { createPublicClient, http, formatUnits } from 'viem';
import { base } from 'viem/chains';

const MIN_TOKENS_REQUIRED = 1_000_000; // 1M tokens
const BEEZIE_CONTRACT = '0xbb5ec6fd4b61723bd45c399840f1d868840ca16f';

const publicClient = createPublicClient({
  chain: base,
  transport: http(process.env.BASE_RPC_URL || 'https://mainnet.base.org')
});

const ERC20_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function'
  }
];

const ERC721_ABI = [
  {
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  }
];

/**
 * Verify wallet holds ≥1M of the agent's own token
 */
export async function verifyTokenHolding(walletAddress, tokenAddress) {
  if (!tokenAddress) return { valid: true, skipped: true, reason: 'No token deployed yet' };

  try {
    const [rawBalance, decimals] = await Promise.all([
      publicClient.readContract({ address: tokenAddress, abi: ERC20_ABI, functionName: 'balanceOf', args: [walletAddress] }),
      publicClient.readContract({ address: tokenAddress, abi: ERC20_ABI, functionName: 'decimals' })
    ]);
    const balance = parseFloat(formatUnits(rawBalance, decimals));
    return { valid: balance >= MIN_TOKENS_REQUIRED, balance, required: MIN_TOKENS_REQUIRED };
  } catch (e) {
    console.error('Token verification failed:', e.message);
    return { valid: true, skipped: true, error: e.message };
  }
}

/**
 * Verify wallet holds ≥1 Beezie NFT on Base
 */
export async function verifyBeezieHolding(walletAddress) {
  try {
    const rawBalance = await publicClient.readContract({
      address: BEEZIE_CONTRACT,
      abi: ERC721_ABI,
      functionName: 'balanceOf',
      args: [walletAddress]
    });
    const count = Number(rawBalance);
    return { valid: count > 0, count };
  } catch (e) {
    console.error('Beezie verification failed:', e.message);
    return { valid: true, skipped: true, error: e.message };
  }
}
