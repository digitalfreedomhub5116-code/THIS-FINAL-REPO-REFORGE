import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Gift, Key, Award } from 'lucide-react';

interface MilestoneData {
  days: number;
  gold: number;
  keys: number;
  title: string | null;
  border: string | null;
  banner: string | null;
}

interface StreakMilestoneOverlayProps {
  milestone: MilestoneData;
  onClaim: () => void;
}

// Tier visual configs
const TIER_CONFIG: Record<number, {
  gradient: string; glowColor: string; fireEmoji: string; label: string; bgGlow: string;
}> = {
  7:   { gradient: 'linear-gradient(135deg, #CD7F32, #8B6914)', glowColor: '#CD7F32', fireEmoji: '🔥', label: 'WEEK WARRIOR', bgGlow: 'rgba(205,127,50,0.08)' },
  14:  { gradient: 'linear-gradient(135deg, #C0C0C0, #808080)', glowColor: '#C0C0C0', fireEmoji: '🔥', label: 'FORGED IN FIRE', bgGlow: 'rgba(192,192,192,0.08)' },
  30:  { gradient: 'linear-gradient(135deg, #EAB308, #CA8A04)', glowColor: '#EAB308', fireEmoji: '🔥', label: 'IRON WILL', bgGlow: 'rgba(234,179,8,0.08)' },
  60:  { gradient: 'linear-gradient(135deg, #00d4ff, #5A9AB5)', glowColor: '#00d4ff', fireEmoji: '🔥', label: 'INFERNO', bgGlow: 'rgba(0,212,255,0.08)' },
  100: { gradient: 'linear-gradient(135deg, #A855F7, #7C3AED)', glowColor: '#A855F7', fireEmoji: '🔥', label: 'ETERNAL FLAME', bgGlow: 'rgba(168,85,247,0.08)' },
  365: { gradient: 'linear-gradient(135deg, #EAB308, #A855F7, #EF4444)', glowColor: '#EAB308', fireEmoji: '👑', label: 'LEGENDARY', bgGlow: 'rgba(234,179,8,0.12)' },
};

// Next milestone lookup
const MILESTONE_ORDER = [7, 14, 30, 60, 100, 365];

const StreakMilestoneOverlay: React.FC<StreakMilestoneOverlayProps> = ({ milestone, onClaim }) => {
  const [phase, setPhase] = useState(0); // 0=enter, 1=content, 2=rewards, 3=button
  const config = TIER_CONFIG[milestone.days] || TIER_CONFIG[7];

  const nextMilestoneIdx = MILESTONE_ORDER.indexOf(milestone.days);
  const nextMilestone = nextMilestoneIdx >= 0 && nextMilestoneIdx < MILESTONE_ORDER.length - 1
    ? MILESTONE_ORDER[nextMilestoneIdx + 1]
    : null;
  const daysToNext = nextMilestone ? nextMilestone - milestone.days : null;

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 2000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  // Play milestone sound
  useEffect(() => {
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      // Ascending triumphant chord
      [523, 659, 784, 1047].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.connect(g); g.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);
        g.gain.setValueAtTime(0.08, ctx.currentTime + i * 0.1);
        g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.1 + 0.5);
        osc.start(ctx.currentTime + i * 0.1);
        osc.stop(ctx.currentTime + i * 0.1 + 0.5);
      });
    } catch { /* audio unavailable */ }
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
        className="fixed inset-0 z-[310] flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
      >
        {/* Background radial glow */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          style={{
            background: `radial-gradient(ellipse 50% 40% at 50% 45%, ${config.bgGlow} 0%, transparent 70%)`,
          }}
        />

        {/* Floating fire particles */}
        {phase >= 1 && Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full pointer-events-none"
            style={{
              width: 3 + Math.random() * 4,
              height: 3 + Math.random() * 4,
              background: config.glowColor,
              left: `${10 + Math.random() * 80}%`,
              bottom: 0,
            }}
            initial={{ opacity: 0, y: 0 }}
            animate={{
              opacity: [0, 0.7, 0],
              y: [0, -(200 + Math.random() * 300)],
              x: (Math.random() - 0.5) * 60,
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              delay: Math.random() * 1.5,
              repeat: Infinity,
              ease: 'easeOut',
            }}
          />
        ))}

        <div className="relative flex flex-col items-center max-w-sm w-full px-6">
          {/* Fire icon pulse */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="text-5xl mb-4"
          >
            <motion.span
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              style={{ display: 'inline-block', filter: `drop-shadow(0 0 20px ${config.glowColor})` }}
            >
              {config.fireEmoji}
            </motion.span>
          </motion.div>

          {/* Days count */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={phase >= 1 ? { opacity: 1, y: 0 } : {}}
            transition={{ type: 'spring', stiffness: 180, damping: 18 }}
            className="text-center mb-2"
          >
            <span
              className="font-black text-5xl tabular-nums block"
              style={{
                background: config.gradient,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: `drop-shadow(0 0 30px ${config.glowColor}60)`,
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {milestone.days}
            </span>
            <span
              className="block text-xs font-black tracking-[0.4em] uppercase mt-1"
              style={{ color: `${config.glowColor}90` }}
            >
              DAY STREAK
            </span>
          </motion.div>

          {/* Milestone title */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={phase >= 1 ? { opacity: 1, scale: 1 } : {}}
            transition={{ delay: 0.3, type: 'spring' }}
            className="text-center mb-6"
          >
            <span
              className="text-sm font-black tracking-[0.3em] uppercase"
              style={{ color: config.glowColor, textShadow: `0 0 20px ${config.glowColor}40` }}
            >
              {config.label}
            </span>
          </motion.div>

          {/* Rewards card */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={phase >= 2 ? { opacity: 1, y: 0, scale: 1 } : {}}
            transition={{ type: 'spring', stiffness: 150, damping: 18 }}
            className="w-full rounded-xl p-5 mb-4"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: `1px solid ${config.glowColor}20`,
              boxShadow: `0 0 30px ${config.glowColor}08`,
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Gift size={14} style={{ color: config.glowColor }} />
              <span className="text-[10px] font-black tracking-[0.3em] uppercase" style={{ color: config.glowColor }}>
                REWARDS UNLOCKED
              </span>
            </div>

            <div className="flex flex-wrap gap-3">
              {/* Gold */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
                style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.15)' }}>
                <span className="text-sm">🪙</span>
                <span className="text-sm font-bold text-yellow-400">+{milestone.gold.toLocaleString()}</span>
              </div>

              {/* Keys */}
              {milestone.keys > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
                  style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.15)' }}>
                  <Key size={13} className="text-cyan-400" />
                  <span className="text-sm font-bold text-cyan-400">+{milestone.keys}</span>
                </div>
              )}

              {/* Border */}
              {milestone.border && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
                  style={{ background: `${config.glowColor}08`, border: `1px solid ${config.glowColor}15` }}>
                  <span className="text-sm">🖼️</span>
                  <span className="text-xs font-bold" style={{ color: config.glowColor }}>Border</span>
                </div>
              )}

              {/* Banner */}
              {milestone.banner && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
                  style={{ background: `${config.glowColor}08`, border: `1px solid ${config.glowColor}15` }}>
                  <span className="text-sm">🏳️</span>
                  <span className="text-xs font-bold" style={{ color: config.glowColor }}>Banner</span>
                </div>
              )}

              {/* Title */}
              {milestone.title && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
                  style={{ background: `${config.glowColor}08`, border: `1px solid ${config.glowColor}15` }}>
                  <Award size={13} style={{ color: config.glowColor }} />
                  <span className="text-xs font-bold" style={{ color: config.glowColor }}>"{milestone.title}"</span>
                </div>
              )}
            </div>
          </motion.div>

          {/* Next milestone hint */}
          {nextMilestone && daysToNext && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={phase >= 2 ? { opacity: 0.5 } : {}}
              transition={{ delay: 0.5 }}
              className="text-xs text-center mb-5"
              style={{ color: '#9ca3af', fontFamily: 'monospace' }}
            >
              Next: {nextMilestone} days ({daysToNext} to go)
            </motion.p>
          )}

          {/* Claim button */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={phase >= 3 ? { opacity: 1, y: 0 } : {}}
            transition={{ type: 'spring', stiffness: 150, damping: 18 }}
            onClick={onClaim}
            className="px-8 py-3 rounded-lg font-black text-sm tracking-widest uppercase"
            style={{
              background: config.gradient,
              color: milestone.days === 365 ? '#000' : '#fff',
              boxShadow: `0 0 30px ${config.glowColor}30`,
              border: 'none',
              cursor: 'pointer',
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Flame size={14} className="inline mr-2" style={{ marginTop: -2 }} />
            CLAIM REWARDS
          </motion.button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default StreakMilestoneOverlay;
