import { motion } from 'framer-motion';
import { phrase } from '../../data/microcopy';

export function Spinner() {
  const copy = phrase('loading');
  return (
    <div className="spinner-overlay">
      <motion.div
        className="spinner-icon"
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
      />
      <p className="spinner-bisaya">{copy.bisaya}</p>
      <p className="spinner-english">{copy.english}</p>
    </div>
  );
}
