import { Router, Request, Response } from 'express';
import { supabaseServer } from '../lib/supabase.js';
import { requireAdmin } from '../lib/adminAuth.js';

const router = Router();

router.get('/:key', async (req: Request, res: Response) => {
  const { key } = req.params;
  try {
    const { data, error } = await (supabaseServer() as any)
      .from('global_config')
      .select('value')
      .eq('key', key)
      .single();
    if (error && (error.code === 'PGRST116' || error.code === '42P01')) return res.json({});
    if (error) {
      console.error('[GlobalConfig GET]', error);
      return res.json({}); // Return empty rather than 500 for missing tables
    }
    if (!data) return res.json({});
    try {
      return res.json(JSON.parse((data as any).value));
    } catch {
      return res.json((data as any).value);
    }
  } catch (err: any) {
    console.error('[GlobalConfig GET]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:key', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const { key } = req.params;
  try {
    const { value } = req.body;
    const { error } = await (supabaseServer() as any)
      .from('global_config')
      .upsert({ key, value, updated_at: new Date().toISOString() })
      .eq('key', key)
      .single();
    if (error) {
      console.error('[GlobalConfig PUT]', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
    return res.json({ success: true });
  } catch (err: any) {
    console.error('[GlobalConfig PUT]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
