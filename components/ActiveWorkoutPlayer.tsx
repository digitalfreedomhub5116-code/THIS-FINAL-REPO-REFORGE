
import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, X, AlertOctagon, Check, Activity, Film, Timer as TimerIcon, ChevronRight, Zap } from 'lucide-react';
import { EXERCISE_VIDEOS } from '../lib/defaultPlans';
import { WorkoutDay } from '../types';
import { SpeechService } from '../utils/speechService';
import { playSystemSoundEffect } from '../utils/soundEngine';
import { useSystem, isEmbed } from '../hooks/useSystem';

interface ActiveWorkoutPlayerProps {
  plan: WorkoutDay;
  onComplete: (exercisesCompleted: number, totalExercises: number, results: Record<string, number>, anomalyPoints?: number) => void;
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

const SET_DURATION = 45; 

// Dynamic rest duration based on exercise type & intensity
const getIntraSetRest = (type: string, isSupplementary?: boolean): number => {
  if (isSupplementary) return 15;
  switch (type) {
    case 'COMPOUND': return 45;
    case 'ACCESSORY': return 30;
    case 'CARDIO': return 20;
    case 'STRETCH': return 15;
    default: return 30;
  }
};

const getInterExerciseRest = (prevType: string, nextIsSupplementary?: boolean, prevIsSupplementary?: boolean): number => {
  if (nextIsSupplementary || prevIsSupplementary) return 15;
  switch (prevType) {
    case 'COMPOUND': return 60;
    case 'ACCESSORY': return 45;
    case 'CARDIO': return 30;
    case 'STRETCH': return 15;
    default: return 45;
  }
};

const WORKOUT_SESSION_KEY = 'reforge_active_workout';

export const saveWorkoutSession = (session: SavedWorkoutSession) => {
  try { localStorage.setItem(WORKOUT_SESSION_KEY, JSON.stringify(session)); } catch(e) {}
};

export const loadWorkoutSession = (): SavedWorkoutSession | null => {
  try {
    const raw = localStorage.getItem(WORKOUT_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch(e) { return null; }
};

export const clearWorkoutSession = () => {
  try { localStorage.removeItem(WORKOUT_SESSION_KEY); } catch(e) {}
};

// Helper to parse duration from reps string (e.g., "5 min" -> 300, "30s" -> 30)
const getExerciseDuration = (reps: string): number => {
  if (!reps) return SET_DURATION;
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
  
  return SET_DURATION; 
};

const ActiveWorkoutPlayer: React.FC<ActiveWorkoutPlayerProps> = ({ plan, onComplete, onFail, savedSession }) => {
  const { player } = useSystem();
  
  // --- STATE ---
  const [currentIdx, setCurrentIdx] = useState(savedSession?.currentIdx ?? 0);
  const [currentSet, setCurrentSet] = useState(savedSession?.currentSet ?? 1);
  
  // Initialize timer based on first exercise or saved session
  const [timeLeft, setTimeLeft] = useState(() => {
      if (savedSession) return savedSession.timeLeft;
      return plan.exercises.length > 0 ? getExerciseDuration(plan.exercises[0].reps) : SET_DURATION;
  });

  const [phase, setPhase] = useState<'WORK' | 'REST'>(savedSession?.phase ?? 'WORK');
  const [isPaused, setIsPaused] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [results, setResults] = useState<Record<string, number>>(savedSession?.results ?? {});

  // --- ANTI-CHEAT ---
  const [anomalyPoints, setAnomalyPoints] = useState(savedSession?.anomalyPoints ?? 0);
  const [phaseStartTime, setPhaseStartTime] = useState(Date.now());

  // Derived Data
  const exercise = plan.exercises[currentIdx] || plan.exercises[0]; // Fallback to avoid undefined crash
  const totalExercises = plan.exercises.length;
  
  // Robust Video Lookup Strategy (checks exercise.videoUrl → EXERCISE_VIDEOS map → focusVideos → DB)
  const videoSource = React.useMemo(() => {
      if (!exercise) return null;
      
      if (exercise.videoUrl && exercise.videoUrl.trim() !== '') return exercise.videoUrl;

      if (EXERCISE_VIDEOS[exercise.name]) return EXERCISE_VIDEOS[exercise.name];
      
      const name = exercise.name;
      if (player.focusVideos[name]) return player.focusVideos[name];
      
      const lowerName = name.toLowerCase();
      const looseKey = Object.keys(player.focusVideos).find(k => k.toLowerCase() === lowerName);
      if (looseKey) return player.focusVideos[looseKey];

      const dbEntry = player.exerciseDatabase.find(e => e.name === name || e.name.toLowerCase() === lowerName);
      if (dbEntry?.videoUrl) return dbEntry.videoUrl;

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
    if (nextEx.videoUrl && nextEx.videoUrl.trim() !== '') return nextEx.videoUrl;
    if (EXERCISE_VIDEOS[nextEx.name]) return EXERCISE_VIDEOS[nextEx.name];
    const dbEntry = player.exerciseDatabase.find(e => e.name.toLowerCase() === nextEx.name.toLowerCase());
    if (dbEntry?.videoUrl) return dbEntry.videoUrl;
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

  // Initial Announcement Only
  useEffect(() => {
    if (plan.exercises.length > 0) {
        const first = plan.exercises[0];
        SpeechService.announceStart(first.name, first.sets, first.reps);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startNextSet = useCallback(() => {
      playSystemSoundEffect('SYSTEM');
      
      const nextSet = currentSet + 1;
      
      setPhase('WORK');
      setPhaseStartTime(Date.now());
      setCurrentSet(nextSet);
      
      // Dynamic Duration Calculation based on current exercise
      const currentEx = plan.exercises[currentIdx];
      const duration = getExerciseDuration(currentEx.reps);
      setTimeLeft(duration);

      // AI Voice Logic
      if (nextSet === 1) {
          // Starting new exercise (Set 1)
          SpeechService.announceStart(currentEx.name, currentEx.sets, currentEx.reps);
      } else {
          // Next set of same exercise
          SpeechService.announceSetStart(nextSet);
      }
  }, [currentSet, currentIdx, plan.exercises]);

  const handleExerciseComplete = useCallback(() => {
    if (currentIdx < totalExercises - 1) {
      // Transition to Next Exercise
      const prevEx = plan.exercises[currentIdx];
      const nextEx = plan.exercises[currentIdx + 1];
      const restDuration = getInterExerciseRest(prevEx.type, nextEx?.isSupplementary, prevEx?.isSupplementary);
      
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
      clearWorkoutSession();
      SpeechService.announceVictory();
      playSystemSoundEffect('LEVEL_UP');
      onComplete(totalExercises, totalExercises, results, anomalyPoints);
    }
  }, [currentIdx, totalExercises, onComplete, results, anomalyPoints, plan.exercises]);

  const completeSet = useCallback(() => {
      playSystemSoundEffect('SUCCESS');
      
      // --- ANTI-CHEAT: Check if set was completed too fast (before 70% of duration) ---
      if (!exercise.isSupplementary) {
        const totalDuration = getExerciseDuration(exercise.reps);
        const elapsedMs = Date.now() - phaseStartTime;
        const elapsedSec = elapsedMs / 1000;
        const threshold = totalDuration * 0.7;
        
        if (elapsedSec < threshold && totalDuration > 10) {
          setAnomalyPoints(prev => prev + 1);
        }
      }
      
      setResults(prev => ({...prev, [`${exercise.name}_set${currentSet}`]: 1 }));
      
      if (currentSet < exercise.sets) {
        // Transition to Next Set (Same Exercise)
        const restDuration = getIntraSetRest(exercise.type, exercise.isSupplementary);
        setPhase('REST');
        setPhaseStartTime(Date.now());
        setTimeLeft(restDuration);
        SpeechService.announceRest(restDuration);
      } else {
        handleExerciseComplete();
      }
  }, [currentSet, exercise?.sets, exercise?.name, exercise?.reps, exercise?.type, exercise?.isSupplementary, handleExerciseComplete, phaseStartTime]);

  const handleTimerComplete = useCallback(() => {
    if (phase === 'WORK') {
      completeSet();
    } else {
      startNextSet();
    }
  }, [phase, completeSet, startNextSet]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (!isPaused && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          const next = prev - 1;
          // Calculate max duration for halfway point based on current exercise
          const curEx = plan.exercises[currentIdx];
          const maxDuration = phase === 'WORK' ? getExerciseDuration(curEx.reps) : getInterExerciseRest(curEx.type, curEx.isSupplementary);
          if (phase === 'WORK' && next === Math.floor(maxDuration / 2)) SpeechService.announceHalfway();
          if (next <= 3 && next > 0) playSystemSoundEffect('TICK');
          return next;
        });
      }, 1000);
    } else if (timeLeft === 0 && !isPaused) {
      handleTimerComplete();
    }
    return () => clearInterval(interval);
  }, [timeLeft, isPaused, phase, handleTimerComplete, currentIdx, plan.exercises]);

  // --- SESSION PERSISTENCE: Save state whenever key values change ---
  useEffect(() => {
    saveWorkoutSession({
      currentIdx,
      currentSet,
      timeLeft,
      phase,
      results,
      anomalyPoints,
      planDay: plan.day,
      timestamp: Date.now(),
    });
  }, [currentIdx, currentSet, timeLeft, phase, results, anomalyPoints, plan.day]);

  const confirmQuit = () => {
    // Save session so user can resume later instead of losing progress
    saveWorkoutSession({
      currentIdx,
      currentSet,
      timeLeft,
      phase,
      results,
      anomalyPoints,
      planDay: plan.day,
      timestamp: Date.now(),
    });
    SpeechService.announceFailure();
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
            
            <button 
                onClick={() => setShowQuitConfirm(true)} 
                className="pointer-events-auto w-8 h-8 flex items-center justify-center rounded-full bg-black/50 border border-white/10 text-gray-400 hover:text-red-500 hover:border-red-500/50 transition-colors backdrop-blur"
            >
                <X size={16} />
            </button>
        </div>

        {/* --- MEDIA AREA (Flexible Top Half) --- */}
        <div className="relative flex-1 bg-gray-900 overflow-hidden">
            {/* Phase Overlay/Tint - Modified for Preview Logic */}
            <AnimatePresence>
                {phase === 'REST' && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        // Dynamic background opacity: Opaque normally, Transparent when <= 5s to show video
                        className={`absolute inset-0 z-20 flex flex-col items-center justify-center p-8 text-center transition-colors duration-500 ${isUpNextPreview ? 'bg-black/20 backdrop-blur-sm' : 'bg-black/90'}`}
                    >
                        {isUpNextPreview ? (
                            // PREVIEW STATE (LAST 5 SECONDS)
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
                            // STANDARD RECOVERY STATE
                            <motion.div 
                                initial={{ scale: 0.8 }}
                                animate={{ scale: 1 }}
                                exit={{ opacity: 0, scale: 0.5 }}
                                className="bg-gray-900/50 border border-system-success/30 p-8 rounded-2xl shadow-[0_0_50px_rgba(16,185,129,0.1)] backdrop-blur-md"
                            >
                                <h3 className="text-system-success font-mono font-bold tracking-widest text-lg mb-4 flex items-center justify-center gap-2">
                                    <Activity size={20} className="animate-pulse" /> RECOVERY
                                </h3>
                                <div className="text-8xl font-black font-mono text-white mb-4 tabular-nums">
                                    {timeLeft}<span className="text-2xl text-gray-500 ml-2">s</span>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-gray-400 font-mono uppercase tracking-wider">
                                        UP NEXT
                                    </p>
                                    <p className="text-sm font-bold text-white uppercase max-w-[200px] truncate mx-auto">
                                        {exercise.name}
                                    </p>
                                    <p className="text-xs text-gray-500 font-mono">
                                        SET {currentSet + 1}
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Video Player */}
            <div className="w-full h-full flex items-center justify-center bg-black">
                {videoSource ? (
                    isEmbed(videoSource) ? (
                        <iframe 
                            src={videoSource}
                            className="w-full h-full pointer-events-none"
                            title={exercise.name}
                            allow="autoplay; encrypted-media"
                        />
                    ) : (
                        <video 
                            key={videoSource} // Force reload on change
                            src={videoSource} 
                            poster="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
                            className="w-full h-full object-contain bg-black" 
                            style={{ filter: 'invert(1) hue-rotate(180deg)', opacity: 0.85 }}
                            autoPlay 
                            loop 
                            muted 
                            playsInline 
                        />
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
            <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-[#050505] to-transparent z-10" />
        </div>

        {/* --- COMMAND DECK (Bottom Half) --- */}
        <div className="bg-[#050505] relative z-30 flex flex-col border-t border-white/5 shadow-[0_-10px_40px_rgba(0,0,0,0.8)]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
            
            {/* Progress Bar Line */}
            <div className="w-full h-1 bg-gray-900 overflow-hidden">
                <motion.div 
                    className="h-full bg-system-neon shadow-[0_0_10px_#00d2ff] origin-left"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: progressPercent / 100 }}
                    transition={{ ease: "linear", duration: 0.5 }}
                />
            </div>

            <div className="p-5 md:p-8 space-y-5 md:space-y-6 pb-8 md:pb-8">
                
                {/* Exercise Info */}
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
                    
                    {/* Mini Timer (Visible during work) */}
                    {phase === 'WORK' && (
                        <div className="flex flex-col items-center justify-center bg-gray-900/50 border border-gray-800 rounded-lg p-2 min-w-[70px]">
                            <TimerIcon size={14} className="text-system-neon mb-1" />
                            <span className="text-xl font-bold font-mono text-white leading-none">{Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}</span>
                        </div>
                    )}
                </div>

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
                            <button 
                                onClick={completeSet}
                                className="col-span-3 h-14 md:h-16 bg-system-neon text-black font-black text-lg rounded-xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,210,255,0.4)] hover:bg-white transition-all active:scale-95 group"
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
                    className="bg-[#0a0a0a] border border-red-900/50 w-full max-w-sm rounded-2xl p-6 text-center shadow-[0_0_50px_rgba(220,38,38,0.2)]"
                 >
                    <div className="w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-900/50">
                        <AlertOctagon size={32} className="text-red-500" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2 font-mono">ABORT MISSION?</h2>
                    <p className="text-xs text-red-400 font-mono mb-8 leading-relaxed">
                        WARNING: Leaving the instance early will result in a penalty. XP will be deducted and your streak may be broken.
                    </p>
                    <div className="flex flex-col gap-3">
                       <button 
                           onClick={() => setShowQuitConfirm(false)} 
                           className="w-full py-4 rounded-xl bg-gray-800 text-white font-bold text-sm hover:bg-gray-700 transition-colors"
                       >
                           RESUME PROTOCOL
                       </button>
                       <button 
                           onClick={confirmQuit} 
                           className="w-full py-4 rounded-xl bg-transparent border border-red-900/50 text-red-500 font-bold text-sm hover:bg-red-900/10 transition-colors"
                       >
                           ACCEPT PENALTY & QUIT
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
