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
 * - Running: follow the 10% rule for distance
 */

import { DungeonState, DungeonExerciseTarget, HealthProfile } from '../types';

// ── Constants ──
const STARTING_MULTIPLIER = 0.7;  // Start at 70% of reported max
const PROGRESSION_INCREMENT = 0.08; // 8% increase per cycle
const PROGRESSION_CYCLE_DAYS = 3;   // Increase every 3 days
const MAX_MULTIPLIER_30_DAYS = 1.4; // Cap at 140% (2x start = 2 * 0.7 = 1.4 of max)
const DELOAD_FACTOR = 0.8;          // Reduce 20% after failure
const DEFAULT_SETS = 3;             // Classic 3-set structure
const KNEE_START_REPS = 8;
const KNEE_WEEKLY_INCREMENT = 3;
const KNEE_GRADUATION_DAYS = 21;
const POST_GRADUATION_PUSHUP_BASELINE = 4; // seeds ~10 reps once graduated to standard push-ups

// ── Helpers ──
function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function daysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return Math.floor(Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

// ── Compute targets from multiplier and baselines ──
export function computeTargets(
  baselinePushups: number,
  baselineSitups: number,
  baselineSquats: number,
  baselineRunKm: number,
  multiplier: number,
  formCoachPushups: boolean = true,
  formCoachSquats: boolean = true,
): DungeonExerciseTarget[] {
  return [
    {
      exercise: 'PUSHUPS',
      sets: 1,
      reps: Math.max(10, Math.round(baselinePushups * multiplier * 3)),
      formCoachEnabled: formCoachPushups,
    },
    {
      exercise: 'SITUPS',
      sets: 1,
      reps: Math.max(10, Math.round(baselineSitups * multiplier * 3)),
      formCoachEnabled: false, // Sit-ups do not use form coach
    },
    {
      exercise: 'SQUATS',
      sets: 1,
      reps: Math.max(15, Math.round(baselineSquats * multiplier * 3)),
      formCoachEnabled: formCoachSquats,
    },
    {
      exercise: 'RUNNING',
      sets: 1,
      reps: 0,
      distanceKm: Math.max(0.3, Math.round(baselineRunKm * multiplier * 10) / 10),
      formCoachEnabled: false, // Running doesn't use form coach
    },
  ];
}

// ── Knee push-up variant resolution ──
// Only affects users whose dungeon.pushupVariant === 'KNEE' (baseline push-ups = 0).
// Standard users are returned unchanged.
export function applyPushupVariant(state: DungeonState): DungeonState {
  if (state.pushupVariant !== 'KNEE') return state;
  const startMs = state.startDate || Date.now();
  const days = Math.max(0, Math.floor((Date.now() - startMs) / (1000 * 60 * 60 * 24)));

  // Graduate to standard push-ups after 3 weeks
  if (days >= KNEE_GRADUATION_DAYS) {
    const newBaseline = state.baselinePushups && state.baselinePushups > 0 ? state.baselinePushups : POST_GRADUATION_PUSHUP_BASELINE;
    const targets = state.targets.map(t =>
      t.exercise === 'PUSHUPS'
        ? { ...t, variant: 'STANDARD' as const, displayName: undefined, reps: Math.max(10, Math.round(newBaseline * state.progressionMultiplier * 3)), formCoachEnabled: true }
        : t
    );
    return { ...state, pushupVariant: 'STANDARD', baselinePushups: newBaseline, targets };
  }

  // Knee phase: 8 -> 11 -> 14 over weeks 0,1,2
  const week = Math.min(2, Math.floor(days / 7));
  const kneeReps = KNEE_START_REPS + week * KNEE_WEEKLY_INCREMENT;
  const targets = state.targets.map(t =>
    t.exercise === 'PUSHUPS'
      ? { ...t, variant: 'KNEE' as const, displayName: 'Knee Push Ups', reps: kneeReps, sets: 1, formCoachEnabled: true }
      : t
  );
  return { ...state, targets };
}

// ── Initialize a brand new dungeon state ──
export function createInitialDungeonState(profile: HealthProfile): DungeonState {
  const isKneeStart = profile.baselinePushups === 0;
  const pushups = isKneeStart ? 0 : (profile.baselinePushups || 15);
  const situps = profile.baselineSitups || 15;
  const squats = profile.baselineSquats || 20;
  // Migration: if baselineRunKm exists use it, else convert old minutes → km (approx 10min/km pace)
  const runKm = profile.baselineRunKm || (profile.baselineRunMinutes ? profile.baselineRunMinutes / 6 : 1.5);

  const initialState: DungeonState = {
    currentDay: 1,
    startDate: Date.now(),
    lastCompletedDate: '',
    lastProgressionDate: todayStr(),
    consecutiveCompletions: 0,
    totalCompletions: 0,
    totalFailures: 0,
    targets: computeTargets(pushups, situps, squats, runKm, STARTING_MULTIPLIER),
    baselinePushups: pushups,
    baselineSquats: squats,
    baselineSitups: situps,
    baselineRunKm: runKm,
    progressionMultiplier: STARTING_MULTIPLIER,
    history: [],
    pushupVariant: isKneeStart ? 'KNEE' : 'STANDARD',
  };
  return applyPushupVariant(initialState);
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
    const currentFCPushups = state.targets.find(t => t.exercise === 'PUSHUPS')?.formCoachEnabled ?? true;
    const currentFCSquats = state.targets.find(t => t.exercise === 'SQUATS')?.formCoachEnabled ?? true;

    newState = {
      ...newState,
      progressionMultiplier: newMultiplier,
      lastProgressionDate: today,
      targets: computeTargets(
        state.baselinePushups,
        state.baselineSitups || 15,
        state.baselineSquats,
        state.baselineRunKm,
        newMultiplier,
        currentFCPushups,
        currentFCSquats
      ),
    };
    progressionTriggered = true;
  }

  newState = applyPushupVariant(newState);

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
  const sitTarget = state.targets.find(t => t.exercise === 'SITUPS');
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
        situpsTarget: sitTarget?.reps || 0,
        squatsTarget: squatTarget?.reps || 0,
        runKm: runTarget?.distanceKm || 0,
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
  const currentFCPushups = state.targets.find(t => t.exercise === 'PUSHUPS')?.formCoachEnabled ?? true;
  const currentFCSquats = state.targets.find(t => t.exercise === 'SQUATS')?.formCoachEnabled ?? true;

  const deloaded: DungeonState = {
    ...state,
    lastCompletedDate: today,
    consecutiveCompletions: 0, // Reset streak
    totalFailures: state.totalFailures + 1,
    currentDay: state.currentDay + 1,
    progressionMultiplier: deloadedMultiplier,
    targets: computeTargets(
      state.baselinePushups,
      state.baselineSitups || 15,
      state.baselineSquats,
      state.baselineRunKm,
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
        situpsTarget: state.targets.find(t => t.exercise === 'SITUPS')?.reps || 0,
        squatsTarget: state.targets.find(t => t.exercise === 'SQUATS')?.reps || 0,
        runKm: state.targets.find(t => t.exercise === 'RUNNING')?.distanceKm || 0,
      },
    ],
  };
  return applyPushupVariant(deloaded);
}

// ── Toggle form coach for a specific exercise ──
export function toggleFormCoach(state: DungeonState, exercise: 'PUSHUPS' | 'SQUATS' | 'SITUPS'): DungeonState {
  return {
    ...state,
    targets: state.targets.map(t =>
      t.exercise === exercise ? { ...t, formCoachEnabled: !t.formCoachEnabled } : t
    ),
  };
}

// ── Check if dungeon was already completed today (ALL exercises done) ──
export function isDungeonCompletedToday(state: DungeonState): boolean {
  // New per-exercise tracking: all exercises (base + custom) must be
  // individually completed today.
  const today = todayStr();
  const completed = state.completedExercisesToday || {};
  const allBaseDone = state.targets.every(t => completed[t.exercise] === today);
  const allCustomDone = (state.customExercises || []).every(c => completed[c.id] === today);
  const allDone = allBaseDone && allCustomDone;
  // Fallback: also check the legacy lastCompletedDate, but only when there
  // are no custom exercises (custom exercises must be explicitly cleared).
  if ((state.customExercises || []).length > 0) return allDone;
  return allDone || state.lastCompletedDate === today;
}

// ── Check if a specific exercise is completed today ──
export function isExerciseCompletedToday(state: DungeonState, exercise: string): boolean {
  const today = todayStr();
  return (state.completedExercisesToday || {})[exercise] === today;
}

// ── Mark individual exercises as completed after workout ──
// Called when leaving dungeon mid-workout — marks only the exercises the user actually finished
export function recordExerciseCompletions(
  state: DungeonState,
  completedExercises: string[]
): DungeonState {
  const today = todayStr();
  const existing = { ...(state.completedExercisesToday || {}) };

  // Clear stale entries from previous days
  for (const key of Object.keys(existing)) {
    if (existing[key] !== today) delete existing[key];
  }

  // Mark the newly completed ones
  for (const ex of completedExercises) {
    existing[ex] = today;
  }

  const updatedState = { ...state, completedExercisesToday: existing };

  // If ALL exercises (base + custom) are now completed → trigger full dungeon completion
  const allBaseDone = state.targets.every(t => existing[t.exercise] === today);
  const allCustomDone = (state.customExercises || []).every(c => existing[c.id] === today);
  if (allBaseDone && allCustomDone && state.lastCompletedDate !== today) {
    return recordDungeonCompletion(updatedState);
  }

  return updatedState;
}

// ── Custom exercise management ──────────────────────────────────────────────

import { DungeonCustomExercise } from '../types';

/** Add a custom exercise to the dungeon (deduped by name, case-insensitive). */
export function addCustomDungeonExercise(
  state: DungeonState,
  exercise: Omit<DungeonCustomExercise, 'id' | 'addedAt'>
): DungeonState {
  const existing = state.customExercises || [];
  // Skip if an exercise with the same name is already present.
  if (existing.some(c => c.name.toLowerCase() === exercise.name.toLowerCase())) {
    return state;
  }
  const id = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const entry: DungeonCustomExercise = { ...exercise, id, addedAt: Date.now() };
  return { ...state, customExercises: [...existing, entry] };
}

/** Remove a custom exercise (and clear any completion record for it). */
export function removeCustomDungeonExercise(state: DungeonState, id: string): DungeonState {
  const customExercises = (state.customExercises || []).filter(c => c.id !== id);
  const completed = { ...(state.completedExercisesToday || {}) };
  delete completed[id];
  return { ...state, customExercises, completedExercisesToday: completed };
}

/** Map custom dungeon exercises → WorkoutDay exercises (for the player). */
export function buildCustomExercisesForPlan(custom: DungeonCustomExercise[]) {
  return custom.map(c => {
    if (c.type === 'CARDIO' && c.distanceKm) {
      return {
        id: c.id,
        name: c.name,
        sets: 1,
        reps: `${c.distanceKm} km`,
        duration: c.distanceKm * 6 * 60,
        completed: false,
        type: 'CARDIO' as const,
        notes: `Custom dungeon exercise — ${c.distanceKm} km`,
        formCoachEnabled: false,
        sensorRequirements: { distanceKm: c.distanceKm },
      } as any;
    }
    return {
      id: c.id,
      name: c.name,
      sets: c.sets,
      reps: c.reps,
      duration: c.sets * 60,
      completed: false,
      type: c.type,
      notes: `Custom dungeon exercise — ${c.reps} reps × ${c.sets} sets`,
      formCoachEnabled: false,
      videoUrl: c.videoUrl,
    };
  });
}

/**
 * Build the dungeon plan for the exercises NOT yet completed today, including
 * both base targets and custom exercises. Used on dungeon entry so the player
 * only trains what's left, and XP is granted per exercise actually completed.
 */
export function buildRemainingDungeonPlan(state: DungeonState): WorkoutDay {
  const today = todayStr();
  const completed = state.completedExercisesToday || {};

  const remainingBase = state.targets.filter(t => completed[t.exercise] !== today);
  const remainingCustom = (state.customExercises || []).filter(c => completed[c.id] !== today);

  // If somehow nothing is remaining, fall back to the full set.
  const baseTargets = remainingBase.length > 0 || remainingCustom.length > 0
    ? remainingBase
    : state.targets;
  const customTargets = remainingBase.length > 0 || remainingCustom.length > 0
    ? remainingCustom
    : (state.customExercises || []);

  const basePlan = buildDungeonWorkoutPlan(baseTargets);
  const customExercises = buildCustomExercisesForPlan(customTargets);

  const exercises = [...basePlan.exercises, ...customExercises];
  const totalDuration = exercises.reduce((sum, e) => sum + (e.duration || 0), 0) / 60;

  return {
    ...basePlan,
    exercises,
    totalDuration: Math.ceil(totalDuration),
  };
}

/** Names of all exercise completion-keys remaining today (base names + custom ids). */
export function getRemainingDungeonKeys(state: DungeonState): string[] {
  const today = todayStr();
  const completed = state.completedExercisesToday || {};
  const baseKeys = state.targets.filter(t => completed[t.exercise] !== today).map(t => t.exercise);
  const customKeys = (state.customExercises || []).filter(c => completed[c.id] !== today).map(c => c.id);
  return [...baseKeys, ...customKeys];
}

// ── Build a WorkoutDay plan from dungeon targets ──
import { WorkoutDay } from '../types';

export function buildDungeonWorkoutPlan(targets: DungeonExerciseTarget[]): WorkoutDay {
  const exercises = targets.map(t => {
    if (t.exercise === 'RUNNING') {
      return {
        name: 'Running',
        sets: 1,
        reps: `${t.distanceKm || 1} km`,
        duration: (t.distanceKm || 1) * 6 * 60, // Estimate ~6 min/km pace for timer fallback
        completed: false,
        type: 'CARDIO' as const,
        notes: `Sung Jin-woo Protocol — ${t.distanceKm || 1} km run`,
        formCoachEnabled: false,
        sensorRequirements: { distanceKm: t.distanceKm || 1 },
      };
    }

    const isPushups = t.exercise === 'PUSHUPS';
    const isSquats = t.exercise === 'SQUATS';
    const isSitups = t.exercise === 'SITUPS';
    let duration = t.sets * 60;
    if (isPushups || isSquats || isSitups) {
      duration = t.sets * Math.max(10, Math.ceil(t.reps * 1.5));
    }

    return {
      name: t.displayName ? t.displayName : (t.exercise === 'PUSHUPS' ? 'Push Ups' : t.exercise === 'SITUPS' ? 'Sit Ups' : 'Squats'),
      sets: t.sets,
      reps: String(t.reps),
      duration,
      completed: false,
      type: 'COMPOUND' as const,
      notes: (isPushups || isSquats || isSitups)
        ? `Sung Jin-woo Protocol — ${t.reps} reps`
        : `Sung Jin-woo Protocol — ${t.reps} reps × ${t.sets} sets`,
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

// ── Equipment-aware dungeon plan (used when entering from a fitness goal) ──
// Reuses the user's baseline reps so progression carries over across plans.
export type DungeonEquipment = 'GYM' | 'HOME_DUMBBELLS' | 'BODYWEIGHT';

export function buildDungeonWorkoutPlanForEquipment(
  state: DungeonState,
  equipment: DungeonEquipment
): WorkoutDay {
  // Bodyweight = the original Sung Jin-woo Protocol (no behaviour change)
  if (equipment === 'BODYWEIGHT') {
    return buildDungeonWorkoutPlan(state.targets);
  }

  const pushupTarget = state.targets.find(t => t.exercise === 'PUSHUPS');
  const situpTarget = state.targets.find(t => t.exercise === 'SITUPS');
  const squatTarget = state.targets.find(t => t.exercise === 'SQUATS');
  const runTarget = state.targets.find(t => t.exercise === 'RUNNING');

  const baseReps = pushupTarget?.reps || 10;
  const situpReps = situpTarget?.reps || 10;
  const squatReps = squatTarget?.reps || 12;
  const sets = pushupTarget?.sets || DEFAULT_SETS;
  const fcPushups = pushupTarget?.formCoachEnabled ?? true;
  const fcSquats = squatTarget?.formCoachEnabled ?? true;

  const isSingleSet = sets === 1;

  if (equipment === 'HOME_DUMBBELLS') {
    const pressDur = sets * Math.max(10, Math.ceil(baseReps * 1.5));
    const situpDur = sets * Math.max(10, Math.ceil(situpReps * 1.5));
    const squatDur = sets * Math.max(10, Math.ceil(squatReps * 1.5));
    const rowDur = isSingleSet ? Math.max(60, baseReps * 4) : sets * 60;

    const pressNotes = isSingleSet
      ? `Lie on floor, press dumbbells up — ${baseReps} reps`
      : `Lie on floor, press dumbbells up — ${baseReps} reps × ${sets} sets`;
    const situpNotes = isSingleSet
      ? `Feet flat on floor, curl torso up — ${situpReps} reps`
      : `Feet flat on floor, curl torso up — ${situpReps} reps × ${sets} sets`;
    const squatNotes = isSingleSet
      ? `Hold one dumbbell at chest — ${squatReps} reps`
      : `Hold one dumbbell at chest — ${squatReps} reps × ${sets} sets`;
    const rowNotes = isSingleSet
      ? `Hinge at hips, row dumbbells to ribs — ${baseReps} reps`
      : `Hinge at hips, row dumbbells to ribs — ${baseReps} reps × ${sets} sets`;

    const exercises = [
      {
        name: 'Dumbbell Floor Press',
        sets,
        reps: String(baseReps),
        duration: pressDur,
        completed: false,
        type: 'COMPOUND' as const,
        notes: pressNotes,
        formCoachEnabled: fcPushups,
      },
      {
        name: 'Sit Ups',
        sets,
        reps: String(situpReps),
        duration: situpDur,
        completed: false,
        type: 'COMPOUND' as const,
        notes: situpNotes,
        formCoachEnabled: false,
      },
      {
        name: 'Dumbbell Goblet Squats',
        sets,
        reps: String(squatReps),
        duration: squatDur,
        completed: false,
        type: 'COMPOUND' as const,
        notes: squatNotes,
        formCoachEnabled: fcSquats,
      },
      {
        name: 'Bent-Over Dumbbell Rows',
        sets,
        reps: String(baseReps),
        duration: rowDur,
        completed: false,
        type: 'COMPOUND' as const,
        notes: rowNotes,
        formCoachEnabled: false,
      },
      ...(runTarget ? [{
        name: 'Running',
        sets: 1,
        reps: `${runTarget.distanceKm || 1} km`,
        duration: (runTarget.distanceKm || 1) * 6 * 60,
        completed: false,
        type: 'CARDIO' as const,
        notes: `Cardio finisher — ${runTarget.distanceKm || 1} km`,
        formCoachEnabled: false,
        sensorRequirements: { distanceKm: runTarget.distanceKm || 1 },
      } as any] : []),
    ];

    const totalDuration = exercises.reduce((sum, e) => sum + e.duration, 0) / 60;

    return {
      day: 'Daily Dungeon',
      focus: 'DAILY DUNGEON — Dumbbell Protocol',
      exercises,
      totalDuration: Math.ceil(totalDuration),
    };
  }

  // GYM
  const squatGymReps = Math.max(5, Math.round(squatReps * 0.7));
  const pressGymReps = Math.max(5, Math.round(baseReps * 0.7));
  const rowGymReps = Math.max(8, baseReps);

  const pressDur = sets * Math.max(10, Math.ceil(pressGymReps * 1.5));
  const situpDur = sets * Math.max(10, Math.ceil(situpReps * 1.5));
  const squatDur = sets * Math.max(10, Math.ceil(squatGymReps * 1.5));
  const rowDur = isSingleSet ? Math.max(60, rowGymReps * 4) : sets * 60;

  const pressNotes = isSingleSet
    ? `Controlled tempo — ${pressGymReps} reps`
    : `Controlled tempo — ${pressGymReps} reps × ${sets} sets`;
  const situpNotes = isSingleSet
    ? `Feet flat on floor, curl torso up — ${situpReps} reps`
    : `Feet flat on floor, curl torso up — ${situpReps} reps × ${sets} sets`;
  const squatNotes = isSingleSet
    ? `Use a moderate weight — ${squatGymReps} reps`
    : `Use a moderate weight — ${squatGymReps} reps × ${sets} sets`;
  const rowNotes = isSingleSet
    ? `Wide grip — ${rowGymReps} reps`
    : `Wide grip — ${rowGymReps} reps × ${sets} sets`;

  const exercises = [
    {
      name: 'Barbell Bench Press',
      sets,
      reps: String(pressGymReps),
      duration: pressDur,
      completed: false,
      type: 'COMPOUND' as const,
      notes: pressNotes,
      formCoachEnabled: fcPushups,
    },
    {
      name: 'Sit Ups',
      sets,
      reps: String(situpReps),
      duration: situpDur,
      completed: false,
      type: 'COMPOUND' as const,
      notes: situpNotes,
      formCoachEnabled: false,
    },
    {
      name: 'Barbell Back Squats',
      sets,
      reps: String(squatGymReps),
      duration: squatDur,
      completed: false,
      type: 'COMPOUND' as const,
      notes: squatNotes,
      formCoachEnabled: fcSquats,
    },
    {
      name: 'Lat Pulldown',
      sets,
      reps: String(rowGymReps),
      duration: rowDur,
      completed: false,
      type: 'COMPOUND' as const,
      notes: rowNotes,
      formCoachEnabled: false,
    },
    ...(runTarget ? [{
      name: 'Treadmill Run',
      sets: 1,
      reps: `${runTarget.distanceKm || 1} km`,
      duration: (runTarget.distanceKm || 1) * 6 * 60,
      completed: false,
      type: 'CARDIO' as const,
      notes: `Cardio finisher — ${runTarget.distanceKm || 1} km`,
      formCoachEnabled: false,
      sensorRequirements: { distanceKm: runTarget.distanceKm || 1 },
    } as any] : []),
  ];

  const totalDuration = exercises.reduce((sum, e) => sum + e.duration, 0) / 60;

  return {
    day: 'Daily Dungeon',
    focus: 'DAILY DUNGEON — Gym Protocol',
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
