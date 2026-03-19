
import React, { useRef, useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Lock, Swords, Skull, Crown, Flag, Zap, X, Play, Activity, Gift, AlertTriangle, Trophy, Star, KeyRound } from 'lucide-react';
import { WorkoutDay } from '../types';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// Optional: Fallback procedural model if we don't have a real GLTF model
const Fallback3DReward = () => {
    const meshRef = useRef<THREE.Mesh>(null);
    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.y = state.clock.elapsedTime * 0.5;
            meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.1;
        }
    });

    return (
        <mesh ref={meshRef}>
            <octahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color="#a855f7" wireframe emissive="#7c3aed" emissiveIntensity={0.5} />
            <mesh>
                <octahedronGeometry args={[0.9, 0]} />
                <meshStandardMaterial color="#00d2ff" transparent opacity={0.8} />
            </mesh>
        </mesh>
    );
};

// Checkpoint reward types at day milestones
const CHECKPOINT_DAYS = new Set([7, 14, 21, 28, 42, 56]);
const STREAK_MILESTONES = new Set([7, 14, 21, 30, 60, 90]);

// Floating 3D reward gem between nodes
const FloatingRewardGem = ({ color = '#a855f7', scale = 0.6 }: { color?: string; scale?: number }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.y = state.clock.elapsedTime * 1.2;
            meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.8) * 0.3;
            meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.15;
        }
    });
    return (
        <mesh ref={meshRef} scale={scale}>
            <octahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} transparent opacity={0.9} />
        </mesh>
    );
};

interface WorkoutMapProps {
  currentWeight: number;
  targetWeight: number;
  workoutPlan: WorkoutDay[];
  completedDays: number;
  missedDays?: number[];
  streak?: number;
  planChangedAtDay?: number;
  planChangeLabel?: string;
  onStartDay: (dayIndex: number) => void;
}

const WorkoutMap: React.FC<WorkoutMapProps> = ({ 
  currentWeight, 
  targetWeight, 
  workoutPlan, 
  completedDays, 
  missedDays = [],
  streak = 0,
  planChangedAtDay,
  planChangeLabel,
  onStartDay 
}) => {
  const missedSet = useMemo(() => new Set(missedDays), [missedDays]);
  const [selectedPreview, setSelectedPreview] = useState<number | null>(null);
  const [showReward, setShowReward] = useState<{ id: number, type: string } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const currentDayRef = useRef<HTMLDivElement>(null);
  
  // Responsive Amplitude State
  const [amplitude, setAmplitude] = useState(typeof window !== 'undefined' && window.innerWidth < 768 ? 40 : 80);

  useEffect(() => {
    const handleResize = () => {
        setAmplitude(window.innerWidth < 768 ? 40 : 80);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-scroll to current day
  useEffect(() => {
      if (currentDayRef.current && containerRef.current) {
          setTimeout(() => {
              currentDayRef.current?.scrollIntoView({ 
                  behavior: 'smooth', 
                  block: 'center' 
              });
          }, 500);
      }
  }, [completedDays]);

  // 1. Calculate Journey Length
  const weightDiff = Math.abs((currentWeight || 0) - (targetWeight || 0));
  const safeWeightDiff = Number.isFinite(weightDiff) ? weightDiff : 0;
  
  // Cap weeks to prevent massive lists
  const estimatedWeeks = Math.min(52, Math.max(4, Math.ceil(safeWeightDiff / 0.5))); 
  const totalDays = Math.floor(estimatedWeeks * 7); 
  
  // 2. Generate Path Points
  const points = useMemo(() => {
    const pts = [];
    const verticalGap = 160; 
    const frequency = 0.5;

    for (let i = 0; i <= totalDays; i++) {
      const y = i * verticalGap + 100; 
      const xOffset = Math.sin(i * frequency) * amplitude;
      
      const isCheckpoint = CHECKPOINT_DAYS.has(i + 1);
      pts.push({ id: i, x: xOffset, y, isBoss: (i + 1) % 7 === 0, isFinal: i === totalDays, isCheckpoint });
    }
    return pts;
  }, [totalDays, amplitude]);

  // 3. Generate SVG Path String
  const svgPath = useMemo(() => {
    if (points.length === 0) return "";
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i+1];
        
        const cp1x = p1.x;
        const cp1y = p1.y + 80;
        const cp2x = p2.x;
        const cp2y = p2.y - 80;
        
        path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return path;
  }, [points]);

  const mapHeight = points.length > 0 ? points[points.length - 1].y + 300 : 600;

  // Safe access for selected plan day (Preview Modal)
  const selectedDayData = selectedPreview !== null && workoutPlan ? workoutPlan[selectedPreview % workoutPlan.length] : null;

  return (
    <>
        <div className="relative w-full h-[600px] bg-black/40 border border-gray-800 rounded-xl overflow-hidden backdrop-blur-sm group select-none shadow-inner transform-gpu">
            
            {/* Header Overlay */}
            <div className="absolute top-0 left-0 w-full p-4 z-20 pointer-events-none bg-gradient-to-b from-black/80 to-transparent">
                <h3 className="text-white font-mono font-bold tracking-widest flex items-center gap-2">
                    <Activity size={16} className="text-system-neon" /> MISSION MAP
                </h3>
            </div>

            {/* Scrollable Container */}
            <div 
                ref={containerRef}
                className="absolute inset-0 overflow-y-auto scrollbar-hide flex justify-center overflow-x-hidden"
                style={{ scrollBehavior: 'smooth' }}
            >
                 {/* Map Content Wrapper centered horizontally */}
                 <div className="relative w-full max-w-md h-full" style={{ height: `${mapHeight}px` }}>
                    
                    {/* Background Grid */}
                    <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(0,210,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,210,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

                    {/* SVG Path */}
                    <svg className="absolute top-0 left-1/2 -translate-x-1/2 w-[350px] md:w-[400px] h-full pointer-events-none z-0 overflow-visible">
                        <defs>
                            <linearGradient id="pathGradient" x1="0" x2="0" y1="0" y2="1">
                                <stop offset="0%" stopColor="#00d2ff" stopOpacity="0.8"/>
                                <stop offset={`${(completedDays / totalDays) * 100}%`} stopColor="#00d2ff" stopOpacity="0.8"/>
                                <stop offset={`${(completedDays / totalDays) * 100 + 5}%`} stopColor="#333" stopOpacity="0.3"/>
                                <stop offset="100%" stopColor="#333" stopOpacity="0.3"/>
                            </linearGradient>
                        </defs>
                        
                        <motion.path 
                            d={svgPath}
                            fill="none"
                            stroke="#00d2ff"
                            strokeWidth="12"
                            strokeOpacity="0.15"
                            strokeLinecap="round"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 2, ease: "easeInOut" }}
                        />
                        
                        <motion.path 
                            d={svgPath}
                            fill="none"
                            stroke="url(#pathGradient)"
                            strokeWidth="4"
                            strokeLinecap="round"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 2, ease: "easeInOut" }}
                        />
                    </svg>

                    {/* Floating Key Reward Checkpoints between nodes */}
                    {points.map((point, index) => {
                        if (!point.isCheckpoint) return null;
                        const prevPoint = index > 0 ? points[index - 1] : point;
                        const midY = (prevPoint.y + point.y) / 2;
                        const midX = (prevPoint.x + point.x) / 2;
                        const isClaimed = index < completedDays;
                        return (
                            <div
                                key={`reward-${point.id}`}
                                className="absolute z-30 pointer-events-none"
                                style={{ left: `calc(50% + ${midX}px)`, top: midY, transform: 'translate(-50%, -50%)', opacity: isClaimed ? 1 : 0.6 }}
                            >
                                <div className="relative flex flex-col items-center">
                                    <div className="absolute inset-0 w-10 h-10 rounded-full blur-md" style={{ background: isClaimed ? 'rgba(168,85,247,0.35)' : 'rgba(168,85,247,0.12)', top: -2, left: '50%', transform: 'translateX(-50%)' }} />
                                    <motion.div
                                        animate={{ y: [0, -5, 0] }}
                                        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                                    >
                                        <KeyRound size={22} style={{ color: isClaimed ? '#a855f7' : '#7c3aed80', filter: isClaimed ? 'drop-shadow(0 0 6px rgba(168,85,247,0.6))' : 'none' }} />
                                    </motion.div>
                                    <div className="text-[7px] font-mono font-bold tracking-widest mt-1" style={{ color: isClaimed ? '#a855f7' : '#555' }}>
                                        DAY {index + 1}
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* Streak Milestone Rewards */}
                    {STREAK_MILESTONES.has(streak) && streak > 0 && completedDays > 0 && (
                        <div
                            className="absolute z-30 pointer-events-none"
                            style={{ left: `calc(50% + ${points[Math.min(completedDays, points.length - 1)]?.x || 0}px - 50px)`, top: (points[Math.min(completedDays, points.length - 1)]?.y || 0) - 60, transform: 'translateX(-50%)' }}
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex items-center gap-1 bg-amber-500/20 border border-amber-500/40 rounded-full px-2 py-1"
                            >
                                <Trophy size={10} className="text-amber-400" />
                                <span className="text-[8px] font-mono font-bold text-amber-400">{streak} DAY STREAK</span>
                            </motion.div>
                        </div>
                    )}

                    {/* Nodes */}
                    {points.map((point, index) => {
                        const isMissed = missedSet.has(index);
                        const isCompleted = index < completedDays && !isMissed;
                        const currentDayIndex = completedDays + missedDays.length;
                        const isCurrent = index === currentDayIndex;
                        const isLocked = index > currentDayIndex;
                        const isSelected = selectedPreview === index;
                        const isPlanChange = planChangedAtDay === index;
                        
                        // Get data for this node
                        const nodeData = workoutPlan[index % workoutPlan.length];
                        
                        return (
                            <motion.div
                                key={point.id}
                                ref={isCurrent ? currentDayRef : null}
                                className={`absolute flex flex-col items-center justify-center transition-all duration-300 pointer-events-auto ${isCurrent ? 'z-50' : 'z-10'}`}
                                style={{ 
                                    left: `calc(50% + ${point.x}px)`, 
                                    top: point.y,
                                    x: '-50%',
                                    y: '-50%' 
                                }}
                                initial={false} 
                                animate={{ scale: isSelected ? 1.1 : 1 }}
                            >
                                {/* Node Icon */}
                                <div 
                                    className={`
                                        relative flex items-center justify-center rounded-full transition-all duration-300 cursor-pointer border-4
                                        ${point.isBoss ? 'w-16 h-16 md:w-20 md:h-20' : 'w-12 h-12 md:w-14 md:h-14'}
                                        ${isCompleted ? 'bg-emerald-500 border-emerald-400 text-black shadow-[0_0_20px_rgba(16,185,129,0.6)]' : ''}
                                        ${isMissed ? 'bg-red-600 border-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.5)]' : ''}
                                        ${isCurrent ? 'bg-black border-system-neon text-system-neon shadow-[0_0_40px_rgba(0,210,255,0.5)] animate-pulse' : ''}
                                        ${isLocked && !isMissed ? 'bg-gray-900 border-gray-800 text-gray-600' : ''}
                                        ${isSelected ? 'ring-4 ring-white/50' : ''}
                                        hover:scale-110 active:scale-95
                                    `}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (isCompleted && point.isBoss) {
                                            setShowReward({ id: index, type: point.isFinal ? 'legendary' : 'epic' });
                                            return;
                                        }
                                        // Active node has its own card, only show preview modal for others
                                        if (!isCurrent) setSelectedPreview(index);
                                    }}
                                >
                                    {point.isFinal ? (
                                        <Flag size={24} className="md:w-8 md:h-8" />
                                    ) : point.isBoss ? (
                                        isCompleted ? <Crown size={32} className="md:w-10 md:h-10" /> : isMissed ? <Skull size={32} className="md:w-10 md:h-10 text-red-200" /> : <Skull size={32} className="md:w-10 md:h-10" />
                                    ) : (
                                        isCompleted ? <Check size={20} className="md:w-6 md:h-6" /> : 
                                        isMissed ? <X size={20} className="md:w-6 md:h-6" /> :
                                        isCurrent ? <Swords size={24} className="md:w-8 md:h-8" /> :
                                        <Lock size={16} className="md:w-5 md:h-5" />
                                    )}
                                    {/* Plan change marker — small dot indicator */}
                                    {isPlanChange && (
                                        <div className="absolute -top-1 -right-1 bg-amber-500 rounded-full w-3 h-3 border border-black" />
                                    )}
                                </div>

                                {/* Active Node Glow Ring */}
                                {isCurrent && (
                                    <div className="absolute top-0 left-0 w-full h-full -z-10 rounded-full border-2 border-system-neon opacity-50 animate-ping" />
                                )}

                                {/* --- ACTIVE DAY CARD (Mission Start) --- */}
                                {isCurrent && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        transition={{ delay: 0.3 }}
                                        className="absolute top-full mt-6 bg-[#0a0a0a]/90 backdrop-blur-md border border-system-neon/50 p-4 rounded-xl shadow-[0_0_30px_rgba(0,210,255,0.2)] w-48 flex flex-col items-center text-center z-50 group-hover:border-system-neon transition-colors"
                                    >
                                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-0.5 h-6 bg-system-neon/50" />
                                        
                                        <div className="text-[10px] font-mono text-gray-400 tracking-widest uppercase mb-1">
                                            DAY {index + 1}
                                        </div>
                                        <div className="text-xl font-black text-white italic tracking-tighter uppercase mb-4 leading-none">
                                            {nodeData?.focus || "TRAINING"}
                                        </div>
                                        
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onStartDay(index);
                                            }}
                                            className="w-full bg-system-neon text-black font-bold text-xs py-3 rounded uppercase tracking-wider hover:bg-white transition-colors shadow-[0_0_15px_rgba(0,210,255,0.4)] flex items-center justify-center gap-2"
                                        >
                                            <Play size={12} fill="currentColor" /> START MISSION
                                        </button>
                                    </motion.div>
                                )}

                                {/* Completed Replay Tag */}
                                {isCompleted && !selectedPreview && (
                                    <div className="absolute top-full mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="text-[9px] text-emerald-400 font-mono bg-black/80 px-2 py-1 rounded border border-emerald-800">REPLAY</div>
                                    </div>
                                )}

                                {/* Missed Day Label */}
                                {isMissed && (
                                    <div className="absolute top-full mt-2">
                                        <div className="text-[8px] text-red-400 font-mono bg-red-950/80 px-2 py-0.5 rounded border border-red-800 flex items-center gap-1">
                                            <AlertTriangle size={8} /> MISSED
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}

                    {/* Plan change label — pinned to right edge at the correct Y */}
                    {planChangedAtDay !== undefined && planChangeLabel && planChangedAtDay < points.length && (() => {
                        const pt = points[planChangedAtDay];
                        if (!pt) return null;
                        return (
                            <div
                                className="absolute z-20 pointer-events-none right-2"
                                style={{
                                    top: pt.y,
                                    transform: 'translateY(-50%)',
                                    maxWidth: 110,
                                }}
                            >
                                <div className="bg-amber-950/80 border border-amber-700/40 rounded-md px-1.5 py-1">
                                    <div className="text-[6px] text-amber-400 font-mono font-bold uppercase tracking-wider leading-tight">
                                        Plan Changed
                                    </div>
                                    <div className="text-[6px] text-amber-300/60 font-mono leading-tight truncate">
                                        {planChangeLabel}
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {/* SVG connection for Final Node if not in path */}
                    {/* ... (existing logic handles this fine) */}
                    
                 </div>
            </div>

            <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black to-transparent pointer-events-none z-20" />
            
            {completedDays >= totalDays && (
                 <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 w-full flex justify-center pointer-events-auto">
                     <button 
                        onClick={() => onStartDay(0)} 
                        className="bg-system-neon text-black font-bold px-8 py-4 rounded-full shadow-[0_0_30px_#00d2ff] hover:scale-105 transition-transform font-mono flex items-center gap-2 text-sm"
                     >
                        <Zap size={20} /> NEW GAME+
                     </button>
                 </div>
            )}
        </div>

        {/* 3D Reward Pop-up (For Completed Boss Nodes) */}
        <AnimatePresence>
            {showReward && createPortal(
                <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center p-4 font-mono overflow-hidden">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/95 backdrop-blur-md"
                        onClick={() => setShowReward(null)} 
                    />
                    
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.8, y: 50 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 50 }}
                        transition={{ type: "spring", damping: 20, stiffness: 100 }}
                        className="relative z-10 w-full max-w-[400px] flex flex-col items-center text-center"
                    >
                        <div className="text-[10px] text-system-neon font-black tracking-[0.5em] uppercase mb-4 animate-pulse">
                            {showReward.type === 'legendary' ? 'LEGENDARY CLEAR REWARD' : 'BOSS CLEAR REWARD'}
                        </div>

                        <div className="w-64 h-64 relative mb-8">
                            <div className="absolute inset-0 bg-system-neon/10 rounded-full blur-[50px] animate-pulse" />
                            <div className="absolute inset-0 w-full h-full rounded-full border border-system-neon/30" style={{ boxShadow: '0 0 40px rgba(0,210,255,0.2) inset' }}>
                                <Canvas camera={{ position: [0, 0, 4], fov: 45 }}>
                                    <ambientLight intensity={0.5} />
                                    <pointLight position={[10, 10, 10]} intensity={1.5} />
                                    <pointLight position={[-10, -10, -10]} intensity={0.5} color="#00d2ff" />
                                    <Fallback3DReward />
                                    <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={2} />
                                    <Environment preset="city" />
                                </Canvas>
                            </div>
                        </div>

                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-2 drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
                            {showReward.type === 'legendary' ? "THE MONARCH'S CORE" : "SHADOW FRAGMENT"}
                        </h2>
                        <p className="text-sm text-gray-400 mb-8 max-w-xs leading-relaxed">
                            A crystallized fragment of your intense effort and dedication. It pulses with physical power.
                        </p>

                        <button 
                            onClick={() => setShowReward(null)}
                            className="w-full max-w-[240px] py-4 bg-system-neon text-black font-black text-sm uppercase tracking-widest rounded-xl hover:bg-white hover:scale-105 transition-all shadow-[0_0_30px_rgba(0,210,255,0.4)]"
                        >
                            CLAIM REWARD
                        </button>
                    </motion.div>
                </div>,
                document.body
            )}
        </AnimatePresence>

        {/* Preview Pop-up (For Locked or Completed Nodes) */}
        <AnimatePresence>
            {selectedPreview !== null && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 font-mono">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        onClick={() => setSelectedPreview(null)} 
                    />
                    
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative z-10 w-full max-w-[320px] bg-[#0a0a0a] border border-gray-700 rounded-2xl p-6 shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col items-center text-center"
                    >
                        <button 
                          onClick={() => setSelectedPreview(null)}
                          className="absolute top-4 right-4 text-gray-600 hover:text-white transition-colors"
                        >
                          <X size={20} />
                        </button>

                        <div className="mb-6 relative">
                            <div className={`w-16 h-16 rounded-full border-2 bg-black flex items-center justify-center relative z-10 ${selectedPreview < completedDays ? 'border-system-success' : 'border-gray-800'}`}>
                                {selectedPreview < completedDays ? <Check size={28} className="text-system-success" /> : <Lock size={28} className="text-gray-500" />}
                            </div>
                        </div>

                        <div className="w-full border-t border-gray-800 pt-6 relative">
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#0a0a0a] px-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                DAY {selectedPreview + 1}
                            </div>

                            <h2 className="text-3xl font-black italic text-white uppercase tracking-tighter mb-6 mt-2">
                                {selectedDayData?.focus || "REST"}
                            </h2>

                            {/* Conditional Intel Display: Only show exercises if NOT LOCKED */}
                            {selectedPreview < completedDays ? (
                                <div className="w-full bg-gray-900/30 rounded-lg border border-gray-800 p-3 mb-6 text-left max-h-[120px] overflow-y-auto custom-scrollbar">
                                    <div className="text-[9px] text-gray-500 uppercase font-bold mb-2 tracking-wider sticky top-0 bg-[#0d0d0d]/90 backdrop-blur-sm pb-1 border-b border-gray-800">Protocol Intel</div>
                                    <div className="space-y-1.5">
                                        {selectedDayData?.exercises.map((ex, i) => (
                                            <div key={i} className="flex justify-between items-center text-[10px] text-gray-300">
                                                <span className="truncate pr-2 font-medium">{ex.name}</span>
                                                <span className="text-gray-500 whitespace-nowrap bg-gray-800 px-1.5 rounded">{ex.sets}x{ex.reps}</span>
                                            </div>
                                        )) || <div className="text-gray-600 text-xs italic">No intel available.</div>}
                                    </div>
                                </div>
                            ) : (
                                // LOCKED STATE PLACEHOLDER
                                <div className="w-full bg-gray-900/20 rounded-lg border border-dashed border-gray-800 p-6 mb-6 flex flex-col items-center justify-center gap-2">
                                    <Lock size={20} className="text-gray-600" />
                                    <span className="text-[10px] text-gray-600 font-mono tracking-widest">CLASSIFIED INTEL</span>
                                </div>
                            )}

                            {selectedPreview <= completedDays ? (
                                <button 
                                    onClick={() => {
                                        onStartDay(selectedPreview);
                                        setSelectedPreview(null);
                                    }}
                                    className="w-full py-4 bg-white text-black font-black text-sm uppercase tracking-widest rounded-lg hover:bg-gray-200 transition-all flex items-center justify-center gap-2 group"
                                >
                                    <Play size={16} fill="currentColor" />
                                    REPLAY MISSION
                                </button>
                            ) : (
                                <button disabled className="w-full py-4 bg-gray-900/50 text-gray-600 font-bold text-sm uppercase tracking-widest rounded-lg cursor-not-allowed border border-gray-800 flex items-center justify-center gap-2">
                                    <Lock size={14} /> LOCKED
                                </button>
                            )}
                        </div>
                    </motion.div>
                </div>,
                document.body
            )}
        </AnimatePresence>
    </>
  );
};

export default WorkoutMap;
