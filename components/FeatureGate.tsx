import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock } from 'lucide-react';

// ── Feature Gate Configuration ──
export interface FeatureGateConfig {
  level: number;
  label: string;
  description: string;
}

export const FEATURE_GATES: Record<string, FeatureGateConfig> = {
  HEALTH_NUTRITION: { level: 5, label: 'Nutrition Scanner', description: 'Scan food, log meals, and track macros with AI.' },
  HEALTH_CUSTOM_WORKOUT: { level: 5, label: 'AI Workout Generator', description: 'Generate personalized workout protocols.' },
  HEALTH_CALORIE_LIMIT: { level: 5, label: 'Custom Calorie Limit', description: 'Set a custom daily calorie target.' },
  STORE: { level: 1, label: 'Armory & Store', description: 'Unlock outfits, chests, and more.' },
  LEADERBOARD: { level: 3, label: 'Hunter Rankings', description: 'Unlock the global leaderboard at level 3 and compete with others.' },
  MOBILE_CHESTS: { level: 5, label: 'Chest Vault', description: 'Open legendary and alliance chests using gold.' },
};

// ── Level gate thresholds for feature unlocks ──
export const FEATURE_UNLOCK_LEVELS = [5, 10] as const;

// ── Hook: check if a feature is locked ──
export function useFeatureGate(featureKey: string, playerLevel: number): { locked: boolean; requiredLevel: number; label: string } {
  const gate = FEATURE_GATES[featureKey];
  if (!gate) return { locked: false, requiredLevel: 0, label: '' };
  return {
    locked: playerLevel < gate.level,
    requiredLevel: gate.level,
    label: gate.label,
  };
}

// ── Nav locked tabs by level ──
export function getLockedTabs(playerLevel: number): Record<string, number> {
  const locked: Record<string, number> = {};
  if (playerLevel < 3) locked['LEADERBOARD'] = 3;
  return locked;
}

// ── Locked Feature Popup ──
interface LockedFeaturePopupProps {
  visible: boolean;
  featureLabel: string;
  requiredLevel: number;
  onClose: () => void;
}

export const LockedFeaturePopup: React.FC<LockedFeaturePopupProps> = ({ visible, featureLabel, requiredLevel, onClose }) => {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[999] flex items-center justify-center p-6"
          style={{ background: 'rgba(0,0,0,0.85)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xs rounded-2xl p-6 text-center relative overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, rgba(20,20,40,0.98) 0%, rgba(8,8,26,0.99) 100%)',
              border: '1px solid rgba(100,100,140,0.25)',
              boxShadow: '0 0 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)',
            }}
          >
            {/* Lock icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 500 }}
              className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{
                background: 'linear-gradient(135deg, rgba(100,100,140,0.2) 0%, rgba(60,60,80,0.3) 100%)',
                border: '1px solid rgba(100,100,140,0.3)',
              }}
            >
              <Lock size={28} className="text-gray-400" />
            </motion.div>

            {/* Feature name */}
            <h3 className="text-white font-black text-base tracking-wide mb-1">{featureLabel}</h3>

            {/* Level required */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-[10px] font-mono text-gray-500 tracking-[0.2em] uppercase">Unlocks at</span>
              <span
                className="text-sm font-black font-mono tracking-wider"
                style={{ color: '#7EB8D4', textShadow: '0 0 10px rgba(126,184,212,0.5)' }}
              >
                LEVEL {requiredLevel}
              </span>
            </div>

            {/* Description */}
            <p className="text-[11px] text-gray-500 leading-relaxed mb-5">
              {FEATURE_GATES[Object.keys(FEATURE_GATES).find(k => FEATURE_GATES[k].label === featureLabel) || '']?.description || 'Keep leveling up to unlock this feature.'}
            </p>

            {/* Dismiss */}
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl text-xs font-bold tracking-widest text-gray-400 transition-colors hover:text-white"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              GOT IT
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ── Inline Locked Placeholder (for inside views) ──
interface LockedSectionPlaceholderProps {
  featureKey: string;
  playerLevel: number;
  className?: string;
}

export const LockedSectionPlaceholder: React.FC<LockedSectionPlaceholderProps> = ({ featureKey, playerLevel, className = '' }) => {
  const gate = FEATURE_GATES[featureKey];
  if (!gate || playerLevel >= gate.level) return null;

  return (
    <div
      className={`relative rounded-2xl p-6 flex flex-col items-center justify-center text-center ${className}`}
      style={{
        background: 'linear-gradient(135deg, rgba(30,30,50,0.5) 0%, rgba(15,15,30,0.6) 100%)',
        border: '1px solid rgba(80,80,120,0.2)',
        minHeight: 120,
      }}
    >
      <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3" style={{ background: 'rgba(100,100,140,0.15)', border: '1px solid rgba(100,100,140,0.2)' }}>
        <Lock size={18} className="text-gray-500" />
      </div>
      <div className="text-[10px] font-mono text-gray-600 tracking-[0.15em] uppercase mb-1">{gate.label}</div>
      <div className="text-[10px] font-mono tracking-wider" style={{ color: 'rgba(126,184,212,0.6)' }}>
        Unlocks at Level {gate.level}
      </div>
    </div>
  );
};

// ── Nav Lock Badge (small lock + level on grayed icon) ──
interface LockedNavBadgeProps {
  requiredLevel: number;
}

export const LockedNavBadge: React.FC<LockedNavBadgeProps> = ({ requiredLevel }) => (
  <div
    className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center z-20"
    style={{
      background: 'rgba(30,30,50,0.95)',
      border: '1px solid rgba(100,100,140,0.4)',
      fontSize: 7,
      fontWeight: 900,
      color: '#8892a4',
      fontFamily: 'monospace',
    }}
  >
    {requiredLevel}
  </div>
);
