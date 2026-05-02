import React from 'react';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';

interface LevelProgressCardProps {
  level: number;
  currentXP: number;
  maxXP: number;
  xpBuff?: number;
}

const LevelProgressCard: React.FC<LevelProgressCardProps> = ({ level, currentXP, maxXP, xpBuff = 0 }) => {
  const fillPercent = Math.min(100, (currentXP / Math.max(1, maxXP)) * 100);
  const xpRemaining = Math.max(0, maxXP - currentXP);

  return (
    <div
      className="premium-card rounded-2xl p-4"
      style={{
        background: 'linear-gradient(160deg, rgba(12,12,24,0.95) 0%, rgba(10,10,20,0.9) 40%, rgba(14,14,28,0.95) 100%)',
        border: '1px solid rgba(0,212,255,0.15)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 30px rgba(0,212,255,0.06), inset 0 1px 0 rgba(255,255,255,0.03)',
      }}
    >
      {/* Top row: level labels */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-heading font-extrabold text-white"
            style={{ 
              background: 'linear-gradient(135deg, #7c3aed, #00d4ff)',
              boxShadow: '0 0 12px rgba(0,212,255,0.3)',
            }}
          >
            {level}
          </div>
          <div>
            <div className="text-[9px] font-medium text-gray-500 uppercase tracking-widest">CURRENT</div>
            <div className="text-sm font-heading font-extrabold text-white">LVL {level}</div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Zap size={10} className="text-[#00d4ff]" />
          <span className="text-[10px] text-gray-400">
            <span className="text-white font-bold font-mono">{currentXP.toLocaleString()}</span>
            <span className="text-gray-600"> / {maxXP.toLocaleString()} XP</span>
          </span>
          {xpBuff > 0 && (
            <span
              className="text-[9px] font-bold px-1.5 py-0.5 rounded-full animate-pulse"
              style={{
                background: 'rgba(34,197,94,0.15)',
                border: '1px solid rgba(34,197,94,0.3)',
                color: '#4ade80',
                textShadow: '0 0 6px rgba(34,197,94,0.5)',
              }}
            >
              +{xpBuff}% BUFF
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div>
            <div className="text-[9px] font-medium text-gray-500 uppercase tracking-widest text-right">NEXT</div>
            <div className="text-sm font-heading font-extrabold text-gradient-purple">LVL {level + 1}</div>
          </div>
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-heading font-extrabold text-white/30"
            style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)' }}
          >
            {level + 1}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative h-3 bg-white/[0.03] rounded-full overflow-hidden border border-white/[0.04]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${fillPercent}%` }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          className="absolute top-0 left-0 h-full rounded-full"
          style={{
            background: 'linear-gradient(90deg, #7c3aed 0%, #00d4ff 40%, #00d4ff 100%)',
            boxShadow: '0 0 12px rgba(0,212,255,0.5), 0 0 4px rgba(0,212,255,0.3)',
          }}
        >
          <div className="absolute right-0 top-0 bottom-0 w-3 bg-white/40 blur-[3px] rounded-full" />
        </motion.div>

        {/* Percentage label */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="font-mono text-[8px] font-bold text-white/50 mix-blend-overlay">
            {fillPercent.toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Bottom: XP remaining */}
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[9px] text-gray-600">
          <span className="font-mono font-bold text-gray-500">{xpRemaining.toLocaleString()}</span> XP to next level
        </span>
        <div className="flex items-center gap-1">
          <div className="w-1 h-1 rounded-full bg-[#00d4ff] animate-pulse" />
          <span className="text-[9px] text-gray-600">
            {xpBuff > 0 ? `RADAR BUFF +${xpBuff}% ACTIVE` : 'EXP ACCUMULATING'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default LevelProgressCard;
