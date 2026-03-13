import React, { useEffect, useRef, useCallback } from 'react';

interface ConfettiParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  rotSpeed: number;
  opacity: number;
  life: number;
  maxLife: number;
}

const THEME_COLORS_SMALL = [
  'rgba(251,191,36,0.9)',   // gold
  'rgba(168,85,247,0.8)',   // purple
  'rgba(0,210,255,0.8)',    // cyan
  'rgba(255,255,255,0.6)',  // white
  'rgba(139,92,246,0.7)',   // violet
];

const THEME_COLORS_LARGE = [
  'rgba(251,191,36,1)',     // gold
  'rgba(251,191,36,0.8)',   // gold
  'rgba(217,119,6,0.9)',    // amber
  'rgba(234,179,8,0.9)',    // yellow
  'rgba(168,85,247,0.7)',   // purple
  'rgba(255,255,255,0.5)',  // white shimmer
];

const ConfettiOverlay: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const particlesRef = useRef<ConfettiParticle[]>([]);
  const activeRef = useRef(false);

  const spawnConfetti = useCallback((intensity: 'small' | 'large', originX?: number, originY?: number) => {
    const count = intensity === 'large' ? 80 : 30;
    const colors = intensity === 'large' ? THEME_COLORS_LARGE : THEME_COLORS_SMALL;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const cx = originX ?? canvas.width / 2;
    const cy = originY ?? canvas.height / 2;
    const maxLife = intensity === 'large' ? 120 : 60;
    const spread = intensity === 'large' ? 12 : 7;

    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x: cx + (Math.random() - 0.5) * 40,
        y: cy + (Math.random() - 0.5) * 40,
        vx: (Math.random() - 0.5) * spread,
        vy: -Math.random() * spread - 2,
        size: intensity === 'large' ? 3 + Math.random() * 5 : 2 + Math.random() * 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.3,
        opacity: 1,
        life: 0,
        maxLife: maxLife + Math.random() * 30,
      });
    }

    if (!activeRef.current) {
      activeRef.current = true;
      draw();
    }
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const alive: ConfettiParticle[] = [];

    for (const p of particlesRef.current) {
      p.life++;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15; // gravity
      p.vx *= 0.99; // air resistance
      p.rotation += p.rotSpeed;
      p.opacity = Math.max(0, 1 - p.life / p.maxLife);

      if (p.life < p.maxLife && p.opacity > 0) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
        alive.push(p);
      }
    }

    particlesRef.current = alive;

    if (alive.length > 0) {
      animRef.current = requestAnimationFrame(draw);
    } else {
      activeRef.current = false;
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const handleConfetti = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      const intensity: 'small' | 'large' = detail.intensity || 'small';
      const origin: DOMRect | null = detail.origin || null;
      const ox = origin ? origin.left + origin.width / 2 : undefined;
      const oy = origin ? origin.top + origin.height / 2 : undefined;
      spawnConfetti(intensity, ox, oy);
    };

    window.addEventListener('reforge:confetti', handleConfetti);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
      window.removeEventListener('reforge:confetti', handleConfetti);
    };
  }, [spawnConfetti]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 95 }}
    />
  );
};

export default ConfettiOverlay;
