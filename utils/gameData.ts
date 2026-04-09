
import { TierLevel, TierConfig, Outfit, Shadow, CombatStats } from '../types';

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
    keyCost: 0,
    accentColor: '#9ca3af',
    introVideoUrl: '/assets/outfits/venusintro.mp4',
    loopVideoUrl: '/assets/outfits/venusloop.mp4',
    buffs: [],
    isDefault: true,
  },
  {
    id: 'outfit_ghost',
    name: 'Ghost',
    tier: 'D',
    description: 'Lightweight recon suit. Early hunters swear by its stealth properties.',
    image: '/assets/outfits/greenheroimg.png',
    baseStats: { attack: 90, boost: 60, ultimate: 45, extraction: 30 },
    cost: 800,
    keyCost: 15,
    accentColor: '#4ade80',
    introVideoUrl: '/assets/outfits/greenherointro.mp4',
    loopVideoUrl: '/assets/outfits/greenheroloop.mp4',
    buffs: [{ label: 'XP Boost', color: '#4ade80' }],
  },
  {
    id: 'outfit_knight',
    name: 'Ninja',
    tier: 'C',
    description: 'Standard-issue tank armor. High durability, steady output.',
    image: '/assets/outfits/ninjaimg.png',
    baseStats: { attack: 150, boost: 50, ultimate: 100, extraction: 20 },
    cost: 1500,
    keyCost: 25,
    accentColor: '#60a5fa',
    introVideoUrl: '/assets/outfits/ninjaintro.mp4',
    loopVideoUrl: '/assets/outfits/ninjaloop.mp4',
    buffs: [{ label: 'Nutrition Boost', color: '#60a5fa' }],
  },
  {
    id: 'outfit_assassin',
    name: 'Mars',
    tier: 'B',
    description: 'War-forged battle armor emanating the wrath of the god of war. Dominate every battlefield.',
    image: '/assets/outfits/marsimg.jpeg',
    baseStats: { attack: 450, boost: 200, ultimate: 300, extraction: 550 },
    cost: 5000,
    keyCost: 50,
    accentColor: '#c084fc',
    introVideoUrl: '/assets/outfits/marsintro.mp4',
    loopVideoUrl: '/assets/outfits/marsloop.mp4',
    buffs: [
      { label: 'XP Boost',          color: '#4ade80' },
    ],
  },
  {
    id: 'outfit_vanguard',
    name: 'Jupiter',
    tier: 'A',
    description: 'Celestial armor channeling the storm king\'s fury. Unmatched offensive power.',
    image: '/assets/outfits/jupiterimg.jpeg',
    baseStats: { attack: 900, boost: 700, ultimate: 800, extraction: 600 },
    cost: 15000,
    keyCost: 65,
    accentColor: '#facc15',
    introVideoUrl: '/assets/outfits/jupiterintro.mp4',
    loopVideoUrl: '/assets/outfits/jupiterloop.mp4',
    buffs: [
      { label: 'Coin Frenzy',        color: '#facc15' },
      { label: 'XP Boost',           color: '#4ade80' },
    ],
  },
  {
    id: 'outfit_monarch',
    name: 'Monarch',
    tier: 'S',
    description: 'The ultimate armor of the Overlord. All limits transcended.',
    image: '/assets/outfits/redprinceimg.png',
    baseStats: { attack: 2500, boost: 1500, ultimate: 4000, extraction: 5000 },
    cost: 50000,
    keyCost: 80,
    accentColor: '#f87171',
    introVideoUrl: '/assets/outfits/redprinceintro.mp4',
    loopVideoUrl: '/assets/outfits/redprinceloop.mp4',
    buffs: [
      { label: 'Coin Frenzy',        color: '#facc15' },
      { label: 'XP Boost',           color: '#4ade80' },
      { label: 'Nutrition Boost',    color: '#60a5fa' },
    ],
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
  { outfitId: 'outfit_ghost',    stoneName: 'Pluton Crystal',   stoneColor: '#4ade80', stoneGlow: 'rgba(74,222,128,0.5)',  stoneEmoji: '💚' },
  { outfitId: 'outfit_knight',   stoneName: 'Saturn Crystal',   stoneColor: '#60a5fa', stoneGlow: 'rgba(96,165,250,0.5)',  stoneEmoji: '💙' },
  { outfitId: 'outfit_assassin', stoneName: 'Mars Crystal',     stoneColor: '#c084fc', stoneGlow: 'rgba(192,132,252,0.5)', stoneEmoji: '💜' },
  { outfitId: 'outfit_vanguard', stoneName: 'Jupiter Crystal',  stoneColor: '#facc15', stoneGlow: 'rgba(250,204,21,0.5)',  stoneEmoji: '💛' },
  { outfitId: 'outfit_monarch',  stoneName: 'Overlord Crystal', stoneColor: '#f87171', stoneGlow: 'rgba(248,113,113,0.5)', stoneEmoji: '❤️' },
];

/** Get stone config for an outfit, with fallback */
export function getStoneConfig(outfitId: string): OutfitStoneConfig {
  return OUTFIT_STONE_CONFIG.find(s => s.outfitId === outfitId) || OUTFIT_STONE_CONFIG[0];
}

/** Get total XP boost multiplier for an outfit given its stone count */
export function getOutfitXpBoost(stones: number): number {
  let boost = 0;
  for (const tier of BADGE_TIERS) {
    if (stones >= tier.stonesRequired) boost += tier.xpBoost;
  }
  return boost; // e.g. 0.17 for all badges
}

/** Get number of unlocked badges for a stone count */
export function getUnlockedBadgeCount(stones: number): number {
  let count = 0;
  for (const tier of BADGE_TIERS) {
    if (stones >= tier.stonesRequired) count++;
  }
  return count;
}

/** Get fill progress for a specific badge tier */
export function getBadgeFillProgress(stones: number, badgeIndex: number): number {
  const tier = BADGE_TIERS[badgeIndex];
  if (!tier) return 0;
  if (badgeIndex === 0) return 1; // always full
  const prevThreshold = BADGE_TIERS[badgeIndex - 1].stonesRequired;
  const range = tier.stonesRequired - prevThreshold;
  const progress = (stones - prevThreshold) / range;
  return Math.max(0, Math.min(1, progress));
}

