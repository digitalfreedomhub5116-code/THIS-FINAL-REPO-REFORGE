
import React from 'react';

export enum SystemState {
  INITIALIZING = 'INITIALIZING',
  ACTIVE = 'ACTIVE',
  LOCKED = 'LOCKED'
}

export type Tab = 'DASHBOARD' | 'QUESTS' | 'ARMORY' | 'STORE' | 'ALLIANCE' | 'REWARDS' | 'GROWTH' | 'HEALTH' | 'RANKING' | 'CASTLE' | 'PROFILE';

export interface NavItem {
  label: string;
  icon: React.ReactNode;
  id: Tab;
}

export type Rank = 'E' | 'D' | 'C' | 'B' | 'A' | 'S';
export type TierLevel = 'E' | 'D' | 'C' | 'B' | 'A' | 'S';

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type Rarity = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC';

// --- DAILY REWARDS ---
export type DailyRewardType = 'WELCOME_KEYS' | 'GOLD' | 'XP' | 'KEYS' | 'DUNGEON_PASS';

export interface DailyReward {
  type: DailyRewardType;
  amount: number;
  message: string;
}

// --- COMBAT & ARMORY ---
export interface CombatStats {
  attack: number;
  boost: number;
  ultimate: number;
  extraction: number;
}

export interface DbOutfit {
  id: number;
  outfit_key: string;
  name: string;
  description: string;
  tier: TierLevel;
  cost: number;
  accent_color: string;
  intro_video_url: string;
  loop_video_url: string;
  attack: number;
  boost: number;
  extraction: number;
  ultimate: number;
  image_url: string;
  is_default: boolean;
  display_order: number;
}

export interface TierConfig {
  id: TierLevel;
  statCap: number;
  color: string;
}

export interface Shadow {
  id: string;
  name: string;
  rank: 'Minion' | 'Elite' | 'Monarch';
  image: string;
  buffs: { stat: keyof CombatStats; value: number }[];
}

export interface Outfit {
  id: string;
  name: string;
  tier: TierLevel;
  description: string;
  image: string;
  baseStats: CombatStats;
  cost: number;
  buffs?: { label: string; color: string }[];
  accentColor?: string;
  introVideoUrl?: string;
  loopVideoUrl?: string;
  isDefault?: boolean;
}

export interface DuskLook {
  id: string;
  name: string;
  description: string;
  cost: number;
  rarity: Rarity;
  videoUrl: string;
  previewImage: string;
  color: string;
  cssFilter?: string;
}

// --- CORE STATS (4-stat system) ---
export interface CoreStats {
  strength: number;
  intelligence: number;
  discipline: number;
  social: number;
}

export interface StatTimestamps {
  strength: number;
  intelligence: number;
  discipline: number;
  social: number;
}

export interface ActivityLog {
  id: string;
  message: string;
  timestamp: number;
  type: 'XP' | 'LEVEL_UP' | 'LEVEL_DOWN' | 'PENALTY' | 'SYSTEM' | 'PURCHASE' | 'STREAK' | 'WORKOUT' | 'TOURNAMENT' | 'LOOT' | 'WARNING' | 'EQUIP';
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  rank: Rank;
  priority: Priority;
  category: keyof CoreStats;
  xpReward: number;
  isCompleted: boolean;
  failed?: boolean;
  createdAt: number;
  expiresAt?: number;
  isDaily: boolean;
  trigger?: string;
  miniQuest?: string;
  completedAsMini?: boolean;
  scheduledTime?: string;
  estimatedDuration?: number;
  lastCompletedAt?: number;
  aiReasoning?: string;
  verificationRequired?: boolean;
  minDurationMinutes?: number;
  lastResetAt?: number;
}

export interface ShopItem {
  id: string;
  title: string;
  description: string;
  cost: number;
  icon: string;
}

export interface AwakeningData {
  vision: string[];
  antiVision: string[];
}

export type NotificationType = 'SUCCESS' | 'WARNING' | 'DANGER' | 'LEVEL_UP' | 'SYSTEM' | 'PURCHASE';

export interface SystemNotification {
  id: string;
  message: string;
  type: NotificationType;
}

export interface HistoryEntry {
  date: string;
  stats: CoreStats;
  totalXp: number;
  dailyXp: number;
  questCompletion: number;
}

// --- ALLIANCE / GUILDS ---
export interface AllianceMember {
  id: string;
  name: string;
  role: 'LEADER' | 'OFFICER' | 'MEMBER';
  totalXpContribution: number;
  status: 'ONLINE' | 'OFFLINE';
  lastActive: number;
  avatarUrl?: string;
}

export interface Alliance {
  id: string;
  name: string;
  badge: string;
  description: string;
  type: 'OPEN' | 'CLOSED';
  members: AllianceMember[];
  memberCount: number;
  totalPower: number;
  rules: string;
}

export interface AllianceChatMessage {
  id: string;
  senderName: string;
  text: string;
  timestamp: number;
  isSystem: boolean;
}

export interface GuildLog {
  id: string;
  type: 'SYSTEM' | 'ACHIEVEMENT';
  content: string;
  timestamp: number;
  user?: string;
}

// --- ADMIN / DATABASE TYPES ---
export interface AdminExercise {
  id: string;
  name: string;
  muscleGroup: string;
  subTarget?: string;
  difficulty: string;
  equipmentNeeded?: string;
  environment?: string;
  imageUrl: string;
  videoUrl: string;
  caloriesBurn: number;
}

export interface Exercise {
  id?: string;
  name: string;
  sets: number;
  reps: string;
  rest?: number;
  duration: number;
  completed: boolean;
  type: 'COMPOUND' | 'ACCESSORY' | 'CARDIO' | 'STRETCH';
  notes?: string;
  videoUrl?: string;
  imageUrl?: string;
}

export interface WorkoutDay {
  day: string;
  focus: string;
  exercises: Exercise[];
  isRecovery?: boolean;
  totalDuration: number;
}

export interface ProgressPhoto {
  id: string;
  date: number;
  imageUrl: string;
  weight?: number;
  note?: string;
}

// --- NUTRITION TYPES ---
export interface FoodItem {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  servingSize: string;
  region?: string;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  vitaminA?: number;
  vitaminC?: number;
  vitaminD?: number;
  vitaminB12?: number;
  calcium?: number;
  iron?: number;
  potassium?: number;
  ingredients?: string[];
  aiConfidence?: string;
}

export interface LoggedFoodItem extends FoodItem {
  quantity: number;
}

export type MealType = 'BREAKFAST' | 'LUNCH' | 'SNACK' | 'DINNER';

export interface MealLog {
  id: string;
  label: string;
  items: LoggedFoodItem[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFats: number;
  timestamp: number;
  imageUrl?: string;
  mealType?: MealType;
}

export interface BaselineStats {
  pushups: number;
  focusDuration: number;
  readingTime: number;
  sleepAvg: number;
}

export interface HealthProfile {
  gender: 'MALE' | 'FEMALE';
  age: number;
  height: number;
  weight: number;
  startingWeight?: number;
  targetWeight?: number;
  neck?: number;
  waist?: number;
  hip?: number;
  activityLevel: 'SEDENTARY' | 'LIGHT' | 'MODERATE' | 'VERY_ACTIVE';
  goal: 'LOSE_WEIGHT' | 'BUILD_MUSCLE' | 'ENDURANCE' | 'RECOMP';
  equipment: 'GYM' | 'HOME_DUMBBELLS' | 'BODYWEIGHT';
  workoutSplit?: 'PPL' | 'CLASSIC';
  sessionDuration?: number;
  intensity?: 'LIGHT' | 'MODERATE' | 'HIGH';
  injuries: string[];
  bmi: number;
  bmr: number;
  bodyFat?: number;
  category: string;
  workoutPlan: WorkoutDay[];
  macros: { protein: number; carbs: number; fats: number; calories: number };
  lastWorkoutDate?: string;
  progressPhotos?: ProgressPhoto[];
  baselines?: BaselineStats;
  energyLevel?: 'DRAINED' | 'LOW' | 'MODERATE' | 'HIGH' | 'PEAK';
  currentFocus?: 'FITNESS' | 'ACADEMICS' | 'CAREER' | 'CREATIVITY' | 'SPIRITUALITY';
  stressLevel?: 'LOW' | 'MODERATE' | 'HIGH' | 'BURNOUT';
  selectedPlanId?: number | string;
  selectedPlanName?: string;
  aiPlanUsed?: boolean;
  aiGeneratedPlan?: WorkoutDay[];
  aiGeneratedPlanName?: string;
}

export interface WorkoutExercise {
  id: number;
  name: string;
  type: 'COMPOUND' | 'ACCESSORY' | 'CARDIO' | 'STRETCH';
  muscle_group: string;
  default_sets: number;
  default_reps: string;
  video_url: string;
  notes: string;
  equipment: 'GYM' | 'BODYWEIGHT' | 'DUMBBELLS' | 'ANY';
  is_active: boolean;
  display_order: number;
}

export interface WorkoutPlan {
  id: number;
  name: string;
  description: string;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  equipment: 'GYM' | 'HOME_DUMBBELLS' | 'BODYWEIGHT';
  duration_weeks: number;
  days_per_week: number;
  days: WorkoutDay[];
  is_active: boolean;
  display_order: number;
  image_url?: string;
}

export interface PenaltyTask {
  title: string;
  description: string;
  type: 'TIME' | 'PHYSICAL';
  duration?: number;
}

export interface TournamentReward {
  rank: number;
  gold: number;
  date: string;
}

// Replit Auth user profile
export interface ReplitUser {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
}

export interface PlayerData {
  userId?: string;
  replitUser?: ReplitUser;
  isConfigured: boolean;

  // Tutorial State
  tutorialStep: number;
  tutorialComplete: boolean;

  // Identity
  name: string;
  username?: string;
  country?: string;
  timezone?: string;
  identity?: string;
  pin?: string;

  // Avatar
  avatarUrl?: string;
  originalSelfieUrl?: string;

  // Progression
  level: number;
  currentXp: number;
  requiredXp: number;
  totalXp: number;
  dailyXp: number;
  rank: Rank;
  trustScore: number;
  gold: number;
  keys: number;
  streak: number;
  startDate: number;

  // Anti-cheat
  cheatStrikes: number;
  isBanned: boolean;

  // Dusk AI
  duskUnreadCount: number;

  // Alliance
  allianceId?: string;

  // Attributes
  stats: CoreStats;
  dailyStats: CoreStats;
  yesterdayStats: CoreStats;
  weeklyStats: CoreStats;
  monthlyStats: CoreStats;
  lastStatUpdate: StatTimestamps;

  // Reset Timestamps
  lastDailyReset: number;
  lastWeeklyReset: number;
  lastMonthlyReset: number;

  history: HistoryEntry[];

  // Status
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  fatigue: number;
  job: string;
  title: string;

  // Logic
  lastLoginDate: string;
  lastWorkoutDate: string;
  dailyQuestComplete: boolean;
  isPenaltyActive: boolean;
  penaltyEndTime?: number;
  penaltyTask?: PenaltyTask;
  lastDungeonEntry?: number;
  logs: ActivityLog[];
  quests: Quest[];
  questHistory?: Record<string, number>;
  shopItems: ShopItem[];
  consumables: { healthPotions: number; shadowScrolls: number; ultOrbs: number };
  awakening: AwakeningData;
  personalBests: Record<string, number>;

  // Health
  healthProfile?: HealthProfile;
  nutritionLogs: MealLog[];

  // Global Database
  exerciseDatabase: AdminExercise[];
  focusVideos: Record<string, string>;

  // Armory (legacy + new)
  ownedOutfits: string[];
  activeOutfit: string;
  unlockedLooks: string[];
  activeLookId: string;
  equippedOutfitId: string;
  unlockedOutfits: string[];
  equippedShadows: (Shadow | null)[];
  combatStats: CombatStats;

  // Custom Protocols
  customProtocols?: Record<string, WorkoutDay[]>;

  // Tournament
  tournament: {
    pendingReward: TournamentReward | null;
  };
}
