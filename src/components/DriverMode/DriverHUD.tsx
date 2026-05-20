import type { DriverSnapshot } from '../../hooks/useDriverSimulation';

type DriverHUDProps = {
  driver: DriverSnapshot;
  onToggleTrip: () => void;
  onSimulateOffRoute: () => void;
};

export function DriverHUD({ driver, onToggleTrip, onSimulateOffRoute }: DriverHUDProps) {
  const distLabel =
    driver.nextStopDistanceKm < 1
      ? `${Math.round(driver.nextStopDistanceKm * 1000)} m`
      : `${driver.nextStopDistanceKm.toFixed(1)} km`;

  return (
    <div className="driver-hud">
      <div className="driver-hud-metrics">
        <div className="driver-metric-pill">
          <span className="driver-metric-label">Speed</span>
          <span className="driver-metric-value">{Math.round(driver.speedKmh)} km/h</span>
        </div>
        <div className="driver-metric-pill">
          <span className="driver-metric-label">Status</span>
          <span className="driver-metric-value driver-metric-value--sm">{driver.statusBisaya}</span>
        </div>
        <div className="driver-metric-pill">
          <span className="driver-metric-label">Next stop</span>
          <span className="driver-metric-value driver-metric-value--sm">
            {driver.nextStopName} · {distLabel}
          </span>
        </div>
      </div>

      {driver.tripActive && driver.waitingAhead > 0 && (
        <p className="driver-waiting-strip">
          {driver.waitingAhead} passengers waiting ahead
        </p>
      )}

      <button
        type="button"
        className={`driver-trip-btn ${driver.tripActive ? 'driver-trip-btn--active' : ''}`}
        onClick={onToggleTrip}
      >
        {driver.tripActive ? 'End Trip' : 'Start Trip'}
      </button>

      <button type="button" className="driver-offroute-link" onClick={onSimulateOffRoute}>
        Simulate off-route
      </button>
    </div>
  );
}
