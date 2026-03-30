import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, Skull, Sparkles, RefreshCw, Zap,
  Crown, FlaskConical, ScrollText, ChevronRight,
  Target, Infinity as InfinityIcon, Users, X, Globe, CalendarDays,
} from 'lucide-react';
import { PlayerData, Outfit } from '../types';
import { API_BASE } from '../lib/apiConfig';
import { getPlayerAuthHeaders } from '../lib/playerApi';
import { useWarfare } from '../hooks/useWarfare';
import { useSystem } from '../hooks/useSystem';
import { playSystemSoundEffect } from '../utils/soundEngine';
import {
  ExtractionRollAnim, AriseAnim, ScrollBurnAnim,
  MonarchCrownAnim, PowerSurgeBanner,
} from './WarfareAnimations';
import RankRewardOverlay from './RankRewardOverlay';

// ── Types ──
interface LeaderboardEntry {
  player_id?: string;
  supabase_id?: string;
  username: string;
  name: string;
  total_xp: number;
  daily_xp: number;
  level: number;
  rank: string;
  equipped_outfit_id?: string;
}

interface SimEntry extends LeaderboardEntry {
  isMe: boolean;
  dominance: number;
  isDebuffed: boolean;
  computedRank: string;
  outfitId: string;
}

interface LeaderboardViewProps {
  player: PlayerData;
  equippedOutfit?: Outfit;
}

type TabMode = 'global' | 'daily';

// ── Constants ──
const RANK_COLORS: Record<string, string> = {
  E: '#78716c', D: '#f97316', C: '#60a5fa', B: '#06b6d4', A: '#eab308', S: '#a855f7',
};

const RANK_GLOW: Record<string, string> = {
  E: 'rgba(120,113,108,0.3)', D: 'rgba(249,115,22,0.3)', C: 'rgba(96,165,250,0.3)',
  B: 'rgba(6,182,212,0.3)', A: 'rgba(234,179,8,0.4)', S: 'rgba(168,85,247,0.5)',
};

const HUNTER_TITLES = ['SHADOW MONARCH', 'NATIONAL LEVEL', 'NATIONAL LEVEL', 'S-RANK ELITE', 'S-RANK ELITE', 'A-RANK HUNTER'];

function getHunterTitle(rank: number): string {
  if (rank <= 0) return 'UNRANKED';
  if (rank <= HUNTER_TITLES.length) return HUNTER_TITLES[rank - 1];
  return rank <= 10 ? 'B-RANK HUNTER' : 'C-RANK HUNTER';
}

function computeRankFromLevel(level: number): string {
  if (level >= 80) return 'S';
  if (level >= 55) return 'A';
  if (level >= 39) return 'B';
  if (level >= 27) return 'C';
  if (level >= 11) return 'D';
  return 'E';
}

// ── Outfit Config Maps ──
const OUTFIT_CONFIG: Record<string, { name: string; accent: string; eyeColor: string; hoodColor: string; armorColor: string; tier: string; shape: string }> = {
  outfit_starter: { name: 'Neophyte', accent: '#9ca3af', eyeColor: '#60a5fa', hoodColor: '#374151', armorColor: '#1f2937', tier: 'E', shape: 'circle' },
  outfit_ghost:   { name: 'Ghost',    accent: '#4ade80', eyeColor: '#4ade80', hoodColor: '#14532d', armorColor: '#166534', tier: 'D', shape: 'diamond' },
  outfit_knight:  { name: 'Ninja',    accent: '#60a5fa', eyeColor: '#f87171', hoodColor: '#1e293b', armorColor: '#334155', tier: 'C', shape: 'hexagon' },
  outfit_assassin:{ name: 'Mars',     accent: '#c084fc', eyeColor: '#00d2ff', hoodColor: '#581c87', armorColor: '#7e22ce', tier: 'B', shape: 'octagon' },
  outfit_vanguard:{ name: 'Jupiter',  accent: '#facc15', eyeColor: '#60a5fa', hoodColor: '#713f12', armorColor: '#92400e', tier: 'A', shape: 'star' },
  outfit_monarch: { name: 'Overlord', accent: '#f87171', eyeColor: '#60a5fa', hoodColor: '#450a0a', armorColor: '#991b1b', tier: 'S', shape: 'crown' },
};

const DEFAULT_OUTFIT_CFG = OUTFIT_CONFIG.outfit_starter;

// ── Hunter Badge (Refined with tier-specific styling and animation) ──
const HunterBadge: React.FC<{ outfitId: string; size?: number }> = ({ outfitId, size = 36 }) => {
  const cfg = OUTFIT_CONFIG[outfitId] || DEFAULT_OUTFIT_CFG;
  return (
    <motion.div
      animate={{ scale: [1, 1.05, 1] }}
      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      style={{
        width: size,
        height: size,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Glow ring */}
        <circle cx="18" cy="18" r="17" fill="none" stroke={cfg.accent} strokeWidth="1.5" opacity="0.4">
          <animate attributeName="opacity" values="0.2;0.6;0.2" dur="2.5s" repeatCount="indefinite" />
        </circle>
        {/* Inner bg */}
        <circle cx="18" cy="18" r="15" fill={`${cfg.hoodColor}`} />
        {/* Hood */}
        <path d="M7 16C7 11 11.5 6 18 6C24.5 6 29 11 29 16V24C29 25 28 26 27 26H9C8 26 7 25 7 24V16Z" fill={cfg.hoodColor} />
        {/* Face shadow */}
        <path d="M10 16C10 13 13 10 18 10C23 10 26 13 26 16V21C26 21 23 22 18 22C13 22 10 21 10 21V16Z" fill="#08081a" />
        {/* Armor */}
        <path d="M9 23L13 21H23L27 23V26H9V23Z" fill={cfg.armorColor} />
        <path d="M15 21L18 24L21 21" fill="none" stroke={cfg.accent} strokeWidth="0.7" opacity="0.5" />
        {/* Eyes */}
        <ellipse cx="14.5" cy="16.5" rx="2" ry="1.2" fill={cfg.eyeColor}>
          <animate attributeName="opacity" values="1;0.5;1" dur="2.5s" repeatCount="indefinite" />
        </ellipse>
        <ellipse cx="21.5" cy="16.5" rx="2" ry="1.2" fill={cfg.eyeColor}>
          <animate attributeName="opacity" values="1;0.5;1" dur="2.5s" repeatCount="indefinite" begin="0.15s" />
        </ellipse>
        {/* Eye glow */}
        <ellipse cx="14.5" cy="16.5" rx="3" ry="2" fill={cfg.eyeColor} opacity="0.12" />
        <ellipse cx="21.5" cy="16.5" rx="3" ry="2" fill={cfg.eyeColor} opacity="0.12" />
        {/* Tier badge */}
        <circle cx="30" cy="6" r="5.5" fill="#0a0a1a" stroke={cfg.accent} strokeWidth="1" />
        <text x="30" y="8.5" textAnchor="middle" fontSize="6" fontWeight="900" fill={cfg.accent} fontFamily="monospace">{cfg.tier}</text>
      </svg>
    </motion.div>
  );
};

// ── Shadow Slot Box ──
const ShadowSlotBox: React.FC<{ shadow?: { name: string; sourceRank: number } | null; index: number }> = ({ shadow, index }) => {
  return (
    <div
      className="relative flex-1 rounded-xl overflow-hidden flex flex-col items-center justify-center py-2"
      style={{
        background: shadow
          ? 'linear-gradient(180deg, rgba(168,85,247,0.1), rgba(10,10,26,0.95))'
          : 'rgba(255,255,255,0.02)',
        border: shadow
          ? '1px solid rgba(168,85,247,0.3)'
          : '1px dashed rgba(255,255,255,0.08)',
        minHeight: 72,
      }}
    >
      {shadow ? (
        <motion.div
          className="flex flex-col items-center"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: [0, -3, 0], opacity: 1 }}
          transition={{ y: { duration: 2, repeat: Infinity, ease: 'easeInOut' }, opacity: { duration: 0.5 } }}
        >
          <Skull size={18} className="text-purple-400" style={{ filter: 'drop-shadow(0 0 6px rgba(168,85,247,0.6))' }} />
          <span className="text-[8px] font-black text-purple-300 mt-1 tracking-wider truncate max-w-[70px] text-center">
            {shadow.name.replace('Shadow of ', '')}
          </span>
          <span className="text-[7px] text-purple-500/60 font-mono">#{shadow.sourceRank}</span>
        </motion.div>
      ) : (
        <div className="flex flex-col items-center opacity-20">
          <div className="w-5 h-5 rounded-full border border-dashed border-white/20" />
          <span className="text-[7px] text-gray-600 font-mono mt-1">SLOT {index + 1}</span>
        </div>
      )}
    </div>
  );
};

// ── Animation Phase State Machine ──
type AnimPhase =
  | { type: 'NONE' }
  | { type: 'EXTRACTION_PROMPT'; targetName: string; targetRank: number }
  | { type: 'EXTRACTION_ROLL'; targetName: string; targetRank: number; rate: number; useOrb: boolean }
  | { type: 'ARISE'; shadowName: string }
  | { type: 'SCROLL_BURN'; scrollsRemaining: number; targetName: string; targetRank: number }
  | { type: 'MONARCH_CROWN' };

// ═══════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
const LeaderboardView: React.FC<LeaderboardViewProps> = ({ player, equippedOutfit }) => {
  const [globalEntries, setGlobalEntries] = useState<LeaderboardEntry[]>([]);
  const [dailyEntries, setDailyEntries] = useState<LeaderboardEntry[]>([]);
  const [activeTab, setActiveTab] = useState<TabMode>('daily');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { consumeItem, addRewards, addNotification, setPlayer } = useSystem();
  const warfare = useWarfare(player.userId || 'local');

  const [animPhase, setAnimPhase] = useState<AnimPhase>({ type: 'NONE' });
  const [expandedTarget, setExpandedTarget] = useState<string | null>(null);
  const [extractableTargets, setExtractableTargets] = useState<string[]>([]);

  const cons = player.consumables || { shadowScrolls: 0 };
  const outfitStats = equippedOutfit?.baseStats || { attack: 15, boost: 5, extraction: 16, ultimate: 10 };

  // ── Rank Reward State ──
  const [pendingReward, setPendingReward] = useState<{
    id: string; rank: number; reward_gold: number; reward_xp: number; reward_keys: number;
  } | null>(null);
  const [showRewardOverlay, setShowRewardOverlay] = useState(false);
  const rewardCheckedRef = useRef(false);

  // Check for unclaimed rank rewards on mount (per-user via API)
  useEffect(() => {
    if (!player.userId || rewardCheckedRef.current) return;
    rewardCheckedRef.current = true;

    (async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api/leaderboard/rewards?userId=${player.userId}`,
          { credentials: 'include', headers: { ...getPlayerAuthHeaders() } }
        );
        if (!res.ok) return;
        const { reward } = await res.json();
        if (reward) {
          setPendingReward(reward);
          setShowRewardOverlay(true);
        }
      } catch { /* offline — skip */ }
    })();
  }, [player.userId]);

  // ── Fetch both leaderboards ──
  const fetchLeaderboard = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const [globalRes, dailyRes] = await Promise.all([
        fetch(`${API_BASE}/api/leaderboard?type=global`, { credentials: 'include', headers: { ...getPlayerAuthHeaders() } }),
        fetch(`${API_BASE}/api/leaderboard?type=daily`, { credentials: 'include', headers: { ...getPlayerAuthHeaders() } }),
      ]);
      if (globalRes.ok) setGlobalEntries(await globalRes.json());
      if (dailyRes.ok) setDailyEntries(await dailyRes.json());
    } catch { /* offline */ } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Poll every 10 seconds
  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(() => fetchLeaderboard(), 10_000);
    return () => clearInterval(interval);
  }, [fetchLeaderboard]);

  // ── Instant refresh on quest/workout completion ──
  useEffect(() => {
    const onXpChange = () => {
      // Small delay so the cloud sync has time to complete
      setTimeout(() => fetchLeaderboard(), 2500);
    };
    window.addEventListener('quest:completed', onXpChange);
    window.addEventListener('player:levelup', onXpChange);
    return () => {
      window.removeEventListener('quest:completed', onXpChange);
      window.removeEventListener('player:levelup', onXpChange);
    };
  }, [fetchLeaderboard]);

  // ── Build entries with INSTANT local XP merge ──
  // When YOU earn XP, your card moves immediately without waiting for server refresh
  const entries = activeTab === 'global' ? globalEntries : dailyEntries;
  const xpField = activeTab === 'global' ? 'total_xp' : 'daily_xp';

  const simulatedEntries: SimEntry[] = useMemo(() => {
    // ── PRIMARY: Match by player UUID (bulletproof, never collides) ──
    const myPlayerId = player.userId || '';
    const myUsername = (player.username || '').trim().toLowerCase();
    const myName = (player.name || '').trim().toLowerCase();

    return [...entries].map(e => {
      // Match by player_id (table UUID) first — this is the authoritative match
      let isMe = false;
      if (myPlayerId && e.player_id) {
        isMe = e.player_id === myPlayerId;
      } else if (myPlayerId && e.supabase_id) {
        // Fallback: some older API responses might use supabase_id
        isMe = e.supabase_id === myPlayerId;
      } else {
        // Last resort fallback for offline/legacy: match by username
        const entryUsername = (e.username || '').trim().toLowerCase();
        const entryName = (e.name || '').trim().toLowerCase();
        if (myUsername && entryUsername === myUsername) {
          isMe = true;
        } else if (myName && entryName === myName) {
          // Only match by name if username didn't match ANY entry
          const usernameMatchExists = entries.some(
            x => (x.username || '').trim().toLowerCase() === myUsername
          );
          if (!usernameMatchExists) {
            isMe = true;
          }
        }
      }

      // ── INSTANT LOCAL MERGE: use latest local XP for "me" ──
      let displayXp: number;
      if (isMe) {
        displayXp = activeTab === 'global' ? (player.totalXp || 0) : (player.dailyXp || 0);
      } else {
        displayXp = (e as any)[xpField] || 0;
      }

      return {
        ...e,
        isMe,
        dominance: displayXp,
        isDebuffed: false,
        computedRank: computeRankFromLevel(isMe ? (player.level || 1) : (e.level || 1)),
        outfitId: isMe ? (player.equippedOutfitId || 'outfit_starter') : (e.equipped_outfit_id || 'outfit_starter'),
      };
    }).sort((a, b) => b.dominance - a.dominance);
  }, [entries, player.userId, player.username, player.name, xpField, player.equippedOutfitId, player.totalXp, player.dailyXp, player.level, activeTab]);

  const myIndex = simulatedEntries.findIndex(e => e.isMe);
  const myRank = myIndex >= 0 ? myIndex + 1 : 999;

  // ── Keep a ref to animPhase to avoid stale closures in callbacks ──
  const animPhaseRef = useRef(animPhase);
  useEffect(() => { animPhaseRef.current = animPhase; }, [animPhase]);

  // ── Overtake detection (daily tab only) ──
  const [overtakeNotif, setOvertakeNotif] = useState<string | null>(null);
  useEffect(() => {
    if (activeTab !== 'daily' || myIndex < 0) return;
    const myDailyXp = simulatedEntries[myIndex]?.dominance || 0;
    const myUser = player.username || player.name || '';
    const { extractable, overtakenNow } = warfare.detectOvertakes(
      myDailyXp,
      myUser,
      simulatedEntries.map(e => ({ username: e.username || e.name, daily_xp: e.dominance }))
    );
    setExtractableTargets(extractable);

    // Show overtake notification for freshly-overtaken players
    if (overtakenNow.length > 0) {
      const names = overtakenNow.join(', ');
      setOvertakeNotif(`⚡ OVERTAKE! You passed ${names}!`);
      playSystemSoundEffect('SUCCESS');
      setTimeout(() => setOvertakeNotif(null), 4000);
    }
  }, [simulatedEntries, activeTab, myIndex, warfare, player.username, player.name]);

  // ── Check monarch reward ──
  useEffect(() => {
    if (myRank === 1 && warfare.claimMonarchReward()) {
      setAnimPhase({ type: 'MONARCH_CROWN' });
      addRewards(100, 0, 1);
      addNotification('Monarch Reward: +100 Gold, +1 Key!', 'SUCCESS');
    }
  }, [myRank, warfare, addRewards, addNotification]);

  // ── EXTRACTION PROMPT ──
  const handleExtractPrompt = useCallback((targetName: string, targetRank: number) => {
    if (!warfare.canExtract) {
      addNotification('All 3 shadow slots are full!', 'WARNING');
      return;
    }
    setAnimPhase({ type: 'EXTRACTION_PROMPT', targetName, targetRank });
    setExpandedTarget(null);
  }, [warfare.canExtract, addNotification]);

  // ── EXTRACTION HANDLERS (use ref to avoid stale closure) ──
  const handleStartExtraction = useCallback(() => {
    const phase = animPhaseRef.current;
    if (phase.type !== 'EXTRACTION_PROMPT') return;
    if (!consumeItem('shadowScrolls', 1)) return;
    const rate = warfare.powerSurgeActive
      ? Math.min(100, outfitStats.extraction * 2)
      : outfitStats.extraction;

    setAnimPhase({
      type: 'EXTRACTION_ROLL',
      targetName: phase.targetName,
      targetRank: phase.targetRank,
      rate,
      useOrb: false,
    });
  }, [consumeItem, warfare.powerSurgeActive, outfitStats.extraction]);

  const handleExtractionResult = useCallback((success: boolean) => {
    const phase = animPhaseRef.current;
    if (phase.type !== 'EXTRACTION_ROLL') return;
    if (success) {
      const result = phase.useOrb
        ? warfare.guaranteedExtraction(phase.targetName, phase.targetRank)
        : warfare.attemptExtraction(phase.targetName, phase.targetRank, phase.rate);
      const shadowName = phase.useOrb
        ? (result as any)?.name || `Shadow of ${phase.targetName}`
        : ((result as any)?.shadow?.name || `Shadow of ${phase.targetName}`);
      setAnimPhase({ type: 'ARISE', shadowName });
      playSystemSoundEffect('LEVEL_UP');
    } else {
      setAnimPhase({
        type: 'SCROLL_BURN',
        scrollsRemaining: cons.shadowScrolls - 1,
        targetName: phase.targetName,
        targetRank: phase.targetRank,
      });
    }
  }, [warfare, cons.shadowScrolls]);

  const handleScrollBurnComplete = useCallback(() => {
    const phase = animPhaseRef.current;
    if (phase.type !== 'SCROLL_BURN') { setAnimPhase({ type: 'NONE' }); return; }
    if (cons.shadowScrolls > 0) {
      setAnimPhase({
        type: 'EXTRACTION_PROMPT',
        targetName: phase.targetName,
        targetRank: phase.targetRank,
      });
    } else {
      setAnimPhase({ type: 'NONE' });
    }
  }, [cons.shadowScrolls]);

  // ── EXCHANGE (Debuff) ──
  const handleExchange = useCallback((targetId: string, targetName: string) => {
    if (cons.shadowScrolls < 1) return;
    if (!consumeItem('shadowScrolls', 1)) return;
    warfare.castDebuff(targetId, targetName);
    setExpandedTarget(null);
  }, [cons.shadowScrolls, consumeItem, warfare]);

  // ── Format XP ──
  const formatXp = (xp: number) => {
    if (xp >= 1_000_000) return `${(xp / 1_000_000).toFixed(1)}M`;
    if (xp >= 1_000) return `${(xp / 1_000).toFixed(1)}K`;
    return xp.toString();
  };

  // ── Extraction window countdown ──
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    if (activeTab !== 'daily') return;
    const timer = setInterval(() => forceUpdate(n => n + 1), 1000);
    return () => clearInterval(timer);
  }, [activeTab]);

  return (
    <div className="min-h-screen pb-24 px-3 pt-3" style={{ background: 'linear-gradient(180deg, #08081a 0%, #0d0d20 100%)' }}>

      {/* ── TAB SWITCHER ── */}
      <div className="flex rounded-2xl overflow-hidden mb-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {(['daily', 'global'] as TabMode[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="flex-1 py-2.5 flex items-center justify-center gap-1.5 transition-all text-xs font-black tracking-widest uppercase"
            style={{
              background: activeTab === tab
                ? (tab === 'daily' ? 'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(168,85,247,0.05))' : 'linear-gradient(135deg, rgba(234,179,8,0.12), rgba(234,179,8,0.04))')
                : 'transparent',
              color: activeTab === tab
                ? (tab === 'daily' ? '#c084fc' : '#fbbf24')
                : 'rgba(255,255,255,0.25)',
              borderBottom: activeTab === tab
                ? `2px solid ${tab === 'daily' ? '#a855f7' : '#eab308'}`
                : '2px solid transparent',
            }}
          >
            {tab === 'daily' ? <CalendarDays size={13} /> : <Globe size={13} />}
            {tab === 'daily' ? 'DAILY' : 'GLOBAL'}
          </button>
        ))}
      </div>

      {/* ── SHADOW SLOTS (Daily only) ── */}
      {activeTab === 'daily' && (
        <div className="mb-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Skull size={11} className="text-purple-500" />
            <span className="text-[9px] font-black text-purple-400/80 tracking-widest uppercase">
              SHADOW ARMY ({warfare.shadows.length}/{warfare.maxShadows}) — +{warfare.armyBuff}% XP
            </span>
          </div>
          <div className="flex gap-2">
            {Array.from({ length: warfare.maxShadows }).map((_, i) => (
              <ShadowSlotBox key={i} index={i} shadow={warfare.shadows[i] || null} />
            ))}
          </div>
        </div>
      )}

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Trophy size={16} className="text-purple-500" />
          <h2 className="text-sm font-black text-white tracking-wider uppercase">
            {activeTab === 'daily' ? 'Daily Arena' : 'All-Time Ranks'}
          </h2>
        </div>
        <motion.button
          whileTap={{ rotate: 360 }}
          transition={{ duration: 0.5 }}
          onClick={() => fetchLeaderboard(true)}
          className="p-2 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <RefreshCw size={13} className={`text-gray-500 ${refreshing ? 'animate-spin' : ''}`} />
        </motion.button>
      </div>

      {/* ── MY STATS BANNER ── */}
      {myIndex >= 0 && (
        <div className="rounded-2xl p-3 mb-3" style={{
          background: 'linear-gradient(135deg, rgba(168,85,247,0.08), rgba(10,10,26,0.95))',
          border: '1px solid rgba(168,85,247,0.15)',
        }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black"
                style={{ background: `linear-gradient(135deg, ${RANK_COLORS[simulatedEntries[myIndex].computedRank]}, transparent)` }}>
                #{myRank}
              </div>
              <div>
                <div className="text-xs font-black text-white">{player.username || player.name}</div>
                <div className="text-[9px] text-gray-500 font-mono">{getHunterTitle(myRank)}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 justify-end">
                <Zap size={11} className="text-yellow-400" />
                <span className="text-sm font-black text-white">{formatXp(simulatedEntries[myIndex].dominance)}</span>
              </div>
              <span className="text-[8px] text-gray-600 font-mono">{activeTab === 'daily' ? 'TODAY' : 'LIFETIME'}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── POWER SURGE BANNER ── */}
      {warfare.powerSurgeActive && <PowerSurgeBanner expiresAt={warfare.powerSurgeExpiresAt} />}

      {/* ── OVERTAKE NOTIFICATION ── */}
      <AnimatePresence>
        {overtakeNotif && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="rounded-2xl py-2.5 px-4 mb-3 text-center text-xs font-black tracking-wider"
            style={{
              background: 'linear-gradient(135deg, rgba(74,222,128,0.12), rgba(74,222,128,0.04))',
              border: '1px solid rgba(74,222,128,0.25)',
              color: '#4ade80',
              boxShadow: '0 0 20px rgba(74,222,128,0.1)',
            }}
          >
            {overtakeNotif}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── LEADERBOARD LIST ── */}
      <div className="space-y-1.5">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }} className="text-gray-600 text-xs font-mono">
              Loading...
            </motion.div>
          </div>
        ) : simulatedEntries.length === 0 ? (
          <div className="text-center py-16 text-gray-600 text-xs font-mono">
            {activeTab === 'daily' ? 'No daily XP earned yet today.' : 'No players found.'}
          </div>
        ) : (
          <AnimatePresence>
            {simulatedEntries.map((entry, index) => {
              const entryId = entry.username || entry.name;
              const isExpanded = expandedTarget === entryId;
              const rankColor = RANK_COLORS[entry.computedRank] || '#78716c';
              const isExtractTarget = activeTab === 'daily' && extractableTargets.includes(entryId);
              const windowRemaining = activeTab === 'daily' ? warfare.getExtractionWindowRemaining(entryId) : 0;

              return (
                <motion.div
                  key={entryId}
                  layoutId={`lb-card-${entryId}`}
                  layout="position"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ layout: { type: 'spring', stiffness: 300, damping: 30 }, duration: 0.3 }}
                  className="rounded-2xl overflow-hidden"
                  style={{
                    background: entry.isMe
                      ? 'linear-gradient(135deg, rgba(168,85,247,0.06), rgba(10,10,26,0.9))'
                      : isExtractTarget
                        ? 'linear-gradient(135deg, rgba(74,222,128,0.05), rgba(10,10,26,0.9))'
                        : 'rgba(255,255,255,0.02)',
                    border: entry.isMe
                      ? '1px solid rgba(168,85,247,0.15)'
                      : isExtractTarget
                        ? '1px solid rgba(74,222,128,0.2)'
                        : '1px solid rgba(255,255,255,0.04)',
                  }}
                >
                  <div
                    className="flex items-center gap-2.5 p-2.5 cursor-pointer active:bg-white/[0.02] transition-colors"
                    onClick={() => setExpandedTarget(isExpanded ? null : entryId)}
                  >
                    {/* Rank # */}
                    <div className="w-7 text-center">
                      {index < 3 ? (
                        <span className="text-base">{['👑', '🥈', '🥉'][index]}</span>
                      ) : (
                        <span className="text-[11px] font-black text-gray-500 font-mono">#{index + 1}</span>
                      )}
                    </div>

                    {/* Outfit Badge */}
                    <HunterBadge outfitId={entry.outfitId} size={32} />

                    {/* Name + title */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-black text-white truncate">
                          {entry.username || entry.name}
                        </span>
                        {entry.isMe && (
                          <span className="text-[7px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 font-black">YOU</span>
                        )}
                      </div>
                      <div className="text-[9px] text-gray-600 font-mono">Lv.{entry.level}</div>
                    </div>

                    {/* XP + Rank badge */}
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="flex items-center gap-0.5 justify-end">
                          <Zap size={9} className="text-yellow-400/70" />
                          <span className="text-[11px] font-black text-white font-mono">{formatXp(entry.dominance)}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-center w-6 h-6 rounded-lg text-[9px] font-black"
                        style={{
                          background: `${rankColor}15`,
                          border: `1px solid ${rankColor}40`,
                          color: rankColor,
                          boxShadow: `0 0 8px ${RANK_GLOW[entry.computedRank] || 'transparent'}`,
                        }}>
                        {entry.computedRank}
                      </div>
                    </div>

                    {/* Extraction indicator / chevron */}
                    {isExtractTarget && !entry.isMe ? (
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="text-green-400"
                      >
                        <Target size={14} />
                      </motion.div>
                    ) : (
                      <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
                        <ChevronRight size={14} className="text-gray-700 shrink-0" />
                      </motion.div>
                    )}
                  </div>

                  {/* ── Action Drawer ── */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        className="overflow-hidden"
                        style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
                      >
                        <div className="p-3 flex gap-2">
                          {entry.isMe ? (
                            <div className="flex-1 py-3.5 rounded-2xl flex flex-col items-center justify-center gap-1.5 border border-white/5 bg-white/5 opacity-50">
                              <span className="text-[10px] font-black tracking-widest uppercase text-gray-400">YOUR PROFILE</span>
                            </div>
                          ) : activeTab === 'daily' ? (
                            <>
                              {isExtractTarget ? (
                                <button
                                  disabled={!warfare.canExtract}
                                  onClick={() => handleExtractPrompt(entry.username || entry.name, index + 1)}
                                  className="flex-1 py-3.5 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed"
                                  style={{
                                    background: 'linear-gradient(135deg, rgba(74,222,128,0.08), rgba(74,222,128,0.02))',
                                    border: '1px solid rgba(74,222,128,0.2)',
                                    color: '#4ade80',
                                  }}>
                                  <Skull size={18} />
                                  <span className="text-[9px] font-black tracking-widest uppercase">EXTRACT SHADOW</span>
                                  <span className="text-[8px] text-green-400/60">
                                    {Math.ceil(windowRemaining / 60000)}m window remaining
                                  </span>
                                </button>
                              ) : (
                                <div className="flex-1 py-3.5 rounded-2xl flex flex-col items-center justify-center gap-1.5 border border-white/5 bg-white/[0.02] opacity-40">
                                  <span className="text-[9px] text-gray-500 font-mono text-center px-4">
                                    Overtake this player to unlock extraction
                                  </span>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="flex-1 py-3.5 rounded-2xl flex flex-col items-center justify-center gap-1.5 border border-white/5 bg-white/[0.02] opacity-30">
                              <Globe size={14} className="text-gray-500" />
                              <span className="text-[9px] text-gray-500 font-mono">Global — view only</span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* ── KILL FEED — positioned above bottom nav ── */}
      <div className="fixed left-0 w-full z-30 h-8 overflow-hidden"
        style={{
          bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
          background: 'linear-gradient(180deg, rgba(0,0,0,0.0), rgba(0,0,0,0.95) 20%)',
          borderTop: '1px solid rgba(168,85,247,0.08)',
        }}>
        <div className="flex whitespace-nowrap items-center h-full gap-12 font-mono text-[9px] px-4"
          style={{ animation: 'warfare-marquee 40s linear infinite' }}>
          {[...warfare.killFeed, ...warfare.killFeed].map((entry, i) => (
            <span key={`${entry.id}-${i}`} className={entry.highlight ? 'text-purple-400' : 'text-gray-600'}>
              {entry.text}
            </span>
          ))}
        </div>
        <style>{`
          @keyframes warfare-marquee {
            0% { transform: translateX(0%); }
            100% { transform: translateX(-50%); }
          }
        `}</style>
      </div>

      {/* ── EXTRACTION PROMPT MODAL ── */}
      <AnimatePresence>
        {animPhase.type === 'EXTRACTION_PROMPT' && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[250] flex items-center justify-center bg-black/90 backdrop-blur-sm pointer-events-auto"
          >
            <motion.div
              initial={{ scale: 0.8, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 30 }}
              className="w-80 rounded-3xl overflow-hidden"
              style={{
                background: 'linear-gradient(180deg, rgba(168,85,247,0.08), rgba(10,10,26,0.98))',
                border: '1px solid rgba(168,85,247,0.2)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.8), 0 0 40px rgba(168,85,247,0.1)',
              }}
            >
              <div className="p-6 text-center">
                <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 2, repeat: Infinity }}>
                  <Skull size={48} className="text-purple-500 mx-auto mb-3" style={{ filter: 'drop-shadow(0 0 20px rgba(168,85,247,0.5))' }} />
                </motion.div>
                <h3 className="text-lg font-black text-white tracking-wider uppercase">Extract Shadow?</h3>
                <p className="text-[10px] text-gray-500 font-mono mt-1 tracking-wider">
                  Target: {animPhase.targetName}
                </p>
                <p className="text-[9px] text-purple-400/60 font-mono mt-0.5">
                  +2% XP boost per shadow
                </p>

                <div className="space-y-2.5 mt-5">
                  {/* Shadow Scroll option */}
                  <button
                    disabled={cons.shadowScrolls < 1}
                    onClick={() => handleStartExtraction()}
                    className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-25"
                    style={{
                      background: 'linear-gradient(135deg, rgba(0,210,255,0.08), rgba(0,210,255,0.02))',
                      border: '1px solid rgba(0,210,255,0.15)',
                    }}>
                    <ScrollText size={16} className="text-cyan-400" />
                    <div className="text-left">
                      <div className="text-xs font-black text-cyan-400">
                        Shadow Scroll ({outfitStats.extraction}%{warfare.powerSurgeActive ? ' ×2' : ''})
                      </div>
                      <div className="text-[9px] text-cyan-400/50">{cons.shadowScrolls} remaining</div>
                    </div>
                  </button>

                  {/* Skip */}
                  <button
                    onClick={() => setAnimPhase({ type: 'NONE' })}
                    className="w-full py-2.5 rounded-2xl text-[10px] font-bold text-gray-600 hover:text-white transition-colors"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                  >
                    ABANDON
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ANIMATION OVERLAYS ── */}
      <AnimatePresence mode="wait">
        {animPhase.type === 'EXTRACTION_ROLL' && (
          <ExtractionRollAnim
            extractionRate={animPhase.rate}
            onResult={handleExtractionResult}
          />
        )}
        {animPhase.type === 'ARISE' && (
          <AriseAnim
            shadowName={animPhase.shadowName}
            onComplete={() => setAnimPhase({ type: 'NONE' })}
          />
        )}
        {animPhase.type === 'SCROLL_BURN' && (
          <ScrollBurnAnim
            scrollsRemaining={animPhase.scrollsRemaining}
            onComplete={handleScrollBurnComplete}
          />
        )}
        {animPhase.type === 'MONARCH_CROWN' && (
          <MonarchCrownAnim onComplete={() => setAnimPhase({ type: 'NONE' })} />
        )}
      </AnimatePresence>

      {/* ── RANK REWARD OVERLAY ── */}
      <AnimatePresence>
        {showRewardOverlay && pendingReward && (
          <RankRewardOverlay
            rank={pendingReward.rank}
            gold={pendingReward.reward_gold}
            xp={pendingReward.reward_xp}
            keys={pendingReward.reward_keys}
            username={player.username || player.name || 'Hunter'}
            onClaim={async () => {
              setShowRewardOverlay(false);
              // Local UI sync (rewards already credited by server cron)
              addRewards(
                pendingReward.reward_gold,
                pendingReward.reward_xp,
                pendingReward.reward_keys
              );
              addNotification(
                `Leaderboard Reward: Rank #${pendingReward.rank} — +${pendingReward.reward_gold}G, +${pendingReward.reward_xp}XP${pendingReward.reward_keys > 0 ? `, +${pendingReward.reward_keys} Key` : ''}`,
                'SUCCESS'
              );
              // Mark as claimed on server
              try {
                await fetch(`${API_BASE}/api/leaderboard/rewards/claim`, {
                  method: 'POST',
                  credentials: 'include',
                  headers: { 'Content-Type': 'application/json', ...getPlayerAuthHeaders() },
                  body: JSON.stringify({ snapshotId: pendingReward.id }),
                });
              } catch { /* will retry next time */ }
              setPendingReward(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default LeaderboardView;
