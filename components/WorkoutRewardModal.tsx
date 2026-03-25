import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Coins, Key, Heart, ScrollText, Sparkles, ChevronRight, AlertOctagon, ShieldOff, XCircle } from 'lucide-react';

export interface WorkoutReward {
  type: 'XP' | 'GOLD' | 'KEYS' | 'HEALTH_POTION' | 'SHADOW_SCROLL' | 'ULT_ORB';
  amount: number;
  label: string;
}

interface WorkoutRewardModalProps {
  rewards: WorkoutReward[];
  anomalyPoints: number;
  onClose: () => void;
}

const REWARD_CONFIG: Record<string, { icon: React.ReactNode; accent: string; accentRgb: string }> = {
  XP: {
    icon: <Zap size={28} fill="currentColor" />,
    accent: 'text-white',
    accentRgb: '255,255,255',
  },
  GOLD: {
    icon: <Coins size={28} fill="currentColor" />,
    accent: 'text-amber-200',
    accentRgb: '253,230,138',
  },
  KEYS: {
    icon: <Key size={28} />,
    accent: 'text-gray-300',
    accentRgb: '209,213,219',
  },
  HEALTH_POTION: {
    icon: <Heart size={28} fill="currentColor" />,
    accent: 'text-gray-300',
    accentRgb: '209,213,219',
  },
  SHADOW_SCROLL: {
    icon: <ScrollText size={28} />,
    accent: 'text-gray-300',
    accentRgb: '209,213,219',
  },
  ULT_ORB: {
    icon: <Sparkles size={28} fill="currentColor" />,
    accent: 'text-white',
    accentRgb: '255,255,255',
  },
};

// Subtle line burst on reveal
const LineBurst: React.FC = () => {
  const lines = Array.from({ length: 8 });
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
      {lines.map((_, i) => {
        const angle = (i / 8) * 360;
        return (
          <motion.div
            key={i}
            className="absolute w-px bg-white/30"
            style={{ height: 20, transformOrigin: 'center bottom', rotate: `${angle}deg` }}
            initial={{ scaleY: 0, opacity: 0.8 }}
            animate={{ scaleY: 1, opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: i * 0.03 }}
          />
        );
      })}
    </div>
  );
};

const WorkoutRewardModal: React.FC<WorkoutRewardModalProps> = ({ rewards, anomalyPoints, onClose }) => {
  const [revealedCount, setRevealedCount] = useState(0);
  const [allRevealed, setAllRevealed] = useState(false);

  // Auto-reveal rewards one by one with delays
  useEffect(() => {
    if (revealedCount < rewards.length) {
      const timer = setTimeout(() => {
        setRevealedCount(prev => prev + 1);
      }, revealedCount === 0 ? 800 : 1500);
      return () => clearTimeout(timer);
    } else if (revealedCount >= rewards.length && rewards.length > 0) {
      const timer = setTimeout(() => setAllRevealed(true), 600);
      return () => clearTimeout(timer);
    }
  }, [revealedCount, rewards.length]);

  const penaltyExceeded = rewards.length === 0;

  // Full penalty warning screen — no rewards at all
  if (penaltyExceeded) {
    return createPortal(
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[150] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-6"
      >
        {/* Pulsing red vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_30%,_rgba(220,38,38,0.15)_100%)] pointer-events-none" />

        {/* Shield icon */}
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 150, damping: 12, delay: 0.3 }}
          className="relative mb-6"
        >
          <div className="w-28 h-28 rounded-full bg-red-950/60 border-2 border-red-500/40 flex items-center justify-center shadow-[0_0_80px_rgba(220,38,38,0.4)]">
            <ShieldOff size={56} className="text-red-500" strokeWidth={1.5} />
          </div>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.6, type: 'spring' }}
            className="absolute -top-1 -right-1 w-10 h-10 bg-red-600 rounded-full flex items-center justify-center border-2 border-black"
          >
            <XCircle size={22} className="text-white" />
          </motion.div>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-3xl font-black italic text-red-500 tracking-tight uppercase text-center"
        >
          Session Voided
        </motion.h1>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.65 }}
          className="text-xs font-mono text-red-400/70 mt-2 tracking-widest uppercase"
        >
          Anti-Cheat Triggered
        </motion.p>

        {/* Warning details */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-8 max-w-xs w-full bg-red-950/40 border border-red-500/30 rounded-2xl p-5 space-y-4"
        >
          <div className="flex items-center gap-3">
            <AlertOctagon size={18} className="text-red-500 flex-shrink-0" />
            <p className="text-red-300/90 text-sm font-mono leading-snug">
              <span className="font-bold text-red-400">{anomalyPoints}</span> anomaly violations detected — threshold exceeded.
            </p>
          </div>

          <div className="border-t border-red-500/20 pt-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-gray-500">XP Earned</span>
              <span className="text-sm font-black text-red-500">0</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-gray-500">Gold Earned</span>
              <span className="text-sm font-black text-red-500">0</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-gray-500">Rewards</span>
              <span className="text-sm font-black text-red-500">NONE</span>
            </div>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
          className="mt-5 text-[11px] font-mono text-gray-600 text-center max-w-xs leading-relaxed"
        >
          You tried to skip exercises. Complete them properly to earn rewards.
        </motion.p>

        {/* Dismiss Button */}
        <motion.button
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.3 }}
          onClick={onClose}
          className="mt-8 px-8 py-4 bg-red-950/60 border border-red-500/40 text-red-400 font-black text-sm rounded-xl flex items-center gap-2 hover:bg-red-900/50 transition-all active:scale-95 tracking-wider"
        >
          DISMISS <ChevronRight size={18} strokeWidth={3} />
        </motion.button>
      </motion.div>,
      document.body
    );
  }

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] bg-black flex flex-col items-center justify-center p-6"
    >
      {/* Subtle radial vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.03)_0%,_transparent_60%)] pointer-events-none" />

      {/* Title */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mb-8 text-center"
      >
        <p className="text-[10px] font-mono font-bold tracking-[0.4em] uppercase text-gray-600 mb-2">SESSION COMPLETE</p>
        <h1 className="text-2xl font-black text-white tracking-tight uppercase font-mono">
          REWARDS
        </h1>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: 60 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="h-px bg-gradient-to-r from-transparent via-white/40 to-transparent mx-auto mt-3"
        />
      </motion.div>

      {/* Reward Slots */}
      <div className="flex flex-col gap-3 w-full max-w-sm">
        {rewards.map((reward, idx) => {
          const config = REWARD_CONFIG[reward.type] || REWARD_CONFIG.XP;
          const isRevealed = idx < revealedCount;

          return (
            <div key={idx} className="relative h-[72px] w-full">
              <AnimatePresence mode="wait">
                {!isRevealed ? (
                  <motion.div
                    key="mystery"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.25 }}
                    className="absolute inset-0 rounded-xl flex items-center justify-center"
                    style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.06] animate-pulse" />
                      <div className="space-y-1.5">
                        <div className="w-20 h-2.5 bg-white/[0.04] rounded animate-pulse" />
                        <div className="w-14 h-2 bg-white/[0.03] rounded animate-pulse" />
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="revealed"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                    className="absolute inset-0 rounded-xl flex items-center px-5"
                    style={{
                      background: '#0a0a0f',
                      border: '1px solid rgba(255,255,255,0.08)',
                      boxShadow: `0 0 20px rgba(${config.accentRgb},0.06)`,
                    }}
                  >
                    <LineBurst />

                    {/* Icon */}
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 12, delay: 0.1 }}
                      className={`w-11 h-11 rounded-lg flex items-center justify-center ${config.accent} flex-shrink-0`}
                      style={{ background: `rgba(${config.accentRgb},0.06)`, border: `1px solid rgba(${config.accentRgb},0.1)` }}
                    >
                      {config.icon}
                    </motion.div>

                    {/* Info */}
                    <div className="ml-4 flex-1 min-w-0">
                      <motion.p
                        initial={{ x: -12, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.15 }}
                        className="text-white font-black text-xl leading-none font-mono"
                      >
                        +{reward.amount}
                      </motion.p>
                      <motion.p
                        initial={{ x: -12, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.25 }}
                        className="text-[10px] font-mono font-bold tracking-widest uppercase mt-1 text-gray-500"
                      >
                        {reward.label}
                      </motion.p>
                    </div>

                    {/* Rarity tag */}
                    {reward.type === 'ULT_ORB' && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.3, type: 'spring' }}
                        className="text-[8px] font-black font-mono px-2 py-0.5 rounded tracking-widest"
                        style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}
                      >
                        RARE
                      </motion.div>
                    )}
                    {(reward.type === 'SHADOW_SCROLL' || reward.type === 'HEALTH_POTION') && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.3, type: 'spring' }}
                        className="text-[8px] font-black font-mono px-2 py-0.5 rounded tracking-widest"
                        style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}
                      >
                        EPIC
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Continue Button */}
      <AnimatePresence>
        {allRevealed && (
          <motion.button
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            onClick={onClose}
            className="mt-8 w-full max-w-sm py-3.5 rounded-xl font-black text-sm tracking-widest uppercase font-mono flex items-center justify-center gap-2 transition-all active:scale-95"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.8)',
            }}
          >
            CONTINUE <ChevronRight size={16} strokeWidth={3} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Tap to skip text */}
      {!allRevealed && revealedCount > 0 && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          onClick={() => {
            setRevealedCount(rewards.length);
            setTimeout(() => setAllRevealed(true), 300);
          }}
          className="mt-6 text-[9px] font-mono text-gray-600 tracking-widest hover:text-gray-400 transition-colors"
        >
          TAP TO REVEAL ALL
        </motion.button>
      )}
    </motion.div>,
    document.body
  );
};

export default WorkoutRewardModal;
