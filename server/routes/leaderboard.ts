import { Router, Request, Response } from 'express';
import { supabaseServer } from '../lib/supabase.js';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const { data, error } = await (supabaseServer() as any)
      .from('leaderboard_cache')
      .select('username, name, total_xp, level, rank')
      .order('total_xp', { ascending: false })
      .limit(100);

    if (error) {
      console.error('[Leaderboard GET]', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
    return res.json(data || []);
  } catch (err) {
    console.error('[Leaderboard GET]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
