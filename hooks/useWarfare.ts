import { useState, useEffect, useCallback, useRef } from 'react';
import { ShadowSoldier, KillFeedEntry, WarfareState } from '../types';

const STORAGE_KEY = 'shadow_warfare_v3_';
const MAX_SHADOWS = 3;
const OVERTAKE_WINDOW_MS = 10 * 60 * 1000; // 10 minutes extraction window
const POWER_SURGE_DURATION_MS = 5 * 60 * 1000;  // 5 minutes
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
  lastMonarchRewardDate: '',
};

// Track last daily reset date in localStorage to detect midnight rollover
const LAST_RESET_KEY = 'shadow_warfare_last_reset_';

function loadState(userId: string): WarfareState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY + userId);
    if (!saved) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(saved) as WarfareState;

    // Daily reset check — shadows + overtake tracker reset at midnight
    const today = todayStr();
    const lastReset = localStorage.getItem(LAST_RESET_KEY + userId) || '';
    if (lastReset !== today) {
      parsed.shadows = [];
      parsed.overtakeTracker = {};
      localStorage.setItem(LAST_RESET_KEY + userId, today);
    }

    // Clean expired debuffs
    parsed.activeDebuffs = (parsed.activeDebuffs || []).filter(d => d.expiresAt > Date.now());

    // Clean expired power surge
    if (parsed.powerSurgeExpiresAt && parsed.powerSurgeExpiresAt <= Date.now()) {
      parsed.powerSurgeActive = false;
      parsed.powerSurgeExpiresAt = 0;
    }

    // Clean expired overtake entries (older than 10 min)
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

// ── Bot name pool for kill feed simulation ──
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

  // Persist on every state change
  useEffect(() => {
    saveState(userId, state);
  }, [userId, state]);

  // Reload on user change
  useEffect(() => {
    setState(loadState(userId));
  }, [userId]);

  // ── Daily reset check (runs every 30s) ──
  useEffect(() => {
    const interval = setInterval(() => {
      const today = todayStr();
      const lastReset = localStorage.getItem(LAST_RESET_KEY + userId) || '';
      if (lastReset !== today) {
        localStorage.setItem(LAST_RESET_KEY + userId, today);
        setState(prev => ({
          ...prev,
          shadows: [],
          overtakeTracker: {},
        }));
      }
    }, 30_000);
    return () => clearInterval(interval);
  }, [userId]);

  // ── Simulated bot kill feed (every 15-30s) ──
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

  // ── Random Power Surge trigger (once per session, random 2-10 min after mount) ──
  useEffect(() => {
    const delay = (2 + Math.random() * 8) * 60_000;
    const timer = setTimeout(() => {
      setState(prev => {
        if (prev.powerSurgeActive) return prev;
        const entry: KillFeedEntry = {
          id: generateId(),
          type: 'POWER_SURGE',
          text: '⚡ POWER SURGE ACTIVE — Extraction rates DOUBLED for 5 minutes!',
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

  // ── OVERTAKE TRACKING ──
  // Call this with the current daily leaderboard to update who you've overtaken.
  // Returns a list of targets whose extraction window is currently open.
  const updateOvertakes = useCallback((
    myDailyXp: number,
    myUsername: string,
    leaderboardEntries: { username: string; daily_xp: number }[],
  ): string[] => {
    const now = Date.now();
    const extractableTargets: string[] = [];

    setState(prev => {
      const tracker = { ...prev.overtakeTracker };

      // For each player below me in daily XP
      for (const entry of leaderboardEntries) {
        if (entry.username === myUsername) continue;
        if (myDailyXp <= entry.daily_xp) {
          // I'm NOT ahead of this player — remove from tracker if they were there
          delete tracker[entry.username];
          continue;
        }

        // I AM ahead of this player
        if (!tracker[entry.username]) {
          // First time overtaking — start the 10-min window
          tracker[entry.username] = now;
        }

        // Check if within extraction window (10 min from overtake)
        const elapsed = now - tracker[entry.username];
        if (elapsed <= OVERTAKE_WINDOW_MS) {
          extractableTargets.push(entry.username);
        } else {
          // Window expired — remove from tracker
          delete tracker[entry.username];
        }
      }

      // Only update if tracker changed
      if (JSON.stringify(tracker) !== JSON.stringify(prev.overtakeTracker)) {
        return { ...prev, overtakeTracker: tracker };
      }
      return prev;
    });

    return extractableTargets;
  }, []);

  // ── Check if a specific target is extractable ──
  const isExtractable = useCallback((targetUsername: string): boolean => {
    const ts = state.overtakeTracker[targetUsername];
    if (!ts) return false;
    return (Date.now() - ts) <= OVERTAKE_WINDOW_MS;
  }, [state.overtakeTracker]);

  // ── Get remaining extraction window time (ms) ──
  const getExtractionWindowRemaining = useCallback((targetUsername: string): number => {
    const ts = state.overtakeTracker[targetUsername];
    if (!ts) return 0;
    const remaining = OVERTAKE_WINDOW_MS - (Date.now() - ts);
    return remaining > 0 ? remaining : 0;
  }, [state.overtakeTracker]);

  // ── Can extract? (must have <3 shadows) ──
  const canExtract = state.shadows.length < MAX_SHADOWS;

  // ── EXTRACTION (Shadow Scroll — uses outfit extraction %) ──
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
        // Remove from overtake tracker after extraction
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

  // ── GUARANTEED EXTRACTION (Ult Orb) ──
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
      text: `👑 ULT ORB used — ${targetName}'s shadow GUARANTEED extracted!`,
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

  // ── CAST DEBUFF (Shadow Exchange) ──
  const castDebuff = useCallback((targetId: string, targetName: string) => {
    const entry: KillFeedEntry = {
      id: generateId(),
      type: 'EXTRACTION',
      text: `📜 YOU cast Shadow Exchange on ${targetName} — -15% Dominance`,
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

  // ── CLAIM MONARCH REWARD ──
  const claimMonarchReward = useCallback((): boolean => {
    const today = todayStr();
    if (state.lastMonarchRewardDate === today) return false;
    setState(prev => ({ ...prev, lastMonarchRewardDate: today }));
    return true;
  }, [state.lastMonarchRewardDate]);

  // Computed getters
  const activeDebuffs = state.activeDebuffs.filter(d => d.expiresAt > Date.now());
  const armyBuff = state.shadows.length * 2; // +2% per shadow

  return {
    // State
    shadows: state.shadows,
    maxShadows: MAX_SHADOWS,
    overtakeTracker: state.overtakeTracker,
    killFeed: state.killFeed,
    activeDebuffs,
    armyBuff,
    powerSurgeActive: state.powerSurgeActive,
    powerSurgeExpiresAt: state.powerSurgeExpiresAt,
    canExtract,

    // Actions
    updateOvertakes,
    isExtractable,
    getExtractionWindowRemaining,
    attemptExtraction,
    guaranteedExtraction,
    castDebuff,
    claimMonarchReward,
  };
}
