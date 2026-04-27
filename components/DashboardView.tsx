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
  SLEEP: '#7EB8D4',
  ROUTINE: '#fb923c',
  BLOCKED: '#9ca3af',
  WORKOUT: '#f87171',
  QUEST: '#7EB8D4',
  MEAL: '#4ade80',
  FREE: '#9ACDE3',
};

// ── Greeting Strip (simplified — Lv/Rank/Streak is in header) ─
const GreetingStrip: React.FC<{ player: PlayerData }> = ({ player }) => {
  const name = player.name?.split(' ')[0] || player.username || 'Hunter';
  return (
    <div className="mb-0.5">
      <div className="text-[10px] font-mono tracking-[0.2em] text-gray-500 uppercase">{formatDate()}</div>
      <div className="text-2xl font-bold text-white leading-tight">
        {getGreeting()}, <span className="text-system-neon">{name}</span>
      </div>
    </div>
  );
};

// ── System Mana Bar (compact — no card chrome) ─────────────
const ManaBar: React.FC<{ player: PlayerData }> = ({ player }) => {
  const mana = player.mp ?? 100;
  const maxMana = player.maxMp ?? 100;
  const pct = maxMana > 0 ? Math.max(0, Math.min(100, (mana / maxMana) * 100)) : 0;
  const color = pct > 75 ? '#7EB8D4' : pct > 50 ? '#eab308' : pct > 10 ? '#f97316' : '#ef4444';
  const glow = pct > 75 ? 'rgba(126,184,212,0.3)' : pct > 50 ? 'rgba(234,179,8,0.25)' : pct > 10 ? 'rgba(249,115,22,0.3)' : 'rgba(239,68,68,0.4)';
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <Zap size={10} style={{ color }} />
          <span className="text-[9px] font-mono font-bold tracking-wider text-gray-500 uppercase">Mana</span>
        </div>
        <span className="text-[10px] font-bold font-mono tabular-nums" style={{ color }}>{Math.floor(mana)}/{maxMana}</span>
      </div>
      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <motion.div className="h-full rounded-full" style={{ background: color, boxShadow: `0 0 6px ${glow}` }}
          initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: 'easeOut' }} />
      </div>
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
      <button onClick={onNavigate}
        className="w-full rounded-xl p-3 text-left hover:bg-white/[0.03] transition"
        style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2 text-[10px] font-mono text-gray-500">
          <Calendar size={12} /> No schedule yet — tap to set up
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
  const timeStr = remainingMin > 60 ? `${Math.floor(remainingMin / 60)}h ${remainingMin % 60}m` : `${remainingMin}m`;

  return (
    <motion.button onClick={onNavigate} whileTap={{ scale: 0.98 }}
      className="w-full rounded-xl overflow-hidden text-left relative"
      style={{ background: `linear-gradient(135deg, ${color}0a 0%, rgba(6,6,18,0.95) 70%)`, border: `1px solid ${color}20` }}>
      <div className="h-px" style={{ background: `linear-gradient(90deg, ${color}70, transparent 50%)` }} />
      <div className="px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Clock size={10} style={{ color }} />
            <span className="text-[9px] font-mono font-bold tracking-wider text-gray-500 uppercase">
              {isLive ? 'Now' : 'Next Up'}
            </span>
          </div>
          <span className="text-[12px] font-bold text-white truncate flex-1">{slot.label}</span>
          <ChevronRight size={12} className="text-gray-600 flex-shrink-0" />
        </div>
        <div className="flex items-center gap-2 mt-1 pl-5">
          <span className="text-[10px] font-mono text-gray-500">
            {formatTime12h(slot.startTime)} — {formatTime12h(slot.endTime)}
          </span>
          <span className="text-[9px] font-mono font-bold" style={{ color }}>
            {isLive ? `${timeStr} left` : `in ${timeStr}`}
          </span>
          {isLive && (
            <motion.div className="w-1 h-1 rounded-full ml-auto flex-shrink-0" style={{ background: color }}
              animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }} />
          )}
        </div>
        {isLive && (
          <div className="mt-1.5 h-1 rounded-full bg-white/5 overflow-hidden">
            <motion.div className="h-full rounded-full" animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.5 }} style={{ background: color, boxShadow: `0 0 4px ${color}80` }} />
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
      <button onClick={onNavigate}
        className="w-full rounded-xl p-3 text-left hover:bg-white/[0.03] transition"
        style={{ border: '1px dashed rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-gray-500">
          <Target size={10} className="text-[#7EB8D4]/50" /> No quests today — tap to add
        </div>
      </button>
    );
  }

  return (
    <button onClick={onNavigate} className="w-full text-left group">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <Target size={10} className="text-[#7EB8D4]" />
          <span className="text-[9px] font-mono font-bold tracking-wider text-gray-500 uppercase">Quests</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-mono font-bold" style={{ color: completed === total ? '#4ade80' : '#7EB8D4' }}>
            {completed}/{total}
          </span>
          <ChevronRight size={10} className="text-gray-600 group-hover:text-gray-400 transition" />
        </div>
      </div>
      <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.05)' }}>
        {visible.map(q => {
          const scheduled = q.scheduledTime
            ? (q.scheduledTime.includes('T') ? q.scheduledTime.split('T')[1].slice(0, 5) : q.scheduledTime)
            : null;
          return (
            <div key={q.id} className="flex items-center gap-2.5 px-3 py-2 border-b border-white/[0.03] last:border-b-0">
              <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 ${
                q.isCompleted ? 'bg-green-500/20' : 'border border-white/15'
              }`}>
                {q.isCompleted && <Check size={8} className="text-green-400" strokeWidth={3} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-[11px] truncate ${q.isCompleted ? 'text-gray-500 line-through' : 'text-white/80'}`}>
                  {q.title}
                </div>
              </div>
              {scheduled && (
                <div className="text-[8px] font-mono text-gray-600 tabular-nums flex-shrink-0">
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

// ── Active Goals Strip (compact, no card chrome) ───────────
const ActiveGoalsStrip: React.FC<{
  goals: Goal[];
  onNavigate: () => void;
}> = ({ goals, onNavigate }) => {
  const active = useMemo(() => goals.filter(g => g.status === 'ACTIVE').slice(0, 3), [goals]);
  if (active.length === 0) return null;
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Flame size={10} className="text-orange-400" />
        <span className="text-[9px] font-mono font-bold tracking-wider text-gray-500 uppercase">Goals</span>
        <span className="text-[8px] font-mono text-orange-400/60 ml-auto">{active.length} active</span>
      </div>
      <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.05)' }}>
        {active.map(g => {
          const daysElapsed = Math.max(1, Math.floor((Date.now() - g.startDate) / (1000 * 60 * 60 * 24)) + 1);
          const totalDays = g.totalDurationDays || 60;
          const currentDay = Math.min(daysElapsed, totalDays);
          const dayProgress = totalDays > 0 ? Math.min(100, (currentDay / totalDays) * 100) : 0;
          return (
            <button key={g.id} onClick={onNavigate}
              className="w-full flex items-center gap-2.5 px-3 py-2 border-b border-white/[0.03] last:border-b-0 hover:bg-white/[0.02] transition text-left">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-white/80 truncate flex-1">{g.title}</span>
                  <span className="text-[8px] font-mono text-gray-600 ml-2 flex-shrink-0">Day {currentDay}/{totalDays}</span>
                </div>
                <div className="h-1 rounded-full bg-white/5 overflow-hidden mt-1">
                  <motion.div className="h-full rounded-full" initial={{ width: 0 }}
                    animate={{ width: `${dayProgress}%` }} transition={{ duration: 0.8, ease: 'easeOut' }}
                    style={{ background: 'linear-gradient(90deg, #fb923c, #ef4444)', boxShadow: '0 0 3px rgba(251,146,60,0.3)' }} />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ── XP + Level Bar (total XP, shows level) ───────────────────
const DailyXPCard: React.FC<{ player: PlayerData }> = ({ player }) => {
  const totalXp = player.totalXp || 0;
  const level = player.level || 1;
  const currentXp = player.currentXp || 0;
  const xpForNext = player.requiredXp || (level * 100);
  const pct = xpForNext > 0 ? Math.min(100, (currentXp / xpForNext) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <TrendingUp size={10} className="text-[#7EB8D4]" />
          <span className="text-[9px] font-mono font-bold tracking-wider text-gray-500 uppercase">Lv.{level}</span>
        </div>
        <span className="text-[10px] font-bold font-mono tabular-nums text-[#9ACDE3]">{totalXp.toLocaleString()} XP</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <motion.div className="h-full rounded-full"
          initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, ease: 'easeOut' }}
          style={{ background: 'linear-gradient(90deg, #7EB8D4, #9ACDE3)', boxShadow: '0 0 6px rgba(126,184,212,0.4)' }} />
      </div>
      <div className="text-[8px] font-mono text-gray-600 mt-0.5 text-right">{currentXp}/{xpForNext} to Lv.{level + 1}</div>
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
  <motion.button onClick={onClick} whileTap={{ scale: 0.95 }}
    className="relative rounded-lg overflow-hidden flex flex-col items-center justify-center py-2 gap-1 group"
    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
    <div className="w-7 h-7 rounded-md flex items-center justify-center transition-all group-hover:scale-110"
      style={{ background: `${accent}12`, border: `1px solid ${accent}22`, color: accent }}>
      {icon}
    </div>
    <span className="text-[8px] font-mono font-bold tracking-wider uppercase text-gray-500">{label}</span>
  </motion.button>
);

// ── Onboarding CTA (replaces multiple empty states for new users) ─
const OnboardingHero: React.FC<{ onNavigate: () => void; onAddQuest?: () => void }> = ({ onNavigate, onAddQuest }) => (
  <div
    className="rounded-2xl p-5 text-center"
    style={{
      background: 'linear-gradient(135deg, rgba(126,184,212,0.06) 0%, rgba(126,184,212,0.04) 100%)',
      border: '1px solid rgba(126,184,212,0.12)',
    }}
  >
    <div className="w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center"
      style={{ background: 'rgba(126,184,212,0.1)', border: '1px solid rgba(126,184,212,0.2)' }}>
      <Target size={18} className="text-[#7EB8D4]" />
    </div>
    <div className="text-sm font-bold text-white mb-1">Set Up Your Day</div>
    <div className="text-[11px] text-gray-400 mb-4 leading-relaxed">
      Add goals and quests to start tracking your progress.
    </div>
    <div className="flex items-center gap-2 justify-center">
      <button
        onClick={onNavigate}
        className="px-4 py-2 rounded-lg text-[11px] font-mono font-bold tracking-wide"
        style={{ background: 'rgba(126,184,212,0.12)', border: '1px solid rgba(126,184,212,0.3)', color: '#7EB8D4' }}
      >
        Set Goals
      </button>
      <button
        onClick={onAddQuest || onNavigate}
        className="px-4 py-2 rounded-lg text-[11px] font-mono font-bold tracking-wide"
        style={{ background: 'rgba(126,184,212,0.1)', border: '1px solid rgba(126,184,212,0.25)', color: '#9ACDE3' }}
      >
        Add Quest
      </button>
    </div>
  </div>
);

// ── Combined Stats Row (Mana + XP in single card) ───────────
const CombinedStatsRow: React.FC<{ player: PlayerData }> = ({ player }) => (
  <div className="rounded-xl px-3.5 py-3 space-y-2.5"
    style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.05)' }}>
    <ManaBar player={player} />
    <div className="border-t border-white/[0.04]" />
    <DailyXPCard player={player} />
  </div>
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
  // Build schedule slots for NOW hero
  const slots = useMemo<ScheduleSlot[]>(() => {
    const today = new Date().toISOString().split('T')[0];
    const daily = player.dailySchedules?.find(s => s.date === today);
    if (daily?.slots?.length) return daily.slots;
    return [];
  }, [player.dailySchedules]);

  // Check if user has any content
  const todaysQuests = player.quests.filter(q => {
    const d = new Date(q.createdAt);
    d.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  });
  const hasGoals = (player.goals || []).some(g => g.status === 'ACTIVE');
  const hasSchedule = slots.length > 0;
  const hasContent = todaysQuests.length > 0 || hasGoals || hasSchedule;
  const strikes = player.cheatStrikes ?? 0;

  return (
    <div className="space-y-3">
      {/* 1. Greeting */}
      <GreetingStrip player={player} />

      {/* 2. Quick Actions (moved UP — most actionable) */}
      <div className="grid grid-cols-4 gap-2">
        <QuickActionTile icon={<Utensils size={16} />} label="Meal" accent="#4ade80" onClick={() => onNavigate('HEALTH' as Tab)} />
        <QuickActionTile icon={<Dumbbell size={16} />} label="Workout" accent="#f87171" onClick={() => onNavigate('HEALTH' as Tab)} />
        <QuickActionTile icon={<BookOpen size={16} />} label="Journal" accent="#9ACDE3" onClick={onOpenJournal} />
        <QuickActionTile icon={<Plus size={16} />} label="Quest" accent="#7EB8D4" onClick={onAddQuest || (() => onNavigate('QUESTS' as Tab))} />
      </div>

      {/* 3. Show onboarding hero OR real content */}
      {!hasContent ? (
        <OnboardingHero onNavigate={() => onNavigate('QUESTS' as Tab)} onAddQuest={onAddQuest} />
      ) : (
        <>
          {/* 4. Now/Next schedule slot */}
          <NowHero slots={slots} onNavigate={() => onNavigate('QUESTS' as Tab)} />

          {/* 5. Today's Quests */}
          <TodaysQuestsList quests={player.quests} onNavigate={() => onNavigate('QUESTS' as Tab)} />
        </>
      )}

      {/* 6. Mana + XP side-by-side */}
      <CombinedStatsRow player={player} />

      {/* 7. Active Goals (only if any) */}
      <ActiveGoalsStrip goals={player.goals || []} onNavigate={() => onNavigate('QUESTS' as Tab)} />

      {/* 8. ForgeGuard — hidden if clean, compact if 1-2 strikes, full if 3+ */}
      <ForgeGuardWidget
        cheatStrikes={strikes}
        totalStrikesEver={player.totalStrikesEver ?? 0}
        hideIfClean
        compact={strikes < 3}
      />
    </div>
  );
};

export default DashboardView;
