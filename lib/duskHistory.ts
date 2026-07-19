/**
 * Dusk chat history — single-writer store.
 *
 * This module is the ONLY place that writes the Dusk history localStorage key
 * (`dusk_chat_history_<userId||'local'>`). Previously both `components/DuskChat.tsx`
 * and `hooks/useSystem.ts` (`triggerDuskMessage`) independently read-modify-wrote
 * that key, which produced a lost-update race (messages clobbered each other) and
 * out-of-order appends on rapid messages.
 *
 * The store keeps an in-memory cache per user, assigns a module-level monotonic
 * `seq` to every message (so ordering is stable even within the same millisecond),
 * and notifies subscribers on every mutation. Consumers subscribe instead of
 * writing localStorage directly.
 *
 * Race refs: design.md Dusk C4 (history clobber) and C5 (out-of-order responses).
 */

export interface Message {
  id: string;
  sender: 'user' | 'dusk';
  text: string;
  timestamp: number;
  /** Module-level monotonic counter — guarantees stable ordering. */
  seq: number;
}

/** Keep at most the last N messages persisted/in-memory. */
export const MAX_HISTORY = 100;

/**
 * Module-level monotonically increasing counter. Because it lives at module
 * scope it is shared by every writer in the app, so two messages appended in the
 * same millisecond still receive distinct, ordered `seq` values.
 */
let seqCounter = 0;
function nextSeq(): number {
  return ++seqCounter;
}

/** In-memory cache keyed by the normalized userId. */
const cache = new Map<string, Message[]>();

export type HistoryListener = (userId: string, history: Message[]) => void;
const listeners = new Set<HistoryListener>();

function normalizeUserId(userId?: string | null): string {
  return userId || 'local';
}

function storageKey(userId?: string | null): string {
  return `dusk_chat_history_${normalizeUserId(userId)}`;
}

function persist(userId: string, msgs: Message[]): void {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(msgs));
  } catch {
    /* quota exceeded or private mode — cache still holds the value */
  }
}

function notify(userId: string, history: Message[]): void {
  for (const listener of listeners) {
    try {
      listener(userId, history);
    } catch (err) {
      console.error('[duskHistory] listener error', err);
    }
  }
}

/**
 * Normalize a raw (possibly legacy) parsed array into `Message[]`.
 * Legacy entries missing `seq` are assigned an increasing seq on load; the
 * module counter is first advanced past any existing seq so newly appended
 * messages always sort after loaded ones.
 */
function normalizeLoaded(parsed: unknown): Message[] {
  if (!Array.isArray(parsed)) return [];

  // Advance the counter past the highest existing seq so legacy/missing-seq
  // entries (and future appends) get values that sort after what's stored.
  for (const raw of parsed) {
    if (raw && typeof raw === 'object') {
      const s = (raw as { seq?: unknown }).seq;
      if (typeof s === 'number' && Number.isFinite(s) && s > seqCounter) {
        seqCounter = s;
      }
    }
  }

  const out: Message[] = [];
  for (const raw of parsed) {
    if (!raw || typeof raw !== 'object') continue;
    const m = raw as Record<string, unknown>;
    const hasSeq = typeof m.seq === 'number' && Number.isFinite(m.seq as number);
    const seq = hasSeq ? (m.seq as number) : nextSeq();
    out.push({
      id: m.id != null ? String(m.id) : `legacy_${seq}`,
      sender: m.sender === 'user' ? 'user' : 'dusk',
      text: typeof m.text === 'string' ? m.text : String(m.text ?? ''),
      timestamp: typeof m.timestamp === 'number' ? m.timestamp : Date.now(),
      seq,
    });
  }
  out.sort((a, b) => a.seq - b.seq);
  return out;
}

/**
 * Read + parse localStorage once and cache it in memory. Subsequent calls
 * return the cached array. Tolerates legacy entries missing `seq`.
 */
export function loadHistory(userId?: string | null): Message[] {
  const norm = normalizeUserId(userId);
  const cached = cache.get(norm);
  if (cached) return cached;

  let msgs: Message[] = [];
  try {
    const raw = localStorage.getItem(storageKey(norm));
    if (raw) msgs = normalizeLoaded(JSON.parse(raw));
  } catch {
    console.error('[duskHistory] Failed to load chat history');
    msgs = [];
  }
  cache.set(norm, msgs);
  return msgs;
}

/**
 * Append a single message. Assigns `id`/`timestamp`/`seq` if missing, dedupes
 * by `id`, sorts by `seq` ascending, caps to the last MAX_HISTORY, persists,
 * and notifies subscribers. Returns the new array.
 */
export function appendMessage(
  userId: string | null | undefined,
  partial: { id?: string; sender: 'user' | 'dusk'; text: string; timestamp?: number },
): Message[] {
  const norm = normalizeUserId(userId);
  const current = loadHistory(norm);

  const seq = nextSeq();
  const timestamp = partial.timestamp ?? Date.now();
  const msg: Message = {
    id: partial.id ?? `${timestamp}_${seq}`,
    sender: partial.sender,
    text: partial.text,
    timestamp,
    seq,
  };

  // Dedupe by id — if this id is already present, do not append again.
  if (current.some(m => m.id === msg.id)) {
    return current;
  }

  const next = [...current, msg]
    .sort((a, b) => a.seq - b.seq)
    .slice(-MAX_HISTORY);

  cache.set(norm, next);
  persist(norm, next);
  notify(norm, next);
  return next;
}

/**
 * Replace the entire history for a user. Missing `seq` values are assigned,
 * the array is sorted + capped, then persisted and broadcast to subscribers.
 */
export function setHistory(userId: string | null | undefined, msgs: Message[]): Message[] {
  const norm = normalizeUserId(userId);
  const normalized = msgs.map(m => {
    const seq = typeof m.seq === 'number' && Number.isFinite(m.seq) ? m.seq : nextSeq();
    if (seq > seqCounter) seqCounter = seq;
    return {
      id: m.id,
      sender: m.sender === 'user' ? 'user' : 'dusk',
      text: m.text,
      timestamp: typeof m.timestamp === 'number' ? m.timestamp : Date.now(),
      seq,
    } as Message;
  });
  normalized.sort((a, b) => a.seq - b.seq);
  const capped = normalized.slice(-MAX_HISTORY);

  cache.set(norm, capped);
  persist(norm, capped);
  notify(norm, capped);
  return capped;
}

/**
 * Clear history for a user: remove the localStorage key, drop the cache entry,
 * and notify subscribers with an empty array.
 */
export function clearHistory(userId: string | null | undefined): void {
  const norm = normalizeUserId(userId);
  try {
    localStorage.removeItem(storageKey(norm));
  } catch {
    /* ignore */
  }
  cache.delete(norm);
  notify(norm, []);
}

/**
 * Register a listener that fires on every history mutation. Returns an
 * unsubscribe function.
 */
export function subscribe(listener: HistoryListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
