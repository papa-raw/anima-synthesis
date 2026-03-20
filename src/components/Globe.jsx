import { useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

/**
 * Load an image URL, circle-crop it using CSS background-position/size math,
 * and return ImageData suitable for map.addImage().
 */
function loadCircleCroppedImage(url, crop, canvasSize) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const s = canvasSize;
      const canvas = document.createElement('canvas');
      canvas.width = s;
      canvas.height = s;
      const ctx = canvas.getContext('2d');

      // Circle clip for card art
      ctx.save();
      ctx.beginPath();
      ctx.arc(s / 2, s / 2, s / 2 - 3, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      // Replicate CSS: background-size: {crop.size}%; background-position: {crop.x}% {crop.y}%
      const scale = crop.size / 100;
      const imgW = s * scale;
      const imgH = s * scale;
      const offX = (s - imgW) * (crop.x / 100);
      const offY = (s - imgH) * (crop.y / 100);
      ctx.drawImage(img, offX, offY, imgW, imgH);
      ctx.restore();

      // White border ring
      ctx.beginPath();
      ctx.arc(s / 2, s / 2, s / 2 - 3, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 3;
      ctx.stroke();

      resolve(ctx.getImageData(0, 0, s, s));
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/** Build GeoJSON FeatureCollection from agents array */
function agentsToGeoJSON(agents, selectedAgent) {
  const features = (agents || [])
    .filter(a => a.center && !(a.center[0] === 0 && a.center[1] === 0))
    .map(agent => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: agent.center },
      properties: {
        id: agent.id,
        color: agent.color,
        status: agent.status || 'wild',
        pokemon: agent.pokemon,
        selected: selectedAgent?.id === agent.id ? 1 : 0
      }
    }));
  return { type: 'FeatureCollection', features };
}

export default function Globe({ agents, selectedAgent, onAgentSelect, dimmed }) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const rotationRef = useRef(true);
  const idleTimerRef = useRef(null);
  const pulseRef = useRef(null);
  const layersReadyRef = useRef(false);

  useEffect(() => {
    if (mapRef.current || !mapContainer.current) return;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [2.17, 41.39], // Start on Phanpy's bioregion
      zoom: 4,
      projection: 'globe',
      fog: {
        color: '#0a0f0a',
        'high-color': '#0a0f0a',
        'horizon-blend': 0.1,
        'space-color': '#0a0f0a',
        'star-intensity': 0.15
      }
    });

    map.on('load', async () => {
      // Terrain
      map.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512
      });
      map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.2 });

      // Bioregion borders
      map.addSource('bioregions', {
        type: 'geojson',
        data: '/geojson/one_earth-bioregions-2023.geojson',
        generateId: true
      });
      map.addLayer({
        id: 'bioregion-borders',
        type: 'line',
        source: 'bioregions',
        paint: {
          'line-color': '#1a2f1e',
          'line-width': 1,
          'line-opacity': 0.5
        }
      });

      // Hide labels, roads, boundaries
      map.getStyle().layers.forEach(layer => {
        if (layer.type === 'symbol') {
          map.setLayoutProperty(layer.id, 'visibility', 'none');
        }
        if (layer.id.includes('road') || layer.id.includes('admin') || layer.id.includes('boundary')) {
          map.setLayoutProperty(layer.id, 'visibility', 'none');
        }
      });

      // Build filter for agent bioregions
      const agentBioregionIds = (agents || []).map(a => a.bioregionId).filter(Boolean);
      const bioregionFilter = ['in', ['get', 'Bioregions'], ['literal', agentBioregionIds]];

      // Bioregion highlight fill — only agent bioregions, always visible
      map.addLayer({
        id: 'bioregion-fill',
        type: 'fill',
        source: 'bioregions',
        filter: bioregionFilter,
        paint: {
          'fill-color': '#4ade80',
          'fill-opacity': 0.08
        }
      }, 'bioregion-borders');

      // Brighten borders for agent bioregions
      map.setPaintProperty('bioregion-borders', 'line-opacity', [
        'case', bioregionFilter, 0.7, 0.2
      ]);
      map.setPaintProperty('bioregion-borders', 'line-color', [
        'case', bioregionFilter, '#4ade80', '#1a2f1e'
      ]);

      // Bioregion name labels — one per agent, positioned at agent center
      const bioregionLabelFeatures = (agents || [])
        .filter(a => a.center && a.bioregionName)
        .map(agent => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: agent.center },
          properties: { name: agent.bioregionName }
        }));

      map.addSource('bioregion-labels', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: bioregionLabelFeatures }
      });

      map.addLayer({
        id: 'bioregion-labels',
        type: 'symbol',
        source: 'bioregion-labels',
        layout: {
          'text-field': ['get', 'name'],
          'text-size': 11,
          'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
          'text-offset': [0, 4.5],
          'text-anchor': 'top',
          'text-allow-overlap': true,
          'text-ignore-placement': true,
          'text-transform': 'uppercase',
          'text-letter-spacing': 0.1
        },
        paint: {
          'text-color': '#4ade80',
          'text-opacity': 0.6,
          'text-halo-color': '#0a0f0a',
          'text-halo-width': 1.5
        }
      });

      // ── Agent layers (WebGL-native — no DOM marker drift) ──

      // Load circle-cropped card images as map icons
      const ICON_SIZE = 144; // 72px × 2 for retina (50% larger)
      if (agents) {
        await Promise.all(agents.map(async (agent) => {
          if (!agent.imageUrl) return;
          try {
            const imageData = await loadCircleCroppedImage(
              agent.imageUrl,
              agent.markerCrop || { size: 450, x: 50, y: 50 },
              ICON_SIZE
            );
            if (imageData && !map.hasImage(agent.id)) {
              map.addImage(agent.id, imageData, { pixelRatio: 2 });
            }
          } catch (e) {
            console.warn(`Failed to load marker image for ${agent.pokemon}:`, e);
          }
        }));
      }

      // GeoJSON source for agent positions
      map.addSource('agents', {
        type: 'geojson',
        data: agentsToGeoJSON(agents, selectedAgent)
      });

      // Layer 1: Soft glow underneath
      map.addLayer({
        id: 'agent-glow',
        type: 'circle',
        source: 'agents',
        paint: {
          'circle-radius': ['case', ['==', ['get', 'selected'], 1], 54, 42],
          'circle-color': ['get', 'color'],
          'circle-opacity': [
            'case',
            ['==', ['get', 'status'], 'dead'], 0.05,
            ['==', ['get', 'selected'], 1], 0.3,
            0.15
          ],
          'circle-blur': 1
        }
      });

      // Layer 2: Pulsing ring (animated via JS)
      map.addLayer({
        id: 'agent-pulse',
        type: 'circle',
        source: 'agents',
        paint: {
          'circle-radius': 36,
          'circle-color': 'transparent',
          'circle-stroke-color': ['get', 'color'],
          'circle-stroke-width': 3,
          'circle-stroke-opacity': [
            'case',
            ['==', ['get', 'status'], 'dead'], 0,
            0.3
          ]
        }
      });

      // Layer 3: Card art icons
      map.addLayer({
        id: 'agent-icons',
        type: 'symbol',
        source: 'agents',
        layout: {
          'icon-image': ['get', 'id'],
          'icon-size': ['case', ['==', ['get', 'selected'], 1], 1.15, 1],
          'icon-allow-overlap': true,
          'icon-ignore-placement': true
        },
        paint: {
          'icon-opacity': [
            'case',
            ['==', ['get', 'status'], 'dead'], 0.4,
            1
          ]
        }
      });

      // Click handler for agent selection
      const handleAgentClick = (e) => {
        if (e.features.length === 0) return;
        const agentId = e.features[0].properties.id;
        const agent = agents.find(a => a.id === agentId);
        if (!agent) return;
        onAgentSelect(agent);
        const panelWidth = 420;
        map.flyTo({
          center: agent.center,
          zoom: 4,
          duration: 1500,
          offset: [-(panelWidth / 2), 0]
        });
      };

      map.on('click', 'agent-icons', handleAgentClick);
      map.on('click', 'agent-pulse', handleAgentClick);
      map.on('click', 'agent-glow', handleAgentClick);

      // Pointer cursor on hover
      ['agent-icons', 'agent-pulse', 'agent-glow'].forEach(layerId => {
        map.on('mouseenter', layerId, () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', layerId, () => { map.getCanvas().style.cursor = ''; });
      });

      // Pulse animation loop (WebGL repaint — stays locked to globe surface)
      let phase = 0;
      function animatePulse() {
        phase = (phase + 0.015) % 1;
        const t = (Math.sin(phase * Math.PI * 2) + 1) / 2;

        if (map.getLayer('agent-pulse')) {
          map.setPaintProperty('agent-pulse', 'circle-stroke-width', 1.5 + t * 12);
          map.setPaintProperty('agent-pulse', 'circle-radius', 36 + t * 24);
          map.setPaintProperty('agent-pulse', 'circle-stroke-opacity', 0.3 * (1 - t));
        }

        pulseRef.current = requestAnimationFrame(animatePulse);
      }
      animatePulse();

      layersReadyRef.current = true;

      // Auto-rotation
      spinGlobe(map);
    });

    // Pause rotation on interaction, resume after 10s idle
    map.on('mousedown', () => {
      rotationRef.current = false;
      clearTimeout(idleTimerRef.current);
    });
    map.on('touchstart', () => {
      rotationRef.current = false;
      clearTimeout(idleTimerRef.current);
    });
    map.on('mouseup', () => {
      idleTimerRef.current = setTimeout(() => {
        rotationRef.current = true;
        spinGlobe(map);
      }, 10000);
    });
    map.on('touchend', () => {
      idleTimerRef.current = setTimeout(() => {
        rotationRef.current = true;
        spinGlobe(map);
      }, 10000);
    });

    mapRef.current = map;

    return () => {
      clearTimeout(idleTimerRef.current);
      if (pulseRef.current) cancelAnimationFrame(pulseRef.current);
      map.remove();
      mapRef.current = null;
      layersReadyRef.current = false;
    };
  }, []);

  // Update agent data when agents or selection changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !layersReadyRef.current || !agents) return;

    const source = map.getSource('agents');
    if (source) {
      source.setData(agentsToGeoJSON(agents, selectedAgent));
    }
  }, [agents, selectedAgent]);

  // Fly to selected agent (from dock click or any external selection)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedAgent?.center) return;

    // Pause auto-rotation during fly
    rotationRef.current = false;
    clearTimeout(idleTimerRef.current);

    const panelWidth = 420;
    map.flyTo({
      center: selectedAgent.center,
      zoom: 4,
      duration: 1500,
      offset: [-(panelWidth / 2), 0]
    });

    // Resume rotation after idle
    idleTimerRef.current = setTimeout(() => {
      rotationRef.current = true;
      spinGlobe(map);
    }, 10000);
  }, [selectedAgent]);

  function spinGlobe(map) {
    if (!rotationRef.current || !map) return;
    const center = map.getCenter();
    center.lng += 0.05;
    map.easeTo({ center, duration: 100, easing: t => t });
    requestAnimationFrame(() => spinGlobe(map));
  }

  return (
    <div className="relative w-full h-full">
      <div
        ref={mapContainer}
        className={`w-full h-full transition-opacity duration-300 ${dimmed ? 'opacity-40' : 'opacity-100'}`}
      />
      <div className="globe-vignette" />
    </div>
  );
}
