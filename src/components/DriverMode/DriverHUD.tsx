import { useState } from 'react';
import { motion, useDragControls, type PanInfo } from 'framer-motion';
import { Users } from 'lucide-react';
import { MOCK_PASSENGERS_04C } from '../../data/mockPassengers';
import type { DriverSnapshot } from '../../hooks/useDriverSimulation';

type DriverHudSnap = 'peek' | 'half' | 'full';

type DriverHUDProps = {
  driver: DriverSnapshot;
  onToggleTrip: () => void;
  onSimulateOffRoute: () => void;
};

/** translateY pushes sheet down; larger y = less visible */
const SNAP_Y: Record<DriverHudSnap, string> = {
  peek: 'calc(72dvh - 196px)',
  half: '38dvh',
  full: '10dvh',
};

export function DriverHUD({ driver, onToggleTrip, onSimulateOffRoute }: DriverHUDProps) {
  const [snap, setSnap] = useState<DriverHudSnap>('peek');
  const dragControls = useDragControls();

  const distLabel =
    driver.nextStopDistanceKm < 1
      ? `${Math.round(driver.nextStopDistanceKm * 1000)} m`
      : `${driver.nextStopDistanceKm.toFixed(1)} km`;

  const waiting = MOCK_PASSENGERS_04C.filter((p) => p.status === 'waiting');
  const onboard = MOCK_PASSENGERS_04C.filter((p) => p.status === 'onboard');

  const handleDragEnd = (_e: PointerEvent, info: PanInfo) => {
    if (info.offset.y < -60) {
      setSnap(snap === 'peek' ? 'half' : 'full');
    } else if (info.offset.y > 60) {
      setSnap(snap === 'full' ? 'half' : 'peek');
    }
  };

  return (
    <motion.div
      className="driver-hud"
      drag="y"
      dragListener={false}
      dragControls={dragControls}
      dragConstraints={{ top: 0, bottom: 500 }}
      dragElastic={0.08}
      animate={{ y: SNAP_Y[snap] }}
      onDragEnd={handleDragEnd}
      transition={{ type: 'spring', stiffness: 420, damping: 36 }}
    >
      <div
        className="driver-hud-handle"
        onPointerDown={(e) => dragControls.start(e)}
        role="button"
        tabIndex={0}
        aria-label="Drag to expand driver panel"
      />

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

      <div className="driver-hud-body">
        <div className="driver-passenger-section">
          <button
            type="button"
            className="driver-passenger-heading driver-passenger-heading--tap"
            onClick={() => setSnap(snap === 'peek' ? 'half' : snap)}
          >
            <Users size={16} strokeWidth={2.25} aria-hidden />
            Route 04C passengers
            <span className="driver-passenger-counts">
              {onboard.length} onboard · {waiting.length} waiting
            </span>
          </button>
          <ul className="driver-passenger-list">
            {MOCK_PASSENGERS_04C.map((passenger) => (
              <li key={passenger.id} className="driver-passenger-row">
                <div>
                  <span className="driver-passenger-name">{passenger.name}</span>
                  <p className="driver-passenger-meta">
                    {passenger.stop} · ₱{passenger.farePhp}
                  </p>
                </div>
                <span
                  className={`driver-passenger-status driver-passenger-status--${passenger.status}`}
                >
                  {passenger.status === 'onboard' ? 'Onboard' : 'Waiting'}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {driver.tripActive && driver.waitingAhead > 0 && (
          <p className="driver-waiting-strip">
            {driver.waitingAhead} more waiting ahead on route
          </p>
        )}
      </div>

      <div className="driver-hud-footer">
        <button
          type="button"
          className={`driver-trip-btn ${driver.tripActive ? 'driver-trip-btn--active' : ''}`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onToggleTrip}
        >
          {driver.tripActive ? 'End Trip' : 'Start Trip'}
        </button>

        {driver.tripActive && (
          <button
            type="button"
            className="driver-offroute-link"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onSimulateOffRoute}
          >
            Simulate off-route
          </button>
        )}
      </div>
    </motion.div>
  );
}
