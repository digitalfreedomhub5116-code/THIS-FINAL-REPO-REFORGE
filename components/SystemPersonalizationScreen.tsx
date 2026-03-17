
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SystemPersonalizationScreenProps {
  onComplete: () => void;
}

const LOADING_STATES = [
  "INITIALIZING SYSTEM...",
  "FORGING PROFILE...",
  "CALIBRATING STATS...",
  "SYNCING DATA...",
  "ALMOST READY..."
];

// Generate deterministic particles once
function generateParticles(count: number) {
  const particles = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 3,
      duration: 2 + Math.random() * 3,
      size: 1 + Math.random() * 2.5,
      drift: (Math.random() - 0.5) * 40,
    });
  }
  return particles;
}

const SystemPersonalizationScreen: React.FC<SystemPersonalizationScreenProps> = ({ onComplete }) => {
  const [textIndex, setTextIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const particles = useMemo(() => generateParticles(24), []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTextIndex((prev) => (prev + 1) % LOADING_STATES.length);
    }, 800);

    // Smooth progress
    const progressInterval = setInterval(() => {
      setProgress((p) => Math.min(p + 1.2, 100));
    }, 50);

    const completionTimer = setTimeout(() => {
      onComplete();
    }, 4200);

    return () => {
      clearInterval(interval);
      clearInterval(progressInterval);
      clearTimeout(completionTimer);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center font-mono overflow-hidden cursor-wait">

      {/* Deep radial background glow */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{ opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        style={{ background: 'radial-gradient(ellipse at 50% 45%, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.06) 35%, transparent 70%)' }}
      />

      {/* Floating ember particles */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            bottom: '-5%',
            background: `radial-gradient(circle, rgba(251,191,36,0.9), rgba(239,68,68,0.6))`,
            boxShadow: `0 0 ${p.size * 2}px rgba(251,191,36,0.4)`,
          }}
          animate={{
            y: [0, -window.innerHeight * 0.9],
            x: [0, p.drift],
            opacity: [0, 0.8, 0.6, 0],
            scale: [0.5, 1, 0.3],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeOut',
          }}
        />
      ))}

      {/* Main Sword Container */}
      <div className="relative flex items-center justify-center w-56 h-72 mb-8">

        {/* Outer pulsing energy ring */}
        <motion.div
          className="absolute rounded-full border"
          style={{
            width: 200, height: 200,
            borderColor: 'rgba(139,92,246,0.15)',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.1, 0.3] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Inner pulsing energy ring */}
        <motion.div
          className="absolute rounded-full border"
          style={{
            width: 130, height: 130,
            borderColor: 'rgba(99,102,241,0.2)',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
          animate={{ scale: [1, 1.08, 1], opacity: [0.4, 0.15, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
        />

        {/* Sword glow backdrop */}
        <motion.div
          className="absolute"
          style={{
            width: 60, height: 200,
            top: '50%', left: '50%',
            transform: 'translate(-50%, -55%)',
            background: 'linear-gradient(180deg, rgba(99,102,241,0.25) 0%, rgba(139,92,246,0.15) 50%, transparent 100%)',
            filter: 'blur(25px)',
            borderRadius: '50%',
          }}
          animate={{ opacity: [0.5, 0.9, 0.5], scaleY: [0.95, 1.05, 0.95] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />

        <svg viewBox="0 0 100 140" className="w-full h-full overflow-visible" style={{ filter: 'drop-shadow(0 0 8px rgba(99,102,241,0.4))' }}>
          <defs>
            {/* Blade metallic gradient */}
            <linearGradient id="bladeGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="30%" stopColor="#e2e8f0" />
              <stop offset="50%" stopColor="#ffffff" />
              <stop offset="70%" stopColor="#e2e8f0" />
              <stop offset="100%" stopColor="#94a3b8" />
            </linearGradient>
            {/* Blade edge glow */}
            <linearGradient id="edgeGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#818cf8" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#6366f1" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.3" />
            </linearGradient>
            {/* Guard gradient */}
            <linearGradient id="guardGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#78716c" />
              <stop offset="50%" stopColor="#d6d3d1" />
              <stop offset="100%" stopColor="#78716c" />
            </linearGradient>
            {/* Grip wrap */}
            <linearGradient id="gripGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#292524" />
              <stop offset="50%" stopColor="#44403c" />
              <stop offset="100%" stopColor="#292524" />
            </linearGradient>
            <filter id="swordGlow">
              <feGaussianBlur stdDeviation="1" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Sword drawn with path animation */}
          <motion.g filter="url(#swordGlow)">
            {/* Blade body */}
            <motion.path
              d="M 50 8 L 55.5 80 L 50 86 L 44.5 80 Z"
              fill="url(#bladeGrad)"
              initial={{ opacity: 0, scaleY: 0 }}
              animate={{ opacity: 1, scaleY: 1 }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              style={{ transformOrigin: '50px 86px' }}
            />
            {/* Blade edge highlight left */}
            <motion.path
              d="M 50 10 L 44.5 80 L 50 86"
              fill="none" stroke="url(#edgeGlow)" strokeWidth="0.6"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.8 }}
              transition={{ duration: 1.5, delay: 0.5 }}
            />
            {/* Blade edge highlight right */}
            <motion.path
              d="M 50 10 L 55.5 80 L 50 86"
              fill="none" stroke="url(#edgeGlow)" strokeWidth="0.6"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.8 }}
              transition={{ duration: 1.5, delay: 0.5 }}
            />
            {/* Fuller (blood groove) */}
            <motion.path
              d="M 50 20 L 50 75"
              stroke="rgba(100,116,139,0.5)" strokeWidth="1.5" fill="none" strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.2, delay: 0.8 }}
            />
            {/* Crossguard */}
            <motion.path
              d="M 33 80 L 67 80 L 65 85 L 50 89 L 35 85 Z"
              fill="url(#guardGrad)"
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ duration: 0.6, delay: 1.0, ease: 'easeOut' }}
              style={{ transformOrigin: '50px 84px' }}
            />
            {/* Guard center gem */}
            <motion.circle
              cx="50" cy="84" r="2"
              fill="#818cf8"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 1, 1], scale: [0, 1.3, 1] }}
              transition={{ duration: 0.5, delay: 1.4 }}
            />
            <motion.circle
              cx="50" cy="84" r="2"
              fill="none" stroke="rgba(129,140,248,0.5)" strokeWidth="0.5"
              animate={{ r: [2, 4, 2], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 1.6 }}
            />
            {/* Grip */}
            <motion.path
              d="M 47.5 89 L 47.5 105 Q 47.5 107.5 50 107.5 Q 52.5 107.5 52.5 105 L 52.5 89"
              fill="url(#gripGrad)" stroke="#57534e" strokeWidth="0.3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 1.2 }}
            />
            {/* Grip wrapping lines */}
            {[92, 95, 98, 101, 104].map((y, i) => (
              <motion.line
                key={y}
                x1="47.5" y1={y} x2="52.5" y2={y - 1}
                stroke="#78716c" strokeWidth="0.4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                transition={{ duration: 0.2, delay: 1.3 + i * 0.05 }}
              />
            ))}
            {/* Pommel */}
            <motion.ellipse
              cx="50" cy="110" rx="4" ry="2.5"
              fill="url(#guardGrad)" stroke="#78716c" strokeWidth="0.3"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 1.5 }}
            />
          </motion.g>

          {/* Animated energy pulse running up the blade */}
          <motion.rect
            x="49" y="0" width="2" height="8" rx="1"
            fill="rgba(129,140,248,0.6)"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: [80, 10, 80], opacity: [0, 0.8, 0] }}
            transition={{ duration: 2, repeat: Infinity, delay: 2, ease: 'easeInOut' }}
          />
        </svg>
      </div>

      {/* Cycling Text */}
      <div className="h-10 flex flex-col items-center justify-center relative w-full max-w-lg text-center px-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={textIndex}
            initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
            transition={{ duration: 0.25 }}
            className="text-sm text-white/60 font-medium tracking-[0.25em] font-mono uppercase"
          >
            {LOADING_STATES[textIndex]}
          </motion.div>
        </AnimatePresence>

        {/* Progress bar */}
        <div className="w-52 h-[2px] bg-white/5 rounded-full mt-5 overflow-hidden relative">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #6366f1, #818cf8, #a78bfa)',
              boxShadow: '0 0 12px rgba(99,102,241,0.5)',
            }}
          />
        </div>

        {/* Percentage */}
        <motion.div
          className="mt-2 text-[10px] text-white/20 font-mono tracking-[0.3em]"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {Math.round(progress)}%
        </motion.div>
      </div>

    </div>
  );
};

export default SystemPersonalizationScreen;
