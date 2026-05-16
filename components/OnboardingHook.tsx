import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Star, Dumbbell, Brain, Shield, Users, Eye, Sparkles } from 'lucide-react';
import { triggerHaptic } from '../utils/soundEngine';

interface OnboardingHookProps {
  onComplete: () => void;
}

/* ── Dot Navigator ────────────────────────────────────── */
const Dots = ({ total, current }: { total: number; current: number }) => (
  <div className="flex gap-2 justify-center py-3">
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
    <div className="relative z-10 flex-1 flex flex-col justify-end px-6 pb-14" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 56px)' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-4 mb-8">
        <div className="text-white text-xs font-bold tracking-[0.35em] uppercase" style={{ fontFamily: "'Orbitron', 'Rajdhani', 'Share Tech Mono', monospace" }}>⚔️ REFORGE SYSTEM</div>
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
    {/* Half background image */}
    <div className="absolute inset-0">
      <img src="/onboarding/arrow_target.webp" alt="" className="w-full h-[45%] object-cover" />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, black 40%, rgba(0,0,0,0.75) 55%, rgba(0,0,0,0.3) 70%, rgba(0,0,0,0.5) 100%)' }} />
    </div>
    <div className="relative z-10 flex-1 flex flex-col px-6 overflow-y-auto" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 48px)', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 56px)' }}>
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6 mt-auto">
        <div className="text-white text-xs font-bold tracking-[0.35em] uppercase mb-4" style={{ fontFamily: "'Orbitron', 'Rajdhani', 'Share Tech Mono', monospace" }}>⚔️ REFORGE SYSTEM</div>
        <p className="text-gray-400 text-[15px] mb-2">Research shows it takes just</p>
        <h1 className="text-[56px] font-black text-white leading-none mb-2" style={{ textShadow: '0 0 30px rgba(255,255,255,0.15)' }}>21 days</h1>
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
/* SCREEN A3 — "Real Transformation Timeline"            */
/* ═══════════════════════════════════════════════════════ */
const timelineData = [
  {
    day: 'Day 1',
    label: 'The Starting Point',
    stats: [{ key: 'Overall', value: 55 }],
    text: 'I was at my lowest. No routine, sleeping late, eating junk, scrolling for hours. My body felt sluggish and I had zero discipline. That\'s when I decided to try Reforge.',
    tasks: ['30 push ups daily', 'Wake up at 7 AM', 'No social media after 9 PM', 'Track all meals'],
  },
  {
    day: 'Day 10',
    label: 'Building Habits',
    stats: [{ key: 'Overall', value: 65, delta: 10 }, { key: 'Focus', value: 66, delta: 11 }],
    text: 'Started waking up early consistently. The quest system kept me accountable — I didn\'t want to break my streak. Had more energy during the day.',
    tasks: ['40 push ups daily', 'Wake up at 6:30 AM', 'Study 2 hrs before phone', 'Walk 5K steps'],
  },
  {
    day: 'Day 33',
    label: 'Visible Changes',
    stats: [{ key: 'Overall', value: 74, delta: 19 }, { key: 'Strength', value: 72, delta: 17 }],
    text: 'My friends started noticing. Lost the face bloat, clothes fit better. The progressive difficulty meant I was always pushing just a bit harder each week.',
    tasks: ['Full workout 4x/week', 'Meal prep Sundays', 'Cold showers', 'Read 20 pages/day'],
  },
  {
    day: 'Day 66',
    label: 'The Breakthrough',
    stats: [{ key: 'Overall', value: 85, delta: 30 }, { key: 'Discipline', value: 88, delta: 33 }],
    text: 'Hit Level 30. The habits felt automatic now — I didn\'t need motivation anymore. Discipline replaced willpower. My body was visibly different.',
    tasks: ['6-day training split', 'Consistent 7h sleep', 'Zero junk food weeks', 'Morning meditation'],
  },
  {
    day: 'Day 90',
    label: 'Fully Transformed',
    stats: [{ key: 'Overall', value: 94, delta: 39 }, { key: 'All Stats', value: 90, delta: 35 }],
    text: 'Completely different person. Lost 8kg, gained confidence, fixed my sleep schedule. The system pushed me every single day. Best 90 days of my life.',
  },
];

const ScreenSocialProof = ({ onNext }: { onNext: () => void }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex flex-col bg-black">
    <div className="relative z-10 flex-1 flex flex-col overflow-y-auto" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 24px)', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 56px)' }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="text-center px-6 mb-5">
        <div className="text-white text-xs font-bold tracking-[0.35em] uppercase mb-3" style={{ fontFamily: "'Orbitron', 'Rajdhani', 'Share Tech Mono', monospace" }}>⚔️ REAL STORY FROM A HUNTER</div>
      </motion.div>

      {/* Before / After photos */}
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="flex items-center justify-center gap-4 px-6 mb-3">
        <div className="text-center">
          <div className="w-[72px] h-[72px] rounded-full overflow-hidden border-2 border-gray-700 shadow-lg">
            <img src="/onboarding/before_selfie.webp" alt="Before" className="w-full h-full object-cover" />
          </div>
          <span className="text-gray-500 text-[10px] mt-1 block">Before</span>
        </div>
        <div className="text-[#00d4ff] text-lg font-bold">→</div>
        <div className="text-center">
          <div className="w-[72px] h-[72px] rounded-full overflow-hidden border-2 border-[#00d4ff] shadow-[0_0_12px_rgba(0,212,255,0.3)]">
            <img src="/onboarding/after_selfie.webp" alt="After" className="w-full h-full object-cover" />
          </div>
          <span className="text-[#00d4ff] text-[10px] mt-1 block font-medium">After</span>
        </div>
      </motion.div>
      <div className="text-center mb-5 px-6">
        <div className="text-white text-[16px] font-bold">Arjun, 22</div>
        <div className="text-gray-500 text-[12px]">📍 Mumbai, India</div>
      </div>

      {/* Timeline */}
      <div className="px-6 relative">
        {/* Vertical line */}
        <div className="absolute left-[30px] top-0 bottom-0 w-[2px] bg-gradient-to-b from-gray-700 via-[#00d4ff]/40 to-[#00d4ff]" />

        {timelineData.map((item, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + idx * 0.15 }}
            className="relative pl-10 mb-6"
          >
            {/* Dot */}
            <div className={`absolute left-[22px] top-1 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center ${idx === timelineData.length - 1 ? 'border-[#00d4ff] bg-[#00d4ff]/20' : 'border-gray-600 bg-black'}`}>
              <div className={`w-[6px] h-[6px] rounded-full ${idx === timelineData.length - 1 ? 'bg-[#00d4ff]' : 'bg-gray-500'}`} />
            </div>

            {/* Day label */}
            <div className="text-[#00d4ff] text-[15px] font-black font-mono">{item.day}</div>
            <div className="text-gray-500 text-[11px] mb-2">{item.label}</div>

            {/* Stats bar */}
            <div className="flex gap-3 mb-2">
              {item.stats.map((s, si) => (
                <div key={si} className="bg-[#111] border border-gray-800 rounded-lg px-3 py-1.5 flex items-center gap-2">
                  <span className="text-gray-400 text-[11px]">★ {s.key}</span>
                  <span className="text-white text-[14px] font-black font-mono">{s.value}</span>
                  {(s as any).delta && <span className="text-[#00d4ff] text-[10px] font-bold bg-[#00d4ff]/10 px-1.5 py-0.5 rounded-full">+{(s as any).delta} ▲</span>}
                </div>
              ))}
            </div>

            {/* Description */}
            <p className="text-gray-300 text-[13px] leading-relaxed mb-2">{item.text}</p>

            {/* Tasks (not shown for last item) */}
            {item.tasks && (
              <div className="bg-[#0a0a0a] border border-gray-800/60 rounded-xl p-3 mt-2">
                <div className="text-gray-500 text-[10px] font-bold tracking-widest uppercase mb-2 border-b border-gray-800 pb-1.5">Tasks in Week {idx + 1}</div>
                {item.tasks.map((task, ti) => (
                  <div key={ti} className="flex items-center gap-2 py-1">
                    <span className="text-[#00d4ff] text-[11px]">▸</span>
                    <span className="text-gray-300 text-[12px]">{task}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Show before photo after Day 1 */}
            {idx === 0 && (
              <div className="mt-3 w-[140px] h-[140px] rounded-xl overflow-hidden border border-gray-800">
                <img src="/onboarding/before_selfie.webp" alt="" className="w-full h-full object-cover" />
              </div>
            )}

            {/* Show after photo at Day 90 */}
            {idx === timelineData.length - 1 && (
              <div className="mt-3 w-[140px] h-[140px] rounded-xl overflow-hidden border border-[#00d4ff]/30 shadow-[0_0_15px_rgba(0,212,255,0.15)]">
                <img src="/onboarding/after_selfie.webp" alt="" className="w-full h-full object-cover" />
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Rating + CTA */}
      <div className="px-6 mt-auto">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="flex items-center justify-center gap-2 mb-5">
          <div className="flex">
            {[1,2,3,4,5].map(i => <Star key={i} size={14} className="text-[#00d4ff] fill-[#00d4ff]" />)}
          </div>
          <span className="text-gray-400 text-[12px] font-medium ml-1">4.9</span>
          <span className="text-gray-600 text-[12px]">•</span>
          <span className="text-gray-400 text-[12px]">10K+ hunters</span>
        </motion.div>
        <CTAButton text="Next" onClick={onNext} />
      </div>
    </div>
  </motion.div>
);

/* ═══════════════════════════════════════════════════════ */
/* SCREEN A4 — "Progressive Difficulty" (Interactive)    */
/* ═══════════════════════════════════════════════════════ */

// Each stat has its own unique growth curve, color, and data
const STAT_GRAPHS = [
  {
    key: 'strength',
    Icon: Dumbbell,
    label: 'Build Strength',
    color: '#f87171',
    fact: '3x more consistency',
    factPrefix: 'By Week 4, hunters report',
    // Points: [week0, week1, week2, ... week8] — value 0-100 (100 = top of graph)
    withSystem: [5, 12, 22, 38, 52, 65, 76, 85, 92],
    without:    [5, 8,  10, 12, 14, 15, 16, 17, 18],
  },
  {
    key: 'intelligence',
    Icon: Brain,
    label: 'Sharpen Intelligence',
    color: '#60a5fa',
    fact: '2.5x faster learning',
    factPrefix: 'By Week 3, hunters show',
    withSystem: [10, 18, 30, 45, 55, 68, 78, 88, 95],
    without:    [10, 12, 14, 16, 18, 20, 22, 23, 24],
  },
  {
    key: 'focus',
    Icon: Eye,
    label: 'Increase Focus',
    color: '#34d399',
    fact: '40% longer deep work',
    factPrefix: 'By Week 5, hunters achieve',
    withSystem: [8, 14, 20, 28, 42, 58, 72, 82, 90],
    without:    [8, 10, 11, 13, 14, 15, 16, 17, 17],
  },
  {
    key: 'discipline',
    Icon: Shield,
    label: 'Forge Discipline',
    color: '#00d4ff',
    fact: '85% streak retention',
    factPrefix: 'By Week 6, hunters maintain',
    withSystem: [3, 10, 25, 40, 55, 70, 82, 90, 96],
    without:    [3, 6,  8,  9,  10, 11, 11, 12, 12],
  },
  {
    key: 'social',
    Icon: Users,
    label: 'Grow Social Skills',
    color: '#facc15',
    fact: '60% more confidence',
    factPrefix: 'By Week 4, hunters gain',
    withSystem: [12, 18, 26, 35, 45, 56, 65, 75, 82],
    without:    [12, 13, 14, 15, 16, 17, 17, 18, 18],
  },
];

const ScreenProgressive = ({ onNext }: { onNext: () => void }) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const stat = STAT_GRAPHS[activeIdx];
  const graphRef = React.useRef<HTMLDivElement>(null);

  // Convert data to SVG path (0-100 → 140-10 Y range, 0-8 → 0-440 X range for wider scrollable area)
  const toY = (v: number) => 140 - (v / 100) * 130;
  const toX = (i: number) => i * 55;
  const totalW = 55 * 8; // 440px wide

  const buildPath = (data: number[]) => {
    return data.map((v, i) => {
      if (i === 0) return `M ${toX(i)},${toY(v)}`;
      const prevX = toX(i - 1);
      const prevY = toY(data[i - 1]);
      const cx = (prevX + toX(i)) / 2;
      return `C ${cx},${prevY} ${cx},${toY(v)} ${toX(i)},${toY(v)}`;
    }).join(' ');
  };

  const buildAreaPath = (data: number[]) => {
    return buildPath(data) + ` L ${toX(data.length - 1)},150 L 0,150 Z`;
  };

  // Checkpoints at specific weeks
  const checkpoints = [0, 2, 4, 6, 8];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex flex-col bg-black">
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(0,212,255,0.05) 0%, transparent 60%)' }} />
      <div className="relative z-10 flex-1 flex flex-col px-6 overflow-y-auto" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 48px)', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 56px)' }}>
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
          <div className="text-white text-xs font-bold tracking-[0.35em] uppercase mb-4" style={{ fontFamily: "'Orbitron', 'Rajdhani', 'Share Tech Mono', monospace" }}>⚔️ REFORGE SYSTEM</div>
          <h1 className="text-[22px] font-black text-white leading-snug px-2">
            Each week, your quests get <span className="text-[#00d4ff]">progressively harder</span> to forge your discipline.
          </h1>
        </motion.div>

        {/* Interactive stat icons */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex justify-center gap-2 mb-6">
          {STAT_GRAPHS.map((s, i) => (
            <motion.button
              key={s.key}
              whileTap={{ scale: 0.9 }}
              onClick={() => { triggerHaptic('BUTTON_TAP'); setActiveIdx(i); }}
              className={`p-2.5 rounded-xl border transition-all duration-300 ${i === activeIdx
                ? 'border-opacity-100 bg-opacity-10'
                : 'border-gray-800 bg-transparent'}`}
              style={i === activeIdx ? {
                borderColor: s.color,
                backgroundColor: `${s.color}15`,
              } : undefined}
            >
              <s.Icon size={18} className="transition-colors duration-300" style={{ color: i === activeIdx ? s.color : '#4b5563' }} />
            </motion.button>
          ))}
        </motion.div>

        {/* Graph card */}
        <motion.div
          key={stat.key}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-[#0a0a0a] border border-gray-800 rounded-2xl p-5 mb-4"
        >
          <h3 className="font-bold text-[15px] mb-4 flex items-center gap-2" style={{ color: stat.color }}>
            <stat.Icon size={16} />
            {stat.label}
          </h3>

          {/* Touch-scrollable graph container */}
          <div
            ref={graphRef}
            className="overflow-x-auto overflow-y-hidden -mx-2 px-2"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <svg viewBox={`0 0 ${totalW} 155`} style={{ width: totalW, height: 150, minWidth: totalW }} className="block">
              <defs>
                <linearGradient id={`grad_${stat.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={stat.color} stopOpacity="0.25" />
                  <stop offset="100%" stopColor={stat.color} stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Grid lines */}
              {[30, 60, 90, 120].map(y => <line key={y} x1="0" y1={y} x2={totalW} y2={y} stroke="rgba(255,255,255,0.04)" />)}

              {/* Week labels */}
              {stat.withSystem.map((_, i) => (
                <text key={i} x={toX(i)} y={152} textAnchor="middle" fill="#4b5563" fontSize="9" fontFamily="monospace">
                  W{i}
                </text>
              ))}

              {/* "Without" line — dashed gray */}
              <motion.path
                d={buildPath(stat.without)}
                fill="none"
                stroke="#4b5563"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.2, delay: 0.3 }}
              />

              {/* Area fill */}
              <motion.path
                d={buildAreaPath(stat.withSystem)}
                fill={`url(#grad_${stat.key})`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.8 }}
              />

              {/* Main "With System" line */}
              <motion.path
                d={buildPath(stat.withSystem)}
                fill="none"
                stroke={stat.color}
                strokeWidth="2.5"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.5, delay: 0.3 }}
              />

              {/* Checkpoint dots with pulse */}
              {checkpoints.map((wi) => {
                const cx = toX(wi);
                const cy = toY(stat.withSystem[wi]);
                return (
                  <g key={wi}>
                    {/* Pulse ring */}
                    <motion.circle
                      cx={cx} cy={cy} r="8"
                      fill="none"
                      stroke={stat.color}
                      strokeWidth="1"
                      opacity="0.4"
                      initial={{ r: 4, opacity: 0 }}
                      animate={{ r: [4, 10, 4], opacity: [0, 0.4, 0] }}
                      transition={{ duration: 2, delay: 0.5 + wi * 0.15, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    {/* Vibrating dot */}
                    <motion.circle
                      cx={cx} cy={cy} r="4"
                      fill={stat.color}
                      stroke="black"
                      strokeWidth="1.5"
                      initial={{ scale: 0 }}
                      animate={{
                        scale: 1,
                        x: [0, -0.5, 0.5, -0.3, 0.3, 0],
                        y: [0, 0.3, -0.3, 0.2, -0.2, 0],
                      }}
                      transition={{
                        scale: { delay: 0.4 + wi * 0.15, duration: 0.3 },
                        x: { delay: 1 + wi * 0.2, duration: 0.4, repeat: Infinity, repeatDelay: 3 },
                        y: { delay: 1 + wi * 0.2, duration: 0.4, repeat: Infinity, repeatDelay: 3 },
                      }}
                    />
                    {/* Value label */}
                    <motion.text
                      x={cx} y={cy - 10}
                      textAnchor="middle"
                      fill={stat.color}
                      fontSize="8"
                      fontWeight="bold"
                      fontFamily="monospace"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.8 + wi * 0.15 }}
                    >
                      {stat.withSystem[wi]}%
                    </motion.text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Legend */}
          <div className="flex justify-center gap-6 mt-3 text-[12px]">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-[3px] rounded-full" style={{ backgroundColor: stat.color }} />
              <span className="text-gray-400">With System</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-[3px] rounded-full bg-gray-600" />
              <span className="text-gray-500">Without</span>
            </div>
          </div>
        </motion.div>

        {/* Dynamic fact */}
        <motion.p
          key={stat.key + '_fact'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-center text-[13px] text-gray-400 mb-6"
        >
          <span style={{ color: stat.color }}>★</span> {stat.factPrefix} <span className="font-semibold" style={{ color: stat.color }}>{stat.fact}</span> in their routines.
        </motion.p>
        <div className="mt-auto">
          <CTAButton text="Continue" onClick={onNext} />
        </div>
      </div>
    </motion.div>
  );
};

/* ═══════════════════════════════════════════════════════ */
/* SCREEN A5 — "Your Current Level" (Interactive)        */
/* ═══════════════════════════════════════════════════════ */
const statRows = [
  { label: 'Strength', Icon: Dumbbell, color: '#f87171', potential: 78 },
  { label: 'Intelligence', Icon: Brain, color: '#60a5fa', potential: 85 },
  { label: 'Discipline', Icon: Shield, color: '#33dfff', potential: 92 },
  { label: 'Social', Icon: Users, color: '#facc15', potential: 68 },
  { label: 'Focus', Icon: Eye, color: '#34d399', potential: 74 },
  { label: 'Willpower', Icon: Sparkles, color: '#fb923c', potential: 88 },
];

/* Animated counter hook */
const AnimatedNumber = ({ value, delay = 0, color }: { value: number; delay?: number; color: string }) => {
  const [display, setDisplay] = React.useState(0);
  React.useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    const timer = setTimeout(() => {
      let frame = 0;
      const totalFrames = 40;
      const interval = setInterval(() => {
        frame++;
        const progress = frame / totalFrames;
        const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
        setDisplay(Math.round(eased * value));
        if (frame >= totalFrames) clearInterval(interval);
      }, 25);
    }, delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return <span className="text-[15px] font-black font-mono tabular-nums" style={{ color }}>{display}</span>;
};

const ScreenCurrentLevel = ({ onNext }: { onNext: () => void }) => {
  const [showPotential, setShowPotential] = useState(false);

  const handleReveal = () => {
    triggerHaptic('BUTTON_TAP');
    setShowPotential(true);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex flex-col bg-black">
      <div className="absolute right-0 top-0 bottom-0 w-[45%] overflow-hidden pointer-events-none">
        <img src="/onboarding/shadow_warrior.webp" alt="" className="h-full w-full object-cover object-left" style={{ opacity: 0.3, maskImage: 'linear-gradient(to right, transparent 0%, black 30%)', WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 30%)' }} />
      </div>
      <div className="relative z-10 flex-1 flex flex-col px-6 overflow-y-auto" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 48px)', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}>
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-white text-xs font-bold tracking-[0.35em] uppercase mb-3" style={{ fontFamily: "'Orbitron', 'Rajdhani', 'Share Tech Mono', monospace" }}>⚔️ REFORGE SYSTEM</div>
          <h1 className="text-[28px] font-black text-white leading-tight mb-1">
            {showPotential ? <>Your Potential<br/>Rating 🔥</> : <>Your Current<br/>Rating ⚔️</>}
          </h1>
        </motion.div>

        {/* Level + XP block */}
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="flex items-center gap-4 my-5">
          <motion.div
            className="rounded-2xl px-6 py-4 text-center"
            animate={{
              backgroundColor: showPotential ? '#00d4ff' : '#ffffff',
              boxShadow: showPotential ? '0 0 30px rgba(0,212,255,0.4)' : '0 0 20px rgba(255,255,255,0.2)',
            }}
            transition={{ duration: 0.6 }}
          >
            <motion.div
              className="text-[48px] font-black leading-none"
              style={{ color: showPotential ? '#000' : '#000' }}
            >
              {showPotential ? '50' : '1'}
            </motion.div>
            <div className="text-black/60 text-[11px] font-bold tracking-widest uppercase">Level</div>
          </motion.div>
          <div>
            <motion.div
              className="w-10 h-10 rounded-full border-2 flex items-center justify-center mb-1"
              animate={{
                borderColor: showPotential ? '#00d4ff' : '#374151',
                backgroundColor: showPotential ? 'rgba(0,212,255,0.1)' : 'transparent',
              }}
              transition={{ duration: 0.4 }}
            >
              <span className="text-[10px] font-bold" style={{ color: showPotential ? '#00d4ff' : '#4b5563' }}>
                {showPotential ? '50K' : '0'}
              </span>
            </motion.div>
            <div className="text-gray-500 text-[12px]">XP earned</div>
          </div>
        </motion.div>

        {/* XP bar */}
        <div className="w-full h-2 bg-gray-800 rounded-full mb-1 overflow-hidden">
          <motion.div
            initial={{ width: '3%' }}
            animate={{ width: showPotential ? '85%' : '3%' }}
            transition={{ duration: 1.2, ease: 'easeOut', delay: showPotential ? 0.2 : 0 }}
            className="h-full rounded-full"
            style={{
              background: showPotential
                ? 'linear-gradient(90deg, #00d4ff, #33dfff, #00d4ff)'
                : '#00d4ff',
              boxShadow: showPotential ? '0 0 12px rgba(0,212,255,0.6)' : '0 0 8px rgba(0,212,255,0.3)',
            }}
          />
        </div>
        <p className="text-gray-600 text-[11px] font-mono mb-6">
          {showPotential ? 'Rank A • Top 5% of hunters' : '125 XP to Lvl 2'}
        </p>

        {/* Stat rows with bars */}
        <div className="space-y-3 mb-6">
          {statRows.map(({ label, Icon, color, potential }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.08 }}
              className="flex items-center gap-3"
            >
              <Icon size={18} style={{ color }} />
              <span className="text-white font-bold text-[14px] w-[90px]">{label}</span>
              {/* Progress bar */}
              <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: color }}
                  initial={{ width: '2%' }}
                  animate={{ width: showPotential ? `${potential}%` : '2%' }}
                  transition={{ duration: 0.8, delay: showPotential ? 0.3 + i * 0.12 : 0, ease: 'easeOut' }}
                />
              </div>
              {/* Value */}
              <div className="w-10 text-right">
                {showPotential ? (
                  <AnimatedNumber value={potential} delay={300 + i * 120} color={color} />
                ) : (
                  <span className="text-gray-600 text-[14px] font-mono">—</span>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Potential reveal footer */}
        {showPotential && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
            className="bg-[#0a0a0a] border border-[#00d4ff]/20 rounded-2xl p-4 mb-6 text-center"
          >
            <p className="text-gray-400 text-[13px] leading-relaxed">
              This is where the System can take you in <span className="text-[#00d4ff] font-bold">90 days</span>. Every quest, every streak, every rep brings you closer.
            </p>
          </motion.div>
        )}

        {/* CTA */}
        <div className="mt-auto">
          {showPotential ? (
            <CTAButton text="Let's build this" onClick={onNext} variant="white" />
          ) : (
            <CTAButton text="⚡ See potential rating" onClick={handleReveal} />
          )}
        </div>
      </div>
    </motion.div>
  );
};

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
    <div className="relative z-10 flex-1 flex flex-col justify-end px-6 pb-14" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 56px)' }}>
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
        <div className="text-white text-xs font-bold tracking-[0.35em] uppercase mb-3" style={{ fontFamily: "'Orbitron', 'Rajdhani', 'Share Tech Mono', monospace" }}>⚔️ REFORGE SYSTEM</div>
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
      {/* Dots are inside the scroll flow of each screen via paddingBottom space */}
      {/* This overlay layer just renders the dots but allows touch-through */}
      <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <Dots total={SCREENS.length} current={screen} />
      </div>
    </div>
  );
};

export default OnboardingHook;
