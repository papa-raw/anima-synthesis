/**
 * NFT Transfer Service — transfers Beezie NFTs from agent wallets
 * Used on capture (agent → catcher) and can be used for recall (agent → paparaw)
 */

import { createWalletClient, createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const BEEZIE_CONTRACT = '0xbb5ec6fd4b61723bd45c399840f1d868840ca16f';

const AGENT_KEYS = {
  'agent-phanpy': process.env.AGENT_PHANPY_PRIVATE_KEY,
  'agent-2': process.env.AGENT_2_PRIVATE_KEY,
  'agent-ponyta': process.env.AGENT_2_PRIVATE_KEY,
  'agent-3': process.env.AGENT_3_PRIVATE_KEY,
  'agent-magnemite': process.env.AGENT_3_PRIVATE_KEY,
};

const ERC721_ABI = [
  {
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'tokenId', type: 'uint256' }
    ],
    name: 'transferFrom',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  }
];

const publicClient = createPublicClient({
  chain: base,
  transport: http(process.env.BASE_RPC_URL || 'https://mainnet.base.org')
});

/**
 * Transfer Beezie NFT from agent wallet to catcher on successful capture
 */
export async function transferNftToCatcher(agentId, catcherAddress, beezieTokenId) {
  const key = AGENT_KEYS[agentId];
  if (!key) throw new Error(`No private key for ${agentId}. Set env var.`);

  const account = privateKeyToAccount(key);
  const walletClient = createWalletClient({
    account,
    chain: base,
    transport: http(process.env.BASE_RPC_URL || 'https://mainnet.base.org')
  });

  const hash = await walletClient.writeContract({
    address: BEEZIE_CONTRACT,
    abi: ERC721_ABI,
    functionName: 'transferFrom',
    args: [account.address, catcherAddress, BigInt(beezieTokenId)]
  });

  // Wait for confirmation
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}
