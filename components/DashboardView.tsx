import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Zap,
  Clock,
  Target,
  Flame,
  TrendingUp,
  Plus,
  Utensils,
  Dumbbell,
  BookOpen,
  ChevronRight,
  Check,
  Moon,
  Coffee,
  GraduationCap,
  Circle,
  Sparkles,
  Calendar,
} from 'lucide-react';
import { PlayerData, Tab, ScheduleSlot, Quest, Goal } from '../types';
import ForgeGuardWidget from './ForgeGuardWidget';

interface DashboardViewProps {
  player: PlayerData;
  onNavigate: (tab: Tab) => void;
  onOpenDuskChat: () => void;
  onOpenDailyCalendar?: () => void;
  onAddQuest?: () => void;
  onOpenJournal?: () => void;
}

// ── utilities ────────────────────────────────────────────────
const timeToMinutes = (t: string): number => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};
const addMins = (t: string, mins: number): string => {
  const total = timeToMinutes(t) + mins;
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};
const formatTime12h = (t: string): string => {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
};
const getGreeting = (): string => {
  const h = new Date().getHours();
  if (h < 5) return 'Still awake';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Good night';
};
const formatDate = (): string => {
  const d = new Date();
  return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
};

const SLOT_ICONS: Record<string, React.ReactNode> = {
  SLEEP: <Moon size={14} />,
  ROUTINE: <Coffee size={14} />,
  BLOCKED: <GraduationCap size={14} />,
  WORKOUT: <Dumbbell size={14} />,
  QUEST: <Target size={14} />,
  MEAL: <Utensils size={14} />,
  FREE: <Sparkles size={14} />,
};
const SLOT_COLORS: Record<string, string> = {
  SLEEP: '#818cf8',
  ROUTINE: '#fb923c',
  BLOCKED: '#9ca3af',
  WORKOUT: '#f87171',
  QUEST: '#22d3ee',
  MEAL: '#4ade80',
  FREE: '#c084fc',
};

// ── Greeting Strip ───────────────────────────────────────────
const GreetingStrip: React.FC<{ player: PlayerData }> = ({ player }) => {
  const name = player.name?.split(' ')[0] || player.username || 'Hunter';
  return (
    <div className="flex items-end justify-between mb-1">
      <div>
        <div className="text-[11px] font-mono tracking-widest text-gray-500 uppercase">{formatDate()}</div>
        <div className="text-2xl font-bold text-white leading-tight">
          {getGreeting()}, <span className="text-system-neon">{name}</span>
        </div>
        <div className="flex items-center gap-2 mt-1 text-[11px] font-mono text-gray-400">
          <span>Lv.{player.level}</span>
          <span className="text-gray-700">·</span>
          <span>{player.rank}-Rank</span>
          {player.streak > 0 && (
            <>
              <span className="text-gray-700">·</span>
              <span className="flex items-center gap-1 text-orange-400">
                <Flame size={11} className="fill-orange-500" /> {player.streak}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ── System Mana Bar (AI feature currency) ────────────────────
const ManaBar: React.FC<{ player: PlayerData }> = ({ player }) => {
  const mana = player.mp ?? 100;
  const maxMana = player.maxMp ?? 100;
  const pct = maxMana > 0 ? Math.max(0, Math.min(100, (mana / maxMana) * 100)) : 0;
  const color = pct > 75 ? '#00d2ff' : pct > 50 ? '#eab308' : pct > 10 ? '#f97316' : '#ef4444';
  const glow = pct > 75 ? 'rgba(0,210,255,0.3)' : pct > 50 ? 'rgba(234,179,8,0.25)' : pct > 10 ? 'rgba(249,115,22,0.3)' : 'rgba(239,68,68,0.4)';
  const isCritical = pct > 0 && pct <= 10;
  const isDepleted = pct <= 0;

  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.015] px-4 py-3">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded flex items-center justify-center"
            style={{ background: `${color}18`, border: `1px solid ${color}35` }}>
            <Zap size={10} style={{ color }} />
          </div>
          <span className="text-[9px] font-mono font-black tracking-[0.22em] text-gray-400 uppercase">System Mana</span>
        </div>
        <span className="text-[11px] font-black font-mono tabular-nums" style={{ color }}>
          {Math.floor(mana)} / {maxMana}
        </span>
      </div>
      <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: color, boxShadow: `0 0 8px ${glow}` }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
      {isDepleted ? (
        <span className="text-[9px] font-mono font-bold mt-1.5 block text-red-500 tracking-wide uppercase">
          Mana Depleted — AI features locked
        </span>
      ) : isCritical ? (
        <motion.span
          className="text-[9px] font-mono font-bold mt-1.5 block text-red-400 tracking-wide uppercase"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          Mana Critically Low
        </motion.span>
      ) : (
        <span className="text-[9px] font-mono mt-1 block text-gray-600 tracking-wide">
          Powers AI features — refills on quest completion
        </span>
      )}
    </div>
  );
};

// ── NOW Hero (current schedule slot) ─────────────────────────
const NowHero: React.FC<{
  slots: ScheduleSlot[];
  onNavigate: () => void;
}> = ({ slots, onNavigate }) => {
  const [nowMinutes, setNowMinutes] = useState(() => {
    const n = new Date();
    return n.getHours() * 60 + n.getMinutes();
  });
  useEffect(() => {
    const t = setInterval(() => {
      const n = new Date();
      setNowMinutes(n.getHours() * 60 + n.getMinutes());
    }, 30_000);
    return () => clearInterval(t);
  }, []);

  const currentSlot = useMemo(() => {
    for (const s of slots) {
      const start = timeToMinutes(s.startTime);
      const end = timeToMinutes(s.endTime);
      if (nowMinutes >= start && nowMinutes < end) return s;
    }
    return null;
  }, [slots, nowMinutes]);

  const nextSlot = useMemo(() => {
    const upcoming = slots
      .filter(s => timeToMinutes(s.startTime) > nowMinutes)
      .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
    return upcoming[0] || null;
  }, [slots, nowMinutes]);

  if (!currentSlot && !nextSlot) {
    return (
      <button
        onClick={onNavigate}
        className="w-full rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-left hover:bg-white/[0.04] transition"
      >
        <div className="flex items-center gap-2 text-xs font-mono text-gray-500">
          <Calendar size={14} /> No schedule yet — tap to set up
        </div>
      </button>
    );
  }

  const slot = currentSlot || nextSlot!;
  const isLive = !!currentSlot;
  const color = SLOT_COLORS[slot.type] || '#888';
  const startMin = timeToMinutes(slot.startTime);
  const endMin = timeToMinutes(slot.endTime);
  const remainingMin = isLive ? Math.max(0, endMin - nowMinutes) : startMin - nowMinutes;
  const durationMin = endMin - startMin;
  const progressPct = isLive && durationMin > 0 ? Math.min(100, ((nowMinutes - startMin) / durationMin) * 100) : 0;

  return (
    <motion.button
      onClick={onNavigate}
      whileTap={{ scale: 0.98 }}
      className="w-full rounded-2xl overflow-hidden text-left relative"
      style={{
        background: `linear-gradient(135deg, ${color}14 0%, rgba(6,6,18,0.95) 70%)`,
        border: `1px solid ${color}30`,
        boxShadow: isLive ? `0 0 24px ${color}26, inset 0 1px 0 rgba(255,255,255,0.05)` : 'inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      {/* Top accent */}
      <div className="h-0.5" style={{ background: `linear-gradient(90deg, ${color}99, transparent 60%)` }} />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
              <Clock size={11} style={{ color }} />
            </div>
            <span className="text-[10px] font-mono font-black tracking-[0.22em] text-gray-400 uppercase">
              {isLive ? 'Now' : 'Next Up'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {isLive && (
              <motion.div
                className="flex items-center gap-1 px-1.5 py-0.5 rounded-full"
                style={{ background: `${color}20`, border: `1px solid ${color}50` }}
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <div className="w-1 h-1 rounded-full" style={{ background: color }} />
                <span className="text-[8px] font-mono font-black tracking-wide uppercase" style={{ color }}>Live</span>
              </motion.div>
            )}
            <ChevronRight size={14} className="text-gray-600" />
          </div>
        </div>

        {/* Body */}
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${color}1a`, border: `1px solid ${color}30`, color }}>
            {SLOT_ICONS[slot.type] || <Target size={14} />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-white truncate">{slot.label}</div>
            <div className="text-[11px] font-mono text-gray-400 mt-0.5">
              {formatTime12h(slot.startTime)} — {formatTime12h(slot.endTime)}
            </div>
            <div className="text-[10px] font-mono mt-1.5" style={{ color }}>
              {isLive
                ? `${remainingMin > 60 ? `${Math.floor(remainingMin / 60)}h ${remainingMin % 60}m` : `${remainingMin}m`} remaining`
                : `Starts in ${remainingMin > 60 ? `${Math.floor(remainingMin / 60)}h ${remainingMin % 60}m` : `${remainingMin}m`}`
              }
            </div>
          </div>
        </div>

        {/* Progress bar (only when live) */}
        {isLive && (
          <div className="mt-3 h-1 rounded-full bg-white/5 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.5 }}
              style={{ background: color, boxShadow: `0 0 6px ${color}aa` }}
            />
          </div>
        )}
      </div>
    </motion.button>
  );
};

// ── Today's Quests Mini List ─────────────────────────────────
const TodaysQuestsList: React.FC<{
  quests: Quest[];
  onNavigate: () => void;
}> = ({ quests, onNavigate }) => {
  const todaysQuests = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return quests
      .filter(q => {
        const d = new Date(q.createdAt);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === today.getTime();
      })
      .sort((a, b) => {
        const ta = a.scheduledTime ? timeToMinutes(a.scheduledTime.includes('T') ? a.scheduledTime.split('T')[1].slice(0, 5) : a.scheduledTime) : 9999;
        const tb = b.scheduledTime ? timeToMinutes(b.scheduledTime.includes('T') ? b.scheduledTime.split('T')[1].slice(0, 5) : b.scheduledTime) : 9999;
        return ta - tb;
      });
  }, [quests]);

  const completed = todaysQuests.filter(q => q.isCompleted).length;
  const total = todaysQuests.length;
  const visible = todaysQuests.slice(0, 4);

  if (total === 0) {
    return (
      <button
        onClick={onNavigate}
        className="w-full rounded-2xl border border-dashed border-white/10 bg-white/[0.015] p-4 text-left hover:bg-white/[0.03] transition"
      >
        <div className="flex items-center gap-2">
          <Target size={14} className="text-cyan-400/70" />
          <span className="text-[11px] font-mono text-gray-400">No quests today — tap to add</span>
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={onNavigate}
      className="w-full rounded-2xl overflow-hidden text-left group"
      style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.18)' }}>
            <Target size={11} className="text-cyan-400" />
          </div>
          <span className="text-[10px] font-mono font-black tracking-[0.22em] text-gray-400 uppercase">Today's Quests</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold" style={{ color: completed === total ? '#4ade80' : '#22d3ee' }}>
            {completed}/{total}
          </span>
          <ChevronRight size={14} className="text-gray-600 group-hover:text-gray-400 transition" />
        </div>
      </div>
      <div className="divide-y divide-white/[0.04]">
        {visible.map(q => {
          const scheduled = q.scheduledTime
            ? (q.scheduledTime.includes('T') ? q.scheduledTime.split('T')[1].slice(0, 5) : q.scheduledTime)
            : null;
          return (
            <div key={q.id} className="flex items-center gap-3 px-4 py-2.5">
              <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                q.isCompleted ? 'bg-green-500/20 border border-green-500/40' : 'border border-white/15'
              }`}>
                {q.isCompleted && <Check size={9} className="text-green-400" strokeWidth={3} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-[12px] truncate ${q.isCompleted ? 'text-gray-500 line-through' : 'text-white/90'}`}>
                  {q.title}
                </div>
              </div>
              {scheduled && (
                <div className="text-[9px] font-mono text-gray-500 tabular-nums flex-shrink-0">
                  {formatTime12h(scheduled)}
                </div>
              )}
            </div>
          );
        })}
        {total > visible.length && (
          <div className="px-4 py-2 text-center text-[10px] font-mono text-gray-500">
            +{total - visible.length} more
          </div>
        )}
      </div>
    </button>
  );
};

// ── Active Goals Strip ───────────────────────────────────────
const ActiveGoalsStrip: React.FC<{
  goals: Goal[];
  onNavigate: () => void;
}> = ({ goals, onNavigate }) => {
  const active = useMemo(() => goals.filter(g => g.status === 'ACTIVE').slice(0, 3), [goals]);

  if (active.length === 0) return null;

  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.015] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.2)' }}>
            <Flame size={11} className="text-orange-400" />
          </div>
          <span className="text-[10px] font-mono font-black tracking-[0.22em] text-gray-400 uppercase">Active Goals</span>
        </div>
        <span className="text-[10px] font-mono font-bold text-orange-400">{active.length}</span>
      </div>
      <div className="divide-y divide-white/[0.04]">
        {active.map(g => {
          const daysElapsed = Math.max(1, Math.floor((Date.now() - g.startDate) / (1000 * 60 * 60 * 24)) + 1);
          const totalDays = g.totalDurationDays || 60;
          const currentDay = Math.min(daysElapsed, totalDays);
          const dayProgress = totalDays > 0 ? Math.min(100, (currentDay / totalDays) * 100) : 0;
          return (
            <button
              key={g.id}
              onClick={onNavigate}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.02] transition text-left"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12px] font-semibold text-white/90 truncate flex-1">{g.title}</span>
                  <span className="text-[9px] font-mono text-gray-500 ml-2 flex-shrink-0">
                    Day {currentDay}/{totalDays}
                  </span>
                </div>
                <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${dayProgress}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    style={{ background: 'linear-gradient(90deg, #fb923c, #ef4444)', boxShadow: '0 0 4px rgba(251,146,60,0.4)' }}
                  />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ── Daily XP Bar ─────────────────────────────────────────────
const DailyXPCard: React.FC<{ player: PlayerData }> = ({ player }) => {
  const earned = player.dailyXp || 0;
  // Target: scales with level — rough guide: 100 XP per level for a day
  const target = Math.max(200, player.level * 100);
  const pct = Math.min(100, (earned / target) * 100);
  const isDone = earned >= target;

  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.015] px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}>
            <TrendingUp size={11} className="text-violet-400" />
          </div>
          <span className="text-[10px] font-mono font-black tracking-[0.22em] text-gray-400 uppercase">Today's XP</span>
        </div>
        <div className="text-[11px] font-mono font-bold">
          <span className={isDone ? 'text-green-400' : 'text-violet-300'}>+{earned}</span>
          <span className="text-gray-600"> / {target}</span>
        </div>
      </div>
      <div className="h-2 rounded-full bg-white/5 overflow-hidden relative">
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          style={{
            background: isDone ? 'linear-gradient(90deg, #4ade80, #22d3ee)' : 'linear-gradient(90deg, #8b5cf6, #c084fc)',
            boxShadow: isDone ? '0 0 8px rgba(74,222,128,0.5)' : '0 0 8px rgba(139,92,246,0.4)',
          }}
        />
      </div>
    </div>
  );
};

// ── Quick Action Tile ─────────────────────────────────────────
const QuickActionTile: React.FC<{
  icon: React.ReactNode;
  label: string;
  accent: string;
  onClick?: () => void;
}> = ({ icon, label, accent, onClick }) => (
  <motion.button
    onClick={onClick}
    whileTap={{ scale: 0.95 }}
    className="relative rounded-xl overflow-hidden flex flex-col items-center justify-center py-3 gap-1.5 group"
    style={{
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.06)',
    }}
  >
    <div
      className="w-9 h-9 rounded-lg flex items-center justify-center transition-all group-hover:scale-110"
      style={{
        background: `${accent}14`,
        border: `1px solid ${accent}28`,
        color: accent,
      }}
    >
      {icon}
    </div>
    <span className="text-[9px] font-mono font-bold tracking-[0.15em] uppercase text-gray-400">{label}</span>
  </motion.button>
);

// ── Main DashboardView ───────────────────────────────────────
const DashboardView: React.FC<DashboardViewProps> = ({
  player,
  onNavigate,
  onOpenDuskChat: _onOpenDuskChat,
  onOpenDailyCalendar: _onOpenDailyCalendar,
  onAddQuest,
  onOpenJournal,
}) => {
  // Build schedule slots for NOW hero (prefer dailySchedule, fallback to profile default)
  const slots = useMemo<ScheduleSlot[]>(() => {
    const today = new Date().toISOString().split('T')[0];
    const daily = player.dailySchedules?.find(s => s.date === today);
    if (daily?.slots?.length) return daily.slots;
    return [];
  }, [player.dailySchedules]);

  return (
    <div className="space-y-3">
      <GreetingStrip player={player} />
      <ManaBar player={player} />
      <NowHero slots={slots} onNavigate={() => onNavigate('QUESTS' as Tab)} />
      <TodaysQuestsList quests={player.quests} onNavigate={() => onNavigate('QUESTS' as Tab)} />
      <ActiveGoalsStrip goals={player.goals || []} onNavigate={() => onNavigate('QUESTS' as Tab)} />
      <DailyXPCard player={player} />
      <ForgeGuardWidget cheatStrikes={player.cheatStrikes ?? 0} totalStrikesEver={player.totalStrikesEver ?? 0} />

      {/* Quick actions */}
      <div className="grid grid-cols-4 gap-2 pt-1">
        <QuickActionTile
          icon={<Utensils size={16} />}
          label="Meal"
          accent="#4ade80"
          onClick={() => onNavigate('HEALTH' as Tab)}
        />
        <QuickActionTile
          icon={<Dumbbell size={16} />}
          label="Workout"
          accent="#f87171"
          onClick={() => onNavigate('HEALTH' as Tab)}
        />
        <QuickActionTile
          icon={<BookOpen size={16} />}
          label="Journal"
          accent="#c084fc"
          onClick={onOpenJournal}
        />
        <QuickActionTile
          icon={<Plus size={16} />}
          label="Quest"
          accent="#22d3ee"
          onClick={onAddQuest || (() => onNavigate('QUESTS' as Tab))}
        />
      </div>
    </div>
  );
};

export default DashboardView;
