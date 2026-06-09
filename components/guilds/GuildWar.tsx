import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Swords, Zap, Crown, AlertCircle, Calendar, Shield, Clock, Check } from 'lucide-react';
import { NEON, glassPanel, bannerStyle, getGuildIconUrl } from './guildTheme';
import GuildAvatar from './GuildAvatar';
import { fetchWar, registerForWar, unregisterForWar } from '../../lib/guildApi';
import type { WarState, GuildWarSide, GuildWarContributor, GuildRole } from '../../types';

interface GuildWarProps {
  guildId: string;
  myRole: GuildRole;
  onToast?: (type: 'SUCCESS' | 'WARNING' | 'ERROR', title: string, msg?: string) => void;
}

const GuildWar: React.FC<GuildWarProps> = ({ guildId, myRole, onToast }) => {
  const [state, setState] = useState<WarState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setState(await fetchWar(guildId));
      setError('');
    } catch (e: any) {
      setError(e?.message || 'Could not load war');
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { const id = setInterval(load, 20000); return () => clearInterval(id); }, [load]);

  const toggleRegister = async (register: boolean) => {
    setBusy(true);
    try {
      if (register) { await registerForWar(guildId); onToast?.('SUCCESS', 'Registered for War', 'Matchmaking happens Thursday.'); }
      else { await unregisterForWar(guildId); onToast?.('SUCCESS', 'Withdrawn from War'); }
      await load();
    } catch (e: any) {
      onToast?.('ERROR', 'Could not update registration', e?.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="p-4"><div className="h-64 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} /></div>;
  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle size={28} className="text-red-400 mx-auto mb-2" />
        <p className="text-gray-400 text-sm mb-3">{error}</p>
        <button onClick={load} className="px-4 py-2 rounded-xl text-sm" style={{ background: 'rgba(0,212,255,0.15)', color: NEON }}>Retry</button>
      </div>
    );
  }
  const war = state?.war || null;

  if (!war) {
    return (
      <WarLobby
        registered={!!state?.registered}
        canRegister={myRole === 'master' || myRole === 'vice'}
        nextWarStart={state?.nextWarStart || ''}
        busy={busy}
        onToggle={toggleRegister}
      />
    );
  }

  const mine = war.guildA.id === guildId ? war.guildA : war.guildB;
  const foe = war.guildA.id === guildId ? war.guildB : war.guildA;
  const total = Math.max(1, mine.score + foe.score);
  const minePct = Math.round((mine.score / total) * 100);

  const myContribs = war.contributors.filter((c) => c.guildId === mine.id).slice(0, 5);
  const foeContribs = war.contributors.filter((c) => c.guildId === foe.id).slice(0, 5);

  return (
    <div className="p-4 overflow-y-auto h-full pb-24">
      <div className="flex items-center gap-2 mb-3">
        <Swords size={16} style={{ color: NEON }} />
        <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-cyan-400">Guild War</span>
        {war.status === 'ended' && <span className="text-[10px] font-mono px-2 py-0.5 rounded ml-auto" style={{ background: 'rgba(148,163,184,0.15)', color: '#94a3b8' }}>Ended</span>}
      </div>

      {/* Split-screen scoreboard */}
      <div className="rounded-2xl overflow-hidden" style={glassPanel}>
        <Side side={mine} label="Your Guild" color={NEON} winner={war.status === 'ended' && war.winnerId === mine.id} />
        {/* VS bolt */}
        <div className="relative flex items-center justify-center py-1">
          <div className="absolute inset-x-0 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
          <div className="relative w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)', border: `1px solid ${NEON}` }}>
            <Zap size={18} style={{ color: NEON }} />
          </div>
        </div>
        <Side side={foe} label="Opponent" color="#ef4444" winner={war.status === 'ended' && war.winnerId === foe.id} />

        {/* Momentum bar */}
        <div className="h-2 flex">
          <div style={{ width: `${minePct}%`, background: NEON, transition: 'width 0.6s' }} />
          <div style={{ width: `${100 - minePct}%`, background: '#ef4444', transition: 'width 0.6s' }} />
        </div>
      </div>

      {/* Top contributors */}
      <h3 className="text-[11px] font-mono uppercase tracking-wider text-gray-400 mt-5 mb-2">Top Contributors</h3>
      <div className="space-y-2">
        {myContribs.map((c, i) => <ContribRow key={c.userId} c={c} rank={i + 1} color={NEON} />)}
        {myContribs.length === 0 && <p className="text-gray-600 text-xs">No contributions yet — complete workouts to score.</p>}
        <div className="h-2" />
        {foeContribs.map((c, i) => <ContribRow key={c.userId} c={c} rank={i + 1} color="#ef4444" />)}
      </div>
    </div>
  );
};

const Side: React.FC<{ side: GuildWarSide; label: string; color: string; winner: boolean }> = ({ side, label, color, winner }) => (
  <div className="p-4 flex flex-col items-center text-center relative">
    {winner && (
      <div className="absolute top-2 right-2 flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(251,191,36,0.18)', color: '#fbbf24' }}>
        <Crown size={11} /> Winner
      </div>
    )}
    <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1">{label}</span>
    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-2 overflow-hidden" style={{ ...bannerStyle(side.banner), boxShadow: `0 0 16px ${color}55` }}>
      <img src={getGuildIconUrl(side.icon)} alt="" className="w-10 h-10 object-contain" />
    </div>
    <p className="text-white font-heading font-bold text-lg leading-tight">{side.name}</p>
    <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mt-1">War Points</span>
    <motion.p key={side.score} initial={{ scale: 1.2 }} animate={{ scale: 1 }} className="text-3xl font-heading font-extrabold" style={{ color }}>
      {side.score.toLocaleString()}
    </motion.p>
  </div>
);

const ContribRow: React.FC<{ c: GuildWarContributor; rank: number; color: string }> = ({ c, rank, color }) => (
  <div className="flex items-center gap-3 p-2.5 rounded-xl relative overflow-hidden" style={glassPanel}>
    <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: color }} />
    <span className="font-mono font-bold text-sm w-6 text-center" style={{ color }}>#{rank}</span>
    <GuildAvatar name={c.name} avatarUrl={c.avatarUrl} size={32} />
    <p className="flex-1 text-white text-sm font-semibold truncate">{c.name}</p>
    <span className="font-mono font-bold text-sm" style={{ color }}>{c.points.toLocaleString()}</span>
  </div>
);

const WarLobby: React.FC<{
  registered: boolean;
  canRegister: boolean;
  nextWarStart: string;
  busy: boolean;
  onToggle: (register: boolean) => void;
}> = ({ registered, canRegister, nextWarStart, busy, onToggle }) => {
  const dateLabel = formatWarDate(nextWarStart);
  return (
    <div className="p-4 overflow-y-auto h-full pb-24">
      <div className="flex items-center gap-2 mb-3">
        <Swords size={16} style={{ color: NEON }} />
        <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-cyan-400">Guild War</span>
      </div>

      <div className="rounded-2xl p-6 text-center" style={{ ...glassPanel, border: registered ? `1px solid ${NEON}` : glassPanel.border }}>
        <div
          className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4"
          style={{ background: registered ? 'rgba(0,212,255,0.15)' : 'rgba(255,255,255,0.05)', boxShadow: registered ? `0 0 22px ${NEON}55` : 'none' }}
        >
          {registered ? <Check size={30} style={{ color: NEON }} /> : <Shield size={30} className="text-gray-400" />}
        </div>

        {registered ? (
          <>
            <h2 className="text-xl font-heading font-extrabold text-white">Registered for War</h2>
            <p className="text-gray-400 text-sm mt-1">Your guild is in the matchmaking pool.</p>
          </>
        ) : (
          <>
            <h2 className="text-xl font-heading font-extrabold text-white">No War This Week</h2>
            <p className="text-gray-400 text-sm mt-1">Opt in to be matched against a rival guild.</p>
          </>
        )}

        <div className="flex items-center justify-center gap-1.5 mt-3 text-xs text-gray-400">
          <Clock size={13} /> Matchmaking: <span className="font-mono text-white">{dateLabel}</span>
        </div>

        {canRegister ? (
          <button
            onClick={() => onToggle(!registered)}
            disabled={busy}
            className="mt-5 w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            style={registered
              ? { background: 'rgba(255,255,255,0.05)', color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.12)' }
              : { background: `linear-gradient(135deg, ${NEON}, #6d28d9)`, color: '#000' }}
          >
            {busy ? 'Working…' : registered ? 'Withdraw from War' : <><Swords size={15} /> Register for War</>}
          </button>
        ) : (
          <p className="mt-5 text-[11px] font-mono px-3 py-2 rounded-lg" style={{ background: 'rgba(148,163,184,0.12)', color: '#94a3b8' }}>
            Only the Guild Master & Vice can register for war.
          </p>
        )}
      </div>

      <p className="text-center text-gray-600 text-xs mt-4 flex items-center justify-center gap-1.5">
        <Calendar size={12} /> Wars run Thursday – Saturday. Rewards distributed Sunday.
      </p>
    </div>
  );
};

function formatWarDate(iso: string): string {
  if (!iso) return 'soon';
  const d = new Date(`${iso}T00:00:00Z`);
  if (isNaN(d.getTime())) return 'soon';
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export default GuildWar;
