
import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RANK_META } from './RankBadge';
import type { RankType } from './RankBadge';
import { playSystemSoundEffect } from '../utils/soundEngine';

interface RankUpCinematicProps {
  oldRank: RankType;
  newRank: RankType;
  onComplete: () => void;
}

/* ─── Confetti Canvas ─────────────────────────────────────────────── */

interface Particle {
  id: number; x: number; y: number; vx: number; vy: number;
  color: string; size: number; rotation: number; rotSpeed: number;
  shape: 'rect' | 'circle' | 'diamond'; alpha: number;
}

const CONFETTI_COLORS: Record<RankType, string[]> = {
  UNRANKED: ['#4a4a5a', '#6a6a7a', '#3a3a4a'],
  E: ['#6b7280', '#9ca3af', '#4b5563', '#d1d5db'],
  D: ['#c87941', '#e8a060', '#f59e0b', '#78350f'],
  C: ['#38bdf8', '#7dd3fc', '#0ea5e9', '#e0f2fe', '#ffffff'],
  B: ['#a855f7', '#d8b4fe', '#9333ea', '#c4b5fd', '#e9d5ff'],
  A: ['#f97316', '#fdba74', '#ef4444', '#fca5a5', '#fbbf24'],
  S: ['#9ACDE3', '#f0abfc', '#eab308', '#fde68a', '#ffffff', '#a855f7', '#f59e0b'],
};

const useConfetti = (active: boolean, newRank: RankType) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const animFrame = useRef<number>(0);
  const colors = CONFETTI_COLORS[newRank];

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
          id: Math.random(), x: centerX, y: fromTop ? 0 : canvas.height * 0.45,
          vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: 5 + Math.random() * 10, rotation: Math.random() * 360,
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
        p.x += p.vx; p.y += p.vy; p.vy += 0.28; p.vx *= 0.99;
        p.rotation += p.rotSpeed;
        if (p.y > canvas.height * 0.6) p.alpha -= 0.015;
        if (p.y > canvas.height) p.alpha = 0;
        ctx.save(); ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y); ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color; ctx.shadowBlur = 6; ctx.shadowColor = p.color;
        if (p.shape === 'rect') ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        else if (p.shape === 'circle') { ctx.beginPath(); ctx.arc(0, 0, p.size / 2.5, 0, Math.PI * 2); ctx.fill(); }
        else { ctx.beginPath(); ctx.moveTo(0, -p.size / 2); ctx.lineTo(p.size / 2, 0); ctx.lineTo(0, p.size / 2); ctx.lineTo(-p.size / 2, 0); ctx.closePath(); ctx.fill(); }
        ctx.restore();
      });
      animFrame.current = requestAnimationFrame(draw);
    };
    animFrame.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrame.current);
  }, [active, newRank]);

  return canvasRef;
};

/* ─── Spark Canvas (forge particles) ──────────────────────────────── */

const useForgeParticles = (active: boolean, color: string) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrame = useRef<number>(0);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const sparks: { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number }[] = [];
    const cx = canvas.width / 2;
    const cy = canvas.height * 0.38;

    // Emit sparks
    for (let i = 0; i < 40; i++) {
      const angle = (Math.random() - 0.5) * Math.PI;
      const speed = 2 + Math.random() * 6;
      sparks.push({
        x: cx + (Math.random() - 0.5) * 80,
        y: cy + (Math.random() - 0.5) * 80,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        life: 0, maxLife: 30 + Math.random() * 40,
        size: 1 + Math.random() * 3,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      sparks.forEach(s => {
        s.life++;
        if (s.life >= s.maxLife) return;
        alive = true;
        s.x += s.vx; s.y += s.vy; s.vy += 0.08;
        const alpha = 1 - s.life / s.maxLife;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
      if (alive) animFrame.current = requestAnimationFrame(draw);
    };
    animFrame.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrame.current);
  }, [active, color]);

  return canvasRef;
};

/* ─── Shard pieces for explosion ──────────────────────────────────── */

const SHARD_CONFIGS = [
  { clip: 'polygon(0% 0%, 50% 0%, 50% 50%, 0% 50%)', dx: -1, dy: -1, rot: -45 },
  { clip: 'polygon(50% 0%, 100% 0%, 100% 50%, 50% 50%)', dx: 1, dy: -1, rot: 45 },
  { clip: 'polygon(0% 50%, 50% 50%, 50% 100%, 0% 100%)', dx: -1, dy: 1, rot: -30 },
  { clip: 'polygon(50% 50%, 100% 50%, 100% 100%, 50% 100%)', dx: 1, dy: 1, rot: 30 },
  { clip: 'polygon(25% 0%, 75% 0%, 50% 25%)', dx: 0, dy: -1.5, rot: 15 },
  { clip: 'polygon(75% 25%, 100% 50%, 75% 75%)', dx: 1.5, dy: 0, rot: 60 },
  { clip: 'polygon(25% 75%, 50% 100%, 0% 100%)', dx: -0.8, dy: 1.2, rot: -60 },
  { clip: 'polygon(50% 100%, 75% 75%, 100% 100%)', dx: 0.8, dy: 1.5, rot: 50 },
];

/* ─── Main Cinematic ──────────────────────────────────────────────── */

type Phase = 'display' | 'crack' | 'shatter' | 'void' | 'emerge' | 'celebrate';

const rankName: Record<RankType, string> = {
  UNRANKED: 'Unregistered',
  E: 'Awakened Hunter',
  D: 'Iron Gate',
  C: 'Knight of the System',
  B: 'Cobalt Sovereign',
  A: 'Crimson Warlord',
  S: 'Overlord',
};

const RankUpCinematic: React.FC<RankUpCinematicProps> = ({ oldRank, newRank, onComplete }) => {
  const [phase, setPhase] = useState<Phase>('display');
  const oldMeta = RANK_META[oldRank];
  const newMeta = RANK_META[newRank];
  const canvasRef = useConfetti(phase === 'celebrate', newRank);
  const forgeRef = useForgeParticles(phase === 'emerge', newMeta.primary);

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('crack'), 1000);
    const t2 = setTimeout(() => { setPhase('shatter'); playSystemSoundEffect('RANK_UP'); }, 1800);
    const t3 = setTimeout(() => setPhase('void'), 2300);
    const t4 = setTimeout(() => setPhase('emerge'), 2800);
    const t5 = setTimeout(() => setPhase('celebrate'), 4000);
    const t6 = setTimeout(() => onCompleteRef.current(), 7500);
    return () => { [t1, t2, t3, t4, t5, t6].forEach(clearTimeout); };
  }, []);

  const badgeSize = 140;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.6 } }}
      className="fixed inset-0 z-[500] flex flex-col items-center justify-center overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at center, #0d0015 0%, #000000 70%)' }}
    >
      {/* Confetti canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{ zIndex: 20 }} />

      {/* Forge particles canvas */}
      <canvas ref={forgeRef} className="absolute inset-0 pointer-events-none" style={{ zIndex: 15 }} />

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
            transition={{ duration: 0.5 }}
            className="absolute bottom-0 left-1/2 -translate-x-1/2 pointer-events-none"
            style={{
              width: 200, height: '60vh',
              background: `linear-gradient(to top, ${newMeta.primary}50, ${newMeta.primary}15, transparent)`,
              filter: 'blur(30px)',
              transformOrigin: 'bottom center',
              zIndex: 2,
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Main stage ── */}
      <div className="relative z-10 flex flex-col items-center gap-6">
        <div className="relative flex items-center justify-center" style={{ width: badgeSize * 2, height: badgeSize * 2 }}>

          {/* Ambient aura — no looping */}
          <motion.div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: badgeSize * 1.5, height: badgeSize * 1.5,
              background: `radial-gradient(circle, ${phase === 'celebrate' ? newMeta.primary : oldMeta.primary}25, transparent 70%)`,
            }}
            animate={phase === 'celebrate' ? { scale: [1, 1.4, 1.1], opacity: [0.3, 0.9, 0.6] } : {}}
            transition={{ duration: 2.2 }}
          />

          {/* ── Phase 1 & 2: OLD badge ── */}
          <AnimatePresence>
            {(phase === 'display' || phase === 'crack') && (
              <motion.div
                key="old-badge"
                className="absolute flex items-center justify-center"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={
                  phase === 'crack'
                    ? {
                        scale: [1, 1.05, 0.97, 1.08, 0.95, 1.1, 0.93, 1.15],
                        x: [0, -6, 8, -10, 12, -8, 10, -5, 7, -12, 6, 0],
                        y: [0, 4, -6, 8, -10, 5, -7, 9, -4, 6, -8, 0],
                        rotate: [0, -2, 3, -4, 3, -2, 4, -3, 2, 0],
                      }
                    : { scale: 1, opacity: 1 }
                }
                exit={{ scale: 1.5, opacity: 0, filter: 'blur(12px) brightness(2)', transition: { duration: 0.3 } }}
                transition={phase === 'crack'
                  ? { duration: 0.8, ease: 'easeInOut' }
                  : { type: 'spring', stiffness: 200, damping: 18 }
                }
              >
                <img
                  src={oldMeta.image}
                  alt={`${oldRank} Rank`}
                  draggable={false}
                  style={{
                    width: badgeSize - 20,
                    height: badgeSize - 20,
                    objectFit: 'contain',
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Phase 3: Shard explosion ── */}
          <AnimatePresence>
            {phase === 'shatter' && (
              <>
                {SHARD_CONFIGS.map((shard, i) => (
                  <motion.div
                    key={`shard-${i}`}
                    className="absolute"
                    style={{ width: badgeSize, height: badgeSize }}
                    initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
                    animate={{
                      x: shard.dx * 90,
                      y: shard.dy * 90,
                      opacity: 0,
                      rotate: shard.rot * 2,
                      scale: 0.3,
                    }}
                    transition={{ duration: 0.5, ease: 'easeOut', delay: i * 0.02 }}
                  >
                    <img
                      src={oldMeta.image}
                      alt=""
                      draggable={false}
                      style={{
                        width: '100%', height: '100%', objectFit: 'contain',
                        clipPath: shard.clip,
                      }}
                    />
                  </motion.div>
                ))}

                {/* White flash */}
                <motion.div
                  key="flash"
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: 'white', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 30 }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.7, 0] }}
                  transition={{ duration: 0.3 }}
                />

                {/* Shockwave ring */}
                <motion.div
                  key="shock"
                  className="absolute rounded-full pointer-events-none"
                  style={{ width: 60, height: 60, border: `3px solid ${oldMeta.primary}` }}
                  initial={{ scale: 0, opacity: 1 }}
                  animate={{ scale: 6, opacity: 0 }}
                  transition={{ duration: 0.55, ease: 'easeOut' }}
                />
              </>
            )}
          </AnimatePresence>

          {/* ── Phase 4: Void pulse ── */}
          <AnimatePresence>
            {phase === 'void' && (
              <>
                <motion.div
                  key="void-pulse"
                  className="absolute rounded-full pointer-events-none"
                  style={{ width: 120, height: 120, background: `radial-gradient(circle, ${newMeta.primary}60, transparent 70%)` }}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: [0, 2.5, 2], opacity: [0, 1, 0.3] }}
                  transition={{ duration: 0.5 }}
                />
                <motion.div
                  key="void-text"
                  className="absolute text-[9px] font-mono tracking-[0.4em] uppercase"
                  style={{ color: newMeta.primary, bottom: -40 }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 0.5] }}
                  transition={{ duration: 0.5 }}
                >
                  FORGING NEW RANK...
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* ── Phase 5 & 6: NEW badge forge reveal ── */}
          <AnimatePresence>
            {(phase === 'emerge' || phase === 'celebrate') && (
              <motion.div
                key="new-badge"
                className="absolute flex items-center justify-center"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 250, damping: 20, delay: 0.1 }}
              >
                {/* Reveal mask: bottom to top */}
                <motion.div
                  initial={{ clipPath: 'inset(100% 0 0 0)' }}
                  animate={{ clipPath: 'inset(0% 0 0 0)' }}
                  transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                >
                  <motion.img
                    src={newMeta.image}
                    alt={`${newRank} Rank`}
                    draggable={false}
                    style={{
                      width: badgeSize,
                      height: badgeSize,
                      objectFit: 'contain',
                    }}
                    initial={{ filter: 'brightness(3)' }}
                    animate={{ filter: 'brightness(1)' }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Celebrate rings ── */}
          <AnimatePresence>
            {phase === 'celebrate' && (
              <>
                {[1, 1.8, 2.8].map((s, i) => (
                  <motion.div
                    key={`ring-${i}`}
                    className="absolute rounded-full pointer-events-none"
                    style={{ width: 100, height: 100, border: `2px solid ${newMeta.primary}` }}
                    initial={{ scale: 0, opacity: 0.9 }}
                    animate={{ scale: s * 2.5, opacity: 0 }}
                    transition={{ duration: 1.2 + i * 0.3, delay: i * 0.18, ease: 'easeOut' }}
                  />
                ))}
              </>
            )}
          </AnimatePresence>
        </div>

        {/* ── Text reveal ── */}
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
                  }}
                >
                  {oldRank === 'UNRANKED' ? 'RANK ASSIGNED' : 'RANK UP'}
                </motion.div>

                <motion.div
                  key="rank-letters"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 }}
                  className="flex items-center gap-3 text-2xl font-black font-mono"
                >
                  <span style={{ color: oldMeta.primary, opacity: 0.6 }}>{oldRank === 'UNRANKED' ? '?' : oldRank}</span>
                  <span className="text-gray-600 text-lg">→</span>
                  <span style={{ color: newMeta.labelColor, textShadow: `0 0 12px ${newMeta.glow}` }}>
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
                    : oldRank === 'UNRANKED'
                      ? '"The System has scanned your potential. Your rank has been assigned."'
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
