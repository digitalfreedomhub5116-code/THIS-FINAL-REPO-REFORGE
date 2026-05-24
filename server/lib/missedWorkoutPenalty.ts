/**
 * missedWorkoutPenalty.ts — Server-side missed-workout XP penalty engine.
 *
 * Penalty curve (consecutive missed days):
 *   1 day   → -50 XP
 *   2 days  → -100 XP
 *   3 days  → -150 XP
 *   4+ days → -200 XP (cap)
 *
 * A user "missed" a day if all of these are true at end-of-day (UTC for now):
 *   - They have a workout plan
 *   - The day was a scheduled (non-rest) workout day in their plan
 *   - They did NOT log a workout (last_workout_date != that day)
 *   - They did NOT enter the dungeon successfully (last_dungeon_entry != that day)
 *   - OR they quit the dungeon via the cross button (last_dungeon_quit_date == that day)
 *
 * The penalty deducts from total_xp (and current_xp, floored at 0) and pushes a
 * pending_notifications entry that the client renders as a popup after streak.
 */
import { supabaseServer } from './supabase.js';
import { computeLevelFromTotalXp } from '../../lib/levelSystem.js';

const PENALTY_TABLE: Record<number, number> = {
  1: 50,
  2: 100,
  3: 150,
};
const PENALTY_CAP = 200;

export function computePenaltyXp(consecutiveDays: number): number {
  if (consecutiveDays <= 0) return 0;
  return PENALTY_TABLE[consecutiveDays] ?? PENALTY_CAP;
}

function dateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Was the given day a scheduled (non-rest) workout day for this user? */
function wasScheduledWorkoutDay(
  workoutPlan: any[] | undefined,
  workoutCompletedDays: number,
  daysSinceStart: number
): boolean {
  if (!workoutPlan || workoutPlan.length === 0) return false;
  // The plan rotates by completed days; for the day we're checking, we approximate
  // by using the days-since-start index (same logic as the client useSystem.ts).
  const idx = (daysSinceStart - 1) % workoutPlan.length;
  const day = workoutPlan[idx];
  return !!day && !day.isRecovery;
}


/**
 * Evaluate one user for yesterday's miss and apply penalty if needed.
 * Idempotent: keyed off last_miss_check_date — won't double-apply for the same day.
 */
export async function checkAndApplyMissedWorkoutPenalty(
  userId: string,
  todayStrUtc: string
): Promise<{ applied: boolean; newConsecutive: number; penalty: number; newTotalXp: number } | null> {
  const db = supabaseServer() as any;

  const { data: row, error } = await db
    .from('players')
    .select(
      'id, supabase_id, total_xp, current_xp, level, last_workout_date, last_dungeon_entry, last_dungeon_quit_date, last_miss_check_date, consecutive_missed_workouts, raw_data, pending_notifications, start_date, is_banned'
    )
    .eq('supabase_id', userId)
    .single();

  if (error || !row) return null;
  if (row.is_banned) return null;

  // Yesterday in UTC (we use UTC for the cron so it fires at a single point per global day)
  const today = new Date(todayStrUtc + 'T00:00:00Z');
  const yesterday = new Date(today);
  yesterday.setUTCDate(today.getUTCDate() - 1);
  const yesterdayStr = dateStr(yesterday);

  // Skip if we already evaluated yesterday (idempotency)
  if (row.last_miss_check_date && row.last_miss_check_date >= yesterdayStr) {
    return null;
  }

  // Skip on signup day — give new users a grace period
  if (row.start_date) {
    const startMs = new Date(row.start_date).getTime();
    const daysSinceStart = Math.floor((today.getTime() - startMs) / (24 * 60 * 60 * 1000));
    if (daysSinceStart <= 1) {
      // Mark as checked but don't penalize
      await db.from('players').update({ last_miss_check_date: yesterdayStr }).eq('id', row.id);
      return null;
    }
  }


  // Pull the workout plan from raw_data.healthProfile.workoutPlan
  const workoutPlan = row.raw_data?.healthProfile?.workoutPlan;
  const workoutCompletedDays = row.raw_data?.workoutCompletedDays || 0;
  if (!workoutPlan || workoutPlan.length === 0) {
    // No plan yet — nothing to miss. Mark checked and bail.
    await db.from('players').update({ last_miss_check_date: yesterdayStr }).eq('id', row.id);
    return null;
  }

  const startMs = row.start_date ? new Date(row.start_date).getTime() : today.getTime();
  const daysSinceStart = Math.floor((today.getTime() - startMs) / (24 * 60 * 60 * 1000));
  const wasScheduled = wasScheduledWorkoutDay(workoutPlan, workoutCompletedDays, daysSinceStart);
  if (!wasScheduled) {
    // Yesterday was a rest day — no penalty, but reset the streak
    await db
      .from('players')
      .update({ last_miss_check_date: yesterdayStr, consecutive_missed_workouts: 0 })
      .eq('id', row.id);
    return null;
  }

  const completedYesterday =
    row.last_workout_date === yesterdayStr || row.last_dungeon_entry === yesterdayStr;
  const quitYesterday = row.last_dungeon_quit_date === yesterdayStr;
  const missed = !completedYesterday || quitYesterday;

  if (!missed) {
    // Successfully worked out — reset streak
    await db
      .from('players')
      .update({ last_miss_check_date: yesterdayStr, consecutive_missed_workouts: 0 })
      .eq('id', row.id);
    return null;
  }

  // ── Apply penalty — compute new XP totals ──
  const newConsecutive = (row.consecutive_missed_workouts || 0) + 1;
  const penalty = computePenaltyXp(newConsecutive);
  const newTotalXp = Math.max(0, (row.total_xp || 0) - penalty);

  // ── Recompute level from scratch using new total XP ──
  // This is the source-of-truth: if the player drops below their level
  // threshold, their level, currentXp and requiredXp are all corrected.
  const recomputed = computeLevelFromTotalXp(newTotalXp);
  const oldLevel = row.level || 1;
  const newLevel = recomputed.level;
  const newCurrentXp = recomputed.currentXp;
  const newRequiredXp = recomputed.requiredXp;
  const newRank = recomputed.rank;
  const didLevelDown = newLevel < oldLevel;

  // Push pending notification for the client popup
  const existingNotifs = Array.isArray(row.pending_notifications)
    ? row.pending_notifications
    : [];
  const notif = {
    id: `missed_workout_${yesterdayStr}_${Date.now()}`,
    type: 'missed_workout_penalty',
    timestamp: new Date().toISOString(),
    consecutiveDays: newConsecutive,
    xpLost: penalty,
    forDate: yesterdayStr,
    // Include level-down info so the client can trigger the cinematic
    ...(didLevelDown ? { levelBefore: oldLevel, levelAfter: newLevel } : {}),
  };


  // De-duplicate: collapse multiple unread missed-workout notifs into one with the latest values
  const filteredNotifs = existingNotifs.filter(
    (n: any) => n?.type !== 'missed_workout_penalty'
  );
  filteredNotifs.push(notif);

  const updatePayload: Record<string, any> = {
    total_xp: newTotalXp,
    current_xp: newCurrentXp,
    required_xp: newRequiredXp,
    consecutive_missed_workouts: newConsecutive,
    last_miss_check_date: yesterdayStr,
    pending_notifications: filteredNotifs,
  };

  // Only write level/rank columns when the player actually deleveled
  if (didLevelDown) {
    updatePayload.level = newLevel;
    updatePayload.rank = newRank;
  }

  const { error: updateErr } = await db
    .from('players')
    .update(updatePayload)
    .eq('id', row.id);

  if (updateErr) {
    console.error('[MissedWorkoutPenalty] Update failed:', updateErr);
    return null;
  }

  console.log(
    `[MissedWorkoutPenalty] ${userId.slice(-8)}: ${newConsecutive} consecutive misses → -${penalty} XP ` +
    `(totalXp: ${row.total_xp} → ${newTotalXp}, level: ${oldLevel} → ${newLevel}${ didLevelDown ? ' ⬇ LEVEL DOWN' : '' })`
  );

  return { applied: true, newConsecutive, penalty, newTotalXp };
}

/**
 * Cron entry point: scan all non-banned, configured players who haven't been
 * checked yet for yesterday and evaluate them.
 */
export async function runMissedWorkoutPenaltyCron(): Promise<void> {
  const db = supabaseServer() as any;
  const todayStr = new Date().toISOString().slice(0, 10);
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  // Find all configured players where last_miss_check_date is null OR < yesterday
  const { data: candidates, error } = await db
    .from('players')
    .select('supabase_id')
    .eq('is_banned', false)
    .eq('is_configured', true)
    .or(`last_miss_check_date.is.null,last_miss_check_date.lt.${yesterdayStr}`)
    .limit(500); // batch cap per run

  if (error) {
    console.error('[MissedWorkoutPenalty] Candidate fetch failed:', error);
    return;
  }
  if (!candidates || candidates.length === 0) return;

  let appliedCount = 0;
  for (const c of candidates) {
    const result = await checkAndApplyMissedWorkoutPenalty(c.supabase_id, todayStr);
    if (result?.applied) appliedCount++;
  }

  if (appliedCount > 0) {
    console.log(`[MissedWorkoutPenalty] Cron applied ${appliedCount} penalties`);
  }
}
