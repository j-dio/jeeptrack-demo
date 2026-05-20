import { motion } from 'framer-motion';
import type { AppMode } from '../../types';

type ModeToggleProps = {
  mode: AppMode;
  onToggle: () => void;
};

export function ModeToggle({ mode, onToggle }: ModeToggleProps) {
  const isDriver = mode === 'driver';
  return (
    <motion.button
      type="button"
      className={`mode-fab ${isDriver ? 'mode-fab--driver mode-fab--driver-active' : ''}`}
      onClick={onToggle}
      whileTap={{ scale: 0.94 }}
      layout
    >
      {isDriver ? '👤 Passenger' : '🚌 Driver'}
    </motion.button>
  );
}
