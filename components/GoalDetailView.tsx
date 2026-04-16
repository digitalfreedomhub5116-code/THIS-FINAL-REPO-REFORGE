import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Calendar, Clock, Target, Flame, TrendingUp, Pause, Play, Trash2, Loader2, CheckCircle, Circle, AlertTriangle } from 'lucide-react';
import { Goal, GoalDailyTask, GoalQuest, PlayerData } from '../types';
import { playSystemSoundEffect } from '../utils/soundEngine';
import { API_BASE } from '../lib/apiConfig';
import { getPlayerAuthHeaders } from '../lib/playerApi';

const RANK_COLORS: Record<string, string> = {
  E: '#9ca3af', D: '#fb923c', C: '#facc15', B: '#4ade80', A: '#22d3ee', S: '#c084fc',
  UNRANKED: '#6b7280',
};

interface GoalDetailViewProps {
  goal: Goal;
  playerData?: PlayerData;
  allGoals: Goal[];
  onBack: () => void;
  onUpdateGoal: (updatedGoal: Goal) => void;
  onDeleteGoal: (goalId: string) => void;
}

export default function GoalDetailView({
  goal,
  playerData,
  allGoals,
  onBack,
  onUpdateGoal,
  onDeleteGoal,
}: GoalDetailViewProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [todayTasks, setTodayTasks] = useState<GoalDailyTask | null>(null);
  const [showConfirmAbandon, setShowConfirmAbandon] = useState(false);

  const rankColor = RANK_COLORS[goal.goalRank] || RANK_COLORS.D;
  const currentDay = Math.max(1, Math.floor((Date.now() - goal.startDate) / (1000 * 60 * 60 * 24)) + 1);
  const totalDays = goal.totalDurationDays || 1;
  const daysRemaining = Math.max(0, totalDays - currentDay);
  const progress = Math.min(100, Math.round((currentDay / totalDays) * 100));

  const currentMilestone = goal.milestones?.find(m => currentDay >= m.startDay && currentDay <= m.endDay);

  const todayStr = new Date().toISOString().split('T')[0];

  // Check if today's tasks already exist
  useEffect(() => {
    const existing = goal.dailyTasks?.find(t => t.date === todayStr);
    if (existing) setTodayTasks(existing);
  }, [goal.dailyTasks, todayStr]);

  // Generate today's quests
  const generateDailyQuests = useCallback(async () => {
    if (isGenerating) return;
    setIsGenerating(true);

    try {
      const otherGoalTasksToday = allGoals
        .filter(g => g.id !== goal.id && g.status === 'ACTIVE')
        .flatMap(g => g.dailyTasks?.find(t => t.date === todayStr)?.quests || [])
        .map(q => q.title)
        .join(', ');

      const otherGoalsMinutes = allGoals
        .filter(g => g.id !== goal.id && g.status === 'ACTIVE')
        .reduce((sum, g) => sum + (g.dailyCommitmentMin || 0), 0);

      const remainingMinutes = Math.max(30, (playerData?.healthProfile?.sessionDuration ?? 120) - otherGoalsMinutes);

      const recentTasks = (goal.dailyTasks || []).slice(-7);

      const res = await fetch(`${API_BASE}/api/goals/daily-quests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getPlayerAuthHeaders() },
        credentials: 'include',
        body: JSON.stringify({
          goal,
          recentTasks,
          playerStats: playerData?.stats,
          otherGoalTasksToday: otherGoalTasksToday || 'None',
          remainingMinutes,
          dayOfWeek: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
        }),
      });

      if (!res.ok) throw new Error('Failed to generate quests');
      const data = await res.json();

      const newDailyTask: GoalDailyTask = {
        id: `dt-${goal.id}-${todayStr}`,
        goalId: goal.id,
        date: todayStr,
        dayNumber: currentDay,
        quests: data.quests || [],
        completedCount: 0,
        totalCount: (data.quests || []).length,
        dailyNote: data.dailyNote || '',
        progressUpdate: data.progressUpdate || '',
        createdAt: Date.now(),
      };

      setTodayTasks(newDailyTask);

      const updatedGoal = {
        ...goal,
        dailyTasks: [...(goal.dailyTasks || []).filter(t => t.date !== todayStr), newDailyTask],
      };
      onUpdateGoal(updatedGoal);
      playSystemSoundEffect('PURCHASE');
    } catch (err) {
      console.error('[GoalDetail] Failed to generate daily quests:', err);
    } finally {
      setIsGenerating(false);
    }
  }, [goal, playerData, allGoals, todayStr, currentDay, isGenerating, onUpdateGoal]);

  // Toggle quest completion
  const toggleQuestComplete = useCallback((questId: string) => {
    if (!todayTasks) return;

    const updatedQuests = todayTasks.quests.map(q =>
      q.id === questId ? { ...q, completed: !q.completed } : q
    );
    const completedCount = updatedQuests.filter(q => q.completed).length;

    const updatedDailyTask = { ...todayTasks, quests: updatedQuests, completedCount };
    setTodayTasks(updatedDailyTask);

    // Update streak
    const allCompleted = completedCount === updatedQuests.length;
    const newStreak = allCompleted ? goal.streak + 1 : goal.streak;

    const updatedGoal = {
      ...goal,
      streak: newStreak,
      dailyTasks: [...(goal.dailyTasks || []).filter(t => t.date !== todayStr), updatedDailyTask],
    };
    onUpdateGoal(updatedGoal);

    if (allCompleted) {
      playSystemSoundEffect('PURCHASE');
    } else {
      playSystemSoundEffect('SYSTEM');
    }
  }, [todayTasks, goal, todayStr, onUpdateGoal]);

  // Pause/Resume
  const togglePause = useCallback(() => {
    const newStatus = goal.status === 'PAUSED' ? 'ACTIVE' : 'PAUSED';
    onUpdateGoal({ ...goal, status: newStatus as any });
    playSystemSoundEffect('SYSTEM');
  }, [goal, onUpdateGoal]);

  return (
    <div className="min-h-screen pb-24" style={{ background: '#07070d' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 px-4 pt-4 pb-3" style={{ background: '#07070d' }}>
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-xl hover:bg-white/5">
            <ArrowLeft className="w-4 h-4 text-gray-400" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-white truncate">{goal.title}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded" style={{ background: `${rankColor}20`, color: rankColor }}>
                {goal.goalRank}-RANK
              </span>
              <span className="text-[9px] text-gray-500 font-mono">{goal.category}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-4">
        {/* Progress */}
        <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${rankColor}15` }}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-mono text-gray-500">DAY {currentDay} OF {totalDays}</span>
            <span className="text-[10px] font-mono font-bold" style={{ color: rankColor }}>{progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-white/5 overflow-hidden mb-3">
            <motion.div
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${rankColor}88, ${rankColor})` }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
          <div className="grid grid-cols-4 gap-2">
            <div className="text-center">
              <div className="text-xs font-bold text-white">{daysRemaining}</div>
              <div className="text-[8px] text-gray-600 font-mono">DAYS LEFT</div>
            </div>
            <div className="text-center">
              <div className="text-xs font-bold text-white">{goal.dailyCommitmentMin}m</div>
              <div className="text-[8px] text-gray-600 font-mono">DAILY</div>
            </div>
            <div className="text-center">
              <div className="text-xs font-bold" style={{ color: '#fb923c' }}>{goal.streak}</div>
              <div className="text-[8px] text-gray-600 font-mono">STREAK</div>
            </div>
            <div className="text-center">
              <div className="text-xs font-bold" style={{ color: rankColor }}>{goal.successProbability}%</div>
              <div className="text-[8px] text-gray-600 font-mono">ODDS</div>
            </div>
          </div>
        </div>

        {/* Today's Quests */}
        <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">Today's Mission Tasks</h3>
            {todayTasks && (
              <span className="text-[9px] font-mono" style={{ color: rankColor }}>
                {todayTasks.completedCount}/{todayTasks.totalCount}
              </span>
            )}
          </div>

          {!todayTasks && !isGenerating && (
            <button
              onClick={generateDailyQuests}
              className="w-full py-3 rounded-xl text-xs font-bold text-black uppercase tracking-wider"
              style={{ background: `linear-gradient(135deg, ${rankColor}, ${rankColor}cc)` }}
            >
              Generate Today's Quests (Free)
            </button>
          )}

          {isGenerating && (
            <div className="flex items-center justify-center py-6 gap-2">
              <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
              <span className="text-[10px] text-gray-400 font-mono">Generating interconnected quests...</span>
            </div>
          )}

          {todayTasks && (
            <div className="space-y-2">
              {todayTasks.dailyNote && (
                <div className="rounded-lg p-2.5 mb-2" style={{ background: 'rgba(34,211,238,0.04)', border: '1px solid rgba(34,211,238,0.08)' }}>
                  <p className="text-[9px] text-cyan-300 font-mono">{todayTasks.dailyNote}</p>
                </div>
              )}
              {todayTasks.quests.map((quest) => (
                <motion.div
                  key={quest.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => toggleQuestComplete(quest.id)}
                  className="rounded-xl p-3 flex items-start gap-3 cursor-pointer transition-all"
                  style={{
                    background: quest.completed ? 'rgba(34,197,94,0.06)' : 'rgba(255,255,255,0.02)',
                    border: quest.completed ? '1px solid rgba(34,197,94,0.15)' : '1px solid rgba(255,255,255,0.04)',
                  }}
                >
                  {quest.completed ? (
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="w-4 h-4 text-gray-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className={`text-[11px] font-medium ${quest.completed ? 'text-gray-500 line-through' : 'text-white'}`}>
                      {quest.title}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[8px] font-mono" style={{ color: rankColor }}>{quest.rank}-Rank</span>
                      <span className="text-[8px] text-gray-600 font-mono">{quest.estimatedDuration}min</span>
                      <span className="text-[8px] text-cyan-500 font-mono">{Math.round(quest.xp * 1.5)}xp</span>
                    </div>
                    {quest.connectionToPrevious && (
                      <p className="text-[8px] text-gray-600 font-mono mt-0.5 italic">↳ {quest.connectionToPrevious}</p>
                    )}
                  </div>
                </motion.div>
              ))}
              {todayTasks.progressUpdate && (
                <div className="text-[9px] text-gray-600 font-mono text-center mt-2">{todayTasks.progressUpdate}</div>
              )}
            </div>
          )}
        </div>

        {/* Milestones */}
        <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <h3 className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-3">Mission Phases</h3>
          <div className="space-y-2">
            {(goal.milestones || []).map((m) => {
              const isActive = currentMilestone?.phase === m.phase;
              const isDone = currentDay > m.endDay;
              return (
                <div
                  key={m.phase}
                  className="rounded-xl p-3"
                  style={{
                    background: isActive ? `${rankColor}08` : 'rgba(255,255,255,0.02)',
                    border: isActive ? `1px solid ${rankColor}20` : '1px solid rgba(255,255,255,0.03)',
                  }}
                >
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-black flex-shrink-0"
                      style={{
                        background: isDone ? 'rgba(34,197,94,0.15)' : isActive ? `${rankColor}20` : 'rgba(255,255,255,0.05)',
                        color: isDone ? '#4ade80' : isActive ? rankColor : '#6b7280',
                      }}
                    >
                      {isDone ? '✓' : m.phase}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-[10px] font-medium ${isDone ? 'text-gray-500' : isActive ? 'text-white' : 'text-gray-400'}`}>
                        {m.title}
                      </div>
                      <div className="text-[8px] text-gray-600 font-mono">
                        Day {m.startDay}–{m.endDay} • {m.targetOutcome}
                      </div>
                    </div>
                  </div>
                  {isActive && m.sampleDailyPattern && (
                    <div className="ml-8.5 mt-1.5 space-y-0.5">
                      {m.sampleDailyPattern.map((t, i) => (
                        <div key={i} className="text-[8px] text-gray-500 font-mono flex items-start gap-1">
                          <span className="text-cyan-600">•</span> {t}
                        </div>
                      ))}
                    </div>
                  )}
                  {m.connectionToNext && isActive && (
                    <div className="ml-8.5 mt-1 text-[8px] text-gray-600 font-mono italic">
                      → {m.connectionToNext}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Reasoning */}
        {goal.reasoning && (
          <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <h3 className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-2">AI Analysis</h3>
            <p className="text-[10px] text-gray-400 font-mono leading-relaxed">{goal.reasoning}</p>
            {goal.smartDurationReasoning && (
              <p className="text-[10px] text-gray-500 font-mono leading-relaxed mt-2 pt-2 border-t border-white/5">
                {goal.smartDurationReasoning}
              </p>
            )}
          </div>
        )}

        {/* Risk Factors */}
        {goal.riskFactors?.length > 0 && (
          <div className="rounded-2xl p-4" style={{ background: 'rgba(251,191,36,0.03)', border: '1px solid rgba(251,191,36,0.08)' }}>
            <h3 className="text-[10px] font-mono text-amber-400 uppercase tracking-wider mb-2">Risk Factors</h3>
            {goal.riskFactors.map((r, i) => (
              <div key={i} className="text-[9px] text-gray-400 font-mono flex items-start gap-1.5 mb-1">
                <AlertTriangle className="w-2.5 h-2.5 text-amber-500 flex-shrink-0 mt-0.5" /> {r}
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pb-4">
          <button
            onClick={togglePause}
            className="flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5"
            style={{ background: 'rgba(255,255,255,0.05)', color: goal.status === 'PAUSED' ? '#4ade80' : '#facc15' }}
          >
            {goal.status === 'PAUSED' ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            {goal.status === 'PAUSED' ? 'Resume' : 'Pause'}
          </button>
          <button
            onClick={() => setShowConfirmAbandon(true)}
            className="flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5"
            style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444' }}
          >
            <Trash2 className="w-3.5 h-3.5" /> Abandon
          </button>
        </div>

        {/* Abandon Confirmation */}
        <AnimatePresence>
          {showConfirmAbandon && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[99999] flex items-center justify-center px-6"
              style={{ background: 'rgba(0,0,0,0.8)' }}
              onClick={() => setShowConfirmAbandon(false)}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                className="rounded-2xl p-5 max-w-sm w-full"
                style={{ background: '#111118', border: '1px solid rgba(239,68,68,0.2)' }}
                onClick={e => e.stopPropagation()}
              >
                <h3 className="text-sm font-bold text-red-400 mb-2">Abandon Mission?</h3>
                <p className="text-[10px] text-gray-400 font-mono mb-4">
                  This will permanently end this goal. Your progress will be lost and you'll lose 50 gold as a penalty.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowConfirmAbandon(false)}
                    className="flex-1 py-2.5 rounded-xl text-[10px] font-bold text-gray-300"
                    style={{ background: 'rgba(255,255,255,0.05)' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      onDeleteGoal(goal.id);
                      playSystemSoundEffect('WARNING');
                    }}
                    className="flex-1 py-2.5 rounded-xl text-[10px] font-bold text-white"
                    style={{ background: 'rgba(239,68,68,0.3)' }}
                  >
                    Abandon (−50 Gold)
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
