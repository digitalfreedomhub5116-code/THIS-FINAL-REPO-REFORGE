import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer
} from 'recharts';
import { CoreStats } from '../types';

type ViewMode = 'DAILY' | 'WEEKLY' | 'MONTHLY';

interface StatsLineChartProps {
  dailyXp: number;
  dailyStats: CoreStats;
  yesterdayStats?: CoreStats;
  weeklyStats: CoreStats;
  monthlyStats: CoreStats;
  playerLevel: number;
  rank: string;
}

const MAX_POINTS: Record<ViewMode, number> = {
  DAILY: 5,
  WEEKLY: 70,
  MONTHLY: 300
};

const STAT_LABELS = [
  { key: 'strength' as keyof CoreStats, label: 'Strength' },
  { key: 'intelligence' as keyof CoreStats, label: 'Intelligence' },
  { key: 'social' as keyof CoreStats, label: 'Social' },
  { key: 'discipline' as keyof CoreStats, label: 'Discipline' },
];

// Custom dot with glow effect
const GlowDot = (props: { cx?: number; cy?: number; payload?: { primary: number } }) => {
  const { cx = 0, cy = 0, payload } = props;
  if (!payload || payload.primary === 0) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={8} fill="#00d2ff" fillOpacity={0.15} />
      <circle cx={cx} cy={cy} r={5} fill="#00d2ff" fillOpacity={0.3} />
      <circle cx={cx} cy={cy} r={3} fill="#00d2ff" />
      <circle cx={cx} cy={cy} r={2} fill="white" />
    </g>
  );
};

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string }>; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-black/95 border border-[#00d2ff]/40 rounded-xl p-3 shadow-[0_0_20px_rgba(0,210,255,0.15)]">
        <p className="text-[#00d2ff] font-mono text-[10px] font-bold tracking-widest mb-1 uppercase">{label}</p>
        {payload.map((p) => (
          <div key={p.name} className="flex items-center gap-2">
            <span className="text-white font-mono text-lg font-black">{Math.round(p.value)}</span>
            <span className="text-gray-500 text-[10px] font-mono">PTS</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const StatsLineChart: React.FC<StatsLineChartProps> = ({
  dailyXp, dailyStats, yesterdayStats, weeklyStats, monthlyStats, playerLevel
}) => {
  const [mode, setMode] = useState<ViewMode>('DAILY');

  const currentStats = mode === 'DAILY' ? dailyStats : mode === 'WEEKLY' ? weeklyStats : monthlyStats;
  const maxY = MAX_POINTS[mode];

  const prevStats = mode === 'DAILY' ? yesterdayStats : undefined;

  const chartData = useMemo(() => STAT_LABELS.map(({ key, label }) => ({
    name: label,
    primary: Math.min(currentStats[key] || 0, maxY),
    previous: prevStats ? Math.min(prevStats[key] || 0, maxY) : Math.min((currentStats[key] || 0) * 0.7, maxY),
  })), [currentStats, prevStats, maxY]);

  const totalPoints = STAT_LABELS.reduce((sum, { key }) => sum + (currentStats[key] || 0), 0);
  const prevTotalPoints = prevStats
    ? STAT_LABELS.reduce((sum, { key }) => sum + (prevStats[key] || 0), 0)
    : Math.round(totalPoints * 0.88);
  const prevTotal = prevTotalPoints;
  const changePercent = prevTotal > 0 ? ((totalPoints - prevTotal) / prevTotal * 100).toFixed(1) : '0.0';

  return (
    <div className="w-full">
      {/* Top status bar */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-[#00d2ff] rounded-full animate-pulse" />
            <span className="text-[#00d2ff] font-mono text-[10px] font-bold tracking-widest">SYSTEM ONLINE</span>
          </div>
        </div>
      </div>

      {/* Main chart card */}
      <div className="bg-[#0a0a0f] border border-white/[0.06] rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.6)]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">

          {/* Mode Toggle Buttons — left */}
          <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/[0.06]">
            {(['DAILY', 'WEEKLY', 'MONTHLY'] as ViewMode[]).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`relative px-3 py-1.5 rounded-lg font-mono text-[10px] font-bold tracking-widest transition-all duration-300 ${
                  mode === m
                    ? 'text-[#00d2ff] shadow-[0_0_15px_rgba(0,210,255,0.3)]'
                    : 'text-gray-600 hover:text-gray-400'
                }`}
              >
                {mode === m && (
                  <motion.div
                    layoutId="mode-bg"
                    className="absolute inset-0 bg-[#00d2ff]/10 border border-[#00d2ff]/30 rounded-lg"
                    transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                  />
                )}
                <span className="relative z-10">{m.charAt(0) + m.slice(1).toLowerCase()}</span>
              </button>
            ))}
          </div>

          {/* Total pts — right */}
          <div className="text-right">
            <p className="text-gray-600 font-mono text-[9px] tracking-[0.15em] uppercase leading-none mb-1">
              {mode === 'DAILY' ? "Today's" : mode === 'WEEKLY' ? "This Week's" : "This Month's"} total pts
            </p>
            <div className="flex items-baseline gap-1.5 justify-end">
              <span className="text-white font-mono text-2xl font-black leading-none">{totalPoints}</span>
              <span className={`font-mono text-[10px] font-bold ${parseFloat(changePercent) >= 0 ? 'text-[#00d2ff]' : 'text-red-400'}`}>
                {parseFloat(changePercent) >= 0 ? '+' : ''}{parseFloat(changePercent).toFixed(1)}%
              </span>
            </div>
          </div>

        </div>

        {/* LIVE SYNC indicator */}
        <div className="flex items-center gap-1.5 px-4 pb-3">
          <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
          <span className="text-green-400 font-mono text-[9px] tracking-widest font-bold">LIVE SYNC</span>
        </div>

        {/* Chart */}
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="px-2 pb-4"
          >
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="neonGlow" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#00d2ff" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="#00d2ff" stopOpacity={1} />
                  </linearGradient>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.04)"
                  horizontal={true}
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'monospace' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  domain={[0, maxY]}
                  tick={{ fill: '#6b7280', fontSize: 9, fontFamily: 'monospace' }}
                  tickLine={false}
                  axisLine={false}
                  tickCount={5}
                />
                <Tooltip content={<CustomTooltip />} />
                {/* Reference line at max */}
                <ReferenceLine
                  y={maxY}
                  stroke="rgba(0,210,255,0.1)"
                  strokeDasharray="4 4"
                />
                {/* Previous period - dashed grey */}
                <Line
                  type="monotone"
                  dataKey="previous"
                  stroke="rgba(255,255,255,0.15)"
                  strokeWidth={1.5}
                  strokeDasharray="5 5"
                  dot={false}
                  name="Previous"
                />
                {/* Current period - neon teal */}
                <Line
                  type="monotone"
                  dataKey="primary"
                  stroke="url(#neonGlow)"
                  strokeWidth={2.5}
                  filter="url(#glow)"
                  dot={<GlowDot />}
                  activeDot={{ r: 6, fill: '#00d2ff', stroke: 'white', strokeWidth: 2 }}
                  name="Current"
                />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Daily XP badge */}
      <div className="flex items-center justify-center mt-3 gap-2">
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#8b5cf6]/10 border border-[#8b5cf6]/20">
          <div className="w-1.5 h-1.5 bg-[#8b5cf6] rounded-full animate-pulse" />
          <span className="text-[#8b5cf6] font-mono text-[10px] font-bold tracking-widest">{dailyXp.toLocaleString()} XP TODAY</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/[0.04] border border-white/[0.06]">
          <span className="text-gray-400 font-mono text-[10px] tracking-wide">LVL {playerLevel}</span>
        </div>
      </div>
    </div>
  );
};

export default StatsLineChart;
