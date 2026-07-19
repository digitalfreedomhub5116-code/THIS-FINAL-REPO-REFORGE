
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, X, AlertOctagon, Check, Activity, Film, Timer as TimerIcon, ChevronRight, Zap, Clock, Dumbbell, Camera, MapPin, Navigation } from 'lucide-react';
import { EXERCISE_VIDEOS, getExerciseVideoUrl, fixVideoPath } from '../lib/exerciseVideos';
import { WorkoutDay, FormCoachSession } from '../types';
import { SpeechService } from '../utils/speechService';
import { playSystemSoundEffect } from '../utils/soundEngine';
import { useSystem, isEmbed, isLocalUser } from '../hooks/useSystem';
import { findFormCoachExercise } from '../lib/formCoachConfig';
import type { FormCoachState } from '../utils/poseEngine';
import FormCoachOverlay from './FormCoachOverlay';
import FormCoachSummary from './FormCoachSummary';
import { useSensors } from '../hooks/useSensors';
import { API_BASE } from '../lib/apiConfig';
import { authFetch } from '../lib/auth';

/** Check if an exercise is rep-based (not time-based like "5 min" or "30s") */
const isRepBasedExercise = (reps: string, type: string): boolean => {
  if (type === 'CARDIO' || type === 'STRETCH') return false;
  const lower = reps?.toLowerCase()?.trim() || '';
  if (!lower) return false;
  if (lower.includes('min') || lower.includes('sec') || /\d+s\b/.test(lower)) return false;
  // Strip common suffixes: "10 each", "12 per side", "15 reps"
  const cleaned = lower.replace(/\b(each|per side|per leg|reps)\b/gi, '').trim();
  // Match pure numbers like "12" or comma-separated like "15, 15, 12"
  const parts = cleaned.split(/[,\s]+/).filter(Boolean);
  return parts.length > 0 && parts.every(p => /^\d+$/.test(p));
};

interface ActiveWorkoutPlayerProps {
  plan: WorkoutDay;
  onComplete: (exercisesCompleted: number, totalExercises: number, results: Record<string, number>, anomalyPoints?: number, formCoachBonusXp?: number, formCoachSession?: FormCoachSession) => void;
  onFail: () => void;
  streak: number;
  savedSession?: SavedWorkoutSession | null;
}

export interface SavedWorkoutSession {
  currentIdx: number;
  currentSet: number;
  timeLeft: number;
  phase: 'WORK' | 'REST';
  results: Record<string, number>;
  anomalyPoints: number;
  planDay: string;
  timestamp: number;
}

// ── Set Timer Presets (user-selectable) ──
const SET_TIMER_OPTIONS = [45, 60, 75, 90] as const;
type SetTimerValue = typeof SET_TIMER_OPTIONS[number];

const getSetTimerKey = (userId: string) => `reforge_set_timer_${userId || 'local'}`;
const getWorkoutSessionKey = (userId: string) => `reforge_active_workout_${userId || 'local'}`;

const loadSetTimer = (userId: string): SetTimerValue => {
  try {
    const v = parseInt(localStorage.getItem(getSetTimerKey(userId)) || '', 10);
    if (SET_TIMER_OPTIONS.includes(v as any)) return v as SetTimerValue;
  } catch {}
  return 60; // Default: 60s
};

const saveSetTimer = (v: SetTimerValue, userId: string) => {
  try { localStorage.setItem(getSetTimerKey(userId), String(v)); } catch {}
};

// Dynamic rest duration based on exercise type, intensity, and user timer preference
const getIntraSetRest = (type: string, timerSec: number, isSupplementary?: boolean): number => {
  if (isSupplementary) return 15;
  if (type === 'STRETCH') return 15;
  if (type === 'CARDIO') return 20;
  return 70; // 70s rest between sets for all main exercises
};

const getInterExerciseRest = (prevType: string, timerSec: number, nextIsSupplementary?: boolean, prevIsSupplementary?: boolean): number => {
  if (nextIsSupplementary || prevIsSupplementary) return 15;
  if (prevType === 'STRETCH') return 15;
  if (prevType === 'CARDIO') return 30;
  return 90; // 90s rest between exercises for all main exercises
};

export const saveWorkoutSession = (session: SavedWorkoutSession, userId: string) => {
  try { localStorage.setItem(getWorkoutSessionKey(userId), JSON.stringify(session)); } catch(e) {}
};

export const loadWorkoutSession = (userId: string): SavedWorkoutSession | null => {
  try {
    const raw = localStorage.getItem(getWorkoutSessionKey(userId));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch(e) { return null; }
};

export const clearWorkoutSession = (userId: string) => {
  try { localStorage.removeItem(getWorkoutSessionKey(userId)); } catch(e) {}
};

// Helper to parse the number of reps from a string (e.g., "15", "12, 10, 8", "3 x 8")
const parseRepsCount = (repsStr: string, setIndex: number): number => {
  const lower = repsStr?.toLowerCase()?.trim() || '';
  if (!lower) return 10;
  
  // Check for pattern "X x Y" (e.g. "3 x 8" or "3x8")
  const xPattern = lower.match(/(\d+)\s*x\s*(\d+)/);
  if (xPattern) {
    return parseInt(xPattern[2], 10);
  }
  
  // Clean up common words
  const cleaned = lower.replace(/\b(each|per side|per leg|reps)\b/gi, '').trim();
  const parts = cleaned.split(/[,\s]+/).filter(Boolean);
  
  if (parts.length === 0) return 10;
  
  const idx = Math.min(setIndex, parts.length - 1);
  const val = parseInt(parts[idx], 10);
  return isNaN(val) ? 10 : val;
};

const loadRepPace = (userId: string): number => {
  try {
    const v = parseFloat(localStorage.getItem(`reforge_rep_pace_${userId || 'local'}`) || '');
    if (!isNaN(v) && v > 0) return v;
  } catch {}
  return 1.5; // Default: 1.5s per rep
};

const saveRepPace = (v: number, userId: string) => {
  try { localStorage.setItem(`reforge_rep_pace_${userId || 'local'}`, String(v)); } catch {}
};

// Helper to parse duration from reps string (e.g., "5 min" -> 300, "30s" -> 30)
const getExerciseDuration = (reps: string, name?: string, setIndex: number = 0, repPace: number = 1.5): number => {
  if (!reps) return 60;
  const lower = reps.toLowerCase();
  
  // Minutes (e.g., "5 min", "10 mins")
  if (lower.includes('min')) {
    const match = lower.match(/(\d+)\s*min/);
    if (match) return parseInt(match[1], 10) * 60;
  }
  
  // Seconds (e.g., "30s", "45 sec", "60 seconds")
  if (lower.includes('sec') || lower.match(/\d+s\b/)) {
     const match = lower.match(/(\d+)/); // Grab first number
     if (match) return parseInt(match[1], 10);
  }
  
  // KM (e.g., "1.5 km", "2 km")
  if (lower.includes('km')) {
    const match = lower.match(/([\d.]+)\s*km/);
    if (match) return Math.ceil(parseFloat(match[1]) * 6) * 60; // ~6 min/km pace estimate
  }
  
  // Rep-based exercises: Squats, Push-ups and Sit-ups take repPace seconds per rep
  const lowerName = name?.toLowerCase() || '';
  const isSquat = lowerName.includes('squat');
  const isPushup = lowerName.includes('pushup') || lowerName.includes('push-up') || lowerName.includes('push up');
  const isSitup = lowerName.includes('situp') || lowerName.includes('sit-up') || lowerName.includes('sit ups') || lowerName.includes('sit-ups');
  
  if (isSquat || isPushup || isSitup) {
    const repCount = parseRepsCount(reps, setIndex);
    return Math.max(10, Math.ceil(repCount * repPace));
  }
  
  return 60; // fallback default
};

const ActiveWorkoutPlayer: React.FC<ActiveWorkoutPlayerProps> = ({ plan, onComplete, onFail, savedSession }) => {
  const { player } = useSystem();
  
  // --- SET TIMER PREFERENCE ---
  const [setTimerSec, setSetTimerSec] = useState<SetTimerValue>(() => loadSetTimer(player.userId || 'local'));
  const [repPace, setRepPace] = useState<number>(() => loadRepPace(player.userId || 'local'));
  const [showTimerPicker, setShowTimerPicker] = useState(false);
  const [pendingTimer, setPendingTimer] = useState<SetTimerValue | null>(null);
  
  // --- STATE ---
  const [currentIdx, setCurrentIdx] = useState(savedSession?.currentIdx ?? 0);
  const [currentSet, setCurrentSet] = useState(savedSession?.currentSet ?? 1);
  
  // Initialize timer based on first exercise or saved session
  const [timeLeft, setTimeLeft] = useState(() => {
      if (savedSession) return savedSession.timeLeft;
      const initialRepPace = loadRepPace(player.userId || 'local');
      return plan.exercises.length > 0 ? getExerciseDuration(plan.exercises[0].reps, plan.exercises[0].name, 0, initialRepPace) : setTimerSec;
  });

  const [phase, setPhase] = useState<'WORK' | 'REST'>(savedSession?.phase ?? 'WORK');
  const [isPaused, setIsPaused] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [results, setResults] = useState<Record<string, number>>(savedSession?.results ?? {});

  // --- ANTI-CHEAT ---
  const [anomalyPoints, setAnomalyPoints] = useState(savedSession?.anomalyPoints ?? 0);

  // Guard: once workout completes, stop persisting session to localStorage
  const completedRef = useRef(false);
  const [phaseStartTime, setPhaseStartTime] = useState(Date.now());

  // --- FORM COACH STATE ---
  const [formCoachState, setFormCoachState] = useState<FormCoachState | null>(null);
  const lastFormCoachStateRef = useRef<FormCoachState | null>(null);
  const initialExercise = plan.exercises[savedSession?.currentIdx ?? 0] || plan.exercises[0];
  const shouldStartCamera = initialExercise?.formCoachEnabled && !!findFormCoachExercise(initialExercise.name);

  // Sub-phase for form coach exercises: PREVIEW (video full-screen) -> TRACKING (camera + PiP)
  const [formCoachSubPhase, setFormCoachSubPhase] = useState<'PREVIEW' | 'TRACKING' | null>(
    shouldStartCamera ? (savedSession?.phase === 'REST' ? 'PREVIEW' : 'TRACKING') : null
  );
  // User-selectable tracking mode: TIMER (default, classic) vs CAMERA (AI rep counting)
  const [trackingMode, setTrackingMode] = useState<'TIMER' | 'CAMERA'>(
    shouldStartCamera ? 'CAMERA' : 'TIMER'
  );
  // Accumulated form coach data across the entire workout
  const formCoachAccumRef = useRef<{
    exercises: Map<string, { scores: number[]; totalReps: number; sets: number }>;
    totalBonusXp: number;
    perfectSets: number;
  }>({ exercises: new Map(), totalBonusXp: 0, perfectSets: 0 });

  // Derived Data
  const exercise = plan.exercises[currentIdx] || plan.exercises[0];
  const totalExercises = plan.exercises.length;

  // ── SENSOR TRACKING for Running Exercises (GPS + Steps hybrid) ──
  const sensorReqs = (exercise as any)?.sensorRequirements as { distanceKm?: number } | undefined;
  const isRunningExercise = !!sensorReqs?.distanceKm;
  const { startTracking, stopTracking, finalizeTracking, clearStoredSession, snapshot: sensorSnapshot, tracking: sensorTracking, requestPermissions } = useSensors(player.userId || 'local');
  const sensorStartedRef = useRef(false);
  // Unique-per-entry questId so the next dungeon run never resumes leftover
  // distance/steps from an earlier session in localStorage.
  const runQuestIdRef = useRef<string>(`dungeon-run-${Date.now()}`);

  // Step-based distance estimation: ~0.7m per step for running, ~0.65m for walking
  const stepEstimatedKm = (sensorSnapshot?.stepsRecorded || 0) * 0.0007; // 0.7m per step
  // Best distance = whichever is higher between GPS and step-estimated
  const bestDistanceKm = Math.max(sensorSnapshot?.distanceRecorded || 0, stepEstimatedKm);

  // Auto-start tracking when a running exercise becomes active.
  // Fresh-start every time so the bar always begins at 0 km.
  useEffect(() => {
    if (isRunningExercise && phase === 'WORK' && !sensorStartedRef.current) {
      sensorStartedRef.current = true;
      // Generate a fresh questId for this entry so even cross-day localStorage
      // entries can't leak in (defence in depth alongside freshStart).
      runQuestIdRef.current = `dungeon-run-${Date.now()}`;
      const qid = runQuestIdRef.current;
      const targetKm = sensorReqs?.distanceKm;
      (async () => {
        try {
          // Belt-and-suspenders: clear any legacy 'dungeon-run' key from older
          // builds that hardcoded that questId.
          clearStoredSession('dungeon-run');
          await requestPermissions();
          await startTracking(qid, { distanceKm: targetKm }, { freshStart: true });
        } catch (err) {
          console.warn('[ActiveWorkout] Sensor start failed:', err);
          // Allow re-entry: the user can quit and resume; never crash.
          sensorStartedRef.current = false;
        }
      })();
    }
    // Reset flag when moving away from running exercise
    if (!isRunningExercise) {
      sensorStartedRef.current = false;
    }
  }, [isRunningExercise, phase, currentIdx, requestPermissions, startTracking, clearStoredSession, sensorReqs?.distanceKm]);

  // Auto-complete running exercise when distance target is met.
  // Gate on `sensorTracking` so we never fire from a stale snapshot before
  // the new session has actually started — that race used to crash the app.
  const runAutoCompleteRef = useRef(false);
  useEffect(() => {
    if (!isRunningExercise || !sensorTracking || !sensorSnapshot || runAutoCompleteRef.current) return;
    const targetKm = sensorReqs?.distanceKm || 1;
    if (bestDistanceKm >= targetKm) {
      runAutoCompleteRef.current = true;
      const qid = runQuestIdRef.current;
      (async () => {
        try {
          await stopTracking();
        } catch { /* ignore */ }
        try {
          finalizeTracking(qid);
        } catch { /* ignore */ }
        completeSet();
      })();
    }
  }, [bestDistanceKm, isRunningExercise, sensorTracking, sensorSnapshot, sensorReqs?.distanceKm, stopTracking, finalizeTracking]);

  // On unmount: STOP tracking AND clear the stored session — nothing about a
  // half-finished run should bleed into the next entry.
  useEffect(() => {
    return () => {
      const qid = runQuestIdRef.current;
      if (sensorStartedRef.current) {
        stopTracking().catch(() => { /* ignore */ });
        // Clear the unique-per-entry session so the next dungeon entry starts
        // at zero distance even if the user quits mid-run.
        try { finalizeTracking(qid); } catch { /* ignore */ }
        try { clearStoredSession(qid); } catch { /* ignore */ }
      }
      // Also wipe the legacy hardcoded key for older app installs.
      try { clearStoredSession('dungeon-run'); } catch { /* ignore */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-detect if current exercise should use Form Coach (rep-based + has config)
  // NOTE: Premium gate temporarily removed for testing — all users can use Form Coach
  const formCoachConfig = React.useMemo(() => {
    if (!exercise) return null;
    if (!isRepBasedExercise(exercise.reps, exercise.type)) return null;
    return findFormCoachExercise(exercise.name);
  }, [exercise?.name, exercise?.reps, exercise?.type]);
  const isFormCoachActive = !!formCoachConfig && phase === 'WORK' && trackingMode === 'CAMERA' && formCoachSubPhase === 'TRACKING';
  
  // Robust Video Lookup Strategy (checks EXERCISE_VIDEOS map → DB → exercise.videoUrl → focusVideos)
  const videoSource = React.useMemo(() => {
      if (!exercise) return null;
      
      const name = exercise.name;
      const lowerName = name.toLowerCase();

      // 1. Dedicated video map (case-insensitive) - LOCAL BUNDLED SOURCE OF TRUTH
      const mapUrl = getExerciseVideoUrl(name);
      if (mapUrl) return mapUrl;
      
      // 2. Exercise database from backend (if user adds custom ones without bundling)
      const dbEntry = player.exerciseDatabase.find(e => e.name === name || e.name.toLowerCase() === lowerName);
      if (dbEntry?.videoUrl) return fixVideoPath(dbEntry.videoUrl);

      // 3. Direct videoUrl on exercise object (legacy cache in plans)
      if (exercise.videoUrl && exercise.videoUrl.trim() !== '') return fixVideoPath(exercise.videoUrl);

      // 4. Focus videos from player state
      if (player.focusVideos[name]) return fixVideoPath(player.focusVideos[name]);
      const looseKey = Object.keys(player.focusVideos).find(k => k.toLowerCase() === lowerName);
      if (looseKey) return fixVideoPath(player.focusVideos[looseKey]);

      return null;
  }, [exercise, player.focusVideos, player.exerciseDatabase]);

  // Check if we are in the "Up Next" preview window (last 5 seconds of rest)
  const isUpNextPreview = phase === 'REST' && timeLeft <= 5 && timeLeft > 0;

  // ── Background preload next exercise video ──────────────────────────────────
  const nextVideoSource = React.useMemo(() => {
    const nextIdx = currentIdx + 1;
    if (nextIdx >= totalExercises) return null;
    const nextEx = plan.exercises[nextIdx];
    if (!nextEx) return null;
    if (EXERCISE_VIDEOS[nextEx.name]) return EXERCISE_VIDEOS[nextEx.name];
    
    const dbEntry = player.exerciseDatabase.find(e => e.name.toLowerCase() === nextEx.name.toLowerCase());
    if (dbEntry?.videoUrl) return fixVideoPath(dbEntry.videoUrl);

    if (nextEx.videoUrl && nextEx.videoUrl.trim() !== '') return fixVideoPath(nextEx.videoUrl);
    
    return null;
  }, [currentIdx, totalExercises, plan.exercises, player.exerciseDatabase]);

  useEffect(() => {
    if (!nextVideoSource) return;
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'video';
    link.href = nextVideoSource;
    link.type = 'video/mp4';
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, [nextVideoSource]);

  // --- LOGIC ---

  // Initial Announcement
  useEffect(() => {
    if (plan.exercises.length > 0) {
        const first = plan.exercises[0];
        SpeechService.announceStart(first.name, first.sets, first.reps);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // PREVIEW → TRACKING auto-transition (4 seconds)
  useEffect(() => {
    if (formCoachSubPhase !== 'PREVIEW') return;
    const timer = setTimeout(() => {
      setFormCoachSubPhase('TRACKING');
    }, 4000);
    return () => clearTimeout(timer);
  }, [formCoachSubPhase]);

  const startNextSet = useCallback(() => {
      playSystemSoundEffect('SYSTEM');
      
      const nextSet = currentSet + 1;
      
      setPhase('WORK');
      setPhaseStartTime(Date.now());
      setCurrentSet(nextSet);
      setFormCoachState(null); // Reset for fresh tracking
      
      // Dynamic Duration Calculation based on current exercise
      const currentEx = plan.exercises[currentIdx] || plan.exercises[0];
      const duration = getExerciseDuration(currentEx.reps, currentEx.name, nextSet - 1, repPace);
      setTimeLeft(duration);

      // Form Coach: preserve user's tracking mode preference across sets
      // Switch to CAMERA for new exercises if enabled by default
      if (nextSet === 1) {
        if (currentEx.formCoachEnabled && !!findFormCoachExercise(currentEx.name)) {
          setTrackingMode('CAMERA');
          setFormCoachSubPhase('PREVIEW');
        } else {
          setTrackingMode('TIMER');
          setFormCoachSubPhase(null);
        }
      } else {
        // If user has camera on, keep it going for subsequent sets
        if (trackingMode === 'CAMERA') {
          setFormCoachSubPhase('TRACKING');
        }
      }

      // AI Voice Logic
      if (nextSet === 1) {
          SpeechService.announceStart(currentEx.name, currentEx.sets, currentEx.reps);
      } else {
          SpeechService.announceSetStart(nextSet);
      }
  }, [currentSet, currentIdx, plan.exercises, trackingMode, repPace]);

  const handleExerciseComplete = useCallback(() => {
    if (currentIdx < totalExercises - 1) {
      // Transition to Next Exercise
      const prevEx = plan.exercises[currentIdx];
      const nextEx = plan.exercises[currentIdx + 1];
      const restDuration = getInterExerciseRest(prevEx.type, setTimerSec, nextEx?.isSupplementary, prevEx?.isSupplementary);
      
      // Announce Rest immediately
      SpeechService.announceRest(restDuration);
      
      setPhase('REST');
      setPhaseStartTime(Date.now());
      setTimeLeft(restDuration);
      
      // Advance Index immediately so "Up Next" shows correct info
      setCurrentIdx(prev => prev + 1);
      // Reset set count to 0 so we know we are between exercises
      setCurrentSet(0); 
    } else {
      completedRef.current = true;
      clearWorkoutSession(player.userId || 'local');
      SpeechService.announceVictory();
      playSystemSoundEffect('LEVEL_UP');

      // Build FormCoachSession from accumulated data
      const accum = formCoachAccumRef.current;
      let formSession: FormCoachSession | undefined;
      if (accum.exercises.size > 0) {
        const exerciseEntries = Array.from(accum.exercises.entries()).map(([name, data]) => ({
          name,
          avgFormScore: data.scores.length > 0 ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length) : 100,
          totalReps: data.totalReps,
          sets: data.sets,
        }));
        const overallScore = exerciseEntries.length > 0
          ? Math.round(exerciseEntries.reduce((a, e) => a + e.avgFormScore, 0) / exerciseEntries.length)
          : 100;
        formSession = {
          date: new Date().toISOString().split('T')[0],
          timestamp: Date.now(),
          exercises: exerciseEntries,
          overallScore,
          totalBonusXp: accum.totalBonusXp,
          perfectSets: accum.perfectSets,
        };
      }

      onComplete(totalExercises, totalExercises, results, anomalyPoints, accum.totalBonusXp, formSession);
    }
  }, [currentIdx, totalExercises, onComplete, results, anomalyPoints, plan.exercises]);

  const completeSet = useCallback(() => {
      playSystemSoundEffect('SUCCESS');

      // --- ANTI-CHEAT: Check if set was completed too fast (before 70% of duration) ---
      // Skip the time check entirely when the user has a legitimate non-time
      // completion source:
      //   1. CAMERA mode + AI Coach counted >= target reps — reps are the truth.
      //   2. Running exercises auto-completed by GPS/step distance target.
      //   3. Supplementary exercises (already exempt below).
      const targetReps = parseInt(exercise.reps) || 0;
      const aiHitTarget = trackingMode === 'CAMERA'
        && !!formCoachConfig
        && targetReps > 0
        && (lastFormCoachStateRef.current?.repCount ?? formCoachState?.repCount ?? 0) >= targetReps;
      const isRunningAuto = !!(exercise as any)?.sensorRequirements?.distanceKm;
      const skipTimeAnomaly = aiHitTarget || isRunningAuto;

      if (!exercise.isSupplementary && !skipTimeAnomaly) {
        const totalDuration = getExerciseDuration(exercise.reps, exercise.name, currentSet - 1, repPace);
        const elapsedMs = Date.now() - phaseStartTime;
        const elapsedSec = elapsedMs / 1000;
        const threshold = totalDuration * 0.7;

        if (elapsedSec < threshold && totalDuration > 10) {
          setAnomalyPoints(prev => prev + 1);
        }
      }
      
      setResults(prev => ({...prev, [`${exercise.name}_set${currentSet}`]: 1 }));
      
      // --- FORM COACH: Accumulate set data for final summary ---
      if (lastFormCoachStateRef.current && lastFormCoachStateRef.current.repResults.length > 0) {
        const fcState = lastFormCoachStateRef.current;
        const accum = formCoachAccumRef.current;
        const existing = accum.exercises.get(exercise.name) || { scores: [], totalReps: 0, sets: 0 };
        existing.scores.push(fcState.formScore);
        existing.totalReps += fcState.repCount;
        existing.sets += 1;
        accum.exercises.set(exercise.name, existing);

        // Calculate XP bonus for this set
        let setBonus = 0;
        if (fcState.formScore >= 90) { setBonus = 20; accum.perfectSets++; }
        else if (fcState.formScore >= 75) setBonus = 10;
        else if (fcState.formScore >= 50) setBonus = 5;
        accum.totalBonusXp += setBonus;

        // Clear for next set
        lastFormCoachStateRef.current = null;
      }
      
      if (currentSet < exercise.sets) {
        // Transition to Next Set (Same Exercise)
        const restDuration = getIntraSetRest(exercise.type, setTimerSec, exercise.isSupplementary);
        setPhase('REST');
        setPhaseStartTime(Date.now());
        setTimeLeft(restDuration);
        // Announce form score if Form Coach was active
        if (lastFormCoachStateRef.current && lastFormCoachStateRef.current.repResults.length > 0) {
          SpeechService.announceFormScore(lastFormCoachStateRef.current.formScore);
        } else {
          SpeechService.announceRest(restDuration);
        }
      } else {
        handleExerciseComplete();
      }
  }, [currentSet, exercise?.sets, exercise?.name, exercise?.reps, exercise?.type, exercise?.isSupplementary, handleExerciseComplete, phaseStartTime, trackingMode, formCoachConfig, formCoachState?.repCount, repPace]);

  const handleTimerComplete = useCallback(() => {
    if (phase === 'WORK') {
      completeSet();
    } else {
      startNextSet();
    }
  }, [phase, completeSet, startNextSet]);

  // Auto-complete set when AI rep count reaches target (camera mode only)
  const autoCompleteRef = useRef(false);
  useEffect(() => {
    if (trackingMode !== 'CAMERA' || !formCoachState || phase !== 'WORK') {
      autoCompleteRef.current = false;
      return;
    }
    const targetReps = parseInt(exercise.reps) || 0;
    if (targetReps > 0 && formCoachState.repCount >= targetReps && !autoCompleteRef.current) {
      autoCompleteRef.current = true;
      playSystemSoundEffect('SYSTEM');
      // Small delay so user sees the final rep count (reduced from 1200ms
      // since the RepDetector now freezes at the target — no more drift)
      const timer = setTimeout(() => {
        completeSet();
        autoCompleteRef.current = false;
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [formCoachState?.repCount, trackingMode, phase, exercise.reps, completeSet]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    // Pause timer when camera tracking is active (reps counted by AI instead)
    const timerPaused = isPaused || (phase === 'WORK' && trackingMode === 'CAMERA' && formCoachSubPhase === 'TRACKING' && !!formCoachConfig);
    if (!timerPaused && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          const next = prev - 1;
          // Calculate max duration for halfway point based on current exercise
          const curEx = plan.exercises[currentIdx] || plan.exercises[0];
          const maxDuration = phase === 'WORK' ? getExerciseDuration(curEx.reps, curEx.name, currentSet - 1, repPace) : getInterExerciseRest(curEx.type, setTimerSec, curEx.isSupplementary);
          if (phase === 'WORK' && next === Math.floor(maxDuration / 2)) SpeechService.announceHalfway();
          if (next <= 3 && next > 0) playSystemSoundEffect('TICK');
          return next;
        });
      }, 1000);
    } else if (timeLeft === 0 && !isPaused) {
      handleTimerComplete();
    }
    return () => clearInterval(interval);
  }, [timeLeft, isPaused, phase, handleTimerComplete, currentIdx, plan.exercises, trackingMode, formCoachSubPhase, formCoachConfig, repPace]);

  // --- SESSION PERSISTENCE: Save state whenever key values change ---
  // Skip saving once workout has been completed (prevents re-save after clear)
  useEffect(() => {
    if (completedRef.current) return;
    saveWorkoutSession({
      currentIdx,
      currentSet,
      timeLeft,
      phase,
      results,
      anomalyPoints,
      planDay: plan.day,
      timestamp: Date.now(),
    }, player.userId || 'local');
  }, [currentIdx, currentSet, timeLeft, phase, results, anomalyPoints, plan.day, player.userId]);

  const confirmQuit = () => {
    // Clear the saved session so there's no resume prompt later
    clearWorkoutSession(player.userId || 'local');
    // Notify server: this counts as a missed-workout day for the penalty cron
    const userId = player.userId;
    if (userId && !isLocalUser(userId)) {
      authFetch(`${API_BASE}/api/workout/quit-dungeon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }).catch(() => { /* offline — cron will still detect via missing last_workout_date */ });
    }
    onFail();
  };

  // --- UI CONSTANTS ---
  const isSupplementaryExercise = exercise?.isSupplementary;
  const progressPercent = totalExercises > 0 ? (currentIdx / totalExercises) * 100 : 0;
  
  // FIXED: Ultra-Strict safe calculation for array generation to prevent RangeError
  // 1. Ensure it is a number
  let setVal = parseInt(String(exercise?.sets), 10);
  // 2. Validate bounds
  if (isNaN(setVal) || setVal < 1) setVal = 3; // Default to 3 sets if invalid
  if (setVal > 30) setVal = 30; // Hard cap at 30 to prevent massive arrays
  
  const safeSetCount = setVal;

  if (!exercise) return null; // Safety render

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-black text-white font-sans h-[100dvh] flex flex-col overflow-hidden">
        
        {/* --- HEADER (Fixed) --- */}
        <div className="h-16 px-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent absolute top-0 w-full z-30 pointer-events-none">
            <div className="pointer-events-auto flex items-center gap-3">
                <div className="bg-black/50 backdrop-blur border border-white/10 px-3 py-1 rounded-full text-xs font-mono font-bold text-gray-300">
                    <span className="text-system-neon">{currentIdx + 1}</span> / {totalExercises}
                </div>
                {isSupplementaryExercise && (
                    <div className="bg-yellow-500/10 backdrop-blur border border-yellow-500/30 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold text-yellow-400">
                        OPTIONAL
                    </div>
                )}
                {anomalyPoints > 0 && (
                    <div className="bg-red-500/10 backdrop-blur border border-red-500/30 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold text-red-400 flex items-center gap-1">
                        <AlertOctagon size={10} /> {anomalyPoints}
                    </div>
                )}
            </div>
            
            <div className="pointer-events-auto flex items-center gap-2">
                {!(formCoachConfig && trackingMode === 'CAMERA') && (
                    <button
                        onClick={() => setShowTimerPicker(p => !p)}
                        className="flex items-center gap-1.5 bg-black/50 backdrop-blur border border-white/10 px-3 py-1 rounded-full text-[10px] font-mono font-bold text-gray-300 hover:border-system-neon/50 hover:text-system-neon transition-colors"
                    >
                        <Clock size={10} /> <span>{setTimerSec}s</span>
                        <span className="text-gray-600">|</span>
                        <span>{repPace.toFixed(1)}s/rep</span>
                    </button>
                )}
                <button 
                    onClick={() => setShowQuitConfirm(true)} 
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-black/50 border border-white/10 text-gray-400 hover:text-red-500 hover:border-red-500/50 transition-colors backdrop-blur"
                >
                    <X size={16} />
                </button>
            </div>
        </div>

        {/* --- SET TIMER PICKER --- */}
        <AnimatePresence>
            {showTimerPicker && !(formCoachConfig && trackingMode === 'CAMERA') && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="absolute top-16 right-4 z-40 bg-[#111] border border-white/10 rounded-xl p-3 shadow-[0_8px_32px_rgba(0,0,0,0.8)] backdrop-blur-lg"
                >
                    <p className="text-[10px] text-gray-500 font-mono font-bold tracking-widest mb-2">SET TIMER</p>
                    <div className="flex gap-2">
                        {SET_TIMER_OPTIONS.map(opt => (
                            <button
                                key={opt}
                                onClick={() => { if (opt !== setTimerSec) { setPendingTimer(opt); } else { setShowTimerPicker(false); } }}
                                className={`px-3 py-2 rounded-lg text-xs font-mono font-bold transition-all ${
                                    setTimerSec === opt
                                        ? 'bg-system-neon text-black shadow-[0_0_12px_rgba(0,212,255,0.4)]'
                                        : 'bg-gray-900 text-gray-400 border border-gray-800 hover:border-gray-600'
                                }`}
                            >
                                {opt}s
                            </button>
                        ))}
                    </div>
                    <p className="text-[9px] text-gray-600 font-mono mt-2">Rest scales with this setting</p>
                    
                    <div className="border-t border-white/5 my-3 pt-3">
                        <p className="text-[10px] text-gray-500 font-mono font-bold tracking-widest mb-2">REP PACE</p>
                        <div className="flex gap-2">
                            {[1.0, 1.5, 2.0, 2.5].map(opt => (
                                <button
                                    key={opt}
                                    onClick={() => {
                                        setRepPace(opt);
                                        saveRepPace(opt, player.userId || 'local');
                                        // Recalculate timeLeft for current set if it's rep-based
                                        if (phase === 'WORK' && exercise) {
                                            const lowerName = exercise.name.toLowerCase();
                                            if (lowerName.includes('squat') || lowerName.includes('pushup') || lowerName.includes('push-up') || lowerName.includes('situp') || lowerName.includes('sit-up') || lowerName.includes('sit ups') || lowerName.includes('sit-ups')) {
                                                setTimeLeft(getExerciseDuration(exercise.reps, exercise.name, currentSet - 1, opt));
                                            }
                                        }
                                    }}
                                    className={`px-2.5 py-2 rounded-lg text-xs font-mono font-bold transition-all ${
                                        repPace === opt
                                            ? 'bg-orange-500 text-black shadow-[0_0_12px_rgba(249,115,22,0.4)]'
                                            : 'bg-gray-900 text-gray-400 border border-gray-800 hover:border-gray-600'
                                    }`}
                                >
                                    {opt.toFixed(1)}s
                                </button>
                            ))}
                        </div>
                        <p className="text-[9px] text-gray-600 font-mono mt-2">Pacing for Squats, Push-ups & Sit-ups</p>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

        {/* --- TIMER CHANGE CONFIRMATION --- */}
        <AnimatePresence>
            {pendingTimer !== null && (
                <div className="fixed inset-0 z-[130] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="bg-[#0a0a0a] border border-system-neon/30 w-full max-w-xs rounded-2xl p-6 text-center shadow-[0_0_40px_rgba(0,212,255,0.15)]"
                    >
                        <div className="w-12 h-12 bg-system-neon/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-system-neon/30">
                            <Clock size={24} className="text-system-neon" />
                        </div>
                        <h3 className="text-sm font-black text-white mb-1 tracking-tight">CHANGE SET TIMER?</h3>
                        <p className="text-[11px] text-gray-400 font-mono mb-5">
                            <span className="text-gray-500">{setTimerSec}s</span>
                            <span className="text-system-neon mx-2">→</span>
                            <span className="text-white font-bold">{pendingTimer}s</span>
                        </p>
                        <p className="text-[9px] text-gray-600 font-mono mb-5">All rest timers will scale to the new duration. This will be your default for future workouts.</p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPendingTimer(null)}
                                className="flex-1 py-3 rounded-xl bg-gray-800 text-gray-300 font-bold text-xs hover:bg-gray-700 transition-colors"
                            >
                                CANCEL
                            </button>
                            <button
                                onClick={() => {
                                    setSetTimerSec(pendingTimer!);
                                    saveSetTimer(pendingTimer!, player.userId || 'local');
                                    setPendingTimer(null);
                                    setShowTimerPicker(false);
                                }}
                                className="flex-1 py-3 rounded-xl bg-system-neon text-black font-black text-xs hover:bg-white transition-colors"
                            >
                                CONFIRM
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>

        {/* --- MEDIA AREA (Flexible Top Half) --- */}
        <div className="relative flex-1 bg-gray-900 overflow-hidden">
            {/* Phase Overlay/Tint - Modified for Preview Logic */}
            <AnimatePresence>
                {phase === 'REST' && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={`absolute inset-0 z-20 flex flex-col items-center justify-center p-8 text-center transition-colors duration-500 ${isUpNextPreview ? 'bg-black/20 backdrop-blur-sm' : 'bg-black/90'}`}
                    >
                        {isUpNextPreview ? (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex flex-col items-center"
                            >
                                <div className="bg-system-neon/10 border border-system-neon/50 px-4 py-1 rounded-full text-system-neon font-black text-sm tracking-widest mb-4 animate-pulse flex items-center gap-2">
                                    <Zap size={16} fill="currentColor" /> {currentSet === 0 ? "NEXT EXERCISE" : "NEXT SET"}
                                </div>
                                <h2 className="text-3xl md:text-5xl font-black italic text-white uppercase drop-shadow-[0_0_10px_rgba(0,0,0,0.8)] mb-6 text-center">
                                    {exercise.name}
                                </h2>
                                <div className="text-[100px] font-black text-white/80 leading-none drop-shadow-2xl font-mono">
                                    {timeLeft}
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div 
                                initial={{ scale: 0.8 }}
                                animate={{ scale: 1 }}
                                exit={{ opacity: 0, scale: 0.5 }}
                                className="w-full max-w-sm"
                            >
                                {/* Form Coach Summary (shown during REST when form data available) */}
                                {lastFormCoachStateRef.current && lastFormCoachStateRef.current.repResults.length > 0 ? (
                                    <div className="space-y-4">
                                        <FormCoachSummary
                                            setNumber={currentSet}
                                            state={lastFormCoachStateRef.current}
                                            targetReps={parseInt(exercise.reps) || 10}
                                        />
                                        <div className="text-center">
                                            <div className="text-4xl font-black font-mono text-white mb-1 tabular-nums">
                                                {timeLeft}<span className="text-lg text-gray-500 ml-1">s</span>
                                            </div>
                                            <p className="text-[10px] text-gray-500 font-mono tracking-widest">RECOVERY</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-gray-900/50 border border-system-success/30 p-8 rounded-2xl shadow-[0_0_50px_rgba(16,185,129,0.1)] backdrop-blur-md">
                                        <h3 className="text-system-success font-mono font-bold tracking-widest text-lg mb-4 flex items-center justify-center gap-2">
                                            <Activity size={20} className="animate-pulse" /> RECOVERY
                                        </h3>
                                        <div className="text-8xl font-black font-mono text-white mb-4 tabular-nums">
                                            {timeLeft}<span className="text-2xl text-gray-500 ml-2">s</span>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs text-gray-400 font-mono uppercase tracking-wider">UP NEXT</p>
                                            <p className="text-sm font-bold text-white uppercase max-w-[200px] truncate mx-auto">{exercise.name}</p>
                                            <p className="text-xs text-gray-500 font-mono">SET {currentSet + 1}</p>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Video Player / Form Coach Camera / PiP Layout */}
            <div className="w-full h-full flex items-center justify-center bg-black relative">
                {formCoachConfig && phase === 'WORK' && trackingMode === 'CAMERA' ? (
                    /* ── Form Coach Mode: PREVIEW or TRACKING ── */
                    <>
                        {/* PREVIEW: Full-screen video with UPCOMING overlay */}
                        {formCoachSubPhase === 'PREVIEW' && videoSource && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="absolute inset-0 z-10"
                            >
                                {/\.gif(\?|$)/i.test(videoSource || '') ? (
                                    <img
                                        key={`preview-${videoSource}`}
                                        src={videoSource}
                                        alt={exercise.name}
                                        className="w-full h-full object-cover object-top"
                                    />
                                ) : (
                                    <video
                                        key={`preview-${videoSource}`}
                                        src={videoSource}
                                        className="w-full h-full object-cover object-top"
                                        autoPlay loop muted playsInline
                                        poster="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
                                        onCanPlay={(e) => (e.target as HTMLVideoElement).classList.add('video-ready')}
                                    />
                                )}
                                {/* UPCOMING overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent flex flex-col items-center justify-end pb-16">
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.3 }}
                                        className="text-center"
                                    >
                                        <div className="inline-flex items-center gap-2 bg-orange-500/20 border border-orange-500/50 px-4 py-1.5 rounded-full text-orange-400 font-black text-xs tracking-[0.2em] mb-3 animate-pulse">
                                            <Camera size={14} /> UPCOMING — WATCH FORM
                                        </div>
                                        <h2 className="text-3xl md:text-4xl font-black italic text-white uppercase mb-2 drop-shadow-[0_0_20px_rgba(0,0,0,0.8)]">
                                            {exercise.name}
                                        </h2>
                                        <p className="text-xs text-gray-400 font-mono">
                                            {exercise.sets} SETS × {exercise.reps} REPS — Camera opens in a moment
                                        </p>
                                        {/* Countdown dots */}
                                        <div className="flex justify-center gap-2 mt-4">
                                            {[0, 1, 2, 3].map(i => (
                                                <motion.div
                                                    key={i}
                                                    className="w-2 h-2 rounded-full bg-orange-500"
                                                    initial={{ opacity: 0.3 }}
                                                    animate={{ opacity: 1 }}
                                                    transition={{ delay: i * 1 }}
                                                />
                                            ))}
                                        </div>
                                    </motion.div>
                                </div>
                            </motion.div>
                        )}

                        {/* TRACKING: Full-screen camera + PiP video in top-right */}
                        {formCoachSubPhase === 'TRACKING' && (
                            <>
                                <FormCoachOverlay
                                    exercise={formCoachConfig}
                                    isActive={!isPaused}
                                    targetReps={parseInt(exercise.reps) || 0}
                                    onStateChange={(s) => {
                                        // Cap the rep count at the target so the UI
                                        // never displays a number beyond the limit
                                        const target = parseInt(exercise.reps) || 0;
                                        const capped = target > 0 && s.repCount > target
                                          ? { ...s, repCount: target }
                                          : s;
                                        setFormCoachState(capped);
                                        lastFormCoachStateRef.current = capped;
                                    }}
                                />
                                {/* PiP Video — top-right corner like a video call */}
                                {videoSource && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.5, x: 20, y: -20 }}
                                        animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                                        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                                        className="absolute top-14 right-3 z-40 w-[120px] h-[160px] rounded-xl overflow-hidden border-2 border-orange-500/60 shadow-[0_4px_20px_rgba(0,0,0,0.8),0_0_15px_rgba(249,115,22,0.2)]"
                                    >
                                        {/\.gif(\?|$)/i.test(videoSource || '') ? (
                                            <img
                                                key={`pip-${videoSource}`}
                                                src={videoSource}
                                                alt={exercise.name}
                                                className="w-full h-full object-cover object-top"
                                            />
                                        ) : (
                                            <video
                                                key={`pip-${videoSource}`}
                                                src={videoSource}
                                                className="w-full h-full object-cover object-top"
                                                autoPlay loop muted playsInline
                                                poster="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
                                                onCanPlay={(e) => (e.target as HTMLVideoElement).classList.add('video-ready')}
                                            />
                                        )}
                                        {/* PiP label */}
                                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent px-1.5 py-1">
                                            <p className="text-[7px] font-mono font-bold text-orange-400 tracking-wider text-center truncate">REFERENCE</p>
                                        </div>
                                    </motion.div>
                                )}
                            </>
                        )}

                        {/* No video and no sub-phase yet — show loading */}
                        {!formCoachSubPhase && (
                            <div className="flex flex-col items-center justify-center text-gray-600">
                                <div className="w-12 h-12 border-2 border-system-neon border-t-transparent rounded-full animate-spin mb-4" />
                                <span className="font-mono text-xs tracking-widest">INITIALIZING FORM COACH...</span>
                            </div>
                        )}
                    </>
                ) : videoSource ? (
                    isEmbed(videoSource) ? (
                        <iframe 
                            src={videoSource}
                            className="w-full h-full pointer-events-none"
                            title={exercise.name}
                            allow="autoplay; encrypted-media"
                        />
                    ) : (
                        <>
                            <div className="absolute inset-0 z-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
                                <div className="absolute inset-0 overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent animate-[shimmer_2s_infinite]" 
                                         style={{ transform: 'translateX(-100%)', animation: 'shimmer 2s infinite' }} />
                                </div>
                                <div className="w-14 h-14 rounded-full bg-gray-800/80 border border-gray-700/50 flex items-center justify-center mb-3 animate-pulse">
                                    <Dumbbell size={24} className="text-gray-600" />
                                </div>
                                <div className="text-[10px] text-gray-600 font-mono tracking-widest uppercase">Loading...</div>
                            </div>
                            {/\.gif(\?|$)/i.test(videoSource || '') ? (
                                <img
                                    key={videoSource}
                                    src={videoSource}
                                    alt={exercise.name}
                                    className="w-full h-full object-cover object-top relative z-[1] video-ready"
                                    style={{ opacity: 0.95 }}
                                />
                            ) : (
                                <video 
                                    key={videoSource}
                                    src={videoSource} 
                                    poster="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
                                    className="w-full h-full object-cover object-top relative z-[1]" 
                                    style={{ opacity: 0.95 }}
                                    autoPlay 
                                    loop 
                                    muted 
                                    playsInline 
                                    onCanPlay={(e) => (e.target as HTMLVideoElement).classList.add('video-ready')}
                                />
                            )}
                        </>
                    )
                ) : (
                    <div className="flex flex-col items-center justify-center text-gray-600 opacity-50">
                        <Film size={48} className="mb-4" />
                        <span className="font-mono text-xs tracking-widest">NO VISUAL FEED</span>
                        <span className="text-[8px] mt-2 text-gray-700">TARGET: {exercise.name}</span>
                    </div>
                )}
            </div>
            
            {/* Bottom Gradient for smooth transition to controls */}
            <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-[#050505] to-transparent z-10" />
        </div>

        {/* --- COMMAND DECK (Bottom Half) --- */}
        <div className="bg-[#050505] relative z-30 flex flex-col border-t border-white/5 shadow-[0_-10px_40px_rgba(0,0,0,0.8)]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
            
            {/* Progress Bar Line */}
            <div className="w-full h-1 bg-gray-900 overflow-hidden">
                <motion.div 
                    className="h-full bg-system-neon shadow-[0_0_10px_#00d4ff] origin-left"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: progressPercent / 100 }}
                    transition={{ ease: "linear", duration: 0.5 }}
                />
            </div>

            <div className={phase === 'WORK' && trackingMode === 'CAMERA' && formCoachConfig ? 'px-4 py-3' : 'p-5 md:p-8 space-y-5 md:space-y-6 pb-8 md:pb-8'}>

                {/* ═══════════════════════════════════════════════════════════ */}
                {/* CAMERA MODE: Ultra-compact bottom strip                   */}
                {/* ═══════════════════════════════════════════════════════════ */}
                {phase === 'WORK' && trackingMode === 'CAMERA' && formCoachConfig ? (
                    <div className="space-y-2">
                        {/* Row 1: Exercise Name + Rep Counter */}
                        <div className="flex justify-between items-center">
                            <h2 className="text-base font-black italic text-white uppercase tracking-tight truncate flex-1 pr-3">
                                {exercise.name}
                            </h2>
                            <div className="flex items-baseline gap-1 bg-orange-500/10 border border-orange-500/40 rounded-lg px-3 py-1">
                                <span className="text-xl font-black font-mono text-orange-400">{formCoachState?.repCount ?? 0}</span>
                                <span className="text-xs text-gray-500 font-mono">/{parseInt(exercise.reps) || '?'}</span>
                            </div>
                        </div>
                        {/* Row 2: Set dots + AI COACH toggle */}
                        <div className="flex items-center gap-3">
                            <div className="flex gap-1 h-1 flex-1">
                                {Array.from({ length: safeSetCount }).map((_, i) => {
                                    let c = 'bg-gray-800';
                                    if (i < currentSet - 1) c = 'bg-orange-500';
                                    if (i === currentSet - 1) c = 'bg-white animate-pulse';
                                    return <div key={i} className={`flex-1 rounded-full ${c}`} />;
                                })}
                            </div>
                            {/* iOS Toggle */}
                            <button
                                onClick={() => { setTrackingMode('TIMER'); setFormCoachSubPhase(null); setFormCoachState(null); }}
                                className="flex items-center gap-2 shrink-0"
                            >
                                <div className="relative w-[44px] h-[24px] rounded-full bg-gradient-to-r from-orange-500 to-amber-400 shadow-[0_0_10px_rgba(249,115,22,0.3)]">
                                    <motion.div
                                        className="absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white shadow-sm"
                                        animate={{ left: 23 }}
                                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                    />
                                </div>
                                <span className="text-[9px] font-mono font-bold text-orange-400 tracking-wider">AI COACH</span>
                            </button>
                        </div>
                    </div>
                ) : (
                <>
                {/* ═══════════════════════════════════════════════════════════ */}
                {/* TIMER MODE: Original full bottom panel (untouched)        */}
                {/* ═══════════════════════════════════════════════════════════ */}

                {/* Exercise Info */}
                {isRunningExercise && phase === 'WORK' ? (
                    /* ═══════════════════════════════════════════════════════════ */
                    /* RUNNING MODE: Live GPS distance tracker                    */
                    /* ═══════════════════════════════════════════════════════════ */
                    <div className="space-y-4">
                        <motion.h2
                            key={exercise.name}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="text-xl md:text-3xl font-black italic text-white leading-tight uppercase tracking-tight"
                        >
                            {exercise.name}
                        </motion.h2>

                        {/* Distance progress */}
                        <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Navigation size={14} className="text-[#00d4ff]" />
                                    <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">Distance</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1">
                                        <MapPin size={9} className={sensorTracking ? 'text-[#00d4ff] animate-pulse' : 'text-gray-600'} />
                                        <span className="text-[7px] font-mono" style={{ color: sensorTracking ? '#00d4ff' : '#555' }}>GPS</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Activity size={9} className={sensorTracking ? 'text-[#00d4ff] animate-pulse' : 'text-gray-600'} />
                                        <span className="text-[7px] font-mono" style={{ color: sensorTracking ? '#00d4ff' : '#555' }}>Steps</span>
                                    </div>
                                </div>
                            </div>

                            {/* Big distance number */}
                            <div className="text-center">
                                <span className="text-5xl font-black font-mono text-white tabular-nums">
                                    {bestDistanceKm.toFixed(2)}
                                </span>
                                <span className="text-lg text-gray-400 ml-1">/ {sensorReqs?.distanceKm || 1} km</span>
                            </div>

                            {/* Progress bar */}
                            <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full rounded-full"
                                    style={{ background: 'linear-gradient(90deg, #00d4ff, #0099cc)' }}
                                    initial={{ width: '0%' }}
                                    animate={{
                                        width: `${Math.min(100, (bestDistanceKm / (sensorReqs?.distanceKm || 1)) * 100)}%`
                                    }}
                                    transition={{ duration: 0.5 }}
                                />
                            </div>

                            {/* Live stats row */}
                            <div className="grid grid-cols-3 gap-2">
                                <div className="text-center">
                                    <div className="text-lg font-black font-mono text-white">{sensorSnapshot?.stepsRecorded || 0}</div>
                                    <div className="text-[8px] font-mono text-gray-500 uppercase tracking-wider">Steps</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-lg font-black font-mono text-white">
                                        {sensorSnapshot?.maxSpeedKmh ? `${sensorSnapshot.maxSpeedKmh.toFixed(1)}` : '0.0'}
                                    </div>
                                    <div className="text-[8px] font-mono text-gray-500 uppercase tracking-wider">km/h max</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-lg font-black font-mono text-white">
                                        {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                                    </div>
                                    <div className="text-[8px] font-mono text-gray-500 uppercase tracking-wider">Timer</div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Standard Exercise Info */
                    <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0 pr-4">
                            <motion.h2
                                key={exercise.name}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="text-xl md:text-3xl font-black italic text-white leading-tight uppercase tracking-tight truncate"
                            >
                                {exercise.name}
                            </motion.h2>
                            <div className="flex items-center gap-3 mt-2 text-xs font-mono text-gray-400">
                                <span className="bg-gray-900 px-2 py-1 rounded border border-gray-800 text-gray-300">
                                    {exercise.sets} SETS
                                </span>
                                <span className="bg-gray-900 px-2 py-1 rounded border border-gray-800 text-system-neon font-bold">
                                    {exercise.reps} REPS
                                </span>
                            </div>
                        </div>

                        {/* Mini Timer */}
                        {phase === 'WORK' && (
                            <div className="flex flex-col items-center justify-center bg-gray-900/50 border border-gray-800 rounded-lg p-2 min-w-[70px]">
                                <TimerIcon size={14} className="text-system-neon mb-1" />
                                <span className="text-xl font-bold font-mono text-white leading-none">{Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Set Indicators */}
                <div className="flex gap-1.5 h-1.5 w-full">
                    {Array.from({ length: safeSetCount }).map((_, i) => {
                        let statusColor = 'bg-gray-800';
                        if (i < currentSet - 1) statusColor = 'bg-system-neon'; // Completed
                        if (i === currentSet - 1) statusColor = phase === 'WORK' ? 'bg-white animate-pulse' : 'bg-system-success'; // Current

                        return (
                            <motion.div
                                key={i}
                                className={`flex-1 rounded-full ${statusColor}`}
                                layoutId={`set-dot-${i}`}
                            />
                        );
                    })}
                </div>

                {/* Controls */}
                <div className="grid grid-cols-4 gap-3">
                    <button
                        onClick={() => setIsPaused(!isPaused)}
                        className={`col-span-1 h-14 md:h-16 rounded-xl flex items-center justify-center border transition-all active:scale-95 ${
                            isPaused
                            ? 'bg-yellow-500/10 border-yellow-500 text-yellow-500'
                            : 'bg-gray-900 border-gray-800 text-gray-400 hover:bg-gray-800'
                        }`}
                    >
                        {isPaused ? <Play size={24} fill="currentColor" /> : <Pause size={24} fill="currentColor" />}
                    </button>

                    {phase === 'WORK' ? (
                        <>
                            {/* AI COACH Toggle (iOS-style) — only for form coach exercises */}
                            {formCoachConfig && (
                                <button
                                    onClick={() => {
                                        setTrackingMode('CAMERA');
                                        setFormCoachSubPhase('TRACKING');
                                    }}
                                    className="col-span-1 h-14 md:h-16 rounded-xl flex items-center justify-center gap-2 border transition-all active:scale-95 bg-gray-900 border-gray-800 hover:border-orange-500/30"
                                >
                                    {/* Off-state toggle */}
                                    <div className="relative w-[36px] h-[20px] rounded-full bg-gray-700 transition-all">
                                        <div className="absolute top-[2px] left-[2px] w-[16px] h-[16px] rounded-full bg-gray-400" />
                                    </div>
                                    <span className="text-[8px] font-mono font-bold text-gray-500 tracking-wider">AI</span>
                                </button>
                            )}
                            <button
                                onClick={completeSet}
                                className={`${formCoachConfig ? 'col-span-2' : 'col-span-3'} h-14 md:h-16 bg-system-neon text-black font-black text-lg rounded-xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,212,255,0.4)] hover:bg-white transition-all active:scale-95 group`}
                            >
                                <Check size={24} strokeWidth={3} />
                                <span>COMPLETE SET</span>
                            </button>
                            {isSupplementaryExercise && (
                                <button
                                    onClick={handleExerciseComplete}
                                    className="col-span-4 h-10 bg-transparent border border-yellow-500/30 text-yellow-400 font-bold text-xs rounded-xl flex items-center justify-center gap-2 hover:bg-yellow-500/10 transition-all active:scale-95"
                                >
                                    <ChevronRight size={16} /> SKIP (OPTIONAL)
                                </button>
                            )}
                        </>
                    ) : (
                        <button
                            onClick={() => { setPhaseStartTime(Date.now()); setTimeLeft(0); }}
                            className="col-span-3 h-14 md:h-16 bg-system-success text-black font-black text-lg rounded-xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:bg-white transition-all active:scale-95 group"
                        >
                            <span>START NEXT</span>
                            <ChevronRight size={24} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    )}
                </div>
                </>
                )}

            </div>
        </div>

        {/* --- QUIT MODAL --- */}
        <AnimatePresence>
           {showQuitConfirm && (
              <div className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-md flex items-center justify-center p-6">
                 <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }} 
                    animate={{ scale: 1, opacity: 1 }} 
                    exit={{ scale: 0.9, opacity: 0 }} 
                    className="bg-[#0a0a0a] border border-gray-700/50 w-full max-w-sm rounded-2xl p-6 text-center shadow-[0_0_50px_rgba(0,0,0,0.4)]"
                 >
                    <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-700/50">
                        <X size={32} className="text-gray-400" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2 font-mono">END WORKOUT?</h2>
                    <p className="text-xs text-gray-400 font-mono mb-8 leading-relaxed">
                        Your current session will end. You can start a fresh workout anytime.
                    </p>
                    <div className="flex flex-col gap-3">
                       <button 
                           onClick={() => setShowQuitConfirm(false)} 
                           className="w-full py-4 rounded-xl bg-system-neon text-black font-bold text-sm hover:bg-white transition-colors"
                       >
                           CONTINUE WORKOUT
                       </button>
                       <button 
                           onClick={confirmQuit} 
                           className="w-full py-4 rounded-xl bg-transparent border border-gray-700 text-gray-400 font-bold text-sm hover:bg-gray-900 transition-colors"
                       >
                           END SESSION
                       </button>
                    </div>
                 </motion.div>
              </div>
           )}
        </AnimatePresence>
    </div>,
    document.body
  );
};

export default ActiveWorkoutPlayer;
