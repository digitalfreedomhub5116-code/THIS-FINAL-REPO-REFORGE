import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface CrystalIconProps {
  color: string;
  glow: string;
  size?: number;
  animate?: boolean;
  className?: string;
}

const lighten = (hex: string, pct: number) => {
  const n = parseInt(hex.replace('#',''), 16);
  return `rgb(${Math.min(255,((n>>16)&0xff)+Math.round(255*pct))},${Math.min(255,((n>>8)&0xff)+Math.round(255*pct))},${Math.min(255,(n&0xff)+Math.round(255*pct))})`;
};
const darken = (hex: string, pct: number) => {
  const n = parseInt(hex.replace('#',''), 16);
  return `rgb(${Math.max(0,((n>>16)&0xff)-Math.round(255*pct))},${Math.max(0,((n>>8)&0xff)-Math.round(255*pct))},${Math.max(0,(n&0xff)-Math.round(255*pct))})`;
};

/**
 * Crystal pile — 3 main crystals (center tall, left/right shorter) + small fragment shards + sparkle dots.
 * viewBox: 0 0 64 56
 */
const CrystalIcon: React.FC<CrystalIconProps> = ({
  color, glow, size = 28, animate: doAnimate = false, className = '',
}) => {
  const id = useMemo(() => `cp-${color.replace('#','')}-${Math.random().toString(36).slice(2,6)}`, [color]);

  const Wrapper = doAnimate ? motion.div : ('div' as any);
  const wrapperProps = doAnimate
    ? { animate: { y: [0, -3, 0], scale: [1, 1.05, 1] }, transition: { duration: 2.8, repeat: Infinity, ease: 'easeInOut' } }
    : {};

  return (
    <Wrapper
      className={className}
      style={{ width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', position: 'relative' as const }}
      {...wrapperProps}
    >
      {/* Ambient glow pool beneath */}
      <div style={{
        position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: size * 0.9, height: size * 0.28,
        borderRadius: '50%', background: color, filter: `blur(${size * 0.2}px)`, opacity: 0.35,
      }} />

      <svg viewBox="0 0 64 56" width={size} height={size}
        style={{ position: 'relative', zIndex: 1, overflow: 'visible', filter: `drop-shadow(0 0 ${size*0.12}px ${color})` }}>
        <defs>
          {/* Center crystal gradient */}
          <linearGradient id={`${id}-cg`} x1="0.2" y1="0" x2="0.8" y2="1">
            <stop offset="0%"   stopColor={lighten(color, 0.35)} />
            <stop offset="30%"  stopColor={lighten(color, 0.1)} />
            <stop offset="70%"  stopColor={color} />
            <stop offset="100%" stopColor={darken(color, 0.28)} />
          </linearGradient>
          {/* Left crystal gradient */}
          <linearGradient id={`${id}-lg`} x1="0.1" y1="0" x2="0.9" y2="1">
            <stop offset="0%"   stopColor={lighten(color, 0.2)} />
            <stop offset="100%" stopColor={darken(color, 0.22)} />
          </linearGradient>
          {/* Right crystal gradient */}
          <linearGradient id={`${id}-rg`} x1="0.9" y1="0" x2="0.1" y2="1">
            <stop offset="0%"   stopColor={lighten(color, 0.18)} />
            <stop offset="100%" stopColor={darken(color, 0.25)} />
          </linearGradient>
          {/* Highlight gradient */}
          <linearGradient id={`${id}-hi`} x1="0" y1="0" x2="0.5" y2="1">
            <stop offset="0%"   stopColor="white" stopOpacity="0.55" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* ── LEFT crystal (medium, tilted left) ── */}
        <g transform="translate(13,4) rotate(-8, 8, 20)">
          {/* body */}
          <polygon points="8,0 14,6 12,30 4,30 2,6" fill={`url(#${id}-lg)`} stroke={lighten(color,0.1)} strokeWidth="0.5" />
          {/* left facet */}
          <polygon points="8,0 2,6 5,12 8,5"   fill={lighten(color,0.22)} opacity="0.55" />
          {/* right facet */}
          <polygon points="8,0 14,6 11,12 8,5" fill={darken(color,0.1)}   opacity="0.5" />
          {/* center shine */}
          <polygon points="5,12 8,5 11,12 8,24" fill={`url(#${id}-hi)`}   opacity="0.35" />
          {/* specular tip */}
          <polygon points="6,1 8,0 10,1 9,5 7,5" fill="white" opacity="0.45" />
          {/* reflection dot */}
          <ellipse cx="5" cy="9" rx="1.2" ry="0.8" fill="white" opacity="0.3" />
        </g>

        {/* ── CENTER crystal (tallest, upright) ── */}
        <g transform="translate(22,-2)">
          {/* body */}
          <polygon points="10,0 18,8 16,44 4,44 2,8" fill={`url(#${id}-cg)`} stroke={lighten(color,0.15)} strokeWidth="0.6" />
          {/* left facet */}
          <polygon points="10,0 2,8 6,16 10,6"   fill={lighten(color,0.25)} opacity="0.55" />
          {/* right facet */}
          <polygon points="10,0 18,8 14,16 10,6" fill={darken(color,0.08)} opacity="0.6" />
          {/* center highlight stripe */}
          <polygon points="6,16 10,6 14,16 10,36" fill={`url(#${id}-hi)`} opacity="0.38" />
          {/* bottom left facet */}
          <polygon points="2,8 4,44 10,38 6,16"   fill={darken(color,0.18)} opacity="0.7" />
          {/* bottom right facet */}
          <polygon points="18,8 16,44 10,38 14,16" fill={darken(color,0.22)} opacity="0.75" />
          {/* specular tip */}
          <polygon points="7,2 10,0 13,2 12,7 8,7" fill="white" opacity="0.5" />
          {/* reflection dots */}
          <ellipse cx="6"  cy="12" rx="1.5" ry="1"   fill="white" opacity="0.3" />
          <ellipse cx="13" cy="20" rx="1"   ry="0.7"  fill="white" opacity="0.2" />
        </g>

        {/* ── RIGHT crystal (small, tilted right) ── */}
        <g transform="translate(40,8) rotate(9, 7, 16)">
          {/* body */}
          <polygon points="7,0 13,5 11,24 3,24 1,5" fill={`url(#${id}-rg)`} stroke={lighten(color,0.1)} strokeWidth="0.5" />
          {/* left facet */}
          <polygon points="7,0 1,5 4,10 7,4"   fill={lighten(color,0.2)}  opacity="0.5" />
          {/* right facet */}
          <polygon points="7,0 13,5 10,10 7,4" fill={darken(color,0.12)}  opacity="0.55" />
          {/* center shine */}
          <polygon points="4,10 7,4 10,10 7,20" fill={`url(#${id}-hi)`}   opacity="0.32" />
          {/* specular tip */}
          <polygon points="5,1 7,0 9,1 8,4 6,4" fill="white" opacity="0.42" />
        </g>

        {/* ── Fragment shards (tiny crystals scattered) ── */}
        {/* shard 1 - top left */}
        <g transform="translate(4,12) rotate(-20,3,6)">
          <polygon points="3,0 5,3 4,9 2,9 1,3" fill={color} opacity="0.65" />
          <polygon points="3,0 1,3 2,5 3,2" fill={lighten(color,0.3)} opacity="0.5" />
        </g>
        {/* shard 2 - far right */}
        <g transform="translate(56,16) rotate(15,3,5)">
          <polygon points="3,0 5,2 4,8 2,8 1,2" fill={color} opacity="0.6" />
          <polygon points="3,0 5,2 4,4 3,2" fill={lighten(color,0.25)} opacity="0.45" />
        </g>
        {/* shard 3 - bottom left */}
        <g transform="translate(7,36) rotate(10,2,4)">
          <polygon points="2,0 4,2 3,6 1,6 0,2" fill={color} opacity="0.5" />
        </g>
        {/* shard 4 - bottom right small */}
        <g transform="translate(52,38) rotate(-12,2,3)">
          <polygon points="2,0 3,2 2,5 1,5 0,2" fill={darken(color,0.05)} opacity="0.55" />
        </g>
        {/* micro chip 1 */}
        <polygon points="18,46 20,44 22,46 20,48" fill={color} opacity="0.6" />
        {/* micro chip 2 */}
        <polygon points="42,48 44,46 46,48 44,50" fill={color} opacity="0.5" />
        {/* micro chip 3 */}
        <polygon points="30,50 31,48 33,50 31,52" fill={lighten(color,0.15)} opacity="0.45" />

        {/* ── Sparkle dots ── */}
        <circle cx="3"  cy="5"  r="1"   fill="white" opacity="0.45" />
        <circle cx="61" cy="10" r="0.8" fill="white" opacity="0.4" />
        <circle cx="15" cy="2"  r="0.7" fill={lighten(color,0.4)} opacity="0.6" />
        <circle cx="50" cy="6"  r="0.9" fill={lighten(color,0.4)} opacity="0.55" />
        <circle cx="58" cy="30" r="0.7" fill="white" opacity="0.35" />
        <circle cx="6"  cy="42" r="0.6" fill={color} opacity="0.45" />

        {/* ── Ground shadow line ── */}
        <ellipse cx="32" cy="53" rx="18" ry="2.5" fill={darken(color, 0.3)} opacity="0.25" />
      </svg>
    </Wrapper>
  );
};

export default CrystalIcon;
