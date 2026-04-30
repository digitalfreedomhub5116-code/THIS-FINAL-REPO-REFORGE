import React, { useState, useRef, useEffect, useMemo, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, Store as StoreIcon, Package, BarChart3, Award,
  Terminal, MessageCircle, User as UserIcon, MoreHorizontal,
  X, ChevronRight, Lock as LockIcon,
  Swords, Dumbbell, Brain, Users, Shield, Target, Zap,
} from 'lucide-react';
import { PlayerData, HealthProfile, Outfit, Tab, Rank, CoreStats } from '../types';
import AvatarWithBorder from './AvatarWithBorder';
import RankBadge from './RankBadge';
import type { RankType } from './RankBadge';
import { getItemById } from '../utils/storeItems';
import { getEconomy } from '../utils/storeEconomy';

// Lazy-load the existing ProfileView — reused as the Config/Logs/More drawer
const ProfileView = lazy(() => import('./ProfileView'));
const RankProgressionCard = lazy(() => import('./RankProgressionCard'));
const EvaluationMatrix = lazy(() => import('./StatsRadar'));
const RankUpCinematic = lazy(() => import('./RankUpCinematic'));

// ─── Rank ladder (mirrors lib/levelSystem.ts) ────────────────────────
const RANK_LADDER: { rank: Exclude<Rank, 'UNRANKED'>; minLevel: number; color: string }[] = [
  { rank: 'E', minLevel: 1,  color: '#9ca3af' },
  { rank: 'D', minLevel: 11, color: '#4ade80' },
  { rank: 'C', minLevel: 27, color: '#60a5fa' },
  { rank: 'B', minLevel: 39, color: '#9ACDE3' },
  { rank: 'A', minLevel: 55, color: '#facc15' },
  { rank: 'S', minLevel: 80, color: '#f87171' },
];

interface YouViewProps {
  player: PlayerData;
  equippedOutfit?: Outfit;
  onUpdate: (data: { name: string; username: string; job: string; title: string; healthProfile?: HealthProfile }) => void;
  onAvatarChange?: (newUrl: string) => void;
  onLogout: () => void;
  onDeleteAccount?: () => Promise<void>;
  onNavigate?: (tab: Tab) => void;
  onOpenDusk?: () => void;
  /** [TEST] Override player rank for badge testing. Remove after testing. */
  onTestSetRank?: (rank: string) => void;
}




// ─── Mono-cyan color based on stat value ─────────────────────────────
function getCyanShade(value: number, max: number): string {
  const pct = Math.min(1, value / max);
  if (pct < 0.25) return '#5a9ab0';       // dull cyan
  if (pct < 0.5) return '#7EB8D4';        // medium cyan
  if (pct < 0.75) return '#9ad0e8';       // bright cyan
  return '#bce8fa';                        // vivid cyan
}

// ─── Mini circular stat ring ─────────────────────────────────────────
const StatCircle: React.FC<{
  label: string; value: number; max: number; icon: React.ReactNode; delay: number;
}> = ({ label, value, max, icon, delay }) => {
  const pct = Math.min(100, (value / max) * 100);
  const r = 22; const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color = getCyanShade(value, max);
  return (
    <motion.div
      className="flex flex-col items-center gap-0.5"
      initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.4 }}
    >
      <div className="relative" style={{ width: 52, height: 52 }}>
        <svg className="w-full h-full -rotate-90" viewBox="0 0 52 52">
          <circle cx="26" cy="26" r={r} fill="none" stroke="rgba(126,184,212,0.1)" strokeWidth="3.5" />
          <motion.circle
            cx="26" cy="26" r={r} fill="none" stroke={color} strokeWidth="3.5"
            strokeLinecap="round" strokeDasharray={circ} initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: offset }}
            transition={{ delay: delay + 0.2, duration: 0.8, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center" style={{ color }}>
          {icon}
        </div>
      </div>
      <div className="text-[9px] font-mono font-bold tracking-wider text-gray-500">{label}</div>
      <div className="text-[10px] font-mono font-black" style={{ color }}>{Math.floor(value)}</div>
    </motion.div>
  );
};

// ─── Profile hero: Banner → Avatar → Stats → Score → Glass Curve ─────
const ProfileHero: React.FC<{
  player: PlayerData;
  onRankTap: () => void;
}> = ({ player, onRankTap }) => {
  const economy = getEconomy();
  const bannerItemId = economy.equipped.banner;
  const bannerItem = bannerItemId ? getItemById(bannerItemId) : null;
  const bannerSrc = bannerItem?.bannerImage || '/banners/default.jpg';
  const borderId = player.equippedBorder || economy.equipped.border || null;

  const stats = player.stats || {} as CoreStats;
  const statValues = [
    stats.strength || 0, stats.intelligence || 0, stats.discipline || 0,
    stats.social || 0, stats.focus || 0, stats.willpower || 0,
  ];
  const forgeScore = Math.floor(statValues.reduce((a, b) => a + b, 0) / 6);
  const maxStat = 200;

  const STATS_RING = [
    { key: 'STR', value: stats.strength || 0, icon: <Dumbbell size={14} /> },
    { key: 'INT', value: stats.intelligence || 0, icon: <Brain size={14} /> },
    { key: 'DIS', value: stats.discipline || 0, icon: <Shield size={14} /> },
    { key: 'SOC', value: stats.social || 0, icon: <Users size={14} /> },
    { key: 'FOC', value: stats.focus || 0, icon: <Target size={14} /> },
    { key: 'WIL', value: stats.willpower || 0, icon: <Zap size={14} /> },
  ];

  return (
    <div className="relative" style={{ marginBottom: 16 }}>
      {/* ── Banner ── */}
      <div className="relative w-full overflow-hidden" style={{ height: 160, borderRadius: '0 0 16px 16px', background: '#000' }}>
        <img src={bannerSrc} alt="" className="w-full h-full object-cover" style={{ objectPosition: 'center center' }} />
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{ height: 100, background: 'linear-gradient(to top, rgba(5,5,10,0.95) 0%, transparent 100%)' }} />
        {/* Name — bottom left */}
        <div className="absolute bottom-3 left-4 z-10" style={{ maxWidth: 'calc(50% - 60px)' }}>
          <div className="text-white font-bold text-lg leading-tight truncate" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.8)' }}>
            {player.name || 'Player'}
          </div>
        </div>
        {/* Rank badge — center-right of banner */}
        <button onClick={onRankTap} className="absolute right-3 z-10" style={{ top: '50%', transform: 'translateY(-50%)' }} aria-label="View rank">
          <RankBadge rank={(player.rank || 'E') as RankType} size={54} animated showLabel />
        </button>
      </div>

      {/* ── Centered Avatar with equipped border — overlaps banner ── */}
      <div className="flex justify-center" style={{ marginTop: -44 }}>
        <AvatarWithBorder
          avatarUrl={player.avatarUrl}
          borderId={borderId}
          size={88}
          style={{ boxShadow: '0 0 24px rgba(0,0,0,0.9)' }}
        />
      </div>

      {/* ── 6 Stat Circles (mono cyan) ── */}
      <div className="flex justify-center gap-2 px-2 mt-5">
        {STATS_RING.map((s, i) => (
          <StatCircle key={s.key} label={s.key} value={s.value} max={maxStat} icon={s.icon} delay={0.1 + i * 0.06} />
        ))}
      </div>

      {/* ── Forge Score ── */}
      <div className="flex flex-col items-center mt-4">
        <motion.div
          className="font-black leading-none"
          style={{ fontSize: 48, color: '#7EB8D4', textShadow: '0 0 30px rgba(126,184,212,0.3)', letterSpacing: '-0.03em' }}
          initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3, duration: 0.5 }}
        >
          {forgeScore}
        </motion.div>
        <div className="text-[8px] font-mono font-bold tracking-[0.25em] text-gray-500 mt-1">FORGE SCORE</div>
      </div>

      {/* ── Potential Distribution — Liquid Glass Panel ── */}
      <div className="px-4 mt-5">
        <div style={{
          background: 'linear-gradient(135deg, rgba(126,184,212,0.06) 0%, rgba(10,10,20,0.7) 50%, rgba(126,184,212,0.04) 100%)',
          border: '1px solid rgba(126,184,212,0.12)',
          borderRadius: 16,
          padding: '20px 16px 14px',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          boxShadow: 'inset 0 1px 0 rgba(126,184,212,0.08), 0 8px 32px rgba(0,0,0,0.3)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Glass shine overlay */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
            background: 'linear-gradient(90deg, transparent 10%, rgba(126,184,212,0.2) 50%, transparent 90%)',
          }} />
          <div className="text-[8px] font-mono font-bold tracking-[0.2em] text-gray-500 text-center mb-3">
            POTENTIAL DISTRIBUTION
          </div>
          <ForgeScoreCurve score={forgeScore} primary="#7EB8D4" />
        </div>
      </div>
    </div>
  );
};

// ─── Bell Curve SVG (liquid glass style) ─────────────────────────────
function ForgeScoreCurve({ score, primary = '#7EB8D4' }: { score: number; primary?: string }) {
  const W = 300, H = 100, pad = 20, bot = 20;
  const curveH = H - bot;
  const pts: string[] = [];
  for (let i = 0; i <= 80; i++) {
    const t = i / 80;
    const x = pad + t * (W - pad * 2);
    const g = Math.exp(-0.5 * Math.pow((t - 0.5) / 0.17, 2));
    pts.push(`${x},${curveH - g * (curveH - 10)}`);
  }
  const poly = pts.join(' ');
  const fill = `${pad},${curveH} ${poly} ${W - pad},${curveH}`;
  const clamped = Math.max(0, Math.min(200, score));
  const sT = clamped / 200;
  const sX = pad + sT * (W - pad * 2);
  const sG = Math.exp(-0.5 * Math.pow((sT - 0.5) / 0.17, 2));
  const sY = curveH - sG * (curveH - 10);
  const toRgba = (hex: string, a: number) => {
    const c = hex.replace('#', '');
    return `rgba(${parseInt(c.substring(0, 2), 16)},${parseInt(c.substring(2, 4), 16)},${parseInt(c.substring(4, 6), 16)},${a})`;
  };
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      <defs>
        <linearGradient id="fsc-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={toRgba(primary, 0.15)} /><stop offset="100%" stopColor={toRgba(primary, 0)} />
        </linearGradient>
        <linearGradient id="fsc-stroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={toRgba(primary, 0.1)} /><stop offset="30%" stopColor={primary} />
          <stop offset="70%" stopColor={primary} /><stop offset="100%" stopColor={toRgba(primary, 0.1)} />
        </linearGradient>
        <filter id="fsc-glow"><feGaussianBlur stdDeviation="3" result="cb" /><feMerge><feMergeNode in="cb" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      <polygon points={fill} fill="url(#fsc-fill)" />
      <polyline points={poly} fill="none" stroke="url(#fsc-stroke)" strokeWidth="2" strokeLinejoin="round" filter="url(#fsc-glow)" />
      <line x1={sX} y1={sY} x2={sX} y2={curveH} stroke={primary} strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
      <circle cx={sX} cy={sY} r="4.5" fill={primary} stroke="#0a0a14" strokeWidth="2" filter="url(#fsc-glow)" />
      <circle cx={sX} cy={sY} r="2" fill={primary} />
      <text x={sX} y={sY - 10} textAnchor="middle" fill={primary} fontSize="7" fontWeight="800" fontFamily="monospace">YOU</text>
      <text x={pad} y={H - 4} fill="rgba(255,255,255,0.2)" fontSize="7" fontFamily="monospace">0</text>
      <text x={W / 2} y={H - 4} textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="7" fontFamily="monospace">100</text>
      <text x={W - pad} y={H - 4} textAnchor="end" fill="rgba(255,255,255,0.2)" fontSize="7" fontFamily="monospace">200</text>
    </svg>
  );
}


// ─── Action tile — clean minimal icon ────────────────────────────────
const ActionTile: React.FC<{
  icon: React.ReactNode;
  label: string;
  badge?: string | number;
  accent?: string;
  isSoon?: boolean;
  onClick: () => void;
}> = ({ icon, label, badge, accent = '#7EB8D4', isSoon, onClick }) => (
  <button
    onClick={onClick}
    className="group relative flex flex-col items-center justify-center gap-1.5 py-3 active:scale-[0.92] transition-all duration-200"
  >
    {/* Icon */}
    <div className="relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200"
      style={{ background: `${accent}12`, color: accent }}
    >
      {icon}
      {badge !== undefined && badge !== 0 && (
        <div className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-white text-[8px] font-bold font-mono flex items-center justify-center">
          {badge}
        </div>
      )}
    </div>

    <div className="text-[9px] font-mono font-bold text-gray-400 tracking-wider uppercase">
      {label}
    </div>

    {isSoon && (
      <div className="absolute top-1 right-0 px-1 py-[1px] rounded text-[5px] font-mono font-bold tracking-widest uppercase text-gray-600">
        SOON
      </div>
    )}
  </button>
);

// ─── Journey log (last 7 days) ───────────────────────────────────────
const JourneyLog: React.FC<{ player: PlayerData }> = ({ player }) => {
  const days = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const out: { date: Date; label: string; num: number; hasActivity: boolean; isToday: boolean }[] = [];
    const logsByDay: Record<string, number> = {};
    (player.logs || []).forEach(l => {
      const d = new Date(l.timestamp);
      const k = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      logsByDay[k] = (logsByDay[k] || 0) + 1;
    });
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const k = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      out.push({
        date: d,
        label: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][d.getDay()],
        num: d.getDate(),
        hasActivity: !!logsByDay[k],
        isToday: i === 0,
      });
    }
    return out;
  }, [player.logs]);

  return (
    <div className="w-full rounded-2xl p-4 bg-white/[0.03] border border-white/[0.06]">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[11px] font-mono font-bold text-gray-300 tracking-widest">JOURNEY LOG</div>
        <button className="text-[10px] font-mono text-[#7EB8D4] hover:text-white transition flex items-center gap-0.5">
          View All <ChevronRight size={11} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div className={`text-[9px] font-mono tracking-widest ${d.isToday ? 'text-[#7EB8D4]' : 'text-gray-600'}`}>{d.label}</div>
            <div
              className={`w-full aspect-square rounded-lg flex items-center justify-center text-[11px] font-mono font-bold border transition ${
                d.isToday
                  ? 'border-[#7EB8D4] text-[#7EB8D4] bg-[#7EB8D4]/10'
                  : d.hasActivity
                    ? 'border-white/15 text-white bg-white/[0.05]'
                    : 'border-white/5 text-gray-600 bg-transparent'
              }`}
            >
              {d.num}
            </div>
            <div className="h-1.5 flex items-center">
              {d.hasActivity ? (
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: d.isToday ? '#7EB8D4' : '#4ade80' }} />
              ) : (
                <div className="w-1.5 h-1.5 rounded-full bg-transparent" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Rank ladder modal ───────────────────────────────────────────────
const RankLadderModal: React.FC<{ player: PlayerData; onClose: () => void; onTestSetRank?: (rank: string) => void }> = ({ player, onClose, onTestSetRank }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-[700] bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
    onClick={onClose}
  >
    <motion.div
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 60, opacity: 0 }}
      onClick={e => e.stopPropagation()}
      className="w-full max-w-md bg-[#0a0a14] border border-white/10 rounded-2xl p-5 space-y-4"
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-mono text-[#7EB8D4] tracking-widest">RANK PROGRESSION</div>
          <div className="text-[10px] text-gray-500 font-mono">
            {onTestSetRank ? '⚠ TAP TO SET (TEST)' : `Level ${player.level} · Current Rank: ${player.rank}`}
          </div>
        </div>
        <button onClick={onClose} className="p-1 rounded-full hover:bg-white/5"><X size={16} className="text-gray-400" /></button>
      </div>

      <div className="space-y-2">
        {RANK_LADDER.map((r) => {
          const reached = player.level >= r.minLevel;
          const isCurrent = player.rank === r.rank;
          return (
            <div
              key={r.rank}
              className={`flex items-center gap-3 p-3 rounded-xl border transition ${
                isCurrent
                  ? 'border-[#7EB8D4] bg-[#7EB8D4]/5'
                  : reached
                    ? 'border-white/10 bg-white/[0.03]'
                    : 'border-white/5 bg-transparent opacity-50'
              }`}
              style={{ cursor: onTestSetRank ? 'pointer' : 'default' }}
              onClick={() => onTestSetRank?.(r.rank)}
            >
              <RankBadge rank={r.rank as RankType} size={56} animated={isCurrent} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-white font-mono tracking-wide">RANK {r.rank}</div>
                <div className="text-[10px] font-mono text-gray-500">
                  {reached ? 'Unlocked' : `Requires Level ${r.minLevel}`}
                </div>
              </div>
              {isCurrent && (
                <div className="text-[9px] font-mono text-[#7EB8D4] font-bold tracking-widest px-2 py-1 rounded bg-[#7EB8D4]/10 border border-[#7EB8D4]/30">
                  YOU
                </div>
              )}
              {!reached && <LockIcon size={14} className="text-gray-600 shrink-0" />}
            </div>
          );
        })}
      </div>

      <div className="text-[10px] font-mono text-gray-500 text-center pt-2 border-t border-white/5">
        Next rank unlocks at Level{' '}
        {RANK_LADDER.find(r => r.minLevel > player.level)?.minLevel ?? '—'}
      </div>
    </motion.div>
  </motion.div>
);

// ─── Full-screen ProfileView drawer (reuses existing implementation) ──
const ProfileDrawer: React.FC<{
  player: PlayerData;
  onUpdate: YouViewProps['onUpdate'];
  onAvatarChange?: YouViewProps['onAvatarChange'];
  onLogout: () => void;
  onDeleteAccount?: YouViewProps['onDeleteAccount'];
  onClose: () => void;
}> = ({ player, onUpdate, onAvatarChange, onLogout, onDeleteAccount, onClose }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-[700] bg-[#05050a] overflow-y-auto"
  >
    <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-[#05050a]/95 backdrop-blur-md border-b border-white/5">
      <div className="text-xs font-mono font-bold text-[#7EB8D4] tracking-widest">ACCOUNT & CONFIG</div>
      <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/5"><X size={18} className="text-gray-400" /></button>
    </div>
    <div className="px-4 py-6">
      <Suspense fallback={<div className="text-gray-500 text-xs text-center py-8 font-mono">Loading config...</div>}>
        <ProfileView
          player={player}
          onUpdate={onUpdate}
          onAvatarChange={onAvatarChange}
          onLogout={onLogout}
          onDeleteAccount={onDeleteAccount}
        />
      </Suspense>
    </div>
  </motion.div>
);

// ─── Simple "coming soon" drawer for stub tiles ──────────────────────
const ComingSoonDrawer: React.FC<{ title: string; onClose: () => void }> = ({ title, onClose }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-[700] bg-black/85 backdrop-blur-sm flex items-center justify-center p-6"
    onClick={onClose}
  >
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      onClick={e => e.stopPropagation()}
      className="max-w-sm w-full bg-[#0a0a14] border border-white/10 rounded-2xl p-6 text-center"
    >
      <div className="text-xs font-mono text-[#7EB8D4] tracking-widest mb-2">{title}</div>
      <div className="text-sm text-gray-300 font-mono mb-4">Coming soon in the full release.</div>
      <button onClick={onClose} className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-[11px] font-mono tracking-widest text-gray-300 hover:bg-white/10">
        CLOSE
      </button>
    </motion.div>
  </motion.div>
);

// ─── Stat config for the stat cards ─────────────────────────────────
const STAT_CONFIG: { key: keyof CoreStats; label: string; fullLabel: string; icon: React.ReactNode; color: string; barColor: string; accentRgb: string }[] = [
  { key: 'strength', label: 'STR', fullLabel: 'STRENGTH', icon: <Dumbbell size={14} />, color: 'text-red-400', barColor: 'bg-red-400', accentRgb: '249,112,102' },
  { key: 'intelligence', label: 'INT', fullLabel: 'INTELLIGENCE', icon: <Brain size={14} />, color: 'text-indigo-400', barColor: 'bg-indigo-400', accentRgb: '129,140,248' },
  { key: 'social', label: 'SOC', fullLabel: 'SOCIAL', icon: <Users size={14} />, color: 'text-amber-400', barColor: 'bg-amber-400', accentRgb: '251,191,36' },
  { key: 'discipline', label: 'DIS', fullLabel: 'DISCIPLINE', icon: <Shield size={14} />, color: 'text-[#7EB8D4]', barColor: 'bg-[#7EB8D4]', accentRgb: '192,132,252' },
  { key: 'focus', label: 'FOC', fullLabel: 'FOCUS', icon: <Target size={14} />, color: 'text-[#7EB8D4]', barColor: 'bg-[#7EB8D4]', accentRgb: '6,182,212' },
  { key: 'willpower', label: 'WIL', fullLabel: 'WILLPOWER', icon: <Zap size={14} />, color: 'text-pink-400', barColor: 'bg-pink-400', accentRgb: '236,72,153' },
];

// ─── Full-screen Stats Drawer ────────────────────────────────────────
const StatsDrawer: React.FC<{ player: PlayerData; onClose: () => void }> = ({ player, onClose }) => {
  const totalPoints = useMemo(() => {
    const s = player.stats || {} as CoreStats;
    return Math.floor(
      (s.strength || 0) + (s.intelligence || 0) + (s.social || 0) +
      (s.discipline || 0) + ((s as any).focus || 0) + ((s as any).willpower || 0)
    );
  }, [player.stats]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[700] bg-[#05050a] overflow-y-auto"
    >
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-[#05050a]/95 backdrop-blur-md border-b border-white/5">
        <div>
          <div className="text-xs font-mono font-bold text-[#7EB8D4] tracking-widest">ADVANCED STATS</div>
          <div className="text-[10px] text-gray-500 font-mono">Total: {totalPoints} pts across 6 attributes</div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/5">
          <X size={18} className="text-gray-400" />
        </button>
      </div>

      <div className="px-4 py-5 space-y-5">
        {/* ── Radar Chart ── */}
        <div
          className="w-full rounded-2xl overflow-hidden relative"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(4,4,14,0.95) 100%)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div className="aspect-square max-h-[320px] mx-auto">
            <Suspense fallback={
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-gray-600 text-xs font-mono">Loading radar...</div>
              </div>
            }>
              <EvaluationMatrix stats={player.stats} compact maxDomain={200} />
            </Suspense>
          </div>
        </div>

        {/* ── 6 Stat Cards ── */}
        <div className="grid grid-cols-2 gap-2.5">
          {STAT_CONFIG.map((config, i) => {
            const total = Math.floor((player.stats as any)?.[config.key] || 0);
            const daily = (player.dailyStats as any)?.[config.key] || 0;
            const maxVal = 200;
            const pct = Math.min(100, (total / maxVal) * 100);

            return (
              <motion.div
                key={config.key}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                className="relative overflow-hidden rounded-xl p-3.5"
                style={{
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(4,4,14,0.85) 100%)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 16px rgba(0,0,0,0.35)',
                }}
              >
                {/* Accent wash */}
                <div className="absolute inset-0 pointer-events-none rounded-xl"
                  style={{ background: `linear-gradient(135deg, rgba(${config.accentRgb},0.06) 0%, transparent 60%)` }}
                />
                {/* Top color bar */}
                <div className={`absolute top-0 left-0 right-0 h-[2px] ${config.barColor} opacity-50 rounded-t-xl`} />

                {/* Label */}
                <div className={`flex items-center gap-1.5 mb-2 ${config.color}`}>
                  {config.icon}
                  <span className="font-mono text-[9px] font-bold tracking-[0.15em]">{config.fullLabel}</span>
                </div>

                {/* Value */}
                <div className="flex items-baseline gap-1 mb-1.5">
                  <span className="text-white font-mono text-2xl font-black leading-none">{total}</span>
                  <span className="text-gray-600 font-mono text-[8px] font-bold tracking-widest">/ {maxVal}</span>
                </div>

                {/* Daily gain */}
                <div className="mb-2.5 h-3">
                  {daily > 0 ? (
                    <div className="flex items-center gap-1">
                      <span className={`text-[9px] font-mono font-bold ${config.color}`}>+{Math.round(daily)}</span>
                      <span className="text-gray-600 text-[8px] font-mono">today</span>
                    </div>
                  ) : (
                    <span className="text-gray-700 text-[8px] font-mono">No activity today</span>
                  )}
                </div>

                {/* Progress bar */}
                <div className="h-[3px] bg-white/[0.05] rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full ${config.barColor} rounded-full`}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ delay: 0.3 + i * 0.08, duration: 0.8, type: 'spring' }}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};

// ─── Main YouView ────────────────────────────────────────────────────
const YouView: React.FC<YouViewProps> = ({
  player, equippedOutfit, onUpdate, onAvatarChange, onLogout, onDeleteAccount, onNavigate, onOpenDusk, onTestSetRank,
}) => {
  const [showRank, setShowRank] = useState(false);
  const [showRankProgression, setShowRankProgression] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [comingSoon, setComingSoon] = useState<string | null>(null);
  // [TEST] Rank-up cinematic test state
  const [testRankUp, setTestRankUp] = useState<{ oldRank: string; newRank: string } | null>(null);

  const duskBadge = player.duskUnreadCount || 0;

  // [TEST] Wraps the real onTestSetRank to play cinematic first
  const handleTestRankTap = (rank: string) => {
    if (!onTestSetRank) return;
    const oldRank = player.rank || 'E';
    if (oldRank === rank) return; // no-op if same rank
    setShowRank(false); // close the modal
    setTestRankUp({ oldRank, newRank: rank });
  };

  return (
    <div className="w-full max-w-2xl mx-auto pb-24">
      {/* ── Hero section — Banner + Avatar + Stats + Forge Score ── */}
      <ProfileHero player={player} onRankTap={() => setShowRank(true)} />

      {/* Action grid — clean 4-col */}
      <div className="grid grid-cols-4 gap-1 px-2">
        <ActionTile
          icon={<StoreIcon size={22} />}
          label="Store"
          accent="#facc15"
          onClick={() => onNavigate?.('STORE' as Tab)}
        />
        <ActionTile
          icon={<Package size={22} />}
          label="Inventory"
          accent="#9ACDE3"
          isSoon
          onClick={() => setComingSoon('INVENTORY')}
        />
        <ActionTile
          icon={<Swords size={22} />}
          label="Rank"
          accent="#7EB8D4"
          onClick={() => setShowRankProgression(true)}
        />
        <ActionTile
          icon={<BarChart3 size={22} />}
          label="Stats"
          accent="#7EB8D4"
          onClick={() => setShowStats(true)}
        />
        <ActionTile
          icon={<Terminal size={22} />}
          label="Logs"
          accent="#4ade80"
          onClick={() => setShowConfig(true)}
        />
        <ActionTile
          icon={<MessageCircle size={22} />}
          label="Dusk"
          accent="#7EB8D4"
          badge={duskBadge || undefined}
          onClick={() => onOpenDusk?.()}
        />
        <ActionTile
          icon={<Settings size={22} />}
          label="Config"
          accent="#60a5fa"
          onClick={() => setShowConfig(true)}
        />
        <ActionTile
          icon={<MoreHorizontal size={22} />}
          label="More"
          accent="#9ca3af"
          onClick={() => setShowConfig(true)}
        />
      </div>

      {/* Journey log */}
      <div className="mt-4">
        <JourneyLog player={player} />
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showRank && <RankLadderModal player={player} onClose={() => setShowRank(false)} onTestSetRank={onTestSetRank ? handleTestRankTap : undefined} />}
        {showRankProgression && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[700] bg-[#05050a] overflow-y-auto"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-[#05050a]/95 backdrop-blur-md border-b border-white/5">
              <div className="text-xs font-mono font-bold text-[#7EB8D4] tracking-widest">RANK PROGRESSION</div>
              <button onClick={() => setShowRankProgression(false)} className="p-1.5 rounded-full hover:bg-white/5">
                <X size={18} className="text-gray-400" />
              </button>
            </div>
            <div className="px-4 py-6">
              <Suspense fallback={<div className="text-gray-500 text-xs text-center py-8 font-mono">Loading rank data...</div>}>
                <RankProgressionCard level={player.level} rank={player.rank} onTestSetRank={onTestSetRank ? handleTestRankTap : undefined} />
              </Suspense>
            </div>
          </motion.div>
        )}
        {showConfig && (
          <ProfileDrawer
            player={player}
            onUpdate={onUpdate}
            onAvatarChange={onAvatarChange}
            onLogout={() => { setShowConfig(false); onLogout(); }}
            onDeleteAccount={onDeleteAccount}
            onClose={() => setShowConfig(false)}
          />
        )}
        {showStats && <StatsDrawer player={player} onClose={() => setShowStats(false)} />}
        {comingSoon && <ComingSoonDrawer title={comingSoon} onClose={() => setComingSoon(null)} />}
      </AnimatePresence>

      {/* [TEST] Rank-Up Cinematic overlay */}
      <AnimatePresence>
        {testRankUp && (
          <Suspense fallback={null}>
            <RankUpCinematic
              oldRank={testRankUp.oldRank as any}
              newRank={testRankUp.newRank as any}
              onComplete={() => {
                onTestSetRank?.(testRankUp.newRank);
                setTestRankUp(null);
              }}
            />
          </Suspense>
        )}
      </AnimatePresence>
    </div>
  );
};

export default YouView;
