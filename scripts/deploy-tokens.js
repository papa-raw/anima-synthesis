/**
 * Deploy agent tokens on Base via Clanker SDK
 * Usage: node scripts/deploy-tokens.js
 *
 * Prerequisites:
 *   1. npm run generate-wallets (agent wallets exist)
 *   2. npm run fund-agents (agent wallets have ETH for gas)
 *   3. Agent private keys in .env
 */

import 'dotenv/config';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initDb } from '../server/db/init.js';
import { deployToken } from '../server/services/clankerService.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Agent token configs
const TOKEN_CONFIGS = [
  { agentId: 'agent-phanpy', name: 'Anima Phanpy', symbol: 'PHANPY', image: 'https://anima.cards/tokens/agent-phanpy.png' },
  { agentId: 'agent-2', name: 'Anima Ponyta', symbol: 'PONYTA', image: 'https://anima.cards/tokens/agent-ponyta.png' },
  { agentId: 'agent-3', name: 'Anima Magnemite', symbol: 'MAGNET', image: 'https://anima.cards/tokens/agent-magnemite.png' },
];

async function main() {
  const db = initDb();

  for (const config of TOKEN_CONFIGS) {
    const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(config.agentId);
    if (!agent) {
      console.error(`Agent ${config.agentId} not found in DB. Run seed-agents first.`);
      continue;
    }
    if (agent.token_address) {
      console.log(`${config.agentId} already has token at ${agent.token_address}, skipping.`);
      continue;
    }

    console.log(`\nDeploying ${config.symbol} for ${config.agentId}...`);
    try {
      const tokenAddress = await deployToken(config.agentId, config.name, config.symbol, config.image);
      db.prepare('UPDATE agents SET token_address = ?, token_symbol = ? WHERE id = ?')
        .run(tokenAddress, `$${config.symbol}`, config.agentId);
      console.log(`Success: ${config.symbol} deployed at ${tokenAddress}`);
      console.log(`View: https://basescan.org/token/${tokenAddress}`);
    } catch (e) {
      console.error(`Failed to deploy ${config.symbol}:`, e.message);
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); });
