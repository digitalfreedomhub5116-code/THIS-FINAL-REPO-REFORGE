
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, CalendarDays, ChevronLeft, ChevronRight, Check, XCircle,
  Skull, AlertTriangle, BrainCircuit, Loader2, CheckCircle, X, Clock,
  ShieldCheck, Globe, Repeat, Zap, Dumbbell, Brain, Shield, Users,
  Moon, Coffee, Utensils, GraduationCap, Target, Timer,
  Circle, Bell, BellOff, SkipForward, CalendarOff, Settings,
  ArrowRight, ChevronDown, ChevronUp, Flame, Eye, Pause, Play, Trophy
} from 'lucide-react';
import {
  Quest, CoreStats, Rank, Priority, PlayerData, Goal,
  ScheduleProfile, ScheduleSlot, DailySchedule, ScheduleSlotType,
  DungeonState, DungeonExerciseTarget, WorkoutDay, FormCoachSession
} from '../types';
import GoalCard from './GoalCard';
import GoalDetailView, { onQuestGenStoreUpdate } from './GoalDetailView';
import GoalCreationFlow from './GoalCreationFlow';
import RankBadge from './RankBadge';
import type { RankType } from './RankBadge';
import QuestCard from './QuestCard';
import DungeonQuestCards from './DungeonQuestCards';
import ActiveWorkoutPlayer, { clearWorkoutSession } from './ActiveWorkoutPlayer';
import DungeonRewardAnimation from './DungeonRewardAnimation';
import DoubleRewardModal from './DoubleRewardModal';
import { buildDungeonWorkoutPlan, buildDungeonWorkoutPlanForEquipment, toggleFormCoach, isExerciseCompletedToday, recordExerciseCompletions } from '../lib/dungeonEngine';
import { PLEDGE_AMOUNTS, MANDATORY_RANKS } from './SystemPactScreen';
import { playSystemSoundEffect, triggerHaptic } from '../utils/soundEngine';
import { API_BASE } from '../lib/apiConfig';
import { getPlayerAuthHeaders } from '../lib/playerApi';
import OnboardingNotice from './OnboardingNotice';
import { scheduleSlotReminder, cancelScheduleSlotReminder, scheduleQuestStartNotification } from '../hooks/useLocalNotifications';

// ────────────────────────────────────────────────────────────
// AUTO-SWITCH QUEST TAB — pure decision helpers
// ────────────────────────────────────────────────────────────
// These helpers encode the decision logic for the auto-switch-quest-tab
// feature. They are exported so tests can import them without mounting the
// component. They have no React dependencies and no side effects.

/** A `CategoryTab` value matching `DailyCommandCenter`'s `todayCategoryTab` state. */
export type CategoryTab = 'DEFAULT' | 'CUSTOM';

/** Lifecycle states emitted by `_questGenStore` in `GoalDetailView`. */
export type QuestGenStoreState = 'IDLE' | 'GENERATING' | 'DONE' | 'ERROR';

/**
 * Returns true iff the resulting quest belongs in the Custom tab.
 * Mirrors the Custom_Tab filter: `!!q.goalId || q.isDaily === false`.
 */
export function isCustomQuest(q: Quest): boolean {
  return !!q.goalId || q.isDaily === false;
}

/**
 * Decides whether the manual quest creation modal should auto-switch the
 * active category tab to `CUSTOM`. Returns true iff the user is currently
 * on the `DEFAULT` tab, not in tutorial mode, and the newly created quest
 * is a Custom_Quest.
 */
export function shouldSwitchOnManualCreate(args: {
  newQuest: Quest;
  currentTab: CategoryTab;
  isTutorial: boolean;
}): boolean {
  const { newQuest, currentTab, isTutorial } = args;
  return currentTab === 'DEFAULT' && !isTutorial && isCustomQuest(newQuest);
}

/**
 * Decides whether a `DONE` transition from goal-based quest generation
 * should auto-switch the active category tab to `CUSTOM`. Returns true iff
 * the store reached `DONE`, produced at least one quest, and the user is
 * currently on the `DEFAULT` tab.
 */
export function shouldSwitchOnGoalGenDone(args: {
  storeState: QuestGenStoreState;
  pendingFeedQuestsCount: number;
  currentTab: CategoryTab;
}): boolean {
  const { storeState, pendingFeedQuestsCount, currentTab } = args;
  return storeState === 'DONE'
    && pendingFeedQuestsCount > 0
    && currentTab === 'DEFAULT';
}

// ────────────────────────────────────────────────────────────
// DAILY ANALYSIS TRACKING (matches QuestsView)
// ────────────────────────────────────────────────────────────

const FREE_DAILY_ANALYSES = 3;

function getDailyAnalysisCount(userId?: string): number {
  const today = new Date().toISOString().split('T')[0];
  const key = `reforge_daily_analyses_${userId || 'local'}_${today}`;
  return parseInt(localStorage.getItem(key) || '0', 10);
}

function incrementDailyAnalysisCount(userId?: string): void {
  const today = new Date().toISOString().split('T')[0];
  const key = `reforge_daily_analyses_${userId || 'local'}_${today}`;
  const current = parseInt(localStorage.getItem(key) || '0', 10);
  localStorage.setItem(key, String(current + 1));
}

// ────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────

interface ForgeGuardResult {
  rank: Rank;
  xp: number;
  category: keyof CoreStats;
  categories?: (keyof CoreStats)[];
  reasoning: string;
  estimatedDuration: number;
  minDurationMinutes?: number;
  suggestedTime?: string;
  autoDetectedTime?: string | null;
  isSpam: boolean;
  sensorRequirements?: {
    steps?: number;
    distanceKm?: number;
    activeMinutes?: number;
  } | null;
}

/** A unified timeline entry — can be a schedule block OR a quest */
interface TimelineEntry {
  id: string;
  startTime: string;         // "07:00"
  endTime: string;
  type: 'SCHEDULE' | 'QUEST' | 'FREE';
  // Schedule data
  slotType?: ScheduleSlotType;
  slotLabel?: string;
  slotStatus?: string;
  slotIsFlexible?: boolean;
  slotNotifyEnabled?: boolean;
  // Quest data
  quest?: Quest;
  // Lock state
  lockState?: 'LOCKED' | 'ACTIVE' | 'OVERTIME' | 'EXPIRED';
  activationTime?: string;    // 10 min before scheduledTime
  deadlineTime?: string;      // scheduledTime + estimatedDuration
  hardCutoff?: string;        // deadline + 10 min grace
  thresholdMinutes?: number;  // 60% of estimatedDuration
}

interface DailyCommandCenterProps {
  quests: Quest[];
  addQuest: (quest: Quest) => void;
  completeQuest: (id: string, asMini?: boolean, rect?: DOMRect) => void;
  failQuest: (id: string) => void;
  resetQuest: (id: string) => void;
  deleteQuest: (id: string) => void;
  tutorialStep?: number;
  onTutorialAction?: (step: number) => void;
  onTutorialAnalysisFail?: () => void;
  playerData?: PlayerData;
  onToggleNav?: (visible: boolean) => void;
  recordStrike?: () => void;
  onShowPact?: (quest: Quest) => void;
  onStartTracking?: (id: string, requirements?: { steps?: number; distanceKm?: number; activeMinutes?: number }) => void;
  onStopTracking?: (id: string) => void;
  onConsumeMana?: (amount: number) => boolean;
  onRefundMana?: (amount: number) => void;
  isQuestOnboarding?: boolean;
  onTutorialManaOut?: () => void;
  goals?: Goal[];
  onUpdateGoals?: (goals: Goal[]) => void;
  onDeleteGoal?: (goalId: string) => void;
  onDeductGold?: (amount: number) => void;
  onUpdateScheduleSlots?: (slots: any[]) => void;
  scheduleProfile?: ScheduleProfile;
  dailySchedule?: DailySchedule;
  rescheduleQuest?: (questId: string, newScheduledTime: string) => void;
  onSetupSchedule?: () => void;
  onSlotAction?: (slotId: string, action: 'SKIP' | 'DEFER', slots: ScheduleSlot[]) => void;
  onToggleNotify?: (slotId: string, enabled: boolean, slots: ScheduleSlot[]) => void;
  onReorderSlots?: (slots: ScheduleSlot[]) => void;
  onShowInterstitialAd?: () => Promise<boolean>;

  // AdMob test panel — temporary debug surface
  adShowInterstitial?: (adUnitId: string) => Promise<boolean>;
  adShowRewarded?: (adUnitId: string) => Promise<{ rewarded: boolean; type?: string; amount?: number }>;
  adUnits?: { KEY_REWARD: string; BORDER_REWARD: string; DUNGEON_INTERSTITIAL: string };
  adsReady?: boolean;

  /** Premium / Reforge Pro flag — when true, ad gates (e.g. before dungeon entry) are skipped. */
  isPremium?: boolean;

  // Daily Dungeon (Sung Jin-woo Protocol)
  dungeonState?: DungeonState;
  onInitializeDungeon?: () => void;
  onUpdateDungeonState?: (updater: (prev: DungeonState) => DungeonState) => void;
  onCompleteDungeonWorkout?: (exercisesCompleted: number, totalExercises: number, results: Record<string, number>, anomalyPoints?: number, formCoachBonusXp?: number, formCoachSession?: FormCoachSession) => any;
  onFailDungeonWorkout?: () => void;
  /** If set, DCC should auto-enter dungeon with this equipment */
  dungeonEntryTrigger?: { equipment?: 'GYM' | 'HOME_DUMBBELLS' | 'BODYWEIGHT'; timestamp: number };

  // Reward doubling
  onAddRewards?: (gold: number, xp: number) => void;
}

// ────────────────────────────────────────────────────────────
// CONSTANTS & HELPERS
// ────────────────────────────────────────────────────────────

const DAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTH_NAMES = [
  'JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE',
  'JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER',
];
const WATER_GRADIENT = 'linear-gradient(0deg, #00d4ff 0%, #3b82f6 55%, #00d4ff 100%)';

const RANK_COLORS: Record<Rank, { bg: string; text: string; border: string; glow: string }> = {
  UNRANKED: { bg: 'bg-gray-900', text: 'text-gray-600', border: 'border-gray-800', glow: '' },
  E: { bg: 'bg-gray-800',       text: 'text-gray-300',  border: 'border-gray-600',  glow: '' },
  D: { bg: 'bg-orange-900/60',  text: 'text-orange-400',border: 'border-orange-700',glow: 'shadow-[0_0_12px_rgba(251,146,60,0.3)]' },
  C: { bg: 'bg-yellow-900/60',  text: 'text-yellow-400',border: 'border-yellow-700',glow: 'shadow-[0_0_12px_rgba(234,179,8,0.3)]' },
  B: { bg: 'bg-green-900/60',   text: 'text-green-400', border: 'border-green-700', glow: 'shadow-[0_0_12px_rgba(34,197,94,0.3)]' },
  A: { bg: 'bg-cyan-900/60',    text: 'text-[#00d4ff]',  border: 'border-cyan-700',  glow: 'shadow-[0_0_12px_rgba(0,212,255,0.4)]' },
  S: { bg: 'bg-purple-900/60',  text: 'text-[#00d4ff]',border: 'border-purple-700',glow: 'shadow-[0_0_16px_rgba(0,212,255,0.5)]' },
};

const SLOT_ICONS: Record<string, React.ReactNode> = {
  SLEEP: <Moon className="w-3 h-3 text-indigo-400" />,
  ROUTINE: <Coffee className="w-3 h-3 text-orange-400" />,
  BLOCKED: <GraduationCap className="w-3 h-3 text-gray-400" />,
  WORKOUT: <Dumbbell className="w-3 h-3 text-red-400" />,
  QUEST: <Target className="w-3 h-3 text-[#00d4ff]" />,
  MEAL: <Utensils className="w-3 h-3 text-green-400" />,
  FREE: <Zap className="w-3 h-3 text-[#00d4ff]" />,
};

const SLOT_COLORS: Record<string, string> = {
  SLEEP: '#00d4ff',
  ROUTINE: '#fb923c',
  BLOCKED: '#6b7280',
  WORKOUT: '#f87171',
  QUEST: '#00d4ff',
  MEAL: '#4ade80',
  FREE: '#33dfff',
};

const GOAL_RANK_COLORS: Record<string, string> = {
  E: '#9ca3af', D: '#fb923c', C: '#facc15', B: '#4ade80', A: '#00d4ff', S: '#33dfff',
  UNRANKED: '#6b7280',
};

const CATEGORY_ICONS: Record<string, string> = {
  ACADEMIC: '📚', FITNESS: '💪', FINANCIAL: '💰', SKILL: '🎯',
  CAREER: '🚀', HEALTH: '❤️', CREATIVE: '🎨', DEFAULT: '⚔️',
};

function getUserTimezone(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return 'UTC'; }
}

function todayStr(): string { return new Date().toISOString().split('T')[0]; }

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(mins: number): string {
  const h = Math.floor(((mins % (24 * 60)) + 24 * 60) % (24 * 60) / 60);
  const m = ((mins % 60) + 60) % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function addMins(time: string, mins: number): string {
  return minutesToTime(timeToMinutes(time) + mins);
}

function subtractMins(time: string, mins: number): string {
  return minutesToTime(timeToMinutes(time) - mins);
}

function formatTime12(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function formatCountdown(totalMinutes: number): string {
  if (totalMinutes <= 0) return '0m';
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// ────────────────────────────────────────────────────────────
// TIME-LOCK LOGIC (Smart Window with 60% Threshold)
// ────────────────────────────────────────────────────────────

function getQuestLockState(quest: Quest, currentMinutes: number): {
  state: 'LOCKED' | 'ACTIVE' | 'OVERTIME' | 'EXPIRED';
  activationMin: number;
  deadlineMin: number;
  hardCutoffMin: number;
  thresholdMin: number;
  remainingMin: number;
  untilActivationMin: number;
} {
  if (!quest.scheduledTime) {
    return { state: 'ACTIVE', activationMin: 0, deadlineMin: 0, hardCutoffMin: 0, thresholdMin: 0, remainingMin: 0, untilActivationMin: 0 };
  }

  const scheduledStr = quest.scheduledTime.includes('T')
    ? quest.scheduledTime.split('T')[1].slice(0, 5)
    : quest.scheduledTime;
  const scheduledMin = timeToMinutes(scheduledStr);
  const estDuration = quest.estimatedDuration || 20;

  const activationMin = scheduledMin - 10;          // 10 min before
  const deadlineMin = scheduledMin + estDuration;    // scheduled + est
  const hardCutoffMin = deadlineMin + 10;            // 10 min grace
  const thresholdMin = Math.ceil(estDuration * 0.6); // 60% threshold

  const untilActivationMin = activationMin - currentMinutes;
  const remainingMin = deadlineMin - currentMinutes;

  let state: 'LOCKED' | 'ACTIVE' | 'OVERTIME' | 'EXPIRED';
  if (currentMinutes < activationMin) {
    state = 'LOCKED';
  } else if (currentMinutes <= deadlineMin) {
    state = 'ACTIVE';
  } else if (currentMinutes <= hardCutoffMin) {
    state = 'OVERTIME';
  } else {
    state = 'EXPIRED';
  }

  return { state, activationMin, deadlineMin, hardCutoffMin, thresholdMin, remainingMin, untilActivationMin };
}

// Build default schedule slots from profile (same as TodayProtocol)
function buildDefaultSlots(profile: ScheduleProfile): ScheduleSlot[] {
  const slots: ScheduleSlot[] = [];
  let id = 0;
  const s = (startTime: string, endTime: string, type: ScheduleSlot['type'], label: string, flexible = false): ScheduleSlot => ({
    id: `slot-${id++}`, startTime, endTime, type, label,
    status: 'PENDING', isFlexible: flexible, isCarryOver: false,
    notifyEnabled: type === 'QUEST' || type === 'WORKOUT',
  });

  const routineEnd = addMins(profile.wakeUpTime, profile.morningRoutineMin);
  slots.push(s(profile.wakeUpTime, routineEnd, 'ROUTINE', 'Morning Routine'));

  const workoutDuration = 30;
  if (profile.preferredWorkoutTime === 'EARLY_MORNING' || profile.preferredWorkoutTime === 'MORNING') {
    slots.push(s(routineEnd, addMins(routineEnd, workoutDuration), 'WORKOUT', 'Workout Session', true));
  }

  if (profile.role === 'STUDENT') {
    if (profile.schoolStart && profile.schoolEnd) {
      slots.push(s(profile.schoolStart, profile.schoolEnd, 'BLOCKED', 'School / College'));
    }
    if (profile.coachingEnabled && profile.coachingStart && profile.coachingEnd) {
      slots.push(s(profile.coachingStart, profile.coachingEnd, 'BLOCKED', 'Tuition / Coaching'));
    }
  } else if (profile.role === 'PROFESSIONAL') {
    if (profile.workStart && profile.workEnd) {
      slots.push(s(profile.workStart, profile.workEnd, 'BLOCKED', 'Work'));
    }
  }

  const dinnerEnd = addMins(profile.dinnerTime, 30);
  slots.push(s(profile.dinnerTime, dinnerEnd, 'MEAL', 'Dinner'));

  if (profile.preferredWorkoutTime === 'EVENING' || profile.preferredWorkoutTime === 'LATE_NIGHT') {
    const evStart = profile.preferredWorkoutTime === 'EVENING' ? '18:00' : '21:00';
    slots.push(s(evStart, addMins(evStart, workoutDuration), 'WORKOUT', 'Workout Session', true));
  } else if (profile.preferredWorkoutTime === 'AFTERNOON') {
    slots.push(s('14:00', addMins('14:00', workoutDuration), 'WORKOUT', 'Workout Session', true));
  }

  const windDownStart = subtractMins(profile.bedtime, profile.windDownMinutes);
  slots.push(s(windDownStart, profile.bedtime, 'ROUTINE', 'Wind Down'));
  slots.push(s(profile.bedtime, addMins(profile.bedtime, 1), 'SLEEP', 'Lights Out'));

  slots.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  return slots;
}

// ────────────────────────────────────────────────────────────
// FUTURISTIC CALENDAR (copied from QuestsView — unchanged)
// ────────────────────────────────────────────────────────────

const FuturisticCalendar: React.FC<{ quests: Quest[] }> = ({ quests }) => {
  const [offset, setOffset] = useState(0);
  const todayRef = useRef<HTMLDivElement>(null);

  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  const todayDayStr = todayDate.toDateString();

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(todayDate);
    d.setDate(todayDate.getDate() + offset * 7 - 3 + i);
    return d;
  });

  const centerDay = days[3];

  useEffect(() => {
    todayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [offset]);

  return (
    <div>
      <style>{`
        @keyframes pill-float {
          0%,100% { transform: translateY(0px); }
          50%      { transform: translateY(-5px); }
        }
      `}</style>

      <div className="flex items-center justify-between px-1 pt-1 pb-4">
        <button
          onClick={() => setOffset(o => o - 1)}
          className="w-7 h-7 rounded-full flex items-center justify-center active:scale-90 transition-all"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <ChevronLeft size={12} className="text-gray-400" />
        </button>

        <div className="flex items-center gap-2">
          <CalendarDays size={14} className="text-gray-400" />
          <span className="text-sm font-heading font-extrabold text-white tracking-widest">
            {MONTH_NAMES[centerDay.getMonth()]}
          </span>
          <span className="text-sm font-mono" style={{ color: 'rgba(156,163,175,0.7)' }}>
            {centerDay.getFullYear()}
          </span>
        </div>

        <button
          onClick={() => setOffset(o => o + 1)}
          className="w-7 h-7 rounded-full flex items-center justify-center active:scale-90 transition-all"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <ChevronRight size={12} className="text-gray-400" />
        </button>
      </div>

      <div className="flex justify-center pb-3 gap-3">
        {days.map((day, i) => {
          const dayStr = day.toDateString();
          const isToday = dayStr === todayDayStr;
          const isPast  = day < todayDate;

          const questsOnDay = quests.filter(q => {
            const d = new Date(q.createdAt);
            d.setHours(0, 0, 0, 0);
            return d.toDateString() === dayStr;
          });
          const totalOnDay = questsOnDay.length;
          const doneOnDay  = questsOnDay.filter(q => q.isCompleted).length;
          const fillPct    = (isPast || isToday) && totalOnDay > 0
            ? Math.round((doneOnDay / totalOnDay) * 100)
            : 0;

          let borderCol: string;
          let glowFilter: string;

          if (isToday) {
            borderCol  = '#00d4ff';
            glowFilter = '0 0 10px rgba(0,212,255,0.5)';
          } else if (isPast) {
            if (totalOnDay === 0) { borderCol = '#252525'; glowFilter = 'none'; }
            else if (doneOnDay === totalOnDay) { borderCol = '#16a34a'; glowFilter = '0 0 8px rgba(22,163,74,0.4)'; }
            else if (doneOnDay === 0) { borderCol = '#4b5563'; glowFilter = 'none'; }
            else { borderCol = '#3b82f6'; glowFilter = '0 0 8px rgba(59,130,246,0.4)'; }
          } else { borderCol = '#252525'; glowFilter = 'none'; }

          const showCheck  = (isPast && doneOnDay > 0 && doneOnDay === totalOnDay) || (isToday && fillPct === 100);
          const showX      = isPast && totalOnDay > 0 && doneOnDay === 0;
          const showNumber = !showCheck && !showX;
          const floatDuration = 2.4 + (i % 3) * 0.35;
          const floatDelay   = i * 0.15;

          return (
              <div key={i} ref={isToday ? todayRef : undefined}
              className="flex flex-col items-center gap-2 shrink-0"
              style={{
                animation: `pill-float ${floatDuration}s ease-in-out ${floatDelay}s infinite`,
              }}
            >
              <div style={{
                width: 38, height: 80, borderRadius: 9999, overflow: 'hidden', position: 'relative',
                background: 'rgba(8,8,18,0.92)', border: `1.5px solid ${borderCol}`,
                boxShadow: glowFilter === 'none' ? 'inset 0 1px 0 rgba(255,255,255,0.05)' : `${glowFilter}, inset 0 1px 0 rgba(255,255,255,0.07)`,
              }}>
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0, height: `${fillPct}%`,
                  background: WATER_GRADIENT, opacity: 0.82,
                  transition: 'height 0.85s cubic-bezier(0.34,1.56,0.64,1)',
                  borderRadius: fillPct >= 100 ? 9999 : '0 0 9999px 9999px',
                }} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
                  {showCheck ? <Check size={16} color="#ffffff" strokeWidth={2.5} />
                   : showX ? <XCircle size={16} color="#6b7280" strokeWidth={1.8} />
                   : showNumber ? <span style={{ color: isToday ? '#ffffff' : fillPct > 0 ? '#e5e7eb' : '#4b5563', fontSize: 13, fontWeight: 800, fontFamily: 'monospace' }}>{day.getDate()}</span>
                   : null}
                </div>
              </div>
              <span className="text-[9px] font-black font-mono tracking-wider"
                style={{ color: isToday ? '#00d4ff' : 'rgba(75,85,99,0.6)' }}
              >
                {DAY_LABELS[day.getDay()]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────────────────
// SCHEDULE SLOT ROW (inline timeline row for fixed blocks)
// ────────────────────────────────────────────────────────────

const ScheduleSlotRow: React.FC<{
  slot: ScheduleSlot;
  isCurrent: boolean;
  isPast: boolean;
  isLast?: boolean;
}> = ({ slot, isCurrent, isPast, isLast }) => {
  const slotColor = SLOT_COLORS[slot.type] || '#6b7280';

  return (
    <div className="flex gap-0 relative">
      {/* Left column: time */}
      <div className="flex flex-col items-center w-14 flex-shrink-0">
        <div className={`text-[9px] font-mono font-bold text-right w-full pr-2 pb-0.5 ${
          isCurrent ? 'text-[#00d4ff]' : isPast ? 'text-gray-700' : 'text-gray-500'
        }`}>
          {formatTime12(slot.startTime).split(' ')[0]}
          <span className="text-[7px] ml-0.5">{formatTime12(slot.startTime).split(' ')[1]}</span>
        </div>
      </div>

      {/* Timeline dot + line */}
      <div className="flex flex-col items-center w-4 flex-shrink-0 relative">
        {isCurrent ? (
          <motion.div className="w-2 h-2 rounded-full z-10 mt-1 flex-shrink-0"
            style={{ background: slotColor, boxShadow: `0 0 6px ${slotColor}` }}
            animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 2, repeat: Infinity }} />
        ) : isPast ? (
          <div className="w-2 h-2 rounded-full mt-1 flex-shrink-0 z-10" style={{ background: slotColor, opacity: 0.25 }} />
        ) : (
          <div className="w-2 h-2 rounded-full border mt-1 flex-shrink-0 z-10" style={{ borderColor: slotColor + '40' }} />
        )}
        {/* Vertical line (extends downward) */}
        {!isLast && (
          <div className="w-px flex-1 min-h-[12px]" style={{ background: 'rgba(255,255,255,0.06)' }} />
        )}
      </div>

      {/* Content — compact */}
      <div className={`flex-1 min-w-0 pb-2 pl-1.5 ${isCurrent ? '' : isPast ? 'opacity-40' : ''}`}>
        <div className={`flex items-center gap-1.5 py-1 px-2 rounded-md ${isCurrent ? 'bg-white/[0.03]' : ''}`}>
          <div className="flex-shrink-0" style={{ opacity: 0.7 }}>{SLOT_ICONS[slot.type]}</div>
          <span className={`text-[10px] font-mono truncate ${isCurrent ? 'text-white font-bold' : isPast ? 'text-gray-600' : 'text-gray-400'}`}>
            {slot.label}
          </span>
          {isCurrent && <span className="text-[7px] font-black text-[#00d4ff] px-1 py-0.5 rounded bg-[#00d4ff]/10 flex-shrink-0 uppercase tracking-wider ml-auto">Now</span>}
          {slot.type === 'BLOCKED' && <span className="text-[8px] text-gray-700 font-mono ml-auto flex-shrink-0">until {formatTime12(slot.endTime)}</span>}
        </div>
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────────────────
// FREE SLOT ROW (gap in schedule — "Add Quest Here")
// ────────────────────────────────────────────────────────────

const FreeSlotRow: React.FC<{
  startTime: string;
  endTime: string;
  onAddQuest: () => void;
}> = ({ startTime, endTime, onAddQuest }) => {
  const durationMin = timeToMinutes(endTime) - timeToMinutes(startTime);
  if (durationMin < 15) return null; // Too small a gap

  return (
    <button
      onClick={onAddQuest}
      className="w-full flex items-center gap-2.5 py-2 px-3 rounded-xl transition-all hover:bg-white/[0.02] group"
      style={{ border: '1px dashed rgba(255,255,255,0.06)' }}
    >
      <div className="w-14 text-[10px] font-mono font-bold text-right flex-shrink-0 text-gray-700">
        {formatTime12(startTime).split(' ')[0]}
        <span className="text-[7px] ml-0.5">{formatTime12(startTime).split(' ')[1]}</span>
      </div>
      <Circle className="w-2 h-2 text-gray-800 flex-shrink-0" />
      <div className="flex-1 flex items-center gap-1.5">
        <Plus className="w-3 h-3 text-gray-700 group-hover:text-[#00d4ff] transition-colors" />
        <span className="text-[10px] font-mono text-gray-700 group-hover:text-gray-400 transition-colors">
          Free · {durationMin}m available
        </span>
      </div>
    </button>
  );
};

// ────────────────────────────────────────────────────────────
// RESCHEDULE MODAL (User controls WHEN)
// ────────────────────────────────────────────────────────────

const RescheduleModal: React.FC<{
  quest: Quest;
  scheduleSlots: ScheduleSlot[];
  otherQuests: Quest[];
  onSave: (questId: string, newTime: string) => void;
  onClose: () => void;
}> = ({ quest, scheduleSlots, otherQuests, onSave, onClose }) => {
  const currentScheduledStr = quest.scheduledTime?.includes('T')
    ? quest.scheduledTime.split('T')[1].slice(0, 5)
    : (quest.scheduledTime || '12:00');

  const [selectedTime, setSelectedTime] = useState(currentScheduledStr);

  // Current time in minutes for validation
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Check if selected time overlaps with any blocked schedule slot
  const selectedMin = timeToMinutes(selectedTime);
  const questDuration = quest.estimatedDuration || 20;
  const questEnd = selectedMin + questDuration;

  // Can't schedule in the past
  const isPastTime = selectedMin < currentMinutes;

  // Check collision with other quests (HARD BLOCK)
  const collidingQuest = otherQuests.find(q => {
    if (q.id === quest.id) return false; // skip self
    if (q.isCompleted || q.failed) return false; // skip done quests
    const qStr = q.scheduledTime?.includes('T')
      ? q.scheduledTime.split('T')[1].slice(0, 5)
      : (q.scheduledTime || '00:00');
    const qStart = timeToMinutes(qStr);
    const qEnd = qStart + (q.estimatedDuration || 20);
    // Overlap: new quest's [start, end) intersects [qStart, qEnd)
    return selectedMin < qEnd && questEnd > qStart;
  });

  const hasCollision = !!collidingQuest;
  const canSave = !isPastTime && !hasCollision;

  const overlappingSlot = scheduleSlots.find(slot => {
    if (slot.type === 'QUEST') return false;
    const slotStart = timeToMinutes(slot.startTime);
    const slotEnd = timeToMinutes(slot.endTime);
    return selectedMin < slotEnd && questEnd > slotStart;
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center px-6"
      style={{ background: 'rgba(0,0,0,0.85)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 30, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 30, opacity: 0, scale: 0.95 }}
        className="w-full max-w-xs rounded-2xl overflow-hidden"
        style={{ background: '#0f0f1a', border: '1px solid rgba(255,255,255,0.08)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3">
          <h3 className="text-xs font-black text-white uppercase tracking-wider">Reschedule Quest</h3>
          <p className="text-[10px] text-gray-500 font-mono mt-1 truncate">{quest.title}</p>
        </div>

        {/* Time picker */}
        <div className="px-5 pb-4">
          <label className="block text-[9px] font-mono text-gray-600 uppercase tracking-wider mb-2">
            Choose Time
          </label>
          <input
            type="time"
            value={selectedTime}
            onChange={e => setSelectedTime(e.target.value)}
            className="w-full rounded-xl p-3 text-white text-lg font-mono font-bold text-center focus:outline-none"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: isPastTime ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(34,211,238,0.2)',
              colorScheme: 'dark',
            }}
          />

          {/* Duration info */}
          <div className="flex items-center justify-between mt-2 px-1">
            <span className="text-[9px] text-gray-600 font-mono">
              Duration: ~{questDuration}m
            </span>
            <span className="text-[9px] text-gray-600 font-mono">
              Ends: {minutesToTime12(questEnd)}
            </span>
          </div>

          {/* Past time error */}
          {isPastTime && (
            <div className="rounded-lg p-2.5 mt-3 flex items-start gap-2"
              style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}
            >
              <X className="w-3 h-3 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-[9px] font-bold text-red-300">Can't schedule in the past. Pick a future time.</p>
            </div>
          )}

          {/* Quest collision error (HARD BLOCK) */}
          {!isPastTime && hasCollision && collidingQuest && (
            <div className="rounded-lg p-2.5 mt-3 flex items-start gap-2"
              style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}
            >
              <X className="w-3 h-3 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[9px] font-bold text-red-300">Time conflict with another quest</p>
                <p className="text-[8px] text-red-400/70 font-mono">
                  "{collidingQuest.title}" is already at this time. Pick a different slot.
                </p>
              </div>
            </div>
          )}

          {/* Overlap warning (Option B) — schedule slot */}
          {!isPastTime && !hasCollision && overlappingSlot && (
            <div className="rounded-lg p-2.5 mt-3 flex items-start gap-2"
              style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)' }}
            >
              <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[9px] font-bold text-amber-300">Overlaps with {overlappingSlot.label}</p>
                <p className="text-[8px] text-amber-400/70 font-mono">
                  {formatTime12(overlappingSlot.startTime)} – {formatTime12(overlappingSlot.endTime)}. You can still save if you have free time during this.
                </p>
              </div>
            </div>
          )}

          {/* Original time note */}
          <p className="text-[8px] text-gray-700 font-mono text-center mt-3">
            AI suggested: {formatTime12(currentScheduledStr)}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-5 pb-5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-[10px] font-bold text-gray-400 uppercase tracking-wider"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (canSave) {
                onSave(quest.id, selectedTime);
                onClose();
              }
            }}
            disabled={!canSave}
            className="flex-1 py-2.5 rounded-xl text-[10px] font-bold text-black uppercase tracking-wider transition-opacity"
            style={{
              background: !canSave ? '#374151' : 'linear-gradient(135deg, #00d4ff, #00d4ff)',
              opacity: !canSave ? 0.4 : 1,
              color: !canSave ? '#6b7280' : '#000',
            }}
          >
            Save Time
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Helper for modal — convert minutes to 12h display format
function minutesToTime12(mins: number): string {
  const h = Math.floor(((mins % 1440) + 1440) % 1440 / 60);
  const m = ((mins % 60) + 60) % 60;
  return formatTime12(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
}

// ────────────────────────────────────────────────────────────
// QUEST TIMELINE ROW (quest with time-lock state)
// ────────────────────────────────────────────────────────────

const QuestTimelineRow: React.FC<{
  quest: Quest;
  currentMinutes: number;
  isCurrent: boolean;
  isPast: boolean;
  isLast?: boolean;
  onComplete: (id: string, asMini?: boolean, rect?: DOMRect) => void;
  onFail: (id: string) => void;
  onReset: (id: string) => void;
  onDelete: (id: string) => void;
  onReschedule?: (quest: Quest) => void;
  onStartTracking?: (id: string, requirements?: any) => void;
  onStopTracking?: (id: string) => void;
  onEnterDungeon?: (equipment?: 'GYM' | 'HOME_DUMBBELLS' | 'BODYWEIGHT') => void;
}> = ({ quest, currentMinutes, isCurrent, isPast, isLast, onComplete, onFail, onReset, onDelete, onReschedule, onStartTracking, onStopTracking, onEnterDungeon }) => {
  const scheduledStr = quest.scheduledTime?.includes('T')
    ? quest.scheduledTime.split('T')[1].slice(0, 5)
    : (quest.scheduledTime || '00:00');

  const isCompleted = quest.isCompleted;
  const isFailed = quest.failed;
  const estDuration = quest.estimatedDuration || 20;
  const scheduledMin = timeToMinutes(scheduledStr);
  const isOverdue = !isCompleted && !isFailed && currentMinutes > (scheduledMin + estDuration);

  // TIME-LOCK: Quest is visible but not completable until scheduled time arrives
  const isTimeLocked = !isCompleted && !isFailed && currentMinutes < scheduledMin;
  const minutesUntilAvailable = scheduledMin - currentMinutes;
  const lockMessage = isTimeLocked
    ? minutesUntilAvailable >= 60
      ? `Scheduled at ${formatTime12(scheduledStr)} • Available in ${Math.floor(minutesUntilAvailable / 60)}h ${minutesUntilAvailable % 60}m`
      : `Scheduled at ${formatTime12(scheduledStr)} • Available in ${minutesUntilAvailable}m`
    : undefined;

  // F3: Removed swipe-to-complete


  // Can't reschedule: if completed/failed, or within 10 min of scheduled time, or past scheduled time
  const canReschedule = !isCompleted && !isFailed && onReschedule && (currentMinutes < scheduledMin - 10);

  return (
    <div className="relative">
      {/* Time label row with dot */}
      <div className="flex items-center gap-2 mb-1">
        {/* Dot */}
        <div className="relative z-10 flex-shrink-0">
          {isCompleted ? (
            <div className="w-[14px] h-[14px] rounded-full flex items-center justify-center" style={{ background: '#00d4ff' }}>
              <Check className="w-2 h-2 text-black" strokeWidth={3} />
            </div>
          ) : isFailed ? (
            <div className="w-[14px] h-[14px] rounded-full flex items-center justify-center" style={{ background: '#4a6670' }}>
              <X className="w-2 h-2 text-black" strokeWidth={3} />
            </div>
          ) : isOverdue ? (
            <div className="w-[14px] h-[14px] rounded-full" style={{ background: '#00d4ff', boxShadow: '0 0 6px #00d4ff80' }} />
          ) : isTimeLocked ? (
            <div className="w-[14px] h-[14px] rounded-full" style={{ background: '#1a1a2e', border: '1.5px solid #374151' }} />
          ) : isCurrent ? (
            <motion.div className="w-[14px] h-[14px] rounded-full"
              style={{ background: '#00d4ff', boxShadow: '0 0 8px #00d4ff' }}
              animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }} />
          ) : (
            <div className="w-[14px] h-[14px] rounded-full border-2" style={{ borderColor: '#00d4ff30' }} />
          )}
        </div>
        {/* Time label */}
        <button
          onClick={() => canReschedule && onReschedule(quest)}
          disabled={!canReschedule}
          className={`text-[11px] font-mono font-bold transition-colors ${
            isCompleted ? 'text-[#00d4ff]' : isFailed ? 'text-[#4a6670]' :
            isOverdue ? 'text-[#00d4ff]' :
            isTimeLocked ? 'text-gray-700' :
            isCurrent ? 'text-[#00d4ff]' : isPast ? 'text-gray-700' : 'text-gray-500'
          } ${canReschedule ? 'cursor-pointer active:scale-95' : 'cursor-default'}`}
        >
          {formatTime12(scheduledStr)}
        </button>
        {isCurrent && <span className="text-[7px] font-black text-[#00d4ff] px-1.5 py-0.5 rounded-full bg-[#00d4ff]/10 uppercase tracking-wider">Now</span>}
        {isOverdue && <span className="text-[7px] font-black text-[#00d4ff] px-1.5 py-0.5 rounded-full bg-[#00d4ff]/10 uppercase tracking-wider">Overdue</span>}
        {isTimeLocked && <span className="text-[7px] font-bold text-gray-600 font-mono">{minutesUntilAvailable >= 60 ? `${Math.floor(minutesUntilAvailable / 60)}h ${minutesUntilAvailable % 60}m` : `${minutesUntilAvailable}m`}</span>}
      </div>

      {/* Full-width quest card with vertical line on left */}
      <div className="relative ml-[6px] pl-[18px] pb-3">
        {/* Vertical connector line */}
        {!isLast && (
          <div className="absolute left-[0px] top-0 bottom-0 w-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
        )}

        <div className="relative overflow-hidden">
          <QuestCard
            quest={quest}
            isLocked={isTimeLocked}
            lockMessage={lockMessage}
            onReschedule={isTimeLocked && onReschedule ? () => onReschedule(quest) : undefined}
            onComplete={(id, asMini) => {
              const el = document.getElementById(`quest-card-${id}`);
              const rect = el?.getBoundingClientRect() || undefined;
              onComplete(id, asMini, rect);
            }}
            onFail={onFail}
            onReset={onReset}
            onDelete={onDelete}
            onStartTracking={onStartTracking}
            onStopTracking={onStopTracking}
            onEnterDungeon={onEnterDungeon}
          />
        </div>
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────────────────
// PROGRESS RING (F4)
// ────────────────────────────────────────────────────────────

const ProgressRing: React.FC<{ completed: number; total: number }> = ({ completed, total }) => {
  const size = 38;
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? completed / total : 0;
  const strokeDashoffset = circumference * (1 - progress);
  const isComplete = completed === total && total > 0;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <motion.circle cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke={isComplete ? '#4ade80' : '#00d4ff'}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={isComplete ? { filter: 'drop-shadow(0 0 4px rgba(74,222,128,0.5))' } : {}}
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex items-center justify-center">
        {isComplete ? (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400 }}>
            <Check className="w-3.5 h-3.5 text-emerald-400" strokeWidth={3} />
          </motion.div>
        ) : (
          <span className="text-[9px] font-black font-mono text-gray-300">
            {completed}<span className="text-gray-600">/{total}</span>
          </span>
        )}
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ────────────────────────────────────────────────────────────

const DailyCommandCenter: React.FC<DailyCommandCenterProps> = ({
  quests, addQuest, completeQuest, failQuest, resetQuest, deleteQuest,
  tutorialStep, onTutorialAction, onTutorialAnalysisFail, playerData, onToggleNav, onShowPact,
  onStartTracking, onStopTracking, onConsumeMana, onRefundMana,
  isQuestOnboarding, onTutorialManaOut,
  goals, onUpdateGoals, onDeleteGoal, onDeductGold, onUpdateScheduleSlots,
  scheduleProfile, dailySchedule, rescheduleQuest: rescheduleQuestProp, onSetupSchedule,
  onSlotAction, onToggleNotify, onReorderSlots, onShowInterstitialAd,
  adShowInterstitial, adShowRewarded, adUnits, adsReady, isPremium,
  dungeonState, onInitializeDungeon, onUpdateDungeonState, onCompleteDungeonWorkout, onFailDungeonWorkout,
  onAddRewards, dungeonEntryTrigger,
}) => {
  // ── State ──
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [scheduleTime, setScheduleTime] = useState('');
  const [autoScheduled, setAutoScheduled] = useState(false);
  const [isDaily, setIsDaily] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [forgeResult, setForgeResult] = useState<ForgeGuardResult | null>(null);
  const [forgeError, setForgeError] = useState<string | null>(null);
  const [analysisCount, setAnalysisCount] = useState(0);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [showGoalCreate, setShowGoalCreate] = useState(false);
  const [rescheduleQuest, setRescheduleQuest] = useState<Quest | null>(null); // Reschedule modal
  const [pastCollapsed, setPastCollapsed] = useState(true); // F6
  const [todayCategoryTab, setTodayCategoryTab] = useState<'DEFAULT' | 'CUSTOM'>('DEFAULT');

  // Daily Dungeon state
  const [isDungeonActive, setIsDungeonActive] = useState(false);
  const [dungeonPlan, setDungeonPlan] = useState<WorkoutDay | null>(null);
  const [dungeonRewardAnim, setDungeonRewardAnim] = useState<{ xp: number; gold: number } | null>(null);
  const [pendingDungeonRewards, setPendingDungeonRewards] = useState<{ xp: number; gold: number } | null>(null);

  // ──────────────────────────────────────────────────────────
  // AUTO-SWITCH QUEST TAB — goal-gen `DONE` listener
  // ──────────────────────────────────────────────────────────
  // Subscribes to the existing `_questGenListeners` Set in GoalDetailView so
  // we can flip `todayCategoryTab` to 'CUSTOM' once goal-based generation
  // finishes producing quests on the DEFAULT tab.
  //
  // Listener-ordering invariant: `App.tsx`'s top-level `useEffect` registers
  // its `onQuestGenStoreUpdate` callback at app-mount time, BEFORE this
  // component mounts. Because `Set` iteration follows insertion order, when
  // `updateQuestGenStore({state:'DONE', ...})` fires the synchronous
  // `forEach`, App's listener runs first and dispatches `addQuest` for every
  // pending feed quest; this listener runs second and only switches the tab.
  // We therefore deliberately do NOT call `addQuest` here — App.tsx remains
  // the sole dispatcher. React batches the queued state updates so the next
  // render shows the new quests under the freshly-active 'CUSTOM' tab.
  const lastHandledDoneRef = useRef<{ goalId: string | null; ts: number } | null>(null);
  useEffect(() => {
    const unsub = onQuestGenStoreUpdate((store) => {
      if (store.state !== 'DONE') return;

      // Exactly-once guard (Req 2.6): suppress double-fire within a 50ms
      // window keyed on goalId. Protects against React StrictMode's
      // dev-time double-invoke of effects and any rapid re-emit edge case.
      const sig = { goalId: store.goalId ?? null, ts: Date.now() };
      const prev = lastHandledDoneRef.current;
      if (prev && prev.goalId === sig.goalId && (sig.ts - prev.ts) < 50) return;
      lastHandledDoneRef.current = sig;

      if (shouldSwitchOnGoalGenDone({
        storeState: store.state,
        pendingFeedQuestsCount: store.pendingFeedQuests?.length ?? 0,
        currentTab: todayCategoryTab,
      })) {
        setTodayCategoryTab('CUSTOM');
      }
    });
    return unsub;
  }, [todayCategoryTab]);

  // Auto-initialize dungeon on mount (also patches existing goals if needed)
  useEffect(() => {
    if (playerData?.healthProfile && onInitializeDungeon) {
      onInitializeDungeon();
    }
  }, [playerData?.healthProfile, onInitializeDungeon]);

  // Auto-enter dungeon when triggered from a goal quest card
  useEffect(() => {
    if (dungeonEntryTrigger && dungeonEntryTrigger.timestamp > 0) {
      handleEnterDungeon(dungeonEntryTrigger.equipment);
    }
  }, [dungeonEntryTrigger?.timestamp]);

  const handleEnterDungeon = useCallback((equipmentOverride?: 'GYM' | 'HOME_DUMBBELLS' | 'BODYWEIGHT') => {
    if (!dungeonState) return;
    let plan;
    if (equipmentOverride) {
      plan = buildDungeonWorkoutPlanForEquipment(dungeonState, equipmentOverride);
    } else {
      // Build plan only for exercises not yet completed today
      const remainingTargets = dungeonState.targets.filter(
        (t: DungeonExerciseTarget) => !isExerciseCompletedToday(dungeonState, t.exercise)
      );
      // If all are done, use full plan (shouldn't happen but safety)
      const targetsForPlan = remainingTargets.length > 0 ? remainingTargets : dungeonState.targets;
      plan = buildDungeonWorkoutPlan(targetsForPlan);
    }
    setDungeonPlan(plan);
    setIsDungeonActive(true);
    onToggleNav?.(false);
    playSystemSoundEffect('SYSTEM');
  }, [dungeonState, onToggleNav]);

  const handleDungeonComplete = useCallback((c: number, t: number, r: Record<string, number>, anomaly?: number, fcBonus?: number, fcSession?: FormCoachSession) => {
    setIsDungeonActive(false);
    setDungeonPlan(null);
    onToggleNav?.(true);

    // Track per-exercise completions based on what was in the plan
    if (dungeonState && onUpdateDungeonState) {
      // The plan only contained remaining exercises; all exercises in the plan were completed
      const remainingTargets = dungeonState.targets.filter(
        (t: DungeonExerciseTarget) => !isExerciseCompletedToday(dungeonState, t.exercise)
      );
      const completedExNames = remainingTargets.map((t: DungeonExerciseTarget) => t.exercise);
      onUpdateDungeonState((prev: DungeonState) => recordExerciseCompletions(prev, completedExNames));
    }

    const rewards = onCompleteDungeonWorkout?.(c, t, r, anomaly, fcBonus, fcSession);

    // Auto-complete the fitness goal dungeon quest
    const dungeonGoalQuest = quests.find(q => q.isDungeonQuest && !q.isCompleted && !q.failed);
    if (dungeonGoalQuest) {
      completeQuest(dungeonGoalQuest.id);
    }

    // Extract XP and gold from returned rewards for fly animation
    if (Array.isArray(rewards) && rewards.length > 0) {
      let xp = 0, gold = 0;
      for (const rw of rewards) {
        if (rw.type === 'XP') xp += rw.amount;
        if (rw.type === 'GOLD') gold += rw.amount;
      }
      // Also add base XP (exercises × 40) since the pool rewards don't include it
      xp += c * 40;
      if (xp > 0 || gold > 0) {
        setPendingDungeonRewards({ xp, gold });
      }
    }
  }, [onToggleNav, onCompleteDungeonWorkout, dungeonState, onUpdateDungeonState, quests, completeQuest]);

  const handleDungeonFail = useCallback(() => {
    setIsDungeonActive(false);
    setDungeonPlan(null);
    onToggleNav?.(true);
    clearWorkoutSession(playerData?.userId || 'local');

    // When quitting mid-workout, record which exercises were actually completed
    // The ActiveWorkoutPlayer's currentIdx tells us how many exercises were finished
    if (dungeonState && onUpdateDungeonState && dungeonPlan) {
      // We can't easily know exact progress from here, so we DON'T mark anything as completed on fail
      // The user must complete an exercise fully within the workout player for it to count
      // This prevents the "everything gets marked cleared" bug
    }

    // Don't call onFailDungeonWorkout (which records a full failure/deload)
    // Instead, the dungeon state remains unchanged — user can re-enter and continue
  }, [onToggleNav, playerData?.userId, dungeonState, onUpdateDungeonState, dungeonPlan]);

  const handleToggleFormCoach = useCallback((exercise: 'PUSHUPS' | 'SQUATS') => {
    if (!dungeonState || !onUpdateDungeonState) return;
    onUpdateDungeonState((prev) => toggleFormCoach(prev, exercise));
  }, [dungeonState, onUpdateDungeonState]);

  // F5: Rule banner auto-hide
  const [bannerDismissed, setBannerDismissed] = useState(() => {
    return localStorage.getItem('reforge_rule_banner_dismissed') === 'true';
  });
  const bannerFirstSeen = useMemo(() => {
    const stored = localStorage.getItem('reforge_rule_banner_first_seen');
    if (stored) return parseInt(stored, 10);
    localStorage.setItem('reforge_rule_banner_first_seen', String(Date.now()));
    return Date.now();
  }, []);
  const bannerExpired = Date.now() - bannerFirstSeen > 7 * 24 * 60 * 60 * 1000; // 7 days
  const showBanner = !bannerDismissed && !bannerExpired;

  // F2: Auto-scroll ref
  const currentEntryRef = useRef<HTMLDivElement>(null);
  const hasScrolled = useRef(false);

  // ── Live clock (updates every 30s) ──
  const [currentMinutes, setCurrentMinutes] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentMinutes(now.getHours() * 60 + now.getMinutes());
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  const userTimezone = getUserTimezone();

  useEffect(() => {
    onToggleNav?.(!isModalOpen);
  }, [isModalOpen, onToggleNav]);



  // ── Build unified timeline ──
  const scheduleSlots = useMemo(() => {
    // Always build the default schedule blocks from profile (routine, school, meals, sleep)
    const defaultSlots = scheduleProfile ? buildDefaultSlots(scheduleProfile) : [];

    // Merge in any extra slots from dailySchedule (e.g., goal-quest slots added dynamically)
    if (dailySchedule?.slots?.length) {
      const defaultIds = new Set(defaultSlots.map(s => s.id));
      const extras = dailySchedule.slots.filter(s => !defaultIds.has(s.id));
      return [...defaultSlots, ...extras];
    }

    return defaultSlots;
  }, [dailySchedule, scheduleProfile]);

  // Today's quests sorted by scheduled time
  const todaysQuests = useMemo(() => {
    const today = todayStr();
    return quests
      .filter(q => {
        const d = new Date(q.createdAt);
        d.setHours(0, 0, 0, 0);
        return d.toDateString() === new Date().toDateString();
      })
      .sort((a, b) => {
        const aT = a.scheduledTime ? timeToMinutes(a.scheduledTime.includes('T') ? a.scheduledTime.split('T')[1].slice(0, 5) : a.scheduledTime) : 9999;
        const bT = b.scheduledTime ? timeToMinutes(b.scheduledTime.includes('T') ? b.scheduledTime.split('T')[1].slice(0, 5) : b.scheduledTime) : 9999;
        return aT - bT;
      });
  }, [quests]);

  // ── Default vs Custom split ──
  // Default: recurring/system quests (isDaily AND not goal-generated) — pairs with the Sung Jin-woo dungeon
  // Custom: goal-generated quests (have goalId) OR one-time custom quests (isDaily=false)
  const defaultTodaysQuests = useMemo(
    () => todaysQuests.filter(q => !q.goalId && q.isDaily),
    [todaysQuests]
  );
  const customTodaysQuests = useMemo(
    () => todaysQuests.filter(q => !!q.goalId || !q.isDaily),
    [todaysQuests]
  );
  const activeDefaultCount = useMemo(
    () => {
      // System goal (Sung Jin-woo Protocol) renders 3 dungeon exercise cards
      // under the DEFAULT tab — count them whenever the dungeon is active so
      // the badge reflects what the user actually sees on the tab.
      const dungeonExerciseCount = dungeonState ? (dungeonState.targets?.length ?? 0) : 0;
      const questCount = defaultTodaysQuests.filter(q => !q.isCompleted && !q.failed).length;
      return dungeonExerciseCount + questCount;
    },
    [defaultTodaysQuests, dungeonState]
  );
  const activeCustomCount = useMemo(
    () => customTodaysQuests.filter(q => !q.isCompleted && !q.failed).length,
    [customTodaysQuests]
  );
  const visibleTodaysQuests = todayCategoryTab === 'DEFAULT' ? defaultTodaysQuests : customTodaysQuests;

  // Build merged timeline: schedule slots + quests interlaced by time
  const timeline = useMemo(() => {
    const entries: { type: 'SLOT' | 'QUEST'; time: number; slot?: ScheduleSlot; quest?: Quest }[] = [];

    // Add schedule slots only on DEFAULT tab — Custom tab focuses purely on user/goal quests
    if (todayCategoryTab === 'DEFAULT') {
      scheduleSlots.forEach(slot => {
        if (slot.type === 'QUEST') return; // Goal quest slots — rendered as quest cards below
        entries.push({ type: 'SLOT', time: timeToMinutes(slot.startTime), slot });
      });
    }

    // Add quests (filtered by current subsection)
    visibleTodaysQuests.forEach(quest => {
      const t = quest.scheduledTime
        ? timeToMinutes(quest.scheduledTime.includes('T') ? quest.scheduledTime.split('T')[1].slice(0, 5) : quest.scheduledTime)
        : 9999;
      entries.push({ type: 'QUEST', time: t, quest });
    });

    // Sort by time
    entries.sort((a, b) => a.time - b.time);

    return entries;
  }, [scheduleSlots, visibleTodaysQuests, todayCategoryTab]);

  // Determine which entry is "current"
  const currentEntryIdx = useMemo(() => {
    for (let i = timeline.length - 1; i >= 0; i--) {
      if (timeline[i].time <= currentMinutes) return i;
    }
    return 0;
  }, [timeline, currentMinutes]);

  // All visible (always show full day)
  const visibleTimeline = timeline;

  // F2: Auto-scroll to current entry on mount
  useEffect(() => {
    if (!hasScrolled.current && currentEntryRef.current) {
      setTimeout(() => {
        currentEntryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        hasScrolled.current = true;
      }, 400);
    }
  }, [timeline.length]);

  // Stats
  const activeQuests = todaysQuests.filter(q => !q.isCompleted && !q.failed);
  const completedQuests = todaysQuests.filter(q => q.isCompleted);
  const totalTasks = todaysQuests.length;
  const progress = totalTasks > 0 ? Math.round((completedQuests.length / totalTasks) * 100) : 0;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const questsAddedToday = quests.filter(q => q.createdAt >= startOfToday).length;
  const MAX_QUESTS_PER_DAY = 10;
  const canAddMoreQuests = questsAddedToday < MAX_QUESTS_PER_DAY;

  // ── Goals ──
  const activeGoals = (goals || []).filter(g => g.status === 'ACTIVE' || g.status === 'PAUSED');
  const completedGoals = (goals || []).filter(g => g.status === 'COMPLETED');

  const handleGoalCreated = useCallback((newGoal: Goal) => {
    if (onUpdateGoals) onUpdateGoals([...(goals || []), newGoal]);
    setShowGoalCreate(false);
  }, [goals, onUpdateGoals]);

  const handleUpdateGoal = useCallback((updatedGoal: Goal) => {
    if (onUpdateGoals) onUpdateGoals((goals || []).map(g => g.id === updatedGoal.id ? updatedGoal : g));
    setSelectedGoal(updatedGoal);
  }, [goals, onUpdateGoals]);

  const handleDeleteGoal = useCallback((goalId: string) => {
    if (onUpdateGoals) {
      const updated = (goals || []).map(g => g.id === goalId ? { ...g, status: 'ABANDONED' as const } : g);
      onUpdateGoals(updated);
    }
    setSelectedGoal(null);
    if (onDeleteGoal) onDeleteGoal(goalId);
    if (onDeductGold) onDeductGold(50);
  }, [goals, onUpdateGoals, onDeleteGoal, onDeductGold]);

  // ── Quest Creation (ForgeGuard) — identical to QuestsView ──
  const setCurrentTime = () => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    setScheduleTime(`${hh}:${mm}`);
    setAutoScheduled(false);
    playSystemSoundEffect('SYSTEM');
  };

  const handleForgeAnalyze = async () => {
    if (!canAddMoreQuests) {
      setForgeError(`SYSTEM LIMIT REACHED: You have already forged ${MAX_QUESTS_PER_DAY} quests today.`);
      return;
    }
    if (!title.trim() || title.trim().length < 5) {
      setForgeError('Describe the quest clearly. Be specific about what you will actually do.');
      return;
    }
    const dailyCount = getDailyAnalysisCount(playerData?.userId);
    const isFree = dailyCount < FREE_DAILY_ANALYSES;
    const tutFreeKey = `reforge_tut_free_analyses_${playerData?.userId || 'local'}`;
    const tutFreeUsed = parseInt(localStorage.getItem(tutFreeKey) || '0', 10);

    if (isQuestOnboarding && tutFreeUsed < 2) {
      localStorage.setItem(tutFreeKey, String(tutFreeUsed + 1));
    } else if (!isFree && (playerData?.keys ?? 0) <= 0) {
      setForgeError('KEYS DEPLETED — You\'ve used your 3 free analyses today. Buy more keys or complete quests to earn them.');
      return;
    }
    setIsAnalyzing(true);
    setForgeResult(null);
    setForgeError(null);
    setAutoScheduled(false);
    setScheduleTime('');
    playSystemSoundEffect('SYSTEM');
    try {
      const res = await fetch(`${API_BASE}/api/forge-guard/analyze-quest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getPlayerAuthHeaders() },
        credentials: 'include',
        body: JSON.stringify({
          title: title.trim(),
          userStats: playerData?.stats,
          healthProfile: playerData?.healthProfile,
          timezone: userTimezone,
          retryCount: analysisCount,
        }),
      });

      if (res.status === 402) {
        setForgeError('KEYS DEPLETED — Not enough keys for this analysis. Buy more or wait until tomorrow.');
        playSystemSoundEffect('WARNING');
        return;
      }
      if (!res.ok) throw new Error('ForgeGuard offline');
      const data: ForgeGuardResult = await res.json();
      if (data.isSpam) {
        setForgeError('ForgeGuard has rejected this objective. The System cannot verify this as a real-world task.');
        playSystemSoundEffect('WARNING');
        if (tutorialStep === 3 && onTutorialAnalysisFail) { setTitle(''); onTutorialAnalysisFail(); }
      } else {
        const hasNumber = /\d/.test(title.trim());
        const cats = (data.categories || []) as string[];
        const isPhysical = !!data.sensorRequirements || ['strength', 'willpower'].every(c => cats.includes(c));
        if (isPhysical && !hasNumber && data.estimatedDuration && data.estimatedDuration > 0) {
          setForgeError('Quest rejected — specify a time, distance, or rep count for physical tasks.');
          playSystemSoundEffect('WARNING');
          if (tutorialStep === 3 && onTutorialAnalysisFail) { setTitle(''); onTutorialAnalysisFail(); }
        } else {
          setForgeResult(data);
          if (data.autoDetectedTime) { setScheduleTime(data.autoDetectedTime); setAutoScheduled(true); }
          incrementDailyAnalysisCount(playerData?.userId);
          playSystemSoundEffect('PURCHASE');
          if (tutorialStep === 3 && onTutorialAction) onTutorialAction(4);
        }
      }
      setAnalysisCount(prev => prev + 1);
    } catch {
      setForgeError('ForgeGuard is offline. Please try again.');
      if (tutorialStep === 3 && onTutorialAnalysisFail) { setTitle(''); onTutorialAnalysisFail(); }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCreate = () => {
    setError(null);
    if (!forgeResult || !title.trim()) return;
    if (!scheduleTime) { setError('SET A TIME — When are you doing this quest today?'); return; }
    if (playerData?.questOnboardingDone !== false) {
      const isDuplicate = quests.some(q => q.title.toLowerCase().trim() === title.toLowerCase().trim() && !q.isCompleted && !q.failed);
      if (isDuplicate) { setError('DUPLICATE QUEST DETECTED.'); playSystemSoundEffect('WARNING'); return; }
    }
    if (tutorialStep !== 4 && !isQuestOnboarding) {
      const rank = forgeResult.rank;
      const pledgeAmount = PLEDGE_AMOUNTS[rank];
      if (MANDATORY_RANKS.has(rank) && (playerData?.gold ?? 0) < pledgeAmount) {
        setError(`INSUFFICIENT GOLD — ${rank}-Rank quests require ${pledgeAmount}G.`);
        playSystemSoundEffect('WARNING');
        return;
      }
    }
    // Store scheduledTime as raw "HH:MM" string in local time — NOT ISO.
    // ISO conversion was misinterpreting local time as UTC, causing timestamp drift.
    const newQuest: Quest = {
      id: Math.random().toString(36).substr(2, 9),
      title: title.trim(), description: '',
      rank: forgeResult.rank, priority: 'MEDIUM' as Priority,
      category: forgeResult.category,
      categories: forgeResult.categories || [forgeResult.category],
      xpReward: forgeResult.xp, isCompleted: false, failed: false,
      createdAt: Date.now(), isDaily,
      estimatedDuration: forgeResult.estimatedDuration,
      minDurationMinutes: forgeResult.minDurationMinutes,
      aiReasoning: forgeResult.reasoning,
      scheduledTime: scheduleTime, // raw "HH:MM" in local timezone
      ...(forgeResult.sensorRequirements ? { sensorRequirements: forgeResult.sensorRequirements } : {}),
    };
    if (tutorialStep === 4 || isQuestOnboarding) {
      addQuest(newQuest); resetForm();
      if (onTutorialAction) onTutorialAction(5);
    } else {
      addQuest(newQuest);
      // ── auto-switch-quest-tab feature: if the new quest is a Custom_Quest
      // and the user is currently viewing DEFAULT, flip the tab to CUSTOM
      // BEFORE closing the modal so the user lands on the tab that contains
      // their newly created quest. Tutorial mode is excluded by branch above.
      if (shouldSwitchOnManualCreate({
        newQuest,
        currentTab: todayCategoryTab,
        isTutorial: false,
      })) {
        setTodayCategoryTab('CUSTOM');
      }
      setIsModalOpen(false); resetForm();
      // Schedule notification for when quest starts
      scheduleQuestStartNotification(newQuest.id, newQuest.title, scheduleTime);
      // ADS DISABLED — interstitial ad after quest creation removed
      // const dailyCount = getDailyAnalysisCount(playerData?.userId);
      // if (dailyCount > FREE_DAILY_ANALYSES && onShowInterstitialAd) {
      //   try { onShowInterstitialAd(); } catch (e) { /* ad failed, continue */ }
      // }
    }
  };

  const resetForm = () => {
    setIsModalOpen(false); setTitle(''); setError(null);
    setForgeResult(null); setForgeError(null);
    setScheduleTime(''); setAutoScheduled(false);
    setIsDaily(false); setAnalysisCount(0);
  };

  const rk = forgeResult ? RANK_COLORS[forgeResult.rank] : null;
  const scheduleReady = !!scheduleTime;

  // ── If a goal detail is selected, show that ──
  if (selectedGoal) {
    const liveGoal = (goals || []).find(g => g.id === selectedGoal.id) || selectedGoal;
    return (
      <GoalDetailView
        goal={liveGoal}
        playerData={playerData}
        allGoals={goals || []}
        existingQuests={todaysQuests}
        onBack={() => setSelectedGoal(null)}
        onUpdateGoal={handleUpdateGoal}
        onDeleteGoal={handleDeleteGoal}
        onAddQuestToFeed={addQuest}
        onUpdateScheduleSlots={onUpdateScheduleSlots}
      />
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">

      {/* ── Header ── */}
      <div className="sticky top-0 z-20 pt-2 pb-3 px-0"
        style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
      >
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-3">
            <span className="text-xs font-heading font-extrabold tracking-[0.25em] text-white uppercase">
              TODAY
            </span>
            <ProgressRing completed={completedQuests.length} total={Math.max(3, totalTasks)} />
          </div>

          <button
            id="tut-add-quest"
            onClick={() => {
              setIsModalOpen(true);
              if (tutorialStep === 1 && onTutorialAction) onTutorialAction(2);
            }}
            className="w-11 h-11 md:w-13 md:h-13 rounded-full flex items-center justify-center active:scale-90 transition-all"
            style={{ background: 'linear-gradient(135deg, #00d4ff, #0099cc)', boxShadow: '0 0 20px rgba(0,212,255,0.4), 0 4px 14px rgba(0,0,0,0.35)' }}
          >
            <Plus size={22} className="text-black" strokeWidth={3} />
          </button>
        </div>
      </div>




      {/* ── DEFAULT / CUSTOM SUBSECTION TABS ── */}
      <div
        className="flex items-center gap-1 p-1 rounded-xl mx-1"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {(['DEFAULT', 'CUSTOM'] as const).map(tab => {
          const isActive = todayCategoryTab === tab;
          const count = tab === 'DEFAULT' ? activeDefaultCount : activeCustomCount;
          return (
            <button
              key={tab}
              onClick={() => {
                if (todayCategoryTab !== tab) triggerHaptic('TAB_SWITCH');
                setTodayCategoryTab(tab);
              }}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-all active:scale-[0.98]"
              style={{
                background: isActive ? 'rgba(0,212,255,0.12)' : 'transparent',
                border: isActive ? '1px solid rgba(0,212,255,0.35)' : '1px solid transparent',
                boxShadow: isActive ? '0 0 14px rgba(0,212,255,0.18)' : 'none',
              }}
            >
              <span
                className="text-[10px] font-black font-mono uppercase tracking-[0.18em]"
                style={{ color: isActive ? '#00d4ff' : 'rgba(156,163,175,0.85)' }}
              >
                {tab === 'DEFAULT' ? 'Default' : 'Custom'}
              </span>
              <span
                className="px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold tabular-nums"
                style={{
                  background: isActive ? 'rgba(0,212,255,0.18)' : 'rgba(255,255,255,0.06)',
                  color: isActive ? '#00d4ff' : '#9ca3af',
                  minWidth: 18,
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>


      {/* ── DAILY DUNGEON (Sung Jin-woo Protocol) — DEFAULT TAB ONLY ── */}
      {todayCategoryTab === 'DEFAULT' && dungeonState && (
        <div id="dungeon-protocol-section" className="mb-4">
          <DungeonQuestCards
            dungeonState={dungeonState}
            onEnterDungeon={handleEnterDungeon}
            onToggleFormCoach={handleToggleFormCoach}
            playerGold={playerData?.gold ?? 0}
            userId={playerData?.userId ?? ''}
            onUpdateDungeonState={onUpdateDungeonState}
            onDeductGold={onDeductGold}
            showRewardedAd={adShowRewarded}
            isPremium={!!isPremium}
          />
        </div>
      )}

      {/* Dungeon Workout Player (fullscreen overlay) */}
      {isDungeonActive && dungeonPlan && (
        <div className="fixed inset-0 z-[200]">
          <ActiveWorkoutPlayer
            plan={dungeonPlan}
            onComplete={handleDungeonComplete}
            onFail={handleDungeonFail}
            streak={playerData?.streak || 0}
          />
        </div>
      )}

      {/* Dungeon reward fly animation (XP orbs + gold crystals) */}
      {dungeonRewardAnim && (
        <DungeonRewardAnimation
          xpEarned={dungeonRewardAnim.xp}
          goldEarned={dungeonRewardAnim.gold}
          onComplete={() => setDungeonRewardAnim(null)}
        />
      )}

      {/* Dungeon 2× reward modal */}
      {pendingDungeonRewards && (
        <DoubleRewardModal
          title="Dungeon Cleared!"
          subtitle="Watch a short ad to double your dungeon rewards."
          rewards={[
            ...(pendingDungeonRewards.xp > 0 ? [{ icon: 'xp' as const, label: 'XP', amount: pendingDungeonRewards.xp }] : []),
            ...(pendingDungeonRewards.gold > 0 ? [{ icon: 'gold' as const, label: 'Gold', amount: pendingDungeonRewards.gold }] : []),
          ]}
          onWatchAd={async () => {
            if (!adShowRewarded || !adUnits?.KEY_REWARD) return { rewarded: false };
            return adShowRewarded(adUnits.KEY_REWARD);
          }}
          onClaim={(multiplier) => {
            const { xp, gold } = pendingDungeonRewards;
            setPendingDungeonRewards(null);
            if (multiplier === 2 && onAddRewards) {
              onAddRewards(gold, xp);
            }
            setDungeonRewardAnim({ xp: xp * multiplier, gold: gold * multiplier });
          }}
          onSkip={() => {
            const { xp, gold } = pendingDungeonRewards;
            setPendingDungeonRewards(null);
            setDungeonRewardAnim({ xp, gold });
          }}
        />
      )}

      {/* ── UNIFIED TIMELINE ── */}
      <div className="min-h-[40vh] pb-4 relative px-1">
        {(() => {
          // F6: Separate past schedule blocks from active entries
          const pastSlots: typeof visibleTimeline = [];
          const activeEntries: typeof visibleTimeline = [];
          let foundCurrent = false;

          for (const entry of visibleTimeline) {
            if (entry.type === 'SLOT' && entry.slot) {
              const endMin = timeToMinutes(entry.slot.endTime);
              if (currentMinutes >= endMin && !foundCurrent) {
                pastSlots.push(entry);
                continue;
              }
            }
            foundCurrent = true;
            activeEntries.push(entry);
          }

          return (
            <>
              {/* F6: Collapsed past schedule blocks */}
              {pastSlots.length > 0 && (
                <div className="mb-2">
                  <button
                    onClick={() => setPastCollapsed(!pastCollapsed)}
                    className="w-full flex items-center gap-2 py-2 px-2 rounded-lg hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="w-3 h-3 text-gray-600" />
                      <span className="text-[10px] font-mono text-gray-500">
                        {pastSlots.length} block{pastSlots.length > 1 ? 's' : ''} completed
                      </span>
                    </div>
                    <span className="text-[9px] text-gray-700 font-mono flex-1 truncate ml-1">
                      {pastSlots.map(e => e.slot?.label).filter(Boolean).join(', ')}
                    </span>
                    {pastCollapsed ? (
                      <ChevronDown className="w-3 h-3 text-gray-700 flex-shrink-0" />
                    ) : (
                      <ChevronUp className="w-3 h-3 text-gray-700 flex-shrink-0" />
                    )}
                  </button>

                  <AnimatePresence>
                    {!pastCollapsed && pastSlots.map((entry, i) => (
                      <motion.div key={`past-slot-${entry.slot?.id}`}
                        initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
                      >
                        <ScheduleSlotRow slot={entry.slot!} isCurrent={false} isPast={true}
                          isLast={i === pastSlots.length - 1 && activeEntries.length === 0} />
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {/* Separator between past and active */}
                  {activeEntries.length > 0 && (
                    <div className="flex items-center gap-2 py-1 px-2">
                      <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.04)' }} />
                      <span className="text-[8px] text-gray-700 font-mono uppercase tracking-wider">Now</span>
                      <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.04)' }} />
                    </div>
                  )}
                </div>
              )}

              {/* Active entries */}
              {activeEntries.map((entry, index) => {
                const isLastEntry = index === activeEntries.length - 1;
                // F2: Attach ref to the first active entry for auto-scroll
                const isCurrentRef = index === 0;

                if (entry.type === 'SLOT' && entry.slot) {
                  const slotMin = timeToMinutes(entry.slot.startTime);
                  const isCurrent = currentMinutes >= slotMin && currentMinutes < timeToMinutes(entry.slot.endTime);
                  const isPast = currentMinutes >= timeToMinutes(entry.slot.endTime);

                  return (
                    <motion.div key={`slot-${entry.slot.id}`}
                      ref={isCurrentRef ? currentEntryRef : undefined}
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04, duration: 0.3 }}
                    >
                      <ScheduleSlotRow slot={entry.slot} isCurrent={isCurrent} isPast={isPast} isLast={isLastEntry} />
                    </motion.div>
                  );
                }

                if (entry.type === 'QUEST' && entry.quest) {
                  const quest = entry.quest;
                  const scheduledMin = quest.scheduledTime
                    ? timeToMinutes(quest.scheduledTime.includes('T') ? quest.scheduledTime.split('T')[1].slice(0, 5) : quest.scheduledTime)
                    : currentMinutes;
                  const isActive = !quest.isCompleted && !quest.failed;
                  const isCurrent = isActive && currentMinutes >= (scheduledMin - 10) && currentMinutes <= (scheduledMin + (quest.estimatedDuration || 20) + 10);
                  const isPast = quest.isCompleted || quest.failed;

                  return (
                    <motion.div key={`quest-${quest.id}`}
                      ref={isCurrentRef ? currentEntryRef : undefined}
                      layout
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.3, delay: index * 0.04 }}
                    >
                      <QuestTimelineRow
                        quest={quest}
                        currentMinutes={currentMinutes}
                        isCurrent={isCurrent}
                        isPast={!!isPast}
                        isLast={isLastEntry}
                        onComplete={completeQuest}
                        onFail={failQuest}
                        onReset={resetQuest}
                        onDelete={deleteQuest}
                        onReschedule={rescheduleQuestProp ? (q) => setRescheduleQuest(q) : undefined}
                        onStartTracking={onStartTracking}
                        onStopTracking={onStopTracking}
                        onEnterDungeon={(equipment) => handleEnterDungeon(equipment)}
                      />
                    </motion.div>
                  );
                }

                return null;
              })}
            </>
          );
        })()}

        {/* Empty state */}
        {timeline.length === 0 && visibleTodaysQuests.length === 0 && (
          <div className="text-center py-20 text-gray-600 font-mono text-sm border-2 border-dashed border-gray-800 rounded-lg bg-black/20">
            {todayCategoryTab === 'CUSTOM'
              ? 'NO CUSTOM QUESTS. CREATE A QUEST OR GENERATE FROM A GOAL.'
              : 'NO DEFAULT PROTOCOLS. INITIATE QUEST.'}
          </div>
        )}

        {timeline.length > 0 && (
          <div className="flex justify-center mt-4">
            <div className="text-[10px] text-gray-700 font-mono flex items-center gap-2">
              <Moon size={12} className="text-indigo-500" /> END OF DAY
            </div>
          </div>
        )}
      </div>



      {/* Spacing for nav */}
      <div className="h-20" />

      {/* ── Reschedule Modal ── */}
      <AnimatePresence>
        {rescheduleQuest && rescheduleQuestProp && (
          <RescheduleModal
            quest={rescheduleQuest}
            scheduleSlots={scheduleSlots}
            otherQuests={todaysQuests}
            onSave={(questId, newTime) => {
              rescheduleQuestProp(questId, newTime);
              playSystemSoundEffect('SYSTEM');
            }}
            onClose={() => setRescheduleQuest(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Quest Creation Modal (identical to QuestsView) ── */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[90] flex items-end md:items-center justify-center bg-black/90 backdrop-blur-sm overflow-hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="w-full max-w-lg md:max-w-xl rounded-t-2xl md:rounded-2xl overflow-hidden max-h-[94vh] md:max-h-[85vh] md:m-6 relative flex flex-col"
              style={{ background: '#08081a', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 -8px 40px rgba(0,0,0,0.6), 0 0 80px rgba(0,212,255,0.03)' }}
            >
              {/* Modal header */}
              <div className="px-5 pt-5 pb-3 flex justify-between items-center z-10 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)' }}>
                    <ShieldCheck size={13} className="text-[#00d4ff]" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-white font-mono tracking-[0.2em]">NEW QUEST</h3>
                    <span className="text-[8px] text-gray-600 font-mono flex items-center gap-1"><Globe size={7} />{userTimezone}</span>
                  </div>
                </div>
                <button onClick={resetForm} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-600 hover:text-white hover:bg-white/5 transition-all">
                  <X size={16} />
                </button>
              </div>

              <div className="mx-5 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }} />

              <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      className="bg-red-900/15 border border-red-900/40 p-3 rounded-xl text-[10px] text-red-400 font-mono flex items-center gap-2"
                    >
                      <AlertTriangle size={11} className="shrink-0" /> {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Title Input */}
                <div>
                  <label className="block text-[10px] text-gray-500 mb-2 font-mono uppercase tracking-widest">Describe your quest</label>
                  <input
                    id="tut-quest-title"
                    value={title}
                    onChange={e => {
                      setTitle(e.target.value);
                      if (forgeError) setForgeError(null);
                      if (forgeResult) { setForgeResult(null); setScheduleTime(''); setAutoScheduled(false); }
                    }}
                    onKeyDown={e => { const wc = title.trim().split(/\s+/).filter(w=>w.length>0).length; if (e.key === 'Enter' && wc >= 2 && !isAnalyzing && !forgeResult) handleForgeAnalyze(); }}
                    placeholder="e.g. Run 5km, Read 30 pages, Cook dinner at 7pm"
                    maxLength={120}
                    className="w-full rounded-xl p-3.5 text-white text-sm focus:outline-none transition-all placeholder:text-gray-700 font-mono"
                    style={{ background: 'rgba(255,255,255,0.03)', border: forgeResult ? '1px solid rgba(34,197,94,0.25)' : '1px solid rgba(255,255,255,0.08)', boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.3)' }}
                    autoFocus
                  />
                  <div className="flex justify-between mt-1.5 px-0.5">
                    <span className="text-[9px] font-mono" style={{ color: title.trim().split(/\s+/).filter(w=>w.length>0).length >= 2 ? 'rgba(0,212,255,0.4)' : 'rgba(156,163,175,0.4)' }}>
                      {title.trim().split(/\s+/).filter(w=>w.length>0).length >= 2 ? 'Ready to analyze' : 'Min 2 words'}
                    </span>
                    <span className="text-[9px] text-gray-700 font-mono">{title.length}/120</span>
                  </div>

                  {/* Specificity note */}
                  <div className="mt-2.5 rounded-xl p-3" style={{ background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.15)' }}>
                    <p className="text-[10px] font-black text-amber-400 font-mono uppercase tracking-wider mb-2">Always include a time or amount</p>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-[10px] font-mono"><span className="text-red-400 font-bold">✗</span><span className="text-gray-500 line-through">Running</span></div>
                      <div className="flex items-center gap-2 text-[10px] font-mono"><span className="text-green-400 font-bold">✓</span><span className="text-gray-300">Run 10 km</span></div>
                    </div>
                  </div>
                </div>

                {/* Analyze button */}
                {!forgeResult && (() => { const hasWords = title.trim().split(/\s+/).filter(w=>w.length>0).length >= 2; return (
                <button
                  id="tut-quest-analyze"
                  onClick={handleForgeAnalyze}
                  disabled={isAnalyzing || !hasWords}
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                    isAnalyzing ? 'text-[#00d4ff] cursor-wait' : hasWords ? 'text-[#00d4ff] hover:bg-[#00d4ff]/8' : 'text-gray-600 cursor-not-allowed'
                  }`}
                  style={{
                    background: isAnalyzing ? 'rgba(0,212,255,0.06)' : hasWords ? 'rgba(0,212,255,0.04)' : 'rgba(255,255,255,0.02)',
                    border: isAnalyzing ? '1px solid rgba(0,212,255,0.3)' : hasWords ? '1px solid rgba(0,212,255,0.15)' : '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  {isAnalyzing ? <><Loader2 size={14} className="animate-spin" /> ANALYZING...</> : (() => {
                    const dailyUsed = getDailyAnalysisCount(playerData?.userId);
                    const remaining = Math.max(0, FREE_DAILY_ANALYSES - dailyUsed);
                    return <><BrainCircuit size={14} /> ANALYZE QUEST <span className="text-[9px] opacity-60 ml-1">{remaining > 0 ? `(FREE — ${remaining}/3 left)` : analysisCount >= 5 ? '(1 KEY)' : '(FREE)'}</span></>;
                  })()}
                </button>);})()}

                {/* Forge Error */}
                <AnimatePresence>
                  {forgeError && (
                    <motion.div id="forge-error-banner"
                      initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="bg-red-950/30 border border-red-800/40 rounded-xl p-3 flex items-start gap-2"
                    >
                      <AlertTriangle size={12} className="text-red-400 mt-0.5 shrink-0" />
                      <p className="text-[11px] text-red-400 font-mono leading-relaxed">{forgeError}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ForgeGuard Result */}
                <AnimatePresence>
                  {forgeResult && rk && (
                    <motion.div id="tut-quest-category"
                      initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                      className="rounded-2xl overflow-hidden"
                      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <div className="p-4 space-y-3">
                        <div className="flex items-center gap-3">
                          <RankBadge rank={forgeResult.rank as RankType} size={48} animated />
                          <div className="flex-1">
                            <div className="flex items-baseline gap-2">
                              <span className="text-lg font-black text-white font-mono">+{forgeResult.xp}</span>
                              <span className="text-[10px] text-gray-500 font-mono">XP</span>
                            </div>
                            <span className="text-[9px] text-gray-600 font-mono">~{forgeResult.estimatedDuration} min</span>
                          </div>
                          <div className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
                            <CheckCircle size={10} className="text-green-400" />
                            <span className="text-[9px] text-green-400 font-black font-mono">READY</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {(forgeResult.categories || [forgeResult.category]).map((cat) => {
                            const pillarConfig: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
                              strength:     { icon: <Dumbbell size={11} />, color: '#f97066', bg: 'rgba(249,112,102,0.1)' },
                              intelligence: { icon: <Brain size={11} />,    color: '#00d4ff', bg: 'rgba(129,140,248,0.1)' },
                              discipline:   { icon: <Shield size={11} />,   color: '#33dfff', bg: 'rgba(192,132,252,0.1)' },
                              social:       { icon: <Users size={11} />,    color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' },
                            };
                            const cfg = pillarConfig[cat];
                            if (!cfg) return null;
                            return (
                              <span key={cat} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black font-mono uppercase tracking-wide"
                                style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}25` }}>
                                {cfg.icon} {cat}
                              </span>
                            );
                          })}
                        </div>
                        <p className="text-[11px] text-gray-400 font-mono leading-relaxed">{forgeResult.reasoning}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Schedule picker */}
                <AnimatePresence>
                  {forgeResult && (
                    <motion.div id="tut-schedule"
                      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      className="space-y-3"
                    >
                      <div className="flex items-center gap-2">
                        <Clock size={12} className={scheduleReady ? 'text-[#00d4ff]' : 'text-gray-500'} />
                        <span className="text-[10px] font-black uppercase tracking-widest font-mono text-gray-400">Schedule</span>
                        {!scheduleReady && <span className="text-[9px] text-amber-500/70 font-mono ml-auto">REQUIRED</span>}
                        {scheduleReady && autoScheduled && <span className="text-[9px] text-[#00d4ff]/60 font-mono ml-auto">AUTO-DETECTED</span>}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="time" value={scheduleTime}
                          onChange={e => { setScheduleTime(e.target.value); setAutoScheduled(false); }}
                          className="flex-1 rounded-xl p-2.5 text-white text-xs focus:outline-none transition-all font-mono"
                          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
                        />
                        <button onClick={setCurrentTime}
                          className="px-4 rounded-xl text-[10px] font-black font-mono uppercase tracking-wider transition-all flex items-center gap-1.5"
                          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#9ca3af' }}
                        >
                          <Zap size={10} /> NOW
                        </button>
                      </div>
                      <button onClick={() => setIsDaily(!isDaily)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl transition-all"
                        style={{ background: isDaily ? 'rgba(0,212,255,0.04)' : 'rgba(255,255,255,0.02)', border: isDaily ? '1px solid rgba(0,212,255,0.15)' : '1px solid rgba(255,255,255,0.05)' }}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${isDaily ? 'bg-[#00d4ff] border-[#00d4ff]' : 'bg-transparent border-gray-700'}`}>
                          {isDaily && <Repeat size={9} className="text-black" />}
                        </div>
                        <div className="text-left">
                          <p className={`text-[10px] font-black uppercase tracking-widest font-mono ${isDaily ? 'text-[#00d4ff]' : 'text-gray-500'}`}>Repeat Daily</p>
                          <p className="text-[9px] text-gray-600 font-mono">{isDaily ? 'Resets at midnight every day' : 'One-time quest'}</p>
                        </div>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Modal footer */}
              <div className="px-5 py-4 border-t border-white/[0.05] flex justify-end gap-3 z-10 shrink-0" style={{ background: 'rgba(4,4,14,0.8)' }}>
                <button onClick={resetForm} className="px-5 py-2.5 text-xs font-mono font-bold text-gray-600 hover:text-white transition-colors rounded-xl hover:bg-white/5">
                  CANCEL
                </button>
                <button
                  id="tut-confirm-quest"
                  onClick={handleCreate}
                  disabled={!forgeResult || !title.trim() || !scheduleReady}
                  className="px-6 py-2.5 font-black rounded-xl text-xs font-mono transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                  style={{
                    background: (!forgeResult || !scheduleReady) ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)',
                    color: (!forgeResult || !scheduleReady) ? '#4b5563' : '#000',
                    boxShadow: (!forgeResult || !scheduleReady) ? 'none' : '0 0 20px rgba(0,212,255,0.2)',
                  }}
                >
                  CONFIRM PROTOCOL
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DailyCommandCenter;
