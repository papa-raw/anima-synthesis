/**
 * Register agent wallets with Locus for payment operations
 * Usage: node scripts/register-locus.js
 */

import { registerAgent } from '../server/services/locusService.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  let wallets;
  try {
    const path = join(__dirname, '..', 'server', 'agents', 'wallets.json');
    wallets = JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    console.error('No wallets.json found. Run `npm run generate-wallets` first.');
    process.exit(1);
  }

  console.log('\n=== REGISTER AGENTS WITH LOCUS ===\n');

  for (const wallet of wallets) {
    try {
      const result = await registerAgent(wallet.id);
      console.log(`${wallet.id}: registered`);
      console.log(`  Locus wallet: ${result.walletId || result.ownerAddress || 'unknown'}`);
      console.log(`  API key: ${result.apiKey || 'check response'}`);
      console.log(`  Add to .env: LOCUS_${wallet.id.toUpperCase().replace(/-/g, '_')}_API_KEY=${result.apiKey || ''}`);
      console.log();
    } catch (e) {
      console.error(`${wallet.id}: registration failed — ${e.message}`);
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); });
