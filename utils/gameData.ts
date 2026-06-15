
import { TierLevel, TierConfig, Outfit, Shadow, CombatStats } from '../types';

// Set to true to restore avatar borders, profile banners, and shop deals in the app
export const BORDERS_ACTIVE = false;

export const TIERS: Record<TierLevel, TierConfig> = {
  E: { id: 'E', statCap: 70,   color: 'text-gray-400'   },
  D: { id: 'D', statCap: 150,  color: 'text-green-400'  },
  C: { id: 'C', statCap: 300,  color: 'text-blue-400'   },
  B: { id: 'B', statCap: 600,  color: 'text-purple-400' },
  A: { id: 'A', statCap: 1200, color: 'text-yellow-400' },
  S: { id: 'S', statCap: 5000, color: 'text-red-500'    },
};

export const OUTFITS: Outfit[] = [
  {
    id: 'outfit_starter',
    name: 'Venus',
    tier: 'E',
    description: 'Basic gear for the awakened. Offers minimal protection but unrestricted movement.',
    image: '/assets/outfits/venusimg.png',
    baseStats: { attack: 40, boost: 10, ultimate: 5, extraction: 0 },
    cost: 0,
    accentColor: '#9ca3af',
    buffs: [],
    isDefault: true,
  },
];

export const SHADOWS: Shadow[] = [
  {
    id: 'shadow_vanguard',
    name: 'Vanguard',
    rank: 'Elite',
    image: '',
    buffs: [{ stat: 'attack', value: 150 }, { stat: 'ultimate', value: 50 }],
  },
  {
    id: 'shadow_tank',
    name: 'Tank',
    rank: 'Minion',
    image: '',
    buffs: [{ stat: 'boost', value: 30 }],
  },
  {
    id: 'shadow_apex',
    name: 'Apex',
    rank: 'Monarch',
    image: '',
    buffs: [{ stat: 'attack', value: 500 }, { stat: 'extraction', value: 200 }],
  },
];

export const calculateStat = (
  baseValue: number,
  tier: TierLevel,
  equippedShadows: (Shadow | null)[],
  statKey: keyof CombatStats
): { total: number; isCapped: boolean; cap: number } => {
  const tierConfig = TIERS[tier];
  let total = baseValue;
  equippedShadows.forEach((shadow) => {
    if (shadow) {
      const buff = shadow.buffs.find((b) => b.stat === statKey);
      if (buff) total += buff.value;
    }
  });
  const isCapped  = total >= tierConfig.statCap;
  const finalValue = Math.min(total, tierConfig.statCap);
  return { total: finalValue, isCapped, cap: tierConfig.statCap };
};

// ═══════════════════════════════════════════════════════
//  BADGE STONE / CRYSTAL SYSTEM
// ═══════════════════════════════════════════════════════

export interface BadgeTier {
  index: number;       // 0-3
  name: string;
  stonesRequired: number;
  xpBoost: number;     // 0.00, 0.02, 0.05, 0.10
  label: string;       // "+2% XP"
}

export const BADGE_TIERS: BadgeTier[] = [
  { index: 0, name: 'Awakened Core',   stonesRequired: 0,   xpBoost: 0,    label: 'DEFAULT' },
  { index: 1, name: 'Resonance Shard', stonesRequired: 50,  xpBoost: 0.02, label: '+2% XP'  },
  { index: 2, name: 'Ascension Rune',  stonesRequired: 200, xpBoost: 0.05, label: '+5% XP'  },
  { index: 3, name: "Monarch's Seal",  stonesRequired: 500, xpBoost: 0.10, label: '+10% XP' },
];

export interface OutfitStoneConfig {
  outfitId: string;
  stoneName: string;
  stoneColor: string;     // hex color
  stoneGlow: string;      // glow hex
  stoneEmoji: string;     // fallback
}

export const OUTFIT_STONE_CONFIG: OutfitStoneConfig[] = [
  { outfitId: 'outfit_starter',  stoneName: 'Ash Crystal',      stoneColor: '#9ca3af', stoneGlow: 'rgba(156,163,175,0.5)', stoneEmoji: '🩶' },
];

/** Get stone config for an outfit, with fallback */
export function getStoneConfig(outfitId: string): OutfitStoneConfig {
  return OUTFIT_STONE_CONFIG.find(s => s.outfitId === outfitId) || OUTFIT_STONE_CONFIG[0];
}

/** Get total XP boost multiplier for an outfit given its stone count */
export function getOutfitXpBoost(stones: number): number {
  return 0;
}

/** Get number of unlocked badges for a stone count */
export function getUnlockedBadgeCount(stones: number): number {
  return 0;
}

/** Get fill progress for a specific badge tier */
export function getBadgeFillProgress(stones: number, badgeIndex: number): number {
  return 0;
}

// ═══════════════════════════════════════════════════════
//  ANIMATED PROFILE BORDERS
// ═══════════════════════════════════════════════════════

export type BorderAnimationType = 'none' | 'pulse' | 'flow' | 'lightning' | 'tendrils' | 'flame' | 'prismatic';

export interface ProfileBorder {
  id: string;
  name: string;
  tier: 'F' | 'E' | 'D' | 'C' | 'B' | 'A' | 'S';
  description: string;
  cost: number;
  levelRequired: number;
  accentColor: string;
  accentGlow: string;
  secondaryColor?: string;
  animationType: BorderAnimationType;
}

export const PROFILE_BORDERS: ProfileBorder[] = [
  {
    id: 'border_default',
    name: 'System Default',
    tier: 'F',
    description: 'Standard-issue frame. No frills, no glow.',
    cost: 0,
    levelRequired: 1,
    accentColor: '#3f3f46',
    accentGlow: 'rgba(63,63,70,0.3)',
    animationType: 'none',
  },
  {
    id: 'border_ember',
    name: 'Ember Frame',
    tier: 'E',
    description: 'A slow-breathing warm glow that radiates quiet determination.',
    cost: 500,
    levelRequired: 3,
    accentColor: '#f97316',
    accentGlow: 'rgba(249,115,22,0.5)',
    secondaryColor: '#dc2626',
    animationType: 'pulse',
  },
  {
    id: 'border_phantom',
    name: 'Phantom Edge',
    tier: 'D',
    description: 'Teal luminance sweeps the frame — a hunter stalking prey.',
    cost: 2000,
    levelRequired: 8,
    accentColor: '#4ade80',
    accentGlow: 'rgba(74,222,128,0.5)',
    secondaryColor: '#06b6d4',
    animationType: 'flow',
  },
  {
    id: 'border_storm',
    name: 'Storm Veil',
    tier: 'C',
    description: 'Electric arcs crackle around the border. The air itself trembles.',
    cost: 6000,
    levelRequired: 18,
    accentColor: '#3b82f6',
    accentGlow: 'rgba(59,130,246,0.5)',
    secondaryColor: '#60a5fa',
    animationType: 'lightning',
  },
  {
    id: 'border_void',
    name: 'Void Rift',
    tier: 'B',
    description: 'Dark energy tendrils crawl the edge — a rift between dimensions.',
    cost: 12000,
    levelRequired: 30,
    accentColor: '#7c3aed',
    accentGlow: 'rgba(124,58,237,0.5)',
    secondaryColor: '#581c87',
    animationType: 'tendrils',
  },
  {
    id: 'border_solar',
    name: 'Solar Corona',
    tier: 'A',
    description: 'Golden fire erupts from the border. The frame of a conqueror.',
    cost: 25000,
    levelRequired: 50,
    accentColor: '#fbbf24',
    accentGlow: 'rgba(251,191,36,0.6)',
    secondaryColor: '#f59e0b',
    animationType: 'flame',
  },
  {
    id: 'border_monarch',
    name: "Monarch's Aura",
    tier: 'S',
    description: 'The ultimate border. Prismatic light bends around the Sovereign.',
    cost: 50000,
    levelRequired: 75,
    accentColor: '#e879f9',
    accentGlow: 'rgba(232,121,249,0.6)',
    secondaryColor: '#06b6d4',
    animationType: 'prismatic',
  },
];

/** Get border config by ID, with fallback to default */
export function getBorderConfig(borderId: string | null): ProfileBorder {
  return PROFILE_BORDERS.find(b => b.id === borderId) || PROFILE_BORDERS[0];
}
