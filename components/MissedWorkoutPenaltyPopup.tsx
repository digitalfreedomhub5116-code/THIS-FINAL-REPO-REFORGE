import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, TrendingDown, Skull } from 'lucide-react';
import { triggerHaptic } from '../utils/soundEngine';

interface MissedWorkoutPenaltyPopupProps {
  consecutiveDays: number;
  xpLost: number;
  onDismiss: () => void;
}

const TIER_MESSAGES: Record<number, { title: string; subtitle: string }> = {
  1: {
    title: 'PROTOCOL BREACH',
    subtitle: 'You missed yesterday\'s workout. The System has logged your absence.',
  },
  2: {
    title: 'DISCIPLINE FAILING',
    subtitle: '2 days missed in a row. Your stats are eroding.',
  },
  3: {
    title: 'CRITICAL DRIFT',
    subtitle: '3 days without training. The penalty grows.',
  },
};

const TIER_CAP_MESSAGE = {
  title: 'SYSTEM WARNING',
  subtitle: 'Your decline is accelerating. Maximum daily penalty applied.',
};

const MissedWorkoutPenaltyPopup: React.FC<MissedWorkoutPenaltyPopupProps> = ({
  consecutiveDays,
  xpLost,
  onDismiss,
}) => {
  const [phase, setPhase] = useState(0); // 0=enter, 1=warn, 2=count, 3=settled
  const [displayXp, setDisplayXp] = useState(0);

  const tierMsg = TIER_MESSAGES[consecutiveDays] ?? TIER_CAP_MESSAGE;

  // Phase timing
  useEffect(() => {
    triggerHaptic('WARNING');
    const t1 = setTimeout(() => setPhase(1), 300);
    const t2 = setTimeout(() => setPhase(2), 900);
    const t3 = setTimeout(() => setPhase(3), 2200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  // Count-up animation for the XP lost number
  useEffect(() => {
    if (phase < 2) return;
    const duration = 1100;
    const start = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayXp(Math.round(xpLost * eased));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [phase, xpLost]);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[9600] flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(10px)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Pulsing red ambient glow */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{
            background: [
              'radial-gradient(circle at 50% 40%, rgba(239,68,68,0.18) 0%, transparent 60%)',
              'radial-gradient(circle at 50% 40%, rgba(239,68,68,0.32) 0%, transparent 60%)',
              'radial-gradient(circle at 50% 40%, rgba(239,68,68,0.18) 0%, transparent 60%)',
            ],
          }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Diagonal scan lines */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, transparent 0, transparent 8px, rgba(239,68,68,0.08) 8px, rgba(239,68,68,0.08) 9px)',
          }}
        />

        <motion.div
          className="relative w-full max-w-[380px] mx-4 rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, #1a0606 0%, #0a0a14 100%)',
            border: '1px solid rgba(239,68,68,0.35)',
            boxShadow: '0 0 60px rgba(239,68,68,0.2), inset 0 1px 0 rgba(255,255,255,0.04)',
          }}
          initial={{ y: 60, opacity: 0, scale: 0.92 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 60, opacity: 0, scale: 0.92 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        >
          {/* Top accent bar with shimmer */}
          <motion.div
            style={{
              height: 3,
              background: 'linear-gradient(90deg, #DC2626, #EF4444, #DC2626)',
              backgroundSize: '200% 100%',
            }}
            animate={{ backgroundPosition: ['0% 0%', '200% 0%'] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          />

          {/* Header */}
          <div className="px-6 pt-6 pb-3 text-center relative">
            <motion.div
              className="mx-auto mb-3 w-14 h-14 rounded-full flex items-center justify-center"
              style={{
                background: 'rgba(239,68,68,0.12)',
                border: '1.5px solid rgba(239,68,68,0.4)',
              }}
              animate={
                phase >= 1
                  ? { scale: [1, 1.08, 1], boxShadow: ['0 0 0 rgba(239,68,68,0)', '0 0 24px rgba(239,68,68,0.5)', '0 0 0 rgba(239,68,68,0)'] }
                  : {}
              }
              transition={{ duration: 1.6, repeat: Infinity }}
            >
              <AlertTriangle size={26} className="text-red-400" strokeWidth={2.2} />
            </motion.div>

            <motion.h2
              className="text-base font-black text-red-400 tracking-[0.2em] font-mono"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              {tierMsg.title}
            </motion.h2>

            <motion.p
              className="text-[11px] text-gray-400 font-mono mt-2 leading-relaxed px-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {tierMsg.subtitle}
            </motion.p>
          </div>

          {/* Days streak indicator */}
          <div className="px-6 pb-3">
            <div
              className="flex items-center justify-between px-3 py-2 rounded-lg"
              style={{
                background: 'rgba(255,255,255,0.025)',
                border: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <span className="text-[10px] font-mono text-gray-500 tracking-wider uppercase">
                Consecutive misses
              </span>
              <div className="flex items-center gap-1.5">
                <Skull size={12} className="text-red-400" />
                <span className="text-sm font-black text-red-400 font-mono tabular-nums">
                  {consecutiveDays}
                </span>
                <span className="text-[10px] text-gray-500 font-mono">
                  {consecutiveDays === 1 ? 'day' : 'days'}
                </span>
              </div>
            </div>
          </div>

          {/* XP loss display */}
          <div className="px-6 pb-5">
            <div
              className="rounded-xl px-5 py-4 text-center relative overflow-hidden"
              style={{
                background:
                  'linear-gradient(135deg, rgba(239,68,68,0.12) 0%, rgba(127,29,29,0.18) 100%)',
                border: '1px solid rgba(239,68,68,0.25)',
              }}
            >
              <div className="flex items-center justify-center gap-2 mb-1">
                <TrendingDown size={14} className="text-red-400" />
                <span className="text-[9px] font-mono font-bold text-red-300 tracking-[0.25em] uppercase">
                  XP Penalty
                </span>
              </div>
              <motion.div
                className="font-black font-mono tabular-nums leading-none"
                style={{
                  fontSize: 44,
                  color: '#fca5a5',
                  textShadow: '0 0 22px rgba(239,68,68,0.55)',
                  letterSpacing: '-0.02em',
                }}
                animate={
                  phase >= 2
                    ? { scale: [1, 1.06, 1] }
                    : {}
                }
                transition={{ duration: 0.55 }}
              >
                -{displayXp}
              </motion.div>
              <div className="text-[10px] font-mono text-gray-500 mt-1">XP deducted from total</div>
            </div>
          </div>

          {/* Action button */}
          <div className="px-6 pb-6">
            <motion.button
              onClick={() => {
                triggerHaptic('TAB_SWITCH');
                onDismiss();
              }}
              className="w-full py-3 rounded-xl text-[11px] font-black font-mono tracking-[0.18em] uppercase transition-all active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #DC2626, #991B1B)',
                color: '#fff',
                boxShadow: '0 4px 18px rgba(220,38,38,0.35), inset 0 1px 0 rgba(255,255,255,0.1)',
              }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: phase >= 3 ? 1 : 0, y: phase >= 3 ? 0 : 8 }}
              transition={{ duration: 0.3 }}
            >
              I Will Do Better
            </motion.button>
            <p className="text-[9px] font-mono text-gray-600 text-center mt-3 leading-relaxed">
              Complete today's workout to reset the streak.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MissedWorkoutPenaltyPopup;
