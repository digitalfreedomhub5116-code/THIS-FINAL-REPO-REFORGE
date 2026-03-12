import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LevelUpCinematicProps {
  level: number;
  onComplete: () => void;
}

const LevelUpCinematic: React.FC<LevelUpCinematicProps> = ({ level, onComplete }) => {
  const [phase, setPhase] = useState<'crush' | 'shockwave' | 'rise' | 'label'>('crush');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('shockwave'), 600);
    const t2 = setTimeout(() => setPhase('rise'), 800);
    const t3 = setTimeout(() => setPhase('label'), 1200);
    const t4 = setTimeout(() => onComplete(), 3500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.4 } }}
      className="fixed inset-0 z-[300] flex flex-col items-center justify-center overflow-hidden"
      style={{ background: 'rgba(0,0,0,0.97)' }}
    >
      {/* Subtle purple grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(139,92,246,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.04) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Center stage */}
      <div className="relative flex flex-col items-center justify-center z-10">

        {/* Shockwave ring */}
        <AnimatePresence>
          {phase === 'shockwave' && (
            <motion.div
              key="shockwave"
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: 6, opacity: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="absolute w-24 h-24 rounded-full border-2 border-[#8b5cf6] pointer-events-none"
            />
          )}
        </AnimatePresence>

        {/* Old number — crushes to nothing */}
        <AnimatePresence>
          {phase === 'crush' && (
            <motion.div
              key="old-level"
              initial={{ scaleY: 1, opacity: 1 }}
              animate={{ scaleY: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30, duration: 0.6 }}
              className="absolute text-[10rem] font-black text-white leading-none select-none"
              style={{ fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}
            >
              {level - 1}
            </motion.div>
          )}
        </AnimatePresence>

        {/* New level number — rises with overshoot */}
        <AnimatePresence>
          {(phase === 'rise' || phase === 'label') && (
            <motion.div
              key="new-level"
              initial={{ y: 60, scale: 0.5, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 18 }}
              className="text-[10rem] font-black leading-none select-none"
              style={{
                background: 'linear-gradient(180deg, #ffffff 0%, #8b5cf6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                textShadow: 'none',
                filter: 'drop-shadow(0 0 30px rgba(139,92,246,0.6)) drop-shadow(0 0 60px rgba(0,210,255,0.3))',
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 1,
              }}
            >
              {level}
            </motion.div>
          )}
        </AnimatePresence>

        {/* "LEVEL X" label — letter stagger */}
        <AnimatePresence>
          {phase === 'label' && (
            <motion.div
              key="label"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="mt-4 flex flex-col items-center gap-2"
            >
              <div
                className="text-xs font-mono font-black tracking-[0.5em] uppercase"
                style={{ color: '#00d2ff', letterSpacing: '0.5em' }}
              >
                LEVEL&nbsp;{level}&nbsp;ACHIEVED
              </div>
              <div className="text-[10px] font-mono text-white/30 tracking-[0.3em]">
                LIMITS TRANSCENDED
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </motion.div>
  );
};

export default LevelUpCinematic;
