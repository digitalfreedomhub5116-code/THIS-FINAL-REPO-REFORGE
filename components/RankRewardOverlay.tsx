import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap } from 'lucide-react';
import { SystemCoin } from './icons/SystemCoin';
import { triggerHaptic } from '../utils/soundEngine';

interface RankRewardOverlayProps {
  rank: number;
  gold: number;
  xp: number;
  username: string;
  onClaim: () => void;
}

// ── Rank Config ──
const RANK_CONFIG: Record<number, { title: string; color: string; glow: string; medal: string; bgGrad: string }> = {
  1: { title: 'FORGE SOVEREIGN', color: '#fbbf24', glow: 'rgba(251,191,36,0.6)', medal: '/images/medals/gold.png', bgGrad: 'radial-gradient(ellipse at center, rgba(251,191,36,0.12) 0%, rgba(5,5,16,0.98) 70%)' },
  2: { title: 'APEX ELITE', color: '#c0c0c0', glow: 'rgba(192,192,192,0.5)', medal: '/images/medals/silver.png', bgGrad: 'radial-gradient(ellipse at center, rgba(192,192,192,0.08) 0%, rgba(5,5,16,0.98) 70%)' },
  3: { title: 'APEX ELITE', color: '#cd7f32', glow: 'rgba(205,127,50,0.5)', medal: '/images/medals/bronze.png', bgGrad: 'radial-gradient(ellipse at center, rgba(205,127,50,0.08) 0%, rgba(5,5,16,0.98) 70%)' },
  4: { title: 'S-RANK ELITE', color: '#a855f7', glow: 'rgba(168,85,247,0.4)', medal: '', bgGrad: 'radial-gradient(ellipse at center, rgba(168,85,247,0.06) 0%, rgba(5,5,16,0.98) 70%)' },
  5: { title: 'S-RANK ELITE', color: '#a855f7', glow: 'rgba(168,85,247,0.4)', medal: '', bgGrad: 'radial-gradient(ellipse at center, rgba(168,85,247,0.06) 0%, rgba(5,5,16,0.98) 70%)' },
};
const HUNTER_CFG = { title: 'HUNTER CLASS', color: '#00d4ff', glow: 'rgba(0,212,255,0.4)', medal: '', bgGrad: 'radial-gradient(ellipse at center, rgba(0,212,255,0.06) 0%, rgba(5,5,16,0.98) 70%)' };
const PART_CFG = { title: 'ACTIVE HUNTER', color: 'rgba(255,255,255,0.6)', glow: 'rgba(255,255,255,0.2)', medal: '', bgGrad: 'radial-gradient(ellipse at center, rgba(255,255,255,0.03) 0%, rgba(5,5,16,0.98) 70%)' };
const RANK_EMOJI: Record<number, string> = { 1: '👑', 2: '🥈', 3: '🥉', 4: '🏅', 5: '🏅' };

function getCfg(r: number) { return RANK_CONFIG[r] || (r <= 10 ? HUNTER_CFG : PART_CFG); }

// ── Sound Effects ──
function playSound(type: 'rank' | 'coin' | 'claim') {
  try {
    const ac = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ac.currentTime;
    if (type === 'rank') {
      [440, 554, 659, 880].forEach((f, i) => {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0, now + i * 0.08);
        g.gain.linearRampToValueAtTime(0.12, now + i * 0.08 + 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 1.5);
        o.connect(g).connect(ac.destination); o.start(now + i * 0.08); o.stop(now + i * 0.08 + 1.5);
      });
    } else if (type === 'coin') {
      [1200, 1400, 1600].forEach((f, i) => {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = 'triangle'; o.frequency.value = f;
        g.gain.setValueAtTime(0.1, now + i * 0.06);
        g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.3);
        o.connect(g).connect(ac.destination); o.start(now + i * 0.06); o.stop(now + i * 0.06 + 0.3);
      });
    } else {
      [523, 659, 784, 1047].forEach((f, i) => {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.1, now + i * 0.1);
        g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.6);
        o.connect(g).connect(ac.destination); o.start(now + i * 0.1); o.stop(now + i * 0.1 + 0.6);
      });
    }
  } catch { /* audio not available */ }
}

// ── Confetti Canvas System ──
class ConfettiEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: any[] = [];
  private running = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }
  resize() { this.canvas.width = window.innerWidth; this.canvas.height = window.innerHeight; }

  burst(x: number, y: number, count: number, colors: string[]) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i / count) + (Math.random() - 0.5) * 0.5;
      const speed = 4 + Math.random() * 10;
      const size = 4 + Math.random() * 6;
      const shape = Math.random() > 0.6 ? 'rect' : (Math.random() > 0.5 ? 'circle' : 'star');
      this.particles.push({
        x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 3,
        size, rot: Math.random() * 360, rotS: (Math.random() - 0.5) * 15,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1, decay: 0.005 + Math.random() * 0.01, shape, g: 0.15,
      });
    }
    if (!this.running) { this.running = true; this.animate(); }
  }

  rain(count: number, colors: string[]) {
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        this.particles.push({
          x: Math.random() * this.canvas.width, y: -20,
          vx: (Math.random() - 0.5) * 2, vy: 2 + Math.random() * 4,
          size: 4 + Math.random() * 5, rot: Math.random() * 360,
          rotS: (Math.random() - 0.5) * 10,
          color: colors[Math.floor(Math.random() * colors.length)],
          life: 1, decay: 0.003 + Math.random() * 0.005, shape: 'rect', g: 0.08,
        });
      }, i * 30);
    }
    if (!this.running) { this.running = true; this.animate(); }
  }

  private animate = () => {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.particles = this.particles.filter(p => p.life > 0);
    for (const p of this.particles) {
      p.vy += p.g; p.x += p.vx; p.y += p.vy; p.rot += p.rotS; p.life -= p.decay; p.vx *= 0.99;
      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate(p.rot * Math.PI / 180);
      this.ctx.globalAlpha = Math.max(0, p.life);
      this.ctx.fillStyle = p.color;
      if (p.shape === 'rect') this.ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      else if (p.shape === 'circle') { this.ctx.beginPath(); this.ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2); this.ctx.fill(); }
      else {
        this.ctx.beginPath();
        for (let j = 0; j < 10; j++) {
          const a = (j * 36 - 90) * Math.PI / 180;
          const r = j % 2 === 0 ? p.size / 2 : p.size / 4;
          j === 0 ? this.ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r) : this.ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        this.ctx.closePath(); this.ctx.fill();
      }
      this.ctx.restore();
    }
    if (this.particles.length > 0) requestAnimationFrame(this.animate);
    else this.running = false;
  };

  destroy() { window.removeEventListener('resize', () => this.resize()); }
}

// ── Animated Counter ──
const AnimCounter: React.FC<{ value: number; prefix?: string; color: string; delay: number }> = ({ value, prefix = '+', color, delay }) => {
  const [num, setNum] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => {
      const dur = 800; const steps = 30; let step = 0;
      const iv = setInterval(() => {
        step++;
        const eased = 1 - Math.pow(1 - step / steps, 3);
        setNum(Math.round(value * eased));
        if (step >= steps) clearInterval(iv);
      }, dur / steps);
    }, delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: delay / 1000, duration: 0.4, type: 'spring' }}
      style={{ color, fontWeight: 900, fontFamily: 'var(--font-mono, monospace)', fontSize: 28 }}
    >
      {prefix}{num.toLocaleString()}
    </motion.span>
  );
};

// ═══════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════
const RankRewardOverlay: React.FC<RankRewardOverlayProps> = ({ rank, gold, xp, username, onClaim }) => {
  const [phase, setPhase] = useState(0);
  const [flash, setFlash] = useState(false);
  const [medalLoaded, setMedalLoaded] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ConfettiEngine | null>(null);
  const cfg = getCfg(rank);

  const confettiColors = rank <= 1
    ? ['#fbbf24', '#f59e0b', '#fde68a', '#fff', '#ef4444', '#60a5fa']
    : rank <= 3
    ? [cfg.color, '#fff', '#fde68a', '#60a5fa', '#a855f7']
    : [cfg.color, '#fff', '#60a5fa', '#a855f7', '#00d4ff'];

  // Init confetti engine
  useEffect(() => {
    if (canvasRef.current) engineRef.current = new ConfettiEngine(canvasRef.current);
    return () => engineRef.current?.destroy();
  }, []);

  // Phase progression
  useEffect(() => {
    const t: ReturnType<typeof setTimeout>[] = [];
    t.push(setTimeout(() => { setPhase(1); playSound('rank'); triggerHaptic('RANK_UP'); }, 400));
    t.push(setTimeout(() => {
      setPhase(2); playSound('coin'); triggerHaptic('CHEST_VIBRATE');
      setFlash(true); setTimeout(() => setFlash(false), 120);
      engineRef.current?.burst(window.innerWidth / 2, window.innerHeight * 0.35, 90, confettiColors);
    }, 2200));
    t.push(setTimeout(() => setPhase(3), 4200));
    return () => t.forEach(clearTimeout);
  }, []);

  const handleClaim = useCallback(() => {
    playSound('claim');
    triggerHaptic('PHASE_TRANSITION');
    engineRef.current?.rain(60, confettiColors);
    setTimeout(() => onClaim(), 800);
  }, [onClaim, confettiColors]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 999,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: cfg.bgGrad, fontFamily: 'var(--font-mono, monospace)', overflow: 'hidden',
      }}
    >
      {/* Confetti canvas */}
      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 50 }} />

      {/* Screen flash */}
      <div style={{
        position: 'fixed', inset: 0, background: 'white', pointerEvents: 'none', zIndex: 100,
        opacity: flash ? 0.12 : 0, transition: 'opacity 0.05s',
      }} />

      {/* Light beams */}
      <AnimatePresence>
        {phase >= 1 && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }}
            style={{
              position: 'absolute', top: '50%', left: '50%', width: 500, height: 500,
              transform: 'translate(-50%, -60%)',
              background: `conic-gradient(from 0deg, transparent, ${cfg.color}0F 10%, transparent 20%, transparent 30%, ${cfg.color}0A 40%, transparent 50%, transparent 60%, ${cfg.color}0F 70%, transparent 80%)`,
              borderRadius: '50%', filter: 'blur(2px)',
              animation: 'spin 12s linear infinite',
            }}
          />
        )}
      </AnimatePresence>

      {/* Floating particles */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {Array.from({ length: 30 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 40, x: (Math.random() - 0.5) * 250 }}
            animate={{ opacity: [0, 0.7, 0], y: [40, -180 - Math.random() * 120], x: [(Math.random() - 0.5) * 250, (Math.random() - 0.5) * 350] }}
            transition={{ duration: 2.5 + Math.random() * 1.5, delay: 0.3 + i * 0.18, ease: 'easeOut' }}
            style={{
              position: 'absolute', top: '55%', left: '50%',
              width: 3 + Math.random() * 4, height: 3 + Math.random() * 4,
              borderRadius: Math.random() > 0.5 ? '50%' : '2px',
              background: cfg.color,
              boxShadow: `0 0 ${8 + Math.random() * 8}px ${cfg.color}`,
            }}
          />
        ))}
      </div>

      {/* Shockwaves */}
      <AnimatePresence>
        {phase >= 1 && (
          <>
            <motion.div
              initial={{ scale: 0, opacity: 0.8 }} animate={{ scale: 6, opacity: 0 }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              style={{ position: 'absolute', width: 80, height: 80, borderRadius: '50%', border: `2px solid ${cfg.color}`, boxShadow: `0 0 40px ${cfg.glow}` }}
            />
            <motion.div
              initial={{ scale: 0, opacity: 0.5 }} animate={{ scale: 4, opacity: 0 }}
              transition={{ duration: 1, delay: 0.15, ease: 'easeOut' }}
              style={{ position: 'absolute', width: 60, height: 60, borderRadius: '50%', border: `1px solid ${cfg.color}` }}
            />
          </>
        )}
      </AnimatePresence>

      {/* Orbital rings */}
      <AnimatePresence>
        {phase >= 1 && [180, 240, 300].map((size, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 0.2 * i, duration: 0.5 }}
            style={{
              position: 'absolute', width: size, height: size, borderRadius: '50%',
              border: `1px ${i % 2 === 0 ? 'dashed' : 'dotted'} ${cfg.color}${i === 2 ? '14' : '22'}`,
              animation: `spin ${8 + i * 4}s linear infinite ${i % 2 === 1 ? 'reverse' : ''}`,
            }}
          />
        ))}
      </AnimatePresence>

      {/* ── PHASE 1: Medal + Rank ── */}
      <AnimatePresence>
        {phase >= 1 && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            style={{ textAlign: 'center', position: 'relative', zIndex: 20 }}
          >
            {/* Glow behind medal */}
            <motion.div
              animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 2.5, repeat: Infinity }}
              style={{
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                width: 180, height: 180, borderRadius: '50%',
                background: cfg.glow, filter: 'blur(50px)',
              }}
            />

            {/* Medal image or emoji fallback */}
            {cfg.medal ? (
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                style={{ position: 'relative', zIndex: 2 }}
              >
                <img
                  src={cfg.medal}
                  alt="Medal"
                  onLoad={() => setMedalLoaded(true)}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; setMedalLoaded(false); }}
                  style={{
                    width: 120, height: 120, objectFit: 'contain',
                    filter: `drop-shadow(0 0 30px ${cfg.glow})`,
                    display: medalLoaded || cfg.medal ? 'block' : 'none',
                  }}
                />
                {!medalLoaded && (
                  <div style={{ fontSize: 72, filter: `drop-shadow(0 0 20px ${cfg.glow})` }}>
                    {RANK_EMOJI[rank] || '⚔️'}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                style={{ fontSize: 72, position: 'relative', zIndex: 2, filter: `drop-shadow(0 0 20px ${cfg.glow})` }}
              >
                {RANK_EMOJI[rank] || '⚔️'}
              </motion.div>
            )}

            {/* Rank # */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              style={{ fontSize: 13, fontWeight: 900, color: cfg.color, letterSpacing: '0.25em', marginTop: 12, textShadow: `0 0 20px ${cfg.glow}` }}
            >
              RANK #{rank}
            </motion.div>

            {/* Title */}
            <motion.div
              initial={{ opacity: 0, y: 20, scaleX: 0 }}
              animate={{ opacity: 1, y: 0, scaleX: 1 }}
              transition={{ delay: 0.7, duration: 0.6, type: 'spring' }}
              style={{ fontSize: 22, fontWeight: 900, color: 'white', letterSpacing: '0.12em', marginTop: 4, fontFamily: 'Outfit, sans-serif', textShadow: `0 0 30px ${cfg.glow}` }}
            >
              {cfg.title}
            </motion.div>

            {/* Username */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 0.4 }}
              transition={{ delay: 1 }}
              style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 6, letterSpacing: '0.15em' }}
            >
              @{username}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── PHASE 2: Reward Cards ── */}
      <AnimatePresence>
        {phase >= 2 && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ marginTop: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, position: 'relative', zIndex: 20 }}
          >
            {/* Divider */}
            <motion.div
              initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
              transition={{ duration: 0.4 }}
              style={{ width: 220, height: 1, background: `linear-gradient(90deg, transparent, ${cfg.color}, transparent)`, marginBottom: 8 }}
            />

            {/* Gold Card */}
            <motion.div
              initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 20 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 20px', borderRadius: 16, minWidth: 260,
                background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,255,255,0.06)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.2)',
              }}>
                <SystemCoin size={28} />
              </div>
              <div>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em' }}>GOLD EARNED</span>
                <div><AnimCounter value={gold} color="#fbbf24" delay={300} /></div>
              </div>
            </motion.div>

            {/* XP Card */}
            <motion.div
              initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35, type: 'spring', stiffness: 200, damping: 20 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 20px', borderRadius: 16, minWidth: 260,
                background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,255,255,0.06)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.2)',
              }}>
                <Zap size={22} color="#60a5fa" />
              </div>
              <div>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em' }}>BONUS XP</span>
                <div><AnimCounter value={xp} color="#60a5fa" delay={600} /></div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── PHASE 3: Claim Button ── */}
      <AnimatePresence>
        {phase >= 3 && (
          <motion.button
            initial={{ opacity: 0, y: 30, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            onClick={handleClaim}
            style={{
              marginTop: 32, padding: '16px 56px', borderRadius: 16, border: 'none',
              background: `linear-gradient(135deg, ${cfg.color}, ${cfg.color}cc)`,
              color: '#0a0a1a', fontSize: 14, fontWeight: 900,
              fontFamily: 'var(--font-mono, monospace)', letterSpacing: '0.2em',
              cursor: 'pointer', position: 'relative', zIndex: 20,
              boxShadow: `0 0 40px ${cfg.glow}, 0 4px 20px rgba(0,0,0,0.4)`,
            }}
          >
            <motion.span
              animate={{ opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              CLAIM REWARDS
            </motion.span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Bottom label */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: phase >= 3 ? 0.3 : 0 }}
        transition={{ delay: 1 }}
        style={{ position: 'absolute', bottom: 40, fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.25em', textAlign: 'center' }}
      >
        DAILY LEADERBOARD REWARD
      </motion.div>
    </motion.div>
  );
};

export default RankRewardOverlay;
