/**
 * RewardCelebration — Full-screen reward celebration overlay
 * 
 * Used for: workout completion, leaderboard reset, quest milestones
 * Features: animated rewards, "Watch Ad to Double" button, particle effects
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Play, Zap, Trophy, Dumbbell, Crown } from 'lucide-react';

export interface RewardItem {
  type: 'GOLD' | 'XP' | 'KEYS';
  amount: number;
  icon?: React.ReactNode;
}

export interface RewardCelebrationProps {
  visible: boolean;
  onClose: () => void;
  title: string;           // e.g. "WORKOUT COMPLETE" or "LEADERBOARD REWARDS"
  subtitle?: string;       // e.g. "Legs & Core Instance"
  variant: 'WORKOUT' | 'LEADERBOARD' | 'QUEST' | 'MILESTONE';
  rewards: RewardItem[];
  onWatchAdToDouble?: () => Promise<boolean>; // Returns true if ad was watched
  onCollect: (doubled: boolean) => void;
}

// ── Floating particles ──
const CelebrationParticles: React.FC<{ color: string }> = ({ color }) => {
  const particles = useMemo(() =>
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 2,
      size: 2 + Math.random() * 4,
      duration: 2 + Math.random() * 3,
    })), []);

  return (
    <>
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: `${p.x}%`,
            bottom: '20%',
            width: p.size,
            height: p.size,
            background: color,
            boxShadow: `0 0 ${p.size * 2}px ${color}`,
          }}
          initial={{ opacity: 0, y: 0 }}
          animate={{
            opacity: [0, 0.8, 0],
            y: [0, -(100 + Math.random() * 200)],
            x: [(Math.random() - 0.5) * 60],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeOut',
          }}
        />
      ))}
    </>
  );
};

// ── Reward card ──
const RewardCard: React.FC<{ reward: RewardItem; index: number; doubled: boolean }> = ({ reward, index, doubled }) => {
  const colors: Record<string, { bg: string; text: string; glow: string }> = {
    GOLD: { bg: 'rgba(234,179,8,0.15)', text: '#eab308', glow: 'rgba(234,179,8,0.3)' },
    XP: { bg: 'rgba(59,130,246,0.15)', text: '#3b82f6', glow: 'rgba(59,130,246,0.3)' },
    KEYS: { bg: 'rgba(0,212,255,0.15)', text: '#00d4ff', glow: 'rgba(0,212,255,0.3)' },
  };

  const c = colors[reward.type] || colors.GOLD;
  const displayAmount = doubled ? reward.amount * 2 : reward.amount;
  const icons: Record<string, string> = { GOLD: '🪙', XP: '⚡', KEYS: '🔑' };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.4 + index * 0.15, type: 'spring', stiffness: 200, damping: 15 }}
      className="flex items-center gap-3 px-4 py-3 rounded-xl"
      style={{
        background: c.bg,
        border: `1px solid ${c.text}30`,
        boxShadow: `0 0 20px ${c.glow}`,
      }}
    >
      <span className="text-2xl">{icons[reward.type]}</span>
      <div className="flex-1">
        <div className="text-[10px] font-mono font-bold uppercase tracking-widest" style={{ color: `${c.text}80` }}>
          {reward.type}
        </div>
        <div className="flex items-center gap-2">
          <motion.span
            className="text-xl font-black font-mono"
            style={{ color: c.text }}
            key={displayAmount}
            initial={{ scale: doubled ? 1.5 : 1 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            +{displayAmount}
          </motion.span>
          {doubled && (
            <motion.span
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded"
              style={{ background: `${c.text}20`, color: c.text }}
            >
              ×2
            </motion.span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const VARIANT_CONFIG: Record<string, { icon: React.ReactNode; color: string; bgGradient: string }> = {
  WORKOUT: {
    icon: <Dumbbell size={32} />,
    color: '#00d4ff',
    bgGradient: 'radial-gradient(ellipse at 50% 30%, rgba(0,212,255,0.08) 0%, transparent 60%)',
  },
  LEADERBOARD: {
    icon: <Crown size={32} />,
    color: '#eab308',
    bgGradient: 'radial-gradient(ellipse at 50% 30%, rgba(234,179,8,0.08) 0%, transparent 60%)',
  },
  QUEST: {
    icon: <Zap size={32} />,
    color: '#3b82f6',
    bgGradient: 'radial-gradient(ellipse at 50% 30%, rgba(59,130,246,0.08) 0%, transparent 60%)',
  },
  MILESTONE: {
    icon: <Trophy size={32} />,
    color: '#a855f7',
    bgGradient: 'radial-gradient(ellipse at 50% 30%, rgba(168,85,247,0.08) 0%, transparent 60%)',
  },
};

const RewardCelebration: React.FC<RewardCelebrationProps> = ({
  visible,
  onClose,
  title,
  subtitle,
  variant,
  rewards,
  onWatchAdToDouble,
  onCollect,
}) => {
  const [isDoubled, setIsDoubled] = useState(false);
  const [adLoading, setAdLoading] = useState(false);
  const [adWatched, setAdWatched] = useState(false);

  const cfg = VARIANT_CONFIG[variant] || VARIANT_CONFIG.QUEST;

  const handleWatchAd = async () => {
    if (!onWatchAdToDouble || adLoading || adWatched) return;
    setAdLoading(true);
    try {
      const success = await onWatchAdToDouble();
      if (success) {
        setIsDoubled(true);
        setAdWatched(true);
      }
    } finally {
      setAdLoading(false);
    }
  };

  const handleCollect = () => {
    onCollect(isDoubled);
    // Reset state for next use
    setIsDoubled(false);
    setAdWatched(false);
    setAdLoading(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(12px)' }}
        >
          {/* Background effects */}
          <div className="absolute inset-0 pointer-events-none" style={{ background: cfg.bgGradient }} />
          <CelebrationParticles color={cfg.color} />

          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-gray-600 hover:text-white transition-colors z-10"
          >
            <X size={20} />
          </button>

          {/* Content */}
          <motion.div
            initial={{ scale: 0.8, y: 40 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 40 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="w-full max-w-sm flex flex-col items-center relative z-10"
          >
            {/* Icon */}
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 250 }}
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{
                background: `${cfg.color}15`,
                border: `2px solid ${cfg.color}40`,
                color: cfg.color,
                boxShadow: `0 0 40px ${cfg.color}20`,
              }}
            >
              {cfg.icon}
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-2xl font-black text-white uppercase tracking-tight font-mono text-center mb-1"
            >
              {title}
            </motion.h1>

            {subtitle && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-xs text-gray-500 font-mono uppercase tracking-widest mb-6"
              >
                {subtitle}
              </motion.p>
            )}

            {/* Reward cards */}
            <div className="w-full space-y-2.5 mb-6">
              {rewards.map((r, i) => (
                <RewardCard key={`${r.type}-${i}`} reward={r} index={i} doubled={isDoubled} />
              ))}
            </div>

            {/* Watch Ad to Double */}
            {onWatchAdToDouble && !adWatched && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                onClick={handleWatchAd}
                disabled={adLoading}
                className="w-full py-3.5 rounded-xl font-black text-sm uppercase tracking-wider font-mono flex items-center justify-center gap-2 mb-3 transition-all active:scale-95 disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(168,85,247,0.1))',
                  border: '1.5px solid rgba(168,85,247,0.4)',
                  color: '#a855f7',
                  boxShadow: '0 0 20px rgba(168,85,247,0.15)',
                }}
              >
                {adLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                    Loading Ad...
                  </>
                ) : (
                  <>
                    <Play size={16} fill="currentColor" />
                    Watch Ad to Double Rewards
                  </>
                )}
              </motion.button>
            )}

            {/* Doubled confirmation */}
            {adWatched && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full py-2.5 rounded-xl text-center text-sm font-black uppercase tracking-wider font-mono mb-3"
                style={{
                  background: 'rgba(34,197,94,0.1)',
                  border: '1px solid rgba(34,197,94,0.3)',
                  color: '#22c55e',
                }}
              >
                ✓ REWARDS DOUBLED
              </motion.div>
            )}

            {/* Collect button */}
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              onClick={handleCollect}
              className="w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest text-black flex items-center justify-center gap-2 active:scale-95 transition-all"
              style={{
                background: `linear-gradient(135deg, ${cfg.color}, white)`,
                boxShadow: `0 0 30px ${cfg.color}40`,
              }}
            >
              <Check size={18} strokeWidth={3} />
              COLLECT REWARDS
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default RewardCelebration;
