import React, { useMemo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronRight, Timer, Target, Coffee, Moon, Utensils,
  Dumbbell, GraduationCap, Zap, Circle, Clock
} from 'lucide-react';
import { ScheduleProfile, ScheduleSlot, DailySchedule, Quest, Goal } from '../types';

// ── Helpers ──
function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function addMins(time: string, mins: number): string {
  const total = timeToMinutes(time) + mins;
  const h = Math.floor(((total % (24 * 60)) + 24 * 60) % (24 * 60) / 60);
  const m = ((total % 60) + 60) % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatTime12(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

const SLOT_ICONS: Record<string, React.ReactNode> = {
  SLEEP: <Moon className="w-3.5 h-3.5 text-indigo-400" />,
  ROUTINE: <Coffee className="w-3.5 h-3.5 text-orange-400" />,
  BLOCKED: <GraduationCap className="w-3.5 h-3.5 text-gray-400" />,
  WORKOUT: <Dumbbell className="w-3.5 h-3.5 text-red-400" />,
  QUEST: <Target className="w-3.5 h-3.5 text-[#7EB8D4]" />,
  MEAL: <Utensils className="w-3.5 h-3.5 text-green-400" />,
  FREE: <Zap className="w-3.5 h-3.5 text-[#7EB8D4]" />,
};

const SLOT_COLORS: Record<string, string> = {
  SLEEP: '#7EB8D4', ROUTINE: '#fb923c', BLOCKED: '#6b7280',
  WORKOUT: '#f87171', QUEST: '#7EB8D4', MEAL: '#4ade80', FREE: '#9ACDE3',
};

function buildDefaultSlots(profile: ScheduleProfile): ScheduleSlot[] {
  const slots: ScheduleSlot[] = [];
  let id = 0;
  const s = (startTime: string, endTime: string, type: ScheduleSlot['type'], label: string): ScheduleSlot => ({
    id: `slot-${id++}`, startTime, endTime, type, label,
    status: 'PENDING', isFlexible: false, isCarryOver: false,
  });

  const routineEnd = addMins(profile.wakeUpTime, profile.morningRoutineMin);
  slots.push(s(profile.wakeUpTime, routineEnd, 'ROUTINE', 'Morning Routine'));

  if (profile.role === 'STUDENT') {
    if (profile.schoolStart && profile.schoolEnd) slots.push(s(profile.schoolStart, profile.schoolEnd, 'BLOCKED', 'School / College'));
    if (profile.coachingEnabled && profile.coachingStart && profile.coachingEnd) slots.push(s(profile.coachingStart, profile.coachingEnd, 'BLOCKED', 'Tuition'));
  } else if (profile.role === 'PROFESSIONAL' && profile.workStart && profile.workEnd) {
    slots.push(s(profile.workStart, profile.workEnd, 'BLOCKED', 'Work'));
  }

  slots.push(s(profile.dinnerTime, addMins(profile.dinnerTime, 30), 'MEAL', 'Dinner'));
  slots.push(s(profile.bedtime, addMins(profile.bedtime, 1), 'SLEEP', 'Lights Out'));

  slots.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  return slots;
}

interface NextUpCardProps {
  scheduleProfile?: ScheduleProfile;
  dailySchedule?: DailySchedule;
  quests: Quest[];
  goals?: Goal[];
  onNavigateToQuests: () => void;
}

export default function NextUpCard({ scheduleProfile, dailySchedule, quests, goals, onNavigateToQuests }: NextUpCardProps) {
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

  // Build items from both schedule + quests
  const items = useMemo(() => {
    const result: { time: number; label: string; type: string; icon: React.ReactNode; endTime?: number; isQuest?: boolean }[] = [];

    // Schedule slots
    const slots = dailySchedule?.slots?.length
      ? dailySchedule.slots
      : scheduleProfile ? buildDefaultSlots(scheduleProfile) : [];

    slots.forEach(slot => {
      if (slot.type === 'QUEST') return; // We show quests separately
      result.push({
        time: timeToMinutes(slot.startTime),
        endTime: timeToMinutes(slot.endTime),
        label: slot.label,
        type: slot.type,
        icon: SLOT_ICONS[slot.type] || <Circle className="w-3.5 h-3.5 text-gray-500" />,
      });
    });

    // Today's quests
    quests
      .filter(q => {
        const d = new Date(q.createdAt);
        d.setHours(0, 0, 0, 0);
        return d.toDateString() === new Date().toDateString();
      })
      .forEach(q => {
        if (!q.scheduledTime) return;
        const tStr = q.scheduledTime.includes('T') ? q.scheduledTime.split('T')[1].slice(0, 5) : q.scheduledTime;
        result.push({
          time: timeToMinutes(tStr),
          endTime: timeToMinutes(tStr) + (q.estimatedDuration || 20),
          label: q.title,
          type: 'QUEST',
          icon: <Target className="w-3.5 h-3.5 text-[#7EB8D4]" />,
          isQuest: true,
        });
      });

    result.sort((a, b) => a.time - b.time);
    return result;
  }, [dailySchedule, scheduleProfile, quests]);

  // Find current + next
  const currentIdx = useMemo(() => {
    for (let i = items.length - 1; i >= 0; i--) {
      if (items[i].time <= currentMinutes) return i;
    }
    return -1;
  }, [items, currentMinutes]);

  const currentItem = currentIdx >= 0 ? items[currentIdx] : null;
  const nextItem = currentIdx < items.length - 1 ? items[currentIdx + 1] : null;

  // Compact quest stats
  const todaysQuests = quests.filter(q => {
    const d = new Date(q.createdAt);
    d.setHours(0, 0, 0, 0);
    return d.toDateString() === new Date().toDateString();
  });
  const completedCount = todaysQuests.filter(q => q.isCompleted).length;
  const totalCount = todaysQuests.length;

  if (items.length === 0 && totalCount === 0) return null;

  const minutesUntilNext = nextItem ? nextItem.time - currentMinutes : 0;

  return (
    <motion.button
      onClick={onNavigateToQuests}
      className="w-full rounded-2xl overflow-hidden text-left transition-all active:scale-[0.98]"
      style={{
        background: 'linear-gradient(135deg, rgba(34,211,238,0.04) 0%, rgba(6,6,18,0.9) 100%)',
        border: '1px solid rgba(34,211,238,0.12)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
      }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Top accent */}
      <div className="h-0.5" style={{ background: 'linear-gradient(90deg, #7EB8D444, transparent 60%)' }} />

      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(34,211,238,0.08)' }}>
              <Clock className="w-3 h-3 text-[#7EB8D4]" />
            </div>
            <span className="text-[10px] font-black font-mono tracking-[0.2em] text-gray-400 uppercase">NEXT UP</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono text-gray-600">{completedCount}/{totalCount} quests</span>
            <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
          </div>
        </div>

        {/* Current slot */}
        {currentItem && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${SLOT_COLORS[currentItem.type] || '#6b7280'}15`, border: `1px solid ${SLOT_COLORS[currentItem.type] || '#6b7280'}25` }}
            >
              {currentItem.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <motion.div className="w-1.5 h-1.5 rounded-full bg-[#7EB8D4]"
                  animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <span className="text-[10px] font-mono text-[#7EB8D4] font-bold uppercase">Now</span>
              </div>
              <p className="text-sm font-bold text-white truncate">{currentItem.label}</p>
            </div>
          </div>
        )}

        {/* Next up */}
        {nextItem && (
          <div className="flex items-center gap-3 pt-2 border-t border-white/5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-white/[0.03]">
              {nextItem.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-gray-400 truncate">{nextItem.label}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Timer className="w-2.5 h-2.5 text-gray-600" />
                <span className="text-[9px] font-mono text-gray-600">
                  in {minutesUntilNext > 60 ? `${Math.floor(minutesUntilNext / 60)}h ${minutesUntilNext % 60}m` : `${minutesUntilNext}m`}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* No schedule items but quests exist */}
        {!currentItem && !nextItem && totalCount > 0 && (
          <div className="text-[11px] text-gray-400 font-mono">
            {completedCount === totalCount ? '✅ All quests complete!' : `${totalCount - completedCount} quests remaining`}
          </div>
        )}
      </div>
    </motion.button>
  );
}
