/**
 * RankUpCinematic — GSAP + canvas-confetti powered rank-up celebration.
 *
 * Mirrors BorderEquipOverlay's proven animation pattern:
 *   1. Black fade backdrop
 *   2. Old rank badge scales up, shakes violently
 *   3. Old badge SHATTERS outward (clip-path shards)
 *   4. White flash + shockwave ring
 *   5. Void pulse with "FORGING NEW RANK..." text
 *   6. New badge STAMPS down from above with sun-ray glow
 *   7. MEGA confetti burst (left/right/center waves)
 *   8. "RANK UP" text + rank name reveal
 *   9. Continue button
 *
 * Psychology: delay → tension build → explosive release → dopamine
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import gsap from 'gsap';
import confetti from 'canvas-confetti';
import { RANK_META } from './RankBadge';
import type { RankType } from './RankBadge';
import { playSystemSoundEffect } from '../utils/soundEngine';

interface RankUpCinematicProps {
  oldRank: RankType;
  newRank: RankType;
  onComplete: () => void;
}

const rankName: Record<RankType, string> = {
  UNRANKED: 'Unregistered',
  E: 'Awakened Hunter',
  D: 'Iron Gate',
  C: 'Knight of the System',
  B: 'Cobalt Sovereign',
  A: 'Crimson Warlord',
  S: 'Overlord',
};

/* ── Shard configs for old badge explosion ── */
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

/* ── Color helpers ── */
const toHex = (c: string): string => {
  if (c.startsWith('#')) return c.length > 7 ? c.slice(0, 7) : c;
  const m = c.match(/rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)/);
  if (m) return '#' + [m[1], m[2], m[3]].map(v => parseInt(v).toString(16).padStart(2, '0')).join('');
  return '#C8A84E';
};

const colorShade = (hex: string, pct: number): string => {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, ((num >> 16) & 0xff) + Math.round(255 * pct)));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + Math.round(255 * pct)));
  const b = Math.min(255, Math.max(0, (num & 0xff) + Math.round(255 * pct)));
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
};

const RankUpCinematic: React.FC<RankUpCinematicProps> = ({ oldRank, newRank, onComplete }) => {
  const oldMeta = RANK_META[oldRank];
  const newMeta = RANK_META[newRank];
  const glowColor = toHex(newMeta.primary);

  // Refs
  const overlayRef = useRef<HTMLDivElement>(null);
  const oldBadgeRef = useRef<HTMLDivElement>(null);
  const shardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const flashRef = useRef<HTMLDivElement>(null);
  const shockRef = useRef<HTMLDivElement>(null);
  const voidRef = useRef<HTMLDivElement>(null);
  const voidTextRef = useRef<HTMLDivElement>(null);
  const newBadgeRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const confettiCanvasRef = useRef<HTMLCanvasElement>(null);
  const confettiRef = useRef<ReturnType<typeof confetti.create> | null>(null);
  const [visible, setVisible] = useState(false);

  const confettiColors = [glowColor, colorShade(glowColor, 0.15), colorShade(glowColor, -0.12), '#c0c0c0', '#d4d4d4', '#ffffff'];
  const confettiColorsCenter = [colorShade(glowColor, 0.15), '#d4d4d4', '#ffffff', glowColor];

  // Sun ray starburst
  const sunRayGradient = (() => {
    const stops: string[] = [];
    for (let i = 0; i < 12; i++) {
      const s = i * 30;
      stops.push(`transparent ${s}deg`, `${glowColor}65 ${s + 2}deg`, `${glowColor}65 ${s + 7}deg`, `transparent ${s + 9}deg`);
    }
    return `conic-gradient(from 0deg, ${stops.join(', ')})`;
  })();

  // Create confetti instance
  useEffect(() => {
    if (visible && confettiCanvasRef.current && !confettiRef.current) {
      confettiRef.current = confetti.create(confettiCanvasRef.current, { resize: true, useWorker: true });
    }
    return () => { if (confettiRef.current) { confettiRef.current.reset(); confettiRef.current = null; } };
  }, [visible]);

  const handleComplete = useCallback(() => {
    if (tlRef.current) tlRef.current.kill();
    const el = overlayRef.current;
    if (!el) { setVisible(false); onComplete(); return; }
    gsap.to(el, { opacity: 0, duration: 0.25, onComplete: () => { setVisible(false); onComplete(); } });
  }, [onComplete]);

  const fireMegaConfetti = useCallback(() => {
    const fire = confettiRef.current || confetti;
    // Left burst
    fire({ particleCount: 150, angle: 55, spread: 75, origin: { x: 0.05, y: 1 }, colors: confettiColors, startVelocity: 50, gravity: 0.9, drift: 0.5, scalar: 1.6, ticks: 450, decay: 0.93, shapes: ['circle', 'square'] as any, disableForReducedMotion: true });
    // Right burst
    fire({ particleCount: 150, angle: 125, spread: 75, origin: { x: 0.95, y: 1 }, colors: confettiColors, startVelocity: 50, gravity: 0.9, drift: -0.5, scalar: 1.6, ticks: 450, decay: 0.93, shapes: ['circle', 'square'] as any, disableForReducedMotion: true });
    // Center sparkle
    setTimeout(() => {
      const f = confettiRef.current || confetti;
      f({ particleCount: 60, spread: 100, origin: { x: 0.5, y: 0.55 }, colors: confettiColorsCenter, startVelocity: 28, gravity: 0.8, scalar: 1.3, ticks: 400, decay: 0.91, shapes: ['circle'] as any, disableForReducedMotion: true });
    }, 100);
    // 3rd wave — side shower
    setTimeout(() => {
      const f = confettiRef.current || confetti;
      f({ particleCount: 80, angle: 60, spread: 55, origin: { x: 0.1, y: 0.8 }, colors: confettiColors, startVelocity: 35, gravity: 0.85, scalar: 1.4, ticks: 400, decay: 0.92, shapes: ['circle', 'square'] as any, disableForReducedMotion: true });
      f({ particleCount: 80, angle: 120, spread: 55, origin: { x: 0.9, y: 0.8 }, colors: confettiColors, startVelocity: 35, gravity: 0.85, scalar: 1.4, ticks: 400, decay: 0.92, shapes: ['circle', 'square'] as any, disableForReducedMotion: true });
    }, 400);
    // 4th wave — rain from top
    setTimeout(() => {
      const f = confettiRef.current || confetti;
      f({ particleCount: 50, angle: 270, spread: 120, origin: { x: 0.5, y: -0.1 }, colors: confettiColorsCenter, startVelocity: 25, gravity: 1.2, scalar: 1.2, ticks: 350, decay: 0.93, shapes: ['circle', 'square'] as any, disableForReducedMotion: true });
    }, 650);
  }, [confettiColors, confettiColorsCenter]);

  useEffect(() => {
    setVisible(true);
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const overlay = overlayRef.current;
        const oldBadge = oldBadgeRef.current;
        const newBadge = newBadgeRef.current;
        const glow = glowRef.current;
        const flash = flashRef.current;
        const shock = shockRef.current;
        const voidPulse = voidRef.current;
        const voidText = voidTextRef.current;
        const label = labelRef.current;
        const btn = btnRef.current;
        if (!overlay || !oldBadge || !newBadge || !label || !btn) return;

        // Reset all elements
        gsap.set(overlay, { opacity: 0 });
        gsap.set(oldBadge, { scale: 0.5, opacity: 0 });
        gsap.set(newBadge, { y: -200, scale: 1.4, opacity: 0 });
        if (glow) gsap.set(glow, { scale: 0.3, opacity: 0 });
        if (flash) gsap.set(flash, { opacity: 0 });
        if (shock) gsap.set(shock, { scale: 0, opacity: 0 });
        if (voidPulse) gsap.set(voidPulse, { scale: 0, opacity: 0 });
        if (voidText) gsap.set(voidText, { opacity: 0 });
        gsap.set(label, { opacity: 0, y: 30 });
        gsap.set(btn, { opacity: 0, y: 20 });
        shardRefs.current.forEach(s => { if (s) gsap.set(s, { x: 0, y: 0, rotation: 0, opacity: 1, scale: 1 }); });

        const tl = gsap.timeline();
        tlRef.current = tl;

        // ═══ ACT 1: DISPLAY OLD BADGE (0s – 1s) ═══
        tl.to(overlay, { opacity: 1, duration: 0.4, ease: 'power2.out' });
        tl.to(oldBadge, { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.7)' }, '-=0.1');

        // ═══ ACT 2: VIOLENT CRACK/SHAKE (1s – 1.8s) ═══
        tl.to(oldBadge, {
          duration: 0.8, ease: 'power2.inOut',
          keyframes: [
            { scale: 1.05, x: -6, y: 4, rotation: -2, duration: 0.1 },
            { scale: 0.97, x: 8, y: -6, rotation: 3, duration: 0.1 },
            { scale: 1.08, x: -10, y: 8, rotation: -4, duration: 0.1 },
            { scale: 0.95, x: 12, y: -10, rotation: 3, duration: 0.1 },
            { scale: 1.1, x: -8, y: 5, rotation: -2, duration: 0.1 },
            { scale: 0.93, x: 10, y: -7, rotation: 4, duration: 0.1 },
            { scale: 1.15, x: -5, y: 9, rotation: -3, duration: 0.1 },
            { scale: 1.18, x: 0, y: 0, rotation: 0, duration: 0.1 },
          ],
        }, '+=0.5');

        // ═══ ACT 3: SHATTER + FLASH (1.8s – 2.3s) ═══
        tl.to(oldBadge, { opacity: 0, scale: 0, duration: 0.01 });
        tl.call(() => { playSystemSoundEffect('RANK_UP'); });

        // Shard explosion
        shardRefs.current.forEach((s, i) => {
          if (!s) return;
          const cfg = SHARD_CONFIGS[i];
          tl.to(s, {
            x: cfg.dx * 120, y: cfg.dy * 120, rotation: cfg.rot * 2,
            opacity: 0, scale: 0.2, duration: 0.5, ease: 'power2.out',
          }, '<');
        });

        // White flash
        if (flash) tl.fromTo(flash, { opacity: 0 }, { opacity: 0.8, duration: 0.12, yoyo: true, repeat: 1 }, '<');
        // Shockwave ring
        if (shock) tl.fromTo(shock, { scale: 0, opacity: 1 }, { scale: 6, opacity: 0, duration: 0.55, ease: 'power2.out' }, '<');

        // ═══ ACT 4: VOID PULSE (2.3s – 2.8s) ═══
        if (voidPulse) tl.fromTo(voidPulse, { scale: 0, opacity: 0 }, { scale: 2.5, opacity: 0.6, duration: 0.5, ease: 'power2.out' }, '+=0.2');
        if (voidText) tl.fromTo(voidText, { opacity: 0 }, { opacity: 1, duration: 0.3 }, '-=0.3');
        // Hide void
        if (voidPulse) tl.to(voidPulse, { opacity: 0, duration: 0.3 }, '+=0.3');
        if (voidText) tl.to(voidText, { opacity: 0, duration: 0.2 }, '<');

        // ═══ ACT 5: NEW BADGE STAMPS DOWN (3.1s – 3.8s) ═══
        tl.to(newBadge, {
          y: 0, scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(2.5)',
          onComplete: fireMegaConfetti,
        }, '-=0.1');

        // ═══ ACT 6: GLOW BLOOMS ═══
        if (glow) {
          tl.to(glow, { scale: 1, opacity: 0.8, duration: 0.7, ease: 'power2.out' }, '-=0.3');
          tl.to(glow, { scale: 1.15, opacity: 0.5, duration: 2, ease: 'sine.inOut', yoyo: true, repeat: -1 }, '+=0.1');
        }

        // Badge breathing loop
        tl.to(newBadge, { scale: 1.04, duration: 2.5, ease: 'sine.inOut', yoyo: true, repeat: -1 }, '-=2');

        // ═══ ACT 7: TEXT REVEAL ═══
        tl.to(label, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }, glow ? '-=2.0' : '-=0.3');
        tl.to(btn, { opacity: 1, y: 0, duration: 0.4, ease: 'power3.out' }, '-=0.2');
      });
    });

    return () => { cancelAnimationFrame(raf); if (tlRef.current) tlRef.current.kill(); };
  }, []);

  if (!visible) return null;

  const badgeSize = 150;
  const containerSize = 320;

  return ReactDOM.createPortal(
    <div ref={overlayRef} style={{
      position: 'fixed', inset: 0, zIndex: 100000,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.96)', opacity: 0, overflow: 'hidden',
    }}>
      {/* Confetti canvas */}
      <canvas ref={confettiCanvasRef} style={{
        position: 'fixed', inset: 0, width: '100%', height: '100%',
        pointerEvents: 'none', zIndex: 99999, transform: 'translateZ(0)',
      }} />

      {/* Grid lines (subtle) */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: `linear-gradient(${glowColor}06 1px, transparent 1px), linear-gradient(90deg, ${glowColor}06 1px, transparent 1px)`,
        backgroundSize: '48px 48px',
      }} />

      {/* Main stage */}
      <div style={{
        position: 'relative', width: containerSize, height: containerSize,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'visible', flexShrink: 0,
      }}>
        {/* Sun ray glow (behind badge) */}
        <div style={{
          position: 'absolute', width: '150vmax', height: '150vmax',
          top: '50%', left: '50%', transform: 'translate3d(-50%, -50%, 0)',
          pointerEvents: 'none', zIndex: 0, overflow: 'visible',
        }}>
          <div ref={glowRef} style={{ width: '100%', height: '100%', borderRadius: '50%', position: 'relative', overflow: 'visible' }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: `radial-gradient(circle, ${glowColor}60 0%, ${glowColor}30 40%, transparent 70%)` }} />
            <div style={{
              position: 'absolute', inset: '-35%', background: sunRayGradient, borderRadius: '50%',
              animation: 'sunray-rotate 25s linear infinite', filter: 'blur(6px)', opacity: 0.85,
              willChange: 'transform', transform: 'translate3d(0,0,0)',
            }} />
            <div style={{ position: 'absolute', inset: '12%', borderRadius: '50%', background: `radial-gradient(circle, ${glowColor}55 0%, transparent 65%)` }} />
          </div>
        </div>

        {/* OLD badge (visible initially, then shakes + disappears) */}
        <div ref={oldBadgeRef} style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <img src={oldMeta.image} alt={`${oldRank} Rank`} draggable={false}
            style={{ width: badgeSize - 20, height: badgeSize - 20, objectFit: 'contain' }} />
        </div>

        {/* SHARD explosion pieces (copies of old badge with clip-path) */}
        {SHARD_CONFIGS.map((shard, i) => (
          <div key={`shard-${i}`} ref={el => { shardRefs.current[i] = el; }}
            style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              width: badgeSize, height: badgeSize, zIndex: 11, pointerEvents: 'none', opacity: 0,
            }}>
            <img src={oldMeta.image} alt="" draggable={false}
              style={{ width: '100%', height: '100%', objectFit: 'contain', clipPath: shard.clip }} />
          </div>
        ))}

        {/* White flash */}
        <div ref={flashRef} style={{
          position: 'fixed', inset: 0, background: 'white', zIndex: 30, pointerEvents: 'none', opacity: 0,
        }} />

        {/* Shockwave ring */}
        <div ref={shockRef} style={{
          position: 'absolute', width: 60, height: 60, borderRadius: '50%',
          border: `3px solid ${toHex(oldMeta.primary)}`, zIndex: 12, pointerEvents: 'none',
        }} />

        {/* Void pulse */}
        <div ref={voidRef} style={{
          position: 'absolute', width: 120, height: 120, borderRadius: '50%',
          background: `radial-gradient(circle, ${glowColor}60, transparent 70%)`,
          zIndex: 12, pointerEvents: 'none',
        }} />

        {/* Void text */}
        <div ref={voidTextRef} style={{
          position: 'absolute', bottom: -10, zIndex: 12,
          fontSize: 9, fontFamily: 'monospace', fontWeight: 700,
          letterSpacing: '0.4em', textTransform: 'uppercase',
          color: glowColor, opacity: 0,
        }}>
          FORGING NEW RANK...
        </div>

        {/* NEW badge (stamps down from above) */}
        <div ref={newBadgeRef} style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          zIndex: 15, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <img src={newMeta.image} alt={`${newRank} Rank`} draggable={false}
            style={{
              width: badgeSize, height: badgeSize, objectFit: 'contain',
              filter: `drop-shadow(0 0 20px ${glowColor}60)`,
            }} />
        </div>
      </div>

      {/* Text + Button */}
      <div ref={labelRef} style={{ marginTop: 24, textAlign: 'center', position: 'relative', zIndex: 2, opacity: 0 }}>
        <div style={{
          fontSize: 10, fontWeight: 900, letterSpacing: '0.4em', fontFamily: 'monospace',
          textTransform: 'uppercase', color: glowColor, marginBottom: 8,
        }}>
          ── SYSTEM ALERT ──
        </div>
        <div style={{
          fontSize: 32, fontWeight: 900, letterSpacing: '0.1em', fontFamily: 'Inter, system-ui, sans-serif',
          color: '#fff', textShadow: `0 0 20px ${glowColor}, 0 0 40px ${glowColor}80, 0 0 80px ${glowColor}40`,
          marginBottom: 8,
        }}>
          {oldRank === 'UNRANKED' ? 'RANK ASSIGNED' : 'RANK UP'}
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
          fontSize: 22, fontWeight: 900, fontFamily: 'monospace', marginBottom: 6,
        }}>
          <span style={{ color: toHex(oldMeta.primary), opacity: 0.6 }}>{oldRank === 'UNRANKED' ? '?' : oldRank}</span>
          <span style={{ color: '#555', fontSize: 18 }}>→</span>
          <span style={{ color: newMeta.labelColor, textShadow: `0 0 12px ${newMeta.glow}` }}>{newRank}</span>
        </div>
        <div style={{
          fontSize: 13, fontWeight: 700, letterSpacing: '0.25em', fontFamily: 'monospace',
          textTransform: 'uppercase', color: glowColor, marginBottom: 12,
        }}>
          {rankName[newRank]}
        </div>
        <div style={{
          fontSize: 11, color: '#666', fontFamily: 'monospace', maxWidth: 280,
          margin: '0 auto', lineHeight: 1.6,
        }}>
          {newRank === 'S'
            ? '"You have surpassed all known limits. The System acknowledges your ascension."'
            : oldRank === 'UNRANKED'
              ? '"The System has scanned your potential. Your rank has been assigned."'
              : '"A new gate opens before you. The System has recognized your power."'}
        </div>
      </div>

      <button ref={btnRef} onClick={handleComplete} style={{
        marginTop: 28, padding: '14px 56px', borderRadius: 16,
        background: `linear-gradient(135deg, ${glowColor}, ${colorShade(glowColor, -0.2)})`,
        border: `1.5px solid ${colorShade(glowColor, 0.15)}`, color: '#000',
        fontSize: 13, fontWeight: 800, letterSpacing: '0.18em', cursor: 'pointer',
        fontFamily: 'Inter, system-ui, sans-serif', textTransform: 'uppercase',
        boxShadow: `0 0 30px ${glowColor}60, 0 4px 20px rgba(0,0,0,0.4)`,
        transition: 'transform 0.15s', position: 'relative', zIndex: 2, opacity: 0,
      }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
      >
        Continue
      </button>

      <style>{`
        @keyframes sunray-rotate { from { transform: translate3d(0,0,0) rotate(0deg); } to { transform: translate3d(0,0,0) rotate(360deg); } }
      `}</style>
    </div>,
    document.body
  );
};

export default RankUpCinematic;
