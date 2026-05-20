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

/** Directional puck (wide tail, narrow nose) — reads as vehicle heading, not a boat. */
function createJeepneyIconData(): ImageData {
  const size = 36;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = '#ffffff';

  const cx = size / 2;

  ctx.beginPath();
  ctx.moveTo(cx, 6);
  ctx.lineTo(cx + 9, 23);
  ctx.quadraticCurveTo(cx, 29, cx - 9, 23);
  ctx.closePath();
  ctx.fill();

  return ctx.getImageData(0, 0, size, size);
}

function createUserMarkerElement(): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'user-location-marker';
  el.innerHTML = `
    <div class="user-marker-ring"></div>
    <div class="user-marker-dot"></div>
  `;
  return el;
}

function createDriverMarkerElement(): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'driver-vehicle-marker';
  el.innerHTML = `<div class="driver-vehicle-inner"><div class="driver-vehicle-arrow"></div><span class="driver-vehicle-code">04C</span></div>`;
  return el;
}

function offsetBehind(lng: number, lat: number, bearingDeg: number, km: number): [number, number] {
  const rad = ((bearingDeg + 180) * Math.PI) / 180;
  const dLng = ((km / 111.32) * Math.sin(rad)) / Math.cos((lat * Math.PI) / 180);
  const dLat = (km / 111.32) * Math.cos(rad);
  return [lng + dLng, lat + dLat];
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
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const waitingMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const geometriesRef = useRef(geometries);
  const lastDriverEaseRef = useRef(0);
  const lastFollowRef = useRef<{ lng: number; lat: number; bearing: number } | null>(null);
  const driverFramedRef = useRef(false);
  const followPausedUntilRef = useRef(0);
  const driverModeRef = useRef(mapRenderOptions.driverMode);
  driverModeRef.current = mapRenderOptions.driverMode;

  const shouldFollowDriver = (
    lng: number,
    lat: number,
    bearing: number,
    tripActive: boolean,
  ) => {
    if (!tripActive) return false;
    if (performance.now() < followPausedUntilRef.current) return false;

    const prev = lastFollowRef.current;
    if (!prev) return true;

    const movedM =
      Math.hypot((lng - prev.lng) * 111_320 * Math.cos((lat * Math.PI) / 180), (lat - prev.lat) * 111_320);
    const bearingDelta = Math.abs(((bearing - prev.bearing + 540) % 360) - 180);
    return movedM > 8 || bearingDelta > 4;
  };

  const pauseDriverFollow = () => {
    followPausedUntilRef.current = performance.now() + 10_000;
  };
  onJeepSelectRef.current = onJeepSelect;
  onMapReadyRef.current = onMapReady;
  geometriesRef.current = geometries;

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/navigation-night-v1',
      center: [123.8954, 10.3157],
      zoom: 13,
      pitch: 35,
      attributionControl: false,
    });

    const pauseFollow = () => pauseDriverFollow();
    map.on('dragstart', pauseFollow);
    map.on('zoomstart', pauseFollow);
    map.on('rotatestart', pauseFollow);
    map.on('pitchstart', pauseFollow);

    const sync = (jeepneys: Jeepney[], options: MapRenderOptions) => {
      if (!readyRef.current) return;
      const geoms = geometriesRef.current;

      for (const geometry of geoms) {
        const code = geometry.route.code;
        const lineId = `route-line-${code}`;
        const casingId = `route-casing-${code}`;
        if (!map.getLayer(lineId)) continue;

        if (options.driverMode) {
          const isDriver = code === DRIVER_ROUTE_CODE;
          map.setPaintProperty(lineId, 'line-width', isDriver ? 6 : 3);
          map.setPaintProperty(lineId, 'line-opacity', isDriver ? 0.95 : 0.1);
          map.setPaintProperty(casingId, 'line-opacity', isDriver ? 0.3 : 0.05);
        } else {
          const visible =
            options.visibleRoutes === 'all' || options.visibleRoutes.has(code);
          map.setLayoutProperty(lineId, 'visibility', visible ? 'visible' : 'none');
          map.setLayoutProperty(casingId, 'visibility', visible ? 'visible' : 'none');
          map.setPaintProperty(lineId, 'line-width', 5);
          map.setPaintProperty(lineId, 'line-opacity', 0.88);
          map.setPaintProperty(casingId, 'line-opacity', 0.28);
        }
      }

      const jeepSource = map.getSource('jeeps') as mapboxgl.GeoJSONSource | undefined;
      jeepSource?.setData({
        type: 'FeatureCollection',
        features: buildJeepFeatures(jeepneys, geoms, options),
      });

      if (map.getLayer('jeep-glow')) {
        map.setPaintProperty('jeep-glow', 'circle-radius', [
          'case',
          ['==', ['get', 'selected'], true], 28,
          ['==', ['get', 'arriving'], true], 22,
          0,
        ]);
      }

      if (map.getLayer('jeep-icons')) {
        map.setLayoutProperty(
          'jeep-icons',
          'visibility',
          options.driverMode ? 'none' : 'visible',
        );
      }

      // Update user DOM marker position
      if (userMarkerRef.current) {
        userMarkerRef.current.setLngLat([options.userLocation.lng, options.userLocation.lat]);
        userMarkerRef.current
          .getElement()
          .style.setProperty('display', options.driverMode ? 'none' : 'flex');
      }

      const waitSource = map.getSource('waiting-stops') as mapboxgl.GeoJSONSource | undefined;
      waitSource?.setData(buildWaitingStopFeatures(options.driverState, options.pulsePhase));

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

        const tripActive = options.driverState.tripActive;
        if (!tripActive && !driverFramedRef.current) {
          driverFramedRef.current = true;
          const center = offsetBehind(lng, lat, bearing, 0.18);
          map.jumpTo({ center, bearing, pitch: 45, zoom: 15.2 });
        }

        const now = performance.now();
        if (
          shouldFollowDriver(lng, lat, bearing, tripActive) &&
          now - lastDriverEaseRef.current > 450
        ) {
          lastDriverEaseRef.current = now;
          lastFollowRef.current = { lng, lat, bearing };
          const center = offsetBehind(lng, lat, bearing, 0.18);
          map.easeTo({
            center,
            bearing,
            pitch: 45,
            zoom: 15.2,
            duration: 600,
            essential: false,
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
          el.innerHTML = `<span class="waiting-stop-dot"></span><span class="waiting-chip-label">${stop.count}</span>`;
        });
      } else {
        driverMarkerRef.current?.remove();
        driverMarkerRef.current = null;
        waitingMarkersRef.current.forEach((m) => m.remove());
        waitingMarkersRef.current = [];
        lastFollowRef.current = null;
        driverFramedRef.current = false;
      }
    };

    const controller: MapController = {
      isReady: () => readyRef.current,
      sync,
      flyToJeep: (lng, lat) => {
        map.flyTo({ center: [lng, lat], zoom: 14.5, speed: 1.4, essential: true });
      },
    };

    map.on('load', () => {
      // Custom jeepney icon (SDF so it can be tinted with route color)
      map.addImage('jeepney', createJeepneyIconData(), { sdf: true });

      // Route layers: casing underneath colored line
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
          id: `route-casing-${code}`,
          type: 'line',
          source: `route-${code}`,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#000000', 'line-width': 9, 'line-opacity': 0.28 },
        });

        map.addLayer({
          id: `route-line-${code}`,
          type: 'line',
          source: `route-${code}`,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': geometry.route.color, 'line-width': 5, 'line-opacity': 0.88 },
        });
      }

      // Jeep data source
      map.addSource('jeeps', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      // Glow for selected / arriving jeepneys
      map.addLayer({
        id: 'jeep-glow',
        type: 'circle',
        source: 'jeeps',
        paint: {
          'circle-radius': 0,
          'circle-color': ['get', 'color'],
          'circle-opacity': 0.22,
          'circle-blur': 0.6,
        },
      });

      // Jeepney icon (SDF, rotated by bearing)
      map.addLayer({
        id: 'jeep-icons',
        type: 'symbol',
        source: 'jeeps',
        layout: {
          'icon-image': 'jeepney',
          'icon-size': [
            'interpolate', ['linear'], ['zoom'],
            11, 0.85,
            14, 1.15,
            16, 1.35,
          ],
          'icon-rotate': ['get', 'bearing'],
          'icon-rotation-alignment': 'map',
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
        },
        paint: {
          'icon-color': ['get', 'color'],
          'icon-opacity': ['get', 'opacity'],
          'icon-halo-color': 'rgba(255,255,255,0.9)',
          'icon-halo-width': 2,
        },
      });

      // Waiting stops for driver mode
      map.addSource('waiting-stops', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      // User location DOM marker (pulsing blue dot)
      const userEl = createUserMarkerElement();
      const fallbackPos = [123.89327, 10.30966] as [number, number];
      userMarkerRef.current = new mapboxgl.Marker({ element: userEl, anchor: 'center' })
        .setLngLat(fallbackPos)
        .addTo(map);

      readyRef.current = true;
      mapControllerRef.current = controller;
      onMapReadyRef.current?.();
    });

    map.on('click', 'jeep-icons', (e) => {
      if (driverModeRef.current) return;
      const feature = e.features?.[0];
      const id = feature?.properties?.id;
      if (typeof id === 'string') onJeepSelectRef.current(id);
    });

    map.on('mouseenter', 'jeep-icons', () => {
      if (!driverModeRef.current) map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'jeep-icons', () => {
      map.getCanvas().style.cursor = '';
    });

    mapRef.current = map;

    return () => {
      map.off('dragstart', pauseFollow);
      map.off('zoomstart', pauseFollow);
      map.off('rotatestart', pauseFollow);
      map.off('pitchstart', pauseFollow);
      userMarkerRef.current?.remove();
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
