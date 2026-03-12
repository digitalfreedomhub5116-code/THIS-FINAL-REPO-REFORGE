import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Key, Coins, CheckCircle, Sparkles, Ghost, Zap } from 'lucide-react';
import { playSystemSoundEffect } from '../utils/soundEngine';
import { DailyReward } from '../types';

interface DailyChestModalProps {
  reward: DailyReward;
  onClose: () => void;
}

// ── Types ────────────────────────────────────────────────────────────────────
type Phase = 'idle' | 'shaking' | 'opening' | 'open' | 'cards';

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  size: number; color: string;
  alpha: number; spin: number;
  spinRate: number;
  shape: 'rect' | 'diamond' | 'circle';
  w: number; h: number;
  glow: number; life: number; maxLife: number;
}

// ── Particle system ──────────────────────────────────────────────────────────
function makeChestParticles(cx: number, cy: number): Particle[] {
  const COLORS = ['#FFD700', '#FFF8DC', '#C0A050', '#00D2FF', '#FFFFFF', '#FFD700', '#FFF8DC', '#FFE066'];
  const SHAPES: Particle['shape'][] = ['rect', 'rect', 'diamond', 'circle', 'rect', 'diamond'];
  return Array.from({ length: 150 }, (): Particle => {
    const angleDeg = -90 + (Math.random() - 0.5) * 140;
    const rad = (angleDeg * Math.PI) / 180;
    const speed = 4 + Math.random() * 13;
    const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    const size = shape === 'circle' ? 2 + Math.random() * 6 : 3 + Math.random() * 9;
    const maxLife = 80 + Math.random() * 50;
    return {
      x: cx + (Math.random() - 0.5) * 80,
      y: cy,
      vx: Math.cos(rad) * speed * (0.5 + Math.random()),
      vy: Math.sin(rad) * speed,
      size, color: COLORS[Math.floor(Math.random() * COLORS.length)],
      alpha: 1, spin: Math.random() * Math.PI * 2,
      spinRate: (Math.random() - 0.5) * 0.3,
      shape, w: size, h: size * (0.25 + Math.random() * 0.5),
      glow: Math.random() > 0.5 ? 4 + Math.random() * 10 : 0,
      life: 0, maxLife,
    };
  });
}

function drawParticle(ctx: CanvasRenderingContext2D, p: Particle) {
  ctx.save();
  ctx.globalAlpha = p.alpha;
  if (p.glow > 0) { ctx.shadowBlur = p.glow; ctx.shadowColor = p.color; }
  ctx.fillStyle = p.color;
  ctx.translate(p.x, p.y);
  ctx.rotate(p.spin);
  if (p.shape === 'rect') {
    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
  } else if (p.shape === 'diamond') {
    const s = p.size * 0.6;
    ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s * 0.55, 0);
    ctx.lineTo(0, s); ctx.lineTo(-s * 0.55, 0); ctx.closePath(); ctx.fill();
  } else {
    ctx.beginPath(); ctx.arc(0, 0, p.size * 0.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// ── Ambient orbiting motes ───────────────────────────────────────────────────
const MOTES = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  angle: (i / 12) * 360,
  radius: 62 + Math.random() * 30,
  size: 2 + Math.random() * 3,
  color: i % 2 === 0 ? '#FFD700' : '#00D2FF',
  speed: 3 + Math.random() * 4,
  opacity: 0.4 + Math.random() * 0.5,
}));

// ── 3D Chest ─────────────────────────────────────────────────────────────────
const WOOD_FRONT = 'linear-gradient(160deg, #3B2008 0%, #5C300A 30%, #4A2407 55%, #3B2008 80%, #2E1A05 100%)';
const WOOD_SIDE  = 'linear-gradient(160deg, #2E1A05 0%, #3D2207 60%, #2E1A05 100%)';
const WOOD_TOP   = 'linear-gradient(180deg, #5C300A 0%, #4A2407 50%, #3B2008 100%)';
const GOLD_BORDER = '2px solid rgba(234,179,8,0.8)';
const GOLD_TRIM = 'rgba(234,179,8,0.85)';

const W = 140; // chest width
const H = 90;  // chest body height
const D = 50;  // chest depth
const LH = 44; // lid height

const TreasureChest3D: React.FC<{ phase: Phase; onOpenDone: () => void }> = ({ phase, onOpenDone }) => {
  const isShaking = phase === 'shaking';
  const isOpening = phase === 'opening' || phase === 'open' || phase === 'cards';
  const lidOpen = phase === 'open' || phase === 'cards';
  const showMagic = isOpening;

  // Particles from chest body — 22 gold burst particles
  const burstParticles = useMemo(() => Array.from({ length: 22 }, (_, i) => ({
    id: i,
    color: i % 3 === 0 ? '#00D2FF' : i % 3 === 1 ? '#FFD700' : '#FFF8DC',
    targetX: (Math.random() - 0.5) * 360,
    targetY: -(Math.random() * 200 + 40),
    rotate: Math.random() * 720,
    size: Math.random() * 6 + 3,
    dur: Math.random() * 0.4 + 0.5,
    delay: Math.random() * 0.15,
  })), []);

  return (
    <div className="relative flex flex-col items-center" style={{ width: W + D + 20 }}>

      {/* Ground mist blobs */}
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          className="absolute pointer-events-none"
          style={{
            width: 140 + i * 40, height: 22,
            borderRadius: '50%',
            background: `radial-gradient(ellipse, rgba(234,179,8,${isOpening ? 0.22 : 0.06}) 0%, transparent 70%)`,
            filter: 'blur(10px)',
            bottom: -14 + i * 4,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 0,
          }}
          animate={{ scaleX: [1, 1.08 + i * 0.05, 1], opacity: isOpening ? [0.7, 1, 0.7] : [0.3, 0.6, 0.3] }}
          transition={{ duration: 3 + i, repeat: Infinity, delay: i * 0.8 }}
        />
      ))}

      {/* Rotating magic circles */}
      <AnimatePresence>
        {showMagic && (
          <motion.div
            className="absolute pointer-events-none"
            style={{ bottom: -18, left: '50%', translateX: '-50%', zIndex: 1 }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          >
            <svg width="200" height="60" viewBox="-100 -30 200 60">
              {/* Outer ring */}
              <motion.ellipse cx="0" cy="0" rx="90" ry="22" fill="none"
                stroke="rgba(234,179,8,0.6)" strokeWidth="1.2"
                strokeDasharray="8 4"
                animate={{ rotate: 360 }}
                transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                style={{ transformOrigin: '0px 0px' }}
              />
              {/* Inner ring */}
              <motion.ellipse cx="0" cy="0" rx="60" ry="14" fill="none"
                stroke="rgba(0,210,255,0.5)" strokeWidth="0.9"
                strokeDasharray="5 3"
                animate={{ rotate: -360 }}
                transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                style={{ transformOrigin: '0px 0px' }}
              />
              {/* Rune ticks outer */}
              {Array.from({ length: 8 }, (_, i) => {
                const a = (i / 8) * Math.PI * 2;
                const x = Math.cos(a) * 90; const y = Math.sin(a) * 22;
                return <ellipse key={i} cx={x} cy={y} rx="2.5" ry="2.5"
                  fill="rgba(234,179,8,0.8)" />;
              })}
            </svg>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ambient orbiting motes — shown in idle/shaking only */}
      {!isOpening && MOTES.map(m => (
        <motion.div
          key={m.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: m.size, height: m.size,
            background: m.color,
            boxShadow: `0 0 ${m.size * 2}px ${m.color}`,
            top: '50%', left: '50%',
            zIndex: 10,
          }}
          animate={{
            x: Math.cos((m.angle * Math.PI) / 180) * m.radius,
            y: Math.sin((m.angle * Math.PI) / 180) * m.radius * 0.35,
            rotate: [0, 360],
          }}
          transition={{ duration: m.speed, repeat: Infinity, ease: 'linear' }}
        />
      ))}

      {/* ── SCENE — perspective wrapper ── */}
      <motion.div
        style={{ perspective: 700, perspectiveOrigin: '50% 40%', position: 'relative', zIndex: 5 }}
        animate={isShaking ? {
          x: [0, -10, 10, -8, 8, -5, 5, -3, 3, 0],
        } : { x: 0 }}
        transition={isShaking ? { duration: 0.55, ease: 'easeInOut' } : {}}
        onAnimationComplete={() => {
          if (isShaking) onOpenDone();
        }}
      >
        <div style={{ transformStyle: 'preserve-3d', width: W, height: LH + H, position: 'relative' }}>

          {/* ═══ LID GROUP ═══ */}
          <motion.div
            style={{
              transformStyle: 'preserve-3d',
              width: W, height: LH,
              position: 'absolute', top: 0, left: 0,
              transformOrigin: `${W / 2}px ${LH}px -${D / 2}px`,
            }}
            animate={{ rotateX: lidOpen ? -130 : 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Lid top face */}
            <div style={{
              position: 'absolute', width: W, height: D,
              top: 0, left: 0,
              transform: `rotateX(90deg) translateZ(${D / 2}px)`,
              background: WOOD_TOP,
              border: GOLD_BORDER,
              transformStyle: 'preserve-3d',
            }}>
              {/* Diamond rune */}
              <div style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%,-50%) rotate(45deg)',
                width: 12, height: 12,
                background: GOLD_TRIM, boxShadow: '0 0 8px rgba(234,179,8,0.8)',
              }} />
            </div>

            {/* Lid front face */}
            <div style={{
              position: 'absolute', width: W, height: LH,
              top: 0, left: 0,
              background: WOOD_FRONT,
              border: GOLD_BORDER,
              borderBottom: `1px solid rgba(234,179,8,0.3)`,
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
            }}>
              {/* Decorative lines */}
              <div style={{ position:'absolute', top: 9, left: 10, right: 10, height: 1, background: 'rgba(234,179,8,0.2)' }} />
              <div style={{ position:'absolute', top: 16, left: 14, right: 14, height: 1, background: 'rgba(234,179,8,0.12)' }} />
              {/* Corner rivets */}
              {[{top:5,left:5},{top:5,right:5},{bottom:5,left:5},{bottom:5,right:5}].map((p,i)=>(
                <div key={i} style={{
                  position:'absolute', ...p, width:5, height:5, borderRadius:'50%',
                  background:'rgba(180,130,0,0.85)', border:'1px solid rgba(234,179,8,0.6)',
                }}/>
              ))}
            </div>

            {/* Lid left side */}
            <div style={{
              position: 'absolute', width: D, height: LH,
              top: 0, left: 0,
              transform: `rotateY(-90deg) translateZ(-${D / 2}px)`,
              background: WOOD_SIDE,
              border: GOLD_BORDER,
              transformOrigin: 'left center',
            }} />

            {/* Lid right side */}
            <div style={{
              position: 'absolute', width: D, height: LH,
              top: 0, right: 0,
              transform: `rotateY(90deg) translateZ(-${D / 2}px)`,
              background: WOOD_SIDE,
              border: GOLD_BORDER,
              transformOrigin: 'right center',
            }} />
          </motion.div>

          {/* ═══ BODY GROUP ═══ */}
          <div style={{
            transformStyle: 'preserve-3d',
            width: W, height: H,
            position: 'absolute', top: LH, left: 0,
          }}>
            {/* Body front */}
            <div style={{
              position: 'absolute', width: W, height: H,
              top: 0, left: 0,
              background: WOOD_FRONT,
              border: GOLD_BORDER,
              boxShadow: '0 8px 32px rgba(234,179,8,0.18)',
              overflow: 'hidden',
            }}>
              {/* Belt band */}
              <div style={{
                position:'absolute', top:'28%', left:0, right:0, height:22,
                background:'rgba(234,179,8,0.07)',
                borderTop:'1px solid rgba(234,179,8,0.22)',
                borderBottom:'1px solid rgba(234,179,8,0.22)',
              }} />
              {/* Corner rivets */}
              {[{top:6,left:6},{top:6,right:6},{bottom:6,left:6},{bottom:6,right:6}].map((p,i)=>(
                <div key={i} style={{
                  position:'absolute', ...p, width:5, height:5, borderRadius:'50%',
                  background:'rgba(180,130,0,0.85)', border:'1px solid rgba(234,179,8,0.6)',
                }}/>
              ))}
              {/* Lock medallion */}
              <AnimatePresence>
                {!isOpening && (
                  <motion.div
                    style={{
                      position:'absolute', top:'50%', left:'50%',
                      transform:'translate(-50%,-50%)',
                      width:38, height:38, borderRadius:'50%',
                      background:'rgba(234,179,8,0.1)',
                      border:'2px solid rgba(234,179,8,0.75)',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      boxShadow:'0 0 14px rgba(234,179,8,0.35)',
                    }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <svg width="16" height="20" viewBox="0 0 16 20" fill="none">
                      <rect x="2" y="9" width="12" height="10" rx="2" fill="rgba(234,179,8,0.8)" />
                      <path d="M4 9V6a4 4 0 018 0v3" stroke="rgba(234,179,8,0.8)" strokeWidth="2" fill="none"/>
                      <circle cx="8" cy="14" r="2" fill="#0A0A0F"/>
                    </svg>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Light beam — shows when opening */}
              <motion.div
                style={{
                  position:'absolute', top:0, left:0, right:0, height:'100%',
                  background:'linear-gradient(0deg, transparent 0%, rgba(234,179,8,0.25) 50%, rgba(255,255,255,0.18) 100%)',
                  pointerEvents:'none',
                }}
                animate={{ opacity: isOpening ? 1 : 0 }}
                transition={{ delay: 0.25, duration: 0.35 }}
              />

              {/* Burst particles */}
              {isOpening && burstParticles.map(p => (
                <motion.div
                  key={p.id}
                  style={{
                    position:'absolute', top:0, left:'50%',
                    width:p.size, height:p.size, borderRadius:2,
                    background:p.color, boxShadow:`0 0 8px ${p.color}`,
                  }}
                  initial={{ x:0, y:0, scale:1, opacity:1 }}
                  animate={{ x:p.targetX, y:p.targetY, rotate:p.rotate, scale:0, opacity:0 }}
                  transition={{ duration:p.dur, delay:p.delay, ease:'easeOut' }}
                />
              ))}
            </div>

            {/* Body right side */}
            <div style={{
              position:'absolute', width:D, height:H,
              top:0, right:0,
              transform:`rotateY(90deg) translateZ(0)`,
              background:WOOD_SIDE,
              border:GOLD_BORDER,
              transformOrigin:'right center',
            }}>
              {/* Right side belt */}
              <div style={{
                position:'absolute', top:'28%', left:0, right:0, height:22,
                background:'rgba(234,179,8,0.05)',
                borderTop:'1px solid rgba(234,179,8,0.15)',
                borderBottom:'1px solid rgba(234,179,8,0.15)',
              }} />
            </div>

            {/* Body left side */}
            <div style={{
              position:'absolute', width:D, height:H,
              top:0, left:0,
              transform:`rotateY(-90deg) translateZ(-${D}px)`,
              background:WOOD_SIDE,
              border:GOLD_BORDER,
              transformOrigin:'left center',
            }}>
              <div style={{
                position:'absolute', top:'28%', left:0, right:0, height:22,
                background:'rgba(234,179,8,0.05)',
                borderTop:'1px solid rgba(234,179,8,0.15)',
                borderBottom:'1px solid rgba(234,179,8,0.15)',
              }} />
            </div>

            {/* Body bottom */}
            <div style={{
              position:'absolute', width:W, height:D,
              bottom:0, left:0,
              transform:`rotateX(-90deg) translateZ(${D}px)`,
              background:'rgba(30,15,3,0.98)',
              border:GOLD_BORDER,
              transformOrigin:'bottom center',
            }} />
          </div>
        </div>
      </motion.div>

      {/* Base shadow / glow ring */}
      <motion.div
        style={{
          width:120, height:12, marginTop:6,
          background:'rgba(234,179,8,0.25)',
          filter:'blur(10px)',
          borderRadius:'50%',
        }}
        animate={{ scaleX: lidOpen ? 0.5 : 1, opacity: isOpening ? [0.5, 0.9, 0.5] : 0.8 }}
        transition={{ scaleX:{ duration:0.5 }, opacity:{ duration:2, repeat:Infinity } }}
      />
    </div>
  );
};

// ── Light beam canvas overlay ────────────────────────────────────────────────
const LightBeamCanvas: React.FC<{ active: boolean }> = ({ active }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cx = canvas.width / 2;
    const beamW = 36;
    let frame = 0;
    const MAX = 55;

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const alpha = frame < 10 ? frame / 10 : Math.max(0, 1 - (frame - 10) / (MAX - 10));
      // Flicker
      const flicker = frame < 15 ? 0.7 + Math.random() * 0.3 : 1;
      const a = alpha * flicker;

      const grd = ctx.createLinearGradient(0, canvas.height * 0.22, 0, canvas.height * 0.68);
      grd.addColorStop(0, `rgba(255,255,255,0)`);
      grd.addColorStop(0.15, `rgba(255,240,180,${a * 0.55})`);
      grd.addColorStop(0.5, `rgba(255,230,100,${a * 0.85})`);
      grd.addColorStop(0.85, `rgba(234,179,8,${a * 0.9})`);
      grd.addColorStop(1, `rgba(255,255,255,0)`);

      const hGrd = ctx.createRadialGradient(cx, canvas.height * 0.55, 0, cx, canvas.height * 0.55, beamW * 3.5);
      hGrd.addColorStop(0, `rgba(255,255,255,${a * 0.6})`);
      hGrd.addColorStop(0.4, `rgba(255,230,100,${a * 0.4})`);
      hGrd.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.fillStyle = hGrd;
      ctx.fillRect(cx - beamW * 4, canvas.height * 0.22, beamW * 8, canvas.height * 0.5);

      ctx.fillStyle = grd;
      ctx.fillRect(cx - beamW / 2, canvas.height * 0.22, beamW, canvas.height * 0.5);

      frame++;
      if (frame < MAX) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 9998, display: active ? 'block' : 'none' }}
    />
  );
};

// ── Confetti canvas ──────────────────────────────────────────────────────────
const ConfettiCanvas: React.FC<{ active: boolean; cx: number; cy: number }> = ({ active, cx, cy }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let particles = makeChestParticles(cx, cy);
    const GRAVITY = 0.2; const DRAG = 0.986;
    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      for (const p of particles) {
        p.life++; p.vy += GRAVITY; p.vx *= DRAG;
        p.x += p.vx; p.y += p.vy; p.spin += p.spinRate;
        p.alpha = Math.max(0, 1 - p.life / p.maxLife);
        if (p.alpha > 0) { alive = true; drawParticle(ctx, p); }
      }
      if (alive) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active, cx, cy]);

  return (
    <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none" style={{ zIndex: 9999 }} />
  );
};

// ── Screen flash ─────────────────────────────────────────────────────────────
const ScreenFlash: React.FC<{ active: boolean }> = ({ active }) => (
  <AnimatePresence>
    {active && (
      <motion.div
        className="fixed inset-0 pointer-events-none"
        style={{ background: 'rgba(234,179,8,0.35)', zIndex: 9997 }}
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.55 }}
      />
    )}
  </AnimatePresence>
);

// ── Reward Cards ─────────────────────────────────────────────────────────────
const CARD_START_X = [150, 50, -50, -150];
const CARD_START_ROT = [18, 7, -7, -18];

interface RewardCardProps {
  index: number; isSelected: boolean; isRevealed: boolean;
  onClick: () => void; anyCardRevealed: boolean;
  reward: DailyReward; flyOut: boolean;
}

const RewardCard: React.FC<RewardCardProps> = ({
  index, isSelected, isRevealed, onClick, anyCardRevealed, reward, flyOut,
}) => {
  const getRewardIcon = () => {
    if (reward.type === 'WELCOME_KEYS' || reward.type === 'KEYS') return <Key className="text-purple-400" size={28} />;
    if (reward.type === 'GOLD') return <Coins className="text-yellow-400" size={28} />;
    if (reward.type === 'XP') return <Zap className="text-blue-400" size={28} />;
    if (reward.type === 'DUNGEON_PASS') return <Ghost className="text-red-500" size={28} />;
    return <Sparkles className="text-white" size={28} />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -160, x: CARD_START_X[index], scale: 0.35, rotate: CARD_START_ROT[index] }}
      animate={flyOut ? {
        opacity: anyCardRevealed && !isSelected ? 0.3 : 1,
        y: 0, x: 0,
        scale: isSelected && isRevealed ? 1.09 : 1,
        rotate: 0,
        rotateY: isRevealed ? 180 : 0,
      } : { opacity: 0, y: -160, x: CARD_START_X[index], scale: 0.35, rotate: CARD_START_ROT[index] }}
      transition={{
        y: { type: 'spring', stiffness: 220, damping: 22, delay: index * 0.08 + 0.05 },
        x: { type: 'spring', stiffness: 220, damping: 22, delay: index * 0.08 + 0.05 },
        rotate: { type: 'spring', stiffness: 220, damping: 22, delay: index * 0.08 + 0.05 },
        scale: { type: 'spring', stiffness: 220, damping: 22, delay: index * 0.08 + 0.05 },
        opacity: { duration: 0.25, delay: index * 0.08 + 0.05 },
        rotateY: { duration: 0.55 },
      }}
      whileHover={flyOut && !anyCardRevealed ? { y: -10, scale: 1.05, boxShadow: '0 0 20px rgba(234,179,8,0.4)' } : {}}
      onClick={flyOut && !anyCardRevealed ? onClick : undefined}
      className="relative w-full aspect-[3/4] cursor-pointer"
      style={{ transformStyle: 'preserve-3d', perspective: 800, borderRadius: 12 }}
    >
      {/* FRONT (reward side) */}
      <div
        className="absolute inset-0 rounded-xl border-2 border-yellow-500 flex flex-col items-center justify-center gap-2 overflow-hidden"
        style={{
          transform: 'rotateY(180deg)', backfaceVisibility: 'hidden',
          background: 'linear-gradient(135deg, rgba(30,20,5,0.98) 0%, rgba(12,8,2,0.99) 100%)',
          boxShadow: '0 0 24px rgba(234,179,8,0.3)',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-transparent pointer-events-none" />
        {/* shimmer sweep */}
        {isRevealed && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.28) 50%, transparent 70%)' }}
            initial={{ x: '-100%' }} animate={{ x: '200%' }}
            transition={{ duration: 0.55, ease: 'easeInOut' }}
          />
        )}
        <div className="mb-1 animate-pulse">{getRewardIcon()}</div>
        <div className="text-center px-1">
          <div className="text-[9px] text-yellow-500/70 font-mono uppercase tracking-widest">
            {reward.type === 'WELCOME_KEYS' ? 'STARTER PACK' : 'SYSTEM DROP'}
          </div>
          <div className="text-base font-black text-white leading-none mt-1">
            {reward.type === 'WELCOME_KEYS' ? '3 KEYS' : `+${reward.amount}`}
          </div>
        </div>
      </div>

      {/* BACK (mystery side) */}
      <div
        className="absolute inset-0 rounded-xl border-2 border-gray-700 bg-black flex items-center justify-center overflow-hidden group"
        style={{ backfaceVisibility: 'hidden' }}
      >
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,#eab308_1px,transparent_1px)] bg-[size:10px_10px]" />
        <motion.div
          className="w-10 h-10 rounded-full border border-gray-600 flex items-center justify-center transition-colors text-gray-600 group-hover:border-yellow-500 group-hover:text-yellow-500"
          animate={{ rotateY: [0, 5, -5, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          <span className="font-mono font-bold text-base">?</span>
        </motion.div>
      </div>
    </motion.div>
  );
};

// ── Main Modal ────────────────────────────────────────────────────────────────
const DailyChestModal: React.FC<DailyChestModalProps> = ({ reward, onClose }) => {
  const [phase, setPhase] = useState<Phase>('idle');
  const [showFlash, setShowFlash] = useState(false);
  const [showBeam, setShowBeam] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiPos, setConfettiPos] = useState({ cx: 0, cy: 0 });
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [showReward, setShowReward] = useState(false);
  const chestRef = useRef<HTMLDivElement>(null);

  // Lock scroll + hide navbars
  useEffect(() => {
    document.body.classList.add('reforge-modal-open');
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.classList.remove('reforge-modal-open');
      document.body.style.overflow = prev;
    };
  }, []);

  // Sequence
  useEffect(() => {
    const t1 = setTimeout(() => {
      setPhase('shaking');
      playSystemSoundEffect('SYSTEM');
    }, 800);
    return () => clearTimeout(t1);
  }, []);

  // When shaking ends → open
  const handleShakeDone = useCallback(() => {
    if (phase !== 'shaking') return;
    setPhase('opening');
    playSystemSoundEffect('PURCHASE');
    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 600);
    setTimeout(() => {
      setShowBeam(true);
      setTimeout(() => setShowBeam(false), 1400);
    }, 100);

    // Fire confetti from chest position
    const rect = chestRef.current?.getBoundingClientRect();
    const cx = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const cy = rect ? rect.top + rect.height * 0.35 : window.innerHeight * 0.4;
    setConfettiPos({ cx, cy });
    setTimeout(() => {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2400);
    }, 300);

    setTimeout(() => {
      setPhase('open');
      setTimeout(() => setPhase('cards'), 400);
    }, 600);
  }, [phase]);

  const handleCardClick = (idx: number) => {
    if (phase !== 'cards' || selectedCard !== null) return;
    setSelectedCard(idx);
    playSystemSoundEffect('SYSTEM');
    setTimeout(() => {
      setShowReward(true);
      playSystemSoundEffect('LEVEL_UP');
    }, 750);
  };

  const getRewardColor = () => {
    if (reward.type === 'GOLD') return { border: 'border-yellow-500', text: 'text-yellow-500', bg: 'bg-yellow-500' };
    if (reward.type === 'XP') return { border: 'border-blue-500', text: 'text-blue-500', bg: 'bg-blue-500' };
    if (reward.type === 'DUNGEON_PASS') return { border: 'border-red-500', text: 'text-red-500', bg: 'bg-red-500' };
    return { border: 'border-purple-500', text: 'text-purple-500', bg: 'bg-purple-500' };
  };
  const colors = getRewardColor();

  const cardsFlying = phase === 'cards';

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9990] flex items-center justify-center overflow-y-auto"
      style={{ background: '#04040E' }}>

      {/* Ambient radial vignette */}
      <div className="fixed inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 38%, rgba(234,179,8,0.1) 0%, transparent 60%)' }} />

      {/* Beam + flash + confetti effects */}
      <ScreenFlash active={showFlash} />
      <LightBeamCanvas active={showBeam} />
      <ConfettiCanvas active={showConfetti} cx={confettiPos.cx} cy={confettiPos.cy} />

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-lg relative flex flex-col items-center py-6 px-4"
      >
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-[9px] font-mono tracking-[0.35em] uppercase mb-1" style={{ color: 'rgba(234,179,8,0.6)' }}>
            // Daily Transmission
          </div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tight">
            Supply Drop
          </h2>
          <motion.p
            className="text-[11px] font-mono tracking-[0.3em] mt-1.5 uppercase"
            style={{ color: 'rgba(234,179,8,0.75)' }}
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 1.6, repeat: Infinity }}
          >
            {phase === 'idle' ? 'INCOMING...' :
             phase === 'shaking' ? 'STAND BY...' :
             phase === 'opening' || phase === 'open' ? 'OPENING...' :
             selectedCard === null ? 'SELECT YOUR FATE' : 'FATE SEALED'}
          </motion.p>
        </div>

        {/* 3D Chest */}
        <motion.div
          ref={chestRef}
          animate={{ scale: cardsFlying ? 0.65 : 1, y: cardsFlying ? -8 : 0 }}
          transition={{ type: 'spring', stiffness: 180, damping: 20 }}
          className="mb-4"
        >
          <TreasureChest3D phase={phase} onOpenDone={handleShakeDone} />
        </motion.div>

        {/* Cards */}
        <div className="w-full">
          {cardsFlying && !showReward && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[10px] text-gray-500 font-mono mb-3 text-center tracking-widest uppercase"
            >
              Choose one card to reveal contents
            </motion.p>
          )}
          <div className={`grid grid-cols-4 gap-2.5 w-full ${selectedCard !== null ? 'pointer-events-none' : ''}`}>
            {[0, 1, 2, 3].map(i => (
              <RewardCard
                key={i} index={i}
                isSelected={selectedCard === i}
                isRevealed={selectedCard === i}
                onClick={() => handleCardClick(i)}
                anyCardRevealed={selectedCard !== null}
                reward={reward}
                flyOut={cardsFlying}
              />
            ))}
          </div>
        </div>

        {/* Reward reveal */}
        <AnimatePresence>
          {showReward && (
            <motion.div
              initial={{ opacity: 0, y: 20, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className={`w-full rounded-2xl p-5 mt-4 relative overflow-hidden border ${colors.border}`}
              style={{ background: 'rgba(8,8,20,0.7)' }}
            >
              <div className={`absolute inset-0 opacity-[0.04] animate-pulse ${colors.bg}`} />

              <h3 className={`font-black font-mono text-base mb-4 tracking-tighter relative z-10 uppercase text-center ${colors.text}`}>
                System Rewards Acquired
              </h3>

              <div className="flex justify-center mb-5 relative z-10">
                <div className="flex flex-col items-center gap-2">
                  <motion.div
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.4 }}
                    className={`w-16 h-16 rounded-full bg-black/50 border-2 flex items-center justify-center shadow-lg ${colors.border}`}
                  >
                    {reward.type === 'GOLD' && <Coins className={colors.text} size={28} />}
                    {(reward.type === 'WELCOME_KEYS' || reward.type === 'KEYS') && (
                      <div className="relative">
                        <Key className={colors.text} size={28} />
                        {reward.amount > 1 && (
                          <Key className={`absolute top-0 left-1.5 opacity-50 ${colors.text}`} size={28} style={{ transform: 'rotate(15deg)' }} />
                        )}
                      </div>
                    )}
                    {reward.type === 'XP' && <Zap className={colors.text} size={28} />}
                    {reward.type === 'DUNGEON_PASS' && <Ghost className={colors.text} size={28} />}
                  </motion.div>
                  <motion.span
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.55 }}
                    className="text-white font-black font-mono text-xl mt-1"
                  >
                    +{reward.amount} {reward.type === 'WELCOME_KEYS' ? 'KEYS' : reward.type.replace('_', ' ')}
                  </motion.span>
                  <span className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">
                    {reward.message}
                  </span>
                </div>
              </div>

              <motion.button
                onClick={onClose}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="w-full py-3.5 bg-white text-black font-black font-mono rounded-xl hover:bg-gray-100 transition-all uppercase tracking-widest flex items-center justify-center gap-2 relative z-10"
              >
                <CheckCircle size={16} /> Claim Rewards
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>,
    document.body
  );
};

export default DailyChestModal;
