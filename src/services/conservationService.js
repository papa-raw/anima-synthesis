/**
 * Token Gate Service — verify holder has agent's own token on Base
 * To capture an agent, you must hold ≥1M of that agent's ERC-20 token.
 * This creates a flywheel: buying tokens → LP fees → agent survives → creates art.
 */

import { createPublicClient, http, formatUnits } from 'viem';
import { base } from 'viem/chains';

const MIN_TOKENS_REQUIRED = 1_000_000; // 1M tokens (0.1% of 1B supply)

const publicClient = createPublicClient({
  chain: base,
  transport: http('https://mainnet.base.org')
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

/**
 * Check if wallet holds ≥1M of the agent's token on Base
 * @param {string} walletAddress
 * @param {string} tokenAddress - the agent's ERC-20 token
 * @param {string} tokenSymbol - for display
 * Returns { holds: boolean, balance: string, required: number, tokenSymbol: string }
 */
export async function checkTokenGate(walletAddress, tokenAddress, tokenSymbol) {
  if (!tokenAddress) {
    return { holds: false, balance: '0', required: MIN_TOKENS_REQUIRED, tokenSymbol: tokenSymbol || '??', noToken: true };
  }

  try {
    const [rawBalance, decimals] = await Promise.all([
      publicClient.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [walletAddress]
      }),
      publicClient.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'decimals'
      })
    ]);

    const balance = formatUnits(rawBalance, decimals);
    const balanceNum = parseFloat(balance);
    return {
      holds: balanceNum >= MIN_TOKENS_REQUIRED,
      balance: balanceNum.toLocaleString(undefined, { maximumFractionDigits: 0 }),
      required: MIN_TOKENS_REQUIRED,
      tokenSymbol: tokenSymbol || '??'
    };
  } catch (e) {
    console.error('Token gate check failed:', e.message);
    return { holds: false, balance: '0', required: MIN_TOKENS_REQUIRED, tokenSymbol: tokenSymbol || '??' };
  }
}

export const TOKEN_GATE_INFO = {
  required: MIN_TOKENS_REQUIRED,
  requiredFormatted: '1M',
  buyBaseUrl: 'https://clanker.world/clanker/'
};
