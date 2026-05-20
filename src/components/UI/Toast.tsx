import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { phrase } from '../../data/microcopy';
import type { MicrocopyKey } from '../../types';

type ToastProps = {
  messageKey: MicrocopyKey | null;
  onDismiss: () => void;
};

export function Toast({ messageKey, onDismiss }: ToastProps) {
  const copy = messageKey ? phrase(messageKey) : null;

  useEffect(() => {
    if (!messageKey) return;
    const id = window.setTimeout(onDismiss, 3000);
    return () => clearTimeout(id);
  }, [messageKey, onDismiss]);

  return (
    <AnimatePresence>
      {copy && (
        <motion.div
          className="toast"
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        >
          <p className="toast-bisaya">{copy.bisaya}</p>
          <p className="toast-english">{copy.english}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
