import React from 'react';
import { motion } from 'framer-motion';
import { Swords, Dumbbell, Brain, Shield, Users, Clock, Zap, ChevronRight } from 'lucide-react';
import { Quest } from '../types';

interface UpcomingQuestsProps {
  quests: Quest[];
  onNavigateToQuests: () => void;
}

const RANK_CONFIG: Record<string, { color: string; bg: string; glow: string }> = {
  S: { color: '#a855f7', bg: 'rgba(168,85,247,0.15)', glow: 'rgba(168,85,247,0.4)' },
  A: { color: '#eab308', bg: 'rgba(234,179,8,0.12)', glow: 'rgba(234,179,8,0.35)' },
  B: { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', glow: 'rgba(59,130,246,0.3)' },
  C: { color: '#22c55e', bg: 'rgba(34,197,94,0.12)', glow: 'rgba(34,197,94,0.3)' },
  D: { color: '#f97316', bg: 'rgba(249,115,22,0.12)', glow: 'rgba(249,115,22,0.3)' },
  E: { color: '#9ca3af', bg: 'rgba(156,163,175,0.1)', glow: 'rgba(156,163,175,0.25)' },
};

const CAT_ICON: Record<string, React.ReactNode> = {
  strength:     <Dumbbell size={12} />,
  intelligence: <Brain size={12} />,
  discipline:   <Shield size={12} />,
  social:       <Users size={12} />,
};

const CAT_COLOR: Record<string, string> = {
  strength:     '#f97066',
  intelligence: '#818cf8',
  discipline:   '#c084fc',
  social:       '#fbbf24',
};

const UpcomingQuests: React.FC<UpcomingQuestsProps> = ({ quests, onNavigateToQuests }) => {
  const active = quests
    .filter(q => !q.isCompleted && !q.failed)
    .sort((a, b) => {
      if (a.expiresAt && b.expiresAt) return a.expiresAt - b.expiresAt;
      if (a.expiresAt) return -1;
      if (b.expiresAt) return 1;
      return b.createdAt - a.createdAt;
    })
    .slice(0, 5);

  const formatTimeLeft = (expiresAt?: number) => {
    if (!expiresAt) return null;
    const diff = expiresAt - Date.now();
    if (diff <= 0) return 'EXPIRED';
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    if (h >= 24) return `${Math.floor(h / 24)}d left`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m left`;
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <Swords size={14} className="text-system-accent" />
          <h3 className="text-xs font-black text-white uppercase tracking-widest">Upcoming Quests</h3>
          {active.length > 0 && (
            <span
              className="text-[9px] font-black px-1.5 py-0.5 rounded font-mono"
              style={{ background: 'rgba(139,92,246,0.15)', color: '#8b5cf6', border: '1px solid rgba(139,92,246,0.3)' }}
            >
              {active.length}
            </span>
          )}
        </div>
        <button
          onClick={onNavigateToQuests}
          className="flex items-center gap-1 text-[9px] font-mono text-gray-500 hover:text-system-neon transition-colors group"
        >
          VIEW ALL
          <ChevronRight size={10} className="group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {active.length === 0 ? (
        /* Empty state */
        <div
          className="rounded-2xl p-6 flex flex-col items-center justify-center gap-3"
          style={{
            background: 'rgba(139,92,246,0.04)',
            border: '1px solid rgba(139,92,246,0.12)',
          }}
        >
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}
          >
            <Swords size={22} className="text-system-accent/50" />
          </div>
          <div className="text-center">
            <div className="text-white/50 text-sm font-bold">No active quests</div>
            <div className="text-gray-600 text-[10px] font-mono mt-0.5">Head to Quests to add new protocols</div>
          </div>
          <button
            onClick={onNavigateToQuests}
            className="text-[10px] font-black uppercase tracking-wider px-4 py-2 rounded-xl text-white transition-all hover:scale-105 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}
          >
            Add Quest
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {active.map((quest, i) => {
            const rank = RANK_CONFIG[quest.rank] || RANK_CONFIG['E'];
            const catColor = CAT_COLOR[quest.category] || '#9ca3af';
            const timeLeft = formatTimeLeft(quest.expiresAt);

            return (
              <motion.div
                key={quest.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06, duration: 0.35 }}
                onClick={onNavigateToQuests}
                className="relative rounded-xl overflow-hidden cursor-pointer group active:scale-[0.99] transition-transform"
                style={{
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(8,8,20,0.82) 12%, rgba(4,4,14,0.92) 100%)',
                  backdropFilter: 'blur(20px) saturate(160%)',
                  WebkitBackdropFilter: 'blur(20px) saturate(160%)',
                  borderTop: '1px solid rgba(255,255,255,0.11)',
                  borderLeft: '1px solid rgba(255,255,255,0.06)',
                  borderRight: '1px solid rgba(255,255,255,0.03)',
                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 16px rgba(0,0,0,0.35)',
                }}
              >
                {/* Left rank accent bar */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-[3px] rounded-full"
                  style={{ background: rank.color }}
                />

                <div className="flex items-center gap-3 pl-4 pr-3 py-3">
                  {/* Rank badge */}
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-black flex-shrink-0"
                    style={{ background: rank.bg, color: rank.color, border: `1px solid ${rank.glow}` }}
                  >
                    {quest.rank}
                  </div>

                  {/* Title + meta */}
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-xs font-bold truncate group-hover:text-white/90">
                      {quest.title}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex items-center gap-0.5" style={{ color: catColor }}>
                        {CAT_ICON[quest.category]}
                        <span className="text-[9px] font-mono font-bold uppercase">{quest.category.slice(0, 3)}</span>
                      </div>
                      {timeLeft && (
                        <div className="flex items-center gap-0.5 text-[9px] font-mono text-orange-400/80">
                          <Clock size={8} />
                          {timeLeft}
                        </div>
                      )}
                      {quest.isDaily && (
                        <span className="text-[8px] font-mono text-[#00d2ff]/60 border border-[#00d2ff]/20 px-1 rounded">
                          DAILY
                        </span>
                      )}
                    </div>
                  </div>

                  {/* XP pill */}
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <Zap size={8} className="text-[#00d2ff]" />
                    <span className="text-[10px] font-black font-mono text-white/70">{quest.xpReward}</span>
                    <span className="text-[8px] font-mono text-gray-600">XP</span>
                  </div>
                </div>

                {/* Hover shimmer */}
                <div className="absolute inset-0 bg-white/[0.02] opacity-0 group-hover:opacity-100 transition-opacity rounded-xl pointer-events-none" />
              </motion.div>
            );
          })}

          {/* "See more" row if there are more than 5 */}
          {quests.filter(q => !q.isCompleted && !q.failed).length > 5 && (
            <button
              onClick={onNavigateToQuests}
              className="w-full text-center text-[9px] font-mono text-gray-600 hover:text-system-accent transition-colors py-1"
            >
              +{quests.filter(q => !q.isCompleted && !q.failed).length - 5} more quests →
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default UpcomingQuests;
