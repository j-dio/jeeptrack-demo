import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useDragControls, type PanInfo } from 'framer-motion';
import { phrase } from '../../data/microcopy';
import type { JeepneyView } from '../../types';
import { JeepCard } from './JeepCard';

export type SheetSnap = 'peek' | 'half' | 'full';

type BottomSheetProps = {
  nearbyCount: number;
  jeeps: JeepneyView[];
  selectedId: string | null;
  onSelectJeep: (id: string | null) => void;
  snap: SheetSnap;
  onSnapChange: (snap: SheetSnap) => void;
  lastUpdatedSec: number;
};

/** translateY pushes sheet down; larger y = less sheet visible = more map */
const SNAP_Y: Record<SheetSnap, string> = {
  peek: 'calc(85dvh - 108px)',
  half: '58dvh',
  full: '8dvh',
};

export function BottomSheet({
  nearbyCount,
  jeeps,
  selectedId,
  onSelectJeep,
  snap,
  onSnapChange,
  lastUpdatedSec,
}: BottomSheetProps) {
  const selected = jeeps.find((j) => j.id === selectedId) ?? null;
  const noJeeps = phrase('no_jeeps');
  const dragControls = useDragControls();

  const handleDragEnd = (_e: PointerEvent, info: PanInfo) => {
    if (info.offset.y < -60) {
      onSnapChange(snap === 'peek' ? 'half' : 'full');
    } else if (info.offset.y > 60) {
      onSnapChange(snap === 'full' ? 'half' : 'peek');
    }
  };

  return (
    <motion.div
      className="bottom-sheet"
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
        className="bottom-sheet-handle"
        onPointerDown={(e) => dragControls.start(e)}
        role="button"
        tabIndex={0}
        aria-label="Drag to resize sheet"
      />
      <motion.div className="bottom-sheet-header">
        <p className="sheet-summary">
          <span className="sheet-count">{nearbyCount}</span>
          <span className="sheet-summary-text"> jeepney{nearbyCount === 1 ? '' : 's'} nearby</span>
        </p>
      </motion.div>

      <div className="bottom-sheet-body">
        <AnimatePresence mode="wait">
          {snap === 'full' && selected ? (
            <motion.div
              key="detail"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
            >
              <JeepCard
                jeep={selected}
                onSelect={() => {}}
                lastUpdatedSec={lastUpdatedSec}
                detail
                onBack={() => {
                  onSnapChange('half');
                  onSelectJeep(null);
                }}
              />
            </motion.div>
          ) : (
            <motion.div
              key="list"
              className="jeep-list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {jeeps.length === 0 ? (
                <motion.div className="empty-state">
                  <p className="status-bisaya">{noJeeps.bisaya}</p>
                  <p className="status-english">{noJeeps.english}</p>
                </motion.div>
              ) : (
                jeeps.map((jeep) => (
                  <JeepCard
                    key={jeep.id}
                    jeep={jeep}
                    selected={jeep.id === selectedId}
                    onSelect={() => onSelectJeep(jeep.id)}
                    lastUpdatedSec={lastUpdatedSec}
                  />
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export function useLastUpdatedSec(jeepneys: { lastUpdated: number }[]) {
  const [sec, setSec] = useState(0);
  const latest = jeepneys.reduce((m, j) => Math.max(m, j.lastUpdated), 0);

  useEffect(() => {
    const tick = () => {
      if (latest <= 0) {
        setSec(0);
        return;
      }
      setSec(Math.max(0, Math.round((Date.now() - latest) / 1000)));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [latest]);

  return sec;
}
