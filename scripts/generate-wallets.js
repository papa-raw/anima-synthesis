import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, '..', 'server', 'agents', 'wallets.json');

const agents = ['agent-phanpy', 'agent-2', 'agent-3'];

const wallets = agents.map(id => {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  return { id, address: account.address, privateKey };
});

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(wallets, null, 2));

console.log('Generated wallets:');
wallets.forEach(w => console.log(`  ${w.id}: ${w.address}`));
console.log(`\nSaved to ${outPath}`);
console.log('\nIMPORTANT: Add private keys to .env:');
wallets.forEach(w => console.log(`  ${w.id.toUpperCase().replace(/-/g, '_')}_PRIVATE_KEY=${w.privateKey}`));
