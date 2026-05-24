// Shared level-up, level-down & rank logic — used by BOTH client (hooks/useSystem.ts) and server.
// This is the single source of truth for rank thresholds, XP overflow and XP underflow handling.

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

/**
 * Rebuild a player's level/currentXp/requiredXp from their raw total XP.
 * Used by the missed-workout penalty engine after XP is subtracted server-side
 * so that a player who drops below their level threshold is correctly deleveled.
 *
 * Example: a Level-5 player with 10/180 XP who loses 50 XP ends up with
 * current_xp clamped at 0 but their level stays 5. This function recalculates
 * from totalXp=10-50=0 and returns Level 4 with the correct progress bar state.
 */
export function computeLevelFromTotalXp(
  totalXp: number
): { level: number; currentXp: number; requiredXp: number; rank: string } {
  if (totalXp <= 0) {
    return { level: 1, currentXp: 0, requiredXp: 100, rank: computeRank(1) };
  }
  let level = 1;
  let requiredXp = 100;
  let remaining = totalXp;
  // Walk forward through the XP curve until we can't afford the next level
  while (remaining >= requiredXp) {
    remaining -= requiredXp;
    level++;
    const next = Math.floor(requiredXp * 1.5);
    requiredXp = next > requiredXp ? next : requiredXp + 1;
    if (level > 200) break; // safety cap
  }
  return { level, currentXp: remaining, requiredXp, rank: computeRank(level) };
}
