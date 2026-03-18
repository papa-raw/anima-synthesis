/**
 * Memory Art Service — Venice Flux image generation + IPFS storage
 *
 * When an agent forms a memory, it generates a unique piece of art
 * reflecting that memory via Venice's Flux model. The art is stored
 * on IPFS and optionally minted as an NFT.
 *
 * Private cognition (Venice inference, zero data retention) →
 * Public action (art minted onchain).
 */

import { pinToIpfs } from './ipfsService.js';

// Read lazily — module loads before dotenv in PM2
function getVeniceKey() { return process.env.VENICE_API_KEY; }
// Venice supports both endpoints — try official first, fall back to OpenAI-compat
const VENICE_IMAGE_URL = 'https://api.venice.ai/api/v1/image/generate';

/**
 * Generate art from a memory using Venice Flux
 * Returns { imageUrl, ipfsCid, prompt } or null on failure
 */
export async function generateMemoryArt(agent, memory) {
  const VENICE_API_KEY = getVeniceKey();
  if (!VENICE_API_KEY) {
    console.warn('No VENICE_API_KEY — skipping memory art');
    return null;
  }

  try {
    const artPrompt = buildArtPrompt(agent, memory);

    // Generate image via Venice Flux (official endpoint)
    const res = await fetch(VENICE_IMAGE_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VENICE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'flux-2-max',
        prompt: artPrompt,
        width: 768,
        height: 768,
        format: 'webp',
        safe_mode: false,
        hide_watermark: true
      })
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Venice Flux failed:', res.status, err);
      return null;
    }

    const data = await res.json();

    // Venice official format: { images: ["base64..."] }
    // OpenAI-compat format: { data: [{ b64_json }] }
    let imageBuffer;
    if (data.images?.[0]) {
      imageBuffer = Buffer.from(data.images[0], 'base64');
    } else if (data.data?.[0]?.b64_json) {
      imageBuffer = Buffer.from(data.data[0].b64_json, 'base64');
    } else if (data.data?.[0]?.url) {
      const imgRes = await fetch(data.data[0].url);
      imageBuffer = Buffer.from(await imgRes.arrayBuffer());
    } else {
      console.error('Venice: unexpected response format', Object.keys(data));
      return null;
    }

    // Save to disk immediately (skip IPFS for now — Storacha token may be expired)
    const { mkdirSync, writeFileSync } = await import('fs');
    const { join, dirname } = await import('path');
    const { fileURLToPath } = await import('url');
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const artDir = join(__dirname, '../../public/art');
    mkdirSync(artDir, { recursive: true });

    const isWebP = imageBuffer[0] === 0x52 && imageBuffer[1] === 0x49;
    const isPNG = imageBuffer[0] === 0x89 && imageBuffer[1] === 0x50;
    const ext = isWebP ? 'webp' : isPNG ? 'png' : 'jpg';
    const filename = `${agent.id}-${Date.now()}.${ext}`;
    const fullPath = join(artDir, filename);
    writeFileSync(fullPath, imageBuffer);

    console.log(`[${agent.id}] Art saved: ${filename} (${imageBuffer.length} bytes)`);

    const localPath = `${process.env.API_URL || 'https://api.anima.cards'}/art/${filename}`;

    // Mint as NFT via Rare Protocol CLI (SuperRare bounty)
    let nftTokenId = null;
    const RARE_CONTRACT = process.env.RARE_NFT_CONTRACT || '0x59FbA43625eF81460930a8770Ee9c69042311c1a';
    try {
      const { execSync } = await import('child_process');
      const mintResult = execSync(
        `rare mint --contract ${RARE_CONTRACT} --name "${memory.slice(0, 60).replace(/"/g, "'")}" --description "Memory art by ${agent.pokemon || agent.id}. ${artPrompt.slice(0, 100).replace(/"/g, "'")}" --image ${fullPath} --chain base`,
        { timeout: 60000, encoding: 'utf8' }
      );
      console.log(`[${agent.id}] NFT minted:`, mintResult.trim());
      const tokenMatch = mintResult.match(/token[- _]?[iI][dD][\s:]*(\d+)/i);
      if (tokenMatch) nftTokenId = tokenMatch[1];
    } catch (e) {
      console.warn(`[${agent.id}] Rare CLI mint failed (art still saved):`, e.message?.slice(0, 100));
    }

    // Auto-auction via Rare Protocol (SuperRare bounty — agent sells its own art)
    let auctionId = null;
    if (nftTokenId) {
      try {
        const { execSync } = await import('child_process');
        const auctionResult = execSync(
          `rare auction create --contract ${RARE_CONTRACT} --token-id ${nftTokenId} --starting-price 0.0001 --duration 86400 --chain base`,
          { timeout: 60000, encoding: 'utf8' }
        );
        console.log(`[${agent.id}] Auction created for NFT #${nftTokenId}:`, auctionResult.trim());
        auctionId = nftTokenId; // auction is keyed by token ID
      } catch (e) {
        console.warn(`[${agent.id}] Auction creation failed:`, e.message?.slice(0, 100));
      }
    }

    console.log(`[${agent.id}] Memory art generated: ${artPrompt.slice(0, 60)}... → ${nftTokenId ? 'NFT #' + nftTokenId : 'no mint'}${auctionId ? ' (auctioned)' : ''}`);

    return {
      imageUrl: localPath,
      ipfsCid: null,
      nftTokenId,
      nftContract: nftTokenId ? RARE_CONTRACT : null,
      prompt: artPrompt,
      model: 'flux-2-max'
    };
  } catch (e) {
    console.error('Memory art generation failed:', e.message);
    return null;
  }
}

/**
 * Build an art prompt from the agent's POV — what it sees, feels, remembers.
 * Never mention Pokemon names (triggers copyright filters on image models).
 */
function buildArtPrompt(agent, memory) {
  const elementMoods = {
    fighting: 'warm earth tones, golden hour light, dry grass, ancient stone, dust motes in sunlight',
    fire: 'blazing sunset, heat shimmer, embers floating, neon reflections on wet asphalt at night',
    electric: 'crackling blue light, magnetic aurora, forest shrine, paper lanterns, static electricity',
    water: 'deep ocean light filtering down, coral colors, bioluminescent glow, rain on still water',
    nature: 'dappled green canopy light, morning mist between trees, moss on stone, fern unfurling',
    psychic: 'purple twilight, crystalline reflections, northern lights, ethereal fog',
    normal: 'soft golden meadow, gentle breeze, wildflowers, afternoon light'
  };

  const mood = elementMoods[agent.element] || elementMoods.normal;
  const bioregion = agent.bioregion_name || agent.bioregionName || 'a wild landscape';

  return `First-person view from a small wild creature looking out at ${bioregion}. The feeling: ${memory}. Mood: ${mood}. Digital painting, atmospheric, dreamy, no text, no characters visible, landscape perspective, painterly.`;
}
