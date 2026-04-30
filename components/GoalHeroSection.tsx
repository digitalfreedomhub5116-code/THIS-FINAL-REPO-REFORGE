import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Target, Pin, ChevronRight, ArrowLeft, Calendar, Clock, TrendingUp, Zap, Flame, Loader2, CheckCircle } from 'lucide-react';
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

// ══════════════════════════════════════════════════════════════
// Goal Details Popup
// ══════════════════════════════════════════════════════════════
const GoalDetailsPopup: React.FC<{
  goal: Goal;
  onClose: () => void;
}> = ({ goal, onClose }) => {
  const catColor = getCategoryColor(goal.category);
  const daysElapsed = Math.max(1, Math.floor((Date.now() - goal.startDate) / 86400000) + 1);
  const totalDays = goal.totalDurationDays || 60;
  const currentDay = Math.min(daysElapsed, totalDays);
  const pct = totalDays > 0 ? Math.min(100, (currentDay / totalDays) * 100) : 0;
  const currentMilestone = goal.milestones?.[goal.currentMilestone || 0];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.85)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl"
        style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.06)', marginBottom: 80 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Banner */}
        <div className="relative w-full h-40 overflow-hidden rounded-t-3xl">
          <img
            src={getCategoryBanner(goal.category)}
            alt=""
            className="w-full h-full object-cover"
            style={{ filter: 'grayscale(100%) brightness(0.35)' }}
          />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(10,10,15,0.6) 50%, #0a0a0f 100%)' }} />
          {/* Back button */}
          <button
            onClick={onClose}
            className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-mono font-bold text-gray-300 transition-all hover:bg-white/10"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <ArrowLeft size={12} />
            Back
          </button>
          {/* Category tag */}
          <div
            className="absolute top-4 right-4 px-2 py-1 rounded-lg text-[8px] font-mono font-bold tracking-widest uppercase"
            style={{ background: `${catColor}20`, color: catColor, border: `1px solid ${catColor}30` }}
          >
            {goal.category}
          </div>
        </div>

        <div className="px-5 pb-6 -mt-6 relative z-10">
          {/* Title + rank */}
          <h3 className="text-lg font-black text-white leading-tight mb-1" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.9)' }}>{goal.title}</h3>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[9px] font-mono font-bold" style={{ color: catColor }}>{goal.goalRank}-Rank Mission</span>
            <span className="text-[9px] font-mono text-gray-600">{goal.successProbability}% odds</span>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="rounded-xl p-2.5 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <Calendar size={14} className="mx-auto mb-1" style={{ color: '#7EB8D4' }} />
              <div className="text-xs font-bold text-white">{totalDays}d</div>
              <div className="text-[7px] text-gray-600 font-mono uppercase">Duration</div>
            </div>
            <div className="rounded-xl p-2.5 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <Clock size={14} className="mx-auto mb-1" style={{ color: '#7EB8D4' }} />
              <div className="text-xs font-bold text-white">{goal.dailyCommitmentMin}m</div>
              <div className="text-[7px] text-gray-600 font-mono uppercase">Per Day</div>
            </div>
            <div className="rounded-xl p-2.5 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <Flame size={14} className="mx-auto mb-1" style={{ color: '#7EB8D4' }} />
              <div className="text-xs font-bold text-white">{goal.streak || 0}</div>
              <div className="text-[7px] text-gray-600 font-mono uppercase">Streak</div>
            </div>
          </div>

          {/* Progress */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">Progress</span>
              <span className="text-[10px] font-mono font-bold" style={{ color: catColor }}>Day {currentDay} / {totalDays}</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <motion.div
                className="h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                style={{ background: catColor, boxShadow: `0 0 8px ${catColor}40` }}
              />
            </div>
            <div className="text-right mt-1">
              <span className="text-[10px] font-mono font-bold" style={{ color: catColor }}>{Math.round(pct)}%</span>
            </div>
          </div>

          {/* Current milestone */}
          {currentMilestone && (
            <div className="rounded-xl p-3 mb-4" style={{ background: 'rgba(126,184,212,0.05)', border: '1px solid rgba(126,184,212,0.1)' }}>
              <div className="text-[8px] font-mono text-[#7EB8D4] uppercase tracking-wider mb-1">
                Phase {currentMilestone.phase} — Current
              </div>
              <div className="text-[12px] font-bold text-white mb-0.5">{currentMilestone.title}</div>
              <div className="text-[10px] text-gray-400 font-mono leading-relaxed">{currentMilestone.description}</div>
              <div className="text-[8px] text-gray-600 font-mono mt-1.5">
                Day {currentMilestone.startDay}–{currentMilestone.endDay} • {currentMilestone.targetOutcome}
              </div>
            </div>
          )}

          {/* All milestones */}
          {goal.milestones && goal.milestones.length > 0 && (
            <div className="mb-4">
              <div className="text-[9px] font-mono text-gray-500 uppercase tracking-wider mb-2">All Phases</div>
              <div className="space-y-1.5">
                {goal.milestones.map((m, i) => (
                  <div
                    key={m.phase}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl"
                    style={{
                      background: i === (goal.currentMilestone || 0) ? 'rgba(126,184,212,0.08)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${i === (goal.currentMilestone || 0) ? 'rgba(126,184,212,0.15)' : 'rgba(255,255,255,0.04)'}`,
                    }}
                  >
                    <div
                      className="w-5 h-5 rounded-md flex items-center justify-center text-[8px] font-black flex-shrink-0"
                      style={{ background: `${catColor}15`, color: catColor }}
                    >
                      {m.phase}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] text-white font-medium truncate">{m.title}</div>
                      <div className="text-[8px] text-gray-600 font-mono">Day {m.startDay}–{m.endDay}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reasoning */}
          {goal.reasoning && (
            <div className="rounded-xl p-3 mb-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div className="text-[8px] font-mono text-gray-500 uppercase tracking-wider mb-1">AI Assessment</div>
              <p className="text-[10px] text-gray-400 font-mono leading-relaxed">{goal.reasoning}</p>
            </div>
          )}


        </div>
      </motion.div>
    </motion.div>
  );
};

// ── Tilted pinned goal card ──
const PinnedGoalCard: React.FC<{
  goal: Goal; index: number; onClick?: () => void; onGenerate?: () => void; isGenerating?: boolean;
}> = ({ goal, index, onClick, onGenerate, isGenerating }) => {
  const rotation = index % 2 === 0 ? -2.5 : 2.5;
  const daysElapsed = Math.max(1, Math.floor((Date.now() - goal.startDate) / 86400000) + 1);
  const totalDays = goal.totalDurationDays || 60;
  const currentDay = Math.min(daysElapsed, totalDays);
  const pct = totalDays > 0 ? Math.min(100, (currentDay / totalDays) * 100) : 0;
  const catColor = getCategoryColor(goal.category);
  const todayStr = new Date().toISOString().split('T')[0];
  const hasQuestsToday = goal.dailyTasks?.some(t => t.date === todayStr);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, rotate: 0 }}
      animate={{ opacity: 1, y: 0, rotate: rotation }}
      transition={{ delay: 0.1 + index * 0.08, duration: 0.5 }}
      whileHover={{ scale: 1.04, rotate: 0 }}
      className="relative w-full text-left rounded-xl overflow-visible"
      style={{
        background: '#0d0d18',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
      }}
    >
      {/* Pin icon — cyan blue + red notification dot when quests not yet generated */}
      <div
        className="absolute z-20 flex items-center justify-center w-6 h-6 rounded-full"
        style={{
          top: -10,
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#7EB8D4',
          boxShadow: '0 3px 10px rgba(126,184,212,0.5)',
        }}
      >
        <Pin size={10} className="text-white" style={{ transform: 'rotate(45deg)' }} />
        {/* Red notification dot when today's quests haven't been generated */}
        {!hasQuestsToday && !isGenerating && (
          <div
            className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full"
            style={{ background: '#ef4444', border: '2px solid #0d0d18', boxShadow: '0 0 6px rgba(239,68,68,0.6)' }}
          />
        )}
      </div>

      {/* Clickable card area */}
      <button onClick={onClick} className="w-full text-left">
        {/* Banner image — 100% B&W */}
        <div className="relative w-full h-16 overflow-hidden rounded-t-xl">
          <img src={getCategoryBanner(goal.category)} alt="" className="w-full h-full object-cover"
            style={{ filter: 'grayscale(100%) brightness(0.4)' }} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 30%, #0d0d18 100%)' }} />
          <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[7px] font-mono font-bold tracking-widest uppercase"
            style={{ background: `${catColor}25`, color: catColor, border: `1px solid ${catColor}40` }}>
            {goal.category}
          </div>
        </div>
        <div className="px-3 pb-1 pt-1">
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
      </button>

      {/* Per-goal Generate Quests button */}
      {onGenerate && (
        <button
          onClick={(e) => { e.stopPropagation(); if (!hasQuestsToday && !isGenerating) onGenerate(); }}
          disabled={hasQuestsToday || isGenerating}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-b-xl text-[9px] font-mono font-bold uppercase tracking-wider transition-all"
          style={{
            background: hasQuestsToday ? 'rgba(34,197,94,0.06)' : isGenerating ? 'rgba(126,184,212,0.12)' : 'rgba(126,184,212,0.08)',
            borderTop: `1px solid ${hasQuestsToday ? 'rgba(34,197,94,0.15)' : 'rgba(126,184,212,0.15)'}`,
            color: hasQuestsToday ? '#4ade80' : '#7EB8D4',
            opacity: hasQuestsToday ? 0.7 : 1,
            cursor: hasQuestsToday ? 'default' : isGenerating ? 'wait' : 'pointer',
          }}
        >
          {isGenerating ? (
            <><Loader2 size={10} className="animate-spin" /> Generating...</>
          ) : hasQuestsToday ? (
            <><CheckCircle size={10} /> Quests Generated</>
          ) : (
            <><Zap size={10} /> Generate Quests</>
          )}
        </button>
      )}
    </motion.div>
  );
};

// ── Main export ──
interface GoalHeroSectionProps {
  goals: Goal[];
  onCreateGoal: () => void;
  onGoalTap?: (goalId: string) => void;
  onGenerateQuests?: (goalId: string) => void;
  generatingGoalId?: string | null;
}

const GoalHeroSection: React.FC<GoalHeroSectionProps> = ({ goals, onCreateGoal, onGoalTap, onGenerateQuests, generatingGoalId }) => {
  const activeGoals = useMemo(
    () => (goals || []).filter(g => g.status === 'ACTIVE').slice(0, 6),
    [goals]
  );
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

  return (
    <div className="space-y-3">

      {/* ── HERO CARD ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full rounded-2xl overflow-hidden"
        style={{
          background: '#0a0a14',
          border: '1px solid rgba(126,184,212,0.3)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
        }}
      >
        {/* Background image — 100% B&W */}
        <div className="relative w-full" style={{ height: 200 }}>
          <img
            src="/goals/hero-dart.png"
            alt=""
            className="w-full h-full object-cover"
            style={{ filter: 'grayscale(100%) brightness(0.35) contrast(1.15)' }}
          />
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(180deg, rgba(10,10,20,0.2) 0%, rgba(10,10,20,0.6) 50%, rgba(10,10,20,0.95) 100%)',
          }} />
        </div>

        {/* Text overlay */}
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-5">
          <div className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase mb-1"
            style={{ color: '#7EB8D4' }}>
            Shadow Mission
          </div>
          <h2 className="text-[28px] font-black text-white leading-none mb-2"
            style={{ textShadow: '0 4px 20px rgba(0,0,0,0.8)' }}>
            Create your new goal
          </h2>
          <p className="text-[12px] text-gray-400 leading-relaxed mb-5 max-w-[300px]">
            Set a long-term goal. The system generates daily quests to keep you on track every single day.
          </p>

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
            Create your new goal
          </motion.button>
        </div>
      </motion.div>

      {/* ── GOALS SECTION ── */}
      {activeGoals.length === 0 ? (
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
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(126,184,212,0.1)', border: '1px solid rgba(126,184,212,0.15)' }}>
            <Target size={18} style={{ color: '#7EB8D4' }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-bold text-white/90">Your created goals will appear here</div>
            <div className="text-[11px] text-gray-500 font-mono">Create a goal to get started</div>
          </div>
          <ChevronRight size={16} className="text-gray-600 flex-shrink-0" />
        </motion.div>
      ) : (
        <div>
          <div className="flex items-center gap-1.5 mb-3 px-1">
            <Pin size={10} className="text-[#7EB8D4]" style={{ transform: 'rotate(45deg)' }} />
            <span className="text-[9px] font-mono font-bold tracking-[0.2em] text-gray-500 uppercase">
              Active Goals
            </span>
            <span className="text-[8px] font-mono text-[#7EB8D4]/60 ml-auto">
              {activeGoals.length} pinned
            </span>
          </div>
          {/* Extra top padding so centered pins aren't cut */}
          <div className="grid grid-cols-2 gap-3 px-1 pt-3">
            {activeGoals.map((goal, i) => (
              <PinnedGoalCard key={goal.id} goal={goal} index={i}
                onClick={() => setSelectedGoal(goal)}
                onGenerate={onGenerateQuests ? () => onGenerateQuests(goal.id) : undefined}
                isGenerating={generatingGoalId === goal.id}
              />
            ))}
          </div>


        </div>
      )}

      {/* ── Goal Details Popup ── */}
      <AnimatePresence>
        {selectedGoal && (
          <GoalDetailsPopup
            goal={selectedGoal}
            onClose={() => setSelectedGoal(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default GoalHeroSection;
