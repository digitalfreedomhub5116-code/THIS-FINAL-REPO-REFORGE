
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, HelpCircle, Check, Lock, Info, Coins, Timer, Zap } from 'lucide-react';
// ChestAnimations SVG fallbacks are used inside ChestLottieOverlays
import { DailyChestLottie, LegendaryChestLottieV2, AllianceChestLottie, preloadChestLotties } from './ChestLottieOverlays';
import { getStoneConfig, OUTFIT_STONE_CONFIG } from '../utils/gameData';
import { SystemCoin } from './icons/SystemCoin';

import CrystalIcon from './CrystalIcon';
import { playSystemSoundEffect } from '../utils/soundEngine';
import { useSystem } from '../hooks/useSystem';

interface MobileFloatingMenuProps {
  gold: number;
  onAddRewards: (gold: number, xp: number) => void;
  onAddNotification: (msg: string, type: any) => void;
  onOpenDuskChat?: () => void;
}

type ChestType = 'DAILY' | 'LEGENDARY' | 'ALLIANCE';
type Phase = 'SELECTION' | 'HERO';
type HeroStep = 'FLY_IN' | 'VIBRATE' | 'OPEN' | 'CARDS_OUT';

interface RewardCard {
  type: 'GOLD' | 'XP' | 'ITEM' | 'STONE';
  amount: number;
  label: string;
  color: string;
}

interface WeightedReward {
  reward: RewardCard;
  weight: number;
}

const pickWeightedRandom = (pool: WeightedReward[], count: number): RewardCard[] => {
  const result: RewardCard[] = [];
  const remaining = [...pool];
  for (let i = 0; i < count && remaining.length > 0; i++) {
    const totalW = remaining.reduce((s, r) => s + r.weight, 0);
    let roll = Math.random() * totalW;
    let picked = remaining[0];
    for (const entry of remaining) {
      roll -= entry.weight;
      if (roll <= 0) { picked = entry; break; }
    }
    const amt = picked.reward.amount;
    const variance = Math.round(amt * (0.85 + Math.random() * 0.3));
    result.push({ ...picked.reward, amount: Math.max(1, variance) });
    remaining.splice(remaining.indexOf(picked), 1);
  }
  return result;
};

const REWARD_POOLS: Record<'DAILY' | 'LEGENDARY' | 'ALLIANCE', WeightedReward[]> = {
  DAILY: [
    { reward: { type: 'GOLD', amount: 150,  label: 'GOLD',    color: '#eab308' }, weight: 35 },
    { reward: { type: 'GOLD', amount: 300,  label: 'GOLD',    color: '#eab308' }, weight: 25 },
    { reward: { type: 'STONE', amount: 2,    label: 'outfit_starter',  color: '#9ca3af' }, weight: 30 },
  ],
  LEGENDARY: [
    { reward: { type: 'GOLD',  amount: 800,  label: 'GOLD',            color: '#eab308' }, weight: 25 },
    { reward: { type: 'GOLD',  amount: 1500, label: 'GOLD',            color: '#eab308' }, weight: 15 },
    { reward: { type: 'STONE', amount: 2,    label: 'outfit_starter',  color: '#9ca3af' }, weight: 15 },
    { reward: { type: 'STONE', amount: 2,    label: 'outfit_ghost',    color: '#4ade80' }, weight: 12 },
    { reward: { type: 'STONE', amount: 1,    label: 'outfit_knight',   color: '#60a5fa' }, weight: 10 },
    { reward: { type: 'STONE', amount: 1,    label: 'outfit_assassin',  color: '#33dfff' }, weight: 8 },
  ],
  ALLIANCE: [
    { reward: { type: 'GOLD',  amount: 600,  label: 'GOLD',            color: '#eab308' }, weight: 18 },
    { reward: { type: 'GOLD',  amount: 1200, label: 'GOLD',            color: '#eab308' }, weight: 15 },
    { reward: { type: 'STONE', amount: 3,    label: 'outfit_starter',  color: '#9ca3af' }, weight: 8 },
    { reward: { type: 'STONE', amount: 3,    label: 'outfit_ghost',    color: '#4ade80' }, weight: 8 },
    { reward: { type: 'STONE', amount: 2,    label: 'outfit_knight',   color: '#60a5fa' }, weight: 8 },
    { reward: { type: 'STONE', amount: 2,    label: 'outfit_assassin',  color: '#33dfff' }, weight: 8 },
    { reward: { type: 'STONE', amount: 1,    label: 'outfit_vanguard', color: '#facc15' }, weight: 6 },
    { reward: { type: 'STONE', amount: 1,    label: 'outfit_monarch',  color: '#f87171' }, weight: 4 },
  ],
};

const CHEST_CFG = {
  DAILY: {
    label: 'Free Chest',
    subtitle: 'Free loot crate (30m cooldown)',
    color: '#00d4ff',
    borderColor: 'rgba(0,212,255,0.6)',
    glowColor: 'rgba(0,212,255,0.25)',
    bg: 'linear-gradient(135deg, #001a22 0%, #002233 100%)',
    rewards: [
      { type: 'GOLD' as const, amount: 200,  label: 'GOLD',   color: '#eab308' },
      { type: 'STONE' as const, amount: 1,   label: 'STONES', color: '#9ca3af' },
    ],
    contents: [
      { icon: '🪙', text: 'Gold — Low' },
      { icon: '💎', text: 'Outfit Stones' },
    ],
    cost: 'FREE',
    costType: 'timer' as const,
  },
  LEGENDARY: {
    label: 'Legendary Chest',
    subtitle: 'Rare loot — high-tier rewards',
    color: '#f59e0b',
    borderColor: 'rgba(245,158,11,0.6)',
    glowColor: 'rgba(245,158,11,0.25)',
    bg: 'linear-gradient(135deg, #1a1200 0%, #2a1e00 100%)',
    rewards: [
      { type: 'GOLD' as const,  amount: 1000, label: 'GOLD',   color: '#eab308' },
      { type: 'STONE' as const, amount: 2,    label: 'SHARDS', color: '#60a5fa' },
    ],
    contents: [
      { icon: '🪙', text: 'Gold — High' },
      { icon: '💎', text: 'Stone Shards' },
    ],
    cost: '500 Gold',
    costType: 'gold' as const,
  },
  ALLIANCE: {
    label: 'Alliance Chest',
    subtitle: 'Maximum rewards for elite hunters',
    color: '#bf5eff',
    borderColor: 'rgba(191,94,255,0.6)',
    glowColor: 'rgba(191,94,255,0.25)',
    bg: 'linear-gradient(135deg, #0e0018 0%, #180028 100%)',
    rewards: [
      { type: 'GOLD' as const,  amount: 800,  label: 'GOLD',   color: '#eab308' },
      { type: 'STONE' as const, amount: 3,    label: 'SHARDS', color: '#33dfff' },
    ],
    contents: [
      { icon: '🪙', text: 'Gold — Very High' },
      { icon: '💎', text: 'All Crystal Shards' },
    ],
    cost: '1500 Gold',
    costType: 'gold' as const,
  },
} as const;

const CHEST_TYPES: ChestType[] = ['DAILY', 'LEGENDARY', 'ALLIANCE'];

const getRewardIcon = (type: RewardCard['type']) => {
  switch (type) {
    case 'GOLD': return <SystemCoin size={26} />;
    case 'XP':   return <span className="text-xl leading-none">⚡</span>;
    case 'ITEM':  return <span className="text-xl leading-none">🧪</span>;
    case 'STONE': return <span className="text-xl leading-none">💎</span>;
  }
};

const CARD_POSITIONS = [
  { x: -72, y: -72 },
  { x:  72, y: -72 },
  { x: -72, y:  48 },
  { x:  72, y:  48 },
];

const DAILY_CHEST_CD = 30 * 60 * 1000; // 30 minutes

const MobileFloatingMenu: React.FC<MobileFloatingMenuProps> = ({
  gold,
  onAddRewards,
  onAddNotification,
  onOpenDuskChat,
}) => {
  const { player, awardRandomStones } = useSystem();
  const DAILY_CHEST_KEY = `reforge_daily_chest_time_${player.userId || 'local'}`;

  const [activeModal, setActiveModal] = useState<'NONE' | 'REWARDS' | 'DUNGEON'>('NONE');
  const [isChestLoaded, setIsChestLoaded] = useState(false);

  const [phase, setPhase]               = useState<Phase>('SELECTION');
  const [activeChest, setActiveChest]   = useState<ChestType | null>(null);
  const [cards, setCards]               = useState<RewardCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [heroStep, setHeroStep] = useState<HeroStep>('FLY_IN');

  const [activeTab, setActiveTab]           = useState<ChestType>('DAILY');
  const [expandedDropdown, setExpanded]     = useState<ChestType | null>(null);

  const [now, setNow]                     = useState(Date.now());
  const [lastDailyChest, setLastDailyChest] = useState<number>(0);

  const carouselRef  = useRef<HTMLDivElement>(null);
  const cardRefs     = useRef<Record<ChestType, HTMLDivElement | null>>({ DAILY: null, LEGENDARY: null, ALLIANCE: null });

  useEffect(() => {
    preloadChestLotties();
    const stored = localStorage.getItem(DAILY_CHEST_KEY);
    if (stored) setLastDailyChest(parseInt(stored, 10));

    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, [DAILY_CHEST_KEY]);

  useEffect(() => {
    if (activeModal === 'REWARDS') {
      setPhase('SELECTION');
      setActiveChest(null);
      setSelectedCard(null);
      setCards([]);
      setActiveTab('DAILY');
      setExpanded(null);
      setHeroStep('FLY_IN');
    }
  }, [activeModal]);

  const scrollToTab = useCallback((tab: ChestType) => {
    setActiveTab(tab);
    const card = cardRefs.current[tab];
    if (card && carouselRef.current) {
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, []);

  const isDailyReady   = now >= lastDailyChest + DAILY_CHEST_CD;


  const isLocked = (t: ChestType) => {
    if (t === 'DAILY')     return !isDailyReady;
    if (t === 'LEGENDARY') return gold < 500;
    return gold < 1500;
  };

  const handleClaim = async (type: ChestType) => {
    if (isLocked(type)) return;
    
    if (type === 'DAILY') {
      localStorage.setItem(DAILY_CHEST_KEY, Date.now().toString());
      setLastDailyChest(Date.now());
    } else if (type === 'LEGENDARY') {
      if (gold < 500) { onAddNotification('Need 500 Gold', 'WARNING'); return; }
    } else if (type === 'ALLIANCE') {
      if (gold < 1500) { onAddNotification('Need 1500 Gold', 'WARNING'); return; }
    }
    playSystemSoundEffect('PURCHASE');
    const pool = pickWeightedRandom(REWARD_POOLS[type], 4);
    setCards(pool);
    setActiveChest(type);
    setPhase('HERO');
    setSelectedCard(null);
  };

  const handleLottieComplete = () => setHeroStep(prev => prev === 'OPEN' ? 'CARDS_OUT' : prev);

  const handleCardSelect = (i: number) => {
    if (selectedCard !== null) return;
    playSystemSoundEffect('TICK');
    setSelectedCard(i);
  };

  useEffect(() => {
    if (phase !== 'HERO') return;
    setHeroStep('FLY_IN');
    const t1 = setTimeout(() => setHeroStep('VIBRATE'), 600);
    const t2 = setTimeout(() => setHeroStep('OPEN'), 1600);
    const t3 = setTimeout(() => setHeroStep(prev => prev === 'OPEN' ? 'CARDS_OUT' : prev), 2900);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [phase, activeChest]);

  const handleCollect = () => {
    if (selectedCard === null || !activeChest) return;
    const card = cards[selectedCard];
    if (card.type === 'STONE') {
      awardRandomStones(1, card.amount, 'chest');
    } else {
      onAddRewards(
        card.type === 'GOLD' ? card.amount : 0,
        card.type === 'XP'   ? card.amount : 0,
      );
    }
    playSystemSoundEffect('LEVEL_UP');
    setActiveModal('NONE');
  };

  /* ─── Chest Product Card ─────────────────────────────────────────────── */
  const renderChestCard = (type: ChestType) => {
    const cfg    = CHEST_CFG[type];
    const locked = isLocked(type);
    const ready  = !locked;
    const isOpen = expandedDropdown === type;

    const costBadge = type === 'DAILY'
      ? (isDailyReady
          ? <span className="flex items-center gap-1 text-[10px] font-black text-emerald-400"><Check size={10}/> READY</span>
          : <span className="flex items-center gap-1 text-[10px] font-bold" style={{ color: cfg.color }}><Check size={10}/> CLAIMED</span>)
      : <span className="flex items-center gap-1 text-[10px] font-bold text-yellow-400"><SystemCoin size={10}/> {cfg.cost}</span>;

    return (
      <div
        key={type}
        ref={el => { cardRefs.current[type] = el; }}
        className="snap-center shrink-0 w-full px-1"
        style={{ scrollSnapAlign: 'center' }}
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-2xl overflow-hidden"
          style={{
            background: cfg.bg,
            border: ready ? `1.5px solid ${cfg.borderColor}` : '1.5px solid rgba(255,255,255,0.07)',
            boxShadow: ready ? `0 0 28px ${cfg.glowColor}, inset 0 0 40px rgba(0,0,0,0.5)` : 'inset 0 0 40px rgba(0,0,0,0.5)',
          }}
        >
          {/* Chest animation preview */}
          <div className="relative w-full h-44 flex items-center justify-center overflow-hidden"
            style={{ background: cfg.bg }}>
            {type === 'DAILY'     && <DailyChestLottie     isLocked={locked} size={160} phase="IDLE" />}
            {type === 'LEGENDARY' && <LegendaryChestLottieV2 isLocked={locked} size={160} phase="IDLE" />}
            {type === 'ALLIANCE'  && <AllianceChestLottie  isLocked={locked} size={160} phase="IDLE" />}
            {locked && (
              <div className="absolute inset-0 z-20 bg-black/60 flex flex-col items-center justify-center gap-2 backdrop-blur-[2px]">
                <Lock size={28} style={{ color: cfg.color, opacity: 0.75 }} />
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest" style={{ color: cfg.color, opacity: 0.75 }}>
                  {type === 'DAILY' ? 'ON COOLDOWN' : 'INSUFFICIENT GOLD'}
                </span>
              </div>
            )}
          </div>

          {/* Card body */}
          <div className="p-4 space-y-3">
            {/* Name + cost + info */}
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-2">
                <div>
                  <h3 className="text-base font-black uppercase tracking-tight font-mono" style={{ color: cfg.color }}>
                    {cfg.label}
                  </h3>
                  <p className="text-[10px] text-gray-500 font-mono mt-0.5">{cfg.subtitle}</p>
                </div>
                {/* Small "i" info button */}
                <div className="relative mt-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); setExpanded(isOpen ? null : type); }}
                    className="w-5 h-5 rounded-full flex items-center justify-center transition-all shrink-0"
                    style={{
                      background: isOpen ? `${cfg.color}25` : 'rgba(255,255,255,0.06)',
                      border: `1px solid ${isOpen ? cfg.borderColor : 'rgba(255,255,255,0.12)'}`,
                      color: isOpen ? cfg.color : '#555',
                    }}
                  >
                    <Info size={10} />
                  </button>
                </div>
              </div>
              <div className="shrink-0 ml-2 px-2.5 py-1 rounded-lg text-[10px]"
                style={{ background: 'rgba(0,0,0,0.5)', border: `1px solid ${cfg.borderColor}` }}>
                {costBadge}
              </div>
            </div>

            {/* Claim button */}
            <button
              onClick={() => handleClaim(type)}
              disabled={locked}
              className="w-full py-2.5 rounded-xl text-xs font-black tracking-widest uppercase font-mono transition-all"
              style={{
                background: ready ? cfg.color : 'rgba(255,255,255,0.05)',
                color: ready ? '#000' : 'rgba(255,255,255,0.3)',
                boxShadow: ready ? `0 0 20px ${cfg.glowColor}` : 'none'
              }}
            >
              {locked
                ? (type === 'DAILY' ? 'ON COOLDOWN' : `${cfg.cost} required`)
                : 'CLAIM CHEST'}
            </button>
          </div>
        </motion.div>
      </div>
    );
  };

  /* ─── Hero Sequence (unified opening + cards) ────────────────────────── */
  const renderHeroSequence = () => {
    if (!activeChest) return null;
    const cfg = CHEST_CFG[activeChest];
    const lottiePhase: 'IDLE' | 'OPENING' = heroStep === 'OPEN' || heroStep === 'CARDS_OUT' ? 'OPENING' : 'IDLE';
    const showCards = heroStep === 'CARDS_OUT';
    const isVibrating = heroStep === 'VIBRATE';
    const isFlying = heroStep === 'FLY_IN';

    return (
      <div className="relative overflow-hidden" style={{ height: 360 }}>
        {/* CSS keyframes for shake and aura rotation */}
        <style>{`
          @keyframes chest-shake {
            0%, 100% { transform: translate(0,0) rotate(0deg); }
            10% { transform: translate(-6px, 2px) rotate(-3deg); }
            20% { transform: translate(6px, -2px) rotate(3deg); }
            30% { transform: translate(-5px, 1px) rotate(-2deg); }
            40% { transform: translate(5px, -1px) rotate(2deg); }
            50% { transform: translate(-3px, 2px) rotate(-1.5deg); }
            60% { transform: translate(3px, -2px) rotate(1.5deg); }
            70% { transform: translate(-2px, 1px) rotate(-0.5deg); }
            80% { transform: translate(2px, -1px) rotate(0.5deg); }
            90% { transform: translate(-1px, 1px) rotate(0.5deg); }
          }
          @keyframes aura-rotate {
            from { transform: translate(-50%, -50%) rotate(0deg); }
            to { transform: translate(-50%, -50%) rotate(360deg); }
          }
        `}</style>

        {/* Dark vignette overlay */}
        <motion.div
          className="absolute inset-0 pointer-events-none z-[1]"
          initial={{ opacity: 0 }}
          animate={{ opacity: showCards ? 0.3 : 1 }}
          transition={{ duration: 0.6 }}
          style={{
            background: 'radial-gradient(circle at 50% 45%, transparent 12%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0.92) 100%)',
          }}
        />

        {/* Central coloured glow */}
        <motion.div
          className="absolute pointer-events-none z-[2]"
          style={{
            left: '50%', top: '45%',
            width: 200, height: 200,
            marginLeft: -100, marginTop: -100,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${cfg.color}18 0%, ${cfg.color}08 40%, transparent 70%)`,
            filter: 'blur(20px)',
          }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: showCards ? 0 : [0.6, 1, 0.6], scale: showCards ? 0.3 : [1, 1.15, 1] }}
          transition={{ opacity: { duration: 1.8, repeat: showCards ? 0 : Infinity }, scale: { duration: 1.8, repeat: showCards ? 0 : Infinity } }}
        />

        {/* Rotating sunburst aura */}
        <AnimatePresence>
          {!showCards && !isFlying && (
            <motion.div
              className="absolute pointer-events-none z-[2]"
              initial={{ opacity: 0, scale: 0.3 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.5 }}
              style={{
                left: '50%', top: '45%',
                width: 300, height: 300,
                marginLeft: -150, marginTop: -150,
                animation: 'aura-rotate 12s linear infinite',
              }}
            >
              <svg width="300" height="300" viewBox="0 0 300 300">
                {Array.from({ length: 24 }).map((_, i) => {
                  const a = (i * 15 * Math.PI) / 180;
                  return (
                    <line key={i}
                      x1={150 + 45 * Math.cos(a)} y1={150 + 45 * Math.sin(a)}
                      x2={150 + 150 * Math.cos(a)} y2={150 + 150 * Math.sin(a)}
                      stroke={cfg.color} strokeWidth={i % 3 === 0 ? 2 : 0.8}
                      opacity={i % 3 === 0 ? 0.2 : 0.08}
                    />
                  );
                })}
                <circle cx="150" cy="150" r="55" fill="none" stroke={cfg.color} strokeWidth="1.5" opacity="0.2" />
                <circle cx="150" cy="150" r="90" fill="none" stroke={cfg.color} strokeWidth="0.8" opacity="0.1" strokeDasharray="6 4" />
                <circle cx="150" cy="150" r="125" fill="none" stroke={cfg.color} strokeWidth="0.4" opacity="0.05" />
              </svg>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hero chest — flies in, vibrates, opens, then shrinks */}
        <motion.div
          className="absolute z-[5]"
          style={{ left: '50%', top: '45%' }}
          initial={{ scale: 0.15, opacity: 0, x: '-50%', y: '-50%' }}
          animate={showCards
            ? { scale: 0.35, opacity: 0.12, x: '-50%', y: '-50%' }
            : { scale: 1, opacity: 1, x: '-50%', y: '-50%' }
          }
          transition={showCards
            ? { type: 'spring', stiffness: 180, damping: 22, delay: 0.15 }
            : { type: 'spring', stiffness: 150, damping: 14 }
          }
        >
          <div style={{ animation: isVibrating ? 'chest-shake 0.08s infinite' : 'none' }}>
            {activeChest === 'DAILY' && <DailyChestLottie phase={lottiePhase} size={200} onComplete={handleLottieComplete} />}
            {activeChest === 'LEGENDARY' && <LegendaryChestLottieV2 phase={lottiePhase} size={200} onComplete={handleLottieComplete} />}
            {activeChest === 'ALLIANCE' && <AllianceChestLottie phase={lottiePhase} size={200} onComplete={handleLottieComplete} />}
          </div>
        </motion.div>

        {/* Reward cards — burst from chest center */}
        {showCards && cards.map((card, i) => {
          const pos = CARD_POSITIONS[i];
          const isChosen = selectedCard === i;
          const anySel = selectedCard !== null;
          const fadeOut = anySel && !isChosen;
          return (
            <motion.div
              key={i}
              initial={{ scale: 0.1, x: 0, y: 25, opacity: 0 }}
              animate={fadeOut
                ? { scale: 0, opacity: 0, x: pos.x, y: pos.y }
                : isChosen
                ? { scale: 1.25, x: 0, y: -20, opacity: 1, rotateY: 180 }
                : { scale: 1, x: pos.x, y: pos.y, opacity: 1, rotateY: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20, delay: fadeOut ? 0 : i * 0.06 }}
              onClick={!anySel ? () => handleCardSelect(i) : undefined}
              className="absolute w-20 h-28 cursor-pointer select-none z-[10]"
              style={{ transformStyle: 'preserve-3d', top: '45%', left: '50%', marginLeft: -40, marginTop: -56 }}
            >
              {/* Front face (question mark) */}
              <div className="absolute inset-0 rounded-xl flex items-center justify-center"
                style={{ background: '#080914', border: `1px solid ${cfg.color}20`, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
                <div className="absolute inset-0 rounded-xl opacity-15"
                  style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '8px 8px' }} />
                <div className="w-9 h-9 rounded-full flex items-center justify-center relative z-10"
                  style={{ border: `1px solid ${cfg.color}30` }}>
                  <HelpCircle size={16} style={{ color: `${cfg.color}50` }} />
                </div>
              </div>
              {/* Back face (reward) */}
              <div className="absolute inset-0 rounded-xl flex flex-col items-center justify-center gap-1.5 border-2 overflow-hidden"
                style={{ background: '#080914', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)', transformStyle: 'flat', borderColor: card.color, boxShadow: `0 0 20px ${card.color}50` }}>
                {isChosen ? (
                  <>
                    <div className="absolute inset-0 rounded-xl"
                      style={{ background: `radial-gradient(ellipse at center, ${card.color}20 0%, transparent 65%)` }} />
                    <div className="relative z-10 flex flex-col items-center gap-1">
                      {getRewardIcon(card.type)}
                      <div className="text-base font-black text-white font-mono">+{card.amount}</div>
                      <div className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                        style={{ background: `${card.color}20`, color: card.color }}>{card.type === 'STONE' ? getStoneConfig(card.label).stoneName : card.label}</div>
                    </div>
                  </>
                ) : (
                  <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: `${card.color}15`, border: `1px solid ${card.color}30` }}>
                    <span className="text-lg">?</span>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    );
  };

  /* ─── MAIN RENDER ────────────────────────────────────────────────────── */
  return (
    <>
      {/* FABs */}
      <div className="fixed right-4 z-[80] flex flex-col gap-3.5 md:hidden" style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 5.5rem)' }}>

        {/* Dusk Chat FAB — 3D icon with floating + notification */}
        {onOpenDuskChat && (
          <motion.div
            className="relative"
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1, y: [0, -8, 0] }}
            transition={{
              x: { type: 'spring', stiffness: 200, damping: 20, delay: 0.3 },
              opacity: { duration: 0.5, delay: 0.3 },
              y: { duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.3 },
            }}
          >
            <button
              onClick={onOpenDuskChat}
              className="w-[52px] h-[52px] rounded-full flex items-center justify-center active:scale-90 transition-all relative overflow-hidden"
              style={{
                boxShadow: '0 0 24px rgba(59,130,246,0.5), 0 0 48px rgba(59,130,246,0.15)',
              }}
            >
              {/* Pulsing ring */}
              <span className="absolute inset-[-3px] rounded-full border-[2.5px] border-blue-400/50" style={{
                animation: 'duskRingPulse 3s ease-in-out infinite',
              }} />
              {/* Hooded figure avatar */}
              <img
                src="/assets/dusk-avatar.png"
                alt="Dusk"
                className="w-full h-full object-cover rounded-full"
              />
            </button>
            {/* Unread notification pip */}
            {(player.duskUnreadCount || 0) > 0 && (
              <span className="pointer-events-none absolute -top-0.5 -right-0.5 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-red-500" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] items-center justify-center text-[8px] font-black text-white">
                  {player.duskUnreadCount > 9 ? '9+' : player.duskUnreadCount}
                </span>
              </span>
            )}
          </motion.div>
        )}

      </div>

      {/* Modal portal — renders above everything including the navbar */}
      {createPortal(
        <AnimatePresence>
          {activeModal !== 'NONE' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-end justify-center p-4 pb-6"
              style={{ zIndex: 9999 }}
              onClick={() => setActiveModal('NONE')}
            >
              <motion.div
                initial={{ y: '100%', scale: 0.97 }}
                animate={{ y: 0, scale: 1 }}
                exit={{ y: '100%', scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-sm relative rounded-3xl overflow-hidden"
                style={{ background: '#07070f', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                {/* Close */}
                <button
                  onClick={() => setActiveModal('NONE')}
                  className="absolute top-4 right-4 text-gray-500 hover:text-white z-30 transition-colors"
                >
                  <X size={20} />
                </button>

                {/* ── CHEST VAULT ── */}
                {activeModal === 'REWARDS' && (
                  <div className="flex flex-col" style={{ maxHeight: '88vh' }}>

                    {/* Header */}
                    <div className="px-5 pt-5 pb-3 border-b border-white/[0.06] shrink-0">
                      <div className="text-[9px] font-mono font-bold tracking-[0.3em] uppercase text-gray-600 mb-0.5">HUNTER VAULT</div>
                      <div className="flex items-center justify-between">
                        <h2 className="text-lg font-black text-white uppercase tracking-tight font-mono">CHEST VAULT</h2>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1 text-xs font-mono font-bold text-yellow-300">
                            <div className="flex items-center justify-center -mx-2 -my-2" style={{ width: 35, flexShrink: 0 }}>
                              <SystemCoin size={35} />
                            </div> {gold}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Content area */}
                    <div className="flex-1 overflow-y-auto" style={{ background: '#05050f' }}>

                      {phase === 'SELECTION' && (
                        <>
                          {/* Tab nav */}
                          <div className="flex gap-2 px-4 pt-4 pb-2 shrink-0">
                            {CHEST_TYPES.map(t => {
                              const cfg    = CHEST_CFG[t];
                              const active = activeTab === t;
                              return (
                                <button
                                  key={t}
                                  onClick={() => scrollToTab(t)}
                                  className="flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest font-mono transition-all"
                                  style={active ? {
                                    background: `${cfg.color}20`,
                                    border: `1px solid ${cfg.borderColor}`,
                                    color: cfg.color,
                                  } : {
                                    background: 'rgba(255,255,255,0.04)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    color: '#4b5563',
                                  }}
                                >
                                  {t === 'DAILY' ? 'Free' : t === 'LEGENDARY' ? 'Legend' : 'Alliance'}
                                </button>
                              );
                            })}
                          </div>

                          {/* Carousel */}
                          <div
                            ref={carouselRef}
                            className="flex overflow-x-auto snap-x snap-mandatory pb-4 pt-1 px-3 gap-0"
                            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                            onScroll={() => {
                              const el = carouselRef.current;
                              if (!el) return;
                              const scrollPos = el.scrollLeft + el.clientWidth / 2;
                              CHEST_TYPES.forEach(t => {
                                const card = cardRefs.current[t];
                                if (card) {
                                  const left  = card.offsetLeft;
                                  const right = left + card.offsetWidth;
                                  if (scrollPos >= left && scrollPos < right) setActiveTab(t);
                                }
                              });
                            }}
                          >
                            {CHEST_TYPES.map(t => renderChestCard(t))}
                          </div>

                          {/* Info panel — rendered outside carousel to avoid overflow clipping */}
                          <AnimatePresence>
                            {expandedDropdown && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="mx-4 mb-3 overflow-hidden"
                              >
                                <div
                                  className="rounded-xl p-3"
                                  style={{
                                    background: '#0a0a18',
                                    border: `1px solid ${CHEST_CFG[expandedDropdown].borderColor}`,
                                    boxShadow: `0 8px 28px rgba(0,0,0,0.85), 0 0 12px ${CHEST_CFG[expandedDropdown].glowColor}`,
                                  }}
                                >
                                  <div className="text-[9px] font-mono font-bold uppercase tracking-widest mb-2" style={{ color: CHEST_CFG[expandedDropdown].color }}>
                                    {CHEST_CFG[expandedDropdown].label} — Possible Rewards
                                  </div>
                                  {CHEST_CFG[expandedDropdown].contents.map((item: any, i: number) => (
                                    <div key={i} className="flex items-center gap-2 py-0.5 text-[10px] font-mono text-gray-300">
                                      <span className="text-[12px] leading-none">{item.icon}</span>
                                      <span>{item.text}</span>
                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </>
                      )}

                      {phase === 'HERO' && (
                        <div className="px-4 pb-4">
                          {renderHeroSequence()}
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="px-5 py-4 border-t border-white/[0.05] shrink-0" style={{ background: 'rgba(0,0,0,0.6)' }}>
                      {phase === 'HERO' && heroStep !== 'CARDS_OUT' && (
                        <motion.p
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{ duration: 1.1, repeat: Infinity }}
                          className="text-center text-xs font-black font-mono uppercase tracking-widest"
                          style={{ color: activeChest ? CHEST_CFG[activeChest].color : '#fff' }}
                        >
                          {heroStep === 'FLY_IN' ? 'PREPARING...' : heroStep === 'VIBRATE' ? 'UNLOCKING...' : 'REVEALING...'}
                        </motion.p>
                      )}
                      {phase === 'HERO' && heroStep === 'CARDS_OUT' && selectedCard === null && (
                        <p className="text-center text-xs font-black font-mono uppercase tracking-widest text-white animate-pulse">
                          CHOOSE YOUR REWARD
                        </p>
                      )}
                      {phase === 'HERO' && heroStep === 'CARDS_OUT' && selectedCard !== null && (
                        <motion.button
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          onClick={handleCollect}
                          className="w-full py-3.5 rounded-xl font-black uppercase tracking-widest text-sm text-black flex items-center justify-center gap-2"
                          style={{
                            background: activeChest ? `linear-gradient(135deg, ${CHEST_CFG[activeChest].color}, white)` : '#fff',
                            boxShadow: activeChest ? `0 0 24px ${CHEST_CFG[activeChest].glowColor}` : 'none',
                          }}
                        >
                          <Check size={16} /> COLLECT REWARD
                        </motion.button>
                      )}
                      {phase === 'SELECTION' && (
                        <p className="text-center text-[10px] font-mono uppercase tracking-widest text-gray-700">
                          Swipe to browse chests
                        </p>
                      )}
                    </div>
                  </div>
                )}


              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};

export default MobileFloatingMenu;
