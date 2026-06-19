/**
 * ── DUNGEON QUEST CARDS ──
 * RPG-styled quest cards for the Sung Jin-woo Daily Dungeon.
 * Each exercise gets its own visual card with background art.
 * Muted design — soft cyan/gray palette, restful for the eyes.
 *
 * Features:
 * - Per-exercise completion tracking (not all-or-nothing)
 * - Enter dungeon confirmation popup
 * - AI Coach toggle that opens camera mode for that exercise
 * - Cyan accent border on the dungeon container
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Check, Shield, MapPin, AlertTriangle, X, Plus, Trash2 } from 'lucide-react';
import { DungeonState, DungeonExerciseTarget, DungeonCustomExercise } from '../types';
import { getProgressionTier, isDungeonCompletedToday, isExerciseCompletedToday, addCustomDungeonExercise, removeCustomDungeonExercise } from '../lib/dungeonEngine';
import { triggerHaptic } from '../utils/soundEngine';
import { SingleExerciseLimitReset } from './DungeonLimitReset';
import { AD_UNITS } from '../hooks/useAdMob';
import HudButton from './HudButton';
import DungeonAddExercise from './DungeonAddExercise';

const EXERCISE_META: Record<string, {
  label: string;
  subtitle: string;
  image: string;
}> = {
  PUSHUPS: {
    label: 'Push-ups',
    subtitle: 'Upper body strength protocol',
    image: '/dungeon/pushups.jpeg',
  },
  SITUPS: {
    label: 'Sit-ups',
    subtitle: 'Core stability protocol',
    image: '/dungeon/situps.jpeg',
  },
  SQUATS: {
    label: 'Squats',
    subtitle: 'Lower body power training',
    image: '/dungeon/squats.jpeg',
  },
  RUNNING: {
    label: 'Running',
    subtitle: 'Cardio endurance drill',
    image: '/dungeon/running.jpeg',
  },
};

interface DungeonQuestCardsProps {
  dungeonState: DungeonState;
  onEnterDungeon: () => void;
  onToggleFormCoach: (exercise: 'PUSHUPS' | 'SQUATS') => void;
  playerGold?: number;
  userId?: string;
  onUpdateDungeonState?: (updater: (prev: DungeonState) => DungeonState) => void;
  onDeductGold?: (amount: number) => void;
  /** Called before entering dungeon; shows rewarded ad, user always enters after */
  showRewardedAd?: (adUnitId: string) => Promise<{ rewarded: boolean; type?: string; amount?: number }>;
  /** When true (Reforge Pro / VIP), skip the pre-entry rewarded ad */
  isPremium?: boolean;
}

// ── iOS-style AI Coach Toggle ──
const AICoachToggle: React.FC<{ enabled: boolean; onToggle: () => void }> = ({ enabled, onToggle }) => (
  <button
    onClick={(e) => { e.stopPropagation(); triggerHaptic('TICK'); onToggle(); }}
    className="flex items-center gap-2 transition-all active:scale-95"
  >
    <div
      className="relative w-[38px] h-[20px] rounded-full transition-all"
      style={{
        background: enabled
          ? '#000000'
          : 'rgba(0,0,0,0.6)',
      }}
    >
      <motion.div
        className="absolute top-[2px] w-[16px] h-[16px] rounded-full shadow-sm"
        style={{ background: enabled ? '#ffffff' : '#999' }}
        animate={{ left: enabled ? 20 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </div>
    <span
      className="text-[9px] font-mono font-black tracking-wider uppercase"
      style={{ color: '#000000', textShadow: 'none' }}
    >
      AI Coach
    </span>
  </button>
);

// ── Enter Dungeon Confirmation Popup ──
const EnterConfirmPopup: React.FC<{
  onConfirm: () => void;
  onCancel: () => void;
  tier: { label: string; color: string };
}> = ({ onConfirm, onCancel, tier }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-[150] flex items-center justify-center p-6"
    style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
    onClick={onCancel}
  >
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="w-full max-w-sm rounded-2xl p-6 relative"
      style={{
        background: '#0c0c14',
        border: '1px solid rgba(0,180,220,0.2)',
        boxShadow: '0 0 40px rgba(0,212,255,0.06)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Close */}
      <button
        onClick={onCancel}
        className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center text-gray-600 hover:text-gray-300 transition-colors"
        style={{ background: 'rgba(255,255,255,0.05)' }}
      >
        <X size={12} />
      </button>

      {/* Icon */}
      <div className="flex justify-center mb-4">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(0,180,220,0.08)', border: '1px solid rgba(0,180,220,0.2)' }}
        >
          <Swords size={24} style={{ color: '#5ab8cc' }} />
        </div>
      </div>

      {/* Text */}
      <h3 className="text-center text-lg font-black text-white uppercase tracking-tight mb-1">
        Enter Dungeon?
      </h3>
      <p className="text-center text-[11px] text-gray-500 mb-1">
        Sung Jin-woo Protocol • <span style={{ color: tier.color }}>{tier.label}</span>
      </p>
      <p className="text-center text-[10px] text-gray-600 mb-5">
        Complete all exercises to clear the dungeon.
        <br />You can leave and resume later — progress is saved per exercise.
      </p>

      {/* Buttons */}
      <div className="flex gap-2.5">
        <button
          onClick={onCancel}
          className="flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-gray-400 transition-all active:scale-95"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          Not yet
        </button>
        <button
          onClick={() => { triggerHaptic('BUTTON_TAP'); onConfirm(); }}
          className="flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-1.5"
          style={{
            background: 'linear-gradient(135deg, rgba(0,180,220,0.2) 0%, rgba(0,140,180,0.15) 100%)',
            color: '#6ec4d6',
            border: '1px solid rgba(0,180,220,0.2)',
          }}
        >
          <Swords size={12} />
          Enter
        </button>
      </div>
    </motion.div>
  </motion.div>
);

// ── HUD Card Border overlay component ──
const HudCardBorder: React.FC<{ isCompleted: boolean }> = ({ isCompleted }) => {
  const NAVY_GLOW = '#2e5b88';
  const COMPLETED_COLOR = 'rgba(31, 64, 104, 0.4)';

  const strokeColor = isCompleted ? COMPLETED_COLOR : NAVY_GLOW;
  const strokeOpacity = isCompleted ? 0.4 : 0.9;

  return (
    <svg
      viewBox="0 0 200 50"
      preserveAspectRatio="none"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 5,
      }}
      aria-hidden="true"
    >
      <defs>
        <filter id="hud-glow-card" x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="0.7" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="hud-fill-card" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={isCompleted ? "rgba(15, 23, 42, 0.15)" : "rgba(31, 64, 104, 0.12)"} />
          <stop offset="1" stopColor={isCompleted ? "rgba(15, 23, 42, 0.03)" : "rgba(31, 64, 104, 0.03)"} />
        </linearGradient>
      </defs>

      {/* Outer chamfered plate — single closed path with notched corners */}
      {(() => {
        const W = 200;
        const H = 50;
        const c = 6; // chamfer size
        const path = [
          `M ${c},0`,
          `L ${W - c},0`,
          `L ${W},${c}`,
          `L ${W},${H - c}`,
          `L ${W - c},${H}`,
          `L ${c},${H}`,
          `L 0,${H - c}`,
          `L 0,${c}`,
          'Z',
        ].join(' ');
        // Inner double-line bevel (offset inwards)
        const ic = c - 2; // tighter chamfer for the inner stroke
        const inset = 3;
        const innerPath = [
          `M ${ic + inset},${inset}`,
          `L ${W - ic - inset},${inset}`,
          `L ${W - inset},${ic + inset}`,
          `L ${W - inset},${H - ic - inset}`,
          `L ${W - ic - inset},${H - inset}`,
          `L ${ic + inset},${H - inset}`,
          `L ${inset},${H - ic - inset}`,
          `L ${inset},${ic + inset}`,
          'Z',
        ].join(' ');
        return (
          <>
            {/* fill */}
            <path d={path} fill="url(#hud-fill-card)" />
            {/* outer glowing stroke */}
            <path
              d={path}
              fill="none"
              stroke={strokeColor}
              strokeWidth="1.4"
              strokeOpacity={strokeOpacity}
              vectorEffect="non-scaling-stroke"
              filter={isCompleted ? undefined : "url(#hud-glow-card)"}
            />
            {/* outer halo */}
            <path
              d={path}
              fill="none"
              stroke={strokeColor}
              strokeWidth="0.6"
              strokeOpacity={isCompleted ? 0.2 : 0.25}
              vectorEffect="non-scaling-stroke"
            />
            {/* inner thin bevel */}
            <path
              d={innerPath}
              fill="none"
              stroke={strokeColor}
              strokeWidth="0.6"
              strokeOpacity={isCompleted ? 0.3 : 0.45}
              vectorEffect="non-scaling-stroke"
            />
          </>
        );
      })()}

      {/* Corner alignment brackets (top-left + bottom-right) */}
      {(() => {
        const arm = 10;
        const off = 1.5;
        const brkStyle = {
          stroke: strokeColor,
          strokeWidth: 1.2,
          strokeOpacity: isCompleted ? 0.4 : 0.6,
          fill: 'none',
          vectorEffect: 'non-scaling-stroke' as const,
        };
        return (
          <g>
            {/* top-left */}
            <path d={`M ${off + arm} ${off} L ${off} ${off} L ${off} ${off + arm}`} {...brkStyle} />
            {/* bottom-right */}
            <path
              d={`M ${200 - off - arm} ${50 - off} L ${200 - off} ${50 - off} L ${200 - off} ${50 - off - arm}`}
              {...brkStyle}
            />
          </g>
        );
      })()}
    </svg>
  );
};

// ── Individual Exercise Card ──
const ExerciseCard: React.FC<{
  target: DungeonExerciseTarget;
  dungeonState: DungeonState;
  isCompleted: boolean;
  onToggleCoach?: () => void;
  index: number;
  playerGold?: number;
  userId?: string;
  onUpdateDungeonState?: (updater: (prev: DungeonState) => DungeonState) => void;
  onDeductGold?: (amount: number) => void;
}> = ({ target, dungeonState, isCompleted, onToggleCoach, index, playerGold, userId, onUpdateDungeonState, onDeductGold }) => {
  const [imgLoaded, setImgLoaded] = useState(false);
  const meta = EXERCISE_META[target.exercise];
  if (!meta) return null;

  const isRunning = target.exercise === 'RUNNING';
  const isCore = target.exercise === 'PUSHUPS' || target.exercise === 'SQUATS' || target.exercise === 'SITUPS';
  const targetText = isRunning
    ? `${target.distanceKm || 1} km`
    : isCore
      ? `${target.reps} Reps`
      : `${target.reps} reps × ${target.sets} sets`;

  const showGear = onUpdateDungeonState && onDeductGold && userId;

  // FEATURE TOGGLES: Enable/disable the dark blackish overlay individually per exercise
  const ENABLE_OVERLAY_PUSHUPS = false;
  const ENABLE_OVERLAY_SQUATS = false;
  const ENABLE_OVERLAY_RUNNING = false;
  
  const isOverlayEnabled = 
    (target.exercise === 'PUSHUPS' && ENABLE_OVERLAY_PUSHUPS) ||
    (target.exercise === 'SQUATS' && ENABLE_OVERLAY_SQUATS) ||
    (target.exercise === 'RUNNING' && ENABLE_OVERLAY_RUNNING);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="relative overflow-hidden"
      style={{
        minHeight: 150,
        background: 'transparent',
        clipPath: 'polygon(3.5% 0%, 96.5% 0%, 100% 14%, 100% 86%, 96.5% 100%, 3.5% 100%, 0% 86%, 0% 14%)',
        WebkitClipPath: 'polygon(3.5% 0%, 96.5% 0%, 100% 14%, 100% 86%, 96.5% 100%, 3.5% 100%, 0% 86%, 0% 14%)',
      }}
    >
      <HudCardBorder isCompleted={isCompleted} />

      {/* Background image */}
      <div className="absolute inset-0 z-0">
        <img
          src={meta.image}
          alt=""
          className="w-full h-full object-cover transition-opacity duration-700"
          style={{ objectPosition: 'center 15%', opacity: imgLoaded ? (isCompleted ? 0.3 : 1) : 0, filter: isOverlayEnabled ? (isCompleted ? 'grayscale(100%) brightness(0.3)' : 'grayscale(100%) brightness(0.4)') : (isCompleted ? 'grayscale(100%) brightness(0.4)' : 'grayscale(100%) brightness(0.9)') }}
          onLoad={() => setImgLoaded(true)}
        />
        {/* Overlay (subtle vs dark blackish) */}
        {isOverlayEnabled ? (
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.45) 50%, rgba(0,0,0,0.3) 100%)',
            }}
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(180deg, rgba(10,10,20,0.05) 0%, rgba(10,10,20,0.15) 40%, rgba(8,8,16,0.55) 100%)',
            }}
          />
        )}
      </div>

      <div className="relative z-10 p-5 flex flex-col justify-between" style={{ minHeight: 150, textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}>
        {/* Top: Title + cleared badge + gear icon */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2.5">
              <h3 className={`text-xl font-black tracking-tight leading-tight ${isCompleted ? 'text-gray-500' : 'text-white'}`}>
                {meta.label}
              </h3>
              {isCompleted && (
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded" style={{ background: 'rgba(0,180,220,0.08)', textShadow: 'none' }}>
                  <Check size={9} style={{ color: '#5ab8cc' }} strokeWidth={3} />
                  <span className="text-[7px] font-bold tracking-wider" style={{ color: '#5ab8cc' }}>CLEARED</span>
                </div>
              )}
            </div>
            {/* Per-exercise gear icon for limit reset */}
            {showGear && (
              <SingleExerciseLimitReset
                exercise={target.exercise}
                dungeonState={dungeonState}
                playerGold={playerGold ?? 0}
                userId={userId!}
                onUpdateDungeonState={onUpdateDungeonState!}
                onDeductGold={onDeductGold!}
              />
            )}
          </div>
        </div>

        {/* Middle: Target value + AI coach toggle / GPS indicator */}
        <div className="flex items-center justify-between mt-3 mb-1">
          <div className="flex items-center gap-2">
            <span
              className="text-sm font-bold font-mono tracking-wide"
              style={{ color: isCompleted ? '#888' : '#ffffff', textDecoration: isCompleted ? 'line-through' : 'none' }}
            >
              {targetText}
            </span>

          </div>

          {!isRunning && onToggleCoach && !isCompleted && (
            <AICoachToggle enabled={target.formCoachEnabled} onToggle={onToggleCoach} />
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ── Custom (user-added) Exercise Card ──
const CustomExerciseCard: React.FC<{
  exercise: DungeonCustomExercise;
  isCompleted: boolean;
  index: number;
  onRemove?: () => void;
}> = ({ exercise, isCompleted, index, onRemove }) => {
  const isCardio = exercise.type === 'CARDIO';
  const targetText = isCardio && exercise.distanceKm
    ? `${exercise.distanceKm} km`
    : `${exercise.reps} reps × ${exercise.sets} sets`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginTop: 0 }}
      transition={{ delay: index * 0.04 }}
      className="relative overflow-hidden"
      style={{
        minHeight: 96,
        background: 'rgba(8,8,16,0.5)',
        clipPath: 'polygon(3.5% 0%, 96.5% 0%, 100% 14%, 100% 86%, 96.5% 100%, 3.5% 100%, 0% 86%, 0% 14%)',
        WebkitClipPath: 'polygon(3.5% 0%, 96.5% 0%, 100% 14%, 100% 86%, 96.5% 100%, 3.5% 100%, 0% 86%, 0% 14%)',
      }}
    >
      <HudCardBorder isCompleted={isCompleted} />

      <div className="relative z-10 p-4 flex flex-col justify-between" style={{ minHeight: 96 }}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.18)' }}>
              <Swords size={14} style={{ color: '#5ab8cc' }} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className={`text-base font-black tracking-tight leading-tight truncate ${isCompleted ? 'text-gray-500' : 'text-white'}`}>
                  {exercise.name}
                </h3>
                {isCompleted && (
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded shrink-0" style={{ background: 'rgba(0,180,220,0.08)' }}>
                    <Check size={9} style={{ color: '#5ab8cc' }} strokeWidth={3} />
                    <span className="text-[7px] font-bold tracking-wider" style={{ color: '#5ab8cc' }}>CLEARED</span>
                  </div>
                )}
              </div>
              {exercise.muscleGroup && (
                <div className="text-[9px] text-gray-500 font-mono uppercase tracking-wider mt-0.5">{exercise.muscleGroup}</div>
              )}
            </div>
          </div>
          {/* Remove button — only when not completed */}
          {onRemove && !isCompleted && (
            <button
              onClick={(e) => { e.stopPropagation(); triggerHaptic('TICK'); onRemove(); }}
              className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-gray-600 hover:text-red-400 transition-colors"
              style={{ background: 'rgba(255,255,255,0.03)', zIndex: 10 }}
              aria-label="Remove exercise"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
        <div className="mt-3">
          <span
            className="text-sm font-bold font-mono tracking-wide"
            style={{ color: isCompleted ? '#888' : '#ffffff', textDecoration: isCompleted ? 'line-through' : 'none' }}
          >
            {targetText}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

// ── Main DungeonQuestCards Component ──
const DungeonQuestCards: React.FC<DungeonQuestCardsProps> = ({
  dungeonState,
  onEnterDungeon,
  onToggleFormCoach,
  playerGold = 0,
  userId = '',
  onUpdateDungeonState,
  onDeductGold,
  showRewardedAd,
  isPremium = false,
}) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [adLoading, setAdLoading] = useState(false);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const allCompletedToday = isDungeonCompletedToday(dungeonState);
  const tier = getProgressionTier(dungeonState);

  const customExercises = dungeonState.customExercises || [];

  // Count per-exercise completions (base + custom)
  const completedBase = dungeonState.targets.filter(
    t => isExerciseCompletedToday(dungeonState, t.exercise)
  ).length;
  const completedCustom = customExercises.filter(
    c => isExerciseCompletedToday(dungeonState, c.id)
  ).length;
  const completedCount = completedBase + completedCustom;
  const totalCount = dungeonState.targets.length + customExercises.length;
  const hasPartialProgress = completedCount > 0 && completedCount < totalCount;

  // Names already in the dungeon (base + custom) — used to disable duplicates
  // in the exercise picker.
  const baseNames = dungeonState.targets.map(t => {
    const meta = EXERCISE_META[t.exercise];
    return meta ? meta.label : t.exercise;
  });
  const existingNames = [...baseNames, ...customExercises.map(c => c.name)];

  const canManageCustom = Boolean(onUpdateDungeonState);

  const handleAddExercises = (toAdd: Omit<DungeonCustomExercise, 'id' | 'addedAt'>[]) => {
    if (!onUpdateDungeonState) return;
    onUpdateDungeonState(prev => {
      let next = prev;
      for (const ex of toAdd) next = addCustomDungeonExercise(next, ex);
      return next;
    });
    triggerHaptic('BUTTON_TAP');
  };

  const handleRemoveCustom = (id: string) => {
    if (!onUpdateDungeonState) return;
    onUpdateDungeonState(prev => removeCustomDungeonExercise(prev, id));
  };

  const handleEnterClick = () => {
    triggerHaptic('BUTTON_TAP');
    setShowConfirm(true);
  };

  const handleConfirmEnter = async () => {
    setShowConfirm(false);
    // Mandatory rewarded ad before entering dungeon for non-premium users.
    // If the ad fails to load, allow entry (per product spec — never block on
    // ad infrastructure issues). Premium users always skip the ad.
    if (!isPremium && showRewardedAd) {
      setAdLoading(true);
      try {
        await showRewardedAd(AD_UNITS.KEY_REWARD);
      } catch {
        /* ad infrastructure failed — allow entry anyway */
      } finally {
        setAdLoading(false);
      }
    }
    onEnterDungeon();
  };

  return (
    <>
      {/* Cyan-bordered dungeon container */}
      <div
        className="rounded-2xl p-3 space-y-3"
        style={{
          border: '1px solid rgba(0,212,255,0.12)',
          background: 'rgba(0,212,255,0.01)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-1 mb-1">
          <div className="flex items-center gap-2.5">
            <Swords size={13} style={{ color: '#5ab8cc' }} />
            <div>
              <div className="text-[8px] font-mono uppercase tracking-[0.25em] text-gray-600">Daily Dungeon</div>
              <div className="text-sm font-bold text-gray-200 tracking-tight">Sung Jin-woo Protocol</div>
            </div>
          </div>
        </div>

        {/* Per-exercise progress indicator (only when partial) */}
        {hasPartialProgress && (
          <div className="flex items-center gap-2 px-1">
            <div className="flex-1 h-1 rounded-full bg-gray-800/50 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg, #00d4ff, #0099cc)' }}
                initial={{ width: 0 }}
                animate={{ width: `${(completedCount / totalCount) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <span className="text-[8px] font-mono text-gray-500">{completedCount}/{totalCount}</span>
          </div>
        )}

        {/* Exercise cards — each shows individual completion */}
        {dungeonState.targets.map((target, i) => (
          <ExerciseCard
            key={target.exercise}
            target={target}
            dungeonState={dungeonState}
            isCompleted={isExerciseCompletedToday(dungeonState, target.exercise)}
            index={i}
            onToggleCoach={
              target.exercise === 'PUSHUPS' || target.exercise === 'SQUATS'
                ? () => onToggleFormCoach(target.exercise as 'PUSHUPS' | 'SQUATS')
                : undefined
            }
            playerGold={playerGold}
            userId={userId}
            onUpdateDungeonState={onUpdateDungeonState}
            onDeductGold={onDeductGold}
          />
        ))}

        {/* Custom (user-added) exercise cards */}
        <AnimatePresence>
          {customExercises.map((ex, i) => (
            <CustomExerciseCard
              key={ex.id}
              exercise={ex}
              isCompleted={isExerciseCompletedToday(dungeonState, ex.id)}
              index={i}
              onRemove={canManageCustom ? () => handleRemoveCustom(ex.id) : undefined}
            />
          ))}
        </AnimatePresence>

        {/* Add More Exercise button — opens the exercise picker */}
        {canManageCustom && !allCompletedToday && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { triggerHaptic('TICK'); setShowAddExercise(true); }}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-xs uppercase tracking-[0.2em] transition-all"
            style={{
              background: 'rgba(0,212,255,0.03)',
              border: '1px dashed rgba(0,212,255,0.3)',
              color: '#5ab8cc',
            }}
          >
            <Plus size={15} strokeWidth={2.6} />
            Add More Exercise
          </motion.button>
        )}

        {/* Enter Dungeon / Cleared */}
        <AnimatePresence mode="wait">
          {allCompletedToday ? (
            <motion.div
              key="completed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center gap-2.5 py-3.5 rounded-xl"
              style={{
                background: 'rgba(0,180,220,0.03)',
                border: '1px solid rgba(0,180,220,0.08)',
              }}
            >
              <Check size={13} style={{ color: '#5ab8cc' }} strokeWidth={3} />
              <span className="text-[11px] font-bold font-mono uppercase tracking-[0.2em]" style={{ color: '#5ab8cc' }}>
                Dungeon Cleared
              </span>
            </motion.div>
          ) : (
            <motion.div
              key="enter"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full"
            >
              <HudButton
                label={hasPartialProgress ? 'RESUME DUNGEON' : 'ENTER DUNGEON'}
                icon={<Swords size={16} strokeWidth={2.4} />}
                onClick={handleEnterClick}
                ratio={5}
                ariaLabel={hasPartialProgress ? 'Resume Dungeon' : 'Enter Dungeon'}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Confirmation popup */}
      <AnimatePresence>
        {showConfirm && (
          <EnterConfirmPopup
            onConfirm={handleConfirmEnter}
            onCancel={() => setShowConfirm(false)}
            tier={tier}
          />
        )}
      </AnimatePresence>

      {/* Add-exercise picker */}
      <AnimatePresence>
        {showAddExercise && (
          <DungeonAddExercise
            existingNames={existingNames}
            onClose={() => setShowAddExercise(false)}
            onAdd={handleAddExercises}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default DungeonQuestCards;
