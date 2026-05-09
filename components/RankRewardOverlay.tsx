import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Crown, Zap, Coins } from 'lucide-react';
import { SystemCoin } from './icons/SystemCoin';


interface RankRewardOverlayProps {
  rank: number;        // 1-5
  gold: number;
  xp: number;

  username: string;
  onClaim: () => void; // Called after user taps Claim
}

// ── Rank Config ──
const RANK_CONFIG: Record<number, { emoji: string; title: string; color: string; glow: string; bgGrad: string }> = {
  1: { emoji: '👑', title: 'FORGE SOVEREIGN', color: '#fbbf24', glow: 'rgba(251,191,36,0.6)', bgGrad: 'radial-gradient(ellipse at center, rgba(251,191,36,0.12) 0%, rgba(10,10,26,0.98) 70%)' },
  2: { emoji: '🥈', title: 'APEX ELITE', color: '#c0c0c0', glow: 'rgba(192,192,192,0.5)', bgGrad: 'radial-gradient(ellipse at center, rgba(192,192,192,0.08) 0%, rgba(10,10,26,0.98) 70%)' },
  3: { emoji: '🥉', title: 'APEX ELITE', color: '#cd7f32', glow: 'rgba(205,127,50,0.5)', bgGrad: 'radial-gradient(ellipse at center, rgba(205,127,50,0.08) 0%, rgba(10,10,26,0.98) 70%)' },
  4: { emoji: '🏅', title: 'S-RANK ELITE', color: '#a855f7', glow: 'rgba(168,85,247,0.4)', bgGrad: 'radial-gradient(ellipse at center, rgba(168,85,247,0.06) 0%, rgba(10,10,26,0.98) 70%)' },
  5: { emoji: '🏅', title: 'S-RANK ELITE', color: '#a855f7', glow: 'rgba(168,85,247,0.4)', bgGrad: 'radial-gradient(ellipse at center, rgba(168,85,247,0.06) 0%, rgba(10,10,26,0.98) 70%)' },
};

// Fallback configs for participation tiers (ranks 6+)
const HUNTER_CONFIG = { emoji: '⚔️', title: 'HUNTER CLASS', color: '#00d4ff', glow: 'rgba(0,212,255,0.4)', bgGrad: 'radial-gradient(ellipse at center, rgba(0,212,255,0.06) 0%, rgba(10,10,26,0.98) 70%)' };
const PARTICIPANT_CONFIG = { emoji: '🛡️', title: 'ACTIVE HUNTER', color: 'rgba(255,255,255,0.6)', glow: 'rgba(255,255,255,0.2)', bgGrad: 'radial-gradient(ellipse at center, rgba(255,255,255,0.03) 0%, rgba(10,10,26,0.98) 70%)' };

function getRankConfig(rank: number) {
  if (RANK_CONFIG[rank]) return RANK_CONFIG[rank];
  if (rank <= 10) return HUNTER_CONFIG;
  return PARTICIPANT_CONFIG;
}

// ── Sound Effects ──
function playRewardSound(type: 'rank' | 'coin' | 'xp' | 'claim') {
  try {
    const ac = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ac.currentTime;

    if (type === 'rank') {
      // Epic reveal chord
      [440, 554, 659, 880].forEach((freq, i) => {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, now + i * 0.08);
        gain.gain.linearRampToValueAtTime(0.15, now + i * 0.08 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 1.5);
        osc.connect(gain).connect(ac.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 1.5);
      });
    } else if (type === 'coin') {
      // Coin jingle
      [1200, 1400, 1600].forEach((freq, i) => {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.12, now + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.3);
        osc.connect(gain).connect(ac.destination);
        osc.start(now + i * 0.06);
        osc.stop(now + i * 0.06 + 0.3);
      });
    } else if (type === 'xp') {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.linearRampToValueAtTime(1200, now + 0.3);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc.connect(gain).connect(ac.destination);
      osc.start(now);
      osc.stop(now + 0.5);
    } else if (type === 'claim') {
      // Triumphant ascending
      [523, 659, 784, 1047].forEach((freq, i) => {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.12, now + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.6);
        osc.connect(gain).connect(ac.destination);
        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.6);
      });
    }
  } catch { /* audio not available */ }
}

// ── Particle System ──
const FloatingParticle: React.FC<{ delay: number; color: string; size: number }> = ({ delay, color, size }) => (
  <motion.div
    initial={{ opacity: 0, y: 40, x: (Math.random() - 0.5) * 200 }}
    animate={{
      opacity: [0, 0.8, 0],
      y: [40, -120 - Math.random() * 100],
      x: [(Math.random() - 0.5) * 200, (Math.random() - 0.5) * 300],
    }}
    transition={{ duration: 2 + Math.random(), delay, ease: 'easeOut' }}
    style={{
      position: 'absolute',
      width: size,
      height: size,
      borderRadius: '50%',
      background: color,
      filter: `blur(${size > 4 ? 1 : 0}px)`,
      boxShadow: `0 0 ${size * 3}px ${color}`,
    }}
  />
);

// ── Coin Rain ──
const CoinParticle: React.FC<{ index: number }> = ({ index }) => {
  const startX = 20 + Math.random() * 60; // 20-80% of width
  const delay = Math.random() * 0.8;
  return (
    <motion.div
      initial={{ opacity: 0, y: '-10vh', x: `${startX}vw`, rotate: 0 }}
      animate={{
        opacity: [0, 1, 1, 0],
        y: ['-10vh', '40vh', '42vh', '38vh', '42vh'],
        rotate: [0, 360, 720],
      }}
      transition={{
        duration: 1.5,
        delay: delay,
        ease: [0.25, 0.46, 0.45, 0.94],
        y: { duration: 1.5, delay, times: [0, 0.6, 0.7, 0.85, 1] },
      }}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        fontSize: 18 + Math.random() * 10,
        zIndex: 10,
      }}
    >
      🪙
    </motion.div>
  );
};

// ── Counter Animation ──
const AnimatedCounter: React.FC<{ value: number; prefix?: string; suffix?: string; color: string; delay: number }> = ({
  value, prefix = '', suffix = '', color, delay,
}) => {
  const [displayed, setDisplayed] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      started.current = true;
      const duration = 800;
      const steps = 30;
      const stepDuration = duration / steps;
      let step = 0;
      const interval = setInterval(() => {
        step++;
        const progress = step / steps;
        // Ease out
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplayed(Math.round(value * eased));
        if (step >= steps) clearInterval(interval);
      }, stepDuration);
    }, delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: delay / 1000, duration: 0.4, type: 'spring' }}
      style={{ color, fontWeight: 900, fontFamily: 'monospace', fontSize: 28 }}
    >
      {prefix}{displayed.toLocaleString()}{suffix}
    </motion.span>
  );
};

// ═══════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════
const RankRewardOverlay: React.FC<RankRewardOverlayProps> = ({
  rank, gold, xp, username, onClaim,
}) => {
  const [phase, setPhase] = useState(0); // 0=entering, 1=rank, 2=rewards, 3=claim
  const cfg = getRankConfig(rank);

  // Phase progression
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    // Phase 0 → 1 (Rank reveal)
    timers.push(setTimeout(() => { setPhase(1); playRewardSound('rank'); }, 400));
    // Phase 1 → 2 (Reward cascade)
    timers.push(setTimeout(() => { setPhase(2); playRewardSound('coin'); }, 2200));
    // Phase 2 → 3 (Claim)
    timers.push(setTimeout(() => setPhase(3), 4400));
    return () => timers.forEach(clearTimeout);
  }, []);

  const handleClaim = useCallback(() => {
    playRewardSound('claim');
    onClaim();
  }, [onClaim]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: cfg.bgGrad,
        fontFamily: 'monospace',
        overflow: 'hidden',
      }}
    >
      {/* Background particles */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {Array.from({ length: 25 }).map((_, i) => (
          <FloatingParticle
            key={i}
            delay={0.5 + i * 0.15}
            color={cfg.color}
            size={3 + Math.random() * 5}
          />
        ))}
      </div>

      {/* Shockwave ring */}
      <AnimatePresence>
        {phase >= 1 && (
          <motion.div
            initial={{ scale: 0, opacity: 0.8 }}
            animate={{ scale: 6, opacity: 0 }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              width: 100,
              height: 100,
              borderRadius: '50%',
              border: `2px solid ${cfg.color}`,
              boxShadow: `0 0 40px ${cfg.glow}`,
            }}
          />
        )}
      </AnimatePresence>

      {/* Second shockwave */}
      <AnimatePresence>
        {phase >= 1 && (
          <motion.div
            initial={{ scale: 0, opacity: 0.5 }}
            animate={{ scale: 4, opacity: 0 }}
            transition={{ duration: 1.2, delay: 0.2, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              width: 80,
              height: 80,
              borderRadius: '50%',
              border: `1px solid ${cfg.color}`,
            }}
          />
        )}
      </AnimatePresence>

      {/* ── PHASE 1: Rank Badge ── */}
      <AnimatePresence>
        {phase >= 1 && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            style={{ textAlign: 'center', position: 'relative', zIndex: 20 }}
          >
            {/* Glow behind badge */}
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 160,
                height: 160,
                borderRadius: '50%',
                background: cfg.glow,
                filter: 'blur(40px)',
              }}
            />

            {/* Rank emoji */}
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              style={{ fontSize: 72, position: 'relative', zIndex: 2, filter: `drop-shadow(0 0 20px ${cfg.glow})` }}
            >
              {cfg.emoji}
            </motion.div>

            {/* Rank number */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              style={{
                fontSize: 14,
                fontWeight: 900,
                color: cfg.color,
                letterSpacing: '0.2em',
                marginTop: 8,
                textShadow: `0 0 20px ${cfg.glow}`,
              }}
            >
              RANK #{rank}
            </motion.div>

            {/* Title */}
            <motion.div
              initial={{ opacity: 0, y: 20, scaleX: 0 }}
              animate={{ opacity: 1, y: 0, scaleX: 1 }}
              transition={{ delay: 0.7, duration: 0.6, type: 'spring' }}
              style={{
                fontSize: 20,
                fontWeight: 900,
                color: 'white',
                letterSpacing: '0.15em',
                marginTop: 4,
                textShadow: `0 0 30px ${cfg.glow}`,
              }}
            >
              {cfg.title}
            </motion.div>

            {/* Username */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              transition={{ delay: 1 }}
              style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 6, letterSpacing: '0.15em' }}
            >
              @{username}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── PHASE 2: Reward Cascade ── */}
      <AnimatePresence>
        {phase >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              marginTop: 32,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
              position: 'relative',
              zIndex: 20,
            }}
          >
            {/* Divider */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.4 }}
              style={{
                width: 200,
                height: 1,
                background: `linear-gradient(90deg, transparent, ${cfg.color}, transparent)`,
                marginBottom: 8,
              }}
            />

            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, type: 'spring' }}
              style={{ display: 'flex', alignItems: 'center', gap: 12 }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div className="flex items-center justify-center -mx-2 -my-2" style={{ width: 35, flexShrink: 0 }}><SystemCoin size={35} /></div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em' }}>GOLD</span>
                <AnimatedCounter value={gold} prefix="+" color="#fbbf24" delay={300} />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5, type: 'spring' }}
              style={{ display: 'flex', alignItems: 'center', gap: 12 }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Zap size={20} color="#60a5fa" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em' }}>BONUS XP</span>
                <AnimatedCounter value={xp} prefix="+" color="#60a5fa" delay={600} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Coin rain during phase 2 */}
      {phase >= 2 && phase < 4 && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <CoinParticle key={i} index={i} />
          ))}
        </div>
      )}



      {/* ── PHASE 4: Claim Button ── */}
      <AnimatePresence>
        {phase >= 3 && (
          <motion.button
            initial={{ opacity: 0, y: 30, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            onClick={handleClaim}
            style={{
              marginTop: 40,
              padding: '14px 48px',
              borderRadius: 16,
              background: `linear-gradient(135deg, ${cfg.color}, ${cfg.color}cc)`,
              border: 'none',
              color: '#0a0a1a',
              fontSize: 14,
              fontWeight: 900,
              fontFamily: 'monospace',
              letterSpacing: '0.2em',
              cursor: 'pointer',
              position: 'relative',
              zIndex: 20,
              boxShadow: `0 0 30px ${cfg.glow}, 0 4px 20px rgba(0,0,0,0.4)`,
            }}
          >
            <motion.span
              animate={{ opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              CLAIM REWARDS
            </motion.span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Bottom decoration ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
        transition={{ delay: 1 }}
        style={{
          position: 'absolute',
          bottom: 40,
          fontSize: 9,
          color: 'rgba(255,255,255,0.3)',
          letterSpacing: '0.2em',
          textAlign: 'center',
        }}
      >
        DAILY LEADERBOARD REWARD
      </motion.div>
    </motion.div>
  );
};

export default RankRewardOverlay;
