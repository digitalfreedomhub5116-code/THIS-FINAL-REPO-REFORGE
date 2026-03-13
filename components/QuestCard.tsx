import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Dumbbell, Brain, Shield, Users, Zap, Trash2, ZapOff, Lock, Coins, Flame } from 'lucide-react';
import { Quest, CoreStats, Rank } from '../types';

interface QuestCardProps {
  quest: Quest;
  onComplete: (id: string, asMini?: boolean) => void;
  onFail: (id: string) => void;
  onReset: (id: string) => void;
  onDelete: (id: string) => void;
  isLocked?: boolean;
}

const RANK_BAR: Record<Rank, string> = {
  S: '#a855f7',
  A: '#eab308',
  B: '#3b82f6',
  C: '#22c55e',
  D: '#f97316',
  E: '#6b7280',
};

const RANK_LABEL: Record<Rank, string> = {
  S: 'rgba(168,85,247,0.15)',
  A: 'rgba(234,179,8,0.12)',
  B: 'rgba(59,130,246,0.12)',
  C: 'rgba(34,197,94,0.12)',
  D: 'rgba(249,115,22,0.12)',
  E: 'rgba(107,114,128,0.1)',
};

const CAT_ICON: Record<keyof CoreStats, React.ReactNode> = {
  strength:     <Dumbbell size={10} />,
  intelligence: <Brain size={10} />,
  discipline:   <Shield size={10} />,
  social:       <Users size={10} />,
};

const CAT_COLOR: Record<keyof CoreStats, string> = {
  strength:     '#f97066',
  intelligence: '#818cf8',
  discipline:   '#c084fc',
  social:       '#fbbf24',
};

const QuestCard: React.FC<QuestCardProps> = ({ quest, onComplete, onFail, onDelete, isLocked }) => {
  const [isMiniView, setIsMiniView] = useState(false);

  const isExpired = quest.expiresAt ? Date.now() > quest.expiresAt : false;
  const isFailed  = quest.failed || (isExpired && !quest.isCompleted);
  const isCompleted = quest.isCompleted;
  const isActive  = !isCompleted && !isFailed;
  const isMiniActive = isMiniView && isActive;

  const rankColor  = RANK_BAR[quest.rank];
  const rankBg     = RANK_LABEL[quest.rank];
  const catColor   = quest.category ? CAT_COLOR[quest.category] : '#6b7280';
  const catIcon    = quest.category ? CAT_ICON[quest.category] : null;
  const displayXp  = isMiniActive ? Math.floor(quest.xpReward * 0.1) : quest.xpReward;

  const handleComplete = () => {
    onComplete(quest.id, isMiniActive);
  };

  const handleFail = () => onFail(quest.id);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: isFailed ? 0.55 : 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.25 }}
      id={`quest-card-${quest.id}`}
      className="relative rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(6,6,18,0.88) 12%, rgba(3,3,10,0.94) 100%)',
        backdropFilter: 'blur(20px) saturate(160%)',
        WebkitBackdropFilter: 'blur(20px) saturate(160%)',
        borderTop: isCompleted
          ? '1px solid rgba(34,197,94,0.22)'
          : isFailed
          ? '1px solid rgba(239,68,68,0.18)'
          : isMiniActive
          ? '1px solid rgba(0,210,255,0.22)'
          : '1px solid rgba(255,255,255,0.10)',
        borderLeft: isCompleted
          ? '1px solid rgba(34,197,94,0.10)'
          : isFailed
          ? '1px solid rgba(239,68,68,0.08)'
          : isMiniActive
          ? '1px solid rgba(0,210,255,0.10)'
          : '1px solid rgba(255,255,255,0.05)',
        borderRight: '1px solid rgba(255,255,255,0.03)',
        borderBottom: '1px solid rgba(255,255,255,0.03)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 20px rgba(0,0,0,0.40)',
      }}
    >
      {/* State tint wash */}
      {(isCompleted || isFailed || isMiniActive) && (
        <div className="absolute inset-0 pointer-events-none rounded-2xl" style={{
          background: isCompleted
            ? 'linear-gradient(135deg, rgba(34,197,94,0.04) 0%, transparent 60%)'
            : isFailed
            ? 'linear-gradient(135deg, rgba(239,68,68,0.04) 0%, transparent 60%)'
            : 'linear-gradient(135deg, rgba(0,210,255,0.05) 0%, transparent 60%)',
        }} />
      )}
      {/* Locked overlay — shown during tutorial for non-welcome quests */}
      {isLocked && (
        <div className="absolute inset-0 z-20 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)' }}>
          <div className="flex flex-col items-center gap-2">
            <Lock size={20} className="text-gray-500" />
            <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Available After Tutorial</span>
          </div>
        </div>
      )}
      {/* Left rank accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{
          background: isCompleted ? '#22c55e' : isFailed ? '#ef4444'
            : (isActive && quest.hasPact && quest.pactStatus === 'active') ? '#fbbf24' : rankColor,
          boxShadow: isCompleted
            ? '0 0 8px rgba(34,197,94,0.4)'
            : isFailed
            ? '0 0 8px rgba(239,68,68,0.3)'
            : (isActive && quest.hasPact && quest.pactStatus === 'active')
            ? '0 0 10px rgba(251,191,36,0.4)'
            : `0 0 8px ${rankColor}60`,
        }}
      />

      <div className="pl-5 pr-4 pt-4 pb-3">

        {/* Top row: rank + title + XP */}
        <div className="flex items-start gap-3">
          {/* Rank badge */}
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black flex-shrink-0 mt-0.5"
            style={{ background: rankBg, color: rankColor, border: `1px solid ${rankColor}40` }}
          >
            {quest.rank}
          </div>

          {/* Title block */}
          <div className="flex-1 min-w-0">
            <h3
              className="font-bold text-sm leading-snug"
              style={{ color: isCompleted || isFailed ? '#6b7280' : '#f1f5f9', textDecoration: isCompleted || isFailed ? 'line-through' : 'none' }}
            >
              {isMiniActive ? (quest.miniQuest || 'Activation: Just Start.') : quest.title}
            </h3>

            {/* Meta row: category + daily badge */}
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {quest.category && (
                <span className="flex items-center gap-1 text-[9px] font-mono font-bold uppercase tracking-wide" style={{ color: catColor }}>
                  {catIcon}
                  {quest.category}
                </span>
              )}
              {quest.isDaily && (
                <span
                  className="text-[8px] font-black font-mono tracking-widest px-1.5 py-0.5 rounded"
                  style={{ color: '#00d2ff', background: 'rgba(0,210,255,0.08)', border: '1px solid rgba(0,210,255,0.2)' }}
                >
                  DAILY
                </span>
              )}
              {isMiniActive && (
                <span className="text-[8px] font-mono text-[#00d2ff]/60">↯ ACTIVATION MODE</span>
              )}
            </div>

            {/* Pact badge */}
            {quest.hasPact && quest.pactAmount && quest.pactAmount > 0 && (
              <div className="flex items-center gap-1.5 mt-1">
                {quest.pactStatus === 'active' && (
                  <span
                    className="flex items-center gap-1 text-[8px] font-black font-mono tracking-widest px-1.5 py-0.5 rounded"
                    style={{ color: '#fbbf24', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)' }}
                  >
                    <Coins size={8} /> {quest.pactAmount}G PLEDGED
                  </span>
                )}
                {quest.pactStatus === 'honored' && (
                  <span
                    className="flex items-center gap-1 text-[8px] font-black font-mono tracking-widest px-1.5 py-0.5 rounded"
                    style={{ color: '#4ade80', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}
                  >
                    <Check size={8} /> {quest.pactAmount}G RETURNED · 1.25x XP
                  </span>
                )}
                {quest.pactStatus === 'burned' && (
                  <span
                    className="flex items-center gap-1 text-[8px] font-black font-mono tracking-widest px-1.5 py-0.5 rounded"
                    style={{ color: '#f87171', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
                  >
                    <Flame size={8} /> {quest.pactAmount}G BURNED
                  </span>
                )}
              </div>
            )}

            {/* Description */}
            {!isMiniActive && quest.description && (
              <p className="text-gray-600 text-[11px] mt-1.5 leading-relaxed line-clamp-1">
                {quest.description}
              </p>
            )}

            {/* Trigger hint */}
            {isActive && quest.trigger && !isMiniActive && (
              <p className="text-gray-700 text-[10px] mt-1 font-mono">
                IF: {quest.trigger}
              </p>
            )}
          </div>

          {/* XP + Gold pills */}
          <div className="flex flex-col items-end flex-shrink-0 gap-1">
            <div
              className="flex items-center gap-0.5 font-black font-mono text-sm"
              style={{ color: isCompleted ? '#22c55e' : isFailed ? '#6b7280' : '#00d2ff' }}
            >
              <Zap size={10} />
              {displayXp}
            </div>
            {quest.hasPact && quest.pactAmount && quest.pactStatus === 'active' && (
              <div className="flex items-center gap-0.5 font-bold font-mono text-[10px]" style={{ color: '#fbbf24' }}>
                <Coins size={9} />
                {quest.pactAmount}
              </div>
            )}
            <span className="text-[8px] text-gray-700 font-mono">{quest.hasPact && quest.pactStatus === 'active' ? 'XP · Gold' : 'XP'}</span>
          </div>
        </div>

        {/* ── ACTIVE: action buttons ── */}
        {isActive && (
          <div className="flex items-center gap-2 mt-3">
            {/* Mini quest toggle */}
            {quest.miniQuest && !isMiniActive && (
              <button
                onClick={() => setIsMiniView(true)}
                className="flex items-center justify-center w-9 h-9 rounded-xl transition-all active:scale-95 flex-shrink-0"
                style={{ background: 'rgba(0,210,255,0.05)', border: '1px solid rgba(0,210,255,0.15)', color: 'rgba(0,210,255,0.5)' }}
                title="Activation Energy Mode"
              >
                <Zap size={13} />
              </button>
            )}

            {isMiniActive && (
              <button
                onClick={() => setIsMiniView(false)}
                className="flex items-center justify-center w-9 h-9 rounded-xl transition-all active:scale-95 flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#6b7280' }}
              >
                <ZapOff size={13} />
              </button>
            )}

            {/* Complete button */}
            <button
              onClick={handleComplete}
              className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl text-[11px] font-black font-mono uppercase tracking-wide transition-all active:scale-95 hover:shadow-[0_0_12px_rgba(34,197,94,0.2)]"
              style={{
                background: isMiniActive ? 'rgba(0,210,255,0.08)' : 'rgba(34,197,94,0.08)',
                border: isMiniActive ? '1px solid rgba(0,210,255,0.3)' : '1px solid rgba(34,197,94,0.3)',
                color: isMiniActive ? '#00d2ff' : '#4ade80',
              }}
            >
              <Check size={13} strokeWidth={2.5} />
              {isMiniActive ? `+${Math.floor(quest.xpReward * 0.1)} XP` : 'Complete'}
            </button>

            {/* Fail button */}
            <button
              onClick={handleFail}
              className="flex items-center justify-center gap-1 h-9 px-4 rounded-xl text-[11px] font-bold font-mono uppercase tracking-wide transition-all active:scale-95"
              style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', color: 'rgba(239,68,68,0.5)' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(239,68,68,0.5)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)'; }}
            >
              <X size={13} strokeWidth={2.5} />
              Fail
            </button>
          </div>
        )}

        {/* ── COMPLETED state ── */}
        {isCompleted && (
          <div className="flex items-center gap-1.5 mt-3">
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)' }}
            >
              <Check size={10} strokeWidth={3} className="text-green-400" />
            </div>
            <span className="text-[10px] font-mono font-bold text-green-500/70 tracking-widest uppercase">
              {quest.completedAsMini ? 'Activation Complete' : 'Quest Complete'}
            </span>
          </div>
        )}

        {/* ── FAILED state ── */}
        {isFailed && !isCompleted && (
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-1.5">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
              >
                <X size={10} strokeWidth={3} className="text-red-500" />
              </div>
              <span className="text-[10px] font-mono text-red-500/60 tracking-widest uppercase">
                {isExpired ? 'Expired' : 'Failed'}
              </span>
            </div>
            <button
              onClick={() => onDelete(quest.id)}
              className="flex items-center gap-1 text-[9px] font-mono text-gray-700 hover:text-red-500 transition-colors"
            >
              <Trash2 size={10} />
              Delete
            </button>
          </div>
        )}

      </div>
    </motion.div>
  );
};

export default QuestCard;
