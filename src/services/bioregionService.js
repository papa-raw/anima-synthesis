/**
 * Bioregion Service — Slim version for Anima/Synthesis
 * Only the functions we need: boundary loading, point-in-polygon, coordinate lookup
 */

let bioregionData = null;

/**
 * Load One Earth bioregion GeoJSON boundaries
 */
export async function loadBioregionBoundaries() {
  if (bioregionData) return bioregionData;
  try {
    const res = await fetch('/geojson/one_earth-bioregions-2023.geojson');
    bioregionData = await res.json();
    console.log(`Loaded ${bioregionData.features?.length || 0} bioregion boundaries`);
    return bioregionData;
  } catch (e) {
    console.error('Failed to load bioregion boundaries:', e);
    return null;
  }
}

/**
 * Find which bioregion a coordinate falls in
 * Returns the GeoJSON feature or null
 */
export function findBioregionAtCoordinate(lon, lat) {
  if (!bioregionData?.features) return null;

  for (const feature of bioregionData.features) {
    if (pointInGeometry([lon, lat], feature.geometry)) {
      return feature;
    }
  }
  return null;
}

/**
 * Check if boundaries are loaded
 */
export function areBoundariesLoaded() {
  return !!bioregionData;
}

/**
 * Get all bioregions as FeatureCollection (for globe layer)
 */
export function getAllBioregions() {
  return bioregionData;
}

// ─── Point-in-Polygon (Ray Casting) ──────────────────────────────────

function pointInPolygon(point, polygon) {
  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

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

export { pointInPolygon, pointInGeometry };
