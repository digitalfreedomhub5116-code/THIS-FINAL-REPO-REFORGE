
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence, Variants, animate } from 'framer-motion';
import { User, Activity, Ruler, Weight, Target, ChevronLeft, ChevronRight, Zap, Clock, TrendingUp, ShieldCheck, Dumbbell, Brain, Shield, Users, Hourglass, Sparkles, AlertTriangle, Eye, BookOpen, Moon } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine } from 'recharts';
import { HealthProfile, CoreStats, BaselineStats } from '../types';
import SystemPersonalizationScreen from './SystemPersonalizationScreen';

interface CalibrationFlowProps {
  onComplete: (profile: HealthProfile, calculatedStats: CoreStats) => void;
}

const setupContainerVariants: Variants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } }, exit: { opacity: 0, x: -20, transition: { duration: 0.2 } } };
const setupItemVariants: Variants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } };



const BMIGauge = ({ value }: { value: number }) => {
    // Simple Linear Gauge
    const percent = Math.min(100, Math.max(0, ((value - 15) / (40 - 15)) * 100));

    return (
        <div className="w-24 mt-3 flex flex-col gap-1">
            <div className="h-1.5 w-full bg-gray-800 rounded-full relative overflow-visible">
                {/* Gradient Background */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-500 via-yellow-500 to-red-500" />
                
                {/* Marker */}
                <motion.div 
                    initial={{ left: 0 }}
                    animate={{ left: `${percent}%` }}
                    transition={{ delay: 0.5, duration: 1, type: "spring" }}
                    className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white border-2 border-black rounded-full shadow-[0_0_5px_white] z-10"
                    style={{ marginLeft: '-5px' }} 
                />
            </div>
            <div className="flex justify-between text-[8px] text-gray-600 font-mono">
                <span>15</span>
                <span>40</span>
            </div>
        </div>
    );
};

const TrendGraph = () => (
    <div className="flex items-end gap-1 h-12 w-full mt-2 justify-center opacity-80">
        {[0.3, 0.5, 0.4, 0.7, 0.5, 0.8, 0.6, 0.9].map((h, i) => (
            <motion.div 
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${h * 100}%` }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className={`w-2 rounded-t-sm ${i > 5 ? 'bg-system-neon shadow-[0_0_8px_#00d2ff]' : 'bg-gray-800'}`}
            />
        ))}
    </div>
);

const AnimatedClock = () => (
    <div className="relative w-14 h-14 border-2 border-gray-700 rounded-full flex items-center justify-center bg-gray-900/50 mx-auto mt-2 shadow-[0_0_15px_rgba(234,179,8,0.2)]">
        <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className="absolute w-0.5 h-5 bg-yellow-500 origin-bottom bottom-1/2 left-[calc(50%-1px)] rounded-full"
        />
        <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            className="absolute w-1 h-3 bg-white origin-bottom bottom-1/2 left-[calc(50%-2px)] rounded-full"
        />
        <div className="absolute w-1.5 h-1.5 bg-yellow-500 rounded-full z-10" />
    </div>
);

const GrowthSpinner = () => (
    <div className="relative w-16 h-16 flex items-center justify-center mt-2">
        <motion.div
            animate={{ rotate: 180 }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", repeatDelay: 1 }}
            className="z-10"
        >
            <Hourglass className="text-purple-500" size={32} />
        </motion.div>
        <motion.div 
            className="absolute inset-0 border-2 border-purple-500/30 rounded-full"
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
        />
    </div>
);


// --- SYSTEM REPORT COMPONENT ---
const CalibrationReport: React.FC<{ profile: HealthProfile, onContinue: () => void }> = ({ profile, onContinue }) => {
    // 1. Calculate BMI
    const bmi = profile.weight / ((profile.height / 100) ** 2);
    
    // 2. Estimate Body Fat (Navy Method approx using BMI/Age/Gender as fallback)
    const bodyFat = (1.20 * bmi) + (0.23 * profile.age) - (profile.gender === 'MALE' ? 16.2 : 5.4);

    // 3. Calculate Timeline
    let weeks = 0;
    let message = "";
    const diff = Math.abs((profile.targetWeight || profile.weight) - profile.weight);
    
    if (profile.goal === 'LOSE_WEIGHT' || (profile.targetWeight || 0) < profile.weight) {
        weeks = Math.ceil(diff / 0.75);
        message = `To reach ${profile.targetWeight}kg`;
    } else if (profile.goal === 'BUILD_MUSCLE' || (profile.targetWeight || 0) > profile.weight) {
        weeks = Math.ceil(diff / 0.3);
        message = `To reach ${profile.targetWeight}kg`;
    } else {
        weeks = 8; // Standard Recomp Cycle
        message = "Body Recomposition Cycle";
    }

    // 4. Growth Potential (Gamified Sync Rate)
    const activityBonus = { 'SEDENTARY': 0, 'LIGHT': 10, 'MODERATE': 20, 'VERY_ACTIVE': 25 };
    const potential = 70 + (activityBonus[profile.activityLevel] || 10) + (profile.age < 30 ? 5 : 0);

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[150] bg-black flex flex-col items-center justify-center p-6 font-mono overflow-y-auto"
        >
            <div className="w-full max-w-2xl space-y-8">
                <div className="text-center space-y-2">
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }} 
                        animate={{ scale: 1, opacity: 1 }}
                        className="inline-block px-3 py-1 border border-system-neon/30 rounded-full bg-system-neon/5 text-system-neon text-[10px] tracking-widest uppercase font-bold mb-2"
                    >
                        Analysis Complete
                    </motion.div>
                    <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter uppercase">System Report</h2>
                    <p className="text-gray-500 text-xs">Based on your provided biometrics</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* BMI Card */}
                    <motion.div 
                        whileHover={{ scale: 1.02, borderColor: '#10b981' }}
                        className="bg-[#0f0f0f] border border-gray-800 p-5 rounded-xl relative overflow-hidden group transition-colors flex flex-col justify-between"
                    >
                        <div className="flex justify-between items-center">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="p-1.5 rounded-md bg-black border border-gray-700 group-hover:border-green-500/50 transition-colors">
                                        <Activity size={16} className="text-green-500" />
                                    </div>
                                    <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">BMI Ratio</span>
                                </div>
                                <div className="text-2xl font-black text-white font-mono">{bmi.toFixed(1)}</div>
                                <div className="text-[10px] text-gray-400 mt-1 font-mono">
                                    {bmi < 18.5 ? "Underweight" : bmi < 25 ? "Normal Range" : "Overweight"}
                                </div>
                            </div>
                            <div className="flex items-center justify-center">
                                <BMIGauge value={bmi} />
                            </div>
                        </div>
                    </motion.div>

                    {/* Body Fat Card */}
                    <motion.div 
                        whileHover={{ scale: 1.02, borderColor: '#3b82f6' }}
                        className="bg-[#0f0f0f] border border-gray-800 p-5 rounded-xl relative overflow-hidden group transition-colors flex flex-col justify-between"
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="p-1.5 rounded-md bg-black border border-gray-700 group-hover:border-blue-500/50 transition-colors">
                                        <TrendingUp size={16} className="text-blue-500" />
                                    </div>
                                    <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Est. Body Fat</span>
                                </div>
                                <div className="text-2xl font-black text-white font-mono">{bodyFat.toFixed(1)}%</div>
                                <div className="text-[10px] text-gray-400 mt-1 font-mono">Approximate Calculation</div>
                            </div>
                            <div className="w-24">
                                <TrendGraph />
                            </div>
                        </div>
                    </motion.div>

                    {/* Timeline Card */}
                    <motion.div 
                        whileHover={{ scale: 1.02, borderColor: '#eab308' }}
                        className="bg-[#0f0f0f] border border-gray-800 p-5 rounded-xl relative overflow-hidden group transition-colors flex flex-col justify-between"
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="p-1.5 rounded-md bg-black border border-gray-700 group-hover:border-yellow-500/50 transition-colors">
                                        <Clock size={16} className="text-yellow-500" />
                                    </div>
                                    <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Projected Timeline</span>
                                </div>
                                <div className="text-2xl font-black text-white font-mono">{weeks} WEEKS</div>
                                <div className="text-[10px] text-gray-400 mt-1 font-mono">{message}</div>
                            </div>
                            <div className="w-20 flex justify-center">
                                <AnimatedClock />
                            </div>
                        </div>
                    </motion.div>

                    {/* Growth Potential Card */}
                    <motion.div 
                        whileHover={{ scale: 1.02, borderColor: '#8b5cf6' }}
                        className="bg-[#0f0f0f] border border-gray-800 p-5 rounded-xl relative overflow-hidden group transition-colors flex flex-col justify-between"
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="p-1.5 rounded-md bg-black border border-gray-700 group-hover:border-purple-500/50 transition-colors">
                                        <Zap size={16} className="text-purple-500" />
                                    </div>
                                    <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Growth Potential</span>
                                </div>
                                <div className="text-2xl font-black text-white font-mono">{potential}%</div>
                                <div className="text-[10px] text-gray-400 mt-1 font-mono">Based on System Adherence</div>
                            </div>
                            <div className="w-20">
                                <GrowthSpinner />
                            </div>
                        </div>
                    </motion.div>
                </div>

                <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-6 text-center space-y-4">
                    <p className="text-xs text-gray-400 leading-relaxed max-w-md mx-auto">
                        The System has generated a personalized protocol based on this analysis. 
                        Compliance is mandatory for optimal results.
                    </p>
                    <button 
                        onClick={onContinue}
                        className="group relative inline-flex items-center gap-3 px-8 py-4 bg-white text-black font-black uppercase tracking-widest text-xs rounded-lg hover:bg-system-neon hover:scale-105 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                    >
                        <ShieldCheck size={16} /> Accept Protocols
                        <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>
        </motion.div>
    );
};


const AwakeningOverlay: React.FC<{ profile: Partial<HealthProfile>; onComplete: (stats: CoreStats) => void }> = ({ profile, onComplete }) => {
    const [stage, setStage] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [isPersonalizing, setIsPersonalizing] = useState(false);
    const [showScanLine, setShowScanLine] = useState(false);
    const [showGlowBurst, setShowGlowBurst] = useState(false);
    const [visibleCount, setVisibleCount] = useState(3);
    const revealIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const REVEAL_COUNTS = [3, 8, 13, 16];

    const totalWeeks = useMemo(() => {
        let weeks = 12;
        const diff = Math.abs((profile.targetWeight || profile.weight || 0) - (profile.weight || 0));
        if (diff > 0) {
            if (profile.goal === 'LOSE_WEIGHT' || (profile.targetWeight || 0) < (profile.weight || 0)) {
                weeks = Math.ceil(diff / 0.75);
            } else if (profile.goal === 'BUILD_MUSCLE' || (profile.targetWeight || 0) > (profile.weight || 0)) {
                weeks = Math.ceil(diff / 0.3);
            } else {
                weeks = 8;
            }
        }
        return Math.max(weeks, 4);
    }, [profile]);

    const baseStats = useMemo(() => {
        let str = 25, int = 40, dis = 20, soc = 30, foc = 25, wil = 20;
        if (profile.activityLevel === 'SEDENTARY') { str = 15; dis = 15; foc = 20; wil = 15; }
        if (profile.activityLevel === 'LIGHT') { str = 30; dis = 25; foc = 28; wil = 22; }
        if (profile.activityLevel === 'MODERATE') { str = 45; dis = 40; foc = 35; wil = 35; }
        if (profile.activityLevel === 'VERY_ACTIVE') { str = 60; dis = 55; foc = 42; wil = 45; }
        return [str, int, dis, soc, foc, wil];
    }, [profile]);

    const targetStats = useMemo(() => {
        const gap = (v: number, max: number) => Math.round(v + (max - v) * 0.88);
        if (profile.goal === 'LOSE_WEIGHT') return [gap(baseStats[0], 78), gap(baseStats[1], 75), gap(baseStats[2], 82), gap(baseStats[3], 72), gap(baseStats[4], 74), gap(baseStats[5], 80)];
        if (profile.goal === 'BUILD_MUSCLE') return [gap(baseStats[0], 85), gap(baseStats[1], 70), gap(baseStats[2], 80), gap(baseStats[3], 68), gap(baseStats[4], 72), gap(baseStats[5], 85)];
        return [gap(baseStats[0], 75), gap(baseStats[1], 80), gap(baseStats[2], 78), gap(baseStats[3], 76), gap(baseStats[4], 78), gap(baseStats[5], 76)];
    }, [baseStats, profile]);

    // 16-point time-series — dramatic per-stat curves that tell a story
    const timelineData = useMemo(() => {
        const clamp = (v: number) => Math.min(100, Math.max(5, Math.round(v)));
        // Multipliers: fraction of (target - base) to add; negative = dips below base
        // [strMult, intMult, disMult, socMult, focMult, wilMult]
        const curves: number[][] = [
            // Stage 0 — Baseline (slow warmup noise)
            [0.00,  0.00,  0.00,  0.00,  0.00,  0.00],
            [0.05,  0.01,  0.04,  0.01,  0.02,  0.03],
            [0.09,  0.03,  0.07,  0.02,  0.05,  0.06],
            // Stage 1 — Phase I: body wakes up, social life takes the hit
            [0.47,  0.01,  0.58, -0.16,  0.20,  0.42],
            [0.65, -0.07,  0.74, -0.30,  0.15,  0.55],
            [0.53,  0.11,  0.30, -0.22,  0.28,  0.38],
            [0.57,  0.19,  0.18, -0.12,  0.32,  0.30],
            [0.61,  0.25,  0.47, -0.03,  0.40,  0.48],
            // Stage 2 — Phase II: the compound effect kicks in
            [0.63,  0.46,  0.36,  0.30,  0.52,  0.55],
            [0.65,  0.60,  0.54,  0.55,  0.62,  0.60],
            [0.59,  0.70,  0.39,  0.70,  0.68,  0.58],
            [0.69,  0.74,  0.67,  0.77,  0.74,  0.70],
            [0.75,  0.78,  0.74,  0.81,  0.78,  0.76],
            // Stage 3 — Final form
            [0.81,  0.83,  0.81,  0.84,  0.82,  0.82],
            [0.85,  0.86,  0.85,  0.87,  0.86,  0.86],
            [0.88,  0.88,  0.88,  0.88,  0.88,  0.88],
        ];
        const weekStep = totalWeeks / 15;
        return curves.map((mults, i) => ({
            i,
            label: `W${Math.round(i * weekStep)}`,
            week: Math.round(i * weekStep),
            str:  clamp(baseStats[0] + (targetStats[0] - baseStats[0]) * mults[0]),
            int:  clamp(baseStats[1] + (targetStats[1] - baseStats[1]) * mults[1]),
            dis:  clamp(baseStats[2] + (targetStats[2] - baseStats[2]) * mults[2]),
            soc:  clamp(baseStats[3] + (targetStats[3] - baseStats[3]) * mults[3]),
            foc:  clamp(baseStats[4] + (targetStats[4] - baseStats[4]) * mults[4]),
            wil:  clamp(baseStats[5] + (targetStats[5] - baseStats[5]) * mults[5]),
            phase: i < 3 ? 0 : i < 8 ? 1 : i < 13 ? 2 : 3,
        }));
    }, [baseStats, targetStats, totalWeeks]);

    const stageStats = useMemo(() => {
        const phase1 = [0.50, 0.22, 0.58, 0.18, 0.30, 0.45];
        const phase2 = [0.62, 0.75, 0.60, 0.80, 0.70, 0.65];
        return [
            baseStats,
            baseStats.map((b, i) => Math.round(b + (targetStats[i] - b) * phase1[i])),
            baseStats.map((b, i) => Math.round(b + (targetStats[i] - b) * phase2[i])),
            targetStats,
        ];
    }, [baseStats, targetStats]);

    const stageColors = ['#ef4444', '#f97316', '#eab308', '#00d2ff'];
    const stageColor = stageColors[stage];

    const [animatedStats, setAnimatedStats] = useState<number[]>(() => [...baseStats]);
    const [displayedWeeks, setDisplayedWeeks] = useState(0);
    const startStatsRef = useRef<number[]>([...baseStats]);

    // Progressive chart reveal when stage advances
    useEffect(() => {
        const target = REVEAL_COUNTS[stage];
        if (visibleCount >= target) return;
        let current = visibleCount;
        if (revealIntervalRef.current) clearInterval(revealIntervalRef.current);
        revealIntervalRef.current = setInterval(() => {
            current++;
            setVisibleCount(current);
            if (current >= target && revealIntervalRef.current) {
                clearInterval(revealIntervalRef.current);
            }
        }, 115);
        return () => { if (revealIntervalRef.current) clearInterval(revealIntervalRef.current); };
    }, [stage]);

    const visibleData = timelineData.slice(0, visibleCount);
    const lastVisible = visibleData[visibleData.length - 1];

    const handleNextStage = () => {
        if (isTransitioning) return;
        if (stage >= 3) {
            setIsPersonalizing(true);
            return;
        }
        const next = stage + 1;
        const from = [...startStatsRef.current];
        const to = stageStats[next];
        const fromWeeks = displayedWeeks;
        const toWeeks = Math.floor(totalWeeks * (next / 3));

        setStage(next);
        setIsTransitioning(true);
        setShowScanLine(true);
        setShowGlowBurst(true);

        setTimeout(() => setShowScanLine(false), 700);
        setTimeout(() => setShowGlowBurst(false), 600);

        const ctrl = animate(0, 1, {
            duration: 2.0,
            ease: [0.33, 1, 0.68, 1],
            onUpdate: (t) => {
                setAnimatedStats(from.map((f, i) => Math.round(f + (to[i] - f) * t)));
                setDisplayedWeeks(Math.round(fromWeeks + (toWeeks - fromWeeks) * t));
            },
            onComplete: () => {
                startStatsRef.current = [...to];
                setIsTransitioning(false);
            },
        });
        return () => ctrl.stop();
    };

    const handlePersonalizationComplete = () => {
        const statsObj: CoreStats = {
            strength: baseStats[0],
            intelligence: baseStats[1],
            discipline: baseStats[2],
            social: baseStats[3],
            focus: baseStats[4],
            willpower: baseStats[5],
        };
        onComplete(statsObj);
    };

    const statConfig = [
        { key: 0, label: 'STR', Icon: Dumbbell, color: '#f87171', dataKey: 'str' },
        { key: 1, label: 'INT', Icon: Brain,    color: '#60a5fa', dataKey: 'int' },
        { key: 2, label: 'DIS', Icon: Shield,   color: '#c084fc', dataKey: 'dis' },
        { key: 3, label: 'SOC', Icon: Users,    color: '#facc15', dataKey: 'soc' },
    ];

    const stageLabels = ['CURRENT', 'PHASE I', 'PHASE II', 'POTENTIAL'];
    const stageWeekLabels = [
        'W0',
        `W${Math.floor(totalWeeks / 3)}`,
        `W${Math.floor(totalWeeks * 2 / 3)}`,
        `W${totalWeeks}`,
    ];
    const stageTitles = ['CURRENT REALITY', 'OPTIMIZATION PHASE I', 'OPTIMIZATION PHASE II', 'FULL POTENTIAL'];
    const stageSubtexts = [
        'BASELINE ASSESSMENT',
        `YOU AFTER ${Math.floor(totalWeeks / 3)} WEEKS`,
        `YOU AFTER ${Math.floor(totalWeeks * 2 / 3)} WEEKS`,
        'YOUR FINAL FORM',
    ];

    const getButtonText = () => {
        switch (stage) {
            case 0: return 'INITIATE AWAKENING';
            case 1: return `PHASE II — WEEK ${Math.floor(totalWeeks * 2 / 3)}`;
            case 2: return `FINAL PHASE — WEEK ${totalWeeks}`;
            case 3: return 'ENTER THE SYSTEM';
            default: return 'CONTINUE';
        }
    };

    // Floating particles (memoised so they don't re-randomise on re-render)
    const particles = useMemo(() => Array.from({ length: 6 }, (_, i) => ({
        id: i,
        left: `${8 + i * 15}%`,
        delay: i * 0.65,
        duration: 4.2 + i * 0.7,
        size: i % 2 === 0 ? 3 : 2,
        drift: (i % 2 === 0 ? 1 : -1) * (14 + i * 7),
    })), []);

    if (isPersonalizing) {
        return <SystemPersonalizationScreen onComplete={handlePersonalizationComplete} />;
    }

    return (
        <motion.div
            className="fixed inset-0 z-[200] bg-black font-mono overflow-hidden flex flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            {/* Ambient radial bg — transitions with stage colour */}
            <div
                className="absolute inset-0 pointer-events-none transition-all duration-1000"
                style={{ background: `radial-gradient(ellipse at 50% 35%, ${stageColor}16 0%, transparent 62%)` }}
            />
            {/* Bottom vignette */}
            <div className="absolute inset-x-0 bottom-0 h-48 pointer-events-none"
                style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }} />

            {/* Floating particles */}
            {particles.map((p) => (
                <motion.div
                    key={p.id}
                    className="absolute rounded-full pointer-events-none"
                    style={{ left: p.left, bottom: '4%', width: p.size, height: p.size,
                        background: stageColor, boxShadow: `0 0 6px ${stageColor}`, opacity: 0.7 }}
                    animate={{ y: [0, -(280 + p.id * 35)], x: [0, p.drift], opacity: [0.7, 0] }}
                    transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'easeOut' }}
                />
            ))}

            {/* Scan line sweep */}
            <AnimatePresence>
                {showScanLine && (
                    <motion.div
                        key={`scan-${stage}`}
                        className="absolute left-0 right-0 h-0.5 z-50 pointer-events-none"
                        style={{ backgroundColor: stageColor, boxShadow: `0 0 20px ${stageColor}, 0 0 60px ${stageColor}40` }}
                        initial={{ top: '-1%', opacity: 0 }}
                        animate={{ top: '101%', opacity: [0, 1, 1, 0] }}
                        transition={{ duration: 0.65, ease: 'easeIn' }}
                    />
                )}
            </AnimatePresence>

            {/* Radial glow burst on stage change */}
            <AnimatePresence>
                {showGlowBurst && (
                    <motion.div
                        key={`burst-${stage}`}
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none z-40"
                        style={{ width: 320, height: 320, background: `radial-gradient(circle, ${stageColor}50 0%, transparent 70%)` }}
                        initial={{ scale: 0.3, opacity: 0.9 }}
                        animate={{ scale: 3.0, opacity: 0 }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                    />
                )}
            </AnimatePresence>

            {/* MAIN CONTENT */}
            <div className="relative z-10 flex flex-col items-center w-full h-full px-4 py-5 overflow-y-auto">
                <div className="w-full max-w-sm mx-auto flex flex-col items-center gap-3">

                    {/* Header */}
                    <div className="w-full text-center space-y-1">
                        <div className="flex items-center justify-center gap-2">
                            <span className="text-[9px] tracking-[0.3em] font-bold uppercase text-gray-600">Bio-Sync OS · Calibration Complete</span>
                            <AnimatePresence>
                                {isTransitioning && (
                                    <motion.span
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        className="px-1.5 py-0.5 rounded text-[7px] font-black tracking-widest uppercase"
                                        style={{ background: `${stageColor}22`, color: stageColor, border: `1px solid ${stageColor}50` }}
                                    >
                                        LIVE SIM
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </div>
                        <AnimatePresence mode="wait">
                            <motion.h2
                                key={stage}
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                transition={{ duration: 0.3 }}
                                className="text-xl font-black uppercase tracking-[0.12em]"
                                style={{ color: stageColor, textShadow: `0 0 28px ${stageColor}80` }}
                            >
                                {stageTitles[stage]}
                            </motion.h2>
                        </AnimatePresence>
                    </div>

                    {/* Stage timeline */}
                    <div className="w-full px-1">
                        <div className="relative flex items-start justify-between pt-2">
                            <div className="absolute left-0 right-0 top-[19px] h-px bg-gray-800" />
                            <motion.div
                                className="absolute left-0 top-[19px] h-px origin-left"
                                style={{ backgroundColor: stageColor, boxShadow: `0 0 8px ${stageColor}` }}
                                animate={{ width: `${(stage / 3) * 100}%` }}
                                transition={{ duration: 0.6, ease: 'easeOut' }}
                            />
                            {([0, 1, 2, 3] as const).map((s) => (
                                <div key={s} className="relative flex flex-col items-center gap-1.5 z-10">
                                    <motion.div
                                        className="w-5 h-5 rounded-full border-2 flex items-center justify-center relative"
                                        style={{
                                            backgroundColor: s <= stage ? stageColors[s] : 'transparent',
                                            borderColor: s <= stage ? stageColors[s] : '#374151',
                                        }}
                                        animate={s === stage ? { scale: [1, 1.18, 1] } : {}}
                                        transition={{ duration: 1.5, repeat: Infinity }}
                                    >
                                        {s <= stage && <div className="w-1.5 h-1.5 rounded-full bg-white/90" />}
                                        {s === stage && (
                                            <>
                                                <motion.div
                                                    className="absolute inset-[-5px] rounded-full"
                                                    style={{ border: `1px solid ${stageColor}` }}
                                                    animate={{ scale: [1, 1.9], opacity: [0.75, 0] }}
                                                    transition={{ duration: 1.4, repeat: Infinity }}
                                                />
                                                <motion.div
                                                    className="absolute inset-[-10px] rounded-full"
                                                    style={{ border: `1px solid ${stageColor}` }}
                                                    animate={{ scale: [1, 1.6], opacity: [0.35, 0] }}
                                                    transition={{ duration: 1.4, repeat: Infinity, delay: 0.35 }}
                                                />
                                            </>
                                        )}
                                    </motion.div>
                                    <div className="text-[8px] font-bold font-mono" style={{ color: s === stage ? stageColor : '#4b5563' }}>
                                        {stageWeekLabels[s]}
                                    </div>
                                    <div className="text-[7px] uppercase tracking-widest text-center leading-tight"
                                        style={{ color: s === stage ? stageColor : '#374151', opacity: s <= stage ? 1 : 0.5 }}>
                                        {stageLabels[s]}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Week counter */}
                    <div className="text-center">
                        <div className="flex items-end gap-2 justify-center">
                            <span className="text-5xl font-black tabular-nums text-white drop-shadow-[0_0_18px_rgba(255,255,255,0.4)]">{displayedWeeks}</span>
                            <span className="text-base font-bold text-gray-500 mb-1.5">WEEKS</span>
                        </div>
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={stage}
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -4 }}
                                transition={{ duration: 0.25 }}
                                className="text-[9px] uppercase tracking-[0.3em] font-bold mt-0.5"
                                style={{ color: stageColor }}
                            >
                                {stageSubtexts[stage]}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Multi-stat time-series area chart */}
                    <div className="w-full rounded-xl overflow-hidden relative"
                        style={{ background: 'rgba(255,255,255,0.018)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        {/* Colour legend */}
                        <div className="flex items-center gap-3 px-3 pt-2.5">
                            {statConfig.map(({ label, color }) => (
                                <div key={label} className="flex items-center gap-1">
                                    <div className="w-3 h-0.5 rounded-full" style={{ background: color, boxShadow: `0 0 4px ${color}` }} />
                                    <span className="text-[8px] font-bold tracking-widest" style={{ color }}>{label}</span>
                                </div>
                            ))}
                        </div>
                        <ResponsiveContainer width="100%" height={220}>
                            <AreaChart data={visibleData} margin={{ top: 8, right: 10, left: -26, bottom: 0 }}>
                                <defs>
                                    {statConfig.map(({ dataKey, color }) => (
                                        <React.Fragment key={dataKey}>
                                            <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%"  stopColor={color} stopOpacity={0.28} />
                                                <stop offset="95%" stopColor={color} stopOpacity={0} />
                                            </linearGradient>
                                            <filter id={`glow-${dataKey}`}>
                                                <feGaussianBlur stdDeviation="2.5" result="b" />
                                                <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                                            </filter>
                                        </React.Fragment>
                                    ))}
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                                <XAxis
                                    dataKey="label"
                                    tick={{ fill: '#4b5563', fontSize: 8, fontFamily: 'monospace', fontWeight: 700 }}
                                    tickLine={false}
                                    axisLine={false}
                                    interval={2}
                                />
                                <YAxis
                                    domain={[0, 100]}
                                    tick={{ fill: '#4b5563', fontSize: 8, fontFamily: 'monospace' }}
                                    tickLine={false}
                                    axisLine={false}
                                    tickCount={5}
                                />
                                {/* Phase boundary marker */}
                                {lastVisible && (
                                    <ReferenceLine
                                        x={lastVisible.label}
                                        stroke={stageColor}
                                        strokeWidth={1.5}
                                        strokeDasharray="4 3"
                                        style={{ filter: `drop-shadow(0 0 5px ${stageColor})` }}
                                    />
                                )}
                                {statConfig.map(({ dataKey, color }) => (
                                    <Area
                                        key={dataKey}
                                        type="monotone"
                                        dataKey={dataKey}
                                        stroke={color}
                                        strokeWidth={2}
                                        fill={`url(#grad-${dataKey})`}
                                        dot={false}
                                        isAnimationActive={false}
                                        filter={`url(#glow-${dataKey})`}
                                    />
                                ))}
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Stat cards */}
                    <div className="grid grid-cols-4 gap-2 w-full">
                        {statConfig.map(({ key, label, Icon, color, dataKey }) => {
                            const current = animatedStats[key];
                            const delta = current - baseStats[key];
                            const visibleVals = visibleData.map(d => (d as any)[dataKey]);
                            const peakVal = Math.max(...visibleVals);
                            const isAtPeak = current >= peakVal - 1;
                            const isInDip = current < baseStats[key] - 1;
                            return (
                                <motion.div
                                    key={label}
                                    className="flex flex-col items-center py-3 px-1 rounded-xl relative overflow-hidden"
                                    style={{ border: `1px solid ${color}22`, background: `${color}0b` }}
                                    animate={isTransitioning ? { scale: [1, 1.07, 1] } : {}}
                                    transition={{ duration: 0.5, delay: key * 0.08 }}
                                >
                                    <Icon size={12} style={{ color }} className="mb-1 opacity-80" />
                                    <div className="text-[8px] font-bold tracking-widest mb-0.5" style={{ color }}>{label}</div>
                                    <div className="text-base font-black font-mono text-white tabular-nums">{current}</div>
                                    <div className="mt-0.5 h-4 flex items-center justify-center">
                                        {stage > 0 && isInDip ? (
                                            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                                className="text-[9px] font-black text-amber-400">
                                                ▼{Math.abs(delta)}
                                            </motion.span>
                                        ) : stage > 0 && delta > 0 ? (
                                            <motion.span initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }}
                                                className="text-[9px] font-black"
                                                style={{ color: isAtPeak ? color : '#34d399' }}>
                                                {isAtPeak ? '▲' : '+'}{delta}
                                            </motion.span>
                                        ) : (
                                            <span className="text-[8px] text-gray-700">—</span>
                                        )}
                                    </div>
                                    {isTransitioning && (
                                        <motion.div
                                            className="absolute inset-0 rounded-xl pointer-events-none"
                                            style={{ border: `1px solid ${color}` }}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: [0, 0.8, 0] }}
                                            transition={{ duration: 0.9, delay: key * 0.08 }}
                                        />
                                    )}
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* CTA Button */}
                    <div className="w-full pt-1 pb-4">
                        <button
                            onClick={handleNextStage}
                            disabled={isTransitioning}
                            className="w-full py-4 font-black rounded-2xl uppercase tracking-widest text-sm relative overflow-hidden transition-all duration-500"
                            style={{
                                background: isTransitioning
                                    ? '#0d0d0d'
                                    : stage === 3
                                    ? '#00d2ff'
                                    : stage === 0
                                    ? '#ffffff'
                                    : 'transparent',
                                color: isTransitioning
                                    ? stageColor
                                    : stage === 3 || stage === 0
                                    ? '#000'
                                    : stageColor,
                                border: isTransitioning
                                    ? `1.5px solid ${stageColor}40`
                                    : stage > 0 && stage < 3
                                    ? `1.5px solid ${stageColor}`
                                    : '1.5px solid transparent',
                                boxShadow: !isTransitioning && stage === 3
                                    ? '0 0 40px #00d2ff55'
                                    : !isTransitioning && stage === 0
                                    ? '0 0 30px rgba(255,255,255,0.18)'
                                    : 'none',
                                cursor: isTransitioning ? 'not-allowed' : 'pointer',
                            }}
                        >
                            {isTransitioning ? (
                                <span className="relative z-10 flex items-center justify-center gap-2.5">
                                    {[0, 1, 2, 3].map((i) => (
                                        <motion.span
                                            key={i}
                                            className="inline-block w-1.5 h-1.5 rounded-full"
                                            style={{ background: stageColor }}
                                            animate={{ opacity: [0.2, 1, 0.2], scale: [0.7, 1.3, 0.7] }}
                                            transition={{ duration: 0.85, repeat: Infinity, delay: i * 0.18 }}
                                        />
                                    ))}
                                </span>
                            ) : (
                                <span className="relative z-10 flex items-center justify-center gap-2">
                                    {stage === 0 && <Sparkles size={14} />}
                                    {stage === 3 && <ShieldCheck size={14} />}
                                    {getButtonText()}
                                </span>
                            )}
                        </button>
                    </div>

                </div>
            </div>
        </motion.div>
    );
};

const AssessmentOverlay: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
    const [progress, setProgress] = useState(0);
    const [logs, setLogs] = useState<string[]>([]);
    const [status, setStatus] = useState("INITIALIZING UPLINK");

    const SYSTEM_MESSAGES = [
        "Establishing secure connection...",
        "Encrypting biometric data...",
        "Handshaking with Neural Interface...",
        "Allocating server resources...",
        "Parsing muscle fiber density...",
        "Calculating metabolic baseline...",
        "Syncing with Shadow Database...",
        "Optimizing workout algorithms...",
        "Generating growth projection...",
        "Finalizing user profile..."
    ];

    useEffect(() => {
        let currentProgress = 0;
        let messageIndex = 0;

        const interval = setInterval(() => {
            const increment = Math.random() * 3.5;
            currentProgress += increment;

            if (currentProgress >= 100) {
                currentProgress = 100;
                clearInterval(interval);
                setStatus("COMPLETE");
                setTimeout(onComplete, 800);
            }

            setProgress(currentProgress);

            const targetLogIndex = Math.floor((currentProgress / 100) * SYSTEM_MESSAGES.length);
            if (targetLogIndex > messageIndex && messageIndex < SYSTEM_MESSAGES.length) {
                setLogs(prev => [...prev, SYSTEM_MESSAGES[messageIndex]]);
                messageIndex++;
            }

        }, 100); 

        return () => clearInterval(interval);
    }, [onComplete]);

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center font-mono overflow-hidden"
        >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,210,255,0.05)_0%,transparent_50%)]" />
            <div className="relative z-10 flex flex-col items-center gap-12">
                <div className="relative w-64 h-64 flex items-center justify-center">
                    <motion.div className="absolute inset-0 rounded-full border border-gray-800 border-t-system-neon/30 border-r-system-neon/30" animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} />
                    <motion.div className="absolute inset-4 rounded-full border border-gray-800 border-b-system-neon/20 border-l-system-neon/20" animate={{ rotate: -360 }} transition={{ duration: 5, repeat: Infinity, ease: "linear" }} />
                    <svg className="absolute inset-0 w-full h-full -rotate-90 transform p-4">
                        <circle cx="50%" cy="50%" r="48%" className="stroke-gray-900/50" strokeWidth="2" fill="transparent" />
                        <motion.circle cx="50%" cy="50%" r="48%" className="stroke-system-neon drop-shadow-[0_0_15px_rgba(0,210,255,0.5)]" strokeWidth="4" fill="transparent" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: progress / 100 }} transition={{ duration: 0.1, ease: "linear" }} />
                    </svg>
                    <div className="flex flex-col items-center justify-center bg-black/80 backdrop-blur-md rounded-full w-32 h-32 border border-gray-800 shadow-[0_0_30px_rgba(0,0,0,0.5)] z-10">
                        <span className="text-3xl font-black text-white tracking-tighter">
                            {Math.round(progress)}<span className="text-sm text-system-neon">%</span>
                        </span>
                    </div>
                </div>
                <div className="text-center space-y-4">
                    <h2 className="text-lg font-bold text-white tracking-[0.3em] uppercase animate-pulse">{status}</h2>
                    <div className="h-6 overflow-hidden relative flex justify-center w-full max-w-md">
                        <AnimatePresence mode="wait">
                            <motion.div key={logs[logs.length - 1]} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="text-xs text-gray-500 font-mono tracking-wider absolute w-full text-center">
                                {logs[logs.length - 1] ? `> ${logs[logs.length - 1]}` : "> Initializing System..."}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-system-neon/20 to-transparent" />
        </motion.div>
    );
};

const CalibrationFlow: React.FC<CalibrationFlowProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [viewState, setViewState] = useState<'FORM' | 'ASSESSMENT' | 'REPORT' | 'AWAKENING'>('FORM');
  const TOTAL_STEPS = 8;
  
  const [formData, setFormData] = useState<Partial<HealthProfile>>({
      gender: 'MALE', activityLevel: 'MODERATE', goal: 'RECOMP', equipment: 'GYM', workoutSplit: 'CLASSIC', age: 25, height: 175, weight: 70, targetWeight: 70,
      energyLevel: 'MODERATE', stressLevel: 'MODERATE',
  });
  
  const [baselines, setBaselines] = useState<BaselineStats>({
      pushups: 0,
      focusDuration: 0,
      readingTime: 0,
      sleepAvg: 0
  });

  const [heightUnit, setHeightUnit] = useState<'CM' | 'FT'>('CM');
  const [weightUnit, setWeightUnit] = useState<'KG' | 'LBS'>('KG');

  const toFtIn = (cm: number) => {
      const totalInches = Math.round(cm / 2.54);
      const ft = Math.floor(totalInches / 12);
      const inches = totalInches % 12;
      return { ft, inches };
  };

  const toCm = (ft: number, inches: number) => Math.round((ft * 30.48) + (inches * 2.54));
  
  const toLbs = (kg: number) => Math.round(kg * 2.20462);
  const toKg = (lbs: number) => Math.round(lbs / 2.20462);

  const handleFinish = () => {
      setViewState('ASSESSMENT');
  };

  const handleAssessmentComplete = () => {
      setViewState('REPORT');
  };

  const handleReportAccept = () => {
      setViewState('AWAKENING');
  };

  const finalizeCalibration = (stats: CoreStats) => {
      const calculatedProfile = {
          ...formData,
          bmi: (formData.weight! / ((formData.height! / 100) ** 2)),
          bmr: 1600,
          macros: { protein: 150, carbs: 200, fats: 60, calories: 2000 },
          workoutPlan: [],
          injuries: [],
          category: 'Hunter',
          startingWeight: formData.weight,
          baselines: baselines // SAVE BASELINES
      } as HealthProfile;
      
      onComplete(calculatedProfile, stats);
  };

  const updateHeightFromFtIn = (ft: number | string, inch: number | string) => {
      const f = Number(ft) || 0;
      const i = Number(inch) || 0;
      const cm = toCm(f, i);
      setFormData({ ...formData, height: cm });
  };

  if (viewState === 'ASSESSMENT') return <AssessmentOverlay onComplete={handleAssessmentComplete} />;
  if (viewState === 'REPORT') return <CalibrationReport profile={formData as HealthProfile} onContinue={handleReportAccept} />;
  if (viewState === 'AWAKENING') return <AwakeningOverlay profile={formData} onComplete={finalizeCalibration} />;

  return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-4 font-mono">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full bg-[#0a0a0a] border border-system-border rounded-3xl shadow-2xl relative flex flex-col overflow-hidden"
            style={{ maxHeight: 'calc(100dvh - 2rem)' }}
          >
              {/* Progress bar */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gray-800 z-10">
                  <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
                      className="h-full bg-system-neon shadow-[0_0_15px_#00d2ff]"
                  />
              </div>

              {/* Fixed header */}
              <div className="shrink-0 flex justify-between items-center px-8 pt-9 pb-4">
                  <h2 className="text-base font-bold text-white tracking-widest uppercase">
                      Step {step} of {TOTAL_STEPS}
                  </h2>
                  <motion.span
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="text-[10px] text-system-neon font-black bg-system-neon/10 px-2 py-0.5 rounded border border-system-neon/30"
                  >
                      SYNCING...
                  </motion.span>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto px-8 pb-6">
              <AnimatePresence mode="wait">

                  {/* ── STEP 1: Warning ─────────────────────────────────── */}
                  {step === 1 && (
                      <motion.div key="s1" variants={setupContainerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6">
                          <motion.div variants={setupItemVariants} className="bg-red-900/10 border border-red-500/30 p-6 rounded-xl text-center">
                              <AlertTriangle className="text-red-500 mx-auto mb-4" size={40} />
                              <h3 className="text-white font-black uppercase text-lg mb-2">⚠️ System Warning</h3>
                              <p className="text-gray-400 text-xs leading-relaxed">
                                  ForgeGuard is active. Falsifying biometric data or capability baselines will result in inaccurate difficulty scaling and potential System Lockout.
                              </p>
                              <p className="text-red-400 font-bold text-xs mt-4 uppercase tracking-widest">
                                  Honesty is mandatory.
                              </p>
                          </motion.div>
                          <motion.button
                              variants={setupItemVariants}
                              onClick={() => setStep(2)}
                              className="w-full bg-white text-black font-black py-4 rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:scale-105 transition-transform uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                          >
                              I Understand <ShieldCheck size={14} />
                          </motion.button>
                      </motion.div>
                  )}

                  {/* ── STEP 2: Hunter Identity (Gender + Age) ──────────── */}
                  {step === 2 && (
                      <motion.div key="s2" variants={setupContainerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6">
                          <motion.div variants={setupItemVariants}>
                              <div className="flex items-center gap-2 mb-1">
                                  <User className="text-system-neon" size={18} />
                                  <span className="text-xs text-gray-500 uppercase tracking-widest font-bold">Hunter Identity</span>
                              </div>
                              <p className="text-gray-600 text-[11px]">Tell us about yourself so we can calibrate your stats. 🧬</p>
                          </motion.div>

                          {/* Gender */}
                          <motion.div variants={setupItemVariants}>
                              <p className="text-[10px] text-gray-500 uppercase font-bold mb-2 tracking-widest">Gender</p>
                              <div className="grid grid-cols-2 gap-3">
                                  {(['MALE', 'FEMALE'] as const).map(g => (
                                      <button
                                          key={g}
                                          onClick={() => setFormData({ ...formData, gender: g })}
                                          className={`py-4 rounded-xl font-black text-sm tracking-widest transition-all border ${formData.gender === g ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.3)]' : 'border-gray-800 text-gray-400 hover:border-gray-600'}`}
                                      >
                                          {g === 'MALE' ? '♂ Male' : '♀ Female'}
                                      </button>
                                  ))}
                              </div>
                          </motion.div>

                          {/* Age */}
                          <motion.div variants={setupItemVariants}>
                              <p className="text-[10px] text-gray-500 uppercase font-bold mb-2 tracking-widest">Age</p>
                              <div className="relative">
                                  <input
                                      type="number"
                                      value={formData.age || ''}
                                      onChange={e => setFormData({ ...formData, age: Number(e.target.value) })}
                                      className="w-full bg-black border-b-2 border-gray-800 text-center text-5xl text-white outline-none focus:border-system-neon py-4 transition-colors"
                                      placeholder="25"
                                      min={10} max={99}
                                  />
                                  <span className="absolute right-4 bottom-5 text-gray-600 font-bold text-sm">yrs</span>
                              </div>
                          </motion.div>

                          <motion.div variants={setupItemVariants} className="sticky bottom-0 bg-[#0a0a0a] pt-3 pb-1 flex justify-between mt-4">
                              <button onClick={() => setStep(1)} className="text-gray-600 hover:text-white flex items-center gap-1 font-bold text-xs uppercase"><ChevronLeft size={14} /> BACK</button>
                              <button
                                  onClick={() => setStep(3)}
                                  disabled={!formData.age || formData.age < 10}
                                  className="bg-system-neon text-black px-10 py-3 rounded-full font-black text-xs shadow-[0_0_15px_#00d2ff] hover:bg-white transition-all uppercase flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                  NEXT <ChevronRight size={14} />
                              </button>
                          </motion.div>
                      </motion.div>
                  )}

                  {/* ── STEP 3: Body Metrics (Height + Weight + Target) ─── */}
                  {step === 3 && (
                      <motion.div key="s3" variants={setupContainerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-5">
                          <motion.div variants={setupItemVariants}>
                              <div className="flex items-center gap-2 mb-1">
                                  <Ruler className="text-system-neon" size={18} />
                                  <span className="text-xs text-gray-500 uppercase tracking-widest font-bold">Body Metrics</span>
                              </div>
                              <p className="text-gray-600 text-[11px]">Used to calculate your body composition and calibration graph. 📊</p>
                          </motion.div>

                          {/* Unit toggles */}
                          <motion.div variants={setupItemVariants} className="flex gap-3">
                              <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-800">
                                  <button onClick={() => setHeightUnit('CM')} className={`px-3 py-1 text-[10px] font-bold rounded transition-colors ${heightUnit === 'CM' ? 'bg-system-neon text-black' : 'text-gray-500'}`}>CM</button>
                                  <button onClick={() => setHeightUnit('FT')} className={`px-3 py-1 text-[10px] font-bold rounded transition-colors ${heightUnit === 'FT' ? 'bg-system-neon text-black' : 'text-gray-500'}`}>FT</button>
                              </div>
                              <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-800">
                                  <button onClick={() => setWeightUnit('KG')} className={`px-3 py-1 text-[10px] font-bold rounded transition-colors ${weightUnit === 'KG' ? 'bg-system-neon text-black' : 'text-gray-500'}`}>KG</button>
                                  <button onClick={() => setWeightUnit('LBS')} className={`px-3 py-1 text-[10px] font-bold rounded transition-colors ${weightUnit === 'LBS' ? 'bg-system-neon text-black' : 'text-gray-500'}`}>LBS</button>
                              </div>
                          </motion.div>

                          {/* Height */}
                          <motion.div variants={setupItemVariants}>
                              <p className="text-[10px] text-gray-500 uppercase font-bold mb-2 tracking-widest">📏 Height</p>
                              {heightUnit === 'CM' ? (
                                  <input
                                      type="number"
                                      value={formData.height || ''}
                                      onChange={e => setFormData({ ...formData, height: Number(e.target.value) })}
                                      className="w-full bg-black border-b-2 border-gray-800 text-center text-3xl text-white outline-none focus:border-system-neon py-3 transition-colors"
                                      placeholder="175 cm"
                                  />
                              ) : (
                                  <div className="flex gap-3">
                                      <div className="relative flex-1">
                                          <input type="number" value={toFtIn(formData.height || 0).ft || ''} onChange={e => updateHeightFromFtIn(e.target.value, toFtIn(formData.height || 0).inches)} className="w-full bg-black border-b-2 border-gray-800 text-center text-3xl text-white outline-none focus:border-system-neon py-3 transition-colors" placeholder="5" />
                                          <span className="absolute right-2 bottom-4 text-gray-600 font-bold text-xs">FT</span>
                                      </div>
                                      <div className="relative flex-1">
                                          <input type="number" value={toFtIn(formData.height || 0).inches || ''} onChange={e => updateHeightFromFtIn(toFtIn(formData.height || 0).ft, e.target.value)} className="w-full bg-black border-b-2 border-gray-800 text-center text-3xl text-white outline-none focus:border-system-neon py-3 transition-colors" placeholder="10" />
                                          <span className="absolute right-2 bottom-4 text-gray-600 font-bold text-xs">IN</span>
                                      </div>
                                  </div>
                              )}
                          </motion.div>

                          {/* Current Weight */}
                          <motion.div variants={setupItemVariants}>
                              <p className="text-[10px] text-gray-500 uppercase font-bold mb-2 tracking-widest">⚖️ Current Weight</p>
                              <div className="relative">
                                  <input
                                      type="number"
                                      value={weightUnit === 'KG' ? formData.weight || '' : (formData.weight ? toLbs(formData.weight) : '')}
                                      onChange={e => { const v = Number(e.target.value); setFormData({ ...formData, weight: weightUnit === 'KG' ? v : toKg(v) }); }}
                                      className="w-full bg-black border-b-2 border-gray-800 text-center text-3xl text-white outline-none focus:border-system-neon py-3 transition-colors"
                                      placeholder={weightUnit === 'KG' ? '70 kg' : '154 lbs'}
                                  />
                                  <span className="absolute right-4 bottom-4 text-gray-600 font-bold text-xs">{weightUnit}</span>
                              </div>
                          </motion.div>

                          {/* Target Weight */}
                          <motion.div variants={setupItemVariants}>
                              <p className="text-[10px] text-system-accent uppercase font-bold mb-2 tracking-widest">🎯 Target Weight</p>
                              <div className="relative">
                                  <input
                                      type="number"
                                      value={weightUnit === 'KG' ? formData.targetWeight || '' : (formData.targetWeight ? toLbs(formData.targetWeight) : '')}
                                      onChange={e => { const v = Number(e.target.value); setFormData({ ...formData, targetWeight: weightUnit === 'KG' ? v : toKg(v) }); }}
                                      className="w-full bg-black border-b-2 border-system-accent text-center text-3xl text-white outline-none py-3 transition-colors"
                                      placeholder={weightUnit === 'KG' ? '75 kg' : '165 lbs'}
                                  />
                                  <span className="absolute right-4 bottom-4 text-gray-600 font-bold text-xs">{weightUnit}</span>
                              </div>
                          </motion.div>

                          <motion.div variants={setupItemVariants} className="sticky bottom-0 bg-[#0a0a0a] pt-3 pb-1 flex justify-between mt-4">
                              <button onClick={() => setStep(2)} className="text-gray-600 hover:text-white flex items-center gap-1 font-bold text-xs uppercase"><ChevronLeft size={14} /> BACK</button>
                              <button onClick={() => setStep(4)} className="bg-system-neon text-black px-10 py-3 rounded-full font-black text-xs shadow-[0_0_15px_#00d2ff] hover:bg-white transition-all uppercase flex items-center gap-2">NEXT <ChevronRight size={14} /></button>
                          </motion.div>
                      </motion.div>
                  )}

                  {/* ── STEP 4: Primary Directive (Goal) ────────────────── */}
                  {step === 4 && (
                      <motion.div key="s4" variants={setupContainerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-5">
                          <motion.div variants={setupItemVariants}>
                              <div className="flex items-center gap-2 mb-1">
                                  <Target className="text-system-accent" size={18} />
                                  <span className="text-xs text-gray-500 uppercase tracking-widest font-bold">Primary Directive</span>
                              </div>
                              <p className="text-gray-600 text-[11px]">What's your main mission right now? This shapes your quest difficulty. 🎯</p>
                          </motion.div>
                          <motion.div variants={setupItemVariants} className="grid gap-3">
                              {([
                                  { val: 'LOSE_WEIGHT', label: '🔥 Lose Weight', sub: 'Burn fat, lean down' },
                                  { val: 'BUILD_MUSCLE', label: '💪 Build Muscle', sub: 'Gain strength and size' },
                                  { val: 'RECOMP', label: '⚡ Recomp', sub: 'Lose fat + build muscle simultaneously' },
                              ] as const).map(opt => (
                                  <button
                                      key={opt.val}
                                      onClick={() => { setFormData({ ...formData, goal: opt.val }); setStep(5); }}
                                      className="w-full py-4 px-4 border border-gray-800 rounded-xl font-bold text-sm text-gray-300 hover:bg-white hover:text-black transition-all text-left flex justify-between items-center"
                                  >
                                      <span>{opt.label}</span>
                                      <span className="text-[10px] text-gray-600 font-normal normal-case">{opt.sub}</span>
                                  </button>
                              ))}
                          </motion.div>
                          <button onClick={() => setStep(3)} className="text-gray-600 hover:text-white flex items-center gap-1 font-bold text-xs uppercase"><ChevronLeft size={14} /> BACK</button>
                      </motion.div>
                  )}

                  {/* ── STEP 5: Equipment ────────────────────────────────── */}
                  {step === 5 && (
                      <motion.div key="s5" variants={setupContainerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-5">
                          <motion.div variants={setupItemVariants}>
                              <div className="flex items-center gap-2 mb-1">
                                  <Dumbbell className="text-system-neon" size={18} />
                                  <span className="text-xs text-gray-500 uppercase tracking-widest font-bold">Equipment Access</span>
                              </div>
                              <p className="text-gray-600 text-[11px]">What training resources do you have? Your workout plan is built around this. 🏋️</p>
                          </motion.div>
                          <motion.div variants={setupItemVariants} className="grid gap-3">
                              {([
                                  { val: 'GYM', label: '🏟️ Full Gym', sub: 'Access to machines, barbells, cables' },
                                  { val: 'HOME_DUMBBELLS', label: '🏠 Home Dumbbells', sub: 'Dumbbells and free weights at home' },
                                  { val: 'BODYWEIGHT', label: '🤸 Bodyweight Only', sub: 'No equipment — just your body' },
                              ] as const).map(opt => (
                                  <button
                                      key={opt.val}
                                      onClick={() => { setFormData({ ...formData, equipment: opt.val }); setStep(6); }}
                                      className="w-full py-4 px-4 border border-gray-800 rounded-xl font-bold text-sm text-gray-300 hover:bg-white hover:text-black transition-all text-left flex justify-between items-center"
                                  >
                                      <span>{opt.label}</span>
                                      <span className="text-[10px] text-gray-600 font-normal normal-case">{opt.sub}</span>
                                  </button>
                              ))}
                          </motion.div>
                          <button onClick={() => setStep(4)} className="text-gray-600 hover:text-white flex items-center gap-1 font-bold text-xs uppercase"><ChevronLeft size={14} /> BACK</button>
                      </motion.div>
                  )}

                  {/* ── STEP 6: Energy & Activity ────────────────────────── */}
                  {step === 6 && (
                      <motion.div key="s6" variants={setupContainerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-5">
                          <motion.div variants={setupItemVariants}>
                              <div className="flex items-center gap-2 mb-1">
                                  <Zap className="text-yellow-400" size={18} />
                                  <span className="text-xs text-gray-500 uppercase tracking-widest font-bold">Energy & Activity</span>
                              </div>
                              <p className="text-gray-600 text-[11px]">Three quick snapshots — tap one in each row and hit Next. ⚡</p>
                          </motion.div>

                          {/* Lifestyle Activity */}
                          <motion.div variants={setupItemVariants}>
                              <p className="text-[10px] text-gray-500 uppercase font-bold mb-2 tracking-widest">🏃 Lifestyle Activity</p>
                              <div className="grid grid-cols-2 gap-2">
                                  {([
                                      { val: 'SEDENTARY', label: '🪑 Sedentary', sub: 'Mostly sitting' },
                                      { val: 'LIGHT', label: '🚶 Light', sub: 'Some movement' },
                                      { val: 'MODERATE', label: '⚡ Moderate', sub: 'Regular activity' },
                                      { val: 'VERY_ACTIVE', label: '🔥 Very Active', sub: 'Always moving' },
                                  ] as const).map(opt => (
                                      <button
                                          key={opt.val}
                                          onClick={() => setFormData({ ...formData, activityLevel: opt.val })}
                                          className={`py-2.5 px-3 rounded-xl border text-left transition-all ${formData.activityLevel === opt.val ? 'bg-white text-black border-white' : 'border-gray-800 text-gray-400 hover:border-gray-600'}`}
                                      >
                                          <div className="font-bold text-[11px]">{opt.label}</div>
                                          <div className="text-[9px] opacity-60 normal-case font-normal">{opt.sub}</div>
                                      </button>
                                  ))}
                              </div>
                          </motion.div>

                          {/* Energy Right Now */}
                          <motion.div variants={setupItemVariants}>
                              <p className="text-[10px] text-gray-500 uppercase font-bold mb-2 tracking-widest">⚡ Energy Right Now</p>
                              <div className="grid grid-cols-5 gap-1.5">
                                  {([
                                      { val: 'DRAINED', label: '💀', sub: 'Drained' },
                                      { val: 'LOW', label: '🔋', sub: 'Low' },
                                      { val: 'MODERATE', label: '😐', sub: 'Okay' },
                                      { val: 'HIGH', label: '🔥', sub: 'High' },
                                      { val: 'PEAK', label: '🌟', sub: 'Peak' },
                                  ] as const).map(opt => (
                                      <button
                                          key={opt.val}
                                          onClick={() => setFormData({ ...formData, energyLevel: opt.val })}
                                          className={`py-2.5 rounded-xl border text-center transition-all ${formData.energyLevel === opt.val ? 'bg-white text-black border-white' : 'border-gray-800 text-gray-400 hover:border-gray-600'}`}
                                      >
                                          <div className="text-lg">{opt.label}</div>
                                          <div className="text-[8px] font-bold uppercase">{opt.sub}</div>
                                      </button>
                                  ))}
                              </div>
                          </motion.div>

                          {/* Stress Level */}
                          <motion.div variants={setupItemVariants}>
                              <p className="text-[10px] text-gray-500 uppercase font-bold mb-2 tracking-widest">🧠 Stress Level</p>
                              <div className="grid grid-cols-2 gap-2">
                                  {([
                                      { val: 'LOW', label: '😌 Calm', sub: 'All good' },
                                      { val: 'MODERATE', label: '😤 Moderate', sub: 'Some pressure' },
                                      { val: 'HIGH', label: '😰 High', sub: 'Overwhelmed' },
                                      { val: 'BURNOUT', label: '🔴 Burnout', sub: 'At capacity' },
                                  ] as const).map(opt => (
                                      <button
                                          key={opt.val}
                                          onClick={() => setFormData({ ...formData, stressLevel: opt.val })}
                                          className={`py-2.5 px-3 rounded-xl border text-left transition-all ${formData.stressLevel === opt.val ? 'bg-white text-black border-white' : 'border-gray-800 text-gray-400 hover:border-gray-600'}`}
                                      >
                                          <div className="font-bold text-[11px]">{opt.label}</div>
                                          <div className="text-[9px] opacity-60 normal-case font-normal">{opt.sub}</div>
                                      </button>
                                  ))}
                              </div>
                          </motion.div>

                          <motion.div variants={setupItemVariants} className="sticky bottom-0 bg-[#0a0a0a] pt-3 pb-1 flex justify-between mt-4">
                              <button onClick={() => setStep(5)} className="text-gray-600 hover:text-white flex items-center gap-1 font-bold text-xs uppercase"><ChevronLeft size={14} /> BACK</button>
                              <button onClick={() => setStep(7)} className="bg-system-neon text-black px-10 py-3 rounded-full font-black text-xs shadow-[0_0_15px_#00d2ff] hover:bg-white transition-all uppercase flex items-center gap-2">NEXT <ChevronRight size={14} /></button>
                          </motion.div>
                      </motion.div>
                  )}

                  {/* ── STEP 7: Capability Scan ──────────────────────────── */}
                  {step === 7 && (
                      <motion.div key="s7" variants={setupContainerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-5">
                          <motion.div variants={setupItemVariants}>
                              <div className="flex items-center gap-2 mb-1">
                                  <Brain className="text-purple-400" size={18} />
                                  <span className="text-xs text-gray-500 uppercase tracking-widest font-bold">Capability Scan</span>
                              </div>
                              <p className="text-gray-600 text-[11px]">Quick baseline check — ForgeGuard uses this to scale your quests. Be honest! 🎮</p>
                          </motion.div>

                          {/* Push-ups */}
                          <motion.div variants={setupItemVariants}>
                              <p className="text-[10px] text-gray-500 uppercase font-bold mb-2 tracking-widest">💪 Max Push-ups (one set)</p>
                              <div className="grid grid-cols-2 gap-2">
                                  {([
                                      { label: '0 – 5', sub: 'Beginner', val: 5 },
                                      { label: '10 – 20', sub: 'Intermediate', val: 15 },
                                      { label: '30 – 50', sub: 'Advanced', val: 40 },
                                      { label: '50+', sub: 'Elite', val: 60 },
                                  ]).map(opt => (
                                      <button key={opt.val} onClick={() => setBaselines({ ...baselines, pushups: opt.val })}
                                          className={`py-2.5 px-3 rounded-xl border text-left transition-all ${baselines.pushups === opt.val ? 'bg-system-neon text-black border-system-neon' : 'border-gray-800 text-gray-400 hover:border-gray-600'}`}>
                                          <div className="font-bold text-[11px]">{opt.label}</div>
                                          <div className="text-[9px] opacity-60 normal-case font-normal">{opt.sub}</div>
                                      </button>
                                  ))}
                              </div>
                          </motion.div>

                          {/* Focus & Learning (merged) */}
                          <motion.div variants={setupItemVariants}>
                              <p className="text-[10px] text-gray-500 uppercase font-bold mb-2 tracking-widest">🧠 Focus & Learning Habit</p>
                              <div className="grid grid-cols-2 gap-2">
                                  {([
                                      { label: 'Easily Distracted', sub: 'Rarely reads or focuses', focus: 15, reading: 0 },
                                      { label: 'Light Focus', sub: '~30 min / light reader', focus: 30, reading: 15 },
                                      { label: 'Consistent', sub: '~1 hr / regular reader', focus: 60, reading: 45 },
                                      { label: 'Deep Learner', sub: '2+ hrs / heavy reader', focus: 120, reading: 90 },
                                  ]).map(opt => (
                                      <button key={opt.label}
                                          onClick={() => setBaselines({ ...baselines, focusDuration: opt.focus, readingTime: opt.reading })}
                                          className={`py-2.5 px-3 rounded-xl border text-left transition-all ${baselines.focusDuration === opt.focus ? 'bg-purple-500 text-white border-purple-500' : 'border-gray-800 text-gray-400 hover:border-gray-600'}`}>
                                          <div className="font-bold text-[11px]">{opt.label}</div>
                                          <div className="text-[9px] opacity-60 normal-case font-normal">{opt.sub}</div>
                                      </button>
                                  ))}
                              </div>
                          </motion.div>

                          {/* Sleep */}
                          <motion.div variants={setupItemVariants}>
                              <p className="text-[10px] text-gray-500 uppercase font-bold mb-2 tracking-widest">😴 Average Sleep</p>
                              <div className="grid grid-cols-2 gap-2">
                                  {([
                                      { label: '< 5 hrs', sub: 'Critical', val: 4 },
                                      { label: '5–6 hrs', sub: 'Low', val: 5.5 },
                                      { label: '7–8 hrs', sub: 'Optimal', val: 7.5 },
                                      { label: '9+ hrs', sub: 'High', val: 9 },
                                  ]).map(opt => (
                                      <button key={opt.val} onClick={() => setBaselines({ ...baselines, sleepAvg: opt.val })}
                                          className={`py-2.5 px-3 rounded-xl border text-left transition-all ${baselines.sleepAvg === opt.val ? 'bg-indigo-500 text-white border-indigo-500' : 'border-gray-800 text-gray-400 hover:border-gray-600'}`}>
                                          <div className="font-bold text-[11px]">{opt.label}</div>
                                          <div className="text-[9px] opacity-60 normal-case font-normal">{opt.sub}</div>
                                      </button>
                                  ))}
                              </div>
                          </motion.div>

                          <motion.div variants={setupItemVariants} className="sticky bottom-0 bg-[#0a0a0a] pt-3 pb-1 flex justify-between mt-4">
                              <button onClick={() => setStep(6)} className="text-gray-600 hover:text-white flex items-center gap-1 font-bold text-xs uppercase"><ChevronLeft size={14} /> BACK</button>
                              <button 
                                  onClick={() => {
                                      // Check if all three selections are made (not default values)
                                      if (baselines.pushups !== 0 && baselines.focusDuration !== 0 && baselines.sleepAvg !== 0) {
                                          setStep(8);
                                      }
                                  }}
                                  disabled={baselines.pushups === 0 || baselines.focusDuration === 0 || baselines.sleepAvg === 0}
                                  className={`px-10 py-3 rounded-full font-black text-xs transition-all uppercase flex items-center gap-2 ${
                                      baselines.pushups === 0 || baselines.focusDuration === 0 || baselines.sleepAvg === 0
                                          ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                                          : 'bg-system-neon text-black shadow-[0_0_15px_#00d2ff] hover:bg-white'
                                  }`}
                              >
                                  NEXT <ChevronRight size={14} />
                              </button>
                          </motion.div>
                      </motion.div>
                  )}

                  {/* ── STEP 8: Confirmation ─────────────────────────────── */}
                  {step === 8 && (
                      <motion.div key="s8" variants={setupContainerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6 text-center">
                          <motion.div variants={setupItemVariants}>
                              <h3 className="text-xl text-white font-black">✅ Confirm Configuration</h3>
                              <p className="text-gray-500 text-xs mt-1">Review your data before uploading to the System.</p>
                          </motion.div>
                          <motion.div variants={setupItemVariants} className="bg-gray-900/50 p-5 rounded-xl border border-gray-800 text-left space-y-2.5 font-mono text-xs">
                              <div className="flex justify-between"><span className="text-gray-500">👤 Profile</span><span className="text-white">{formData.gender}, {formData.age}y</span></div>
                              <div className="flex justify-between">
                                  <span className="text-gray-500">📏 Height</span>
                                  <span className="text-white">{heightUnit === 'FT' ? `${toFtIn(formData.height || 0).ft}'${toFtIn(formData.height || 0).inches}"` : `${formData.height}cm`}</span>
                              </div>
                              <div className="flex justify-between">
                                  <span className="text-gray-500">⚖️ Weight → Target</span>
                                  <span className="text-white">
                                      {weightUnit === 'LBS' ? `${toLbs(formData.weight || 0)}` : formData.weight}{weightUnit.toLowerCase()} → {weightUnit === 'LBS' ? `${toLbs(formData.targetWeight || 0)}` : formData.targetWeight}{weightUnit.toLowerCase()}
                                  </span>
                              </div>
                              <div className="flex justify-between"><span className="text-gray-500">🎯 Goal</span><span className="text-white">{formData.goal === 'RECOMP' ? 'Recomp' : formData.goal?.replace('_', ' ')}</span></div>
                              <div className="flex justify-between"><span className="text-gray-500">🏋️ Equipment</span><span className="text-white">{formData.equipment?.replace('_', ' ')}</span></div>
                              <div className="flex justify-between"><span className="text-gray-500">🏃 Activity</span><span className="text-white">{formData.activityLevel}</span></div>
                              <div className="flex justify-between"><span className="text-gray-500">⚡ Energy</span><span className="text-white">{formData.energyLevel}</span></div>
                              <div className="flex justify-between"><span className="text-gray-500">🧠 Stress</span><span className="text-white">{formData.stressLevel}</span></div>
                              <div className="flex justify-between"><span className="text-gray-500">💪 Pushups</span><span className="text-white">{baselines.pushups}</span></div>
                              <div className="flex justify-between"><span className="text-gray-500">😴 Sleep</span><span className="text-white">{baselines.sleepAvg}h avg</span></div>
                          </motion.div>
                          <motion.button
                              variants={setupItemVariants}
                              onClick={handleFinish}
                              className="w-full bg-system-neon text-black font-black py-5 rounded-xl shadow-[0_0_30px_#00d2ff] hover:scale-105 transition-transform uppercase tracking-widest"
                          >
                              🚀 Upload Biometrics
                          </motion.button>
                          <motion.button variants={setupItemVariants} onClick={() => setStep(7)} className="text-gray-600 hover:text-white flex items-center gap-1 font-bold text-xs uppercase mx-auto"><ChevronLeft size={14} /> BACK</motion.button>
                      </motion.div>
                  )}

              </AnimatePresence>
              </div>
          </motion.div>
      </div>
  );
};

export default CalibrationFlow;
