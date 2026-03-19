
import React, { useState, useEffect, useRef, lazy, Suspense, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, Timer, Key, CheckCircle2, Lock, ChevronLeft, ChevronRight } from 'lucide-react';
import { ShopItem, Outfit } from '../types';
import { API_BASE } from '../lib/apiConfig';
import ErrorBoundary from './ErrorBoundary';
import OnboardingNotice from './OnboardingNotice';
const WardrobePreviewCard = lazy(() => import('./WardrobePreviewCard'));

interface EventBanner {
  id: number;
  title: string;
  subtitle: string | null;
  image_url: string;
  link_url: string | null;
  display_order: number;
}

interface Consumables {
  healthPotions: number;
  shadowScrolls: number;
  ultOrbs: number;
}

interface ShopViewProps {
  gold: number;
  items: ShopItem[];
  purchaseItem: (item: ShopItem) => void;
  addItem?: (item: ShopItem) => void;
  removeItem?: (id: string) => void;
  keys?: number;
  lastDungeonEntry?: number;
  onStartDungeon?: (isFree: boolean) => void;
  consumables?: Consumables;
  buyConsumable?: (type: 'healthPotion' | 'shadowScroll' | 'ultOrb') => void;
  streak?: number;
  lastLoginDate?: string;
  onOpenDailyCalendar?: () => void;
  highlightDungeon?: boolean;
  onHighlightConsumed?: () => void;
  // Wardrobe props (moved from home page)
  wardrobeGold?: number;
  wardrobeUnlockedOutfits?: string[];
  wardrobeEquippedOutfitId?: string;
  wardrobeOutfits?: Outfit[];
  wardrobeOnPurchase?: (outfit: Outfit) => void;
  wardrobeOnEquip?: (id: string) => void;
}

const DUNGEON_BANNER = 'https://res.cloudinary.com/dcnqnbvp0/image/upload/v1771066637/Image_202602141625_tlkmvf.jpg';

const RARITY_STYLES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  COMMON:    { label: 'COMMON',    bg: 'rgba(107,114,128,0.2)', text: '#9ca3af', border: 'rgba(107,114,128,0.3)' },
  RARE:      { label: 'RARE',      bg: 'rgba(0,210,255,0.12)',  text: '#00d2ff', border: 'rgba(0,210,255,0.25)' },
  LEGENDARY: { label: 'LEGENDARY', bg: 'rgba(234,179,8,0.12)',  text: '#eab308', border: 'rgba(234,179,8,0.3)' },
};

const CONSUMABLE_ITEMS = [
  {
    type: 'healthPotion' as const,
    name: 'Health Potion',
    desc: 'Heals War HP. Prevents elimination.',
    rarity: 'COMMON',
    costGold: 100,
    costKeys: 0,
    emoji: '🧪',
    ownedKey: 'healthPotions' as keyof Consumables,
    accentColor: '#ef4444',
  },
  {
    type: 'shadowScroll' as const,
    name: 'Shadow Scroll',
    desc: 'Consumed to attempt a Shadow Extraction.',
    rarity: 'RARE',
    costGold: 150,
    costKeys: 0,
    emoji: '📜',
    ownedKey: 'shadowScrolls' as keyof Consumables,
    accentColor: '#00d2ff',
  },
  {
    type: 'ultOrb' as const,
    name: 'ULT Refill Orb',
    desc: 'Reloads your Ultimate ability instantly.',
    rarity: 'LEGENDARY',
    costGold: 0,
    costKeys: 3,
    emoji: '⚡',
    ownedKey: 'ultOrbs' as keyof Consumables,
    accentColor: '#a855f7',
  },
];

// Simplified 7-day preview for Store page (full 30-day calendar in modal)
const LOGIN_REWARDS = [
  { day: 1, emoji: '🪙', label: '100 G',   rarity: 'COMMON'    },
  { day: 2, emoji: '🧪', label: 'Potion',  rarity: 'COMMON'    },
  { day: 3, emoji: '🪙', label: '200 G',   rarity: 'COMMON'    },
  { day: 4, emoji: '📜', label: 'Scroll',  rarity: 'RARE'      },
  { day: 5, emoji: '', label: '300 G',   rarity: 'COMMON'    },
  { day: 6, emoji: '🧪', label: '×2',      rarity: 'COMMON'    },
  { day: 7, emoji: '🗝️', label: 'Key',     rarity: 'RARE'      },
];

const ShopView: React.FC<ShopViewProps> = ({
  gold,
  items,
  purchaseItem,
  keys = 0,
  lastDungeonEntry = 0,
  onStartDungeon,
  consumables = { healthPotions: 0, shadowScrolls: 0, ultOrbs: 0 },
  buyConsumable,
  streak = 0,
  lastLoginDate = '',
  onOpenDailyCalendar,
  highlightDungeon = false,
  onHighlightConsumed,
  wardrobeGold,
  wardrobeUnlockedOutfits,
  wardrobeEquippedOutfitId,
  wardrobeOutfits,
  wardrobeOnPurchase,
  wardrobeOnEquip,
}) => {
  const [timeUntilFree, setTimeUntilFree] = useState<number>(0);
  const [buyingItem, setBuyingItem] = useState<string | null>(null);
  const [dungeonHighlightActive, setDungeonHighlightActive] = useState(false);
  const dungeonRef = useRef<HTMLDivElement>(null);

  // Event Banner Carousel
  const [banners, setBanners] = useState<EventBanner[]>([]);
  const [bannerIdx, setBannerIdx] = useState(0);
  const bannerTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/store/banners`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (Array.isArray(data) && data.length > 0) setBanners(data); })
      .catch(() => {});
  }, []);

  const resetBannerTimer = useCallback(() => {
    if (bannerTimer.current) clearInterval(bannerTimer.current);
    if (banners.length > 1) {
      bannerTimer.current = setInterval(() => setBannerIdx(p => (p + 1) % banners.length), 5000);
    }
  }, [banners.length]);

  useEffect(() => {
    resetBannerTimer();
    return () => { if (bannerTimer.current) clearInterval(bannerTimer.current); };
  }, [resetBannerTimer]);

  useEffect(() => {
    if (!highlightDungeon) return;
    setDungeonHighlightActive(true);
    const timer = setTimeout(() => {
      setDungeonHighlightActive(false);
      onHighlightConsumed?.();
    }, 2800);
    setTimeout(() => {
      dungeonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 120);
    return () => clearTimeout(timer);
  }, [highlightDungeon]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const check = () => {
      const next = lastDungeonEntry + 24 * 60 * 60 * 1000;
      setTimeUntilFree(Math.max(0, next - Date.now()));
    };
    check();
    const iv = setInterval(check, 1000);
    return () => clearInterval(iv);
  }, [lastDungeonEntry]);

  const formatTime = (ms: number) => {
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    const s = Math.floor((ms % 60_000) / 1000);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const isFreeReady  = timeUntilFree <= 0;
  const canAffordPaid = keys >= 3;

  const handleBuy = (type: 'healthPotion' | 'shadowScroll' | 'ultOrb') => {
    if (!buyConsumable) return;
    setBuyingItem(type);
    buyConsumable(type);
    setTimeout(() => setBuyingItem(null), 600);
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const claimedToday = lastLoginDate === todayStr;
  // Use 7-day cycle for preview display
  const currentStreakDay = Math.max(1, ((streak - 1) % 7) + 1);
  const [loginToast, setLoginToast] = useState<string | null>(null);

  const showLoginToast = (msg: string) => {
    setLoginToast(msg);
    setTimeout(() => setLoginToast(null), 2000);
  };

  const handleDayClick = (dayNum: number) => {
    const isCurrent = dayNum === currentStreakDay;
    const isClaimed = claimedToday ? dayNum <= currentStreakDay : dayNum < currentStreakDay;
    const isFuture = dayNum > currentStreakDay;

    if (isClaimed) {
      showLoginToast('Reward already claimed!');
    } else if (isFuture) {
      showLoginToast('Login tomorrow to collect this reward');
    } else if (isCurrent) {
      // Today's day — open the popup
      onOpenDailyCalendar?.();
    }
  };

  return (
    <div id="tut-store" className="space-y-5 pb-10">
      <OnboardingNotice page="STORE" />

      {/* ── INVENTORY COUNTERS ── */}
      <div className="grid grid-cols-3 gap-3 pt-2">
        {[
          { emoji: '🧪', label: 'Potions',  count: consumables.healthPotions, color: '#ef4444' },
          { emoji: '📜', label: 'Scrolls',  count: consumables.shadowScrolls,  color: '#00d2ff' },
          { emoji: '⚡', label: 'Orbs',     count: consumables.ultOrbs,        color: '#a855f7' },
        ].map(c => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center gap-1 rounded-xl py-3 px-2 relative overflow-hidden"
            style={{ background: `${c.color}10`, border: `1px solid ${c.color}25` }}
          >
            <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 50% 0%, ${c.color}08, transparent 70%)` }} />
            <span className="text-2xl leading-none">{c.emoji}</span>
            <span className="font-mono font-black text-xl" style={{ color: c.color }}>{c.count}</span>
            <span className="font-mono text-[9px] uppercase tracking-widest text-gray-500">{c.label}</span>
          </motion.div>
        ))}
      </div>

      {/* ── EVENTS LABEL ── */}
      <div className="flex items-center gap-3">
        <div className="text-[10px] font-mono font-bold tracking-[0.3em] uppercase text-gray-400">EVENTS</div>
        <div className="flex-1 h-px bg-system-border" />
      </div>

      {/* ── EVENT BANNER CAROUSEL ── */}
      {banners.length > 0 && (
        <div className="relative w-full rounded-2xl overflow-hidden" style={{ minHeight: 200 }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={banners[bannerIdx % banners.length]?.id}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.35 }}
              className="relative w-full"
              style={{ minHeight: 200 }}
            >
              <img
                src={banners[bannerIdx % banners.length]?.image_url}
                alt={banners[bannerIdx % banners.length]?.title}
                className="w-full h-full object-cover rounded-2xl"
                style={{ minHeight: 200, maxHeight: 220 }}
              />
              <div className="absolute inset-0 rounded-2xl" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)' }} />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h3 className="text-base font-black text-white uppercase tracking-tight font-mono drop-shadow-lg">
                  {banners[bannerIdx % banners.length]?.title}
                </h3>
                {banners[bannerIdx % banners.length]?.subtitle && (
                  <p className="text-[11px] text-gray-300 font-mono mt-0.5 drop-shadow">
                    {banners[bannerIdx % banners.length]?.subtitle}
                  </p>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Carousel nav arrows */}
          {banners.length > 1 && (
            <>
              <button
                onClick={() => { setBannerIdx(p => (p - 1 + banners.length) % banners.length); resetBannerTimer(); }}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white transition-colors z-10"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => { setBannerIdx(p => (p + 1) % banners.length); resetBannerTimer(); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white transition-colors z-10"
              >
                <ChevronRight size={16} />
              </button>
            </>
          )}

          {/* Dots indicator */}
          {banners.length > 1 && (
            <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
              {banners.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setBannerIdx(i); resetBannerTimer(); }}
                  className={`rounded-full transition-all ${i === bannerIdx % banners.length ? 'w-5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/40'}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── DUNGEON TOWER BANNER ── */}
      {onStartDungeon && (
        <motion.div
          ref={dungeonRef}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative w-full rounded-2xl overflow-hidden"
          style={{
            minHeight: 200,
            transition: 'box-shadow 0.3s ease',
            boxShadow: dungeonHighlightActive
              ? '0 0 0 3px #ef4444, 0 0 32px rgba(239,68,68,0.6), 0 0 64px rgba(239,68,68,0.25)'
              : 'none',
          }}
        >
          {dungeonHighlightActive && (
            <motion.div
              className="absolute inset-0 z-10 rounded-2xl pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.18, 0, 0.14, 0] }}
              transition={{ duration: 2.8, ease: 'easeInOut' }}
              style={{ background: 'radial-gradient(ellipse at center, rgba(239,68,68,0.5) 0%, transparent 70%)' }}
            />
          )}
          <img
            src={DUNGEON_BANNER}
            alt="Dungeon Tower"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: 'center 30%' }}
          />
          <div className="absolute inset-0 bg-black/30" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.35) 50%, rgba(0,0,0,0.15) 100%)' }} />

          {/* Reset timer */}
          <div className="absolute top-0 left-0 right-0 flex justify-center pt-3">
            <div
              className="flex items-center gap-2 px-3 py-1 rounded-full font-mono text-xs font-bold"
              style={{ background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)' }}
            >
              <Timer size={11} className="text-yellow-400" />
              <span className="text-gray-300 tracking-widest uppercase text-[10px]">Resets in</span>
              <span className="text-yellow-300">{isFreeReady ? '00:00:00' : formatTime(timeUntilFree)}</span>
            </div>
          </div>

          {/* Buttons */}
          <div className="absolute bottom-0 left-0 right-0 p-3 flex gap-2">
            <button
              onClick={() => onStartDungeon(true)}
              disabled={!isFreeReady}
              className="flex-1 py-2.5 rounded-xl font-mono font-black text-xs uppercase tracking-widest transition-all"
              style={isFreeReady
                ? { background: 'linear-gradient(135deg,#dc2626,#991b1b)', color: '#fff', boxShadow: '0 4px 20px rgba(220,38,38,0.5)', border: '1px solid rgba(220,38,38,0.5)' }
                : { background: 'rgba(30,30,30,0.8)', color: '#6b7280', border: '1px solid rgba(100,100,100,0.3)', cursor: 'not-allowed' }
              }
            >
              {isFreeReady ? 'ENTER' : 'LOCKED'}
            </button>

            <button
              onClick={() => onStartDungeon(false)}
              disabled={!canAffordPaid}
              className="py-2.5 px-4 rounded-xl font-mono font-black text-xs uppercase tracking-widest transition-all flex items-center gap-1.5 justify-center whitespace-nowrap"
              style={canAffordPaid
                ? { background: 'linear-gradient(135deg,rgba(139,92,246,0.3),rgba(109,40,217,0.5))', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.5)', boxShadow: '0 4px 20px rgba(139,92,246,0.3)' }
                : { background: 'rgba(30,30,30,0.8)', color: '#4b5563', border: '1px solid rgba(100,100,100,0.3)', cursor: 'not-allowed' }
              }
            >
              <Key size={12} />
              3 KEYS
            </button>
          </div>
        </motion.div>
      )}

      {/* ── LOGIN REWARDS BANNER ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="relative w-full rounded-2xl overflow-hidden transition-all"
        style={{ background: 'linear-gradient(135deg, #0a0a1a 0%, #0d0d25 50%, #0a0a1a 100%)', border: '1px solid rgba(139,92,246,0.2)' }}
      >
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(139,92,246,0.12) 0%, transparent 65%)' }} />
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.5), rgba(0,210,255,0.5), transparent)' }} />

        <div className="relative p-4">
          {/* Header - clickable to open calendar */}
          <div 
            className="flex items-center justify-between mb-3 cursor-pointer"
            onClick={() => onOpenDailyCalendar?.()}
          >
            <div>
              <div className="text-[9px] font-mono font-bold tracking-[0.3em] uppercase text-purple-400 mb-0.5">DAILY LOGIN</div>
              <h3 className="text-sm font-black text-white font-mono uppercase tracking-wide">Streak Rewards</h3>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-xs font-bold"
              style={{ background: claimedToday ? 'rgba(34,197,94,0.1)' : 'rgba(139,92,246,0.15)', border: claimedToday ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(139,92,246,0.3)', color: claimedToday ? '#4ade80' : '#c4b5fd' }}
            >
              {claimedToday ? <><CheckCircle2 size={11} /> Claimed</> : <><span className="text-[10px]">Day</span> {streak || 1}</>}
            </div>
          </div>

          {/* Toast message */}
          <AnimatePresence>
            {loginToast && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mb-2 px-3 py-2 rounded-lg text-center text-[10px] font-mono font-bold"
                style={{
                  background: 'rgba(139,92,246,0.15)',
                  border: '1px solid rgba(139,92,246,0.3)',
                  color: '#c4b5fd',
                }}
              >
                {loginToast}
              </motion.div>
            )}
          </AnimatePresence>

          {/* 7-day reward track */}
          <div className="flex gap-2 justify-between">
            {LOGIN_REWARDS.map((reward) => {
              const dayNum   = reward.day;
              const isCurrent = dayNum === currentStreakDay;
              const isClaimed = claimedToday ? dayNum <= currentStreakDay : dayNum < currentStreakDay;
              const isFuture  = dayNum > currentStreakDay;
              const rStyle    = RARITY_STYLES[reward.rarity];

              return (
                <div
                  key={dayNum}
                  onClick={(e) => { e.stopPropagation(); handleDayClick(dayNum); }}
                  className="flex flex-col items-center gap-1.5 rounded-xl p-2 relative flex-1 min-w-0 cursor-pointer"
                  style={{
                    background: isClaimed
                      ? 'rgba(34,197,94,0.08)'
                      : isCurrent
                      ? `rgba(139,92,246,0.2)`
                      : 'rgba(0,0,0,0.3)',
                    border: isCurrent
                      ? '1px solid rgba(139,92,246,0.5)'
                      : isClaimed
                      ? '1px solid rgba(34,197,94,0.2)'
                      : '1px solid rgba(255,255,255,0.05)',
                    boxShadow: isCurrent ? '0 0 12px rgba(139,92,246,0.25)' : 'none',
                  }}
                >
                  {isCurrent && (
                    <motion.div
                      animate={{ opacity: [0.4, 0.8, 0.4] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute inset-0 rounded-xl"
                      style={{ background: 'rgba(139,92,246,0.15)' }}
                    />
                  )}

                  <div className="relative text-lg">
                    {isClaimed ? (
                      <div className="opacity-50">{reward.emoji}</div>
                    ) : isFuture ? (
                      <Lock size={16} className="text-gray-600" />
                    ) : (
                      <div>{reward.emoji}</div>
                    )}
                    {isClaimed && (
                      <div className="absolute -top-1 -right-1">
                        <CheckCircle2 size={10} className="text-green-400" />
                      </div>
                    )}
                  </div>

                  <div className="font-mono text-[9px] font-bold text-center leading-tight truncate w-full"
                    style={{ color: isClaimed ? '#4ade80' : isCurrent ? rStyle.text : '#6b7280' }}
                  >
                    {reward.label}
                  </div>
                </div>
              );
            })}
          </div>

          <div 
            className="mt-3 text-center text-[10px] font-mono cursor-pointer"
            style={{ color: claimedToday ? 'rgba(74,222,128,0.6)' : 'rgba(167,139,250,0.6)' }}
            onClick={() => onOpenDailyCalendar?.()}
          >
            {claimedToday ? 'Claimed today · Tap to view calendar' : 'Click to view full 30-day calendar →'}
          </div>
        </div>
      </motion.div>

      {/* ── MONARCH'S WARDROBE (moved from home page) ── */}
      {wardrobeOnEquip && (
        <Suspense fallback={<div className="h-[400px] rounded-2xl bg-[#0A0A0F] animate-pulse" />}>
          <ErrorBoundary fallbackLabel="Wardrobe preview failed">
            <WardrobePreviewCard
              gold={wardrobeGold ?? gold}
              unlockedOutfits={wardrobeUnlockedOutfits || ['outfit_starter']}
              equippedOutfitId={wardrobeEquippedOutfitId || 'outfit_starter'}
              outfits={wardrobeOutfits}
              onPurchase={wardrobeOnPurchase}
              onEquip={wardrobeOnEquip}
              onOpenWardrobe={() => {}}
            />
          </ErrorBoundary>
        </Suspense>
      )}

      {/* ── ITEMS LABEL ── */}
      <div className="flex items-center gap-3">
        <div className="text-[10px] font-mono font-bold tracking-[0.3em] uppercase text-gray-400">ITEMS</div>
        <div className="flex-1 h-px bg-system-border" />
      </div>

      {/* ── CONSUMABLE BUY CARDS ── */}
      <div className="space-y-3">
        {CONSUMABLE_ITEMS.map((item, idx) => {
          const rarity    = RARITY_STYLES[item.rarity];
          const owned     = consumables[item.ownedKey];
          const canAfford = item.costGold > 0 ? gold >= item.costGold : keys >= item.costKeys;
          const isBuying  = buyingItem === item.type;

          return (
            <motion.div
              key={item.type}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06 }}
              className="flex items-center gap-4 p-4 rounded-xl relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg,rgba(0,0,0,0.6),rgba(15,15,25,0.9))', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l-xl" style={{ background: item.accentColor, opacity: 0.7 }} />

              <div className="flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center text-3xl"
                style={{ background: `${item.accentColor}15`, border: `1px solid ${item.accentColor}30` }}
              >
                {item.emoji}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="font-bold text-white font-mono text-sm">{item.name}</span>
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase tracking-wider"
                    style={{ background: rarity.bg, color: rarity.text, border: `1px solid ${rarity.border}` }}
                  >
                    {rarity.label}
                  </span>
                </div>
                <div className="text-[11px] text-gray-500 leading-tight mb-1">{item.desc}</div>
                <div className="text-[10px] font-mono" style={{ color: item.accentColor, opacity: 0.8 }}>
                  Owned: <span className="font-bold">{owned}</span>
                </div>
              </div>

              <div className="flex-shrink-0 flex flex-col items-end gap-2">
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg font-mono text-xs font-bold"
                  style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  {item.costGold > 0 ? (
                    <>
                      <Coins size={11} className="text-yellow-400" />
                      <span className="text-yellow-300">{item.costGold}</span>
                    </>
                  ) : (
                    <>
                      <Key size={11} className="text-purple-400" />
                      <span className="text-purple-300">{item.costKeys}</span>
                    </>
                  )}
                </div>

                <motion.button
                  onClick={() => handleBuy(item.type)}
                  disabled={!canAfford || !buyConsumable}
                  whileTap={{ scale: canAfford ? 0.93 : 1 }}
                  animate={isBuying ? { scale: [1, 1.15, 1] } : {}}
                  className="px-4 py-1.5 rounded-lg font-mono font-black text-[11px] uppercase tracking-widest transition-all"
                  style={canAfford
                    ? { background: item.accentColor, color: '#000', boxShadow: `0 0 12px ${item.accentColor}50`, opacity: 1 }
                    : { background: 'rgba(40,40,50,0.8)', color: '#4b5563', border: '1px solid rgba(100,100,100,0.2)', cursor: 'not-allowed', opacity: 0.6 }
                  }
                >
                  {isBuying ? '✓' : 'BUY'}
                </motion.button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ── REGISTERED SHOP ITEMS ── */}
      {items.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="text-[10px] font-mono font-bold tracking-[0.3em] uppercase text-gray-400">REWARDS</div>
            <div className="flex-1 h-px bg-system-border" />
          </div>
          {items.slice(0, 3).map(item => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-4 p-4 rounded-xl"
              style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.12)' }}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}
              >
                ⭐
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-white font-mono text-sm">{item.title}</div>
                {item.description && <div className="text-[11px] text-gray-500 mt-0.5">{item.description}</div>}
              </div>
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg font-mono text-xs font-bold"
                  style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <Coins size={11} className="text-yellow-400" />
                  <span className="text-yellow-300">{item.cost}</span>
                </div>
                <button
                  onClick={() => purchaseItem(item)}
                  disabled={gold < item.cost}
                  className="px-4 py-1.5 rounded-lg font-mono font-black text-[11px] uppercase tracking-widest transition-all"
                  style={gold >= item.cost
                    ? { background: '#eab308', color: '#000', boxShadow: '0 0 12px rgba(234,179,8,0.4)' }
                    : { background: 'rgba(40,40,50,0.8)', color: '#4b5563', border: '1px solid rgba(100,100,100,0.2)', cursor: 'not-allowed', opacity: 0.6 }
                  }
                >
                  BUY
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ShopView;
