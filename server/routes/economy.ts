/**
 * economy.ts — Server-authoritative Gold & Key management endpoints.
 * Gold and Keys can ONLY be modified through these endpoints.
 * The client sync (PUT /player/:id) ignores any gold/keys values from the client.
 */
import { Router, Request, Response } from 'express';
import { getAuthenticatedUserId } from '../lib/playerAuth.js';
import { supabaseServer } from '../lib/supabase.js';
import { grantKeys, getKeyBalance } from '../lib/keyGate.js';

const router = Router();

// ── POST /earn — Server-validated gold earning ──
// Called when a player completes a quest, wins a daily challenge, etc.
// The server validates the action type and grants the correct amount.
router.post('/earn', async (req: Request, res: Response) => {
  const userId = getAuthenticatedUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { action, amount, questId, questRank } = req.body;
  if (!action || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'Invalid earn request' });
  }

  // Validate the earning amount based on action type
  const EARN_LIMITS: Record<string, number> = {
    'quest_complete': 200,     // Max gold from a single quest
    'daily_reward': 50,        // Daily leaderboard participation reward
    'leaderboard_prize': 100,  // Daily leaderboard top-3 prize
    'streak_milestone': 5000,  // Streak milestone (365-day)
    'achievement': 500,        // One-time achievement
  };

  const maxAllowed = EARN_LIMITS[action] || 100;
  const safeAmount = Math.min(amount, maxAllowed);

  try {
    const db = supabaseServer() as any;

    // Atomically add gold
    const { data: player, error: fetchErr } = await db
      .from('players')
      .select('id, gold')
      .eq('supabase_id', userId)
      .single();

    if (fetchErr || !player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const newGold = (player.gold || 0) + safeAmount;
    const { error: updateErr } = await db
      .from('players')
      .update({ gold: newGold })
      .eq('id', player.id);

    if (updateErr) throw updateErr;

    console.log(`[Economy] ${userId.slice(-8)}: +${safeAmount}G (${action}) → ${newGold}G total`);
    return res.json({ success: true, gold: newGold, earned: safeAmount });
  } catch (err) {
    console.error('[Economy earn]', err);
    return res.status(500).json({ error: 'Failed to process gold earning' });
  }
});

// ── POST /spend — Server-validated gold spending ──
// Called when a player buys from store, uses a gold sink, etc.
router.post('/spend', async (req: Request, res: Response) => {
  const userId = getAuthenticatedUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { action, amount, itemId } = req.body;
  if (!action || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'Invalid spend request' });
  }

  try {
    const db = supabaseServer() as any;

    const { data: player, error: fetchErr } = await db
      .from('players')
      .select('id, gold')
      .eq('supabase_id', userId)
      .single();

    if (fetchErr || !player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const currentGold = player.gold || 0;
    if (currentGold < amount) {
      return res.status(402).json({ 
        error: 'Not enough gold', 
        goldRemaining: currentGold, 
        goldRequired: amount 
      });
    }

    // Atomic deduction with optimistic concurrency
    const newGold = currentGold - amount;
    const { error: updateErr } = await db
      .from('players')
      .update({ gold: newGold })
      .eq('id', player.id)
      .eq('gold', currentGold);

    if (updateErr) throw updateErr;

    console.log(`[Economy] ${userId.slice(-8)}: -${amount}G (${action}) → ${newGold}G remaining`);
    return res.json({ success: true, gold: newGold, spent: amount });
  } catch (err) {
    console.error('[Economy spend]', err);
    return res.status(500).json({ error: 'Failed to process gold spending' });
  }
});

// ── GET /balance — Get current gold and key balance ──
router.get('/balance', async (req: Request, res: Response) => {
  const userId = getAuthenticatedUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const db = supabaseServer() as any;
    const { data, error } = await db
      .from('players')
      .select('gold, keys')
      .eq('supabase_id', userId)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Player not found' });
    }

    return res.json({ gold: data.gold || 0, keys: data.keys || 0 });
  } catch (err) {
    console.error('[Economy balance]', err);
    return res.status(500).json({ error: 'Failed to get balance' });
  }
});

// ── POST /exchange — DISABLED: Gold→Key exchange removed ──
// Keys are now scarce — they can only come from ads, IAP, Pro, workouts, or leaderboard rewards.
router.post('/exchange', async (_req: Request, res: Response) => {
  return res.status(410).json({ error: 'Gold to key exchange is no longer available.' });
});


// ── POST /grant-keys — Server-validated key granting (for workout rewards, etc.) ──
router.post('/grant-keys', async (req: Request, res: Response) => {
  const userId = getAuthenticatedUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { amount, source } = req.body;
  if (typeof amount !== 'number' || amount <= 0 || amount > 5) {
    return res.status(400).json({ error: 'Invalid key amount (1-5)' });
  }

  // Validate source to prevent abuse
  const VALID_SOURCES = ['workout_reward', 'leaderboard_reward', 'achievement'];
  if (!source || !VALID_SOURCES.includes(source)) {
    return res.status(400).json({ error: 'Invalid source' });
  }

  try {
    const result = await grantKeys(userId, amount);
    if (!result.success) {
      return res.status(500).json({ error: 'Failed to grant keys' });
    }

    console.log(`[Economy] ${userId.slice(-8)}: +${amount}🔑 (${source}) → ${result.newBalance} total`);
    return res.json({ success: true, keys: result.newBalance, granted: amount });
  } catch (err) {
    console.error('[Economy grant-keys]', err);
    return res.status(500).json({ error: 'Failed to grant keys' });
  }
});

// ── POST /ad-reward — Grant keys for watching a rewarded ad ──
// Rate-limited: max 5 ads per day per user
const adWatchTracker: Record<string, { count: number; resetAt: number }> = {};

router.post('/ad-reward', async (req: Request, res: Response) => {
  const userId = getAuthenticatedUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { rewardType } = req.body; // 'keys' | 'gold'
  const KEYS_PER_AD = 3;
  const GOLD_PER_AD = 150;
  const MAX_ADS_PER_DAY = 5;

  // Rate limiting
  const now = Date.now();
  const tracker = adWatchTracker[userId];
  if (tracker && now < tracker.resetAt) {
    if (tracker.count >= MAX_ADS_PER_DAY) {
      return res.status(429).json({ error: 'Daily ad limit reached', maxAds: MAX_ADS_PER_DAY });
    }
    tracker.count++;
  } else {
    // Reset for new day (midnight reset)
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    adWatchTracker[userId] = { count: 1, resetAt: midnight.getTime() };
  }

  try {
    if (rewardType === 'keys') {
      const result = await grantKeys(userId, KEYS_PER_AD);
      if (!result.success) {
        return res.status(500).json({ error: 'Failed to grant keys' });
      }
      console.log(`[Economy] ${userId.slice(-8)}: +${KEYS_PER_AD}🔑 (ad_reward) → ${result.newBalance} total`);
      return res.json({ success: true, keys: result.newBalance, granted: KEYS_PER_AD, type: 'keys' });
    } else {
      // Grant gold
      const db = supabaseServer() as any;
      const { data: player, error: fetchErr } = await db
        .from('players')
        .select('id, gold')
        .eq('supabase_id', userId)
        .single();

      if (fetchErr || !player) {
        return res.status(404).json({ error: 'Player not found' });
      }

      const newGold = (player.gold || 0) + GOLD_PER_AD;
      await db.from('players').update({ gold: newGold }).eq('id', player.id);
      console.log(`[Economy] ${userId.slice(-8)}: +${GOLD_PER_AD}G (ad_reward) → ${newGold} total`);
      return res.json({ success: true, gold: newGold, granted: GOLD_PER_AD, type: 'gold' });
    }
  } catch (err) {
    console.error('[Economy ad-reward]', err);
    return res.status(500).json({ error: 'Failed to process ad reward' });
  }
});

// ── POST /ad-double — Double rewards for watching an ad after completion ──
// Called after workout/leaderboard completion with the original reward values
router.post('/ad-double', async (req: Request, res: Response) => {
  const userId = getAuthenticatedUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { goldBonus, xpBonus } = req.body;
  
  try {
    const db = supabaseServer() as any;
    const { data: player, error: fetchErr } = await db
      .from('players')
      .select('id, gold')
      .eq('supabase_id', userId)
      .single();

    if (fetchErr || !player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const safeGold = Math.min(Math.max(goldBonus || 0, 0), 500); // Cap at 500 bonus gold
    const newGold = (player.gold || 0) + safeGold;
    await db.from('players').update({ gold: newGold }).eq('id', player.id);

    console.log(`[Economy] ${userId.slice(-8)}: +${safeGold}G (ad_double) → ${newGold} total`);
    return res.json({ success: true, gold: newGold, bonusGold: safeGold, bonusXp: xpBonus || 0 });
  } catch (err) {
    console.error('[Economy ad-double]', err);
    return res.status(500).json({ error: 'Failed to process ad double' });
  }
});

export default router;

