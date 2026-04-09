import React from 'react';
import { motion } from 'framer-motion';

export const OUTFIT_BADGE_CONFIG: Record<string, {
  name: string;
  accent: string;
  eyeColor: string;
  hoodColor: string;
  armorColor: string;
  tier: string;
}> = {
  outfit_starter: { name: 'Venus',   accent: '#9ca3af', eyeColor: '#60a5fa', hoodColor: '#374151', armorColor: '#1f2937', tier: 'E' },
  outfit_ghost:   { name: 'Ghost',   accent: '#4ade80', eyeColor: '#4ade80', hoodColor: '#14532d', armorColor: '#166534', tier: 'D' },
  outfit_knight:  { name: 'Ninja',   accent: '#60a5fa', eyeColor: '#f87171', hoodColor: '#1e293b', armorColor: '#334155', tier: 'C' },
  outfit_assassin:{ name: 'Mars',    accent: '#c084fc', eyeColor: '#00d2ff', hoodColor: '#581c87', armorColor: '#7e22ce', tier: 'B' },
  outfit_vanguard:{ name: 'Jupiter', accent: '#facc15', eyeColor: '#60a5fa', hoodColor: '#713f12', armorColor: '#92400e', tier: 'A' },
  outfit_monarch: { name: 'Monarch', accent: '#f87171', eyeColor: '#60a5fa', hoodColor: '#450a0a', armorColor: '#991b1b', tier: 'S' },
};

const DEFAULT_CFG = OUTFIT_BADGE_CONFIG.outfit_starter;

interface OutfitHunterBadgeProps {
  outfitId: string;
  size?: number;
  animate?: boolean;
}

const OutfitHunterBadge: React.FC<OutfitHunterBadgeProps> = ({ outfitId, size = 36, animate = true }) => {
  const cfg = OUTFIT_BADGE_CONFIG[outfitId] || DEFAULT_CFG;

  const inner = (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Glow ring */}
      <circle cx="18" cy="18" r="17" fill="none" stroke={cfg.accent} strokeWidth="1.5" opacity="0.4">
        <animate attributeName="opacity" values="0.2;0.6;0.2" dur="2.5s" repeatCount="indefinite" />
      </circle>
      {/* Inner bg */}
      <circle cx="18" cy="18" r="15" fill={cfg.hoodColor} />
      {/* Hood */}
      <path d="M7 16C7 11 11.5 6 18 6C24.5 6 29 11 29 16V24C29 25 28 26 27 26H9C8 26 7 25 7 24V16Z" fill={cfg.hoodColor} />
      {/* Face shadow */}
      <path d="M10 16C10 13 13 10 18 10C23 10 26 13 26 16V21C26 21 23 22 18 22C13 22 10 21 10 21V16Z" fill="#08081a" />
      {/* Armor */}
      <path d="M9 23L13 21H23L27 23V26H9V23Z" fill={cfg.armorColor} />
      <path d="M15 21L18 24L21 21" fill="none" stroke={cfg.accent} strokeWidth="0.7" opacity="0.5" />
      {/* Eyes */}
      <ellipse cx="14.5" cy="16.5" rx="2" ry="1.2" fill={cfg.eyeColor}>
        <animate attributeName="opacity" values="1;0.5;1" dur="2.5s" repeatCount="indefinite" />
      </ellipse>
      <ellipse cx="21.5" cy="16.5" rx="2" ry="1.2" fill={cfg.eyeColor}>
        <animate attributeName="opacity" values="1;0.5;1" dur="2.5s" repeatCount="indefinite" begin="0.15s" />
      </ellipse>
      {/* Eye glow */}
      <ellipse cx="14.5" cy="16.5" rx="3" ry="2" fill={cfg.eyeColor} opacity="0.12" />
      <ellipse cx="21.5" cy="16.5" rx="3" ry="2" fill={cfg.eyeColor} opacity="0.12" />
      {/* Tier badge */}
      <circle cx="30" cy="6" r="5.5" fill="#0a0a1a" stroke={cfg.accent} strokeWidth="1" />
      <text x="30" y="8.5" textAnchor="middle" fontSize="6" fontWeight="900" fill={cfg.accent} fontFamily="monospace">{cfg.tier}</text>
    </svg>
  );

  if (!animate) {
    return <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{inner}</div>;
  }

  return (
    <motion.div
      animate={{ scale: [1, 1.05, 1] }}
      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      style={{ width: size, height: size, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      {inner}
    </motion.div>
  );
};

export default OutfitHunterBadge;
