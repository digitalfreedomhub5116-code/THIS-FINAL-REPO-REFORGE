import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Skull, Zap, ShieldAlert, Swords, Sparkles, Crown, Flame, ScrollText, X } from 'lucide-react';
import { playSystemSoundEffect } from '../utils/soundEngine';

interface AnimProps {
  onComplete: () => void;
}

/* ╔══════════════════════════════════════════════════════════════╗
   ║  1. CLASH INITIATION — Two swords crash, shockwave          ║
   ╚══════════════════════════════════════════════════════════════╝ */
export const ClashInitAnim: React.FC<AnimProps> = ({ onComplete }) => {
  useEffect(() => {
    playSystemSoundEffect('DANGER');
    try { navigator.vibrate?.([50, 30, 80]); } catch {}
    const timer = setTimeout(onComplete, 1500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 pointer-events-none overflow-hidden">
      {/* Shockwave ring */}
      <motion.div
        initial={{ scale: 0, opacity: 1 }}
        animate={{ scale: [0, 6], opacity: [1, 0] }}
        transition={{ duration: 1, ease: 'easeOut' }}
        className="absolute w-32 h-32 rounded-full border-4 border-red-500"
      />
      <motion.div
        initial={{ scale: 0, opacity: 0.5 }}
        animate={{ scale: [0, 8], opacity: [0.5, 0] }}
        transition={{ duration: 1.2, delay: 0.1, ease: 'easeOut' }}
        className="absolute w-24 h-24 rounded-full border-2 border-orange-400"
      />

      {/* Left Sword */}
      <motion.div
        initial={{ x: -200, rotate: -45, opacity: 0 }}
        animate={{ x: [null, 0], rotate: [null, 0], opacity: [0, 1] }}
        transition={{ duration: 0.4, ease: 'easeIn' }}
        className="absolute text-red-500"
      >
        <Swords size={80} strokeWidth={1.5} />
      </motion.div>

      {/* Impact flash */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: [0, 1, 0], scale: [0.5, 1.5, 2] }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="absolute w-40 h-40 bg-white rounded-full mix-blend-overlay"
      />

      {/* Text */}
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: [0, 1, 1, 0] }}
        transition={{ duration: 1.5, times: [0, 0.3, 0.7, 1] }}
        className="relative z-10 text-center"
      >
        <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-orange-400 to-red-600 uppercase tracking-[0.3em] drop-shadow-[0_0_30px_rgba(239,68,68,0.8)]">
          CLASH
        </h1>
      </motion.div>
    </div>
  );
};

/* ╔══════════════════════════════════════════════════════════════╗
   ║  2. CLASH VICTORY — Purple explosion, rank swap              ║
   ╚══════════════════════════════════════════════════════════════╝ */
interface VictoryAnimProps extends AnimProps {
  oldRank: number;
  newRank: number;
  targetName: string;
}

export const ClashVictoryAnim: React.FC<VictoryAnimProps> = ({ onComplete, oldRank, newRank, targetName }) => {
  useEffect(() => {
    playSystemSoundEffect('LEVEL_UP');
    try { navigator.vibrate?.([100, 50, 200]); } catch {}
    const timer = setTimeout(onComplete, 2500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/95 pointer-events-none overflow-hidden">
      {/* Particle burst */}
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
          animate={{
            x: (Math.random() - 0.5) * 600,
            y: (Math.random() - 0.5) * 600,
            opacity: [1, 0],
            scale: [0, 1],
          }}
          transition={{ duration: 1.5, delay: Math.random() * 0.3, ease: 'easeOut' }}
          className="absolute w-2 h-2 rounded-full"
          style={{ background: ['#a855f7', '#eab308', '#00d2ff', '#f97316'][i % 4] }}
        />
      ))}

      {/* Rank swap animation */}
      <motion.div
        initial={{ scale: 0.3, opacity: 0 }}
        animate={{ scale: [0.3, 1.2, 1], opacity: 1 }}
        transition={{ duration: 0.8, type: 'spring' }}
        className="relative z-10 flex items-center gap-6"
      >
        <motion.span
          initial={{ y: 0, opacity: 1 }}
          animate={{ y: [0, -40, 0], opacity: [1, 0.5, 1] }}
          transition={{ duration: 1, delay: 0.5 }}
          className="text-7xl font-black text-purple-400 drop-shadow-[0_0_20px_rgba(168,85,247,0.8)]"
        >
          #{newRank}
        </motion.span>
      </motion.div>

      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="relative z-10 text-center mt-6"
      >
        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-yellow-400 uppercase tracking-[0.2em]">
          VICTORY
        </h2>
        <p className="text-xs text-gray-400 font-mono mt-2 tracking-widest">
          RANK #{oldRank} → #{newRank} · {targetName} DETHRONED
        </p>
      </motion.div>

      {/* Streak flame badge */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1.2, type: 'spring' }}
        className="relative z-10 mt-4 flex items-center gap-1 text-orange-400"
      >
        <Flame size={14} />
        <span className="text-[10px] font-black font-mono tracking-widest uppercase">RANK SEIZED</span>
      </motion.div>
    </div>
  );
};

/* ╔══════════════════════════════════════════════════════════════╗
   ║  3. CLASH DEFEAT — Red slash, glitch out                    ║
   ╚══════════════════════════════════════════════════════════════╝ */
export const ClashDefeatAnim: React.FC<AnimProps & { targetName: string }> = ({ onComplete, targetName }) => {
  useEffect(() => {
    playSystemSoundEffect('DANGER');
    try { navigator.vibrate?.([100, 50, 100, 50, 200]); } catch {}
    const timer = setTimeout(onComplete, 2200);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center pointer-events-none overflow-hidden">
      {/* Background with blur and dark red vignette */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0.8] }}
        className="absolute inset-0"
        style={{ background: 'radial-gradient(circle at center, rgba(150, 0, 0, 0.1) 0%, rgba(30, 0, 0, 0.8) 100%)' }}
      />
      
      {/* Glitch slash effect */}
      <motion.div
        initial={{ x: '-150%', y: '-50%', opacity: 0, rotate: -25 }}
        animate={{ x: '150%', y: '50%', opacity: [0, 1, 1, 0] }}
        transition={{ duration: 0.5, ease: 'linear', delay: 0.1 }}
        className="absolute origin-center top-1/2 left-0 w-[200%] h-1 bg-red-500 shadow-[0_0_15px_rgba(239,68,68,1)]"
      />
      <motion.div
        initial={{ x: '150%', y: '50%', opacity: 0, rotate: -25 }}
        animate={{ x: '-150%', y: '-50%', opacity: [0, 1, 1, 0] }}
        transition={{ duration: 0.4, ease: 'linear', delay: 0.2 }}
        className="absolute origin-center top-1/2 left-0 w-[200%] h-[2px] bg-red-400 shadow-[0_0_10px_rgba(239,68,68,1)]"
      />

      <motion.div
        initial={{ scale: 2, opacity: 0, filter: 'blur(10px)' }}
        animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
        transition={{ duration: 0.4, type: 'spring', bounce: 0.4 }}
        className="relative z-10 text-center flex flex-col items-center justify-center w-full"
      >
        <motion.div
          animate={{ x: [-5, 5, -4, 4, -2, 2, 0], y: [-2, 2, -1, 1, 0] }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Skull size={70} className="text-red-500 mb-6 drop-shadow-[0_0_20px_rgba(239,68,68,0.8)]" />
        </motion.div>
        
        <h2 
          className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-red-400 to-red-600 uppercase tracking-[0.2em] md:tracking-[0.3em] ml-2"
          style={{ WebkitTextStroke: '2px rgba(100,0,0,0.5)', filter: 'drop-shadow(0px 4px 15px rgba(220, 38, 38, 0.4))' }}
        >
          DEFEATED
        </h2>
        
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, type: 'spring' }}
          className="mt-6 px-6 py-2 rounded-full border border-red-500/30 bg-red-950/60 backdrop-blur-sm"
        >
          <p className="text-xs text-red-400 font-mono tracking-widest font-bold">
            {targetName}&apos;S DEFENSES HELD
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

/* ╔══════════════════════════════════════════════════════════════╗
   ║  4. EXTRACTION ROLL — Spinning rune circle with % counter    ║
   ╚══════════════════════════════════════════════════════════════╝ */
interface ExtractionRollProps {
  extractionRate: number;
  onResult: (success: boolean) => void;
}

export const ExtractionRollAnim: React.FC<ExtractionRollProps> = ({ extractionRate, onResult }) => {
  const [phase, setPhase] = useState<'SPINNING' | 'RESULT'>('SPINNING');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    playSystemSoundEffect('SYSTEM');
    const roll = Math.random() * 100;
    const isSuccess = roll < extractionRate;

    const timer = setTimeout(() => {
      setSuccess(isSuccess);
      setPhase('RESULT');
      setTimeout(() => onResult(isSuccess), 1200);
    }, 2500);
    return () => clearTimeout(timer);
  }, [extractionRate, onResult]);

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/95 pointer-events-auto overflow-hidden">
      {/* Spinning rune circle */}
      <div className="relative w-64 h-64 flex items-center justify-center">
        <motion.div
          animate={{ rotate: phase === 'SPINNING' ? 360 * 5 : 0 }}
          transition={{ duration: phase === 'SPINNING' ? 2.5 : 0.5, ease: phase === 'SPINNING' ? 'linear' : 'easeOut' }}
          className="absolute inset-0"
        >
          {/* Outer ring */}
          <div className="absolute inset-0 rounded-full border-2 border-dashed border-purple-500/40" />
          {/* Inner ring */}
          <div className="absolute inset-4 rounded-full border border-purple-400/30" />
          {/* Rune dots */}
          {Array.from({ length: 12 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-purple-500"
              style={{
                top: `${50 + 45 * Math.sin((i * 30 * Math.PI) / 180)}%`,
                left: `${50 + 45 * Math.cos((i * 30 * Math.PI) / 180)}%`,
                transform: 'translate(-50%, -50%)',
              }}
              animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
              transition={{ duration: 1, delay: i * 0.08, repeat: Infinity }}
            />
          ))}
        </motion.div>

        {/* Center percentage */}
        <motion.div
          animate={phase === 'RESULT' ? { scale: [1, 1.3, 1] } : { scale: [0.95, 1.05, 0.95] }}
          transition={{ duration: phase === 'RESULT' ? 0.4 : 1, repeat: phase === 'RESULT' ? 0 : Infinity }}
          className="relative z-10 text-center"
        >
          {phase === 'SPINNING' ? (
            <>
              <div className="text-5xl font-black text-purple-400 drop-shadow-[0_0_15px_rgba(168,85,247,0.8)]">
                {extractionRate}%
              </div>
              <div className="text-[10px] text-purple-300/60 font-mono tracking-widest mt-1">CALCULATING...</div>
            </>
          ) : (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300 }}>
              {success ? (
                <Sparkles size={48} className="text-yellow-400 mx-auto drop-shadow-[0_0_20px_rgba(234,179,8,0.8)]" />
              ) : (
                <Flame size={48} className="text-red-500 mx-auto drop-shadow-[0_0_20px_rgba(239,68,68,0.8)]" />
              )}
              <div className={`text-lg font-black mt-2 tracking-widest ${success ? 'text-yellow-400' : 'text-red-500'}`}>
                {success ? 'SUCCESS' : 'FAILED'}
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

/* ╔══════════════════════════════════════════════════════════════╗
   ║  5. ARISE — Full-screen shadow rising, purple storm          ║
   ╚══════════════════════════════════════════════════════════════╝ */
export const AriseAnim: React.FC<AnimProps & { shadowName: string }> = ({ onComplete, shadowName }) => {
  useEffect(() => {
    playSystemSoundEffect('LEVEL_UP');
    try { navigator.vibrate?.([50, 100, 50, 100, 300]); } catch {}
    const timer = setTimeout(onComplete, 3500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black pointer-events-none overflow-hidden">
      {/* Purple particle storm */}
      {Array.from({ length: 40 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ y: '100vh', x: (Math.random() - 0.5) * 400, opacity: 0 }}
          animate={{ y: '-20vh', opacity: [0, 1, 1, 0] }}
          transition={{
            duration: 2 + Math.random(),
            delay: Math.random() * 1.5,
            ease: 'easeOut',
          }}
          className="absolute w-1 h-8 rounded-full"
          style={{
            background: `linear-gradient(to top, transparent, ${['#a855f7', '#7c3aed', '#6d28d9', '#c084fc'][i % 4]})`,
            filter: 'blur(1px)',
          }}
        />
      ))}

      {/* Shadow silhouette rising */}
      <motion.div
        initial={{ y: 200, opacity: 0, scale: 0.5 }}
        animate={{ y: [200, 0, -20], opacity: [0, 1, 1], scale: [0.5, 1, 1.05] }}
        transition={{ duration: 2, times: [0, 0.6, 1], ease: 'easeOut' }}
        className="relative z-10"
      >
        <Skull size={120} className="text-purple-500 drop-shadow-[0_0_40px_rgba(168,85,247,0.9)]" />
        {/* Aura rings */}
        <motion.div
          animate={{ scale: [1, 2, 3], opacity: [0.5, 0.2, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 rounded-full border-2 border-purple-500/50"
          style={{ margin: '-20px' }}
        />
      </motion.div>

      {/* "ARISE" text */}
      <motion.h1
        initial={{ y: 60, opacity: 0, letterSpacing: '0.1em' }}
        animate={{ y: 0, opacity: 1, letterSpacing: ['0.1em', '0.6em', '0.3em'] }}
        transition={{ duration: 2, delay: 0.8 }}
        className="relative z-10 text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-purple-300 via-purple-500 to-purple-900 uppercase mt-6 drop-shadow-[0_0_30px_rgba(168,85,247,0.6)]"
      >
        ARISE
      </motion.h1>

      {/* Shadow name */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="relative z-10 text-xs text-purple-300/70 font-mono tracking-[0.3em] mt-4 uppercase"
      >
        {shadowName} JOINS YOUR ARMY
      </motion.p>
    </div>
  );
};

/* ╔══════════════════════════════════════════════════════════════╗
   ║  6. SCROLL BURN — Scroll ignites and crumbles                ║
   ╚══════════════════════════════════════════════════════════════╝ */
export const ScrollBurnAnim: React.FC<AnimProps & { scrollsRemaining: number }> = ({ onComplete, scrollsRemaining }) => {
  useEffect(() => {
    playSystemSoundEffect('DANGER');
    try { navigator.vibrate?.(100); } catch {}
    const timer = setTimeout(onComplete, 2000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/90 pointer-events-none overflow-hidden">
      {/* Fire particles */}
      {Array.from({ length: 15 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ y: 0, x: (Math.random() - 0.5) * 60, opacity: 1, scale: 1 }}
          animate={{
            y: -(100 + Math.random() * 200),
            x: (Math.random() - 0.5) * 120,
            opacity: [1, 0.8, 0],
            scale: [1, 0.5, 0],
          }}
          transition={{ duration: 1 + Math.random(), delay: Math.random() * 0.5 }}
          className="absolute w-3 h-3 rounded-full"
          style={{ background: ['#f97316', '#ef4444', '#eab308', '#dc2626'][i % 4] }}
        />
      ))}

      <motion.div
        initial={{ scale: 1, opacity: 1, rotate: 0 }}
        animate={{
          scale: [1, 1.1, 0.3, 0],
          opacity: [1, 1, 0.5, 0],
          rotate: [0, -5, 10, 20],
        }}
        transition={{ duration: 1.5 }}
        className="relative z-10"
      >
        <ScrollText size={80} className="text-cyan-400 drop-shadow-[0_0_20px_rgba(0,210,255,0.5)]" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="relative z-10 text-center mt-6"
      >
        <h2 className="text-2xl font-black text-red-500 uppercase tracking-widest">
          SCROLL DESTROYED
        </h2>
        <p className="text-[10px] text-gray-500 font-mono mt-2">
          Shadow Scrolls Remaining: {scrollsRemaining}
        </p>
      </motion.div>
    </div>
  );
};

/* ╔══════════════════════════════════════════════════════════════╗
   ║  7. FORTIFY SHIELD — Hexagonal shield assembles              ║
   ╚══════════════════════════════════════════════════════════════╝ */
export const FortifyShieldAnim: React.FC<AnimProps> = ({ onComplete }) => {
  useEffect(() => {
    playSystemSoundEffect('PURCHASE');
    try { navigator.vibrate?.([30, 50, 30]); } catch {}
    const timer = setTimeout(onComplete, 2200);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-green-950/30 backdrop-blur-sm pointer-events-none overflow-hidden">
      {/* Hex shield segments */}
      {Array.from({ length: 6 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ scale: 0, opacity: 0, rotate: i * 60 }}
          animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 0.7] }}
          transition={{ duration: 0.6, delay: i * 0.1, type: 'spring' }}
          className="absolute"
          style={{
            width: 120,
            height: 120,
            top: '50%',
            left: '50%',
            transform: `translate(-50%, -50%) rotate(${i * 60}deg) translateY(-80px)`,
          }}
        >
          <div className="w-full h-full border-2 border-green-400/40 bg-green-500/5 rounded-lg"
            style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
          />
        </motion.div>
      ))}

      {/* Center icon */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.3, 1], opacity: 1 }}
        transition={{ delay: 0.6, type: 'spring' }}
        className="relative z-10"
      >
        <ShieldAlert size={80} className="text-green-400 drop-shadow-[0_0_30px_rgba(74,222,128,0.8)]" />
      </motion.div>

      {/* Expanding ring */}
      <motion.div
        initial={{ scale: 0.5, opacity: 1 }}
        animate={{ scale: [0.5, 3], opacity: [1, 0] }}
        transition={{ duration: 1.5, delay: 0.8 }}
        className="absolute w-40 h-40 rounded-full border-4 border-green-400"
      />

      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1 }}
        className="relative z-10 text-center mt-24"
      >
        <h2 className="text-3xl font-black text-green-400 uppercase tracking-[0.2em] drop-shadow-[0_0_15px_rgba(74,222,128,0.7)]">
          FORTIFIED
        </h2>
        <p className="text-green-300/50 font-mono text-[10px] tracking-widest mt-1">
          SHIELD ACTIVE · 12 HOURS
        </p>
      </motion.div>
    </div>
  );
};

/* ╔══════════════════════════════════════════════════════════════╗
   ║  8. MONARCH CROWN — Crown descends with golden particles     ║
   ╚══════════════════════════════════════════════════════════════╝ */
export const MonarchCrownAnim: React.FC<AnimProps> = ({ onComplete }) => {
  useEffect(() => {
    playSystemSoundEffect('LEVEL_UP');
    try { navigator.vibrate?.([100, 100, 100, 100, 400]); } catch {}
    const timer = setTimeout(onComplete, 3000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/95 pointer-events-none overflow-hidden">
      {/* Golden particle rain */}
      {Array.from({ length: 30 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ y: -50, x: (Math.random() - 0.5) * 400, opacity: 0 }}
          animate={{ y: '110vh', opacity: [0, 1, 1, 0] }}
          transition={{
            duration: 2 + Math.random() * 2,
            delay: Math.random() * 2,
            ease: 'linear',
          }}
          className="absolute w-1.5 h-1.5 rounded-full"
          style={{ background: ['#eab308', '#fbbf24', '#f59e0b', '#fcd34d'][i % 4] }}
        />
      ))}

      {/* Crown descending */}
      <motion.div
        initial={{ y: -200, opacity: 0, scale: 0.5 }}
        animate={{ y: [null, 0], opacity: [0, 1], scale: [0.5, 1] }}
        transition={{ duration: 1.5, type: 'spring', stiffness: 60, damping: 12 }}
        className="relative z-10"
      >
        <Crown size={100} className="text-yellow-500 drop-shadow-[0_0_40px_rgba(234,179,8,0.9)]" />
        {/* Crown glow pulse */}
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 rounded-full bg-yellow-500/20 blur-2xl"
          style={{ margin: '-30px' }}
        />
      </motion.div>

      <motion.h1
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1, type: 'spring' }}
        className="relative z-10 text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 uppercase tracking-[0.3em] mt-8"
      >
        SHADOW MONARCH
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="relative z-10 text-[10px] text-yellow-400/60 font-mono tracking-widest mt-3"
      >
        YOU CLAIMED THE THRONE · REWARD: GOLD + KEY
      </motion.p>
    </div>
  );
};

/* ╔══════════════════════════════════════════════════════════════╗
   ║  POWER SURGE OVERLAY — Red alert banner                      ║
   ╚══════════════════════════════════════════════════════════════╝ */
export const PowerSurgeBanner: React.FC<{ expiresAt: number }> = ({ expiresAt }) => {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const update = () => {
      const ms = Math.max(0, expiresAt - Date.now());
      setRemaining(ms);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (remaining <= 0) return null;
  const mins = Math.floor(remaining / 60_000);
  const secs = Math.floor((remaining % 60_000) / 1000);

  return (
    <motion.div
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -50, opacity: 0 }}
      className="relative overflow-hidden rounded-xl border border-red-500/30 p-3 flex items-center justify-between"
      style={{
        background: 'linear-gradient(90deg, rgba(239,68,68,0.1), rgba(234,179,8,0.08), rgba(239,68,68,0.1))',
      }}
    >
      <motion.div
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1, repeat: Infinity }}
        className="absolute inset-0 bg-gradient-to-r from-red-500/5 via-yellow-500/10 to-red-500/5"
      />
      <div className="flex items-center gap-2 relative z-10">
        <Zap size={14} className="text-yellow-400" />
        <span className="text-[10px] font-black font-mono text-yellow-400 tracking-widest uppercase">
          POWER SURGE — 2× EXTRACTION
        </span>
      </div>
      <span className="text-xs font-black font-mono text-red-400 relative z-10">
        {mins}:{secs.toString().padStart(2, '0')}
      </span>
    </motion.div>
  );
};
