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
import { getPlayerAuthHeaders, authenticatedFetch } from '../lib/playerApi';
import { buildDungeonGoalQuest, buildDungeonGoalDailyTask } from '../lib/dungeonGoalQuest';
import FocusShieldSettings from './FocusShieldSettings';

// ── Helpers ──
function todayStr(): string { return new Date().toISOString().split('T')[0]; }

function addMins(time: string, mins: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

// Track which dates we've already auto-generated for (prevents duplicates on tab re-opens)
const _autoGenTracker: Record<string, string> = {}; // goalId -> lastAutoGenDate

interface ShadowMissionsProUpsellProps {
  onUpgradePro?: () => void;
}

function ShadowMissionsProUpsell({ onUpgradePro }: ShadowMissionsProUpsellProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-[#0a0c16]/90 border border-cyan-500/20 rounded-2xl max-w-sm mx-auto text-center relative overflow-hidden min-h-[350px] shadow-[0_0_25px_rgba(6,182,212,0.15)] mt-4">
      {/* Background Image with opacity overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-[0.08] mix-blend-luminosity"
        style={{ backgroundImage: `url('/banners/defaultreforgebanner.webp')` }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.08),transparent_80%)] pointer-events-none" />

      {/* Decorative tech corners */}
      <div className="absolute top-0 left-0 w-3.5 h-3.5 border-t-2 border-l-2 border-cyan-500/30" />
      <div className="absolute top-0 right-0 w-3.5 h-3.5 border-t-2 border-r-2 border-cyan-500/30" />
      <div className="absolute bottom-0 left-0 w-3.5 h-3.5 border-b-2 border-l-2 border-cyan-500/30" />
      <div className="absolute bottom-0 right-0 w-3.5 h-3.5 border-b-2 border-r-2 border-cyan-500/30" />

      <div className="p-3 bg-cyan-950/20 border border-cyan-500/20 rounded-2xl mb-4 relative z-10">
        <Target className="w-8 h-8 text-cyan-400" />
      </div>

      <span className="text-[10px] font-black font-mono uppercase tracking-[0.25em] text-cyan-400 relative z-10">
        PRO Clearance Required
      </span>
      <h3 className="text-[15px] font-heading font-black text-white uppercase tracking-wider mt-1.5 relative z-10">
        Shadow Missions System
      </h3>
      <div className="h-px w-14 bg-cyan-500/20 my-3.5 relative z-10" />

      <p className="text-[11px] text-slate-400 leading-relaxed font-sans max-w-[260px] mb-6 relative z-10">
        Custom goals and shadow missions are S-Rank features. Upgrade to Pro to formulate custom targets, deploy daily micro-quests, and unlock live AI telemetry tracking.
      </p>

      {/* 2 Buttons */}
      <div className="flex flex-col w-full gap-2.5 relative z-10 px-2">
        <button
          onClick={() => {
            playSystemSoundEffect('SELECT');
            onUpgradePro?.();
          }}
          className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-black text-xs font-black font-mono uppercase tracking-widest rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.25)] hover:brightness-110 active:scale-[0.98]"
        >
          Upgrade to S-Rank (Pro)
        </button>
        
        <button
          onClick={() => {
            playSystemSoundEffect('SELECT');
            onUpgradePro?.();
          }}
          className="w-full py-2.5 bg-slate-900 border border-slate-800 text-slate-400 text-[10px] font-bold font-mono uppercase tracking-wider rounded-xl transition-all hover:text-white"
        >
          Restore Clearance
        </button>
      </div>
    </div>
  );
}

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
  isPremium?: boolean;
  onUpgradePro?: () => void;
  goalCreateTrigger?: number;
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
  isPremium = false,
  onUpgradePro,
  goalCreateTrigger = 0,
}: GoalsViewProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [subTab, setSubTab] = useState<'SHADOW_MISSIONS' | 'FOCUS_SHIELD'>('SHADOW_MISSIONS');

  // Listen to top header + button trigger from App.tsx
  useEffect(() => {
    if (goalCreateTrigger > 0) {
      setShowCreate(true);
    }
  }, [goalCreateTrigger]);

  // Auto-generation state
  const [autoGenState, setAutoGenState] = useState<'IDLE' | 'GENERATING' | 'DONE'>('IDLE');
  const [autoGenProgress, setAutoGenProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const autoGenRef = useRef(false); // prevent double-trigger

  // System goals always appear first
  const activeGoals = goals
    .filter(g => g.status === 'ACTIVE' || g.status === 'PAUSED')
    .sort((a, b) => (b.isSystemGoal ? 1 : 0) - (a.isSystemGoal ? 1 : 0));
  const completedGoals = goals.filter(g => g.status === 'COMPLETED');

  // ── Auto-generate quests for all active goals on mount ──
  useEffect(() => {
    if (autoGenRef.current) return;

    const today = todayStr();
    const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });

    // Find active goals that don't have today's quests AND haven't been auto-generated today
    const goalsNeedingGen = goals.filter(g => {
      if (g.status !== 'ACTIVE') return false;
      // Skip system goals (e.g. Daily Dungeon — has its own quest engine)
      if (g.isSystemGoal) return false;
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

          // ── FITNESS GOAL SHORT-CIRCUIT (auto-gen path) ──
          // Skip the AI; synthesize a single dungeon-linked quest. No keys consumed.
          if (goal.category === 'FITNESS' as any) {
            const currentTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
            const dungeonQuest = buildDungeonGoalQuest({ goal, todayStr: today, currentTime });
            const newDailyTask = buildDungeonGoalDailyTask({ goal, todayStr: today, dayNumber: currentDay, currentTime });
            const updatedGoal: Goal = {
              ...goal,
              dailyTasks: [...(goal.dailyTasks || []).filter(t => t.date !== today), newDailyTask],
            };
            updatedGoals = updatedGoals.map(g => g.id === goal.id ? updatedGoal : g);
            allNewQuests = [...allNewQuests, dungeonQuest];
            if (dungeonQuest.scheduledTime) {
              allScheduleSlots = [...allScheduleSlots, {
                id: `sched-quest-${dungeonQuest.id}`,
                startTime: dungeonQuest.scheduledTime,
                endTime: addMins(dungeonQuest.scheduledTime, dungeonQuest.estimatedDuration || 30),
                type: 'WORKOUT' as const,
                label: dungeonQuest.title,
                questId: dungeonQuest.id,
                goalId: goal.id,
                status: 'PENDING' as const,
                isFlexible: true,
                isCarryOver: false,
                notifyEnabled: true,
              }];
            }
            _autoGenTracker[goal.id] = today;
            successCount++;
            continue;
          }

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

          const res = await authenticatedFetch(`${API_BASE}/api/goals/daily-quests`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getPlayerAuthHeaders() },
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
              currentTime: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }),
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
      {/* Premium PRO Tab Header Bar */}
      <div className="flex p-1 bg-gray-950/80 border border-gray-800/80 rounded-xl mb-6 relative overflow-hidden max-w-sm mx-auto">
        <button
          onClick={() => { playSystemSoundEffect('TAB_SWITCH'); setSubTab('SHADOW_MISSIONS'); }}
          className={`flex-1 text-center py-2 text-[10px] font-bold font-mono tracking-wider transition-colors relative z-10 ${
            subTab === 'SHADOW_MISSIONS' ? 'text-black' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          {subTab === 'SHADOW_MISSIONS' && (
            <motion.div
              layoutId="active-pro-tab"
              className="absolute inset-0 bg-system-neon rounded-lg -z-10 shadow-[0_0_15px_#00d4ff]"
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            />
          )}
          SHADOW MISSIONS
        </button>
        <button
          onClick={() => {
            playSystemSoundEffect('TAB_SWITCH');
            setSubTab('FOCUS_SHIELD');
          }}
          className={`flex-1 text-center py-2 text-[10px] font-bold font-mono tracking-wider transition-colors relative z-10 flex items-center justify-center gap-1.5 ${
            subTab === 'FOCUS_SHIELD' ? 'text-black' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          {subTab === 'FOCUS_SHIELD' && (
            <motion.div
              layoutId="active-pro-tab"
              className="absolute inset-0 bg-system-neon rounded-lg -z-10 shadow-[0_0_15px_#00d4ff]"
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            />
          )}
          FOCUS SHIELD
        </button>
      </div>

      {subTab === 'FOCUS_SHIELD' ? (
        <FocusShieldSettings playerData={playerData} isPremium={isPremium} onUpgradePro={onUpgradePro} />
      ) : !isPremium ? (
        <ShadowMissionsProUpsell onUpgradePro={onUpgradePro} />
      ) : (
        <>
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
                onClick={() => {
                  if (!isPremium) {
                    playSystemSoundEffect('DEBUFF_CAST');
                    showSystemToast({
                      type: 'WARNING',
                      title: 'Premium Required',
                      subtitle: 'Custom goals are a Reforge Pro feature.',
                      durationMs: 4000
                    });
                    onUpgradePro?.();
                    return;
                  }
                  setShowCreate(true);
                }}
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
        </>
      )}
    </div>
  );
}
