import React, { useState, useEffect } from 'react';
import { X, Loader2, Sword, ScrollText, Target, BarChart3, Clock, CheckCircle, XCircle, AlertTriangle, Zap, Coins, Key, Shield, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { API_BASE } from '../lib/apiConfig';

type TabKey = 'OVERVIEW' | 'QUESTS' | 'ACTIVITY' | 'GOALS' | 'RAW';

interface AdminUserProfileModalProps {
  userId: string;
  adminToken: string;
  onClose: () => void;
  initialTab?: TabKey;
}

const RANK_COLORS: Record<string, string> = {
  E: '#6b7280', D: '#fb923c', C: '#facc15', B: '#4ade80', A: '#7EB8D4', S: '#9ACDE3', UNRANKED: '#6b7280',
};

const LOG_TYPE_COLORS: Record<string, string> = {
  XP: '#7EB8D4',
  LOOT: '#fbbf24',
  PENALTY: '#ef4444',
  WARNING: '#f97316',
  SYSTEM: '#7EB8D4',
  QUEST: '#4ade80',
  WORKOUT: '#9ACDE3',
  LEVEL_UP: '#9ACDE3',
  INFO: '#9ca3af',
};

function formatTs(ts: number | string) {
  if (!ts) return '—';
  const d = new Date(typeof ts === 'string' ? ts : ts);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AdminUserProfileModal({ userId, adminToken, onClose, initialTab = 'OVERVIEW' }: AdminUserProfileModalProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [questFilter, setQuestFilter] = useState<'all' | 'completed' | 'failed' | 'active'>('all');
  const [logFilter, setLogFilter] = useState<string>('all');
  const [expandedQuestId, setExpandedQuestId] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory();
  }, [userId]);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${userId}/history`, {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (err: any) {
      setError(err.message || 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { key: 'OVERVIEW' as const, label: 'Overview', icon: <BarChart3 size={14} /> },
    { key: 'QUESTS' as const, label: 'Quests', icon: <Sword size={14} /> },
    { key: 'ACTIVITY' as const, label: 'Activity Log', icon: <ScrollText size={14} /> },
    { key: 'GOALS' as const, label: 'Goals', icon: <Target size={14} /> },
    { key: 'RAW' as const, label: 'Raw JSON', icon: <Shield size={14} /> },
  ];

  const filteredQuests = data?.quests?.filter((q: any) => {
    if (questFilter === 'completed') return q.isCompleted;
    if (questFilter === 'failed') return q.failed;
    if (questFilter === 'active') return !q.isCompleted && !q.failed;
    return true;
  }) || [];

  const filteredLogs = data?.logs?.filter((l: any) => {
    if (logFilter === 'all') return true;
    return l.type === logFilter;
  }) || [];

  const uniqueLogTypes = [...new Set((data?.logs || []).map((l: any) => l.type))].filter(Boolean) as string[];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3" onClick={onClose}>
      <div
        className="bg-[#0a0a0f] border border-gray-700/50 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800/50">
          <div className="flex items-center gap-3">
            {data?.summary ? (
              <>
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black"
                  style={{ background: `${RANK_COLORS[data.summary.rank] || '#6b7280'}20`, color: RANK_COLORS[data.summary.rank] || '#6b7280' }}
                >
                  {data.summary.rank}
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">{data.summary.username || data.summary.name || 'Unknown'}</h2>
                  <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono">
                    <span>Lv{data.summary.level}</span>
                    <span>·</span>
                    <span>{data.summary.totalXp?.toLocaleString()} XP</span>
                    <span>·</span>
                    <span>{data.summary.country || '—'}</span>
                  </div>
                </div>
              </>
            ) : (
              <h2 className="text-sm font-bold text-white uppercase tracking-widest">Player Profile</h2>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5 pt-3 pb-2 border-b border-gray-800/30 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                activeTab === t.key
                  ? 'bg-white/10 text-white border border-white/10'
                  : 'text-gray-600 hover:text-gray-400 border border-transparent'
              }`}
            >
              {t.icon}
              {t.label}
              {t.key === 'QUESTS' && data?.questStats && (
                <span className="text-[9px] text-gray-500 ml-1">({data.questStats.total})</span>
              )}
              {t.key === 'ACTIVITY' && data?.logs && (
                <span className="text-[9px] text-gray-500 ml-1">({data.logs.length})</span>
              )}
              {t.key === 'GOALS' && data?.goals && (
                <span className="text-[9px] text-gray-500 ml-1">({data.goals.length})</span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading && (
            <div className="flex items-center justify-center py-16 gap-2">
              <Loader2 className="w-5 h-5 text-[#7EB8D4] animate-spin" />
              <span className="text-xs text-gray-500 font-mono">Loading hunter data...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-950/30 border border-red-800/50 rounded-xl p-4 text-center">
              <p className="text-sm text-red-400 font-mono">{error}</p>
              <button onClick={fetchHistory} className="mt-2 text-xs text-red-400 underline">Retry</button>
            </div>
          )}

          {!loading && !error && data && (
            <>
              {/* ── OVERVIEW ── */}
              {activeTab === 'OVERVIEW' && (
                <div className="space-y-4">
                  {/* Stat cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: 'Total XP', value: data.summary.totalXp?.toLocaleString() || '0', icon: <Zap size={14} />, color: '#7EB8D4' },
                      { label: 'Gold', value: data.summary.gold?.toLocaleString() || '0', icon: <Coins size={14} />, color: '#fbbf24' },
                      { label: 'Keys', value: data.summary.keys || 0, icon: <Key size={14} />, color: '#9ACDE3' },
                      { label: 'Streak', value: `${data.summary.streak || 0} days`, icon: <TrendingUp size={14} />, color: '#fb923c' },
                    ].map(s => (
                      <div key={s.label} className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span style={{ color: s.color }}>{s.icon}</span>
                          <span className="text-[10px] text-gray-600 font-mono uppercase tracking-wider">{s.label}</span>
                        </div>
                        <div className="text-lg font-black text-white">{s.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Quest stats */}
                  <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Quest Statistics</h3>
                    <div className="grid grid-cols-4 gap-3">
                      <div className="text-center">
                        <div className="text-2xl font-black text-white">{data.questStats?.total || 0}</div>
                        <div className="text-[10px] text-gray-600 font-mono">Total</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-black text-green-400">{data.questStats?.completed || 0}</div>
                        <div className="text-[10px] text-gray-600 font-mono">Completed</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-black text-red-400">{data.questStats?.failed || 0}</div>
                        <div className="text-[10px] text-gray-600 font-mono">Failed</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-black text-[#7EB8D4]">{data.questStats?.totalXpEarned?.toLocaleString() || 0}</div>
                        <div className="text-[10px] text-gray-600 font-mono">XP Earned</div>
                      </div>
                    </div>
                  </div>

                  {/* Core stats */}
                  {data.summary.stats && Object.keys(data.summary.stats).length > 0 && (
                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Core Stats</h3>
                      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                        {Object.entries(data.summary.stats).map(([k, v]) => (
                          <div key={k} className="text-center">
                            <div className="text-lg font-black text-white">{v as number}</div>
                            <div className="text-[9px] text-gray-600 font-mono uppercase">{k}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Player info */}
                  <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Player Info</h3>
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      {[
                        ['Job', data.summary.job],
                        ['Title', data.summary.title],
                        ['HP', `${data.summary.hp}/${data.summary.maxHp}`],
                        ['MP', `${data.summary.mp}/${data.summary.maxMp}`],
                        ['Fatigue', data.summary.fatigue],
                        ['Timezone', data.summary.timezone || '—'],
                        ['Banned', data.summary.isBanned ? 'YES' : 'No'],
                        ['Strikes', `${data.summary.cheatStrikes}/5`],
                        ['Joined', formatTs(data.summary.createdAt)],
                        ['Last Update', formatTs(data.summary.updatedAt)],
                      ].map(([label, val]) => (
                        <div key={label as string} className="flex justify-between py-1 border-b border-white/3">
                          <span className="text-gray-600">{label}</span>
                          <span className="text-gray-300">{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── QUESTS ── */}
              {activeTab === 'QUESTS' && (
                <div className="space-y-3">
                  {/* Filters */}
                  <div className="flex gap-2 flex-wrap">
                    {(['all', 'completed', 'failed', 'active'] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setQuestFilter(f)}
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                          questFilter === f
                            ? 'bg-[#7EB8D4]/10 text-[#7EB8D4] border border-[#7EB8D4]/20'
                            : 'text-gray-600 hover:text-gray-400 border border-transparent'
                        }`}
                      >
                        {f} {f === 'all' ? `(${data.questStats?.total || 0})` :
                              f === 'completed' ? `(${data.questStats?.completed || 0})` :
                              f === 'failed' ? `(${data.questStats?.failed || 0})` :
                              `(${data.questStats?.active || 0})`}
                      </button>
                    ))}
                  </div>

                  {/* Quest list */}
                  {filteredQuests.length === 0 ? (
                    <div className="text-center py-8 text-gray-600 text-xs font-mono">No quests found</div>
                  ) : (
                    <div className="space-y-2">
                      {filteredQuests.map((q: any) => {
                        const statusColor = q.isCompleted ? '#4ade80' : q.failed ? '#ef4444' : '#facc15';
                        const statusLabel = q.isCompleted ? 'COMPLETED' : q.failed ? 'FAILED' : 'ACTIVE';
                        const statusBg = q.isCompleted ? 'bg-green-500/8 border-green-500/15' : q.failed ? 'bg-red-500/8 border-red-500/15' : 'bg-yellow-500/8 border-yellow-500/15';
                        return (
                        <div
                          key={q.id}
                          className={`border rounded-xl p-3.5 cursor-pointer hover:bg-white/[0.03] transition-colors ${statusBg}`}
                          onClick={() => setExpandedQuestId(expandedQuestId === q.id ? null : q.id)}
                        >
                          {/* Row 1: Name + Status badge */}
                          <div className="flex items-start gap-3">
                            {/* Rank badge */}
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-black flex-shrink-0"
                              style={{ background: `${RANK_COLORS[q.rank] || '#6b7280'}20`, color: RANK_COLORS[q.rank] || '#6b7280' }}
                            >
                              {q.rank}
                            </div>

                            {/* Title & tags */}
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-bold text-white leading-tight">{q.title}</div>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                {q.isDaily && (
                                  <span className="text-[8px] font-bold text-[#7EB8D4] bg-[#7EB8D4]/10 border border-[#7EB8D4]/20 px-1.5 py-0.5 rounded">DAILY</span>
                                )}
                                {q.goalTitle && (
                                  <span className="text-[8px] font-bold text-[#7EB8D4] bg-[#7EB8D4]/10 border border-[#7EB8D4]/20 px-1.5 py-0.5 rounded truncate max-w-[140px]">GOAL: {q.goalTitle}</span>
                                )}
                                {q.hasPact && (
                                  <span className="text-[8px] font-bold text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-1.5 py-0.5 rounded">{q.pactAmount}G PACT</span>
                                )}
                                <span className="text-[9px] text-gray-600 font-mono">{q.category}</span>
                              </div>
                            </div>

                            {/* Status badge */}
                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                              <span
                                className="text-[9px] font-black px-2 py-0.5 rounded-md tracking-wider"
                                style={{ color: statusColor, background: `${statusColor}15`, border: `1px solid ${statusColor}30` }}
                              >
                                {statusLabel}
                              </span>
                              {expandedQuestId === q.id ? <ChevronUp size={14} className="text-gray-600" /> : <ChevronDown size={14} className="text-gray-600" />}
                            </div>
                          </div>

                          {/* Row 2: Time + Rewards summary (always visible) */}
                          <div className="flex items-center gap-4 mt-2.5 ml-11">
                            {/* Created time */}
                            <div className="flex items-center gap-1">
                              <Clock size={11} className="text-gray-600" />
                              <span className="text-[10px] text-gray-500 font-mono">
                                Created: {formatTs(q.createdAt)}
                              </span>
                            </div>

                            {/* Completion time */}
                            {q.completedAt && (
                              <div className="flex items-center gap-1">
                                <CheckCircle size={11} className="text-green-500" />
                                <span className="text-[10px] text-green-400/70 font-mono">
                                  Done: {formatTs(q.completedAt)}
                                </span>
                              </div>
                            )}
                            {q.failed && !q.completedAt && (
                              <div className="flex items-center gap-1">
                                <XCircle size={11} className="text-red-500" />
                                <span className="text-[10px] text-red-400/70 font-mono">Failed</span>
                              </div>
                            )}
                          </div>

                          {/* Row 3: Rewards earned (always visible) */}
                          <div className="flex items-center gap-3 mt-1.5 ml-11">
                            <div className="flex items-center gap-1">
                              <Zap size={11} style={{ color: q.isCompleted ? '#7EB8D4' : '#4b5563' }} />
                              <span className="text-[10px] font-bold font-mono" style={{ color: q.isCompleted ? '#7EB8D4' : '#4b5563' }}>
                                {q.isCompleted ? `+${q.xpReward} XP earned` : q.failed ? `${q.xpReward} XP (not earned)` : `${q.xpReward} XP reward`}
                              </span>
                            </div>
                            {q.estimatedDuration && (
                              <span className="text-[9px] text-gray-600 font-mono">{q.estimatedDuration} min</span>
                            )}
                          </div>

                          {/* Expanded details */}
                          {expandedQuestId === q.id && (
                            <div className="mt-3 pt-3 border-t border-white/5 space-y-1.5 text-[11px] font-mono text-gray-500 ml-11">
                              {q.description && <p><span className="text-gray-600">Description:</span> <span className="text-gray-400">{q.description}</span></p>}
                              {q.categories?.length > 0 && <p><span className="text-gray-600">Categories:</span> <span className="text-gray-400">{q.categories.join(', ')}</span></p>}
                              {q.hasPact && <p><span className="text-gray-600">Pact:</span> <span className="text-yellow-400">{q.pactAmount}G — {q.pactStatus}</span></p>}
                              <p><span className="text-gray-600">Quest ID:</span> <span className="text-gray-700">{q.id}</span></p>
                            </div>
                          )}
                        </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── ACTIVITY LOG ── */}
              {activeTab === 'ACTIVITY' && (
                <div className="space-y-3">
                  {/* Type filter */}
                  <div className="flex gap-1.5 flex-wrap">
                    <button
                      onClick={() => setLogFilter('all')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                        logFilter === 'all' ? 'bg-white/10 text-white border border-white/10' : 'text-gray-600 hover:text-gray-400 border border-transparent'
                      }`}
                    >
                      All ({data.logs?.length || 0})
                    </button>
                    {uniqueLogTypes.map(t => (
                      <button
                        key={t}
                        onClick={() => setLogFilter(t)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                          logFilter === t ? 'bg-white/10 text-white border border-white/10' : 'text-gray-600 hover:text-gray-400 border border-transparent'
                        }`}
                        style={logFilter === t ? { color: LOG_TYPE_COLORS[t] || '#9ca3af', borderColor: `${LOG_TYPE_COLORS[t] || '#9ca3af'}30` } : {}}
                      >
                        {t} ({data.logs?.filter((l: any) => l.type === t).length || 0})
                      </button>
                    ))}
                  </div>

                  {/* Log entries */}
                  {filteredLogs.length === 0 ? (
                    <div className="text-center py-8 text-gray-600 text-xs font-mono">No activity logs</div>
                  ) : (
                    <div className="space-y-1">
                      {filteredLogs.map((l: any, i: number) => (
                        <div key={l.id || i} className="flex items-start gap-3 py-2 border-b border-white/3">
                          {/* Type badge */}
                          <span
                            className="text-[9px] font-black font-mono px-2 py-0.5 rounded flex-shrink-0 mt-0.5 uppercase tracking-wider"
                            style={{
                              color: LOG_TYPE_COLORS[l.type] || '#9ca3af',
                              background: `${LOG_TYPE_COLORS[l.type] || '#9ca3af'}10`,
                              border: `1px solid ${LOG_TYPE_COLORS[l.type] || '#9ca3af'}20`,
                            }}
                          >
                            {l.type}
                          </span>

                          {/* Message */}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-300 font-mono leading-relaxed">{l.message}</p>
                          </div>

                          {/* Timestamp */}
                          <span className="text-[9px] text-gray-700 font-mono flex-shrink-0 whitespace-nowrap">
                            {formatTs(l.timestamp)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── GOALS ── */}
              {activeTab === 'GOALS' && (
                <div className="space-y-3">
                  {(!data.goals || data.goals.length === 0) ? (
                    <div className="text-center py-8 text-gray-600 text-xs font-mono">No goals created</div>
                  ) : (
                    data.goals.map((g: any) => (
                      <div key={g.id} className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black"
                            style={{ background: `${RANK_COLORS[g.goal_rank] || '#6b7280'}20`, color: RANK_COLORS[g.goal_rank] || '#6b7280' }}
                          >
                            {g.goal_rank}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-white truncate">{g.title}</h4>
                            <div className="flex items-center gap-2 text-[10px] text-gray-600 font-mono mt-0.5">
                              <span>{g.category}</span>
                              <span>·</span>
                              <span>{g.total_duration_days} days</span>
                              <span>·</span>
                              <span>{g.daily_commitment_min}min/day</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              g.status === 'ACTIVE' ? 'bg-green-500/10 text-green-400' :
                              g.status === 'PAUSED' ? 'bg-yellow-500/10 text-yellow-400' :
                              g.status === 'COMPLETED' ? 'bg-[#7EB8D4]/10 text-[#7EB8D4]' :
                              'bg-red-500/10 text-red-400'
                            }`}>
                              {g.status}
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-[10px] font-mono">
                          <div><span className="text-gray-600">Streak:</span> <span className="text-white">{g.streak}</span></div>
                          <div><span className="text-gray-600">Success %:</span> <span className="text-white">{g.success_probability}%</span></div>
                          <div><span className="text-gray-600">Created:</span> <span className="text-white">{formatTs(g.created_at)}</span></div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* ── RAW JSON ── */}
              {activeTab === 'RAW' && (
                <pre className="bg-black border border-gray-800 rounded-xl p-4 text-[10px] text-green-400 font-mono overflow-x-auto whitespace-pre-wrap break-all max-h-[60vh]">
                  {JSON.stringify(data, null, 2)}
                </pre>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
