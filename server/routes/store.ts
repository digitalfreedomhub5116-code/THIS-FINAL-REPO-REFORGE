import { Router, Request, Response } from 'express';
import { supabaseServer } from '../lib/supabase.js';

const router = Router();
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'system_admin_2025';

function isAdmin(req: Request, res: Response): boolean {
  const raw = req.headers['x-admin-token'];
  const token = Array.isArray(raw) ? raw[0] : raw;
  if (token !== ADMIN_SECRET) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

// GET /api/store/outfits — public
router.get('/outfits', async (_req: Request, res: Response) => {
  try {
    const { data, error } = await (supabaseServer() as any)
      .from('store_outfits')
      .select('*')
      .order('display_order', { ascending: true })
      .order('id', { ascending: true });
    if (error) throw error;
    return res.json(data || []);
  } catch (err) {
    console.error('[Store] GET outfits error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/store/outfits — admin
router.post('/outfits', async (req: Request, res: Response) => {
  if (!isAdmin(req, res)) return;
  const {
    outfit_key, name, description = '', tier = 'E', cost = 0,
    accent_color = '#9ca3af', image_url = '', intro_video_url = '', loop_video_url = '',
    attack = 0, boost = 0, extraction = 0, ultimate = 0,
    is_default = false, display_order = 0,
  } = req.body;

  if (!outfit_key || !name) {
    return res.status(400).json({ error: 'outfit_key and name are required' });
  }

  try {
    const { data, error } = await (supabaseServer() as any)
      .from('store_outfits')
      .insert({ outfit_key, name, description, tier, cost, accent_color, image_url, intro_video_url, loop_video_url, attack, boost, extraction, ultimate, is_default, display_order })
      .select()
      .single();
    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'outfit_key already exists' });
      throw error;
    }
    return res.json(data);
  } catch (err: any) {
    console.error('[Store] POST outfit error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/store/outfits/:id — admin
router.put('/outfits/:id', async (req: Request, res: Response) => {
  if (!isAdmin(req, res)) return;
  const { id } = req.params;
  const {
    name, description, tier, cost, accent_color, image_url,
    intro_video_url, loop_video_url,
    attack, boost, extraction, ultimate,
    is_default, display_order,
  } = req.body;

  try {
    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (tier !== undefined) updates.tier = tier;
    if (cost !== undefined) updates.cost = cost;
    if (accent_color !== undefined) updates.accent_color = accent_color;
    if (image_url !== undefined) updates.image_url = image_url;
    if (intro_video_url !== undefined) updates.intro_video_url = intro_video_url;
    if (loop_video_url !== undefined) updates.loop_video_url = loop_video_url;
    if (attack !== undefined) updates.attack = attack;
    if (boost !== undefined) updates.boost = boost;
    if (extraction !== undefined) updates.extraction = extraction;
    if (ultimate !== undefined) updates.ultimate = ultimate;
    if (is_default !== undefined) updates.is_default = is_default;
    if (display_order !== undefined) updates.display_order = display_order;

    const { data, error } = await (supabaseServer() as any)
      .from('store_outfits')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Outfit not found' });
    return res.json(data);
  } catch (err) {
    console.error('[Store] PUT outfit error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/store/outfits/:id — admin
router.delete('/outfits/:id', async (req: Request, res: Response) => {
  if (!isAdmin(req, res)) return;
  const { id } = req.params;
  try {
    const { data: check, error: checkErr } = await (supabaseServer() as any)
      .from('store_outfits')
      .select('is_default')
      .eq('id', id)
      .single();
    if (checkErr || !check) return res.status(404).json({ error: 'Outfit not found' });
    if (check.is_default) {
      return res.status(400).json({ error: 'Cannot delete the default outfit. Set another outfit as default first.' });
    }
    await (supabaseServer() as any)
      .from('store_outfits')
      .delete()
      .eq('id', id);
    return res.json({ success: true });
  } catch (err) {
    console.error('[Store] DELETE outfit error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/store/outfits/:id/set-default — admin
router.post('/outfits/:id/set-default', async (req: Request, res: Response) => {
  if (!isAdmin(req, res)) return;
  const { id } = req.params;
  try {
    await (supabaseServer() as any)
      .from('store_outfits')
      .update({ is_default: false })
      .neq('id', 0);
    const { data, error } = await (supabaseServer() as any)
      .from('store_outfits')
      .update({ is_default: true })
      .eq('id', id)
      .select()
      .single();
    if (error || !data) return res.status(404).json({ error: 'Outfit not found' });
    return res.json(data);
  } catch (err) {
    console.error('[Store] SET DEFAULT error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
