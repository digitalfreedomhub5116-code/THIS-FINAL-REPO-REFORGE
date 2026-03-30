import { Router, Request, Response } from 'express';
import { supabaseServer } from '../lib/supabase.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const type = (req.query.type as string) || 'global';

  try {
    const orderColumn = type === 'daily' ? 'daily_xp' : 'total_xp';

    const { data, error } = await (supabaseServer() as any)
      .from('players')
      .select('username, name, total_xp, daily_xp, level, rank, raw_data')
      .order(orderColumn, { ascending: false })
      .limit(100);

    if (error) {
      console.error('[Leaderboard GET]', error);
      return res.status(500).json({ error: 'Internal server error' });
    }

    // Extract equippedOutfitId from raw_data and return as a flat field
    const entries = (data || []).map((row: any) => ({
      username: row.username,
      name: row.name,
      total_xp: row.total_xp,
      daily_xp: row.daily_xp || 0,
      level: row.level,
      rank: row.rank,
      equipped_outfit_id: row.raw_data?.equippedOutfitId || 'outfit_starter',
    }));

    // For daily leaderboard, filter out users with 0 daily XP
    const filtered = type === 'daily'
      ? entries.filter((e: any) => e.daily_xp > 0)
      : entries;

    return res.json(filtered);
  } catch (err) {
    console.error('[Leaderboard GET]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
