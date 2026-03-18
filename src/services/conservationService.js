/**
 * Conservation Service — verify AZUSD (Azos Stablecoin) holdings on Base
 * Every capture requires holding ≥5 AZUSD, a decentralized stablecoin backed
 * by diversified collateral (cbBTC, cbETH, AERO, WELL, etc.) on Base.
 * Holding AZUSD supports Base DeFi infrastructure and stable collateral health.
 */

import { createPublicClient, http, formatUnits, parseUnits } from 'viem';
import { base } from 'viem/chains';

const AZUSD_CONTRACT = '0x3595ca37596d5895b70efab592ac315d5b9809b2';
const AZUSD_DECIMALS = 18;
const MIN_AZUSD_REQUIRED = 5; // Must hold ≥5 AZUSD to capture

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
 * Check if wallet holds ≥5 AZUSD on Base
 * Returns { holds: boolean, balance: string, raw: bigint, required: number }
 */
export async function checkAzusdBalance(walletAddress) {
  try {
    const rawBalance = await publicClient.readContract({
      address: AZUSD_CONTRACT,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [walletAddress]
    });

    const balance = formatUnits(rawBalance, AZUSD_DECIMALS);
    const minRequired = parseUnits(String(MIN_AZUSD_REQUIRED), AZUSD_DECIMALS);
    return {
      holds: rawBalance >= minRequired,
      balance,
      raw: rawBalance.toString(),
      required: MIN_AZUSD_REQUIRED
    };
  } catch (e) {
    console.error('AZUSD balance check failed:', e.message);
    return { holds: false, balance: '0', raw: '0', required: MIN_AZUSD_REQUIRED };
  }
}

export const AZUSD_INFO = {
  name: 'Azos Stablecoin',
  symbol: 'AZUSD',
  contract: AZUSD_CONTRACT,
  chain: 'base',
  decimals: AZUSD_DECIMALS,
  required: MIN_AZUSD_REQUIRED,
  mintUrl: 'https://app.azos.finance/',
  buyUrl: 'https://www.hydrex.fi/swap?tokenIn=ETH&tokenOut=0x3595ca37596d5895b70efab592ac315d5b9809b2',
  docsUrl: 'https://docs.azos.finance/docs/intro/',
  impact: 'Decentralized overcollateralized stablecoin on Base'
};

