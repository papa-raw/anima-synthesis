/**
 * IPFS Service — Pin data via Storacha (formerly web3.storage)
 * Part of the Protocol Labs / Filecoin ecosystem.
 * Used for: heartbeat proofs, location attestations, capture records.
 *
 * Storacha stores data on IPFS + Filecoin with content addressing.
 * Each pin returns a CID that's verifiable and permanent.
 */

const STORACHA_TOKEN = process.env.STORACHA_TOKEN;

export async function pinToIpfs(data) {
  if (!STORACHA_TOKEN) return null; // Silent skip if no token

  try {
    // Storacha uses the w3up client, but for simplicity use the HTTP API
    // https://web3.storage/docs/how-to/upload/#using-the-http-api
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });

    const res = await fetch('https://api.web3.storage/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STORACHA_TOKEN}`,
        'X-Name': `anima-${data.agentId || 'unknown'}-${Date.now()}`
      },
      body: blob
    });

    if (!res.ok) {
      console.error('Storacha pin failed:', res.status);
      return null;
    }

    const result = await res.json();
    return result.cid || null;
  } catch (e) {
    console.error('IPFS pin failed:', e.message);
    return null;
  }
}
