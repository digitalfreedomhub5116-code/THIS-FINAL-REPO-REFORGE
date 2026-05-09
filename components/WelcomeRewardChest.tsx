/**
 * WelcomeRewardChest.tsx
 * ──────────────────────
 * Full-screen first-registration reward cinematic.
 * Daily chest Lottie vibrates → opens → light burst → 2 cards fly out → flip to reveal rewards.
 *
 * Flow: Chest IDLE → Vibrate → OPEN → Light Burst → Cards Fly Out → Flip → CTA
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DailyChestLottie } from './ChestLottieOverlays';
import { triggerHaptic } from '../utils/soundEngine';

interface WelcomeRewardChestProps {
  onComplete: () => void;
  hunterName?: string;
  goldAmount?: number;
  keysAmount?: number;
}

type Phase = 'INTRO' | 'VIBRATE' | 'OPENING' | 'BURST' | 'CARDS_OUT' | 'FLIP' | 'CTA';

const WelcomeRewardChest: React.FC<WelcomeRewardChestProps> = ({
  onComplete,
  hunterName = 'Hunter',
  goldAmount = 600,
  keysAmount = 10,
}) => {
  const [phase, setPhase] = useState<Phase>('INTRO');
  const [card1Counter, setCard1Counter] = useState(0);
  const [card2Counter, setCard2Counter] = useState(0);
  const [assetsReady, setAssetsReady] = useState(false);

  // ── Preload critical images before starting animation ──
  useEffect(() => {
    const srcs = [
      '/assets/card-back.webp',
      '/assets/card-back.png',
      '/assets/gold-coin.png',
      '/assets/store/keyless-Photoroom.png',
    ];
    let loaded = 0;
    const onLoad = () => { loaded++; if (loaded >= srcs.length - 1) setAssetsReady(true); };
    srcs.forEach(src => {
      const img = new Image();
      img.onload = onLoad;
      img.onerror = onLoad; // Don't block on failure
      img.src = src;
    });
    // Safety timeout: start anyway after 1.5s
    const safety = setTimeout(() => setAssetsReady(true), 1500);
    return () => clearTimeout(safety);
  }, []);

  // ── Animation timeline (waits for assets) ──
  useEffect(() => {
    if (!assetsReady) return;
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Intro title + chest appear
    timers.push(setTimeout(() => setPhase('VIBRATE'), 1200));

    // Vibrate with sustained haptic pulses (phone vibrates WITH the chest)
    timers.push(setTimeout(() => {
      triggerHaptic('CHEST_VIBRATE');
    }, 1200));

    // Second haptic pulse halfway through vibrate phase
    timers.push(setTimeout(() => {
      triggerHaptic('CHEST_VIBRATE');
    }, 1800));

    // Open chest with impact haptic
    timers.push(setTimeout(() => {
      setPhase('OPENING');
      triggerHaptic('LEVEL_UP');
    }, 2400));

    // Light burst
    // Light burst with impact
    timers.push(setTimeout(() => {
      setPhase('BURST');
      triggerHaptic('SUCCESS');
    }, 3200));

    // Cards fly out
    timers.push(setTimeout(() => {
      setPhase('CARDS_OUT');
      triggerHaptic('PURCHASE');
    }, 3600));

    // Flip cards to reveal
    timers.push(setTimeout(() => {
      setPhase('FLIP');
      triggerHaptic('SWIPE');
    }, 4400));

    // CTA
    timers.push(setTimeout(() => setPhase('CTA'), 5600));

    return () => timers.forEach(clearTimeout);
  }, [assetsReady]);

  // ── Counter animations ──
  useEffect(() => {
    if (phase !== 'FLIP') return;
    const steps = 24;
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setCard1Counter(Math.min(Math.round((goldAmount / steps) * i), goldAmount));
      setCard2Counter(Math.min(Math.round((keysAmount / steps) * i), keysAmount));
      if (i >= steps) clearInterval(interval);
    }, 35);
    return () => clearInterval(interval);
  }, [phase, goldAmount, keysAmount]);

  const chestLottiePhase = phase === 'OPENING' || phase === 'BURST' || phase === 'CARDS_OUT' || phase === 'FLIP' || phase === 'CTA' ? 'OPENING' : 'IDLE';
  const showChest = phase !== 'CTA';
  const showBurst = phase === 'BURST' || phase === 'CARDS_OUT' || phase === 'FLIP' || phase === 'CTA';
  const showCards = phase === 'CARDS_OUT' || phase === 'FLIP' || phase === 'CTA';
  const isFlipped = phase === 'FLIP' || phase === 'CTA';
  const showCTA = phase === 'CTA';

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
      {/* ── Ambient floating particles ── */}
      {Array.from({ length: 24 }).map((_, i) => (
        <motion.div
          key={`p-${i}`}
          initial={{ opacity: 0, y: '100vh' }}
          animate={{ opacity: [0, 0.4, 0], y: [window.innerHeight, -20] }}
          transition={{ duration: 5 + Math.random() * 4, repeat: Infinity, delay: Math.random() * 4, ease: 'linear' }}
          style={{
            position: 'absolute',
            left: `${Math.random() * 100}%`,
            width: 2 + Math.random() * 3,
            height: 2 + Math.random() * 3,
            borderRadius: '50%',
            background: ['#F59E0B', '#8B5CF6', '#00d4ff', '#fbbf24'][i % 4],
            pointerEvents: 'none',
          }}
        />
      ))}

      {/* ── Title Section ── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        style={{ textAlign: 'center', marginBottom: 20, position: 'relative', zIndex: 10 }}
      >
        <div style={{
          fontFamily: 'monospace', fontSize: 11, fontWeight: 800,
          letterSpacing: '0.3em', color: '#00d4ff', textTransform: 'uppercase',
          marginBottom: 10, textShadow: '0 0 20px rgba(0,212,255,0.4)',
        }}>
          ⚡ System Notification ⚡
        </div>
        <div style={{
          fontSize: 24, fontWeight: 900, color: '#fff',
          letterSpacing: '0.02em', lineHeight: 1.2,
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
          fontFamily: 'monospace', fontSize: 11, fontWeight: 700,
          letterSpacing: '0.18em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase',
        }}>
          Registration rewards detected
        </div>
      </motion.div>

      {/* ── Chest + Burst + Cards Container ── */}
      <div style={{ position: 'relative', width: 280, height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>

        {/* Light burst effect */}
        <AnimatePresence>
          {showBurst && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 2.5, 3], opacity: [0, 0.8, 0] }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                width: 200, height: 200,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(0,212,255,0.6) 0%, rgba(139,92,246,0.3) 40%, transparent 70%)',
                pointerEvents: 'none',
              }}
            />
          )}
        </AnimatePresence>

        {/* Chest Lottie */}
        <motion.div
          animate={{
            scale: phase === 'VIBRATE' ? [1, 1.02, 0.98, 1.03, 0.97, 1.02, 1] : phase === 'BURST' || phase === 'CARDS_OUT' || phase === 'FLIP' || phase === 'CTA' ? 0.6 : 1,
            y: phase === 'BURST' || phase === 'CARDS_OUT' || phase === 'FLIP' || phase === 'CTA' ? 60 : 0,
            opacity: showChest ? 1 : 0,
            rotate: phase === 'VIBRATE' ? [0, -2, 3, -3, 2, -1, 0] : 0,
          }}
          transition={{
            scale: phase === 'VIBRATE' ? { duration: 1, repeat: Infinity, repeatType: 'loop' } : { duration: 0.4 },
            y: { duration: 0.5 },
            opacity: { duration: 0.3 },
            rotate: phase === 'VIBRATE' ? { duration: 0.5, repeat: Infinity, repeatType: 'loop' } : { duration: 0.3 },
          }}
          style={{ position: 'absolute', zIndex: 5 }}
        >
          <DailyChestLottie
            size={200}
            phase={chestLottiePhase}
          />
        </motion.div>

        {/* ── Cards flying out from chest center ── */}
        <AnimatePresence>
          {showCards && (
            <>
              {/* Card 1 — Gold (flies left) */}
              <motion.div
                initial={{ x: 0, y: 30, scale: 0.3, opacity: 0 }}
                animate={{
                  x: -82,
                  y: -20,
                  scale: 1,
                  opacity: 1,
                }}
                transition={{ duration: 0.5, type: 'spring', stiffness: 200, damping: 18 }}
                style={{ position: 'absolute', zIndex: 15 }}
              >
                <RewardFlipCard
                  flipped={isFlipped}
                  icon="/assets/gold-coin.png"
                  amount={card1Counter}
                  label="Gold Crystals"
                  color="#F59E0B"
                  bgGrad="linear-gradient(160deg, rgba(245,158,11,0.25), rgba(245,158,11,0.06) 80%)"
                  borderColor="rgba(245,158,11,0.4)"
                  glowColor="rgba(245,158,11,0.25)"
                />
              </motion.div>

              {/* Card 2 — Keys (flies right) */}
              <motion.div
                initial={{ x: 0, y: 30, scale: 0.3, opacity: 0 }}
                animate={{
                  x: 82,
                  y: -20,
                  scale: 1,
                  opacity: 1,
                }}
                transition={{ duration: 0.5, type: 'spring', stiffness: 200, damping: 18, delay: 0.12 }}
                style={{ position: 'absolute', zIndex: 15 }}
              >
                <RewardFlipCard
                  flipped={isFlipped}
                  icon="/assets/store/keyless-Photoroom.png"
                  amount={card2Counter}
                  label="Shadow Keys"
                  color="#A78BFA"
                  bgGrad="linear-gradient(160deg, rgba(139,92,246,0.25), rgba(139,92,246,0.06) 80%)"
                  borderColor="rgba(139,92,246,0.4)"
                  glowColor="rgba(139,92,246,0.25)"
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* ── CTA Button ── */}
      <AnimatePresence>
        {showCTA && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            onClick={onComplete}
            style={{
              marginTop: 32,
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
            Claim & Continue →
          </motion.button>
        )}
      </AnimatePresence>

      {/* Vibrate shimmer effect on edges */}
      {phase === 'VIBRATE' && (
        <motion.div
          animate={{ opacity: [0, 0.15, 0] }}
          transition={{ duration: 0.8, repeat: Infinity }}
          style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(circle at 50% 50%, rgba(0,212,255,0.08) 0%, transparent 60%)',
            pointerEvents: 'none',
          }}
        />
      )}
    </motion.div>
  );
};

// ── Flip Card Sub-Component with antique back ──
interface RewardFlipCardProps {
  flipped: boolean;
  icon: string;
  amount: number;
  label: string;
  color: string;
  bgGrad: string;
  borderColor: string;
  glowColor: string;
}

const RewardFlipCard: React.FC<RewardFlipCardProps> = ({
  flipped, icon, amount, label, color, bgGrad, borderColor, glowColor,
}) => {
  return (
    <div style={{ perspective: 800, width: 140, height: 190 }}>
      <motion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          transformStyle: 'preserve-3d',
        }}
      >
        {/* ── Card Back (Antique Pattern) ── */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backfaceVisibility: 'hidden',
            borderRadius: 16,
            overflow: 'hidden',
            // Solid dark base ensures card is opaque even with transparent PNG
            background: 'linear-gradient(160deg, #1a1033 0%, #0d0a1a 50%, #130e24 100%)',
            border: '1.5px solid rgba(212,175,55,0.3)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5), inset 0 0 30px rgba(212,175,55,0.05)',
          }}
        >
          {/* Antique pattern overlay (WebP primary, PNG fallback) */}
          <picture style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
            <source srcSet="/assets/card-back.webp" type="image/webp" />
            <img
              src="/assets/card-back.png"
              alt=""
              draggable={false}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
          </picture>
          {/* Inner border glow for depth */}
          <div style={{
            position: 'absolute',
            inset: 2,
            borderRadius: 14,
            border: '1px solid rgba(212,175,55,0.08)',
            pointerEvents: 'none',
          }} />
          {/* Shimmer overlay on card back */}
          <motion.div
            animate={{ x: [-150, 200] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 1, ease: 'linear' }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 60,
              height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
              transform: 'skewX(-15deg)',
              pointerEvents: 'none',
            }}
          />
          {/* Mystery label */}
          <div style={{
            position: 'absolute',
            bottom: 12,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontFamily: 'monospace',
            fontSize: 8,
            fontWeight: 700,
            color: 'rgba(212,175,55,0.5)',
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            zIndex: 2,
          }}>
            REWARD
          </div>
        </div>

        {/* ── Card Front (Reward Reveal) ── */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            borderRadius: 16,
            background: `linear-gradient(160deg, #0f0a20 0%, #0a0815 100%)`,
            border: `1.5px solid ${borderColor}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 40px ${glowColor}`,
            padding: 16,
          }}
        >
          {/* Colored tint overlay */}
          <div style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 16,
            background: bgGrad,
            pointerEvents: 'none',
          }} />
          {/* Radial inner glow */}
          <div style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 16,
            background: `radial-gradient(circle at 50% 30%, ${glowColor}, transparent 70%)`,
            pointerEvents: 'none',
          }} />

          <img
            src={icon}
            alt={label}
            width={56}
            height={56}
            style={{ width: 56, height: 56, objectFit: 'contain', marginBottom: 12, position: 'relative', zIndex: 1 }}
            draggable={false}
          />
          <div style={{
            fontSize: 34,
            fontWeight: 900,
            color,
            fontFamily: 'monospace',
            textShadow: `0 0 20px ${glowColor}`,
            lineHeight: 1,
            position: 'relative',
            zIndex: 1,
          }}>
            {amount}
          </div>
          <div style={{
            fontSize: 10,
            fontWeight: 700,
            color: `${color}BB`,
            letterSpacing: '0.12em',
            marginTop: 6,
            fontFamily: 'monospace',
            textTransform: 'uppercase',
            position: 'relative',
            zIndex: 1,
          }}>
            {label}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default WelcomeRewardChest;
