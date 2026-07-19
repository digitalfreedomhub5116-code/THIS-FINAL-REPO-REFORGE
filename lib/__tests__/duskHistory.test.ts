import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import {
  Message,
  MAX_HISTORY,
  loadHistory,
  appendMessage,
  setHistory,
  clearHistory,
  subscribe,
} from '../duskHistory';

const key = (userId: string) => `dusk_chat_history_${userId}`;

// The store keeps a module-level in-memory cache and seq counter. vitest runs
// each file in isolation but tests within a file share module state, so we use
// a distinct userId per test to avoid cache bleed and always clear storage.
let uidCounter = 0;
const freshUser = () => `user_${Date.now()}_${uidCounter++}`;

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('duskHistory — unit', () => {
  it('loadHistory returns [] for an unknown user', () => {
    expect(loadHistory(freshUser())).toEqual([]);
  });

  it("normalizes a null/undefined userId to the 'local' key", () => {
    appendMessage(null, { sender: 'user', text: 'hi' });
    expect(localStorage.getItem(key('local'))).not.toBeNull();
  });

  it('appendMessage assigns id, timestamp and seq when missing', () => {
    const uid = freshUser();
    const [msg] = appendMessage(uid, { sender: 'user', text: 'hello' });
    expect(msg.id).toBeTruthy();
    expect(typeof msg.timestamp).toBe('number');
    expect(typeof msg.seq).toBe('number');
    expect(msg.sender).toBe('user');
    expect(msg.text).toBe('hello');
  });

  it('appendMessage persists to localStorage under the scoped key', () => {
    const uid = freshUser();
    appendMessage(uid, { sender: 'dusk', text: 'stored' });
    const raw = localStorage.getItem(key(uid));
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].text).toBe('stored');
  });

  it('appendMessage dedupes by id (no double-append)', () => {
    const uid = freshUser();
    appendMessage(uid, { id: 'dup', sender: 'user', text: 'first' });
    const after = appendMessage(uid, { id: 'dup', sender: 'user', text: 'second' });
    expect(after).toHaveLength(1);
    expect(after[0].text).toBe('first');
  });

  it('appendMessage keeps messages ordered by seq (monotonic)', () => {
    const uid = freshUser();
    let last: Message[] = [];
    for (let i = 0; i < 10; i++) {
      last = appendMessage(uid, { sender: i % 2 ? 'dusk' : 'user', text: `m${i}` });
    }
    for (let i = 1; i < last.length; i++) {
      expect(last[i].seq).toBeGreaterThan(last[i - 1].seq);
    }
    expect(last.map(m => m.text)).toEqual(
      Array.from({ length: 10 }, (_, i) => `m${i}`),
    );
  });

  it('caps history to the last MAX_HISTORY messages', () => {
    const uid = freshUser();
    let last: Message[] = [];
    for (let i = 0; i < MAX_HISTORY + 25; i++) {
      last = appendMessage(uid, { sender: 'user', text: `m${i}` });
    }
    expect(last).toHaveLength(MAX_HISTORY);
    // Oldest ones are dropped; the newest is retained.
    expect(last[last.length - 1].text).toBe(`m${MAX_HISTORY + 24}`);
    expect(last[0].text).toBe(`m${25}`);
  });

  it('loadHistory tolerates legacy entries missing seq and assigns increasing seq', () => {
    const uid = freshUser();
    const legacy = [
      { id: 'a', sender: 'user', text: 'one', timestamp: 1 },
      { id: 'b', sender: 'dusk', text: 'two', timestamp: 2 },
    ];
    localStorage.setItem(key(uid), JSON.stringify(legacy));
    const loaded = loadHistory(uid);
    expect(loaded).toHaveLength(2);
    expect(typeof loaded[0].seq).toBe('number');
    expect(loaded[1].seq).toBeGreaterThan(loaded[0].seq);
    // A newly appended message must sort AFTER the legacy entries.
    const after = appendMessage(uid, { sender: 'user', text: 'three' });
    expect(after[after.length - 1].text).toBe('three');
    expect(after[after.length - 1].seq).toBeGreaterThan(loaded[1].seq);
  });

  it('loadHistory returns [] on corrupt JSON without throwing', () => {
    const uid = freshUser();
    localStorage.setItem(key(uid), '{not valid json');
    expect(loadHistory(uid)).toEqual([]);
  });

  it('setHistory replaces + persists the array', () => {
    const uid = freshUser();
    appendMessage(uid, { sender: 'user', text: 'old' });
    const replaced = setHistory(uid, [
      { id: 'x', sender: 'dusk', text: 'new', timestamp: 5, seq: 0 },
    ]);
    expect(replaced).toHaveLength(1);
    expect(replaced[0].text).toBe('new');
    expect(loadHistory(uid).map(m => m.text)).toEqual(['new']);
  });

  it('clearHistory removes the key and empties the cache', () => {
    const uid = freshUser();
    appendMessage(uid, { sender: 'user', text: 'gone soon' });
    clearHistory(uid);
    expect(localStorage.getItem(key(uid))).toBeNull();
    expect(loadHistory(uid)).toEqual([]);
  });

  it('subscribe fires on append/clear and unsubscribe stops notifications', () => {
    const uid = freshUser();
    const seen: number[] = [];
    const unsub = subscribe((u, history) => {
      if (u === uid) seen.push(history.length);
    });
    appendMessage(uid, { sender: 'user', text: 'a' });
    appendMessage(uid, { sender: 'dusk', text: 'b' });
    clearHistory(uid);
    unsub();
    appendMessage(uid, { sender: 'user', text: 'c' });
    expect(seen).toEqual([1, 2, 0]);
  });

  it('subscribe only receives updates for the mutated user', () => {
    const uidA = freshUser();
    const uidB = freshUser();
    const seen: string[] = [];
    const unsub = subscribe((u) => seen.push(u));
    appendMessage(uidA, { sender: 'user', text: 'a' });
    unsub();
    expect(seen).toEqual([uidA]);
    expect(seen).not.toContain(uidB);
  });

  it('a listener that throws does not break other listeners or the append', () => {
    const uid = freshUser();
    const good = vi.fn();
    const unsub1 = subscribe(() => { throw new Error('boom'); });
    const unsub2 = subscribe((u) => { if (u === uid) good(); });
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = appendMessage(uid, { sender: 'user', text: 'ok' });
    expect(res).toHaveLength(1);
    expect(good).toHaveBeenCalled();
    unsub1();
    unsub2();
    err.mockRestore();
  });
});

describe('duskHistory — properties', () => {
  it('appending N unique messages yields N messages in insertion order (up to the cap)', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            sender: fc.constantFrom<'user' | 'dusk'>('user', 'dusk'),
            text: fc.string(),
          }),
          { minLength: 0, maxLength: 60 },
        ),
        (inputs) => {
          const uid = freshUser();
          localStorage.clear();
          let history: Message[] = [];
          inputs.forEach((m, i) => {
            history = appendMessage(uid, { id: `p_${uid}_${i}`, sender: m.sender, text: m.text });
          });
          const expectedLen = Math.min(inputs.length, MAX_HISTORY);
          expect(history).toHaveLength(expectedLen);
          // seq is strictly increasing → stable order regardless of timestamps.
          for (let i = 1; i < history.length; i++) {
            expect(history[i].seq).toBeGreaterThan(history[i - 1].seq);
          }
          // Text order matches insertion order for the retained tail.
          const retained = inputs.slice(inputs.length - expectedLen);
          expect(history.map(h => h.text)).toEqual(retained.map(r => r.text));
        },
      ),
      { numRuns: 50 },
    );
  });

  it('ordering is stable even when many messages share the same timestamp', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 40 }),
        (n) => {
          const uid = freshUser();
          localStorage.clear();
          const fixedTs = 1_000_000;
          let history: Message[] = [];
          for (let i = 0; i < n; i++) {
            history = appendMessage(uid, {
              id: `t_${uid}_${i}`,
              sender: 'user',
              text: `msg-${i}`,
              timestamp: fixedTs,
            });
          }
          // Despite identical timestamps, seq keeps them ordered by insertion.
          expect(history.map(h => h.text)).toEqual(
            Array.from({ length: n }, (_, i) => `msg-${i}`),
          );
        },
      ),
      { numRuns: 50 },
    );
  });

  it('persisted state round-trips through a fresh reload for a distinct user', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string(), { minLength: 1, maxLength: 20 }),
        (texts) => {
          const uid = freshUser();
          localStorage.clear();
          texts.forEach((t, i) =>
            appendMessage(uid, { id: `r_${uid}_${i}`, sender: 'dusk', text: t }),
          );
          const raw = localStorage.getItem(key(uid));
          expect(raw).not.toBeNull();
          const parsed = JSON.parse(raw as string) as Message[];
          expect(parsed.map(m => m.text)).toEqual(texts);
        },
      ),
      { numRuns: 50 },
    );
  });
});
