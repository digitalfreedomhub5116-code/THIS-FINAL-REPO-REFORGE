import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Lottie from 'lottie-react';

// ── Types ──
interface SeasonReward {
  rank: number; // 1, 2, or 3 (position in group)
  borderName: string;
  borderImage: string; // e.g. '/borders/border-streak-gold.webp'
  goldAmount: number;  // 3000-5000 (multiple of 50)
  keys: number;        // always 3
}

interface SeasonRewardOverlayProps {
  reward: SeasonReward;
  onClaim: () => void;
}

// ── Card reward content config ──
const getCardRewards = (reward: SeasonReward) => [
  {
    id: 'border',
    title: 'BORDER',
    subtitle: reward.borderName,
    image: reward.borderImage,
    bgColor: reward.rank === 1 ? 'rgba(255,215,0,0.12)' : reward.rank === 2 ? 'rgba(192,192,192,0.12)' : 'rgba(205,127,50,0.12)',
    accentColor: reward.rank === 1 ? '#FFD700' : reward.rank === 2 ? '#C0C0C0' : '#CD7F32',
    type: 'image' as const,
  },
  {
    id: 'keys',
    title: 'KEYS',
    subtitle: `${reward.keys} Keys`,
    image: '/assets/store/key medium-Photoroom.png',
    bgColor: 'rgba(168,85,247,0.12)',
    accentColor: '#a855f7',
    type: 'image' as const,
  },
  {
    id: 'gold',
    title: 'GOLD',
    subtitle: `${reward.goldAmount.toLocaleString()} Gold`,
    image: null,
    bgColor: 'rgba(250,204,21,0.12)',
    accentColor: '#facc15',
    type: 'gold' as const,
    amount: reward.goldAmount,
  },
];

// ── Phases ──
// 0: Crate appears
// 1: Crate shakes + opens (Lottie plays)
// 2: 3 cards fly out from crate, face down
// 3: Card 1 flips
// 4: Card 2 flips
// 5: Card 3 flips
// 6: Claim button

const SeasonRewardOverlay: React.FC<SeasonRewardOverlayProps> = ({ reward, onClaim }) => {
  const [phase, setPhase] = useState(0);
  const [chestAnim, setChestAnim] = useState<any>(null);
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const cards = getCardRewards(reward);

  // Load chest Lottie
  useEffect(() => {
    const chestPath = reward.rank === 1
      ? '/assets/lottie/legendary_chest.json'
      : reward.rank === 2
      ? '/assets/lottie/alliance_chest.json'
      : '/assets/lottie/daily_chest.json';
    fetch(chestPath).then(r => r.json()).then(setChestAnim).catch(() => {});
  }, [reward.rank]);

  // Phase progression
  useEffect(() => {
    document.body.style.overflow = 'hidden';

    const timers: ReturnType<typeof setTimeout>[] = [];

    // Phase 0 → 1 (crate shakes)
    timers.push(setTimeout(() => setPhase(1), 800));
    // Phase 1 → 2 (cards fly out)
    timers.push(setTimeout(() => setPhase(2), 2200));
    // Phase 2 → 3 (flip card 1)
    timers.push(setTimeout(() => {
      setPhase(3);
      setFlippedCards(new Set([0]));
    }, 3400));
    // Phase 3 → 4 (flip card 2)
    timers.push(setTimeout(() => {
      setPhase(4);
      setFlippedCards(new Set([0, 1]));
    }, 4600));
    // Phase 4 → 5 (flip card 3)
    timers.push(setTimeout(() => {
      setPhase(5);
      setFlippedCards(new Set([0, 1, 2]));
    }, 5800));
    // Phase 5 → 6 (show claim)
    timers.push(setTimeout(() => setPhase(6), 6800));

    return () => {
      timers.forEach(clearTimeout);
      document.body.style.overflow = '';
    };
  }, []);

  const handleClaim = () => {
    onClaim();
  };

  const rankLabel = reward.rank === 1 ? '🥇 1st Place' : reward.rank === 2 ? '🥈 2nd Place' : '🥉 3rd Place';
  const rankColor = reward.rank === 1 ? '#FFD700' : reward.rank === 2 ? '#C0C0C0' : '#CD7F32';

  return (
    <motion.div
      className="fixed inset-0 z-[200000] flex flex-col items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(12px)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Title */}
      <AnimatePresence>
        {phase >= 0 && (
          <motion.div
            className="absolute top-12 text-center"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <div className="text-[9px] font-mono tracking-[0.4em] uppercase text-gray-500 mb-1">// Season Rewards</div>
            <div className="text-xl font-black text-white tracking-tight">{rankLabel}</div>
            <div className="text-[10px] font-mono mt-1" style={{ color: rankColor }}>
              YOUR WEEKLY CHEST
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chest */}
      <AnimatePresence>
        {phase < 2 && (
          <motion.div
            className="relative"
            style={{ width: 160, height: 160 }}
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{
              scale: phase >= 1 ? [1, 1.08, 0.95, 1.12, 0] : 1,
              opacity: phase >= 1 ? [1, 1, 1, 1, 0] : 1,
              rotate: phase >= 1 ? [0, -3, 3, -5, 0] : 0,
            }}
            exit={{ scale: 0, opacity: 0 }}
            transition={phase >= 1 ? { duration: 1.2, ease: 'easeInOut' } : { duration: 0.5, type: 'spring' }}
          >
            {/* Glow behind chest */}
            <div className="absolute inset-0 rounded-full" style={{
              background: `radial-gradient(circle, ${rankColor}30 0%, transparent 70%)`,
              transform: 'scale(1.8)',
            }} />
            {chestAnim && (
              <Lottie
                animationData={chestAnim}
                loop={false}
                autoplay={phase >= 1}
                style={{ width: '100%', height: '100%', position: 'relative', zIndex: 1 }}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cards */}
      <AnimatePresence>
        {phase >= 2 && (
          <div className="flex items-center justify-center gap-4 mt-4" style={{ perspective: 1000 }}>
            {cards.map((card, i) => {
              const isFlipped = flippedCards.has(i);
              const delay = i * 0.15;

              return (
                <motion.div
                  key={card.id}
                  className="relative cursor-pointer"
                  style={{ width: 105, height: 150, transformStyle: 'preserve-3d' }}
                  initial={{ y: -200, opacity: 0, scale: 0.5, rotateZ: -15 + i * 15 }}
                  animate={{
                    y: 0,
                    opacity: 1,
                    scale: 1,
                    rotateZ: 0,
                    rotateY: isFlipped ? 180 : 0,
                  }}
                  transition={{
                    y: { delay, duration: 0.6, type: 'spring', stiffness: 200, damping: 20 },
                    opacity: { delay, duration: 0.3 },
                    scale: { delay, duration: 0.5 },
                    rotateZ: { delay, duration: 0.5 },
                    rotateY: { duration: 0.6, ease: 'easeInOut' },
                  }}
                  onClick={() => {
                    if (!isFlipped && phase >= 3) {
                      setFlippedCards(prev => new Set([...prev, i]));
                    }
                  }}
                >
                  {/* Card BACK (face down) */}
                  <div
                    className="absolute inset-0 rounded-xl overflow-hidden"
                    style={{
                      backfaceVisibility: 'hidden',
                      boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 20px ${rankColor}20`,
                      border: `2px solid ${rankColor}40`,
                    }}
                  >
                    <img
                      src="/assets/card-back.webp"
                      alt="Card"
                      className="w-full h-full object-cover"
                    />
                    {/* Shimmer overlay */}
                    {!isFlipped && (
                      <motion.div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.08) 45%, transparent 60%)',
                        }}
                        animate={{ x: [-200, 200] }}
                        transition={{ duration: 2, repeat: Infinity, repeatDelay: 1.5 }}
                      />
                    )}
                  </div>

                  {/* Card FRONT (revealed) */}
                  <div
                    className="absolute inset-0 rounded-xl overflow-hidden flex flex-col items-center justify-center"
                    style={{
                      backfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                      background: `linear-gradient(180deg, ${card.bgColor} 0%, rgba(10,10,15,0.98) 100%)`,
                      border: `2px solid ${card.accentColor}50`,
                      boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 24px ${card.accentColor}25`,
                    }}
                  >
                    {/* Reward icon */}
                    {card.type === 'image' && card.image && (
                      <div className="w-14 h-14 rounded-xl overflow-hidden mb-2 flex items-center justify-center" style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: `1px solid ${card.accentColor}30`,
                      }}>
                        <img src={card.image} alt={card.title} className="w-12 h-12 object-contain" />
                      </div>
                    )}
                    {card.type === 'gold' && (
                      <div className="w-14 h-14 rounded-xl mb-2 flex items-center justify-center" style={{
                        background: 'rgba(250,204,21,0.1)',
                        border: '1px solid rgba(250,204,21,0.3)',
                      }}>
                        <span className="text-2xl">🪙</span>
                      </div>
                    )}

                    {/* Title */}
                    <div className="text-[8px] font-mono tracking-[0.2em] uppercase mb-0.5" style={{ color: `${card.accentColor}88` }}>
                      {card.title}
                    </div>
                    <div className="text-[11px] font-black text-white text-center px-2 leading-tight">
                      {card.subtitle}
                    </div>

                    {/* Glow effect on reveal */}
                    {isFlipped && (
                      <motion.div
                        className="absolute inset-0 pointer-events-none rounded-xl"
                        initial={{ opacity: 0.8 }}
                        animate={{ opacity: 0 }}
                        transition={{ duration: 0.8 }}
                        style={{ background: `radial-gradient(circle, ${card.accentColor}40 0%, transparent 70%)` }}
                      />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </AnimatePresence>

      {/* Claim button */}
      <AnimatePresence>
        {phase >= 6 && (
          <motion.button
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.4, type: 'spring' }}
            onClick={handleClaim}
            className="mt-8 px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
            style={{
              background: `linear-gradient(135deg, ${rankColor}, ${rankColor}cc)`,
              boxShadow: `0 6px 28px ${rankColor}44`,
              color: '#000',
            }}
          >
            ✨ CLAIM REWARDS
          </motion.button>
        )}
      </AnimatePresence>

      {/* Skip hint */}
      {phase < 6 && phase >= 2 && (
        <motion.div
          className="absolute bottom-10 text-[10px] font-mono text-gray-600"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 1 }}
        >
          Tap cards to reveal • Rewards auto-reveal
        </motion.div>
      )}
    </motion.div>
  );
};

export default SeasonRewardOverlay;
