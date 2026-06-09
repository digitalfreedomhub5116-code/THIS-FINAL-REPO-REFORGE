import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Users, Trophy, Sparkles, Plus, LogIn, Clock, Lock as LockIcon, AlertCircle } from 'lucide-react';
import { NEON, glassPanel, bannerStyle } from './guildTheme';
import { fetchGuilds, joinGuild } from '../../lib/guildApi';
import CreateGuildModal from './CreateGuildModal';
import type { GuildSummary, Guild } from '../../types';

interface GuildBrowserProps {
  isPremium: boolean;
  onUpgradePro: () => void;
  onJoined: () => void; // refetch membership → enter portal
  onToast?: (type: 'SUCCESS' | 'WARNING' | 'ERROR', title: string, msg?: string) => void;
}

type Filter = 'top' | 'recruiting' | 'war';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'top', label: 'Top Rated' },
  { key: 'recruiting', label: 'Recruiting' },
  { key: 'war', label: 'War Regis' },
];

const GuildBrowser: React.FC<GuildBrowserProps> = ({ isPremium, onUpgradePro, onJoined, onToast }) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('top');
  const [guilds, setGuilds] = useState<GuildSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await fetchGuilds(search, filter);
      setGuilds(list);
    } catch (e: any) {
      setError(e?.message || 'Could not load guilds');
    } finally {
      setLoading(false);
    }
  }, [search, filter]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const handleJoin = async (g: GuildSummary) => {
    setJoiningId(g.id);
    try {
      const { status } = await joinGuild(g.id);
      if (status === 'joined') {
        onToast?.('SUCCESS', 'Welcome to the guild!', g.name);
        onJoined();
      } else {
        onToast?.('SUCCESS', 'Request sent', 'The guild leaders will review your request.');
        await load();
      }
    } catch (e: any) {
      onToast?.('ERROR', 'Could not join', e?.message);
    } finally {
      setJoiningId(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto pb-28">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-3xl font-black text-white leading-tight tracking-tight uppercase">GUILD<br />DISCOVERY</h1>
        <p className="text-gray-400 text-sm mt-2 max-w-sm">Scan the global registry. Align with a faction. Forge your legacy in the digital void.</p>
      </div>

      {/* Search */}
      <div className="flex gap-2 mb-3">
        <div className="flex-1 flex items-center gap-2 px-3 rounded-xl" style={glassPanel}>
          <Search size={16} className="text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search guild registry…"
            className="flex-1 bg-transparent py-2.5 text-sm text-white focus:outline-none"
          />
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-5 rounded-xl text-black text-xs font-black font-mono uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(0,212,255,0.25)] flex items-center justify-center gap-1.5 flex-shrink-0"
          style={{ backgroundColor: NEON }}
        >
          <Plus size={14} strokeWidth={3} /> New
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold transition flex items-center gap-1.5"
            style={{
              background: filter === f.key ? 'rgba(0,212,255,0.18)' : 'rgba(255,255,255,0.04)',
              border: filter === f.key ? `1px solid ${NEON}` : '1px solid rgba(255,255,255,0.08)',
              color: filter === f.key ? NEON : '#94a3b8',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <AlertCircle size={32} className="text-red-400 mx-auto mb-3" />
          <p className="text-gray-400 text-sm mb-4">{error}</p>
          <button onClick={load} className="px-5 py-2 rounded-xl text-sm font-semibold" style={{ background: 'rgba(0,212,255,0.15)', color: NEON }}>Retry</button>
        </div>
      ) : guilds.length === 0 ? (
        <div className="text-center py-12">
          <Users size={32} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm mb-1">No guilds found</p>
          <p className="text-gray-600 text-xs">Be the first — forge your own guild.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {guilds.map((g, idx) => {
              const full = g.memberCount >= g.memberCap;
              return (
                <motion.div
                  key={g.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.03 }}
                  className="rounded-2xl p-4"
                  style={glassPanel}
                >
                  <div className="flex gap-3">
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={bannerStyle(g.banner)}>
                      {g.icon || '🛡️'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-white font-heading font-bold text-lg truncate">{g.name}</h3>
                        <span
                          className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded"
                          style={g.privacy === 'open'
                            ? { background: 'rgba(16,185,129,0.15)', color: '#10b981' }
                            : { background: 'rgba(148,163,184,0.15)', color: '#94a3b8' }}
                        >
                          {g.privacy === 'open' ? 'Open' : 'Closed'}
                        </span>
                      </div>
                      {g.motto && <p className="text-gray-400 text-xs italic truncate">"{g.motto}"</p>}
                      <div className="flex items-center gap-4 mt-2 text-[11px] font-mono text-gray-400">
                        <span className="flex items-center gap-1"><Users size={11} /> {g.memberCount}/{g.memberCap}</span>
                        <span className="flex items-center gap-1"><Trophy size={11} /> #{g.rank}</span>
                        <span className="flex items-center gap-1" style={{ color: NEON }}><Sparkles size={11} /> {formatGlory(g.gloryPoints)}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleJoin(g)}
                    disabled={!!joiningId || full}
                    className="w-full mt-3 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                    style={{
                      background: g.privacy === 'open' ? 'rgba(0,212,255,0.15)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${g.privacy === 'open' ? 'rgba(0,212,255,0.4)' : 'rgba(255,255,255,0.12)'}`,
                      color: g.privacy === 'open' ? NEON : '#cbd5e1',
                    }}
                  >
                    {full ? (
                      'Guild Full'
                    ) : joiningId === g.id ? (
                      'Joining…'
                    ) : g.privacy === 'open' ? (
                      <><LogIn size={14} /> Enter Guild</>
                    ) : (
                      <><Clock size={14} /> Request to Join</>
                    )}
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {showCreate && (
          <CreateGuildModal
            isPremium={isPremium}
            onUpgradePro={() => { setShowCreate(false); onUpgradePro(); }}
            onClose={() => setShowCreate(false)}
            onCreated={(_g: Guild) => { setShowCreate(false); onToast?.('SUCCESS', 'Guild forged!', 'You are now the Guild Master.'); onJoined(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

function formatGlory(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export default GuildBrowser;
