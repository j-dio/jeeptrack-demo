import { Bus, User } from 'lucide-react';
import { useRef } from 'react';
import type { AppMode } from '../../types';

type ModeToggleProps = {
  mode: AppMode;
  onToggle: () => void;
};

export function ModeToggle({ mode, onToggle }: ModeToggleProps) {
  const isDriver = mode === 'driver';
  const ignoreClickUntilRef = useRef(0);

  return (
    <button
      type="button"
      className={`mode-fab ${isDriver ? 'mode-fab--driver mode-fab--driver-active' : ''}`}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={() => {
        const now = performance.now();
        if (now < ignoreClickUntilRef.current) return;
        ignoreClickUntilRef.current = now + 400;
        onToggle();
      }}
    >
      {isDriver ? (
        <>
          <User size={18} strokeWidth={2.25} aria-hidden />
          Passenger
        </>
      ) : (
        <>
          <Bus size={18} strokeWidth={2.25} aria-hidden />
          Driver
        </>
      )}
    </button>
  );
}
