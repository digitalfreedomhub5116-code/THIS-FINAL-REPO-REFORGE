
import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import RankBadge, { RANK_META } from './RankBadge';
import type { RankType } from './RankBadge';

interface RankUpCinematicProps {
  oldRank: RankType;
  newRank: RankType;
  onComplete: () => void;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotSpeed: number;
  shape: 'rect' | 'circle' | 'diamond';
  alpha: number;
}

const CONFETTI_COLORS_BY_RANK: Record<RankType, string[]> = {
  E: ['#6b7280', '#9ca3af', '#4b5563'],
  D: ['#c87941', '#e8a060', '#f59e0b', '#78350f'],
  C: ['#38bdf8', '#7dd3fc', '#0ea5e9', '#e0f2fe', '#ffffff'],
  B: ['#a855f7', '#d8b4fe', '#9333ea', '#c4b5fd', '#e9d5ff'],
  A: ['#f97316', '#fdba74', '#ef4444', '#fca5a5', '#fbbf24'],
  S: ['#c084fc', '#f0abfc', '#eab308', '#fde68a', '#ffffff', '#a855f7', '#f59e0b'],
};

const useConfetti = (active: boolean, newRank: RankType) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const animFrame = useRef<number>(0);
  const colors = CONFETTI_COLORS_BY_RANK[newRank];

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const burst = (count: number, centerX: number, fromTop: boolean) => {
      for (let i = 0; i < count; i++) {
        const angle = fromTop
          ? Math.random() * Math.PI + Math.PI * 0.1
          : (Math.random() - 0.5) * Math.PI * 1.8 - Math.PI / 2;
        const speed = 3 + Math.random() * 14;
        particles.current.push({
          id: Math.random(),
          x: centerX,
          y: fromTop ? 0 : canvas.height * 0.45,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: 5 + Math.random() * 10,
          rotation: Math.random() * 360,
          rotSpeed: (Math.random() - 0.5) * 12,
          shape: (['rect', 'circle', 'diamond'] as const)[Math.floor(Math.random() * 3)],
          alpha: 1,
        });
      }
    };

    burst(80, canvas.width * 0.2, true);
    burst(80, canvas.width * 0.8, true);
    burst(100, canvas.width * 0.5, false);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.current = particles.current.filter(p => p.alpha > 0.02);

      particles.current.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.28;
        p.vx *= 0.99;
        p.rotation += p.rotSpeed;
        if (p.y > canvas.height * 0.6) p.alpha -= 0.015;
        if (p.y > canvas.height) p.alpha = 0;

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 6;
        ctx.shadowColor = p.color;

        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2.5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.moveTo(0, -p.size / 2);
          ctx.lineTo(p.size / 2, 0);
          ctx.lineTo(0, p.size / 2);
          ctx.lineTo(-p.size / 2, 0);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      });

      animFrame.current = requestAnimationFrame(draw);
    };

    animFrame.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrame.current);
  }, [active, newRank]);

  return canvasRef;
};

type Phase = 'old' | 'crack' | 'shatter' | 'void' | 'emerge' | 'celebrate';

const RankUpCinematic: React.FC<RankUpCinematicProps> = ({ oldRank, newRank, onComplete }) => {
  const [phase, setPhase] = useState<Phase>('old');
  const oldMeta = RANK_META[oldRank];
  const newMeta = RANK_META[newRank];
  const canvasRef = useConfetti(phase === 'celebrate', newRank);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('crack'),     900);
    const t2 = setTimeout(() => setPhase('shatter'),  1500);
    const t3 = setTimeout(() => setPhase('void'),     2100);
    const t4 = setTimeout(() => setPhase('emerge'),   2500);
    const t5 = setTimeout(() => setPhase('celebrate'),2900);
    const t6 = setTimeout(() => onComplete(),         6200);
    return () => { [t1,t2,t3,t4,t5,t6].forEach(clearTimeout); };
  }, [onComplete]);

  const rankOrder: RankType[] = ['E','D','C','B','A','S'];
  const rankName: Record<RankType, string> = {
    E: 'Awakened Hunter',
    D: 'Iron Gate',
    C: 'Knight of the System',
    B: 'Cobalt Sovereign',
    A: 'Crimson Warlord',
    S: 'Shadow Monarch',
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.6 } }}
      className="fixed inset-0 z-[500] flex flex-col items-center justify-center overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at center, #0d0015 0%, #000000 70%)' }}
    >
      {/* Confetti canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }} />

      {/* Grid lines */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(${newMeta.primary}08 1px, transparent 1px), linear-gradient(90deg, ${newMeta.primary}08 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
          zIndex: 0,
        }}
      />

      {/* Ground light beam */}
      <AnimatePresence>
        {(phase === 'emerge' || phase === 'celebrate') && (
          <motion.div
            key="beam"
            initial={{ opacity: 0, scaleY: 0 }}
            animate={{ opacity: 1, scaleY: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-96 pointer-events-none"
            style={{
              background: `linear-gradient(to top, ${newMeta.primary}40, transparent)`,
              filter: `blur(20px)`,
              transformOrigin: 'bottom center',
              zIndex: 2,
            }}
          />
        )}
      </AnimatePresence>

      {/* Main stage */}
      <div className="relative z-10 flex flex-col items-center gap-6">

        {/* Badge stage */}
        <div className="relative flex items-center justify-center w-64 h-64">

          {/* Ambient aura behind badge */}
          <motion.div
            className="absolute w-48 h-48 rounded-full pointer-events-none"
            style={{ background: `radial-gradient(circle, ${newMeta.primary}18, transparent 70%)` }}
            animate={phase === 'celebrate' ? { scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] } : {}}
            transition={{ duration: 2.2, repeat: Infinity }}
          />

          {/* OLD badge — visible in 'old' and 'crack' phases */}
          <AnimatePresence>
            {(phase === 'old' || phase === 'crack') && (
              <motion.div
                key="old-badge"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={
                  phase === 'crack'
                    ? { scale: 1.12, opacity: 1, filter: 'brightness(1.6) contrast(1.4)' }
                    : { scale: 1, opacity: 1 }
                }
                exit={{ scale: 1.6, opacity: 0, filter: 'blur(12px)', transition: { duration: 0.35 } }}
                transition={{ type: 'spring', stiffness: 200, damping: 18 }}
              >
                <RankBadge rank={oldRank} size={120} animated={false} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Shatter shockwave */}
          <AnimatePresence>
            {phase === 'shatter' && (
              <>
                {[0, 60, 120, 180, 240, 300].map((angle, i) => (
                  <motion.div
                    key={i}
                    initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                    animate={{
                      x: Math.cos((angle * Math.PI) / 180) * 80,
                      y: Math.sin((angle * Math.PI) / 180) * 80,
                      opacity: 0,
                      scale: 0.3,
                      rotate: angle * 2,
                    }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="absolute"
                  >
                    <div
                      className="w-8 h-8"
                      style={{
                        background: oldMeta.primary,
                        clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
                        opacity: 0.8,
                        boxShadow: `0 0 10px ${oldMeta.glow}`,
                      }}
                    />
                  </motion.div>
                ))}
                <motion.div
                  key="shock-ring"
                  initial={{ scale: 0, opacity: 1 }}
                  animate={{ scale: 5, opacity: 0 }}
                  transition={{ duration: 0.55, ease: 'easeOut' }}
                  className="absolute w-24 h-24 rounded-full pointer-events-none"
                  style={{ border: `3px solid ${oldMeta.primary}` }}
                />
              </>
            )}
          </AnimatePresence>

          {/* Void flash */}
          <AnimatePresence>
            {phase === 'void' && (
              <motion.div
                key="void"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 2.5, opacity: [0, 1, 0] }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
                className="absolute w-32 h-32 rounded-full pointer-events-none"
                style={{ background: `radial-gradient(circle, ${newMeta.primary}80, transparent 70%)` }}
              />
            )}
          </AnimatePresence>

          {/* NEW badge — emerges */}
          <AnimatePresence>
            {(phase === 'emerge' || phase === 'celebrate') && (
              <motion.div
                key="new-badge"
                initial={{ scale: 0, opacity: 0, filter: 'brightness(3)' }}
                animate={{ scale: 1, opacity: 1, filter: 'brightness(1)' }}
                transition={{ type: 'spring', stiffness: 280, damping: 20, delay: 0.05 }}
              >
                <motion.div
                  animate={phase === 'celebrate' ? {
                    filter: [
                      `drop-shadow(0 0 12px ${newMeta.glow})`,
                      `drop-shadow(0 0 28px ${newMeta.glow})`,
                      `drop-shadow(0 0 12px ${newMeta.glow})`,
                    ],
                  } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <RankBadge rank={newRank} size={140} animated />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Celebrate rings */}
          <AnimatePresence>
            {phase === 'celebrate' && (
              <>
                {[1, 1.8, 2.8].map((s, i) => (
                  <motion.div
                    key={`ring-${i}`}
                    initial={{ scale: 0, opacity: 0.9 }}
                    animate={{ scale: s * 2.2, opacity: 0 }}
                    transition={{ duration: 1.2 + i * 0.3, delay: i * 0.18, ease: 'easeOut' }}
                    className="absolute w-36 h-36 rounded-full pointer-events-none"
                    style={{ border: `2px solid ${newMeta.primary}` }}
                  />
                ))}
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Text reveal */}
        <div className="flex flex-col items-center gap-2 text-center px-8">
          <AnimatePresence>
            {phase === 'celebrate' && (
              <>
                <motion.div
                  key="system-msg"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-[10px] font-black tracking-[0.4em] font-mono uppercase"
                  style={{ color: newMeta.primary }}
                >
                  ── SYSTEM ALERT ──
                </motion.div>

                <motion.div
                  key="rank-up-label"
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 22, delay: 0.15 }}
                  className="text-4xl font-black tracking-wider font-mono"
                  style={{
                    color: '#ffffff',
                    textShadow: `0 0 20px ${newMeta.primary}, 0 0 40px ${newMeta.glow}`,
                    letterSpacing: '0.12em',
                  }}
                >
                  RANK UP
                </motion.div>

                <motion.div
                  key="rank-letters"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 }}
                  className="flex items-center gap-3 text-2xl font-black font-mono"
                >
                  <span style={{ color: oldMeta.primary, opacity: 0.6 }}>{oldRank}</span>
                  <span className="text-gray-600 text-lg">→</span>
                  <span
                    style={{
                      color: newMeta.labelColor,
                      textShadow: `0 0 12px ${newMeta.glow}`,
                    }}
                  >
                    {newRank}
                  </span>
                </motion.div>

                <motion.div
                  key="rank-title"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="text-sm font-bold tracking-[0.25em] font-mono uppercase mt-1"
                  style={{ color: newMeta.primary }}
                >
                  {rankName[newRank]}
                </motion.div>

                <motion.div
                  key="rank-flavor"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-[11px] text-gray-500 font-mono mt-2 max-w-xs leading-relaxed"
                >
                  {newRank === 'S'
                    ? '"You have surpassed all known limits. The System acknowledges your ascension."'
                    : '"A new gate opens before you. The System has recognized your power."'}
                </motion.div>

                <motion.button
                  key="continue-btn"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.2 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={onComplete}
                  className="mt-4 px-8 py-2.5 font-black text-xs tracking-[0.3em] font-mono uppercase rounded border"
                  style={{
                    background: `linear-gradient(135deg, ${newMeta.primary}22, ${newMeta.primary}11)`,
                    borderColor: newMeta.border,
                    color: newMeta.labelColor,
                    boxShadow: `0 0 16px ${newMeta.glow}`,
                  }}
                >
                  CONTINUE
                </motion.button>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export default RankUpCinematic;
