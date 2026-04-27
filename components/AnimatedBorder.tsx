import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { getBorderConfig, BorderAnimationType } from '../utils/gameData';

interface AnimatedBorderProps {
  borderId: string | null;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  /** Compact mode for small avatars (leaderboard, top bar) */
  compact?: boolean;
}

// ─── Individual animation layers ─────────────────────────────────────

/** F-tier — No animation, just a faint border */
const BorderNone: React.FC<{ color: string }> = ({ color }) => (
  <div
    className="absolute inset-0 pointer-events-none z-20 rounded-[inherit]"
    style={{ border: `1px solid ${color}30` }}
  />
);

/** E-tier — Slow breathing pulse glow */
const BorderPulse: React.FC<{ color: string; glow: string; secondary?: string }> = ({ color, glow }) => (
  <>
    <motion.div
      className="absolute inset-0 pointer-events-none z-20 rounded-[inherit]"
      animate={{
        boxShadow: [
          `inset 0 0 15px ${glow}20, 0 0 8px ${glow}15`,
          `inset 0 0 30px ${glow}40, 0 0 20px ${glow}30`,
          `inset 0 0 15px ${glow}20, 0 0 8px ${glow}15`,
        ],
      }}
      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      style={{ border: `1.5px solid ${color}50` }}
    />
    {/* Top edge shine */}
    <div
      className="absolute top-0 left-[15%] right-[15%] h-[1px] z-20 pointer-events-none"
      style={{ background: `linear-gradient(90deg, transparent, ${color}60, transparent)` }}
    />
  </>
);

/** D-tier — Flowing sweep animation (conic gradient rotation) */
const BorderFlow: React.FC<{ color: string; glow: string; secondary?: string }> = ({ color, glow, secondary }) => {
  const id = useMemo(() => `flow-${Math.random().toString(36).slice(2, 6)}`, []);
  // SVG attributes don't support CSS calc(), so use percentage-based sizing
  const inset = 0.5; // % inset from each edge
  return (
    <>
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-20" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id={`${id}-g`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.7" />
            <stop offset="50%" stopColor={secondary || color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.7" />
          </linearGradient>
        </defs>
        <rect
          x={inset} y={inset}
          width={100 - inset * 2} height={100 - inset * 2}
          rx="0" ry="0"
          fill="none"
          stroke={`url(#${id}-g)`}
          strokeWidth="1.2"
          strokeDasharray="25 60"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        >
          <animate
            attributeName="stroke-dashoffset"
            from="0" to="-170"
            dur="4s"
            repeatCount="indefinite"
          />
        </rect>
      </svg>
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none z-19 rounded-[inherit]"
        style={{ boxShadow: `inset 0 0 20px ${glow}15, 0 0 12px ${glow}10` }}
      />
    </>
  );
};

/** C-tier — Lightning arcs along borders */
const BorderLightning: React.FC<{ color: string; glow: string }> = ({ color, glow }) => {
  const paths = useMemo(() => {
    const generateArc = () => {
      const points: string[] = [];
      const segments = 8 + Math.floor(Math.random() * 6);
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const x = t * 100;
        const y = (Math.random() - 0.5) * 6;
        points.push(`${x},${50 + y}`);
      }
      return `M${points.join(' L')}`;
    };
    return [generateArc(), generateArc(), generateArc()];
  }, []);

  return (
    <>
      {/* Top edge lightning */}
      <svg className="absolute top-0 left-0 right-0 h-3 pointer-events-none z-20" viewBox="0 0 100 100" preserveAspectRatio="none">
        {paths.map((d, i) => (
          <motion.path
            key={i}
            d={d}
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            initial={{ opacity: 0, pathLength: 0 }}
            animate={{ opacity: [0, 0.9, 0], pathLength: [0, 1, 1] }}
            transition={{ duration: 0.8, delay: i * 1.2, repeat: Infinity, repeatDelay: 2 + Math.random() * 2 }}
            style={{ filter: `drop-shadow(0 0 4px ${glow})` }}
          />
        ))}
      </svg>
      {/* Bottom edge lightning */}
      <svg className="absolute bottom-0 left-0 right-0 h-3 pointer-events-none z-20" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ transform: 'scaleY(-1)' }}>
        {paths.map((d, i) => (
          <motion.path
            key={i}
            d={d}
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.7, 0] }}
            transition={{ duration: 0.6, delay: i * 1.5 + 0.5, repeat: Infinity, repeatDelay: 3 }}
            style={{ filter: `drop-shadow(0 0 4px ${glow})` }}
          />
        ))}
      </svg>
      {/* Side glow bars */}
      <motion.div
        className="absolute top-0 left-0 w-[2px] h-full pointer-events-none z-20"
        animate={{ opacity: [0.2, 0.6, 0.2] }}
        transition={{ duration: 1.8, repeat: Infinity }}
        style={{ background: `linear-gradient(180deg, transparent, ${color}60, ${color}, ${color}60, transparent)` }}
      />
      <motion.div
        className="absolute top-0 right-0 w-[2px] h-full pointer-events-none z-20"
        animate={{ opacity: [0.2, 0.6, 0.2] }}
        transition={{ duration: 1.8, repeat: Infinity, delay: 0.9 }}
        style={{ background: `linear-gradient(180deg, transparent, ${color}60, ${color}, ${color}60, transparent)` }}
      />
      {/* Flash burst */}
      <motion.div
        className="absolute inset-0 pointer-events-none z-19 rounded-[inherit]"
        animate={{ opacity: [0, 0.15, 0] }}
        transition={{ duration: 0.3, repeat: Infinity, repeatDelay: 3 }}
        style={{ background: `radial-gradient(ellipse at 50% 0%, ${glow}40, transparent 60%)` }}
      />
    </>
  );
};

/** B-tier — Dark energy tendrils crawling edges */
const BorderTendrils: React.FC<{ color: string; glow: string; secondary?: string }> = ({ color, glow, secondary }) => (
  <>
    {/* Rotating conic border */}
    <motion.div
      className="absolute -inset-[2px] pointer-events-none z-20 rounded-[inherit]"
      animate={{ rotate: 360 }}
      transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
      style={{
        background: `conic-gradient(from 0deg, transparent 0%, ${color}60 10%, transparent 20%, ${secondary || color}40 35%, transparent 45%, ${color}50 60%, transparent 70%, ${secondary || color}30 85%, transparent 95%)`,
        mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        maskComposite: 'exclude',
        WebkitMaskComposite: 'xor',
        padding: '2px',
      }}
    />
    {/* Dark vignette intensifier */}
    <div
      className="absolute inset-0 pointer-events-none z-19 rounded-[inherit]"
      style={{
        boxShadow: `inset 0 0 40px rgba(0,0,0,0.5), 0 0 15px ${glow}20`,
        border: `1px solid ${color}25`,
      }}
    />
    {/* Corner flares */}
    {[
      { top: 0, left: 0 }, { top: 0, right: 0 },
      { bottom: 0, left: 0 }, { bottom: 0, right: 0 },
    ].map((pos, i) => (
      <motion.div
        key={i}
        className="absolute w-4 h-4 pointer-events-none z-20"
        style={{ ...pos, background: `radial-gradient(circle, ${glow}40, transparent 70%)` } as React.CSSProperties}
        animate={{ opacity: [0.3, 0.8, 0.3], scale: [1, 1.3, 1] }}
        transition={{ duration: 2.5, delay: i * 0.6, repeat: Infinity }}
      />
    ))}
  </>
);

/** A-tier — Golden fire ring with particles */
const BorderFlame: React.FC<{ color: string; glow: string; secondary?: string }> = ({ color, glow, secondary }) => (
  <>
    {/* Intense glow border */}
    <motion.div
      className="absolute inset-0 pointer-events-none z-20 rounded-[inherit]"
      animate={{
        boxShadow: [
          `inset 0 0 20px ${glow}30, 0 0 15px ${glow}25, 0 0 40px ${glow}10`,
          `inset 0 0 35px ${glow}50, 0 0 25px ${glow}40, 0 0 60px ${glow}20`,
          `inset 0 0 20px ${glow}30, 0 0 15px ${glow}25, 0 0 40px ${glow}10`,
        ],
      }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      style={{ border: `2px solid ${color}70` }}
    />
    {/* Bottom flame particles */}
    <div className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none z-21 overflow-visible">
      {Array.from({ length: 12 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: 3 + Math.random() * 4,
            height: 3 + Math.random() * 4,
            left: `${8 + (i / 12) * 84}%`,
            bottom: 0,
            background: Math.random() > 0.5 ? color : (secondary || color),
          }}
          animate={{
            y: [0, -20 - Math.random() * 30],
            opacity: [0.8, 0],
            scale: [1, 0.3],
          }}
          transition={{
            duration: 1 + Math.random() * 1.2,
            delay: Math.random() * 2,
            repeat: Infinity,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
    {/* Top shimmer bar */}
    <motion.div
      className="absolute top-0 left-0 right-0 h-[2px] pointer-events-none z-20"
      animate={{ opacity: [0.4, 0.9, 0.4] }}
      transition={{ duration: 1.5, repeat: Infinity }}
      style={{ background: `linear-gradient(90deg, transparent, ${color}, ${secondary || color}, ${color}, transparent)` }}
    />
  </>
);

/** S-tier — Prismatic shifting border with orbiting elements */
const BorderPrismatic: React.FC<{ color: string; glow: string }> = ({ glow }) => (
  <>
    {/* Hue-rotating border */}
    <motion.div
      className="absolute -inset-[2px] pointer-events-none z-20 rounded-[inherit]"
      animate={{ rotate: 360 }}
      transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
      style={{
        background: 'conic-gradient(from 0deg, #f87171, #fbbf24, #4ade80, #7EB8D4, #7EB8D4, #ec4899, #f87171)',
        mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        maskComposite: 'exclude',
        WebkitMaskComposite: 'xor',
        padding: '2.5px',
      }}
    />
    {/* Animated glow that shifts hue */}
    <motion.div
      className="absolute inset-0 pointer-events-none z-19 rounded-[inherit]"
      animate={{
        boxShadow: [
          `inset 0 0 25px rgba(248,113,113,0.2), 0 0 20px rgba(248,113,113,0.15)`,
          `inset 0 0 25px rgba(74,222,128,0.2), 0 0 20px rgba(74,222,128,0.15)`,
          `inset 0 0 25px rgba(126,184,212,0.2), 0 0 20px rgba(126,184,212,0.15)`,
          `inset 0 0 25px rgba(248,113,113,0.2), 0 0 20px rgba(248,113,113,0.15)`,
        ],
      }}
      transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
    />
    {/* Orbiting dots */}
    <motion.div
      className="absolute inset-0 pointer-events-none z-21"
      animate={{ rotate: 360 }}
      transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
    >
      {[0, 90, 180, 270].map((deg) => (
        <div
          key={deg}
          className="absolute w-2 h-2 rounded-full"
          style={{
            top: '50%', left: '50%',
            transform: `rotate(${deg}deg) translateY(-50%) translateX(${deg % 180 === 0 ? '48%' : '0'})`,
            transformOrigin: '0 0',
            background: ['#f87171', '#fbbf24', '#4ade80', '#7EB8D4'][deg / 90],
            boxShadow: `0 0 8px ${['#f87171', '#fbbf24', '#4ade80', '#7EB8D4'][deg / 90]}`,
            filter: `blur(0.5px)`,
          }}
        />
      ))}
    </motion.div>
    {/* Corner sparkle bursts */}
    {[
      { top: -2, left: -2 }, { top: -2, right: -2 },
      { bottom: -2, left: -2 }, { bottom: -2, right: -2 },
    ].map((pos, i) => (
      <motion.div
        key={i}
        className="absolute w-3 h-3 pointer-events-none z-22"
        style={pos as React.CSSProperties}
        animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
        transition={{ duration: 1.5, delay: i * 0.4, repeat: Infinity }}
      >
        <div className="w-full h-full rounded-full" style={{
          background: `radial-gradient(circle, ${glow}, transparent 70%)`,
        }} />
      </motion.div>
    ))}
  </>
);

// ─── Render map ──────────────────────────────────────────────────────
const ANIMATION_RENDERERS: Record<BorderAnimationType, React.FC<{ color: string; glow: string; secondary?: string }>> = {
  none: BorderNone,
  pulse: BorderPulse,
  flow: BorderFlow,
  lightning: BorderLightning,
  tendrils: BorderTendrils,
  flame: BorderFlame,
  prismatic: BorderPrismatic,
};

// ─── Main Component ──────────────────────────────────────────────────
const AnimatedBorder: React.FC<AnimatedBorderProps> = ({
  borderId,
  children,
  className = '',
  style,
  compact = false,
}) => {
  const border = getBorderConfig(borderId);
  const Renderer = ANIMATION_RENDERERS[border.animationType];

  if (compact) {
    // Compact mode — clean glowing ring for small avatars (leaderboard, etc.)
    const isDefault = border.animationType === 'none';
    const isPrismatic = border.animationType === 'prismatic';
    return (
      <div className={`relative ${className}`} style={style}>
        {!isDefault && (
          <motion.div
            className="absolute -inset-[2px] rounded-full z-0"
            animate={
              isPrismatic
                ? { rotate: 360 }
                : { opacity: [0.6, 1, 0.6] }
            }
            transition={
              isPrismatic
                ? { duration: 4, repeat: Infinity, ease: 'linear' }
                : { duration: 2.5, repeat: Infinity, ease: 'easeInOut' }
            }
            style={{
              borderRadius: 'inherit',
              border: isPrismatic
                ? 'none'
                : `2px solid ${border.accentColor}`,
              background: isPrismatic
                ? 'conic-gradient(from 0deg, #f87171, #fbbf24, #4ade80, #7EB8D4, #7EB8D4, #ec4899, #f87171)'
                : 'transparent',
              boxShadow: `0 0 4px ${border.accentGlow}`,
              ...(isPrismatic ? {
                mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                maskComposite: 'exclude',
                WebkitMaskComposite: 'xor',
                padding: '2px',
              } as React.CSSProperties : {}),
            }}
          />
        )}
        {/* Thin default ring for non-animated borders */}
        {isDefault && (
          <div
            className="absolute -inset-[1px] rounded-full z-0"
            style={{ border: `1px solid rgba(255,255,255,0.12)` }}
          />
        )}
        <div className="relative z-10">{children}</div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`} style={style}>
      {children}
      <Renderer
        color={border.accentColor}
        glow={border.accentGlow}
        secondary={border.secondaryColor}
      />
    </div>
  );
};

export default AnimatedBorder;
