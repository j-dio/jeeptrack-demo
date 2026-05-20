import type { Feature, FeatureCollection } from 'geojson';
import type { Jeepney, RouteGeometry } from '../types';
import { DRIVER_ROUTE_CODE, ROUTE_BY_CODE } from '../data/routes';

export type DriverMapState = {
  position: { lng: number; lat: number; bearing: number } | null;
  waitingStops: { lng: number; lat: number; label: string; count: number }[];
};

export type MapRenderOptions = {
  visibleRoutes: Set<string> | 'all';
  selectedJeepId: string | null;
  driverMode: boolean;
  driverState: DriverMapState | null;
  userLocation: { lng: number; lat: number };
  pulsePhase: number;
};

export type MapController = {
  isReady: () => boolean;
  sync: (jeepneys: Jeepney[], options: MapRenderOptions) => void;
  flyToJeep: (lng: number, lat: number) => void;
};

function isRouteVisible(visibleRoutes: Set<string> | 'all', code: string): boolean {
  return visibleRoutes === 'all' || visibleRoutes.has(code);
}

export function buildJeepFeatures(
  jeepneys: Jeepney[],
  _geometries: RouteGeometry[],
  options: MapRenderOptions,
): Feature[] {
  const { visibleRoutes, selectedJeepId, driverMode } = options;
  const features: Feature[] = [];

  for (const jeep of jeepneys) {
    if (!isRouteVisible(visibleRoutes, jeep.routeCode)) continue;

    const hideDriverJeepOnMap =
      driverMode && jeep.routeCode === DRIVER_ROUTE_CODE && jeep.id === '04C-1';
    if (hideDriverJeepOnMap) continue;

    const route = ROUTE_BY_CODE[jeep.routeCode];
    let opacity = jeep.active ? 1 : 0.35;
    if (driverMode && jeep.routeCode !== DRIVER_ROUTE_CODE) {
      opacity = jeep.active ? 0.15 : 0.08;
    }

    features.push({
      type: 'Feature',
      properties: {
        id: jeep.id,
        code: jeep.routeCode,
        color: route?.color ?? '#FCD116',
        opacity,
        selected: jeep.id === selectedJeepId,
        decelerating: jeep.deceleratingNearStop,
        pulse: options.pulsePhase,
      },
      geometry: {
        type: 'Point',
        coordinates: [jeep.lng, jeep.lat],
      },
    });
  }

  return features;
}

export function buildWaitingStopFeatures(
  driverState: DriverMapState | null,
  pulsePhase: number,
): FeatureCollection {
  if (!driverState?.waitingStops.length) {
    return { type: 'FeatureCollection', features: [] };
  }

  return {
    type: 'FeatureCollection',
    features: driverState.waitingStops.map((stop, i) => ({
      type: 'Feature',
      properties: {
        count: stop.count,
        label: stop.label,
        pulse: pulsePhase,
        id: `wait-${i}`,
      },
      geometry: {
        type: 'Point',
        coordinates: [stop.lng, stop.lat],
      },
    })),
  };
}

export function emptyFeatureCollection(): FeatureCollection {
  return { type: 'FeatureCollection', features: [] };
}
