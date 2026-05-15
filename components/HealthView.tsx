
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Ruler, Fingerprint, Flame, Target, Check, Sparkles, User, Weight, ChevronRight, ChevronLeft, ShieldCheck, ArrowRight, Clock, TrendingUp, Trash2, Utensils, Camera, Loader2, Save, Droplets, Wheat, Beef, SkipForward, Lock, Key, Cpu, Plus, X, Settings, Zap } from 'lucide-react';
import { HealthProfile, WorkoutDay, WorkoutPlan, PlayerData, ProgressPhoto, MealLog, FoodItem, MealType, FormCoachSession } from '../types';
import ActiveWorkoutPlayer, { SavedWorkoutSession, loadWorkoutSession, clearWorkoutSession } from './ActiveWorkoutPlayer';
import WorkoutRewardModal, { WorkoutReward } from './WorkoutRewardModal';
import WorkoutMap from './WorkoutMap';
import WorkoutOverview from './WorkoutOverview';
import ProtocolMonthView from './ProtocolMonthView';
import PlanSelector from './PlanSelector';
import CustomPlanBuilder from './CustomPlanBuilder';
import PlanCustomizer from './PlanCustomizer';
import { generateSystemProtocol, calculateTimeEstimate } from '../utils/workoutGenerator';
import { playSystemSoundEffect } from '../utils/soundEngine';
import { API_BASE } from '../lib/apiConfig';
import { getPlayerAuthHeaders } from '../lib/playerApi';
import { DEFAULT_PLANS, getRecommendedPlan } from '../lib/defaultPlans';
import OnboardingNotice from './OnboardingNotice';
import FoodLibrary from './FoodLibrary';
import SkillsView from './SkillsView';
import { SKILLS_ENABLED } from '../lib/rewards';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';

// Extracted helper components & functions — zero visual change
import {
  FlameLottie,
  OptimizationSequence,
  BMIGauge, BMRWave, DurationGraph, CircularCalibration,
  TechRadar, GeneratingMessage, AIGeneratingLoader,
  StreakRewardsTimelineWrapper,
  calculateNutritionPlan, getBMICategory,
  lerp, lerpColor,
  setupContainerVariants, setupItemVariants,
} from './health/HealthHelpers';
import SetupWizard from './health/SetupWizard';
import { ProcessingView, DiagnosisView, ProjectionView, FinalizingView, GeneratingPlanOverlay, PlanCompleteView } from './health/OverlayViews';
import { useSystem } from '../hooks/useSystem';

// ── Module-level scan session (survives tab switches / component remounts) ──
type ScanStateType = 'IDLE' | 'SCANNING' | 'RESULT' | 'ERROR';
interface ScanSessionStore {
  state: ScanStateType;
  image: string | null;
  result: FoodItem | null;
  error: string | null;
  mealType: MealType;
}
const _scanSession: ScanSessionStore = {
  state: 'IDLE', image: null, result: null, error: null, mealType: 'LUNCH'
};
// Callback the currently-mounted HealthView registers to receive live updates
let _onScanUpdate: ((s: ScanSessionStore) => void) | null = null;

function updateScan(patch: Partial<ScanSessionStore>) {
  Object.assign(_scanSession, patch);
  _onScanUpdate?.({ ..._scanSession });
  if (patch.state === 'SCANNING') {
    window.dispatchEvent(new CustomEvent('foodscan:start'));
  } else if (patch.state === 'RESULT' || patch.state === 'ERROR' || patch.state === 'IDLE') {
    window.dispatchEvent(new CustomEvent('foodscan:end'));
  }
}

interface HealthViewProps {
  healthProfile?: HealthProfile;
  onSaveProfile: (profile: HealthProfile, identity: string) => void;
  onCompleteWorkout: (exercisesCompleted: number, totalExercises: number, results: Record<string, number>, intensityModifier: boolean, anomalyPoints?: number, isCustomWorkout?: boolean, formCoachBonusXp?: number, formCoachSession?: FormCoachSession) => WorkoutReward[] | void;
  onFailWorkout: () => void;
  onAddPhoto?: (photo: ProgressPhoto) => void;
  onDeletePhoto?: (id: string) => void;
  onLogMeal?: (meal: MealLog) => void;
  onDeleteMeal?: (id: string) => void;
  playerData: PlayerData;
  onTutorialAction?: (step: number) => void;
  tutorialStep?: number;
  onToggleNav?: (visible: boolean) => void;

  onConsumeMana: (amount: number) => boolean;
  onRefundMana: (amount: number) => void;
  onAddRewards?: (gold: number, xp: number) => void;
  onUpdateSkillProgress?: (progress: import('../types').SkillProgress[]) => void;
  playerLevel?: number;
  initialSubTab?: 'WORKOUT' | 'NUTRITION' | 'SKILLS';
  onShowDungeonAd?: () => Promise<boolean>;
  onWatchAdToDouble?: () => Promise<boolean>;
}


// ── Plan Card Image with Skeleton Loading ──────────────────────────────────────
const PlanCardImage: React.FC<{ src: string; alt: string }> = ({ src, alt }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (error) {
    return <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 100%)' }} />;
  }

  return (
    <>
      {/* Skeleton shimmer — visible until image loads */}
      {!loaded && (
        <div className="absolute inset-0 z-0 flex flex-col items-center justify-center" style={{ background: 'linear-gradient(135deg, #0a0a0f 0%, #141420 40%, #0a0a0f 100%)' }}>
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent animate-shimmer" />
          </div>
          <div className="w-10 h-10 rounded-full bg-gray-800/60 border border-gray-700/30 flex items-center justify-center animate-pulse">
            <Activity size={18} className="text-gray-600" />
          </div>
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
        style={{ opacity: loaded ? 1 : 0 }}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
    </>
  );
};

export const HealthView: React.FC<HealthViewProps> = ({ 
  healthProfile, onSaveProfile, onCompleteWorkout, onFailWorkout, onLogMeal, onDeleteMeal: _onDeleteMeal, playerData, onToggleNav, onConsumeMana, onRefundMana, onAddRewards, onUpdateSkillProgress, playerLevel = 99, initialSubTab, onShowDungeonAd, onWatchAdToDouble
}) => {
  const [viewMode, setViewMode] = useState<'MAP' | 'OVERVIEW' | 'ACTIVE' | 'SETUP' | 'PROCESSING' | 'DIAGNOSIS' | 'PROJECTION' | 'FINALIZING' | 'PLAN_SELECT'>('MAP');
  const { isPremium } = useSystem();
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [showAIConfirm, setShowAIConfirm] = useState(false);
  const [aiPlanError, setAiPlanError] = useState<string | null>(null);
  const [planCompleteData, setPlanCompleteData] = useState<{ name: string; dayCount: number } | null>(null);
  const [showCustomPlanBuilder, setShowCustomPlanBuilder] = useState(false);
  const [showPlanCustomizer, setShowPlanCustomizer] = useState(false);
  const [customizerPlanData, setCustomizerPlanData] = useState<{ name: string; days: WorkoutDay[] } | null>(null);
  const [planSwitchLoading, setPlanSwitchLoading] = useState(false);
  const [premadePlans, setPremadePlans] = useState<WorkoutPlan[]>([]);
  const [customPlans, setCustomPlans] = useState<any[]>([]);
  const [aiConfirmStep, setAiConfirmStep] = useState<0 | 1 | 2>(0);
  const [aiDaysPerWeek, setAiDaysPerWeek] = useState(4);
  const [aiSessionDuration, setAiSessionDuration] = useState(45);
  const [streakAnimKey, setStreakAnimKey] = useState(0);
  const prevStreakRef = useRef(playerData.streak);
  const [activeTab, setActiveTab] = useState<'WORKOUT' | 'NUTRITION' | 'SKILLS'>(initialSubTab || 'WORKOUT');
  const nutritionLocked = false;
  const visibleTabs = SKILLS_ENABLED ? ['WORKOUT', 'NUTRITION', 'SKILLS'] : ['WORKOUT', 'NUTRITION'];
  
  // Track if user skipped setup
  const [skippedSetup, setSkippedSetup] = useState(false);

  // Projection Animation States
  const [transformProgress, setTransformProgress] = useState(0);
  const [processingPercent, setProcessingPercent] = useState(0);
  const [isTransformed, setIsTransformed] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<number | null>(null);
  const processingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finalizingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [activePlan, setActivePlan] = useState<WorkoutDay | null>(null);
  const [step, setStep] = useState(1);
  const TOTAL_STEPS = 9;
  const [formData, setFormData] = useState<Partial<HealthProfile>>({
      gender: 'MALE', activityLevel: 'MODERATE', goal: 'RECOMP', equipment: 'GYM', workoutSplit: 'CLASSIC', age: 25, height: 175, weight: 70, targetWeight: 70
  });
  const [finalizingLog, setFinalizingLog] = useState("Initializing...");

  // --- NUTRITION SCANNER STATE (backed by module-level store for persistence) ---
  const [scanSession, setScanSession] = useState<ScanSessionStore>(() => ({ ..._scanSession }));
  const scanState = scanSession.state;
  const scannedImage = scanSession.image;
  const scanResult = scanSession.result;
  const scanError = scanSession.error;
  const selectedMealType = scanSession.mealType;
  const [scanItems, setScanItems] = useState<any[]>([]);

  // Register live-update callback so in-flight fetches update this mounted component
  useEffect(() => {
    _onScanUpdate = (s) => setScanSession(s);
    // Sync on mount in case scan completed while this component was unmounted
    setScanSession({ ..._scanSession });
    return () => { _onScanUpdate = null; };
  }, []);

  const setSelectedMealType = useCallback((t: MealType) => updateScan({ mealType: t }), []);
  const [selectedMealLog, setSelectedMealLog] = useState<MealLog | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loadingMessage, setLoadingMessage] = useState("ANALYSING IMAGE...");
  const [showMicros, setShowMicros] = useState(false);
  const [showFoodLibrary, setShowFoodLibrary] = useState(false);
  
  // Keys Alert State (replaces old Mana alert)
  const [showKeysAlert, setShowKeysAlert] = useState(false);

  // Custom Calorie Limit State
  const [showCalorieEditor, setShowCalorieEditor] = useState(false);
  const [calorieLimitInput, setCalorieLimitInput] = useState('');

  // Workout Reward Modal State
  const [workoutRewards, setWorkoutRewards] = useState<WorkoutReward[] | null>(null);
  const [workoutAnomalyPoints, setWorkoutAnomalyPoints] = useState(0);

  // Session Resume State
  const [savedSession, setSavedSession] = useState<SavedWorkoutSession | null>(null);
  const [showResumePrompt, setShowResumePrompt] = useState(false);

  // ── Workout Day Map (date-keyed outcome tracking) ──
  // Keys are scoped per-user so each account has its own workout history
  const _getLocalDateStr = (d: Date = new Date()): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  };
  const todayStr = _getLocalDateStr();

  // User-scoped localStorage keys
  const _dayMapKey = `reforge_workout_day_map_${playerData.userId || 'local'}`;
  const _journeyKey = `reforge_journey_start_${playerData.userId || 'local'}`;

  const _readDayMap = (key: string): Record<string, 'completed' | 'cheated' | 'missed'> => {
    try { return JSON.parse(localStorage.getItem(key) || '{}'); }
    catch { return {}; }
  };

  const _readJourneyStart = (key: string): string => {
    const stored = localStorage.getItem(key);
    if (stored) return stored;
    const today = _getLocalDateStr();
    try { localStorage.setItem(key, today); } catch {}
    return today;
  };

  const [dayMap, setDayMap] = useState<Record<string, 'completed' | 'cheated' | 'missed'>>(() => _readDayMap(_dayMapKey));
  const [journeyStartDate, setJourneyStartDate] = useState<string>(() => _readJourneyStart(_journeyKey));

  // ── Session Logs: per-day array of workout sessions ──
  type SessionLog = { name: string; source: 'DEFAULT' | 'CUSTOM'; status: 'completed' | 'cheated' | 'incomplete'; timestamp: number };
  const _sessionLogKey = `reforge_session_logs_${playerData.userId || 'local'}`;
  const _readSessionLogs = (key: string): Record<string, SessionLog[]> => {
    try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch { return {}; }
  };
  const [sessionLogs, setSessionLogs] = useState<Record<string, SessionLog[]>>(() => _readSessionLogs(_sessionLogKey));
  const _writeSessionLogs = (next: Record<string, SessionLog[]>) => {
    setSessionLogs(next);
    try { localStorage.setItem(_sessionLogKey, JSON.stringify(next)); } catch {}
  };
  const _addSessionLog = (dateStr: string, log: SessionLog) => {
    const next = { ...sessionLogs, [dateStr]: [...(sessionLogs[dateStr] || []), log] };
    _writeSessionLogs(next);
    // Update dayMap outcome from sessions: completed > cheated > missed
    const sessions = next[dateStr] || [];
    const bestOutcome: 'completed' | 'cheated' = sessions.some(s => s.status === 'completed') ? 'completed' : 'cheated';
    _writeDayMap({ ...dayMap, [dateStr]: bestOutcome });
  };

  // todayDefaultDone = at least one DEFAULT session completed/cheated today
  const todayDefaultDone = (sessionLogs[todayStr] || []).some(s => s.source === 'DEFAULT' && (s.status === 'completed' || s.status === 'cheated'));

  // Reload dayMap + journeyStartDate + sessionLogs when userId changes (account switch)
  useEffect(() => {
    setDayMap(_readDayMap(_dayMapKey));
    setJourneyStartDate(_readJourneyStart(_journeyKey));
    setSessionLogs(_readSessionLogs(_sessionLogKey));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerData.userId]);

  const todayDone = !!dayMap[todayStr];
  const [showTodayDoneNotice, setShowTodayDoneNotice] = useState(false);

  const _writeDayMap = (next: Record<string, 'completed' | 'cheated' | 'missed'>) => {
    setDayMap(next);
    try { localStorage.setItem(_dayMapKey, JSON.stringify(next)); } catch {}
  };

  // Scan for missed days on mount / user change
  useEffect(() => {
    const today = _getLocalDateStr();
    const startD = new Date(journeyStartDate + 'T12:00:00');
    const todayD = new Date(today + 'T12:00:00');
    const daysElapsed = Math.round((todayD.getTime() - startD.getTime()) / 86400000);
    if (daysElapsed <= 0) return;
    const map = _readDayMap(_dayMapKey);
    let changed = false;
    for (let i = 0; i < daysElapsed; i++) {
      const d = new Date(journeyStartDate + 'T12:00:00');
      d.setDate(d.getDate() + i);
      const ds = _getLocalDateStr(d);
      if (!map[ds]) { map[ds] = 'missed'; changed = true; }
    }
    if (changed) _writeDayMap(map);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journeyStartDate, playerData.userId]);

  // Auto-clear any saved workout session on mount — no resume prompts
  useEffect(() => {
    clearWorkoutSession(playerData.userId || 'local');
  }, [playerData.userId]);

  const projectedIncrease = useMemo(() => {
      if (playerData.username) {
          let hash = 0;
          for (let i = 0; i < playerData.username.length; i++) { hash = playerData.username.charCodeAt(i) + ((hash << 5) - hash); }
          const normalized = Math.abs(hash) % 11; 
          return 60 + normalized;
      }
      return Math.floor(Math.random() * 11) + 60;
  }, [playerData.username]);

  const dailyIntake = useMemo(() => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      return (playerData.nutritionLogs || [])
        .filter(log => log.timestamp >= todayStart.getTime())
        .reduce((acc, log) => ({ calories: acc.calories + (log.totalCalories || 0), protein: acc.protein + (log.totalProtein || 0), carbs: acc.carbs + (log.totalCarbs || 0), fats: acc.fats + (log.totalFats || 0) }), { calories: 0, protein: 0, carbs: 0, fats: 0 });
  }, [playerData.nutritionLogs]);

  // Calculate personalized daily targets based on health profile
  const dailyTargets = useMemo(() => {
      if (!healthProfile) return null;
      
      // Calculate BMR using Mifflin-St Jeor Equation
      // Men: (10 × weight in kg) + (6.25 × height in cm) - (5 × age in years) + 5
      // Women: (10 × weight in kg) + (6.25 × height in cm) - (5 × age in years) - 161
      let bmr = 0;
      if (healthProfile.weight && healthProfile.height && healthProfile.age) {
          if (healthProfile.gender === 'MALE') {
              bmr = (10 * healthProfile.weight) + (6.25 * healthProfile.height) - (5 * healthProfile.age) + 5;
          } else {
              bmr = (10 * healthProfile.weight) + (6.25 * healthProfile.height) - (5 * healthProfile.age) - 161;
          }
      } else {
          bmr = healthProfile.bmr || 1800; // Fallback
      }

      // Calculate TDEE (Total Daily Energy Expenditure) based on activity level
      const activityMultipliers = { SEDENTARY: 1.2, LIGHT: 1.375, MODERATE: 1.55, VERY_ACTIVE: 1.725 };
      const tdee = Math.round(bmr * (activityMultipliers[healthProfile.activityLevel] || 1.55));
      
      // Adjust target calories based on goal
      // For weight loss: 500 calorie deficit (roughly 0.5kg/1lb per week)
      // For weight gain: 300-500 calorie surplus
      let targetCalories = tdee;
      if (healthProfile.goal === 'LOSE_WEIGHT') {
          targetCalories = Math.max(1200, tdee - 500); // Minimum 1200 for safety
      } else if (healthProfile.goal === 'BUILD_MUSCLE') {
          targetCalories = tdee + 300; // Lean bulk
      }

      // Override with custom calorie limit if user has set one
      if (healthProfile.customCalorieLimit && healthProfile.customCalorieLimit > 0) {
          targetCalories = healthProfile.customCalorieLimit;
      }
      
      // Macro split calculation based on goal and weight
      // Protein: typically 1.6-2.2g per kg of body weight for active individuals
      let proteinGrams = 0;
      let fatGrams = 0;
      let carbGrams = 0;

      if (healthProfile.goal === 'BUILD_MUSCLE') {
          proteinGrams = Math.round(healthProfile.weight * 2.2); // High protein for muscle
          fatGrams = Math.round((targetCalories * 0.25) / 9); // 25% fats
          carbGrams = Math.round((targetCalories - (proteinGrams * 4) - (fatGrams * 9)) / 4); // Rest is carbs
      } else if (healthProfile.goal === 'LOSE_WEIGHT') {
          proteinGrams = Math.round(healthProfile.weight * 2.0); // Preserve muscle during deficit
          fatGrams = Math.round((targetCalories * 0.30) / 9); // 30% fats for hormones
          carbGrams = Math.round((targetCalories - (proteinGrams * 4) - (fatGrams * 9)) / 4); // Rest is carbs
      } else {
          // Maintenance / Recomp
          proteinGrams = Math.round(healthProfile.weight * 1.8);
          fatGrams = Math.round((targetCalories * 0.25) / 9);
          carbGrams = Math.round((targetCalories - (proteinGrams * 4) - (fatGrams * 9)) / 4);
      }
      
      return {
          calories: targetCalories,
          protein: Math.max(0, proteinGrams),
          carbs: Math.max(0, carbGrams),
          fats: Math.max(0, fatGrams),
      };
  }, [healthProfile]);

  useEffect(() => {
      if (onToggleNav) {
          const hideNavModes = ['SETUP', 'PROCESSING', 'DIAGNOSIS', 'PROJECTION', 'FINALIZING'];
          const forceHide = showAIConfirm || isGeneratingPlan || !!planCompleteData || showCustomPlanBuilder;
          onToggleNav(!hideNavModes.includes(viewMode) && !forceHide);
      }
  }, [viewMode, onToggleNav, showAIConfirm, isGeneratingPlan, planCompleteData, showCustomPlanBuilder]);

  useEffect(() => { 
      // Only force setup if profile missing AND not skipped
      if (!healthProfile && !skippedSetup) setViewMode('SETUP'); 
  }, [healthProfile, skippedSetup]);

  // Scanner loading message rotation (no "DON'T CHANGE THE TAB" — scan persists now)
  useEffect(() => {
      let interval: ReturnType<typeof setInterval>;
      if (scanState === 'SCANNING') {
          const messages = [ "ANALYSING IMAGE...", "GETTING MACROS...", "DOING MAGIC...", "ALMOST THERE...", "FINALIZING..." ];
          let i = 0;
          setLoadingMessage(messages[0]);
          interval = setInterval(() => { i++; if (i < messages.length) { setLoadingMessage(messages[i]); } }, 4500);
      }
      return () => { if (interval) clearInterval(interval); };
  }, [scanState]);

  // Fetch premade plans (API merged with default)
  useEffect(() => {
    fetch(`${API_BASE}/api/workout/plans`)
      .then(r => r.json())
      .then(data => {
        const apiPlans = Array.isArray(data) ? data : [];
        // Merge API plans with DEFAULT_PLANS (excluding defaults that were customized and saved to DB with negative IDs)
        const apiIds = new Set(apiPlans.map((p: WorkoutPlan) => p.id));
        const deletedIds = new Set(apiPlans.filter((p: any) => p.name === 'DELETED_DEFAULT').map((p: any) => p.id));
        const merged = [
          ...apiPlans.filter((p: any) => p.name !== 'DELETED_DEFAULT'), 
          ...DEFAULT_PLANS.filter(dp => !apiIds.has(dp.id) && !deletedIds.has(dp.id))
        ];
        setPremadePlans(merged);
      })
      .catch(() => setPremadePlans([...DEFAULT_PLANS]));
  }, []);

  // Fetch user custom plans (manual + AI saved)
  useEffect(() => {
      if (!playerData.userId || playerData.userId.startsWith('local-') || playerData.userId.startsWith('local_')) return;
      fetch(`${API_BASE}/api/workout/custom-plans`, { credentials: 'include' })
          .then(r => r.ok ? r.json() : [])
          .then(data => setCustomPlans(Array.isArray(data) ? data : []))
          .catch(() => {});
  }, [playerData.userId]);

  // Trigger streak pop animation when streak increases
  useEffect(() => {
      if (playerData.streak > prevStreakRef.current) {
          setStreakAnimKey(k => k + 1);
      }
      prevStreakRef.current = playerData.streak;
  }, [playerData.streak]);

  // --- WORKOUT PLAN CALCULATION ---
  const calculatedPlan = useMemo(() => {
      const profileToUse = healthProfile || formData;
      if (profileToUse.workoutPlan && Array.isArray(profileToUse.workoutPlan) && profileToUse.workoutPlan.length > 0) {
          return profileToUse.workoutPlan;
      }
      return generateSystemProtocol(profileToUse as HealthProfile, playerData.customProtocols);
  }, [healthProfile, formData, playerData.customProtocols]);

  const nutritionInfo = useMemo(() => calculateNutritionPlan(healthProfile || formData), [healthProfile, formData]);
  
  const rawBMI = useMemo(() => (formData.weight && formData.height) ? (formData.weight / ((formData.height/100) ** 2)) : 0, [formData.weight, formData.height]);
  const currentBMI = rawBMI.toFixed(1);
  const bmiCategory = useMemo(() => getBMICategory(rawBMI), [rawBMI]);
  const estimatedTimeStr = useMemo(() => calculateTimeEstimate(healthProfile || formData), [healthProfile, formData]);

  const startProcessing = () => {
      if (processingIntervalRef.current) clearInterval(processingIntervalRef.current);
      setViewMode('PROCESSING');
      setProcessingPercent(0);
      let p = 0;
      processingIntervalRef.current = setInterval(() => {
          p += 1;
          setProcessingPercent(p);
          if (p >= 100) { clearInterval(processingIntervalRef.current!); processingIntervalRef.current = null; setTimeout(() => setViewMode('DIAGNOSIS'), 500); }
      }, 40);
  };

  const startJourneySequence = () => {
      if (finalizingIntervalRef.current) clearInterval(finalizingIntervalRef.current);
      setViewMode('FINALIZING');
      const sequence = ["BIOLOGICAL RESTRUCTURING...", "NEURAL SYNCING...", "CONSTRUCTING PROTOCOLS...", "SELECT YOUR PROGRAM."];
      let i = 0;
      finalizingIntervalRef.current = setInterval(() => {
          if (i < sequence.length) { setFinalizingLog(sequence[i]); i++; } 
          else {
              clearInterval(finalizingIntervalRef.current!); finalizingIntervalRef.current = null;
              setTimeout(() => {
                const fullProfile = { ...formData, bmi: parseFloat(currentBMI), bmr: nutritionInfo.bmr, macros: nutritionInfo.macros, injuries: formData.injuries || [], category: 'Hunter', startingWeight: formData.weight } as HealthProfile;
                onSaveProfile(fullProfile, "Shadow Vessel");
                setViewMode('PLAN_SELECT');
              }, 2000);
          }
      }, 1500); 
  };

  // Cleanup leak-prone intervals on unmount
  useEffect(() => {
      return () => {
          if (processingIntervalRef.current) clearInterval(processingIntervalRef.current);
          if (finalizingIntervalRef.current) clearInterval(finalizingIntervalRef.current);
      };
  }, []);

  const handleSelectPlan = (plan: WorkoutPlan) => {
      const days = Array.isArray(plan.days) ? plan.days : [];
      const updated = { ...(healthProfile || formData as HealthProfile), workoutPlan: days, selectedPlanId: plan.id, selectedPlanName: plan.name } as HealthProfile;
      onSaveProfile(updated, updated.category || 'Hunter');
      setViewMode('MAP');
  };

  const handleGenerateAIPlan = async () => {
      const isFirstTime = !(healthProfile as any)?.aiPlanUsed;
      if (!isFirstTime) {
          setAiPlanError('AI Plan already generated. Only one AI plan per account.');
          return;
      }
      setAiPlanError(null);
      setIsGeneratingPlan(true);
      setGenProgress(0);
      setShowAIConfirm(false);
      try {
          const profile = healthProfile || formData;
          const res = await fetch(`${API_BASE}/api/workout/generate-ai`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                  goal: profile.goal,
                  equipment: profile.equipment || 'GYM',
                  difficulty: 'INTERMEDIATE',
                  fitnessLevel: (profile as any).activityLevel || 'INTERMEDIATE',
                  daysPerWeek: aiDaysPerWeek,
                  sessionDuration: aiSessionDuration,
                  weight: profile.weight || 70,
                  age: profile.age || 25,
                  gender: profile.gender || 'MALE',
                  injuries: profile.injuries || [],
              }),
          });
          if (!res.ok) {
              const errData = await res.json().catch(() => ({}));
              throw new Error(errData.error || 'AI generation failed');
          }
          const data = await res.json();
          const planDays: WorkoutDay[] = Array.isArray(data.days) ? data.days.map((d: any) => ({
              day: d.day || 'DAY',
              focus: d.focus || 'WORKOUT',
              exercises: Array.isArray(d.exercises) ? d.exercises.map((e: any) => ({
                  name: e.name || 'Exercise',
                  sets: e.sets || 3,
                  reps: e.reps || '10',
                  type: e.type || 'COMPOUND',
                  notes: e.notes || '',
                  videoUrl: e.videoUrl || '',
                  completed: false,
                  duration: e.duration || 0,
              })) : [],
              isRecovery: !!d.isRecovery,
              totalDuration: d.totalDuration || aiSessionDuration,
          })) : [];
          const planName = data.planName || 'AI Generated Plan';
          const updated = {
              ...(healthProfile || formData as HealthProfile),
              workoutPlan: planDays,
              selectedPlanId: undefined,
              selectedPlanName: planName,
              aiPlanUsed: true,
              aiGeneratedPlan: planDays,
              aiGeneratedPlanName: planName,
          } as HealthProfile;
          onSaveProfile(updated, updated.category || 'Hunter');
          // Persist to user_custom_plans table (max 10 plans enforced)
          if (customPlans.length >= 10) {
              console.warn('Max 10 plans reached. Oldest custom plan will not be replaced automatically.');
          }
          try {
              const saved = await fetch(`${API_BASE}/api/workout/custom-plans`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  credentials: 'include',
                  body: JSON.stringify({ name: planName, days: planDays, plan_type: 'AI' }),
              });
              if (saved.ok) {
                  const savedData = await saved.json();
                  setCustomPlans(prev => [savedData, ...prev.filter(p => p.plan_type !== 'AI')]);
              }
          } catch (_) {}
          // Show confetti completion screen
          setGenProgress(1);
          // Brief delay so user sees 100% before transitioning
          await new Promise(r => setTimeout(r, 600));
          setPlanCompleteData({ name: planName, dayCount: planDays.length });
      } catch (err: any) {
          console.error('AI plan generation error:', err);
          setAiPlanError(err.message || 'AI generation failed. Please try again.');
          setAiConfirmStep(2);
          setShowAIConfirm(true);
      } finally {
          setIsGeneratingPlan(false);
      }
  };

  // ── Shared image compression helper ──
  const compressImage = useCallback(async (dataUrl: string, maxWidth = 640): Promise<string> => {
      return new Promise((resolve, reject) => {
          const img = new Image();
          img.src = dataUrl;
          img.onload = () => {
              const canvas = document.createElement('canvas');
              let w = img.width, h = img.height;
              if (w > maxWidth) { h = Math.round((h * maxWidth) / w); w = maxWidth; }
              canvas.width = w; canvas.height = h;
              canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
              resolve(canvas.toDataURL('image/jpeg', 0.55));
          };
          img.onerror = reject;
      });
  }, []);

  // ── Native Camera/Gallery picker (Capacitor) ──
  const handleNativePick = async () => {
      if ((playerData.keys ?? 0) < 1) {
          setShowKeysAlert(true);
          return;
      }

      try {
          const photo = await CapCamera.getPhoto({
              quality: 80,
              allowEditing: false,
              resultType: CameraResultType.DataUrl,
              source: CameraSource.Prompt,
              width: 800,
              promptLabelHeader: 'Log Meal',
              promptLabelPhoto: 'Choose from Gallery',
              promptLabelPicture: 'Take Photo',
              promptLabelCancel: 'Cancel',
          });

          if (!photo.dataUrl) return;

          if ((playerData.keys ?? 0) < 1) {
              setShowKeysAlert(true);
              return;
          }

          // Compress native photo before sending (reduces payload 60-80%)
          const compressedDataUrl = await compressImage(photo.dataUrl);

          updateScan({ state: 'SCANNING', image: compressedDataUrl, error: null });
          setShowMicros(false);

          const imageBase64 = compressedDataUrl.split(',')[1];
          const response = await fetch(`${API_BASE}/api/nutrition/analyze`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...getPlayerAuthHeaders() },
              credentials: 'include',
              body: JSON.stringify({ imageBase64, mimeType: 'image/jpeg' }),
          });

          if (!response.ok) {
              const errData = await response.json().catch(() => ({ error: 'Analysis failed' }));
              throw new Error(errData.error || `Server error ${response.status}`);
          }

          const { data } = await response.json();
          const mappedResult: FoodItem = {
              id: 'scan_' + Date.now(),
              name: data.name || 'Analyzed Meal',
              calories: Math.round(data.calories || 0),
              protein: Math.round(data.protein_g || 0),
              carbs: Math.round(data.carbs_g || 0),
              fats: Math.round(data.fats_g || 0),
              servingSize: data.serving_size || '1 meal',
              fiber: data.fiber_g != null ? Math.round(data.fiber_g * 10) / 10 : undefined,
              sugar: data.sugar_g != null ? Math.round(data.sugar_g * 10) / 10 : undefined,
              sodium: data.sodium_mg != null ? Math.round(data.sodium_mg) : undefined,
              vitaminA: data.vitamin_a_dv != null ? Math.round(data.vitamin_a_dv) : undefined,
              vitaminC: data.vitamin_c_dv != null ? Math.round(data.vitamin_c_dv) : undefined,
              vitaminD: data.vitamin_d_dv != null ? Math.round(data.vitamin_d_dv) : undefined,
              vitaminB12: data.vitamin_b12_dv != null ? Math.round(data.vitamin_b12_dv) : undefined,
              calcium: data.calcium_dv != null ? Math.round(data.calcium_dv) : undefined,
              iron: data.iron_dv != null ? Math.round(data.iron_dv) : undefined,
              potassium: data.potassium_mg != null ? Math.round(data.potassium_mg) : undefined,
              ingredients: Array.isArray(data.ingredients) ? data.ingredients : [],
              aiConfidence: data.confidence || 'Medium',
          };
          updateScan({ state: 'RESULT', result: mappedResult });
          setScanItems([]);
      } catch (error: any) {
          // If Camera plugin isn't available (web), fall back to file input
          if (error?.message?.includes('not implemented') || error?.message?.includes('not available') || error?.code === 'UNIMPLEMENTED') {
              fileInputRef.current?.click();
              return;
          }
          // User cancelled — not an error
          if (error?.message?.includes('cancelled') || error?.message?.includes('canceled') || error?.message === 'User cancelled photos app') {
              return;
          }
          const msg = error instanceof Error ? error.message : 'Analysis failed';
          console.error('[Nutrition Scanner]', msg);
          updateScan({ state: 'ERROR', error: msg });
          // Server already deducted keys — no client refund needed
      }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if ((playerData.keys ?? 0) < 1) {
          setShowKeysAlert(true);
          e.target.value = '';
          return;
      }

      const file = e.target.files?.[0];
      if (!file) return;

      // Server deducts keys atomically during nutrition/analyze call
      // Client pre-check is UX only

      updateScan({ state: 'SCANNING', error: null });
      setShowMicros(false);

      try {
          // Compress from File object
          const dataUrl: string = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.readAsDataURL(file);
              reader.onload = (ev) => resolve(ev.target?.result as string);
              reader.onerror = reject;
          });
          const compressedDataUrl = await compressImage(dataUrl);
          updateScan({ image: compressedDataUrl });

          const imageBase64 = compressedDataUrl.split(',')[1];

          const response = await fetch(`${API_BASE}/api/nutrition/analyze`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...getPlayerAuthHeaders() },
              credentials: 'include',
              body: JSON.stringify({ imageBase64, mimeType: 'image/jpeg' }),
          });

          if (!response.ok) {
              const errData = await response.json().catch(() => ({ error: 'Analysis failed' }));
              throw new Error(errData.error || `Server error ${response.status}`);
          }

          const { data } = await response.json();

          const mappedResult: FoodItem = {
              id: 'scan_' + Date.now(),
              name: data.name || 'Analyzed Meal',
              calories: Math.round(data.calories || 0),
              protein: Math.round(data.protein_g || 0),
              carbs: Math.round(data.carbs_g || 0),
              fats: Math.round(data.fats_g || 0),
              servingSize: data.serving_size || '1 meal',
              fiber: data.fiber_g != null ? Math.round(data.fiber_g * 10) / 10 : undefined,
              sugar: data.sugar_g != null ? Math.round(data.sugar_g * 10) / 10 : undefined,
              sodium: data.sodium_mg != null ? Math.round(data.sodium_mg) : undefined,
              vitaminA: data.vitamin_a_dv != null ? Math.round(data.vitamin_a_dv) : undefined,
              vitaminC: data.vitamin_c_dv != null ? Math.round(data.vitamin_c_dv) : undefined,
              vitaminD: data.vitamin_d_dv != null ? Math.round(data.vitamin_d_dv) : undefined,
              vitaminB12: data.vitamin_b12_dv != null ? Math.round(data.vitamin_b12_dv) : undefined,
              calcium: data.calcium_dv != null ? Math.round(data.calcium_dv) : undefined,
              iron: data.iron_dv != null ? Math.round(data.iron_dv) : undefined,
              potassium: data.potassium_mg != null ? Math.round(data.potassium_mg) : undefined,
              ingredients: Array.isArray(data.ingredients) ? data.ingredients : [],
              aiConfidence: data.confidence || 'Medium',
          };

          updateScan({ state: 'RESULT', result: mappedResult });
          setScanItems([]);
      } catch (error) {
          const msg = error instanceof Error ? error.message : 'Analysis failed';
          console.error('[Nutrition Scanner]', msg);
          updateScan({ state: 'ERROR', error: msg });
          // Server already deducted keys — no client refund needed
      }
  };

  const confirmLog = () => {
      if (onLogMeal && scanResult) {
          const detailedItems = scanItems.map((item, idx) => ({ id: `scan_item_${idx}_${Date.now()}`, name: item.name, calories: item.calories, protein: item.protein, carbs: item.carbs, fats: item.fat, servingSize: item.quantity, quantity: 1 }));
          onLogMeal({ id: Math.random().toString(36).substr(2, 9), label: scanResult.name, items: detailedItems.length > 0 ? detailedItems : [{ ...scanResult, quantity: 1 }], totalCalories: scanResult.calories, totalProtein: scanResult.protein, totalCarbs: scanResult.carbs, totalFats: scanResult.fats, timestamp: Date.now(), imageUrl: scannedImage || undefined, mealType: selectedMealType });
          resetScanner();
      }
  };

  const resetScanner = () => { updateScan({ state: 'IDLE', image: null, result: null, error: null }); setScanItems([]); setShowMicros(false); };

  const handleOptimizationComplete = () => {
      setIsTransformed(true);
      setIsAnimating(false);
  };

  const handleAscensionClick = () => {
      setIsAnimating(true);
      let startTime: number | null = null;
      const duration = 3000; 
      const animate = (timestamp: number) => {
          if (!startTime) startTime = timestamp;
          const elapsed = timestamp - startTime;
          const progress = Math.min(elapsed / duration, 1);
          setTransformProgress(progress);
          if (progress < 1) { animationRef.current = requestAnimationFrame(animate); } 
          else { handleOptimizationComplete(); }
      };
      animationRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => { return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); }; }, []);

  // --- RENDER LOGIC ---

  if (viewMode === 'PROCESSING') return <ProcessingView processingPercent={processingPercent} />;

  if (viewMode === 'DIAGNOSIS') return (
    <DiagnosisView
      currentBMI={currentBMI}
      bmiCategory={bmiCategory}
      nutritionInfo={nutritionInfo}
      estimatedTimeStr={estimatedTimeStr}
      onNext={() => setViewMode('PROJECTION')}
    />
  );

  if (viewMode === 'PROJECTION') return (
    <ProjectionView
      formData={formData}
      transformProgress={transformProgress}
      isAnimating={isAnimating}
      isTransformed={isTransformed}
      projectedIncrease={projectedIncrease}
      estimatedTimeStr={estimatedTimeStr}
      onAscensionClick={handleAscensionClick}
      onAcceptProtocols={startJourneySequence}
    />
  );

  if (viewMode === 'FINALIZING') return <FinalizingView finalizingLog={finalizingLog} />;

  if (isGeneratingPlan) return <GeneratingPlanOverlay progress={genProgress === 1 ? 1 : undefined} />;

  if (planCompleteData) return (
    <PlanCompleteView
      name={planCompleteData.name}
      dayCount={planCompleteData.dayCount}
      onDismiss={() => { setPlanCompleteData(null); setViewMode('MAP'); }}
    />
  );

  if (viewMode === 'PLAN_SELECT') {
      return (
          <div className="fixed inset-0 z-[100] bg-black">
              <PlanSelector
                  healthProfile={healthProfile || formData as HealthProfile}
                  onSelectPlan={handleSelectPlan}
                  onGenerateAI={handleGenerateAIPlan}
                  isGenerating={isGeneratingPlan}
                  onBack={() => setViewMode('MAP')}
              />
          </div>
      );
  }

  if (viewMode === 'SETUP') {
      return (
          <SetupWizard
            step={step}
            setStep={setStep}
            totalSteps={TOTAL_STEPS}
            formData={formData}
            setFormData={setFormData}
            onSkip={() => { setSkippedSetup(true); setViewMode('MAP'); }}
            onInitialize={startProcessing}
          />
      );
  }

  if (viewMode === 'OVERVIEW' && activePlan) return <WorkoutOverview plan={activePlan} focusVideos={playerData.focusVideos} onStart={(p) => { setActivePlan(p); setViewMode('ACTIVE'); }} onCancel={() => setViewMode('MAP')} userWeight={healthProfile?.weight} onShowDungeonAd={onShowDungeonAd} isPremium={isPremium} />;
  if (viewMode === 'ACTIVE' && activePlan) return (
    <>
      <ActiveWorkoutPlayer
        plan={activePlan}
        onComplete={(c, t, r, anomaly, formCoachBonusXp, formCoachSession) => {
          const isCustomWorkout = activePlan.day === 'CUSTOM' || activePlan.day.includes('Custom');
          const rewards = onCompleteWorkout(c, t, r, false, anomaly, isCustomWorkout, formCoachBonusXp, formCoachSession);
          clearWorkoutSession(playerData.userId || 'local');
          setSavedSession(null);
          // Log session and update day map
          const status: 'completed' | 'cheated' = (anomaly ?? 0) >= 5 ? 'cheated' : 'completed';
          _addSessionLog(todayStr, {
            name: activePlan.focus || activePlan.day || 'Workout',
            source: isCustomWorkout ? 'CUSTOM' : 'DEFAULT',
            status,
            timestamp: Date.now(),
          });
          if (rewards && Array.isArray(rewards) && rewards.length > 0) {
            setWorkoutRewards(rewards);
            setWorkoutAnomalyPoints(anomaly ?? 0);
          } else {
            setViewMode('MAP');
          }
        }}
        onFail={() => {
          onFailWorkout();
          setViewMode('MAP');
        }}
        streak={playerData.streak}
        savedSession={savedSession}
      />
      {workoutRewards && (
        <WorkoutRewardModal
          rewards={workoutRewards}
          anomalyPoints={workoutAnomalyPoints}
          onClose={() => {
            setWorkoutRewards(null);
            setWorkoutAnomalyPoints(0);
            setViewMode('MAP');
          }}
          onWatchAdToDouble={onWatchAdToDouble}
        />
      )}
    </>
  );

  return (
    <>
        {/* OnboardingNotice removed — not needed */}
        <AnimatePresence>
            {showKeysAlert && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
                    <motion.div 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        className="bg-[#0a0a0a] border border-[#00d4ff]/50 w-full max-w-sm rounded-2xl p-8 text-center shadow-[0_0_50px_rgba(0,212,255,0.3)] relative overflow-hidden"
                    >
                        {/* Background Effect */}
                        <div className="absolute inset-0 bg-cyan-900/10 pointer-events-none" />
                        
                        <div className="relative z-10 flex flex-col items-center">
                            <div className="w-16 h-16 rounded-full bg-black border border-[#00d4ff] flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(0,212,255,0.5)]">
                                <Lock size={32} className="text-[#00d4ff]" />
                            </div>
                            
                            <h2 className="text-xl font-black text-white font-mono uppercase tracking-tighter mb-2">KEYS DEPLETED</h2>
                            <p className="text-xs text-[#33dfff] font-mono mb-6 leading-relaxed">
                                INSUFFICIENT KEYS.<br/>Complete quests to earn more or buy keys in the store.
                            </p>
                            
                            <button 
                                onClick={() => setShowKeysAlert(false)}
                                className="w-full py-4 bg-cyan-600 text-white font-bold rounded-xl hover:bg-[#00d4ff] transition-colors uppercase tracking-widest text-xs font-mono shadow-lg"
                            >
                                ACKNOWLEDGE
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>




        <div id="tut-health" className="flex flex-col gap-6 font-mono">
            <div className="flex gap-2 sticky top-20 z-30 pt-1 pb-2 bg-transparent">
                {visibleTabs.map(t => {
                    const isTabLocked = t === 'NUTRITION' && nutritionLocked;
                    return (
                    <button
                        key={t}
                        id={t === 'NUTRITION' ? 'tut-health-nutrition-tab' : undefined}
                        onClick={() => !isTabLocked && setActiveTab(t as any)}
                        className={`flex-1 py-2.5 text-xs font-bold tracking-widest rounded-lg transition-all duration-200 border ${
                            isTabLocked
                                ? 'text-gray-700 border-gray-800/50 cursor-not-allowed opacity-50'
                                : activeTab === t
                                    ? 'text-system-neon border-system-neon shadow-[0_0_12px_rgba(0,212,255,0.25)]'
                                    : 'text-gray-600 border-gray-800 hover:text-gray-400 hover:border-gray-600'
                        }`}
                        style={{ background: 'transparent' }}
                    >
                        {isTabLocked ? <span className="flex items-center justify-center gap-1.5"><Lock size={10} />{t} <span className="text-[8px] text-gray-600">Lv.5</span></span> : t}
                    </button>
                    );
                })}
            </div>
            <div className="pb-20">
                <AnimatePresence mode="wait">
                    {activeTab === 'WORKOUT' && (() => {
                        const completedWorkouts = Object.values(dayMap).filter(o => o === 'completed' || o === 'cheated').length;
                        const activePremadePlan = premadePlans.find(p => p.id === (healthProfile as any)?.selectedPlanId);
                        const daysPerWeek = activePremadePlan?.days_per_week || (calculatedPlan.length > 0 ? Math.min(calculatedPlan.length, 5) : 3);
                        const totalWeeks = activePremadePlan
                            ? (activePremadePlan.duration_weeks || Math.ceil(calculatedPlan.length / Math.max(daysPerWeek, 1)))
                            : Math.ceil(calculatedPlan.length / Math.max(daysPerWeek, 1));
                        const weeksCompleted = Math.floor(completedWorkouts / Math.max(daysPerWeek, 1));
                        const weeksLeft = Math.max(totalWeeks - weeksCompleted, 0);
                        const streakInWeek = playerData.streak % 7 || (playerData.streak > 0 && playerData.streak % 7 === 0 ? 7 : 0);
                        const daysToMilestone = playerData.streak === 0 ? 7 : 7 - streakInWeek;
                        
                        // Calculate stroke-dasharray for circular progress (circumference is ~157)
                        const circumference = 2 * Math.PI * 25; // r=25
                        const progressOffset = circumference - (streakInWeek / 7) * circumference;

                        return (
                        <motion.div key="wo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4 relative pb-24">

                            {/* ── ACTIVE STREAK WIDGET ── */}
                            <div className="relative rounded-2xl overflow-hidden p-5"
                                style={{
                                    background: '#0B1015',
                                    border: '1px solid rgba(0,212,255, 0.15)',
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                                }}
                            >
                                {/* Top Header */}
                                <div className="text-[10px] font-black tracking-[0.2em] mb-4 text-[#00d4ff]">
                                    ACTIVE STREAK
                                </div>

                                <div className="flex items-start justify-between mb-8">
                                    {/* Left side: Days count and subtitle */}
                                    <div>
                                        <div key={streakAnimKey} className="flex items-baseline gap-2 animate-streak-pop">
                                            <span className="text-7xl font-semibold leading-none text-white tracking-tighter">
                                                {playerData.streak}
                                            </span>
                                            <span className="text-xl font-bold text-gray-400 mb-1">days</span>
                                        </div>
                                        <div className="text-xs font-mono mt-3 text-gray-500 font-medium">
                                            {playerData.streak === 0 ? 'Start your streak today' : 
                                             `${daysToMilestone} more days to first milestone`}
                                        </div>
                                    </div>

                                    {/* Right side: Flame Lottie */}
                                    <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none -mt-4">
                                            <FlameLottie size={102} />
                                        </div>
                                    </div>
                                </div>

                                {/* Bottom Weekly Tracker (Pills) */}
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5, 6, 7].map(day => (
                                        <div 
                                            key={day} 
                                            className="h-1.5 flex-1 rounded-full transition-colors duration-500"
                                            style={{ 
                                                background: day <= streakInWeek ? '#00d4ff' : 'rgba(255,255,255,0.06)',
                                                boxShadow: day <= streakInWeek ? '0 0 8px rgba(0,212,255,0.4)' : 'none'
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* ── STREAK REWARDS TIMELINE (hidden for now) ── */}
                            {/* <StreakRewardsTimelineWrapper playerData={playerData} /> */}


                            {/* ── PLANS SECTION (above map) ── */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <div className="text-xs font-black text-white uppercase tracking-widest">Training Programs</div>
                                    {(healthProfile as any)?.aiPlanUsed ? (
                                        <span
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider opacity-50 cursor-not-allowed"
                                            style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)', color: '#9ca3af' }}
                                        >
                                            <Check size={10} />
                                            Workout Plan Claimed
                                        </span>
                                    ) : (
                                        <button
                                            onClick={() => { setAiPlanError(null); setAiConfirmStep(0); setShowAIConfirm(true); }}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all"
                                            style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.35)', color: '#33dfff', boxShadow: '0 0 12px rgba(168,85,247,0.15)' }}
                                        >
                                            <Sparkles size={10} />
                                            Create Plan with AI (Free)
                                        </button>
                                    )}
                                </div>

                                <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
                                    {/* AI Plan card — always shown once generated */}
                                    {(healthProfile as any)?.aiPlanUsed && (
                                        (() => {
                                            const isAiActive = !(healthProfile as any)?.selectedPlanId;
                                            const aiPlanName = (healthProfile as any)?.aiGeneratedPlanName || healthProfile?.selectedPlanName || 'AI Custom Plan';
                                            return (
                                                <motion.button
                                                    whileTap={{ scale: 0.95 }}
                                                    whileHover={{ scale: 1.02 }}
                                                    onClick={() => {
                                                        if (isAiActive) return;
                                                        const aiDays = (healthProfile as any)?.aiGeneratedPlan || healthProfile?.workoutPlan;
                                                        if (aiDays && Array.isArray(aiDays)) {
                                                            const prevName = healthProfile?.selectedPlanName || 'None';
                                                            setPlanSwitchLoading(true);
                                                            setTimeout(() => {
                                                                const updated = {
                                                                    ...(healthProfile as HealthProfile),
                                                                    workoutPlan: aiDays,
                                                                    selectedPlanId: undefined,
                                                                    selectedPlanName: aiPlanName,
                                                                    planChangedAtDay: completedWorkouts,
                                                                    prevPlanName: prevName,
                                                                } as HealthProfile;
                                                                onSaveProfile(updated, updated.category || 'Hunter');
                                                                setPlanSwitchLoading(false);
                                                            }, 800);
                                                        }
                                                    }}
                                                    className="relative shrink-0 w-44 h-56 rounded-2xl overflow-hidden transition-all"
                                                    style={{
                                                        border: isAiActive ? '1px solid rgba(0,212,255,0.5)' : '1px solid rgba(168,85,247,0.3)',
                                                        boxShadow: isAiActive ? '0 0 24px rgba(0,212,255,0.2), 0 0 8px rgba(0,212,255,0.1)' : '0 4px 20px rgba(0,0,0,0.4)',
                                                        filter: isAiActive ? 'none' : 'grayscale(1) brightness(0.8)',
                                                        transition: 'filter 0.5s ease, border 0.3s ease, box-shadow 0.3s ease',
                                                    }}
                                                >
                                                    <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #1a0533 0%, #2d0a5e 40%, #0d0018 100%)' }} />
                                                    <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(168,85,247,0.35) 0%, transparent 65%)' }} />
                                                    <div className="absolute inset-0" style={{ backgroundImage: 'url("/images/ui/dungeon-bg.jpg")', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.08 }} />
                                                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.1) 100%)' }} />
                                                    <div className="absolute inset-0 p-3.5 flex flex-col justify-between">
                                                        <div className="flex items-start justify-between">
                                                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-purple-900/80 text-[#33dfff]">AI GENERATED</span>
                                                            {isAiActive && <span className="text-[8px] font-black text-system-neon bg-black/60 px-1.5 py-0.5 rounded-full border border-system-neon/30">ACTIVE</span>}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-black text-white leading-tight mb-1.5">{aiPlanName}</div>
                                                            <div className="text-[9px] text-[#33dfff]/70 font-mono">Personalized for you</div>
                                                        </div>
                                                    </div>
                                                </motion.button>
                                            );
                                        })()
                                    )}

                                    {/* Premade plan cards */}
                                    {premadePlans.map(plan => {
                                        const isActive = (healthProfile as any)?.selectedPlanId === plan.id;
                                        const dc = plan.difficulty === 'BEGINNER'
                                            ? { badge: 'bg-green-900/80 text-green-300', glow: 'rgba(0,212,255,0.18)', border: 'rgba(0,212,255,0.35)' }
                                            : plan.difficulty === 'INTERMEDIATE'
                                            ? { badge: 'bg-yellow-900/80 text-yellow-300', glow: 'rgba(0,212,255,0.18)', border: 'rgba(0,212,255,0.35)' }
                                            : { badge: 'bg-red-900/80 text-red-300', glow: 'rgba(0,212,255,0.18)', border: 'rgba(0,212,255,0.35)' };
                                        return (
                                            <div key={plan.id} className="relative shrink-0">
                                                <motion.button
                                                    whileTap={{ scale: 0.95 }}
                                                    whileHover={{ scale: 1.02 }}
                                                    onClick={() => {
                                                        if (isActive) return;
                                                        const prevName = healthProfile?.selectedPlanName || 'None';
                                                        setPlanSwitchLoading(true);
                                                        setTimeout(() => {
                                                            const days = Array.isArray(plan.days) ? plan.days : [];
                                                            const updated = {
                                                                ...(healthProfile || formData as HealthProfile),
                                                                workoutPlan: days,
                                                                selectedPlanId: plan.id,
                                                                selectedPlanName: plan.name,
                                                                planChangedAtDay: completedWorkouts,
                                                                prevPlanName: prevName,
                                                            } as HealthProfile;
                                                            onSaveProfile(updated, updated.category || 'Hunter');
                                                            setPlanSwitchLoading(false);
                                                        }, 800);
                                                    }}
                                                    className="relative w-44 h-56 rounded-2xl overflow-hidden transition-all"
                                                    style={{
                                                        border: `1px solid ${isActive ? dc.border : 'rgba(255,255,255,0.08)'}`,
                                                        boxShadow: isActive ? `0 0 24px ${dc.glow}, 0 0 8px ${dc.glow}` : `0 4px 20px rgba(0,0,0,0.4)`,
                                                        filter: isActive ? 'none' : 'grayscale(1) brightness(0.8)',
                                                        transition: 'filter 0.5s ease, border 0.3s ease, box-shadow 0.3s ease',
                                                    }}
                                                >
                                                    {plan.image_url ? (
                                                        <PlanCardImage src={plan.image_url} alt={plan.name} />
                                                    ) : (
                                                        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 100%)' }} />
                                                    )}
                                                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0.1) 100%)' }} />
                                                    <div className="absolute inset-0 p-3.5 flex flex-col justify-between">
                                                        <div className="flex items-start justify-between">
                                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${dc.badge}`}>{plan.difficulty}</span>
                                                            {isActive && <span className="text-[8px] font-black text-system-neon bg-black/60 px-1.5 py-0.5 rounded-full border border-system-neon/30">ACTIVE</span>}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-black text-white leading-tight mb-1.5">{plan.name}</div>
                                                            <div className="flex gap-2 text-[9px] text-gray-400 font-mono">
                                                                <span>{plan.duration_weeks}w</span>
                                                                <span>·</span>
                                                                <span>{plan.days_per_week}d/wk</span>
                                                            </div>
                                                            {plan.description && <div className="text-[9px] text-gray-500 mt-1.5 leading-snug line-clamp-2">{plan.description}</div>}
                                                        </div>
                                                    </div>
                                                </motion.button>
                                                {/* Gear button — only on active, non-AI plan */}
                                                {isActive && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const planDays = Array.isArray(plan.days) ? plan.days : [];
                                                            setCustomizerPlanData({ name: plan.name, days: planDays });
                                                            setShowPlanCustomizer(true);
                                                            onToggleNav?.(false);
                                                        }}
                                                        className="absolute top-2 right-2 z-10 w-6 h-6 bg-black/70 border border-gray-700 rounded-full flex items-center justify-center text-gray-400 hover:text-system-neon hover:border-system-neon/40 transition-all"
                                                        title="Customize Plan"
                                                    >
                                                        <Settings size={11} />
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {/* Custom / Manual plans — max 10 total */}
                                    {customPlans.filter(cp => cp.plan_type !== 'AI').slice(0, 10).map(cp => {
                                        const isActive = (healthProfile as any)?.selectedPlanId === `custom-${cp.id}`;
                                        const cpDays = Array.isArray(cp.days) ? cp.days : (typeof cp.days === 'string' ? JSON.parse(cp.days) : []);
                                        return (
                                            <div key={cp.id} className="relative shrink-0">
                                                <motion.button
                                                    whileTap={{ scale: 0.95 }}
                                                    whileHover={{ scale: 1.02 }}
                                                    onClick={() => {
                                                        if (isActive) return;
                                                        const prevName = healthProfile?.selectedPlanName || 'None';
                                                        setPlanSwitchLoading(true);
                                                        setTimeout(() => {
                                                            const updated = {
                                                                ...(healthProfile as HealthProfile),
                                                                workoutPlan: cpDays,
                                                                selectedPlanId: `custom-${cp.id}`,
                                                                selectedPlanName: cp.name,
                                                                planChangedAtDay: completedWorkouts,
                                                                prevPlanName: prevName,
                                                            } as HealthProfile;
                                                            onSaveProfile(updated, updated.category || 'Hunter');
                                                            setPlanSwitchLoading(false);
                                                        }, 800);
                                                    }}
                                                    className="relative w-44 h-56 rounded-2xl overflow-hidden transition-all"
                                                    style={{
                                                        border: isActive ? '1px solid rgba(0,212,255,0.6)' : '1px solid rgba(255,255,255,0.08)',
                                                        boxShadow: isActive ? '0 0 24px rgba(0,212,255,0.25)' : '0 4px 20px rgba(0,0,0,0.4)',
                                                        filter: isActive ? 'none' : 'grayscale(1) brightness(0.8)',
                                                        transition: 'filter 0.5s ease, border 0.3s ease, box-shadow 0.3s ease',
                                                    }}
                                                >
                                                    <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #001a1f 0%, #003040 40%, #000d14 100%)' }} />
                                                    <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(0,212,255,0.2) 0%, transparent 65%)' }} />
                                                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.1) 100%)' }} />
                                                    <div className="absolute inset-0 p-3.5 flex flex-col justify-between">
                                                        <div className="flex items-start justify-between">
                                                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-cyan-900/80 text-[#33dfff]">CUSTOM</span>
                                                            {isActive && <span className="text-[8px] font-black text-system-neon bg-black/60 px-1.5 py-0.5 rounded-full border border-system-neon/30">ACTIVE</span>}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-black text-white leading-tight mb-1.5">{cp.name}</div>
                                                            <div className="text-[9px] text-[#33dfff]/70 font-mono">{cpDays.length} days</div>
                                                        </div>
                                                    </div>
                                                </motion.button>
                                                {/* Gear button — only on active custom plan */}
                                                {isActive && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setCustomizerPlanData({ name: cp.name, days: cpDays });
                                                            setShowPlanCustomizer(true);
                                                            onToggleNav?.(false);
                                                        }}
                                                        className="absolute top-2 left-2 z-10 w-6 h-6 bg-black/70 border border-gray-700 rounded-full flex items-center justify-center text-gray-400 hover:text-system-neon hover:border-system-neon/40 transition-all"
                                                        title="Customize Plan"
                                                    >
                                                        <Settings size={11} />
                                                    </button>
                                                )}
                                                {/* Delete button for custom plans */}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (!confirm('Delete this custom plan?')) return;
                                                        fetch(`${API_BASE}/api/workout/custom-plans/${cp.id}`, { method: 'DELETE', credentials: 'include' })
                                                            .then(() => setCustomPlans(prev => prev.filter(p => p.id !== cp.id)))
                                                            .catch(() => {});
                                                    }}
                                                    className="absolute -top-1.5 -right-1.5 z-10 w-5 h-5 bg-red-600 hover:bg-red-500 rounded-full flex items-center justify-center text-white shadow-lg transition-colors"
                                                    title="Delete Plan"
                                                >
                                                    <X size={10} />
                                                </button>
                                            </div>
                                        );
                                    })}

                                    {premadePlans.length === 0 && !customPlans.length && !(healthProfile as any)?.aiPlanUsed && (
                                        <div className="flex items-center justify-center w-full py-6 text-center">
                                            <div>
                                                <div className="text-[10px] text-gray-600 font-mono mb-1">No plans yet.</div>
                                                <div className="text-[9px] text-gray-700">Use AI to generate a personalized plan →</div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* ── AI CONFIRM POPUP ── */}
                            {showAIConfirm && (
                                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
                                    <motion.div
                                        key={aiConfirmStep}
                                        initial={{ scale: 0.92, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 0.92, opacity: 0 }}
                                        className="w-full max-w-sm rounded-3xl p-6"
                                        style={{
                                            background: 'rgba(15,5,30,0.95)',
                                            border: '1px solid rgba(168,85,247,0.4)',
                                            boxShadow: '0 0 60px rgba(168,85,247,0.2), 0 20px 60px rgba(0,0,0,0.6)',
                                        }}
                                    >
                                        <div className="flex items-center gap-3 mb-5">
                                            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(168,85,247,0.2)', border: '1px solid rgba(168,85,247,0.3)' }}>
                                                <Sparkles size={18} className="text-[#00d4ff]" />
                                            </div>
                                            <div>
                                                <div className="text-[9px] font-bold text-[#00d4ff]/70 uppercase tracking-widest">ForgeGuard AI · Step {aiConfirmStep + 1} of 3</div>
                                                <div className="text-base font-black text-white">
                                                    {aiConfirmStep === 0 ? 'Training Frequency' : aiConfirmStep === 1 ? 'Session Duration' : 'Generate Your Plan'}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Step 0 — Days per week */}
                                        {aiConfirmStep === 0 && (
                                            <>
                                                <p className="text-[11px] text-gray-400 leading-relaxed mb-4">How many days per week do you work out?</p>
                                                <div className="grid grid-cols-7 gap-1.5 mb-5">
                                                    {[1,2,3,4,5,6,7].map(d => (
                                                        <button
                                                            key={d}
                                                            onClick={() => setAiDaysPerWeek(d)}
                                                            className="py-3 rounded-xl text-sm font-black transition-all"
                                                            style={aiDaysPerWeek === d
                                                                ? { background: 'linear-gradient(135deg,#7c3aed,#9333ea)', color: '#fff', boxShadow: '0 0 16px rgba(0,212,255,0.5)' }
                                                                : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af' }
                                                            }
                                                        >{d}</button>
                                                    ))}
                                                </div>
                                                <div className="text-center text-[10px] text-[#33dfff]/60 font-mono mb-5">{aiDaysPerWeek} day{aiDaysPerWeek > 1 ? 's' : ''} per week selected</div>
                                                <div className="flex gap-3">
                                                    <button onClick={() => { setShowAIConfirm(false); setAiPlanError(null); setAiConfirmStep(0); }} className="flex-1 py-3 rounded-xl text-[11px] font-bold text-gray-500 border border-gray-800">Cancel</button>
                                                    <button onClick={() => setAiConfirmStep(1)} className="flex-1 py-3 rounded-xl text-[11px] font-black text-white" style={{ background: 'linear-gradient(135deg,#7c3aed,#9333ea)', boxShadow: '0 0 20px rgba(0,212,255,0.4)' }}>Next →</button>
                                                </div>
                                            </>
                                        )}

                                        {/* Step 1 — Session duration */}
                                        {aiConfirmStep === 1 && (
                                            <>
                                                <p className="text-[11px] text-gray-400 leading-relaxed mb-4">How long is each workout session?</p>
                                                <div className="grid grid-cols-2 gap-2 mb-5">
                                                    {[30,45,60,90].map(min => (
                                                        <button
                                                            key={min}
                                                            onClick={() => setAiSessionDuration(min)}
                                                            className="py-4 rounded-xl font-black transition-all"
                                                            style={aiSessionDuration === min
                                                                ? { background: 'linear-gradient(135deg,#7c3aed,#9333ea)', color: '#fff', boxShadow: '0 0 16px rgba(0,212,255,0.5)' }
                                                                : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af' }
                                                            }
                                                        >
                                                            <div className="text-lg">{min}</div>
                                                            <div className="text-[9px] opacity-70">minutes</div>
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className="flex gap-3">
                                                    <button onClick={() => setAiConfirmStep(0)} className="flex-1 py-3 rounded-xl text-[11px] font-bold text-gray-500 border border-gray-800">← Back</button>
                                                    <button onClick={() => setAiConfirmStep(2)} className="flex-1 py-3 rounded-xl text-[11px] font-black text-white" style={{ background: 'linear-gradient(135deg,#7c3aed,#9333ea)', boxShadow: '0 0 20px rgba(0,212,255,0.4)' }}>Next →</button>
                                                </div>
                                            </>
                                        )}

                                        {/* Step 2 — Confirm & generate */}
                                        {aiConfirmStep === 2 && (
                                            <>
                                                <div className="flex gap-2 mb-4">
                                                    <div className="flex-1 px-3 py-2.5 rounded-xl text-center" style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)' }}>
                                                        <div className="text-lg font-black text-white">{aiDaysPerWeek}</div>
                                                        <div className="text-[9px] text-[#33dfff]/70 font-mono">days/week</div>
                                                    </div>
                                                    <div className="flex-1 px-3 py-2.5 rounded-xl text-center" style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)' }}>
                                                        <div className="text-lg font-black text-white">{aiSessionDuration}</div>
                                                        <div className="text-[9px] text-[#33dfff]/70 font-mono">min/session</div>
                                                    </div>
                                                </div>
                                                <p className="text-[11px] text-gray-400 leading-relaxed mb-3">
                                                    AI will build a <span className="text-white font-bold">{aiDaysPerWeek}-day plan</span> with <span className="text-white font-bold">{aiSessionDuration}-min sessions</span> — tailored to your <span className="text-white font-bold">{(healthProfile || formData).goal || 'RECOMP'}</span> goal using only exercises from the library.
                                                </p>
                                                {(healthProfile as any)?.aiPlanUsed ? (
                                                    <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                                                        <span className="text-sm">🔒</span>
                                                        <span className="text-[11px] text-red-400 font-bold">Already Generated — One per account</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl" style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)' }}>
                                                        <span className="text-sm">✨</span>
                                                        <span className="text-[11px] text-system-neon font-bold">Free — One Time Only</span>
                                                    </div>
                                                )}
                                                {aiPlanError && (
                                                    <div className="mb-3 px-3 py-2 rounded-xl bg-red-900/30 border border-red-700/40 text-[10px] text-red-400">{aiPlanError}</div>
                                                )}
                                                {isGeneratingPlan ? (
                                                    <AIGeneratingLoader />
                                                ) : (
                                                    <div className="flex gap-3">
                                                        <button onClick={() => setAiConfirmStep(1)} className="flex-1 py-3 rounded-xl text-[11px] font-bold text-gray-500 border border-gray-800">← Back</button>
                                                        <button
                                                            onClick={handleGenerateAIPlan}
                                                            disabled={!!(healthProfile as any)?.aiPlanUsed}
                                                            className="flex-1 py-3 rounded-xl text-[11px] font-black text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                                            style={{ background: 'linear-gradient(135deg,#7c3aed,#9333ea)', boxShadow: '0 0 20px rgba(0,212,255,0.4)' }}
                                                        >
                                                            Generate Plan
                                                        </button>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </motion.div>
                                </div>
                            )}

                            {/* ── WORKOUT MAP ── */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="text-[10px] text-gray-500 font-mono">
                                        {healthProfile?.selectedPlanName ? (
                                            <span>Program: <span className="text-system-neon font-bold">{healthProfile.selectedPlanName}</span></span>
                                        ) : (
                                            <span className="text-gray-700">Default System Protocol</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {/* Gear button — opens PlanCustomizer for non-AI plans */}
                                        {healthProfile?.selectedPlanId && !(healthProfile as any)?.aiPlanUsed && (
                                            <button
                                                onClick={() => {
                                                    setCustomizerPlanData({ name: healthProfile?.selectedPlanName || 'Plan', days: calculatedPlan });
                                                    setShowPlanCustomizer(true);
                                                    onToggleNav?.(false);
                                                }}
                                                className="text-gray-500 hover:text-system-neon transition-colors p-1 rounded-lg hover:bg-white/5"
                                                title="Customize Plan"
                                            >
                                                <Settings size={14} />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setViewMode('PLAN_SELECT')}
                                            className="text-[9px] text-gray-600 hover:text-system-neon font-mono transition-colors"
                                        >
                                            Switch Plan
                                        </button>
                                    </div>
                                </div>
                                <WorkoutMap currentWeight={healthProfile?.weight || 0} targetWeight={healthProfile?.targetWeight || 0} workoutPlan={calculatedPlan} dayMap={dayMap} todayStr={todayStr} journeyStartDate={journeyStartDate} streak={playerData.streak} planChangedAtDay={(healthProfile as any)?.planChangedAtDay} planChangeLabel={(healthProfile as any)?.prevPlanName && healthProfile?.selectedPlanName ? `${(healthProfile as any).prevPlanName} → ${healthProfile.selectedPlanName}` : undefined} sessionLogs={sessionLogs} onStartDay={(idx) => { if (todayDefaultDone) { setShowTodayDoneNotice(true); setTimeout(() => setShowTodayDoneNotice(false), 3000); return; } setActivePlan(calculatedPlan[idx % calculatedPlan.length]); setViewMode('OVERVIEW'); }} />
                            </div>

                            {/* ── PROTOCOL CALENDAR ── */}
                            <ProtocolMonthView plan={calculatedPlan} />

                            {/* ── FAB: Custom Plan Builder ── */}
                            <div className="fixed right-4 z-40 flex flex-col items-end gap-2" style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 6.5rem)' }}>
                                <AnimatePresence>
                                    {showTodayDoneNotice && (
                                        <motion.div
                                            key="notice"
                                            initial={{ opacity: 0, y: 8, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 8, scale: 0.95 }}
                                            className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-right shadow-xl max-w-[180px]"
                                        >
                                            <div className="text-[10px] font-black text-white mb-0.5">Default Plan Done!</div>
                                            <div className="text-[9px] text-gray-400 font-mono leading-tight">Tap + to create a custom workout session.</div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                                <motion.button
                                    onClick={() => {
                                        setShowCustomPlanBuilder(true);
                                        onToggleNav?.(false);
                                    }}
                                    className="w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-[0_4px_15px_rgba(0,0,0,0.4)] bg-system-neon text-black hover:bg-white shadow-[0_0_20px_rgba(0,212,255,0.5),0_4px_15px_rgba(0,0,0,0.4)] animate-fab-float"
                                    whileTap={{ scale: 0.9 }}
                                >
                                    <Plus size={24} strokeWidth={3} />
                                </motion.button>
                            </div>

                        </motion.div>
                        );
                    })()}
                    
                    {activeTab === 'NUTRITION' && (
                        <motion.div 
                            key="nut" 
                            initial={{ opacity: 0, y: 10 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            exit={{ opacity: 0, y: -10 }} 
                            className="flex flex-col items-center gap-6 px-4"
                        >
                            <motion.div 
                                className="w-full max-w-sm rounded-2xl p-6"
                                initial={{ scale: 0.95 }}
                                animate={{ scale: 1 }}
                                style={{
                                  background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(8,8,20,0.82) 12%, rgba(4,4,14,0.92) 100%)',
                                  backdropFilter: 'blur(24px) saturate(180%)',
                                  WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                                  borderTop: '1px solid rgba(255,255,255,0.13)',
                                  borderLeft: '1px solid rgba(255,255,255,0.07)',
                                  borderRight: '1px solid rgba(255,255,255,0.04)',
                                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07), 0 8px 32px rgba(0,0,0,0.45)',
                                }}
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xs font-bold text-gray-400 tracking-widest flex items-center gap-2 uppercase">
                                        <Clock size={14} className="text-system-neon" /> Daily Fuel Status
                                    </h3>
                                    <button
                                        onClick={() => { setCalorieLimitInput(healthProfile?.customCalorieLimit?.toString() || ''); setShowCalorieEditor(prev => !prev); }}
                                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-800/60 hover:bg-gray-700/60 border border-gray-700/50 text-[9px] text-gray-400 hover:text-[#00d4ff] transition-all uppercase font-bold tracking-wider"
                                        title="Set custom calorie limit"
                                    >
                                        <Settings size={10} /> Limit
                                    </button>
                                </div>

                                {/* Custom Calorie Limit Editor */}
                                <AnimatePresence>
                                {showCalorieEditor && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden mb-4"
                                    >
                                        <div className="rounded-xl p-3 border border-purple-900/30 bg-purple-950/20">
                                            <div className="text-[9px] text-[#00d4ff] font-bold uppercase tracking-widest mb-2">Custom Calorie Limit</div>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    value={calorieLimitInput}
                                                    onChange={e => setCalorieLimitInput(e.target.value)}
                                                    placeholder={`${dailyTargets?.calories || nutritionInfo.macros.calories}`}
                                                    className="flex-1 bg-black/50 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#00d4ff] font-mono"
                                                    min={800}
                                                    max={10000}
                                                />
                                                <button
                                                    onClick={async () => {
                                                        const val = parseInt(calorieLimitInput);
                                                        if (!val || val < 800 || val > 10000) return;
                                                        if (!healthProfile) return;
                                                        const updated = { ...healthProfile, customCalorieLimit: val };
                                                        onSaveProfile(updated, updated.category || 'Hunter');
                                                        setShowCalorieEditor(false);
                                                        playSystemSoundEffect('SYSTEM');
                                                    }}
                                                    className="px-3 py-2 rounded-lg bg-purple-900/40 hover:bg-purple-900/70 border border-purple-700/50 text-[#33dfff] text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 whitespace-nowrap"
                                                >
                                                    SET
                                                </button>
                                            </div>
                                            {healthProfile?.customCalorieLimit && (
                                                <button
                                                    onClick={async () => {
                                                        if (!healthProfile) return;
                                                        const updated = { ...healthProfile, customCalorieLimit: undefined };
                                                        onSaveProfile(updated, updated.category || 'Hunter');
                                                        setShowCalorieEditor(false);
                                                        playSystemSoundEffect('SYSTEM');
                                                    }}
                                                    className="mt-2 w-full text-center py-1.5 rounded-lg bg-gray-800/40 hover:bg-gray-800/70 border border-gray-700/50 text-[9px] text-gray-500 hover:text-red-400 font-bold uppercase tracking-wider transition-all"
                                                >
                                                    Reset to Auto ({(() => {
                                                        if (!healthProfile) return nutritionInfo.macros.calories;
                                                        let bmr = 0;
                                                        if (healthProfile.weight && healthProfile.height && healthProfile.age) {
                                                            bmr = healthProfile.gender === 'MALE'
                                                                ? (10 * healthProfile.weight) + (6.25 * healthProfile.height) - (5 * healthProfile.age) + 5
                                                                : (10 * healthProfile.weight) + (6.25 * healthProfile.height) - (5 * healthProfile.age) - 161;
                                                        } else { bmr = healthProfile.bmr || 1800; }
                                                        const mult: Record<string, number> = { SEDENTARY: 1.2, LIGHT: 1.375, MODERATE: 1.55, VERY_ACTIVE: 1.725 };
                                                        let cal = Math.round(bmr * (mult[healthProfile.activityLevel] || 1.55));
                                                        if (healthProfile.goal === 'LOSE_WEIGHT') cal = Math.max(1200, cal - 500);
                                                        else if (healthProfile.goal === 'BUILD_MUSCLE') cal += 300;
                                                        return cal;
                                                    })()} kcal) · 5 Keys
                                                </button>
                                            )}
                                            <div className="text-[8px] text-gray-600 mt-2">Min 800 · Max 10,000 kcal</div>
                                        </div>
                                    </motion.div>
                                )}
                                </AnimatePresence>
                                
                                {/* Calories Comparison */}
                                {(() => {
                                    const target = dailyTargets?.calories || nutritionInfo.macros.calories;
                                    const consumed = dailyIntake.calories;
                                    const isOver = consumed > target;
                                    const overflow = isOver ? consumed - target : 0;
                                    const capped = isOver ? target : consumed;
                                    const remaining = Math.max(0, target - consumed);
                                    return (<>
                                <div className="flex justify-between items-end mb-2">
                                    <div>
                                        <div className="text-[10px] text-gray-500 uppercase font-bold">Consumed</div>
                                        <div className="text-2xl font-black text-white">{capped} <span className="text-xs font-normal text-gray-600">/ {target}</span></div>
                                    </div>
                                    {isOver ? (
                                    <div className="text-right">
                                        <div className="text-[10px] text-red-400 uppercase font-bold tracking-widest flex items-center justify-end gap-1">⚠ OVER</div>
                                        <div className="text-2xl font-black text-red-500">+{overflow} <span className="text-xs font-normal text-red-400/60">KCAL</span></div>
                                    </div>
                                    ) : (
                                    <div className="text-right">
                                        <div className="text-[10px] text-gray-500 uppercase font-bold">Target</div>
                                        <div className="text-2xl font-black text-gray-400">{target}</div>
                                    </div>
                                    )}
                                </div>
                                
                                {/* Calorie Progress Bar */}
                                <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-1">
                                    <motion.div 
                                        className={`h-full ${isOver ? 'bg-red-500' : 'bg-system-neon'}`}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min((consumed / target) * 100, 100)}%` }}
                                    />
                                </div>
                                {/* Overflow Bar (only shows when over limit) */}
                                {isOver && (
                                    <div className="h-1.5 bg-gray-800/50 rounded-full overflow-hidden mb-1">
                                        <motion.div 
                                            className="h-full bg-gradient-to-r from-red-500 to-red-400"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min((overflow / target) * 100, 100)}%` }}
                                        />
                                    </div>
                                )}
                                <div className="mb-6" />

                                {/* Remaining / Overflow Budget Display */}
                                <div className="rounded-xl p-4 text-center mb-6" style={{ background: isOver ? 'rgba(220,38,38,0.08)' : 'rgba(0,0,0,0.35)', border: isOver ? '1px solid rgba(220,38,38,0.2)' : '1px solid rgba(255,255,255,0.06)' }}>
                                    {isOver ? (
                                        <>
                                            <div className="text-[10px] text-red-400/80 font-bold uppercase tracking-widest mb-1">Excess Calories</div>
                                            <div className="text-3xl font-black text-red-500">
                                                +{overflow} <span className="text-xs font-normal text-red-400/60">KCAL OVER</span>
                                            </div>
                                            <div className="text-[9px] text-gray-600 mt-1">Total consumed: {consumed} kcal</div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Remaining Calories Budget</div>
                                            <div className="text-3xl font-black text-system-success">
                                                {remaining} <span className="text-xs font-normal text-gray-600">KCAL</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                                    </>);
                                })()}

                                {/* Macro Breakdown */}
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="text-center">
                                        <div className="text-[9px] text-gray-500 uppercase font-bold mb-1 flex justify-center items-center gap-1"><Beef size={10} /> PRO</div>
                                        <div className="text-xs font-bold text-blue-400">{dailyIntake.protein} / {dailyTargets?.protein || nutritionInfo.macros.protein}g</div>
                                        <div className="h-1 bg-gray-800 mt-1 rounded-full"><div style={{ width: `${Math.min((dailyIntake.protein / (dailyTargets?.protein || nutritionInfo.macros.protein))*100, 100)}%` }} className="h-full bg-blue-500" /></div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-[9px] text-gray-500 uppercase font-bold mb-1 flex justify-center items-center gap-1"><Wheat size={10} /> CARB</div>
                                        <div className="text-xs font-bold text-green-400">{dailyIntake.carbs} / {dailyTargets?.carbs || nutritionInfo.macros.carbs}g</div>
                                        <div className="h-1 bg-gray-800 mt-1 rounded-full"><div style={{ width: `${Math.min((dailyIntake.carbs / (dailyTargets?.carbs || nutritionInfo.macros.carbs))*100, 100)}%` }} className="h-full bg-green-500" /></div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-[9px] text-gray-500 uppercase font-bold mb-1 flex justify-center items-center gap-1"><Droplets size={10} /> FAT</div>
                                        <div className="text-xs font-bold text-yellow-400">{dailyIntake.fats} / {dailyTargets?.fats || nutritionInfo.macros.fats}g</div>
                                        <div className="h-1 bg-gray-800 mt-1 rounded-full"><div style={{ width: `${Math.min((dailyIntake.fats / (dailyTargets?.fats || nutritionInfo.macros.fats))*100, 100)}%` }} className="h-full bg-yellow-500" /></div>
                                    </div>
                                </div>
                            </motion.div>

                            {/* STATE: IDLE - MEAL TYPE + UPLOAD AREA */}
                            {scanState === 'IDLE' && (
                                <motion.div 
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="w-full max-w-sm space-y-3"
                                >
                                    {/* Meal Type Selector */}
                                    <div>
                                        <div className="text-[9px] font-mono text-gray-500 uppercase tracking-widest mb-2 text-center">Select Meal</div>
                                        <div className="grid grid-cols-4 gap-1.5">
                                            {(['BREAKFAST', 'LUNCH', 'SNACK', 'DINNER'] as MealType[]).map(type => {
                                                const icons: Record<MealType, string> = { BREAKFAST: '🌅', LUNCH: '☀️', SNACK: '🍎', DINNER: '🌙' };
                                                return (
                                                    <button
                                                        key={type}
                                                        onClick={() => setSelectedMealType(type)}
                                                        className={`py-2 rounded-xl border text-[9px] font-mono font-bold tracking-widest flex flex-col items-center gap-1 transition-all ${
                                                            selectedMealType === type
                                                                ? 'border-system-neon/60 bg-system-neon/10 text-system-neon'
                                                                : 'border-gray-800 text-gray-600 hover:border-gray-600 hover:text-gray-400'
                                                        }`}
                                                    >
                                                        <span>{icons[type]}</span>
                                                        <span>{type.charAt(0) + type.slice(1).toLowerCase()}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <div
                                        onClick={handleNativePick}
                                        className="bg-gray-900/40 border-2 border-dashed border-gray-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-4 hover:border-system-neon/50 hover:bg-gray-900/60 transition-all cursor-pointer relative overflow-hidden group h-[200px]"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-system-neon/5 to-transparent translate-y-[-100%] group-hover:translate-y-[100%] transition-transform duration-1000 ease-in-out pointer-events-none" />
                                        
                                        <div className="w-16 h-16 rounded-full bg-black border border-system-neon/30 flex items-center justify-center relative shadow-[0_0_30px_rgba(0,212,255,0.1)] group-hover:shadow-[0_0_50px_rgba(0,212,255,0.2)] transition-shadow">
                                            <Camera size={24} className="text-system-neon relative z-10" />
                                            <div className="absolute inset-0 rounded-full border border-system-neon opacity-20 animate-ping" />
                                        </div>
                                        
                                        <div>
                                            <h3 className="text-lg font-bold text-white font-mono tracking-tight">LOG MEAL</h3>
                                            <p className="text-[10px] text-gray-400 font-mono mt-1 tracking-wider uppercase opacity-80">TAP TO SCAN · CAMERA OR GALLERY</p>
                                            <p className="text-[9px] text-gray-500 font-mono tracking-widest uppercase mt-2 flex items-center justify-center gap-1">
                                                <Zap size={10} className="text-[#00d4ff]" /> 1 KEY
                                            </p>
                                        </div>

                                        {/* Hidden fallback for web (triggered by handleNativePick on web) */}
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            ref={fileInputRef}
                                            onChange={handleFileUpload}
                                            className="hidden"
                                        />
                                    </div>

                                    {/* Manual Food Log Button */}
                                    <button
                                        onClick={() => setShowFoodLibrary(true)}
                                        className="w-full py-3.5 rounded-xl border border-[#00d4ff]/30 bg-[#00d4ff]/5 hover:bg-[#00d4ff]/10 hover:border-[#00d4ff]/50 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Utensils size={16} className="text-[#00d4ff]" />
                                        <span className="text-xs font-mono font-bold text-[#00d4ff] tracking-widest">MANUAL FOOD LOG</span>
                                        <span className="text-[9px] text-gray-500 font-mono ml-1">FREE</span>
                                    </button>
                                </motion.div>
                            )}

                            {/* STATE: SCANNING */}
                            {scanState === 'SCANNING' && scannedImage && (
                                <motion.div 
                                    className="w-full max-w-sm bg-black border border-system-neon/50 rounded-2xl overflow-hidden relative shadow-[0_0_50px_rgba(0,212,255,0.2)]"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                >
                                    <div className="aspect-[4/5] relative">
                                        <img src={scannedImage} alt="Scanning" className="w-full h-full object-cover opacity-60" />
                                        
                                        {/* Scanning Beam */}
                                        <motion.div 
                                            className="absolute left-0 w-full h-1 bg-system-neon shadow-[0_0_20px_#00d4ff,0_0_10px_white] z-10"
                                            animate={{ top: ['0%', '100%', '0%'] }}
                                            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                        />
                                        
                                        {/* Grid Overlay */}
                                        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,212,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,212,255,0.1)_1px,transparent_1px)] bg-[size:40px_40px] z-0 pointer-events-none" />
                                        
                                        <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                                            <div className="bg-black/80 backdrop-blur-md px-6 py-3 rounded-lg border border-system-neon/30 flex items-center gap-3">
                                                <Loader2 size={18} className="text-system-neon animate-spin" />
                                                <span className="text-xs font-mono text-white tracking-widest font-bold">{loadingMessage}</span>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* STATE: ERROR */}
                            {scanState === 'ERROR' && (
                                <motion.div
                                    className="w-full max-w-sm bg-[#0a0a0a] border border-red-900/50 rounded-2xl p-6 text-center space-y-4"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                >
                                    <div className="text-red-400 text-4xl">⚠</div>
                                    <div className="text-xs font-bold text-red-400 tracking-widest">ANALYSIS FAILED</div>
                                    <div className="text-xs text-gray-500">{scanError || 'Unknown error. Try a clearer photo.'}</div>
                                    <button
                                        onClick={resetScanner}
                                        className="w-full py-3 rounded-xl border border-gray-700 text-gray-300 font-mono font-bold text-xs hover:border-gray-500 transition-colors"
                                    >
                                        TRY AGAIN
                                    </button>
                                </motion.div>
                            )}

                            {/* STATE: RESULT */}
                            {scanState === 'RESULT' && scanResult && scannedImage && (
                                <motion.div 
                                    className="w-full max-w-sm bg-[#0a0a0a] border border-system-border rounded-2xl overflow-hidden shadow-2xl relative"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                >
                                    <div className="relative h-48">
                                        <img src={scannedImage} alt="Result" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
                                        <div className="absolute bottom-4 left-4 right-4">
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className="text-[10px] text-system-neon font-bold tracking-widest bg-system-neon/10 px-2 py-0.5 rounded border border-system-neon/30">
                                                    SCAN COMPLETE
                                                </div>
                                                {scanResult.aiConfidence && (
                                                    <div className={`text-[9px] font-bold tracking-widest px-2 py-0.5 rounded border ${
                                                        scanResult.aiConfidence === 'High'
                                                            ? 'text-green-400 bg-green-400/10 border-green-400/30'
                                                            : scanResult.aiConfidence === 'Medium'
                                                            ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30'
                                                            : 'text-orange-400 bg-orange-400/10 border-orange-400/30'
                                                    }`}>
                                                        {scanResult.aiConfidence.toUpperCase()} CONFIDENCE
                                                    </div>
                                                )}
                                            </div>
                                            <h3 className="text-xl font-black text-white italic leading-tight">{scanResult.name}</h3>
                                            {scanResult.servingSize && (
                                                <div className="text-[10px] text-gray-400 mt-0.5">{scanResult.servingSize}</div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="p-5 space-y-4">
                                        {/* Total Calories */}
                                        <div className="flex items-center justify-between bg-white/5 px-4 py-3 rounded-xl border border-white/10">
                                            <div className="flex items-center gap-2">
                                                <Flame size={18} className="text-orange-500" />
                                                <span className="text-xs font-bold text-gray-300 tracking-widest">TOTAL ENERGY</span>
                                            </div>
                                            <div className="text-3xl font-black text-white tracking-tighter">
                                                {scanResult.calories} <span className="text-sm font-normal text-gray-500">KCAL</span>
                                            </div>
                                        </div>

                                        {/* Macros Grid */}
                                        <div>
                                            <div className="text-[9px] text-gray-600 font-bold tracking-widest mb-2 uppercase">Macronutrients</div>
                                            <div className="grid grid-cols-3 gap-2 mb-2">
                                                <div className="text-center p-2.5 bg-gray-900/50 rounded-xl border border-gray-800">
                                                    <div className="text-[9px] text-blue-400 font-bold mb-1 tracking-widest">PROTEIN</div>
                                                    <div className="text-base font-black text-white">{scanResult.protein}g</div>
                                                    <div className="h-0.5 bg-gray-800 mt-1.5 rounded-full overflow-hidden">
                                                        <div className="h-full bg-blue-500" style={{ width: `${Math.min(100, (scanResult.protein / 50) * 100)}%` }} />
                                                    </div>
                                                </div>
                                                <div className="text-center p-2.5 bg-gray-900/50 rounded-xl border border-gray-800">
                                                    <div className="text-[9px] text-green-400 font-bold mb-1 tracking-widest">CARBS</div>
                                                    <div className="text-base font-black text-white">{scanResult.carbs}g</div>
                                                    <div className="h-0.5 bg-gray-800 mt-1.5 rounded-full overflow-hidden">
                                                        <div className="h-full bg-green-500" style={{ width: `${Math.min(100, (scanResult.carbs / 130) * 100)}%` }} />
                                                    </div>
                                                </div>
                                                <div className="text-center p-2.5 bg-gray-900/50 rounded-xl border border-gray-800">
                                                    <div className="text-[9px] text-yellow-400 font-bold mb-1 tracking-widest">FATS</div>
                                                    <div className="text-base font-black text-white">{scanResult.fats}g</div>
                                                    <div className="h-0.5 bg-gray-800 mt-1.5 rounded-full overflow-hidden">
                                                        <div className="h-full bg-yellow-500" style={{ width: `${Math.min(100, (scanResult.fats / 65) * 100)}%` }} />
                                                    </div>
                                                </div>
                                            </div>
                                            {(scanResult.fiber != null || scanResult.sugar != null) && (
                                                <div className="grid grid-cols-2 gap-2">
                                                    {scanResult.fiber != null && (
                                                        <div className="text-center p-2 bg-gray-900/30 rounded-xl border border-gray-800/60">
                                                            <div className="text-[9px] text-[#00d4ff] font-bold mb-0.5 tracking-widest">FIBER</div>
                                                            <div className="text-sm font-black text-white">{scanResult.fiber}g</div>
                                                        </div>
                                                    )}
                                                    {scanResult.sugar != null && (
                                                        <div className="text-center p-2 bg-gray-900/30 rounded-xl border border-gray-800/60">
                                                            <div className="text-[9px] text-pink-400 font-bold mb-0.5 tracking-widest">SUGAR</div>
                                                            <div className="text-sm font-black text-white">{scanResult.sugar}g</div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Micronutrients Collapsible */}
                                        {(scanResult.sodium != null || scanResult.vitaminA != null) && (
                                            <div className="bg-gray-900/30 rounded-xl border border-gray-800/60 overflow-hidden">
                                                <button
                                                    onClick={() => setShowMicros(v => !v)}
                                                    className="w-full flex items-center justify-between px-4 py-2.5 text-[9px] font-bold text-gray-400 tracking-widest uppercase hover:text-white transition-colors"
                                                >
                                                    <span>MICRONUTRIENTS</span>
                                                    <span className="text-system-neon">{showMicros ? '▲' : '▼'}</span>
                                                </button>
                                                {showMicros && (
                                                    <div className="px-4 pb-4 space-y-2.5">
                                                        {[
                                                            { label: 'Sodium', value: scanResult.sodium, unit: 'mg', max: 2300, color: 'bg-red-500' },
                                                            { label: 'Potassium', value: scanResult.potassium, unit: 'mg', max: 4700, color: 'bg-orange-400' },
                                                            { label: 'Vitamin A', value: scanResult.vitaminA, unit: '% DV', max: 100, color: 'bg-yellow-400' },
                                                            { label: 'Vitamin C', value: scanResult.vitaminC, unit: '% DV', max: 100, color: 'bg-orange-300' },
                                                            { label: 'Vitamin D', value: scanResult.vitaminD, unit: '% DV', max: 100, color: 'bg-amber-400' },
                                                            { label: 'Vitamin B12', value: scanResult.vitaminB12, unit: '% DV', max: 100, color: 'bg-[#00d4ff]' },
                                                            { label: 'Calcium', value: scanResult.calcium, unit: '% DV', max: 100, color: 'bg-blue-300' },
                                                            { label: 'Iron', value: scanResult.iron, unit: '% DV', max: 100, color: 'bg-gray-400' },
                                                        ].filter(m => m.value != null).map(micro => (
                                                            <div key={micro.label}>
                                                                <div className="flex justify-between text-[9px] mb-1">
                                                                    <span className="text-gray-400 font-bold">{micro.label}</span>
                                                                    <span className="text-white font-mono">{micro.value}{micro.unit}</span>
                                                                </div>
                                                                <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                                                                    <div
                                                                        className={`h-full ${micro.color} rounded-full transition-all`}
                                                                        style={{ width: `${Math.min(100, ((micro.value ?? 0) / micro.max) * 100)}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Ingredients Chips */}
                                        {scanResult.ingredients && scanResult.ingredients.length > 0 && (
                                            <div>
                                                <div className="text-[9px] text-gray-600 font-bold tracking-widest mb-2 uppercase">Detected Ingredients</div>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {scanResult.ingredients.map((ing, idx) => (
                                                        <span
                                                            key={idx}
                                                            className="text-[9px] font-mono text-system-neon bg-system-neon/10 border border-system-neon/20 px-2 py-0.5 rounded-full capitalize"
                                                        >
                                                            {ing}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Meal Type Selector */}
                                        <div>
                                            <div className="text-[9px] font-mono text-gray-500 uppercase tracking-widest mb-2">Log As</div>
                                            <div className="grid grid-cols-4 gap-1.5">
                                                {(['BREAKFAST', 'LUNCH', 'SNACK', 'DINNER'] as MealType[]).map(type => {
                                                    const icons: Record<MealType, string> = { BREAKFAST: '🌅', LUNCH: '☀️', SNACK: '🍎', DINNER: '🌙' };
                                                    return (
                                                        <button
                                                            key={type}
                                                            onClick={() => setSelectedMealType(type)}
                                                            className={`py-1.5 rounded-lg border text-[8px] font-mono font-bold flex flex-col items-center gap-0.5 transition-all ${
                                                                selectedMealType === type
                                                                    ? 'border-system-neon/60 bg-system-neon/10 text-system-neon'
                                                                    : 'border-gray-800 text-gray-600 hover:border-gray-700'
                                                            }`}
                                                        >
                                                            <span>{icons[type]}</span>
                                                            <span>{type.charAt(0) + type.slice(1).toLowerCase()}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="grid grid-cols-2 gap-3 pt-1">
                                            <button 
                                                onClick={resetScanner}
                                                className="py-3 rounded-xl border border-gray-800 text-gray-400 font-mono font-bold text-xs hover:text-white hover:border-gray-600 transition-colors flex items-center justify-center gap-2"
                                            >
                                                <Trash2 size={16} /> DISCARD
                                            </button>
                                            <button 
                                                onClick={confirmLog}
                                                className="py-3 rounded-xl bg-system-neon text-black font-mono font-black text-xs hover:bg-white transition-colors flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,212,255,0.4)]"
                                            >
                                                <Save size={16} /> CONFIRM LOG
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </motion.div>
                    )}

                    {/* ── 4-SECTION FOOD LOG ── */}
                    {activeTab === 'NUTRITION' && (() => {
                        const todayStart = new Date(); todayStart.setHours(0,0,0,0);
                        const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(yesterdayStart.getDate() - 1);
                        const todayLogs = (playerData.nutritionLogs || []).filter(l => l.timestamp >= todayStart.getTime());
                        const yesterdayLogs = (playerData.nutritionLogs || []).filter(l => l.timestamp >= yesterdayStart.getTime() && l.timestamp < todayStart.getTime());
                        const MEAL_SECTIONS: { type: MealType; label: string; icon: string; accent: string }[] = [
                            { type: 'BREAKFAST', label: 'Breakfast', icon: '🌅', accent: '#f59e0b' },
                            { type: 'LUNCH', label: 'Lunch', icon: '☀️', accent: '#00d4ff' },
                            { type: 'SNACK', label: 'Snack', icon: '🍎', accent: '#10b981' },
                            { type: 'DINNER', label: 'Dinner', icon: '🌙', accent: '#00d4ff' },
                        ];
                        const totalLogged = todayLogs.length;
                        const yesterdayTotal = yesterdayLogs.reduce((sum, log) => sum + log.totalCalories, 0);
                        if (totalLogged === 0 && yesterdayLogs.length === 0) return null;
                        return (
                            <motion.div
                                key="foodlog"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="w-full max-w-sm px-0 space-y-3 pb-4"
                            >
                                {/* Yesterday's Summary */}
                                {yesterdayLogs.length > 0 && (
                                    <div className="bg-gray-900/30 border border-gray-800/50 rounded-xl px-4 py-3 mt-8">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest">Yesterday</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-[10px] font-mono text-gray-600">{yesterdayLogs.length} meals</span>
                                                <span className="text-xs font-black font-mono text-gray-400">{yesterdayTotal} kcal</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {totalLogged > 0 && <div className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest text-center pt-2 mt-4">Today's Meal Log</div>}
                                {MEAL_SECTIONS.map(section => {
                                    const sectionLogs = todayLogs.filter(l => (l.mealType || 'LUNCH') === section.type);
                                    const sectionCals = sectionLogs.reduce((s, l) => s + l.totalCalories, 0);
                                    if (sectionLogs.length === 0) return null;
                                    return (
                                        <div key={section.type} className="bg-black/40 border border-white/[0.05] rounded-2xl overflow-hidden">
                                            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.04]">
                                                <div className="flex items-center gap-2">
                                                    <span>{section.icon}</span>
                                                    <span className="text-xs font-bold text-white font-mono">{section.label}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-mono" style={{ color: section.accent }}>{sectionCals} kcal</span>
                                                </div>
                                            </div>
                                            <div className="divide-y divide-white/[0.03]">
                                                {sectionLogs.map(log => (
                                                    <div 
                                                        key={log.id} 
                                                        onClick={() => {
                                                            setSelectedMealLog(log);
                                                            onToggleNav?.(false);
                                                        }}
                                                        className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-white/[0.02] transition-colors"
                                                    >
                                                        {log.imageUrl && (
                                                            <img src={log.imageUrl} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0 opacity-80" />
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-[11px] font-bold text-gray-300 truncate">{log.label}</div>
                                                            <div className="text-[9px] font-mono text-gray-600 mt-0.5">
                                                                P:{log.totalProtein}g  C:{log.totalCarbs}g  F:{log.totalFats}g
                                                            </div>
                                                        </div>
                                                        <div className="text-xs font-black font-mono text-white flex-shrink-0">{log.totalCalories}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </motion.div>
                        );
                    })()}
                    
                    {SKILLS_ENABLED && activeTab === 'SKILLS' && (
                        <motion.div 
                            key="skills" 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }}
                        >
                            <SkillsView
                                skillProgress={playerData.skillProgress || []}
                                onUpdateProgress={(p) => onUpdateSkillProgress?.(p)}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>

        {/* ── Custom Plan Builder Fullscreen Overlay ── */}
        {showCustomPlanBuilder && (
            <CustomPlanBuilder
                onClose={() => {
                    setShowCustomPlanBuilder(false);
                    onToggleNav?.(true);
                    fetch(`${API_BASE}/api/workout/custom-plans`, { credentials: 'include' })
                        .then(r => r.ok ? r.json() : [])
                        .then(data => setCustomPlans(Array.isArray(data) ? data : []))
                        .catch(() => {});
                }}
                onStartWorkout={(day) => {
                    setShowCustomPlanBuilder(false);
                    onToggleNav?.(true);
                    fetch(`${API_BASE}/api/workout/custom-plans`, { credentials: 'include' })
                        .then(r => r.ok ? r.json() : [])
                        .then(data => setCustomPlans(Array.isArray(data) ? data : []))
                        .catch(() => {});
                    setActivePlan(day);
                    setViewMode('OVERVIEW');
                }}
            />
        )}

        {/* ── Plan Customizer Fullscreen Overlay ── */}
        {showPlanCustomizer && customizerPlanData && (
            <PlanCustomizer
                planName={customizerPlanData.name}
                days={customizerPlanData.days}
                onClose={() => {
                    setShowPlanCustomizer(false);
                    setCustomizerPlanData(null);
                    onToggleNav?.(true);
                }}
                onSave={(name, days) => {
                    // Save as custom plan
                    const updated = {
                        ...(healthProfile as HealthProfile),
                        workoutPlan: days,
                        selectedPlanName: name + ' (Custom)',
                    } as HealthProfile;
                    onSaveProfile(updated, updated.category || 'Hunter');
                    // Persist to custom-plans API
                    fetch(`${API_BASE}/api/workout/custom-plans`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ name: name + ' (Custom)', days, plan_type: 'MANUAL' }),
                    })
                        .then(r => r.ok ? r.json() : null)
                        .then(saved => {
                            if (saved) {
                                setCustomPlans(prev => {
                                    const merged = [saved, ...prev.filter(p => p.id !== saved.id)];
                                    return merged.slice(0, 10);
                                });
                                // Set the new custom plan as active
                                const u2 = {
                                    ...(healthProfile as HealthProfile),
                                    workoutPlan: days,
                                    selectedPlanId: `custom-${saved.id}`,
                                    selectedPlanName: name + ' (Custom)',
                                } as HealthProfile;
                                onSaveProfile(u2, u2.category || 'Hunter');
                            }
                        })
                        .catch(() => {});
                    setShowPlanCustomizer(false);
                    setCustomizerPlanData(null);
                    onToggleNav?.(true);
                }}
            />
        )}

        {/* ── Plan Switch Loading Overlay ── */}
        <AnimatePresence>
            {planSwitchLoading && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4"
                >
                    <div className="w-8 h-8 border-2 border-system-neon/30 border-t-system-neon rounded-full animate-spin" />
                    <div className="text-xs font-mono text-system-neon/70 tracking-widest uppercase">Switching Protocol...</div>
                </motion.div>
            )}
        </AnimatePresence>

        {/* ── Meal Log Details Modal ── */}
        <AnimatePresence>
            {selectedMealLog && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md pb-20"
                    onClick={() => {
                        setSelectedMealLog(null);
                        onToggleNav?.(true);
                    }}
                >
                    <motion.div
                        initial={{ scale: 0.95, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.95, y: 20 }}
                        className="w-full max-w-sm bg-[#0a0a0a] border border-white/[0.1] rounded-[2rem] overflow-hidden relative shadow-2xl max-h-[90vh] overflow-y-auto"
                        onClick={e => e.stopPropagation()}
                    >
                        {selectedMealLog.imageUrl && (
                            <div className="h-40 w-full relative">
                                <img src={selectedMealLog.imageUrl} alt="" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
                                <button 
                                    onClick={() => {
                                        setSelectedMealLog(null);
                                        onToggleNav?.(true);
                                    }}
                                    className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/80 rounded-full text-white/50 hover:text-white transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        )}
                        <div className={`p-6 ${!selectedMealLog.imageUrl ? 'pt-8' : ''}`}>
                            {!selectedMealLog.imageUrl && (
                                <button 
                                    onClick={() => {
                                        setSelectedMealLog(null);
                                        onToggleNav?.(true);
                                    }}
                                    className="absolute top-4 right-4 p-2 text-white/50 hover:text-white transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            )}
                            <div className="text-[10px] text-[#00d4ff] font-mono tracking-widest uppercase mb-1">
                                {new Date(selectedMealLog.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <h3 className="text-xl font-bold text-white mb-6 leading-tight">{selectedMealLog.label}</h3>

                            <div className="grid grid-cols-4 gap-2 mb-6">
                                <div className="bg-gray-900/50 rounded-xl p-3 text-center border border-white/[0.02]">
                                    <div className="text-[10px] text-gray-500 font-bold mb-1">KCAL</div>
                                    <div className="text-lg font-black text-white">{selectedMealLog.totalCalories}</div>
                                </div>
                                <div className="bg-gray-900/50 rounded-xl p-3 text-center border border-white/[0.02]">
                                    <div className="text-[10px] text-blue-500/70 font-bold mb-1">PRO</div>
                                    <div className="text-sm font-bold text-blue-400">{selectedMealLog.totalProtein}g</div>
                                </div>
                                <div className="bg-gray-900/50 rounded-xl p-3 text-center border border-white/[0.02]">
                                    <div className="text-[10px] text-green-500/70 font-bold mb-1">CARB</div>
                                    <div className="text-sm font-bold text-green-400">{selectedMealLog.totalCarbs}g</div>
                                </div>
                                <div className="bg-gray-900/50 rounded-xl p-3 text-center border border-white/[0.02]">
                                    <div className="text-[10px] text-yellow-500/70 font-bold mb-1">FAT</div>
                                    <div className="text-sm font-bold text-yellow-400">{selectedMealLog.totalFats}g</div>
                                </div>
                            </div>

                            {selectedMealLog.items?.[0] && (
                                <div className="space-y-4">
                                    <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest border-b border-white/[0.05] pb-2">Micronutrients & Details</div>
                                    <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Serving</span>
                                            <span className="text-gray-300">{selectedMealLog.items[0].servingSize || 'N/A'}</span>
                                        </div>
                                        {selectedMealLog.items[0].fiber !== undefined && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Fiber</span>
                                                <span className="text-gray-300">{selectedMealLog.items[0].fiber}g</span>
                                            </div>
                                        )}
                                        {selectedMealLog.items[0].sugar !== undefined && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Sugar</span>
                                                <span className="text-gray-300">{selectedMealLog.items[0].sugar}g</span>
                                            </div>
                                        )}
                                        {selectedMealLog.items[0].sodium !== undefined && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Sodium</span>
                                                <span className="text-gray-300">{selectedMealLog.items[0].sodium}mg</span>
                                            </div>
                                        )}
                                    </div>

                                    {selectedMealLog.items[0].ingredients && selectedMealLog.items[0].ingredients.length > 0 && (
                                        <div className="mt-4">
                                            <div className="text-[10px] text-gray-500 mb-2 font-bold uppercase tracking-widest">Ingredients Detected</div>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedMealLog.items[0].ingredients.map((ing, i) => (
                                                    <span key={i} className="px-2.5 py-1 rounded-full bg-gray-900 border border-white/[0.05] text-[10px] text-gray-400">
                                                        {ing}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <button
                                onClick={() => {
                                    if (window.confirm("Delete this log?")) {
                                        _onDeleteMeal?.(selectedMealLog.id);
                                        setSelectedMealLog(null);
                                        onToggleNav?.(true);
                                    }
                                }}
                                className="w-full mt-6 py-3 rounded-xl border border-red-900/50 text-red-500 hover:bg-red-500/10 font-bold text-xs transition-colors"
                            >
                                DELETE LOG
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>

        {/* Food Library Modal */}
        <AnimatePresence>
            {showFoodLibrary && onLogMeal && (
                <FoodLibrary
                    onClose={() => setShowFoodLibrary(false)}
                    onLogFood={(meal) => { onLogMeal(meal); setShowFoodLibrary(false); }}
                    selectedMealType={selectedMealType}
                />
            )}
        </AnimatePresence>
    </>
  );
};
