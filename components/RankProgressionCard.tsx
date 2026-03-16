import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, Lock } from 'lucide-react';
import RankBadgeComponent from './RankBadge';
import type { RankType } from './RankBadge';

interface RankProgressionCardProps {
  level: number;
  rank: string;
}

const RANKS = [
  { id: 'E', label: 'E RANK', color: '#6b7280', glow: 'rgba(107,114,128,0.5)', levelRequired: 1 },
  { id: 'D', label: 'D RANK', color: '#22c55e', glow: 'rgba(34,197,94,0.5)',   levelRequired: 11 },
  { id: 'C', label: 'C RANK', color: '#3b82f6', glow: 'rgba(59,130,246,0.5)',  levelRequired: 27 },
  { id: 'B', label: 'B RANK', color: '#a855f7', glow: 'rgba(168,85,247,0.5)',  levelRequired: 39 },
  { id: 'A', label: 'A RANK', color: '#f59e0b', glow: 'rgba(245,158,11,0.5)',  levelRequired: 55 },
  { id: 'S', label: 'S RANK', color: '#ef4444', glow: 'rgba(239,68,68,0.5)',   levelRequired: 80 },
];

// Solid gradient for modal mini-bar only
const BAR_GRADIENT = 'linear-gradient(0deg, #8b5cf6 0%, #3b82f6 55%, #06b6d4 100%)';

// ── Crossed Swords SVG ────────────────────────────────────────────────────────
//
// Pre-calculated diagonal positions (viewBox 0 0 56 52, rendered 52×52):
//
//   Left sword : pommel(10,47) → crossguard(18,39) → blade tip(42,15)
//   Right sword: pommel(46,47) → crossguard(38,39) → blade tip(14,15)
//
//   Blade centrelines cross at (28,29) — verified: t=s≈0.417 ∈ [0,1]
//
//   Blade width: ±1 px perpendicular to the 45° axis → very thin, sword-like
//   Crossguard: ±10 px perpendicular, 3.5 px thick → clear T silhouette
//
const CrossedSwords: React.FC<{ color: string }> = ({ color }) => (
  <svg
    width="52"
    height="52"
    viewBox="0 0 56 52"
    fill="none"
    style={{ overflow: 'visible', filter: `drop-shadow(0 0 6px ${color})` }}
  >
    <style>{`
      @keyframes rpcClashL {
        0%,100% { transform: rotate(0deg);  }
        40%      { transform: rotate(-5deg); }
      }
      @keyframes rpcClashR {
        0%,100% { transform: rotate(0deg); }
        40%      { transform: rotate(5deg); }
      }
      @keyframes rpcSpark {
        0%,100% { opacity: 0; transform: scale(0.2); }
        45%      { opacity: 1; transform: scale(1);   }
      }
      .rpc-swL { animation: rpcClashL 2s ease-in-out infinite; transform-origin: 10px 47px; }
      .rpc-swR { animation: rpcClashR 2s ease-in-out infinite; transform-origin: 46px 47px; }
      .rpc-spk { animation: rpcSpark  2s ease-in-out infinite; transform-origin: 28px 29px; }
    `}</style>

    {/* ══ LEFT SWORD ══════════════════════════════════════════════════════════ */}
    <g className="rpc-swL">
      {/* Blade — narrow taper from crossguard (18,39) to tip (42,15)
          Perp direction: (0.707, 0.707). ±1px → (17.3,38.3) and (18.7,39.7) */}
      <polygon
        points="17.3,38.3 18.7,39.7 42,15"
        fill="rgba(210,225,255,0.96)"
        stroke="rgba(200,215,255,0.35)"
        strokeWidth="0.4"
      />
      {/* Fuller — centre line groove */}
      <line
        x1="18" y1="39" x2="40" y2="17"
        stroke="rgba(130,160,215,0.45)"
        strokeWidth="0.65"
      />
      {/* Crossguard — ±10px perp from (18,39), 3.5px thick along axis
          Axis direction: (0.707,-0.707). Perp: (0.707,0.707).
          4 corners (working from lower-left to lower-right, upper-right, upper-left):
            (18−10·0.707−1.75·0.707 , 39−10·0.707+1.75·0.707) ≈ (9.4 ,33.9)
            (18+10·0.707−1.75·0.707 , 39+10·0.707+1.75·0.707) ≈ (23.6,47.7)
            (18+10·0.707+1.75·0.707 , 39+10·0.707−1.75·0.707) ≈ (25.7,45.5)
            (18−10·0.707+1.75·0.707 , 39−10·0.707−1.75·0.707) ≈ (11.5,31.3) */}
      <polygon
        points="9.4,33.9 23.6,47.7 25.7,45.5 11.5,31.3"
        fill={color}
        stroke="rgba(255,255,255,0.22)"
        strokeWidth="0.5"
      />
      {/* Grip — pommel(10,47) to crossguard back edge, ~3px wide
          Uses same ±1px perp at each end as blade base */}
      <polygon
        points="8.9,45.9 11.1,48.1 18.7,39.7 17.3,38.3"
        fill={`${color}cc`}
      />
      {/* Pommel */}
      <circle cx="10" cy="47" r="4" fill={color} stroke="rgba(255,255,255,0.28)" strokeWidth="0.7" />
      {/* Pommel detail ring */}
      <circle cx="10" cy="47" r="2.2" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.7" />
    </g>

    {/* ══ RIGHT SWORD (mirror of left: x′ = 56 − x) ══════════════════════════ */}
    <g className="rpc-swR">
      {/* Blade */}
      <polygon
        points="38.7,38.3 37.3,39.7 14,15"
        fill="rgba(210,225,255,0.96)"
        stroke="rgba(200,215,255,0.35)"
        strokeWidth="0.4"
      />
      {/* Fuller */}
      <line
        x1="38" y1="39" x2="16" y2="17"
        stroke="rgba(130,160,215,0.45)"
        strokeWidth="0.65"
      />
      {/* Crossguard */}
      <polygon
        points="46.6,33.9 32.4,47.7 30.3,45.5 44.5,31.3"
        fill={color}
        stroke="rgba(255,255,255,0.22)"
        strokeWidth="0.5"
      />
      {/* Grip */}
      <polygon
        points="47.1,45.9 44.9,48.1 37.3,39.7 38.7,38.3"
        fill={`${color}cc`}
      />
      {/* Pommel */}
      <circle cx="46" cy="47" r="4" fill={color} stroke="rgba(255,255,255,0.28)" strokeWidth="0.7" />
      <circle cx="46" cy="47" r="2.2" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.7" />
    </g>

    {/* ══ Spark at blade-crossing (28, 29) ════════════════════════════════════ */}
    <g className="rpc-spk">
      <circle cx="28" cy="29" r="2.5" fill="white" />
      <line x1="28" y1="22"   x2="28" y2="26.5" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="28" y1="31.5" x2="28" y2="36"   stroke="white" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="21.5" y1="29" x2="25.5" y2="29"  stroke="white" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="30.5" y1="29" x2="34.5" y2="29"  stroke="white" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="23.4" y1="24.4" x2="25.6" y2="26.6" stroke="white" strokeWidth="1.1" strokeLinecap="round" />
      <line x1="30.4" y1="31.4" x2="32.6" y2="33.6" stroke="white" strokeWidth="1.1" strokeLinecap="round" />
      <line x1="32.6" y1="24.4" x2="30.4" y2="26.6" stroke="white" strokeWidth="1.1" strokeLinecap="round" />
      <line x1="25.6" y1="31.4" x2="23.4" y2="33.6" stroke="white" strokeWidth="1.1" strokeLinecap="round" />
    </g>
  </svg>
);

// ── Rank badge (uses shared RankBadge component) ──────────────────────────────
const RankBadge: React.FC<{ rank: typeof RANKS[0]; size?: 'sm' | 'lg'; unlocked?: boolean }> = ({
  rank, size = 'sm', unlocked = true,
}) => {
  const dim = size === 'lg' ? 52 : 40;
  if (!unlocked) {
    return (
      <div
        className="flex items-center justify-center rounded-xl font-black font-mono select-none flex-shrink-0 opacity-30"
        style={{
          width: dim, height: dim,
          background: 'rgba(18,18,28,0.9)',
          border: '2px solid rgba(255,255,255,0.07)',
        }}
      >
        <Lock size={dim * 0.3} className="text-gray-600" />
      </div>
    );
  }
  return (
    <RankBadgeComponent
      rank={rank.id as RankType}
      size={dim}
      animated={size === 'lg'}
    />
  );
};

// ── Layout constants ──────────────────────────────────────────────────────────
const TRACK_HEIGHT = 300;
const BADGE_AREA   = 70;
const CONTAINER_H  = TRACK_HEIGHT + BADGE_AREA * 2;
const CHECKPOINT_COUNT = 5;

const RankProgressionCard: React.FC<RankProgressionCardProps> = ({ level, rank }) => {
  const [scrollFill, setScrollFill]     = useState(0);
  const [showAllRanks, setShowAllRanks] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentRankIdx = RANKS.findIndex(r => r.id === rank);
  const currentRank    = RANKS[Math.max(0, currentRankIdx)];
  const isMaxRank      = currentRankIdx === RANKS.length - 1;
  const nextRank       = isMaxRank ? null : RANKS[currentRankIdx + 1];

  const rangeStart = currentRank.levelRequired;
  const rangeEnd   = nextRank ? nextRank.levelRequired : currentRank.levelRequired + 20;
  const rangeSpan  = Math.max(1, rangeEnd - rangeStart);

  const playerProgress = isMaxRank
    ? 1
    : Math.min(1, Math.max(0, (level - rangeStart) / rangeSpan));

  const checkpoints = Array.from({ length: CHECKPOINT_COUNT }, (_, i) => {
    const pct = i / (CHECKPOINT_COUNT - 1);
    const lvl = Math.round(rangeStart + pct * rangeSpan);
    return { pct, level: lvl, isStart: i === 0, isEnd: i === CHECKPOINT_COUNT - 1 };
  });

  const updateFill = useCallback(() => {
    if (!containerRef.current) return;
    const rect  = containerRef.current.getBoundingClientRect();
    const wh    = window.innerHeight;
    const ratio = Math.min(1, Math.max(0, (wh - rect.top) / (wh + rect.height * 0.35)));
    setScrollFill(Math.min(playerProgress, ratio));
  }, [playerProgress]);

  useEffect(() => {
    updateFill();
    window.addEventListener('scroll', updateFill, { passive: true });
    return () => window.removeEventListener('scroll', updateFill);
  }, [updateFill]);

  const pxUp     = (pct: number) => Math.round(pct * TRACK_HEIGHT);
  const bottomPx = (pct: number) => BADGE_AREA + pxUp(pct);

  // Middle 3 checkpoints alternating sides: LEFT, RIGHT, LEFT
  const middleCps = checkpoints.filter(cp => !cp.isStart && !cp.isEnd);
  const cpSide    = ['left', 'right', 'left'] as const;

  // ── Styles ──────────────────────────────────────────────────────────────────
  const glassCard: React.CSSProperties = {
    background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(8,8,20,0.84) 14%, rgba(4,4,14,0.94) 100%)',
    backdropFilter: 'blur(24px) saturate(180%)',
    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
    borderRadius: 20,
    borderTop:    '1px solid rgba(255,255,255,0.10)',
    borderLeft:   '1px solid rgba(255,255,255,0.07)',
    borderRight:  '1px solid rgba(255,255,255,0.04)',
    borderBottom: '1px solid rgba(255,255,255,0.03)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 32px rgba(0,0,0,0.5)',
  };

  // T005 — liquid-glass stat boxes
  const miniBox: React.CSSProperties = {
    background: 'linear-gradient(160deg, rgba(255,255,255,0.07) 0%, rgba(8,8,20,0.75) 40%, rgba(4,4,14,0.85) 100%)',
    backdropFilter: 'blur(20px) saturate(160%)',
    WebkitBackdropFilter: 'blur(20px) saturate(160%)',
    borderRadius: 14,
    borderTop:    '1px solid rgba(255,255,255,0.14)',
    borderLeft:   '1px solid rgba(255,255,255,0.09)',
    borderRight:  '1px solid rgba(255,255,255,0.04)',
    borderBottom: '1px solid rgba(255,255,255,0.03)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 4px 16px rgba(0,0,0,0.4)',
    overflow: 'hidden',
  };

  return (
    <>
      <div ref={containerRef} style={glassCard}>
        {/* Specular top edge */}
        <div
          className="pointer-events-none"
          style={{
            height: 1, borderRadius: '20px 20px 0 0',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.14), transparent)',
          }}
        />

        <div className="px-5 pt-4 pb-5">

          {/* ── Header ──────────────────────────────────────────────────────── */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-[10px] font-mono text-gray-600 tracking-widest uppercase leading-none">
                Rank Progression
              </div>
              <div className="text-white font-black text-sm tracking-tight mt-1">
                {isMaxRank ? 'MAX RANK ACHIEVED' : `${currentRank.label} → ${nextRank!.label}`}
              </div>
            </div>
            {!isMaxRank && (
              <div className="text-right">
                <div className="text-[10px] font-mono text-gray-600">
                  {level - rangeStart} / {rangeSpan} lvls
                </div>
                <div className="text-[10px] font-mono mt-0.5" style={{ color: '#8b5cf6' }}>
                  {rangeEnd - level} to {nextRank!.label}
                </div>
              </div>
            )}
          </div>

          {/* ── Timeline ────────────────────────────────────────────────────── */}
          <div className="relative" style={{ height: CONTAINER_H }}>

            {/* NEXT RANK BADGE — badge on top, label below, centred */}
            <div
              className="absolute flex flex-col items-center"
              style={{ top: 0, left: '50%', transform: 'translateX(-50%)', gap: 4 }}
            >
              <RankBadge rank={nextRank ?? currentRank} unlocked={isMaxRank} />
              <div className="text-center" style={{ whiteSpace: 'nowrap' }}>
                <div
                  className="font-mono text-[11px] font-black leading-tight"
                  style={{ color: nextRank?.color ?? currentRank.color }}
                >
                  {isMaxRank ? 'MASTERED' : nextRank!.label}
                </div>
                {!isMaxRank && (
                  <div className="text-[9px] font-mono text-gray-600 mt-0.5">
                    Lvl {nextRank!.levelRequired}
                  </div>
                )}
              </div>
            </div>

            {/* VERTICAL BAR TRACK — centred */}
            <div
              className="absolute"
              style={{
                top: BADGE_AREA,
                height: TRACK_HEIGHT,
                width: 8,
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(255,255,255,0.035)',
                border: '1px solid rgba(255,255,255,0.10)',
                borderRadius: 999,
              }}
            >
              {/* T003 — liquid-glass scroll-driven fill with enhanced animation */}
              <motion.div
                className="absolute bottom-0 left-0 right-0"
                animate={{ height: `${scrollFill * 100}%` }}
                transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
                style={{
                  background: 'linear-gradient(0deg, rgba(139,92,246,0.70) 0%, rgba(59,130,246,0.60) 55%, rgba(6,182,212,0.60) 100%)',
                  backdropFilter: 'blur(6px)',
                  WebkitBackdropFilter: 'blur(6px)',
                  borderRadius: 999,
                  borderTop: '1px solid rgba(255,255,255,0.35)',
                  boxShadow: `inset 0 1px 0 rgba(255,255,255,0.28), 0 0 ${8 + scrollFill * 16}px rgba(139,92,246,${0.35 + scrollFill * 0.4})`,
                }}
              >
                {/* Animated shimmer at the fill top edge */}
                <motion.div
                  className="absolute top-0 left-0 right-0 h-[3px] rounded-full"
                  animate={{ opacity: [0.4, 0.9, 0.4] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                  style={{
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)',
                  }}
                />
              </motion.div>

              {/* T004 — white checkpoint dots on the bar (middle 3) */}
              {middleCps.map((cp, i) => {
                const reached = level >= cp.level;
                return (
                  <div
                    key={i}
                    className="absolute"
                    style={{
                      bottom: pxUp(cp.pct) - 6,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      zIndex: 2,
                    }}
                  >
                    <div
                      style={{
                        width: 12, height: 12,
                        borderRadius: '50%',
                        background: reached ? 'rgba(255,255,255,0.95)' : 'rgba(14,14,24,1)',
                        border: `2px solid ${reached ? 'rgba(255,255,255,0.90)' : 'rgba(255,255,255,0.15)'}`,
                        boxShadow: reached ? '0 0 7px rgba(255,255,255,0.65)' : 'none',
                      }}
                    />
                  </div>
                );
              })}
            </div>

            {/* T002 — CHECKPOINT LABELS, alternating sides, fixed-width aligned */}
            {middleCps.map((cp, i) => {
              const side    = cpSide[i];
              const reached = level >= cp.level;
              const isLeft  = side === 'left';

              return (
                <div
                  key={i}
                  className="absolute flex items-center"
                  style={{
                    bottom: bottomPx(cp.pct) - 6,
                    ...(isLeft
                      ? { right: 'calc(50% + 10px)', flexDirection: 'row-reverse' }
                      : { left:  'calc(50% + 10px)', flexDirection: 'row' }),
                    gap: 6,
                  }}
                >
                  {/* Connector tick */}
                  <div style={{
                    width: 14, height: 1, flexShrink: 0,
                    background: reached ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.09)',
                  }} />
                  {/* Label — fixed width so left/right labels are consistently sized */}
                  <div
                    className="flex items-center gap-1"
                    style={{
                      minWidth: 60,
                      justifyContent: isLeft ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <span
                      className="font-mono text-[10px] font-bold"
                      style={{ color: reached ? 'rgba(255,255,255,0.85)' : '#374151' }}
                    >
                      LVL {cp.level}
                    </span>
                    {reached
                      ? <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.75)', lineHeight: 1 }}>✓</span>
                      : <Lock size={7} className="text-gray-700 flex-shrink-0" />
                    }
                  </div>
                </div>
              );
            })}

            {/* YOU MARKER — swords centred on bar, pill to the right */}
            <div
              className="absolute"
              style={{
                bottom: bottomPx(playerProgress) - 26,
                left: 0, right: 0,
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Swords */}
              <div style={{ position: 'relative', zIndex: 2, flexShrink: 0 }}>
                <CrossedSwords color={currentRank.color} />
              </div>

              {/* YOU pill — right side of bar */}
              <div className="absolute" style={{ left: 'calc(50% + 32px)' }}>
                <div
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-[9px] font-black"
                  style={{
                    whiteSpace: 'nowrap',
                    background: `${currentRank.color}18`,
                    border: `1px solid ${currentRank.color}60`,
                    color: currentRank.color,
                    boxShadow: `0 0 10px ${currentRank.glow}`,
                  }}
                >
                  <motion.div
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                    style={{ width: 5, height: 5, borderRadius: '50%', background: currentRank.color, flexShrink: 0 }}
                  />
                  YOU · {level}
                </div>
              </div>
            </div>

            {/* T002 — CURRENT RANK BADGE — label above badge, centred */}
            <div
              className="absolute flex flex-col items-center"
              style={{ bottom: 0, left: '50%', transform: 'translateX(-50%)', gap: 4 }}
            >
              <div className="text-center" style={{ whiteSpace: 'nowrap' }}>
                <div
                  className="font-mono text-[11px] font-black leading-tight"
                  style={{ color: currentRank.color }}
                >
                  {currentRank.label}
                </div>
                <div className="text-[9px] font-mono text-gray-600 mt-0.5">Current rank</div>
              </div>
              <RankBadge rank={currentRank} unlocked />
            </div>
          </div>

          {/* T005 — Liquid-glass stat boxes */}
          <div className="grid grid-cols-2 gap-3 mt-5">
            {/* Levels to go */}
            <div style={miniBox}>
              {/* Specular top edge */}
              <div style={{
                height: 1,
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)',
                borderRadius: '14px 14px 0 0',
              }} />
              <div className="p-3 text-center">
                <div className="font-black text-2xl leading-none" style={{ color: '#8b5cf6' }}>
                  {isMaxRank ? '—' : rangeEnd - level}
                </div>
                <div className="text-[10px] font-mono text-gray-600 mt-1.5 tracking-widest uppercase">
                  Levels to go
                </div>
              </div>
            </div>

            {/* Rank progress */}
            <div style={miniBox}>
              <div style={{
                height: 1,
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)',
                borderRadius: '14px 14px 0 0',
              }} />
              <div className="p-3 text-center">
                <div className="font-black text-2xl leading-none" style={{ color: '#06b6d4' }}>
                  {Math.round(playerProgress * 100)}%
                </div>
                <div className="text-[10px] font-mono text-gray-600 mt-1.5 tracking-widest uppercase">
                  Rank Progress
                </div>
              </div>
            </div>
          </div>

          {/* View All Ranks button */}
          <button
            onClick={() => setShowAllRanks(true)}
            className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-mono text-[11px] font-bold tracking-widest transition-all hover:bg-white/[0.05] active:scale-[0.98]"
            style={{ border: '1px solid rgba(255,255,255,0.07)', color: '#6b7280' }}
          >
            VIEW ALL RANKS
            <ChevronRight size={12} />
          </button>
        </div>
      </div>

      {/* ══ All Ranks Modal ══════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showAllRanks && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)' }}
            onClick={e => { if (e.target === e.currentTarget) setShowAllRanks(false); }}
          >
            <motion.div
              initial={{ opacity: 0, y: 32, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 32, scale: 0.97 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="w-full max-w-sm rounded-3xl overflow-hidden"
              style={{
                background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(8,8,20,0.97) 14%, rgba(4,4,14,1) 100%)',
                backdropFilter: 'blur(32px) saturate(180%)',
                border: '1px solid rgba(255,255,255,0.10)',
                boxShadow: '0 32px 80px rgba(0,0,0,0.95), inset 0 1px 0 rgba(255,255,255,0.08)',
              }}
            >
              {/* Modal header */}
              <div
                className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div>
                  <div className="text-white font-black text-sm tracking-tight">ALL RANKS</div>
                  <div className="text-gray-600 font-mono text-[10px] tracking-widest mt-0.5">
                    HUNTER PROGRESSION SYSTEM
                  </div>
                </div>
                <button
                  onClick={() => setShowAllRanks(false)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-500 hover:text-white transition-colors"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}
                >
                  <X size={14} />
                </button>
              </div>

              {/* Rank list */}
              <div className="p-4 space-y-2 max-h-[70vh] overflow-y-auto">
                {RANKS.map((r, i) => {
                  const playerRankIdx = RANKS.findIndex(rr => rr.id === rank);
                  const unlocked  = i <= playerRankIdx;
                  const isCurrent = r.id === rank;
                  const isNext    = i === playerRankIdx + 1;

                  return (
                    <div
                      key={r.id}
                      className="flex items-center gap-3 p-3 rounded-xl transition-all"
                      style={{
                        background: isCurrent ? `${r.color}12` : 'rgba(255,255,255,0.015)',
                        border: isCurrent ? `1px solid ${r.color}55` : '1px solid rgba(255,255,255,0.04)',
                        boxShadow: isCurrent ? `0 0 14px ${r.glow}30` : 'none',
                      }}
                    >
                      <RankBadge rank={r} unlocked={unlocked} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-black" style={{ color: unlocked ? r.color : '#374151' }}>
                            {r.label}
                          </span>
                          {isCurrent && (
                            <span
                              className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full"
                              style={{ background: `${r.color}20`, color: r.color, border: `1px solid ${r.color}40` }}
                            >
                              CURRENT
                            </span>
                          )}
                          {isNext && (
                            <span
                              className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full text-gray-600"
                              style={{ border: '1px solid rgba(255,255,255,0.07)' }}
                            >
                              NEXT
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] font-mono mt-0.5" style={{ color: unlocked ? '#6b7280' : '#374151' }}>
                          {r.levelRequired === 1 ? 'Starting rank' : `Unlocks at Level ${r.levelRequired}`}
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        {unlocked ? (
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center"
                            style={{ background: `${r.color}20`, border: `1px solid ${r.color}40` }}
                          >
                            <div className="w-1.5 h-1.5 rounded-full" style={{ background: r.color }} />
                          </div>
                        ) : (
                          <Lock size={12} className="text-gray-700" />
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Mini progress bar within current rank */}
                <div className="pt-2">
                  <div
                    className="rounded-xl p-3"
                    style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.20)' }}
                  >
                    <div className="flex justify-between text-[10px] font-mono mb-2">
                      <span style={{ color: '#8b5cf6' }}>Progress to {nextRank?.label ?? 'MAX'}</span>
                      <span className="text-gray-500">{Math.round(playerProgress * 100)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${playerProgress * 100}%`,
                          background: BAR_GRADIENT,
                          boxShadow: '0 0 8px rgba(139,92,246,0.6)',
                          transition: 'width 0.7s ease',
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] font-mono mt-1.5 text-gray-600">
                      <span>Lvl {rangeStart}</span>
                      <span style={{ color: '#8b5cf6' }}>Lvl {level} ← YOU</span>
                      <span>Lvl {rangeEnd}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default RankProgressionCard;
