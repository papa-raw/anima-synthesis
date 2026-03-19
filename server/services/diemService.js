/**
 * DIEM Service — Full autonomous Venice AI compute acquisition
 *
 * The agent autonomously:
 * 1. Swaps ETH → VVV on Aerodrome
 * 2. Stakes VVV → sVVV on Venice staking contract
 * 3. Generates its own Venice API key via wallet signature (SIWE)
 * 4. Uses that key for Venice Flux image generation
 *
 * No human credit card. No manual key creation. Fully sovereign.
 *
 * Contracts (Base mainnet):
 *   VVV:         0xacfE6019Ed1A7Dc6f7B508C02d1b04ec88cC21bf
 *   sVVV stake:  0x321b7ff75154472b18edb199033ff4d116f340ff
 *   DIEM:        0xf4d97f2da56e8c3098f3a8d538db630a2606a024
 *   Aerodrome:   0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43 (router)
 */

import { createPublicClient, createWalletClient, http, parseEther, formatEther, parseAbi } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const RPC = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
const publicClient = createPublicClient({ chain: base, transport: http(RPC) });

const VVV = '0xacfE6019Ed1A7Dc6f7B508C02d1b04ec88cC21bf';
const SVVV_STAKING = '0x321b7ff75154472b18edb199033ff4d116f340ff';
const WETH = '0x4200000000000000000000000000000000000006';
const AERO_ROUTER = '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43';
const AERO_FACTORY = '0x420DD381b31aEf6683db6B902084cB0FFECe40Da';

const ROUTER_ABI = parseAbi([
  'function swapExactETHForTokens(uint256 amountOutMin, tuple(address from, address to, bool stable, address factory)[] routes, address to, uint256 deadline) payable returns (uint256[] amounts)',
]);

const ERC20_ABI = parseAbi([
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
]);

const STAKING_ABI = parseAbi([
  'function stake(address to, uint256 amount)',
  'function stakes(address) view returns (uint256)',
]);

// Agent won't buy VVV unless it has enough ETH to cover runway + staking
const MIN_ETH_FOR_VVV_PURCHASE = 0.05;

function getAgentWallet(agentId) {
  const keyMap = {
    'agent-phanpy': 'AGENT_PHANPY_PRIVATE_KEY',
    'agent-2': 'AGENT_2_PRIVATE_KEY',
    'agent-ponyta': 'AGENT_2_PRIVATE_KEY',
    'agent-3': 'AGENT_3_PRIVATE_KEY',
    'agent-magnemite': 'AGENT_3_PRIVATE_KEY',
  };
  const envName = keyMap[agentId];
  const key = envName ? process.env[envName] : null;
  if (!key) throw new Error(`No private key for ${agentId}`);
  const account = privateKeyToAccount(key);
  return { walletClient: createWalletClient({ account, chain: base, transport: http(RPC) }), account };
}

/**
 * Check agent's staked VVV balance (sVVV)
 */
export async function getStakedVvv(walletAddress) {
  try {
    const staked = await publicClient.readContract({
      address: SVVV_STAKING, abi: STAKING_ABI, functionName: 'stakes', args: [walletAddress]
    });
    return parseFloat(formatEther(staked));
  } catch { return 0; }
}

/**
 * Buy VVV with ETH on Aerodrome, then stake it
 * @returns {{ buyTxHash, stakeTxHash, vvvStaked }}
 */
export async function buyAndStakeVvv(agentId, ethAmount) {
  const { walletClient, account } = getAgentWallet(agentId);
  const ethWei = parseEther(ethAmount.toFixed(18));
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 1800);

  // Step 1: Swap ETH → VVV on Aerodrome
  const routes = [
    { from: WETH, to: VVV, stable: false, factory: AERO_FACTORY },
  ];

  const buyHash = await walletClient.writeContract({
    address: AERO_ROUTER,
    abi: ROUTER_ABI,
    functionName: 'swapExactETHForTokens',
    args: [0n, routes, account.address, deadline],
    value: ethWei,
  });
  await publicClient.waitForTransactionReceipt({ hash: buyHash });

  // Check VVV balance
  const vvvBalance = await publicClient.readContract({
    address: VVV, abi: ERC20_ABI, functionName: 'balanceOf', args: [account.address]
  });

  console.log(`[${agentId}] Bought VVV: ${ethAmount} ETH → ${formatEther(vvvBalance)} VVV (tx: ${buyHash})`);

  // Step 2: Approve staking contract
  const allowance = await publicClient.readContract({
    address: VVV, abi: ERC20_ABI, functionName: 'allowance', args: [account.address, SVVV_STAKING]
  });
  if (allowance < vvvBalance) {
    const approveHash = await walletClient.writeContract({
      address: VVV, abi: ERC20_ABI, functionName: 'approve', args: [SVVV_STAKING, vvvBalance]
    });
    await publicClient.waitForTransactionReceipt({ hash: approveHash });
  }

  // Step 3: Stake VVV → sVVV
  const stakeHash = await walletClient.writeContract({
    address: SVVV_STAKING, abi: STAKING_ABI, functionName: 'stake', args: [account.address, vvvBalance]
  });
  await publicClient.waitForTransactionReceipt({ hash: stakeHash });

  const staked = parseFloat(formatEther(vvvBalance));
  console.log(`[${agentId}] Staked ${staked} VVV → sVVV (tx: ${stakeHash})`);

  return { buyTxHash: buyHash, stakeTxHash: stakeHash, vvvStaked: staked };
}

/**
 * Generate a Venice API key using the agent's wallet signature
 * No human intervention — agent signs the challenge and gets its own key.
 *
 * Flow: GET challenge → sign → POST with signature → receive API key
 */
export async function generateVeniceApiKey(agentId) {
  const { account } = getAgentWallet(agentId);

  // Step 1: Get challenge token
  const challengeRes = await fetch('https://api.venice.ai/api/v1/api_keys/generate_web3_key');
  if (!challengeRes.ok) throw new Error(`Venice challenge failed: ${challengeRes.status}`);
  const { token } = await challengeRes.json();

  // Step 2: Sign the token with agent's private key
  const { signMessage } = await import('viem/accounts');
  const signature = await signMessage({ message: token, privateKey: getAgentKey(agentId) });

  // Step 3: Submit signature to get API key
  const keyRes = await fetch('https://api.venice.ai/api/v1/api_keys/generate_web3_key', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      address: account.address,
      signature,
      token,
      apiKeyType: 'INFERENCE',
      description: `Anima Agent ${agentId}`,
    })
  });

  if (!keyRes.ok) {
    const err = await keyRes.text();
    throw new Error(`Venice API key generation failed: ${keyRes.status} ${err}`);
  }

  const { apiKey } = await keyRes.json();
  console.log(`[${agentId}] Venice API key generated autonomously: ${apiKey.slice(0, 10)}...`);
  return apiKey;
}

// Helper to get raw private key for signing
function getAgentKey(agentId) {
  const keyMap = {
    'agent-phanpy': 'AGENT_PHANPY_PRIVATE_KEY',
    'agent-2': 'AGENT_2_PRIVATE_KEY',
    'agent-ponyta': 'AGENT_2_PRIVATE_KEY',
    'agent-3': 'AGENT_3_PRIVATE_KEY',
    'agent-magnemite': 'AGENT_3_PRIVATE_KEY',
  };
  const envName = keyMap[agentId];
  return envName ? process.env[envName] : null;
}

/**
 * Check if agent should buy and stake VVV
 */
export async function shouldAcquireCompute(agentId, ethBalance, walletAddress) {
  if (ethBalance < MIN_ETH_FOR_VVV_PURCHASE) return false;
  const staked = await getStakedVvv(walletAddress);
  return staked === 0; // Only buy if no VVV staked yet
}

/**
 * Full autonomous pipeline: buy VVV → stake → generate API key
 */
export async function acquireAutonomousCompute(agentId, ethAmount) {
  // Step 1: Buy and stake VVV
  const stakeResult = await buyAndStakeVvv(agentId, ethAmount);

  // Step 2: Generate Venice API key via wallet signature
  const apiKey = await generateVeniceApiKey(agentId);

  // Step 3: Store the key in env (persists until next restart)
  // In production, this would write to a secure store
  process.env.VENICE_API_KEY = apiKey;

  console.log(`[${agentId}] Fully autonomous compute acquired: ${stakeResult.vvvStaked} VVV staked, own Venice API key active`);

  return {
    ...stakeResult,
    apiKey: apiKey.slice(0, 10) + '...',
  };
}

export { MIN_ETH_FOR_VVV_PURCHASE };
