import type { Jeepney, Route } from '../types';

const DRIVER_NAMES = [
  'Mang Totoy',
  'Manong Eddie',
  'Kuya Ben',
  'Mang Rudy',
  'Manong Jun',
  'Kuya Noli',
  'Mang Bert',
  'Manong Rey',
];

function randomPlate(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `CDN-${num}`;
}

function pick<T>(arr: T[], index: number): T {
  return arr[index % arr.length];
}

export function createJeepneyFleet(routes: Route[]): Jeepney[] {
  const fleet: Jeepney[] = [];
  let globalIndex = 0;

  for (const route of routes) {
    for (let i = 0; i < route.jeepCount; i++) {
      const id = `${route.code}-${i + 1}`;
      const unitType = globalIndex % 3 === 0 ? 'modern' : 'traditional';
      const maxPassengers = 18;
      const passengers = Math.floor(Math.random() * (maxPassengers + 1));

      fleet.push({
        id,
        routeCode: route.code,
        driverName: pick(DRIVER_NAMES, globalIndex),
        plate: randomPlate(),
        unitType,
        passengers,
        maxPassengers,
        direction: 'outbound',
        active: true,
        distanceAlongKm: Math.random() * 0.85,
        baseSpeedKmh: 30 + Math.random() * 15,
        speedKmh: 0,
        bearing: 0,
        accelState: 'stationary',
        deceleratingNearStop: false,
        lng: route.waypoints[0].lng,
        lat: route.waypoints[0].lat,
        prevLng: route.waypoints[0].lng,
        prevLat: route.waypoints[0].lat,
        lastUpdated: Date.now(),
        noisePhase: Math.random() * Math.PI * 2,
      });
      globalIndex++;
    }
  }

  return fleet;
}
