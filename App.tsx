import React, { useState, useEffect, useCallback, useRef, lazy, Suspense, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import StoneDropAnim from './components/StoneDropAnim';
import BatchStoneAnim, { BatchStoneEntry } from './components/BatchStoneAnim';
import BadgeUnlockAnim from './components/BadgeUnlockAnim';
import Layout from './components/Layout';
import Navigation from './components/Navigation';
import MobileFloatingMenu from './components/MobileFloatingMenu';
import SystemPersonalizationScreen from './components/SystemPersonalizationScreen';
import AuthView from './components/AuthView';
import SignInPage from './components/SignInPage';
import CreateAccountPage from './components/CreateAccountPage';
import LogoutChoiceScreen from './components/LogoutChoiceScreen';
import SystemMessage from './components/SystemMessage';
import ErrorBoundary from './components/ErrorBoundary';
import {
  SkeletonStatsChart, SkeletonStatBoxes, SkeletonLevelProgress,
  SkeletonWardrobePreview, SkeletonRankProgression, SkeletonUpcomingQuests,
  SkeletonDashboardWidgets, SkeletonForgeGuard,
  SkeletonQuestsPage, SkeletonShopPage, SkeletonCastlePage,
  SkeletonAlliancePage, SkeletonGrowthPage, SkeletonHealthPage,
  SkeletonRankingPage, SkeletonProfilePage, SkeletonAdminPage,
  SkeletonOnboardingPage, SkeletonGenericPage,
} from './components/SkeletonLoaders';

import { useSystem, isLocalUser } from './hooks/useSystem';
import { useSensors } from './hooks/useSensors';
import { Tab, CoreStats, HealthProfile, Outfit, DbOutfit, TierLevel, PlayerData, Quest, DailyReward, MealType } from './types';
import { App as CapApp } from '@capacitor/app';
import { OUTFITS } from './utils/gameData';
import { DAILY_REWARDS_ENABLED } from './lib/rewards';
import { getPlayerAuthHeaders, getOrRefreshPlayerHeaders } from './lib/playerApi';
import { Terminal } from 'lucide-react';
import { API_BASE } from './lib/apiConfig';
import {
  checkNotificationPermissionStatus,
  requestNotificationPermission,
  scheduleMorningDusk,
  scheduleStreakReminder,
  scheduleWorkoutReminder,
  scheduleLeaderboardNudge,
  scheduleComebackPing,
  scheduleQuestDeadline,
} from './hooks/useLocalNotifications';

// ── Existing lazy imports ──
const DailyLoginModal = lazy(() => import('./components/DailyLoginModal'));
const AdminLogin = lazy(() => import('./components/AdminLogin'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const QuestsView = lazy(() => import('./components/QuestsView'));
const ShopView = lazy(() => import('./components/ShopView'));
const GrowthView = lazy(() => import('./components/GrowthView'));
const HealthView = lazy(() =>
  import('./components/HealthView').then(m => ({ default: m.HealthView }))
);

const StatBoxes = lazy(() => import('./components/StatBoxes'));
const LevelUpCinematic = lazy(() => import('./components/LevelUpCinematic'));
const WelcomeIntro = lazy(() => import('./components/WelcomeIntro'));
const PenaltyZone = lazy(() => import('./components/PenaltyZone'));
const TournamentResultModal = lazy(() => import('./components/TournamentResultModal'));
const TutorialOverlay = lazy(() => import('./components/TutorialOverlay'));
const DemonCastle = lazy(() => import('./components/DemonCastle'));
const UpcomingQuests = lazy(() => import('./components/UpcomingQuests'));
// ── New lazy imports ──
const SystemAgreement = lazy(() => import('./components/SystemAgreement'));
const CalibrationFlow = lazy(() => import('./components/CalibrationFlow'));
const NameOnboarding = lazy(() => import('./components/NameOnboarding'));
// AvatarGenerator removed — no longer needed
const DuskChat = lazy(() => import('./components/DuskChat'));
const XpCollectionOverlay = lazy(() => import('./components/XpCollectionOverlay'));
const CheatWarningModal = lazy(() => import('./components/CheatWarningModal'));
const LevelDownCinematic = lazy(() => import('./components/LevelDownCinematic'));
const BanScreen = lazy(() => import('./components/BanScreen'));
const BanReversalNotice = lazy(() => import('./components/BanReversalNotice'));
const LeaderboardView = lazy(() => import('./components/LeaderboardView'));
const LevelProgressCard = lazy(() => import('./components/LevelProgressCard'));
// WardrobePreviewCard moved to ShopView — no longer needed here
const RankProgressionCard = lazy(() => import('./components/RankProgressionCard'));
const PlayerStatusCard = lazy(() => import('./components/PlayerStatusCard'));
const DashboardWidgets = lazy(() => import('./components/DashboardWidgets'));
const EarlyCompletionPenalty = lazy(() => import('./components/EarlyCompletionPenalty'));
const AuditTheater = lazy(() => import('./components/AuditTheater'));
const DuskWelcomeScreen = lazy(() => import('./components/DuskWelcomeScreen'));
const ProfileView = lazy(() => import('./components/ProfileView'));
const RankUpCinematic = lazy(() => import('./components/RankUpCinematic'));
const SystemPactScreen = lazy(() => import('./components/SystemPactScreen'));
const ConfettiOverlay = lazy(() => import('./components/ConfettiOverlay'));
const StrikeLiftedModal = lazy(() => import('./components/StrikeLiftedModal'));
const ForgeGuardWidget = lazy(() => import('./components/ForgeGuardWidget'));
const StreakCelebration = lazy(() => import('./components/StreakCelebration'));
const ChestOpeningOverlay = lazy(() => import('./components/ChestOpeningOverlay'));

// ── Types ──
type OnboardingPhase = 'SPLASH' | 'WELCOME' | 'AGREEMENT' | 'NAMING' | 'CALIBRATION' | 'AUTH' | 'AUTH_SIGN_IN_PAGE' | 'AUTH_CREATE_PAGE' | 'APP' | 'LOGOUT_CHOICE';

// ── SessionStorage helpers ──
const SS_USER = 'reforge_temp_user';
const SS_HEALTH = 'reforge_temp_health';
const SS_STATS = 'reforge_temp_stats';

function ssSet(key: string, value: unknown) {
  try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}
function ssGet<T>(key: string): T | null {
  try { const v = sessionStorage.getItem(key); return v ? JSON.parse(v) as T : null; } catch { return null; }
}
function ssClear() {
  try { sessionStorage.removeItem(SS_USER); sessionStorage.removeItem(SS_HEALTH); sessionStorage.removeItem(SS_STATS); } catch { /* ignore */ }
}

interface XpCollectionState {
  startRect: DOMRect | null;
  xpGained: number;
  currentXp: number;
  requiredXp: number;
  level: number;
}

const App: React.FC = () => {
  const {
    player, setPlayer, notifications,
    notificationHistory, hasUnreadNotifications, markNotificationsRead, clearNotificationHistory,
    registerUser, addQuest, completeQuest, failQuest, failFlaggedQuest, resetQuest, deleteQuest,
    purchaseItem, buyConsumable, addNotification,
    removeNotification, saveHealthProfile, updateProfile,
    logMeal, deleteMeal, completeWorkoutSession, failWorkout,
    advanceTutorial, completeTutorial, resetTutorial, resetPlayer, resolvePenalty, reducePenalty,
    claimTournamentReward, consumeKey,
    deductGold, enterDungeon, addRewards,
    recordStrike, removeStrike, markDuskMessagesRead,
    startSensorTracking, stopSensorTracking, updateQuestSensorData,
    verifyTicket, purchaseOutfit, equipOutfit,
    checkDailyLogin, updateSkillProgress,
    updateServerBaseline, awardOutfitStones,
  } = useSystem();

  const sensors = useSensors();

  const [showChestOpening, setShowChestOpening] = useState(false);

  // ── Sensor tracking handlers ──
  const handleStartTracking = useCallback(async (questId: string, requirements?: { steps?: number; distanceKm?: number; activeMinutes?: number }) => {
    const perms = await sensors.requestPermissions();
    if (!perms.location && !perms.motion) {
      addNotification('Sensor permissions denied. Enable Location & Motion in device settings.', 'WARNING');
      return;
    }
    const started = await sensors.startTracking(questId, requirements);
    if (started) {
      startSensorTracking(questId);
      addNotification('Tracking started — GPS & step counter active.', 'SUCCESS');
    }
  }, [sensors, startSensorTracking, addNotification]);

  const handleStopTracking = useCallback(async (questId: string) => {
    const snap = await sensors.stopTracking();
    if (snap) {
      stopSensorTracking(questId, {
        stepsRecorded: snap.stepsRecorded,
        distanceRecorded: snap.distanceRecorded,
        activeMinutesRecorded: snap.activeMinutesRecorded,
        locationPath: snap.locationPath,
        maxSpeedKmh: snap.maxSpeedKmh,
      });
      sensors.finalizeTracking(questId);
    } else {
      stopSensorTracking(questId);
    }
  }, [sensors, stopSensorTracking]);

  // Keep refs in sync so the interval callback always reads fresh values
  const sensorSnapRef = useRef(sensors.snapshot);
  const sensorQuestRef = useRef(sensors.activeQuestId);
  useEffect(() => { sensorSnapRef.current = sensors.snapshot; }, [sensors.snapshot]);
  useEffect(() => { sensorQuestRef.current = sensors.activeQuestId; }, [sensors.activeQuestId]);

  // Sync sensor snapshot → quest sensorData every 3s while tracking.
  // IMPORTANT: sensors.snapshot must NOT be in the dep array — the native
  // polling updates it every 3s which would clear+recreate the interval
  // perpetually, preventing the callback from ever firing.
  useEffect(() => {
    if (!sensors.tracking) return;
    const interval = setInterval(() => {
      const snap = sensorSnapRef.current;
      const qid = sensorQuestRef.current;
      if (snap && qid) {
        updateQuestSensorData(qid, {
          stepsRecorded: snap.stepsRecorded,
          distanceRecorded: snap.distanceRecorded,
          activeMinutesRecorded: snap.activeMinutesRecorded,
          locationPath: snap.locationPath,
          maxSpeedKmh: snap.maxSpeedKmh,
        });
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [sensors.tracking, updateQuestSensorData]); // eslint-disable-line react-hooks/exhaustive-deps

  const [dbOutfits, setDbOutfits] = useState<Outfit[]>([]);
  const [dailyReward, setDailyReward] = useState<DailyReward | null>(null);
  const [showDailyLogin, setShowDailyLogin] = useState(false);

  // ── Food scan banner listener ──
  useEffect(() => {
    const onStart = () => setFoodScanBannerVisible(true);
    const onEnd = () => setFoodScanBannerVisible(false);
    window.addEventListener('foodscan:start', onStart);
    window.addEventListener('foodscan:end', onEnd);
    return () => {
      window.removeEventListener('foodscan:start', onStart);
      window.removeEventListener('foodscan:end', onEnd);
    };
  }, []);

  // ── Notification opt-in (in-app prompt for Android <13 where system auto-grants) ──
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);
  const notifOptKey = `reforge_notif_opted_${player.userId || 'local'}`;

  useEffect(() => {
    if (!player.userId || isLocalUser(player.userId) || !player.isConfigured) return;
    const opted = localStorage.getItem(notifOptKey);
    if (opted === 'yes') {
      // Already opted in — schedule silently
      (async () => {
        await requestNotificationPermission();
        await _scheduleAllNotifications();
      })();
    } else if (opted === null) {
      // First-time user — detect Android version via permission status
      (async () => {
        const status = await checkNotificationPermissionStatus();
        if (status === 'prompt') {
          // Android 13+ — system has a native permission dialog, use it directly
          const granted = await requestNotificationPermission();
          localStorage.setItem(notifOptKey, granted ? 'yes' : 'no');
          if (granted) await _scheduleAllNotifications();
        } else if (status === 'granted') {
          // Android <13 — OS auto-granted without asking; show in-app prompt
          setShowNotifPrompt(true);
        }
        // status === 'denied' → already denied or not native, skip
      })();
    }
    // opted === 'no' → user declined, skip scheduling
  }, [player.userId, player.isConfigured]); // eslint-disable-line react-hooks/exhaustive-deps

  const _scheduleAllNotifications = async () => {
    const today = new Date().toLocaleDateString('en-CA');
    const hasWorkedOutToday = player.lastWorkoutDate === today;
    const hasDailyXp = (player.dailyXp || 0) > 0;
    await scheduleMorningDusk();
    await scheduleWorkoutReminder(hasWorkedOutToday);
    await scheduleStreakReminder(player.streak, hasWorkedOutToday);
    await scheduleLeaderboardNudge(hasDailyXp);
    await scheduleComebackPing();
    for (const q of player.quests) {
      if (!q.isCompleted && !q.failed && q.expiresAt) {
        await scheduleQuestDeadline(q.id, q.title, q.expiresAt);
      }
    }
  };

  const handleNotifOptIn = async (accept: boolean) => {
    setShowNotifPrompt(false);
    localStorage.setItem(notifOptKey, accept ? 'yes' : 'no');
    if (accept) {
      await requestNotificationPermission();
      await _scheduleAllNotifications();
    }
  };

  // Persist onboarding phase so auth pages survive page reload
  const savedPhase = sessionStorage.getItem('reforge_onboarding_phase') as OnboardingPhase | null;
  const logoutFlowRef = useRef(
    savedPhase === 'AUTH_SIGN_IN_PAGE' || savedPhase === 'AUTH_CREATE_PAGE' || savedPhase === 'CALIBRATION'
  );

  const [loading, setLoading] = useState(!savedPhase);

  const [onboardingPhase, setOnboardingPhase] = useState<OnboardingPhase>(() => {
    if (savedPhase) return savedPhase;
    return player.isConfigured ? 'APP' : 'SPLASH';
  });
  const authInitialMode: 'SIGN_IN' | 'CREATE' = 'SIGN_IN';
  const [showLogoutChoice, setShowLogoutChoice] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('DASHBOARD');
  const tabHistoryRef = useRef<Tab[]>(['DASHBOARD']);
  const [healthViewKey, setHealthViewKey] = useState(0);

  // ── Tab navigation with history for Android back button ──
  const navigateTo = useCallback((tab: Tab) => {
    setActiveTab(prev => {
      if (prev !== tab) tabHistoryRef.current.push(prev);
      return tab;
    });
  }, []);

  // ── Food scan banner (shown on non-HEALTH tabs when scan is running) ──
  const [foodScanBannerVisible, setFoodScanBannerVisible] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(() => window.location.pathname === '/shadow-council');
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminToken, setAdminToken] = useState('');
  const [isNewUserOnboarding, setIsNewUserOnboarding] = useState(false);
  const [highlightDungeon, setHighlightDungeon] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [showLevelDown, setShowLevelDown] = useState(false);
  const [showNav, setShowNav] = useState(true);
  const handleToggleNav = useCallback((v: boolean) => setShowNav(v), []);
  const [rankUpData, setRankUpData] = useState<{ oldRank: string; newRank: string } | null>(null);
  const prevRankRef = useRef<string | null>(null);
  const banReversalShownRef = useRef(false);

  const [isDungeonMode, setIsDungeonMode] = useState(false);
  const [dungeonSession, setDungeonSession] = useState(0);
  const [tutorialTarget, setTutorialTarget] = useState<string | null>(null);
  const [tutorialAnalysisFailed, setTutorialAnalysisFailed] = useState(false);
  const [showDuskChat, setShowDuskChat] = useState(false);
  const [showBanReversalNotice, setShowBanReversalNotice] = useState(false);
  const [strikeLiftedNotifId, setStrikeLiftedNotifId] = useState<string | null>(null);

  const [mentorMessages, setMentorMessages] = useState<{id: string, text: string}[]>([]);

  // ── Android back button (history-based) ──
  useEffect(() => {
    let backPressedOnce = false;
    let backPressTimer: ReturnType<typeof setTimeout> | null = null;

    const handler = CapApp.addListener('backButton', () => {
      // 1. If any overlay is open, close it first
      if (isDungeonMode) return; // dungeon handles its own back
      if (showDuskChat) { setShowDuskChat(false); return; }
      if (showLogoutChoice) { setShowLogoutChoice(false); return; }
      if (showLevelUp) { setShowLevelUp(false); return; }
      if (showLevelDown) { setShowLevelDown(false); return; }

      // 2. Pop history stack
      const history = tabHistoryRef.current;
      if (history.length > 1) {
        const prev = history.pop()!;
        setActiveTab(prev);
        return;
      }

      // 3. At root — double-press to exit
      if (backPressedOnce) {
        if (backPressTimer) clearTimeout(backPressTimer);
        CapApp.exitApp();
        return;
      }
      backPressedOnce = true;
      backPressTimer = setTimeout(() => { backPressedOnce = false; }, 2000);
      addNotification('Press back again to exit', 'SYSTEM');
    });

    return () => {
      handler.then(h => h.remove());
      if (backPressTimer) clearTimeout(backPressTimer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDungeonMode, showDuskChat, showLogoutChoice, showLevelUp, showLevelDown]);

  // ── Stone Drop & Badge Unlock global animations ──
  // Single-stone animation (for lone awards like quests/workouts)
  const [stoneAnim, setStoneAnim] = useState<{ outfitId: string; amount: number; oldCount: number; newCount: number; color: string; glow: string } | null>(null);
  // Batch animation (for dungeon cash-outs with multiple stone types)
  const [batchStoneAnim, setBatchStoneAnim] = useState<BatchStoneEntry[] | null>(null);
  const [badgeAnim, setBadgeAnim] = useState<{ tierIndex: number; outfitId: string } | null>(null);

  // ── Swipe-to-change-tab ──────────────────────────────────────────────────────
  const NAV_TAB_ORDER: Tab[] = ['DASHBOARD', 'HEALTH', 'QUESTS', 'STORE', 'LEADERBOARD'];
  const swipeTouchStart = useRef<{ x: number; y: number; inScrollable: boolean } | null>(null);

  const _isInsideHorizontalScroll = (el: EventTarget | null): boolean => {
    let node = el as HTMLElement | null;
    while (node && node !== document.body) {
      if (node.scrollWidth > node.clientWidth + 4) {
        const style = window.getComputedStyle(node);
        const ox = style.overflowX;
        if (ox === 'auto' || ox === 'scroll' || (ox === 'hidden' && node.dataset.swipeIgnore !== undefined)) return true;
      }
      node = node.parentElement;
    }
    return false;
  };

  const handleSwipeTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    swipeTouchStart.current = { x: t.clientX, y: t.clientY, inScrollable: _isInsideHorizontalScroll(e.target) };
  }, []);

  const handleSwipeTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!swipeTouchStart.current) return;
    const start = swipeTouchStart.current;
    swipeTouchStart.current = null;
    // Don't hijack swipe if it started inside a horizontal-scrollable element
    if (start.inScrollable) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    // Only count horizontal swipes (dx dominant, min 80px, ratio 2:1)
    if (Math.abs(dx) < 80 || Math.abs(dx) < Math.abs(dy) * 2) return;
    const idx = NAV_TAB_ORDER.indexOf(activeTab);
    if (idx === -1) return;
    const next = dx < 0 ? NAV_TAB_ORDER[idx + 1] : NAV_TAB_ORDER[idx - 1];
    if (next) navigateTo(next);
  }, [activeTab, navigateTo]); // eslint-disable-line react-hooks/exhaustive-deps

  // Batching system: buffer rapid-fire events, then decide single vs batch
  const stoneBatchBuffer = useRef<Array<{ outfitId: string; amount: number; oldCount: number; newCount: number; color: string; glow: string }>>([]);
  const stoneBatchTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stoneAnimBusy    = useRef(false);

  const flushStoneBatch = useCallback(() => {
    const batch = [...stoneBatchBuffer.current];
    stoneBatchBuffer.current = [];
    stoneBatchTimer.current = null;
    if (batch.length === 0) { stoneAnimBusy.current = false; return; }

    // Merge duplicates by outfitId (sum amounts, keep final newCount)
    const merged = new Map<string, typeof batch[0]>();
    for (const entry of batch) {
      const existing = merged.get(entry.outfitId);
      if (existing) {
        existing.amount += entry.amount;
        existing.newCount = Math.max(existing.newCount, entry.newCount);
      } else {
        merged.set(entry.outfitId, { ...entry });
      }
    }
    const items = Array.from(merged.values());

    stoneAnimBusy.current = true;
    if (items.length === 1) {
      setStoneAnim(items[0]);
    } else {
      setBatchStoneAnim(items);
    }
  }, []);

  useEffect(() => {
    const onStoneEarned = (e: Event) => {
      const d = (e as CustomEvent).detail as { outfitId: string; amount: number; oldCount: number; newCount: number; color: string; glow: string; badgeUnlocked: boolean };
      if (d.badgeUnlocked) return;
      const entry = { outfitId: d.outfitId, amount: d.amount, oldCount: d.oldCount, newCount: d.newCount, color: d.color, glow: d.glow };

      // If an animation is already showing, queue for after it finishes
      stoneBatchBuffer.current.push(entry);

      // Debounce: wait 200ms for more events before deciding single vs batch
      if (stoneBatchTimer.current) clearTimeout(stoneBatchTimer.current);
      if (!stoneAnimBusy.current) {
        stoneBatchTimer.current = setTimeout(flushStoneBatch, 200);
      }
    };
    const onBadgeUnlocked = (e: Event) => {
      const d = (e as CustomEvent).detail as { tierIndex: number; outfitId: string };
      // Badge unlock takes priority — cancel any pending stone anims
      stoneBatchBuffer.current = [];
      if (stoneBatchTimer.current) { clearTimeout(stoneBatchTimer.current); stoneBatchTimer.current = null; }
      setStoneAnim(null); setBatchStoneAnim(null); stoneAnimBusy.current = false;
      setBadgeAnim({ tierIndex: d.tierIndex, outfitId: d.outfitId });
    };
    window.addEventListener('stone:earned',   onStoneEarned);
    window.addEventListener('badge:unlocked', onBadgeUnlocked);
    return () => {
      window.removeEventListener('stone:earned',   onStoneEarned);
      window.removeEventListener('badge:unlocked', onBadgeUnlocked);
      if (stoneBatchTimer.current) clearTimeout(stoneBatchTimer.current);
    };
  }, [flushStoneBatch]);

  // ── Streak Celebration ──
  const [showStreakCelebration, setShowStreakCelebration] = useState(false);
  const [streakAnimData, setStreakAnimData] = useState<{
    oldStreak: number; newStreak: number; weeklyActivity: boolean[]; streakBroken: boolean;
  } | null>(null);
  const streakShownRef = useRef<string | null>(null); // Tracks which userId+date combo was shown

  // ── Sync from DB — callable ref for immediate triggers + 2s polling ──
  const syncFromDbRef = useRef<() => Promise<void>>();
  // Track last known DB values so we only overwrite local gold/keys when admin changes them
  const lastKnownDbGold = useRef<number | null>(null);
  const lastKnownDbKeys = useRef<number | null>(null);
  useEffect(() => {
    if (!player.userId || isLocalUser(player.userId)) return;
    banReversalShownRef.current = false;
    // Reset tracking refs on user change
    lastKnownDbGold.current = null;
    lastKnownDbKeys.current = null;
    const syncFromDb = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/player/${player.userId}`, { credentials: 'include', headers: { ...getPlayerAuthHeaders() } });
        if (!res.ok) return;
        const row = await res.json();
        const rawData = row.raw_data as Partial<PlayerData> | null;
        if (!rawData) return;
        const dbBanned  = rawData.isBanned       ?? false;
        const dbStrikes = rawData.cheatStrikes   ?? 0;
        const dbGold    = rawData.gold           ?? 0;
        const dbKeys    = rawData.keys           ?? 0;
        const dbTotalStrikes = rawData.totalStrikesEver ?? 0;

        // Determine if gold/keys changed in DB since our last poll.
        // If DB value changed → admin or server modified it → apply to local state.
        // If DB value is same as last poll → keep local values (user has pending changes).
        const goldChangedInDb = lastKnownDbGold.current !== null && dbGold !== lastKnownDbGold.current;
        const keysChangedInDb = lastKnownDbKeys.current !== null && dbKeys !== lastKnownDbKeys.current;
        const isFirstPoll = lastKnownDbGold.current === null;
        lastKnownDbGold.current = dbGold;
        lastKnownDbKeys.current = dbKeys;

        // KEY FIX: When admin changes gold/keys in DB, update the server
        // baseline refs so the debounced sync in useSystem won't compute
        // a wrong delta and double-count the admin adjustment.
        if (isFirstPoll || goldChangedInDb || keysChangedInDb) {
          updateServerBaseline(dbGold, dbKeys);
        }

        setPlayer(prev => {
          const updates: Partial<PlayerData> = {};
          if (dbBanned !== prev.isBanned) {
            updates.isBanned = dbBanned;
            if (!dbBanned && prev.isBanned && !banReversalShownRef.current) {
              banReversalShownRef.current = true;
              setTimeout(() => setShowBanReversalNotice(true), 50);
            }
          }
          if (dbStrikes !== prev.cheatStrikes)           updates.cheatStrikes    = dbStrikes;
          if (dbTotalStrikes !== prev.totalStrikesEver)  updates.totalStrikesEver = dbTotalStrikes;

          // Gold/Keys: Only overwrite local if DB value changed (admin adjustment)
          // or on first poll (initial load from server)
          if (isFirstPoll) {
            if (dbGold !== prev.gold) updates.gold = dbGold;
            if (dbKeys !== prev.keys) updates.keys = dbKeys;

            // ── Outfit persistence: restore from server on first poll ──
            // Uses union/max so that neither server nor local can lose purchases
            // (covers page reload, cleared localStorage, and code redeploys)
            if (rawData.unlockedOutfits) {
              const union = Array.from(new Set([
                ...(prev.unlockedOutfits || ['outfit_starter']),
                ...(rawData.unlockedOutfits as string[]),
              ]));
              if (union.length !== (prev.unlockedOutfits || []).length ||
                  union.some(id => !(prev.unlockedOutfits || []).includes(id))) {
                updates.unlockedOutfits = union;
              }
            }
            if (rawData.outfitStones && typeof rawData.outfitStones === 'object') {
              const serverStones = rawData.outfitStones as Record<string, number>;
              const merged: Record<string, number> = { ...serverStones };
              for (const [k, v] of Object.entries(prev.outfitStones || {})) {
                merged[k] = Math.max(merged[k] || 0, v);
              }
              // Only update if it differs
              const differs = Object.keys(merged).some(k => (prev.outfitStones || {})[k] !== merged[k]);
              if (differs) updates.outfitStones = merged;
            }
            if (rawData.equippedOutfitId && rawData.equippedOutfitId !== prev.equippedOutfitId) {
              updates.equippedOutfitId = rawData.equippedOutfitId as string;
            }
          } else {
            if (goldChangedInDb && dbGold !== prev.gold) updates.gold = dbGold;
            if (keysChangedInDb && dbKeys !== prev.keys) updates.keys = dbKeys;
          }

          return Object.keys(updates).length > 0 ? { ...prev, ...updates } : prev;
        });

        // Check for pending strike_lifted notifications
        const pendingNotifs = Array.isArray(row.pending_notifications) ? row.pending_notifications : [];
        const strikeLiftedNotif = pendingNotifs.find((n: any) => n.type === 'strike_lifted');
        if (strikeLiftedNotif && !strikeLiftedNotifId) {
          setStrikeLiftedNotifId(strikeLiftedNotif.id);
        }
      } catch { /* ignore */ }
    };
    syncFromDbRef.current = syncFromDb;
    syncFromDb();
    const interval = setInterval(syncFromDb, 2000);
    // Listen for immediate sync triggers (e.g. after recordStrike server success)
    const onSyncNeeded = () => syncFromDb();
    window.addEventListener('reforge:sync-needed', onSyncNeeded);
    return () => { clearInterval(interval); window.removeEventListener('reforge:sync-needed', onSyncNeeded); };
  }, [player.userId]); // eslint-disable-line react-hooks/exhaustive-deps
  const [showCheatWarning, setShowCheatWarning] = useState(false);
  const [xpCollection, setXpCollection] = useState<XpCollectionState | null>(null);
  const [tempHealthProfile, setTempHealthProfile] = useState<HealthProfile | undefined>();
  const [tempStats, setTempStats] = useState<CoreStats | undefined>();
  const [tempUserData, setTempUserData] = useState<{ country: string; tz: string } | undefined>();
  const [pendingPenalty, setPendingPenalty] = useState<{
    questId: string; questTitle: string; asMini: boolean;
    rect?: DOMRect; elapsedMinutes: number; minDurationMinutes: number;
    xpGained: number; xpBefore: number; requiredXp: number; level: number; goldGained: number;
  } | null>(null);

  // -- Audit Theater State --
  const [showAuditTheater, setShowAuditTheater] = useState(false);
  const [auditOutcome, setAuditOutcome] = useState<'verified' | 'flagged'>('verified');
  const [pendingAuditQuest, setPendingAuditQuest] = useState<{
    id: string; title: string; rank: string; asMini: boolean; rect?: DOMRect;
    xpGained: number; xpBefore: number; requiredXp: number; level: number; goldGained: number;
  } | null>(null);

  const [showPactScreen, setShowPactScreen] = useState(false);
  const [pendingPactQuest, setPendingPactQuest] = useState<Quest | null>(null);

  const isPenalty = player.isPenaltyActive;

  // Persist onboarding phase to sessionStorage so logout auth pages survive reload
  useEffect(() => {
    const persistPhases: OnboardingPhase[] = ['AUTH_SIGN_IN_PAGE', 'AUTH_CREATE_PAGE', 'CALIBRATION'];
    if (persistPhases.includes(onboardingPhase)) {
      sessionStorage.setItem('reforge_onboarding_phase', onboardingPhase);
    } else {
      sessionStorage.removeItem('reforge_onboarding_phase');
      logoutFlowRef.current = false;
    }
  }, [onboardingPhase]);

  // Restore session after page reload / localStorage clear
  useEffect(() => {
    if (player.isConfigured) return;
    // Don't override phase when user is in a logout-initiated flow
    if (logoutFlowRef.current) return;
    const restoreAfterAuth = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/local/whoami`, { credentials: 'include', headers: { ...getPlayerAuthHeaders() } });
        if (!res.ok) return;
        const whoamiData = await res.json();
        const user = whoamiData?.user || whoamiData;
        if (!user?.id && !user?.supabase_id) return;
        const uid = user.id || user.supabase_id;
        if (whoamiData.playerToken) localStorage.setItem('reforge_player_token', whoamiData.playerToken);

        // Returning user — try to load their full player record from the DB.
        // This handles localStorage being cleared (mobile, new device, private mode, etc.)
        // while the Google session cookie is still valid.
        try {
          const playerRes = await fetch(`${API_BASE}/api/player/${uid}`, { credentials: 'include', headers: { ...getPlayerAuthHeaders() } });
          if (playerRes.ok) {
            const row = await playerRes.json();
            const rawData = row.raw_data as Partial<PlayerData> | null;
            if (rawData?.isConfigured || rawData?.avatarUrl) {
              registerUser({ id: uid, name: user.firstName || user.name || rawData.name, username: rawData.username, keys: rawData.keys, raw_data: rawData });
              return;
            }
          }
        } catch { /* no DB record yet, fall through to calibration restore */ }

        // New user mid-calibration — restore sessionStorage wizard progress
        const savedUser = ssGet<{ country: string; tz: string }>(SS_USER);
        const savedHealth = ssGet<HealthProfile>(SS_HEALTH);
        const savedStats = ssGet<CoreStats>(SS_STATS);
        if (savedUser) setTempUserData(savedUser);
        if (savedHealth) setTempHealthProfile(savedHealth);
        if (savedStats) setTempStats(savedStats);
        if (savedUser || savedHealth || savedStats) {
          setPlayer(prev => ({
            ...prev,
            userId: uid || prev.userId,
            ...(savedUser ? { country: savedUser.country, timezone: savedUser.tz } : {}),
            ...(savedHealth ? { healthProfile: savedHealth } : {}),
            ...(savedStats ? { stats: savedStats } : {}),
          }));
        }
        if (savedHealth && savedStats) {
          setOnboardingPhase('AUTH');
        } else if (savedUser) {
          setOnboardingPhase('CALIBRATION');
        }
      } catch { /* not authenticated, let normal flow proceed */ }
    };
    restoreAfterAuth();
  }, []);

  useEffect(() => {
    if (logoutFlowRef.current) return;
    if (player.isConfigured) setOnboardingPhase('APP');
  }, [player.isConfigured]);

  // Fetch DB outfits — runs on mount when configured, and re-runs on window focus
  // so changes saved in the admin panel are always reflected without a hard reload
  const fetchDbOutfits = useCallback(() => {
    if (!player.isConfigured) return;
    fetch(`${API_BASE}/api/store/outfits`)
      .then(r => r.json())
      .then((rows: DbOutfit[]) => {
        if (!Array.isArray(rows) || rows.length === 0) return;
        const converted: Outfit[] = rows.map(o => {
          // Fallback: if DB has empty image/video URLs, try static OUTFITS
          const staticMatch = OUTFITS.find(s => s.id === o.outfit_key);
          return {
            id: o.outfit_key,
            name: o.name,
            description: o.description,
            tier: o.tier as TierLevel,
            image: o.image_url || staticMatch?.image || '',
            baseStats: { attack: o.attack, boost: o.boost, extraction: o.extraction, ultimate: o.ultimate },
            cost: o.cost,
            accentColor: o.accent_color,
            introVideoUrl: staticMatch?.introVideoUrl || o.intro_video_url || '',
            loopVideoUrl: staticMatch?.loopVideoUrl || o.loop_video_url || '',
            isDefault: o.is_default,
            buffs: staticMatch?.buffs || [],
          };
        });
        setDbOutfits(converted);
      })
      .catch(() => { /* silently fall back to static OUTFITS */ });
  }, [player.isConfigured]);

  useEffect(() => {
    fetchDbOutfits();
    const onFocus = () => fetchDbOutfits();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchDbOutfits]);

  // Deferred daily login check — persistent guard via localStorage
  useEffect(() => {
    if (!DAILY_REWARDS_ENABLED) return;
    // Wait until configured and tutorial is complete before showing daily login
    if (!player.isConfigured) return;
    if (isNewUserOnboarding && !player.tutorialComplete) return;

    // Persistent guard: only show the modal once per calendar day
    const today = new Date().toISOString().split('T')[0];
    const shownDate = localStorage.getItem('reforge_daily_modal_shown');
    if (shownDate === today) return;

    const reward = checkDailyLogin();
    if (reward) {
      localStorage.setItem('reforge_daily_modal_shown', today);
      setDailyReward(reward);
      setShowDailyLogin(true);
    }
  }, [player.isConfigured, player.tutorialComplete, isNewUserOnboarding, checkDailyLogin]);

  // ── Streak Celebration Trigger ──
  // Fires EXACTLY ONCE per calendar day per user on first login.
  // Scoped by userId so switching accounts triggers it for the new account.
  useEffect(() => {
    // Must be configured with a real user
    if (!player.isConfigured || !player.userId) return;

    // Compute today's local date string
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const today = `${y}-${m}-${d}`;

    // Only trigger when lastLoginDate is set to today (set by useSystem auto-streak)
    if (player.lastLoginDate !== today) return;

    // Per-user + per-day guard (handles account switching + page reload)
    const guardKey = `reforge_streak_shown_${player.userId}_${today}`;
    const sessionKey = `${player.userId}_${today}`;
    if (streakShownRef.current === sessionKey) return; // Already shown this session for this user+day
    if (localStorage.getItem(guardKey)) return; // Already shown (persists across reloads)

    // Mark as shown IMMEDIATELY
    streakShownRef.current = sessionKey;
    localStorage.setItem(guardKey, '1');

    // Detect if streak was broken (reset to 1 from a higher value)
    const isBroken = player.streak === 1 && oldStreakRef.current > 1;
    const previousStreak = isBroken ? oldStreakRef.current : Math.max(0, player.streak - 1);

    // Compute weekly activity (Mon=0 ... Sun=6)
    const dow = now.getDay(); // 0=Sun, 1=Mon...
    const mondayOffset = dow === 0 ? -6 : 1 - dow;
    const weekly: boolean[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(now);
      date.setDate(now.getDate() + mondayOffset + i);
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const inHistory = (player.history || []).some(h => h.date === dateStr);
      const isToday = dateStr === today;
      weekly.push(inHistory || isToday);
    }

    setStreakAnimData({
      oldStreak: previousStreak,
      newStreak: player.streak,
      weeklyActivity: weekly,
      streakBroken: isBroken,
    });
    setShowStreakCelebration(true);
  }, [player.isConfigured, player.lastLoginDate, player.userId]); // userId in deps → triggers on account switch

  // Track previous streak value to detect breaks
  const oldStreakRef = useRef(player.streak);
  useEffect(() => {
    // Update the ref AFTER the streak trigger has had a chance to read it
    const timer = setTimeout(() => { oldStreakRef.current = player.streak; }, 100);
    return () => clearTimeout(timer);
  }, [player.streak]);

  // Global event listener for level up (much more reliable than checking logs)
  useEffect(() => {
    const handleLevelUp = (e: Event) => {
      const level = (e as CustomEvent).detail?.level;
      if (level) {
        setShowLevelUp(true);
      }
    };
    window.addEventListener('player:levelup', handleLevelUp);
    return () => window.removeEventListener('player:levelup', handleLevelUp);
  }, []);

  useEffect(() => {
    if (player.logs.length > 0 && player.logs[0].type === 'LEVEL_DOWN') {
      const diff = Date.now() - player.logs[0].timestamp;
      if (diff < 5000) setShowLevelDown(true);
    }
  }, [player.logs, player.level]);

  useEffect(() => {
    const currentRank = player.rank;
    if (prevRankRef.current !== null && prevRankRef.current !== currentRank && player.isConfigured) {
      const rankOrder = ['E', 'D', 'C', 'B', 'A', 'S'];
      const oldIdx = rankOrder.indexOf(prevRankRef.current);
      const newIdx = rankOrder.indexOf(currentRank);
      if (newIdx > oldIdx) {
        setRankUpData({ oldRank: prevRankRef.current, newRank: currentRank });
      }
    }
    prevRankRef.current = currentRank;
  }, [player.rank, player.isConfigured]);

  useEffect(() => {
    if (!isDungeonMode) setShowNav(true);
  }, [activeTab, isDungeonMode]);


  const handleTutorialNext = () => {
    const nextStep = player.tutorialStep + 1;
    if (nextStep === 5) setActiveTab('QUESTS');
    if (nextStep === 17) setActiveTab('HEALTH');
    if (nextStep === 19) setActiveTab('DASHBOARD');
    advanceTutorial(nextStep);
  };

  const handleTutorialComplete = () => completeTutorial();

  useEffect(() => {
    if (!player.tutorialComplete) {
      if (player.tutorialStep === 12 && player.quests.length > 0) {
        setTutorialTarget(`quest-card-${player.quests[0].id}`);
      } else if (player.tutorialStep === 13) {
        const q = player.quests.find(q => q.id.includes('init_q1'));
        if (q) setTutorialTarget(`quest-card-${q.id}`);
      } else if (player.tutorialStep === 14) {
        const q = player.quests.find(q => q.id.includes('init_q2'));
        if (q) setTutorialTarget(`quest-card-${q.id}`);
      } else if (player.tutorialStep === 15) {
        const q = player.quests.find(q => q.id.includes('init_q3'));
        if (q) setTutorialTarget(`quest-card-${q.id}`);
      } else {
        setTutorialTarget(null);
      }
    }
  }, [player.tutorialStep, player.quests, player.tutorialComplete]);

  useEffect(() => {
    if (player.tutorialComplete || player.tutorialStep < 13 || player.tutorialStep > 15) return;

    const welcomeQuest1 = player.quests.find(q => q.id.includes('init_q1'));
    const welcomeQuest2 = player.quests.find(q => q.id.includes('init_q2'));
    const welcomeQuest3 = player.quests.find(q => q.id.includes('init_q3'));

    const isUnavailable = (quest?: Quest) => !quest || quest.isCompleted || quest.failed;

    if (player.tutorialStep === 13 && isUnavailable(welcomeQuest1)) {
      advanceTutorial(14);
      return;
    }

    if (player.tutorialStep === 14 && isUnavailable(welcomeQuest2)) {
      advanceTutorial(15);
      return;
    }

    if (player.tutorialStep === 15 && isUnavailable(welcomeQuest3)) {
      advanceTutorial(16);
    }
  }, [player.tutorialComplete, player.tutorialStep, player.quests, advanceTutorial]);

  const handleStartDungeon = async (isFree: boolean) => {
    const allowed = await enterDungeon(isFree);
    if (allowed) {
      setDungeonSession(prev => prev + 1);
      setIsDungeonMode(true);
      setActiveTab('CASTLE');
    }
  };

  const handleQuestComplete = (id: string, asMini: boolean = false, rect?: DOMRect) => {
    const quest = player.quests.find(q => q.id === id);
    if (!quest || quest.isCompleted || quest.failed) return;
    const xpBefore = player.currentXp;
    const levelBefore = player.level;
    const requiredXpBefore = player.requiredXp;
    const xpGained = asMini ? Math.floor((quest.xpReward || 50) * 0.1) : (quest.xpReward || 50);
    const goldGained = asMini ? 5 : 20;

    // Time Gate Check (EarlyCompletionPenalty)
    if (quest.minDurationMinutes && quest.minDurationMinutes > 0) {
      const startTime = quest.createdAt;
      const elapsedMinutes = (Date.now() - startTime) / 60000;
      const threshold = quest.minDurationMinutes * 0.6;
      if (elapsedMinutes < threshold) {
        setPendingPenalty({
          questId: id, questTitle: quest.title, asMini, rect,
          elapsedMinutes, minDurationMinutes: quest.minDurationMinutes,
          xpGained, xpBefore, requiredXp: requiredXpBefore, level: levelBefore, goldGained,
        });
        return;
      }
    }

    // -- Audit Theater Interception --
    const isTutorialQuest = quest.id.startsWith('init_');
    const rank = quest.rank;
    const isHighRank = rank === 'A' || rank === 'S';
    
    let triggerAudit = false;
    if (!isTutorialQuest) {
      if (isHighRank) {
        triggerAudit = true;
      } else if (Math.random() < 0.4) {
        triggerAudit = true;
      }
    }

    if (triggerAudit) {
      // Pre-calculate outcome
      const todayString = new Date().toDateString();
      const todayHighRankCompletions = player.quests.filter(q => 
        (q.rank === 'A' || q.rank === 'S') && 
        q.isCompleted && 
        new Date(q.lastCompletedAt || 0).toDateString() === todayString
      ).length;

      const isFirstS = rank === 'S' && !player.quests.some(q => q.rank === 'S' && q.isCompleted);
      
      const hasCheatStrikes = player.cheatStrikes >= 2;
      const tooManyHighRanksToday = isHighRank && todayHighRankCompletions >= 3;

      let outcome: 'verified' | 'flagged' = 'verified';
      if (hasCheatStrikes || tooManyHighRanksToday || isFirstS) {
        outcome = 'flagged';
      }

      setAuditOutcome(outcome);
      setPendingAuditQuest({
        id, title: quest.title, rank, asMini, rect,
        xpGained, xpBefore, requiredXp: requiredXpBefore, level: levelBefore, goldGained
      });
      setShowAuditTheater(true);
      return; // Stop here, AuditTheater will call finishQuestComplete when dismissed
    }

    // Default flow if no interception
    finishQuestComplete(id, asMini, rect, xpGained, xpBefore, requiredXpBefore, levelBefore, goldGained);
  };

  const finishQuestComplete = (
    id: string, asMini: boolean, rect: DOMRect | undefined,
    xpGained: number, xpBefore: number, requiredXp: number, level: number, goldGained: number
  ) => {
    const quest = player.quests.find(q => q.id === id);
    const hasPact = quest?.hasPact && quest?.pactStatus === 'active';
    completeQuest(id, asMini);
    if (rect) {
      setXpCollection({ startRect: rect, xpGained, currentXp: xpBefore, requiredXp, level });
    }
    window.dispatchEvent(new CustomEvent('reforge:coin-earned', { detail: { goldGained, startRect: rect ?? null } }));
    // Confetti — large for pact-honored, small for regular
    window.dispatchEvent(new CustomEvent('reforge:confetti', {
      detail: { intensity: hasPact ? 'large' : 'small', origin: rect ?? null }
    }));
    if (hasPact) {
      addNotification(`Pact Honored. ${quest.pactAmount}G Returned. +1.25x XP Bonus.`, 'SUCCESS');
    }
    if (player.tutorialStep === 13) advanceTutorial(14);
    if (player.tutorialStep === 14) advanceTutorial(15);
    if (player.tutorialStep === 15) { advanceTutorial(16); }
  };

  const handlePenaltyAcknowledge = () => {
    if (!pendingPenalty) return;
    const { questId } = pendingPenalty;
    setPendingPenalty(null);
    recordStrike();
    failFlaggedQuest(questId);
  };

  const handleAuditVerified = () => {
    if (!pendingAuditQuest) return;
    const q = pendingAuditQuest;
    setShowAuditTheater(false);
    setPendingAuditQuest(null);
    finishQuestComplete(q.id, q.asMini, q.rect, q.xpGained, q.xpBefore, q.requiredXp, q.level, q.goldGained);
  };

  const handleAuditFlagged = () => {
    if (!pendingAuditQuest) return;
    const q = pendingAuditQuest;
    
    // Silent background fetch to log the audit
    fetch(`${API_BASE}/api/audit/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questId: q.id,
        questRank: q.rank,
        outcome: 'flagged',
        timestamp: new Date().toISOString()
      }),
      credentials: 'include'
    }).catch(() => {});

    setShowAuditTheater(false);
    setPendingAuditQuest(null);
    finishQuestComplete(q.id, q.asMini, q.rect, q.xpGained, q.xpBefore, q.requiredXp, q.level, q.goldGained);
  };

  // ── System Pact handlers ──
  const handleShowPact = useCallback((quest: Quest) => {
    setPendingPactQuest(quest);
    setShowPactScreen(true);
  }, []);

  const handlePactAccept = useCallback((pledgeAmount: number) => {
    if (!pendingPactQuest) return;
    const deducted = deductGold(pledgeAmount);
    if (!deducted) return;
    const questWithPact: Quest = {
      ...pendingPactQuest,
      hasPact: true,
      pactAmount: pledgeAmount,
      pactStatus: 'active',
    };
    addQuest(questWithPact);
    addNotification(`Shadow Pledge Sealed: ${pledgeAmount}G Locked`, 'SYSTEM');
    fetch(`${API_BASE}/api/system-pact/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        quest_id: questWithPact.id,
        quest_title: questWithPact.title,
        quest_rank: questWithPact.rank,
        pledge_amount: pledgeAmount,
      }),
    }).catch(() => {});
    setShowPactScreen(false);
    setPendingPactQuest(null);
    if (player.tutorialStep === 11) advanceTutorial(12);
  }, [pendingPactQuest, deductGold, addQuest, addNotification, player.tutorialStep, advanceTutorial]);

  const handlePactDecline = useCallback(() => {
    if (!pendingPactQuest) return;
    const questNoPact: Quest = {
      ...pendingPactQuest,
      hasPact: false,
      pactAmount: 0,
      pactStatus: 'none',
    };
    addQuest(questNoPact);
    addNotification('Quest activated without pledge.', 'SYSTEM');
    setShowPactScreen(false);
    setPendingPactQuest(null);
    if (player.tutorialStep === 11) advanceTutorial(12);
  }, [pendingPactQuest, addQuest, addNotification, player.tutorialStep, advanceTutorial]);

  // ── Loading Screen — black sword loader ──
  if (loading) {
    return <SystemPersonalizationScreen onComplete={() => setLoading(false)} />;
  }

  // ── Admin ──
  if (showAdminLogin) {
    return (
      <Suspense fallback={<SkeletonAdminPage />}>
        <ErrorBoundary fallbackLabel="Admin login failed to load">
          <AdminLogin
            onLoginSuccess={(token: string) => { setAdminToken(token); setShowAdminLogin(false); setIsAdmin(true); }}
            onBack={() => { setShowAdminLogin(false); window.history.replaceState({}, '', '/'); }}
          />
        </ErrorBoundary>
      </Suspense>
    );
  }

  if (isAdmin) {
    return (
      <Suspense fallback={<SkeletonAdminPage />}>
        <ErrorBoundary fallbackLabel="Admin dashboard failed to load">
          <AdminDashboard adminToken={adminToken} onLogout={() => { setIsAdmin(false); setAdminToken(''); window.history.replaceState({}, '', '/'); }} />
        </ErrorBoundary>
      </Suspense>
    );
  }

  // ── Ban Screen ──
  if (player.isBanned) {
    return (
      <Suspense fallback={<SkeletonGenericPage />}>
        <ErrorBoundary fallbackLabel="Ban screen failed">
          <BanScreen
            userId={player.userId}
            onAdminUnban={() => {
              setPlayer(prev => ({ ...prev, isBanned: false, cheatStrikes: 0 }));
              setShowBanReversalNotice(true);
            }}
          />
        </ErrorBoundary>
      </Suspense>
    );
  }

  // ── New User Onboarding ──
  if (onboardingPhase !== 'APP') {
    if (onboardingPhase === 'SPLASH') {
      return <SystemPersonalizationScreen onComplete={() => setOnboardingPhase('WELCOME')} />;
    }
    if (onboardingPhase === 'WELCOME') {
      return (
        <Suspense fallback={<SkeletonOnboardingPage />}>
          <DuskWelcomeScreen onComplete={() => setOnboardingPhase('AGREEMENT')} />
        </Suspense>
      );
    }
    if (onboardingPhase === 'AGREEMENT') {
      return (
        <Suspense fallback={<SkeletonOnboardingPage />}>
          <ErrorBoundary fallbackLabel="Agreement failed">
            <SystemAgreement onComplete={() => setOnboardingPhase('NAMING')} />
          </ErrorBoundary>
        </Suspense>
      );
    }
    if (onboardingPhase === 'NAMING') {
      return (
        <Suspense fallback={<SkeletonOnboardingPage />}>
          <ErrorBoundary fallbackLabel="Naming failed">
            <NameOnboarding
              onComplete={(country: string, tz: string) => {
                const userData = { country, tz };
                setTempUserData(userData);
                ssSet(SS_USER, userData);
                setOnboardingPhase('CALIBRATION');
              }}
            />
          </ErrorBoundary>
        </Suspense>
      );
    }
    if (onboardingPhase === 'CALIBRATION') {
      return (
        <Suspense fallback={<SkeletonOnboardingPage />}>
          <ErrorBoundary fallbackLabel="Calibration failed">
            <CalibrationFlow
              onComplete={(profile: HealthProfile, stats: CoreStats) => {
                setTempHealthProfile(profile);
                setTempStats(stats);
                ssSet(SS_HEALTH, profile);
                ssSet(SS_STATS, stats);
                // If we came from logout recalibrate, go to sign-in page, otherwise regular auth
                setOnboardingPhase(logoutFlowRef.current ? 'AUTH_SIGN_IN_PAGE' : 'AUTH');
              }}
            />
          </ErrorBoundary>
        </Suspense>
      );
    }
    if (onboardingPhase === 'AUTH') {
      return (
        <AuthView
          initialMode={authInitialMode}
          onLogin={(profile) => {
            const cloudData = (profile as any).raw_data as Partial<PlayerData> | undefined;
            const merged = {
              ...profile,
              ...(tempUserData ? {
                country: tempUserData.country,
                timezone: tempUserData.tz,
              } : {}),
              ...(tempHealthProfile ? { healthProfile: tempHealthProfile } : {}),
              ...(tempStats ? { stats: tempStats } : {}),
            };
            registerUser(merged);
            // Only force startDate for truly new users (no cloud data)
            if (!cloudData?.startDate) {
              setPlayer(prev => ({ ...prev, startDate: prev.startDate || Date.now() }));
            }
            if (!(cloudData?.tutorialComplete ?? (merged as any).tutorialComplete)) setIsNewUserOnboarding(true);
            ssClear();
            setOnboardingPhase('APP');
          }}
        />
      );
    }
    if (onboardingPhase === 'AUTH_SIGN_IN_PAGE') {
      return (
        <SignInPage
          onLogin={(profile) => {
            logoutFlowRef.current = false;
            const cloudData = (profile as any).raw_data as Partial<PlayerData> | undefined;
            const merged = {
              ...profile,
              ...(tempUserData ? {
                country: tempUserData.country,
                timezone: tempUserData.tz,
              } : {}),
              ...(tempHealthProfile ? { healthProfile: tempHealthProfile } : {}),
              ...(tempStats ? { stats: tempStats } : {}),
            };
            registerUser(merged);
            if (!cloudData?.startDate) {
              setPlayer(prev => ({ ...prev, startDate: prev.startDate || Date.now() }));
            }
            if (!(cloudData?.tutorialComplete ?? (merged as any).tutorialComplete)) setIsNewUserOnboarding(true);
            ssClear();
            setOnboardingPhase('APP');
          }}
          onNavigate={(dest) => setOnboardingPhase(dest)}
        />
      );
    }
    if (onboardingPhase === 'AUTH_CREATE_PAGE') {
      return (
        <CreateAccountPage
          onLogin={(profile) => {
            logoutFlowRef.current = false;
            const cloudData = (profile as any).raw_data as Partial<PlayerData> | undefined;
            const merged = {
              ...profile,
              ...(tempUserData ? {
                country: tempUserData.country,
                timezone: tempUserData.tz,
              } : {}),
              ...(tempHealthProfile ? { healthProfile: tempHealthProfile } : {}),
              ...(tempStats ? { stats: tempStats } : {}),
            };
            registerUser(merged);
            if (!cloudData?.startDate) {
              setPlayer(prev => ({ ...prev, startDate: prev.startDate || Date.now() }));
            }
            if (!(cloudData?.tutorialComplete ?? (merged as any).tutorialComplete)) setIsNewUserOnboarding(true);
            ssClear();
            setOnboardingPhase('APP');
          }}
          onNavigate={(dest) => setOnboardingPhase(dest)}
        />
      );
    }
  }

  // ── Welcome Intro (for users who logged in via old flow) ──
  if (showWelcome) {
    return (
      <Suspense fallback={<SkeletonOnboardingPage />}>
        <WelcomeIntro onComplete={() => setShowWelcome(false)} />
      </Suspense>
    );
  }

  // ── Penalty Zone ──
  if (isPenalty) {
    return (
      <Suspense fallback={<SkeletonGenericPage />}>
        <ErrorBoundary fallbackLabel="Penalty zone failed to load">
          <PenaltyZone
            endTime={player.penaltyEndTime}
            task={player.penaltyTask}
            gold={player.gold}
            onSurvive={resolvePenalty}
            reducePenalty={reducePenalty}
            onSacrifice={() => {
              if (player.gold >= 500) {
                purchaseItem({ id: 'penalty-bribe', title: 'Divine Intervention', description: 'Skip Penalty', cost: 500, icon: 'lock' });
                resolvePenalty();
              }
            }}
          />
        </ErrorBoundary>
      </Suspense>
    );
  }

  const shouldShowNav = showNav && !isDungeonMode;

  return (
    <>
      <SystemMessage notifications={notifications} removeNotification={removeNotification} />

      {/* ── Overlays ── */}
      <Suspense fallback={null}>
        <AnimatePresence>
          {DAILY_REWARDS_ENABLED && showDailyLogin && (
            <ErrorBoundary>
              <DailyLoginModal 
                onClose={() => {
                  setShowDailyLogin(false);
                  setDailyReward(null);
                }}
                onChestReward={() => {
                  setShowDailyLogin(false);
                  setDailyReward(null);
                  setShowChestOpening(true);
                }}
              />
            </ErrorBoundary>
          )}
          {showStreakCelebration && streakAnimData && (
            <Suspense fallback={null}>
              <ErrorBoundary>
                <StreakCelebration
                  oldStreak={streakAnimData.oldStreak}
                  newStreak={streakAnimData.newStreak}
                  outfitId={player.equippedOutfitId}
                  weeklyActivity={streakAnimData.weeklyActivity}
                  streakBroken={streakAnimData.streakBroken}
                  onComplete={() => {
                    setShowStreakCelebration(false);
                    setStreakAnimData(null);
                    // Re-schedule streak reminder for tomorrow (workout already done today)
                    if (player.streak >= 1) {
                      scheduleStreakReminder(player.streak, true).catch(() => {});
                    }
                  }}
                />
              </ErrorBoundary>
            </Suspense>
          )}
          {showChestOpening && (
            <Suspense fallback={null}>
              <ErrorBoundary>
                <ChestOpeningOverlay
                  chestType="LEGENDARY"
                  onClose={() => setShowChestOpening(false)}
                />
              </ErrorBoundary>
            </Suspense>
          )}
          {showLevelUp && (
            <ErrorBoundary>
              <LevelUpCinematic level={player.level} onComplete={() => setShowLevelUp(false)} />
            </ErrorBoundary>
          )}
          {showLevelDown && (
            <ErrorBoundary>
              <LevelDownCinematic onClose={() => setShowLevelDown(false)} />
            </ErrorBoundary>
          )}
          {rankUpData && (
            <ErrorBoundary>
              <RankUpCinematic
                oldRank={rankUpData.oldRank as 'E'|'D'|'C'|'B'|'A'|'S'}
                newRank={rankUpData.newRank as 'E'|'D'|'C'|'B'|'A'|'S'}
                onComplete={() => setRankUpData(null)}
              />
            </ErrorBoundary>
          )}
          {player.tournament.pendingReward && (
            <ErrorBoundary>
              <TournamentResultModal reward={player.tournament.pendingReward} onClaim={claimTournamentReward} />
            </ErrorBoundary>
          )}
          {showDuskChat && (
            <ErrorBoundary>
              <DuskChat
                player={player}
                onClose={() => setShowDuskChat(false)}
                onMarkRead={markDuskMessagesRead}
              />
            </ErrorBoundary>
          )}
          {xpCollection && (
            <ErrorBoundary>
              <XpCollectionOverlay
                startRect={xpCollection.startRect}
                xpGained={xpCollection.xpGained}
                currentXp={xpCollection.currentXp}
                requiredXp={xpCollection.requiredXp}
                level={xpCollection.level}
                onComplete={() => setXpCollection(null)}
              />
            </ErrorBoundary>
          )}
          {showBanReversalNotice && (
            <Suspense fallback={null}>
              <ErrorBoundary>
                <BanReversalNotice onClose={() => setShowBanReversalNotice(false)} />
              </ErrorBoundary>
            </Suspense>
          )}
          {strikeLiftedNotifId && (
            <Suspense fallback={null}>
              <StrikeLiftedModal
                visible={true}
                onAcknowledge={async () => {
                  if (player.userId && strikeLiftedNotifId) {
                    try {
                      await fetch(`${API_BASE}/api/player/${player.userId}/notification/${strikeLiftedNotifId}`, {
                        method: 'DELETE',
                        headers: { ...getPlayerAuthHeaders() },
                        credentials: 'include',
                      });
                    } catch { /* ignore */ }
                  }
                  setStrikeLiftedNotifId(null);
                }}
              />
            </Suspense>
          )}
          {showCheatWarning && (
            <ErrorBoundary>
              <CheatWarningModal
                strikes={player.cheatStrikes}
                onAcknowledge={() => setShowCheatWarning(false)}
                onRemoveStrike={removeStrike}
                onVerifyTicket={(proof: string, reason: string) => verifyTicket(proof, reason, player.originalSelfieUrl)}
                originalSelfieUrl={player.originalSelfieUrl}
              />
            </ErrorBoundary>
          )}
          {showAuditTheater && pendingAuditQuest && (
            <Suspense fallback={null}>
              <ErrorBoundary>
                <AuditTheater
                  questTitle={pendingAuditQuest.title}
                  questRank={pendingAuditQuest.rank}
                  outcome={auditOutcome}
                  onVerified={handleAuditVerified}
                  onFlagged={handleAuditFlagged}
                />
              </ErrorBoundary>
            </Suspense>
          )}

          {pendingPenalty && (
            <Suspense fallback={null}>
              <ErrorBoundary>
                <EarlyCompletionPenalty
                  questTitle={pendingPenalty.questTitle}
                  elapsedMinutes={pendingPenalty.elapsedMinutes}
                  minDurationMinutes={pendingPenalty.minDurationMinutes}
                  currentStrikes={player.cheatStrikes}
                  onAcknowledge={handlePenaltyAcknowledge}
                />
              </ErrorBoundary>
            </Suspense>
          )}
        </AnimatePresence>
      </Suspense>

      {/* Tutorial temporarily disabled per user request. Set TUTORIAL_ACTIVE to true to enable. */}
      {(() => {
        const TUTORIAL_ACTIVE = false; 
        if (!TUTORIAL_ACTIVE) return null;
        
        if (!player.tutorialComplete && isNewUserOnboarding) {
          return (
            <Suspense fallback={null}>
              <ErrorBoundary>
                <TutorialOverlay
                  currentStep={player.tutorialStep}
                  onNext={handleTutorialNext}
                  onComplete={handleTutorialComplete}
                  dynamicTargetId={tutorialTarget}
                  analysisFailed={tutorialAnalysisFailed}
                  onAnalysisRetry={() => { setTutorialAnalysisFailed(false); advanceTutorial(7); }}
                />
              </ErrorBoundary>
            </Suspense>
          );
        }
        return null;
      })()}

      {/* Confetti Overlay — rendered at App level */}
      <Suspense fallback={null}>
        <ConfettiOverlay />
      </Suspense>

      {/* System Pact Screen — rendered at App level to cover navbar */}
      <Suspense fallback={null}>
        <SystemPactScreen
          visible={showPactScreen}
          questRank={pendingPactQuest?.rank ?? 'E'}
          questTitle={pendingPactQuest?.title ?? ''}
          playerGold={player.gold}
          onAcceptPact={handlePactAccept}
          onDeclinePact={handlePactDecline}
        />
      </Suspense>

      <Layout
        navigation={shouldShowNav && activeTab !== 'PROFILE' ? (
          <Navigation
            activeTab={activeTab}
            onTabChange={navigateTo}
            badges={{ ALLIANCE: !player.allianceId }}
          />
        ) : null}
        playerLevel={player.level}
        playerName={player.name}
        playerUsername={player.username}
        playerRank={player.rank}
        streak={player.streak}
        gold={player.gold}
        keys={player.keys}
        consumables={player.consumables}
        replitUser={player.replitUser}
        playerAvatarUrl={player.avatarUrl}
        notificationHistory={notificationHistory}
        hasUnreadNotifications={hasUnreadNotifications}
        onMarkNotificationsRead={markNotificationsRead}
        onClearNotificationHistory={clearNotificationHistory}
        headerDisabled={isDungeonMode}
        forceHeaderVisible={!player.tutorialComplete && isNewUserOnboarding && (player.tutorialStep === 3 || player.tutorialStep === 16)}
        onGoldClick={!isDungeonMode ? () => navigateTo('STORE') : undefined}
        onLogout={() => setShowLogoutChoice(true)}
        onEditProfile={() => navigateTo('PROFILE')}
      >
        {/* Food scan in-progress banner — shown on any tab except HEALTH */}
        {foodScanBannerVisible && activeTab !== 'HEALTH' && (
          <div
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full text-xs font-mono font-bold cursor-pointer"
            style={{ background: 'rgba(0,210,255,0.12)', border: '1px solid rgba(0,210,255,0.4)', color: '#00d2ff', backdropFilter: 'blur(12px)' }}
            onClick={() => navigateTo('HEALTH')}
          >
            <span className="animate-pulse">●</span> Food scan running — tap to view
          </div>
        )}

        {/* Main content wrapper with swipe-to-change-tab */}
        <div
          onTouchStart={handleSwipeTouchStart}
          onTouchEnd={handleSwipeTouchEnd}
          style={{ minHeight: 0 }}
        >
        <AnimatePresence mode="wait">

          {/* ── DASHBOARD ── */}
          {activeTab === 'DASHBOARD' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Player Status Card (replaces HunterCommandDeck & HunterGrowthTerminal) */}
              <Suspense fallback={<SkeletonStatsChart />}>
                <ErrorBoundary fallbackLabel="Status card failed">
                  <PlayerStatusCard
                    player={player}
                    equippedOutfit={dbOutfits.find(o => o.id === player.equippedOutfitId) || OUTFITS.find(o => o.id === player.equippedOutfitId)}
                    mentorMessages={mentorMessages}
                    onDismissMentorMessage={(id) => setMentorMessages(prev => prev.filter(m => m.id !== id))}
                    history={player.history || []}
                    onOpenDuskChat={() => setShowDuskChat(true)}
                  />
                </ErrorBoundary>
              </Suspense>

              {/* Stat Pillars */}
              <div id="tut-stats">
                <Suspense fallback={<SkeletonStatBoxes />}>
                  <ErrorBoundary fallbackLabel="Stat boxes failed">
                    <StatBoxes
                      stats={player.stats}
                      dailyStats={player.dailyStats}
                      weeklyStats={player.weeklyStats}
                    />
                  </ErrorBoundary>
                </Suspense>
              </div>

              {/* XP Level Progress */}
              <Suspense fallback={<SkeletonLevelProgress />}>
                <ErrorBoundary fallbackLabel="Level progress failed">
                  <LevelProgressCard
                    level={player.level}
                    currentXP={player.currentXp}
                    maxXP={player.requiredXp}
                    xpBuff={(() => {
                      const TIER_SIZE = 40;
                      const vals = [player.stats.strength, player.stats.intelligence, player.stats.focus, player.stats.discipline, player.stats.willpower, player.stats.social];
                      const minTier = Math.min(...vals.map(v => {
                        const c = Math.max(0, Math.min(v || 0, 200));
                        return c >= 200 ? 5 : Math.min(5, Math.floor(c / TIER_SIZE) + 1);
                      }));
                      return ({ 1: 0, 2: 10, 3: 30, 4: 50, 5: 100 } as Record<number,number>)[minTier] || 0;
                    })()}
                  />
                </ErrorBoundary>
              </Suspense>

              {/* ForgeGuard Integrity — Strike Counter */}
              <Suspense fallback={<SkeletonForgeGuard />}>
                <ForgeGuardWidget
                  cheatStrikes={player.cheatStrikes}
                  totalStrikesEver={player.totalStrikesEver}
                />
              </Suspense>

              {/* Rank Progression */}
              <Suspense fallback={<SkeletonRankProgression />}>
                <ErrorBoundary fallbackLabel="Rank progression failed">
                  <RankProgressionCard level={player.level} rank={player.rank} />
                </ErrorBoundary>
              </Suspense>

              {/* Upcoming Active Quests */}
              <Suspense fallback={<SkeletonUpcomingQuests />}>
                <ErrorBoundary fallbackLabel="Upcoming quests failed">
                  <UpcomingQuests
                    quests={player.quests}
                    onNavigateToQuests={() => setActiveTab('QUESTS')}
                  />
                </ErrorBoundary>
              </Suspense>

              {/* Dashboard Widgets (clan chests + Dusk) */}
              <Suspense fallback={<SkeletonDashboardWidgets />}>
                <ErrorBoundary fallbackLabel="Dashboard widgets failed">
                  <DashboardWidgets
                    player={player}
                    onOpenDailyCalendar={DAILY_REWARDS_ENABLED ? () => setShowDailyLogin(true) : undefined}
                  />
                </ErrorBoundary>
              </Suspense>

            </motion.div>
          )}

          {/* ── CASTLE ── */}
          {activeTab === 'CASTLE' && (
            <motion.div key="castle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Suspense fallback={<SkeletonCastlePage />}>
                <ErrorBoundary fallbackLabel="Demon Castle failed to load">
                  <DemonCastle
                    key={`dungeon-${dungeonSession}`}
                    gold={player.gold}
                    keys={player.keys}
                    lastDungeonEntry={player.lastDungeonEntry ?? 0}
                    onDeductGold={deductGold}
                    onConsumeKey={consumeKey}
                    onEnterDungeon={enterDungeon}
                    onAddRewards={addRewards}
                    onAwardStones={(outfitId, amount) => awardOutfitStones(outfitId, amount, 'dungeon')}
                    onPlayStateChange={setIsDungeonMode}
                    initialMode="PLAYING"
                    onExit={() => {
                      setIsDungeonMode(false);
                      setActiveTab('REWARDS');
                    }}
                  />
                </ErrorBoundary>
              </Suspense>
            </motion.div>
          )}

          {/* ── QUESTS ── */}
          {activeTab === 'QUESTS' && (
            <motion.div key="quests" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Suspense fallback={<SkeletonQuestsPage />}>
                <ErrorBoundary fallbackLabel="Quests failed to load">
                  <QuestsView
                    quests={player.quests}
                    addQuest={addQuest}
                    completeQuest={handleQuestComplete}
                    failQuest={failQuest}
                    resetQuest={resetQuest}
                    deleteQuest={deleteQuest}
                    tutorialStep={player.tutorialStep}
                    onTutorialAction={advanceTutorial}
                    onTutorialAnalysisFail={() => setTutorialAnalysisFailed(true)}
                    playerData={player}
                    onToggleNav={handleToggleNav}
                    recordStrike={recordStrike}
                    onShowPact={handleShowPact}
                    onStartTracking={handleStartTracking}
                    onStopTracking={handleStopTracking}
                  />
                </ErrorBoundary>
              </Suspense>
            </motion.div>
          )}

          {/* ── STORE ── */}
          {(activeTab === 'STORE' || activeTab === 'ARMORY') && (
            <motion.div key="store" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Suspense fallback={<SkeletonShopPage />}>
                <ErrorBoundary fallbackLabel="Store failed to load">
                  <ShopView
                    gold={player.gold}
                    items={player.shopItems}
                    purchaseItem={purchaseItem}
                    keys={player.keys}
                    lastDungeonEntry={player.lastDungeonEntry ?? 0}
                    onStartDungeon={handleStartDungeon}
                    consumables={player.consumables}
                    buyConsumable={buyConsumable}
                    streak={player.streak}
                    lastLoginDate={player.lastLoginDate}
                    onOpenDailyCalendar={DAILY_REWARDS_ENABLED ? () => setShowDailyLogin(true) : undefined}
                    highlightDungeon={highlightDungeon}
                    onHighlightConsumed={() => setHighlightDungeon(false)}
                    wardrobeGold={player.gold}
                    wardrobeUnlockedOutfits={player.unlockedOutfits || ['outfit_starter']}
                    wardrobeEquippedOutfitId={player.equippedOutfitId || 'outfit_starter'}
                    wardrobeOutfits={dbOutfits.length > 0 ? dbOutfits : OUTFITS}
                    wardrobeOnPurchase={purchaseOutfit}
                    wardrobeOnEquip={equipOutfit}
                    outfitStones={player.outfitStones || {}}
                    chests={player.chests}
                    onOpenChest={() => setShowChestOpening(true)}
                  />
                </ErrorBoundary>
              </Suspense>
            </motion.div>
          )}

          {/* ── LEADERBOARD ── */}
          {activeTab === 'LEADERBOARD' && (
            <motion.div key="leaderboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Suspense fallback={<SkeletonAlliancePage />}>
                <ErrorBoundary fallbackLabel="Leaderboard failed to load">
                  <LeaderboardView 
                    player={player} 
                    equippedOutfit={dbOutfits.find(o => o.id === player.equippedOutfitId) || OUTFITS.find(o => o.id === player.equippedOutfitId)}
                  />
                </ErrorBoundary>
              </Suspense>
            </motion.div>
          )}

          {/* ── REWARDS ── */}
          {activeTab === 'REWARDS' && (
            <motion.div key="rewards" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Suspense fallback={<SkeletonShopPage />}>
                <ErrorBoundary fallbackLabel="Shop failed to load">
                  <ShopView
                    gold={player.gold}
                    items={player.shopItems}
                    purchaseItem={purchaseItem}
                    keys={player.keys}
                    lastDungeonEntry={player.lastDungeonEntry ?? 0}
                    onStartDungeon={handleStartDungeon}
                    consumables={player.consumables}
                    buyConsumable={buyConsumable}
                    streak={player.streak}
                    lastLoginDate={player.lastLoginDate}
                    outfitStones={player.outfitStones || {}}
                    chests={player.chests}
                    onOpenChest={() => setShowChestOpening(true)}
                  />
                </ErrorBoundary>
              </Suspense>
            </motion.div>
          )}

          {/* ── GROWTH ── */}
          {activeTab === 'GROWTH' && (
            <motion.div key="growth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Suspense fallback={<SkeletonGrowthPage />}>
                <ErrorBoundary fallbackLabel="Growth view failed to load">
                  <GrowthView
                    player={player}
                    onLogout={() => setShowLogoutChoice(true)}
                  />
                </ErrorBoundary>
              </Suspense>
            </motion.div>
          )}

          {/* ── HEALTH ── */}
          {activeTab === 'HEALTH' && (
            <motion.div key={`health-${healthViewKey}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Suspense fallback={<SkeletonHealthPage />}>
                <ErrorBoundary fallbackLabel="Health view failed to load">
                  <HealthView
                    healthProfile={player.healthProfile}
                    onSaveProfile={saveHealthProfile}
                    onCompleteWorkout={completeWorkoutSession}
                    onFailWorkout={failWorkout}
                    onLogMeal={logMeal}
                    onDeleteMeal={deleteMeal}
                    playerData={player}
                    onTutorialAction={advanceTutorial}
                    tutorialStep={player.tutorialStep}
                    onToggleNav={handleToggleNav}
                    onConsumeKey={consumeKey}
                    onUpdateSkillProgress={updateSkillProgress}
                  />
                </ErrorBoundary>
              </Suspense>
            </motion.div>
          )}



          {/* ── PROFILE ── */}
          {activeTab === 'PROFILE' && (
            <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Suspense fallback={<SkeletonProfilePage />}>
                <ErrorBoundary fallbackLabel="Profile failed to load">
                  <ProfileView
                    player={player}
                    onUpdate={updateProfile}
                    onAvatarChange={(newUrl) => setPlayer(prev => ({ ...prev, avatarUrl: newUrl }))}
                    onLogout={() => setShowLogoutChoice(true)}
                    onBack={() => setActiveTab('DASHBOARD')}
                    onNavigate={(tab) => {
                      if (tab === 'STORE') {
                        setHighlightDungeon(true);
                      }
                      setActiveTab(tab);
                    }}
                    onRetakeTutorial={() => { resetTutorial(); setIsNewUserOnboarding(true); setActiveTab('DASHBOARD'); }}
                    onResetProgress={async () => {
                      if (!player.userId || player.userId.startsWith('local')) return;
                      const uid = player.userId;
                      const authHeaders = await getOrRefreshPlayerHeaders(API_BASE);
                      const res = await fetch(`${API_BASE}/api/player/${uid}/reset-progress`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', ...authHeaders },
                        credentials: 'include',
                      });
                      if (!res.ok) throw new Error('Reset failed');
                      // Clear user-scoped workout map, journey start & session logs
                      localStorage.removeItem(`reforge_workout_day_map_${uid}`);
                      localStorage.removeItem(`reforge_journey_start_${uid}`);
                      localStorage.removeItem(`reforge_session_logs_${uid}`);
                      // Clear legacy non-scoped keys too
                      localStorage.removeItem('reforge_workout_day_map');
                      localStorage.removeItem('reforge_journey_start');
                      setHealthViewKey(k => k + 1);
                      // Fetch preserved gold/keys from DB after server reset
                      let preservedGold = player.gold;
                      let preservedKeys = player.keys;
                      try {
                        const freshRes = await fetch(`${API_BASE}/api/player/${uid}`, { credentials: 'include', headers: { ...authHeaders } });
                        if (freshRes.ok) {
                          const row = await freshRes.json();
                          preservedGold = row.gold ?? row.raw_data?.gold ?? player.gold;
                          preservedKeys = row.keys ?? row.raw_data?.keys ?? player.keys;
                        }
                      } catch { /* use local values */ }
                      // Full reset: wipe EVERYTHING except identity + gold/keys
                      setPlayer({
                        isConfigured: false,
                        tutorialStep: 0,
                        tutorialComplete: false,
                        name: player.name,
                        username: player.username,
                        userId: uid,
                        avatarUrl: player.avatarUrl,
                        level: 1,
                        currentXp: 0,
                        requiredXp: 100,
                        totalXp: 0,
                        dailyXp: 0,
                        rank: 'E',
                        gold: preservedGold,
                        keys: preservedKeys,
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
                        consumables: { shadowScrolls: 0 },
                        chests: { legendary: 0 },
                        awakening: { vision: [], antiVision: [] },
                        personalBests: {},
                        nutritionLogs: [],
                        exerciseDatabase: [],
                        focusVideos: {},
                        ownedOutfits: ['default'],
                        activeOutfit: 'default',
                        customProtocols: {},
                        tournament: { pendingReward: null },
                        country: player.country || 'United States',
                        timezone: player.timezone || 'UTC',
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
                        skillProgress: [],
                      } as PlayerData);
                    }}
                  />
                </ErrorBoundary>
              </Suspense>
            </motion.div>
          )}

        </AnimatePresence>
        </div>{/* end swipe wrapper */}

        {activeTab === 'DASHBOARD' && (
          <MobileFloatingMenu
            gold={player.gold}
            keys={player.keys}
            lastDungeonEntry={player.lastDungeonEntry ?? 0}
            onConsumeKey={consumeKey}
            onEnterDungeon={handleStartDungeon}
            onNavigateToDungeon={() => {
              setHighlightDungeon(true);
              setActiveTab('STORE');
            }}
            onAddRewards={addRewards}
            onAddNotification={(msg: string, type: any) => addNotification(msg, type)}
          />
        )}

        {showLogoutChoice && (
          <LogoutChoiceScreen
            onSelect={(dest) => {
              logoutFlowRef.current = true;
              setShowLogoutChoice(false);
              // 1. Clear local storage and reset player state IMMEDIATELY
              const prevUserId = player.userId;
              const prevPlayer = { ...player };
              localStorage.removeItem('reforge_player_v2');
              localStorage.removeItem('reforge_player_token');
              sessionStorage.setItem('reforge_logout_pending', '1');
              resetPlayer();
              // 2. Navigate directly to the chosen destination — instant
              setOnboardingPhase(dest);
              setLoading(false);
              // 3. Fire-and-forget: sync data & destroy session in background
              (async () => {
                try {
                  if (prevUserId && !isLocalUser(prevUserId)) {
                    await fetch(`${API_BASE}/api/player/${prevUserId}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json', ...getPlayerAuthHeaders() },
                      credentials: 'include',
                      body: JSON.stringify(prevPlayer),
                    });
                  }
                } catch { /* ignore sync errors */ }
                try {
                  await fetch(`${API_BASE}/api/auth/local/logout`, { method: 'POST', credentials: 'include' });
                } catch { /* ignore */ }
                sessionStorage.removeItem('reforge_logout_pending');
              })();
            }}
            onCancel={() => setShowLogoutChoice(false)}
          />
        )}

        {/* ── Stone Drop Animation (single award) ── */}
        <AnimatePresence>
          {stoneAnim && (
            <StoneDropAnim
              key={`stone-${stoneAnim.outfitId}-${stoneAnim.newCount}`}
              outfitId={stoneAnim.outfitId}
              amount={stoneAnim.amount}
              oldCount={stoneAnim.oldCount}
              newCount={stoneAnim.newCount}
              color={stoneAnim.color}
              glow={stoneAnim.glow}
              onComplete={() => { setStoneAnim(null); stoneAnimBusy.current = false; flushStoneBatch(); }}
            />
          )}
        </AnimatePresence>

        {/* ── Batch Stone Animation (dungeon cash-out with multiple stone types) ── */}
        <AnimatePresence>
          {batchStoneAnim && (
            <BatchStoneAnim
              key={`batch-stones-${batchStoneAnim.map(s => s.outfitId).join('-')}`}
              stones={batchStoneAnim}
              onComplete={() => { setBatchStoneAnim(null); stoneAnimBusy.current = false; flushStoneBatch(); }}
            />
          )}
        </AnimatePresence>

        {/* ── Badge Tier Unlock Animation (full cinematic) ── */}
        <AnimatePresence>
          {badgeAnim && (
            <BadgeUnlockAnim
              key={`badge-${badgeAnim.outfitId}-${badgeAnim.tierIndex}`}
              tierIndex={badgeAnim.tierIndex}
              outfitId={badgeAnim.outfitId}
              onComplete={() => setBadgeAnim(null)}
            />
          )}
        </AnimatePresence>

        {/* ── Notification Opt-In Prompt (Android <13 auto-grants, so we ask in-app) ── */}
        <AnimatePresence>
          {showNotifPrompt && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[900] bg-black/90 flex items-center justify-center p-6 font-mono"
              onClick={() => handleNotifOptIn(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-sm bg-[#0a0a14] border border-[#00d2ff]/30 rounded-2xl p-6 space-y-4"
              >
                <div className="text-center">
                  <div className="text-3xl mb-3">🔔</div>
                  <h3 className="text-lg font-black text-white">Enable Notifications?</h3>
                  <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
                    Get daily motivation from Dusk, streak reminders, quest deadline alerts, and workout nudges. You can change this anytime in your profile settings.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleNotifOptIn(false)}
                    className="py-3 rounded-xl border border-gray-700 text-gray-400 font-bold text-xs tracking-widest hover:text-white transition-colors"
                  >
                    NO THANKS
                  </button>
                  <button
                    onClick={() => handleNotifOptIn(true)}
                    className="py-3 rounded-xl bg-[#00d2ff] text-black font-bold text-xs tracking-widest hover:bg-white transition-colors"
                  >
                    ENABLE
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </Layout>
    </>
  );
};

export default App;
