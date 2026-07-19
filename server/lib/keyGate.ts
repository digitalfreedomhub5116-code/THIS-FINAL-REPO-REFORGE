/**
 * keyGate.ts — Server-side key deduction for AI features.
 * Keys are ONLY modified by the server. The client can never set the keys balance.
 * 
 * Usage:
 *   const { success, remaining } = await deductKeys(userId, 1);
 *   if (!success) return res.status(402).json({ error: 'Not enough keys' });
 */
import { supabaseServer } from './supabase.js';

/** Maximum number of optimistic-concurrency attempts for a single deduction */
const DEDUCT_MAX_ATTEMPTS = 3;

/** Maximum number of optimistic-concurrency attempts for a single grant */
const GRANT_MAX_ATTEMPTS = 3;

/**
 * Check if a player has enough keys and deduct them atomically.
 *
 * Uses a bounded optimistic-concurrency retry loop: each attempt re-reads the
 * current balance, checks it, and performs a guarded update (`.eq('keys', currentKeys)`).
 * An insufficient balance is NOT retried (it's a genuine "Not enough keys" result),
 * while an optimistic conflict (another writer changed `keys` between our read and
 * update, detected by 0 rows updated or an update error) triggers a re-read + retry.
 * Only after exhausting all attempts do we surface a distinct "retry exhausted" error,
 * so a concurrent modification never masquerades as a false "Not enough keys" 402.
 */
export async function deductKeys(
  userId: string,
  amount: number
): Promise<{ success: boolean; remaining: number; error?: string }> {
  const db = supabaseServer() as any;

  let lastKnownKeys = 0;

  for (let attempt = 0; attempt < DEDUCT_MAX_ATTEMPTS; attempt++) {
    // 1. Re-read the current keys balance (server-authoritative) on every attempt.
    const { data: player, error: fetchErr } = await db
      .from('players')
      .select('id, keys')
      .eq('supabase_id', userId)
      .single();

    if (fetchErr || !player) {
      return { success: false, remaining: 0, error: 'Player not found' };
    }

    const currentKeys = player.keys || 0;
    lastKnownKeys = currentKeys;

    // 2. Genuine insufficient balance — do NOT retry, return immediately.
    if (currentKeys < amount) {
      return {
        success: false,
        remaining: currentKeys,
        error: `Not enough keys. Need ${amount}, have ${currentKeys}`,
      };
    }

    // 3. Optimistic deduction guarded by the freshly-read value. `.select()` lets us
    //    confirm a row was actually updated — Supabase does not error on 0 rows matched,
    //    so a 0-row result means another writer won the race (a conflict to retry).
    const newKeys = currentKeys - amount;
    const { data: updatedRows, error: updateErr } = await db
      .from('players')
      .update({ keys: newKeys })
      .eq('id', player.id)
      .eq('keys', currentKeys) // Optimistic concurrency — only succeeds if no other deduction happened
      .select('id, keys');

    const rowUpdated = Array.isArray(updatedRows) && updatedRows.length > 0;

    if (!updateErr && rowUpdated) {
      // Success — trust the row the DB returned as the authoritative remaining balance.
      const remaining = updatedRows[0]?.keys ?? newKeys;
      return { success: true, remaining };
    }

    // Otherwise: update error or 0 rows matched => concurrent modification. Loop and retry.
  }

  // 4. Exhausted all attempts against persistent contention.
  return {
    success: false,
    remaining: lastKnownKeys,
    error: 'Concurrent modification — retry exhausted',
  };
}

/** Get a player's current key balance (read-only) */
export async function getKeyBalance(userId: string): Promise<number> {
  const db = supabaseServer() as any;
  const { data } = await db
    .from('players')
    .select('keys')
    .eq('supabase_id', userId)
    .single();
  return data?.keys || 0;
}

/**
 * Grant keys to a player (for daily grants, leaderboard rewards, etc.).
 *
 * Uses the same bounded optimistic-concurrency retry loop as {@link deductKeys}
 * so two concurrent grants can never lose an update. Each attempt re-reads the
 * current balance and performs a guarded update (`.eq('keys', currentKeys)`);
 * a 0-row result or update error means another writer won the race, so we
 * re-read and retry. After exhausting all attempts we return the last known
 * balance with `success:false`.
 */
export async function grantKeys(
  userId: string,
  amount: number
): Promise<{ success: boolean; newBalance: number }> {
  const db = supabaseServer() as any;

  let lastKnownKeys = 0;

  for (let attempt = 0; attempt < GRANT_MAX_ATTEMPTS; attempt++) {
    // 1. Re-read the current keys balance (server-authoritative) on every attempt.
    const { data: player, error: fetchErr } = await db
      .from('players')
      .select('id, keys')
      .eq('supabase_id', userId)
      .single();

    if (fetchErr || !player) {
      return { success: false, newBalance: 0 };
    }

    const currentKeys = player.keys || 0;
    lastKnownKeys = currentKeys;

    // 2. Optimistic grant guarded by the freshly-read value. `.select()` lets us
    //    confirm a row was actually updated — Supabase does not error on 0 rows
    //    matched, so a 0-row result means another writer won the race (a conflict).
    const newKeys = currentKeys + amount;
    const { data: updatedRows, error: updateErr } = await db
      .from('players')
      .update({ keys: newKeys })
      .eq('id', player.id)
      .eq('keys', currentKeys) // Optimistic concurrency — only succeeds if no other write happened
      .select('id, keys');

    const rowUpdated = Array.isArray(updatedRows) && updatedRows.length > 0;

    if (!updateErr && rowUpdated) {
      // Success — trust the row the DB returned as the authoritative new balance.
      const newBalance = updatedRows[0]?.keys ?? newKeys;
      return { success: true, newBalance };
    }

    // Otherwise: update error or 0 rows matched => concurrent modification. Loop and retry.
  }

  // 3. Exhausted all attempts against persistent contention.
  return { success: false, newBalance: lastKnownKeys };
}
