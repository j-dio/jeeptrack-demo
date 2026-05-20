import { ROUTE_BY_CODE, DRIVER_ROUTE_CODE } from '../../data/routes';

export function DriverTopBar() {
  const route = ROUTE_BY_CODE[DRIVER_ROUTE_CODE];
  return (
    <div className="driver-top-bar">
      <span className="driver-mode-badge">DRIVER MODE</span>
      <span className="driver-route-label">
        {DRIVER_ROUTE_CODE} — {route?.name ?? 'Lahug – Carbon'}
      </span>
    </div>
  );
}
