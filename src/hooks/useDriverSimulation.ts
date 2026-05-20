import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import type { DriverMapState } from '../map/mapController';
import * as turf from '@turf/turf';
import { STOPS_BY_ROUTE } from '../data/stops';
import { phrase } from '../data/microcopy';
import type { AccelState, RouteGeometry } from '../types';

const UI_UPDATE_MS = 2000;
const DRIVER_ROUTE = '04C';

export type DriverSnapshot = {
  position: { lng: number; lat: number; bearing: number } | null;
  speedKmh: number;
  accelState: AccelState;
  statusBisaya: string;
  statusEnglish: string;
  nextStopName: string;
  nextStopDistanceKm: number;
  waitingByStop: { lng: number; lat: number; label: string; count: number }[];
  waitingAhead: number;
  tripActive: boolean;
  isOffRoute: boolean;
};

function randomWaitingCounts(stopCount: number): number[] {
  return Array.from({ length: stopCount }, () => Math.floor(Math.random() * 8));
}

function findNextStop(geometry: RouteGeometry, distanceKm: number) {
  const stops = STOPS_BY_ROUTE[DRIVER_ROUTE] ?? [];
  const line = turf.lineString(geometry.coordinates);
  let best: { name: string; distanceKm: number } | null = null;

  for (const stop of stops) {
    const stopPoint = turf.point([stop.lng, stop.lat]);
    const alongStop = turf.nearestPointOnLine(line, stopPoint);
    const stopLoc = turf.length(
      turf.lineSlice(turf.point(geometry.coordinates[0]), alongStop, line),
      { units: 'kilometers' },
    );
    if (stopLoc <= distanceKm + 0.02) continue;
    const dist = stopLoc - distanceKm;
    if (!best || dist < best.distanceKm) {
      best = { name: stop.bisayaLabel, distanceKm: dist };
    }
  }

  return best ?? { name: stops[stops.length - 1]?.bisayaLabel ?? 'Carbon', distanceKm: 0.3 };
}

function waitingAhead(
  geometry: RouteGeometry,
  distanceKm: number,
  counts: number[],
): number {
  const stops = STOPS_BY_ROUTE[DRIVER_ROUTE] ?? [];
  const line = turf.lineString(geometry.coordinates);
  let sum = 0;

  stops.forEach((stop, i) => {
    const stopPoint = turf.point([stop.lng, stop.lat]);
    const alongStop = turf.nearestPointOnLine(line, stopPoint);
    const stopLoc = turf.length(
      turf.lineSlice(turf.point(geometry.coordinates[0]), alongStop, line),
      { units: 'kilometers' },
    );
    if (stopLoc > distanceKm) sum += counts[i] ?? 0;
  });

  return sum;
}

export function useDriverSimulation(
  geometry: RouteGeometry | undefined,
  enabled: boolean,
  driverMapStateRef?: MutableRefObject<DriverMapState | null>,
) {
  const distanceKmRef = useRef(0);
  const offRouteOffsetRef = useRef<[number, number] | null>(null);
  const lastFrameRef = useRef<number | null>(null);
  const snapshotRef = useRef<DriverSnapshot>({
    position: null,
    speedKmh: 0,
    accelState: 'stationary',
    statusBisaya: phrase('stationary').bisaya,
    statusEnglish: phrase('stationary').english,
    nextStopName: '—',
    nextStopDistanceKm: 0,
    waitingByStop: [],
    waitingAhead: 0,
    tripActive: false,
    isOffRoute: false,
  });

  const [tripActive, setTripActive] = useState(false);
  const [driverUI, setDriverUI] = useState<DriverSnapshot>(() => snapshotRef.current);
  const stopCountsRef = useRef<number[]>(
    randomWaitingCounts(STOPS_BY_ROUTE[DRIVER_ROUTE]?.length ?? 0),
  );
  const lastUIUpdateRef = useRef(0);

  const recomputeSnapshot = useCallback(
    (now: number) => {
      if (!geometry) return;

      const line = turf.lineString(geometry.coordinates);
      const point = turf.along(line, distanceKmRef.current, { units: 'kilometers' });
      let [lng, lat] = point.geometry.coordinates;
      const look = turf.along(
        line,
        Math.min(distanceKmRef.current + 0.02, geometry.pathLengthKm),
        { units: 'kilometers' },
      );
      const bearing = turf.bearing(point, look);

      if (offRouteOffsetRef.current) {
        lng += offRouteOffsetRef.current[0];
        lat += offRouteOffsetRef.current[1];
      }

      const speedKmh = tripActive ? 32 : 0;
      const accelState: AccelState = tripActive ? 'cruising' : 'stationary';
      const statusKey = tripActive ? 'cruising' : 'stationary';
      const copy = phrase(statusKey);
      const next = findNextStop(geometry, distanceKmRef.current);
      const stops = STOPS_BY_ROUTE[DRIVER_ROUTE] ?? [];
      const waitingByStop = stops.map((stop, i) => ({
        lng: stop.lng,
        lat: stop.lat,
        label: stop.bisayaLabel,
        count: stopCountsRef.current[i] ?? 0,
      }));

      let isOffRoute = false;
      if (offRouteOffsetRef.current) {
        const distM = turf.pointToLineDistance(turf.point([lng, lat]), line, {
          units: 'meters',
        });
        isOffRoute = distM > 200;
      }

      snapshotRef.current = {
        position: { lng, lat, bearing: Number.isFinite(bearing) ? bearing : 0 },
        speedKmh,
        accelState,
        statusBisaya: copy.bisaya,
        statusEnglish: copy.english,
        nextStopName: next.name,
        nextStopDistanceKm: next.distanceKm,
        waitingByStop,
        waitingAhead: tripActive
          ? waitingAhead(geometry, distanceKmRef.current, stopCountsRef.current)
          : 0,
        tripActive,
        isOffRoute,
      };

      if (driverMapStateRef) {
        driverMapStateRef.current = {
          position: snapshotRef.current.position,
          waitingStops: snapshotRef.current.waitingByStop,
          tripActive: snapshotRef.current.tripActive,
        };
      }

      if (now - lastUIUpdateRef.current >= UI_UPDATE_MS) {
        lastUIUpdateRef.current = now;
        setDriverUI({ ...snapshotRef.current });
      }
    },
    [geometry, tripActive, driverMapStateRef],
  );

  useEffect(() => {
    if (!enabled || !geometry) {
      return;
    }

    let raf = 0;
    const step = (now: number) => {
      if (tripActive) {
        const last = lastFrameRef.current ?? now;
        const dtHours = Math.min((now - last) / 3_600_000, 0.05);
        lastFrameRef.current = now;

        const speed = 32;
        let next = distanceKmRef.current + speed * dtHours;
        if (next >= geometry.pathLengthKm) next = 0;
        distanceKmRef.current = next;
      }

      recomputeSnapshot(now);
      raf = requestAnimationFrame(step);
    };

    lastFrameRef.current = null;
    recomputeSnapshot(performance.now());
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [enabled, tripActive, geometry, recomputeSnapshot]);

  useEffect(() => {
    if (!tripActive) return;
    const id = window.setInterval(() => {
      stopCountsRef.current = randomWaitingCounts(STOPS_BY_ROUTE[DRIVER_ROUTE]?.length ?? 0);
      recomputeSnapshot(performance.now());
    }, 8000);
    return () => clearInterval(id);
  }, [tripActive, recomputeSnapshot]);

  useEffect(() => {
    recomputeSnapshot(performance.now());
    lastUIUpdateRef.current = 0;
  }, [tripActive, enabled, recomputeSnapshot]);

  const simulateOffRoute = useCallback(() => {
    offRouteOffsetRef.current = [0.0028, 0.0022];
    recomputeSnapshot(performance.now());
    setDriverUI({ ...snapshotRef.current });
  }, [recomputeSnapshot]);

  const clearOffRoute = useCallback(() => {
    offRouteOffsetRef.current = null;
    recomputeSnapshot(performance.now());
    setDriverUI({ ...snapshotRef.current });
  }, [recomputeSnapshot]);

  const getSnapshot = useCallback(() => snapshotRef.current, []);

  return {
    driverUI,
    getSnapshot,
    tripActive,
    setTripActive,
    simulateOffRoute,
    clearOffRoute,
    isOffRoute: snapshotRef.current.isOffRoute,
  };
}
