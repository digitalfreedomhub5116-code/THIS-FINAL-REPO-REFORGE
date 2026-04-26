import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, Sparkles, RefreshCw, Zap,
  Crown, FlaskConical, ChevronRight,
  Infinity as InfinityIcon, Users, X, Globe, CalendarDays, Flag, AlertTriangle, CheckSquare, Square, Send, Flame,
} from 'lucide-react';
import { PlayerData, Outfit } from '../types';
import { API_BASE } from '../lib/apiConfig';
import { getPlayerAuthHeaders } from '../lib/playerApi';
import { useSystem } from '../hooks/useSystem';
import { playSystemSoundEffect } from '../utils/soundEngine';
import RankRewardOverlay from './RankRewardOverlay';
import { OUTFITS } from '../utils/gameData';
import OutfitHunterBadge, { OUTFIT_BADGE_CONFIG } from './OutfitHunterBadge';
import AnimatedBorder from './AnimatedBorder';

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
  streak: number;
  equipped_outfit_id?: string;
  equipped_border?: string | null;
}

interface SimEntry extends LeaderboardEntry {
  isMe: boolean;
  dominance: number;
  isDebuffed: boolean;
  computedRank: string;
  outfitId: string;
  streak: number;
  borderId: string | null;
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
  const [globalEntries, setGlobalEntries] = useState<LeaderboardEntry[]>([]);
  const [dailyEntries, setDailyEntries] = useState<LeaderboardEntry[]>([]);
  const [activeTab, setActiveTab] = useState<TabMode>('daily');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { addNotification, setPlayer, updateServerBaseline } = useSystem();

  const [expandedTarget, setExpandedTarget] = useState<string | null>(null);

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
    const myPlayerId = player.userId || '';
    const myUsername = (player.username || '').trim().toLowerCase();

    // ── EXCLUSIVE MATCH: find the single "me" entry ──
    // Priority: username match (visible, always correct) > supabase_id match
    // NEVER use player_id (internal DB UUID ≠ auth ID)
    let meIndex = -1;

    // Pass 1: username match (most reliable — what the user sees)
    if (myUsername) {
      meIndex = entries.findIndex(
        e => (e.username || '').trim().toLowerCase() === myUsername
      );
    }

    // Pass 2: supabase_id match (if username didn't hit — e.g. username not set yet)
    if (meIndex < 0 && myPlayerId) {
      meIndex = entries.findIndex(
        e => e.supabase_id === myPlayerId
      );
    }

    return [...entries].map((e, i) => {
      const isMe = i === meIndex;

      return {
        ...e,
        isMe,
        dominance: (e as any)[xpField] || 0,
        isDebuffed: false,
        computedRank: computeRankFromLevel(e.level || 1),
        outfitId: e.equipped_outfit_id || 'outfit_starter',
        streak: e.streak || 0,
        borderId: e.equipped_border || null,
      };
    }).sort((a, b) => b.dominance - a.dominance);
  }, [entries, player.userId, player.username, xpField, activeTab]);

  const myIndex = simulatedEntries.findIndex(e => e.isMe);
  const myRank = myIndex >= 0 ? myIndex + 1 : 999;



  // ── Format XP ──
  const formatXp = (xp: number) => {
    if (xp >= 1_000_000) return `${(xp / 1_000_000).toFixed(1)}M`;
    if (xp >= 1_000) return `${(xp / 1_000).toFixed(1)}K`;
    return xp.toString();
  };


  return (
    <div className="min-h-screen pb-24 px-3 md:px-4 pt-3" style={{ background: 'linear-gradient(180deg, #08081a 0%, #0d0d20 100%)' }}>

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
                      : 'rgba(255,255,255,0.02)',
                    border: entry.isMe
                      ? '1px solid rgba(168,85,247,0.15)'
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

                    {/* Outfit Badge with Border Ring */}
                    <AnimatedBorder borderId={entry.borderId} compact className="rounded-full">
                      <OutfitHunterBadge outfitId={entry.outfitId} size={32} />
                    </AnimatedBorder>

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
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-gray-600 font-mono">Lv.{entry.level}</span>
                        {entry.streak > 0 && (
                          <span className="flex items-center gap-0.5">
                            <Flame size={9} style={{ color: entry.streak >= 7 ? '#f97316' : entry.streak >= 3 ? '#fb923c' : '#fbbf24' }} />
                            <span className="text-[9px] font-black font-mono" style={{ color: entry.streak >= 7 ? '#f97316' : entry.streak >= 3 ? '#fb923c' : '#fbbf24' }}>{entry.streak}</span>
                          </span>
                        )}
                      </div>
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

                    <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronRight size={14} className="text-gray-700 shrink-0" />
                    </motion.div>
                  </div>

                  {/* ── Action Drawer ── */}
                  <AnimatePresence>
                    {isExpanded && (() => {
                      const outfitData = OUTFITS.find(o => o.id === entry.outfitId);
                      const cfg = OUTFIT_CONFIG[entry.outfitId] || DEFAULT_OUTFIT_CFG;
                      return (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: 'easeInOut' }}
                          className="overflow-hidden"
                          style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
                        >
                          <div className="p-3 space-y-2">
                            {/* Outfit info row */}
                            <div className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ background: `${cfg.accent}0d`, border: `1px solid ${cfg.accent}22` }}>
                              <OutfitHunterBadge outfitId={entry.outfitId} size={48} />
                              <div className="flex-1 min-w-0">
                                <div className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">Equipped Outfit</div>
                                <div className="text-[11px] font-black text-white truncate">{outfitData?.name || cfg.name}</div>
                                <div className="text-[9px] font-mono mt-0.5" style={{ color: cfg.accent }}>{cfg.tier}-Rank Tier</div>
                              </div>
                            </div>

                            {/* Action row */}
                            {entry.isMe ? (
                              <div className="py-2.5 rounded-xl flex items-center justify-center gap-1.5 border border-white/5 bg-white/5 opacity-50">
                                <span className="text-[10px] font-black tracking-widest uppercase text-gray-400">YOUR PROFILE</span>
                              </div>
                            ) : (
                              <button
                                onClick={(e) => openReport(entry, e)}
                                className="w-full py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
                                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}
                              >
                                <Flag size={12} />
                                <span className="text-[10px] font-black tracking-widest uppercase">Report Player</span>
                              </button>
                            )}
                          </div>
                        </motion.div>
                      );
                    })()}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>


      {/* ── REPORT MODAL ── */}
      <AnimatePresence>
        {reportTarget && (
          <motion.div
            className="fixed inset-0 z-[9000] flex items-end justify-center"
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
              addNotification(
                `Leaderboard Reward: Rank #${pendingReward.rank} — +${pendingReward.reward_gold}G, +${pendingReward.reward_xp}XP${pendingReward.reward_keys > 0 ? `, +${pendingReward.reward_keys} Key` : ''}`,
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
                      keys: p.keys,
                      currentXp: p.currentXp,
                      requiredXp: p.requiredXp,
                      level: p.level,
                      rank: p.rank,
                      totalXp: p.totalXp,
                      dailyXp: p.dailyXp,
                    }));
                    // Update server baseline so the sync loop doesn't compute wrong deltas
                    updateServerBaseline(p.gold, p.keys);
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
