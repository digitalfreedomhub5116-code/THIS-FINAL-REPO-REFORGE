
import React, { useState, useEffect, useRef, lazy, Suspense, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, Timer, Key, CheckCircle2, Lock, ChevronLeft, ChevronRight, Heart, Star, Zap, Ghost, Hexagon, ShoppingBag, Shirt, CircleDot } from 'lucide-react';
import { REWARD_SCHEDULE, DAILY_REWARDS_ENABLED } from '../lib/rewards';
import { ShopItem, Outfit } from '../types';
import { API_BASE } from '../lib/apiConfig';
import ErrorBoundary from './ErrorBoundary';
import { PROFILE_BORDERS, getBorderConfig } from '../utils/gameData';
import AnimatedBorder from './AnimatedBorder';
import OnboardingNotice from './OnboardingNotice';
import { SystemCoin } from './icons/SystemCoin';

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
  const [storeTab, setStoreTab] = useState<'OUTFITS' | 'BADGES' | 'BORDERS'>('OUTFITS');
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

  return (
    <div id="tut-store" className="space-y-5 md:space-y-6 pb-10">
      <OnboardingNotice page="STORE" />

      {/* ── 2-TAB NAVIGATION ── */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {([
          { id: 'OUTFITS' as const, label: 'Outfits', icon: <Shirt size={13} /> },
          { id: 'BADGES' as const, label: 'Badges', icon: <Hexagon size={13} /> },
          { id: 'BORDERS' as const, label: 'Borders', icon: <CircleDot size={13} /> },
        ]).map(tab => (
          <motion.button
            key={tab.id}
            onClick={() => setStoreTab(tab.id)}
            whileTap={{ scale: 0.97 }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg font-mono font-black text-[10px] uppercase tracking-widest transition-all"
            style={storeTab === tab.id
              ? { background: 'rgba(126,184,212,0.15)', border: '1px solid rgba(126,184,212,0.3)', color: '#c4b5fd', boxShadow: '0 0 12px rgba(126,184,212,0.15)' }
              : { background: 'transparent', border: '1px solid transparent', color: '#6b7280' }
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
    </div>
  );
};

export default ShopView;

