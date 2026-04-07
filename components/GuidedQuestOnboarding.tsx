import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Plus, Type, Cpu, Clock, Check, ChevronRight, AlertTriangle } from 'lucide-react';
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
  isErrorStep?: boolean;
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
    position: 'bottom',
    waitForAction: false,
  },
  {
    targetId: 'tut-quest-analyze',
    icon: <Cpu size={18} />,
    title: 'Analyze with AI',
    subtitle: 'The System will scan and rank your quest.',
    position: 'bottom',
    waitForAction: true,
  },
  {
    targetId: 'tut-schedule',
    icon: <Clock size={18} />,
    title: 'Set Your Schedule',
    subtitle: 'Choose when you\'ll complete this quest.',
    position: 'bottom',
    waitForAction: false,
  },
  {
    targetId: 'tut-confirm-quest',
    icon: <Check size={18} />,
    title: 'Lock It In',
    subtitle: 'Your pledge is ready. Confirm and begin.',
    position: 'bottom',
    waitForAction: true,
  },
  {
    targetId: 'tut-quest-title',
    icon: <AlertTriangle size={18} />,
    title: 'Invalid Quest Name',
    subtitle: 'Please enter a valid task. Be specific about what you want to achieve.',
    position: 'bottom',
    waitForAction: false,
    isErrorStep: true,
  },
];

const GuidedQuestOnboarding: React.FC<GuidedQuestOnboardingProps> = ({ currentStep, onStepComplete, onComplete }) => {
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [wordCount, setWordCount] = useState(0);
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

  // Sound effect on step change
  useEffect(() => {
    if (currentStep > 0) {
      try { playSystemSoundEffect('NOTIFICATION'); } catch {}
    }
  }, [currentStep]);

  // For step 3, track word count in the input
  useEffect(() => {
    if (currentStep !== 3) return;
    
    const checkWordCount = () => {
      const input = document.getElementById('tut-quest-title') as HTMLInputElement;
      if (input) {
        const words = input.value.trim().split(/\s+/).filter(w => w.length > 0).length;
        setWordCount(words);
      }
    };
    
    const input = document.getElementById('tut-quest-title');
    if (input) {
      input.addEventListener('input', checkWordCount);
      checkWordCount(); // Initial check
      return () => input.removeEventListener('input', checkWordCount);
    }
  }, [currentStep]);

  // Auto-advance non-action steps after a delay (except step 3 which has word count validation)
  useEffect(() => {
    if (!step || step.waitForAction || currentStep === 3) return;
    const timer = setTimeout(() => {
      onStepComplete(currentStep);
    }, 3000);
    return () => clearTimeout(timer);
  }, [currentStep, step, onStepComplete]);

  // For step 1 (Quests tab), detect when tab is active
  useEffect(() => {
    if (currentStep !== 1) return;
    
    const checkQuestsTabActive = () => {
      // Check if we're on the QUESTS tab by looking for quest-specific elements
      const questsHeader = document.querySelector('span.text-xs.font-black.font-mono.tracking-widest');
      const isQuestsTab = questsHeader?.textContent?.includes('TODAY TASKS') || 
                          !!document.getElementById('tut-add-quest') ||
                          !!document.getElementById('quest-list-container');
      
      if (isQuestsTab) {
        onStepComplete(1);
      }
    };
    
    checkQuestsTabActive();
    const interval = setInterval(checkQuestsTabActive, 200);
    const observer = new MutationObserver(checkQuestsTabActive);
    observer.observe(document.body, { childList: true, subtree: true });
    
    return () => {
      clearInterval(interval);
      observer.disconnect();
    };
  }, [currentStep, onStepComplete]);

  // For step 2 (+ button), detect when quest modal opens and auto-advance
  useEffect(() => {
    if (currentStep !== 2) return;
    
    const checkModalOpen = () => {
      const modalTitle = document.querySelector('h3.text-xs.font-black.text-white.font-mono.tracking-widest');
      const questInput = document.getElementById('tut-quest-title');
      const isModalOpen = modalTitle?.textContent?.includes('NEW QUEST') || !!questInput;
      
      if (isModalOpen) {
        onStepComplete(2);
      }
    };
    
    checkModalOpen();
    const interval = setInterval(checkModalOpen, 200);
    const observer = new MutationObserver(checkModalOpen);
    observer.observe(document.body, { childList: true, subtree: true });
    
    return () => {
      clearInterval(interval);
      observer.disconnect();
    };
  }, [currentStep, onStepComplete]);

  // For step 4 (analyze button), detect when ForgeGuard result appears
  useEffect(() => {
    if (currentStep !== 4) return;
    
    const checkAnalysisComplete = () => {
      // Check if ForgeGuard result card is visible
      const forgeResult = document.getElementById('tut-quest-category');
      if (forgeResult) {
        onStepComplete(4);
      }
    };
    
    checkAnalysisComplete();
    const interval = setInterval(checkAnalysisComplete, 200);
    const observer = new MutationObserver(checkAnalysisComplete);
    observer.observe(document.body, { childList: true, subtree: true });
    
    return () => {
      clearInterval(interval);
      observer.disconnect();
    };
  }, [currentStep, onStepComplete]);

  // For step 6 (confirm button), detect when quest is created (modal closes)
  useEffect(() => {
    if (currentStep !== 6) return;
    
    const checkQuestCreated = () => {
      // If modal closes and we're back to quest list, quest was created
      const modalTitle = document.querySelector('h3.text-xs.font-black.text-white.font-mono.tracking-widest');
      const questInput = document.getElementById('tut-quest-title');
      const isModalClosed = !modalTitle?.textContent?.includes('NEW QUEST') && !questInput;
      
      // Also check if a quest card appears in the list
      const questCards = document.querySelectorAll('[id^="quest-card-"]');
      
      if (isModalClosed && questCards.length > 0) {
        onStepComplete(6);
      }
    };
    
    checkQuestCreated();
    const interval = setInterval(checkQuestCreated, 200);
    const observer = new MutationObserver(checkQuestCreated);
    observer.observe(document.body, { childList: true, subtree: true });
    
    return () => {
      clearInterval(interval);
      observer.disconnect();
    };
  }, [currentStep, onStepComplete]);

  if (!step || currentStep < 1 || currentStep > 7) return null;

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
          {/* Dark overlay with spotlight cutout - pointer-events-none on SVG to let clicks pass through */}
          {spotlightRect && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
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


          {/* Floating hint for action steps */}
          {spotlightRect && step && step.waitForAction && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute pointer-events-none"
              style={{
                left: '50%',
                bottom: 120,
                transform: 'translateX(-50%)',
                zIndex: 10,
              }}
            >
              <div
                className="px-4 py-2 rounded-full text-[11px] font-bold text-white whitespace-nowrap"
                style={{
                  background: 'rgba(0,0,0,0.8)',
                  border: '1px solid rgba(0,210,255,0.4)',
                  boxShadow: '0 0 20px rgba(0,210,255,0.3)',
                }}
              >
                Tap the highlighted button
              </div>
            </motion.div>
          )}
          {spotlightRect && step && !step.waitForAction && (
            <motion.div
              key={`tooltip-${currentStep}`}
              initial={{ opacity: 0, y: step.position === 'bottom' ? -10 : 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="absolute pointer-events-auto"
              style={{
                left: Math.max(16, Math.min(spotlightRect.x + spotlightRect.w / 2 - 130, window.innerWidth - 276)),
                top: step.position === 'bottom'
                  ? Math.max(80, spotlightRect.y - 140)
                  : Math.min(window.innerHeight - 200, spotlightRect.y + spotlightRect.h + 16),
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

              {/* Step 3 - Word count validation */}
                {currentStep === 3 && (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className={wordCount >= 2 ? 'text-green-400' : 'text-gray-500'}>
                        {wordCount} word{wordCount !== 1 ? 's' : ''}
                      </span>
                      <span className={wordCount >= 2 ? 'text-green-400' : 'text-gray-600'}>
                        Min 2 words required
                      </span>
                    </div>
                    <button
                      onClick={() => onStepComplete(currentStep)}
                      disabled={wordCount < 2}
                      className={`w-full py-2 rounded-lg text-[11px] font-bold tracking-wider transition-all ${
                        wordCount >= 2
                          ? 'bg-cyan-500 text-black hover:bg-cyan-400'
                          : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      NEXT
                    </button>
                  </div>
                )}

                {/* Error step - show red styling */}
                {step.isErrorStep && (
                  <div className="mt-3 p-2 rounded-lg bg-red-900/20 border border-red-500/30">
                    <p className="text-[10px] text-red-400">
                      Try: &quot;Run 5km&quot;, &quot;Read 30 pages&quot;, &quot;Study for 2 hours&quot;
                    </p>
                  </div>
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
