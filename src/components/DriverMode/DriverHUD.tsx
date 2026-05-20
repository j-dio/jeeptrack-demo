import { useState } from 'react';
import { motion, useDragControls, type PanInfo } from 'framer-motion';
import { Users } from 'lucide-react';
import { MOCK_PASSENGERS_04C } from '../../data/mockPassengers';
import type { DriverSnapshot } from '../../hooks/useDriverSimulation';

type DriverHudSnap = 'peek' | 'half' | 'full';

type Props = {
  driver: DriverSnapshot;
};

const SNAP_Y: Record<DriverHudSnap, string> = {
  peek: 'calc(100dvh - 160px)',
  half: '55dvh',
  full: '12dvh',
};

export function DriverHUD({ driver }: Props) {
  const [snap, setSnap] = useState<DriverHudSnap>('peek');
  const dragControls = useDragControls();

  const waiting = MOCK_PASSENGERS_04C.filter((p) => p.status === 'waiting');
  const onboard = MOCK_PASSENGERS_04C.filter((p) => p.status === 'onboard');

  const handleDragEnd = (_e: PointerEvent, info: PanInfo) => {
    const flickUp = info.velocity.y < -250 || info.offset.y < -40;
    const flickDown = info.velocity.y > 250 || info.offset.y > 40;
    if (flickUp) setSnap(snap === 'peek' ? 'half' : 'full');
    else if (flickDown) setSnap(snap === 'full' ? 'half' : 'peek');
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
        onPointerDown={(e) => { e.stopPropagation(); dragControls.start(e); }}
        role="button"
        tabIndex={0}
        aria-label="Drag to expand passenger list"
      />

      <button
        type="button"
        className="driver-passenger-heading driver-passenger-heading--tap"
        onClick={() => setSnap(snap === 'peek' ? 'half' : snap)}
      >
        <Users size={16} strokeWidth={2.25} aria-hidden />
        Route 62B passengers
        <span className="driver-passenger-counts">
          {onboard.length} onboard · {waiting.length} waiting
        </span>
      </button>

      <div className="driver-hud-body">
        <ul className="driver-passenger-list">
          {MOCK_PASSENGERS_04C.map((passenger) => (
            <li key={passenger.id} className="driver-passenger-row">
              <div>
                <span className="driver-passenger-name">{passenger.name}</span>
                <p className="driver-passenger-meta">
                  {passenger.stop} · ₱{passenger.farePhp}
                </p>
              </div>
              <span className={`driver-passenger-status driver-passenger-status--${passenger.status}`}>
                {passenger.status === 'onboard' ? 'Onboard' : 'Waiting'}
              </span>
            </li>
          ))}
        </ul>

        {driver.tripActive && driver.waitingAhead > 0 && (
          <p className="driver-waiting-strip">
            {driver.waitingAhead} more waiting ahead on route
          </p>
        )}
      </div>
    </motion.div>
  );
}
