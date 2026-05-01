/**
 * BorderEquipOverlay — GSAP-powered equip animation for avatar borders.
 *
 * Flow:
 *   1. Backdrop fades in
 *   2. User's PFP scales up from center
 *   3. Border "stamps" around PFP with an elastic snap
 *   4. Subtle glow pulses from behind the PFP
 *   5. "Continue" button fades in
 *
 * ─── GSAP vs Framer Motion ───
 * GSAP offers:
 *   • Timelines — chain multiple animations in precise sequence
 *   • Elastic/bounce eases built-in (no physics sim needed)
 *   • .fromTo() — explicit start+end states (no unmount issues)
 *   • ScrollTrigger plugin — scroll-driven animations
 *   • Stagger — animate arrays of elements with delay offsets
 *   • MorphSVG — morph between SVG shapes
 *   • MotionPath — animate along bezier curves
 *   • Better performance for complex sequences (direct DOM mutation)
 *   • Framework-agnostic — works in React, Vue, vanilla, etc.
 */
import React, { useEffect, useRef, useCallback, useState } from 'react';
import gsap from 'gsap';
import { getItemById, type StoreItem } from '../utils/storeItems';

interface BorderEquipOverlayProps {
  show: boolean;
  borderItem: StoreItem | null;
  avatarUrl?: string | null;
  oldBorderId?: string | null;
  onComplete: () => void;
}

const BorderEquipOverlay: React.FC<BorderEquipOverlayProps> = ({
  show,
  borderItem,
  avatarUrl,
  oldBorderId,
  onComplete,
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);
  const borderRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const glowRingRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const nameRef = useRef<HTMLDivElement>(null);
  const checkRef = useRef<HTMLDivElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const [visible, setVisible] = useState(false);

  const glowColor = borderItem?.auraConfig?.colors?.[0] ||
    borderItem?.borderConfig?.glowColor ||
    borderItem?.borderConfig?.colors?.[0] ||
    '#C8A84E';

  const handleComplete = useCallback(() => {
    // Kill timeline and fade out
    if (tlRef.current) tlRef.current.kill();
    gsap.to(overlayRef.current, {
      opacity: 0,
      duration: 0.3,
      onComplete: () => {
        setVisible(false);
        onComplete();
      },
    });
  }, [onComplete]);

  useEffect(() => {
    if (!show || !borderItem) {
      setVisible(false);
      return;
    }

    setVisible(true);

    // Wait a tick for DOM to mount
    const raf = requestAnimationFrame(() => {
      const overlay = overlayRef.current;
      const avatar = avatarRef.current;
      const border = borderRef.current;
      const glow = glowRef.current;
      const glowRing = glowRingRef.current;
      const btn = btnRef.current;
      const name = nameRef.current;
      const check = checkRef.current;

      if (!overlay || !avatar || !border || !glow || !btn || !name || !check) return;

      // Reset all elements
      gsap.set(overlay, { opacity: 0 });
      gsap.set(avatar, { scale: 0, opacity: 0 });
      gsap.set(border, { scale: 0.3, opacity: 0, rotation: -20 });
      gsap.set(glow, { scale: 0.5, opacity: 0 });
      if (glowRing) gsap.set(glowRing, { scale: 0.6, opacity: 0 });
      gsap.set(btn, { opacity: 0, y: 20 });
      gsap.set(name, { opacity: 0, y: 15 });
      gsap.set(check, { scale: 0, opacity: 0 });

      // ═══ GSAP Timeline — the magic ═══
      const tl = gsap.timeline();
      tlRef.current = tl;

      // Phase 1: Backdrop fades in
      tl.to(overlay, {
        opacity: 1,
        duration: 0.35,
        ease: 'power2.out',
      });

      // Phase 2: Avatar PFP scales up
      tl.to(avatar, {
        scale: 1,
        opacity: 1,
        duration: 0.5,
        ease: 'back.out(1.7)', // overshoot then settle
      }, '-=0.1');

      // Phase 3: Border STAMPS around PFP (elastic snap!)
      tl.to(border, {
        scale: 1,
        opacity: 1,
        rotation: 0,
        duration: 0.6,
        ease: 'elastic.out(1.2, 0.5)', // elastic snap — GSAP's signature
      }, '-=0.15');

      // Phase 4: Glow blooms from behind
      tl.to(glow, {
        scale: 1.3,
        opacity: 0.7,
        duration: 0.8,
        ease: 'power2.out',
      }, '-=0.4');

      // Glow ring expands
      if (glowRing) {
        tl.to(glowRing, {
          scale: 1,
          opacity: 0.5,
          duration: 0.6,
          ease: 'power2.out',
        }, '-=0.6');
      }

      // Glow pulses (repeat)
      tl.to(glow, {
        scale: 1.1,
        opacity: 0.5,
        duration: 1.5,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
      }, '-=0.3');

      // Phase 5: Name + checkmark appear
      tl.to(check, {
        scale: 1,
        opacity: 1,
        duration: 0.35,
        ease: 'back.out(2)',
      }, '-=1.2');

      tl.to(name, {
        opacity: 1,
        y: 0,
        duration: 0.4,
        ease: 'power3.out',
      }, '-=1.0');

      // Phase 6: Continue button
      tl.to(btn, {
        opacity: 1,
        y: 0,
        duration: 0.4,
        ease: 'power3.out',
      }, '-=0.6');
    });

    return () => {
      cancelAnimationFrame(raf);
      if (tlRef.current) tlRef.current.kill();
    };
  }, [show, borderItem, glowColor]);

  if (!visible || !borderItem) return null;

  const borderImgSrc = borderItem.imageBorder;
  const borderScale = borderItem.imageScale || 1.0;
  const borderOffsetY = (borderItem as any).imageOffsetY || 0;
  const isAnimated = borderItem.imageAnimated;
  const animType = (borderItem as any).imageAnimationType;
  const avatarSize = 130;
  const borderSize = avatarSize + 50;

  return (
    <div
      ref={overlayRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        opacity: 0,
      }}
    >
      {/* ── Glow behind PFP ── */}
      <div
        ref={glowRef}
        style={{
          position: 'absolute',
          width: 320,
          height: 320,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${glowColor}50 0%, ${glowColor}20 40%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />

      {/* ── Glow ring ── */}
      <div
        ref={glowRingRef}
        style={{
          position: 'absolute',
          width: borderSize * borderScale + 30,
          height: borderSize * borderScale + 30,
          borderRadius: '50%',
          border: `1.5px solid ${glowColor}40`,
          boxShadow: `0 0 30px ${glowColor}25, inset 0 0 20px ${glowColor}15`,
          pointerEvents: 'none',
        }}
      />

      {/* ── Avatar + Border container ── */}
      <div style={{ position: 'relative', width: borderSize * borderScale + 40, height: borderSize * borderScale + 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* Avatar circle */}
        <div
          ref={avatarRef}
          style={{
            position: 'absolute',
            width: avatarSize,
            height: avatarSize,
            borderRadius: '50%',
            overflow: 'hidden',
            background: avatarUrl ? 'transparent' : '#0d0d1a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            boxShadow: `0 0 25px rgba(0,0,0,0.6)`,
          }}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <svg width={avatarSize * 0.6} height={avatarSize * 0.6} viewBox="0 0 40 40">
              <circle cx="20" cy="16" r="7" fill="#555568" />
              <ellipse cx="20" cy="35" rx="13" ry="10" fill="#4a4a5a" />
            </svg>
          )}
        </div>

        {/* Border image — stamps around PFP */}
        {borderImgSrc && (
          <div
            ref={borderRef}
            style={{
              position: 'absolute',
              width: borderSize * borderScale,
              height: borderSize * borderScale,
              transform: `translateY(${borderOffsetY}px)`,
              zIndex: 11,
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img
              src={borderImgSrc}
              alt=""
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                mixBlendMode: 'screen',
                filter: `drop-shadow(0 0 14px ${glowColor}90)`,
                animation: isAnimated
                  ? animType === 'pulse'
                    ? 'equip-breathe 2.5s ease-in-out infinite'
                    : 'equip-spin 10s linear infinite'
                  : 'none',
              }}
            />
          </div>
        )}
      </div>

      {/* ── Checkmark + Name ── */}
      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <div
          ref={checkRef}
          style={{
            fontSize: 13,
            fontWeight: 900,
            letterSpacing: '0.35em',
            color: glowColor,
            textShadow: `0 0 20px ${glowColor}80, 0 0 40px ${glowColor}40`,
            marginBottom: 6,
            fontFamily: 'Inter, system-ui, sans-serif',
            textTransform: 'uppercase' as const,
          }}
        >
          ✓ Equipped
        </div>
        <div
          ref={nameRef}
          style={{
            fontSize: 20,
            fontWeight: 900,
            color: '#fff',
            textShadow: '0 2px 12px rgba(0,0,0,0.6)',
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          {borderItem.name}
        </div>
      </div>

      {/* ── Continue button ── */}
      <button
        ref={btnRef}
        onClick={handleComplete}
        style={{
          marginTop: 32,
          padding: '12px 48px',
          borderRadius: 14,
          background: `linear-gradient(135deg, ${glowColor}30, ${glowColor}15)`,
          border: `1.5px solid ${glowColor}50`,
          color: '#fff',
          fontSize: 13,
          fontWeight: 800,
          letterSpacing: '0.15em',
          cursor: 'pointer',
          fontFamily: 'Inter, system-ui, sans-serif',
          textTransform: 'uppercase' as const,
          boxShadow: `0 0 20px ${glowColor}20`,
          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)';
          e.currentTarget.style.boxShadow = `0 0 30px ${glowColor}40`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = `0 0 20px ${glowColor}20`;
        }}
      >
        Continue
      </button>

      {/* ── Keyframe animations for animated borders ── */}
      <style>{`
        @keyframes equip-breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.04); }
        }
        @keyframes equip-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default BorderEquipOverlay;
