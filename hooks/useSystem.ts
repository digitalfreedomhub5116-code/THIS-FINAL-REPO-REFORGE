import { useState, useEffect, useCallback, useRef } from 'react';
import {
  PlayerData, Quest, ShopItem, SystemNotification, NotificationType,
  ActivityLog, HealthProfile, ProgressPhoto, MealLog, WorkoutDay, AdminExercise, DailyReward,
  ReplitUser, HistoryEntry, Goal
} from '../types';
import { playSystemSoundEffect } from '../utils/soundEngine';
import { getPlayerAuthHeaders } from '../lib/playerApi';
import { clearAuthNative } from '../lib/nativeAuth';
import { REWARD_SCHEDULE } from '../lib/rewards';
import { API_BASE } from '../lib/apiConfig';
import { initEconomyForUser, clearEconomySession } from '../utils/storeEconomy';
import { fixVideoPath } from '../lib/exerciseVideos';
import { OUTFITS, getOutfitXpBoost, getStoneConfig, getUnlockedBadgeCount, BADGE_TIERS } from '../utils/gameData';
import { scheduleQuestDeadline, cancelDailyReminders } from './useLocalNotifications';
import { safeLevelUp, computeRank } from '../lib/levelSystem';
export { safeLevelUp, computeRank };

export const isEmbed = (url: string) => {
  return url.includes('youtube.com/embed') || url.includes('player.vimeo.com');
};

/** Check if a userId is a local/offline user (not synced to server). */
export const isLocalUser = (userId?: string): boolean => {
  if (!userId) return true;
  return userId.startsWith('local-') || userId.startsWith('local_') || userId === 'local';
};

/** Return YYYY-MM-DD in the user's LOCAL timezone (not UTC). */
const toLocalDateStr = (d: Date = new Date()): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const DEFAULT_PLAYER: PlayerData = {
  isConfigured: false,
  tutorialStep: 0,
  tutorialComplete: true,
  name: '',
  level: 1,
  currentXp: 0,
  requiredXp: 100,
  totalXp: 0,
  dailyXp: 0,
  rank: 'UNRANKED',
  gold: 0,
  keys: 0,
  streak: 0,
  stats: { strength: 10, intelligence: 10, discipline: 10, social: 10, focus: 10, willpower: 10 },
  dailyStats: { strength: 0, intelligence: 0, discipline: 0, social: 0, focus: 0, willpower: 0 },
  yesterdayStats: { strength: 0, intelligence: 0, discipline: 0, social: 0, focus: 0, willpower: 0 },
  weeklyStats: { strength: 0, intelligence: 0, discipline: 0, social: 0, focus: 0, willpower: 0 },
  monthlyStats: { strength: 0, intelligence: 0, discipline: 0, social: 0, focus: 0, willpower: 0 },
  lastStatUpdate: { strength: 0, intelligence: 0, discipline: 0, social: 0, focus: 0, willpower: 0 },
  lastDailyReset: Date.now(),
  lastWeeklyReset: Date.now(),
  lastMonthlyReset: Date.now(),
  history: [],
  hp: 100,
  maxHp: 100,
  mp: 100,
  maxMp: 100,
  fatigue: 0,
  job: 'Civilian',
  title: 'None',
  lastLoginDate: '',
  lastWorkoutDate: '',
  dailyQuestComplete: false,
  isPenaltyActive: false,

  logs: [],
  quests: [],
  shopItems: [],
  consumables: {},
  chests: { legendary: 0 },
  claimedStreakRewards: [],
  awakening: { vision: [], antiVision: [] },
  personalBests: {},
  nutritionLogs: [],
  exerciseDatabase: [],
  focusVideos: {},
  ownedOutfits: ['default'],
  activeOutfit: 'default',
  customProtocols: {},
  tournament: { pendingReward: null },
  username: '',
  country: 'United States',
  timezone: 'UTC',
  cheatStrikes: 0,
  totalStrikesEver: 0,
  isBanned: false,
  trustScore: 100,
  duskUnreadCount: 1,
  startDate: 0,
  equippedOutfitId: 'outfit_starter',
  unlockedOutfits: ['outfit_starter'],
  equippedShadows: [null, null, null] as (null)[],
  combatStats: { attack: 0, boost: 0, ultimate: 0, extraction: 0 },
  unlockedLooks: [],
  activeLookId: '',
  outfitStones: {},
  ownedBorders: ['border_default'],
  equippedBorder: null,
  featureUnlocksShown: [],
  rankRevealed: false,
  questOnboardingDone: true,
  workoutOnboardingDone: true,
  goals: [],
};

function migratePlayerData(raw: Partial<PlayerData>): PlayerData {
  const merged = { ...DEFAULT_PLAYER, ...raw };
  // Migrate old 5-stat shape to 4-stat shape
  // Base stats default to 10, but daily/weekly/monthly counters default to 0
  const migrateBaseStats = (s: Record<string, number> | undefined) => {
    if (!s) return { ...DEFAULT_PLAYER.stats };
    return {
      strength: s.strength ?? 10,
      intelligence: s.intelligence ?? 10,
      discipline: s.discipline ?? s.willpower ?? s.focus ?? 10,
      social: s.social ?? 10,
      focus: s.focus ?? 10,
      willpower: s.willpower ?? 10,
    };
  };
  const migrateCounterStats = (s: Record<string, number> | undefined) => {
    if (!s) return { strength: 0, intelligence: 0, discipline: 0, social: 0, focus: 0, willpower: 0 };
    return {
      strength: s.strength ?? 0,
      intelligence: s.intelligence ?? 0,
      discipline: s.discipline ?? s.willpower ?? s.focus ?? 0,
      social: s.social ?? 0,
      focus: s.focus ?? 0,
      willpower: s.willpower ?? 0,
    };
  };
  merged.stats = migrateBaseStats(raw.stats as Record<string, number> | undefined);
  merged.dailyStats = migrateCounterStats(raw.dailyStats as Record<string, number> | undefined);
  merged.yesterdayStats = migrateCounterStats(raw.yesterdayStats as Record<string, number> | undefined);
  merged.weeklyStats = migrateCounterStats(raw.weeklyStats as Record<string, number> | undefined);
  merged.monthlyStats = migrateCounterStats(raw.monthlyStats as Record<string, number> | undefined);
  merged.lastStatUpdate = migrateCounterStats(raw.lastStatUpdate as Record<string, number> | undefined);
  if (!merged.ownedOutfits) merged.ownedOutfits = ['default'];
  if (!merged.activeOutfit) merged.activeOutfit = 'default';
  if (!merged.unlockedOutfits) merged.unlockedOutfits = ['outfit_starter'];
  if (!merged.equippedOutfitId) merged.equippedOutfitId = 'outfit_starter';
  if (!merged.equippedShadows) merged.equippedShadows = [null, null, null];
  if (!merged.combatStats) merged.combatStats = { attack: 0, boost: 0, ultimate: 0, extraction: 0 };
  if (merged.cheatStrikes === undefined) merged.cheatStrikes = 0;
  if (merged.isBanned === undefined) merged.isBanned = false;
  if (merged.trustScore === undefined) merged.trustScore = 100;
  if (merged.duskUnreadCount === undefined) merged.duskUnreadCount = 1;
  if (!merged.startDate) merged.startDate = Date.now();
  if (!merged.unlockedLooks) merged.unlockedLooks = [];
  if (!merged.activeLookId) merged.activeLookId = '';
  if (!merged.consumables) merged.consumables = {};
  if (!merged.chests) merged.chests = { legendary: 0 };
  else if (merged.chests.legendary === undefined) merged.chests.legendary = 0;
  if (!merged.outfitStones) merged.outfitStones = {};
  if (!merged.ownedBorders) merged.ownedBorders = ['border_default'];
  if (merged.equippedBorder === undefined) merged.equippedBorder = null;
  merged.tutorialComplete = (raw as any)?.tutorialComplete ?? false;
  // Feature gate migration — existing configured users get everything unlocked
  if (raw.isConfigured && raw.rank !== 'UNRANKED') {
    if (merged.featureUnlocksShown === undefined) merged.featureUnlocksShown = [5, 10];
    if (merged.rankRevealed === undefined) merged.rankRevealed = true;
    if (merged.questOnboardingDone === undefined) merged.questOnboardingDone = true;
    if (merged.workoutOnboardingDone === undefined) merged.workoutOnboardingDone = true;
  } else {
    if (merged.featureUnlocksShown === undefined) merged.featureUnlocksShown = [];
    if (merged.rankRevealed === undefined) merged.rankRevealed = false;
    if (merged.questOnboardingDone === undefined) merged.questOnboardingDone = false;
    if (merged.workoutOnboardingDone === undefined) merged.workoutOnboardingDone = false;
  }
  return merged;
}

const getActiveUserScope = (): string => {
  try {
    const token = localStorage.getItem('reforge_player_token');
    if (!token) return 'local';
    const parts = token.split('.');
    if (parts.length === 3) {
      // Decode JWT payload (handling base64url encoding)
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join('')));
      return payload.sub || payload.userId || payload.supabase_id || payload.id || 'local';
    }
  } catch {}
  return 'local';
};

function loadFromStorage(): PlayerData {
  try {
    const scope = getActiveUserScope();
    // Scope economy to this user immediately on app load
    if (scope && scope !== 'local') {
      initEconomyForUser(scope);
    }
    const saved = localStorage.getItem(`reforge_player_v2_${scope}`);
    if (!saved) return DEFAULT_PLAYER;
    const parsed = JSON.parse(saved) as Partial<PlayerData>;
    return migratePlayerData(parsed);
  } catch {
    return DEFAULT_PLAYER;
  }
}

interface StoredNotification extends SystemNotification {
  timestamp: number;
}

const loadNotifHistory = (): StoredNotification[] => {
  try {
    const scope = getActiveUserScope();
    const raw = localStorage.getItem(`reforge_notif_history_${scope}`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

const loadUnread = (): boolean => {
  try { 
    const scope = getActiveUserScope();
    return localStorage.getItem(`reforge_notif_unread_${scope}`) === 'true'; 
  } catch { return false; }
};

// safeLevelUp & computeRank are imported from lib/levelSystem and re-exported above

const MAX_DAILY_WORKOUTS = 3;

// Badge XP Multiplier logic
function getBadgeXpMultiplier(outfitStones: Record<string, number>, equippedOutfitId: string): number {
  const stones = outfitStones[equippedOutfitId] || 0;
  return 1 + getOutfitXpBoost(stones); // e.g. 1.17 for max badges
}

export const useSystem = () => {
  const [player, setPlayer] = useState<PlayerData>(loadFromStorage);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [notificationHistory, setNotificationHistory] = useState<StoredNotification[]>(loadNotifHistory);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState<boolean>(loadUnread);
  const notificationTimers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const workoutCompletingRef = useRef(false);

  // ── SYNC GATE: Don't push local data to server until we've pulled server data first ──
  // This prevents stale localStorage from overwriting newer DB data on a second device.
  const serverPullDoneRef = useRef(false);

  // ── SUPABASE-FIRST: App shows loading screen until server data arrives ──
  // Falls back to localStorage after 5 seconds if Supabase is unreachable.
  const [dataReady, setDataReady] = useState(false);
  const dataReadyRef = useRef(false);

  const markDataReady = useCallback(() => {
    if (!dataReadyRef.current) {
      dataReadyRef.current = true;
      setDataReady(true);
    }
  }, []);

  // Fallback: if Supabase doesn't respond within 5s, use localStorage data
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!dataReadyRef.current) {
        console.warn('[System] Supabase fetch timed out after 5s — falling back to localStorage');
        markDataReady();
      }
    }, 5000);
    return () => clearTimeout(timeout);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Track server-authoritative gold for delta-based sync
  const serverGoldRef = useRef(player.gold);

  useEffect(() => {
    try { localStorage.setItem(`reforge_player_v2_${player.userId || 'local'}`, JSON.stringify(player)); } catch { /* quota exceeded or private mode */ }
  }, [player]);

  useEffect(() => {
    try { localStorage.setItem(`reforge_notif_history_${player.userId || 'local'}`, JSON.stringify(notificationHistory)); } catch { /* ignore */ }
  }, [notificationHistory, player.userId]);

  useEffect(() => {
    try { localStorage.setItem(`reforge_notif_unread_${player.userId || 'local'}`, hasUnreadNotifications ? 'true' : 'false'); } catch { /* ignore */ }
  }, [hasUnreadNotifications, player.userId]);

  useEffect(() => {
    return () => {
      notificationTimers.current.forEach(t => clearTimeout(t));
    };
  }, []);

  useEffect(() => {
    const fetchGlobalAssets = async () => {
      try {
        const [videosRes, protocolsRes] = await Promise.all([
          fetch(`${API_BASE}/api/videos`),
          fetch(`${API_BASE}/api/global-config/customProtocols`),
        ]);

        if (videosRes.ok) {
          const rawVideoMap = (await videosRes.json()) as Record<string, string>;
          // Fix stale DB paths: /videos/... → /assets/videos/...
          const videoMap: Record<string, string> = {};
          for (const [k, v] of Object.entries(rawVideoMap)) { videoMap[k] = fixVideoPath(v); }
          const exerciseDB: AdminExercise[] = Object.entries(videoMap).map(([key, url]) => ({
            id: key,
            name: key,
            videoUrl: url,
            imageUrl: '',
            muscleGroup: 'General',
            difficulty: 'Intermediate',
            caloriesBurn: 0
          }));
          setPlayer(prev => ({
            ...prev,
            focusVideos: { ...prev.focusVideos, ...videoMap },
            exerciseDatabase: exerciseDB
          }));
        }

        if (protocolsRes.ok) {
          const protocols = await protocolsRes.json() as Record<string, WorkoutDay[]>;
          if (protocols && Object.keys(protocols).length > 0) {
            setPlayer(prev => ({ ...prev, customProtocols: protocols }));
          }
        }
      } catch (err) {
        console.error('Global asset sync error', err);
      }
    };
    fetchGlobalAssets();
  }, []);

  // Expose a function that lets App.tsx update the server baseline refs
  // when it detects an admin change via polling. This prevents the sync
  // from computing a wrong delta and double-counting admin adjustments.
  const updateServerBaseline = useCallback((gold: number) => {
    serverGoldRef.current = gold;
  }, []);

  // Called by App.tsx after the first /sync poll completes.
  // Opens the gate so syncToCloud can start pushing local changes.
  const markServerPullDone = useCallback(() => {
    serverPullDoneRef.current = true;
  }, []);

  // Called by App.tsx to keep the updated_at ref in sync with the server
  const setServerUpdatedAt = useCallback((ts: string) => {
    serverUpdatedAtRef.current = ts;
  }, []);
  // Track the server's updated_at (kept for backward compat)
  const serverUpdatedAtRef = useRef<string | null>(null);

  // ── Integer-based optimistic concurrency (production-grade) ──
  // Replaces fragile timestamp comparison with deterministic integer version
  const syncVersionRef = useRef<number | null>(null);

  const setSyncVersion = useCallback((v: number) => {
    syncVersionRef.current = v;
  }, []);

  const syncToCloud = useCallback(async (data: PlayerData) => {
    if (!data.userId || isLocalUser(data.userId)) return;
    // SYNC GATE: Don't push to server until we've pulled at least once.
    // This prevents stale localStorage from overwriting newer DB values.
    if (!serverPullDoneRef.current) return;
    try {
      // Include last-known server gold + sync version so server can detect conflicts
      const syncData = {
        ...data,
        _serverGold: serverGoldRef.current,
        _lastKnownUpdatedAt: serverUpdatedAtRef.current,
        _syncVersion: syncVersionRef.current,
        consumables: data.consumables || {}
      };
      
      const res = await fetch(`${API_BASE}/api/player/${data.userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getPlayerAuthHeaders() },
        credentials: 'include',
        body: JSON.stringify(syncData)
      });

      if (res.status === 409) {
        // Conflict detected — another device updated the DB after us.
        // Update our refs from the server's response so the NEXT push won't also fail
        try {
          const conflictBody = await res.json();
          if (typeof conflictBody.serverSyncVersion === 'number') {
            syncVersionRef.current = conflictBody.serverSyncVersion;
          }
          if (conflictBody.serverUpdatedAt) {
            serverUpdatedAtRef.current = conflictBody.serverUpdatedAt;
          }
        } catch { /* ignore parse error */ }
        // Trigger an immediate re-fetch instead of pushing stale data.
        console.warn('[Sync] Conflict detected — triggering re-fetch from server');
        window.dispatchEvent(new CustomEvent('reforge:sync-needed'));
        return;
      }

      if (res.ok) {
        try {
          const result = await res.json();
          const sGold = result._serverGold as number | undefined;
          const sUpdatedAt = result._serverUpdatedAt as string | undefined;
          const sVersion = result._serverSyncVersion as number | undefined;
          // Update refs to what the server now has
          if (typeof sGold === 'number') serverGoldRef.current = sGold;
          if (sUpdatedAt) serverUpdatedAtRef.current = sUpdatedAt;
          if (typeof sVersion === 'number') syncVersionRef.current = sVersion;
          // If server values differ from what we sent (admin changed), update local state
          if (typeof sGold === 'number' && sGold !== data.gold) {
            setPlayer(prev => ({
              ...prev,
              gold: typeof sGold === 'number' ? sGold : prev.gold,
            }));
          }
        } catch { /* response parse error, non-critical */ }
      }
    } catch (e) {
      console.error('Cloud Sync Error', e);
    }
  }, []);

  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!player.userId || isLocalUser(player.userId)) return;
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      syncToCloud(player);
    }, 5000);
    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, [player, syncToCloud]);

  // ── Goal Quest Completion Listener ──
  // Goal quests live in goal.dailyTasks[].quests[] — a separate data structure
  // from player.quests[]. When GoalDetailView toggles a goal quest as completed,
  // it dispatches 'goal-quest:completed'. We listen here to award XP, stats, gold.
  useEffect(() => {
    const handleGoalQuestComplete = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;
      const { id, title, xp, category, rank, goalTitle } = detail;
      const xpReward = xp || 50;
      const RANK_GOLD: Record<string, number> = { E: 10, D: 20, C: 40, B: 80, A: 150, S: 300 };
      const goldReward = RANK_GOLD[rank] || 20;
      const primaryCat = (category || 'discipline') as keyof PlayerData['stats'];

      setPlayer(prev => {
        const stats = { ...prev.stats };
        const dailyStats = { ...prev.dailyStats };
        const weeklyStats = { ...prev.weeklyStats };
        const monthlyStats = { ...prev.monthlyStats };

        // Award +1 stat point (same logic as completeQuest)
        const STAT_DAILY_CAP = 5;
        const OVERFLOW_ORDER: (keyof typeof dailyStats)[] = ['discipline','focus','willpower','social','intelligence','strength'];
        if ((dailyStats[primaryCat] || 0) < STAT_DAILY_CAP) {
          stats[primaryCat] = (stats[primaryCat] || 0) + 1;
          dailyStats[primaryCat] = (dailyStats[primaryCat] || 0) + 1;
          weeklyStats[primaryCat] = (weeklyStats[primaryCat] || 0) + 1;
          monthlyStats[primaryCat] = (monthlyStats[primaryCat] || 0) + 1;
        } else {
          for (const overflowStat of OVERFLOW_ORDER) {
            if (overflowStat !== primaryCat && (dailyStats[overflowStat] || 0) < STAT_DAILY_CAP) {
              stats[overflowStat] = (stats[overflowStat] || 0) + 1;
              dailyStats[overflowStat] = (dailyStats[overflowStat] || 0) + 1;
              weeklyStats[overflowStat] = (weeklyStats[overflowStat] || 0) + 1;
              monthlyStats[overflowStat] = (monthlyStats[overflowStat] || 0) + 1;
              break;
            }
          }
        }

        // Award XP
        let { currentXp, requiredXp, level, totalXp, dailyXp } = prev;
        currentXp += xpReward;
        totalXp += xpReward;
        dailyXp += xpReward;

        // Level up check
        const lu = safeLevelUp(currentXp, requiredXp, level);
        currentXp = lu.currentXp; requiredXp = lu.requiredXp; level = lu.level;
        const leveledUp = lu.leveledUp;

        // Award gold
        const gold = prev.gold + goldReward;

        const logMsg = `Goal Quest Complete: ${title} (+${xpReward} XP, +${goldReward}G) [${goalTitle}]`;
        const newLogs = [createLog(logMsg, 'XP'), ...prev.logs];
        if (leveledUp) {
          newLogs.unshift(createLog(`LEVEL UP! REACHED LEVEL ${level}`, 'LEVEL_UP'));
          playSystemSoundEffect('LEVEL_UP');
          window.dispatchEvent(new CustomEvent('player:levelup', { detail: { level } }));
        } else {
          playSystemSoundEffect('SUCCESS');
        }

        // Dispatch quest:completed for leaderboard refresh etc.
        window.dispatchEvent(new CustomEvent('quest:completed', { detail: { id, title } }));
        // Trigger Dusk reaction
        triggerDuskMessage(`Goal Quest Completed: "${title}" (+${xpReward} XP)`);

        return {
          ...prev,
          stats, dailyStats, weeklyStats, monthlyStats,
          currentXp, requiredXp, level, rank: lu.rank, totalXp, dailyXp,
          gold, logs: newLogs,
          ...(leveledUp ? { hp: prev.maxHp, mp: prev.maxMp } : {}),
        };
      });
    };

    window.addEventListener('goal-quest:completed', handleGoalQuestComplete);
    return () => window.removeEventListener('goal-quest:completed', handleGoalQuestComplete);
  }, []);

  const addNotification = useCallback((message: string, type: NotificationType) => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, message, type }]);
    const timer = setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
      notificationTimers.current.delete(timer);
    }, 5000);
    notificationTimers.current.add(timer);
    setNotificationHistory(prev => [{ id, message, type, timestamp: Date.now() }, ...prev].slice(0, 50));
    setHasUnreadNotifications(true);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const markNotificationsRead = useCallback(() => {
    setHasUnreadNotifications(false);
  }, []);

  const clearNotificationHistory = useCallback(() => {
    setNotificationHistory([]);
    setHasUnreadNotifications(false);
  }, []);

  const createLog = (message: string, type: ActivityLog['type']): ActivityLog => ({
    id: Math.random().toString(36).substring(2, 9),
    message,
    timestamp: Date.now(),
    type
  });

  const processDailyReset = useCallback(() => {
    setPlayer(prev => {
      const now = Date.now();
      const todayStart = new Date().setHours(0, 0, 0, 0);

      // ── One-time cleanup: remove false "Missed Workout" WARNING logs from timezone bug ──
      if (!(prev as any)._missedWorkoutCleanupDone) {
        const cleanedLogs = prev.logs.filter(
          l => !(l.type === 'WARNING' && l.message.includes('Missed Workout'))
        );
        if (cleanedLogs.length !== prev.logs.length) {
          // Logs were cleaned — persist the fix even if daily reset isn't due yet
          if ((prev.lastDailyReset || 0) >= todayStart) {
            return { ...prev, logs: cleanedLogs, _missedWorkoutCleanupDone: true } as any;
          }
          // Otherwise fall through to the normal daily reset with cleaned logs
          prev = { ...prev, logs: cleanedLogs, _missedWorkoutCleanupDone: true } as any;
        } else {
          prev = { ...prev, _missedWorkoutCleanupDone: true } as any;
        }
      }

      if ((prev.lastDailyReset || 0) >= todayStart) return prev;

      // ── Snapshot yesterday's stats into history ──
      const yesterday = new Date(todayStart);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = toLocalDateStr(yesterday);
      const completedCount = prev.quests.filter(q => q.isCompleted).length;
      const historyEntry: HistoryEntry = {
        date: yesterdayStr,
        stats: { ...prev.stats },
        totalXp: prev.totalXp,
        dailyXp: prev.dailyXp,
        questCompletion: completedCount,
      };
      const existingIdx = (prev.history || []).findIndex(h => h.date === yesterdayStr);
      const updatedHistory = [...(prev.history || [])];
      if (existingIdx >= 0) {
        updatedHistory[existingIdx] = historyEntry;
      } else {
        updatedHistory.push(historyEntry);
      }
      // Keep last 90 days of history
      while (updatedHistory.length > 90) updatedHistory.shift();

      const newLogs: ActivityLog[] = [];
      const updatedQuests: Quest[] = [];

      for (const q of prev.quests) {
        if (q.isDaily) {
          updatedQuests.push({
            ...q,
            isCompleted: false,
            failed: false,
            completedAsMini: false,
            lastResetAt: now,
          });
        } else {
          if (!q.isCompleted && !q.failed) {
            newLogs.push({
              id: Math.random().toString(36).substring(2, 9),
              message: `Quest Expired: ${q.title}`,
              timestamp: now,
              type: 'PENALTY',
            });
          }
        }
      }

      // Keep nutrition logs for 7 days, delete older ones
      const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
      const retainedNutritionLogs = (prev.nutritionLogs || []).filter(log => log.timestamp >= sevenDaysAgo);

      // --- MISSED WORKOUT PENALTY: STAT REDUCTION ---
      const updatedStats = { ...prev.stats };
      let xpPenalty = 0;

      // Check if user has a workout plan and if yesterday was a missed workout day
      // Day 0 (signup day) = no penalty. Only penalize from day 1 onwards.
      const userStartDate = prev.startDate || now;
      const daysSinceStart = Math.floor((todayStart - new Date(userStartDate).setHours(0,0,0,0)) / (24*60*60*1000));

      if (daysSinceStart > 0 && prev.healthProfile?.workoutPlan) {
        const lastWorkout = prev.lastWorkoutDate || '';
        const yesterdayDate = new Date(todayStart);
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yesterdayStr2 = toLocalDateStr(yesterdayDate);

        if (lastWorkout !== yesterdayStr2) {
          const completedDays = (prev as any).workoutCompletedDays || 0;
          const plan = prev.healthProfile.workoutPlan;

          if (plan.length > 0) {
            const dayIndex = completedDays % plan.length;
            const scheduledDay = plan[dayIndex];
            if (scheduledDay && !scheduledDay.isRecovery) {
              // Missed a required workout — reduce stats directly
              updatedStats.discipline = Math.max(0, updatedStats.discipline - 10);
              updatedStats.willpower = Math.max(0, updatedStats.willpower - 10);
              updatedStats.strength = Math.max(0, updatedStats.strength - 5);
              newLogs.unshift({
                id: Math.random().toString(36).substring(2, 9),
                message: "STAT PENALTY: Missed Workout. Discipline -10, Willpower -10, Strength -5.",
                timestamp: now,
                type: 'WARNING'
              });
            }
          }
        }
      }

      // --- WEEKLY AUDIT: >2 SKIPS = EXTRA PENALTY ---
      // Increment weekly miss counter when a required workout was missed
      let weeklyMissed = ((prev as any).weeklyWorkoutMisses || 0);
      const missedRequiredWorkout = daysSinceStart > 0 && prev.healthProfile?.workoutPlan &&
        (() => {
          const lastWorkout2 = prev.lastWorkoutDate || '';
          const yd = new Date(todayStart); yd.setDate(yd.getDate() - 1);
          if (lastWorkout2 === toLocalDateStr(yd)) return false;
          const plan = prev.healthProfile!.workoutPlan!;
          if (!plan.length) return false;
          const idx = ((prev as any).workoutCompletedDays || 0) % plan.length;
          return plan[idx] && !plan[idx].isRecovery;
        })();
      if (missedRequiredWorkout) weeklyMissed++;

      // Check if a new week started (Sunday boundary)
      const weekStart = new Date(todayStart);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // This Sunday
      const weekStartMs = weekStart.getTime();
      const lastWeeklyAudit = (prev as any).lastWeeklyAuditMs || 0;
      const isNewWeek = weekStartMs > lastWeeklyAudit && daysSinceStart > 7;

      if (isNewWeek) {
        if (weeklyMissed > 2) {
          xpPenalty = 50;
          updatedStats.discipline = Math.max(0, updatedStats.discipline - 10);
          updatedStats.willpower = Math.max(0, updatedStats.willpower - 10);
          updatedStats.strength = Math.max(0, updatedStats.strength - 5);
          newLogs.unshift({
            id: Math.random().toString(36).substring(2, 9),
            message: `WEEKLY AUDIT FAILED: ${weeklyMissed} workouts missed (max 2). XP -${xpPenalty}, Discipline -10, Willpower -10, Strength -5.`,
            timestamp: now,
            type: 'WARNING'
          });
        }
        weeklyMissed = 0; // Reset counter for the new week
      }

      // --- NUTRITION AUDIT: EXCEEDED CALORIES/MACROS ---
      const yesterdayNutritionStart = todayStart - (24*60*60*1000);
      const yesterdayLogs = retainedNutritionLogs.filter(l => l.timestamp >= yesterdayNutritionStart && l.timestamp < todayStart);
      if (yesterdayLogs.length > 0 && prev.healthProfile && prev.healthProfile.macros) {
        const macros = prev.healthProfile.macros;
        const totalCals = yesterdayLogs.reduce((s, l) => s + (l.totalCalories || 0), 0);
        const totalProtein = yesterdayLogs.reduce((s, l) => s + (l.totalProtein || 0), 0);
        const totalCarbs = yesterdayLogs.reduce((s, l) => s + (l.totalCarbs || 0), 0);
        const totalFats = yesterdayLogs.reduce((s, l) => s + (l.totalFats || 0), 0);

        if (totalCals > (macros.calories || 0) * 1.1 && (macros.calories || 0) > 0) {
          // Exceeded calorie target by >10%
          updatedStats.discipline = Math.max(0, updatedStats.discipline - 5);
          newLogs.unshift({
            id: Math.random().toString(36).substring(2, 9),
            message: `NUTRITION PENALTY: Exceeded calorie target (${totalCals}/${macros.calories} kcal). Discipline -5.`,
            timestamp: now,
            type: 'WARNING'
          });
        } else {
          // Check individual macro overages
          let macroExceeded = false;
          if ((macros.protein || 0) > 0 && totalProtein > (macros.protein || 0) * 1.15) macroExceeded = true;
          if ((macros.carbs || 0) > 0 && totalCarbs > (macros.carbs || 0) * 1.15) macroExceeded = true;
          if ((macros.fats || 0) > 0 && totalFats > (macros.fats || 0) * 1.15) macroExceeded = true;
          if (macroExceeded) {
            updatedStats.discipline = Math.max(0, updatedStats.discipline - 2);
            newLogs.unshift({
              id: Math.random().toString(36).substring(2, 9),
              message: "NUTRITION PENALTY: Exceeded macro targets. Discipline -2.",
              timestamp: now,
              type: 'WARNING'
            });
          }
        }
      }

      return {
        ...prev,
        quests: updatedQuests,
        nutritionLogs: retainedNutritionLogs,
        lastDailyReset: now,
        yesterdayStats: { ...prev.dailyStats },
        dailyStats: { strength: 0, intelligence: 0, discipline: 0, social: 0, focus: 0, willpower: 0 },
        dailyXp: 0,  // ← Reset daily XP to 0 at midnight
        mp: prev.maxMp ?? 100,  // ← Reset mana to full at midnight
        totalXp: Math.max(0, prev.totalXp - xpPenalty),
        stats: updatedStats,
        history: updatedHistory,
        logs: [...newLogs, ...prev.logs].slice(0, 60),
        weeklyWorkoutMisses: weeklyMissed,
        lastWeeklyAuditMs: isNewWeek ? weekStartMs : lastWeeklyAudit,
      } as any;
    });
  }, []);

  useEffect(() => {
    // Don't run daily reset until server data has arrived (or 5s fallback).
    // Otherwise, stale localStorage dailyXp/quests get snapshotted into history,
    // and dailyXp gets wiped to 0 before the real value arrives from Supabase.
    if (!dataReady) return;

    processDailyReset();
    const scheduleNextReset = () => {
      const next = new Date();
      next.setDate(next.getDate() + 1);
      next.setHours(0, 1, 0, 0);
      const ms = next.getTime() - Date.now();
      return setTimeout(() => {
        processDailyReset();
        const t = scheduleNextReset();
        return t;
      }, ms);
    };
    const timer = scheduleNextReset();
    return () => clearTimeout(timer);
  }, [processDailyReset, dataReady]);

  // ── STREAK TRACKING ──
  // Streak is now computed SERVER-SIDE in the /sync endpoint (player_supabase.ts).
  // The server reads last_login_date, computes the new streak, updates Supabase
  // atomically, and returns the authoritative value. This eliminates all race
  // conditions between localStorage and Supabase, and ensures inactive players
  // get their streaks broken even if they never open the app (via leaderboard decay).

  const registerUser = (profile: { id?: string; name?: string; username?: string; raw_data?: Partial<PlayerData>; replitUser?: ReplitUser }) => {
    setPlayer(prev => {
      const cloudData = (profile.raw_data || {}) as Partial<PlayerData>;


      let currentQuests = (cloudData.quests ?? prev.quests) || [];
      if (!profile.raw_data && currentQuests.length === 0) {
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        currentQuests = [
          {
            id: `init_q1_${now}`,
            title: 'Get Strength to Change Yourself',
            description: 'Every transformation begins with a single decision. Choose strength — prove it with action.',
            rank: 'E',
            priority: 'HIGH',
            category: 'strength',
            xpReward: 20,
            isCompleted: false,
            createdAt: now,
            expiresAt: now + oneDay * 7,
            isDaily: false,
            miniQuest: 'Claim your strength'
          },
          {
            id: `init_q2_${now}`,
            title: 'Take the 1st Step to Change',
            description: 'Discipline is built one step at a time. Show up. Begin.',
            rank: 'D',
            priority: 'HIGH',
            category: 'discipline',
            xpReward: 35,
            isCompleted: false,
            createdAt: now,
            expiresAt: now + oneDay * 7,
            isDaily: false,
            miniQuest: 'Take the first step'
          },
          {
            id: `init_q3_${now}`,
            title: 'Register One Quest',
            description: 'You have already forged your first quest. That makes you a Hunter. Own it.',
            rank: 'C',
            priority: 'MEDIUM',
            category: 'social',
            xpReward: 50,
            isCompleted: false,
            createdAt: now,
            expiresAt: now + oneDay * 7,
            isDaily: false,
            miniQuest: 'Complete your first quest'
          }
        ];
      }

      const currentGold = cloudData.gold ?? prev.gold;

      // ── Detect user switch to prevent cross-account data contamination ──
      const incomingUserId = (profile.id as string) || '';
      const isUserSwitch = !!(prev.userId && incomingUserId && prev.userId !== incomingUserId);

      // ── Scope economy (banners/borders/themes) to this user ──
      if (incomingUserId) {
        initEconomyForUser(incomingUserId);
      }

      // ── Union helper: merge unlockedOutfits (additive — never lose a purchase) ──
      const mergedUnlockedOutfits: string[] = isUserSwitch
        ? (cloudData.unlockedOutfits || ['outfit_starter'])   // switching user: server only, no bleed
        : Array.from(new Set([                                 // same user: union local + server
            ...(prev.unlockedOutfits || ['outfit_starter']),
            ...(cloudData.unlockedOutfits || ['outfit_starter']),
          ]));

      // ── Max helper: merge outfitStones (additive — stones never decrease on sync) ──
      const mergedOutfitStones: Record<string, number> = (() => {
        if (isUserSwitch) return cloudData.outfitStones || {}; // switching user: server only
        const base: Record<string, number> = { ...(cloudData.outfitStones || {}) };
        for (const [k, v] of Object.entries(prev.outfitStones || {})) {
          base[k] = Math.max(base[k] || 0, v);
        }
        return base;
      })();

      const updated: PlayerData = {
        ...DEFAULT_PLAYER,
        ...prev,
        ...cloudData,
        userId: (profile.id as string) || prev.userId,
        name: (profile.name as string) || (cloudData.name as string) || prev.name,
        username: (profile.username as string) || (cloudData.username as string) || prev.username,
        gold: currentGold,
        // ── Avatar: profile arg > cloudData > existing (never lose the Google PFP) ──
        avatarUrl: (profile as any).avatarUrl || cloudData.avatarUrl || prev.avatarUrl,
        quests: currentQuests,
        isConfigured: true,
        replitUser: profile.replitUser || prev.replitUser,
        // ── Preserve calibration data: profile arg > cloudData > prev (local state) ──
        healthProfile: cloudData.healthProfile || (profile as any).healthProfile || prev.healthProfile,
        stats: cloudData.stats || (profile as any).stats || prev.stats,
        country: (cloudData as any).country || (profile as any).country || prev.country,
        timezone: (cloudData as any).timezone || (profile as any).timezone || prev.timezone,
        identity: cloudData.identity || (profile as any).identity || prev.identity,
        // ── Outfit ownership: safe merged values computed above ──
        unlockedOutfits: mergedUnlockedOutfits,
        outfitStones: mergedOutfitStones,
        equippedOutfitId: isUserSwitch
          ? (cloudData.equippedOutfitId || 'outfit_starter')
          : (cloudData.equippedOutfitId || prev.equippedOutfitId || 'outfit_starter'),
        // Global assets: always keep locally-fetched global data, don't let per-user cloud data overwrite it
        focusVideos: { ...(cloudData.focusVideos || {}), ...prev.focusVideos },
        customProtocols: Object.keys(prev.customProtocols || {}).length > 0
          ? prev.customProtocols
          : (cloudData.customProtocols || {}),
      };

      // Set server refs to the authoritative values from the server
      serverGoldRef.current = currentGold;


      return updated;
    });
    playSystemSoundEffect('SYSTEM');
  };

  const logout = async () => {
    try {
      if (player.userId && !isLocalUser(player.userId)) {
        await syncToCloud(player);
      }
    } catch (err) {
      console.error('Pre-logout sync error:', err);
    }
    try {
      await fetch(`${API_BASE}/api/auth/local/logout`, { method: 'POST', credentials: 'include' });
    } catch { /* ignore */ }
    localStorage.removeItem(`reforge_player_v2_${player.userId || 'local'}`);
    clearEconomySession(); // Clear per-user economy session
    clearAuthNative(); // Clear JWT from both localStorage and native Preferences
    window.location.reload();
  };

  const consumeMana = (amount: number): boolean => {
    if ((player.mp ?? 100) >= amount) {
      setPlayer(prev => ({ ...prev, mp: Math.max(0, (prev.mp ?? 100) - amount) }));
      return true;
    }
    return false;
  };

  const refundMana = (amount: number): void => {
    setPlayer(prev => ({ ...prev, mp: Math.min(prev.maxMp ?? 100, (prev.mp ?? 100) + amount) }));
  };


  // --- DAILY REWARDS SYSTEM (30-Day Cycle) ---
  // REWARD_SCHEDULE imported from lib/rewards

  const getDailyReward = useCallback((): DailyReward | null => {
    const today = toLocalDateStr();
    const lastLogin = player.lastLoginDate;

    // If already logged in today, no reward
    if (lastLogin === today) return null;

    // Use the authoritative streak from auto-streak tracker (single source of truth)
    const currentStreak = player.streak || 1;
    const rewardIndex = (currentStreak - 1) % 7;
    return REWARD_SCHEDULE[rewardIndex];
  }, [player.lastLoginDate, player.streak]);

  const claimDailyReward = (reward: DailyReward) => {
    const today = toLocalDateStr();
    
    setPlayer(prev => {
      // Streak is already set by auto-streak tracker — use it directly (single source of truth)
      const nextStreak = prev.streak || 1;

      let { currentXp, requiredXp, level, totalXp, dailyXp, gold, consumables } = prev;
      
      const safeConsumables = consumables || {};
      const safeChests = prev.chests || { legendary: 0 };
      const safeStones = prev.outfitStones || {};

      if (reward.type === 'GOLD') gold += reward.amount;
      if (reward.type === 'XP') {
        currentXp += reward.amount;
        totalXp += reward.amount;
        dailyXp += reward.amount;
      }
      
      if (reward.type === 'CHEST_LEGENDARY') safeChests.legendary += reward.amount;
      if (reward.type === 'VENUS_SHARDS') {
        const { updatedStones, goldToConvert } = computeSmartStoneDrop(safeStones, reward.amount, 'outfit_starter');
        Object.assign(safeStones, updatedStones);
        gold += goldToConvert;
        if (goldToConvert > 0) {
          setTimeout(() => addNotification(`Converted excess stones to ${goldToConvert} Gold!`, 'SUCCESS'), 1000);
        }
      }

      let leveledUp = false;
      if (reward.type === 'XP') {
        const lu = safeLevelUp(currentXp, requiredXp, level);
        currentXp = lu.currentXp; requiredXp = lu.requiredXp; level = lu.level; leveledUp = lu.leveledUp;
      }

      const logs = [createLog(`Daily Reward (Day ${nextStreak}): ${reward.message}`, 'SYSTEM'), ...prev.logs];
      if (leveledUp) {
        logs.unshift(createLog(`LEVEL UP! REACHED LEVEL ${level}`, 'LEVEL_UP'));
        playSystemSoundEffect('LEVEL_UP');
        window.dispatchEvent(new CustomEvent('player:levelup', { detail: { level } }));
      }

      return {
        ...prev,
        lastLoginDate: today,
        streak: nextStreak,
        gold,

        currentXp,
        requiredXp,
        level,
        rank: computeRank(level),
        totalXp,
        dailyXp,
        chests: safeChests,
        outfitStones: safeStones,
        consumables: safeConsumables,
        logs,
        ...(leveledUp ? { hp: prev.maxHp, mp: prev.maxMp } : {})
      };
    });
  };

  const checkDailyLogin = useCallback((): DailyReward | null => {
    return getDailyReward();
  }, [player.lastLoginDate, player.streak]);

  const claimStreakReward = (day: number, reward: { type: string; amount: number; label: string }) => {
    setPlayer(prev => {
      const claimed = prev.claimedStreakRewards || [];
      if (claimed.includes(day)) return prev; // Already claimed

      let { gold, currentXp, requiredXp, level, totalXp, dailyXp } = prev;
      const safeChests = { ...(prev.chests || { legendary: 0 }) };
      const safeStones = { ...(prev.outfitStones || {}) };

      switch (reward.type) {
        case 'GOLD':
          gold += reward.amount;
          break;
        case 'STONES': {
          // Award stones to a random outfit using smart drop logic
          const { updatedStones, goldToConvert } = computeSmartStoneDrop(safeStones, reward.amount);
          Object.assign(safeStones, updatedStones);
          gold += goldToConvert;
          if (goldToConvert > 0) {
            setTimeout(() => addNotification(`Converted excess stones to ${goldToConvert} Gold!`, 'SUCCESS'), 1000);
          }
          break;
        }
        case 'LEGENDARY_CHEST':
          safeChests.legendary = (safeChests.legendary || 0) + reward.amount;
          break;
        case 'ALLIANCE_CHEST':
          // Alliance chests are special — award gold + stones combo
          gold += 600;
          safeChests.legendary = (safeChests.legendary || 0) + 1;
          break;
      }

      const logs = [createLog(`Streak Reward (Day ${day}): ${reward.label}`, 'STREAK'), ...prev.logs];

      return {
        ...prev,
        gold,

        currentXp,
        requiredXp,
        level,
        totalXp,
        dailyXp,
        chests: safeChests,
        outfitStones: safeStones,
        claimedStreakRewards: [...claimed, day],
        logs: logs.slice(0, 60),
      };
    });
  };

  const deductGold = (amount: number): boolean => {
    if (player.gold >= amount) {
      setPlayer(prev => ({ ...prev, gold: prev.gold - amount }));
      return true;
    }
    return false;
  };

  const unlockOutfit = (outfitId: string, cost: number) => {
    setPlayer(prev => {
      if ((prev.gold || 0) < cost) return prev;
      const owned = prev.ownedOutfits || ['default'];
      if (owned.includes(outfitId)) return prev;
      return { ...prev, gold: prev.gold - cost, ownedOutfits: [...owned, outfitId] };
    });
  };

  const setActiveOutfit = (outfitId: string) => {
    setPlayer(prev => ({ ...prev, activeOutfit: outfitId }));
  };

  const purchaseBorder = (borderId: string, cost: number) => {
    setPlayer(prev => {
      if ((prev.gold || 0) < cost) return prev;
      const owned = prev.ownedBorders || ['border_default'];
      if (owned.includes(borderId)) return prev;
      return {
        ...prev,
        gold: prev.gold - cost,
        ownedBorders: [...owned, borderId],
        equippedBorder: borderId, // Auto-equip on purchase
      };
    });
  };

  const equipBorder = (borderId: string | null) => {
    setPlayer(prev => ({ ...prev, equippedBorder: borderId }));
  };

  const equipBanner = (bannerId: string | null) => {
    setPlayer(prev => ({ ...prev, equippedBanner: bannerId }));
  };

  const addRewards = (gold: number, xp: number) => {
    setPlayer(prev => {
      let { currentXp, requiredXp, level, totalXp, dailyXp } = prev;
      currentXp += xp;
      totalXp += xp;
      dailyXp += xp;

      const lu = safeLevelUp(currentXp, requiredXp, level);
      currentXp = lu.currentXp; requiredXp = lu.requiredXp; level = lu.level;
      const leveledUp = lu.leveledUp;

      const newLogs = [...prev.logs];
      if (gold > 0) newLogs.unshift(createLog(`Loot Acquired: ${gold} G, ${xp} XP`, 'LOOT'));
      if (leveledUp) {
        newLogs.unshift(createLog(`LEVEL UP! REACHED LEVEL ${level}`, 'LEVEL_UP'));
        addNotification(`LEVEL UP! You are now Level ${level}`, 'LEVEL_UP');
        playSystemSoundEffect('LEVEL_UP');
      }

      return {
        ...prev,
        gold: prev.gold + gold,
        currentXp,
        requiredXp,
        level,
        rank: lu.rank,
        totalXp,
        dailyXp,
        logs: newLogs,
        ...(leveledUp ? { hp: prev.maxHp, mp: prev.maxMp } : {})
      };
    });
  };

  const openLegendaryChest = (): { gold: number; stones: number } | null => {
    const legendary = player.chests?.legendary ?? 0;
    if (legendary <= 0) return null;
    const gold = Math.floor(Math.random() * 500) + 300;
    const stones = Math.floor(Math.random() * 50) + 50;
    setPlayer(prev => {
      const safeChests = { ...(prev.chests || { legendary: 0 }) };
      safeChests.legendary = Math.max(0, safeChests.legendary - 1);
      const safeStones = { ...(prev.outfitStones || {}) };
      const { updatedStones, goldToConvert } = computeSmartStoneDrop(safeStones, stones, 'outfit_starter');
      
      if (goldToConvert > 0) {
        setTimeout(() => addNotification(`Converted excess stones to ${goldToConvert} Gold!`, 'SUCCESS'), 1000);
      }

      return {
        ...prev,
        gold: prev.gold + gold + goldToConvert,
        chests: safeChests,
        outfitStones: updatedStones,
      };
    });
    return { gold, stones };
  };

  const updateFocusVideos = (videos: Record<string, string>) => {
    setPlayer(prev => ({ ...prev, focusVideos: { ...prev.focusVideos, ...videos } }));
  };

  const updateCustomProtocols = (protocols: Record<string, WorkoutDay[]>) => {
    setPlayer(prev => ({ ...prev, customProtocols: protocols }));
  };

  const addXp = (amount: number, source: string) => {
    setPlayer(prev => {
      let { currentXp, requiredXp, level, totalXp, dailyXp } = prev;
      currentXp += amount;
      totalXp += amount;
      dailyXp += amount;

      const lu = safeLevelUp(currentXp, requiredXp, level);
      currentXp = lu.currentXp; requiredXp = lu.requiredXp; level = lu.level;
      const leveledUp = lu.leveledUp;

      const newLogs = [createLog(`Gained ${amount} XP (${source})`, 'XP'), ...prev.logs];
      if (leveledUp) {
        newLogs.unshift(createLog(`LEVEL UP! REACHED LEVEL ${level}`, 'LEVEL_UP'));
        addNotification(`LEVEL UP! You are now Level ${level}`, 'LEVEL_UP');
        playSystemSoundEffect('LEVEL_UP');
        window.dispatchEvent(new CustomEvent('player:levelup', { detail: { level } }));
      }

      return {
        ...prev,
        currentXp,
        requiredXp,
        level,
        rank: lu.rank,
        totalXp,
        dailyXp,
        logs: newLogs,
        ...(leveledUp ? { hp: prev.maxHp, mp: prev.maxMp } : {})
      };
    });
  };

  const addQuest = (quest: Quest) => {
    setPlayer(prev => ({ ...prev, quests: [quest, ...prev.quests] }));
    addNotification('New Quest Protocol Initialized', 'SYSTEM');
    if (quest.expiresAt) {
      scheduleQuestDeadline(quest.id, quest.title, quest.expiresAt).catch(() => {});
    }
  };

  const completeQuest = (id: string, asMini: boolean = false, noRewards: boolean = false) => {
    // Read pact data before state update for post-update animations
    const preQuest = player.quests.find(q => q.id === id);
    const prePact = preQuest?.hasPact && preQuest?.pactStatus === 'active';
    const prePactAmount = preQuest?.pactAmount || 0;

    setPlayer(prev => {
      const quests = [...prev.quests];
      const qIndex = quests.findIndex(q => q.id === id);
      if (qIndex === -1) return prev;

      const quest = quests[qIndex];
      if (quest.isCompleted || quest.failed) return prev;

      const hasPact = quest.hasPact && quest.pactStatus === 'active';
      const pactAmount = quest.pactAmount || 0;
      const MANDATORY_PACT_RANKS = new Set(['B', 'A', 'S']);
      const isOptionalPact = hasPact && !MANDATORY_PACT_RANKS.has(quest.rank);

      // ── CHEAT / ANOMALY VERDICT ──
      if (noRewards) {
        // Burn pact Gold — it does NOT return
        quests[qIndex] = { ...quest, isCompleted: true, completedAsMini: asMini, pactStatus: hasPact ? 'burned' : quest.pactStatus };
        playSystemSoundEffect('DANGER');
        const newLogs = [createLog(`Quest closed (Anomaly): ${quest.title} — 0 XP, 0 Gold${hasPact ? ` — ${pactAmount}G BURNED` : ''}`, 'WARNING'), ...prev.logs];

        // Fire-and-forget: log burned Gold to integrity_pool
        if (hasPact && pactAmount > 0 && prev.userId) {
          const weekStart = new Date();
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          fetch(`${API_BASE}/api/system-pact/burn`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              quest_id: quest.id,
              amount: pactAmount,
              week_start: weekStart.toISOString().split('T')[0],
            }),
          }).catch(() => {});
        }

        return { ...prev, quests, logs: newLogs };
      }

      // ── SENSOR ANTI-CHEAT SAFETY NET ──
      // Primary validation is in App.tsx handleQuestComplete (runs before this).
      // This is a fallback — if somehow completeQuest is called directly and
      // sensor data is insufficient, silently abort completion.
      if (quest.sensorRequirements && !asMini) {
        const sr = quest.sensorRequirements;
        const sd = quest.sensorData;
        const checks: boolean[] = [];
        if (sr.steps) checks.push((sd?.stepsRecorded ?? 0) >= sr.steps * 0.6);
        if (sr.distanceKm) checks.push((sd?.distanceRecorded ?? 0) >= sr.distanceKm * 0.6);
        if (sr.activeMinutes) checks.push((sd?.activeMinutesRecorded ?? 0) >= sr.activeMinutes * 0.6);
        const passCount = checks.filter(Boolean).length;
        if (checks.length > 0 && passCount < Math.min(2, checks.length)) {
          return prev; // Abort — quest stays unchanged
        }
      }

      // ── HONEST COMPLETION ──
      quests[qIndex] = { ...quest, isCompleted: true, completedAsMini: asMini, pactStatus: hasPact ? 'honored' : quest.pactStatus, sensorTracking: false };

      const RANK_GOLD: Record<string, number> = { E: 10, D: 20, C: 40, B: 80, A: 150, S: 300 };
      const baseXpReward = asMini ? Math.floor((quest.xpReward || 50) * 0.1) : (quest.xpReward || 50);
      // 1.25x XP bonus for optional-rank pacts (E, D, C) that were honored
      const reward = (isOptionalPact && !asMini) ? Math.floor(baseXpReward * 1.25) : baseXpReward;
      const goldReward = asMini ? 5 : (RANK_GOLD[quest.rank] || 20);
      // Return pledged Gold on honest completion
      const pactReturn = hasPact ? pactAmount : 0;

      const stats = { ...prev.stats };
      const dailyStats = { ...prev.dailyStats };
      const weeklyStats = { ...prev.weeklyStats };
      const monthlyStats = { ...prev.monthlyStats };

      // Single-tag stat award with 5/day cap + overflow
      const STAT_DAILY_CAP = 5;
      const OVERFLOW_ORDER: (keyof typeof dailyStats)[] = ['discipline','focus','willpower','social','intelligence','strength'];
      const primaryCat = quest.category || (quest.categories ? quest.categories[0] : 'discipline');
      const statGain = asMini ? 0 : 1; // Mini quests don't award stat points

      if (statGain > 0) {
        let awarded = false;
        // Try primary stat first
        if ((dailyStats[primaryCat] || 0) < STAT_DAILY_CAP) {
          stats[primaryCat] = (stats[primaryCat] || 0) + 1;
          dailyStats[primaryCat] = (dailyStats[primaryCat] || 0) + 1;
          weeklyStats[primaryCat] = (weeklyStats[primaryCat] || 0) + 1;
          monthlyStats[primaryCat] = (monthlyStats[primaryCat] || 0) + 1;
          awarded = true;
        } else {
          // Overflow: find first non-full stat
          for (const overflowStat of OVERFLOW_ORDER) {
            if (overflowStat !== primaryCat && (dailyStats[overflowStat] || 0) < STAT_DAILY_CAP) {
              stats[overflowStat] = (stats[overflowStat] || 0) + 1;
              dailyStats[overflowStat] = (dailyStats[overflowStat] || 0) + 1;
              weeklyStats[overflowStat] = (weeklyStats[overflowStat] || 0) + 1;
              monthlyStats[overflowStat] = (monthlyStats[overflowStat] || 0) + 1;
              awarded = true;
              break;
            }
          }
        }
      }

      let { currentXp, requiredXp, level, totalXp, dailyXp } = prev;
      // Apply badge XP boost from equipped outfit
      const badgeMultiplier = getBadgeXpMultiplier(prev.outfitStones || {}, prev.equippedOutfitId || 'outfit_starter');
      const totalMultiplier = badgeMultiplier;
      const boostedReward = Math.floor(reward * totalMultiplier);
      const badgeBonus = boostedReward - reward;
      currentXp += boostedReward;
      totalXp += boostedReward;
      dailyXp += boostedReward;

      const lu = safeLevelUp(currentXp, requiredXp, level);
      currentXp = lu.currentXp; requiredXp = lu.requiredXp; level = lu.level;
      const leveledUp = lu.leveledUp;

      const pactBonusTag = isOptionalPact && !asMini ? ' [PACT 1.25x]' : '';
      const pactReturnTag = pactReturn > 0 ? ` (+${pactReturn}G Pledge Returned)` : '';
      const goldTag = goldReward > 0 ? `, +${goldReward} Gold` : '';
      const badgeTag = badgeBonus > 0 ? ` [Badge +${badgeBonus}]` : '';
      const newLogs = [createLog(`Completed Quest: ${quest.title} (+${reward} XP${goldTag}${pactBonusTag}${badgeTag})${pactReturnTag}`, 'XP'), ...prev.logs];
      if (leveledUp) {
        newLogs.unshift(createLog(`LEVEL UP! REACHED LEVEL ${level}`, 'LEVEL_UP'));
        playSystemSoundEffect('LEVEL_UP');
        // Dispatch level up event
        window.dispatchEvent(new CustomEvent('player:levelup', { detail: { level } }));
      } else {
        playSystemSoundEffect('SUCCESS');
      }

      // Dispatch quest complete event
      window.dispatchEvent(new CustomEvent('quest:completed', { detail: { id, title: quest.title } }));

      // Trigger autonomous Dusk reaction
      triggerDuskMessage(`Quest Completed: "${quest.title}" (+${reward} XP)`);

      // Fire-and-forget: mark pact as honored on server
      if (hasPact && prev.userId) {
        fetch(`${API_BASE}/api/system-pact/resolve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ quest_id: quest.id, status: 'honored' }),
        }).catch(() => {});
      }

      return {
        ...prev,
        quests,
        gold: prev.gold + goldReward + pactReturn,
        stats,
        dailyStats,
        weeklyStats,
        monthlyStats,
        currentXp,
        requiredXp,
        level,
        rank: lu.rank,
        totalXp,
        dailyXp,
        logs: newLogs,
        ...(leveledUp ? { hp: prev.maxHp, mp: prev.maxMp } : {})
      };
    });

    // Post-state-update: dispatch coin-earned animation for gold rewards
    if (!noRewards && !prePact) {
      const RANK_GOLD_ANIM: Record<string, number> = { E: 10, D: 20, C: 40, B: 80, A: 150, S: 300 };
      const goldGained = RANK_GOLD_ANIM[preQuest?.rank || 'E'] || 20;
      const el = document.getElementById(`quest-card-${id}`);
      const rect = el?.getBoundingClientRect() || null;
      window.dispatchEvent(new CustomEvent('reforge:coin-earned', { detail: { goldGained, startRect: rect } }));
    }

    // Award random outfit stones on quest completion (1-3)
    awardRandomStones(1, 3, 'Quest');

    // Post-state-update: dispatch coin-lost animation for burned pacts (cheat path)
    if (noRewards && prePact && prePactAmount > 0) {
      const el = document.getElementById(`quest-card-${id}`);
      const sourceRect = el?.getBoundingClientRect() || null;
      window.dispatchEvent(new CustomEvent('reforge:coin-lost', {
        detail: { amount: prePactAmount, sourceRect }
      }));
      addNotification(`PACT VIOLATED. ${prePactAmount}G Burned to Integrity Pool.`, 'DANGER');
    }
  };

  const failQuest = (id: string) => {
    // Read quest data before state update for animations
    const quest = player.quests.find(q => q.id === id);
    const hasPact = quest?.hasPact && quest?.pactStatus === 'active';
    const pactAmount = quest?.pactAmount || 0;

    setPlayer(prev => {
      const quests = [...prev.quests];
      const qIndex = quests.findIndex(q => q.id === id);
      if (qIndex === -1) return prev;

      const q = quests[qIndex];
      const qHasPact = q.hasPact && q.pactStatus === 'active';
      const qPactAmount = q.pactAmount || 0;

      quests[qIndex] = {
        ...q,
        failed: true,
        pactStatus: qHasPact ? 'burned' : q.pactStatus,
      };
      const penaltyAmount = 50;
      const currentXp = Math.max(0, prev.currentXp - penaltyAmount);

      const pactLog = qHasPact ? ` — ${qPactAmount}G Shadow Pledge BURNED` : '';
      const logs = [createLog(`Failed Quest: ${q.title} (-${penaltyAmount} XP${pactLog})`, 'PENALTY'), ...prev.logs];

      // Fire-and-forget: log burned Gold to integrity_pool
      if (qHasPact && qPactAmount > 0 && prev.userId) {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        fetch(`${API_BASE}/api/system-pact/burn`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            quest_id: q.id,
            amount: qPactAmount,
            week_start: weekStart.toISOString().split('T')[0],
          }),
        }).catch(() => {});
      }

      return { ...prev, quests, currentXp, logs };
    });

    playSystemSoundEffect('DANGER');

    // Dispatch quest failed event
    window.dispatchEvent(new CustomEvent('quest:failed', { detail: { id, title: quest?.title } }));

    // Trigger autonomous Dusk reaction
    triggerDuskMessage(`Quest Failed/Aborted: "${quest?.title || 'Unknown Quest'}"`);

    // Dispatch coin-lost animation for pact quests
    if (hasPact && pactAmount > 0) {
      const el = document.getElementById(`quest-card-${id}`);
      const sourceRect = el?.getBoundingClientRect() || null;
      window.dispatchEvent(new CustomEvent('reforge:coin-lost', {
        detail: { amount: pactAmount, sourceRect }
      }));
      addNotification(`Quest Failed. Shadow Pledge Forfeited: ${pactAmount}G Lost.`, 'DANGER');
    } else {
      addNotification('Quest Failed. Penalty Applied.', 'DANGER');
    }
  };

  const failFlaggedQuest = (id: string) => {
    setPlayer(prev => {
      const quests = [...prev.quests];
      const qIndex = quests.findIndex(q => q.id === id);
      if (qIndex === -1) return prev;
      quests[qIndex] = { ...quests[qIndex], failed: true };
      return {
        ...prev,
        quests,
        logs: [createLog(`Quest Flagged: ${quests[qIndex].title} — FAILED. No rewards granted.`, 'WARNING'), ...prev.logs]
      };
    });
    playSystemSoundEffect('DANGER');
    addNotification('ForgeGuard: Quest FAILED. No XP or Gold awarded.', 'DANGER');
  };

  const resetQuest = (id: string) => {
    setPlayer(prev => ({
      ...prev,
      quests: prev.quests.map(q => q.id === id ? { ...q, isCompleted: false, failed: false, completedAsMini: false } : q)
    }));
  };

  const deleteQuest = (id: string) => {
    setPlayer(prev => ({ ...prev, quests: prev.quests.filter(q => q.id !== id) }));
  };

  const purchaseItem = (item: ShopItem) => {
    if (player.gold < item.cost) {
      addNotification('Insufficient Funds', 'WARNING');
      return;
    }
    setPlayer(prev => ({
      ...prev,
      gold: prev.gold - item.cost,
      logs: [createLog(`Purchased: ${item.title} (-${item.cost} G)`, 'PURCHASE'), ...prev.logs]
    }));
    addNotification(`Acquired: ${item.title}`, 'PURCHASE');
    playSystemSoundEffect('PURCHASE');
  };
  const addShopItem = (item: ShopItem) => {
    setPlayer(prev => ({ ...prev, shopItems: [...prev.shopItems, item] }));
  };

  const removeShopItem = (id: string) => {
    setPlayer(prev => ({ ...prev, shopItems: prev.shopItems.filter(i => i.id !== id) }));
  };

  const saveHealthProfile = (profile: HealthProfile, identity: string) => {
    setPlayer(prev => ({ ...prev, healthProfile: profile, identity }));
    addNotification('Biometrics Updated. System Calibrated.', 'SUCCESS');
  };

  const updateProfile = (data: { name: string; username: string; job: string; title: string; healthProfile?: HealthProfile }) => {
    setPlayer(prev => ({
      ...prev,
      name: data.name,
      username: data.username,
      job: data.job,
      title: data.title,
      ...(data.healthProfile ? { healthProfile: data.healthProfile } : {}),
    }));
    addNotification('Profile Updated.', 'SUCCESS');
  };

  const addProgressPhoto = (photo: ProgressPhoto) => {
    setPlayer(prev => {
      const profile = prev.healthProfile;
      if (!profile) return prev;
      const photos = [photo, ...(profile.progressPhotos || [])];
      return { ...prev, healthProfile: { ...profile, progressPhotos: photos } };
    });
  };

  const deleteProgressPhoto = (id: string) => {
    setPlayer(prev => {
      const profile = prev.healthProfile;
      if (!profile) return prev;
      const photos = (profile.progressPhotos || []).filter(p => p.id !== id);
      return { ...prev, healthProfile: { ...profile, progressPhotos: photos } };
    });
  };

  const logMeal = (meal: MealLog) => {
    const recoveryAmount = 5;
    setPlayer(prev => ({
      ...prev,
      hp: Math.min(prev.maxHp, prev.hp + recoveryAmount),
      nutritionLogs: [...(prev.nutritionLogs || []), meal],
      logs: [createLog(`Nutrition Logged: ${meal.label} (${meal.totalCalories} kcal) [+${recoveryAmount} HP]`, 'SYSTEM'), ...prev.logs]
    }));
    addNotification(`Meal Logged: ${meal.totalCalories} kcal. Vitality Restored.`, 'SUCCESS');
  };

  const deleteMeal = (id: string) => {
    setPlayer(prev => ({ ...prev, nutritionLogs: prev.nutritionLogs.filter(m => m.id !== id) }));
  };

  // Reward type definition for workout session rewards
  type WorkoutRewardType = 'XP' | 'GOLD' | 'KEYS';
  interface WorkoutReward { type: WorkoutRewardType; amount: number; label: string; }

  const generateWorkoutRewards = (anomalyPoints: number = 0): WorkoutReward[] => {
    const pool: { type: WorkoutRewardType; weight: number; min: number; max: number; label: string }[] = [
      { type: 'XP', weight: 40, min: 150, max: 350, label: 'XP' },
      { type: 'GOLD', weight: 40, min: 20, max: 80, label: 'Gold' },
      { type: 'KEYS', weight: 20, min: 1, max: 2, label: 'Keys' },
    ];

    const picked: WorkoutReward[] = [];
    const usedTypes = new Set<WorkoutRewardType>();
    const penalized = anomalyPoints > 5;

    while (picked.length < 3) {
      const available = pool.filter(p => !usedTypes.has(p.type));
      if (available.length === 0) break;
      const totalWeight = available.reduce((s, p) => s + p.weight, 0);
      let roll = Math.random() * totalWeight;
      for (const item of available) {
        roll -= item.weight;
        if (roll <= 0) {
          let amount = Math.floor(Math.random() * (item.max - item.min + 1)) + item.min;
          if (penalized) amount = Math.max(1, Math.floor(amount * 0.5));
          picked.push({ type: item.type, amount, label: item.label });
          usedTypes.add(item.type);
          break;
        }
      }
    }
    return picked;
  };

  const completeWorkoutSession = (
    exercisesCompleted: number,
    totalExercises: number,
    results: Record<string, number>,
    intensityModifier: boolean,
    anomalyPoints: number = 0,
    isCustomWorkout: boolean = false
  ): WorkoutReward[] => {
    // Guard against duplicate rapid calls
    if (workoutCompletingRef.current) return [];
    workoutCompletingRef.current = true;
    setTimeout(() => { workoutCompletingRef.current = false; }, 2000);

    // ── Daily workout cap: prevent unlimited reward farming ──
    const today = toLocalDateStr();
    const capKey = `reforge_workout_cap_${today}`;
    let dailyCount = 0;
    try { dailyCount = parseInt(localStorage.getItem(capKey) || '0', 10) || 0; } catch {}
    const dailyCapExceeded = dailyCount >= MAX_DAILY_WORKOUTS;
    if (dailyCapExceeded) {
      addNotification(`Daily workout limit reached (${MAX_DAILY_WORKOUTS}). No rewards — rest and come back tomorrow!`, 'WARNING');
      return [];
    }
    // Increment daily count
    try { localStorage.setItem(capKey, String(dailyCount + 1)); } catch {}

    const penaltyExceeded = anomalyPoints >= 5;
    
    let rewards: WorkoutReward[] = [];
    if (penaltyExceeded) {
      rewards = [];
    } else if (isCustomWorkout) {
      // Tiered custom workout rewards based on exercise count
      if (totalExercises <= 2) {
        // Too few exercises — no rewards
        rewards = [];
      } else if (totalExercises <= 5) {
        // Tier 2: 3-5 exercises → 150-300 coins, 250-300 XP
        rewards = [
          { type: 'XP', amount: Math.floor(Math.random() * 51) + 250, label: 'XP' },
          { type: 'GOLD', amount: Math.floor(Math.random() * 151) + 150, label: 'Gold' },
        ];
      } else if (totalExercises <= 7) {
        // Tier 3: 6-7 exercises → 300-450 coins, 350-400 XP
        rewards = [
          { type: 'XP', amount: Math.floor(Math.random() * 51) + 350, label: 'XP' },
          { type: 'GOLD', amount: Math.floor(Math.random() * 151) + 300, label: 'Gold' },
        ];
      } else {
        // Tier 4: 8+ exercises → 500-600 coins, 450-550 XP, 1 key
        rewards = [
          { type: 'XP', amount: Math.floor(Math.random() * 101) + 450, label: 'XP' },
          { type: 'GOLD', amount: Math.floor(Math.random() * 101) + 500, label: 'Gold' },
          { type: 'KEYS', amount: 1, label: 'Key' },
        ];
      }
    } else {
      rewards = generateWorkoutRewards(anomalyPoints);
    }

    setPlayer(prev => {
      // If anomaly threshold exceeded, grant nothing
      if (penaltyExceeded) {
        const newLogs = [
          createLog(`Workout VOIDED: ${anomalyPoints} anomaly violations detected — NO REWARDS GRANTED`, 'WORKOUT'),
          ...prev.logs
        ];
        const today = toLocalDateStr();
        return { ...prev, logs: newLogs, lastWorkoutDate: today };
      }

      // Sum up XP and Gold from rewards
      let xpReward = 0;
      let goldReward = 0;


      for (const r of rewards) {
        switch (r.type) {
          case 'XP': xpReward += r.amount; break;
          case 'GOLD': goldReward += r.amount; break;

        }
      }

      // Base XP from exercises still applies (unless custom workout)
      let totalXpGain = 0;
      let totalGoldGain = 0;

      if (isCustomWorkout) {
        totalXpGain = xpReward;
        totalGoldGain = goldReward;
      } else {
        const baseXp = exercisesCompleted * 40;
        const bonusXp = intensityModifier ? 250 : 0;
        totalXpGain = baseXp + bonusXp + xpReward;
        totalGoldGain = Math.floor((baseXp + bonusXp) / 10) + goldReward;
      }

      const stats = { ...prev.stats };
      const dailyStats = { ...prev.dailyStats };
      const weeklyStats = { ...prev.weeklyStats };
      const monthlyStats = { ...prev.monthlyStats };
      const STAT_DAILY_CAP = 5;

      // Award STR (capped)
      const strGain = intensityModifier ? 2 : 1;
      for (let i = 0; i < strGain; i++) {
        if ((dailyStats.strength || 0) < STAT_DAILY_CAP) {
          stats.strength = (stats.strength || 0) + 1;
          dailyStats.strength = (dailyStats.strength || 0) + 1;
          weeklyStats.strength = (weeklyStats.strength || 0) + 1;
          monthlyStats.strength = (monthlyStats.strength || 0) + 1;
        }
      }
      // Award DIS (capped)
      if ((dailyStats.discipline || 0) < STAT_DAILY_CAP) {
        stats.discipline = (stats.discipline || 0) + 1;
        dailyStats.discipline = (dailyStats.discipline || 0) + 1;
        weeklyStats.discipline = (weeklyStats.discipline || 0) + 1;
        monthlyStats.discipline = (monthlyStats.discipline || 0) + 1;
      }

      const newPBs = { ...prev.personalBests };
      Object.entries(results).forEach(([key, val]) => {
        if (!newPBs[key] || val > newPBs[key]) newPBs[key] = val;
      });

      let { currentXp, requiredXp, level, totalXp, dailyXp } = prev;
      // Apply badge XP boost
      const badgeMult = getBadgeXpMultiplier(prev.outfitStones || {}, prev.equippedOutfitId || 'outfit_starter');
      const combinedMult = badgeMult;
      const boostedWorkoutXp = Math.floor(totalXpGain * combinedMult);
      currentXp += boostedWorkoutXp;
      totalXp += boostedWorkoutXp;
      dailyXp += boostedWorkoutXp;

      const lu = safeLevelUp(currentXp, requiredXp, level);
      currentXp = lu.currentXp; requiredXp = lu.requiredXp; level = lu.level;
      const leveledUp = lu.leveledUp;

      const penaltyTag = '';
      const newLogs = [
        createLog(`Workout Completed: ${exercisesCompleted}/${totalExercises} Exercises (+${totalXpGain} XP, +${totalGoldGain} Gold)${penaltyTag}`, 'WORKOUT'),
        ...prev.logs
      ];
      if (leveledUp) {
        newLogs.unshift(createLog(`LEVEL UP! REACHED LEVEL ${level}`, 'LEVEL_UP'));
        playSystemSoundEffect('LEVEL_UP');
        window.dispatchEvent(new CustomEvent('player:levelup', { detail: { level } }));
      }

      const today = toLocalDateStr();

      return {
        ...prev,
        currentXp,
        requiredXp,
        level,
        rank: lu.rank,
        totalXp,
        dailyXp,
        stats,
        dailyStats,
        weeklyStats,
        monthlyStats,
        personalBests: newPBs,
        gold: prev.gold + totalGoldGain,

        logs: newLogs,
        lastWorkoutDate: today,
        ...(leveledUp ? { hp: prev.maxHp, mp: prev.maxMp } : {})
      };
    });

    if (penaltyExceeded) {
      addNotification('Workout Voided — Too many anomalies detected. No rewards granted.', 'WARNING');
      triggerDuskMessage(`Workout VOIDED: ${exercisesCompleted}/${totalExercises} exercises attempted but ${anomalyPoints} anomaly violations detected. No rewards granted — the hunter tried to cheat the system.`);
    } else {
      // Cancel today's workout/streak/leaderboard reminders — user has already trained
      cancelDailyReminders().catch(() => {});
      const rewardSummary = rewards.map(r => `${r.amount} ${r.label}`).join(', ');
      addNotification(`Workout Complete! Rewards: ${rewardSummary}`, 'SUCCESS');
      triggerDuskMessage(`Workout Completed: ${exercisesCompleted}/${totalExercises} exercises done. Intensity: ${intensityModifier ? 'HIGH' : 'NORMAL'}. Rewards: ${rewardSummary}.`);
      // Award random outfit stones on workout completion (2-5)
      awardRandomStones(2, 5, 'Workout');
    }

    // Persist to workouts table (fire-and-forget)
    if (player.userId && !isLocalUser(player.userId)) {
      fetch(`${API_BASE}/api/workout/log-complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          exercises_completed: exercisesCompleted,
          total_exercises: totalExercises,
          xp_gained: exercisesCompleted * 50 + (intensityModifier ? 100 : 0),
        }),
      }).catch(() => {});

      // ── SERVER-SIDE KEY GRANT for workout KEYS rewards ──
      // Keys are server-authoritative — the PUT /player/:id endpoint ignores client keys.
      // We must call the economy/grant-keys endpoint to persist key rewards to Supabase.
      const keyReward = rewards.find(r => r.type === 'KEYS');
      if (keyReward && keyReward.amount > 0) {
        fetch(`${API_BASE}/api/economy/grant-keys`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ amount: keyReward.amount, source: 'workout_reward' }),
        }).catch(() => {});
      }
    }

    return rewards;
  };

  // ── SMART STONE DROPS ──
  const MAX_STONES_PER_OUTFIT = 500;
  const GOLD_PER_EXCESS_STONE = 10;

  const computeSmartStoneDrop = (
    currentStones: Record<string, number>, 
    amount: number, 
    preferredOutfitId?: string
  ): { updatedStones: Record<string, number>, goldToConvert: number, targetId: string, stonesAdded: number } => {
    let targetId = preferredOutfitId;
    const outfitIds = OUTFITS.map(o => o.id);
    
    // If no preference, or preferred is already maxed, try to find a non-maxed outfit
    if (!targetId || (currentStones[targetId] || 0) >= MAX_STONES_PER_OUTFIT) {
      const availableOutfits = outfitIds.filter(id => (currentStones[id] || 0) < MAX_STONES_PER_OUTFIT);
      if (availableOutfits.length > 0) {
        targetId = availableOutfits[Math.floor(Math.random() * availableOutfits.length)];
      } else {
        // ALL outfits are maxed. Convert all to gold.
        targetId = targetId || outfitIds[0]; // fallback ID just for logging
        return { updatedStones: currentStones, goldToConvert: amount * GOLD_PER_EXCESS_STONE, targetId, stonesAdded: 0 };
      }
    }

    const currentCount = currentStones[targetId] || 0;
    const spaceLeft = MAX_STONES_PER_OUTFIT - currentCount;
    
    if (spaceLeft >= amount) {
      // Can fit all stones
      return { 
        updatedStones: { ...currentStones, [targetId]: currentCount + amount }, 
        goldToConvert: 0, 
        targetId, 
        stonesAdded: amount 
      };
    } else {
      // Partially fits. Cap it at 500, convert the rest.
      const excess = amount - spaceLeft;
      return {
        updatedStones: { ...currentStones, [targetId]: MAX_STONES_PER_OUTFIT },
        goldToConvert: excess * GOLD_PER_EXCESS_STONE,
        targetId,
        stonesAdded: spaceLeft
      };
    }
  };

  const awardRandomStones = (min: number, max: number, source: string) => {
    const amount = Math.floor(Math.random() * (max - min + 1)) + min;
    
    setPlayer(prev => {
      const prevStones = prev.outfitStones || {};
      const { updatedStones, goldToConvert, targetId, stonesAdded } = computeSmartStoneDrop(prevStones, amount);
      const stoneConf = getStoneConfig(targetId);

      const oldCount = prevStones[targetId] || 0;
      const newCount = updatedStones[targetId] || oldCount;

      const oldBadges = getUnlockedBadgeCount(oldCount);
      const newBadges = getUnlockedBadgeCount(newCount);

      const newLogs = [...prev.logs];
      
      if (stonesAdded > 0) {
        newLogs.unshift(createLog(`+${stonesAdded} ${stoneConf.stoneName} earned (${source})`, 'LOOT'));
      }
      if (goldToConvert > 0) {
        newLogs.unshift(createLog(`Max capacity reached! ${amount - stonesAdded} stones converted to ${goldToConvert} Gold.`, 'LOOT'));
        setTimeout(() => addNotification(`Converted excess stones to ${goldToConvert} Gold!`, 'SUCCESS'), 1000);
        window.dispatchEvent(new CustomEvent('reforge:coin-earned', { detail: { goldGained: goldToConvert, startRect: null } }));
      }

      const badgeUnlocked = newBadges > oldBadges;
      if (stonesAdded > 0 || badgeUnlocked) {
        window.dispatchEvent(new CustomEvent('stone:earned', {
          detail: { outfitId: targetId, amount: stonesAdded, oldCount, newCount, color: stoneConf.stoneColor, glow: stoneConf.stoneGlow, badgeUnlocked }
        }));
      }

      if (badgeUnlocked) {
        const unlockedTierIdx = newBadges - 1;
        const tier = BADGE_TIERS[unlockedTierIdx];
        if (tier) {
          newLogs.unshift(createLog(`BADGE UNLOCKED: ${tier.name} (${tier.label}) for ${stoneConf.stoneName.replace(' Crystal', '')}!`, 'SYSTEM'));
          window.dispatchEvent(new CustomEvent('badge:unlocked', { detail: { tierIndex: unlockedTierIdx, outfitId: targetId } }));
        }
      }

      return {
        ...prev,
        gold: prev.gold + goldToConvert,
        outfitStones: updatedStones,
        logs: newLogs.slice(0, 60),
      };
    });

    if (amount > 0) {
      addNotification(`Received stones from ${source}`, 'SUCCESS');
    }
  };

  const awardOutfitStones = (outfitId: string, amount: number, source: string) => {
    setPlayer(prev => {
      const prevStones = prev.outfitStones || {};
      const { updatedStones, goldToConvert, targetId, stonesAdded } = computeSmartStoneDrop(prevStones, amount, outfitId);
      const stoneConf = getStoneConfig(targetId);

      const oldCount = prevStones[targetId] || 0;
      const newCount = updatedStones[targetId] || oldCount;

      const oldBadges = getUnlockedBadgeCount(oldCount);
      const newBadges = getUnlockedBadgeCount(newCount);

      const newLogs = [...prev.logs];
      
      if (stonesAdded > 0) {
        newLogs.unshift(createLog(`+${stonesAdded} ${stoneConf.stoneName} earned (${source})`, 'LOOT'));
      }
      if (goldToConvert > 0) {
        newLogs.unshift(createLog(`Max capacity reached! ${amount - stonesAdded} stones converted to ${goldToConvert} Gold.`, 'LOOT'));
        setTimeout(() => addNotification(`Converted excess stones to ${goldToConvert} Gold!`, 'SUCCESS'), 1000);
        window.dispatchEvent(new CustomEvent('reforge:coin-earned', { detail: { goldGained: goldToConvert, startRect: null } }));
      }

      const badgeUnlocked = newBadges > oldBadges;
      if (stonesAdded > 0 || badgeUnlocked) {
        window.dispatchEvent(new CustomEvent('stone:earned', {
          detail: { outfitId: targetId, amount: stonesAdded, oldCount, newCount, color: stoneConf.stoneColor, glow: stoneConf.stoneGlow, badgeUnlocked }
        }));
      }

      if (badgeUnlocked) {
        const unlockedTierIdx = newBadges - 1;
        const tier = BADGE_TIERS[unlockedTierIdx];
        if (tier) {
          newLogs.unshift(createLog(`BADGE UNLOCKED: ${tier.name} (${tier.label}) for ${stoneConf.stoneName.replace(' Crystal', '')}!`, 'SYSTEM'));
          window.dispatchEvent(new CustomEvent('badge:unlocked', { detail: { tierIndex: unlockedTierIdx, outfitId: targetId } }));
        }
      }

      return {
        ...prev,
        gold: prev.gold + goldToConvert,
        outfitStones: updatedStones,
        logs: newLogs.slice(0, 60),
      };
    });

    if (amount > 0) {
      addNotification(`Received stones from ${source}`, 'SUCCESS');
    }
  };

  const failWorkout = () => {
    // Silent abort — no penalty, no notification
  };

  const advanceTutorial = (step: number) => {
    setPlayer(prev => ({ ...prev, tutorialStep: step }));
  };

  const completeTutorial = () => {
    setPlayer(prev => ({ ...prev, tutorialComplete: true }));
    addNotification('Tutorial Protocol Complete. System Fully Operational.', 'SUCCESS');
  };

  const resetTutorial = () => {
    setPlayer(prev => ({ ...prev, tutorialStep: 1, tutorialComplete: false }));
  };

  const resetPlayer = () => {
    setPlayer(DEFAULT_PLAYER);
  };

  const recordStrike = useCallback(() => {
    let capturedUserId: string | undefined;
    setPlayer(prev => {
      capturedUserId = prev.userId;
      const strikes = (prev.cheatStrikes || 0) + 1;
      let { currentXp, level } = prev;
      let logs = [...prev.logs];
      if (strikes >= 5) {
        logs.unshift(createLog('PERMANENTLY BANNED: 5 anomaly violations recorded by ForgeGuard.', 'WARNING'));
        playSystemSoundEffect('DANGER');
        return { ...prev, cheatStrikes: strikes, isBanned: true, logs };
      }
      if (strikes >= 3) {
        // Strikes 3-4: serious — deduct 15% XP
        const deduction = Math.floor(currentXp * 0.15);
        currentXp -= deduction;
        logs.unshift(createLog(`Anomaly Strike ${strikes}/5: -15% XP (${deduction} XP lost). ${5 - strikes} violation(s) remaining before permanent ban.`, 'WARNING'));
        playSystemSoundEffect('DANGER');
      } else {
        // Strikes 1-2: warnings only — no XP loss (prevents death spiral from random flags)
        logs.unshift(createLog(`Anomaly Strike ${strikes}/5 issued. Warning only — no penalty yet. ${5 - strikes} violation(s) remaining before permanent ban.`, 'WARNING'));
        playSystemSoundEffect('DANGER');
      }
      addNotification(`Anomaly Strike ${strikes}/5 — ${5 - strikes} remaining`, 'DANGER');
      const trustScore = Math.max(0, (prev.trustScore ?? 100) - 15);
      return { ...prev, cheatStrikes: strikes, trustScore, currentXp: Math.max(0, currentXp), level, logs };
    });

    // Persist strike to DB via dedicated endpoint (fire-and-forget, outside state updater)
    setTimeout(() => {
      if (capturedUserId && !isLocalUser(capturedUserId)) {
        fetch(`${API_BASE}/api/player/${capturedUserId}/record-strike`, {
          method: 'POST',
          headers: { ...getPlayerAuthHeaders() },
          credentials: 'include',
        }).then(res => {
          if (!res.ok) {
            console.error(`[ForgeGuard] Strike sync failed: ${res.status} ${res.statusText}`);
            addNotification('Strike sync failed — contact support.', 'SYSTEM');
          } else {
            // Trigger immediate DB sync so homepage + admin panel update in real-time
            window.dispatchEvent(new Event('reforge:sync-needed'));
          }
        }).catch(err => {
          console.error('[ForgeGuard] Strike sync network error:', err);
          addNotification('Strike sync failed — contact support.', 'SYSTEM');
        });
      }
    }, 0);
  }, [addNotification]);

  const removeStrike = useCallback(() => {
    setPlayer(prev => ({
      ...prev,
      cheatStrikes: Math.max(0, (prev.cheatStrikes || 0) - 1),
      trustScore: Math.min(100, (prev.trustScore || 100) + 5),
      logs: [createLog('Anti-Cheat Strike Removed via Ticket.', 'SYSTEM'), ...prev.logs]
    }));
    addNotification('Strike Removed. Trust Restored.', 'SUCCESS');
  }, [addNotification]);

  const markDuskMessagesRead = useCallback(() => {
    setPlayer(prev => ({ ...prev, duskUnreadCount: 0 }));
  }, []);

  const setDashboardTrigger = useCallback((type: string) => {
    sessionStorage.setItem('dashboard_trigger', type);
  }, []);

  const triggerDuskMessage = useCallback(async (eventText: string) => {
    if (!player.userId) return;
    
    // Read current history from local storage
    const storageKey = `dusk_chat_history_${player.userId || 'local'}`;
    const savedHistory = localStorage.getItem(storageKey);
    let history: { id: string; sender: 'user'|'dusk'; text: string; timestamp: number }[] = [];
    if (savedHistory) {
      try { history = JSON.parse(savedHistory); } catch(e){}
    }

    try {
      const failedQuests = player.quests.filter(q => q.failed).map(q => q.title).join(', ');
      const activeQuests = player.quests.filter(q => !q.isCompleted && !q.failed).map(q => q.title).join(', ');

      const res = await fetch(`${API_BASE}/api/dusk/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          message: `[SYSTEM_EVENT] ${eventText}`,
          history: history.slice(-8),
          playerContext: {
            name: player.name,
            level: player.level,
            rank: player.rank,
            streak: player.streak,
            stats: player.stats,
            failedQuests: failedQuests || 'None',
            activeQuests: activeQuests || 'None',
            recentAction: eventText
          }
        })
      });

      const data = await res.json();
      if (data.text) {
        const newMsg = {
          id: Date.now().toString(),
          sender: 'dusk' as const,
          text: data.text,
          timestamp: Date.now()
        };
        history.push(newMsg);
        localStorage.setItem(storageKey, JSON.stringify(history));
        
        // Notify UI to show unread dot
        setPlayer(prev => ({ ...prev, duskUnreadCount: (prev.duskUnreadCount || 0) + 1 }));
        
        // Push notification
        addNotification('DUSK: New Message', 'SYSTEM');
        
        // Fire event so DuskChat can update if it is currently open
        window.dispatchEvent(new CustomEvent('dusk:new_message', { detail: newMsg }));
      }
    } catch (err) {
      console.error('Autonomous Dusk Error:', err);
    }
  }, [player, addNotification]);

  const verifyTicket = useCallback(async (proof: string, reason: string, originalSelfie?: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/forge-guard/verify-proof`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ imageBase64: proof, reason, context: originalSelfie })
      });
      const data = await res.json();
      if (data.verdict === 'APPROVED') {
        removeStrike();
      } else {
        addNotification('Ticket Rejected: Insufficient proof.', 'DANGER');
      }
    } catch (err) {
      addNotification('Ticket verification failed. Try again.', 'WARNING');
    }
  }, [removeStrike, addNotification]);

  const purchaseOutfit = useCallback(async (outfit: { id: string; name: string; cost: number; keyCost?: number }) => {
    // Server-authoritative purchase: atomic gold deduction + inventory write
    try {
      const headers = getPlayerAuthHeaders();
      const resp = await fetch(`${API_BASE}/api/inventory/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        credentials: 'include',
        body: JSON.stringify({ itemId: outfit.id, itemType: 'outfit', price: outfit.cost }),
      });
      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        if (errData.error === 'Not enough gold') {
          addNotification('Insufficient Gold.', 'DANGER');
        } else if (errData.alreadyOwned) {
          addNotification('Already owned.', 'WARNING');
        } else {
          addNotification('Purchase failed. Try again.', 'DANGER');
        }
        return;
      }
      const { gold: newGold } = await resp.json();
      // Server confirmed purchase — update local state
      playSystemSoundEffect('PURCHASE');
      addNotification(`${outfit.name} Unlocked!`, 'PURCHASE');
      setPlayer(prev => ({
        ...prev,
        gold: newGold,
        unlockedOutfits: [...(prev.unlockedOutfits || ['outfit_starter']), outfit.id],
        logs: [createLog(`Purchased: ${outfit.name} (-${outfit.cost}G)`, 'PURCHASE'), ...prev.logs],
      }));
    } catch {
      // Network error — fall back to client-side for offline resilience
      setPlayer(prev => {
        if ((prev.gold || 0) < outfit.cost) {
          addNotification('Insufficient Gold.', 'DANGER');
          return prev;
        }
        const unlocked = prev.unlockedOutfits || ['outfit_starter'];
        if (unlocked.includes(outfit.id)) return prev;
        playSystemSoundEffect('PURCHASE');
        addNotification(`${outfit.name} Unlocked!`, 'PURCHASE');
        return {
          ...prev,
          gold: prev.gold - outfit.cost,
          unlockedOutfits: [...unlocked, outfit.id],
          logs: [createLog(`Purchased: ${outfit.name} (-${outfit.cost}G)`, 'PURCHASE'), ...prev.logs],
        };
      });
    }
  }, [addNotification]);

  const equipOutfit = useCallback((outfitId: string) => {
    setPlayer(prev => ({
      ...prev,
      equippedOutfitId: outfitId,
      logs: [createLog(`Equipped outfit: ${outfitId}`, 'EQUIP'), ...prev.logs]
    }));
  }, []);

  const resolvePenalty = () => {
    setPlayer(prev => ({ ...prev, isPenaltyActive: false, penaltyEndTime: undefined, penaltyTask: undefined }));
    addNotification('Penalty Lifted. System Normalized.', 'SUCCESS');
  };

  const reducePenalty = (ms: number) => {
    setPlayer(prev => {
      if (!prev.penaltyEndTime) return prev;
      const newEndTime = prev.penaltyEndTime - ms;
      if (newEndTime <= Date.now()) {
        addNotification('Penalty Lifted.', 'SUCCESS');
        return { ...prev, isPenaltyActive: false, penaltyEndTime: undefined, penaltyTask: undefined };
      }
      return { ...prev, penaltyEndTime: newEndTime };
    });
  };

  const startSensorTracking = (questId: string) => {
    setPlayer(prev => {
      const quests = prev.quests.map(q =>
        q.id === questId ? { ...q, sensorTracking: true } : q
      );
      return { ...prev, quests };
    });
  };

  const stopSensorTracking = (questId: string, sensorData?: {
    stepsRecorded?: number;
    distanceRecorded?: number;
    activeMinutesRecorded?: number;
    locationPath?: [number, number][];
    maxSpeedKmh?: number;
  }) => {
    setPlayer(prev => {
      const quests = prev.quests.map(q =>
        q.id === questId ? { ...q, sensorTracking: false, sensorData: sensorData || q.sensorData } : q
      );
      return { ...prev, quests };
    });
  };

  const updateQuestSensorData = (questId: string, sensorData: {
    stepsRecorded?: number;
    distanceRecorded?: number;
    activeMinutesRecorded?: number;
    locationPath?: [number, number][];
    maxSpeedKmh?: number;
  }) => {
    setPlayer(prev => {
      const quests = prev.quests.map(q =>
        q.id === questId ? { ...q, sensorData } : q
      );
      return { ...prev, quests };
    });
  };

  const updateSkillProgress = (progress: import('../types').SkillProgress[]) => {
    setPlayer(prev => ({ ...prev, skillProgress: progress }));
  };

  const claimTournamentReward = () => {
    setPlayer(prev => {
      const reward = prev.tournament?.pendingReward;
      if (!reward) return prev;
      return {
        ...prev,
        gold: prev.gold + reward.gold,
        tournament: { ...prev.tournament, pendingReward: null },
        logs: [createLog(`Claimed Tournament Reward: #${reward.rank} (+${reward.gold} G)`, 'TOURNAMENT'), ...prev.logs]
      };
    });
  };

  return {
    player,
    setPlayer,
    notifications,
    notificationHistory,
    hasUnreadNotifications,
    registerUser,
    addQuest,
    completeQuest,
    failQuest,
    failFlaggedQuest,
    resetQuest,
    deleteQuest,
    purchaseItem,
    addShopItem,
    removeShopItem,
    removeNotification,
    markNotificationsRead,
    clearNotificationHistory,
    saveHealthProfile,
    updateProfile,
    addProgressPhoto,
    deleteProgressPhoto,
    logMeal,
    deleteMeal,
    completeWorkoutSession,
    failWorkout,
    logout,
    advanceTutorial,
    completeTutorial,
    resetTutorial,
    resetPlayer,
    resolvePenalty,
    reducePenalty,
    claimTournamentReward,
    updateFocusVideos,
    updateCustomProtocols,
    addXp,

    consumeMana,
    refundMana,
    checkDailyLogin,
    claimDailyReward,
    claimStreakReward,
    deductGold,
    addRewards,
    openLegendaryChest,

    unlockOutfit,
    setActiveOutfit,
    recordStrike,
    removeStrike,
    startSensorTracking,
    stopSensorTracking,
    updateQuestSensorData,
    markDuskMessagesRead,
    setDashboardTrigger,
    verifyTicket,
    purchaseOutfit,
    equipOutfit,
    addNotification,
    updateSkillProgress,
    updateServerBaseline,
    markServerPullDone,
    setServerUpdatedAt,
    setSyncVersion,
    awardRandomStones,
    purchaseBorder,
    equipBorder,
    equipBanner,
    dataReady,
    markDataReady,
  };
};
