/**
 * Server-side bioregion verification
 * Loads One Earth GeoJSON once at startup, provides point-in-polygon checks.
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

let bioregionData = null;

/**
 * Load bioregion GeoJSON from public/geojson/ — call once at startup
 */
export function loadBioregions() {
  if (bioregionData) return;
  const geoPath = join(__dirname, '../../public/geojson/one_earth-bioregions-2023.geojson');
  try {
    bioregionData = JSON.parse(readFileSync(geoPath, 'utf8'));
    console.log(`[bioregion] Loaded ${bioregionData.features.length} bioregion boundaries`);
  } catch (e) {
    console.error('[bioregion] Failed to load GeoJSON:', e.message);
  }
}

/**
 * Check if (lat, lng) falls within the bioregion identified by bioregionId.
 * Returns { valid: boolean, actual: string|null }
 */
export function verifyBioregion(lat, lng, bioregionId) {
  if (!bioregionData?.features) {
    // If boundaries didn't load, skip verification (don't block captures)
    return { valid: true, actual: null, skipped: true };
  }

  const point = [lng, lat]; // GeoJSON is [lon, lat]

  // Find the claimed bioregion and check containment
  const claimed = bioregionData.features.find(f => f.properties.Bioregions === bioregionId);
  if (claimed && pointInGeometry(point, claimed.geometry)) {
    return { valid: true, actual: bioregionId };
  }

  // Not in claimed bioregion — check if they're in a different one
  for (const feature of bioregionData.features) {
    if (pointInGeometry(point, feature.geometry)) {
      return { valid: false, actual: feature.properties.Bioregions };
    }
  }

  // Not in any bioregion (ocean, etc.)
  return { valid: false, actual: null };
}

// ─── Ray-casting point-in-polygon ────────────────────────────────────

function pointInPolygon(point, ring) {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInGeometry(point, geometry) {
  if (!geometry) return false;
  if (geometry.type === 'Polygon') {
    return pointInPolygon(point, geometry.coordinates[0]);
  }
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.some(poly => pointInPolygon(point, poly[0]));
  }
  return false;
}
