import { Router, Request, Response } from 'express';
import { query } from '../db/pool.js';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await query('SELECT key, url FROM global_videos ORDER BY key');
    const videoMap: Record<string, string> = {};
    result.rows.forEach((row: { key: string; url: string }) => {
      videoMap[row.key] = row.url;
    });
    return res.json(videoMap);
  } catch (err) {
    console.error('[Videos GET]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/', async (req: Request, res: Response) => {
  const videos = req.body;
  if (!videos || typeof videos !== 'object') {
    return res.status(400).json({ error: 'Invalid body — expected { key: url } map' });
  }

  try {
    for (const [key, url] of Object.entries(videos)) {
      if (typeof url !== 'string') continue;
      await query(
        `INSERT INTO global_videos (key, url, updated_at) VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET url = EXCLUDED.url, updated_at = NOW()`,
        [key, url]
      );
    }
    return res.json({ success: true });
  } catch (err) {
    console.error('[Videos PUT]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
