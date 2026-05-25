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


// ── POST /ad-key-watch — Server-authoritative free key from ads ──
// The client calls this once per completed rewarded ad. The server
// increments the cumulative counter and grants 1 free key for every
// 2 ads watched. No client state, no claim step, no race conditions.
//
// Returns: { adsWatched: number, keysGranted: number, totalKeys: number }
//   adsWatched   — cumulative ads ever watched (modulo display: % 2 == slot)
//   keysGranted  — 0 or 1, whether THIS call crossed a 2-ad boundary
//   totalKeys    — current key balance after the (possible) grant
router.post('/ad-key-watch', async (req: Request, res: Response) => {
  const userId = getAuthenticatedUserId(req);
  if (!userId) {
    const authHeader = req.headers['authorization'];
    const hasBearer = typeof authHeader === 'string' && authHeader.startsWith('Bearer ');
    const hasSession = !!(req.session as any)?.userId;
    console.warn(
      '[Economy ad-key-watch] 401 Unauthorized',
      JSON.stringify({ hasBearer, bearerLen: hasBearer ? (authHeader as string).slice(7).length : 0, hasSession }),
    );
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const ADS_PER_KEY = 2;

  try {
    const db = supabaseServer() as any;

    // Read the player's current state. We use raw_data.adKeysWatched as the
    // counter so no schema migration is needed — raw_data is an existing JSONB.
    const { data: player, error: fetchErr } = await db
      .from('players')
      .select('id, keys, raw_data')
      .eq('supabase_id', userId)
      .single();
    if (fetchErr || !player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const rawData = (player.raw_data as Record<string, any>) || {};
    const prevWatched: number = Number(rawData.adKeysWatched) || 0;
    const newWatched = prevWatched + 1;

    // Grant a key whenever the new total crosses a 2-ad boundary.
    // This handles every multiple of 2 — no off-by-one, no missed grants.
    const prevKeysFromAds = Math.floor(prevWatched / ADS_PER_KEY);
    const newKeysFromAds = Math.floor(newWatched / ADS_PER_KEY);
    const keysGranted = newKeysFromAds - prevKeysFromAds;

    const newKeys = (player.keys || 0) + keysGranted;
    const newRawData = { ...rawData, adKeysWatched: newWatched };

    const { error: updateErr } = await db
      .from('players')
      .update({
        keys: newKeys,
        raw_data: newRawData,
      })
      .eq('id', player.id);

    if (updateErr) {
      console.error('[Economy ad-key-watch] update error:', updateErr);
      return res.status(500).json({ error: 'Failed to record ad watch' });
    }

    if (keysGranted > 0) {
      console.log(`[Economy] ${userId.slice(-8)}: +${keysGranted}🔑 (ad_reward) → ${newKeys} total | adsWatched=${newWatched}`);
    }

    return res.json({
      success: true,
      adsWatched: newWatched,
      keysGranted,
      totalKeys: newKeys,
      adsPerKey: ADS_PER_KEY,
    });
  } catch (err) {
    console.error('[Economy ad-key-watch]', err);
    return res.status(500).json({ error: 'Failed to record ad watch' });
  }
});

// ── GET /ad-key-progress — Get current ad-watch progress for the user ──
router.get('/ad-key-progress', async (req: Request, res: Response) => {
  const userId = getAuthenticatedUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const db = supabaseServer() as any;
    const { data, error } = await db
      .from('players')
      .select('raw_data')
      .eq('supabase_id', userId)
      .single();
    if (error || !data) {
      return res.status(404).json({ error: 'Player not found' });
    }
    const rawData = (data.raw_data as Record<string, any>) || {};
    const adsWatched: number = Number(rawData.adKeysWatched) || 0;
    return res.json({ adsWatched, adsPerKey: 2 });
  } catch (err) {
    console.error('[Economy ad-key-progress]', err);
    return res.status(500).json({ error: 'Failed to fetch ad-key progress' });
  }
});

// ── POST /grant-keys — Server-validated key granting (for workout rewards, etc.) ──
router.post('/grant-keys', async (req: Request, res: Response) => {
  const userId = getAuthenticatedUserId(req);
  if (!userId) {
    // Diagnostic: surface why auth failed so we can tell whether the JWT was
    // missing, invalid, or expired vs the session being dead.
    const authHeader = req.headers['authorization'];
    const hasBearer = typeof authHeader === 'string' && authHeader.startsWith('Bearer ');
    const hasSession = !!(req.session as any)?.userId;
    console.warn(
      '[Economy grant-keys] 401 Unauthorized',
      JSON.stringify({
        hasBearer,
        bearerLen: hasBearer ? (authHeader as string).slice(7).length : 0,
        hasSession,
        source: req.body?.source,
        ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip,
      }),
    );
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { amount, source } = req.body;
  if (typeof amount !== 'number' || amount <= 0 || amount > 5) {
    return res.status(400).json({ error: 'Invalid key amount (1-5)' });
  }

  // Validate source to prevent abuse
  const VALID_SOURCES = ['workout_reward', 'leaderboard_reward', 'achievement', 'ad_reward'];
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

