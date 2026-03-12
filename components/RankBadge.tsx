
import React from 'react';
import { motion } from 'framer-motion';

export type RankType = 'E' | 'D' | 'C' | 'B' | 'A' | 'S';

interface RankBadgeProps {
  rank: RankType;
  size?: number;
  animated?: boolean;
  showLabel?: boolean;
  className?: string;
}

export const RANK_META: Record<RankType, {
  primary: string;
  secondary: string;
  letter: string;
  border: string;
  glow: string;
  bg: string;
  labelColor: string;
}> = {
  E: {
    primary:    '#8892a4',
    secondary:  '#4a5568',
    letter:     '#c0c8d8',
    border:     '#5a6478',
    glow:       'rgba(136,146,164,0.0)',
    bg:         '#0e0f14',
    labelColor: '#8892a4',
  },
  D: {
    primary:    '#f59e0b',
    secondary:  '#b45309',
    letter:     '#fde68a',
    border:     '#d97706',
    glow:       'rgba(245,158,11,0.7)',
    bg:         '#1a0e00',
    labelColor: '#f59e0b',
  },
  C: {
    primary:    '#00d4ff',
    secondary:  '#0284c7',
    letter:     '#e0f9ff',
    border:     '#06b6d4',
    glow:       'rgba(0,212,255,0.8)',
    bg:         '#00131a',
    labelColor: '#00d4ff',
  },
  B: {
    primary:    '#bf5eff',
    secondary:  '#7c3aed',
    letter:     '#f3e8ff',
    border:     '#a855f7',
    glow:       'rgba(191,94,255,0.85)',
    bg:         '#0e0018',
    labelColor: '#bf5eff',
  },
  A: {
    primary:    '#ff4500',
    secondary:  '#dc2626',
    letter:     '#fff1ee',
    border:     '#ef4444',
    glow:       'rgba(255,69,0,0.9)',
    bg:         '#1a0300',
    labelColor: '#ff6b3d',
  },
  S: {
    primary:    '#e879f9',
    secondary:  '#fbbf24',
    letter:     '#ffffff',
    border:     '#d946ef',
    glow:       'rgba(232,121,249,0.95)',
    bg:         '#0f0018',
    labelColor: '#f0abfc',
  },
};

/* ─── Per-rank SVG badge renderers ─────────────────────────────────────────── */

const BadgeE: React.FC<{ s: number; animated: boolean }> = ({ s, animated }) => {
  const cx = s / 2, cy = s / 2;
  const r = s * 0.42;
  const m = RANK_META.E;
  const pts = hexPts(cx, cy, r, -30);
  const ptsInner = hexPts(cx, cy, r * 0.74, -30);

  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} style={{ overflow: 'visible' }}>
      <defs>
        <radialGradient id="bg-e" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={m.primary} stopOpacity="0.14" />
          <stop offset="100%" stopColor="#000" stopOpacity="1" />
        </radialGradient>
        <filter id="glow-e" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        {animated && <style>{`
          @keyframes e-flicker { 0%,100%{opacity:1}48%{opacity:0.82}50%{opacity:1}52%{opacity:0.88} }
          .badge-e-letter{animation:e-flicker 4s infinite}
        `}</style>}
      </defs>
      {/* Plate */}
      <polygon points={pts} fill="url(#bg-e)" stroke={m.border} strokeWidth={s * 0.032} />
      {/* Crack lines across plate */}
      <line x1={cx-r*0.55} y1={cy-r*0.35} x2={cx+r*0.15} y2={cy+r*0.6} stroke={m.primary} strokeWidth={s*0.018} opacity="0.22" strokeLinecap="round"/>
      <line x1={cx+r*0.4} y1={cy-r*0.55} x2={cx-r*0.1} y2={cy+r*0.3} stroke={m.primary} strokeWidth={s*0.014} opacity="0.16" strokeLinecap="round"/>
      {/* Inner ring */}
      <polygon points={ptsInner} fill="none" stroke={m.primary} strokeWidth={s*0.016} opacity="0.2" />
      {/* Letter */}
      <text className="badge-e-letter" x={cx} y={cy+s*0.15} textAnchor="middle" fontSize={s*0.42} fontWeight="900" fontFamily="'Arial Black',sans-serif" fill={m.letter} filter="url(#glow-e)" opacity="0.95">E</text>
    </svg>
  );
};

const BadgeD: React.FC<{ s: number; animated: boolean }> = ({ s, animated }) => {
  const cx = s / 2, cy = s / 2;
  const r = s * 0.42;
  const m = RANK_META.D;
  const pts      = hexPts(cx, cy, r, -30);
  const ptsInner = hexPts(cx, cy, r * 0.74, -30);
  const id = `d-${s}`;

  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} style={{ overflow: 'visible', filter: `drop-shadow(0 0 ${s*0.13}px ${m.glow})` }}>
      <defs>
        <radialGradient id={`bg-${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={m.primary} stopOpacity="0.28" />
          <stop offset="100%" stopColor={m.bg} stopOpacity="1" />
        </radialGradient>
        <filter id={`txt-${id}`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="2.5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        {animated && <style>{`
          @keyframes d-glow{0%,100%{opacity:1;filter:drop-shadow(0 0 ${s*0.12}px ${m.glow})}50%{opacity:0.85;filter:drop-shadow(0 0 ${s*0.22}px ${m.glow})}}
          .badge-d-wrap{animation:d-glow 2.4s ease-in-out infinite}
        `}</style>}
      </defs>
      <g className="badge-d-wrap">
        <polygon points={pts} fill={`url(#bg-${id})`} stroke={m.border} strokeWidth={s*0.034} />
        {/* Inner ring */}
        <polygon points={ptsInner} fill="none" stroke={m.primary} strokeWidth={s*0.022} opacity="0.55" />
        {/* 3 bottom dots */}
        {[-1,0,1].map(i => <circle key={i} cx={cx + i * s*0.12} cy={cy + s*0.22} r={s*0.032} fill={m.primary} opacity="0.9" />)}
        {/* Letter */}
        <text x={cx} y={cy+s*0.12} textAnchor="middle" fontSize={s*0.45} fontWeight="900" fontFamily="'Arial Black',sans-serif" fill={m.letter} filter={`url(#txt-${id})`}>D</text>
      </g>
    </svg>
  );
};

const BadgeC: React.FC<{ s: number; animated: boolean }> = ({ s, animated }) => {
  const cx = s / 2, cy = s / 2;
  const r = s * 0.42;
  const m = RANK_META.C;
  const pts      = hexPts(cx, cy, r, -30);
  const ptsInner = hexPts(cx, cy, r * 0.74, -30);
  const id = `c-${s}`;

  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} style={{ overflow: 'visible', filter: `drop-shadow(0 0 ${s*0.15}px ${m.glow})` }}>
      <defs>
        <radialGradient id={`bg-${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={m.primary} stopOpacity="0.32" />
          <stop offset="100%" stopColor={m.bg} stopOpacity="1" />
        </radialGradient>
        <filter id={`txt-${id}`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        {animated && <style>{`
          @keyframes c-pulse{0%,100%{opacity:0.55}50%{opacity:1}}
          .badge-c-ring{animation:c-pulse 1.8s ease-in-out infinite}
          @keyframes c-shimmer{0%{opacity:0.6}50%{opacity:1}100%{opacity:0.6}}
          .badge-c-bar{animation:c-shimmer 1.4s ease-in-out infinite}
        `}</style>}
      </defs>
      <polygon points={pts} fill={`url(#bg-${id})`} stroke={m.border} strokeWidth={s*0.036} />
      <polygon className="badge-c-ring" points={ptsInner} fill="none" stroke={m.primary} strokeWidth={s*0.026} opacity="0.7" />
      {/* Ice bar accents */}
      <line className="badge-c-bar" x1={cx - s*0.2} y1={cy - s*0.19} x2={cx + s*0.2} y2={cy - s*0.19} stroke={m.primary} strokeWidth={s*0.028} opacity="0.75" strokeLinecap="round"/>
      <line className="badge-c-bar" x1={cx - s*0.2} y1={cy + s*0.23} x2={cx + s*0.2} y2={cy + s*0.23} stroke={m.primary} strokeWidth={s*0.028} opacity="0.75" strokeLinecap="round"/>
      {/* Letter */}
      <text x={cx} y={cy+s*0.14} textAnchor="middle" fontSize={s*0.44} fontWeight="900" fontFamily="'Arial Black',sans-serif" fill={m.letter} filter={`url(#txt-${id})`}>C</text>
    </svg>
  );
};

const BadgeB: React.FC<{ s: number; animated: boolean }> = ({ s, animated }) => {
  const cx = s / 2, cy = s / 2;
  const r = s * 0.42;
  const m = RANK_META.B;
  const pts      = hexPts(cx, cy, r, -30);
  const ptsInner = hexPts(cx, cy, r * 0.74, -30);
  const id = `b-${s}`;
  // 3 vertex gems (top, bottom-left, bottom-right)
  const gems = [90, 210, 330].map(deg => {
    const a = (deg * Math.PI) / 180;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  });

  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} style={{ overflow: 'visible', filter: `drop-shadow(0 0 ${s*0.16}px ${m.glow})` }}>
      <defs>
        <radialGradient id={`bg-${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={m.primary} stopOpacity="0.35" />
          <stop offset="100%" stopColor={m.bg} stopOpacity="1" />
        </radialGradient>
        <filter id={`txt-${id}`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="3.5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        {animated && <style>{`
          @keyframes b-arc{0%,100%{opacity:0;stroke-dashoffset:0}40%{opacity:0.9}70%{opacity:0.4}100%{opacity:0;stroke-dashoffset:60}}
          .badge-b-arc{animation:b-arc 2s ease-in-out infinite;stroke-dasharray:30 60}
          @keyframes b-gem{0%,100%{opacity:0.8}50%{opacity:1}}
          .badge-b-gem{animation:b-gem 1.6s ease-in-out infinite}
        `}</style>}
      </defs>
      <polygon points={pts} fill={`url(#bg-${id})`} stroke={m.border} strokeWidth={s*0.036} />
      <polygon points={ptsInner} fill="none" stroke={m.primary} strokeWidth={s*0.024} opacity="0.6" />
      {/* Lightning arc */}
      <polygon className="badge-b-arc" points={ptsInner} fill="none" stroke={m.letter} strokeWidth={s*0.02} />
      {/* Vertex gems */}
      {gems.map((g, i) => <circle className="badge-b-gem" key={i} cx={g.x} cy={g.y} r={s*0.038} fill={m.primary} stroke={m.letter} strokeWidth={s*0.012} />)}
      {/* Letter */}
      <text x={cx} y={cy+s*0.14} textAnchor="middle" fontSize={s*0.44} fontWeight="900" fontFamily="'Arial Black',sans-serif" fill={m.letter} filter={`url(#txt-${id})`}>B</text>
    </svg>
  );
};

const BadgeA: React.FC<{ s: number; animated: boolean }> = ({ s, animated }) => {
  const cx = s / 2, cy = s / 2;
  const r = s * 0.42;
  const m = RANK_META.A;
  const pts      = hexPts(cx, cy, r, -30);
  const ptsInner = hexPts(cx, cy, r * 0.74, -30);
  const id = `a-${s}`;
  // 6 vertex fire-gems
  const gems = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 180) * (60 * i - 30);
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  });

  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} style={{ overflow: 'visible', filter: `drop-shadow(0 0 ${s*0.18}px ${m.glow})` }}>
      <defs>
        <radialGradient id={`bg-${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={m.primary} stopOpacity="0.38" />
          <stop offset="100%" stopColor={m.bg} stopOpacity="1" />
        </radialGradient>
        <filter id={`txt-${id}`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="4" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        {animated && <style>{`
          @keyframes a-burn{0%,100%{filter:drop-shadow(0 0 ${s*0.16}px ${m.glow})}50%{filter:drop-shadow(0 0 ${s*0.3}px ${m.glow})}}
          .badge-a-outer{animation:a-burn 1.2s ease-in-out infinite}
          @keyframes a-tri{0%,100%{opacity:0.5}50%{opacity:1}}
          .badge-a-tri{animation:a-tri 1.4s ease-in-out infinite}
        `}</style>}
      </defs>
      <g className="badge-a-outer">
        <polygon points={pts} fill={`url(#bg-${id})`} stroke={m.border} strokeWidth={s*0.038} />
        <polygon points={ptsInner} fill="none" stroke={m.primary} strokeWidth={s*0.028} opacity="0.7" />
        {/* Triangle sigil */}
        <polygon
          className="badge-a-tri"
          points={`${cx},${cy-s*0.2} ${cx+s*0.18},${cy+s*0.12} ${cx-s*0.18},${cy+s*0.12}`}
          fill="none"
          stroke={m.primary}
          strokeWidth={s*0.025}
        />
        {/* 6 vertex gems */}
        {gems.map((g, i) => <circle key={i} cx={g.x} cy={g.y} r={s*0.032} fill={m.secondary} stroke={m.primary} strokeWidth={s*0.012} opacity="0.95" />)}
        {/* Letter */}
        <text x={cx} y={cy+s*0.14} textAnchor="middle" fontSize={s*0.44} fontWeight="900" fontFamily="'Arial Black',sans-serif" fill={m.letter} filter={`url(#txt-${id})`}>A</text>
      </g>
    </svg>
  );
};

const BadgeS: React.FC<{ s: number; animated: boolean }> = ({ s, animated }) => {
  const cx = s / 2, cy = s / 2;
  const r  = s * 0.42;
  const r2 = r * 1.14; // outer animated ring
  const m  = RANK_META.S;
  const pts        = hexPts(cx, cy, r, -30);
  const ptsInner   = hexPts(cx, cy, r * 0.74, -30);
  const ptsInner2  = hexPts(cx, cy, r * 0.52, 0);
  const ptsOuter   = hexPts(cx, cy, r2, -30);
  const id = `s-${s}`;
  // All 6 alternate-color gems
  const gems = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 180) * (60 * i - 30);
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a), gold: i % 2 === 0 };
  });

  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} style={{ overflow: 'visible', filter: `drop-shadow(0 0 ${s*0.2}px ${m.glow})` }}>
      <defs>
        <radialGradient id={`bg-${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={m.primary} stopOpacity="0.42" />
          <stop offset="60%" stopColor="#1a0028" stopOpacity="1" />
          <stop offset="100%" stopColor={m.bg} stopOpacity="1" />
        </radialGradient>
        <filter id={`txt-${id}`} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        {animated && <style>{`
          @keyframes s-rotate{from{transform:rotate(0deg);transform-origin:${cx}px ${cy}px}to{transform:rotate(360deg);transform-origin:${cx}px ${cy}px}}
          .badge-s-ring{animation:s-rotate 6s linear infinite;transform-origin:${cx}px ${cy}px}
          @keyframes s-glow{0%,100%{opacity:0.55;filter:drop-shadow(0 0 ${s*0.18}px ${m.glow})}50%{opacity:1;filter:drop-shadow(0 0 ${s*0.34}px ${m.glow})}}
          .badge-s-outer{animation:s-glow 1.8s ease-in-out infinite}
          @keyframes s-gem{0%,100%{opacity:0.9}50%{opacity:1}}
          .badge-s-gem{animation:s-gem 1.3s ease-in-out infinite}
          @keyframes s-inner{0%,100%{opacity:0.4}50%{opacity:0.85}}
          .badge-s-inner2{animation:s-inner 2.2s ease-in-out infinite}
        `}</style>}
      </defs>

      {/* Rotating outer dashed ring */}
      <polygon
        className="badge-s-ring"
        points={ptsOuter}
        fill="none"
        stroke={m.secondary}
        strokeWidth={s * 0.018}
        strokeDasharray={`${s*0.09} ${s*0.045}`}
        opacity="0.7"
      />

      {/* Main hex */}
      <g className="badge-s-outer">
        <polygon points={pts} fill={`url(#bg-${id})`} stroke={m.border} strokeWidth={s*0.04} />
      </g>

      {/* Inner rings */}
      <polygon points={ptsInner} fill="none" stroke={m.primary} strokeWidth={s*0.026} opacity="0.7" />
      <polygon className="badge-s-inner2" points={ptsInner2} fill="none" stroke={m.secondary} strokeWidth={s*0.018} strokeDasharray={`${s*0.07} ${s*0.04}`} />

      {/* 6 vertex gems alternating purple/gold */}
      {gems.map((g, i) => (
        <circle
          className="badge-s-gem"
          key={i}
          cx={g.x} cy={g.y}
          r={s * 0.038}
          fill={g.gold ? m.secondary : m.primary}
          stroke="#fff"
          strokeWidth={s * 0.012}
        />
      ))}

      {/* 8-spoke star behind letter */}
      {Array.from({ length: 8 }, (_, i) => {
        const a = (Math.PI / 4) * i;
        return (
          <line
            key={i}
            x1={cx + Math.cos(a) * s * 0.06}
            y1={cy + Math.sin(a) * s * 0.06}
            x2={cx + Math.cos(a) * s * 0.22}
            y2={cy + Math.sin(a) * s * 0.22}
            stroke={i % 2 === 0 ? m.primary : m.secondary}
            strokeWidth={s * 0.022}
            opacity="0.55"
            strokeLinecap="round"
          />
        );
      })}

      {/* Letter */}
      <text x={cx} y={cy+s*0.15} textAnchor="middle" fontSize={s*0.46} fontWeight="900" fontFamily="'Arial Black',sans-serif" fill={m.letter} filter={`url(#txt-${id})`}>S</text>
    </svg>
  );
};

/* ─── Utility ───────────────────────────────────────────────────────────────── */

function hexPts(cx: number, cy: number, r: number, offsetDeg = 0): string {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 180) * (60 * i + offsetDeg);
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
  }).join(' ');
}

/* ─── Main export ───────────────────────────────────────────────────────────── */

const BADGE_COMPONENTS = {
  E: BadgeE,
  D: BadgeD,
  C: BadgeC,
  B: BadgeB,
  A: BadgeA,
  S: BadgeS,
};

const RankBadge: React.FC<RankBadgeProps> = ({
  rank,
  size = 56,
  animated = true,
  showLabel = false,
  className = '',
}) => {
  const meta = RANK_META[rank];
  const BadgeComp = BADGE_COMPONENTS[rank];

  return (
    <motion.div
      className={`relative flex flex-col items-center justify-center select-none ${className}`}
      whileHover={{ scale: 1.1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 22 }}
    >
      <BadgeComp s={size} animated={animated} />
      {showLabel && (
        <div
          className="mt-1 text-[9px] font-black tracking-[0.22em] font-mono uppercase"
          style={{ color: meta.labelColor, textShadow: `0 0 8px ${meta.glow}` }}
        >
          {rank}-RANK
        </div>
      )}
    </motion.div>
  );
};

export default RankBadge;
