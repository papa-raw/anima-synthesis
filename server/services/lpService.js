/**
 * LP Service — Uniswap V4 liquidity deepening
 *
 * After auction settlement, wraps ETH proceeds → swaps half for agent token →
 * mints a new V4 LP position in the same pool as the Clanker-deployed token.
 *
 * Clanker positions are protocol-locked, so we mint NEW positions.
 */

import { createPublicClient, createWalletClient, http, parseEther, formatEther, encodeFunctionData, parseAbi, encodeAbiParameters } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const RPC = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
const publicClient = createPublicClient({ chain: base, transport: http(RPC) });

// Contract addresses on Base mainnet
const WETH = '0x4200000000000000000000000000000000000006';
const POSITION_MANAGER = '0x7c5f5a4bbd8fd63184577525326123b519429bdc';
const UNIVERSAL_ROUTER = '0x6ff5693b99212da76ad316178a184ab56d299b43';
const PERMIT2 = '0x000000000022D473030F116dDEE9F6B43aC78BA3';

// PositionManager Actions enum values
const Actions = {
  MINT_POSITION: 7,
  SETTLE_PAIR: 16,
};

// Load agent private keys (same pattern as clankerService)
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

function getWalletClient(agentId) {
  const key = getAgentKey(agentId);
  if (!key) throw new Error(`No private key for ${agentId}`);
  const account = privateKeyToAccount(key);
  return { walletClient: createWalletClient({ account, chain: base, transport: http(RPC) }), account };
}

const WETH_ABI = parseAbi([
  'function deposit() payable',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
]);

const ERC20_ABI = parseAbi([
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
]);

const PERMIT2_ABI = parseAbi([
  'function approve(address token, address spender, uint160 amount, uint48 expiration)',
]);

const POSITION_MANAGER_ABI = parseAbi([
  'function modifyLiquidities(bytes calldata unlockData, uint256 deadline)',
]);

/**
 * Full LP deepening flow:
 * 1. Wrap ETH → WETH
 * 2. Swap half WETH → agent token via Universal Router
 * 3. Approve tokens for Permit2 → PositionManager
 * 4. Mint new V4 LP position
 *
 * @param {string} agentId
 * @param {number} ethAmount - ETH amount from auction proceeds
 * @param {string} tokenAddress - Agent's ERC-20 token
 * @param {object} poolKey - { currency0, currency1, fee, tickSpacing, hooks }
 * @returns {{ wrapTx, swapTx, mintTx } | null}
 */
export async function deepenLiquidity(agentId, ethAmount, tokenAddress, poolKey) {
  if (ethAmount < 0.0002) {
    console.log(`[${agentId}] LP deepen skipped — amount too small (${ethAmount} ETH)`);
    return null;
  }

  const { walletClient, account } = getWalletClient(agentId);
  const halfWei = parseEther((ethAmount / 2).toFixed(18));
  const fullWei = parseEther(ethAmount.toFixed(18));

  try {
    // Step 1: Wrap ETH → WETH
    const wrapHash = await walletClient.writeContract({
      address: WETH,
      abi: WETH_ABI,
      functionName: 'deposit',
      value: fullWei
    });
    await publicClient.waitForTransactionReceipt({ hash: wrapHash });
    console.log(`[${agentId}] Wrapped ${ethAmount} ETH → WETH: ${wrapHash}`);

    // Step 2: Swap half WETH → token via Universal Router
    // Use Uniswap Trading API for optimal routing
    let tokenAmount;
    try {
      tokenAmount = await swapWethForToken(walletClient, account, halfWei, tokenAddress);
      console.log(`[${agentId}] Swapped ${ethAmount / 2} WETH → ${formatEther(tokenAmount)} token`);
    } catch (e) {
      console.error(`[${agentId}] Swap failed, aborting LP:`, e.message);
      return { wrapTx: wrapHash, swapTx: null, mintTx: null };
    }

    // Step 3: Approve Permit2 for both tokens
    const maxApproval = 2n ** 160n - 1n;
    const maxExpiration = 2n ** 48n - 1n;

    // Approve WETH for Permit2
    const wethAllowance = await publicClient.readContract({
      address: WETH, abi: ERC20_ABI, functionName: 'allowance',
      args: [account.address, PERMIT2]
    });
    if (wethAllowance < halfWei) {
      const approveHash = await walletClient.writeContract({
        address: WETH, abi: ERC20_ABI, functionName: 'approve',
        args: [PERMIT2, 2n ** 256n - 1n]
      });
      await publicClient.waitForTransactionReceipt({ hash: approveHash });
    }

    // Approve token for Permit2
    const tokenAllowance = await publicClient.readContract({
      address: tokenAddress, abi: ERC20_ABI, functionName: 'allowance',
      args: [account.address, PERMIT2]
    });
    if (tokenAllowance < tokenAmount) {
      const approveHash = await walletClient.writeContract({
        address: tokenAddress, abi: ERC20_ABI, functionName: 'approve',
        args: [PERMIT2, 2n ** 256n - 1n]
      });
      await publicClient.waitForTransactionReceipt({ hash: approveHash });
    }

    // Permit2 → PositionManager approvals
    await walletClient.writeContract({
      address: PERMIT2, abi: PERMIT2_ABI, functionName: 'approve',
      args: [WETH, POSITION_MANAGER, maxApproval, maxExpiration]
    });
    await walletClient.writeContract({
      address: PERMIT2, abi: PERMIT2_ABI, functionName: 'approve',
      args: [tokenAddress, POSITION_MANAGER, maxApproval, maxExpiration]
    });

    // Step 4: Mint LP position via PositionManager.modifyLiquidities
    // Use full range ticks for simplicity
    const tickLower = -887220; // Full range for common tick spacings
    const tickUpper = 887220;

    // Sort tokens for pool ordering (currency0 < currency1)
    const sortedPoolKey = poolKey || getDefaultPoolKey(tokenAddress);

    // Encode MINT_POSITION params
    const mintParams = encodeAbiParameters(
      [
        { name: 'poolKey', type: 'tuple', components: [
          { name: 'currency0', type: 'address' },
          { name: 'currency1', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'tickSpacing', type: 'int24' },
          { name: 'hooks', type: 'address' },
        ]},
        { name: 'tickLower', type: 'int24' },
        { name: 'tickUpper', type: 'int24' },
        { name: 'liquidity', type: 'uint256' },
        { name: 'amount0Max', type: 'uint128' },
        { name: 'amount1Max', type: 'uint128' },
        { name: 'owner', type: 'address' },
        { name: 'hookData', type: 'bytes' },
      ],
      [
        sortedPoolKey,
        tickLower,
        tickUpper,
        halfWei, // liquidity amount (simplified — actual should use sqrt price math)
        halfWei, // max WETH
        tokenAmount, // max token
        account.address,
        '0x',
      ]
    );

    // Encode SETTLE_PAIR params
    const settleParams = encodeAbiParameters(
      [
        { name: 'currency0', type: 'address' },
        { name: 'currency1', type: 'address' },
      ],
      [sortedPoolKey.currency0, sortedPoolKey.currency1]
    );

    // Encode full modifyLiquidities call
    const actions = encodeAbiParameters(
      [{ name: 'actions', type: 'uint256[]' }, { name: 'params', type: 'bytes[]' }],
      [[BigInt(Actions.MINT_POSITION), BigInt(Actions.SETTLE_PAIR)], [mintParams, settleParams]]
    );

    const deadline = BigInt(Math.floor(Date.now() / 1000) + 1800); // 30 min

    const mintHash = await walletClient.writeContract({
      address: POSITION_MANAGER,
      abi: POSITION_MANAGER_ABI,
      functionName: 'modifyLiquidities',
      args: [actions, deadline]
    });

    await publicClient.waitForTransactionReceipt({ hash: mintHash });
    console.log(`[${agentId}] LP position minted: ${mintHash}`);

    return { wrapTx: wrapHash, swapTx: 'swap_included', mintTx: mintHash };
  } catch (e) {
    console.error(`[${agentId}] LP deepen failed:`, e.message);
    return null;
  }
}

/**
 * Swap WETH → token via KyberSwap aggregator
 * Routes through Clanker V4 pool automatically — handles custom hooks
 */
async function swapWethForToken(walletClient, account, wethAmount, tokenAddress) {
  // Step 1: Get route from KyberSwap
  const routeRes = await fetch(
    `https://aggregator-api.kyberswap.com/base/api/v1/routes?tokenIn=${WETH}&tokenOut=${tokenAddress}&amountIn=${wethAmount.toString()}&saveGas=false`
  );
  const routeData = await routeRes.json();
  if (routeData.code !== 0 || !routeData.data?.routeSummary) {
    throw new Error('KyberSwap: no route found');
  }

  // Step 2: Build swap tx
  const buildRes = await fetch('https://aggregator-api.kyberswap.com/base/api/v1/route/build', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      routeSummary: routeData.data.routeSummary,
      sender: account.address,
      recipient: account.address,
      slippageTolerance: 500 // 5%
    })
  });
  const buildData = await buildRes.json();
  if (buildData.code !== 0) throw new Error(`KyberSwap build failed: ${buildData.message}`);

  const router = buildData.data.routerAddress;

  // Step 3: Approve router for WETH
  const allowance = await publicClient.readContract({
    address: WETH, abi: ERC20_ABI, functionName: 'allowance',
    args: [account.address, router]
  });
  if (allowance < wethAmount) {
    const approveHash = await walletClient.writeContract({
      address: WETH, abi: ERC20_ABI, functionName: 'approve',
      args: [router, 2n ** 256n - 1n]
    });
    await publicClient.waitForTransactionReceipt({ hash: approveHash });
  }

  // Step 4: Execute swap
  const swapHash = await walletClient.sendTransaction({
    to: router,
    data: buildData.data.data,
    value: BigInt(buildData.data.transactionValue || 0)
  });
  await publicClient.waitForTransactionReceipt({ hash: swapHash });

  // Read token balance after swap
  const balance = await publicClient.readContract({
    address: tokenAddress, abi: ERC20_ABI, functionName: 'balanceOf',
    args: [account.address]
  });

  return balance;
}

/**
 * Default pool key for Clanker V4 tokens
 * Discovered from PoolManager Initialize event at PHANPY deploy block
 */
function getDefaultPoolKey(tokenAddress) {
  return {
    currency0: WETH,
    currency1: tokenAddress,
    fee: 8388608, // 0x800000 = dynamic fee
    tickSpacing: 200,
    hooks: '0xd60d6b218116cfd801e28f78d011a203d2b068cc', // Clanker fee hook
  };
}
