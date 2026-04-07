import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Plus, Type, Cpu, Clock, Check, ChevronRight } from 'lucide-react';
import { playSystemSoundEffect } from '../utils/soundEngine';

interface GuidedQuestOnboardingProps {
  currentStep: number;
  onStepComplete: (step: number) => void;
  onComplete: () => void;
}

interface StepConfig {
  targetId: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  position: 'bottom' | 'top';
  waitForAction: boolean;
}

const STEPS: StepConfig[] = [
  {
    targetId: 'nav-quests-btn',
    icon: <Swords size={18} />,
    title: 'Start Here',
    subtitle: 'Open the Quests tab to begin your journey.',
    position: 'top',
    waitForAction: true,
  },
  {
    targetId: 'tut-add-quest',
    icon: <Plus size={18} />,
    title: 'Create a Quest',
    subtitle: 'Tap the + button to register your first mission.',
    position: 'top',
    waitForAction: true,
  },
  {
    targetId: 'tut-quest-title',
    icon: <Type size={18} />,
    title: 'Describe Your Objective',
    subtitle: 'Write what you want to achieve. Be specific.',
    position: 'top',
    waitForAction: false,
  },
  {
    targetId: 'tut-quest-analyze',
    icon: <Cpu size={18} />,
    title: 'Analyze with AI',
    subtitle: 'The System will scan and rank your quest.',
    position: 'top',
    waitForAction: true,
  },
  {
    targetId: 'tut-schedule',
    icon: <Clock size={18} />,
    title: 'Set Your Schedule',
    subtitle: 'Choose when you\'ll complete this quest.',
    position: 'top',
    waitForAction: false,
  },
  {
    targetId: 'tut-confirm-quest',
    icon: <Check size={18} />,
    title: 'Lock It In',
    subtitle: 'Your pledge is ready. Confirm and begin.',
    position: 'top',
    waitForAction: true,
  },
];

const GuidedQuestOnboarding: React.FC<GuidedQuestOnboardingProps> = ({ currentStep, onStepComplete, onComplete }) => {
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [visible, setVisible] = useState(true);
  const rafRef = useRef<number>(0);

  const stepIndex = currentStep - 1;
  const step = STEPS[stepIndex];

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

  // Auto-advance non-action steps after a delay
  useEffect(() => {
    if (!step || step.waitForAction) return;
    const timer = setTimeout(() => {
      onStepComplete(currentStep);
    }, 3000);
    return () => clearTimeout(timer);
  }, [currentStep, step, onStepComplete]);

  if (!step || currentStep < 1 || currentStep > 6) return null;

  const padding = 12; // Larger padding for easier mobile tapping
  const spotlightRect = tooltipPos
    ? {
        x: tooltipPos.x - padding,
        y: tooltipPos.y - padding,
        w: tooltipPos.w + padding * 2,
        h: tooltipPos.h + padding * 2,
      }
    : { x: window.innerWidth / 2 - 50, y: window.innerHeight / 2 - 50, w: 100, h: 100 }; // Default center fallback

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="guided-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[900] pointer-events-none"
        >
          {/* Dark overlay with spotlight cutout */}
          {spotlightRect && (
            <svg className="absolute inset-0 w-full h-full pointer-events-auto" style={{ zIndex: 1 }}>
              <defs>
                <mask id="spotlight-mask">
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
              <rect
                width="100%"
                height="100%"
                fill="rgba(0,0,0,0.82)"
                mask="url(#spotlight-mask)"
              />
            </svg>
          )}

          {/* Pulsing neon border around target */}
          {spotlightRect && (
            <motion.div
              className="absolute pointer-events-none"
              style={{
                left: spotlightRect.x,
                top: spotlightRect.y,
                width: spotlightRect.w,
                height: spotlightRect.h,
                borderRadius: 12,
                zIndex: 2,
              }}
              animate={{
                boxShadow: [
                  '0 0 8px rgba(0,210,255,0.4), inset 0 0 8px rgba(0,210,255,0.1)',
                  '0 0 20px rgba(0,210,255,0.8), inset 0 0 12px rgba(0,210,255,0.2)',
                  '0 0 8px rgba(0,210,255,0.4), inset 0 0 8px rgba(0,210,255,0.1)',
                ],
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <div
                className="w-full h-full rounded-xl"
                style={{ border: '2px solid rgba(0,210,255,0.6)' }}
              />
            </motion.div>
          )}

          {/* Allow clicking through to the target */}
          {spotlightRect && step && (
            <div
              className="absolute pointer-events-auto cursor-pointer"
              style={{
                left: spotlightRect.x,
                top: spotlightRect.y,
                width: spotlightRect.w,
                height: spotlightRect.h,
                zIndex: 5,
                background: 'transparent',
              }}
              onClick={(e) => {
                // Forward click to the actual target element
                const target = document.getElementById(step.targetId);
                if (target) {
                  e.stopPropagation();
                  target.click();
                }
              }}
            />
          )}

          {/* Tooltip card */}
          {spotlightRect && (
            <motion.div
              key={`tooltip-${currentStep}`}
              initial={{ opacity: 0, y: step.position === 'bottom' ? -10 : 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="absolute pointer-events-auto"
              style={{
                left: Math.max(16, Math.min(spotlightRect.x, window.innerWidth - 280)),
                top: step.position === 'bottom'
                  ? spotlightRect.y - 120
                  : spotlightRect.y + spotlightRect.h + 16,
                width: 260,
                zIndex: 10,
              }}
            >
              <div
                className="rounded-2xl p-4 relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, rgba(12,12,30,0.97) 0%, rgba(6,6,20,0.98) 100%)',
                  border: '1px solid rgba(0,210,255,0.25)',
                  boxShadow: '0 0 30px rgba(0,210,255,0.15), 0 8px 32px rgba(0,0,0,0.5)',
                  backdropFilter: 'blur(20px)',
                }}
              >
                {/* Step indicator */}
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: 'rgba(0,210,255,0.15)', color: '#00d4ff' }}
                  >
                    {step.icon}
                  </div>
                  <div className="flex-1">
                    <div className="text-[9px] font-mono text-gray-600 tracking-[0.2em] uppercase">
                      Step {currentStep} of {STEPS.length}
                    </div>
                  </div>
                  {/* Progress dots */}
                  <div className="flex gap-1">
                    {STEPS.map((_, i) => (
                      <div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          background: i < currentStep ? '#00d4ff' : i === stepIndex ? '#00d4ff' : 'rgba(100,100,140,0.3)',
                          boxShadow: i === stepIndex ? '0 0 6px rgba(0,210,255,0.6)' : 'none',
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Title and subtitle */}
                <h3 className="text-sm font-black text-white tracking-wide mb-1">{step.title}</h3>
                <p className="text-[11px] text-gray-400 leading-relaxed">{step.subtitle}</p>

                {/* Skip / Next */}
                {!step.waitForAction && (
                  <button
                    onClick={() => onStepComplete(currentStep)}
                    className="mt-3 flex items-center gap-1 text-[10px] font-bold tracking-wider text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    CONTINUE <ChevronRight size={12} />
                  </button>
                )}

                {currentStep === 1 && (
                  <button
                    onClick={onComplete}
                    className="mt-2 text-[9px] text-gray-600 hover:text-gray-400 transition-colors"
                  >
                    Skip tutorial
                  </button>
                )}

                {/* Scan line animation */}
                <motion.div
                  className="absolute bottom-0 left-0 right-0 h-px"
                  style={{ background: 'linear-gradient(90deg, transparent, rgba(0,210,255,0.5), transparent)' }}
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                />
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GuidedQuestOnboarding;
