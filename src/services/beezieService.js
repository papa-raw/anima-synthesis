import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { POKEMON_TYPE_MAP } from '../data/types.js';

const BEEZIE_CONTRACT = '0xbb5ec6fd4b61723bd45c399840f1d868840ca16f';

const publicClient = createPublicClient({
  chain: base,
  transport: http('https://mainnet.base.org')
});

// Minimal ERC-721 ABI for reads
const ERC721_ABI = [
  {
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'tokenURI',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'owner', type: 'address' }, { name: 'index', type: 'uint256' }],
    name: 'tokenOfOwnerByIndex',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  }
];

/**
 * Get all Beezie NFTs held by a wallet
 */
export async function getBeezieHoldings(walletAddress) {
  try {
    const balance = await publicClient.readContract({
      address: BEEZIE_CONTRACT,
      abi: ERC721_ABI,
      functionName: 'balanceOf',
      args: [walletAddress]
    });

    const count = Number(balance);
    if (count === 0) return [];

    const cards = [];
    for (let i = 0; i < count; i++) {
      try {
        const tokenId = await publicClient.readContract({
          address: BEEZIE_CONTRACT,
          abi: ERC721_ABI,
          functionName: 'tokenOfOwnerByIndex',
          args: [walletAddress, BigInt(i)]
        });

        const uri = await publicClient.readContract({
          address: BEEZIE_CONTRACT,
          abi: ERC721_ABI,
          functionName: 'tokenURI',
          args: [tokenId]
        });

        const metadata = await fetchMetadata(uri);
        cards.push(normalizeBeezieCard(tokenId.toString(), metadata));
      } catch (e) {
        console.error(`Failed to read token ${i}:`, e.message);
      }
    }
    return cards;
  } catch (e) {
    console.error('Failed to read Beezie holdings:', e.message);
    return [];
  }
}

/**
 * Check if wallet holds a card matching the given element type
 */
export async function getMatchingCard(walletAddress, elementType) {
  const holdings = await getBeezieHoldings(walletAddress);
  return holdings.find(card => card.element === elementType) || null;
}

/**
 * Map Pokemon name to our element type
 */
export function mapPokemonToElement(pokemonName) {
  // Try direct name lookup in known Pokemon types
  const KNOWN_POKEMON = {
    'Phanpy': 'fighting',       // Ground type
    'Bulbasaur': 'nature', 'Ivysaur': 'nature', 'Venusaur': 'nature',
    'Charmander': 'fire', 'Charmeleon': 'fire', 'Charizard': 'fire',
    'Squirtle': 'water', 'Wartortle': 'water', 'Blastoise': 'water',
    'Pikachu': 'electric', 'Raichu': 'electric',
    'Meganium': 'nature', 'Muk': 'nature',
    'Gyarados': 'water', 'Magikarp': 'water',
    'Mewtwo': 'psychic', 'Alakazam': 'psychic',
    'Machamp': 'fighting', 'Hitmonlee': 'fighting',
  };

  if (KNOWN_POKEMON[pokemonName]) return KNOWN_POKEMON[pokemonName];

  // Fallback: check metadata attributes for type
  return 'normal';
}

/**
 * Fetch metadata from tokenURI
 */
async function fetchMetadata(uri) {
  try {
    // Handle IPFS URIs
    const url = uri.startsWith('ipfs://') ? uri.replace('ipfs://', 'https://ipfs.io/ipfs/') : uri;
    const res = await fetch(url);
    return res.json();
  } catch {
    return {};
  }
}

/**
 * Normalize Beezie NFT metadata to our card shape
 */
export function normalizeBeezieCard(tokenId, metadata) {
  const name = metadata.name || 'Unknown';
  // Extract Pokemon name from Beezie naming pattern: "2024 Surging Sparks Phanpy #205 PSA 9"
  const parts = name.split(' ');
  const pokemonName = extractPokemonName(name);

  return {
    tokenId,
    pokemon: pokemonName,
    element: mapPokemonToElement(pokemonName),
    name: name,
    imageUrl: metadata.image || metadata.image_url || '',
    set: metadata.attributes?.find(a => a.trait_type === 'Set Name')?.value || '',
    year: metadata.attributes?.find(a => a.trait_type === 'Year')?.value || '',
    grade: metadata.attributes?.find(a => a.trait_type === 'Grade')?.value || '',
    serial: metadata.attributes?.find(a => a.trait_type === 'Serial')?.value || '',
  };
}

function extractPokemonName(fullName) {
  // Beezie names look like: "2024 Surging Sparks Phanpy #205 PSA 9"
  // Try to find the Pokemon name before the # symbol
  const hashIdx = fullName.indexOf('#');
  if (hashIdx === -1) return fullName;
  const beforeHash = fullName.substring(0, hashIdx).trim();
  const words = beforeHash.split(' ');
  // The Pokemon name is typically the last word before #
  return words[words.length - 1] || fullName;
}
