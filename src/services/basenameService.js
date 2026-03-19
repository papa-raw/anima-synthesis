/**
 * Basename Service — ENS naming on Base via Basenames
 *
 * After capture, the catcher registers a .base.eth name for the agent.
 * Single register() call on UpgradeableRegistrarController.
 *
 * Active controller (Base mainnet): 0xa7d2607c6BD39Ae9521e514026CBB078405Ab322
 * Implementation: 0x9ad14968093c5e8c2a8cc86f6868cfee8c659717
 *
 * register struct: (name, owner, duration, resolver, data, reverseRecord, coinTypes, signatureExpiry, signature)
 * Cost: ~0.001 ETH for 5-9 char names, ~0.0001 ETH for 10+ chars
 */

const REGISTRAR_CONTROLLER = '0xa7d2607c6BD39Ae9521e514026CBB078405Ab322';
const L2_RESOLVER = '0xC6d566A56A1aFf6508b41f6c90ff131615583BCD';

// UpgradeableRegistrarController ABI — verified from on-chain selectors
const REGISTRAR_ABI = [
  'function available(string name) view returns (bool)',
  'function valid(string name) pure returns (bool)',
  'function registerPrice(string name, uint256 duration) view returns (uint256)',
  'function register(tuple(string name, address owner, uint256 duration, address resolver, bytes[] data, bool reverseRecord, uint256[] coinTypes, uint256 signatureExpiry, bytes signature) request) payable',
];

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
 * Register a Basename for the agent's wallet — single tx
 * @param {string} name - short name (without .base.eth)
 * @param {string} agentWallet - the agent's wallet address (owner of the name)
 * @returns {{ txHash, fullName }}
 */
export async function registerBasename(name, agentWallet) {
  const { ethers } = await import('ethers');
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const registrar = new ethers.Contract(REGISTRAR_CONTROLLER, REGISTRAR_ABI, signer);

  const YEAR = 365n * 24n * 60n * 60n;
  const price = await registrar.registerPrice(name, YEAR);
  const value = price + (price / 10n); // 10% buffer

  const request = {
    name,
    owner: agentWallet,
    duration: YEAR,
    resolver: L2_RESOLVER,
    data: [],
    reverseRecord: false,
    coinTypes: [],
    signatureExpiry: 0n,
    signature: '0x',
  };

  const tx = await registrar.register(request, { value });
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
