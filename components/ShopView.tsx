
import React, { useState, useEffect, useRef, lazy, Suspense, useCallback, type CSSProperties } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, Timer, Key, CheckCircle2, Lock, ChevronLeft, ChevronRight, Heart, Star, Zap, Ghost, Hexagon, ShoppingBag, Shirt, CircleDot, Palette, Frame, Clock, ImageIcon, Flame, Shield, Wrench, Eye } from 'lucide-react';
import BorderEquipOverlay from './BorderEquipOverlay';
import Lottie from 'lottie-react';
import { REWARD_SCHEDULE, DAILY_REWARDS_ENABLED } from '../lib/rewards';
import { ShopItem, Outfit } from '../types';
import { API_BASE } from '../lib/apiConfig';
import ErrorBoundary from './ErrorBoundary';
import { PROFILE_BORDERS, getBorderConfig, OUTFITS } from '../utils/gameData';
import AnimatedBorder from './AnimatedBorder';
import OnboardingNotice from './OnboardingNotice';
import { SystemCoin } from './icons/SystemCoin';
import { getItemsByCategory, getTodaysDeals, getItemById, getRemoteStoreCache, type StoreItem as KitStoreItem, ALL_STORE_ITEMS, BORDERS_ELEMENTS, BORDERS_BEASTS, BORDERS_SHIELDS, BORDERS_EXCLUSIVE } from '../utils/storeItems';
import { getEconomy, purchaseItem as kitPurchaseItem, equipItem as kitEquipItem, applyThemeVars, DEV_UNLOCK_ALL, type EquippedItems } from '../utils/storeEconomy';
import { syncBorderToPlayers } from '../lib/borderSync';
import { LynxCoin, BorderRing, ThemeSwatch } from './StoreComponents';
import { Package } from 'lucide-react';
import AvatarWithBorder, { BorderVideo } from './AvatarWithBorder';

const WardrobePreviewCard = lazy(() => import('./WardrobePreviewCard'));
const BadgesSection = lazy(() => import('./BadgesSection'));
const OutfitPurchaseModal = lazy(() => import('./OutfitPurchaseModal'));

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
  onEquipBanner?: (bannerId: string | null) => void;
  initialStoreTab?: 'OUTFITS' | 'BADGES' | 'BORDERS' | 'DEALS' | 'THEMES' | 'BANNERS_SHOP';
  playerAvatarUrl?: string | null;
  /** Called after a server-confirmed purchase to update parent gold state */
  onGoldUpdate?: (newGold: number) => void;
  /** Watch ad to unlock a premium border */
  onWatchAdForBorder?: (borderId: string) => Promise<boolean>;
}



/** Skeleton-loaded image: shows shimmer then fades in */
function FadeImg({ src, alt, style, className, ...rest }: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [loaded, setLoaded] = React.useState(false);
  return (
    <>
      {!loaded && (
        <div
          style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(110deg, rgba(255,255,255,0.03) 30%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 70%)',
            backgroundSize: '200% 100%',
            animation: 'skel-shimmer 1.5s ease-in-out infinite',
          }}
        />
      )}
      <img
        src={src}
        alt={alt}
        className={className}
        style={{ ...style, opacity: loaded ? 1 : 0, transition: 'opacity 0.35s ease' }}
        onLoad={() => setLoaded(true)}
        {...rest}
      />
      <style>{`@keyframes skel-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    </>
  );
}

const RARITY_STYLES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  COMMON: { label: 'COMMON', bg: 'rgba(107,114,128,0.2)', text: '#9ca3af', border: 'rgba(107,114,128,0.3)' },
  RARE: { label: 'RARE', bg: 'rgba(0,212,255,0.12)', text: '#00d4ff', border: 'rgba(0,212,255,0.25)' },
  LEGENDARY: { label: 'LEGENDARY', bg: 'rgba(234,179,8,0.12)', text: '#eab308', border: 'rgba(234,179,8,0.3)' },
};

const CONSUMABLE_ITEMS: any[] = [];

// Build 7-day login preview from the real REWARD_SCHEDULE so store stays synced with the popup
const REWARD_EMOJI: Record<string, string> = {
  GOLD: '🪙', XP: '⚡', DUNGEON_PASS: '👻',
  CHEST_LEGENDARY: '📦', VENUS_SHARDS: '🩶', NONE: '—',
};
const REWARD_RARITY: Record<string, string> = {
  GOLD: 'COMMON', XP: 'COMMON', DUNGEON_PASS: 'RARE',
  CHEST_LEGENDARY: 'LEGENDARY', VENUS_SHARDS: 'RARE', NONE: 'COMMON',
};
const REWARD_SHORT: Record<string, (a: number) => string> = {
  GOLD: a => `${a} G`, XP: a => `${a} XP`,
  DUNGEON_PASS: a => `${a} Pass`,
  CHEST_LEGENDARY: () => 'Chest', VENUS_SHARDS: a => `${a} Shards`, NONE: () => '—',
};

// ── ITEMS TAB: Streak Shield & Repair ──
import { getPlayerAuthHeaders } from '../lib/playerApi';

const ItemsTab: React.FC<{ gold: number }> = ({ gold }) => {
  const [shieldCount, setShieldCount] = useState(0);
  const [streakBeforeBreak, setStreakBeforeBreak] = useState(0);
  const [brokenAt, setBrokenAt] = useState<string | null>(null);
  const [buying, setBuying] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState('');
  const [localGold, setLocalGold] = useState(gold);

  // Fetch current streak data
  useEffect(() => {
    setLocalGold(gold);
  }, [gold]);

  useEffect(() => {
    // Get streak data from the latest sync
    const fetchData = async () => {
      try {
        const userId = localStorage.getItem('reforge_userId') || '';
        if (!userId) return;
        const res = await fetch(`${API_BASE}/api/player/${userId}/sync`, {
          credentials: 'include',
          headers: { ...getPlayerAuthHeaders() },
        });
        if (res.ok) {
          const data = await res.json();
          setShieldCount(data.streakShields ?? 0);
          setStreakBeforeBreak(data.streakBeforeBreak ?? 0);
          setBrokenAt(data.streakBrokenAt || null);
        }
      } catch { /* offline */ }
    };
    fetchData();
  }, []);

  // Repair countdown
  useEffect(() => {
    if (!brokenAt) return;
    const tick = () => {
      const expires = new Date(brokenAt).getTime() + 48 * 60 * 60 * 1000;
      const diff = Math.max(0, expires - Date.now());
      if (diff <= 0) { setTimeLeft('Expired'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setTimeLeft(`${h}h ${m}m`);
    };
    tick();
    const iv = setInterval(tick, 60000);
    return () => clearInterval(iv);
  }, [brokenAt]);

  const handleBuyShield = async () => {
    setBuying('shield');
    try {
      const res = await fetch(`${API_BASE}/api/players/streak-shield`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getPlayerAuthHeaders() },
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok) {
        setShieldCount(data.newShieldCount);
        setLocalGold(data.newGold);
        window.dispatchEvent(new Event('reforge:sync-needed'));
      }
    } catch { /* offline */ }
    setBuying(null);
  };

  const handleRepair = async () => {
    setBuying('repair');
    try {
      const res = await fetch(`${API_BASE}/api/players/streak-repair`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getPlayerAuthHeaders() },
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok) {
        setLocalGold(data.newGold);
        setStreakBeforeBreak(0);
        setBrokenAt(null);
        window.dispatchEvent(new Event('reforge:sync-needed'));
      }
    } catch { /* offline */ }
    setBuying(null);
  };

  const repairCost = Math.min(300, 50 + streakBeforeBreak * 5);
  const canAffordShield = localGold >= 75;
  const canAffordRepair = localGold >= repairCost;
  const hasBreak = brokenAt && streakBeforeBreak > 1 && timeLeft !== 'Expired';

  return (
    <motion.div key="items-tab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="text-[10px] font-mono font-bold tracking-[0.3em] uppercase text-gray-400">STREAK ITEMS</div>
        <div className="flex-1 h-px bg-system-border" />
      </div>

      {/* Streak Shield Card */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.12)' }}>
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)' }}>
              <Shield size={24} className="text-[#00d4ff]" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-black text-white font-mono tracking-wider">STREAK SHIELD</div>
              <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                Protects your streak for 1 missed day. Auto-activates when you miss a login.
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded" style={{ background: 'rgba(0,212,255,0.1)', color: '#00d4ff' }}>
                  Owned: {shieldCount}/2
                </span>
                <span className="text-[9px] font-mono text-gray-600">Max 2 at a time</span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
            <div className="flex items-center gap-1.5">
              <div className="flex items-center" style={{ width: 20 }}><SystemCoin size={20} /></div>
              <span className="text-sm font-black text-[#00d4ff] font-mono">75</span>
            </div>
            <button
              onClick={handleBuyShield}
              disabled={!canAffordShield || shieldCount >= 2 || buying === 'shield'}
              className="px-5 py-2 rounded-xl text-[10px] font-black tracking-wider font-mono transition-all active:scale-95"
              style={{
                background: canAffordShield && shieldCount < 2
                  ? 'linear-gradient(135deg, #00d4ff, #5A9AB5)'
                  : 'rgba(255,255,255,0.06)',
                color: canAffordShield && shieldCount < 2 ? '#0a0a14' : 'rgba(255,255,255,0.3)',
                opacity: buying === 'shield' ? 0.5 : 1,
              }}
            >
              {buying === 'shield' ? 'BUYING...' : shieldCount >= 2 ? 'MAX OWNED' : !canAffordShield ? 'NOT ENOUGH GOLD' : 'BUY SHIELD'}
            </button>
          </div>
        </div>
      </div>

      {/* Streak Repair Card */}
      <div className="rounded-2xl overflow-hidden" style={{
        background: hasBreak ? 'rgba(249,115,22,0.04)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${hasBreak ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.06)'}`,
        opacity: hasBreak ? 1 : 0.5,
      }}>
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{
              background: hasBreak ? 'rgba(249,115,22,0.1)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${hasBreak ? 'rgba(249,115,22,0.2)' : 'rgba(255,255,255,0.08)'}`,
            }}>
              <Wrench size={24} className={hasBreak ? 'text-orange-400' : 'text-gray-600'} />
            </div>
            <div className="flex-1">
              <div className="text-sm font-black text-white font-mono tracking-wider">STREAK REPAIR</div>
              {hasBreak ? (
                <>
                  <p className="text-[10px] text-orange-400 font-mono mt-0.5">
                    Restore your streak to {streakBeforeBreak} days
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded" style={{ background: 'rgba(249,115,22,0.1)', color: '#F97316' }}>
                      ⏰ Expires: {timeLeft}
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-[10px] text-gray-600 font-mono mt-0.5">
                  Available when your streak breaks. Restores your previous streak count.
                </p>
              )}
            </div>
          </div>
          {hasBreak && (
            <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
              <div className="flex items-center gap-1.5">
                <div className="flex items-center" style={{ width: 20 }}><SystemCoin size={20} /></div>
                <span className="text-sm font-black text-orange-400 font-mono">{repairCost}</span>
              </div>
              <button
                onClick={handleRepair}
                disabled={!canAffordRepair || buying === 'repair'}
                className="px-5 py-2 rounded-xl text-[10px] font-black tracking-wider font-mono transition-all active:scale-95"
                style={{
                  background: canAffordRepair
                    ? 'linear-gradient(135deg, #F97316, #EA580C)'
                    : 'rgba(255,255,255,0.06)',
                  color: canAffordRepair ? '#0a0a14' : 'rgba(255,255,255,0.3)',
                  opacity: buying === 'repair' ? 0.5 : 1,
                }}
              >
                {buying === 'repair' ? 'REPAIRING...' : !canAffordRepair ? 'NOT ENOUGH GOLD' : 'REPAIR STREAK'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Info section */}
      <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="text-[9px] font-mono text-gray-600 space-y-1">
          <div>🛡️ <span className="text-gray-500">Shields</span> auto-activate when you miss a day</div>
          <div>🔧 <span className="text-gray-500">Repair</span> is available for 48 hours after a break</div>
          <div>💰 <span className="text-gray-500">Repair cost</span> = 50 + (streak × 5), max 300 Gold</div>
        </div>
      </div>
    </motion.div>
  );
};


const ShopView: React.FC<ShopViewProps> = ({
  gold,
  items,
  purchaseItem,
  consumables = {},
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
  onEquipBanner,
  initialStoreTab,
  playerAvatarUrl,
  onGoldUpdate,
  onWatchAdForBorder,
}) => {
  const [storeTab, setStoreTab] = useState<'OUTFITS' | 'BADGES' | 'BORDERS' | 'DEALS' | 'ITEMS' | 'THEMES' | 'BANNERS_SHOP'>(initialStoreTab || 'OUTFITS');
  const [showMore, setShowMore] = useState(false);
  const [moreTab, setMoreTab] = useState<'ITEMS' | 'BADGES'>('ITEMS');
  const [outfitModalIdx, setOutfitModalIdx] = useState<number | null>(null);
  const [kitEconomy, setKitEconomy] = useState(getEconomy());
  const [dealTimer, setDealTimer] = useState('');
  const [kitInfoItem, setKitInfoItem] = useState<KitStoreItem | null>(null);
  const [kitPurchasedId, setKitPurchasedId] = useState<string | null>(null);

  const [buyingItem, setBuyingItem] = useState<string | null>(null);

  // ── Border equip animation state ──
  const [equipAnimItem, setEquipAnimItem] = useState<KitStoreItem | null>(null);
  const [showEquipAnim, setShowEquipAnim] = useState(false);
  // ── Confirm purchase modal ──
  const [confirmPurchaseItem, setConfirmPurchaseItem] = useState<KitStoreItem | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  // ── Phase transition flag: keeps confirm modal mounted while equip overlay fades in ──
  const [purchasePhase, setPurchasePhase] = useState<'idle' | 'buying' | 'transitioning'>('idle');
  // ── Not enough coins popup ──
  const [showInsufficientFunds, setShowInsufficientFunds] = useState<KitStoreItem | null>(null);

  // ── Image preloader: eagerly load border images so celebration overlay doesn't flash ──
  const preloadedImagesRef = useRef<Set<string>>(new Set());
  const preloadImage = useCallback((src: string | undefined) => {
    if (!src || preloadedImagesRef.current.has(src)) return;
    const img = new Image();
    img.src = src;
    preloadedImagesRef.current.add(src);
  }, []);

  // ── Server-authoritative inventory ──
  interface InventoryItem { item_id: string; item_type: string; source: string; }
  const [serverInventory, setServerInventory] = useState<InventoryItem[]>([]);
  const [inventoryLoaded, setInventoryLoaded] = useState(false);
  const [showInventoryPanel, setShowInventoryPanel] = useState(false);

  // Helper: check if item is owned (server inventory)
  const isItemOwned = useCallback((itemId: string) => {
    if (DEV_UNLOCK_ALL) return true;
    return serverInventory.some(i => i.item_id === itemId);
  }, [serverInventory]);

  // Fetch inventory on mount
  useEffect(() => {
    const headers = getPlayerAuthHeaders();
    fetch(`${API_BASE}/api/inventory`, { credentials: 'include', headers })
      .then(r => r.ok ? r.json() : { items: [] })
      .then(data => {
        if (Array.isArray(data.items)) {
          setServerInventory(data.items);
          // Migrate localStorage owned items to server (one-time)
          const localEco = getEconomy();
          const serverIds = new Set(data.items.map((i: InventoryItem) => i.item_id));
          const missingItems = localEco.owned
            .filter(id => !serverIds.has(id))
            .map(id => {
              const item = getItemById(id);
              return item ? { itemId: id, itemType: item.category } : null;
            })
            .filter(Boolean);
          if (missingItems.length > 0) {
            fetch(`${API_BASE}/api/inventory/migrate`, {
              method: 'POST', headers: { 'Content-Type': 'application/json', ...headers },
              credentials: 'include', body: JSON.stringify({ items: missingItems }),
            }).then(r => r.ok ? r.json() : null).then(res => {
              if (res?.migrated > 0) {
                // Re-fetch inventory after migration
                fetch(`${API_BASE}/api/inventory`, { credentials: 'include', headers })
                  .then(r => r.ok ? r.json() : { items: [] })
                  .then(d => { if (Array.isArray(d.items)) setServerInventory(d.items); });
              }
            }).catch(() => { });
          }
        }
        setInventoryLoaded(true);
      })
      .catch(() => setInventoryLoaded(true));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps


  // Event Banner Carousel
  const [banners, setBanners] = useState<EventBanner[]>([]);
  const [bannerIdx, setBannerIdx] = useState(0);
  const bannerTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/store/banners`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (Array.isArray(data) && data.length > 0) setBanners(data); })
      .catch(() => { });
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
    onHighlightConsumed?.();
  }, [highlightDungeon]); // eslint-disable-line react-hooks/exhaustive-deps

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
      const themeItem = newId ? getItemById(newId) : null;
      applyThemeVars(themeItem?.themeVars || null);
    }
    // Sync border to player state → Supabase → leaderboard
    if (slot === 'border') {
      // 1. Update player state (debounced cloud sync)
      if (onEquipBorder) onEquipBorder(newId);
      // 2. INSTANT direct Supabase PATCH (Lynx AI approach — no debounce)
      syncBorderToPlayers(newId).then(() => {
        // 3. Dispatch refresh event so leaderboard re-fetches
        window.dispatchEvent(new Event('leaderboard:refresh'));
      }).catch(() => { });
    }
    // Sync banner to player state → raw_data → leaderboard popup
    if (slot === 'banner') {
      if (onEquipBanner) onEquipBanner(newId);
    }
  };

  return (
    <div id="tut-store" className="space-y-7 pb-24">

      {/* ═══ GOLD BALANCE + INVENTORY BUTTON (top bar) ═══ */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
        <div id="user-wallet-balance" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src="/assets/gold-coin.png" alt="Gold" width={24} height={24} style={{ width: 24, height: 24, objectFit: 'contain' }} loading="eager" draggable={false} />
          <span style={{ fontSize: 18, fontWeight: 900, color: '#F0B232', fontFamily: 'monospace', textShadow: '0 0 8px rgba(240,178,50,0.3)' }}>{(gold || 0).toLocaleString()}</span>
        </div>
        <button
          onClick={() => setShowInventoryPanel(!showInventoryPanel)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 10,
            background: showInventoryPanel ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.04)',
            border: showInventoryPanel ? '1px solid rgba(139,92,246,0.3)' : '1px solid rgba(255,255,255,0.08)',
            color: showInventoryPanel ? '#a78bfa' : 'rgba(255,255,255,0.5)',
            fontSize: 11, fontWeight: 800, cursor: 'pointer',
            letterSpacing: '0.05em', textTransform: 'uppercase' as const,
            transition: 'all 0.2s',
          }}
        >
          <Package size={13} />
          Inventory
          {serverInventory.length > 0 && (
            <span style={{
              fontSize: 9, fontWeight: 900, padding: '1px 6px', borderRadius: 6,
              background: 'rgba(139,92,246,0.2)', color: '#a78bfa',
            }}>{serverInventory.length}</span>
          )}
        </button>
      </div>

      {/* ═══ INVENTORY OVERLAY (full-screen popup via Portal) ═══ */}
      {showInventoryPanel && ReactDOM.createPortal(
        <AnimatePresence>
          <motion.div
            key="inv-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={() => setShowInventoryPanel(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            }}
          />
          <motion.div
            key="inv-panel"
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 10000,
              maxHeight: '85vh', display: 'flex', flexDirection: 'column',
              background: 'linear-gradient(180deg, #13111a 0%, #0a0a0f 100%)',
              borderTop: '1px solid rgba(139,92,246,0.2)',
              borderRadius: '24px 24px 0 0',
              boxShadow: '0 -8px 40px rgba(139,92,246,0.15)',
            }}
          >
            {/* ── Handle bar ── */}
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 4 }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} />
            </div>

            {/* ── Header ── */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 20px 14px',
              borderBottom: '1px solid rgba(139,92,246,0.08)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Package size={16} color="#a78bfa" />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 900, color: '#fff', letterSpacing: '0.03em' }}>MY INVENTORY</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>
                    {serverInventory.length} item{serverInventory.length !== 1 ? 's' : ''} owned
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowInventoryPanel(false)}
                style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, transition: 'all 0.2s',
                }}
              >✕</button>
            </div>

            {/* ── Scrollable content ── */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px 32px', WebkitOverflowScrolling: 'touch' }}>

              {/* Borders */}
              {(() => {
                const ownedBorderItems = serverInventory.filter(i => i.item_type === 'border');
                if (ownedBorderItems.length === 0) return null;
                return (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
                      BORDERS ({ownedBorderItems.length})
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                      {ownedBorderItems.map(inv => {
                        const storeItem = getItemById(inv.item_id);
                        if (!storeItem) return null;
                        const isEquipped = kitEconomy.equipped.border === inv.item_id;
                        return (
                          <div key={inv.item_id} onClick={() => handleKitEquip('border', inv.item_id)} style={{
                            textAlign: 'center', cursor: 'pointer',
                            padding: 10, borderRadius: 14,
                            background: isEquipped ? 'rgba(139,92,246,0.12)' : 'rgba(255,255,255,0.02)',
                            border: isEquipped ? '1.5px solid rgba(139,92,246,0.3)' : '1px solid rgba(255,255,255,0.06)',
                            transition: 'all 0.2s',
                          }}>
                            {storeItem.imageBorder && (
                              <img src={storeItem.imageBorder} alt="" style={{ width: 48, height: 48, objectFit: 'contain', margin: '0 auto 6px', display: 'block', mixBlendMode: 'screen' }} />
                            )}
                            <div style={{ fontSize: 9, fontWeight: 700, color: isEquipped ? '#a78bfa' : 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {storeItem.name}
                            </div>
                            {isEquipped && <div style={{ fontSize: 7, color: '#22c55e', fontWeight: 900, marginTop: 3 }}>✓ EQUIPPED</div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Banners */}
              {(() => {
                const ownedBannerItems = serverInventory.filter(i => i.item_type === 'banner');
                if (ownedBannerItems.length === 0) return null;
                return (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
                      BANNERS ({ownedBannerItems.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {ownedBannerItems.map(inv => {
                        const storeItem = getItemById(inv.item_id);
                        if (!storeItem) return null;
                        const isEquipped = kitEconomy.equipped.banner === inv.item_id;
                        return (
                          <div key={inv.item_id} onClick={() => handleKitEquip('banner', inv.item_id)} style={{
                            display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                            padding: '10px 12px', borderRadius: 12,
                            background: isEquipped ? 'rgba(6,182,212,0.08)' : 'rgba(255,255,255,0.02)',
                            border: isEquipped ? '1px solid rgba(6,182,212,0.2)' : '1px solid rgba(255,255,255,0.05)',
                            transition: 'all 0.2s',
                          }}>
                            {storeItem.bannerImage && (
                              <img src={storeItem.bannerImage} alt="" style={{ width: 64, height: 36, borderRadius: 8, objectFit: 'cover' }} />
                            )}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12, fontWeight: 800, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{storeItem.name}</div>
                              <div style={{ fontSize: 9, color: isEquipped ? '#06B6D4' : 'rgba(255,255,255,0.3)', fontWeight: 600 }}>
                                {isEquipped ? '✓ EQUIPPED' : 'Tap to equip'}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Themes */}
              {(() => {
                const ownedThemeItems = serverInventory.filter(i => i.item_type === 'theme');
                if (ownedThemeItems.length === 0) return null;
                return (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
                      THEMES ({ownedThemeItems.length})
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                      {ownedThemeItems.map(inv => {
                        const storeItem = getItemById(inv.item_id);
                        if (!storeItem) return null;
                        const isEquipped = kitEconomy.equipped.theme === inv.item_id;
                        const themeColor = storeItem.themeVars?.['--primary'] || '#9ca3af';
                        return (
                          <div key={inv.item_id} onClick={() => handleKitEquip('theme', inv.item_id)} style={{
                            textAlign: 'center', cursor: 'pointer',
                            padding: '10px 8px', borderRadius: 12,
                            background: isEquipped ? `${themeColor}15` : 'rgba(255,255,255,0.02)',
                            border: isEquipped ? `1.5px solid ${themeColor}40` : '1px solid rgba(255,255,255,0.06)',
                            transition: 'all 0.2s',
                          }}>
                            <div style={{
                              width: 28, height: 28, borderRadius: '50%', margin: '0 auto 6px',
                              background: `linear-gradient(135deg, ${themeColor}, ${themeColor}80)`,
                              boxShadow: isEquipped ? `0 0 12px ${themeColor}50` : 'none',
                            }} />
                            <div style={{ fontSize: 9, fontWeight: 700, color: isEquipped ? themeColor : 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {storeItem.name}
                            </div>
                            {isEquipped && <div style={{ fontSize: 7, color: '#22c55e', fontWeight: 900, marginTop: 3 }}>✓ ON</div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Outfits */}
              {(() => {
                const ownedOutfitItems = serverInventory.filter(i => i.item_type === 'outfit');
                if (ownedOutfitItems.length === 0) return null;
                return (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
                      OUTFITS ({ownedOutfitItems.length})
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                      {ownedOutfitItems.map(inv => {
                        const outfitData = OUTFITS.find(o => o.id === inv.item_id);
                        const isEquipped = wardrobeEquippedOutfitId === inv.item_id;
                        return (
                          <div key={inv.item_id} onClick={() => wardrobeOnEquip?.(inv.item_id)} style={{
                            textAlign: 'center', cursor: 'pointer',
                            padding: 10, borderRadius: 14,
                            background: isEquipped ? 'rgba(139,92,246,0.12)' : 'rgba(255,255,255,0.02)',
                            border: isEquipped ? '1.5px solid rgba(139,92,246,0.3)' : '1px solid rgba(255,255,255,0.06)',
                            transition: 'all 0.2s',
                          }}>
                            <div style={{
                              width: 44, height: 44, margin: '0 auto 6px', borderRadius: '50%',
                              background: isEquipped
                                ? `linear-gradient(135deg, ${outfitData?.accentColor || '#a78bfa'}30, ${outfitData?.accentColor || '#a78bfa'}10)`
                                : 'rgba(255,255,255,0.05)',
                              border: `1px solid ${isEquipped ? (outfitData?.accentColor || '#a78bfa') + '40' : 'rgba(255,255,255,0.06)'}`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              overflow: 'hidden',
                            }}>
                              {outfitData?.image ? (
                                <img src={outfitData.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <span style={{ fontSize: 18 }}>⚔️</span>
                              )}
                            </div>
                            <div style={{ fontSize: 9, fontWeight: 700, color: isEquipped ? '#a78bfa' : 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {outfitData?.name || inv.item_id.replace('outfit_', '').replace(/_/g, ' ')}
                            </div>
                            {isEquipped && <div style={{ fontSize: 7, color: '#22c55e', fontWeight: 900, marginTop: 3 }}>✓ EQUIPPED</div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Titles */}
              {(() => {
                const ownedTitleItems = serverInventory.filter(i => i.item_type === 'title');
                if (ownedTitleItems.length === 0) return null;
                return (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
                      TITLES ({ownedTitleItems.length})
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {ownedTitleItems.map(inv => {
                        const storeItem = getItemById(inv.item_id);
                        if (!storeItem) return null;
                        const titleColor = storeItem.titleConfig?.color || '#9ca3af';
                        return (
                          <div key={inv.item_id} style={{
                            padding: '6px 14px', borderRadius: 10,
                            background: `${titleColor}15`, border: `1px solid ${titleColor}30`,
                            fontSize: 11, fontWeight: 800, color: titleColor,
                          }}>
                            {storeItem.name}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {serverInventory.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📦</div>
                  No items yet — visit the shop below!
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}

      {/* ═══════════════════════════════════════════
           EVENT BANNER CAROUSEL (top hero)
         ═══════════════════════════════════════════ */}
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
              <FadeImg
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
          {banners.length > 1 && (
            <>
              <button onClick={() => { setBannerIdx(p => (p - 1 + banners.length) % banners.length); resetBannerTimer(); }} className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white transition-colors z-10"><ChevronLeft size={16} /></button>
              <button onClick={() => { setBannerIdx(p => (p + 1) % banners.length); resetBannerTimer(); }} className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white transition-colors z-10"><ChevronRight size={16} /></button>
            </>
          )}
          {banners.length > 1 && (
            <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
              {banners.map((_, i) => (
                <button key={i} onClick={() => { setBannerIdx(i); resetBannerTimer(); }} className={`rounded-full transition-all ${i === bannerIdx % banners.length ? 'w-5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/40'}`} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════
           🔥 DEALS OF THE DAY
         ═══════════════════════════════════════════ */}
      <section>
        <div className="store-section-hdr">
          <div className="hdr-icon" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <Flame size={15} style={{ color: '#EF4444' }} />
          </div>
          <span className="hdr-title" style={{ color: '#fff' }}>Deals</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 8, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)' }}>
            <Timer size={10} style={{ color: '#EF4444' }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: '#EF4444', fontFamily: 'monospace' }}>{dealTimer || '...'}</span>
          </div>
          <div className="hdr-line" />
        </div>
        {/* gridAutoRows:'1fr' = every row forced to tallest card height */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '0 16px', gridAutoRows: '1fr' }}>
          {getTodaysDeals(4).map(d => (
            <div key={d.item.id}>
              <KitGlowCard item={d.item} discount={d.discount}
                owned={isItemOwned(d.item.id)}
                equipped={kitEconomy.equipped[d.item.category as keyof EquippedItems] === d.item.id}
                canAfford={DEV_UNLOCK_ALL || gold >= Math.round(d.item.price * (1 - d.discount / 100))}
                onBuy={() => setConfirmPurchaseItem(d.item)}
                onEquip={d.item.category !== 'consumable' ? () => handleKitEquip(d.item.category as keyof EquippedItems, d.item.id) : undefined}
                onInfo={() => setKitInfoItem(d.item)}
              />
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════
           🖼️ PROFILE BANNERS
         ═══════════════════════════════════════════ */}
      <section>
        <div className="store-section-hdr">
          <div className="hdr-icon" style={{ background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.2)' }}>
            <ImageIcon size={15} style={{ color: '#06B6D4' }} />
          </div>
          <span className="hdr-title">Banners</span>
          <div className="hdr-line" />
        </div>
        <div className="store-hscroll">
          {getItemsByCategory('banner').map(item => {
            const isEquipped = kitEconomy.equipped.banner === item.id;
            const isDefault = item.id === 'banner-reforge-default';
            const isOwned = isItemOwned(item.id);
            const canBuy = !isOwned && item.price > 0;
            return (
              <div key={item.id} style={{ flexShrink: 0, width: 260, borderRadius: 16, overflow: 'hidden', position: 'relative', border: isEquipped ? '2px solid rgba(6,182,212,0.5)' : '1px solid rgba(255,255,255,0.06)', boxShadow: isEquipped ? '0 0 20px rgba(6,182,212,0.15)' : 'none' }}>
                {item.bannerImage && (
                  <div style={{ width: '100%', aspectRatio: '16 / 9', position: 'relative', overflow: 'hidden' }}>
                    <FadeImg src={item.bannerImage} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  </div>
                )}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%', background: 'linear-gradient(transparent, rgba(0,0,0,0.9))', pointerEvents: 'none' }} />
                {isDefault && (
                  <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 3, padding: '2px 8px', borderRadius: 5, background: 'rgba(6,182,212,0.2)', border: '1px solid rgba(6,182,212,0.4)', fontSize: 8, fontWeight: 900, color: '#06B6D4', letterSpacing: '0.1em', textTransform: 'uppercase' }}>DEFAULT</div>
                )}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 2 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 900, color: '#fff' }}>{item.name}</div>
                    {canBuy && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>{item.price} G</div>}
                    {item.price === 0 && <div style={{ fontSize: 10, color: '#06B6D4', fontFamily: 'monospace', fontWeight: 700 }}>FREE</div>}
                    {isOwned && item.price > 0 && <div style={{ fontSize: 9, color: '#22c55e', fontWeight: 700 }}>OWNED</div>}
                  </div>
                  {canBuy ? (
                    <button onClick={() => setConfirmPurchaseItem(item)} disabled={gold < item.price} style={{ padding: '6px 14px', borderRadius: 10, fontSize: 10, fontWeight: 900, letterSpacing: '0.05em', border: 'none', cursor: gold >= item.price ? 'pointer' : 'not-allowed', background: gold >= item.price ? 'linear-gradient(135deg, #fbbf24, #d97706)' : 'rgba(255,255,255,0.06)', color: gold >= item.price ? '#000' : 'rgba(255,255,255,0.3)', textTransform: 'uppercase' as const }}>
                      BUY
                    </button>
                  ) : (
                    <button onClick={() => handleKitEquip('banner', item.id)} style={{ padding: '6px 14px', borderRadius: 10, fontSize: 10, fontWeight: 900, letterSpacing: '0.05em', border: 'none', cursor: 'pointer', background: isEquipped ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #06B6D4, #0891b2)', color: isEquipped ? 'rgba(255,255,255,0.5)' : '#fff', textTransform: 'uppercase' as const }}>
                      {isEquipped ? '✓ EQUIPPED' : 'EQUIP'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══════════════════════════════════════════
           👑 AVATAR BORDERS — 4 Thematic Tiers
         ═══════════════════════════════════════════ */}

      {/* ── Tier 1: Elements ── */}
      <section>
        <div className="store-section-hdr">
          <div className="hdr-icon" style={{ background: 'rgba(91,159,230,0.12)', border: '1px solid rgba(91,159,230,0.2)' }}>
            <Flame size={15} style={{ color: '#5B9FE6' }} />
          </div>
          <span className="hdr-title">Elements</span>
          <span style={{ fontSize: 8, fontFamily: 'monospace', color: 'rgba(255,255,255,0.3)', padding: '2px 8px', background: 'rgba(91,159,230,0.06)', borderRadius: 6, border: '1px solid rgba(91,159,230,0.1)' }}>NATURE · ICE · FIRE</span>
          <div className="hdr-line" />
        </div>
        <div className="store-hscroll">
          {BORDERS_ELEMENTS.map(item => (
            <div key={item.id} style={{ flexShrink: 0, width: 'calc(42vw - 12px)', minWidth: 140, maxWidth: 180 }}>
              <KitGlowCard item={item}
                owned={isItemOwned(item.id)}
                equipped={kitEconomy.equipped.border === item.id}
                canAfford={DEV_UNLOCK_ALL || gold >= item.price}
                onBuy={() => setConfirmPurchaseItem(item)}
                onInsufficientFunds={() => setShowInsufficientFunds(item)}
                onEquip={() => {
                  setEquipAnimItem(item);
                  setShowEquipAnim(true);
                  handleKitEquip('border', item.id);
                }}
                onInfo={() => setKitInfoItem(item)}
                onView={() => setKitInfoItem(item)}
                onCardClick={() => setKitInfoItem(item)}
              />
            </div>
          ))}
        </div>
      </section>

      {/* ── Tier 2: Beasts ── */}
      <section>
        <div className="store-section-hdr">
          <div className="hdr-icon" style={{ background: 'rgba(139,149,165,0.12)', border: '1px solid rgba(139,149,165,0.2)' }}>
            <Shield size={15} style={{ color: '#8B95A5' }} />
          </div>
          <span className="hdr-title">Beasts</span>
          <span style={{ fontSize: 8, fontFamily: 'monospace', color: 'rgba(255,255,255,0.3)', padding: '2px 8px', background: 'rgba(139,149,165,0.06)', borderRadius: 6, border: '1px solid rgba(139,149,165,0.1)' }}>DRAGONS · LIONS · EAGLES</span>
          <div className="hdr-line" />
        </div>
        <div className="store-hscroll">
          {BORDERS_BEASTS.map(item => (
            <div key={item.id} style={{ flexShrink: 0, width: 'calc(42vw - 12px)', minWidth: 140, maxWidth: 180 }}>
              <KitGlowCard item={item}
                owned={isItemOwned(item.id)}
                equipped={kitEconomy.equipped.border === item.id}
                canAfford={DEV_UNLOCK_ALL || gold >= item.price}
                onBuy={() => setConfirmPurchaseItem(item)}
                onInsufficientFunds={() => setShowInsufficientFunds(item)}
                onEquip={() => {
                  setEquipAnimItem(item);
                  setShowEquipAnim(true);
                  handleKitEquip('border', item.id);
                }}
                onInfo={() => setKitInfoItem(item)}
                onView={() => setKitInfoItem(item)}
                onCardClick={() => setKitInfoItem(item)}
              />
            </div>
          ))}
        </div>
      </section>

      {/* ── Tier 3: Shields ── */}
      <section>
        <div className="store-section-hdr">
          <div className="hdr-icon" style={{ background: 'rgba(212,146,10,0.12)', border: '1px solid rgba(212,146,10,0.2)' }}>
            <Hexagon size={15} style={{ color: '#D4920A' }} />
          </div>
          <span className="hdr-title">Shields</span>
          <span style={{ fontSize: 8, fontFamily: 'monospace', color: 'rgba(255,255,255,0.3)', padding: '2px 8px', background: 'rgba(212,146,10,0.06)', borderRadius: 6, border: '1px solid rgba(212,146,10,0.1)' }}>ARMOR · RUNES · VANGUARD</span>
          <div className="hdr-line" />
        </div>
        <div className="store-hscroll">
          {BORDERS_SHIELDS.map(item => (
            <div key={item.id} style={{ flexShrink: 0, width: 'calc(42vw - 12px)', minWidth: 140, maxWidth: 180 }}>
              <KitGlowCard item={item}
                owned={isItemOwned(item.id)}
                equipped={kitEconomy.equipped.border === item.id}
                canAfford={DEV_UNLOCK_ALL || gold >= item.price}
                onBuy={() => setConfirmPurchaseItem(item)}
                onInsufficientFunds={() => setShowInsufficientFunds(item)}
                onEquip={() => {
                  setEquipAnimItem(item);
                  setShowEquipAnim(true);
                  handleKitEquip('border', item.id);
                }}
                onInfo={() => setKitInfoItem(item)}
                onView={() => setKitInfoItem(item)}
                onCardClick={() => setKitInfoItem(item)}
              />
            </div>
          ))}
        </div>
      </section>

      {/* ── Tier 4: Exclusive (Glow) ── */}
      <section>
        <div className="store-section-hdr">
          <div className="hdr-icon" style={{ background: 'rgba(155,93,229,0.15)', border: '1px solid rgba(155,93,229,0.3)', boxShadow: '0 0 12px rgba(155,93,229,0.15)' }}>
            <Star size={15} style={{ color: '#9B5DE5' }} />
          </div>
          <span className="hdr-title" style={{ background: 'linear-gradient(90deg, #9B5DE5, #EAB308)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Exclusive</span>
          <span style={{ fontSize: 8, fontFamily: 'monospace', color: '#9B5DE5', padding: '2px 8px', background: 'rgba(155,93,229,0.08)', borderRadius: 6, border: '1px solid rgba(155,93,229,0.15)' }}>✦ GLOW EFFECT</span>
          <div className="hdr-line" />
        </div>
        <div className="store-hscroll">
          {BORDERS_EXCLUSIVE.map(item => (
            <div key={item.id} style={{ flexShrink: 0, width: 'calc(42vw - 12px)', minWidth: 140, maxWidth: 180 }}>
              <KitGlowCard item={item}
                owned={isItemOwned(item.id)}
                equipped={kitEconomy.equipped.border === item.id}
                canAfford={DEV_UNLOCK_ALL || gold >= item.price}
                onBuy={() => setConfirmPurchaseItem(item)}
                onInsufficientFunds={() => setShowInsufficientFunds(item)}
                onEquip={() => {
                  setEquipAnimItem(item);
                  setShowEquipAnim(true);
                  handleKitEquip('border', item.id);
                }}
                onInfo={() => setKitInfoItem(item)}
                onView={() => setKitInfoItem(item)}
                onCardClick={() => setKitInfoItem(item)}
              />
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', fontSize: 9, fontFamily: 'monospace', color: 'rgba(255,255,255,0.25)', paddingTop: 2 }}>
          Borders are permanent · Visible on profile & leaderboard
        </div>
      </section>

      {/* ── Tier 5: Live Event Borders (remote, admin-added) ── */}
      {(() => {
        const remoteBorders = getRemoteStoreCache().filter(i => i.category === 'border');
        if (remoteBorders.length === 0) return null;
        return (
          <section>
            <div className="store-section-hdr">
              <div className="hdr-icon" style={{ background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.3)', boxShadow: '0 0 12px rgba(249,115,22,0.15)' }}>
                <Flame size={15} style={{ color: '#F97316' }} />
              </div>
              <span className="hdr-title" style={{ background: 'linear-gradient(90deg, #F97316, #EAB308)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Live Events</span>
              <span style={{ fontSize: 8, fontFamily: 'monospace', color: '#F97316', padding: '2px 8px', background: 'rgba(249,115,22,0.08)', borderRadius: 6, border: '1px solid rgba(249,115,22,0.15)' }}>🔥 LIMITED</span>
              <div className="hdr-line" />
            </div>
            <div className="store-hscroll">
              {remoteBorders.map(item => (
                <div key={item.id} style={{ flexShrink: 0, width: 'calc(42vw - 12px)', minWidth: 140, maxWidth: 180 }}>
                  <KitGlowCard item={item}
                    owned={isItemOwned(item.id)}
                    equipped={kitEconomy.equipped.border === item.id}
                    canAfford={DEV_UNLOCK_ALL || gold >= item.price}
                    onBuy={() => setConfirmPurchaseItem(item)}
                    onInsufficientFunds={() => setShowInsufficientFunds(item)}
                    onEquip={() => {
                      setEquipAnimItem(item);
                      setShowEquipAnim(true);
                      handleKitEquip('border', item.id);
                    }}
                    onInfo={() => setKitInfoItem(item)}
                    onView={() => setKitInfoItem(item)}
                    onCardClick={() => setKitInfoItem(item)}
                  />
                </div>
              ))}
            </div>
          </section>
        );
      })()}

      {/* ═══════════════════════════════════════════
           👕 OUTFITS (last main section) — individual video cards
         ═══════════════════════════════════════════ */}
      <section>
        <div className="store-section-hdr">
          <div className="hdr-icon" style={{ background: 'rgba(244,114,182,0.12)', border: '1px solid rgba(244,114,182,0.2)' }}>
            <Shirt size={15} style={{ color: '#F472B6' }} />
          </div>
          <span className="hdr-title">Outfits</span>
          <div className="hdr-line" />
        </div>
        <div className="store-hscroll">
          {(wardrobeOutfits && wardrobeOutfits.length > 0 ? wardrobeOutfits : OUTFITS).map((outfit, idx) => {
            const isUnlocked = (wardrobeUnlockedOutfits || ['outfit_starter']).includes(outfit.id);
            const isEquipped = (wardrobeEquippedOutfitId || 'outfit_starter') === outfit.id;
            const accent = outfit.accentColor || '#9ca3af';
            return (
              <div key={outfit.id} style={{
                flexShrink: 0, width: 155, borderRadius: 18, overflow: 'hidden',
                background: '#0A0A0F', position: 'relative',
                border: isEquipped ? `2px solid ${accent}` : '1.5px solid rgba(255,255,255,0.06)',
                boxShadow: isEquipped ? `0 0 24px ${accent}40` : '0 4px 20px rgba(0,0,0,0.4)',
                display: 'flex', flexDirection: 'column',
              }}>
                {/* Video area */}
                <div style={{ width: '100%', aspectRatio: '9 / 14', position: 'relative', overflow: 'hidden', background: '#000' }}>
                  {/* Radial accent glow behind video */}
                  <div style={{
                    position: 'absolute', inset: 0, zIndex: 0,
                    background: `radial-gradient(ellipse at 50% 55%, ${accent}20 0%, transparent 65%)`,
                  }} />
                  {/* Loop video */}
                  {outfit.loopVideoUrl ? (
                    <video
                      src={outfit.loopVideoUrl}
                      muted autoPlay loop playsInline
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center', zIndex: 1 }}
                    />
                  ) : outfit.introVideoUrl ? (
                    <video
                      src={outfit.introVideoUrl}
                      muted autoPlay loop playsInline
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center', zIndex: 1 }}
                    />
                  ) : null}
                  {/* Lock overlay */}
                  {!isUnlocked && (
                    <div style={{
                      position: 'absolute', inset: 0, zIndex: 3,
                      background: 'rgba(0,0,0,0.55)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Lock size={16} color="#9ca3af" />
                      </div>
                    </div>
                  )}
                  {/* Equipped badge */}
                  {isEquipped && (
                    <div style={{
                      position: 'absolute', top: 8, right: 8, zIndex: 4,
                      padding: '3px 8px', borderRadius: 6,
                      background: accent, fontSize: 8, fontWeight: 900, color: '#000',
                      boxShadow: `0 0 10px ${accent}80`,
                      letterSpacing: '0.05em',
                    }}>✓ EQUIPPED</div>
                  )}
                  {/* Bottom gradient */}
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '45%', background: 'linear-gradient(transparent, #0A0A0F)', zIndex: 2 }} />
                </div>
                {/* Info + Buttons */}
                <div style={{ padding: '10px 12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {/* Name + Tier */}
                  <div>
                    <div style={{
                      display: 'inline-block', padding: '2px 7px', borderRadius: 5, marginBottom: 4,
                      background: `${accent}1a`, border: `1px solid ${accent}40`,
                      fontSize: 8, fontWeight: 900, color: accent, letterSpacing: '0.1em',
                    }}>TIER {outfit.tier}</div>
                    <div style={{ fontSize: 13, fontWeight: 900, color: '#fff', lineHeight: 1.2 }}>{outfit.name}</div>
                    <div style={{ fontSize: 10, color: outfit.cost === 0 ? '#4ade80' : 'rgba(255,255,255,0.45)', fontFamily: 'monospace', fontWeight: 700, marginTop: 2 }}>
                      {outfit.cost === 0 ? 'FREE' : `${outfit.cost.toLocaleString()} G`}
                    </div>
                  </div>
                  {/* Buttons */}
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => setOutfitModalIdx(idx)} style={{
                      flex: 1, padding: '7px 0', borderRadius: 10, cursor: 'pointer',
                      background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                      color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: 800,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                    }}>
                      <Eye size={11} /> View
                    </button>
                    {isUnlocked ? (
                      <button onClick={() => wardrobeOnEquip?.(outfit.id)} disabled={isEquipped} style={{
                        flex: 1, padding: '7px 0', borderRadius: 10, cursor: isEquipped ? 'default' : 'pointer',
                        background: isEquipped ? 'rgba(255,255,255,0.04)' : `linear-gradient(135deg, ${accent}, ${accent}cc)`,
                        border: 'none',
                        color: isEquipped ? 'rgba(255,255,255,0.3)' : '#000',
                        fontSize: 10, fontWeight: 900,
                        boxShadow: isEquipped ? 'none' : `0 0 12px ${accent}40`,
                      }}>
                        {isEquipped ? '✓' : 'EQUIP'}
                      </button>
                    ) : (
                      <button onClick={() => setOutfitModalIdx(idx)} style={{
                        flex: 1, padding: '7px 0', borderRadius: 10, cursor: 'pointer',
                        background: 'linear-gradient(135deg, #fbbf24cc, #eab308)',
                        border: 'none', color: '#000',
                        fontSize: 10, fontWeight: 900,
                        boxShadow: '0 0 12px rgba(234,179,8,0.3)',
                      }}>
                        BUY
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── OUTFIT DETAIL MODAL ── */}
      {outfitModalIdx !== null && (
        <Suspense fallback={null}>
          <OutfitPurchaseModal
            outfit={(wardrobeOutfits && wardrobeOutfits.length > 0 ? wardrobeOutfits : OUTFITS)[outfitModalIdx]}
            gold={wardrobeGold ?? gold}
            isUnlocked={(wardrobeUnlockedOutfits || ['outfit_starter']).includes(
              (wardrobeOutfits && wardrobeOutfits.length > 0 ? wardrobeOutfits : OUTFITS)[outfitModalIdx]?.id
            )}
            onPurchase={(o) => { wardrobeOnPurchase?.(o); setOutfitModalIdx(null); }}
            onEquip={(id) => { wardrobeOnEquip?.(id); setOutfitModalIdx(null); }}
            onClose={() => setOutfitModalIdx(null)}
          />
        </Suspense>
      )}

      {/* ═══════════════════════════════════════════
           ⬇️ MORE (Items / Badges) — expandable
         ═══════════════════════════════════════════ */}
      <section>
        <button
          onClick={() => setShowMore(!showMore)}
          style={{
            width: '100%', padding: '14px 0', borderRadius: 14, cursor: 'pointer',
            background: showMore ? 'rgba(0,212,255,0.08)' : 'rgba(255,255,255,0.03)',
            border: showMore ? '1px solid rgba(0,212,255,0.15)' : '1px solid rgba(255,255,255,0.06)',
            color: showMore ? '#00d4ff' : 'rgba(255,255,255,0.45)',
            fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' as const,
            fontFamily: 'Inter, system-ui, sans-serif',
            transition: 'all 0.25s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {showMore ? '▲ Show Less' : '▼ More — Items & Badges'}
        </button>

        <AnimatePresence>
          {showMore && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{ overflow: 'hidden' }}
            >
              {/* Sub-tabs */}
              <div style={{ display: 'flex', gap: 8, padding: '16px 0 12px', justifyContent: 'center' }}>
                {([
                  { id: 'ITEMS' as const, label: 'Items', icon: <Shield size={13} /> },
                  { id: 'BADGES' as const, label: 'Badges', icon: <Hexagon size={13} /> },
                ]).map(tab => {
                  const isActive = moreTab === tab.id;
                  return (
                    <button key={tab.id} onClick={() => setMoreTab(tab.id)} style={{
                      display: 'flex', alignItems: 'center', gap: 5, padding: '8px 18px', borderRadius: 10,
                      background: isActive ? 'rgba(0,212,255,0.15)' : 'rgba(255,255,255,0.03)',
                      color: isActive ? '#00d4ff' : '#6b7280',
                      fontSize: 11, fontWeight: 700, cursor: 'pointer',
                      border: isActive ? '1.5px solid rgba(0,212,255,0.3)' : '1.5px solid transparent',
                      transition: 'all 0.2s', flexShrink: 0,
                    }}>
                      {tab.icon} {tab.label}
                    </button>
                  );
                })}
              </div>
              {moreTab === 'ITEMS' && <ItemsTab gold={gold} />}
              {moreTab === 'BADGES' && (
                <Suspense fallback={<div className="h-[300px] rounded-2xl bg-[#0A0A0F] animate-pulse" />}>
                  <BadgesSection
                    outfitStones={outfitStones}
                    unlockedOutfits={wardrobeUnlockedOutfits || ['outfit_starter']}
                    equippedOutfitId={wardrobeEquippedOutfitId || 'outfit_starter'}
                    outfits={wardrobeOutfits}
                  />
                </Suspense>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* ── THEMES TAB (HIDDEN — code preserved for future) ── */}
      {false && storeTab === 'THEMES' && (
        <motion.div key="themes-tab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="text-[10px] font-mono font-bold tracking-[0.3em] uppercase text-gray-400">APP THEMES</div>
            <div className="flex-1 h-px bg-system-border" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {getItemsByCategory('theme').map(item => (
              <KitGlowCard key={item.id} item={item}
                owned={isItemOwned(item.id)}
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

      {/* ── THEME PREVIEW MODAL ── */}
      {kitInfoItem && kitInfoItem.category === 'theme' && (
        <KitThemePreviewModal item={kitInfoItem} onClose={() => setKitInfoItem(null)} />
      )}

      {/* ── BORDER PREVIEW MODAL ── */}
      {kitInfoItem && kitInfoItem.category === 'border' && (
        <KitBorderPreviewModal
          item={kitInfoItem}
          onClose={() => setKitInfoItem(null)}
          owned={isItemOwned(kitInfoItem.id)}
          equipped={kitEconomy.equipped.border === kitInfoItem.id}
          canAfford={DEV_UNLOCK_ALL || gold >= kitInfoItem.price}
          onBuy={() => { setKitInfoItem(null); setConfirmPurchaseItem(kitInfoItem); }}
          onEquip={() => {
            setKitInfoItem(null);
            setEquipAnimItem(kitInfoItem);
            setShowEquipAnim(true);
            handleKitEquip('border', kitInfoItem.id);
          }}
        />
      )}

      {/* ── CONFIRM PURCHASE MODAL (works for borders, banners, themes, titles, consumables) ── */}
      {/* Persistent portal container: stays mounted during buying→celebration transition to prevent blank frame gap */}
      {(confirmPurchaseItem || purchasePhase === 'transitioning') &&
        ReactDOM.createPortal(<div
          onClick={() => { if (!purchasing && purchasePhase !== 'transitioning') setConfirmPurchaseItem(null); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 100000,
            /* Android WebView: backdropFilter causes full-screen repaint storms → use opaque bg */
            background: 'rgba(0,0,0,0.92)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
            /* Phase transition fade — no willChange (causes Android WebView jank) */
            opacity: purchasePhase === 'transitioning' ? 0 : 1,
            transition: 'opacity 0.3s ease-out',
            transform: 'translateZ(0)', /* single GPU layer */
            pointerEvents: purchasePhase === 'transitioning' ? 'none' : 'auto',
          }}
        >
          {confirmPurchaseItem && purchasePhase !== 'transitioning' && (
            <div onClick={e => e.stopPropagation()} style={{
              background: 'linear-gradient(180deg, #14161e 0%, #0c0d14 100%)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 20, padding: '28px 24px', width: '100%', maxWidth: 320,
              textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
            }}>
              {/* ── Item Preview (adaptive per category) ── */}
              {confirmPurchaseItem.videoBorder ? (
                <div style={{ width: 80, height: 80, margin: '0 auto 16px', position: 'relative' }}>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#1a1a2a' }} />
                  </div>
                  <div style={{ position: 'absolute', inset: 0, zIndex: 1, mixBlendMode: 'screen' }}>
                    <BorderVideo src={confirmPurchaseItem.videoBorder} />
                  </div>
                </div>
              ) : confirmPurchaseItem.imageBorder ? (
                <div style={{ width: 80, height: 80, margin: '0 auto 16px', position: 'relative' }}>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#1a1a2a' }} />
                  </div>
                  <img src={confirmPurchaseItem.imageBorder} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', mixBlendMode: 'screen', position: 'relative', zIndex: 1 }} />
                </div>
              ) : null}
              {confirmPurchaseItem.category === 'banner' && confirmPurchaseItem.bannerImage && (
                <div style={{ width: '100%', borderRadius: 12, overflow: 'hidden', margin: '0 auto 16px', aspectRatio: '16 / 9', position: 'relative' }}>
                  <img src={confirmPurchaseItem.bannerImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </div>
              )}
              {confirmPurchaseItem.category === 'theme' && confirmPurchaseItem.themeVars && (
                <div style={{
                  width: 56, height: 56, borderRadius: '50%', margin: '0 auto 16px',
                  background: `linear-gradient(135deg, ${confirmPurchaseItem.themeVars['--primary'] || '#9ca3af'}, ${confirmPurchaseItem.themeVars['--primary'] || '#9ca3af'}80)`,
                  boxShadow: `0 0 24px ${confirmPurchaseItem.themeVars['--primary'] || '#9ca3af'}40`,
                }} />
              )}
              <div style={{ fontSize: 16, fontWeight: 900, color: '#fff', marginBottom: 4 }}>{confirmPurchaseItem.name}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Confirm purchase?</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{confirmPurchaseItem.category}</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 20 }}>
                {confirmPurchaseItem.adUnlock ? (
                  <span style={{ fontSize: 14, fontWeight: 900, color: '#a855f7', letterSpacing: '0.05em' }}>▶ WATCH AD TO UNLOCK</span>
                ) : (
                  <>
                    <SystemCoin size={22} />
                    <span style={{ fontSize: 20, fontWeight: 900, color: '#fbbf24' }}>{confirmPurchaseItem.price}</span>
                  </>
                )}
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button disabled={purchasing} onClick={() => setConfirmPurchaseItem(null)} style={{ padding: '10px 28px', borderRadius: 12, cursor: 'pointer', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 700 }}>Cancel</button>
                {confirmPurchaseItem.adUnlock && onWatchAdForBorder ? (
                  <button disabled={purchasing} onClick={async () => {
                    const item = confirmPurchaseItem;
                    setPurchasing(true);
                    try {
                      const success = await onWatchAdForBorder(item.id);
                      if (success) {
                        // Add to inventory locally
                        setServerInventory(prev => [...prev, { item_id: item.id, item_type: item.category, source: 'ad_reward' }]);
                        const p = kitPurchaseItem(item.id, 0);
                        if (p) setKitEconomy(p);
                        if (item.category === 'border') {
                          handleKitEquip('border', item.id);
                          setEquipAnimItem(item);
                          setPurchasePhase('transitioning');
                          setShowEquipAnim(true);
                          setTimeout(() => { setConfirmPurchaseItem(null); setPurchasePhase('idle'); setPurchasing(false); }, 350);
                        } else {
                          setConfirmPurchaseItem(null); setPurchasing(false); setPurchasePhase('idle');
                        }
                      } else {
                        setPurchasing(false);
                      }
                    } catch { setPurchasing(false); }
                  }} style={{
                    padding: '10px 28px', borderRadius: 12, cursor: purchasing ? 'wait' : 'pointer',
                    background: 'linear-gradient(135deg, #a855f7, #7c3aed)', border: 'none',
                    color: '#fff', fontSize: 12, fontWeight: 900,
                    boxShadow: '0 0 20px rgba(168,85,247,0.3)', opacity: purchasing ? 0.6 : 1,
                  }}>
                    {purchasing ? 'Loading...' : '▶ Watch Ad'}
                  </button>
                ) : (
                  <button disabled={purchasing} onClick={async () => {
                    const item = confirmPurchaseItem;
                    setPurchasing(true);
                    setPurchasePhase('buying');
                    // Preload border image for celebration overlay — prevents empty flash
                    if (item.category === 'border' && item.imageBorder) {
                      preloadImage(item.imageBorder);
                    }
                    try {
                      const headers = getPlayerAuthHeaders();
                      const resp = await fetch(`${API_BASE}/api/inventory/purchase`, {
                        method: 'POST', headers: { 'Content-Type': 'application/json', ...headers },
                        credentials: 'include', body: JSON.stringify({ itemId: item.id, itemType: item.category, price: item.price }),
                      });
                      if (!resp.ok) {
                        const errData = await resp.json().catch(() => ({}));
                        console.error('[Store] Purchase failed:', errData);
                        const msg = errData.error || 'Purchase failed';
                        alert(`Purchase failed: ${msg}`);
                        setPurchasing(false); setPurchasePhase('idle'); setConfirmPurchaseItem(null); return;
                      }
                      const { gold: newGold } = await resp.json();
                      if (onGoldUpdate) onGoldUpdate(newGold);
                      // Use callback to avoid triggering unnecessary re-renders in background store
                      setServerInventory(prev => [...prev, { item_id: item.id, item_type: item.category, source: 'purchase' }]);
                      const p = kitPurchaseItem(item.id, item.price);
                      if (p) setKitEconomy(p);
                    } catch (e) { console.error('[Store] Purchase error:', e); setPurchasing(false); setPurchasePhase('idle'); setConfirmPurchaseItem(null); return; }
                    // Category-specific post-purchase logic
                    if (item.category === 'border') {
                      handleKitEquip('border', item.id);
                      setEquipAnimItem(item);
                      // Phase transition: keep confirm backdrop mounted, start celebration overlay
                      setPurchasePhase('transitioning');
                      setShowEquipAnim(true);
                      // After equip overlay fades in (300ms), unmount confirm modal cleanly
                      setTimeout(() => {
                        setConfirmPurchaseItem(null);
                        setPurchasePhase('idle');
                        setPurchasing(false);
                      }, 350);
                    } else {
                      if (item.category === 'banner') handleKitEquip('banner', item.id);
                      else if (item.category === 'theme') handleKitEquip('theme', item.id);
                      setConfirmPurchaseItem(null);
                      setPurchasing(false);
                      setPurchasePhase('idle');
                    }
                  }} style={{
                    padding: '10px 28px', borderRadius: 12, cursor: purchasing ? 'wait' : 'pointer',
                    background: 'linear-gradient(135deg, #fbbf24, #d97706)', border: 'none',
                    color: '#000', fontSize: 12, fontWeight: 900,
                    boxShadow: '0 0 20px rgba(251,191,36,0.3)', opacity: purchasing ? 0.6 : 1,
                  }}>
                    {purchasing ? 'Buying...' : 'Buy Now'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>, document.body)}

      {/* ── NOT ENOUGH COINS POPUP ── */}
      {showInsufficientFunds &&
        ReactDOM.createPortal(<div onClick={() => setShowInsufficientFunds(null)} style={{
          position: 'fixed', inset: 0, zIndex: 100000,
          /* Android WebView: no backdropFilter → use opaque bg */
          background: 'rgba(0,0,0,0.92)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'linear-gradient(180deg, #14161e 0%, #0c0d14 100%)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 20, padding: '28px 24px', width: '100%', maxWidth: 320,
            textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          }}>
            {/* Sad coin icon */}
            <div style={{ width: 64, height: 64, margin: '0 auto 16px', opacity: 0.6 }}>
              <SystemCoin size={64} />
            </div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', marginBottom: 6 }}>Not Enough Coins</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 16, lineHeight: 1.5 }}>
              You need <span style={{ color: '#fbbf24', fontWeight: 800 }}>{showInsufficientFunds.price.toLocaleString()}</span> coins for <span style={{ color: '#fff', fontWeight: 700 }}>{showInsufficientFunds.name}</span>.
              <br />You currently have <span style={{ color: '#fbbf24', fontWeight: 800 }}>{(gold || 0).toLocaleString()}</span>.
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 20, fontFamily: 'monospace' }}>
              Need {Math.max(0, showInsufficientFunds.price - (gold || 0)).toLocaleString()} more coins
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => setShowInsufficientFunds(null)} style={{
                padding: '10px 24px', borderRadius: 12, cursor: 'pointer',
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 700,
              }}>Close</button>
              <button onClick={() => { setShowInsufficientFunds(null); /* Future: navigate to coin purchase */ }} style={{
                padding: '10px 24px', borderRadius: 12, cursor: 'pointer',
                background: 'linear-gradient(135deg, #fbbf24, #d97706)', border: 'none',
                color: '#000', fontSize: 12, fontWeight: 900,
                boxShadow: '0 0 20px rgba(251,191,36,0.3)',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <SystemCoin size={16} />
                Add Coins
              </button>
            </div>
          </div>
        </div>, document.body)}



      {/* ── BORDER EQUIP ANIMATION OVERLAY ── */}
      <BorderEquipOverlay
        show={showEquipAnim}
        borderItem={equipAnimItem}
        avatarUrl={playerAvatarUrl}
        onComplete={() => {
          setShowEquipAnim(false);
          setEquipAnimItem(null);
        }}
      />

    </div>
  );
};

export default ShopView;


/* ═══ Store Lottie Border Preview ═══ */
const storeLottieCache: Record<string, any> = {};

function StoreLottieBorder({ src, glow }: { src: string; glow: string }) {
  const [data, setData] = useState<any>(storeLottieCache[src] || null);

  useEffect(() => {
    if (storeLottieCache[src]) { setData(storeLottieCache[src]); return; }
    fetch(src).then(r => r.json()).then(d => { storeLottieCache[src] = d; setData(d); }).catch(() => { });
  }, [src]);

  return (
    <div style={{ position: 'relative', width: 96, height: 96 }}>
      {/* Avatar */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        width: 56, height: 56, borderRadius: '50%',
        background: 'radial-gradient(circle, #3a3a4a, #1a1a24)',
        transform: 'translate(-50%, -50%)', zIndex: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}>
        <svg width="40" height="40" viewBox="0 0 40 40">
          <circle cx="20" cy="16" r="7" fill="#555568" />
          <ellipse cx="20" cy="35" rx="13" ry="10" fill="#4a4a5a" />
        </svg>
      </div>
      {/* Lottie overlay */}
      {data && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          width: 96, height: 96, borderRadius: '50%', overflow: 'hidden',
          transform: 'translate(-50%, -50%)', zIndex: 2, pointerEvents: 'none',
          mixBlendMode: 'screen', filter: 'brightness(1.1)',
        }}>
          <div style={{
            position: 'absolute', width: '100%', height: '200%',
            top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          }}>
            <Lottie animationData={data} loop autoplay style={{ width: '100%', height: '100%' }} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════
   KitGlowCard — Premium card for kit items
   ═══════════════════════════════════ */
const KIT_CAT_COLORS: Record<string, string> = {
  border: '#00d4ff', theme: '#8B5CF6', deals: '#F59E0B', banner: '#06B6D4', consumable: '#22C55E', title: '#F59E0B',
};

const KitGlowCard = React.memo(function KitGlowCard({ item, discount, owned, equipped, canAfford, onBuy, onInsufficientFunds, onEquip, onInfo, onView, onCardClick, dealColor }: {
  item: KitStoreItem; discount?: number; owned?: boolean; equipped?: boolean;
  canAfford: boolean; onBuy: () => void; onInsufficientFunds?: () => void; onEquip?: () => void; onInfo?: () => void; onView?: () => void;
  onCardClick?: () => void; dealColor?: string;
}) {
  const catColor = item.tierColor || dealColor || KIT_CAT_COLORS[item.category] || '#00d4ff';
  const finalPrice = discount ? Math.round(item.price * (1 - discount / 100)) : item.price;
  const chipSize = 14;
  const clipPath = `polygon(0 0, calc(100% - ${chipSize}px) 0, 100% ${chipSize}px, 100% 100%, ${chipSize}px 100%, 0 calc(100% - ${chipSize}px))`;

  return (
    /* Layer 1: Outer Glow Wrapper — height:100% for Android WebView (flex+clipPath breaks) */
    <div onClick={() => { if (item.category === 'border' && onCardClick) onCardClick(); }} style={{
      filter: `drop-shadow(0 0 6px ${catColor}30) drop-shadow(0 2px 8px rgba(0,0,0,0.4))`,
      cursor: item.category === 'border' ? 'pointer' : undefined,
      height: '100%',
    }}>
      {/* Layer 2: Gradient Border Frame (3px visible border) */}
      <div style={{
        clipPath,
        padding: 3,
        height: '100%',
        background: `linear-gradient(160deg, ${catColor}CC, ${catColor}50 40%, ${catColor}90 80%, ${catColor}CC)`,
      }}>
        {/* Layer 3: Inner Card Body */}
        <div style={{
          clipPath,
          background: `linear-gradient(160deg, ${catColor}40 0%, ${catColor}22 25%, #111828 55%, #0d1118 100%)`,
          position: 'relative', textAlign: 'center',
          padding: '16px 10px 14px',
          minHeight: 240, height: '100%',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}>

          {/* ── Diagonal Shine Streaks ── */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 1, overflow: 'hidden' }}>
            {/* Primary Shine */}
            <div style={{ position: 'absolute', top: '-80%', left: '-25%', width: '55%', height: '260%', background: 'linear-gradient(72deg, transparent 36%, rgba(255,255,255,0.06) 42%, rgba(255,255,255,0.14) 46%, rgba(255,255,255,0.22) 48%, rgba(255,255,255,0.14) 50%, rgba(255,255,255,0.06) 54%, transparent 60%)', transform: 'rotate(25deg)' }} />
            {/* Secondary Shine */}
            <div style={{ position: 'absolute', top: '-80%', left: '12%', width: '40%', height: '260%', background: 'linear-gradient(72deg, transparent 40%, rgba(255,255,255,0.04) 44%, rgba(255,255,255,0.12) 47%, rgba(255,255,255,0.18) 49%, rgba(255,255,255,0.12) 51%, rgba(255,255,255,0.04) 54%, transparent 58%)', transform: 'rotate(25deg)' }} />
            {/* Tertiary Shine */}
            <div style={{ position: 'absolute', top: '-80%', left: '42%', width: '28%', height: '260%', background: 'linear-gradient(72deg, transparent 44%, rgba(255,255,255,0.03) 47%, rgba(255,255,255,0.08) 49%, rgba(255,255,255,0.03) 51%, transparent 54%)', transform: 'rotate(25deg)' }} />
          </div>

          {/* ── Top Edge Glow Line ── */}
          <div style={{ position: 'absolute', top: 0, left: chipSize, right: chipSize, height: 1.5, background: `linear-gradient(90deg, transparent, ${catColor}BB, transparent)`, zIndex: 2 }} />

          {/* ── Discount Badge ── */}
          {discount && (
            <div style={{
              position: 'absolute', top: 8, left: 8, zIndex: 3,
              padding: '3px 8px', borderRadius: 6,
              background: '#22C55E', fontSize: 9, fontWeight: 900, color: '#000',
              boxShadow: '0 0 10px rgba(34,197,94,0.5)',
            }}>
              -{discount}%
            </div>
          )}

          {/* ── Owned Badge ── */}
          {owned && !equipped && (
            <div style={{
              position: 'absolute', top: 8, left: 8, zIndex: 3,
              padding: '3px 8px', borderRadius: 6,
              background: '#22C55E', fontSize: 8, fontWeight: 900, color: '#000',
              boxShadow: '0 0 10px rgba(34,197,94,0.4)',
              letterSpacing: '0.05em',
            }}>
              OWNED
            </div>
          )}

          {/* ── Info Button ── */}
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

          {/* ── Name & Category (fixed height: single line with ellipsis) ── */}
          <div style={{ position: 'relative', zIndex: 2, marginBottom: 6, marginTop: 0, width: '100%', paddingLeft: 4, paddingRight: 4 }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: '#fff', lineHeight: 1.2, marginBottom: 3, textShadow: '0 2px 8px rgba(0,0,0,0.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {item.name}
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: catColor, textTransform: 'capitalize', opacity: 0.9 }}>
              {item.tier} {item.category}
            </div>
          </div>

          {/* ── Preview Area (STRICT aspect-ratio container — prevents height variance) ── */}
          <div style={{ position: 'relative', zIndex: 2, width: '100%', aspectRatio: '1 / 1', maxHeight: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
            {/* Radial glow behind preview */}
            <div style={{ position: 'absolute', top: '50%', left: '50%', width: 110, height: 110, borderRadius: '50%', background: `radial-gradient(circle, ${catColor}25 0%, ${catColor}08 50%, transparent 70%)`, transform: 'translate(-50%, -50%)' }} />

            {/* ── BORDER: Video (GIF/MP4) ── */}
            {item.category === 'border' && item.videoBorder ? (() => {
              const scale = item.imageScale || 1;
              const baseSize = 72;
              const containerSize = Math.min(Math.round(baseSize * scale), 105);
              const pfpSize = Math.round(42 * (item.imagePfpScale || 1));
              const svgSize = Math.round(30 * (item.imagePfpScale || 1));
              return (
                <div style={{ position: 'relative', width: containerSize, height: containerSize, flexShrink: 0, overflow: 'hidden' }}>
                  {/* Avatar silhouette */}
                  <div style={{ position: 'absolute', top: '50%', left: '50%', width: pfpSize, height: pfpSize, borderRadius: '50%', background: 'radial-gradient(circle, #3a3a4a, #1a1a24)', transform: 'translate(-50%, -50%)', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    <svg width={svgSize} height={svgSize} viewBox="0 0 40 40"><circle cx="20" cy="16" r="7" fill="#555568" /><ellipse cx="20" cy="35" rx="13" ry="10" fill="#4a4a5a" /></svg>
                  </div>
                  {/* Border Video */}
                  <div style={{ position: 'absolute', top: '50%', left: '50%', width: '100%', height: '100%', transform: `translate(-50%, calc(-50% + ${item.imageOffsetY || 0}px))`, zIndex: 2, pointerEvents: 'none', mixBlendMode: 'screen' }}>
                    <BorderVideo src={item.videoBorder} />
                  </div>
                </div>);
            })() : /* ── BORDER: Image-based (PNG) ── */
              item.category === 'border' && item.imageBorder ? (() => {
                const scale = item.imageScale || 1;
                const baseSize = 96;
                // Container grows with scale so the border actually appears bigger
                const containerSize = Math.min(Math.round(baseSize * scale), 140);
                const pfpSize = Math.round(56 * (item.imagePfpScale || 1));
                const svgSize = Math.round(40 * (item.imagePfpScale || 1));
                return (
                  <div style={{ position: 'relative', width: containerSize, height: containerSize, flexShrink: 0, overflow: 'hidden' }}>
                    {/* Avatar silhouette — scales per item via imagePfpScale */}
                    <div style={{ position: 'absolute', top: '50%', left: '50%', width: pfpSize, height: pfpSize, borderRadius: '50%', background: 'radial-gradient(circle, #3a3a4a, #1a1a24)', transform: 'translate(-50%, -50%)', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      <svg width={svgSize} height={svgSize} viewBox="0 0 40 40"><circle cx="20" cy="16" r="7" fill="#555568" /><ellipse cx="20" cy="35" rx="13" ry="10" fill="#4a4a5a" /></svg>
                    </div>
                    {/* Border frame image — fills the container */}
                    {item.imageAnimated && item.imageAnimationType === 'pulse' ? (
                      <div style={{ position: 'absolute', top: '50%', left: '50%', width: '100%', height: '100%', zIndex: 2, pointerEvents: 'none', animation: 'border-breathe-centered 3s ease-in-out infinite' }}>
                        <FadeImg src={item.imageBorder} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      </div>
                    ) : (
                      <FadeImg src={item.imageBorder} alt={item.name} style={{ position: 'absolute', top: '50%', left: '50%', width: '100%', height: '100%', transform: `translate(-50%, calc(-50% + ${item.imageOffsetY || 0}px))`, objectFit: 'contain', zIndex: 2, pointerEvents: 'none', ...(item.imageAnimated ? { animation: 'spin-clockwise 10s linear infinite' } : {}) }} />
                    )}
                  </div>);
              })() : item.category === 'border' && item.lottieBorder ? (
                <StoreLottieBorder src={item.lottieBorder} glow={item.borderConfig?.glowColor || '#C8A84E'} />
              ) : item.category === 'border' && item.auraConfig ? (
                /* ── BORDER: CSS Aura glow (full spec) ── */
                <div style={{ position: 'relative', width: 96, height: 96, flexShrink: 0, overflow: 'hidden' }}>
                  {/* Ambient glow */}
                  <div style={{ position: 'absolute', top: '50%', left: '50%', width: 120, height: 120, borderRadius: '50%', background: `radial-gradient(circle, ${item.auraConfig.colors[0]}30 0%, ${(item.auraConfig.colors[1] || item.auraConfig.colors[0])}15 40%, transparent 70%)`, transform: 'translate(-50%, -50%)', animation: item.auraConfig.animated ? `pulse-glow ${item.auraConfig.pulseSpeed || 3}s ease-in-out infinite` : undefined }} />
                  {/* Main aura ring */}
                  <div style={{ position: 'absolute', top: '50%', left: '50%', width: 82, height: 82, borderRadius: '50%', transform: 'translate(-50%, -50%)', border: `3px solid ${item.auraConfig.colors[0]}CC`, boxShadow: `0 0 6px 2px ${item.auraConfig.colors[0]}AA, 0 0 14px 4px ${item.auraConfig.colors[0]}70, 0 0 24px 6px ${(item.auraConfig.colors[1] || item.auraConfig.colors[0])}50, 0 0 40px 10px ${(item.auraConfig.colors[2] || item.auraConfig.colors[0])}35, 0 0 60px 14px ${(item.auraConfig.colors[3] || item.auraConfig.colors[1] || item.auraConfig.colors[0])}20, inset 0 0 10px 3px ${item.auraConfig.colors[0]}40, inset 0 0 20px 6px ${(item.auraConfig.colors[1] || item.auraConfig.colors[0])}25`, animation: item.auraConfig.animated ? 'aura-rotate 8s linear infinite' : undefined, zIndex: 1 }} />
                  {/* Outer glow ring */}
                  <div style={{ position: 'absolute', top: '50%', left: '50%', width: 90, height: 90, borderRadius: '50%', transform: 'translate(-50%, -50%)', border: `1.5px solid ${(item.auraConfig.colors[1] || item.auraConfig.colors[0])}50`, boxShadow: `0 0 12px 3px ${(item.auraConfig.colors[1] || item.auraConfig.colors[0])}40, 0 0 30px 8px ${(item.auraConfig.colors[2] || item.auraConfig.colors[0])}20`, animation: item.auraConfig.animated ? `pulse-glow ${item.auraConfig.pulseSpeed || 3}s ease-in-out infinite` : undefined, zIndex: 1 }} />
                  {/* Center avatar */}
                  <div style={{ position: 'absolute', top: '50%', left: '50%', width: 56, height: 56, borderRadius: '50%', background: 'radial-gradient(circle, #2a2a3a, #1a1a24)', transform: 'translate(-50%, -50%)', zIndex: 3, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 8px ${item.auraConfig.colors[0]}80, inset 0 0 6px ${item.auraConfig.colors[0]}30` }}>
                    <svg width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="16" r="7" fill="#555568" /><ellipse cx="20" cy="35" rx="13" ry="10" fill="#4a4a5a" /></svg>
                  </div>
                </div>
              ) : item.category === 'border' && item.borderConfig ? (
                <BorderRing config={item.borderConfig} size={90} />
              ) : null}

            {/* ── THEME swatch ── */}
            {item.category === 'theme' && item.themeVars && (
              <div style={{ width: '90%' }}><ThemeSwatch themeVars={item.themeVars} /></div>
            )}
            {/* ── BANNER image ── */}
            {item.category === 'banner' && item.bannerImage && (
              <div style={{ width: '90%', aspectRatio: '16/9', borderRadius: 10, overflow: 'hidden', border: `1px solid ${catColor}30` }}>
                <FadeImg src={item.bannerImage} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}
          </div>

          {/* ── Bottom: Buy + View ── */}
          <div style={{ position: 'relative', zIndex: 2, marginTop: 'auto', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            {owned ? (
              onEquip ? (
                <button onClick={(e) => { e.stopPropagation(); onEquip(); }} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '8px 24px', border: 'none', cursor: 'pointer', borderRadius: 20,
                  background: equipped ? `linear-gradient(135deg, ${catColor}, ${catColor}CC)` : 'rgba(255,255,255,0.08)',
                  color: equipped ? '#000' : catColor,
                  fontSize: 11, fontWeight: 800, letterSpacing: 0.5,
                  boxShadow: equipped ? `0 0 14px ${catColor}50` : 'none',
                  transition: 'all 0.2s',
                }}>
                  {equipped ? '✓ EQUIPPED' : 'EQUIP'}
                </button>
              ) : (
                <span style={{ fontSize: 11, fontWeight: 700, color: '#22C55E' }}>✓ Owned</span>
              )
            ) : (
              <button onClick={(e) => { e.stopPropagation(); if (canAfford) { onBuy(); } else if (onInsufficientFunds) { onInsufficientFunds(); } }} style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '5px 14px', borderRadius: 16, cursor: 'pointer',
                background: `linear-gradient(135deg, ${catColor}35, ${catColor}15)`,
                border: `1.5px solid ${catColor}60`,
                color: '#fff',
                fontSize: 11, fontWeight: 800,
                boxShadow: `0 0 10px ${catColor}20`,
                transition: 'all 0.2s',
              }}>
                {discount && <span style={{ textDecoration: 'line-through', opacity: 0.35, fontSize: 9 }}>{item.price}</span>}
                <SystemCoin size={15} />
                <span style={{ fontSize: 12 }}>{finalPrice}</span>
              </button>
            )}

            {/* ── View button (below buy, always visible for borders) ── */}
            {item.category === 'border' && onView && (
              <button onClick={(e) => { e.stopPropagation(); onView(); }} style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '5px 16px', borderRadius: 14, cursor: 'pointer',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.45)',
                fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
                transition: 'all 0.2s',
              }}>
                <Eye size={11} />
                View
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});


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

  return ReactDOM.createPortal(
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 100000,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      overflow: 'auto', paddingTop: 40, paddingBottom: 60,
      background: 'rgba(0,0,0,0.92)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      animation: 'fadeIn 0.25s ease-out',
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
    </div>,
    document.body
  );
}


/* ═══════════════════════════════════
   KitBorderPreviewModal
   ═══════════════════════════════════ */
function KitBorderPreviewModal({ item, onClose, owned, equipped, canAfford, onBuy, onEquip }: {
  item: KitStoreItem; onClose: () => void;
  owned?: boolean; equipped?: boolean; canAfford?: boolean;
  onBuy?: () => void; onEquip?: () => void;
}) {
  const glow = item.borderConfig?.glowColor || item.auraConfig?.colors?.[0] || '#C8A84E';
  const previewSize = 240;
  const wrapperSize = previewSize + 40;
  const pfpSize = previewSize * 0.4;

  return ReactDOM.createPortal(
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 100000,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.96)',
      animation: 'fadeIn 0.25s ease-out',
    }}>
      <button onClick={onClose} style={{
        position: 'fixed', top: 16, right: 16, zIndex: 100001,
        width: 36, height: 36, borderRadius: '50%',
        background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
        color: 'rgba(255,255,255,0.6)', fontSize: 18, fontWeight: 400,
        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
      }}>✕</button>

      <div onClick={e => e.stopPropagation()} style={{
        textAlign: 'center', maxWidth: 340, width: '88%',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '20px 0',
      }}>
        <div style={{ fontSize: 24, fontWeight: 900, color: '#fff', marginBottom: 4, textShadow: `0 0 20px ${glow}40` }}>{item.name}</div>
        <div style={{
          fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
          marginBottom: 24, padding: '3px 12px', borderRadius: 6,
          color: glow, background: `${glow}15`, border: `1px solid ${glow}25`,
        }}>
          {item.tier} Border
        </div>

        {/* Border Preview - fixed frame, no imageScale */}
        <div style={{ position: 'relative', width: wrapperSize, height: wrapperSize, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'visible', marginBottom: 8 }}>
          <div style={{ position: 'absolute', top: '50%', left: '50%', width: wrapperSize, height: wrapperSize, borderRadius: '50%', background: `radial-gradient(circle, ${glow}30 0%, ${glow}10 45%, transparent 70%)`, transform: 'translate(-50%, -50%)', pointerEvents: 'none' }} />

          {item.videoBorder ? (
            <div style={{ position: 'relative', width: previewSize, height: previewSize, overflow: 'visible' }}>
              <div style={{ position: 'absolute', top: '50%', left: '50%', width: pfpSize, height: pfpSize, borderRadius: '50%', background: 'radial-gradient(circle, #3a3a4a, #1a1a24)', transform: 'translate(-50%, -50%)', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                <svg width="70" height="70" viewBox="0 0 40 40"><circle cx="20" cy="16" r="7" fill="#555568" /><ellipse cx="20" cy="35" rx="13" ry="10" fill="#4a4a5a" /></svg>
              </div>
              <div style={{ position: 'absolute', top: '50%', left: '50%', width: '100%', height: '100%', transform: 'translate(-50%, -50%)', zIndex: 2, pointerEvents: 'none', mixBlendMode: 'screen' }}>
                <BorderVideo src={item.videoBorder} />
              </div>
            </div>
          ) : item.imageBorder ? (
            <div style={{ position: 'relative', width: previewSize, height: previewSize }}>
              {(() => {
                const bdrScale = (item as any).previewBorderScale || 1;
                const pfpScale = (item as any).previewPfpScale || 0.4;
                const thisPfp = previewSize * pfpScale;
                const bdrPx = previewSize * bdrScale;
                return (<>
                  <div style={{ position: 'absolute', top: '50%', left: '50%', width: thisPfp, height: thisPfp, borderRadius: '50%', background: 'radial-gradient(circle, #3a3a4a, #1a1a24)', transform: 'translate(-50%, -50%)', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    <svg width="70" height="70" viewBox="0 0 40 40"><circle cx="20" cy="16" r="7" fill="#555568" /><ellipse cx="20" cy="35" rx="13" ry="10" fill="#4a4a5a" /></svg>
                  </div>
                  {item.imageAnimated && item.imageAnimationType === 'pulse' ? (
                    <div style={{ position: 'absolute', top: '50%', left: '50%', width: bdrPx, height: bdrPx, transform: 'translate(-50%, -50%)', zIndex: 2, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'border-breathe-centered 3s ease-in-out infinite' }}>
                      <FadeImg src={item.imageBorder} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                  ) : (
                    <FadeImg src={item.imageBorder} alt={item.name} style={{ position: 'absolute', top: '50%', left: '50%', width: bdrPx, height: bdrPx, transform: 'translate(-50%, -50%)', objectFit: 'contain', zIndex: 2, pointerEvents: 'none', ...(item.imageAnimated ? { animation: 'spin-clockwise 10s linear infinite' } : {}) }} />
                  )}
                </>);
              })()}
            </div>
          ) : item.lottieBorder ? (
            <StoreLottieBorder src={item.lottieBorder} glow={glow} />
          ) : item.auraConfig ? (
            <div style={{ position: 'relative', width: previewSize, height: previewSize, overflow: 'visible' }}>
              <div style={{ position: 'absolute', top: '50%', left: '50%', width: previewSize + 20, height: previewSize + 20, borderRadius: '50%', background: `radial-gradient(circle, ${item.auraConfig.colors[0]}30 0%, ${(item.auraConfig.colors[1] || item.auraConfig.colors[0])}15 40%, transparent 70%)`, transform: 'translate(-50%, -50%)', animation: item.auraConfig.animated ? `pulse-glow ${item.auraConfig.pulseSpeed || 3}s ease-in-out infinite` : undefined }} />
              <div style={{ position: 'absolute', top: '50%', left: '50%', width: previewSize * 0.75, height: previewSize * 0.75, borderRadius: '50%', transform: 'translate(-50%, -50%)', border: `3px solid ${item.auraConfig.colors[0]}CC`, boxShadow: `0 0 8px 3px ${item.auraConfig.colors[0]}AA, 0 0 20px 6px ${item.auraConfig.colors[0]}70, 0 0 36px 10px ${(item.auraConfig.colors[1] || item.auraConfig.colors[0])}50, 0 0 60px 16px ${(item.auraConfig.colors[2] || item.auraConfig.colors[0])}35, inset 0 0 14px 4px ${item.auraConfig.colors[0]}40, inset 0 0 28px 8px ${(item.auraConfig.colors[1] || item.auraConfig.colors[0])}25`, animation: item.auraConfig.animated ? 'aura-rotate 8s linear infinite' : undefined, zIndex: 1 }} />
              <div style={{ position: 'absolute', top: '50%', left: '50%', width: previewSize * 0.82, height: previewSize * 0.82, borderRadius: '50%', transform: 'translate(-50%, -50%)', border: `1.5px solid ${(item.auraConfig.colors[1] || item.auraConfig.colors[0])}50`, boxShadow: `0 0 16px 4px ${(item.auraConfig.colors[1] || item.auraConfig.colors[0])}40, 0 0 40px 10px ${(item.auraConfig.colors[2] || item.auraConfig.colors[0])}20`, animation: item.auraConfig.animated ? `pulse-glow ${item.auraConfig.pulseSpeed || 3}s ease-in-out infinite` : undefined, zIndex: 1 }} />
              <div style={{ position: 'absolute', top: '50%', left: '50%', width: previewSize * 0.6, height: previewSize * 0.6, borderRadius: '50%', background: 'radial-gradient(circle, #2a2a3a, #1a1a24)', transform: 'translate(-50%, -50%)', zIndex: 3, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 12px ${item.auraConfig.colors[0]}80, inset 0 0 8px ${item.auraConfig.colors[0]}30` }}>
                <svg width="80" height="80" viewBox="0 0 40 40"><circle cx="20" cy="16" r="7" fill="#555568" /><ellipse cx="20" cy="35" rx="13" ry="10" fill="#4a4a5a" /></svg>
              </div>
            </div>
          ) : item.borderConfig ? (
            <BorderRing config={item.borderConfig} size={previewSize * 0.8} />
          ) : null}
        </div>

        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginTop: 12, maxWidth: 280, lineHeight: 1.6, fontStyle: 'italic' }}>
          {item.description}
        </div>
        <div style={{ width: 60, height: 1, background: `linear-gradient(90deg, transparent, ${glow}60, transparent)`, margin: '20px 0' }} />
        <div style={{ display: 'flex', gap: 10, width: '100%', justifyContent: 'center' }}>
          {owned ? (
            onEquip ? (
              <button onClick={onEquip} style={{
                padding: '12px 40px', borderRadius: 14, cursor: 'pointer', border: 'none',
                background: equipped ? `linear-gradient(135deg, ${glow}, ${glow}CC)` : 'rgba(255,255,255,0.08)',
                color: equipped ? '#000' : glow,
                fontSize: 13, fontWeight: 900, letterSpacing: 0.5,
                boxShadow: equipped ? `0 0 20px ${glow}50` : 'none',
                transition: 'all 0.2s',
              }}>
                {equipped ? '✓ EQUIPPED' : 'EQUIP'}
              </button>
            ) : (
              <span style={{ fontSize: 13, fontWeight: 700, color: '#22C55E' }}>✓ Owned</span>
            )
          ) : onBuy ? (
            <button onClick={onBuy} disabled={!canAfford} style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '12px 32px', borderRadius: 14, cursor: canAfford ? 'pointer' : 'default',
              background: canAfford ? `linear-gradient(135deg, ${glow}50, ${glow}25)` : 'rgba(255,255,255,0.04)',
              border: canAfford ? `2px solid ${glow}80` : '2px solid rgba(255,255,255,0.08)',
              color: canAfford ? '#fff' : 'rgba(255,255,255,0.35)',
              fontSize: 14, fontWeight: 900,
              boxShadow: canAfford ? `0 0 16px ${glow}30` : 'none',
              transition: 'all 0.2s', opacity: canAfford ? 1 : 0.5,
            }}>
              <Lock size={14} color={canAfford ? '#fbbf24' : '#555'} />
              <SystemCoin size={22} />
              <span>{item.price}</span>
            </button>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}

