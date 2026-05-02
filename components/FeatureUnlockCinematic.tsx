import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Store, Utensils, Trophy, Sparkles, Unlock } from 'lucide-react';
import { playSystemSoundEffect } from '../utils/soundEngine';

interface FeatureUnlockConfig {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  color: string;
  glow: string;
}

const UNLOCK_CONFIGS: Record<number, FeatureUnlockConfig[]> = {
  5: [
    { icon: <Store size={32} />, title: 'ARMORY & STORE', subtitle: 'New Store content is now available.', color: '#33dfff', glow: 'rgba(192,132,252,0.6)' },
    { icon: <Utensils size={32} />, title: 'NUTRITION SCANNER', subtitle: 'Nutrition tools are now available in Health → Nutrition.', color: '#00d4ff', glow: 'rgba(34,211,238,0.6)' },
    { icon: <Sparkles size={32} />, title: 'AI PROTOCOL GENERATOR', subtitle: 'Generate custom workout plans.', color: '#33dfff', glow: 'rgba(167,139,250,0.6)' },
  ],
  10: [
    { icon: <Trophy size={32} />, title: 'HUNTER RANKINGS', subtitle: 'Climb higher and earn bigger rank rewards.', color: '#fbbf24', glow: 'rgba(251,191,36,0.6)' },
  ],
};

interface FeatureUnlockCinematicProps {
  level: number;
  onComplete: () => void;
}

type Phase = 'alert' | 'features' | 'dismiss';

const FeatureUnlockCinematic: React.FC<FeatureUnlockCinematicProps> = ({ level, onComplete }) => {
  const [phase, setPhase] = useState<Phase>('alert');
  const [featureIndex, setFeatureIndex] = useState(0);
  const features = UNLOCK_CONFIGS[level] || [];
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    try { playSystemSoundEffect('LEVEL_UP'); } catch {}
    const t1 = setTimeout(() => setPhase('features'), 1800);
    return () => clearTimeout(t1);
  }, []);

  useEffect(() => {
    if (phase !== 'features') return;
    if (featureIndex >= features.length) {
      setPhase('dismiss');
      return;
    }
    try { playSystemSoundEffect('NOTIFICATION'); } catch {}
  }, [phase, featureIndex, features.length]);

  // Particle burst on feature canvas
  useEffect(() => {
    if (phase !== 'features' || !features[featureIndex]) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const color = features[featureIndex].color;

    interface P { x: number; y: number; vx: number; vy: number; alpha: number; size: number; }
    const particles: P[] = [];
    for (let i = 0; i < 60; i++) {
      const angle = (Math.random() * Math.PI * 2);
      const speed = 2 + Math.random() * 8;
      particles.push({
        x: canvas.width / 2,
        y: canvas.height * 0.38,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1,
        size: 2 + Math.random() * 5,
      });
    }

    let frame = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1;
        p.alpha -= 0.015;
        if (p.alpha <= 0) return;
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [phase, featureIndex, features]);

  const handleFeatureNext = () => {
    if (featureIndex < features.length - 1) {
      setFeatureIndex(i => i + 1);
    } else {
      setPhase('dismiss');
    }
  };

  const currentFeature = features[featureIndex];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.5 } }}
      className="fixed inset-0 z-[500] flex flex-col items-center justify-center overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at center, #0a001a 0%, #000000 70%)' }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }} />

      {/* Grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(${currentFeature?.color || '#33dfff'}08 1px, transparent 1px), linear-gradient(90deg, ${currentFeature?.color || '#33dfff'}08 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
          zIndex: 0,
        }}
      />

      {/* Phase: ALERT */}
      <AnimatePresence>
        {phase === 'alert' && (
          <motion.div
            key="alert"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="relative z-10 flex flex-col items-center gap-4"
          >
            <motion.div
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              className="text-[10px] font-black tracking-[0.5em] font-mono uppercase"
              style={{ color: currentFeature?.color || '#33dfff' }}
            >
              ── SYSTEM ALERT ──
            </motion.div>

            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.3 }}
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{
                background: `radial-gradient(circle, ${currentFeature?.color || '#33dfff'}25, transparent 70%)`,
                border: `2px solid ${currentFeature?.color || '#33dfff'}40`,
                boxShadow: `0 0 40px ${currentFeature?.glow || 'rgba(192,132,252,0.3)'}`,
              }}
            >
              <Unlock size={36} style={{ color: currentFeature?.color || '#33dfff' }} />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="text-3xl font-black tracking-wider font-mono text-white"
              style={{ textShadow: `0 0 20px ${currentFeature?.glow || 'rgba(192,132,252,0.5)'}` }}
            >
              NEW FEATURES
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
              className="text-[11px] text-gray-500 font-mono"
            >
              Level {level} capabilities unlocked
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Phase: FEATURES */}
      <AnimatePresence mode="wait">
        {phase === 'features' && currentFeature && (
          <motion.div
            key={`feature-${featureIndex}`}
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            className="relative z-10 flex flex-col items-center gap-5 px-8 max-w-sm"
          >
            {/* Icon circle */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, delay: 0.1 }}
              className="w-24 h-24 rounded-full flex items-center justify-center relative"
              style={{
                background: `radial-gradient(circle, ${currentFeature.color}20, transparent 70%)`,
                border: `2px solid ${currentFeature.color}50`,
              }}
            >
              <motion.div
                animate={{
                  filter: [
                    `drop-shadow(0 0 10px ${currentFeature.glow})`,
                    `drop-shadow(0 0 25px ${currentFeature.glow})`,
                    `drop-shadow(0 0 10px ${currentFeature.glow})`,
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{ color: currentFeature.color }}
              >
                {currentFeature.icon}
              </motion.div>

              {/* Expanding rings */}
              {[1, 2, 3].map(i => (
                <motion.div
                  key={i}
                  initial={{ scale: 1, opacity: 0.5 }}
                  animate={{ scale: 2 + i * 0.5, opacity: 0 }}
                  transition={{ duration: 1.5, delay: i * 0.2, repeat: Infinity }}
                  className="absolute w-full h-full rounded-full"
                  style={{ border: `1px solid ${currentFeature.color}40` }}
                />
              ))}
            </motion.div>

            {/* Feature counter */}
            <div className="text-[9px] font-mono text-gray-600 tracking-[0.3em] uppercase">
              Feature {featureIndex + 1} of {features.length}
            </div>

            {/* Title */}
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-2xl font-black tracking-wider font-mono text-center"
              style={{ color: '#ffffff', textShadow: `0 0 16px ${currentFeature.glow}` }}
            >
              {currentFeature.title}
            </motion.h2>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="text-[12px] text-gray-400 text-center leading-relaxed font-mono"
            >
              {currentFeature.subtitle}
            </motion.p>

            {/* Tap to continue */}
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              whileTap={{ scale: 0.96 }}
              onClick={handleFeatureNext}
              className="mt-4 px-8 py-3 font-black text-xs tracking-[0.25em] font-mono uppercase rounded-xl border"
              style={{
                background: `linear-gradient(135deg, ${currentFeature.color}18, ${currentFeature.color}08)`,
                borderColor: `${currentFeature.color}40`,
                color: currentFeature.color,
                boxShadow: `0 0 20px ${currentFeature.glow}`,
              }}
            >
              {featureIndex < features.length - 1 ? 'NEXT' : 'CONTINUE'}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Phase: DISMISS — auto-complete */}
      {phase === 'dismiss' && (
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          onAnimationComplete={onComplete}
          className="absolute inset-0"
        />
      )}
    </motion.div>
  );
};

export default FeatureUnlockCinematic;
