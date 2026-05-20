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

/** Static demo passengers for driver on route 62B (Bacayan → Carbon). */
export const MOCK_PASSENGERS_62B: MockPassenger[] = [
  { id: 'p1', name: 'Maria L.',  status: 'onboard', stop: 'Bacayan',            farePhp: 14, lng: 123.9210,  lat: 10.3864 },
  { id: 'p2', name: 'Juan R.',   status: 'onboard', stop: 'Talamban',           farePhp: 14, lng: 123.9120,  lat: 10.3700 },
  { id: 'p3', name: 'Ana S.',    status: 'waiting', stop: 'Country Mall',       farePhp: 14, lng: 123.8964,  lat: 10.3455 },
  { id: 'p4', name: 'Pedro G.',  status: 'waiting', stop: 'Ayala Center',       farePhp: 17, lng: 123.9050,  lat: 10.3183 },
  { id: 'p5', name: 'Liza M.',   status: 'waiting', stop: 'Hotel Elizabeth',    farePhp: 17, lng: 123.8978,  lat: 10.3177 },
];

export const MOCK_PASSENGERS_04C = MOCK_PASSENGERS_62B;
