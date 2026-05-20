export type Waypoint = { name: string; lng: number; lat: number };

export type RouteSegment = {
  fromIndex: number;
  toIndex: number;
  congestion: number;
};

export type Route = {
  code: string;
  name: string;
  color: string;
  waypoints: Waypoint[];
  segments: RouteSegment[];
  jeepCount: number;
};

export type JeepneyUnitType = 'traditional' | 'modern';

export type AccelState = 'cruising' | 'accelerating' | 'decelerating' | 'stationary';

export type TripStatus = 'idle' | 'on_trip' | 'completed' | 'cancelled';

export type RunDirection = 'outbound' | 'inbound';

export type Jeepney = {
  id: string;
  routeCode: string;
  driverName: string;
  plate: string;
  unitType: JeepneyUnitType;
  passengers: number;
  maxPassengers: number;
  direction: RunDirection;
  active: boolean;
  distanceAlongKm: number;
  baseSpeedKmh: number;
  speedKmh: number;
  bearing: number;
  accelState: AccelState;
  deceleratingNearStop: boolean;
  lng: number;
  lat: number;
  prevLng: number;
  prevLat: number;
  lastUpdated: number;
  noisePhase: number;
};

export type AppMode = 'passenger' | 'driver';

export type RouteGeometry = {
  route: Route;
  coordinates: [number, number][];
  pathLengthKm: number;
  segmentBoundaries: { endKm: number; congestion: number }[];
};

export type MicrocopyKey =
  | 'arriving_soon'
  | 'on_way'
  | 'far'
  | 'full'
  | 'cruising'
  | 'decelerating'
  | 'stationary'
  | 'accelerating'
  | 'congestion'
  | 'loading'
  | 'no_jeeps'
  | 'off_route'
  | 'trip_started'
  | 'trip_ended'
  | 'last_trip';

export type MicrocopyPhrase = { bisaya: string; english: string };

export type UserLocation = {
  lng: number;
  lat: number;
  source: 'gps' | 'fallback';
};

export type JeepneyView = Jeepney & {
  etaMinutes: number;
  fareEstimate: number;
  statusKey: MicrocopyKey;
  nextStopName: string;
  distanceToUserKm: number;
};
