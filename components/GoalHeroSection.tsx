import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Target, Pin } from 'lucide-react';
import { Goal, GoalCategory } from '../types';

// ── Category → banner image mapping ──
const CATEGORY_BANNERS: Record<GoalCategory | string, string> = {
  FITNESS: '/goals/fitness.png',
  HEALTH: '/goals/health.png',
  FINANCIAL: '/goals/finance.png',
  ACADEMIC: '/goals/education.png',
  SKILL: '/goals/mindset.png',
  CAREER: '/goals/career.png',
  CREATIVE: '/goals/social.png',
};

const getCategoryBanner = (cat: GoalCategory | string): string =>
  CATEGORY_BANNERS[cat] || '/goals/mindset.png';

const getCategoryColor = (cat: GoalCategory | string): string => {
  const map: Record<string, string> = {
    FITNESS: '#f87171',
    HEALTH: '#4ade80',
    FINANCIAL: '#fbbf24',
    ACADEMIC: '#60a5fa',
    SKILL: '#a78bfa',
    CAREER: '#7EB8D4',
    CREATIVE: '#f472b6',
  };
  return map[cat] || '#7EB8D4';
};

// ── Tilted pinned goal card ──
const PinnedGoalCard: React.FC<{
  goal: Goal;
  index: number;
  onClick?: () => void;
}> = ({ goal, index, onClick }) => {
  const rotation = index % 2 === 0 ? -2.5 : 2.5;
  const daysElapsed = Math.max(1, Math.floor((Date.now() - goal.startDate) / (1000 * 60 * 60 * 24)) + 1);
  const totalDays = goal.totalDurationDays || 60;
  const currentDay = Math.min(daysElapsed, totalDays);
  const pct = totalDays > 0 ? Math.min(100, (currentDay / totalDays) * 100) : 0;
  const catColor = getCategoryColor(goal.category);
  const bannerSrc = getCategoryBanner(goal.category);

  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 20, rotate: 0 }}
      animate={{ opacity: 1, y: 0, rotate: rotation }}
      transition={{ delay: 0.1 + index * 0.08, duration: 0.5, ease: 'easeOut' }}
      whileHover={{ scale: 1.04, rotate: 0 }}
      whileTap={{ scale: 0.97 }}
      className="relative w-full text-left rounded-xl overflow-hidden group"
      style={{
        background: '#0d0d18',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)',
      }}
    >
      {/* Pin icon */}
      <div
        className="absolute -top-1 right-3 z-20 w-5 h-5 rounded-full flex items-center justify-center"
        style={{
          background: catColor,
          boxShadow: `0 2px 8px ${catColor}50`,
        }}
      >
        <Pin size={9} className="text-white" style={{ transform: 'rotate(45deg)' }} />
      </div>

      {/* Banner image */}
      <div className="relative w-full h-16 overflow-hidden">
        <img
          src={bannerSrc}
          alt=""
          className="w-full h-full object-cover"
          style={{ filter: 'brightness(0.5) saturate(0.7)' }}
        />
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(to bottom, transparent 30%, #0d0d18 100%)` }}
        />
        {/* Category tag */}
        <div
          className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[7px] font-mono font-bold tracking-widest uppercase"
          style={{ background: `${catColor}25`, color: catColor, border: `1px solid ${catColor}40` }}
        >
          {goal.category}
        </div>
      </div>

      {/* Content */}
      <div className="px-3 pb-3 pt-1">
        <div className="text-[11px] font-bold text-white/90 truncate leading-tight mb-1.5">
          {goal.title}
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <motion.div
              className="h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, delay: 0.2 + index * 0.1, ease: 'easeOut' }}
              style={{ background: `linear-gradient(90deg, ${catColor}, ${catColor}99)`, boxShadow: `0 0 4px ${catColor}40` }}
            />
          </div>
          <span className="text-[8px] font-mono font-bold tabular-nums" style={{ color: catColor }}>
            {Math.round(pct)}%
          </span>
        </div>

        <div className="flex items-center justify-between mt-1">
          <span className="text-[8px] font-mono text-gray-600">
            Day {currentDay}/{totalDays}
          </span>
          <span className="text-[7px] font-mono text-gray-600 uppercase">
            {goal.goalRank} Rank
          </span>
        </div>
      </div>
    </motion.button>
  );
};

// ── Main export ──
interface GoalHeroSectionProps {
  goals: Goal[];
  onCreateGoal: () => void;
  onGoalTap?: (goalId: string) => void;
}

const GoalHeroSection: React.FC<GoalHeroSectionProps> = ({ goals, onCreateGoal, onGoalTap }) => {
  const activeGoals = useMemo(
    () => (goals || []).filter(g => g.status === 'ACTIVE').slice(0, 6),
    [goals]
  );

  return (
    <div className="space-y-4">
      {/* ── Hero Banner: Create New Goal ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full rounded-2xl overflow-hidden"
        style={{
          border: '1px solid rgba(126,184,212,0.12)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
        }}
      >
        {/* Background image with B&W effect */}
        <div className="relative w-full" style={{ height: 160 }}>
          <img
            src="/goals/hero-dart.png"
            alt="Target"
            className="w-full h-full object-cover"
            style={{ filter: 'grayscale(50%) brightness(0.45) contrast(1.1)' }}
          />
          {/* Gradient overlays */}
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(180deg, rgba(10,10,20,0.3) 0%, rgba(10,10,20,0.85) 100%)' }}
          />
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(135deg, rgba(126,184,212,0.08) 0%, transparent 60%)' }}
          />
        </div>

        {/* Content overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center px-5 text-center">
          <div className="flex items-center gap-1.5 mb-2">
            <Target size={14} className="text-[#7EB8D4]" />
            <span className="text-[9px] font-mono font-bold tracking-[0.25em] text-[#7EB8D4] uppercase">
              Shadow Mission
            </span>
          </div>

          <h3 className="text-lg font-black text-white mb-1.5" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.8)' }}>
            Create New Goal
          </h3>

          <p className="text-[10px] text-gray-400 font-mono leading-relaxed max-w-[260px] mb-4">
            Set a long-term goal. The system will generate daily quests
            tailored to your mission — keeping you on track, every single day.
          </p>

          <motion.button
            onClick={onCreateGoal}
            whileTap={{ scale: 0.93 }}
            className="flex items-center gap-2 px-5 py-2 rounded-xl font-mono font-bold text-[11px] tracking-wider uppercase transition-all"
            style={{
              background: 'linear-gradient(135deg, rgba(126,184,212,0.2) 0%, rgba(126,184,212,0.08) 100%)',
              border: '1px solid rgba(126,184,212,0.35)',
              color: '#7EB8D4',
              boxShadow: '0 0 20px rgba(126,184,212,0.1)',
            }}
          >
            <Plus size={14} />
            New Goal
          </motion.button>
        </div>
      </motion.div>

      {/* ── Pinned Goals Board ── */}
      {activeGoals.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2.5 px-1">
            <Pin size={10} className="text-[#7EB8D4]" style={{ transform: 'rotate(45deg)' }} />
            <span className="text-[9px] font-mono font-bold tracking-[0.2em] text-gray-500 uppercase">
              Active Goals
            </span>
            <span className="text-[8px] font-mono text-[#7EB8D4]/60 ml-auto">
              {activeGoals.length} pinned
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 px-1">
            {activeGoals.map((goal, i) => (
              <PinnedGoalCard
                key={goal.id}
                goal={goal}
                index={i}
                onClick={() => onGoalTap?.(goal.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GoalHeroSection;
