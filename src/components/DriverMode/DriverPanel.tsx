import { motion } from 'framer-motion';
import { phrase } from '../../data/microcopy';
import type { AccelState } from '../../types';
import { TripControls } from './TripControls';

type DriverPanelProps = {
  speedKmh: number;
  accelState: AccelState;
  tripActive: boolean;
  onToggleTrip: () => void;
  onSimulateOffRoute: () => void;
  waitingCount: number;
};

export function DriverPanel({
  speedKmh,
  accelState,
  tripActive,
  onToggleTrip,
  onSimulateOffRoute,
  waitingCount,
}: DriverPanelProps) {
  const statusKey =
    accelState === 'decelerating'
      ? 'decelerating'
      : accelState === 'stationary'
        ? 'stationary'
        : accelState === 'accelerating'
          ? 'accelerating'
          : 'cruising';
  const copy = phrase(statusKey);

  return (
    <motion.div className="driver-panel" layout>
      <div className="driver-stats">
        <div className="driver-stat">
          <span className="driver-stat-label">Speed</span>
          <span className="driver-stat-value">{Math.round(speedKmh)} km/h</span>
        </div>
        <div className="driver-stat">
          <span className="driver-stat-label">Status</span>
          <span className="status-bisaya">{copy.bisaya}</span>
          <span className="status-english">{copy.english}</span>
        </div>
      </div>
      <TripControls
        tripActive={tripActive}
        onToggleTrip={onToggleTrip}
        onSimulateOffRoute={onSimulateOffRoute}
        waitingCount={waitingCount}
      />
    </motion.div>
  );
}
