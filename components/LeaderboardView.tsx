
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Crown, Medal, ChevronUp, RefreshCw, Search, Flame, Zap, Swords, Shield } from 'lucide-react';
import { PlayerData } from '../types';
import { API_BASE } from '../lib/apiConfig';
import { getPlayerAuthHeaders } from '../lib/playerApi';

interface LeaderboardEntry {
  username: string;
  name: string;
  total_xp: number;
  level: number;
  rank: string;
}

interface LeaderboardViewProps {
  player: PlayerData;
}

const RANK_COLORS: Record<string, string> = {
  E: '#78716c',
  D: '#c2410c',
  C: '#60a5fa',
  B: '#06b6d4',
  A: '#eab308',
  S: '#a855f7',
};

const RANK_GLOW: Record<string, string> = {
  E: 'rgba(120,113,108,0.3)',
  D: 'rgba(194,65,12,0.3)',
  C: 'rgba(96,165,250,0.3)',
  B: 'rgba(6,182,212,0.3)',
  A: 'rgba(234,179,8,0.3)',
  S: 'rgba(168,85,247,0.4)',
};

const LeaderboardView: React.FC<LeaderboardViewProps> = ({ player }) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [myRank, setMyRank] = useState<number | null>(null);
  const myRowRef = useRef<HTMLDivElement>(null);

  const fetchLeaderboard = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const res = await fetch(`${API_BASE}/api/leaderboard`, {
        credentials: 'include',
        headers: { ...getPlayerAuthHeaders() },
      });
      if (res.ok) {
        const data: LeaderboardEntry[] = await res.json();
        setEntries(data);
        // Find current user's rank
        const idx = data.findIndex(
          (e) => e.username === player.username || e.name === player.name
        );
        setMyRank(idx >= 0 ? idx + 1 : null);
      }
    } catch {
      /* offline — keep stale data */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [player.username, player.name]);

  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(() => fetchLeaderboard(), 30_000); // refresh every 30s
    return () => clearInterval(interval);
  }, [fetchLeaderboard]);

  const scrollToMe = () => {
    myRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const filtered = searchQuery.trim()
    ? entries.filter(
        (e) =>
          (e.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (e.name || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : entries;

  const getMedalIcon = (pos: number) => {
    if (pos === 0) return <Crown size={18} className="text-yellow-400" />;
    if (pos === 1) return <Medal size={18} className="text-gray-300" />;
    if (pos === 2) return <Medal size={18} className="text-amber-600" />;
    return null;
  };

  return (
    <div className="w-full min-h-screen pb-32 font-mono">
      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: 'rgba(168,85,247,0.12)',
                border: '1px solid rgba(168,85,247,0.25)',
              }}
            >
              <Trophy size={20} className="text-purple-400" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white uppercase tracking-tighter">
                Leaderboard
              </h1>
              <p className="text-[10px] text-gray-500 tracking-[0.2em] uppercase">
                Top {entries.length} Hunters
              </p>
            </div>
          </div>
          <button
            onClick={() => fetchLeaderboard(true)}
            className="w-9 h-9 flex items-center justify-center rounded-lg transition-all active:scale-90"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <RefreshCw
              size={16}
              className={`text-gray-400 ${refreshing ? 'animate-spin' : ''}`}
            />
          </button>
        </div>

        {/* My Rank Card */}
        {myRank && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 rounded-xl p-4 cursor-pointer active:scale-[0.98] transition-transform"
            style={{
              background: 'linear-gradient(135deg, rgba(168,85,247,0.12) 0%, rgba(0,210,255,0.06) 100%)',
              border: '1px solid rgba(168,85,247,0.2)',
            }}
            onClick={scrollToMe}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-2xl font-black text-purple-400">#{myRank}</div>
                <div>
                  <div className="text-sm font-bold text-white">
                    {player.username || player.name}
                  </div>
                  <div className="text-[10px] text-gray-500">
                    Level {player.level} • {player.totalXp?.toLocaleString() || 0} XP
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-purple-400">
                <ChevronUp size={14} />
                View
              </div>
            </div>
          </motion.div>
        )}

        {/* Search */}
        <div className="mt-4 relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
          />
          <input
            type="text"
            placeholder="Search hunters..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-purple-500/50 transition-all"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          />
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <Swords size={24} className="text-purple-400" />
          </motion.div>
          <span className="text-xs text-gray-500 font-mono tracking-widest">
            LOADING RANKINGS...
          </span>
        </div>
      )}

      {/* No Results */}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Shield size={24} className="text-gray-600" />
          <span className="text-xs text-gray-500 font-mono tracking-widest">
            {searchQuery ? 'NO HUNTERS FOUND' : 'LEADERBOARD EMPTY'}
          </span>
        </div>
      )}

      {/* Leaderboard List */}
      {!loading && filtered.length > 0 && (
        <div className="px-4">
          <AnimatePresence>
            {filtered.map((entry, index) => {
              const isMe =
                entry.username === player.username || entry.name === player.name;
              const rankColor = RANK_COLORS[entry.rank] || '#78716c';
              const rankGlow = RANK_GLOW[entry.rank] || 'rgba(120,113,108,0.2)';
              const isTop3 = index < 3;

              return (
                <motion.div
                  key={entry.username || entry.name || index}
                  ref={isMe ? myRowRef : undefined}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(index * 0.03, 0.5) }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-1.5 transition-all ${
                    isMe ? 'ring-1 ring-purple-500/40' : ''
                  }`}
                  style={{
                    background: isMe
                      ? 'rgba(168,85,247,0.08)'
                      : isTop3
                      ? 'rgba(255,255,255,0.03)'
                      : 'transparent',
                    border: isMe
                      ? '1px solid rgba(168,85,247,0.15)'
                      : isTop3
                      ? '1px solid rgba(255,255,255,0.04)'
                      : '1px solid transparent',
                  }}
                >
                  {/* Position */}
                  <div className="w-8 flex items-center justify-center flex-shrink-0">
                    {getMedalIcon(index) || (
                      <span
                        className={`text-xs font-black ${
                          isMe ? 'text-purple-400' : 'text-gray-500'
                        }`}
                      >
                        {index + 1}
                      </span>
                    )}
                  </div>

                  {/* Rank Badge */}
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-black"
                    style={{
                      background: `${rankColor}18`,
                      border: `1px solid ${rankColor}40`,
                      color: rankColor,
                      boxShadow: isTop3 ? `0 0 12px ${rankGlow}` : 'none',
                    }}
                  >
                    {entry.rank || 'E'}
                  </div>

                  {/* Player Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-bold truncate ${
                          isMe ? 'text-purple-300' : 'text-white'
                        }`}
                      >
                        {entry.username || entry.name || 'Unknown'}
                      </span>
                      {isMe && (
                        <span className="text-[8px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider border border-purple-500/20">
                          You
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-gray-500 flex items-center gap-2">
                      <span className="flex items-center gap-0.5">
                        <Zap size={9} /> Lv.{entry.level}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Flame size={9} />{' '}
                        {(entry.total_xp || 0).toLocaleString()} XP
                      </span>
                    </div>
                  </div>

                  {/* XP Bar (visual) */}
                  <div className="w-16 flex-shrink-0">
                    <div
                      className="h-1 rounded-full overflow-hidden"
                      style={{ background: 'rgba(255,255,255,0.06)' }}
                    >
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: rankColor }}
                        initial={{ width: 0 }}
                        animate={{
                          width: `${Math.min(
                            100,
                            ((entry.total_xp || 0) /
                              Math.max(entries[0]?.total_xp || 1, 1)) *
                              100
                          )}%`,
                        }}
                        transition={{ duration: 0.8, delay: Math.min(index * 0.03, 0.5) }}
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default LeaderboardView;
