/**
 * Release a Beezie NFT from paparaw.eth to an agent wallet (ensoulment + release)
 *
 * NOTE: This must be run AFTER you manually approve the transfer.
 * Since paparaw.eth is your personal wallet, you sign the transfer yourself
 * (MetaMask / wallet app), not from this script.
 *
 * Steps:
 *   1. Run this script to see the agent wallet address
 *   2. Transfer Beezie NFT to that address from your wallet (same as you did paparaw.eth transfer)
 *   3. Run seed-agents.js to mark agent as 'wild' in DB
 *
 * Usage: node scripts/release-nft.js <agent-id>
 */

import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BEEZIE_CONTRACT = '0xbb5ec6fd4b61723bd45c399840f1d868840ca16f';

const ERC721_ABI = [
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  }
];

const AGENT_NFTS = {
  'agent-phanpy': { tokenId: 2302n, pokemon: 'Phanpy' },
};

async function main() {
  const agentId = process.argv[2];
  if (!agentId) {
    console.error('Usage: node scripts/release-nft.js <agent-id>');
    process.exit(1);
  }

  const agentNft = AGENT_NFTS[agentId];
  if (!agentNft) {
    console.error(`Unknown agent: ${agentId}`);
    process.exit(1);
  }

  // Load agent wallet
  const walletsPath = join(__dirname, '..', 'server', 'agents', 'wallets.json');
  let wallets;
  try {
    wallets = JSON.parse(readFileSync(walletsPath, 'utf8'));
  } catch {
    console.error('No wallets.json found. Run `npm run generate-wallets` first.');
    process.exit(1);
  }

  const agentWallet = wallets.find(w => w.id === agentId);
  if (!agentWallet) {
    console.error(`No wallet for ${agentId}`);
    process.exit(1);
  }

  const publicClient = createPublicClient({ chain: base, transport: http('https://mainnet.base.org') });

  // Check current owner
  const owner = await publicClient.readContract({
    address: BEEZIE_CONTRACT,
    abi: ERC721_ABI,
    functionName: 'ownerOf',
    args: [agentNft.tokenId]
  });

  console.log(`\n=== RELEASE ${agentNft.pokemon} (Beezie #${agentNft.tokenId}) ===`);
  console.log(`Current owner: ${owner}`);
  console.log(`Agent wallet:  ${agentWallet.address}`);
  console.log();

  if (owner.toLowerCase() === agentWallet.address.toLowerCase()) {
    console.log('NFT is ALREADY in the agent wallet. Agent is released!');
    console.log('Run `npm run seed-agents` to mark as wild in DB.');
    return;
  }

  console.log('TO RELEASE:');
  console.log(`  Transfer Beezie #${agentNft.tokenId} to: ${agentWallet.address}`);
  console.log();
  console.log('Do this from your wallet (MetaMask, Beezie app, or BaseScan):');
  console.log(`  Contract: ${BEEZIE_CONTRACT}`);
  console.log(`  Function: transferFrom(${owner}, ${agentWallet.address}, ${agentNft.tokenId})`);
  console.log();
  console.log('After transfer, run:');
  console.log('  npm run seed-agents');
}

main().catch(e => { console.error(e); process.exit(1); });
