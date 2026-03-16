const PINATA_JWT = process.env.PINATA_JWT;

export async function pinToIpfs(data) {
  if (!PINATA_JWT) return null; // Silent skip if no Pinata key

  try {
    const res = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PINATA_JWT}`
      },
      body: JSON.stringify({
        pinataContent: data,
        pinataMetadata: { name: `anima-heartbeat-${data.agentId}-${Date.now()}` }
      })
    });
    const result = await res.json();
    return result.IpfsHash || null;
  } catch (e) {
    console.error('IPFS pin failed:', e.message);
    return null;
  }
}
