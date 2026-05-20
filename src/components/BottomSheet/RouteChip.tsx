import { motion } from 'framer-motion';
import type { Route } from '../../types';

type RouteChipProps = {
  routes: Route[];
  active: string | 'all';
  onSelect: (code: string | 'all') => void;
};

export function RouteChipBar({ routes, active, onSelect }: RouteChipProps) {
  return (
    <motion.div className="route-chips" layout>
      <button
        type="button"
        className={`route-chip ${active === 'all' ? 'route-chip--active' : ''}`}
        onClick={() => onSelect('all')}
      >
        All
      </button>
      {routes.map((route) => (
        <button
          key={route.code}
          type="button"
          className={`route-chip ${active === route.code ? 'route-chip--active' : ''}`}
          style={
            active === route.code
              ? { borderColor: route.color, backgroundColor: `${route.color}33` }
              : { borderColor: `${route.color}88` }
          }
          onClick={() => onSelect(route.code)}
        >
          {route.code}
        </button>
      ))}
    </motion.div>
  );
}
