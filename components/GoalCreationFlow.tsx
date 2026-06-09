import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Target, AlertTriangle, ChevronRight, CheckCircle, Shield, Calendar, Flame, Brain, TrendingUp, Clock, CalendarOff } from 'lucide-react';
import { Goal, GoalInterviewQuestion, GoalMilestone, PlayerData, Rank } from '../types';
import { playSystemSoundEffect, triggerHaptic } from '../utils/soundEngine';
import { API_BASE } from '../lib/apiConfig';
import { getPlayerAuthHeaders, authenticatedFetch } from '../lib/playerApi';

const RANK_COLORS: Record<string, string> = {
  E: '#9ca3af', D: '#fb923c', C: '#facc15', B: '#4ade80', A: '#00d4ff', S: '#33dfff',
  UNRANKED: '#6b7280',
};

/** Calculate total free minutes from a schedule profile */
function calcFreeMinutes(profile: any, existingGoals: Goal[]): number {
  if (!profile?.wakeUpTime || !profile?.bedtime) return 0;
  const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  
  const wakeUp = toMin(profile.wakeUpTime);
  const bedtime = toMin(profile.bedtime);
  let totalDay = bedtime - wakeUp;
  if (totalDay <= 0) return 0;

  // Subtract routine
  totalDay -= (profile.morningRoutineMin || 30);
  
  // Subtract school/work
  if (profile.role === 'STUDENT') {
    if (profile.schoolStart && profile.schoolEnd) totalDay -= (toMin(profile.schoolEnd) - toMin(profile.schoolStart));
    if (profile.coachingEnabled && profile.coachingStart && profile.coachingEnd) totalDay -= (toMin(profile.coachingEnd) - toMin(profile.coachingStart));
  } else if (profile.role === 'PROFESSIONAL' && profile.workStart && profile.workEnd) {
    totalDay -= (toMin(profile.workEnd) - toMin(profile.workStart));
  }

  // Subtract dinner + wind-down
  totalDay -= 30; // dinner
  totalDay -= (profile.windDownMinutes || 30);

  // Subtract other goals' commitments
  const otherGoalsMins = existingGoals
    .filter(g => g.status === 'ACTIVE')
    .reduce((sum, g) => sum + (g.dailyCommitmentMin || 0), 0);
  totalDay -= otherGoalsMins;

  return Math.max(0, totalDay);
}

interface GoalCreationFlowProps {
  playerData?: PlayerData;
  existingGoals: Goal[];
  onClose: () => void;
  onGoalCreated: (goal: Goal) => void;
  onConsumeMana?: (amount: number) => boolean;
  onRefundMana?: (amount: number) => void;
}

type Step = 'INPUT' | 'ANALYZING' | 'INTERVIEW' | 'PLANNING' | 'REVIEW' | 'ERROR';

// ═══════════════════════════════════════════════════════════════════════════
//  MODULE-LEVEL GOAL-PLAN STORE (Task 11 add-on)
//
//  Mirrors the pattern used by GoalDetailView for daily-quest generation.
//  When the user picks "Continue in Background" after the interview step,
//  we kick off `startGoalPlanGeneration` which fetches /api/goals/plan
//  independently of the modal lifecycle. App.tsx listens for DONE/ERROR
//  events and patches the placeholder goal in player.goals.
// ═══════════════════════════════════════════════════════════════════════════

export interface GoalPlanStore {
  state: 'IDLE' | 'PLANNING' | 'DONE' | 'ERROR';
  /** ID of the placeholder goal created when the user clicked "Continue in Background". */
  tempGoalId: string | null;
  /** The full plan payload returned from /api/goals/plan once DONE. */
  payload: {
    goalRank?: string;
    successProbability?: number;
    dailyCommitmentMinutes?: number;
    totalDurationDays?: number;
    smartDurationReasoning?: string;
    weeklyRestDay?: string;
    riskFactors?: string[];
    reasoning?: string;
    milestones?: GoalMilestone[];
  } | null;
  error: string | null;
}

const _goalPlanStore: GoalPlanStore = {
  state: 'IDLE',
  tempGoalId: null,
  payload: null,
  error: null,
};

const _goalPlanListeners = new Set<(s: GoalPlanStore) => void>();

export function onGoalPlanStoreUpdate(cb: (s: GoalPlanStore) => void): () => void {
  _goalPlanListeners.add(cb);
  return () => { _goalPlanListeners.delete(cb); };
}

export function getGoalPlanStore(): GoalPlanStore {
  return { ..._goalPlanStore };
}

function updateGoalPlanStore(patch: Partial<GoalPlanStore>) {
  Object.assign(_goalPlanStore, patch);
  const snapshot = { ..._goalPlanStore };
  _goalPlanListeners.forEach(cb => cb(snapshot));
}

/**
 * Kick off background generation of the goal plan. Returns immediately;
 * subscribers via onGoalPlanStoreUpdate receive DONE / ERROR transitions.
 */
export function startGoalPlanGeneration(params: {
  tempGoalId: string;
  goalText: string;
  category: string;
  estimatedDurationDays: number;
  interviewAnswers: Array<{ question: string; answer: any }>;
  playerStats?: any;
  healthProfile?: any;
  otherGoals?: Array<{ title: string; dailyCommitmentMin: number }>;
  timezone?: string;
}): void {
  if (_goalPlanStore.state === 'PLANNING') {
    // Don't fire two in parallel — bail silently.
    return;
  }

  updateGoalPlanStore({
    state: 'PLANNING',
    tempGoalId: params.tempGoalId,
    payload: null,
    error: null,
  });

  authenticatedFetch(`${API_BASE}/api/goals/plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getPlayerAuthHeaders() },
    body: JSON.stringify({
      goalText: params.goalText,
      category: params.category,
      estimatedDurationDays: params.estimatedDurationDays,
      interviewAnswers: params.interviewAnswers,
      playerStats: params.playerStats,
      healthProfile: params.healthProfile,
      otherGoals: params.otherGoals || [],
      timezone: params.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    }),
  })
    .then(async (res) => {
      if (!res.ok) {
        const errData = await res.json().catch(() => ({} as any));
        throw new Error(errData.error || `Plan generation failed (HTTP ${res.status})`);
      }
      const data = await res.json();
      updateGoalPlanStore({ state: 'DONE', payload: data, error: null });
    })
    .catch((err: any) => {
      console.error('[GoalCreation] Background plan failed:', err);
      updateGoalPlanStore({
        state: 'ERROR',
        payload: null,
        error: friendlyError(err?.message || 'Plan generation failed.'),
      });
    });
}



// Sanitize raw server/network errors into user-friendly messages
function friendlyError(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes('fetch') || lower.includes('network') || lower.includes('failed to fetch') || lower.includes('aborted')) {
    return 'Connection lost. Check your internet and try again.';
  }
  if (lower.includes('timeout') || lower.includes('timed out')) {
    return 'Server took too long to respond. Try again in a moment.';
  }
  if (lower.includes('429') || lower.includes('rate limit') || lower.includes('too many')) {
    return 'Too many requests. Wait a moment before trying again.';
  }
  if (lower.includes('500') || lower.includes('internal server')) {
    return 'Server error. Our systems are recovering — try again shortly.';
  }
  if (lower.includes('502') || lower.includes('503') || lower.includes('bad gateway') || lower.includes('unavailable')) {
    return 'Server is temporarily unavailable. Please try again in a few seconds.';
  }
  if (lower.includes('401') || lower.includes('unauthorized') || lower.includes('auth')) {
    return 'Session expired. Please refresh the page and try again.';
  }
  if (lower.includes('json') || lower.includes('parse') || lower.includes('unexpected token')) {
    return 'Received an unexpected response. Try again.';
  }
  // If the message looks like a clean user-facing message (no codes, no stack), pass it through
  if (raw.length < 200 && !raw.includes('Error:') && !raw.includes('at ') && !/\d{3}/.test(raw)) {
    return raw;
  }
  return 'Something went wrong. Please try again.';
}

export default function GoalCreationFlow({
  playerData,
  existingGoals,
  onClose,
  onGoalCreated,
  onConsumeMana,
  onRefundMana,
}: GoalCreationFlowProps) {
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('reforge:hide-nav'));
    return () => {
      window.dispatchEvent(new CustomEvent('reforge:show-nav'));
    };
  }, []);

  const [step, setStep] = useState<Step>('INPUT');
  const [goalText, setGoalText] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Analysis result
  const [category, setCategory] = useState('');
  const [estimatedDays, setEstimatedDays] = useState(0);
  const [initialAssessment, setInitialAssessment] = useState('');
  const [timelineOverride, setTimelineOverride] = useState<string | null>(null);
  const [questions, setQuestions] = useState<GoalInterviewQuestion[]>([]);

  // Plan result
  const [planData, setPlanData] = useState<any>(null);

  // Rest day selection — user can override AI suggestion
  const [restDay, setRestDay] = useState<string>('Sunday');
  const [reviewCard, setReviewCard] = useState(0);

  const CATEGORY_IMAGES: Record<string, string> = {
    FITNESS: '/images/goals/fitness.webp', ACADEMIC: '/images/goals/academic.webp',
    FINANCIAL: '/images/goals/financial.webp', SKILL: '/images/goals/skill.webp',
    CAREER: '/images/goals/career.webp', HEALTH: '/images/goals/health.webp',
    CREATIVE: '/images/goals/creative.webp',
  };

  const KEY_COST = 2; // Server deducts 2 keys for goal analysis

  // ── Step 1: Analyze Goal ──
  const handleAnalyze = useCallback(async () => {
    if (!goalText.trim() || goalText.trim().length < 5) {
      setError('Describe your goal clearly. Be specific about what you want to achieve.');
      return;
    }

    // Check keys balance (server does the actual deduction)
    if ((playerData?.keys ?? 0) < KEY_COST) {
      setError(`KEYS DEPLETED — Need ${KEY_COST} keys to analyze a goal. Complete quests or buy more.`);
      return;
    }

    setStep('ANALYZING');
    setError(null);
    playSystemSoundEffect('SYSTEM');

    try {
      const res = await authenticatedFetch(`${API_BASE}/api/goals/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getPlayerAuthHeaders() },
        body: JSON.stringify({
          goalText: goalText.trim(),
          playerStats: playerData?.stats,
          healthProfile: playerData?.healthProfile,
          activeGoalsCount: existingGoals.filter(g => g.status === 'ACTIVE').length,
          timezone: playerData?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Analysis failed');
      }
      const data = await res.json();

      if (data.isInvalid) {
        setError(data.invalidReason || 'Goal rejected by ForgeGuard.');
        setStep('ERROR');
        playSystemSoundEffect('WARNING');
        return;
      }

      setCategory(data.category);
      setEstimatedDays(data.estimatedDurationDays);
      setInitialAssessment(data.initialAssessment);
      setTimelineOverride(data.timelineOverride);
      setQuestions(data.questions || []);
      setStep('INTERVIEW');
      playSystemSoundEffect('PURCHASE');
    } catch (err: any) {
      console.error('[GoalCreation] Analyze error:', err);
      setError(friendlyError(err?.message || 'ForgeGuard is offline. Try again later.'));
      setStep('ERROR');
    }
  }, [goalText, playerData, existingGoals, onConsumeMana, onRefundMana]);

  // ── Step 2: Submit Interview Answers ──
  const handleSubmitInterview = useCallback(async () => {
    // Validate all questions answered (accept prefilled values as valid answers)
    const unanswered = questions.filter(q => {
      const val = q.answer ?? q.prefilled;
      return val === null || val === undefined || val === '';
    });
    if (unanswered.length > 0) {
      setError('Please answer all questions before proceeding.');
      return;
    }

    setStep('PLANNING');
    setError(null);
    playSystemSoundEffect('SYSTEM');

    try {
      const res = await authenticatedFetch(`${API_BASE}/api/goals/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getPlayerAuthHeaders() },
        body: JSON.stringify({
          goalText: goalText.trim(),
          category,
          estimatedDurationDays: estimatedDays,
          interviewAnswers: questions.map(q => ({ question: q.question, answer: q.answer ?? q.prefilled })),
          playerStats: playerData?.stats,
          healthProfile: playerData?.healthProfile,
          otherGoals: existingGoals.filter(g => g.status === 'ACTIVE').map(g => ({
            title: g.title,
            dailyCommitmentMin: g.dailyCommitmentMin,
          })),
          timezone: playerData?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });

      if (!res.ok) throw new Error('Plan generation failed');
      const data = await res.json();
      setPlanData(data);
      setRestDay(data.weeklyRestDay || 'Sunday');
      setStep('REVIEW');
      playSystemSoundEffect('PURCHASE');
    } catch (err: any) {
      setError('Plan generation failed. Try again.');
      setStep('INTERVIEW');
    }
  }, [questions, goalText, category, estimatedDays, playerData, existingGoals]);

  // ── Step 2-alt: Continue in Background ──
  // Creates a placeholder goal immediately so the card appears in the goals
  // section, kicks off /api/goals/plan in the background, and closes the modal.
  // App.tsx's onGoalPlanStoreUpdate listener patches the placeholder when DONE.
  const handleContinueInBackground = useCallback(() => {
    const unanswered = questions.filter(q => {
      const val = q.answer ?? q.prefilled;
      return val === null || val === undefined || val === '';
    });
    if (unanswered.length > 0) {
      setError('Please answer all questions before proceeding.');
      return;
    }

    // Equipment extraction (fitness goals only) — same logic as handleAcceptMission
    let equipment: 'GYM' | 'HOME_DUMBBELLS' | 'BODYWEIGHT' | undefined;
    if (category === 'FITNESS') {
      const eqQ = questions.find(q =>
        String(q.id) === 'equipment' || /equipment/i.test(q.question || '')
      );
      const ans = String(eqQ?.answer ?? eqQ?.prefilled ?? '').toLowerCase();
      if (ans.includes('gym')) equipment = 'GYM';
      else if (ans.includes('dumbbell') || ans.includes('home')) equipment = 'HOME_DUMBBELLS';
      else equipment = 'BODYWEIGHT';
    }

    const now = Date.now();
    const tempId = `goal-pending-${now}-${Math.random().toString(36).slice(2, 8)}`;

    // Build placeholder goal with the bare minimum so the card can render.
    // estimatedDurationDays is the analyst's first-pass estimate; it'll be
    // refined by /api/goals/plan and merged in by App.tsx when DONE.
    const placeholderGoal: Goal = {
      id: tempId,
      userId: playerData?.userId,
      title: goalText.trim(),
      category: category as any,
      goalRank: 'D' as Rank, // provisional — refined by plan
      successProbability: 0,
      status: 'ACTIVE',
      milestones: [],
      currentMilestone: 0,
      interviewQA: questions,
      dailyCommitmentMin: 0,
      totalDurationDays: estimatedDays || 30,
      smartDurationReasoning: '',
      weeklyRestDay: 'Sunday',
      riskFactors: [],
      reasoning: '',
      startDate: now,
      targetDate: now + (estimatedDays || 30) * 24 * 60 * 60 * 1000,
      streak: 0,
      dailyTasks: [],
      createdAt: now,
      isPlanning: true, // shows the "forging" skeleton card
      ...(equipment ? { equipment } : {}),
    };

    // Inject placeholder + close modal
    onGoalCreated(placeholderGoal);

    // Kick off background generation
    startGoalPlanGeneration({
      tempGoalId: tempId,
      goalText: goalText.trim(),
      category,
      estimatedDurationDays: estimatedDays,
      interviewAnswers: questions.map(q => ({ question: q.question, answer: q.answer ?? q.prefilled })),
      playerStats: playerData?.stats,
      healthProfile: playerData?.healthProfile,
      otherGoals: existingGoals.filter(g => g.status === 'ACTIVE').map(g => ({
        title: g.title,
        dailyCommitmentMin: g.dailyCommitmentMin,
      })),
      timezone: playerData?.timezone,
    });

    playSystemSoundEffect('SYSTEM');
  }, [questions, goalText, category, estimatedDays, playerData, existingGoals, onGoalCreated]);

  // ── Step 3: Accept Mission ──
  const handleAcceptMission = useCallback(() => {
    if (!planData) return;

    // Extract equipment selection from interview (fitness goals only)
    let equipment: 'GYM' | 'HOME_DUMBBELLS' | 'BODYWEIGHT' | undefined;
    if (category === 'FITNESS') {
      const eqQ = questions.find(q =>
        String(q.id) === 'equipment' ||
        /equipment/i.test(q.question || '')
      );
      const ans = String(eqQ?.answer ?? eqQ?.prefilled ?? '').toLowerCase();
      if (ans.includes('gym')) equipment = 'GYM';
      else if (ans.includes('dumbbell') || ans.includes('home')) equipment = 'HOME_DUMBBELLS';
      else equipment = 'BODYWEIGHT';
    }

    const now = Date.now();
    const newGoal: Goal = {
      id: `goal-${now}-${Math.random().toString(36).slice(2, 8)}`,
      userId: playerData?.userId,
      title: goalText.trim(),
      category: category as any,
      goalRank: (planData.goalRank || 'D') as Rank,
      successProbability: planData.successProbability || 50,
      status: 'ACTIVE',
      milestones: planData.milestones || [],
      currentMilestone: 0,
      interviewQA: questions,
      dailyCommitmentMin: planData.dailyCommitmentMinutes || 60,
      totalDurationDays: planData.totalDurationDays || estimatedDays,
      smartDurationReasoning: planData.smartDurationReasoning || '',
      weeklyRestDay: restDay,
      riskFactors: planData.riskFactors || [],
      reasoning: planData.reasoning || '',
      startDate: now,
      targetDate: now + (planData.totalDurationDays || estimatedDays) * 24 * 60 * 60 * 1000,
      streak: 0,
      dailyTasks: [],
      createdAt: now,
      ...(equipment ? { equipment } : {}),
    };

    playSystemSoundEffect('LEVEL_UP');
    onGoalCreated(newGoal);
  }, [planData, goalText, category, estimatedDays, questions, playerData, onGoalCreated, restDay]);

  const rankColor = RANK_COLORS[planData?.goalRank] || RANK_COLORS.D;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.85)' }}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl"
        style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.06)', marginBottom: 80 }}
      >
        {/* Header (hidden for INPUT step — it has its own image hero) */}
        {step !== 'INPUT' && (
          <div className="sticky top-0 z-10 flex items-center justify-between px-5 pt-5 pb-3" style={{ background: '#0a0a0f' }}>
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-wider">
                {step === 'ANALYZING' && 'Analyzing Goal...'}
                {step === 'INTERVIEW' && 'Mission Intel'}
                {step === 'PLANNING' && 'Generating Plan...'}
                {step === 'REVIEW' && 'Mission Briefing'}
                {step === 'ERROR' && 'Mission Rejected'}
              </h2>
              <p className="text-[10px] text-gray-600 font-mono mt-0.5">
                {step === 'INTERVIEW' && 'Answer to refine your plan'}
                {step === 'REVIEW' && 'Review and accept your mission'}
              </p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 transition-colors">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        )}

        <div className={step === 'INPUT' ? '' : 'px-5 pb-6'}>
          <AnimatePresence mode="wait">
            {/* ── INPUT STEP — IMAGE HERO LAYOUT ── */}
            {step === 'INPUT' && (
              <motion.div key="input" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {/* Hero image — top 60% */}
                <div style={{
                  position: 'relative',
                  width: '100%',
                  height: 360,
                  overflow: 'hidden',
                  borderTopLeftRadius: 24,
                  borderTopRightRadius: 24,
                }}>
                  <img
                    src="/onboarding/arrow_target.webp"
                    alt=""
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      objectPosition: 'center 30%',
                      display: 'block',
                    }}
                  />
                  {/* Shadow fade gradient */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(180deg, rgba(10,10,15,0.15) 0%, transparent 35%, rgba(10,10,15,0.6) 75%, #0a0a0f 100%)',
                    pointerEvents: 'none',
                  }} />
                  {/* Floating close button */}
                  <button
                    onClick={onClose}
                    style={{
                      position: 'absolute', top: 14, right: 14,
                      width: 36, height: 36,
                      borderRadius: 12,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'rgba(0,0,0,0.55)',
                      backdropFilter: 'blur(8px)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      cursor: 'pointer',
                    }}
                  >
                    <X size={16} color="#fff" />
                  </button>
                  {/* Title overlay near bottom of hero */}
                  <div style={{
                    position: 'absolute', left: 24, right: 24, bottom: 18,
                    pointerEvents: 'none',
                  }}>
                    <h2 style={{
                      fontFamily: 'Orbitron, system-ui, sans-serif',
                      fontSize: 22, fontWeight: 900,
                      letterSpacing: '0.04em',
                      color: '#fff',
                      margin: 0,
                      textShadow: '0 2px 12px rgba(0,0,0,0.7)',
                    }}>
                      FORGE YOUR MISSION
                    </h2>
                    <p style={{
                      fontSize: 12,
                      color: 'rgba(255,255,255,0.7)',
                      margin: '4px 0 0 0',
                      fontWeight: 500,
                      textShadow: '0 1px 6px rgba(0,0,0,0.7)',
                    }}>
                      What do you want to achieve?
                    </p>
                  </div>
                </div>

                {/* Form content below image */}
                <div style={{ padding: '20px 20px 24px' }}>
                  <textarea
                    value={goalText}
                    onChange={e => { setGoalText(e.target.value); setError(null); }}
                    placeholder='Lose 10 kg • Crack JEE • Earn ₹1L/mo'
                    maxLength={200}
                    rows={2}
                    style={{
                      width: '100%',
                      borderRadius: 14,
                      padding: '14px 16px',
                      color: '#fff',
                      fontSize: 15,
                      fontWeight: 500,
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.3)',
                      outline: 'none',
                      resize: 'none',
                      fontFamily: 'system-ui, sans-serif',
                    }}
                    autoFocus
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6, paddingRight: 4 }}>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>
                      {goalText.length}/200
                    </span>
                  </div>

                  {/* Compact tips */}
                  <div style={{
                    marginTop: 14,
                    borderRadius: 12,
                    padding: 12,
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>
                      <Target size={12} color="#00d4ff" style={{ flexShrink: 0 }} />
                      <span>Be specific — use exact numbers.</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>
                      <Calendar size={12} color="#00d4ff" style={{ flexShrink: 0 }} />
                      <span>Achievable within 365 days.</span>
                    </div>
                  </div>

                  {error && (
                    <div style={{
                      marginTop: 14,
                      borderRadius: 12,
                      padding: 12,
                      background: 'rgba(0,212,255,0.06)',
                      border: '1px solid rgba(0,212,255,0.15)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 8,
                    }}>
                      <AlertTriangle size={14} color="#00d4ff" style={{ flexShrink: 0, marginTop: 2 }} />
                      <span style={{ fontSize: 11, color: '#d1d5db' }}>{error}</span>
                    </div>
                  )}

                  <button
                    onClick={handleAnalyze}
                    disabled={goalText.trim().length < 5}
                    style={{
                      width: '100%',
                      marginTop: 16,
                      padding: '14px 0',
                      borderRadius: 14,
                      fontSize: 13,
                      fontWeight: 900,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      border: 'none',
                      cursor: goalText.trim().length < 5 ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                      background: goalText.trim().length < 5
                        ? 'rgba(255,255,255,0.05)'
                        : 'linear-gradient(135deg, #00d4ff, #0099cc)',
                      color: goalText.trim().length < 5 ? 'rgba(255,255,255,0.3)' : '#000',
                      boxShadow: goalText.trim().length < 5 ? 'none' : '0 4px 20px rgba(0,212,255,0.3)',
                    }}
                  >
                    Analyze — {KEY_COST} Keys
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── ANALYZING STEP ── */}
            {step === 'ANALYZING' && (
              <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-12">
                <Loader2 className="w-8 h-8 text-[#00d4ff] animate-spin mb-4" />
                <p className="text-xs text-gray-400 font-mono">ForgeGuard is analyzing your goal...</p>
                <p className="text-[9px] text-gray-600 font-mono mt-1">Using advanced reasoning</p>
              </motion.div>
            )}

            {/* ── INTERVIEW STEP ── */}
            {step === 'INTERVIEW' && (
              <motion.div key="interview" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                {/* Assessment */}
                <div className="rounded-xl p-3 mb-4" style={{ background: 'rgba(34,211,238,0.05)', border: '1px solid rgba(34,211,238,0.12)' }}>
                  <div className="text-[9px] font-mono text-[#00d4ff] uppercase mb-1">Initial Assessment</div>
                  <p className="text-[11px] text-gray-300 font-mono leading-relaxed">{initialAssessment}</p>
                  {timelineOverride && (
                    <p className="text-[10px] text-amber-400 font-mono mt-2 flex items-start gap-1.5">
                      <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                      {timelineOverride}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-[9px] font-mono text-gray-500">
                    <span>Category: <span className="text-white">{category}</span></span>
                    <span>Est: <span className="text-white">~{estimatedDays} days</span></span>
                  </div>
                </div>

                {/* Questions */}
                <div className="space-y-4 mb-4">
                  {questions.map((q, i) => (
                    <div key={q.id}>
                      <label className="block text-[10px] font-mono text-gray-400 mb-2">
                        {i + 1}. {q.question}
                      </label>

                      {/* MCQ: Tappable option chips */}
                      {q.type === 'mcq' && q.options ? (
                        <div className="flex flex-wrap gap-2">
                          {q.options.map(opt => {
                            const currentVal = q.answer ?? q.prefilled ?? '';
                            const isSelected = String(currentVal) === opt;
                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => {
                                  setQuestions(prev => prev.map(pq => pq.id === q.id ? { ...pq, answer: opt } : pq));
                                  setError(null);
                                  playSystemSoundEffect('SYSTEM');
                                }}
                                className="px-3.5 py-2 rounded-xl text-[11px] font-bold font-mono transition-all active:scale-95"
                                style={{
                                  background: isSelected ? 'rgba(0,212,255,0.15)' : 'rgba(255,255,255,0.03)',
                                  border: `1.5px solid ${isSelected ? 'rgba(0,212,255,0.5)' : 'rgba(255,255,255,0.08)'}`,
                                  color: isSelected ? '#00d4ff' : '#9ca3af',
                                  boxShadow: isSelected ? '0 0 12px rgba(0,212,255,0.1)' : 'none',
                                }}
                              >
                                {isSelected && <span style={{ marginRight: 4 }}>✓</span>}
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        /* Number / Text: Standard input */
                        <input
                          type={q.type === 'number' ? 'number' : 'text'}
                          value={q.answer ?? q.prefilled ?? ''}
                          onChange={e => {
                            const val = q.type === 'number' ? (e.target.value ? Number(e.target.value) : '') : e.target.value;
                            setQuestions(prev => prev.map(pq => pq.id === q.id ? { ...pq, answer: val as any } : pq));
                            setError(null);
                          }}
                          className="w-full rounded-xl p-3 text-white text-sm focus:outline-none font-mono"
                          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
                          placeholder={q.prefilled != null ? String(q.prefilled) : 'Your answer...'}
                        />
                      )}
                    </div>
                  ))}
                </div>

                {error && (
                  <div className="rounded-xl p-3 mb-4 flex items-start gap-2" style={{ background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.15)' }}>
                    <AlertTriangle className="w-3.5 h-3.5 text-[#00d4ff] flex-shrink-0 mt-0.5" />
                    <span className="text-[10px] text-gray-300 font-mono">{error}</span>
                  </div>
                )}

                <button
                  onClick={handleSubmitInterview}
                  className="w-full py-3.5 rounded-xl text-xs font-black uppercase tracking-widest text-black"
                  style={{ background: 'linear-gradient(135deg, #00d4ff, #00d4ff)' }}
                >
                  Generate Mission Plan
                </button>

                {/* ── Continue in Background — fast path for users who don't want to wait ── */}
                <button
                  onClick={handleContinueInBackground}
                  className="w-full mt-2 py-3 rounded-xl text-[11px] font-bold uppercase tracking-widest"
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(0,212,255,0.25)',
                    color: 'rgba(0,212,255,0.85)',
                  }}
                >
                  Continue in Background
                </button>
                <p className="text-[9px] text-gray-600 font-mono text-center mt-1.5 px-3 leading-snug">
                  We'll forge your plan in the background. You'll get a notification when it's ready.
                </p>
              </motion.div>
            )}

            {/* ── PLANNING STEP ── */}
            {step === 'PLANNING' && (
              <motion.div key="planning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-12">
                <Loader2 className="w-8 h-8 text-[#00d4ff] animate-spin mb-4" />
                <p className="text-xs text-gray-400 font-mono">Generating your mission plan...</p>
                <p className="text-[9px] text-gray-600 font-mono mt-1">Creating milestones & daily strategy</p>
              </motion.div>
            )}

            {/* ── REVIEW STEP — Swipeable Cards ── */}
            {step === 'REVIEW' && planData && (() => {
              const totalCards = 3;
              const goToCard = (n: number) => {
                if (n >= 0 && n < totalCards && n !== reviewCard) {
                  setReviewCard(n);
                  triggerHaptic('SWIPE');
                }
              };
              const probColor = planData.successProbability >= 70 ? '#4ade80' : planData.successProbability >= 40 ? '#facc15' : '#f87171';
              const circumference = 2 * Math.PI * 38;
              const probOffset = circumference - (circumference * (planData.successProbability || 0)) / 100;
              const catImage = CATEGORY_IMAGES[category] || CATEGORY_IMAGES.SKILL;

              const handleDragEnd = (_: any, info: { offset: { x: number }; velocity: { x: number } }) => {
                if (info.offset.x < -40 || info.velocity.x < -300) goToCard(reviewCard + 1);
                else if (info.offset.x > 40 || info.velocity.x > 300) goToCard(reviewCard - 1);
              };

              return (
                <motion.div key="review" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  {/* Card label */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono text-[#00d4ff] uppercase tracking-widest">{['Mission Intel','Battle Plan','Deploy'][reviewCard]}</span>
                    <span className="text-[9px] font-mono text-gray-600">{reviewCard + 1}/3</span>
                  </div>
                  {/* Swipeable Card Container */}
                  <motion.div
                    className="relative overflow-hidden rounded-2xl"
                    style={{ height: 'min(380px, calc(100vh - 280px))', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)', touchAction: 'pan-y' }}
                    drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.12} onDragEnd={handleDragEnd}
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      {/* ── CARD 1: Hero ── */}
                      {reviewCard === 0 && (
                        <motion.div key="c0" initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60 }} transition={{ duration: 0.25 }} className="absolute inset-0">
                          {/* Background image */}
                          <img src={catImage} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />
                          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.85) 100%)' }} />

                          {/* Content overlay */}
                          <div className="relative z-10 flex flex-col items-center justify-center h-full px-6 text-center">
                            {/* Rank Badge */}
                            <motion.div
                              initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }}
                              transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.15 }}
                              className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black mb-3"
                              style={{ background: `${rankColor}20`, border: `2px solid ${rankColor}50`, color: rankColor, boxShadow: `0 0 30px ${rankColor}30` }}
                            >
                              {planData.goalRank}
                            </motion.div>
                            <div className="text-sm font-bold text-white mb-1 line-clamp-2">{goalText}</div>
                            <div className="text-[10px] font-mono mb-5" style={{ color: rankColor }}>{planData.goalRank}-Rank Mission • {category}</div>

                            {/* Success Ring */}
                            <div className="relative w-20 h-20 mb-3">
                              <svg viewBox="0 0 88 88" className="w-full h-full -rotate-90">
                                <circle cx="44" cy="44" r="38" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
                                <motion.circle cx="44" cy="44" r="38" fill="none" stroke={probColor} strokeWidth="4" strokeLinecap="round"
                                  strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: probOffset }}
                                  transition={{ duration: 1.2, delay: 0.4, ease: 'easeOut' }}
                                />
                              </svg>
                              <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-lg font-black" style={{ color: probColor }}>{planData.successProbability}%</span>
                                <span className="text-[7px] font-mono text-gray-500 uppercase">Success</span>
                              </div>
                            </div>

                            {/* Stats row */}
                            <div className="flex gap-4">
                              {[
                                { icon: '⏱', val: `${planData.totalDurationDays}d`, label: 'Duration' },
                                { icon: '⚡', val: `${planData.dailyCommitmentMinutes}m`, label: 'Per Day' },
                                { icon: '🎯', val: `${planData.milestones?.length || 0}`, label: 'Phases' },
                              ].map(s => (
                                <div key={s.label} className="text-center">
                                  <div className="text-sm">{s.icon}</div>
                                  <div className="text-[11px] font-bold text-white">{s.val}</div>
                                  <div className="text-[7px] font-mono text-gray-500 uppercase">{s.label}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="relative z-10 text-center pb-3">
                            <span className="text-[8px] font-mono text-gray-600 animate-pulse">Swipe left for battle plan →</span>
                          </div>
                        </motion.div>
                      )}

                      {/* ── CARD 2: Battle Intel — Milestone Timeline ── */}
                      {reviewCard === 1 && (
                        <motion.div key="c1" initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60 }} transition={{ duration: 0.25 }} className="absolute inset-0 p-4 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }} onPointerDownCapture={e => e.stopPropagation()}>
                          <div className="text-[9px] font-mono text-[#00d4ff] uppercase tracking-widest mb-3">Mission Phases</div>

                          {/* Visual Timeline */}
                          <div className="relative pl-5">
                            {/* Vertical line */}
                            <div className="absolute left-[7px] top-1 bottom-1 w-[2px]" style={{ background: `linear-gradient(180deg, ${rankColor}40, ${rankColor}10)` }} />

                            {(planData.milestones || []).map((m: GoalMilestone, i: number) => (
                              <motion.div key={m.phase} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} className="relative mb-4 last:mb-0">
                                {/* Dot */}
                                <div className="absolute -left-5 top-1 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: `${rankColor}20`, border: `2px solid ${rankColor}60` }}>
                                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: rankColor }} />
                                </div>

                                <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] font-bold text-white">Phase {m.phase}: {m.title}</span>
                                    <span className="text-[8px] font-mono px-1.5 py-0.5 rounded" style={{ background: `${rankColor}10`, color: rankColor }}>
                                      Day {m.startDay}–{m.endDay}
                                    </span>
                                  </div>
                                  <div className="text-[9px] text-gray-400 font-mono leading-relaxed">{m.targetOutcome}</div>
                                </div>
                              </motion.div>
                            ))}
                          </div>

                          {/* Time-budget warning (compact) */}
                          {(() => {
                            const freeMin = calcFreeMinutes(playerData?.scheduleProfile, existingGoals);
                            const commitMin = planData.dailyCommitmentMinutes || 60;
                            if (freeMin > 0 && commitMin > freeMin) {
                              return (
                                <div className="rounded-xl p-2.5 mt-3 flex items-center gap-2" style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.12)' }}>
                                  <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0" />
                                  <span className="text-[9px] text-amber-400 font-mono">Needs {commitMin}m/day but only ~{freeMin}m free</span>
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </motion.div>
                      )}

                      {/* ── CARD 3: Deploy — Rest Day + Accept ── */}
                      {reviewCard === 2 && (
                        <motion.div key="c2" initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60 }} transition={{ duration: 0.25 }} className="absolute inset-0 p-4 flex flex-col" onPointerDownCapture={e => e.stopPropagation()}>
                          <div className="text-[9px] font-mono text-[#00d4ff] uppercase tracking-widest mb-3">Deploy Mission</div>

                          {/* AI one-liner */}
                          {planData.reasoning && (
                            <div className="rounded-xl p-3 mb-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                              <p className="text-[10px] text-gray-300 font-mono leading-relaxed line-clamp-3">{planData.reasoning}</p>
                            </div>
                          )}

                          {/* Rest Day Picker */}
                          <div className="mb-3">
                            <div className="flex items-center gap-2 mb-2">
                              <CalendarOff className="w-3 h-3 text-indigo-400" />
                              <span className="text-[9px] font-mono text-gray-400 uppercase">Weekly Rest Day</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => {
                                const full = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'][i];
                                const isSel = restDay === full;
                                return (
                                  <button key={d} onClick={() => { setRestDay(full); triggerHaptic('CLICK'); }}
                                    className="px-2 py-1.5 rounded-lg text-[9px] font-black font-mono uppercase"
                                    style={{ background: isSel ? 'rgba(129,140,248,0.15)' : 'rgba(255,255,255,0.03)', border: `1px solid ${isSel ? 'rgba(129,140,248,0.4)' : 'rgba(255,255,255,0.06)'}`, color: isSel ? '#a5b4fc' : '#6b7280' }}
                                  >{d}</button>
                                );
                              })}
                              <button onClick={() => { setRestDay('NONE'); triggerHaptic('CLICK'); }}
                                className="px-2 py-1.5 rounded-lg text-[9px] font-black font-mono uppercase"
                                style={{ background: restDay === 'NONE' ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.03)', border: `1px solid ${restDay === 'NONE' ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.06)'}`, color: restDay === 'NONE' ? '#f87171' : '#6b7280' }}
                              >None</button>
                            </div>
                          </div>

                          {/* Risk factors as compact pills */}
                          {planData.riskFactors?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-3">
                              {planData.riskFactors.slice(0, 3).map((r: string, i: number) => (
                                <span key={i} className="px-2 py-1 rounded-lg text-[8px] font-mono text-amber-400" style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.1)' }}>
                                  ⚠ {r.length > 40 ? r.slice(0, 40) + '…' : r}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Accept button */}
                          <div className="mt-auto">
                            <button onClick={handleAcceptMission} className="w-full py-4 rounded-xl text-xs font-black uppercase tracking-widest"
                              style={{ background: 'linear-gradient(135deg, #00d4ff 0%, #5a9ab5 100%)', color: '#0a0a14', boxShadow: '0 4px 20px rgba(0,212,255,0.35)' }}
                            >Accept Mission</button>
                            <p className="text-[8px] text-gray-600 font-mono text-center mt-1.5">Goal quests are free & give 1.5x XP</p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>

                  {/* Navigation */}
                  <div className="flex items-center justify-between mt-3 px-1">
                    <button onClick={() => goToCard(reviewCard - 1)} disabled={reviewCard === 0}
                      className="text-[10px] font-mono font-bold px-3 py-1.5 rounded-lg active:scale-95 transition-all"
                      style={{ opacity: reviewCard === 0 ? 0.25 : 1, color: '#00d4ff', background: reviewCard === 0 ? 'transparent' : 'rgba(0,212,255,0.06)' }}
                    >← Back</button>
                    <div className="flex gap-2 items-center">
                      {[0, 1, 2].map(i => (
                        <button key={i} onClick={() => goToCard(i)}
                          className="rounded-full transition-all duration-200"
                          style={{ width: reviewCard === i ? 16 : 6, height: 6, background: reviewCard === i ? '#00d4ff' : 'rgba(255,255,255,0.15)' }}
                        />
                      ))}
                    </div>
                    <button onClick={() => goToCard(reviewCard + 1)} disabled={reviewCard === totalCards - 1}
                      className="text-[10px] font-mono font-bold px-3 py-1.5 rounded-lg active:scale-95 transition-all"
                      style={{ opacity: reviewCard === totalCards - 1 ? 0.25 : 1, color: '#00d4ff', background: reviewCard === totalCards - 1 ? 'transparent' : 'rgba(0,212,255,0.06)' }}
                    >Next →</button>
                  </div>
                </motion.div>
              );
            })()}

            {/* ── ERROR STEP ── */}
            {step === 'ERROR' && (
              <motion.div key="error" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="py-8">
                <div className="flex flex-col items-center text-center mb-6">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)' }}>
                    <AlertTriangle className="w-5 h-5 text-[#00d4ff]" />
                  </div>
                  <div className="text-sm font-bold text-white mb-2">Could Not Process Goal</div>
                  <p className="text-[11px] text-gray-400 font-mono leading-relaxed max-w-xs">{error}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setStep('INPUT'); setError(null); handleAnalyze(); }}
                    className="flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95"
                    style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)', color: '#00d4ff' }}
                  >
                    ↻ Retry
                  </button>
                  <button
                    onClick={() => { setStep('INPUT'); setError(null); }}
                    className="flex-1 py-3 rounded-xl text-xs font-bold text-gray-400 uppercase tracking-wider transition-all active:scale-95"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    Try Different Goal
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
