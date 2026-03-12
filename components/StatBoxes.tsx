import React from 'react';
import { motion } from 'framer-motion';
import { Dumbbell, Brain, Users, Shield } from 'lucide-react';
import { CoreStats } from '../types';

interface StatBoxesProps {
  stats: CoreStats;
  dailyStats: CoreStats;
  weeklyStats: CoreStats;
}

interface StatConfig {
  key: keyof CoreStats;
  label: string;
  fullLabel: string;
  icon: React.ReactNode;
  color: string;
  barColor: string;
  accentRgb: string;
  maxDaily: number;
}

const STAT_CONFIG: StatConfig[] = [
  {
    key: 'strength',
    label: 'STR',
    fullLabel: 'STRENGTH',
    icon: <Dumbbell size={14} />,
    color: 'text-stat-str',
    barColor: 'bg-stat-str',
    accentRgb: '249,112,102',
    maxDaily: 50
  },
  {
    key: 'intelligence',
    label: 'INT',
    fullLabel: 'INTELLIGENCE',
    icon: <Brain size={14} />,
    color: 'text-stat-int',
    barColor: 'bg-stat-int',
    accentRgb: '129,140,248',
    maxDaily: 50
  },
  {
    key: 'social',
    label: 'SOC',
    fullLabel: 'SOCIAL',
    icon: <Users size={14} />,
    color: 'text-stat-soc',
    barColor: 'bg-stat-soc',
    accentRgb: '251,191,36',
    maxDaily: 50
  },
  {
    key: 'discipline',
    label: 'DIS',
    fullLabel: 'DISCIPLINE',
    icon: <Shield size={14} />,
    color: 'text-stat-dis',
    barColor: 'bg-stat-dis',
    accentRgb: '192,132,252',
    maxDaily: 50
  }
];

const StatBoxes: React.FC<StatBoxesProps> = ({ stats, dailyStats }) => {
  return (
    <div className="grid grid-cols-2 gap-3">
      {STAT_CONFIG.map((config, i) => {
        const total = Math.floor(stats[config.key] || 0);
        const daily = dailyStats[config.key] || 0;
        const barWidth = Math.min(100, (daily / config.maxDaily) * 100);

        return (
          <motion.div
            key={config.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.4, ease: 'easeOut' }}
            className="relative overflow-hidden rounded-2xl p-4 group hover:scale-[1.015] transition-transform duration-300"
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(8,8,20,0.80) 12%, rgba(4,4,14,0.90) 100%)',
              backdropFilter: 'blur(24px) saturate(180%)',
              WebkitBackdropFilter: 'blur(24px) saturate(180%)',
              borderTop: '1px solid rgba(255,255,255,0.12)',
              borderLeft: '1px solid rgba(255,255,255,0.07)',
              borderRight: '1px solid rgba(255,255,255,0.04)',
              borderBottom: '1px solid rgba(255,255,255,0.03)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07), inset 0 -1px 0 rgba(0,0,0,0.3), 0 8px 28px rgba(0,0,0,0.45)',
            }}
          >
            {/* Specular top-edge */}
            <div className="absolute top-0 left-3 right-3 h-px pointer-events-none" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)' }} />
            {/* Per-stat accent wash */}
            <div className="absolute inset-0 pointer-events-none rounded-2xl" style={{ background: `linear-gradient(135deg, rgba(${config.accentRgb},0.07) 0%, transparent 60%)` }} />
            {/* Top color bar */}
            <div className={`absolute top-0 left-0 right-0 h-[2px] ${config.barColor} opacity-60 rounded-t-2xl`} />

            {/* Label row */}
            <div className={`flex items-center gap-1.5 mb-3 ${config.color}`}>
              {config.icon}
              <span className="font-mono text-[10px] font-bold tracking-[0.18em]">
                {config.fullLabel}
              </span>
            </div>

            {/* Big value */}
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-white font-mono text-3xl font-black leading-none tracking-tight">{total}</span>
              <span className="text-gray-600 font-mono text-[9px] font-bold tracking-widest">PTS</span>
            </div>

            {/* Today's gain — only if active */}
            <div className="mb-3 h-4">
              {daily > 0 ? (
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-mono font-bold ${config.color}`}>+{Math.round(daily)}</span>
                  <span className="text-gray-600 text-[9px] font-mono">today</span>
                </div>
              ) : (
                <span className="text-gray-700 text-[9px] font-mono tracking-wide">No activity</span>
              )}
            </div>

            {/* Progress bar */}
            <div className="h-[3px] bg-white/[0.05] rounded-full overflow-hidden">
              <motion.div
                className={`h-full ${config.barColor} rounded-full`}
                style={{ boxShadow: `0 0 6px rgba(${config.accentRgb},0.6)` }}
                initial={{ width: 0 }}
                animate={{ width: `${barWidth}%` }}
                transition={{ delay: i * 0.08 + 0.3, duration: 0.8, ease: 'easeOut' }}
              />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default StatBoxes;
