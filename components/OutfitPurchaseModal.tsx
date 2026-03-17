import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock } from 'lucide-react';
import { Outfit } from '../types';

interface Props {
  outfit: Outfit;
  gold: number;
  isUnlocked: boolean;
  onPurchase: (outfit: Outfit) => void;
  onEquip: (id: string) => void;
  onClose: () => void;
}

// ── Particle system ──────────────────────────────────────────────────────────

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  spin: number;
  spinRate: number;
  shape: 'rect' | 'diamond' | 'circle';
  w: number;
  h: number;
  glow: number;
  life: number;
  maxLife: number;
}

function makeParticles(cx: number, cy: number, accent: string): Particle[] {
  const COLORS = [accent, '#FFD700', '#C0A050', '#FFFFFF', '#E8D5A0', '#7B5EA7', accent, '#FFD700'];
  const SHAPES: Particle['shape'][] = ['rect', 'rect', 'diamond', 'circle', 'rect', 'diamond'];
  const count = 130;
  return Array.from({ length: count }, (): Particle => {
    const angleDeg = -90 + (Math.random() - 0.5) * 110;
    const angleRad = (angleDeg * Math.PI) / 180;
    const speed = 5 + Math.random() * 11;
    const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    const size = shape === 'circle' ? 3 + Math.random() * 5 : 4 + Math.random() * 8;
    const maxLife = 90 + Math.random() * 40;
    return {
      x: cx + (Math.random() - 0.5) * 60,
      y: cy,
      vx: Math.cos(angleRad) * speed * (0.6 + Math.random() * 0.8),
      vy: Math.sin(angleRad) * speed,
      size,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      alpha: 1,
      spin: Math.random() * Math.PI * 2,
      spinRate: (Math.random() - 0.5) * 0.28,
      shape,
      w: size,
      h: size * (0.3 + Math.random() * 0.5),
      glow: Math.random() > 0.55 ? 4 + Math.random() * 8 : 0,
      life: 0,
      maxLife,
    };
  });
}

function drawParticle(ctx: CanvasRenderingContext2D, p: Particle) {
  ctx.save();
  ctx.globalAlpha = p.alpha;
  if (p.glow > 0) {
    ctx.shadowBlur = p.glow;
    ctx.shadowColor = p.color;
  }
  ctx.fillStyle = p.color;
  ctx.translate(p.x, p.y);
  ctx.rotate(p.spin);

  if (p.shape === 'rect') {
    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
  } else if (p.shape === 'diamond') {
    const s = p.size * 0.6;
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(s * 0.55, 0);
    ctx.lineTo(0, s);
    ctx.lineTo(-s * 0.55, 0);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, p.size * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ── Modal component ──────────────────────────────────────────────────────────

const OutfitPurchaseModal: React.FC<Props> = ({
  outfit,
  gold,
  isUnlocked,
  onPurchase,
  onEquip,
  onClose,
}) => {
  const introRef = useRef<HTMLVideoElement>(null);
  const loopRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);

  const [videoPhase, setVideoPhase] = useState<'intro' | 'loop' | 'image'>('image');
  const [purchased, setPurchased] = useState(false);
  const [showUnlocked, setShowUnlocked] = useState(false);

  const accent = outfit.accentColor || '#FFD700';
  const canAfford = gold >= outfit.cost;
  const isFree = outfit.cost === 0;

  // Video sequence
  const startVideoSequence = useCallback(() => {
    if (outfit.introVideoUrl && introRef.current) {
      setVideoPhase('intro');
      introRef.current.currentTime = 0;
      introRef.current.play().catch(() => {
        if (outfit.loopVideoUrl) setVideoPhase('loop');
        else setVideoPhase('image');
      });
    } else if (outfit.loopVideoUrl) {
      setVideoPhase('loop');
    } else {
      setVideoPhase('image');
    }
  }, [outfit]);

  useEffect(() => {
    startVideoSequence();
    return () => {
      introRef.current?.pause();
      loopRef.current?.pause();
    };
  }, [startVideoSequence]);

  useEffect(() => {
    const vid = introRef.current;
    if (!vid) return;
    const onEnded = () => {
      if (outfit.loopVideoUrl) setVideoPhase('loop');
      else setVideoPhase('image');
    };
    vid.addEventListener('ended', onEnded);
    return () => vid.removeEventListener('ended', onEnded);
  }, [outfit]);

  useEffect(() => {
    if (videoPhase === 'loop' && loopRef.current) {
      loopRef.current.currentTime = 0;
      loopRef.current.play().catch(() => setVideoPhase('image'));
    }
  }, [videoPhase]);

  // Confetti canvas animation
  const runConfetti = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const cx = canvas.width / 2;
    const cy = canvas.height * 0.72;
    particlesRef.current = makeParticles(cx, cy, accent);

    const GRAVITY = 0.22;
    const DRAG = 0.985;

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      for (const p of particlesRef.current) {
        p.life++;
        p.vy += GRAVITY;
        p.vx *= DRAG;
        p.x += p.vx;
        p.y += p.vy;
        p.spin += p.spinRate;
        p.alpha = Math.max(0, 1 - p.life / p.maxLife);
        if (p.alpha > 0) {
          alive = true;
          drawParticle(ctx, p);
        }
      }
      if (alive) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [accent]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Hide navbars + lock scroll while modal is open
  useEffect(() => {
    document.body.classList.add('reforge-modal-open');
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.classList.remove('reforge-modal-open');
      document.body.style.overflow = prev;
    };
  }, []);

  const handleBuy = () => {
    if (purchased) return;
    setPurchased(true);
    setShowUnlocked(true);
    runConfetti();

    setTimeout(() => {
      onPurchase(outfit);
    }, 80);

    setTimeout(() => {
      onEquip(outfit.id);
    }, 200);

    setTimeout(() => {
      onClose();
    }, 2200);
  };

  const handleEquip = () => {
    onEquip(outfit.id);
    onClose();
  };

  const tierColors: Record<string, string> = {
    S: '#f87171', A: '#facc15', B: '#c084fc',
    C: '#60a5fa', D: '#4ade80', E: '#9ca3af',
  };
  const tierColor = tierColors[outfit.tier || 'E'] || '#9ca3af';

  return ReactDOM.createPortal(
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[9999] flex flex-col"
        style={{ background: '#0A0A0F' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
      >
        {/* ── VIDEO SECTION (top ~75%) ── */}
        <motion.div
          className="relative flex-1 overflow-hidden"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        >
          {/* Intro video */}
          <video
            ref={introRef}
            src={outfit.introVideoUrl}
            muted
            playsInline
            preload="auto"
            poster="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
            className="absolute inset-0 w-full h-full object-cover bg-transparent"
            style={{ display: videoPhase === 'intro' ? 'block' : 'none' }}
          />

          {/* Loop video */}
          <video
            ref={loopRef}
            src={outfit.loopVideoUrl}
            muted
            playsInline
            loop
            preload="auto"
            poster="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
            className="absolute inset-0 w-full h-full object-cover bg-transparent"
            style={{ display: videoPhase === 'loop' ? 'block' : 'none' }}
          />

          {/* Image fallback */}
          {videoPhase === 'image' && outfit.image && (
            <img
              src={outfit.image}
              alt={outfit.name}
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}

          {/* 4-sided vignette */}
          <div className="absolute inset-0 pointer-events-none">
            {/* bottom — strongest */}
            <div className="absolute inset-x-0 bottom-0" style={{ height: '50%', background: 'linear-gradient(to top, #0A0A0F 0%, transparent 100%)' }} />
            {/* top */}
            <div className="absolute inset-x-0 top-0" style={{ height: '22%', background: 'linear-gradient(to bottom, #0A0A0F 0%, transparent 100%)' }} />
            {/* left */}
            <div className="absolute inset-y-0 left-0" style={{ width: 64, background: 'linear-gradient(to right, #0A0A0F 0%, transparent 100%)' }} />
            {/* right */}
            <div className="absolute inset-y-0 right-0" style={{ width: 48, background: 'linear-gradient(to left, #0A0A0F 0%, transparent 100%)' }} />
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full flex items-center justify-center transition-all hover:bg-white/10"
            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.12)' }}
          >
            <X size={16} className="text-gray-300" />
          </button>

          {/* Tier badge top-left */}
          <div className="absolute top-4 left-4 z-10">
            <div
              className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest"
              style={{ background: tierColor + '22', border: `1px solid ${tierColor}55`, color: tierColor }}
            >
              {outfit.tier}-Rank
            </div>
          </div>

          {/* "UNLOCKED" flash text */}
          <AnimatePresence>
            {showUnlocked && (
              <motion.div
                className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1.05, opacity: 1 }}
                exit={{ scale: 1.3, opacity: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              >
                <div className="text-center">
                  <div
                    className="text-5xl font-black uppercase tracking-[0.2em] leading-none"
                    style={{
                      background: `linear-gradient(135deg, #FFFFFF 0%, ${accent} 50%, #FFD700 100%)`,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      filter: `drop-shadow(0 0 24px ${accent}cc)`,
                    }}
                  >
                    UNLOCKED
                  </div>
                  <div className="text-sm font-bold tracking-widest mt-2" style={{ color: accent + 'cc' }}>
                    {outfit.name}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── BOTTOM BAR ── */}
        <motion.div
          className="px-6 pt-4 pb-8 flex-shrink-0"
          style={{ background: 'linear-gradient(to top, #0A0A0F 80%, transparent)' }}
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.35, delay: 0.1, ease: 'easeOut' }}
        >
          {/* Name + tier row */}
          <div className="mb-3">
            <div className="text-[10px] font-mono tracking-[0.25em] uppercase mb-0.5" style={{ color: accent + '88' }}>
              // Monarch's Wardrobe
            </div>
            <div className="text-xl font-black uppercase tracking-tight text-white leading-none">
              {outfit.name}
            </div>
          </div>

          {/* Price row */}
          {!isUnlocked && (
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black"
                style={{ background: '#FFD700', color: '#000' }}
              >
                G
              </div>
              <span className="text-lg font-black text-white">
                {isFree ? 'FREE' : outfit.cost.toLocaleString()}
              </span>
              {!isFree && (
                <span className="text-xs text-gray-500 font-mono">gold</span>
              )}
              {!canAfford && !isFree && (
                <span className="ml-auto text-[10px] text-red-500 font-bold uppercase tracking-widest flex items-center gap-1">
                  <Lock size={10} /> Need {(outfit.cost - gold).toLocaleString()} more
                </span>
              )}
            </div>
          )}

          {/* Action button */}
          {isUnlocked ? (
            <button
              onClick={handleEquip}
              className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
              style={{
                background: `linear-gradient(135deg, ${accent}, ${accent}bb)`,
                boxShadow: `0 6px 28px ${accent}55`,
                color: '#000',
              }}
            >
              ⚡ EQUIP NOW
            </button>
          ) : (canAfford || isFree) ? (
            <button
              onClick={handleBuy}
              disabled={purchased}
              className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60"
              style={{
                background: purchased
                  ? 'rgba(255,255,255,0.06)'
                  : 'linear-gradient(135deg, #FFD700, #e6b800)',
                boxShadow: purchased ? 'none' : '0 6px 28px rgba(255,215,0,0.45)',
                color: purchased ? '#6b7280' : '#000',
              }}
            >
              {purchased ? '✓ PURCHASED' : `BUY NOW — ${isFree ? 'FREE' : outfit.cost.toLocaleString() + 'G'}`}
            </button>
          ) : (
            <button
              disabled
              className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 cursor-not-allowed"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(255,255,255,0.09)', color: '#4b5563' }}
            >
              <Lock size={14} /> INSUFFICIENT GOLD
            </button>
          )}
        </motion.div>

        {/* Confetti canvas — on top of everything */}
        <canvas
          ref={canvasRef}
          className="fixed inset-0 pointer-events-none z-[10000]"
          style={{ display: purchased ? 'block' : 'none' }}
        />
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

export default OutfitPurchaseModal;
