/**
 * Auction Service — AnimaAuction contract on Base
 *
 * Our own verified auction contract. SuperRare Bazaar settlement is broken on Base
 * (stakingRegistry=0x0 in their deployment, delegatecall payment path fails).
 * We deployed the full SuperRare stack AND our own minimal contract. Using AnimaAuction
 * because it actually works for settlement.
 *
 * AnimaAuction: 0xbe2DFd20300Be5CFa009e13C4AE8e3ed0bC16Ff1 (verified on BaseScan)
 * Source: contracts/AnimaAuction.sol
 */

import { createPublicClient, createWalletClient, http, parseEther, formatEther } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const RPC = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
const publicClient = createPublicClient({ chain: base, transport: http(RPC) });

const AUCTION_ADDRESS = '0xbe2DFd20300Be5CFa009e13C4AE8e3ed0bC16Ff1';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

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

const NFT_ABI = [
  { inputs: [{ name: 'operator', type: 'address' }, { name: 'approved', type: 'bool' }], name: 'setApprovalForAll', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ name: 'owner', type: 'address' }, { name: 'operator', type: 'address' }], name: 'isApprovedForAll', outputs: [{ name: '', type: 'bool' }], stateMutability: 'view', type: 'function' }
];

const AUCTION_ABI = [
  { inputs: [{ name: 'nft', type: 'address' }, { name: 'tokenId', type: 'uint256' }, { name: 'minBid', type: 'uint256' }, { name: 'duration', type: 'uint256' }], name: 'createAuction', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ name: 'nft', type: 'address' }, { name: 'tokenId', type: 'uint256' }], name: 'bid', outputs: [], stateMutability: 'payable', type: 'function' },
  { inputs: [{ name: 'nft', type: 'address' }, { name: 'tokenId', type: 'uint256' }], name: 'settle', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ name: 'nft', type: 'address' }, { name: 'tokenId', type: 'uint256' }], name: 'cancel', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  {
    inputs: [{ name: '', type: 'address' }, { name: '', type: 'uint256' }],
    name: 'auctions',
    outputs: [
      { name: 'seller', type: 'address' },
      { name: 'minBid', type: 'uint256' },
      { name: 'duration', type: 'uint256' },
      { name: 'startTime', type: 'uint256' },
      { name: 'endTime', type: 'uint256' },
      { name: 'highBidder', type: 'address' },
      { name: 'highBid', type: 'uint256' },
      { name: 'settled', type: 'bool' }
    ],
    stateMutability: 'view',
    type: 'function'
  }
];

/**
 * Ensure AnimaAuction has approval to transfer agent's NFTs
 */
export async function ensureBazaarApproval(agentId, nftContract) {
  const { walletClient, account } = getWalletClient(agentId);
  const isApproved = await publicClient.readContract({
    address: nftContract, abi: NFT_ABI, functionName: 'isApprovedForAll',
    args: [account.address, AUCTION_ADDRESS]
  });
  if (isApproved) {
    console.log(`[${agentId}] AnimaAuction already approved for ${nftContract}`);
    return null;
  }
  const hash = await walletClient.writeContract({
    address: nftContract, abi: NFT_ABI, functionName: 'setApprovalForAll',
    args: [AUCTION_ADDRESS, true]
  });
  await publicClient.waitForTransactionReceipt({ hash });
  console.log(`[${agentId}] AnimaAuction approval set: ${hash}`);
  return hash;
}

/**
 * Create a reserve auction
 */
export async function createAuction(agentId, nftContract, tokenId, opts = {}) {
  const { walletClient } = getWalletClient(agentId);
  const duration = opts.durationSeconds || 3600;
  // Min bid = LP deepening minimum (0.0002 ETH) + 50% buffer for gas/slippage
  const minBid = parseEther(opts.startingPriceEth || '0.0003');

  const hash = await walletClient.writeContract({
    address: AUCTION_ADDRESS,
    abi: AUCTION_ABI,
    functionName: 'createAuction',
    args: [nftContract, BigInt(tokenId), minBid, BigInt(duration)]
  });
  await publicClient.waitForTransactionReceipt({ hash });
  console.log(`[${agentId}] Auction created for NFT #${tokenId}: ${hash} (${duration}s)`);
  return hash;
}

/**
 * Get current auction state
 */
export async function getAuctionState(nftContract, tokenId) {
  try {
    const result = await publicClient.readContract({
      address: AUCTION_ADDRESS,
      abi: AUCTION_ABI,
      functionName: 'auctions',
      args: [nftContract, BigInt(tokenId)]
    });

    const [seller, minBid, duration, startTime, endTime, highBidder, highBid, settled] = result;

    if (seller === ZERO_ADDRESS) return { status: 'none', active: false };
    if (settled) return { status: 'settled', active: false };

    const now = Math.floor(Date.now() / 1000);
    const startTimeNum = Number(startTime);
    const endTimeNum = Number(endTime);
    const hasBid = highBidder !== ZERO_ADDRESS;
    const isReserve = startTimeNum === 0;
    const hasEnded = endTimeNum > 0 && now >= endTimeNum;

    let status;
    if (isReserve && !hasBid) status = 'reserve';
    else if (hasEnded && hasBid) status = 'ended';
    else if (hasEnded && !hasBid) status = 'expired';
    else status = 'live';

    return {
      status,
      active: true,
      isReserve,
      endsAt: endTimeNum || null,
      currentBid: formatEther(highBid),
      currentBidder: hasBid ? highBidder : null,
      minBid: formatEther(minBid),
      creator: seller
    };
  } catch (e) {
    console.error(`Auction state check failed for ${nftContract}#${tokenId}:`, e.message);
    return { status: 'none', active: false };
  }
}

/**
 * Settle a completed auction
 */
export async function settleAuction(agentId, nftContract, tokenId) {
  const { walletClient } = getWalletClient(agentId);
  const hash = await walletClient.writeContract({
    address: AUCTION_ADDRESS,
    abi: AUCTION_ABI,
    functionName: 'settle',
    args: [nftContract, BigInt(tokenId)]
  });
  await publicClient.waitForTransactionReceipt({ hash });
  console.log(`[${agentId}] Auction settled for NFT #${tokenId}: ${hash}`);
  return hash;
}
