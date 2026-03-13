
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Activity, Ruler, Fingerprint, Flame, Target, Check, Sparkles, User, Weight, ChevronRight, ChevronLeft, ShieldCheck, ArrowRight, Clock, TrendingUp, Trash2, Utensils, Camera, Loader2, Save, Droplets, Wheat, Beef, SkipForward, Lock, Key, Cpu, Plus } from 'lucide-react';
import { HealthProfile, WorkoutDay, WorkoutPlan, PlayerData, ProgressPhoto, MealLog, FoodItem, MealType } from '../types';
import ActiveWorkoutPlayer from './ActiveWorkoutPlayer';
import WorkoutMap from './WorkoutMap';
import WorkoutOverview from './WorkoutOverview';
import ProtocolMonthView from './ProtocolMonthView';
import PlanSelector from './PlanSelector';
import CustomPlanBuilder from './CustomPlanBuilder';
import { generateSystemProtocol, calculateTimeEstimate } from '../utils/workoutGenerator';
import { playSystemSoundEffect } from '../utils/soundEngine';

interface HealthViewProps {
  healthProfile?: HealthProfile;
  onSaveProfile: (profile: HealthProfile, identity: string) => void;
  onCompleteWorkout: (exercisesCompleted: number, totalExercises: number, results: Record<string, number>, intensityModifier: boolean) => void;
  onFailWorkout: () => void;
  onAddPhoto?: (photo: ProgressPhoto) => void;
  onDeletePhoto?: (id: string) => void;
  onLogMeal?: (meal: MealLog) => void;
  onDeleteMeal?: (id: string) => void;
  playerData: PlayerData;
  onTutorialAction?: (step: number) => void;
  tutorialStep?: number;
  onToggleNav?: (visible: boolean) => void;
  onConsumeKey: (amount?: number) => Promise<boolean>;
  onAddRewards?: (gold: number, xp: number, keys?: number) => void;
}

// --- OPTIMIZATION SEQUENCE COMPONENT ---
const OptimizationSequence: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
    const [progress, setProgress] = useState(0);
    const [logs, setLogs] = useState<string[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);

    // System Operations Log
    const OPERATIONS = [
        "INITIATING_BIO_SCAN...",
        "ANALYZING_MUSCLE_FIBER_DENSITY...",
        "CALIBRATING_METABOLIC_RATE...",
        "DETECTING_INEFFICIENCIES...",
        "OPTIMIZING_ATP_PRODUCTION...",
        "REWRITING_NEURAL_PATHWAYS...",
        "SYNCHRONIZING_CNS_RESPONSE...",
        "UPGRADING_VO2_MAX_POTENTIAL...",
        "RESTRUCTURING_SKELETAL_FRAME...",
        "UNLOCKING_GENETIC_LIMITERS...",
        "FINALIZING_EVOLUTION_MATRIX..."
    ];

    useEffect(() => {
        let currentProgress = 0;
        let opIndex = 0;
        
        // Sound Loop
        const soundInterval = setInterval(() => {
            if (Math.random() > 0.7) playSystemSoundEffect('TICK');
        }, 150);

        const interval = setInterval(() => {
            // Variable speed simulation (Stalls and Jumps)
            const jump = Math.random() > 0.8 ? 5 : Math.random() > 0.5 ? 2 : 0.5;
            currentProgress += jump;

            // Cap at 100
            if (currentProgress >= 100) {
                currentProgress = 100;
                clearInterval(interval);
                clearInterval(soundInterval);
                playSystemSoundEffect('LEVEL_UP');
                setTimeout(onComplete, 800);
            }

            setProgress(currentProgress);

            // Log Logic - Add logs based on progress thresholds
            const targetLogIndex = Math.floor((currentProgress / 100) * OPERATIONS.length);
            if (targetLogIndex > opIndex && opIndex < OPERATIONS.length) {
                setLogs(prev => [...prev, `> ${OPERATIONS[opIndex]} [OK]`]);
                opIndex++;
                if (scrollRef.current) {
                    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                }
            }

        }, 50); // Fast tick rate for smoothness

        return () => {
            clearInterval(interval);
            clearInterval(soundInterval);
        };
    }, [onComplete]);

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-10 w-full relative overflow-hidden bg-black border border-gray-800 rounded-2xl h-[400px]"
        >
            {/* Background Binary Stream */}
            <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden font-mono text-[10px] leading-3 text-system-neon break-all">
                {Array.from({ length: 2000 }).map(() => Math.round(Math.random())).join('')}
            </div>

            {/* Central HUD */}
            <div className="relative z-10 mb-8">
                <div className="w-32 h-32 relative flex items-center justify-center">
                    {/* Spinning Outer Ring */}
                    <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 rounded-full border-t-2 border-l-2 border-system-neon opacity-80"
                    />
                    {/* Counter Spinning Inner Ring */}
                    <motion.div 
                        animate={{ rotate: -360 }}
                        transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-2 rounded-full border-b-2 border-r-2 border-system-accent opacity-60"
                    />
                    {/* Pulsing Core */}
                    <motion.div 
                        animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="text-white"
                    >
                        <Cpu size={40} />
                    </motion.div>
                </div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] font-black text-system-neon mt-20 tracking-widest bg-black px-2">
                    {Math.floor(progress)}%
                </div>
            </div>

            {/* Main Progress Bar */}
            <div className="w-64 space-y-2 relative z-10">
                <div className="flex justify-between text-[10px] font-mono text-system-neon/70 uppercase">
                    <span>System Optimization</span>
                    <span>{progress < 100 ? 'Processing...' : 'Complete'}</span>
                </div>
                <div className="h-2 bg-gray-900 rounded-full overflow-hidden border border-gray-800 relative">
                    {/* Glitchy Bar */}
                    <motion.div 
                        className="h-full bg-system-neon shadow-[0_0_15px_#00d2ff]"
                        style={{ width: `${progress}%` }}
                    />
                    {/* Scan Line on Bar */}
                    <motion.div 
                        animate={{ x: [-100, 300] }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="absolute top-0 bottom-0 w-10 bg-white/30 skew-x-12"
                    />
                </div>
            </div>

            {/* Terminal Logs */}
            <div 
                ref={scrollRef}
                className="mt-6 w-full max-w-xs h-24 overflow-y-hidden bg-black/50 border border-gray-800 rounded p-2 font-mono text-[9px] text-green-500 relative z-10"
            >
                <div className="flex flex-col justify-end min-h-full">
                    {logs.map((log, i) => (
                        <div key={i} className="truncate">{log}</div>
                    ))}
                    <div className="animate-pulse">_</div>
                </div>
            </div>
        </motion.div>
    );
};

// --- HELPER COMPONENTS ---

const BMIGauge = ({ value }: { value: number }) => {
    const clamped = Math.min(40, Math.max(15, value));
    const percentage = (clamped - 15) / (40 - 15);
    const rotation = -90 + (percentage * 180);

    return (
        <div className="relative w-24 h-12 overflow-hidden">
            <div className="absolute top-0 left-0 w-24 h-24 rounded-full border-[6px] border-gray-800 border-t-system-neon border-r-gray-800 border-b-gray-800 border-l-system-neon transform rotate-[-45deg]" />
            <motion.div 
                initial={{ rotate: -90 }}
                animate={{ rotate: rotation }}
                transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
                className="absolute bottom-0 left-1/2 w-1 h-12 bg-white origin-bottom rounded-full z-10"
                style={{ marginLeft: '-2px' }}
            >
                <div className="w-2 h-2 bg-white rounded-full absolute bottom-0 left-1/2 -translate-x-1/2 shadow-[0_0_10px_white]" />
            </motion.div>
            <div className="absolute bottom-0 w-full text-center">
                <span className="text-[9px] text-gray-500 font-mono">15</span>
                <span className="absolute right-0 text-[9px] text-gray-500 font-mono">40</span>
            </div>
        </div>
    );
};

const BMRWave = () => (
    <div className="relative w-24 h-12 flex items-center justify-center overflow-hidden bg-gray-900/30 rounded-lg border border-gray-800">
        <Activity className="text-system-accent animate-pulse" />
    </div>
);

const DurationGraph = () => (
    <div className="flex items-end gap-1 h-12 w-24">
        {[0.4, 0.7, 0.5, 0.9, 0.6, 0.8].map((h, i) => (
            <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${h * 100}%` }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className={`flex-1 rounded-t-sm ${i % 2 === 0 ? 'bg-system-accent' : 'bg-gray-700'}`}
            />
        ))}
    </div>
);

const CircularCalibration = ({ percent }: { percent: number }) => {
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percent / 100) * circumference;

    return (
        <div className="relative w-64 h-64 flex items-center justify-center p-4">
            {/* Outer Decorative Ring */}
            <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-full border border-dashed border-gray-800"
            />
            
            {/* Inner Decorative Ring - Spaced Inwards */}
            <motion.div 
                animate={{ rotate: -360 }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                className="absolute inset-8 rounded-full border border-gray-800/50"
            />

            {/* Progress SVG - Centered with Padding */}
            <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-48 h-48 -rotate-90 drop-shadow-[0_0_15px_rgba(0,210,255,0.2)]" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r={radius} stroke="#1f2937" strokeWidth="6" fill="none" strokeOpacity={0.5} />
                    <motion.circle 
                        cx="60" cy="60" r={radius} 
                        stroke="#00d2ff" 
                        strokeWidth="6" 
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        animate={{ strokeDashoffset: offset }}
                        transition={{ ease: "linear" }}
                    />
                </svg>
            </div>

            {/* Inner Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-10">
                <div className="text-5xl font-black text-white tabular-nums tracking-tighter">
                    {percent}%
                </div>
                <div className="text-[10px] text-system-neon font-bold tracking-[0.3em] uppercase mt-2 animate-pulse">
                    Analyzing
                </div>
            </div>
        </div>
    );
};

const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians))
  };
};

const TechRadar = React.memo(({ data, color, label, isAnimating, showEntrance = false }: { data: { value: number; fullMark: number; subject: string }[], color: string, label: string, isAnimating?: boolean, showEntrance?: boolean }) => {
    const size = 320;
    const center = size / 2;
    const radius = 100;
    const gridLevels = 4;
    const DOT_STAGGER = 0.2;
    const LINE_DELAY = data.length * DOT_STAGGER; 
    const FILL_DELAY = LINE_DELAY + 0.8;
    const gradientId = useMemo(() => `radarFill-${label.replace(/[^a-z0-9]/gi, '')}`, [label]);

    const gridPaths = useMemo(() => {
        const paths = [];
        for (let level = 1; level <= gridLevels; level++) {
            const levelRadius = (radius / gridLevels) * level;
            const pts = data.map((_, i) => {
                const angle = (360 / data.length) * i;
                const { x, y } = polarToCartesian(center, center, levelRadius, angle);
                return `${x},${y}`;
            });
            paths.push(pts.join(' '));
        }
        return paths;
    }, [data.length, radius, center]);

    const axesLines = useMemo(() => {
        return data.map((_, i) => {
            const angle = (360 / data.length) * i;
            const { x, y } = polarToCartesian(center, center, radius, angle);
            return { x1: center, y1: center, x2: x, y2: y };
        });
    }, [data.length, radius, center]);

    const points = data.map((d, i) => {
        const angle = (360 / data.length) * i;
        const valRadius = (d.value / d.fullMark) * radius;
        return polarToCartesian(center, center, valRadius, angle);
    });

    const pathD = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ') + ' Z';

    return (
        <div className="relative flex flex-col items-center justify-center w-full h-full font-mono">
            <h3 className="text-sm font-bold mb-6 tracking-[0.4em] uppercase transition-colors duration-300" style={{ color }}>{label}</h3>
            <svg width={size} height={size} className="overflow-visible">
                <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity={0.8}/>
                        <stop offset="100%" stopColor={color} stopOpacity={0.3}/>
                    </linearGradient>
                    <filter id="glow"><feGaussianBlur stdDeviation="3.5" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                </defs>
                {gridPaths.map((pts, i) => <polygon key={`grid-${i}`} points={pts} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="4 4" />)}
                {axesLines.map((line, i) => <line key={`axis-${i}`} {...line} stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="4 4" />)}
                <motion.path d={pathD} fill={`url(#${gradientId})`} stroke="none" initial={showEntrance ? { opacity: 0 } : { opacity: 1 }} animate={{ opacity: 1 }} transition={{ delay: showEntrance ? FILL_DELAY : 0, duration: 0.8 }} />
                <motion.path d={pathD} fill="none" stroke={color} strokeWidth="3" filter="url(#glow)" initial={showEntrance ? { pathLength: 0, opacity: 0 } : { pathLength: 1, opacity: 1 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ pathLength: { delay: showEntrance ? LINE_DELAY : 0, duration: 1.0, ease: "easeInOut" }, opacity: { delay: showEntrance ? LINE_DELAY : 0, duration: 0.2 } }} />
                {data.map((d, i) => {
                     const angle = (360 / data.length) * i;
                     const labelPos = polarToCartesian(center, center, radius + 30, angle);
                     const point = points[i];
                     return (
                        <g key={i}>
                             <motion.text initial={showEntrance ? { opacity: 0, scale: 0.5 } : { opacity: 1, scale: 1 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: showEntrance ? i * DOT_STAGGER : 0 }} x={labelPos.x} y={labelPos.y} textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.5)" fontSize="9" fontWeight="bold" letterSpacing="1px" className="uppercase font-mono">{d.subject}</motion.text>
                             <motion.circle initial={showEntrance ? { r: 0, opacity: 0 } : { r: 4, opacity: 1 }} animate={{ r: 4, opacity: 1, cx: point.x, cy: point.y }} transition={{ r: { delay: showEntrance ? i * DOT_STAGGER : 0, type: "spring" }, opacity: { delay: showEntrance ? i * DOT_STAGGER : 0, duration: 0.2 }, cx: { duration: isAnimating ? 0 : 0.5 }, cy: { duration: isAnimating ? 0 : 0.5 } }} cx={point.x} cy={point.y} fill={color} stroke="#000" strokeWidth={1.5}/>
                        </g>
                     );
                })}
            </svg>
        </div>
    );
});

// --- HELPER FUNCTIONS ---

const calculateNutritionPlan = (profile: Partial<HealthProfile>) => {
  const weight = profile.weight || 70;
  const height = profile.height || 175;
  const age = profile.age || 25;
  const gender = profile.gender || 'MALE';
  const activity = profile.activityLevel || 'MODERATE';
  const goal = profile.goal || 'RECOMP';
  let bmr = (10 * weight) + (6.25 * height) - (5 * age);
  if (gender === 'MALE') bmr += 5;
  else if (gender === 'FEMALE') bmr -= 161;
  const multipliers: Record<string, number> = { 'SEDENTARY': 1.2, 'LIGHT': 1.375, 'MODERATE': 1.55, 'VERY_ACTIVE': 1.725 };
  const tdee = bmr * (multipliers[activity] || 1.55);
  let targetCalories = tdee;
  if (goal === 'LOSE_WEIGHT') targetCalories -= 500;
  else if (goal === 'BUILD_MUSCLE') targetCalories += 300;
  const protein = Math.round(weight * 2.2);
  const fats = Math.round((targetCalories * 0.25) / 9);
  const carbs = Math.round((targetCalories - (protein * 4) - (fats * 9)) / 4);
  return { bmr: Math.round(bmr), macros: { protein, fats, carbs, calories: Math.round(targetCalories) }, tdee: Math.round(tdee) };
};

const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { label: 'Underweight', color: 'text-yellow-500' };
    if (bmi < 25) return { label: 'Healthy Weight', color: 'text-system-success' };
    if (bmi < 30) return { label: 'Overweight', color: 'text-orange-500' };
    if (bmi < 40) return { label: 'Obesity', color: 'text-red-500' };
    return { label: 'Severe Obesity', color: 'text-red-700' };
};

const lerp = (start: number, end: number, t: number) => start * (1 - t) + end * t;
const lerpColor = (a: string, b: string, amount: number) => { 
    const ah = parseInt(a.replace(/#/g, ''), 16), ar = ah >> 16, ag = ah >> 8 & 0xff, ab = ah & 0xff, bh = parseInt(b.replace(/#/g, ''), 16), br = bh >> 16, bg = bh >> 8 & 0xff, bb = bh & 0xff, rr = ar + amount * (br - ar), rg = ag + amount * (bg - ag), rb = ab + amount * (bb - ab);
    return '#' + ((1 << 24) + (Math.round(rr) << 16) + (Math.round(rg) << 8) + Math.round(rb)).toString(16).slice(1);
}

const setupContainerVariants: Variants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } }, exit: { opacity: 0, x: -20, transition: { duration: 0.2 } } };
const setupItemVariants: Variants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } };

// --- MAIN EXPORTED COMPONENT ---

const GeneratingMessage: React.FC<{ messages: string[] }> = ({ messages }) => {
    const [idx, setIdx] = useState(0);
    useEffect(() => {
        const t = setInterval(() => setIdx(p => (p + 1) % messages.length), 2000);
        return () => clearInterval(t);
    }, [messages.length]);
    return (
        <AnimatePresence mode="wait">
            <motion.div key={idx}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.35 }}
                className="text-[12px] text-gray-400 font-mono text-center min-h-[20px]"
            >
                {messages[idx]}
            </motion.div>
        </AnimatePresence>
    );
};

export const HealthView: React.FC<HealthViewProps> = ({ 
  healthProfile, onSaveProfile, onCompleteWorkout, onFailWorkout, onLogMeal, onDeleteMeal: _onDeleteMeal, playerData, onToggleNav, onConsumeKey, onAddRewards
}) => {
  const [viewMode, setViewMode] = useState<'MAP' | 'OVERVIEW' | 'ACTIVE' | 'SETUP' | 'PROCESSING' | 'DIAGNOSIS' | 'PROJECTION' | 'FINALIZING' | 'PLAN_SELECT'>('MAP');
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [showAIConfirm, setShowAIConfirm] = useState(false);
  const [aiPlanError, setAiPlanError] = useState<string | null>(null);
  const [planCompleteData, setPlanCompleteData] = useState<{ name: string; dayCount: number } | null>(null);
  const [showCustomPlanBuilder, setShowCustomPlanBuilder] = useState(false);
  const [premadePlans, setPremadePlans] = useState<WorkoutPlan[]>([]);
  const [customPlans, setCustomPlans] = useState<any[]>([]);
  const [aiConfirmStep, setAiConfirmStep] = useState<0 | 1 | 2>(0);
  const [aiDaysPerWeek, setAiDaysPerWeek] = useState(4);
  const [aiSessionDuration, setAiSessionDuration] = useState(45);
  const [streakAnimKey, setStreakAnimKey] = useState(0);
  const prevStreakRef = useRef(playerData.streak);
  const [activeTab, setActiveTab] = useState<'WORKOUT' | 'NUTRITION' | 'BODY'>('WORKOUT');
  
  // Track if user skipped setup
  const [skippedSetup, setSkippedSetup] = useState(false);

  // Projection Animation States
  const [transformProgress, setTransformProgress] = useState(0);
  const [processingPercent, setProcessingPercent] = useState(0);
  const [isTransformed, setIsTransformed] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<number | null>(null);
  const processingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finalizingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [activePlan, setActivePlan] = useState<WorkoutDay | null>(null);
  const [step, setStep] = useState(1);
  const TOTAL_STEPS = 9;
  const [formData, setFormData] = useState<Partial<HealthProfile>>({
      gender: 'MALE', activityLevel: 'MODERATE', goal: 'RECOMP', equipment: 'GYM', workoutSplit: 'CLASSIC', age: 25, height: 175, weight: 70, targetWeight: 70
  });
  const [finalizingLog, setFinalizingLog] = useState("Initializing...");

  // --- NUTRITION SCANNER STATE ---
  const [scanState, setScanState] = useState<'IDLE' | 'SCANNING' | 'RESULT' | 'ERROR'>('IDLE');
  const [scannedImage, setScannedImage] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<FoodItem | null>(null);
  const [scanItems, setScanItems] = useState<any[]>([]);
  const [scanError, setScanError] = useState<string | null>(null);
  const [selectedMealType, setSelectedMealType] = useState<MealType>('LUNCH');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loadingMessage, setLoadingMessage] = useState("ANALYSING IMAGE...");
  const [showMicros, setShowMicros] = useState(false);
  
  // Keys Alert State
  const [showKeyAlert, setShowKeyAlert] = useState(false);

  const projectedIncrease = useMemo(() => {
      if (playerData.username) {
          let hash = 0;
          for (let i = 0; i < playerData.username.length; i++) { hash = playerData.username.charCodeAt(i) + ((hash << 5) - hash); }
          const normalized = Math.abs(hash) % 11; 
          return 60 + normalized;
      }
      return Math.floor(Math.random() * 11) + 60;
  }, [playerData.username]);

  const dailyIntake = useMemo(() => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      return (playerData.nutritionLogs || [])
        .filter(log => log.timestamp >= todayStart.getTime())
        .reduce((acc, log) => ({ calories: acc.calories + log.totalCalories, protein: acc.protein + log.totalProtein, carbs: acc.carbs + log.totalCarbs, fats: acc.fats + log.totalFats }), { calories: 0, protein: 0, carbs: 0, fats: 0 });
  }, [playerData.nutritionLogs]);

  useEffect(() => {
      if (onToggleNav) {
          const hideNavModes = ['SETUP', 'PROCESSING', 'DIAGNOSIS', 'PROJECTION', 'FINALIZING'];
          const forceHide = showAIConfirm || isGeneratingPlan || !!planCompleteData || showCustomPlanBuilder;
          onToggleNav(!hideNavModes.includes(viewMode) && !forceHide);
      }
  }, [viewMode, onToggleNav, showAIConfirm, isGeneratingPlan, planCompleteData, showCustomPlanBuilder]);

  useEffect(() => { 
      // Only force setup if profile missing AND not skipped
      if (!healthProfile && !skippedSetup) setViewMode('SETUP'); 
  }, [healthProfile, skippedSetup]);

  // Scanner Logic
  useEffect(() => {
      let interval: ReturnType<typeof setInterval>;
      if (scanState === 'SCANNING') {
          const messages = [ "ANALYSING IMAGE...", "GETTING MACROS...", "DON'T CHANGE THE TAB...", "DOING MAGIC...", "FINALIZING..." ];
          let i = 0;
          setLoadingMessage(messages[0]);
          interval = setInterval(() => { i++; if (i < messages.length) { setLoadingMessage(messages[i]); } }, 4500);
      }
      return () => { if (interval) clearInterval(interval); };
  }, [scanState]);

  // Fetch premade plans for the workout tab
  useEffect(() => {
      fetch('/api/workout/plans')
          .then(r => r.json())
          .then(data => setPremadePlans(Array.isArray(data) ? data : []))
          .catch(() => {});
  }, []);

  // Fetch user custom plans (manual + AI saved)
  useEffect(() => {
      if (!playerData.userId || playerData.userId.startsWith('local-') || playerData.userId.startsWith('local_')) return;
      fetch('/api/workout/custom-plans', { credentials: 'include' })
          .then(r => r.ok ? r.json() : [])
          .then(data => setCustomPlans(Array.isArray(data) ? data : []))
          .catch(() => {});
  }, [playerData.userId]);

  // Trigger streak pop animation when streak increases
  useEffect(() => {
      if (playerData.streak > prevStreakRef.current) {
          setStreakAnimKey(k => k + 1);
      }
      prevStreakRef.current = playerData.streak;
  }, [playerData.streak]);

  // --- WORKOUT PLAN CALCULATION ---
  const calculatedPlan = useMemo(() => {
      const profileToUse = healthProfile || formData;
      if (profileToUse.workoutPlan && Array.isArray(profileToUse.workoutPlan) && profileToUse.workoutPlan.length > 0) {
          return profileToUse.workoutPlan;
      }
      return generateSystemProtocol(profileToUse as HealthProfile, playerData.customProtocols);
  }, [healthProfile, formData, playerData.customProtocols]);

  const nutritionInfo = useMemo(() => calculateNutritionPlan(healthProfile || formData), [healthProfile, formData]);
  
  const rawBMI = useMemo(() => (formData.weight && formData.height) ? (formData.weight / ((formData.height/100) ** 2)) : 0, [formData.weight, formData.height]);
  const currentBMI = rawBMI.toFixed(1);
  const bmiCategory = useMemo(() => getBMICategory(rawBMI), [rawBMI]);
  const estimatedTimeStr = useMemo(() => calculateTimeEstimate(healthProfile || formData), [healthProfile, formData]);

  const startProcessing = () => {
      if (processingIntervalRef.current) clearInterval(processingIntervalRef.current);
      setViewMode('PROCESSING');
      setProcessingPercent(0);
      let p = 0;
      processingIntervalRef.current = setInterval(() => {
          p += 1;
          setProcessingPercent(p);
          if (p >= 100) { clearInterval(processingIntervalRef.current!); processingIntervalRef.current = null; setTimeout(() => setViewMode('DIAGNOSIS'), 500); }
      }, 40);
  };

  const startJourneySequence = () => {
      if (finalizingIntervalRef.current) clearInterval(finalizingIntervalRef.current);
      setViewMode('FINALIZING');
      const sequence = ["BIOLOGICAL RESTRUCTURING...", "NEURAL SYNCING...", "CONSTRUCTING PROTOCOLS...", "SELECT YOUR PROGRAM."];
      let i = 0;
      finalizingIntervalRef.current = setInterval(() => {
          if (i < sequence.length) { setFinalizingLog(sequence[i]); i++; } 
          else {
              clearInterval(finalizingIntervalRef.current!); finalizingIntervalRef.current = null;
              setTimeout(() => {
                const fullProfile = { ...formData, bmi: parseFloat(currentBMI), bmr: nutritionInfo.bmr, macros: nutritionInfo.macros, injuries: [], category: 'Hunter', startingWeight: formData.weight } as HealthProfile;
                onSaveProfile(fullProfile, "Shadow Vessel");
                setViewMode('PLAN_SELECT');
              }, 2000);
          }
      }, 1500); 
  };

  // Cleanup leak-prone intervals on unmount
  useEffect(() => {
      return () => {
          if (processingIntervalRef.current) clearInterval(processingIntervalRef.current);
          if (finalizingIntervalRef.current) clearInterval(finalizingIntervalRef.current);
      };
  }, []);

  const handleSelectPlan = (plan: WorkoutPlan) => {
      const days = Array.isArray(plan.days) ? plan.days : [];
      const updated = { ...(healthProfile || formData as HealthProfile), workoutPlan: days, selectedPlanId: plan.id, selectedPlanName: plan.name } as HealthProfile;
      onSaveProfile(updated, updated.category || 'Hunter');
      setViewMode('MAP');
  };

  const handleGenerateAIPlan = async () => {
      const isFirstTime = !(healthProfile as any)?.aiPlanUsed;
      if (!isFirstTime && playerData.keys < 5) {
          setAiPlanError('You need 5 keys to generate an AI plan. Complete quests to earn more keys.');
          return;
      }
      if (!isFirstTime) {
          const consumed = await onConsumeKey();
          if (!consumed) { setAiPlanError('Failed to consume keys. Please try again.'); return; }
          await onConsumeKey();
          await onConsumeKey();
          await onConsumeKey();
          await onConsumeKey();
      }
      setAiPlanError(null);
      setIsGeneratingPlan(true);
      setShowAIConfirm(false);
      try {
          const profile = healthProfile || formData;
          const res = await fetch('/api/workout/generate-ai', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                  goal: profile.goal,
                  equipment: profile.equipment || 'GYM',
                  difficulty: 'INTERMEDIATE',
                  fitnessLevel: (profile as any).activityLevel || 'INTERMEDIATE',
                  daysPerWeek: aiDaysPerWeek,
                  sessionDuration: aiSessionDuration,
                  weight: profile.weight || 70,
                  age: profile.age || 25,
                  gender: profile.gender || 'MALE',
              }),
          });
          if (!res.ok) {
              const errData = await res.json().catch(() => ({}));
              throw new Error(errData.error || 'AI generation failed');
          }
          const data = await res.json();
          const planDays: WorkoutDay[] = Array.isArray(data.days) ? data.days.map((d: any) => ({
              day: d.day || 'DAY',
              focus: d.focus || 'WORKOUT',
              exercises: Array.isArray(d.exercises) ? d.exercises.map((e: any) => ({
                  name: e.name || 'Exercise',
                  sets: e.sets || 3,
                  reps: e.reps || '10',
                  type: e.type || 'COMPOUND',
                  notes: e.notes || '',
                  videoUrl: e.videoUrl || '',
                  completed: false,
                  duration: e.duration || 0,
              })) : [],
              isRecovery: !!d.isRecovery,
              totalDuration: d.totalDuration || aiSessionDuration,
          })) : [];
          const planName = data.planName || 'AI Generated Plan';
          const updated = {
              ...(healthProfile || formData as HealthProfile),
              workoutPlan: planDays,
              selectedPlanId: undefined,
              selectedPlanName: planName,
              aiPlanUsed: true,
              aiGeneratedPlan: planDays,
              aiGeneratedPlanName: planName,
          } as HealthProfile;
          onSaveProfile(updated, updated.category || 'Hunter');
          // Persist to user_custom_plans table (won't be erased on plan switches)
          try {
              const saved = await fetch('/api/workout/custom-plans', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  credentials: 'include',
                  body: JSON.stringify({ name: planName, days: planDays, plan_type: 'AI' }),
              });
              if (saved.ok) {
                  const savedData = await saved.json();
                  setCustomPlans(prev => [savedData, ...prev.filter(p => p.plan_type !== 'AI')]);
              }
          } catch (_) {}
          // Show confetti completion screen
          setPlanCompleteData({ name: planName, dayCount: planDays.length });
      } catch (err: any) {
          console.error('AI plan generation error:', err);
          setAiPlanError(err.message || 'AI generation failed. Please try again.');
          setAiConfirmStep(2);
          setShowAIConfirm(true);
      } finally {
          setIsGeneratingPlan(false);
      }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (playerData.keys <= 0) {
          setShowKeyAlert(true);
          e.target.value = '';
          return;
      }

      const file = e.target.files?.[0];
      if (!file) return;

      const keyConsumed = await onConsumeKey();
      if (!keyConsumed) {
          setShowKeyAlert(true);
          e.target.value = '';
          return;
      }

      setScanError(null);
      setShowMicros(false);
      setScanState('SCANNING');

      const dataUrlReader = new FileReader();
      dataUrlReader.onload = (event) => { setScannedImage(event.target?.result as string); };
      dataUrlReader.readAsDataURL(file);

      try {
          const base64Reader = new FileReader();
          const imageBase64 = await new Promise<string>((resolve, reject) => {
              base64Reader.onload = (ev) => {
                  const result = ev.target?.result as string;
                  resolve(result.split(',')[1]);
              };
              base64Reader.onerror = reject;
              base64Reader.readAsDataURL(file);
          });

          const response = await fetch('/api/nutrition/analyze', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ imageBase64, mimeType: file.type }),
          });

          if (!response.ok) {
              const errData = await response.json().catch(() => ({ error: 'Analysis failed' }));
              throw new Error(errData.error || `Server error ${response.status}`);
          }

          const { data } = await response.json();

          const mappedResult: FoodItem = {
              id: 'scan_' + Date.now(),
              name: data.name || 'Analyzed Meal',
              calories: Math.round(data.calories || 0),
              protein: Math.round(data.protein_g || 0),
              carbs: Math.round(data.carbs_g || 0),
              fats: Math.round(data.fats_g || 0),
              servingSize: data.serving_size || '1 meal',
              fiber: data.fiber_g != null ? Math.round(data.fiber_g * 10) / 10 : undefined,
              sugar: data.sugar_g != null ? Math.round(data.sugar_g * 10) / 10 : undefined,
              sodium: data.sodium_mg != null ? Math.round(data.sodium_mg) : undefined,
              vitaminA: data.vitamin_a_dv != null ? Math.round(data.vitamin_a_dv) : undefined,
              vitaminC: data.vitamin_c_dv != null ? Math.round(data.vitamin_c_dv) : undefined,
              vitaminD: data.vitamin_d_dv != null ? Math.round(data.vitamin_d_dv) : undefined,
              vitaminB12: data.vitamin_b12_dv != null ? Math.round(data.vitamin_b12_dv) : undefined,
              calcium: data.calcium_dv != null ? Math.round(data.calcium_dv) : undefined,
              iron: data.iron_dv != null ? Math.round(data.iron_dv) : undefined,
              potassium: data.potassium_mg != null ? Math.round(data.potassium_mg) : undefined,
              ingredients: Array.isArray(data.ingredients) ? data.ingredients : [],
              aiConfidence: data.confidence || 'Medium',
          };

          setScanResult(mappedResult);
          setScanItems([]);
          setScanState('RESULT');
      } catch (error) {
          const msg = error instanceof Error ? error.message : 'Analysis failed';
          console.error('[Nutrition Scanner]', msg);
          setScanError(msg);
          setScanState('ERROR');
          onAddRewards?.(0, 0, 1);
      }
  };

  const confirmLog = () => {
      if (onLogMeal && scanResult) {
          const detailedItems = scanItems.map((item, idx) => ({ id: `scan_item_${idx}_${Date.now()}`, name: item.name, calories: item.calories, protein: item.protein, carbs: item.carbs, fats: item.fat, servingSize: item.quantity, quantity: 1 }));
          onLogMeal({ id: Math.random().toString(36).substr(2, 9), label: scanResult.name, items: detailedItems.length > 0 ? detailedItems : [{ ...scanResult, quantity: 1 }], totalCalories: scanResult.calories, totalProtein: scanResult.protein, totalCarbs: scanResult.carbs, totalFats: scanResult.fats, timestamp: Date.now(), imageUrl: scannedImage || undefined, mealType: selectedMealType });
          resetScanner();
      }
  };

  const resetScanner = () => { setScanState('IDLE'); setScannedImage(null); setScanResult(null); setScanItems([]); setScanError(null); setShowMicros(false); };

  const handleOptimizationComplete = () => {
      setIsTransformed(true);
      setIsAnimating(false);
  };

  const handleAscensionClick = () => {
      setIsAnimating(true);
      let startTime: number | null = null;
      const duration = 3000; 
      const animate = (timestamp: number) => {
          if (!startTime) startTime = timestamp;
          const elapsed = timestamp - startTime;
          const progress = Math.min(elapsed / duration, 1);
          setTransformProgress(progress);
          if (progress < 1) { animationRef.current = requestAnimationFrame(animate); } 
          else { handleOptimizationComplete(); }
      };
      animationRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => { return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); }; }, []);

  // --- RENDER LOGIC ---

  if (viewMode === 'PROCESSING') {
      return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center font-mono p-12 overflow-hidden">
              <div className="relative mb-24 scale-125"><CircularCalibration percent={processingPercent} /></div>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-center space-y-8">
                <div className="text-[9px] text-gray-500 font-mono tracking-widest uppercase mb-4 flex gap-4 justify-center"><span>Load_Buffer_0x692</span><span>Async_Success</span></div>
                <div className="mt-8 h-6 overflow-hidden w-64 mx-auto border-t border-gray-900/50 pt-2 relative">
                    <div className="absolute inset-0 bg-gradient-to-b from-black to-transparent z-10 pointer-events-none opacity-50" />
                    <motion.div animate={{ y: -80 }} transition={{ duration: 4, ease: "linear" }} className="text-[9px] text-system-neon/70 space-y-1 text-center"><div>MAPPING EXERCISE REGISTRY</div><div>OPTIMIZING NEURAL SYNC LEVEL</div><div>INITIALIZING SHADOW PROTOCOLS</div><div>CALIBRATION COMPLETE</div></motion.div>
                </div>
              </motion.div>
          </motion.div>
      );
  }

  if (viewMode === 'DIAGNOSIS') {
      return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 bg-black/95 overflow-y-auto font-mono">
              <div className="flex min-h-full items-center justify-center p-4">
                <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }} className="w-full max-w-2xl border border-gray-800 p-6 md:p-8 rounded-3xl bg-system-card relative overflow-hidden group shadow-[0_0_50px_rgba(0,0,0,0.5)] my-8">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-system-neon to-transparent opacity-50" />
                    <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="flex justify-between items-start mb-8"><h2 className="text-3xl font-black text-white flex items-center gap-3 tracking-tighter italic"><Fingerprint className="text-system-neon animate-pulse" size={28} /> INITIAL ANALYSIS</h2><div className="text-[10px] text-gray-500 font-bold border border-gray-800 px-3 py-1 rounded">OS_v1.0.42</div></motion.div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.3 }} className="bg-black/50 p-6 rounded-2xl border border-gray-800 hover:border-system-neon/50 transition-all group/card shadow-lg flex flex-col justify-between"><div><div className="text-[10px] text-gray-500 mb-2 uppercase font-bold tracking-widest">BMI Index</div><div className="text-3xl text-white font-black drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">{currentBMI}</div><div className={`text-[9px] font-bold mt-2 uppercase tracking-widest ${bmiCategory.color}`}>{bmiCategory.label}</div></div><div className="mt-4 self-end"><BMIGauge value={parseFloat(currentBMI)} /></div></motion.div>
                        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.4 }} className="bg-black/50 p-6 rounded-2xl border border-gray-800 hover:border-system-neon/50 transition-all group/card shadow-lg flex flex-col justify-between"><div><div className="text-[10px] text-gray-500 mb-2 uppercase font-bold tracking-widest">BMR Status</div><div className="text-3xl text-white font-black drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">{nutritionInfo.bmr}</div><div className="text-[9px] text-gray-600 font-bold mt-2 uppercase tracking-widest">KCAL / DAY</div></div><div className="mt-4 self-end"><BMRWave /></div></motion.div>
                        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.5 }} className="bg-black/50 p-6 rounded-2xl border border-gray-800 hover:border-system-accent/50 transition-all group/card shadow-lg flex flex-col justify-between"><div><div className="text-[10px] text-system-accent mb-2 uppercase font-bold tracking-widest">Est. Duration</div><div className="text-3xl text-white font-black drop-shadow-[0_0_8px_rgba(139,92,246,0.3)]">{estimatedTimeStr.split(' ')[0]}</div><div className="text-[9px] text-system-accent/70 font-bold mt-2 uppercase tracking-widest">WEEKS TO GOAL</div></div><div className="mt-4 self-end"><DurationGraph /></div></motion.div>
                    </div>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="grid grid-cols-2 gap-4 mb-8"><div className="flex items-center gap-2 text-[10px] text-gray-400 uppercase font-bold"><Check size={14} className="text-system-success" /> METABOLIC SYNC STABLE</div><div className="flex items-center gap-2 text-[10px] text-gray-400 uppercase font-bold"><Check size={14} className="text-system-success" /> NEURAL INTERFACE ONLINE</div></motion.div>
                    <motion.button initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.8 }} onClick={() => setViewMode('PROJECTION')} className="w-full py-5 bg-white text-black font-black rounded-2xl shadow-[0_0_30px_white] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-sm">VIEW ASCENSION PROJECTION <ArrowRight size={20} /></motion.button>
                </motion.div>
              </div>
          </motion.div>
      );
  }

  if (viewMode === 'PROJECTION') {
      const lowStats = [ { subject: 'STRENGTH', value: 40, fullMark: 100 }, { subject: 'INTELLIGENCE', value: 50, fullMark: 100 }, { subject: 'FOCUS', value: 30, fullMark: 100 }, { subject: 'SOCIAL', value: 20, fullMark: 100 }, { subject: 'WILLPOWER', value: 60, fullMark: 100 } ];
      const highStatsData = [ { subject: 'STRENGTH', value: 85, fullMark: 100 }, { subject: 'INTELLIGENCE', value: 75, fullMark: 100 }, { subject: 'FOCUS', value: 80, fullMark: 100 }, { subject: 'SOCIAL', value: 65, fullMark: 100 }, { subject: 'WILLPOWER', value: 95, fullMark: 100 } ];
      const currentStats = lowStats.map((stat, i) => ({ subject: stat.subject, value: lerp(stat.value, highStatsData[i].value, transformProgress), fullMark: 100 }));
      const currentColor = lerpColor("#ef4444", "#10b981", transformProgress);
      return (
          <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-between p-6 font-mono overflow-hidden h-[100dvh]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.05)_0%,transparent_70%)]" />
              <div className="flex-1 w-full flex flex-col items-center justify-center min-h-0 relative z-10">
                  <div className="absolute top-4 left-4 opacity-30 text-[10px] space-y-4 hidden lg:block">
                      <div className="p-2 border border-gray-800 rounded">TARGET_GOAL: {formData.goal}</div>
                      <div className="p-2 border border-gray-800 rounded">EQUIPMENT: {formData.equipment}</div>
                  </div>
                  <div className="w-full max-w-md aspect-square flex items-center justify-center">
                    <TechRadar label={isTransformed ? "PEAK EVOLUTION REALISED" : isAnimating ? "REWRITING BIOLOGY..." : "CURRENT BIO-SCAN"} color={currentColor} data={currentStats} isAnimating={isAnimating} showEntrance={!isTransformed && !isAnimating} />
                  </div>
              </div>
              <div className="w-full max-w-md shrink-0 space-y-6 pb-4 relative z-10">
                  <AnimatePresence>
                      {isTransformed && (
                          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex gap-4 w-full">
                              <div className="flex-1 bg-system-success/10 border border-system-success/30 p-3 rounded-xl text-center shadow-lg"><div className="text-[10px] text-system-success/70 font-bold uppercase mb-1 flex items-center justify-center gap-1"><TrendingUp size={12}/> PROJECTED STAT INCREASE</div><div className="text-2xl font-black text-system-success">+{projectedIncrease}%</div></div>
                              <div className="flex-1 bg-system-success/10 border border-system-success/30 p-3 rounded-xl text-center shadow-lg"><div className="text-[10px] text-system-success/70 font-bold uppercase mb-1 flex items-center justify-center gap-1"><Clock size={12}/> EST. TIME</div><div className="text-2xl font-black text-system-success">{estimatedTimeStr}</div></div>
                          </motion.div>
                      )}
                  </AnimatePresence>
                  <div className="w-full text-center"> 
                    <AnimatePresence mode="wait">
                        {!isTransformed && !isAnimating ? (
                            <motion.div key="init" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                                <p className="text-xs text-gray-500 max-w-xs mx-auto leading-relaxed">The System has analyzed your current vessel. You are capable of reaching peak human potential within this cycle.</p>
                                <button onClick={handleAscensionClick} className="w-full py-4 bg-red-600 text-white font-black rounded-2xl animate-pulse shadow-[0_0_30px_#ef4444] tracking-widest text-xs sm:text-sm uppercase">INITIATE ASCENSION SEQUENCE</button>
                            </motion.div>
                        ) : isAnimating ? (
                            <OptimizationSequence onComplete={handleOptimizationComplete} />
                        ) : (
                            <motion.div key="accept" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                                <div className="p-3 bg-system-success/5 border border-system-success/30 rounded-2xl"><div className="text-system-success font-black text-xs mb-1 flex items-center justify-center gap-2"><ShieldCheck size={14} /> SYSTEM GUARANTEE</div><p className="text-[10px] text-gray-400 leading-relaxed max-w-xs mx-auto">Adherence to established protocols ensures peak biological evolution.</p></div>
                                <button onClick={startJourneySequence} className="w-full py-4 bg-system-success text-black font-black rounded-2xl shadow-[0_0_40px_#10b981] hover:bg-white transition-all uppercase tracking-widest text-xs sm:text-sm">ACCEPT SYSTEM PROTOCOLS</button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                  </div>
              </div>
              <div className="absolute top-6 right-6 flex items-center gap-3 text-gray-800 opacity-50 pointer-events-none"><Activity size={24} /><div className="text-[10px] font-bold">BIO_SYNC_V2 // STABLE</div></div>
          </div>
      );
  }

  if (viewMode === 'FINALIZING') {
      return (
          <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center font-mono">
              <Sparkles className="text-system-neon mb-8 animate-pulse" size={48} />
              <div className="text-2xl text-white font-black uppercase text-center tracking-[0.3em]">{finalizingLog}</div>
              <div className="mt-8 w-64 h-1 bg-gray-900 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 6 }} className="h-full bg-system-neon shadow-[0_0_15px_#00d2ff]" />
              </div>
          </div>
      );
  }

  // ─── Fullscreen generating overlay ───────────────────────────────────────
  if (isGeneratingPlan) {
      const msgs = [
          'Analyzing your fitness profile...',
          'Selecting optimal exercises...',
          'Building progressive overload structure...',
          'Calibrating sets and reps...',
          'Finalizing your personalized protocol...',
      ];
      return (
          <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center" style={{ background: 'rgba(5,2,18,0.98)', backdropFilter: 'blur(24px)' }}>
              {/* Animated ring */}
              <div className="relative w-28 h-28 mb-10">
                  <svg className="w-full h-full" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(168,85,247,0.1)" strokeWidth="4" />
                      <motion.circle
                          cx="50" cy="50" r="44" fill="none"
                          stroke="rgba(168,85,247,0.8)" strokeWidth="4"
                          strokeLinecap="round"
                          strokeDasharray="276"
                          initial={{ strokeDashoffset: 276, rotate: -90 }}
                          animate={{ strokeDashoffset: 0, rotate: -90 }}
                          transition={{ duration: 8, ease: 'linear' }}
                          style={{ transformOrigin: '50% 50%' }}
                      />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                      <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 1.8, repeat: Infinity }}>
                          <Sparkles size={32} className="text-purple-400" />
                      </motion.div>
                  </div>
              </div>
              <div className="text-[10px] font-black text-purple-400 uppercase tracking-[0.3em] mb-4">ForgeGuard AI</div>
              <div className="text-xl font-black text-white mb-3 tracking-tight">Crafting Your Protocol</div>
              <GeneratingMessage messages={msgs} />
              <div className="flex gap-1.5 mt-6">
                  {[0,1,2,3,4].map(i => (
                      <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-purple-500"
                          animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                          transition={{ duration: 1.2, delay: i * 0.2, repeat: Infinity }}
                      />
                  ))}
              </div>
          </div>
      );
  }

  // ─── Confetti + completion screen ────────────────────────────────────────
  if (planCompleteData) {
      const CONFETTI_COLORS = ['#a855f7','#7c3aed','#00d2ff','#fbbf24','#f472b6','#34d399','#fb923c'];
      const particles = Array.from({ length: 60 }, (_, i) => ({
          id: i,
          x: (i * 37 + 13) % 100,
          color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          size: 6 + (i % 5),
          delay: (i * 0.07) % 2.4,
          duration: 2.2 + (i % 8) * 0.3,
      }));
      return (
          <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-hidden" style={{ background: 'rgba(5,2,18,0.97)' }}>
              {/* Confetti particles */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  {particles.map(p => (
                      <motion.div key={p.id}
                          className="absolute rounded-sm"
                          style={{ left: `${p.x}%`, width: p.size, height: p.size, background: p.color, top: -20 }}
                          initial={{ y: -20, rotate: 0, opacity: 1 }}
                          animate={{ y: '110vh', rotate: 540, opacity: [1, 1, 0.6, 0] }}
                          transition={{ duration: p.duration, delay: p.delay, ease: 'easeIn', repeat: Infinity, repeatDelay: 0.8 }}
                      />
                  ))}
              </div>
              {/* Completion card */}
              <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 18 }}
                  className="relative z-10 flex flex-col items-center text-center px-8 py-10 rounded-3xl max-w-sm w-full mx-4"
                  style={{ background: 'rgba(15,5,40,0.95)', border: '1px solid rgba(168,85,247,0.5)', boxShadow: '0 0 80px rgba(168,85,247,0.25), 0 20px 60px rgba(0,0,0,0.6)' }}
              >
                  <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: 'spring', stiffness: 260 }}
                      className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
                      style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.3), rgba(124,58,237,0.2))', border: '2px solid rgba(168,85,247,0.5)', boxShadow: '0 0 40px rgba(168,85,247,0.4)' }}
                  >
                      <Check size={36} className="text-purple-400" />
                  </motion.div>
                  <div className="text-[10px] font-black text-purple-400 uppercase tracking-[0.3em] mb-2">Protocol Forged</div>
                  <div className="text-2xl font-black text-white mb-2 leading-tight">{planCompleteData.name}</div>
                  <div className="text-[12px] text-gray-400 mb-2">{planCompleteData.dayCount}-day program generated &amp; saved</div>
                  <div className="text-[10px] text-gray-600 font-mono mb-8">Your plan has been saved to your permanent archive</div>
                  <motion.button
                      whileTap={{ scale: 0.96 }}
                      onClick={() => { setPlanCompleteData(null); setViewMode('MAP'); }}
                      className="w-full py-4 rounded-2xl font-black text-sm tracking-wider text-white"
                      style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)', boxShadow: '0 0 30px rgba(139,92,246,0.5)' }}
                  >
                      Begin Training
                  </motion.button>
              </motion.div>
          </div>
      );
  }

  if (viewMode === 'PLAN_SELECT') {
      return (
          <div className="fixed inset-0 z-50 bg-black">
              <PlanSelector
                  healthProfile={healthProfile || formData as HealthProfile}
                  onSelectPlan={handleSelectPlan}
                  onGenerateAI={handleGenerateAIPlan}
                  isGenerating={isGeneratingPlan}
                  onBack={() => setViewMode('MAP')}
              />
          </div>
      );
  }

  if (viewMode === 'SETUP') {
      return (
          <div className="flex flex-col items-center justify-center min-h-[70vh] p-4 font-mono">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-md w-full bg-system-card border border-system-border rounded-3xl p-8 shadow-2xl relative overflow-hidden"
              >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gray-800">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(step/TOTAL_STEPS)*100}%` }} 
                        className="h-full bg-system-neon shadow-[0_0_15px_#00d2ff]" 
                    />
                  </div>
                  
                  <div className="flex justify-between items-center mb-10">
                    <h2 className="text-xl font-bold text-white tracking-widest uppercase">Calibration Phase {step}/{TOTAL_STEPS}</h2>
                    <motion.span 
                        animate={{ opacity: [1, 0.3, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                        className="text-[10px] text-system-neon font-black bg-system-neon/10 px-2 py-0.5 rounded border border-system-neon/30"
                    >
                        SYNCING...
                    </motion.span>
                  </div>

                  <AnimatePresence mode="wait">
                      {step === 1 && (
                        <motion.div key="s1" variants={setupContainerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6">
                            <motion.div variants={setupItemVariants} className="flex items-center gap-3 mb-4">
                                <User className="text-system-neon" size={24} />
                                <div className="text-xs text-gray-500 uppercase tracking-widest font-bold">Vessel Identification</div>
                            </motion.div>
                            <motion.div variants={setupItemVariants} className="grid grid-cols-2 gap-4">
                                {['MALE', 'FEMALE'].map(g => (
                                    <button 
                                        key={g} 
                                        onClick={() => { setFormData({...formData, gender: g as any}); setStep(2); }} 
                                        className="py-6 border border-gray-800 rounded-2xl hover:bg-white hover:text-black hover:shadow-[0_0_20px_white] transition-all font-black text-sm tracking-widest"
                                    >
                                        {g}
                                    </button>
                                ))}
                            </motion.div>
                            
                            {/* Skip / Later Button */}
                            <motion.div variants={setupItemVariants} className="flex justify-center mt-6 pt-4 border-t border-gray-800/50">
                                <button 
                                    onClick={() => {
                                        setSkippedSetup(true);
                                        setViewMode('MAP');
                                    }}
                                    className="text-gray-600 text-xs font-mono flex items-center gap-2 hover:text-white transition-colors uppercase tracking-widest"
                                >
                                    <SkipForward size={14} /> Calibrate Later
                                </button>
                            </motion.div>
                        </motion.div>
                      )}
                      
                      {step === 2 && (
                        <motion.div key="s2" variants={setupContainerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6">
                            <motion.div variants={setupItemVariants} className="flex items-center gap-3 mb-4">
                                <Activity className="text-system-neon" size={24} />
                                <div className="text-xs text-gray-500 uppercase tracking-widest font-bold">Chronological Age</div>
                            </motion.div>
                            <motion.input 
                                variants={setupItemVariants}
                                type="number" 
                                value={formData.age} 
                                onChange={e => setFormData({...formData, age: Number(e.target.value)})} 
                                className="w-full bg-black border-b-2 border-gray-800 text-center text-6xl text-white outline-none focus:border-system-neon py-6 transition-colors"
                            />
                            <motion.div variants={setupItemVariants} className="flex justify-between items-center mt-8">
                                <button onClick={() => setStep(1)} className="text-gray-600 hover:text-white flex items-center gap-1 font-bold text-xs uppercase"><ChevronLeft size={14}/> BACK</button>
                                <button onClick={() => setStep(3)} className="bg-system-neon text-black px-10 py-3 rounded-full font-black text-xs shadow-[0_0_15px_#00d2ff] hover:bg-white transition-all uppercase flex items-center gap-2">NEXT <ChevronRight size={14}/></button>
                            </motion.div>
                        </motion.div>
                      )}
                      {step === 3 && (
                        <motion.div key="s3" variants={setupContainerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6">
                            <motion.div variants={setupItemVariants} className="flex items-center gap-3 mb-4">
                                <Ruler className="text-system-neon" size={24} />
                                <div className="text-xs text-gray-500 uppercase tracking-widest font-bold">Verticality Mapping (CM)</div>
                            </motion.div>
                            <motion.input 
                                variants={setupItemVariants}
                                type="number" 
                                value={formData.height} 
                                onChange={e => setFormData({...formData, height: Number(e.target.value)})} 
                                className="w-full bg-black border-b-2 border-gray-800 text-center text-6xl text-white outline-none focus:border-system-neon py-6 transition-colors"
                            />
                            <motion.div variants={setupItemVariants} className="flex justify-between items-center mt-8">
                                <button onClick={() => setStep(2)} className="text-gray-600 hover:text-white flex items-center gap-1 font-bold text-xs uppercase"><ChevronLeft size={14}/> BACK</button>
                                <button onClick={() => setStep(4)} className="bg-system-neon text-black px-10 py-3 rounded-full font-black text-xs shadow-[0_0_15px_#00d2ff] hover:bg-white transition-all uppercase flex items-center gap-2">NEXT <ChevronRight size={14}/></button>
                            </motion.div>
                        </motion.div>
                      )}
                      {step === 4 && (
                        <motion.div key="s4" variants={setupContainerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6">
                            <motion.div variants={setupItemVariants} className="flex items-center gap-3 mb-4">
                                <Weight className="text-system-neon" size={24} />
                                <div className="text-xs text-gray-500 uppercase tracking-widest font-bold">Current Mass (KG)</div>
                            </motion.div>
                            <motion.input 
                                variants={setupItemVariants}
                                type="number" 
                                value={formData.weight} 
                                onChange={e => setFormData({...formData, weight: Number(e.target.value)})} 
                                className="w-full bg-black border-b-2 border-gray-800 text-center text-6xl text-white outline-none focus:border-system-neon py-6 transition-colors"
                            />
                            <motion.div variants={setupItemVariants} className="flex justify-between items-center mt-8">
                                <button onClick={() => setStep(3)} className="text-gray-600 hover:text-white flex items-center gap-1 font-bold text-xs uppercase"><ChevronLeft size={14}/> BACK</button>
                                <button onClick={() => setStep(5)} className="bg-system-neon text-black px-10 py-3 rounded-full font-black text-xs shadow-[0_0_15px_#00d2ff] hover:bg-white transition-all uppercase flex items-center gap-2">NEXT <ChevronRight size={14}/></button>
                            </motion.div>
                        </motion.div>
                      )}
                      {step === 5 && (
                        <motion.div key="s5" variants={setupContainerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6">
                            <motion.div variants={setupItemVariants} className="flex items-center gap-3 mb-4">
                                <Target className="text-system-accent" size={24} />
                                <div className="text-xs text-system-accent uppercase tracking-widest font-black">Target Mass (KG)</div>
                            </motion.div>
                            <motion.div variants={setupItemVariants} className="relative">
                                <div className="absolute inset-0 bg-system-accent/10 blur-xl -z-10 rounded-full" />
                                <input 
                                    type="number" 
                                    value={formData.targetWeight} 
                                    onChange={e => setFormData({...formData, targetWeight: Number(e.target.value)})} 
                                    className="w-full bg-black border-b-2 border-system-accent text-center text-6xl text-white outline-none focus:shadow-[0_4px_15px_rgba(139,92,246,0.5)] py-6 transition-all font-black"
                                />
                            </motion.div>
                            <motion.div variants={setupItemVariants} className="flex justify-between items-center mt-8">
                                <button onClick={() => setStep(4)} className="text-gray-600 hover:text-white flex items-center gap-1 font-bold text-xs uppercase"><ChevronLeft size={14}/> BACK</button>
                                <button onClick={() => setStep(6)} className="bg-system-accent text-white px-10 py-3 rounded-full font-black text-xs shadow-[0_0_20px_#8b5cf6] hover:bg-white hover:text-black transition-all uppercase flex items-center gap-2">NEXT <ChevronRight size={14}/></button>
                            </motion.div>
                        </motion.div>
                      )}
                      {step === 6 && (
                        <motion.div key="s6" variants={setupContainerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-4">
                            <motion.div variants={setupItemVariants} className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-4">Energy Flux Levels</motion.div>
                            <motion.div variants={setupItemVariants} className="grid gap-2">
                                {['SEDENTARY', 'LIGHT', 'MODERATE', 'VERY_ACTIVE'].map(a => (
                                    <button 
                                        key={a} 
                                        onClick={() => { setFormData({...formData, activityLevel: a as any}); setStep(7); }} 
                                        className="w-full py-4 border border-gray-800 rounded-xl font-black text-[10px] tracking-widest hover:bg-white hover:text-black transition-all uppercase"
                                    >
                                        {a}
                                    </button>
                                ))}
                            </motion.div>
                            <motion.button variants={setupItemVariants} onClick={() => setStep(5)} className="text-gray-600 hover:text-white flex items-center gap-1 font-bold text-xs uppercase mt-4"><ChevronLeft size={14}/> BACK</motion.button>
                        </motion.div>
                      )}
                      {step === 7 && (
                        <motion.div key="s7" variants={setupContainerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-4">
                            <motion.div variants={setupItemVariants} className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-4">Primary Directive</motion.div>
                            <motion.div variants={setupItemVariants} className="grid gap-2">
                                {['LOSE_WEIGHT', 'BUILD_MUSCLE', 'RECOMP'].map(g => (
                                    <button 
                                        key={g} 
                                        onClick={() => { setFormData({...formData, goal: g as any}); setStep(8); }} 
                                        className="w-full py-4 border border-gray-800 rounded-xl font-black text-[10px] tracking-widest hover:bg-white hover:text-black transition-all uppercase"
                                    >
                                        {g === 'RECOMP' ? 'LOSE WEIGHT + BUILD MUSCLE' : g.replace('_', ' ')}
                                    </button>
                                ))}
                            </motion.div>
                            <motion.button variants={setupItemVariants} onClick={() => setStep(6)} className="text-gray-600 hover:text-white flex items-center gap-1 font-bold text-xs uppercase mt-4"><ChevronLeft size={14}/> BACK</motion.button>
                        </motion.div>
                      )}
                      {step === 8 && (
                        <motion.div key="s8" variants={setupContainerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-4">
                            <motion.div variants={setupItemVariants} className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-4">Resource Availability</motion.div>
                            <motion.div variants={setupItemVariants} className="grid gap-2">
                                {['GYM', 'HOME_DUMBBELLS', 'BODYWEIGHT'].map(eq => (
                                    <button 
                                        key={eq} 
                                        onClick={() => { 
                                            setFormData({...formData, equipment: eq as any}); 
                                            if (eq === 'BODYWEIGHT') startProcessing(); 
                                            else setStep(9); 
                                        }} 
                                        className="w-full py-4 border border-gray-800 rounded-xl font-black text-[10px] tracking-widest hover:bg-white hover:text-black transition-all uppercase"
                                    >
                                        {eq.replace('_', ' ')}
                                    </button>
                                ))}
                            </motion.div>
                            <motion.button variants={setupItemVariants} onClick={() => setStep(7)} className="text-gray-600 hover:text-white flex items-center gap-1 font-bold text-xs uppercase mt-4"><ChevronLeft size={14}/> BACK</motion.button>
                        </motion.div>
                      )}
                      {step === 9 && (
                        <motion.div key="s9" variants={setupContainerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6 text-center">
                            <motion.h3 variants={setupItemVariants} className="text-xl text-white font-black italic">CONFIRM CONFIGURATION</motion.h3>
                            <motion.div variants={setupItemVariants} className="bg-gray-900/50 p-6 rounded-xl border border-gray-800 text-left space-y-3 font-mono text-xs">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">PROFILE</span>
                                    <span className="text-white">{formData.gender}, {formData.age}y</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">METRICS</span>
                                    <span className="text-white">{formData.height}cm / {formData.weight}kg</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">GOAL</span>
                                    <span className="text-system-neon">
                                        {formData.goal === 'RECOMP' ? 'LOSE WEIGHT + BUILD MUSCLE' : formData.goal?.replace('_', ' ')}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">PROTOCOL</span>
                                    <span className="text-white">{formData.equipment} / {formData.workoutSplit}</span>
                                </div>
                            </motion.div>
                            <motion.button 
                              variants={setupItemVariants}
                              onClick={startProcessing}
                              className="w-full bg-system-neon text-black font-black py-5 rounded-xl shadow-[0_0_30px_#00d2ff] hover:scale-105 transition-transform"
                            >
                                INITIALIZE SYSTEM
                            </motion.button>
                            <motion.button variants={setupItemVariants} onClick={() => setStep(8)} className="text-gray-600 hover:text-white flex items-center gap-1 font-bold text-xs uppercase mt-6 mx-auto"><ChevronLeft size={14}/> BACK</motion.button>
                        </motion.div>
                      )}
                  </AnimatePresence>
              </motion.div>
          </div>
      );
  }

  if (viewMode === 'OVERVIEW' && activePlan) return <WorkoutOverview plan={activePlan} focusVideos={playerData.focusVideos} onStart={(p) => { setActivePlan(p); setViewMode('ACTIVE'); }} onCancel={() => setViewMode('MAP')} userWeight={healthProfile?.weight} />;
  if (viewMode === 'ACTIVE' && activePlan) return <ActiveWorkoutPlayer plan={activePlan} onComplete={(c, t, r) => { onCompleteWorkout(c, t, r, false); setViewMode('MAP'); }} onFail={() => { onFailWorkout(); setViewMode('MAP'); }} streak={playerData.streak} />;

  return (
    <>
        <AnimatePresence>
            {showKeyAlert && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
                    <motion.div 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        className="bg-[#0a0a0a] border border-purple-500/50 w-full max-w-sm rounded-2xl p-8 text-center shadow-[0_0_50px_rgba(168,85,247,0.3)] relative overflow-hidden"
                    >
                        {/* Background Effect */}
                        <div className="absolute inset-0 bg-purple-900/10 pointer-events-none" />
                        
                        <div className="relative z-10 flex flex-col items-center">
                            <div className="w-16 h-16 rounded-full bg-black border border-purple-500 flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(168,85,247,0.5)]">
                                <Lock size={32} className="text-purple-500" />
                            </div>
                            
                            <h2 className="text-xl font-black text-white font-mono uppercase tracking-tighter mb-2">ACCESS DENIED</h2>
                            <p className="text-xs text-purple-300 font-mono mb-6 leading-relaxed">
                                INSUFFICIENT KEYS.<br/>Obtain Keys from the Demon Castle to perform Deep Scans.
                            </p>
                            
                            <button 
                                onClick={() => setShowKeyAlert(false)}
                                className="w-full py-4 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-500 transition-colors uppercase tracking-widest text-xs font-mono shadow-lg"
                            >
                                ACKNOWLEDGE
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>

        <div id="tut-health" className="h-full flex flex-col gap-6 font-mono">
            <div className="flex gap-2 sticky top-20 z-30 pt-1 pb-2 bg-transparent">
                {['WORKOUT', 'NUTRITION', 'BODY'].map(t => (
                    <button
                        key={t}
                        id={t === 'NUTRITION' ? 'tut-health-nutrition-tab' : undefined}
                        onClick={() => setActiveTab(t as any)}
                        className={`flex-1 py-2.5 text-xs font-bold tracking-widest rounded-lg transition-all duration-200 border ${
                            activeTab === t
                                ? 'text-system-neon border-system-neon shadow-[0_0_12px_rgba(0,210,255,0.25)]'
                                : 'text-gray-600 border-gray-800 hover:text-gray-400 hover:border-gray-600'
                        }`}
                        style={{ background: 'transparent' }}
                    >
                        {t}
                    </button>
                ))}
            </div>
            <div className="flex-1 pb-20">
                <AnimatePresence mode="wait">
                    {activeTab === 'WORKOUT' && (() => {
                        const completedWorkouts = playerData.logs.filter(l => l.type === 'WORKOUT').length;
                        const activePremadePlan = premadePlans.find(p => p.id === (healthProfile as any)?.selectedPlanId);
                        const daysPerWeek = activePremadePlan?.days_per_week || (calculatedPlan.length > 0 ? Math.min(calculatedPlan.length, 5) : 3);
                        const totalWeeks = activePremadePlan
                            ? (activePremadePlan.duration_weeks || Math.ceil(calculatedPlan.length / Math.max(daysPerWeek, 1)))
                            : Math.ceil(calculatedPlan.length / Math.max(daysPerWeek, 1));
                        const weeksCompleted = Math.floor(completedWorkouts / Math.max(daysPerWeek, 1));
                        const weeksLeft = Math.max(totalWeeks - weeksCompleted, 0);
                        const streakInWeek = playerData.streak % 7 || (playerData.streak > 0 && playerData.streak % 7 === 0 ? 7 : 0);
                        const milestones: Record<number, string> = { 7: '7-DAY MILESTONE', 14: '14-DAY MILESTONE', 21: '21-DAY MILESTONE', 30: '30-DAY MILESTONE', 60: '60-DAY MILESTONE', 100: '100-DAY LEGEND' };
                        const activeMilestone = milestones[playerData.streak];
                        const streakTier = playerData.streak >= 30 ? { accent: '#fbbf24', glow: 'rgba(251,191,36,0.25)', border: 'rgba(251,191,36,0.3)', dot: '#fbbf24' }
                                         : playerData.streak >= 7  ? { accent: '#f97316', glow: 'rgba(249,115,22,0.2)',  border: 'rgba(249,115,22,0.25)', dot: '#f97316' }
                                         :                           { accent: '#00d2ff', glow: 'rgba(0,210,255,0.12)',  border: 'rgba(0,210,255,0.18)', dot: '#00d2ff' };
                        return (
                        <motion.div key="wo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4 relative pb-24">

                            {/* ── STREAK HERO — Liquid Glass ── */}
                            <div className="relative rounded-3xl overflow-hidden"
                                style={{
                                    background: 'rgba(255,255,255,0.04)',
                                    backdropFilter: 'blur(24px)',
                                    WebkitBackdropFilter: 'blur(24px)',
                                    border: `1px solid ${streakTier.border}`,
                                    boxShadow: `0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08), 0 0 40px ${streakTier.glow}`,
                                }}
                            >
                                <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at 30% 0%, ${streakTier.glow} 0%, transparent 60%)` }} />
                                <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent 0%, ${streakTier.accent}55 40%, ${streakTier.accent}99 50%, ${streakTier.accent}55 60%, transparent 100%)` }} />

                                <div className="relative px-6 pt-6 pb-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <div className="text-[9px] font-bold uppercase tracking-[0.25em] mb-2" style={{ color: `${streakTier.accent}cc` }}>ACTIVE STREAK</div>
                                            <div key={streakAnimKey} className="flex items-end gap-2 animate-streak-pop">
                                                <span className="text-7xl font-black leading-none text-white" style={{ textShadow: `0 0 30px ${streakTier.accent}80` }}>
                                                    {playerData.streak}
                                                </span>
                                                <span className="text-base font-bold mb-3 text-white/40">days</span>
                                            </div>
                                            {activeMilestone ? (
                                                <div className="inline-flex items-center mt-2 px-2.5 py-1 rounded-full" style={{ background: `${streakTier.accent}18`, border: `1px solid ${streakTier.accent}40` }}>
                                                    <span className="text-[9px] font-black tracking-widest" style={{ color: streakTier.accent }}>{activeMilestone}</span>
                                                </div>
                                            ) : (
                                                <div className="text-[10px] font-mono mt-2 text-white/35">
                                                    {playerData.streak === 0 ? 'Complete a workout to start your streak' :
                                                     playerData.streak < 7  ? `${7 - playerData.streak} more days to first milestone` :
                                                     playerData.streak < 30 ? `${[14,21,30].find(m => m > playerData.streak)! - playerData.streak} days to next milestone` :
                                                     'Elite consistency achieved'}
                                                </div>
                                            )}
                                        </div>
                                        {/* Streak ring */}
                                        <div className="shrink-0 mt-1">
                                            <svg width="72" height="72" viewBox="0 0 72 72">
                                                <circle cx="36" cy="36" r="30" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
                                                <circle cx="36" cy="36" r="30" fill="none" stroke={streakTier.accent} strokeWidth="6"
                                                    strokeDasharray={`${Math.min((streakInWeek / 7) * 188.5, 188.5)} 188.5`}
                                                    strokeLinecap="round" transform="rotate(-90 36 36)"
                                                    style={{ filter: `drop-shadow(0 0 6px ${streakTier.accent})`, transition: 'stroke-dasharray 0.6s ease' }}
                                                />
                                                <text x="36" y="39" textAnchor="middle" fontSize="13" fontWeight="900" fill="white" fontFamily="monospace">{streakInWeek}/7</text>
                                            </svg>
                                            <div className="text-[8px] text-center mt-1 font-mono text-white/30 uppercase tracking-wider">This Week</div>
                                        </div>
                                    </div>
                                    {/* Week progress bars */}
                                    <div className="flex gap-1.5 mt-4">
                                        {Array.from({ length: 7 }).map((_, i) => (
                                            <div key={i} className="flex-1 h-1.5 rounded-full transition-all duration-500" style={i < streakInWeek
                                                ? { background: streakTier.accent, boxShadow: `0 0 8px ${streakTier.accent}80` }
                                                : { background: 'rgba(255,255,255,0.07)' }} />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* ── WEEK COUNTDOWN + TOTAL WORKOUTS — Liquid Glass ── */}
                            <div className="flex gap-3">
                                <div className="flex-1 rounded-2xl p-4 text-center" style={{
                                    background: 'rgba(0,210,255,0.05)',
                                    backdropFilter: 'blur(20px)',
                                    WebkitBackdropFilter: 'blur(20px)',
                                    border: '1px solid rgba(0,210,255,0.15)',
                                    boxShadow: '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)',
                                }}>
                                    <div className="text-[9px] text-system-neon/60 uppercase tracking-widest font-bold mb-1.5">Weeks Left</div>
                                    <div className="text-4xl font-black text-system-neon leading-none" style={{ textShadow: '0 0 20px rgba(0,210,255,0.5)' }}>
                                        {weeksLeft}
                                    </div>
                                    <div className="text-[9px] text-white/20 mt-1.5 font-mono">Week {weeksCompleted + 1} of {totalWeeks}</div>
                                </div>
                                <div className="flex-1 rounded-2xl p-4 text-center" style={{
                                    background: 'rgba(168,85,247,0.05)',
                                    backdropFilter: 'blur(20px)',
                                    WebkitBackdropFilter: 'blur(20px)',
                                    border: '1px solid rgba(168,85,247,0.18)',
                                    boxShadow: '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)',
                                }}>
                                    <div className="text-[9px] text-purple-400/60 uppercase tracking-widest font-bold mb-1.5">Workouts Done</div>
                                    <div className="text-4xl font-black text-purple-300 leading-none" style={{ textShadow: '0 0 20px rgba(168,85,247,0.5)' }}>
                                        {completedWorkouts}
                                    </div>
                                    <div className="text-[9px] text-white/20 mt-1.5 font-mono">{calculateTimeEstimate(healthProfile || formData)}</div>
                                </div>
                            </div>

                            {/* ── PLANS SECTION (above map) ── */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <div className="text-xs font-black text-white uppercase tracking-widest">Training Programs</div>
                                    <button
                                        onClick={() => { setAiPlanError(null); setAiConfirmStep(0); setShowAIConfirm(true); }}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all"
                                        style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.35)', color: '#c084fc', boxShadow: '0 0 12px rgba(168,85,247,0.15)' }}
                                    >
                                        <Sparkles size={10} />
                                        {(healthProfile as any)?.aiPlanUsed ? 'Regenerate AI Plan (5 🗝)' : 'Create Plan with AI (Free)'}
                                    </button>
                                </div>

                                <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
                                    {/* AI Plan card — always shown once generated */}
                                    {(healthProfile as any)?.aiPlanUsed && (
                                        (() => {
                                            const isAiActive = !(healthProfile as any)?.selectedPlanId;
                                            const aiPlanName = (healthProfile as any)?.aiGeneratedPlanName || healthProfile?.selectedPlanName || 'AI Custom Plan';
                                            return (
                                                <motion.button
                                                    whileTap={{ scale: 0.95 }}
                                                    whileHover={{ scale: 1.02 }}
                                                    onClick={() => {
                                                        const aiDays = (healthProfile as any)?.aiGeneratedPlan || (isAiActive ? healthProfile?.workoutPlan : null);
                                                        if (aiDays && Array.isArray(aiDays)) {
                                                            const updated = { ...(healthProfile as HealthProfile), workoutPlan: aiDays, selectedPlanId: undefined, selectedPlanName: aiPlanName } as HealthProfile;
                                                            onSaveProfile(updated, updated.category || 'Hunter');
                                                        }
                                                    }}
                                                    className="relative shrink-0 w-44 h-56 rounded-2xl overflow-hidden transition-all"
                                                    style={{
                                                        border: isAiActive ? '1px solid rgba(168,85,247,0.7)' : '1px solid rgba(168,85,247,0.3)',
                                                        boxShadow: isAiActive ? '0 0 30px rgba(168,85,247,0.4), 0 0 8px rgba(168,85,247,0.2)' : '0 4px 20px rgba(0,0,0,0.4)',
                                                    }}
                                                >
                                                    <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #1a0533 0%, #2d0a5e 40%, #0d0018 100%)' }} />
                                                    <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(168,85,247,0.35) 0%, transparent 65%)' }} />
                                                    <div className="absolute inset-0" style={{ backgroundImage: 'url("/images/ui/dungeon-bg.jpg")', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.08 }} />
                                                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.1) 100%)' }} />
                                                    <div className="absolute inset-0 p-3.5 flex flex-col justify-between">
                                                        <div className="flex items-start justify-between">
                                                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-purple-900/80 text-purple-300">AI GENERATED</span>
                                                            {isAiActive && <span className="text-[8px] font-black text-system-neon bg-black/60 px-1.5 py-0.5 rounded-full border border-system-neon/30">ACTIVE</span>}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-black text-white leading-tight mb-1.5">{aiPlanName}</div>
                                                            <div className="text-[9px] text-purple-300/70 font-mono">Personalized for you</div>
                                                        </div>
                                                    </div>
                                                </motion.button>
                                            );
                                        })()
                                    )}

                                    {/* Premade plan cards */}
                                    {premadePlans.map(plan => {
                                        const isActive = (healthProfile as any)?.selectedPlanId === plan.id;
                                        const dc = plan.difficulty === 'BEGINNER'
                                            ? { badge: 'bg-green-900/80 text-green-300', glow: 'rgba(74,222,128,0.18)', border: 'rgba(74,222,128,0.3)' }
                                            : plan.difficulty === 'INTERMEDIATE'
                                            ? { badge: 'bg-yellow-900/80 text-yellow-300', glow: 'rgba(250,204,21,0.18)', border: 'rgba(250,204,21,0.3)' }
                                            : { badge: 'bg-red-900/80 text-red-300', glow: 'rgba(239,68,68,0.18)', border: 'rgba(239,68,68,0.3)' };
                                        return (
                                            <motion.button
                                                key={plan.id}
                                                whileTap={{ scale: 0.95 }}
                                                whileHover={{ scale: 1.02 }}
                                                onClick={() => {
                                                    const days = Array.isArray(plan.days) ? plan.days : [];
                                                    const updated = { ...(healthProfile || formData as HealthProfile), workoutPlan: days, selectedPlanId: plan.id, selectedPlanName: plan.name } as HealthProfile;
                                                    onSaveProfile(updated, updated.category || 'Hunter');
                                                }}
                                                className="relative shrink-0 w-44 h-56 rounded-2xl overflow-hidden transition-all"
                                                style={{ border: `1px solid ${isActive ? dc.border : 'rgba(255,255,255,0.08)'}`, boxShadow: isActive ? `0 0 24px ${dc.glow}, 0 0 8px ${dc.glow}` : `0 4px 20px rgba(0,0,0,0.4)` }}
                                            >
                                                {plan.image_url ? (
                                                    <img src={plan.image_url} alt={plan.name} className="absolute inset-0 w-full h-full object-cover" onError={e => { (e.target as any).style.display = 'none'; }} />
                                                ) : (
                                                    <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 100%)' }} />
                                                )}
                                                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0.1) 100%)' }} />
                                                <div className="absolute inset-0 p-3.5 flex flex-col justify-between">
                                                    <div className="flex items-start justify-between">
                                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${dc.badge}`}>{plan.difficulty}</span>
                                                        {isActive && <span className="text-[8px] font-black text-system-neon bg-black/60 px-1.5 py-0.5 rounded-full border border-system-neon/30">ACTIVE</span>}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-black text-white leading-tight mb-1.5">{plan.name}</div>
                                                        <div className="flex gap-2 text-[9px] text-gray-400 font-mono">
                                                            <span>{plan.duration_weeks}w</span>
                                                            <span>·</span>
                                                            <span>{plan.days_per_week}d/wk</span>
                                                        </div>
                                                        {plan.description && <div className="text-[9px] text-gray-500 mt-1.5 leading-snug line-clamp-2">{plan.description}</div>}
                                                    </div>
                                                </div>
                                            </motion.button>
                                        );
                                    })}

                                    {/* Custom / Manual plans */}
                                    {customPlans.filter(cp => cp.plan_type !== 'AI').map(cp => {
                                        const isActive = (healthProfile as any)?.selectedPlanId === `custom-${cp.id}`;
                                        const cpDays = Array.isArray(cp.days) ? cp.days : (typeof cp.days === 'string' ? JSON.parse(cp.days) : []);
                                        return (
                                            <motion.button
                                                key={cp.id}
                                                whileTap={{ scale: 0.95 }}
                                                whileHover={{ scale: 1.02 }}
                                                onClick={() => {
                                                    const updated = { ...(healthProfile as HealthProfile), workoutPlan: cpDays, selectedPlanId: `custom-${cp.id}`, selectedPlanName: cp.name } as HealthProfile;
                                                    onSaveProfile(updated, updated.category || 'Hunter');
                                                }}
                                                className="relative shrink-0 w-44 h-56 rounded-2xl overflow-hidden transition-all"
                                                style={{ border: isActive ? '1px solid rgba(0,210,255,0.6)' : '1px solid rgba(255,255,255,0.08)', boxShadow: isActive ? '0 0 24px rgba(0,210,255,0.25)' : '0 4px 20px rgba(0,0,0,0.4)' }}
                                            >
                                                <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #001a1f 0%, #003040 40%, #000d14 100%)' }} />
                                                <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(0,210,255,0.2) 0%, transparent 65%)' }} />
                                                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.1) 100%)' }} />
                                                <div className="absolute inset-0 p-3.5 flex flex-col justify-between">
                                                    <div className="flex items-start justify-between">
                                                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-cyan-900/80 text-cyan-300">CUSTOM</span>
                                                        {isActive && <span className="text-[8px] font-black text-system-neon bg-black/60 px-1.5 py-0.5 rounded-full border border-system-neon/30">ACTIVE</span>}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-black text-white leading-tight mb-1.5">{cp.name}</div>
                                                        <div className="text-[9px] text-cyan-300/70 font-mono">{cpDays.length} days</div>
                                                    </div>
                                                </div>
                                            </motion.button>
                                        );
                                    })}

                                    {premadePlans.length === 0 && !customPlans.length && !(healthProfile as any)?.aiPlanUsed && (
                                        <div className="flex items-center justify-center w-full py-6 text-center">
                                            <div>
                                                <div className="text-[10px] text-gray-600 font-mono mb-1">No plans yet.</div>
                                                <div className="text-[9px] text-gray-700">Use AI to generate a personalized plan →</div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* ── AI CONFIRM POPUP ── */}
                            {showAIConfirm && (
                                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
                                    <motion.div
                                        key={aiConfirmStep}
                                        initial={{ scale: 0.92, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 0.92, opacity: 0 }}
                                        className="w-full max-w-sm rounded-3xl p-6"
                                        style={{
                                            background: 'rgba(15,5,30,0.95)',
                                            border: '1px solid rgba(168,85,247,0.4)',
                                            boxShadow: '0 0 60px rgba(168,85,247,0.2), 0 20px 60px rgba(0,0,0,0.6)',
                                        }}
                                    >
                                        <div className="flex items-center gap-3 mb-5">
                                            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(168,85,247,0.2)', border: '1px solid rgba(168,85,247,0.3)' }}>
                                                <Sparkles size={18} className="text-purple-400" />
                                            </div>
                                            <div>
                                                <div className="text-[9px] font-bold text-purple-400/70 uppercase tracking-widest">ForgeGuard AI · Step {aiConfirmStep + 1} of 3</div>
                                                <div className="text-base font-black text-white">
                                                    {aiConfirmStep === 0 ? 'Training Frequency' : aiConfirmStep === 1 ? 'Session Duration' : 'Generate Your Plan'}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Step 0 — Days per week */}
                                        {aiConfirmStep === 0 && (
                                            <>
                                                <p className="text-[11px] text-gray-400 leading-relaxed mb-4">How many days per week do you work out?</p>
                                                <div className="grid grid-cols-7 gap-1.5 mb-5">
                                                    {[1,2,3,4,5,6,7].map(d => (
                                                        <button
                                                            key={d}
                                                            onClick={() => setAiDaysPerWeek(d)}
                                                            className="py-3 rounded-xl text-sm font-black transition-all"
                                                            style={aiDaysPerWeek === d
                                                                ? { background: 'linear-gradient(135deg,#7c3aed,#9333ea)', color: '#fff', boxShadow: '0 0 16px rgba(139,92,246,0.5)' }
                                                                : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af' }
                                                            }
                                                        >{d}</button>
                                                    ))}
                                                </div>
                                                <div className="text-center text-[10px] text-purple-300/60 font-mono mb-5">{aiDaysPerWeek} day{aiDaysPerWeek > 1 ? 's' : ''} per week selected</div>
                                                <div className="flex gap-3">
                                                    <button onClick={() => { setShowAIConfirm(false); setAiPlanError(null); setAiConfirmStep(0); }} className="flex-1 py-3 rounded-xl text-[11px] font-bold text-gray-500 border border-gray-800">Cancel</button>
                                                    <button onClick={() => setAiConfirmStep(1)} className="flex-1 py-3 rounded-xl text-[11px] font-black text-white" style={{ background: 'linear-gradient(135deg,#7c3aed,#9333ea)', boxShadow: '0 0 20px rgba(139,92,246,0.4)' }}>Next →</button>
                                                </div>
                                            </>
                                        )}

                                        {/* Step 1 — Session duration */}
                                        {aiConfirmStep === 1 && (
                                            <>
                                                <p className="text-[11px] text-gray-400 leading-relaxed mb-4">How long is each workout session?</p>
                                                <div className="grid grid-cols-2 gap-2 mb-5">
                                                    {[30,45,60,90].map(min => (
                                                        <button
                                                            key={min}
                                                            onClick={() => setAiSessionDuration(min)}
                                                            className="py-4 rounded-xl font-black transition-all"
                                                            style={aiSessionDuration === min
                                                                ? { background: 'linear-gradient(135deg,#7c3aed,#9333ea)', color: '#fff', boxShadow: '0 0 16px rgba(139,92,246,0.5)' }
                                                                : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af' }
                                                            }
                                                        >
                                                            <div className="text-lg">{min}</div>
                                                            <div className="text-[9px] opacity-70">minutes</div>
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className="flex gap-3">
                                                    <button onClick={() => setAiConfirmStep(0)} className="flex-1 py-3 rounded-xl text-[11px] font-bold text-gray-500 border border-gray-800">← Back</button>
                                                    <button onClick={() => setAiConfirmStep(2)} className="flex-1 py-3 rounded-xl text-[11px] font-black text-white" style={{ background: 'linear-gradient(135deg,#7c3aed,#9333ea)', boxShadow: '0 0 20px rgba(139,92,246,0.4)' }}>Next →</button>
                                                </div>
                                            </>
                                        )}

                                        {/* Step 2 — Confirm & generate */}
                                        {aiConfirmStep === 2 && (
                                            <>
                                                <div className="flex gap-2 mb-4">
                                                    <div className="flex-1 px-3 py-2.5 rounded-xl text-center" style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)' }}>
                                                        <div className="text-lg font-black text-white">{aiDaysPerWeek}</div>
                                                        <div className="text-[9px] text-purple-300/70 font-mono">days/week</div>
                                                    </div>
                                                    <div className="flex-1 px-3 py-2.5 rounded-xl text-center" style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)' }}>
                                                        <div className="text-lg font-black text-white">{aiSessionDuration}</div>
                                                        <div className="text-[9px] text-purple-300/70 font-mono">min/session</div>
                                                    </div>
                                                </div>
                                                <p className="text-[11px] text-gray-400 leading-relaxed mb-3">
                                                    AI will build a <span className="text-white font-bold">{aiDaysPerWeek}-day plan</span> with <span className="text-white font-bold">{aiSessionDuration}-min sessions</span> — tailored to your <span className="text-white font-bold">{(healthProfile || formData).goal || 'RECOMP'}</span> goal using only exercises from the library.
                                                </p>
                                                {(healthProfile as any)?.aiPlanUsed ? (
                                                    <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl" style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)' }}>
                                                        <span className="text-sm">🗝</span>
                                                        <span className="text-[11px] text-purple-300 font-bold">Costs 5 Keys</span>
                                                        <span className="text-[10px] text-gray-500 ml-auto">You have {playerData.keys}</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl" style={{ background: 'rgba(0,210,255,0.08)', border: '1px solid rgba(0,210,255,0.2)' }}>
                                                        <span className="text-sm">✨</span>
                                                        <span className="text-[11px] text-system-neon font-bold">Free — First Time!</span>
                                                    </div>
                                                )}
                                                {aiPlanError && (
                                                    <div className="mb-3 px-3 py-2 rounded-xl bg-red-900/30 border border-red-700/40 text-[10px] text-red-400">{aiPlanError}</div>
                                                )}
                                                {isGeneratingPlan ? (
                                                    <div className="flex flex-col items-center py-4 gap-3">
                                                        <div className="flex gap-1.5">
                                                            {[0,1,2].map(i => (
                                                                <div key={i} className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                                                            ))}
                                                        </div>
                                                        <div className="text-[10px] text-purple-400/70 font-mono">ForgeGuard is crafting your protocol...</div>
                                                    </div>
                                                ) : (
                                                    <div className="flex gap-3">
                                                        <button onClick={() => setAiConfirmStep(1)} className="flex-1 py-3 rounded-xl text-[11px] font-bold text-gray-500 border border-gray-800">← Back</button>
                                                        <button
                                                            onClick={handleGenerateAIPlan}
                                                            disabled={(healthProfile as any)?.aiPlanUsed && playerData.keys < 5}
                                                            className="flex-1 py-3 rounded-xl text-[11px] font-black text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                                            style={{ background: 'linear-gradient(135deg,#7c3aed,#9333ea)', boxShadow: '0 0 20px rgba(139,92,246,0.4)' }}
                                                        >
                                                            Generate Plan
                                                        </button>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </motion.div>
                                </div>
                            )}

                            {/* ── WORKOUT MAP ── */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="text-[10px] text-gray-500 font-mono">
                                        {healthProfile?.selectedPlanName ? (
                                            <span>Program: <span className="text-system-neon font-bold">{healthProfile.selectedPlanName}</span></span>
                                        ) : (
                                            <span className="text-gray-700">Default System Protocol</span>
                                        )}
                                    </div>
                                </div>
                                <WorkoutMap currentWeight={healthProfile?.weight || 0} targetWeight={healthProfile?.targetWeight || 0} workoutPlan={calculatedPlan} completedDays={completedWorkouts} onStartDay={(idx) => { setActivePlan(calculatedPlan[idx % calculatedPlan.length]); setViewMode('OVERVIEW'); }} />
                            </div>

                            {/* ── PROTOCOL CALENDAR ── */}
                            <ProtocolMonthView plan={calculatedPlan} />

                            {/* ── FAB: Custom Plan Builder ── */}
                            <div className="fixed bottom-24 right-4 z-40">
                                <motion.button
                                    onClick={() => { setShowCustomPlanBuilder(true); onToggleNav?.(false); }}
                                    className="animate-fab-float w-14 h-14 bg-system-neon text-black rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(0,210,255,0.5),0_4px_15px_rgba(0,0,0,0.4)] hover:bg-white transition-all"
                                    whileTap={{ scale: 0.9 }}
                                >
                                    <Plus size={24} strokeWidth={3} />
                                </motion.button>
                            </div>
                        </motion.div>
                        );
                    })()}
                    
                    {activeTab === 'NUTRITION' && (
                        <motion.div 
                            key="nut" 
                            initial={{ opacity: 0, y: 10 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            exit={{ opacity: 0, y: -10 }} 
                            className="flex flex-col items-center gap-6 px-4"
                        >
                            <motion.div 
                                className="w-full max-w-sm rounded-2xl p-6"
                                initial={{ scale: 0.95 }}
                                animate={{ scale: 1 }}
                                style={{
                                  background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(8,8,20,0.82) 12%, rgba(4,4,14,0.92) 100%)',
                                  backdropFilter: 'blur(24px) saturate(180%)',
                                  WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                                  borderTop: '1px solid rgba(255,255,255,0.13)',
                                  borderLeft: '1px solid rgba(255,255,255,0.07)',
                                  borderRight: '1px solid rgba(255,255,255,0.04)',
                                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07), 0 8px 32px rgba(0,0,0,0.45)',
                                }}
                            >
                                <h3 className="text-xs font-bold text-gray-400 mb-4 tracking-widest flex items-center gap-2 uppercase">
                                    <Clock size={14} className="text-system-neon" /> Daily Fuel Status
                                </h3>
                                
                                {/* Calories Comparison */}
                                <div className="flex justify-between items-end mb-2">
                                    <div>
                                        <div className="text-[10px] text-gray-500 uppercase font-bold">Consumed</div>
                                        <div className="text-2xl font-black text-white">{dailyIntake.calories}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] text-gray-500 uppercase font-bold">Target</div>
                                        <div className="text-2xl font-black text-gray-400">{nutritionInfo.macros.calories}</div>
                                    </div>
                                </div>
                                
                                {/* Calorie Progress Bar */}
                                <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-6">
                                    <motion.div 
                                        className={`h-full ${dailyIntake.calories > nutritionInfo.macros.calories ? 'bg-red-500' : 'bg-system-neon'}`}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min((dailyIntake.calories / nutritionInfo.macros.calories) * 100, 100)}%` }}
                                    />
                                </div>

                                {/* Remaining Budget Display */}
                                <div className="rounded-xl p-4 text-center mb-6" style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Remaining Calories Budget</div>
                                    <div className={`text-3xl font-black ${nutritionInfo.macros.calories - dailyIntake.calories < 0 ? 'text-red-500' : 'text-system-success'}`}>
                                        {Math.max(0, nutritionInfo.macros.calories - dailyIntake.calories)} <span className="text-xs font-normal text-gray-600">KCAL</span>
                                    </div>
                                </div>

                                {/* Macro Breakdown */}
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="text-center">
                                        <div className="text-[9px] text-gray-500 uppercase font-bold mb-1 flex justify-center items-center gap-1"><Beef size={10} /> PRO</div>
                                        <div className="text-xs font-bold text-blue-400">{dailyIntake.protein} / {nutritionInfo.macros.protein}g</div>
                                        <div className="h-1 bg-gray-800 mt-1 rounded-full"><div style={{ width: `${Math.min((dailyIntake.protein / nutritionInfo.macros.protein)*100, 100)}%` }} className="h-full bg-blue-500" /></div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-[9px] text-gray-500 uppercase font-bold mb-1 flex justify-center items-center gap-1"><Wheat size={10} /> CARB</div>
                                        <div className="text-xs font-bold text-green-400">{dailyIntake.carbs} / {nutritionInfo.macros.carbs}g</div>
                                        <div className="h-1 bg-gray-800 mt-1 rounded-full"><div style={{ width: `${Math.min((dailyIntake.carbs / nutritionInfo.macros.carbs)*100, 100)}%` }} className="h-full bg-green-500" /></div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-[9px] text-gray-500 uppercase font-bold mb-1 flex justify-center items-center gap-1"><Droplets size={10} /> FAT</div>
                                        <div className="text-xs font-bold text-yellow-400">{dailyIntake.fats} / {nutritionInfo.macros.fats}g</div>
                                        <div className="h-1 bg-gray-800 mt-1 rounded-full"><div style={{ width: `${Math.min((dailyIntake.fats / nutritionInfo.macros.fats)*100, 100)}%` }} className="h-full bg-yellow-500" /></div>
                                    </div>
                                </div>
                            </motion.div>

                            {/* STATE: IDLE - MEAL TYPE + UPLOAD AREA */}
                            {scanState === 'IDLE' && (
                                <motion.div 
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="w-full max-w-sm space-y-3"
                                >
                                    {/* Meal Type Selector */}
                                    <div>
                                        <div className="text-[9px] font-mono text-gray-500 uppercase tracking-widest mb-2 text-center">Select Meal</div>
                                        <div className="grid grid-cols-4 gap-1.5">
                                            {(['BREAKFAST', 'LUNCH', 'SNACK', 'DINNER'] as MealType[]).map(type => {
                                                const icons: Record<MealType, string> = { BREAKFAST: '🌅', LUNCH: '☀️', SNACK: '🍎', DINNER: '🌙' };
                                                return (
                                                    <button
                                                        key={type}
                                                        onClick={() => setSelectedMealType(type)}
                                                        className={`py-2 rounded-xl border text-[9px] font-mono font-bold tracking-widest flex flex-col items-center gap-1 transition-all ${
                                                            selectedMealType === type
                                                                ? 'border-system-neon/60 bg-system-neon/10 text-system-neon'
                                                                : 'border-gray-800 text-gray-600 hover:border-gray-600 hover:text-gray-400'
                                                        }`}
                                                    >
                                                        <span>{icons[type]}</span>
                                                        <span>{type.charAt(0) + type.slice(1).toLowerCase()}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <div className="bg-gray-900/40 border-2 border-dashed border-gray-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-4 hover:border-system-neon/50 hover:bg-gray-900/60 transition-all cursor-pointer relative overflow-hidden group h-[200px]">
                                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-system-neon/5 to-transparent translate-y-[-100%] group-hover:translate-y-[100%] transition-transform duration-1000 ease-in-out pointer-events-none" />
                                        
                                        <div className="w-16 h-16 rounded-full bg-black border border-system-neon/30 flex items-center justify-center relative shadow-[0_0_30px_rgba(0,210,255,0.1)] group-hover:shadow-[0_0_50px_rgba(0,210,255,0.2)] transition-shadow">
                                            <Camera size={24} className="text-system-neon relative z-10" />
                                            <div className="absolute inset-0 rounded-full border border-system-neon opacity-20 animate-ping" />
                                        </div>
                                        
                                        <div>
                                            <h3 className="text-lg font-bold text-white font-mono tracking-tight">LOG MEAL</h3>
                                            <p className="text-[9px] text-gray-500 font-mono tracking-widest uppercase mt-1 flex items-center justify-center gap-1">
                                                <Key size={10} className="text-purple-500" /> 1 KEY REQUIRED
                                            </p>
                                        </div>

                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            capture="environment" 
                                            ref={fileInputRef}
                                            onChange={handleFileUpload}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                        />
                                    </div>
                                </motion.div>
                            )}

                            {/* STATE: SCANNING */}
                            {scanState === 'SCANNING' && scannedImage && (
                                <motion.div 
                                    className="w-full max-w-sm bg-black border border-system-neon/50 rounded-2xl overflow-hidden relative shadow-[0_0_50px_rgba(0,210,255,0.2)]"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                >
                                    <div className="aspect-[4/5] relative">
                                        <img src={scannedImage} alt="Scanning" className="w-full h-full object-cover opacity-60" />
                                        
                                        {/* Scanning Beam */}
                                        <motion.div 
                                            className="absolute left-0 w-full h-1 bg-system-neon shadow-[0_0_20px_#00d2ff,0_0_10px_white] z-10"
                                            animate={{ top: ['0%', '100%', '0%'] }}
                                            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                        />
                                        
                                        {/* Grid Overlay */}
                                        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,210,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,210,255,0.1)_1px,transparent_1px)] bg-[size:40px_40px] z-0 pointer-events-none" />
                                        
                                        <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                                            <div className="bg-black/80 backdrop-blur-md px-6 py-3 rounded-lg border border-system-neon/30 flex items-center gap-3">
                                                <Loader2 size={18} className="text-system-neon animate-spin" />
                                                <span className="text-xs font-mono text-white tracking-widest font-bold">{loadingMessage}</span>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* STATE: ERROR */}
                            {scanState === 'ERROR' && (
                                <motion.div
                                    className="w-full max-w-sm bg-[#0a0a0a] border border-red-900/50 rounded-2xl p-6 text-center space-y-4"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                >
                                    <div className="text-red-400 text-4xl">⚠</div>
                                    <div className="text-xs font-bold text-red-400 tracking-widest">ANALYSIS FAILED</div>
                                    <div className="text-xs text-gray-500">{scanError || 'Unknown error. Try a clearer photo.'}</div>
                                    <button
                                        onClick={resetScanner}
                                        className="w-full py-3 rounded-xl border border-gray-700 text-gray-300 font-mono font-bold text-xs hover:border-gray-500 transition-colors"
                                    >
                                        TRY AGAIN
                                    </button>
                                </motion.div>
                            )}

                            {/* STATE: RESULT */}
                            {scanState === 'RESULT' && scanResult && scannedImage && (
                                <motion.div 
                                    className="w-full max-w-sm bg-[#0a0a0a] border border-system-border rounded-2xl overflow-hidden shadow-2xl relative"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                >
                                    <div className="relative h-48">
                                        <img src={scannedImage} alt="Result" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
                                        <div className="absolute bottom-4 left-4 right-4">
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className="text-[10px] text-system-neon font-bold tracking-widest bg-system-neon/10 px-2 py-0.5 rounded border border-system-neon/30">
                                                    SCAN COMPLETE
                                                </div>
                                                {scanResult.aiConfidence && (
                                                    <div className={`text-[9px] font-bold tracking-widest px-2 py-0.5 rounded border ${
                                                        scanResult.aiConfidence === 'High'
                                                            ? 'text-green-400 bg-green-400/10 border-green-400/30'
                                                            : scanResult.aiConfidence === 'Medium'
                                                            ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30'
                                                            : 'text-orange-400 bg-orange-400/10 border-orange-400/30'
                                                    }`}>
                                                        {scanResult.aiConfidence.toUpperCase()} CONFIDENCE
                                                    </div>
                                                )}
                                            </div>
                                            <h3 className="text-xl font-black text-white italic leading-tight">{scanResult.name}</h3>
                                            {scanResult.servingSize && (
                                                <div className="text-[10px] text-gray-400 mt-0.5">{scanResult.servingSize}</div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="p-5 space-y-4">
                                        {/* Total Calories */}
                                        <div className="flex items-center justify-between bg-white/5 px-4 py-3 rounded-xl border border-white/10">
                                            <div className="flex items-center gap-2">
                                                <Flame size={18} className="text-orange-500" />
                                                <span className="text-xs font-bold text-gray-300 tracking-widest">TOTAL ENERGY</span>
                                            </div>
                                            <div className="text-3xl font-black text-white tracking-tighter">
                                                {scanResult.calories} <span className="text-sm font-normal text-gray-500">KCAL</span>
                                            </div>
                                        </div>

                                        {/* Macros Grid */}
                                        <div>
                                            <div className="text-[9px] text-gray-600 font-bold tracking-widest mb-2 uppercase">Macronutrients</div>
                                            <div className="grid grid-cols-3 gap-2 mb-2">
                                                <div className="text-center p-2.5 bg-gray-900/50 rounded-xl border border-gray-800">
                                                    <div className="text-[9px] text-blue-400 font-bold mb-1 tracking-widest">PROTEIN</div>
                                                    <div className="text-base font-black text-white">{scanResult.protein}g</div>
                                                    <div className="h-0.5 bg-gray-800 mt-1.5 rounded-full overflow-hidden">
                                                        <div className="h-full bg-blue-500" style={{ width: `${Math.min(100, (scanResult.protein / 50) * 100)}%` }} />
                                                    </div>
                                                </div>
                                                <div className="text-center p-2.5 bg-gray-900/50 rounded-xl border border-gray-800">
                                                    <div className="text-[9px] text-green-400 font-bold mb-1 tracking-widest">CARBS</div>
                                                    <div className="text-base font-black text-white">{scanResult.carbs}g</div>
                                                    <div className="h-0.5 bg-gray-800 mt-1.5 rounded-full overflow-hidden">
                                                        <div className="h-full bg-green-500" style={{ width: `${Math.min(100, (scanResult.carbs / 130) * 100)}%` }} />
                                                    </div>
                                                </div>
                                                <div className="text-center p-2.5 bg-gray-900/50 rounded-xl border border-gray-800">
                                                    <div className="text-[9px] text-yellow-400 font-bold mb-1 tracking-widest">FATS</div>
                                                    <div className="text-base font-black text-white">{scanResult.fats}g</div>
                                                    <div className="h-0.5 bg-gray-800 mt-1.5 rounded-full overflow-hidden">
                                                        <div className="h-full bg-yellow-500" style={{ width: `${Math.min(100, (scanResult.fats / 65) * 100)}%` }} />
                                                    </div>
                                                </div>
                                            </div>
                                            {(scanResult.fiber != null || scanResult.sugar != null) && (
                                                <div className="grid grid-cols-2 gap-2">
                                                    {scanResult.fiber != null && (
                                                        <div className="text-center p-2 bg-gray-900/30 rounded-xl border border-gray-800/60">
                                                            <div className="text-[9px] text-purple-400 font-bold mb-0.5 tracking-widest">FIBER</div>
                                                            <div className="text-sm font-black text-white">{scanResult.fiber}g</div>
                                                        </div>
                                                    )}
                                                    {scanResult.sugar != null && (
                                                        <div className="text-center p-2 bg-gray-900/30 rounded-xl border border-gray-800/60">
                                                            <div className="text-[9px] text-pink-400 font-bold mb-0.5 tracking-widest">SUGAR</div>
                                                            <div className="text-sm font-black text-white">{scanResult.sugar}g</div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Micronutrients Collapsible */}
                                        {(scanResult.sodium != null || scanResult.vitaminA != null) && (
                                            <div className="bg-gray-900/30 rounded-xl border border-gray-800/60 overflow-hidden">
                                                <button
                                                    onClick={() => setShowMicros(v => !v)}
                                                    className="w-full flex items-center justify-between px-4 py-2.5 text-[9px] font-bold text-gray-400 tracking-widest uppercase hover:text-white transition-colors"
                                                >
                                                    <span>MICRONUTRIENTS</span>
                                                    <span className="text-system-neon">{showMicros ? '▲' : '▼'}</span>
                                                </button>
                                                {showMicros && (
                                                    <div className="px-4 pb-4 space-y-2.5">
                                                        {[
                                                            { label: 'Sodium', value: scanResult.sodium, unit: 'mg', max: 2300, color: 'bg-red-500' },
                                                            { label: 'Potassium', value: scanResult.potassium, unit: 'mg', max: 4700, color: 'bg-orange-400' },
                                                            { label: 'Vitamin A', value: scanResult.vitaminA, unit: '% DV', max: 100, color: 'bg-yellow-400' },
                                                            { label: 'Vitamin C', value: scanResult.vitaminC, unit: '% DV', max: 100, color: 'bg-orange-300' },
                                                            { label: 'Vitamin D', value: scanResult.vitaminD, unit: '% DV', max: 100, color: 'bg-amber-400' },
                                                            { label: 'Vitamin B12', value: scanResult.vitaminB12, unit: '% DV', max: 100, color: 'bg-cyan-400' },
                                                            { label: 'Calcium', value: scanResult.calcium, unit: '% DV', max: 100, color: 'bg-blue-300' },
                                                            { label: 'Iron', value: scanResult.iron, unit: '% DV', max: 100, color: 'bg-gray-400' },
                                                        ].filter(m => m.value != null).map(micro => (
                                                            <div key={micro.label}>
                                                                <div className="flex justify-between text-[9px] mb-1">
                                                                    <span className="text-gray-400 font-bold">{micro.label}</span>
                                                                    <span className="text-white font-mono">{micro.value}{micro.unit}</span>
                                                                </div>
                                                                <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                                                                    <div
                                                                        className={`h-full ${micro.color} rounded-full transition-all`}
                                                                        style={{ width: `${Math.min(100, ((micro.value ?? 0) / micro.max) * 100)}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Ingredients Chips */}
                                        {scanResult.ingredients && scanResult.ingredients.length > 0 && (
                                            <div>
                                                <div className="text-[9px] text-gray-600 font-bold tracking-widest mb-2 uppercase">Detected Ingredients</div>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {scanResult.ingredients.map((ing, idx) => (
                                                        <span
                                                            key={idx}
                                                            className="text-[9px] font-mono text-system-neon bg-system-neon/10 border border-system-neon/20 px-2 py-0.5 rounded-full capitalize"
                                                        >
                                                            {ing}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Meal Type Selector */}
                                        <div>
                                            <div className="text-[9px] font-mono text-gray-500 uppercase tracking-widest mb-2">Log As</div>
                                            <div className="grid grid-cols-4 gap-1.5">
                                                {(['BREAKFAST', 'LUNCH', 'SNACK', 'DINNER'] as MealType[]).map(type => {
                                                    const icons: Record<MealType, string> = { BREAKFAST: '🌅', LUNCH: '☀️', SNACK: '🍎', DINNER: '🌙' };
                                                    return (
                                                        <button
                                                            key={type}
                                                            onClick={() => setSelectedMealType(type)}
                                                            className={`py-1.5 rounded-lg border text-[8px] font-mono font-bold flex flex-col items-center gap-0.5 transition-all ${
                                                                selectedMealType === type
                                                                    ? 'border-system-neon/60 bg-system-neon/10 text-system-neon'
                                                                    : 'border-gray-800 text-gray-600 hover:border-gray-700'
                                                            }`}
                                                        >
                                                            <span>{icons[type]}</span>
                                                            <span>{type.charAt(0) + type.slice(1).toLowerCase()}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="grid grid-cols-2 gap-3 pt-1">
                                            <button 
                                                onClick={resetScanner}
                                                className="py-3 rounded-xl border border-gray-800 text-gray-400 font-mono font-bold text-xs hover:text-white hover:border-gray-600 transition-colors flex items-center justify-center gap-2"
                                            >
                                                <Trash2 size={16} /> DISCARD
                                            </button>
                                            <button 
                                                onClick={confirmLog}
                                                className="py-3 rounded-xl bg-system-neon text-black font-mono font-black text-xs hover:bg-white transition-colors flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,210,255,0.4)]"
                                            >
                                                <Save size={16} /> CONFIRM LOG
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </motion.div>
                    )}

                    {/* ── 4-SECTION FOOD LOG ── */}
                    {activeTab === 'NUTRITION' && (() => {
                        const todayStart = new Date(); todayStart.setHours(0,0,0,0);
                        const todayLogs = (playerData.nutritionLogs || []).filter(l => l.timestamp >= todayStart.getTime());
                        const MEAL_SECTIONS: { type: MealType; label: string; icon: string; accent: string }[] = [
                            { type: 'BREAKFAST', label: 'Breakfast', icon: '🌅', accent: '#f59e0b' },
                            { type: 'LUNCH', label: 'Lunch', icon: '☀️', accent: '#00d2ff' },
                            { type: 'SNACK', label: 'Snack', icon: '🍎', accent: '#10b981' },
                            { type: 'DINNER', label: 'Dinner', icon: '🌙', accent: '#8b5cf6' },
                        ];
                        const totalLogged = todayLogs.length;
                        if (totalLogged === 0) return null;
                        return (
                            <motion.div
                                key="foodlog"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="w-full max-w-sm px-0 space-y-3 pb-4"
                            >
                                <div className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest text-center pt-2">Today's Meal Log</div>
                                {MEAL_SECTIONS.map(section => {
                                    const sectionLogs = todayLogs.filter(l => (l.mealType || 'LUNCH') === section.type);
                                    const sectionCals = sectionLogs.reduce((s, l) => s + l.totalCalories, 0);
                                    if (sectionLogs.length === 0) return null;
                                    return (
                                        <div key={section.type} className="bg-black/40 border border-white/[0.05] rounded-2xl overflow-hidden">
                                            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.04]">
                                                <div className="flex items-center gap-2">
                                                    <span>{section.icon}</span>
                                                    <span className="text-xs font-bold text-white font-mono">{section.label}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-mono" style={{ color: section.accent }}>{sectionCals} kcal</span>
                                                </div>
                                            </div>
                                            <div className="divide-y divide-white/[0.03]">
                                                {sectionLogs.map(log => (
                                                    <div key={log.id} className="flex items-center gap-3 px-4 py-2.5">
                                                        {log.imageUrl && (
                                                            <img src={log.imageUrl} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0 opacity-80" />
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-[11px] font-bold text-gray-300 truncate">{log.label}</div>
                                                            <div className="text-[9px] font-mono text-gray-600 mt-0.5">
                                                                P:{log.totalProtein}g  C:{log.totalCarbs}g  F:{log.totalFats}g
                                                            </div>
                                                        </div>
                                                        <div className="text-xs font-black font-mono text-white flex-shrink-0">{log.totalCalories}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </motion.div>
                        );
                    })()}
                    
                    {activeTab === 'BODY' && (
                        <motion.div 
                            key="body" 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }} 
                            className="flex flex-col items-center justify-center text-gray-600 pt-20"
                        >
                            <Utensils size={48} className="mb-4 opacity-50" />
                            <div className="text-xs font-mono tracking-widest uppercase">Biometric Gallery Offline</div>
                            <div className="text-[10px] mt-2">Feature pending next system update.</div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>

        {/* ── Custom Plan Builder Fullscreen Overlay ── */}
        {showCustomPlanBuilder && (
            <CustomPlanBuilder
                onClose={() => {
                    setShowCustomPlanBuilder(false);
                    onToggleNav?.(true);
                    fetch('/api/workout/custom-plans', { credentials: 'include' })
                        .then(r => r.ok ? r.json() : [])
                        .then(data => setCustomPlans(Array.isArray(data) ? data : []))
                        .catch(() => {});
                }}
                onStartWorkout={(day) => {
                    setShowCustomPlanBuilder(false);
                    onToggleNav?.(true);
                    fetch('/api/workout/custom-plans', { credentials: 'include' })
                        .then(r => r.ok ? r.json() : [])
                        .then(data => setCustomPlans(Array.isArray(data) ? data : []))
                        .catch(() => {});
                    setActivePlan(day);
                    setViewMode('OVERVIEW');
                }}
            />
        )}
    </>
  );
};
