/**
 * idempotency.ts — Request-level deduplication for AI spends.
 *
 * AI features cost keys, so a retried/duplicated request (double-click, network
 * retry, at-least-once client) must not be charged or executed twice. This helper
 * wraps a "producer" (the expensive AI call + any side effects) so that a given
 * (userId, requestId) pair runs at most once, and subsequent calls replay the
 * stored result instead of re-running the producer.
 *
 * Backed by a Supabase table `ai_idempotency` (see server/migrations/ai_idempotency.sql).
 * If that table is missing or any DB error occurs the helper GRACEFULLY DEGRADES:
 * it logs a warning and simply runs the producer without dedupe. It must never
 * block or hang a real request.
 */
import { supabaseServer } from './supabase.js';

/** Postgres unique-violation SQLSTATE — raised when the claim row already exists. */
const PG_UNIQUE_VIOLATION = '23505';

/** How many times to poll for a concurrent in-flight producer's stored result. */
const REPLAY_POLL_ATTEMPTS = 5;
/** Delay between polls (ms). Kept small so we never hang a request for long. */
const REPLAY_POLL_DELAY_MS = 150;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** True if the Supabase error looks like a "table/relation does not exist" error. */
function isMissingTable(error: any): boolean {
  if (!error) return false;
  // 42P01 = undefined_table. Also match PostgREST's "could not find the table" message.
  const code = error?.code || '';
  const msg = (error?.message || '').toLowerCase();
  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    msg.includes('does not exist') ||
    msg.includes('could not find the table') ||
    msg.includes('schema cache')
  );
}

/** True if the Supabase error is a unique-constraint violation on the claim row. */
function isUniqueViolation(error: any): boolean {
  if (!error) return false;
  const code = error?.code || '';
  const msg = (error?.message || '').toLowerCase();
  return code === PG_UNIQUE_VIOLATION || msg.includes('duplicate key value');
}

/**
 * Run `producer` at most once per (userId, requestId), replaying a stored result
 * for duplicate requests.
 *
 * @returns `{ result, replayed }` where `replayed` is true when the result came
 *          from a previously-stored row rather than a fresh producer run.
 */
export async function withIdempotency<T>(
  userId: string,
  requestId: string,
  producer: () => Promise<T>
): Promise<{ result: T; replayed: boolean }> {
  // No request id => caller opted out of dedupe. Just run it.
  if (!requestId) {
    const result = await producer();
    return { result, replayed: false };
  }

  const key = `${userId}:${requestId}`;
  const db = supabaseServer() as any;

  // 1. Try to claim the key by inserting a placeholder row (result still null).
  let insertErr: any = null;
  try {
    const { error } = await db
      .from('ai_idempotency')
      .insert({ key, user_id: userId, result: null });
    insertErr = error;
  } catch (err) {
    insertErr = err;
  }

  // 2a. We won the claim — run the producer, persist the result, and return.
  if (!insertErr) {
    const result = await producer();
    try {
      await db
        .from('ai_idempotency')
        .update({ result: (result ?? null) as any })
        .eq('key', key);
    } catch (err: any) {
      // Non-fatal: the producer already ran. Future replays just won't dedupe.
      console.warn('[idempotency] Failed to persist result for', key, err?.message);
    }
    return { result, replayed: false };
  }

  // 2b. Insert failed. If the table is missing or the DB is otherwise broken,
  //     degrade gracefully — never block the real request.
  if (!isUniqueViolation(insertErr)) {
    if (isMissingTable(insertErr)) {
      console.warn(
        '[idempotency] ai_idempotency table not found — running without dedupe. ' +
          'Apply server/migrations/ai_idempotency.sql in Supabase.'
      );
    } else {
      console.warn(
        '[idempotency] Claim insert failed — running without dedupe:',
        insertErr?.message
      );
    }
    const result = await producer();
    return { result, replayed: false };
  }

  // 2c. Unique violation => someone already claimed this key. Read their result.
  for (let attempt = 0; attempt < REPLAY_POLL_ATTEMPTS; attempt++) {
    let row: any = null;
    let readErr: any = null;
    try {
      const { data, error } = await db
        .from('ai_idempotency')
        .select('result')
        .eq('key', key)
        .single();
      row = data;
      readErr = error;
    } catch (err) {
      readErr = err;
    }

    if (readErr) {
      // Can't read the winner's row — degrade gracefully rather than hang.
      console.warn(
        '[idempotency] Failed to read existing claim — running without dedupe:',
        readErr?.message
      );
      const result = await producer();
      return { result, replayed: false };
    }

    if (row && row.result !== null && row.result !== undefined) {
      // Winner already stored a result — replay it.
      return { result: row.result as T, replayed: true };
    }

    // Result not ready yet (concurrent in-flight producer). Briefly poll.
    await sleep(REPLAY_POLL_DELAY_MS);
  }

  // 2d. Result never became ready in time. Last resort: run the producer ourselves
  //     so the request is never blocked. (No dedupe guarantee in this rare case.)
  console.warn(
    '[idempotency] Concurrent claim never produced a result in time for',
    key,
    '— running without dedupe.'
  );
  const result = await producer();
  return { result, replayed: false };
}
