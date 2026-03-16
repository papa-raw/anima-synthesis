import { useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

export default function Globe({ agents, selectedAgent, onAgentSelect, dimmed }) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const rotationRef = useRef(true);
  const idleTimerRef = useRef(null);

  useEffect(() => {
    if (mapRef.current || !mapContainer.current) return;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [0, 20],
      zoom: 1.8,
      projection: 'globe',
      fog: {
        color: '#0a0f0a',
        'high-color': '#0a0f0a',
        'horizon-blend': 0.1,
        'space-color': '#0a0f0a',
        'star-intensity': 0.15
      }
    });

    map.on('load', () => {
      // Terrain
      map.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512
      });
      map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.2 });

      // Bioregion borders — promoteId needed for feature-state hover
      map.addSource('bioregions', {
        type: 'geojson',
        data: '/geojson/one_earth-bioregions-2023.geojson',
        generateId: true  // Auto-generate numeric IDs for feature-state
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

      // Hide ALL labels, roads, and boundaries — pure terrain only
      map.getStyle().layers.forEach(layer => {
        if (layer.type === 'symbol') {
          map.setLayoutProperty(layer.id, 'visibility', 'none');
        }
        if (layer.id.includes('road') || layer.id.includes('admin') || layer.id.includes('boundary')) {
          map.setLayoutProperty(layer.id, 'visibility', 'none');
        }
      });

      // Bioregion highlight layer (fill on hover)
      map.addLayer({
        id: 'bioregion-fill',
        type: 'fill',
        source: 'bioregions',
        paint: {
          'fill-color': '#4ade80',
          'fill-opacity': 0
        }
      }, 'bioregion-borders');

      // Bioregion name tooltip
      const tooltip = document.createElement('div');
      tooltip.className = 'fixed z-50 px-2 py-1 rounded text-xs font-mono text-emerald-400 bg-[#0a0f0a]/90 border border-emerald-500/30 pointer-events-none hidden';
      document.body.appendChild(tooltip);

      // Bioregion hover interaction
      let hoveredId = null;
      map.on('mousemove', 'bioregion-fill', (e) => {
        if (e.features.length > 0) {
          if (hoveredId !== null) {
            map.setFeatureState({ source: 'bioregions', id: hoveredId }, { hover: false });
          }
          hoveredId = e.features[0].id;
          map.setFeatureState({ source: 'bioregions', id: hoveredId }, { hover: true });
          map.getCanvas().style.cursor = 'pointer';

          // Show bioregion name tooltip
          const name = e.features[0].properties?.name || e.features[0].properties?.BIOME_NAME || e.features[0].properties?.ECO_NAME || '';
          if (name) {
            tooltip.textContent = name;
            tooltip.style.left = `${e.originalEvent.clientX + 12}px`;
            tooltip.style.top = `${e.originalEvent.clientY - 12}px`;
            tooltip.classList.remove('hidden');
          }
        }
      });
      map.on('mouseleave', 'bioregion-fill', () => {
        if (hoveredId !== null) {
          map.setFeatureState({ source: 'bioregions', id: hoveredId }, { hover: false });
        }
        hoveredId = null;
        map.getCanvas().style.cursor = '';
        tooltip.classList.add('hidden');
      });

      // Update fill opacity based on hover state
      map.setPaintProperty('bioregion-fill', 'fill-opacity', [
        'case', ['boolean', ['feature-state', 'hover'], false], 0.1, 0
      ]);

      // Also make borders brighter on hover
      map.setPaintProperty('bioregion-borders', 'line-opacity', [
        'case', ['boolean', ['feature-state', 'hover'], false], 0.8, 0.3
      ]);
      map.setPaintProperty('bioregion-borders', 'line-color', [
        'case', ['boolean', ['feature-state', 'hover'], false], '#4ade80', '#1a2f1e'
      ]);

      // Auto-rotation
      spinGlobe(map);
    });

    // Pause rotation on interaction
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

    // No nav controls — scroll to zoom, drag to rotate

    mapRef.current = map;

    return () => {
      clearTimeout(idleTimerRef.current);
      markersRef.current.forEach(m => m.remove());
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers when agents change
  useEffect(() => {
    if (!mapRef.current) return;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    addAgentMarkers(mapRef.current);
  }, [agents, selectedAgent]);

  function addAgentMarkers(map) {
    if (!agents) return;

    agents.forEach(agent => {
      if (!agent.center || (agent.center[0] === 0 && agent.center[1] === 0)) return;

      const el = document.createElement('div');
      el.className = 'agent-marker';
      el.setAttribute('data-status', agent.status || 'wild');
      el.setAttribute('data-selected', selectedAgent?.id === agent.id ? 'true' : 'false');

      // Use background-image with zoom to crop into the Pokemon art inside the PSA slab
      const crop = agent.markerCrop || { size: 450, x: 50, y: 50 };
      const coreStyle = agent.imageUrl
        ? `background: url('${agent.imageUrl}') no-repeat ${crop.x}% ${crop.y}%; background-size: ${crop.size}%; box-shadow: 0 0 12px ${agent.color};`
        : `background: ${agent.color}; box-shadow: 0 0 12px ${agent.color};`;
      const coreContent = agent.imageUrl
        ? ''
        : `<span style="font-size: 11px; font-weight: bold; color: white;">${agent.pokemon?.[0] || '?'}</span>`;

      el.innerHTML = `
        <div class="marker-ring" style="background: ${agent.color}; --el-color: ${agent.color}"></div>
        <div class="marker-core" style="${coreStyle}">${coreContent}</div>
      `;

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onAgentSelect(agent);
        // Fly to agent, offset left to account for 420px detail panel on right
        const panelWidth = 420;
        const mapWidth = map.getContainer().offsetWidth;
        // Center the marker in the remaining left portion of the viewport
        const offsetX = panelWidth / 2;
        map.flyTo({
          center: agent.center,
          zoom: 4,
          duration: 1500,
          offset: [-offsetX, 0]  // shift left so marker centers in visible area
        });
      });

      const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat(agent.center)
        .addTo(map);

      markersRef.current.push(marker);
    });
  }

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
