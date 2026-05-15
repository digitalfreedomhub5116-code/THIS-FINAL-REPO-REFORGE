/**
 * FormCoachSummary.tsx — Post-set form report card shown during REST phase.
 * Displays form score, rep-by-rep breakdown, violations, and XP bonus.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Zap, Trophy } from 'lucide-react';
import type { FormCoachState } from '../utils/poseEngine';

interface FormCoachSummaryProps {
  setNumber: number;
  state: FormCoachState;
  targetReps: number;
}

function getScoreLabel(score: number): { label: string; emoji: string; color: string } {
  if (score >= 90) return { label: 'PERFECT FORM', emoji: '⭐', color: '#22c55e' };
  if (score >= 75) return { label: 'GOOD FORM', emoji: '✅', color: '#4ade80' };
  if (score >= 50) return { label: 'NEEDS WORK', emoji: '⚠️', color: '#f59e0b' };
  return { label: 'POOR FORM', emoji: '❌', color: '#ef4444' };
}

function getXPBonus(score: number): number {
  if (score >= 90) return 20;
  if (score >= 75) return 10;
  if (score >= 50) return 5;
  return 0;
}

const FormCoachSummary: React.FC<FormCoachSummaryProps> = ({ setNumber, state, targetReps }) => {
  const { formScore, repCount, repResults } = state;
  const scoreInfo = getScoreLabel(formScore);
  const xpBonus = getXPBonus(formScore);

  const goodReps = repResults.filter(r => r.formScore >= 75).length;
  const badReps = repResults.filter(r => r.formScore < 75).length;

  // Collect unique violations across all reps
  const allViolations: { message: string; repNumbers: number[] }[] = [];
  const violationMap = new Map<string, number[]>();
  for (const rep of repResults) {
    for (const v of rep.violations) {
      const existing = violationMap.get(v.ruleId) || [];
      existing.push(rep.repNumber);
      violationMap.set(v.ruleId, existing);
      if (!allViolations.find(av => av.message === v.message)) {
        allViolations.push({ message: v.message, repNumbers: existing });
      }
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="rounded-2xl overflow-hidden mx-2"
      style={{
        background: 'linear-gradient(160deg, rgba(255,255,255,0.04) 0%, rgba(0,0,0,0.6) 100%)',
        border: `1px solid ${scoreInfo.color}30`,
        boxShadow: `0 0 30px ${scoreInfo.color}15`,
      }}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 text-center"
        style={{ borderBottom: `1px solid ${scoreInfo.color}15` }}>
        <div className="flex items-center justify-center gap-2 mb-1">
          <Zap size={12} style={{ color: scoreInfo.color }} />
          <span className="text-[9px] font-mono font-bold tracking-[0.2em]"
            style={{ color: scoreInfo.color }}>FORM REPORT — SET {setNumber}</span>
        </div>
      </div>

      {/* Score */}
      <div className="px-4 py-4 text-center">
        <div className="flex items-center justify-center gap-3">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="text-4xl font-black font-mono"
            style={{ color: scoreInfo.color, textShadow: `0 0 20px ${scoreInfo.color}40` }}
          >
            {formScore}%
          </motion.div>
          <div className="text-left">
            <div className="text-sm font-black text-white">{scoreInfo.emoji} {scoreInfo.label}</div>
          </div>
        </div>

        {/* Score bar */}
        <div className="w-full h-2 bg-gray-800 rounded-full mt-3 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${formScore}%` }}
            transition={{ delay: 0.3, duration: 0.8, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${scoreInfo.color}80, ${scoreInfo.color})` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 pb-3 flex gap-3">
        <div className="flex-1 text-center py-2 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="text-lg font-black text-white font-mono">{repCount}/{targetReps}</div>
          <div className="text-[8px] text-gray-500 font-mono tracking-wider">REPS</div>
        </div>
        <div className="flex-1 text-center py-2 rounded-xl"
          style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.1)' }}>
          <div className="text-lg font-black text-green-400 font-mono">{goodReps}</div>
          <div className="text-[8px] text-gray-500 font-mono tracking-wider">GOOD</div>
        </div>
        <div className="flex-1 text-center py-2 rounded-xl"
          style={{ background: badReps > 0 ? 'rgba(245,158,11,0.05)' : 'rgba(255,255,255,0.03)',
            border: badReps > 0 ? '1px solid rgba(245,158,11,0.1)' : '1px solid rgba(255,255,255,0.06)' }}>
          <div className={`text-lg font-black font-mono ${badReps > 0 ? 'text-amber-400' : 'text-gray-600'}`}>{badReps}</div>
          <div className="text-[8px] text-gray-500 font-mono tracking-wider">NEEDS WORK</div>
        </div>
      </div>

      {/* Violations */}
      {allViolations.length > 0 && (
        <div className="px-4 pb-3 space-y-1.5">
          {allViolations.slice(0, 3).map((v, i) => (
            <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-lg"
              style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.1)' }}>
              <AlertTriangle size={11} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] text-amber-300 font-bold">{v.message}</p>
                <p className="text-[8px] text-gray-600 font-mono">
                  Rep{v.repNumbers.length > 1 ? 's' : ''} {v.repNumbers.join(', ')}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* XP Bonus */}
      {xpBonus > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="px-4 pb-4"
        >
          <div className="flex items-center justify-center gap-2 py-2 rounded-xl"
            style={{ background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.15)' }}>
            <Trophy size={12} className="text-system-neon" />
            <span className="text-xs font-black font-mono text-system-neon">+{xpBonus} BONUS XP</span>
            <span className="text-[8px] text-gray-500 font-mono">(Form Score)</span>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default FormCoachSummary;
