
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
  ScheduleProfile, ScheduleSlot, DailySchedule, ScheduleSlotType
} from '../types';
import GoalCard from './GoalCard';
import GoalDetailView from './GoalDetailView';
import GoalCreationFlow from './GoalCreationFlow';
import RankBadge from './RankBadge';
import type { RankType } from './RankBadge';
import QuestCard from './QuestCard';
import { PLEDGE_AMOUNTS, MANDATORY_RANKS } from './SystemPactScreen';
import { playSystemSoundEffect } from '../utils/soundEngine';
import { API_BASE } from '../lib/apiConfig';
import { getPlayerAuthHeaders } from '../lib/playerApi';
import OnboardingNotice from './OnboardingNotice';
import { scheduleSlotReminder, cancelScheduleSlotReminder } from '../hooks/useLocalNotifications';

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
  // Schedule props
  scheduleProfile?: ScheduleProfile;
  dailySchedule?: DailySchedule;
  onSetupSchedule?: () => void;
  onSlotAction?: (slotId: string, action: 'SKIP' | 'DEFER', slots: ScheduleSlot[]) => void;
  onToggleNotify?: (slotId: string, enabled: boolean, slots: ScheduleSlot[]) => void;
  onReorderSlots?: (slots: ScheduleSlot[]) => void;
}

// ────────────────────────────────────────────────────────────
// CONSTANTS & HELPERS
// ────────────────────────────────────────────────────────────

const DAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTH_NAMES = [
  'JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE',
  'JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER',
];
const WATER_GRADIENT = 'linear-gradient(0deg, #8b5cf6 0%, #3b82f6 55%, #06b6d4 100%)';

const RANK_COLORS: Record<Rank, { bg: string; text: string; border: string; glow: string }> = {
  UNRANKED: { bg: 'bg-gray-900', text: 'text-gray-600', border: 'border-gray-800', glow: '' },
  E: { bg: 'bg-gray-800',       text: 'text-gray-300',  border: 'border-gray-600',  glow: '' },
  D: { bg: 'bg-orange-900/60',  text: 'text-orange-400',border: 'border-orange-700',glow: 'shadow-[0_0_12px_rgba(251,146,60,0.3)]' },
  C: { bg: 'bg-yellow-900/60',  text: 'text-yellow-400',border: 'border-yellow-700',glow: 'shadow-[0_0_12px_rgba(234,179,8,0.3)]' },
  B: { bg: 'bg-green-900/60',   text: 'text-green-400', border: 'border-green-700', glow: 'shadow-[0_0_12px_rgba(34,197,94,0.3)]' },
  A: { bg: 'bg-cyan-900/60',    text: 'text-cyan-400',  border: 'border-cyan-700',  glow: 'shadow-[0_0_12px_rgba(0,210,255,0.4)]' },
  S: { bg: 'bg-purple-900/60',  text: 'text-purple-400',border: 'border-purple-700',glow: 'shadow-[0_0_16px_rgba(139,92,246,0.5)]' },
};

const SLOT_ICONS: Record<string, React.ReactNode> = {
  SLEEP: <Moon className="w-3 h-3 text-indigo-400" />,
  ROUTINE: <Coffee className="w-3 h-3 text-orange-400" />,
  BLOCKED: <GraduationCap className="w-3 h-3 text-gray-400" />,
  WORKOUT: <Dumbbell className="w-3 h-3 text-red-400" />,
  QUEST: <Target className="w-3 h-3 text-cyan-400" />,
  MEAL: <Utensils className="w-3 h-3 text-green-400" />,
  FREE: <Zap className="w-3 h-3 text-purple-400" />,
};

const SLOT_COLORS: Record<string, string> = {
  SLEEP: '#818cf8',
  ROUTINE: '#fb923c',
  BLOCKED: '#6b7280',
  WORKOUT: '#f87171',
  QUEST: '#22d3ee',
  MEAL: '#4ade80',
  FREE: '#c084fc',
};

const GOAL_RANK_COLORS: Record<string, string> = {
  E: '#9ca3af', D: '#fb923c', C: '#facc15', B: '#4ade80', A: '#22d3ee', S: '#c084fc',
  UNRANKED: '#6b7280',
};

const CATEGORY_ICONS: Record<string, string> = {
  ACADEMIC: '📚', FITNESS: '💪', FINANCIAL: '💰', SKILL: '🎯',
  CAREER: '🚀', HEALTH: '❤️', CREATIVE: '🎨',
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
          <span className="text-sm font-black text-white font-mono tracking-widest">
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
            else if (doneOnDay === 0) { borderCol = '#dc2626'; glowFilter = '0 0 8px rgba(220,38,38,0.4)'; }
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
              style={{ animation: `pill-float ${floatDuration}s ease-in-out ${floatDelay}s infinite` }}
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
                   : showX ? <XCircle size={16} color="#ef4444" strokeWidth={1.8} />
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
}> = ({ slot, isCurrent, isPast }) => {
  const slotColor = SLOT_COLORS[slot.type] || '#6b7280';

  return (
    <div className={`flex items-center gap-2.5 py-2 px-3 rounded-xl transition-colors ${
      isCurrent ? 'bg-white/[0.03]' : ''
    }`}>
      {/* Time */}
      <div className={`w-14 text-[10px] font-mono font-bold text-right flex-shrink-0 ${
        isCurrent ? 'text-cyan-400' : isPast ? 'text-gray-700' : 'text-gray-500'
      }`}>
        {formatTime12(slot.startTime).split(' ')[0]}
        <span className="text-[7px] ml-0.5">{formatTime12(slot.startTime).split(' ')[1]}</span>
      </div>

      {/* Dot */}
      <div className="flex flex-col items-center flex-shrink-0">
        {isCurrent ? (
          <motion.div
            className="w-2.5 h-2.5 rounded-full"
            style={{ background: slotColor, boxShadow: `0 0 8px ${slotColor}` }}
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        ) : isPast ? (
          <div className="w-2 h-2 rounded-full bg-gray-800 border border-gray-700" />
        ) : (
          <Circle className="w-2 h-2 text-gray-700" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex items-center gap-1.5">
        <div className="flex-shrink-0">{SLOT_ICONS[slot.type]}</div>
        <span className={`text-[11px] font-mono truncate ${
          isCurrent ? 'text-white font-bold' : isPast ? 'text-gray-700' : 'text-gray-400'
        }`}>
          {slot.label}
        </span>
        {isCurrent && (
          <span className="text-[7px] font-black text-cyan-400 px-1.5 py-0.5 rounded bg-cyan-400/10 flex-shrink-0 uppercase tracking-wider">Now</span>
        )}
        {slot.type === 'BLOCKED' && (
          <span className="text-[7px] text-gray-700 font-mono ml-auto flex-shrink-0">
            until {formatTime12(slot.endTime)}
          </span>
        )}
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
        <Plus className="w-3 h-3 text-gray-700 group-hover:text-cyan-400 transition-colors" />
        <span className="text-[10px] font-mono text-gray-700 group-hover:text-gray-400 transition-colors">
          Free · {durationMin}m available
        </span>
      </div>
    </button>
  );
};

// ────────────────────────────────────────────────────────────
// QUEST TIMELINE ROW (quest with time-lock state)
// ────────────────────────────────────────────────────────────

const QuestTimelineRow: React.FC<{
  quest: Quest;
  lockState: ReturnType<typeof getQuestLockState>;
  currentMinutes: number;
  isCurrent: boolean;
  isPast: boolean;
  onComplete: (id: string, asMini?: boolean, rect?: DOMRect) => void;
  onFail: (id: string) => void;
  onReset: (id: string) => void;
  onDelete: (id: string) => void;
  onStartTracking?: (id: string, requirements?: any) => void;
  onStopTracking?: (id: string) => void;
}> = ({ quest, lockState, currentMinutes, isCurrent, isPast, onComplete, onFail, onReset, onDelete, onStartTracking, onStopTracking }) => {
  const scheduledStr = quest.scheduledTime?.includes('T')
    ? quest.scheduledTime.split('T')[1].slice(0, 5)
    : (quest.scheduledTime || '00:00');

  const isCompleted = quest.isCompleted;
  const isFailed = quest.failed;
  const isLocked = lockState.state === 'LOCKED' && !isCompleted && !isFailed;

  return (
    <div className="relative">
      {/* Time indicator row */}
      <div className={`flex items-center gap-2.5 px-3 pt-1 ${isLocked ? 'opacity-50' : ''}`}>
        <div className={`w-14 text-[10px] font-mono font-bold text-right flex-shrink-0 ${
          isCurrent && lockState.state === 'ACTIVE' ? 'text-cyan-400' :
          isCompleted ? 'text-gray-700' : isPast ? 'text-gray-700' : 'text-gray-500'
        }`}>
          {formatTime12(scheduledStr).split(' ')[0]}
          <span className="text-[7px] ml-0.5">{formatTime12(scheduledStr).split(' ')[1]}</span>
        </div>

        {/* Status dot */}
        <div className="flex flex-col items-center flex-shrink-0">
          {lockState.state === 'ACTIVE' && !isCompleted && !isFailed ? (
            <motion.div
              className="w-3 h-3 rounded-full"
              style={{ background: '#22d3ee', boxShadow: '0 0 8px #22d3ee' }}
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          ) : lockState.state === 'OVERTIME' ? (
            <motion.div className="w-3 h-3 rounded-full" style={{ background: '#fb923c', boxShadow: '0 0 8px #fb923c' }}
              animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
            />
          ) : isCompleted ? (
            <CheckCircle className="w-3 h-3 text-emerald-500" />
          ) : isFailed ? (
            <XCircle className="w-3 h-3 text-red-500" />
          ) : isLocked ? (
            <div className="w-2.5 h-2.5 rounded-full bg-gray-800 border border-gray-700" />
          ) : (
            <Circle className="w-2.5 h-2.5 text-gray-600" />
          )}
        </div>

        {/* Lock/Timer badge */}
        <div className="flex-1 min-w-0 flex items-center gap-1.5">
          {isLocked && (
            <span className="text-[8px] font-mono font-bold text-gray-600 flex items-center gap-1">
              <Timer className="w-3 h-3" />
              Starts in {formatCountdown(lockState.untilActivationMin)}
            </span>
          )}
          {lockState.state === 'ACTIVE' && !isCompleted && !isFailed && lockState.remainingMin > 0 && (
            <span className="text-[8px] font-mono font-bold text-cyan-400 flex items-center gap-1">
              <Timer className="w-3 h-3" />
              {formatCountdown(lockState.remainingMin)} left
            </span>
          )}
          {lockState.state === 'OVERTIME' && !isCompleted && !isFailed && (
            <span className="text-[8px] font-mono font-bold text-amber-400 flex items-center gap-1 animate-pulse">
              <AlertTriangle className="w-3 h-3" />
              OVERTIME! Hurry up
            </span>
          )}
          {lockState.state === 'EXPIRED' && !isCompleted && !isFailed && (
            <span className="text-[8px] font-mono font-bold text-red-400 flex items-center gap-1">
              <XCircle className="w-3 h-3" />
              Window expired
            </span>
          )}
          {/* 60% threshold badge */}
          {(lockState.state === 'ACTIVE') && !isCompleted && !isFailed && lockState.thresholdMin > 0 && (
            <span className="text-[7px] font-mono text-gray-600 ml-auto">
              Min {lockState.thresholdMin}m to complete
            </span>
          )}
        </div>
      </div>

      {/* Quest Card — reuse existing */}
      <div className={`ml-[72px] mr-1 mt-1 mb-1 ${isLocked ? 'opacity-40 pointer-events-none' : ''}`}>
        <QuestCard
          quest={quest}
          onComplete={(id, asMini) => {
            const el = document.getElementById(`quest-card-${id}`);
            const rect = el?.getBoundingClientRect() || undefined;
            onComplete(id, asMini, rect);
          }}
          onFail={onFail}
          onReset={onReset}
          onDelete={onDelete}
          isLocked={isLocked}
          onStartTracking={onStartTracking}
          onStopTracking={onStopTracking}
        />
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
  scheduleProfile, dailySchedule, onSetupSchedule,
  onSlotAction, onToggleNotify, onReorderSlots,
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
  const [showFullDay, setShowFullDay] = useState(false);

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
    if (dailySchedule?.slots?.length) return dailySchedule.slots;
    if (scheduleProfile) return buildDefaultSlots(scheduleProfile);
    return [];
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

  // Build merged timeline: schedule slots + quests interlaced by time
  const timeline = useMemo(() => {
    const entries: { type: 'SLOT' | 'QUEST'; time: number; slot?: ScheduleSlot; quest?: Quest }[] = [];

    // Add schedule slots (skip QUEST type — those are goal-quest slots, we show them as quest cards)
    scheduleSlots.forEach(slot => {
      if (slot.type === 'QUEST') return; // Goal quest slots — rendered as quest cards below
      entries.push({ type: 'SLOT', time: timeToMinutes(slot.startTime), slot });
    });

    // Add quests
    todaysQuests.forEach(quest => {
      const t = quest.scheduledTime
        ? timeToMinutes(quest.scheduledTime.includes('T') ? quest.scheduledTime.split('T')[1].slice(0, 5) : quest.scheduledTime)
        : 9999;
      entries.push({ type: 'QUEST', time: t, quest });
    });

    // Sort by time
    entries.sort((a, b) => a.time - b.time);

    return entries;
  }, [scheduleSlots, todaysQuests]);

  // Determine which entry is "current"
  const currentEntryIdx = useMemo(() => {
    for (let i = timeline.length - 1; i >= 0; i--) {
      if (timeline[i].time <= currentMinutes) return i;
    }
    return 0;
  }, [timeline, currentMinutes]);

  // Visible entries (show around current if not expanded)
  const visibleTimeline = showFullDay ? timeline : timeline.slice(
    Math.max(0, currentEntryIdx - 2),
    Math.min(timeline.length, currentEntryIdx + 8)
  );

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
    const manaCost = 15 + (analysisCount * 5);
    const tutFreeKey = `reforge_tut_free_analyses_${playerData?.userId || 'local'}`;
    const tutFreeUsed = parseInt(localStorage.getItem(tutFreeKey) || '0', 10);

    if (isQuestOnboarding && tutFreeUsed < 2) {
      localStorage.setItem(tutFreeKey, String(tutFreeUsed + 1));
    } else if (isQuestOnboarding && tutFreeUsed >= 2 && (playerData?.mp ?? 100) < manaCost) {
      onTutorialManaOut?.();
      return;
    } else {
      if (onConsumeMana) {
        if (!onConsumeMana(manaCost)) {
          setForgeError(`MANA DEPLETED — Need ${manaCost} mana. Resets at midnight.`);
          return;
        }
      }
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
        }),
      });
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
          playSystemSoundEffect('PURCHASE');
          if (tutorialStep === 3 && onTutorialAction) onTutorialAction(4);
        }
      }
      setAnalysisCount(prev => prev + 1);
    } catch {
      setForgeError('ForgeGuard is offline. Please try again.');
      if (onRefundMana) onRefundMana(manaCost);
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
    const scheduledTimestamp = new Date(`${todayStr()}T${scheduleTime}`).toISOString();
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
      scheduledTime: scheduledTimestamp,
      ...(forgeResult.sensorRequirements ? { sensorRequirements: forgeResult.sensorRequirements } : {}),
    };
    if (tutorialStep === 4 || isQuestOnboarding) {
      addQuest(newQuest); resetForm();
      if (onTutorialAction) onTutorialAction(5);
    } else if (onShowPact) {
      onShowPact(newQuest); setIsModalOpen(false); resetForm();
    } else { addQuest(newQuest); resetForm(); }
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
      <OnboardingNotice page="QUEST" />

      {/* ── Calendar + Header ── */}
      <div className="sticky top-0 z-20 space-y-3 pt-2 pb-3 px-0"
        style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
      >
        <FuturisticCalendar quests={quests} />

        {/* Day header row */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-3">
            <span className="text-xs font-black font-mono tracking-[0.25em] text-white uppercase">
              TODAY
            </span>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.14)', color: '#9ca3af' }}
            >
              {completedQuests.length}/{totalTasks} Done
            </span>
            {progress > 0 && (
              <div className="w-16 h-1.5 rounded-full bg-white/5 overflow-hidden">
                <motion.div className="h-full rounded-full"
                  style={{ background: progress >= 100 ? 'linear-gradient(90deg, #4ade80, #22c55e)' : 'linear-gradient(90deg, #22d3ee88, #22d3ee)' }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.8 }}
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {scheduleProfile && onSetupSchedule && (
              <button onClick={onSetupSchedule} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" title="Edit schedule">
                <Settings className="w-3.5 h-3.5 text-gray-600" />
              </button>
            )}
            <button
              id="tut-add-quest"
              onClick={() => {
                setIsModalOpen(true);
                if (tutorialStep === 1 && onTutorialAction) onTutorialAction(2);
              }}
              className="w-11 h-11 md:w-13 md:h-13 rounded-full flex items-center justify-center active:scale-90 transition-all"
              style={{ background: '#00d4ff', boxShadow: '0 0 22px rgba(0,212,255,0.5), 0 4px 14px rgba(0,0,0,0.35)' }}
            >
              <Plus size={22} className="text-black" strokeWidth={3} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Setup Schedule Prompt (if no schedule) ── */}
      {!scheduleProfile && (goals || []).length > 0 && onSetupSchedule && (
        <button
          onClick={onSetupSchedule}
          className="w-full rounded-2xl p-4 text-left transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, rgba(34,211,238,0.06), rgba(6,182,212,0.03))', border: '1px solid rgba(34,211,238,0.12)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(34,211,238,0.1)' }}>
              <span className="text-lg">⚡</span>
            </div>
            <div className="flex-1">
              <div className="text-xs font-black text-white uppercase tracking-wider">Setup Daily Protocol</div>
              <div className="text-[9px] text-gray-500 font-mono mt-0.5">Tell us your schedule for time-locked goals</div>
            </div>
            <div className="text-cyan-400 text-xs font-mono">→</div>
          </div>
        </button>
      )}

      {/* ── UNIFIED TIMELINE ── */}
      <div className="space-y-1 min-h-[40vh] pb-4 relative">
        <AnimatePresence mode="popLayout">
          {visibleTimeline.map((entry, index) => {
            if (entry.type === 'SLOT' && entry.slot) {
              const slotMin = timeToMinutes(entry.slot.startTime);
              const isCurrent = currentMinutes >= slotMin && currentMinutes < timeToMinutes(entry.slot.endTime);
              const isPast = currentMinutes >= timeToMinutes(entry.slot.endTime);

              return (
                <motion.div key={`slot-${entry.slot.id}`}
                  initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <ScheduleSlotRow slot={entry.slot} isCurrent={isCurrent} isPast={isPast} />
                </motion.div>
              );
            }

            if (entry.type === 'QUEST' && entry.quest) {
              const quest = entry.quest;
              const lockState = getQuestLockState(quest, currentMinutes);
              const scheduledMin = quest.scheduledTime
                ? timeToMinutes(quest.scheduledTime.includes('T') ? quest.scheduledTime.split('T')[1].slice(0, 5) : quest.scheduledTime)
                : currentMinutes;
              const isCurrent = lockState.state === 'ACTIVE' || lockState.state === 'OVERTIME';
              const isPast = quest.isCompleted || quest.failed || lockState.state === 'EXPIRED';

              return (
                <motion.div key={`quest-${quest.id}`}
                  layout
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25, delay: index * 0.03 }}
                >
                  <QuestTimelineRow
                    quest={quest}
                    lockState={lockState}
                    currentMinutes={currentMinutes}
                    isCurrent={isCurrent}
                    isPast={isPast}
                    onComplete={completeQuest}
                    onFail={failQuest}
                    onReset={resetQuest}
                    onDelete={deleteQuest}
                    onStartTracking={onStartTracking}
                    onStopTracking={onStopTracking}
                  />
                </motion.div>
              );
            }

            return null;
          })}
        </AnimatePresence>

        {/* Empty state */}
        {timeline.length === 0 && todaysQuests.length === 0 && (
          <div className="text-center py-20 text-gray-600 font-mono text-sm border-2 border-dashed border-gray-800 rounded-lg bg-black/20">
            NO ACTIVE PROTOCOLS. INITIATE QUEST.
          </div>
        )}

        {/* Show more/less toggle */}
        {timeline.length > 6 && (
          <button
            onClick={() => setShowFullDay(!showFullDay)}
            className="w-full flex items-center justify-center gap-1 py-2 mt-1 text-[9px] font-mono text-gray-600 hover:text-gray-400 transition-colors"
          >
            {showFullDay ? (
              <><ChevronUp className="w-3 h-3" /> Show Less</>
            ) : (
              <><ChevronDown className="w-3 h-3" /> Show Full Day ({timeline.length} items)</>
            )}
          </button>
        )}

        {timeline.length > 0 && (
          <div className="flex justify-center mt-4">
            <div className="text-[10px] text-gray-700 font-mono flex items-center gap-2">
              <Skull size={12} /> END OF LINE
            </div>
          </div>
        )}
      </div>

      {/* ── GOALS SECTION ── */}
      {((activeGoals.length > 0) || (completedGoals.length > 0)) && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Target className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[10px] font-black font-mono tracking-[0.2em] text-gray-400 uppercase">
                Active Goals
              </span>
              {activeGoals.length > 0 && (
                <span className="text-[9px] font-mono text-gray-600">({activeGoals.length})</span>
              )}
            </div>
            {activeGoals.length < 3 && (
              <button
                onClick={() => setShowGoalCreate(true)}
                className="text-[9px] font-bold text-cyan-400 font-mono uppercase tracking-wider"
              >
                + New Goal
              </button>
            )}
          </div>

          {activeGoals.map(goal => (
            <GoalCard key={goal.id} goal={goal} onTap={(g) => setSelectedGoal(g)} />
          ))}

          {completedGoals.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-3 h-3 text-amber-400" />
                <span className="text-[9px] font-mono text-gray-600 uppercase tracking-wider">Completed</span>
              </div>
              {completedGoals.map(goal => (
                <GoalCard key={goal.id} goal={goal} onTap={(g) => setSelectedGoal(g)} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty goals + CTA */}
      {activeGoals.length === 0 && completedGoals.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 px-6">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ background: 'rgba(34,211,238,0.06)' }}>
            <Target className="w-5 h-5 text-cyan-500" />
          </div>
          <h3 className="text-xs font-bold text-white mb-1">No Active Goals</h3>
          <p className="text-[9px] text-gray-500 font-mono text-center mb-4 max-w-[220px]">
            Set a long-term goal and AI will create daily quests in your timeline.
          </p>
          <button
            onClick={() => setShowGoalCreate(true)}
            className="px-5 py-2.5 rounded-xl text-[10px] font-black text-black uppercase tracking-wider"
            style={{ background: 'linear-gradient(135deg, #22d3ee, #06b6d4)' }}
          >
            Create Shadow Mission
          </button>
        </div>
      )}

      {/* Spacing for nav */}
      <div className="h-20" />

      {/* ── Goal Creation Flow ── */}
      <AnimatePresence>
        {showGoalCreate && (
          <GoalCreationFlow
            playerData={playerData}
            existingGoals={goals || []}
            onClose={() => setShowGoalCreate(false)}
            onGoalCreated={handleGoalCreated}
            onConsumeMana={onConsumeMana}
            onRefundMana={onRefundMana}
          />
        )}
      </AnimatePresence>

      {/* ── Quest Creation Modal (identical to QuestsView) ── */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/90 backdrop-blur-sm overflow-hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="w-full max-w-lg md:max-w-xl rounded-t-2xl md:rounded-2xl overflow-hidden max-h-[94vh] md:max-h-[85vh] md:m-6 relative flex flex-col"
              style={{ background: '#08081a', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 -8px 40px rgba(0,0,0,0.6), 0 0 80px rgba(0,210,255,0.03)' }}
            >
              {/* Modal header */}
              <div className="px-5 pt-5 pb-3 flex justify-between items-center z-10 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,210,255,0.08)', border: '1px solid rgba(0,210,255,0.2)' }}>
                    <ShieldCheck size={13} className="text-cyan-400" />
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
                    <span className="text-[9px] font-mono" style={{ color: title.trim().split(/\s+/).filter(w=>w.length>0).length >= 2 ? 'rgba(0,210,255,0.4)' : 'rgba(156,163,175,0.4)' }}>
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
                    isAnalyzing ? 'text-cyan-500 cursor-wait' : hasWords ? 'text-cyan-400 hover:bg-cyan-500/8' : 'text-gray-600 cursor-not-allowed'
                  }`}
                  style={{
                    background: isAnalyzing ? 'rgba(0,210,255,0.06)' : hasWords ? 'rgba(0,210,255,0.04)' : 'rgba(255,255,255,0.02)',
                    border: isAnalyzing ? '1px solid rgba(0,210,255,0.3)' : hasWords ? '1px solid rgba(0,210,255,0.15)' : '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  {isAnalyzing ? <><Loader2 size={14} className="animate-spin" /> ANALYZING...</> : <><BrainCircuit size={14} /> ANALYZE QUEST <span className="text-[9px] opacity-60 ml-1">({15 + analysisCount * 5} MANA)</span></>}
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
                              intelligence: { icon: <Brain size={11} />,    color: '#818cf8', bg: 'rgba(129,140,248,0.1)' },
                              discipline:   { icon: <Shield size={11} />,   color: '#c084fc', bg: 'rgba(192,132,252,0.1)' },
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
                        <Clock size={12} className={scheduleReady ? 'text-cyan-400' : 'text-gray-500'} />
                        <span className="text-[10px] font-black uppercase tracking-widest font-mono text-gray-400">Schedule</span>
                        {!scheduleReady && <span className="text-[9px] text-amber-500/70 font-mono ml-auto">REQUIRED</span>}
                        {scheduleReady && autoScheduled && <span className="text-[9px] text-cyan-400/60 font-mono ml-auto">AUTO-DETECTED</span>}
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
                        style={{ background: isDaily ? 'rgba(0,210,255,0.04)' : 'rgba(255,255,255,0.02)', border: isDaily ? '1px solid rgba(0,210,255,0.15)' : '1px solid rgba(255,255,255,0.05)' }}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${isDaily ? 'bg-cyan-500 border-cyan-500' : 'bg-transparent border-gray-700'}`}>
                          {isDaily && <Repeat size={9} className="text-black" />}
                        </div>
                        <div className="text-left">
                          <p className={`text-[10px] font-black uppercase tracking-widest font-mono ${isDaily ? 'text-cyan-400' : 'text-gray-500'}`}>Repeat Daily</p>
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
                    boxShadow: (!forgeResult || !scheduleReady) ? 'none' : '0 0 20px rgba(0,210,255,0.2)',
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
