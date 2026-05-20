import * as turf from '@turf/turf';
import type { Route, RouteGeometry } from '../types';

export function buildRouteGeometry(route: Route): RouteGeometry {
  const coordinates = route.waypoints.map((wp) => [wp.lng, wp.lat] as [number, number]);
  const line = turf.lineString(coordinates);
  const pathLengthKm = turf.length(line, { units: 'kilometers' });

  const segmentBoundaries: { endKm: number; congestion: number }[] = [];
  let cumulative = 0;

  for (const segment of route.segments) {
    const from = route.waypoints[segment.fromIndex];
    const to = route.waypoints[segment.toIndex];
    const segLine = turf.lineString([
      [from.lng, from.lat],
      [to.lng, to.lat],
    ]);
    const segKm = turf.length(segLine, { units: 'kilometers' });
    cumulative += segKm;
    segmentBoundaries.push({ endKm: cumulative, congestion: segment.congestion });
  }

  return { route, coordinates, pathLengthKm, segmentBoundaries };
}

export function getCongestionAtKm(geometry: RouteGeometry, distanceKm: number): number {
  for (const boundary of geometry.segmentBoundaries) {
    if (distanceKm <= boundary.endKm) return boundary.congestion;
  }
  return 1;
}

export function distanceKm(
  a: [number, number],
  b: [number, number],
): number {
  return turf.distance(turf.point(a), turf.point(b), { units: 'kilometers' });
}

export function nearestStopDistanceKm(
  user: [number, number],
  stops: { lng: number; lat: number }[],
): number {
  let min = Infinity;
  for (const stop of stops) {
    const d = distanceKm(user, [stop.lng, stop.lat]);
    if (d < min) min = d;
  }
  return min;
}
