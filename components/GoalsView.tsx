import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Target, Trophy, Sparkles, Loader2, Swords } from 'lucide-react';
import { Goal, GoalDailyTask, PlayerData, Quest, Rank } from '../types';
import GoalCard from './GoalCard';
import GoalCreationFlow from './GoalCreationFlow';
import GoalDetailView from './GoalDetailView';
import { showSystemToast } from './SystemToast';
import { playSystemSoundEffect } from '../utils/soundEngine';
import { API_BASE } from '../lib/apiConfig';
import { getPlayerAuthHeaders } from '../lib/playerApi';

// ── Helpers ──
function todayStr(): string { return new Date().toISOString().split('T')[0]; }

function addMins(time: string, mins: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

// Track which dates we've already auto-generated for (prevents duplicates on tab re-opens)
const _autoGenTracker: Record<string, string> = {}; // goalId -> lastAutoGenDate

interface GoalsViewProps {
  goals: Goal[];
  playerData?: PlayerData;
  onUpdateGoals: (goals: Goal[]) => void;
  onDeleteGoal?: (goalId: string) => void;
  onConsumeMana?: (amount: number) => boolean;
  onRefundMana?: (amount: number) => void;
  onDeductGold?: (amount: number) => void;
  onAddQuestToFeed?: (quest: Quest) => void;
  onUpdateScheduleSlots?: (slots: any[]) => void;
}

export default function GoalsView({
  goals,
  playerData,
  onUpdateGoals,
  onDeleteGoal,
  onConsumeMana,
  onRefundMana,
  onDeductGold,
  onAddQuestToFeed,
  onUpdateScheduleSlots,
}: GoalsViewProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

  // Auto-generation state
  const [autoGenState, setAutoGenState] = useState<'IDLE' | 'GENERATING' | 'DONE'>('IDLE');
  const [autoGenProgress, setAutoGenProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const autoGenRef = useRef(false); // prevent double-trigger

  const activeGoals = goals.filter(g => g.status === 'ACTIVE' || g.status === 'PAUSED');
  const completedGoals = goals.filter(g => g.status === 'COMPLETED');

  // ── Auto-generate quests for all active goals on mount ──
  useEffect(() => {
    if (autoGenRef.current) return;

    const today = todayStr();
    const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });

    // Find active goals that don't have today's quests AND haven't been auto-generated today
    const goalsNeedingGen = goals.filter(g => {
      if (g.status !== 'ACTIVE') return false;
      // Skip if already auto-generated today
      if (_autoGenTracker[g.id] === today) return false;
      // Skip if quests already exist for today
      const hasTodayTasks = g.dailyTasks?.some(t => t.date === today && t.quests?.length > 0);
      if (hasTodayTasks) return false;
      // Skip if today is rest day for this goal
      if (g.weeklyRestDay && g.weeklyRestDay !== 'NONE' && g.weeklyRestDay.toLowerCase() === dayOfWeek.toLowerCase()) return false;
      return true;
    });

    if (goalsNeedingGen.length === 0) return;

    // Check authentication
    const authHeaders = getPlayerAuthHeaders();
    if (!authHeaders || !authHeaders['Authorization']) return;

    autoGenRef.current = true;
    setAutoGenState('GENERATING');
    setAutoGenProgress({ current: 0, total: goalsNeedingGen.length });

    // Sequential generation for each goal
    (async () => {
      let updatedGoals = [...goals];
      let allNewQuests: Quest[] = [];
      let allScheduleSlots: any[] = [];
      let successCount = 0;

      for (let i = 0; i < goalsNeedingGen.length; i++) {
        const goal = goalsNeedingGen[i];
        setAutoGenProgress({ current: i + 1, total: goalsNeedingGen.length });

        try {
          const goalStartTime = goal.startDate || goal.createdAt || Date.now();
          const currentDay = Math.max(1, Math.floor((Date.now() - goalStartTime) / (1000 * 60 * 60 * 24)) + 1);

          const otherGoalTasksToday = goals
            .filter(g => g.id !== goal.id && g.status === 'ACTIVE')
            .flatMap(g => g.dailyTasks?.find(t => t.date === today)?.quests || [])
            .map(q => q.title)
            .join(', ');

          const otherGoalsMinutes = goals
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
              dayOfWeek,
              userCountry: playerData?.country || 'India',
              userLanguage: 'English',
              scheduleProfile: playerData?.scheduleProfile || null,
            }),
          });

          if (!res.ok) {
            const errBody = await res.json().catch(() => ({}));
            console.error(`[AutoGen] Goal "${goal.title}" failed:`, errBody);
            continue;
          }

          const data = await res.json();

          // Build daily task
          const newDailyTask: GoalDailyTask = {
            id: `dt-${goal.id}-${today}`,
            goalId: goal.id,
            date: today,
            dayNumber: currentDay,
            quests: data.quests || [],
            completedCount: 0,
            totalCount: (data.quests || []).length,
            dailyNote: data.dailyNote || '',
            progressUpdate: data.progressUpdate || '',
            createdAt: Date.now(),
          };

          // Update goal
          const updatedGoal: Goal = {
            ...goal,
            dailyTasks: [...(goal.dailyTasks || []).filter(t => t.date !== today), newDailyTask],
          };
          updatedGoals = updatedGoals.map(g => g.id === goal.id ? updatedGoal : g);

          // Build feed quests
          const feedQuests: Quest[] = (data.quests || []).map((gq: any, idx: number) => ({
            id: gq.id || `goal-quest-${goal.id}-${Date.now()}-${idx}`,
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
            scheduledTime: gq.scheduledTime || undefined,
          }));
          allNewQuests = [...allNewQuests, ...feedQuests];

          // Build schedule slots
          const scheduleSlots = feedQuests
            .filter(q => q.scheduledTime)
            .map(q => ({
              id: `sched-quest-${q.id}`,
              startTime: q.scheduledTime!,
              endTime: addMins(q.scheduledTime!, q.estimatedDuration || 20),
              type: 'QUEST' as const,
              label: q.title,
              questId: q.id,
              goalId: goal.id,
              status: 'PENDING' as const,
              isFlexible: true,
              isCarryOver: false,
              notifyEnabled: true,
            }));
          allScheduleSlots = [...allScheduleSlots, ...scheduleSlots];

          _autoGenTracker[goal.id] = today;
          successCount++;
        } catch (err) {
          console.error(`[AutoGen] Goal "${goal.title}" error:`, err);
        }
      }

      // Apply all results at once
      if (successCount > 0) {
        onUpdateGoals(updatedGoals);

        // Add all quest to feed
        allNewQuests.forEach(q => onAddQuestToFeed?.(q));

        // Update schedule slots
        if (allScheduleSlots.length > 0) {
          onUpdateScheduleSlots?.(allScheduleSlots);
        }

        // Show SYSTEM toast
        playSystemSoundEffect('PURCHASE');
        showSystemToast({
          type: 'QUEST_FORGED',
          title: successCount === 1
            ? `Today's quests forged!`
            : `${successCount} goals — quests forged!`,
          subtitle: `${allNewQuests.length} quests ready for today`,
          durationMs: 4500,
        });
      }

      setAutoGenState('DONE');
      autoGenRef.current = false;
    })();
  }, []); // Run only on mount

  const handleGoalCreated = useCallback((newGoal: Goal) => {
    onUpdateGoals([...goals, newGoal]);
    setShowCreate(false);
  }, [goals, onUpdateGoals]);

  const handleUpdateGoal = useCallback((updatedGoal: Goal) => {
    onUpdateGoals(goals.map(g => g.id === updatedGoal.id ? updatedGoal : g));
    setSelectedGoal(updatedGoal);
  }, [goals, onUpdateGoals]);

  const handleDeleteGoal = useCallback((goalId: string) => {
    const updated = goals.map(g => g.id === goalId ? { ...g, status: 'ABANDONED' as const } : g);
    onUpdateGoals(updated);
    setSelectedGoal(null);
    if (onDeleteGoal) onDeleteGoal(goalId);
    if (onDeductGold) onDeductGold(50);
  }, [goals, onUpdateGoals, onDeleteGoal, onDeductGold]);

  // If a goal detail is selected, show that
  if (selectedGoal) {
    const liveGoal = goals.find(g => g.id === selectedGoal.id) || selectedGoal;
    return (
      <GoalDetailView
        goal={liveGoal}
        playerData={playerData}
        allGoals={goals}
        onBack={() => setSelectedGoal(null)}
        onUpdateGoal={handleUpdateGoal}
        onDeleteGoal={handleDeleteGoal}
        onAddQuestToFeed={onAddQuestToFeed}
        onUpdateScheduleSlots={onUpdateScheduleSlots}
      />
    );
  }

  return (
    <div className="min-h-[60vh] pb-4">
      {/* Auto-generation loader */}
      <AnimatePresence>
        {autoGenState === 'GENERATING' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-2xl p-4 mb-4 overflow-hidden relative"
            style={{
              background: 'rgba(0,212,255,0.03)',
              border: '1px solid rgba(0,212,255,0.12)',
              boxShadow: '0 0 30px rgba(0,212,255,0.06)',
            }}
          >
            {/* Animated scanning line */}
            <motion.div
              className="absolute top-0 left-0 right-0 h-[2px]"
              style={{ background: 'linear-gradient(90deg, transparent, #00d4ff, transparent)' }}
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            />

            <div className="flex items-center gap-3">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              >
                <Loader2 className="w-5 h-5 text-[#00d4ff]" />
              </motion.div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[8px] font-black font-mono uppercase tracking-[0.3em] text-[#00d4ff]/60">SYSTEM</span>
                  <motion.div
                    className="w-1.5 h-1.5 rounded-full bg-[#00d4ff]"
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                </div>
                <div className="text-xs font-bold text-white mt-0.5">
                  Forging today's quests...
                </div>
                <div className="text-[9px] text-gray-500 font-mono mt-0.5">
                  Goal {autoGenProgress.current}/{autoGenProgress.total} • AI generating micro-quests
                </div>
              </div>
              <Swords className="w-4 h-4 text-[#00d4ff]/30 flex-shrink-0" />
            </div>

            {/* Progress bar */}
            <div className="mt-3 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg, #00d4ff, #00d4ff)' }}
                initial={{ width: '0%' }}
                animate={{ width: `${autoGenProgress.total > 0 ? (autoGenProgress.current / autoGenProgress.total) * 100 : 0}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Goals */}
      {activeGoals.length > 0 && (
        <div className="space-y-3 mb-4">
          {activeGoals.map(goal => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onTap={(g) => setSelectedGoal(g)}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {activeGoals.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-6">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(34,211,238,0.06)' }}>
            <Target className="w-7 h-7 text-[#00d4ff]" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">No Active Goals</h3>
          <p className="text-[10px] text-gray-500 font-mono text-center mb-5 max-w-[240px]">
            Set a long-term goal and AI will create a daily action plan to help you achieve it.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="px-6 py-3 rounded-xl text-xs font-black text-black uppercase tracking-wider"
            style={{ background: 'linear-gradient(135deg, #00d4ff, #00d4ff)' }}
          >
            Create Shadow Mission
          </button>
        </div>
      )}

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">Completed Missions</span>
          </div>
          <div className="space-y-2">
            {completedGoals.map(goal => (
              <GoalCard key={goal.id} goal={goal} onTap={(g) => setSelectedGoal(g)} />
            ))}
          </div>
        </div>
      )}

      {/* FAB — only show if there are existing goals */}
      {activeGoals.length > 0 && activeGoals.length < 3 && (
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowCreate(true)}
          className="fixed bottom-24 right-5 w-13 h-13 rounded-full flex items-center justify-center z-50 shadow-lg"
          style={{ background: 'linear-gradient(135deg, #00d4ff, #00d4ff)', width: 52, height: 52 }}
        >
          <Plus className="w-5 h-5 text-black" />
        </motion.button>
      )}

      {/* Creation Flow Modal */}
      <AnimatePresence>
        {showCreate && (
          <GoalCreationFlow
            playerData={playerData}
            existingGoals={goals}
            onClose={() => setShowCreate(false)}
            onGoalCreated={handleGoalCreated}
            onConsumeMana={onConsumeMana}
            onRefundMana={onRefundMana}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
