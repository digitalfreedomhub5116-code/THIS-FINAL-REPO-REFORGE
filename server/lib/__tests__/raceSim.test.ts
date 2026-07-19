/**
 * raceSim.test.ts — LOCAL race-condition simulations for the login-flow-rewire
 * key-gate / idempotency / Dusk-billing hardening (Task 14.3).
 *
 * SAFETY: These tests NEVER touch the production database. `supabaseServer()` is
 * fully mocked with an in-memory table that faithfully reproduces the Supabase
 * optimistic-concurrency pattern the real code relies on:
 *   - select(...).eq(...).single()
 *   - update(...).eq('id', id).eq('<guardCol>', current).select(...) -> [] when the
 *     guard no longer matches (i.e. a concurrent writer won the race).
 *   - insert(...) with a UNIQUE constraint on ai_idempotency.key (23505 on replay).
 *
 * Covered races (design.md §"Race Conditions & Mitigations"):
 *   • Food-scan double-submit  -> withIdempotency charges exactly once  (B1/B3)
 *   • Dusk [SYSTEM_EVENT]       -> zero counter increment, zero key spend (C2)
 *   • Concurrent deduct+grant   -> optimistic retry loop, no lost update  (B4 / R8.4)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// ─────────────────────────────────────────────────────────────────────────────
// In-memory mock Supabase client
// ─────────────────────────────────────────────────────────────────────────────

interface Row { [k: string]: any }

class MockDb {
  tables: Record<string, Row[]> = {};
  /** UNIQUE columns per table (enforced on insert). */
  uniqueCols: Record<string, string[]> = { ai_idempotency: ['key'] };
  /**
   * One-shot hook: run right before a guarded UPDATE evaluates its `.eq` guard on
   * `table`, simulating a concurrent writer that landed between this caller's read
   * and its update. Used to force a stale (0-row) guarded update exactly once.
   */
  private preUpdateHook: Record<string, (() => void) | undefined> = {};

  reset() {
    this.tables = {};
    this.preUpdateHook = {};
  }

  seed(table: string, rows: Row[]) {
    this.tables[table] = rows.map((r) => ({ ...r }));
  }

  getRows(table: string): Row[] {
    if (!this.tables[table]) this.tables[table] = [];
    return this.tables[table];
  }

  /** Register a one-shot concurrent-writer mutation before the next guarded update. */
  injectConcurrentWriteBeforeNextUpdate(table: string, mutator: () => void) {
    this.preUpdateHook[table] = mutator;
  }

  consumePreUpdateHook(table: string) {
    const hook = this.preUpdateHook[table];
    this.preUpdateHook[table] = undefined;
    if (hook) hook();
  }

  from(table: string) {
    return new QueryBuilder(this, table);
  }
}

type Op = 'select' | 'update' | 'insert' | null;

class QueryBuilder {
  private op: Op = null;
  private payload: Row | null = null;
  private filters: Array<{ col: string; val: any }> = [];
  private returning = false;
  private isSingle = false;

  constructor(private db: MockDb, private table: string) {}

  select(_cols?: string) {
    if (this.op === null) this.op = 'select';
    else this.returning = true; // .select() chained after .update() -> return rows
    return this;
  }
  insert(payload: Row) {
    this.op = 'insert';
    this.payload = payload;
    return this;
  }
  update(payload: Row) {
    this.op = 'update';
    this.payload = payload;
    return this;
  }
  eq(col: string, val: any) {
    this.filters.push({ col, val });
    return this;
  }
  limit(_n: number) {
    return this;
  }
  single() {
    this.isSingle = true;
    return this;
  }

  private matches(row: Row): boolean {
    return this.filters.every((f) => row[f.col] === f.val);
  }

  private execute(): { data: any; error: any } {
    const rows = this.db.getRows(this.table);

    if (this.op === 'insert') {
      const uniques = this.db.uniqueCols[this.table] || [];
      for (const col of uniques) {
        if (rows.some((r) => r[col] === this.payload![col])) {
          return {
            data: null,
            error: { code: '23505', message: 'duplicate key value violates unique constraint' },
          };
        }
      }
      rows.push({ ...this.payload });
      return { data: this.payload, error: null };
    }

    if (this.op === 'update') {
      // Simulate a concurrent writer landing between read and guarded update.
      this.db.consumePreUpdateHook(this.table);
      const matched = rows.filter((r) => this.matches(r));
      for (const r of matched) Object.assign(r, this.payload);
      if (this.returning) return { data: matched.map((r) => ({ ...r })), error: null };
      return { data: null, error: null };
    }

    // select
    const matched = rows.filter((r) => this.matches(r));
    if (this.isSingle) {
      if (matched.length === 0) {
        return { data: null, error: { code: 'PGRST116', message: 'no rows' } };
      }
      return { data: { ...matched[0] }, error: null };
    }
    return { data: matched.map((r) => ({ ...r })), error: null };
  }

  // Thenable: awaiting the builder at any terminal point runs the operation.
  then(resolve: (v: { data: any; error: any }) => any, reject?: (e: any) => any) {
    try {
      resolve(this.execute());
    } catch (e) {
      if (reject) reject(e);
      else throw e;
    }
  }
}

const mockDb = new MockDb();

vi.mock('../supabase.js', () => ({
  supabaseServer: () => mockDb,
}));

// Imported AFTER the mock is registered.
import { deductKeys, grantKeys, getKeyBalance } from '../keyGate.js';
import { withIdempotency } from '../idempotency.js';
import { incrementDuskCounter } from '../duskCounter.js';

const USER = 'user-abc';
const PLAYER_ID = 'row-1';

function seedPlayer(keys: number, duskCount = 0) {
  mockDb.seed('players', [
    { id: PLAYER_ID, supabase_id: USER, keys, dusk_msg_count: duskCount },
  ]);
}

beforeEach(() => {
  mockDb.reset();
  mockDb.seed('ai_idempotency', []);
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. Food-scan double-submit — withIdempotency runs the producer exactly once
// ─────────────────────────────────────────────────────────────────────────────
describe('withIdempotency — concurrent double food-scan (same requestId)', () => {
  it('invokes the producer once and both callers get the same result (one key charged)', async () => {
    seedPlayer(5);
    const requestId = 'scan-req-1';

    // The "producer" is the billable work: deduct exactly one key + return the scan result.
    const producer = vi.fn(async () => {
      const res = await deductKeys(USER, 1);
      return { calories: 420, keyResult: res };
    });

    const [a, b] = await Promise.all([
      withIdempotency(USER, requestId, producer),
      withIdempotency(USER, requestId, producer),
    ]);

    // Producer (and therefore the key deduction) ran exactly once.
    expect(producer).toHaveBeenCalledTimes(1);

    // Exactly one key was charged: 5 -> 4.
    expect(await getKeyBalance(USER)).toBe(4);

    // Both callers observe the same result; one is a fresh run, the other a replay.
    expect(a.result).toEqual(b.result);
    const replayedFlags = [a.replayed, b.replayed].sort();
    expect(replayedFlags).toEqual([false, true]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Dusk billing — [SYSTEM_EVENT] messages are non-billable
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mirrors the billing decision in server/routes/dusk.ts. System events short-circuit
 * BEFORE any counter increment or key deduction. Dependencies are injected so the
 * test can assert exactly which side-effecting calls happened.
 */
async function duskBillingDecision(
  userId: string,
  message: string,
  deps: {
    incrementDuskCounter: (u: string) => Promise<number | null>;
    deductKeys: (u: string, n: number) => Promise<{ success: boolean; remaining: number }>;
  }
): Promise<{ isSystemEvent: boolean; didDeduct: boolean; blocked: boolean }> {
  const isSystemEvent = message.startsWith('[SYSTEM_EVENT]');
  let didDeduct = false;
  if (!isSystemEvent) {
    const count = await deps.incrementDuskCounter(userId);
    if (count !== null && count % 5 === 0) {
      const r = await deps.deductKeys(userId, 1);
      if (!r.success) return { isSystemEvent, didDeduct: false, blocked: true };
      didDeduct = true;
    }
  }
  return { isSystemEvent, didDeduct, blocked: false };
}

describe('Dusk billing — system event short-circuit', () => {
  it('a [SYSTEM_EVENT] message increments no counter and deducts no key', async () => {
    seedPlayer(3, /* duskCount */ 4); // next real message would be the 5th (billable)
    const incSpy = vi.fn(incrementDuskCounter);
    const deductSpy = vi.fn(deductKeys);

    const out = await duskBillingDecision(USER, '[SYSTEM_EVENT] user finished a workout', {
      incrementDuskCounter: incSpy,
      deductKeys: deductSpy,
    });

    expect(out.isSystemEvent).toBe(true);
    expect(out.didDeduct).toBe(false);
    expect(incSpy).not.toHaveBeenCalled();
    expect(deductSpy).not.toHaveBeenCalled();

    // Balance AND counter are untouched by a system event.
    expect(await getKeyBalance(USER)).toBe(3);
    expect(mockDb.getRows('players')[0].dusk_msg_count).toBe(4);
  });

  it('a normal message increments the counter and charges exactly one key on the 5th', async () => {
    seedPlayer(3, /* duskCount */ 4); // this message becomes count 5 -> billable
    const incSpy = vi.fn(incrementDuskCounter);
    const deductSpy = vi.fn(deductKeys);

    const out = await duskBillingDecision(USER, 'push harder today', {
      incrementDuskCounter: incSpy,
      deductKeys: deductSpy,
    });

    expect(out.isSystemEvent).toBe(false);
    expect(incSpy).toHaveBeenCalledTimes(1);
    expect(deductSpy).toHaveBeenCalledTimes(1);
    expect(out.didDeduct).toBe(true);
    expect(await getKeyBalance(USER)).toBe(2); // 3 -> 2
    expect(mockDb.getRows('players')[0].dusk_msg_count).toBe(5);
  });

  it('non-5th normal messages increment the counter but charge no key', async () => {
    seedPlayer(3, /* duskCount */ 1); // becomes count 2 -> not billable
    const out = await duskBillingDecision(USER, 'hello', {
      incrementDuskCounter,
      deductKeys,
    });
    expect(out.didDeduct).toBe(false);
    expect(await getKeyBalance(USER)).toBe(3);
    expect(mockDb.getRows('players')[0].dusk_msg_count).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Concurrent deduct + grant — optimistic retry loop, no lost update
// ─────────────────────────────────────────────────────────────────────────────
describe('key-gate — concurrent deduct + grant do not lose an update', () => {
  it('a stale guarded update (0 rows once) is retried and converges to the correct balance', async () => {
    seedPlayer(10);

    // Simulate a concurrent writer: right before grantKeys runs its guarded UPDATE,
    // a deduct of 1 lands (10 -> 9). grant read 10, so its guard `.eq('keys', 10)`
    // now matches nothing -> 0 rows (stale). The retry loop must re-read (9) and
    // re-apply the +5, converging to 14 without losing the concurrent -1.
    mockDb.injectConcurrentWriteBeforeNextUpdate('players', () => {
      const row = mockDb.getRows('players')[0];
      row.keys = row.keys - 1; // the concurrent deduction
    });

    const grantRes = await grantKeys(USER, 5);

    expect(grantRes.success).toBe(true);
    // 10 (start) - 1 (concurrent deduct) + 5 (grant) = 14. Neither update was lost.
    expect(grantRes.newBalance).toBe(14);
    expect(await getKeyBalance(USER)).toBe(14);
  });

  it('truly concurrent deduct+grant on the same starting balance converge (no lost update)', async () => {
    seedPlayer(10);

    // Honest optimistic guards + bounded retry loops mean that regardless of the
    // interleaving, the final balance must reflect BOTH operations: 10 - 1 + 5 = 14.
    const [deductRes, grantRes] = await Promise.all([
      deductKeys(USER, 1),
      grantKeys(USER, 5),
    ]);

    expect(deductRes.success).toBe(true);
    expect(grantRes.success).toBe(true);
    expect(await getKeyBalance(USER)).toBe(14);
  });

  it('a genuine insufficient balance is NOT masked as a retry failure', async () => {
    seedPlayer(0);
    const res = await deductKeys(USER, 1);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/Not enough keys/);
    expect(await getKeyBalance(USER)).toBe(0);
  });
});
