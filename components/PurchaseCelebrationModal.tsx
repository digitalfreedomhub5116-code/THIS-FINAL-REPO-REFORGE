/**
 * PurchaseCelebrationModal.tsx — Premium celebration overlay after IAP purchase
 *
 * Shows:
 * - Full-screen dark overlay with radial glow
 * - Product image with scale-bounce entrance
 * - Confetti burst via existing ConfettiOverlay
 * - "+X KEYS/GOLD ADDED!" animated text
 * - New balance with tick-up animation
 * - Continue button to dismiss
 */

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Sparkles } from 'lucide-react';

interface PurchaseCelebrationProps {
  isOpen: boolean;
  packName: string;       // "Shadow Keys"
  amount: number;         // 10
  currency: 'keys' | 'gold';
  packImage: string;      // "/assets/store/keyless-Photoroom.png"
  tierColor: string;      // "#8B5CF6" or "#F59E0B"
  onClose: () => void;
}

// ── Animated counter that ticks up from 0 to target ──
const AnimatedCounter: React.FC<{ target: number; duration?: number; color: string }> = ({
  target, duration = 1200, color
}) => {
  const [current, setCurrent] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    startRef.current = null;
    const animate = (timestamp: number) => {
      if (!startRef.current) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(eased * target));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return (
    <span style={{ color, fontFamily: 'monospace', fontWeight: 900 }}>
      {current.toLocaleString()}
    </span>
  );
};

// ── Floating sparkle particles ──
const FloatingSparkles: React.FC<{ color: string }> = ({ color }) => {
  const sparkles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    left: `${5 + Math.random() * 90}%`,
    delay: Math.random() * 2,
    duration: 2 + Math.random() * 3,
    size: 2 + Math.random() * 4,
  }));

  return (
    <>
      {sparkles.map(s => (
        <motion.div
          key={s.id}
          style={{
            position: 'absolute',
            left: s.left,
            bottom: '20%',
            width: s.size,
            height: s.size,
            borderRadius: '50%',
            background: color,
            boxShadow: `0 0 ${s.size * 3}px ${color}`,
            pointerEvents: 'none',
          }}
          initial={{ opacity: 0, y: 0 }}
          animate={{
            opacity: [0, 0.8, 0],
            y: [0, -(100 + Math.random() * 200)],
            x: [(Math.random() - 0.5) * 80],
          }}
          transition={{
            duration: s.duration,
            delay: s.delay,
            repeat: Infinity,
            ease: 'easeOut',
          }}
        />
      ))}
    </>
  );
};

const PurchaseCelebrationModal: React.FC<PurchaseCelebrationProps> = ({
  isOpen, packName, amount, currency, packImage, tierColor, onClose,
}) => {
  const [showContent, setShowContent] = useState(false);
  const [showText, setShowText] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      setShowContent(false);
      setShowText(false);
      setShowButton(false);
      hasTriggeredRef.current = false;
      return;
    }

    // Fire confetti burst
    if (!hasTriggeredRef.current) {
      hasTriggeredRef.current = true;
      // Slight delay for the overlay to fade in first
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('reforge:confetti', {
          detail: { intensity: 'large' },
        }));
      }, 300);
      // Second burst for extra impact
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('reforge:confetti', {
          detail: { intensity: 'large' },
        }));
      }, 800);
    }

    // Staggered reveal
    const t1 = setTimeout(() => setShowContent(true), 200);
    const t2 = setTimeout(() => setShowText(true), 800);
    const t3 = setTimeout(() => setShowButton(true), 1400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isOpen]);

  const currencyLabel = currency === 'keys' ? 'KEYS' : 'GOLD';
  const currencyIcon = currency === 'keys' ? '🔑' : '🪙';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Radial background glow */}
          <div
            style={{
              position: 'absolute',
              top: '30%',
              left: '50%',
              width: 500,
              height: 500,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${tierColor}25 0%, ${tierColor}08 40%, transparent 70%)`,
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
            }}
          />

          {/* Floating sparkles */}
          <FloatingSparkles color={tierColor} />

          {/* ── Product Image ── */}
          <AnimatePresence>
            {showContent && (
              <motion.div
                initial={{ scale: 0, rotate: -10, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{
                  type: 'spring',
                  stiffness: 200,
                  damping: 15,
                  mass: 0.8,
                }}
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 20,
                }}
              >
                {/* Glow ring behind product */}
                <motion.div
                  style={{
                    position: 'absolute',
                    width: 220,
                    height: 220,
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${tierColor}30 0%, ${tierColor}10 50%, transparent 70%)`,
                    boxShadow: `0 0 80px ${tierColor}30, 0 0 120px ${tierColor}15`,
                  }}
                  animate={{
                    scale: [1, 1.15, 1],
                    opacity: [0.6, 1, 0.6],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
                {/* Product image */}
                <motion.img
                  src={packImage}
                  alt={packName}
                  draggable={false}
                  style={{
                    width: 200,
                    height: 200,
                    objectFit: 'contain',
                    position: 'relative',
                    zIndex: 2,
                    filter: `drop-shadow(0 0 30px ${tierColor}60) drop-shadow(0 8px 30px rgba(0,0,0,0.6))`,
                  }}
                  animate={{
                    y: [0, -8, 0],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Success Check + Text ── */}
          <AnimatePresence>
            {showText && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  position: 'relative',
                  zIndex: 3,
                }}
              >
                {/* Success icon */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 12, delay: 0.1 }}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 30px rgba(34,197,94,0.5)',
                    marginBottom: 4,
                  }}
                >
                  <CheckCircle2 size={26} color="#fff" />
                </motion.div>

                {/* Pack name */}
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.5)',
                    fontFamily: 'monospace',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                  }}
                >
                  {packName}
                </div>

                {/* Amount added — big animated counter */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <span style={{ fontSize: 40, filter: `drop-shadow(0 0 8px ${tierColor})` }}>
                    {currencyIcon}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span
                      style={{
                        fontSize: 42,
                        fontWeight: 900,
                        fontFamily: 'monospace',
                        color: '#fff',
                        textShadow: `0 0 30px ${tierColor}80`,
                        lineHeight: 1,
                      }}
                    >
                      +<AnimatedCounter target={amount} color="#fff" />
                    </span>
                  </div>
                </div>

                {/* Currency type label */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  style={{
                    fontSize: 16,
                    fontWeight: 900,
                    color: tierColor,
                    fontFamily: 'monospace',
                    letterSpacing: '0.2em',
                    textShadow: `0 0 20px ${tierColor}60`,
                  }}
                >
                  {currencyLabel} ADDED
                </motion.div>

                {/* "Purchase Successful" tag */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  style={{
                    marginTop: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 16px',
                    borderRadius: 20,
                    background: 'rgba(34,197,94,0.08)',
                    border: '1px solid rgba(34,197,94,0.2)',
                  }}
                >
                  <Sparkles size={12} color="#22c55e" />
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      color: '#22c55e',
                      fontFamily: 'monospace',
                      letterSpacing: '0.1em',
                    }}
                  >
                    PURCHASE SUCCESSFUL
                  </span>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Continue Button ── */}
          <AnimatePresence>
            {showButton && (
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                onClick={onClose}
                style={{
                  position: 'relative',
                  zIndex: 3,
                  marginTop: 32,
                  padding: '14px 60px',
                  borderRadius: 16,
                  border: `2px solid ${tierColor}80`,
                  background: `linear-gradient(135deg, ${tierColor}25, ${tierColor}10)`,
                  color: '#fff',
                  fontSize: 16,
                  fontWeight: 900,
                  fontFamily: 'monospace',
                  letterSpacing: '0.1em',
                  cursor: 'pointer',
                  boxShadow: `0 0 30px ${tierColor}20, 0 4px 20px rgba(0,0,0,0.3)`,
                  transition: 'all 0.2s ease',
                }}
                whileTap={{ scale: 0.95 }}
                whileHover={{
                  boxShadow: `0 0 40px ${tierColor}40, 0 4px 20px rgba(0,0,0,0.3)`,
                  background: `linear-gradient(135deg, ${tierColor}40, ${tierColor}20)`,
                }}
              >
                CONTINUE
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PurchaseCelebrationModal;
