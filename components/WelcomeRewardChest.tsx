/**
 * WelcomeRewardChest.tsx
 * ──────────────────────
 * Full-screen "Welcome" reward screen shown to new users.
 * Shows hunter name, two flipping reward cards (Gold + Keys), and a CTA.
 *
 * Flow: Title fades in → Cards flip from back → Continue button appears
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface WelcomeRewardChestProps {
  onComplete: () => void;
  hunterName?: string;
  goldAmount?: number;
  keysAmount?: number;
}

const WelcomeRewardChest: React.FC<WelcomeRewardChestProps> = ({
  onComplete,
  hunterName = 'Hunter',
  goldAmount = 600,
  keysAmount = 10,
}) => {
  const [showCards, setShowCards] = useState(false);
  const [card1Flipped, setCard1Flipped] = useState(false);
  const [card2Flipped, setCard2Flipped] = useState(false);
  const [showCTA, setShowCTA] = useState(false);

  // Sequence: title → cards appear → flip card 1 → flip card 2 → CTA
  useEffect(() => {
    const t1 = setTimeout(() => setShowCards(true), 800);
    const t2 = setTimeout(() => setCard1Flipped(true), 1400);
    const t3 = setTimeout(() => setCard2Flipped(true), 1900);
    const t4 = setTimeout(() => setShowCTA(true), 2600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'radial-gradient(ellipse at 50% 30%, rgba(15,10,40,0.98) 0%, rgba(0,0,0,0.99) 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        touchAction: 'none',
        padding: '0 24px',
      }}
    >
      {/* Ambient floating particles */}
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={`p-${i}`}
          initial={{ opacity: 0, y: '100vh' }}
          animate={{ opacity: [0, 0.3, 0], y: [window.innerHeight, -20] }}
          transition={{ duration: 5 + Math.random() * 4, repeat: Infinity, delay: Math.random() * 4, ease: 'linear' }}
          style={{
            position: 'absolute',
            left: `${Math.random() * 100}%`,
            width: 2 + Math.random() * 2,
            height: 2 + Math.random() * 2,
            borderRadius: '50%',
            background: i % 2 === 0 ? '#F59E0B' : '#8B5CF6',
            pointerEvents: 'none',
          }}
        />
      ))}

      {/* Title Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        style={{ textAlign: 'center', marginBottom: 40, position: 'relative', zIndex: 10 }}
      >
        <div style={{
          fontFamily: 'monospace',
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: '0.3em',
          color: '#00d4ff',
          textTransform: 'uppercase',
          marginBottom: 10,
          textShadow: '0 0 20px rgba(0,212,255,0.4)',
        }}>
          ⚡ System Notification ⚡
        </div>

        <div style={{
          fontSize: 26,
          fontWeight: 900,
          color: '#fff',
          letterSpacing: '0.02em',
          lineHeight: 1.2,
          textShadow: '0 4px 20px rgba(0,0,0,0.6)',
        }}>
          WELCOME, <span style={{ color: '#00d4ff' }}>{hunterName.toUpperCase()}</span>
        </div>

        <motion.div
          initial={{ width: 0 }}
          animate={{ width: 180 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          style={{
            height: 2,
            background: 'linear-gradient(90deg, transparent, rgba(0,212,255,0.5), transparent)',
            margin: '12px auto',
          }}
        />

        <div style={{
          fontFamily: 'monospace',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.18em',
          color: 'rgba(255,255,255,0.5)',
          textTransform: 'uppercase',
        }}>
          Here are your joining rewards
        </div>
      </motion.div>

      {/* Reward Cards */}
      <AnimatePresence>
        {showCards && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              display: 'flex',
              gap: 20,
              justifyContent: 'center',
              position: 'relative',
              zIndex: 10,
              perspective: 1000,
            }}
          >
            {/* Gold Card */}
            <FlipCard
              flipped={card1Flipped}
              emoji="💰"
              amount={goldAmount}
              label="Gold Crystals"
              color="#F59E0B"
              bgGrad="linear-gradient(160deg, rgba(245,158,11,0.2), rgba(245,158,11,0.04) 80%)"
              borderColor="rgba(245,158,11,0.35)"
              glowColor="rgba(245,158,11,0.2)"
            />

            {/* Keys Card */}
            <FlipCard
              flipped={card2Flipped}
              emoji="🔑"
              amount={keysAmount}
              label="Shadow Keys"
              color="#A78BFA"
              bgGrad="linear-gradient(160deg, rgba(139,92,246,0.2), rgba(139,92,246,0.04) 80%)"
              borderColor="rgba(139,92,246,0.35)"
              glowColor="rgba(139,92,246,0.2)"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* CTA Button */}
      <AnimatePresence>
        {showCTA && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            onClick={onComplete}
            style={{
              marginTop: 40,
              padding: '14px 44px',
              borderRadius: 14,
              border: '1px solid rgba(0,212,255,0.4)',
              background: 'linear-gradient(135deg, rgba(0,212,255,0.2), rgba(0,212,255,0.05))',
              color: '#00d4ff',
              fontSize: 13,
              fontWeight: 900,
              fontFamily: 'monospace',
              letterSpacing: '0.2em',
              textTransform: 'uppercase' as const,
              cursor: 'pointer',
              boxShadow: '0 0 25px rgba(0,212,255,0.2)',
              outline: 'none',
              position: 'relative',
              zIndex: 10,
            }}
          >
            Continue →
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ── Flip Card Sub-Component ──
interface FlipCardProps {
  flipped: boolean;
  emoji: string;
  amount: number;
  label: string;
  color: string;
  bgGrad: string;
  borderColor: string;
  glowColor: string;
}

const FlipCard: React.FC<FlipCardProps> = ({
  flipped, emoji, amount, label, color, bgGrad, borderColor, glowColor,
}) => {
  const [counter, setCounter] = useState(0);

  // Animate counter when flipped
  useEffect(() => {
    if (!flipped) return;
    const steps = 20;
    const step = amount / steps;
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setCounter(Math.min(Math.round(step * i), amount));
      if (i >= steps) clearInterval(interval);
    }, 40);
    return () => clearInterval(interval);
  }, [flipped, amount]);

  return (
    <div style={{ perspective: 800, width: 140, height: 190 }}>
      <motion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Card Back */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backfaceVisibility: 'hidden',
            borderRadius: 16,
            background: 'linear-gradient(160deg, rgba(30,20,60,0.9), rgba(15,10,35,0.95))',
            border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}
        >
          <div style={{
            fontSize: 36,
            opacity: 0.3,
            marginBottom: 8,
          }}>
            ?
          </div>
          <div style={{
            fontFamily: 'monospace',
            fontSize: 9,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.2)',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
          }}>
            Reward
          </div>
        </div>

        {/* Card Front (flipped) */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            borderRadius: 16,
            background: bgGrad,
            border: `1px solid ${borderColor}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 40px ${glowColor}`,
            padding: 16,
          }}
        >
          <div style={{ fontSize: 48, lineHeight: 1, marginBottom: 12 }}>
            {emoji}
          </div>
          <div style={{
            fontSize: 34,
            fontWeight: 900,
            color,
            fontFamily: 'monospace',
            textShadow: `0 0 20px ${glowColor}`,
            lineHeight: 1,
          }}>
            {counter}
          </div>
          <div style={{
            fontSize: 10,
            fontWeight: 700,
            color: `${color}AA`,
            letterSpacing: '0.12em',
            marginTop: 6,
            fontFamily: 'monospace',
            textTransform: 'uppercase',
          }}>
            {label}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default WelcomeRewardChest;
