import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as turf from '@turf/turf';
import { ROUTES } from '../data/routes';
import { createJeepneyFleet } from '../data/jeepneys';
import type { DriverMapState, MapController, MapRenderOptions } from '../map/mapController';
import type { Jeepney, RouteGeometry } from '../types';
import { buildRouteGeometry, getCongestionAtKm } from '../utils/geometry';

const UI_UPDATE_MS = 2000;

function getLineForDirection(geometry: RouteGeometry, direction: Jeepney['direction']) {
  if (direction === 'outbound') {
    return turf.lineString(geometry.coordinates);
  }
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
) {
  const geometries = useMemo(() => ROUTES.map(buildRouteGeometry), []);
  const geometryByCode = useMemo(
    () => Object.fromEntries(geometries.map((g) => [g.route.code, g])),
    [geometries],
  );

  const jeepneysRef = useRef<Jeepney[]>(createJeepneyFleet(ROUTES));
  const initializedRef = useRef(false);
  const mapRenderOptionsRef = useRef<MapRenderOptions | null>(null);
  const lastUIUpdateRef = useRef(0);
  const pulsePhaseRef = useRef(0);

  if (!initializedRef.current) {
    jeepneysRef.current = jeepneysRef.current.map((jeep) => {
      const geometry = geometryByCode[jeep.routeCode];
      if (!geometry) return jeep;
      const distanceAlongKm = Math.random() * geometry.pathLengthKm * 0.92;
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
  const rafRef = useRef<number>(0);
  const lastFrameRef = useRef<number | null>(null);

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

      const updated = jeepneysRef.current.map((jeep) => {
        const geometry = geometryByCode[jeep.routeCode];
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
          lastUpdated: now,
        };
      });

      jeepneysRef.current = updated;

      const controller = mapControllerRef.current;
      const renderOpts = mapRenderOptionsRef.current;
      if (controller?.isReady() && renderOpts) {
        const driverState = renderOpts.driverMode
          ? driverMapStateRef.current
          : null;
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
    [geometryByCode, mapControllerRef, driverMapStateRef],
  );

  useEffect(() => {
    lastUIUpdateRef.current = 0;
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [step]);

  const getJeepneys = useCallback(() => jeepneysRef.current, []);

  return {
    jeepneysUI,
    getJeepneys,
    geometries,
    geometryByCode,
    setMapRenderOptions,
  };
}
