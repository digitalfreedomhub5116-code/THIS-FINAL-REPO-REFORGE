
import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getBadgeFillProgress, getUnlockedBadgeCount, getStoneConfig } from '../utils/gameData';
import { playSystemSoundEffect } from '../utils/soundEngine';

export interface BatchStoneEntry {
  outfitId: string;
  amount: number;
  oldCount: number;
  newCount: number;
  color: string;
  glow: string;
}

interface BatchStoneAnimProps {
  stones: BatchStoneEntry[];
  onComplete: () => void;
}

// ── Hex geometry ──
const VB = 80;
const CX = 40;
const CY = 40;
const R  = 30;

function hexPoints(cx: number, cy: number, r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
  }).join(' ');
}

// ── Deterministic pseudo-random for shard placement ──
const prand = (seed: number) => (((seed * 127 + 31) * 251) % 1000) / 1000;

// ── Individual stone card within the batch grid ──
const StoneCard: React.FC<{
  stone: BatchStoneEntry;
  index: number;
  revealed: boolean;
}> = ({ stone, index, revealed }) => {
  const stoneConf = getStoneConfig(stone.outfitId);
  const { color } = stone;
  const uid = `batch_${stone.outfitId.replace(/[^a-z0-9]/gi, '_')}`;

  const nextTierIdx = Math.min(getUnlockedBadgeCount(stone.oldCount), 3);
  const displayTier = Math.min(getUnlockedBadgeCount(stone.newCount), 3);
  const oldFill = getBadgeFillProgress(stone.oldCount, nextTierIdx);
  const newFill = Math.max(oldFill, getBadgeFillProgress(stone.newCount, displayTier));
  const fillY0 = (1 - oldFill) * VB;
  const fillY1 = (1 - newFill) * VB;

  // 6 shards per card
  const shards = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const seed = index * 100 + i;
      const angle = (i / 6) * Math.PI * 2 - Math.PI / 2 + (prand(seed) * 0.6 - 0.3);
      const dist = 70 + prand(seed + 50) * 40;
      return {
        x0: Math.cos(angle) * dist,
        y0: Math.sin(angle) * dist,
        delay: i * 0.07,
        size: 3 + (i % 3),
      };
    });
  }, [index]);

  const [cardPhase, setCardPhase] = useState<'hidden' | 'shards' | 'fill' | 'done'>('hidden');

  useEffect(() => {
    if (!revealed) return;
    setCardPhase('shards');
    const t1 = setTimeout(() => setCardPhase('fill'), 500);
    const t2 = setTimeout(() => setCardPhase('done'), 1200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [revealed]);

  // Counting number animation
  const [displayAmount, setDisplayAmount] = useState(0);
  useEffect(() => {
    if (cardPhase !== 'fill' && cardPhase !== 'done') return;
    let frame: number;
    const start = performance.now();
    const duration = 600;
    const animate = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setDisplayAmount(Math.round(eased * stone.amount));
      if (t < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [cardPhase, stone.amount]);

  return (
    <motion.div
      className="flex flex-col items-center relative"
      initial={{ opacity: 0, scale: 0.3, y: 30 }}
      animate={revealed ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.3, y: 30 }}
      transition={{ type: 'spring', stiffness: 350, damping: 22 }}
    >
      {/* Glow backdrop */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 90, height: 90,
          background: `radial-gradient(circle, ${color}20 0%, transparent 70%)`,
          top: -5, left: '50%', transform: 'translateX(-50%)',
        }}
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: cardPhase === 'fill' || cardPhase === 'done' ? 1 : 0, scale: 1 }}
        transition={{ duration: 0.5 }}
      />

      {/* Shard convergence */}
      <div className="relative" style={{ width: 80, height: 80 }}>
        <AnimatePresence>
          {cardPhase === 'shards' && shards.map((s, i) => (
            <motion.div
              key={i}
              className="absolute pointer-events-none"
              style={{
                width: s.size, height: s.size,
                borderRadius: 1,
                background: color,
                boxShadow: `0 0 ${s.size * 2}px ${color}`,
                left: '50%', top: '50%',
              }}
              initial={{ x: s.x0, y: s.y0, opacity: 1, scale: 1.2 }}
              animate={{ x: 0, y: 0, opacity: 0, scale: 0 }}
              transition={{ duration: 0.45, delay: s.delay, ease: [0.4, 0, 0.8, 1] }}
            />
          ))}
        </AnimatePresence>

        {/* Impact ring */}
        {(cardPhase === 'fill' || cardPhase === 'done') && (
          <motion.div
            className="absolute pointer-events-none rounded-full"
            style={{
              width: 80, height: 80,
              border: `1.5px solid ${color}`,
              left: 0, top: 0,
            }}
            initial={{ scale: 0.4, opacity: 0.7 }}
            animate={{ scale: 1.8, opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        )}

        {/* Hex Badge SVG */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ scale: 0, opacity: 0 }}
          animate={{
            scale: revealed ? 1 : 0,
            opacity: revealed ? 1 : 0,
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.05 }}
          style={{
            filter: cardPhase === 'fill' || cardPhase === 'done'
              ? `drop-shadow(0 0 12px ${color}) drop-shadow(0 0 24px ${color}44)`
              : `drop-shadow(0 0 6px ${color}55)`,
          }}
        >
          <svg viewBox={`0 0 ${VB} ${VB}`} width={80} height={80} overflow="visible">
            <defs>
              <clipPath id={`bf-clip-${uid}`}>
                <motion.rect
                  x={0} width={VB}
                  initial={{ y: fillY0, height: VB - fillY0 }}
                  animate={cardPhase === 'fill' || cardPhase === 'done'
                    ? { y: fillY1, height: VB - fillY1 }
                    : { y: fillY0, height: VB - fillY0 }}
                  transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                />
              </clipPath>
              <linearGradient id={`bf-grad-${uid}`} x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor={color} stopOpacity="0.4" />
                <stop offset="60%" stopColor={color} stopOpacity="0.75" />
                <stop offset="100%" stopColor={color} stopOpacity="1" />
              </linearGradient>
              <radialGradient id={`bf-bg-${uid}`} cx="50%" cy="40%" r="60%">
                <stop offset="0%" stopColor={color} stopOpacity="0.12" />
                <stop offset="100%" stopColor="#060610" stopOpacity="1" />
              </radialGradient>
            </defs>

            {/* Dark hex background */}
            <polygon points={hexPoints(CX, CY, R)} fill={`url(#bf-bg-${uid})`} />

            {/* Crystal fill (clipped, rises up) */}
            <g clipPath={`url(#bf-clip-${uid})`}>
              <polygon points={hexPoints(CX, CY, R)} fill={`url(#bf-grad-${uid})`} />
            </g>

            {/* Outer hex border */}
            <polygon
              points={hexPoints(CX, CY, R)}
              fill="none" stroke={color} strokeWidth="1.2" opacity="0.7"
            />

            {/* Inner deco ring */}
            <polygon
              points={hexPoints(CX, CY, R - 5)}
              fill="none" stroke={color} strokeWidth="0.4" opacity="0.15"
              strokeDasharray="3 2"
            />

            {/* Tier numeral */}
            <text
              x={CX} y={CY + 3}
              textAnchor="middle" dominantBaseline="middle"
              fill="white" fontWeight="900" fontSize="15" fontFamily="monospace"
              opacity="0.85"
              style={{ filter: `drop-shadow(0 0 6px ${color})` } as React.CSSProperties}
            >
              {['I', 'II', 'III', 'IV'][displayTier]}
            </text>
          </svg>
        </motion.div>
      </div>

      {/* +N amount */}
      <motion.div
        className="font-black font-mono text-center pointer-events-none mt-1"
        style={{
          color,
          fontSize: 'clamp(0.8rem, 3.5vw, 1.05rem)',
          textShadow: `0 0 16px ${color}88, 0 0 6px ${color}`,
        }}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: cardPhase === 'fill' || cardPhase === 'done' ? 1 : 0, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        +{displayAmount}
      </motion.div>

      {/* Stone name */}
      <motion.div
        className="font-mono font-bold text-center pointer-events-none uppercase tracking-wider"
        style={{
          color: `${color}cc`,
          fontSize: 'clamp(0.5rem, 2.2vw, 0.6rem)',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: cardPhase === 'fill' || cardPhase === 'done' ? 0.8 : 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
      >
        {stoneConf.stoneName.replace(' Crystal', '')}
      </motion.div>
    </motion.div>
  );
};

// ── Main Batch Animation ──
const BatchStoneAnim: React.FC<BatchStoneAnimProps> = ({ stones, onComplete }) => {
  const [phase, setPhase] = useState<'enter' | 'reveal' | 'hold' | 'exit'>('enter');
  const [revealedCount, setRevealedCount] = useState(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const dismissed = useRef(false);

  // Phase 1: Enter → Reveal
  useEffect(() => {
    const t = setTimeout(() => setPhase('reveal'), 500);
    return () => clearTimeout(t);
  }, []);

  // Phase 2: Stagger card reveals
  useEffect(() => {
    if (phase !== 'reveal') return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    stones.forEach((_, i) => {
      timers.push(setTimeout(() => {
        setRevealedCount(prev => prev + 1);
        if (i === 0) playSystemSoundEffect('COIN');
        else playSystemSoundEffect('TICK');
      }, i * 350 + 50));
    });
    // After all revealed, transition to hold
    timers.push(setTimeout(() => {
      playSystemSoundEffect('SUCCESS');
      setPhase('hold');
    }, stones.length * 350 + 1000));
    return () => timers.forEach(clearTimeout);
  }, [phase, stones]);

  // Phase 3: Auto-dismiss after hold
  useEffect(() => {
    if (phase !== 'hold') return;
    const t = setTimeout(() => {
      if (!dismissed.current) {
        dismissed.current = true;
        setPhase('exit');
      }
    }, 3000);
    return () => clearTimeout(t);
  }, [phase]);

  // Phase 4: Exit complete
  useEffect(() => {
    if (phase !== 'exit') return;
    const t = setTimeout(() => onCompleteRef.current(), 450);
    return () => clearTimeout(t);
  }, [phase]);

  const handleTap = useCallback(() => {
    if ((phase === 'hold' || phase === 'reveal') && !dismissed.current) {
      dismissed.current = true;
      setPhase('exit');
    }
  }, [phase]);

  // Grid columns: 2 for 2-4 items, 3 for 5+
  const cols = stones.length <= 1 ? 1 : stones.length <= 4 ? 2 : 3;

  // Floating particles background
  const particles = useMemo(() =>
    Array.from({ length: 20 }, (_, i) => ({
      x: prand(i * 7) * 100,
      y: prand(i * 13 + 3) * 100,
      size: 1 + prand(i * 19 + 7) * 2,
      duration: 3 + prand(i * 23) * 4,
      delay: prand(i * 31) * 3,
      color: stones[i % stones.length]?.color || '#fff',
    })),
  [stones]);

  return (
    <motion.div
      className="fixed inset-0 z-[9998] flex flex-col items-center justify-center overflow-hidden cursor-pointer"
      initial={{ opacity: 0 }}
      animate={{ opacity: phase === 'exit' ? 0 : 1 }}
      transition={{ duration: phase === 'exit' ? 0.4 : 0.35 }}
      style={{ background: 'rgba(2,2,8,0.94)', backdropFilter: 'blur(20px)' }}
      onClick={handleTap}
    >
      {/* Ambient floating particles */}
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: p.size, height: p.size,
            background: p.color,
            opacity: 0.15,
            left: `${p.x}%`, top: `${p.y}%`,
            boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.08, 0.25, 0.08],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Radial bloom */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: phase !== 'enter' ? 1 : 0 }}
        transition={{ duration: 0.8 }}
        style={{
          background: `radial-gradient(ellipse 60% 45% at 50% 50%, ${stones[0]?.color || '#fff'}10 0%, transparent 70%)`,
        }}
      />

      {/* ── Title ── */}
      <motion.div
        className="text-center mb-10 pointer-events-none relative z-10"
        initial={{ opacity: 0, y: -25, scale: 0.9 }}
        animate={{
          opacity: phase !== 'enter' ? 1 : 0,
          y: phase !== 'enter' ? 0 : -25,
          scale: phase !== 'enter' ? 1 : 0.9,
        }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="text-[10px] font-mono font-bold tracking-[0.6em] text-white/30 uppercase mb-2">
          Tower Haul
        </div>
        <h2 className="text-xl font-black font-mono text-white/95 tracking-[0.15em] uppercase"
          style={{ textShadow: '0 0 30px rgba(255,255,255,0.1)' }}
        >
          CRYSTALS ACQUIRED
        </h2>
        <motion.div
          className="h-[1px] mx-auto mt-3 rounded-full"
          style={{ background: `linear-gradient(to right, transparent, ${stones[0]?.color || '#fff'}60, transparent)` }}
          initial={{ width: 0 }}
          animate={{ width: phase !== 'enter' ? 100 : 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
        />
      </motion.div>

      {/* ── Stone Grid ── */}
      <div
        className="grid pointer-events-none relative z-10"
        style={{
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: '28px 24px',
          maxWidth: cols * 120 + (cols - 1) * 24,
          padding: '0 16px',
        }}
      >
        {stones.map((stone, idx) => (
          <StoneCard
            key={stone.outfitId}
            stone={stone}
            index={idx}
            revealed={idx < revealedCount}
          />
        ))}
      </div>

      {/* ── Collective pulse after all revealed ── */}
      <AnimatePresence>
        {phase === 'hold' && (
          <motion.div
            className="absolute pointer-events-none rounded-full"
            style={{
              width: 200, height: 200,
              border: `1px solid rgba(255,255,255,0.15)`,
            }}
            initial={{ scale: 0.3, opacity: 0.5 }}
            animate={{ scale: 3, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>

      {/* ── Tap hint ── */}
      <motion.p
        className="absolute bottom-10 text-[9px] font-mono text-white/25 tracking-[0.4em] uppercase pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: phase === 'hold' ? 1 : 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
      >
        tap to continue
      </motion.p>
    </motion.div>
  );
};

export default BatchStoneAnim;
