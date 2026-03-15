
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Castle, X, HelpCircle, Check, Lock, ChevronDown, ChevronUp, Coins } from 'lucide-react';
import { DailyChestAnim, LegendaryChestAnim, AllianceChestAnim, ChestOpeningAnim } from './ChestAnimations';
import { SystemCoin } from './icons/SystemCoin';
import { SystemKey } from './icons/SystemKey';
import { playSystemSoundEffect } from '../utils/soundEngine';

interface MobileFloatingMenuProps {
  onEnterDungeon: (isFree: boolean) => void;
  onNavigateToDungeon?: () => void;
  gold: number;
  keys: number;
  lastDungeonEntry: number;
  onConsumeKey: (amount: number) => Promise<boolean>;
  onAddRewards: (gold: number, xp: number, keys: number) => void;
  onAddNotification: (msg: string, type: any) => void;
}

type ChestType = 'DAILY' | 'LEGENDARY' | 'ALLIANCE';
type Phase = 'SELECTION' | 'OPENING' | 'CARDS';

interface RewardCard {
  type: 'GOLD' | 'XP' | 'KEYS' | 'ITEM';
  amount: number;
  label: string;
  color: string;
}

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
      { type: 'XP'   as const, amount: 100,  label: 'EXP',    color: '#3b82f6' },
      { type: 'KEYS' as const, amount: 1,    label: 'KEYS',   color: '#a855f7' },
      { type: 'ITEM' as const, amount: 1,    label: 'POTION', color: '#ef4444' },
    ],
    contents: [
      { icon: '🪙', text: '200 Gold' },
      { icon: '⚡', text: '100 EXP' },
      { icon: '🗝️', text: '1 Key' },
      { icon: '🧪', text: '1 Potion' },
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
      { type: 'GOLD' as const, amount: 1000, label: 'GOLD',   color: '#eab308' },
      { type: 'XP'   as const, amount: 500,  label: 'EXP',    color: '#3b82f6' },
      { type: 'KEYS' as const, amount: 3,    label: 'KEYS',   color: '#a855f7' },
      { type: 'ITEM' as const, amount: 1,    label: 'SCROLL', color: '#00d2ff' },
    ],
    contents: [
      { icon: '🪙', text: '1000 Gold' },
      { icon: '⚡', text: '500 EXP' },
      { icon: '🗝️', text: '3 Keys' },
      { icon: '📜', text: '1 Scroll' },
    ],
    cost: '7 Keys',
    costType: 'keys' as const,
  },
  ALLIANCE: {
    label: 'Alliance Chest',
    subtitle: 'Maximum rewards for elite hunters',
    color: '#bf5eff',
    borderColor: 'rgba(191,94,255,0.6)',
    glowColor: 'rgba(191,94,255,0.25)',
    bg: 'linear-gradient(135deg, #0e0018 0%, #180028 100%)',
    rewards: [
      { type: 'GOLD' as const, amount: 800,  label: 'GOLD',   color: '#eab308' },
      { type: 'XP'   as const, amount: 300,  label: 'EXP',    color: '#3b82f6' },
      { type: 'KEYS' as const, amount: 5,    label: 'KEYS',   color: '#a855f7' },
      { type: 'ITEM' as const, amount: 1,    label: 'ORB',    color: '#bf5eff' },
    ],
    contents: [
      { icon: '🪙', text: '800 Gold' },
      { icon: '⚡', text: '300 EXP' },
      { icon: '🗝️', text: '5 Keys' },
      { icon: '🔮', text: '1 Orb' },
    ],
    cost: '36 Keys',
    costType: 'keys' as const,
  },
} as const;

const CHEST_TYPES: ChestType[] = ['DAILY', 'LEGENDARY', 'ALLIANCE'];

const getRewardIcon = (type: RewardCard['type']) => {
  switch (type) {
    case 'GOLD': return <SystemCoin size={26} />;
    case 'KEYS': return <SystemKey size={26} />;
    case 'XP':   return <span className="text-xl leading-none">⚡</span>;
    case 'ITEM':  return <span className="text-xl leading-none">🧪</span>;
  }
};

const CARD_POSITIONS = [
  { x: -72, y: -72 },
  { x:  72, y: -72 },
  { x: -72, y:  48 },
  { x:  72, y:  48 },
];

const DAILY_CHEST_KEY = 'reforge_daily_chest_time';
const DAILY_CHEST_CD = 30 * 60 * 1000; // 30 minutes

const MobileFloatingMenu: React.FC<MobileFloatingMenuProps> = ({
  onEnterDungeon,
  onNavigateToDungeon,
  gold,
  keys,
  lastDungeonEntry,
  onConsumeKey,
  onAddRewards,
  onAddNotification,
}) => {
  const [activeModal, setActiveModal] = useState<'NONE' | 'REWARDS' | 'DUNGEON'>('NONE');
  const [isChestLoaded, setIsChestLoaded] = useState(false);

  const [phase, setPhase]               = useState<Phase>('SELECTION');
  const [activeChest, setActiveChest]   = useState<ChestType | null>(null);
  const [cards, setCards]               = useState<RewardCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<number | null>(null);

  const [activeTab, setActiveTab]           = useState<ChestType>('DAILY');
  const [expandedDropdown, setExpanded]     = useState<ChestType | null>(null);

  const [now, setNow]                     = useState(Date.now());
  const [lastDailyChest, setLastDailyChest] = useState<number>(0);

  const carouselRef  = useRef<HTMLDivElement>(null);
  const cardRefs     = useRef<Record<ChestType, HTMLDivElement | null>>({ DAILY: null, LEGENDARY: null, ALLIANCE: null });

  useEffect(() => {
    const stored = localStorage.getItem(DAILY_CHEST_KEY);
    if (stored) setLastDailyChest(parseInt(stored, 10));

    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (activeModal === 'REWARDS') {
      setPhase('SELECTION');
      setActiveChest(null);
      setSelectedCard(null);
      setCards([]);
      setActiveTab('DAILY');
      setExpanded(null);
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
  const DUNGEON_CD     = 24 * 60 * 60 * 1000;
  const isDungeonReady = now >= (lastDungeonEntry + DUNGEON_CD);

  const isLocked = (t: ChestType) => {
    if (t === 'DAILY')     return !isDailyReady;
    if (t === 'LEGENDARY') return keys < 7;
    return keys < 36;
  };

  const handleClaim = async (type: ChestType) => {
    if (isLocked(type)) return;
    
    if (type === 'DAILY') {
      localStorage.setItem(DAILY_CHEST_KEY, Date.now().toString());
      setLastDailyChest(Date.now());
    } else if (type === 'LEGENDARY') {
      const ok = await onConsumeKey(7);
      if (!ok) { onAddNotification('Need 7 Keys', 'WARNING'); return; }
    } else if (type === 'ALLIANCE') {
      const ok = await onConsumeKey(36);
      if (!ok) { onAddNotification('Need 36 Keys', 'WARNING'); return; }
    }
    playSystemSoundEffect('PURCHASE');
    const pool = [...CHEST_CFG[type].rewards].sort(() => Math.random() - 0.5);
    setCards(pool);
    setActiveChest(type);
    setPhase('OPENING');
    setSelectedCard(null);
  };

  const handleOpenComplete = () => setPhase('CARDS');

  const handleCardSelect = (i: number) => {
    if (selectedCard !== null) return;
    playSystemSoundEffect('TICK');
    setSelectedCard(i);
  };

  const handleCollect = () => {
    if (selectedCard === null || !activeChest) return;
    const card = cards[selectedCard];
    onAddRewards(
      card.type === 'GOLD' ? card.amount : 0,
      card.type === 'XP'   ? card.amount : 0,
      card.type === 'KEYS' ? card.amount : 0,
    );
    // Daily chest is handled by Calendar now
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
      : <span className="flex items-center gap-1 text-[10px] font-bold text-purple-300"><SystemKey size={10}/> {cfg.cost}</span>;

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
            {type === 'DAILY'     && <DailyChestAnim     isLocked={locked} size={160} />}
            {type === 'LEGENDARY' && <LegendaryChestAnim isLocked={locked} size={160} />}
            {type === 'ALLIANCE'  && <AllianceChestAnim  isLocked={locked} size={160} />}
            {locked && (
              <div className="absolute inset-0 z-20 bg-black/60 flex flex-col items-center justify-center gap-2 backdrop-blur-[2px]">
                <Lock size={28} style={{ color: cfg.color, opacity: 0.75 }} />
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest" style={{ color: cfg.color, opacity: 0.75 }}>
                  {type === 'DAILY' ? 'ON COOLDOWN' : 'INSUFFICIENT KEYS'}
                </span>
              </div>
            )}
          </div>

          {/* Card body */}
          <div className="p-4 space-y-3">
            {/* Name + cost */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-black uppercase tracking-tight font-mono" style={{ color: cfg.color }}>
                  {cfg.label}
                </h3>
                <p className="text-[10px] text-gray-500 font-mono mt-0.5">{cfg.subtitle}</p>
              </div>
              <div className="shrink-0 ml-2 px-2.5 py-1 rounded-lg text-[10px]"
                style={{ background: 'rgba(0,0,0,0.5)', border: `1px solid ${cfg.borderColor}` }}>
                {costBadge}
              </div>
            </div>

            {/* Contents dropdown */}
            <div>
              <button
                onClick={() => setExpanded(isOpen ? null : type)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-[10px] font-mono font-bold uppercase tracking-widest transition-colors"
                style={{
                  background: isOpen ? `${cfg.color}15` : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${isOpen ? cfg.borderColor : 'rgba(255,255,255,0.08)'}`,
                  color: isOpen ? cfg.color : '#6b7280',
                }}
              >
                <span>Possible Rewards</span>
                {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 grid grid-cols-2 gap-1.5 px-0.5">
                      {cfg.contents.map((item, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[10px] font-mono"
                          style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.06)' }}
                        >
                          <span className="text-sm">{item.icon}</span>
                          <span className="text-gray-300 font-bold">{item.text}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
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

  /* ─── Opening phase ──────────────────────────────────────────────────── */
  const renderOpeningChest = () => {
    if (!activeChest) return null;
    const cfg = CHEST_CFG[activeChest];
    return (
      <ChestOpeningAnim
        color={cfg.color}
        glowColor={cfg.glowColor}
        onComplete={handleOpenComplete}
      />
    );
  };

  /* ─── Cards phase ────────────────────────────────────────────────────── */
  const renderCardsPhase = () => {
    if (!activeChest) return null;
    return (
      <div className="relative flex items-center justify-center" style={{ height: 300 }}>
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.3, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-28 h-28 rounded-2xl overflow-hidden opacity-30"
          style={{ background: CHEST_CFG[activeChest].bg, border: `1px solid ${CHEST_CFG[activeChest].borderColor}` }}
        >
          {activeChest === 'DAILY'     && <DailyChestAnim     isLocked={false} size={112} />}
          {activeChest === 'LEGENDARY' && <LegendaryChestAnim isLocked={false} size={112} />}
          {activeChest === 'ALLIANCE'  && <AllianceChestAnim  isLocked={false} size={112} />}
        </motion.div>
        {cards.map((card, i) => {
          const pos      = CARD_POSITIONS[i];
          const isChosen = selectedCard === i;
          const anySel   = selectedCard !== null;
          const fadeOut  = anySel && !isChosen;
          return (
            <motion.div
              key={i}
              initial={{ scale: 0, x: 0, y: 0, opacity: 0 }}
              animate={fadeOut
                ? { scale: 0, opacity: 0, x: pos.x, y: pos.y }
                : isChosen
                ? { scale: 1.25, x: 0, y: -16, opacity: 1, rotateY: 180 }
                : { scale: 1, x: pos.x, y: pos.y, opacity: 1, rotateY: 0 }}
              transition={{ type: 'spring', stiffness: 240, damping: 22, delay: fadeOut ? 0 : i * 0.08 + 0.5 }}
              onClick={!anySel ? () => handleCardSelect(i) : undefined}
              className="absolute w-20 h-28 cursor-pointer select-none"
              style={{ transformStyle: 'preserve-3d', top: '50%', left: '50%', marginLeft: -40, marginTop: -56 }}
            >
              {/* Front face (question mark) */}
              <div className="absolute inset-0 rounded-xl flex items-center justify-center"
                style={{ background: '#080914', border: '1px solid rgba(255,255,255,0.08)', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
                <div className="absolute inset-0 rounded-xl opacity-15"
                  style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '8px 8px' }} />
                <div className="w-9 h-9 rounded-full border border-white/15 flex items-center justify-center relative z-10">
                  <HelpCircle size={16} className="text-white/30" />
                </div>
              </div>
              {/* Back face (reward) - transformStyle:flat prevents child 3D animations from leaking through backface */}
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
                        style={{ background: `${card.color}20`, color: card.color }}>{card.label}</div>
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
      <div className="fixed right-4 bottom-24 z-[80] flex flex-col gap-4 md:hidden">
        {/* Chest FAB — notification pip floats with the button */}
        <motion.div
          className="relative"
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1, y: [0, -8, 0] }}
          transition={{
            x: { type: 'spring', stiffness: 200, damping: 20, delay: 0.5 },
            opacity: { duration: 0.5, delay: 0.5 },
            y: { duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.5 },
          }}
        >
          <button
            onClick={() => setActiveModal('REWARDS')}
            className="w-12 h-12 bg-black/40 backdrop-blur-md border border-purple-500/40 rounded-full flex items-center justify-center active:scale-90 transition-all relative overflow-hidden"
          >
            {!isChestLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-6 h-6 bg-purple-500/20 rounded-full animate-pulse" />
              </div>
            )}
            <img
              src="/images/ui/chest-icon.png"
              alt="Chest"
              className={`w-full h-full object-cover transition-opacity duration-500 ${isChestLoaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setIsChestLoaded(true)}
            />
          </button>
          {isDailyReady && (
            <span className="pointer-events-none absolute -top-0.5 -right-0.5 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-red-500" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
            </span>
          )}
        </motion.div>

        {/* Dungeon FAB — notification pip floats with the button */}
        <motion.div
          className="relative"
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1, y: [0, -8, 0] }}
          transition={{
            x: { type: 'spring', stiffness: 200, damping: 20, delay: 0.7 },
            opacity: { duration: 0.5, delay: 0.7 },
            y: { duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.7 },
          }}
        >
          <button
            onClick={() => onNavigateToDungeon?.()}
            className="w-12 h-12 bg-black/40 backdrop-blur-md border border-red-600/30 rounded-full flex items-center justify-center active:scale-90 transition-all relative overflow-hidden"
          >
            <img
              src="/images/ui/dungeon-bg.jpg"
              alt="Dungeon"
              className="w-full h-full object-cover opacity-80"
            />
          </button>
          {isDungeonReady && (
            <span className="pointer-events-none absolute -top-0.5 -right-0.5 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: '#ff4500' }} />
              <span className="relative inline-flex rounded-full h-3 w-3" style={{ background: '#ff4500', boxShadow: '0 0 6px #ff4500' }} />
            </span>
          )}
        </motion.div>
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
                            <Coins size={11} className="text-yellow-400" /> {gold}
                          </div>
                          <div className="flex items-center gap-1 text-xs font-mono font-bold text-purple-300">
                            <SystemKey size={13} /> {keys}
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
                        </>
                      )}

                      {phase === 'OPENING' && (
                        <div className="px-4 pb-4">
                          {renderOpeningChest()}
                        </div>
                      )}

                      {phase === 'CARDS' && (
                        <div className="px-4 pb-4">
                          {renderCardsPhase()}
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="px-5 py-4 border-t border-white/[0.05] shrink-0" style={{ background: 'rgba(0,0,0,0.6)' }}>
                      {phase === 'OPENING' && (
                        <motion.p
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{ duration: 1.1, repeat: Infinity }}
                          className="text-center text-xs font-black font-mono uppercase tracking-widest"
                          style={{ color: activeChest ? CHEST_CFG[activeChest].color : '#fff' }}
                        >
                          UNLOCKING...
                        </motion.p>
                      )}
                      {phase === 'CARDS' && selectedCard === null && (
                        <p className="text-center text-xs font-black font-mono uppercase tracking-widest text-white animate-pulse">
                          CHOOSE YOUR REWARD
                        </p>
                      )}
                      {phase === 'CARDS' && selectedCard !== null && (
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

                {/* ── DUNGEON ── */}
                {activeModal === 'DUNGEON' && (
                  <div className="flex flex-col">
                    <div className="h-32 bg-red-950/30 relative flex items-center justify-center overflow-hidden border-b border-red-900/50">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.2)_0%,transparent_70%)]" />
                      <Castle size={64} className="text-red-600 relative z-10 drop-shadow-[0_0_15px_rgba(220,38,38,0.8)]" />
                    </div>
                    <div className="p-6 text-center space-y-6">
                      <div>
                        <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">DEMON TOWER</h2>
                        <p className="text-[10px] text-red-400 font-mono uppercase tracking-[0.2em] font-bold">Floor 1 - 100 Available</p>
                      </div>
                      <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
                        <p className="text-[9px] text-gray-500 uppercase font-bold mb-3 tracking-widest">Potential Acquisition</p>
                        <div className="flex justify-center items-center gap-6">
                          <div className="flex flex-col items-center gap-1">
                            <SystemCoin size={32} />
                            <span className="text-xs font-bold text-yellow-500">100-5000</span>
                          </div>
                          <div className="w-px h-8 bg-gray-700" />
                          <div className="flex flex-col items-center gap-1">
                            <SystemKey size={32} />
                            <span className="text-xs font-bold text-purple-500">Key Drops</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => { setActiveModal('NONE'); onEnterDungeon(true); }}
                        className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest text-sm rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-all active:scale-95 flex items-center justify-center gap-2"
                      >
                        ENTER DUNGEON <Castle size={16} />
                      </button>
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
