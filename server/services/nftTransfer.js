/**
 * NFT Transfer Service — transfers Beezie NFTs from agent wallets
 * Used on capture (agent → catcher) and can be used for recall (agent → paparaw)
 */

import { createWalletClient, createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BEEZIE_CONTRACT = '0xbb5ec6fd4b61723bd45c399840f1d868840ca16f';

const ERC721_ABI = [
  {
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'tokenId', type: 'uint256' }
    ],
    name: 'transferFrom',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  }
];

const publicClient = createPublicClient({
  chain: base,
  transport: http(process.env.BASE_RPC_URL || 'https://mainnet.base.org')
});

// Load agent wallets
let wallets = null;
function getWallets() {
  if (wallets) return wallets;
  try {
    const path = join(__dirname, '..', 'agents', 'wallets.json');
    wallets = JSON.parse(readFileSync(path, 'utf8'));
    return wallets;
  } catch {
    return [];
  }
}

/**
 * Transfer Beezie NFT from agent wallet to catcher on successful capture
 */
export async function transferNftToCatcher(agentId, catcherAddress, beezieTokenId) {
  const agentWallet = getWallets().find(w => w.id === agentId);
  if (!agentWallet) throw new Error(`No wallet found for agent ${agentId}`);

  const account = privateKeyToAccount(agentWallet.privateKey);
  const walletClient = createWalletClient({
    account,
    chain: base,
    transport: http(process.env.BASE_RPC_URL || 'https://mainnet.base.org')
  });

  const hash = await walletClient.writeContract({
    address: BEEZIE_CONTRACT,
    abi: ERC721_ABI,
    functionName: 'transferFrom',
    args: [account.address, catcherAddress, BigInt(beezieTokenId)]
  });

  // Wait for confirmation
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}
