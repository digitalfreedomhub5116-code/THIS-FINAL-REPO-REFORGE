import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BADGE_TIERS, getStoneConfig } from '../utils/gameData';

interface BadgeUnlockAnimProps {
  tierIndex: number; // 1, 2, or 3 (badge index that was just unlocked)
  outfitId: string;
  onComplete: () => void;
}

/**
 * Full-screen overlay animation for badge unlock.
 * 3 phases: Crack → Impact Drop → Reveal
 */
const BadgeUnlockAnim: React.FC<BadgeUnlockAnimProps> = ({ tierIndex, outfitId, onComplete }) => {
  const [phase, setPhase] = useState<'crack' | 'impact' | 'reveal'>('crack');
  const tier = BADGE_TIERS[tierIndex];
  const stone = getStoneConfig(outfitId);
  const color = stone.stoneColor;

  useEffect(() => {
    // Phase timings
    const t1 = setTimeout(() => setPhase('impact'), 1200);
    const t2 = setTimeout(() => setPhase('reveal'), 2200);
    const t3 = setTimeout(() => onComplete(), 4200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(12px)' }}
    >
      <AnimatePresence mode="wait">
        {/* ── PHASE 1: CRACK ── */}
        {phase === 'crack' && (
          <motion.div
            key="crack"
            className="relative flex items-center justify-center"
            style={{ width: 200, height: 200 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.5 }}
            transition={{ exit: { duration: 0.3 } }}
          >
            {/* Old locked badge — vibrating */}
            <motion.div
              animate={{
                x: [0, -3, 3, -2, 2, -4, 4, 0],
                y: [0, 2, -2, 1, -1, 3, -3, 0],
                rotate: [0, -1, 1, -2, 2, 0],
              }}
              transition={{ duration: 1, repeat: 0 }}
              className="relative"
            >
              <svg viewBox="0 0 120 120" width={140} height={140}>
                <polygon
                  points={hexPoints(60, 60, 50)}
                  fill="rgba(15,15,25,0.95)"
                  stroke="rgba(255,255,255,0.15)"
                  strokeWidth="2"
                  strokeDasharray="6 4"
                />
              </svg>
              {/* Lock icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl opacity-40">🔒</span>
              </div>
            </motion.div>

            {/* Crack lines radiating */}
            {[0, 1, 2, 3, 4, 5].map(i => (
              <motion.div
                key={i}
                className="absolute"
                style={{
                  width: 2,
                  height: 60,
                  background: `linear-gradient(to bottom, ${color}, transparent)`,
                  transformOrigin: 'center top',
                  left: '50%',
                  top: '50%',
                  rotate: `${i * 60}deg`,
                }}
                initial={{ scaleY: 0, opacity: 0 }}
                animate={{ scaleY: 1, opacity: [0, 0.8, 0.4] }}
                transition={{ duration: 0.8, delay: 0.3 + i * 0.08 }}
              />
            ))}
          </motion.div>
        )}

        {/* ── PHASE 2: IMPACT DROP ── */}
        {phase === 'impact' && (
          <motion.div
            key="impact"
            className="relative flex flex-col items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Badge dropping from above */}
            <motion.div
              initial={{ y: -300, scale: 0.5, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 15,
                duration: 0.6,
              }}
              className="relative"
            >
              <svg viewBox="0 0 120 120" width={160} height={160}>
                <defs>
                  <linearGradient id="impact-fill" x1="0" y1="1" x2="1" y2="0">
                    <stop offset="0%" stopColor={color} stopOpacity="0.8" />
                    <stop offset="100%" stopColor={color} />
                  </linearGradient>
                </defs>
                <polygon
                  points={hexPoints(60, 60, 50)}
                  fill={`url(#impact-fill)`}
                  stroke={color}
                  strokeWidth="3"
                />
                {/* Inner tier number */}
                <text
                  x="60" y="65"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontWeight="900"
                  fontSize="28"
                  fontFamily="monospace"
                >
                  {['I', 'II', 'III', 'IV'][tierIndex]}
                </text>
              </svg>
            </motion.div>

            {/* Shockwave ring */}
            <motion.div
              className="absolute rounded-full"
              style={{
                width: 160,
                height: 160,
                border: `2px solid ${color}`,
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
              }}
              initial={{ scale: 0.5, opacity: 0.8 }}
              animate={{ scale: 3, opacity: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />

            {/* Second ring */}
            <motion.div
              className="absolute rounded-full"
              style={{
                width: 120,
                height: 120,
                border: `1px solid ${color}50`,
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
              }}
              initial={{ scale: 0.5, opacity: 0.6 }}
              animate={{ scale: 4, opacity: 0 }}
              transition={{ duration: 1, ease: 'easeOut', delay: 0.15 }}
            />
          </motion.div>
        )}

        {/* ── PHASE 3: REVEAL ── */}
        {phase === 'reveal' && (
          <motion.div
            key="reveal"
            className="relative flex flex-col items-center gap-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            {/* Glowing badge */}
            <motion.div
              className="relative"
              animate={{
                filter: [
                  `drop-shadow(0 0 12px ${color})`,
                  `drop-shadow(0 0 28px ${color})`,
                  `drop-shadow(0 0 12px ${color})`,
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <svg viewBox="0 0 120 120" width={180} height={180}>
                <defs>
                  <radialGradient id="reveal-glow">
                    <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                  </radialGradient>
                  <linearGradient id="reveal-fill" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor={color} />
                    <stop offset="100%" stopColor={color} stopOpacity="0.7" />
                  </linearGradient>
                </defs>
                {/* Background glow */}
                <circle cx="60" cy="60" r="58" fill="url(#reveal-glow)" />
                {/* Badge */}
                <polygon
                  points={hexPoints(60, 60, 50)}
                  fill="url(#reveal-fill)"
                  stroke={color}
                  strokeWidth="2.5"
                />
                {/* Circuit lines for Tier 3+ */}
                {tierIndex >= 2 && (
                  <g opacity="0.25">
                    <line x1="30" y1="30" x2="90" y2="90" stroke="white" strokeWidth="0.5" />
                    <line x1="60" y1="15" x2="60" y2="105" stroke="white" strokeWidth="0.5" />
                    <line x1="90" y1="30" x2="30" y2="90" stroke="white" strokeWidth="0.5" />
                  </g>
                )}
                {/* Inner text */}
                <text
                  x="60" y="65"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontWeight="900"
                  fontSize="32"
                  fontFamily="monospace"
                  style={{ filter: `drop-shadow(0 0 8px ${color})` } as any}
                >
                  {['I', 'II', 'III', 'IV'][tierIndex]}
                </text>
              </svg>

              {/* Floating particles */}
              {[0, 1, 2, 3, 4, 5].map(i => (
                <motion.div
                  key={i}
                  className="absolute rounded-full"
                  style={{
                    width: 4,
                    height: 4,
                    background: color,
                    boxShadow: `0 0 8px ${color}`,
                    left: `${15 + i * 14}%`,
                    top: `${20 + (i % 3) * 25}%`,
                  }}
                  animate={{
                    y: [-8, -25, -8],
                    opacity: [0.9, 0.2, 0.9],
                    x: [0, (i % 2 === 0 ? 6 : -6), 0],
                  }}
                  transition={{
                    duration: 1.8 + i * 0.3,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                />
              ))}
            </motion.div>

            {/* Badge name */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-center"
            >
              <div
                className="text-[10px] font-mono font-bold tracking-[0.3em] uppercase mb-1"
                style={{ color: `${color}aa` }}
              >
                BADGE UNLOCKED
              </div>
              <div
                className="text-2xl font-black uppercase tracking-tight"
                style={{
                  color,
                  textShadow: `0 0 20px ${color}50`,
                }}
              >
                {tier?.name || 'Unknown Badge'}
              </div>
            </motion.div>

            {/* XP Boost text */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 }}
              className="px-4 py-2 rounded-xl"
              style={{
                background: `${color}15`,
                border: `1px solid ${color}40`,
              }}
            >
              <span
                className="font-black font-mono text-sm uppercase tracking-widest"
                style={{ color }}
              >
                {tier?.label || ''} BOOST UNLOCKED
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Helper to generate hex points
function hexPoints(cx: number, cy: number, r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
  }).join(' ');
}

export default BadgeUnlockAnim;
