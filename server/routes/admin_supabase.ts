import { Router, Request, Response } from 'express';
import { supabaseServer } from '../lib/supabase.js';

const router = Router();

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'system_admin_2025';
const USD_TO_INR = 83.5;

function requireAdmin(req: Request, res: Response): boolean {
  const auth = req.headers['x-admin-token'];
  if (auth !== ADMIN_SECRET) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

router.post('/verify', (req: Request, res: Response) => {
  const { password } = req.body;
  if (password === ADMIN_SECRET) {
    return res.json({ authorized: true });
  }
  return res.status(401).json({ authorized: false, error: 'Invalid credentials' });
});

router.get('/users', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { data, error } = await (supabaseServer() as any)
      .from('players')
      .select('supabase_id, username, name, level, total_xp, rank, gold, keys, streak, is_banned, cheat_strikes, updated_at')
      .order('updated_at', { ascending: false })
      .limit(200);
    
    if (error) throw error;
    return res.json(data || []);
  } catch (err) {
    console.error('[Admin users]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/users/:id/ban', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const { id } = req.params;
  try {
    // First get current user data
    const { data: userData, error: fetchError } = await (supabaseServer() as any)
      .from('players')
      .select('cheat_strikes')
      .eq('supabase_id', id)
      .single();
    
    if (fetchError) throw fetchError;
    
    const newStrikes = (userData?.cheat_strikes || 0) + 1;
    const isBanned = newStrikes >= 5;
    
    const { data, error } = await (supabaseServer() as any)
      .from('players')
      .update({
        cheat_strikes: newStrikes,
        is_banned: isBanned,
        raw_data: {
          cheatStrikes: newStrikes,
          isBanned: isBanned
        }
      })
      .eq('supabase_id', id)
      .select()
      .single();
    
    if (error) throw error;
    return res.json(data);
  } catch (err) {
    console.error('[Admin ban user]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/users/:id/givegold', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const { id } = req.params;
  const { amount } = req.body;
  if (!amount || isNaN(amount)) return res.status(400).json({ error: 'Invalid amount' });
  try {
    const { data, error } = await (supabaseServer() as any)
      .from('players')
      .select('gold')
      .eq('supabase_id', id)
      .single();
    
    if (error) throw error;
    
    const newGold = Math.max(0, (data?.gold || 0) + parseInt(amount));
    
    const { data: updatedData, error: updateError } = await (supabaseServer() as any)
      .from('players')
      .update({ gold: newGold })
      .eq('supabase_id', id)
      .select('gold')
      .single();
    
    if (updateError) throw updateError;
    return res.json({ success: true, gold: updatedData?.gold });
  } catch (err) {
    console.error('[Admin give gold]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/users/:id/givekeys', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const { id } = req.params;
  const { amount } = req.body;
  if (!amount || isNaN(amount)) return res.status(400).json({ error: 'Invalid amount' });
  try {
    const { data, error } = await (supabaseServer() as any)
      .from('players')
      .select('keys')
      .eq('supabase_id', id)
      .single();
    
    if (error) throw error;
    
    const newKeys = Math.max(0, (data?.keys || 0) + parseInt(amount));
    
    const { data: updatedData, error: updateError } = await (supabaseServer() as any)
      .from('players')
      .update({ keys: newKeys })
      .eq('supabase_id', id)
      .select('keys')
      .single();
    
    if (updateError) throw updateError;
    return res.json({ success: true, keys: updatedData?.keys });
  } catch (err) {
    console.error('[Admin give keys]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Store outfit management
router.get('/store/outfits', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { data, error } = await (supabaseServer() as any)
      .from('store_outfits')
      .select('*')
      .order('display_order', { ascending: true })
      .order('id', { ascending: true });
    
    if (error) throw error;
    return res.json(data || []);
  } catch (err) {
    console.error('[Admin store outfits]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/store/outfits', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const outfit = req.body;
  try {
    const { data, error } = await (supabaseServer() as any)
      .from('store_outfits')
      .insert(outfit)
      .select()
      .single();
    
    if (error) throw error;
    return res.json(data);
  } catch (err) {
    console.error('[Admin create outfit]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/store/outfits/:id', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const { id } = req.params;
  const outfit = req.body;
  try {
    const { data, error } = await (supabaseServer() as any)
      .from('store_outfits')
      .update(outfit)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return res.json(data);
  } catch (err) {
    console.error('[Admin update outfit]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/store/outfits/:id', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const { id } = req.params;
  try {
    const { error } = await (supabaseServer() as any)
      .from('store_outfits')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return res.json({ success: true });
  } catch (err) {
    console.error('[Admin delete outfit]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Workout exercises management
router.get('/exercises', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { data, error } = await (supabaseServer() as any)
      .from('workout_exercises')
      .select('*')
      .order('display_order', { ascending: true })
      .order('id', { ascending: true });
    
    if (error) throw error;
    return res.json(data || []);
  } catch (err) {
    console.error('[Admin exercises]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/exercises', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const exercise = req.body;
  try {
    const { data, error } = await (supabaseServer() as any)
      .from('workout_exercises')
      .insert(exercise)
      .select()
      .single();
    
    if (error) throw error;
    return res.json(data);
  } catch (err) {
    console.error('[Admin create exercise]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/exercises/:id', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const { id } = req.params;
  const exercise = req.body;
  try {
    const { data, error } = await (supabaseServer() as any)
      .from('workout_exercises')
      .update(exercise)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return res.json(data);
  } catch (err) {
    console.error('[Admin update exercise]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/exercises/:id', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const { id } = req.params;
  try {
    const { error } = await (supabaseServer() as any)
      .from('workout_exercises')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return res.json({ success: true });
  } catch (err) {
    console.error('[Admin delete exercise]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
