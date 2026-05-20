import type { Route, RouteSegment } from '../types';

const CONGESTED = 0.35;

function isCongestedSegment(fromName: string, toName: string): boolean {
  const text = `${fromName} ${toName}`.toLowerCase();
  return text.includes('osmeña') || text.includes('osmena') || text.includes('colon') || text.includes('gorordo');
}

function buildSegments(waypoints: Route['waypoints']): RouteSegment[] {
  const segments: RouteSegment[] = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const congestion = isCongestedSegment(waypoints[i].name, waypoints[i + 1].name)
      ? CONGESTED
      : 0.8 + Math.random() * 0.2;
    segments.push({ fromIndex: i, toIndex: i + 1, congestion });
  }
  return segments;
}

export const ROUTES: Route[] = [
  {
    code: '04B',
    name: 'Lahug – Carbon',
    color: '#FF6B35',
    jeepCount: 1,
    waypoints: [
      { name: 'JY Square', lng: 123.89816, lat: 10.33065 },
      { name: 'Salinas Dr', lng: 123.901, lat: 10.327 },
      { name: 'Gorordo Ave', lng: 123.89791, lat: 10.32424 },
      { name: 'Capitol', lng: 123.89076, lat: 10.3167 },
      { name: 'Fuente Osmeña', lng: 123.89327, lat: 10.30966 },
      { name: 'Colon', lng: 123.89889, lat: 10.29667 },
      { name: 'Carbon', lng: 123.89802, lat: 10.29124 },
    ],
    segments: [],
  },
  {
    code: '62B',
    name: 'Bacayan – Carbon',
    color: '#A78BFA',
    jeepCount: 4,
    waypoints: [
      { name: 'Bacayan',            lng: 123.9210, lat: 10.3864 },
      { name: 'Talamban',           lng: 123.9120, lat: 10.3700 },
      { name: 'USC Talamban',       lng: 123.9090, lat: 10.3615 },
      { name: 'Country Mall',       lng: 123.8964, lat: 10.3455 },
      { name: 'UC-Banilad',         lng: 123.9010, lat: 10.3404 },
      { name: 'Cebu Business Park', lng: 123.9025, lat: 10.3290 },
      { name: 'Ayala Center',       lng: 123.9050, lat: 10.3183 },
      { name: 'Hotel Elizabeth',    lng: 123.8978, lat: 10.3177 },
      { name: 'Sikatuna St',        lng: 123.8950, lat: 10.3040 },
      { name: 'Colon',              lng: 123.8989, lat: 10.2967 },
      { name: 'Carbon',             lng: 123.8980, lat: 10.2912 },
    ],
    segments: [],
  },
  {
    code: '17B',
    name: 'Apas – Carbon via IT Park',
    color: '#818CF8',
    jeepCount: 4,
    waypoints: [
      { name: 'Apas', lng: 123.9044, lat: 10.3374 },
      { name: 'IT Park', lng: 123.9074, lat: 10.3304 },
      { name: 'Gorordo Ave', lng: 123.89791, lat: 10.32424 },
      { name: 'Ayala', lng: 123.90515, lat: 10.31836 },
      { name: 'Fuente Osmeña', lng: 123.89327, lat: 10.30966 },
      { name: 'Osmeña Blvd', lng: 123.896, lat: 10.303 },
      { name: 'Carbon', lng: 123.89802, lat: 10.29124 },
    ],
    segments: [],
  },
  {
    code: '10H',
    name: 'Bulacao – SM',
    color: '#F472B6',
    jeepCount: 4,
    waypoints: [
      { name: 'Bulacao', lng: 123.875, lat: 10.285 },
      { name: 'V. Rama Ave', lng: 123.882, lat: 10.295 },
      { name: 'Osmeña Blvd', lng: 123.89, lat: 10.3 },
      { name: 'Fuente Osmeña', lng: 123.89327, lat: 10.30966 },
      { name: 'SM City Cebu', lng: 123.91806, lat: 10.31111 },
    ],
    segments: [],
  },
  {
    code: '13B',
    name: 'Talamban – Carbon',
    color: '#FBBF24',
    jeepCount: 3,
    waypoints: [
      { name: 'Talamban', lng: 123.912, lat: 10.36 },
      { name: 'JY Square', lng: 123.89816, lat: 10.33065 },
      { name: 'Gorordo Ave', lng: 123.89791, lat: 10.32424 },
      { name: 'Fuente Osmeña', lng: 123.89327, lat: 10.30966 },
      { name: 'Carbon', lng: 123.89802, lat: 10.29124 },
    ],
    segments: [],
  },
  {
    code: '06B',
    name: 'Guadalupe – Carbon',
    color: '#38BDF8',
    jeepCount: 3,
    waypoints: [
      { name: 'Guadalupe', lng: 123.8825, lat: 10.305 },
      { name: 'V. Rama', lng: 123.885, lat: 10.3 },
      { name: 'Osmeña Blvd', lng: 123.89, lat: 10.298 },
      { name: 'Colon', lng: 123.89889, lat: 10.29667 },
      { name: 'Carbon', lng: 123.89802, lat: 10.29124 },
    ],
    segments: [],
  },
].map((route) => ({
  ...route,
  segments: buildSegments(route.waypoints),
}));

export const ROUTE_BY_CODE = Object.fromEntries(ROUTES.map((r) => [r.code, r])) as Record<
  string,
  Route
>;

export const FUENTE_FALLBACK: [number, number] = [123.9210, 10.3864];

export const DRIVER_ROUTE_CODE = '62B';
