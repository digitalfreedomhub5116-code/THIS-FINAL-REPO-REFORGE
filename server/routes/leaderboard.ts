import { Router, Request, Response } from 'express';
import { supabaseServer } from '../lib/supabase.js';

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
      .select('id, supabase_id, username, name, total_xp, daily_xp, level, rank, raw_data, updated_at')
      .order(type === 'daily' ? 'daily_xp' : 'total_xp', { ascending: false })
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
        equipped_outfit_id: row.raw_data?.equippedOutfitId || 'outfit_starter',
      };
    });

    // For daily tab, re-sort since we may have zeroed out some daily_xp values
    if (type === 'daily') {
      entries.sort((a: any, b: any) => b.daily_xp - a.daily_xp);
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
      .select('*')
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

// ── Claim a rank reward (mark as seen, animation played) ──
router.post('/rewards/claim', async (req: Request, res: Response) => {
  const { snapshotId } = req.body;
  if (!snapshotId) return res.status(400).json({ error: 'snapshotId required' });

  try {
    const { error } = await (supabaseServer() as any)
      .from('daily_rank_snapshots')
      .update({ claimed: true })
      .eq('id', snapshotId);

    if (error) {
      console.error('[Leaderboard Rewards Claim]', error);
      return res.status(500).json({ error: 'Internal server error' });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('[Leaderboard Rewards Claim]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
