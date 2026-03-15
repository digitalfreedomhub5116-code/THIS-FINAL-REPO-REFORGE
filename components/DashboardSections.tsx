import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Lock, Coins, Flame,
  Sword, Clock, Crown, ChevronRight as Arrow,
  Dumbbell, CheckCircle2, XCircle, Sparkles, Target, Terminal
} from 'lucide-react';
import { PlayerData, HealthProfile, Tab } from '../types';

const CLOUDINARY = 'https://res.cloudinary.com/dcnqnbvp0/video/upload';

interface DashboardSectionsProps {
  player: PlayerData;
  healthProfile?: HealthProfile;
  onNavigate: (tab: Tab) => void;
  onUnlockOutfit?: (outfitId: string, cost: number) => void;
  onSetActiveOutfit?: (outfitId: string) => void;
  onCompleteWorkout?: () => void;
  onFailWorkout?: () => void;
  onCompleteQuest?: (questId: string) => void;
  onOpenDuskChat?: () => void;
  unreadCount?: number;
}

const OUTFITS = [
  {
    id: 'default',
    name: 'Hunter Standard',
    subtitle: 'Rank E Issue',
    cost: 0,
    bg: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    accent: '#6b7280',
    glowColor: 'rgba(107,114,128,0.3)',
    symbol: '⚔',
  },
  {
    id: 'night_crawler',
    name: 'Night Crawler',
    subtitle: 'Shadow Division',
    cost: 500,
    bg: 'linear-gradient(135deg, #0f0c29 0%, #1a0533 50%, #24243e 100%)',
    accent: '#8b5cf6',
    glowColor: 'rgba(139,92,246,0.4)',
    symbol: '🌙',
  },
  {
    id: 'void_walker',
    name: 'Void Walker',
    subtitle: 'Dimensional Rift',
    cost: 1000,
    bg: 'linear-gradient(135deg, #000000 0%, #09090f 50%, #1a0a2e 100%)',
    accent: '#00d2ff',
    glowColor: 'rgba(0,210,255,0.4)',
    symbol: '◈',
  },
  {
    id: 'shadow_knight',
    name: 'Shadow Knight',
    subtitle: 'Dungeon Conqueror',
    cost: 2000,
    bg: 'linear-gradient(135deg, #1a0000 0%, #2d0000 50%, #4a0000 100%)',
    accent: '#ef4444',
    glowColor: 'rgba(239,68,68,0.4)',
    symbol: '🔥',
  },
  {
    id: 'celestial',
    name: 'Celestial',
    subtitle: 'S-Rank Awakened',
    cost: 5000,
    bg: 'linear-gradient(135deg, #1a1400 0%, #2d2200 50%, #4a3800 100%)',
    accent: '#f59e0b',
    glowColor: 'rgba(245,158,11,0.4)',
    symbol: '★',
  },
];

const RANKS = ['E', 'D', 'C', 'B', 'A', 'S'] as const;
const RANK_LEVEL_THRESHOLDS = { E: 10, D: 25, C: 40, B: 60, A: 80, S: Infinity };
const RANK_MIN_LEVEL = { E: 1, D: 11, C: 26, B: 41, A: 61, S: 81 };
const RANK_COLORS = {
  E: { text: 'text-gray-400', border: 'border-gray-600', bg: 'bg-gray-800', glow: 'shadow-[0_0_15px_rgba(107,114,128,0.5)]', hex: '#9ca3af' },
  D: { text: 'text-green-400', border: 'border-green-700', bg: 'bg-green-900/30', glow: 'shadow-[0_0_15px_rgba(34,197,94,0.4)]', hex: '#4ade80' },
  C: { text: 'text-blue-400', border: 'border-blue-700', bg: 'bg-blue-900/30', glow: 'shadow-[0_0_15px_rgba(59,130,246,0.4)]', hex: '#60a5fa' },
  B: { text: 'text-purple-400', border: 'border-purple-700', bg: 'bg-purple-900/30', glow: 'shadow-[0_0_15px_rgba(139,92,246,0.4)]', hex: '#a78bfa' },
  A: { text: 'text-yellow-400', border: 'border-yellow-700', bg: 'bg-yellow-900/30', glow: 'shadow-[0_0_15px_rgba(234,179,8,0.4)]', hex: '#facc15' },
  S: { text: 'text-red-400', border: 'border-red-600', bg: 'bg-red-900/30', glow: 'shadow-[0_0_20px_rgba(239,68,68,0.6)]', hex: '#f87171' },
};

function useCountdown(targetMs: number) {
  const [remaining, setRemaining] = useState(Math.max(0, targetMs - Date.now()));
  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(Math.max(0, targetMs - Date.now()));
    }, 1000);
    return () => clearInterval(interval);
  }, [targetMs]);
  return remaining;
}

function formatTime(ms: number) {
  const totalSecs = Math.floor(ms / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const CATEGORY_COLORS: Record<string, string> = {
  strength: 'text-red-400',
  intelligence: 'text-blue-400',
  discipline: 'text-purple-400',
  social: 'text-yellow-400',
};

export const DashboardSections: React.FC<DashboardSectionsProps> = ({
  player,
  healthProfile,
  onNavigate,
  onUnlockOutfit,
  onSetActiveOutfit,
  onCompleteWorkout,
  onFailWorkout,
  onCompleteQuest,
  onOpenDuskChat,
  unreadCount,
}) => {
  const [outfitIndex, setOutfitIndex] = useState(() => {
    const idx = OUTFITS.findIndex(o => o.id === player.activeOutfit);
    return idx >= 0 ? idx : 0;
  });

  const outfit = OUTFITS[outfitIndex];
  const isOwned = (player.ownedOutfits || ['default']).includes(outfit.id);
  const isActive = player.activeOutfit === outfit.id;

  const currentRank = player.rank;
  const rankIdx = RANKS.indexOf(currentRank);
  const nextRank = rankIdx < RANKS.length - 1 ? RANKS[rankIdx + 1] : null;
  const minLevel = RANK_MIN_LEVEL[currentRank];
  const maxLevel = RANK_LEVEL_THRESHOLDS[currentRank];
  const rankProgress = maxLevel === Infinity
    ? 100
    : Math.min(((player.level - minLevel) / (maxLevel - minLevel + 1)) * 100, 100);

  const DUNGEON_COOLDOWN = 24 * 60 * 60 * 1000;
  const lastEntry = player.lastDungeonEntry || 0;
  const dungeonReadyAt = lastEntry + DUNGEON_COOLDOWN;
  const dungeonCooldownRemaining = useCountdown(dungeonReadyAt);
  const isDungeonReady = dungeonCooldownRemaining <= 0;

  const todayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];
  const todayWorkout = healthProfile?.workoutPlan?.find(w =>
    w.day?.toLowerCase().includes(todayName.toLowerCase().slice(0, 3))
  ) || healthProfile?.workoutPlan?.[new Date().getDay() % (healthProfile.workoutPlan.length || 1)];

  const activeQuests = (player.quests || [])
    .filter(q => !q.isCompleted && !q.failed)
    .slice(0, 3);

  return (
    <div className="space-y-4">

      {/* ── OUTFIT CAROUSEL ─────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.06]" style={{ background: outfit.bg, boxShadow: `0 0 60px ${outfit.glowColor}, inset 0 0 40px rgba(0,0,0,0.5)` }}>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
        <div className="absolute top-0 left-0 w-full h-[1px] opacity-40" style={{ background: `linear-gradient(90deg, transparent, ${outfit.accent}, transparent)` }} />

        {/* Carousel Navigation */}
        <button
          onClick={() => setOutfitIndex(i => (i - 1 + OUTFITS.length) % OUTFITS.length)}
          className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/50 border border-white/10 flex items-center justify-center hover:bg-black/70 transition-colors"
        >
          <ChevronLeft size={16} className="text-white" />
        </button>
        <button
          onClick={() => setOutfitIndex(i => (i + 1) % OUTFITS.length)}
          className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/50 border border-white/10 flex items-center justify-center hover:bg-black/70 transition-colors"
        >
          <ChevronRight size={16} className="text-white" />
        </button>

        <div className="px-12 py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={outfit.id}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
              className="flex items-center gap-6"
            >
              {/* Outfit Symbol */}
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl border flex-shrink-0 relative overflow-hidden"
                style={{ borderColor: outfit.accent + '40', boxShadow: `0 0 30px ${outfit.glowColor}` }}
              >
                <div className="absolute inset-0 opacity-20" style={{ background: `radial-gradient(circle, ${outfit.accent}, transparent)` }} />
                <span className="relative z-10">{outfit.symbol}</span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="text-[9px] font-mono tracking-[0.25em] uppercase mb-0.5" style={{ color: outfit.accent }}>
                  {outfit.subtitle}
                </div>
                <div className="text-xl font-black text-white tracking-tight truncate">{outfit.name}</div>
                <div className="flex items-center gap-2 mt-2">
                  {outfit.cost === 0 ? (
                    <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">Default Issue</span>
                  ) : (
                    <span className="text-[10px] font-mono tracking-widest flex items-center gap-1" style={{ color: outfit.accent }}>
                      <Coins size={10} /> {outfit.cost.toLocaleString()} GOLD
                    </span>
                  )}
                </div>
              </div>

              {/* Lock / Activate Button */}
              <div className="flex-shrink-0">
                {!isOwned ? (
                  <button
                    onClick={() => onUnlockOutfit?.(outfit.id, outfit.cost)}
                    disabled={(player.gold || 0) < outfit.cost}
                    className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl border transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      borderColor: outfit.accent + '40',
                      background: `${outfit.accent}15`,
                      color: outfit.accent,
                    }}
                  >
                    <Lock size={14} />
                    <span className="text-[9px] font-mono font-bold tracking-widest">UNLOCK</span>
                  </button>
                ) : isActive ? (
                  <div
                    className="px-3 py-2 rounded-xl text-[10px] font-mono font-bold tracking-widest border"
                    style={{ borderColor: outfit.accent + '60', color: outfit.accent, background: `${outfit.accent}20` }}
                  >
                    EQUIPPED
                  </div>
                ) : (
                  <button
                    onClick={() => onSetActiveOutfit?.(outfit.id)}
                    className="px-3 py-2 rounded-xl text-[10px] font-mono font-bold tracking-widest border border-white/20 text-white hover:bg-white/10 transition-colors"
                  >
                    EQUIP
                  </button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Dot indicators */}
          <div className="flex justify-center gap-1.5 mt-4">
            {OUTFITS.map((o, i) => (
              <button
                key={o.id}
                onClick={() => setOutfitIndex(i)}
                className="transition-all"
                style={{
                  width: i === outfitIndex ? 20 : 6,
                  height: 6,
                  borderRadius: 3,
                  background: i === outfitIndex ? outfit.accent : 'rgba(255,255,255,0.15)',
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── DUSK WIDGET ───────────────────────────── */}
      <button
        onClick={onOpenDuskChat}
        className="w-full relative rounded-2xl overflow-hidden h-[90px] flex items-center gap-4 px-5 text-left group transition-all duration-300"
        style={{
          border: '1px solid rgba(0,210,255,0.2)',
          background: 'rgba(0,210,255,0.04)',
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(0,210,255,0.4)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(0,210,255,0.2)')}
      >
        <video
          autoPlay loop muted playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-25 group-hover:opacity-35 transition-opacity"
          src={`${CLOUDINARY}/f_auto,q_auto,w_600/v1770828792/Animate_the_blue_202602112220_fete1_dsjvdd.mp4`}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-transparent" />
        <div className="relative z-10 flex items-center gap-4 w-full">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(0,210,255,0.1)', border: '1px solid rgba(0,210,255,0.4)' }}
          >
            <Terminal size={18} className="text-system-neon" />
          </div>
          <div className="flex-1">
            <div className="text-xs font-black text-white uppercase tracking-wider">DUSK</div>
            <div className="text-[9px] text-system-neon font-mono tracking-widest">// ACCOUNTABILITY PARTNER</div>
          </div>
          {(unreadCount ?? 0) > 0 && (
            <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-[10px] font-black text-white shadow-[0_0_10px_rgba(239,68,68,0.6)] animate-pulse">
              {unreadCount}
            </div>
          )}
        </div>
      </button>

      {/* ── RANK OVERVIEW ───────────────────────────── */}
      <div id="tut-rank" className="relative overflow-hidden rounded-2xl p-5" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(8,8,20,0.80) 12%, rgba(4,4,14,0.90) 100%)', backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)', borderTop: '1px solid rgba(255,255,255,0.12)', borderLeft: '1px solid rgba(255,255,255,0.07)', borderRight: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.03)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07), inset 0 -1px 0 rgba(0,0,0,0.3), 0 8px 28px rgba(0,0,0,0.45)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Crown size={14} className="text-yellow-500" />
            <span className="text-[10px] font-mono font-bold text-gray-400 tracking-widest uppercase">Rank Progression</span>
          </div>
          <span className="text-[10px] font-mono text-gray-500">LVL {player.level}</span>
        </div>

        <div className="flex items-center justify-between mb-4">
          {RANKS.map((r, i) => {
            const colors = RANK_COLORS[r];
            const isCurrent = r === currentRank;
            const isPast = RANKS.indexOf(r) < rankIdx;
            return (
              <div key={r} className="flex items-center">
                <div className={`relative flex flex-col items-center`}>
                  <div
                    className={`w-9 h-9 rounded-full border-2 flex items-center justify-center font-black text-sm font-mono transition-all ${
                      isCurrent
                        ? `${colors.text} ${colors.border} ${colors.bg} ${colors.glow}`
                        : isPast
                        ? 'text-gray-600 border-gray-700 bg-gray-900'
                        : 'text-gray-700 border-gray-800 bg-black'
                    }`}
                  >
                    {r}
                  </div>
                  {isCurrent && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-3 h-3 rounded-full flex items-center justify-center"
                      style={{ background: RANK_COLORS[r].bg.replace('/30', '') }}
                    >
                      <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: RANK_COLORS[currentRank].text.replace('text-', '') }} />
                    </motion.div>
                  )}
                </div>
                {i < RANKS.length - 1 && (
                  <div className="w-4 sm:w-6 h-[2px] mx-0.5 relative">
                    <div className="absolute inset-0 bg-gray-800 rounded" />
                    {isPast && <div className="absolute inset-0 rounded" style={{ background: RANK_COLORS[RANKS[i] as typeof currentRank]?.text.replace('text-', '') || '#6b7280' }} />}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Progress within current rank */}
        <div className="space-y-2">
          <div className="flex justify-between text-[10px] font-mono">
            <span className={RANK_COLORS[currentRank].text}>
              {currentRank}-RANK HUNTER
            </span>
            <span className="text-gray-500">
              {nextRank ? `→ ${nextRank}-RANK at LVL ${RANK_LEVEL_THRESHOLDS[currentRank] + 1}` : 'MAX RANK ACHIEVED'}
            </span>
          </div>
          <div className="h-2 bg-black rounded-full overflow-hidden border border-gray-800">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${rankProgress}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full rounded-full relative"
              style={{ background: `linear-gradient(90deg, ${RANK_COLORS[currentRank].hex}, ${nextRank ? RANK_COLORS[nextRank].hex : '#fbbf24'})` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
            </motion.div>
          </div>
          <div className="text-right text-[9px] font-mono text-gray-600">{Math.round(rankProgress)}% to {nextRank || 'MAX'}</div>
        </div>
      </div>

      {/* ── WORKOUT STATUS + STREAK (side by side on mobile) ── */}
      <div className="grid grid-cols-2 gap-4">

        {/* Workout Status */}
        <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(8,8,20,0.80) 12%, rgba(4,4,14,0.90) 100%)', backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)', borderTop: '1px solid rgba(255,255,255,0.12)', borderLeft: '1px solid rgba(255,255,255,0.07)', borderRight: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.03)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07), inset 0 -1px 0 rgba(0,0,0,0.3), 0 6px 24px rgba(0,0,0,0.4)' }}>
          <div className="flex items-center gap-2">
            <Dumbbell size={12} className="text-red-400" />
            <span className="text-[10px] font-mono font-bold text-gray-400 tracking-widest uppercase">Today</span>
          </div>

          {todayWorkout ? (
            <>
              <div>
                <div className="text-[9px] font-mono text-gray-600 mb-0.5 uppercase">{todayName}</div>
                <div className="text-base font-black text-white leading-tight">{todayWorkout.focus}</div>
                <div className="text-[9px] text-gray-500 font-mono mt-1">
                  {todayWorkout.isRecovery ? '💤 Recovery Day' : `${todayWorkout.exercises?.length || 0} exercises • ${todayWorkout.totalDuration}min`}
                </div>
              </div>

              {!todayWorkout.isRecovery && (
                <div className="flex gap-2 mt-auto">
                  <button
                    onClick={onCompleteWorkout}
                    className="flex-1 py-2 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-[10px] font-mono font-bold flex items-center justify-center gap-1 hover:bg-green-500/20 transition-colors"
                  >
                    <CheckCircle2 size={12} /> DONE
                  </button>
                  <button
                    onClick={onFailWorkout}
                    className="py-2 px-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500/60 text-[10px] hover:bg-red-500/20 transition-colors"
                  >
                    <XCircle size={12} />
                  </button>
                </div>
              )}
              {todayWorkout.isRecovery && (
                <div className="mt-auto py-2 text-center text-[10px] font-mono text-blue-400/70 border border-blue-500/20 rounded-lg bg-blue-500/5">
                  REST DAY — RECOVER
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 py-2">
              <Target size={24} className="text-gray-700" />
              <div className="text-[9px] text-gray-600 font-mono">Setup Health<br />Profile first</div>
              <button
                onClick={() => onNavigate('HEALTH')}
                className="text-[9px] font-mono text-system-neon border border-system-neon/30 px-2 py-1 rounded hover:bg-system-neon/10 transition-colors"
              >
                CONFIGURE
              </button>
            </div>
          )}
        </div>

        {/* Streak & Recovery */}
        <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(8,8,20,0.80) 12%, rgba(4,4,14,0.90) 100%)', backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)', borderTop: '1px solid rgba(255,255,255,0.12)', borderLeft: '1px solid rgba(255,255,255,0.07)', borderRight: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.03)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07), inset 0 -1px 0 rgba(0,0,0,0.3), 0 6px 24px rgba(0,0,0,0.4)' }}>
          <div className="flex items-center gap-2">
            <Flame size={12} className="text-orange-400" />
            <span className="text-[10px] font-mono font-bold text-gray-400 tracking-widest uppercase">Streak</span>
          </div>

          <div className="text-center py-1">
            <div className="text-4xl font-black text-white leading-none mb-1">{player.streak || 0}</div>
            <div className="text-[9px] font-mono text-orange-400/70 uppercase tracking-widest">
              {(player.streak || 0) >= 7 ? '🔥 ON FIRE' : (player.streak || 0) >= 3 ? 'BUILDING' : 'DAYS'}
            </div>
          </div>

          <div className="space-y-2 mt-auto">
            <div>
              <div className="flex justify-between text-[9px] font-mono mb-1">
                <span className="text-gray-500">HP</span>
                <span className="text-red-400">{player.hp}/{player.maxHp}</span>
              </div>
              <div className="h-1.5 bg-black rounded-full overflow-hidden border border-gray-800">
                <div
                  className="h-full bg-red-500 rounded-full"
                  style={{ width: `${((player.hp || 100) / (player.maxHp || 100)) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[9px] font-mono mb-1">
                <span className="text-gray-500">MP</span>
                <span className="text-blue-400">{player.mp}/{player.maxMp}</span>
              </div>
              <div className="h-1.5 bg-black rounded-full overflow-hidden border border-gray-800">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${((player.mp || 100) / (player.maxMp || 100)) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── DUNGEON TOWER ───────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-red-900/40 bg-[#0d0000]"
        style={{ boxShadow: isDungeonReady ? '0 0 40px rgba(239,68,68,0.2), inset 0 0 60px rgba(0,0,0,0.8)' : 'inset 0 0 60px rgba(0,0,0,0.8)' }}>

        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(239,68,68,0.05)_0%,transparent_70%)] pointer-events-none" />
        <div className="absolute inset-0 opacity-10 pointer-events-none"
          style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,0,0,0.03) 2px, rgba(255,0,0,0.03) 4px)' }} />

        {/* Ambient particles */}
        {isDungeonReady && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 rounded-full bg-red-500/60"
                style={{ left: `${10 + i * 12}%`, top: '80%' }}
                animate={{ y: [-20, -120], opacity: [0.6, 0], scale: [1, 0.3] }}
                transition={{ duration: 2 + i * 0.3, repeat: Infinity, delay: i * 0.25, ease: 'easeOut' }}
              />
            ))}
          </div>
        )}

        <div className="relative z-10 p-5 flex items-center gap-4">
          {/* Tower Icon */}
          <div className="relative flex-shrink-0">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border ${
              isDungeonReady ? 'border-red-500/60 bg-red-900/30' : 'border-gray-800 bg-gray-900/30'
            } relative overflow-hidden`}
              style={isDungeonReady ? { boxShadow: '0 0 25px rgba(239,68,68,0.4)' } : {}}
            >
              {isDungeonReady && (
                <div className="absolute inset-0 bg-red-500/10 animate-pulse" />
              )}
              <div className="relative z-10 text-2xl">
                {isDungeonReady ? '🏰' : '⏳'}
              </div>
            </div>
            {isDungeonReady && (
              <motion.div
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 border border-red-300 flex items-center justify-center"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
              </motion.div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-[9px] font-mono tracking-[0.2em] text-red-500/70 uppercase mb-0.5">Shadow Dungeon</div>
            <div className="text-lg font-black text-white tracking-tight">
              {isDungeonReady ? 'DUNGEON OPEN' : 'TOWER SEALED'}
            </div>
            <div className="text-[10px] font-mono mt-1">
              {isDungeonReady ? (
                <span className="text-red-400 animate-pulse">⚡ Entry portal active — Claim your rewards</span>
              ) : (
                <span className="text-gray-500 flex items-center gap-1">
                  <Clock size={10} /> Resets in {formatTime(dungeonCooldownRemaining)}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={() => { onNavigate('STORE'); }}
            className={`flex-shrink-0 px-4 py-3 rounded-xl font-mono font-black text-xs tracking-widest flex flex-col items-center gap-1 transition-all ${isDungeonReady ? 'bg-red-600 text-white border border-red-500 hover:bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)] hover:shadow-[0_0_30px_rgba(239,68,68,0.6)] active:scale-95' : 'bg-gray-800/50 text-gray-500 border border-gray-700/50 cursor-not-allowed'}`}
          >
            <Sword size={16} className={isDungeonReady ? 'text-white' : 'text-gray-600'} />
            <span>ENTER</span>
          </button>
        </div>
      </div>

      {/* ── QUEST PREVIEW ───────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl p-5" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(8,8,20,0.80) 12%, rgba(4,4,14,0.90) 100%)', backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)', borderTop: '1px solid rgba(255,255,255,0.12)', borderLeft: '1px solid rgba(255,255,255,0.07)', borderRight: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.03)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07), inset 0 -1px 0 rgba(0,0,0,0.3), 0 8px 28px rgba(0,0,0,0.45)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Target size={14} className="text-system-neon" />
            <span className="text-[10px] font-mono font-bold text-gray-400 tracking-widest uppercase">Active Quests</span>
          </div>
          <button
            onClick={() => onNavigate('QUESTS')}
            className="flex items-center gap-1 text-[10px] font-mono text-system-neon/70 hover:text-system-neon transition-colors"
          >
            VIEW ALL <Arrow size={12} />
          </button>
        </div>

        {activeQuests.length === 0 ? (
          <div className="text-center py-6 text-gray-600">
            <Sparkles size={28} className="mx-auto mb-2 opacity-40" />
            <div className="text-[10px] font-mono tracking-widest">NO ACTIVE QUESTS</div>
            <button
              onClick={() => onNavigate('QUESTS')}
              className="mt-3 text-[10px] font-mono text-system-neon border border-system-neon/30 px-3 py-1.5 rounded-lg hover:bg-system-neon/10 transition-colors"
            >
              + CREATE QUEST
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {activeQuests.map(quest => (
              <motion.div
                key={quest.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 rounded-xl p-3 group transition-all"
                style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(6,6,16,0.75) 100%)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderTop: '1px solid rgba(255,255,255,0.08)', borderLeft: '1px solid rgba(255,255,255,0.04)', borderRight: '1px solid rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.02)', boxShadow: '0 3px 12px rgba(0,0,0,0.3)' }}
              >
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${CATEGORY_COLORS[quest.category]?.replace('text-', 'bg-') || 'bg-gray-500'}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-white truncate">{quest.title}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[9px] font-mono uppercase ${CATEGORY_COLORS[quest.category] || 'text-gray-500'}`}>
                      {quest.category}
                    </span>
                    <span className="text-[9px] font-mono text-gray-600">•</span>
                    <span className="text-[9px] font-mono text-yellow-500/70">+{quest.xpReward} XP</span>
                    <span className="text-[9px] font-mono text-gray-600 ml-auto">{quest.rank}-RANK</span>
                  </div>
                </div>
                {onCompleteQuest && (
                  <button
                    onClick={() => onCompleteQuest(quest.id)}
                    className="flex-shrink-0 w-7 h-7 rounded-lg bg-green-500/10 border border-green-500/20 text-green-500/60 flex items-center justify-center hover:bg-green-500/30 hover:text-green-400 transition-all opacity-0 group-hover:opacity-100"
                  >
                    <CheckCircle2 size={14} />
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default DashboardSections;
