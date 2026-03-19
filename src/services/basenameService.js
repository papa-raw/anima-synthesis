/**
 * Basename Service — ENS naming on Base via Basenames
 *
 * After capture, the catcher registers a .base.eth name for the agent.
 * Uses commit-reveal pattern: commit() → wait 60s → register()
 *
 * RegistrarController (Base mainnet): 0x4cCb0BB02FCABA27e82a56646E81d8c5bC4119a5
 * Cost: 0.001 ETH for 5-9 char names, 0.0001 ETH for 10+ chars
 */

const REGISTRAR_CONTROLLER = '0x4cCb0BB02FCABA27e82a56646E81d8c5bC4119a5';
const L2_RESOLVER = '0xC6d566A56A1aFf6508b41f6c90ff131615583BCD';

const REGISTRAR_ABI = [
  'function available(string name) view returns (bool)',
  'function valid(string name) view returns (bool)',
  'function registerPrice(string name, uint256 duration) view returns (uint256)',
  'function makeCommitment(string name, address owner, uint256 duration, bytes32 secret, address resolver, bytes[] data, bool reverseRecord, uint16 ownerControlledFuses) view returns (bytes32)',
  'function commit(bytes32 commitment)',
  'function register(string name, address owner, uint256 duration, bytes32 secret, address resolver, bytes[] data, bool reverseRecord, uint16 ownerControlledFuses) payable',
];

const MIN_COMMITMENT_AGE = 60; // seconds

/**
 * Check if a name is available
 */
export async function checkNameAvailable(name) {
  const { ethers } = await import('ethers');
  const provider = new ethers.BrowserProvider(window.ethereum);
  const registrar = new ethers.Contract(REGISTRAR_CONTROLLER, REGISTRAR_ABI, provider);

  const isValid = await registrar.valid(name);
  if (!isValid) return { available: false, reason: 'Name must be 3+ characters, lowercase letters/numbers/hyphens only' };

  const isAvailable = await registrar.available(name);
  if (!isAvailable) return { available: false, reason: `${name}.base.eth is already taken` };

  const YEAR = 365n * 24n * 60n * 60n;
  const price = await registrar.registerPrice(name, YEAR);

  return {
    available: true,
    price: ethers.formatEther(price),
    priceWei: price,
    fullName: `${name}.base.eth`,
  };
}

/**
 * Step 1: Submit commitment hash (prevents frontrunning)
 * Returns the secret needed for step 2
 */
export async function commitName(name, agentWallet) {
  const { ethers } = await import('ethers');
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const registrar = new ethers.Contract(REGISTRAR_CONTROLLER, REGISTRAR_ABI, signer);

  const YEAR = 365n * 24n * 60n * 60n;
  const secret = ethers.hexlify(ethers.randomBytes(32));

  const commitment = await registrar.makeCommitment(
    name, agentWallet, YEAR, secret, L2_RESOLVER, [], true, 0
  );

  const tx = await registrar.commit(commitment);
  await tx.wait();

  return {
    secret,
    commitTxHash: tx.hash,
    committedAt: Math.floor(Date.now() / 1000),
  };
}

/**
 * Step 2: Register after 60s wait
 * @param {string} name
 * @param {string} agentWallet
 * @param {string} secret - from commitName()
 */
export async function registerBasename(name, agentWallet, secret) {
  const { ethers } = await import('ethers');
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const registrar = new ethers.Contract(REGISTRAR_CONTROLLER, REGISTRAR_ABI, signer);

  const YEAR = 365n * 24n * 60n * 60n;
  const price = await registrar.registerPrice(name, YEAR);
  const value = price + (price / 10n); // 10% buffer

  const tx = await registrar.register(
    name, agentWallet, YEAR, secret, L2_RESOLVER, [], true, 0,
    { value }
  );
  await tx.wait();

  return {
    txHash: tx.hash,
    fullName: `${name}.base.eth`,
  };
}

/**
 * Save the name to the server
 */
export async function saveAgentName(agentId, name, txHash, registrant) {
  const res = await fetch(`/api/agents/${agentId}/set-name`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, txHash, registrant }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to save name' }));
    throw new Error(err.error);
  }
  return res.json();
}

export { MIN_COMMITMENT_AGE };
