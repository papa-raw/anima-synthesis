/**
 * Generate circle-cropped token art PNGs from Beezie card images.
 * Uses the same crop values as the globe markers in agents.js.
 * Outputs to public/tokens/ as PNGs for use as Clanker token images.
 *
 * Usage: node scripts/generate-token-art.js
 */

import { createCanvas, loadImage } from 'canvas';
import { mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public', 'tokens');

const AGENTS = [
  {
    id: 'agent-phanpy',
    pokemon: 'Phanpy',
    color: '#f97316',
    imageUrl: 'https://crimson-calm-beetle-499.mypinata.cloud/ipfs/bafybeialfpygghh6itmqsyk2z5pf6ex3wqpmwho7wobiuu7acma75iqnvq/psa107645022.jpg',
    markerCrop: { size: 450, x: 52, y: 53 },
  },
  {
    id: 'agent-ponyta',
    pokemon: 'Ponyta',
    color: '#ef4444',
    imageUrl: 'https://crimson-calm-beetle-499.mypinata.cloud/ipfs/bafybeiguixsyidzx3yf3x3cil5efx3co6fiowqvxj5tewyy2dpcblxd5lq/tagj5048257.jpg',
    markerCrop: { size: 500, x: 50, y: 45 },
  },
  {
    id: 'agent-magnemite',
    pokemon: 'Magnemite',
    color: '#eab308',
    imageUrl: 'https://crimson-calm-beetle-499.mypinata.cloud/ipfs/bafybeib2gg7tfl7l66vj6x642gsexvmoc5auniqnh5h6chy2ldeue6xvxy/psa81978760.jpg',
    markerCrop: { size: 453, x: 45, y: 49 },
  },
];

const SIZE = 512; // Output image size

async function generateArt(agent) {
  const img = await loadImage(agent.imageUrl);
  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext('2d');

  // Circle clip
  ctx.save();
  ctx.beginPath();
  ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 6, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  // CSS background-position/size math (same as Globe.jsx)
  const crop = agent.markerCrop;
  const scale = crop.size / 100;
  const imgW = SIZE * scale;
  const imgH = SIZE * scale;
  const offX = (SIZE - imgW) * (crop.x / 100);
  const offY = (SIZE - imgH) * (crop.y / 100);
  ctx.drawImage(img, offX, offY, imgW, imgH);
  ctx.restore();

  // Colored border ring
  ctx.beginPath();
  ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 6, 0, Math.PI * 2);
  ctx.strokeStyle = agent.color;
  ctx.lineWidth = 8;
  ctx.stroke();

  // Outer subtle white ring
  ctx.beginPath();
  ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 2, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 3;
  ctx.stroke();

  const outPath = join(OUT_DIR, `${agent.id}.png`);
  writeFileSync(outPath, canvas.toBuffer('image/png'));
  console.log(`Generated ${outPath} (${SIZE}x${SIZE})`);
  return outPath;
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  for (const agent of AGENTS) {
    try {
      await generateArt(agent);
    } catch (e) {
      console.error(`Failed for ${agent.pokemon}:`, e.message);
    }
  }

  console.log('\nDone. Upload these to IPFS or use as Clanker token image URLs.');
}

main();
