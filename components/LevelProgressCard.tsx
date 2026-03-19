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
      className="rounded-2xl p-4"
      style={{
        background: 'rgba(15,15,26,0.9)',
        border: '1px solid rgba(139,92,246,0.2)',
        boxShadow: '0 0 20px rgba(139,92,246,0.08)',
      }}
    >
      {/* Top row: level labels */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black text-white"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)' }}
          >
            {level}
          </div>
          <div>
            <div className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">CURRENT</div>
            <div className="text-xs font-black text-white">LVL {level}</div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Zap size={10} className="text-[#00d2ff]" />
          <span className="font-mono text-[10px] text-gray-400">
            <span className="text-white font-bold">{currentXP.toLocaleString()}</span>
            <span className="text-gray-600"> / {maxXP.toLocaleString()} XP</span>
          </span>
          {xpBuff > 0 && (
            <span
              className="font-mono text-[9px] font-black px-1.5 py-0.5 rounded-full animate-pulse"
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
            <div className="text-[9px] font-mono text-gray-500 uppercase tracking-widest text-right">NEXT</div>
            <div className="text-xs font-black text-[#8b5cf6]">LVL {level + 1}</div>
          </div>
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black text-white/40"
            style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)' }}
          >
            {level + 1}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative h-3 bg-white/5 rounded-full overflow-hidden border border-white/[0.06]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${fillPercent}%` }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          className="absolute top-0 left-0 h-full rounded-full"
          style={{
            background: 'linear-gradient(90deg, #8b5cf6, #7c3aed 50%, #00d2ff)',
            boxShadow: '0 0 10px rgba(139,92,246,0.6)',
          }}
        >
          <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/50 blur-[2px] rounded-full" />
        </motion.div>

        {/* Percentage label */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="font-mono text-[8px] font-black text-white/60 mix-blend-overlay">
            {fillPercent.toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Bottom: XP remaining */}
      <div className="mt-2 flex items-center justify-between">
        <span className="font-mono text-[9px] text-gray-600">
          {xpRemaining.toLocaleString()} XP to next level
        </span>
        <div className="flex items-center gap-1">
          <div className="w-1 h-1 rounded-full bg-[#8b5cf6] animate-pulse" />
          <span className="font-mono text-[9px] text-gray-600">
            {xpBuff > 0 ? `RADAR BUFF +${xpBuff}% ACTIVE` : 'EXP ACCUMULATING'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default LevelProgressCard;
