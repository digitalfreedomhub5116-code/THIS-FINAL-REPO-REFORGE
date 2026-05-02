/**
 * BorderEquipOverlay — GSAP-powered equip animation.
 *
 * Flow:
 *   1. Black fade overlay
 *   2. User's PFP appears (scales up)
 *   3. Border STAMPS down from above, snaps around PFP
 *   4. Glow pulses from behind
 *   5. "✓ EQUIPPED" + border name
 *   6. "Continue" button
 */
import React, { useEffect, useRef, useCallback, useState } from 'react';
import gsap from 'gsap';
import confetti from 'canvas-confetti';
import type { StoreItem } from '../utils/storeItems';

interface BorderEquipOverlayProps {
  show: boolean;
  borderItem: StoreItem | null;
  avatarUrl?: string | null;
  onComplete: () => void;
}

const BorderEquipOverlay: React.FC<BorderEquipOverlayProps> = ({
  show,
  borderItem,
  avatarUrl,
  onComplete,
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);
  const borderRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const [visible, setVisible] = useState(false);

  const glowColor = borderItem?.auraConfig?.colors?.[0] ||
    borderItem?.borderConfig?.glowColor ||
    borderItem?.borderConfig?.colors?.[0] ||
    '#C8A84E';

  // ── Sun ray starburst gradient (12 thick beams) ──
  const sunRayGradient = (() => {
    const beams = 12;
    const w = 9;
    const stops: string[] = [];
    for (let i = 0; i < beams; i++) {
      const s = i * 30;
      stops.push(`transparent ${s}deg`);
      stops.push(`${glowColor}65 ${s + 2}deg`);
      stops.push(`${glowColor}65 ${s + w - 2}deg`);
      stops.push(`transparent ${s + w}deg`);
    }
    return `conic-gradient(from 0deg, ${stops.join(', ')})`;
  })();

  const handleComplete = useCallback(() => {
    if (tlRef.current) tlRef.current.kill();
    const el = overlayRef.current;
    if (!el) { setVisible(false); onComplete(); return; }
    gsap.to(el, {
      opacity: 0,
      duration: 0.25,
      onComplete: () => { setVisible(false); onComplete(); },
    });
  }, [onComplete]);

  useEffect(() => {
    if (!show || !borderItem) {
      setVisible(false);
      return;
    }

    setVisible(true);

    // Wait 2 frames for DOM
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const overlay = overlayRef.current;
        const avatar = avatarRef.current;
        const border = borderRef.current;
        const glow = glowRef.current;
        const btn = btnRef.current;
        const label = labelRef.current;

        if (!overlay || !avatar || !btn || !label) return;

        // Reset
        gsap.set(overlay, { opacity: 0 });
        gsap.set(avatar, { scale: 0, opacity: 0 });
        if (border) gsap.set(border, { y: -200, scale: 1.4, opacity: 0 });
        if (glow) gsap.set(glow, { scale: 0.3, opacity: 0 });
        gsap.set(label, { opacity: 0, y: 20 });
        gsap.set(btn, { opacity: 0, y: 20 });

        // ═══ GSAP Timeline ═══
        const tl = gsap.timeline();
        tlRef.current = tl;

        // 1. Backdrop
        tl.to(overlay, { opacity: 1, duration: 0.4, ease: 'power2.out' });

        // 2. PFP appears
        tl.to(avatar, {
          scale: 1, opacity: 1, duration: 0.5,
          ease: 'back.out(1.7)',
        }, '-=0.1');

        // 3. Border STAMPS from above (comes down, snaps to place)
        if (border) {
          tl.to(border, {
            y: 0, scale: 1, opacity: 1, duration: 0.45,
            ease: 'back.out(2.5)',
            onComplete: () => {
              // ── MEGA Confetti celebration burst ──
              const cyanGrey = ['#7EB8D4', '#9ACDE3', '#5a9ab5', '#c0c0c0', '#808080', '#d4d4d4', '#ffffff'];
              // Left corner burst — 3× bigger
              confetti({
                particleCount: 150,
                angle: 55,
                spread: 75,
                origin: { x: 0.05, y: 1 },
                colors: cyanGrey,
                startVelocity: 50,
                gravity: 0.9,
                drift: 0.5,
                scalar: 1.6,
                ticks: 450,
                decay: 0.93,
                shapes: ['circle', 'square'],
                disableForReducedMotion: true,
              });
              // Right corner burst — 3× bigger
              confetti({
                particleCount: 150,
                angle: 125,
                spread: 75,
                origin: { x: 0.95, y: 1 },
                colors: cyanGrey,
                startVelocity: 50,
                gravity: 0.9,
                drift: -0.5,
                scalar: 1.6,
                ticks: 450,
                decay: 0.93,
                shapes: ['circle', 'square'],
                disableForReducedMotion: true,
              });
              // Center sparkle — slightly delayed
              setTimeout(() => {
                confetti({
                  particleCount: 60,
                  spread: 100,
                  origin: { x: 0.5, y: 0.55 },
                  colors: ['#9ACDE3', '#d4d4d4', '#ffffff', '#7EB8D4'],
                  startVelocity: 28,
                  gravity: 0.8,
                  scalar: 1.3,
                  ticks: 400,
                  decay: 0.91,
                  shapes: ['circle'],
                  disableForReducedMotion: true,
                });
              }, 100);
              // 3rd wave — sustained shower from sides
              setTimeout(() => {
                confetti({
                  particleCount: 80,
                  angle: 60,
                  spread: 55,
                  origin: { x: 0.1, y: 0.8 },
                  colors: cyanGrey,
                  startVelocity: 35,
                  gravity: 0.85,
                  scalar: 1.4,
                  ticks: 400,
                  decay: 0.92,
                  shapes: ['circle', 'square'],
                  disableForReducedMotion: true,
                });
                confetti({
                  particleCount: 80,
                  angle: 120,
                  spread: 55,
                  origin: { x: 0.9, y: 0.8 },
                  colors: cyanGrey,
                  startVelocity: 35,
                  gravity: 0.85,
                  scalar: 1.4,
                  ticks: 400,
                  decay: 0.92,
                  shapes: ['circle', 'square'],
                  disableForReducedMotion: true,
                });
              }, 400);
              // 4th wave — center rain from top
              setTimeout(() => {
                confetti({
                  particleCount: 50,
                  angle: 270,
                  spread: 120,
                  origin: { x: 0.5, y: -0.1 },
                  colors: ['#7EB8D4', '#9ACDE3', '#ffffff', '#d4d4d4'],
                  startVelocity: 25,
                  gravity: 1.2,
                  scalar: 1.2,
                  ticks: 350,
                  decay: 0.93,
                  shapes: ['circle', 'square'],
                  disableForReducedMotion: true,
                });
              }, 650);
            },
          }, '-=0.1');
        }

        // 4. Glow blooms
        if (glow) {
          tl.to(glow, {
            scale: 1, opacity: 0.8, duration: 0.7,
            ease: 'power2.out',
          }, '-=0.3');

          // Glow breathing loop
          tl.to(glow, {
            scale: 1.15, opacity: 0.5, duration: 2,
            ease: 'sine.inOut', yoyo: true, repeat: -1,
          }, '+=0.1');
        }

        // 5. Label
        tl.to(label, {
          opacity: 1, y: 0, duration: 0.4,
          ease: 'power3.out',
        }, glow ? '-=2.0' : '-=0.2');

        // 6. Continue
        tl.to(btn, {
          opacity: 1, y: 0, duration: 0.4,
          ease: 'power3.out',
        }, '-=0.2');
      });
    });

    return () => {
      cancelAnimationFrame(raf);
      if (tlRef.current) tlRef.current.kill();
    };
  }, [show, borderItem, glowColor]);

  if (!visible || !borderItem) return null;

  const borderImgSrc = borderItem.imageBorder;
  const borderScale = borderItem.imageScale || 1.0;
  const avatarSize = 120;
  const borderSize = avatarSize + 44;
  const isAnimated = borderItem.imageAnimated;
  const animType = (borderItem as any).imageAnimationType;

  return (
    <div
      ref={overlayRef}
      style={{
        position: 'fixed', inset: 0, zIndex: 100000,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.94)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        opacity: 0,
      }}
    >
      {/* ── Avatar + Border container ── */}
      <div style={{
        position: 'relative',
        width: borderSize * borderScale + 20,
        height: borderSize * borderScale + 20,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {/* ── Sun Ray Starburst Glow (behind avatar, centered) ── */}
        <div style={{
          position: 'absolute',
          width: 420, height: 420,
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}>
          <div
            ref={glowRef}
            style={{
              width: '100%', height: '100%',
              borderRadius: '50%',
            }}
          >
            {/* Base radial glow */}
            <div style={{
              position: 'absolute', inset: 0,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${glowColor}55 0%, ${glowColor}25 45%, transparent 72%)`,
            }} />
            {/* Rotating thick sun rays */}
            <div style={{
              position: 'absolute', inset: '-25%',
              background: sunRayGradient,
              borderRadius: '50%',
              animation: 'sunray-rotate 25s linear infinite',
              filter: 'blur(6px)',
              opacity: 0.8,
            }} />
            {/* Inner bright glow */}
            <div style={{
              position: 'absolute', inset: '15%',
              borderRadius: '50%',
              background: `radial-gradient(circle, ${glowColor}50 0%, transparent 70%)`,
            }} />
          </div>
        </div>
        {/* Avatar */}
        <div
          ref={avatarRef}
          style={{
            position: 'absolute', width: avatarSize, height: avatarSize,
            borderRadius: '50%', overflow: 'hidden',
            background: '#0d0d1a', zIndex: 10,
            boxShadow: '0 0 30px rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <svg width={72} height={72} viewBox="0 0 40 40">
              <circle cx="20" cy="16" r="7" fill="#555568" />
              <ellipse cx="20" cy="35" rx="13" ry="10" fill="#4a4a5a" />
            </svg>
          )}
        </div>

        {/* Border image — stamps from above */}
        {borderImgSrc && (
          <div
            ref={borderRef}
            style={{
              position: 'absolute',
              width: borderSize * borderScale,
              height: borderSize * borderScale,
              zIndex: 11, pointerEvents: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <img
              src={borderImgSrc} alt=""
              style={{
                width: '100%', height: '100%', objectFit: 'contain',
                mixBlendMode: 'screen',
                filter: `drop-shadow(0 0 12px ${glowColor}90)`,
                animation: isAnimated
                  ? animType === 'pulse'
                    ? 'equip-breathe 2.5s ease-in-out infinite'
                    : 'equip-spin 10s linear infinite'
                  : 'none',
              }}
            />
          </div>
        )}

        {/* Aura border fallback (no image) */}
        {!borderImgSrc && borderItem.auraConfig && (
          <div
            ref={borderRef}
            style={{
              position: 'absolute',
              width: avatarSize + 18, height: avatarSize + 18,
              borderRadius: '50%', zIndex: 9,
              border: `3px solid ${borderItem.auraConfig.colors[0]}CC`,
              boxShadow: `0 0 8px ${borderItem.auraConfig.colors[0]}AA, 0 0 20px ${borderItem.auraConfig.colors[0]}60, 0 0 40px ${(borderItem.auraConfig.colors[1] || borderItem.auraConfig.colors[0])}30`,
              animation: borderItem.auraConfig.animated ? 'aura-rotate 8s linear infinite' : undefined,
            }}
          />
        )}

        {/* CSS border fallback */}
        {!borderImgSrc && !borderItem.auraConfig && borderItem.borderConfig && (
          <div
            ref={borderRef}
            style={{
              position: 'absolute',
              width: avatarSize + 18, height: avatarSize + 18,
              borderRadius: '50%', zIndex: 9,
              border: `3px solid ${borderItem.borderConfig.glowColor || '#C8A84E'}`,
              boxShadow: `0 0 12px ${borderItem.borderConfig.glowColor || '#C8A84E'}60`,
            }}
          />
        )}
      </div>

      {/* ── Label ── */}
      <div ref={labelRef} style={{ marginTop: 28, textAlign: 'center' }}>
        <div style={{
          fontSize: 12, fontWeight: 900, letterSpacing: '0.35em',
          color: glowColor, textTransform: 'uppercase',
          textShadow: `0 0 18px ${glowColor}80`,
          marginBottom: 6, fontFamily: 'Inter, system-ui, sans-serif',
        }}>
          ✓ Equipped
        </div>
        <div style={{
          fontSize: 20, fontWeight: 900, color: '#fff',
          textShadow: '0 2px 10px rgba(0,0,0,0.5)',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}>
          {borderItem.name}
        </div>
      </div>

      {/* ── Continue ── */}
      <button
        ref={btnRef}
        onClick={handleComplete}
        style={{
          marginTop: 28, padding: '13px 52px', borderRadius: 14,
          background: `linear-gradient(135deg, ${glowColor}30, ${glowColor}12)`,
          border: `1.5px solid ${glowColor}45`, color: '#fff',
          fontSize: 13, fontWeight: 800, letterSpacing: '0.14em',
          cursor: 'pointer', fontFamily: 'Inter, system-ui, sans-serif',
          textTransform: 'uppercase', boxShadow: `0 0 18px ${glowColor}18`,
          transition: 'transform 0.15s, box-shadow 0.15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
      >
        Continue
      </button>

      <style>{`
        @keyframes equip-breathe { 0%,100%{transform:scale(1)} 50%{transform:scale(1.04)} }
        @keyframes equip-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes aura-rotate { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
};

export default BorderEquipOverlay;
