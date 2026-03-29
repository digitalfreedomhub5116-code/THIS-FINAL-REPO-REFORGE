import { Router, Request, Response } from 'express';
import { supabaseServer } from '../lib/supabase.js';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const { data, error } = await (supabaseServer() as any)
      .from('players')
      .select('username, name, total_xp, level, rank, raw_data')
      .order('total_xp', { ascending: false })
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
      level: row.level,
      rank: row.rank,
      equipped_outfit_id: row.raw_data?.equippedOutfitId || 'outfit_starter',
    }));

    return res.json(entries);
  } catch (err) {
    console.error('[Leaderboard GET]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
