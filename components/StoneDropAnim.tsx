import React, { useEffect, useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getBadgeFillProgress, getUnlockedBadgeCount, getStoneConfig } from '../utils/gameData';
import { playSystemSoundEffect } from '../utils/soundEngine';

interface StoneDropAnimProps {
  outfitId: string;
  amount: number;
  oldCount: number;
  newCount: number;
  color: string;
  glow: string;
  onComplete: () => void;
}

type Phase = 'summon' | 'absorb' | 'filled' | 'levitate' | 'exit';

const VB = 120;
const CX = 60;
const CY = 60;
const R  = 46;

function hexPoints(cx: number, cy: number, r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
  }).join(' ');
}

const StoneDropAnim: React.FC<StoneDropAnimProps> = ({
  outfitId, amount, oldCount, newCount, color, onComplete,
}) => {
  const [phase, setPhase] = useState<Phase>('summon');
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Which badge tier is currently being filled
  const nextTierIdx  = Math.min(getUnlockedBadgeCount(oldCount), 3);
  const displayTier  = Math.min(getUnlockedBadgeCount(newCount), 3);   // tier to show numeral of
  const oldFill      = getBadgeFillProgress(oldCount, nextTierIdx);
  const newFill      = Math.max(oldFill, getBadgeFillProgress(newCount, displayTier));
  const stone        = getStoneConfig(outfitId);

  // 8 shards at different angles + distances
  const shards = useMemo(() => {
    const rng = (n: number) => (((n * 127 + 31) * 251) % 100) / 100; // deterministic pseudo-rand
    return Array.from({ length: 8 }, (_, i) => {
      const angle = (i / 8) * Math.PI * 2 - Math.PI / 2 + (rng(i) * 0.5 - 0.25);
      const dist  = 115 + rng(i + 8) * 50;
      return {
        x0: Math.cos(angle) * dist,
        y0: Math.sin(angle) * dist,
        delay: i * 0.085,
        size: 5 + (i % 3),
      };
    });
  }, []);

  useEffect(() => {
    // Phase timeline
    const t1 = setTimeout(() => setPhase('absorb'),  350);
    const t2 = setTimeout(() => {
      setPhase('filled');
      playSystemSoundEffect('COIN');
    }, 1350);
    const t3 = setTimeout(() => setPhase('levitate'), 1600);
    const t4 = setTimeout(() => setPhase('exit'),     2150);
    const t5 = setTimeout(() => onCompleteRef.current(), 2600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5); };
  }, []);

  // Fill rect y: starts at (1-oldFill)*VB from top, animates to (1-newFill)*VB
  const fillY0 = (1 - oldFill) * VB;
  const fillY1 = (1 - newFill) * VB;

  const isLeviating = phase === 'levitate';
  const isExiting   = phase === 'exit';

  const uid = outfitId.replace(/[^a-z0-9]/gi, '_');

  return (
    <motion.div
      className="fixed inset-0 z-[9998] flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: isExiting ? 0 : 1 }}
      transition={{ duration: isExiting ? 0.45 : 0.22 }}
      style={{ background: 'rgba(0,0,0,0.90)', backdropFilter: 'blur(12px)' }}
    >
      {/* Deep color bloom behind badge */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: phase === 'absorb' || phase === 'filled' || phase === 'levitate' ? 1 : 0 }}
        transition={{ duration: 0.5 }}
        style={{
          background: `radial-gradient(ellipse 55% 40% at 50% 50%, ${color}22 0%, transparent 70%)`,
        }}
      />

      {/* ── BADGE + SHARDS CONTAINER ── */}
      <div className="relative flex items-center justify-center">

        {/* Shards converging into badge */}
        <AnimatePresence>
          {phase === 'absorb' && shards.map((s, i) => (
            <motion.div
              key={i}
              className="absolute pointer-events-none"
              style={{
                width:  s.size,
                height: s.size,
                borderRadius: 2,
                background: color,
                boxShadow: `0 0 ${s.size * 3}px ${color}, 0 0 ${s.size}px white`,
                rotate: `${i * 45}deg`,
              }}
              initial={{ x: s.x0, y: s.y0, opacity: 1, scale: 1 }}
              animate={{ x: 0, y: 0, opacity: 0, scale: 0 }}
              transition={{
                duration: 0.65,
                delay: s.delay,
                ease: [0.4, 0, 0.8, 1],
              }}
              onAnimationComplete={() => {
                if (i === 3) playSystemSoundEffect('TICK');
              }}
            />
          ))}
        </AnimatePresence>

        {/* Impact ring — pulse when shards hit */}
        <AnimatePresence>
          {(phase === 'absorb' || phase === 'filled') && (
            <motion.div
              key={`ring-${phase}`}
              className="absolute pointer-events-none rounded-full"
              style={{
                width:  160,
                height: 160,
                border: `2px solid ${color}`,
                opacity: 0.8,
              }}
              initial={{ scale: 0.5, opacity: 0.8 }}
              animate={{ scale: 2.2, opacity: 0 }}
              transition={{ duration: 0.65, delay: 0.72, ease: 'easeOut' }}
            />
          )}
        </AnimatePresence>

        {/* ── HEX BADGE ── */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{
            scale:   isExiting   ? 0.5 : 1,
            opacity: isExiting   ? 0   : 1,
            y:       isLeviating ? [0, -22, 6, -14, 3, -8, 2, 0] : 0,
            rotate:  isLeviating ? [0, -3, 1.5, -1.2, 0.6, 0]    : 0,
          }}
          transition={{
            scale:   { type: 'spring', stiffness: 430, damping: 19 },
            opacity: { duration: 0.22 },
            y:       isLeviating ? { duration: 1.1, ease: [0.37, 0, 0.63, 1] } : { duration: 0.3 },
            rotate:  { duration: 1.1 },
          }}
          style={{
            filter: phase === 'levitate' || phase === 'filled'
              ? `drop-shadow(0 0 18px ${color}) drop-shadow(0 0 36px ${color}55)`
              : `drop-shadow(0 0 10px ${color}66)`,
          }}
        >
          <svg viewBox="0 0 120 120" width={170} height={170} overflow="visible">
            <defs>
              {/* Fill clipPath — animated upward */}
              <clipPath id={`sd-fill-clip-${uid}`}>
                <motion.rect
                  x={0}
                  width={VB}
                  initial={{ y: fillY0, height: VB - fillY0 }}
                  animate={{ y: fillY1, height: VB - fillY1 }}
                  transition={{ duration: 0.75, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
                />
              </clipPath>

              {/* Liquid fill gradient */}
              <linearGradient id={`sd-fill-${uid}`} x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%"   stopColor={color} stopOpacity="0.45" />
                <stop offset="60%"  stopColor={color} stopOpacity="0.8"  />
                <stop offset="100%" stopColor={color} stopOpacity="1"    />
              </linearGradient>

              {/* Badge dark background */}
              <radialGradient id={`sd-bg-${uid}`} cx="50%" cy="40%" r="60%">
                <stop offset="0%"   stopColor={color} stopOpacity="0.14" />
                <stop offset="100%" stopColor="#060610" stopOpacity="1"  />
              </radialGradient>

              {/* Inner edge glow */}
              <filter id={`sd-glow-${uid}`}>
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Dark hex background */}
            <polygon
              points={hexPoints(CX, CY, R)}
              fill={`url(#sd-bg-${uid})`}
            />

            {/* Crystal fill (clipped, rises up) */}
            <g clipPath={`url(#sd-fill-clip-${uid})`}>
              <polygon
                points={hexPoints(CX, CY, R)}
                fill={`url(#sd-fill-${uid})`}
              />
              {/* Shimmer line on top of fill */}
              <motion.rect
                x={0}
                width={120}
                height={3}
                fill={`${color}88`}
                initial={{ y: fillY0 - 1, opacity: 0 }}
                animate={{ y: [fillY0, fillY1 - 1, fillY1 - 1], opacity: [0, 0.9, 0] }}
                transition={{ duration: 0.75, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
              />
            </g>

            {/* Outer hex border */}
            <polygon
              points={hexPoints(CX, CY, R)}
              fill="none"
              stroke={color}
              strokeWidth="1.5"
              opacity="0.75"
            />

            {/* Inner hex deco ring */}
            <polygon
              points={hexPoints(CX, CY, R - 7)}
              fill="none"
              stroke={color}
              strokeWidth="0.5"
              opacity="0.2"
              strokeDasharray="4 3"
            />

            {/* Tier numeral */}
            <text
              x={CX}
              y={CY + 4}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="white"
              fontWeight="900"
              fontSize="22"
              fontFamily="monospace"
              opacity="0.9"
              style={{ filter: `drop-shadow(0 0 8px ${color})` } as React.CSSProperties}
            >
              {['I', 'II', 'III', 'IV'][displayTier]}
            </text>
          </svg>
        </motion.div>
      </div>

      {/* ── +N CRYSTAL TEXT ── */}
      <motion.div
        className="absolute font-black font-mono uppercase tracking-wider text-center pointer-events-none"
        style={{
          bottom: 'calc(50% - 130px)',
          color,
          fontSize: 'clamp(0.95rem, 4.5vw, 1.35rem)',
          textShadow: `0 0 24px ${color}88, 0 0 8px ${color}`,
          letterSpacing: '0.12em',
        }}
        initial={{ opacity: 0, y: 8 }}
        animate={{
          opacity: phase === 'absorb' || phase === 'filled' || phase === 'levitate' ? 1 : 0,
          y: phase === 'absorb' || phase === 'filled' || phase === 'levitate' ? 0 : 8,
        }}
        transition={{ duration: 0.3, delay: phase === 'absorb' ? 0.5 : 0 }}
      >
        +{amount} {stone.stoneName}
      </motion.div>

      {/* ── DIVIDER LINE ── */}
      <motion.div
        className="absolute pointer-events-none"
        style={{ bottom: 'calc(50% - 155px)', width: 120, height: 1, background: `linear-gradient(to right, transparent, ${color}80, transparent)` }}
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{
          scaleX: phase === 'filled' || phase === 'levitate' ? 1 : 0,
          opacity: phase === 'filled' || phase === 'levitate' ? 1 : 0,
        }}
        transition={{ duration: 0.4 }}
      />
    </motion.div>
  );
};

export default StoneDropAnim;
