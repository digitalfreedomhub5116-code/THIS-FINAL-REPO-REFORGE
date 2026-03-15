
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Coins, Timer, Key, CheckCircle2, Lock } from 'lucide-react';
import { ShopItem } from '../types';

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

const LOGIN_REWARDS = [
  { day: 1, emoji: '🪙', label: '100 G',   rarity: 'COMMON'    },
  { day: 2, emoji: '🧪', label: '×1',      rarity: 'COMMON'    },
  { day: 3, emoji: '🪙', label: '200 G',   rarity: 'COMMON'    },
  { day: 4, emoji: '📜', label: '×1',      rarity: 'RARE'      },
  { day: 5, emoji: '🧪', label: '×2',      rarity: 'COMMON'    },
  { day: 6, emoji: '🪙', label: '400 G',   rarity: 'COMMON'    },
  { day: 7, emoji: '🗝️', label: '×1 KEY',  rarity: 'RARE'      },
  { day: 8, emoji: '🧪', label: '×1',      rarity: 'COMMON'    },
  { day: 9, emoji: '🪙', label: '300 G',   rarity: 'COMMON'    },
  { day: 10, emoji: '📜', label: '×2',     rarity: 'RARE'      },
  { day: 11, emoji: '🪙', label: '500 G',  rarity: 'COMMON'    },
  { day: 12, emoji: '🗝️', label: '×2 KEYS', rarity: 'RARE'     },
  { day: 13, emoji: '🧪', label: '×3',     rarity: 'RARE'      },
  { day: 14, emoji: '⚡', label: '×1 ORB', rarity: 'LEGENDARY' },
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
}) => {
  const [timeUntilFree, setTimeUntilFree] = useState<number>(0);
  const [buyingItem, setBuyingItem] = useState<string | null>(null);
  const [dungeonHighlightActive, setDungeonHighlightActive] = useState(false);
  const dungeonRef = useRef<HTMLDivElement>(null);

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
  const currentStreakDay = Math.max(1, ((streak - 1) % 14) + 1);

  return (
    <div id="tut-store" className="space-y-5 pb-10">

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
        className="relative w-full rounded-2xl overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0a0a1a 0%, #0d0d25 50%, #0a0a1a 100%)', border: '1px solid rgba(139,92,246,0.2)' }}
      >
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(139,92,246,0.12) 0%, transparent 65%)' }} />
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.5), rgba(0,210,255,0.5), transparent)' }} />

        <div className="relative p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[9px] font-mono font-bold tracking-[0.3em] uppercase text-purple-400 mb-0.5">STREAK REWARD</div>
              <h3 className="text-base font-black text-white font-mono uppercase tracking-wide">Login Rewards</h3>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-xs font-bold"
              style={{ background: claimedToday ? 'rgba(34,197,94,0.1)' : 'rgba(139,92,246,0.15)', border: claimedToday ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(139,92,246,0.3)', color: claimedToday ? '#4ade80' : '#c4b5fd' }}
            >
              {claimedToday ? <><CheckCircle2 size={11} /> Claimed</> : <><span className="text-[10px]">Day</span> {streak || 1}</>}
            </div>
          </div>

          {/* 7-day reward track (Scrollable) */}
          <div 
             className={`flex gap-1.5 overflow-x-auto pb-2 snap-x ${!claimedToday ? 'cursor-pointer' : ''}`} 
             style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
             onClick={!claimedToday ? onOpenDailyCalendar : undefined}
          >
            {LOGIN_REWARDS.map((reward) => {
              const dayNum   = reward.day;
              const isCurrent = dayNum === currentStreakDay;
              const isClaimed = claimedToday ? dayNum <= currentStreakDay : dayNum < currentStreakDay;
              const isFuture  = dayNum > currentStreakDay;
              const rStyle    = RARITY_STYLES[reward.rarity];

              return (
                <div
                  key={dayNum}
                  className="flex flex-col items-center gap-1 rounded-xl p-1.5 relative shrink-0 snap-start w-12"
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

                  <div className="relative">
                    {isClaimed ? (
                      <div className="text-base leading-none opacity-50">{reward.emoji}</div>
                    ) : isFuture ? (
                      <Lock size={14} className="text-gray-600 my-0.5" />
                    ) : (
                      <div className="text-base leading-none">{reward.emoji}</div>
                    )}
                    {isClaimed && (
                      <div className="absolute -top-1 -right-1">
                        <CheckCircle2 size={10} className="text-green-400" />
                      </div>
                    )}
                  </div>

                  <div className="font-mono text-[8px] font-bold text-center leading-tight"
                    style={{ color: isClaimed ? '#4ade80' : isCurrent ? rStyle.text : '#6b7280' }}
                  >
                    {reward.label}
                  </div>

                  <div className="font-mono text-[7px] tracking-widest uppercase"
                    style={{ color: isClaimed ? 'rgba(74,222,128,0.5)' : isFuture ? '#374151' : '#6b7280' }}
                  >
                    D{dayNum}
                  </div>

                  {isCurrent && !claimedToday && (
                    <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 bg-purple-500 text-[7px] font-black font-mono text-white px-1.5 py-0.5 rounded-full uppercase tracking-wide whitespace-nowrap">
                      TODAY
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-3 text-center text-[10px] font-mono text-gray-600">
            Log in daily to advance your streak — rare rewards await at day 7, 12 &amp; 14
          </div>
        </div>
      </motion.div>

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
