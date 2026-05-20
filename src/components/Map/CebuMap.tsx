import { memo, useEffect, useRef } from 'react';
import mapboxgl, { type MapEvent } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  buildJeepFeatures,
  buildWaitingStopFeatures,
  type MapController,
  type MapRenderOptions,
} from '../../map/mapController';
import { DRIVER_ROUTE_CODE } from '../../data/routes';
import type { Jeepney, RouteGeometry } from '../../types';
import { createUserLocationMarkerElement, loadJeepneyMapImage } from './MapMarker';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN ?? '';

type CebuMapProps = {
  geometries: RouteGeometry[];
  mapControllerRef: React.MutableRefObject<MapController | null>;
  driverMode: boolean;
  onJeepSelect: (id: string) => void;
  onMapReady?: () => void;
};

function offsetBehind(lng: number, lat: number, bearingDeg: number, km: number): [number, number] {
  const rad = ((bearingDeg + 180) * Math.PI) / 180;
  const dLng = ((km / 111.32) * Math.sin(rad)) / Math.cos((lat * Math.PI) / 180);
  const dLat = (km / 111.32) * Math.cos(rad);
  return [lng + dLng, lat + dLat];
}

function createDriverMarkerElement(): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'driver-vehicle-marker';
  // .driver-vehicle-inner rotates with bearing; label is a sibling so it stays upright.
  el.innerHTML = `
    <div class="driver-vehicle-card flex flex-col items-center rounded-xl border-2 border-[#fcd116] bg-white px-3 py-1.5 shadow-lg drop-shadow-md">
      <div class="driver-vehicle-inner">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ce1126" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19l-2 7H4l-2-7Z"/><path d="M7 18v2"/><path d="M17 18v2"/></svg>
      </div>
      <span class="driver-vehicle-code">${DRIVER_ROUTE_CODE}</span>
    </div>
  `;
  return el;
}

function CebuMapInner({
  geometries,
  mapControllerRef,
  driverMode,
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
  const passengerMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const lastPassengerKeyRef = useRef('');
  const geometriesRef = useRef(geometries);
  const lastDriverEaseRef = useRef(0);
  const lastFollowRef = useRef<{ lng: number; lat: number; bearing: number } | null>(null);
  const driverFramedRef = useRef(false);
  const followPausedUntilRef = useRef(0);
  const driverModeRef = useRef(driverMode);
  const lastRouteStyleKeyRef = useRef('');
  const lastUserLngLatRef = useRef<string>('');
  const lastWaitingKeyRef = useRef('');

  driverModeRef.current = driverMode;
  onJeepSelectRef.current = onJeepSelect;
  onMapReadyRef.current = onMapReady;
  geometriesRef.current = geometries;

  const shouldFollowDriver = (
    lng: number,
    lat: number,
    bearing: number,
    _tripActive: boolean,
  ) => {
    if (performance.now() < followPausedUntilRef.current) return false;

    const prev = lastFollowRef.current;
    if (!prev) return true;

    const movedM =
      Math.hypot((lng - prev.lng) * 111_320 * Math.cos((lat * Math.PI) / 180), (lat - prev.lat) * 111_320);
    const bearingDelta = Math.abs(((bearing - prev.bearing + 540) % 360) - 180);
    return movedM > 8 || bearingDelta > 4;
  };

  const pauseDriverFollow = () => {
    followPausedUntilRef.current = performance.now() + 8_000;
  };

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/navigation-night-v1',
      center: [123.8954, 10.3157],
      zoom: 13,
      pitch: 35,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
    });
    map.touchZoomRotate.disableRotation();

    // Only pause follow on genuine user input — NOT programmatic easeTo/flyTo.
    // Mapbox fires zoomstart/dragstart for both; originalEvent is set only for DOM events.
    const pauseFollowOnUserInput = (e: MapEvent) => {
      if ('originalEvent' in e && e.originalEvent != null) pauseDriverFollow();
    };
    map.on('dragstart', pauseFollowOnUserInput);
    map.on('zoomstart', pauseFollowOnUserInput);

    const applyRouteStyles = (options: MapRenderOptions) => {
      const geoms = geometriesRef.current;
      const styleKey = `${options.driverMode}:${options.visibleRoutes === 'all' ? 'all' : [...options.visibleRoutes].sort().join(',')}`;
      if (styleKey === lastRouteStyleKeyRef.current) return;
      lastRouteStyleKeyRef.current = styleKey;

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
    };

    const sync = (jeepneys: Jeepney[], options: MapRenderOptions) => {
      if (!readyRef.current) return;
      const geoms = geometriesRef.current;

      applyRouteStyles(options);

      const jeepSource = map.getSource('jeeps') as mapboxgl.GeoJSONSource | undefined;
      jeepSource?.setData({
        type: 'FeatureCollection',
        features: buildJeepFeatures(jeepneys, geoms, options),
      });

      const jeepLayerVisibility = options.driverMode ? 'none' : 'visible';
      if (map.getLayer('jeep-glow')) {
        map.setLayoutProperty('jeep-glow', 'visibility', jeepLayerVisibility);
      }
      if (map.getLayer('jeep-circle')) {
        map.setLayoutProperty('jeep-circle', 'visibility', jeepLayerVisibility);
      }
      if (map.getLayer('jeep-icons')) {
        map.setLayoutProperty('jeep-icons', 'visibility', jeepLayerVisibility);
      }

      if (userMarkerRef.current) {
        const key = `${options.userLocation.lng.toFixed(5)},${options.userLocation.lat.toFixed(5)}`;
        if (key !== lastUserLngLatRef.current) {
          lastUserLngLatRef.current = key;
          userMarkerRef.current.setLngLat([options.userLocation.lng, options.userLocation.lat]);
        }
        userMarkerRef.current
          .getElement()
          .style.setProperty('display', options.driverMode ? 'none' : 'flex');
      }

      const waitSource = map.getSource('waiting-stops') as mapboxgl.GeoJSONSource | undefined;
      waitSource?.setData(buildWaitingStopFeatures(options.driverState, options.pulsePhase));

      if (options.driverMode && options.driverState?.position) {
        const { lng, lat, bearing } = options.driverState.position;

        if (!driverMarkerRef.current) {
          driverMarkerRef.current = new mapboxgl.Marker({
            element: createDriverMarkerElement(),
            anchor: 'center',
          })
            .setLngLat([lng, lat])
            .addTo(map);
        } else {
          driverMarkerRef.current.setLngLat([lng, lat]);
        }

        const inner = driverMarkerRef.current.getElement().querySelector<HTMLElement>('.driver-vehicle-inner');
        if (inner) {
          const rounded = Math.round(bearing);
          if (inner.dataset.bearing !== String(rounded)) {
            inner.dataset.bearing = String(rounded);
            inner.style.transform = `rotate(${bearing}deg)`;
          }
        }

        const tripActive = options.driverState.tripActive;
        const tripStatus = options.driverState.tripStatus;
        const onTrip = tripStatus === 'on_trip';

        if (!driverFramedRef.current) {
          driverFramedRef.current = true;
          const center = offsetBehind(lng, lat, bearing, 0.18);
          map.jumpTo({ center, bearing, pitch: onTrip ? 50 : 35, zoom: onTrip ? 16 : 14.5 });
        }

        const now = performance.now();
        // Throttle must exceed animation duration so animations don't overlap.
        // on_trip: 500 ms animation → 700 ms throttle. idle: 300 ms → 700 ms.
        if (
          shouldFollowDriver(lng, lat, bearing, tripActive) &&
          now - lastDriverEaseRef.current > 700
        ) {
          lastDriverEaseRef.current = now;
          lastFollowRef.current = { lng, lat, bearing };
          const center = offsetBehind(lng, lat, bearing, 0.18);
          map.easeTo({
            center,
            bearing,
            pitch: onTrip ? 50 : 35,
            zoom: onTrip ? 16 : 14.5,
            duration: onTrip ? 500 : 300,
            essential: false,
          });
        }

        // Passenger pickup pins
        const pins = options.driverState.passengerPins ?? [];
        const pinKey = pins.map((p) => `${p.id}:${p.status}`).join('|');
        if (pinKey !== lastPassengerKeyRef.current) {
          lastPassengerKeyRef.current = pinKey;
          while (passengerMarkersRef.current.length < pins.length) {
            const el = document.createElement('div');
            el.className = 'passenger-pin';
            const marker = new mapboxgl.Marker({ element: el, anchor: 'center' }).addTo(map);
            passengerMarkersRef.current.push(marker);
          }
          while (passengerMarkersRef.current.length > pins.length) {
            passengerMarkersRef.current.pop()?.remove();
          }
          pins.forEach((pin, i) => {
            const marker = passengerMarkersRef.current[i];
            marker.setLngLat([pin.lng, pin.lat]);
            const el = marker.getElement();
            el.className = `passenger-pin passenger-pin--${pin.status}`;
            el.textContent = pin.initial;
          });
        }

        const stops = options.driverState.waitingStops;
        const waitingKey = stops.map((s) => `${s.lng},${s.lat},${s.count}`).join('|');
        if (waitingKey !== lastWaitingKeyRef.current) {
          lastWaitingKeyRef.current = waitingKey;
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
        }
      } else {
        driverMarkerRef.current?.remove();
        driverMarkerRef.current = null;
        waitingMarkersRef.current.forEach((m) => m.remove());
        waitingMarkersRef.current = [];
        passengerMarkersRef.current.forEach((m) => m.remove());
        passengerMarkersRef.current = [];
        lastFollowRef.current = null;
        lastWaitingKeyRef.current = '';
        lastPassengerKeyRef.current = '';
        driverFramedRef.current = false;
      }
    };

    const controller: MapController = {
      isReady: () => readyRef.current,
      sync,
      flyToJeep: (lng, lat) => {
        map.flyTo({ center: [lng, lat], zoom: 14.5, speed: 1.4, essential: true });
      },
      resumeFollow: () => {
        followPausedUntilRef.current = 0;
        driverFramedRef.current = false;
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
          paint: {
            'line-color': geometry.route.color,
            'line-width': 5,
            'line-opacity': 0.88,
          },
        });
      }

      map.addSource('waiting-stops', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      const finishMapSetup = () => {
        if (map.getSource('jeeps')) {
          readyRef.current = true;
          mapControllerRef.current = controller;
          onMapReadyRef.current?.();
          return;
        }

        map.addSource('jeeps', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });

        // Outer diffuse glow ring — always on, larger when selected/arriving
        map.addLayer({
          id: 'jeep-glow',
          type: 'circle',
          source: 'jeeps',
          paint: {
            'circle-radius': [
              'case',
              ['==', ['get', 'selected'], true], 32,
              ['==', ['get', 'arriving'], true], 26,
              20,
            ],
            'circle-color': ['get', 'color'],
            'circle-opacity': [
              'case',
              ['==', ['get', 'selected'], true], 0.38,
              ['==', ['get', 'arriving'], true], 0.28,
              0.2,
            ],
            'circle-blur': 0.65,
          },
        });

        // Solid colored disk with white border ring
        map.addLayer({
          id: 'jeep-circle',
          type: 'circle',
          source: 'jeeps',
          paint: {
            'circle-radius': [
              'interpolate', ['linear'], ['zoom'],
              11, 9,
              14, 13,
              16, 16,
            ],
            'circle-color': ['get', 'color'],
            'circle-opacity': ['get', 'opacity'],
            'circle-stroke-color': 'rgba(255,255,255,0.95)',
            'circle-stroke-width': 2.5,
          },
        });

        // White navigation arrow on top of the disk
        map.addLayer({
          id: 'jeep-icons',
          type: 'symbol',
          source: 'jeeps',
          layout: {
            'icon-image': 'jeepney',
            'icon-size': [
              'interpolate', ['linear'], ['zoom'],
              11, 0.55,
              14, 0.72,
              16, 0.85,
            ],
            'icon-rotate': ['get', 'bearing'],
            'icon-rotation-alignment': 'map',
            'icon-allow-overlap': true,
            'icon-ignore-placement': true,
          },
          paint: {
            'icon-color': 'rgba(255,255,255,0.95)',
            'icon-opacity': ['get', 'opacity'],
          },
        });

        userMarkerRef.current = new mapboxgl.Marker({
          element: createUserLocationMarkerElement(),
          anchor: 'center',
        })
          .setLngLat([123.89327, 10.30966])
          .addTo(map);

        readyRef.current = true;
        mapControllerRef.current = controller;
        onMapReadyRef.current?.();
      };

      void loadJeepneyMapImage(map)
        .then(finishMapSetup)
        .catch(() => finishMapSetup());
    });

    const handleJeepClick = (e: mapboxgl.MapMouseEvent & { features?: mapboxgl.MapboxGeoJSONFeature[] }) => {
      if (driverModeRef.current) return;
      const feature = e.features?.[0];
      const id = feature?.properties?.id;
      if (typeof id === 'string') onJeepSelectRef.current(id);
    };
    map.on('click', 'jeep-circle', handleJeepClick);
    map.on('click', 'jeep-icons', handleJeepClick);

    map.on('mouseenter', 'jeep-circle', () => {
      if (!driverModeRef.current) map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'jeep-circle', () => {
      map.getCanvas().style.cursor = '';
    });
    map.on('mouseenter', 'jeep-icons', () => {
      if (!driverModeRef.current) map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'jeep-icons', () => {
      map.getCanvas().style.cursor = '';
    });

    mapRef.current = map;

    return () => {
      map.off('dragstart', pauseFollowOnUserInput);
      map.off('zoomstart', pauseFollowOnUserInput);
      userMarkerRef.current?.remove();
      driverMarkerRef.current?.remove();
      waitingMarkersRef.current.forEach((m) => m.remove());
      passengerMarkersRef.current.forEach((m) => m.remove());
      mapControllerRef.current = null;
      map.remove();
      mapRef.current = null;
      readyRef.current = false;
    };
  }, [geometries, mapControllerRef]);

  return <div ref={containerRef} className="cebu-map" />;
}

export const CebuMap = memo(CebuMapInner);
