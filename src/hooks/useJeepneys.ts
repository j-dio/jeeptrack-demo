import { useMemo } from 'react';
import * as turf from '@turf/turf';
import { getPassengerStatusKey } from '../data/microcopy';
import { STOPS_BY_ROUTE } from '../data/stops';
import type { Jeepney, JeepneyView, RouteGeometry, UserLocation } from '../types';
import { estimateFare } from '../utils/fare';
import { distanceKm, nearestStopDistanceKm } from '../utils/geometry';

const NEARBY_KM = 2;

function nextStopForJeep(jeep: Jeepney, geometry: RouteGeometry) {
  const stops = STOPS_BY_ROUTE[jeep.routeCode] ?? [];
  const line = turf.lineString(geometry.coordinates);
  const jeepPoint = turf.point([jeep.lng, jeep.lat]);

  let best: { name: string; distanceKm: number } | null = null;

  for (const stop of stops) {
    const stopPoint = turf.point([stop.lng, stop.lat]);
    const alongJeep = turf.nearestPointOnLine(line, jeepPoint);
    const alongStop = turf.nearestPointOnLine(line, stopPoint);
    const jeepLoc = turf.length(
      turf.lineSlice(turf.point(geometry.coordinates[0]), alongJeep, line),
      { units: 'kilometers' },
    );
    const stopLoc = turf.length(
      turf.lineSlice(turf.point(geometry.coordinates[0]), alongStop, line),
      { units: 'kilometers' },
    );

    if (jeep.direction === 'outbound' && stopLoc <= jeepLoc) continue;
    if (jeep.direction === 'inbound' && stopLoc >= jeepLoc) continue;

    const dist = Math.abs(stopLoc - jeepLoc);
    if (!best || dist < best.distanceKm) {
      best = { name: stop.bisayaLabel, distanceKm: dist };
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
  const statusKey = getPassengerStatusKey(
    etaMinutes,
    full,
    congested,
    jeep.accelState,
    jeep.deceleratingNearStop,
  );
  return {
    ...jeep,
    etaMinutes,
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
        const statusKey = getPassengerStatusKey(
          etaMinutes,
          full,
          congested,
          jeep.accelState,
          jeep.deceleratingNearStop,
        );

        return {
          ...jeep,
          etaMinutes,
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
