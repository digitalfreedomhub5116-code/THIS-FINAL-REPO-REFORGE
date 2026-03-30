import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BADGE_TIERS, getStoneConfig } from '../utils/gameData';
import { playSystemSoundEffect } from '../utils/soundEngine';

interface BadgeUnlockAnimProps {
  tierIndex: number;
  outfitId: string;
  onComplete: () => void;
}

type Phase = 'crack' | 'impact' | 'reveal';

const BadgeUnlockAnim: React.FC<BadgeUnlockAnimProps> = ({ tierIndex, outfitId, onComplete }) => {
  const [phase, setPhase] = useState<Phase>('crack');
  const [showFlash, setShowFlash] = useState(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const tier  = BADGE_TIERS[tierIndex];
  const stone = getStoneConfig(outfitId);
  const color = stone.stoneColor;
  const uid   = outfitId.replace(/[^a-z0-9]/gi, '_');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('impact'), 1200);
    const t2 = setTimeout(() => { setShowFlash(true); playSystemSoundEffect('VICTORY_BURST'); }, 1700);
    const t3 = setTimeout(() => setShowFlash(false), 1950);
    const t4 = setTimeout(() => setPhase('reveal'), 2050);
    const t5 = setTimeout(() => onCompleteRef.current(), 5000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5); };
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.5 } }}
      style={{ background: 'rgba(0,0,0,0.94)', backdropFilter: 'blur(14px)' }}
    >
      {/* Background atmosphere bloom */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{
          background: phase === 'reveal'
            ? `radial-gradient(ellipse 70% 55% at 50% 45%, ${color}18 0%, transparent 65%)`
            : 'transparent',
        }}
        transition={{ duration: 0.6 }}
      />

      {/* Screen flash on impact */}
      <AnimatePresence>
        {showFlash && (
          <motion.div
            key="flash"
            className="absolute inset-0 pointer-events-none z-10"
            initial={{ opacity: 0.75 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            style={{ background: `radial-gradient(ellipse at center, white 0%, ${color}88 40%, transparent 70%)` }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">

        {/* ── PHASE 1: CRACK ── locked badge vibrates, crack lines radiate */}
        {phase === 'crack' && (
          <motion.div
            key="crack"
            className="relative flex items-center justify-center"
            style={{ width: 220, height: 220 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.4, transition: { duration: 0.25 } }}
          >
            <motion.div
              animate={{
                x: [0, -4, 4, -3, 3, -5, 5, -2, 0],
                y: [0, 2, -2, 1, -1, 3, -3, 1, 0],
                rotate: [0, -1.5, 1.5, -2, 2, 0],
              }}
              transition={{ duration: 1.0, ease: 'easeInOut' }}
              className="relative"
            >
              <svg viewBox="0 0 120 120" width={150} height={150}>
                <polygon
                  points={hexPoints(60, 60, 50)}
                  fill="rgba(15,15,25,0.95)"
                  stroke="rgba(255,255,255,0.12)"
                  strokeWidth="2"
                  strokeDasharray="5 4"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-4xl opacity-30">🔒</span>
              </div>
            </motion.div>

            {[0, 1, 2, 3, 4, 5].map(i => (
              <motion.div
                key={i}
                className="absolute pointer-events-none"
                style={{
                  width: 2,
                  height: 72,
                  background: `linear-gradient(to bottom, ${color}dd, transparent)`,
                  transformOrigin: '50% 0%',
                  left: '50%',
                  top: '50%',
                  transform: `translateX(-50%) rotate(${i * 60}deg)`,
                }}
                initial={{ scaleY: 0, opacity: 0 }}
                animate={{ scaleY: [0, 1, 0.7], opacity: [0, 0.9, 0.5] }}
                transition={{ duration: 0.9, delay: 0.25 + i * 0.07 }}
              />
            ))}

            <motion.div
              className="absolute pointer-events-none rounded-full"
              style={{ width: 160, height: 160, border: `1.5px solid ${color}60` }}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: [0.6, 1.2, 1.0], opacity: [0, 0.6, 0.3] }}
              transition={{ duration: 1.0, delay: 0.2 }}
            />
          </motion.div>
        )}

        {/* ── PHASE 2: IMPACT ── badge drops with spring, multiple shockwave rings */}
        {phase === 'impact' && (
          <motion.div
            key="impact"
            className="relative flex flex-col items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ y: -350, scale: 0.4, opacity: 0, rotate: -8 }}
              animate={{ y: 0, scale: 1, opacity: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 280, damping: 16 }}
              className="relative"
            >
              <svg viewBox="0 0 120 120" width={170} height={170} overflow="visible">
                <defs>
                  <linearGradient id={`impact-fill-${uid}`} x1="0" y1="1" x2="1" y2="0">
                    <stop offset="0%" stopColor={color} stopOpacity="0.6" />
                    <stop offset="100%" stopColor={color} />
                  </linearGradient>
                </defs>
                <polygon
                  points={hexPoints(60, 60, 50)}
                  fill={`url(#impact-fill-${uid})`}
                  stroke={color}
                  strokeWidth="2.5"
                  style={{ filter: `drop-shadow(0 0 12px ${color})` } as React.CSSProperties}
                />
                <text
                  x="60" y="65"
                  textAnchor="middle" dominantBaseline="middle"
                  fill="white" fontWeight="900" fontSize="28" fontFamily="monospace"
                  style={{ filter: `drop-shadow(0 0 10px ${color})` } as React.CSSProperties}
                >
                  {['I', 'II', 'III', 'IV'][tierIndex]}
                </text>
              </svg>
            </motion.div>

            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                className="absolute pointer-events-none rounded-full"
                style={{
                  width: 180, height: 180,
                  border: `${2 - i * 0.5}px solid ${color}`,
                  top: '50%', left: '50%',
                  transform: 'translate(-50%, -50%)',
                }}
                initial={{ scale: 0.4, opacity: 0.85 - i * 0.2 }}
                animate={{ scale: 2.8 + i * 0.4, opacity: 0 }}
                transition={{ duration: 0.75 + i * 0.12, ease: 'easeOut', delay: i * 0.1 }}
              />
            ))}
          </motion.div>
        )}

        {/* ── PHASE 3: REVEAL ── cinematic badge with orbiting particles + scale-punch name */}
        {phase === 'reveal' && (
          <motion.div
            key="reveal"
            className="relative flex flex-col items-center gap-7"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 320, damping: 22 }}
          >
            {/* Glowing badge */}
            <motion.div
              className="relative"
              animate={{
                filter: [
                  `drop-shadow(0 0 18px ${color}) drop-shadow(0 0 36px ${color}55)`,
                  `drop-shadow(0 0 32px ${color}) drop-shadow(0 0 60px ${color}77)`,
                  `drop-shadow(0 0 18px ${color}) drop-shadow(0 0 36px ${color}55)`,
                ],
              }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <svg viewBox="0 0 120 120" width={200} height={200} overflow="visible">
                <defs>
                  <linearGradient id={`reveal-fill-${uid}`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%"   stopColor={color} />
                    <stop offset="100%" stopColor={color} stopOpacity="0.7" />
                  </linearGradient>
                  <radialGradient id={`reveal-glow-${uid}`}>
                    <stop offset="0%"   stopColor={color} stopOpacity="0.35" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                  </radialGradient>
                </defs>
                <circle cx="60" cy="60" r="62" fill={`url(#reveal-glow-${uid})`} />
                <polygon
                  points={hexPoints(60, 60, 50)}
                  fill={`url(#reveal-fill-${uid})`}
                  stroke={color}
                  strokeWidth="2"
                />
                <polygon
                  points={hexPoints(60, 60, 40)}
                  fill="none" stroke="white" strokeWidth="0.5" opacity="0.15" strokeDasharray="4 3"
                />
                {tierIndex >= 2 && (
                  <g opacity="0.18">
                    <line x1="30" y1="30" x2="90" y2="90" stroke="white" strokeWidth="0.6" />
                    <line x1="60" y1="14" x2="60" y2="106" stroke="white" strokeWidth="0.6" />
                    <line x1="90" y1="30" x2="30" y2="90" stroke="white" strokeWidth="0.6" />
                  </g>
                )}
                <text
                  x="60" y="65"
                  textAnchor="middle" dominantBaseline="middle"
                  fill="white" fontWeight="900" fontSize="32" fontFamily="monospace"
                  style={{ filter: `drop-shadow(0 0 10px ${color})` } as React.CSSProperties}
                >
                  {['I', 'II', 'III', 'IV'][tierIndex]}
                </text>
              </svg>

              {/* Orbiting particles */}
              {Array.from({ length: tierIndex + 4 }, (_, i) => {
                const orbitR = 105 + (i % 2) * 14;
                const startAngle = (i / (tierIndex + 4)) * Math.PI * 2;
                return (
                  <motion.div
                    key={i}
                    className="absolute rounded-full pointer-events-none"
                    style={{
                      width: 3 + (i % 3), height: 3 + (i % 3),
                      background: color, boxShadow: `0 0 8px ${color}`,
                      top: '50%', left: '50%',
                    }}
                    animate={{
                      x: [
                        Math.cos(startAngle) * orbitR,
                        Math.cos(startAngle + Math.PI) * orbitR,
                        Math.cos(startAngle + Math.PI * 2) * orbitR,
                      ],
                      y: [
                        Math.sin(startAngle) * orbitR,
                        Math.sin(startAngle + Math.PI) * orbitR,
                        Math.sin(startAngle + Math.PI * 2) * orbitR,
                      ],
                    }}
                    transition={{ duration: 3.5 + i * 0.4, repeat: Infinity, ease: 'linear', delay: i * 0.15 }}
                  />
                );
              })}
            </motion.div>

            {/* Text section */}
            <div className="text-center">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="text-[10px] font-mono font-bold tracking-[0.35em] uppercase mb-2"
                style={{ color: `${color}bb` }}
              >
                BADGE UNLOCKED
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: [0.5, 1.12, 1.0] }}
                transition={{ delay: 0.35, duration: 0.5, times: [0, 0.6, 1] }}
                className="text-[clamp(1.4rem,7vw,2rem)] font-black uppercase tracking-tight"
                style={{ color, textShadow: `0 0 24px ${color}60` }}
              >
                {tier?.name || 'Badge'}
              </motion.div>

              <motion.div
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.45 }}
                className="h-px w-32 mx-auto my-2.5 rounded-full"
                style={{ background: `linear-gradient(to right, transparent, ${color}, transparent)` }}
              />
            </div>

            {/* XP Boost pill */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="px-5 py-2.5 rounded-2xl relative overflow-hidden"
              style={{ background: `${color}14`, border: `1px solid ${color}45` }}
            >
              <motion.div
                className="absolute inset-y-0 w-8 pointer-events-none"
                style={{ background: `linear-gradient(to right, transparent, ${color}30, transparent)` }}
                initial={{ x: -32 }}
                animate={{ x: 200 }}
                transition={{ delay: 0.9, duration: 0.65, ease: 'easeInOut' }}
              />
              <span className="font-black font-mono text-sm uppercase tracking-widest relative" style={{ color }}>
                {tier?.label || ''} XP BOOST UNLOCKED
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
