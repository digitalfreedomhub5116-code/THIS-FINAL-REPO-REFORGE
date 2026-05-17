/**
 * ── DAILY DUNGEON ENGINE ──
 * Progressive overload system for the Sung Jin-woo Protocol.
 * Manages: target computation, progression, dungeon state initialization.
 *
 * RESEARCH BASIS (ACSM Guidelines):
 * - Start at 70% of user's self-reported max
 * - Increase by 8-10% every 3 days (progressive overload)
 * - Never exceed 2x starting point in first 30 days
 * - Reduce by 20% after a failure (deload)
 * - Running: follow the 10% rule for duration
 */

import { DungeonState, DungeonExerciseTarget, HealthProfile } from '../types';

// ── Constants ──
const STARTING_MULTIPLIER = 0.7;  // Start at 70% of reported max
const PROGRESSION_INCREMENT = 0.08; // 8% increase per cycle
const PROGRESSION_CYCLE_DAYS = 3;   // Increase every 3 days
const MAX_MULTIPLIER_30_DAYS = 1.4; // Cap at 140% (2x start = 2 * 0.7 = 1.4 of max)
const DELOAD_FACTOR = 0.8;          // Reduce 20% after failure
const DEFAULT_SETS = 3;             // Classic 3-set structure

// ── Helpers ──
function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function daysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return Math.floor(Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

// ── Compute targets from multiplier and baselines ──
export function computeTargets(
  baselinePushups: number,
  baselineSquats: number,
  baselineRunMinutes: number,
  multiplier: number,
  formCoachPushups: boolean = false,
  formCoachSquats: boolean = false,
): DungeonExerciseTarget[] {
  return [
    {
      exercise: 'PUSHUPS',
      sets: DEFAULT_SETS,
      reps: Math.max(3, Math.round(baselinePushups * multiplier)),
      formCoachEnabled: formCoachPushups,
    },
    {
      exercise: 'SQUATS',
      sets: DEFAULT_SETS,
      reps: Math.max(5, Math.round(baselineSquats * multiplier)),
      formCoachEnabled: formCoachSquats,
    },
    {
      exercise: 'RUNNING',
      sets: 1,
      reps: 0,
      durationMinutes: Math.max(1, Math.round(baselineRunMinutes * multiplier)),
      formCoachEnabled: false, // Running doesn't use form coach
    },
  ];
}

// ── Initialize a brand new dungeon state ──
export function createInitialDungeonState(profile: HealthProfile): DungeonState {
  const pushups = profile.baselinePushups || 15;
  const squats = profile.baselineSquats || 20;
  const runMin = profile.baselineRunMinutes || 5;

  return {
    currentDay: 1,
    startDate: Date.now(),
    lastCompletedDate: '',
    lastProgressionDate: todayStr(),
    consecutiveCompletions: 0,
    totalCompletions: 0,
    totalFailures: 0,
    targets: computeTargets(pushups, squats, runMin, STARTING_MULTIPLIER),
    baselinePushups: pushups,
    baselineSquats: squats,
    baselineRunMinutes: runMin,
    progressionMultiplier: STARTING_MULTIPLIER,
    history: [],
  };
}

// ── Get today's dungeon targets (may trigger progression) ──
export function getDungeonTargetsForToday(state: DungeonState): {
  targets: DungeonExerciseTarget[];
  updatedState: DungeonState;
  progressionTriggered: boolean;
} {
  const today = todayStr();
  let newState = { ...state };
  let progressionTriggered = false;

  // Check if it's time for progression (every 3 days of completions)
  const daysSinceLastProgression = state.lastProgressionDate
    ? daysBetween(state.lastProgressionDate, today)
    : 0;

  if (daysSinceLastProgression >= PROGRESSION_CYCLE_DAYS && state.consecutiveCompletions >= PROGRESSION_CYCLE_DAYS) {
    // Time for progression!
    const newMultiplier = Math.min(
      MAX_MULTIPLIER_30_DAYS,
      state.progressionMultiplier + PROGRESSION_INCREMENT
    );

    // Preserve form coach settings from current targets
    const currentFCPushups = state.targets.find(t => t.exercise === 'PUSHUPS')?.formCoachEnabled ?? false;
    const currentFCSquats = state.targets.find(t => t.exercise === 'SQUATS')?.formCoachEnabled ?? false;

    newState = {
      ...newState,
      progressionMultiplier: newMultiplier,
      lastProgressionDate: today,
      targets: computeTargets(
        state.baselinePushups,
        state.baselineSquats,
        state.baselineRunMinutes,
        newMultiplier,
        currentFCPushups,
        currentFCSquats
      ),
    };
    progressionTriggered = true;
  }

  return {
    targets: newState.targets,
    updatedState: newState,
    progressionTriggered,
  };
}

// ── Record dungeon completion ──
export function recordDungeonCompletion(state: DungeonState): DungeonState {
  const today = todayStr();
  const pushTarget = state.targets.find(t => t.exercise === 'PUSHUPS');
  const squatTarget = state.targets.find(t => t.exercise === 'SQUATS');
  const runTarget = state.targets.find(t => t.exercise === 'RUNNING');

  return {
    ...state,
    lastCompletedDate: today,
    consecutiveCompletions: state.consecutiveCompletions + 1,
    totalCompletions: state.totalCompletions + 1,
    currentDay: state.currentDay + 1,
    history: [
      ...state.history.slice(-29), // Keep last 30 entries
      {
        date: today,
        completed: true,
        pushupsTarget: pushTarget?.reps || 0,
        squatsTarget: squatTarget?.reps || 0,
        runMinutes: runTarget?.durationMinutes || 0,
      },
    ],
  };
}

// ── Record dungeon failure (triggers deload) ──
export function recordDungeonFailure(state: DungeonState): DungeonState {
  const today = todayStr();
  const deloadedMultiplier = Math.max(
    STARTING_MULTIPLIER,
    state.progressionMultiplier * DELOAD_FACTOR
  );

  // Preserve form coach settings
  const currentFCPushups = state.targets.find(t => t.exercise === 'PUSHUPS')?.formCoachEnabled ?? false;
  const currentFCSquats = state.targets.find(t => t.exercise === 'SQUATS')?.formCoachEnabled ?? false;

  return {
    ...state,
    lastCompletedDate: today,
    consecutiveCompletions: 0, // Reset streak
    totalFailures: state.totalFailures + 1,
    currentDay: state.currentDay + 1,
    progressionMultiplier: deloadedMultiplier,
    targets: computeTargets(
      state.baselinePushups,
      state.baselineSquats,
      state.baselineRunMinutes,
      deloadedMultiplier,
      currentFCPushups,
      currentFCSquats
    ),
    history: [
      ...state.history.slice(-29),
      {
        date: today,
        completed: false,
        pushupsTarget: state.targets.find(t => t.exercise === 'PUSHUPS')?.reps || 0,
        squatsTarget: state.targets.find(t => t.exercise === 'SQUATS')?.reps || 0,
        runMinutes: state.targets.find(t => t.exercise === 'RUNNING')?.durationMinutes || 0,
      },
    ],
  };
}

// ── Toggle form coach for a specific exercise ──
export function toggleFormCoach(state: DungeonState, exercise: 'PUSHUPS' | 'SQUATS'): DungeonState {
  return {
    ...state,
    targets: state.targets.map(t =>
      t.exercise === exercise ? { ...t, formCoachEnabled: !t.formCoachEnabled } : t
    ),
  };
}

// ── Check if dungeon was already completed today ──
export function isDungeonCompletedToday(state: DungeonState): boolean {
  return state.lastCompletedDate === todayStr();
}

// ── Build a WorkoutDay plan from dungeon targets ──
import { WorkoutDay } from '../types';

export function buildDungeonWorkoutPlan(targets: DungeonExerciseTarget[]): WorkoutDay {
  const exercises = targets.map(t => {
    if (t.exercise === 'RUNNING') {
      return {
        name: 'Running',
        sets: 1,
        reps: `${t.durationMinutes || 5} min`,
        duration: (t.durationMinutes || 5) * 60,
        completed: false,
        type: 'CARDIO' as const,
        notes: 'Sung Jin-woo Protocol — Run at a comfortable pace',
        formCoachEnabled: false,
      };
    }

    return {
      name: t.exercise === 'PUSHUPS' ? 'Push Ups' : 'Squats',
      sets: t.sets,
      reps: String(t.reps),
      duration: t.sets * 60,
      completed: false,
      type: 'COMPOUND' as const,
      notes: `Sung Jin-woo Protocol — ${t.reps} reps × ${t.sets} sets`,
      formCoachEnabled: t.formCoachEnabled,
    };
  });

  const totalDuration = exercises.reduce((sum, e) => sum + e.duration, 0) / 60;

  return {
    day: 'Daily Dungeon',
    focus: 'DAILY DUNGEON — Sung Jin-woo Protocol',
    exercises,
    totalDuration: Math.ceil(totalDuration),
  };
}

// ── Get progression tier label (for UI) ──
export function getProgressionTier(state: DungeonState): { label: string; color: string; level: number } {
  const mult = state.progressionMultiplier;
  if (mult <= 0.75) return { label: 'RECRUIT', color: '#6b7280', level: 1 };
  if (mult <= 0.85) return { label: 'SOLDIER', color: '#00d4ff', level: 2 };
  if (mult <= 0.95) return { label: 'WARRIOR', color: '#34d399', level: 3 };
  if (mult <= 1.10) return { label: 'KNIGHT', color: '#fbbf24', level: 4 };
  if (mult <= 1.25) return { label: 'COMMANDER', color: '#f97316', level: 5 };
  return { label: 'SHADOW MONARCH', color: '#a855f7', level: 6 };
}
