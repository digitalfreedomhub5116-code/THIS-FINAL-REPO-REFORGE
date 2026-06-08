import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dumbbell, Send, X } from 'lucide-react';
import { NEON, glassPanel } from './guildTheme';
import { fetchMyGuild, sendChatMessage } from '../../lib/guildApi';

interface GuildShareWorkoutProps {
  /** When set, attempts to show the share prompt (only appears if the user is in a guild). */
  summary: { exercises: number; total: number; xp?: number } | null;
  onDismiss: () => void;
}

/**
 * "Share with Guild?" prompt shown after a workout. Self-contained: it checks
 * guild membership lazily and posts a special workout chat card on share.
 */
const GuildShareWorkout: React.FC<GuildShareWorkoutProps> = ({ summary, onDismiss }) => {
  const [guildId, setGuildId] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!summary) { setVisible(false); return; }
    (async () => {
      try {
        const { guild } = await fetchMyGuild();
        if (cancelled) return;
        if (guild) { setGuildId(guild.id); setVisible(true); }
        else { onDismiss(); }
      } catch {
        if (!cancelled) onDismiss();
      }
    })();
    return () => { cancelled = true; };
  }, [summary, onDismiss]);

  // Auto-hide after 8s if ignored.
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => { setVisible(false); onDismiss(); }, 8000);
    return () => clearTimeout(t);
  }, [visible, onDismiss]);

  const share = async () => {
    if (!guildId || !summary) return;
    setSending(true);
    try {
      const body = `Completed a dungeon workout — ${summary.exercises}/${summary.total} exercises`;
      await sendChatMessage(guildId, body, 'workout', { exercises: summary.exercises, total: summary.total, xp: summary.xp });
    } catch {
      /* ignore */
    } finally {
      setSending(false);
      setVisible(false);
      onDismiss();
    }
  };

  const close = () => { setVisible(false); onDismiss(); };

  return (
    <AnimatePresence>
      {visible && summary && (
        <motion.div
          className="fixed left-4 right-4 z-[99999] flex justify-center pointer-events-none"
          style={{ bottom: 'calc(90px + env(safe-area-inset-bottom, 0px))' }}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
        >
          <div className="w-full max-w-sm rounded-2xl p-4 pointer-events-auto" style={{ ...glassPanel, border: `1px solid ${NEON}` }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(0,212,255,0.15)' }}>
                <Dumbbell size={20} style={{ color: NEON }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-bold">Workout complete!</p>
                <p className="text-gray-400 text-xs">Share this win with your guild?</p>
              </div>
              <button onClick={close} className="text-gray-500 hover:text-white flex-shrink-0"><X size={18} /></button>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={close} className="flex-1 py-2 rounded-xl text-sm font-semibold" style={{ background: 'rgba(255,255,255,0.05)', color: '#cbd5e1' }}>Not now</button>
              <button onClick={share} disabled={sending} className="flex-1 py-2 rounded-xl text-sm font-bold text-black flex items-center justify-center gap-1.5 disabled:opacity-50" style={{ background: `linear-gradient(135deg, ${NEON}, #6d28d9)` }}>
                <Send size={14} /> {sending ? 'Sharing…' : 'Share'}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GuildShareWorkout;
