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
// Keys are now scarce — they can only come from IAP, Pro, workouts, or leaderboard rewards.
// Ad rewards are disabled.
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

// ── POST /ad-reward — DISABLED: Ad rewards are globally disabled ──
// Previously granted keys for watching a rewarded ad.
router.post('/ad-reward', async (_req: Request, res: Response) => {
  return res.status(410).json({ error: 'Ad rewards are no longer available.' });
});

// ── POST /ad-double — DISABLED: Ad-double rewards are globally disabled ──
// Previously granted bonus rewards for watching an ad after completion.
router.post('/ad-double', async (_req: Request, res: Response) => {
  return res.status(410).json({ error: 'Ad-double rewards are no longer available.' });
});

export default router;

