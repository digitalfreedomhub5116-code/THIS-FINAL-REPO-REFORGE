/**
 * WelcomeRewardChest.tsx
 * ──────────────────────
 * Full-screen "System Awakening" reward chest animation shown to new users.
 * Displays starter credits (500 Gold + 10 Keys) with epic RPG flair.
 *
 * Flow: Dark overlay → System text → Chest pulse → Tap to open →
 *       Rewards fly out → Counters animate → CTA button
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface WelcomeRewardChestProps {
  onComplete: () => void;
  goldAmount?: number;
  keysAmount?: number;
}

const WelcomeRewardChest: React.FC<WelcomeRewardChestProps> = ({
  onComplete,
  goldAmount = 600,
  keysAmount = 10,
}) => {
  const [phase, setPhase] = useState<'intro' | 'chest' | 'reveal' | 'done'>('intro');
  const [goldCounter, setGoldCounter] = useState(0);
  const [keysCounter, setKeysCounter] = useState(0);

  // Phase 1 → Phase 2 (auto-advance after intro text)
  useEffect(() => {
    if (phase === 'intro') {
      const t = setTimeout(() => setPhase('chest'), 2200);
      return () => clearTimeout(t);
    }
  }, [phase]);

  // Phase 3: Animate counters
  useEffect(() => {
    if (phase !== 'reveal') return;
    const duration = 1200;
    const steps = 30;
    const goldStep = goldAmount / steps;
    const keysStep = keysAmount / steps;
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setGoldCounter(Math.min(Math.round(goldStep * i), goldAmount));
      setKeysCounter(Math.min(Math.round(keysStep * i), keysAmount));
      if (i >= steps) {
        clearInterval(interval);
        setTimeout(() => setPhase('done'), 400);
      }
    }, duration / steps);
    return () => clearInterval(interval);
  }, [phase, goldAmount, keysAmount]);

  const handleChestTap = useCallback(() => {
    if (phase === 'chest') {
      setPhase('reveal');
    }
  }, [phase]);

  // Generate particle positions for the burst
  const particles = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    angle: (i / 24) * 360,
    delay: Math.random() * 0.3,
    distance: 80 + Math.random() * 120,
    size: 3 + Math.random() * 5,
    color: i % 3 === 0 ? '#F59E0B' : i % 3 === 1 ? '#8B5CF6' : '#00d4ff',
  }));

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
        background: 'radial-gradient(ellipse at center, rgba(10,8,30,0.97) 0%, rgba(0,0,0,0.99) 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        touchAction: 'none',
      }}
    >
      {/* Background ambient particles */}
      {Array.from({ length: 40 }).map((_, i) => (
        <motion.div
          key={`bg-${i}`}
          initial={{ opacity: 0, y: '100vh' }}
          animate={{
            opacity: [0, 0.4, 0],
            y: [window.innerHeight, -50],
          }}
          transition={{
            duration: 4 + Math.random() * 4,
            repeat: Infinity,
            delay: Math.random() * 5,
            ease: 'linear',
          }}
          style={{
            position: 'absolute',
            left: `${Math.random() * 100}%`,
            width: 2 + Math.random() * 3,
            height: 2 + Math.random() * 3,
            borderRadius: '50%',
            background: i % 2 === 0 ? '#F59E0B' : '#8B5CF6',
            pointerEvents: 'none',
          }}
        />
      ))}

      {/* Phase 1: System Intro Text */}
      <AnimatePresence>
        {phase === 'intro' && (
          <motion.div
            key="intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.5 }}
            style={{ textAlign: 'center', position: 'relative', zIndex: 10 }}
          >
            <motion.div
              initial={{ opacity: 0, letterSpacing: '0.8em' }}
              animate={{ opacity: 1, letterSpacing: '0.35em' }}
              transition={{ duration: 1, ease: 'easeOut' }}
              style={{
                fontFamily: 'monospace',
                fontSize: 11,
                fontWeight: 800,
                color: '#00d4ff',
                textTransform: 'uppercase',
                marginBottom: 16,
                textShadow: '0 0 20px rgba(0,212,255,0.5)',
              }}
            >
              ⚡ System Notification ⚡
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              style={{
                fontFamily: 'monospace',
                fontSize: 18,
                fontWeight: 900,
                color: '#fff',
                letterSpacing: '0.08em',
              }}
            >
              Hunter Awakening Detected
            </motion.div>

            <motion.div
              initial={{ width: 0 }}
              animate={{ width: 200 }}
              transition={{ delay: 1.2, duration: 0.8 }}
              style={{
                height: 2,
                background: 'linear-gradient(90deg, transparent, #00d4ff, transparent)',
                margin: '16px auto 0',
                boxShadow: '0 0 15px rgba(0,212,255,0.4)',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Phase 2: Chest — Tap to Open */}
      <AnimatePresence>
        {phase === 'chest' && (
          <motion.div
            key="chest"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.3 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            onClick={handleChestTap}
            style={{
              textAlign: 'center',
              cursor: 'pointer',
              position: 'relative',
              zIndex: 10,
            }}
          >
            {/* Glowing aura behind chest */}
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: 260,
                height: 260,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(245,158,11,0.25) 0%, rgba(139,92,246,0.15) 40%, transparent 70%)',
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none',
              }}
            />

            {/* Chest emoji/icon */}
            <motion.div
              animate={{
                scale: [1, 1.05, 1],
                rotate: [0, -2, 2, 0],
              }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                fontSize: 100,
                lineHeight: 1,
                filter: 'drop-shadow(0 0 30px rgba(245,158,11,0.5))',
                marginBottom: 24,
              }}
            >
              🎁
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              style={{
                fontFamily: 'monospace',
                fontSize: 13,
                fontWeight: 800,
                color: '#F59E0B',
                textTransform: 'uppercase',
                letterSpacing: '0.2em',
                textShadow: '0 0 10px rgba(245,158,11,0.4)',
              }}
            >
              Tap to Open
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Phase 3: Reward Reveal */}
      <AnimatePresence>
        {(phase === 'reveal' || phase === 'done') && (
          <motion.div
            key="reveal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              textAlign: 'center',
              position: 'relative',
              zIndex: 10,
              width: '100%',
              maxWidth: 360,
              padding: '0 24px',
            }}
          >
            {/* Particle burst */}
            {particles.map((p) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                animate={{
                  opacity: 0,
                  x: Math.cos((p.angle * Math.PI) / 180) * p.distance,
                  y: Math.sin((p.angle * Math.PI) / 180) * p.distance,
                  scale: 0,
                }}
                transition={{ duration: 1.2, delay: p.delay, ease: 'easeOut' }}
                style={{
                  position: 'absolute',
                  top: '30%',
                  left: '50%',
                  width: p.size,
                  height: p.size,
                  borderRadius: '50%',
                  background: p.color,
                  boxShadow: `0 0 8px ${p.color}`,
                  pointerEvents: 'none',
                }}
              />
            ))}

            {/* Title */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, type: 'spring' }}
              style={{
                fontFamily: 'monospace',
                fontSize: 11,
                fontWeight: 800,
                color: '#00d4ff',
                letterSpacing: '0.3em',
                textTransform: 'uppercase',
                marginBottom: 8,
                textShadow: '0 0 15px rgba(0,212,255,0.5)',
              }}
            >
              Starter Rewards Unlocked
            </motion.div>

            {/* Reward Cards */}
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 24 }}>
              {/* Gold Card */}
              <motion.div
                initial={{ opacity: 0, y: 30, rotateY: -90 }}
                animate={{ opacity: 1, y: 0, rotateY: 0 }}
                transition={{ delay: 0.3, duration: 0.6, type: 'spring' }}
                style={{
                  flex: 1,
                  padding: 20,
                  borderRadius: 16,
                  background: 'linear-gradient(160deg, rgba(245,158,11,0.15), rgba(245,158,11,0.03) 80%)',
                  border: '1px solid rgba(245,158,11,0.3)',
                  boxShadow: '0 0 30px rgba(245,158,11,0.15)',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 44, lineHeight: 1, marginBottom: 8 }}>💰</div>
                <motion.div
                  style={{
                    fontSize: 32,
                    fontWeight: 900,
                    color: '#F59E0B',
                    fontFamily: 'monospace',
                    textShadow: '0 0 20px rgba(245,158,11,0.4)',
                  }}
                >
                  {goldCounter}
                </motion.div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'rgba(245,158,11,0.7)',
                    letterSpacing: '0.15em',
                    marginTop: 4,
                    fontFamily: 'monospace',
                    textTransform: 'uppercase',
                  }}
                >
                  Gold Crystals
                </div>
              </motion.div>

              {/* Keys Card */}
              <motion.div
                initial={{ opacity: 0, y: 30, rotateY: 90 }}
                animate={{ opacity: 1, y: 0, rotateY: 0 }}
                transition={{ delay: 0.5, duration: 0.6, type: 'spring' }}
                style={{
                  flex: 1,
                  padding: 20,
                  borderRadius: 16,
                  background: 'linear-gradient(160deg, rgba(139,92,246,0.15), rgba(139,92,246,0.03) 80%)',
                  border: '1px solid rgba(139,92,246,0.3)',
                  boxShadow: '0 0 30px rgba(139,92,246,0.15)',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 44, lineHeight: 1, marginBottom: 8 }}>🔑</div>
                <motion.div
                  style={{
                    fontSize: 32,
                    fontWeight: 900,
                    color: '#A78BFA',
                    fontFamily: 'monospace',
                    textShadow: '0 0 20px rgba(139,92,246,0.4)',
                  }}
                >
                  {keysCounter}
                </motion.div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'rgba(139,92,246,0.7)',
                    letterSpacing: '0.15em',
                    marginTop: 4,
                    fontFamily: 'monospace',
                    textTransform: 'uppercase',
                  }}
                >
                  Shadow Keys
                </div>
              </motion.div>
            </div>

            {/* Subtitle */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.4 }}
              style={{
                marginTop: 20,
                fontSize: 12,
                color: 'rgba(255,255,255,0.4)',
                fontFamily: 'monospace',
                letterSpacing: '0.1em',
              }}
            >
              Your journey begins, Hunter.
            </motion.div>

            {/* CTA Button */}
            <AnimatePresence>
              {phase === 'done' && (
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, type: 'spring' }}
                  onClick={onComplete}
                  style={{
                    marginTop: 32,
                    padding: '14px 40px',
                    borderRadius: 14,
                    border: '1px solid rgba(0,212,255,0.4)',
                    background: 'linear-gradient(135deg, rgba(0,212,255,0.2), rgba(0,212,255,0.05))',
                    color: '#00d4ff',
                    fontSize: 13,
                    fontWeight: 900,
                    fontFamily: 'monospace',
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    boxShadow: '0 0 25px rgba(0,212,255,0.2)',
                    outline: 'none',
                  }}
                >
                  Enter The System →
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default WelcomeRewardChest;
