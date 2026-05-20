import type { JeepneyUnitType } from '../types';

export function estimateFare(distanceKm: number, unitType: JeepneyUnitType): number {
  const minFare = unitType === 'modern' ? 17 : 14;
  const perKm = unitType === 'modern' ? 2.3 : 2;
  const freeKm = 4;

  if (distanceKm <= freeKm) return minFare;
  return Math.round((minFare + (distanceKm - freeKm) * perKm) * 100) / 100;
}

export function formatFare(amount: number): string {
  return `₱${amount.toFixed(amount % 1 === 0 ? 0 : 2)}`;
}
