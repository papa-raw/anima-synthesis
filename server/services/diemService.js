/**
 * DIEM Service — Venice AI compute token on Base
 *
 * DIEM gives autonomous agents their own AI inference budget.
 * 1 staked DIEM = $1/day of Venice API credits (text + image), renewing forever.
 *
 * Flow: Agent ETH → WETH → VVV (Aerodrome) → DIEM (Aerodrome) → Stake → Venice credits
 *
 * Contracts (Base mainnet):
 *   DIEM:       0xf4d97f2da56e8c3098f3a8d538db630a2606a024
 *   VVV:        0xacfE6019Ed1A7Dc6f7B508C02d1b04ec88cC21bf
 *   VVV/WETH:   0x01784ef301d79e4b2df3a21ad9a536d4cf09a5ce (Aerodrome basic)
 *   VVV/DIEM:   0xbb345d35450bf9ee76f3d2ce214e8e7ac5e1071d (Aerodrome basic)
 *
 * Min: 0.1 DIEM (~0.034 ETH at current prices) for $0.10/day of credits
 * Image cost: ~$0.03-0.10/image (Flux) → 0.1 DIEM covers 1-3 images/day
 */

import { createPublicClient, createWalletClient, http, parseEther, formatEther, parseAbi } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const RPC = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
const publicClient = createPublicClient({ chain: base, transport: http(RPC) });

const DIEM = '0xf4d97f2da56e8c3098f3a8d538db630a2606a024';
const VVV = '0xacfE6019Ed1A7Dc6f7B508C02d1b04ec88cC21bf';
const WETH = '0x4200000000000000000000000000000000000006';

// Aerodrome Router v2 on Base
const AERO_ROUTER = '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43';

const ROUTER_ABI = parseAbi([
  'function swapExactETHForTokens(uint256 amountOutMin, tuple(address from, address to, bool stable, address factory)[] routes, address to, uint256 deadline) payable returns (uint256[] amounts)',
]);

const ERC20_ABI = parseAbi([
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
]);

// Aerodrome default factory
const AERO_FACTORY = '0x420DD381b31aEf6683db6B902084cB0FFECe40Da';

// Min DIEM threshold: 0.1 DIEM gives $0.10/day = enough for ~1-3 Flux images
const MIN_DIEM_STAKE = parseEther('0.1');
// Agent won't buy DIEM unless it has enough ETH to cover runway + DIEM purchase
const MIN_ETH_FOR_DIEM_PURCHASE = 0.05; // ~$125 — enough for 30+ days runway AND DIEM

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
 * Check agent's DIEM balance
 */
export async function getDiemBalance(walletAddress) {
  try {
    const balance = await publicClient.readContract({
      address: DIEM, abi: ERC20_ABI, functionName: 'balanceOf', args: [walletAddress]
    });
    return parseFloat(formatEther(balance));
  } catch { return 0; }
}

/**
 * Buy DIEM with agent's ETH via Aerodrome
 * Route: ETH → WETH → VVV → DIEM (2-hop swap)
 *
 * @param {string} agentId
 * @param {number} ethAmount - ETH to spend on DIEM
 * @returns {{ txHash, diemReceived } | null}
 */
export async function buyDiem(agentId, ethAmount) {
  const key = getAgentKey(agentId);
  if (!key) throw new Error(`No private key for ${agentId}`);

  const account = privateKeyToAccount(key);
  const walletClient = createWalletClient({ account, chain: base, transport: http(RPC) });

  const ethWei = parseEther(ethAmount.toFixed(18));
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 1800);

  // 2-hop route: WETH → VVV → DIEM via Aerodrome basic pools
  const routes = [
    { from: WETH, to: VVV, stable: false, factory: AERO_FACTORY },
    { from: VVV, to: DIEM, stable: false, factory: AERO_FACTORY },
  ];

  const hash = await walletClient.writeContract({
    address: AERO_ROUTER,
    abi: ROUTER_ABI,
    functionName: 'swapExactETHForTokens',
    args: [0n, routes, account.address, deadline], // 0 min out (hackathon)
    value: ethWei,
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  // Check DIEM balance after swap
  const diemBalance = await getDiemBalance(account.address);

  console.log(`[${agentId}] Bought DIEM: ${ethAmount} ETH → ${diemBalance.toFixed(6)} DIEM (tx: ${hash})`);

  return { txHash: hash, diemReceived: diemBalance };
}

/**
 * Check if agent should buy DIEM (has enough ETH and no DIEM yet)
 */
export async function shouldBuyDiem(agentId, ethBalance, walletAddress) {
  if (ethBalance < MIN_ETH_FOR_DIEM_PURCHASE) return false;
  const diemBalance = await getDiemBalance(walletAddress);
  return diemBalance < parseFloat(formatEther(MIN_DIEM_STAKE));
}

export { MIN_DIEM_STAKE, MIN_ETH_FOR_DIEM_PURCHASE };
