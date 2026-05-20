export type PassengerStatus = 'waiting' | 'onboard';

export type MockPassenger = {
  id: string;
  name: string;
  status: PassengerStatus;
  /** Landmark or stop label along route 04C */
  stop: string;
  farePhp: number;
};

/** Static demo passengers for driver on Lahug → Carbon (04C). */
export const MOCK_PASSENGERS_04C: MockPassenger[] = [
  { id: 'p1', name: 'Maria L.', status: 'onboard', stop: 'JY Square', farePhp: 14 },
  { id: 'p2', name: 'Juan R.', status: 'onboard', stop: 'Salinas Drive', farePhp: 14 },
  { id: 'p3', name: 'Ana S.', status: 'waiting', stop: 'Escario Central', farePhp: 17 },
  { id: 'p4', name: 'Pedro G.', status: 'waiting', stop: 'Fuente Osmeña', farePhp: 17 },
  { id: 'p5', name: 'Liza M.', status: 'waiting', stop: 'Colon', farePhp: 17 },
];
