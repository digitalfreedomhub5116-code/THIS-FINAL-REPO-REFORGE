import { useState, useEffect, useCallback, useRef } from 'react';
import { ShadowSoldier, KillFeedEntry, WarfareState } from '../types';

const STORAGE_KEY = 'shadow_warfare_v3_';
const MAX_SHADOWS = 3;
const OVERTAKE_WINDOW_MS = 10 * 60 * 1000; // 10 minutes extraction window
const POWER_SURGE_DURATION_MS = 5 * 60 * 1000;
const MAX_KILL_FEED = 30;

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

const DEFAULT_STATE: WarfareState = {
  shadows: [],
  overtakeTracker: {},
  activeDebuffs: [],
  killFeed: [],
  powerSurgeActive: false,
  powerSurgeExpiresAt: 0,
};

const LAST_RESET_KEY = 'shadow_warfare_last_reset_';

function loadState(userId: string): WarfareState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY + userId);
    if (!saved) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(saved) as WarfareState;

    const today = todayStr();
    const lastReset = localStorage.getItem(LAST_RESET_KEY + userId) || '';
    if (lastReset !== today) {
      parsed.shadows = [];
      parsed.overtakeTracker = {};
      localStorage.setItem(LAST_RESET_KEY + userId, today);
    }

    parsed.activeDebuffs = (parsed.activeDebuffs || []).filter(d => d.expiresAt > Date.now());

    if (parsed.powerSurgeExpiresAt && parsed.powerSurgeExpiresAt <= Date.now()) {
      parsed.powerSurgeActive = false;
      parsed.powerSurgeExpiresAt = 0;
    }

    // Clean expired overtake entries
    const now = Date.now();
    const tracker = parsed.overtakeTracker || {};
    for (const key of Object.keys(tracker)) {
      if (now - tracker[key] > OVERTAKE_WINDOW_MS) {
        delete tracker[key];
      }
    }
    parsed.overtakeTracker = tracker;

    return parsed;
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function saveState(userId: string, state: WarfareState) {
  try {
    localStorage.setItem(STORAGE_KEY + userId, JSON.stringify(state));
  } catch { /* ignore */ }
}

// ── Bot name pool for kill feed ──
const BOT_ACTIONS = [
  (n1: string, n2: string) => `⚡ ${n1} overtook ${n2} in daily XP!`,
  (n1: string, n2: string) => `💀 ${n1} extracted SHADOW of ${n2}`,
  (n1: string) => `🔥 ${n1} is climbing the daily ranks!`,
  (n1: string, n2: string) => `📜 ${n1} used Shadow Scroll on ${n2}`,
  (n1: string) => `👑 ${n1} reached the top 3!`,
];

const BOT_NAMES_POOL = [
  'Arjun', 'Reyansh', 'Vihaan', 'Aditya', 'Ishaan', 'Shaurya', 'Aarav',
  'Kabir', 'Riyan', 'Vivaan', 'Anaya', 'Saanvi', 'Aadya', 'Kiara', 'Diya',
];

function generateBotKillFeedEntry(): KillFeedEntry {
  const n1 = BOT_NAMES_POOL[Math.floor(Math.random() * BOT_NAMES_POOL.length)];
  let n2 = n1;
  while (n2 === n1) n2 = BOT_NAMES_POOL[Math.floor(Math.random() * BOT_NAMES_POOL.length)];
  const template = BOT_ACTIONS[Math.floor(Math.random() * BOT_ACTIONS.length)];
  return {
    id: generateId(),
    type: 'EXTRACTION',
    text: template(n1, n2),
    timestamp: Date.now(),
    highlight: false,
  };
}

export function useWarfare(userId: string) {
  const [state, setState] = useState<WarfareState>(() => loadState(userId));
  const surgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const botFeedRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Track the PREVIOUS snapshot of who was above/below me
  // Key = username, Value = their daily_xp at last check
  const prevStandingsRef = useRef<Record<string, number> | null>(null);

  useEffect(() => { saveState(userId, state); }, [userId, state]);
  useEffect(() => { setState(loadState(userId)); }, [userId]);

  // Daily reset check
  useEffect(() => {
    const interval = setInterval(() => {
      const today = todayStr();
      const lastReset = localStorage.getItem(LAST_RESET_KEY + userId) || '';
      if (lastReset !== today) {
        localStorage.setItem(LAST_RESET_KEY + userId, today);
        prevStandingsRef.current = null; // Reset snapshot too
        setState(prev => ({ ...prev, shadows: [], overtakeTracker: {} }));
      }
    }, 30_000);
    return () => clearInterval(interval);
  }, [userId]);

  // Bot kill feed
  useEffect(() => {
    const addBotEntry = () => {
      setState(prev => {
        const entry = generateBotKillFeedEntry();
        const feed = [entry, ...prev.killFeed].slice(0, MAX_KILL_FEED);
        return { ...prev, killFeed: feed };
      });
    };
    addBotEntry();
    botFeedRef.current = setInterval(addBotEntry, 15_000 + Math.random() * 15_000);
    return () => { if (botFeedRef.current) clearInterval(botFeedRef.current); };
  }, []);

  // Power surge
  useEffect(() => {
    const delay = (2 + Math.random() * 8) * 60_000;
    const timer = setTimeout(() => {
      setState(prev => {
        if (prev.powerSurgeActive) return prev;
        const entry: KillFeedEntry = {
          id: generateId(),
          type: 'POWER_SURGE',
          text: '⚡ POWER SURGE — Extraction rates DOUBLED for 5 min!',
          timestamp: Date.now(),
          highlight: true,
        };
        return {
          ...prev,
          powerSurgeActive: true,
          powerSurgeExpiresAt: Date.now() + POWER_SURGE_DURATION_MS,
          killFeed: [entry, ...prev.killFeed].slice(0, MAX_KILL_FEED),
        };
      });
      surgeTimerRef.current = setTimeout(() => {
        setState(prev => ({ ...prev, powerSurgeActive: false, powerSurgeExpiresAt: 0 }));
      }, POWER_SURGE_DURATION_MS);
    }, delay);
    return () => { clearTimeout(timer); if (surgeTimerRef.current) clearTimeout(surgeTimerRef.current); };
  }, []);

  // ── OVERTAKE DETECTION ──
  // Compares current standings against the PREVIOUS snapshot.
  // Only detects players who were ABOVE you (or equal) last time and are now BELOW you.
  // Returns list of freshly-overtaken players (extraction window open).
  const detectOvertakes = useCallback((
    myDailyXp: number,
    myUsername: string,
    currentEntries: { username: string; daily_xp: number }[],
  ): { extractable: string[]; overtakenNow: string[] } => {
    const now = Date.now();
    const newlyOvertaken: string[] = [];

    // Build current standings map (excluding self)
    const currentMap: Record<string, number> = {};
    for (const e of currentEntries) {
      if (e.username === myUsername) continue;
      currentMap[e.username] = e.daily_xp;
    }

    // First call ever = just snapshot, don't mark anyone as overtaken
    if (prevStandingsRef.current === null) {
      prevStandingsRef.current = { ...currentMap };
      // But still check existing tracker entries for extractability
      const extractable: string[] = [];
      setState(prev => {
        const tracker = { ...prev.overtakeTracker };
        for (const [key, ts] of Object.entries(tracker)) {
          const elapsed = now - ts;
          if (elapsed <= OVERTAKE_WINDOW_MS && myDailyXp > (currentMap[key] ?? Infinity)) {
            extractable.push(key);
          } else if (elapsed > OVERTAKE_WINDOW_MS) {
            delete tracker[key];
          }
        }
        if (JSON.stringify(tracker) !== JSON.stringify(prev.overtakeTracker)) {
          return { ...prev, overtakeTracker: tracker };
        }
        return prev;
      });
      return { extractable, overtakenNow: [] };
    }

    const prevMap = prevStandingsRef.current;

    setState(prev => {
      const tracker = { ...prev.overtakeTracker };

      for (const [username, currentXp] of Object.entries(currentMap)) {
        const prevXp = prevMap[username];

        // Player was ABOVE or EQUAL to me before, but now I'm above them = FRESH OVERTAKE
        if (prevXp !== undefined && prevXp >= myDailyXp && myDailyXp > currentXp) {
          // Wait, that's wrong - we need to check if they WERE above or equal to my PREVIOUS xp
          // Actually the correct logic: they were ahead of me OR didn't exist in my tracker yet
          // AND now my xp > their xp → that's an overtake
        }

        // Simpler logic: if I'm above them now AND I wasn't above them before
        const wasAboveThem = prevMap[username] !== undefined && (prevMap[username] < (prevStandingsRef.current?.['__myXp'] ?? 0));
        const isAboveThemNow = myDailyXp > currentXp;

        if (isAboveThemNow && !wasAboveThem && !tracker[username]) {
          // FRESH OVERTAKE
          tracker[username] = now;
          newlyOvertaken.push(username);
        }

        // If I'm no longer above them, remove from tracker
        if (!isAboveThemNow) {
          delete tracker[username];
        }
      }

      // Clean expired
      for (const key of Object.keys(tracker)) {
        if (now - tracker[key] > OVERTAKE_WINDOW_MS) {
          delete tracker[key];
        }
      }

      if (JSON.stringify(tracker) !== JSON.stringify(prev.overtakeTracker)) {
        return { ...prev, overtakeTracker: tracker };
      }
      return prev;
    });

    // Update snapshot for next comparison
    prevStandingsRef.current = { ...currentMap, __myXp: myDailyXp } as any;

    // Build extractable list from current tracker
    const extractable: string[] = [];
    const tracker = state.overtakeTracker;
    for (const [key, ts] of Object.entries(tracker)) {
      if (now - ts <= OVERTAKE_WINDOW_MS && myDailyXp > (currentMap[key] ?? Infinity)) {
        extractable.push(key);
      }
    }
    // Also add newly overtaken ones
    for (const n of newlyOvertaken) {
      if (!extractable.includes(n)) extractable.push(n);
    }

    return { extractable, overtakenNow: newlyOvertaken };
  }, [state.overtakeTracker]);

  const isExtractable = useCallback((targetUsername: string): boolean => {
    const ts = state.overtakeTracker[targetUsername];
    if (!ts) return false;
    return (Date.now() - ts) <= OVERTAKE_WINDOW_MS;
  }, [state.overtakeTracker]);

  const getExtractionWindowRemaining = useCallback((targetUsername: string): number => {
    const ts = state.overtakeTracker[targetUsername];
    if (!ts) return 0;
    const remaining = OVERTAKE_WINDOW_MS - (Date.now() - ts);
    return remaining > 0 ? remaining : 0;
  }, [state.overtakeTracker]);

  const canExtract = state.shadows.length < MAX_SHADOWS;

  // ── EXTRACTION ──
  const attemptExtraction = useCallback((
    targetName: string,
    targetRank: number,
    outfitExtractionRate: number,
  ): { success: boolean; shadow?: ShadowSoldier } => {
    if (state.shadows.length >= MAX_SHADOWS) return { success: false };

    const effectiveRate = state.powerSurgeActive
      ? Math.min(100, outfitExtractionRate * 2)
      : outfitExtractionRate;

    const roll = Math.random() * 100;
    const success = roll < effectiveRate;

    if (success) {
      const shadow: ShadowSoldier = {
        id: generateId(),
        name: `Shadow of ${targetName}`,
        extractedAt: Date.now(),
        sourceRank: targetRank,
      };

      const entry: KillFeedEntry = {
        id: generateId(),
        type: 'EXTRACTION',
        text: `💀 YOU extracted SHADOW of ${targetName} — Army: ${state.shadows.length + 1}/${MAX_SHADOWS}`,
        timestamp: Date.now(),
        highlight: true,
      };

      setState(prev => ({
        ...prev,
        shadows: [...prev.shadows, shadow],
        killFeed: [entry, ...prev.killFeed].slice(0, MAX_KILL_FEED),
        overtakeTracker: Object.fromEntries(
          Object.entries(prev.overtakeTracker).filter(([k]) => k !== targetName)
        ),
      }));

      return { success: true, shadow };
    } else {
      const entry: KillFeedEntry = {
        id: generateId(),
        type: 'EXTRACTION_FAIL',
        text: `🔥 Shadow Scroll BURNED — ${targetName} resisted extraction`,
        timestamp: Date.now(),
        highlight: true,
      };

      setState(prev => ({
        ...prev,
        killFeed: [entry, ...prev.killFeed].slice(0, MAX_KILL_FEED),
      }));

      return { success: false };
    }
  }, [state.powerSurgeActive, state.shadows.length]);

  const guaranteedExtraction = useCallback((targetName: string, targetRank: number): ShadowSoldier | null => {
    if (state.shadows.length >= MAX_SHADOWS) return null;

    const shadow: ShadowSoldier = {
      id: generateId(),
      name: `Shadow of ${targetName}`,
      extractedAt: Date.now(),
      sourceRank: targetRank,
    };

    const entry: KillFeedEntry = {
      id: generateId(),
      type: 'EXTRACTION',
      text: `👑 ULT ORB — ${targetName}'s shadow GUARANTEED!`,
      timestamp: Date.now(),
      highlight: true,
    };

    setState(prev => ({
      ...prev,
      shadows: [...prev.shadows, shadow],
      killFeed: [entry, ...prev.killFeed].slice(0, MAX_KILL_FEED),
      overtakeTracker: Object.fromEntries(
        Object.entries(prev.overtakeTracker).filter(([k]) => k !== targetName)
      ),
    }));

    return shadow;
  }, [state.shadows.length]);

  const castDebuff = useCallback((targetId: string, targetName: string) => {
    const entry: KillFeedEntry = {
      id: generateId(),
      type: 'EXTRACTION',
      text: `📜 Shadow Exchange on ${targetName} — -15% Dominance`,
      timestamp: Date.now(),
      highlight: true,
    };
    setState(prev => ({
      ...prev,
      activeDebuffs: [
        ...prev.activeDebuffs.filter(d => d.id !== targetId && d.expiresAt > Date.now()),
        { id: targetId, expiresAt: Date.now() + 12 * 60 * 60 * 1000 },
      ],
      killFeed: [entry, ...prev.killFeed].slice(0, MAX_KILL_FEED),
    }));
  }, []);

  const activeDebuffs = state.activeDebuffs.filter(d => d.expiresAt > Date.now());
  const armyBuff = state.shadows.length * 2;

  return {
    shadows: state.shadows,
    maxShadows: MAX_SHADOWS,
    overtakeTracker: state.overtakeTracker,
    killFeed: state.killFeed,
    activeDebuffs,
    armyBuff,
    powerSurgeActive: state.powerSurgeActive,
    powerSurgeExpiresAt: state.powerSurgeExpiresAt,
    canExtract,

    detectOvertakes,
    isExtractable,
    getExtractionWindowRemaining,
    attemptExtraction,
    guaranteedExtraction,
    castDebuff,
  };
}
