import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Target, Trophy, Sparkles, Loader2, Swords, Zap, Crown, Shield, ShieldAlert, Clock, Camera, Youtube, Play, Dumbbell, Flame, ChevronLeft, ChevronRight } from 'lucide-react';
import { Goal, GoalDailyTask, PlayerData, Quest, Rank } from '../types';
import GoalCard from './GoalCard';
import GoalCreationFlow from './GoalCreationFlow';
import GoalDetailView from './GoalDetailView';
import { showSystemToast } from './SystemToast';
import { playSystemSoundEffect } from '../utils/soundEngine';
import { API_BASE } from '../lib/apiConfig';
import { getPlayerAuthHeaders, authenticatedFetch } from '../lib/playerApi';
import { buildDungeonGoalQuest, buildDungeonGoalDailyTask } from '../lib/dungeonGoalQuest';
import FocusShieldSettings from './FocusShieldSettings';

const HowItWorksScreen = React.lazy(() => import('./HowItWorksScreen'));

// ── Helpers ──
function todayStr(): string { return new Date().toISOString().split('T')[0]; }

function addMins(time: string, mins: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

// ── Category → Image mapping for goal cards ──
const GOAL_CATEGORY_IMAGES: Record<string, string> = {
  FITNESS: '/dungeon/running.jpeg',
  ACADEMIC: '/goals/education.png',
  FINANCIAL: '/goals/finance.png',
  CAREER: '/goals/career.png',
  HEALTH: '/goals/health.png',
  CREATIVE: '/goals/mindset.png',
  SKILL: '/goals/education.png',
  DEFAULT: '/goals/hero_goal.jpeg',
};

function getGoalImage(goal: Goal): string {
  if (goal.coverImage) return goal.coverImage;
  return GOAL_CATEGORY_IMAGES[goal.category] || GOAL_CATEGORY_IMAGES.DEFAULT;
}

const TILT_PATTERNS = [
  { rotation: 'rotate(-4deg)', yOffset: 'translateY(4px)' },
  { rotation: 'rotate(3deg)', yOffset: 'translateY(-4px)' },
  { rotation: 'rotate(-3deg)', yOffset: 'translateY(2px)' },
];

const RANK_ACCENT: Record<string, string> = {
  S: '#facc15', A: '#00d4ff', B: '#22c55e', C: '#a78bfa', D: '#9ca3af', E: '#6b7280',
};

interface ShadowMissionsProUpsellProps {
  onUpgradePro?: () => void;
}

function ShadowMissionsProUpsell({ onUpgradePro }: ShadowMissionsProUpsellProps) {
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  return (
    <div className="space-y-3 max-w-sm mx-auto mt-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full rounded-2xl overflow-hidden"
        style={{
          background: '#0a0a14',
          border: '1px solid rgba(0,212,255,0.15)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
        }}
      >
        {/* Background image */}
        <div className="relative w-full" style={{ height: 200 }}>
          <GoalHeroImg />
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(180deg, rgba(10,10,20,0.15) 0%, rgba(10,10,20,0.5) 30%, rgba(10,10,20,0.85) 55%, #0a0a14 78%)',
          }} />
        </div>

        {/* Content overlay */}
        <div className="absolute bottom-0 left-0 right-0" style={{ padding: '0 22px 20px' }}>
          <h2 className="text-xl font-black text-white leading-none mb-1.5"
            style={{ textShadow: '0 4px 20px rgba(0,0,0,0.8)' }}>
            Create Custom Goals
          </h2>
          <p className="text-[10px] text-gray-400 leading-relaxed mb-3 max-w-[280px]">
            AI generates daily quests, tracks milestones, and keeps you on track — automatically.
          </p>

          <motion.button
            onClick={() => {
              playSystemSoundEffect('SELECT');
              onUpgradePro?.();
            }}
            whileTap={{ scale: 0.96 }}
            className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl font-bold text-sm tracking-wide transition-all"
            style={{
              background: 'linear-gradient(135deg, #facc15 0%, #f59e0b 100%)',
              color: '#0a0a14',
              boxShadow: '0 4px 24px rgba(250,204,21,0.3), 0 0 0 1px rgba(250,204,21,0.2)',
            }}
          >
            <Zap size={16} />
            Unlock AI Autopilot
          </motion.button>

          {/* How It Works button */}
          <button
            onClick={() => {
              playSystemSoundEffect('SELECT');
              setShowHowItWorks(true);
            }}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg font-mono text-[10px] font-bold tracking-[0.15em] uppercase transition-all"
            style={{
              background: 'rgba(0,212,255,0.06)',
              border: '1px solid rgba(0,212,255,0.12)',
              color: 'rgba(0,212,255,0.5)',
              cursor: 'pointer',
              marginTop: 10,
            }}
          >
            <Sparkles size={12} />
            How It Works
          </button>
        </div>
      </motion.div>

      {/* How It Works full-screen */}
      <AnimatePresence>
        {showHowItWorks && (
          <React.Suspense fallback={null}>
            <HowItWorksScreen
              onClose={() => setShowHowItWorks(false)}
              onClaimTrial={() => {
                setShowHowItWorks(false);
                onUpgradePro?.();
              }}
            />
          </React.Suspense>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/* PRO SHOWCASE PAGE — unified preview for non-premium users */
/* ═══════════════════════════════════════════════════════════ */
interface ShowcaseGoalCardProps {
  title: string;
  progress: number;
  streak: number;
  coverImage: string;
  rankColor: string;
  rotation: string;
  yOffset: string;
  onTap?: () => void;
}

function ShowcaseGoalCard({ title, progress, streak, coverImage, rankColor, rotation, yOffset, onTap }: ShowcaseGoalCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <motion.div
      whileTap={{ scale: 0.96 }}
      onClick={onTap}
      className="relative rounded-xl overflow-hidden cursor-pointer flex-shrink-0 flex flex-col justify-between p-3"
      style={{
        width: 130,
        height: 110,
        background: '#0c0c16',
        border: `1px solid ${rankColor}33`,
        transform: `${rotation} ${yOffset}`,
        boxShadow: '0 8px 20px rgba(0,0,0,0.5)',
      }}
    >
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img
          src={coverImage}
          alt=""
          className="w-full h-full object-cover transition-opacity duration-500"
          style={{ opacity: imgLoaded ? 0.35 : 0, filter: 'saturate(0.6) brightness(0.7)' }}
          onLoad={() => setImgLoaded(true)}
        />
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(180deg, rgba(8,8,18,0.2) 0%, rgba(6,6,14,0.85) 100%)',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-between h-full w-full">
        {/* Title */}
        <h4 className="text-[10px] font-bold text-gray-100 leading-snug line-clamp-2">
          {title}
        </h4>

        {/* Bottom part: Progress + Streak */}
        <div className="space-y-1.5 mt-auto">
          {/* Progress bar */}
          <div>
            <div className="flex justify-between items-center text-[7px] font-mono text-gray-400 mb-0.5">
              <span>PROGRESS</span>
              <span>{progress}%</span>
            </div>
            <div className="h-0.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  background: `linear-gradient(90deg, ${rankColor}88, ${rankColor})`,
                  width: `${progress}%`,
                }}
              />
            </div>
          </div>

          {/* Streak */}
          {streak > 0 && (
            <div className="flex items-center gap-0.5 text-[8px] font-mono font-bold" style={{ color: '#fb923c' }}>
              <Flame className="w-2.5 h-2.5" />
              <span>{streak}d</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/* PRO SHOWCASE PAGE — unified preview for non-premium users */
/* ═══════════════════════════════════════════════════════════ */

// Fully featured mock goals so that GoalDetailView loads them without issue
export const MOCK_PINNED_GOAL: Goal = {
  id: 'mock-pinned-goal',
  title: 'Daily Dungeon: Sung Jin-Woo Protocol',
  category: 'FITNESS',
  goalRank: 'A',
  successProbability: 85,
  status: 'ACTIVE',
  milestones: [
    {
      phase: 1,
      title: 'Dungeon Entry & Conditioning',
      description: 'Acclimate to daily workouts.',
      startDay: 1,
      endDay: 10,
      targetOutcome: 'Complete 30 reps per set',
      sampleDailyPattern: ['Morning condition check', 'Pushups set of 30', '10km run'],
      connectionToNext: 'Phase 2: Shadow extraction prep',
    },
    {
      phase: 2,
      title: 'Shadow Extraction Preparation',
      description: 'Increase fatigue resistance and endurance.',
      startDay: 11,
      endDay: 20,
      targetOutcome: 'Complete 50 reps per set',
      sampleDailyPattern: [],
      connectionToNext: '',
    }
  ],
  currentMilestone: 1,
  interviewQA: [
    { id: 1, question: 'What is your primary fitness focus?', type: 'mcq', answer: 'Strength & Stamina', options: ['Weight Loss', 'Strength & Stamina', 'Endurance'] },
    { id: 2, question: 'What equipment do you have access to?', type: 'mcq', answer: 'Bodyweight', options: ['Gym', 'Dumbbells', 'Bodyweight'] }
  ],
  dailyCommitmentMin: 45,
  totalDurationDays: 30,
  smartDurationReasoning: 'AI determined 30 days is the optimal calibration time to establish base stats.',
  weeklyRestDay: 'NONE',
  riskFactors: ['Fatigue accumulation', 'High intensity workouts without proper rest'],
  reasoning: 'Forging S-rank physical conditioning requires strict discipline and automated daily quests.',
  startDate: Date.now() - 3 * 24 * 60 * 60 * 1000,
  targetDate: Date.now() + 27 * 24 * 60 * 60 * 1000,
  streak: 4,
  dailyTasks: [
    {
      id: 'dt-mock-pinned-today',
      goalId: 'mock-pinned-goal',
      date: new Date().toISOString().split('T')[0],
      dayNumber: 4,
      quests: [
        { id: 'mq1', title: 'Conditioning Check: Push-ups', estimatedDuration: 15, categories: ['strength'], rank: 'A', xp: 75, reasoning: 'Build chest and core strength.', completed: false },
        { id: 'mq2', title: 'Conditioning Check: Squats', estimatedDuration: 15, categories: ['strength'], rank: 'B', xp: 50, reasoning: 'Strengthen leg muscles.', completed: true }
      ],
      completedCount: 1,
      totalCount: 2,
      dailyNote: 'Dungeon gate active. Prepare to test chest and legs.',
      progressUpdate: 'You are gaining steady strength.',
      createdAt: Date.now(),
    }
  ],
  createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
  isSystemGoal: true,
  coverImage: '/dungeon/running.jpeg',
};

export const MOCK_ACADEMIC_GOAL: Goal = {
  id: 'mock-academic-goal',
  title: 'Master Full-Stack Engineering',
  category: 'ACADEMIC',
  goalRank: 'B',
  successProbability: 92,
  status: 'ACTIVE',
  milestones: [
    {
      phase: 1,
      title: 'System Design Foundations',
      description: 'Study system architecture and scaling.',
      startDay: 1,
      endDay: 15,
      targetOutcome: 'Design 3 microservices',
      sampleDailyPattern: ['Study system design book', 'Draw design diagrams'],
      connectionToNext: 'Phase 2: Database architecture',
    }
  ],
  currentMilestone: 1,
  interviewQA: [
    { id: 1, question: 'What is your learning goal?', type: 'text', answer: 'Master backend scalability and frontend system architecture' }
  ],
  dailyCommitmentMin: 60,
  totalDurationDays: 60,
  smartDurationReasoning: '60 days allows deep learning of advanced patterns plus hands-on implementation.',
  weeklyRestDay: 'SUNDAY',
  riskFactors: ['Topic complexity overload', 'Lack of practical design execution'],
  reasoning: 'Software engineering scaling requires structured system design templates and daily practice.',
  startDate: Date.now() - 5 * 24 * 60 * 60 * 1000,
  targetDate: Date.now() + 55 * 24 * 60 * 60 * 1000,
  streak: 5,
  dailyTasks: [
    {
      id: 'dt-mock-academic-today',
      goalId: 'mock-academic-goal',
      date: new Date().toISOString().split('T')[0],
      dayNumber: 6,
      quests: [
        { id: 'maq1', title: 'Study Load Balancing Patterns', estimatedDuration: 30, categories: ['intelligence'], rank: 'B', xp: 60, reasoning: 'Understand how traffic is distributed.', completed: false },
        { id: 'maq2', title: 'Draft High Availability Diagram', estimatedDuration: 30, categories: ['intelligence'], rank: 'B', xp: 65, reasoning: 'Practice system design.', completed: false }
      ],
      completedCount: 0,
      totalCount: 2,
      dailyNote: 'Focus on horizontal scaling and database replication today.',
      progressUpdate: 'Consistent progress on architectures.',
      createdAt: Date.now(),
    }
  ],
  createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
  coverImage: '/goals/hero-dart.webp',
};

export const MOCK_FINANCIAL_GOAL: Goal = {
  id: 'mock-financial-goal',
  title: 'Monarch Gold Grind Plan',
  category: 'FINANCIAL',
  goalRank: 'S',
  successProbability: 98,
  status: 'ACTIVE',
  milestones: [
    {
      phase: 1,
      title: 'Passive Income Streams',
      description: 'Set up side projects and monetization.',
      startDay: 1,
      endDay: 30,
      targetOutcome: 'Earn 1000 gold equivalent daily',
      sampleDailyPattern: ['Build digital assets', 'Write sales copies'],
      connectionToNext: 'Phase 2: Capital deployment',
    }
  ],
  currentMilestone: 1,
  interviewQA: [
    { id: 1, question: 'What is your target income source?', type: 'mcq', answer: 'SaaS products', options: ['SaaS products', 'Trading', 'Content creation'] }
  ],
  dailyCommitmentMin: 30,
  totalDurationDays: 90,
  smartDurationReasoning: '90 days allows building, launching, and scaling digital products to steady revenue.',
  weeklyRestDay: 'NONE',
  riskFactors: ['High market competition', 'Burnout from solo building'],
  reasoning: 'Monarch wealth requires steady cash flow extraction and passive income asset construction.',
  startDate: Date.now() - 14 * 24 * 60 * 60 * 1000,
  targetDate: Date.now() + 76 * 24 * 60 * 60 * 1000,
  streak: 12,
  dailyTasks: [
    {
      id: 'dt-mock-financial-today',
      goalId: 'mock-financial-goal',
      date: new Date().toISOString().split('T')[0],
      dayNumber: 15,
      quests: [
        { id: 'mfq1', title: 'Write Landing Page copy', estimatedDuration: 20, categories: ['social'], rank: 'S', xp: 120, reasoning: 'Craft high-converting hooks.', completed: true }
      ],
      completedCount: 1,
      totalCount: 1,
      dailyNote: 'Your marketing assets are scaling up. Keep copy crisp.',
      progressUpdate: 'You have hit 15 days of consistent output.',
      createdAt: Date.now(),
    }
  ],
  createdAt: Date.now() - 14 * 24 * 60 * 60 * 1000,
  coverImage: '/onboarding/forge_breaker.webp',
};

/* ═══════════════════════════════════════════════════════════ */
/* ProGoalCard — compact tilted card for real active goals    */
/* ═══════════════════════════════════════════════════════════ */
function ProGoalCard({ goal, index, onTap }: { goal: Goal; index: number; onTap: (g: Goal) => void }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const tilt = TILT_PATTERNS[index % TILT_PATTERNS.length];
  const image = getGoalImage(goal);
  const rankColor = RANK_ACCENT[goal.goalRank] || '#00d4ff';

  const today = new Date().toISOString().split('T')[0];
  const todayTask = goal.dailyTasks?.find(t => t.date === today);
  const progress = todayTask && todayTask.totalCount > 0
    ? Math.round((todayTask.completedCount / todayTask.totalCount) * 100)
    : 0;

  return (
    <motion.div
      whileTap={{ scale: 0.96 }}
      onClick={() => { playSystemSoundEffect('SELECT'); onTap(goal); }}
      className="relative rounded-xl overflow-hidden cursor-pointer flex-shrink-0 flex flex-col justify-between p-3"
      style={{
        width: 130,
        height: 120,
        background: '#0c0c16',
        border: `1px solid ${rankColor}33`,
        transform: `${tilt.rotation} ${tilt.yOffset}`,
        boxShadow: '0 8px 20px rgba(0,0,0,0.5)',
      }}
    >
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img
          src={image}
          alt=""
          className="w-full h-full object-cover transition-opacity duration-500"
          style={{ opacity: imgLoaded ? 0.35 : 0, filter: 'saturate(0.6) brightness(0.7)' }}
          onLoad={() => setImgLoaded(true)}
        />
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(180deg, rgba(8,8,18,0.2) 0%, rgba(6,6,14,0.85) 100%)' }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-between h-full w-full">
        <div className="flex items-center justify-between">
          <span className="text-[7px] font-mono font-black px-1.5 py-0.5 rounded"
            style={{ background: `${rankColor}20`, color: rankColor, border: `1px solid ${rankColor}40` }}>
            {goal.goalRank}-RANK
          </span>
        </div>

        <h4 className="text-[10px] font-bold text-gray-100 leading-snug line-clamp-2 mt-1">
          {goal.title}
        </h4>

        <div className="space-y-1.5 mt-auto">
          <div>
            <div className="flex justify-between items-center text-[7px] font-mono text-gray-400 mb-0.5">
              <span>PROGRESS</span>
              <span>{progress}%</span>
            </div>
            <div className="h-0.5 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full"
                style={{ background: `linear-gradient(90deg, ${rankColor}88, ${rankColor})`, width: `${progress}%` }}
              />
            </div>
          </div>
          {goal.streak > 0 && (
            <div className="flex items-center gap-0.5 text-[8px] font-mono font-bold" style={{ color: '#fb923c' }}>
              <Flame className="w-2.5 h-2.5" />
              <span>{goal.streak}d</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function ProShowcasePage({
  onUpgradePro,
  setSelectedGoal,
  showcaseGoals,
}: {
  onUpgradePro?: () => void;
  setSelectedGoal: (goal: Goal) => void;
  showcaseGoals: Goal[];
}) {
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  const mockPinnedGoal = showcaseGoals.find(g => g.id === 'mock-pinned-goal') || MOCK_PINNED_GOAL;
  const mockAcademicGoal = showcaseGoals.find(g => g.id === 'mock-academic-goal') || MOCK_ACADEMIC_GOAL;
  const mockFinancialGoal = showcaseGoals.find(g => g.id === 'mock-financial-goal') || MOCK_FINANCIAL_GOAL;

  const todayStrVal = new Date().toISOString().split('T')[0];
  const getMockProgress = (g: Goal) => {
    const todayTask = g.dailyTasks?.find(t => t.date === todayStrVal);
    if (!todayTask || todayTask.totalCount === 0) return 0;
    return Math.round((todayTask.completedCount / todayTask.totalCount) * 100);
  };

  return (
    <div className="space-y-6 pb-10">



      {/* ═══ SECTION 1: AI GOALS ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="pt-6"
      >
        {/* Section label */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(180deg, #facc15, #f59e0b)' }} />
          <span className="text-[9px] font-mono font-black tracking-[0.3em] uppercase" style={{ color: '#facc15' }}>
            AI GOAL SYSTEM
          </span>
        </div>

        {/* Goals hero card */}
        <div
          className="relative w-full rounded-2xl overflow-hidden"
          style={{
            background: '#0a0a14',
            border: '1px solid rgba(250,204,21,0.12)',
            boxShadow: '0 16px 48px rgba(0,0,0,0.6), 0 0 40px rgba(250,204,21,0.04)',
          }}
        >
          <div className="relative w-full" style={{ height: 200 }}>
            <GoalHeroImg />
            <div className="absolute inset-0" style={{
              background: 'linear-gradient(180deg, rgba(10,10,20,0.15) 0%, rgba(10,10,20,0.5) 30%, rgba(10,10,20,0.85) 55%, #0a0a14 78%)',
            }} />
          </div>
          <div className="absolute bottom-0 left-0 right-0" style={{ padding: '0 22px 20px' }}>
            <h2 className="text-xl font-black text-white leading-none mb-1.5"
              style={{ textShadow: '0 4px 20px rgba(0,0,0,0.8)' }}>
              AI-Powered Goals
            </h2>
            <p className="text-[10px] text-gray-400 leading-relaxed mb-3 max-w-[280px]">
              Set any goal — fitness, career, study, habits. AI generates daily quests, tracks milestones, and keeps you accountable.
            </p>
            <motion.button
              onClick={() => { playSystemSoundEffect('SELECT'); onUpgradePro?.(); }}
              whileTap={{ scale: 0.96 }}
              className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl font-bold text-sm tracking-wide"
              style={{
                background: 'linear-gradient(135deg, #facc15 0%, #f59e0b 100%)',
                color: '#0a0a14',
                boxShadow: '0 4px 24px rgba(250,204,21,0.3)',
              }}
            >
              <Zap size={16} />
              Unlock AI Autopilot
            </motion.button>
            
            {/* How It Works button */}
            <button
              onClick={() => {
                playSystemSoundEffect('SELECT');
                setShowHowItWorks(true);
              }}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg font-mono text-[10px] font-bold tracking-[0.15em] uppercase transition-all"
              style={{
                background: 'rgba(0,212,255,0.06)',
                border: '1px solid rgba(0,212,255,0.12)',
                color: 'rgba(0,212,255,0.5)',
                cursor: 'pointer',
                marginTop: 10,
              }}
            >
              <Sparkles size={12} />
              How It Works
            </button>
          </div>
        </div>
      </motion.div>

      {/* ═══ ACTIVE GOALS SECTION (side-by-side tilted row) ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <div className="flex items-center gap-2 px-5 mb-2 mt-4">
          <div className="w-1 h-4 rounded-full" style={{ background: 'linear-gradient(180deg, #facc15, #f59e0b)' }} />
          <span className="text-[9px] font-mono font-black tracking-[0.3em] uppercase" style={{ color: '#facc15' }}>
            ACTIVE GOALS
          </span>
        </div>

        <div
          className="no-scrollbar"
          style={{
            display: 'flex',
            gap: '14px',
            overflowX: 'auto',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            paddingLeft: '20px',
            paddingRight: '20px',
            paddingBottom: '24px',
            paddingTop: '16px',
            WebkitOverflowScrolling: 'touch',
            alignItems: 'center',
          }}
        >
          <style>{`
            .no-scrollbar::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22, duration: 0.4 }}
          >
            <ShowcaseGoalCard
              title="Sung Jin-Woo Protocol"
              progress={getMockProgress(mockPinnedGoal)}
              streak={mockPinnedGoal.status === 'ABANDONED' ? 0 : mockPinnedGoal.streak}
              coverImage="/dungeon/running.jpeg"
              rankColor="#00d4ff"
              rotation="rotate(-4deg)"
              yOffset="translateY(4px)"
              onTap={() => {
                if (mockPinnedGoal.status === 'ABANDONED') {
                  showSystemToast({
                    type: 'WARNING',
                    title: 'Mission Abandoned',
                    subtitle: 'This dummy goal was abandoned. You can still inspect it.',
                    durationMs: 3000
                  });
                }
                playSystemSoundEffect('SELECT');
                setSelectedGoal(mockPinnedGoal);
              }}
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.26, duration: 0.4 }}
          >
            <ShowcaseGoalCard
              title="Master Full-Stack Eng."
              progress={getMockProgress(mockAcademicGoal)}
              streak={mockAcademicGoal.status === 'ABANDONED' ? 0 : mockAcademicGoal.streak}
              coverImage="/goals/hero-dart.webp"
              rankColor="#facc15"
              rotation="rotate(3deg)"
              yOffset="translateY(-4px)"
              onTap={() => {
                if (mockAcademicGoal.status === 'ABANDONED') {
                  showSystemToast({
                    type: 'WARNING',
                    title: 'Mission Abandoned',
                    subtitle: 'This dummy goal was abandoned. You can still inspect it.',
                    durationMs: 3000
                  });
                }
                playSystemSoundEffect('SELECT');
                setSelectedGoal(mockAcademicGoal);
              }}
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <ShowcaseGoalCard
              title="Monarch Gold Grind"
              progress={getMockProgress(mockFinancialGoal)}
              streak={mockFinancialGoal.status === 'ABANDONED' ? 0 : mockFinancialGoal.streak}
              coverImage="/onboarding/forge_breaker.webp"
              rankColor="#33dfff"
              rotation="rotate(-3deg)"
              yOffset="translateY(2px)"
              onTap={() => {
                if (mockFinancialGoal.status === 'ABANDONED') {
                  showSystemToast({
                    type: 'WARNING',
                    title: 'Mission Abandoned',
                    subtitle: 'This dummy goal was abandoned. You can still inspect it.',
                    durationMs: 3000
                  });
                }
                playSystemSoundEffect('SELECT');
                setSelectedGoal(mockFinancialGoal);
              }}
            />
          </motion.div>
        </div>
      </motion.div>

      {/* ═══ DIVIDER ═══ */}
      <div className="flex items-center gap-3 px-2">
        <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }} />
        <Sparkles size={10} className="text-gray-700" />
        <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }} />
      </div>

      {/* ═══ SECTION 2: FOCUS SHIELD ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        {/* Section label */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(180deg, #00d4ff, #0088aa)' }} />
          <span className="text-[9px] font-mono font-black tracking-[0.3em] uppercase" style={{ color: '#00d4ff' }}>
            FOCUS SHIELD
          </span>
        </div>

        {/* Master Switch Card */}
        <div
          className="rounded-2xl p-5 mb-5 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(0,212,255,0.05) 0%, rgba(0,100,180,0.03) 100%)',
            border: '1px solid rgba(0,212,255,0.12)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3), 0 0 60px rgba(0,212,255,0.03)',
          }}
        >
          {/* Background glow */}
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(0,212,255,0.06) 0%, transparent 70%)' }} />

          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-4">
              <motion.div
                animate={{ boxShadow: ['0 0 15px rgba(0,212,255,0.2)', '0 0 25px rgba(0,212,255,0.4)', '0 0 15px rgba(0,212,255,0.2)'] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)' }}
              >
                <Shield className="w-6 h-6 text-[#00d4ff]" />
              </motion.div>
              <div>
                <div className="text-[15px] font-black text-white">Focus Shield</div>
                <div className="text-[9px] text-gray-500 font-mono tracking-wider">BLOCK DISTRACTING APPS</div>
              </div>
            </div>
            {/* Decorative ON toggle */}
            <div className="w-[56px] h-8 rounded-full p-0.5 flex items-center justify-end"
              style={{
                background: 'rgba(0,40,60,0.6)',
                border: '1px solid rgba(0,212,255,0.3)',
                boxShadow: '0 0 12px rgba(0,212,255,0.15), inset 0 0 8px rgba(0,212,255,0.05)',
              }}>
              <motion.div
                animate={{ boxShadow: ['0 0 6px rgba(0,212,255,0.6)', '0 0 12px rgba(0,212,255,0.9)', '0 0 6px rgba(0,212,255,0.6)'] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-6 h-6 rounded-full flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #00d4ff, #0099cc)' }}
              >
                <span className="text-black text-[10px] font-black">✓</span>
              </motion.div>
            </div>
          </div>
        </div>

        {/* HOW IT WORKS — Step-by-step */}
        <div className="rounded-2xl overflow-hidden mb-5"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
            <span className="text-[9px] font-mono font-bold tracking-[0.2em] uppercase text-gray-500">
              HOW IT WORKS
            </span>
          </div>
          <div className="p-4 space-y-5">
            {[
              {
                step: '01', icon: Clock, color: '#facc15',
                bg: 'rgba(250,204,21,0.08)', border: 'rgba(250,204,21,0.15)',
                title: 'Set Daily App Limits',
                desc: 'Choose which apps to restrict and set daily screen time limits for each one.',
              },
              {
                step: '02', icon: ShieldAlert, color: '#f87171',
                bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.15)',
                title: 'Shield Activates on Limit',
                desc: 'When you hit your limit, the app is blocked with a full-screen lockdown overlay.',
              },
              {
                step: '03', icon: Dumbbell, color: '#4ade80',
                bg: 'rgba(74,222,128,0.08)', border: 'rgba(74,222,128,0.15)',
                title: 'Exercise to Unlock',
                desc: 'Complete push-ups verified by your camera to earn temporary access. Real discipline.',
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 + i * 0.1 }}
                className="flex items-start gap-3"
              >
                <div className="relative flex flex-col items-center">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: item.bg, border: `1px solid ${item.border}` }}>
                    <item.icon className="w-4 h-4" style={{ color: item.color }} />
                  </div>
                  {i < 2 && (
                    <div className="w-px h-5 mt-1" style={{ background: `${item.color}25` }} />
                  )}
                </div>
                <div className="pt-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[8px] font-mono font-bold" style={{ color: `${item.color}80` }}>
                      STEP {item.step}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-white mb-0.5">{item.title}</div>
                  <div className="text-[10px] text-gray-500 leading-relaxed">{item.desc}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* APP LOCK PREVIEW LIST */}
        <div className="rounded-2xl overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="px-4 py-3 border-b flex items-center justify-between"
            style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
            <span className="text-[9px] font-mono font-bold tracking-[0.2em] uppercase text-gray-500">
              APPS YOU CAN BLOCK
            </span>
            <span className="text-[8px] font-mono text-gray-600">PREVIEW</span>
          </div>
          <div>
            {[
              { name: 'Instagram', AppIcon: Camera, limit: '30 min/day' },
              { name: 'YouTube', AppIcon: Youtube, limit: '45 min/day' },
              { name: 'TikTok', AppIcon: Play, limit: '20 min/day' },
              { name: 'Facebook', AppIcon: Crown, limit: '30 min/day' },
              { name: 'Twitter / X', AppIcon: Target, limit: '30 min/day' },
            ].map((app, i) => (
              <div key={app.name}
                className="flex items-center gap-3 px-4 py-3"
                style={{ borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                   style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <app.AppIcon className="w-4 h-4 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-semibold text-white">{app.name}</div>
                  <div className="text-[9px] text-gray-600 font-mono">{app.limit}</div>
                </div>
                {/* Decorative toggle */}
                <div className="w-[44px] h-[24px] rounded-full p-[2px] flex items-center justify-end"
                  style={{ background: 'rgba(0,30,40,0.5)', border: '1px solid rgba(0,212,255,0.2)' }}>
                  <div className="w-[20px] h-[20px] rounded-full"
                    style={{ background: '#00d4ff', boxShadow: '0 0 6px rgba(0,212,255,0.5)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ═══ BOTTOM CTA ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="pt-2"
      >
        <motion.button
          onClick={() => { playSystemSoundEffect('SELECT'); onUpgradePro?.(); }}
          whileTap={{ scale: 0.97 }}
          className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl font-black text-[14px] tracking-wide"
          style={{
            background: 'linear-gradient(135deg, #facc15 0%, #f59e0b 100%)',
            color: '#0a0a14',
            boxShadow: '0 6px 30px rgba(250,204,21,0.25), 0 0 60px rgba(250,204,21,0.06)',
          }}
        >
          <Crown size={18} />
          Unlock All Pro Features
        </motion.button>
        <p className="text-center text-[8px] text-gray-600 font-mono mt-2">
          14-DAY FREE TRIAL • CANCEL ANYTIME
        </p>
      </motion.div>

      {/* How It Works Modal overlay */}
      <AnimatePresence>
        {showHowItWorks && (
          <React.Suspense fallback={null}>
            <HowItWorksScreen
              onClose={() => setShowHowItWorks(false)}
              onClaimTrial={() => {
                setShowHowItWorks(false);
                onUpgradePro?.();
              }}
            />
          </React.Suspense>
        )}
      </AnimatePresence>
    </div>
  );
}

interface GoalsViewProps {
  goals: Goal[];
  playerData?: PlayerData;
  onUpdateGoals: (goals: Goal[]) => void;
  onDeleteGoal?: (goalId: string) => void;
  onConsumeMana?: (amount: number) => boolean;
  onRefundMana?: (amount: number) => void;
  onDeductGold?: (amount: number) => void;
  onAddQuestToFeed?: (quest: Quest) => void;
  onUpdateScheduleSlots?: (slots: any[]) => void;
  isPremium?: boolean;
  onUpgradePro?: () => void;
  goalCreateTrigger?: number;
}

export default function GoalsView({
  goals,
  playerData,
  onUpdateGoals,
  onDeleteGoal,
  onConsumeMana,
  onRefundMana,
  onDeductGold,
  onAddQuestToFeed,
  onUpdateScheduleSlots,
  isPremium = false,
  onUpgradePro,
  goalCreateTrigger = 0,
}: GoalsViewProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [subTab, setSubTab] = useState<'SHADOW_MISSIONS' | 'FOCUS_SHIELD'>('SHADOW_MISSIONS');

  // Showcase goals state to support fully functional interaction & persistence
  const [showcaseGoals, setShowcaseGoals] = useState<Goal[]>(() => [
    MOCK_PINNED_GOAL,
    MOCK_ACADEMIC_GOAL,
    MOCK_FINANCIAL_GOAL
  ]);

  // Listen to top header + button trigger from App.tsx
  useEffect(() => {
    if (goalCreateTrigger > 0) {
      setShowCreate(true);
    }
  }, [goalCreateTrigger]);

  // ── Manual generation state (replaces auto-gen) ──
  const [forgeState, setForgeState] = useState<'IDLE' | 'GENERATING' | 'DONE'>('IDLE');
  const [forgeProgress, setForgeProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const forgeRef = useRef(false);
  const [showAllGoals, setShowAllGoals] = useState(false);

  // System goals always appear first
  const activeGoals = goals
    .filter(g => g.status === 'ACTIVE' || g.status === 'PAUSED')
    .sort((a, b) => (b.isSystemGoal ? 1 : 0) - (a.isSystemGoal ? 1 : 0));
  const completedGoals = goals.filter(g => g.status === 'COMPLETED');

  // Non-system active goals (for quest generation)
  const forgeableGoals = React.useMemo(
    () => activeGoals.filter(g => !g.isSystemGoal),
    [activeGoals]
  );

  // Today's quests from all active goals (persisted in goal.dailyTasks)
  const todayGoalQuests = React.useMemo(() => {
    const today = todayStr();
    return forgeableGoals.flatMap(g => {
      const task = g.dailyTasks?.find(t => t.date === today);
      if (!task || !task.quests?.length) return [];
      return task.quests.map(q => ({ ...q, _goalTitle: g.title, _goalId: g.id }));
    });
  }, [forgeableGoals]);

  // Check if all forgeable goals already have today's quests
  const allForgedToday = React.useMemo(() => {
    if (forgeableGoals.length === 0) return true;
    const today = todayStr();
    return forgeableGoals.every(g =>
      g.dailyTasks?.some(t => t.date === today && t.quests?.length > 0)
    );
  }, [forgeableGoals]);

  // ── Manual quest generation handler ──
  const handleForgeGoalQuests = useCallback(async () => {
    if (forgeRef.current || forgeableGoals.length === 0) return;

    const today = todayStr();
    const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });

    // Only forge goals that don't have today's quests yet
    const goalsToForge = forgeableGoals.filter(g => {
      const hasTodayTasks = g.dailyTasks?.some(t => t.date === today && t.quests?.length > 0);
      if (hasTodayTasks) return false;
      if (g.weeklyRestDay && g.weeklyRestDay !== 'NONE' && g.weeklyRestDay.toLowerCase() === dayOfWeek.toLowerCase()) return false;
      return true;
    });

    if (goalsToForge.length === 0) {
      showSystemToast({ type: 'INFO', title: 'Already forged', subtitle: "Today's quests are ready.", durationMs: 3000 });
      return;
    }

    const authHeaders = getPlayerAuthHeaders();
    if (!authHeaders || !authHeaders['Authorization']) {
      showSystemToast({ type: 'WARNING', title: 'Not signed in', subtitle: 'Sign in to forge quests.', durationMs: 3000 });
      return;
    }

    forgeRef.current = true;
    setForgeState('GENERATING');
    setForgeProgress({ current: 0, total: goalsToForge.length });
    playSystemSoundEffect('SYSTEM');

    let updatedGoals = [...goals];
    let allNewQuests: Quest[] = [];
    let allScheduleSlots: any[] = [];
    let successCount = 0;

    for (let i = 0; i < goalsToForge.length; i++) {
      const goal = goalsToForge[i];
      setForgeProgress({ current: i + 1, total: goalsToForge.length });

      try {
        const goalStartTime = goal.startDate || goal.createdAt || Date.now();
        const currentDay = Math.max(1, Math.floor((Date.now() - goalStartTime) / (1000 * 60 * 60 * 24)) + 1);

        // FITNESS goals: synthesize dungeon-linked quest (no AI call)
        if (goal.category === 'FITNESS' as any) {
          const currentTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
          const dungeonQuest = buildDungeonGoalQuest({ goal, todayStr: today, currentTime });
          const newDailyTask = buildDungeonGoalDailyTask({ goal, todayStr: today, dayNumber: currentDay, currentTime });
          const updatedGoal: Goal = {
            ...goal,
            dailyTasks: [...(goal.dailyTasks || []).filter(t => t.date !== today), newDailyTask],
          };
          updatedGoals = updatedGoals.map(g => g.id === goal.id ? updatedGoal : g);
          allNewQuests = [...allNewQuests, dungeonQuest];
          if (dungeonQuest.scheduledTime) {
            allScheduleSlots = [...allScheduleSlots, {
              id: `sched-quest-${dungeonQuest.id}`,
              startTime: dungeonQuest.scheduledTime,
              endTime: addMins(dungeonQuest.scheduledTime, dungeonQuest.estimatedDuration || 30),
              type: 'WORKOUT' as const,
              label: dungeonQuest.title,
              questId: dungeonQuest.id,
              goalId: goal.id,
              status: 'PENDING' as const,
              isFlexible: true,
              isCarryOver: false,
              notifyEnabled: true,
            }];
          }
          successCount++;
          continue;
        }

        // Non-fitness goals: call AI endpoint
        const otherGoalTasksToday = goals
          .filter(g => g.id !== goal.id && g.status === 'ACTIVE')
          .flatMap(g => g.dailyTasks?.find(t => t.date === today)?.quests || [])
          .map(q => q.title)
          .join(', ');

        const otherGoalsMinutes = goals
          .filter(g => g.id !== goal.id && g.status === 'ACTIVE')
          .reduce((sum, g) => sum + (g.dailyCommitmentMin || 0), 0);

        const remainingMinutes = Math.max(30, (playerData?.healthProfile?.sessionDuration ?? 120) - otherGoalsMinutes);
        const recentTasks = (goal.dailyTasks || []).slice(-7);

        const res = await authenticatedFetch(`${API_BASE}/api/goals/daily-quests`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getPlayerAuthHeaders() },
          body: JSON.stringify({
            goal, recentTasks,
            playerStats: playerData?.stats,
            otherGoalTasksToday: otherGoalTasksToday || 'None',
            remainingMinutes, dayOfWeek,
            userCountry: playerData?.country || 'India',
            userLanguage: 'English',
            scheduleProfile: playerData?.scheduleProfile || null,
            currentTime: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }),
          }),
        });

        if (!res.ok) { console.error(`[Forge] Goal "${goal.title}" failed`); continue; }
        const data = await res.json();

        const newDailyTask: GoalDailyTask = {
          id: `dt-${goal.id}-${today}`, goalId: goal.id, date: today,
          dayNumber: currentDay, quests: data.quests || [],
          completedCount: 0, totalCount: (data.quests || []).length,
          dailyNote: data.dailyNote || '', progressUpdate: data.progressUpdate || '',
          createdAt: Date.now(),
        };

        const updatedGoal: Goal = {
          ...goal,
          dailyTasks: [...(goal.dailyTasks || []).filter(t => t.date !== today), newDailyTask],
        };
        updatedGoals = updatedGoals.map(g => g.id === goal.id ? updatedGoal : g);

        const feedQuests: Quest[] = (data.quests || []).map((gq: any, idx: number) => ({
          id: gq.id || `goal-quest-${goal.id}-${Date.now()}-${idx}`,
          title: gq.title, description: gq.reasoning || `Goal quest for: ${goal.title}`,
          rank: (gq.rank || 'D') as Rank, priority: 'MEDIUM' as any,
          category: (gq.categories?.[0] || 'intelligence') as any,
          categories: gq.categories,
          xpReward: Math.round((gq.xp || 50) * 1.5),
          isCompleted: false, createdAt: Date.now(), isDaily: true,
          estimatedDuration: gq.estimatedDuration, aiReasoning: gq.reasoning,
          goalId: goal.id, goalTitle: goal.title,
          goalQuestResources: gq.resources || [],
          goalQuestSteps: gq.stepByStep || [],
          connectionToPrevious: gq.connectionToPrevious,
          scheduledTime: gq.scheduledTime || undefined,
        }));
        allNewQuests = [...allNewQuests, ...feedQuests];

        const schedSlots = feedQuests.filter(q => q.scheduledTime).map(q => ({
          id: `sched-quest-${q.id}`, startTime: q.scheduledTime!,
          endTime: addMins(q.scheduledTime!, q.estimatedDuration || 20),
          type: 'QUEST' as const, label: q.title, questId: q.id, goalId: goal.id,
          status: 'PENDING' as const, isFlexible: true, isCarryOver: false, notifyEnabled: true,
        }));
        allScheduleSlots = [...allScheduleSlots, ...schedSlots];
        successCount++;
      } catch (err) {
        console.error(`[Forge] Goal "${goal.title}" error:`, err);
      }
    }

    if (successCount > 0) {
      onUpdateGoals(updatedGoals);
      allNewQuests.forEach(q => onAddQuestToFeed?.(q));
      if (allScheduleSlots.length > 0) onUpdateScheduleSlots?.(allScheduleSlots);
      playSystemSoundEffect('PURCHASE');
      showSystemToast({
        type: 'QUEST_FORGED',
        title: successCount === 1 ? `Today's quests forged!` : `${successCount} goals — quests forged!`,
        subtitle: `${allNewQuests.length} quests ready for today`,
        durationMs: 4500,
      });
    }

    setForgeState('DONE');
    forgeRef.current = false;
  }, [goals, forgeableGoals, playerData, onUpdateGoals, onAddQuestToFeed, onUpdateScheduleSlots]);

  const handleGoalCreated = useCallback((newGoal: Goal) => {
    onUpdateGoals([...goals, newGoal]);
    setShowCreate(false);
  }, [goals, onUpdateGoals]);

  const handleUpdateGoal = useCallback((updatedGoal: Goal) => {
    if (updatedGoal.id.startsWith('mock-')) {
      setShowcaseGoals(prev => prev.map(g => g.id === updatedGoal.id ? updatedGoal : g));
    } else {
      onUpdateGoals(goals.map(g => g.id === updatedGoal.id ? updatedGoal : g));
    }
    setSelectedGoal(updatedGoal);
  }, [goals, onUpdateGoals]);

  const handleDeleteGoal = useCallback((goalId: string) => {
    if (goalId.startsWith('mock-')) {
      setShowcaseGoals(prev => prev.map(g => g.id === goalId ? { ...g, status: 'ABANDONED' as const } : g));
      setSelectedGoal(null);
    } else {
      const updated = goals.map(g => g.id === goalId ? { ...g, status: 'ABANDONED' as const } : g);
      onUpdateGoals(updated);
      setSelectedGoal(null);
      if (onDeleteGoal) onDeleteGoal(goalId);
      if (onDeductGold) onDeductGold(50);
    }
  }, [goals, onUpdateGoals, onDeleteGoal, onDeductGold]);

  // If a goal detail is selected, show that
  if (selectedGoal) {
    const liveGoal = selectedGoal.id.startsWith('mock-')
      ? (showcaseGoals.find(g => g.id === selectedGoal.id) || selectedGoal)
      : (goals.find(g => g.id === selectedGoal.id) || selectedGoal);
    return (
      <GoalDetailView
        goal={liveGoal}
        playerData={playerData}
        allGoals={goals}
        onBack={() => setSelectedGoal(null)}
        onUpdateGoal={handleUpdateGoal}
        onDeleteGoal={handleDeleteGoal}
        onAddQuestToFeed={onAddQuestToFeed}
        onUpdateScheduleSlots={onUpdateScheduleSlots}
      />
    );
  }

  // Non-premium users: unified showcase page (no tabs)
  if (!isPremium) {
    return (
      <div className="min-h-[60vh] pb-4">
        <ProShowcasePage 
          onUpgradePro={onUpgradePro} 
          setSelectedGoal={setSelectedGoal} 
          showcaseGoals={showcaseGoals}
        />
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] pb-4">
      {/* Premium PRO Tab Header Bar */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex p-1 bg-gray-950/80 border border-gray-800/80 rounded-xl mb-6 relative overflow-hidden max-w-sm mx-auto"
      >
        <button
          onClick={() => { playSystemSoundEffect('TAB_SWITCH'); setSubTab('SHADOW_MISSIONS'); }}
          className={`flex-1 text-center py-2 text-[10px] font-bold font-mono tracking-wider transition-colors relative z-10 ${
            subTab === 'SHADOW_MISSIONS' ? 'text-black' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          {subTab === 'SHADOW_MISSIONS' && (
            <motion.div
              layoutId="active-pro-tab"
              className="absolute inset-0 bg-system-neon rounded-lg -z-10 shadow-[0_0_15px_#00d4ff]"
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            />
          )}
          GOALS
        </button>
        <button
          onClick={() => {
            playSystemSoundEffect('TAB_SWITCH');
            setSubTab('FOCUS_SHIELD');
          }}
          className={`flex-1 text-center py-2 text-[10px] font-bold font-mono tracking-wider transition-colors relative z-10 flex items-center justify-center gap-1.5 ${
            subTab === 'FOCUS_SHIELD' ? 'text-black' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          {subTab === 'FOCUS_SHIELD' && (
            <motion.div
              layoutId="active-pro-tab"
              className="absolute inset-0 bg-system-neon rounded-lg -z-10 shadow-[0_0_15px_#00d4ff]"
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            />
          )}
          FOCUS SHIELD
        </button>
      </motion.div>

      {subTab === 'FOCUS_SHIELD' ? (
        <FocusShieldSettings playerData={playerData} isPremium={isPremium} onUpgradePro={onUpgradePro} />
      ) : (
        <>
          {/* ═══ HORIZONTAL TILTED GOAL CARDS (max 3) ═══ */}
          {activeGoals.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* Section label */}
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-4 rounded-full" style={{ background: 'linear-gradient(180deg, #facc15, #f59e0b)' }} />
                <span className="text-[9px] font-mono font-black tracking-[0.3em] uppercase" style={{ color: '#facc15' }}>
                  ACTIVE GOALS
                </span>
                <span className="text-[8px] font-mono text-gray-600 ml-auto">
                  {activeGoals.length} goal{activeGoals.length > 1 ? 's' : ''}
                </span>
              </div>

              {/* Tilted card row */}
              <div
                className="no-scrollbar"
                style={{
                  display: 'flex',
                  gap: '14px',
                  overflowX: 'auto',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  paddingLeft: '20px',
                  paddingRight: '20px',
                  paddingBottom: '24px',
                  paddingTop: '16px',
                  WebkitOverflowScrolling: 'touch',
                  alignItems: 'center',
                }}
              >
                <style>{`.no-scrollbar::-webkit-scrollbar { display: none; }`}</style>
                {activeGoals.slice(0, 3).map((goal, idx) => (
                  <motion.div
                    key={goal.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + idx * 0.06, duration: 0.4 }}
                  >
                    <ProGoalCard
                      goal={goal}
                      index={idx}
                      onTap={(g) => setSelectedGoal(g)}
                    />
                  </motion.div>
                ))}
              </div>

              {/* View More button (if >3 goals) */}
              {activeGoals.length > 3 && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  onClick={() => { playSystemSoundEffect('SELECT'); setShowAllGoals(true); }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-mono font-bold uppercase tracking-widest transition-all"
                  style={{
                    background: 'rgba(250,204,21,0.04)',
                    border: '1px solid rgba(250,204,21,0.12)',
                    color: 'rgba(250,204,21,0.7)',
                    marginTop: '-8px',
                    marginBottom: '12px',
                  }}
                >
                  View All {activeGoals.length} Goals
                  <ChevronRight size={12} />
                </motion.button>
              )}
            </motion.div>
          )}

          {/* ═══ FORGE GOAL QUESTS BUTTON ═══ */}
          {forgeableGoals.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.4 }}
              className="mb-5"
            >
              <motion.button
                onClick={handleForgeGoalQuests}
                disabled={forgeState === 'GENERATING' || allForgedToday}
                whileTap={{ scale: forgeState === 'GENERATING' ? 1 : 0.97 }}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-black text-sm tracking-wide transition-all relative overflow-hidden"
                style={{
                  background: allForgedToday
                    ? 'rgba(255,255,255,0.03)'
                    : 'linear-gradient(135deg, #facc15 0%, #f59e0b 100%)',
                  color: allForgedToday ? 'rgba(255,255,255,0.3)' : '#0a0a14',
                  boxShadow: allForgedToday
                    ? 'none'
                    : '0 4px 24px rgba(250,204,21,0.3), 0 0 0 1px rgba(250,204,21,0.2)',
                  border: allForgedToday ? '1px solid rgba(255,255,255,0.06)' : 'none',
                  cursor: allForgedToday ? 'default' : 'pointer',
                }}
              >
                {/* Scanning line animation during generation */}
                {forgeState === 'GENERATING' && (
                  <motion.div
                    className="absolute top-0 left-0 right-0 h-[2px]"
                    style={{ background: 'linear-gradient(90deg, transparent, #facc15, transparent)' }}
                    animate={{ x: ['-100%', '100%'] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                  />
                )}

                {forgeState === 'GENERATING' ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span className="font-mono text-xs">
                      FORGING... {forgeProgress.current}/{forgeProgress.total}
                    </span>
                  </>
                ) : allForgedToday ? (
                  <>
                    <Swords size={16} />
                    <span className="font-mono text-xs">TODAY'S QUESTS READY</span>
                  </>
                ) : (
                  <>
                    <Swords size={16} />
                    FORGE GOAL QUESTS
                  </>
                )}
              </motion.button>
            </motion.div>
          )}

          {/* ═══ GENERATED GOAL QUESTS DISPLAY ═══ */}
          {todayGoalQuests.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="mb-6"
            >
              {/* Section header */}
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-4 rounded-full" style={{ background: 'linear-gradient(180deg, #00d4ff, #0088aa)' }} />
                <span className="text-[9px] font-mono font-black tracking-[0.3em] uppercase" style={{ color: '#00d4ff' }}>
                  GOAL QUESTS
                </span>
                <span className="text-[8px] font-mono text-gray-600 ml-auto">
                  {todayGoalQuests.filter(q => q.completed).length}/{todayGoalQuests.length} DONE
                </span>
              </div>

              {/* Quest list */}
              <div className="space-y-2">
                {todayGoalQuests.map((quest, idx) => {
                  const qColor = RANK_ACCENT[quest.rank] || '#9ca3af';
                  return (
                    <motion.div
                      key={quest.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 * idx, duration: 0.3 }}
                      className="rounded-xl p-3 flex items-start gap-3"
                      style={{
                        background: quest.completed ? 'rgba(34,197,94,0.04)' : 'rgba(255,255,255,0.02)',
                        border: quest.completed ? '1px solid rgba(34,197,94,0.15)' : '1px solid rgba(255,255,255,0.05)',
                        opacity: quest.completed ? 0.6 : 1,
                      }}
                    >
                      {/* Rank badge */}
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-[10px] font-black font-mono"
                        style={{ background: `${qColor}15`, border: `1px solid ${qColor}30`, color: qColor }}
                      >
                        {quest.rank}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className={`text-[11px] font-bold leading-snug line-clamp-2 ${quest.completed ? 'text-gray-500 line-through' : 'text-white'}`}>
                          {quest.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-[8px] font-mono text-gray-500 whitespace-nowrap">
                            {quest.estimatedDuration}min
                          </span>
                          <span
                            className="text-[8px] font-mono px-1.5 py-0.5 rounded whitespace-nowrap overflow-hidden text-ellipsis max-w-[100px]"
                            style={{
                              background: 'rgba(250,204,21,0.08)',
                              color: 'rgba(250,204,21,0.6)',
                              border: '1px solid rgba(250,204,21,0.15)',
                            }}
                          >
                            {(quest as any)._goalTitle}
                          </span>
                          {quest.scheduledTime && (
                            <span className="text-[8px] font-mono text-gray-600 tabular-nums whitespace-nowrap ml-auto flex-shrink-0">
                              {quest.scheduledTime}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* XP */}
                      <div className="flex items-center gap-0.5 flex-shrink-0 pt-0.5">
                        <span className="text-[10px] font-black font-mono" style={{ color: '#00d4ff' }}>+{quest.xp}</span>
                        <span className="text-[7px] font-mono text-gray-600">XP</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Empty State */}
          {activeGoals.length === 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center justify-center py-16 px-6"
            >
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(34,211,238,0.06)' }}>
                <Target className="w-7 h-7 text-[#00d4ff]" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">No Active Goals</h3>
              <p className="text-[10px] text-gray-500 font-mono text-center mb-5 max-w-[240px]">
                Set a long-term goal and AI will create a daily action plan to help you achieve it.
              </p>
              <button
                onClick={() => {
                  if (!isPremium) {
                    playSystemSoundEffect('DEBUFF_CAST');
                    showSystemToast({
                      type: 'WARNING',
                      title: 'Premium Required',
                      subtitle: 'Custom goals are a Reforge Pro feature.',
                      durationMs: 4000
                    });
                    onUpgradePro?.();
                    return;
                  }
                  setShowCreate(true);
                }}
                className="px-6 py-3 rounded-xl text-xs font-black text-black uppercase tracking-wider"
                style={{ background: 'linear-gradient(135deg, #00d4ff, #00d4ff)' }}
              >
                Create Goal
              </button>
            </motion.div>
          )}

          {/* Completed Goals */}
          {completedGoals.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="mt-6"
            >
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">Completed Goals</span>
              </div>
              <div className="space-y-2">
                {completedGoals.map(goal => (
                  <GoalCard key={goal.id} goal={goal} onTap={(g) => setSelectedGoal(g)} />
                ))}
              </div>
            </motion.div>
          )}

          {/* Creation Flow Modal */}
          <AnimatePresence>
            {showCreate && (
              <GoalCreationFlow
                playerData={playerData}
                existingGoals={goals}
                onClose={() => setShowCreate(false)}
                onGoalCreated={handleGoalCreated}
                onConsumeMana={onConsumeMana}
                onRefundMana={onRefundMana}
              />
            )}
          </AnimatePresence>

          {/* ═══ ALL GOALS FULL-SCREEN OVERLAY ═══ */}
          <AnimatePresence>
            {showAllGoals && (
              <motion.div
                initial={{ opacity: 0, y: '100%' }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: '100%' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="fixed inset-0 z-[80] overflow-y-auto"
                style={{ background: '#08081a', paddingBottom: 'env(safe-area-inset-bottom)' }}
              >
                {/* Header */}
                <div
                  className="sticky top-0 z-10 px-5 pt-5 pb-3 flex items-center gap-3"
                  style={{ background: '#08081a', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <button
                    onClick={() => { playSystemSoundEffect('SELECT'); setShowAllGoals(false); }}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <h2 className="text-sm font-black text-white font-mono tracking-[0.15em]">ALL GOALS</h2>
                  <span className="text-[9px] font-mono text-gray-600 ml-auto">{activeGoals.length} ACTIVE</span>
                </div>

                {/* Goal list */}
                <div className="px-5 py-4 space-y-3 pb-20">
                  {activeGoals.map((goal, idx) => (
                    <motion.div
                      key={goal.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05, duration: 0.3 }}
                    >
                      <GoalCard
                        goal={goal}
                        onTap={(g) => { setSelectedGoal(g); setShowAllGoals(false); }}
                      />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}

function GoalHeroImg() {
  const [loaded, setLoaded] = useState(false);
  return (
    <>
      {!loaded && (
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(110deg, rgba(255,255,255,0.03) 30%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 70%)',
            backgroundSize: '200% 100%',
            animation: 'goal-shimmer 1.5s ease-in-out infinite',
          }}
        />
      )}
      <img
        src="/goals/hero_goal.jpeg"
        alt=""
        className="w-full h-full object-cover"
        style={{
          filter: 'grayscale(100%)',
          opacity: loaded ? 1 : 0,
          transition: 'opacity 0.4s ease',
        }}
        onLoad={() => setLoaded(true)}
      />
      <style>{`@keyframes goal-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    </>
  );
}
