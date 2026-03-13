import { Router, Request, Response } from 'express';
import { supabaseServer } from '../lib/supabase.js';

const router = Router();
const ADMIN_SECRET = process.env.ADMIN_PASSWORD || 'system_admin_2025';

router.get('/', async (_req: Request, res: Response) => {
  try {
    const { data, error } = await (supabaseServer() as any)
      .from('global_videos')
      .select('key, url')
      .order('key');
    if (error) {
      console.error('[Videos GET]', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
    const videoMap: Record<string, string> = {};
    if (data) data.forEach((row: { key: string; url: string }) => { videoMap[row.key] = row.url; });
    return res.json(videoMap);
  } catch (err) {
    console.error('[Videos GET]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/', async (req: Request, res: Response) => {
  const raw = req.headers['x-admin-token'];
  const token = Array.isArray(raw) ? raw[0] : raw;
  if (token !== ADMIN_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const videos = req.body;
    if (!videos || typeof videos !== 'object') {
      return res.status(400).json({ error: 'Invalid body — expected { key: url } map' });
    }
    
    // Clear existing videos
    await (supabaseServer() as any)
      .from('global_videos')
      .delete()
      .neq('key', null);
    
    // Insert new videos
    const videoEntries = Object.entries(videos)
      .filter(([_, url]) => typeof url === 'string')
      .map(([key, url]) => ({ key, url, updated_at: new Date().toISOString() }));
    
    if (videoEntries.length > 0) {
      const { error } = await (supabaseServer() as any)
        .from('global_videos')
        .upsert(videoEntries);
      if (error) {
        console.error('[Videos PUT]', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
    }
    
    return res.json({ success: true });
  } catch (err) {
    console.error('[Videos PUT]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
