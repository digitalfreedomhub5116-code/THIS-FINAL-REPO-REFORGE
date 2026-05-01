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

import SystemToastOverlay from './components/SystemToast';

import ErrorBoundary from './components/ErrorBoundary';

import {

  SkeletonStatsChart, SkeletonStatBoxes, SkeletonLevelProgress,

  SkeletonWardrobePreview, SkeletonRankProgression, SkeletonUpcomingQuests,

  SkeletonDashboardWidgets, SkeletonForgeGuard,

  SkeletonQuestsPage, SkeletonShopPage, SkeletonCastlePage,

  SkeletonAlliancePage, SkeletonHealthPage,

  SkeletonProfilePage, SkeletonAdminPage,

  SkeletonOnboardingPage, SkeletonGenericPage,

} from './components/SkeletonLoaders';



import { useSystem, isLocalUser, safeLevelUp } from './hooks/useSystem';

import { useSensors } from './hooks/useSensors';

import { useTheme, ThemeContext } from './hooks/useTheme';

import { Tab, CoreStats, HealthProfile, Outfit, DbOutfit, TierLevel, PlayerData, Quest, DailyReward, MealType } from './types';

import { App as CapApp } from '@capacitor/app';

import { OUTFITS } from './utils/gameData';

import { DAILY_REWARDS_ENABLED } from './lib/rewards';

import { getPlayerAuthHeaders, getOrRefreshPlayerHeaders } from './lib/playerApi';

import { saveAuthNative, clearAuthNative } from './lib/nativeAuth';
import { clearEconomySession } from './utils/storeEconomy';

import { Terminal, Flame } from 'lucide-react';

import { getLockedTabs } from './components/FeatureGate';

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

const DailyCommandCenter = lazy(() => import('./components/DailyCommandCenter'));

const ShopView = lazy(() => import('./components/ShopView'));

// GrowthView removed — unreachable tab (no navigation path)

const HealthView = lazy(() =>

  import('./components/HealthView').then(m => ({ default: m.HealthView }))

);



const StatBoxes = lazy(() => import('./components/StatBoxes'));

const LevelUpCinematic = lazy(() => import('./components/LevelUpCinematic'));

// WelcomeIntro removed — dead code (never triggered)

const PenaltyZone = lazy(() => import('./components/PenaltyZone'));

const TournamentResultModal = lazy(() => import('./components/TournamentResultModal'));

const TutorialOverlay = lazy(() => import('./components/TutorialOverlay'));



const UpcomingQuests = lazy(() => import('./components/UpcomingQuests'));

// ── New lazy imports ──

const SystemAgreement = lazy(() => import('./components/SystemAgreement'));

const CalibrationFlow = lazy(() => import('./components/CalibrationFlow'));

const NameOnboarding = lazy(() => import('./components/NameOnboarding'));

// AvatarGenerator removed — no longer needed

const DuskChat = lazy(() => import('./components/DuskChat'));

const XpCollectionOverlay = lazy(() => import('./components/XpCollectionOverlay'));

// CheatWarningModal removed — dead code (never triggered)

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

const YouView = lazy(() => import('./components/YouView'));

const DuskFloatingPill = lazy(() => import('./components/DuskFloatingPill'));

const DashboardView = lazy(() => import('./components/DashboardView'));

const GoalHeroSection = lazy(() => import('./components/GoalHeroSection'));
const GoalCreationFlow = lazy(() => import('./components/GoalCreationFlow'));
const HunterCommandDeck = lazy(() => import('./components/HunterCommandDeck'));
import { startQuestGeneration, onQuestGenStoreUpdate } from './components/GoalDetailView';

const RankUpCinematic = lazy(() => import('./components/RankUpCinematic'));



const ConfettiOverlay = lazy(() => import('./components/ConfettiOverlay'));

const StrikeLiftedModal = lazy(() => import('./components/StrikeLiftedModal'));

const ForgeGuardWidget = lazy(() => import('./components/ForgeGuardWidget'));

const StreakCelebration = lazy(() => import('./components/StreakCelebration'));

const ChestOpeningOverlay = lazy(() => import('./components/ChestOpeningOverlay'));

const GuidedQuestOnboarding = lazy(() => import('./components/GuidedQuestOnboarding'));

const WorkoutOnboardingTutorial = lazy(() => import('./components/WorkoutOnboardingTutorial'));

const FeatureUnlockCinematic = lazy(() => import('./components/FeatureUnlockCinematic'));

const Level5Tutorial = lazy(() => import('./components/Level5Tutorial'));

const Level10Tutorial = lazy(() => import('./components/Level10Tutorial'));



/** Skeleton-loaded promo card background image */
function PromoImg({ src, alt, style }: { src: string; alt: string; style?: React.CSSProperties }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <>
      {!loaded && (
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(110deg, rgba(255,255,255,0.03) 30%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 70%)',
            backgroundSize: '200% 100%',
            animation: 'promo-shimmer 1.5s ease-in-out infinite',
          }}
        />
      )}
      <img
        src={src}
        alt={alt}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ ...style, opacity: loaded ? 1 : 0, transition: 'opacity 0.4s ease' }}
        onLoad={() => setLoaded(true)}
      />
      <style>{`@keyframes promo-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    </>
  );
}

// ── Types ──

type OnboardingPhase = 'SPLASH' | 'WELCOME' | 'AGREEMENT' | 'NAMING' | 'CALIBRATION' | 'AUTH' | 'AUTH_SIGN_IN_PAGE' | 'AUTH_CREATE_PAGE' | 'APP' | 'LOGOUT_CHOICE';



// ── SessionStorage helpers ──

const SS_USER = 'reforge_temp_user';

const SS_HEALTH = 'reforge_temp_health';

const SS_STATS = 'reforge_temp_stats';

const SS_AUTH = 'reforge_temp_auth';



function ssSet(key: string, value: unknown) {

  try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }

}

function ssGet<T>(key: string): T | null {

  try { const v = sessionStorage.getItem(key); return v ? JSON.parse(v) as T : null; } catch { return null; }

}

function ssClear() {

  try { sessionStorage.removeItem(SS_USER); sessionStorage.removeItem(SS_HEALTH); sessionStorage.removeItem(SS_STATS); sessionStorage.removeItem(SS_AUTH); } catch { /* ignore */ }

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

    purchaseItem, addNotification,

    removeNotification, saveHealthProfile, updateProfile,

    logMeal, deleteMeal, completeWorkoutSession, failWorkout,

    advanceTutorial, completeTutorial, resetTutorial, resetPlayer, resolvePenalty, reducePenalty,

    claimTournamentReward, consumeMana, refundMana,

    deductGold, addRewards,

    recordStrike, removeStrike, markDuskMessagesRead,

    startSensorTracking, stopSensorTracking, updateQuestSensorData,

    verifyTicket, purchaseOutfit, equipOutfit,

    checkDailyLogin, updateSkillProgress,

    updateServerBaseline, markServerPullDone, setServerUpdatedAt, awardRandomStones,

    purchaseBorder, equipBorder, equipBanner,

  } = useSystem();



  const sensors = useSensors();

  const themeCtx = useTheme();



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

    if (!player.questOnboardingDone) return; // Wait for quest tutorial to finish first

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

          // Android <13 — OS auto-granted without asking; enqueue in-app prompt

          setShowNotifPrompt(true);

          enqueueOverlay('notifPrompt');

        }

        // status === 'denied' → already denied or not native, skip

      })();

    }

    // opted === 'no' → user declined, skip scheduling

  }, [player.userId, player.isConfigured, player.questOnboardingDone]); // eslint-disable-line react-hooks/exhaustive-deps



  const _scheduleAllNotifications = async () => {

    const today = new Date().toLocaleDateString('en-CA');

    const hasWorkedOutToday = player.lastWorkoutDate === today;

    const hasDailyXp = (player.dailyXp || 0) > 0;

    const name = player.name || 'Hunter';

    await scheduleMorningDusk(name);

    await scheduleWorkoutReminder(hasWorkedOutToday, name);

    await scheduleStreakReminder(player.streak, hasWorkedOutToday, true, name); // openedAppToday = true (they're in the app right now)

    await scheduleLeaderboardNudge(hasDailyXp);

    await scheduleComebackPing(name);

    for (const q of player.quests) {

      if (!q.isCompleted && !q.failed && q.expiresAt) {

        await scheduleQuestDeadline(q.id, q.title, q.expiresAt);

      }

    }

  };



  const handleNotifOptIn = async (accept: boolean) => {

    setShowNotifPrompt(false);

    dismissOverlay();

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



  const [loading, setLoading] = useState(false);



  const [onboardingPhase, setOnboardingPhase] = useState<OnboardingPhase>(() => {

    if (savedPhase) return savedPhase;

    return player.isConfigured ? 'APP' : 'WELCOME';

  });

  const authInitialMode: 'SIGN_IN' | 'CREATE' = 'SIGN_IN';

  const [showLogoutChoice, setShowLogoutChoice] = useState(false);

  const [activeTab, setActiveTab] = useState<Tab>('DASHBOARD');

  const tabHistoryRef = useRef<Tab[]>(['DASHBOARD']);

  const [healthViewKey, setHealthViewKey] = useState(0);
  const [healthSubTab, setHealthSubTab] = useState<'WORKOUT' | 'NUTRITION' | 'SKILLS' | undefined>(undefined);
  const [storeInitialTab, setStoreInitialTab] = useState<'OUTFITS' | 'BADGES' | 'BORDERS' | 'DEALS' | 'THEMES' | 'BANNERS_SHOP' | undefined>(undefined);



  // ── Tab navigation with history for Android back button ──

  const navigateTo = useCallback((tab: Tab) => {

    setActiveTab(prev => {

      if (prev !== tab) tabHistoryRef.current.push(prev);

      return tab;

    });

    // Clear health sub-tab override when navigating away from Health
    if (tab !== 'HEALTH') setHealthSubTab(undefined);
    if (tab !== 'STORE') setStoreInitialTab(undefined);

  }, []);

  // ── Dusk Agent navigation listener ──
  useEffect(() => {
    const handleDuskNav = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const tab = detail?.tab as Tab;
      if (tab) {
        navigateTo(tab);
        setShowDuskChat(false);
      }
    };
    window.addEventListener('dusk:navigate', handleDuskNav);
    return () => window.removeEventListener('dusk:navigate', handleDuskNav);
  }, [navigateTo]);


  // ── Food scan banner (shown on non-HEALTH tabs when scan is running) ──

  const [foodScanBannerVisible, setFoodScanBannerVisible] = useState(false);

  const [showAdminLogin, setShowAdminLogin] = useState(() => window.location.pathname === '/shadow-council');

  const [isAdmin, setIsAdmin] = useState(false);

  const [adminToken, setAdminToken] = useState('');

  const [isNewUserOnboarding, setIsNewUserOnboarding] = useState(false);

  const [highlightDungeon, setHighlightDungeon] = useState(false);

  const [showLevelUp, setShowLevelUp] = useState(false);

  const [showLevelDown, setShowLevelDown] = useState(false);

  const [showNav, setShowNav] = useState(true);

  const handleToggleNav = useCallback((v: boolean) => setShowNav(v), []);

  const [rankUpData, setRankUpData] = useState<{ oldRank: string; newRank: string } | null>(null);

  const prevRankRef = useRef<string | null>(null);

  const banReversalShownRef = useRef(false);



  const [isDungeonMode] = useState(false);



  const [tutorialTarget, setTutorialTarget] = useState<string | null>(null);

  const [tutorialAnalysisFailed, setTutorialAnalysisFailed] = useState(false);

  const [showDuskChat, setShowDuskChat] = useState(false);
  const [showGoalCreate, setShowGoalCreate] = useState(false);
  const [generatingGoalId, setGeneratingGoalId] = useState<string | null>(null);

  // Ref-based save so the quest gen listener can access saveGoalToDb without circular deps
  const saveGoalToDbRef = useRef<(goal: any) => void>(() => {});

  // Listen for quest generation results from pinned goal card buttons
  useEffect(() => {
    const unsub = onQuestGenStoreUpdate((store) => {
      if (store.state === 'GENERATING' && store.goalId) {
        setGeneratingGoalId(store.goalId);
      } else if (store.state === 'DONE' && store.goalId) {
        setGeneratingGoalId(null);
        // Apply pending updates to player state
        if (store.pendingGoalUpdate) {
          setPlayer((prev: any) => ({
            ...prev,
            goals: (prev.goals || []).map((g: any) =>
              g.id === store.pendingGoalUpdate!.id ? store.pendingGoalUpdate : g
            ),
          }));
          // Also persist to database
          saveGoalToDbRef.current(store.pendingGoalUpdate);
        }
        if (store.pendingFeedQuests && store.pendingFeedQuests.length > 0) {
          store.pendingFeedQuests.forEach((q: any) => addQuest(q));
        }
      } else if (store.state === 'ERROR') {
        setGeneratingGoalId(null);
      }
    });
    return unsub;
  }, [addQuest, setPlayer]);

  const [showBanReversalNotice, setShowBanReversalNotice] = useState(false);

  const [strikeLiftedNotifId, setStrikeLiftedNotifId] = useState<string | null>(null);



  const [mentorMessages, setMentorMessages] = useState<{id: string, text: string}[]>([]);



  // ── Level-gated Onboarding State ──

  const [questOnboardingStep, setQuestOnboardingStep] = useState(0);

  const [workoutOnboardingStep, setWorkoutOnboardingStep] = useState(0);

  const [showQuestOnboarding, setShowQuestOnboarding] = useState(false);

  const [showWorkoutOnboarding, setShowWorkoutOnboarding] = useState(false);

  const [showDuskWelcome, setShowDuskWelcome] = useState(false);

  const [questAnalysisFailed, setQuestAnalysisFailed] = useState(false); // Track if quest analysis failed during tutorial

  const [showRankReveal, setShowRankReveal] = useState(false);

  const [showFeatureUnlock, setShowFeatureUnlock] = useState<number | null>(null);

  const [showLevel5Tutorial, setShowLevel5Tutorial] = useState(false);

  const [level5TutStep, setLevel5TutStep] = useState(1);

  const [showLevel10Tutorial, setShowLevel10Tutorial] = useState(false);

  const [level10TutStep, setLevel10TutStep] = useState(1);




  // ── Stone Drop & Badge Unlock global animations ──

  // Single-stone animation (for lone awards like quests/workouts)

  const [stoneAnim, setStoneAnim] = useState<{ outfitId: string; amount: number; oldCount: number; newCount: number; color: string; glow: string } | null>(null);

  // Batch animation (for dungeon cash-outs with multiple stone types)

  const [batchStoneAnim, setBatchStoneAnim] = useState<BatchStoneEntry[] | null>(null);

  const [badgeAnim, setBadgeAnim] = useState<{ tierIndex: number; outfitId: string } | null>(null);



  // ── Swipe-to-change-tab ──────────────────────────────────────────────────────

  const NAV_TAB_ORDER: Tab[] = ['DASHBOARD', 'HEALTH', 'LEADERBOARD', 'STORE', 'PROFILE'];

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

    if (!next) return;

    // Prevent swiping into locked tabs

    const locked = getLockedTabs(player.level);

    if (locked[next]) return;

    navigateTo(next);

  }, [activeTab, navigateTo, player.level]); // eslint-disable-line react-hooks/exhaustive-deps



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



  // ── Overlay Queue System ──

  // Only one gameplay-interrupting overlay at a time. Priority: streak > levelUp > levelDown > rankUp > dailyLogin > notifPrompt

  type OverlayType = 'streak' | 'levelUp' | 'levelDown' | 'rankUp' | 'dailyLogin' | 'notifPrompt';

  const OVERLAY_PRIORITY: Record<OverlayType, number> = { streak: 0, levelUp: 1, levelDown: 2, rankUp: 3, dailyLogin: 4, notifPrompt: 5 };

  const overlayQueueRef = useRef<OverlayType[]>([]);

  const [activeOverlay, setActiveOverlay] = useState<OverlayType | null>(null);



  const enqueueOverlay = useCallback((type: OverlayType) => {

    const q = overlayQueueRef.current;

    if (q.includes(type)) return; // Already queued

    q.push(type);

    // Sort by priority (streak first)

    q.sort((a, b) => OVERLAY_PRIORITY[a] - OVERLAY_PRIORITY[b]);

  }, []); // eslint-disable-line react-hooks/exhaustive-deps



  const dismissOverlay = useCallback(() => {

    setActiveOverlay(null);

  }, []);



  // Process queue: show next overlay when none is active

  useEffect(() => {

    if (activeOverlay) return; // One is already showing

    if (!player.isConfigured) return; // Wait until player is ready

    const q = overlayQueueRef.current;

    if (q.length === 0) return;

    const next = q.shift()!;

    setActiveOverlay(next);

  }, [activeOverlay, player.isConfigured,

      // Re-check when any of the triggers fire (these deps cause re-evaluation)

      showStreakCelebration, showLevelUp, showLevelDown, rankUpData, showDailyLogin, showNotifPrompt]);



  // ── Sync from DB — callable ref for immediate triggers + 2s polling ──

  const syncFromDbRef = useRef<() => Promise<void>>();

  // Track last known DB values so we only overwrite local gold/keys/xp/level when admin changes them

  const lastKnownDbGold = useRef<number | null>(null);



  const lastKnownDbLevel = useRef<number | null>(null);

  const lastKnownDbCurrentXp = useRef<number | null>(null);

  const lastKnownDbRequiredXp = useRef<number | null>(null);

  const lastKnownDbTotalXp = useRef<number | null>(null);

  const lastKnownDbDailyXp = useRef<number | null>(null);

  const lastKnownDbRank = useRef<string | null>(null);

  const lastKnownDbStreak = useRef<number | null>(null);

  const lastKnownDbHp = useRef<number | null>(null);

  const lastKnownDbMaxHp = useRef<number | null>(null);

  const lastKnownDbMp = useRef<number | null>(null);

  const lastKnownDbMaxMp = useRef<number | null>(null);

  useEffect(() => {

    if (!player.userId || isLocalUser(player.userId)) return;

    // Check localStorage to see if ban reversal was already shown for this user
    const seenKey = `banReversalSeen_${player.userId}`;
    banReversalShownRef.current = !!localStorage.getItem(seenKey);

    // Reset tracking refs on user change

    lastKnownDbGold.current = null;



    lastKnownDbLevel.current = null;

    lastKnownDbCurrentXp.current = null;

    lastKnownDbRequiredXp.current = null;

    lastKnownDbTotalXp.current = null;

    lastKnownDbDailyXp.current = null;

    lastKnownDbRank.current = null;

    lastKnownDbStreak.current = null;

    lastKnownDbHp.current = null;

    lastKnownDbMaxHp.current = null;

    lastKnownDbMp.current = null;

    lastKnownDbMaxMp.current = null;

    const syncFromDb = async () => {

      try {

        // Use lightweight /sync endpoint (~1KB) instead of full GET (~50KB)

        const res = await fetch(`${API_BASE}/api/player/${player.userId}/sync`, { credentials: 'include', headers: { ...getPlayerAuthHeaders() } });

        if (!res.ok) return;

        const row = await res.json();

        const dbBanned  = row.isBanned       ?? false;

        const dbStrikes = row.cheatStrikes   ?? 0;

        const dbGold    = row.gold           ?? 0;


        const dbTotalStrikes = row.totalStrikesEver ?? 0;

        const dbLevel     = row.level     ?? 1;

        const dbCurrentXp = row.currentXp ?? 0;

        const dbRequiredXp = row.requiredXp ?? 100;

        const dbTotalXp   = row.totalXp   ?? 0;

        const dbDailyXp   = row.dailyXp   ?? 0;

        const dbRank      = row.rank      ?? 'E';

        const dbStreak    = row.streak    ?? 0;

        const dbHp        = row.hp        ?? 100;

        const dbMaxHp     = row.maxHp     ?? 100;

        const dbMp        = row.mp        ?? 100;

        const dbMaxMp     = row.maxMp     ?? 100;



        // Determine if values changed in DB since our last poll.

        // If DB value changed → admin or server modified it → apply to local state.

        // If DB value is same as last poll → keep local values (user has pending changes).

        const goldChangedInDb = lastKnownDbGold.current !== null && dbGold !== lastKnownDbGold.current;



        const levelChangedInDb = lastKnownDbLevel.current !== null && dbLevel !== lastKnownDbLevel.current;

        const xpChangedInDb = lastKnownDbCurrentXp.current !== null && dbCurrentXp !== lastKnownDbCurrentXp.current;

        const totalXpChangedInDb = lastKnownDbTotalXp.current !== null && dbTotalXp !== lastKnownDbTotalXp.current;

        const dailyXpChangedInDb = lastKnownDbDailyXp.current !== null && dbDailyXp !== lastKnownDbDailyXp.current;

        const rankChangedInDb = lastKnownDbRank.current !== null && dbRank !== lastKnownDbRank.current;

        const streakChangedInDb = lastKnownDbStreak.current !== null && dbStreak !== lastKnownDbStreak.current;

        const hpChangedInDb = lastKnownDbHp.current !== null && dbHp !== lastKnownDbHp.current;

        const mpChangedInDb = lastKnownDbMp.current !== null && dbMp !== lastKnownDbMp.current;

        const isFirstPoll = lastKnownDbGold.current === null;

        lastKnownDbGold.current = dbGold;



        lastKnownDbLevel.current = dbLevel;

        lastKnownDbCurrentXp.current = dbCurrentXp;

        lastKnownDbRequiredXp.current = dbRequiredXp;

        lastKnownDbTotalXp.current = dbTotalXp;

        lastKnownDbDailyXp.current = dbDailyXp;

        lastKnownDbRank.current = dbRank;

        lastKnownDbStreak.current = dbStreak;

        lastKnownDbHp.current = dbHp;

        lastKnownDbMaxHp.current = dbMaxHp;

        lastKnownDbMp.current = dbMp;

        lastKnownDbMaxMp.current = dbMaxMp;



        // KEY FIX: When admin changes gold in DB, update the server
        // baseline refs so the debounced sync in useSystem won't compute
        // a wrong delta and double-count the admin adjustment.
        if (isFirstPoll || goldChangedInDb) {
          updateServerBaseline(dbGold);
        }


        // SYNC GATE: First poll done — open the gate so syncToCloud can push

        if (isFirstPoll) {

          markServerPullDone();

        }

        // Keep the conflict-detection ref up to date on every poll

        if (row.updatedAt) {

          setServerUpdatedAt(row.updatedAt);

        }



        setPlayer(prev => {

          const updates: Partial<PlayerData> = {};

          if (dbBanned !== prev.isBanned) {

            updates.isBanned = dbBanned;

            if (!dbBanned && prev.isBanned && !banReversalShownRef.current) {

              banReversalShownRef.current = true;
              // Persist so it only shows once per ban lift, survives reloads
              try { localStorage.setItem(`banReversalSeen_${prev.userId}`, String(Date.now())); } catch {}
              setTimeout(() => setShowBanReversalNotice(true), 50);

            } else if (dbBanned && !prev.isBanned) {
              // User just got banned — clear the seen flag so notice shows on next unban
              banReversalShownRef.current = false;
              try { localStorage.removeItem(`banReversalSeen_${prev.userId}`); } catch {}
            }

          }

          if (dbStrikes !== prev.cheatStrikes)           updates.cheatStrikes    = dbStrikes;

          if (dbTotalStrikes !== prev.totalStrikesEver)  updates.totalStrikesEver = dbTotalStrikes;



          // Gold/Keys: Only overwrite local if DB value changed (admin adjustment)

          // or on first poll (initial load from server)

          if (isFirstPoll) {

            if (dbGold !== prev.gold) updates.gold = dbGold;


            if (dbLevel !== prev.level) updates.level = dbLevel;

            if (dbCurrentXp !== prev.currentXp) updates.currentXp = dbCurrentXp;

            if (dbRequiredXp !== prev.requiredXp) updates.requiredXp = dbRequiredXp;

            if (dbTotalXp !== prev.totalXp) updates.totalXp = dbTotalXp;

            if (dbDailyXp !== prev.dailyXp) updates.dailyXp = dbDailyXp;

            if (dbRank !== prev.rank) updates.rank = dbRank;

            if (dbStreak !== prev.streak) updates.streak = dbStreak;

            if (dbHp !== prev.hp) updates.hp = dbHp;

            if (dbMaxHp !== prev.maxHp) updates.maxHp = dbMaxHp;

            if (dbMp !== prev.mp) updates.mp = dbMp;

            if (dbMaxMp !== prev.maxMp) updates.maxMp = dbMaxMp;



            // ── Outfit persistence: restore from server on first poll ──

            // Uses union/max so that neither server nor local can lose purchases

            // (covers page reload, cleared localStorage, and code redeploys)

            const serverOutfits = row.unlockedOutfits as string[] | undefined;

            if (serverOutfits && serverOutfits.length > 0) {

              const union = Array.from(new Set([

                ...(prev.unlockedOutfits || ['outfit_starter']),

                ...serverOutfits,

              ]));

              if (union.length !== (prev.unlockedOutfits || []).length ||

                  union.some(id => !(prev.unlockedOutfits || []).includes(id))) {

                updates.unlockedOutfits = union;

              }

            }

            const serverStones = row.outfitStones as Record<string, number> | undefined;

            if (serverStones && typeof serverStones === 'object') {

              const merged: Record<string, number> = { ...serverStones };

              for (const [k, v] of Object.entries(prev.outfitStones || {})) {

                merged[k] = Math.max(merged[k] || 0, v);

              }

              const differs = Object.keys(merged).some(k => (prev.outfitStones || {})[k] !== merged[k]);

              if (differs) updates.outfitStones = merged;

            }

            if (row.equippedOutfitId && row.equippedOutfitId !== prev.equippedOutfitId) {

              updates.equippedOutfitId = row.equippedOutfitId as string;

            }

          } else {

            if (goldChangedInDb && dbGold !== prev.gold) updates.gold = dbGold;


            if (levelChangedInDb && dbLevel !== prev.level) updates.level = dbLevel;

            if (xpChangedInDb && dbCurrentXp !== prev.currentXp) updates.currentXp = dbCurrentXp;

            if (totalXpChangedInDb && dbTotalXp !== prev.totalXp) updates.totalXp = dbTotalXp;

            if (dailyXpChangedInDb && dbDailyXp !== prev.dailyXp) updates.dailyXp = dbDailyXp;

            if (rankChangedInDb && dbRank !== prev.rank) updates.rank = dbRank as any;

            if (streakChangedInDb && dbStreak !== prev.streak) updates.streak = dbStreak;

            if (hpChangedInDb) { if (dbHp !== prev.hp) updates.hp = dbHp; if (dbMaxHp !== prev.maxHp) updates.maxHp = dbMaxHp; }

            if (mpChangedInDb) { if (dbMp !== prev.mp) updates.mp = dbMp; if (dbMaxMp !== prev.maxMp) updates.maxMp = dbMaxMp; }

            // Also sync requiredXp when level changes (admin may have adjusted it)

            if (levelChangedInDb && dbRequiredXp !== prev.requiredXp) updates.requiredXp = dbRequiredXp;

          }



          if (Object.keys(updates).length === 0) return prev;



          // Apply updates first, then check if level-up processing is needed

          const merged = { ...prev, ...updates };



          // If XP changed (from admin DB edit), run safeLevelUp to process overflow

          const xpWasTouched = 'currentXp' in updates || 'requiredXp' in updates;

          if (xpWasTouched && merged.currentXp >= merged.requiredXp) {

            const lu = safeLevelUp(merged.currentXp, merged.requiredXp, merged.level);

            if (lu.leveledUp) {

              merged.currentXp = lu.currentXp;

              merged.requiredXp = lu.requiredXp;

              merged.level = lu.level;

              merged.rank = lu.rank as any;

              merged.hp = merged.maxHp;

              merged.mp = merged.maxMp;

              // Dispatch level-up event so cinematic + sound play

              setTimeout(() => {

                window.dispatchEvent(new CustomEvent('player:levelup', { detail: { level: lu.level } }));

              }, 100);

            }

          }



          return merged;

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

    const interval = setInterval(syncFromDb, 30000);

    // Listen for immediate sync triggers (e.g. after recordStrike server success)

    const onSyncNeeded = () => syncFromDb();

    window.addEventListener('reforge:sync-needed', onSyncNeeded);

    // ── App resume & visibility change: immediate sync when user returns ──

    const handleAppResume = () => { if (syncFromDbRef.current) syncFromDbRef.current(); };

    const handleVisibility = () => { if (document.visibilityState === 'visible') handleAppResume(); };

    document.addEventListener('visibilitychange', handleVisibility);

    let capListener: { remove: () => void } | null = null;

    CapApp.addListener('appStateChange', ({ isActive }) => {

      if (isActive) handleAppResume();

    }).then(l => { capListener = l; }).catch(() => {});



    return () => {

      clearInterval(interval);

      window.removeEventListener('reforge:sync-needed', onSyncNeeded);

      document.removeEventListener('visibilitychange', handleVisibility);

      if (capListener) capListener.remove();

    };

  }, [player.userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const [xpCollection, setXpCollection] = useState<XpCollectionState | null>(null);

  const [tempHealthProfile, setTempHealthProfile] = useState<HealthProfile | undefined>();

  const [tempStats, setTempStats] = useState<CoreStats | undefined>();

  const [tempUserData, setTempUserData] = useState<{ country: string; tz: string } | undefined>();

  // Holds the auth profile for new signups who authenticated BEFORE completing calibration.
  // registerUser is deferred until CalibrationFlow completes so isConfigured=true doesn't auto-skip onboarding.
  const [tempAuthProfile, setTempAuthProfile] = useState<any>(() => ssGet<any>(SS_AUTH));

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



  const [sensorBlockedQuestId, setSensorBlockedQuestId] = useState<string | null>(null);



  // ── Android back button ──

  // Closes any open popup/modal first, then goes to Dashboard, then double-press exits.

  const backBtnRefs = useRef({ pressedOnce: false, timer: null as ReturnType<typeof setTimeout> | null });

  useEffect(() => {

    const handler = CapApp.addListener('backButton', () => {

      // 1. Dungeon handles its own back

      if (isDungeonMode) return;



      // 2. Critical quest screens — back button should NOT dismiss these

      // (dismissing would leave the quest in limbo: not completed, not failed)

      if (pendingPenalty || showAuditTheater) return;


      if (showDuskChat)         { setShowDuskChat(false); return; }

      if (showChestOpening)     { setShowChestOpening(false); return; }

      if (showDailyLogin)       { setShowDailyLogin(false); return; }

      if (showStreakCelebration) { setShowStreakCelebration(false); return; }

      if (showLevelUp)          { setShowLevelUp(false); return; }

      if (showLevelDown)        { setShowLevelDown(false); return; }

      if (rankUpData)           { setRankUpData(null); return; }

      if (showBanReversalNotice){ setShowBanReversalNotice(false); return; }

      if (showLogoutChoice)     { setShowLogoutChoice(false); return; }

      if (showNotifPrompt)      { setShowNotifPrompt(false); return; }

      if (stoneAnim)            { setStoneAnim(null); return; }

      if (batchStoneAnim)       { setBatchStoneAnim(null); return; }

      if (badgeAnim)            { setBadgeAnim(null); return; }



      // 3. If not on Dashboard, go to Dashboard

      if (activeTab !== 'DASHBOARD') {

        setActiveTab('DASHBOARD');

        tabHistoryRef.current = ['DASHBOARD'];

        return;

      }



      // 4. Already on Dashboard with no popups — double-press to exit

      if (backBtnRefs.current.pressedOnce) {

        if (backBtnRefs.current.timer) clearTimeout(backBtnRefs.current.timer);

        CapApp.exitApp();

        return;

      }

      backBtnRefs.current.pressedOnce = true;

      backBtnRefs.current.timer = setTimeout(() => { backBtnRefs.current.pressedOnce = false; }, 2000);

      addNotification('Press back again to exit', 'SYSTEM');

    });



    return () => { handler.then(h => h.remove()); };

  }, [isDungeonMode, pendingPenalty, showAuditTheater, showDuskChat,

      showChestOpening, showDailyLogin, showStreakCelebration, showLevelUp, showLevelDown,

      rankUpData, showBanReversalNotice, showLogoutChoice, showNotifPrompt,

      stoneAnim, batchStoneAnim, badgeAnim, activeTab, addNotification]);



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

        if (whoamiData.playerToken) saveAuthNative(whoamiData.playerToken, uid);



        // Returning user — try to load their full player record from the DB.

        // This handles localStorage being cleared (mobile, new device, private mode, etc.)

        // while the Google session cookie is still valid.

        try {

          const playerRes = await fetch(`${API_BASE}/api/player/${uid}`, { credentials: 'include', headers: { ...getPlayerAuthHeaders() } });

          if (playerRes.ok) {

            const row = await playerRes.json();

            const rawData = row.raw_data as Partial<PlayerData> | null;

            if (rawData?.isConfigured || rawData?.avatarUrl) {

              registerUser({ id: uid, name: user.firstName || user.name || rawData.name, username: rawData.username, raw_data: rawData });

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

            image: staticMatch?.image || o.image_url || '',

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



  // ── Fetch goals from DB on app load ──
  const fetchGoalsFromDb = useCallback(async () => {
    if (!player.isConfigured || !player.userId) return;
    try {
      const res = await fetch(`${API_BASE}/api/goals`, {
        credentials: 'include',
        headers: { ...getPlayerAuthHeaders() },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.goals && Array.isArray(data.goals)) {
        setPlayer(prev => ({ ...prev, goals: data.goals }));
      }
    } catch (e) {
      console.warn('[Goals] Failed to fetch from DB:', e);
    }
  }, [player.isConfigured, player.userId]);

  useEffect(() => { fetchGoalsFromDb(); }, [fetchGoalsFromDb]);

  const saveGoalToDb = useCallback(async (goal: any) => {
    if (!player.userId) return;
    try {
      await fetch(`${API_BASE}/api/goals/save`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...getPlayerAuthHeaders() },
        body: JSON.stringify({ goal }),
      });
    } catch (e) {
      console.warn('[Goals] Failed to save to DB:', e);
    }
  }, [player.userId]);

  // Keep the ref in sync so the quest gen listener can call it
  useEffect(() => { saveGoalToDbRef.current = saveGoalToDb; }, [saveGoalToDb]);

  const handleUpdateGoals = useCallback((updatedGoals: any[]) => {
    setPlayer(prev => {
      // Find which goals changed and save them
      const prevGoals = prev.goals || [];
      updatedGoals.forEach(g => {
        const old = prevGoals.find(pg => pg.id === g.id);
        if (!old || JSON.stringify(old) !== JSON.stringify(g)) {
          saveGoalToDb(g);
        }
      });
      return { ...prev, goals: updatedGoals };
    });
  }, [saveGoalToDb]);

  const handleDeleteGoal = useCallback(async (goalId: string) => {
    if (player.userId) {
      try {
        await fetch(`${API_BASE}/api/goals/${goalId}`, {
          method: 'DELETE',
          credentials: 'include',
          headers: { ...getPlayerAuthHeaders() },
        });
      } catch (e) { console.warn('[Goals] Failed to delete from DB:', e); }
    }
  }, [player.userId]);






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

      enqueueOverlay('dailyLogin');

    }

  }, [player.isConfigured, player.tutorialComplete, isNewUserOnboarding, checkDailyLogin]); // eslint-disable-line react-hooks/exhaustive-deps



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

    // Only enqueue if not already active to prevent double-show
    if (activeOverlay !== 'streak') {
      enqueueOverlay('streak');
    }

  }, [player.isConfigured, player.lastLoginDate, player.userId]); // eslint-disable-line react-hooks/exhaustive-deps



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

        enqueueOverlay('levelUp');

      }

    };

    window.addEventListener('player:levelup', handleLevelUp);

    return () => window.removeEventListener('player:levelup', handleLevelUp);

  }, [enqueueOverlay]);



  useEffect(() => {

    if (player.logs.length > 0 && player.logs[0].type === 'LEVEL_DOWN') {

      const diff = Date.now() - player.logs[0].timestamp;

      if (diff < 5000) { setShowLevelDown(true); enqueueOverlay('levelDown'); }

    }

  }, [player.logs, player.level, enqueueOverlay]);





  useEffect(() => {

    const currentRank = player.rank;

    if (prevRankRef.current !== null && prevRankRef.current !== currentRank && player.isConfigured) {

      // Skip UNRANKED → E transition — handled by the dedicated rank reveal cinematic

      if (prevRankRef.current === 'UNRANKED' && currentRank === 'E') {

        prevRankRef.current = currentRank;

        return;

      }

      const rankOrder = ['UNRANKED', 'E', 'D', 'C', 'B', 'A', 'S'];

      const oldIdx = rankOrder.indexOf(prevRankRef.current);

      const newIdx = rankOrder.indexOf(currentRank);

      if (newIdx > oldIdx) {

        setRankUpData({ oldRank: prevRankRef.current, newRank: currentRank });

        enqueueOverlay('rankUp');

      }

    }

    prevRankRef.current = currentRank;

  }, [player.rank, player.isConfigured, enqueueOverlay]);



  useEffect(() => {

    if (!isDungeonMode) setShowNav(true);

  }, [activeTab, isDungeonMode]);



  // ── Level 1 Quest Onboarding Trigger ──

  // Show guided quest tutorial for new users who haven't completed it

  // This triggers AFTER streak celebration closes

  const prevStreakShownRef = useRef(showStreakCelebration);

  useEffect(() => {

    return; // DISABLED: Quest tutorial removed in v4

    if (!player.isConfigured) return;

    if (player.questOnboardingDone) return;

    if (player.level < 1) return;

    // Only trigger after initial onboarding is done

    if (onboardingPhase !== 'APP') return;

    if (showDuskWelcome) return;

    if (showQuestOnboarding || questOnboardingStep !== 0) return;

    if (activeOverlay !== null) return; // Wait for any queued overlay (streak, notifPrompt) to finish first

    

    // Don't show if level up/down, rank up, or other overlays are active

    if (showLevelUp || showLevelDown || rankUpData) return;

    

    // Wait for streak celebration to finish (transition from true to false)

    const streakWasShown = prevStreakShownRef.current;

    const streakJustClosed = streakWasShown && !showStreakCelebration;

    prevStreakShownRef.current = showStreakCelebration;

    

    // If streak is currently showing, wait

    if (showStreakCelebration) return;

    

    // Only proceed if streak just closed or we're already past it

    // and quest onboarding hasn't started yet

    if (!streakJustClosed && questOnboardingStep === 0) {

      // Initial check - small delay to let app settle

      const timer = setTimeout(() => {

        if (!player.questOnboardingDone && !showStreakCelebration && activeOverlay === null) {

          setShowDuskWelcome(true);

          setActiveTab('DASHBOARD');

        }

      }, 500);

      return () => clearTimeout(timer);

    }

    

    // Streak just closed - start quest onboarding

    if (streakJustClosed && questOnboardingStep === 0) {

      setShowDuskWelcome(true);

      setActiveTab('DASHBOARD');

    }

  }, [player.isConfigured, player.questOnboardingDone, onboardingPhase, showStreakCelebration, showLevelUp, showLevelDown, rankUpData, showDuskWelcome, showQuestOnboarding, questOnboardingStep]); // eslint-disable-line react-hooks/exhaustive-deps



  const handleDuskWelcomeNext = useCallback(() => {

    setShowDuskWelcome(false);

    setShowQuestOnboarding(true);

    setQuestOnboardingStep(1);

    setActiveTab('DASHBOARD');

  }, []);



  // ── Rank Reveal after quest+workout onboarding complete ──

  useEffect(() => {

    if (!player.isConfigured) return;

    if (player.rankRevealed) return;

    if (player.rank !== 'UNRANKED') return;

    if (!player.questOnboardingDone) return;

    // Show rank reveal after quest onboarding is done

    const timer = setTimeout(() => {

      setShowRankReveal(true);

    }, 800);

    return () => clearTimeout(timer);

  }, [player.questOnboardingDone, player.rankRevealed, player.rank, player.isConfigured]);



  // ── Feature Unlock Triggers (Level 5 and Level 10) ──

  const prevLevelRef = useRef(player.level);

  useEffect(() => {

    if (!player.isConfigured) return;

    const prev = prevLevelRef.current;

    const curr = player.level;

    prevLevelRef.current = curr;

    if (prev === curr) return;



    // Feature unlock cinematics disabled — only streak and rank popups are shown
    // const shownLevels = player.featureUnlocksShown || [];
    // if (curr >= 5 && !shownLevels.includes(5) && prev < 5) {
    //   setTimeout(() => setShowFeatureUnlock(5), 1500);
    // } else if (curr >= 10 && !shownLevels.includes(10) && prev < 10) {
    //   setTimeout(() => setShowFeatureUnlock(10), 1500);
    // }

  }, [player.level, player.isConfigured]); // eslint-disable-line react-hooks/exhaustive-deps



  // ── Quest Onboarding Step Handler ──

  const handleQuestOnboardingStep = useCallback((step: number, isFailure = false) => {

    if (step === 1) {

      // User tapped Quests tab

      setQuestOnboardingStep(2);

      setActiveTab('DASHBOARD');

    } else if (step === 4 && isFailure) {

      // Analysis failed - go back to step 3 with error state

      setQuestAnalysisFailed(true);

      setQuestOnboardingStep(3);

    } else if (step === 3 && questAnalysisFailed) {

      // User is retrying after failure - reset error state and proceed

      setQuestAnalysisFailed(false);

      setQuestOnboardingStep(4);

    } else if (step < 6) {

      setQuestOnboardingStep(step + 1);

    } else {

      // Quest onboarding complete

      setShowQuestOnboarding(false);

      setQuestOnboardingStep(0);

      setPlayer(prev => ({ ...prev, questOnboardingDone: true }));

    }

  }, [setPlayer, questAnalysisFailed]);



  const handleQuestOnboardingComplete = useCallback(() => {

    setShowQuestOnboarding(false);

    setQuestOnboardingStep(0);

    setPlayer(prev => ({ ...prev, questOnboardingDone: true }));

  }, [setPlayer]);



  const handleTutorialManaOut = useCallback(() => {

    setShowQuestOnboarding(false);

    setQuestOnboardingStep(0);

    setPlayer(prev => ({ ...prev, questOnboardingDone: true }));

    addNotification('Not enough Mana to continue the tutorial. Mana resets at midnight.', 'WARNING');

  }, [setPlayer, addNotification]);



  // ── Workout Onboarding Step Handler ──

  const handleWorkoutOnboardingStep = useCallback((step: number) => {

    if (step < 4) {

      setWorkoutOnboardingStep(step + 1);

    } else {

      setShowWorkoutOnboarding(false);

      setWorkoutOnboardingStep(0);

      setPlayer(prev => ({ ...prev, workoutOnboardingDone: true }));

    }

  }, [setPlayer]);



  const handleWorkoutOnboardingComplete = useCallback(() => {

    setShowWorkoutOnboarding(false);

    setWorkoutOnboardingStep(0);

    setPlayer(prev => ({ ...prev, workoutOnboardingDone: true }));

  }, [setPlayer]);



  // ── Rank Reveal Complete Handler ──

  const handleRankRevealComplete = useCallback(() => {

    setShowRankReveal(false);

    setPlayer(prev => ({ ...prev, rank: 'E', rankRevealed: true }));

    // DISABLED: Workout onboarding removed in v4

  }, [setPlayer, player.workoutOnboardingDone]);



  // ── Feature Unlock Complete Handler ──

  const handleFeatureUnlockComplete = useCallback((level: number) => {

    setShowFeatureUnlock(null);

    setPlayer(prev => ({

      ...prev,

      featureUnlocksShown: [...(prev.featureUnlocksShown || []), level],

    }));

    // Show the tutorial after the cinematic

    if (level === 5) {

      setTimeout(() => {

        setShowLevel5Tutorial(true);

        setLevel5TutStep(1);

      }, 400);

    } else if (level === 10) {

      setTimeout(() => {

        setShowLevel10Tutorial(true);

        setLevel10TutStep(1);

      }, 400);

    }

  }, [setPlayer]);





  const handleTutorialNext = () => {

    const nextStep = player.tutorialStep + 1;

    if (nextStep === 1) setActiveTab('DASHBOARD');

    advanceTutorial(nextStep);

  };



  const handleTutorialComplete = () => completeTutorial();



  useEffect(() => {

    if (!player.tutorialComplete) {

      setTutorialTarget(null);

    }

  }, [player.tutorialStep, player.quests, player.tutorialComplete]);



  // Welcome quest auto-advance removed (6-step tutorial)







  const handleQuestComplete = (id: string, asMini: boolean = false, rect?: DOMRect) => {

    const quest = player.quests.find(q => q.id === id);

    if (!quest || quest.isCompleted || quest.failed) return;

    const xpBefore = player.currentXp;

    const levelBefore = player.level;

    const requiredXpBefore = player.requiredXp;

    const xpGained = asMini ? Math.floor((quest.xpReward || 50) * 0.1) : (quest.xpReward || 50);

    const RANK_GOLD: Record<string, number> = { E: 10, D: 20, C: 40, B: 80, A: 150, S: 300 };

    const goldGained = asMini ? 5 : (RANK_GOLD[quest.rank] || 20);



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



    // -- Sensor Validation (2-of-3 Rule) — checked BEFORE any animation --

    if (quest.sensorRequirements && !asMini) {

      const sr = quest.sensorRequirements;

      const sd = (quest as any).sensorData;

      const checks: { pass: boolean }[] = [];

      if (sr.steps) {

        checks.push({ pass: (sd?.stepsRecorded ?? 0) >= sr.steps * 0.6 });

      }

      if (sr.distanceKm) {

        checks.push({ pass: (sd?.distanceRecorded ?? 0) >= sr.distanceKm * 0.6 });

      }

      if (sr.activeMinutes) {

        checks.push({ pass: (sd?.activeMinutesRecorded ?? 0) >= sr.activeMinutes * 0.6 });

      }

      const passCount = checks.filter(c => c.pass).length;

      if (checks.length > 0 && passCount < Math.min(2, checks.length)) {

        // Sensor validation failed — show ForgeGuard immediately, NO animations

        setSensorBlockedQuestId(id);

        setAuditOutcome('flagged');

        setPendingAuditQuest({

          id, title: quest.title, rank: quest.rank, asMini: false, rect,

          xpGained: 0, xpBefore, requiredXp: requiredXpBefore, level: levelBefore, goldGained: 0,

        });

        setShowAuditTheater(true);

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

      if (hasCheatStrikes || tooManyHighRanksToday || isFirstS || Math.random() < 0.15) {

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

    completeQuest(id, asMini);

    if (rect) {

      setXpCollection({ startRect: rect, xpGained, currentXp: xpBefore, requiredXp, level });

    }

    // Confetti on quest completion

    window.dispatchEvent(new CustomEvent('reforge:confetti', {

      detail: { intensity: 'small', origin: rect ?? null }

    }));

    // Welcome quest tutorial advances removed (6-step tutorial)

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

    setSensorBlockedQuestId(null);

    finishQuestComplete(q.id, q.asMini, q.rect, q.xpGained, q.xpBefore, q.requiredXp, q.level, q.goldGained);

  };



  const handleAuditFlagged = () => {

    if (!pendingAuditQuest) return;

    const q = pendingAuditQuest;

    const isSensorBlock = sensorBlockedQuestId === q.id;



    setShowAuditTheater(false);

    setPendingAuditQuest(null);

    setSensorBlockedQuestId(null);



    // Record strike — cheating detected by ForgeGuard

    recordStrike();



    if (isSensorBlock) {

      // Sensor validation failed — permanently fail the quest + coin-lost animation

      failFlaggedQuest(q.id);

      const el = document.getElementById(`quest-card-${q.id}`);

      const sourceRect = el?.getBoundingClientRect() || null;

      window.dispatchEvent(new CustomEvent('reforge:coin-lost', { detail: { amount: 50, sourceRect } }));

      return;

    }



    // Regular audit flagged — fail quest + coin-lost animation

    failFlaggedQuest(q.id);

    const el = document.getElementById(`quest-card-${q.id}`);

    const sourceRect = el?.getBoundingClientRect() || null;

    window.dispatchEvent(new CustomEvent('reforge:coin-lost', { detail: { amount: q.goldGained || 20, sourceRect } }));



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

  };







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
            username={player.username || player.name}
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

          <DuskWelcomeScreen onComplete={() => setOnboardingPhase('AUTH')} />

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

                // New flow: user authenticated BEFORE calibration. Finalize registration now and go to APP.
                // Read from sessionStorage as a fallback in case the React state is stale across the long
                // AWAKENING animation (closure captured before state hydrated, etc.).

                const authProfile = tempAuthProfile || ssGet<any>(SS_AUTH);

                if (authProfile && !logoutFlowRef.current) {

                  const cloudData = (authProfile as any).raw_data as Partial<PlayerData> | undefined;

                  const merged = {

                    ...authProfile,

                    ...(tempUserData ? {

                      country: tempUserData.country,

                      timezone: tempUserData.tz,

                    } : {}),

                    healthProfile: profile,

                    stats,

                  };

                  registerUser(merged);

                  if (!cloudData?.startDate) {

                    setPlayer(prev => ({ ...prev, startDate: prev.startDate || Date.now() }));

                  }

                  setTempAuthProfile(null);

                  ssClear();

                  // Effect on player.isConfigured will auto-route to APP

                  return;

                }

                // Legacy path (logout-recalibrate): go back to sign-in

                console.warn('[Calibration] No auth profile found at completion — falling back to AUTH flow');

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

            const isReturningUser = !!(cloudData?.isConfigured || (cloudData as any)?.avatarUrl);

            if (isReturningUser) {

              // Returning user — register immediately, go straight to APP

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

              ssClear();

              setOnboardingPhase('APP');

            } else {

              // New user signup — defer registerUser until calibration completes,

              // otherwise isConfigured=true would auto-skip the onboarding flow

              setTempAuthProfile(profile);

              ssSet(SS_AUTH, profile);

              setOnboardingPhase('AGREEMENT');

            }

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

            const isReturningUser = !!(cloudData?.isConfigured || (cloudData as any)?.avatarUrl);

            if (isReturningUser) {

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

              ssClear();

              setOnboardingPhase('APP');

            } else {

              // Signed in but not yet calibrated (abandoned signup) — resume onboarding

              setTempAuthProfile(profile);

              ssSet(SS_AUTH, profile);

              setOnboardingPhase('AGREEMENT');

            }

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

            const isReturningUser = !!(cloudData?.isConfigured || (cloudData as any)?.avatarUrl);

            if (isReturningUser) {

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

              ssClear();

              setOnboardingPhase('APP');

            } else {

              // New account — defer registerUser until after calibration

              setTempAuthProfile(profile);

              ssSet(SS_AUTH, profile);

              setOnboardingPhase('AGREEMENT');

            }

          }}

          onNavigate={(dest) => setOnboardingPhase(dest)}

        />

      );

    }

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

    <ThemeContext.Provider value={themeCtx}>

    <>

      <SystemMessage notifications={notifications} removeNotification={removeNotification} />



      {/* ── Overlays ── */}

      <Suspense fallback={null}>

        <AnimatePresence>

          {DAILY_REWARDS_ENABLED && showDailyLogin && activeOverlay === 'dailyLogin' && (

            <ErrorBoundary>

              <DailyLoginModal 

                onClose={() => {

                  setShowDailyLogin(false);

                  setDailyReward(null);

                  dismissOverlay();

                }}

                onChestReward={() => {

                  setShowDailyLogin(false);

                  setDailyReward(null);

                  dismissOverlay();

                  setShowChestOpening(true);

                }}

              />

            </ErrorBoundary>

          )}

          {showStreakCelebration && streakAnimData && activeOverlay === 'streak' && (

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

                    dismissOverlay();

                    // Re-schedule streak reminder for tomorrow (workout already done today)

                    if (player.streak >= 1) {

                      scheduleStreakReminder(player.streak, true, true).catch(() => {});

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

          {showLevelUp && activeOverlay === 'levelUp' && (

            <Suspense fallback={null}>

              <ErrorBoundary>

                <LevelUpCinematic level={player.level} onComplete={() => { setShowLevelUp(false); dismissOverlay(); }} />

              </ErrorBoundary>

            </Suspense>

          )}

          {showLevelDown && activeOverlay === 'levelDown' && (

            <Suspense fallback={null}>

              <ErrorBoundary>

                <LevelDownCinematic onClose={() => { setShowLevelDown(false); dismissOverlay(); }} />

              </ErrorBoundary>

            </Suspense>

          )}

          {rankUpData && activeOverlay === 'rankUp' && (

            <Suspense fallback={null}>

              <ErrorBoundary>

                <RankUpCinematic

                  oldRank={rankUpData.oldRank as 'UNRANKED'|'E'|'D'|'C'|'B'|'A'|'S'}

                  newRank={rankUpData.newRank as 'UNRANKED'|'E'|'D'|'C'|'B'|'A'|'S'}

                  onComplete={() => { setRankUpData(null); dismissOverlay(); }}

                />

              </ErrorBoundary>

            </Suspense>

          )}

          {player.tournament.pendingReward && (

            <Suspense fallback={null}>

              <ErrorBoundary>

                <TournamentResultModal reward={player.tournament.pendingReward} onClaim={claimTournamentReward} />

              </ErrorBoundary>

            </Suspense>

          )}

          {showDuskChat && (

            <Suspense fallback={null}>

              <ErrorBoundary>

                <DuskChat

                  player={player}

                  updatePlayer={setPlayer}

                  onClose={() => setShowDuskChat(false)}

                  onMarkRead={markDuskMessagesRead}

                  onConsumeMana={consumeMana}

                  onRefundMana={refundMana}

                />

              </ErrorBoundary>

            </Suspense>

          )}

          {showGoalCreate && (
            <Suspense fallback={null}>
              <GoalCreationFlow
                playerData={player}
                existingGoals={player.goals || []}
                onClose={() => setShowGoalCreate(false)}
                onGoalCreated={(newGoal) => {
                  handleUpdateGoals([...(player.goals || []), newGoal]);
                  setShowGoalCreate(false);
                }}
                onConsumeMana={consumeMana}
                onRefundMana={refundMana}
              />
            </Suspense>
          )}

          {xpCollection && (

            <Suspense fallback={null}>

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

            </Suspense>

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

              <ErrorBoundary>

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

              </ErrorBoundary>

            </Suspense>

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



      {/* Tutorial enabled per user request. Set TUTORIAL_ACTIVE to true to enable. */}

      {(() => {

        const TUTORIAL_ACTIVE = false; 

        if (!TUTORIAL_ACTIVE) return null;

        

        if (false) { // DISABLED: Tutorial removed in v4

          return (

            <Suspense fallback={null}>

              <ErrorBoundary>

                <TutorialOverlay

                  currentStep={player.tutorialStep}

                  onNext={handleTutorialNext}

                  onComplete={handleTutorialComplete}

                  dynamicTargetId={tutorialTarget}

                  analysisFailed={tutorialAnalysisFailed}

                  onAnalysisRetry={() => { setTutorialAnalysisFailed(false); advanceTutorial(2); }}

                />

              </ErrorBoundary>

            </Suspense>

          );

        }

        return null;

      })()}



      <AnimatePresence>

        {showDuskWelcome && (

          <motion.div

            key="dusk-welcome"

            initial={{ opacity: 0 }}

            animate={{ opacity: 1 }}

            exit={{ opacity: 0 }}

            className="fixed inset-0 z-[950]"

            style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(10px)' }}

          >

            <div className="absolute inset-0 flex items-center justify-center p-6">

              <motion.div

                initial={{ opacity: 0, y: 12, scale: 0.98 }}

                animate={{ opacity: 1, y: 0, scale: 1 }}

                exit={{ opacity: 0, y: 12, scale: 0.98 }}

                transition={{ type: 'spring', stiffness: 260, damping: 24 }}

                className="w-full max-w-[420px] rounded-2xl border border-cyan-400/30 overflow-hidden"

                style={{

                  background: 'linear-gradient(135deg, rgba(12,12,30,0.98) 0%, rgba(6,6,20,0.98) 100%)',

                  boxShadow: '0 0 40px rgba(126,184,212,0.18), 0 10px 40px rgba(0,0,0,0.6)',

                }}

              >

                <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(126,184,212,0.9), transparent)' }} />

                <div className="p-5">

                  <div className="text-[10px] font-mono tracking-[0.25em] uppercase text-cyan-300/80">

                    Welcome

                  </div>

                  <div className="mt-2 text-lg font-black text-white">

                    Hi! I’m Dusk.

                  </div>

                  <div className="mt-2 text-[12px] leading-relaxed text-gray-300">

                    I’m your companion here. I’ll show you the basics so you can create your first quest and start making progress.

                  </div>

                  <div className="mt-5 flex justify-end">

                    <button

                      onClick={handleDuskWelcomeNext}

                      className="px-5 py-2.5 rounded-xl text-xs font-black font-mono tracking-widest"

                      style={{ background: '#00d4ff', color: '#000', boxShadow: '0 0 18px rgba(126,184,212,0.35)' }}

                    >

                      NEXT

                    </button>

                  </div>

                </div>

              </motion.div>

            </div>

          </motion.div>

        )}

      </AnimatePresence>



      {/* ── Guided Quest Onboarding (Level 1) ── */}

      {showQuestOnboarding && questOnboardingStep > 0 && (

        <Suspense fallback={null}>

          <ErrorBoundary>

            <GuidedQuestOnboarding

              currentStep={questOnboardingStep}

              onStepComplete={handleQuestOnboardingStep}

              onComplete={handleQuestOnboardingComplete}

              analysisFailed={questAnalysisFailed}

              onAnalysisFailedReset={() => setQuestAnalysisFailed(false)}

            />

          </ErrorBoundary>

        </Suspense>

      )}



      {/* ── Workout Onboarding Tutorial (Level 1) ── */}

      {showWorkoutOnboarding && workoutOnboardingStep > 0 && (

        <Suspense fallback={null}>

          <ErrorBoundary>

            <WorkoutOnboardingTutorial

              currentStep={workoutOnboardingStep}

              onStepComplete={handleWorkoutOnboardingStep}

              onComplete={handleWorkoutOnboardingComplete}

            />

          </ErrorBoundary>

        </Suspense>

      )}



      {/* ── Rank Reveal (UNRANKED → E) ── */}

      <AnimatePresence>

        {showRankReveal && (

          <Suspense fallback={null}>

            <ErrorBoundary>

              <RankUpCinematic

                oldRank="UNRANKED"

                newRank="E"

                onComplete={handleRankRevealComplete}

              />

            </ErrorBoundary>

          </Suspense>

        )}

      </AnimatePresence>



      {/* ── Feature Unlock Cinematic (Level 5 / Level 10) ── */}

      <AnimatePresence>

        {showFeatureUnlock !== null && (

          <Suspense fallback={null}>

            <ErrorBoundary>

              <FeatureUnlockCinematic

                level={showFeatureUnlock}

                onComplete={() => handleFeatureUnlockComplete(showFeatureUnlock)}

              />

            </ErrorBoundary>

          </Suspense>

        )}

      </AnimatePresence>



      {/* ── Level 5 Tutorial ── */}

      {showLevel5Tutorial && (

        <Suspense fallback={null}>

          <ErrorBoundary>

            <Level5Tutorial

              currentStep={level5TutStep}

              onStepComplete={(step) => setLevel5TutStep(step + 1)}

              onComplete={() => setShowLevel5Tutorial(false)}

            />

          </ErrorBoundary>

        </Suspense>

      )}



      {/* ── Level 10 Tutorial ── */}

      {showLevel10Tutorial && (

        <Suspense fallback={null}>

          <ErrorBoundary>

            <Level10Tutorial

              currentStep={level10TutStep}

              onStepComplete={(step) => setLevel10TutStep(step + 1)}

              onComplete={() => setShowLevel10Tutorial(false)}

            />

          </ErrorBoundary>

        </Suspense>

      )}



      {/* Confetti Overlay — rendered at App level */}

      <Suspense fallback={null}>

        <ErrorBoundary>

          <ConfettiOverlay />

        </ErrorBoundary>

      </Suspense>







      <Layout

        navigation={shouldShowNav ? (

          <Navigation

            activeTab={activeTab}

            onTabChange={navigateTo}

            badges={{ LEADERBOARD: !player.allianceId }}

            playerLevel={player.level}

            guidedStep={undefined}

            onGuidedAction={(step) => {

              if (step === 1) handleQuestOnboardingStep(1);

              if (step === 7) {

                // Workout onboarding step — just switch tab

              }

            }}

          />

        ) : null}

        playerLevel={player.level}

        playerName={player.name}

        playerUsername={player.username}

        playerRank={player.rank}

        streak={player.streak}

        gold={player.gold}

        currentXp={player.currentXp}
        requiredXp={player.requiredXp}

        consumables={player.consumables}

        replitUser={player.replitUser}

        playerAvatarUrl={player.avatarUrl}

        notificationHistory={notificationHistory}

        hasUnreadNotifications={hasUnreadNotifications}

        onMarkNotificationsRead={markNotificationsRead}

        onClearNotificationHistory={clearNotificationHistory}

        headerDisabled={isDungeonMode}

        forceHeaderVisible={false}

        hideAmbientGlow={activeTab === 'PROFILE'}

        onGoldClick={!isDungeonMode ? () => navigateTo('STORE') : undefined}

        onLogout={() => setShowLogoutChoice(true)}

        onEditProfile={() => navigateTo('PROFILE')}

      >

        {/* Food scan in-progress banner — shown on any tab except HEALTH */}

        {foodScanBannerVisible && activeTab !== 'HEALTH' && (

          <div

            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full text-xs font-mono font-bold cursor-pointer"

            style={{ background: 'rgba(126,184,212,0.12)', border: '1px solid rgba(126,184,212,0.4)', color: '#7EB8D4', backdropFilter: 'blur(12px)' }}

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
              className="space-y-6 md:space-y-8"
            >              {/* ── 1. Growth Terminal (Radar + Calendar + Mana + ForgeGuard) ── */}
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

              {/* ── Promo Banners: Food Scanner & Store Deals ── */}
              <div className="grid grid-cols-2 gap-3 px-1">
                {/* Food Scanner Card */}
                <button
                  onClick={() => {
                    setHealthSubTab('NUTRITION');
                    setActiveTab('HEALTH' as Tab);
                  }}
                  className="relative overflow-hidden rounded-2xl active:scale-[0.97] transition-transform text-left"
                  style={{
                    height: 180,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                    border: '1px solid rgba(126,184,212,0.3)',
                  }}
                >
                  <PromoImg
                    src="/images/ui/food-scanner-promo.webp"
                    alt="Food Scanner"
                    style={{ filter: 'brightness(0.5)' }}
                  />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0.15) 100%)' }} />
                  <div className="absolute inset-0 p-4 flex flex-col justify-end">
                    <div className="text-[8px] font-mono font-bold tracking-[0.25em] text-[#7EB8D4] uppercase mb-1.5">Nutrition</div>
                    <div className="text-[14px] font-black text-white leading-tight mb-1.5">Scan Your Food</div>
                    <div className="text-[9px] text-gray-400 font-mono leading-relaxed">Log calories & macros instantly with AI scan</div>
                  </div>
                </button>

                {/* Store Deals Card */}
                <button
                  onClick={() => {
                    setStoreInitialTab('DEALS');
                    setActiveTab('STORE' as Tab);
                  }}
                  className="relative overflow-hidden rounded-2xl active:scale-[0.97] transition-transform text-left"
                  style={{
                    height: 180,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                    border: '1px solid rgba(126,184,212,0.3)',
                  }}
                >
                  <PromoImg
                    src="/images/ui/store-deals-promo.webp"
                    alt="Store Deals"
                    style={{ filter: 'brightness(0.5)' }}
                  />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0.15) 100%)' }} />

                  <div className="absolute inset-0 p-4 flex flex-col justify-end">
                    <div className="text-[8px] font-mono font-bold tracking-[0.25em] text-[#facc15] uppercase mb-1.5">Store</div>
                    <div className="text-[14px] font-black text-white leading-tight mb-1.5">Today's Deals</div>
                    <div className="text-[9px] text-gray-400 font-mono leading-relaxed">Exclusive borders, banners & cosmetics on sale</div>
                  </div>
                </button>
              </div>

              {/* ── 2. Goal Hero + Pinned Goals ── */}
              <Suspense fallback={null}>
                <ErrorBoundary fallbackLabel="Goals failed">
                  <GoalHeroSection
                    goals={player.goals || []}
                    onCreateGoal={() => setShowGoalCreate(true)}
                    generatingGoalId={generatingGoalId}
                    onGenerateQuests={(goalId) => {
                      const goal = (player.goals || []).find(g => g.id === goalId);
                      if (!goal) return;
                      const todayStr = new Date().toISOString().split('T')[0];
                      const currentDay = Math.max(1, Math.floor((Date.now() - goal.startDate) / (1000 * 60 * 60 * 24)) + 1);
                      startQuestGeneration({
                        goal,
                        allGoals: player.goals || [],
                        playerData: player,
                        todayStr,
                        currentDay,
                        existingQuests: player.quests,
                      });
                    }}
                  />
                </ErrorBoundary>
              </Suspense>

              {/* ── 3. Daily Quests ── */}
              <div id="daily-command-center">
              <Suspense fallback={<SkeletonQuestsPage />}>
                <ErrorBoundary fallbackLabel="Quests failed to load">
                  <DailyCommandCenter
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

                    onStartTracking={handleStartTracking}
                    onStopTracking={handleStopTracking}
                    onConsumeMana={consumeMana}
                    onRefundMana={refundMana}
                    isQuestOnboarding={showQuestOnboarding && questOnboardingStep > 0}
                    onTutorialManaOut={handleTutorialManaOut}
                    goals={player.goals || []}
                    onUpdateGoals={handleUpdateGoals}
                    onDeleteGoal={handleDeleteGoal}
                    onDeductGold={(amount) => setPlayer(prev => ({ ...prev, gold: Math.max(0, prev.gold - amount) }))}
                  />
                </ErrorBoundary>
              </Suspense>
              </div>

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


                    consumables={player.consumables}

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

                    ownedBorders={player.ownedBorders || ['border_default']}

                    equippedBorder={player.equippedBorder}

                    playerLevel={player.level}

                    onPurchaseBorder={purchaseBorder}

                    onEquipBorder={equipBorder}

                    onEquipBanner={equipBanner}

                    initialStoreTab={storeInitialTab}

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


                    consumables={player.consumables}

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


                    onConsumeMana={consumeMana}

                    onRefundMana={refundMana}

                    onUpdateSkillProgress={updateSkillProgress}

                    playerLevel={player.level}

                    onAddRewards={addRewards}

                    initialSubTab={healthSubTab}

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

                  <YouView

                    player={player}

                    equippedOutfit={dbOutfits.find(o => o.id === player.equippedOutfitId) || OUTFITS.find(o => o.id === player.equippedOutfitId)}

                    history={player.history || []}

                    onUpdate={updateProfile}

                    onAvatarChange={(newUrl) => setPlayer(prev => ({ ...prev, avatarUrl: newUrl }))}

                    onLogout={() => setShowLogoutChoice(true)}

                    onNavigate={(tab) => setActiveTab(tab)}

                    onOpenDusk={() => setShowDuskChat(true)}

                    onDeleteAccount={async () => {

                      if (!player.userId || player.userId.startsWith('local')) return;

                      const uid = player.userId;

                      const authHeaders = await getOrRefreshPlayerHeaders(API_BASE);



                      // 1. Call server to delete account data — this MUST succeed

                      let res: Response;

                      try {

                        res = await fetch(`${API_BASE}/api/player/${uid}/delete-account`, {

                          method: 'DELETE',

                          headers: { 'Content-Type': 'application/json', ...authHeaders },

                          credentials: 'include',

                        });

                      } catch (networkErr) {

                        throw new Error('Network error — check your internet connection and try again.');

                      }



                      if (!res.ok) {

                        let serverMsg = 'Server failed to delete account.';

                        try {

                          const body = await res.json();

                          if (body?.error) serverMsg = body.error;

                        } catch { /* non-JSON response */ }

                        throw new Error(serverMsg);

                      }



                      // 2. Server confirmed deletion — NOW safe to wipe local data

                      clearAuthNative();

                      localStorage.removeItem('reforge_player_v2');

                      localStorage.removeItem(`reforge_workout_day_map_${uid}`);

                      localStorage.removeItem(`reforge_journey_start_${uid}`);

                      localStorage.removeItem(`reforge_session_logs_${uid}`);

                      localStorage.removeItem('reforge_workout_day_map');

                      localStorage.removeItem('reforge_journey_start');

                      localStorage.removeItem('reforge_notif_opt');

                      sessionStorage.clear();

                      resetPlayer();

                      setOnboardingPhase('WELCOME');

                      setLoading(false);

                    }}

                    onTestSetRank={(rank) => setPlayer(prev => ({ ...prev, rank: rank as PlayerData['rank'] }))}

                  />

                </ErrorBoundary>

              </Suspense>

            </motion.div>

          )}



        </AnimatePresence>

        </div>{/* end swipe wrapper */}



        {activeTab === 'DASHBOARD' && (

          <ErrorBoundary>

          <MobileFloatingMenu

            gold={player.gold}


            onAddRewards={addRewards}

            onAddNotification={(msg: string, type: any) => addNotification(msg, type)}

            onOpenDuskChat={() => setShowDuskChat(true)}

          />

          </ErrorBoundary>

        )}






        {showLogoutChoice && (

          <ErrorBoundary>

          <LogoutChoiceScreen

            onSelect={(dest) => {

              logoutFlowRef.current = true;

              setShowLogoutChoice(false);

              // 1. Clear local storage and reset player state IMMEDIATELY

              const prevUserId = player.userId;

              const prevPlayer = { ...player };

              clearAuthNative();

              clearEconomySession(); // Clear per-user economy on logout

              localStorage.removeItem('reforge_player_v2');

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

          </ErrorBoundary>

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

          {showNotifPrompt && activeOverlay === 'notifPrompt' && (

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

                className="w-full max-w-sm bg-[#0a0a14] border border-[#7EB8D4]/30 rounded-2xl p-6 space-y-4"

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

                    className="py-3 rounded-xl bg-[#7EB8D4] text-black font-bold text-xs tracking-widest hover:bg-white transition-colors"

                  >

                    ENABLE

                  </button>

                </div>

              </motion.div>

            </motion.div>

          )}

        </AnimatePresence>






      </Layout>

    <SystemToastOverlay />
    </>

    </ThemeContext.Provider>

  );

};



export default App;

