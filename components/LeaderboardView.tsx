import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw,
  X, Zap, Flag, AlertTriangle, CheckSquare, Square, Send, Flame, Clock,
} from 'lucide-react';
import { PlayerData, Outfit } from '../types';
import { API_BASE } from '../lib/apiConfig';
import { getPlayerAuthHeaders } from '../lib/playerApi';
import { useSystem } from '../hooks/useSystem';
import { playSystemSoundEffect } from '../utils/soundEngine';
import RankRewardOverlay from './RankRewardOverlay';
import { OUTFITS } from '../utils/gameData';
import OutfitHunterBadge, { OUTFIT_BADGE_CONFIG } from './OutfitHunterBadge';
import AvatarWithBorder from './AvatarWithBorder';
import { getItemById } from '../utils/storeItems';

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
type XpMode = 'daily' | 'global';

// ── Constants ──
const RANK_COLORS: Record<string, string> = {
  E: '#78716c', D: '#f97316', C: '#60a5fa', B: '#7EB8D4', A: '#eab308', S: '#a855f7',
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
  const [xpMode, setXpMode] = useState<XpMode>('daily');
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
      await fetch(`${API_BASE}/api/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getPlayerAuthHeaders() },
        credentials: 'include',
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
      const [xpRes, streakRes] = await Promise.all([
        fetch(`${API_BASE}/api/leaderboard?type=xp&userId=${encodeURIComponent(player.userId || '')}`, { credentials: 'include', headers: { ...getPlayerAuthHeaders() } }),
        fetch(`${API_BASE}/api/leaderboard?type=streak&userId=${encodeURIComponent(player.userId || '')}`, { credentials: 'include', headers: { ...getPlayerAuthHeaders() } }),
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

  // ── Build entries with INSTANT local XP merge ──
  // When YOU earn XP, your card moves immediately without waiting for server refresh
  const entries = activeTab === 'xp' ? xpEntries : streakEntries;

  const simulatedEntries: SimEntry[] = useMemo(() => {
    const myPlayerId = player.userId || '';
    const myUsername = (player.username || '').trim().toLowerCase();

    let meIndex = -1;
    if (myUsername) {
      meIndex = entries.findIndex(
        e => (e.username || '').trim().toLowerCase() === myUsername
      );
    }
    if (meIndex < 0 && myPlayerId) {
      meIndex = entries.findIndex(
        e => e.supabase_id === myPlayerId
      );
    }

    return [...entries].map((e, i) => {
      const isMe = i === meIndex;
      let dominanceValue: number;
      if (activeTab === 'xp') {
        dominanceValue = xpMode === 'daily' ? (e.weekly_xp || e.daily_xp || 0) : (e.total_xp || 0);
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
  }, [entries, player.userId, player.username, activeTab, xpMode]);

  const myIndex = simulatedEntries.findIndex(e => e.isMe);
  const globalMyRank = myIndex >= 0 ? myIndex + 1 : 999;
  const myRank = globalMyRank;


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
              {activeTab === 'xp' ? 'Daily XP rankings' : 'Top players by streak'}{myIndex >= 0 ? <span className="text-[#7EB8D4] font-bold"> — You're #{myRank}</span> : ''}
              {activeTab === 'xp' && countdown && (
                <span className="text-[10px] font-mono text-gray-500 ml-1">· Resets {countdown}</span>
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
          <div className="text-sm font-black text-white mb-1">No XP Earned Today Yet</div>
          <div className="text-xs text-gray-500 font-mono">Complete quests to start climbing the leaderboard.</div>
        </div>
      ) : activeTab === 'xp' ? (
        <>
          {/* ── PODIUM — Medal Style (matches streak tab) ── */}
          {simulatedEntries.length >= 3 && (
            <div className="flex items-end justify-center gap-3 px-4 pt-2 pb-6">
              {/* 2nd place (left) */}
              {(() => {
                const e = simulatedEntries[1];
                return (
                  <div className="flex flex-col items-center gap-1.5 flex-1 cursor-pointer" onClick={() => setProfileTarget(e)}>
                    <div className="text-lg">🥈</div>
                    <AvatarWithBorder avatarUrl={e.avatar_url} borderId={e.equipped_border || null} size={64} />
                    <div className="text-[11px] font-black text-white truncate max-w-[80px] text-center">
                      {e.username || e.name}
                    </div>
                    <div className="flex items-center gap-1">
                      <Zap size={13} className="text-cyan-400" />
                      <span className="text-sm font-black text-cyan-400">{formatXp(e.dominance)}</span>
                    </div>
                  </div>
                );
              })()}

              {/* 1st place (center, elevated) */}
              {(() => {
                const e = simulatedEntries[0];
                return (
                  <div className="flex flex-col items-center gap-1.5 flex-1 -mt-4 cursor-pointer" onClick={() => setProfileTarget(e)}>
                    <div className="text-2xl">👑</div>
                    <AvatarWithBorder avatarUrl={e.avatar_url} borderId={e.equipped_border || null} size={80} />
                    <div className="text-xs font-black text-white truncate max-w-[90px] text-center">
                      {e.username || e.name}
                    </div>
                    <div className="flex items-center gap-1">
                      <Zap size={14} className="text-yellow-400" />
                      <span className="text-base font-black text-yellow-400">{formatXp(e.dominance)}</span>
                    </div>
                  </div>
                );
              })()}

              {/* 3rd place (right) */}
              {(() => {
                const e = simulatedEntries[2];
                return (
                  <div className="flex flex-col items-center gap-1.5 flex-1 cursor-pointer" onClick={() => setProfileTarget(e)}>
                    <div className="text-lg">🥉</div>
                    <AvatarWithBorder avatarUrl={e.avatar_url} borderId={e.equipped_border || null} size={64} />
                    <div className="text-[11px] font-black text-white truncate max-w-[80px] text-center">
                      {e.username || e.name}
                    </div>
                    <div className="flex items-center gap-1">
                      <Zap size={13} className="text-cyan-400" />
                      <span className="text-sm font-black text-cyan-400">{formatXp(e.dominance)}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ── REMAINING PLAYERS (4th onward) ── */}
          <div className="px-4 space-y-2">
            {simulatedEntries.slice(simulatedEntries.length >= 3 ? 3 : 0).map((entry, index) => {
              const actualRank = simulatedEntries.length >= 3 ? index + 4 : index + 1;
              return (
                <motion.div
                  key={`xp-${entry.username || entry.name}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.02 }}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-2xl cursor-pointer active:scale-[0.98] transition-transform"
                  style={{
                    background: entry.isMe ? 'rgba(126,184,212,0.08)' : 'rgba(255,255,255,0.03)',
                    ...(entry.isMe ? { border: '1.5px solid rgba(126,184,212,0.25)', boxShadow: '0 0 16px rgba(126,184,212,0.1)' } : {}),
                  }}
                  onClick={() => setProfileTarget(entry)}
                >
                  <div className="w-7 text-center">
                    <span className={`text-sm font-black font-mono ${entry.isMe ? 'text-[#7EB8D4]' : 'text-gray-500'}`}>{actualRank}</span>
                  </div>
                  <AvatarWithBorder avatarUrl={entry.avatar_url} borderId={entry.equipped_border || null} size={44} className="shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-white truncate">{entry.username || entry.name}</span>
                      {entry.isMe && <span className="text-[8px] px-1.5 py-0.5 rounded bg-[#7EB8D4]/15 text-[#7EB8D4] font-black tracking-wider">you</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-base font-black text-cyan-400">{formatXp(entry.dominance)}</span>
                    <Zap size={15} className="text-cyan-400" />
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="text-center py-4 mt-2">
            <span className="text-[10px] text-gray-600 font-mono">
              Daily XP · Resets at midnight UTC · Top hunters
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
                      ? 'rgba(126,184,212,0.08)'
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
                        <span className="text-[8px] px-1.5 py-0.5 rounded bg-[#7EB8D4]/15 text-[#7EB8D4] font-black tracking-wider">you</span>
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
                background: 'repeating-linear-gradient(90deg, rgba(126,184,212,0.3) 0px, rgba(126,184,212,0.3) 4px, transparent 4px, transparent 12px)',
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
                    background: 'rgba(126,184,212,0.08)',
                    border: '1.5px solid rgba(126,184,212,0.25)',
                    boxShadow: '0 0 16px rgba(126,184,212,0.1)',
                  }}
                >
                  <div className="w-7 text-center">
                    <span className="text-sm font-black text-[#7EB8D4] font-mono">{yourRank}</span>
                  </div>
                  <AvatarWithBorder avatarUrl={yourEntry.avatar_url} borderId={yourEntry.equipped_border || null} size={44} className="shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-white truncate">{yourEntry.username || yourEntry.name}</span>
                      <span className="text-[8px] px-1.5 py-0.5 rounded bg-[#7EB8D4]/15 text-[#7EB8D4] font-black tracking-wider">you</span>
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
                          background: 'rgba(126,184,212,0.06)',
                          backdropFilter: 'blur(12px)',
                          WebkitBackdropFilter: 'blur(12px)',
                          border: '1px solid rgba(126,184,212,0.12)',
                          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 16px rgba(0,0,0,0.3)',
                        }}>
                        <div className="text-[15px] font-black font-mono" style={{ color: '#9ACDE3' }}>{s.value}</div>
                        <div className="text-[7px] font-mono uppercase tracking-[0.18em] mt-1" style={{ color: 'rgba(126,184,212,0.5)' }}>{s.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* ── Outfit Info — liquid glass ── */}
                  <div className="rounded-2xl px-4 py-3 mb-4 flex items-center gap-3"
                    style={{
                      background: 'rgba(126,184,212,0.04)',
                      backdropFilter: 'blur(12px)',
                      WebkitBackdropFilter: 'blur(12px)',
                      border: '1px solid rgba(126,184,212,0.08)',
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
                    }}>
                    <OutfitHunterBadge outfitId={pEntry.outfitId} size={40} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[8px] font-mono uppercase tracking-widest" style={{ color: 'rgba(126,184,212,0.45)' }}>Equipped Outfit</div>
                      <div className="text-[12px] font-black text-white truncate">{pOutfit?.name || pCfg.name}</div>
                      <div className="text-[9px] font-mono" style={{ color: '#7EB8D4' }}>{pCfg.tier}-Rank • {pCfg.name}</div>
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
                    <div className="w-full py-3 rounded-xl flex items-center justify-center gap-2 border border-[#7EB8D4]/15 bg-[#7EB8D4]/5">
                      <span className="text-[10px] font-black tracking-widest uppercase text-[#7EB8D4]">Your Profile</span>
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

      {/* ── RANK REWARD OVERLAY ── */}
      <AnimatePresence>
        {showRewardOverlay && pendingReward && (
          <RankRewardOverlay
            rank={pendingReward.rank}
            gold={pendingReward.reward_gold}
            xp={pendingReward.reward_xp}

            username={player.username || player.name || 'Hunter'}
            onClaim={async () => {
              setShowRewardOverlay(false);
              addNotification(
                `Leaderboard Reward: Rank #${pendingReward.rank} — +${pendingReward.reward_gold}G, +${pendingReward.reward_xp}XP`,
                'SUCCESS'
              );
              // Claim on server — server credits rewards and returns authoritative values
              try {
                const res = await fetch(`${API_BASE}/api/leaderboard/rewards/claim`, {
                  method: 'POST',
                  credentials: 'include',
                  headers: { 'Content-Type': 'application/json', ...getPlayerAuthHeaders() },
                  body: JSON.stringify({ snapshotId: pendingReward.id }),
                });
                if (res.ok) {
                  const result = await res.json();
                  if (result.player && !result.already_claimed) {
                    // Apply server-authoritative values directly (no double-counting)
                    const p = result.player;
                    setPlayer(prev => ({
                      ...prev,
                      gold: p.gold,

                      currentXp: p.currentXp,
                      requiredXp: p.requiredXp,
                      level: p.level,
                      rank: p.rank,
                      totalXp: p.totalXp,
                      dailyXp: p.dailyXp,
                    }));
                    // Update server baseline so the sync loop doesn't compute wrong deltas
                    updateServerBaseline(p.gold);
                  }
                }
                // Also trigger sync to catch any other pending changes
                setTimeout(() => window.dispatchEvent(new Event('reforge:sync-needed')), 500);
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
