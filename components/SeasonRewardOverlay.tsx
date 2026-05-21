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

// ── Asset paths ──
const COIN_IMAGE = '/assets/store/coinsmax-Photoroom.png';
const KEY_IMAGE = '/assets/store/keyless-Photoroom.png';

// ── Inject keyframes ──
const STYLE_ID = 'season-reward-styles';
if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes rewardVibrate {
      0%, 100% { transform: translate(0,0) rotate(0deg); }
      10% { transform: translate(-2px,1px) rotate(-1deg); }
      20% { transform: translate(2px,-1px) rotate(1deg); }
      30% { transform: translate(-3px,2px) rotate(-2deg); }
      40% { transform: translate(3px,-2px) rotate(2deg); }
      50% { transform: translate(-2px,1px) rotate(-1deg); }
      60% { transform: translate(2px,-1px) rotate(1deg); }
      70% { transform: translate(-1px,2px) rotate(0deg); }
      80% { transform: translate(1px,-1px) rotate(-1deg); }
      90% { transform: translate(-1px,1px) rotate(1deg); }
    }
    @keyframes goldPulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.08); }
      100% { transform: scale(1); }
    }
  `;
  document.head.appendChild(style);
}

// ── Card data ──
function getCards(reward: SeasonReward) {
  return [
    {
      id: 'border', label: 'BORDER', value: reward.borderName,
      image: reward.borderImage,
      accentColor: reward.rank === 1 ? '#9B5DE5' : reward.rank === 2 ? '#8B95A5' : '#5B9FE6',
    },
    {
      id: 'gold', label: 'GOLD', value: reward.goldAmount,
      image: COIN_IMAGE, accentColor: '#facc15',
    },
    {
      id: 'keys', label: reward.keys === 1 ? 'KEY' : 'KEYS', value: reward.keys,
      image: KEY_IMAGE, accentColor: '#a855f7',
    },
  ];
}

// ═══════════════════════════════════════════════════════════════
const SeasonRewardOverlay: React.FC<SeasonRewardOverlayProps> = ({ reward, onClaim }) => {
  const [phase, setPhase] = useState(0);
  const [chestAnim, setChestAnim] = useState<any>(null);
  const [goldCounter, setGoldCounter] = useState(0);
  const [keysCounter, setKeysCounter] = useState(0);
  // Track which cards have been revealed (content swaps from back→front)
  const [revealedCards, setRevealedCards] = useState<Set<number>>(new Set());
  // Track which card is currently in flip animation (scaleX squish)
  const [flippingCard, setFlippingCard] = useState<number | null>(null);

  const cards = getCards(reward);
  const rankColor = reward.rank === 1 ? '#FFD700' : reward.rank === 2 ? '#C0C0C0' : '#CD7F32';
  const rankLabel = reward.rank === 1 ? '🥇 1st Place' : reward.rank === 2 ? '🥈 2nd Place' : '🥉 3rd Place';
  const chestSize = reward.rank === 1 ? 210 : reward.rank === 2 ? 180 : 160;

  // Load chest lottie
  useEffect(() => {
    const p = reward.rank === 1
      ? '/assets/lottie/legendary_chest.json'
      : reward.rank === 2
      ? '/assets/lottie/alliance_chest.json'
      : '/assets/lottie/daily_chest.json';
    fetch(p).then(r => r.json()).then(setChestAnim).catch(() => {});
  }, [reward.rank]);

  // Auto-phase timeline
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    // Hide bottom navbar during reward animation
    const nav = document.getElementById('tut-nav-mobile') as HTMLElement;
    if (nav) nav.style.display = 'none';

    const timers = [
      setTimeout(() => setPhase(1), 700),       // vibrate
      setTimeout(() => setPhase(2), 2000),       // cards fly in
      setTimeout(() => setPhase(3), 2800),       // cards settle bottom
      // Card 0 spotlight
      setTimeout(() => setPhase(4), 3500),       // card 0 rises
      setTimeout(() => { setPhase(5); setFlippingCard(0); if (navigator.vibrate) navigator.vibrate(30); }, 4200),
      setTimeout(() => { setRevealedCards(s => new Set([...s, 0])); }, 4500),
      setTimeout(() => { setFlippingCard(null); setPhase(6); }, 4800),
      // Card 1 spotlight
      setTimeout(() => setPhase(7), 5500),
      setTimeout(() => { setPhase(8); setFlippingCard(1); if (navigator.vibrate) navigator.vibrate(30); }, 6200),
      setTimeout(() => { setRevealedCards(s => new Set([...s, 1])); }, 6500),
      setTimeout(() => { setFlippingCard(null); setPhase(9); }, 6800),
      // Card 2 spotlight
      setTimeout(() => setPhase(10), 7500),
      setTimeout(() => { setPhase(11); setFlippingCard(2); if (navigator.vibrate) navigator.vibrate(30); }, 8200),
      setTimeout(() => { setRevealedCards(s => new Set([...s, 2])); }, 8500),
      setTimeout(() => { setFlippingCard(null); setPhase(12); }, 8800),
      // All revealed → claim
      setTimeout(() => setPhase(13), 9500),
    ];
    return () => {
      timers.forEach(clearTimeout);
      document.body.style.overflow = '';
      // Restore navbar
      if (nav) nav.style.display = '';
    };
  }, []);

  // Vibrate
  useEffect(() => {
    if (phase === 1 && navigator.vibrate) navigator.vibrate([50, 30, 80, 30, 50]);
  }, [phase]);

  // Gold counter (phase 14)
  useEffect(() => {
    if (phase !== 14) return;
    const target = reward.goldAmount;
    const start = performance.now();
    const dur = 1400;
    let raf: number;
    const tick = (now: number) => {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setGoldCounter(Math.floor(eased * target));
      if (p < 1) raf = requestAnimationFrame(tick);
      else { setGoldCounter(target); setTimeout(() => setPhase(15), 600); }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, reward.goldAmount]);

  // Keys counter animation (phase 15)
  useEffect(() => {
    if (phase !== 15) return;
    const target = reward.keys;
    const start = performance.now();
    const dur = 800;
    let raf: number;
    const tick = (now: number) => {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setKeysCounter(Math.round(eased * target));
      if (p < 1) raf = requestAnimationFrame(tick);
      else { setKeysCounter(target); setTimeout(() => setPhase(16), 600); }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, reward.keys]);

  // Border → exit
  useEffect(() => {
    if (phase === 16) setTimeout(() => setPhase(17), 1500);
    if (phase === 17) setTimeout(() => onClaim(), 600);
  }, [phase, onClaim]);

  const handleClaim = useCallback(() => {
    if (phase === 13) setPhase(14);
  }, [phase]);

  // ── Card position/scale per phase ──
  const getCardPos = (idx: number) => {
    const spotBase = 4 + idx * 3;
    const isSpotlit = phase >= spotBase && phase <= spotBase + 1;
    const bx = (idx - 1) * 80, by = 200;

    if (phase < 2) return { x: 0, y: 0, scale: 0, opacity: 0 };
    if (phase === 2) return { x: (idx - 1) * 30, y: 0, scale: 1, opacity: 1 };
    if (phase === 3 || (phase > 3 && !isSpotlit && phase < 13))
      return { x: bx, y: by, scale: 0.6, opacity: 0.7 };
    if (phase === spotBase) return { x: 0, y: 0, scale: 1, opacity: 1 };
    if (phase === spotBase + 1) return { x: 0, y: 0, scale: 1, opacity: 1 };
    if (phase === spotBase + 2) return { x: bx, y: by, scale: 0.6, opacity: 0.7 };
    if (phase >= 13 && phase < 14) return { x: (idx - 1) * 100, y: 30, scale: 0.75, opacity: 1 };
    if (phase >= 14) return { x: (idx - 1) * 100, y: 30, scale: 0.65, opacity: 0.3 };
    return { x: bx, y: by, scale: 0.6, opacity: 0.7 };
  };

  return (
    <motion.div
      className="fixed inset-0 z-[200000] flex flex-col items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.94)', backdropFilter: 'blur(14px)' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      {/* Title */}
      <motion.div className="absolute top-12 text-center z-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: phase < 14 ? 1 : 0.3, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        <div className="text-[9px] font-mono tracking-[0.4em] uppercase text-gray-500 mb-1">// Season Rewards</div>
        <div className="text-xl font-black text-white tracking-tight">{rankLabel}</div>
        <div className="text-[10px] font-mono mt-1" style={{ color: rankColor }}>YOUR WEEKLY CHEST</div>
      </motion.div>

      {/* Chest */}
      <AnimatePresence>
        {phase < 2 && (
          <motion.div className="relative" style={{ width: chestSize, height: chestSize }}
            initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }} transition={{ duration: 0.5, type: 'spring' }}
          >
            <motion.div className="absolute rounded-full" style={{
              width: chestSize * 1.8, height: chestSize * 1.8,
              top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
              background: `radial-gradient(circle, ${rankColor}25 0%, transparent 70%)`,
            }} animate={phase >= 1 ? { scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] } : {}}
              transition={{ duration: 0.8, repeat: 2 }} />
            <div style={{ width: '100%', height: '100%',
              animation: phase >= 1 ? 'rewardVibrate 0.5s ease-in-out 3' : 'none' }}>
              {chestAnim && <Lottie animationData={chestAnim} loop={false} autoplay={phase >= 1}
                style={{ width: '100%', height: '100%', position: 'relative', zIndex: 1 }} />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── CARDS ── */}
      {phase >= 2 && (
        <div className="absolute flex items-center justify-center"
          style={{ top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}>
          {cards.map((card, i) => {
            const pos = getCardPos(i);
            const isRevealed = revealedCards.has(i);
            const isFlipping = flippingCard === i;

            return (
              <motion.div
                key={card.id}
                className="absolute"
                style={{ width: 120, height: 170 }}
                animate={{
                  x: pos.x, y: pos.y, scale: pos.scale, opacity: pos.opacity,
                  // Fake flip: scaleX squishes to 0 then back to 1
                  // Content swaps at the midpoint (scaleX=0) via revealedCards state
                  scaleX: isFlipping ? [1, 0, 1] : 1,
                }}
                transition={{
                  x: { duration: 0.55, type: 'spring', stiffness: 160, damping: 20 },
                  y: { duration: 0.55, type: 'spring', stiffness: 160, damping: 20 },
                  scale: { duration: 0.45, ease: 'easeInOut' },
                  opacity: { duration: 0.3 },
                  scaleX: isFlipping ? { duration: 0.6, ease: 'easeInOut', times: [0, 0.5, 1] } : { duration: 0 },
                }}
              >
                {/* ─── BACK FACE (shown when NOT revealed) ─── */}
                {!isRevealed && (
                  <div className="absolute inset-0 rounded-xl overflow-hidden"
                    style={{
                      boxShadow: `0 8px 28px rgba(0,0,0,0.6), 0 0 16px ${rankColor}15`,
                      border: `2px solid ${rankColor}40`,
                    }}>
                    <img src="/assets/card-back.webp" alt="Card" className="w-full h-full object-cover" />
                    <motion.div className="absolute inset-0 pointer-events-none"
                      style={{ background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.1) 45%, transparent 60%)' }}
                      animate={{ x: [-200, 200] }}
                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 1.5 }} />
                  </div>
                )}

                {/* ─── FRONT FACE (shown when revealed) ─── */}
                {isRevealed && (
                  <div className="absolute inset-0 rounded-xl overflow-hidden flex flex-col items-center justify-center"
                    style={{
                      background: 'linear-gradient(180deg, rgba(15,15,20,0.98), rgba(8,8,12,1))',
                      border: `2px solid ${card.accentColor}40`,
                      boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 20px ${card.accentColor}15`,
                    }}>
                    {/* Reward image */}
                    <div className="relative z-10 mb-2">
                      <img src={card.image} alt={card.label} className="object-contain"
                        style={{
                          width: card.id === 'border' ? 72 : 80,
                          height: card.id === 'border' ? 72 : 80,
                          filter: `drop-shadow(0 0 10px ${card.accentColor}40)`,
                        }} />
                    </div>
                    {/* Label */}
                    <div className="text-[7px] font-mono tracking-[0.3em] uppercase mb-0.5 relative z-10"
                      style={{ color: `${card.accentColor}88` }}>{card.label}</div>
                    {/* Value */}
                    <div className="text-sm font-black text-center px-2 leading-tight relative z-10"
                      style={{ color: card.accentColor }}>
                      {card.id === 'gold' ? `${(card.value as number).toLocaleString()}` :
                       card.id === 'keys' ? `${card.value}` : card.value}
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* CLAIM button */}
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
              boxShadow: `0 6px 28px ${rankColor}44`, color: '#000',
            }}>
            ✨ CLAIM REWARDS
          </motion.button>
        )}
      </AnimatePresence>

      {/* GOLD COUNTER */}
      <AnimatePresence>
        {phase === 14 && (
          <motion.div className="absolute flex flex-col items-center justify-center gap-2"
            initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.4, type: 'spring' }}
            style={{ bottom: 100 }}>
            <img src={COIN_IMAGE} alt="Gold" className="w-16 h-16 object-contain"
              style={{ filter: 'drop-shadow(0 0 12px rgba(250,204,21,0.4))', animation: 'goldPulse 0.3s ease-in-out infinite' }} />
            <div className="text-3xl font-black font-mono" style={{
              color: '#fbbf24', textShadow: '0 0 20px rgba(251,191,36,0.5)', fontVariantNumeric: 'tabular-nums',
            }}>+{goldCounter.toLocaleString()}</div>
            <div className="text-[9px] font-mono text-gray-500 tracking-widest">GOLD EARNED</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* KEYS COUNTER */}
      <AnimatePresence>
        {phase === 15 && (
          <motion.div className="absolute flex flex-col items-center justify-center gap-2"
            initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.4, type: 'spring' }}
            style={{ bottom: 100 }}>
            <img src={KEY_IMAGE} alt="Keys" className="w-14 h-14 object-contain"
              style={{ filter: 'drop-shadow(0 0 12px rgba(168,85,247,0.4))' }} />
            <div className="text-3xl font-black font-mono" style={{
              color: '#a855f7', textShadow: '0 0 20px rgba(168,85,247,0.5)',
            }}>+{keysCounter}</div>
            <div className="text-[9px] font-mono text-gray-500 tracking-widest">
              {reward.keys === 1 ? 'KEY RECEIVED' : 'KEYS RECEIVED'}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BORDER EQUIPPED */}
      <AnimatePresence>
        {phase === 16 && (
          <motion.div className="absolute flex flex-col items-center justify-center gap-3"
            initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }} transition={{ duration: 0.5, type: 'spring' }}>
            <img src={reward.borderImage} alt="Border" className="w-24 h-24 object-contain"
              style={{ filter: `drop-shadow(0 0 20px ${rankColor}60)` }} />
            <div className="text-lg font-black text-white tracking-tight">{reward.borderName}</div>
            <div className="px-4 py-1.5 rounded-full text-[9px] font-mono font-black tracking-[0.3em] uppercase"
              style={{ background: `${rankColor}20`, border: `1px solid ${rankColor}40`, color: rankColor }}>
              ✓ BORDER EQUIPPED
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Skip hint */}
      {phase >= 2 && phase <= 12 && (
        <motion.div className="absolute bottom-10 text-[10px] font-mono text-gray-600"
          initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} transition={{ delay: 1.5 }}>
          Revealing rewards...
        </motion.div>
      )}
    </motion.div>
  );
};

export default SeasonRewardOverlay;
