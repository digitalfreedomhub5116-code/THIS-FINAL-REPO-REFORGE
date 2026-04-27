import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Lottie from 'lottie-react';

// ── Outfit config for accent theming ──
const OUTFIT_CONFIG: Record<string, { accent: string; glow: string }> = {
  outfit_starter:  { accent: '#9ca3af', glow: '#60a5fa' },
  outfit_ghost:    { accent: '#4ade80', glow: '#7EB8D4' },
  outfit_knight:   { accent: '#60a5fa', glow: '#7EB8D4' },
  outfit_assassin: { accent: '#9ACDE3', glow: '#e879f9' },
  outfit_vanguard: { accent: '#facc15', glow: '#fb923c' },
  outfit_monarch:  { accent: '#f87171', glow: '#fb923c' },
};
const DEFAULT_CFG = OUTFIT_CONFIG.outfit_starter;

interface StreakCelebrationProps {
  oldStreak: number;
  newStreak: number;
  outfitId: string;
  weeklyActivity: boolean[]; // 7 entries, Mon→Sun
  streakBroken: boolean;     // true if streak was reset (missed >1 day)
  onComplete: () => void;
}

// ── Energy slash paths (radiating from center) ──
const SLASH_PATHS = [
  'M0,-40 Q8,-60 4,-75',
  'M28,-28 Q42,-38 52,-52',
  'M40,0 Q60,8 75,4',
  'M28,28 Q38,42 52,52',
  'M0,40 Q-8,60 -4,75',
  'M-28,28 Q-42,38 -52,52',
  'M-40,0 Q-60,-8 -75,-4',
  'M-28,-28 Q-38,-42 -52,-52',
  'M20,-35 Q32,-55 28,-70',
  'M-20,-35 Q-32,-55 -28,-70',
  'M35,20 Q55,32 70,28',
  'M-35,20 Q-55,32 -70,28',
];

let _flameLottieData: object | null | false = null;

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// ── Flame size scales with streak ──
function getFlameScale(streak: number): number {
  if (streak <= 1) return 0.85;
  if (streak <= 3) return 0.92;
  if (streak <= 7) return 1.0;
  if (streak <= 14) return 1.08;
  if (streak <= 30) return 1.16;
  if (streak <= 60) return 1.25;
  if (streak <= 100) return 1.35;
  return 1.45;
}

// ── Flame intensity tiers ──
function getFlameIntensity(streak: number): number {
  if (streak <= 1) return 1;
  if (streak <= 7) return 2;
  if (streak <= 30) return 3;
  if (streak <= 60) return 4;
  return 5;
}

// ── Seeded random for consistent particle positions ──
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const StreakCelebration: React.FC<StreakCelebrationProps> = ({
  oldStreak, newStreak, outfitId, weeklyActivity, streakBroken, onComplete,
}) => {
  const cfg = OUTFIT_CONFIG[outfitId] || DEFAULT_CFG;
  const [phase, setPhase] = useState(0);
  const [lottieData, setLottieData] = useState<object | null | false>(_flameLottieData);

  useEffect(() => {
    if (_flameLottieData !== null) { setLottieData(_flameLottieData); return; }
    fetch('/assets/lottie/flame.json').then(r => r.ok ? r.json() : null).then(data => { _flameLottieData = data ?? false; setLottieData(_flameLottieData); }).catch(() => { _flameLottieData = false; setLottieData(false); });
  }, []);

  const flameScale = getFlameScale(newStreak);
  const intensity = getFlameIntensity(newStreak);
  const isPerfectWeek = useMemo(() => weeklyActivity.filter(Boolean).length >= 7, [weeklyActivity]);
  const rand = useRef(seededRandom(newStreak * 7 + 42)).current;

  // ── Shatter animation states (broken streak only) ──
  const [shatterActive, setShatterActive] = useState(false);
  const [numberBurning, setNumberBurning] = useState(false);

  // Generate shatter fragment data for the old streak number
  const shatterFragments = useMemo(() => {
    if (!streakBroken) return [];
    const frags: Array<{ id: number; clipPath: string; tx: number; ty: number; rot: number; delay: number }> = [];
    const cols = 5, rows = 4;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const j = 3;
        const x1 = (c / cols) * 100 + rand() * j, y1 = (r / rows) * 100 + rand() * j;
        const x2 = ((c + 1) / cols) * 100 - rand() * j, y2 = ((r + 1) / rows) * 100 - rand() * j;
        const dirX = ((x1 + x2) / 2 - 50) / 50;
        frags.push({
          id: r * cols + c,
          clipPath: `polygon(${x1}% ${y1}%, ${x2}% ${y1}%, ${x2}% ${y2}%, ${x1}% ${y2}%)`,
          tx: dirX * 280 + (rand() - 0.5) * 120,
          ty: 150 + rand() * 350,
          rot: (rand() - 0.5) * 720,
          delay: rand() * 0.15,
        });
      }
    }
    return frags;
  }, [streakBroken, rand]);

  // Pre-computed ember particles for shatter burst
  const shatterEmbers = useMemo(() => {
    if (!streakBroken) return [];
    return Array.from({ length: 28 }, (_, i) => ({
      id: i, size: 2 + rand() * 5, colorIdx: i % 4,
      tx: (rand() - 0.5) * 280, ty: -60 - rand() * 120,
      dur: 0.6 + rand() * 0.6, delay: rand() * 0.15,
    }));
  }, [streakBroken, rand]);

  // Crack line paths for the burning number
  const crackLines = useMemo(() => [
    'M 28 8 L 42 32 L 35 50 L 52 78 L 44 95',
    'M 72 5 L 58 28 L 66 48 L 48 72 L 58 98',
    'M 12 35 L 32 42 L 55 38 L 75 48 L 92 40',
    'M 8 68 L 28 60 L 52 65 L 78 58 L 95 65',
    'M 42 32 L 58 28',
    'M 35 50 L 66 48',
  ], []);

  // Phases:
  // NORMAL: 0=dormant → 1=ignition → 2=number → 3=calendar → 4=continue
  // BROKEN: 0=lit flame → 1=extinguish+smoke → 2=reset number → 3=calendar → 4=continue
  useEffect(() => {
    if (streakBroken) {
      const timers = [
        setTimeout(() => { setPhase(1); setNumberBurning(true); }, 600),   // Flame dies, number burns
        setTimeout(() => { setShatterActive(true); setNumberBurning(false); }, 2000), // SHATTER!
        setTimeout(() => setPhase(2), 3400),   // Show reset number
        setTimeout(() => setPhase(3), 4600),   // Calendar
        setTimeout(() => setPhase(4), 5400),   // Continue
      ];
      return () => timers.forEach(clearTimeout);
    } else {
      const timers = [
        setTimeout(() => setPhase(1), 900),
        setTimeout(() => setPhase(2), 1900),
        setTimeout(() => setPhase(3), 3200),
        setTimeout(() => setPhase(4), isPerfectWeek ? 4500 : 4000),
      ];
      return () => timers.forEach(clearTimeout);
    }
  }, [isPerfectWeek, streakBroken]);

  // Ignition sound (only for non-broken streaks)
  useEffect(() => {
    if (phase !== 1 || streakBroken) return;
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      const osc1 = ctx.createOscillator();
      const g1 = ctx.createGain();
      osc1.connect(g1); g1.connect(ctx.destination);
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(250, ctx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.25);
      osc1.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.6);
      g1.gain.setValueAtTime(0.1, ctx.currentTime);
      g1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.7);
      osc1.start(ctx.currentTime); osc1.stop(ctx.currentTime + 0.7);
      const osc2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      osc2.connect(g2); g2.connect(ctx.destination);
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(60, ctx.currentTime + 0.08);
      g2.gain.setValueAtTime(0.18, ctx.currentTime + 0.08);
      g2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc2.start(ctx.currentTime + 0.08); osc2.stop(ctx.currentTime + 0.4);
      const osc3 = ctx.createOscillator();
      const g3 = ctx.createGain();
      osc3.connect(g3); g3.connect(ctx.destination);
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(1600, ctx.currentTime + 0.2);
      osc3.frequency.exponentialRampToValueAtTime(2400, ctx.currentTime + 0.5);
      g3.gain.setValueAtTime(0.04, ctx.currentTime + 0.2);
      g3.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
      osc3.start(ctx.currentTime + 0.2); osc3.stop(ctx.currentTime + 0.6);
    } catch { /* audio unavailable */ }
  }, [phase, streakBroken]);

  // Extinguish sound (hiss + low rumble for broken streaks)
  useEffect(() => {
    if (phase !== 1 || !streakBroken) return;
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      // Descending tone (fire dying)
      const osc1 = ctx.createOscillator();
      const g1 = ctx.createGain();
      osc1.connect(g1); g1.connect(ctx.destination);
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(800, ctx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 1.2);
      g1.gain.setValueAtTime(0.06, ctx.currentTime);
      g1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.5);
      osc1.start(ctx.currentTime); osc1.stop(ctx.currentTime + 1.5);
      // White noise hiss (steam/smoke)
      const bufferSize = ctx.sampleRate * 0.8;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.3;
      const noise = ctx.createBufferSource();
      const ng = ctx.createGain();
      noise.buffer = buffer;
      noise.connect(ng); ng.connect(ctx.destination);
      ng.gain.setValueAtTime(0.08, ctx.currentTime + 0.3);
      ng.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.0);
      noise.start(ctx.currentTime + 0.3);
    } catch { /* */ }
  }, [phase, streakBroken]);

  // Shatter impact sound (glass crack + low boom)
  useEffect(() => {
    if (!shatterActive || !streakBroken) return;
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      // Impact boom
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g); g.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.6);
      g.gain.setValueAtTime(0.15, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.8);
      // Glass shatter noise burst
      const bufferSize = ctx.sampleRate * 0.4;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
      const noise = ctx.createBufferSource();
      const ng = ctx.createGain();
      const hipass = ctx.createBiquadFilter();
      hipass.type = 'highpass'; hipass.frequency.value = 2000;
      noise.buffer = buffer;
      noise.connect(hipass); hipass.connect(ng); ng.connect(ctx.destination);
      ng.gain.setValueAtTime(0.12, ctx.currentTime);
      ng.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      noise.start(ctx.currentTime);
    } catch { /* */ }
  }, [shatterActive, streakBroken]);

  // Number reveal sound
  useEffect(() => {
    if (phase !== 2) return;
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      if (streakBroken) {
        // Sad descending tone
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.connect(g); g.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.3);
        g.gain.setValueAtTime(0.1, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.4);
      } else {
        [800, 1000, 1200].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.connect(g); g.connect(ctx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.06);
          g.gain.setValueAtTime(0.08, ctx.currentTime + i * 0.06);
          g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.06 + 0.15);
          osc.start(ctx.currentTime + i * 0.06);
          osc.stop(ctx.currentTime + i * 0.06 + 0.15);
        });
      }
    } catch { /* */ }
  }, [phase, streakBroken]);

  // Dynamic flame colors
  const flameColors = useMemo(() => {
    if (newStreak <= 3)  return { core: '#ffffff', mid: '#fbbf24', outer: '#f97316', base: '#dc2626' };
    if (newStreak <= 7)  return { core: '#ffffff', mid: '#fb923c', outer: '#ef4444', base: '#b91c1c' };
    if (newStreak <= 14) return { core: '#ffffff', mid: '#f472b6', outer: '#ef4444', base: '#9333ea' };
    if (newStreak <= 30) return { core: '#ffffff', mid: '#e879f9', outer: '#ec4899', base: '#7c3aed' };
    if (newStreak <= 60) return { core: '#fef3c7', mid: '#f87171', outer: '#dc2626', base: '#1e1b4b' };
    return { core: '#fffbeb', mid: '#fbbf24', outer: '#ef4444', base: '#450a0a' };
  }, [newStreak]);

  // Broken streak uses muted grey-red palette
  const brokenColors = { core: '#4a4a5a', mid: '#6b6b7a', outer: '#3a3a4a', base: '#1a1a2a' };
  const activeColors = streakBroken && phase >= 1 ? brokenColors : flameColors;

  // Pre-compute ember positions
  const embers = useMemo(() => {
    const count = 30 + intensity * 8;
    return Array.from({ length: count }, () => ({
      x: 5 + rand() * 90,
      x2: 5 + rand() * 90,
      size: 1.5 + rand() * 3,
      dur: 2.5 + rand() * 3.5,
      delay: rand() * 2.5,
      colorIdx: Math.floor(rand() * 3),
      blur: rand() < 0.25,
    }));
  }, [intensity, rand]);

  // Smoke particles for broken streak
  const smokeParticles = useMemo(() => {
    return Array.from({ length: 15 }, (_, i) => ({
      x: 40 + rand() * 20,
      size: 20 + rand() * 40,
      dur: 2 + rand() * 2,
      delay: rand() * 1.5,
      drift: (rand() - 0.5) * 30,
    }));
  }, [rand]);

  const FLAME_W = 110;
  const FLAME_H = 132;

  // For broken streak: show the OLD streak's flame initially
  const showFlame = streakBroken ? phase < 1 : true;
  const showExtinguish = streakBroken && phase >= 1;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      className="fixed inset-0 z-[300] flex flex-col items-center justify-center overflow-hidden"
      style={{ background: '#0a0a0f' }}
    >
      {/* ── Background radial glow ── */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{
          opacity: phase >= 1 ? 1 : 0,
          background: streakBroken && phase >= 1
            ? 'radial-gradient(ellipse 60% 50% at 50% 38%, rgba(60,60,80,0.15) 0%, transparent 70%)'
            : `radial-gradient(ellipse 60% 50% at 50% 38%, ${flameColors.outer}18 0%, ${flameColors.base}08 40%, transparent 70%)`,
        }}
        transition={{ duration: 0.8 }}
      />

      {/* ── Rising embers (only for active/continuing streaks) ── */}
      {phase >= 1 && !streakBroken && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {embers.map((e, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: '105vh', x: `${e.x}vw` }}
              animate={{ opacity: [0, 0.7, 0.5, 0], y: '-5vh', x: `${e.x2}vw` }}
              transition={{ duration: e.dur, delay: e.delay, repeat: Infinity, ease: 'easeOut' }}
              className="absolute rounded-full"
              style={{
                width: e.size, height: e.size,
                background: e.colorIdx === 0 ? flameColors.mid : e.colorIdx === 1 ? flameColors.outer : cfg.accent,
                filter: e.blur ? 'blur(1px)' : 'none',
              }}
            />
          ))}
        </div>
      )}

      {/* ── Smoke particles (only for broken streaks) ── */}
      {showExtinguish && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {smokeParticles.map((s, i) => (
            <motion.div
              key={`smoke-${i}`}
              initial={{ opacity: 0, y: '45%', x: `${s.x}vw`, scale: 0.3 }}
              animate={{
                opacity: [0, 0.3, 0.15, 0],
                y: '-10vh',
                x: `${s.x + s.drift}vw`,
                scale: [0.3, 1.2, 1.8],
              }}
              transition={{ duration: s.dur, delay: s.delay, ease: 'easeOut' }}
              className="absolute rounded-full"
              style={{
                width: s.size, height: s.size,
                background: 'radial-gradient(circle, rgba(100,100,120,0.4), transparent)',
                filter: 'blur(8px)',
              }}
            />
          ))}
        </div>
      )}

      {/* ═══ FLAME CONTAINER ═══ */}
      <div className="relative" style={{ width: FLAME_W, height: FLAME_H }}>

        {/* ── Shockwave rings (only for continuing streaks) ── */}
        {phase >= 1 && !streakBroken && (
          <>
            {[
              { scale: 4, dur: 1.1, delay: 0, opacity: 0.8, color: flameColors.mid, width: 2 },
              { scale: 3, dur: 0.9, delay: 0.08, opacity: 0.5, color: flameColors.outer, width: 1.5 },
              { scale: 2.2, dur: 0.7, delay: 0.15, opacity: 0.4, color: '#ffffff', width: 1 },
            ].map((ring, i) => (
              <motion.div
                key={`ring-${i}`}
                initial={{ scale: 0.2, opacity: ring.opacity }}
                animate={{ scale: ring.scale, opacity: 0 }}
                transition={{ duration: ring.dur, ease: 'easeOut', delay: ring.delay }}
                style={{
                  position: 'absolute',
                  width: FLAME_W * 0.7, height: FLAME_W * 0.7,
                  left: '50%', top: '45%',
                  marginLeft: -(FLAME_W * 0.7) / 2,
                  marginTop: -(FLAME_W * 0.7) / 2,
                  borderRadius: '50%',
                  border: `${ring.width}px solid ${ring.color}`,
                  pointerEvents: 'none',
                }}
              />
            ))}
          </>
        )}

        {/* ── Glow halo (only for continuing streaks) ── */}
        {phase >= 1 && !streakBroken && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: [0.15, 0.4, 0.15], scale: 1 }}
            transition={{ opacity: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' }, scale: { duration: 0.5 } }}
            style={{
              position: 'absolute',
              width: FLAME_W * 1.8, height: FLAME_W * 1.8,
              left: '50%', top: '45%',
              marginLeft: -(FLAME_W * 1.8) / 2,
              marginTop: -(FLAME_W * 1.8) / 2,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${flameColors.mid}25 0%, ${flameColors.outer}10 40%, transparent 70%)`,
              pointerEvents: 'none',
            }}
          />
        )}

        {/* ── Energy slashes (only for continuing streaks) ── */}
        {phase >= 1 && !streakBroken && (
          <svg
            style={{
              position: 'absolute', left: '50%', top: '45%',
              transform: 'translate(-50%, -50%)', overflow: 'visible', pointerEvents: 'none',
            }}
            width="200" height="200" viewBox="-100 -100 200 200"
          >
            {SLASH_PATHS.map((path, i) => (
              <motion.path
                key={i} d={path} fill="none"
                stroke={i % 3 === 0 ? '#ffffff' : i % 3 === 1 ? flameColors.mid : flameColors.outer}
                strokeWidth={i % 2 === 0 ? 2.5 : 1.5}
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: [0, 1, 1], opacity: [0, 1, 0] }}
                transition={{ duration: 0.65, delay: i * 0.04, ease: 'easeOut' }}
              />
            ))}
          </svg>
        )}

        {/* ── The Flame SVG ── */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={
            streakBroken
              ? { scale: phase >= 1 ? [flameScale, flameScale * 0.5, 0] : flameScale, opacity: phase >= 1 ? [1, 0.5, 0] : 1 }
              : phase >= 1 ? { scale: [flameScale, flameScale * 1.12, flameScale] } : { scale: flameScale }
          }
          transition={streakBroken ? { duration: 1.5, ease: 'easeIn' } : { duration: 0.55, ease: 'easeOut' }}
        >
          {lottieData ? (
            <div style={{ width: FLAME_W * 1.6, height: FLAME_H * 1.6, marginTop: -20, filter: streakBroken && phase >= 1 ? 'grayscale(1)' : 'drop-shadow(0 0 15px rgba(251,146,60,0.5))' }}>
              <Lottie animationData={lottieData} loop autoplay style={{ width: '100%', height: '100%' }} />
            </div>
          ) : (
            <div className="text-orange-500">Loading flame...</div>
          )}
        </motion.div>

        {/* ── Sparkle ring (only for continuing streaks with intensity >= 2) ── */}
        {phase >= 1 && !streakBroken && intensity >= 2 && (
          <div className="absolute inset-0 pointer-events-none" style={{ left: '50%', top: '45%' }}>
            {[0, 60, 120, 180, 240, 300].map((deg, i) => (
              <motion.div
                key={`sparkle-${i}`}
                className="absolute"
                style={{
                  width: 3, height: 3, borderRadius: '50%',
                  background: '#ffffff',
                  boxShadow: `0 0 4px ${flameColors.mid}`,
                  transformOrigin: '0 0',
                }}
                animate={{
                  rotate: [deg, deg + 360],
                  x: [Math.cos((deg * Math.PI) / 180) * 52, Math.cos(((deg + 360) * Math.PI) / 180) * 52],
                  y: [Math.sin((deg * Math.PI) / 180) * 52, Math.sin(((deg + 360) * Math.PI) / 180) * 52],
                  opacity: [0.3, 0.7, 0.3],
                }}
                transition={{ duration: 4 + i * 0.3, repeat: Infinity, ease: 'linear' }}
              />
            ))}
          </div>
        )}
      </div>

      {/* ═══ STREAK BROKEN MESSAGE (sequential words above flame) ═══ */}
      <AnimatePresence>
        {streakBroken && phase >= 1 && phase < 2 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="text-center z-20 mb-6"
          >
            <div className="flex items-center justify-center gap-3">
              {['YOUR', 'STREAK', 'BROKE'].map((word, i) => (
                <motion.span
                  key={word}
                  className="text-lg font-black tracking-widest"
                  style={{ color: '#ef4444', textShadow: '0 0 30px rgba(239,68,68,0.4)' }}
                  initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ duration: 0.4, delay: i * 0.35 }}
                >
                  {word}
                </motion.span>
              ))}
            </div>
            {shatterActive && (
              <motion.p
                className="text-lg font-black tracking-widest uppercase mt-1"
                style={{ color: '#ef4444', textShadow: '0 0 30px rgba(239,68,68,0.5)' }}
                initial={{ opacity: 0 }}
                animate={{ x: [0, -4, 4, -3, 2, 0], opacity: [0, 1, 0.7, 1] }}
                transition={{ duration: 0.35, repeat: 2 }}
              >
                STREAK LOST
              </motion.p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ STREAK NUMBER ═══ */}
      <div className="relative mt-4" style={{ minHeight: 95 }}>
        {streakBroken ? (
          <>
            {/* ── Burning number with cracks (before shatter) ── */}
            <AnimatePresence>
              {!shatterActive && (
                <motion.div
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.1 }}
                  className="text-center relative"
                  style={{ display: 'inline-flex', justifyContent: 'center', width: '100%' }}
                >
                  {/* Crack lines SVG overlay */}
                  {numberBurning && (
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox="0 0 100 100" preserveAspectRatio="none">
                      {crackLines.map((d, i) => (
                        <motion.path
                          key={i} d={d} fill="none"
                          stroke="rgba(239,68,68,0.9)" strokeWidth="1.2" strokeLinecap="round"
                          initial={{ pathLength: 0, opacity: 0 }}
                          animate={{ pathLength: 1, opacity: 1 }}
                          transition={{ duration: 0.4, delay: i * 0.12 }}
                        />
                      ))}
                    </svg>
                  )}
                  <motion.span
                    className="font-black text-6xl tabular-nums"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                    animate={{
                      color: numberBurning ? '#ef4444' : '#ef444450',
                      textShadow: numberBurning
                        ? ['0 0 8px rgba(239,68,68,0.2)', '0 0 40px rgba(239,68,68,0.8)', '0 0 15px rgba(239,68,68,0.4)']
                        : '0 0 0px transparent',
                    }}
                    transition={{ duration: 1, repeat: numberBurning ? Infinity : 0, repeatType: 'mirror' }}
                  >
                    {oldStreak}
                  </motion.span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Shattering fragments ── */}
            {shatterActive && phase < 2 && (
              <div className="relative flex items-center justify-center" style={{ minHeight: 90 }}>
                {shatterFragments.map((frag) => (
                  <motion.div
                    key={frag.id}
                    className="absolute flex items-center justify-center"
                    style={{ clipPath: frag.clipPath, width: 200, height: 80 }}
                    initial={{ x: 0, y: 0, rotate: 0, opacity: 1, scale: 1 }}
                    animate={{
                      x: frag.tx,
                      y: [0, frag.ty * -0.12, frag.ty],
                      rotate: frag.rot,
                      opacity: [1, 0.85, 0],
                      scale: [1, 0.85, 0.15],
                    }}
                    transition={{
                      duration: 1.4, delay: frag.delay,
                      ease: [0.22, 0, 0.9, 0.25],
                      y: { times: [0, 0.15, 1] },
                    }}
                  >
                    <span className="font-black text-6xl tabular-nums" style={{
                      fontFamily: "'Inter', sans-serif",
                      background: 'linear-gradient(180deg, #fbbf24 0%, #ef4444 50%, #7f1d1d 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      filter: 'drop-shadow(0 0 8px rgba(239,68,68,0.6))',
                    }}>
                      {oldStreak}
                    </span>
                  </motion.div>
                ))}

                {/* Ember burst from shatter point */}
                {shatterEmbers.map((e) => (
                  <motion.div
                    key={`se-${e.id}`}
                    className="absolute rounded-full"
                    style={{
                      width: e.size, height: e.size,
                      background: ['#fbbf24', '#ef4444', '#f97316', '#ffffff'][e.colorIdx],
                      boxShadow: `0 0 6px ${['#fbbf24', '#ef4444', '#f97316', '#ffffff'][e.colorIdx]}`,
                    }}
                    initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                    animate={{
                      x: e.tx,
                      y: [0, e.ty, e.ty - 40],
                      opacity: [1, 0.7, 0],
                      scale: [1, 0.5, 0],
                    }}
                    transition={{ duration: e.dur, delay: e.delay, ease: 'easeOut' }}
                  />
                ))}

                {/* Red flash at shatter moment */}
                <motion.div
                  className="absolute rounded-full pointer-events-none"
                  style={{ width: 200, height: 200, background: 'radial-gradient(circle, rgba(239,68,68,0.5), transparent 70%)' }}
                  initial={{ opacity: 0, scale: 0.3 }}
                  animate={{ opacity: [0, 1, 0], scale: [0.3, 2.5, 3.5] }}
                  transition={{ duration: 0.7 }}
                />

                {/* Falling ash particles */}
                {Array.from({ length: 12 }).map((_, i) => (
                  <motion.div
                    key={`ash-${i}`}
                    className="absolute"
                    style={{
                      width: 3 + rand() * 3, height: 1 + rand() * 2,
                      background: `rgba(100,100,120,${0.3 + rand() * 0.4})`,
                      borderRadius: 1,
                    }}
                    initial={{ x: (rand() - 0.5) * 80, y: 0, opacity: 0.6, rotate: rand() * 360 }}
                    animate={{
                      y: [0, 150 + rand() * 200],
                      x: (rand() - 0.5) * 120,
                      rotate: rand() * 720,
                      opacity: [0.6, 0.3, 0],
                    }}
                    transition={{ duration: 2 + rand(), delay: 0.3 + rand() * 0.5, ease: 'easeIn' }}
                  />
                ))}
              </div>
            )}

            {/* ── New number rising from ashes ── */}
            <AnimatePresence>
              {phase >= 2 && (
                <motion.div
                  key="new-broken"
                  initial={{ opacity: 0, scale: 0.5, y: 40, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ type: 'spring', stiffness: 180, damping: 18, delay: 0.1 }}
                  className="text-center"
                >
                  <motion.span
                    className="font-black text-7xl tabular-nums block"
                    style={{
                      background: 'linear-gradient(180deg, #6b7280 0%, #4b5563 50%, #374151 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    {newStreak}
                  </motion.span>
                  <motion.span
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                    className="block text-xs font-black tracking-[0.4em] uppercase mt-1.5"
                    style={{ color: '#6b728080' }}
                  >
                    streak reset
                  </motion.span>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        ) : (
          /* ── Normal (non-broken) streak ── */
          <AnimatePresence mode="wait">
            {phase < 2 ? (
              <motion.div
                key="old"
                exit={{ opacity: 0, scale: 0.5, y: -20, filter: 'blur(8px)' }}
                transition={{ duration: 0.35 }}
                className="text-center"
              >
                <span
                  className="font-black text-6xl tabular-nums"
                  style={{ color: '#16162a', fontFamily: "'Inter', sans-serif" }}
                >
                  {oldStreak}
                </span>
              </motion.div>
            ) : (
              <motion.div
                key="new"
                initial={{ opacity: 0, scale: 2.5, y: 20, filter: 'blur(10px)' }}
                animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ type: 'spring', stiffness: 250, damping: 16 }}
                className="text-center"
              >
                <motion.span
                  className="font-black text-7xl tabular-nums block"
                  style={{
                    background: `linear-gradient(180deg, ${flameColors.core} 0%, ${flameColors.mid} 40%, ${flameColors.outer} 70%, ${flameColors.base} 100%)`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    filter: `drop-shadow(0 0 30px ${flameColors.mid}80) drop-shadow(0 0 60px ${flameColors.outer}40)`,
                    fontFamily: "'Inter', sans-serif",
                  }}
                  animate={{ scale: [1, 1.035, 1] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                >
                  {newStreak}
                </motion.span>
                <motion.span
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                  className="block text-xs font-black tracking-[0.4em] uppercase mt-1.5"
                  style={{ color: `${flameColors.mid}80` }}
                >
                  day streak
                </motion.span>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* ═══ WEEKLY CALENDAR ═══ */}
      <AnimatePresence>
        {phase >= 3 && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 180, damping: 20 }}
            className="mt-7"
          >
            <div className="flex items-center gap-3 px-5 py-3">
              {DAY_LABELS.map((label, i) => {
                const isActive = weeklyActivity[i];
                const dow = new Date().getDay();
                const todayIdx = dow === 0 ? 6 : dow - 1;
                const isToday = i === todayIdx;

                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: 0.06 + i * 0.08, type: 'spring', stiffness: 350, damping: 16 }}
                    className="flex flex-col items-center gap-1.5"
                  >
                    <span className="text-[10px] font-bold tracking-wider"
                      style={{ color: isActive ? flameColors.mid : '#252540' }}>
                      {label}
                    </span>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center relative"
                      style={{
                        background: isActive
                          ? `linear-gradient(145deg, ${flameColors.mid}, ${flameColors.outer})`
                          : 'rgba(255,255,255,0.025)',
                        border: isToday && !isActive ? `2px solid ${flameColors.mid}40`
                          : isActive ? 'none' : '1px solid rgba(255,255,255,0.04)',
                        boxShadow: isActive ? `0 0 16px ${flameColors.mid}35, 0 2px 6px rgba(0,0,0,0.3)` : 'none',
                      }}>
                      {isActive ? (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M2.5 7L5.5 10L11.5 4" stroke="#0a0a0f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        <span className="text-[11px] font-mono" style={{ color: '#252540' }}>–</span>
                      )}
                      {isToday && isActive && (
                        <motion.div className="absolute inset-0 rounded-full"
                          animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
                          transition={{ duration: 2.2, repeat: Infinity }}
                          style={{ border: `2px solid ${flameColors.mid}` }} />
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Perfect Week Flourish */}
            {phase >= 4 && isPerfectWeek && !streakBroken && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }} className="relative mt-3 mx-4">
                <svg className="absolute -inset-3 w-[calc(100%+24px)] h-[calc(100%+24px)]" viewBox="0 0 320 50" fill="none" preserveAspectRatio="none">
                  <rect x="1" y="1" width="318" height="48" rx="24" stroke={flameColors.base} strokeWidth="2" fill="none" />
                  <motion.circle r="4" fill={cfg.accent}
                    filter={`drop-shadow(0 0 6px ${cfg.accent}) drop-shadow(0 0 12px ${flameColors.mid})`}
                    animate={{
                      offsetDistance: ['0%', '25%', '50%', '75%', '100%'],
                    }}
                    transition={{ duration: 1.6, ease: 'linear' }} />
                </svg>
                <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8, duration: 0.45 }}
                  className="text-center text-xs font-bold py-2 px-4"
                  style={{ color: flameColors.mid }}>
                  🔥 You kept a Perfect Streak for a whole week!
                </motion.p>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ CONTINUE BUTTON ═══ */}
      <AnimatePresence>
        {phase >= 4 && (
          <motion.button
            initial={{ opacity: 0, y: 30, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: isPerfectWeek && !streakBroken ? 1.0 : 0.3, type: 'spring', stiffness: 180, damping: 18 }}
            onClick={onComplete}
            className="mt-10 px-16 py-4 rounded-2xl font-black text-sm tracking-widest uppercase transition-all active:scale-95"
            style={{
              background: streakBroken
                ? 'linear-gradient(135deg, #4b5563, #374151)'
                : `linear-gradient(135deg, ${flameColors.mid}, ${flameColors.outer})`,
              color: streakBroken ? '#d1d5db' : '#0a0a0f',
              boxShadow: streakBroken
                ? '0 4px 20px rgba(0,0,0,0.4)'
                : `0 0 28px ${flameColors.mid}35, 0 4px 20px rgba(0,0,0,0.4)`,
            }}
          >
            <motion.span
              animate={{ opacity: [0.65, 1, 0.65] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {streakBroken ? 'START FRESH' : 'CONTINUE'}
            </motion.span>
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default StreakCelebration;
