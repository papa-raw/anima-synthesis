/**
 * Auction Service — Direct Bazaar (SuperRare) contract calls via viem
 *
 * Replaces `rare CLI` auction commands with reliable contract interactions.
 * Agent creates 1-hour reserve auctions for its memory art NFTs.
 */

import { createPublicClient, createWalletClient, http, parseEther, formatEther, encodePacked } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const RPC = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
const publicClient = createPublicClient({ chain: base, transport: http(RPC) });

// Our deployed Bazaar with working staking registry (old one at 0x51c36... had stakingRegistry=0x0)
const BAZAAR_ADDRESS = '0x4F3832471190049CEf76a6FFDf56FDbD88672949';
const COLDIE_AUCTION = '0x434f4c4449455f41554354494f4e000000000000000000000000000000000000';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const WETH_BASE = '0x4200000000000000000000000000000000000006';

// Load agent private keys from env (same pattern as clankerService)
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

// NFT contract ABI fragments
const NFT_ABI = [
  {
    inputs: [{ name: 'operator', type: 'address' }, { name: 'approved', type: 'bool' }],
    name: 'setApprovalForAll',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ name: 'owner', type: 'address' }, { name: 'operator', type: 'address' }],
    name: 'isApprovedForAll',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function'
  }
];

// Bazaar contract ABI fragments
// IMPORTANT: getAuctionDetails returns config only, NOT bid state.
// Bid state comes from currentBidDetailsOfToken (separate call).
// Verified working ABI from server/index.js (tested against live Bazaar contract).
const BAZAAR_ABI = [
  {
    inputs: [
      { name: '_auctionType', type: 'bytes32' },
      { name: '_originContract', type: 'address' },
      { name: '_tokenId', type: 'uint256' },
      { name: '_startingAmount', type: 'uint256' },
      { name: '_currencyAddress', type: 'address' },
      { name: '_lengthOfAuction', type: 'uint256' },
      { name: '_startTime', type: 'uint256' },
      { name: '_splitAddresses', type: 'address[]' },
      { name: '_splitRatios', type: 'uint8[]' }
    ],
    name: 'configureAuction',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { name: '_originContract', type: 'address' },
      { name: '_tokenId', type: 'uint256' }
    ],
    name: 'settleAuction',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { name: '_originContract', type: 'address' },
      { name: '_tokenId', type: 'uint256' }
    ],
    name: 'getAuctionDetails',
    outputs: [
      { name: 'auctionCreator', type: 'address' },
      { name: 'creationBlock', type: 'uint256' },
      { name: 'startTime', type: 'uint256' },
      { name: 'lengthOfAuction', type: 'uint256' },
      { name: 'currencyAddress', type: 'address' },
      { name: 'minimumBid', type: 'uint256' },
      { name: 'auctionType', type: 'bytes32' },
      { name: 'splitAddresses', type: 'address[]' },
      { name: 'splitRatios', type: 'uint8[]' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { name: '_originContract', type: 'address' },
      { name: '_tokenId', type: 'uint256' }
    ],
    name: 'auctionBids',
    outputs: [
      { name: 'bidder', type: 'address' },
      { name: 'currencyAddress', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'marketplaceFee', type: 'uint8' }
    ],
    stateMutability: 'view',
    type: 'function'
  }
];

/**
 * Ensure Bazaar has approval to transfer agent's NFTs
 */
export async function ensureBazaarApproval(agentId, nftContract) {
  const { walletClient, account } = getWalletClient(agentId);

  // Check if already approved
  const isApproved = await publicClient.readContract({
    address: nftContract,
    abi: NFT_ABI,
    functionName: 'isApprovedForAll',
    args: [account.address, BAZAAR_ADDRESS]
  });

  if (isApproved) {
    console.log(`[${agentId}] Bazaar already approved for ${nftContract}`);
    return null;
  }

  const hash = await walletClient.writeContract({
    address: nftContract,
    abi: NFT_ABI,
    functionName: 'setApprovalForAll',
    args: [BAZAAR_ADDRESS, true]
  });

  await publicClient.waitForTransactionReceipt({ hash });
  console.log(`[${agentId}] Bazaar approval set: ${hash}`);
  return hash;
}

/**
 * Create a reserve auction on Bazaar
 * @param {string} agentId
 * @param {string} nftContract
 * @param {string|number} tokenId
 * @param {object} opts - { durationSeconds: 3600, startingPriceEth: '0.0001' }
 */
export async function createAuction(agentId, nftContract, tokenId, opts = {}) {
  const { walletClient, account } = getWalletClient(agentId);
  const duration = opts.durationSeconds || 3600;
  const startingPrice = parseEther(opts.startingPriceEth || '0.0001');

  const hash = await walletClient.writeContract({
    address: BAZAAR_ADDRESS,
    abi: BAZAAR_ABI,
    functionName: 'configureAuction',
    args: [
      COLDIE_AUCTION,
      nftContract,
      BigInt(tokenId),
      startingPrice,
      ZERO_ADDRESS, // Native ETH — Bazaar on Base only supports ETH, not WETH
      BigInt(duration),
      0n, // startTime = 0 → reserve auction (clock starts on first bid)
      [account.address], // 100% to agent
      [100]
    ]
  });

  await publicClient.waitForTransactionReceipt({ hash });
  console.log(`[${agentId}] Auction created for NFT #${tokenId}: ${hash} (${duration}s)`);
  return hash;
}

/**
 * Get current auction state from Bazaar
 * Uses two calls: getAuctionDetails (config) + currentBidDetailsOfToken (bid state)
 */
export async function getAuctionState(nftContract, tokenId) {
  try {
    const tokenIdBig = BigInt(tokenId);

    // Call 1: Auction config
    const details = await publicClient.readContract({
      address: BAZAAR_ADDRESS,
      abi: BAZAAR_ABI,
      functionName: 'getAuctionDetails',
      args: [nftContract, tokenIdBig]
    });

    const [auctionCreator, , startTime, lengthOfAuction, , minimumBid] = details;

    // No auction exists if creator is zero address
    if (auctionCreator === ZERO_ADDRESS) {
      return { status: 'none', active: false };
    }

    // Call 2: Current bid state via auctionBids (returns bidder, currency, amount, fee)
    let currentBidAmount = 0n;
    let currentBidder = ZERO_ADDRESS;
    try {
      const bidDetails = await publicClient.readContract({
        address: BAZAAR_ADDRESS,
        abi: BAZAAR_ABI,
        functionName: 'auctionBids',
        args: [nftContract, tokenIdBig]
      });
      currentBidder = bidDetails[0];   // address bidder
      currentBidAmount = bidDetails[2]; // uint256 amount
    } catch { /* no bid yet */ }

    const startTimeNum = Number(startTime);
    const durationNum = Number(lengthOfAuction);
    const endsAt = startTimeNum > 0 ? startTimeNum + durationNum : 0;
    const now = Math.floor(Date.now() / 1000);
    const hasEnded = endsAt > 0 && now >= endsAt;
    const hasBid = currentBidder !== ZERO_ADDRESS;
    const isReserve = startTimeNum === 0; // reserve = configured but clock hasn't started (no bids yet)

    let status;
    if (isReserve && !hasBid) status = 'reserve';
    else if (hasEnded && hasBid) status = 'ended';
    else if (hasEnded && !hasBid) status = 'expired';
    else status = 'live';

    return {
      status,
      active: true,
      isReserve,
      endsAt,
      currentBid: formatEther(currentBidAmount),
      currentBidder: hasBid ? currentBidder : null,
      minBid: formatEther(minimumBid),
      creator: auctionCreator
    };
  } catch (e) {
    console.error(`Auction state check failed for ${nftContract}#${tokenId}:`, e.message);
    return { status: 'none', active: false };
  }
}

/**
 * Settle a completed auction — transfers NFT to winner, ETH to agent
 */
export async function settleAuction(agentId, nftContract, tokenId) {
  const { walletClient } = getWalletClient(agentId);

  const hash = await walletClient.writeContract({
    address: BAZAAR_ADDRESS,
    abi: BAZAAR_ABI,
    functionName: 'settleAuction',
    args: [nftContract, BigInt(tokenId)]
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`[${agentId}] Auction settled for NFT #${tokenId}: ${hash}`);
  return hash;
}
