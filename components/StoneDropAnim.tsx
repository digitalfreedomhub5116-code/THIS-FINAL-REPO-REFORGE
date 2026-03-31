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

const prand = (seed: number) => (((seed * 127 + 31) * 251) % 1000) / 1000;

const StoneDropAnim: React.FC<StoneDropAnimProps> = ({
  outfitId, amount, oldCount, newCount, color, onComplete,
}) => {
  const [phase, setPhase] = useState<Phase>('summon');
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const nextTierIdx  = Math.min(getUnlockedBadgeCount(oldCount), 3);
  const displayTier  = Math.min(getUnlockedBadgeCount(newCount), 3);
  const oldFill      = getBadgeFillProgress(oldCount, nextTierIdx);
  const newFill      = Math.max(oldFill, getBadgeFillProgress(newCount, displayTier));
  const stone        = getStoneConfig(outfitId);

  // 10 shards at different angles + distances
  const shards = useMemo(() => {
    return Array.from({ length: 10 }, (_, i) => {
      const angle = (i / 10) * Math.PI * 2 - Math.PI / 2 + (prand(i) * 0.4 - 0.2);
      const dist  = 120 + prand(i + 8) * 60;
      return {
        x0: Math.cos(angle) * dist,
        y0: Math.sin(angle) * dist,
        delay: i * 0.06,
        size: 4 + (i % 3) * 1.5,
      };
    });
  }, []);

  // Ambient particles
  const ambientParticles = useMemo(() =>
    Array.from({ length: 14 }, (_, i) => ({
      x: prand(i * 7) * 100,
      y: prand(i * 13 + 3) * 100,
      size: 1 + prand(i * 19 + 7) * 1.5,
      duration: 3 + prand(i * 23) * 3,
      delay: prand(i * 31) * 2,
    })),
  []);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('absorb'),  400);
    const t2 = setTimeout(() => {
      setPhase('filled');
      playSystemSoundEffect('COIN');
    }, 1400);
    const t3 = setTimeout(() => setPhase('levitate'), 1700);
    const t4 = setTimeout(() => setPhase('exit'),     2300);
    const t5 = setTimeout(() => onCompleteRef.current(), 2750);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5); };
  }, []);

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
      transition={{ duration: isExiting ? 0.4 : 0.25 }}
      style={{ background: 'rgba(2,2,8,0.93)', backdropFilter: 'blur(16px)' }}
    >
      {/* Ambient floating particles */}
      {ambientParticles.map((p, i) => (
        <motion.div
          key={`ap-${i}`}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: p.size, height: p.size,
            background: color,
            opacity: 0.1,
            left: `${p.x}%`, top: `${p.y}%`,
            boxShadow: `0 0 ${p.size * 4}px ${color}`,
          }}
          animate={{ y: [0, -25, 0], opacity: [0.06, 0.2, 0.06] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}

      {/* Deep color bloom behind badge */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: phase === 'absorb' || phase === 'filled' || phase === 'levitate' ? 1 : 0 }}
        transition={{ duration: 0.6 }}
        style={{
          background: `radial-gradient(ellipse 50% 35% at 50% 48%, ${color}18 0%, transparent 70%)`,
        }}
      />

      {/* ── BADGE + SHARDS CONTAINER ── */}
      <div className="relative flex flex-col items-center justify-center">

        <div className="relative">
          {/* Shards converging into badge */}
          <AnimatePresence>
            {phase === 'absorb' && shards.map((s, i) => (
              <motion.div
                key={i}
                className="absolute pointer-events-none"
                style={{
                  width:  s.size,
                  height: s.size,
                  borderRadius: s.size > 5 ? 2 : 1,
                  background: color,
                  boxShadow: `0 0 ${s.size * 3}px ${color}, 0 0 ${s.size}px rgba(255,255,255,0.4)`,
                  rotate: `${i * 36}deg`,
                  left: '50%', top: '50%',
                  marginLeft: -s.size / 2, marginTop: -s.size / 2,
                }}
                initial={{ x: s.x0, y: s.y0, opacity: 1, scale: 1.2 }}
                animate={{ x: 0, y: 0, opacity: 0, scale: 0 }}
                transition={{
                  duration: 0.6,
                  delay: s.delay,
                  ease: [0.4, 0, 0.8, 1],
                }}
                onAnimationComplete={() => {
                  if (i === 4) playSystemSoundEffect('TICK');
                }}
              />
            ))}
          </AnimatePresence>

          {/* Impact ring — pulse when shards hit */}
          <AnimatePresence>
            {(phase === 'filled') && (
              <>
                <motion.div
                  key="ring-inner"
                  className="absolute pointer-events-none rounded-full"
                  style={{
                    width: 170, height: 170,
                    border: `1.5px solid ${color}`,
                    left: '50%', top: '50%',
                    marginLeft: -85, marginTop: -85,
                  }}
                  initial={{ scale: 0.4, opacity: 0.7 }}
                  animate={{ scale: 2, opacity: 0 }}
                  transition={{ duration: 0.7, ease: 'easeOut' }}
                />
                <motion.div
                  key="ring-outer"
                  className="absolute pointer-events-none rounded-full"
                  style={{
                    width: 170, height: 170,
                    border: `1px solid ${color}`,
                    left: '50%', top: '50%',
                    marginLeft: -85, marginTop: -85,
                  }}
                  initial={{ scale: 0.6, opacity: 0.4 }}
                  animate={{ scale: 2.8, opacity: 0 }}
                  transition={{ duration: 0.9, delay: 0.1, ease: 'easeOut' }}
                />
              </>
            )}
          </AnimatePresence>

          {/* ── HEX BADGE ── */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale:   isExiting ? 0.6 : 1,
              opacity: isExiting ? 0   : 1,
              y:       isLeviating ? [0, -18, 4, -10, 2, -5, 0] : 0,
              rotate:  isLeviating ? [0, -2, 1, -0.8, 0.4, 0]   : 0,
            }}
            transition={{
              scale:   { type: 'spring', stiffness: 400, damping: 20 },
              opacity: { duration: 0.25 },
              y:       isLeviating ? { duration: 1.0, ease: [0.37, 0, 0.63, 1] } : { duration: 0.3 },
              rotate:  { duration: 1.0 },
            }}
            style={{
              filter: phase === 'levitate' || phase === 'filled'
                ? `drop-shadow(0 0 20px ${color}) drop-shadow(0 0 40px ${color}44)`
                : `drop-shadow(0 0 8px ${color}55)`,
            }}
          >
            <svg viewBox="0 0 120 120" width={170} height={170}>
              <defs>
                {/* Hex-shaped clip for the fill — prevents bleed outside hex */}
                <clipPath id={`sd-hex-clip-${uid}`}>
                  <polygon points={hexPoints(CX, CY, R)} />
                </clipPath>

                {/* Fill level rect clip — animated upward */}
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
                  <stop offset="0%"   stopColor={color} stopOpacity="0.4" />
                  <stop offset="50%"  stopColor={color} stopOpacity="0.7" />
                  <stop offset="100%" stopColor={color} stopOpacity="0.95" />
                </linearGradient>

                {/* Badge dark background */}
                <radialGradient id={`sd-bg-${uid}`} cx="50%" cy="40%" r="60%">
                  <stop offset="0%"   stopColor={color} stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#060610" stopOpacity="1" />
                </radialGradient>
              </defs>

              {/* Dark hex background */}
              <polygon
                points={hexPoints(CX, CY, R)}
                fill={`url(#sd-bg-${uid})`}
              />

              {/* Crystal fill — double clipped: hex shape + rising level */}
              <g clipPath={`url(#sd-hex-clip-${uid})`}>
                <g clipPath={`url(#sd-fill-clip-${uid})`}>
                  <polygon
                    points={hexPoints(CX, CY, R)}
                    fill={`url(#sd-fill-${uid})`}
                  />
                </g>
              </g>

              {/* Outer hex border */}
              <polygon
                points={hexPoints(CX, CY, R)}
                fill="none"
                stroke={color}
                strokeWidth="1.5"
                opacity="0.7"
                strokeLinejoin="round"
              />

              {/* Inner hex deco ring */}
              <polygon
                points={hexPoints(CX, CY, R - 7)}
                fill="none"
                stroke={color}
                strokeWidth="0.4"
                opacity="0.18"
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
          className="font-black font-mono uppercase tracking-wider text-center pointer-events-none mt-4"
          style={{
            color,
            fontSize: 'clamp(1rem, 4.5vw, 1.4rem)',
            textShadow: `0 0 24px ${color}88, 0 0 8px ${color}`,
            letterSpacing: '0.12em',
          }}
          initial={{ opacity: 0, y: 10 }}
          animate={{
            opacity: phase === 'absorb' || phase === 'filled' || phase === 'levitate' ? 1 : 0,
            y: phase === 'absorb' || phase === 'filled' || phase === 'levitate' ? 0 : 10,
          }}
          transition={{ duration: 0.35, delay: phase === 'absorb' ? 0.5 : 0 }}
        >
          +{amount} {stone.stoneName}
        </motion.div>

        {/* ── Stone name subtitle ── */}
        <motion.div
          className="font-mono font-bold text-center pointer-events-none uppercase tracking-[0.3em] mt-1"
          style={{
            color: `${color}88`,
            fontSize: 'clamp(0.55rem, 2.5vw, 0.7rem)',
          }}
          initial={{ opacity: 0 }}
          animate={{
            opacity: phase === 'filled' || phase === 'levitate' ? 0.6 : 0,
          }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          Badge Tier {['I', 'II', 'III', 'IV'][displayTier]}
        </motion.div>
      </div>
    </motion.div>
  );
};

export default StoneDropAnim;
