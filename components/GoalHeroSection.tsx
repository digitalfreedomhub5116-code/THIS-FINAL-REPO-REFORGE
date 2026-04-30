import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Target, Pin, ChevronRight } from 'lucide-react';
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
    FITNESS: '#f87171', HEALTH: '#4ade80', FINANCIAL: '#fbbf24',
    ACADEMIC: '#60a5fa', SKILL: '#a78bfa', CAREER: '#7EB8D4', CREATIVE: '#f472b6',
  };
  return map[cat] || '#7EB8D4';
};

// ── Tilted pinned goal card ──
const PinnedGoalCard: React.FC<{
  goal: Goal; index: number; onClick?: () => void;
}> = ({ goal, index, onClick }) => {
  const rotation = index % 2 === 0 ? -2.5 : 2.5;
  const daysElapsed = Math.max(1, Math.floor((Date.now() - goal.startDate) / 86400000) + 1);
  const totalDays = goal.totalDurationDays || 60;
  const currentDay = Math.min(daysElapsed, totalDays);
  const pct = totalDays > 0 ? Math.min(100, (currentDay / totalDays) * 100) : 0;
  const catColor = getCategoryColor(goal.category);

  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 20, rotate: 0 }}
      animate={{ opacity: 1, y: 0, rotate: rotation }}
      transition={{ delay: 0.1 + index * 0.08, duration: 0.5 }}
      whileHover={{ scale: 1.04, rotate: 0 }}
      whileTap={{ scale: 0.97 }}
      className="relative w-full text-left rounded-xl overflow-hidden"
      style={{
        background: '#0d0d18',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
      }}
    >
      <div className="absolute -top-1 right-3 z-20 w-5 h-5 rounded-full flex items-center justify-center"
        style={{ background: catColor, boxShadow: `0 2px 8px ${catColor}50` }}>
        <Pin size={9} className="text-white" style={{ transform: 'rotate(45deg)' }} />
      </div>
      <div className="relative w-full h-16 overflow-hidden">
        <img src={getCategoryBanner(goal.category)} alt="" className="w-full h-full object-cover"
          style={{ filter: 'brightness(0.5) saturate(0.7)' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 30%, #0d0d18 100%)' }} />
        <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[7px] font-mono font-bold tracking-widest uppercase"
          style={{ background: `${catColor}25`, color: catColor, border: `1px solid ${catColor}40` }}>
          {goal.category}
        </div>
      </div>
      <div className="px-3 pb-3 pt-1">
        <div className="text-[11px] font-bold text-white/90 truncate leading-tight mb-1.5">{goal.title}</div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <motion.div className="h-full rounded-full" initial={{ width: 0 }}
              animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: 0.2 + index * 0.1 }}
              style={{ background: catColor, boxShadow: `0 0 4px ${catColor}40` }} />
          </div>
          <span className="text-[8px] font-mono font-bold tabular-nums" style={{ color: catColor }}>
            {Math.round(pct)}%
          </span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[8px] font-mono text-gray-600">Day {currentDay}/{totalDays}</span>
          <span className="text-[7px] font-mono text-gray-600 uppercase">{goal.goalRank} Rank</span>
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
    <div className="space-y-3">

      {/* ══════════════════════════════════════════════════════════
          HERO CARD — matches the "Get Rated" layout exactly
          ══════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full rounded-2xl overflow-hidden"
        style={{
          background: '#0a0a14',
          border: '1px solid rgba(126,184,212,0.1)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
        }}
      >
        {/* ── Background image (dart) with B&W + dark overlay ── */}
        <div className="relative w-full" style={{ height: 200 }}>
          <img
            src="/goals/hero-dart.png"
            alt=""
            className="w-full h-full object-cover"
            style={{ filter: 'grayscale(50%) brightness(0.4) contrast(1.15)' }}
          />
          {/* Heavy bottom shadow for text readability */}
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(180deg, rgba(10,10,20,0.2) 0%, rgba(10,10,20,0.6) 50%, rgba(10,10,20,0.95) 100%)',
          }} />
        </div>

        {/* ── Text overlay — bottom-left aligned like the reference ── */}
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-5">
          {/* Subtitle */}
          <div className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase mb-1"
            style={{ color: '#7EB8D4' }}>
            Shadow Mission
          </div>

          {/* Main heading */}
          <h2 className="text-[28px] font-black text-white leading-none mb-2"
            style={{ textShadow: '0 4px 20px rgba(0,0,0,0.8)' }}>
            Create Goal
          </h2>

          {/* Description */}
          <p className="text-[12px] text-gray-400 leading-relaxed mb-5 max-w-[300px]">
            Set a long-term goal. The system generates daily quests to keep you on track every single day.
          </p>

          {/* ── CTA Button (full width, matches "Start Face Scan" style) ── */}
          <motion.button
            onClick={onCreateGoal}
            whileTap={{ scale: 0.96 }}
            className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl font-bold text-sm tracking-wide transition-all"
            style={{
              background: 'linear-gradient(135deg, #7EB8D4 0%, #5a9ab5 100%)',
              color: '#0a0a14',
              boxShadow: '0 4px 20px rgba(126,184,212,0.35), 0 0 0 1px rgba(126,184,212,0.2)',
            }}
          >
            <Target size={16} />
            Create Goal
          </motion.button>
        </div>
      </motion.div>

      {/* ══════════════════════════════════════════════════════════
          BELOW ROW — "Your created goals will appear here" OR pinned goals
          ══════════════════════════════════════════════════════════ */}
      {activeGoals.length === 0 ? (
        /* Empty state — matches "Generate Your First Report" row */
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl"
          style={{
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {/* Icon */}
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(126,184,212,0.1)', border: '1px solid rgba(126,184,212,0.15)' }}>
            <Target size={18} style={{ color: '#7EB8D4' }} />
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-bold text-white/90">Your created goals will appear here</div>
            <div className="text-[11px] text-gray-500 font-mono">Create a goal to get started</div>
          </div>

          <ChevronRight size={16} className="text-gray-600 flex-shrink-0" />
        </motion.div>
      ) : (
        /* Active goals — pinned cards */
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
              <PinnedGoalCard key={goal.id} goal={goal} index={i}
                onClick={() => onGoalTap?.(goal.id)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GoalHeroSection;
