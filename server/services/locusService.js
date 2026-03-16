const LOCUS_API = 'https://beta-api.paywithlocus.com/api';

export async function registerAgent(agentId) {
  const res = await fetch(`${LOCUS_API}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: `anima-${agentId}`, description: `Anima agent ${agentId}` })
  });
  if (!res.ok) throw new Error(`Locus register failed: ${res.status}`);
  return res.json();
}

export async function sendPayment(apiKey, to, amountUsdc, memo) {
  const res = await fetch(`${LOCUS_API}/transfer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ to, amount: amountUsdc, token: 'USDC', memo })
  });
  if (!res.ok) throw new Error(`Locus transfer failed: ${res.status}`);
  return res.json();
}

export async function getBalance(apiKey) {
  const res = await fetch(`${LOCUS_API}/balance`, {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  });
  if (!res.ok) throw new Error(`Locus balance failed: ${res.status}`);
  return res.json();
}
