import React from "react";

export enum SystemState {
  INITIALIZING = "INITIALIZING",
  ACTIVE = "ACTIVE",
  LOCKED = "LOCKED",
}

export type Tab =
  | "DASHBOARD"
  | "QUESTS"
  | "ARMORY"
  | "STORE"
  | "LEADERBOARD"
  | "REWARDS"
  | "GROWTH"
  | "HEALTH"
  | "GOALS"
  | "CASTLE"
  | "PROFILE"
  | "GUILDS";

// ── Guilds ──────────────────────────────────────────────────────────────────
export type GuildRole = "master" | "vice" | "member";
export type GuildPrivacy = "open" | "invite_only";

export interface GuildSummary {
  id: string;
  name: string;
  tag?: string | null;
  motto?: string;
  icon?: string | null;
  banner?: string | null;
  privacy: GuildPrivacy;
  memberCount: number;
  memberCap: number;
  level: number;
  rank: number;
  /** True if the current user has a pending join request for this (closed) guild. */
  requested?: boolean;
}

export interface Guild {
  id: string;
  name: string;
  tag?: string | null;
  motto?: string;
  icon?: string | null;
  banner?: string | null;
  privacy: GuildPrivacy;
  masterId: string;
  memberCap: number;
  level: number;
  vaultBalance: number;
  createdAt?: string;
}

export interface GuildMember {
  userId: string;
  role: GuildRole;
  contributionPoints: number;
  joinedAt?: string;
  name: string;
  avatarUrl: string | null;
  level: number;
  rank: string;
  equippedBorder: string | null;
}

export interface GuildMessage {
  id: string;
  guildId: string;
  userId: string | null;
  type: "user" | "system" | "workout" | "quest";
  body: string;
  meta: Record<string, any>;
  createdAt: string;
  author: {
    userId: string;
    name: string;
    avatarUrl: string | null;
    level?: number;
    rank?: string;
    equippedBorder?: string | null;
  } | null;
  // client-only optimistic fields
  _status?: "sending" | "failed" | "sent";
  _tempId?: string;
}

export interface GuildMission {
  id: string;
  title: string;
  target: number;
  progress: number;
  reward: { gold?: number };
  completed: boolean;
  date: string;
  userClaimed?: boolean;
}

export interface GuildWarSide {
  id: string;
  name: string;
  icon?: string | null;
  banner?: string | null;
  score: number;
}

export interface GuildWarContributor {
  userId: string;
  guildId: string;
  points: number;
  name: string;
  avatarUrl: string | null;
}

export interface GuildWar {
  id: string;
  weekStart: string;
  status: "scheduled" | "active" | "ended";
  winnerId: string | null;
  myGuildId: string;
  guildA: GuildWarSide;
  guildB: GuildWarSide;
  contributors: GuildWarContributor[];
}

// Wraps the current war (if any) plus opt-in registration status for the upcoming week.
export interface WarState {
  war: GuildWar | null;
  registered: boolean; // guild is registered for the upcoming matchmaking
  canRegister: boolean; // current user is master/vice
  registrationWeek: string | null; // the Thursday (YYYY-MM-DD) the guild is registered for
  nextWarStart: string; // next matchmaking Thursday (YYYY-MM-DD)
}

export interface VaultTransaction {
  id: string;
  userId: string;
  kind: "donate" | "purchase";
  amount: number;
  itemKey: string | null;
  createdAt: string;
  name: string;
}

export interface GuildJoinRequest {
  id: string;
  userId: string;
  createdAt: string;
  name?: string;
  avatarUrl?: string | null;
  level?: number;
  rank?: string;
}

export interface NavItem {
  label: string;
  icon: React.ReactNode;
  id: Tab;
}

export type Rank = "UNRANKED" | "E" | "D" | "C" | "B" | "A" | "S";
export type TierLevel = "E" | "D" | "C" | "B" | "A" | "S";

export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type Rarity = "COMMON" | "RARE" | "EPIC" | "LEGENDARY" | "MYTHIC";

// --- DAILY REWARDS ---
export type DailyRewardType =
  | "GOLD"
  | "XP"
  | "DUNGEON_PASS"
  | "CHEST_LEGENDARY"
  | "VENUS_SHARDS"
  | "NONE";

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

// --- SHADOW WARFARE ---
export interface ShadowSoldier {
  id: string;
  name: string; // "Shadow of Arjun"
  extractedAt: number;
  sourceRank: number;
}

export interface ClashResult {
  id: string;
  targetName: string;
  targetRank: number;
  won: boolean;
  timestamp: number;
  attackerPower: number;
  defenderPower: number;
  myOldRank: number;
  myNewRank: number;
}

export type KillFeedType =
  | "CLASH_WIN"
  | "CLASH_LOSE"
  | "EXTRACTION"
  | "EXTRACTION_FAIL"
  | "FORTIFY"
  | "POWER_SURGE";

export interface KillFeedEntry {
  id: string;
  type: KillFeedType;
  text: string;
  timestamp: number;
  highlight?: boolean; // true = involves the player
}

export interface WarfareState {
  // Shadow Army — max 3 slots
  shadows: ShadowSoldier[];

  // Overtake tracker: maps targetUsername → timestamp when you first overtook them
  // Extraction is available for 10 mins from this timestamp, then expires
  overtakeTracker: Record<string, number>;

  // Debuffs cast on others
  activeDebuffs: { id: string; expiresAt: number }[];

  // Kill feed
  killFeed: KillFeedEntry[];

  // Power surge
  powerSurgeActive: boolean;
  powerSurgeExpiresAt: number;
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
  rank: "Minion" | "Elite" | "Monarch";
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

// --- CORE STATS (6-stat system) ---
export interface CoreStats {
  strength: number;
  intelligence: number;
  discipline: number;
  social: number;
  focus: number;
  willpower: number;
}

export interface StatTimestamps {
  strength: number;
  intelligence: number;
  discipline: number;
  social: number;
  focus: number;
  willpower: number;
}

export interface ActivityLog {
  id: string;
  message: string;
  timestamp: number;
  type:
    | "XP"
    | "LEVEL_UP"
    | "LEVEL_DOWN"
    | "PENALTY"
    | "SYSTEM"
    | "PURCHASE"
    | "STREAK"
    | "WORKOUT"
    | "TOURNAMENT"
    | "LOOT"
    | "WARNING"
    | "EQUIP";
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  rank: Rank;
  priority: Priority;
  category: keyof CoreStats;
  categories?: (keyof CoreStats)[];
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
  hasPact?: boolean;
  pactAmount?: number;
  pactStatus?: "none" | "active" | "honored" | "burned" | "partial";
  sensorRequirements?: {
    steps?: number;
    distanceKm?: number;
    activeMinutes?: number;
  };
  sensorData?: {
    stepsRecorded?: number;
    distanceRecorded?: number;
    activeMinutesRecorded?: number;
    locationPath?: [number, number][];
    maxSpeedKmh?: number;
  };
  sensorTracking?: boolean;
  // Goal-linked quest fields
  goalId?: string;
  goalTitle?: string;
  goalQuestResources?: GoalQuestResource[];
  goalQuestSteps?: string[];
  connectionToPrevious?: string;
  // Dungeon-linked quest (fitness goal → daily dungeon)
  isDungeonQuest?: boolean;
  dungeonEquipment?: "GYM" | "HOME_DUMBBELLS" | "BODYWEIGHT";
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

export type NotificationType =
  | "SUCCESS"
  | "WARNING"
  | "DANGER"
  | "INFO"
  | "LEVEL_UP"
  | "SYSTEM"
  | "PURCHASE";

export interface SystemNotification {
  id: string;
  message: string;
  type: NotificationType;
  onClick?: () => void;
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
  role: "LEADER" | "OFFICER" | "MEMBER";
  totalXpContribution: number;
  status: "ONLINE" | "OFFLINE";
  lastActive: number;
  avatarUrl?: string;
}

export interface Alliance {
  id: string;
  name: string;
  badge: string;
  description: string;
  type: "OPEN" | "CLOSED";
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
  type: "SYSTEM" | "ACHIEVEMENT";
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
  type: "COMPOUND" | "ACCESSORY" | "CARDIO" | "STRETCH";
  notes?: string;
  videoUrl?: string;
  imageUrl?: string;
  isSupplementary?: boolean;
  /** Whether AI Form Coach is enabled for this exercise (PRO feature) */
  formCoachEnabled?: boolean;
}

/** Result from AI Motion Coach form tracking for a single set */
export interface FormCoachResult {
  setNumber: number;
  repsDetected: number;
  formScore: number; // 0-100
  violations: {
    ruleId: string;
    message: string;
    severity: "warning" | "error";
    repNumber?: number;
  }[];
  bonusXp: number;
}

/** Aggregated form coach data for an entire workout session */
export interface FormCoachSession {
  date: string; // ISO date string
  timestamp: number;
  exercises: {
    name: string;
    avgFormScore: number;
    totalReps: number;
    sets: number;
  }[];
  overallScore: number; // 0-100, weighted average
  totalBonusXp: number;
  perfectSets: number; // Sets with score >= 90
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

export type MealType = "BREAKFAST" | "LUNCH" | "SNACK" | "DINNER";

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

// --- SKILLS TYPES ---
export interface SkillProgress {
  skillId: string;
  completedLessons: string[];
  currentLevel: number;
  startedAt: number;
  lastPracticedAt?: number;
}

export interface HealthProfile {
  hunterName?: string;
  gender: "MALE" | "FEMALE";
  age: number;
  height: number;
  weight: number;
  startingWeight?: number;
  targetWeight?: number;
  neck?: number;
  waist?: number;
  hip?: number;
  activityLevel: "SEDENTARY" | "LIGHT" | "MODERATE" | "VERY_ACTIVE";
  goal: "LOSE_WEIGHT" | "BUILD_MUSCLE" | "ENDURANCE" | "RECOMP";
  equipment: "GYM" | "HOME_DUMBBELLS" | "BODYWEIGHT";
  workoutSplit?: "PPL" | "CLASSIC";
  sessionDuration?: number;
  intensity?: "LIGHT" | "MODERATE" | "HIGH";
  injuries: string[];
  bmi: number;
  bmr: number;
  bodyFat?: number;
  category: string;
  workoutPlan: WorkoutDay[];
  macros: { protein: number; carbs: number; fats: number; calories: number };
  customCalorieLimit?: number;
  lastWorkoutDate?: string;
  progressPhotos?: ProgressPhoto[];
  baselines?: BaselineStats;
  energyLevel?: "DRAINED" | "LOW" | "MODERATE" | "HIGH" | "PEAK";
  currentFocus?:
    | "FITNESS"
    | "ACADEMICS"
    | "CAREER"
    | "CREATIVITY"
    | "SPIRITUALITY";
  stressLevel?: "LOW" | "MODERATE" | "HIGH" | "BURNOUT";
  selectedPlanId?: number | string;
  selectedPlanName?: string;
  aiPlanUsed?: boolean;
  aiGeneratedPlan?: WorkoutDay[];
  aiGeneratedPlanName?: string;
  planChangedAtDay?: number;
  prevPlanName?: string;

  // Sung Jin-woo Daily Dungeon baselines (from calibration)
  baselinePushups?: number; // Max push-ups without stopping
  baselineSitups?: number; // Max sit-ups without stopping
  baselineSquats?: number; // Max squats without stopping
  baselineRunMinutes?: number; // DEPRECATED — use baselineRunKm
  baselineRunKm?: number; // Max running distance (km) without stopping
}

export interface WorkoutExercise {
  id: number;
  name: string;
  type: "COMPOUND" | "ACCESSORY" | "CARDIO" | "STRETCH";
  muscle_group: string;
  default_sets: number;
  default_reps: string;
  video_url: string;
  notes: string;
  equipment: "GYM" | "BODYWEIGHT" | "DUMBBELLS" | "ANY";
  is_active: boolean;
  display_order: number;
}

export interface WorkoutPlan {
  id: number;
  name: string;
  description: string;
  difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  equipment: "GYM" | "HOME_DUMBBELLS" | "BODYWEIGHT";
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
  type: "TIME" | "PHYSICAL";
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

// --- SCHEDULE PLANNER ---
export type ScheduleRole =
  | "STUDENT"
  | "PROFESSIONAL"
  | "GAP_YEAR"
  | "FREELANCER";
export type PreferredWorkoutTime =
  | "EARLY_MORNING"
  | "MORNING"
  | "AFTERNOON"
  | "EVENING"
  | "LATE_NIGHT";
export type PreferredStudyTime = "MORNING" | "AFTERNOON" | "EVENING" | "NIGHT";

export interface ScheduleProfile {
  role: ScheduleRole;

  // Time anchors
  wakeUpTime: string; // "06:30"
  bedtime: string; // "23:30" — user's choice
  morningRoutineMin: number; // 30

  // Role-specific blocked slots
  schoolStart?: string;
  schoolEnd?: string;
  coachingEnabled?: boolean;
  coachingStart?: string;
  coachingEnd?: string;
  workStart?: string;
  workEnd?: string;
  commuteMinutes?: number;
  lunchBreakMinutes?: number;

  // Preferences
  preferredWorkoutTime: PreferredWorkoutTime;
  preferredStudyTime: PreferredStudyTime;
  dinnerTime: string; // "20:30"

  // Flexibility
  windDownMinutes: number; // Before sleep, default 30
  napEnabled: boolean;
  napDuration?: number;
  fixedCommitments: string; // Free text

  // Weekend overrides
  weekendDifferent: boolean;
  weekendWakeUp?: string;
  weekendBedtime?: string;

  createdAt: number;
  updatedAt: number;
}

export type ScheduleSlotType =
  | "QUEST"
  | "WORKOUT"
  | "BLOCKED"
  | "MEAL"
  | "FREE"
  | "SLEEP"
  | "ROUTINE";
export type ScheduleSlotStatus =
  | "PENDING"
  | "ACTIVE"
  | "COMPLETED"
  | "SKIPPED"
  | "DEFERRED";

export interface ScheduleSlot {
  id: string;
  startTime: string; // "07:00"
  endTime: string; // "07:30"
  type: ScheduleSlotType;
  questId?: string; // Links to Quest.id
  goalId?: string; // Links to Goal.id
  label: string;
  status: ScheduleSlotStatus;
  isFlexible: boolean; // Can be moved/reordered
  isCarryOver: boolean; // Deferred from yesterday
  notifyEnabled?: boolean; // Send notification 15 min before
}

export interface DailySchedule {
  date: string; // "2026-04-17"
  slots: ScheduleSlot[];
  swapsUsed: number; // Max 2/day
  restDayUsed: boolean;
  adjustedAt?: number; // If "I'm Running Late" was used
  generatedAt: number;
}

// --- SHADOW MISSION (Long-Term Goals) ---
export type GoalCategory =
  | "ACADEMIC"
  | "FITNESS"
  | "FINANCIAL"
  | "SKILL"
  | "CAREER"
  | "HEALTH"
  | "CREATIVE"
  | "DEFAULT";
export type GoalStatus =
  | "INTERVIEW"
  | "REVIEW"
  | "ACTIVE"
  | "PAUSED"
  | "COMPLETED"
  | "ABANDONED";

export interface GoalMilestone {
  phase: number;
  title: string;
  description: string;
  startDay: number;
  endDay: number;
  targetOutcome: string;
  sampleDailyPattern: string[];
  connectionToNext: string;
}

export interface GoalInterviewQuestion {
  id: number;
  question: string;
  type: "text" | "number" | "mcq";
  prefilled?: string | number | null;
  answer?: string | number | null;
  options?: string[];
}

export interface GoalQuestResource {
  type: "youtube" | "article" | "book" | "search_query";
  title: string;
  url?: string;
  searchQuery?: string;
  channel?: string;
  bookInfo?: string;
}

export interface GoalQuest {
  id: string;
  title: string;
  estimatedDuration: number;
  categories: (keyof CoreStats)[];
  rank: Rank;
  xp: number;
  reasoning: string;
  connectionToPrevious?: string;
  completed?: boolean;
  stepByStep?: string[];
  resources?: GoalQuestResource[];
  scheduledTime?: string;
  // Dungeon-linked goal quest (fitness goals)
  isDungeonQuest?: boolean;
  dungeonEquipment?: "GYM" | "HOME_DUMBBELLS" | "BODYWEIGHT";
}

export interface GoalDailyTask {
  id: string;
  goalId: string;
  date: string; // YYYY-MM-DD
  dayNumber: number;
  quests: GoalQuest[];
  completedCount: number;
  totalCount: number;
  dailyNote: string;
  progressUpdate: string;
  createdAt: number;
}

export interface Goal {
  id: string;
  userId?: string;
  title: string;
  category: GoalCategory;
  goalRank: Rank;
  successProbability: number;
  status: GoalStatus;
  milestones: GoalMilestone[];
  currentMilestone: number;
  interviewQA: GoalInterviewQuestion[];
  dailyCommitmentMin: number;
  totalDurationDays: number;
  smartDurationReasoning: string;
  weeklyRestDay: string;
  riskFactors: string[];
  reasoning: string;
  startDate: number;
  targetDate: number;
  streak: number;
  dailyTasks: GoalDailyTask[];
  createdAt: number;

  // System goals (cannot be deleted/modified by user)
  isSystemGoal?: boolean;
  systemGoalType?: "DAILY_DUNGEON";
  coverImage?: string; // Background image for visual goal cards

  // Fitness goal equipment (selected during goal creation interview)
  equipment?: "GYM" | "HOME_DUMBBELLS" | "BODYWEIGHT";

  // ── Background goal-plan generation (Task 11 add-on) ──
  // When true, this goal is a placeholder created from the user's interview answers
  // while the AI plan generates in the background. The card shows a "Forging…" skeleton.
  // Cleared by App.tsx's onGoalPlanStoreUpdate listener when the plan arrives.
  isPlanning?: boolean;
  /** Failure flag set when background generation errors out — surfaces a retry option. */
  planFailed?: boolean;
  /** Error message displayed under planFailed cards. */
  planError?: string;
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
  totalStrikesEver: number;
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

  logs: ActivityLog[];
  quests: Quest[];
  questHistory?: Record<string, number>;
  shopItems: ShopItem[];
  consumables?: Record<string, never>;
  chests: { legendary: number };
  claimedStreakRewards?: number[];
  personalBests: Record<string, number>;

  // Health
  healthProfile?: HealthProfile;
  nutritionLogs: MealLog[];

  // Global Database
  exerciseDatabase: AdminExercise[];
  focusVideos: Record<string, string>;
  awakening?: { vision: string[]; antiVision: string[] };

  // Armory (legacy + new)
  ownedOutfits: string[];
  activeOutfit: string;
  unlockedLooks: string[];
  activeLookId: string;
  equippedOutfitId: string;
  unlockedOutfits: string[];
  equippedShadows: (Shadow | null)[];
  combatStats: CombatStats;

  // Skills
  skillProgress?: SkillProgress[];

  // Custom Protocols
  customProtocols?: Record<string, WorkoutDay[]>;

  // Tournament
  tournament: {
    pendingReward: TournamentReward | null;
  };

  // Badge Stone System — per-outfit crystal counts
  // e.g. { "outfit_ghost": 45, "outfit_assassin": 203 }
  outfitStones: Record<string, number>;

  // Animated Profile Borders (cosmetic)
  ownedBorders: string[];
  equippedBorder: string | null;

  // Profile Banners (cosmetic)
  ownedBanners?: string[];
  equippedBanner?: string | null;

  // Feature gate tracking
  featureUnlocksShown?: number[];
  rankRevealed?: boolean;
  welcomeChestShown?: boolean;
  questOnboardingDone?: boolean;
  workoutOnboardingDone?: boolean;

  // Shadow Mission (Long-Term Goals)
  goals?: Goal[];

  // Schedule Planner
  scheduleProfile?: ScheduleProfile;
  dailySchedules?: DailySchedule[];

  // Form Coach (AI Motion Coach) History
  formCoachHistory?: FormCoachSession[];

  // Daily Dungeon (Sung Jin-woo Protocol)
  dungeonState?: DungeonState;
}

// --- DAILY DUNGEON (Sung Jin-woo Protocol) ---
export interface DungeonExerciseTarget {
  exercise: "PUSHUPS" | "SQUATS" | "RUNNING" | "SITUPS";
  sets: number;
  reps: number; // For push-ups/squats
  distanceKm?: number; // For running (km)
  durationMinutes?: number; // DEPRECATED — kept for backward compat
  formCoachEnabled: boolean;
}

/**
 * User-added custom dungeon exercise.
 *
 * Lives in its own array (DungeonState.customExercises) — NOT in `targets` —
 * because the progression engine recomputes `targets` from scratch on every
 * level-up / deload and would otherwise wipe anything the user added. Custom
 * exercises are fixed (not auto-scaled) and persist across progression.
 *
 * Completion is tracked in DungeonState.completedExercisesToday keyed by `id`.
 */
export interface DungeonCustomExercise {
  id: string; // unique completion key, e.g. "custom_42_169..."
  name: string;
  type: "COMPOUND" | "ACCESSORY" | "CARDIO" | "STRETCH";
  sets: number;
  reps: string; // e.g. "12, 12, 10" or "15"
  distanceKm?: number; // for CARDIO entries
  videoUrl?: string;
  muscleGroup?: string;
  addedAt: number;
}

export interface DungeonState {
  // Progression tracking
  currentDay: number; // Days since first dungeon
  startDate: number; // Timestamp when dungeon was first activated
  lastCompletedDate: string; // 'YYYY-MM-DD' of last completion
  lastProgressionDate: string; // 'YYYY-MM-DD' when reps last increased
  consecutiveCompletions: number; // For streak-like tracking within dungeon
  totalCompletions: number;
  totalFailures: number;

  // Current targets (computed from baselines + progression)
  targets: DungeonExerciseTarget[];

  // User-added custom exercises (persist across progression; not auto-scaled)
  customExercises?: DungeonCustomExercise[];

  // Per-exercise completion tracking for today
  // Keys are exercise names (PUSHUPS, SQUATS, RUNNING), values are completion dates
  completedExercisesToday?: Record<string, string>;

  // Baselines snapshot (from calibration, frozen at dungeon creation)
  baselinePushups: number;
  baselineSquats: number;
  baselineSitups: number;
  baselineRunKm: number; // Max running distance (km)
  baselineRunMinutes?: number; // DEPRECATED — kept for migration

  // Progression multiplier (starts at 0.7, increases by ~0.08 every 3 days)
  progressionMultiplier: number;

  // History of completed dungeons (last 30 days)
  history: {
    date: string;
    completed: boolean;
    pushupsTarget: number;
    squatsTarget: number;
    situpsTarget?: number;
    runKm: number;
  }[];
}
