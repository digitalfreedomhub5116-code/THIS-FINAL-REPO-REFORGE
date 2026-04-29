
import React, { useState, useEffect, useRef, lazy, Suspense, useCallback, type CSSProperties } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, Timer, Key, CheckCircle2, Lock, ChevronLeft, ChevronRight, Heart, Star, Zap, Ghost, Hexagon, ShoppingBag, Shirt, CircleDot, Palette, Frame, Clock, ImageIcon, Flame } from 'lucide-react';
import Lottie from 'lottie-react';
import { REWARD_SCHEDULE, DAILY_REWARDS_ENABLED } from '../lib/rewards';
import { ShopItem, Outfit } from '../types';
import { API_BASE } from '../lib/apiConfig';
import ErrorBoundary from './ErrorBoundary';
import { PROFILE_BORDERS, getBorderConfig } from '../utils/gameData';
import AnimatedBorder from './AnimatedBorder';
import OnboardingNotice from './OnboardingNotice';
import { SystemCoin } from './icons/SystemCoin';
import { getItemsByCategory, getTodaysDeals, type StoreItem as KitStoreItem, ALL_STORE_ITEMS } from '../utils/storeItems';
import { getEconomy, purchaseItem as kitPurchaseItem, equipItem as kitEquipItem, applyThemeVars, DEV_UNLOCK_ALL, type EquippedItems } from '../utils/storeEconomy';
import { LynxCoin, BorderRing, ThemeSwatch } from './StoreComponents';

const WardrobePreviewCard = lazy(() => import('./WardrobePreviewCard'));
const BadgesSection = lazy(() => import('./BadgesSection'));

interface EventBanner {
  id: number;
  title: string;
  subtitle: string | null;
  image_url: string;
  link_url: string | null;
  display_order: number;
}

interface Consumables {
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
  // Badge system props
  outfitStones?: Record<string, number>;
  // Chest inventory
  chests?: { legendary: number };
  onOpenChest?: () => void;
  // Border system
  ownedBorders?: string[];
  equippedBorder?: string | null;
  playerLevel?: number;
  onPurchaseBorder?: (borderId: string, cost: number) => void;
  onEquipBorder?: (borderId: string | null) => void;
}

const DUNGEON_BANNER = 'https://i.postimg.cc/zDwVQ9bN/Image-202602141625-tlkmvf.jpg';

const RARITY_STYLES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  COMMON:    { label: 'COMMON',    bg: 'rgba(107,114,128,0.2)', text: '#9ca3af', border: 'rgba(107,114,128,0.3)' },
  RARE:      { label: 'RARE',      bg: 'rgba(126,184,212,0.12)',  text: '#7EB8D4', border: 'rgba(126,184,212,0.25)' },
  LEGENDARY: { label: 'LEGENDARY', bg: 'rgba(234,179,8,0.12)',  text: '#eab308', border: 'rgba(234,179,8,0.3)' },
};

const CONSUMABLE_ITEMS: any[] = [];

// Build 7-day login preview from the real REWARD_SCHEDULE so store stays synced with the popup
const REWARD_EMOJI: Record<string, string> = {
  GOLD: '🪙', XP: '⚡', KEYS: '🗝️', WELCOME_KEYS: '🗝️', DUNGEON_PASS: '👻',
  CHEST_LEGENDARY: '📦', VENUS_SHARDS: '🩶', NONE: '—',
};
const REWARD_RARITY: Record<string, string> = {
  GOLD: 'COMMON', XP: 'COMMON', KEYS: 'RARE', WELCOME_KEYS: 'RARE', DUNGEON_PASS: 'RARE',
  CHEST_LEGENDARY: 'LEGENDARY', VENUS_SHARDS: 'RARE', NONE: 'COMMON',
};
const REWARD_SHORT: Record<string, (a: number) => string> = {
  GOLD: a => `${a} G`, XP: a => `${a} XP`, KEYS: a => a === 1 ? 'Key' : `${a} Keys`,
  WELCOME_KEYS: a => `${a} Keys`, DUNGEON_PASS: a => `${a} Pass`,
  CHEST_LEGENDARY: () => 'Chest', VENUS_SHARDS: a => `${a} Shards`, NONE: () => '—',
};

const ShopView: React.FC<ShopViewProps> = ({
  gold,
  items,
  purchaseItem,
  keys = 0,
  lastDungeonEntry = 0,
  onStartDungeon,
  consumables = { },
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
  outfitStones = {},
  chests,
  onOpenChest,
  ownedBorders = ['border_default'],
  equippedBorder = null,
  playerLevel = 1,
  onPurchaseBorder,
  onEquipBorder,
}) => {
  const [storeTab, setStoreTab] = useState<'OUTFITS' | 'BADGES' | 'BORDERS' | 'DEALS' | 'THEMES' | 'BANNERS_SHOP'>('OUTFITS');
  const [kitEconomy, setKitEconomy] = useState(getEconomy());
  const [dealTimer, setDealTimer] = useState('');
  const [kitInfoItem, setKitInfoItem] = useState<KitStoreItem | null>(null);
  const [kitPurchasedId, setKitPurchasedId] = useState<string | null>(null);
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

  const todayStr = new Date().toISOString().split('T')[0];
  const claimedToday = lastLoginDate === todayStr;
  // Use schedule length for cycle so it works with any schedule size
  const scheduleLen = REWARD_SCHEDULE.length;
  const currentCycleDay30 = Math.max(1, ((streak - 1) % scheduleLen) + 1);
  // For the preview, show a sliding window starting from the current position
  const previewStartIdx = Math.max(0, currentCycleDay30 - 1); // 0-indexed
  const previewDays = Array.from({ length: scheduleLen }, (_, i) => {
    const idx = (previewStartIdx + i) % scheduleLen;
    const r = REWARD_SCHEDULE[idx];
    if (!r) return { day: i + 1, actualCycleDay: idx + 1, emoji: '🎁', label: '?', rarity: 'COMMON' };
    return { day: i + 1, actualCycleDay: idx + 1, emoji: REWARD_EMOJI[r.type] || '🎁', label: (REWARD_SHORT[r.type] || (() => '?'))(r.amount), rarity: REWARD_RARITY[r.type] || 'COMMON' };
  });
  const currentStreakDay = 1; // The first item in the sliding window is always "today"
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

  // Deal timer for the DEALS tab
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const next = new Date(now);
      next.setHours(next.getHours() + 8 - (next.getHours() % 8), 0, 0, 0);
      const diff = next.getTime() - now.getTime();
      setDealTimer(`${Math.floor(diff / 3600000)}h ${String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0')}m ${String(Math.floor((diff % 60000) / 1000)).padStart(2, '0')}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const handleKitEquip = (slot: keyof EquippedItems, itemId: string) => {
    const newId = kitEconomy.equipped[slot] === itemId ? null : itemId;
    const newEco = kitEquipItem(slot, newId);
    setKitEconomy(newEco);
    if (slot === 'theme') {
      const themeItem = newId ? ALL_STORE_ITEMS.find(i => i.id === newId) : null;
      applyThemeVars(themeItem?.themeVars || null);
    }
  };

  return (
    <div id="tut-store" className="space-y-5 md:space-y-6 pb-10">
      <OnboardingNotice page="STORE" />

      {/* ── 2-TAB NAVIGATION ── */}
      <div className="flex gap-1 p-1 rounded-xl overflow-x-auto" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {([
          { id: 'OUTFITS' as const, label: 'Outfits', icon: <Shirt size={13} /> },
          { id: 'BADGES' as const, label: 'Badges', icon: <Hexagon size={13} /> },
          { id: 'BORDERS' as const, label: 'Borders', icon: <CircleDot size={13} /> },
          { id: 'DEALS' as const, label: 'Deals', icon: <Clock size={13} /> },
          { id: 'THEMES' as const, label: 'Themes', icon: <Palette size={13} /> },
          { id: 'BANNERS_SHOP' as const, label: 'Banners', icon: <ImageIcon size={13} /> },
        ]).map(tab => (
          <motion.button
            key={tab.id}
            onClick={() => setStoreTab(tab.id)}
            whileTap={{ scale: 0.97 }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg font-mono font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap"
            style={storeTab === tab.id
              ? { background: 'rgba(126,184,212,0.15)', border: '1px solid rgba(126,184,212,0.3)', color: '#c4b5fd', boxShadow: '0 0 12px rgba(126,184,212,0.15)', minWidth: 'fit-content' }
              : { background: 'transparent', border: '1px solid transparent', color: '#6b7280', minWidth: 'fit-content' }
            }
          >
            {tab.icon}
            {tab.label}
          </motion.button>
        ))}
      </div>

      {/* ── TAB: OUTFITS ── */}
      {storeTab === 'OUTFITS' && (
        <motion.div
          key="outfits-tab"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-5"
        >
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
                    ? { background: 'linear-gradient(135deg,rgba(126,184,212,0.3),rgba(109,40,217,0.5))', color: '#c4b5fd', border: '1px solid rgba(126,184,212,0.5)', boxShadow: '0 4px 20px rgba(126,184,212,0.3)' }
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
          {false && <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="relative w-full rounded-2xl overflow-hidden transition-all"
            style={{ background: 'linear-gradient(135deg, #0a0a1a 0%, #0d0d25 50%, #0a0a1a 100%)', border: '1px solid rgba(126,184,212,0.2)' }}
          >
            {/* Background glow */}
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(126,184,212,0.12) 0%, transparent 65%)' }} />
            <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(126,184,212,0.5), rgba(126,184,212,0.5), transparent)' }} />

            <div className="relative p-4">
              {/* Header - clickable to open calendar */}
              <div 
                className="flex items-center justify-between mb-3 cursor-pointer"
                onClick={() => onOpenDailyCalendar?.()}
              >
                <div>
                  <div className="text-[9px] font-mono font-bold tracking-[0.3em] uppercase text-[#7EB8D4] mb-0.5">DAILY LOGIN</div>
                  <h3 className="text-sm font-black text-white font-mono uppercase tracking-wide">Streak Rewards</h3>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-xs font-bold"
                  style={{ background: claimedToday ? 'rgba(34,197,94,0.1)' : 'rgba(126,184,212,0.15)', border: claimedToday ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(126,184,212,0.3)', color: claimedToday ? '#4ade80' : '#c4b5fd' }}
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
                      background: 'rgba(126,184,212,0.15)',
                      border: '1px solid rgba(126,184,212,0.3)',
                      color: '#c4b5fd',
                    }}
                  >
                    {loginToast}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 7-day reward track */}
              <div className="flex gap-2 justify-between">
                {previewDays.map((reward) => {
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
                          ? `rgba(126,184,212,0.2)`
                          : 'rgba(0,0,0,0.3)',
                        border: isCurrent
                          ? '1px solid rgba(126,184,212,0.5)'
                          : isClaimed
                          ? '1px solid rgba(34,197,94,0.2)'
                          : '1px solid rgba(255,255,255,0.05)',
                        boxShadow: isCurrent ? '0 0 12px rgba(126,184,212,0.25)' : 'none',
                      }}
                    >
                      {isCurrent && (
                        <motion.div
                          animate={{ opacity: [0.4, 0.8, 0.4] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="absolute inset-0 rounded-xl"
                          style={{ background: 'rgba(126,184,212,0.15)' }}
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
          </motion.div>}

          {/* ── MONARCH'S WARDROBE (moved from home page) ── */}
          {wardrobeOnEquip && (
            <Suspense fallback={<div className="h-[400px] rounded-2xl bg-[#0A0A0F] animate-pulse" />}>
              <ErrorBoundary fallbackLabel="Wardrobe preview failed">
                <WardrobePreviewCard
                  gold={wardrobeGold ?? gold}
                  keys={keys}
                  unlockedOutfits={wardrobeUnlockedOutfits || ['outfit_starter']}
                  equippedOutfitId={wardrobeEquippedOutfitId || 'outfit_starter'}
                  outfits={wardrobeOutfits}
                  onPurchase={wardrobeOnPurchase}
                  onEquip={wardrobeOnEquip}
                  onOpenWardrobe={() => {}}
                  outfitStones={outfitStones}
                />
              </ErrorBoundary>
            </Suspense>
          )}
        </motion.div>
      )}

      {/* ── TAB: BADGES ── */}
      {storeTab === 'BADGES' && (
        <motion.div
          key="badges-tab"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Suspense fallback={<div className="h-[300px] rounded-2xl bg-[#0A0A0F] animate-pulse" />}>
            <BadgesSection
              outfitStones={outfitStones}
              unlockedOutfits={wardrobeUnlockedOutfits || ['outfit_starter']}
              equippedOutfitId={wardrobeEquippedOutfitId || 'outfit_starter'}
              outfits={wardrobeOutfits}
            />
          </Suspense>
        </motion.div>
      )}

      {/* ── TAB: BORDERS ── */}
      {storeTab === 'BORDERS' && (
        <motion.div
          key="borders-tab"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          {/* Section header */}
          <div className="flex items-center gap-3">
            <div className="text-[10px] font-mono font-bold tracking-[0.3em] uppercase text-gray-400">ANIMATED BORDERS</div>
            <div className="flex-1 h-px bg-system-border" />
          </div>

          {/* Currently equipped */}
          <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(126,184,212,0.06)', border: '1px solid rgba(126,184,212,0.15)' }}>
            <div className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">Equipped:</div>
            <div className="text-xs font-mono font-bold" style={{ color: getBorderConfig(equippedBorder).accentColor }}>
              {getBorderConfig(equippedBorder).name}
            </div>
            {equippedBorder && equippedBorder !== 'border_default' && (
              <button
                onClick={() => onEquipBorder?.(null)}
                className="ml-auto text-[9px] font-mono font-bold px-2 py-1 rounded-lg uppercase tracking-wider"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af' }}
              >
                Unequip
              </button>
            )}
          </div>

          {/* Border cards grid */}
          <div className="space-y-3">
            {PROFILE_BORDERS.map(border => {
              const isOwned = ownedBorders.includes(border.id);
              const isEquipped = equippedBorder === border.id;
              const canAfford = gold >= border.cost;
              const meetsLevel = playerLevel >= border.levelRequired;
              const isLocked = !isOwned && (!canAfford || !meetsLevel);

              const TIER_COLORS: Record<string, string> = {
                F: '#6b7280', E: '#f97316', D: '#4ade80', C: '#3b82f6',
                B: '#7c3aed', A: '#fbbf24', S: '#e879f9',
              };

              return (
                <motion.div
                  key={border.id}
                  whileTap={{ scale: 0.98 }}
                  className="relative rounded-2xl overflow-hidden"
                  style={{
                    background: isEquipped
                      ? `linear-gradient(135deg, rgba(${border.accentColor === '#3f3f46' ? '63,63,70' : border.accentColor === '#f97316' ? '249,115,22' : border.accentColor === '#4ade80' ? '74,222,128' : border.accentColor === '#3b82f6' ? '59,130,246' : border.accentColor === '#7c3aed' ? '124,58,237' : border.accentColor === '#fbbf24' ? '251,191,36' : '232,121,249'},0.08) 0%, rgba(0,0,0,0.4) 100%)`
                      : 'rgba(0,0,0,0.3)',
                    border: isEquipped
                      ? `1px solid ${border.accentColor}40`
                      : '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <div className="flex gap-3 p-3">
                    {/* Preview square — shows the border animation on a small dark box */}
                    <AnimatedBorder
                      borderId={border.id}
                      className="flex-shrink-0 rounded-xl"
                      style={{ width: 72, height: 72 }}
                    >
                      <div className="w-full h-full rounded-xl flex items-center justify-center" style={{ background: '#0a0a12' }}>
                        <div
                          className="text-2xl font-black font-mono"
                          style={{ color: border.accentColor, textShadow: `0 0 12px ${border.accentGlow}` }}
                        >
                          {border.tier}
                        </div>
                      </div>
                    </AnimatedBorder>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <div className="text-sm font-black font-mono text-white truncate">{border.name}</div>
                        <div
                          className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded uppercase tracking-widest"
                          style={{ background: `${TIER_COLORS[border.tier]}15`, color: TIER_COLORS[border.tier], border: `1px solid ${TIER_COLORS[border.tier]}30` }}
                        >
                          {border.tier}-Tier
                        </div>
                      </div>
                      <div className="text-[10px] font-mono text-gray-500 leading-tight mb-2 line-clamp-2">{border.description}</div>

                      {/* Price or status */}
                      <div className="flex items-center gap-2">
                        {isEquipped ? (
                          <div className="flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider" style={{ color: border.accentColor }}>
                            <CheckCircle2 size={12} /> Equipped
                          </div>
                        ) : isOwned ? (
                          <button
                            onClick={() => onEquipBorder?.(border.id)}
                            className="px-3 py-1.5 rounded-lg text-[10px] font-mono font-black uppercase tracking-widest transition-all"
                            style={{ background: `${border.accentColor}20`, border: `1px solid ${border.accentColor}40`, color: border.accentColor }}
                          >
                            Equip
                          </button>
                        ) : (
                          <>
                            {!meetsLevel ? (
                              <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-gray-500">
                                <Lock size={10} /> Lv.{border.levelRequired} Required
                              </div>
                            ) : (
                              <button
                                onClick={() => canAfford && onPurchaseBorder?.(border.id, border.cost)}
                                disabled={!canAfford}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-black uppercase tracking-widest transition-all"
                                style={canAfford
                                  ? { background: 'linear-gradient(135deg, rgba(234,179,8,0.15), rgba(234,179,8,0.05))', border: '1px solid rgba(234,179,8,0.3)', color: '#fbbf24', boxShadow: '0 0 12px rgba(234,179,8,0.1)' }
                                  : { background: 'rgba(30,30,30,0.6)', border: '1px solid rgba(100,100,100,0.2)', color: '#4b5563', cursor: 'not-allowed' }
                                }
                              >
                                <Coins size={11} /> {border.cost.toLocaleString()} G
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Info footer */}
          <div className="text-center text-[9px] font-mono text-gray-600 pt-2 pb-4">
            Borders are permanent · Visible on profile & leaderboard
          </div>
        </motion.div>
      )}

      {/* ── TAB: DEALS ── */}
      {storeTab === 'DEALS' && (
        <motion.div key="deals-tab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="flex items-center justify-center gap-2 py-2 rounded-xl" style={{ background: 'rgba(126,184,212,0.06)', border: '1px solid rgba(126,184,212,0.1)' }}>
            <Clock size={13} style={{ color: '#7EB8D4' }} />
            <span className="text-[11px] font-mono font-bold text-gray-400">Refreshes in <span style={{ color: '#7EB8D4' }}>{dealTimer || '...'}</span></span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {getTodaysDeals().map(d => (
              <KitGlowCard key={d.item.id} item={d.item} discount={d.discount}
                owned={DEV_UNLOCK_ALL || kitEconomy.owned.includes(d.item.id)}
                equipped={kitEconomy.equipped[d.item.category as keyof EquippedItems] === d.item.id}
                canAfford={DEV_UNLOCK_ALL || gold >= Math.round(d.item.price * (1 - d.discount / 100))}
                onBuy={() => { const p = kitPurchaseItem(d.item.id, Math.round(d.item.price * (1 - d.discount / 100))); if (p) { setKitEconomy(p); setKitPurchasedId(d.item.id); setTimeout(() => setKitPurchasedId(null), 1500); } }}
                onEquip={d.item.category !== 'consumable' ? () => handleKitEquip(d.item.category as keyof EquippedItems, d.item.id) : undefined}
                onInfo={() => setKitInfoItem(d.item)}
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* ── TAB: THEMES ── */}
      {storeTab === 'THEMES' && (
        <motion.div key="themes-tab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="text-[10px] font-mono font-bold tracking-[0.3em] uppercase text-gray-400">APP THEMES</div>
            <div className="flex-1 h-px bg-system-border" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {getItemsByCategory('theme').map(item => (
              <KitGlowCard key={item.id} item={item}
                owned={DEV_UNLOCK_ALL || kitEconomy.owned.includes(item.id)}
                equipped={kitEconomy.equipped.theme === item.id}
                canAfford={DEV_UNLOCK_ALL || gold >= item.price}
                onBuy={() => { const p = kitPurchaseItem(item.id, item.price); if (p) { setKitEconomy(p); } }}
                onEquip={() => handleKitEquip('theme', item.id)}
                onInfo={() => setKitInfoItem(item)}
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* ── TAB: BANNERS_SHOP ── */}
      {storeTab === 'BANNERS_SHOP' && (
        <motion.div key="banners-shop-tab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="text-[10px] font-mono font-bold tracking-[0.3em] uppercase text-gray-400">PROFILE BANNERS</div>
            <div className="flex-1 h-px bg-system-border" />
          </div>
          <div className="space-y-4">
            {getItemsByCategory('banner').map(item => {
              const isEquipped = kitEconomy.equipped.banner === item.id;
              return (
                <div key={item.id} className="relative rounded-2xl overflow-hidden" style={{ border: isEquipped ? '2px solid rgba(126,184,212,0.4)' : '1px solid rgba(255,255,255,0.06)' }}>
                  {item.bannerImage && (
                    <img src={item.bannerImage} alt={item.name} style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }} />
                  )}
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%', background: 'linear-gradient(transparent, rgba(0,0,0,0.85))', pointerEvents: 'none' }} />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div className="text-sm font-black text-white">{item.name}</div>
                      {item.price > 0 && <div className="text-[11px] text-gray-400 font-mono mt-0.5">{item.price} G</div>}
                    </div>
                    <button
                      onClick={() => handleKitEquip('banner', item.id)}
                      className="px-5 py-2 rounded-xl font-mono font-black text-[11px] uppercase tracking-wider transition-all"
                      style={{
                        background: isEquipped ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #7EB8D4, #5a9ab5)',
                        color: isEquipped ? 'rgba(255,255,255,0.5)' : '#fff',
                        border: 'none', cursor: 'pointer',
                      }}
                    >
                      {isEquipped ? '✓ EQUIPPED' : 'EQUIP'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ── THEME PREVIEW MODAL ── */}
      {kitInfoItem && kitInfoItem.category === 'theme' && (
        <KitThemePreviewModal item={kitInfoItem} onClose={() => setKitInfoItem(null)} />
      )}

      {/* ── BORDER PREVIEW MODAL ── */}
      {kitInfoItem && kitInfoItem.category === 'border' && (
        <KitBorderPreviewModal item={kitInfoItem} onClose={() => setKitInfoItem(null)} />
      )}
    </div>
  );
};

export default ShopView;


/* ═══════════════════════════════════
   KitGlowCard — Premium card for kit items
   ═══════════════════════════════════ */
const KIT_CAT_COLORS: Record<string, string> = {
  border: '#705820', theme: '#8B5CF6', deals: '#8d702d', banner: '#06B6D4', consumable: '#22C55E', title: '#F59E0B',
};

function KitGlowCard({ item, discount, owned, equipped, canAfford, onBuy, onEquip, onInfo }: {
  item: KitStoreItem; discount?: number; owned?: boolean; equipped?: boolean;
  canAfford: boolean; onBuy: () => void; onEquip?: () => void; onInfo?: () => void;
}) {
  const catColor = KIT_CAT_COLORS[item.category] || '#7EB8D4';
  const finalPrice = discount ? Math.round(item.price * (1 - discount / 100)) : item.price;

  return (
    <div style={{
      borderRadius: 16, overflow: 'hidden', position: 'relative',
      background: `linear-gradient(160deg, ${catColor}22 0%, #111828 55%, #0d1118 100%)`,
      border: `1.5px solid ${catColor}40`,
      textAlign: 'center', padding: '16px 10px 14px',
      minHeight: 210, display: 'flex', flexDirection: 'column', alignItems: 'center',
    }}>
      {/* Discount badge */}
      {discount && (
        <div style={{
          position: 'absolute', top: 8, left: 8, zIndex: 3,
          padding: '3px 8px', borderRadius: 6,
          background: '#22C55E', fontSize: 9, fontWeight: 900, color: '#000',
        }}>
          -{discount}%
        </div>
      )}

      {/* Info icon */}
      {onInfo && (
        <div onClick={(e) => { e.stopPropagation(); onInfo(); }} style={{
          position: 'absolute', top: 8, right: 8, zIndex: 3,
          width: 22, height: 22, borderRadius: 6,
          background: `${catColor}30`, border: `1px solid ${catColor}50`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 900, color: catColor, cursor: 'pointer',
        }}>
          i
        </div>
      )}

      {/* Name */}
      <div style={{ position: 'relative', zIndex: 2, marginBottom: 10, marginTop: discount ? 18 : 0 }}>
        <div style={{ fontSize: 15, fontWeight: 900, color: '#fff', lineHeight: 1.2, marginBottom: 3 }}>
          {item.name}
        </div>
        <div style={{ fontSize: 11, fontWeight: 600, color: catColor, textTransform: 'capitalize', opacity: 0.9 }}>
          {item.tier} {item.category}
        </div>
      </div>

      {/* Preview */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 2, width: '100%', minHeight: 80 }}>
        {item.category === 'theme' && item.themeVars && (
          <div style={{ width: '90%' }}><ThemeSwatch themeVars={item.themeVars} /></div>
        )}
        {item.category === 'border' && item.borderConfig && (
          <BorderRing config={item.borderConfig} size={80} />
        )}
        {item.category === 'banner' && item.bannerImage && (
          <div style={{ width: '90%', aspectRatio: '16/9', borderRadius: 10, overflow: 'hidden', border: `1px solid ${catColor}30` }}>
            <img src={item.bannerImage} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        )}
      </div>

      {/* Price / Equip */}
      <div style={{ position: 'relative', zIndex: 2, marginTop: 10, width: '100%' }}>
        {owned ? (
          onEquip ? (
            <button onClick={onEquip} style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '8px 24px', border: 'none', cursor: 'pointer', borderRadius: 20,
              background: equipped ? `linear-gradient(135deg, ${catColor}, ${catColor}CC)` : 'rgba(255,255,255,0.08)',
              color: equipped ? '#000' : catColor, fontSize: 11, fontWeight: 800,
            }}>
              {equipped ? '✓ EQUIPPED' : 'EQUIP'}
            </button>
          ) : (
            <span style={{ fontSize: 11, fontWeight: 700, color: '#22C55E' }}>✓ Owned</span>
          )
        ) : (
          <button onClick={onBuy} disabled={!canAfford} style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '8px 22px', borderRadius: 20, cursor: canAfford ? 'pointer' : 'default',
            background: canAfford ? `linear-gradient(135deg, ${catColor}35, ${catColor}15)` : 'rgba(255,255,255,0.04)',
            border: canAfford ? `2px solid ${catColor}60` : '2px solid rgba(255,255,255,0.08)',
            color: canAfford ? '#fff' : 'rgba(255,255,255,0.35)', fontSize: 13, fontWeight: 800,
          }}>
            {discount && <span style={{ textDecoration: 'line-through', opacity: 0.35, fontSize: 10 }}>{item.price}</span>}
            {canAfford ? <LynxCoin size={15} /> : <Lock size={12} />}
            <span style={{ fontSize: 14 }}>{finalPrice}</span>
          </button>
        )}
      </div>
    </div>
  );
}


/* ═══════════════════════════════════
   KitThemePreviewModal
   ═══════════════════════════════════ */
function KitThemePreviewModal({ item, onClose }: { item: KitStoreItem; onClose: () => void }) {
  const tv = item.themeVars;
  if (!tv) return null;
  const primary = tv['--primary'] || '#C8A84E';
  const surface = tv['--surface'] || '#12141a';
  const bg = tv['--bg'] || '#0a0a0f';
  const border = tv['--border'] || 'rgba(200,168,78,0.08)';
  const mockCard: CSSProperties = { background: surface, borderRadius: 12, padding: '12px 14px', border: `1px solid ${border}` };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.92)', zIndex: 9999,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      overflow: 'auto', paddingTop: 40, paddingBottom: 60,
      animation: 'fadeIn 0.25s ease-out', backdropFilter: 'blur(12px)',
    }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '90%', maxWidth: 360 }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#fff' }}>{item.name}</div>
          <div style={{ fontSize: 12, color: primary, fontWeight: 700, opacity: 0.8, marginTop: 2 }}>{item.tier} Theme Preview</div>
        </div>

        {/* HOME mockup */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: primary, letterSpacing: 1.5, marginBottom: 8 }}>HOME</div>
          <div style={{ background: bg, borderRadius: 16, padding: 16, border: `1px solid ${border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', border: `3px solid ${primary}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 12px ${primary}40` }}>
                <span style={{ fontSize: 18, fontWeight: 900, color: '#fff' }}>82</span>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>Overall Score</div>
                <div style={{ fontSize: 10, color: primary, fontWeight: 600 }}>Top 15% — Above Average</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {['Jawline', 'Skin', 'Eyes'].map((label, i) => (
                <div key={label} style={mockCard}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: primary }}>{[78, 85, 90][i]}</div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: 700, marginTop: 2 }}>{label.toUpperCase()}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <button onClick={onClose} style={{
            padding: '10px 36px', borderRadius: 12,
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
            color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════
   KitBorderPreviewModal
   ═══════════════════════════════════ */
function KitBorderPreviewModal({ item, onClose }: { item: KitStoreItem; onClose: () => void }) {
  const glow = item.borderConfig?.glowColor || 'rgba(200,168,78,0.4)';
  const size = 220;

  return (
    <div onClick={onClose} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.92)', zIndex: 9999,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      animation: 'fadeIn 0.25s ease-out', backdropFilter: 'blur(12px)',
    }}>
      <div onClick={e => e.stopPropagation()} style={{ textAlign: 'center', maxWidth: 300, width: '80%' }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 4 }}>{item.name}</div>
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'capitalize', marginBottom: 24, color: item.borderConfig?.colors?.[0] || '#C8A84E', opacity: 0.8 }}>
          {item.tier} Border
        </div>

        <div style={{ position: 'relative', width: size, height: size, margin: '0 auto', overflow: 'visible' }}>
          <div style={{ position: 'absolute', top: '50%', left: '50%', width: size + 60, height: size + 60, borderRadius: '50%', background: `radial-gradient(circle, ${glow} 0%, transparent 70%)`, transform: 'translate(-50%, -50%)' }} />
          {item.borderConfig && <BorderRing config={item.borderConfig} size={size * 0.8} />}
        </div>

        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 28, maxWidth: 260, margin: '28px auto 0', lineHeight: 1.4 }}>
          {item.description}
        </div>

        <button onClick={onClose} style={{
          marginTop: 32, padding: '10px 36px', borderRadius: 12,
          background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
          color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
        }}>
          Close
        </button>
      </div>
    </div>
  );
}
