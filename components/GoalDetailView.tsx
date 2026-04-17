import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Calendar, Clock, Target, Flame, TrendingUp, Pause, Play, Trash2, Loader2, CheckCircle, Circle, AlertTriangle, ExternalLink, BookOpen, Youtube, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { Goal, GoalDailyTask, GoalQuest, GoalQuestResource, PlayerData, Quest, Rank } from '../types';
import { playSystemSoundEffect } from '../utils/soundEngine';
import { API_BASE } from '../lib/apiConfig';
import { getPlayerAuthHeaders } from '../lib/playerApi';

const RANK_COLORS: Record<string, string> = {
  E: '#9ca3af', D: '#fb923c', C: '#facc15', B: '#4ade80', A: '#22d3ee', S: '#c084fc',
  UNRANKED: '#6b7280',
};

// Collapsible text component
function ReadMore({ text, maxLines = 3 }: { text: string; maxLines?: number }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > maxLines * 80;
  return (
    <div>
      <p className={`text-[13px] text-gray-400 font-mono leading-relaxed ${!expanded && isLong ? 'line-clamp-3' : ''}`}>{text}</p>
      {isLong && (
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 mt-1 text-[11px] text-cyan-400 font-mono">
          {expanded ? <><ChevronUp className="w-3 h-3" /> Show less</> : <><ChevronDown className="w-3 h-3" /> Read more</>}
        </button>
      )}
    </div>
  );
}

interface GoalDetailViewProps {
  goal: Goal;
  playerData?: PlayerData;
  allGoals: Goal[];
  onBack: () => void;
  onUpdateGoal: (updatedGoal: Goal) => void;
  onDeleteGoal: (goalId: string) => void;
  onAddQuestToFeed?: (quest: Quest) => void;
}

export default function GoalDetailView({
  goal,
  playerData,
  allGoals,
  onBack,
  onUpdateGoal,
  onDeleteGoal,
  onAddQuestToFeed,
}: GoalDetailViewProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [todayTasks, setTodayTasks] = useState<GoalDailyTask | null>(null);
  const [showConfirmAbandon, setShowConfirmAbandon] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

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
    setGenerateError(null);

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
          userCountry: playerData?.country || 'India',
          userLanguage: 'English',
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Server error (${res.status})`);
      }
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

      // Inject each goal quest into the main quest feed
      if (onAddQuestToFeed && data.quests) {
        data.quests.forEach((gq: any, i: number) => {
          const feedQuest: Quest = {
            id: gq.id || `goal-quest-${goal.id}-${Date.now()}-${i}`,
            title: gq.title,
            description: gq.reasoning || `Goal quest for: ${goal.title}`,
            rank: (gq.rank || 'D') as Rank,
            priority: 'MEDIUM' as any,
            category: (gq.categories?.[0] || 'intelligence') as any,
            categories: gq.categories,
            xpReward: Math.round((gq.xp || 50) * 1.5),
            isCompleted: false,
            createdAt: Date.now(),
            isDaily: true,
            estimatedDuration: gq.estimatedDuration,
            aiReasoning: gq.reasoning,
            goalId: goal.id,
            goalTitle: goal.title,
            goalQuestResources: gq.resources || [],
            goalQuestSteps: gq.stepByStep || [],
            connectionToPrevious: gq.connectionToPrevious,
          };
          onAddQuestToFeed(feedQuest);
        });
      }

      playSystemSoundEffect('PURCHASE');
    } catch (err: any) {
      console.error('[GoalDetail] Failed to generate daily quests:', err);
      setGenerateError(err.message || 'Failed to generate quests. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }, [goal, playerData, allGoals, todayStr, currentDay, isGenerating, onUpdateGoal, onAddQuestToFeed]);

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
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-white truncate">{goal.title}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] font-black px-2 py-0.5 rounded" style={{ background: `${rankColor}20`, color: rankColor }}>
                {goal.goalRank}-RANK
              </span>
              <span className="text-[11px] text-gray-500 font-mono">{goal.category}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-4">
        {/* Progress */}
        <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${rankColor}15` }}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-mono text-gray-500">DAY {currentDay} OF {totalDays}</span>
            <span className="text-xs font-mono font-bold" style={{ color: rankColor }}>{progress}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-white/5 overflow-hidden mb-3">
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
              <div className="text-sm font-bold text-white">{daysRemaining}</div>
              <div className="text-[10px] text-gray-600 font-mono">DAYS LEFT</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-bold text-white">{goal.dailyCommitmentMin}m</div>
              <div className="text-[10px] text-gray-600 font-mono">DAILY</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-bold" style={{ color: '#fb923c' }}>{goal.streak}</div>
              <div className="text-[10px] text-gray-600 font-mono">STREAK</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-bold" style={{ color: rankColor }}>{goal.successProbability}%</div>
              <div className="text-[10px] text-gray-600 font-mono">ODDS</div>
            </div>
          </div>
        </div>

        {/* Today's Quests */}
        <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-mono text-gray-500 uppercase tracking-wider">Today's Mission Tasks</h3>
            {todayTasks && (
              <span className="text-[11px] font-mono" style={{ color: rankColor }}>
                {todayTasks.completedCount}/{todayTasks.totalCount}
              </span>
            )}
          </div>

          {!todayTasks && !isGenerating && (
            <button
              onClick={generateDailyQuests}
              className="w-full py-3.5 rounded-xl text-sm font-bold text-black uppercase tracking-wider"
              style={{ background: `linear-gradient(135deg, ${rankColor}, ${rankColor}cc)` }}
            >
              Generate Today's Quests (Free)
            </button>
          )}

          {isGenerating && (
            <div className="flex items-center justify-center py-6 gap-2">
              <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
              <span className="text-xs text-gray-400 font-mono">Generating resource-rich quests with AI...</span>
            </div>
          )}

          {generateError && !isGenerating && !todayTasks && (
            <div className="rounded-xl p-3 mb-2" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
              <div className="flex items-start gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-[12px] text-red-300 font-mono leading-relaxed">{generateError}</p>
              </div>
              <button
                onClick={generateDailyQuests}
                className="w-full py-2.5 rounded-lg text-xs font-bold text-white uppercase tracking-wider mt-1"
                style={{ background: 'rgba(239,68,68,0.15)' }}
              >
                Retry Generation
              </button>
            </div>
          )}

          {todayTasks && (
            <div className="space-y-2">
              {todayTasks.dailyNote && (
                <div className="rounded-lg p-3 mb-2" style={{ background: 'rgba(34,211,238,0.04)', border: '1px solid rgba(34,211,238,0.08)' }}>
                  <p className="text-[13px] text-cyan-300 font-mono leading-relaxed">{todayTasks.dailyNote}</p>
                </div>
              )}
              <p className="text-[11px] text-gray-600 font-mono">Quests have been added to your main quest feed.</p>
              {todayTasks.progressUpdate && (
                <div className="text-xs text-gray-600 font-mono text-center mt-2">{todayTasks.progressUpdate}</div>
              )}
            </div>
          )}
        </div>

        {/* Milestones */}
        <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <h3 className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-3">Mission Phases</h3>
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
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black flex-shrink-0"
                      style={{
                        background: isDone ? 'rgba(34,197,94,0.15)' : isActive ? `${rankColor}20` : 'rgba(255,255,255,0.05)',
                        color: isDone ? '#4ade80' : isActive ? rankColor : '#6b7280',
                      }}
                    >
                      {isDone ? '✓' : m.phase}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-[13px] font-semibold ${isDone ? 'text-gray-500' : isActive ? 'text-white' : 'text-gray-400'}`}>
                        {m.title}
                      </div>
                      <div className="text-[11px] text-gray-600 font-mono">
                        Day {m.startDay}–{m.endDay} • {m.targetOutcome}
                      </div>
                    </div>
                  </div>
                  {isActive && m.sampleDailyPattern && (
                    <div className="ml-9 mt-1.5 space-y-0.5">
                      {m.sampleDailyPattern.map((t, i) => (
                        <div key={i} className="text-[11px] text-gray-500 font-mono flex items-start gap-1">
                          <span className="text-cyan-600">•</span> {t}
                        </div>
                      ))}
                    </div>
                  )}
                  {m.connectionToNext && isActive && (
                    <div className="ml-9 mt-1 text-[11px] text-gray-600 font-mono italic">
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
            <h3 className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-2">AI Analysis</h3>
            <ReadMore text={goal.reasoning} />
            {goal.smartDurationReasoning && (
              <div className="mt-2 pt-2 border-t border-white/5">
                <ReadMore text={goal.smartDurationReasoning} />
              </div>
            )}
          </div>
        )}

        {/* Risk Factors */}
        {goal.riskFactors?.length > 0 && (
          <div className="rounded-2xl p-4" style={{ background: 'rgba(251,191,36,0.03)', border: '1px solid rgba(251,191,36,0.08)' }}>
            <h3 className="text-xs font-mono text-amber-400 uppercase tracking-wider mb-2">Risk Factors</h3>
            {goal.riskFactors.map((r, i) => (
              <div key={i} className="text-[12px] text-gray-400 font-mono flex items-start gap-1.5 mb-1.5">
                <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" /> {r}
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pb-4">
          <button
            onClick={togglePause}
            className="flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5"
            style={{ background: 'rgba(255,255,255,0.05)', color: goal.status === 'PAUSED' ? '#4ade80' : '#facc15' }}
          >
            {goal.status === 'PAUSED' ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            {goal.status === 'PAUSED' ? 'Resume' : 'Pause'}
          </button>
          <button
            onClick={() => setShowConfirmAbandon(true)}
            className="flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5"
            style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444' }}
          >
            <Trash2 className="w-4 h-4" /> Abandon
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
                <h3 className="text-base font-bold text-red-400 mb-2">Abandon Mission?</h3>
                <p className="text-[13px] text-gray-400 font-mono mb-4">
                  This will permanently end this goal. Your progress will be lost and you'll lose 50 gold as a penalty.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowConfirmAbandon(false)}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold text-gray-300"
                    style={{ background: 'rgba(255,255,255,0.05)' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      onDeleteGoal(goal.id);
                      playSystemSoundEffect('WARNING');
                    }}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white"
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
