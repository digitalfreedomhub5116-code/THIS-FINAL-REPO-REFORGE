import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Star, Dumbbell, Brain, Shield, Users, Eye, Sparkles } from 'lucide-react';
import { triggerHaptic } from '../utils/soundEngine';

interface OnboardingHookProps {
  onComplete: () => void;
}

/* ── Dot Navigator ────────────────────────────────────── */
const Dots = ({ total, current }: { total: number; current: number }) => (
  <div className="flex gap-2 justify-center pt-3 pb-2">
    {Array.from({ length: total }).map((_, i) => (
      <div key={i} className={`rounded-full transition-all duration-300 ${i === current ? 'w-6 h-2 bg-[#00d4ff]' : 'w-2 h-2 bg-gray-700'}`} />
    ))}
  </div>
);

/* ── Particle embers ──────────────────────────────────── */
const Embers = () => (
  <>
    {Array.from({ length: 8 }).map((_, i) => (
      <motion.div
        key={i}
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 2 + (i % 3),
          height: 2 + (i % 3),
          left: `${10 + i * 11}%`,
          bottom: '2%',
          background: 'radial-gradient(circle, rgba(0,212,255,0.8), rgba(0,180,220,0.4))',
          boxShadow: '0 0 4px rgba(0,212,255,0.5)',
        }}
        animate={{ y: [0, -(250 + i * 30)], x: [0, (i % 2 === 0 ? 1 : -1) * (10 + i * 5)], opacity: [0.7, 0] }}
        transition={{ duration: 3.5 + i * 0.5, delay: i * 0.4, repeat: Infinity, ease: 'easeOut' }}
      />
    ))}
  </>
);

/* ── CTA Button ───────────────────────────────────────── */
const CTAButton = ({ text, onClick, variant = 'primary' }: { text: string; onClick: () => void; variant?: 'primary' | 'white' }) => (
  <motion.button
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.6 }}
    onClick={() => { triggerHaptic('BUTTON_TAP'); onClick(); }}
    className={`w-full py-4 font-black text-sm uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all ${
      variant === 'white'
        ? 'bg-white text-black shadow-[0_0_25px_rgba(255,255,255,0.25)] hover:bg-gray-100'
        : 'bg-[#00d4ff] text-black shadow-[0_0_25px_rgba(0,212,255,0.35)] hover:bg-[#33dfff]'
    }`}
  >
    {text} <ChevronRight size={16} />
  </motion.button>
);

/* ═══════════════════════════════════════════════════════ */
/* SCREEN A1 — "A Gate Has Opened"                       */
/* ═══════════════════════════════════════════════════════ */
const ScreenGate = ({ onNext }: { onNext: () => void }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex flex-col">
    <div className="absolute inset-0">
      <img src="/onboarding/gate_hero.webp" alt="" className="w-full h-full object-cover" />
      <motion.div className="absolute inset-0" animate={{ opacity: [0.3, 0.45, 0.3] }} transition={{ duration: 3, repeat: Infinity }} style={{ background: 'linear-gradient(to top, black 0%, rgba(0,0,0,0.7) 35%, rgba(0,0,0,0.2) 60%, rgba(0,0,0,0.4) 100%)' }} />
    </div>
    <Embers />
    <div className="relative z-10 flex-1 flex flex-col justify-end px-6 pb-6" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-4 mb-8">
        <div className="text-[#00d4ff] text-xs font-bold tracking-[0.3em] uppercase">⚔️ Solo Leveling System</div>
        <h1 className="text-[32px] font-black text-white leading-tight tracking-tight">A Gate has<br/>opened.</h1>
        <p className="text-gray-400 text-[15px] leading-relaxed max-w-[300px]">Only those brave enough to enter will evolve beyond their limits.</p>
      </motion.div>
      <CTAButton text="Enter the Gate" onClick={onNext} variant="white" />
    </div>
  </motion.div>
);

/* ═══════════════════════════════════════════════════════ */
/* SCREEN A2 — "The Science"                             */
/* ═══════════════════════════════════════════════════════ */
const StatCard = ({ label, value, delay }: { label: string; value: string; delay: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="bg-[#111] border border-gray-800 rounded-2xl p-5"
  >
    <div className="text-gray-400 text-[13px] font-medium mb-1">{label}</div>
    <div className="text-white text-[28px] font-black font-mono">
      {value}<span className="text-[#00d4ff] text-lg ml-1">↑</span>
    </div>
  </motion.div>
);

const ScreenScience = ({ onNext }: { onNext: () => void }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex flex-col bg-black">
    <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 20%, rgba(0,212,255,0.06) 0%, transparent 60%)' }} />
    <div className="relative z-10 flex-1 flex flex-col px-6 overflow-y-auto" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 48px)', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}>
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
        <div className="text-[#00d4ff] text-xs font-bold tracking-[0.3em] uppercase mb-4">⚔️</div>
        <p className="text-gray-400 text-[15px] mb-2">Research shows it takes just</p>
        <h1 className="text-[56px] font-black bg-gradient-to-r from-[#00d4ff] to-[#33dfff] bg-clip-text text-transparent leading-none mb-2">21 days</h1>
        <p className="text-gray-400 text-[15px]">to ignite a habit — and <span className="text-[#00d4ff] font-semibold">90 days to fully transform.</span></p>
      </motion.div>
      <div className="grid grid-cols-2 gap-3 mb-5">
        <StatCard label="Boost Strength" value="23%" delay={0.2} />
        <StatCard label="Reduce Fatigue" value="15%" delay={0.3} />
        <StatCard label="Build Discipline" value="38%" delay={0.4} />
        <StatCard label="Improve Focus" value="20%" delay={0.5} />
      </div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="bg-[#0a0a0a] border border-gray-800 rounded-2xl p-5 mb-6">
        <h3 className="text-white font-bold text-[15px] mb-3">Scientific Research</h3>
        <div className="space-y-2.5">
          {[
            { icon: '🧬', title: 'Psycho-Cybernetics: 21-day adaptation...', source: 'Dr. Maxwell Maltz, 1960' },
            { icon: '📊', title: 'Exercise & Strength Gains: 6-8 Week...', source: 'pubmed.ncbi.nlm.nih.gov' },
            { icon: '🧠', title: 'How are habits formed: Modelling habit...', source: 'Lally et al., UCL 2010' },
          ].map((r, i) => (
            <div key={i} className="flex items-center gap-2.5 text-[12px]">
              <span>{r.icon}</span>
              <span className="text-gray-300 truncate flex-1">{r.title}</span>
              <span className="text-gray-600 shrink-0">{r.source}</span>
            </div>
          ))}
        </div>
      </motion.div>
      <div className="mt-auto">
        <CTAButton text="Next" onClick={onNext} />
      </div>
    </div>
  </motion.div>
);

/* ═══════════════════════════════════════════════════════ */
/* SCREEN A3 — "Real Hunters, Real Results"              */
/* ═══════════════════════════════════════════════════════ */
const ScreenSocialProof = ({ onNext }: { onNext: () => void }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex flex-col">
    <div className="absolute inset-0">
      <img src="/onboarding/cliff_warrior.webp" alt="" className="w-full h-[45%] object-cover" />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, black 40%, rgba(0,0,0,0.8) 55%, rgba(0,0,0,0.3) 75%, rgba(0,0,0,0.5) 100%)' }} />
    </div>
    <div className="relative z-10 flex-1 flex flex-col justify-end px-6 pb-6 overflow-y-auto" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}>
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
        <div className="text-[#00d4ff] text-xs font-bold tracking-[0.3em] uppercase mb-3">⚔️</div>
        <h1 className="text-[28px] font-black text-white leading-tight">Real Hunters.<br/>Real Results.</h1>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-[#111] border border-gray-800 rounded-2xl p-6 mb-5">
        <p className="text-gray-300 text-[14px] leading-relaxed italic mb-4">
          "I was at my <b className="text-white not-italic">lowest point</b>. No discipline, no routine. This app turned it around in 3 weeks. The gamified system made me actually <b className="text-white not-italic">WANT to wake up early</b>."
        </p>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00d4ff] to-[#0088aa] flex items-center justify-center text-black font-black text-sm">A</div>
          <div>
            <div className="text-white text-[14px] font-bold">Alex, 22</div>
            <div className="text-gray-500 text-[12px]">Hunter since Jan '26</div>
          </div>
        </div>
      </motion.div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="flex items-center justify-center gap-2 mb-6">
        <div className="flex">
          {[1,2,3,4,5].map(i => <Star key={i} size={16} className="text-[#00d4ff] fill-[#00d4ff]" />)}
        </div>
        <span className="text-gray-400 text-[13px] font-medium ml-1">4.9</span>
        <span className="text-gray-600 text-[13px]">•</span>
        <span className="text-gray-400 text-[13px]">10K+ hunters</span>
      </motion.div>
      <CTAButton text="Next" onClick={onNext} />
    </div>
  </motion.div>
);

/* ═══════════════════════════════════════════════════════ */
/* SCREEN A4 — "Progressive Difficulty"                  */
/* ═══════════════════════════════════════════════════════ */
const ScreenProgressive = ({ onNext }: { onNext: () => void }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex flex-col bg-black">
    <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(0,212,255,0.05) 0%, transparent 60%)' }} />
    <div className="relative z-10 flex-1 flex flex-col px-6 overflow-y-auto" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 48px)', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}>
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
        <div className="text-[#00d4ff] text-xs font-bold tracking-[0.3em] uppercase mb-4">⚔️</div>
        <h1 className="text-[22px] font-black text-white leading-snug px-2">
          Each week, your quests get <span className="text-[#00d4ff]">progressively harder</span> to forge your discipline.
        </h1>
      </motion.div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex justify-center gap-2 mb-6">
        {[
          { Icon: Dumbbell, active: true },
          { Icon: Brain, active: false },
          { Icon: Eye, active: false },
          { Icon: Shield, active: false },
          { Icon: Users, active: false },
        ].map(({ Icon, active }, i) => (
          <div key={i} className={`p-2.5 rounded-xl border transition-all ${active ? 'border-[#00d4ff] bg-[#00d4ff]/10' : 'border-gray-800 bg-transparent'}`}>
            <Icon size={18} className={active ? 'text-[#00d4ff]' : 'text-gray-600'} />
          </div>
        ))}
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-[#0a0a0a] border border-gray-800 rounded-2xl p-5 mb-4">
        <h3 className="text-white font-bold text-[15px] mb-4">Build Strength</h3>
        <svg viewBox="0 0 300 150" className="w-full">
          <defs>
            <linearGradient id="cyanGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#00d4ff" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[30, 60, 90, 120].map(y => <line key={y} x1="0" y1={y} x2="300" y2={y} stroke="rgba(255,255,255,0.04)" />)}
          <motion.path d="M 0,130 Q 75,125 150,120 T 300,115" fill="none" stroke="#4b5563" strokeWidth="2" strokeDasharray="4 4" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.5, delay: 0.5 }} />
          <motion.path d="M 0,130 Q 50,120 100,100 T 200,55 Q 250,35 300,20 L 300,150 L 0,150 Z" fill="url(#cyanGrad)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8, duration: 1 }} />
          <motion.path d="M 0,130 Q 50,120 100,100 T 200,55 Q 250,35 300,20" fill="none" stroke="#00d4ff" strokeWidth="2.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.5, delay: 0.5 }} />
          <text x="150" y="145" textAnchor="middle" fill="#6b7280" fontSize="10" fontFamily="monospace">Week 5</text>
        </svg>
        <div className="flex justify-center gap-6 mt-3 text-[12px]">
          <div className="flex items-center gap-1.5"><div className="w-3 h-[3px] rounded-full bg-[#00d4ff]" /><span className="text-gray-400">With System</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-[3px] rounded-full bg-gray-600" /><span className="text-gray-500">Without</span></div>
        </div>
      </motion.div>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="text-center text-[13px] text-gray-400 mb-6">
        <span className="text-[#00d4ff]">★</span> By Week 4, hunters report <span className="text-[#00d4ff] font-semibold">3x more consistency</span> in their routines.
      </motion.p>
      <div className="mt-auto">
        <CTAButton text="Continue" onClick={onNext} />
      </div>
    </div>
  </motion.div>
);

/* ═══════════════════════════════════════════════════════ */
/* SCREEN A5 — "Your Current Level"                      */
/* ═══════════════════════════════════════════════════════ */
const statRows = [
  { label: 'Strength', Icon: Dumbbell, color: '#f87171' },
  { label: 'Intelligence', Icon: Brain, color: '#60a5fa' },
  { label: 'Discipline', Icon: Shield, color: '#33dfff' },
  { label: 'Social', Icon: Users, color: '#facc15' },
  { label: 'Focus', Icon: Eye, color: '#34d399' },
  { label: 'Willpower', Icon: Sparkles, color: '#fb923c' },
];

const ScreenCurrentLevel = ({ onNext }: { onNext: () => void }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex flex-col bg-black">
    <div className="absolute right-0 top-0 bottom-0 w-[45%] overflow-hidden pointer-events-none">
      <img src="/onboarding/shadow_warrior.webp" alt="" className="h-full w-full object-cover object-left" style={{ opacity: 0.3, maskImage: 'linear-gradient(to right, transparent 0%, black 30%)', WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 30%)' }} />
    </div>
    <div className="relative z-10 flex-1 flex flex-col px-6 overflow-y-auto" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 48px)', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}>
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-[28px] font-black text-white leading-tight mb-1">Your Current<br/>Rating ⚔️</h1>
      </motion.div>
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="flex items-center gap-4 my-5">
        <div className="bg-white rounded-2xl px-6 py-4 text-center shadow-[0_0_20px_rgba(255,255,255,0.2)]">
          <div className="text-black text-[48px] font-black leading-none">1</div>
          <div className="text-black/60 text-[11px] font-bold tracking-widest uppercase">Level</div>
        </div>
        <div>
          <div className="w-8 h-8 rounded-full border-2 border-gray-700 flex items-center justify-center mb-1">
            <span className="text-gray-600 text-[10px]">0</span>
          </div>
          <div className="text-gray-500 text-[12px]">XP earned</div>
        </div>
      </motion.div>
      <div className="w-full h-1.5 bg-gray-800 rounded-full mb-1 overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: '5%' }} transition={{ delay: 0.4, duration: 0.8 }} className="h-full bg-[#00d4ff] rounded-full shadow-[0_0_8px_rgba(0,212,255,0.5)]" />
      </div>
      <p className="text-gray-600 text-[11px] font-mono mb-6">125 XP to Lvl 2</p>
      <div className="space-y-3 mb-6">
        {statRows.map(({ label, Icon, color }, i) => (
          <motion.div key={label} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.08 }} className="flex items-center gap-3">
            <Icon size={18} style={{ color }} />
            <span className="text-white font-bold text-[15px] flex-1">{label}</span>
            <span className="text-green-400 text-[12px] font-bold">▲</span>
            <div className="w-7 h-7 rounded-full border-2 border-gray-700 flex items-center justify-center">
              <span className="text-gray-600 text-[11px] font-bold">○</span>
            </div>
          </motion.div>
        ))}
      </div>
      <div className="mt-auto">
        <CTAButton text="⚡ See potential rating" onClick={onNext} />
      </div>
    </div>
  </motion.div>
);

/* ═══════════════════════════════════════════════════════ */
/* SCREEN A6 — "Ready to Begin?"                         */
/* ═══════════════════════════════════════════════════════ */
const checklistItems = ['Hunter Identity', 'Body Metrics', 'Primary Mission', 'Equipment & Injuries', 'Baseline Scan'];

const ScreenReadyToBegin = ({ onNext }: { onNext: () => void }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex flex-col">
    <div className="absolute inset-0">
      <img src="/onboarding/crystal_reach.webp" alt="" className="w-full h-[50%] object-cover" />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, black 35%, rgba(0,0,0,0.7) 50%, rgba(0,0,0,0.2) 70%, rgba(0,0,0,0.5) 100%)' }} />
    </div>
    <div className="relative z-10 flex-1 flex flex-col justify-end px-6 pb-6" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}>
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
        <div className="text-[#00d4ff] text-xs font-bold tracking-[0.3em] uppercase mb-3">⚔️</div>
        <h1 className="text-[28px] font-black text-white leading-tight mb-2">Understanding<br/>your situation</h1>
        <p className="text-gray-400 text-[14px] leading-relaxed">Answer honestly so the System can calibrate your optimal training protocol.</p>
      </motion.div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mb-6 pl-1">
        {checklistItems.map((item, i) => (
          <motion.div key={item} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.12 }} className="flex items-center gap-3 relative">
            {i < checklistItems.length - 1 && <div className="absolute left-[11px] top-[24px] w-[1.5px] h-6 bg-gray-800" />}
            <div className="w-6 h-6 rounded-full border-2 border-[#00d4ff]/40 bg-[#00d4ff]/5 flex items-center justify-center shrink-0">
              <div className="w-1.5 h-1.5 rounded-full bg-[#00d4ff]/50" />
            </div>
            <span className="text-gray-300 text-[14px] font-medium py-3">{item}</span>
          </motion.div>
        ))}
      </motion.div>
      <p className="text-gray-600 text-[12px] text-center mb-5">We'll use the answers to design a tailor-made protocol just for you.</p>
      <CTAButton text="Let's start ▶" onClick={onNext} variant="white" />
    </div>
  </motion.div>
);

/* ═══════════════════════════════════════════════════════ */
/* MAIN COMPONENT                                        */
/* ═══════════════════════════════════════════════════════ */
const SCREENS = [ScreenGate, ScreenScience, ScreenSocialProof, ScreenProgressive, ScreenCurrentLevel, ScreenReadyToBegin];

const OnboardingHook: React.FC<OnboardingHookProps> = ({ onComplete }) => {
  const [screen, setScreen] = useState(0);

  const next = () => {
    if (screen >= SCREENS.length - 1) {
      onComplete();
    } else {
      setScreen(s => s + 1);
    }
  };

  const Screen = SCREENS[screen];

  return (
    <div className="fixed inset-0 z-[60] bg-black overflow-hidden">
      <AnimatePresence mode="wait">
        <Screen key={screen} onNext={next} />
      </AnimatePresence>
      <div className="absolute bottom-2 left-0 right-0 z-20" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <Dots total={SCREENS.length} current={screen} />
      </div>
    </div>
  );
};

export default OnboardingHook;
