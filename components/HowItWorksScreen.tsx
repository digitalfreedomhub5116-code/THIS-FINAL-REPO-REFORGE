import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, BookOpen, Link2, ChevronRight, Sparkles } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// Typewriter with per-word vibration
// ═══════════════════════════════════════════════════════════════
const TypewriterQuestion: React.FC<{ text: string; onComplete?: () => void }> = ({ text, onComplete }) => {
  const words = text.split(' ');
  const [visibleCount, setVisibleCount] = useState(0);
  const completed = useRef(false);

  useEffect(() => {
    if (visibleCount >= words.length) {
      if (!completed.current) { completed.current = true; onComplete?.(); }
      return;
    }
    const timeout = setTimeout(() => setVisibleCount(prev => prev + 1), 120);
    return () => clearTimeout(timeout);
  }, [visibleCount, words.length, onComplete]);

  return (
    <p className="text-[18px] sm:text-[22px] font-black leading-snug tracking-tight text-center">
      {words.map((word, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, x: -4, filter: 'blur(4px)' }}
          animate={i < visibleCount ? {
            opacity: 1,
            x: [0, -1.5, 1.5, -1, 0.5, 0],
            filter: 'blur(0px)',
          } : {}}
          transition={{
            opacity: { duration: 0.15 },
            x: { duration: 0.25, ease: 'easeOut' },
            filter: { duration: 0.2 },
          }}
          className="inline-block mr-[5px]"
          style={{ color: i < visibleCount ? '#ffffff' : 'transparent' }}
        >
          {word}
        </motion.span>
      ))}
      <motion.span
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.6, repeat: Infinity }}
        className="inline-block w-[2px] h-[18px] ml-1 align-middle"
        style={{ background: '#00d4ff', display: visibleCount >= words.length ? 'none' : 'inline-block' }}
      />
    </p>
  );
};

// ═══════════════════════════════════════════════════════════════
// Step 1 Mockup — Goal Input Box
// ═══════════════════════════════════════════════════════════════
const Step1Mockup: React.FC = () => {
  const [typedText, setTypedText] = useState('');
  const fullText = 'Crack my dream exam...';
  const indexRef = useRef(0);

  useEffect(() => {
    indexRef.current = 0;
    setTypedText('');
    const interval = setInterval(() => {
      if (indexRef.current < fullText.length) {
        indexRef.current++;
        setTypedText(fullText.slice(0, indexRef.current));
      } else {
        clearInterval(interval);
      }
    }, 80);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full rounded-xl overflow-hidden" style={{ background: '#08080f', border: '1px solid rgba(255,255,255,0.06)' }}>
      {/* Top bar */}
      <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="w-2 h-2 rounded-full" style={{ background: '#00d4ff' }} />
        <span className="text-[9px] font-mono font-bold tracking-[0.15em] uppercase text-gray-500">New Goal</span>
      </div>
      {/* Input area */}
      <div className="px-4 py-5">
        <div className="text-[8px] font-mono text-gray-600 uppercase tracking-wider mb-2">What's your long-term goal?</div>
        <div className="flex items-center gap-2 px-3 py-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(0,212,255,0.12)' }}>
          <span className="text-[13px] text-white/90 font-medium">{typedText}</span>
          <motion.span
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.5, repeat: Infinity }}
            className="w-[2px] h-4"
            style={{ background: '#00d4ff' }}
          />
        </div>
        {/* Example chips */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {['Lose 30kg', 'Learn Guitar', 'Build a Startup'].map(ex => (
            <span key={ex} className="px-2.5 py-1 rounded-md text-[8px] font-mono text-gray-500"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
              {ex}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// Step 2 Mockup — Questionnaire
// ═══════════════════════════════════════════════════════════════
const Step2Mockup: React.FC = () => (
  <div className="w-full rounded-xl overflow-hidden" style={{ background: '#08080f', border: '1px solid rgba(255,255,255,0.06)' }}>
    <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <div className="w-2 h-2 rounded-full" style={{ background: '#3b82f6' }} />
      <span className="text-[9px] font-mono font-bold tracking-[0.15em] uppercase text-gray-500">Goal Setup</span>
      <span className="text-[8px] font-mono text-[#00d4ff]/50 ml-auto">2 of 4</span>
    </div>
    <div className="px-4 py-4 space-y-3">
      {/* Q1 */}
      <div>
        <div className="text-[9px] font-mono text-gray-500 mb-1.5">How many hours can you commit daily?</div>
        <div className="flex gap-2">
          {['1 hr', '2 hrs', '3 hrs'].map((opt, i) => (
            <div key={opt} className="flex-1 text-center py-2 rounded-lg text-[10px] font-bold"
              style={i === 1 ? { background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.25)', color: '#00d4ff' }
                : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#6b7280' }}>
              {opt}
            </div>
          ))}
        </div>
      </div>
      {/* Q2 */}
      <div>
        <div className="text-[9px] font-mono text-gray-500 mb-1.5">Current preparation level?</div>
        <div className="flex gap-2">
          {['Beginner', 'Intermediate'].map((opt, i) => (
            <div key={opt} className="flex-1 text-center py-2 rounded-lg text-[10px] font-bold"
              style={i === 0 ? { background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.25)', color: '#00d4ff' }
                : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#6b7280' }}>
              {opt}
            </div>
          ))}
        </div>
      </div>
      {/* Q3 */}
      <div>
        <div className="text-[9px] font-mono text-gray-500 mb-1.5">Target deadline?</div>
        <div className="px-3 py-2 rounded-lg text-[10px] text-white/60 font-mono"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          6 months from now
        </div>
      </div>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════
// Step 3 Mockup — Quests + Resources
// ═══════════════════════════════════════════════════════════════
const Step3Mockup: React.FC = () => (
  <div className="w-full rounded-xl overflow-hidden" style={{ background: '#08080f', border: '1px solid rgba(255,255,255,0.06)' }}>
    <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <div className="w-2 h-2 rounded-full" style={{ background: '#00d4ff' }} />
      <span className="text-[9px] font-mono font-bold tracking-[0.15em] uppercase text-gray-500">Today's Quests</span>
      <span className="text-[8px] font-mono text-gray-600 ml-auto">Day 12</span>
    </div>
    <div className="px-4 py-3 space-y-2.5">
      {/* Quest 1 */}
      <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-5 h-5 rounded flex items-center justify-center text-[8px] font-black"
            style={{ background: 'rgba(0,212,255,0.15)', color: '#00d4ff' }}>1</div>
          <span className="text-[11px] font-bold text-white/90">Solve 20 MCQs — Organic Chemistry</span>
        </div>
        <div className="flex items-center gap-3 ml-7">
          <div className="flex items-center gap-1">
            <Play size={8} style={{ color: '#ef4444' }} />
            <span className="text-[8px] font-mono text-gray-500">YT: Reaction Mechanisms</span>
          </div>
          <div className="flex items-center gap-1">
            <BookOpen size={8} style={{ color: '#3b82f6' }} />
            <span className="text-[8px] font-mono text-gray-500">Blog: Quick Revision</span>
          </div>
        </div>
      </div>
      {/* Quest 2 */}
      <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-5 h-5 rounded flex items-center justify-center text-[8px] font-black"
            style={{ background: 'rgba(0,212,255,0.15)', color: '#00d4ff' }}>2</div>
          <span className="text-[11px] font-bold text-white/90">Read Chapter 14 — Thermodynamics</span>
        </div>
        <div className="flex items-center gap-3 ml-7">
          <div className="flex items-center gap-1">
            <Play size={8} style={{ color: '#ef4444' }} />
            <span className="text-[8px] font-mono text-gray-500">YT: Entropy Explained</span>
          </div>
          <div className="flex items-center gap-1">
            <Link2 size={8} style={{ color: '#a78bfa' }} />
            <span className="text-[8px] font-mono text-gray-500">Notes PDF</span>
          </div>
        </div>
      </div>
      {/* Quest 3 — partial */}
      <div className="rounded-lg p-3 opacity-50" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded flex items-center justify-center text-[8px] font-black"
            style={{ background: 'rgba(0,212,255,0.15)', color: '#00d4ff' }}>3</div>
          <span className="text-[11px] font-bold text-white/90">Practice Mock Test — 45 min</span>
        </div>
      </div>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════
// Step Card wrapper with fade-in
// ═══════════════════════════════════════════════════════════════
const StepCard: React.FC<{
  stepNum: number;
  title: string;
  description: string;
  delay: number;
  visible: boolean;
  children: React.ReactNode;
}> = ({ stepNum, title, description, delay, visible, children }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    animate={visible ? { opacity: 1, y: 0 } : {}}
    transition={{ duration: 0.6, delay, ease: 'easeOut' }}
    className="w-full"
  >
    {/* Step label */}
    <div className="flex items-center gap-2.5 mb-3">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black font-mono"
        style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)', color: '#00d4ff' }}>
        {stepNum}
      </div>
      <div>
        <div className="text-[13px] font-bold text-white leading-tight">{title}</div>
        <div className="text-[10px] text-gray-500 font-mono leading-snug mt-0.5">{description}</div>
      </div>
    </div>
    {/* Mockup */}
    <div className="ml-0">
      {children}
    </div>
  </motion.div>
);

// ═══════════════════════════════════════════════════════════════
// Main Export — HowItWorksScreen
// ═══════════════════════════════════════════════════════════════
interface HowItWorksScreenProps {
  onClose: () => void;
  onClaimTrial?: () => void;
}

const HowItWorksScreen: React.FC<HowItWorksScreenProps> = ({ onClose, onClaimTrial }) => {
  const [questionDone, setQuestionDone] = useState(false);
  const [stepsVisible, setStepsVisible] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleQuestionComplete = useCallback(() => {
    setQuestionDone(true);
    setTimeout(() => setStepsVisible(true), 400);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[10000] flex flex-col"
      style={{ background: '#050509' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles size={14} style={{ color: '#00d4ff' }} />
          <span className="text-[9px] font-mono font-bold tracking-[0.2em] uppercase text-gray-500">
            How It Works
          </span>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
          style={{ background: 'rgba(255,255,255,0.05)' }}
        >
          <X size={14} className="text-gray-500" />
        </button>
      </div>

      {/* Scrollable content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 pb-8" style={{ WebkitOverflowScrolling: 'touch' }}>

        {/* ── Question Section ── */}
        <div className="pt-8 pb-10 flex flex-col items-center">
          {/* Subtle glow behind question */}
          <div className="relative">
            <div className="absolute inset-0 -m-10 rounded-full opacity-20 blur-3xl"
              style={{ background: 'radial-gradient(circle, rgba(0,212,255,0.3) 0%, transparent 70%)' }} />
            <TypewriterQuestion
              text="What if every goal you set came with a daily quest to actually achieve it?"
              onComplete={handleQuestionComplete}
            />
          </div>

          {/* Subtle divider after question */}
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={questionDone ? { opacity: 1, scaleX: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="w-16 h-[1px] mt-8"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(0,212,255,0.3), transparent)' }}
          />
        </div>

        {/* ── Steps ── */}
        <div className="space-y-8">
          <StepCard
            stepNum={1}
            title="Type your long-term goal"
            description="Like crack your dream exam, or lose 30kg weight"
            delay={0}
            visible={stepsVisible}
          >
            <Step1Mockup />
          </StepCard>

          <StepCard
            stepNum={2}
            title="Answer a few quick questions"
            description="We tailor the plan to your schedule, level, and deadline"
            delay={0.3}
            visible={stepsVisible}
          >
            <Step2Mockup />
          </StepCard>

          <StepCard
            stepNum={3}
            title="Get daily quests with resources"
            description="Realistically planned quests with YT videos, blogs, and study material"
            delay={0.6}
            visible={stepsVisible}
          >
            <Step3Mockup />
          </StepCard>
        </div>

        {/* ── CTA Section ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={stepsVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 1.2 }}
          className="mt-10 mb-4"
        >
          {/* Claim trial */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => onClaimTrial?.()}
            className="w-full py-4 rounded-xl font-bold text-[14px] tracking-wide flex items-center justify-center gap-2.5 transition-all"
            style={{
              background: 'linear-gradient(135deg, #00d4ff 0%, #0ea5e9 50%, #3b82f6 100%)',
              color: '#000',
              boxShadow: '0 4px 24px rgba(0,212,255,0.25), 0 0 0 1px rgba(0,212,255,0.15)',
            }}
          >
            <Sparkles size={16} />
            Claim 14 Days Free Trial
          </motion.button>

          {/* Skip */}
          <button
            onClick={onClose}
            className="w-full py-3 mt-3 rounded-xl text-[11px] font-mono font-medium tracking-wide transition-all"
            style={{ color: '#6b7280' }}
          >
            I will subscribe later
          </button>
        </motion.div>

      </div>
    </motion.div>
  );
};

export default HowItWorksScreen;
