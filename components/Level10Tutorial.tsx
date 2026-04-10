import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Castle, Users, ChevronRight } from 'lucide-react';
import { playSystemSoundEffect } from '../utils/soundEngine';

interface Level10TutorialProps {
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

const LVL10_STEPS: TStepConfig[] = [
  {
    icon: <Trophy size={20} />,
    title: 'Hunter Rankings',
    subtitle: 'Your rank matters more now. Keep climbing to earn bigger rewards and recognition.',
    color: '#fbbf24',
    autoAdvanceMs: 4500,
  },
  {
    icon: <Users size={20} />,
    title: 'Alliance Warfare',
    subtitle: 'Join or create alliances. Challenge others for ranking supremacy.',
    color: '#f59e0b',
    autoAdvanceMs: 4500,
  },
  {
    icon: <Castle size={20} />,
    title: 'Demon Castle',
    subtitle: 'Enter dangerous dungeons for powerful rewards. Spend keys to raid floors.',
    color: '#ef4444',
    autoAdvanceMs: 4500,
  },
];

const Level10Tutorial: React.FC<Level10TutorialProps> = ({ currentStep, onStepComplete, onComplete }) => {
  const stepIndex = currentStep - 1;
  const step = LVL10_STEPS[stepIndex];

  useEffect(() => {
    if (currentStep > 0) {
      try { playSystemSoundEffect('NOTIFICATION'); } catch {}
    }
  }, [currentStep]);

  useEffect(() => {
    if (!step) return;
    const timer = setTimeout(() => {
      if (stepIndex >= LVL10_STEPS.length - 1) onComplete();
      else onStepComplete(currentStep);
    }, step.autoAdvanceMs);
    return () => clearTimeout(timer);
  }, [currentStep, step, stepIndex, onStepComplete, onComplete]);

  if (!step || currentStep < 1 || currentStep > LVL10_STEPS.length) return null;

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
          key={`lv10-step-${currentStep}`}
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

            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="text-[9px] font-mono text-gray-600 tracking-[0.2em] uppercase">Tip {currentStep}/{LVL10_STEPS.length}</div>
              <div className="flex gap-1">
                {LVL10_STEPS.map((_, i) => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: i < currentStep ? step.color : 'rgba(100,100,140,0.3)' }} />
                ))}
              </div>
            </div>

            <h3 className="text-base font-black text-white tracking-wide mb-2">{step.title}</h3>
            <p className="text-[11px] text-gray-400 leading-relaxed mb-4">{step.subtitle}</p>

            <button
              onClick={() => {
                if (stepIndex >= LVL10_STEPS.length - 1) onComplete();
                else onStepComplete(currentStep);
              }}
              className="flex items-center gap-1 mx-auto text-[10px] font-bold tracking-wider transition-colors"
              style={{ color: step.color }}
            >
              {stepIndex >= LVL10_STEPS.length - 1 ? 'LET\'S GO' : 'NEXT'} <ChevronRight size={12} />
            </button>

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

export default Level10Tutorial;
