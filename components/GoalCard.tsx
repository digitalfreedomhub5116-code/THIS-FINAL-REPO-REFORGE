import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Target, Calendar, Flame, ChevronRight, Pause, Trophy, Pin, Swords } from 'lucide-react';
import { Goal, Rank } from '../types';

const RANK_COLORS: Record<string, string> = {
  E: '#9ca3af', D: '#fb923c', C: '#facc15', B: '#4ade80', A: '#00d4ff', S: '#33dfff',
  UNRANKED: '#6b7280',
};

const CATEGORY_ICONS: Record<string, string> = {
  ACADEMIC: '📚', FITNESS: '💪', FINANCIAL: '💰', SKILL: '🎯',
  CAREER: '🚀', HEALTH: '❤️', CREATIVE: '🎨', DEFAULT: '⚔️',
};

interface GoalCardProps {
  goal: Goal;
  onTap: (goal: Goal) => void;
}

// ── Pinned System Goal Card (with cover image) ──
function PinnedGoalCardContent({ goal, onTap }: GoalCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const goalStartTime = goal.startDate || goal.createdAt || Date.now();
  const currentDay = Math.max(1, Math.floor((Date.now() - goalStartTime) / (1000 * 60 * 60 * 24)) + 1);
  const totalDays = goal.totalDurationDays || 1;
  const progress = Math.min(100, Math.round((currentDay / totalDays) * 100));
  const rankColor = RANK_COLORS[goal.goalRank] || RANK_COLORS.E;

  const currentMilestone = goal.milestones?.find(m =>
    currentDay >= m.startDay && currentDay <= m.endDay
  ) || goal.milestones?.[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onTap(goal)}
      className="relative rounded-2xl overflow-hidden cursor-pointer"
      style={{
        minHeight: 160,
        border: '1px solid rgba(0,180,220,0.1)',
      }}
    >
      {/* Background image */}
      <div className="absolute inset-0 z-0">
        <img
          src={goal.coverImage}
          alt=""
          className="w-full h-full object-cover transition-opacity duration-700"
          style={{ opacity: imgLoaded ? 0.3 : 0, filter: 'saturate(0.5) brightness(0.8)' }}
          onLoad={() => setImgLoaded(true)}
        />
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(180deg, rgba(8,8,18,0.4) 0%, rgba(8,8,18,0.75) 45%, rgba(6,6,14,0.96) 100%)',
          }}
        />
      </div>

      <div className="relative z-10 p-4">
        {/* Pin + System badge */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Pin size={10} style={{ color: '#5ab8cc' }} />
            <span className="text-[7px] font-mono font-bold uppercase tracking-[0.2em]" style={{ color: '#5ab8cc80' }}>
              Pinned Quest
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Swords size={9} style={{ color: '#5ab8cc' }} />
            <span className="text-[7px] font-mono font-bold uppercase tracking-wider" style={{ color: '#5ab8cc' }}>
              System
            </span>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-gray-100 mb-0.5">{goal.title}</h3>
        <p className="text-[9px] text-gray-500 font-mono mb-3">
          Push-ups · Squats · Running — Every day, no exceptions
        </p>

        {/* Progress bar */}
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[8px] font-mono text-gray-600">PROGRESS</span>
            <span className="text-[8px] font-mono" style={{ color: '#5ab8cc' }}>Day {currentDay}</span>
          </div>
          <div className="h-1 rounded-full bg-white/5 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${rankColor}66, ${rankColor})` }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 text-[9px] font-mono text-gray-500">
          <div className="flex items-center gap-1">
            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${rankColor}15`, color: rankColor, opacity: 0.8 }}>
              {goal.goalRank}-RANK
            </span>
          </div>
          {goal.streak > 0 && (
            <div className="flex items-center gap-1" style={{ color: '#fb923c88' }}>
              <Flame className="w-3 h-3" />
              <span>{goal.streak}d</span>
            </div>
          )}
          {currentMilestone && (
            <div className="ml-auto text-[8px] text-gray-600 truncate max-w-[120px]">
              Phase {currentMilestone.phase}: {currentMilestone.title}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Standard Goal Card ──
export default function GoalCard({ goal, onTap }: GoalCardProps) {
  // If this goal has a cover image (e.g. system dungeon goal), show the pinned visual card
  if ((goal.coverImage || goal.category === 'DEFAULT') && goal.isSystemGoal) {
    // For DEFAULT category, auto-assign the manga cover image
    const goalWithCover = goal.category === 'DEFAULT' && !goal.coverImage
      ? { ...goal, coverImage: '/dungeon/jinwoo-protocol.png' }
      : goal;
    return <PinnedGoalCardContent goal={goalWithCover} onTap={onTap} />;
  }

  const goalStartTime = goal.startDate || goal.createdAt || Date.now();
  const currentDay = Math.max(1, Math.floor((Date.now() - goalStartTime) / (1000 * 60 * 60 * 24)) + 1);
  const totalDays = goal.totalDurationDays || 1;
  const daysRemaining = Math.max(0, totalDays - currentDay);
  const progress = Math.min(100, Math.round((currentDay / totalDays) * 100));
  const rankColor = RANK_COLORS[goal.goalRank] || RANK_COLORS.E;
  const icon = CATEGORY_ICONS[goal.category] || '🎯';

  const currentMilestone = goal.milestones?.find(m =>
    currentDay >= m.startDay && currentDay <= m.endDay
  ) || goal.milestones?.[0];

  const isPaused = goal.status === 'PAUSED';
  const isCompleted = goal.status === 'COMPLETED';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onTap(goal)}
      className="relative rounded-2xl overflow-hidden cursor-pointer"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${rankColor}22`,
      }}
    >
      {/* Top accent bar */}
      <div className="h-0.5" style={{ background: `linear-gradient(90deg, ${rankColor}66, transparent)` }} />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <span className="text-lg">{icon}</span>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-white truncate">{goal.title}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className="text-[9px] font-black px-1.5 py-0.5 rounded"
                  style={{ background: `${rankColor}20`, color: rankColor }}
                >
                  {goal.goalRank}-RANK
                </span>
                <span className="text-[9px] text-gray-500 font-mono">{goal.category}</span>
                {goal.isSystemGoal && (
                  <span className="flex items-center gap-0.5 text-[9px] text-[#00d4ff] font-mono font-black px-1.5 py-0.5 rounded"
                    style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)' }}>
                    ⚔️ SYSTEM
                  </span>
                )}
                {isPaused && (
                  <span className="flex items-center gap-0.5 text-[9px] text-amber-400 font-mono">
                    <Pause className="w-2.5 h-2.5" /> PAUSED
                  </span>
                )}
                {isCompleted && (
                  <span className="flex items-center gap-0.5 text-[9px] text-[#5ab8cc] font-mono">
                    <Trophy className="w-2.5 h-2.5" /> COMPLETE
                  </span>
                )}
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-600 flex-shrink-0 mt-1" />
        </div>

        {/* Progress bar */}
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[9px] font-mono text-gray-500">PROGRESS</span>
            <span className="text-[9px] font-mono" style={{ color: rankColor }}>{progress}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${rankColor}88, ${rankColor})` }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 text-[10px] font-mono text-gray-400">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>{daysRemaining}d left</span>
          </div>
          <div className="flex items-center gap-1">
            <Target className="w-3 h-3" />
            <span>Day {currentDay}/{totalDays}</span>
          </div>
          {goal.streak > 0 && (
            <div className="flex items-center gap-1" style={{ color: '#fb923c' }}>
              <Flame className="w-3 h-3" />
              <span>{goal.streak}d streak</span>
            </div>
          )}
          <div className="ml-auto text-[9px]" style={{ color: rankColor }}>
            {goal.successProbability}% odds
          </div>
        </div>

        {/* Current milestone */}
        {currentMilestone && !isCompleted && (
          <div className="mt-2.5 pt-2.5 border-t border-white/5">
            <div className="text-[9px] text-gray-600 font-mono mb-0.5">CURRENT PHASE</div>
            <div className="text-[10px] text-gray-300 font-medium truncate">
              Phase {currentMilestone.phase}: {currentMilestone.title}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
