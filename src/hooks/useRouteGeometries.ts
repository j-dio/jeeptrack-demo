import { useEffect, useMemo, useState } from 'react';
import * as turf from '@turf/turf';
import { ROUTES } from '../data/routes';
import { buildRouteGeometry } from '../utils/geometry';
import { snapRouteToRoads } from '../services/routeSnap';
import type { RouteGeometry } from '../types';

export function useRouteGeometries(): {
  geometries: RouteGeometry[];
  geometryByCode: Record<string, RouteGeometry>;
  isLoading: boolean;
} {
  const fallbacks = useMemo(() => ROUTES.map(buildRouteGeometry), []);
  const [geometries, setGeometries] = useState<RouteGeometry[]>(fallbacks);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = import.meta.env.VITE_MAPBOX_TOKEN as string;
    if (!token) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    Promise.all(
      ROUTES.map(async (route, i) => {
        const fallback = fallbacks[i];
        const snapped = await snapRouteToRoads(route.code, route.waypoints, token);
        if (snapped.length < 2) return fallback;

        const line = turf.lineString(snapped);
        const pathLengthKm = turf.length(line, { units: 'kilometers' });
        const scale = fallback.pathLengthKm > 0 ? pathLengthKm / fallback.pathLengthKm : 1;
        const segmentBoundaries = fallback.segmentBoundaries.map((b) => ({
          ...b,
          endKm: b.endKm * scale,
        }));

        return {
          ...fallback,
          coordinates: snapped,
          pathLengthKm,
          segmentBoundaries,
        } as RouteGeometry;
      }),
    )
      .then((geoms) => {
        if (!cancelled) {
          setGeometries(geoms);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fallbacks]);

  const geometryByCode = useMemo(
    () => Object.fromEntries(geometries.map((g) => [g.route.code, g])),
    [geometries],
  );

  return { geometries, geometryByCode, isLoading };
}
