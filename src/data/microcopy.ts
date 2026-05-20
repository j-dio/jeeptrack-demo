import type { MicrocopyKey, MicrocopyPhrase } from '../types';

export const MICROCOPY: Record<MicrocopyKey, MicrocopyPhrase> = {
  arriving_soon: { bisaya: 'Hapit na!', english: 'Arriving soon' },
  on_way: { bisaya: 'Padulong na, huwat lang!', english: 'On its way' },
  far: { bisaya: 'Layo pa.', english: 'Still far' },
  full: { bisaya: 'Puno na!', english: 'Full — wait for next' },
  cruising: { bisaya: 'Padayon!', english: 'Moving steadily' },
  decelerating: { bisaya: 'Lugar lang…', english: 'Slowing to stop' },
  stationary: { bisaya: 'Naghuwat…', english: 'Stopped' },
  accelerating: { bisaya: 'Larga na!', english: 'Moving out' },
  congestion: { bisaya: 'Trapik kaayo!', english: 'Heavy traffic' },
  loading: { bisaya: 'Naunsa man ni?', english: 'Fetching…' },
  no_jeeps: { bisaya: "Wala pa'y sakyanan diri.", english: 'No rides found' },
  off_route: { bisaya: 'Layo na ka sa rota!', english: "You're off-route" },
  trip_started: { bisaya: 'Sakay na ta!', english: 'Trip started' },
  last_trip: { bisaya: 'Last trip na ni, dali!', english: 'Last trip — hurry!' },
};

export function getPassengerStatusKey(
  etaMinutes: number,
  full: boolean,
  congested: boolean,
  accel: string,
  deceleratingNearStop: boolean,
): MicrocopyKey {
  if (full) return 'full';
  if (deceleratingNearStop || accel === 'decelerating') return 'decelerating';
  if (congested && accel !== 'stationary') return 'congestion';
  if (accel === 'stationary') return 'stationary';
  if (accel === 'accelerating') return 'accelerating';
  if (accel === 'cruising' && etaMinutes > 10) return 'far';
  if (etaMinutes < 1) return 'arriving_soon';
  if (etaMinutes <= 5) return 'on_way';
  if (etaMinutes > 10) return 'far';
  return 'cruising';
}

export function phrase(key: MicrocopyKey): MicrocopyPhrase {
  return MICROCOPY[key];
}
