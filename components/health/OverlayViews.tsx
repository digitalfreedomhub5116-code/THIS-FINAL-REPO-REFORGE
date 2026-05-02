// Fullscreen overlay views extracted from HealthView.tsx
// These are early-return render paths — pure JSX, no hooks.
// Zero visual change.

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Fingerprint, Check, Sparkles, ShieldCheck, ArrowRight, Clock, TrendingUp } from 'lucide-react';
import { HealthProfile } from '../../types';
import {
  CircularCalibration, BMIGauge, BMRWave, DurationGraph,
  TechRadar, GeneratingMessage,
  lerp, lerpColor,
} from './HealthHelpers';

// ── PROCESSING VIEW ──
export const ProcessingView: React.FC<{ processingPercent: number }> = ({ processingPercent }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center font-mono p-6 sm:p-12 overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
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

// ── DIAGNOSIS VIEW ──
interface DiagnosisViewProps {
  currentBMI: string;
  bmiCategory: { label: string; color: string };
  nutritionInfo: { bmr: number; macros: any };
  estimatedTimeStr: string;
  onNext: () => void;
}

export const DiagnosisView: React.FC<DiagnosisViewProps> = ({ currentBMI, bmiCategory, nutritionInfo, estimatedTimeStr, onNext }) => (
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
        <motion.button initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.8 }} onClick={onNext} className="w-full py-5 bg-white text-black font-black rounded-2xl shadow-[0_0_30px_white] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-sm">VIEW ASCENSION PROJECTION <ArrowRight size={20} /></motion.button>
      </motion.div>
    </div>
  </motion.div>
);

// ── PROJECTION VIEW ──
interface ProjectionViewProps {
  formData: Partial<HealthProfile>;
  transformProgress: number;
  isAnimating: boolean;
  isTransformed: boolean;
  projectedIncrease: number;
  estimatedTimeStr: string;
  onAscensionClick: () => void;
  onAcceptProtocols: () => void;
}

export const ProjectionView: React.FC<ProjectionViewProps> = ({
  formData, transformProgress, isAnimating, isTransformed, projectedIncrease, estimatedTimeStr, onAscensionClick, onAcceptProtocols,
}) => {
  const lowStats = [ { subject: 'STRENGTH', value: 40, fullMark: 100 }, { subject: 'INTELLIGENCE', value: 50, fullMark: 100 }, { subject: 'FOCUS', value: 30, fullMark: 100 }, { subject: 'SOCIAL', value: 20, fullMark: 100 }, { subject: 'WILLPOWER', value: 60, fullMark: 100 } ];
  const highStatsData = [ { subject: 'STRENGTH', value: 85, fullMark: 100 }, { subject: 'INTELLIGENCE', value: 75, fullMark: 100 }, { subject: 'FOCUS', value: 80, fullMark: 100 }, { subject: 'SOCIAL', value: 65, fullMark: 100 }, { subject: 'WILLPOWER', value: 95, fullMark: 100 } ];
  const currentStats = lowStats.map((stat, i) => ({ subject: stat.subject, value: lerp(stat.value, highStatsData[i].value, transformProgress), fullMark: 100 }));
  const currentColor = lerpColor("#00d2ff", "#10b981", transformProgress);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-between p-4 sm:p-6 font-mono overflow-y-auto h-[100dvh]" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}>
      <div className="absolute inset-0" style={{ background: isAnimating ? 'radial-gradient(circle at center, rgba(0,210,255,0.07) 0%, transparent 60%)' : isTransformed ? 'radial-gradient(circle at center, rgba(16,185,129,0.08) 0%, transparent 60%)' : 'radial-gradient(circle at center, rgba(0,210,255,0.04) 0%, transparent 60%)' }} />
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
                <p className="text-xs text-gray-500 max-w-xs mx-auto leading-relaxed">The System has analyzed your biological data. Peak evolution awaits — initiate the sequence to unlock your potential.</p>
                <motion.button whileTap={{ scale: 0.97 }} onClick={onAscensionClick} className="w-full py-4 bg-system-neon/10 border border-system-neon/40 text-system-neon font-black rounded-2xl hover:bg-system-neon/20 hover:border-system-neon/70 shadow-[0_0_20px_rgba(0,210,255,0.2)] transition-all tracking-[0.2em] text-xs uppercase">INITIATE ASCENSION SEQUENCE</motion.button>
              </motion.div>
            ) : isAnimating ? (
              <motion.div key="animating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-4 space-y-3">
                <div className="text-system-neon font-bold tracking-[0.3em] text-center uppercase text-xs" style={{ animation: 'pulse 1.5s ease-in-out infinite' }}>REWRITING BIOLOGY...</div>
                <div className="w-full h-px overflow-hidden rounded-full bg-white/5">
                  <motion.div className="h-full bg-system-neon shadow-[0_0_8px_#00d2ff]" initial={{ x: '-100%' }} animate={{ x: '100%' }} transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }} />
                </div>
              </motion.div>
            ) : (
              <motion.div key="accept" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <div className="p-3 bg-system-success/5 border border-system-success/30 rounded-2xl"><div className="text-system-success font-black text-xs mb-1 flex items-center justify-center gap-2"><ShieldCheck size={14} /> SYSTEM GUARANTEE</div><p className="text-[10px] text-gray-400 leading-relaxed max-w-xs mx-auto">Adherence to established protocols ensures peak biological evolution.</p></div>
                <button onClick={onAcceptProtocols} className="w-full py-4 bg-system-success text-black font-black rounded-2xl shadow-[0_0_40px_#10b981] hover:bg-white transition-all uppercase tracking-widest text-xs sm:text-sm">ACCEPT SYSTEM PROTOCOLS</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <div className="absolute top-6 right-6 flex items-center gap-2 opacity-30 pointer-events-none"><Activity size={14} className="text-system-neon" /><div className="text-[9px] font-bold tracking-widest" style={{ color: currentColor }}>BIO_SYNC_V2 // STABLE</div></div>
    </div>
  );
};

// ── FINALIZING VIEW ──
export const FinalizingView: React.FC<{ finalizingLog: string }> = ({ finalizingLog }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center font-mono gap-8">
    <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, rgba(0,210,255,0.05) 0%, transparent 60%)' }} />
    {/* Animated ring */}
    <div className="relative w-20 h-20">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="35" fill="none" stroke="rgba(0,210,255,0.08)" strokeWidth="2" />
        <motion.circle cx="40" cy="40" r="35" fill="none" stroke="#00d2ff" strokeWidth="2" strokeLinecap="round"
          strokeDasharray="220" initial={{ strokeDashoffset: 220 }} animate={{ strokeDashoffset: 0 }}
          transition={{ duration: 4, ease: 'easeInOut' }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }}>
          <Sparkles className="text-system-neon" size={24} />
        </motion.div>
      </div>
    </div>
    <div className="text-center space-y-2 relative z-10">
      <div className="text-[9px] font-bold tracking-[0.4em] uppercase text-system-neon/50 mb-2">SYSTEM PROTOCOL</div>
      <motion.div key={finalizingLog} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-sm text-white font-black uppercase tracking-[0.25em]">{finalizingLog}</motion.div>
    </div>
  </motion.div>
);

// ── AI GENERATING PLAN OVERLAY ──
export const GeneratingPlanOverlay: React.FC<{ progress?: number }> = ({ progress }) => {
  // If no external progress, use an internal indeterminate timer that caps at 0.85
  const [internalPct, setInternalPct] = React.useState(0);
  React.useEffect(() => {
    if (progress != null) return; // external progress drives the ring
    let raf: number;
    const start = Date.now();
    const tick = () => {
      const elapsed = (Date.now() - start) / 1000;
      // Fast at first, asymptotically approaches 0.85 — never reaches 1.0
      const pct = 0.85 * (1 - Math.exp(-elapsed / 12));
      setInternalPct(pct);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [progress]);

  const pct = progress != null ? progress : internalPct;
  const circumference = 2 * Math.PI * 44; // ~276.46
  const offset = circumference * (1 - pct);

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
          <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(0,210,255,0.1)" strokeWidth="4" />
          <circle
            cx="50" cy="50" r="44" fill="none"
            stroke="var(--color-neon, #00d2ff)" strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transformOrigin: '50% 50%', transform: 'rotate(-90deg)', transition: 'stroke-dashoffset 0.4s ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 1.8, repeat: Infinity }}>
            <Sparkles size={32} className="text-[#00d2ff]" />
          </motion.div>
        </div>
      </div>
      <div className="text-[10px] font-black text-[#00d2ff] uppercase tracking-[0.3em] mb-4">ForgeGuard AI</div>
      <div className="text-xl font-black text-white mb-3 tracking-tight">Crafting Your Protocol</div>
      <GeneratingMessage messages={msgs} />
      <div className="flex gap-1.5 mt-6">
        {[0,1,2,3,4].map(i => (
          <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-[#00d2ff]"
            animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
            transition={{ duration: 1.2, delay: i * 0.2, repeat: Infinity }}
          />
        ))}
      </div>
    </div>
  );
};

// ── PLAN COMPLETE CONFETTI SCREEN ──
interface PlanCompleteViewProps {
  name: string;
  dayCount: number;
  onDismiss: () => void;
}

export const PlanCompleteView: React.FC<PlanCompleteViewProps> = ({ name, dayCount, onDismiss }) => {
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
        <div className="text-2xl font-black text-white mb-2 leading-tight">{name}</div>
        <div className="text-[12px] text-gray-400 mb-2">{dayCount}-day program generated &amp; saved</div>
        <div className="text-[10px] text-gray-600 font-mono mb-8">Your plan has been saved to your permanent archive</div>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={onDismiss}
          className="w-full py-4 rounded-2xl font-black text-sm tracking-wider text-white"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)', boxShadow: '0 0 30px rgba(139,92,246,0.5)' }}
        >
          Begin Training
        </motion.button>
      </motion.div>
    </div>
  );
};
