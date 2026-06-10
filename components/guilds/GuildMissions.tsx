import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Clock, Sparkles, Coins, Check, AlertCircle, Gift } from 'lucide-react';
import { NEON, glassPanel } from './guildTheme';
import { fetchMission, fetchUnclaimedRewards, claimReward } from '../../lib/guildApi';
import type { GuildMission } from '../../types';

interface GuildMissionsProps {
  guildId: string;
  completionSignal?: number;
  onToast?: (
    type: 'SUCCESS' | 'WARNING' | 'ERROR',
    title: string,
    msg?: string
  ) => void;
}

interface MemberReward {
  id: string;
  gold: number;
  xp: number;
  created_at: string;
  guild_missions?: {
    title: string;
  } | null;
}

const GuildMissions: React.FC<GuildMissionsProps> = ({ guildId, completionSignal, onToast }) => {
  const [mission, setMission] = useState<GuildMission | null>(null);
  const [unclaimedRewards, setUnclaimedRewards] = useState<MemberReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState('');
  const [celebrate, setCelebrate] = useState(false);
  const wasComplete = useRef(false);

  const load = useCallback(async () => {
    try {
      const [m, rewards] = await Promise.all([
        fetchMission(guildId),
        fetchUnclaimedRewards(guildId)
      ]);
      setMission(m);
      setUnclaimedRewards(rewards);
      if (m?.completed && !wasComplete.current) { wasComplete.current = true; }
      setError('');
    } catch (e: any) {
      setError(e?.message || 'Could not load missions');
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  useEffect(() => { load(); }, [load]);

  // Refetch + celebrate when a realtime mission_complete signal arrives.
  useEffect(() => {
    if (completionSignal) {
      setCelebrate(true);
      load();
      const t = setTimeout(() => setCelebrate(false), 4000);
      return () => clearTimeout(t);
    }
  }, [completionSignal, load]);

  // Poll progress while the mission is active.
  useEffect(() => {
    const id = setInterval(load, 20000);
    return () => clearInterval(id);
  }, [load]);

  // Countdown to UTC midnight (mission reset).
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const end = new Date(now);
      end.setUTCHours(24, 0, 0, 0);
      const diff = end.getTime() - now.getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(`${h}h ${m}m ${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const handleClaim = async (rewardId: string, gold: number, xp: number) => {
    if (claiming) return;
    setClaiming(true);
    try {
      const res = await claimReward(guildId, rewardId);
      if (res.success) {
        setCelebrate(true);
        onToast?.('SUCCESS', 'Rewards Claimed!', `+${gold} Gold and +${xp} XP acquired.`);
        // Dispatch event to sync player stats in App.tsx
        window.dispatchEvent(new CustomEvent('player:rewards_claimed', { detail: { player: res.player } }));
        // Remove from list
        setUnclaimedRewards((prev) => prev.filter((r) => r.id !== rewardId));
        setTimeout(() => setCelebrate(false), 4000);
      } else {
        onToast?.('ERROR', 'Failed to claim rewards');
      }
    } catch (err: any) {
      onToast?.('ERROR', err?.message || 'Failed to claim rewards');
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return <div className="p-4"><div className="h-48 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} /></div>;
  }
  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle size={28} className="text-red-400 mx-auto mb-2" />
        <p className="text-gray-400 text-sm mb-3">{error}</p>
        <button onClick={load} className="px-4 py-2 rounded-xl text-sm" style={{ background: 'rgba(0,212,255,0.15)', color: NEON }}>Retry</button>
      </div>
    );
  }

  const pct = mission ? Math.min(100, Math.round((mission.progress / mission.target) * 100)) : 0;

  return (
    <div className="p-4 overflow-y-auto h-full pb-24 relative">
      {celebrate && <Confetti />}

      {/* Unclaimed Rewards Section */}
      <AnimatePresence>
        {unclaimedRewards.length > 0 && (
          <div className="space-y-4 mb-6">
            {unclaimedRewards.map((reward) => (
              <motion.div
                key={reward.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="rounded-2xl p-5 relative overflow-hidden"
                style={{
                  ...glassPanel,
                  border: '1px solid rgba(251, 191, 36, 0.4)',
                  boxShadow: '0 0 20px rgba(251, 191, 36, 0.15)',
                  background: 'linear-gradient(135deg, rgba(20, 15, 5, 0.95), rgba(8, 8, 12, 0.95))',
                }}
              >
                {/* Ambient Gold glow */}
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
                
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Gift size={16} className="text-amber-400" />
                      <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-amber-400 uppercase">
                        Mission Completed
                      </span>
                    </div>
                    <h3 className="text-white font-bold text-base leading-snug">
                      {reward.guild_missions?.title || "Daily Collective Mission"}
                    </h3>
                  </div>
                  <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full flex-shrink-0 bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    <Check size={12} /> Cleared
                  </span>
                </div>

                <p className="text-xs text-gray-400 mb-4">
                  You participated in this mission and contributed towards its completion. Claim your rewards below!
                </p>

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
                  <div className="flex gap-3">
                    {reward.gold > 0 && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(251,191,36,0.12)' }}>
                        <Coins size={14} className="text-amber-400" />
                        <span className="text-amber-300 text-sm font-bold">+{reward.gold.toLocaleString()} G</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(0,212,255,0.12)' }}>
                      <Sparkles size={14} style={{ color: NEON }} />
                      <span className="text-sm font-bold" style={{ color: NEON }}>+{reward.xp.toLocaleString()} XP</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleClaim(reward.id, reward.gold, reward.xp)}
                    disabled={claiming}
                    className="px-5 py-2 rounded-xl text-xs font-heading font-extrabold uppercase tracking-wider transition-all duration-300"
                    style={{
                      background: claiming
                        ? 'rgba(255,255,255,0.05)'
                        : 'linear-gradient(135deg, #fbbf24, #d97706)',
                      color: claiming ? '#6b7280' : '#000',
                      boxShadow: claiming ? 'none' : '0 0 10px rgba(251, 191, 36, 0.4)',
                    }}
                  >
                    {claiming ? 'Claiming...' : 'Claim Reward'}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-2 mb-1">
        <Target size={16} style={{ color: NEON }} />
        <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-cyan-400">Daily Mission</span>
      </div>
      <h2 className="text-xl font-heading font-extrabold text-white mb-4">Collective Mission</h2>

      {!mission ? (
        <div className="text-center py-16 px-4">
          <Target size={32} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No active mission today.</p>
          <p className="text-gray-600 text-xs mt-1">A new collective mission appears each day.</p>
        </div>
      ) : (
        <div className="rounded-2xl p-5" style={{ ...glassPanel, border: mission.completed ? `1px solid ${NEON}` : glassPanel.border }}>
          <div className="flex items-start justify-between gap-3 mb-4">
            <h3 className="text-white font-bold text-lg leading-snug">{mission.title}</h3>
            {mission.completed && (
              <span className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full flex-shrink-0" style={{ background: 'rgba(0,212,255,0.18)', color: NEON }}>
                <Check size={12} /> Cleared
              </span>
            )}
          </div>

          {/* Progress bar */}
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-mono text-white">{mission.progress.toLocaleString()} / {mission.target.toLocaleString()}</span>
            <span className="font-mono" style={{ color: NEON }}>{pct}%</span>
          </div>
          <div className="h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${NEON}, #6d28d9)`, boxShadow: `0 0 10px ${NEON}` }}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>

          {/* Countdown */}
          <div className="flex items-center gap-1.5 mt-4 text-gray-400 text-xs">
            <Clock size={13} /> Resets in <span className="font-mono text-white">{countdown}</span>
          </div>

          {/* Rewards */}
          <div className="mt-4 pt-4 border-t border-white/5">
            <p className="text-[11px] font-mono uppercase tracking-wider text-gray-500 mb-2">Guild Rewards</p>
            <div className="flex gap-3">
              {mission.reward?.gold != null && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(251,191,36,0.12)' }}>
                  <Coins size={14} className="text-amber-400" />
                  <span className="text-amber-300 text-sm font-bold">{mission.reward.gold.toLocaleString()} G</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <p className="text-center text-gray-600 text-xs mt-4">Every workout & quest your guildmates complete adds to the mission.</p>
    </div>
  );
};

// Lightweight confetti burst (no external dependency).
const Confetti: React.FC = () => {
  const pieces = Array.from({ length: 40 });
  const colors = [NEON, '#6d28d9', '#fbbf24', '#10b981', '#ef4444'];
  return (
    <div className="pointer-events-none fixed inset-0 z-[90] overflow-hidden">
      {pieces.map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 0.4;
        const dur = 1.8 + Math.random() * 1.2;
        const color = colors[i % colors.length];
        const size = 6 + Math.random() * 6;
        return (
          <motion.div
            key={i}
            className="absolute rounded-sm"
            style={{ left: `${left}%`, top: -20, width: size, height: size * 1.6, background: color }}
            initial={{ y: -20, rotate: 0, opacity: 1 }}
            animate={{ y: '110vh', rotate: 720, opacity: [1, 1, 0] }}
            transition={{ duration: dur, delay, ease: 'easeIn' }}
          />
        );
      })}
    </div>
  );
};

export default GuildMissions;
