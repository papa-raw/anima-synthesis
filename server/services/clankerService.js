import { Clanker } from 'clanker-sdk/v4';
import { createPublicClient, createWalletClient, http, formatEther } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const RPC = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
const publicClient = createPublicClient({ chain: base, transport: http(RPC) });

// Load agent private keys from env lazily (NEVER from DB)
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

function getClankerForAgent(agentId) {
  const key = getAgentKey(agentId);
  if (!key) throw new Error(`No private key for ${agentId}. Set ${agentId.toUpperCase().replace(/-/g, '_')}_PRIVATE_KEY in .env`);
  const account = privateKeyToAccount(key);
  const wallet = createWalletClient({ account, chain: base, transport: http(RPC) });
  return { clanker: new Clanker({ wallet, publicClient }), account };
}

export async function deployToken(agentId, name, symbol, image = '') {
  const { clanker, account } = getClankerForAgent(agentId);
  try {
    const result = await clanker.deploy({
      name,
      symbol,
      image,
      pool: {
        quoteToken: '0x4200000000000000000000000000000000000006', // WETH on Base
        startingMarketCap: 0.1,
      },
      rewardsConfig: {
        creatorReward: 75,
        creatorAdmin: account.address,
        creatorRewardRecipient: account.address,
        interfaceAdmin: account.address,
        interfaceRewardRecipient: account.address,
      },
      context: { interface: 'Anima', platform: 'Synthesis Hackathon' },
    });
    if (result.error) throw new Error(JSON.stringify(result.error));
    const { txHash, waitForTransaction } = result;
    console.log(`Deploy tx sent: ${txHash}`);
    const { address } = await waitForTransaction();
    console.log(`Deployed ${symbol} at ${address}`);
    return address;
  } catch (e) {
    console.error(`Token deploy failed for ${agentId}:`, e.message);
    throw e;
  }
}

export async function getClaimableFees(agentId, tokenAddress) {
  try {
    const { clanker, account } = getClankerForAgent(agentId);
    const fees = await clanker.availableRewards({ token: tokenAddress, rewardRecipient: account.address });
    return parseFloat(formatEther(fees));
  } catch (e) {
    console.error(`Fee check failed for ${agentId}:`, e.message);
    return 0;
  }
}

export async function claimFees(agentId, tokenAddress) {
  try {
    const { clanker, account } = getClankerForAgent(agentId);
    const { txHash, error } = await clanker.claimRewards({ token: tokenAddress, rewardRecipient: account.address });
    if (error) throw new Error(JSON.stringify(error));
    console.log(`Claimed fees for ${agentId}: ${txHash}`);
    return txHash;
  } catch (e) {
    console.error(`Fee claim failed for ${agentId}:`, e.message);
    return null;
  }
}

export async function getEthBalance(walletAddress) {
  try {
    const balance = await publicClient.getBalance({ address: walletAddress });
    return parseFloat(formatEther(balance));
  } catch (e) {
    console.error(`Balance check failed:`, e.message);
    return 0;
  }
}

const WETH_ADDRESS = '0x4200000000000000000000000000000000000006';
const ERC20_BALANCE_ABI = [{
  inputs: [{ name: 'account', type: 'address' }],
  name: 'balanceOf',
  outputs: [{ name: '', type: 'uint256' }],
  stateMutability: 'view',
  type: 'function'
}];

export async function getWethBalance(walletAddress) {
  try {
    const raw = await publicClient.readContract({
      address: WETH_ADDRESS,
      abi: ERC20_BALANCE_ABI,
      functionName: 'balanceOf',
      args: [walletAddress]
    });
    return parseFloat(formatEther(raw));
  } catch (e) {
    console.error('WETH balance check failed:', e.message);
    return 0;
  }
}

export async function getTokenHolderCount(tokenAddress) {
  try {
    // Use BaseScan API (free tier, no key needed for basic queries)
    const res = await fetch(`https://base.blockscout.com/api/v2/tokens/${tokenAddress}`);
    if (!res.ok) return 0;
    const data = await res.json();
    return parseInt(data.holders_count || data.holders || data.holder_count || '0', 10);
  } catch {
    return 0;
  }
}

export async function getEthPrice() {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
    const data = await res.json();
    return data.ethereum.usd;
  } catch { return 2500; }
}
