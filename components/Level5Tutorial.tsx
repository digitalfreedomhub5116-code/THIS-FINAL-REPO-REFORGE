import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Store, Utensils, Sparkles, ShoppingBag, ChevronRight } from 'lucide-react';
import { playSystemSoundEffect } from '../utils/soundEngine';

interface Level5TutorialProps {
  currentStep: number;
  onStepComplete: (step: number) => void;
  onComplete: () => void;
}

interface TStepConfig {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  color: string;
  autoAdvanceMs: number;
}

const LVL5_STEPS: TStepConfig[] = [
  {
    icon: <Store size={20} />,
    title: 'Store Tips',
    subtitle: 'Browse outfits, open chests, and spend your keys and gold in the Store.',
    color: '#33dfff',
    autoAdvanceMs: 4500,
  },
  {
    icon: <ShoppingBag size={20} />,
    title: 'Outfits & Chests',
    subtitle: 'Equip outfits to boost your XP gain. Open chests for legendary rewards.',
    color: '#33dfff',
    autoAdvanceMs: 4500,
  },
  {
    icon: <Utensils size={20} />,
    title: 'Nutrition Tips',
    subtitle: 'Head to Health → Nutrition to scan food with AI and log your meals.',
    color: '#00d4ff',
    autoAdvanceMs: 4500,
  },
  {
    icon: <Sparkles size={20} />,
    title: 'AI Workout Generator',
    subtitle: 'Generate personalized workout plans using keys. Find it in Health → Training Programs.',
    color: '#33dfff',
    autoAdvanceMs: 4500,
  },
];

const Level5Tutorial: React.FC<Level5TutorialProps> = ({ currentStep, onStepComplete, onComplete }) => {
  const stepIndex = currentStep - 1;
  const step = LVL5_STEPS[stepIndex];

  useEffect(() => {
    if (currentStep > 0) {
      try { playSystemSoundEffect('NOTIFICATION'); } catch {}
    }
  }, [currentStep]);

  useEffect(() => {
    if (!step) return;
    const timer = setTimeout(() => {
      if (stepIndex >= LVL5_STEPS.length - 1) onComplete();
      else onStepComplete(currentStep);
    }, step.autoAdvanceMs);
    return () => clearTimeout(timer);
  }, [currentStep, step, stepIndex, onStepComplete, onComplete]);

  if (!step || currentStep < 1 || currentStep > LVL5_STEPS.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[900] flex items-center justify-center p-6"
      style={{ background: 'rgba(0,0,0,0.85)' }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={`lv5-step-${currentStep}`}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="w-full max-w-xs"
        >
          <div
            className="rounded-2xl p-6 relative overflow-hidden text-center"
            style={{
              background: 'linear-gradient(135deg, rgba(15,15,35,0.98) 0%, rgba(6,6,20,0.99) 100%)',
              border: `1px solid ${step.color}30`,
              boxShadow: `0 0 40px ${step.color}15, 0 8px 32px rgba(0,0,0,0.6)`,
            }}
          >
            {/* Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, delay: 0.1 }}
              className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{
                background: `radial-gradient(circle, ${step.color}20, transparent 70%)`,
                border: `1px solid ${step.color}40`,
                color: step.color,
              }}
            >
              {step.icon}
            </motion.div>

            {/* Step counter */}
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="text-[9px] font-mono text-gray-600 tracking-[0.2em] uppercase">Tip {currentStep}/{LVL5_STEPS.length}</div>
              <div className="flex gap-1">
                {LVL5_STEPS.map((_, i) => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: i < currentStep ? step.color : 'rgba(100,100,140,0.3)' }} />
                ))}
              </div>
            </div>

            <h3 className="text-base font-black text-white tracking-wide mb-2">{step.title}</h3>
            <p className="text-[11px] text-gray-400 leading-relaxed mb-4">{step.subtitle}</p>

            <button
              onClick={() => {
                if (stepIndex >= LVL5_STEPS.length - 1) onComplete();
                else onStepComplete(currentStep);
              }}
              className="flex items-center gap-1 mx-auto text-[10px] font-bold tracking-wider transition-colors"
              style={{ color: step.color }}
            >
              {stepIndex >= LVL5_STEPS.length - 1 ? 'GOT IT' : 'NEXT'} <ChevronRight size={12} />
            </button>

            {/* Scan line */}
            <motion.div
              className="absolute bottom-0 left-0 right-0 h-px"
              style={{ background: `linear-gradient(90deg, transparent, ${step.color}60, transparent)` }}
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
            />
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
};

export default Level5Tutorial;
