import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Lottie from 'lottie-react';
import { useSystem } from '../hooks/useSystem';
import { playSystemSoundEffect } from '../utils/soundEngine';

interface ChestOpeningOverlayProps {
  onClose: () => void;
  chestType: 'LEGENDARY'; // Add more types later if needed
}

export default function ChestOpeningOverlay({ onClose, chestType }: ChestOpeningOverlayProps) {
  const [lottieData, setLottieData] = useState<any>(null);
  const [phase, setPhase] = useState<'IDLE' | 'OPENING' | 'OPENED'>('IDLE');
  const [rewards, setRewards] = useState<{ amount: number, type: string, label: string, color: string }[]>([]);
  const { player, addNotification, openLegendaryChest } = useSystem();
  
  // This ref ensures we only execute the open logic once
  const isOpening = useRef(false);

  useEffect(() => {
    // Attempt to load the JSON file from public assets
    fetch('/assets/lottie/legendary_chest.json')
      .then(res => res.json())
      .then(data => setLottieData(data))
      .catch(err => {
        console.warn('Lottie file not found at /assets/lottie/legendary_chest.json, please download one.', err);
        // Fallback or error state could go here, but we will still run logic
      });
  }, []);

  const handleOpen = () => {
    if (isOpening.current || phase !== 'IDLE') return;
    isOpening.current = true;
    
    // Check if player actually has the chest
    if ((player.chests?.legendary || 0) <= 0) {
      addNotification("You don't have any Legendary Chests!", 'WARNING');
      onClose();
      return;
    }

    setPhase('OPENING');
    playSystemSoundEffect('QUEST_COMPLETE');

    // Mutate player state immediately and get actual reward values
    const result = openLegendaryChest();
    if (!result) {
      addNotification("You don't have any Legendary Chests!", 'WARNING');
      onClose();
      return;
    }
    const { gold, scrolls, stones } = result;

    setTimeout(() => {
      // Dispatch HUD animation events with the real values
      window.dispatchEvent(new CustomEvent('reforge:coin-earned', { detail: { goldGained: gold, startRect: null } }));
      window.dispatchEvent(new CustomEvent('reforge:consumable-earned', { detail: { type: 'SCROLL', amount: scrolls, startRect: null } }));
      window.dispatchEvent(new CustomEvent('stone:earned', {
        detail: { outfitId: 'outfit_starter', amount: stones, oldCount: 0, newCount: stones, color: '#9ca3af', glow: 'rgba(156,163,175,0.5)', badgeUnlocked: false }
      }));

      setRewards([
        { amount: gold, type: 'GOLD', label: 'Gold', color: '#facc15' },
        { amount: scrolls, type: 'SCROLL', label: 'Shadow Scrolls', color: '#818cf8' },
        { amount: stones, type: 'STONE', label: 'Ash Crystals', color: '#9ca3af' },
      ]);
      setPhase('OPENED');
    }, 2500);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[150] flex flex-col items-center justify-center bg-black/95 backdrop-blur-md"
      >
        {/* Glow Background */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <motion.div 
            animate={{ 
              scale: phase === 'OPENING' ? [1, 1.2, 1] : 1,
              opacity: phase === 'OPENING' ? [0.3, 0.8, 0.5] : 0.3
            }}
            transition={{ duration: 1, repeat: phase === 'OPENING' ? Infinity : 0 }}
            className="w-96 h-96 rounded-full blur-[100px]"
            style={{ background: 'radial-gradient(circle, rgba(234,179,8,0.4) 0%, transparent 70%)' }}
          />
        </div>

        <div className="relative z-10 w-full max-w-sm flex flex-col items-center">
          {/* Title */}
          <motion.h2 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-2xl font-black text-white tracking-widest uppercase mb-8"
            style={{ textShadow: '0 0 20px rgba(250,204,21,0.5)' }}
          >
            Legendary Chest
          </motion.h2>

          {/* Lottie Animation Area */}
          <div className="w-64 h-64 relative cursor-pointer" onClick={handleOpen}>
            {lottieData ? (
              <Lottie
                animationData={lottieData}
                loop={phase === 'IDLE'}
                autoplay={true}
                className="w-full h-full drop-shadow-2xl"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center border-2 border-dashed border-yellow-500/30 rounded-2xl bg-yellow-500/5">
                <span className="text-yellow-500/50 text-xs text-center px-4 font-mono">
                  [Missing legendary_chest.json in public/assets/lottie/]
                  <br/><br/>
                  Tap to simulate open
                </span>
              </div>
            )}
          </div>

          {/* Action Text / Rewards */}
          <div className="mt-8 h-32 flex items-center justify-center w-full">
            {phase === 'IDLE' && (
              <motion.div 
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-yellow-400 font-mono text-sm tracking-widest font-bold"
              >
                TAP TO OPEN
              </motion.div>
            )}

            {phase === 'OPENING' && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-white font-mono text-sm tracking-widest font-bold animate-pulse"
              >
                UNLOCKING...
              </motion.div>
            )}

            {phase === 'OPENED' && (
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col gap-3 w-full px-8"
              >
                {rewards.map((r, i) => (
                  <motion.div 
                    key={i}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: i * 0.2 }}
                    className="flex items-center justify-between p-3 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${r.color}30` }}
                  >
                    <span className="font-mono font-bold tracking-widest text-xs text-gray-300">{r.label}</span>
                    <span className="font-black text-lg" style={{ color: r.color }}>+{r.amount}</span>
                  </motion.div>
                ))}
                
                <button 
                  onClick={onClose}
                  className="mt-4 px-6 py-3 w-full rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold tracking-widest uppercase text-xs transition-colors"
                >
                  Collect Rewards
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
