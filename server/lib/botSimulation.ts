/**
 * botSimulation.ts — Dummy player simulation for leaderboard engagement.
 *
 * Creates 7 semi-realistic bot players and simulates their daily activity:
 * - Daily XP between 100-600 (randomized per bot per day)
 * - Streaks that grow naturally but randomly break after ~10+ days
 * - Borders that change randomly every ~8 days (each bot independently)
 * - Level/rank progression based on accumulated XP
 *
 * ALL actions are staggered independently per player so they appear as
 * separate real users — no two bots ever change at the same time.
 */

import { supabaseServer } from './supabase.js';

// ── Level/rank computation (mirrors leaderboard.ts) ──
function computeRank(level: number): string {
  if (level >= 80) return 'S';
  if (level >= 55) return 'A';
  if (level >= 39) return 'B';
  if (level >= 27) return 'C';
  if (level >= 11) return 'D';
  return 'E';
}

function computeLevel(totalXp: number): { level: number; currentXp: number; requiredXp: number } {
  let level = 1;
  let requiredXp = 100;
  let remainingXp = totalXp;

  while (remainingXp >= requiredXp && level < 200) {
    remainingXp -= requiredXp;
    level++;
    requiredXp = Math.floor(requiredXp * 1.5);
    if (requiredXp <= 0) requiredXp = 100;
  }

  return { level, currentXp: remainingXp, requiredXp };
}

// ── All available borders (from inventory.ts) ──
const ALL_BORDERS = [
  'border-ice-img',
  'border-starcrown-img',
  'border-elemental-tide',
  'border-frost-tech',
  'border-dragon-img',
  'border-stitched-dragon',
  'border-gold-lion',
  'border-gold-dragon',
  'border-gold-eagle',
  'border-phoenix',
  'border-podium-bronze',
  'border-streak-silver',
  'border-shadowthrone-img',
  'border-podium-silver',
  'border-streak-legendary',
  'border-streak-gold',
  'border-podium-gold',
  'border-streak-inferno',
  'border-streak-eternal',
  'border-video-neon',
];

// ── Bot definitions ──
interface BotConfig {
  username: string;
  name: string;
  avatarPath: string;  // Relative path under /assets/bot-avatars/
  /** Seed used to stagger events so each bot is on its own cycle */
  seed: number;
  /** Minimum daily XP this bot typically earns */
  xpMin: number;
  /** Maximum daily XP this bot typically earns */
  xpMax: number;
  /** Starting border index (each bot gets a different one) */
  borderIndex: number;
}

const BOT_CONFIGS: BotConfig[] = [
  {
    username: 'ArjunX',
    name: 'Arjun',
    avatarPath: 'avatar_arjunx.png',
    seed: 1,
    xpMin: 150,
    xpMax: 520,
    borderIndex: 0,
  },
  {
    username: 'meeraStar',
    name: 'Meera',
    avatarPath: 'avatar_meera.png',
    seed: 3,
    xpMin: 200,
    xpMax: 580,
    borderIndex: 3,
  },
  {
    username: 'vikramZ',
    name: 'Vikram',
    avatarPath: 'avatar_vikramz.png',
    seed: 5,
    xpMin: 250,
    xpMax: 600,
    borderIndex: 6,
  },
  {
    username: 'niyaFit',
    name: 'Niya',
    avatarPath: 'avatar_niya.png',
    seed: 7,
    xpMin: 100,
    xpMax: 450,
    borderIndex: 9,
  },
  {
    username: 'devRaj_',
    name: 'Dev',
    avatarPath: 'avatar_devraj.png',
    seed: 11,
    xpMin: 180,
    xpMax: 500,
    borderIndex: 12,
  },
  {
    username: 'samiraGrind',
    name: 'Samira',
    avatarPath: 'avatar_samira.png',
    seed: 13,
    xpMin: 220,
    xpMax: 560,
    borderIndex: 15,
  },
  {
    username: 'kunalFit',
    name: 'Kunal',
    avatarPath: 'avatar_kunal.png',
    seed: 17,
    xpMin: 130,
    xpMax: 480,
    borderIndex: 18,
  },
];

// ── Seeded pseudo-random number generator (deterministic per bot per day) ──
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

function getTodayStr(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
}

function getDaysSinceEpoch(): number {
  return Math.floor(Date.now() / 86400000);
}

// ── Create or get a bot player ──
async function ensureBotExists(config: BotConfig, deployedUrl: string): Promise<string | null> {
  const db = supabaseServer() as any;

  // Check if bot already exists
  const { data: existing } = await db
    .from('players')
    .select('id')
    .eq('username', config.username)
    .single();

  if (existing) return existing.id;

  // Create the bot player
  const avatarUrl = `${deployedUrl}/assets/bot-avatars/${config.avatarPath}`;

  const { data: newPlayer, error } = await db
    .from('players')
    .insert({
      username: config.username,
      name: config.name,
      avatar_url: avatarUrl,
      level: 1,
      total_xp: 0,
      current_xp: 0,
      required_xp: 100,
      daily_xp: 0,
      rank: 'E',
      streak: 1,
      gold: 500,
      keys: 5,
      is_banned: false,
      is_configured: true,
      tutorial_complete: true,
      last_login_date: getTodayStr(),
      last_daily_reset: getTodayStr(),
      equipped_border: ALL_BORDERS[config.borderIndex % ALL_BORDERS.length],
      raw_data: {
        isBot: true,
        name: config.name,
        username: config.username,
        equippedBorder: ALL_BORDERS[config.borderIndex % ALL_BORDERS.length],
        ownedItems: [...ALL_BORDERS], // All borders unlocked
        lastBorderChange: getDaysSinceEpoch(),
        lastStreakBreak: getDaysSinceEpoch(),
      },
    })
    .select('id')
    .single();

  if (error) {
    console.error(`[BotSim] Failed to create bot ${config.username}:`, error.message);
    return null;
  }

  // Also add all borders to user_inventory so equip validation passes
  const inventoryRows = ALL_BORDERS.map(borderId => ({
    player_id: newPlayer.id,
    item_id: borderId,
    item_type: 'border',
    price_paid: 0,
    source: 'bot_grant',
  }));

  await db.from('user_inventory').insert(inventoryRows);

  console.log(`[BotSim] Created bot player: ${config.username} (${newPlayer.id})`);
  return newPlayer.id;
}

// ── Daily simulation tick for a single bot ──
async function simulateBotDay(config: BotConfig): Promise<void> {
  const db = supabaseServer() as any;
  const todayStr = getTodayStr();
  const dayNumber = getDaysSinceEpoch();

  // Fetch current bot state
  const { data: bot, error: fetchErr } = await db
    .from('players')
    .select('id, total_xp, daily_xp, streak, level, rank, current_xp, required_xp, last_login_date, last_daily_reset, equipped_border, raw_data')
    .eq('username', config.username)
    .single();

  if (fetchErr || !bot) {
    console.error(`[BotSim] ${config.username}: Not found, skipping`);
    return;
  }

  const rawData = bot.raw_data || {};

  // Skip if already simulated today
  if (bot.last_daily_reset === todayStr && (bot.daily_xp || 0) > 0) {
    return; // Already ran today
  }

  // ── Generate today's XP ──
  // Use day + bot seed for unique-per-bot-per-day randomness
  const xpSeed = dayNumber * 1000 + config.seed;
  const xpRand = seededRandom(xpSeed);
  const dailyXp = Math.floor(config.xpMin + xpRand * (config.xpMax - config.xpMin));

  // ── Streak logic ──
  let newStreak = (bot.streak || 0) + 1;
  const lastStreakBreak = rawData.lastStreakBreak || (dayNumber - 15);
  const daysSinceLastBreak = dayNumber - lastStreakBreak;

  // Randomly break streak after 10+ days, with increasing probability
  // Each bot has different timing due to different seeds
  const breakSeed = dayNumber * 100 + config.seed * 7;
  const breakRand = seededRandom(breakSeed);

  if (daysSinceLastBreak >= 10) {
    // Probability increases: 5% at day 10, 10% at day 15, 20% at day 20, etc.
    const breakChance = 0.05 + (daysSinceLastBreak - 10) * 0.01;
    if (breakRand < breakChance) {
      console.log(`[BotSim] ${config.username}: Streak BROKEN at ${bot.streak} days (chance was ${(breakChance * 100).toFixed(1)}%)`);
      newStreak = 1;
      rawData.lastStreakBreak = dayNumber;
    }
  }

  // ── Border change logic ──
  // Each bot changes border on its own ~8 day cycle, staggered by seed
  const lastBorderChange = rawData.lastBorderChange || (dayNumber - config.seed);
  const daysSinceLastBorderChange = dayNumber - lastBorderChange;
  let newBorder = bot.equipped_border;

  if (daysSinceLastBorderChange >= 6) {
    // 15% daily chance to change border after 6+ days
    const borderSeed = dayNumber * 50 + config.seed * 13;
    const borderRand = seededRandom(borderSeed);

    if (borderRand < 0.15 || daysSinceLastBorderChange >= 12) {
      // Pick a new border different from current
      const available = ALL_BORDERS.filter(b => b !== bot.equipped_border);
      const borderPickSeed = dayNumber * 30 + config.seed * 3;
      const pickIdx = Math.floor(seededRandom(borderPickSeed) * available.length);
      newBorder = available[pickIdx];
      rawData.lastBorderChange = dayNumber;
      console.log(`[BotSim] ${config.username}: Border changed to ${newBorder}`);
    }
  }

  // ── Level/rank computation ──
  const newTotalXp = (bot.total_xp || 0) + dailyXp;
  const { level: newLevel, currentXp: newCurrentXp, requiredXp: newRequiredXp } = computeLevel(newTotalXp);
  const newRank = computeRank(newLevel);

  // ── Persist ──
  rawData.equippedBorder = newBorder;

  const updatePayload: Record<string, any> = {
    daily_xp: dailyXp,
    total_xp: newTotalXp,
    current_xp: newCurrentXp,
    required_xp: newRequiredXp,
    level: newLevel,
    rank: newRank,
    streak: newStreak,
    last_login_date: todayStr,
    last_daily_reset: todayStr,
    equipped_border: newBorder,
    raw_data: rawData,
    updated_at: new Date().toISOString(),
  };

  const { error: updateErr } = await db
    .from('players')
    .update(updatePayload)
    .eq('id', bot.id);

  if (updateErr) {
    console.error(`[BotSim] ${config.username}: Update failed:`, updateErr.message);
    return;
  }

  console.log(`[BotSim] ${config.username}: +${dailyXp}XP | Lv${newLevel} ${newRank} | Streak:${newStreak} | Border:${newBorder.replace('border-', '')}`);
}

// ── Main entry point: run all bot simulations ──
export async function runBotSimulation(): Promise<void> {
  const deployedUrl = process.env.DEPLOYED_URL || 'http://localhost:8001';

  console.log('[BotSim] Starting daily bot simulation...');

  for (const config of BOT_CONFIGS) {
    try {
      // Ensure bot exists
      await ensureBotExists(config, deployedUrl);

      // Simulate today's activity (staggered by a few ms to avoid DB race)
      await new Promise(resolve => setTimeout(resolve, 100 + config.seed * 50));
      await simulateBotDay(config);
    } catch (err: any) {
      console.error(`[BotSim] ${config.username}: Error:`, err?.message || err);
    }
  }

  console.log('[BotSim] Daily bot simulation complete.');
}

export { BOT_CONFIGS };
