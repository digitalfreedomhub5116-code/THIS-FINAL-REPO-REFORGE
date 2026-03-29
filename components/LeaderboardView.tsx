import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, ShieldAlert, Swords, Skull, Sparkles, RefreshCw, Zap,
  Flame, Crown, FlaskConical, ScrollText, ChevronRight,
  Target, Activity, Infinity as InfinityIcon, Users, X,
} from 'lucide-react';
import { PlayerData, Outfit } from '../types';
import { API_BASE } from '../lib/apiConfig';
import { getPlayerAuthHeaders } from '../lib/playerApi';
import { useWarfare } from '../hooks/useWarfare';
import { useSystem } from '../hooks/useSystem';
import {
  ClashInitAnim, ClashVictoryAnim, ClashDefeatAnim,
  ExtractionRollAnim, AriseAnim, ScrollBurnAnim,
  FortifyShieldAnim, MonarchCrownAnim, PowerSurgeBanner,
} from './WarfareAnimations';

// ── Types ──
interface LeaderboardEntry {
  username: string;
  name: string;
  total_xp: number;
  level: number;
  rank: string;
}

interface SimEntry extends LeaderboardEntry {
  isMe: boolean;
  dominance: number;
  isDebuffed: boolean;
  isShielded: boolean;
}

interface LeaderboardViewProps {
  player: PlayerData;
  equippedOutfit?: Outfit;
}

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

// ── Animation Phase State Machine ──
type AnimPhase =
  | { type: 'NONE' }
  | { type: 'CLASH_INIT' }
  | { type: 'CLASH_VICTORY'; oldRank: number; newRank: number; targetName: string }
  | { type: 'CLASH_DEFEAT'; targetName: string }
  | { type: 'EXTRACTION_PROMPT'; targetName: string; targetRank: number }
  | { type: 'EXTRACTION_ROLL'; targetName: string; targetRank: number; rate: number; useOrb: boolean }
  | { type: 'ARISE'; shadowName: string }
  | { type: 'SCROLL_BURN'; scrollsRemaining: number; targetName: string; targetRank: number }
  | { type: 'FORTIFY' }
  | { type: 'MONARCH_CROWN' };

// ═══════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
const LeaderboardView: React.FC<LeaderboardViewProps> = ({ player, equippedOutfit }) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { consumeItem, addRewards, addNotification } = useSystem();
  const warfare = useWarfare(player.userId || 'local');

  const [animPhase, setAnimPhase] = useState<AnimPhase>({ type: 'NONE' });
  const [expandedTarget, setExpandedTarget] = useState<string | null>(null);

  const cons = player.consumables || { healthPotions: 0, shadowScrolls: 0, ultOrbs: 0 };
  const outfitStats = equippedOutfit?.baseStats || { attack: 15, boost: 5, extraction: 16, ultimate: 10 };

  // ── Fetch leaderboard ──
  const fetchLeaderboard = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const res = await fetch(`${API_BASE}/api/leaderboard`, {
        credentials: 'include',
        headers: { ...getPlayerAuthHeaders() },
      });
      if (res.ok) {
        const data: LeaderboardEntry[] = await res.json();
        setEntries(data);
      }
    } catch { /* offline */ } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(() => fetchLeaderboard(), 30_000);
    return () => clearInterval(interval);
  }, [fetchLeaderboard]);

  // ── Build simulated leaderboard ──
  const simulatedEntries: SimEntry[] = useMemo(() => {
    return [...entries].map(e => {
      const isMe = e.username === player.username || e.name === player.name;
      let dominance = e.total_xp || 0;

      if (isMe) {
        // Army buff
        dominance += dominance * (warfare.armyBuff / 100);
        // Outfit boost
        dominance += outfitStats.boost * 10;
      } else {
        // Check if we debuffed this target
        const targetId = e.username || e.name;
        const isDebuffed = warfare.activeDebuffs.some(d => d.id === targetId);
        if (isDebuffed) {
          dominance -= dominance * 0.15;
        }
      }

      return {
        ...e,
        isMe,
        dominance: Math.floor(dominance),
        isDebuffed: !isMe && warfare.activeDebuffs.some(d => d.id === (e.username || e.name)),
        isShielded: isMe && warfare.isShielded,
      };
    }).sort((a, b) => b.dominance - a.dominance);
  }, [entries, player.username, player.name, warfare.armyBuff, warfare.activeDebuffs, warfare.isShielded, outfitStats.boost]);

  const myIndex = simulatedEntries.findIndex(e => e.isMe);
  const myRank = myIndex >= 0 ? myIndex + 1 : 999;
  const myDominance = myIndex >= 0 ? simulatedEntries[myIndex].dominance : 0;

  // ── Check monarch reward ──
  useEffect(() => {
    if (myRank === 1 && warfare.claimMonarchReward()) {
      setAnimPhase({ type: 'MONARCH_CROWN' });
      addRewards(100, 0, 1); // Give Gold and Key
      addNotification('Monarch Reward Claimed: +100 Gold, +1 Key!', 'SUCCESS');
    }
  }, [myRank, warfare, addRewards, addNotification]);

  // ── CLASH HANDLER ──
  const handleClash = useCallback((target: SimEntry, targetIdx: number) => {
    if (warfare.attackCharges <= 0) return;

    setExpandedTarget(null);
    setAnimPhase({ type: 'CLASH_INIT' });

    setTimeout(() => {
      const result = warfare.initiateClash(
        target.username || target.name,
        targetIdx + 1,
        player.dailyXp || 0,
        outfitStats.attack,
        target.total_xp,
        myRank,
      );

      if (!result) {
        setAnimPhase({ type: 'NONE' });
        return;
      }

      if (result.won) {
        setAnimPhase({
          type: 'CLASH_VICTORY',
          oldRank: result.myOldRank,
          newRank: result.myNewRank,
          targetName: result.targetName,
        });
      } else {
        setAnimPhase({ type: 'CLASH_DEFEAT', targetName: result.targetName });
      }
    }, 1500);
  }, [warfare, player.dailyXp, outfitStats.attack, myRank]);

  // ── After victory → extraction prompt ──
  const handleVictoryComplete = useCallback(() => {
    const phase = animPhase;
    if (phase.type !== 'CLASH_VICTORY') { setAnimPhase({ type: 'NONE' }); return; }

    // Show extraction prompt
    const targetEntry = simulatedEntries.find(e =>
      (e.username || e.name) === phase.targetName
    );
    if (targetEntry && cons.shadowScrolls > 0) {
      setAnimPhase({
        type: 'EXTRACTION_PROMPT',
        targetName: phase.targetName,
        targetRank: phase.newRank,
      });
    } else {
      setAnimPhase({ type: 'NONE' });
    }
  }, [animPhase, simulatedEntries, cons.shadowScrolls]);

  // ── EXTRACTION HANDLERS ──
  const handleStartExtraction = useCallback((useOrb: boolean) => {
    if (animPhase.type !== 'EXTRACTION_PROMPT') return;

    if (useOrb) {
      if (!consumeItem('ultOrbs', 1)) return;
    } else {
      if (!consumeItem('shadowScrolls', 1)) return;
    }

    const rate = useOrb ? 100 : (warfare.powerSurgeActive
      ? Math.min(100, outfitStats.extraction * 2)
      : outfitStats.extraction);

    setAnimPhase({
      type: 'EXTRACTION_ROLL',
      targetName: animPhase.targetName,
      targetRank: animPhase.targetRank,
      rate,
      useOrb,
    });
  }, [animPhase, consumeItem, warfare.powerSurgeActive, outfitStats.extraction]);

  const handleExtractionResult = useCallback((success: boolean) => {
    if (animPhase.type !== 'EXTRACTION_ROLL') return;

    if (success) {
      const shadow = animPhase.useOrb
        ? warfare.guaranteedExtraction(animPhase.targetName, animPhase.targetRank)
        : warfare.attemptExtraction(animPhase.targetName, animPhase.targetRank, animPhase.rate);

      const shadowName = animPhase.useOrb
        ? (shadow as any).name
        : ((shadow as any).shadow?.name || `Shadow of ${animPhase.targetName}`);

      setAnimPhase({ type: 'ARISE', shadowName });
    } else {
      setAnimPhase({
        type: 'SCROLL_BURN',
        scrollsRemaining: cons.shadowScrolls - 1, // Already consumed
        targetName: animPhase.targetName,
        targetRank: animPhase.targetRank,
      });
    }
  }, [animPhase, warfare, cons.shadowScrolls]);

  const handleScrollBurnComplete = useCallback(() => {
    if (animPhase.type !== 'SCROLL_BURN') { setAnimPhase({ type: 'NONE' }); return; }

    // "Try again?" — go back to extraction prompt if they have scrolls
    if (cons.shadowScrolls > 0) {
      setAnimPhase({
        type: 'EXTRACTION_PROMPT',
        targetName: animPhase.targetName,
        targetRank: animPhase.targetRank,
      });
    } else {
      setAnimPhase({ type: 'NONE' });
    }
  }, [animPhase, cons.shadowScrolls]);

  // ── FORTIFY ──
  const handleFortify = useCallback(() => {
    if (warfare.isShielded || cons.healthPotions < 1) return;
    if (!consumeItem('healthPotions', 1)) return;
    warfare.activateShield();
    setExpandedTarget(null);
    setAnimPhase({ type: 'FORTIFY' });
  }, [warfare, cons.healthPotions, consumeItem]);

  // ── EXCHANGE (Debuff) ──
  const handleExchange = useCallback((targetId: string, targetName: string) => {
    if (cons.shadowScrolls < 1) return;
    if (!consumeItem('shadowScrolls', 1)) return;
    warfare.castDebuff(targetId, targetName);
    setExpandedTarget(null);
  }, [cons.shadowScrolls, consumeItem, warfare]);

  // ── RESTORE STAMINA ──
  const handleRestoreStamina = useCallback(() => {
    if (cons.healthPotions < 1 || warfare.attackCharges >= warfare.maxCharges) return;
    if (!consumeItem('healthPotions', 1)) return;
    warfare.useHealthPotion();
  }, [cons.healthPotions, warfare, consumeItem]);

  // ═════════════════════════════════════════════
  //  RENDER
  // ═════════════════════════════════════════════
  return (
    <div className="w-full min-h-screen pb-32 font-mono relative" style={{ background: '#050510' }}>
      {/* Background FX */}
      <div className="fixed inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at 50% 0%, rgba(168,85,247,0.08), transparent 70%)',
      }} />
      {warfare.isShielded && (
        <div className="fixed inset-0 pointer-events-none z-0 rounded-xl" style={{
          border: '2px solid rgba(74,222,128,0.15)',
          boxShadow: 'inset 0 0 60px rgba(74,222,128,0.05)',
        }} />
      )}

      <div className="relative z-10 px-4 pt-6 pb-4 space-y-4">

        {/* ── HEADER ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.25)' }}>
              <Skull size={22} className="text-purple-400" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white uppercase tracking-tight"
                style={{ textShadow: '0 2px 15px rgba(168,85,247,0.4)' }}>
                Shadow Warfare
              </h1>
              <p className="text-[9px] text-gray-500 tracking-[0.25em] uppercase">
                Asynchronous Combat Arena
              </p>
            </div>
          </div>
          <button onClick={() => fetchLeaderboard(true)}
            className="w-9 h-9 flex items-center justify-center rounded-lg"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <RefreshCw size={16} className={`text-gray-500 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* ── POWER SURGE BANNER ── */}
        <AnimatePresence>
          {warfare.powerSurgeActive && (
            <PowerSurgeBanner expiresAt={warfare.powerSurgeExpiresAt} />
          )}
        </AnimatePresence>

        {/* ── STATS GRID ── */}
        <div className="grid grid-cols-3 gap-2">
          {/* Rank */}
          <div className="rounded-xl p-3 relative overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="absolute top-0 right-0 w-12 h-12 rounded-full blur-xl -translate-y-1/2 translate-x-1/2"
              style={{ background: 'rgba(168,85,247,0.15)' }} />
            <div className="text-[8px] text-gray-600 tracking-widest uppercase mb-1">My Rank</div>
            <div className="text-2xl font-black text-white">
              #{myRank}
            </div>
          </div>

          {/* Dominance */}
          <div className="rounded-xl p-3 relative overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="text-[8px] text-gray-600 tracking-widest uppercase mb-1">Dominance</div>
            <div className="text-xl font-black text-white">{myDominance.toLocaleString()}</div>
          </div>

          {/* Army */}
          <div className="rounded-xl p-3 relative overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="text-[8px] text-gray-600 tracking-widest uppercase mb-1">Army</div>
            <div className="text-xl font-black text-white flex items-baseline gap-1">
              {warfare.shadows.length}
              <span className="text-[10px] text-purple-400">+{warfare.armyBuff}%</span>
            </div>
          </div>
        </div>

        {/* ── SHADOW ARMY BAR ── */}
        {warfare.shadows.length > 0 && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            className="flex items-center gap-2 overflow-x-auto rounded-xl p-2 custom-scrollbar"
            style={{ background: 'rgba(168,85,247,0.04)', border: '1px solid rgba(168,85,247,0.12)' }}>
            <Skull size={14} className="text-purple-500 shrink-0" />
            {warfare.shadows.map((s, i) => (
              <motion.div key={s.id} initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ delay: i * 0.05, type: 'spring' }}
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)' }}
                title={s.name}>
                <Skull size={12} className="text-purple-400" />
              </motion.div>
            ))}
            <span className="text-[9px] text-purple-400/60 font-mono shrink-0 ml-1">
              {warfare.shadows.length} shadows
            </span>
          </motion.div>
        )}

        {/* ── ARSENAL + CHARGES ── */}
        <div className="flex items-center justify-between rounded-xl p-2.5 px-3"
          style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {/* Attack Charges */}
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-gray-600 uppercase tracking-widest">Charges</span>
            <div className="flex gap-1">
              {Array.from({ length: warfare.maxCharges }).map((_, i) => (
                <motion.div key={i}
                  animate={i < warfare.attackCharges ? { opacity: 1, scale: 1 } : { opacity: 0.2, scale: 0.8 }}
                  className="w-5 h-5 rounded flex items-center justify-center"
                  style={{
                    background: i < warfare.attackCharges ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.03)',
                    border: i < warfare.attackCharges ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(255,255,255,0.05)',
                  }}>
                  <Swords size={10} className={i < warfare.attackCharges ? 'text-red-400' : 'text-gray-700'} />
                </motion.div>
              ))}
            </div>
            {warfare.attackCharges < warfare.maxCharges && cons.healthPotions > 0 && (
              <button onClick={handleRestoreStamina}
                className="text-[8px] font-black text-green-400 px-2 py-0.5 rounded"
                style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
                +2
              </button>
            )}
          </div>

          {/* Consumables */}
          <div className="flex gap-3">
            <div className="flex items-center gap-1">
              <FlaskConical size={11} className="text-green-400" />
              <span className="text-[10px] text-white font-bold">{cons.healthPotions}</span>
            </div>
            <div className="flex items-center gap-1">
              <ScrollText size={11} className="text-cyan-400" />
              <span className="text-[10px] text-white font-bold">{cons.shadowScrolls}</span>
            </div>
            <div className="flex items-center gap-1">
              <InfinityIcon size={11} className="text-purple-400" />
              <span className="text-[10px] text-white font-bold">{cons.ultOrbs}</span>
            </div>
          </div>
        </div>

        {/* ── WIN STREAK ── */}
        {warfare.winStreak >= 3 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center justify-center gap-2 py-1.5 rounded-xl"
            style={{
              background: 'linear-gradient(90deg, rgba(249,115,22,0.08), rgba(239,68,68,0.08))',
              border: '1px solid rgba(249,115,22,0.2)',
            }}>
            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.8, repeat: Infinity }}>
              <Flame size={14} className="text-orange-400" />
            </motion.div>
            <span className="text-[10px] font-black text-orange-400 tracking-widest uppercase">
              🔥×{warfare.winStreak} WIN STREAK · +10% POWER
            </span>
          </motion.div>
        )}

        {/* ── BATTLE BOARD HEADER ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target size={12} className="text-gray-500" />
            <span className="text-[10px] text-gray-500 tracking-widest uppercase font-bold">Target List</span>
          </div>
          {warfare.isShielded && (
            <span className="text-[9px] text-green-400 flex items-center gap-1 font-bold">
              <ShieldAlert size={10} /> SHIELDED
            </span>
          )}
        </div>

        {/* ── BATTLE BOARD ── */}
        <div className="space-y-2 pb-16">
          {loading ? (
            <div className="text-center text-xs text-gray-700 py-16 tracking-widest animate-pulse">
              CALCULATING DOMINANCE...
            </div>
          ) : (
            <AnimatePresence>
              {simulatedEntries.map((entry, index) => {
                const rank = index + 1;
                const rColor = RANK_COLORS[entry.rank] || '#78716c';
                const rGlow = RANK_GLOW[entry.rank] || 'rgba(120,113,108,0.3)';
                const targetId = entry.username || entry.name;
                const isExpanded = expandedTarget === targetId;
                const isMonarch = rank === 1;
                const isAboveMe = rank < myRank;
                const isLastStand = entry.isMe && myRank >= 4 && myRank <= 6;

                return (
                  <motion.div
                    key={targetId}
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{
                      layout: { type: 'spring', stiffness: 50, damping: 15 },
                      opacity: { duration: 0.3, delay: index * 0.03 },
                    }}
                    className="rounded-2xl overflow-hidden"
                    style={{
                      background: entry.isMe
                        ? 'linear-gradient(180deg, rgba(168,85,247,0.06), rgba(6,6,18,0.9))'
                        : isMonarch
                        ? 'linear-gradient(180deg, rgba(234,179,8,0.04), rgba(6,6,18,0.95))'
                        : 'rgba(8,8,18,0.8)',
                      border: entry.isMe
                        ? '1px solid rgba(168,85,247,0.25)'
                        : isMonarch
                        ? '1px solid rgba(234,179,8,0.2)'
                        : '1px solid rgba(255,255,255,0.05)',
                      boxShadow: entry.isMe
                        ? '0 0 20px rgba(168,85,247,0.1)'
                        : isMonarch
                        ? '0 0 20px rgba(234,179,8,0.08)'
                        : 'none',
                    }}
                  >
                    {/* Last Stand Indicator */}
                    {isLastStand && (
                      <motion.div
                        animate={{ opacity: [0.3, 0.7, 0.3] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute inset-0 pointer-events-none rounded-2xl"
                        style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.05), transparent)' }}
                      />
                    )}

                    {/* Main Row */}
                    <div className="p-3 flex items-center gap-3 cursor-pointer relative"
                      onClick={() => setExpandedTarget(isExpanded ? null : targetId)}>

                      {/* Rank Number */}
                      <div className="w-7 text-center">
                        {isMonarch ? (
                          <motion.div animate={{ y: [0, -2, 0] }} transition={{ duration: 2, repeat: Infinity }}>
                            <Crown size={18} className="text-yellow-500 mx-auto" />
                          </motion.div>
                        ) : (
                          <span className={`text-lg font-black ${entry.isMe ? 'text-purple-400' : 'text-gray-600'}`}>
                            {rank}
                          </span>
                        )}
                      </div>

                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0"
                        style={{
                          background: entry.isMe ? 'rgba(168,85,247,0.15)' : `${rColor}15`,
                          border: `1px solid ${rColor}40`,
                          color: rColor,
                        }}>
                        {(entry.username || entry.name).charAt(0).toUpperCase()}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold truncate ${
                            entry.isMe ? 'text-purple-300' :
                            entry.isDebuffed ? 'text-red-400 line-through' : 'text-gray-200'
                          }`}>
                            {targetId}
                          </span>
                          {entry.isMe && (
                            <span className="text-[8px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded font-black tracking-wider">
                              YOU
                            </span>
                          )}
                          {entry.isDebuffed && <Zap size={9} className="text-red-400 shrink-0" />}
                          {entry.isShielded && <ShieldAlert size={9} className="text-green-400 shrink-0" />}
                          {isLastStand && (
                            <span className="text-[7px] bg-red-500/15 text-red-400 px-1 py-0.5 rounded font-black">
                              CORNERED
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[9px] text-gray-600 font-bold tracking-wider">
                            {isMonarch ? 'SHADOW MONARCH' : getHunterTitle(rank)}
                          </span>
                          <span className="text-[9px] text-gray-700 flex items-center gap-0.5">
                            <Activity size={8} /> Lv.{entry.level}
                          </span>
                        </div>
                      </div>

                      {/* Dominance + Rank Badge */}
                      <div className="text-right shrink-0">
                        <div className="text-base font-black text-white tabular-nums">
                          {entry.dominance.toLocaleString()}
                        </div>
                        <div className="text-[8px] font-black w-6 h-6 rounded mx-auto mt-0.5 flex items-center justify-center"
                          style={{ background: `${rColor}15`, color: rColor, border: `1px solid ${rColor}30` }}>
                          {entry.rank}
                        </div>
                      </div>

                      <ChevronRight size={14} className={`text-gray-700 shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </div>

                    {/* ── Action Drawer ── */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="border-t overflow-hidden"
                          style={{ borderColor: 'rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.015)' }}
                        >
                          <div className="p-3 flex gap-2">
                            {entry.isMe ? (
                              // ── MY CARD: Fortify ──
                              <button
                                disabled={warfare.isShielded || cons.healthPotions < 1}
                                onClick={handleFortify}
                                className="flex-1 py-3 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed"
                                style={{
                                  background: 'rgba(74,222,128,0.06)',
                                  border: '1px solid rgba(74,222,128,0.2)',
                                  color: '#4ade80',
                                }}>
                                <ShieldAlert size={18} />
                                <span className="text-[9px] font-black tracking-widest uppercase">
                                  {warfare.isShielded ? 'SHIELDED' : 'FORTIFY'}
                                </span>
                                {!warfare.isShielded && (
                                  <span className="text-[8px] text-green-400/50">1 Health Potion</span>
                                )}
                              </button>
                            ) : (
                              <>
                                {/* ── CLASH (only targets above me) ── */}
                                {isAboveMe && (
                                  <button
                                    disabled={warfare.attackCharges <= 0}
                                    onClick={() => handleClash(entry, index)}
                                    className="flex-1 py-3 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed"
                                    style={{
                                      background: 'rgba(239,68,68,0.06)',
                                      border: '1px solid rgba(239,68,68,0.2)',
                                      color: '#f87171',
                                    }}>
                                    <Swords size={18} />
                                    <span className="text-[9px] font-black tracking-widest uppercase">CLASH</span>
                                    <span className="text-[8px] text-red-400/50">{warfare.attackCharges} charges</span>
                                  </button>
                                )}

                                {/* ── EXCHANGE (debuff — costs 1 scroll) ── */}
                                <button
                                  disabled={entry.isDebuffed || cons.shadowScrolls < 1}
                                  onClick={() => handleExchange(targetId, entry.username || entry.name)}
                                  className="flex-1 py-3 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed"
                                  style={{
                                    background: 'rgba(0,210,255,0.06)',
                                    border: '1px solid rgba(0,210,255,0.2)',
                                    color: '#22d3ee',
                                  }}>
                                  <Zap size={18} />
                                  <span className="text-[9px] font-black tracking-widest uppercase">
                                    {entry.isDebuffed ? 'DEBUFFED' : 'EXCHANGE'}
                                  </span>
                                  <span className="text-[8px] text-cyan-400/50">1 Shadow Scroll</span>
                                </button>
                              </>
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
      </div>

      {/* ── KILL FEED MARQUEE ── */}
      <div className="fixed bottom-0 left-0 w-full z-30 h-9 overflow-hidden"
        style={{ background: 'rgba(0,0,0,0.95)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex whitespace-nowrap items-center h-full gap-12 font-mono text-[9px]"
          style={{ animation: 'warfare-marquee 30s linear infinite' }}>
          {warfare.killFeed.slice(0, 15).map(entry => (
            <span key={entry.id} className={entry.highlight ? 'text-purple-400' : 'text-gray-600'}>
              {entry.text}
            </span>
          ))}
          {warfare.killFeed.length === 0 && (
            <>
              <span className="text-gray-700">SHADOW WARFARE — LIVE COMBAT ZONE</span>
              <span className="text-gray-700">WAITING FOR FIRST CLASH...</span>
            </>
          )}
        </div>
        <style>{`
          @keyframes warfare-marquee {
            0% { transform: translateX(100%); }
            100% { transform: translateX(-200%); }
          }
        `}</style>
      </div>

      {/* ── EXTRACTION PROMPT MODAL ── */}
      <AnimatePresence>
        {animPhase.type === 'EXTRACTION_PROMPT' && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.8, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 30 }}
              className="w-80 rounded-2xl overflow-hidden"
              style={{ background: '#0a0a1a', border: '1px solid rgba(168,85,247,0.2)' }}
            >
              <div className="p-6 text-center">
                <Skull size={48} className="text-purple-500 mx-auto mb-3" />
                <h3 className="text-lg font-black text-white tracking-wider uppercase">
                  Extract Shadow?
                </h3>
                <p className="text-[10px] text-gray-500 font-mono mt-1 tracking-wider">
                  Target: {animPhase.targetName}
                </p>

                <div className="space-y-2 mt-5">
                  {/* Shadow Scroll option */}
                  <button
                    disabled={cons.shadowScrolls < 1}
                    onClick={() => handleStartExtraction(false)}
                    className="w-full py-3.5 rounded-xl flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-25"
                    style={{ background: 'rgba(0,210,255,0.08)', border: '1px solid rgba(0,210,255,0.2)' }}
                  >
                    <ScrollText size={16} className="text-cyan-400" />
                    <div className="text-left">
                      <div className="text-xs font-black text-cyan-400">
                        Shadow Scroll ({outfitStats.extraction}%{warfare.powerSurgeActive ? ' ×2' : ''})
                      </div>
                      <div className="text-[9px] text-cyan-400/50">{cons.shadowScrolls} remaining</div>
                    </div>
                  </button>

                  {/* Ult Orb option */}
                  <button
                    disabled={cons.ultOrbs < 1}
                    onClick={() => handleStartExtraction(true)}
                    className="w-full py-3.5 rounded-xl flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-25"
                    style={{
                      background: 'linear-gradient(135deg, rgba(168,85,247,0.1), rgba(234,179,8,0.05))',
                      border: '1px solid rgba(168,85,247,0.25)',
                    }}
                  >
                    <InfinityIcon size={16} className="text-purple-400" />
                    <div className="text-left">
                      <div className="text-xs font-black text-purple-400">Ult Orb (100% GUARANTEED)</div>
                      <div className="text-[9px] text-purple-400/50">{cons.ultOrbs} remaining</div>
                    </div>
                  </button>

                  {/* Skip */}
                  <button
                    onClick={() => setAnimPhase({ type: 'NONE' })}
                    className="w-full py-2.5 rounded-xl text-[10px] font-bold text-gray-600 hover:text-white transition-colors"
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
      {animPhase.type === 'CLASH_INIT' && (
        <ClashInitAnim onComplete={() => {/* handled by setTimeout in handleClash */}} />
      )}
      {animPhase.type === 'CLASH_VICTORY' && (
        <ClashVictoryAnim
          oldRank={animPhase.oldRank}
          newRank={animPhase.newRank}
          targetName={animPhase.targetName}
          onComplete={handleVictoryComplete}
        />
      )}
      {animPhase.type === 'CLASH_DEFEAT' && (
        <ClashDefeatAnim
          targetName={animPhase.targetName}
          onComplete={() => setAnimPhase({ type: 'NONE' })}
        />
      )}
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
      {animPhase.type === 'FORTIFY' && (
        <FortifyShieldAnim onComplete={() => setAnimPhase({ type: 'NONE' })} />
      )}
      {animPhase.type === 'MONARCH_CROWN' && (
        <MonarchCrownAnim onComplete={() => setAnimPhase({ type: 'NONE' })} />
      )}
    </div>
  );
};

export default LeaderboardView;
