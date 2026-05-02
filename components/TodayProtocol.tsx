import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  ChevronDown, ChevronUp, Zap, Moon,
  Coffee, Utensils, GraduationCap,
  Dumbbell, Target, Timer,
  CheckCircle, Circle, Bell, BellOff, SkipForward,
  CalendarOff, Settings, ArrowRight, GripVertical,
  AlertTriangle
} from 'lucide-react';
import { ScheduleProfile, ScheduleSlot, DailySchedule, Goal } from '../types';
import { scheduleSlotReminder, cancelScheduleSlotReminder } from '../hooks/useLocalNotifications';

interface TodayProtocolProps {
  scheduleProfile: ScheduleProfile;
  dailySchedule?: DailySchedule;
  goals: Goal[];
  onNavigateToQuests: () => void;
  onSetupSchedule: () => void;
  onRunningLate?: () => void;
  onSlotAction?: (slotId: string, action: 'SKIP' | 'DEFER', slots: ScheduleSlot[]) => void;
  onToggleNotify?: (slotId: string, enabled: boolean, slots: ScheduleSlot[]) => void;
  onReorderSlots?: (slots: ScheduleSlot[]) => void;
}

// â”€â”€ Anti-cheat limits â”€â”€
const MAX_SKIPS_PER_DAY = 2;
const MAX_DEFERS_PER_DAY = 2;

function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function addMinutes(time: string, mins: number): string {
  return minutesToTime(timeToMinutes(time) + mins);
}

function subtractMinutes(time: string, mins: number): string {
  let total = timeToMinutes(time) - mins;
  if (total < 0) total += 24 * 60;
  return minutesToTime(total);
}

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

function buildDefaultSlots(profile: ScheduleProfile): ScheduleSlot[] {
  const slots: ScheduleSlot[] = [];
  let id = 0;
  const s = (startTime: string, endTime: string, type: ScheduleSlot['type'], label: string, flexible = false): ScheduleSlot => ({
    id: `slot-${id++}`,
    startTime,
    endTime,
    type,
    label,
    status: 'PENDING',
    isFlexible: flexible,
    isCarryOver: false,
    notifyEnabled: type === 'QUEST' || type === 'WORKOUT',
  });

  const routineEnd = addMinutes(profile.wakeUpTime, profile.morningRoutineMin);
  slots.push(s(profile.wakeUpTime, routineEnd, 'ROUTINE', 'Morning Routine'));

  const workoutDuration = 30;
  if (profile.preferredWorkoutTime === 'EARLY_MORNING' || profile.preferredWorkoutTime === 'MORNING') {
    slots.push(s(routineEnd, addMinutes(routineEnd, workoutDuration), 'WORKOUT', 'Workout Session', true));
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

  const dinnerEnd = addMinutes(profile.dinnerTime, 30);
  slots.push(s(profile.dinnerTime, dinnerEnd, 'MEAL', 'Dinner'));

  if (profile.preferredWorkoutTime === 'EVENING' || profile.preferredWorkoutTime === 'LATE_NIGHT') {
    const evStart = profile.preferredWorkoutTime === 'EVENING' ? '18:00' : '21:00';
    slots.push(s(evStart, addMinutes(evStart, workoutDuration), 'WORKOUT', 'Workout Session', true));
  } else if (profile.preferredWorkoutTime === 'AFTERNOON') {
    slots.push(s('14:00', addMinutes('14:00', workoutDuration), 'WORKOUT', 'Workout Session', true));
  }

  const windDownStart = subtractMinutes(profile.bedtime, profile.windDownMinutes);
  slots.push(s(windDownStart, profile.bedtime, 'ROUTINE', 'Wind Down'));
  // Sleep marker â€” endTime set to next-day wakeup conceptually
  slots.push(s(profile.bedtime, addMinutes(profile.bedtime, 1), 'SLEEP', 'Lights Out'));

  slots.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  return slots;
}

/**
 * After a drag reorder, recalculate times for flexible slots.
 * Fixed slots keep their times. Flexible slots fill gaps between fixed slots.
 */
function recalculateTimesAfterReorder(slots: ScheduleSlot[]): ScheduleSlot[] {
  // Separate fixed and flexible
  const fixedSlots = slots.filter(s => !s.isFlexible);
  const flexSlots = slots.filter(s => s.isFlexible);

  // Build occupied ranges from fixed slots
  const fixedRanges = fixedSlots.map(s => ({
    start: timeToMinutes(s.startTime),
    end: timeToMinutes(s.endTime),
  })).sort((a, b) => a.start - b.start);

  // Find free gaps between fixed slots
  const gaps: { start: number; end: number }[] = [];
  let cursor = 0; // Start of day
  for (const range of fixedRanges) {
    if (range.start > cursor) {
      gaps.push({ start: cursor, end: range.start });
    }
    cursor = Math.max(cursor, range.end);
  }
  if (cursor < 24 * 60) {
    gaps.push({ start: cursor, end: 24 * 60 });
  }

  // Place each flexible slot into the next available gap
  let gapIdx = 0;
  let gapCursor = gaps[0]?.start || 0;

  const result = flexSlots.map(slot => {
    const duration = timeToMinutes(slot.endTime) - timeToMinutes(slot.startTime);

    // Find a gap that fits
    while (gapIdx < gaps.length) {
      const gap = gaps[gapIdx];
      const available = gap.end - gapCursor;
      if (available >= duration) {
        const newStart = minutesToTime(gapCursor);
        const newEnd = minutesToTime(gapCursor + duration);
        gapCursor += duration + 15; // 15-min buffer between tasks
        return { ...slot, startTime: newStart, endTime: newEnd };
      }
      gapIdx++;
      gapCursor = gaps[gapIdx]?.start || 0;
    }
    // No gap found â€” keep original time
    return slot;
  });

  // Merge fixed + reassigned flexible, sort
  const all = [...fixedSlots, ...result];
  all.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  return all;
}

export default function TodayProtocol({
  scheduleProfile,
  dailySchedule,
  goals,
  onNavigateToQuests,
  onSetupSchedule,
  onRunningLate,
  onSlotAction,
  onToggleNotify,
  onReorderSlots,
}: TodayProtocolProps) {
  const [expanded, setExpanded] = useState(false);
  const [actionSlotId, setActionSlotId] = useState<string | null>(null);

  // â”€â”€ Live clock (updates every 60s) â”€â”€
  const [currentMinutes, setCurrentMinutes] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentMinutes(now.getHours() * 60 + now.getMinutes());
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = dayNames[new Date().getDay()];

  const slots = useMemo(() => {
    if (dailySchedule?.slots?.length) return dailySchedule.slots;
    return buildDefaultSlots(scheduleProfile);
  }, [dailySchedule, scheduleProfile]);

  // â”€â”€ Anti-cheat counters â”€â”€
  const skipsToday = slots.filter(s => s.status === 'SKIPPED').length;
  const defersToday = slots.filter(s => s.status === 'DEFERRED').length;
  const canSkip = skipsToday < MAX_SKIPS_PER_DAY;
  const canDefer = defersToday < MAX_DEFERS_PER_DAY;

  const questSlots = slots.filter(s => s.type === 'QUEST' || s.type === 'WORKOUT');
  const completedQuests = questSlots.filter(s => s.status === 'COMPLETED').length;
  const totalQuests = questSlots.length;
  const progress = totalQuests > 0 ? Math.round((completedQuests / totalQuests) * 100) : 0;

  // Find current slot
  const currentSlotIdx = useMemo(() => {
    const idx = slots.findIndex(s => {
      const start = timeToMinutes(s.startTime);
      const end = timeToMinutes(s.endTime);
      return currentMinutes >= start && currentMinutes < (end > start ? end : start + 30);
    });
    return idx >= 0 ? idx : 0; // FIX BUG-1: default to 0 not -1
  }, [slots, currentMinutes]);

  const activeGoals = goals.filter(g => g.status === 'ACTIVE');

  const visibleSlots = expanded ? slots : slots.slice(
    Math.max(0, currentSlotIdx - 1),
    Math.min(slots.length, currentSlotIdx + 5)
  );

  const handleToggleNotification = useCallback((slot: ScheduleSlot) => {
    const newEnabled = !slot.notifyEnabled;
    if (newEnabled) {
      scheduleSlotReminder(slot.id, slot.label, slot.startTime);
    } else {
      cancelScheduleSlotReminder(slot.id);
    }
    if (onToggleNotify) {
      const updatedSlots = slots.map(s => s.id === slot.id ? { ...s, notifyEnabled: newEnabled } : s);
      onToggleNotify(slot.id, newEnabled, updatedSlots);
    }
  }, [slots, onToggleNotify]);

  // FIX BUG-2: Remove "COMPLETE" action. Quests must be completed through
  // the normal ForgeGuard flow in QuestsView. Schedule card only tracks status.
  const handleSlotAction = useCallback((slotId: string, action: 'SKIP' | 'DEFER') => {
    // FIX BUG-3: Enforce daily limits
    if (action === 'SKIP' && !canSkip) return;
    if (action === 'DEFER' && !canDefer) return;

    if (onSlotAction) {
      const updatedSlots = slots.map(s => {
        if (s.id !== slotId) return s;
        if (action === 'SKIP') return { ...s, status: 'SKIPPED' as const };
        if (action === 'DEFER') return { ...s, status: 'DEFERRED' as const };
        return s;
      });
      onSlotAction(slotId, action, updatedSlots);
    }
    setActionSlotId(null);
  }, [slots, onSlotAction, canSkip, canDefer]);

  // â”€â”€ Drag reorder handler â”€â”€
  const handleReorder = useCallback((newOrder: ScheduleSlot[]) => {
    // Only flexible slots are reorderable, but we need to merge back with fixed
    // Recalculate times after reorder
    const recalculated = recalculateTimesAfterReorder(newOrder);
    if (onReorderSlots) {
      onReorderSlots(recalculated);
    }
  }, [onReorderSlots]);

  return (
    <motion.div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(34,211,238,0.08)',
      }}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.2)' }}
            >
              <Zap className="w-3.5 h-3.5 text-[#00d4ff]" />
            </div>
            <div>
              <h3 className="text-xs font-black text-white uppercase tracking-wider">Today's Protocol</h3>
              <p className="text-[9px] text-gray-600 font-mono">{dayName} â€¢ {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onRunningLate && (
              <button
                onClick={onRunningLate}
                className="text-[8px] font-bold font-mono text-amber-400 px-2 py-1 rounded-lg uppercase tracking-wider"
                style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.15)' }}
              >
                <Timer className="w-3 h-3 inline mr-1" />Late?
              </button>
            )}
            <button
              onClick={onSetupSchedule}
              className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
              title="Edit schedule"
            >
              <Settings className="w-3.5 h-3.5 text-gray-600" />
            </button>
            <div className="text-right">
              <div className="text-xs font-black text-[#00d4ff] font-mono">{completedQuests}/{totalQuests}</div>
              <div className="text-[8px] text-gray-600 font-mono">TASKS</div>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden mb-1">
          <motion.div
            className="h-full rounded-full"
            style={{ background: progress >= 100 ? 'linear-gradient(90deg, #4ade80, #22c55e)' : 'linear-gradient(90deg, #00d4ff88, #00d4ff)' }}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>

        {/* Anti-cheat counters */}
        <div className="flex items-center gap-3 mb-1">
          <span className="text-[8px] font-mono text-gray-700">
            Skips: {skipsToday}/{MAX_SKIPS_PER_DAY}
          </span>
          <span className="text-[8px] font-mono text-gray-700">
            Defers: {defersToday}/{MAX_DEFERS_PER_DAY}
          </span>
        </div>
      </div>

      {/* Timeline */}
      {/* Timeline — vertical layout: time above card, connected by line */}
      <div className="px-4 pb-2">
        <div className="relative">
          {/* Vertical line running down the left edge */}
          <div className="absolute left-[7px] top-3 bottom-3 w-px" style={{ background: 'rgba(255,255,255,0.06)' }} />

          {visibleSlots.map((slot, i) => {
            const slotMinutes = timeToMinutes(slot.startTime);
            const isCurrent = slots[currentSlotIdx]?.id === slot.id;
            const isPast = slotMinutes < currentMinutes && !isCurrent;
            const isCompleted = slot.status === 'COMPLETED';
            const isSkipped = slot.status === 'SKIPPED';
            const isDeferred = slot.status === 'DEFERRED';
            const slotColor = SLOT_COLORS[slot.type] || '#6b7280';
            const isInteractive = (slot.type === 'QUEST' || slot.type === 'WORKOUT') && !isCompleted && !isSkipped && !isDeferred;
            const showActions = actionSlotId === slot.id;

            return (
              <div key={slot.id} className="relative">
                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  {/* Time label row with dot */}
                  <div className="flex items-center gap-2 mb-1 mt-2">
                    <div className="relative z-10 flex-shrink-0">
                      {isCurrent ? (
                        <motion.div className="w-[15px] h-[15px] rounded-full" style={{ background: slotColor, boxShadow: `0 0 10px ${slotColor}` }} animate={{ scale: [1, 1.25, 1] }} transition={{ duration: 2, repeat: Infinity }} />
                      ) : isCompleted ? (
                        <div className="w-[15px] h-[15px] rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center"><CheckCircle className="w-2.5 h-2.5 text-emerald-500" /></div>
                      ) : isSkipped || isDeferred ? (
                        <div className="w-[15px] h-[15px] rounded-full" style={{ background: isDeferred ? 'rgba(251,191,36,0.2)' : 'rgba(239,68,68,0.2)', border: `1.5px solid ${isDeferred ? 'rgba(251,191,36,0.5)' : 'rgba(239,68,68,0.5)'}` }} />
                      ) : isPast ? (
                        <div className="w-[15px] h-[15px] rounded-full bg-gray-800 border border-gray-700" />
                      ) : (
                        <div className="w-[15px] h-[15px] rounded-full border-2 border-gray-700 bg-transparent" />
                      )}
                    </div>
                    <span className={`text-[11px] font-mono font-bold tracking-wide ${isCurrent ? 'text-[#00d4ff]' : isPast ? 'text-gray-700' : 'text-gray-500'}`}>{formatTime(slot.startTime)}</span>
                    {isCurrent && <span className="text-[7px] font-black text-[#00d4ff] px-1.5 py-0.5 rounded-full bg-[#00d4ff]/10 uppercase tracking-wider">Now</span>}
                    {isDeferred && <span className="text-[7px] font-bold text-amber-400 px-1.5 py-0.5 rounded-full bg-amber-400/10">DEFER</span>}
                    {slot.isCarryOver && <span className="text-[7px] font-bold text-amber-400 px-1.5 py-0.5 rounded-full bg-amber-400/10">CARRY</span>}
                  </div>

                  {/* Slot card */}
                  <div
                    className={`ml-[23px] rounded-xl px-3 py-2.5 transition-colors ${isInteractive ? 'cursor-pointer active:scale-[0.98]' : ''} ${showActions ? 'ring-1 ring-white/10' : ''}`}
                    style={{ background: isCurrent ? `linear-gradient(135deg, ${slotColor}12, ${slotColor}06)` : 'rgba(255,255,255,0.02)', border: `1px solid ${isCurrent ? `${slotColor}30` : 'rgba(255,255,255,0.04)'}` }}
                    onClick={() => isInteractive ? setActionSlotId(showActions ? null : slot.id) : null}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {slot.isFlexible && !isCompleted && !isSkipped && !isDeferred && expanded && <GripVertical className="w-3.5 h-3.5 text-gray-700 flex-shrink-0 cursor-grab" />}
                        <div className="flex-shrink-0">{SLOT_ICONS[slot.type]}</div>
                        <span className={`text-[12px] font-mono truncate ${isCurrent ? 'text-white font-bold' : isCompleted ? 'text-gray-500 line-through' : isSkipped ? 'text-red-400/50 line-through' : isDeferred ? 'text-amber-400/60' : isPast ? 'text-gray-600' : 'text-gray-300'}`}>{slot.label}</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {(slot.type === 'QUEST' || slot.type === 'WORKOUT') && !isCompleted && !isSkipped && !isDeferred && (
                          <button onClick={(e) => { e.stopPropagation(); handleToggleNotification(slot); }} className="p-1 rounded-md transition-colors hover:bg-white/5" title={slot.notifyEnabled ? 'Reminder ON' : 'Reminder OFF'}>
                            {slot.notifyEnabled ? <Bell className="w-3.5 h-3.5 text-[#00d4ff]/70" /> : <BellOff className="w-3.5 h-3.5 text-gray-700" />}
                          </button>
                        )}
                        {isCompleted && <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />}
                        {slot.type === 'BLOCKED' && <span className="text-[8px] text-gray-700 font-mono">locked</span>}
                      </div>
                    </div>
                  </div>

                  {/* Expanded action panel */}
                  <AnimatePresence>
                    {showActions && isInteractive && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden ml-[23px]">
                        <div className="flex items-center gap-2 py-2 px-1">
                          <button onClick={(e) => { e.stopPropagation(); onNavigateToQuests(); setActionSlotId(null); }} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-bold font-mono uppercase tracking-wider" style={{ background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.2)', color: '#00d4ff' }}><ArrowRight className="w-3 h-3" /> Go to Quest</button>
                          <button onClick={(e) => { e.stopPropagation(); handleSlotAction(slot.id, 'SKIP'); }} disabled={!canSkip} className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-bold font-mono uppercase tracking-wider ${!canSkip ? 'opacity-30 cursor-not-allowed' : ''}`} style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', color: '#f87171' }}><SkipForward className="w-3 h-3" /> Skip {!canSkip ? '(max)' : ''}</button>
                          <button onClick={(e) => { e.stopPropagation(); handleSlotAction(slot.id, 'DEFER'); }} disabled={!canDefer} className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-bold font-mono uppercase tracking-wider ${!canDefer ? 'opacity-30 cursor-not-allowed' : ''}`} style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)', color: '#fbbf24' }}><CalendarOff className="w-3 h-3" /> Tmrw {!canDefer ? '(max)' : ''}</button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>
            );
          })}
        </div>

        {/* Expand/Collapse */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-1 py-2 mt-1 text-[9px] font-mono text-gray-600 hover:text-gray-400 transition-colors"
        >
          {expanded ? (
            <><ChevronUp className="w-3 h-3" /> Show Less</>
          ) : (
            <><ChevronDown className="w-3 h-3" /> Show Full Day ({slots.length} slots)</>
          )}
        </button>
      </div>

      {/* Footer */}
      {activeGoals.length > 0 && (
        <div
          className="px-4 py-2.5 flex items-center justify-between"
          style={{ background: 'rgba(255,255,255,0.015)', borderTop: '1px solid rgba(255,255,255,0.04)' }}
        >
          <span className="text-[9px] text-gray-500 font-mono">
            {activeGoals.length} active goal{activeGoals.length > 1 ? 's' : ''} â€¢ tap quest to act
          </span>
          <button
            onClick={onNavigateToQuests}
            className="text-[9px] font-bold text-[#00d4ff] font-mono uppercase tracking-wider"
          >
            View Quests â†’
          </button>
        </div>
      )}
    </motion.div>
  );
}
