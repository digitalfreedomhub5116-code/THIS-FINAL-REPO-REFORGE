import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';

interface HexBadgeProps {
  /** 0 to 1 — how much of the badge is filled with stone texture */
  fillPercent: number;
  /** Badge tier index 0-3 */
  tierIndex: number;
  /** Whether this badge is fully unlocked (stones >= threshold) */
  isUnlocked: boolean;
  /** Accent color of the outfit */
  accentColor: string;
  /** Badge name e.g. "Awakened Core" */
  name: string;
  /** Size variant */
  size?: 'small' | 'large';
  /** Stones collected / Stones required text */
  progressText?: string;
}

// Generate irregular fill mask — creates a jagged "crystal building" pattern
function generateFillPath(fillPercent: number, seed: number): string {
  if (fillPercent <= 0) return '';
  if (fillPercent >= 1) return 'M0,0 L100,0 L100,100 L0,100 Z';
  
  // Fill from bottom up with jagged top edge
  const baseY = 100 - (fillPercent * 100);
  const points: string[] = [`M0,100`];
  
  // Left edge up
  points.push(`L0,${baseY + 5}`);
  
  // Jagged top edge — irregular crystal-like peaks
  const segments = 8;
  for (let i = 0; i <= segments; i++) {
    const x = (i / segments) * 100;
    // Use seed + index for deterministic but varied roughness
    const jag = Math.sin(seed * 3.7 + i * 2.1) * 8 + Math.cos(seed * 1.3 + i * 4.7) * 5;
    const y = baseY + jag;
    points.push(`L${x.toFixed(1)},${Math.max(0, Math.min(100, y)).toFixed(1)}`);
  }
  
  // Right edge down and close
  points.push(`L100,100`);
  points.push('Z');
  
  return points.join(' ');
}

const TIER_GLOW_INTENSITY = [0, 0.3, 0.5, 0.8];

const HexBadge: React.FC<HexBadgeProps> = ({
  fillPercent,
  tierIndex,
  isUnlocked,
  accentColor,
  name,
  size = 'large',
  progressText,
}) => {
  const dim = size === 'large' ? 120 : 48;
  const id = useMemo(() => `hex-${tierIndex}-${Math.random().toString(36).slice(2, 6)}`, [tierIndex]);
  
  // Hexagon points for SVG (pointy-top)
  const hexPoints = useMemo(() => {
    const cx = 60, cy = 60, r = 54;
    return Array.from({ length: 6 }, (_, i) => {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
    }).join(' ');
  }, []);

  const smallHexPoints = useMemo(() => {
    const cx = 24, cy = 24, r = 21;
    return Array.from({ length: 6 }, (_, i) => {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
    }).join(' ');
  }, []);

  const points = size === 'large' ? hexPoints : smallHexPoints;
  const viewBox = size === 'large' ? '0 0 120 120' : '0 0 48 48';
  const cx = size === 'large' ? 60 : 24;
  const cy = size === 'large' ? 60 : 24;
  const clipR = size === 'large' ? 54 : 21;

  const fillPath = useMemo(() => generateFillPath(fillPercent, tierIndex * 7 + 3), [fillPercent, tierIndex]);
  const glowIntensity = isUnlocked ? TIER_GLOW_INTENSITY[tierIndex] || 0 : 0;

  // Darken function
  const darken = (hex: string, pct: number) => {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, ((num >> 16) & 0xff) - Math.round(255 * pct));
    const g = Math.max(0, ((num >> 8) & 0xff) - Math.round(255 * pct));
    const b = Math.max(0, (num & 0xff) - Math.round(255 * pct));
    return `rgb(${r},${g},${b})`;
  };

  return (
    <div className="flex flex-col items-center gap-1.5" style={{ width: size === 'large' ? 140 : 56 }}>
      <motion.div
        style={{
          width: dim,
          height: dim,
          position: 'relative',
          filter: isUnlocked && glowIntensity > 0
            ? `drop-shadow(0 0 ${dim * 0.12 * glowIntensity}px ${accentColor})`
            : 'none',
        }}
        animate={isUnlocked && tierIndex === 3 ? {
          filter: [
            `drop-shadow(0 0 ${dim * 0.1}px ${accentColor})`,
            `drop-shadow(0 0 ${dim * 0.2}px ${accentColor})`,
            `drop-shadow(0 0 ${dim * 0.1}px ${accentColor})`,
          ]
        } : {}}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <svg viewBox={viewBox} width={dim} height={dim}>
          <defs>
            {/* Clip to hex shape */}
            <clipPath id={`${id}-clip`}>
              <polygon points={points} />
            </clipPath>

            {/* Filled gradient */}
            <linearGradient id={`${id}-fill`} x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" stopColor={darken(accentColor, 0.15)} />
              <stop offset="50%" stopColor={accentColor} />
              <stop offset="100%" stopColor={darken(accentColor, 0.05)} />
            </linearGradient>

            {/* Stone texture pattern */}
            <pattern id={`${id}-stone`} width="12" height="12" patternUnits="userSpaceOnUse">
              <rect width="12" height="12" fill={darken(accentColor, 0.1)} />
              <rect x="1" y="1" width="4" height="4" rx="1" fill={accentColor} opacity="0.6" />
              <rect x="7" y="6" width="3" height="3" rx="0.5" fill={accentColor} opacity="0.4" />
              <rect x="2" y="8" width="2" height="2" rx="0.5" fill={darken(accentColor, 0.2)} opacity="0.5" />
              <circle cx="9" cy="2" r="1.5" fill={accentColor} opacity="0.3" />
            </pattern>
          </defs>

          {/* Background — dark/dull when locked */}
          <polygon
            points={points}
            fill={fillPercent > 0 || isUnlocked ? 'rgba(15,15,25,0.95)' : 'rgba(10,10,18,0.98)'}
            stroke={isUnlocked ? accentColor : 'rgba(255,255,255,0.1)'}
            strokeWidth={size === 'large' ? 2 : 1}
            strokeDasharray={!isUnlocked && fillPercent === 0 ? (size === 'large' ? '6 4' : '3 2') : 'none'}
            opacity={isUnlocked ? 1 : 0.5}
          />

          {/* Fill layer — clipped to hex, masked by irregular path */}
          {fillPercent > 0 && (
            <g clipPath={`url(#${id}-clip)`}>
              {/* Scale the fill path to hex coordinate space */}
              <g transform={size === 'large'
                ? 'translate(6,6) scale(1.08,1.08)'
                : 'translate(3,3) scale(0.42,0.42)'
              }>
                <path
                  d={fillPath}
                  fill={`url(#${id}-stone)`}
                />
                {/* Color overlay on top of stone texture */}
                <path
                  d={fillPath}
                  fill={accentColor}
                  opacity={0.35}
                />
              </g>
            </g>
          )}

          {/* Inner circuit lines for tier 2+ */}
          {isUnlocked && tierIndex >= 2 && size === 'large' && (
            <g clipPath={`url(#${id}-clip)`} opacity={0.2}>
              <line x1="30" y1="30" x2="90" y2="90" stroke={accentColor} strokeWidth="0.5" />
              <line x1="60" y1="15" x2="60" y2="105" stroke={accentColor} strokeWidth="0.5" />
              <line x1="90" y1="30" x2="30" y2="90" stroke={accentColor} strokeWidth="0.5" />
              <circle cx={cx} cy={cy} r={clipR * 0.4} fill="none" stroke={accentColor} strokeWidth="0.5" />
            </g>
          )}

          {/* Border glow when unlocked */}
          {isUnlocked && (
            <polygon
              points={points}
              fill="none"
              stroke={accentColor}
              strokeWidth={size === 'large' ? 2.5 : 1.5}
              opacity={0.8}
            />
          )}
        </svg>

        {/* Lock icon when not started */}
        {!isUnlocked && fillPercent === 0 && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ opacity: 0.4 }}
          >
            <Lock size={size === 'large' ? 24 : 10} color="#6b7280" />
          </div>
        )}

        {/* Tier number on badge */}
        {size === 'large' && isUnlocked && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span
              className="font-black font-mono"
              style={{
                fontSize: 22,
                color: accentColor,
                textShadow: `0 0 12px ${accentColor}, 0 0 24px ${accentColor}50`,
                opacity: 0.9,
              }}
            >
              {['I', 'II', 'III', 'IV'][tierIndex]}
            </span>
          </div>
        )}

        {/* Floating particles for max tier */}
        {isUnlocked && tierIndex === 3 && size === 'large' && (
          <>
            {[0, 1, 2, 3].map(i => (
              <motion.div
                key={i}
                className="absolute rounded-full pointer-events-none"
                style={{
                  width: 3,
                  height: 3,
                  background: accentColor,
                  boxShadow: `0 0 6px ${accentColor}`,
                  left: `${20 + i * 20}%`,
                  top: `${30 + (i % 2) * 30}%`,
                }}
                animate={{
                  y: [-5, -18, -5],
                  opacity: [0.8, 0.2, 0.8],
                  x: [0, (i % 2 === 0 ? 4 : -4), 0],
                }}
                transition={{
                  duration: 2 + i * 0.4,
                  repeat: Infinity,
                  delay: i * 0.5,
                }}
              />
            ))}
          </>
        )}
      </motion.div>

      {/* Badge name */}
      {size === 'large' && (
        <div className="text-center">
          <div
            className="text-[9px] font-black font-mono uppercase tracking-widest"
            style={{ color: isUnlocked ? accentColor : '#4b5563' }}
          >
            {name}
          </div>
          {progressText && (
            <div
              className="text-[8px] font-mono mt-0.5"
              style={{ color: isUnlocked ? 'rgba(255,255,255,0.5)' : '#374151' }}
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
