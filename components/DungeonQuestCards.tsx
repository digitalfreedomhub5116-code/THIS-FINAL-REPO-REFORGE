/**
 * ── DUNGEON QUEST CARDS ──
 * RPG-styled quest cards for the Sung Jin-woo Daily Dungeon.
 * Each exercise gets its own visual card with background art.
 * Clean design with clear visual hierarchy.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Camera, CameraOff, Check, ChevronRight, TrendingUp, Shield, Trophy } from 'lucide-react';
import { DungeonState, DungeonExerciseTarget } from '../types';
import { getProgressionTier, isDungeonCompletedToday } from '../lib/dungeonEngine';

const EXERCISE_META: Record<string, {
  label: string;
  subtitle: string;
  image: string;
  accentColor: string;
}> = {
  PUSHUPS: {
    label: 'Push-ups',
    subtitle: 'Upper body strength protocol',
    image: '/dungeon/pushups.webp',
    accentColor: '#00d4ff',
  },
  SQUATS: {
    label: 'Squats',
    subtitle: 'Lower body power training',
    image: '/dungeon/squats.webp',
    accentColor: '#34d399',
  },
  RUNNING: {
    label: 'Running',
    subtitle: 'Cardio endurance drill',
    image: '/dungeon/running.webp',
    accentColor: '#818cf8',
  },
};

// ── Difficulty dots ──
const DifficultyDots: React.FC<{ level: number; max?: number; color: string }> = ({ level, max = 5, color }) => (
  <div className="flex items-center gap-1">
    {Array.from({ length: max }).map((_, i) => (
      <div
        key={i}
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: i < level ? color : 'rgba(255,255,255,0.08)' }}
      />
    ))}
  </div>
);

interface DungeonQuestCardsProps {
  dungeonState: DungeonState;
  onEnterDungeon: () => void;
  onToggleFormCoach: (exercise: 'PUSHUPS' | 'SQUATS') => void;
}

// ── Individual Exercise Card ──
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

  const diffLevel = Math.min(5, Math.ceil(dungeonState.progressionMultiplier * 3.5));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="relative rounded-2xl overflow-hidden"
      style={{
        minHeight: 180,
        border: isCompleted
          ? '1px solid rgba(34,197,94,0.15)'
          : '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Background image */}
      <div className="absolute inset-0 z-0">
        <img
          src={meta.image}
          alt=""
          className="w-full h-full object-cover transition-opacity duration-700"
          style={{ opacity: imgLoaded ? 0.25 : 0, filter: 'saturate(0.7) brightness(0.9)' }}
          onLoad={() => setImgLoaded(true)}
        />
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(180deg, rgba(8,8,18,0.4) 0%, rgba(8,8,18,0.8) 40%, rgba(6,6,14,0.97) 100%)',
          }}
        />
      </div>

      {/* Completed tint */}
      {isCompleted && (
        <div className="absolute inset-0 z-[1] pointer-events-none" style={{ background: 'rgba(34,197,94,0.03)' }} />
      )}

      <div className="relative z-10 p-5 flex flex-col justify-between" style={{ minHeight: 180 }}>
        {/* Top: Title + cleared badge */}
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h3 className="text-lg font-black text-white tracking-tight leading-tight">{meta.label}</h3>
            {isCompleted && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-md" style={{ background: 'rgba(34,197,94,0.1)' }}>
                <Check size={10} className="text-green-400" strokeWidth={3} />
                <span className="text-[8px] text-green-400 font-black tracking-wider">CLEARED</span>
              </div>
            )}
          </div>
          <p className="text-[11px] text-gray-500 leading-snug">{meta.subtitle}</p>
        </div>

        {/* Middle: Target value + AI coach */}
        <div className="flex items-center justify-between mt-4 mb-4">
          <span className="text-base font-black font-mono tracking-wide" style={{ color: meta.accentColor }}>
            {targetText}
          </span>

          {!isRunning && onToggleCoach && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleCoach(); }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[9px] font-bold font-mono uppercase tracking-wider transition-all active:scale-95"
              style={{
                background: target.formCoachEnabled ? 'rgba(249,115,22,0.1)' : 'rgba(255,255,255,0.04)',
                border: target.formCoachEnabled ? '1px solid rgba(249,115,22,0.25)' : '1px solid rgba(255,255,255,0.06)',
                color: target.formCoachEnabled ? '#f97316' : '#555',
              }}
            >
              {target.formCoachEnabled ? <Camera size={10} /> : <CameraOff size={10} />}
              AI Coach
            </button>
          )}
        </div>

        {/* Bottom: Repeat + Difficulty */}
        <div className="flex items-center gap-5 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-gray-600 font-mono uppercase tracking-wider">Repeat</span>
            <span className="text-[10px] font-bold text-gray-300">Everyday</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-gray-600 font-mono uppercase tracking-wider">Difficulty</span>
            <DifficultyDots level={diffLevel} color={meta.accentColor} />
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
      {/* Header */}
      <div className="flex items-center justify-between px-1 mb-1">
        <div className="flex items-center gap-2.5">
          <Swords size={14} className="text-[#00d4ff]" />
          <div>
            <div className="text-[8px] font-mono uppercase tracking-[0.25em] text-gray-500">Daily Dungeon</div>
            <div className="text-sm font-black text-white tracking-tight">Sung Jin-woo Protocol</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-2 py-1 rounded-md" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <span className="text-[9px] font-mono font-bold text-gray-400">Day {dungeonState.currentDay}</span>
          </div>
          <div
            className="flex items-center gap-1 px-2 py-1 rounded-md"
            style={{
              background: `${tier.color}08`,
              border: `1px solid ${tier.color}18`,
            }}
          >
            <Shield size={9} style={{ color: tier.color }} />
            <span className="text-[9px] font-black font-mono" style={{ color: tier.color }}>{tier.label}</span>
          </div>
        </div>
      </div>

      {/* Exercise cards */}
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

      {/* Enter Dungeon / Cleared */}
      <AnimatePresence mode="wait">
        {completedToday ? (
          <motion.div
            key="completed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center gap-2.5 py-3.5 rounded-xl"
            style={{
              background: 'rgba(34,197,94,0.04)',
              border: '1px solid rgba(34,197,94,0.1)',
            }}
          >
            <Check size={14} className="text-green-400" strokeWidth={3} />
            <span className="text-[11px] font-black font-mono text-green-400 uppercase tracking-[0.2em]">
              Dungeon Cleared
            </span>
          </motion.div>
        ) : (
          <motion.button
            key="enter"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            whileTap={{ scale: 0.97 }}
            onClick={onEnterDungeon}
            className="w-full flex items-center justify-center gap-2.5 py-4 rounded-xl font-black text-sm uppercase tracking-wider transition-all"
            style={{
              background: 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)',
              color: '#000',
            }}
          >
            <Swords size={15} />
            Enter Dungeon
            <ChevronRight size={13} strokeWidth={3} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DungeonQuestCards;
