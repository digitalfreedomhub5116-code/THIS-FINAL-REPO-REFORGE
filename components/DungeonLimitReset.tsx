/**
 * ── DUNGEON LIMIT RESET ──
 * Per-exercise gear icons on each exercise card → opens modal to recalibrate that exercise.
 * Rules:
 *  - 100 gold per exercise to reset
 *  - 7-day cooldown per exercise after reset
 *  - Saved to Supabase (dungeon_limit_resets table)
 *  - Updates local dungeon baselines immediately
 */

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, X, Coins, AlertTriangle, Check, Minus, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { triggerHaptic } from '../utils/soundEngine';
import { DungeonState } from '../types';
import { computeTargets } from '../lib/dungeonEngine';

const RESET_COST = 100; // gold per exercise

interface ExerciseConfig {
  key: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  field: string;
}

const EXERCISE_CONFIG: Record<string, ExerciseConfig> = {
  PUSHUPS: { key: 'PUSHUPS', label: 'Push-ups', unit: 'reps', min: 5, max: 200, step: 5, field: 'baselinePushups' },
  SQUATS: { key: 'SQUATS', label: 'Squats', unit: 'reps', min: 5, max: 200, step: 5, field: 'baselineSquats' },
  RUNNING: { key: 'RUNNING', label: 'Running', unit: 'km', min: 0.5, max: 20, step: 0.5, field: 'baselineRunKm' },
};

// ── Stepper Input ──
const StepperInput: React.FC<{
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
  disabled: boolean;
}> = ({ value, onChange, min, max, step, unit, disabled }) => {
  const dec = () => { if (!disabled) { triggerHaptic('TICK'); onChange(Math.max(min, +(value - step).toFixed(1))); } };
  const inc = () => { if (!disabled) { triggerHaptic('TICK'); onChange(Math.min(max, +(value + step).toFixed(1))); } };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={dec}
        disabled={disabled || value <= min}
        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-90"
        style={{
          background: disabled ? 'rgba(255,255,255,0.02)' : 'rgba(0,212,255,0.06)',
          border: `1px solid ${disabled ? 'rgba(255,255,255,0.05)' : 'rgba(0,212,255,0.15)'}`,
          opacity: disabled || value <= min ? 0.3 : 1,
        }}
      >
        <Minus size={12} className={disabled ? 'text-gray-600' : 'text-[#00d4ff]'} />
      </button>

      <div
        className="w-20 h-9 rounded-lg flex items-center justify-center font-mono text-sm font-bold"
        style={{
          background: disabled ? 'rgba(255,255,255,0.02)' : 'rgba(0,212,255,0.04)',
          border: `1px solid ${disabled ? 'rgba(255,255,255,0.05)' : 'rgba(0,212,255,0.12)'}`,
          color: disabled ? '#555' : '#6ec4d6',
        }}
      >
        {value} {unit}
      </div>

      <button
        onClick={inc}
        disabled={disabled || value >= max}
        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-90"
        style={{
          background: disabled ? 'rgba(255,255,255,0.02)' : 'rgba(0,212,255,0.06)',
          border: `1px solid ${disabled ? 'rgba(255,255,255,0.05)' : 'rgba(0,212,255,0.15)'}`,
          opacity: disabled || value >= max ? 0.3 : 1,
        }}
      >
        <Plus size={12} className={disabled ? 'text-gray-600' : 'text-[#00d4ff]'} />
      </button>
    </div>
  );
};

// ── Per-Exercise Limit Reset (gear icon + modal for a single exercise) ──
export interface SingleExerciseLimitResetProps {
  exercise: 'PUSHUPS' | 'SQUATS' | 'RUNNING';
  dungeonState: DungeonState;
  playerGold: number;
  userId: string;
  onUpdateDungeonState: (updater: (prev: DungeonState) => DungeonState) => void;
  onDeductGold: (amount: number) => void;
}

export const SingleExerciseLimitReset: React.FC<SingleExerciseLimitResetProps> = ({
  exercise,
  dungeonState,
  playerGold,
  userId,
  onUpdateDungeonState,
  onDeductGold,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const config = EXERCISE_CONFIG[exercise];
  if (!config) return null;

  const isRunning = exercise === 'RUNNING';
  const target = dungeonState.targets.find(t => t.exercise === exercise);
  const multiplier = dungeonState.progressionMultiplier || 0.7;

  // Show the CURRENT TARGET values (what user sees on cards), not baselines
  const currentTargetValue = isRunning
    ? (target?.distanceKm ?? dungeonState.baselineRunKm * multiplier)
    : (target?.reps ?? Math.round(
        (exercise === 'PUSHUPS' ? dungeonState.baselinePushups : dungeonState.baselineSquats) * multiplier * 3
      ));

  const [newValue, setNewValue] = useState(currentTargetValue);

  // Reset values when opening — use current target (what's on the card)
  useEffect(() => {
    if (isOpen) {
      setNewValue(currentTargetValue);
      setSuccess(false);
    }
  }, [isOpen]);

  const hasChanged = newValue !== currentTargetValue;
  const canAfford = playerGold >= RESET_COST;

  const handleConfirm = async () => {
    if (!hasChanged || !canAfford || loading) return;
    setLoading(true);
    triggerHaptic('BUTTON_TAP');

    try {
      const { error } = await supabase
        .from('dungeon_limit_resets')
        .insert({
          user_id: userId,
          exercise,
          custom_value: isRunning ? Math.round(newValue * 10) : newValue,
          previous_value: isRunning ? Math.round(currentTargetValue * 10) : currentTargetValue,
          cost_paid: RESET_COST,
        });

      if (error) throw error;

      // Reverse-compute the new baseline from the desired target value
      // target = baseline × multiplier × 3  →  baseline = target / (multiplier × 3)
      onUpdateDungeonState((prev) => {
        const mult = prev.progressionMultiplier || 0.7;
        let bp = prev.baselinePushups;
        let bs = prev.baselineSquats;
        let br = prev.baselineRunKm;

        // Set the new baseline so that baseline × multiplier × 3 (or baseline × multiplier for running) = desired value.
        // We preserve bp, bs, and br as precise floats rather than rounding them. This avoids rounding drift,
        // ensuring that the target is set to EXACTLY newValue when computeTargets(bp, bs, br) runs.
        if (exercise === 'PUSHUPS') bp = newValue / (mult * 3);
        if (exercise === 'SQUATS') bs = newValue / (mult * 3);
        if (exercise === 'RUNNING') br = newValue / mult;

        const fcPushups = prev.targets.find(t => t.exercise === 'PUSHUPS')?.formCoachEnabled ?? true;
        const fcSquats = prev.targets.find(t => t.exercise === 'SQUATS')?.formCoachEnabled ?? true;

        const newTargets = computeTargets(bp, bs, br, mult, fcPushups, fcSquats);

        return {
          ...prev,
          baselinePushups: bp,
          baselineSquats: bs,
          baselineRunKm: br,
          targets: newTargets,
        };
      });

      onDeductGold(RESET_COST);
      setSuccess(true);
      triggerHaptic('SUCCESS');

      setTimeout(() => {
        setIsOpen(false);
        setSuccess(false);
      }, 1500);
    } catch (err) {
      console.error('Failed to save limit reset:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Reset Limit trigger button */}
      <button
        onClick={(e) => { e.stopPropagation(); triggerHaptic('TICK'); setIsOpen(true); }}
        className="px-2.5 py-1.5 rounded-lg flex items-center transition-all active:scale-95 font-mono text-[9px] font-bold tracking-wider uppercase shrink-0"
        style={{
          background: 'rgba(0, 0, 0, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          backdropFilter: 'blur(4px)',
          color: '#cbd5e1',
        }}
      >
        Reset Limit
      </button>

      {/* Modal — rendered via portal to escape transform stacking context */}
      {typeof document !== 'undefined' && ReactDOM.createPortal(
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-5"
            style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)' }}
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="w-full max-w-sm rounded-2xl relative overflow-hidden"
              style={{
                background: '#0c0c14',
                border: '1px solid rgba(0,212,255,0.15)',
                boxShadow: '0 0 60px rgba(0,212,255,0.05)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-5 pb-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)' }}
                    >
                      <Settings size={16} className="text-[#00d4ff]" />
                    </div>
                    <div>
                      <h3 className="text-[15px] font-black text-white uppercase tracking-tight">
                        {config.label}
                      </h3>
                      <p className="text-[9px] text-gray-500 font-mono tracking-wider">
                        {RESET_COST} GOLD PER RESET
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-300 transition-colors"
                    style={{ background: 'rgba(255,255,255,0.04)' }}
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>

              {/* Success overlay */}
              <AnimatePresence>
                {success && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-20 flex flex-col items-center justify-center"
                    style={{ background: 'rgba(12,12,20,0.95)' }}
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                      className="w-16 h-16 rounded-full flex items-center justify-center mb-3"
                      style={{ background: 'rgba(0,212,255,0.1)', border: '2px solid rgba(0,212,255,0.3)' }}
                    >
                      <Check size={28} className="text-[#00d4ff]" strokeWidth={3} />
                    </motion.div>
                    <p className="text-white font-bold text-sm">{config.label} Updated!</p>
                    <p className="text-gray-500 text-[10px] mt-1">-{RESET_COST} Gold deducted</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Exercise control */}
              <div className="px-5 space-y-3 pb-3">

                {/* Rep / Distance control */}
                <div
                  className="rounded-xl p-3.5"
                  style={{
                    background: hasChanged ? 'rgba(0,212,255,0.03)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${hasChanged ? 'rgba(0,212,255,0.15)' : 'rgba(255,255,255,0.05)'}`,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-gray-200">
                        {isRunning ? 'Distance' : 'Rep Count'}
                      </span>
                      <div className="mt-0.5">
                        <span className="text-[8px] text-gray-600 font-mono">
                          Current: {currentTargetValue} {config.unit}
                        </span>
                      </div>
                    </div>
                    <StepperInput
                      value={newValue}
                      onChange={setNewValue}
                      min={config.min}
                      max={config.max}
                      step={config.step}
                      unit={config.unit}
                      disabled={false}
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-5 pt-2">
                {/* Cost summary */}
                {hasChanged && (
                  <div
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl mb-3"
                    style={{
                      background: canAfford ? 'rgba(251,191,36,0.04)' : 'rgba(239,68,68,0.06)',
                      border: `1px solid ${canAfford ? 'rgba(251,191,36,0.12)' : 'rgba(239,68,68,0.15)'}`,
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      <Coins size={12} className={canAfford ? 'text-yellow-500/70' : 'text-red-400/70'} />
                      <span className="text-[10px] font-bold font-mono text-gray-400">
                        Recalibrate {config.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`text-sm font-black font-mono ${canAfford ? 'text-yellow-500' : 'text-red-400'}`}>
                        {RESET_COST}
                      </span>
                      <span className="text-[8px] text-gray-600 font-mono">GOLD</span>
                    </div>
                  </div>
                )}

                {/* Insufficient funds warning */}
                {hasChanged && !canAfford && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg mb-3" style={{ background: 'rgba(239,68,68,0.06)' }}>
                    <AlertTriangle size={12} className="text-red-400/70" />
                    <span className="text-[10px] text-red-400/80">
                      Not enough gold. You have {playerGold.toLocaleString()}.
                    </span>
                  </div>
                )}

                {/* Confirm button */}
                <button
                  onClick={handleConfirm}
                  disabled={!hasChanged || !canAfford || loading}
                  className="w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.97]"
                  style={{
                    background: hasChanged && canAfford
                      ? 'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(0,180,220,0.1))'
                      : 'rgba(255,255,255,0.03)',
                    color: hasChanged && canAfford ? '#6ec4d6' : '#555',
                    border: `1px solid ${hasChanged && canAfford ? 'rgba(0,212,255,0.2)' : 'rgba(255,255,255,0.05)'}`,
                    cursor: !hasChanged || !canAfford ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-4 h-4 rounded-full border-2 border-[#00d4ff] border-t-transparent"
                    />
                  ) : (
                    <>
                      {!hasChanged ? (
                        'Adjust values to recalibrate'
                      ) : !canAfford ? (
                        <>Insufficient Gold</>
                      ) : (
                        <><Settings size={12} /> Confirm Recalibration</>
                      )}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body)}
    </>
  );
};

// ── Legacy Header Gear (kept for backward compat — renders all 3 exercises) ──
interface DungeonLimitResetProps {
  dungeonState: DungeonState;
  playerGold: number;
  userId: string;
  onUpdateDungeonState: (updater: (prev: DungeonState) => DungeonState) => void;
  onDeductGold: (amount: number) => void;
}

const DungeonLimitReset: React.FC<DungeonLimitResetProps> = (props) => {
  // Header gear icon now just opens a combined view — but we keep it as a simple trigger
  // that renders the first exercise's reset (or we can remove it from the header).
  // For now, returning null since per-exercise gears replace this.
  return null;
};

export default DungeonLimitReset;
