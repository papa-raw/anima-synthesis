/**
 * Conservation Service — verify $TGN (Treegens) holdings on Base
 * Every capture requires holding $TGN, which funds mangrove tree planting.
 */

import { createPublicClient, http, formatUnits } from 'viem';
import { base } from 'viem/chains';

const TGN_CONTRACT = '0xd75dfa972c6136f1c594fec1945302f885e1ab29';

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
 * Check if wallet holds any $TGN on Base
 * Returns { holds: boolean, balance: string, raw: bigint }
 */
export async function checkTgnBalance(walletAddress) {
  try {
    const [rawBalance, decimals] = await Promise.all([
      publicClient.readContract({
        address: TGN_CONTRACT,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [walletAddress]
      }),
      publicClient.readContract({
        address: TGN_CONTRACT,
        abi: ERC20_ABI,
        functionName: 'decimals'
      })
    ]);

    const balance = formatUnits(rawBalance, decimals);
    return {
      holds: rawBalance > 0n,
      balance,
      raw: rawBalance.toString()
    };
  } catch (e) {
    console.error('TGN balance check failed:', e.message);
    return { holds: false, balance: '0', raw: '0' };
  }
}

export const TGN_INFO = {
  name: 'Treegens',
  symbol: '$TGN',
  contract: TGN_CONTRACT,
  chain: 'base',
  buyUrl: 'https://app.uniswap.org/swap?outputCurrency=0xd75dfa972c6136f1c594fec1945302f885e1ab29&chain=base',
  impact: '50% of purchase funds mangrove tree planters onchain'
};
