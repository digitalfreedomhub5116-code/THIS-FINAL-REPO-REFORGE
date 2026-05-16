
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type RankType = 'UNRANKED' | 'E' | 'D' | 'C' | 'B' | 'A' | 'S';

interface RankBadgeProps {
  rank: RankType;
  size?: number; // default 80
  animated?: boolean;
  showLabel?: boolean;
  className?: string;
}

export const RANK_META: Record<RankType, {
  primary: string;
  secondary: string;
  letter: string;
  border: string;
  glow: string;
  bg: string;
  labelColor: string;
  image: string;
}> = {
  UNRANKED: {
    primary:    '#4a4a5a',
    secondary:  '#2a2a3a',
    letter:     '#6a6a7a',
    border:     '#3a3a4a',
    glow:       'rgba(74,74,90,0.0)',
    bg:         '#08080e',
    labelColor: '#5a5a6a',
    image:      '/images/ranks/unranked-badge.webp',
  },
  E: {
    primary:    '#9eaabb',
    secondary:  '#5a6b80',
    letter:     '#dce4f0',
    border:     '#7a8a9e',
    glow:       'rgba(158,170,187,0.5)',
    bg:         '#0e0f14',
    labelColor: '#9eaabb',
    image:      '/images/ranks/e-rank-removebg-preview.webp',
  },
  D: {
    primary:    '#f5a623',
    secondary:  '#d4880a',
    letter:     '#fff2cc',
    border:     '#e8a317',
    glow:       'rgba(245,166,35,0.85)',
    bg:         '#1a0e00',
    labelColor: '#f5a623',
    image:      '/images/ranks/d-rank-removebg-preview.webp',
  },
  C: {
    primary:    '#00d4ff',
    secondary:  '#5A9BB5',
    letter:     '#e0f5ff',
    border:     '#00d4ff',
    glow:       'rgba(0,212,255,0.8)',
    bg:         '#001018',
    labelColor: '#00d4ff',
    image:      '/images/ranks/c-rank-removebg-preview.webp',
  },
  B: {
    primary:    '#c96eff',
    secondary:  '#8b45f0',
    letter:     '#f8f0ff',
    border:     '#b860f8',
    glow:       'rgba(201,110,255,0.9)',
    bg:         '#0e0018',
    labelColor: '#c96eff',
    image:      '/images/ranks/b-rank-removebg-preview.webp',
  },
  A: {
    primary:    '#ff5722',
    secondary:  '#e53935',
    letter:     '#ffffff',
    border:     '#ff6644',
    glow:       'rgba(255,87,34,0.95)',
    bg:         '#1a0300',
    labelColor: '#ff6b3d',
    image:      '/images/ranks/a-rank-removebg-preview.webp',
  },
  S: {
    primary:    '#f084ff',
    secondary:  '#ffd700',
    letter:     '#ffffff',
    border:     '#e050ff',
    glow:       'rgba(240,132,255,1)',
    bg:         '#0f0018',
    labelColor: '#f0abfc',
    image:      '/images/ranks/s-rank-removebg-preview.webp',
  },
};

/* ─── Main export ───────────────────────────────────────────────────────────── */

const RankBadge: React.FC<RankBadgeProps> = ({
  rank,
  size = 80,
  animated = true,
  showLabel = false,
  className = '',
}) => {
  const meta = RANK_META[rank];

  return (
    <motion.div
      className={`relative flex flex-col items-center justify-center select-none ${className}`}
      whileHover={{ scale: 1.1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 22 }}
    >
      {/* Glow behind the badge */}
      {animated && meta.glow !== 'rgba(74,74,90,0.0)' && (
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: size * 0.85,
            height: size * 0.85,
            background: `radial-gradient(circle, ${meta.glow} 0%, transparent 70%)`,
          }}
          animate={{ opacity: [0.4, 0.8, 0.4], scale: [0.95, 1.08, 0.95] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* Badge image */}
      <motion.img
        src={meta.image}
        alt={`${rank}-Rank Badge`}
        draggable={false}
        style={{
          width: size,
          height: size,
          objectFit: 'contain',
          position: 'relative',
          zIndex: 1,
          filter: 'none',
        }}
      />

      {showLabel && (
        <div
          className="mt-1 text-[9px] font-black tracking-[0.22em] font-mono uppercase"
          style={{ color: meta.labelColor, textShadow: `0 0 8px ${meta.glow}` }}
        >
          {rank === 'UNRANKED' ? 'UNRANKED' : `${rank}-RANK`}
        </div>
      )}
    </motion.div>
  );
};

/* ─── Rank Reveal Badge — mystery "?" shatters to reveal E-rank ──────────── */

const SHARD_COUNT = 8;
const shardAngles = Array.from({ length: SHARD_COUNT }, (_, i) => (360 / SHARD_COUNT) * i);

export const RankRevealBadge: React.FC<{
  size?: number;
  onRevealComplete?: () => void;
}> = ({ size = 120, onRevealComplete }) => {
  const [phase, setPhase] = useState<'mystery' | 'shatter' | 'reveal'>('mystery');

  useEffect(() => {
    // Auto-trigger shatter after 1.5s, then reveal after shatter
    const t1 = setTimeout(() => setPhase('shatter'), 1500);
    const t2 = setTimeout(() => {
      setPhase('reveal');
      onRevealComplete?.();
    }, 2800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onRevealComplete]);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Shards flying out during shatter phase */}
      <AnimatePresence>
        {phase === 'shatter' && shardAngles.map((angle, i) => {
          const rad = (angle * Math.PI) / 180;
          const dist = size * 0.8;
          return (
            <motion.div
              key={`shard-${i}`}
              className="absolute"
              style={{
                width: size * 0.18,
                height: size * 0.22,
                background: `linear-gradient(${angle}deg, #3a3a5a, #2a2a3a)`,
                borderRadius: 2,
                boxShadow: '0 0 6px rgba(100,100,140,0.4)',
              }}
              initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
              animate={{
                x: Math.cos(rad) * dist,
                y: Math.sin(rad) * dist,
                opacity: 0,
                rotate: angle + 180,
                scale: 0.3,
              }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          );
        })}
      </AnimatePresence>

      {/* Mystery badge — visible until shatter */}
      <AnimatePresence>
        {phase === 'mystery' && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            exit={{ scale: 1.2, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.img
              src="/images/ranks/unranked-badge.webp"
              alt="Mystery Badge"
              style={{ width: size, height: size, objectFit: 'contain' }}
              animate={{
                filter: ['brightness(1)', 'brightness(1.3)', 'brightness(1)'],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* E-rank badge reveal */}
      <AnimatePresence>
        {phase === 'reveal' && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          >
            <motion.div
              className="absolute rounded-full"
              style={{
                width: size * 0.85,
                height: size * 0.85,
                background: 'radial-gradient(circle, rgba(158,170,187,0.5) 0%, transparent 70%)',
              }}
              animate={{ opacity: [0.4, 0.8, 0.4], scale: [0.95, 1.08, 0.95] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.img
              src="/images/ranks/e-rank-removebg-preview.webp"
              alt="E-Rank Badge"
              style={{ width: size, height: size, objectFit: 'contain', position: 'relative', zIndex: 1 }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RankBadge;
