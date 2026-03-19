import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';

interface SwordLoaderProps {
  onComplete: () => void;
}

const SwordLoader: React.FC<SwordLoaderProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);
  const [statusText, setStatusText] = useState('INITIALIZING...');

  const embers = useMemo(() =>
    Array.from({ length: 14 }, (_, i) => ({
      id: i,
      left: `${5 + Math.random() * 90}%`,
      delay: Math.random() * 4,
      duration: 3 + Math.random() * 5,
      size: 1.5 + Math.random() * 2.5,
      drift: (Math.random() - 0.5) * 80,
      color: i % 3 === 0 ? '#f59e0b' : i % 3 === 1 ? '#ef4444' : '#fb923c',
    })), []);

  useEffect(() => {
    let current = 0;
    const interval = setInterval(() => {
      const inc = 1.2 + Math.random() * 2.5;
      current = Math.min(current + inc, 100);
      setProgress(current);

      if (current < 30) setStatusText('INITIALIZING...');
      else if (current < 60) setStatusText('LOADING ASSETS...');
      else if (current < 85) setStatusText('ALMOST READY...');
      else setStatusText('READY');

      if (current >= 100) {
        clearInterval(interval);
        setTimeout(() => setFadeOut(true), 300);
        setTimeout(onComplete, 800);
      }
    }, 60);
    return () => clearInterval(interval);
  }, [onComplete]);

  const STROKE = '#d4d4d8';

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center select-none overflow-hidden"
      style={{ background: '#000000' }}
      animate={{ opacity: fadeOut ? 0 : 1 }}
      transition={{ duration: 0.5, ease: 'easeInOut' }}
    >
      {/* Ambient radial glow behind sword */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 400, height: 400,
          top: '50%', left: '50%',
          transform: 'translate(-50%, -60%)',
          background: 'radial-gradient(circle, rgba(200,210,255,0.08) 0%, rgba(100,140,255,0.03) 40%, transparent 70%)',
        }}
      />

      {/* Floating ember particles */}
      {embers.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: p.left, bottom: '8%',
            width: p.size, height: p.size,
            background: p.color,
            boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
          }}
          animate={{
            y: [0, -(250 + Math.random() * 300)],
            x: [0, p.drift],
            opacity: [0.8, 0],
          }}
          transition={{
            duration: p.duration, delay: p.delay,
            repeat: Infinity, ease: 'easeOut',
          }}
        />
      ))}

      {/* Spinning circle — right side, behind sword */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          width: 220, height: 220,
          top: '50%', left: '50%',
          transform: 'translate(-10%, -55%)',
          border: '1px solid rgba(120,130,160,0.15)',
          borderRadius: '50%',
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
      />

      {/* Sword SVG with glow */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        style={{ filter: 'drop-shadow(0 0 30px rgba(200,210,255,0.25)) drop-shadow(0 0 60px rgba(140,160,255,0.1))' }}
      >
        <svg
          viewBox="0 0 120 310"
          width="105"
          height="272"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ display: 'block' }}
        >
          {/* Blade glow fill */}
          <defs>
            <linearGradient id="bladeGlow" x1="60" y1="7" x2="60" y2="198" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
              <stop offset="40%" stopColor="#c7d2fe" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.2" />
            </linearGradient>
            <linearGradient id="bladeFill" x1="60" y1="7" x2="60" y2="198" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#e0e7ff" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#a5b4fc" stopOpacity="0.3" />
            </linearGradient>
          </defs>

          {/* Blade filled shape */}
          <motion.path
            d="M 60 7 C 61 55 64.5 140 65.5 192 C 64.5 196 62.5 198 60 198 C 57.5 198 55.5 196 54.5 192 C 55.5 140 59 55 60 7 Z"
            fill="url(#bladeFill)"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ duration: 1.2 }}
          />
          {/* Blade edges */}
          <motion.path
            d="M 60 7 C 61 55 64.5 140 65.5 192"
            stroke={STROKE} strokeWidth="1.2" strokeLinecap="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
            transition={{ duration: 1.0, ease: [0.4, 0, 0.2, 1] }}
          />
          <motion.path
            d="M 60 7 C 59 55 55.5 140 54.5 192"
            stroke={STROKE} strokeWidth="1.2" strokeLinecap="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
            transition={{ duration: 1.0, ease: [0.4, 0, 0.2, 1] }}
          />
          {/* Centre ridge */}
          <motion.line
            x1="60" y1="20" x2="60" y2="185"
            stroke="#ffffff" strokeWidth="0.6" strokeOpacity="0.5" strokeLinecap="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
            transition={{ duration: 0.9, delay: 0.2 }}
          />
          {/* Tip glow */}
          <motion.circle
            cx="60" cy="7" r="6"
            fill="#ffffff"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.9, 0.5] }}
            transition={{ delay: 0.8, duration: 0.5 }}
            style={{ filter: 'blur(3px)' }}
          />

          {/* Guard — filled with metallic look */}
          <motion.path
            d="M 17 201 C 22 195 38 193 54 193 C 56 193 58 192 60 192 C 62 192 64 193 66 193 C 82 193 98 195 103 201 C 98 208 82 210 66 210 C 64 211 62 212 60 212 C 58 212 56 211 54 210 C 38 210 22 208 17 201 Z"
            fill="rgba(180,180,200,0.25)"
            stroke={STROKE} strokeWidth="1.4" strokeLinejoin="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
            transition={{ duration: 0.4, delay: 1.0 }}
          />
          <motion.path
            d="M 24 197 C 38 195 54 194 60 194 C 66 194 82 195 96 197"
            stroke="#ffffff" strokeWidth="0.5" strokeOpacity="0.3" strokeLinecap="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
            transition={{ duration: 0.3, delay: 1.35 }}
          />

          {/* Pommel gem — blue glow */}
          <motion.circle
            cx="60" cy="202" r="4"
            fill="#6366f1"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 1.3, duration: 0.3 }}
            style={{ filter: 'blur(0.5px)' }}
          />
          <motion.circle
            cx="60" cy="202" r="8"
            fill="none"
            stroke="#6366f1"
            strokeWidth="0.5"
            strokeOpacity="0.4"
            initial={{ opacity: 0 }} animate={{ opacity: [0, 0.6, 0.3] }}
            transition={{ delay: 1.4, duration: 1, repeat: Infinity, repeatType: 'reverse' }}
          />

          {/* Grip */}
          <motion.line x1="55" y1="214" x2="55.5" y2="268" stroke={STROKE} strokeWidth="1.4" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.35, delay: 1.4 }} />
          <motion.line x1="65" y1="214" x2="64.5" y2="268" stroke={STROKE} strokeWidth="1.4" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.35, delay: 1.4 }} />
          {/* Grip wrap */}
          <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.55, duration: 0.2 }}>
            {[218, 226, 234, 242, 250, 258].map((y, i) => (
              <line key={y} x1="55" y1={y} x2="65" y2={y + (i % 2 === 0 ? 2 : -2)}
                stroke={STROKE} strokeWidth="0.8" strokeOpacity="0.35" />
            ))}
          </motion.g>
          {/* Grip bottom */}
          <motion.path
            d="M 55.5 268 Q 56 274 60 274 Q 64 274 64.5 268"
            stroke={STROKE} strokeWidth="1.2" strokeLinecap="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
            transition={{ duration: 0.15, delay: 1.75 }}
          />

          {/* Pommel glow */}
          <motion.circle
            cx="60" cy="282" r="10"
            fill="none" stroke="rgba(200,200,220,0.15)" strokeWidth="1"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
            transition={{ duration: 0.3, delay: 1.8 }}
          />
          <motion.circle
            cx="60" cy="282" r="2"
            fill="rgba(200,210,255,0.5)"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 1.9 }}
          />
        </svg>
      </motion.div>

      {/* Status text */}
      <motion.div
        className="mt-16 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        <div
          className="text-sm font-mono font-bold tracking-[0.35em] uppercase"
          style={{ color: 'rgba(255,255,255,0.7)' }}
        >
          {statusText}
        </div>
        <div
          className="text-xs font-mono mt-3 tabular-nums"
          style={{ color: 'rgba(255,255,255,0.3)' }}
        >
          {Math.round(progress)}%
        </div>
      </motion.div>
    </motion.div>
  );
};

export default SwordLoader;
