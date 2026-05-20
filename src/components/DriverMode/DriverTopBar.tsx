import { ROUTE_BY_CODE, DRIVER_ROUTE_CODE } from '../../data/routes';

type DriverTopBarProps = {
  onShowIntro: () => void;
};

export function DriverTopBar({ onShowIntro }: DriverTopBarProps) {
  const route = ROUTE_BY_CODE[DRIVER_ROUTE_CODE];
  return (
    <div className="driver-top-bar">
      <span className="driver-mode-badge">DRIVER MODE</span>
      <div className="driver-top-bar-actions">
        <button type="button" className="intro-btn intro-btn--compact" onClick={onShowIntro}>
          Intro
        </button>
        <span className="driver-route-label">
          {DRIVER_ROUTE_CODE} — {route?.name ?? 'Bacayan – Carbon'}
        </span>
      </div>
    </div>
  );
}
