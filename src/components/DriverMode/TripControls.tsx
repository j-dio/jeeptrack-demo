import { phrase } from '../../data/microcopy';

type TripControlsProps = {
  tripActive: boolean;
  onToggleTrip: () => void;
  onSimulateOffRoute: () => void;
  waitingCount: number;
};

export function TripControls({
  tripActive,
  onToggleTrip,
  onSimulateOffRoute,
  waitingCount,
}: TripControlsProps) {
  const tripCopy = phrase(tripActive ? 'trip_started' : 'cruising');

  return (
    <div className="trip-controls">
      <button type="button" className="trip-btn trip-btn--primary" onClick={onToggleTrip}>
        {tripActive ? 'End Trip' : 'Start Trip'}
      </button>
      {tripActive && (
        <>
          <p className="trip-waiting">
            Passengers waiting at next stop: <strong>{waitingCount}</strong>
          </p>
          <p className="trip-status">
            <span className="status-bisaya">{tripCopy.bisaya}</span>
            <span className="status-english">{tripCopy.english}</span>
          </p>
        </>
      )}
      <button type="button" className="trip-btn trip-btn--ghost" onClick={onSimulateOffRoute}>
        Simulate off-route
      </button>
    </div>
  );
}
