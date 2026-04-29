import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Lottie from 'lottie-react';
import { useSystem } from '../hooks/useSystem';
import { playSystemSoundEffect } from '../utils/soundEngine';

interface ChestOpeningOverlayProps {
  onClose: () => void;
  chestType: 'LEGENDARY';
}

const REWARD_ICONS: Record<string, string> = {
  GOLD: '🪙',
  STONE: '💎',
};

export default function ChestOpeningOverlay({ onClose, chestType }: ChestOpeningOverlayProps) {
  const [lottieData, setLottieData] = useState<any>(null);
  const [phase, setPhase] = useState<'IDLE' | 'OPENING' | 'OPENED'>('IDLE');
  const [rewards, setRewards] = useState<{ amount: number; type: string; label: string; color: string }[]>([]);
  const { player, addNotification, openLegendaryChest } = useSystem();
  const lottieRef = useRef<any>(null);
  const isOpening = useRef(false);
  const showRewardsRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    fetch('/assets/lottie/legendary_chest.json')
      .then(res => res.json())
      .then(data => setLottieData(data))
      .catch(() => {});
  }, []);

  const handleDOMLoaded = () => {
    // Reliably freeze at frame 0 once the animation DOM is ready
    if (lottieRef.current) {
      lottieRef.current.goToAndStop(0, true);
    }
  };

  const handleOpen = () => {
    if (isOpening.current || phase !== 'IDLE') return;
    isOpening.current = true;

    if ((player.chests?.legendary || 0) <= 0) {
      addNotification("You don't have any Legendary Chests!", 'WARNING');
      onClose();
      return;
    }

    setPhase('OPENING');
    playSystemSoundEffect('QUEST_COMPLETE');

    // Play the lottie animation from the start
    if (lottieRef.current) {
      lottieRef.current.goToAndPlay(0, true);
    }

    const result = openLegendaryChest();
    if (!result) {
      addNotification("You don't have any Legendary Chests!", 'WARNING');
      onClose();
      return;
    }
    const { gold, stones } = result;

    // Wait for the lottie animation to finish (inferred from frame count), then show cards
    // legendary_chest.json is ~90 frames at default speed ≈ 3s; we use onComplete via lottieRef
    const showRewards = () => {
      window.dispatchEvent(new CustomEvent('reforge:coin-earned', { detail: { goldGained: gold, startRect: null } }));

      window.dispatchEvent(new CustomEvent('stone:earned', {
        detail: { outfitId: 'outfit_starter', amount: stones, oldCount: 0, newCount: stones, color: '#9ca3af', glow: 'rgba(156,163,175,0.5)', badgeUnlocked: false },
      }));
      setRewards([
        { amount: gold, type: 'GOLD', label: 'Gold', color: '#facc15' },
        { amount: stones, type: 'STONE', label: 'Outfit Stones', color: '#9ca3af' },
      ]);
      setPhase('OPENED');
    };

    // onComplete fires when lottie animation ends (loop=false); fallback timer in case lottie isn't loaded
    if (lottieData) {
      // onComplete handled via prop below — store callback in ref so it can access fresh values
      showRewardsRef.current = showRewards;
    } else {
      setTimeout(showRewards, 2500);
    }
  };

  const handleLottieComplete = () => {
    // Freeze on the last frame
    if (lottieRef.current) {
      const totalFrames = lottieRef.current.getDuration(true);
      lottieRef.current.goToAndStop(totalFrames - 1, true);
    }
    if (showRewardsRef.current) {
      showRewardsRef.current();
      showRewardsRef.current = null;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[150] flex flex-col items-center justify-center bg-black/95 backdrop-blur-md"
      >
        {/* Glow */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <motion.div
            animate={{
              scale: phase === 'OPENING' ? [1, 1.3, 1] : 1,
              opacity: phase === 'OPENING' ? [0.3, 0.9, 0.5] : 0.3,
            }}
            transition={{ duration: 1.2, repeat: phase === 'OPENING' ? Infinity : 0 }}
            className="w-96 h-96 rounded-full blur-[100px]"
            style={{ background: 'radial-gradient(circle, rgba(234,179,8,0.5) 0%, transparent 70%)' }}
          />
        </div>

        <div className="relative z-10 w-full max-w-sm flex flex-col items-center px-6">
          {/* Title */}
          <motion.h2
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-2xl font-black text-white tracking-widest uppercase mb-6"
            style={{ textShadow: '0 0 20px rgba(250,204,21,0.6)' }}
          >
            Legendary Chest
          </motion.h2>

          {/* Chest animation */}
          <div
            className="w-72 h-72 relative cursor-pointer select-none"
            onClick={phase === 'IDLE' ? handleOpen : undefined}
          >
            {lottieData ? (
              <Lottie
                lottieRef={lottieRef}
                animationData={lottieData}
                loop={false}
                autoplay={false}
                onDOMLoaded={handleDOMLoaded}
                onComplete={handleLottieComplete}
                className="w-full h-full drop-shadow-2xl"
              />
            ) : (
              /* Fallback box when JSON not yet loaded */
              <div
                className="w-full h-full flex items-center justify-center border-2 border-dashed border-yellow-500/30 rounded-2xl bg-yellow-500/5"
                onClick={handleOpen}
              >
                <span className="text-yellow-500/50 text-xs text-center px-4 font-mono">
                  {phase === 'IDLE' ? 'TAP TO OPEN' : phase === 'OPENING' ? 'UNLOCKING…' : '✓'}
                </span>
              </div>
            )}

            {/* TAP TO OPEN hint overlaid on chest */}
            {phase === 'IDLE' && (
              <motion.div
                className="absolute inset-x-0 bottom-0 flex justify-center pb-2 pointer-events-none"
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.8, repeat: Infinity }}
              >
                <span className="text-yellow-400 font-mono text-xs font-bold tracking-widest drop-shadow-lg">
                  TAP TO OPEN
                </span>
              </motion.div>
            )}

            {phase === 'OPENING' && (
              <motion.div
                className="absolute inset-x-0 bottom-0 flex justify-center pb-2 pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <span className="text-white font-mono text-xs font-bold tracking-widest animate-pulse">
                  UNLOCKING…
                </span>
              </motion.div>
            )}
          </div>

          {/* Reward cards that emerge once opened */}
          <AnimatePresence>
            {phase === 'OPENED' && (
              <motion.div
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 120, damping: 16 }}
                className="mt-6 w-full flex flex-col gap-3"
              >
                {rewards.map((r, i) => (
                  <motion.div
                    key={i}
                    initial={{ x: -30, opacity: 0, scale: 0.9 }}
                    animate={{ x: 0, opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.18, type: 'spring', stiffness: 180 }}
                    className="flex items-center justify-between px-4 py-3 rounded-2xl"
                    style={{
                      background: `linear-gradient(135deg, ${r.color}18 0%, rgba(0,0,0,0.6) 100%)`,
                      border: `1px solid ${r.color}40`,
                      boxShadow: `0 0 12px ${r.color}20`,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{REWARD_ICONS[r.type] ?? '🎁'}</span>
                      <span className="font-mono font-bold tracking-widest text-xs text-gray-300 uppercase">
                        {r.label}
                      </span>
                    </div>
                    <motion.span
                      initial={{ scale: 0.5 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: i * 0.18 + 0.15, type: 'spring' }}
                      className="font-black text-xl"
                      style={{ color: r.color, textShadow: `0 0 8px ${r.color}80` }}
                    >
                      +{r.amount}
                    </motion.span>
                  </motion.div>
                ))}

                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: rewards.length * 0.18 + 0.3 }}
                  onClick={onClose}
                  className="mt-2 w-full py-3 rounded-2xl font-black tracking-widest uppercase text-sm transition-all active:scale-95"
                  style={{
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    color: '#000',
                    boxShadow: '0 0 20px rgba(245,158,11,0.4)',
                  }}
                >
                  Collect Rewards
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
