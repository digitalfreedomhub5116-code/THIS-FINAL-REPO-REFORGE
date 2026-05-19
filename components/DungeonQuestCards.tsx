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
import { Swords, Check, ChevronRight, Shield, MapPin, AlertTriangle, X } from 'lucide-react';
import { DungeonState, DungeonExerciseTarget } from '../types';
import { getProgressionTier, isDungeonCompletedToday, isExerciseCompletedToday } from '../lib/dungeonEngine';
import { triggerHaptic } from '../utils/soundEngine';
import { SingleExerciseLimitReset } from './DungeonLimitReset';

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
  const targetText = isRunning
    ? `${target.distanceKm || 1} km`
    : `${target.reps} reps × ${target.sets} sets`;

  const showGear = onUpdateDungeonState && onDeductGold && userId;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="relative rounded-2xl overflow-hidden"
      style={{
        minHeight: 150,
        border: isCompleted
          ? '1px solid rgba(0,180,220,0.2)'
          : '1px solid rgba(0,212,255,0.08)',
      }}
    >
      {/* Background image */}
      <div className="absolute inset-0 z-0">
        <img
          src={meta.image}
          alt=""
          className="w-full h-full object-cover transition-opacity duration-700"
          style={{ opacity: imgLoaded ? (isCompleted ? 0.3 : 1) : 0, filter: isCompleted ? 'grayscale(100%) brightness(0.3)' : 'grayscale(100%) brightness(0.4)' }}
          onLoad={() => setImgLoaded(true)}
        />
        {/* Dark blackish overlay — matches promo banners (Scan Food / Store Deals) */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.45) 50%, rgba(0,0,0,0.3) 100%)',
          }}
        />
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
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded" style={{ background: 'rgba(0,180,220,0.08)' }}>
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

// ── Main DungeonQuestCards Component ──
const DungeonQuestCards: React.FC<DungeonQuestCardsProps> = ({
  dungeonState,
  onEnterDungeon,
  onToggleFormCoach,
  playerGold = 0,
  userId = '',
  onUpdateDungeonState,
  onDeductGold,
}) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const allCompletedToday = isDungeonCompletedToday(dungeonState);
  const tier = getProgressionTier(dungeonState);

  // Count per-exercise completions
  const completedCount = dungeonState.targets.filter(
    t => isExerciseCompletedToday(dungeonState, t.exercise)
  ).length;
  const totalCount = dungeonState.targets.length;
  const hasPartialProgress = completedCount > 0 && completedCount < totalCount;

  const handleEnterClick = () => {
    triggerHaptic('BUTTON_TAP');
    setShowConfirm(true);
  };

  const handleConfirmEnter = () => {
    setShowConfirm(false);
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
            <motion.button
              key="enter"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleEnterClick}
              className="w-full flex items-center justify-center gap-2.5 py-4 rounded-xl font-bold text-sm uppercase tracking-wider transition-all"
              style={{
                background: 'linear-gradient(135deg, rgba(0,180,220,0.15) 0%, rgba(0,140,180,0.1) 100%)',
                color: '#6ec4d6',
                border: '1px solid rgba(0,180,220,0.15)',
              }}
            >
              <Swords size={14} />
              {hasPartialProgress ? 'Resume Dungeon' : 'Enter Dungeon'}
              <ChevronRight size={13} strokeWidth={3} />
            </motion.button>
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
    </>
  );
};

export default DungeonQuestCards;
