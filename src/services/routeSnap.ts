const CACHE_KEY = 'jt-roads-v2';

function loadCache(): Record<string, [number, number][]> {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, [number, number][]>) : {};
  } catch {
    return {};
  }
}

function saveCache(cache: Record<string, [number, number][]>): void {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {}
}

export async function snapRouteToRoads(
  routeCode: string,
  waypoints: { lng: number; lat: number }[],
  token: string,
): Promise<[number, number][]> {
  const fallback: [number, number][] = waypoints.map((w) => [w.lng, w.lat]);
  if (waypoints.length < 2) return fallback;

  const cache = loadCache();
  if (cache[routeCode]) return cache[routeCode];

  const coords = waypoints.map((w) => `${w.lng},${w.lat}`).join(';');
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?access_token=${token}&geometries=geojson&overview=full`;

  try {
    const res = await fetch(url);
    if (!res.ok) return fallback;
    const data = (await res.json()) as {
      routes?: Array<{ geometry: { coordinates: [number, number][] } }>;
    };
    const snapped = data.routes?.[0]?.geometry?.coordinates;
    if (!snapped?.length) return fallback;
    saveCache({ ...cache, [routeCode]: snapped });
    return snapped;
  } catch {
    return fallback;
  }
}
