/**
 * Fund agent wallets with seed ETH from paparaw.eth
 * Usage: node scripts/fund-agents.js
 *
 * NOTE: This script shows you what to send. You transfer manually from your wallet
 * (same as NFT transfers). The amounts are small (~$10 each).
 */

import { createPublicClient, http, formatEther } from 'viem';
import { base } from 'viem/chains';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicClient = createPublicClient({ chain: base, transport: http('https://mainnet.base.org') });

async function main() {
  let wallets;
  try {
    const path = join(__dirname, '..', 'server', 'agents', 'wallets.json');
    wallets = JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    console.error('No wallets.json found. Run `npm run generate-wallets` first.');
    process.exit(1);
  }

  console.log('\n=== FUND AGENT WALLETS ===\n');
  console.log('Send ~0.004 ETH (~$10) to each agent wallet from paparaw.eth:\n');

  for (const wallet of wallets) {
    const balance = await publicClient.getBalance({ address: wallet.address });
    const ethBal = parseFloat(formatEther(balance));
    const funded = ethBal > 0.001;

    console.log(`${wallet.id}:`);
    console.log(`  Address: ${wallet.address}`);
    console.log(`  Balance: ${ethBal.toFixed(6)} ETH ${funded ? '(funded)' : '(needs funding)'}`);
    console.log();
  }

  console.log('Transfer from your wallet app, MetaMask, or BaseScan.');
  console.log('~0.004 ETH per agent is enough for weeks of gas on Base.');
}

main().catch(e => { console.error(e); process.exit(1); });
