import React from 'react';

// Shared styling helpers for the Guilds feature.
// Dark theme, neon cyan (#00d4ff), glass morphism, Solo Leveling aesthetic.

export const NEON = '#00d4ff';

export const glassPanel: React.CSSProperties = {
  background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(8,8,20,0.85) 100%)',
  backdropFilter: 'blur(20px) saturate(160%)',
  WebkitBackdropFilter: 'blur(20px) saturate(160%)',
  border: '1px solid rgba(0,212,255,0.12)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 24px rgba(0,0,0,0.45)',
};

export const neonGlow = (opacity = 0.5) => `0 0 14px rgba(0,212,255,${opacity})`;

// Banner gradient presets (referenced by banner key).
export const BANNER_GRADIENTS: Record<string, string> = {
  'gradient-cyan': 'linear-gradient(135deg, #00d4ff 0%, #6d28d9 100%)',
  'gradient-crimson': 'linear-gradient(135deg, #ef4444 0%, #7f1d1d 100%)',
  'gradient-emerald': 'linear-gradient(135deg, #10b981 0%, #064e3b 100%)',
  'gradient-gold': 'linear-gradient(135deg, #fbbf24 0%, #b45309 100%)',
  'gradient-violet': 'linear-gradient(135deg, #a855f7 0%, #4c1d95 100%)',
};

export function bannerStyle(banner?: string | null): React.CSSProperties {
  return { background: BANNER_GRADIENTS[banner || 'gradient-cyan'] || BANNER_GRADIENTS['gradient-cyan'] };
}

export const ROLE_LABEL: Record<string, string> = {
  master: 'Guild Master',
  vice: 'Vice Master',
  member: 'Member',
};

export const ROLE_COLOR: Record<string, string> = {
  master: '#fbbf24',
  vice: '#00d4ff',
  member: '#94a3b8',
};

export const GUILD_ICONS = ['🛡️', '⚔️', '🐺', '🔥', '⚡', '🗡️', '👑', '💀', '🐉', '🦅', '🌑', '❄️'];

export function initials(name?: string): string {
  if (!name) return 'H';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function timeAgo(iso?: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
