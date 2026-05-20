import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Lottie from 'lottie-react';

// ── Types ──
interface SeasonReward {
  rank: number; // 1, 2, or 3
  borderName: string;
  borderImage: string;
  goldAmount: number;
  keys: number;
}

interface SeasonRewardOverlayProps {
  reward: SeasonReward;
  onClaim: () => void;
}

// ── Coin image per rank ──
function getCoinImage(rank: number): string {
  // #1 = Gold Treasury (biggest), #2/#3 = Gold Vault
  return rank === 1
    ? '/assets/store/coinsmax-Photoroom.png'
    : '/assets/store/coins medium-Photoroom.png';
}

// ── Key image = Shadow Keys ──
const KEY_IMAGE = '/assets/store/keyless-Photoroom.png';

// ── Card config per rank ──
function getCardRewards(reward: SeasonReward) {
  return [
    {
      id: 'border',
      title: 'BORDER',
      subtitle: reward.borderName,
      image: reward.borderImage,
      accentColor: reward.rank === 1 ? '#9B5DE5' : reward.rank === 2 ? '#8B95A5' : '#5B9FE6',
      type: 'border' as const,
    },
    {
      id: 'gold',
      title: 'GOLD',
      subtitle: '',
      image: getCoinImage(reward.rank),
      accentColor: '#facc15',
      type: 'gold' as const,
      amount: reward.goldAmount,
    },
    {
      id: 'keys',
      title: 'KEYS',
      subtitle: `${reward.keys} ${reward.keys === 1 ? 'Key' : 'Keys'}`,
      image: KEY_IMAGE,
      accentColor: '#a855f7',
      type: 'keys' as const,
    },
  ];
}

// ── Animated counter hook ──
function useAnimatedCounter(target: number, active: boolean, duration = 1200) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) { setValue(0); return; }
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(eased * target));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active, duration]);

  return value;
}

// ── Sun Ray Conic Gradient ──
function getSunRayGradient(color: string): string {
  const beams = 12;
  const w = 9;
  const stops: string[] = [];
  for (let i = 0; i < beams; i++) {
    const s = i * 30;
    stops.push(`transparent ${s}deg`);
    stops.push(`${color}55 ${s + 2}deg`);
    stops.push(`${color}55 ${s + w - 2}deg`);
    stops.push(`transparent ${s + w}deg`);
  }
  return `conic-gradient(from 0deg, ${stops.join(', ')})`;
}

// ── Inject spin keyframes ──
const SPIN_STYLE_ID = 'season-reward-spin';
if (typeof document !== 'undefined' && !document.getElementById(SPIN_STYLE_ID)) {
  const style = document.createElement('style');
  style.id = SPIN_STYLE_ID;
  style.textContent = `
    @keyframes rewardSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    @keyframes rewardVibrate {
      0%, 100% { transform: translate(0, 0) rotate(0deg); }
      10% { transform: translate(-2px, 1px) rotate(-1deg); }
      20% { transform: translate(2px, -1px) rotate(1deg); }
      30% { transform: translate(-3px, 2px) rotate(-2deg); }
      40% { transform: translate(3px, -2px) rotate(2deg); }
      50% { transform: translate(-2px, 1px) rotate(-1deg); }
      60% { transform: translate(2px, -1px) rotate(1deg); }
      70% { transform: translate(-1px, 2px) rotate(0deg); }
      80% { transform: translate(1px, -1px) rotate(-1deg); }
      90% { transform: translate(-1px, 1px) rotate(1deg); }
    }
  `;
  document.head.appendChild(style);
}

// ═══════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

const SeasonRewardOverlay: React.FC<SeasonRewardOverlayProps> = ({ reward, onClaim }) => {
  const [phase, setPhase] = useState(0);
  const [chestAnim, setChestAnim] = useState<any>(null);
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());

  const cards = getCardRewards(reward);

  // Animated gold counter — only active when gold card is flipped
  const goldActive = flippedCards.has(1);
  const animatedGold = useAnimatedCounter(reward.goldAmount, goldActive, 1400);

  // Load chest Lottie
  useEffect(() => {
    const chestPath = reward.rank === 1
      ? '/assets/lottie/legendary_chest.json'
      : reward.rank === 2
      ? '/assets/lottie/alliance_chest.json'
      : '/assets/lottie/daily_chest.json';
    fetch(chestPath).then(r => r.json()).then(setChestAnim).catch(() => {});
  }, [reward.rank]);

  // Phase auto-progression
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const timers = [
      setTimeout(() => setPhase(1), 900),     // vibrate + glow
      setTimeout(() => setPhase(2), 2400),     // cards fly out
      setTimeout(() => { setPhase(3); setFlippedCards(new Set([0])); }, 3600),
      setTimeout(() => { setPhase(4); setFlippedCards(new Set([0, 1])); }, 4800),
      setTimeout(() => { setPhase(5); setFlippedCards(new Set([0, 1, 2])); }, 6000),
      setTimeout(() => setPhase(6), 7200),     // claim
    ];
    return () => { timers.forEach(clearTimeout); document.body.style.overflow = ''; };
  }, []);

  // Vibrate device on phase 1 (chest shake)
  useEffect(() => {
    if (phase === 1 && navigator.vibrate) navigator.vibrate([50, 30, 80, 30, 50]);
  }, [phase]);

  const rankLabel = reward.rank === 1 ? '🥇 1st Place' : reward.rank === 2 ? '🥈 2nd Place' : '🥉 3rd Place';
  const rankColor = reward.rank === 1 ? '#FFD700' : reward.rank === 2 ? '#C0C0C0' : '#CD7F32';

  // Chest sizes — bigger and more fitting
  const chestSize = reward.rank === 1 ? 200 : reward.rank === 2 ? 170 : 150;

  return (
    <motion.div
      className="fixed inset-0 z-[200000] flex flex-col items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.94)', backdropFilter: 'blur(14px)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* ── Title ── */}
      <motion.div
        className="absolute top-12 text-center z-10"
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

      {/* ── Chest ── */}
      <AnimatePresence>
        {phase < 2 && (
          <motion.div
            className="relative"
            style={{ width: chestSize, height: chestSize }}
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{
              scale: 1,
              opacity: 1,
            }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.5, type: 'spring' }}
          >
            {/* Glow behind chest */}
            <motion.div
              className="absolute rounded-full"
              style={{
                width: chestSize * 1.8,
                height: chestSize * 1.8,
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                background: `radial-gradient(circle, ${rankColor}25 0%, transparent 70%)`,
              }}
              animate={phase >= 1 ? { scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] } : {}}
              transition={{ duration: 0.8, repeat: 2 }}
            />
            {/* Vibrate wrapper */}
            <div style={{
              width: '100%',
              height: '100%',
              animation: phase >= 1 ? 'rewardVibrate 0.5s ease-in-out 3' : 'none',
            }}>
              {chestAnim && (
                <Lottie
                  animationData={chestAnim}
                  loop={false}
                  autoplay={phase >= 1}
                  style={{ width: '100%', height: '100%', position: 'relative', zIndex: 1 }}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Cards ── */}
      <AnimatePresence>
        {phase >= 2 && (
          <div className="flex items-center justify-center gap-3 mt-4" style={{ perspective: 1200 }}>
            {cards.map((card, i) => {
              const isFlipped = flippedCards.has(i);
              const delay = i * 0.15;

              return (
                <motion.div
                  key={card.id}
                  className="relative cursor-pointer"
                  style={{ width: 110, height: 155, transformStyle: 'preserve-3d' }}
                  initial={{ y: -250, opacity: 0, scale: 0.4, rotateZ: -20 + i * 20 }}
                  animate={{
                    y: 0, opacity: 1, scale: 1, rotateZ: 0,
                    rotateY: isFlipped ? 180 : 0,
                  }}
                  transition={{
                    y: { delay, duration: 0.65, type: 'spring', stiffness: 180, damping: 18 },
                    opacity: { delay, duration: 0.3 },
                    scale: { delay, duration: 0.5 },
                    rotateZ: { delay, duration: 0.5 },
                    rotateY: { duration: 0.7, ease: 'easeInOut' },
                  }}
                  onClick={() => {
                    if (!isFlipped && phase >= 3) {
                      setFlippedCards(prev => new Set([...prev, i]));
                    }
                  }}
                >
                  {/* ── Card BACK ── */}
                  <div
                    className="absolute inset-0 rounded-xl overflow-hidden"
                    style={{
                      backfaceVisibility: 'hidden',
                      boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 20px ${rankColor}20`,
                      border: `2px solid ${rankColor}40`,
                    }}
                  >
                    <img src="/assets/card-back.webp" alt="Card" className="w-full h-full object-cover" />
                    {!isFlipped && (
                      <motion.div
                        className="absolute inset-0 pointer-events-none"
                        style={{ background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.08) 45%, transparent 60%)' }}
                        animate={{ x: [-200, 200] }}
                        transition={{ duration: 2, repeat: Infinity, repeatDelay: 1.5 }}
                      />
                    )}
                  </div>

                  {/* ── Card FRONT ── */}
                  <div
                    className="absolute inset-0 rounded-xl overflow-hidden flex flex-col items-center justify-center"
                    style={{
                      backfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                      background: `linear-gradient(180deg, rgba(15,15,20,0.98) 0%, rgba(8,8,12,1) 100%)`,
                      border: `2px solid ${card.accentColor}40`,
                      boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 24px ${card.accentColor}20`,
                    }}
                  >
                    {/* ── ROTATING GLOW behind card content ── */}
                    {isFlipped && (
                      <motion.div
                        className="absolute pointer-events-none"
                        style={{
                          width: 200,
                          height: 200,
                          top: '50%',
                          left: '50%',
                          marginTop: -100,
                          marginLeft: -100,
                          borderRadius: '50%',
                          background: getSunRayGradient(card.accentColor),
                          animation: 'rewardSpin 4s linear infinite',
                          opacity: 0,
                        }}
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 0.35, scale: 1 }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                      />
                    )}

                    {/* Reward image */}
                    {card.type === 'border' && card.image && (
                      <div className="w-14 h-14 rounded-xl overflow-hidden mb-2 flex items-center justify-center relative z-10" style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: `1px solid ${card.accentColor}30`,
                      }}>
                        <img src={card.image} alt={card.title} className="w-12 h-12 object-contain" />
                      </div>
                    )}
                    {card.type === 'gold' && card.image && (
                      <div className="relative z-10 mb-1">
                        <img src={card.image} alt="Gold" className="w-16 h-16 object-contain" style={{ filter: 'drop-shadow(0 0 8px rgba(250,204,21,0.3))' }} />
                      </div>
                    )}
                    {card.type === 'keys' && card.image && (
                      <div className="relative z-10 mb-1">
                        <img src={card.image} alt="Keys" className="w-14 h-14 object-contain" style={{ filter: 'drop-shadow(0 0 8px rgba(168,85,247,0.3))' }} />
                      </div>
                    )}

                    {/* Title label */}
                    <div className="text-[7px] font-mono tracking-[0.25em] uppercase mb-0.5 relative z-10" style={{ color: `${card.accentColor}88` }}>
                      {card.title}
                    </div>

                    {/* Value */}
                    {card.type === 'gold' ? (
                      <div className="text-base font-black text-white text-center relative z-10" style={{ color: '#facc15' }}>
                        {isFlipped ? animatedGold.toLocaleString() : '0'}
                      </div>
                    ) : (
                      <div className="text-[11px] font-black text-white text-center px-2 leading-tight relative z-10">
                        {card.subtitle}
                      </div>
                    )}

                    {/* Burst glow on reveal */}
                    {isFlipped && (
                      <motion.div
                        className="absolute inset-0 pointer-events-none rounded-xl z-[1]"
                        initial={{ opacity: 0.9 }}
                        animate={{ opacity: 0 }}
                        transition={{ duration: 1 }}
                        style={{ background: `radial-gradient(circle, ${card.accentColor}35 0%, transparent 70%)` }}
                      />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </AnimatePresence>

      {/* ── Claim button ── */}
      <AnimatePresence>
        {phase >= 6 && (
          <motion.button
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.4, type: 'spring' }}
            onClick={onClaim}
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
      {phase >= 2 && phase < 6 && (
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
