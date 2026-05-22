import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Maximize2 } from 'lucide-react';

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
    const timeout = setTimeout(() => {
      setVisibleCount(prev => prev + 1);
      // Trigger a light haptic tap on each word render (guarded)
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(12);
      }
    }, 120);
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
// Clean Premium Mockup — no scan lines, no HUD overlays
// ═══════════════════════════════════════════════════════════════
interface PremiumMockupProps {
  src: string;
  alt: string;
  stepNum: number;
  onExpand: (src: string, alt: string, stepNum: number) => void;
}

const PremiumMockup: React.FC<PremiumMockupProps> = ({ src, alt, stepNum, onExpand }) => {
  const [loaded, setLoaded] = useState(false);
  
  return (
    <div 
      onClick={() => onExpand(src, alt, stepNum)}
      className="w-full rounded-xl overflow-hidden shadow-2xl relative group cursor-pointer" 
      style={{ 
        background: '#0a0a12',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
      }}
    >
      {/* Subtle glow highlight on hover */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at center, #00d4ff 0%, transparent 70%)'
        }}
      />

      {/* Shimmer/Skeleton loader */}
      {!loaded && (
        <div
          className="absolute inset-0 z-0"
          style={{
            background: 'linear-gradient(110deg, #0a0a12 30%, rgba(255, 255, 255, 0.04) 50%, #0a0a12 70%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer-effect 1.5s ease-in-out infinite',
          }}
        />
      )}

      {/* The actual image */}
      <img 
        src={src} 
        alt={alt} 
        onLoad={() => setLoaded(true)}
        className={`w-full h-auto block transition-all duration-700 ease-out ${
          loaded ? 'opacity-100 scale-100' : 'opacity-0 scale-[0.98]'
        } group-hover:scale-[1.02]`}
      />

      {/* Tap-to-expand hint on hover */}
      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center pointer-events-none">
        <div 
          className="px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-[9px] font-mono font-bold tracking-wider uppercase"
          style={{ 
            background: 'rgba(0, 0, 0, 0.7)', 
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#ffffff',
          }}
        >
          <Maximize2 size={10} />
          Tap to expand
        </div>
      </div>

      {/* CSS Keyframes */}
      <style>{`
        @keyframes shimmer-effect {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// Clean Lightbox Modal
// ═══════════════════════════════════════════════════════════════
interface LightboxProps {
  src: string;
  alt: string;
  stepNum: number;
  onClose: () => void;
}

const Lightbox: React.FC<LightboxProps> = ({ src, alt, stepNum, onClose }) => {
  const details = [
    "Enter any target goal — career, fitness, finance, skill, or exam. The system instantly structures a personalised roadmap for you.",
    "Adaptive questions analyse your availability, experience level, and deadlines to model the optimal path forward.",
    "Receive daily quests with curated resources — YouTube videos, articles, and interactive tools — embedded for each mission."
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100000] flex flex-col items-center justify-center p-4 bg-black/95 backdrop-blur-md"
      onClick={onClose}
    >
      <div className="relative w-full max-w-sm sm:max-w-md flex flex-col gap-4" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded" style={{ background: 'rgba(0,212,255,0.1)', color: '#00d4ff', border: '1px solid rgba(0,212,255,0.2)' }}>
              Step 0{stepNum}
            </span>
          </div>
          <button 
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-white transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Image */}
        <div 
          className="w-full rounded-2xl overflow-hidden relative"
          style={{ 
            background: '#0a0a12',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 0 40px rgba(0, 0, 0, 0.5)'
          }}
        >
          <img 
            src={src} 
            alt={alt} 
            className="w-full h-auto block"
          />
        </div>

        {/* Description */}
        <div 
          className="rounded-xl p-3.5 text-[11px] sm:text-[12px] leading-relaxed"
          style={{ 
            background: 'rgba(255, 255, 255, 0.03)', 
            border: '1px solid rgba(255, 255, 255, 0.06)',
            color: '#9ca3af'
          }}
        >
          <p>{details[stepNum - 1]}</p>
        </div>
      </div>
    </motion.div>
  );
};

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
  const [activeLightbox, setActiveLightbox] = useState<{
    src: string;
    alt: string;
    stepNum: number;
  } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleQuestionComplete = useCallback(() => {
    setQuestionDone(true);
    setTimeout(() => setStepsVisible(true), 400);
  }, []);

  const handleExpand = useCallback((src: string, alt: string, stepNum: number) => {
    setActiveLightbox({ src, alt, stepNum });
  }, []);

  const content = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[100000] flex flex-col"
      style={{ background: '#050509' }}
    >
      {/* Minimal header — label only, no close button */}
      <div className="flex items-center px-5 pt-3 pb-1 flex-shrink-0"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
      >
        <div className="flex items-center gap-2">
          <Sparkles size={14} style={{ color: '#00d4ff' }} />
          <span className="text-[9px] font-mono font-bold tracking-[0.2em] uppercase text-gray-500">
            How It Works
          </span>
        </div>
      </div>

      {/* Scrollable content — flush to edges, no bottom gap */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 pb-4" style={{ WebkitOverflowScrolling: 'touch' }}>

        {/* ── Question Section ── */}
        <div className="pt-6 pb-8 flex flex-col items-center">
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
            className="w-16 h-[1px] mt-6"
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
            <PremiumMockup 
              src="/assets/step1_goal_input.png" 
              alt="Step 1: Declare your goal" 
              stepNum={1}
              onExpand={handleExpand}
            />
          </StepCard>

          <StepCard
            stepNum={2}
            title="Answer a few quick questions"
            description="We tailor the plan to your schedule, level, and deadline"
            delay={0.3}
            visible={stepsVisible}
          >
            <PremiumMockup 
              src="/assets/step2_questionnaire.png" 
              alt="Step 2: Calibrate parameters" 
              stepNum={2}
              onExpand={handleExpand}
            />
          </StepCard>

          <StepCard
            stepNum={3}
            title="Get daily quests with resources"
            description="Realistically planned quests with YT videos, blogs, and study material"
            delay={0.6}
            visible={stepsVisible}
          >
            <PremiumMockup 
              src="/assets/step3_quests.png" 
              alt="Step 3: Receive planned quests and resources" 
              stepNum={3}
              onExpand={handleExpand}
            />
          </StepCard>
        </div>

        {/* ── CTA Section ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={stepsVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 1.2 }}
          className="mt-10 mb-6"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)' }}
        >
          {/* Claim trial — primary exit */}
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

          {/* Skip — secondary exit (greyed out) */}
          <button
            onClick={onClose}
            className="w-full py-3 mt-2 rounded-xl text-[11px] font-mono font-medium tracking-wide transition-all"
            style={{ color: '#4b5563' }}
          >
            I'll buy later
          </button>
        </motion.div>

      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {activeLightbox && (
          <Lightbox 
            src={activeLightbox.src}
            alt={activeLightbox.alt}
            stepNum={activeLightbox.stepNum}
            onClose={() => setActiveLightbox(null)}
          />
        )}
      </AnimatePresence>

    </motion.div>
  );

  // Safely portal to document.body, fallback to returning the content directly if running in a non-browser environment
  if (typeof document === 'undefined') return content;
  return createPortal(content, document.body);
};

export default HowItWorksScreen;
