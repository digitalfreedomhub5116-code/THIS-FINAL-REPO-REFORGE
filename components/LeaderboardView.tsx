import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Lottie from 'lottie-react';
import {
  RefreshCw,
  X, Zap, Flag, AlertTriangle, CheckSquare, Square, Send, Flame, Clock, Trophy, Gift, Coins, Users,
} from 'lucide-react';
import { PlayerData } from '../types';
import { API_BASE } from '../lib/apiConfig';
import { getPlayerAuthHeaders, authenticatedFetch } from '../lib/playerApi';
import { useSystem } from '../hooks/useSystem';
import { playSystemSoundEffect } from '../utils/soundEngine';
import SeasonRewardOverlay from './SeasonRewardOverlay';
import AvatarWithBorder from './AvatarWithBorder';
import { getItemById } from '../utils/storeItems';
import { BORDERS_ACTIVE } from '../utils/gameData';
import { generateNPCsForUser } from '../utils/npcGenerator';
import { getGuildIconUrl } from './guilds/guildTheme';

// ── Types ──
interface GuildLeaderboardEntry {
  id: string;
  name: string;
  tag: string;
  icon: string | null;
  level: number;
  vault_balance: number;
  memberCount: number;
  memberCap: number;
  rank: number;
}

interface LeaderboardEntry {
  player_id?: string;
  supabase_id?: string;
  username: string;
  name: string;
  total_xp: number;
  daily_xp: number;
  weekly_xp: number;
  level: number;
  rank: string;
  streak: number;
  avatar_url?: string | null;
  equipped_outfit_id?: string;
  equipped_border?: string | null;
  equipped_banner?: string | null;
}

interface SimEntry extends LeaderboardEntry {
  isMe: boolean;
  dominance: number;
  isDebuffed: boolean;
  computedRank: string;
  outfitId: string;
  streak: number;
  avatar_url?: string | null;
  borderId: string | null;
  bannerId: string | null;
}

interface LeaderboardViewProps {
  player: PlayerData;
}

type TabMode = 'streak' | 'guild';

const GROUP_SIZE = 10;

// ── Chest Reward Config ──
const CHEST_REWARDS = [
  { rank: 1, label: '1ST', multiplier: 3, lottie: '/assets/lottie/legendary_chest.json', size: 120, color: '#FFD700', glowColor: 'rgba(255,215,0,0.5)', bgGlow: 'radial-gradient(ellipse at 50% 50%, rgba(255,215,0,0.15) 0%, transparent 70%)' },
  { rank: 2, label: '2ND', multiplier: 2, lottie: '/assets/lottie/alliance_chest.json', size: 90, color: '#C0C0C0', glowColor: 'rgba(192,192,192,0.4)', bgGlow: 'radial-gradient(ellipse at 50% 50%, rgba(192,192,192,0.1) 0%, transparent 70%)' },
  { rank: 3, label: '3RD', multiplier: 1.5, lottie: '/assets/lottie/daily_chest.json', size: 70, color: '#CD7F32', glowColor: 'rgba(205,127,50,0.35)', bgGlow: 'radial-gradient(ellipse at 50% 50%, rgba(205,127,50,0.08) 0%, transparent 70%)' },
];

// ── Constants ──
const RANK_COLORS: Record<string, string> = {
  E: '#78716c', D: '#f97316', C: '#60a5fa', B: '#00d4ff', A: '#eab308', S: '#a855f7',
};

const RANK_GLOW: Record<string, string> = {
  E: 'rgba(120,113,108,0.3)', D: 'rgba(249,115,22,0.3)', C: 'rgba(96,165,250,0.3)',
  B: 'rgba(6,182,212,0.3)', A: 'rgba(234,179,8,0.4)', S: 'rgba(168,85,247,0.5)',
};

const HUNTER_TITLES = ['FORGE SOVEREIGN', 'APEX ELITE', 'APEX ELITE', 'S-RANK ELITE', 'S-RANK ELITE', 'A-RANK HUNTER'];

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




// ═══════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
const LeaderboardView: React.FC<LeaderboardViewProps> = ({ player }) => {
  const [streakEntries, setStreakEntries] = useState<LeaderboardEntry[]>([]);
  const [guildEntries, setGuildEntries] = useState<GuildLeaderboardEntry[]>([]);
  const [activeTab, setActiveTab] = useState<TabMode>('streak');
  const [yourGuildRank, setYourGuildRank] = useState<number | null>(null);
  const [yourGuildEntry, setYourGuildEntry] = useState<GuildLeaderboardEntry | null>(null);

  // Lottie animation data
  const [chestAnims, setChestAnims] = useState<Record<string, any>>({});
  useEffect(() => {
    CHEST_REWARDS.forEach(c => {
      fetch(c.lottie).then(r => r.json()).then(data => {
        setChestAnims(prev => ({ ...prev, [c.lottie]: data }));
      }).catch(() => {});
    });
  }, []);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [weekEnd, setWeekEnd] = useState<string | null>(null);
  const [countdown, setCountdown] = useState('');
  // Neighborhood view state
  const [yourRank, setYourRank] = useState<number | null>(null);
  const [neighborhood, setNeighborhood] = useState<{
    above: LeaderboardEntry[];
    below: LeaderboardEntry[];
  } | null>(null);
  const [yourEntry, setYourEntry] = useState<LeaderboardEntry | null>(null);

  const { addNotification, setPlayer, updateServerBaseline } = useSystem();

  const [expandedTarget, setExpandedTarget] = useState<string | null>(null);

  // ── Profile Popup State ──
  const [profileTarget, setProfileTarget] = useState<SimEntry | null>(null);

  // ── Report Modal State ──
  const [reportTarget, setReportTarget] = useState<SimEntry | null>(null);
  const [reportChecks, setReportChecks] = useState({ cheating: true, hacking: true, unusualActivity: true });
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportDone, setReportDone] = useState(false);

  const openReport = (entry: SimEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    setReportChecks({ cheating: true, hacking: true, unusualActivity: true });
    setReportDone(false);
    setReportTarget(entry);
  };

  const submitReport = async () => {
    if (!reportTarget) return;
    setReportSubmitting(true);
    const reasons: string[] = [];
    if (reportChecks.cheating) reasons.push('Cheating');
    if (reportChecks.hacking) reasons.push('Hacking');
    if (reportChecks.unusualActivity) reasons.push('Unusual Activity');
    try {
      await authenticatedFetch(`${API_BASE}/api/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reporterUserId: player.userId,
          reporterName: player.username || player.name,
          reportedUserId: reportTarget.supabase_id || reportTarget.player_id || '',
          reportedName: reportTarget.username || reportTarget.name,
          reportedLevel: reportTarget.level,
          reportedRank: reportTarget.computedRank,
          reportedXp: reportTarget.dominance,
          reportedOutfitId: reportTarget.outfitId,
          reasons,
        }),
      });
      setReportDone(true);
      setTimeout(() => setReportTarget(null), 1800);
    } catch {
      addNotification('Failed to submit report. Try again.', 'DANGER');
    } finally {
      setReportSubmitting(false);
    }
  };

  // ── Rank Reward State ──
  const [pendingReward, setPendingReward] = useState<{
    id: string; rank: number; reward_gold: number; reward_xp: number;
  } | null>(null);
  const [showRewardOverlay, setShowRewardOverlay] = useState(false);
  const rewardCheckedRef = useRef(false);

  // ── Season reward generation logic ──
  const seasonRewardData = useMemo(() => {
    if (!pendingReward) return null;
    const rank = Math.min(pendingReward.rank, 3);

    // #1: EXCLUSIVE borders (premium, streak rewards)
    const exclusiveBorders = [
      { name: 'Iron Will', image: '/borders/border-streak-gold.webp' },
      { name: 'Inferno', image: '/borders/border-streak-inferno.webp' },
      { name: 'Eternal Flame', image: '/borders/border-streak-eternal.webp' },
    ];

    // #2: BEASTS borders (dragons, phoenixes)
    const beastsBorders = [
      { name: 'Gold Dragon', image: '/borders/border-golddragon.webp' },
      { name: 'Phoenix Blaze', image: '/borders/border-phoenix.webp' },
      { name: 'Dragon Coil', image: '/borders/dragon.webp' },
    ];

    // #3: ELEMENTS borders (ice, nature)
    const elementsBorders = [
      { name: 'Ice Crown', image: '/borders/ice-transparent.webp' },
      { name: 'Silversteel Aegis', image: '/borders/silverrank-Photoroom.webp' },
    ];

    let borderPool: { name: string; image: string }[];
    let goldMin: number;
    let goldMax: number;
    let keys: number;

    if (rank === 1) {
      borderPool = exclusiveBorders;
      goldMin = 3000; goldMax = 5000; keys = 3;
    } else if (rank === 2) {
      borderPool = beastsBorders;
      goldMin = 2000; goldMax = 3000; keys = 2;
    } else {
      borderPool = elementsBorders;
      goldMin = 1000; goldMax = 2000; keys = 1;
    }

    const border = borderPool[Math.floor(Math.random() * borderPool.length)];
    // Gold in multiples of 50
    const goldSteps = Math.floor((goldMax - goldMin) / 50);
    const goldAmount = goldMin + Math.floor(Math.random() * (goldSteps + 1)) * 50;

    return {
      rank,
      borderName: border.name,
      borderImage: border.image,
      goldAmount,
      keys,
    };
  }, [pendingReward]);

  // Check for unclaimed rank rewards on mount (per-user via API)
  useEffect(() => {
    if (!player.userId || rewardCheckedRef.current) return;
    rewardCheckedRef.current = true;

    (async () => {
      try {
        const res = await authenticatedFetch(
          `${API_BASE}/api/leaderboard/rewards?userId=${player.userId}`
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
      const [streakRes, guildRes] = await Promise.all([
        authenticatedFetch(`${API_BASE}/api/leaderboard?type=streak&userId=${encodeURIComponent(player.userId || '')}`),
        authenticatedFetch(`${API_BASE}/api/leaderboard?type=guild&userId=${encodeURIComponent(player.userId || '')}`),
      ]);
      if (streakRes.ok) {
        const streakData = await streakRes.json();
        setStreakEntries(streakData.entries || []);
        if (activeTab === 'streak') {
          setYourRank(streakData.yourRank || null);
          setYourEntry(streakData.yourEntry || null);
          setNeighborhood(streakData.neighborhood || null);
        }
      }
      if (guildRes.ok) {
        const guildData = await guildRes.json();
        setGuildEntries(guildData.entries || []);
        setYourGuildRank(guildData.yourRank || null);
        setYourGuildEntry(guildData.yourEntry || null);
      }
    } catch { /* offline */ } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [player.userId, activeTab]);

  // Poll every 10 seconds
  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(() => fetchLeaderboard(), 60_000);
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

  // ── Instant refresh when border is changed in Store ──
  useEffect(() => {
    const onBorderRefresh = () => {
      // Delay to let cloud sync complete
      setTimeout(() => fetchLeaderboard(true), 3000);
    };
    window.addEventListener('leaderboard:refresh', onBorderRefresh);
    return () => window.removeEventListener('leaderboard:refresh', onBorderRefresh);
  }, [fetchLeaderboard]);

  // ── Refresh on tab visibility change (user switches back) ──
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        setTimeout(() => fetchLeaderboard(), 1500);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [fetchLeaderboard]);

  // ── Build entries with NPC merge ──
  // Generate NPCs unique to this user, mix with real entries
  const rawEntries = streakEntries;

  // Generate NPCs (stable for this user + this week)
  const npcEntries = useMemo(() => {
    const seedId = player.userId || player.username || 'local-guest';
    return generateNPCsForUser(seedId, 15) as unknown as LeaderboardEntry[];
  }, [player.userId, player.username]);

  // Merge real entries + NPCs
  const entries = useMemo(() => {
    // Streak tab: all real entries + NPCs mixed in
    return [...rawEntries, ...npcEntries];
  }, [rawEntries, npcEntries]);

  const simulatedEntries: SimEntry[] = useMemo(() => {
    const myPlayerId = player.userId || '';
    const myUsername = (player.username || '').trim().toLowerCase();

    return entries.map((e, i) => {
      const isMe = !!(
        (myUsername && (e.username || '').trim().toLowerCase() === myUsername) ||
        (myPlayerId && e.supabase_id === myPlayerId)
      );

      return {
        ...e,
        isMe,
        dominance: e.streak || 0,
        isDebuffed: false,
        computedRank: computeRankFromLevel(e.level || 1),
        outfitId: e.equipped_outfit_id || 'outfit_starter',
        streak: e.streak || 0,
        borderId: e.equipped_border || null,
        bannerId: e.equipped_banner || null,
      };
    }).sort((a, b) => b.dominance - a.dominance);
  }, [entries, player.userId, player.username]);

  const myIndex = simulatedEntries.findIndex(e => e.isMe);
  const globalMyRank = myIndex >= 0 ? myIndex + 1 : 999;
  const myRank = globalMyRank;

  // Streak tab: show top 50
  const { groupEntries, groupStart, groupEnd } = useMemo(() => {
    const top = simulatedEntries.slice(0, 50);
    return { groupEntries: top, groupStart: 1, groupEnd: top.length };
  }, [simulatedEntries]);


  // ── Format XP ──
  const formatXp = (xp: number) => {
    if (xp >= 1_000_000) return `${(xp / 1_000_000).toFixed(1)}M`;
    if (xp >= 1_000) return `${(xp / 1_000).toFixed(1)}K`;
    return xp.toString();
  };

  // ── Countdown timer for weekly reset ──
  useEffect(() => {
    if (!weekEnd) return;
    const tick = () => {
      const now = Date.now();
      const end = new Date(weekEnd).getTime();
      const diff = Math.max(0, end - now);
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(`${d}d ${h}h ${m}m ${s}s`);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [weekEnd]);


  return (
    <div className="min-h-screen pb-24">

      {/* ── HEADER ── */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Leaderboard</h1>
            <div className="text-xs text-gray-400 mt-0.5">
              {activeTab === 'streak' ? (
                <>Top players by streak{myIndex >= 0 ? <span className="text-[#00d4ff] font-bold"> — #{myRank} overall</span> : ''}</>
              ) : (
                <>Top clans by level{yourGuildRank !== null ? <span className="text-[#00d4ff] font-bold"> — #{yourGuildRank} overall</span> : ''}</>
              )}
            </div>
          </div>
          <motion.button
            whileTap={{ rotate: 360 }}
            transition={{ duration: 0.5 }}
            onClick={() => fetchLeaderboard(true)}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            <RefreshCw size={14} className={`text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
          </motion.button>
        </div>
      </div>

      {/* ── TAB SWITCHER ── */}
      <div className="flex px-4 mb-3 gap-2">
        {(['streak', 'guild'] as TabMode[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="flex-1 py-2 flex items-center justify-center gap-1.5 rounded-xl transition-all text-xs font-black tracking-widest uppercase"
            style={{
              background: activeTab === tab ? 'rgba(255,255,255,0.08)' : 'transparent',
              color: activeTab === tab ? '#ffffff' : 'rgba(255,255,255,0.3)',
            }}
          >
            {tab === 'streak' ? <Flame size={13} /> : <Users size={13} />}
            {tab === 'streak' ? 'STREAK' : 'GUILD'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }} className="text-gray-600 text-xs font-mono">
            Loading...
          </motion.div>
        </div>
      ) : activeTab === 'guild' ? (
        <>
          {/* ═══ GUILD SEASON REWARDS INFO BANNER ═══ */}
          <div className="mx-4 mb-4 rounded-2xl p-4 overflow-hidden" style={{
            background: 'linear-gradient(180deg, rgba(0,212,255,0.04) 0%, rgba(10,10,15,0.95) 100%)',
            border: '1px solid rgba(0,212,255,0.15)',
          }}>
            <div className="text-center">
              <div className="text-[8px] font-mono tracking-[0.3em] uppercase text-cyan-400/70 mb-1">// Season Rewards</div>
              <div className="text-sm font-black text-white tracking-tight mb-2">Weekly Guild Season Gold Rewards</div>
              <div className="grid grid-cols-4 gap-1.5 mt-2">
                {[
                  { place: '1ST 👑', reward: '5000 G' },
                  { place: '2ND 🥈', reward: '3000 G' },
                  { place: '3RD 🥉', reward: '1000 G' },
                  { place: 'OTHERS 🛡️', reward: '500 G' },
                ].map(r => (
                  <div key={r.place} className="bg-slate-900/60 border border-slate-800 rounded-xl p-2 text-center">
                    <div className="text-[7px] text-gray-400 font-mono tracking-wider mb-0.5">{r.place}</div>
                    <div className="text-[10px] font-black text-[#00d4ff] font-mono">{r.reward}</div>
                  </div>
                ))}
              </div>
              <div className="text-[8px] text-gray-500 font-mono mt-3 text-center uppercase tracking-wider">
                Rewards are distributed automatically directly to each clan's Vault every Sunday at UTC midnight.
              </div>
            </div>
          </div>

          {/* ── TOP 3 GUILD PODIUM ── */}
          {guildEntries.length >= 3 && (
            <div className="flex items-end justify-center gap-3 px-4 pt-2 pb-6">
              {/* 2nd place (left) */}
              {(() => {
                const g = guildEntries[1];
                return (
                  <div className="flex flex-col items-center gap-1.5 flex-1 cursor-pointer">
                    <div className="text-lg">🥈</div>
                    <div className="relative p-0.5 rounded-full border border-slate-700/60 shadow-lg">
                      <img src={getGuildIconUrl(g.icon)} className="w-16 h-16 object-contain" alt="Guild Icon" />
                    </div>
                    <div className="text-[11px] font-black text-white truncate max-w-[80px] text-center mt-1">
                      {g.name} <span className="text-[9px] font-bold text-gray-400">[{g.tag}]</span>
                    </div>
                    <div className="text-[9px] font-bold font-mono text-cyan-400">
                      LEVEL {g.level}
                    </div>
                    <div className="text-[8px] font-bold text-gray-500 font-mono">
                      {g.memberCount}/{g.memberCap} members
                    </div>
                  </div>
                );
              })()}

              {/* 1st place (center, elevated) */}
              {(() => {
                const g = guildEntries[0];
                return (
                  <div className="flex flex-col items-center gap-1.5 flex-1 -mt-4 cursor-pointer relative">
                    <motion.div
                      className="absolute rounded-full pointer-events-none"
                      style={{
                        width: 90,
                        height: 90,
                        top: 10,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'radial-gradient(circle, rgba(0,212,255,0.12) 0%, transparent 70%)',
                      }}
                      animate={{ scale: [1, 1.12, 1], opacity: [0.5, 0.9, 0.5] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <div className="text-2xl">👑</div>
                    <div className="relative p-0.5 rounded-full border border-cyan-500/30 shadow-cyan-500/10 shadow-xl" style={{ background: 'rgba(0,212,255,0.05)' }}>
                      <img src={getGuildIconUrl(g.icon)} className="w-20 h-20 object-contain" alt="Guild Icon" />
                    </div>
                    <div className="text-xs font-black text-white truncate max-w-[90px] text-center mt-1">
                      {g.name} <span className="text-[10px] font-bold text-gray-400">[{g.tag}]</span>
                    </div>
                    <div className="text-[10px] font-black font-mono text-cyan-400">
                      LEVEL {g.level}
                    </div>
                    <div className="text-[8px] font-bold text-gray-400 font-mono">
                      {g.memberCount}/{g.memberCap} members
                    </div>
                  </div>
                );
              })()}

              {/* 3rd place (right) */}
              {(() => {
                const g = guildEntries[2];
                return (
                  <div className="flex flex-col items-center gap-1.5 flex-1 cursor-pointer">
                    <div className="text-lg">🥉</div>
                    <div className="relative p-0.5 rounded-full border border-slate-700/60 shadow-lg">
                      <img src={getGuildIconUrl(g.icon)} className="w-16 h-16 object-contain" alt="Guild Icon" />
                    </div>
                    <div className="text-[11px] font-black text-white truncate max-w-[80px] text-center mt-1">
                      {g.name} <span className="text-[9px] font-bold text-gray-400">[{g.tag}]</span>
                    </div>
                    <div className="text-[9px] font-bold font-mono text-cyan-400">
                      LEVEL {g.level}
                    </div>
                    <div className="text-[8px] font-bold text-gray-500 font-mono">
                      {g.memberCount}/{g.memberCap} members
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ── GUILD LIST ── */}
          <div className="px-4 space-y-2">
            {guildEntries.slice(guildEntries.length >= 3 ? 3 : 0).map((entry, index) => {
              const actualRank = guildEntries.length >= 3 ? index + 4 : index + 1;
              const isMyGuild = yourGuildEntry?.id === entry.id;

              return (
                <motion.div
                  key={`guild-${entry.id}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.02 }}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-transform"
                  style={{
                    background: isMyGuild
                      ? 'rgba(0,212,255,0.08)'
                      : 'rgba(255,255,255,0.03)',
                    ...(isMyGuild ? { border: '1.5px solid rgba(0,212,255,0.25)', boxShadow: '0 0 16px rgba(0,212,255,0.1)' } : {}),
                  }}
                >
                  {/* Rank number */}
                  <div className="w-7 text-center shrink-0">
                    <span className={`text-sm font-black font-mono ${isMyGuild ? 'text-[#00d4ff]' : 'text-gray-500'}`}>{actualRank}</span>
                  </div>

                  {/* Icon */}
                  <div className="shrink-0 p-0.5 rounded-full bg-slate-900 border border-slate-800">
                    <img src={getGuildIconUrl(entry.icon)} className="w-10 h-10 object-contain" alt="Guild Icon" />
                  </div>

                  {/* Name + Tag */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-white truncate">{entry.name}</span>
                      <span className="text-[10px] font-black text-gray-400 shrink-0">[{entry.tag}]</span>
                      {isMyGuild && <span className="text-[8px] px-1.5 py-0.5 rounded bg-[#00d4ff]/15 text-[#00d4ff] font-black tracking-wider shrink-0">your clan</span>}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono mt-0.5">
                      <span>{entry.memberCount}/{entry.memberCap} members</span>
                      <span>•</span>
                      <span className="flex items-center gap-0.5"><Coins size={10} className="text-amber-500 animate-pulse" /> {entry.vault_balance}</span>
                    </div>
                  </div>

                  {/* Level */}
                  <div className="flex flex-col items-end shrink-0">
                    <span className={`text-sm font-black font-mono ${isMyGuild ? 'text-[#00d4ff]' : 'text-cyan-400'}`}>LVL {entry.level}</span>
                    <span className="text-[8px] text-gray-500 font-mono tracking-wider mt-0.5">TOTAL LVL</span>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* ── HIGHLIGHTED USER GUILD POSITION AT BOTTOM IF NOT IN TOP 50 ── */}
          {yourGuildEntry && guildEntries.findIndex(e => e.id === yourGuildEntry.id) < 0 && (
            <div className="px-4 mt-2">
              <div style={{
                height: 1,
                margin: '12px 0',
                background: 'repeating-linear-gradient(90deg, rgba(0,212,255,0.3) 0px, rgba(0,212,255,0.3) 4px, transparent 4px, transparent 12px)',
              }} />
              <div className="text-center text-[9px] font-mono text-gray-600 mb-2">YOUR CLAN POSITION</div>
              
              <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl"
                style={{
                  background: 'rgba(0,212,255,0.08)',
                  border: '1.5px solid rgba(0,212,255,0.25)',
                  boxShadow: '0 0 16px rgba(0,212,255,0.1)',
                }}
              >
                <div className="w-7 text-center shrink-0">
                  <span className="text-sm font-black text-[#00d4ff] font-mono">{yourGuildRank}</span>
                </div>
                <div className="shrink-0 p-0.5 rounded-full bg-slate-900 border border-slate-800">
                  <img src={getGuildIconUrl(yourGuildEntry.icon)} className="w-10 h-10 object-contain" alt="Guild Icon" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-white truncate">{yourGuildEntry.name}</span>
                    <span className="text-[10px] font-black text-gray-400 shrink-0">[{yourGuildEntry.tag}]</span>
                    <span className="text-[8px] px-1.5 py-0.5 rounded bg-[#00d4ff]/15 text-[#00d4ff] font-black tracking-wider shrink-0">your clan</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono mt-0.5">
                    <span>{yourGuildEntry.memberCount}/{yourGuildEntry.memberCap} members</span>
                    <span>•</span>
                    <span className="flex items-center gap-0.5"><Coins size={10} className="text-amber-500" /> {yourGuildEntry.vault_balance}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <span className="text-sm font-black font-mono text-[#00d4ff]">LVL {yourGuildEntry.level}</span>
                  <span className="text-[8px] text-gray-500 font-mono tracking-wider mt-0.5">TOTAL LVL</span>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="text-center py-4 mt-2">
            <span className="text-[10px] text-gray-600 font-mono">Updated every 60 seconds · Top clans by level</span>
          </div>
        </>
      ) : simulatedEntries.length === 0 ? (
        <div className="text-center py-20 text-gray-600 text-sm font-mono">
          No active streaks.
        </div>
      ) : (
        <>
          {/* ── TOP 3 PODIUM ── */}
          {simulatedEntries.length >= 3 && (
            <div className="flex items-end justify-center gap-3 px-4 pt-2 pb-6">
              {/* 2nd place (left) */}
              {(() => {
                const e = simulatedEntries[1];
                return (
                  <div className="flex flex-col items-center gap-1.5 flex-1" onClick={() => setProfileTarget(e)}>
                    <div className="text-lg">🥈</div>
                    <AvatarWithBorder avatarUrl={e.avatar_url} borderId={e.equipped_border || null} size={64} />
                    <div className="text-[11px] font-black text-white truncate max-w-[80px] text-center">
                      {e.username || e.name}
                    </div>
                    <div className="flex items-center gap-1">
                      <><Flame size={13} className="text-orange-400" /><span className="text-sm font-black text-orange-400">{e.streak}</span></>
                    </div>
                  </div>
                );
              })()}

              {/* 1st place (center, elevated) */}
              {(() => {
                const e = simulatedEntries[0];
                return (
                  <div className="flex flex-col items-center gap-1.5 flex-1 -mt-4" onClick={() => setProfileTarget(e)}>
                    <div className="text-2xl">👑</div>
                    <AvatarWithBorder avatarUrl={e.avatar_url} borderId={e.equipped_border || null} size={80} />
                    <div className="text-xs font-black text-white truncate max-w-[90px] text-center">
                      {e.username || e.name}
                    </div>
                    <div className="flex items-center gap-1">
                      <><Flame size={14} className="text-orange-400" /><span className="text-base font-black text-orange-400">{e.streak}</span></>
                    </div>
                  </div>
                );
              })()}

              {/* 3rd place (right) */}
              {(() => {
                const e = simulatedEntries[2];
                return (
                  <div className="flex flex-col items-center gap-1.5 flex-1" onClick={() => setProfileTarget(e)}>
                    <div className="text-lg">🥉</div>
                    <AvatarWithBorder avatarUrl={e.avatar_url} borderId={e.equipped_border || null} size={64} />
                    <div className="text-[11px] font-black text-white truncate max-w-[80px] text-center">
                      {e.username || e.name}
                    </div>
                    <div className="flex items-center gap-1">
                      <><Flame size={13} className="text-orange-400" /><span className="text-sm font-black text-orange-400">{e.streak}</span></>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ── REMAINING PLAYERS (4th onward) ── */}
          <div className="px-4 space-y-2">
            {simulatedEntries.slice(3).map((entry, index) => {
              const actualRank = index + 4;
              return (
                <motion.div
                  key={`${activeTab}-${entry.username || entry.name}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.02 }}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-2xl cursor-pointer active:scale-[0.98] transition-transform"
                  style={{
                    background: entry.isMe
                      ? 'rgba(0,212,255,0.08)'
                      : 'rgba(255,255,255,0.03)',
                  }}
                  onClick={() => setProfileTarget(entry)}
                >
                  {/* Rank number */}
                  <div className="w-7 text-center">
                    <span className="text-sm font-black text-gray-500 font-mono">{actualRank}</span>
                  </div>

                  {/* Avatar with border */}
                  <AvatarWithBorder avatarUrl={entry.avatar_url} borderId={entry.equipped_border || null} size={44} className="shrink-0" />

                  {/* Name + YOU tag */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-white truncate">
                        {entry.username || entry.name}
                      </span>
                      {entry.isMe && (
                        <span className="text-[8px] px-1.5 py-0.5 rounded bg-[#00d4ff]/15 text-[#00d4ff] font-black tracking-wider">you</span>
                      )}
                    </div>
                  </div>

                  {/* Value — XP or Streak */}
                  <div className="flex items-center gap-1 shrink-0">
                    <><span className="text-base font-black text-orange-400">{entry.streak}</span><Flame size={15} className="text-orange-400" /></>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* ── NEIGHBORHOOD VIEW: Show user's position when not in top 50 ── */}
          {myIndex < 0 && yourRank && yourEntry && (
            <div className="px-4 mt-2">
              {/* Dotted separator */}
              <div style={{
                height: 1,
                margin: '12px 0',
                background: 'repeating-linear-gradient(90deg, rgba(0,212,255,0.3) 0px, rgba(0,212,255,0.3) 4px, transparent 4px, transparent 12px)',
              }} />
              <div className="text-center text-[9px] font-mono text-gray-600 mb-2">YOUR POSITION</div>

              <div className="space-y-2">
                {/* Players above */}
                {neighborhood?.above.map((entry, i) => {
                  const aboveRank = yourRank - (neighborhood.above.length - i);
                  return (
                    <div
                      key={`above-${entry.username || entry.name}`}
                      className="flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer"
                      style={{ background: 'rgba(255,255,255,0.03)' }}
                    >
                      <div className="w-7 text-center">
                        <span className="text-sm font-black text-gray-500 font-mono">{aboveRank > 0 ? aboveRank : '?'}</span>
                      </div>
                      <AvatarWithBorder avatarUrl={entry.avatar_url} borderId={entry.equipped_border || null} size={44} className="shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-black text-white truncate block">{entry.username || entry.name}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <><span className="text-base font-black text-orange-400">{entry.streak}</span><Flame size={15} className="text-orange-400" /></>
                      </div>
                    </div>
                  );
                })}

                {/* YOUR ROW — highlighted */}
                <div
                  className="flex items-center gap-3 px-4 py-3.5 rounded-2xl"
                  style={{
                    background: 'rgba(0,212,255,0.08)',
                    border: '1.5px solid rgba(0,212,255,0.25)',
                    boxShadow: '0 0 16px rgba(0,212,255,0.1)',
                  }}
                >
                  <div className="w-7 text-center">
                    <span className="text-sm font-black text-[#00d4ff] font-mono">{yourRank}</span>
                  </div>
                  <AvatarWithBorder avatarUrl={yourEntry.avatar_url} borderId={yourEntry.equipped_border || null} size={44} className="shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-white truncate">{yourEntry.username || yourEntry.name}</span>
                      <span className="text-[8px] px-1.5 py-0.5 rounded bg-[#00d4ff]/15 text-[#00d4ff] font-black tracking-wider">you</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <><span className="text-base font-black text-orange-400">{yourEntry.streak}</span><Flame size={15} className="text-orange-400" /></>
                  </div>
                </div>

                {/* Players below */}
                {neighborhood?.below.map((entry, i) => {
                  const belowRank = yourRank + 1 + i;
                  return (
                    <div
                      key={`below-${entry.username || entry.name}`}
                      className="flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer"
                      style={{ background: 'rgba(255,255,255,0.03)' }}
                    >
                      <div className="w-7 text-center">
                        <span className="text-sm font-black text-gray-500 font-mono">{belowRank}</span>
                      </div>
                      <AvatarWithBorder avatarUrl={entry.avatar_url} borderId={entry.equipped_border || null} size={44} className="shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-black text-white truncate block">{entry.username || entry.name}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <><span className="text-base font-black text-orange-400">{entry.streak}</span><Flame size={15} className="text-orange-400" /></>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="text-center py-4 mt-2">
            <span className="text-[10px] text-gray-600 font-mono">Updated every 60 seconds · Top streak hunters</span>
          </div>
        </>
      )}



      {/* ══════════════ HUNTER PROFILE POPUP (portal to escape stacking context) ══════════════ */}
      {ReactDOM.createPortal(
      <>
      <AnimatePresence>
        {profileTarget && (() => {
          const pEntry = profileTarget;
          const pRankColor = RANK_COLORS[pEntry.computedRank] || '#78716c';
          const pTitle = getHunterTitle(simulatedEntries.findIndex(e => (e.username || e.name) === (pEntry.username || pEntry.name)) + 1);

          return (
            <motion.div
              className="fixed inset-0 z-[100000] flex items-end justify-center"
              style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setProfileTarget(null)}
            >
              <motion.div
                className="w-full max-w-sm rounded-t-3xl overflow-hidden"
                style={{ background: 'linear-gradient(180deg, #0a0a1a 0%, #08081a 100%)', border: '1px solid rgba(255,255,255,0.06)', borderBottom: 'none', maxHeight: '85vh' }}
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                onClick={e => e.stopPropagation()}
              >
                {/* Scrollable content wrapper */}
                <div style={{ maxHeight: '85vh', overflowY: 'auto', overflowX: 'hidden' }}>
                {/* ── Banner — shows player's real equipped banner ── */}
                {(() => {
                  const bannerStoreItem = pEntry.bannerId ? getItemById(pEntry.bannerId) : null;
                  const bannerSrc = BORDERS_ACTIVE
                    ? (bannerStoreItem?.bannerImage || '/banners/defaultreforgebanner.webp')
                    : '/banners/defaultreforgebanner.webp';
                  return (
                    <div className="relative h-32 overflow-hidden">
                      <img
                        src={bannerSrc}
                        alt="Banner"
                        className="w-full h-full object-cover"
                        style={{ objectPosition: 'center center' }}
                      />
                      {/* Gradient overlay */}
                      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 30%, #0a0a1a 100%)' }} />
                      {/* Close button */}
                      <button
                        onClick={() => setProfileTarget(null)}
                        className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90"
                        style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.08)' }}
                      >
                        <X size={14} className="text-white" />
                      </button>
                      {/* Username in header */}
                      <div className="absolute top-3 left-4">
                        <span className="text-[11px] font-black text-white/80 font-mono tracking-wider">{pEntry.username || pEntry.name}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* ── Profile Content ── */}
                <div className="px-5 pb-10 -mt-8 relative z-10">
                  {/* Avatar + Info */}
                  <div className="flex items-end gap-4 mb-5">
                    <AvatarWithBorder avatarUrl={pEntry.avatar_url} borderId={pEntry.borderId} size={72} className="shrink-0" style={{ boxShadow: '0 0 20px rgba(0,0,0,0.8)' }} />
                    <div className="pb-1 min-w-0 flex-1">
                      <div className="text-[10px] font-black uppercase tracking-widest mb-0.5" style={{ color: pRankColor }}>{pTitle}</div>
                      <div className="text-base font-black text-white truncate">{pEntry.username || pEntry.name}</div>
                      <div className="text-[10px] text-gray-500 font-mono">@{(pEntry.username || pEntry.name || '').toLowerCase().replace(/\s+/g, '')}</div>
                    </div>
                  </div>

                  {/* ── Stats — 3 column, liquid glass, monochromatic pale cyan ── */}
                  <div className="grid grid-cols-3 gap-2.5 mb-5">
                    {[
                      { label: 'LEVEL', value: `${pEntry.level}` },
                      { label: 'RANK', value: pEntry.computedRank },
                      { label: 'STREAK', value: `🔥${pEntry.streak}` },
                    ].map(s => (
                      <div key={s.label} className="rounded-2xl p-3 text-center"
                        style={{
                          background: 'rgba(0,212,255,0.06)',
                          backdropFilter: 'blur(12px)',
                          WebkitBackdropFilter: 'blur(12px)',
                          border: '1px solid rgba(0,212,255,0.12)',
                          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 16px rgba(0,0,0,0.3)',
                        }}>
                        <div className="text-[15px] font-black font-mono" style={{ color: '#33dfff' }}>{s.value}</div>
                        <div className="text-[7px] font-mono uppercase tracking-[0.18em] mt-1" style={{ color: 'rgba(0,212,255,0.5)' }}>{s.label}</div>
                      </div>
                    ))}
                  </div>



                  {/* ── Report Button ── */}
                  {!pEntry.isMe && (
                    <button
                      onClick={() => { setProfileTarget(null); setTimeout(() => openReport(pEntry, { stopPropagation: () => {} } as any), 200); }}
                      className="w-full py-3 rounded-xl flex items-center justify-center gap-2.5 transition-all active:scale-[0.97]"
                      style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', color: '#f87171' }}
                    >
                      <Flag size={13} />
                      <span className="text-[10px] font-black tracking-widest uppercase">Report Player</span>
                    </button>
                  )}

                  {pEntry.isMe && (
                    <div className="w-full py-3 rounded-xl flex items-center justify-center gap-2 border border-[#00d4ff]/15 bg-[#00d4ff]/5">
                      <span className="text-[10px] font-black tracking-widest uppercase text-[#00d4ff]">Your Profile</span>
                    </div>
                  )}
                </div>
                </div>{/* end scrollable content wrapper */}
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>


      {/* ── REPORT MODAL ── */}
      <AnimatePresence>
        {reportTarget && (
          <motion.div
            className="fixed inset-0 z-[100001] flex items-end justify-center"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setReportTarget(null)}
          >
            <motion.div
              className="w-full max-w-sm rounded-t-3xl p-6 pb-28"
              style={{ background: 'linear-gradient(180deg, #0f0f1f 0%, #08081a 100%)', border: '1px solid rgba(239,68,68,0.2)', borderBottom: 'none' }}
              initial={{ y: 120, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 120, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}>
                    <AlertTriangle size={15} className="text-red-400" />
                  </div>
                  <div>
                    <div className="text-sm font-black text-white">Report Player</div>
                    <div className="text-[9px] text-gray-500 font-mono truncate max-w-[180px]">{reportTarget.username || reportTarget.name}</div>
                  </div>
                </div>
                <button onClick={() => setReportTarget(null)} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <X size={13} className="text-gray-400" />
                </button>
              </div>

              {reportDone ? (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="py-6 flex flex-col items-center gap-3"
                >
                  <div className="text-2xl">✅</div>
                  <div className="text-sm font-black text-green-400">Report Submitted</div>
                  <div className="text-[10px] text-gray-500 font-mono text-center">Our team will review this report. Thank you.</div>
                </motion.div>
              ) : (
                <>
                  <div className="text-[10px] text-gray-400 font-mono mb-4 uppercase tracking-widest">Select reasons (all apply by default)</div>
                  <div className="space-y-2 mb-6">
                    {([
                      { key: 'cheating', label: 'Cheating', desc: 'Using exploits or unfair advantages' },
                      { key: 'hacking', label: 'Hacking', desc: 'Modifying game data or using scripts' },
                      { key: 'unusualActivity', label: 'Unusual Activity', desc: 'Suspicious stat progression or behavior' },
                    ] as { key: keyof typeof reportChecks; label: string; desc: string }[]).map(({ key, label, desc }) => (
                      <button
                        key={key}
                        onClick={() => setReportChecks(prev => ({ ...prev, [key]: !prev[key] }))}
                        className="w-full flex items-center gap-3 rounded-xl px-3.5 py-3 transition-all"
                        style={{
                          background: reportChecks[key] ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.02)',
                          border: reportChecks[key] ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(255,255,255,0.06)',
                        }}
                      >
                        {reportChecks[key]
                          ? <CheckSquare size={16} className="text-red-400 shrink-0" />
                          : <Square size={16} className="text-gray-600 shrink-0" />
                        }
                        <div className="text-left">
                          <div className="text-[11px] font-black text-white">{label}</div>
                          <div className="text-[9px] text-gray-500 font-mono">{desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={submitReport}
                    disabled={reportSubmitting || (!reportChecks.cheating && !reportChecks.hacking && !reportChecks.unusualActivity)}
                    className="w-full py-3.5 rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #dc2626, #991b1b)', boxShadow: '0 4px 20px rgba(220,38,38,0.3)', color: '#fff' }}
                  >
                    <Send size={13} />
                    {reportSubmitting ? 'Submitting...' : 'Submit Report'}
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </>,
      document.body
      )}

      {/* ── SEASON REWARD OVERLAY (replaces old RankRewardOverlay) ── */}
      <AnimatePresence>
        {showRewardOverlay && pendingReward && seasonRewardData && (
          <SeasonRewardOverlay
            reward={seasonRewardData}
            onClaim={async () => {
              setShowRewardOverlay(false);

              // Actually add gold, keys, and equip border on the player
              const earnedGold = seasonRewardData.goldAmount;
              const earnedKeys = seasonRewardData.keys;
              const earnedBorderId = (() => {
                // Map border name to store item ID
                const borderMap: Record<string, string> = {
                  'Iron Will': 'border-streak-gold',
                  'Inferno': 'border-streak-inferno',
                  'Eternal Flame': 'border-streak-eternal',
                  'Gold Dragon': 'border-gold-dragon',
                  'Phoenix Blaze': 'border-phoenix',
                  'Dragon Coil': 'border-dragon-img',
                  'Ice Crown': 'border-ice-img',
                  'Silversteel Aegis': 'border-podium-silver',
                };
                return borderMap[seasonRewardData.borderName] || null;
              })();

              // Update local player state immediately
              setPlayer(prev => {
                const newGold = (prev.gold || 0) + earnedGold;
                const newKeys = (prev.keys || 0) + earnedKeys;
                const newOwned = [...(prev.ownedBorders || [])];
                if (earnedBorderId && !newOwned.includes(earnedBorderId)) {
                  newOwned.push(earnedBorderId);
                }
                return {
                  ...prev,
                  gold: newGold,
                  keys: newKeys,
                  ownedBorders: newOwned,
                  equippedBorder: earnedBorderId || prev.equippedBorder,
                };
              });

              addNotification(
                `Season Reward: Rank #${pendingReward.rank} — +${earnedGold}G, +${earnedKeys} Keys, ${seasonRewardData.borderName} Border`,
                'SUCCESS'
              );

              // Claim on server for persistence
              try {
                const res = await authenticatedFetch(`${API_BASE}/api/leaderboard/rewards/claim`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    snapshotId: pendingReward.id,
                    goldAmount: earnedGold,
                    keys: earnedKeys,
                    borderId: earnedBorderId,
                  }),
                });
                if (res.ok) {
                  const result = await res.json();
                  if (result.player && !result.already_claimed) {
                    const p = result.player;
                    setPlayer(prev => ({
                      ...prev,
                      gold: p.gold ?? prev.gold,
                      keys: p.keys ?? prev.keys,
                      currentXp: p.currentXp ?? prev.currentXp,
                      requiredXp: p.requiredXp ?? prev.requiredXp,
                      level: p.level ?? prev.level,
                      rank: p.rank ?? prev.rank,
                      totalXp: p.totalXp ?? prev.totalXp,
                      equippedBorder: p.equippedBorder ?? prev.equippedBorder,
                      ownedBorders: p.ownedBorders ?? prev.ownedBorders,
                    }));
                    updateServerBaseline(p.gold ?? 0);
                  }
                  // ONLY clear the pending reward locally if the server successfully recorded the claim
                  setPendingReward(null);
                } else {
                  addNotification('Failed to save rewards on server. Try reopening the leaderboard to retry.', 'DANGER');
                }
                setTimeout(() => window.dispatchEvent(new Event('reforge:sync-needed')), 500);
              } catch {
                addNotification('Failed to save rewards on server. Try reopening the leaderboard to retry.', 'DANGER');
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default LeaderboardView;
