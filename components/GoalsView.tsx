import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Target, Trophy, Sparkles, Loader2, Swords, Zap, Crown, Shield, ShieldAlert, Clock, Camera, Youtube, Play, Dumbbell } from 'lucide-react';
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

const HowItWorksScreen = React.lazy(() => import('./HowItWorksScreen'));

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
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  return (
    <div className="space-y-3 max-w-sm mx-auto mt-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full rounded-2xl overflow-hidden"
        style={{
          background: '#0a0a14',
          border: '1px solid rgba(0,212,255,0.15)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
        }}
      >
        {/* Background image */}
        <div className="relative w-full" style={{ height: 200 }}>
          <GoalHeroImg />
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(180deg, rgba(10,10,20,0.15) 0%, rgba(10,10,20,0.5) 30%, rgba(10,10,20,0.85) 55%, #0a0a14 78%)',
          }} />
        </div>

        {/* Content overlay */}
        <div className="absolute bottom-0 left-0 right-0" style={{ padding: '0 22px 20px' }}>
          <h2 className="text-xl font-black text-white leading-none mb-1.5"
            style={{ textShadow: '0 4px 20px rgba(0,0,0,0.8)' }}>
            Create Custom Goals
          </h2>
          <p className="text-[10px] text-gray-400 leading-relaxed mb-3 max-w-[280px]">
            AI generates daily quests, tracks milestones, and keeps you on track — automatically.
          </p>

          <motion.button
            onClick={() => {
              playSystemSoundEffect('SELECT');
              onUpgradePro?.();
            }}
            whileTap={{ scale: 0.96 }}
            className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl font-bold text-sm tracking-wide transition-all"
            style={{
              background: 'linear-gradient(135deg, #facc15 0%, #f59e0b 100%)',
              color: '#0a0a14',
              boxShadow: '0 4px 24px rgba(250,204,21,0.3), 0 0 0 1px rgba(250,204,21,0.2)',
            }}
          >
            <Zap size={16} />
            Unlock AI Autopilot
          </motion.button>

          {/* How It Works button */}
          <button
            onClick={() => {
              playSystemSoundEffect('SELECT');
              setShowHowItWorks(true);
            }}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg font-mono text-[10px] font-bold tracking-[0.15em] uppercase transition-all"
            style={{
              background: 'rgba(0,212,255,0.06)',
              border: '1px solid rgba(0,212,255,0.12)',
              color: 'rgba(0,212,255,0.5)',
              cursor: 'pointer',
              marginTop: 10,
            }}
          >
            <Sparkles size={12} />
            How It Works
          </button>
        </div>
      </motion.div>

      {/* How It Works full-screen */}
      <AnimatePresence>
        {showHowItWorks && (
          <React.Suspense fallback={null}>
            <HowItWorksScreen
              onClose={() => setShowHowItWorks(false)}
              onClaimTrial={() => {
                setShowHowItWorks(false);
                onUpgradePro?.();
              }}
            />
          </React.Suspense>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/* PRO SHOWCASE PAGE — unified preview for non-premium users */
/* ═══════════════════════════════════════════════════════════ */
function ProShowcasePage({ onUpgradePro }: { onUpgradePro?: () => void }) {
  return (
    <div className="space-y-6 pb-10">

      {/* ═══ HERO HEADER ═══ */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center pt-2"
      >
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-3"
          style={{ background: 'rgba(250,204,21,0.06)', border: '1px solid rgba(250,204,21,0.15)' }}>
          <Crown size={12} style={{ color: '#facc15' }} />
          <span className="text-[8px] font-mono font-black tracking-[0.3em] uppercase" style={{ color: '#facc15' }}>
            REFORGE PRO
          </span>
        </div>
        <h2 className="text-lg font-black text-white leading-tight">
          Unlock Your Full<br/>Potential
        </h2>
        <p className="text-[10px] text-gray-500 font-mono mt-1.5 tracking-wide">
          EVERYTHING BELOW • INCLUDED IN PRO
        </p>
      </motion.div>

      {/* ═══ SECTION 1: AI GOALS ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {/* Section label */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(180deg, #facc15, #f59e0b)' }} />
          <span className="text-[9px] font-mono font-black tracking-[0.3em] uppercase" style={{ color: '#facc15' }}>
            AI GOAL SYSTEM
          </span>
        </div>

        {/* Goals hero card */}
        <div
          className="relative w-full rounded-2xl overflow-hidden"
          style={{
            background: '#0a0a14',
            border: '1px solid rgba(250,204,21,0.12)',
            boxShadow: '0 16px 48px rgba(0,0,0,0.6), 0 0 40px rgba(250,204,21,0.04)',
          }}
        >
          <div className="relative w-full" style={{ height: 200 }}>
            <GoalHeroImg />
            <div className="absolute inset-0" style={{
              background: 'linear-gradient(180deg, rgba(10,10,20,0.15) 0%, rgba(10,10,20,0.5) 30%, rgba(10,10,20,0.85) 55%, #0a0a14 78%)',
            }} />
          </div>
          <div className="absolute bottom-0 left-0 right-0" style={{ padding: '0 22px 20px' }}>
            <h2 className="text-xl font-black text-white leading-none mb-1.5"
              style={{ textShadow: '0 4px 20px rgba(0,0,0,0.8)' }}>
              AI-Powered Goals
            </h2>
            <p className="text-[10px] text-gray-400 leading-relaxed mb-3 max-w-[280px]">
              Set any goal — fitness, career, study, habits. AI generates daily quests, tracks milestones, and keeps you accountable.
            </p>
            <motion.button
              onClick={() => { playSystemSoundEffect('SELECT'); onUpgradePro?.(); }}
              whileTap={{ scale: 0.96 }}
              className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl font-bold text-sm tracking-wide"
              style={{
                background: 'linear-gradient(135deg, #facc15 0%, #f59e0b 100%)',
                color: '#0a0a14',
                boxShadow: '0 4px 24px rgba(250,204,21,0.3)',
              }}
            >
              <Zap size={16} />
              Unlock AI Autopilot
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* ═══ PINNED PREVIEW CARDS (tilted) ═══ */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="flex justify-center items-start gap-4 px-6"
      >
        <motion.div
          className="w-[130px] rounded-xl overflow-hidden"
          style={{
            transform: 'rotate(-6deg) translateY(8px)',
            border: '2px solid rgba(255,255,255,0.08)',
            boxShadow: '0 12px 32px rgba(0,0,0,0.6), 0 0 20px rgba(250,204,21,0.05)',
          }}
        >
          <img src="/paywall/ss_quests.webp" alt="AI Quests Preview" className="w-full h-auto block" loading="lazy" />
        </motion.div>
        <motion.div
          className="w-[130px] rounded-xl overflow-hidden"
          style={{
            transform: 'rotate(5deg) translateY(-4px)',
            border: '2px solid rgba(255,255,255,0.08)',
            boxShadow: '0 12px 32px rgba(0,0,0,0.6), 0 0 20px rgba(0,212,255,0.05)',
          }}
        >
          <img src="/paywall/ss_nutrition.webp" alt="Nutrition Scanner Preview" className="w-full h-auto block" loading="lazy" />
        </motion.div>
      </motion.div>

      {/* ═══ DIVIDER ═══ */}
      <div className="flex items-center gap-3 px-2">
        <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }} />
        <Sparkles size={10} className="text-gray-700" />
        <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }} />
      </div>

      {/* ═══ SECTION 2: FOCUS SHIELD ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        {/* Section label */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(180deg, #00d4ff, #0088aa)' }} />
          <span className="text-[9px] font-mono font-black tracking-[0.3em] uppercase" style={{ color: '#00d4ff' }}>
            FOCUS SHIELD
          </span>
          <div className="px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.15)' }}>
            <span className="text-[7px] font-mono font-bold tracking-wider" style={{ color: '#00d4ff' }}>APP BLOCKER</span>
          </div>
        </div>

        {/* Master Switch Card */}
        <div
          className="rounded-2xl p-5 mb-5 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(0,212,255,0.05) 0%, rgba(0,100,180,0.03) 100%)',
            border: '1px solid rgba(0,212,255,0.12)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3), 0 0 60px rgba(0,212,255,0.03)',
          }}
        >
          {/* Background glow */}
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(0,212,255,0.06) 0%, transparent 70%)' }} />

          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-4">
              <motion.div
                animate={{ boxShadow: ['0 0 15px rgba(0,212,255,0.2)', '0 0 25px rgba(0,212,255,0.4)', '0 0 15px rgba(0,212,255,0.2)'] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)' }}
              >
                <Shield className="w-6 h-6 text-[#00d4ff]" />
              </motion.div>
              <div>
                <div className="text-[15px] font-black text-white">Focus Shield</div>
                <div className="text-[9px] text-gray-500 font-mono tracking-wider">BLOCK DISTRACTING APPS</div>
              </div>
            </div>
            {/* Decorative ON toggle */}
            <div className="w-[56px] h-8 rounded-full p-0.5 flex items-center justify-end"
              style={{
                background: 'rgba(0,40,60,0.6)',
                border: '1px solid rgba(0,212,255,0.3)',
                boxShadow: '0 0 12px rgba(0,212,255,0.15), inset 0 0 8px rgba(0,212,255,0.05)',
              }}>
              <motion.div
                animate={{ boxShadow: ['0 0 6px rgba(0,212,255,0.6)', '0 0 12px rgba(0,212,255,0.9)', '0 0 6px rgba(0,212,255,0.6)'] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-6 h-6 rounded-full flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #00d4ff, #0099cc)' }}
              >
                <span className="text-black text-[10px] font-black">✓</span>
              </motion.div>
            </div>
          </div>
        </div>

        {/* HOW IT WORKS — Step-by-step */}
        <div className="rounded-2xl overflow-hidden mb-5"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
            <span className="text-[9px] font-mono font-bold tracking-[0.2em] uppercase text-gray-500">
              HOW IT WORKS
            </span>
          </div>
          <div className="p-4 space-y-5">
            {[
              {
                step: '01', icon: Clock, color: '#facc15',
                bg: 'rgba(250,204,21,0.08)', border: 'rgba(250,204,21,0.15)',
                title: 'Set Daily App Limits',
                desc: 'Choose which apps to restrict and set daily screen time limits for each one.',
              },
              {
                step: '02', icon: ShieldAlert, color: '#f87171',
                bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.15)',
                title: 'Shield Activates on Limit',
                desc: 'When you hit your limit, the app is blocked with a full-screen lockdown overlay.',
              },
              {
                step: '03', icon: Dumbbell, color: '#4ade80',
                bg: 'rgba(74,222,128,0.08)', border: 'rgba(74,222,128,0.15)',
                title: 'Exercise to Unlock',
                desc: 'Complete push-ups verified by your camera to earn temporary access. Real discipline.',
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 + i * 0.1 }}
                className="flex items-start gap-3"
              >
                <div className="relative flex flex-col items-center">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: item.bg, border: `1px solid ${item.border}` }}>
                    <item.icon className="w-4 h-4" style={{ color: item.color }} />
                  </div>
                  {i < 2 && (
                    <div className="w-px h-5 mt-1" style={{ background: `${item.color}25` }} />
                  )}
                </div>
                <div className="pt-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[8px] font-mono font-bold" style={{ color: `${item.color}80` }}>
                      STEP {item.step}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-white mb-0.5">{item.title}</div>
                  <div className="text-[10px] text-gray-500 leading-relaxed">{item.desc}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* APP LOCK PREVIEW LIST */}
        <div className="rounded-2xl overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="px-4 py-3 border-b flex items-center justify-between"
            style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
            <span className="text-[9px] font-mono font-bold tracking-[0.2em] uppercase text-gray-500">
              APPS YOU CAN BLOCK
            </span>
            <span className="text-[8px] font-mono text-gray-600">PREVIEW</span>
          </div>
          <div>
            {[
              { name: 'Instagram', AppIcon: Camera, limit: '30 min/day' },
              { name: 'YouTube', AppIcon: Youtube, limit: '45 min/day' },
              { name: 'TikTok', AppIcon: Play, limit: '20 min/day' },
              { name: 'Facebook', AppIcon: Crown, limit: '30 min/day' },
              { name: 'Twitter / X', AppIcon: Target, limit: '30 min/day' },
            ].map((app, i) => (
              <div key={app.name}
                className="flex items-center gap-3 px-4 py-3"
                style={{ borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <app.AppIcon className="w-4 h-4 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-semibold text-white">{app.name}</div>
                  <div className="text-[9px] text-gray-600 font-mono">{app.limit}</div>
                </div>
                {/* Decorative toggle */}
                <div className="w-[44px] h-[24px] rounded-full p-[2px] flex items-center justify-end"
                  style={{ background: 'rgba(0,30,40,0.5)', border: '1px solid rgba(0,212,255,0.2)' }}>
                  <div className="w-[20px] h-[20px] rounded-full"
                    style={{ background: '#00d4ff', boxShadow: '0 0 6px rgba(0,212,255,0.5)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ═══ BOTTOM CTA ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="pt-2"
      >
        <motion.button
          onClick={() => { playSystemSoundEffect('SELECT'); onUpgradePro?.(); }}
          whileTap={{ scale: 0.97 }}
          className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl font-black text-[14px] tracking-wide"
          style={{
            background: 'linear-gradient(135deg, #facc15 0%, #f59e0b 100%)',
            color: '#0a0a14',
            boxShadow: '0 6px 30px rgba(250,204,21,0.25), 0 0 60px rgba(250,204,21,0.06)',
          }}
        >
          <Crown size={18} />
          Unlock All Pro Features
        </motion.button>
        <p className="text-center text-[8px] text-gray-600 font-mono mt-2">
          14-DAY FREE TRIAL • CANCEL ANYTIME
        </p>
      </motion.div>
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

  // Non-premium users: unified showcase page (no tabs)
  if (!isPremium) {
    return (
      <div className="min-h-[60vh] pb-4">
        <ProShowcasePage onUpgradePro={onUpgradePro} />
      </div>
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
          GOALS
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
                Create Goal
              </button>
            </div>
          )}

          {/* Completed Goals */}
          {completedGoals.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">Completed Goals</span>
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

function GoalHeroImg() {
  const [loaded, setLoaded] = useState(false);
  return (
    <>
      {!loaded && (
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(110deg, rgba(255,255,255,0.03) 30%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 70%)',
            backgroundSize: '200% 100%',
            animation: 'goal-shimmer 1.5s ease-in-out infinite',
          }}
        />
      )}
      <img
        src="/goals/hero_goal.jpeg"
        alt=""
        className="w-full h-full object-cover"
        style={{
          filter: 'grayscale(100%)',
          opacity: loaded ? 1 : 0,
          transition: 'opacity 0.4s ease',
        }}
        onLoad={() => setLoaded(true)}
      />
      <style>{`@keyframes goal-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    </>
  );
}
