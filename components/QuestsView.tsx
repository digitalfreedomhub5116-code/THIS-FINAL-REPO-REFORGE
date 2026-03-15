
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, CalendarDays, ChevronLeft, ChevronRight, Check, XCircle, Skull, AlertTriangle, BrainCircuit, Loader2, CheckCircle, X, Clock, Lock, ShieldCheck, Globe, Repeat, Zap } from 'lucide-react';
import { Quest, CoreStats, Rank, Priority, PlayerData } from '../types';
import RankBadge from './RankBadge';
import type { RankType } from './RankBadge';
import QuestCard from './QuestCard';
import { PLEDGE_AMOUNTS, MANDATORY_RANKS } from './SystemPactScreen';
import { playSystemSoundEffect } from '../utils/soundEngine';

interface ForgeGuardResult {
  rank: Rank;
  xp: number;
  category: keyof CoreStats;
  reasoning: string;
  estimatedDuration: number;
  minDurationMinutes?: number;
  suggestedTime?: string;
  autoDetectedTime?: string | null;
  isSpam: boolean;
}

interface QuestsViewProps {
  quests: Quest[];
  addQuest: (quest: Quest) => void;
  completeQuest: (id: string, asMini?: boolean, rect?: DOMRect) => void;
  failQuest: (id: string) => void;
  resetQuest: (id: string) => void;
  deleteQuest: (id: string) => void;
  tutorialStep?: number;
  onTutorialAction?: (step: number) => void;
  onTutorialAnalysisFail?: () => void;
  playerData?: PlayerData;
  onToggleNav?: (visible: boolean) => void;
  recordStrike?: () => void;
  onShowPact?: (quest: Quest) => void;
}

const RANK_COLORS: Record<Rank, { bg: string; text: string; border: string; glow: string }> = {
  E: { bg: 'bg-gray-800',       text: 'text-gray-300',  border: 'border-gray-600',  glow: '' },
  D: { bg: 'bg-orange-900/60',  text: 'text-orange-400',border: 'border-orange-700',glow: 'shadow-[0_0_12px_rgba(251,146,60,0.3)]' },
  C: { bg: 'bg-yellow-900/60',  text: 'text-yellow-400',border: 'border-yellow-700',glow: 'shadow-[0_0_12px_rgba(234,179,8,0.3)]' },
  B: { bg: 'bg-green-900/60',   text: 'text-green-400', border: 'border-green-700', glow: 'shadow-[0_0_12px_rgba(34,197,94,0.3)]' },
  A: { bg: 'bg-cyan-900/60',    text: 'text-cyan-400',  border: 'border-cyan-700',  glow: 'shadow-[0_0_12px_rgba(0,210,255,0.4)]' },
  S: { bg: 'bg-purple-900/60',  text: 'text-purple-400',border: 'border-purple-700',glow: 'shadow-[0_0_16px_rgba(139,92,246,0.5)]' },
};

function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

/* ─────────────────────────────────────────────────────────────────────────
   Futuristic Hexagonal Calendar
──────────────────────────────────────────────────────────────────────────── */
const DAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTH_NAMES = [
  'JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE',
  'JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER',
];
const WATER_GRADIENT = 'linear-gradient(0deg, #8b5cf6 0%, #3b82f6 55%, #06b6d4 100%)';

const FuturisticCalendar: React.FC<{ quests: Quest[] }> = ({ quests }) => {
  const [offset, setOffset] = useState(0);
  const todayRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);

  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  const todayDayStr = todayDate.toDateString();

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(todayDate);
    d.setDate(todayDate.getDate() + offset * 7 - 3 + i);
    return d;
  });

  const centerDay = days[3];

  useEffect(() => {
    todayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [offset]);

  return (
    <div>
      <style>{`
        @keyframes pill-float {
          0%,100% { transform: translateY(0px); }
          50%      { transform: translateY(-5px); }
        }
      `}</style>

      {/* Month / Year nav */}
      <div className="flex items-center justify-between px-1 pt-1 pb-4">
        <button
          onClick={() => setOffset(o => o - 1)}
          className="w-7 h-7 rounded-full flex items-center justify-center active:scale-90 transition-all"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <ChevronLeft size={12} className="text-gray-400" />
        </button>

        <div className="flex items-center gap-2">
          <CalendarDays size={14} className="text-gray-400" />
          <span className="text-sm font-black text-white font-mono tracking-widest">
            {MONTH_NAMES[centerDay.getMonth()]}
          </span>
          <span className="text-sm font-mono" style={{ color: 'rgba(156,163,175,0.7)' }}>
            {centerDay.getFullYear()}
          </span>
        </div>

        <button
          onClick={() => setOffset(o => o + 1)}
          className="w-7 h-7 rounded-full flex items-center justify-center active:scale-90 transition-all"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <ChevronRight size={12} className="text-gray-400" />
        </button>
      </div>

      {/* Pill day strip */}
      <div
        ref={stripRef}
        className="flex justify-center pb-3 gap-3"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {days.map((day, i) => {
          const dayStr = day.toDateString();
          const isToday = dayStr === todayDayStr;
          const isPast  = day < todayDate;

          const questsOnDay = quests.filter(q => {
            const d = new Date(q.createdAt);
            d.setHours(0, 0, 0, 0);
            return d.toDateString() === dayStr;
          });
          const totalOnDay = questsOnDay.length;
          const doneOnDay  = questsOnDay.filter(q => q.isCompleted).length;
          const fillPct    = (isPast || isToday) && totalOnDay > 0
            ? Math.round((doneOnDay / totalOnDay) * 100)
            : 0;

          let borderCol: string;
          let glowFilter: string;

          if (isToday) {
            borderCol  = '#00d4ff';
            glowFilter = '0 0 10px rgba(0,212,255,0.5)';
          } else if (isPast) {
            if (totalOnDay === 0) {
              borderCol  = '#252525';
              glowFilter = 'none';
            } else if (doneOnDay === totalOnDay) {
              borderCol  = '#16a34a';
              glowFilter = '0 0 8px rgba(22,163,74,0.4)';
            } else if (doneOnDay === 0) {
              borderCol  = '#dc2626';
              glowFilter = '0 0 8px rgba(220,38,38,0.4)';
            } else {
              borderCol  = '#3b82f6';
              glowFilter = '0 0 8px rgba(59,130,246,0.4)';
            }
          } else {
            borderCol  = '#252525';
            glowFilter = 'none';
          }

          const showCheck   = (isPast && doneOnDay > 0 && doneOnDay === totalOnDay) || (isToday && fillPct === 100);
          const showX       = isPast && totalOnDay > 0 && doneOnDay === 0;
          const showNumber  = !showCheck && !showX;

          const floatDuration = 2.4 + (i % 3) * 0.35;
          const floatDelay   = i * 0.15;

          return (
            <div
              key={i}
              ref={isToday ? todayRef : undefined}
              className="flex flex-col items-center gap-2 shrink-0"
              style={{
                animation: `pill-float ${floatDuration}s ease-in-out ${floatDelay}s infinite`,
              }}
            >
              {/* Pill */}
              <div
                style={{
                  width: 38,
                  height: 80,
                  borderRadius: 9999,
                  overflow: 'hidden',
                  position: 'relative',
                  background: 'rgba(8,8,18,0.92)',
                  border: `1.5px solid ${borderCol}`,
                  boxShadow: glowFilter === 'none'
                    ? 'inset 0 1px 0 rgba(255,255,255,0.05)'
                    : `${glowFilter}, inset 0 1px 0 rgba(255,255,255,0.07)`,
                }}
              >
                {/* Water fill */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: `${fillPct}%`,
                    background: WATER_GRADIENT,
                    opacity: 0.82,
                    transition: 'height 0.85s cubic-bezier(0.34,1.56,0.64,1)',
                    borderRadius: fillPct >= 100 ? 9999 : '0 0 9999px 9999px',
                  }}
                />

                {/* Icon / number — above water */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1,
                  }}
                >
                  {showCheck ? (
                    <Check size={16} color="#ffffff" strokeWidth={2.5} />
                  ) : showX ? (
                    <XCircle size={16} color="#ef4444" strokeWidth={1.8} />
                  ) : showNumber ? (
                    <span style={{
                      color: isToday ? '#ffffff' : fillPct > 0 ? '#e5e7eb' : '#4b5563',
                      fontSize: 13,
                      fontWeight: 800,
                      fontFamily: 'monospace',
                    }}>
                      {day.getDate()}
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Day label */}
              <span
                className="text-[9px] font-black font-mono tracking-wider"
                style={{ color: isToday ? '#00d4ff' : 'rgba(75,85,99,0.6)' }}
              >
                {DAY_LABELS[day.getDay()]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const QuestsView: React.FC<QuestsViewProps> = ({
  quests, addQuest, completeQuest, failQuest, resetQuest, deleteQuest,
  tutorialStep, onTutorialAction, onTutorialAnalysisFail, playerData, onToggleNav, onShowPact
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [scheduleTime, setScheduleTime] = useState('');
  const [autoScheduled, setAutoScheduled] = useState(false);
  const [isDaily, setIsDaily] = useState(false);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [forgeResult, setForgeResult] = useState<ForgeGuardResult | null>(null);
  const [forgeError, setForgeError] = useState<string | null>(null);

  const userTimezone = getUserTimezone();

  const setCurrentTime = () => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    setScheduleTime(`${hh}:${mm}`);
    setAutoScheduled(false);
    playSystemSoundEffect('SYSTEM');
  };

  useEffect(() => {
    onToggleNav?.(!isModalOpen);
  }, [isModalOpen, onToggleNav]);

  const timelineQuests = [...quests].sort((a, b) => b.createdAt - a.createdAt);
  const activeCount = quests.filter(q => !q.isCompleted && !q.failed).length;

  const handleForgeAnalyze = async () => {
    if (!title.trim() || title.trim().length < 5) {
      setForgeError('Describe the quest clearly. Be specific about what you will actually do.');
      return;
    }
    setIsAnalyzing(true);
    setForgeResult(null);
    setForgeError(null);
    setAutoScheduled(false);
    setScheduleTime('');
    playSystemSoundEffect('SYSTEM');
    try {
      const res = await fetch('/api/forge-guard/analyze-quest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: title.trim(),
          userStats: playerData?.stats,
          healthProfile: playerData?.healthProfile,
          timezone: userTimezone,
        }),
      });
      if (!res.ok) throw new Error('ForgeGuard offline');
      const data: ForgeGuardResult = await res.json();
      if (data.isSpam) {
        setForgeError(
          'ForgeGuard has rejected this objective. The System cannot verify this as a real-world task. Dusk is watching — do not waste her time.'
        );
        playSystemSoundEffect('WARNING');
        if (tutorialStep === 8 && onTutorialAnalysisFail) {
          setTitle(''); // Clear title so they have to type again
          onTutorialAnalysisFail();
        }
      } else {
        setForgeResult(data);
        if (data.autoDetectedTime) {
          setScheduleTime(data.autoDetectedTime);
          setAutoScheduled(true);
        }
        playSystemSoundEffect('PURCHASE');
        if (tutorialStep === 8 && onTutorialAction) onTutorialAction(9);
      }
    } catch {
      setForgeError('ForgeGuard is offline. Quest creation requires AI analysis — please try again.');
      if (tutorialStep === 8 && onTutorialAnalysisFail) {
        setTitle(''); // Clear title on offline error too, to avoid getting stuck
        onTutorialAnalysisFail();
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCreate = () => {
    setError(null);
    if (!forgeResult || !title.trim()) return;
    if (!scheduleTime) {
      setError('SET A TIME — When are you doing this quest today?');
      return;
    }
    const isDuplicate = quests.some(
      q => q.title.toLowerCase().trim() === title.toLowerCase().trim() && !q.isCompleted && !q.failed
    );
    if (isDuplicate) {
      setError('DUPLICATE QUEST DETECTED. COMPLETE EXISTING TASK FIRST.');
      playSystemSoundEffect('WARNING');
      return;
    }

    // Mandatory pact gold check — block quest creation if player can't afford (skip during tutorial)
    if (tutorialStep !== 11) {
      const rank = forgeResult.rank;
      const pledgeAmount = PLEDGE_AMOUNTS[rank];
      if (MANDATORY_RANKS.has(rank) && (playerData?.gold ?? 0) < pledgeAmount) {
        setError(`INSUFFICIENT GOLD — ${rank}-Rank quests require ${pledgeAmount}G Shadow Pledge. Earn more Gold before attempting this rank.`);
        playSystemSoundEffect('WARNING');
        return;
      }
    }

    const scheduledTimestamp = new Date(`${todayStr()}T${scheduleTime}`).toISOString();
    const newQuest: Quest = {
      id: Math.random().toString(36).substr(2, 9),
      title: title.trim(),
      description: '',
      rank: forgeResult.rank,
      priority: 'MEDIUM' as Priority,
      category: forgeResult.category,
      xpReward: forgeResult.xp,
      isCompleted: false,
      failed: false,
      createdAt: Date.now(),
      isDaily,
      estimatedDuration: forgeResult.estimatedDuration,
      minDurationMinutes: forgeResult.minDurationMinutes,
      aiReasoning: forgeResult.reasoning,
      scheduledTime: scheduledTimestamp,
    };

    // During tutorial, skip pact (user has 0 gold, learns about pact at step 16)
    if (tutorialStep === 11) {
      addQuest(newQuest);
      resetForm();
      if (onTutorialAction) onTutorialAction(12);
    } else if (onShowPact) {
      onShowPact(newQuest);
      setIsModalOpen(false);
      resetForm();
    } else {
      addQuest(newQuest);
      resetForm();
    }
  };

  const resetForm = () => {
    setIsModalOpen(false);
    setTitle('');
    setError(null);
    setForgeResult(null);
    setForgeError(null);
    setScheduleTime('');
    setAutoScheduled(false);
    setIsDaily(false);
  };

  const handleCompleteWithRect = (id: string, asMini?: boolean) => {
    const el = document.getElementById(`quest-card-${id}`);
    const rect = el?.getBoundingClientRect() || undefined;
    completeQuest(id, asMini, rect);
  };

  const rk = forgeResult ? RANK_COLORS[forgeResult.rank] : null;
  const scheduleReady = !!scheduleTime;

  return (
    <div className="space-y-4">
      {/* ── Futuristic Calendar Header ── */}
      <div
        className="sticky top-0 z-20 space-y-3 pt-2 pb-3 px-0"
        style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
      >
        <FuturisticCalendar quests={quests} />

        {/* TODAY TASKS row */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-3">
            <span className="text-xs font-black font-mono tracking-[0.25em] text-white uppercase">
              TODAY  TASKS
            </span>
            <span
              className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold"
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.14)',
                color: '#9ca3af',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
              }}
            >
              {activeCount} Active
            </span>
          </div>

          <button
            id="tut-add-quest"
            onClick={() => {
              setIsModalOpen(true);
              if (tutorialStep === 6 && onTutorialAction) onTutorialAction(7);
            }}
            className="w-11 h-11 rounded-full flex items-center justify-center active:scale-90 transition-all"
            style={{
              background: '#00d4ff',
              boxShadow: '0 0 22px rgba(0,212,255,0.5), 0 4px 14px rgba(0,0,0,0.35)',
            }}
          >
            <Plus size={22} className="text-black" strokeWidth={3} />
          </button>
        </div>
      </div>

      {/* Quest List */}
      <div id="quest-list-container" className="space-y-4 min-h-[50vh] pb-20 relative">
        <div className="absolute left-6 top-0 bottom-0 w-px bg-gray-800 z-0 hidden md:block" />
        <AnimatePresence mode="popLayout">
          {timelineQuests.map((quest, index) => {
            const isTutorialWelcomePhase = (tutorialStep ?? 0) >= 13 && (tutorialStep ?? 0) <= 15;
            let isLocked = false;
            if (isTutorialWelcomePhase) {
              const isWelcomeQuest = quest.id.includes('init_q');
              if (!isWelcomeQuest) {
                isLocked = true;
              }
            }
            return (
            <motion.div
              key={quest.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="relative z-10"
            >
              <QuestCard
                quest={quest}
                onComplete={(id, asMini) => handleCompleteWithRect(id, asMini)}
                onFail={failQuest}
                onReset={resetQuest}
                onDelete={deleteQuest}
                isLocked={isLocked}
              />
            </motion.div>
            );
          })}
        </AnimatePresence>
        {timelineQuests.length === 0 && (
          <div className="text-center py-20 text-gray-600 font-mono text-sm border-2 border-dashed border-system-border rounded-lg bg-black/20">
            NO ACTIVE PROTOCOLS. INITIATE QUEST.
          </div>
        )}
        {timelineQuests.length > 0 && (
          <div className="flex justify-center mt-8">
            <div className="text-[10px] text-gray-700 font-mono flex items-center gap-2">
              <Skull size={12} /> END OF LINE
            </div>
          </div>
        )}
      </div>

      {/* Create Quest Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-sm overflow-hidden">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-lg rounded-2xl overflow-hidden max-h-[92vh] m-auto relative flex flex-col"
              style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(8,8,20,0.92) 10%, rgba(4,4,14,0.97) 100%)', backdropFilter: 'blur(32px) saturate(200%)', WebkitBackdropFilter: 'blur(32px) saturate(200%)', borderTop: '1px solid rgba(255,255,255,0.14)', borderLeft: '1px solid rgba(255,255,255,0.08)', borderRight: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.03)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.4), 0 24px 60px rgba(0,0,0,0.7)' }}
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b border-white/[0.08] flex justify-between items-center z-10 shrink-0" style={{ background: 'rgba(4,4,14,0.6)' }}>
                <div className="flex items-center gap-2">
                  <ShieldCheck size={15} className="text-cyan-400" />
                  <h3 className="text-sm font-black text-white font-mono tracking-widest">FORGE NEW QUEST</h3>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-[9px] text-gray-600 font-mono">
                    <Globe size={9} />
                    {userTimezone}
                  </div>
                  <button onClick={resetForm} className="text-gray-500 hover:text-white transition-colors">
                    <X size={17} />
                  </button>
                </div>
              </div>

              <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 custom-scrollbar">

                {/* Error Banner */}
                <AnimatePresence>
                  {error && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      className="bg-red-900/20 border border-red-900/50 p-3 rounded-xl text-[10px] text-red-400 font-mono flex items-center gap-2"
                    >
                      <AlertTriangle size={11} className="shrink-0" /> {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Title Input */}
                <div>
                  <label className="block text-[10px] text-gray-500 mb-2 font-mono uppercase tracking-widest">What is the quest?</label>
                  <input
                    id="tut-quest-title"
                    value={title}
                    onChange={e => { 
                      setTitle(e.target.value); 
                      if (forgeError) setForgeError(null);
                      if (forgeResult) { setForgeResult(null); setScheduleTime(''); setAutoScheduled(false); } 
                    }}
                    onKeyDown={e => { const wc = title.trim().split(/\s+/).filter(w=>w.length>0).length; if (e.key === 'Enter' && wc >= 2 && !isAnalyzing && !forgeResult) handleForgeAnalyze(); }}
                    placeholder="e.g. Run 5km at 7am, Read 30 pages by evening"
                    maxLength={120}
                    className="w-full bg-system-bg border border-system-border rounded-xl p-3 text-white text-sm focus:border-system-neon focus:outline-none transition-colors placeholder:text-gray-700"
                    autoFocus
                  />
                  <div className="flex justify-between mt-1.5">
                    <span className="text-[9px] font-mono" style={{ color: title.trim().split(/\s+/).filter(w=>w.length>0).length >= 2 ? 'rgba(0,210,255,0.45)' : 'rgba(156,163,175,0.5)' }}>
                      {title.trim().split(/\s+/).filter(w=>w.length>0).length >= 2 ? 'Quest approved — ready to analyze.' : 'Describe in at least 2 words to unlock analysis.'}
                    </span>
                    <span className="text-[9px] text-gray-700">{title.length}/120</span>
                  </div>
                </div>

                {/* ForgeGuard Analyze Button */}
                {(() => { const hasWords = title.trim().split(/\s+/).filter(w=>w.length>0).length >= 2; return (
                <button
                  id="tut-quest-analyze"
                  onClick={handleForgeAnalyze}
                  disabled={isAnalyzing || !hasWords || !!forgeResult}
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all border ${
                    forgeResult
                      ? 'bg-green-900/20 border-green-800/50 text-green-500 cursor-default'
                      : isAnalyzing
                      ? 'bg-cyan-900/30 border-cyan-800 text-cyan-500 cursor-wait'
                      : hasWords
                      ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-400 shadow-[0_0_15px_rgba(0,210,255,0.08)]'
                      : 'bg-gray-900/50 border-gray-800 text-gray-600 cursor-not-allowed'
                  }`}
                >
                  {isAnalyzing ? (
                    <><Loader2 size={14} className="animate-spin" /> FORGEGUARD ANALYZING...</>
                  ) : forgeResult ? (
                    <><CheckCircle size={14} /> VERDICT LOCKED</>
                  ) : (
                    <><BrainCircuit size={14} /> ANALYZE WITH FORGEGUARD</>
                  )}
                </button>
                );})()}

                {/* ForgeGuard Error */}
                <AnimatePresence>
                  {forgeError && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="bg-red-950/40 border border-red-800/50 rounded-xl p-3 flex items-start gap-2"
                    >
                      <AlertTriangle size={12} className="text-red-400 mt-0.5 shrink-0" />
                      <p className="text-[11px] text-red-400 font-mono leading-relaxed">{forgeError}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ForgeGuard Result Card — RANK + REASON ONLY */}
                <AnimatePresence>
                  {forgeResult && rk && (
                    <motion.div
                      id="tut-quest-category"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="rounded-2xl overflow-hidden"
                      style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(6,6,18,0.90) 12%, rgba(3,3,10,0.96) 100%)', backdropFilter: 'blur(20px) saturate(160%)', WebkitBackdropFilter: 'blur(20px) saturate(160%)', borderTop: '1px solid rgba(255,255,255,0.11)', borderLeft: '1px solid rgba(255,255,255,0.06)', borderRight: '1px solid rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.03)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07), 0 6px 24px rgba(0,0,0,0.5)' }}
                    >
                      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.07]" style={{ background: 'rgba(0,0,0,0.35)' }}>
                        <Lock size={9} className="text-cyan-500" />
                        <span className="text-[9px] text-cyan-500/80 font-black tracking-widest">FORGEGUARD VERDICT — IMMUTABLE</span>
                      </div>
                      <div className="p-4 space-y-3">
                        {/* Rank badge */}
                        <div className="flex items-center gap-3">
                          <RankBadge rank={forgeResult.rank as RankType} size={44} animated />
                          <div className="text-[9px] text-gray-600 font-mono">
                            +{forgeResult.xp} XP · {forgeResult.estimatedDuration}min estimated
                          </div>
                        </div>
                        {/* Reasoning only */}
                        <p className="text-[11px] text-gray-300 font-mono leading-relaxed border-l-2 border-cyan-900/60 pl-3">
                          {forgeResult.reasoning}
                        </p>
                        {forgeResult.minDurationMinutes && (
                          <div className="flex items-center gap-1.5 text-[9px] text-amber-600/60 font-mono pt-1">
                            <Lock size={8} />
                            TIME LOCK: Minimum {forgeResult.minDurationMinutes} min before completion is accepted
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Scheduling — MANDATORY, always shown after ForgeGuard result */}
                <AnimatePresence>
                  {forgeResult && (
                    <motion.div
                      id="tut-schedule"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-3"
                    >
                      <div className="flex items-center gap-2">
                        <Clock size={13} className={scheduleReady ? 'text-purple-400' : 'text-amber-400'} />
                        <span className="text-[10px] font-black uppercase tracking-widest font-mono text-gray-300">
                          What time today?
                        </span>
                        {!scheduleReady && (
                          <span className="text-[9px] text-amber-500 font-mono ml-auto">REQUIRED</span>
                        )}
                        {scheduleReady && autoScheduled && (
                          <span className="text-[9px] text-purple-400 font-mono ml-auto">AUTO-DETECTED</span>
                        )}
                      </div>
                      <input
                        type="time"
                        value={scheduleTime}
                        onChange={e => { setScheduleTime(e.target.value); setAutoScheduled(false); }}
                        className="w-full bg-system-bg border border-system-border rounded-xl p-2.5 text-white text-xs focus:border-purple-500 focus:outline-none transition-colors"
                      />
                      <button
                        onClick={setCurrentTime}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-gray-900/80 border border-amber-900/40 rounded-xl text-[10px] font-black text-amber-400 hover:text-amber-300 hover:border-amber-700/60 hover:bg-amber-950/30 transition-all uppercase tracking-widest"
                      >
                        <Zap size={11} className="shrink-0" />
                        SCHEDULE FOR NOW
                      </button>
                      {!scheduleReady && (
                        <p className="text-[9px] text-amber-600/70 font-mono">
                          Set a time to activate the protocol. Quests not completed by midnight will be removed.
                        </p>
                      )}
                      {/* Loop Daily toggle */}
                      <button
                        onClick={() => setIsDaily(!isDaily)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                          isDaily ? 'text-cyan-400' : 'text-gray-500 hover:text-gray-400'
                        }`}
                        style={isDaily ? { background: 'linear-gradient(180deg, rgba(0,210,255,0.06) 0%, rgba(0,160,200,0.04) 100%)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderTop: '1px solid rgba(0,210,255,0.25)', borderLeft: '1px solid rgba(0,210,255,0.12)', borderRight: '1px solid rgba(0,210,255,0.06)', borderBottom: '1px solid rgba(0,210,255,0.04)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 3px 12px rgba(0,0,0,0.3)' } : { background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(6,6,16,0.6) 100%)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderTop: '1px solid rgba(255,255,255,0.07)', borderLeft: '1px solid rgba(255,255,255,0.04)', borderRight: '1px solid rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.02)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 3px 10px rgba(0,0,0,0.3)' }}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                          isDaily ? 'bg-system-neon border-system-neon' : 'bg-transparent border-gray-600'
                        }`}>
                          {isDaily && <Repeat size={10} className="text-black" />}
                        </div>
                        <div className="text-left">
                          <p className="text-[10px] font-black uppercase tracking-widest">Loop Daily (24h)</p>
                          <p className="text-[9px] opacity-60 font-mono">
                            {isDaily
                              ? 'Quest resets at midnight — repeats every day'
                              : 'Quest is removed after completion or at midnight'}
                          </p>
                        </div>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>

              {/* Modal Footer */}
              <div className="p-3 sm:p-4 border-t border-white/[0.08] flex justify-end gap-3 z-10 shrink-0" style={{ background: 'rgba(4,4,14,0.6)' }}>
                <button onClick={resetForm} className="px-4 py-2 text-xs font-mono text-gray-500 hover:text-white transition-colors">
                  CANCEL
                </button>
                <button
                  id="tut-confirm-quest"
                  onClick={handleCreate}
                  disabled={!forgeResult || !title.trim() || !scheduleReady}
                  className="px-6 py-2.5 bg-system-neon text-black font-black rounded-xl text-xs font-mono hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-[0_0_15px_rgba(0,210,255,0.15)]"
                >
                  CONFIRM PROTOCOL
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default QuestsView;
