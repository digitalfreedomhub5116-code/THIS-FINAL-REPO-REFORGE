/**
 * ── DUNGEON QUEST CARDS ──
 * RPG-styled quest cards for the Sung Jin-woo Daily Dungeon.
 * Each exercise gets its own visual card with background art.
 * Design inspired by habit-tracker quest cards with RPG aesthetics.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Zap, Camera, CameraOff, Check, ChevronRight, TrendingUp, Flame, Trophy, Shield } from 'lucide-react';
import { DungeonState, DungeonExerciseTarget } from '../types';
import { getProgressionTier, isDungeonCompletedToday } from '../lib/dungeonEngine';

const EXERCISE_META: Record<string, {
  label: string;
  subtitle: string;
  icon: string;
  image: string;
  accentColor: string;
}> = {
  PUSHUPS: {
    label: 'Push-ups',
    subtitle: 'Upper body dominance.',
    icon: '💪',
    image: '/dungeon/pushups.webp',
    accentColor: '#00d4ff',
  },
  SQUATS: {
    label: 'Squats',
    subtitle: 'Legs of a warrior.',
    icon: '🦵',
    image: '/dungeon/squats.webp',
    accentColor: '#34d399',
  },
  RUNNING: {
    label: 'Running',
    subtitle: 'Endurance protocol.',
    icon: '🏃',
    image: '/dungeon/running.webp',
    accentColor: '#818cf8',
  },
};

// ── Difficulty Stars ──
const DifficultyStars: React.FC<{ level: number; maxLevel?: number; color: string }> = ({ level, maxLevel = 5, color }) => (
  <div className="flex items-center gap-0.5">
    {Array.from({ length: maxLevel }).map((_, i) => (
      <span key={i} style={{ color: i < level ? color : '#333', fontSize: 10, lineHeight: 1 }}>★</span>
    ))}
  </div>
);

interface DungeonQuestCardsProps {
  dungeonState: DungeonState;
  onEnterDungeon: () => void;
  onToggleFormCoach: (exercise: 'PUSHUPS' | 'SQUATS') => void;
}

// ── Individual Exercise Card (inspired by the habit-tracker card design) ──
const ExerciseCard: React.FC<{
  target: DungeonExerciseTarget;
  dungeonState: DungeonState;
  isCompleted: boolean;
  onToggleCoach?: () => void;
  index: number;
}> = ({ target, dungeonState, isCompleted, onToggleCoach, index }) => {
  const [imgLoaded, setImgLoaded] = useState(false);
  const meta = EXERCISE_META[target.exercise];
  if (!meta) return null;

  const isRunning = target.exercise === 'RUNNING';
  const targetText = isRunning
    ? `${target.durationMinutes} min`
    : `${target.reps} reps × ${target.sets} sets`;

  // Difficulty: based on progression multiplier mapping
  const diffLevel = Math.min(5, Math.ceil(dungeonState.progressionMultiplier * 3.5));

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="relative rounded-2xl overflow-hidden"
      style={{
        border: isCompleted
          ? '1px solid rgba(34,197,94,0.2)'
          : `1px solid ${meta.accentColor}18`,
      }}
    >
      {/* Background image */}
      <div className="absolute inset-0 z-0">
        <img
          src={meta.image}
          alt=""
          className="w-full h-full object-cover transition-opacity duration-700"
          style={{ opacity: imgLoaded ? 0.35 : 0, filter: 'saturate(0.8)' }}
          onLoad={() => setImgLoaded(true)}
        />
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(8,8,20,0.88) 55%, rgba(6,6,14,0.98) 100%)`,
          }}
        />
      </div>

      {/* Completed shimmer */}
      {isCompleted && (
        <div className="absolute inset-0 z-[1] pointer-events-none" style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.06) 0%, transparent 50%)' }} />
      )}

      <div className="relative z-10 p-4">
        {/* Icon + title row */}
        <div className="flex items-start gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
            style={{
              background: `${meta.accentColor}12`,
              border: `1px solid ${meta.accentColor}28`,
              boxShadow: `0 0 12px ${meta.accentColor}10`,
            }}
          >
            {meta.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-black text-white tracking-tight">{meta.label}</h4>
              {isCompleted && (
                <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(34,197,94,0.12)' }}>
                  <Check size={8} className="text-green-400" strokeWidth={3} />
                  <span className="text-[7px] text-green-400 font-black">CLEARED</span>
                </div>
              )}
            </div>
            <p className="text-[10px] text-gray-400 font-mono">{meta.subtitle}</p>
          </div>
        </div>

        {/* Target display */}
        <div
          className="flex items-center justify-between px-3 py-2.5 rounded-xl mb-3"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <span className="text-xs font-black font-mono" style={{ color: meta.accentColor }}>
            {targetText}
          </span>

          {/* AI Coach toggle */}
          {!isRunning && onToggleCoach && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleCoach(); }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[8px] font-bold font-mono uppercase tracking-wider transition-all active:scale-95"
              style={{
                background: target.formCoachEnabled ? 'rgba(249,115,22,0.12)' : 'rgba(255,255,255,0.04)',
                border: target.formCoachEnabled ? '1px solid rgba(249,115,22,0.3)' : '1px solid rgba(255,255,255,0.08)',
                color: target.formCoachEnabled ? '#f97316' : '#6b7280',
              }}
            >
              {target.formCoachEnabled ? <Camera size={9} /> : <CameraOff size={9} />}
              AI Coach
            </button>
          )}
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-gray-500 font-mono">Streak</span>
            <span className="text-[10px] font-black text-white font-mono">
              {dungeonState.consecutiveCompletions} days
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-gray-500 font-mono">Repeat</span>
            <span className="text-[10px] font-black text-white font-mono">Everyday</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-gray-500 font-mono">Difficulty</span>
            <DifficultyStars level={diffLevel} color={meta.accentColor} />
          </div>
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
}) => {
  const completedToday = isDungeonCompletedToday(dungeonState);
  const tier = getProgressionTier(dungeonState);

  return (
    <div className="space-y-3">
      {/* Header bar */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)' }}>
            <Swords size={12} className="text-[#00d4ff]" />
          </div>
          <div>
            <div className="text-[9px] font-black font-mono uppercase tracking-[0.2em] text-[#00d4ff]/70">Daily Dungeon</div>
            <div className="text-xs font-black text-white tracking-tight -mt-0.5">Sung Jin-woo Protocol</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Stats badges */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <Flame size={9} className="text-orange-400" />
            <span className="text-[9px] font-mono font-bold text-gray-300">Day {dungeonState.currentDay}</span>
          </div>
          <div
            className="flex items-center gap-1 px-2 py-1 rounded-lg"
            style={{
              background: `${tier.color}10`,
              border: `1px solid ${tier.color}25`,
            }}
          >
            <Shield size={9} style={{ color: tier.color }} />
            <span className="text-[9px] font-black font-mono" style={{ color: tier.color }}>{tier.label}</span>
          </div>
        </div>
      </div>

      {/* Individual exercise cards */}
      {dungeonState.targets.map((target, i) => (
        <ExerciseCard
          key={target.exercise}
          target={target}
          dungeonState={dungeonState}
          isCompleted={completedToday}
          index={i}
          onToggleCoach={
            target.exercise === 'PUSHUPS' || target.exercise === 'SQUATS'
              ? () => onToggleFormCoach(target.exercise as 'PUSHUPS' | 'SQUATS')
              : undefined
          }
        />
      ))}

      {/* Enter Dungeon / Cleared button */}
      <AnimatePresence mode="wait">
        {completedToday ? (
          <motion.div
            key="completed"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-2 py-3.5 rounded-xl"
            style={{
              background: 'rgba(34,197,94,0.06)',
              border: '1px solid rgba(34,197,94,0.15)',
            }}
          >
            <Check size={14} className="text-green-400" strokeWidth={3} />
            <span className="text-xs font-black font-mono text-green-400 uppercase tracking-[0.25em]">
              DUNGEON CLEARED
            </span>
            <Trophy size={12} className="text-green-400/60" />
          </motion.div>
        ) : (
          <motion.button
            key="enter"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            whileTap={{ scale: 0.97 }}
            onClick={onEnterDungeon}
            className="w-full flex items-center justify-center gap-2.5 py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)',
              color: '#000',
              boxShadow: '0 0 25px rgba(0,212,255,0.25), inset 0 1px 0 rgba(255,255,255,0.2)',
            }}
          >
            <Swords size={16} />
            Enter Dungeon
            <ChevronRight size={14} strokeWidth={3} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DungeonQuestCards;
