/**
 * ── DUNGEON LIMIT RESET MODAL ──
 * Gear icon on dungeon header → opens modal to recalibrate exercise limits.
 * Rules:
 *  - 100 gold per exercise to reset
 *  - 7-day cooldown per exercise after reset
 *  - Saved to Supabase (dungeon_limit_resets table)
 *  - Updates local dungeon baselines immediately
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, X, Lock, Coins, AlertTriangle, Check, Minus, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { triggerHaptic } from '../utils/soundEngine';
import { DungeonState } from '../types';

const RESET_COST = 100; // gold per exercise
const COOLDOWN_DAYS = 7;

interface DungeonLimitResetProps {
  dungeonState: DungeonState;
  playerGold: number;
  userId: string;
  onUpdateDungeonState: (updater: (prev: DungeonState) => DungeonState) => void;
  onDeductGold: (amount: number) => void;
}

interface CooldownInfo {
  exercise: string;
  expiresAt: Date;
  daysLeft: number;
}

const EXERCISE_CONFIG = [
  { key: 'PUSHUPS', label: 'Push-ups', unit: 'reps', min: 5, max: 200, step: 5, field: 'baselinePushups' },
  { key: 'SQUATS', label: 'Squats', unit: 'reps', min: 5, max: 200, step: 5, field: 'baselineSquats' },
  { key: 'RUNNING', label: 'Running', unit: 'km', min: 0.5, max: 20, step: 0.5, field: 'baselineRunKm' },
] as const;

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

const DungeonLimitReset: React.FC<DungeonLimitResetProps> = ({
  dungeonState,
  playerGold,
  userId,
  onUpdateDungeonState,
  onDeductGold,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [cooldowns, setCooldowns] = useState<CooldownInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [values, setValues] = useState<Record<string, number>>({
    PUSHUPS: dungeonState.baselinePushups,
    SQUATS: dungeonState.baselineSquats,
    RUNNING: dungeonState.baselineRunKm,
  });
  const [changedExercises, setChangedExercises] = useState<Set<string>>(new Set());
  const [success, setSuccess] = useState(false);

  // Fetch cooldowns from Supabase
  useEffect(() => {
    if (!isOpen || !userId || userId.startsWith('local')) return;
    (async () => {
      const { data } = await supabase
        .from('dungeon_limit_resets')
        .select('exercise, cooldown_expires_at')
        .eq('user_id', userId)
        .gt('cooldown_expires_at', new Date().toISOString())
        .order('reset_at', { ascending: false });

      if (data) {
        const now = Date.now();
        // Only keep latest per exercise
        const latestByEx: Record<string, CooldownInfo> = {};
        for (const row of data) {
          if (!latestByEx[row.exercise]) {
            const exp = new Date(row.cooldown_expires_at);
            latestByEx[row.exercise] = {
              exercise: row.exercise,
              expiresAt: exp,
              daysLeft: Math.ceil((exp.getTime() - now) / (1000 * 60 * 60 * 24)),
            };
          }
        }
        setCooldowns(Object.values(latestByEx));
      }
    })();
  }, [isOpen, userId]);

  // Reset values when opening
  useEffect(() => {
    if (isOpen) {
      setValues({
        PUSHUPS: dungeonState.baselinePushups,
        SQUATS: dungeonState.baselineSquats,
        RUNNING: dungeonState.baselineRunKm,
      });
      setChangedExercises(new Set());
      setSuccess(false);
    }
  }, [isOpen, dungeonState]);

  const getCooldown = (exercise: string) => cooldowns.find(c => c.exercise === exercise);
  const isLocked = (exercise: string) => !!getCooldown(exercise);

  const handleValueChange = (exercise: string, newValue: number) => {
    setValues(prev => ({ ...prev, [exercise]: newValue }));
    const originalValue = exercise === 'PUSHUPS' ? dungeonState.baselinePushups
      : exercise === 'SQUATS' ? dungeonState.baselineSquats
      : dungeonState.baselineRunKm;

    const changed = new Set(changedExercises);
    if (newValue !== originalValue) {
      changed.add(exercise);
    } else {
      changed.delete(exercise);
    }
    setChangedExercises(changed);
  };

  const totalCost = changedExercises.size * RESET_COST;
  const canAfford = playerGold >= totalCost;

  const handleConfirm = async () => {
    if (changedExercises.size === 0 || !canAfford || loading) return;
    setLoading(true);
    triggerHaptic('BUTTON_TAP');

    try {
      // Insert reset records to Supabase
      const inserts = Array.from(changedExercises).map(exercise => {
        const originalValue = exercise === 'PUSHUPS' ? dungeonState.baselinePushups
          : exercise === 'SQUATS' ? dungeonState.baselineSquats
          : dungeonState.baselineRunKm;

        return {
          user_id: userId,
          exercise,
          custom_value: exercise === 'RUNNING' ? Math.round(values[exercise] * 10) : values[exercise],
          previous_value: exercise === 'RUNNING' ? Math.round(originalValue * 10) : originalValue,
          cost_paid: RESET_COST,
        };
      });

      const { error } = await supabase
        .from('dungeon_limit_resets')
        .insert(inserts);

      if (error) throw error;

      // Update local dungeon state baselines
      onUpdateDungeonState((prev) => {
        const { computeTargets } = require('../lib/dungeonEngine');
        const newPushups = values.PUSHUPS;
        const newSquats = values.SQUATS;
        const newRunKm = values.RUNNING;

        const fcPushups = prev.targets.find(t => t.exercise === 'PUSHUPS')?.formCoachEnabled ?? false;
        const fcSquats = prev.targets.find(t => t.exercise === 'SQUATS')?.formCoachEnabled ?? false;

        return {
          ...prev,
          baselinePushups: newPushups,
          baselineSquats: newSquats,
          baselineRunKm: newRunKm,
          targets: computeTargets(newPushups, newSquats, newRunKm, prev.progressionMultiplier, fcPushups, fcSquats),
        };
      });

      // Deduct gold
      onDeductGold(totalCost);

      setSuccess(true);
      triggerHaptic('SUCCESS');

      // Close after showing success
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
      {/* Gear icon trigger */}
      <button
        onClick={() => { triggerHaptic('TICK'); setIsOpen(true); }}
        className="w-7 h-7 rounded-lg flex items-center justify-center transition-all active:scale-90"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <Settings size={12} className="text-gray-500" />
      </button>

      {/* Modal */}
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
                        Recalibrate Limits
                      </h3>
                      <p className="text-[9px] text-gray-500 font-mono tracking-wider">
                        {RESET_COST} GOLD / EXERCISE • {COOLDOWN_DAYS}-DAY COOLDOWN
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
                    <p className="text-white font-bold text-sm">Limits Updated!</p>
                    <p className="text-gray-500 text-[10px] mt-1">Next reset in {COOLDOWN_DAYS} days</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Exercise rows */}
              <div className="px-5 space-y-3 pb-3">
                {EXERCISE_CONFIG.map((ex) => {
                  const cooldown = getCooldown(ex.key);
                  const locked = isLocked(ex.key);
                  const changed = changedExercises.has(ex.key);
                  const originalValue = ex.key === 'PUSHUPS' ? dungeonState.baselinePushups
                    : ex.key === 'SQUATS' ? dungeonState.baselineSquats
                    : dungeonState.baselineRunKm;

                  return (
                    <div
                      key={ex.key}
                      className="rounded-xl p-3.5"
                      style={{
                        background: locked ? 'rgba(255,255,255,0.02)' : changed ? 'rgba(0,212,255,0.03)' : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${changed ? 'rgba(0,212,255,0.15)' : 'rgba(255,255,255,0.05)'}`,
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className={`text-xs font-bold ${locked ? 'text-gray-500' : 'text-gray-200'}`}>
                            {ex.label}
                          </span>
                          {locked && cooldown && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <Lock size={8} className="text-gray-600" />
                              <span className="text-[8px] text-gray-600 font-mono">
                                Locked — {cooldown.daysLeft}d left
                              </span>
                            </div>
                          )}
                          {changed && !locked && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <Coins size={8} className="text-yellow-500/60" />
                              <span className="text-[8px] text-yellow-500/80 font-mono font-bold">
                                {RESET_COST} gold
                              </span>
                            </div>
                          )}
                          {!changed && !locked && (
                            <div className="mt-0.5">
                              <span className="text-[8px] text-gray-600 font-mono">
                                Current: {originalValue} {ex.unit}
                              </span>
                            </div>
                          )}
                        </div>

                        <StepperInput
                          value={values[ex.key] ?? originalValue}
                          onChange={(v) => handleValueChange(ex.key, v)}
                          min={ex.min}
                          max={ex.max}
                          step={ex.step}
                          unit={ex.unit}
                          disabled={locked}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="p-5 pt-2">
                {/* Cost summary */}
                {changedExercises.size > 0 && (
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
                        {changedExercises.size} exercise{changedExercises.size > 1 ? 's' : ''} × {RESET_COST}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`text-sm font-black font-mono ${canAfford ? 'text-yellow-500' : 'text-red-400'}`}>
                        {totalCost}
                      </span>
                      <span className="text-[8px] text-gray-600 font-mono">GOLD</span>
                    </div>
                  </div>
                )}

                {/* Insufficient funds warning */}
                {changedExercises.size > 0 && !canAfford && (
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
                  disabled={changedExercises.size === 0 || !canAfford || loading}
                  className="w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.97]"
                  style={{
                    background: changedExercises.size > 0 && canAfford
                      ? 'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(0,180,220,0.1))'
                      : 'rgba(255,255,255,0.03)',
                    color: changedExercises.size > 0 && canAfford ? '#6ec4d6' : '#555',
                    border: `1px solid ${changedExercises.size > 0 && canAfford ? 'rgba(0,212,255,0.2)' : 'rgba(255,255,255,0.05)'}`,
                    cursor: changedExercises.size === 0 || !canAfford ? 'not-allowed' : 'pointer',
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
                      {changedExercises.size === 0 ? (
                        'Adjust values to recalibrate'
                      ) : !canAfford ? (
                        <>
                          <Lock size={12} />
                          Insufficient Gold
                        </>
                      ) : (
                        <>
                          <Settings size={12} />
                          Confirm Recalibration
                        </>
                      )}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default DungeonLimitReset;
