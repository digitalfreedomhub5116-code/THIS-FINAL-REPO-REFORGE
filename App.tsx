import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import Layout from './components/Layout';
import Navigation from './components/Navigation';
import MobileFloatingMenu from './components/MobileFloatingMenu';
import SplashScreen from './components/SplashScreen';
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

import { useSystem } from './hooks/useSystem';
import { Tab, CoreStats, HealthProfile, Outfit, DbOutfit, TierLevel, PlayerData, Quest, DailyReward } from './types';
import { OUTFITS } from './utils/gameData';
import { getPlayerAuthHeaders } from './lib/playerApi';
import { Terminal } from 'lucide-react';

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
const RankingView = lazy(() => import('./components/RankingView'));
const HunterGrowthTerminal = lazy(() => import('./components/HunterGrowthTerminal'));
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
const AvatarGenerator = lazy(() => import('./components/AvatarGenerator'));
const DuskChat = lazy(() => import('./components/DuskChat'));
const XpCollectionOverlay = lazy(() => import('./components/XpCollectionOverlay'));
const CheatWarningModal = lazy(() => import('./components/CheatWarningModal'));
const LevelDownCinematic = lazy(() => import('./components/LevelDownCinematic'));
const BanScreen = lazy(() => import('./components/BanScreen'));
const BanReversalNotice = lazy(() => import('./components/BanReversalNotice'));
const GuildsView = lazy(() => import('./components/GuildsView'));
const LevelProgressCard = lazy(() => import('./components/LevelProgressCard'));
const WardrobePreviewCard = lazy(() => import('./components/WardrobePreviewCard'));
const RankProgressionCard = lazy(() => import('./components/RankProgressionCard'));
const DashboardWidgets = lazy(() => import('./components/DashboardWidgets'));
const EarlyCompletionPenalty = lazy(() => import('./components/EarlyCompletionPenalty'));
const DuskWelcomeScreen = lazy(() => import('./components/DuskWelcomeScreen'));
const ProfileView = lazy(() => import('./components/ProfileView'));
const RankUpCinematic = lazy(() => import('./components/RankUpCinematic'));
const SystemPactScreen = lazy(() => import('./components/SystemPactScreen'));
const ConfettiOverlay = lazy(() => import('./components/ConfettiOverlay'));
const StrikeLiftedModal = lazy(() => import('./components/StrikeLiftedModal'));
const ForgeGuardWidget = lazy(() => import('./components/ForgeGuardWidget'));

// ── Types ──
type OnboardingPhase = 'SPLASH' | 'WELCOME' | 'AGREEMENT' | 'NAMING' | 'CALIBRATION' | 'AUTH' | 'AUTH_SIGN_IN_PAGE' | 'AUTH_CREATE_PAGE' | 'AVATAR' | 'APP' | 'LOGOUT_CHOICE';

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
    verifyTicket, purchaseOutfit, equipOutfit,
    checkDailyLogin,
  } = useSystem();

  const [dbOutfits, setDbOutfits] = useState<Outfit[]>([]);
  const [dailyReward, setDailyReward] = useState<DailyReward | null>(null);
  const [showDailyLogin, setShowDailyLogin] = useState(false);

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
  const [tutorialTarget, setTutorialTarget] = useState<string | null>(null);
  const [tutorialAnalysisFailed, setTutorialAnalysisFailed] = useState(false);
  const [showDuskChat, setShowDuskChat] = useState(false);
  const [showBanReversalNotice, setShowBanReversalNotice] = useState(false);
  const [strikeLiftedNotifId, setStrikeLiftedNotifId] = useState<string | null>(null);

  // ── Sync from DB — callable ref for immediate triggers + 2s polling ──
  const syncFromDbRef = useRef<() => Promise<void>>();
  // Track last known DB values so we only overwrite local gold/keys when admin changes them
  const lastKnownDbGold = useRef<number | null>(null);
  const lastKnownDbKeys = useRef<number | null>(null);
  useEffect(() => {
    if (!player.userId || player.userId.startsWith('local')) return;
    banReversalShownRef.current = false;
    // Reset tracking refs on user change
    lastKnownDbGold.current = null;
    lastKnownDbKeys.current = null;
    const syncFromDb = async () => {
      try {
        const res = await fetch(`/api/player/${player.userId}`, { credentials: 'include', headers: { ...getPlayerAuthHeaders() } });
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
        const res = await fetch('/api/auth/whoami', { credentials: 'include' });
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
          const playerRes = await fetch(`/api/player/${uid}`, { credentials: 'include', headers: { ...getPlayerAuthHeaders() } });
          if (playerRes.ok) {
            const row = await playerRes.json();
            const rawData = row.raw_data as Partial<PlayerData> | null;
            if (rawData?.isConfigured || rawData?.avatarUrl) {
              registerUser({ id: uid, name: user.firstName || user.name || rawData.name, raw_data: rawData });
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
          setOnboardingPhase('AVATAR');
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
    fetch('/api/store/outfits')
      .then(r => r.json())
      .then((rows: DbOutfit[]) => {
        if (!Array.isArray(rows) || rows.length === 0) return;
        const converted: Outfit[] = rows.map(o => ({
          id: o.outfit_key,
          name: o.name,
          description: o.description,
          tier: o.tier as TierLevel,
          image: o.image_url || '',
          baseStats: { attack: o.attack, boost: o.boost, extraction: o.extraction, ultimate: o.ultimate },
          cost: o.cost,
          accentColor: o.accent_color,
          introVideoUrl: o.intro_video_url,
          loopVideoUrl: o.loop_video_url,
          isDefault: o.is_default,
          buffs: [],
        }));
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

  const dailyCheckRef = useRef(false);

  // Deferred daily login check
  useEffect(() => {
    // Wait until configured and tutorial is complete before showing daily login
    if (!player.isConfigured) {
      dailyCheckRef.current = false;
      return;
    }
    // If it's a new user and the tutorial isn't done yet, wait.
    if (isNewUserOnboarding && !player.tutorialComplete) return;

    if (dailyCheckRef.current) return;
    const reward = checkDailyLogin();
    if (reward) {
      setDailyReward(reward);
      setShowDailyLogin(true);
    }
    dailyCheckRef.current = true;
  }, [player.isConfigured, player.tutorialComplete, isNewUserOnboarding, checkDailyLogin]);

  useEffect(() => {
    if (player.logs.length > 0 && player.logs[0].type === 'LEVEL_UP') {
      const diff = Date.now() - player.logs[0].timestamp;
      if (diff < 5000) setShowLevelUp(true);
    }
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
      setIsDungeonMode(true);
      setActiveTab('CASTLE');
    }
  };

  const handleQuestComplete = (id: string, asMini: boolean = false, rect?: DOMRect) => {
    const quest = player.quests.find(q => q.id === id);
    if (!quest) return;
    const xpBefore = player.currentXp;
    const levelBefore = player.level;
    const requiredXpBefore = player.requiredXp;
    const xpGained = asMini ? Math.floor((quest.xpReward || 50) * 0.1) : (quest.xpReward || 50);
    const goldGained = asMini ? 5 : 20;

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
    fetch('/api/system-pact/create', {
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

  // ── Loading Screen ──
  if (loading) {
    return <SplashScreen onComplete={() => setLoading(false)} />;
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
      return (
        <Suspense fallback={<SkeletonOnboardingPage />}>
          <SplashScreen onComplete={() => setOnboardingPhase('WELCOME')} />
        </Suspense>
      );
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
            setPlayer(prev => ({ ...prev, ...merged, startDate: Date.now() }));
            const existingUser = !!(merged.isConfigured || merged.avatarUrl);
            setIsNewUserOnboarding(!existingUser);
            setOnboardingPhase(existingUser ? 'APP' : 'AVATAR');
          }}
        />
      );
    }
    if (onboardingPhase === 'AUTH_SIGN_IN_PAGE') {
      return (
        <SignInPage
          onLogin={(profile) => {
            logoutFlowRef.current = false;
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
            setPlayer(prev => ({ ...prev, ...merged, startDate: Date.now() }));
            const existingUser = !!(merged.isConfigured || merged.avatarUrl);
            setIsNewUserOnboarding(!existingUser);
            setOnboardingPhase(existingUser ? 'APP' : 'AVATAR');
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
            setPlayer(prev => ({ ...prev, ...merged, startDate: Date.now() }));
            const existingUser = !!(merged.isConfigured || merged.avatarUrl);
            setIsNewUserOnboarding(!existingUser);
            setOnboardingPhase(existingUser ? 'APP' : 'AVATAR');
          }}
          onNavigate={(dest) => setOnboardingPhase(dest)}
        />
      );
    }
    if (onboardingPhase === 'AVATAR') {
      return (
        <Suspense fallback={<SkeletonOnboardingPage />}>
          <ErrorBoundary fallbackLabel="Avatar generator failed">
            <AvatarGenerator
              playerId={player.userId ?? ''}
              gender={tempHealthProfile?.gender}
              onComplete={(avatarUrl: string, originalUrl: string) => {
                setPlayer(prev => ({ ...prev, avatarUrl, originalSelfieUrl: originalUrl, isConfigured: true }));
                ssClear();
                setOnboardingPhase('APP');
              }}
            />
          </ErrorBoundary>
        </Suspense>
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
          {showDailyLogin && (
            <ErrorBoundary>
              <DailyLoginModal 
                reward={dailyReward} 
                onClose={() => {
                  setShowDailyLogin(false);
                  setDailyReward(null);
                }} 
              />
            </ErrorBoundary>
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
                      await fetch(`/api/player/${player.userId}/notification/${strikeLiftedNotifId}`, {
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

      {!player.tutorialComplete && isNewUserOnboarding && (
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
      )}

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
            onTabChange={setActiveTab}
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
        onGoldClick={!isDungeonMode ? () => setActiveTab('STORE') : undefined}
        onLogout={() => setShowLogoutChoice(true)}
        onEditProfile={() => setActiveTab('PROFILE')}
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
              {/* Hunter Growth Terminal — hero element */}
              <Suspense fallback={<SkeletonStatsChart />}>
                <ErrorBoundary fallbackLabel="Growth terminal failed">
                  <HunterGrowthTerminal
                    dailyXp={player.dailyXp}
                    dailyStats={player.dailyStats}
                    weeklyStats={player.weeklyStats}
                    history={player.history || []}
                    streak={player.streak}
                    playerLevel={player.level}
                    quests={player.quests}
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

              {/* Monarch's Wardrobe Preview */}
              <Suspense fallback={<SkeletonWardrobePreview />}>
                <ErrorBoundary fallbackLabel="Wardrobe preview failed">
                  <WardrobePreviewCard
                    gold={player.gold}
                    unlockedOutfits={player.unlockedOutfits || ['outfit_starter']}
                    equippedOutfitId={player.equippedOutfitId || 'outfit_starter'}
                    outfits={dbOutfits.length > 0 ? dbOutfits : OUTFITS}
                    onPurchase={purchaseOutfit}
                    onEquip={equipOutfit}
                    onOpenWardrobe={() => setActiveTab('STORE')}
                  />
                </ErrorBoundary>
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
                    onOpenDailyCalendar={() => setShowDailyLogin(true)}
                  />
                </ErrorBoundary>
              </Suspense>

              {/* DUSK WIDGET */}
              <button
                onClick={() => setShowDuskChat(true)}
                className="w-full relative rounded-2xl overflow-hidden h-[90px] flex items-center gap-4 px-5 text-left group transition-all duration-300"
                style={{
                  border: '1px solid rgba(0,210,255,0.2)',
                  background: 'rgba(0,210,255,0.04)',
                  marginBottom: '1.5rem'
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(0,210,255,0.4)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(0,210,255,0.2)')}
              >
                <video
                  autoPlay loop muted playsInline
                  className="absolute inset-0 w-full h-full object-cover opacity-25 group-hover:opacity-35 transition-opacity"
                  src="https://res.cloudinary.com/dcnqnbvp0/video/upload/f_auto,q_auto,w_600/v1770828792/Animate_the_blue_202602112220_fete1_dsjvdd.mp4"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-transparent" />
                <div className="relative z-10 flex items-center gap-4 w-full">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(0,210,255,0.1)', border: '1px solid rgba(0,210,255,0.4)' }}
                  >
                    <Terminal size={18} className="text-system-neon" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-black text-white uppercase tracking-wider">DUSK</div>
                    <div className="text-[9px] text-system-neon font-mono tracking-widest">// ACCOUNTABILITY PARTNER</div>
                  </div>
                  {(player.duskUnreadCount ?? 0) > 0 && (
                    <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-[10px] font-black text-white shadow-[0_0_10px_rgba(239,68,68,0.6)] animate-pulse">
                      {player.duskUnreadCount}
                    </div>
                  )}
                </div>
              </button>

            </motion.div>
          )}

          {/* ── CASTLE ── */}
          {activeTab === 'CASTLE' && (
            <motion.div key="castle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Suspense fallback={<SkeletonCastlePage />}>
                <ErrorBoundary fallbackLabel="Demon Castle failed to load">
                  <DemonCastle
                    gold={player.gold}
                    keys={player.keys}
                    lastDungeonEntry={player.lastDungeonEntry ?? 0}
                    onDeductGold={deductGold}
                    onConsumeKey={consumeKey}
                    onEnterDungeon={enterDungeon}
                    onAddRewards={addRewards}
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
                    onOpenDailyCalendar={() => setShowDailyLogin(true)}
                    highlightDungeon={highlightDungeon}
                    onHighlightConsumed={() => setHighlightDungeon(false)}
                  />
                </ErrorBoundary>
              </Suspense>
            </motion.div>
          )}

          {/* ── ALLIANCE ── */}
          {activeTab === 'ALLIANCE' && (
            <motion.div key="alliance" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Suspense fallback={<SkeletonAlliancePage />}>
                <ErrorBoundary fallbackLabel="Alliance failed to load">
                  <GuildsView
                    player={player}
                    onJoin={(id: string) => setPlayer(p => ({ ...p, allianceId: id }))}
                    onLeave={() => setPlayer(p => ({ ...p, allianceId: undefined }))}
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
            <motion.div key="health" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
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
                  />
                </ErrorBoundary>
              </Suspense>
            </motion.div>
          )}

          {/* ── RANKING ── */}
          {activeTab === 'RANKING' && (
            <motion.div key="ranking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Suspense fallback={<SkeletonRankingPage />}>
                <ErrorBoundary fallbackLabel="Ranking failed to load">
                  <RankingView currentPlayer={player} />
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
                    onLogout={() => setShowLogoutChoice(true)}
                    onBack={() => setActiveTab('DASHBOARD')}
                    onNavigate={(tab) => {
                      if (tab === 'STORE') {
                        setHighlightDungeon(true);
                      }
                      setActiveTab(tab);
                    }}
                    onRetakeTutorial={() => { resetTutorial(); setIsNewUserOnboarding(true); setActiveTab('DASHBOARD'); }}
                  />
                </ErrorBoundary>
              </Suspense>
            </motion.div>
          )}

        </AnimatePresence>

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
            onSelect={async (dest) => {
              logoutFlowRef.current = true;
              setShowLogoutChoice(false);
              // 1. Sync data to cloud before logout
              try {
                if (player.userId && !player.userId.startsWith('local-') && !player.userId.startsWith('local_')) {
                  await fetch(`/api/player/${player.userId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', ...getPlayerAuthHeaders() },
                    credentials: 'include',
                    body: JSON.stringify(player),
                  });
                }
              } catch { /* ignore sync errors */ }
              // 2. Destroy server session
              try {
                await fetch('/api/auth/local/logout', { method: 'POST', credentials: 'include' });
              } catch { /* ignore */ }
              // 3. Clear local storage and reset player state
              localStorage.removeItem('reforge_player_v2');
              localStorage.removeItem('reforge_player_token');
              resetPlayer();
              // 4. Navigate directly to the chosen destination
              setOnboardingPhase(dest);
              setLoading(false);
            }}
            onCancel={() => setShowLogoutChoice(false)}
          />
        )}

      </Layout>
    </>
  );
};

export default App;
