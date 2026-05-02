import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Map, Play, Star, ChevronRight } from 'lucide-react';
import { playSystemSoundEffect } from '../utils/soundEngine';

interface WorkoutOnboardingProps {
  currentStep: number;
  onStepComplete: (step: number) => void;
  onComplete: () => void;
}

interface WStepConfig {
  targetId: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  position: 'bottom' | 'top';
  autoAdvanceMs?: number;
}

const W_STEPS: WStepConfig[] = [
  {
    targetId: 'tut-nav-health',
    icon: <Activity size={18} />,
    title: 'Your Health Hub',
    subtitle: 'Tap Health to see your workout system.',
    position: 'top',
  },
  {
    targetId: 'tut-health',
    icon: <Map size={18} />,
    title: 'Workout Map',
    subtitle: 'This is your weekly training map. Each node is a workout day.',
    position: 'top',
    autoAdvanceMs: 4000,
  },
  {
    targetId: 'tut-health',
    icon: <Play size={18} />,
    title: 'Start a Workout',
    subtitle: 'Tap any workout day to preview exercises, then hit Start.',
    position: 'top',
    autoAdvanceMs: 4000,
  },
  {
    targetId: 'tut-health',
    icon: <Star size={18} />,
    title: 'Earn Rewards',
    subtitle: 'Complete workouts to earn XP, gold, and keys. Build your streak for bonuses!',
    position: 'top',
    autoAdvanceMs: 4000,
  },
];

const WorkoutOnboardingTutorial: React.FC<WorkoutOnboardingProps> = ({ currentStep, onStepComplete, onComplete }) => {
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const rafRef = useRef<number>(0);

  const stepIndex = currentStep - 1;
  const step = W_STEPS[stepIndex];

  const updateTargetPosition = useCallback(() => {
    if (!step) return;
    const el = document.getElementById(step.targetId);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTooltipPos({ x: rect.left, y: rect.top, w: rect.width, h: rect.height });
    }
    rafRef.current = requestAnimationFrame(updateTargetPosition);
  }, [step]);

  useEffect(() => {
    if (!step) return;
    rafRef.current = requestAnimationFrame(updateTargetPosition);
    return () => cancelAnimationFrame(rafRef.current);
  }, [step, updateTargetPosition]);

  useEffect(() => {
    if (currentStep > 0) {
      try { playSystemSoundEffect('NOTIFICATION'); } catch {}
    }
  }, [currentStep]);

  // Auto-advance steps with autoAdvanceMs
  useEffect(() => {
    if (!step || !step.autoAdvanceMs) return;
    const timer = setTimeout(() => {
      if (stepIndex >= W_STEPS.length - 1) {
        onComplete();
      } else {
        onStepComplete(currentStep);
      }
    }, step.autoAdvanceMs);
    return () => clearTimeout(timer);
  }, [currentStep, step, stepIndex, onStepComplete, onComplete]);

  if (!step || currentStep < 1 || currentStep > W_STEPS.length) return null;

  const padding = 12; // Larger padding for mobile tapping
  const spotlightRect = tooltipPos
    ? { x: tooltipPos.x - padding, y: tooltipPos.y - padding, w: tooltipPos.w + padding * 2, h: tooltipPos.h + padding * 2 }
    : { x: window.innerWidth / 2 - 50, y: window.innerHeight / 2 - 50, w: 100, h: 100 };

  return (
    <AnimatePresence>
      <motion.div
        key="workout-onboarding"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[900] pointer-events-none"
      >
        {/* Dark overlay with spotlight - pointer-events-none on SVG */}
        {spotlightRect && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
            <defs>
              <mask id="w-spotlight-mask">
                <rect width="100%" height="100%" fill="white" />
                <rect
                  x={spotlightRect.x}
                  y={spotlightRect.y}
                  width={spotlightRect.w}
                  height={spotlightRect.h}
                  rx={12}
                  fill="black"
                />
              </mask>
            </defs>
            <rect width="100%" height="100%" fill="rgba(0,0,0,0.78)" mask="url(#w-spotlight-mask)" />
          </svg>
        )}

        {/* Click-blocking layer outside spotlight area */}
        {spotlightRect && (
          <div
            className="absolute pointer-events-auto"
            style={{
              left: 0,
              top: 0,
              width: '100%',
              height: '100%',
              zIndex: 1,
              clipPath: `polygon(
                0% 0%, 100% 0%, 100% 100%, 0% 100%,
                0% ${spotlightRect.y}px,
                ${spotlightRect.x}px ${spotlightRect.y}px,
                ${spotlightRect.x}px ${spotlightRect.y + spotlightRect.h}px,
                ${spotlightRect.x + spotlightRect.w}px ${spotlightRect.y + spotlightRect.h}px,
                ${spotlightRect.x + spotlightRect.w}px ${spotlightRect.y}px,
                0% ${spotlightRect.y}px,
                0% 0%
              )`,
            }}
          />
        )}

        {/* Neon border */}
        {spotlightRect && (
          <motion.div
            className="absolute pointer-events-none"
            style={{
              left: spotlightRect.x, top: spotlightRect.y,
              width: spotlightRect.w, height: spotlightRect.h,
              borderRadius: 12, zIndex: 2,
            }}
            animate={{
              boxShadow: [
                '0 0 6px rgba(34,211,238,0.4), inset 0 0 6px rgba(34,211,238,0.1)',
                '0 0 18px rgba(34,211,238,0.8), inset 0 0 10px rgba(34,211,238,0.2)',
                '0 0 6px rgba(34,211,238,0.4), inset 0 0 6px rgba(34,211,238,0.1)',
              ],
            }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <div className="w-full h-full rounded-xl" style={{ border: '2px solid rgba(34,211,238,0.5)' }} />
          </motion.div>
        )}


        {/* Tooltip */}
        {spotlightRect && (
          <motion.div
            key={`w-tooltip-${currentStep}`}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="absolute pointer-events-auto"
            style={{
              left: Math.max(16, Math.min(spotlightRect.x, window.innerWidth - 270)),
              top: step.position === 'bottom' ? spotlightRect.y - 110 : spotlightRect.y + spotlightRect.h + 16,
              width: 250,
              zIndex: 10,
            }}
          >
            <div
              className="rounded-2xl p-4 relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(12,12,30,0.97) 0%, rgba(6,6,20,0.98) 100%)',
                border: '1px solid rgba(34,211,238,0.25)',
                boxShadow: '0 0 24px rgba(34,211,238,0.12), 0 8px 32px rgba(0,0,0,0.5)',
                backdropFilter: 'blur(20px)',
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(34,211,238,0.15)', color: '#00d4ff' }}>
                  {step.icon}
                </div>
                <div className="text-[9px] font-mono text-gray-600 tracking-[0.2em] uppercase">
                  Step {currentStep} of {W_STEPS.length}
                </div>
                <div className="flex gap-1 ml-auto">
                  {W_STEPS.map((_, i) => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: i < currentStep ? '#00d4ff' : 'rgba(100,100,140,0.3)', boxShadow: i === stepIndex ? '0 0 6px rgba(34,211,238,0.6)' : 'none' }} />
                  ))}
                </div>
              </div>

              <h3 className="text-sm font-black text-white tracking-wide mb-1">{step.title}</h3>
              <p className="text-[11px] text-gray-400 leading-relaxed">{step.subtitle}</p>

              <button
                onClick={() => {
                  if (stepIndex >= W_STEPS.length - 1) onComplete();
                  else onStepComplete(currentStep);
                }}
                className="mt-3 flex items-center gap-1 text-[10px] font-bold tracking-wider text-[#00d4ff] hover:text-[#33dfff] transition-colors"
              >
                {stepIndex >= W_STEPS.length - 1 ? 'FINISH' : 'NEXT'} <ChevronRight size={12} />
              </button>

              <motion.div
                className="absolute bottom-0 left-0 right-0 h-px"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(34,211,238,0.5), transparent)' }}
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              />
            </div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default WorkoutOnboardingTutorial;
