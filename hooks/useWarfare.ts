import { useState, useEffect, useCallback, useRef } from 'react';
import { ShadowSoldier, ClashResult, KillFeedEntry, WarfareState } from '../types';

const STORAGE_KEY = 'shadow_warfare_v2_';
const MAX_CHARGES = 3;
const SHIELD_DURATION_MS = 12 * 60 * 60 * 1000; // 12 hours
const POWER_SURGE_DURATION_MS = 5 * 60 * 1000;  // 5 minutes
const MAX_KILL_FEED = 30;
const MAX_CLASH_HISTORY = 20;

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

const DEFAULT_STATE: WarfareState = {
  shadows: [],
  attackCharges: MAX_CHARGES,
  maxCharges: MAX_CHARGES,
  lastChargeReset: todayStr(),
  clashHistory: [],
  winStreak: 0,
  lastBotRaid: 0,
  activeDebuffs: [],
  killFeed: [],
  powerSurgeActive: false,
  powerSurgeExpiresAt: 0,
  lastMonarchRewardDate: '',
};

function loadState(userId: string): WarfareState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY + userId);
    if (!saved) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(saved) as WarfareState;

    // Daily reset check
    const today = todayStr();
    if (parsed.lastChargeReset !== today) {
      parsed.attackCharges = MAX_CHARGES;
      parsed.lastChargeReset = today;
      parsed.shadows = []; // Shadows reset at midnight
      parsed.winStreak = 0;
      parsed.clashHistory = [];
    }

    // Clean expired debuffs
    parsed.activeDebuffs = (parsed.activeDebuffs || []).filter(d => d.expiresAt > Date.now());

    // Clean expired power surge
    if (parsed.powerSurgeExpiresAt && parsed.powerSurgeExpiresAt <= Date.now()) {
      parsed.powerSurgeActive = false;
      parsed.powerSurgeExpiresAt = 0;
    }

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
  (n1: string, n2: string) => `⚔️ ${n1} clashed ${n2} — VICTORY`,
  (n1: string) => `🛡️ ${n1} activated FORTIFY`,
  (n1: string, n2: string) => `💀 ${n1} extracted SHADOW of ${n2}`,
  (n1: string, n2: string) => `📜 ${n1} burned a Shadow Scroll on ${n2}`,
  (n1: string) => `🔥 ${n1} is on a 3-WIN STREAK`,
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
    type: 'CLASH_WIN',
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
      setState(prev => {
        if (prev.lastChargeReset !== today) {
          return {
            ...prev,
            attackCharges: MAX_CHARGES,
            lastChargeReset: today,
            shadows: [],
            winStreak: 0,
            clashHistory: [],
          };
        }
        return prev;
      });
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  // ── Simulated bot kill feed (every 15-30s) ──
  useEffect(() => {
    const addBotEntry = () => {
      setState(prev => {
        const entry = generateBotKillFeedEntry();
        const feed = [entry, ...prev.killFeed].slice(0, MAX_KILL_FEED);
        return { ...prev, killFeed: feed };
      });
    };
    // Initial batch
    addBotEntry();
    botFeedRef.current = setInterval(addBotEntry, 15_000 + Math.random() * 15_000);
    return () => { if (botFeedRef.current) clearInterval(botFeedRef.current); };
  }, []);

  // ── Random Power Surge trigger (once per session, random 2-10 min after mount) ──
  useEffect(() => {
    const delay = (2 + Math.random() * 8) * 60_000; // 2-10 minutes
    const timer = setTimeout(() => {
      setState(prev => {
        if (prev.powerSurgeActive) return prev; // Already active
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
      // Auto-expire surge
      surgeTimerRef.current = setTimeout(() => {
        setState(prev => ({ ...prev, powerSurgeActive: false, powerSurgeExpiresAt: 0 }));
      }, POWER_SURGE_DURATION_MS);
    }, delay);
    return () => { clearTimeout(timer); if (surgeTimerRef.current) clearTimeout(surgeTimerRef.current); };
  }, []);

  // ── CLASH ──
  const initiateClash = useCallback((
    targetName: string,
    targetRank: number,
    myTotalXp: number,
    myDailyXp: number,
    outfitAttack: number,
    targetXp: number,
    myCurrentRank: number,
  ): ClashResult | null => {
    // Check charges
    if (state.attackCharges <= 0) return null;

    // Calculate powers
    const armyBuff = 1 + (state.shadows.length * 0.02);
    const streakBonus = state.winStreak >= 3 ? 1.1 : 1;
    // Last Stand: +25% if about to drop from top 5
    const lastStandBonus = myCurrentRank >= 4 && myCurrentRank <= 6 ? 1.25 : 1;

    const attackerPower = Math.floor(
      (myTotalXp + myDailyXp + outfitAttack * 50) * armyBuff * streakBonus * lastStandBonus
    );

    // Defender gets random variance (±15%) 
    const isTargetShielded = false; // We only track our own shield locally
    const variance = 0.85 + Math.random() * 0.30; // 0.85 to 1.15
    const defenderPower = Math.floor(targetXp * variance);

    const won = attackerPower > defenderPower;
    const newRank = won ? targetRank : myCurrentRank;

    const result: ClashResult = {
      id: generateId(),
      targetName,
      targetRank,
      won,
      timestamp: Date.now(),
      attackerPower,
      defenderPower,
      myOldRank: myCurrentRank,
      myNewRank: newRank,
    };

    const killEntry: KillFeedEntry = {
      id: generateId(),
      type: won ? 'CLASH_WIN' : 'CLASH_LOSE',
      text: won
        ? `⚔️ YOU defeated ${targetName} and stole Rank #${targetRank}!`
        : `💔 YOU lost to ${targetName} — Rank #${myCurrentRank} held`,
      timestamp: Date.now(),
      highlight: true,
    };

    setState(prev => ({
      ...prev,
      attackCharges: prev.attackCharges - 1,
      winStreak: won ? prev.winStreak + 1 : 0,
      clashHistory: [result, ...prev.clashHistory].slice(0, MAX_CLASH_HISTORY),
      killFeed: [killEntry, ...prev.killFeed].slice(0, MAX_KILL_FEED),
    }));

    return result;
  }, [state.attackCharges, state.shadows.length, state.winStreak]);

  // ── EXTRACTION (Shadow Scroll — uses outfit extraction %) ──
  const attemptExtraction = useCallback((
    targetName: string,
    targetRank: number,
    outfitExtractionRate: number,
  ): { success: boolean; shadow?: ShadowSoldier } => {
    // Power surge doubles extraction rate
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
        text: `💀 YOU extracted SHADOW of ${targetName} — Army: ${state.shadows.length + 1}`,
        timestamp: Date.now(),
        highlight: true,
      };

      setState(prev => ({
        ...prev,
        shadows: [...prev.shadows, shadow],
        killFeed: [entry, ...prev.killFeed].slice(0, MAX_KILL_FEED),
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
  const guaranteedExtraction = useCallback((targetName: string, targetRank: number): ShadowSoldier => {
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
    }));

    return shadow;
  }, []);

  // ── USE HEALTH POTION (restore 2 charges) ──
  const useHealthPotion = useCallback((): boolean => {
    if (state.attackCharges >= MAX_CHARGES) return false;
    setState(prev => ({
      ...prev,
      attackCharges: Math.min(MAX_CHARGES, prev.attackCharges + 2),
    }));
    return true;
  }, [state.attackCharges]);

  // ── REMOVED ACTIVATE SHIELD (No longer fortifying via Shield) ──

  // ── CAST DEBUFF (Shadow Exchange) ──
  const castDebuff = useCallback((targetId: string, targetName: string) => {
    const entry: KillFeedEntry = {
      id: generateId(),
      type: 'CLASH_WIN',
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

  // ── CLAIM MONARCH REWARD (called when #1 at midnight check) ──
  const claimMonarchReward = useCallback((): boolean => {
    const today = todayStr();
    if (state.lastMonarchRewardDate === today) return false;
    setState(prev => ({ ...prev, lastMonarchRewardDate: today }));
    return true;
  }, [state.lastMonarchRewardDate]);

  // Computed getters
  const isShielded = false;
  const shieldRemainingMs = 0;
  const activeDebuffs = state.activeDebuffs.filter(d => d.expiresAt > Date.now());
  const armyBuff = state.shadows.length * 2; // +2% per shadow

  return {
    // State
    shadows: state.shadows,
    attackCharges: state.attackCharges,
    maxCharges: MAX_CHARGES,
    winStreak: state.winStreak,
    clashHistory: state.clashHistory,
    killFeed: state.killFeed,
    isShielded,
    shieldRemainingMs,
    activeDebuffs,
    armyBuff,
    powerSurgeActive: state.powerSurgeActive,
    powerSurgeExpiresAt: state.powerSurgeExpiresAt,

    // Actions
    initiateClash,
    attemptExtraction,
    guaranteedExtraction,
    useHealthPotion,
    castDebuff,
    claimMonarchReward,
  };
}
