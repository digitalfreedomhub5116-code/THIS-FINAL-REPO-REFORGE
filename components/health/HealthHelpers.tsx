
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Activity, Cpu, Flame, Loader2 } from 'lucide-react';
import { playSystemSoundEffect } from '../../utils/soundEngine';

// --- OPTIMIZATION SEQUENCE COMPONENT ---
export const OptimizationSequence: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
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

export const BMIGauge = ({ value }: { value: number }) => {
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

export const BMRWave = () => (
    <div className="relative w-24 h-12 flex items-center justify-center overflow-hidden bg-gray-900/30 rounded-lg border border-gray-800">
        <Activity className="text-system-accent animate-pulse" />
    </div>
);

export const DurationGraph = () => (
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

export const CircularCalibration = ({ percent }: { percent: number }) => {
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

export const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians))
  };
};

export const TechRadar = React.memo(({ data, color, label, isAnimating, showEntrance = false }: { data: { value: number; fullMark: number; subject: string }[], color: string, label: string, isAnimating?: boolean, showEntrance?: boolean }) => {
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

export const calculateNutritionPlan = (profile: Partial<import('../../types').HealthProfile>) => {
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

export const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { label: 'Underweight', color: 'text-yellow-500' };
    if (bmi < 25) return { label: 'Healthy Weight', color: 'text-system-success' };
    if (bmi < 30) return { label: 'Overweight', color: 'text-orange-500' };
    if (bmi < 40) return { label: 'Obesity', color: 'text-red-500' };
    return { label: 'Severe Obesity', color: 'text-red-700' };
};

export const lerp = (start: number, end: number, t: number) => start * (1 - t) + end * t;
export const lerpColor = (a: string, b: string, amount: number) => { 
    const ah = parseInt(a.replace(/#/g, ''), 16), ar = ah >> 16, ag = ah >> 8 & 0xff, ab = ah & 0xff, bh = parseInt(b.replace(/#/g, ''), 16), br = bh >> 16, bg = bh >> 8 & 0xff, bb = bh & 0xff, rr = ar + amount * (br - ar), rg = ag + amount * (bg - ag), rb = ab + amount * (bb - ab);
    return '#' + ((1 << 24) + (Math.round(rr) << 16) + (Math.round(rg) << 8) + Math.round(rb)).toString(16).slice(1);
}

export const setupContainerVariants: Variants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } }, exit: { opacity: 0, x: -20, transition: { duration: 0.2 } } };
export const setupItemVariants: Variants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } };

// --- AI GENERATING LOADER (Irregular progress) ---
const AI_LOADER_MESSAGES = [
  "Analyzing your biometrics...",
  "Selecting optimal exercises...",
  "Calibrating volume & intensity...",
  "Building periodization model...",
  "Optimizing rest intervals...",
  "Finalizing your protocol...",
];

export const AIGeneratingLoader: React.FC = () => {
  const [progress, setProgress] = useState(0);
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    let frame: ReturnType<typeof setTimeout>;
    let current = 0;
    const tick = () => {
      // Irregular increments: sometimes fast, sometimes stalls
      const rand = Math.random();
      let increment = 0;
      if (rand < 0.3) increment = 0; // stall 30% of the time
      else if (rand < 0.7) increment = Math.random() * 1.5 + 0.3;
      else increment = Math.random() * 3 + 1;

      current = Math.min(current + increment, 92); // never reaches 100 on its own
      setProgress(current);
      frame = setTimeout(tick, 200 + Math.random() * 400);
    };
    frame = setTimeout(tick, 300);
    return () => clearTimeout(frame);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setMsgIdx(p => (p + 1) % AI_LOADER_MESSAGES.length), 3000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex flex-col items-center py-5 gap-3">
      <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: 'linear-gradient(90deg, #7c3aed, #a855f7, #7c3aed)' }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>
      <div className="flex items-center gap-2">
        <Loader2 size={12} className="text-purple-400 animate-spin" />
        <AnimatePresence mode="wait">
          <motion.div
            key={msgIdx}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="text-[10px] text-purple-400/80 font-mono"
          >
            {AI_LOADER_MESSAGES[msgIdx]}
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="text-[9px] text-gray-600 font-mono">{Math.floor(progress)}% — Do not close this screen</div>
    </div>
  );
};

// --- MAIN EXPORTED COMPONENT ---

export const GeneratingMessage: React.FC<{ messages: string[] }> = ({ messages }) => {
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

// ── Flame Lottie (module-level cache) ──
import Lottie from 'lottie-react';

let _flameLottieData: object | null | false = null;

export const FlameLottie: React.FC<{ size?: number; className?: string }> = ({ size = 80, className = "" }) => {
  const [lottieData, setLottieData] = useState<object | null | false>(_flameLottieData);

  useEffect(() => {
    if (_flameLottieData !== null) { setLottieData(_flameLottieData); return; }
    fetch('/assets/lottie/flame.json')
      .then(r => r.ok ? r.json() : null)
      .then(data => { _flameLottieData = data ?? false; setLottieData(_flameLottieData); })
      .catch(() => { _flameLottieData = false; setLottieData(false); });
  }, []);

  if (lottieData) {
    return (
      <div style={{ width: size, height: size }} className={`relative flex-shrink-0 flex items-center justify-center ${className}`}>
        <Lottie animationData={lottieData} loop autoplay className="w-full h-full object-cover scale-[1.35]" />
      </div>
    );
  }

  // Fallback if flame.json fails to load or hasn't loaded yet
  return <div style={{ width: size, height: size }} className={`relative flex items-center justify-center ${className}`}><Flame size={size * 0.6} className="text-orange-500 fill-orange-500 animate-pulse" /></div>;
};

// ── Streak Rewards Timeline Wrapper ──
import StreakRewardsTimeline from '../StreakRewardsTimeline';
import { useSystem } from '../../hooks/useSystem';
import { PlayerData } from '../../types';

export const StreakRewardsTimelineWrapper: React.FC<{ playerData: PlayerData }> = ({ playerData }) => {
  const { claimStreakReward } = useSystem();
  return (
    <StreakRewardsTimeline
      streak={playerData.streak || 0}
      claimedDays={playerData.claimedStreakRewards || []}
      onClaimReward={(day, reward) => {
        claimStreakReward(day, reward);
        // Dispatch HUD animations
        if (reward.type === 'GOLD' || reward.type === 'ALLIANCE_CHEST') {
          window.dispatchEvent(new CustomEvent('reforge:coin-earned', { detail: { goldGained: reward.type === 'ALLIANCE_CHEST' ? 600 : reward.amount } }));
        }
        if (reward.type === 'KEY' || reward.type === 'ALLIANCE_CHEST') {
          window.dispatchEvent(new CustomEvent('reforge:key-earned', { detail: { amount: reward.type === 'ALLIANCE_CHEST' ? 5 : reward.amount } }));
        }
      }}
    />
  );
};
