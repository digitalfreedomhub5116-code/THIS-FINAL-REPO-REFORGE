/**
 * duskCounter.ts — Atomic per-user message counter for the DUSK chat key-gate.
 *
 * Replaces the old in-memory Map (which reset on every server restart and was
 * per-instance) with a persistent, server-authoritative column on `players`.
 * The count drives the "1 key per 5 messages" gate in server/routes/dusk.ts.
 */
import { supabaseServer } from './supabase.js';

/** Maximum number of optimistic-concurrency attempts for a single increment */
const INCREMENT_MAX_ATTEMPTS = 3;

/**
 * Atomically increment `players.dusk_msg_count` for the given user and return
 * the NEW count.
 *
 * Uses the same bounded optimistic-concurrency retry loop as keyGate: each
 * attempt re-reads the current count and performs a guarded update
 * (`.eq('dusk_msg_count', current)`). A 0-row result or update error means
 * another writer won the race, so we re-read and retry (up to 3x).
 *
 * GRACEFUL DEGRADATION: if the column doesn't exist, the player can't be found,
 * or any DB error occurs (including exhausted retries), we log a warning and
 * return `null`. Callers MUST treat `null` as "skip billing this message"
 * rather than over-charging the user for an infrastructure problem.
 */
export async function incrementDuskCounter(userId: string): Promise<number | null> {
  const db = supabaseServer() as any;

  for (let attempt = 0; attempt < INCREMENT_MAX_ATTEMPTS; attempt++) {
    // 1. Re-read the current count (server-authoritative) on every attempt.
    const { data: player, error: fetchErr } = await db
      .from('players')
      .select('id, dusk_msg_count')
      .eq('supabase_id', userId)
      .single();

    if (fetchErr || !player) {
      console.warn('[duskCounter] Could not read dusk_msg_count — skipping billing:', fetchErr?.message);
      return null;
    }

    const currentCount = player.dusk_msg_count || 0;
    const newCount = currentCount + 1;

    // 2. Optimistic increment guarded by the freshly-read value. `.select()` lets
    //    us confirm a row was actually updated — Supabase does not error on 0 rows
    //    matched, so a 0-row result means another writer won the race (a conflict).
    const { data: updatedRows, error: updateErr } = await db
      .from('players')
      .update({ dusk_msg_count: newCount })
      .eq('id', player.id)
      .eq('dusk_msg_count', currentCount) // Optimistic concurrency — only succeeds if no other increment happened
      .select('id, dusk_msg_count');

    if (updateErr) {
      // A real DB error (e.g. missing column) — degrade gracefully.
      console.warn('[duskCounter] Increment failed — skipping billing:', updateErr.message);
      return null;
    }

    const rowUpdated = Array.isArray(updatedRows) && updatedRows.length > 0;
    if (rowUpdated) {
      // Success — trust the row the DB returned as the authoritative new count.
      return updatedRows[0]?.dusk_msg_count ?? newCount;
    }

    // Otherwise: 0 rows matched => concurrent modification. Loop and retry.
  }

  // Exhausted all attempts against persistent contention — degrade gracefully.
  console.warn('[duskCounter] Increment retries exhausted — skipping billing for this message');
  return null;
}
