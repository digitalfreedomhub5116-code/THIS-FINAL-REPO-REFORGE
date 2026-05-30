/**
 * HudButton.tsx
 *
 * Cyan HUD-style button matching the uploaded "ENTER DUNGEON" reference:
 *   - Chamfered/notched outline drawn in inline SVG (crisp at any width).
 *   - Twin-line bevel for the polished glass-plate look.
 *   - Corner alignment brackets (top-left + bottom-right) like the reference.
 *   - Cyan stroke + soft cyan drop-shadow glow.
 *   - Bold cyan glowing label, optional left-side icon slot.
 *
 * Self-contained, no new dependencies. lucide-react and framer-motion are
 * already in the repo.
 */
import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const CYAN = '#00d4ff';
const CYAN_DIM = 'rgba(0, 212, 255, 0.55)';
const CYAN_FAINT = 'rgba(0, 212, 255, 0.18)';

interface HudButtonProps {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  /** Override inner aspect ratio (default 4 : 1, same as the reference). */
  ratio?: number;
  ariaLabel?: string;
}

const HudButton: React.FC<HudButtonProps> = ({
  label,
  icon,
  onClick,
  ratio = 4,
  ariaLabel,
}) => {
  const reduceMotion = useReducedMotion();

  // Breathing glow keyframes — disabled when prefers-reduced-motion is on.
  const animate = reduceMotion
    ? undefined
    : {
        filter: [
          `drop-shadow(0 0 8px ${CYAN_FAINT})`,
          `drop-shadow(0 0 14px ${CYAN_DIM})`,
          `drop-shadow(0 0 8px ${CYAN_FAINT})`,
        ],
      };

  const transition = reduceMotion
    ? undefined
    : { duration: 4.5, repeat: Infinity, ease: 'easeInOut' as const };

  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel || label}
      whileTap={{ scale: 0.97 }}
      animate={animate}
      transition={transition}
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: `${ratio} / 1`,
        background: 'transparent',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        userSelect: 'none',
        // Tap highlight only — main glow is on the SVG via filter
        outline: 'none',
      }}
    >
      {/* SVG frame — drawn at viewBox 200×50, scales with the wrapper. */}
      <svg
        viewBox="0 0 200 50"
        preserveAspectRatio="none"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
        aria-hidden="true"
      >
        <defs>
          <filter id="hud-glow" x="-20%" y="-50%" width="140%" height="200%">
            <feGaussianBlur stdDeviation="1.2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="hud-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgba(0, 212, 255, 0.10)" />
            <stop offset="1" stopColor="rgba(0, 212, 255, 0.03)" />
          </linearGradient>
        </defs>

        {/* Outer chamfered plate — single closed path with notched corners */}
        {(() => {
          const W = 200;
          const H = 50;
          const c = 6; // chamfer size
          const path = [
            `M ${c},0`,
            `L ${W - c},0`,
            `L ${W},${c}`,
            `L ${W},${H - c}`,
            `L ${W - c},${H}`,
            `L ${c},${H}`,
            `L 0,${H - c}`,
            `L 0,${c}`,
            'Z',
          ].join(' ');
          // Inner double-line bevel (offset inwards)
          const ic = c - 2; // tighter chamfer for the inner stroke
          const inset = 3;
          const innerPath = [
            `M ${ic + inset},${inset}`,
            `L ${W - ic - inset},${inset}`,
            `L ${W - inset},${ic + inset}`,
            `L ${W - inset},${H - ic - inset}`,
            `L ${W - ic - inset},${H - inset}`,
            `L ${ic + inset},${H - inset}`,
            `L ${inset},${H - ic - inset}`,
            `L ${inset},${ic + inset}`,
            'Z',
          ].join(' ');
          return (
            <>
              {/* fill */}
              <path d={path} fill="url(#hud-fill)" />
              {/* outer glowing stroke */}
              <path
                d={path}
                fill="none"
                stroke={CYAN}
                strokeWidth="1.6"
                strokeOpacity="0.95"
                vectorEffect="non-scaling-stroke"
                filter="url(#hud-glow)"
              />
              {/* outer halo */}
              <path
                d={path}
                fill="none"
                stroke={CYAN}
                strokeWidth="0.8"
                strokeOpacity="0.45"
                vectorEffect="non-scaling-stroke"
              />
              {/* inner thin bevel */}
              <path
                d={innerPath}
                fill="none"
                stroke={CYAN}
                strokeWidth="0.7"
                strokeOpacity="0.7"
                vectorEffect="non-scaling-stroke"
              />
            </>
          );
        })()}

        {/* Corner alignment brackets (top-left + bottom-right) */}
        {(() => {
          const arm = 10;
          const off = 1.5;
          const brkStyle = {
            stroke: CYAN,
            strokeWidth: 1.4,
            strokeOpacity: 0.85,
            fill: 'none',
            vectorEffect: 'non-scaling-stroke' as const,
          };
          return (
            <g>
              {/* top-left */}
              <path d={`M ${off + arm} ${off} L ${off} ${off} L ${off} ${off + arm}`} {...brkStyle} />
              {/* bottom-right */}
              <path
                d={`M ${200 - off - arm} ${50 - off} L ${200 - off} ${50 - off} L ${200 - off} ${50 - off - arm}`}
                {...brkStyle}
              />
            </g>
          );
        })()}
      </svg>

      {/* Foreground content (icon + label) */}
      <span
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          padding: '0 14px',
          pointerEvents: 'none',
        }}
      >
        {icon && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: CYAN,
              filter: `drop-shadow(0 0 4px ${CYAN_DIM})`,
            }}
          >
            {icon}
          </span>
        )}
        <span
          style={{
            fontFamily: 'Rajdhani, "Bai Jamjuree", "Inter", sans-serif',
            fontWeight: 800,
            fontSize: 'clamp(12px, 3.4vw, 16px)',
            letterSpacing: '0.18em',
            color: '#ffffff',
            textShadow: `0 0 8px ${CYAN}, 0 0 14px ${CYAN_DIM}`,
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </span>
      </span>
    </motion.button>
  );
};

export default HudButton;
