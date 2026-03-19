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

const REWARD_CONFIG: Record<string, { icon: React.ReactNode; color: string; glow: string; bg: string }> = {
  XP: {
    icon: <Zap size={40} fill="currentColor" />,
    color: 'text-cyan-400',
    glow: 'shadow-[0_0_60px_rgba(0,210,255,0.6)]',
    bg: 'from-cyan-500/20 to-cyan-900/10',
  },
  GOLD: {
    icon: <Coins size={40} fill="currentColor" />,
    color: 'text-yellow-400',
    glow: 'shadow-[0_0_60px_rgba(234,179,8,0.6)]',
    bg: 'from-yellow-500/20 to-yellow-900/10',
  },
  KEYS: {
    icon: <Key size={40} />,
    color: 'text-amber-300',
    glow: 'shadow-[0_0_60px_rgba(251,191,36,0.6)]',
    bg: 'from-amber-500/20 to-amber-900/10',
  },
  HEALTH_POTION: {
    icon: <Heart size={40} fill="currentColor" />,
    color: 'text-rose-400',
    glow: 'shadow-[0_0_60px_rgba(244,63,94,0.6)]',
    bg: 'from-rose-500/20 to-rose-900/10',
  },
  SHADOW_SCROLL: {
    icon: <ScrollText size={40} />,
    color: 'text-purple-400',
    glow: 'shadow-[0_0_60px_rgba(168,85,247,0.6)]',
    bg: 'from-purple-500/20 to-purple-900/10',
  },
  ULT_ORB: {
    icon: <Sparkles size={40} fill="currentColor" />,
    color: 'text-emerald-300',
    glow: 'shadow-[0_0_80px_rgba(52,211,153,0.8)]',
    bg: 'from-emerald-500/30 to-emerald-900/10',
  },
};

// Particle burst component for each reward reveal
const ParticleBurst: React.FC<{ color: string }> = ({ color }) => {
  const particles = Array.from({ length: 12 });
  return (
    <div className="absolute inset-0 pointer-events-none">
      {particles.map((_, i) => {
        const angle = (i / 12) * 360;
        const rad = (angle * Math.PI) / 180;
        const dist = 60 + Math.random() * 40;
        return (
          <motion.div
            key={i}
            className={`absolute w-1.5 h-1.5 rounded-full ${color}`}
            style={{ left: '50%', top: '50%' }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{
              x: Math.cos(rad) * dist,
              y: Math.sin(rad) * dist,
              opacity: 0,
              scale: 0,
            }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: Math.random() * 0.2 }}
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
      className="fixed inset-0 z-[150] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-6"
    >
      {/* Title */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mb-10 text-center"
      >
        <h1 className="text-3xl font-black italic text-white tracking-tight uppercase">
          Session Complete
        </h1>
        <p className="text-xs font-mono text-gray-500 mt-1 tracking-widest">LOOT ACQUIRED</p>
      </motion.div>

      {/* Reward Slots */}
      <div className="flex flex-col gap-6 w-full max-w-sm">
        {rewards.map((reward, idx) => {
          const config = REWARD_CONFIG[reward.type] || REWARD_CONFIG.XP;
          const isRevealed = idx < revealedCount;

          return (
            <div key={idx} className="relative h-24 w-full">
              <AnimatePresence mode="wait">
                {!isRevealed ? (
                  // Unrevealed slot — mystery card
                  <motion.div
                    key="mystery"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.2, rotateY: 90 }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 bg-gray-900/80 border border-gray-700/50 rounded-2xl flex items-center justify-center backdrop-blur"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-800 border border-gray-600 animate-pulse" />
                      <div className="space-y-1.5">
                        <div className="w-24 h-3 bg-gray-800 rounded animate-pulse" />
                        <div className="w-16 h-2 bg-gray-800/60 rounded animate-pulse" />
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  // Revealed reward — with particles and glow
                  <motion.div
                    key="revealed"
                    initial={{ opacity: 0, scale: 0.3, rotateY: -90 }}
                    animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                    className={`absolute inset-0 bg-gradient-to-r ${config.bg} border border-white/10 rounded-2xl flex items-center px-6 ${config.glow} backdrop-blur`}
                  >
                    <ParticleBurst color={config.color.replace('text-', 'bg-')} />
                    
                    {/* Icon */}
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 10, delay: 0.15 }}
                      className={`w-14 h-14 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center ${config.color} flex-shrink-0`}
                    >
                      {config.icon}
                    </motion.div>

                    {/* Info */}
                    <div className="ml-4 flex-1 min-w-0">
                      <motion.p
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-white font-black text-2xl leading-none"
                      >
                        +{reward.amount}
                      </motion.p>
                      <motion.p
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className={`text-xs font-mono font-bold tracking-wider uppercase mt-1 ${config.color}`}
                      >
                        {reward.label}
                      </motion.p>
                    </div>

                    {/* Rarity indicator for rare items */}
                    {reward.type === 'ULT_ORB' && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.4, type: 'spring' }}
                        className="absolute -top-2 -right-2 bg-emerald-500 text-black text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg"
                      >
                        RARE
                      </motion.div>
                    )}
                    {(reward.type === 'SHADOW_SCROLL' || reward.type === 'HEALTH_POTION') && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.4, type: 'spring' }}
                        className="absolute -top-2 -right-2 bg-purple-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg"
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
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            onClick={onClose}
            className="mt-10 px-8 py-4 bg-white text-black font-black text-sm rounded-xl flex items-center gap-2 shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:bg-gray-200 transition-all active:scale-95 tracking-wider"
          >
            CONTINUE <ChevronRight size={18} strokeWidth={3} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Tap to skip text */}
      {!allRevealed && revealedCount > 0 && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          onClick={() => {
            setRevealedCount(rewards.length);
            setTimeout(() => setAllRevealed(true), 300);
          }}
          className="mt-8 text-[10px] font-mono text-gray-600 tracking-widest hover:text-gray-400 transition-colors"
        >
          TAP TO REVEAL ALL
        </motion.button>
      )}
    </motion.div>,
    document.body
  );
};

export default WorkoutRewardModal;
