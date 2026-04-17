// Shared level-up & rank logic — used by BOTH client (hooks/useSystem.ts) and server (leaderboard claim, etc.)
// This is the single source of truth for rank thresholds and XP overflow handling.

export type RankType = 'UNRANKED' | 'E' | 'D' | 'C' | 'B' | 'A' | 'S';

// Canonical rank thresholds — single source of truth
const RANK_THRESHOLDS: { rank: Exclude<RankType, 'UNRANKED'>; minLevel: number }[] = [
  { rank: 'S', minLevel: 80 },
  { rank: 'A', minLevel: 55 },
  { rank: 'B', minLevel: 39 },
  { rank: 'C', minLevel: 27 },
  { rank: 'D', minLevel: 11 },
  { rank: 'E', minLevel: 1 },
];

export function computeRank(level: number): RankType {
  for (const t of RANK_THRESHOLDS) {
    if (level >= t.minLevel) return t.rank;
  }
  return 'E';
}

// Safe level-up helper: caps iterations and ensures requiredXp always grows
export function safeLevelUp(
  currentXp: number,
  requiredXp: number,
  level: number
): { currentXp: number; requiredXp: number; level: number; leveledUp: boolean; rank: RankType } {
  // Floor requiredXp to prevent runaway loops from corrupted data
  if (!requiredXp || requiredXp < 50) requiredXp = 100;
  let leveledUp = false;
  let iterations = 0;
  const MAX_LEVELUPS = 100; // Hard cap per single XP grant (high enough for admin bulk XP)
  while (currentXp >= requiredXp && iterations < MAX_LEVELUPS) {
    currentXp -= requiredXp;
    level++;
    const next = Math.floor(requiredXp * 1.5);
    requiredXp = next > requiredXp ? next : requiredXp + 1; // Guarantee growth
    leveledUp = true;
    iterations++;
  }
  return { currentXp, requiredXp, level, leveledUp, rank: computeRank(level) };
}
