import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Lottie from 'lottie-react';

// ── Types ──
interface SeasonReward {
  rank: number;
  borderName: string;
  borderImage: string;
  goldAmount: number;
  keys: number;
}

interface SeasonRewardOverlayProps {
  reward: SeasonReward;
  onClaim: () => void;
}

// ── Coin/Key images ──
const COIN_IMAGE = '/assets/store/coinsmax-Photoroom.png';
const KEY_IMAGE = '/assets/store/keyless-Photoroom.png';

// ── Inject keyframes ──
const STYLE_ID = 'season-reward-styles';
if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
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
    @keyframes goldCountUp {
      0% { transform: scale(1); }
      50% { transform: scale(1.08); }
      100% { transform: scale(1); }
    }
  `;
  document.head.appendChild(style);
}

// ── Card data builder ──
function getCards(reward: SeasonReward) {
  return [
    {
      id: 'border',
      label: 'BORDER',
      value: reward.borderName,
      image: reward.borderImage,
      accentColor: reward.rank === 1 ? '#9B5DE5' : reward.rank === 2 ? '#8B95A5' : '#5B9FE6',
    },
    {
      id: 'gold',
      label: 'GOLD',
      value: reward.goldAmount,
      image: COIN_IMAGE,
      accentColor: '#facc15',
    },
    {
      id: 'keys',
      label: reward.keys === 1 ? 'KEY' : 'KEYS',
      value: reward.keys,
      image: KEY_IMAGE,
      accentColor: '#a855f7',
    },
  ];
}

// ═══════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

const SeasonRewardOverlay: React.FC<SeasonRewardOverlayProps> = ({ reward, onClaim }) => {
  /*
    FLOW:
    phase 0: Chest appears
    phase 1: Chest vibrates + glows
    phase 2: Chest gone → 3 cards float in face-down (center, large)
    phase 3: Cards shrink → settle at bottom row
    phase 4: Card 0 rises to center (face-down, large)
    phase 5: Card 0 flips (revealed)
    phase 6: Card 0 shrinks back to bottom (face-up)
    phase 7: Card 1 rises
    phase 8: Card 1 flips
    phase 9: Card 1 shrinks back
    phase 10: Card 2 rises
    phase 11: Card 2 flips
    phase 12: Card 2 shrinks back
    phase 13: All 3 cards move up + CLAIM button
    phase 14: Coin counter animation (after user clicks claim)
    phase 15: Keys animation
    phase 16: Border equipped flash
    phase 17: Auto-exit
  */
  const [phase, setPhase] = useState(0);
  const [chestAnim, setChestAnim] = useState<any>(null);
  const [goldCounter, setGoldCounter] = useState(0);

  const cards = getCards(reward);
  const rankColor = reward.rank === 1 ? '#FFD700' : reward.rank === 2 ? '#C0C0C0' : '#CD7F32';
  const rankLabel = reward.rank === 1 ? '🥇 1st Place' : reward.rank === 2 ? '🥈 2nd Place' : '🥉 3rd Place';
  const chestSize = reward.rank === 1 ? 210 : reward.rank === 2 ? 180 : 160;

  // Load chest lottie
  useEffect(() => {
    const path = reward.rank === 1
      ? '/assets/lottie/legendary_chest.json'
      : reward.rank === 2
      ? '/assets/lottie/alliance_chest.json'
      : '/assets/lottie/daily_chest.json';
    fetch(path).then(r => r.json()).then(setChestAnim).catch(() => {});
  }, [reward.rank]);

  // Auto-phase progression (phases 0-13)
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const timers = [
      setTimeout(() => setPhase(1), 700),
      setTimeout(() => setPhase(2), 2000),
      setTimeout(() => setPhase(3), 2800),
      // Card 0 spotlight
      setTimeout(() => setPhase(4), 3500),
      setTimeout(() => setPhase(5), 4200),
      setTimeout(() => setPhase(6), 5100),
      // Card 1 spotlight
      setTimeout(() => setPhase(7), 5700),
      setTimeout(() => setPhase(8), 6400),
      setTimeout(() => setPhase(9), 7300),
      // Card 2 spotlight
      setTimeout(() => setPhase(10), 7900),
      setTimeout(() => setPhase(11), 8600),
      setTimeout(() => setPhase(12), 9500),
      // All revealed → claim
      setTimeout(() => setPhase(13), 10200),
    ];
    return () => { timers.forEach(clearTimeout); document.body.style.overflow = ''; };
  }, []);

  // Vibrate on phase 1
  useEffect(() => {
    if (phase === 1 && navigator.vibrate) navigator.vibrate([50, 30, 80, 30, 50]);
  }, [phase]);

  // Gold counter animation (phase 14)
  useEffect(() => {
    if (phase !== 14) return;
    const target = reward.goldAmount;
    const start = performance.now();
    const duration = 1400;
    let raf: number;
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setGoldCounter(Math.floor(eased * target));
      if (p < 1) raf = requestAnimationFrame(tick);
      else {
        setGoldCounter(target);
        // After gold counter done → keys phase
        setTimeout(() => setPhase(15), 600);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, reward.goldAmount]);

  // Keys → border → exit
  useEffect(() => {
    if (phase === 15) {
      // Show keys for 1.2s then border equip
      setTimeout(() => setPhase(16), 1200);
    }
    if (phase === 16) {
      // Border equipped — dispatch event + auto exit after 1.5s
      setTimeout(() => {
        // Trigger coin earned animation in Layout
        window.dispatchEvent(new CustomEvent('reforge:coin-earned', {
          detail: { goldGained: reward.goldAmount, startRect: null },
        }));
        setPhase(17);
      }, 1500);
    }
    if (phase === 17) {
      setTimeout(() => onClaim(), 600);
    }
  }, [phase, reward, onClaim]);

  // Handle claim click
  const handleClaim = useCallback(() => {
    if (phase !== 13) return;
    setPhase(14);
  }, [phase]);

  // ── Per-card state computation ──
  const getCardTransform = (idx: number) => {
    const spotBase = 4 + idx * 3; // 4,7,10
    const isRevealed = phase >= spotBase + 1;
    const isSpotlit = phase >= spotBase && phase <= spotBase + 1;

    // Bottom row positions
    const bottomX = (idx - 1) * 80; // -80, 0, 80
    const bottomY = 200;

    // Final position (moved up for claim)
    const finalY = 30;

    if (phase < 2) {
      return { x: 0, y: 0, scale: 0, opacity: 0, rotateY: 0 };
    }
    if (phase === 2) {
      // Float in face-down, center, staggered
      return { x: (idx - 1) * 30, y: 0, scale: 1, opacity: 1, rotateY: 0 };
    }
    if (phase === 3 || (phase > 3 && !isSpotlit && phase < 13)) {
      // Settled at bottom
      return { x: bottomX, y: bottomY, scale: 0.6, opacity: 0.7, rotateY: isRevealed ? 180 : 0 };
    }
    if (phase === spotBase) {
      // Rising to center (face-down)
      return { x: 0, y: 0, scale: 1, opacity: 1, rotateY: 0 };
    }
    if (phase === spotBase + 1) {
      // Flipping
      return { x: 0, y: 0, scale: 1, opacity: 1, rotateY: 180 };
    }
    if (phase === spotBase + 2) {
      // Returning to bottom (face-up)
      return { x: bottomX, y: bottomY, scale: 0.6, opacity: 0.7, rotateY: 180 };
    }
    if (phase >= 13 && phase < 14) {
      // All cards move up for claim
      return { x: (idx - 1) * 100, y: finalY, scale: 0.75, opacity: 1, rotateY: 180 };
    }
    if (phase >= 14) {
      // During claim animation — cards fade
      return { x: (idx - 1) * 100, y: finalY, scale: 0.65, opacity: 0.3, rotateY: 180 };
    }
    return { x: bottomX, y: bottomY, scale: 0.6, opacity: 0.7, rotateY: isRevealed ? 180 : 0 };
  };

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
        animate={{ opacity: phase < 14 ? 1 : 0.3, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        <div className="text-[9px] font-mono tracking-[0.4em] uppercase text-gray-500 mb-1">// Season Rewards</div>
        <div className="text-xl font-black text-white tracking-tight">{rankLabel}</div>
        <div className="text-[10px] font-mono mt-1" style={{ color: rankColor }}>YOUR WEEKLY CHEST</div>
      </motion.div>

      {/* ── Chest ── */}
      <AnimatePresence>
        {phase < 2 && (
          <motion.div
            className="relative"
            style={{ width: chestSize, height: chestSize }}
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.5, type: 'spring' }}
          >
            {/* Glow */}
            <motion.div
              className="absolute rounded-full"
              style={{
                width: chestSize * 1.8, height: chestSize * 1.8,
                top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                background: `radial-gradient(circle, ${rankColor}25 0%, transparent 70%)`,
              }}
              animate={phase >= 1 ? { scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] } : {}}
              transition={{ duration: 0.8, repeat: 2 }}
            />
            {/* Vibrate wrapper */}
            <div style={{
              width: '100%', height: '100%',
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
      {phase >= 2 && (
        <div
          className="absolute flex items-center justify-center"
          style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', perspective: 1200 }}
        >
          {cards.map((card, i) => {
            const t = getCardTransform(i);
            const spotBase = 4 + i * 3;
            const isRevealed = phase >= spotBase + 1;
            const isSpotlit = phase >= spotBase && phase <= spotBase + 1;

            return (
              <motion.div
                key={card.id}
                className="absolute"
                style={{ width: 120, height: 170, transformStyle: 'preserve-3d' }}
                animate={{
                  x: t.x, y: t.y, scale: t.scale,
                  opacity: t.opacity, rotateY: t.rotateY,
                }}
                transition={{
                  duration: 0.65,
                  type: 'spring',
                  stiffness: 150,
                  damping: 20,
                }}
              >
                {/* Card BACK (face-down) */}
                <div
                  className="absolute inset-0 rounded-xl overflow-hidden"
                  style={{
                    backfaceVisibility: 'hidden',
                    boxShadow: isSpotlit
                      ? `0 12px 40px rgba(0,0,0,0.7), 0 0 30px ${rankColor}30`
                      : '0 6px 24px rgba(0,0,0,0.5)',
                    border: `2px solid ${rankColor}40`,
                  }}
                >
                  <img src="/assets/card-back.webp" alt="Card" className="w-full h-full object-cover" />
                  {/* Shimmer */}
                  <motion.div
                    className="absolute inset-0 pointer-events-none"
                    style={{ background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.1) 45%, transparent 60%)' }}
                    animate={{ x: [-200, 200] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 1.5 }}
                  />
                </div>

                {/* Card FRONT (face-up) */}
                <div
                  className="absolute inset-0 rounded-xl overflow-hidden flex flex-col items-center justify-center"
                  style={{
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                    background: 'linear-gradient(180deg, rgba(15,15,20,0.98), rgba(8,8,12,1))',
                    border: `2px solid ${card.accentColor}40`,
                    boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 20px ${card.accentColor}15`,
                  }}
                >
                  {/* Reward image — BIG */}
                  <div className="relative z-10 mb-2">
                    <img
                      src={card.image}
                      alt={card.label}
                      className="object-contain"
                      style={{
                        width: card.id === 'border' ? 72 : 80,
                        height: card.id === 'border' ? 72 : 80,
                        filter: `drop-shadow(0 0 10px ${card.accentColor}40)`,
                      }}
                    />
                  </div>

                  {/* Label */}
                  <div className="text-[7px] font-mono tracking-[0.3em] uppercase mb-0.5 relative z-10"
                    style={{ color: `${card.accentColor}88` }}>
                    {card.label}
                  </div>

                  {/* Value */}
                  <div className="text-sm font-black text-white text-center px-2 leading-tight relative z-10"
                    style={{ color: card.accentColor }}>
                    {card.id === 'gold' ? `${(card.value as number).toLocaleString()}` :
                     card.id === 'keys' ? `${card.value}` :
                     card.value}
                  </div>

                  {/* Burst flash on reveal */}
                  {isRevealed && (
                    <motion.div
                      className="absolute inset-0 pointer-events-none rounded-xl"
                      initial={{ opacity: 0.8 }}
                      animate={{ opacity: 0 }}
                      transition={{ duration: 0.8 }}
                      style={{ background: `radial-gradient(circle, ${card.accentColor}30 0%, transparent 70%)` }}
                    />
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── CLAIM button (phase 13) ── */}
      <AnimatePresence>
        {phase === 13 && (
          <motion.button
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            transition={{ delay: 0.3, duration: 0.4, type: 'spring' }}
            onClick={handleClaim}
            className="absolute bottom-28 px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-sm active:scale-95 transition-transform"
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

      {/* ── GOLD COUNTER (phase 14) ── */}
      <AnimatePresence>
        {phase === 14 && (
          <motion.div
            className="absolute flex flex-col items-center justify-center gap-2"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.4, type: 'spring' }}
            style={{ bottom: 100 }}
          >
            <img src={COIN_IMAGE} alt="Gold" className="w-16 h-16 object-contain"
              style={{ filter: 'drop-shadow(0 0 12px rgba(250,204,21,0.4))', animation: 'goldCountUp 0.3s ease-in-out infinite' }} />
            <div className="text-3xl font-black font-mono" style={{
              color: '#fbbf24',
              textShadow: '0 0 20px rgba(251,191,36,0.5)',
              fontVariantNumeric: 'tabular-nums',
            }}>
              +{goldCounter.toLocaleString()}
            </div>
            <div className="text-[9px] font-mono text-gray-500 tracking-widest">GOLD EARNED</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── KEYS COUNTER (phase 15) ── */}
      <AnimatePresence>
        {phase === 15 && (
          <motion.div
            className="absolute flex flex-col items-center justify-center gap-2"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.4, type: 'spring' }}
            style={{ bottom: 100 }}
          >
            <img src={KEY_IMAGE} alt="Keys" className="w-14 h-14 object-contain"
              style={{ filter: 'drop-shadow(0 0 12px rgba(168,85,247,0.4))' }} />
            <div className="text-3xl font-black font-mono" style={{
              color: '#a855f7',
              textShadow: '0 0 20px rgba(168,85,247,0.5)',
            }}>
              +{reward.keys}
            </div>
            <div className="text-[9px] font-mono text-gray-500 tracking-widest">
              {reward.keys === 1 ? 'KEY RECEIVED' : 'KEYS RECEIVED'}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── BORDER EQUIPPED (phase 16) ── */}
      <AnimatePresence>
        {phase === 16 && (
          <motion.div
            className="absolute flex flex-col items-center justify-center gap-3"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.5, type: 'spring' }}
          >
            <img src={reward.borderImage} alt="Border" className="w-24 h-24 object-contain"
              style={{ filter: `drop-shadow(0 0 20px ${rankColor}60)` }} />
            <div className="text-lg font-black text-white tracking-tight">{reward.borderName}</div>
            <div className="px-4 py-1.5 rounded-full text-[9px] font-mono font-black tracking-[0.3em] uppercase"
              style={{
                background: `${rankColor}20`,
                border: `1px solid ${rankColor}40`,
                color: rankColor,
              }}>
              ✓ BORDER EQUIPPED
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Skip hint ── */}
      {phase >= 2 && phase <= 12 && (
        <motion.div
          className="absolute bottom-10 text-[10px] font-mono text-gray-600"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ delay: 1.5 }}
        >
          Revealing rewards...
        </motion.div>
      )}
    </motion.div>
  );
};

export default SeasonRewardOverlay;
