import { Search } from 'lucide-react';
import { useState } from 'react';
import type { Route } from '../../types';
import { RouteChipBar } from '../BottomSheet/RouteChip';
import { RouteSearch } from '../Onboarding/RouteSearch';

type AppHeaderProps = {
  routes: Route[];
  routeFilter: string | 'all';
  onSelectRoute: (code: string | 'all') => void;
  onShowOnboarding: () => void;
};

export function AppHeader({ routes, routeFilter, onSelectRoute, onShowOnboarding }: AppHeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);

  function handleRouteSelect(code: string) {
    onSelectRoute(code);
    setSearchOpen(false);
  }

  return (
    <header className="top-bar">
      <div className="top-bar-backdrop" aria-hidden />
      <div className="top-bar-row">
        <div className="logo">
          <img
            src="/jt-logo.svg"
            alt=""
            className="logo-img"
            width={160}
            height={48}
            decoding="async"
            aria-hidden
          />
          <span className="logo-text" aria-label="JeepTrack">
            <span className="logo-text-jeep">Jeep</span>
            <span className="logo-text-track">Track</span>
          </span>
        </div>
        <div className="top-bar-actions">
          <button
            type="button"
            className={`intro-btn intro-btn--icon${searchOpen ? ' intro-btn--active' : ''}`}
            onClick={() => setSearchOpen((o) => !o)}
            aria-label={searchOpen ? 'Close search' : 'Search routes'}
            aria-expanded={searchOpen}
          >
            <Search size={16} strokeWidth={2.25} />
          </button>
          <button
            type="button"
            className="intro-btn intro-btn--compact"
            onClick={onShowOnboarding}
            aria-label="View intro and install help"
          >
            Intro
          </button>
        </div>
      </div>

      {searchOpen ? (
        <RouteSearch routes={routes} onSelect={handleRouteSelect} compact />
      ) : (
        <div className="route-chips-row">
          <RouteChipBar routes={routes} active={routeFilter} onSelect={onSelectRoute} />
          {routeFilter !== 'all' && (
            <button
              type="button"
              className="show-all-chip"
              onClick={() => onSelectRoute('all')}
              aria-label="Show all routes"
            >
              + All
            </button>
          )}
        </div>
      )}
    </header>
  );
}
