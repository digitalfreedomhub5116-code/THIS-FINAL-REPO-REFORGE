import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Lottie from 'lottie-react';
import {
  RefreshCw,
  X, Zap, Flag, AlertTriangle, CheckSquare, Square, Send, Flame, Clock, Trophy, Gift, Coins,
} from 'lucide-react';
import { PlayerData, Outfit } from '../types';
import { API_BASE } from '../lib/apiConfig';
import { getPlayerAuthHeaders, authenticatedFetch } from '../lib/playerApi';
import { useSystem } from '../hooks/useSystem';
import { playSystemSoundEffect } from '../utils/soundEngine';
import SeasonRewardOverlay from './SeasonRewardOverlay';
import { OUTFITS } from '../utils/gameData';
import OutfitHunterBadge, { OUTFIT_BADGE_CONFIG } from './OutfitHunterBadge';
import AvatarWithBorder from './AvatarWithBorder';
import { getItemById } from '../utils/storeItems';
import { generateNPCsForUser } from '../utils/npcGenerator';

// ── Types ──
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
  equippedOutfit?: Outfit;
}

type TabMode = 'xp' | 'streak';

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

// ── Outfit Config (accent colors for leaderboard row backgrounds) ──
const OUTFIT_CONFIG = OUTFIT_BADGE_CONFIG;
const DEFAULT_OUTFIT_CFG = OUTFIT_CONFIG.outfit_starter;


// ═══════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
const LeaderboardView: React.FC<LeaderboardViewProps> = ({ player, equippedOutfit }) => {
  const [xpEntries, setXpEntries] = useState<LeaderboardEntry[]>([]);
  const [streakEntries, setStreakEntries] = useState<LeaderboardEntry[]>([]);
  const [activeTab, setActiveTab] = useState<TabMode>('xp');

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
      const [xpRes, streakRes] = await Promise.all([
        authenticatedFetch(`${API_BASE}/api/leaderboard?type=xp&userId=${encodeURIComponent(player.userId || '')}`),
        authenticatedFetch(`${API_BASE}/api/leaderboard?type=streak&userId=${encodeURIComponent(player.userId || '')}`),
      ]);
      if (xpRes.ok) {
        const xpData = await xpRes.json();
        setXpEntries(xpData.entries || []);
        if (xpData.weekEnd) setWeekEnd(xpData.weekEnd);
        if (activeTab === 'xp') {
          setYourRank(xpData.yourRank || null);
          setYourEntry(xpData.yourEntry || null);
          setNeighborhood(xpData.neighborhood || null);
        }
      }
      if (streakRes.ok) {
        const streakData = await streakRes.json();
        setStreakEntries(streakData.entries || []);
        if (activeTab === 'streak') {
          setYourRank(streakData.yourRank || null);
          setYourEntry(streakData.yourEntry || null);
          setNeighborhood(streakData.neighborhood || null);
        }
      }
    } catch { /* offline */ } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

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
  const rawEntries = activeTab === 'xp' ? xpEntries : streakEntries;

  // Generate NPCs (stable for this user + this week)
  const npcEntries = useMemo(() => {
    const seedId = player.userId || player.username || 'local-guest';
    return generateNPCsForUser(seedId, 15) as unknown as LeaderboardEntry[];
  }, [player.userId, player.username]);

  // Merge real entries + NPCs
  const entries = useMemo(() => {
    // Remove ourselves from real entries (we'll re-add as the "me" row)
    const myId = player.userId || '';
    const myUsername = (player.username || '').trim().toLowerCase();
    const realOthers = rawEntries.filter(e => {
      if (myUsername && (e.username || '').trim().toLowerCase() === myUsername) return false;
      if (myId && e.supabase_id === myId) return false;
      return true;
    });

    // Find ourselves in the raw data
    const meEntry = rawEntries.find(e =>
      (myUsername && (e.username || '').trim().toLowerCase() === myUsername) ||
      (myId && e.supabase_id === myId)
    );

    if (activeTab === 'xp') {
      // XP tab: Build a unique league of 10
      // = me + up to 2 real players + fill with NPCs to reach 10
      const leagueMembers: LeaderboardEntry[] = [];

      // Add me first (from raw data or synthesize from player object)
      if (meEntry) {
        leagueMembers.push(meEntry);
      } else {
        leagueMembers.push({
          player_id: myId,
          supabase_id: myId,
          username: player.username || player.name || 'You',
          name: player.name || player.username || 'You',
          total_xp: player.totalXp || 0,
          daily_xp: player.dailyXp || 0,
          weekly_xp: player.dailyXp || 0,
          level: player.level || 1,
          rank: player.rank || 'E',
          streak: player.streak || 0,
          avatar_url: null,
          equipped_outfit_id: 'outfit_starter',
          equipped_border: null,
          equipped_banner: null,
        });
      }

      // Add up to 2 real players (nearest in XP)
      const sortedReal = [...realOthers].sort((a, b) => (b.daily_xp || 0) - (a.daily_xp || 0));
      const realToAdd = sortedReal.slice(0, Math.min(2, sortedReal.length));
      leagueMembers.push(...realToAdd);

      // Fill remaining slots with NPCs
      const slotsNeeded = GROUP_SIZE - leagueMembers.length;
      leagueMembers.push(...npcEntries.slice(0, slotsNeeded));

      return leagueMembers;
    } else {
      // Streak tab: all real entries + NPCs mixed in
      return [...rawEntries, ...npcEntries];
    }
  }, [rawEntries, npcEntries, player, activeTab]);

  const simulatedEntries: SimEntry[] = useMemo(() => {
    const myPlayerId = player.userId || '';
    const myUsername = (player.username || '').trim().toLowerCase();

    return entries.map((e, i) => {
      const isMe = !!(
        (myUsername && (e.username || '').trim().toLowerCase() === myUsername) ||
        (myPlayerId && e.supabase_id === myPlayerId)
      );
      let dominanceValue: number;
      if (activeTab === 'xp') {
        dominanceValue = e.weekly_xp || e.daily_xp || 0;
      } else {
        dominanceValue = e.streak || 0;
      }

      return {
        ...e,
        isMe,
        dominance: dominanceValue,
        isDebuffed: false,
        computedRank: computeRankFromLevel(e.level || 1),
        outfitId: e.equipped_outfit_id || 'outfit_starter',
        streak: e.streak || 0,
        borderId: e.equipped_border || null,
        bannerId: e.equipped_banner || null,
      };
    }).sort((a, b) => b.dominance - a.dominance);
  }, [entries, player.userId, player.username, activeTab]);

  const myIndex = simulatedEntries.findIndex(e => e.isMe);
  const globalMyRank = myIndex >= 0 ? myIndex + 1 : 999;
  const myRank = globalMyRank;

  // ── Group-of-10 (XP tab: already a league of 10, Streak: use full list) ──
  const { groupEntries, groupStart, groupEnd } = useMemo(() => {
    if (activeTab === 'xp') {
      // XP tab: entries are already the user's league of 10
      return { groupEntries: simulatedEntries, groupStart: 1, groupEnd: simulatedEntries.length };
    }
    // Streak tab: show top 50
    const top = simulatedEntries.slice(0, 50);
    return { groupEntries: top, groupStart: 1, groupEnd: top.length };
  }, [simulatedEntries, activeTab]);


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
              {activeTab === 'xp' ? 'Your League · Weekly XP' : 'Top players by streak'}{myIndex >= 0 ? <span className="text-[#00d4ff] font-bold"> — #{myRank} overall</span> : ''}
              {activeTab === 'xp' && countdown && (
                <span className="text-[10px] font-mono text-gray-500 ml-1">· Rewards in {countdown}</span>
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
        {(['xp', 'streak'] as TabMode[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="flex-1 py-2 flex items-center justify-center gap-1.5 rounded-xl transition-all text-xs font-black tracking-widest uppercase"
            style={{
              background: activeTab === tab ? 'rgba(255,255,255,0.08)' : 'transparent',
              color: activeTab === tab ? '#ffffff' : 'rgba(255,255,255,0.3)',
            }}
          >
            {tab === 'xp' ? <Zap size={13} /> : <Flame size={13} />}
            {tab === 'xp' ? 'XP' : 'STREAK'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }} className="text-gray-600 text-xs font-mono">
            Loading...
          </motion.div>
        </div>
      ) : activeTab === 'xp' && simulatedEntries.length === 0 ? (
        <div className="text-center py-16 px-6">
          <div className="text-3xl mb-3">⚡</div>
          <div className="text-sm font-black text-white mb-1">No Players Yet</div>
          <div className="text-xs text-gray-500 font-mono">Complete quests to start climbing the leaderboard.</div>
        </div>
      ) : activeTab === 'xp' ? (
        <>
          {/* ═══ CHEST REWARDS BANNER ═══ */}
          <div className="mx-4 mb-4 rounded-2xl overflow-hidden" style={{
            background: 'linear-gradient(180deg, rgba(255,215,0,0.04) 0%, rgba(10,10,15,0.95) 100%)',
            border: '1px solid rgba(255,215,0,0.12)',
          }}>
            {/* Title */}
            <div className="text-center pt-4 pb-1">
              <div className="text-[8px] font-mono tracking-[0.3em] uppercase text-gray-500 mb-1">// Weekly Rewards</div>
              <div className="text-sm font-black text-white tracking-tight">Top 3 Chest Rewards</div>
            </div>

            {/* 3 Chests — centered: 2nd | 1st (big) | 3rd */}
            <div className="flex items-end justify-center px-6 pt-2 pb-3" style={{ minHeight: 160 }}>
              {/* 2nd Place */}
              <div className="flex flex-col items-center" style={{ width: 100 }}>
                <div className="relative" style={{ width: CHEST_REWARDS[1].size, height: CHEST_REWARDS[1].size, margin: '0 auto' }}>
                  <div className="absolute inset-0" style={{ background: CHEST_REWARDS[1].bgGlow }} />
                  {chestAnims[CHEST_REWARDS[1].lottie] && (
                    <Lottie animationData={chestAnims[CHEST_REWARDS[1].lottie]} loop={false} autoplay={false} initialSegment={[0, 1]} style={{ width: '100%', height: '100%' }} />
                  )}
                </div>
                <div className="mt-1 px-2 py-0.5 rounded-full text-[8px] font-black tracking-wider" style={{
                  background: 'rgba(192,192,192,0.12)', border: '1px solid rgba(192,192,192,0.25)', color: '#C0C0C0',
                }}>
                  🥈 2ND
                </div>
              </div>

              {/* 1st Place (center — BIGGEST, PREMIUM) */}
              <div className="flex flex-col items-center -mt-4 relative mx-2" style={{ width: 130 }}>
                {/* Golden halo pulse */}
                <motion.div
                  className="absolute rounded-full pointer-events-none"
                  style={{
                    width: CHEST_REWARDS[0].size + 30,
                    height: CHEST_REWARDS[0].size + 30,
                    top: -12,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'radial-gradient(circle, rgba(255,215,0,0.12) 0%, transparent 70%)',
                  }}
                  animate={{ scale: [1, 1.12, 1], opacity: [0.5, 0.9, 0.5] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                />
                {/* Floating particles */}
                {[0, 1, 2, 3].map(i => (
                  <motion.div
                    key={`p-${i}`}
                    className="absolute w-1 h-1 rounded-full pointer-events-none"
                    style={{
                      background: '#FFD700',
                      left: `${25 + i * 18}%`,
                      bottom: `${35 + (i % 2) * 20}%`,
                      boxShadow: '0 0 6px #FFD700',
                    }}
                    animate={{ y: [-2, -16, -2], opacity: [0.7, 0.1, 0.7] }}
                    transition={{ duration: 2 + i * 0.5, repeat: Infinity, delay: i * 0.35 }}
                  />
                ))}
                <div className="relative" style={{ width: CHEST_REWARDS[0].size, height: CHEST_REWARDS[0].size, margin: '0 auto', filter: 'drop-shadow(0 0 18px rgba(255,215,0,0.35))' }}>
                  {chestAnims[CHEST_REWARDS[0].lottie] && (
                    <Lottie animationData={chestAnims[CHEST_REWARDS[0].lottie]} loop={false} autoplay={false} initialSegment={[0, 1]} style={{ width: '100%', height: '100%' }} />
                  )}
                </div>
                <div className="mt-1 px-2.5 py-1 rounded-full text-[9px] font-black tracking-wider" style={{
                  background: 'linear-gradient(135deg, rgba(255,215,0,0.2), rgba(234,179,8,0.15))',
                  border: '1px solid rgba(255,215,0,0.4)',
                  color: '#FFD700',
                  boxShadow: '0 0 12px rgba(255,215,0,0.2)',
                }}>
                  👑 1ST
                </div>
              </div>

              {/* 3rd Place */}
              <div className="flex flex-col items-center" style={{ width: 100 }}>
                <div className="relative" style={{ width: CHEST_REWARDS[2].size, height: CHEST_REWARDS[2].size, margin: '0 auto' }}>
                  <div className="absolute inset-0" style={{ background: CHEST_REWARDS[2].bgGlow }} />
                  {chestAnims[CHEST_REWARDS[2].lottie] && (
                    <Lottie animationData={chestAnims[CHEST_REWARDS[2].lottie]} loop={false} autoplay={false} initialSegment={[0, 1]} style={{ width: '100%', height: '100%' }} />
                  )}
                </div>
                <div className="mt-1 px-2 py-0.5 rounded-full text-[8px] font-black tracking-wider" style={{
                  background: 'rgba(205,127,50,0.12)', border: '1px solid rgba(205,127,50,0.25)', color: '#CD7F32',
                }}>
                  🥉 3RD
                </div>
              </div>
            </div>

          </div>

          {/* ═══ YOUR LEAGUE — GROUP OF 10 ═══ */}
          <div className="px-4 mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)' }}>
                <Trophy size={12} className="text-[#00d4ff]" />
              </div>
              <div>
                <span className="text-xs font-black text-white tracking-tight">Your League</span>
                <span className="text-[9px] font-mono text-gray-500 ml-2">Ranks {groupStart}–{groupEnd}</span>
              </div>
            </div>
            <span className="text-[9px] font-mono text-gray-600">{groupEntries.length} hunters</span>
          </div>

          <div className="px-4 space-y-2">
            {groupEntries.map((entry, index) => {
              const actualRank = groupStart + index;
              const rankInGroup = index + 1;
              const isTop3 = rankInGroup <= 3;
              const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32'];
              const rankColor = isTop3 ? rankColors[rankInGroup - 1] : undefined;

              return (
                <motion.div
                  key={`xp-${entry.username || entry.name}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.025 }}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-2xl cursor-pointer active:scale-[0.98] transition-transform"
                  style={{
                    background: entry.isMe
                      ? 'rgba(0,212,255,0.08)'
                      : isTop3
                      ? `rgba(${rankColor === '#FFD700' ? '255,215,0' : rankColor === '#C0C0C0' ? '192,192,192' : '205,127,50'},0.04)`
                      : 'rgba(255,255,255,0.03)',
                    ...(entry.isMe ? { border: '1.5px solid rgba(0,212,255,0.25)', boxShadow: '0 0 16px rgba(0,212,255,0.1)' }
                      : isTop3 ? { border: `1px solid ${rankColor}22` } : {}),
                  }}
                  onClick={() => setProfileTarget(entry)}
                >
                  {/* Rank number */}
                  <div className="w-7 text-center">
                    {isTop3 ? (
                      <span className="text-sm font-black font-mono" style={{ color: rankColor }}>{rankInGroup}</span>
                    ) : (
                      <span className={`text-sm font-black font-mono ${entry.isMe ? 'text-[#00d4ff]' : 'text-gray-500'}`}>{rankInGroup}</span>
                    )}
                  </div>

                  {/* Avatar */}
                  <AvatarWithBorder avatarUrl={entry.avatar_url} borderId={entry.equipped_border || null} size={44} className="shrink-0" />

                  {/* Name + tags */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-white truncate">{entry.username || entry.name}</span>
                      {entry.isMe && <span className="text-[8px] px-1.5 py-0.5 rounded bg-[#00d4ff]/15 text-[#00d4ff] font-black tracking-wider">you</span>}
                    </div>
                  </div>

                  {/* XP value */}
                  <div className="flex items-center gap-1 shrink-0">
                    <span className={`text-base font-black ${isTop3 ? '' : 'text-cyan-400'}`} style={isTop3 ? { color: rankColor } : {}}>{formatXp(entry.dominance)}</span>
                    <Zap size={15} className={isTop3 ? '' : 'text-cyan-400'} style={isTop3 ? { color: rankColor } : {}} />
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="text-center py-4 mt-2">
            <span className="text-[10px] text-gray-600 font-mono">
              Weekly XP · Groups of {GROUP_SIZE} · Rewards at week end
            </span>
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
          const pCfg = OUTFIT_CONFIG[pEntry.outfitId] || DEFAULT_OUTFIT_CFG;
          const pOutfit = OUTFITS.find(o => o.id === pEntry.outfitId);
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
                {/* ── Banner — shows player's real equipped banner ── */}
                {(() => {
                  const bannerStoreItem = pEntry.bannerId ? getItemById(pEntry.bannerId) : null;
                  const bannerSrc = bannerStoreItem?.bannerImage || '/banners/defaultreforgebanner.webp';
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
                <div className="px-5 pb-8 -mt-8 relative z-10">
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

                  {/* ── Outfit Info — liquid glass ── */}
                  <div className="rounded-2xl px-4 py-3 mb-4 flex items-center gap-3"
                    style={{
                      background: 'rgba(0,212,255,0.04)',
                      backdropFilter: 'blur(12px)',
                      WebkitBackdropFilter: 'blur(12px)',
                      border: '1px solid rgba(0,212,255,0.08)',
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
                    }}>
                    <OutfitHunterBadge outfitId={pEntry.outfitId} size={40} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[8px] font-mono uppercase tracking-widest" style={{ color: 'rgba(0,212,255,0.45)' }}>Equipped Outfit</div>
                      <div className="text-[12px] font-black text-white truncate">{pOutfit?.name || pCfg.name}</div>
                      <div className="text-[9px] font-mono" style={{ color: '#00d4ff' }}>{pCfg.tier}-Rank • {pCfg.name}</div>
                    </div>
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
