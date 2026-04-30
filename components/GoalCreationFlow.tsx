import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Target, AlertTriangle, ChevronRight, CheckCircle, Shield, Calendar, Flame, Brain, TrendingUp, Clock, CalendarOff } from 'lucide-react';
import { Goal, GoalInterviewQuestion, GoalMilestone, PlayerData, Rank } from '../types';
import { playSystemSoundEffect } from '../utils/soundEngine';
import { API_BASE } from '../lib/apiConfig';
import { getPlayerAuthHeaders } from '../lib/playerApi';

const RANK_COLORS: Record<string, string> = {
  E: '#9ca3af', D: '#fb923c', C: '#facc15', B: '#4ade80', A: '#7EB8D4', S: '#9ACDE3',
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

  const MANA_COST = 30;

  // ── Step 1: Analyze Goal ──
  const handleAnalyze = useCallback(async () => {
    if (!goalText.trim() || goalText.trim().length < 5) {
      setError('Describe your goal clearly. Be specific about what you want to achieve.');
      return;
    }

    // Consume mana
    if (onConsumeMana && !onConsumeMana(MANA_COST)) {
      setError(`MANA DEPLETED — Need ${MANA_COST} mana to analyze a goal. Resets at midnight.`);
      return;
    }

    setStep('ANALYZING');
    setError(null);
    playSystemSoundEffect('SYSTEM');

    try {
      const res = await fetch(`${API_BASE}/api/goals/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getPlayerAuthHeaders() },
        credentials: 'include',
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
        if (onRefundMana) onRefundMana(MANA_COST);
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
      if (onRefundMana) onRefundMana(MANA_COST);
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
      const res = await fetch(`${API_BASE}/api/goals/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getPlayerAuthHeaders() },
        credentials: 'include',
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

  // ── Step 3: Accept Mission ──
  const handleAcceptMission = useCallback(() => {
    if (!planData) return;

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
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 pt-5 pb-3" style={{ background: '#0a0a0f' }}>
          <div>
            <h2 className="text-sm font-black text-white uppercase tracking-wider">
              {step === 'INPUT' && 'New Shadow Mission'}
              {step === 'ANALYZING' && 'Analyzing Goal...'}
              {step === 'INTERVIEW' && 'Mission Intel'}
              {step === 'PLANNING' && 'Generating Plan...'}
              {step === 'REVIEW' && 'Mission Briefing'}
              {step === 'ERROR' && 'Mission Rejected'}
            </h2>
            <p className="text-[10px] text-gray-600 font-mono mt-0.5">
              {step === 'INPUT' && 'Define your long-term goal'}
              {step === 'INTERVIEW' && 'Answer to refine your plan'}
              {step === 'REVIEW' && 'Review and accept your mission'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="px-5 pb-6">
          <AnimatePresence mode="wait">
            {/* ── INPUT STEP ── */}
            {step === 'INPUT' && (
              <motion.div key="input" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="mb-4">
                  <label className="block text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-2">
                    What do you want to achieve?
                  </label>
                  <textarea
                    value={goalText}
                    onChange={e => { setGoalText(e.target.value); setError(null); }}
                    placeholder='e.g. "Crack my dream exam" or "Earn ₹1 Lakh/month" or "Get into the best shape of my life"'
                    maxLength={200}
                    rows={3}
                    className="w-full rounded-xl p-3.5 text-white text-sm focus:outline-none transition-all placeholder:text-gray-700 font-mono resize-none"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.3)' }}
                    autoFocus
                  />
                  <div className="flex justify-between mt-1.5 px-0.5">
                    <span className="text-[9px] text-gray-600 font-mono">7 days – 365 days scope</span>
                    <span className="text-[9px] text-gray-700 font-mono">{goalText.length}/200</span>
                  </div>
                </div>

                {/* Rules note */}
                <div className="rounded-xl p-3 mb-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="text-[9px] font-mono text-gray-500 space-y-1">
                    <div className="flex items-center gap-2">
                      <Target className="w-3 h-3 text-[#7EB8D4] flex-shrink-0" />
                      <span>Be specific — "Lose 15kg" not "Lose weight"</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3 h-3 text-[#7EB8D4] flex-shrink-0" />
                      <span>Goals must be achievable within 1 year (365 days)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Shield className="w-3 h-3 text-[#7EB8D4] flex-shrink-0" />
                      <span>AI will calculate realistic timeline for you</span>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="rounded-xl p-3 mb-4 flex items-start gap-2" style={{ background: 'rgba(126,184,212,0.06)', border: '1px solid rgba(126,184,212,0.15)' }}>
                    <AlertTriangle className="w-3.5 h-3.5 text-[#7EB8D4] flex-shrink-0 mt-0.5" />
                    <span className="text-[10px] text-gray-300 font-mono">{error}</span>
                  </div>
                )}

                <button
                  onClick={handleAnalyze}
                  disabled={goalText.trim().length < 5}
                  className={`w-full py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                    goalText.trim().length < 5
                      ? 'bg-white/5 text-gray-600 cursor-not-allowed'
                      : 'text-black'
                  }`}
                  style={goalText.trim().length >= 5 ? { background: 'linear-gradient(135deg, #7EB8D4, #7EB8D4)' } : undefined}
                >
                  Analyze Goal — {MANA_COST} Mana
                </button>
              </motion.div>
            )}

            {/* ── ANALYZING STEP ── */}
            {step === 'ANALYZING' && (
              <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-12">
                <Loader2 className="w-8 h-8 text-[#7EB8D4] animate-spin mb-4" />
                <p className="text-xs text-gray-400 font-mono">ForgeGuard is analyzing your goal...</p>
                <p className="text-[9px] text-gray-600 font-mono mt-1">Using advanced reasoning</p>
              </motion.div>
            )}

            {/* ── INTERVIEW STEP ── */}
            {step === 'INTERVIEW' && (
              <motion.div key="interview" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                {/* Assessment */}
                <div className="rounded-xl p-3 mb-4" style={{ background: 'rgba(34,211,238,0.05)', border: '1px solid rgba(34,211,238,0.12)' }}>
                  <div className="text-[9px] font-mono text-[#7EB8D4] uppercase mb-1">Initial Assessment</div>
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
                <div className="space-y-3 mb-4">
                  {questions.map((q, i) => (
                    <div key={q.id}>
                      <label className="block text-[10px] font-mono text-gray-400 mb-1.5">
                        {i + 1}. {q.question}
                      </label>
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
                    </div>
                  ))}
                </div>

                {error && (
                  <div className="rounded-xl p-3 mb-4 flex items-start gap-2" style={{ background: 'rgba(126,184,212,0.06)', border: '1px solid rgba(126,184,212,0.15)' }}>
                    <AlertTriangle className="w-3.5 h-3.5 text-[#7EB8D4] flex-shrink-0 mt-0.5" />
                    <span className="text-[10px] text-gray-300 font-mono">{error}</span>
                  </div>
                )}

                <button
                  onClick={handleSubmitInterview}
                  className="w-full py-3.5 rounded-xl text-xs font-black uppercase tracking-widest text-black"
                  style={{ background: 'linear-gradient(135deg, #7EB8D4, #7EB8D4)' }}
                >
                  Generate Mission Plan
                </button>
              </motion.div>
            )}

            {/* ── PLANNING STEP ── */}
            {step === 'PLANNING' && (
              <motion.div key="planning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-12">
                <Loader2 className="w-8 h-8 text-[#7EB8D4] animate-spin mb-4" />
                <p className="text-xs text-gray-400 font-mono">Generating your mission plan...</p>
                <p className="text-[9px] text-gray-600 font-mono mt-1">Creating milestones & daily strategy</p>
              </motion.div>
            )}

            {/* ── REVIEW STEP ── */}
            {step === 'REVIEW' && planData && (
              <motion.div key="review" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                {/* Rank + Probability */}
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-black"
                    style={{ background: `${rankColor}15`, border: `1px solid ${rankColor}30`, color: rankColor }}
                  >
                    {planData.goalRank}
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-bold text-white">{goalText}</div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[9px] font-mono" style={{ color: rankColor }}>{planData.goalRank}-Rank Mission</span>
                      <span className="text-[9px] font-mono text-gray-500">{planData.successProbability}% success odds</span>
                    </div>
                  </div>
                </div>

                {/* Key stats */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="rounded-xl p-2.5 text-center" style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <Calendar className="w-3.5 h-3.5 text-[#7EB8D4] mx-auto mb-1" />
                    <div className="text-xs font-bold text-white">{planData.totalDurationDays}d</div>
                    <div className="text-[8px] text-gray-600 font-mono">DURATION</div>
                  </div>
                  <div className="rounded-xl p-2.5 text-center" style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <Clock className="w-3.5 h-3.5 text-[#7EB8D4] mx-auto mb-1" />
                    <div className="text-xs font-bold text-white">{planData.dailyCommitmentMinutes}m</div>
                    <div className="text-[8px] text-gray-600 font-mono">PER DAY</div>
                  </div>
                  <div className="rounded-xl p-2.5 text-center" style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <TrendingUp className="w-3.5 h-3.5 text-[#7EB8D4] mx-auto mb-1" />
                    <div className="text-xs font-bold text-white">{planData.milestones?.length || 0}</div>
                    <div className="text-[8px] text-gray-600 font-mono">PHASES</div>
                  </div>
                </div>

                {/* FIX Loophole 1: Time-budget warning */}
                {(() => {
                  const freeMin = calcFreeMinutes(playerData?.scheduleProfile, existingGoals);
                  const commitMin = planData.dailyCommitmentMinutes || 60;
                  if (freeMin > 0 && commitMin > freeMin) {
                    return (
                      <div className="rounded-xl p-3 mb-3 flex items-start gap-2" style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)' }}>
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="text-[10px] font-bold text-amber-300">Time Budget Warning</div>
                          <p className="text-[9px] text-amber-400/80 font-mono leading-relaxed mt-0.5">
                            This goal needs {commitMin}m/day, but your schedule only has ~{freeMin}m free
                            {existingGoals.filter(g => g.status === 'ACTIVE').length > 0 && ' (after other goals)'}.
                            Some quests may be left unscheduled. Consider adjusting your schedule or goal scope.
                          </p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* AI Reasoning */}
                <div className="rounded-xl p-3 mb-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="text-[9px] font-mono text-[#7EB8D4] uppercase mb-1">AI Assessment</div>
                  <p className="text-[10px] text-gray-300 font-mono leading-relaxed">{planData.reasoning}</p>
                </div>

                {/* Duration reasoning */}
                {planData.smartDurationReasoning && (
                  <div className="rounded-xl p-3 mb-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <div className="text-[9px] font-mono text-amber-400 uppercase mb-1">Timeline Analysis</div>
                    <p className="text-[10px] text-gray-400 font-mono leading-relaxed">{planData.smartDurationReasoning}</p>
                  </div>
                )}

                {/* Milestones preview */}
                <div className="mb-4">
                  <div className="text-[9px] font-mono text-gray-500 uppercase mb-2">Mission Phases</div>
                  <div className="space-y-1.5">
                    {(planData.milestones || []).map((m: GoalMilestone) => (
                      <div
                        key={m.phase}
                        className="rounded-xl p-2.5 flex items-center gap-2.5"
                        style={{ background: 'rgba(255,255,255,0.02)' }}
                      >
                        <div
                          className="w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-black flex-shrink-0"
                          style={{ background: `${rankColor}15`, color: rankColor }}
                        >
                          {m.phase}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[10px] text-white font-medium truncate">{m.title}</div>
                          <div className="text-[9px] text-gray-600 font-mono">Day {m.startDay}–{m.endDay} • {m.targetOutcome}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rest Day Picker */}
                <div className="rounded-xl p-3 mb-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="flex items-center gap-2 mb-2.5">
                    <CalendarOff className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-[9px] font-mono text-gray-400 uppercase tracking-wider">Weekly Rest Day</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
                      const isSelected = restDay === day;
                      return (
                        <button
                          key={day}
                          onClick={() => { setRestDay(day); playSystemSoundEffect('SYSTEM'); }}
                          className="px-2.5 py-1.5 rounded-lg text-[9px] font-black font-mono uppercase tracking-wide transition-all"
                          style={{
                            background: isSelected ? 'rgba(129,140,248,0.15)' : 'rgba(255,255,255,0.02)',
                            border: `1px solid ${isSelected ? 'rgba(129,140,248,0.4)' : 'rgba(255,255,255,0.06)'}`,
                            color: isSelected ? '#a5b4fc' : '#6b7280',
                          }}
                        >
                          {day.slice(0, 3)}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => { setRestDay('NONE'); playSystemSoundEffect('SYSTEM'); }}
                      className="px-2.5 py-1.5 rounded-lg text-[9px] font-black font-mono uppercase tracking-wide transition-all"
                      style={{
                        background: restDay === 'NONE' ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${restDay === 'NONE' ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.06)'}`,
                        color: restDay === 'NONE' ? '#f87171' : '#6b7280',
                      }}
                    >
                      None
                    </button>
                  </div>
                  <p className="text-[8px] text-gray-600 font-mono mt-2">
                    {restDay === 'NONE' ? 'No rest day — quests generated every day.' : `Light/no quests on ${restDay}s.`}
                  </p>
                </div>

                {/* Risk factors */}
                {planData.riskFactors?.length > 0 && (
                  <div className="rounded-xl p-3 mb-4" style={{ background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.1)' }}>
                    <div className="text-[9px] font-mono text-amber-400 uppercase mb-1.5">Risk Factors</div>
                    {planData.riskFactors.map((r: string, i: number) => (
                      <div key={i} className="text-[9px] text-gray-400 font-mono flex items-start gap-1.5 mb-0.5">
                        <span className="text-amber-500">•</span> {r}
                      </div>
                    ))}
                  </div>
                )}

                {/* Accept button */}
                <button
                  onClick={handleAcceptMission}
                  className="w-full py-4 rounded-xl text-xs font-black uppercase tracking-widest"
                  style={{
                    background: 'linear-gradient(135deg, #7EB8D4 0%, #5a9ab5 100%)',
                    color: '#0a0a14',
                    boxShadow: '0 4px 20px rgba(126,184,212,0.35), 0 0 0 1px rgba(126,184,212,0.2)',
                  }}
                >
                  Accept Mission
                </button>
                <p className="text-[9px] text-gray-600 font-mono text-center mt-2">
                  Daily quests will be generated automatically. Goal quests are free (no mana) & give 1.5x XP.
                </p>
              </motion.div>
            )}

            {/* ── ERROR STEP ── */}
            {step === 'ERROR' && (
              <motion.div key="error" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="py-8">
                <div className="flex flex-col items-center text-center mb-6">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ background: 'rgba(126,184,212,0.1)', border: '1px solid rgba(126,184,212,0.2)' }}>
                    <AlertTriangle className="w-5 h-5 text-[#7EB8D4]" />
                  </div>
                  <div className="text-sm font-bold text-white mb-2">Could Not Process Goal</div>
                  <p className="text-[11px] text-gray-400 font-mono leading-relaxed max-w-xs">{error}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setStep('INPUT'); setError(null); handleAnalyze(); }}
                    className="flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95"
                    style={{ background: 'rgba(126,184,212,0.1)', border: '1px solid rgba(126,184,212,0.2)', color: '#7EB8D4' }}
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
