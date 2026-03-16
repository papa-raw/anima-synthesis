import { initDb } from '../server/db/init.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Agent definitions
const AGENTS = [
  {
    id: 'agent-phanpy',
    pokemon: 'Phanpy',
    element: 'fighting',
    bioregionId: 'NA03',
    bioregionName: 'Pacific Northwest',
    tokenSymbol: '$PHANPY',
    beezieTokenId: '2302'
  },
  // Add agents 2 and 3 here after purchasing cards
];

// Load wallets if available
let wallets = [];
try {
  const walletsPath = join(__dirname, '..', 'server', 'agents', 'wallets.json');
  wallets = JSON.parse(readFileSync(walletsPath, 'utf8'));
} catch {
  console.warn('No wallets.json found. Run `npm run generate-wallets` first.');
}

const db = initDb();

for (const agent of AGENTS) {
  const wallet = wallets.find(w => w.id === agent.id);
  db.prepare(`INSERT OR REPLACE INTO agents (id, pokemon, element, bioregion_id, bioregion_name, wallet_address, token_symbol, beezie_token_id, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'wild')`)
    .run(agent.id, agent.pokemon, agent.element, agent.bioregionId, agent.bioregionName, wallet?.address || '', agent.tokenSymbol, agent.beezieTokenId || null);

  console.log(`Seeded ${agent.id} (${agent.pokemon}) → ${agent.bioregionName}`);
}

console.log(`\nSeeded ${AGENTS.length} agents`);
