
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Dumbbell, Brain, Users, Shield, AlertTriangle, TrendingUp, TrendingDown, Flame, Zap } from 'lucide-react';
import { CoreStats, HistoryEntry, Quest } from '../types';

interface HunterGrowthTerminalProps {
  dailyXp: number;
  dailyStats: CoreStats;
  weeklyStats: CoreStats;
  history: HistoryEntry[];
  streak: number;
  playerLevel: number;
  quests: Quest[];
}

const WEEKLY_TARGET = 10;

const PILLAR_CONFIG: {
  key: keyof CoreStats;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
  color: string;
  rgb: string;
}[] = [
  { key: 'strength',     label: 'STRENGTH',     shortLabel: 'STR', icon: <Dumbbell size={12} />, color: '#f97066', rgb: '249,112,102' },
  { key: 'intelligence', label: 'INTELLIGENCE', shortLabel: 'INT', icon: <Brain size={12} />,    color: '#818cf8', rgb: '129,140,248' },
  { key: 'social',       label: 'SOCIAL',       shortLabel: 'SOC', icon: <Users size={12} />,    color: '#fbbf24', rgb: '251,191,36' },
  { key: 'discipline',   label: 'DISCIPLINE',   shortLabel: 'DIS', icon: <Shield size={12} />,   color: '#c084fc', rgb: '192,132,252' },
];

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const getWeekHeatmap = (history: HistoryEntry[], todayCompletion: number) => {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon...
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const weekDays: { date: string; questCompletion: number; isToday: boolean; isFuture: boolean }[] = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + mondayOffset + i);
    const dateStr = d.toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];
    const isFuture = dateStr > todayStr;
    const isToday = dateStr === todayStr;

    const entry = history.find(h => h.date === dateStr);

    weekDays.push({
      date: dateStr,
      questCompletion: isToday ? todayCompletion : (entry?.questCompletion ?? 0),
      isToday,
      isFuture,
    });
  }
  return weekDays;
};

const getHeatColor = (completion: number, isFuture: boolean, isToday: boolean) => {
  if (isFuture) return { bg: 'rgba(255,255,255,0.02)', border: 'rgba(255,255,255,0.04)', glow: 'none' };
  if (isToday && completion === 0) return { bg: 'rgba(0,210,255,0.08)', border: 'rgba(0,210,255,0.3)', glow: 'none' };
  if (completion === 0) return { bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.06)', glow: 'none' };
  if (completion <= 2) return { bg: 'rgba(0,210,255,0.15)', border: 'rgba(0,210,255,0.3)', glow: '0 0 8px rgba(0,210,255,0.15)' };
  if (completion <= 4) return { bg: 'rgba(0,210,255,0.3)', border: 'rgba(0,210,255,0.5)', glow: '0 0 12px rgba(0,210,255,0.25)' };
  return { bg: 'rgba(234,179,8,0.3)', border: 'rgba(234,179,8,0.6)', glow: '0 0 14px rgba(234,179,8,0.3)' };
};

// Simple SVG sparkline
const XpSparkline: React.FC<{ data: number[] }> = ({ data }) => {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const w = 120;
  const h = 32;
  const pad = 2;

  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = h - pad - (v / max) * (h - pad * 2);
    return `${x},${y}`;
  });

  const lastPt = points[points.length - 1].split(',');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="spark-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00d2ff" stopOpacity={0.3} />
          <stop offset="100%" stopColor="#00d2ff" stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon
        points={`${pad},${h - pad} ${points.join(' ')} ${w - pad},${h - pad}`}
        fill="url(#spark-area)"
      />
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke="#00d2ff"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={parseFloat(lastPt[0])}
        cy={parseFloat(lastPt[1])}
        r="2.5"
        fill="#00d2ff"
      />
    </svg>
  );
};

const HunterGrowthTerminal: React.FC<HunterGrowthTerminalProps> = ({
  dailyXp, dailyStats, weeklyStats, history, streak, playerLevel, quests,
}) => {
  // Today's completed quest count (live)
  const todayCompleted = useMemo(() => quests.filter(q => q.isCompleted).length, [quests]);

  const weekHeatmap = useMemo(() => getWeekHeatmap(history, todayCompleted), [history, todayCompleted]);

  // XP sparkline: last 7 history entries + today
  const sparkData = useMemo(() => {
    const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date)).slice(-6);
    const vals = sorted.map(h => h.dailyXp);
    vals.push(dailyXp); // today (live)
    return vals;
  }, [history, dailyXp]);

  // Yesterday's XP for comparison
  const yesterdayXp = useMemo(() => {
    const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
    return sorted.length > 0 ? sorted[sorted.length - 1].dailyXp : 0;
  }, [history]);
  const xpChange = yesterdayXp > 0 ? ((dailyXp - yesterdayXp) / yesterdayXp * 100) : 0;

  // Weakest pillar this week
  const weakest = useMemo(() => {
    let min = Infinity;
    let weakKey: keyof CoreStats = 'strength';
    for (const p of PILLAR_CONFIG) {
      const val = weeklyStats[p.key] || 0;
      if (val < min) {
        min = val;
        weakKey = p.key;
      }
    }
    return { config: PILLAR_CONFIG.find(p => p.key === weakKey)!, val: min };
  }, [weeklyStats]);

  // Total weekly points
  const totalWeeklyPts = PILLAR_CONFIG.reduce((sum, p) => sum + (weeklyStats[p.key] || 0), 0);

  // Active days this week
  const activeDays = weekHeatmap.filter(d => !d.isFuture && d.questCompletion > 0).length;
  const totalPastDays = weekHeatmap.filter(d => !d.isFuture).length;

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-[#00d2ff] rounded-full animate-pulse" />
          <span className="text-[#00d2ff] font-mono text-[10px] font-bold tracking-widest">GROWTH TERMINAL</span>
        </div>
        {streak > 0 && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full" style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.2)' }}>
            <Flame size={10} className="text-yellow-400" />
            <span className="text-yellow-400 font-mono text-[10px] font-bold">{streak}-DAY</span>
          </div>
        )}
      </div>

      {/* Main card */}
      <div className="bg-[#0a0a0f] border border-white/[0.06] rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.6)]">

        {/* ── SECTION 1: Weekly Heatmap ── */}
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-gray-500 uppercase">This Week</span>
            <span className="text-[10px] font-mono text-gray-600">
              {activeDays}/{totalPastDays} active
            </span>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {weekHeatmap.map((day, i) => {
              const colors = getHeatColor(day.questCompletion, day.isFuture, day.isToday);
              return (
                <motion.div
                  key={day.date}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04, duration: 0.3 }}
                  className="flex flex-col items-center gap-1"
                >
                  <div
                    className={`w-full aspect-square rounded-lg flex items-center justify-center relative ${day.isToday ? 'ring-1 ring-[#00d2ff]/40' : ''}`}
                    style={{ background: colors.bg, border: `1px solid ${colors.border}`, boxShadow: colors.glow }}
                  >
                    {day.questCompletion > 0 && !day.isFuture && (
                      <span className="text-[11px] font-mono font-black text-white/80">{day.questCompletion}</span>
                    )}
                    {day.isToday && day.questCompletion === 0 && (
                      <div className="w-1.5 h-1.5 rounded-full bg-[#00d2ff]/50" />
                    )}
                  </div>
                  <span className={`text-[8px] font-mono font-bold tracking-wider ${day.isToday ? 'text-[#00d2ff]' : 'text-gray-600'}`}>
                    {DAY_LABELS[i]}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="h-px mx-4" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }} />

        {/* ── SECTION 2: Weakest Pillar Callout ── */}
        {weakest.val < WEEKLY_TARGET && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="mx-4 mt-3 mb-1 px-3 py-2 rounded-xl flex items-center gap-2.5"
            style={{
              background: `rgba(${weakest.config.rgb},0.06)`,
              border: `1px solid rgba(${weakest.config.rgb},0.15)`,
            }}
          >
            <AlertTriangle size={13} style={{ color: weakest.config.color }} className="flex-shrink-0" />
            <span className="text-[10px] font-mono font-bold text-gray-300">
              <span style={{ color: weakest.config.color }}>{weakest.config.label}</span> needs work — {Math.floor(weakest.val)}/{WEEKLY_TARGET} this week
            </span>
          </motion.div>
        )}

        {/* ── SECTION 3: Pillar Progress Bars (each out of 10) ── */}
        <div className="px-4 py-3 space-y-2.5">
          {PILLAR_CONFIG.map((pillar, i) => {
            const val = weeklyStats[pillar.key] || 0;
            const todayVal = dailyStats[pillar.key] || 0;
            const pct = Math.min(100, (val / WEEKLY_TARGET) * 100);
            const isComplete = val >= WEEKLY_TARGET;

            return (
              <motion.div
                key={pillar.key}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.06 }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex items-center gap-1.5 w-[70px]" style={{ color: pillar.color }}>
                    {pillar.icon}
                    <span className="text-[10px] font-mono font-bold tracking-wider">{pillar.shortLabel}</span>
                  </div>
                  <div className="flex-1 h-[6px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{
                        background: isComplete
                          ? `linear-gradient(90deg, ${pillar.color}, ${pillar.color}cc)`
                          : `linear-gradient(90deg, ${pillar.color}aa, ${pillar.color}66)`,
                        boxShadow: isComplete ? `0 0 8px rgba(${pillar.rgb},0.5)` : 'none',
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ delay: 0.3 + i * 0.08, duration: 0.6, ease: 'easeOut' }}
                    />
                  </div>
                  <div className="flex items-center gap-1.5 min-w-[65px] justify-end">
                    <span className={`text-[10px] font-mono font-bold ${isComplete ? 'text-green-400' : 'text-gray-400'}`}>
                      {Math.floor(val)}/{WEEKLY_TARGET}
                    </span>
                    {todayVal > 0 && (
                      <span className="text-[9px] font-mono font-bold" style={{ color: pillar.color }}>+{Math.round(todayVal)}</span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Divider */}
        <div className="h-px mx-4" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }} />

        {/* ── SECTION 4: XP Trend + Stats ── */}
        <div className="px-4 py-3 flex items-center gap-4">
          {/* Sparkline */}
          <div className="w-[120px] h-[32px] flex-shrink-0">
            <XpSparkline data={sparkData.length > 1 ? sparkData : [0, dailyXp]} />
          </div>

          {/* XP info */}
          <div className="flex-1 flex items-center justify-between">
            <div>
              <div className="flex items-baseline gap-1.5">
                <Zap size={10} className="text-[#8b5cf6]" />
                <span className="text-white font-mono text-lg font-black leading-none">{dailyXp.toLocaleString()}</span>
                <span className="text-gray-600 font-mono text-[9px] font-bold">XP</span>
              </div>
              <div className="flex items-center gap-1 mt-1">
                {xpChange !== 0 ? (
                  <>
                    {xpChange > 0 ? (
                      <TrendingUp size={10} className="text-[#00d2ff]" />
                    ) : (
                      <TrendingDown size={10} className="text-red-400" />
                    )}
                    <span className={`text-[9px] font-mono font-bold ${xpChange > 0 ? 'text-[#00d2ff]' : 'text-red-400'}`}>
                      {xpChange > 0 ? '+' : ''}{xpChange.toFixed(0)}% vs yesterday
                    </span>
                  </>
                ) : (
                  <span className="text-[9px] font-mono text-gray-600">today&apos;s progress</span>
                )}
              </div>
            </div>

            <div className="text-right">
              <div className="text-gray-500 font-mono text-[9px] tracking-wider">WEEKLY</div>
              <div className="text-white font-mono text-sm font-black">{Math.floor(totalWeeklyPts)} <span className="text-gray-600 text-[9px]">PTS</span></div>
            </div>
          </div>
        </div>

        {/* Bottom accent */}
        <div className="h-[2px]" style={{ background: 'linear-gradient(90deg, #f9706630, #818cf830, #fbbf2430, #c084fc30)' }} />
      </div>

      {/* Level badge */}
      <div className="flex items-center justify-center mt-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06]">
          <span className="text-gray-400 font-mono text-[10px] tracking-wide">LVL {playerLevel}</span>
        </div>
      </div>
    </div>
  );
};

export default HunterGrowthTerminal;
