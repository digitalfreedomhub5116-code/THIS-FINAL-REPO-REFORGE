import React from 'react';
import { motion } from 'framer-motion';
import Lottie from 'lottie-react';
import { DailyChestAnim, LegendaryChestAnim, AllianceChestAnim } from './ChestAnimations';

/* ─────────────────────────────────────────────────────────────────────────
   Shared Lottie loader with caching
──────────────────────────────────────────────────────────────────────────── */
const _cache: Record<string, object | null | false> = {};

interface BaseLottieProps {
  src: string;
  size: number;
  phase: 'IDLE' | 'OPENING';
  onComplete?: () => void;
  fallback?: React.ReactNode;
}

const ChestLottieBase: React.FC<BaseLottieProps> = ({ src, size, phase, onComplete, fallback }) => {
  const [data, setData] = React.useState<object | null | false>(_cache[src] ?? null);
  const lottieRef = React.useRef<any>(null);

  React.useEffect(() => {
    if (_cache[src] !== undefined && _cache[src] !== null) { setData(_cache[src]); return; }
    fetch(src)
      .then(r => r.ok ? r.json() : null)
      .then(d => { _cache[src] = d ?? false; setData(_cache[src]); })
      .catch(() => { _cache[src] = false; setData(false); });
  }, [src]);

  const handleDOMLoaded = () => {
    if (!lottieRef.current) return;
    if (phase === 'IDLE') lottieRef.current.goToAndStop(0, true);
    else lottieRef.current.goToAndPlay(0, true);
  };

  React.useEffect(() => {
    if (!lottieRef.current) return;
    if (phase === 'IDLE') lottieRef.current.goToAndStop(0, true);
    else lottieRef.current.goToAndPlay(0, true);
  }, [phase]);

  const handleComplete = () => {
    if (lottieRef.current) {
      const total = lottieRef.current.getDuration(true);
      lottieRef.current.goToAndStop(total - 1, true);
    }
    onComplete?.();
  };

  return (
    <div style={{ width: size, height: size, flexShrink: 0, position: 'relative' }}>
      {data ? (
        <Lottie
          lottieRef={lottieRef}
          animationData={data}
          loop={false}
          autoplay={false}
          onDOMLoaded={handleDOMLoaded}
          onComplete={handleComplete}
          className="w-full h-full"
        />
      ) : data === false ? (
        <>{fallback}</>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-1/2 h-1/2 rounded-2xl animate-pulse"
            style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))' }} />
        </div>
      )}
    </div>
  );
};

/** Eagerly fetch & cache all chest Lottie JSONs so they're ready before the user sees them */
export const preloadChestLotties = () => {
  ['/assets/lottie/daily_chest.json', '/assets/lottie/legendary_chest.json', '/assets/lottie/alliance_chest.json'].forEach(src => {
    if (_cache[src] !== undefined) return;
    fetch(src)
      .then(r => r.ok ? r.json() : null)
      .then(d => { _cache[src] = d ?? false; })
      .catch(() => { _cache[src] = false; });
  });
};

/* ─────────────────────────────────────────────────────────────────────────
   Tier 1 — DAILY CHEST  (Free)
   Cyan Lottie + subtle frost sparkles + faint glow
──────────────────────────────────────────────────────────────────────────── */
interface ChestProps {
  size?: number;
  phase?: 'IDLE' | 'OPENING';
  onComplete?: () => void;
  isLocked?: boolean;
}

export const DailyChestLottie: React.FC<ChestProps> = ({ size = 160, phase = 'IDLE', onComplete, isLocked }) => {
  const frost = [
    { x: '18%', y: '15%', delay: 0, dur: 2.8 },
    { x: '78%', y: '20%', delay: 0.6, dur: 3.2 },
    { x: '12%', y: '72%', delay: 1.2, dur: 2.6 },
    { x: '82%', y: '68%', delay: 0.9, dur: 3.0 },
  ];

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Subtle cyan glow behind chest */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: size * 0.7, height: size * 0.5,
          left: '50%', top: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(ellipse, rgba(0,212,255,0.15) 0%, transparent 70%)',
          filter: 'blur(8px)',
        }}
        animate={{ opacity: [0.4, 0.8, 0.4], scale: [1, 1.05, 1] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Frost sparkle particles */}
      {!isLocked && frost.map((f, i) => (
        <motion.div key={i}
          className="absolute pointer-events-none"
          style={{ left: f.x, top: f.y, width: 4, height: 4 }}
          animate={{ opacity: [0, 0.8, 0], scale: [0.5, 1, 0.5], y: [0, -8, 0] }}
          transition={{ duration: f.dur, repeat: Infinity, delay: f.delay, ease: 'easeInOut' }}
        >
          <svg width="4" height="4" viewBox="0 0 4 4">
            <path d="M2 0 L2.4 1.6 L4 2 L2.4 2.4 L2 4 L1.6 2.4 L0 2 L1.6 1.6Z" fill="#00d4ff" />
          </svg>
        </motion.div>
      ))}

      {/* Ice crystal accents — small diamonds */}
      {!isLocked && (
        <>
          <motion.div className="absolute pointer-events-none"
            style={{ left: '8%', top: '45%' }}
            animate={{ rotate: [0, 360], opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          >
            <svg width="8" height="8" viewBox="0 0 8 8">
              <path d="M4 0 L6 4 L4 8 L2 4Z" fill="#00d4ff" opacity="0.6" />
            </svg>
          </motion.div>
          <motion.div className="absolute pointer-events-none"
            style={{ right: '8%', top: '40%' }}
            animate={{ rotate: [360, 0], opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
          >
            <svg width="6" height="6" viewBox="0 0 8 8">
              <path d="M4 0 L6 4 L4 8 L2 4Z" fill="#67e8f9" opacity="0.5" />
            </svg>
          </motion.div>
        </>
      )}

      {/* Lottie */}
      <div className="relative z-10">
        <ChestLottieBase
          src="/assets/lottie/daily_chest.json"
          size={size} phase={phase} onComplete={onComplete}
          fallback={<DailyChestAnim isLocked={isLocked ?? false} size={size} />}
        />
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   Tier 2 — LEGENDARY CHEST  (7 Keys)
   Gold Lottie + ember particles + amber gem accents + warm glow
──────────────────────────────────────────────────────────────────────────── */
export const LegendaryChestLottieV2: React.FC<ChestProps> = ({ size = 160, phase = 'IDLE', onComplete, isLocked }) => {
  const embers = [
    { x: '20%', delay: 0, dur: 2.4 },
    { x: '35%', delay: 0.4, dur: 2.8 },
    { x: '55%', delay: 0.8, dur: 2.2 },
    { x: '70%', delay: 0.3, dur: 3.0 },
    { x: '85%', delay: 1.0, dur: 2.6 },
    { x: '15%', delay: 1.4, dur: 2.5 },
  ];

  const gems = [
    { x: '6%', y: '35%', s: 7, color: '#fde68a', delay: 0 },
    { x: '90%', y: '38%', s: 6, color: '#f59e0b', delay: 0.5 },
    { x: '10%', y: '70%', s: 5, color: '#fbbf24', delay: 1.0 },
    { x: '88%', y: '65%', s: 6, color: '#fde68a', delay: 0.8 },
  ];

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Warm gold glow */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: size * 0.75, height: size * 0.55,
          left: '50%', top: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(ellipse, rgba(245,158,11,0.2) 0%, transparent 70%)',
          filter: 'blur(10px)',
        }}
        animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.08, 1] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Rising ember particles */}
      {!isLocked && embers.map((e, i) => (
        <motion.div key={i}
          className="absolute bottom-[55%] pointer-events-none"
          style={{ left: e.x, width: 3, height: 3 }}
          animate={{ y: [0, -30, -50], opacity: [0, 1, 0], scale: [0.6, 1, 0.3] }}
          transition={{ duration: e.dur, repeat: Infinity, delay: e.delay, ease: 'easeOut' }}
        >
          <div className="w-full h-full rounded-full" style={{ background: '#fbbf24', boxShadow: '0 0 4px #f59e0b' }} />
        </motion.div>
      ))}

      {/* Amber gem accents */}
      {!isLocked && gems.map((g, i) => (
        <motion.div key={i}
          className="absolute pointer-events-none"
          style={{ left: g.x, top: g.y }}
          animate={{ opacity: [0.4, 0.9, 0.4], scale: [0.9, 1.1, 0.9] }}
          transition={{ duration: 2.0, repeat: Infinity, delay: g.delay, ease: 'easeInOut' }}
        >
          <svg width={g.s} height={g.s} viewBox="0 0 10 10">
            <path d="M5 0 L7.5 3.5 L5 10 L2.5 3.5Z" fill={g.color} />
            <path d="M5 1 L6.5 3.5 L5 8.5 L3.5 3.5Z" fill="#fff" opacity="0.25" />
          </svg>
        </motion.div>
      ))}

      {/* Gold sparkle trail */}
      {!isLocked && [0, 1, 2].map(i => (
        <motion.div key={`sp${i}`}
          className="absolute pointer-events-none"
          style={{ left: `${30 + i * 18}%`, top: '18%' }}
          animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5], rotate: [0, 90] }}
          transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.7, ease: 'easeInOut' }}
        >
          <svg width="6" height="6" viewBox="0 0 6 6">
            <path d="M3 0 L3.5 2.2 L6 3 L3.5 3.8 L3 6 L2.5 3.8 L0 3 L2.5 2.2Z" fill="#fde68a" />
          </svg>
        </motion.div>
      ))}

      {/* Lottie */}
      <div className="relative z-10">
        <ChestLottieBase
          src="/assets/lottie/legendary_chest.json"
          size={size} phase={phase} onComplete={onComplete}
          fallback={<LegendaryChestAnim isLocked={isLocked ?? false} size={size} />}
        />
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   Tier 3 — ALLIANCE CHEST  (36 Keys)
   Purple Lottie + ruby gems + arcane rune circle + wisps + intense glow
──────────────────────────────────────────────────────────────────────────── */
export const AllianceChestLottie: React.FC<ChestProps> = ({ size = 160, phase = 'IDLE', onComplete, isLocked }) => {
  const RUNES = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ'];
  const runeR = size * 0.42;

  const wisps = [
    { x: '10%', delay: 0, dur: 3.0 },
    { x: '25%', delay: 0.5, dur: 2.6 },
    { x: '45%', delay: 0.2, dur: 3.4 },
    { x: '60%', delay: 0.9, dur: 2.8 },
    { x: '75%', delay: 0.4, dur: 3.2 },
    { x: '90%', delay: 1.2, dur: 2.5 },
    { x: '18%', delay: 1.5, dur: 2.9 },
    { x: '82%', delay: 0.7, dur: 3.1 },
  ];

  const rubyGems = [
    { x: '4%', y: '30%', s: 10, color: '#e11d48', delay: 0 },
    { x: '88%', y: '28%', s: 9, color: '#f43f5e', delay: 0.6 },
    { x: '2%', y: '62%', s: 8, color: '#e11d48', delay: 1.2 },
    { x: '90%', y: '60%', s: 9, color: '#fb7185', delay: 0.3 },
    { x: '25%', y: '10%', s: 7, color: '#f43f5e', delay: 0.9 },
    { x: '72%', y: '12%', s: 7, color: '#e11d48', delay: 1.5 },
  ];

  const orbitGems = [
    { angle: 0, s: 6, color: '#e11d48' },
    { angle: 60, s: 5, color: '#bf5eff' },
    { angle: 120, s: 6, color: '#f43f5e' },
    { angle: 180, s: 5, color: '#a855f7' },
    { angle: 240, s: 6, color: '#e11d48' },
    { angle: 300, s: 5, color: '#9ACDE3' },
  ];

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Intense layered glow */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: size * 0.9, height: size * 0.65,
          left: '50%', top: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(ellipse, rgba(191,94,255,0.25) 0%, rgba(225,29,72,0.08) 50%, transparent 75%)',
          filter: 'blur(12px)',
        }}
        animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.1, 1] }}
        transition={{ duration: 2.0, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Secondary ruby glow */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: size * 0.5, height: size * 0.35,
          left: '50%', top: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(ellipse, rgba(225,29,72,0.2) 0%, transparent 70%)',
          filter: 'blur(8px)',
        }}
        animate={{ opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
      />

      {/* Arcane rune circle — rotates slowly */}
      {!isLocked && (
        <motion.div
          className="absolute pointer-events-none"
          style={{
            width: size, height: size,
            left: 0, top: 0,
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
        >
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
            {/* Outer dashed circle */}
            <circle cx={size / 2} cy={size / 2} r={runeR}
              fill="none" stroke="#bf5eff" strokeWidth="1" opacity="0.3" strokeDasharray="4 3" />
            {/* Inner circle */}
            <circle cx={size / 2} cy={size / 2} r={runeR * 0.82}
              fill="none" stroke="#bf5eff" strokeWidth="0.6" opacity="0.2" />
            {/* Runes */}
            {RUNES.map((rune, i) => {
              const a = (i * 60 * Math.PI) / 180;
              return (
                <text key={i}
                  x={size / 2 + runeR * Math.cos(a)}
                  y={size / 2 + runeR * Math.sin(a)}
                  fill="#bf5eff" fontSize={size * 0.05} textAnchor="middle" dominantBaseline="middle"
                  fontWeight="bold" opacity="0.5"
                >{rune}</text>
              );
            })}
          </svg>
        </motion.div>
      )}

      {/* Orbiting gem ring (counter-rotate) */}
      {!isLocked && (
        <motion.div
          className="absolute pointer-events-none"
          style={{ width: size, height: size, left: 0, top: 0 }}
          animate={{ rotate: -360 }}
          transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
        >
          {orbitGems.map((og, i) => {
            const a = (og.angle * Math.PI) / 180;
            const r = size * 0.34;
            const cx = size / 2 + r * Math.cos(a);
            const cy = size / 2 + r * Math.sin(a);
            return (
              <div key={i}
                className="absolute"
                style={{ left: cx - og.s / 2, top: cy - og.s / 2 }}
              >
                <svg width={og.s} height={og.s} viewBox="0 0 10 10">
                  <path d="M5 0 L7.5 3.5 L5 10 L2.5 3.5Z" fill={og.color} />
                  <path d="M5 1.5 L6.5 3.8 L5 8 L3.5 3.8Z" fill="#fff" opacity="0.2" />
                </svg>
              </div>
            );
          })}
        </motion.div>
      )}

      {/* Rising purple wisps */}
      {!isLocked && wisps.map((w, i) => (
        <motion.div key={i}
          className="absolute pointer-events-none"
          style={{ left: w.x, bottom: '30%', width: 3, height: 3 }}
          animate={{ y: [0, -40, -70], opacity: [0, 0.8, 0], x: [0, (i % 2 ? 6 : -6), 0] }}
          transition={{ duration: w.dur, repeat: Infinity, delay: w.delay, ease: 'easeOut' }}
        >
          <div className="w-full h-full rounded-full" style={{ background: i % 2 ? '#bf5eff' : '#e11d48', boxShadow: `0 0 5px ${i % 2 ? '#bf5eff' : '#e11d48'}` }} />
        </motion.div>
      ))}

      {/* Ruby gem accents — pulsing diamonds */}
      {!isLocked && rubyGems.map((g, i) => (
        <motion.div key={i}
          className="absolute pointer-events-none"
          style={{ left: g.x, top: g.y }}
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.85, 1.15, 0.85] }}
          transition={{ duration: 2.2, repeat: Infinity, delay: g.delay, ease: 'easeInOut' }}
        >
          <svg width={g.s} height={g.s} viewBox="0 0 12 12">
            {/* Diamond gem shape */}
            <path d="M6 0 L9 4 L6 12 L3 4Z" fill={g.color} />
            <path d="M6 1 L8 4 L6 10 L4 4Z" fill="#fff" opacity="0.2" />
            {/* Tiny inner glow */}
            <circle cx="6" cy="4" r="1.5" fill="#fff" opacity="0.3" />
          </svg>
        </motion.div>
      ))}

      {/* Diamond sparkle bursts */}
      {!isLocked && [0, 1, 2, 3].map(i => (
        <motion.div key={`ds${i}`}
          className="absolute pointer-events-none"
          style={{ left: `${15 + i * 22}%`, top: `${20 + (i % 2) * 15}%` }}
          animate={{ opacity: [0, 1, 0], scale: [0.3, 1.3, 0.3], rotate: [0, 180] }}
          transition={{ duration: 2.8, repeat: Infinity, delay: i * 0.6, ease: 'easeInOut' }}
        >
          <svg width="8" height="8" viewBox="0 0 8 8">
            <path d="M4 0 L4.6 3 L8 4 L4.6 5 L4 8 L3.4 5 L0 4 L3.4 3Z" fill="#f9a8d4" />
          </svg>
        </motion.div>
      ))}

      {/* Lottie — on top of all effects */}
      <div className="relative z-10">
        <ChestLottieBase
          src="/assets/lottie/alliance_chest.json"
          size={size} phase={phase} onComplete={onComplete}
          fallback={<AllianceChestAnim isLocked={isLocked ?? false} size={size} />}
        />
      </div>
    </div>
  );
};
