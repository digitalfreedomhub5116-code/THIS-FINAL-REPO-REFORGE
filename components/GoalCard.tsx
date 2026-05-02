import React from 'react';
import { motion } from 'framer-motion';
import { Target, Calendar, Flame, ChevronRight, Pause, Trophy } from 'lucide-react';
import { Goal, Rank } from '../types';

const RANK_COLORS: Record<string, string> = {
  E: '#9ca3af', D: '#fb923c', C: '#facc15', B: '#4ade80', A: '#00d4ff', S: '#33dfff',
  UNRANKED: '#6b7280',
};

const CATEGORY_ICONS: Record<string, string> = {
  ACADEMIC: '📚', FITNESS: '💪', FINANCIAL: '💰', SKILL: '🎯',
  CAREER: '🚀', HEALTH: '❤️', CREATIVE: '🎨',
};

interface GoalCardProps {
  goal: Goal;
  onTap: (goal: Goal) => void;
}

export default function GoalCard({ goal, onTap }: GoalCardProps) {
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
                {isPaused && (
                  <span className="flex items-center gap-0.5 text-[9px] text-amber-400 font-mono">
                    <Pause className="w-2.5 h-2.5" /> PAUSED
                  </span>
                )}
                {isCompleted && (
                  <span className="flex items-center gap-0.5 text-[9px] text-green-400 font-mono">
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
