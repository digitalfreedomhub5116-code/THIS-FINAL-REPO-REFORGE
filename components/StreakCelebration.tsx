import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Outfit config for accent theming ──
const OUTFIT_CONFIG: Record<string, { accent: string; glow: string }> = {
  outfit_starter:  { accent: '#9ca3af', glow: '#60a5fa' },
  outfit_ghost:    { accent: '#4ade80', glow: '#22d3ee' },
  outfit_knight:   { accent: '#60a5fa', glow: '#818cf8' },
  outfit_assassin: { accent: '#c084fc', glow: '#e879f9' },
  outfit_vanguard: { accent: '#facc15', glow: '#fb923c' },
  outfit_monarch:  { accent: '#f87171', glow: '#fb923c' },
};
const DEFAULT_CFG = OUTFIT_CONFIG.outfit_starter;

interface StreakCelebrationProps {
  oldStreak: number;
  newStreak: number;
  outfitId: string;
  weeklyActivity: boolean[]; // 7 entries, Mon→Sun
  onComplete: () => void;
}

// ── Energy slash paths ──
const SLASH_PATHS = [
  'M0,0 Q15,-25 30,-10', 'M0,0 Q-20,-20 -10,-35',
  'M0,0 Q25,5 35,-15',   'M0,0 Q-15,15 -30,5',
  'M0,0 Q10,20 25,30',   'M0,0 Q-25,10 -35,25',
  'M0,0 Q20,-10 15,-30',  'M0,0 Q-10,-15 -25,-25',
  'M0,0 Q30,15 20,-20',   'M0,0 Q-30,-5 -20,20',
];
const SLASH_ROTATIONS = [0, 36, 72, 108, 144, 180, 216, 252, 288, 324];
const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// ── Flame size scales with streak ──
function getFlameScale(streak: number): number {
  if (streak <= 1) return 0.7;
  if (streak <= 3) return 0.8;
  if (streak <= 7) return 0.9;
  if (streak <= 14) return 1.0;
  if (streak <= 30) return 1.1;
  if (streak <= 60) return 1.2;
  if (streak <= 100) return 1.3;
  return 1.4;
}

// ── Flame intensity (more layers/glow at higher streaks) ──
function getFlameIntensity(streak: number): number {
  if (streak <= 1) return 1;
  if (streak <= 7) return 2;
  if (streak <= 30) return 3;
  if (streak <= 60) return 4;
  return 5;
}

const StreakCelebration: React.FC<StreakCelebrationProps> = ({
  oldStreak, newStreak, outfitId, weeklyActivity, onComplete,
}) => {
  const cfg = OUTFIT_CONFIG[outfitId] || DEFAULT_CFG;
  const [phase, setPhase] = useState(0);
  const flameScale = getFlameScale(newStreak);
  const intensity = getFlameIntensity(newStreak);
  const isPerfectWeek = useMemo(() => weeklyActivity.filter(Boolean).length >= 7, [weeklyActivity]);

  // Phase timers
  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 800),
      setTimeout(() => setPhase(2), 1700),
      setTimeout(() => setPhase(3), 3000),
      setTimeout(() => setPhase(4), isPerfectWeek ? 4200 : 3800),
    ];
    return () => timers.forEach(clearTimeout);
  }, [isPerfectWeek]);

  // Ignition sound
  useEffect(() => {
    if (phase !== 1) return;
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      // Sweep up
      const osc1 = ctx.createOscillator();
      const g1 = ctx.createGain();
      osc1.connect(g1); g1.connect(ctx.destination);
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(300, ctx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(1400, ctx.currentTime + 0.2);
      osc1.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.5);
      g1.gain.setValueAtTime(0.12, ctx.currentTime);
      g1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
      osc1.start(ctx.currentTime); osc1.stop(ctx.currentTime + 0.6);
      // Impact thud
      const osc2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      osc2.connect(g2); g2.connect(ctx.destination);
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(80, ctx.currentTime + 0.1);
      g2.gain.setValueAtTime(0.2, ctx.currentTime + 0.1);
      g2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc2.start(ctx.currentTime + 0.1); osc2.stop(ctx.currentTime + 0.4);
    } catch { /* audio unavailable */ }
  }, [phase]);

  // Number pop sound
  useEffect(() => {
    if (phase !== 2) return;
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g); g.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
      g.gain.setValueAtTime(0.1, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.25);
    } catch { /* */ }
  }, [phase]);

  // Dynamic flame colors based on streak
  const flameColors = useMemo(() => {
    if (newStreak <= 3)  return { core: '#ffffff', mid: '#fbbf24', outer: '#f97316', base: '#dc2626' };
    if (newStreak <= 7)  return { core: '#ffffff', mid: '#fb923c', outer: '#ef4444', base: '#b91c1c' };
    if (newStreak <= 14) return { core: '#ffffff', mid: '#f472b6', outer: '#ef4444', base: '#9333ea' };
    if (newStreak <= 30) return { core: '#ffffff', mid: '#e879f9', outer: '#ec4899', base: '#7c3aed' };
    if (newStreak <= 60) return { core: '#fef3c7', mid: '#f87171', outer: '#dc2626', base: '#1e1b4b' };
    return { core: '#fffbeb', mid: '#fbbf24', outer: '#ef4444', base: '#450a0a' };
  }, [newStreak]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[300] flex flex-col items-center justify-center overflow-hidden"
      style={{ background: '#0a0a0f' }}
    >
      {/* ── Background radial pulse ── */}
      {phase >= 1 && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          style={{
            background: `radial-gradient(circle at 50% 40%, ${flameColors.outer}15 0%, transparent 60%)`,
          }}
        />
      )}

      {/* ── Rising embers ── */}
      {phase >= 1 && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 25 + intensity * 5 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{
                opacity: 0,
                y: '110vh',
                x: `${5 + Math.random() * 90}vw`,
                scale: 0.3 + Math.random() * 0.7,
              }}
              animate={{
                opacity: [0, 0.8, 0.6, 0],
                y: '-10vh',
                x: `${5 + Math.random() * 90}vw`,
              }}
              transition={{
                duration: 2.5 + Math.random() * 3,
                delay: Math.random() * 2,
                repeat: Infinity,
                ease: 'easeOut',
              }}
              className="absolute rounded-full"
              style={{
                width: 1.5 + Math.random() * 3,
                height: 1.5 + Math.random() * 3,
                background: i % 3 === 0 ? flameColors.mid : i % 3 === 1 ? flameColors.outer : cfg.accent,
                filter: `blur(${Math.random() < 0.3 ? 1 : 0}px)`,
              }}
            />
          ))}
        </div>
      )}

      {/* ── FLAME ICON ── */}
      <motion.div
        className="relative"
        style={{ transform: `scale(${flameScale})` }}
        animate={phase >= 1 ? { scale: [flameScale, flameScale * 1.15, flameScale] } : {}}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        {/* Shockwave rings */}
        {phase >= 1 && (
          <>
            <motion.div
              initial={{ scale: 0.3, opacity: 0.9 }}
              animate={{ scale: 3.5, opacity: 0 }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="absolute rounded-full"
              style={{
                width: 100, height: 100,
                left: '50%', top: '50%',
                transform: 'translate(-50%, -50%)',
                border: `2px solid ${flameColors.mid}`,
              }}
            />
            <motion.div
              initial={{ scale: 0.3, opacity: 0.6 }}
              animate={{ scale: 2.5, opacity: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
              className="absolute rounded-full"
              style={{
                width: 100, height: 100,
                left: '50%', top: '50%',
                transform: 'translate(-50%, -50%)',
                border: `1.5px solid ${flameColors.outer}`,
              }}
            />
          </>
        )}

        {/* Glow halo */}
        {phase >= 1 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: [0.2, 0.5, 0.2], scale: 1 }}
            transition={{ opacity: { duration: 2, repeat: Infinity }, scale: { duration: 0.4 } }}
            className="absolute rounded-full"
            style={{
              width: 160, height: 160,
              left: '50%', top: '50%',
              transform: 'translate(-50%, -50%)',
              background: `radial-gradient(circle, ${flameColors.mid}30 0%, ${flameColors.outer}10 50%, transparent 75%)`,
            }}
          />
        )}

        {/* Energy slashes */}
        {phase >= 1 && (
          <svg
            width="220" height="220" viewBox="-110 -110 220 220"
            className="absolute pointer-events-none"
            style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)', overflow: 'visible' }}
          >
            {SLASH_PATHS.map((path, i) => (
              <motion.g
                key={i}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: [0, 1, 0], scale: [0.2, 1.2, 1.8] }}
                transition={{ duration: 0.7, delay: i * 0.035, ease: 'easeOut' }}
                transform={`rotate(${SLASH_ROTATIONS[i]})`}
              >
                <motion.path
                  d={path} fill="none"
                  stroke={i % 3 === 0 ? '#ffffff' : i % 3 === 1 ? flameColors.mid : flameColors.outer}
                  strokeWidth={i % 2 === 0 ? 2.5 : 1.8}
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: [0, 1] }}
                  transition={{ duration: 0.45, delay: i * 0.035 }}
                />
              </motion.g>
            ))}
          </svg>
        )}

        {/* ── The Flame SVG ── */}
        <motion.div
          animate={{
            filter: phase >= 1 ? 'grayscale(0) brightness(1.1)' : 'grayscale(1) brightness(0.2)',
          }}
          transition={{ duration: 0.5 }}
        >
          <svg width="100" height="120" viewBox="0 0 64 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="flameGrad" x1="32" y1="75" x2="32" y2="5" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor={phase >= 1 ? flameColors.base : '#1a1a2e'} />
                <stop offset="40%" stopColor={phase >= 1 ? flameColors.outer : '#1a1a2e'} />
                <stop offset="70%" stopColor={phase >= 1 ? flameColors.mid : '#25253a'} />
                <stop offset="100%" stopColor={phase >= 1 ? flameColors.core : '#2a2a40'} />
              </linearGradient>
              <linearGradient id="innerFlame" x1="32" y1="70" x2="32" y2="25" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor={phase >= 1 ? flameColors.mid : '#1a1a2e'} />
                <stop offset="100%" stopColor={phase >= 1 ? '#ffffff' : '#25253a'} />
              </linearGradient>
              <filter id="flameGlow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            {/* Outer flame */}
            <motion.path
              d="M32 5 C32 5, 10 28, 10 48 C10 62, 20 75, 32 75 C44 75, 54 62, 54 48 C54 28, 32 5, 32 5Z"
              fill="url(#flameGrad)"
              filter={phase >= 1 ? 'url(#flameGlow)' : undefined}
              animate={phase >= 1 ? {
                d: [
                  'M32 5 C32 5, 10 28, 10 48 C10 62, 20 75, 32 75 C44 75, 54 62, 54 48 C54 28, 32 5, 32 5Z',
                  'M32 3 C32 3, 8 26, 8 46 C8 61, 19 76, 32 76 C45 76, 56 61, 56 46 C56 26, 32 3, 32 3Z',
                  'M32 5 C32 5, 10 28, 10 48 C10 62, 20 75, 32 75 C44 75, 54 62, 54 48 C54 28, 32 5, 32 5Z',
                ]
              } : {}}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            />
            {/* Inner flame */}
            <motion.path
              d="M32 25 C32 25, 20 38, 20 50 C20 60, 25 67, 32 67 C39 67, 44 60, 44 50 C44 38, 32 25, 32 25Z"
              fill="url(#innerFlame)"
              opacity={phase >= 1 ? 0.9 : 0.15}
              animate={phase >= 1 ? {
                d: [
                  'M32 25 C32 25, 20 38, 20 50 C20 60, 25 67, 32 67 C39 67, 44 60, 44 50 C44 38, 32 25, 32 25Z',
                  'M32 22 C32 22, 18 36, 18 49 C18 59, 24 68, 32 68 C40 68, 46 59, 46 49 C46 36, 32 22, 32 22Z',
                  'M32 25 C32 25, 20 38, 20 50 C20 60, 25 67, 32 67 C39 67, 44 60, 44 50 C44 38, 32 25, 32 25Z',
                ]
              } : {}}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut', delay: 0.15 }}
            />
            {/* Core bright spot */}
            {phase >= 1 && intensity >= 2 && (
              <motion.ellipse
                cx="32" cy="55" rx="8" ry="10"
                fill="#ffffff"
                opacity={0.3 + intensity * 0.08}
                animate={{ ry: [10, 12, 10], opacity: [0.3, 0.5, 0.3] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            )}
            {/* Extra flame wisps at high streaks */}
            {phase >= 1 && intensity >= 3 && (
              <>
                <motion.path
                  d="M22 40 C18 30, 14 25, 18 15"
                  fill="none" stroke={flameColors.mid} strokeWidth="1.5" strokeLinecap="round"
                  opacity={0.5}
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <motion.path
                  d="M42 40 C46 30, 50 25, 46 15"
                  fill="none" stroke={flameColors.mid} strokeWidth="1.5" strokeLinecap="round"
                  opacity={0.5}
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
                />
              </>
            )}
            {/* Extreme streak: crown wisps */}
            {phase >= 1 && intensity >= 5 && (
              <motion.path
                d="M32 8 C30 2, 28 -2, 32 -5 C36 -2, 34 2, 32 8"
                fill={flameColors.mid} opacity={0.6}
                animate={{ opacity: [0.4, 0.8, 0.4], y: [0, -2, 0] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              />
            )}
          </svg>
        </motion.div>
      </motion.div>

      {/* ── STREAK NUMBER ── */}
      <div className="relative mt-5" style={{ minHeight: 90 }}>
        <AnimatePresence mode="wait">
          {phase < 2 ? (
            <motion.div
              key="old"
              exit={{ opacity: 0, scale: 0.6, y: -15, filter: 'blur(4px)' }}
              transition={{ duration: 0.3 }}
              className="text-center"
            >
              <span
                className="font-black text-6xl tabular-nums"
                style={{ color: '#1e1e2e', fontFamily: "'Inter', sans-serif" }}
              >
                {oldStreak}
              </span>
            </motion.div>
          ) : (
            <motion.div
              key="new"
              initial={{ opacity: 0, scale: 2.2, y: 15, filter: 'blur(6px)' }}
              animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ type: 'spring', stiffness: 280, damping: 18 }}
              className="text-center"
            >
              <motion.span
                className="font-black text-7xl tabular-nums block"
                style={{
                  background: `linear-gradient(180deg, ${flameColors.mid} 0%, ${flameColors.outer} 50%, ${flameColors.base} 100%)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  filter: `drop-shadow(0 0 25px ${flameColors.mid}80)`,
                  fontFamily: "'Inter', sans-serif",
                }}
                animate={{ scale: [1, 1.04, 1] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                {newStreak}
              </motion.span>
              <motion.span
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.45 }}
                className="block text-xs font-black tracking-[0.35em] uppercase mt-1"
                style={{ color: `${flameColors.mid}99` }}
              >
                day streak
              </motion.span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── WEEKLY CALENDAR ── */}
      <AnimatePresence>
        {phase >= 3 && (
          <motion.div
            initial={{ opacity: 0, y: 35, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 22 }}
            className="mt-8 relative"
          >
            <div className="flex items-center gap-3 px-4 py-3">
              {DAY_LABELS.map((label, i) => {
                const isActive = weeklyActivity[i];
                const dow = new Date().getDay();
                const todayIdx = dow === 0 ? 6 : dow - 1; // Mon=0 ... Sun=6
                const isToday = i === todayIdx;

                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{
                      delay: i * 0.07,
                      type: 'spring', stiffness: 400, damping: 18,
                    }}
                    className="flex flex-col items-center gap-1.5"
                  >
                    <span
                      className="text-[10px] font-bold tracking-wider"
                      style={{ color: isActive ? flameColors.mid : '#2a2a3e' }}
                    >
                      {label}
                    </span>
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center relative"
                      style={{
                        background: isActive
                          ? `linear-gradient(135deg, ${flameColors.mid}, ${flameColors.outer})`
                          : 'rgba(255,255,255,0.03)',
                        border: isToday && !isActive
                          ? `2px solid ${flameColors.mid}50`
                          : isActive ? 'none' : '1px solid rgba(255,255,255,0.05)',
                        boxShadow: isActive
                          ? `0 0 14px ${flameColors.mid}40`
                          : 'none',
                      }}
                    >
                      {isActive ? (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path
                            d="M2.5 7L5.5 10L11.5 4"
                            stroke="#0a0a0f" strokeWidth="2.5"
                            strokeLinecap="round" strokeLinejoin="round"
                          />
                        </svg>
                      ) : (
                        <span className="text-[11px] font-mono" style={{ color: '#2a2a3e' }}>–</span>
                      )}
                      {/* Today pulse ring */}
                      {isToday && isActive && (
                        <motion.div
                          className="absolute inset-0 rounded-full"
                          animate={{ scale: [1, 1.35, 1], opacity: [0.5, 0, 0.5] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          style={{ border: `2px solid ${flameColors.mid}` }}
                        />
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Perfect streak flourish */}
            {phase >= 4 && isPerfectWeek && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="relative mt-3"
              >
                {/* Pill outline */}
                <motion.div
                  className="absolute -inset-3 rounded-2xl pointer-events-none overflow-hidden"
                  style={{ border: `2px solid ${flameColors.base}` }}
                >
                  {/* Tracer spark */}
                  <motion.div
                    className="absolute w-2 h-2 rounded-full"
                    style={{
                      background: cfg.accent,
                      boxShadow: `0 0 10px ${cfg.accent}, 0 0 20px ${cfg.accent}, 0 0 30px ${flameColors.mid}`,
                    }}
                    animate={{
                      left: ['-2%', '100%', '100%', '-2%', '-2%'],
                      top: ['-2%', '-2%', '100%', '100%', '-2%'],
                    }}
                    transition={{ duration: 1.4, ease: 'linear' }}
                  />
                </motion.div>

                <motion.p
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7, duration: 0.4 }}
                  className="text-center text-xs font-bold mt-5 px-4"
                  style={{ color: flameColors.mid }}
                >
                  🔥 You kept a Perfect Streak for a whole week!
                </motion.p>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── CONTINUE BUTTON ── */}
      <AnimatePresence>
        {phase >= 4 && (
          <motion.button
            initial={{ opacity: 0, y: 25, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: isPerfectWeek ? 0.8 : 0.3, type: 'spring', stiffness: 200, damping: 22 }}
            onClick={onComplete}
            className="mt-10 px-14 py-3.5 rounded-2xl font-black text-sm tracking-widest uppercase transition-all active:scale-95"
            style={{
              background: `linear-gradient(135deg, ${flameColors.mid}, ${flameColors.outer})`,
              color: '#0a0a0f',
              boxShadow: `0 0 24px ${flameColors.mid}40, 0 4px 16px rgba(0,0,0,0.4)`,
            }}
          >
            <motion.span
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1.8, repeat: Infinity }}
            >
              CONTINUE
            </motion.span>
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default StreakCelebration;
