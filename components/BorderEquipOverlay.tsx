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
import ReactDOM from 'react-dom';
import gsap from 'gsap';
import confetti from 'canvas-confetti';
import Lottie from 'lottie-react';
import type { StoreItem } from '../utils/storeItems';
import { BorderVideo } from './AvatarWithBorder';

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
  const confettiCanvasRef = useRef<HTMLCanvasElement>(null);
  const confettiInstanceRef = useRef<ReturnType<typeof confetti.create> | null>(null);
  const [visible, setVisible] = useState(false);
  const [lottieData, setLottieData] = useState<any>(null);

  // Create confetti instance bound to our canvas (inside the overlay, above the backdrop)
  useEffect(() => {
    if (visible && confettiCanvasRef.current && !confettiInstanceRef.current) {
      confettiInstanceRef.current = confetti.create(confettiCanvasRef.current, { resize: true, useWorker: true });
    }
    return () => {
      if (confettiInstanceRef.current) {
        confettiInstanceRef.current.reset();
        confettiInstanceRef.current = null;
      }
    };
  }, [visible]);

  // ── Normalize any color (rgba/rgb/hex) to #RRGGBB hex so suffix patterns like ${color}55 produce valid CSS ──
  const toHex = (c: string): string => {
    if (c.startsWith('#')) return c.length > 7 ? c.slice(0, 7) : c;
    const m = c.match(/rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)/);
    if (m) return '#' + [m[1], m[2], m[3]].map(v => parseInt(v).toString(16).padStart(2, '0')).join('');
    return '#C8A84E';
  };

  const glowColor = toHex(
    borderItem?.auraConfig?.colors?.[0] ||
    borderItem?.borderConfig?.glowColor ||
    borderItem?.borderConfig?.colors?.[0] ||
    '#C8A84E'
  );

  // ── Generate lighter/darker shades of any hex color for confetti variety ──
  const colorShade = (hex: string, pct: number): string => {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, Math.max(0, ((num >> 16) & 0xff) + Math.round(255 * pct)));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + Math.round(255 * pct)));
    const b = Math.min(255, Math.max(0, (num & 0xff) + Math.round(255 * pct)));
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
  };

  // Dynamic confetti palette: glow-derived colors + constant greys
  const confettiColors = [
    glowColor,
    colorShade(glowColor, 0.15),   // lighter
    colorShade(glowColor, -0.12),  // darker
    '#c0c0c0', '#808080', '#d4d4d4', '#ffffff',  // greys stay constant
  ];
  const confettiColorsCenter = [
    colorShade(glowColor, 0.15),
    '#d4d4d4', '#ffffff',
    glowColor,
  ];

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

  // ── Load Lottie data if border uses lottie ──
  useEffect(() => {
    if (!borderItem?.lottieBorder) { setLottieData(null); return; }
    fetch(borderItem.lottieBorder)
      .then(r => r.json())
      .then(d => setLottieData(d))
      .catch(() => setLottieData(null));
  }, [borderItem?.lottieBorder]);

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

        // Reset — use xPercent/yPercent so GSAP centering doesn't conflict with translate
        gsap.set(overlay, { opacity: 0 });
        gsap.set(avatar, { scale: 0, opacity: 0, xPercent: -50, yPercent: -50 });
        if (border) gsap.set(border, { y: -200, scale: 1.4, opacity: 0, xPercent: -50, yPercent: -50 });
        if (glow) gsap.set(glow, { scale: 0.3, opacity: 0 });
        gsap.set(label, { opacity: 0, y: 20 });
        gsap.set(btn, { opacity: 0, y: 20 });

        // ═══ GSAP Timeline ═══
        const tl = gsap.timeline();
        tlRef.current = tl;

        // 1. Backdrop
        tl.to(overlay, { opacity: 1, duration: 0.4, ease: 'power2.out' });

        // 2. PFP appears (keep centered)
        tl.to(avatar, {
          scale: 1, opacity: 1, duration: 0.5,
          xPercent: -50, yPercent: -50,
          ease: 'back.out(1.7)',
        }, '-=0.1');

        // 3. Border STAMPS from above (comes down, snaps to place)
        if (border) {
          tl.to(border, {
            y: 0, scale: 1, opacity: 1, duration: 0.45, xPercent: -50, yPercent: -50,
            ease: 'back.out(2.5)',
            onComplete: () => {
              // ── MEGA Confetti celebration burst ──
              const fire = confettiInstanceRef.current || confetti;
              // Left corner burst — 3× bigger
              fire({
                particleCount: 150,
                angle: 55,
                spread: 75,
                origin: { x: 0.05, y: 1 },
                colors: confettiColors,
                startVelocity: 50,
                gravity: 0.9,
                drift: 0.5,
                scalar: 1.6,
                ticks: 450,
                decay: 0.93,
                shapes: ['circle', 'square'],
                disableForReducedMotion: true,
              });
              fire({
                particleCount: 150,
                angle: 125,
                spread: 75,
                origin: { x: 0.95, y: 1 },
                colors: confettiColors,
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
                const f = confettiInstanceRef.current || confetti;
                f({
                  particleCount: 60,
                  spread: 100,
                  origin: { x: 0.5, y: 0.55 },
                  colors: confettiColorsCenter,
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
                const f = confettiInstanceRef.current || confetti;
                f({
                  particleCount: 80,
                  angle: 60,
                  spread: 55,
                  origin: { x: 0.1, y: 0.8 },
                  colors: confettiColors,
                  startVelocity: 35,
                  gravity: 0.85,
                  scalar: 1.4,
                  ticks: 400,
                  decay: 0.92,
                  shapes: ['circle', 'square'],
                  disableForReducedMotion: true,
                });
                f({
                  particleCount: 80,
                  angle: 120,
                  spread: 55,
                  origin: { x: 0.9, y: 0.8 },
                  colors: confettiColors,
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
                const f = confettiInstanceRef.current || confetti;
                f({
                  particleCount: 50,
                  angle: 270,
                  spread: 120,
                  origin: { x: 0.5, y: -0.1 },
                  colors: confettiColorsCenter,
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
  const borderVideoSrc = borderItem.videoBorder;
  const hasLottie = !!borderItem.lottieBorder;
  const isAnimated = borderItem.imageAnimated;
  const animType = (borderItem as any).imageAnimationType;

  // ── Normalized overlay sizing ──
  // imageScale from storeItems is tuned for the small in-game avatar (88px).
  // In the overlay (130px avatar), extreme scales (1.4x eagle, 1.5x lion) look too big.
  // We clamp the scale to [0.95, 1.15] for a uniform visual weight across all borders.
  const avatarSize = 130;
  const overlayBorderBase = 200;
  const rawScale = borderItem.imageScale || 1.0;
  const overlayScale = Math.min(Math.max(rawScale, 0.95), 1.15);
  const borderDisplaySize = overlayBorderBase * overlayScale;

  // Container must hold the glow without clipping
  const containerSize = 300;

  // Portal to document.body so overlay escapes any parent stacking context (e.g. z-10)
  return ReactDOM.createPortal(
    <div
      ref={overlayRef}
      style={{
        position: 'fixed', inset: 0, zIndex: 100000,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        /* Android WebView: backdropFilter causes screen flicker/glitch during GSAP animation */
        background: 'rgba(0,0,0,0.96)',
        opacity: 0,
        overflow: 'hidden',
      }}
    >
      {/* Confetti canvas — lives INSIDE the overlay so it renders above the backdrop */}
      <canvas
        ref={confettiCanvasRef}
        style={{
          position: 'fixed', inset: 0,
          width: '100%', height: '100%',
          pointerEvents: 'none',
          zIndex: 99999,
          transform: 'translateZ(0)', /* single GPU layer — avoid willChange on Android */
        }}
      />
      {/* ── Avatar + Border + Glow container ── */}
      <div style={{
        position: 'relative',
        width: containerSize,
        height: containerSize,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'visible',
        flexShrink: 0,
      }}>
        {/* ── Sun Ray Starburst Glow (behind everything) ── */}
        {/* Use 150vmax so the circle's diameter always exceeds the screen diagonal,
            guaranteeing full-screen coverage on any phone/tablet/desktop */}
        <div style={{
          position: 'absolute',
          width: '150vmax', height: '150vmax',
          top: '50%', left: '50%',
          transform: 'translate3d(-50%, -50%, 0)', /* GPU layer for sunburst */
          pointerEvents: 'none',
          zIndex: 0,
          overflow: 'visible',
          willChange: 'transform',
        }}>
          <div
            ref={glowRef}
            style={{
              width: '100%', height: '100%',
              borderRadius: '50%',
              position: 'relative',
              overflow: 'visible',
            }}
          >
            {/* Base radial glow */}
            <div style={{
              position: 'absolute', inset: 0,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${glowColor}60 0%, ${glowColor}30 40%, transparent 70%)`,
            }} />
            {/* Rotating thick sun rays */}
            <div style={{
              position: 'absolute', inset: '-35%',
              background: sunRayGradient,
              borderRadius: '50%',
              animation: 'sunray-rotate 25s linear infinite',
              filter: 'blur(6px)',
              opacity: 0.85,
              willChange: 'transform', /* GPU-accelerate rotation */
              transform: 'translate3d(0,0,0)',
            }} />
            {/* Inner bright glow */}
            <div style={{
              position: 'absolute', inset: '12%',
              borderRadius: '50%',
              background: `radial-gradient(circle, ${glowColor}55 0%, transparent 65%)`,
            }} />
          </div>
        </div>

        {/* Avatar */}
        <div
          ref={avatarRef}
          style={{
            position: 'absolute',
            top: '50%', left: '50%',
            width: avatarSize, height: avatarSize,
            borderRadius: '50%', overflow: 'hidden',
            background: '#0d0d1a', zIndex: 10,
            boxShadow: `0 0 30px rgba(0,0,0,0.7), 0 0 60px ${glowColor}20`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <svg width={80} height={80} viewBox="0 0 40 40">
              <circle cx="20" cy="16" r="7" fill="#555568" />
              <ellipse cx="20" cy="35" rx="13" ry="10" fill="#4a4a5a" />
            </svg>
          )}
        </div>

        {/* ── Video Border (GIF/MP4) ── */}
        {borderVideoSrc ? (
          <div
            ref={borderRef}
            style={{
              position: 'absolute',
              top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              width: borderDisplaySize,
              height: borderDisplaySize,
              zIndex: 11, pointerEvents: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              mixBlendMode: 'screen'
            }}
          >
            <div style={{ width: '100%', height: '100%', transform: `translateY(${borderItem.imageOffsetY || 0}px)` }}>
              <BorderVideo src={borderItem.videoBorder!} />
            </div>
          </div>
        ) : /* ── PNG Image Border ── */
        borderImgSrc ? (
          <div
            ref={borderRef}
            style={{
              position: 'absolute',
              top: '50%', left: '50%',
              width: borderDisplaySize,
              height: borderDisplaySize,
              zIndex: 11, pointerEvents: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <img
              src={borderImgSrc} alt=""
              style={{
                width: '100%', height: '100%', objectFit: 'contain',
                filter: `drop-shadow(0 0 16px ${glowColor}AA)`,
                animation: isAnimated
                  ? animType === 'pulse'
                    ? 'equip-breathe 2.5s ease-in-out infinite'
                    : 'equip-spin 10s linear infinite'
                  : 'none',
              }}
            />
          </div>
        ) : null}

        {/* ── Lottie Animated Border ── */}
        {!borderImgSrc && !borderVideoSrc && hasLottie && (
          <div
            ref={borderRef}
            style={{
              position: 'absolute',
              top: '50%', left: '50%',
              width: borderDisplaySize,
              height: borderDisplaySize,
              zIndex: 11, pointerEvents: 'none',
              borderRadius: '50%', overflow: 'hidden',
              mixBlendMode: 'screen',
              filter: 'brightness(1.1)',
            }}
          >
            {lottieData && (
              <div style={{
                position: 'absolute',
                width: '100%', height: '200%',
                top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
              }}>
                <Lottie animationData={lottieData} loop autoplay style={{ width: '100%', height: '100%' }} />
              </div>
            )}
          </div>
        )}

        {/* Aura border fallback (no image, no lottie) */}
        {!borderImgSrc && !borderVideoSrc && !hasLottie && borderItem.auraConfig && (
          <div
            ref={borderRef}
            style={{
              position: 'absolute',
              top: '50%', left: '50%',
              width: avatarSize + 22, height: avatarSize + 22,
              borderRadius: '50%', zIndex: 9,
              border: `3px solid ${borderItem.auraConfig.colors[0]}CC`,
              boxShadow: `0 0 8px ${borderItem.auraConfig.colors[0]}AA, 0 0 20px ${borderItem.auraConfig.colors[0]}60, 0 0 40px ${(borderItem.auraConfig.colors[1] || borderItem.auraConfig.colors[0])}30`,
              animation: borderItem.auraConfig.animated ? 'aura-rotate 8s linear infinite' : undefined,
            }}
          />
        )}

        {/* CSS border fallback */}
        {!borderImgSrc && !borderVideoSrc && !hasLottie && !borderItem.auraConfig && borderItem.borderConfig && (
          <div
            ref={borderRef}
            style={{
              position: 'absolute',
              top: '50%', left: '50%',
              width: avatarSize + 22, height: avatarSize + 22,
              borderRadius: '50%', zIndex: 9,
              border: `3px solid ${borderItem.borderConfig.glowColor || '#C8A84E'}`,
              boxShadow: `0 0 12px ${borderItem.borderConfig.glowColor || '#C8A84E'}60`,
            }}
          />
        )}
      </div>

      {/* ── Label ── */}
      <div ref={labelRef} style={{ marginTop: 28, textAlign: 'center', position: 'relative', zIndex: 2 }}>
        <div style={{
          fontSize: 11, fontWeight: 900, letterSpacing: '0.35em',
          color: glowColor, textTransform: 'uppercase',
          textShadow: `0 0 20px ${glowColor}90, 0 0 40px ${glowColor}40`,
          marginBottom: 8, fontFamily: 'Inter, system-ui, sans-serif',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 18, height: 18, borderRadius: '50%',
            background: `${glowColor}25`, border: `1.5px solid ${glowColor}60`,
          }}>✓</span>
          Equipped
        </div>
        <div style={{
          fontSize: 22, fontWeight: 900, color: '#fff',
          textShadow: '0 2px 12px rgba(0,0,0,0.6)',
          fontFamily: 'Inter, system-ui, sans-serif',
          letterSpacing: '0.02em',
        }}>
          {borderItem.name}
        </div>
      </div>

      {/* ── Continue Button ── */}
      <button
        ref={btnRef}
        onClick={handleComplete}
        style={{
          marginTop: 28, padding: '14px 56px', borderRadius: 16,
          background: `linear-gradient(135deg, ${glowColor}, ${colorShade(glowColor, -0.2)})`,
          border: `1.5px solid ${colorShade(glowColor, 0.15)}`, color: '#000',
          fontSize: 13, fontWeight: 800, letterSpacing: '0.18em',
          cursor: 'pointer', fontFamily: 'Inter, system-ui, sans-serif',
          textTransform: 'uppercase',
          boxShadow: `0 0 30px ${glowColor}60, 0 4px 20px rgba(0,0,0,0.4)`,
          transition: 'transform 0.15s, box-shadow 0.15s',
          position: 'relative', zIndex: 2,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
      >
        Continue
      </button>

      <style>{`
        @keyframes equip-breathe { 0%,100%{transform:translate3d(0,0,0) scale(1)} 50%{transform:translate3d(0,0,0) scale(1.04)} }
        @keyframes equip-spin { from{transform:translate3d(0,0,0) rotate(0deg)} to{transform:translate3d(0,0,0) rotate(360deg)} }
        @keyframes aura-rotate { from{transform:translate3d(0,0,0) rotate(0deg)} to{transform:translate3d(0,0,0) rotate(360deg)} }
      `}</style>
    </div>,
    document.body
  );
};

export default BorderEquipOverlay;
