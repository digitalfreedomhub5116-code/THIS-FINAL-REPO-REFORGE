import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Target, Clock, Sparkles, Coins, Check, AlertCircle } from 'lucide-react';
import { NEON, glassPanel } from './guildTheme';
import { fetchMission } from '../../lib/guildApi';
import type { GuildMission } from '../../types';

interface GuildGatesProps {
  guildId: string;
  /** bumped externally when realtime fires mission_complete so we refetch + celebrate */
  completionSignal?: number;
}

const GuildGates: React.FC<GuildGatesProps> = ({ guildId, completionSignal }) => {
  const [mission, setMission] = useState<GuildMission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState('');
  const [celebrate, setCelebrate] = useState(false);
  const wasComplete = useRef(false);

  const load = useCallback(async () => {
    try {
      const m = await fetchMission(guildId);
      setMission(m);
      if (m?.completed && !wasComplete.current) { wasComplete.current = true; }
      setError('');
    } catch (e: any) {
      setError(e?.message || 'Could not load mission');
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

  // Poll progress while the gate is open (others contribute live).
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
  if (!mission) {
    return (
      <div className="text-center py-16 px-4">
        <Target size={32} className="text-gray-600 mx-auto mb-3" />
        <p className="text-gray-400 text-sm">No active gate today.</p>
        <p className="text-gray-600 text-xs mt-1">A new collective mission appears each day.</p>
      </div>
    );
  }

  const pct = Math.min(100, Math.round((mission.progress / mission.target) * 100));

  return (
    <div className="p-4 overflow-y-auto h-full pb-24 relative">
      {celebrate && <Confetti />}

      <div className="flex items-center gap-2 mb-1">
        <Target size={16} style={{ color: NEON }} />
        <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-cyan-400">Daily Gate</span>
      </div>
      <h2 className="text-xl font-heading font-extrabold text-white mb-4">Collective Mission</h2>

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
            {mission.reward?.glory != null && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(0,212,255,0.12)' }}>
                <Sparkles size={14} style={{ color: NEON }} />
                <span className="text-sm font-bold" style={{ color: NEON }}>{mission.reward.glory} Glory</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="text-center text-gray-600 text-xs mt-4">Every workout & quest your guildmates complete adds to the gate.</p>
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

export default GuildGates;
