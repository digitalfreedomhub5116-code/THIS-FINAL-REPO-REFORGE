/**
 * BorderEquipOverlay — Premium 4-phase equip animation for avatar borders.
 *
 * Phases:
 *   1. Reveal   (0–800ms)  — Dark backdrop fades in, avatar scales up from center
 *   2. Dissolve (800–1800ms) — Old border disintegrates with particle-ring scatter
 *   3. Materialize (1800–3200ms) — New border assembles with energy burst + glow rings
 *   4. Confirm  (3200–4400ms) — Flash pulse + "EQUIPPED" text + bounce settle
 *
 * Uses only CSS keyframe animations + framer-motion for choreography.
 * Zero external dependencies beyond what the project already uses.
 */
import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getItemById, type StoreItem } from '../utils/storeItems';

interface BorderEquipOverlayProps {
  /** Whether the overlay is visible */
  show: boolean;
  /** The border item being equipped */
  borderItem: StoreItem | null;
  /** The user's avatar URL */
  avatarUrl?: string | null;
  /** The old border ID being replaced (null if none) */
  oldBorderId?: string | null;
  /** Called when animation completes */
  onComplete: () => void;
}

/* ── Particle ring for dissolve/materialize ── */
const PARTICLE_COUNT = 16;
const generateParticles = (color: string) =>
  Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    const angle = (i / PARTICLE_COUNT) * 360;
    const delay = Math.random() * 0.3;
    return { angle, delay, color };
  });

const BorderEquipOverlay: React.FC<BorderEquipOverlayProps> = ({
  show,
  borderItem,
  avatarUrl,
  oldBorderId,
  onComplete,
}) => {
  const [phase, setPhase] = useState<0 | 1 | 2 | 3 | 4>(0);
  const oldItem = oldBorderId ? getItemById(oldBorderId) : null;

  const glowColor = useMemo(() => {
    if (!borderItem) return '#C8A84E';
    return (
      borderItem.auraConfig?.colors?.[0] ||
      borderItem.borderConfig?.glowColor ||
      borderItem.borderConfig?.colors?.[0] ||
      '#C8A84E'
    );
  }, [borderItem]);

  const oldGlowColor = useMemo(() => {
    if (!oldItem) return 'rgba(255,255,255,0.3)';
    return (
      oldItem.auraConfig?.colors?.[0] ||
      oldItem.borderConfig?.glowColor ||
      oldItem.borderConfig?.colors?.[0] ||
      'rgba(255,255,255,0.3)'
    );
  }, [oldItem]);

  const particles = useMemo(() => generateParticles(glowColor), [glowColor]);
  const dissolveParticles = useMemo(() => generateParticles(oldGlowColor), [oldGlowColor]);

  useEffect(() => {
    if (!show) {
      setPhase(0);
      return;
    }
    // Phase 1: Reveal
    setPhase(1);
    const t2 = setTimeout(() => setPhase(2), 800);   // Phase 2: Dissolve
    const t3 = setTimeout(() => setPhase(3), 1800);  // Phase 3: Materialize
    const t4 = setTimeout(() => setPhase(4), 3200);  // Phase 4: Confirm
    const tEnd = setTimeout(() => onComplete(), 4400); // Auto-close

    return () => {
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(tEnd);
    };
  }, [show, onComplete]);

  if (!show || !borderItem) return null;

  const borderImgSrc = borderItem.imageBorder;
  const oldBorderImgSrc = oldItem?.imageBorder;
  const borderScale = borderItem.imageScale || 1.0;
  const borderOffsetY = (borderItem as any).imageOffsetY || 0;
  const isAnimated = borderItem.imageAnimated;
  const animType = (borderItem as any).imageAnimationType;
  const avatarSize = 120;
  const borderSize = avatarSize + 50;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="border-equip-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 100000,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.92)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
          onClick={() => onComplete()}
        >
          {/* ── Ambient radial glow (matches new border color) ── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{
              opacity: phase >= 3 ? 0.6 : 0.15,
              scale: phase >= 3 ? 1.2 : 0.8,
            }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              width: 400,
              height: 400,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${glowColor}40 0%, ${glowColor}15 35%, transparent 70%)`,
              pointerEvents: 'none',
            }}
          />

          {/* ── Phase 1+: Avatar appear ── */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: phase >= 1 ? 1 : 0,
              opacity: phase >= 1 ? 1 : 0,
            }}
            transition={{
              type: 'spring',
              stiffness: 260,
              damping: 20,
              delay: 0.1,
            }}
            style={{
              position: 'relative',
              width: borderSize * borderScale + 40,
              height: borderSize * borderScale + 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Avatar circle */}
            <div
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
                boxShadow: phase >= 3
                  ? `0 0 30px ${glowColor}60, 0 0 60px ${glowColor}30`
                  : '0 0 20px rgba(0,0,0,0.5)',
                transition: 'box-shadow 0.6s ease',
              }}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <svg width={avatarSize * 0.6} height={avatarSize * 0.6} viewBox="0 0 40 40">
                  <circle cx="20" cy="16" r="7" fill="#555568" />
                  <ellipse cx="20" cy="35" rx="13" ry="10" fill="#4a4a5a" />
                </svg>
              )}
            </div>

            {/* ── Phase 2: Old border dissolves ── */}
            {phase >= 2 && oldBorderImgSrc && (
              <motion.div
                initial={{ opacity: 1, scale: 1, filter: 'brightness(1)' }}
                animate={{
                  opacity: 0,
                  scale: 1.6,
                  filter: 'brightness(2) blur(6px)',
                }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                style={{
                  position: 'absolute',
                  width: borderSize * (oldItem?.imageScale || 1.0),
                  height: borderSize * (oldItem?.imageScale || 1.0),
                  zIndex: 11,
                  pointerEvents: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img
                  src={oldBorderImgSrc}
                  alt=""
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    mixBlendMode: 'screen',
                  }}
                />
              </motion.div>
            )}

            {/* ── Phase 2: Dissolve particles scatter outward ── */}
            {phase >= 2 && oldBorderImgSrc && dissolveParticles.map((p, i) => (
              <motion.div
                key={`dissolve-${i}`}
                initial={{
                  x: Math.cos((p.angle * Math.PI) / 180) * 50,
                  y: Math.sin((p.angle * Math.PI) / 180) * 50,
                  opacity: 0.9,
                  scale: 1,
                }}
                animate={{
                  x: Math.cos((p.angle * Math.PI) / 180) * 150,
                  y: Math.sin((p.angle * Math.PI) / 180) * 150,
                  opacity: 0,
                  scale: 0.2,
                }}
                transition={{ duration: 0.8, delay: p.delay, ease: 'easeOut' }}
                style={{
                  position: 'absolute',
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  background: p.color,
                  boxShadow: `0 0 6px ${p.color}`,
                  zIndex: 20,
                  pointerEvents: 'none',
                }}
              />
            ))}

            {/* ── Phase 3: Energy ring pulse before new border ── */}
            {phase >= 3 && (
              <>
                <motion.div
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1.8, opacity: 0 }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  style={{
                    position: 'absolute',
                    width: borderSize,
                    height: borderSize,
                    borderRadius: '50%',
                    border: `2px solid ${glowColor}`,
                    boxShadow: `0 0 20px ${glowColor}80`,
                    zIndex: 12,
                    pointerEvents: 'none',
                  }}
                />
                <motion.div
                  initial={{ scale: 0.3, opacity: 0 }}
                  animate={{ scale: 2.2, opacity: 0 }}
                  transition={{ duration: 1.0, delay: 0.15, ease: 'easeOut' }}
                  style={{
                    position: 'absolute',
                    width: borderSize * 0.8,
                    height: borderSize * 0.8,
                    borderRadius: '50%',
                    border: `1.5px solid ${glowColor}80`,
                    zIndex: 12,
                    pointerEvents: 'none',
                  }}
                />
              </>
            )}

            {/* ── Phase 3: Materialize particles converge inward ── */}
            {phase >= 3 && particles.map((p, i) => (
              <motion.div
                key={`materialize-${i}`}
                initial={{
                  x: Math.cos((p.angle * Math.PI) / 180) * 160,
                  y: Math.sin((p.angle * Math.PI) / 180) * 160,
                  opacity: 0,
                  scale: 0.3,
                }}
                animate={{
                  x: Math.cos((p.angle * Math.PI) / 180) * (borderSize / 2.3),
                  y: Math.sin((p.angle * Math.PI) / 180) * (borderSize / 2.3),
                  opacity: [0, 1, 0.8],
                  scale: [0.3, 1.2, 0.6],
                }}
                transition={{ duration: 0.7, delay: p.delay * 0.6, ease: 'easeInOut' }}
                style={{
                  position: 'absolute',
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: p.color,
                  boxShadow: `0 0 8px ${p.color}, 0 0 16px ${p.color}60`,
                  zIndex: 20,
                  pointerEvents: 'none',
                }}
              />
            ))}

            {/* ── Phase 3: New border materializes ── */}
            {phase >= 3 && borderImgSrc && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5, rotate: -30 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  rotate: 0,
                }}
                transition={{
                  type: 'spring',
                  stiffness: 200,
                  damping: 16,
                  delay: 0.3,
                }}
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
                    filter: `drop-shadow(0 0 12px ${glowColor}90)`,
                    animation: isAnimated
                      ? animType === 'pulse'
                        ? 'equip-breathe 2.5s ease-in-out infinite'
                        : 'equip-spin 10s linear infinite'
                      : 'none',
                  }}
                />
              </motion.div>
            )}
          </motion.div>

          {/* ── Phase 4: Confirmation flash ── */}
          {phase >= 4 && (
            <motion.div
              initial={{ opacity: 0.9, scale: 0.8 }}
              animate={{ opacity: 0, scale: 2.5 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                width: 200,
                height: 200,
                borderRadius: '50%',
                background: `radial-gradient(circle, ${glowColor}50, transparent)`,
                pointerEvents: 'none',
              }}
            />
          )}

          {/* ── Phase 4: "EQUIPPED" label ── */}
          {phase >= 4 && (
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.7 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 20,
                delay: 0.15,
              }}
              style={{
                marginTop: 28,
                textAlign: 'center',
                pointerEvents: 'none',
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 900,
                  letterSpacing: '0.35em',
                  color: glowColor,
                  textShadow: `0 0 20px ${glowColor}80, 0 0 40px ${glowColor}40`,
                  marginBottom: 6,
                  fontFamily: 'Inter, system-ui, sans-serif',
                  textTransform: 'uppercase',
                }}
              >
                ✓ Equipped
              </div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 900,
                  color: '#fff',
                  textShadow: '0 2px 12px rgba(0,0,0,0.6)',
                  fontFamily: 'Inter, system-ui, sans-serif',
                }}
              >
                {borderItem.name}
              </div>
            </motion.div>
          )}

          {/* ── Border name label (early phases) ── */}
          {phase >= 1 && phase < 4 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 0.5, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              style={{
                marginTop: 28,
                fontSize: 12,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.4)',
                letterSpacing: '0.2em',
                fontFamily: 'Inter, system-ui, sans-serif',
                textTransform: 'uppercase',
                pointerEvents: 'none',
              }}
            >
              {phase === 2 ? 'Dissolving...' : phase === 3 ? 'Forging...' : borderItem.name}
            </motion.div>
          )}

          {/* ── Tap to skip hint ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.25 }}
            transition={{ delay: 1.5 }}
            style={{
              position: 'absolute',
              bottom: 40,
              fontSize: 10,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.4)',
              letterSpacing: '0.15em',
              fontFamily: 'Inter, system-ui, sans-serif',
              pointerEvents: 'none',
            }}
          >
            TAP TO SKIP
          </motion.div>

          {/* ── Keyframe animations ── */}
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
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BorderEquipOverlay;
