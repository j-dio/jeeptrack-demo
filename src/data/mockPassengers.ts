export type PassengerStatus = 'waiting' | 'onboard';

export type MockPassenger = {
  id: string;
  name: string;
  status: PassengerStatus;
  stop: string;
  farePhp: number;
  lng: number;
  lat: number;
};

/** Static demo passengers for driver on route 04C (Lahug alt → Carbon). */
export const MOCK_PASSENGERS_04C: MockPassenger[] = [
  { id: 'p1', name: 'Maria L.', status: 'onboard', stop: 'UP Cebu', farePhp: 14, lng: 123.89778, lat: 10.31806 },
  { id: 'p2', name: 'Juan R.', status: 'onboard', stop: 'F. Ramos St', farePhp: 14, lng: 123.894, lat: 10.317 },
  { id: 'p3', name: 'Ana S.', status: 'waiting', stop: 'Fuente Osmeña', farePhp: 17, lng: 123.89327, lat: 10.30966 },
  { id: 'p4', name: 'Pedro G.', status: 'waiting', stop: 'Junquera St', farePhp: 17, lng: 123.896, lat: 10.299 },
  { id: 'p5', name: 'Liza M.', status: 'waiting', stop: 'Carbon', farePhp: 17, lng: 123.89802, lat: 10.29124 },
];
