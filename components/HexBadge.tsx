import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface HexBadgeProps {
  fillPercent: number;
  tierIndex: number;
  isUnlocked: boolean;
  accentColor: string;
  name: string;
  size?: 'small' | 'large';
  progressText?: string;
}

/* ─── helpers ─────────────────────────────────────────────────────────── */
function hp(cx: number, cy: number, r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
  }).join(' ');
}

function hexToRgb(hex: string) {
  const n = parseInt(hex.replace('#', ''), 16);
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}
function lighten(hex: string, p: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${Math.min(255,r+Math.round(255*p))},${Math.min(255,g+Math.round(255*p))},${Math.min(255,b+Math.round(255*p))})`;
}
function darken(hex: string, p: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${Math.max(0,r-Math.round(255*p))},${Math.max(0,g-Math.round(255*p))},${Math.max(0,b-Math.round(255*p))})`;
}

function generateFillPath(fillPercent: number, seed: number): string {
  if (fillPercent <= 0) return '';
  if (fillPercent >= 1) return 'M0,0 L100,0 L100,100 L0,100 Z';
  const baseY = 100 - fillPercent * 100;
  const pts = [`M0,100`, `L0,${baseY + 4}`];
  for (let i = 0; i <= 10; i++) {
    const x = (i / 10) * 100;
    const jag = Math.sin(seed * 3.7 + i * 1.9) * 9 + Math.cos(seed * 1.3 + i * 4.1) * 5;
    pts.push(`L${x.toFixed(1)},${Math.max(0, Math.min(100, baseY + jag)).toFixed(1)}`);
  }
  pts.push('L100,100', 'Z');
  return pts.join(' ');
}

/* ─── tier decorations (large only, 120×120 viewBox, centre 60,60) ──── */

const T0Decoration: React.FC<{ c: string }> = ({ c }) => (
  <g>
    <polygon points={hp(60,60,36)} fill="none" stroke={c} strokeWidth="0.8" opacity="0.35" />
    {Array.from({length:6},(_,i)=>{
      const a=(Math.PI/3)*i-Math.PI/2;
      return <circle key={i} cx={60+36*Math.cos(a)} cy={60+36*Math.sin(a)} r="2.5" fill={c} opacity="0.65"/>;
    })}
    {/* 6-pointed star */}
    <path d="M60,44 L63.5,56.5 L76,56.5 L65.5,64 L69,76.5 L60,69 L51,76.5 L54.5,64 L44,56.5 L56.5,56.5 Z"
      fill={c} opacity="0.55" />
    <circle cx="60" cy="60" r="7" fill="none" stroke={c} strokeWidth="1.5" opacity="0.7" />
    <circle cx="60" cy="60" r="3.5" fill={c} opacity="0.9" />
    <circle cx="60" cy="60" r="1.5" fill="white" opacity="0.4" />
  </g>
);

const T1Decoration: React.FC<{ c: string }> = ({ c }) => (
  <g>
    {[44, 36, 27].map((r,i) => (
      <polygon key={i} points={hp(60,60,r)} fill="none" stroke={c} strokeWidth="0.8" opacity={0.5 - i*0.12} />
    ))}
    {[0,2,4].map(i => {
      const a=(Math.PI/3)*i-Math.PI/2;
      const x=60+54*Math.cos(a), y=60+54*Math.sin(a);
      const la=a-0.18, ra=a+0.18;
      return <polygon key={i} points={`${x},${y} ${60+47*Math.cos(la)},${60+47*Math.sin(la)} ${60+47*Math.cos(ra)},${60+47*Math.sin(ra)}`} fill={c} opacity="0.7" />;
    })}
    <line x1="60" y1="40" x2="60" y2="80" stroke={c} strokeWidth="1" opacity="0.4" />
    <line x1="40" y1="60" x2="80" y2="60" stroke={c} strokeWidth="1" opacity="0.4" />
    <line x1="46" y1="46" x2="74" y2="74" stroke={c} strokeWidth="0.6" opacity="0.28" />
    <line x1="74" y1="46" x2="46" y2="74" stroke={c} strokeWidth="0.6" opacity="0.28" />
    <polygon points="60,50 70,60 60,70 50,60" fill={c} opacity="0.8" />
    <polygon points="60,53 67,60 60,67 53,60" fill="white" opacity="0.22" />
    <circle cx="60" cy="60" r="3" fill={c} />
  </g>
);

const T2Decoration: React.FC<{ c: string }> = ({ c }) => (
  <g>
    <polygon points={hp(60,60,42)} fill="none" stroke={c} strokeWidth="1.3" opacity="0.5" />
    <polygon points={hp(60,60,30)} fill="none" stroke={c} strokeWidth="0.8" opacity="0.4" />
    {[0,2,4].map(i => {
      const a1=(Math.PI/3)*i-Math.PI/2, a2=a1+Math.PI;
      return <line key={i} x1={60+54*Math.cos(a1)} y1={60+54*Math.sin(a1)} x2={60+54*Math.cos(a2)} y2={60+54*Math.sin(a2)} stroke={c} strokeWidth="0.55" opacity="0.3" />;
    })}
    {Array.from({length:6},(_,i)=>{
      const a=(Math.PI/3)*i-Math.PI/2;
      const cx2=60+43*Math.cos(a), cy2=60+43*Math.sin(a);
      return (
        <g key={i} transform={`translate(${cx2},${cy2}) rotate(${i*60})`}>
          <polygon points="0,-5.5 4,0 0,5.5 -4,0" fill={c} opacity="0.85" />
          <polygon points="0,-3 2.5,0 0,3 -2.5,0" fill="white" opacity="0.2" />
        </g>
      );
    })}
    <circle cx="60" cy="60" r="17" fill="none" stroke={c} strokeWidth="1.5" opacity="0.7" />
    {[0,1,2].map(i => {
      const a=(Math.PI*2/3)*i-Math.PI/2;
      return <line key={i} x1="60" y1="60" x2={60+15*Math.cos(a)} y2={60+15*Math.sin(a)} stroke={c} strokeWidth="1.8" opacity="0.85" />;
    })}
    <circle cx="60" cy="60" r="5.5" fill={c} opacity="0.95" />
    <circle cx="60" cy="60" r="2.5" fill="white" opacity="0.35" />
  </g>
);

const T3Decoration: React.FC<{ c: string }> = ({ c }) => (
  <g>
    <polygon points={hp(60,60,50)} fill="none" stroke={c} strokeWidth="1.8" opacity="0.65" />
    <polygon points={hp(60,60,40)} fill="none" stroke={c} strokeWidth="1.1" opacity="0.5" />
    <polygon points={hp(60,60,29)} fill="none" stroke={c} strokeWidth="0.9" opacity="0.4" />
    {Array.from({length:6},(_,i)=>{
      const a=(Math.PI/3)*i-Math.PI/2;
      return <line key={i} x1={60+50*Math.cos(a)} y1={60+50*Math.sin(a)} x2={60+29*Math.cos(a)} y2={60+29*Math.sin(a)} stroke={c} strokeWidth="1" opacity="0.55" />;
    })}
    {Array.from({length:6},(_,i)=>{
      const a=(Math.PI/3)*i-Math.PI/2;
      const x=60+50*Math.cos(a), y=60+50*Math.sin(a);
      return (
        <g key={i}>
          <circle cx={x} cy={y} r="5" fill={c} opacity="0.85" />
          <circle cx={x} cy={y} r="3" fill="none" stroke="white" strokeWidth="0.6" opacity="0.3" />
          <circle cx={x} cy={y} r="1.8" fill="white" opacity="0.35" />
        </g>
      );
    })}
    {/* Crown */}
    <rect x="46" y="65" width="28" height="6" fill={c} opacity="0.9" rx="1.5" />
    <polygon points="48,65 51.5,55 55,65" fill={c} opacity="0.9" />
    <polygon points="57,65 60,51 63,65" fill={c} opacity="0.9" />
    <polygon points="65,65 68.5,55 72,65" fill={c} opacity="0.9" />
    <circle cx="51.5" cy="55.5" r="2.2" fill="white" opacity="0.45" />
    <circle cx="60" cy="51.5" r="2.8" fill="white" opacity="0.55" />
    <circle cx="68.5" cy="55.5" r="2.2" fill="white" opacity="0.45" />
    {/* Decorative dots between rings */}
    {[1,3,5].map(i => {
      const a=(Math.PI/3)*i-Math.PI/2;
      const x=60+44*Math.cos(a), y=60+44*Math.sin(a);
      return <circle key={i} cx={x} cy={y} r="2.5" fill={c} opacity="0.6" />;
    })}
  </g>
);

/* ─── main component ──────────────────────────────────────────────────── */
const HexBadge: React.FC<HexBadgeProps> = ({
  fillPercent, tierIndex, isUnlocked, accentColor, name, size = 'large', progressText,
}) => {
  const dim = size === 'large' ? 128 : 50;
  const id = useMemo(() => `hb-${tierIndex}-${Math.random().toString(36).slice(2,7)}`, [tierIndex]);
  const CX = size === 'large' ? 60 : 25;
  const CY = size === 'large' ? 60 : 25;
  const R  = size === 'large' ? 54 : 22;
  const vb = size === 'large' ? '0 0 120 120' : '0 0 50 50';

  const outerPts = useMemo(() => hp(CX, CY, R), [CX, CY, R]);
  const fillPath = useMemo(() => generateFillPath(fillPercent, tierIndex * 7 + 3), [fillPercent, tierIndex]);
  const glowPx   = size === 'large' ? [6,10,14,20][tierIndex] ?? 8 : 4;

  const motionFilter = isUnlocked
    ? (tierIndex === 3
        ? [`drop-shadow(0 0 ${glowPx}px ${accentColor})`,`drop-shadow(0 0 ${glowPx*2}px ${accentColor})`,`drop-shadow(0 0 ${glowPx}px ${accentColor})`]
        : `drop-shadow(0 0 ${glowPx}px ${accentColor})`)
    : 'none';

  return (
    <div className="flex flex-col items-center gap-1.5" style={{ width: size === 'large' ? 144 : 58 }}>
      <motion.div
        style={{ width: dim, height: dim, position: 'relative' }}
        animate={isUnlocked ? { filter: Array.isArray(motionFilter) ? motionFilter : [motionFilter] } : {}}
        transition={{ duration: tierIndex === 3 ? 2 : 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        <svg viewBox={vb} width={dim} height={dim} overflow="visible">
          <defs>
            <clipPath id={`${id}-clip`}><polygon points={outerPts} /></clipPath>

            {/* Main background gradient */}
            <radialGradient id={`${id}-bg`} cx="45%" cy="35%" r="65%">
              <stop offset="0%"   stopColor={isUnlocked ? lighten(accentColor, 0.08) : '#1a1a2e'} />
              <stop offset="60%"  stopColor={isUnlocked ? darken(accentColor, 0.18) : '#0f0f1a'} />
              <stop offset="100%" stopColor={isUnlocked ? darken(accentColor, 0.35) : '#090912'} />
            </radialGradient>

            {/* Fill liquid gradient */}
            <linearGradient id={`${id}-liq`} x1="0" y1="1" x2="0.4" y2="0">
              <stop offset="0%"  stopColor={darken(accentColor, 0.2)} stopOpacity="0.9" />
              <stop offset="50%" stopColor={accentColor} stopOpacity="1" />
              <stop offset="100%" stopColor={lighten(accentColor, 0.25)} stopOpacity="0.8" />
            </linearGradient>

            {/* Shimmer overlay */}
            <linearGradient id={`${id}-shi`} x1="0" y1="0" x2="0.6" y2="1">
              <stop offset="0%"   stopColor="white" stopOpacity="0.18" />
              <stop offset="45%"  stopColor="white" stopOpacity="0.05" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </linearGradient>

            {/* Crystal fill pattern */}
            <pattern id={`${id}-pat`} width="14" height="14" patternUnits="userSpaceOnUse">
              <rect width="14" height="14" fill={darken(accentColor, 0.12)} />
              <polygon points="7,1 11,5 11,9 7,13 3,9 3,5" fill="none" stroke={accentColor} strokeWidth="0.4" opacity="0.5" />
              <rect x="5" y="5" width="4" height="4" rx="0.5" fill={accentColor} opacity="0.3" />
              <circle cx="2" cy="2" r="1" fill={lighten(accentColor, 0.2)} opacity="0.4" />
              <circle cx="12" cy="12" r="0.8" fill="white" opacity="0.15" />
            </pattern>
          </defs>

          {/* ── base hex ── */}
          <polygon
            points={outerPts}
            fill={`url(#${id}-bg)`}
            stroke={isUnlocked ? accentColor : 'rgba(255,255,255,0.08)'}
            strokeWidth={size === 'large' ? 2.5 : 1.2}
            strokeDasharray={!isUnlocked && fillPercent === 0 ? (size === 'large' ? '7 4' : '3 2') : 'none'}
            opacity={isUnlocked ? 1 : 0.6}
          />

          {/* ── fill layer (crystal liquid rising from bottom) ── */}
          {fillPercent > 0 && (
            <g clipPath={`url(#${id}-clip)`}>
              <g transform={size === 'large' ? 'translate(6,6) scale(1.08,1.08)' : 'translate(2.5,2.5) scale(0.45,0.45)'}>
                <path d={fillPath} fill={`url(#${id}-pat)`} />
                <path d={fillPath} fill={`url(#${id}-liq)`} opacity="0.5" />
                {/* Bright edge at liquid surface */}
                <path d={fillPath} fill="none" stroke={lighten(accentColor, 0.3)} strokeWidth="1.5" opacity="0.6" />
              </g>
            </g>
          )}

          {/* ── tier decorations (large + unlocked) ── */}
          {size === 'large' && isUnlocked && (
            <>
              {tierIndex === 0 && <T0Decoration c={accentColor} />}
              {tierIndex === 1 && <T1Decoration c={accentColor} />}
              {tierIndex === 2 && <T2Decoration c={accentColor} />}
              {tierIndex === 3 && <T3Decoration c={accentColor} />}
            </>
          )}

          {/* ── progress-only inner detail (partially filled, not unlocked) ── */}
          {size === 'large' && !isUnlocked && fillPercent > 0 && (
            <g clipPath={`url(#${id}-clip)`} opacity="0.25">
              <polygon points={hp(CX, CY, R * 0.62)} fill="none" stroke={accentColor} strokeWidth="0.7" />
            </g>
          )}

          {/* ── shimmer overlay ── */}
          {isUnlocked && (
            <polygon points={outerPts} fill={`url(#${id}-shi)`} />
          )}

          {/* ── double border for unlocked ── */}
          {isUnlocked && (
            <>
              <polygon points={outerPts} fill="none" stroke={accentColor} strokeWidth={size==='large'?2.8:1.5} opacity="0.85" />
              <polygon points={hp(CX,CY,R-4)} fill="none" stroke={accentColor} strokeWidth="0.6" opacity="0.3" />
            </>
          )}

          {/* ── locked state graphic ── */}
          {!isUnlocked && fillPercent === 0 && size === 'large' && (
            <g opacity="0.3">
              <polygon points={hp(60,60,28)} fill="none" stroke="white" strokeWidth="0.8" strokeDasharray="4 3" />
              {/* padlock body */}
              <rect x="52" y="59" width="16" height="13" rx="2.5" fill="none" stroke="white" strokeWidth="1.4" />
              <path d="M56,59 C56,53 64,53 64,59" fill="none" stroke="white" strokeWidth="1.4" />
              <circle cx="60" cy="65" r="2.5" fill="white" />
            </g>
          )}

          {/* ── roman numeral ── */}
          {isUnlocked && (
            <text
              x={CX} y={CY + (size === 'large' ? 5 : 2)}
              textAnchor="middle" dominantBaseline="middle"
              fill="white" fontWeight="900" fontSize={size === 'large' ? 16 : 7} fontFamily="monospace"
              style={{ filter: `drop-shadow(0 0 ${size === 'large' ? 6 : 3}px ${accentColor})` } as React.CSSProperties}
              opacity="0.9"
            >
              {['I','II','III','IV'][tierIndex]}
            </text>
          )}

          {/* ── small locked state ── */}
          {!isUnlocked && size === 'small' && (
            <g opacity="0.35">
              <rect x={CX - 5} y={CY} width="10" height="7" rx="1.5" fill="none" stroke="white" strokeWidth="0.9" />
              <path d={`M${CX-3},${CY} C${CX-3},${CY-4} ${CX+3},${CY-4} ${CX+3},${CY}`} fill="none" stroke="white" strokeWidth="0.9" />
              <circle cx={CX} cy={CY + 3.5} r="1.5" fill="white" />
            </g>
          )}
        </svg>

        {/* ── floating particles (tier 2+) ── */}
        {isUnlocked && size === 'large' && tierIndex >= 2 && (
          <>
            {Array.from({length: tierIndex === 3 ? 6 : 3}, (_, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full pointer-events-none"
                style={{
                  width: tierIndex === 3 ? 3.5 : 2.5,
                  height: tierIndex === 3 ? 3.5 : 2.5,
                  background: i % 2 === 0 ? accentColor : lighten(accentColor, 0.3),
                  boxShadow: `0 0 6px ${accentColor}`,
                  left: `${12 + i * (tierIndex===3?14:26)}%`,
                  top: `${25 + (i % 3) * 22}%`,
                }}
                animate={{
                  y: [-4, -20, -4],
                  opacity: [0.9, 0, 0.9],
                  x: [0, i%2===0 ? 5 : -5, 0],
                }}
                transition={{ duration: 1.8 + i*0.35, repeat: Infinity, delay: i*0.4 }}
              />
            ))}
          </>
        )}
      </motion.div>

      {/* ── label ── */}
      {size === 'large' && (
        <div className="text-center space-y-0.5">
          <div
            className="text-[9px] font-black font-mono uppercase tracking-widest leading-tight"
            style={{ color: isUnlocked ? accentColor : '#374151' }}
          >
            {name}
          </div>
          {progressText && (
            <div
              className="text-[8px] font-mono leading-tight"
              style={{ color: isUnlocked ? 'rgba(255,255,255,0.45)' : '#1f2937' }}
            >
              {progressText}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HexBadge;
