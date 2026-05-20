import type { TripStatus } from '../../types';

type Props = {
  tripStatus: TripStatus;
  onStartTrip: () => void;
  onEndTrip: () => void;
  onCancelTrip: () => void;
  onSimulateOffRoute?: () => void;
};

export function DriverActionBar({ tripStatus, onStartTrip, onEndTrip, onCancelTrip, onSimulateOffRoute }: Props) {
  const isActive = tripStatus === 'on_trip';

  return (
    <div className="driver-action-bar">
      {isActive ? (
        <div className="driver-action-row">
          <button type="button" className="driver-action-btn driver-action-btn--end" onPointerDown={(e) => e.stopPropagation()} onClick={onEndTrip}>
            End Trip
          </button>
          <button type="button" className="driver-action-btn driver-action-btn--cancel" onPointerDown={(e) => e.stopPropagation()} onClick={onCancelTrip}>
            Cancel
          </button>
        </div>
      ) : (
        <button type="button" className="driver-action-btn driver-action-btn--start" onPointerDown={(e) => e.stopPropagation()} onClick={onStartTrip}>
          {tripStatus === 'completed' ? 'Start New Trip' : 'Start Trip'}
        </button>
      )}
      {isActive && onSimulateOffRoute && (
        <button type="button" className="driver-offroute-link" onPointerDown={(e) => e.stopPropagation()} onClick={onSimulateOffRoute}>
          Simulate off-route
        </button>
      )}
    </div>
  );
}
