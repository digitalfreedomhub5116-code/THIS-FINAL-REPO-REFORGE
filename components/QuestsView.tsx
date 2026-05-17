
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, CalendarDays, ChevronLeft, ChevronRight, Check, XCircle, Skull, AlertTriangle, BrainCircuit, Loader2, CheckCircle, X, Clock, ShieldCheck, Globe, Repeat, Zap, Dumbbell, Brain, Shield, Users } from 'lucide-react';
import { Quest, CoreStats, Rank, Priority, PlayerData, Goal, DungeonState, WorkoutDay, FormCoachSession } from '../types';
import GoalsView from './GoalsView';
import RankBadge from './RankBadge';
import type { RankType } from './RankBadge';
import QuestCard from './QuestCard';
import DungeonQuestCards from './DungeonQuestCards';
import ActiveWorkoutPlayer, { clearWorkoutSession } from './ActiveWorkoutPlayer';
import { buildDungeonWorkoutPlan, toggleFormCoach } from '../lib/dungeonEngine';

import { playSystemSoundEffect } from '../utils/soundEngine';
import { API_BASE } from '../lib/apiConfig';
import { getPlayerAuthHeaders } from '../lib/playerApi';
import { scheduleQuestStartNotification } from '../hooks/useLocalNotifications';



interface ForgeGuardResult {
  rank: Rank;
  xp: number;
  category: keyof CoreStats;
  categories?: (keyof CoreStats)[];
  reasoning: string;
  estimatedDuration: number;
  minDurationMinutes?: number;
  suggestedTime?: string;
  autoDetectedTime?: string | null;
  isSpam: boolean;
  sensorRequirements?: {
    steps?: number;
    distanceKm?: number;
    activeMinutes?: number;
  } | null;
}

const FREE_DAILY_ANALYSES = 3;

function getDailyAnalysisCount(userId?: string): number {
  const today = new Date().toISOString().split('T')[0];
  const key = `reforge_daily_analyses_${userId || 'local'}_${today}`;
  return parseInt(localStorage.getItem(key) || '0', 10);
}

function incrementDailyAnalysisCount(userId?: string): void {
  const today = new Date().toISOString().split('T')[0];
  const key = `reforge_daily_analyses_${userId || 'local'}_${today}`;
  const current = parseInt(localStorage.getItem(key) || '0', 10);
  localStorage.setItem(key, String(current + 1));
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
  onStartTracking?: (id: string, requirements?: { steps?: number; distanceKm?: number; activeMinutes?: number }) => void;
  onStopTracking?: (id: string) => void;
  onConsumeMana?: (amount: number) => boolean;
  onRefundMana?: (amount: number) => void;
  isQuestOnboarding?: boolean;
  onTutorialManaOut?: () => void;
  goals?: Goal[];
  onUpdateGoals?: (goals: Goal[]) => void;
  onDeleteGoal?: (goalId: string) => void;
  onDeductGold?: (amount: number) => void;
  onShowInterstitialAd?: () => Promise<boolean>;

  // Daily Dungeon (Sung Jin-woo Protocol)
  dungeonState?: DungeonState;
  onInitializeDungeon?: () => void;
  onUpdateDungeonState?: (updater: (prev: DungeonState) => DungeonState) => void;
  onCompleteDungeonWorkout?: (exercisesCompleted: number, totalExercises: number, results: Record<string, number>, anomalyPoints?: number, formCoachBonusXp?: number, formCoachSession?: FormCoachSession) => any;
  onFailDungeonWorkout?: () => void;
}

const RANK_COLORS: Record<Rank, { bg: string; text: string; border: string; glow: string }> = {
  UNRANKED: { bg: 'bg-gray-900', text: 'text-gray-600', border: 'border-gray-800', glow: '' },
  E: { bg: 'bg-gray-800',       text: 'text-gray-300',  border: 'border-gray-600',  glow: '' },
  D: { bg: 'bg-orange-900/60',  text: 'text-orange-400',border: 'border-orange-700',glow: 'shadow-[0_0_12px_rgba(251,146,60,0.3)]' },
  C: { bg: 'bg-yellow-900/60',  text: 'text-yellow-400',border: 'border-yellow-700',glow: 'shadow-[0_0_12px_rgba(234,179,8,0.3)]' },
  B: { bg: 'bg-green-900/60',   text: 'text-green-400', border: 'border-green-700', glow: 'shadow-[0_0_12px_rgba(34,197,94,0.3)]' },
  A: { bg: 'bg-cyan-900/60',    text: 'text-[#00d4ff]',  border: 'border-cyan-700',  glow: 'shadow-[0_0_12px_rgba(0,212,255,0.4)]' },
  S: { bg: 'bg-purple-900/60',  text: 'text-[#00d4ff]',border: 'border-purple-700',glow: 'shadow-[0_0_16px_rgba(0,212,255,0.5)]' },
};

function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}

const QuestsView: React.FC<QuestsViewProps> = ({
  quests, addQuest, completeQuest, failQuest, resetQuest, deleteQuest, tutorialStep, onTutorialAction, onTutorialAnalysisFail, playerData, onToggleNav, onShowPact, onStartTracking, onStopTracking, onConsumeMana, onRefundMana, isQuestOnboarding, onTutorialManaOut, goals, onUpdateGoals, onDeleteGoal, onDeductGold, onShowInterstitialAd, dungeonState, onInitializeDungeon, onUpdateDungeonState, onCompleteDungeonWorkout, onFailDungeonWorkout,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'QUESTS' | 'GOALS'>('QUESTS');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isDaily, setIsDaily] = useState(false);
  const [scheduledTime, setScheduledTime] = useState<string>('');
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [forgeResult, setForgeResult] = useState<ForgeGuardResult | null>(null);
  const [forgeError, setForgeError] = useState<string | null>(null);
  const [analysisCount, setAnalysisCount] = useState(0);

  const userTimezone = getUserTimezone();

  // Daily Dungeon state
  const [isDungeonActive, setIsDungeonActive] = useState(false);
  const [dungeonPlan, setDungeonPlan] = useState<WorkoutDay | null>(null);
  const [dungeonRewards, setDungeonRewards] = useState<any[] | null>(null);

  // Auto-initialize dungeon on mount if not yet initialized
  useEffect(() => {
    if (!dungeonState && playerData?.healthProfile && onInitializeDungeon) {
      onInitializeDungeon();
    }
  }, [dungeonState, playerData?.healthProfile, onInitializeDungeon]);

  const handleEnterDungeon = () => {
    if (!dungeonState) return;
    const { isExerciseCompletedToday: isExDone } = require('../lib/dungeonEngine');
    const remainingTargets = dungeonState.targets.filter(
      (t: any) => !isExDone(dungeonState, t.exercise)
    );
    const targetsForPlan = remainingTargets.length > 0 ? remainingTargets : dungeonState.targets;
    const plan = buildDungeonWorkoutPlan(targetsForPlan);
    setDungeonPlan(plan);
    setIsDungeonActive(true);
    onToggleNav?.(false);
    playSystemSoundEffect('SYSTEM');
  };

  const handleDungeonComplete = (c: number, t: number, r: Record<string, number>, anomaly?: number, fcBonus?: number, fcSession?: FormCoachSession) => {
    setIsDungeonActive(false);
    setDungeonPlan(null);
    onToggleNav?.(true);
    // Track per-exercise completions
    if (dungeonState && onUpdateDungeonState) {
      const { recordExerciseCompletions, isExerciseCompletedToday: isExDone } = require('../lib/dungeonEngine');
      const remainingTargets = dungeonState.targets.filter(
        (t: any) => !isExDone(dungeonState, t.exercise)
      );
      const completedExNames = remainingTargets.map((t: any) => t.exercise);
      onUpdateDungeonState((prev: any) => recordExerciseCompletions(prev, completedExNames));
    }
    if (onCompleteDungeonWorkout) {
      onCompleteDungeonWorkout(c, t, r, anomaly, fcBonus, fcSession);
    }
  };

  const handleDungeonFail = () => {
    setIsDungeonActive(false);
    setDungeonPlan(null);
    onToggleNav?.(true);
    clearWorkoutSession(playerData?.userId || 'local');
    // Don't record full failure — user can re-enter to continue remaining exercises
  };

  const handleToggleFormCoach = (exercise: 'PUSHUPS' | 'SQUATS') => {
    if (!dungeonState || !onUpdateDungeonState) return;
    onUpdateDungeonState((prev) => toggleFormCoach(prev, exercise));
  };

  useEffect(() => {
    onToggleNav?.(!isModalOpen);
  }, [isModalOpen, onToggleNav]);

  const timelineQuests = [...quests].sort((a, b) => b.createdAt - a.createdAt);
  const activeCount = quests.filter(q => !q.isCompleted && !q.failed).length;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const questsAddedToday = quests.filter(q => q.createdAt >= startOfToday).length;
  const MAX_QUESTS_PER_DAY = 10;
  const canAddMoreQuests = questsAddedToday < MAX_QUESTS_PER_DAY;

  const handleForgeAnalyze = async () => {
    if (!canAddMoreQuests) {
      setForgeError(`SYSTEM LIMIT REACHED: You have already forged ${MAX_QUESTS_PER_DAY} quests today.`);
      return;
    }
    if (!title.trim() || title.trim().length < 5) {
      setForgeError('Describe the quest clearly. Be specific about what you will actually do.');
      return;
    }

    // ── Free 3/day, then check keys ──
    const dailyCount = getDailyAnalysisCount(playerData?.userId);
    const isFree = dailyCount < FREE_DAILY_ANALYSES;

    // Tutorial free passes
    const tutFreeKey = `reforge_tut_free_analyses_${playerData?.userId || 'local'}`;
    const tutFreeUsed = parseInt(localStorage.getItem(tutFreeKey) || '0', 10);
    if (isQuestOnboarding && tutFreeUsed < 2) {
      localStorage.setItem(tutFreeKey, String(tutFreeUsed + 1));
    } else if (!isFree && (playerData?.keys ?? 0) <= 0) {
      // Past free tier + no keys = blocked
      setForgeError('KEYS DEPLETED — You\'ve used your 3 free analyses today. Buy more keys or complete quests to earn them.');
      return;
    }

    setIsAnalyzing(true);
    setForgeResult(null);
    setForgeError(null);
    playSystemSoundEffect('SYSTEM');
    try {
      const res = await fetch(`${API_BASE}/api/forge-guard/analyze-quest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getPlayerAuthHeaders() },
        credentials: 'include',
        body: JSON.stringify({
          title: title.trim(),
          userStats: playerData?.stats,
          healthProfile: playerData?.healthProfile,
          timezone: userTimezone,
          retryCount: analysisCount,
        }),
      });

      if (res.status === 402) {
        const errData = await res.json().catch(() => ({}));
        setForgeError('KEYS DEPLETED — Not enough keys for this analysis. Buy more or wait until tomorrow.');
        playSystemSoundEffect('WARNING');
        return;
      }
      if (!res.ok) throw new Error('ForgeGuard offline');

      const data: ForgeGuardResult = await res.json();
      if (data.isSpam) {
        setForgeError(
          'ForgeGuard has rejected this objective. The System cannot verify this as a real-world task. Dusk is watching — do not waste his time.'
        );
        playSystemSoundEffect('WARNING');
        if (tutorialStep === 3 && onTutorialAnalysisFail) {
          setTitle('');
          onTutorialAnalysisFail();
        }
      } else {
        const hasNumber = /\d/.test(title.trim());
        const cats = (data.categories || []) as string[];
        const isPhysical = !!data.sensorRequirements || ['strength', 'willpower'].every(c => cats.includes(c));
        if (isPhysical && !hasNumber && data.estimatedDuration && data.estimatedDuration > 0) {
          setForgeError(
            'Quest rejected — you must specify a time, distance, or rep count for physical tasks. Example: "Run 10 mins", "50 pushups", "Cycle 5km".'
          );
          playSystemSoundEffect('WARNING');
          if (tutorialStep === 3 && onTutorialAnalysisFail) {
            setTitle('');
            onTutorialAnalysisFail();
          }
        } else {
          setForgeResult(data);
          incrementDailyAnalysisCount(playerData?.userId);
          playSystemSoundEffect('PURCHASE');
          if (tutorialStep === 3 && onTutorialAction) onTutorialAction(4);
        }
      }
      setAnalysisCount(prev => prev + 1);
    } catch {
      setForgeError('ForgeGuard is offline. Quest creation requires AI analysis — please try again.');
      if (tutorialStep === 3 && onTutorialAnalysisFail) {
        setTitle('');
        onTutorialAnalysisFail();
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCreate = async () => {
    setError(null);
    setScheduleError(null);
    if (!forgeResult || !title.trim()) return;
    // Require scheduling before confirming
    if (!scheduledTime) {
      setScheduleError('Please schedule your quest before confirming.');
      playSystemSoundEffect('WARNING');
      return;
    }
    if (playerData?.questOnboardingDone !== false) {
      const isDuplicate = quests.some(
        q => q.title.toLowerCase().trim() === title.toLowerCase().trim() && !q.isCompleted && !q.failed
      );
      if (isDuplicate) {
        setError('DUPLICATE QUEST DETECTED. COMPLETE EXISTING TASK FIRST.');
        playSystemSoundEffect('WARNING');
        return;
      }
    }

    const newQuest: Quest = {
      id: Math.random().toString(36).substr(2, 9),
      title: title.trim(),
      description: '',
      rank: forgeResult.rank,
      priority: 'MEDIUM' as Priority,
      category: forgeResult.category,
      categories: forgeResult.categories || [forgeResult.category],
      xpReward: forgeResult.xp,
      isCompleted: false,
      failed: false,
      createdAt: Date.now(),
      isDaily,
      scheduledTime: scheduledTime || undefined,
      estimatedDuration: forgeResult.estimatedDuration,
      minDurationMinutes: forgeResult.minDurationMinutes,
      aiReasoning: forgeResult.reasoning,
      ...(forgeResult.sensorRequirements ? { sensorRequirements: forgeResult.sensorRequirements } : {}),
    };

    if (tutorialStep === 4 || isQuestOnboarding) {
      addQuest(newQuest);
      resetForm();
      if (onTutorialAction) onTutorialAction(5);
    } else {
      addQuest(newQuest);
      setIsModalOpen(false);
      resetForm();

      // Schedule notification for when scheduled quest starts
      if (scheduledTime) {
        const timeStr = scheduledTime.includes('T') ? scheduledTime.split('T')[1].slice(0, 5) : scheduledTime;
        scheduleQuestStartNotification(newQuest.id, newQuest.title, timeStr);
      }

      // ADS DISABLED — interstitial ad after quest creation removed
      // const dailyCount = getDailyAnalysisCount(playerData?.userId);
      // if (dailyCount > FREE_DAILY_ANALYSES && onShowInterstitialAd) {
      //   try { await onShowInterstitialAd(); } catch (e) { /* ad failed, continue */ }
      // }
    }
  };

  const resetForm = () => {
    setIsModalOpen(false);
    setTitle('');
    setError(null);
    setForgeResult(null);
    setForgeError(null);
    setIsDaily(false);
    setScheduledTime('');
    setScheduleError(null);
    setAnalysisCount(0);
  };

  const handleCompleteWithRect = (id: string, asMini?: boolean) => {
    const el = document.getElementById(`quest-card-${id}`);
    const rect = el?.getBoundingClientRect() || undefined;
    completeQuest(id, asMini, rect);
  };

  const rk = forgeResult ? RANK_COLORS[forgeResult.rank] : null;

  return (
    <div className="space-y-4 md:space-y-6">

      <div className="flex items-center gap-1 px-1">
        {(['QUESTS', 'GOALS'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveSubTab(tab)}
            className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all font-mono ${
              activeSubTab === tab
                ? 'text-white'
                : 'text-gray-600 hover:text-gray-400'
            }`}
            style={activeSubTab === tab ? {
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 0 12px rgba(0,212,255,0.08)',
            } : {
              background: 'transparent',
              border: '1px solid transparent',
            }}
          >
            {tab === 'GOALS' ? `Goals ${(goals || []).filter(g => g.status === 'ACTIVE').length > 0 ? `(${(goals || []).filter(g => g.status === 'ACTIVE').length})` : ''}` : tab}
          </button>
        ))}
      </div>

      {activeSubTab === 'GOALS' && (
        <GoalsView
          goals={goals || []}
          playerData={playerData}
          onUpdateGoals={onUpdateGoals || (() => {})}
          onDeleteGoal={onDeleteGoal}
          onConsumeMana={onConsumeMana}
          onRefundMana={onRefundMana}
          onDeductGold={onDeductGold}
          onAddQuestToFeed={addQuest}

        />
      )}

      {activeSubTab === 'QUESTS' && <>

        {/* ── DAILY DUNGEON (Sung Jin-woo Protocol) ── */}
        {dungeonState && (
          <div className="px-0">
            <DungeonQuestCards
              dungeonState={dungeonState}
              onEnterDungeon={handleEnterDungeon}
              onToggleFormCoach={handleToggleFormCoach}
            />
          </div>
        )}

        {/* Dungeon Workout Player (fullscreen overlay) */}
        {isDungeonActive && dungeonPlan && (
          <ActiveWorkoutPlayer
            plan={dungeonPlan}
            onComplete={handleDungeonComplete}
            onFail={handleDungeonFail}
            streak={playerData?.streak || 0}
          />
        )}


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
              if (tutorialStep === 1 && onTutorialAction) onTutorialAction(2);
            }}
            className="w-11 h-11 md:w-13 md:h-13 rounded-full flex items-center justify-center active:scale-90 transition-all"
            style={{
              background: '#00d4ff',
              boxShadow: '0 0 22px rgba(0,212,255,0.5), 0 4px 14px rgba(0,0,0,0.35)',
            }}
          >
            <Plus size={22} className="text-black" strokeWidth={3} />
          </button>
        </div>

      {/* Quest List */}
      <div id="quest-list-container" className="space-y-4 md:space-y-5 min-h-[50vh] pb-20 relative">
        {/* Timeline line removed — caused visual artifact below quest cards */}
        <AnimatePresence mode="popLayout">
          {timelineQuests.map((quest, index) => {
            const isTutorialWelcomePhase = false;
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
                onStartTracking={onStartTracking}
                onStopTracking={onStopTracking}
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
          <div className="fixed inset-0 z-[90] flex items-end md:items-center justify-center bg-black/90 backdrop-blur-sm overflow-hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="w-full max-w-lg md:max-w-xl rounded-t-2xl md:rounded-2xl overflow-hidden max-h-[94vh] md:max-h-[85vh] md:m-6 relative flex flex-col"
              style={{ background: '#08081a', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 -8px 40px rgba(0,0,0,0.6), 0 0 80px rgba(0,212,255,0.03)' }}
            >
              {/* Modal Header — minimal */}
              <div className="px-5 pt-5 pb-3 flex justify-between items-center z-10 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)' }}>
                    <ShieldCheck size={13} className="text-[#00d4ff]" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-white font-mono tracking-[0.2em]">NEW QUEST</h3>
                    <span className="text-[8px] text-gray-600 font-mono flex items-center gap-1"><Globe size={7} />{userTimezone}</span>
                  </div>
                </div>
                <button onClick={resetForm} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-600 hover:text-white hover:bg-white/5 transition-all">
                  <X size={16} />
                </button>
              </div>

              {/* Subtle divider */}
              <div className="mx-5 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }} />

              <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1 custom-scrollbar">

                {/* Error Banner */}
                <AnimatePresence>
                  {error && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      className="bg-red-900/15 border border-red-900/40 p-3 rounded-xl text-[10px] text-red-400 font-mono flex items-center gap-2"
                    >
                      <AlertTriangle size={11} className="shrink-0" /> {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Title Input */}
                <div>
                  <label className="block text-[10px] text-gray-500 mb-2 font-mono uppercase tracking-widest">Describe your quest</label>
                  <input
                    id="tut-quest-title"
                    value={title}
                    onChange={e => { 
                      setTitle(e.target.value); 
                      if (forgeError) setForgeError(null);
                      if (forgeResult) { setForgeResult(null); } 
                    }}
                    onKeyDown={e => { const wc = title.trim().split(/\s+/).filter(w=>w.length>0).length; if (e.key === 'Enter' && wc >= 2 && !isAnalyzing && !forgeResult) handleForgeAnalyze(); }}
                    placeholder="e.g. Run 5km, Read 30 pages, Cook dinner at 7pm"
                    maxLength={120}
                    className="w-full rounded-xl p-3.5 text-white text-sm focus:outline-none transition-all placeholder:text-gray-700 font-mono"
                    style={{ background: 'rgba(255,255,255,0.03)', border: forgeResult ? '1px solid rgba(34,197,94,0.25)' : '1px solid rgba(255,255,255,0.08)', boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.3)' }}
                    autoFocus
                  />
                  <div className="flex justify-between mt-1.5 px-0.5">
                    <span className="text-[9px] font-mono" style={{ color: title.trim().split(/\s+/).filter(w=>w.length>0).length >= 2 ? 'rgba(0,212,255,0.4)' : 'rgba(156,163,175,0.4)' }}>
                      {title.trim().split(/\s+/).filter(w=>w.length>0).length >= 2 ? 'Ready to analyze' : 'Min 2 words'}
                    </span>
                    <span className="text-[9px] text-gray-700 font-mono">{title.length}/120</span>
                  </div>

                  {/* Mandatory specificity note */}
                  <div className="mt-2.5 rounded-xl p-3" style={{ background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.15)' }}>
                    <p className="text-[10px] font-black text-amber-400 font-mono uppercase tracking-wider mb-2">
                      Always include a time or amount
                    </p>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-[10px] font-mono">
                        <span className="text-red-400 font-bold">&#10007;</span>
                        <span className="text-gray-500 line-through">Running</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-mono">
                        <span className="text-green-400 font-bold">&#10003;</span>
                        <span className="text-gray-300">Run 10 km</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-mono mt-1.5">
                        <span className="text-red-400 font-bold">&#10007;</span>
                        <span className="text-gray-500 line-through">Cook dinner</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-mono">
                        <span className="text-green-400 font-bold">&#10003;</span>
                        <span className="text-gray-300">Cook dinner for 5 people</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ForgeGuard Analyze Button — hidden after result */}
                {!forgeResult && (() => { const hasWords = title.trim().split(/\s+/).filter(w=>w.length>0).length >= 2; return (
                <button
                  id="tut-quest-analyze"
                  onClick={handleForgeAnalyze}
                  disabled={isAnalyzing || !hasWords}
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                    isAnalyzing
                      ? 'text-[#00d4ff] cursor-wait'
                      : hasWords
                      ? 'text-[#00d4ff] hover:bg-[#00d4ff]/8'
                      : 'text-gray-600 cursor-not-allowed'
                  }`}
                  style={{
                    background: isAnalyzing ? 'rgba(0,212,255,0.06)' : hasWords ? 'rgba(0,212,255,0.04)' : 'rgba(255,255,255,0.02)',
                    border: isAnalyzing ? '1px solid rgba(0,212,255,0.3)' : hasWords ? '1px solid rgba(0,212,255,0.15)' : '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  {isAnalyzing ? (
                    <><Loader2 size={14} className="animate-spin" /> ANALYZING...</>
                  ) : (() => {
                    const dailyUsed = getDailyAnalysisCount(playerData?.userId);
                    const remaining = Math.max(0, FREE_DAILY_ANALYSES - dailyUsed);
                    return <><BrainCircuit size={14} /> ANALYZE QUEST <span className="text-[9px] opacity-60 ml-1">{remaining > 0 ? `(FREE — ${remaining}/3 left)` : analysisCount >= 5 ? '(1 KEY)' : '(FREE)'}</span></>;
                  })()}
                </button>
                );})()}

                {/* Forge Error Message */}
                <AnimatePresence>
                  {forgeError && (
                    <motion.div
                      id="forge-error-banner"
                      initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="bg-red-950/30 border border-red-800/40 rounded-xl p-3 flex items-start gap-2"
                    >
                      <AlertTriangle size={12} className="text-red-400 mt-0.5 shrink-0" />
                      <p className="text-[11px] text-red-400 font-mono leading-relaxed">{forgeError}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ForgeGuard Result Card — Redesigned */}
                <AnimatePresence>
                  {forgeResult && rk && (
                    <motion.div
                      id="tut-quest-category"
                      initial={{ opacity: 0, y: 10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                      className="rounded-2xl overflow-hidden"
                      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <div className="p-4 space-y-3">
                        {/* Top row: Rank + XP + Duration */}
                        <div className="flex items-center gap-3">
                          <RankBadge rank={forgeResult.rank as RankType} size={48} animated />
                          <div className="flex-1">
                            <div className="flex items-baseline gap-2">
                              <span className="text-lg font-black text-white font-mono">+{forgeResult.xp}</span>
                              <span className="text-[10px] text-gray-500 font-mono">XP</span>
                            </div>
                            <span className="text-[9px] text-gray-600 font-mono">~{forgeResult.estimatedDuration} min</span>
                          </div>
                          <div className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
                            <CheckCircle size={10} className="text-green-400" />
                            <span className="text-[9px] text-green-400 font-black font-mono">READY</span>
                          </div>
                        </div>

                        {/* Pillar badges */}
                        <div className="flex items-center gap-2">
                          {(forgeResult.categories || [forgeResult.category]).map((cat) => {
                            const pillarConfig: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
                              strength:     { icon: <Dumbbell size={11} />, color: '#f97066', bg: 'rgba(249,112,102,0.1)' },
                              intelligence: { icon: <Brain size={11} />,    color: '#00d4ff', bg: 'rgba(129,140,248,0.1)' },
                              discipline:   { icon: <Shield size={11} />,   color: '#33dfff', bg: 'rgba(192,132,252,0.1)' },
                              social:       { icon: <Users size={11} />,    color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' },
                            };
                            const cfg = pillarConfig[cat];
                            if (!cfg) return null;
                            return (
                              <span key={cat} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black font-mono uppercase tracking-wide"
                                style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}25` }}>
                                {cfg.icon}
                                {cat}
                              </span>
                            );
                          })}
                        </div>

                        {/* AI Reasoning */}
                        <p className="text-[11px] text-gray-400 font-mono leading-relaxed">
                          {forgeResult.reasoning}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ── Schedule Section (visible after analysis) ── */}
                {forgeResult && (
                  <div className="space-y-3 mt-1">
                    {/* Schedule header with red star */}
                    <div className="flex items-center gap-2">
                      <Clock size={13} className="text-gray-500" />
                      <span className="text-[10px] font-black text-gray-400 font-mono uppercase tracking-widest">Schedule</span>
                      <span style={{ color: '#EF4444', fontSize: 14, fontWeight: 900, lineHeight: 1 }}>*</span>
                    </div>

                    {/* Time picker row */}
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => { setScheduledTime(e.target.value); setScheduleError(null); }}
                        className="flex-1 rounded-xl px-4 py-3 text-white text-sm font-mono focus:outline-none"
                        style={{
                          background: 'rgba(255,255,255,0.04)',
                          border: scheduleError ? '1px solid rgba(239,68,68,0.5)' : scheduledTime ? '1px solid rgba(34,197,94,0.25)' : '1px solid rgba(255,255,255,0.08)',
                          colorScheme: 'dark',
                        }}
                      />
                      <button
                        onClick={() => {
                          const now = new Date();
                          const h = now.getHours().toString().padStart(2, '0');
                          const m = now.getMinutes().toString().padStart(2, '0');
                          setScheduledTime(`${h}:${m}`);
                          setScheduleError(null);
                        }}
                        className="flex items-center gap-1.5 px-3 py-3 rounded-xl text-[10px] font-black font-mono uppercase tracking-wider transition-all"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#9ca3af' }}
                      >
                        <Zap size={11} /> Now
                      </button>
                    </div>

                    {/* Schedule error alert */}
                    <AnimatePresence>
                      {scheduleError && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg"
                          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}
                        >
                          <AlertTriangle size={11} className="text-red-400 shrink-0" />
                          <span className="text-[10px] text-red-400 font-mono font-bold">{scheduleError}</span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Repeat Daily toggle */}
                    <div
                      onClick={() => setIsDaily(!isDaily)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all"
                      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <div
                        className="w-5 h-5 rounded-md flex items-center justify-center transition-all"
                        style={{
                          background: isDaily ? 'rgba(0,212,255,0.2)' : 'rgba(255,255,255,0.04)',
                          border: isDaily ? '1.5px solid #00d4ff' : '1.5px solid rgba(255,255,255,0.1)',
                        }}
                      >
                        {isDaily && <Check size={11} className="text-[#00d4ff]" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <Repeat size={11} className="text-gray-500" />
                          <span className="text-[10px] font-black text-gray-300 font-mono uppercase tracking-wider">Repeat Daily</span>
                        </div>
                        <span className="text-[8px] text-gray-600 font-mono">{isDaily ? 'Repeats every day' : 'One-time quest'}</span>
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Modal Footer — fixed at bottom */}
              <div className="px-5 py-4 border-t border-white/[0.05] flex justify-end gap-3 z-10 shrink-0" style={{ background: 'rgba(4,4,14,0.8)' }}>
                <button onClick={resetForm} className="px-5 py-2.5 text-xs font-mono font-bold text-gray-600 hover:text-white transition-colors rounded-xl hover:bg-white/5">
                  CANCEL
                </button>
                <button
                  id="tut-confirm-quest"
                  onClick={handleCreate}
                  disabled={!forgeResult || !title.trim()}
                  className="px-6 py-2.5 font-black rounded-xl text-xs font-mono transition-all disabled:cursor-not-allowed"
                  style={{
                    background: 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)',
                    color: '#000',
                    boxShadow: '0 0 20px rgba(0,212,255,0.25)',
                    opacity: (!forgeResult || !title.trim()) ? 0.4 : 1,
                  }}
                >
                  CONFIRM PROTOCOL
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </>}

    </div>
  );
};

export default QuestsView;
