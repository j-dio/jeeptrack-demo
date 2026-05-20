import { useCallback, useEffect, useRef, useState } from 'react';
import * as turf from '@turf/turf';
import { ROUTES } from '../data/routes';
import { createJeepneyFleet } from '../data/jeepneys';
import type { DriverMapState, MapController, MapRenderOptions } from '../map/mapController';
import type { Jeepney, RouteGeometry } from '../types';
import { getCongestionAtKm } from '../utils/geometry';

const UI_UPDATE_MS = 2000;
const SYNC_INTERVAL_MS = 66; // ~15 Hz — throttles GeoJSON pushes to Mapbox

function getLineForDirection(geometry: RouteGeometry, direction: Jeepney['direction']) {
  if (direction === 'outbound') return turf.lineString(geometry.coordinates);
  return turf.lineString([...geometry.coordinates].reverse());
}

function positionAlong(
  geometry: RouteGeometry,
  direction: Jeepney['direction'],
  distanceKm: number,
): { lng: number; lat: number; bearing: number } {
  const line = getLineForDirection(geometry, direction);
  const clamped = Math.max(0, Math.min(distanceKm, geometry.pathLengthKm));
  const point = turf.along(line, clamped, { units: 'kilometers' });
  const [lng, lat] = point.geometry.coordinates;
  const lookAhead = Math.min(clamped + 0.02, geometry.pathLengthKm);
  const ahead = turf.along(line, lookAhead, { units: 'kilometers' });
  const bearing = turf.bearing(point, ahead);
  return { lng, lat, bearing: Number.isFinite(bearing) ? bearing : 0 };
}

function updateAccelState(prevSpeed: number, speed: number): Jeepney['accelState'] {
  if (speed < 2) return 'stationary';
  const delta = speed - prevSpeed;
  if (delta > 1.5) return 'accelerating';
  if (delta < -1.5) return 'decelerating';
  return 'cruising';
}

export function useSimulation(
  mapControllerRef: React.RefObject<MapController | null>,
  driverMapStateRef: React.RefObject<DriverMapState | null>,
  geometries: RouteGeometry[],
  geometryByCode: Record<string, RouteGeometry>,
) {
  const jeepneysRef = useRef<Jeepney[]>([]);
  const initializedRef = useRef(false);
  const mapRenderOptionsRef = useRef<MapRenderOptions | null>(null);
  const lastUIUpdateRef = useRef(0);
  const lastSyncRef = useRef(0);
  const pulsePhaseRef = useRef(0);
  const rafRef = useRef<number>(0);
  const lastFrameRef = useRef<number | null>(null);
  const geometryByCodeRef = useRef(geometryByCode);
  geometryByCodeRef.current = geometryByCode;

  if (!initializedRef.current && geometries.length > 0) {
    const fleet = createJeepneyFleet(ROUTES);
    jeepneysRef.current = fleet.map((jeep) => {
      const geometry = geometryByCode[jeep.routeCode];
      if (!geometry) return jeep;
      // Kuya Joel starts at km 0.4 — behind the passenger at km ~1.3 (approaching).
      // Other 62B jeeps start past km 2.0 so they've already passed the passenger (heading away).
      const distanceAlongKm =
        jeep.id === '62B-1'
          ? 0.4
          : jeep.routeCode === '62B'
            ? 2.0 + Math.random() * (geometry.pathLengthKm * 0.6)
            : Math.random() * geometry.pathLengthKm * 0.92;
      const pos = positionAlong(geometry, 'outbound', distanceAlongKm);
      return {
        ...jeep,
        distanceAlongKm,
        lng: pos.lng,
        lat: pos.lat,
        prevLng: pos.lng,
        prevLat: pos.lat,
        bearing: pos.bearing,
      };
    });
    initializedRef.current = true;
  }

  const [jeepneysUI, setJeepneysUI] = useState<Jeepney[]>(() => [...jeepneysRef.current]);

  const setMapRenderOptions = useCallback((options: MapRenderOptions) => {
    mapRenderOptionsRef.current = options;
  }, []);

  const step = useCallback(
    (now: number) => {
      const last = lastFrameRef.current ?? now;
      const dtHours = Math.min((now - last) / 3_600_000, 0.05);
      lastFrameRef.current = now;
      const timeSec = now / 1000;
      pulsePhaseRef.current = timeSec;

      const byCode = geometryByCodeRef.current;

      const updated = jeepneysRef.current.map((jeep) => {
        const geometry = byCode[jeep.routeCode];
        if (!geometry) return jeep;

        const outboundKm =
          jeep.direction === 'outbound'
            ? jeep.distanceAlongKm
            : geometry.pathLengthKm - jeep.distanceAlongKm;

        const congestion = getCongestionAtKm(geometry, outboundKm);
        const noise = 0.85 + 0.15 * Math.sin(timeSec * 0.7 + jeep.noisePhase);
        const prevSpeed = jeep.speedKmh;
        const speedKmh = Math.max(0, jeep.baseSpeedKmh * congestion * noise);

        let distanceAlongKm = jeep.distanceAlongKm;
        let direction = jeep.direction;
        let active = jeep.active;

        const deltaKm = speedKmh * dtHours;

        if (direction === 'outbound') {
          distanceAlongKm += deltaKm;
          if (distanceAlongKm >= geometry.pathLengthKm) {
            distanceAlongKm = geometry.pathLengthKm;
            direction = 'inbound';
            active = false;
          }
        } else {
          distanceAlongKm -= deltaKm;
          if (distanceAlongKm <= 0) {
            distanceAlongKm = 0;
            direction = 'outbound';
            active = true;
          }
        }

        const pos = positionAlong(geometry, direction, distanceAlongKm);
        const accelState = updateAccelState(prevSpeed, speedKmh);

        const nearEnd =
          direction === 'outbound'
            ? geometry.pathLengthKm - distanceAlongKm < 0.15
            : distanceAlongKm < 0.15;
        const deceleratingNearStop =
          nearEnd && (accelState === 'decelerating' || speedKmh < jeep.baseSpeedKmh * 0.5);

        return {
          ...jeep,
          direction,
          active,
          distanceAlongKm,
          speedKmh,
          accelState,
          deceleratingNearStop,
          lng: pos.lng,
          lat: pos.lat,
          prevLng: jeep.lng,
          prevLat: jeep.lat,
          bearing: pos.bearing,
          lastUpdated: Date.now(),
        };
      });

      jeepneysRef.current = updated;

      const controller = mapControllerRef.current;
      const renderOpts = mapRenderOptionsRef.current;
      if (controller?.isReady() && renderOpts && now - lastSyncRef.current >= SYNC_INTERVAL_MS) {
        lastSyncRef.current = now;
        const driverState = renderOpts.driverMode ? driverMapStateRef.current : null;
        controller.sync(updated, {
          ...renderOpts,
          driverState,
          pulsePhase: pulsePhaseRef.current,
        });
      }

      if (now - lastUIUpdateRef.current >= UI_UPDATE_MS) {
        lastUIUpdateRef.current = now;
        setJeepneysUI([...updated]);
      }

      rafRef.current = requestAnimationFrame(step);
    },
    [mapControllerRef, driverMapStateRef],
  );

  useEffect(() => {
    if (!initializedRef.current) return;
    lastUIUpdateRef.current = 0;
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [step]);

  const getJeepneys = useCallback(() => jeepneysRef.current, []);

  return { jeepneysUI, getJeepneys, setMapRenderOptions };
}
