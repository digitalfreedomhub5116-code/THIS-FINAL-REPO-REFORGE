
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
    name: 'Neophyte Tracksuit',
    tier: 'E',
    description: 'Basic gear for the awakened. Offers minimal protection but unrestricted movement.',
    image: '/images/outfit/outfit-e.jpg',
    baseStats: { attack: 40, boost: 10, ultimate: 5, extraction: 0 },
    cost: 0,
    accentColor: '#9ca3af',
    buffs: [],
    isDefault: true,
  },
  {
    id: 'outfit_ghost',
    name: 'Ghost Protocol',
    tier: 'D',
    description: 'Lightweight recon suit. Early hunters swear by its stealth properties.',
    image: '/images/outfit/outfit-d.jpg',
    baseStats: { attack: 90, boost: 60, ultimate: 45, extraction: 30 },
    cost: 800,
    accentColor: '#4ade80',
    buffs: [{ label: 'XP Boost', color: '#4ade80' }],
  },
  {
    id: 'outfit_knight',
    name: 'Iron Will Plate',
    tier: 'C',
    description: 'Standard-issue tank armor. High durability, steady output.',
    image: '/images/outfit/outfit-c.jpg',
    baseStats: { attack: 150, boost: 50, ultimate: 100, extraction: 20 },
    cost: 1500,
    accentColor: '#60a5fa',
    buffs: [{ label: 'Nutrition Boost', color: '#60a5fa' }],
  },
  {
    id: 'outfit_assassin',
    name: 'Midnight Assassin',
    tier: 'B',
    description: 'Stealth gear woven from shadow thread. High extraction capability.',
    image: '/images/outfit/outfit-b.jpg',
    baseStats: { attack: 450, boost: 200, ultimate: 300, extraction: 550 },
    cost: 5000,
    accentColor: '#c084fc',
    buffs: [
      { label: 'Shadow Extraction', color: '#c084fc' },
      { label: 'XP Boost',          color: '#4ade80' },
    ],
  },
  {
    id: 'outfit_vanguard',
    name: 'Abyssal Vanguard',
    tier: 'A',
    description: 'Forged in the abyss. Commands fear and multiplies every haul.',
    image: '/images/outfit/outfit-b.jpg',
    baseStats: { attack: 900, boost: 700, ultimate: 800, extraction: 600 },
    cost: 15000,
    accentColor: '#facc15',
    buffs: [
      { label: 'Coin Frenzy',        color: '#facc15' },
      { label: 'Shadow Extraction',  color: '#c084fc' },
    ],
  },
  {
    id: 'outfit_monarch',
    name: "Monarch's Raiment",
    tier: 'S',
    description: 'The ceremonial armor of the Shadow Monarch. All limits transcended.',
    image: '/images/outfit/outfit-s.jpg',
    baseStats: { attack: 2500, boost: 1500, ultimate: 4000, extraction: 5000 },
    cost: 50000,
    accentColor: '#f87171',
    buffs: [
      { label: 'Coin Frenzy',        color: '#facc15' },
      { label: 'Shadow Extraction',  color: '#c084fc' },
      { label: 'XP Boost',           color: '#4ade80' },
      { label: 'Nutrition Boost',    color: '#60a5fa' },
    ],
  },
];

export const SHADOWS: Shadow[] = [
  {
    id: 'shadow_igris',
    name: 'Igris',
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
    id: 'shadow_beru',
    name: 'Beru',
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
