
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, ArrowRight, CheckCircle, Info, Lock, FastForward, ArrowUp, ArrowDown, ShieldAlert } from 'lucide-react';
import { playSystemSoundEffect } from '../utils/soundEngine';

interface TutorialOverlayProps {
  currentStep: number;
  onNext: () => void;
  onComplete: () => void;
  dynamicTargetId?: string | null;
  analysisFailed?: boolean;
  onAnalysisRetry?: () => void;
}

interface ScriptStep {
  title: string;
  body: string;
  buttonText: string;
  targetId?: string;
  mobileTargetId?: string; // Fallback ID for mobile view
  waitForAction?: boolean; 
  allowInteraction?: boolean; 
  hideOverlay?: boolean; 
  requireInput?: boolean; 
  forcePosition?: 'top' | 'bottom' | 'center'; 
}

const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ currentStep, onNext, onComplete, dynamicTargetId, analysisFailed, onAnalysisRetry }) => {
  const [dialogPosition, setDialogPosition] = useState<'top' | 'bottom' | 'center'>('bottom');
  const [isError, setIsError] = useState(false);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [spotlightStyles, setSpotlightStyles] = useState<React.CSSProperties>({ opacity: 0 });
  const [questInputValue, setQuestInputValue] = useState('');
  const observerRef = useRef<ResizeObserver | null>(null);
  
  // Script Configuration
  const SCRIPT: Record<number, ScriptStep> = {
      0: {
          title: "Hunter Protocol",
          body: "I am ForgeGuard — your System guide.\nStay sharp. This is your awakening.",
          buttonText: "I'm Ready",
          forcePosition: 'center'
      },
      1: {
          title: "Core Attributes",
          body: "Strength · Focus · Discipline · Social — four stats that define your power. Every quest raises them.",
          buttonText: "Next",
          targetId: 'tut-stats',
          allowInteraction: true,
          forcePosition: 'bottom'
      },
      2: {
          title: "Rank",
          body: "Level up to climb from E-Rank to S-Rank. S-Rank is earned, not given.",
          buttonText: "Next",
          targetId: 'tut-rank',
          allowInteraction: true,
          forcePosition: 'top'
      },
      3: {
          title: "Gold & Keys",
          body: "Gold is earned from quests — spend it in the Store. Keys unlock chests.",
          buttonText: "Next",
          targetId: 'tut-gold-display',
          allowInteraction: true,
          forcePosition: 'bottom'
      },
      4: {
          title: "Navigation",
          body: "Tap the nav bar to switch between Quests, Store, Health, and Dashboard.",
          buttonText: "Go to Quests",
          targetId: 'tut-nav-mobile',
          allowInteraction: true,
          forcePosition: 'top'
      },
      5: {
          title: "Quests",
          body: "A Quest is a real-world promise. Complete it to earn XP, Gold, and stat points.",
          buttonText: "Forge a Quest",
          forcePosition: 'center'
      },
      6: {
          title: "Add a Quest",
          body: "Tap the button to forge your first quest.",
          buttonText: "Tap to Add Quest",
          targetId: 'tut-add-quest',
          waitForAction: true,
          allowInteraction: true,
          forcePosition: 'bottom'
      },
      7: {
          title: "Name It",
          body: "Use at least 2 words — \"Run 5km at 7am\" beats \"Exercise\". ForgeGuard will analyze it.",
          buttonText: "Next",
          targetId: 'tut-quest-title',
          allowInteraction: true,
          requireInput: true,
          forcePosition: 'top'
      },
      8: {
          title: "Analyze",
          body: "Tap Analyze. ForgeGuard will assign a Rank, XP value, and stat to your quest.",
          buttonText: "Tap to Analyze",
          targetId: 'tut-quest-analyze',
          waitForAction: true,
          allowInteraction: true,
          forcePosition: 'bottom'
      },
      9: {
          title: "ForgeGuard Verdict",
          body: "ForgeGuard assigned a Rank, XP reward, and pillar stats to your quest. This analysis guarantees balanced progression.",
          buttonText: "Next",
          targetId: 'tut-quest-category',
          allowInteraction: true,
          forcePosition: 'bottom'
      },
      10: {
          title: "Mandatory: Schedule It",
          body: "You MUST set a time. Tap 'NOW' for immediate action or pick a specific time.\nUnscheduled quests cannot be confirmed. Uncompleted quests vanish at midnight.",
          buttonText: "Understood",
          targetId: 'tut-schedule',
          allowInteraction: true,
          forcePosition: 'top'
      },
      11: {
          title: "Confirm",
          body: "Tap Confirm to lock the quest. Complete it before midnight or it is lost.",
          buttonText: "Tap to Confirm",
          targetId: 'tut-confirm-quest',
          waitForAction: true,
          allowInteraction: true,
          forcePosition: 'top'
      },
      12: {
          title: "Quest Forged",
          body: "Your quest is now live. Do NOT tap Complete unless you have actually done the task — the System will penalize you.",
          buttonText: "Understood",
          targetId: 'quest-list-container',
          forcePosition: 'bottom'
      },
      13: {
          title: "Welcome Quest 1 of 3 — Strength",
          body: "The System has issued 3 Welcome Quests to calibrate your power.\n\nFirst: \"Get Strength to Change Yourself\"\nComplete it now to continue.",
          buttonText: "Complete to Continue",
          targetId: 'quest-list-container',
          waitForAction: true,
          allowInteraction: true,
          forcePosition: 'top'
      },
      14: {
          title: "Welcome Quest 2 of 3 — Discipline",
          body: "Strength confirmed. Now prove your discipline.\n\n\"Take the 1st Step to Change\"\nComplete it to continue.",
          buttonText: "Complete to Continue",
          targetId: 'quest-list-container',
          waitForAction: true,
          allowInteraction: true,
          forcePosition: 'top'
      },
      15: {
          title: "Welcome Quest 3 of 3 — Social",
          body: "Final calibration. You already forged your first quest — own it.\n\n\"Register One Quest\"\nComplete this to unlock the full System.",
          buttonText: "Complete to Continue",
          targetId: 'quest-list-container',
          waitForAction: true,
          allowInteraction: true,
          forcePosition: 'top'
      },
      16: {
          title: "The System Pact",
          body: "Hunter. That Gold you earned is not a reward — it is leverage.\n\nBefore every quest, The System will demand a Shadow Pledge. Lock your Gold as proof of intent. Complete the quest with honor and it returns. Cheat, and it burns — forever — fed to those who did not falter.\n\nFor high-rank quests, the Pact is mandatory. There is no negotiation.\n\nThis is how The System separates hunters from pretenders.",
          buttonText: "UNDERSTOOD",
          targetId: 'tut-gold-display',
          allowInteraction: false,
          forcePosition: 'bottom'
      },
      17: {
          title: "Workout Module",
          body: "Workout plans adapt to your calibration data. Complete sessions to build Attack and Boost stats.",
          buttonText: "Next",
          targetId: 'tut-health',
          allowInteraction: true,
          forcePosition: 'top'
      },
      18: {
          title: "Nutrition Protocol",
          body: "Track your macros here. Log meals to build the Extract stat. Tap Nutrition to explore.",
          buttonText: "Next",
          targetId: 'tut-health-nutrition-tab',
          allowInteraction: true,
          forcePosition: 'bottom'
      },
      19: {
          title: "Protocol Complete",
          body: "Fully initialized. Every rep, every session — it counts.\nRise, Hunter.",
          buttonText: "Begin Ascent",
          forcePosition: 'center'
      }
  };

  const stepData = useMemo(() => {
    const data = { ...SCRIPT[currentStep] };
    if (currentStep === 12 && dynamicTargetId) {
      data.targetId = dynamicTargetId;
      data.body = "Your quest is now live. Do NOT tap Complete unless you have actually done the task — the System will penalize you.";
    }
    if (currentStep >= 13 && currentStep <= 15 && dynamicTargetId) {
      data.targetId = dynamicTargetId;
    }
    if (analysisFailed && currentStep === 8) {
      data.targetId = 'tut-quest-title';
      data.forcePosition = 'bottom';
    }
    return data;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, dynamicTargetId, analysisFailed]);

  // --- SCROLL LOCK & AUTO-NAV ---
  useEffect(() => {
    let lockTimer: ReturnType<typeof setTimeout>;

    const lockScroll = () => {
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
        document.body.style.touchAction = 'none'; // Disable touch scroll
    };

    const unlockScroll = () => {
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
        document.body.style.touchAction = '';
    };

    if (stepData.hideOverlay) {
        unlockScroll();
        return;
    }

    if (targetElement) {
        // Only scroll to target if it isn't fixed/sticky (fixed elements don't need scrolling)
        const style = window.getComputedStyle(targetElement);
        const isFixed = style.position === 'fixed' || style.position === 'sticky';
        if (!isFixed) {
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        }

        // Lock after animation duration (approx 600ms for smooth scroll)
        lockTimer = setTimeout(lockScroll, 600);
    } else {
        // If no target (e.g. text modal), lock immediately to focus user
        lockScroll();
    }

    return () => {
        clearTimeout(lockTimer);
        unlockScroll();
    };
  }, [targetElement, stepData.hideOverlay, currentStep]);

  // --- SPOTLIGHT TRACKING ---
  useEffect(() => {
      const updateSpotlight = () => {
          if (targetElement && stepData && !stepData.hideOverlay) {
              const rect = targetElement.getBoundingClientRect();
              
              // Mobile adjustment: Ensure spotlight covers full touch targets comfortably
              const padding = window.innerWidth < 768 ? 12 : 12;
              
              setSpotlightStyles({
                  opacity: 1,
                  top: rect.top - padding,
                  left: rect.left - padding,
                  width: rect.width + (padding * 2),
                  height: rect.height + (padding * 2),
                  borderRadius: '12px',
                  boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.85)' 
              });

              // Smart Dialog Positioning — picks whichever side doesn't overlap the spotlight
              const resolvePosition = (force?: 'top' | 'bottom' | 'center') => {
                  if (force === 'center') return 'center';
                  // If user must interact with the target, ALWAYS respect forced position
                  // so the dialog never covers the interactive element
                  if (force && stepData.allowInteraction) return force;
                  const vh = window.innerHeight;
                  const isMobile = window.innerWidth < 768;
                  const dialogH = 150; // approx compact dialog height
                  const bottomOffset = isMobile ? 96 : 48; // bottom-24 mobile / bottom-12 desktop
                  const topOffset = isMobile ? 16 : 48;   // top-4 mobile / top-12 desktop
                  const spotTop = rect.top - padding;
                  const spotBot = rect.bottom + padding;
                  // Projected dialog bounds for each position
                  const bottomDialogTop = vh - bottomOffset - dialogH;
                  const bottomDialogBot = vh - bottomOffset;
                  const topDialogTop = topOffset;
                  const topDialogBot = topOffset + dialogH;
                  const overlapsBottom = bottomDialogBot > spotTop && bottomDialogTop < spotBot;
                  const overlapsTop    = topDialogBot    > spotTop && topDialogTop    < spotBot;

                  if (force) {
                      // If the forced side overlaps, flip to the other
                      if (force === 'bottom' && overlapsBottom && !overlapsTop) return 'top';
                      if (force === 'top'    && overlapsTop    && !overlapsBottom) return 'bottom';
                      return force;
                  }
                  // Auto: prefer bottom, flip to top if it overlaps
                  if (!overlapsBottom) return 'bottom';
                  if (!overlapsTop)    return 'top';
                  // Both overlap (element fills center) — pick whichever has more room
                  return (vh - rect.bottom) > rect.top ? 'bottom' : 'top';
              };
              setDialogPosition(resolvePosition(stepData.forcePosition));

          } else {
              setSpotlightStyles({ opacity: 0 });
          }
      };

      // Initial Update
      updateSpotlight();
      
      // Setup Resize Observer for robust tracking
      if (targetElement) {
          observerRef.current = new ResizeObserver(updateSpotlight);
          observerRef.current.observe(targetElement);
          observerRef.current.observe(document.body);
      }

      window.addEventListener('resize', updateSpotlight);
      window.addEventListener('scroll', updateSpotlight, true);

      return () => {
          window.removeEventListener('resize', updateSpotlight);
          window.removeEventListener('scroll', updateSpotlight, true);
          if (observerRef.current) observerRef.current.disconnect();
      };
  }, [targetElement, stepData]);

  // --- STRICT INTERACTION BLOCKER ---
  useEffect(() => {
    if (!stepData || stepData.hideOverlay) return;

    const handleInteraction = (e: Event) => {
        const target = e.target as Node;
        
        // 1. Always allow interaction with the Tutorial Dialog itself
        const dialog = document.getElementById('tutorial-dialog');
        if (dialog && dialog.contains(target)) {
            return; // Allow
        }

        // 2. If allowInteraction is ON, check if target is the highlighted element
        if (stepData.allowInteraction) {
            // Check if user is clicking inside the highlighted target
            if (targetElement && (targetElement.contains(target) || targetElement === target)) {
                return; // Allow
            }
        }

        // 3. Otherwise: BLOCK
        e.preventDefault();
        e.stopPropagation();
        
        if (['click', 'mousedown', 'touchstart'].includes(e.type)) {
            playSystemSoundEffect('WARNING');
            setIsError(true);
            setTimeout(() => setIsError(false), 300);
        }
    };

    // Capture phase blocking
    window.addEventListener('click', handleInteraction, true);
    window.addEventListener('mousedown', handleInteraction, true);
    window.addEventListener('touchstart', handleInteraction, { capture: true, passive: false });
    window.addEventListener('keydown', handleInteraction, true);
    // Also block wheel to prevent fighting auto-scroll during lock
    window.addEventListener('wheel', handleInteraction, { capture: true, passive: false });

    return () => {
        window.removeEventListener('click', handleInteraction, true);
        window.removeEventListener('mousedown', handleInteraction, true);
        window.removeEventListener('touchstart', handleInteraction, true);
        window.removeEventListener('keydown', handleInteraction, true);
        window.removeEventListener('wheel', handleInteraction, true);
    };
  }, [stepData, targetElement, currentStep]);


  // --- TARGET ELEMENT FINDER ---
  useEffect(() => {
      // Cleanup previous highlights
      document.querySelectorAll('.tutorial-highlight').forEach(el => {
          el.classList.remove('tutorial-highlight', 'tutorial-highlight-inset');
      });

      if (!stepData || stepData.hideOverlay) {
          setTargetElement(null);
          return;
      }

      // Find Target (Retry logic for async rendering)
      const findAndSetTarget = () => {
          let targetId = stepData.targetId;
          
          // Mobile Fallback Logic
          if (window.innerWidth < 768 && stepData.mobileTargetId) {
              targetId = stepData.mobileTargetId;
          }

          if (targetId) {
              const el = document.getElementById(targetId);
              if (el) {
                  setTargetElement(el);
                  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) {
                      el.classList.add('tutorial-highlight-inset');
                      if (stepData.allowInteraction) el.focus();
                  } else {
                      el.classList.add('tutorial-highlight');
                  }
              }
          } else {
              setTargetElement(null);
              setDialogPosition(stepData.forcePosition || 'center');
          }
      };

      findAndSetTarget();
      // Retry aggressively to catch mount animations/tab switches
      const retryTimer1 = setTimeout(findAndSetTarget, 100);
      const retryTimer2 = setTimeout(findAndSetTarget, 500);
      const retryTimer3 = setTimeout(findAndSetTarget, 1000);

      return () => {
          clearTimeout(retryTimer1);
          clearTimeout(retryTimer2);
          clearTimeout(retryTimer3);
          document.querySelectorAll('.tutorial-highlight, .tutorial-highlight-inset').forEach(el => {
              el.classList.remove('tutorial-highlight', 'tutorial-highlight-inset');
          });
      };
  }, [currentStep, stepData.targetId]); 

  useEffect(() => {
    if (!stepData?.requireInput || !stepData.targetId) {
      setQuestInputValue('');
      return;
    }
    let el: HTMLInputElement | null = null;
    const sync = () => setQuestInputValue((el?.value ?? ''));
    const tryAttach = () => {
      el = document.getElementById(stepData.targetId!) as HTMLInputElement | null;
      if (el) { el.addEventListener('input', sync); sync(); }
    };
    tryAttach();
    const poll = el ? undefined : setInterval(() => {
      el = document.getElementById(stepData.targetId!) as HTMLInputElement | null;
      if (el) { clearInterval(poll); el.addEventListener('input', sync); sync(); }
    }, 120);
    return () => {
      if (poll) clearInterval(poll);
      el?.removeEventListener('input', sync);
      setQuestInputValue('');
    };
  }, [currentStep, stepData?.requireInput, stepData?.targetId]);

  const inputWordCount = questInputValue.trim().split(/\s+/).filter(Boolean).length;
  const isInputInsufficient = !!(stepData?.requireInput && inputWordCount < 2);

  const handleNextClick = () => {
      if (stepData?.requireInput && stepData.targetId) {
          const el = document.getElementById(stepData.targetId) as HTMLInputElement;
          const words = (el?.value ?? '').trim().split(/\s+/).filter(Boolean).length;
          if (!el || words < 2) {
              setIsError(true);
              setTimeout(() => setIsError(false), 500);
              el?.focus();
              return;
          }
      }
      onNext();
  };

  if (!stepData || stepData.hideOverlay) return null;

  // Dialog Position Classes
  const positionClasses = {
      'top': 'top-4 md:top-12', 
      'bottom': 'bottom-24 md:bottom-12', 
      'center': 'top-1/2 -translate-y-1/2'
  };

  // --- RENDER VIA PORTAL ---
  // Using Portal ensures the fixed overlay is relative to the VIEWPORT, 
  // ignoring any parent transforms (which caused the "wrong side" issue).
  return createPortal(
    <>
        {/* Inject Styles */}
        <style>{`
            @keyframes tutorial-pulse-aggressive {
                0% { box-shadow: 0 0 0 2px #00d2ff, 0 0 15px rgba(0,210,255,0.3); }
                50% { box-shadow: 0 0 0 2px #ffffff, 0 0 30px rgba(0,210,255,0.6); }
                100% { box-shadow: 0 0 0 2px #00d2ff, 0 0 15px rgba(0,210,255,0.3); }
            }
            .tutorial-highlight {
                animation: tutorial-pulse-aggressive 2s infinite !important;
                /* No position override — preserves fixed/absolute elements */
            }
            .tutorial-highlight-inset {
                animation: tutorial-pulse-aggressive 2s infinite !important;
            }
        `}</style>

        {/* SPOTLIGHT OVERLAY */}
        {targetElement ? (
            <motion.div 
                className="fixed z-[9998] pointer-events-none"
                initial={{ opacity: 0 }}
                animate={spotlightStyles as any}
                transition={{ duration: 0.3, ease: "easeOut" }}
                style={{
                    ...spotlightStyles,
                    // Use a subtle border on the spotlight itself to define the hole
                    border: '1px solid rgba(0, 210, 255, 0.3)',
                }}
            />
        ) : (
            // Full backdrop for text-only steps
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="fixed inset-0 z-[9998] pointer-events-none bg-black/90 backdrop-blur-sm" 
            />
        )}

        {/* DIALOG BOX */}
        <div className="fixed inset-0 z-[9999] pointer-events-none font-sans flex flex-col items-center justify-center">
            <motion.div 
                id="tutorial-dialog"
                layout 
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={
                    isError 
                        ? { opacity: 1, y: 0, x: [-10, 10, -10, 10, 0], scale: [1, 1.05, 1] } 
                        : analysisFailed 
                            ? { opacity: 1, y: 0, x: [-8, 8, -8, 8, 0], scale: [1, 1.03, 1] } 
                            : { opacity: 1, scale: 1, y: 0, x: 0 }
                }
                transition={{ type: "spring", stiffness: 200, damping: 25 }}
                className={`absolute left-4 right-4 md:left-auto md:right-auto md:w-[400px] pointer-events-auto ${positionClasses[dialogPosition]}`}
            >
                <div className={`bg-[#0a0a0a] border rounded-xl shadow-2xl overflow-hidden flex flex-col transition-colors ${isError ? 'border-red-500 shadow-[0_0_30px_rgba(220,38,38,0.5)]' : analysisFailed ? 'border-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.5)]' : 'border-system-neon shadow-[0_0_30px_rgba(0,210,255,0.3)]'}`}>
                    
                    {/* Header Line */}
                    <motion.div 
                        layoutId="tutorial-header-line"
                        className={`h-1 w-full shrink-0 ${isError ? 'bg-red-500' : analysisFailed ? 'bg-amber-500' : 'bg-gradient-to-r from-system-neon via-system-accent to-system-neon'}`} 
                    />
                    
                    <div className="p-3 sm:p-5">
                        <div className="flex items-start gap-3">
                            <motion.div 
                                key={currentStep}
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className={`hidden sm:flex p-2 rounded-full border shrink-0 ${isError ? 'bg-red-500/10 border-red-500/20 text-red-500' : analysisFailed ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-system-neon/10 border-system-neon/20 text-system-neon'}`}
                            >
                                {isError ? <ShieldAlert size={16} /> : analysisFailed ? <ShieldAlert size={16} /> : <Terminal size={16} />}
                            </motion.div>
                            
                            <div className="flex-1 min-w-0">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={`content-${currentStep}-${dynamicTargetId || 'static'}-${analysisFailed ? 'failed' : 'ok'}`}
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -10 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <h3 className={`text-xs md:text-sm font-bold font-mono tracking-tight mb-1 flex items-center gap-2 ${isError ? 'text-red-500' : analysisFailed ? 'text-amber-400' : 'text-white'}`}>
                                            <span className="sm:hidden">{isError ? <Lock size={14} className="text-red-500" /> : analysisFailed ? <ShieldAlert size={14} className="text-amber-400" /> : <Terminal size={14} className="text-system-neon" />}</span>
                                            {isError ? "ACCESS DENIED" : analysisFailed ? "FORGE REJECTED" : stepData.title}
                                        </h3>
                                        <div className="text-[11px] md:text-xs text-gray-400 font-mono leading-snug whitespace-pre-wrap">
                                            {isError ? "Please follow the active protocol instruction." : analysisFailed ? "ForgeGuard rejected your quest. It must be a real, actionable physical or mental task — not vague, fake, or trivial.\n\nEdit your quest title and analyze again." : stepData.body}
                                        </div>
                                    </motion.div>
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* Interactive Hint */}
                        {stepData.targetId && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="mt-2 flex items-center gap-2 text-[10px] text-system-neon font-mono animate-pulse font-bold bg-system-neon/5 px-2 py-1 rounded"
                            >
                                {dialogPosition === 'top' ? <ArrowDown size={12} /> : <ArrowUp size={12} />}
                                <span>TARGET LOCKED</span>
                            </motion.div>
                        )}

                        <div className="flex justify-between items-center pt-2 mt-2 border-t border-gray-800/50">
                            <button 
                                onClick={onComplete}
                                className="text-[10px] text-gray-600 hover:text-red-400 font-mono tracking-wider transition-colors px-2 py-1 flex items-center gap-1 group"
                            >
                                ABORT <FastForward size={10} className="group-hover:translate-x-0.5 transition-transform" />
                            </button>

                            <div className="flex justify-end gap-2">
                                <AnimatePresence mode="wait">
                                    {analysisFailed ? (
                                        <motion.button
                                            key="btn-retry"
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0 }}
                                            onClick={onAnalysisRetry}
                                            className="bg-amber-500 text-black px-5 py-2 rounded font-bold font-mono text-xs hover:bg-amber-400 transition-colors flex items-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.4)]"
                                        >
                                            Got It — Retry <ArrowRight size={14} />
                                        </motion.button>
                                    ) : currentStep === 19 ? ( 
                                        <motion.button 
                                            key="btn-complete"
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            onClick={onComplete}
                                            className="bg-system-neon text-black px-5 py-2 rounded font-bold font-mono text-xs hover:bg-white transition-colors flex items-center gap-2 shadow-[0_0_15px_rgba(0,210,255,0.4)]"
                                        >
                                            {stepData.buttonText} <CheckCircle size={14} />
                                        </motion.button>
                                    ) : !stepData.waitForAction ? (
                                        <motion.button 
                                            key="btn-next"
                                            initial={{ opacity: 0, x: 10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0 }}
                                            onClick={handleNextClick}
                                            disabled={isInputInsufficient}
                                            className={`px-5 py-2 rounded font-bold font-mono text-xs transition-all flex items-center gap-2 shadow-lg ${
                                              isInputInsufficient
                                                ? 'bg-gray-800 text-gray-600 cursor-not-allowed opacity-50 shadow-none'
                                                : isError
                                                  ? 'bg-red-500 text-white hover:bg-red-400'
                                                  : 'bg-system-neon text-black hover:bg-white'
                                            }`}
                                        >
                                            {stepData.buttonText} <ArrowRight size={14} />
                                        </motion.button>
                                    ) : (
                                        <motion.div 
                                            key="btn-wait"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="text-[10px] text-system-neon font-mono animate-pulse flex items-center gap-2 px-3 py-2 border border-system-neon/30 rounded bg-system-neon/5"
                                        >
                                            <Info size={12} /> {stepData.buttonText}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                    
                    {/* Progress Dots */}
                    <div className="bg-black/50 py-1.5 px-4 flex gap-1 justify-center shrink-0">
                        {Array.from({ length: 20 }).map((_, i) => (
                            <motion.div 
                                key={i}
                                layout 
                                className={`h-1 rounded-full ${i === currentStep ? 'bg-system-neon shadow-[0_0_8px_#00d2ff]' : 'bg-gray-800'}`}
                                animate={{ 
                                    width: i === currentStep ? 24 : 8,
                                    opacity: i <= currentStep ? 1 : 0.5 
                                }}
                                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                            />
                        ))}
                    </div>
                </div>
            </motion.div>
        </div>
    </>,
    document.body
  );
};

export default TutorialOverlay;
