import { Router, Request, Response } from 'express';
import { supabaseServer } from '../lib/supabase.js';
import { getAuthenticatedUserId } from '../lib/playerAuth.js';
// ── Inline safeLevelUp (mirrors lib/levelSystem.ts) ──
function computeRank(level: number): string {
  if (level >= 80) return 'S';
  if (level >= 55) return 'A';
  if (level >= 39) return 'B';
  if (level >= 27) return 'C';
  if (level >= 11) return 'D';
  return 'E';
}
function safeLevelUp(currentXp: number, requiredXp: number, level: number) {
  if (!requiredXp || requiredXp < 50) requiredXp = 100;
  let leveledUp = false;
  let iterations = 0;
  while (currentXp >= requiredXp && iterations < 100) {
    currentXp -= requiredXp;
    level++;
    const next = Math.floor(requiredXp * 1.5);
    requiredXp = next > requiredXp ? next : requiredXp + 1;
    leveledUp = true;
    iterations++;
  }
  return { currentXp, requiredXp, level, leveledUp, rank: computeRank(level) };
}

const router = Router();

// Get today's date string in UTC (midnight boundary)
function todayStartUTC(): string {
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  return now.toISOString();
}

router.get('/', async (req: Request, res: Response) => {
  const type = (req.query.type as string) || 'global';

  try {
    // For daily: we need updated_at to check if daily_xp is stale
    const { data, error } = await (supabaseServer() as any)
      .from('players')
      .select('id, supabase_id, username, name, total_xp, daily_xp, level, rank, streak, avatar_url, raw_data, updated_at')
      .eq('is_banned', false)
      .order('streak', { ascending: false })
      .limit(100);

    if (error) {
      console.error('[Leaderboard GET]', error);
      return res.status(500).json({ error: 'Internal server error' });
    }

    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayStartMs = todayStart.getTime();

    const entries = (data || []).map((row: any) => {
      // If player hasn't synced today, their daily_xp is stale → treat as 0
      const lastUpdated = row.updated_at ? new Date(row.updated_at).getTime() : 0;
      const isSyncedToday = lastUpdated >= todayStartMs;
      const effectiveDailyXp = isSyncedToday ? (row.daily_xp || 0) : 0;

      return {
        player_id: row.id,
        supabase_id: row.supabase_id,
        username: row.username,
        name: row.name,
        total_xp: row.total_xp || 0,
        daily_xp: effectiveDailyXp,
        level: row.level || 1,
        rank: row.rank || 'E',
        streak: row.streak || 0,
        avatar_url: row.avatar_url || null,
        equipped_outfit_id: row.raw_data?.equippedOutfitId || 'outfit_starter',
        equipped_border: row.raw_data?.equippedBorder || null,
      };
    });

    // For daily tab, re-sort since we may have zeroed out some daily_xp values
    if (type === 'daily') {
      entries.sort((a: any, b: any) => b.streak - a.streak);
    }

    return res.json(entries);
  } catch (err) {
    console.error('[Leaderboard GET]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Check for unclaimed rank rewards for a specific player ──
router.get('/rewards', async (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  try {
    const db = supabaseServer() as any;

    // Translate userId (Google OAuth numeric ID / supabase_id) to internal DB UUID
    const { data: playerRow, error: playerErr } = await db
      .from('players')
      .select('id')
      .eq('supabase_id', userId)
      .limit(1)
      .single();

    if (playerErr || !playerRow) {
      // Player not found — no rewards to show
      return res.json({ reward: null });
    }

    const internalId: string = playerRow.id;

    const { data, error } = await db
      .from('daily_rank_snapshots')
      .select('id, player_id, snapshot_date, rank, daily_xp, reward_gold, reward_xp, reward_keys, claimed')
      .eq('player_id', internalId)
      .eq('claimed', false)
      .order('snapshot_date', { ascending: false })
      .limit(1);

    if (error) {
      console.error('[Leaderboard Rewards GET]', error);
      return res.status(500).json({ error: 'Internal server error' });
    }

    if (!data || data.length === 0) {
      return res.json({ reward: null });
    }

    return res.json({ reward: data[0] });
  } catch (err) {
    console.error('[Leaderboard Rewards GET]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Claim a rank reward: auth-gated, credits rewards server-side, prevents double-claim ──
router.post('/rewards/claim', async (req: Request, res: Response) => {
  const authUserId = getAuthenticatedUserId(req);
  if (!authUserId) return res.status(401).json({ error: 'Unauthorized' });

  const { snapshotId } = req.body;
  if (!snapshotId) return res.status(400).json({ error: 'snapshotId required' });

  try {
    const db = supabaseServer() as any;

    // 1. Fetch snapshot and verify it exists + not already claimed
    const { data: snapshot, error: snapErr } = await db
      .from('daily_rank_snapshots')
      .select('id, player_id, reward_gold, reward_xp, reward_keys, claimed')
      .eq('id', snapshotId)
      .single();

    if (snapErr || !snapshot) {
      return res.status(404).json({ error: 'Snapshot not found' });
    }
    if (snapshot.claimed) {
      return res.json({ success: true, already_claimed: true });
    }

    // 2. Verify the requesting user owns this snapshot
    const { data: playerRow, error: playerErr } = await db
      .from('players')
      .select('id, gold, keys, total_xp, current_xp, required_xp, daily_xp, level, rank')
      .eq('supabase_id', authUserId)
      .single();

    if (playerErr || !playerRow) {
      return res.status(403).json({ error: 'Player not found' });
    }
    if (playerRow.id !== snapshot.player_id) {
      return res.status(403).json({ error: 'Forbidden — snapshot does not belong to you' });
    }

    // 3. Credit rewards to the player's DB account
    const rewardXp = snapshot.reward_xp || 0;
    const newGold = (playerRow.gold || 0) + (snapshot.reward_gold || 0);
    const newKeys = (playerRow.keys || 0) + (snapshot.reward_keys || 0);
    const newTotalXp = (playerRow.total_xp || 0) + rewardXp;
    const newDailyXp = (playerRow.daily_xp || 0) + rewardXp;

    // Run safeLevelUp to handle overflow into level-ups
    const lu = safeLevelUp(
      (playerRow.current_xp || 0) + rewardXp,
      playerRow.required_xp || 100,
      playerRow.level || 1
    );

    const { error: creditErr } = await db
      .from('players')
      .update({
        gold: newGold,
        keys: newKeys,
        total_xp: newTotalXp,
        daily_xp: newDailyXp,
        current_xp: lu.currentXp,
        required_xp: lu.requiredXp,
        level: lu.level,
        rank: lu.rank,
      })
      .eq('id', playerRow.id);

    if (creditErr) {
      console.error('[Leaderboard Rewards Claim] Credit failed:', creditErr);
      return res.status(500).json({ error: 'Failed to credit rewards' });
    }

    // 4. Mark snapshot as claimed
    const { error: claimErr } = await db
      .from('daily_rank_snapshots')
      .update({ claimed: true })
      .eq('id', snapshotId);

    if (claimErr) {
      console.error('[Leaderboard Rewards Claim] Mark claimed failed:', claimErr);
    }

    console.log(`[Leaderboard Claim] Player ${authUserId} claimed rank reward: +${snapshot.reward_gold}G, +${snapshot.reward_xp}XP, +${snapshot.reward_keys}K (lvl ${lu.level})`);
    return res.json({
      success: true,
      rewards: { gold: snapshot.reward_gold, xp: snapshot.reward_xp, keys: snapshot.reward_keys },
      player: { gold: newGold, keys: newKeys, currentXp: lu.currentXp, requiredXp: lu.requiredXp, level: lu.level, rank: lu.rank, totalXp: newTotalXp, dailyXp: newDailyXp },
    });
  } catch (err) {
    console.error('[Leaderboard Rewards Claim]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
