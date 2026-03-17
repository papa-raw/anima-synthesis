/**
 * Astral Service — Location proofs via Astral SDK + browser geolocation
 *
 * NOTE: Astral SDK uses ethers.js v6, NOT viem. Both coexist.
 * Frontend: ethers BrowserProvider for Astral capture flow
 * Server: ethers JsonRpcProvider for verification
 */

import { AstralSDK } from '@decentralized-geo/astral-sdk';
import { ethers } from 'ethers';

let astralInstance = null;

// ─── Browser Geolocation ───────────────────────────────────────────────

/**
 * Get current GPS position from browser
 */
export function getCurrentPosition(options = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        altitude: pos.coords.altitude,
        timestamp: pos.timestamp,
        source: 'gps'
      }),
      (err) => reject(new Error(`GPS failed: ${err.message}`)),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000, ...options }
    );
  });
}

// ─── Astral SDK Integration ────────────────────────────────────────────

/**
 * Initialize Astral SDK with browser wallet (call once, after wallet connect)
 */
export async function initBrowserAstral() {
  try {
    if (!window.ethereum) throw new Error('No wallet');

    // Switch to Base if not already
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x2105' }] // 8453 = Base
      });
    } catch (switchError) {
      // If Base not added, add it
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0x2105',
            chainName: 'Base',
            nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
            rpcUrls: ['https://mainnet.base.org'],
            blockExplorerUrls: ['https://basescan.org']
          }]
        });
      }
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    astralInstance = new AstralSDK({
      chainId: 8453, // Always Base
      signer,
      apiUrl: 'https://staging-api.astral.global'
    });
    console.log('Astral SDK ready on Base (8453)');
    return astralInstance;
  } catch (e) {
    console.error('Astral SDK init failed:', e.message);
    return null;
  }
}

/**
 * Create a location proof via Astral SDK.
 * Simulated fallback ONLY available in DEMO_MODE — production requires real attestation.
 */
export async function createLocationProof(location, agent) {
  const demoMode = import.meta.env.VITE_DEMO_MODE === 'true';
  const timestamp = Math.floor(Date.now() / 1000);

  // Try real Astral attestation
  if (astralInstance) {
    try {
      const attestation = await astralInstance.location.offchain.create({
        location: {
          type: 'Point',
          coordinates: [location.longitude, location.latitude]
        },
        locationType: 'geojson',
        timestamp: new Date(timestamp * 1000),
        memo: JSON.stringify({ agentId: agent.id, bioregionId: agent.bioregionId, accuracy: location.accuracy })
      });

      return {
        uid: attestation.uid || attestation.id || `astral_${timestamp}`,
        schema: 'LocationProof',
        data: {
          latitude: Math.round(location.latitude * 1e6),
          longitude: Math.round(location.longitude * 1e6),
          accuracy: Math.round(location.accuracy),
          timestamp,
          agentId: agent.id,
          bioregionId: agent.bioregionId
        },
        txHash: attestation.txHash || null,
        chain: 'base',
        simulated: false
      };
    } catch (e) {
      console.error('Real Astral proof failed:', e.message);
      if (!demoMode) {
        throw new Error(`Astral location proof failed: ${e.message}. Connect wallet and ensure Base chain is selected.`);
      }
      console.warn('DEMO_MODE: falling back to simulated proof');
    }
  } else if (!demoMode) {
    throw new Error('Astral SDK not initialized. Connect wallet first.');
  }

  // Simulated fallback — DEMO_MODE only (for hackathon judging without real wallet)
  const proofId = `demo_proof_${timestamp}_${Math.random().toString(36).substring(2, 8)}`;
  return {
    uid: proofId,
    schema: 'LocationProof',
    data: {
      latitude: Math.round(location.latitude * 1e6),
      longitude: Math.round(location.longitude * 1e6),
      accuracy: Math.round(location.accuracy || 10),
      timestamp,
      agentId: agent.id,
      bioregionId: agent.bioregionId
    },
    txHash: null,
    chain: 'base',
    simulated: true
  };
}

// ─── Location Verification ─────────────────────────────────────────────

/**
 * Calculate distance between two points (Haversine formula)
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Verify user is within max distance of a target
 */
export function verifyLocationProximity(userLocation, targetCoords, maxDistanceKm = 500) {
  const distance = calculateDistance(
    userLocation.latitude, userLocation.longitude,
    targetCoords[1], targetCoords[0] // GeoJSON is [lng, lat]
  );
  return {
    isWithinRange: distance <= maxDistanceKm,
    distance,
    maxDistance: maxDistanceKm,
    accuracy: userLocation.accuracy
  };
}

// ─── Formatting ────────────────────────────────────────────────────────

export function formatCoordinates(lat, lng) {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}°${latDir}, ${Math.abs(lng).toFixed(4)}°${lngDir}`;
}

export function formatDistance(km) {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}
