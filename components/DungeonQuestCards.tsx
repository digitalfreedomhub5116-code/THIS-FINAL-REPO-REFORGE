/**
 * ── DUNGEON QUEST CARDS ──
 * RPG-styled quest cards for the Sung Jin-woo Daily Dungeon.
 * Each exercise gets its own visual card with background art.
 * Muted design — soft cyan/gray palette, restful for the eyes.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Check, ChevronRight, Shield, MapPin } from 'lucide-react';
import { DungeonState, DungeonExerciseTarget } from '../types';
import { getProgressionTier, isDungeonCompletedToday } from '../lib/dungeonEngine';

const EXERCISE_META: Record<string, {
  label: string;
  subtitle: string;
  image: string;
}> = {
  PUSHUPS: {
    label: 'Push-ups',
    subtitle: 'Upper body strength protocol',
    image: '/dungeon/pushups.webp',
  },
  SQUATS: {
    label: 'Squats',
    subtitle: 'Lower body power training',
    image: '/dungeon/squats.webp',
  },
  RUNNING: {
    label: 'Running',
    subtitle: 'Cardio endurance drill',
    image: '/dungeon/running.webp',
  },
};

interface DungeonQuestCardsProps {
  dungeonState: DungeonState;
  onEnterDungeon: () => void;
  onToggleFormCoach: (exercise: 'PUSHUPS' | 'SQUATS') => void;
}

// ── iOS-style AI Coach Toggle ──
const AICoachToggle: React.FC<{ enabled: boolean; onToggle: () => void }> = ({ enabled, onToggle }) => (
  <button
    onClick={(e) => { e.stopPropagation(); onToggle(); }}
    className="flex items-center gap-2 transition-all active:scale-95"
  >
    <div
      className="relative w-[38px] h-[20px] rounded-full transition-all"
      style={{
        background: enabled
          ? 'linear-gradient(90deg, #00d4ff, #0099cc)'
          : 'rgba(255,255,255,0.08)',
      }}
    >
      <motion.div
        className="absolute top-[2px] w-[16px] h-[16px] rounded-full shadow-sm"
        style={{ background: enabled ? '#fff' : '#555' }}
        animate={{ left: enabled ? 20 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </div>
    <span
      className="text-[8px] font-mono font-bold tracking-wider"
      style={{ color: enabled ? '#00a0c8' : '#555' }}
    >
      AI
    </span>
  </button>
);

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
    ? `${target.distanceKm || 1} km`
    : `${target.reps} reps × ${target.sets} sets`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="relative rounded-2xl overflow-hidden"
      style={{
        minHeight: 150,
        border: isCompleted
          ? '1px solid rgba(0,180,220,0.1)'
          : '1px solid rgba(255,255,255,0.05)',
      }}
    >
      {/* Background image */}
      <div className="absolute inset-0 z-0">
        <img
          src={meta.image}
          alt=""
          className="w-full h-full object-cover transition-opacity duration-700"
          style={{ opacity: imgLoaded ? 0.35 : 0, filter: 'saturate(0.6) brightness(0.8)' }}
          onLoad={() => setImgLoaded(true)}
        />
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(180deg, rgba(10,10,20,0.35) 0%, rgba(10,10,20,0.7) 45%, rgba(8,8,16,0.95) 100%)',
          }}
        />
      </div>

      <div className="relative z-10 p-5 flex flex-col justify-between" style={{ minHeight: 150 }}>
        {/* Top: Title + cleared badge */}
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h3 className="text-base font-bold text-gray-100 tracking-tight leading-tight">{meta.label}</h3>
            {isCompleted && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded" style={{ background: 'rgba(0,180,220,0.08)' }}>
                <Check size={9} style={{ color: '#5ab8cc' }} strokeWidth={3} />
                <span className="text-[7px] font-bold tracking-wider" style={{ color: '#5ab8cc' }}>CLEARED</span>
              </div>
            )}
          </div>
          <p className="text-[10px] text-gray-500 leading-snug">{meta.subtitle}</p>
        </div>

        {/* Middle: Target value + AI coach toggle / GPS indicator */}
        <div className="flex items-center justify-between mt-3 mb-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold font-mono tracking-wide" style={{ color: '#6ec4d6' }}>
              {targetText}
            </span>
            {/* GPS + Steps indicator for running */}
            {isRunning && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded" style={{ background: 'rgba(0,180,220,0.05)', border: '1px solid rgba(0,180,220,0.08)' }}>
                <MapPin size={7} style={{ color: '#5ab8cc' }} />
                <span className="text-[6px] font-mono font-bold tracking-wider" style={{ color: '#5ab8cc80' }}>GPS + Steps</span>
              </div>
            )}
          </div>

          {!isRunning && onToggleCoach && (
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
}) => {
  const completedToday = isDungeonCompletedToday(dungeonState);
  const tier = getProgressionTier(dungeonState);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between px-1 mb-1">
        <div className="flex items-center gap-2.5">
          <Swords size={13} style={{ color: '#5ab8cc' }} />
          <div>
            <div className="text-[8px] font-mono uppercase tracking-[0.25em] text-gray-600">Daily Dungeon</div>
            <div className="text-sm font-bold text-gray-200 tracking-tight">Sung Jin-woo Protocol</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-2 py-1 rounded-md" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <span className="text-[9px] font-mono text-gray-500">Day {dungeonState.currentDay}</span>
          </div>
          <div
            className="flex items-center gap-1 px-2 py-1 rounded-md"
            style={{
              background: `${tier.color}06`,
              border: `1px solid ${tier.color}12`,
            }}
          >
            <Shield size={9} style={{ color: tier.color, opacity: 0.7 }} />
            <span className="text-[9px] font-bold font-mono" style={{ color: tier.color, opacity: 0.8 }}>{tier.label}</span>
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
            onClick={onEnterDungeon}
            className="w-full flex items-center justify-center gap-2.5 py-4 rounded-xl font-bold text-sm uppercase tracking-wider transition-all"
            style={{
              background: 'linear-gradient(135deg, rgba(0,180,220,0.15) 0%, rgba(0,140,180,0.1) 100%)',
              color: '#6ec4d6',
              border: '1px solid rgba(0,180,220,0.15)',
            }}
          >
            <Swords size={14} />
            Enter Dungeon
            <ChevronRight size={13} strokeWidth={3} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DungeonQuestCards;
