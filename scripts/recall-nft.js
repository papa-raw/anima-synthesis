/**
 * Recall a Beezie NFT from an agent wallet back to paparaw.eth
 * Usage: node scripts/recall-nft.js <agent-id>
 * Example: node scripts/recall-nft.js agent-phanpy
 */

import { createWalletClient, createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BEEZIE_CONTRACT = '0xbb5ec6fd4b61723bd45c399840f1d868840ca16f';
const PAPARAW = '0xC4d9d1a93068d311Ab18E988244123430eB4F1CD'; // paparaw.eth

// Minimal ERC-721 ABI for transfer
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
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  }
];

// Agent token IDs
const AGENT_NFTS = {
  'agent-phanpy': 2302n,
};

async function main() {
  const agentId = process.argv[2];
  if (!agentId) {
    console.error('Usage: node scripts/recall-nft.js <agent-id>');
    console.error('Example: node scripts/recall-nft.js agent-phanpy');
    process.exit(1);
  }

  const tokenId = AGENT_NFTS[agentId];
  if (!tokenId) {
    console.error(`Unknown agent: ${agentId}. Known: ${Object.keys(AGENT_NFTS).join(', ')}`);
    process.exit(1);
  }

  // Load agent wallet
  const walletsPath = join(__dirname, '..', 'server', 'agents', 'wallets.json');
  const wallets = JSON.parse(readFileSync(walletsPath, 'utf8'));
  const agentWallet = wallets.find(w => w.id === agentId);
  if (!agentWallet) {
    console.error(`No wallet found for ${agentId}. Run generate-wallets first.`);
    process.exit(1);
  }

  const publicClient = createPublicClient({ chain: base, transport: http('https://mainnet.base.org') });

  // Check current owner
  const owner = await publicClient.readContract({
    address: BEEZIE_CONTRACT,
    abi: ERC721_ABI,
    functionName: 'ownerOf',
    args: [tokenId]
  });
  console.log(`Beezie #${tokenId} current owner: ${owner}`);

  if (owner.toLowerCase() !== agentWallet.address.toLowerCase()) {
    console.error(`NFT is not in agent wallet (${agentWallet.address}). It's in ${owner}.`);
    console.error('Nothing to recall.');
    process.exit(1);
  }

  // Transfer back to paparaw.eth
  const account = privateKeyToAccount(agentWallet.privateKey);
  const walletClient = createWalletClient({
    account,
    chain: base,
    transport: http('https://mainnet.base.org')
  });

  // Resolve paparaw.eth
  let paparawAddress = PAPARAW;
  if (paparawAddress.startsWith('0xYOUR')) {
    // Try to resolve ENS (Base doesn't natively support ENS, use mainnet or hardcode)
    console.error('Set PAPARAW address in the script or pass as env var PAPARAW_ADDRESS');
    console.error('Find it: check your wallet or run `cast resolve-name paparaw.eth`');
    process.exit(1);
  }

  console.log(`\nRecalling Beezie #${tokenId} from ${agentWallet.address} → ${paparawAddress}...`);

  const hash = await walletClient.writeContract({
    address: BEEZIE_CONTRACT,
    abi: ERC721_ABI,
    functionName: 'transferFrom',
    args: [agentWallet.address, paparawAddress, tokenId]
  });

  console.log(`Transfer tx: ${hash}`);
  console.log(`View: https://basescan.org/tx/${hash}`);

  // Wait for confirmation
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`Confirmed in block ${receipt.blockNumber}. NFT recalled to ${paparawAddress}.`);
}

main().catch(e => { console.error(e); process.exit(1); });
