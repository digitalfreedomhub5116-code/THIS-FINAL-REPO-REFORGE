import React, { useState, useRef, useEffect, useMemo, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, Store as StoreIcon, Package, BarChart3, Award,
  Terminal, MessageCircle, User as UserIcon, MoreHorizontal,
  X, Flame, Coins, Key as KeyIcon, ChevronRight, Lock as LockIcon,
} from 'lucide-react';
import { PlayerData, HealthProfile, Outfit, Tab, Rank } from '../types';

// Lazy-load the existing ProfileView — reused as the Config/Logs/More drawer
const ProfileView = lazy(() => import('./ProfileView'));

// ─── Rank ladder (mirrors lib/levelSystem.ts) ────────────────────────
const RANK_LADDER: { rank: Exclude<Rank, 'UNRANKED'>; minLevel: number; color: string }[] = [
  { rank: 'E', minLevel: 1,  color: '#9ca3af' },
  { rank: 'D', minLevel: 11, color: '#4ade80' },
  { rank: 'C', minLevel: 27, color: '#60a5fa' },
  { rank: 'B', minLevel: 39, color: '#c084fc' },
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
}

// ─── Top bar ─────────────────────────────────────────────────────────
const TopBar: React.FC<{ player: PlayerData; onSettings: () => void }> = ({ player, onSettings }) => {
  const xpPct = Math.min(100, Math.round((player.currentXp / Math.max(1, player.requiredXp)) * 100));
  return (
    <div className="flex items-center justify-between gap-3 px-1 pt-2 pb-3">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-black/40 border border-white/10">
          <div className="text-[10px] font-mono font-bold text-[#00d2ff] tracking-wider">Lv.{player.level}</div>
          <div className="w-16 h-1.5 bg-black/60 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#00d2ff] to-[#8b5cf6]" style={{ width: `${xpPct}%` }} />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 text-[11px] font-mono font-bold">
        <div className="flex items-center gap-1 text-orange-400" title="Streak"><Flame size={13} /> {player.streak || 0}</div>
        <div className="flex items-center gap-1 text-yellow-400" title="Gold"><Coins size={13} /> {player.gold || 0}</div>
        <div className="flex items-center gap-1 text-cyan-300" title="Keys"><KeyIcon size={13} /> {player.keys || 0}</div>
      </div>
      <button onClick={onSettings} className="p-1.5 rounded-full hover:bg-white/5 transition" aria-label="Settings">
        <Settings size={16} className="text-gray-400" />
      </button>
    </div>
  );
};

// ─── Avatar hero zone ────────────────────────────────────────────────
const AvatarHero: React.FC<{
  player: PlayerData;
  outfit?: Outfit;
  onRankTap: () => void;
}> = ({ player, outfit, onRankTap }) => {
  const loopRef = useRef<HTMLVideoElement>(null);
  const [videoFailed, setVideoFailed] = useState(false);
  const accent = outfit?.accentColor || '#9ca3af';
  const loopUrl = outfit?.loopVideoUrl;
  const fallbackImg = outfit?.image;
  const rankColor = RANK_LADDER.find(r => r.rank === player.rank)?.color || '#9ca3af';

  // Force play on mount (autoplay may be blocked without user gesture on some browsers)
  useEffect(() => {
    const v = loopRef.current;
    if (!v || !loopUrl) return;
    setVideoFailed(false);
    const tryPlay = () => v.play().catch(() => { /* keep showing poster; no fallback switch */ });
    if (v.readyState >= 2) tryPlay();
    else v.addEventListener('loadeddata', tryPlay, { once: true });
    return () => v.removeEventListener('loadeddata', tryPlay);
  }, [loopUrl]);

  const mediaStyle: React.CSSProperties = {
    objectFit: 'cover',
    objectPosition: 'center top',
  };

  return (
    <div className="relative w-full overflow-hidden" style={{ aspectRatio: '4 / 5', background: '#000' }}>
      {/* Accent radial glow (behind avatar) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse 55% 50% at 50% 45%, ${accent}33 0%, transparent 65%)` }}
      />

      {/* Loop video — waist-up cropped */}
      {loopUrl && !videoFailed && (
        <video
          ref={loopRef}
          src={loopUrl}
          muted
          playsInline
          loop
          autoPlay
          preload="auto"
          className="absolute inset-0 w-full h-full"
          style={mediaStyle}
          onError={() => setVideoFailed(true)}
        />
      )}

      {/* Static fallback */}
      {(!loopUrl || videoFailed) && fallbackImg && (
        <img
          src={fallbackImg}
          alt={outfit?.name || 'avatar'}
          className="absolute inset-0 w-full h-full"
          style={mediaStyle}
        />
      )}

      {/* Empty state */}
      {!loopUrl && !fallbackImg && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-24 h-24 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center">
            <UserIcon size={32} className="text-white/30" />
          </div>
        </div>
      )}

      {/* Codename + title — floating top-left */}
      <div className="absolute top-3 left-3 right-20 z-10">
        <div className="text-white font-bold text-xl leading-tight truncate" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.8)' }}>
          {player.username ? `@${player.username}` : player.name || 'Player'}
        </div>
        {(player.title || player.job) && (
          <div className="text-xs font-mono tracking-wide truncate" style={{ color: accent, textShadow: '0 2px 10px rgba(0,0,0,0.9)' }}>
            {player.title || player.job}
          </div>
        )}
      </div>

      {/* Rank emblem — floating top-right, tappable */}
      <button
        onClick={onRankTap}
        className="absolute top-3 right-3 z-10 flex flex-col items-center gap-0.5 group"
        aria-label="View rank progression"
      >
        <div
          className="relative w-14 h-14 flex items-center justify-center transition-transform group-active:scale-95"
          style={{
            clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
            background: `linear-gradient(135deg, ${rankColor}cc 0%, ${rankColor}66 100%)`,
            boxShadow: `0 0 20px ${rankColor}80, inset 0 1px 0 rgba(255,255,255,0.3)`,
          }}
        >
          <div className="text-white font-black text-xl" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.6)' }}>
            {player.rank === 'UNRANKED' ? '–' : player.rank}
          </div>
        </div>
        <div className="text-[8px] font-mono text-gray-400 tracking-widest">RANK</div>
      </button>
    </div>
  );
};

// ─── Action tile ─────────────────────────────────────────────────────
const ActionTile: React.FC<{
  icon: React.ReactNode;
  label: string;
  badge?: string | number;
  accent?: string;
  onClick: () => void;
}> = ({ icon, label, badge, accent = '#00d2ff', onClick }) => (
  <button
    onClick={onClick}
    className="relative flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07] active:scale-[0.97] transition-all min-h-[74px]"
  >
    <div className="relative">
      <div style={{ color: accent }}>{icon}</div>
      {badge !== undefined && badge !== 0 && (
        <div className="absolute -top-2 -right-3 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold font-mono flex items-center justify-center shadow-[0_0_8px_rgba(239,68,68,0.6)]">
          {badge}
        </div>
      )}
    </div>
    <div className="text-[10px] font-mono font-bold text-gray-300 tracking-wider uppercase">{label}</div>
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
        <button className="text-[10px] font-mono text-[#00d2ff] hover:text-white transition flex items-center gap-0.5">
          View All <ChevronRight size={11} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div className={`text-[9px] font-mono tracking-widest ${d.isToday ? 'text-[#00d2ff]' : 'text-gray-600'}`}>{d.label}</div>
            <div
              className={`w-full aspect-square rounded-lg flex items-center justify-center text-[11px] font-mono font-bold border transition ${
                d.isToday
                  ? 'border-[#00d2ff] text-[#00d2ff] bg-[#00d2ff]/10'
                  : d.hasActivity
                    ? 'border-white/15 text-white bg-white/[0.05]'
                    : 'border-white/5 text-gray-600 bg-transparent'
              }`}
            >
              {d.num}
            </div>
            <div className="h-1.5 flex items-center">
              {d.hasActivity ? (
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: d.isToday ? '#00d2ff' : '#4ade80' }} />
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
const RankLadderModal: React.FC<{ player: PlayerData; onClose: () => void }> = ({ player, onClose }) => (
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
          <div className="text-xs font-mono text-[#00d2ff] tracking-widest">RANK PROGRESSION</div>
          <div className="text-[10px] text-gray-500 font-mono">Level {player.level} · Current Rank: {player.rank}</div>
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
                  ? 'border-[#00d2ff] bg-[#00d2ff]/5'
                  : reached
                    ? 'border-white/10 bg-white/[0.03]'
                    : 'border-white/5 bg-transparent opacity-50'
              }`}
            >
              <div
                className="w-10 h-10 flex items-center justify-center shrink-0"
                style={{
                  clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                  background: reached ? `linear-gradient(135deg, ${r.color}cc 0%, ${r.color}66 100%)` : '#1a1a2a',
                  boxShadow: isCurrent ? `0 0 16px ${r.color}80` : 'none',
                }}
              >
                <div className="text-white font-black text-base">{r.rank}</div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-white font-mono tracking-wide">RANK {r.rank}</div>
                <div className="text-[10px] font-mono text-gray-500">
                  {reached ? 'Unlocked' : `Requires Level ${r.minLevel}`}
                </div>
              </div>
              {isCurrent && (
                <div className="text-[9px] font-mono text-[#00d2ff] font-bold tracking-widest px-2 py-1 rounded bg-[#00d2ff]/10 border border-[#00d2ff]/30">
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
      <div className="text-xs font-mono font-bold text-[#00d2ff] tracking-widest">ACCOUNT & CONFIG</div>
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
      <div className="text-xs font-mono text-[#00d2ff] tracking-widest mb-2">{title}</div>
      <div className="text-sm text-gray-300 font-mono mb-4">Coming soon in the full release.</div>
      <button onClick={onClose} className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-[11px] font-mono tracking-widest text-gray-300 hover:bg-white/10">
        CLOSE
      </button>
    </motion.div>
  </motion.div>
);

// ─── Main YouView ────────────────────────────────────────────────────
const YouView: React.FC<YouViewProps> = ({
  player, equippedOutfit, onUpdate, onAvatarChange, onLogout, onDeleteAccount, onNavigate, onOpenDusk,
}) => {
  const [showRank, setShowRank] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [comingSoon, setComingSoon] = useState<string | null>(null);

  const duskBadge = player.duskUnreadCount || 0;

  return (
    <div className="w-full max-w-2xl mx-auto pb-24">
      {/* ── Full-bleed BLACK hero section (breaks out of parent padding) ── */}
      <div
        className="relative"
        style={{
          background: '#000',
          marginLeft: 'calc(50% - 50vw)',
          marginRight: 'calc(50% - 50vw)',
          paddingLeft: 'calc(50vw - 50%)',
          paddingRight: 'calc(50vw - 50%)',
        }}
      >
        <TopBar player={player} onSettings={() => setShowConfig(true)} />

        {/* Avatar hero */}
        <AvatarHero player={player} outfit={equippedOutfit} onRankTap={() => setShowRank(true)} />
      </div>

      {/* Action grid */}
      <div className="grid grid-cols-4 gap-2 mt-4">
        <ActionTile
          icon={<StoreIcon size={22} />}
          label="Store"
          accent="#facc15"
          onClick={() => onNavigate?.('STORE' as Tab)}
        />
        <ActionTile
          icon={<Package size={22} />}
          label="Inventory"
          accent="#c084fc"
          onClick={() => setComingSoon('INVENTORY')}
        />
        <ActionTile
          icon={<BarChart3 size={22} />}
          label="Stats"
          accent="#00d2ff"
          onClick={() => setComingSoon('STATS')}
        />
        <ActionTile
          icon={<Award size={22} />}
          label="Medals"
          accent="#f87171"
          onClick={() => setComingSoon('MEDALS')}
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
          accent="#8b5cf6"
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
        {showRank && <RankLadderModal player={player} onClose={() => setShowRank(false)} />}
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
        {comingSoon && <ComingSoonDrawer title={comingSoon} onClose={() => setComingSoon(null)} />}
      </AnimatePresence>
    </div>
  );
};

export default YouView;
