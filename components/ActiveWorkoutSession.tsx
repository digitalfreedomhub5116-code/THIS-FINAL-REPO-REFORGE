
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, CheckCircle, X, Save, Activity, ChevronRight, Zap } from 'lucide-react';
import { WorkoutDay, CoreStats } from '../types';
import { playSystemSoundEffect, speakSystemMessage } from '../utils/soundEngine';

interface ActiveWorkoutSessionProps {
  plan: WorkoutDay;
  playerStats: CoreStats;
  personalBests: Record<string, number>;
  onComplete: (exercisesCompleted: number, totalExercises: number, results: Record<string, number>) => void;
  onFail: () => void;
  streak: number;
}

const WORK_TIME = 60; // Standard Set Time guideline

const ActiveWorkoutSession: React.FC<ActiveWorkoutSessionProps> = ({ plan, playerStats, onComplete, onFail, streak }) => {
  // --- STATE ---
  const [currentExerciseIdx, setCurrentExerciseIdx] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [phase, setPhase] = useState<'WORK' | 'LOG' | 'REST'>('WORK');
  const [timer, setTimer] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  
  // Data Logging
  const [weightInput, setWeightInput] = useState<number>(0);
  const [repsInput, setRepsInput] = useState<number>(0);
  const [sessionResults, setSessionResults] = useState<Record<string, number>>({});

  const currentExercise = plan.exercises[currentExerciseIdx];
  const totalSets = currentExercise.sets;
  const isOverdrive = streak >= 5;

  // Calculate Rest Time based on Discipline
  const getRestTime = useCallback(() => {
      let base = 60;
      const reduction = Math.floor((playerStats.discipline || 10) / 5);
      return Math.max(30, base - reduction);
  }, [playerStats.discipline]);

  const startWorkPhase = useCallback(() => {
      setPhase('WORK');
      setTimer(WORK_TIME); // Count up or down? Let's do countdown for guideline
      setIsPaused(false);
      setRepsInput(0);
      // Pre-fill weight if available from PB or previous set?
      // For now, keep 0 to force entry
  }, []);

  const startRestPhase = useCallback(() => {
      setPhase('REST');
      setTimer(getRestTime());
      speakSystemMessage("Recovery phase initiated.");
  }, [getRestTime]);

  const handleNextSet = useCallback(() => {
      if (currentSet < totalSets) {
          setCurrentSet(prev => prev + 1);
          startWorkPhase();
      } else {
          // Exercise Complete
          if (currentExerciseIdx < plan.exercises.length - 1) {
              setCurrentExerciseIdx(prev => prev + 1);
              setCurrentSet(1);
              startWorkPhase();
          } else {
              // Workout Complete
              playSystemSoundEffect('LEVEL_UP');
              onComplete(plan.exercises.length, plan.exercises.length, sessionResults);
          }
      }
  }, [currentSet, totalSets, currentExerciseIdx, plan.exercises.length, startWorkPhase, onComplete, sessionResults]);

  const handleTimerComplete = useCallback(() => {
      playSystemSoundEffect('SYSTEM');
      
      if (phase === 'REST') {
          // Rest done, next set
          handleNextSet();
      }
      // If phase is WORK, timer hitting 0 just means "Guideline time over", we don't auto-switch.
  }, [phase, handleNextSet]);

  const handleLogSubmit = useCallback(() => {
      if (repsInput > 0) {
          // Save data
          setSessionResults(prev => ({
              ...prev,
              [`${currentExercise.name}_Set${currentSet}`]: weightInput > 0 ? weightInput : 0
          }));
          
          playSystemSoundEffect('PURCHASE'); // Affirmation sound
          startRestPhase();
      }
  }, [repsInput, weightInput, currentExercise.name, currentSet, startRestPhase]);

  // --- EFFECTS ---

  // Initial Start
  useEffect(() => {
      startWorkPhase();
  }, [startWorkPhase]);

  // Timer Logic
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>; // Fixed: Explicit Type compatible with browser
    if (!isPaused && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => {
            const nextTime = prev - 1;
            // Sounds
            if (phase === 'REST' && nextTime <= 3 && nextTime > 0) playSystemSoundEffect('TICK');
            if (nextTime === 0) handleTimerComplete();
            return nextTime;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer, isPaused, handleTimerComplete, phase]);

  // --- UI HELPERS ---

  const themeColor = phase === 'WORK' ? 'text-system-neon' : phase === 'REST' ? 'text-system-success' : 'text-system-warning';
  const borderColor = phase === 'WORK' ? 'border-system-neon' : phase === 'REST' ? 'border-system-success' : 'border-system-warning';
  const glowColor = phase === 'WORK' ? '#00d2ff' : phase === 'REST' ? '#10b981' : '#f59e0b';

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col overflow-hidden font-mono select-none">
        
        {/* --- IMMERSIVE BACKGROUND --- */}
        <div className="absolute inset-0 z-0">
             {/* Base Grid */}
             <div className="absolute inset-0 opacity-20 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:50px_50px]" />
             
             {/* Radial Pulse */}
             <motion.div 
                animate={{ opacity: [0.1, 0.3, 0.1] }}
                transition={{ duration: 4, repeat: Infinity }}
                className={`absolute inset-0 bg-radial-gradient from-${phase === 'WORK' ? 'system-neon' : phase === 'REST' ? 'system-success' : 'system-warning'}/10 to-transparent`}
             />
             
             {/* Vignette */}
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,black_90%)]" />
        </div>

        {/* --- TOP HUD --- */}
        <div className="relative z-10 flex justify-between items-start p-6">
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <Activity size={14} className={themeColor} />
                    <span className="text-[10px] text-gray-500 tracking-widest uppercase">SYSTEM PROTOCOL</span>
                    {isOverdrive && (
                        <div className="flex items-center gap-1 text-[10px] text-yellow-500 bg-yellow-900/20 px-2 py-0.5 rounded border border-yellow-500/30 animate-pulse">
                            <Zap size={10} fill="currentColor" /> OVERDRIVE
                        </div>
                    )}
                </div>
                <motion.h1 
                    key={currentExercise.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-xl md:text-3xl font-black italic tracking-tighter text-white uppercase"
                >
                    {currentExercise.name}
                </motion.h1>
                <div className="flex gap-4 mt-2 text-xs font-bold">
                    <span className="bg-gray-900 border border-gray-700 px-2 py-1 rounded text-white">
                        SET {currentSet} <span className="text-gray-500">/ {totalSets}</span>
                    </span>
                    <span className="bg-gray-900 border border-gray-700 px-2 py-1 rounded text-white">
                        TARGET: {currentExercise.reps}
                    </span>
                </div>
            </div>

            <button 
                onClick={onFail}
                className="group flex flex-col items-center gap-1 opacity-60 hover:opacity-100 transition-opacity"
            >
                <div className="w-8 h-8 rounded-full border border-red-900 bg-red-950 flex items-center justify-center text-red-500 group-hover:bg-red-900 group-hover:text-white transition-colors">
                    <X size={16} />
                </div>
                <span className="text-[8px] text-red-700 uppercase tracking-widest">ABORT</span>
            </button>
        </div>

        {/* --- CENTER STAGE: ARC REACTOR TIMER --- */}
        <div className="relative z-10 flex-1 flex items-center justify-center">
            
            {/* The Reactor Container */}
            <div className="relative w-[300px] h-[300px] md:w-[400px] md:h-[400px] flex items-center justify-center">
                
                {/* Decorative Rotating Ring */}
                <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 border border-dashed border-gray-800 rounded-full opacity-50"
                />
                
                {/* Outer Glow Ring */}
                <div className={`absolute inset-4 rounded-full border-2 ${borderColor} opacity-20 blur-md`} />

                {/* SVG Gauge */}
                <svg className="absolute inset-0 w-full h-full -rotate-90 drop-shadow-[0_0_10px_rgba(0,0,0,0.8)]">
                    {/* Background Track */}
                    <circle cx="50%" cy="50%" r="45%" fill="none" stroke="#1f2937" strokeWidth="4" />
                    
                    {/* Progress Arc */}
                    <motion.circle 
                        cx="50%" cy="50%" r="45%" fill="none" stroke={glowColor} strokeWidth="6" strokeLinecap="round"
                        initial={{ pathLength: 1 }}
                        animate={{ pathLength: timer / (phase === 'REST' ? getRestTime() : WORK_TIME) }}
                        transition={{ duration: 1, ease: "linear" }}
                        style={{ filter: `drop-shadow(0 0 8px ${glowColor})` }}
                    />
                </svg>

                {/* --- INNER CONTENT SWITCHER --- */}
                <div className="relative z-20 flex flex-col items-center justify-center text-center w-2/3 aspect-square bg-black rounded-full border border-gray-800 shadow-2xl">
                    
                    <AnimatePresence mode="wait">
                        {phase === 'LOG' ? (
                            /* LOGGING INTERFACE */
                            <motion.div 
                                key="log"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="flex flex-col items-center gap-3 w-full px-4"
                            >
                                <div className="text-[10px] text-system-warning uppercase tracking-widest font-bold mb-1">DATA ENTRY</div>
                                
                                <div className="flex gap-2 w-full justify-center">
                                    <div className="flex flex-col w-20">
                                        <label className="text-[8px] text-gray-500 mb-1">KG</label>
                                        <input 
                                            type="number"
                                            value={weightInput || ''}
                                            onChange={e => setWeightInput(Number(e.target.value))}
                                            placeholder="0"
                                            className="bg-gray-900 border border-system-warning/50 rounded p-2 text-center text-white text-xl font-bold focus:outline-none focus:border-system-warning"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="flex flex-col w-20">
                                        <label className="text-[8px] text-gray-500 mb-1">REPS</label>
                                        <input 
                                            type="number"
                                            value={repsInput || ''}
                                            onChange={e => setRepsInput(Number(e.target.value))}
                                            placeholder="0"
                                            className="bg-gray-900 border border-system-warning/50 rounded p-2 text-center text-white text-xl font-bold focus:outline-none focus:border-system-warning"
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            /* TIMER DISPLAY */
                            <motion.div
                                key="timer"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-col items-center"
                            >
                                <div className={`text-[10px] uppercase tracking-[0.2em] font-bold mb-2 ${themeColor}`}>
                                    {phase === 'WORK' ? 'ACTIVE ENGAGEMENT' : 'RECOVERY CYCLE'}
                                </div>
                                <div className={`text-6xl md:text-7xl font-black tabular-nums tracking-tighter text-white drop-shadow-lg`}>
                                    {Math.floor(timer / 60)}:{String(timer % 60).padStart(2, '0')}
                                </div>
                                {isPaused && (
                                    <div className="mt-2 text-xs bg-yellow-900/50 text-yellow-500 px-2 py-0.5 rounded border border-yellow-700/50 animate-pulse">
                                        PAUSED
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

            </div>
        </div>

        {/* --- BOTTOM CONTROLS --- */}
        <div className="relative z-10 w-full p-6 bg-gradient-to-t from-black via-black/90 to-transparent">
            <div className="max-w-md mx-auto grid grid-cols-4 gap-4">
                
                {/* Control: Pause/Resume */}
                <button 
                    onClick={() => setIsPaused(!isPaused)}
                    disabled={phase === 'LOG'}
                    className={`col-span-1 h-16 rounded-xl flex items-center justify-center border transition-all active:scale-95 ${isPaused ? 'bg-yellow-900/20 border-yellow-600 text-yellow-500' : 'bg-gray-900 border-gray-700 text-gray-400 hover:bg-gray-800'}`}
                >
                    {isPaused ? <Play size={24} fill="currentColor" /> : <Pause size={24} fill="currentColor" />}
                </button>

                {/* Control: Main Action */}
                {phase === 'LOG' ? (
                     <button 
                        onClick={handleLogSubmit}
                        className="col-span-3 h-16 bg-system-warning text-black font-black text-lg rounded-xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:bg-white transition-colors active:scale-95"
                     >
                        <Save size={20} /> CONFIRM DATA
                     </button>
                ) : phase === 'REST' ? (
                    <button 
                        onClick={() => setTimer(0)} 
                        className="col-span-3 h-16 bg-system-success/10 border border-system-success text-system-success font-black text-lg rounded-xl flex items-center justify-center gap-2 hover:bg-system-success hover:text-black transition-colors active:scale-95 group"
                    >
                        START NEXT SET <ChevronRight size={24} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                ) : (
                    <button 
                        onClick={() => setPhase('LOG')}
                        className="col-span-3 h-16 bg-system-neon text-black font-black text-lg rounded-xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,210,255,0.4)] hover:bg-white transition-colors active:scale-95"
                    >
                        <CheckCircle size={24} /> COMPLETE SET
                    </button>
                )}
            </div>
            
            {/* Contextual Hint */}
            <div className="text-center mt-4">
                <p className="text-[10px] text-gray-600 font-mono">
                    {phase === 'WORK' ? "MAINTAIN FORM INTEGRITY. DO NOT FALTER." : phase === 'REST' ? "BREATHE. RECOVER. PREPARE." : "LOG PERFORMANCE METRICS."}
                </p>
            </div>
        </div>

    </div>
  );
};

export default ActiveWorkoutSession;
