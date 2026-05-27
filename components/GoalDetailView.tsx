import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Calendar, Clock, Target, Flame, TrendingUp, Pause, Play, Trash2, Loader2, CheckCircle, Circle, AlertTriangle, ExternalLink, BookOpen, Youtube, Search, ChevronDown, ChevronUp, RefreshCw, CalendarOff, Zap } from 'lucide-react';
import { Goal, GoalDailyTask, GoalQuest, GoalQuestResource, PlayerData, Quest, Rank } from '../types';
import { playSystemSoundEffect } from '../utils/soundEngine';
import { API_BASE } from '../lib/apiConfig';
import { getPlayerAuthHeaders, authenticatedFetch } from '../lib/playerApi';
import { buildDungeonGoalQuest, buildDungeonGoalDailyTask } from '../lib/dungeonGoalQuest';

function addMins(time: string, mins: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(mins: number): string {
  const h = Math.floor(((mins % 1440) + 1440) % 1440 / 60);
  const m = ((mins % 60) + 60) % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Auto-schedules quests into free gaps between schedule blocks.
 * 
 * Fixes applied:
 * - Loophole 1: Bedtime hard cap (never schedule past bedtime)
 * - Loophole 2: Existing quests from other goals are treated as blocked intervals
 * - Loophole 3: Gaps already in the past are skipped
 * - Loophole 4: Manual quests with scheduledTime are treated as blocked intervals
 * - Loophole 8: Duration-fits-gap check (quest must FIT entirely in gap)
 * 
 * Returns quests with populated scheduledTime fields. 
 * Quests that can't fit anywhere remain without scheduledTime (flexible/unscheduled).
 */
function autoScheduleQuestsIntoGaps(
  quests: Quest[],
  scheduleProfile: any | null | undefined,
  existingSlots: any[] | undefined,
  existingQuests?: Quest[],
): Quest[] {
  if (!scheduleProfile && (!existingSlots || existingSlots.length === 0)) return quests;

  // Build blocked intervals from schedule
  const blocked: { start: number; end: number }[] = [];

  // Use existing slots or build from profile
  const slots = existingSlots?.length ? existingSlots : (() => {
    if (!scheduleProfile) return [];
    const s: any[] = [];
    const routineEnd = timeToMinutes(scheduleProfile.wakeUpTime) + (scheduleProfile.morningRoutineMin || 30);
    s.push({ start: timeToMinutes(scheduleProfile.wakeUpTime), end: routineEnd });

    if (scheduleProfile.role === 'STUDENT') {
      if (scheduleProfile.schoolStart && scheduleProfile.schoolEnd) {
        s.push({ start: timeToMinutes(scheduleProfile.schoolStart), end: timeToMinutes(scheduleProfile.schoolEnd) });
      }
      if (scheduleProfile.coachingEnabled && scheduleProfile.coachingStart && scheduleProfile.coachingEnd) {
        s.push({ start: timeToMinutes(scheduleProfile.coachingStart), end: timeToMinutes(scheduleProfile.coachingEnd) });
      }
    } else if (scheduleProfile.role === 'PROFESSIONAL' && scheduleProfile.workStart && scheduleProfile.workEnd) {
      s.push({ start: timeToMinutes(scheduleProfile.workStart), end: timeToMinutes(scheduleProfile.workEnd) });
    }

    s.push({ start: timeToMinutes(scheduleProfile.dinnerTime), end: timeToMinutes(scheduleProfile.dinnerTime) + 30 });
    s.push({ start: timeToMinutes(scheduleProfile.bedtime) - (scheduleProfile.windDownMinutes || 30), end: timeToMinutes(scheduleProfile.bedtime) + 1 });
    return s;
  })();

  slots.forEach((slot: any) => {
    const start = typeof slot.start === 'number' ? slot.start : (slot.startTime ? timeToMinutes(slot.startTime) : 0);
    const end = typeof slot.end === 'number' ? slot.end : (slot.endTime ? timeToMinutes(slot.endTime) : 0);
    if (start && end) blocked.push({ start, end });
  });

  // FIX Loophole 2 & 4: Add existing quests (from other goals + manual) as blocked intervals
  if (existingQuests?.length) {
    existingQuests.forEach(q => {
      if (!q.scheduledTime || q.isCompleted || q.failed) return;
      const timeStr = q.scheduledTime.includes('T')
        ? q.scheduledTime.split('T')[1].slice(0, 5)
        : q.scheduledTime;
      const start = timeToMinutes(timeStr);
      const end = start + (q.estimatedDuration || 20);
      blocked.push({ start, end });
    });
  }

  blocked.sort((a, b) => a.start - b.start);

  // Merge overlapping blocked intervals
  const mergedBlocked: { start: number; end: number }[] = [];
  for (const b of blocked) {
    const last = mergedBlocked[mergedBlocked.length - 1];
    if (last && b.start <= last.end) {
      last.end = Math.max(last.end, b.end);
    } else {
      mergedBlocked.push({ ...b });
    }
  }

  // Find free gaps (between wake-up and bedtime)
  const wakeUp = scheduleProfile?.wakeUpTime ? timeToMinutes(scheduleProfile.wakeUpTime) : 480;
  const bedtime = scheduleProfile?.bedtime ? timeToMinutes(scheduleProfile.bedtime) : 1380;

  // FIX Loophole 3: Skip past-time slots
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const effectiveStart = Math.max(wakeUp, currentMinutes + 5); // at least 5 min from now

  const gaps: { start: number; end: number }[] = [];
  let cursor = effectiveStart;

  for (const block of mergedBlocked) {
    if (block.end <= cursor) continue; // entirely in the past
    if (block.start > cursor) {
      const gapEnd = Math.min(block.start, bedtime); // FIX Loophole 1: cap at bedtime
      const gapDuration = gapEnd - cursor;
      if (gapDuration >= 15) {
        gaps.push({ start: cursor, end: gapEnd });
      }
    }
    cursor = Math.max(cursor, block.end);
  }

  // Final gap until bedtime (FIX Loophole 1)
  if (cursor < bedtime) {
    gaps.push({ start: cursor, end: bedtime });
  }

  // Assign quests to gaps (first-fit with FIX Loophole 8: duration must fit)
  let gapIdx = 0;
  let gapCursor = gaps.length > 0 ? gaps[0].start : effectiveStart;

  return quests.map(quest => {
    if (quest.scheduledTime) return quest; // already has a time

    const duration = quest.estimatedDuration || 20;
    const BUFFER = 5; // 5 min buffer between quests

    // Find a gap where the ENTIRE quest duration fits
    while (gapIdx < gaps.length) {
      const gap = gaps[gapIdx];
      const availableInGap = gap.end - gapCursor;

      // FIX Loophole 8: Check if full duration fits, not just start time
      if (availableInGap >= duration) {
        // FIX Loophole 1: Ensure quest end doesn't exceed bedtime
        if (gapCursor + duration > bedtime) {
          // Can't fit before bedtime — leave unscheduled
          return quest;
        }

        const scheduledTime = minutesToTime(gapCursor);
        gapCursor += duration + BUFFER;

        // If buffer pushes past gap end, move to next gap
        if (gapCursor >= gap.end && gapIdx + 1 < gaps.length) {
          gapIdx++;
          gapCursor = gaps[gapIdx].start;
        }

        return { ...quest, scheduledTime: `${scheduledTime}` };
      }
      gapIdx++;
      if (gapIdx < gaps.length) gapCursor = gaps[gapIdx].start;
    }

    // No gap available — leave unscheduled (flexible) instead of placing past bedtime
    // FIX Loophole 1: Previously it would place quests after the last cursor regardless
    return quest;
  });
}

const RANK_COLORS: Record<string, string> = {
  E: '#9ca3af', D: '#fb923c', C: '#facc15', B: '#4ade80', A: '#00d4ff', S: '#33dfff',
  UNRANKED: '#6b7280',
};

// ── Module-level quest generation store (survives tab switches / component remounts) ──
// Sanitize raw errors into user-friendly messages
function friendlyError(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes('fetch') || lower.includes('network') || lower.includes('failed to fetch') || lower.includes('aborted'))
    return 'Connection lost. Check your internet and try again.';
  if (lower.includes('timeout') || lower.includes('timed out'))
    return 'Server took too long to respond. Try again in a moment.';
  if (lower.includes('429') || lower.includes('rate limit') || lower.includes('too many'))
    return 'Too many requests. Wait a moment before trying again.';
  if (lower.includes('500') || lower.includes('internal server'))
    return 'Server error. Our systems are recovering — try again shortly.';
  if (lower.includes('502') || lower.includes('503') || lower.includes('bad gateway') || lower.includes('unavailable'))
    return 'Server is temporarily unavailable. Please try again in a few seconds.';
  if (lower.includes('401') || lower.includes('unauthorized') || lower.includes('auth'))
    return 'Session expired. Please refresh the page and try again.';
  if (lower.includes('json') || lower.includes('parse') || lower.includes('unexpected token'))
    return 'Received an unexpected response. Try again.';
  if (raw.length < 200 && !raw.includes('Error:') && !raw.includes('at ') && !/\d{3}/.test(raw))
    return raw;
  return 'Something went wrong. Please try again.';
}

interface QuestGenStore {
  state: 'IDLE' | 'GENERATING' | 'DONE' | 'ERROR';
  goalId: string | null;
  todayTasks: GoalDailyTask | null;
  error: string | null;
  // Deferred actions: queued data that needs to be applied when component remounts
  pendingGoalUpdate: Goal | null;
  pendingFeedQuests: Quest[];
  pendingScheduleSlots: any[];
}

const _questGenStore: QuestGenStore = {
  state: 'IDLE',
  goalId: null,
  todayTasks: null,
  error: null,
  pendingGoalUpdate: null,
  pendingFeedQuests: [],
  pendingScheduleSlots: [],
};

// Multi-listener system: both GoalDetailView and App.tsx can listen for updates
const _questGenListeners = new Set<(s: QuestGenStore) => void>();

export function onQuestGenStoreUpdate(cb: (s: QuestGenStore) => void): () => void {
  _questGenListeners.add(cb);
  return () => { _questGenListeners.delete(cb); };
}

export function getQuestGenStore(): QuestGenStore {
  return { ..._questGenStore };
}

function updateQuestGenStore(patch: Partial<QuestGenStore>) {
  Object.assign(_questGenStore, patch);
  const snapshot = { ..._questGenStore };
  _questGenListeners.forEach(cb => cb(snapshot));
}

// Module-level fetch — runs independently of component lifecycle
export function startQuestGeneration(params: {
  goal: Goal;
  allGoals: Goal[];
  playerData?: PlayerData;
  todayStr: string;
  currentDay: number;
  existingQuests?: Quest[]; // All currently scheduled quests (for gap awareness)
}) {
  const { goal, allGoals, playerData, todayStr, currentDay, existingQuests } = params;

  if (_questGenStore.state === 'GENERATING') return; // already in-flight

  // FIX Loophole 6: Rest day check (skip if user chose NONE)
  const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  if (goal.weeklyRestDay && goal.weeklyRestDay !== 'NONE' && goal.weeklyRestDay.toLowerCase() === dayOfWeek.toLowerCase()) {
    updateQuestGenStore({
      state: 'ERROR',
      goalId: goal.id,
      todayTasks: null,
      error: `Today is your rest day (${goal.weeklyRestDay}). Take a break — quests resume tomorrow!`,
      pendingGoalUpdate: null,
      pendingFeedQuests: [],
      pendingScheduleSlots: [],
    });
    return;
  }

  updateQuestGenStore({ state: 'GENERATING', goalId: goal.id, todayTasks: null, error: null, pendingGoalUpdate: null, pendingFeedQuests: [], pendingScheduleSlots: [] });

  // ── FITNESS GOAL SHORT-CIRCUIT ──
  // For fitness goals, skip the AI entirely and synthesize a single "Enter Today's Dungeon" quest.
  // This connects fitness goals to the daily dungeon flow (no key cost).
  if (goal.category === 'FITNESS' as any) {
    const currentTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
    const dungeonQuest = buildDungeonGoalQuest({ goal, todayStr, currentTime });
    const newDailyTask = buildDungeonGoalDailyTask({ goal, todayStr, dayNumber: currentDay, currentTime });

    const updatedGoal: Goal = {
      ...goal,
      dailyTasks: [...(goal.dailyTasks || []).filter(t => t.date !== todayStr), newDailyTask],
    };

    const scheduleSlots = dungeonQuest.scheduledTime ? [{
      id: `sched-quest-${dungeonQuest.id}`,
      startTime: dungeonQuest.scheduledTime,
      endTime: addMins(dungeonQuest.scheduledTime, dungeonQuest.estimatedDuration || 30),
      type: 'WORKOUT' as const,
      label: dungeonQuest.title,
      questId: dungeonQuest.id,
      goalId: goal.id,
      status: 'PENDING' as const,
      isFlexible: true,
      isCarryOver: false,
      notifyEnabled: true,
    }] : [];

    updateQuestGenStore({
      state: 'DONE',
      todayTasks: newDailyTask,
      error: null,
      pendingGoalUpdate: updatedGoal,
      pendingFeedQuests: [dungeonQuest],
      pendingScheduleSlots: scheduleSlots,
    });
    playSystemSoundEffect('PURCHASE');
    return;
  }

  const otherGoalTasksToday = allGoals
    .filter(g => g.id !== goal.id && g.status === 'ACTIVE')
    .flatMap(g => g.dailyTasks?.find(t => t.date === todayStr)?.quests || [])
    .map(q => q.title)
    .join(', ');

  const otherGoalsMinutes = allGoals
    .filter(g => g.id !== goal.id && g.status === 'ACTIVE')
    .reduce((sum, g) => sum + (g.dailyCommitmentMin || 0), 0);

  const remainingMinutes = Math.max(30, (playerData?.healthProfile?.sessionDuration ?? 120) - otherGoalsMinutes);
  const recentTasks = (goal.dailyTasks || []).slice(-7);

  authenticatedFetch(`${API_BASE}/api/goals/daily-quests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getPlayerAuthHeaders() },
    body: JSON.stringify({
      goal,
      recentTasks,
      playerStats: playerData?.stats,
      otherGoalTasksToday: otherGoalTasksToday || 'None',
      remainingMinutes,
      dayOfWeek: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
      userCountry: playerData?.country || 'India',
      userLanguage: 'English',
      scheduleProfile: playerData?.scheduleProfile || null,
      currentTime: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }),
    }),
  })
    .then(async res => {
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || 'Server error');
      }
      return res.json();
    })
    .then(data => {
      const newDailyTask: GoalDailyTask = {
        id: `dt-${goal.id}-${todayStr}`,
        goalId: goal.id,
        date: todayStr,
        dayNumber: currentDay,
        quests: data.quests || [],
        completedCount: 0,
        totalCount: (data.quests || []).length,
        dailyNote: data.dailyNote || '',
        progressUpdate: data.progressUpdate || '',
        createdAt: Date.now(),
      };

      // Build the updated goal
      const updatedGoal: Goal = {
        ...goal,
        dailyTasks: [...(goal.dailyTasks || []).filter(t => t.date !== todayStr), newDailyTask],
      };

      // Build feed quests
      const rawFeedQuests: Quest[] = (data.quests || []).map((gq: any, i: number) => ({
        id: gq.id || `goal-quest-${goal.id}-${Date.now()}-${i}`,
        title: gq.title,
        description: gq.reasoning || `Goal quest for: ${goal.title}`,
        rank: (gq.rank || 'D') as Rank,
        priority: 'MEDIUM' as any,
        category: (gq.categories?.[0] || 'intelligence') as any,
        categories: gq.categories,
        xpReward: Math.round((gq.xp || 50) * 1.5),
        isCompleted: false,
        createdAt: Date.now(),
        isDaily: true,
        estimatedDuration: gq.estimatedDuration,
        aiReasoning: gq.reasoning,
        goalId: goal.id,
        goalTitle: goal.title,
        goalQuestResources: gq.resources || [],
        goalQuestSteps: gq.stepByStep || [],
        connectionToPrevious: gq.connectionToPrevious,
        scheduledTime: gq.scheduledTime || undefined,
      }));

      // Auto-schedule quests into free gaps between schedule blocks
      const today = new Date().toISOString().split('T')[0];
      const existingDailySlots = (playerData as any)?.dailySchedules
        ?.find((s: any) => s.date === today)?.slots;
      const feedQuests = autoScheduleQuestsIntoGaps(
        rawFeedQuests,
        playerData?.scheduleProfile,
        existingDailySlots,
        existingQuests, // FIX Loophole 2 & 4: pass all existing quests as blocked intervals
      );

      // Build schedule slots from quests that have scheduled times
      const scheduleSlots = feedQuests
        .filter(q => q.scheduledTime)
        .map(q => ({
          id: `sched-quest-${q.id}`,
          startTime: q.scheduledTime!,
          endTime: addMins(q.scheduledTime!, q.estimatedDuration || 20),
          type: 'QUEST' as const,
          label: q.title,
          questId: q.id,
          goalId: goal.id,
          status: 'PENDING' as const,
          isFlexible: true,
          isCarryOver: false,
          notifyEnabled: true,
        }));

      updateQuestGenStore({
        state: 'DONE',
        todayTasks: newDailyTask,
        error: null,
        pendingGoalUpdate: updatedGoal,
        pendingFeedQuests: feedQuests,
        pendingScheduleSlots: scheduleSlots,
      });

      playSystemSoundEffect('PURCHASE');
    })
    .catch((err: any) => {
      console.error('[GoalDetail] Failed to generate daily quests:', err);
      updateQuestGenStore({
        state: 'ERROR',
        error: friendlyError(err.message || 'Failed to generate quests. Please try again.'),
      });
    });
}

// Collapsible text component
function ReadMore({ text, maxLines = 3 }: { text: string; maxLines?: number }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > maxLines * 80;
  return (
    <div>
      <p className={`text-[13px] text-gray-400 font-mono leading-relaxed ${!expanded && isLong ? 'line-clamp-3' : ''}`}>{text}</p>
      {isLong && (
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 mt-1 text-[11px] text-[#00d4ff] font-mono">
          {expanded ? <><ChevronUp className="w-3 h-3" /> Show less</> : <><ChevronDown className="w-3 h-3" /> Read more</>}
        </button>
      )}
    </div>
  );
}

interface GoalDetailViewProps {
  goal: Goal;
  playerData?: PlayerData;
  allGoals: Goal[];
  existingQuests?: Quest[]; // All current quests for gap-aware scheduling
  onBack: () => void;
  onUpdateGoal: (updatedGoal: Goal) => void;
  onDeleteGoal: (goalId: string) => void;
  onAddQuestToFeed?: (quest: Quest) => void;
  onUpdateScheduleSlots?: (slots: any[]) => void;
}

export default function GoalDetailView({
  goal,
  playerData,
  allGoals,
  existingQuests,
  onBack,
  onUpdateGoal,
  onDeleteGoal,
  onAddQuestToFeed,
  onUpdateScheduleSlots,
}: GoalDetailViewProps) {
  // Sync state from module-level store
  const [genStore, setGenStore] = useState<QuestGenStore>(() => ({ ..._questGenStore }));
  const isGenerating = genStore.state === 'GENERATING' && genStore.goalId === goal.id;
  const generateError = genStore.state === 'ERROR' && genStore.goalId === goal.id ? genStore.error : null;

  const [todayTasks, setTodayTasks] = useState<GoalDailyTask | null>(null);
  const [showConfirmAbandon, setShowConfirmAbandon] = useState(false);
  const [showRestDayPicker, setShowRestDayPicker] = useState(false);

  const rankColor = RANK_COLORS[goal.goalRank] || RANK_COLORS.D;
  const goalStartTime = goal.startDate || goal.createdAt || Date.now();
  const currentDay = Math.max(1, Math.floor((Date.now() - goalStartTime) / (1000 * 60 * 60 * 24)) + 1);
  const totalDays = goal.totalDurationDays || 1;
  const daysRemaining = Math.max(0, totalDays - currentDay);
  const progress = Math.min(100, Math.round((currentDay / totalDays) * 100));

  const currentMilestone = goal.milestones?.find(m => currentDay >= m.startDay && currentDay <= m.endDay);

  const todayStr = new Date().toISOString().split('T')[0];

  // Register live-update callback so in-flight fetches update this mounted component
  useEffect(() => {
    const unsub = onQuestGenStoreUpdate((s) => setGenStore(s));
    // Sync on mount in case generation completed while unmounted
    setGenStore({ ..._questGenStore });
    return unsub;
  }, []);

  // Check if today's tasks already exist in goal data
  useEffect(() => {
    const existing = goal.dailyTasks?.find(t => t.date === todayStr);
    if (existing) setTodayTasks(existing);
  }, [goal.dailyTasks, todayStr]);

  // Apply pending deferred actions when component (re)mounts or store updates
  useEffect(() => {
    if (genStore.state === 'DONE' && genStore.goalId === goal.id && genStore.todayTasks) {
      // Set local display
      setTodayTasks(genStore.todayTasks);

      // Apply deferred goal update
      if (genStore.pendingGoalUpdate) {
        onUpdateGoal(genStore.pendingGoalUpdate);
      }

      // Apply deferred feed quest injection
      if (onAddQuestToFeed && genStore.pendingFeedQuests.length > 0) {
        genStore.pendingFeedQuests.forEach(q => onAddQuestToFeed(q));
      }

      // Apply deferred schedule slot injection
      if (onUpdateScheduleSlots && genStore.pendingScheduleSlots.length > 0) {
        onUpdateScheduleSlots(genStore.pendingScheduleSlots);
      }

      // Clear pending actions (already applied)
      updateQuestGenStore({ pendingGoalUpdate: null, pendingFeedQuests: [], pendingScheduleSlots: [] });
    }
  }, [genStore.state, genStore.goalId, goal.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Trigger generation
  const generateDailyQuests = useCallback(() => {
    startQuestGeneration({ goal, allGoals, playerData, todayStr, currentDay, existingQuests });
  }, [goal, allGoals, playerData, todayStr, currentDay, existingQuests]);

  // Toggle quest completion
  const toggleQuestComplete = useCallback((questId: string) => {
    if (!todayTasks) return;

    // Check if this quest is being completed (was not completed before)
    const originalQuest = todayTasks.quests.find(q => q.id === questId);
    const isBeingCompleted = originalQuest && !originalQuest.completed;

    const updatedQuests = todayTasks.quests.map(q =>
      q.id === questId ? { ...q, completed: !q.completed } : q
    );
    const completedCount = updatedQuests.filter(q => q.completed).length;

    const updatedDailyTask = { ...todayTasks, quests: updatedQuests, completedCount };
    setTodayTasks(updatedDailyTask);

    // Update streak
    const allCompleted = completedCount === updatedQuests.length;
    const newStreak = allCompleted ? goal.streak + 1 : goal.streak;

    const updatedGoal = {
      ...goal,
      streak: newStreak,
      dailyTasks: [...(goal.dailyTasks || []).filter(t => t.date !== todayStr), updatedDailyTask],
    };
    onUpdateGoal(updatedGoal);

    // ── CRITICAL: Dispatch event to grant XP, stats, and gold ──
    // Goal quests live in a separate data structure from player.quests.
    // Without this event, completing goal quests never awards any rewards,
    // dailyXp stays 0, dailyStats stay empty, and the Growth Terminal graph never grows.
    if (isBeingCompleted && originalQuest) {
      window.dispatchEvent(new CustomEvent('goal-quest:completed', {
        detail: {
          id: originalQuest.id,
          title: originalQuest.title,
          xp: originalQuest.xp || 50,
          category: originalQuest.categories?.[0] || 'discipline',
          rank: originalQuest.rank || 'E',
          goalId: goal.id,
          goalTitle: goal.title,
        }
      }));
    }

    if (allCompleted) {
      playSystemSoundEffect('PURCHASE');
    } else {
      playSystemSoundEffect('SYSTEM');
    }
  }, [todayTasks, goal, todayStr, onUpdateGoal]);

  // Pause/Resume
  const togglePause = useCallback(() => {
    const newStatus = goal.status === 'PAUSED' ? 'ACTIVE' : 'PAUSED';
    onUpdateGoal({ ...goal, status: newStatus as any });
    playSystemSoundEffect('SYSTEM');
  }, [goal, onUpdateGoal]);

  return (
    <div className="min-h-screen pb-24" style={{ background: '#07070d' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 px-4 pb-3" style={{ background: '#07070d', paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}>
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-xl hover:bg-white/5">
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-white truncate">{goal.title}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] font-black px-2 py-0.5 rounded" style={{ background: `${rankColor}20`, color: rankColor }}>
                {goal.goalRank}-RANK
              </span>
              <span className="text-[11px] text-gray-500 font-mono">{goal.category}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-4">
        {/* Progress */}
        <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${rankColor}15` }}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-mono text-gray-500">DAY {currentDay} OF {totalDays}</span>
            <span className="text-xs font-mono font-bold" style={{ color: rankColor }}>{progress}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-white/5 overflow-hidden mb-3">
            <motion.div
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${rankColor}88, ${rankColor})` }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
          <div className="grid grid-cols-4 gap-2">
            <div className="text-center">
              <div className="text-sm font-bold text-white">{daysRemaining}</div>
              <div className="text-[10px] text-gray-600 font-mono">DAYS LEFT</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-bold text-white">{goal.dailyCommitmentMin}m</div>
              <div className="text-[10px] text-gray-600 font-mono">DAILY</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-bold" style={{ color: '#fb923c' }}>{goal.streak}</div>
              <div className="text-[10px] text-gray-600 font-mono">STREAK</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-bold" style={{ color: rankColor }}>{goal.successProbability}%</div>
              <div className="text-[10px] text-gray-600 font-mono">ODDS</div>
            </div>
          </div>
        </div>

        {/* Rest Day Setting — hidden for system goals */}
        {!goal.isSystemGoal && (
        <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(129,140,248,0.08)' }}>
          <button
            onClick={() => setShowRestDayPicker(!showRestDayPicker)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <CalendarOff className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">Rest Day</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold" style={{ color: goal.weeklyRestDay === 'NONE' ? '#f87171' : '#a5b4fc' }}>
                {goal.weeklyRestDay === 'NONE' ? 'None' : goal.weeklyRestDay || 'Sunday'}
              </span>
              {showRestDayPicker ? <ChevronUp className="w-3 h-3 text-gray-600" /> : <ChevronDown className="w-3 h-3 text-gray-600" />}
            </div>
          </button>
          <AnimatePresence>
            {showRestDayPicker && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 overflow-hidden"
              >
                <div className="flex flex-wrap gap-1.5">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
                    const isSelected = (goal.weeklyRestDay || 'Sunday') === day;
                    return (
                      <button
                        key={day}
                        onClick={() => {
                          onUpdateGoal({ ...goal, weeklyRestDay: day });
                          playSystemSoundEffect('SYSTEM');
                        }}
                        className="px-2.5 py-1.5 rounded-lg text-[9px] font-black font-mono uppercase tracking-wide transition-all"
                        style={{
                          background: isSelected ? 'rgba(129,140,248,0.15)' : 'rgba(255,255,255,0.02)',
                          border: `1px solid ${isSelected ? 'rgba(129,140,248,0.4)' : 'rgba(255,255,255,0.06)'}`,
                          color: isSelected ? '#a5b4fc' : '#6b7280',
                        }}
                      >
                        {day.slice(0, 3)}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => {
                      onUpdateGoal({ ...goal, weeklyRestDay: 'NONE' });
                      playSystemSoundEffect('SYSTEM');
                    }}
                    className="px-2.5 py-1.5 rounded-lg text-[9px] font-black font-mono uppercase tracking-wide transition-all"
                    style={{
                      background: goal.weeklyRestDay === 'NONE' ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${goal.weeklyRestDay === 'NONE' ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.06)'}`,
                      color: goal.weeklyRestDay === 'NONE' ? '#f87171' : '#6b7280',
                    }}
                  >
                    None
                  </button>
                </div>
                <p className="text-[8px] text-gray-600 font-mono mt-2">
                  {goal.weeklyRestDay === 'NONE' ? 'No rest day — quests generated every day.' : `Light/no quests on ${goal.weeklyRestDay || 'Sunday'}s.`}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        )}

        {/* Today's Quests */}
        <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-mono text-gray-500 uppercase tracking-wider">Today's Mission Tasks</h3>
            {todayTasks && (
              <span className="text-[11px] font-mono" style={{ color: rankColor }}>
                {todayTasks.completedCount}/{todayTasks.totalCount}
              </span>
            )}
          </div>

          {!todayTasks && !isGenerating && (
            <button
              onClick={generateDailyQuests}
              className="w-full py-3.5 rounded-xl text-xs font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all active:scale-95"
              style={{
                background: 'rgba(0,212,255,0.08)',
                border: '1px solid rgba(0,212,255,0.25)',
                color: '#33dfff',
                boxShadow: '0 0 20px rgba(0,212,255,0.08)',
              }}
            >
              <Zap className="w-4 h-4" />
              Generate Today's Quests
            </button>
          )}

          {isGenerating && (
            <div className="flex items-center justify-center py-6 gap-2">
              <Loader2 className="w-5 h-5 text-[#00d4ff] animate-spin" />
              <span className="text-xs text-gray-400 font-mono">Generating resource-rich quests with AI...</span>
            </div>
          )}

          {generateError && !isGenerating && !todayTasks && (
            <div className="rounded-xl p-3 mb-2" style={{ background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.15)' }}>
              <div className="flex items-start gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-[#00d4ff] flex-shrink-0 mt-0.5" />
                <p className="text-[12px] text-gray-300 font-mono leading-relaxed">{generateError}</p>
              </div>
              <button
                onClick={generateDailyQuests}
                className="w-full py-2.5 rounded-lg text-xs font-black uppercase tracking-[0.15em] mt-1 flex items-center justify-center gap-2 transition-all active:scale-95"
                style={{
                  background: 'rgba(0,212,255,0.08)',
                  border: '1px solid rgba(0,212,255,0.2)',
                  color: '#00d4ff',
                }}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry Generation
              </button>
            </div>
          )}

          {todayTasks && (
            <div className="space-y-2">
              {todayTasks.dailyNote && (
                <div className="rounded-lg p-3 mb-2" style={{ background: 'rgba(34,211,238,0.04)', border: '1px solid rgba(34,211,238,0.08)' }}>
                  <p className="text-[13px] text-[#33dfff] font-mono leading-relaxed">{todayTasks.dailyNote}</p>
                </div>
              )}
              <p className="text-[11px] text-gray-600 font-mono">Quests have been added to your main quest feed.</p>
              {todayTasks.progressUpdate && (
                <div className="text-xs text-gray-600 font-mono text-center mt-2">{todayTasks.progressUpdate}</div>
              )}
              {/* Note about user control */}
              <p className="text-[9px] text-gray-700 font-mono text-center mt-2">
                Tap the time on any quest in the timeline to reschedule it.
              </p>
            </div>
          )}
        </div>

        {/* Milestones */}
        <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <h3 className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-3">Mission Phases</h3>
          <div className="space-y-2">
            {(goal.milestones || []).map((m) => {
              const isActive = currentMilestone?.phase === m.phase;
              const isDone = currentDay > m.endDay;
              return (
                <div
                  key={m.phase}
                  className="rounded-xl p-3"
                  style={{
                    background: isActive ? `${rankColor}08` : 'rgba(255,255,255,0.02)',
                    border: isActive ? `1px solid ${rankColor}20` : '1px solid rgba(255,255,255,0.03)',
                  }}
                >
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black flex-shrink-0"
                      style={{
                        background: isDone ? 'rgba(34,197,94,0.15)' : isActive ? `${rankColor}20` : 'rgba(255,255,255,0.05)',
                        color: isDone ? '#4ade80' : isActive ? rankColor : '#6b7280',
                      }}
                    >
                      {isDone ? '✓' : m.phase}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-[13px] font-semibold ${isDone ? 'text-gray-500' : isActive ? 'text-white' : 'text-gray-400'}`}>
                        {m.title}
                      </div>
                      <div className="text-[11px] text-gray-600 font-mono">
                        Day {m.startDay}–{m.endDay} • {m.targetOutcome}
                      </div>
                    </div>
                  </div>
                  {isActive && m.sampleDailyPattern && (
                    <div className="ml-9 mt-1.5 space-y-0.5">
                      {m.sampleDailyPattern.map((t, i) => (
                        <div key={i} className="text-[11px] text-gray-500 font-mono flex items-start gap-1">
                          <span className="text-cyan-600">•</span> {t}
                        </div>
                      ))}
                    </div>
                  )}
                  {m.connectionToNext && isActive && (
                    <div className="ml-9 mt-1 text-[11px] text-gray-600 font-mono italic">
                      → {m.connectionToNext}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Reasoning */}
        {goal.reasoning && (
          <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <h3 className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-2">AI Analysis</h3>
            <ReadMore text={goal.reasoning} />
            {goal.smartDurationReasoning && (
              <div className="mt-2 pt-2 border-t border-white/5">
                <ReadMore text={goal.smartDurationReasoning} />
              </div>
            )}
          </div>
        )}

        {/* Risk Factors */}
        {goal.riskFactors?.length > 0 && (
          <div className="rounded-2xl p-4" style={{ background: 'rgba(251,191,36,0.03)', border: '1px solid rgba(251,191,36,0.08)' }}>
            <h3 className="text-xs font-mono text-amber-400 uppercase tracking-wider mb-2">Risk Factors</h3>
            {goal.riskFactors.map((r, i) => (
              <div key={i} className="text-[12px] text-gray-400 font-mono flex items-start gap-1.5 mb-1.5">
                <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" /> {r}
              </div>
            ))}
          </div>
        )}

        {/* Actions — hidden for system goals */}
        {!goal.isSystemGoal && (
        <div className="flex gap-2 pb-4">
          <button
            onClick={togglePause}
            className="flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5"
            style={{ background: 'rgba(255,255,255,0.05)', color: goal.status === 'PAUSED' ? '#4ade80' : '#facc15' }}
          >
            {goal.status === 'PAUSED' ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            {goal.status === 'PAUSED' ? 'Resume' : 'Pause'}
          </button>
          <button
            onClick={() => setShowConfirmAbandon(true)}
            className="flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5"
            style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444' }}
          >
            <Trash2 className="w-4 h-4" /> Abandon
          </button>
        </div>
        )}

        {/* Abandon Confirmation */}
        <AnimatePresence>
          {showConfirmAbandon && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[99999] flex items-center justify-center px-6"
              style={{ background: 'rgba(0,0,0,0.8)' }}
              onClick={() => setShowConfirmAbandon(false)}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                className="rounded-2xl p-5 max-w-sm w-full"
                style={{ background: '#111118', border: '1px solid rgba(239,68,68,0.2)' }}
                onClick={e => e.stopPropagation()}
              >
                <h3 className="text-base font-bold text-red-400 mb-2">Abandon Mission?</h3>
                <p className="text-[13px] text-gray-400 font-mono mb-4">
                  This will permanently end this goal. Your progress will be lost and you'll lose 50 gold as a penalty.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowConfirmAbandon(false)}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold text-gray-300"
                    style={{ background: 'rgba(255,255,255,0.05)' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      onDeleteGoal(goal.id);
                      playSystemSoundEffect('WARNING');
                    }}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white"
                    style={{ background: 'rgba(239,68,68,0.3)' }}
                  >
                    Abandon (−50 Gold)
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
