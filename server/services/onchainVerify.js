/**
 * Server-side onchain verification for capture requirements.
 * Checks AZUSD balance and Beezie NFT ownership on Base.
 */

import { createPublicClient, http, formatUnits, parseUnits } from 'viem';
import { base } from 'viem/chains';

const AZUSD_CONTRACT = '0x3595ca37596d5895b70efab592ac315d5b9809b2';
const AZUSD_DECIMALS = 18;
const MIN_AZUSD_REQUIRED = 5;

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
 * Verify wallet holds ≥5 AZUSD on Base
 */
export async function verifyAzusdHolding(walletAddress) {
  try {
    const rawBalance = await publicClient.readContract({
      address: AZUSD_CONTRACT,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [walletAddress]
    });
    const minRequired = parseUnits(String(MIN_AZUSD_REQUIRED), AZUSD_DECIMALS);
    const holds = rawBalance >= minRequired;
    const balance = formatUnits(rawBalance, AZUSD_DECIMALS);
    return { valid: holds, balance, required: MIN_AZUSD_REQUIRED };
  } catch (e) {
    console.error('AZUSD verification failed:', e.message);
    // Fail open for hackathon — log but don't block
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
