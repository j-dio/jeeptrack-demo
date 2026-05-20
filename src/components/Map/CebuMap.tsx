import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  buildJeepFeatures,
  buildWaitingStopFeatures,
  type MapController,
  type MapRenderOptions,
} from '../../map/mapController';
import { DRIVER_ROUTE_CODE } from '../../data/routes';
import type { Jeepney, RouteGeometry } from '../../types';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN ?? '';

type CebuMapProps = {
  geometries: RouteGeometry[];
  mapControllerRef: React.MutableRefObject<MapController | null>;
  mapRenderOptions: MapRenderOptions;
  onJeepSelect: (id: string) => void;
  onMapReady?: () => void;
};

function offsetBehind(
  lng: number,
  lat: number,
  bearingDeg: number,
  km: number,
): [number, number] {
  const rad = ((bearingDeg + 180) * Math.PI) / 180;
  const dLng = (km / 111.32) * Math.sin(rad) / Math.cos((lat * Math.PI) / 180);
  const dLat = (km / 111.32) * Math.cos(rad);
  return [lng + dLng, lat + dLat];
}

function createDriverMarkerElement(): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'driver-vehicle-marker';
  el.innerHTML = `
    <div class="driver-vehicle-inner">
      <span class="driver-vehicle-arrow">▲</span>
      <span class="driver-vehicle-code">04C</span>
    </div>
  `;
  return el;
}

export function CebuMap({
  geometries,
  mapControllerRef,
  mapRenderOptions,
  onJeepSelect,
  onMapReady,
}: CebuMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const readyRef = useRef(false);
  const onJeepSelectRef = useRef(onJeepSelect);
  const onMapReadyRef = useRef(onMapReady);
  const driverMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const waitingMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const geometriesRef = useRef(geometries);
  const lastDriverEaseRef = useRef(0);
  const driverModeRef = useRef(mapRenderOptions.driverMode);
  driverModeRef.current = mapRenderOptions.driverMode;

  onJeepSelectRef.current = onJeepSelect;
  onMapReadyRef.current = onMapReady;
  geometriesRef.current = geometries;

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/navigation-night-v1',
      center: [123.8854, 10.3157],
      zoom: 12.5,
      pitch: 30,
      attributionControl: false,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

    const sync = (jeepneys: Jeepney[], options: MapRenderOptions) => {
      if (!readyRef.current) return;
      const geoms = geometriesRef.current;

      for (const geometry of geoms) {
        const code = geometry.route.code;
        const layerId = `route-line-${code}`;
        if (!map.getLayer(layerId)) continue;

        if (options.driverMode) {
          if (code === DRIVER_ROUTE_CODE) {
            map.setPaintProperty(layerId, 'line-width', 5);
            map.setPaintProperty(layerId, 'line-opacity', 1);
            map.setLayoutProperty(layerId, 'visibility', 'visible');
          } else {
            map.setPaintProperty(layerId, 'line-width', 3);
            map.setPaintProperty(layerId, 'line-opacity', 0.12);
            map.setLayoutProperty(layerId, 'visibility', 'visible');
          }
        } else {
          const visible =
            options.visibleRoutes === 'all' || options.visibleRoutes.has(code);
          map.setPaintProperty(layerId, 'line-width', 4);
          map.setPaintProperty(layerId, 'line-opacity', 0.55);
          map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
        }
      }

      const jeepSource = map.getSource('jeeps') as mapboxgl.GeoJSONSource | undefined;
      jeepSource?.setData({
        type: 'FeatureCollection',
        features: buildJeepFeatures(jeepneys, geoms, options),
      });

      const pulse = options.pulsePhase;
      if (map.getLayer('jeep-circles')) {
        map.setPaintProperty('jeep-circles', 'circle-radius', [
          'case',
          ['==', ['get', 'selected'], true],
          14,
          ['==', ['get', 'decelerating'], true],
          10 + 3 * Math.abs(Math.sin(pulse * 4)),
          10,
        ]);
      }

      if (map.getLayer('user-pin-layer')) {
        map.setLayoutProperty(
          'user-pin-layer',
          'visibility',
          options.driverMode ? 'none' : 'visible',
        );
      }

      if (map.getLayer('jeep-labels')) {
        map.setLayoutProperty(
          'jeep-labels',
          'visibility',
          options.driverMode ? 'none' : 'visible',
        );
      }

      const userSource = map.getSource('user-pin') as mapboxgl.GeoJSONSource | undefined;
      userSource?.setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Point',
          coordinates: [options.userLocation.lng, options.userLocation.lat],
        },
      });

      const waitSource = map.getSource('waiting-stops') as mapboxgl.GeoJSONSource | undefined;
      waitSource?.setData(buildWaitingStopFeatures(options.driverState, pulse));

      if (map.getLayer('waiting-circles')) {
        map.setLayoutProperty(
          'waiting-circles',
          'visibility',
          options.driverMode ? 'visible' : 'none',
        );
        map.setPaintProperty('waiting-circles', 'circle-radius', 5 + 2 * Math.abs(Math.sin(pulse * 3)));
      }

      if (options.driverMode && options.driverState?.position) {
        const { lng, lat, bearing } = options.driverState.position;
        if (!driverMarkerRef.current) {
          const el = createDriverMarkerElement();
          driverMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: 'center' })
            .setLngLat([lng, lat])
            .addTo(map);
        } else {
          driverMarkerRef.current.setLngLat([lng, lat]);
        }
        const inner = driverMarkerRef.current.getElement().querySelector('.driver-vehicle-inner');
        if (inner instanceof HTMLElement) {
          inner.style.transform = `rotate(${bearing}deg)`;
        }

        const now = performance.now();
        if (now - lastDriverEaseRef.current > 80) {
          lastDriverEaseRef.current = now;
          const center = offsetBehind(lng, lat, bearing, 0.18);
          map.easeTo({
            center,
            bearing,
            pitch: 45,
            zoom: 15.2,
            duration: 280,
            essential: true,
          });
        }

        const stops = options.driverState.waitingStops;
        while (waitingMarkersRef.current.length < stops.length) {
          const chip = document.createElement('div');
          chip.className = 'waiting-stop-chip';
          const marker = new mapboxgl.Marker({ element: chip, anchor: 'bottom' }).addTo(map);
          waitingMarkersRef.current.push(marker);
        }
        while (waitingMarkersRef.current.length > stops.length) {
          waitingMarkersRef.current.pop()?.remove();
        }
        stops.forEach((stop, i) => {
          const marker = waitingMarkersRef.current[i];
          marker.setLngLat([stop.lng, stop.lat]);
          const el = marker.getElement();
          el.innerHTML = `<span class="waiting-stop-dot"></span><span class="waiting-chip-label">${stop.count} waiting</span>`;
        });
      } else {
        driverMarkerRef.current?.remove();
        driverMarkerRef.current = null;
        waitingMarkersRef.current.forEach((m) => m.remove());
        waitingMarkersRef.current = [];
      }
    };

    const controller: MapController = {
      isReady: () => readyRef.current,
      sync,
      flyToJeep: (lng, lat) => {
        map.flyTo({ center: [lng, lat], zoom: 14, speed: 1.2, essential: true });
      },
    };

    map.on('load', () => {
      for (const geometry of geometries) {
        const code = geometry.route.code;
        map.addSource(`route-${code}`, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: { code, color: geometry.route.color },
            geometry: { type: 'LineString', coordinates: geometry.coordinates },
          },
        });
        map.addLayer({
          id: `route-line-${code}`,
          type: 'line',
          source: `route-${code}`,
          paint: {
            'line-color': geometry.route.color,
            'line-width': 4,
            'line-opacity': 0.55,
          },
        });
      }

      map.addSource('jeeps', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.addLayer({
        id: 'jeep-circles',
        type: 'circle',
        source: 'jeeps',
        paint: {
          'circle-radius': ['case', ['==', ['get', 'selected'], true], 14, 10],
          'circle-color': ['get', 'color'],
          'circle-opacity': ['get', 'opacity'],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#F9FAFB',
        },
      });

      map.addLayer({
        id: 'jeep-labels',
        type: 'symbol',
        source: 'jeeps',
        layout: {
          'text-field': ['get', 'code'],
          'text-size': 10,
          'text-font': ['DIN Pro Medium', 'Arial Unicode MS Bold'],
          'text-allow-overlap': true,
        },
        paint: {
          'text-color': '#0a0f1e',
        },
      });

      map.addSource('waiting-stops', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.addLayer({
        id: 'waiting-circles',
        type: 'circle',
        source: 'waiting-stops',
        layout: { visibility: 'none' },
        paint: {
          'circle-radius': 5,
          'circle-color': '#FCD116',
          'circle-opacity': 0.95,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#0a0f1e',
        },
      });

      map.addSource('user-pin', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: { type: 'Point', coordinates: [123.89327, 10.30966] },
        },
      });

      map.addLayer({
        id: 'user-pin-layer',
        type: 'circle',
        source: 'user-pin',
        paint: {
          'circle-radius': 8,
          'circle-color': '#0038A8',
          'circle-stroke-width': 3,
          'circle-stroke-color': '#FCD116',
        },
      });

      readyRef.current = true;
      mapControllerRef.current = controller;
      onMapReadyRef.current?.();
    });

    map.on('click', 'jeep-circles', (e) => {
      if (driverModeRef.current) return;
      const feature = e.features?.[0];
      const id = feature?.properties?.id;
      if (typeof id === 'string') onJeepSelectRef.current(id);
    });

    map.on('mouseenter', 'jeep-circles', () => {
      if (!driverModeRef.current) map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'jeep-circles', () => {
      map.getCanvas().style.cursor = '';
    });

    mapRef.current = map;

    return () => {
      driverMarkerRef.current?.remove();
      waitingMarkersRef.current.forEach((m) => m.remove());
      mapControllerRef.current = null;
      map.remove();
      mapRef.current = null;
      readyRef.current = false;
    };
  }, [geometries, mapControllerRef]);

  return <div ref={containerRef} className="cebu-map" />;
}
