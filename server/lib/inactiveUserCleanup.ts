/**
 * inactiveUserCleanup.ts — Production-grade inactive user purge system.
 *
 * Permanently deletes ALL data for users who have been inactive for more
 * than 21 days. "Inactive" = `updated_at` is older than 21 days.
 * (`updated_at` is refreshed on every /sync call, which the client makes
 * every 30 seconds while the app is open.)
 *
 * Safety:
 * - Bot users (raw_data->isBot = true) are EXCLUDED
 * - Banned users are still eligible for cleanup (if inactive 21d)
 * - Processes in batches of 50 to avoid DB timeouts
 * - Idempotent — safe to run multiple times
 * - Logs every deletion for audit trail
 *
 * Data deleted per user:
 * 1. player row (CASCADE handles: workouts, user_custom_plans, user_outfits, workout_sessions)
 * 2. user_inventory rows
 * 3. daily_rank_snapshots rows
 * 4. league_members rows
 * 5. api_usage_logs rows
 * 6. goals rows
 * 7. Avatar from Supabase Storage
 * 8. Supabase Auth user (best-effort)
 */

import { supabaseServer } from './supabase.js';

const INACTIVE_THRESHOLD_DAYS = 21;
const BATCH_SIZE = 50;

interface CleanupResult {
  totalScanned: number;
  totalDeleted: number;
  errors: string[];
  deletedUsers: { id: string; username: string; lastActive: string; daysSinceActive: number }[];
}

/**
 * Find all players inactive for > INACTIVE_THRESHOLD_DAYS,
 * excluding bots, and delete them completely.
 */
export async function runInactiveUserCleanup(): Promise<CleanupResult> {
  const db = supabaseServer() as any;
  const now = new Date();
  const cutoffDate = new Date(now.getTime() - INACTIVE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);
  const cutoffIso = cutoffDate.toISOString();

  const result: CleanupResult = {
    totalScanned: 0,
    totalDeleted: 0,
    errors: [],
    deletedUsers: [],
  };

  console.log(`[Cleanup] Starting inactive user purge — cutoff: ${cutoffIso} (${INACTIVE_THRESHOLD_DAYS} days ago)`);

  try {
    // ── Step 1: Find all inactive players ──
    // Fetch in batches. Players are "inactive" if updated_at < cutoff.
    // Exclude bot users via raw_data->isBot check.
    let offset = 0;
    let hasMore = true;
    const inactivePlayers: { id: string; supabase_id: string; username: string; updated_at: string; raw_data: any; created_at: string }[] = [];

    while (hasMore) {
      const { data: batch, error: fetchErr } = await db
        .from('players')
        .select('id, supabase_id, username, name, updated_at, raw_data, created_at')
        .lt('updated_at', cutoffIso)
        .range(offset, offset + BATCH_SIZE - 1)
        .order('updated_at', { ascending: true });

      if (fetchErr) {
        const msg = `Failed to fetch inactive players (offset ${offset}): ${fetchErr.message}`;
        console.error(`[Cleanup] ${msg}`);
        result.errors.push(msg);
        break;
      }

      if (!batch || batch.length === 0) {
        hasMore = false;
        break;
      }

      // Filter out bot users
      const realUsers = batch.filter((p: any) => {
        const rawData = p.raw_data || {};
        return rawData.isBot !== true;
      });

      inactivePlayers.push(...realUsers);
      result.totalScanned += batch.length;

      if (batch.length < BATCH_SIZE) {
        hasMore = false;
      } else {
        offset += BATCH_SIZE;
      }
    }

    // Also check users with NULL updated_at — these are very old accounts
    // that were created before the updated_at trigger was added.
    // Only delete if created_at is also older than the threshold.
    const { data: nullUpdatedPlayers, error: nullErr } = await db
      .from('players')
      .select('id, supabase_id, username, name, updated_at, raw_data, created_at')
      .is('updated_at', null)
      .lt('created_at', cutoffIso);

    if (!nullErr && nullUpdatedPlayers && nullUpdatedPlayers.length > 0) {
      const realNullUsers = nullUpdatedPlayers.filter((p: any) => {
        const rawData = p.raw_data || {};
        return rawData.isBot !== true;
      });
      inactivePlayers.push(...realNullUsers);
      result.totalScanned += nullUpdatedPlayers.length;
    }

    console.log(`[Cleanup] Found ${inactivePlayers.length} inactive real users (out of ${result.totalScanned} scanned)`);

    if (inactivePlayers.length === 0) {
      console.log('[Cleanup] No inactive users to delete — done.');
      return result;
    }

    // ── Step 2: Delete each inactive user and all their data ──
    for (const player of inactivePlayers) {
      const daysSinceActive = player.updated_at
        ? Math.floor((now.getTime() - new Date(player.updated_at).getTime()) / (1000 * 60 * 60 * 24))
        : Math.floor((now.getTime() - new Date(player.created_at).getTime()) / (1000 * 60 * 60 * 24));

      try {
        await deletePlayerCompletely(db, player);
        result.totalDeleted++;
        result.deletedUsers.push({
          id: player.supabase_id || player.id,
          username: player.username || 'unknown',
          lastActive: player.updated_at || player.created_at || 'unknown',
          daysSinceActive,
        });
        console.log(`[Cleanup] DELETED: ${player.username || 'unknown'} (${player.id}) — inactive ${daysSinceActive} days`);
      } catch (err: any) {
        const msg = `Failed to delete ${player.username || player.id}: ${err?.message || err}`;
        console.error(`[Cleanup] ${msg}`);
        result.errors.push(msg);
      }
    }

    console.log(`[Cleanup] Purge complete — ${result.totalDeleted}/${inactivePlayers.length} users deleted, ${result.errors.length} errors`);
    return result;
  } catch (err: any) {
    const msg = `Cleanup crashed: ${err?.message || err}`;
    console.error(`[Cleanup] ${msg}`);
    result.errors.push(msg);
    return result;
  }
}

/**
 * Completely delete a player and all their associated data.
 * This mirrors the logic in the delete-account endpoint but
 * works without user authentication (server-side only).
 */
async function deletePlayerCompletely(
  db: any,
  player: { id: string; supabase_id: string; username: string }
): Promise<void> {
  const playerId = player.id;
  const supabaseId = player.supabase_id;

  // 1. Delete from user_inventory (may not cascade)
  try {
    await db.from('user_inventory').delete().eq('player_id', playerId);
  } catch { /* table may not exist */ }

  // 2. Delete from daily_rank_snapshots
  try {
    await db.from('daily_rank_snapshots').delete().eq('player_id', playerId);
  } catch { /* table may not exist */ }

  // 3. Delete from league_members
  try {
    await db.from('league_members').delete().eq('player_id', playerId);
  } catch { /* table may not exist */ }

  // 4. Delete from api_usage_logs
  try {
    await db.from('api_usage_logs').delete().eq('user_id', playerId);
  } catch { /* table may not exist */ }

  // 5. Delete from goals
  try {
    await db.from('goals').delete().eq('player_id', playerId);
  } catch { /* table may not exist */ }

  // 6. Delete from quests
  try {
    await db.from('quests').delete().eq('player_id', playerId);
  } catch { /* table may not exist */ }

  // 7. Delete the player row itself (CASCADE handles: workouts, user_custom_plans,
  //    user_outfits, workout_sessions — all have ON DELETE CASCADE)
  const { error: deleteError } = await db
    .from('players')
    .delete()
    .eq('id', playerId);

  if (deleteError) {
    throw new Error(`Player row deletion failed: ${deleteError.message}`);
  }

  // 8. Delete avatar from Supabase Storage (best-effort)
  if (supabaseId) {
    try {
      await db.storage.from('avatars').remove([`avatars/${supabaseId}.webp`]);
    } catch { /* avatar may not exist */ }
  }

  // 9. Delete Supabase Auth user (best-effort — requires service_role key)
  if (supabaseId) {
    try {
      await db.auth.admin.deleteUser(supabaseId);
    } catch {
      // Expected to fail if using anon key — the player row is already gone
    }
  }
}
