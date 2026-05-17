/**
 * ── DUNGEON QUEST CARDS ──
 * RPG-styled quest cards for the Sung Jin-woo Daily Dungeon.
 * Features: background art, AI coach toggle, "Enter Dungeon" button, progression tier.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Zap, Camera, CameraOff, Check, ChevronRight, TrendingUp, Flame, Trophy } from 'lucide-react';
import { DungeonState, DungeonExerciseTarget } from '../types';
import { getProgressionTier, isDungeonCompletedToday } from '../lib/dungeonEngine';

const DUNGEON_EXERCISES: Record<string, {
  label: string;
  icon: string;
  image: string;
  color: string;
  bgGradient: string;
}> = {
  PUSHUPS: {
    label: 'Push-ups',
    icon: '💪',
    image: '/dungeon/pushups.webp',
    color: '#00d4ff',
    bgGradient: 'linear-gradient(135deg, rgba(0,212,255,0.15) 0%, transparent 60%)',
  },
  SQUATS: {
    label: 'Squats',
    icon: '🦵',
    image: '/dungeon/squats.webp',
    color: '#34d399',
    bgGradient: 'linear-gradient(135deg, rgba(52,211,153,0.15) 0%, transparent 60%)',
  },
  RUNNING: {
    label: 'Running',
    icon: '🏃',
    image: '/dungeon/running.webp',
    color: '#f97316',
    bgGradient: 'linear-gradient(135deg, rgba(249,115,22,0.15) 0%, transparent 60%)',
  },
};

interface DungeonQuestCardsProps {
  dungeonState: DungeonState;
  onEnterDungeon: () => void;
  onToggleFormCoach: (exercise: 'PUSHUPS' | 'SQUATS') => void;
}

// ── Individual exercise mini-card ──
const ExerciseMiniCard: React.FC<{
  target: DungeonExerciseTarget;
  onToggleCoach?: () => void;
  isCompleted: boolean;
}> = ({ target, onToggleCoach, isCompleted }) => {
  const cfg = DUNGEON_EXERCISES[target.exercise];
  if (!cfg) return null;

  const isRunning = target.exercise === 'RUNNING';
  const targetText = isRunning
    ? `${target.durationMinutes} min`
    : `${target.reps} × ${target.sets} sets`;

  return (
    <div
      className="flex items-center gap-3 py-2.5 px-3 rounded-xl transition-all"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <span className="text-lg">{cfg.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-white">{cfg.label}</span>
          {isCompleted && (
            <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded" style={{ background: 'rgba(34,197,94,0.15)' }}>
              <Check size={8} className="text-green-400" strokeWidth={3} />
              <span className="text-[7px] text-green-400 font-bold">DONE</span>
            </div>
          )}
        </div>
        <span className="text-[11px] font-mono" style={{ color: cfg.color }}>{targetText}</span>
      </div>

      {/* AI Coach toggle (only for push-ups and squats) */}
      {!isRunning && onToggleCoach && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleCoach(); }}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[8px] font-bold font-mono uppercase tracking-wider transition-all active:scale-95"
          style={{
            background: target.formCoachEnabled ? 'rgba(249,115,22,0.12)' : 'rgba(255,255,255,0.04)',
            border: target.formCoachEnabled ? '1px solid rgba(249,115,22,0.3)' : '1px solid rgba(255,255,255,0.08)',
            color: target.formCoachEnabled ? '#f97316' : '#6b7280',
          }}
        >
          {target.formCoachEnabled ? <Camera size={10} /> : <CameraOff size={10} />}
          AI Coach
        </button>
      )}
    </div>
  );
};

const DungeonQuestCards: React.FC<DungeonQuestCardsProps> = ({
  dungeonState,
  onEnterDungeon,
  onToggleFormCoach,
}) => {
  const [imgLoaded, setImgLoaded] = useState(false);
  const completedToday = isDungeonCompletedToday(dungeonState);
  const tier = getProgressionTier(dungeonState);

  // Pick the primary image (rotate based on day)
  const exerciseKeys = ['PUSHUPS', 'SQUATS', 'RUNNING'] as const;
  const primaryIdx = (dungeonState.currentDay - 1) % 3;
  const primaryExercise = exerciseKeys[primaryIdx];
  const primaryCfg = DUNGEON_EXERCISES[primaryExercise];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, rgba(6,6,16,0.85) 0%, rgba(3,3,10,0.98) 100%)',
        border: completedToday
          ? '1px solid rgba(34,197,94,0.3)'
          : '1px solid rgba(0,212,255,0.15)',
        boxShadow: completedToday
          ? '0 4px 30px rgba(34,197,94,0.08)'
          : '0 4px 30px rgba(0,212,255,0.06), inset 0 1px 0 rgba(255,255,255,0.06)',
      }}
    >
      {/* Background image with overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src={primaryCfg.image}
          alt=""
          className="w-full h-full object-cover transition-opacity duration-700"
          style={{ opacity: imgLoaded ? 0.2 : 0 }}
          onLoad={() => setImgLoaded(true)}
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.85) 50%, rgba(3,3,10,0.98) 80%)' }} />
      </div>

      {/* Completed overlay */}
      {completedToday && (
        <div className="absolute inset-0 z-[1] pointer-events-none" style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.04) 0%, transparent 60%)' }} />
      )}

      <div className="relative z-10 p-4">
        {/* Header row */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.25)' }}>
                <Swords size={12} className="text-[#00d4ff]" />
              </div>
              <span className="text-[10px] font-black font-mono uppercase tracking-[0.2em] text-[#00d4ff]/80">DAILY DUNGEON</span>
            </div>
            <h3 className="text-base font-black text-white tracking-tight" style={{ fontFamily: "'Orbitron', monospace" }}>
              SUNG JIN-WOO PROTOCOL
            </h3>
          </div>

          {/* Progression tier badge */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
            style={{
              background: `${tier.color}12`,
              border: `1px solid ${tier.color}30`,
            }}
          >
            <TrendingUp size={10} style={{ color: tier.color }} />
            <span className="text-[9px] font-black font-mono" style={{ color: tier.color }}>
              {tier.label}
            </span>
          </div>
        </div>

        {/* Day counter + stats */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <Flame size={10} className="text-orange-400" />
            <span className="text-[10px] font-mono font-bold text-gray-300">Day {dungeonState.currentDay}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <Trophy size={10} className="text-amber-400" />
            <span className="text-[10px] font-mono font-bold text-gray-300">{dungeonState.totalCompletions} clears</span>
          </div>
          {dungeonState.consecutiveCompletions >= 3 && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.25)' }}>
              <Zap size={9} className="text-purple-400" />
              <span className="text-[9px] font-mono font-bold text-purple-400">{dungeonState.consecutiveCompletions}×</span>
            </div>
          )}
        </div>

        {/* Exercise breakdown */}
        <div className="space-y-1.5 mb-4">
          {dungeonState.targets.map((target) => (
            <ExerciseMiniCard
              key={target.exercise}
              target={target}
              isCompleted={completedToday}
              onToggleCoach={
                target.exercise === 'PUSHUPS' || target.exercise === 'SQUATS'
                  ? () => onToggleFormCoach(target.exercise as 'PUSHUPS' | 'SQUATS')
                  : undefined
              }
            />
          ))}
        </div>

        {/* Enter Dungeon button */}
        <AnimatePresence mode="wait">
          {completedToday ? (
            <motion.div
              key="completed"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center gap-2 py-3 rounded-xl"
              style={{
                background: 'rgba(34,197,94,0.08)',
                border: '1px solid rgba(34,197,94,0.2)',
              }}
            >
              <Check size={14} className="text-green-400" strokeWidth={3} />
              <span className="text-xs font-black font-mono text-green-400 uppercase tracking-widest">
                DUNGEON CLEARED
              </span>
            </motion.div>
          ) : (
            <motion.button
              key="enter"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              whileTap={{ scale: 0.97 }}
              onClick={onEnterDungeon}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-black text-sm uppercase tracking-widest transition-all active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)',
                color: '#000',
                boxShadow: '0 0 25px rgba(0,212,255,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
              }}
            >
              <Swords size={16} />
              Enter Dungeon
              <ChevronRight size={14} strokeWidth={3} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default DungeonQuestCards;
