import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

const BEEZIE_CONTRACT = '0xbb5ec6fd4b61723bd45c399840f1d868840ca16f';
const RPC = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
const publicClient = createPublicClient({ chain: base, transport: http(RPC) });

const ERC721_ABI = [
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  }
];

export async function verifyMatchingCard(walletAddress, elementType, claimedTokenId) {
  try {
    // 1. Verify wallet owns the claimed tokenId
    const owner = await publicClient.readContract({
      address: BEEZIE_CONTRACT,
      abi: ERC721_ABI,
      functionName: 'ownerOf',
      args: [BigInt(claimedTokenId)]
    });

    if (owner.toLowerCase() !== walletAddress.toLowerCase()) {
      return { verified: false, reason: `Token ${claimedTokenId} not owned by ${walletAddress}` };
    }

    // 2. For hackathon: trust the frontend type mapping
    // Full implementation would fetch tokenURI and verify Pokemon type
    return { verified: true, reason: 'Ownership verified' };
  } catch (e) {
    return { verified: false, reason: e.message };
  }
}
