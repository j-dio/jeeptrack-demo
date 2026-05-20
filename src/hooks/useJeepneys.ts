import { useMemo } from 'react';
import * as turf from '@turf/turf';
import { getPassengerStatusKey } from '../data/microcopy';
import { STOPS_BY_ROUTE } from '../data/stops';
import type { Jeepney, JeepneyView, RouteGeometry, UserLocation } from '../types';
import { estimateFare } from '../utils/fare';
import { distanceKm, nearestStopDistanceKm } from '../utils/geometry';

export type IncomingJeep = {
  id: string;
  routeCode: string;
  etaMinutes: number;
};

// Cache projections so we don't call turf on every tick for stable user positions.
const userPosCache = new Map<string, number>();

function getUserPosOnRoute(user: UserLocation, geometry: RouteGeometry): number {
  const key = `${geometry.route.code}:${user.lng.toFixed(4)},${user.lat.toFixed(4)}`;
  const hit = userPosCache.get(key);
  if (hit !== undefined) return hit;
  const line = turf.lineString(geometry.coordinates);
  const origin = turf.point(geometry.coordinates[0]);
  const nearest = turf.nearestPointOnLine(line, turf.point([user.lng, user.lat]));
  const pos = turf.length(turf.lineSlice(origin, nearest, line), { units: 'kilometers' });
  userPosCache.set(key, pos);
  return pos;
}

export function computeNextIncomingJeep(
  jeepneys: Jeepney[],
  geometryByCode: Record<string, RouteGeometry>,
  user: UserLocation,
  routeCode: string,
): IncomingJeep | null {
  const geometry = geometryByCode[routeCode];
  if (!geometry) return null;
  const userPosKm = getUserPosOnRoute(user, geometry);
  let best: { jeep: Jeepney; eta: number } | null = null;

  for (const jeep of jeepneys) {
    if (jeep.routeCode !== routeCode) continue;
    const speed = Math.max(jeep.speedKmh, 8);
    let eta: number;

    if (jeep.direction === 'outbound') {
      const remaining = userPosKm - jeep.distanceAlongKm;
      if (remaining <= 0) continue; // already passed the user's stop
      eta = Math.max(1, Math.round((remaining / speed) * 60));
    } else {
      // Inbound: finish the return leg (distanceAlongKm → 0 = back at route start),
      // then travel outbound from start to user's stop.
      eta = Math.max(1, Math.round(((jeep.distanceAlongKm + userPosKm) / speed) * 60));
    }

    if (!best || eta < best.eta) best = { jeep, eta };
  }

  return best ? { id: best.jeep.id, routeCode: best.jeep.routeCode, etaMinutes: best.eta } : null;
}

export function useNextIncomingJeep(
  jeepneys: Jeepney[],
  geometryByCode: Record<string, RouteGeometry>,
  user: UserLocation,
  routeFilter: string | 'all',
): IncomingJeep | null {
  return useMemo(() => {
    const codes =
      routeFilter === 'all'
        ? [...new Set(jeepneys.map((j) => j.routeCode))]
        : [routeFilter];
    let best: IncomingJeep | null = null;
    for (const code of codes) {
      const candidate = computeNextIncomingJeep(jeepneys, geometryByCode, user, code);
      if (candidate && (!best || candidate.etaMinutes < best.etaMinutes)) best = candidate;
    }
    return best;
  }, [jeepneys, geometryByCode, user, routeFilter]);
}

const NEARBY_KM = 2;

// Stop locations along each route are precomputed once per geometry object.
// This eliminates O(N) nearestPointOnLine + lineSlice calls on every tick.
const stopLocsByGeometry = new WeakMap<RouteGeometry, number[]>();

function getStopLocs(geometry: RouteGeometry): number[] {
  const cached = stopLocsByGeometry.get(geometry);
  if (cached) return cached;
  const stops = STOPS_BY_ROUTE[geometry.route.code] ?? [];
  const line = turf.lineString(geometry.coordinates);
  const origin = turf.point(geometry.coordinates[0]);
  const locs = stops.map((stop) => {
    const along = turf.nearestPointOnLine(line, turf.point([stop.lng, stop.lat]));
    return turf.length(turf.lineSlice(origin, along, line), { units: 'kilometers' });
  });
  stopLocsByGeometry.set(geometry, locs);
  return locs;
}

function nextStopForJeep(jeep: Jeepney, geometry: RouteGeometry) {
  const stops = STOPS_BY_ROUTE[jeep.routeCode] ?? [];
  const stopLocs = getStopLocs(geometry);
  // Use the already-computed distance rather than projecting back onto the line.
  const jeepLoc =
    jeep.direction === 'outbound'
      ? jeep.distanceAlongKm
      : geometry.pathLengthKm - jeep.distanceAlongKm;

  let best: { name: string; distanceKm: number } | null = null;

  for (let i = 0; i < stops.length; i++) {
    const stopLoc = stopLocs[i];
    if (jeep.direction === 'outbound' && stopLoc <= jeepLoc) continue;
    if (jeep.direction === 'inbound' && stopLoc >= jeepLoc) continue;
    const dist = Math.abs(stopLoc - jeepLoc);
    if (!best || dist < best.distanceKm) {
      best = { name: stops[i].bisayaLabel, distanceKm: dist };
    }
  }

  return best ?? { name: stops[stops.length - 1]?.bisayaLabel ?? 'Stop', distanceKm: 0.5 };
}

export function jeepToView(
  jeep: Jeepney,
  geometryByCode: Record<string, RouteGeometry>,
  user: UserLocation,
): JeepneyView {
  const geometry = geometryByCode[jeep.routeCode];
  const userPt: [number, number] = [user.lng, user.lat];
  const distToUser = distanceKm(userPt, [jeep.lng, jeep.lat]);
  const next = geometry ? nextStopForJeep(jeep, geometry) : { name: 'Stop', distanceKm: 1 };
  const etaMinutes = Math.max(1, Math.round((next.distanceKm / Math.max(jeep.speedKmh, 8)) * 60));
  const stops = STOPS_BY_ROUTE[jeep.routeCode] ?? [];
  const fareKm = nearestStopDistanceKm(userPt, stops);
  const fareEstimate = estimateFare(fareKm, jeep.unitType);
  const full = jeep.passengers >= jeep.maxPassengers;
  const congested = jeep.speedKmh < jeep.baseSpeedKmh * 0.45;

  let etaToUserMinutes: number | null = null;
  let approachingUser = false;
  if (geometry && jeep.direction === 'outbound') {
    const userPosKm = getUserPosOnRoute(user, geometry);
    const remaining = userPosKm - jeep.distanceAlongKm;
    if (remaining > 0) {
      etaToUserMinutes = Math.max(1, Math.round((remaining / Math.max(jeep.speedKmh, 8)) * 60));
      approachingUser = true;
    }
  }

  const prevDistToUser = distanceKm([jeep.prevLng, jeep.prevLat], userPt);
  const movingTowardUser = distToUser < prevDistToUser;

  const statusKey = getPassengerStatusKey(
    etaMinutes,
    full,
    congested,
    jeep.accelState,
    jeep.deceleratingNearStop,
    approachingUser,
    movingTowardUser,
    etaToUserMinutes,
  );

  return {
    ...jeep,
    etaMinutes,
    etaToUserMinutes,
    approachingUser,
    movingTowardUser,
    fareEstimate,
    statusKey,
    nextStopName: next.name,
    distanceToUserKm: distToUser,
  };
}

export function computeJeepneyViews(
  jeepneys: Jeepney[],
  geometryByCode: Record<string, RouteGeometry>,
  user: UserLocation,
  routeFilter: string | 'all',
): JeepneyView[] {
    const userPt: [number, number] = [user.lng, user.lat];

    return jeepneys
      .filter((j) => j.active)
      .filter((j) => routeFilter === 'all' || j.routeCode === routeFilter)
      .map((jeep) => {
        const geometry = geometryByCode[jeep.routeCode];
        const distToUser = distanceKm(userPt, [jeep.lng, jeep.lat]);
        const next = geometry ? nextStopForJeep(jeep, geometry) : { name: 'Stop', distanceKm: 1 };
        const etaMinutes = Math.max(1, Math.round((next.distanceKm / Math.max(jeep.speedKmh, 8)) * 60));
        const stops = STOPS_BY_ROUTE[jeep.routeCode] ?? [];
        const fareKm = nearestStopDistanceKm(userPt, stops);
        const fareEstimate = estimateFare(fareKm, jeep.unitType);
        const full = jeep.passengers >= jeep.maxPassengers;
        const congested = jeep.speedKmh < jeep.baseSpeedKmh * 0.45;

        let etaToUserMinutes: number | null = null;
        let approachingUser = false;
        if (geometry && jeep.direction === 'outbound') {
          const userPosKm = getUserPosOnRoute(user, geometry);
          const remaining = userPosKm - jeep.distanceAlongKm;
          if (remaining > 0) {
            etaToUserMinutes = Math.max(1, Math.round((remaining / Math.max(jeep.speedKmh, 8)) * 60));
            approachingUser = true;
          }
        }

        const prevDistToUser = distanceKm([jeep.prevLng, jeep.prevLat], userPt);
        const movingTowardUser = distToUser < prevDistToUser;

        const statusKey = getPassengerStatusKey(
          etaMinutes,
          full,
          congested,
          jeep.accelState,
          jeep.deceleratingNearStop,
          approachingUser,
          movingTowardUser,
          etaToUserMinutes,
        );

        return {
          ...jeep,
          etaMinutes,
          etaToUserMinutes,
          approachingUser,
          movingTowardUser,
          fareEstimate,
          statusKey,
          nextStopName: next.name,
          distanceToUserKm: distToUser,
        };
      })
      .filter((j) => j.distanceToUserKm <= NEARBY_KM)
      .sort((a, b) => a.etaMinutes - b.etaMinutes);
}

export function useJeepneyViews(
  jeepneys: Jeepney[],
  geometryByCode: Record<string, RouteGeometry>,
  user: UserLocation,
  routeFilter: string | 'all',
): JeepneyView[] {
  return useMemo(
    () => computeJeepneyViews(jeepneys, geometryByCode, user, routeFilter),
    [jeepneys, geometryByCode, user, routeFilter],
  );
}

export function useNearbyCount(views: JeepneyView[]): number {
  return views.length;
}
