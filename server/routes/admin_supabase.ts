import { Router, Request, Response } from 'express';
import { supabaseServer } from '../lib/supabase.js';
import { generateAdminToken, requireAdmin } from '../lib/adminAuth.js';

const router = Router();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD!;
const USD_TO_INR = 83.5;

const MAX_ATTEMPTS = 3;
const BLOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes

function getClientIp(req: Request): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
}

// ── FIX 3: Audit log helper ────────────────────────────────
async function logAdminAction(
  action: string,
  req: Request,
  opts: { targetUser?: string | string[]; oldValue?: any; newValue?: any } = {}
) {
  try {
    await (supabaseServer() as any).from('admin_audit_log').insert({
      admin_id: 'admin',
      action,
      target_user: opts.targetUser || null,
      old_value: opts.oldValue || null,
      new_value: opts.newValue || null,
      ip_address: getClientIp(req),
    });
  } catch (err) {
    console.error('[AuditLog] Failed to write:', err);
  }
}

// ── FIX 4: Supabase-persisted IP lockout ───────────────────
router.post('/verify', async (req: Request, res: Response) => {
  const ip = getClientIp(req);
  const sb = supabaseServer() as any;

  // Check if IP is currently blocked (persisted in Supabase)
  const { data: record } = await sb
    .from('admin_failed_logins')
    .select('attempt_count, blocked_until')
    .eq('ip_address', ip)
    .single();

  if (record?.blocked_until && new Date(record.blocked_until) > new Date()) {
    const remainMin = Math.ceil((new Date(record.blocked_until).getTime() - Date.now()) / 60000);
    return res.status(429).json({ authorized: false, error: `IP blocked. Try again in ${remainMin} minute(s).`, blocked: true });
  }

  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    // Success — clear any failed attempt record
    await sb.from('admin_failed_logins').delete().eq('ip_address', ip);
    const token = generateAdminToken();
    await logAdminAction('admin_login', req);
    return res.json({ authorized: true, token });
  }

  // Track failure in Supabase
  const currentCount = (record?.attempt_count || 0) + 1;
  const blocked = currentCount >= MAX_ATTEMPTS
    ? new Date(Date.now() + BLOCK_DURATION_MS).toISOString()
    : null;

  await sb.from('admin_failed_logins').upsert({
    ip_address: ip,
    attempt_count: currentCount,
    blocked_until: blocked,
    last_attempt: new Date().toISOString(),
  });

  if (currentCount >= MAX_ATTEMPTS) {
    return res.status(429).json({ authorized: false, error: 'Too many failed attempts. IP blocked for 30 minutes.', blocked: true });
  }
  const remaining = MAX_ATTEMPTS - currentCount;
  return res.status(401).json({ authorized: false, error: `ACCESS DENIED. ${remaining} attempt(s) remaining.` });
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
    await logAdminAction('ban_user', req, { targetUser: id, oldValue: { cheat_strikes: userData?.cheat_strikes || 0 }, newValue: { cheat_strikes: newStrikes, is_banned: isBanned } });
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
    await logAdminAction('give_gold', req, { targetUser: id, oldValue: { gold: data?.gold || 0 }, newValue: { gold: newGold } });
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
    await logAdminAction('give_keys', req, { targetUser: id, oldValue: { keys: data?.keys || 0 }, newValue: { keys: newKeys } });
    return res.json({ success: true, keys: updatedData?.keys });
  } catch (err) {
    console.error('[Admin give keys]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/users/:id', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const { id } = req.params;
  try {
    const { error } = await (supabaseServer() as any)
      .from('players')
      .delete()
      .eq('supabase_id', id);
    if (error) throw error;
    await logAdminAction('delete_user', req, { targetUser: id });
    return res.json({ success: true });
  } catch (err) {
    console.error('[Admin delete user]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/users/:id/data', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const { id } = req.params;
  try {
    const { data, error } = await (supabaseServer() as any)
      .from('players')
      .select('*')
      .eq('supabase_id', id)
      .single();
    if (error) throw error;
    return res.json(data);
  } catch (err) {
    console.error('[Admin user data]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/users/:id/adjust-strikes', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const { id } = req.params;
  const { delta } = req.body; // +1 or -1
  if (delta !== 1 && delta !== -1) return res.status(400).json({ error: 'delta must be 1 or -1' });
  try {
    const { data: current, error: fetchError } = await (supabaseServer() as any)
      .from('players')
      .select('cheat_strikes, is_banned')
      .eq('supabase_id', id)
      .single();
    if (fetchError) throw fetchError;

    const newStrikes = Math.max(0, Math.min(5, (current?.cheat_strikes || 0) + delta));
    const isBanned = newStrikes >= 5;

    const { data, error } = await (supabaseServer() as any)
      .from('players')
      .update({ cheat_strikes: newStrikes, is_banned: isBanned })
      .eq('supabase_id', id)
      .select('supabase_id, cheat_strikes, is_banned')
      .single();
    if (error) throw error;
    await logAdminAction('adjust_strikes', req, { targetUser: id, oldValue: { cheat_strikes: current?.cheat_strikes || 0, is_banned: current?.is_banned }, newValue: { cheat_strikes: newStrikes, is_banned: isBanned, delta } });
    return res.json({ success: true, cheat_strikes: data.cheat_strikes, is_banned: data.is_banned });
  } catch (err) {
    console.error('[Admin adjust-strikes]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/users/:id/unban', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const { id } = req.params;
  try {
    const { data, error } = await (supabaseServer() as any)
      .from('players')
      .update({ is_banned: false, cheat_strikes: 0 })
      .eq('supabase_id', id)
      .select('supabase_id, username, is_banned, cheat_strikes')
      .single();
    if (error) throw error;
    await logAdminAction('unban_user', req, { targetUser: id, newValue: { is_banned: false, cheat_strikes: 0 } });
    return res.json({ success: true, user: data });
  } catch (err) {
    console.error('[Admin unban]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/users/:id/adjust-gold', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const { id } = req.params;
  const { amount } = req.body;
  if (amount === undefined || isNaN(amount)) return res.status(400).json({ error: 'Invalid amount' });
  try {
    const { data, error } = await (supabaseServer() as any)
      .from('players')
      .select('gold')
      .eq('supabase_id', id)
      .single();
    if (error) throw error;
    const newGold = Math.max(0, (data?.gold || 0) + parseInt(amount));
    const { data: updated, error: updateError } = await (supabaseServer() as any)
      .from('players')
      .update({ gold: newGold })
      .eq('supabase_id', id)
      .select('gold')
      .single();
    if (updateError) throw updateError;
    await logAdminAction('adjust_gold', req, { targetUser: id, oldValue: { gold: data?.gold || 0 }, newValue: { gold: newGold } });
    return res.json({ success: true, gold: updated?.gold });
  } catch (err) {
    console.error('[Admin adjust-gold]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/users/:id/adjust-keys', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const { id } = req.params;
  const { amount } = req.body;
  if (amount === undefined || isNaN(amount)) return res.status(400).json({ error: 'Invalid amount' });
  try {
    const { data, error } = await (supabaseServer() as any)
      .from('players')
      .select('keys')
      .eq('supabase_id', id)
      .single();
    if (error) throw error;
    const newKeys = Math.max(0, (data?.keys || 0) + parseInt(amount));
    const { data: updated, error: updateError } = await (supabaseServer() as any)
      .from('players')
      .update({ keys: newKeys })
      .eq('supabase_id', id)
      .select('keys')
      .single();
    if (updateError) throw updateError;
    await logAdminAction('adjust_keys', req, { targetUser: id, oldValue: { keys: data?.keys || 0 }, newValue: { keys: newKeys } });
    return res.json({ success: true, keys: updated?.keys });
  } catch (err) {
    console.error('[Admin adjust-keys]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/usage', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const period = (req.query.period as string) || 'month';

  try {
    // Date filter based on period
    let dateFilter: string | null = null;
    const now = new Date();
    if (period === 'today') {
      dateFilter = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    } else if (period === 'week') {
      dateFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    } else if (period === 'month') {
      dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    }

    let query = (supabaseServer() as any)
      .from('api_usage_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10000);
    if (dateFilter) query = query.gte('created_at', dateFilter);

    const { data: logs, error } = await query;
    if (error) throw error;
    const allLogs: any[] = logs || [];

    // Aggregates
    const totalCostUsd = allLogs.reduce((s: number, l: any) => s + (Number(l.cost_usd) || 0), 0);
    const totalCostInr = totalCostUsd * USD_TO_INR;
    const totalCalls = allLogs.length;
    const totalTokens = allLogs.reduce((s: number, l: any) => s + (Number(l.input_tokens) || 0) + (Number(l.output_tokens) || 0), 0);
    const uniqueUsers = new Set(allLogs.filter((l: any) => l.user_id).map((l: any) => l.user_id)).size;

    // By Model
    const modelMap: Record<string, { calls: number; input_tokens: number; output_tokens: number; cost_usd: number }> = {};
    allLogs.forEach((l: any) => {
      const m = l.model || 'unknown';
      if (!modelMap[m]) modelMap[m] = { calls: 0, input_tokens: 0, output_tokens: 0, cost_usd: 0 };
      modelMap[m].calls++;
      modelMap[m].input_tokens += Number(l.input_tokens) || 0;
      modelMap[m].output_tokens += Number(l.output_tokens) || 0;
      modelMap[m].cost_usd += Number(l.cost_usd) || 0;
    });
    const byModel = Object.entries(modelMap).map(([model, s]) => ({
      model, ...s, cost_inr: s.cost_usd * USD_TO_INR,
    })).sort((a, b) => b.cost_usd - a.cost_usd);

    // By Route
    const routeMap: Record<string, { calls: number; cost_usd: number }> = {};
    allLogs.forEach((l: any) => {
      const r = l.route || 'unknown';
      if (!routeMap[r]) routeMap[r] = { calls: 0, cost_usd: 0 };
      routeMap[r].calls++;
      routeMap[r].cost_usd += Number(l.cost_usd) || 0;
    });
    const byRoute = Object.entries(routeMap).map(([route, s]) => ({
      route, ...s, cost_inr: s.cost_usd * USD_TO_INR,
    })).sort((a, b) => b.cost_usd - a.cost_usd);

    // Time Series (daily)
    const dayMap: Record<string, number> = {};
    allLogs.forEach((l: any) => {
      const day = new Date(l.created_at).toISOString().split('T')[0];
      dayMap[day] = (dayMap[day] || 0) + (Number(l.cost_usd) || 0);
    });
    const timeSeries = Object.entries(dayMap)
      .map(([date, cost_usd]) => ({ date, cost_usd, cost_inr: cost_usd * USD_TO_INR }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Recent Logs (last 50)
    const recentLogs = allLogs.slice(0, 50);

    return res.json({
      totalCostUsd, totalCostInr, totalCalls, totalTokens, uniqueUsers,
      byModel, byRoute, timeSeries, recentLogs,
    });
  } catch (err) {
    console.error('[Admin usage]', err);
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
    await logAdminAction('create_outfit', req, { newValue: { id: data?.id, name: outfit.name } });
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
    await logAdminAction('update_outfit', req, { targetUser: id, newValue: { name: outfit.name } });
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
    await logAdminAction('delete_outfit', req, { targetUser: id });
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
    await logAdminAction('create_exercise', req, { newValue: { id: data?.id, name: exercise.name } });
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
    await logAdminAction('update_exercise', req, { targetUser: id, newValue: { name: exercise.name } });
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
    await logAdminAction('delete_exercise', req, { targetUser: id });
    return res.json({ success: true });
  } catch (err) {
    console.error('[Admin delete exercise]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
