import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dumbbell, Brain, Users, Shield, AlertTriangle, TrendingUp, TrendingDown, Flame, Zap, Target, Activity, Calendar
} from 'lucide-react';
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

const DAILY_TARGET = 10;

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

const getWeekHeatmap = (history: HistoryEntry[], todayCompletion: number, todayXp: number) => {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon...
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const weekDays: { date: string; questCompletion: number; xp: number; isToday: boolean; isFuture: boolean }[] = [];

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
      xp: isToday ? todayXp : (entry?.dailyXp ?? 0),
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

// Animated, dynamic SVG sparkline
const XpSparkline: React.FC<{ data: number[] }> = ({ data }) => {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 120;
  const h = 32;
  const pad = 4;

  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    // Add dynamic variation and ensure there is always a visible chart difference
    const normalizedV = (v - min) / range;
    const y = h - pad - normalizedV * (h - pad * 2);
    return { x, y, v };
  });

  const pathD = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`;
  const areaD = `${pathD} L ${w - pad},${h - pad} L ${pad},${h - pad} Z`;
  const lastPt = points[points.length - 1];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full overflow-visible">
      <defs>
        <linearGradient id="spark-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00d2ff" stopOpacity={0.4} />
          <stop offset="100%" stopColor="#00d2ff" stopOpacity={0} />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      <motion.path
        d={areaD}
        fill="url(#spark-area)"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      />
      
      <motion.path
        d={pathD}
        fill="none"
        stroke="#00d2ff"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#glow)"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
      />
      
      {/* Data points */}
      {points.map((p, i) => (
        <motion.circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={i === points.length - 1 ? "2.5" : "1.5"}
          fill={i === points.length - 1 ? "#fff" : "#00d2ff"}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: i === points.length - 1 ? 1 : 0.5 }}
          transition={{ delay: 1 + (i * 0.1) }}
        />
      ))}
      
      {/* Pulse on last point */}
      <motion.circle
        cx={lastPt.x}
        cy={lastPt.y}
        r="4"
        fill="none"
        stroke="#00d2ff"
        strokeWidth="1"
        initial={{ scale: 0.5, opacity: 1 }}
        animate={{ scale: 2.5, opacity: 0 }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
    </svg>
  );
};

const HunterGrowthTerminal: React.FC<HunterGrowthTerminalProps> = ({
  dailyXp, dailyStats, weeklyStats, history, streak, playerLevel, quests,
}) => {
  // Heatmap interactive state
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Today's completed quest count (live)
  const todayCompleted = useMemo(() => quests.filter(q => q.isCompleted).length, [quests]);

  const weekHeatmap = useMemo(() => getWeekHeatmap(history, todayCompleted, dailyXp), [history, todayCompleted, dailyXp]);

  // XP sparkline: last 7 history entries + today
  const sparkData = useMemo(() => {
    const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date)).slice(-6);
    const vals = sorted.map(h => h.dailyXp);
    vals.push(dailyXp); // today (live)
    return vals;
  }, [history, dailyXp]);

  const yesterdayXp = useMemo(() => {
    const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
    return sorted.length > 0 ? sorted[sorted.length - 1].dailyXp : 0;
  }, [history]);
  const xpChange = yesterdayXp > 0 ? ((dailyXp - yesterdayXp) / yesterdayXp * 100) : 0;

  // Weakest pillar today
  const weakest = useMemo(() => {
    let min = Infinity;
    let weakKey: keyof CoreStats = 'strength';
    for (const p of PILLAR_CONFIG) {
      const val = dailyStats[p.key] || 0;
      if (val < min) {
        min = val;
        weakKey = p.key;
      }
    }
    return { config: PILLAR_CONFIG.find(p => p.key === weakKey)!, val: min };
  }, [dailyStats]);

  // Total weekly points
  const totalWeeklyPts = PILLAR_CONFIG.reduce((sum, p) => sum + (weeklyStats[p.key] || 0), 0);

  const activeDays = weekHeatmap.filter(d => !d.isFuture && d.questCompletion > 0).length;
  const totalPastDays = weekHeatmap.filter(d => !d.isFuture).length;

  const selectedDayData = selectedDate ? weekHeatmap.find(d => d.date === selectedDate) : null;

  return (
    <div className="w-full relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-1 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-[#00d2ff] rounded-full animate-pulse shadow-[0_0_8px_#00d2ff]" />
          <span className="text-[#00d2ff] font-mono text-[10px] font-black tracking-widest text-shadow-neon">GROWTH TERMINAL</span>
        </div>
        {streak > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/30 backdrop-blur-md shadow-[0_0_15px_rgba(234,179,8,0.15)]">
            <Flame size={10} className="text-yellow-400" />
            <span className="text-yellow-400 font-mono text-[10px] font-black">{streak}-DAY</span>
          </div>
        )}
      </div>

      {/* Main card - Liquid Glass Effect */}
      <div 
        className="rounded-2xl overflow-hidden relative"
        style={{
          background: 'linear-gradient(145deg, rgba(20,20,30,0.6) 0%, rgba(10,10,15,0.8) 100%)',
          backdropFilter: 'blur(16px) saturate(180%)',
          WebkitBackdropFilter: 'blur(16px) saturate(180%)',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          borderLeft: '1px solid rgba(255,255,255,0.05)',
          borderRight: '1px solid rgba(255,255,255,0.02)',
          borderBottom: '1px solid rgba(255,255,255,0.02)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), 0 20px 40px rgba(0,0,0,0.5)',
        }}
      >
        {/* Glow orb behind container */}
        <div className="absolute top-0 left-1/4 w-32 h-32 bg-[#00d2ff]/10 rounded-full blur-[40px] pointer-events-none" />

        {/* ── SECTION 1: Weekly Heatmap ── */}
        <div className="px-4 pt-4 pb-3 relative z-10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-gray-400 uppercase">This Week</span>
            <span className="text-[10px] font-mono text-[#00d2ff]">
              {activeDays}/{totalPastDays} <span className="text-gray-500">active</span>
            </span>
          </div>

          <div className="grid grid-cols-7 gap-1.5 relative">
            {weekHeatmap.map((day, i) => {
              const colors = getHeatColor(day.questCompletion, day.isFuture, day.isToday);
              const isSelected = selectedDate === day.date;
              return (
                <motion.button
                  key={day.date}
                  onClick={() => !day.isFuture && setSelectedDate(isSelected ? null : day.date)}
                  disabled={day.isFuture}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: isSelected ? 1.05 : 1 }}
                  transition={{ delay: i * 0.04, duration: 0.3 }}
                  className={`flex flex-col items-center gap-1 ${!day.isFuture ? 'cursor-pointer hover:scale-105 transition-transform' : 'cursor-not-allowed opacity-50'}`}
                >
                  <div
                    className={`w-full aspect-square rounded-lg flex items-center justify-center relative transition-all duration-300 ${day.isToday ? 'ring-1 ring-[#00d2ff]/50' : ''} ${isSelected ? 'ring-2 ring-white/40 shadow-[0_0_20px_rgba(255,255,255,0.2)]' : ''}`}
                    style={{ 
                      background: colors.bg, 
                      border: `1px solid ${isSelected ? 'rgba(255,255,255,0.4)' : colors.border}`, 
                      boxShadow: isSelected ? '0 0 15px rgba(255,255,255,0.1)' : colors.glow,
                      backdropFilter: 'blur(4px)'
                    }}
                  >
                    {day.questCompletion > 0 && !day.isFuture && (
                      <span className="text-[11px] font-mono font-black text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">{day.questCompletion}</span>
                    )}
                    {day.isToday && day.questCompletion === 0 && (
                      <div className="w-1.5 h-1.5 rounded-full bg-[#00d2ff] shadow-[0_0_8px_#00d2ff]" />
                    )}
                  </div>
                  <span className={`text-[8px] font-mono font-bold tracking-wider ${day.isToday ? 'text-[#00d2ff]' : isSelected ? 'text-white' : 'text-gray-500'}`}>
                    {DAY_LABELS[i]}
                  </span>
                </motion.button>
              );
            })}
            
            {/* Expanded Heatmap Info */}
            <AnimatePresence>
              {selectedDayData && (
                <motion.div
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  className="col-span-7 overflow-hidden"
                >
                  <div className="mt-2 p-3 rounded-xl bg-black/40 border border-white/10 backdrop-blur-md flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col">
                        <span className="text-[9px] text-gray-500 font-mono tracking-widest uppercase">
                          {new Date(selectedDayData.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                        </span>
                        <span className="text-white font-mono text-xs font-black">
                          {selectedDayData.questCompletion} <span className="text-gray-400 font-normal">Quests</span>
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-mono font-bold text-[#00d2ff]">
                        +{Math.floor(selectedDayData.xp)} XP
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px mx-4" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)' }} />

        {/* ── SECTION 2: Weakest Pillar Callout ── */}
        {weakest.val < DAILY_TARGET && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="mx-4 mt-3 mb-1 px-3 py-2 rounded-xl flex items-center gap-2.5 backdrop-blur-md"
            style={{
              background: `linear-gradient(90deg, rgba(${weakest.config.rgb},0.1) 0%, rgba(${weakest.config.rgb},0.02) 100%)`,
              border: `1px solid rgba(${weakest.config.rgb},0.2)`,
              boxShadow: `inset 0 1px 0 rgba(255,255,255,0.05), 0 4px 12px rgba(0,0,0,0.2)`
            }}
          >
            <AlertTriangle size={13} style={{ color: weakest.config.color }} className="flex-shrink-0 drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]" />
            <span className="text-[10px] font-mono font-bold text-gray-300">
              <span style={{ color: weakest.config.color, textShadow: `0 0 10px rgba(${weakest.config.rgb}, 0.5)` }}>{weakest.config.label}</span> needs work — {Math.floor(weakest.val)}/{DAILY_TARGET} today
            </span>
          </motion.div>
        )}

        {/* ── SECTION 3: Pillar Progress Bars (each out of 10) ── */}
        <div className="px-4 py-3 space-y-2.5 relative z-10">
          {PILLAR_CONFIG.map((pillar, i) => {
            const val = dailyStats[pillar.key] || 0;
            const pct = Math.min(100, (val / DAILY_TARGET) * 100);
            const isComplete = val >= DAILY_TARGET;

            return (
              <motion.div
                key={pillar.key}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.06 }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex items-center gap-1.5 w-[70px]" style={{ color: pillar.color, textShadow: `0 0 10px rgba(${pillar.rgb}, 0.5)` }}>
                    {pillar.icon}
                    <span className="text-[10px] font-mono font-black tracking-wider">{pillar.shortLabel}</span>
                  </div>
                  <div className="flex-1 h-[8px] rounded-full overflow-hidden relative bg-black/40 border border-white/5 shadow-inner backdrop-blur-sm">
                    {/* Glass reflection on track */}
                    <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
                    
                    <motion.div
                      className="h-full rounded-full relative overflow-hidden"
                      style={{
                        background: isComplete
                          ? `linear-gradient(90deg, ${pillar.color}, ${pillar.color}cc)`
                          : `linear-gradient(90deg, ${pillar.color}aa, ${pillar.color}88)`,
                        boxShadow: isComplete ? `0 0 12px rgba(${pillar.rgb},0.6)` : 'none',
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ delay: 0.3 + i * 0.08, duration: 0.8, type: 'spring', bounce: 0.4 }}
                    >
                      {/* Glass highlight on progress bar */}
                      <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent" />
                    </motion.div>
                  </div>
                  <div className="flex items-center gap-1.5 min-w-[35px] justify-end">
                    <span className={`text-[10px] font-mono font-black ${isComplete ? 'text-white' : 'text-gray-400'}`} style={isComplete ? {textShadow: `0 0 8px rgba(${pillar.rgb}, 0.8)`} : {}}>
                      {Math.floor(val)}<span className="text-[8px] text-gray-500 font-normal">/{DAILY_TARGET}</span>
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Divider */}
        <div className="h-px mx-4" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)' }} />

        {/* ── SECTION 4: XP Trend + Stats ── */}
        <div className="px-4 py-4 flex flex-col sm:flex-row sm:items-center gap-4 relative z-10">
          {/* Sparkline Container with Glass border */}
          <div className="w-full sm:w-[140px] h-[40px] flex-shrink-0 bg-black/20 rounded-lg border border-white/5 p-1 relative overflow-hidden backdrop-blur-md">
            <XpSparkline data={sparkData.length > 1 ? sparkData : [0, dailyXp]} />
            <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.02] to-transparent pointer-events-none" />
          </div>

          {/* XP info */}
          <div className="flex-1 flex justify-between items-center bg-black/20 rounded-lg border border-white/5 p-2 backdrop-blur-sm">
            <div>
              <div className="flex items-center gap-1.5 text-white font-mono text-[10px] font-black drop-shadow-[0_0_8px_rgba(0,210,255,0.5)]">
                <Activity size={11} className="text-system-neon" /> TODAY
              </div>
              <div className="text-[10px] text-gray-400 font-mono mt-0.5 font-bold">
                <span className={xpChange >= 0 ? "text-green-400" : "text-red-400"}>
                  {xpChange >= 0 ? '+' : ''}{xpChange.toFixed(0)}%
                </span> vs yday
              </div>
            </div>

            <div className="text-right border-l border-white/10 pl-3">
              <div className="flex items-center gap-1 text-gray-500 font-mono text-[9px] tracking-wider justify-end">
                <Calendar size={9} /> WEEKLY
              </div>
              <div className="text-white font-mono text-sm font-black drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                {Math.floor(totalWeeklyPts)} <span className="text-gray-500 text-[9px] font-normal">PTS</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom liquid accent */}
        <div className="h-[3px] relative z-20" style={{ background: 'linear-gradient(90deg, #f97066, #818cf8, #fbbf24, #c084fc)', boxShadow: '0 -2px 10px rgba(192,132,252,0.4)' }} />
      </div>

      {/* Level badge (Floating glass element) */}
      <div className="flex items-center justify-center mt-[-10px] relative z-30">
        <motion.div 
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, type: 'spring' }}
          className="flex items-center gap-2 px-4 py-1.5 rounded-full backdrop-blur-xl shadow-[0_4px_15px_rgba(0,0,0,0.5)]"
          style={{
            background: 'linear-gradient(180deg, rgba(30,30,40,0.8) 0%, rgba(15,15,20,0.9) 100%)',
            borderTop: '1px solid rgba(255,255,255,0.15)',
            borderBottom: '1px solid rgba(0,0,0,0.8)',
            borderLeft: '1px solid rgba(255,255,255,0.05)',
            borderRight: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <span className="text-[#00d2ff] font-mono text-[10px] font-black tracking-widest drop-shadow-[0_0_5px_rgba(0,210,255,0.5)]">
            LEVEL {playerLevel}
          </span>
        </motion.div>
      </div>
    </div>
  );
};

export default HunterGrowthTerminal;
