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
        width: 1024,
        height: 1024,
        format: 'png',
        steps: 8,
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

    // Pin to IPFS via Storacha
    let ipfsCid = null;
    try {
      const blob = new Blob([imageBuffer], { type: 'image/png' });
      const uploadRes = await fetch('https://api.web3.storage/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.STORACHA_TOKEN}`,
          'X-Name': `anima-art-${agent.id}-${Date.now()}.png`
        },
        body: blob
      });
      if (uploadRes.ok) {
        const result = await uploadRes.json();
        ipfsCid = result.cid;
      }
    } catch (e) {
      console.warn('IPFS upload for memory art failed:', e.message);
    }

    // Save to disk as fallback when IPFS unavailable
    let localPath = null;
    if (!ipfsCid) {
      const { mkdirSync, writeFileSync } = await import('fs');
      const { join, dirname } = await import('path');
      const { fileURLToPath } = await import('url');
      const __dirname = dirname(fileURLToPath(import.meta.url));
      const artDir = join(__dirname, '../../public/art');
      mkdirSync(artDir, { recursive: true });
      const filename = `${agent.id}-${Date.now()}.jpg`;
      writeFileSync(join(artDir, filename), imageBuffer);
      localPath = `${process.env.API_URL || 'https://api.anima.cards'}/art/${filename}`;
    }

    const imageUrl = ipfsCid
      ? `https://w3s.link/ipfs/${ipfsCid}`
      : localPath;

    console.log(`[${agent.id}] Memory art generated: ${artPrompt.slice(0, 60)}... → ${ipfsCid || 'no IPFS'}`);

    return {
      imageUrl,
      ipfsCid,
      prompt: artPrompt,
      model: 'flux-2-max'
    };
  } catch (e) {
    console.error('Memory art generation failed:', e.message);
    return null;
  }
}

/**
 * Build an art prompt from agent identity + memory content
 */
function buildArtPrompt(agent, memory) {
  const elementStyles = {
    fighting: 'warm earth tones, desert landscape, golden light, ancient ruins',
    fire: 'blazing orange, dynamic motion, urban fire, neon reflections on wet streets',
    electric: 'electric blue, magnetic fields, Japanese forest, torii gates, lightning',
    water: 'deep ocean blue, coral reef, bioluminescence, flowing water',
    nature: 'lush green, dense forest canopy, morning mist, moss and ferns',
    psychic: 'purple nebula, crystalline structures, aurora borealis, ethereal glow',
    normal: 'soft neutral tones, gentle light, peaceful meadow'
  };

  const style = elementStyles[agent.element] || elementStyles.normal;

  return `A dreamlike illustration of ${agent.pokemon} in ${agent.bioregion_name || agent.bioregionName || 'a wild bioregion'}. The memory: "${memory}". Style: ${style}. Digital art, painterly, atmospheric, no text, no watermark.`;
}
