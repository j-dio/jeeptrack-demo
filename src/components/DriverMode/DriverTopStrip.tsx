import type { TripStatus } from '../../types';

type Props = {
  speedKmh: number;
  nextStopName: string;
  nextStopDistanceKm: number;
  tripStatus: TripStatus;
};

export function DriverTopStrip({ speedKmh, nextStopName, nextStopDistanceKm, tripStatus }: Props) {
  const distLabel =
    nextStopDistanceKm < 1
      ? `${Math.round(nextStopDistanceKm * 1000)} m`
      : `${nextStopDistanceKm.toFixed(1)} km`;

  return (
    <div className="driver-top-strip">
      <div className="driver-strip-speed">
        <span className="driver-strip-speed-value">{Math.round(speedKmh)}</span>
        <span className="driver-strip-speed-unit">km/h</span>
      </div>
      {tripStatus === 'on_trip' && (
        <div className="driver-strip-nextstop">
          <span className="driver-strip-label">Next stop</span>
          <span className="driver-strip-name">{nextStopName} · {distLabel}</span>
        </div>
      )}
      {tripStatus !== 'on_trip' && (
        <span className="driver-strip-status">
          {tripStatus === 'idle' ? 'Ready to start' : tripStatus === 'completed' ? 'Trip complete' : 'Trip cancelled'}
        </span>
      )}
    </div>
  );
}
