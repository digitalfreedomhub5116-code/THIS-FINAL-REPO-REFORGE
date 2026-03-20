import { useState, useEffect, useCallback, useRef } from 'react';
import {
  PlayerData, Quest, ShopItem, SystemNotification, NotificationType,
  ActivityLog, HealthProfile, ProgressPhoto, MealLog, WorkoutDay, AdminExercise, DailyReward,
  ReplitUser, HistoryEntry
} from '../types';
import { playSystemSoundEffect } from '../utils/soundEngine';
import { getPlayerAuthHeaders } from '../lib/playerApi';
import { REWARD_SCHEDULE } from '../lib/rewards';
import { API_BASE } from '../lib/apiConfig';

export const isEmbed = (url: string) => {
  return url.includes('youtube.com/embed') || url.includes('player.vimeo.com');
};

const DEFAULT_PLAYER: PlayerData = {
  isConfigured: false,
  tutorialStep: 0,
  tutorialComplete: false,
  name: '',
  level: 1,
  currentXp: 0,
  requiredXp: 100,
  totalXp: 0,
  dailyXp: 0,
  rank: 'E',
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
  lastDungeonEntry: 0,
  logs: [],
  quests: [],
  shopItems: [],
  consumables: { healthPotions: 0, shadowScrolls: 0, ultOrbs: 0 },
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
  if (!merged.consumables) merged.consumables = { healthPotions: 0, shadowScrolls: 0, ultOrbs: 0 };
  merged.tutorialComplete = (raw as any)?.tutorialComplete ?? false;
  return merged;
}

function loadFromStorage(): PlayerData {
  try {
    const saved = localStorage.getItem('reforge_player_v2');
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
    const raw = localStorage.getItem('reforge_notif_history');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

const loadUnread = (): boolean => {
  try { return localStorage.getItem('reforge_notif_unread') === 'true'; } catch { return false; }
};

export const useSystem = () => {
  const [player, setPlayer] = useState<PlayerData>(loadFromStorage);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [notificationHistory, setNotificationHistory] = useState<StoredNotification[]>(loadNotifHistory);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState<boolean>(loadUnread);
  const notificationTimers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  useEffect(() => {
    localStorage.setItem('reforge_player_v2', JSON.stringify(player));
  }, [player]);

  useEffect(() => {
    localStorage.setItem('reforge_notif_history', JSON.stringify(notificationHistory));
  }, [notificationHistory]);

  useEffect(() => {
    localStorage.setItem('reforge_notif_unread', hasUnreadNotifications ? 'true' : 'false');
  }, [hasUnreadNotifications]);

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
          const videoMap = (await videosRes.json()) as Record<string, string>;
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

  const syncToCloud = useCallback(async (data: PlayerData) => {
    if (!data.userId || data.userId.startsWith('local-') || data.userId.startsWith('local_')) return;
    try {
      // Ensure consumables are present before sync
      const syncData = {
        ...data,
        consumables: data.consumables || { healthPotions: 0, shadowScrolls: 0, ultOrbs: 0 }
      };
      
      await fetch(`${API_BASE}/api/player/${data.userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getPlayerAuthHeaders() },
        credentials: 'include',
        body: JSON.stringify(syncData)
      });
    } catch (e) {
      console.error('Cloud Sync Error', e);
    }
  }, []);

  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!player.userId || player.userId.startsWith('local-')) return;
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      syncToCloud(player);
    }, 2000);
    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, [player, syncToCloud]);

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
      if ((prev.lastDailyReset || 0) >= todayStart) return prev;

      // ── Snapshot yesterday's stats into history ──
      const yesterday = new Date(todayStart);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
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
        const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

        if (lastWorkout !== yesterdayStr) {
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
      // Track missed workouts this week
      const weekStart = new Date(todayStart);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Sunday
      const weekStartMs = weekStart.getTime();
      const weeklyMissedKey = `weeklyMissed_${weekStart.toISOString().split('T')[0]}`;
      const weeklyMissed = ((prev as any).weeklyWorkoutMisses || 0);

      // If it's a new week (Monday reset), check last week's misses
      if (weekStart.getDay() === 0 && daysSinceStart > 7) {
        const lastWeekMisses = ((prev as any).weeklyWorkoutMisses || 0);
        if (lastWeekMisses > 2) {
          // Extra penalty for skipping more than 2 workouts in a week
          xpPenalty = 50;
          updatedStats.discipline = Math.max(0, updatedStats.discipline - 10);
          updatedStats.willpower = Math.max(0, updatedStats.willpower - 10);
          updatedStats.strength = Math.max(0, updatedStats.strength - 5);
          newLogs.unshift({
            id: Math.random().toString(36).substring(2, 9),
            message: `WEEKLY AUDIT FAILED: ${lastWeekMisses} workouts missed (max 2). XP -${xpPenalty}, Discipline -10, Willpower -10, Strength -5.`,
            timestamp: now,
            type: 'WARNING'
          });
        }
      }

      // --- NUTRITION AUDIT: EXCEEDED CALORIES/MACROS ---
      const yesterdayNutritionStart = todayStart - (24*60*60*1000);
      const yesterdayLogs = retainedNutritionLogs.filter(l => l.timestamp >= yesterdayNutritionStart && l.timestamp < todayStart);
      if (yesterdayLogs.length > 0 && prev.healthProfile) {
        const macros = prev.healthProfile.macros;
        const totalCals = yesterdayLogs.reduce((s, l) => s + l.totalCalories, 0);
        const totalProtein = yesterdayLogs.reduce((s, l) => s + l.totalProtein, 0);
        const totalCarbs = yesterdayLogs.reduce((s, l) => s + l.totalCarbs, 0);
        const totalFats = yesterdayLogs.reduce((s, l) => s + l.totalFats, 0);

        if (macros && totalCals > macros.calories * 1.1) {
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
          if (macros.protein > 0 && totalProtein > macros.protein * 1.15) macroExceeded = true;
          if (macros.carbs > 0 && totalCarbs > macros.carbs * 1.15) macroExceeded = true;
          if (macros.fats > 0 && totalFats > macros.fats * 1.15) macroExceeded = true;
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
        dailyXp: Math.max(0, prev.dailyXp - xpPenalty),
        totalXp: Math.max(0, prev.totalXp - xpPenalty),
        stats: updatedStats,
        history: updatedHistory,
        logs: [...newLogs, ...prev.logs].slice(0, 60),
      };
    });
  }, []);

  useEffect(() => {
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
  }, [processDailyReset]);

  const registerUser = (profile: { id?: string; name?: string; username?: string; keys?: number; raw_data?: Partial<PlayerData>; replitUser?: ReplitUser }) => {
    setPlayer(prev => {
      const cloudData = (profile.raw_data || {}) as Partial<PlayerData>;
      const currentKeys = profile.keys !== undefined ? profile.keys : (cloudData.keys ?? prev.keys);

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

      const updated: PlayerData = {
        ...DEFAULT_PLAYER,
        ...prev,
        ...cloudData,
        userId: (profile.id as string) || prev.userId,
        name: (profile.name as string) || (cloudData.name as string) || prev.name,
        username: (profile.username as string) || (cloudData.username as string) || prev.username,
        keys: currentKeys,
        quests: currentQuests,
        isConfigured: true,
        replitUser: profile.replitUser || prev.replitUser,
        // Global assets: always keep locally-fetched global data, don't let per-user cloud data overwrite it
        focusVideos: { ...(cloudData.focusVideos || {}), ...prev.focusVideos },
        customProtocols: Object.keys(prev.customProtocols || {}).length > 0
          ? prev.customProtocols
          : (cloudData.customProtocols || {}),
      };
      return updated;
    });
    playSystemSoundEffect('SYSTEM');
  };

  const logout = async () => {
    try {
      if (player.userId && !player.userId.startsWith('local-') && !player.userId.startsWith('local_')) {
        await syncToCloud(player);
      }
    } catch (err) {
      console.error('Pre-logout sync error:', err);
    }
    try {
      await fetch(`${API_BASE}/api/auth/local/logout`, { method: 'POST', credentials: 'include' });
    } catch { /* ignore */ }
    localStorage.removeItem('reforge_player_v2');
    window.location.reload();
  };

  const consumeKey = async (amount: number = 1): Promise<boolean> => {
    if (player.keys >= amount) {
      setPlayer(prev => ({ ...prev, keys: prev.keys - amount }));
      return true;
    }
    return false;
  };

  const enterDungeon = async (isFree: boolean): Promise<boolean> => {
    let newState: PlayerData | null = null;
    if (isFree) {
      setPlayer(prev => {
        newState = { ...prev, lastDungeonEntry: Date.now() };
        return newState;
      });
    } else {
      const COST = 3;
      if (player.keys >= COST) {
        setPlayer(prev => {
          newState = {
            ...prev,
            keys: prev.keys - COST,
            logs: [createLog(`Dungeon Access Purchased (-${COST} Keys)`, 'PURCHASE'), ...prev.logs]
          };
          return newState;
        });
      } else {
        return false;
      }
    }
    
    // Force immediate sync to prevent refresh reset
    if (newState) {
      await syncToCloud(newState);
    }
    
    return true;
  };

  // --- DAILY REWARDS SYSTEM (30-Day Cycle) ---
  // REWARD_SCHEDULE imported from lib/rewards

  const getDailyReward = useCallback((): DailyReward | null => {
    const today = new Date().toISOString().split('T')[0];
    const lastLogin = player.lastLoginDate;

    // If already logged in today, no reward
    if (lastLogin === today) return null;

    // Determine streak
    let nextStreak = 1;
    if (lastLogin) {
      const lastDate = new Date(lastLogin);
      const currentDate = new Date();
      // Normalize to midnight for accurate diff
      lastDate.setHours(0,0,0,0);
      currentDate.setHours(0,0,0,0);
      
      const diffTime = Math.abs(currentDate.getTime() - lastDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

      if (diffDays === 1) {
        nextStreak = (player.streak || 0) + 1;
      }
    } else {
        // First time login ever starts at Day 1
        nextStreak = 1;
    }

    const rewardIndex = (nextStreak - 1) % 30;
    return REWARD_SCHEDULE[rewardIndex];
  }, [player.lastLoginDate, player.streak]);

  const claimDailyReward = (reward: DailyReward) => {
    const today = new Date().toISOString().split('T')[0];
    
    setPlayer(prev => {
      // Recalculate streak to be safe
      let nextStreak = 1;
      if (prev.lastLoginDate) {
          const lastDate = new Date(prev.lastLoginDate);
          const currentDate = new Date();
          lastDate.setHours(0,0,0,0);
          currentDate.setHours(0,0,0,0);
          const diffDays = Math.ceil(Math.abs(currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays === 1) nextStreak = (prev.streak || 0) + 1;
      }

      let { currentXp, requiredXp, level, totalXp, dailyXp, gold, keys, consumables } = prev;
      
      const safeConsumables = consumables || { healthPotions: 0, shadowScrolls: 0, ultOrbs: 0 };

      if (reward.type === 'GOLD') gold += reward.amount;
      if (reward.type === 'XP') {
        currentXp += reward.amount;
        totalXp += reward.amount;
        dailyXp += reward.amount;
      }
      if (reward.type === 'WELCOME_KEYS' || reward.type === 'KEYS' || reward.type === 'DUNGEON_PASS') keys += reward.amount;
      
      if (reward.type === 'HEALTH_POTION') safeConsumables.healthPotions += reward.amount;
      if (reward.type === 'SHADOW_SCROLL') safeConsumables.shadowScrolls += reward.amount;
      if (reward.type === 'ULT_ORB') safeConsumables.ultOrbs += reward.amount;

      let leveledUp = false;
      if (reward.type === 'XP') {
        while (currentXp >= requiredXp) {
          currentXp -= requiredXp;
          level++;
          requiredXp = Math.floor(requiredXp * 1.2);
          leveledUp = true;
        }
      }

      const logs = [createLog(`Daily Reward (Day ${nextStreak}): ${reward.message}`, 'SYSTEM'), ...prev.logs];
      if (leveledUp) {
        logs.unshift(createLog(`LEVEL UP! REACHED LEVEL ${level}`, 'LEVEL_UP'));
        playSystemSoundEffect('LEVEL_UP');
      }

      return {
        ...prev,
        lastLoginDate: today,
        streak: nextStreak,
        gold,
        keys,
        currentXp,
        requiredXp,
        level,
        totalXp,
        dailyXp,
        consumables: safeConsumables,
        logs,
        ...(leveledUp ? { hp: prev.maxHp, mp: prev.maxMp } : {})
      };
    });
  };

  const checkDailyLogin = useCallback((): DailyReward | null => {
    return getDailyReward();
  }, [player.lastLoginDate, player.streak]);

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

  const addRewards = (gold: number, xp: number, keys: number = 0, bonusItems?: { potions?: number; scrolls?: number; orbs?: number }) => {
    setPlayer(prev => {
      let { currentXp, requiredXp, level, totalXp, dailyXp } = prev;
      currentXp += xp;
      totalXp += xp;
      dailyXp += xp;

      let leveledUp = false;
      while (currentXp >= requiredXp) {
        currentXp -= requiredXp;
        level++;
        requiredXp = Math.floor(requiredXp * 1.2);
        leveledUp = true;
      }

      const newLogs = [...prev.logs];
      if (gold > 0 || keys > 0) newLogs.unshift(createLog(`Loot Acquired: ${gold} G, ${keys} Keys, ${xp} XP`, 'LOOT'));
      if (leveledUp) {
        newLogs.unshift(createLog(`LEVEL UP! REACHED LEVEL ${level}`, 'LEVEL_UP'));
        addNotification(`LEVEL UP! You are now Level ${level}`, 'LEVEL_UP');
        playSystemSoundEffect('LEVEL_UP');
      }

      const updatedConsumables = { ...prev.consumables };
      if (bonusItems) {
        if (bonusItems.potions) updatedConsumables.healthPotions = (updatedConsumables.healthPotions ?? 0) + bonusItems.potions;
        if (bonusItems.scrolls) updatedConsumables.shadowScrolls = (updatedConsumables.shadowScrolls ?? 0) + bonusItems.scrolls;
        if (bonusItems.orbs) updatedConsumables.ultOrbs = (updatedConsumables.ultOrbs ?? 0) + bonusItems.orbs;
      }

      return {
        ...prev,
        gold: prev.gold + gold,
        keys: prev.keys + keys,
        consumables: updatedConsumables,
        currentXp,
        requiredXp,
        level,
        totalXp,
        dailyXp,
        logs: newLogs,
        ...(leveledUp ? { hp: prev.maxHp, mp: prev.maxMp } : {})
      };
    });
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

      let leveledUp = false;
      while (currentXp >= requiredXp) {
        currentXp -= requiredXp;
        level++;
        requiredXp = Math.floor(requiredXp * 1.2);
        leveledUp = true;
      }

      const newLogs = [createLog(`Gained ${amount} XP (${source})`, 'XP'), ...prev.logs];
      if (leveledUp) {
        newLogs.unshift(createLog(`LEVEL UP! REACHED LEVEL ${level}`, 'LEVEL_UP'));
        addNotification(`LEVEL UP! You are now Level ${level}`, 'LEVEL_UP');
        playSystemSoundEffect('LEVEL_UP');
      }

      return {
        ...prev,
        currentXp,
        requiredXp,
        level,
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

      // ── SENSOR ANTI-CHEAT CHECK ──
      if (quest.sensorRequirements && !asMini) {
        const sr = quest.sensorRequirements;
        const sd = quest.sensorData;
        const flags: string[] = [];

        if (sr.steps && (!sd?.stepsRecorded || sd.stepsRecorded < sr.steps * 0.8)) {
          flags.push(`Steps: ${sd?.stepsRecorded ?? 0}/${sr.steps}`);
        }
        if (sr.distanceKm && (!sd?.distanceRecorded || sd.distanceRecorded < sr.distanceKm * 0.8)) {
          flags.push(`Distance: ${(sd?.distanceRecorded ?? 0).toFixed(2)}/${sr.distanceKm}km`);
        }
        if (sr.activeMinutes && (!sd?.activeMinutesRecorded || sd.activeMinutesRecorded < sr.activeMinutes * 0.7)) {
          flags.push(`Active: ${sd?.activeMinutesRecorded ?? 0}/${sr.activeMinutes}min`);
        }
        if ((sr.steps || sr.distanceKm) && sd?.maxSpeedKmh && sd.maxSpeedKmh > 50) {
          flags.push(`Speed anomaly: ${sd.maxSpeedKmh}km/h`);
        }
        if (sd?.stepsRecorded && sd.stepsRecorded > 0 && quest.createdAt) {
          const durationSec = (Date.now() - quest.createdAt) / 1000;
          if (durationSec > 0 && sd.stepsRecorded / durationSec > 4) {
            flags.push(`Cadence anomaly: ${(sd.stepsRecorded / durationSec).toFixed(1)} steps/sec`);
          }
        }

        if (flags.length > 0) {
          // Treat as anomaly — burn pact, no rewards, record strike
          quests[qIndex] = { ...quest, isCompleted: true, completedAsMini: asMini, pactStatus: hasPact ? 'burned' : quest.pactStatus, sensorTracking: false };
          playSystemSoundEffect('DANGER');
          const flagStr = flags.join(', ');
          const newLogs = [createLog(`Sensor Anomaly: ${quest.title} — ${flagStr}${hasPact ? ` — ${pactAmount}G BURNED` : ''}`, 'WARNING'), ...prev.logs];
          return { ...prev, quests, logs: newLogs, cheatStrikes: (prev.cheatStrikes || 0) + 1 };
        }
      }

      // ── HONEST COMPLETION ──
      quests[qIndex] = { ...quest, isCompleted: true, completedAsMini: asMini, pactStatus: hasPact ? 'honored' : quest.pactStatus, sensorTracking: false };

      const RANK_GOLD: Record<string, number> = { E: 10, D: 20, C: 40, B: 80, A: 150, S: 300 };
      const baseXpReward = asMini ? Math.floor(quest.xpReward * 0.1) : quest.xpReward;
      // 1.25x XP bonus for optional-rank pacts (E, D, C) that were honored
      const reward = (isOptionalPact && !asMini) ? Math.floor(baseXpReward * 1.25) : baseXpReward;
      const goldReward = asMini ? 5 : (RANK_GOLD[quest.rank] || 20);
      // Return pledged Gold on honest completion
      const pactReturn = hasPact ? pactAmount : 0;

      const stats = { ...prev.stats };
      const dailyStats = { ...prev.dailyStats };
      const weeklyStats = { ...prev.weeklyStats };
      const monthlyStats = { ...prev.monthlyStats };
      const questCategories = quest.categories || (quest.category ? [quest.category] : []);
      const statGain = asMini ? 0.2 : 1;
      for (const cat of questCategories) {
        stats[cat] = (stats[cat] || 0) + statGain;
        dailyStats[cat] = (dailyStats[cat] || 0) + statGain;
        weeklyStats[cat] = (weeklyStats[cat] || 0) + statGain;
        monthlyStats[cat] = (monthlyStats[cat] || 0) + statGain;
      }

      let { currentXp, requiredXp, level, totalXp, dailyXp } = prev;
      currentXp += reward;
      totalXp += reward;
      dailyXp += reward;

      let leveledUp = false;
      while (currentXp >= requiredXp) {
        currentXp -= requiredXp;
        level++;
        requiredXp = Math.floor(requiredXp * 1.2);
        leveledUp = true;
      }

      const pactBonusTag = isOptionalPact && !asMini ? ' [PACT 1.25x]' : '';
      const pactReturnTag = pactReturn > 0 ? ` (+${pactReturn}G Pledge Returned)` : '';
      const newLogs = [createLog(`Completed Quest: ${quest.title} (+${reward} XP${pactBonusTag})${pactReturnTag}`, 'XP'), ...prev.logs];
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
        totalXp,
        dailyXp,
        logs: newLogs,
        ...(leveledUp ? { hp: prev.maxHp, mp: prev.maxMp } : {})
      };
    });

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

  const buyConsumable = (type: 'healthPotion' | 'shadowScroll' | 'ultOrb') => {
    const costs: Record<string, { gold?: number; keys?: number; label: string; field: keyof PlayerData['consumables'] }> = {
      healthPotion: { gold: 100, label: 'Health Potion', field: 'healthPotions' },
      shadowScroll: { gold: 150, label: 'Shadow Scroll', field: 'shadowScrolls' },
      ultOrb: { keys: 3, label: 'ULT Refill Orb', field: 'ultOrbs' },
    };
    const c = costs[type];
    if (c.gold !== undefined) {
      if (player.gold < c.gold) { addNotification('Insufficient Coins', 'WARNING'); return; }
      setPlayer(prev => ({
        ...prev,
        gold: prev.gold - c.gold!,
        consumables: { ...prev.consumables, [c.field]: (prev.consumables?.[c.field] ?? 0) + 1 },
        logs: [createLog(`Purchased: ${c.label} (-${c.gold} G)`, 'PURCHASE'), ...prev.logs],
      }));
    } else if (c.keys !== undefined) {
      if (player.keys < c.keys) { addNotification('Insufficient Keys', 'WARNING'); return; }
      setPlayer(prev => ({
        ...prev,
        keys: prev.keys - c.keys!,
        consumables: { ...prev.consumables, [c.field]: (prev.consumables?.[c.field] ?? 0) + 1 },
        logs: [createLog(`Purchased: ${c.label} (-${c.keys} Keys)`, 'PURCHASE'), ...prev.logs],
      }));
    }
    addNotification(`${c.label} acquired!`, 'PURCHASE');
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
  type WorkoutRewardType = 'XP' | 'GOLD' | 'KEYS' | 'HEALTH_POTION' | 'SHADOW_SCROLL' | 'ULT_ORB';
  interface WorkoutReward { type: WorkoutRewardType; amount: number; label: string; }

  const generateWorkoutRewards = (anomalyPoints: number = 0): WorkoutReward[] => {
    const pool: { type: WorkoutRewardType; weight: number; min: number; max: number; label: string }[] = [
      { type: 'XP', weight: 30, min: 50, max: 150, label: 'XP' },
      { type: 'GOLD', weight: 30, min: 20, max: 80, label: 'Gold' },
      { type: 'KEYS', weight: 15, min: 1, max: 2, label: 'Keys' },
      { type: 'HEALTH_POTION', weight: 10, min: 1, max: 1, label: 'Health Potion' },
      { type: 'SHADOW_SCROLL', weight: 10, min: 1, max: 1, label: 'Shadow Scroll' },
      { type: 'ULT_ORB', weight: 5, min: 1, max: 1, label: 'Ult Orb' },
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
    const penaltyExceeded = anomalyPoints > 5;
    
    let rewards: WorkoutReward[] = [];
    if (penaltyExceeded) {
      rewards = [];
    } else if (isCustomWorkout) {
      rewards = [
        { type: 'XP', amount: Math.floor(Math.random() * 101) + 100, label: 'XP' },
        { type: 'GOLD', amount: Math.floor(Math.random() * 101) + 100, label: 'Gold' },
      ];
      if (Math.random() > 0.5) {
        rewards.push({ type: 'HEALTH_POTION', amount: 1, label: 'Health Potion' });
      } else {
        rewards.push({ type: 'SHADOW_SCROLL', amount: 1, label: 'Shadow Scroll' });
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
        const today = new Date().toISOString().split('T')[0];
        return { ...prev, logs: newLogs, lastWorkoutDate: today };
      }

      // Sum up XP and Gold from rewards
      let xpReward = 0;
      let goldReward = 0;
      let keyReward = 0;
      let potionReward = 0;
      let scrollReward = 0;
      let orbReward = 0;

      for (const r of rewards) {
        switch (r.type) {
          case 'XP': xpReward += r.amount; break;
          case 'GOLD': goldReward += r.amount; break;
          case 'KEYS': keyReward += r.amount; break;
          case 'HEALTH_POTION': potionReward += r.amount; break;
          case 'SHADOW_SCROLL': scrollReward += r.amount; break;
          case 'ULT_ORB': orbReward += r.amount; break;
        }
      }

      // Base XP from exercises still applies (unless custom workout)
      let totalXpGain = 0;
      let totalGoldGain = 0;

      if (isCustomWorkout) {
        totalXpGain = xpReward;
        totalGoldGain = goldReward;
      } else {
        const baseXp = exercisesCompleted * 50;
        const bonusXp = intensityModifier ? 100 : 0;
        totalXpGain = baseXp + bonusXp + xpReward;
        totalGoldGain = Math.floor((baseXp + bonusXp) / 10) + goldReward;
      }

      const stats = { ...prev.stats };
      stats.strength += 2;
      stats.discipline += 1;
      if (intensityModifier) stats.strength += 1;

      const newPBs = { ...prev.personalBests };
      Object.entries(results).forEach(([key, val]) => {
        if (!newPBs[key] || val > newPBs[key]) newPBs[key] = val;
      });

      let { currentXp, requiredXp, level, totalXp, dailyXp } = prev;
      currentXp += totalXpGain;
      totalXp += totalXpGain;
      dailyXp += totalXpGain;

      let leveledUp = false;
      while (currentXp >= requiredXp) {
        currentXp -= requiredXp;
        level++;
        requiredXp = Math.floor(requiredXp * 1.2);
        leveledUp = true;
      }

      const penaltyTag = '';
      const newLogs = [
        createLog(`Workout Completed: ${exercisesCompleted}/${totalExercises} Exercises (+${totalXpGain} XP, +${totalGoldGain} Gold)${penaltyTag}`, 'WORKOUT'),
        ...prev.logs
      ];
      if (leveledUp) {
        newLogs.unshift(createLog(`LEVEL UP! REACHED LEVEL ${level}`, 'LEVEL_UP'));
        playSystemSoundEffect('LEVEL_UP');
      }

      const today = new Date().toISOString().split('T')[0];
      const prevDate = prev.lastWorkoutDate || '';
      let newStreak = prev.streak;
      if (prevDate === today) {
        newStreak = prev.streak;
      } else {
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        newStreak = prevDate === yesterday ? prev.streak + 1 : 1;
      }

      const consumables = { ...prev.consumables };
      consumables.healthPotions += potionReward;
      consumables.shadowScrolls += scrollReward;
      consumables.ultOrbs += orbReward;

      return {
        ...prev,
        currentXp,
        requiredXp,
        level,
        totalXp,
        dailyXp,
        stats,
        personalBests: newPBs,
        gold: prev.gold + totalGoldGain,
        keys: prev.keys + keyReward,
        consumables,
        logs: newLogs,
        streak: newStreak,
        lastWorkoutDate: today,
        ...(leveledUp ? { hp: prev.maxHp, mp: prev.maxMp } : {})
      };
    });

    if (penaltyExceeded) {
      addNotification('Workout Voided — Too many anomalies detected. No rewards granted.', 'WARNING');
      triggerDuskMessage(`Workout VOIDED: ${exercisesCompleted}/${totalExercises} exercises attempted but ${anomalyPoints} anomaly violations detected. No rewards granted — the hunter tried to cheat the system.`);
    } else {
      const rewardSummary = rewards.map(r => `${r.amount} ${r.label}`).join(', ');
      addNotification(`Workout Complete! Rewards: ${rewardSummary}`, 'SUCCESS');
      triggerDuskMessage(`Workout Completed: ${exercisesCompleted}/${totalExercises} exercises done. Intensity: ${intensityModifier ? 'HIGH' : 'NORMAL'}. Rewards: ${rewardSummary}.`);
    }

    // Persist to workouts table (fire-and-forget)
    if (player.userId && !player.userId.startsWith('local-') && !player.userId.startsWith('local_')) {
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
    }

    return rewards;
  };

  const failWorkout = () => {
    addNotification('Workout Aborted. No Rewards.', 'WARNING');
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
        const deduction = Math.floor(currentXp * 0.2);
        currentXp -= deduction;
        logs.unshift(createLog(`Anomaly Strike ${strikes}/5: -20% XP. ${5 - strikes} violation(s) remaining before permanent ban.`, 'WARNING'));
        playSystemSoundEffect('DANGER');
      } else if (strikes >= 2) {
        const deduction = Math.floor(currentXp * 0.1);
        currentXp -= deduction;
        logs.unshift(createLog(`Anomaly Strike ${strikes}/5: -10% XP. ${5 - strikes} violation(s) remaining before permanent ban.`, 'WARNING'));
        playSystemSoundEffect('DANGER');
      } else {
        logs.unshift(createLog(`Anomaly Strike ${strikes}/5 issued. ${5 - strikes} violation(s) remaining before permanent ban.`, 'WARNING'));
        playSystemSoundEffect('DANGER');
      }
      addNotification(`Anomaly Strike ${strikes}/5 — ${5 - strikes} remaining`, 'DANGER');
      const trustScore = Math.max(0, (prev.trustScore ?? 100) - 15);
      return { ...prev, cheatStrikes: strikes, trustScore, currentXp: Math.max(0, currentXp), level, logs };
    });

    // Persist strike to DB via dedicated endpoint (fire-and-forget, outside state updater)
    setTimeout(() => {
      if (capturedUserId && !capturedUserId.startsWith('local')) {
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

  const purchaseOutfit = useCallback((outfit: { id: string; name: string; cost: number }) => {
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
        logs: [createLog(`Purchased: ${outfit.name} (-${outfit.cost}G)`, 'PURCHASE'), ...prev.logs]
      };
    });
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
    buyConsumable,
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
    consumeKey,
    checkDailyLogin,
    claimDailyReward,
    deductGold,
    addRewards,
    enterDungeon,
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
  };
};

