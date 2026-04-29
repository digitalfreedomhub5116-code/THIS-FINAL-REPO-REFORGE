/**
 * Lynx Economy System
 * Manages: Lynx Coins, AI Credits, streak tracking, owned items, equipped cosmetics.
 * Persisted in localStorage + synced to cloud via existing pushToCloud mechanism.
 */

/* ═══ Types ═══ */
export type PlanTier = 'free' | 'basic' | 'pro' | 'ultra';

export interface EconomyState {
  coins: number;
  totalCoinsEarned: number;
  aiCredits: number;
  plan: PlanTier;
  streak: StreakData;
  owned: string[];
  equipped: EquippedItems;
  purchaseHistory: PurchaseRecord[];
  freeCreditsGranted: boolean;
}

export interface StreakData {
  current: number;
  longest: number;
  lastActiveDate: string;
  shieldsRemaining: number;
  milestonesClaimed: number[];
}

export interface EquippedItems {
  border: string | null;
  theme: string | null;
  banner: string | null;
  title: string | null;
}

export interface PurchaseRecord {
  itemId: string;
  price: number;
  timestamp: string;
}

/* ═══ Plan Config ═══ */
export const PLAN_CONFIG = {
  free:  { scanCost: 80, chatCost: 10, coinMultiplier: 1 },
  basic: { scanCost: 70, chatCost: 8,  coinMultiplier: 1.5 },
  pro:   { scanCost: 60, chatCost: 2,  coinMultiplier: 2 },
  ultra: { scanCost: 40, chatCost: 1,  coinMultiplier: 3 },
} as const;

/* ═══ Constants ═══ */
const STORAGE_KEY = 'lynx_economy';
const FREE_CREDITS_AMOUNT = 200;

const STREAK_MILESTONES: { days: number; reward: number }[] = [
  { days: 3, reward: 15 },
  { days: 7, reward: 50 },
  { days: 14, reward: 100 },
  { days: 30, reward: 250 },
  { days: 60, reward: 500 },
  { days: 100, reward: 1000 },
];

/* ═══ Default State ═══ */
function defaultState(): EconomyState {
  return {
    coins: 0,
    totalCoinsEarned: 0,
    aiCredits: 0,
    plan: 'free',
    streak: { current: 0, longest: 0, lastActiveDate: '', shieldsRemaining: 0, milestonesClaimed: [] },
    owned: [],
    equipped: { border: null, theme: null, banner: null, title: null },
    purchaseHistory: [],
    freeCreditsGranted: false,
  };
}

/* ═══ Load / Save ═══ */
export function getEconomy(): EconomyState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    return { ...defaultState(), ...JSON.parse(raw) };
  } catch {
    return defaultState();
  }
}

function save(state: EconomyState): EconomyState {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  return state;
}

/* ═══ Free Credits Grant ═══ */
export function grantFreeCredits(): EconomyState {
  const s = getEconomy();
  if (s.freeCreditsGranted) return s;
  s.aiCredits += FREE_CREDITS_AMOUNT;
  s.freeCreditsGranted = true;
  return save(s);
}

/* ═══ AI Credits ═══ */
export function getAICredits(): number {
  return getEconomy().aiCredits;
}

export function canAffordScan(): boolean {
  const s = getEconomy();
  const cost = PLAN_CONFIG[s.plan].scanCost as number;
  if (cost === 0) return true; // unlimited
  return s.aiCredits >= cost;
}

export function canAffordChat(): boolean {
  const s = getEconomy();
  const cost = PLAN_CONFIG[s.plan].chatCost as number;
  if (cost === 0) return true;
  return s.aiCredits >= cost;
}

export function spendScanCredits(): EconomyState | null {
  const s = getEconomy();
  const cost = PLAN_CONFIG[s.plan].scanCost as number;
  if (cost === 0) return s; // unlimited
  if (s.aiCredits < cost) return null;
  s.aiCredits -= cost;
  return save(s);
}

export function spendChatCredits(): EconomyState | null {
  const s = getEconomy();
  const cost = PLAN_CONFIG[s.plan].chatCost as number;
  if (cost === 0) return s;
  if (s.aiCredits < cost) return null;
  s.aiCredits -= cost;
  return save(s);
}

export function addAICredits(amount: number): EconomyState {
  const s = getEconomy();
  s.aiCredits += amount;
  return save(s);
}

/* ═══ Plan ═══ */
export function setPlan(tier: PlanTier): EconomyState {
  const s = getEconomy();
  s.plan = tier;
  return save(s);
}

export function getPlan(): PlanTier {
  return getEconomy().plan;
}

/* ═══ Coins ═══ */
export function earnCoins(amount: number, _reason?: string): EconomyState {
  const s = getEconomy();
  const mult = PLAN_CONFIG[s.plan].coinMultiplier;
  s.coins += amount * mult;
  s.totalCoinsEarned += amount * mult;
  return save(s);
}

export function spendCoins(amount: number): EconomyState | null {
  const s = getEconomy();
  if (s.coins < amount) return null;
  s.coins -= amount;
  return save(s);
}

export function getBalance(): number {
  return getEconomy().coins;
}

/* ═══ Purchases ═══ */
export function purchaseItem(itemId: string, price: number): EconomyState | null {
  const s = getEconomy();
  if (s.coins < price) return null;
  if (s.owned.includes(itemId)) return s;
  s.coins -= price;
  s.owned.push(itemId);
  s.purchaseHistory.push({ itemId, price, timestamp: new Date().toISOString() });
  return save(s);
}

export function ownsItem(itemId: string): boolean {
  return getEconomy().owned.includes(itemId);
}

/* ═══ Equip / Unequip ═══ */
export function equipItem(slot: keyof EquippedItems, itemId: string | null): EconomyState {
  const s = getEconomy();
  s.equipped[slot] = itemId;
  return save(s);
}

/**
 * Default theme CSS variables (gold).
 */
export const DEFAULT_THEME_VARS: Record<string, string> = {
  '--primary': '#C8A84E', '--primary-rgb': '200,168,78',
  '--surface': '#12141a', '--bg': '#0a0a0f',
  '--border': 'rgba(200,168,78,0.08)',
  '--accent-gradient': 'linear-gradient(135deg, #C8A84E, #D4B04A)',
};

/**
 * Apply theme CSS variables to document root.
 * Auto-derives --primary-glow, --primary-muted, --secondary, --accent,
 * and a fallback --accent-gradient from the primary color.
 */
export function applyThemeVars(themeVars?: Record<string, string> | null): void {
  const vars = { ...(themeVars || DEFAULT_THEME_VARS) };
  const rgb = vars['--primary-rgb'] || '200,168,78';
  // Auto-derive related vars if not explicitly set
  if (!vars['--primary-glow']) vars['--primary-glow'] = `rgba(${rgb},0.25)`;
  if (!vars['--primary-muted']) vars['--primary-muted'] = `rgba(${rgb},0.12)`;
  if (!vars['--secondary']) vars['--secondary'] = vars['--primary'];
  if (!vars['--accent']) vars['--accent'] = vars['--primary'];
  // If no gradient defined, create a solid-to-solid from primary
  if (!vars['--accent-gradient']) vars['--accent-gradient'] = `linear-gradient(135deg, ${vars['--primary']}, ${vars['--primary']})`;
  Object.entries(vars).forEach(([k, v]) => document.documentElement.style.setProperty(k, v));
}

/** DEV FLAG: Set to true to auto-unlock all items for testing */
export const DEV_UNLOCK_ALL = true;

export function getEquipped(): EquippedItems {
  return getEconomy().equipped;
}

/* ═══ Streak System ═══ */
function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

export function recordStreakActivity(): { state: EconomyState; milestonesHit: number[] } {
  const s = getEconomy();
  const today = todayStr();
  if (s.streak.lastActiveDate === today) return { state: s, milestonesHit: [] };
  const yesterday = yesterdayStr();

  if (s.streak.lastActiveDate === yesterday) {
    s.streak.current += 1;
  } else if (s.streak.lastActiveDate && s.streak.lastActiveDate !== today) {
    if (s.streak.shieldsRemaining > 0) {
      s.streak.shieldsRemaining -= 1;
      s.streak.current += 1;
    } else {
      s.streak.current = 1;
    }
  } else {
    s.streak.current = 1;
  }

  s.streak.lastActiveDate = today;
  if (s.streak.current > s.streak.longest) s.streak.longest = s.streak.current;

  const newMilestones: number[] = [];
  for (const m of STREAK_MILESTONES) {
    if (s.streak.current >= m.days && !s.streak.milestonesClaimed.includes(m.days)) {
      s.streak.milestonesClaimed.push(m.days);
      s.coins += m.reward;
      s.totalCoinsEarned += m.reward;
      newMilestones.push(m.days);
    }
  }

  save(s);
  return { state: s, milestonesHit: newMilestones };
}

export function getStreak(): StreakData {
  const s = getEconomy();
  const today = todayStr();
  const yesterday = yesterdayStr();
  if (s.streak.lastActiveDate !== today && s.streak.lastActiveDate !== yesterday) {
    if (s.streak.shieldsRemaining > 0 && s.streak.lastActiveDate) return s.streak;
    if (s.streak.current > 0 && s.streak.lastActiveDate) {
      s.streak.current = 0;
      save(s);
    }
  }
  return s.streak;
}

/* ═══ Coin Earning Events ═══ */
export const EARN_AMOUNTS = {
  DAILY_LOGIN: 5,
  WORKOUT_DAY: 20,
  PLAN_COMPLETE: 200,
  FACE_SCAN: 10,
  RANK_UP: 100,
} as const;

export function claimDailyLogin(): EconomyState | null {
  const key = 'lynx_last_login_claim';
  const today = todayStr();
  if (localStorage.getItem(key) === today) return null;
  localStorage.setItem(key, today);
  return earnCoins(EARN_AMOUNTS.DAILY_LOGIN, 'daily_login');
}
