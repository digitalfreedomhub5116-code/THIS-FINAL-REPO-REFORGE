import React from 'react';
import { motion } from 'framer-motion';

interface CrystalIconProps {
  color: string;
  glow: string;
  size?: number;
  animate?: boolean;
  className?: string;
}

/**
 * Faceted crystal/gem SVG component matching the reference art style.
 * Multi-faceted gem with inner reflections, gradients, and optional shimmer.
 */
const CrystalIcon: React.FC<CrystalIconProps> = ({
  color,
  glow,
  size = 28,
  animate = false,
  className = '',
}) => {
  // Generate lighter/darker variants
  const lighten = (hex: string, pct: number) => {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, ((num >> 16) & 0xff) + Math.round(255 * pct));
    const g = Math.min(255, ((num >> 8) & 0xff) + Math.round(255 * pct));
    const b = Math.min(255, (num & 0xff) + Math.round(255 * pct));
    return `rgb(${r},${g},${b})`;
  };
  const darken = (hex: string, pct: number) => {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, ((num >> 16) & 0xff) - Math.round(255 * pct));
    const g = Math.max(0, ((num >> 8) & 0xff) - Math.round(255 * pct));
    const b = Math.max(0, (num & 0xff) - Math.round(255 * pct));
    return `rgb(${r},${g},${b})`;
  };

  const id = `crystal-${color.replace('#', '')}-${Math.random().toString(36).slice(2, 6)}`;

  const Wrapper = animate ? motion.div : 'div' as any;
  const wrapperProps = animate
    ? {
        animate: { scale: [1, 1.08, 1], rotate: [0, 2, -2, 0] },
        transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
      }
    : {};

  return (
    <Wrapper
      className={className}
      style={{ width: size, height: size, display: 'inline-flex', position: 'relative' as const }}
      {...wrapperProps}
    >
      {/* Outer glow */}
      <div
        style={{
          position: 'absolute',
          inset: -4,
          borderRadius: '50%',
          background: glow,
          filter: `blur(${size * 0.3}px)`,
          opacity: 0.6,
        }}
      />
      <svg
        viewBox="0 0 40 48"
        width={size}
        height={size}
        style={{ position: 'relative', zIndex: 1, filter: `drop-shadow(0 0 ${size * 0.15}px ${glow})` }}
      >
        <defs>
          {/* Main body gradient */}
          <linearGradient id={`${id}-main`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={lighten(color, 0.25)} />
            <stop offset="40%" stopColor={color} />
            <stop offset="100%" stopColor={darken(color, 0.3)} />
          </linearGradient>
          {/* Highlight */}
          <linearGradient id={`${id}-hi`} x1="0.2" y1="0" x2="0.8" y2="0.6">
            <stop offset="0%" stopColor="white" stopOpacity="0.6" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Main crystal body — irregular pentagon shape */}
        <polygon
          points="20,2 35,14 32,40 8,40 5,14"
          fill={`url(#${id}-main)`}
          stroke={lighten(color, 0.15)}
          strokeWidth="0.8"
        />

        {/* Left facet */}
        <polygon
          points="20,2 5,14 12,22 20,12"
          fill={lighten(color, 0.2)}
          opacity="0.5"
        />

        {/* Right facet */}
        <polygon
          points="20,2 35,14 28,22 20,12"
          fill={darken(color, 0.1)}
          opacity="0.6"
        />

        {/* Center highlight facet */}
        <polygon
          points="20,12 12,22 20,36 28,22"
          fill={`url(#${id}-hi)`}
          opacity="0.4"
        />

        {/* Bottom left facet */}
        <polygon
          points="5,14 8,40 20,36 12,22"
          fill={darken(color, 0.2)}
          opacity="0.7"
        />

        {/* Bottom right facet */}
        <polygon
          points="35,14 32,40 20,36 28,22"
          fill={darken(color, 0.25)}
          opacity="0.8"
        />

        {/* Top specular highlight */}
        <polygon
          points="16,5 20,3 24,5 22,10 18,10"
          fill="white"
          opacity="0.4"
        />

        {/* Small reflection dot */}
        <ellipse cx="14" cy="16" rx="2" ry="1.5" fill="white" opacity="0.3" />
      </svg>
    </Wrapper>
  );
};

export default CrystalIcon;
