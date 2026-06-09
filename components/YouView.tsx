import React, { useState, useRef, useEffect, useMemo, lazy, Suspense } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, BarChart3,
  MessageCircle,
  X, ChevronRight, Lock as LockIcon,
  Swords, Dumbbell, Brain, Users, Shield, Target, Zap,
  Camera, ImagePlus, Loader2, Flame, TrendingUp, Sparkles, Crown, ExternalLink,
  ArrowLeft, Edit3, LogOut,
} from 'lucide-react';
import { PlayerData, HealthProfile, Tab, Rank, CoreStats } from '../types';
import AvatarWithBorder from './AvatarWithBorder';
import RankBadge from './RankBadge';
import type { RankType } from './RankBadge';
import { getItemById } from '../utils/storeItems';
import { getEconomy } from '../utils/storeEconomy';
import ForgeGuardWidget from './ForgeGuardWidget';
import { API_BASE } from '../lib/apiConfig';
import { getOrRefreshPlayerHeaders } from '../lib/playerApi';

// Compress & resize image to max 512×512, returns base64 data URL.
// Tries WebP first for smallest size; falls back to JPEG if WebView doesn't support WebP canvas.
function compressImage(file: File, maxSize = 512): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let w = img.width, h = img.height;
          if (w > h) { if (w > maxSize) { h = Math.round(h * maxSize / w); w = maxSize; } }
          else { if (h > maxSize) { w = Math.round(w * maxSize / h); h = maxSize; } }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0, w, h);
          // Try WebP first (smallest file size)
          let dataUrl = canvas.toDataURL('image/webp', 0.80);
          // Some Android WebViews return PNG when WebP isn't supported
          if (!dataUrl.startsWith('data:image/webp')) {
            dataUrl = canvas.toDataURL('image/jpeg', 0.82);
          }
          resolve(dataUrl);
        } catch (canvasErr) {
          // If canvas fails entirely, return the original file as data URL
          resolve(reader.result as string);
        }
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

// Lazy-load the existing ProfileView — reused as the Config/Logs/More drawer
const ProfileView = lazy(() => import('./ProfileView'));
const RankProgressionCard = lazy(() => import('./RankProgressionCard'));
const EvaluationMatrix = lazy(() => import('./StatsRadar'));
const RankUpCinematic = lazy(() => import('./RankUpCinematic'));
const HunterGrowthTerminal = lazy(() => import('./HunterGrowthTerminal'));

// ─── Rank ladder (mirrors lib/levelSystem.ts) ────────────────────────
const RANK_LADDER: { rank: Exclude<Rank, 'UNRANKED'>; minLevel: number; color: string }[] = [
  { rank: 'E', minLevel: 1,  color: '#9ca3af' },
  { rank: 'D', minLevel: 11, color: '#4ade80' },
  { rank: 'C', minLevel: 27, color: '#60a5fa' },
  { rank: 'B', minLevel: 39, color: '#33dfff' },
  { rank: 'A', minLevel: 55, color: '#facc15' },
  { rank: 'S', minLevel: 80, color: '#f87171' },
];

interface YouViewProps {
  player: PlayerData;
  history?: import('../types').HistoryEntry[];
  onUpdate: (data: { name: string; username: string; job: string; title: string; healthProfile?: HealthProfile }) => void;
  onAvatarChange?: (newUrl: string) => void;
  onLogout: () => void;
  onDeleteAccount?: () => Promise<void>;
  onNavigate?: (tab: Tab) => void;
  onBack?: () => void;
  onOpenDusk?: () => void;
  onUpgradePro?: () => void;
  isPremium?: boolean;
}


// ─── useInView: scroll-reveal trigger ────────────────────────────────
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

// ─── Animated counter (casino-style count-up) ────────────────────────
function AnimatedCounter({ value, duration = 1200 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const [done, setDone] = useState(false);
  const prevRef = useRef(0);
  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = value;
    if (value === 0) { setDisplay(0); setDone(true); return; }
    let start: number | null = null;
    setDone(false);
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min(1, (ts - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
      setDisplay(Math.round(eased * value));
      if (p < 1) requestAnimationFrame(step);
      else setDone(true);
    };
    requestAnimationFrame(step);
  }, [value, duration]);
  return { display, done };
}

// ─── Particle burst keyframes (injected once) ────────────────────────
const PARTICLE_CSS = `
@keyframes yv-particle {
  0% { transform: translate(0,0) scale(1); opacity: 1; }
  100% { transform: translate(var(--dx), var(--dy)) scale(0); opacity: 0; }
}
@keyframes yv-shine-sweep {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(200%); }
}
@keyframes yv-avatar-breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.03); }
}
@keyframes yv-float-up {
  0% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-28px); }
}
`;

// ─── Mono-cyan color based on stat value ─────────────────────────────
function getCyanShade(value: number, max: number): string {
  const pct = Math.min(1, value / max);
  if (pct < 0.25) return '#5a9ab0';       // dull cyan
  if (pct < 0.5) return '#00d4ff';        // medium cyan
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
          <circle cx="26" cy="26" r={r} fill="none" stroke="rgba(0,212,255,0.1)" strokeWidth="3.5" />
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
  onAvatarTap?: () => void;
}> = ({ player, onRankTap, onAvatarTap }) => {
  const economy = getEconomy();
  const bannerItemId = player.equippedBanner || economy.equipped.banner;
  const bannerItem = bannerItemId ? getItemById(bannerItemId) : null;
  const bannerSrc = bannerItem?.bannerImage || '/banners/defaultreforgebanner.webp';
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

  // ── Casino counter for Forge Score ──
  const { display: counterVal, done: counterDone } = AnimatedCounter({ value: forgeScore, duration: 1400 });
  const [showParticles, setShowParticles] = useState(false);
  const prevForgeRef = useRef<number | null>(null);
  const delta = useMemo(() => {
    const stored = localStorage.getItem('yv_last_forge');
    return stored ? forgeScore - parseInt(stored) : 0;
  }, [forgeScore]);
  useEffect(() => {
    if (counterDone && prevForgeRef.current !== forgeScore) {
      prevForgeRef.current = forgeScore;
      setShowParticles(true);
      localStorage.setItem('yv_last_forge', String(forgeScore));
      const t = setTimeout(() => setShowParticles(false), 800);
      return () => clearTimeout(t);
    }
  }, [counterDone, forgeScore]);

  // ── Scroll-reveal refs ──
  const statsReveal = useInView(0.2);
  const scoreReveal = useInView(0.3);
  const curveReveal = useInView(0.2);
  const guardReveal = useInView(0.2);

  // ── Streak flame tier ──
  const streak = player.streak || 0;
  const flameTier = streak === 0 ? 0 : streak < 7 ? 1 : streak < 14 ? 2 : streak < 30 ? 3 : streak < 60 ? 4 : streak < 100 ? 5 : 6;
  const flameColors = ['#555', '#ff6b35', '#ff9500', '#ffcc00', '#00d4ff', '#8b5cf6', '#f472b6'];
  const flameNames = ['', 'Spark', 'Flame', 'Torch', 'Bonfire', 'Inferno', 'Eternal'];

  return (
    <div className="relative" style={{ marginBottom: 16 }}>
      <style>{PARTICLE_CSS}</style>

      {/* ── Banner ── */}
      <div className="relative w-full" style={{ height: 160, borderRadius: '0 0 16px 16px', background: '#000', overflow: 'hidden' }}>
        <img src={bannerSrc} alt="" className="w-full h-full object-cover" style={{ objectPosition: 'center center' }} />
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{ height: 100, background: 'linear-gradient(to top, rgba(5,5,10,0.95) 0%, transparent 100%)' }} />
        {/* Name + streak flame — bottom left */}
        <div className="absolute bottom-3 left-4 z-10" style={{ maxWidth: 'calc(60%)' }}>
          <div className="flex items-center gap-2">
            <div className="text-white font-bold text-lg leading-tight truncate" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.8)' }}>
              {player.name || 'Player'}
            </div>
            {streak > 0 && (
              <div className="flex items-center gap-1" style={{ animation: 'yv-avatar-breathe 2s ease-in-out infinite' }}>
                <Flame size={flameTier >= 4 ? 18 : 14} style={{ color: flameColors[flameTier], filter: `drop-shadow(0 0 4px ${flameColors[flameTier]})` }} />
                <span style={{ fontSize: 9, fontWeight: 900, color: flameColors[flameTier], fontFamily: 'monospace' }}>{streak}</span>
              </div>
            )}
          </div>
          {streak > 0 && (
            <div style={{ fontSize: 7, fontWeight: 800, color: flameColors[flameTier], fontFamily: 'monospace', letterSpacing: '0.15em', opacity: 0.7, marginTop: 1 }}>
              {flameNames[flameTier]}
            </div>
          )}
        </div>
      </div>

      {/* ── Centered Avatar with equipped border — breathing animation ── */}
      <div className="flex flex-col items-center" style={{ marginTop: -44 }}>
        <motion.button
          onClick={onAvatarTap}
          className="relative"
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', animation: 'yv-avatar-breathe 4s ease-in-out infinite' }}
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', damping: 18, stiffness: 200, delay: 0.1 }}
        >
          <AvatarWithBorder
            avatarUrl={player.avatarUrl}
            borderId={borderId}
            size={88}
          />
          {/* Camera badge — bottom-right */}
          <div style={{
            position: 'absolute', bottom: 2, right: 2,
            width: 26, height: 26, borderRadius: '50%',
            background: '#00d4ff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid #05050a', zIndex: 20,
            boxShadow: '0 2px 8px rgba(0,212,255,0.4)',
          }}>
            <Camera size={12} color="#05050a" />
          </div>
        </motion.button>
        {/* CHANGE pill button */}
        <button
          onClick={onAvatarTap}
          className="active:scale-95 transition-transform"
          style={{
            marginTop: 6, background: 'rgba(0,212,255,0.08)',
            border: '1px solid rgba(0,212,255,0.2)', borderRadius: 20,
            padding: '3px 10px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          <Camera size={9} style={{ color: '#00d4ff' }} />
          <span style={{ fontSize: 8, fontWeight: 900, color: '#00d4ff', fontFamily: 'monospace', letterSpacing: '0.1em' }}>CHANGE</span>
        </button>
      </div>

      {/* ── 6 Stat Circles — scroll-reveal stagger ── */}
      <div ref={statsReveal.ref} className="flex justify-center gap-2 px-2 mt-5">
        {STATS_RING.map((s, i) => (
          <StatCircle key={s.key} label={s.key} value={statsReveal.visible ? s.value : 0} max={maxStat} icon={s.icon} delay={statsReveal.visible ? 0.05 + i * 0.08 : 10} />
        ))}
      </div>

      {/* ── Forge Score — Casino Counter with Particle Burst ── */}
      <div ref={scoreReveal.ref} className="flex flex-col items-center mt-4 relative">
        <motion.div
          className="font-black leading-none relative"
          style={{
            fontSize: 52, color: '#00d4ff', letterSpacing: '-0.03em',
            textShadow: counterDone ? '0 0 30px rgba(0,212,255,0.3)' : '0 0 50px rgba(0,212,255,0.5), 0 0 80px rgba(0,212,255,0.2)',
            transition: 'text-shadow 0.5s ease',
          }}
          initial={{ opacity: 0, scale: 0.6 }} animate={scoreReveal.visible ? { opacity: 1, scale: 1 } : {}} transition={{ delay: 0.2, duration: 0.5, type: 'spring' }}
        >
          {counterVal}
          {/* Particle burst on count complete */}
          {showParticles && (
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
              {Array.from({ length: 14 }).map((_, i) => {
                const angle = (i / 14) * Math.PI * 2;
                const dist = 30 + Math.random() * 25;
                return (
                  <div key={i} style={{
                    position: 'absolute', top: '50%', left: '50%',
                    width: 4, height: 4, borderRadius: '50%',
                    background: '#00d4ff', boxShadow: '0 0 6px #00d4ff',
                    '--dx': `${Math.cos(angle) * dist}px`,
                    '--dy': `${Math.sin(angle) * dist}px`,
                    animation: 'yv-particle 0.7s ease-out forwards',
                  } as React.CSSProperties} />
                );
              })}
            </div>
          )}
        </motion.div>
        {/* Delta badge */}
        {delta !== 0 && counterDone && (
          <div style={{
            position: 'absolute', top: -2, right: '25%',
            fontSize: 11, fontWeight: 900, fontFamily: 'monospace',
            color: delta > 0 ? '#4ade80' : '#f87171',
            animation: 'yv-float-up 2.5s ease-out forwards',
            display: 'flex', alignItems: 'center', gap: 2,
          }}>
            <TrendingUp size={10} style={{ transform: delta < 0 ? 'rotate(180deg)' : undefined }} />
            {delta > 0 ? '+' : ''}{delta}
          </div>
        )}
        <div className="text-[8px] font-mono font-bold tracking-[0.25em] text-gray-500 mt-1">FORGE SCORE</div>
      </div>

      {/* ── Potential Distribution — Glass Panel with Shine Sweep ── */}
      <div ref={curveReveal.ref} className="px-4 mt-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={curveReveal.visible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{
            background: 'linear-gradient(135deg, rgba(0,212,255,0.06) 0%, rgba(10,10,20,0.7) 50%, rgba(0,212,255,0.04) 100%)',
            border: '1px solid rgba(0,212,255,0.12)',
            borderRadius: 16,
            padding: '20px 16px 14px',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            boxShadow: 'inset 0 1px 0 rgba(0,212,255,0.08), 0 8px 32px rgba(0,0,0,0.3)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Animated shine sweep */}
          {curveReveal.visible && (
            <div style={{
              position: 'absolute', top: 0, left: 0, width: '50%', height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(0,212,255,0.08), transparent)',
              animation: 'yv-shine-sweep 1.5s ease-out 0.3s forwards',
              pointerEvents: 'none', zIndex: 5,
            }} />
          )}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
            background: 'linear-gradient(90deg, transparent 10%, rgba(0,212,255,0.2) 50%, transparent 90%)',
          }} />
          <div className="text-[8px] font-mono font-bold tracking-[0.2em] text-gray-500 text-center mb-3">
            POTENTIAL DISTRIBUTION
          </div>
          <ForgeScoreCurve score={forgeScore} primary="#00d4ff" />
        </motion.div>
      </div>

      {/* ── ForgeGuard Integrity — scroll reveal ── */}
      <div ref={guardReveal.ref} className="px-4 mt-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={guardReveal.visible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <ForgeGuardWidget
            cheatStrikes={player.cheatStrikes ?? 0}
            totalStrikesEver={player.totalStrikesEver}
          />
        </motion.div>
      </div>

      {/* ── Rank badge — bottom right of the banner image ── */}
      <button onClick={onRankTap} className="absolute z-30" style={{ top: 104, right: 12 }} aria-label="View rank">
        <RankBadge rank={(player.rank || 'E') as RankType} size={48} animated />
      </button>
    </div>
  );
};

// ─── Bell Curve SVG (liquid glass style) ─────────────────────────────
function ForgeScoreCurve({ score, primary = '#00d4ff' }: { score: number; primary?: string }) {
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
}> = ({ icon, label, badge, accent = '#00d4ff', isSoon, onClick }) => (
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
        <button className="text-[10px] font-mono text-[#00d4ff] hover:text-white transition flex items-center gap-0.5">
          View All <ChevronRight size={11} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div className={`text-[9px] font-mono tracking-widest ${d.isToday ? 'text-[#00d4ff]' : 'text-gray-600'}`}>{d.label}</div>
            <div
              className={`w-full aspect-square rounded-lg flex items-center justify-center text-[11px] font-mono font-bold border transition ${
                d.isToday
                  ? 'border-[#00d4ff] text-[#00d4ff] bg-[#00d4ff]/10'
                  : d.hasActivity
                    ? 'border-white/15 text-white bg-white/[0.05]'
                    : 'border-white/5 text-gray-600 bg-transparent'
              }`}
            >
              {d.num}
            </div>
            <div className="h-1.5 flex items-center">
              {d.hasActivity ? (
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: d.isToday ? '#00d4ff' : '#4ade80' }} />
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
          <div className="text-xs font-mono text-[#00d4ff] tracking-widest">RANK PROGRESSION</div>
          <div className="text-[10px] text-gray-500 font-mono">
            Level {player.level} · Current Rank: {player.rank}
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
                  ? 'border-[#00d4ff] bg-[#00d4ff]/5'
                  : reached
                    ? 'border-white/10 bg-white/[0.03]'
                    : 'border-white/5 bg-transparent opacity-50'
              }`}
              style={{ cursor: 'default' }}
            >
              <RankBadge rank={r.rank as RankType} size={56} animated={isCurrent} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-white font-mono tracking-wide">RANK {r.rank}</div>
                <div className="text-[10px] font-mono text-gray-500">
                  {reached ? 'Unlocked' : `Requires Level ${r.minLevel}`}
                </div>
              </div>
              {isCurrent && (
                <div className="text-[9px] font-mono text-[#00d4ff] font-bold tracking-widest px-2 py-1 rounded bg-[#00d4ff]/10 border border-[#00d4ff]/30">
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
    <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-[#05050a]/95 backdrop-blur-md border-b border-white/5" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}>
      <div className="text-xs font-mono font-bold text-[#00d4ff] tracking-widest">ACCOUNT & CONFIG</div>
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
      <div className="text-xs font-mono text-[#00d4ff] tracking-widest mb-2">{title}</div>
      <div className="text-sm text-gray-300 font-mono mb-4">Coming soon in the full release.</div>
      <button onClick={onClose} className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-[11px] font-mono tracking-widest text-gray-300 hover:bg-white/10">
        CLOSE
      </button>
    </motion.div>
  </motion.div>
);

// ─── Daily Fortune Widget — Variable Ratio Surprise ───────────────────
function getDailyFortune(player: PlayerData): { icon: string; label: string; text: string; accent: string } {
  const d = new Date();
  const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  const hash = ((seed * 2654435761) >>> 0) % 100; // deterministic daily random
  const streak = player.streak || 0;
  const level = player.level || 1;
  const stats = player.stats || {} as CoreStats;
  const best = (['strength','intelligence','discipline','social','focus','willpower'] as const)
    .reduce((a, b) => ((stats[b] || 0) > (stats[a] || 0) ? b : a));
  const bestLabel = best.charAt(0).toUpperCase() + best.slice(1);

  if (hash < 30) {
    // Motivational
    const msgs = [
      `The System has observed ${streak} consecutive days of discipline. ${streak > 7 ? 'You are among the elite hunters who sustain this pace.' : 'Every flame begins with a single spark.'}`,
      `Level ${level} hunter detected. The gap between you and the next rank narrows with each quest completed.`,
      `"The difference between ordinary and extraordinary is practice." — Your daily discipline compounds silently.`,
      `Most hunters plateau at Level ${Math.max(5, level - 3)}. You have already surpassed that threshold.`,
    ];
    return { icon: '⚡', label: 'SYSTEM BROADCAST', text: msgs[hash % msgs.length], accent: '#00d4ff' };
  } else if (hash < 55) {
    // Stat insight
    return {
      icon: '📈', label: 'STAT ANALYSIS',
      text: `Your dominant attribute is ${bestLabel} (${Math.floor(stats[best] || 0)} pts). ${(stats[best] || 0) > 100 ? 'This exceeds the average hunter by a significant margin.' : 'Focus your training to push this beyond 100.'}`,
      accent: '#8b5cf6',
    };
  } else if (hash < 70) {
    // Micro reward hint
    return {
      icon: '✨', label: 'FORTUNE BONUS',
      text: `The System rewards persistence. Complete today's quests and a bonus may appear. Fortune favors the relentless.`,
      accent: '#facc15',
    };
  } else if (hash < 90) {
    // Competitive intel
    return {
      icon: '🗡️', label: 'INTEL REPORT',
      text: `${streak > 0 ? `Your ${streak}-day streak puts you ahead of most hunters at Level ${level}.` : 'Start a streak today to gain the edge.'} The leaderboard shifts weekly — every point counts.`,
      accent: '#f87171',
    };
  } else {
    // Rare teaser
    return {
      icon: '🌟', label: 'RARE SIGNAL',
      text: `A faint signal from the System: hidden rewards await hunters who push beyond their comfort zone. The rarest borders are earned, not bought.`,
      accent: '#f472b6',
    };
  }
}

const DailyFortuneWidget: React.FC<{ player: PlayerData }> = ({ player }) => {
  const fortune = useMemo(() => getDailyFortune(player), [player.streak, player.level, player.stats]);
  const [revealed, setRevealed] = useState(0);
  const reveal = useInView(0.3);

  useEffect(() => {
    if (!reveal.visible) return;
    let i = 0;
    const interval = setInterval(() => {
      i += 2; // 2 chars per tick for speed
      setRevealed(i);
      if (i >= fortune.text.length) clearInterval(interval);
    }, 25);
    return () => clearInterval(interval);
  }, [reveal.visible, fortune.text]);

  return (
    <div ref={reveal.ref}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={reveal.visible ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
        className="rounded-2xl p-4 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(0,212,255,0.04) 0%, rgba(10,10,20,0.8) 60%, rgba(0,212,255,0.03) 100%)',
          border: `1px solid ${fortune.accent}22`,
          boxShadow: `inset 0 1px 0 ${fortune.accent}15, 0 4px 20px rgba(0,0,0,0.3)`,
        }}
      >
        {/* Holographic border shimmer */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 1,
          background: `linear-gradient(90deg, transparent 10%, ${fortune.accent}40 50%, transparent 90%)`,
        }} />
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <span style={{ fontSize: 14 }}>{fortune.icon}</span>
          <span style={{ fontSize: 8, fontWeight: 900, fontFamily: 'monospace', color: fortune.accent, letterSpacing: '0.2em' }}>
            {fortune.label}
          </span>
          <Sparkles size={10} style={{ color: fortune.accent, opacity: 0.6, marginLeft: 'auto' }} />
        </div>
        {/* Typewriter text */}
        <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#c0c0c8', lineHeight: 1.6, minHeight: 36 }}>
          {fortune.text.slice(0, revealed)}
          {revealed < fortune.text.length && (
            <span style={{ color: fortune.accent, animation: 'yv-avatar-breathe 0.8s ease-in-out infinite' }}>|</span>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// ─── Avatar Change Modal — Camera / Gallery picker ───────────────────
const AvatarChangeModal: React.FC<{
  onCamera: () => void;
  onGallery: () => void;
  onClose: () => void;
  uploading: boolean;
  error: string;
}> = ({ onCamera, onGallery, onClose, uploading, error }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-[700] bg-black/85 backdrop-blur-sm flex items-end justify-center"
    style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 5.5rem)' }}
    onClick={onClose}
  >
    <motion.div
      initial={{ y: 120, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 120, opacity: 0 }}
      transition={{ type: 'spring', damping: 28, stiffness: 350 }}
      onClick={e => e.stopPropagation()}
      className="w-full max-w-md mx-4"
    >
      {uploading ? (
        <div className="bg-[#0a0a14] border border-white/10 rounded-2xl p-10 flex flex-col items-center gap-4">
          <Loader2 size={36} className="text-[#00d4ff] animate-spin" />
          <div className="text-[11px] font-mono font-bold text-gray-400 tracking-widest">UPLOADING PHOTO...</div>
          <div className="text-[9px] font-mono text-gray-600">Compressing & saving to cloud</div>
        </div>
      ) : (
        <>
          <div className="bg-[#0a0a14] border border-white/10 rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="text-center py-3 border-b border-white/[0.06]">
              <div className="text-[10px] font-mono font-bold text-[#00d4ff] tracking-[0.2em]">CHANGE PROFILE PICTURE</div>
            </div>

            {/* Error */}
            {error && (
              <div className="text-center py-2 px-4 bg-red-500/5 border-b border-red-500/10">
                <div className="text-[10px] text-red-400 font-mono">{error}</div>
              </div>
            )}

            {/* Camera option */}
            <button
              onClick={onCamera}
              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/[0.03] active:bg-white/[0.06] transition-colors border-b border-white/[0.04]"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(0,212,255,0.1)' }}>
                <Camera size={20} className="text-[#00d4ff]" />
              </div>
              <div className="text-left">
                <div className="text-[12px] font-bold text-white tracking-wide">Take Photo</div>
                <div className="text-[9px] font-mono text-gray-500 mt-0.5">Open camera to capture</div>
              </div>
              <ChevronRight size={16} className="text-gray-600 ml-auto" />
            </button>

            {/* Gallery option */}
            <button
              onClick={onGallery}
              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/[0.03] active:bg-white/[0.06] transition-colors"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(76,217,100,0.1)' }}>
                <ImagePlus size={20} className="text-green-400" />
              </div>
              <div className="text-left">
                <div className="text-[12px] font-bold text-white tracking-wide">Choose from Gallery</div>
                <div className="text-[9px] font-mono text-gray-500 mt-0.5">Upload from device storage</div>
              </div>
              <ChevronRight size={16} className="text-gray-600 ml-auto" />
            </button>
          </div>

          {/* Cancel */}
          <button
            onClick={onClose}
            className="w-full mt-2 py-3.5 rounded-2xl text-center text-[12px] font-mono font-bold text-gray-300 tracking-widest active:scale-[0.98] transition-transform"
            style={{ background: '#0a0a14', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            CANCEL
          </button>
        </>
      )}
    </motion.div>
  </motion.div>
);

// ─── Stat config for the stat cards ─────────────────────────────────
const STAT_CONFIG: { key: keyof CoreStats; label: string; fullLabel: string; icon: React.ReactNode; color: string; barColor: string; accentRgb: string }[] = [
  { key: 'strength', label: 'STR', fullLabel: 'STRENGTH', icon: <Dumbbell size={14} />, color: 'text-red-400', barColor: 'bg-red-400', accentRgb: '249,112,102' },
  { key: 'intelligence', label: 'INT', fullLabel: 'INTELLIGENCE', icon: <Brain size={14} />, color: 'text-indigo-400', barColor: 'bg-indigo-400', accentRgb: '129,140,248' },
  { key: 'social', label: 'SOC', fullLabel: 'SOCIAL', icon: <Users size={14} />, color: 'text-amber-400', barColor: 'bg-amber-400', accentRgb: '251,191,36' },
  { key: 'discipline', label: 'DIS', fullLabel: 'DISCIPLINE', icon: <Shield size={14} />, color: 'text-[#00d4ff]', barColor: 'bg-[#00d4ff]', accentRgb: '192,132,252' },
  { key: 'focus', label: 'FOC', fullLabel: 'FOCUS', icon: <Target size={14} />, color: 'text-[#00d4ff]', barColor: 'bg-[#00d4ff]', accentRgb: '6,182,212' },
  { key: 'willpower', label: 'WIL', fullLabel: 'WILLPOWER', icon: <Zap size={14} />, color: 'text-pink-400', barColor: 'bg-pink-400', accentRgb: '236,72,153' },
];

// ─── Full-screen Stats Drawer ────────────────────────────────────────
const StatsDrawer: React.FC<{ player: PlayerData; history?: import('../types').HistoryEntry[]; onClose: () => void }> = ({ player, history, onClose }) => {
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
      className="fixed inset-0 bg-[#05050a] overflow-y-auto"
      style={{ zIndex: 100000 }}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-[#05050a]/95 backdrop-blur-md border-b border-white/5" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}>
        <div>
          <div className="text-xs font-mono font-bold text-[#00d4ff] tracking-widest">ADVANCED STATS</div>
          <div className="text-[10px] text-gray-500 font-mono">Total: {totalPoints} pts across 6 attributes</div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/5">
          <X size={18} className="text-gray-400" />
        </button>
      </div>

      <div className="px-4 py-5 space-y-5">
        {/* ── Growth Terminal ── */}
        <Suspense fallback={<div className="text-gray-600 text-xs font-mono text-center py-4">Loading terminal...</div>}>
          <HunterGrowthTerminal
            dailyXp={player.dailyXp || 0}
            dailyStats={player.dailyStats || {} as CoreStats}
            weeklyStats={player.weeklyStats || {} as CoreStats}
            history={history || player.history || []}
            streak={player.streak || 0}
            playerLevel={player.level || 1}
            quests={player.quests || []}
          />
        </Suspense>

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
  player, history, onUpdate, onAvatarChange, onLogout, onDeleteAccount, onNavigate, onBack, onOpenDusk, onUpgradePro, isPremium,
}) => {
  const [showRank, setShowRank] = useState(false);
  const [showRankProgression, setShowRankProgression] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [comingSoon, setComingSoon] = useState<string | null>(null);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState('');

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const duskBadge = player.duskUnreadCount || 0;

  const handleAvatarFile = async (file: File) => {
    if (!file.type.startsWith('image/')) { setAvatarError('Please select an image'); return; }
    if (file.size > 10 * 1024 * 1024) { setAvatarError('Image must be under 10 MB'); return; }
    setAvatarError('');
    setAvatarUploading(true);
    try {
      const compressed = await compressImage(file);
      const authHeaders = await getOrRefreshPlayerHeaders(API_BASE);
      const res = await fetch(`${API_BASE}/api/player/${player.userId}/avatar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        credentials: 'include',
        body: JSON.stringify({ imageBase64: compressed }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(err.error || 'Upload failed');
      }
      const { avatarUrl } = await res.json();
      if (onAvatarChange) onAvatarChange(avatarUrl);
      setShowAvatarModal(false);
    } catch (err: any) {
      setAvatarError(err.message || 'Upload failed');
    } finally {
      setAvatarUploading(false);
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto pb-24">
      {/* ── Overlay top bar: Back + title + Edit Profile ── */}
      <div
        className="sticky top-0 z-30 flex items-center justify-between px-3 py-2.5 -mx-4 mb-1 backdrop-blur-md"
        style={{ background: 'rgba(5,5,10,0.85)', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingTop: 'calc(env(safe-area-inset-top, 0px) + 10px)' }}
      >
        <button
          onClick={() => onBack?.()}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl active:scale-95 transition-transform"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          aria-label="Back"
        >
          <ArrowLeft size={16} className="text-gray-300" />
          <span className="text-[11px] font-mono font-bold tracking-widest text-gray-300">BACK</span>
        </button>
        <span className="text-[11px] font-mono font-bold tracking-[0.25em] text-[#00d4ff]">PROFILE</span>
        <button
          onClick={() => setShowConfig(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl active:scale-95 transition-transform"
          style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.25)' }}
          aria-label="Edit profile"
        >
          <Edit3 size={14} className="text-[#00d4ff]" />
          <span className="text-[11px] font-mono font-bold tracking-widest text-[#00d4ff]">EDIT</span>
        </button>
      </div>

      {/* Hidden file inputs — camera vs gallery */}
      <input ref={cameraInputRef} type="file" accept="image/*" capture="user" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleAvatarFile(f); }} />
      <input ref={galleryInputRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleAvatarFile(f); }} />

      {/* ── Hero section — Banner + Avatar + Stats + Forge Score ── */}
      <ProfileHero player={player} onRankTap={() => setShowRank(true)} onAvatarTap={() => setShowAvatarModal(true)} />

      {/* Action grid — clean 4-col */}
      <div className="grid grid-cols-4 gap-1 px-2">
        <ActionTile
          icon={<Swords size={22} />}
          label="Rank"
          accent="#00d4ff"
          onClick={() => setShowRankProgression(true)}
        />
        <ActionTile
          icon={<BarChart3 size={22} />}
          label="Stats"
          accent="#00d4ff"
          onClick={() => setShowStats(true)}
        />
        <ActionTile
          icon={<MessageCircle size={22} />}
          label="Dusk"
          accent="#00d4ff"
          badge={duskBadge || undefined}
          onClick={() => { onNavigate?.('DASHBOARD' as Tab); setTimeout(() => onOpenDusk?.(), 150); }}
        />
        <ActionTile
          icon={<Settings size={22} />}
          label="Config"
          accent="#60a5fa"
          onClick={() => setShowConfig(true)}
        />
      </div>

      {/* ── Upgrade to Reforge Pro Button ── */}
      {!isPremium && onUpgradePro && (
        <div className="px-4 mt-5">
          <button
            onClick={onUpgradePro}
            className="w-full active:scale-[0.97] transition-transform"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              padding: '14px 20px', borderRadius: 14, cursor: 'pointer', border: 'none',
              background: 'linear-gradient(135deg, #00d4ff 0%, #0099cc 50%, #006699 100%)',
              color: '#020208', fontSize: 14, fontWeight: 900, letterSpacing: '0.04em',
              boxShadow: '0 0 24px rgba(0,212,255,0.35), 0 4px 16px rgba(0,0,0,0.3)',
              textTransform: 'uppercase',
            }}
          >
            <Crown size={18} strokeWidth={2.5} />
            Upgrade to Reforge Pro
          </button>
          <div style={{ textAlign: 'center', marginTop: 6, fontSize: 10, color: 'rgba(0,212,255,0.5)', fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.1em' }}>
            14 DAYS FREE TRIAL · CANCEL ANYTIME
          </div>
        </div>
      )}

      {/* Daily Fortune — variable reward widget */}
      <div className="mt-4 px-1">
        <DailyFortuneWidget player={player} />
      </div>

      {/* Journey log */}
      <div className="mt-4">
        <JourneyLog player={player} />
      </div>

      {/* Instagram CTA — Shadow Cult */}
      <div className="mt-6 px-4 flex justify-center">
        <motion.a
          href="https://www.instagram.com/reforgesystem?igsh=MWx4YjQ1OHc5ODlpYQ=="
          target="_blank"
          rel="noopener noreferrer"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="group relative inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold tracking-wide transition-all overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #E1306C 0%, #833AB4 50%, #F77737 100%)',
            boxShadow: '0 4px 20px rgba(225,48,108,0.4), 0 0 0 1px rgba(255,255,255,0.1)',
          }}
        >
          <span className="relative z-10 flex items-center gap-2 text-white">
            Support the shadow cult on instagram
            <ExternalLink size={12} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </span>
        </motion.a>
      </div>

      {/* ── Sign Out ── */}
      <div className="mt-6 px-4">
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl active:scale-[0.98] transition-transform"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}
        >
          <LogOut size={15} className="text-red-400" />
          <span className="text-[12px] font-mono font-bold tracking-widest text-red-400">SIGN OUT</span>
        </button>
      </div>

      {/* Modals (non-portaled stay in AnimatePresence) */}
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
        {showAvatarModal && (
          <AvatarChangeModal
            onCamera={() => cameraInputRef.current?.click()}
            onGallery={() => galleryInputRef.current?.click()}
            onClose={() => { setShowAvatarModal(false); setAvatarError(''); }}
            uploading={avatarUploading}
            error={avatarError}
          />
        )}
      </AnimatePresence>

      {/* Portaled full-screen overlays — must be OUTSIDE AnimatePresence */}
      {showRankProgression && ReactDOM.createPortal(
        <div
          className="fixed inset-0 bg-[#05050a] overflow-y-auto"
          style={{ zIndex: 100000 }}
        >
          <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-[#05050a]/95 backdrop-blur-md border-b border-white/5" style={{ paddingTop: 'max(env(safe-area-inset-top, 0px) + 12px, 40px)' }}>
            <div className="text-xs font-mono font-bold text-[#00d4ff] tracking-widest">RANK PROGRESSION</div>
            <button onClick={() => setShowRankProgression(false)} className="p-1.5 rounded-full hover:bg-white/5">
              <X size={18} className="text-gray-400" />
            </button>
          </div>
          <div className="px-4 py-6">
            <Suspense fallback={<div className="text-gray-500 text-xs text-center py-8 font-mono">Loading rank data...</div>}>
              <RankProgressionCard level={player.level} rank={player.rank} />
            </Suspense>
          </div>
        </div>,
        document.body
      )}

      {showStats && ReactDOM.createPortal(
        <StatsDrawer player={player} history={history} onClose={() => setShowStats(false)} />,
        document.body
      )}


    </div>
  );
};

export default YouView;
