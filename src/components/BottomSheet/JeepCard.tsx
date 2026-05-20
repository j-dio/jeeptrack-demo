import { motion } from 'framer-motion';
import { phrase } from '../../data/microcopy';
import { ROUTE_BY_CODE } from '../../data/routes';
import { formatFare } from '../../utils/fare';
import type { JeepneyView } from '../../types';

type JeepCardProps = {
  jeep: JeepneyView;
  selected?: boolean;
  onSelect: () => void;
  lastUpdatedSec: number;
  detail?: boolean;
};

export function JeepCard({ jeep, selected, onSelect, lastUpdatedSec, detail }: JeepCardProps) {
  const route = ROUTE_BY_CODE[jeep.routeCode];
  const copy = phrase(jeep.statusKey);
  const pulse = jeep.statusKey === 'arriving_soon';

  if (detail) {
    return (
      <div className="jeep-detail">
        <motion.div
          className="jeep-detail-badge"
          style={{ backgroundColor: route?.color }}
          animate={pulse ? { scale: [1, 1.06, 1] } : {}}
          transition={{ repeat: pulse ? Infinity : 0, duration: 1.2 }}
        >
          {jeep.routeCode}
        </motion.div>
        <h2 className="jeep-detail-title">{route?.name}</h2>
        <p className="jeep-detail-driver">
          {jeep.driverName} · {jeep.plate} · {jeep.unitType === 'modern' ? 'Modern' : 'Traditional'}
        </p>
        <div className="jeep-detail-status">
          <p className="status-bisaya">{copy.bisaya}</p>
          <p className="status-english">{copy.english}</p>
        </div>
        <div className="jeep-detail-grid">
          <Stat label="Speed" value={`${Math.round(jeep.speedKmh)} km/h`} />
          <Stat label="Heading" value={`${Math.round(jeep.bearing)}°`} />
          <Stat label="ETA" value={`${jeep.etaMinutes} min`} />
          <Stat label="Next stop" value={jeep.nextStopName} />
          <Stat label="Fare est." value={formatFare(jeep.fareEstimate)} />
          <Stat label="Passengers" value={`${jeep.passengers}/${jeep.maxPassengers}`} />
          <Stat label="Accel." value={jeep.accelState} />
          <Stat label="Updated" value={`${lastUpdatedSec}s ago`} />
        </div>
      </div>
    );
  }

  return (
    <motion.button
      type="button"
      className={`jeep-card ${selected ? 'jeep-card--selected' : ''}`}
      style={{ borderLeftColor: route?.color }}
      onClick={onSelect}
      whileTap={{ scale: 0.98 }}
    >
      <span className="jeep-card-badge" style={{ backgroundColor: route?.color }}>
        {jeep.routeCode}
      </span>
      <span className="jeep-card-body">
        <span className="jeep-card-status">
          <motion.span
            className="status-bisaya"
            animate={pulse ? { opacity: [1, 0.7, 1] } : {}}
            transition={{ repeat: pulse ? Infinity : 0, duration: 1.4 }}
          >
            {copy.bisaya}
          </motion.span>
          <span className="status-english">{copy.english}</span>
        </span>
        <span className="jeep-card-meta">
          <span className="jeep-card-eta">{jeep.etaMinutes} min</span>
          <span className="jeep-card-meta-muted">
            · {Math.round(jeep.speedKmh)} km/h · {formatFare(jeep.fareEstimate)}
          </span>
        </span>
      </span>
    </motion.button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="jeep-stat">
      <span className="jeep-stat-label">{label}</span>
      <span className="jeep-stat-value">{value}</span>
    </div>
  );
}
