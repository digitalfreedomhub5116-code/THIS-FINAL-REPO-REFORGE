import { Router, Request, Response } from 'express';
import { supabaseServer } from '../lib/supabase.js';
import { generateAdminToken, requireAdmin } from '../lib/adminAuth.js';

const router = Router();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD!;

// ── Live USD→INR exchange rate with 6-hour cache ──
let cachedRate = 85.0; // sensible fallback
let rateLastFetched = 0;
const RATE_CACHE_MS = 6 * 60 * 60 * 1000; // 6 hours

async function getUsdToInr(): Promise<number> {
  if (Date.now() - rateLastFetched < RATE_CACHE_MS && cachedRate > 0) return cachedRate;
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    if (res.ok) {
      const data = await res.json();
      if (data?.rates?.INR) {
        cachedRate = data.rates.INR;
        rateLastFetched = Date.now();
        console.log(`[Admin] Live USD/INR rate: ₹${cachedRate.toFixed(2)}`);
      }
    }
  } catch (err) {
    console.warn('[Admin] Failed to fetch live exchange rate, using cached:', cachedRate);
  }
  return cachedRate;
}

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
      .select('supabase_id, username, name, level, total_xp, rank, gold, keys, streak, is_banned, cheat_strikes, total_strikes_ever, updated_at')
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
    // First get current user data including raw_data to merge safely
    const { data: userData, error: fetchError } = await (supabaseServer() as any)
      .from('players')
      .select('cheat_strikes, total_strikes_ever, raw_data')
      .eq('supabase_id', id)
      .single();
    
    if (fetchError) throw fetchError;
    
    const newStrikes = (userData?.cheat_strikes || 0) + 1;
    const isBanned = newStrikes >= 5;
    const newTotalEver = (userData?.total_strikes_ever || 0) + 1;
    const updatedRawData = { ...(userData?.raw_data || {}), cheatStrikes: newStrikes, isBanned };
    
    const { data, error } = await (supabaseServer() as any)
      .from('players')
      .update({
        cheat_strikes: newStrikes,
        is_banned: isBanned,
        total_strikes_ever: newTotalEver,
        raw_data: updatedRawData
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
      .select('gold, raw_data')
      .eq('supabase_id', id)
      .single();
    
    if (error) throw error;
    
    const newGold = Math.max(0, (data?.gold || 0) + parseInt(amount));
    const updatedRawData = { ...(data?.raw_data || {}), gold: newGold };
    
    const { data: updatedData, error: updateError } = await (supabaseServer() as any)
      .from('players')
      .update({ gold: newGold, raw_data: updatedRawData })
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
      .select('keys, raw_data')
      .eq('supabase_id', id)
      .single();
    
    if (error) throw error;
    
    const newKeys = Math.max(0, (data?.keys || 0) + parseInt(amount));
    const updatedRawData = { ...(data?.raw_data || {}), keys: newKeys };
    
    const { data: updatedData, error: updateError } = await (supabaseServer() as any)
      .from('players')
      .update({ keys: newKeys, raw_data: updatedRawData })
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
    const sb = supabaseServer() as any;

    // 1. Get internal player ID for snapshot cleanup
    const { data: playerRow } = await sb
      .from('players')
      .select('id')
      .eq('supabase_id', id)
      .single();

    // 2. Delete player row from public.players table (CRITICAL — must succeed)
    const { error: deleteError } = await sb
      .from('players')
      .delete()
      .eq('supabase_id', id);
    if (deleteError) throw deleteError;

    // 3. Delete Supabase Auth user (best-effort — requires service_role key)
    try {
      const { error: authError } = await sb.auth.admin.deleteUser(id);
      if (authError) {
        console.warn('[Admin Delete] Auth user delete failed (non-critical):', authError.message);
      }
    } catch (authErr) {
      console.warn('[Admin Delete] Auth admin API unavailable:', (authErr as any)?.message);
    }

    // 4. Delete avatar from storage (best-effort)
    try {
      await sb.storage.from('avatars').remove([`avatars/${id}.webp`]);
    } catch { /* avatar may not exist */ }

    // 5. Delete leaderboard snapshots (best-effort)
    if (playerRow?.id) {
      try {
        await sb.from('daily_rank_snapshots').delete().eq('player_id', playerRow.id);
      } catch { /* snapshots may not exist */ }
    }

    await logAdminAction('delete_user', req, { targetUser: id });
    console.log(`[Admin Delete] User ${id} — account permanently deleted`);
    return res.json({ success: true, message: 'Account and all data permanently deleted.' });
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

// ── Rich user history: quests, XP log, goals, stats ──────
router.get('/users/:id/history', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const { id } = req.params;
  try {
    const sb = supabaseServer() as any;

    // 1. Get player data
    const { data: player, error } = await sb
      .from('players')
      .select('supabase_id, username, name, level, total_xp, current_xp, required_xp, rank, gold, keys, streak, hp, max_hp, mp, max_mp, fatigue, job, title, is_banned, cheat_strikes, country, timezone, created_at, updated_at, raw_data')
      .eq('supabase_id', id)
      .single();
    if (error) throw error;

    const raw = player?.raw_data || {};

    // 2. Extract quests
    const quests = (raw.quests || []).map((q: any) => ({
      id: q.id,
      title: q.title,
      description: q.description || '',
      rank: q.rank || 'E',
      category: q.category || '',
      categories: q.categories || [],
      xpReward: q.xpReward || 0,
      isCompleted: !!q.isCompleted,
      failed: !!q.failed,
      isDaily: !!q.isDaily,
      createdAt: q.createdAt,
      completedAt: q.completedAt,
      hasPact: !!q.hasPact,
      pactAmount: q.pactAmount || 0,
      pactStatus: q.pactStatus,
      goalId: q.goalId,
      goalTitle: q.goalTitle,
      estimatedDuration: q.estimatedDuration,
    }));

    // 3. Extract activity logs (XP earnings, loot, penalties, etc.)
    const logs = (raw.logs || []).map((l: any) => ({
      id: l.id,
      type: l.type,        // 'XP', 'LOOT', 'PENALTY', 'WARNING', 'SYSTEM', etc.
      message: l.message,
      timestamp: l.timestamp,
    }));

    // 4. Extract daily history snapshots
    const history = (raw.history || []).map((h: any) => ({
      date: h.date,
      dailyXp: h.dailyXp || 0,
      totalXp: h.totalXp || 0,
      questCompletion: h.questCompletion || 0,
      stats: h.stats || {},
    }));

    // 5. Fetch goals from dedicated table
    const { data: goals } = await sb
      .from('goals')
      .select('id, title, category, goal_rank, status, success_probability, streak, daily_commitment_min, total_duration_days, start_date, created_at')
      .eq('user_id', id)
      .order('created_at', { ascending: false });

    // 6. Player summary (non-raw_data fields)
    const summary = {
      supabase_id: player.supabase_id,
      username: player.username,
      name: player.name,
      level: player.level,
      totalXp: player.total_xp,
      currentXp: player.current_xp,
      requiredXp: player.required_xp,
      rank: player.rank,
      gold: player.gold,
      keys: player.keys,
      streak: player.streak,
      hp: player.hp,
      maxHp: player.max_hp,
      mp: player.mp,
      maxMp: player.max_mp,
      fatigue: player.fatigue,
      job: player.job,
      title: player.title,
      isBanned: player.is_banned,
      cheatStrikes: player.cheat_strikes,
      country: player.country,
      timezone: player.timezone,
      createdAt: player.created_at,
      updatedAt: player.updated_at,
      stats: raw.stats || {},
    };

    return res.json({
      summary,
      quests: quests.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0)),
      logs: logs.sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0)),
      history: history.sort((a: any, b: any) => (b.date || '').localeCompare(a.date || '')),
      goals: goals || [],
      questStats: {
        total: quests.length,
        completed: quests.filter((q: any) => q.isCompleted).length,
        failed: quests.filter((q: any) => q.failed).length,
        active: quests.filter((q: any) => !q.isCompleted && !q.failed).length,
        totalXpEarned: quests.filter((q: any) => q.isCompleted).reduce((s: number, q: any) => s + (q.xpReward || 0), 0),
      },
    });
  } catch (err) {
    console.error('[Admin user history]', err);
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
      .select('cheat_strikes, is_banned, total_strikes_ever, raw_data, pending_notifications')
      .eq('supabase_id', id)
      .single();
    if (fetchError) throw fetchError;

    const newStrikes = Math.max(0, Math.min(5, (current?.cheat_strikes || 0) + delta));
    const isBanned = newStrikes >= 5;
    const updatedRawData = { ...(current?.raw_data || {}), cheatStrikes: newStrikes, isBanned };
    // Only increment lifetime counter when adding a strike, never on removal
    const newTotalEver = delta === 1 ? (current?.total_strikes_ever || 0) + 1 : (current?.total_strikes_ever || 0);

    // When reducing a strike, push a pending notification for the user
    const pendingNotifs = Array.isArray(current?.pending_notifications) ? [...current.pending_notifications] : [];
    if (delta === -1) {
      pendingNotifs.push({ id: `strike_lifted_${Date.now()}`, type: 'strike_lifted', timestamp: new Date().toISOString() });
    }

    const { data, error } = await (supabaseServer() as any)
      .from('players')
      .update({ cheat_strikes: newStrikes, is_banned: isBanned, total_strikes_ever: newTotalEver, raw_data: updatedRawData, pending_notifications: pendingNotifs })
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
    // Read current raw_data to merge safely
    const { data: current, error: fetchError } = await (supabaseServer() as any)
      .from('players')
      .select('raw_data')
      .eq('supabase_id', id)
      .single();
    if (fetchError) throw fetchError;
    const updatedRawData = { ...(current?.raw_data || {}), cheatStrikes: 0, isBanned: false };

    const { data, error } = await (supabaseServer() as any)
      .from('players')
      .update({ is_banned: false, cheat_strikes: 0, raw_data: updatedRawData })
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
      .select('gold, raw_data')
      .eq('supabase_id', id)
      .single();
    if (error) throw error;
    const newGold = Math.max(0, (data?.gold || 0) + parseInt(amount));
    const updatedRawData = { ...(data?.raw_data || {}), gold: newGold };
    const { data: updated, error: updateError } = await (supabaseServer() as any)
      .from('players')
      .update({ gold: newGold, raw_data: updatedRawData })
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
      .select('keys, raw_data')
      .eq('supabase_id', id)
      .single();
    if (error) throw error;
    const newKeys = Math.max(0, (data?.keys || 0) + parseInt(amount));
    const updatedRawData = { ...(data?.raw_data || {}), keys: newKeys };
    const { data: updated, error: updateError } = await (supabaseServer() as any)
      .from('players')
      .update({ keys: newKeys, raw_data: updatedRawData })
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
    const USD_TO_INR = await getUsdToInr();

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

    // Fetch logs — use higher limit for all-time
    const logLimit = period === 'all' ? 5000 : 2000;
    let query = (supabaseServer() as any)
      .from('api_usage_logs')
      .select('id, route, cost_usd, model, input_tokens, output_tokens, success, user_id, created_at')
      .order('created_at', { ascending: false })
      .limit(logLimit);
    if (dateFilter) query = query.gte('created_at', dateFilter);

    const { data: logs, error } = await query;
    if (error) throw error;
    const allLogs: any[] = logs || [];

    // Aggregates
    const totalCostUsd = allLogs.reduce((s: number, l: any) => s + (Number(l.cost_usd) || 0), 0);
    const totalCostInr = totalCostUsd * USD_TO_INR;
    const totalCalls = allLogs.length;
    const totalTokens = allLogs.reduce((s: number, l: any) => s + (Number(l.input_tokens) || 0) + (Number(l.output_tokens) || 0), 0);
    const uniqueUserIds = [...new Set(allLogs.filter((l: any) => l.user_id).map((l: any) => l.user_id))];
    const uniqueUsers = uniqueUserIds.length;

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

    // By User — aggregate per user_id
    const userMap: Record<string, { calls: number; cost_usd: number; tokens: number; routes: Set<string>; lastCall: string }> = {};
    allLogs.forEach((l: any) => {
      const uid = l.user_id || 'anonymous';
      if (!userMap[uid]) userMap[uid] = { calls: 0, cost_usd: 0, tokens: 0, routes: new Set(), lastCall: '' };
      userMap[uid].calls++;
      userMap[uid].cost_usd += Number(l.cost_usd) || 0;
      userMap[uid].tokens += (Number(l.input_tokens) || 0) + (Number(l.output_tokens) || 0);
      userMap[uid].routes.add(l.route || 'unknown');
      if (!userMap[uid].lastCall || l.created_at > userMap[uid].lastCall) {
        userMap[uid].lastCall = l.created_at;
      }
    });

    // Lookup usernames for all user_ids
    const userIdsToLookup = Object.keys(userMap).filter(id => id !== 'anonymous');
    let usernameMap: Record<string, string> = {};
    if (userIdsToLookup.length > 0) {
      try {
        const { data: players } = await (supabaseServer() as any)
          .from('players')
          .select('supabase_id, username, name')
          .in('supabase_id', userIdsToLookup);
        if (players) {
          for (const p of players) {
            usernameMap[p.supabase_id] = p.username || p.name || p.supabase_id.substring(0, 8);
          }
        }
      } catch { /* username lookup is optional */ }
    }

    const byUser = Object.entries(userMap).map(([userId, s]) => ({
      userId,
      username: userId === 'anonymous' ? 'Anonymous (no auth)' : (usernameMap[userId] || userId.substring(0, 8) + '...'),
      calls: s.calls,
      cost_usd: s.cost_usd,
      cost_inr: s.cost_usd * USD_TO_INR,
      tokens: s.tokens,
      routes: [...s.routes],
      lastCall: s.lastCall,
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

    // Recent Logs (last 50) — include username
    const recentLogs = allLogs.slice(0, 50).map((l: any) => ({
      ...l,
      username: l.user_id ? (usernameMap[l.user_id] || l.user_id.substring(0, 8)) : null,
    }));

    return res.json({
      totalCostUsd, totalCostInr, totalCalls, totalTokens, uniqueUsers,
      exchangeRate: USD_TO_INR,
      byModel, byRoute, byUser, timeSeries, recentLogs,
    });
  } catch (err) {
    console.error('[Admin usage]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }

});

// In-memory rate limit for appeal submissions (IP → timestamps)
const appealRateMap = new Map<string, number[]>();
const APPEAL_RATE_LIMIT = 3;      // max appeals
const APPEAL_RATE_WINDOW = 3600000; // per hour

// POST /appeals — banned user submits an appeal (no auth required since they're banned)
router.post('/appeals', async (req: Request, res: Response) => {
  try {
    const { userId, username, message } = req.body;
    if (!userId || !message || message.trim().length < 20) {
      return res.status(400).json({ error: 'userId and message (min 20 chars) required' });
    }

    // Rate limit by IP
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const ipKey = String(ip);
    const now = Date.now();
    const timestamps = (appealRateMap.get(ipKey) || []).filter(t => now - t < APPEAL_RATE_WINDOW);
    if (timestamps.length >= APPEAL_RATE_LIMIT) {
      return res.status(429).json({ error: 'Too many appeals. Please try again later.' });
    }

    // Verify that the userId belongs to a real banned player
    const { data: player } = await (supabaseServer() as any)
      .from('players')
      .select('supabase_id, username, cheat_strikes, is_banned')
      .eq('supabase_id', userId)
      .single();

    if (!player) {
      return res.status(400).json({ error: 'Invalid user.' });
    }
    if ((player.cheat_strikes ?? 0) < 5 && !player.is_banned) {
      return res.status(400).json({ error: 'This account is not banned.' });
    }

    // Check for existing pending appeal
    const { data: existing } = await (supabaseServer() as any)
      .from('ban_appeals')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .limit(1);

    if (existing && existing.length > 0) {
      return res.status(409).json({ error: 'You already have a pending appeal. Please wait for review.' });
    }

    // Use server-verified username, not client-supplied
    const { data, error } = await (supabaseServer() as any)
      .from('ban_appeals')
      .insert({
        user_id: userId,
        username: player.username || username || 'Unknown',
        message: message.trim().substring(0, 500),
        status: 'pending',
      })
      .select('id, created_at')
      .single();

    if (error) throw error;

    // Record rate limit hit
    timestamps.push(now);
    appealRateMap.set(ipKey, timestamps);

    return res.json({ success: true, appealId: data.id });
  } catch (err: any) {
    console.error('[Appeals] Submit error:', err);
    return res.status(500).json({ error: 'Failed to submit appeal' });
  }
});

// GET /appeals — admin fetches all appeals
router.get('/appeals', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { data, error } = await (supabaseServer() as any)
      .from('ban_appeals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    return res.json(data || []);
  } catch (err) {
    console.error('[Appeals] Fetch error:', err);
    return res.status(500).json({ error: 'Failed to fetch appeals' });
  }
});

// POST /appeals/:id/resolve — admin approves or denies an appeal
router.post('/appeals/:id/resolve', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { status: newStatus, adminNote } = req.body;
    if (!['approved', 'denied'].includes(newStatus)) {
      return res.status(400).json({ error: 'status must be approved or denied' });
    }

    // Get the appeal to find the user_id
    const { data: appeal, error: fetchErr } = await (supabaseServer() as any)
      .from('ban_appeals')
      .select('user_id')
      .eq('id', req.params.id)
      .single();

    if (fetchErr || !appeal) return res.status(404).json({ error: 'Appeal not found' });

    // Update appeal status
    await (supabaseServer() as any)
      .from('ban_appeals')
      .update({
        status: newStatus,
        admin_note: adminNote || null,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', req.params.id);

    // If approved, unban the user (reset cheat_strikes and is_banned)
    if (newStatus === 'approved') {
      await (supabaseServer() as any)
        .from('players')
        .update({ cheat_strikes: 0, is_banned: false })
        .eq('supabase_id', appeal.user_id);
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('[Appeals] Resolve error:', err);
    return res.status(500).json({ error: 'Failed to resolve appeal' });
  }
});

// Store outfit management
router.get('/store/outfits', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { data, error } = await (supabaseServer() as any)
      .from('store_outfits')
      .select('id, outfit_key, name, description, tier, cost, accent_color, image_url, intro_video_url, loop_video_url, attack, boost, extraction, ultimate, is_default, display_order')
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

// ── Event Banners Management ─────────────────────────────
router.get('/banners', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { data, error } = await (supabaseServer() as any)
      .from('event_banners')
      .select('id, title, subtitle, image_url, link_url, accent_color, is_active, display_order')
      .order('display_order', { ascending: true })
      .order('id', { ascending: true });
    if (error) throw error;
    return res.json(data || []);
  } catch (err) {
    console.error('[Admin banners]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/banners', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const banner = req.body;
  try {
    const { data, error } = await (supabaseServer() as any)
      .from('event_banners')
      .insert(banner)
      .select()
      .single();
    if (error) throw error;
    await logAdminAction('create_banner', req, { newValue: { id: data?.id, title: banner.title } });
    return res.json(data);
  } catch (err) {
    console.error('[Admin create banner]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/banners/:id', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const { id } = req.params;
  const banner = req.body;
  try {
    const { data, error } = await (supabaseServer() as any)
      .from('event_banners')
      .update(banner)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    await logAdminAction('update_banner', req, { targetUser: id, newValue: { title: banner.title } });
    return res.json(data);
  } catch (err) {
    console.error('[Admin update banner]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/banners/:id', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const { id } = req.params;
  try {
    const { error } = await (supabaseServer() as any)
      .from('event_banners')
      .delete()
      .eq('id', id);
    if (error) throw error;
    await logAdminAction('delete_banner', req, { targetUser: id });
    return res.json({ success: true });
  } catch (err) {
    console.error('[Admin delete banner]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Workout exercises management
router.get('/plans', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { data, error } = await (supabaseServer() as any)
      .from('workout_plans')
      .select('id, name, description, difficulty, equipment, duration_weeks, days_per_week, days, display_order, image_url, is_active')
      .order('display_order', { ascending: true })
      .order('id', { ascending: true });
    
    if (error) throw error;
    return res.json(data || []);
  } catch (err) {
    console.error('[Admin plans]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/plans', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const plan = req.body;
  try {
    // Make sure we don't insert a default ID
    if (plan.id && plan.id < 0) {
      delete plan.id;
    }
    const { data, error } = await (supabaseServer() as any)
      .from('workout_plans')
      .insert(plan)
      .select()
      .single();
    
    if (error) throw error;
    await logAdminAction('create_plan', req, { newValue: { id: data?.id, name: plan.name } });
    return res.json(data);
  } catch (err) {
    console.error('[Admin create plan]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/plans/:id', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const idStr = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(idStr as string);
  const plan = req.body;
  try {
    // If ID is negative, it's a default plan that needs to be overridden globally
    if (id < 0) {
      plan.id = id;
      const { data, error } = await (supabaseServer() as any)
        .from('workout_plans')
        .upsert(plan)
        .select()
        .single();
      if (error) throw error;
      await logAdminAction('update_plan', req, { targetUser: idStr, newValue: { name: plan.name } });
      return res.json(data);
    } else {
      const { data, error } = await (supabaseServer() as any)
        .from('workout_plans')
        .update(plan)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      await logAdminAction('update_plan', req, { targetUser: idStr, newValue: { name: plan.name } });
      return res.json(data);
    }
  } catch (err) {
    console.error('[Admin update plan]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/plans/:id', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const idStr = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(idStr as string);
  try {
    if (id < 0) {
      // Create a tombstone to hide this default plan globally
      const { error } = await (supabaseServer() as any)
        .from('workout_plans')
        .upsert({ 
          id: id, 
          name: 'DELETED_DEFAULT', 
          description: '', 
          difficulty: 'BEGINNER', 
          equipment: 'GYM', 
          duration_weeks: 1, 
          days_per_week: 1, 
          days: [], 
          is_active: false, 
          display_order: -9999 
        });
      if (error) throw error;
    } else {
      const { error } = await (supabaseServer() as any)
        .from('workout_plans')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    }
    await logAdminAction('delete_plan', req, { targetUser: idStr });
    return res.json({ success: true });
  } catch (err) {
    console.error('[Admin delete plan]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Workout exercises management
router.get('/exercises', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { data, error } = await (supabaseServer() as any)
      .from('workout_exercises')
      .select('id, name, type, muscle_group, default_sets, default_reps, video_url, notes, equipment, is_active, display_order')
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
    // Duplicate prevention: check if exercise with same name already exists
    const trimmedName = (exercise.name || '').trim();
    if (trimmedName) {
      const { data: existing } = await (supabaseServer() as any)
        .from('workout_exercises')
        .select('id, name')
        .ilike('name', trimmedName)
        .limit(1);
      if (existing && existing.length > 0) {
        return res.status(409).json({ error: `Exercise "${trimmedName}" already exists (id: ${existing[0].id})` });
      }
      exercise.name = trimmedName;
    }
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

// One-time dedup endpoint: removes duplicate exercises, keeps the best copy per name
router.post('/exercises/dedup', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  try {
    const sb = supabaseServer() as any;
    const { data: all, error } = await sb.from('workout_exercises').select('*').order('id', { ascending: true });
    if (error) throw error;

    // Group by normalized name
    const groups: Record<string, any[]> = {};
    for (const ex of (all || [])) {
      const key = (ex.name || '').trim().toLowerCase();
      if (!groups[key]) groups[key] = [];
      groups[key].push(ex);
    }

    const toDelete: number[] = [];
    const fixes: string[] = [];

    for (const [key, entries] of Object.entries(groups)) {
      if (entries.length <= 1) continue;
      // Pick the best entry: prefer one with video_url, then prefer id in 101-275 range, then lowest id
      const sorted = [...entries].sort((a, b) => {
        const aHasVideo = a.video_url && a.video_url.trim() !== '' ? 1 : 0;
        const bHasVideo = b.video_url && b.video_url.trim() !== '' ? 1 : 0;
        if (bHasVideo !== aHasVideo) return bHasVideo - aHasVideo;
        const aInMain = (a.id >= 101 && a.id <= 275) ? 1 : 0;
        const bInMain = (b.id >= 101 && b.id <= 275) ? 1 : 0;
        if (bInMain !== aInMain) return bInMain - aInMain;
        return a.id - b.id;
      });
      const keep = sorted[0];
      for (let i = 1; i < sorted.length; i++) {
        toDelete.push(sorted[i].id);
      }
      if (entries.length > 2) {
        fixes.push(`"${keep.name}" (keep id ${keep.id}, delete ${sorted.slice(1).map((e: any) => e.id).join(',')})`);
      }
    }

    // Also fix leading/trailing whitespace in names
    const { data: allExercises } = await sb.from('workout_exercises').select('id, name');
    for (const ex of (allExercises || [])) {
      const trimmed = (ex.name || '').trim();
      if (trimmed !== ex.name && !toDelete.includes(ex.id)) {
        await sb.from('workout_exercises').update({ name: trimmed }).eq('id', ex.id);
        fixes.push(`Trimmed whitespace: "${ex.name}" → "${trimmed}" (id ${ex.id})`);
      }
    }

    // Fix Russian Twists (id 193): video URL stuck in notes field
    const { data: rt193 } = await sb.from('workout_exercises').select('*').eq('id', 193).single();
    if (rt193 && rt193.notes && rt193.notes.trim().startsWith('http') && !rt193.video_url) {
      await sb.from('workout_exercises').update({ video_url: rt193.notes, notes: '' }).eq('id', 193);
      fixes.push(`Fixed Russian Twists (193): moved video URL from notes to video_url`);
    }

    // Delete duplicates
    if (toDelete.length > 0) {
      const { error: delErr } = await sb.from('workout_exercises').delete().in('id', toDelete);
      if (delErr) throw delErr;
    }

    await logAdminAction('dedup_exercises', req, { newValue: { deleted: toDelete.length, fixes: fixes.length } });
    return res.json({ deleted: toDelete.length, deletedIds: toDelete, fixes, kept: (all || []).length - toDelete.length });
  } catch (err) {
    console.error('[Admin dedup exercises]', err);
    return res.status(500).json({ error: 'Dedup failed' });
  }
});

// Seed missing exercises: adds exercises used by plans but not in the DB
router.post('/exercises/seed-missing', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  try {
    const sb = supabaseServer() as any;
    const { data: existing } = await sb.from('workout_exercises').select('name');
    const existingNames = new Set((existing || []).map((e: any) => (e.name || '').trim().toLowerCase()));

    // All exercises referenced by the 3 new default plans (must have local videos)
    const needed: Array<{ name: string; type: string; muscle_group: string; equipment: string; default_sets: number; default_reps: string }> = [
      // GYM — Push
      { name: 'Barbell Bench Press', type: 'COMPOUND', muscle_group: 'CHEST', equipment: 'GYM', default_sets: 3, default_reps: '10' },
      { name: 'Incline Dumbbell Press', type: 'COMPOUND', muscle_group: 'UPPER CHEST', equipment: 'GYM', default_sets: 3, default_reps: '10' },
      { name: 'Cable Fly', type: 'ACCESSORY', muscle_group: 'CHEST', equipment: 'GYM', default_sets: 3, default_reps: '12' },
      { name: 'Overhead Barbell Press', type: 'COMPOUND', muscle_group: 'SHOULDERS', equipment: 'GYM', default_sets: 3, default_reps: '8' },
      { name: 'Cable Lateral Raise', type: 'ACCESSORY', muscle_group: 'SHOULDERS', equipment: 'GYM', default_sets: 3, default_reps: '12' },
      { name: 'Tricep Pushdown', type: 'ACCESSORY', muscle_group: 'TRICEPS', equipment: 'GYM', default_sets: 3, default_reps: '12' },
      { name: 'Close Grip Bench Press', type: 'COMPOUND', muscle_group: 'TRICEPS', equipment: 'GYM', default_sets: 3, default_reps: '10' },
      { name: 'Machine Shoulder Press', type: 'COMPOUND', muscle_group: 'SHOULDERS', equipment: 'GYM', default_sets: 3, default_reps: '10' },
      { name: 'Cable Overhead Triceps Extension', type: 'ACCESSORY', muscle_group: 'TRICEPS', equipment: 'GYM', default_sets: 3, default_reps: '12' },
      // GYM — Pull
      { name: 'Barbell Row', type: 'COMPOUND', muscle_group: 'BACK', equipment: 'GYM', default_sets: 3, default_reps: '10' },
      { name: 'Lat Pulldown', type: 'COMPOUND', muscle_group: 'LATS', equipment: 'GYM', default_sets: 3, default_reps: '10' },
      { name: 'Seated Cable Row', type: 'COMPOUND', muscle_group: 'MID BACK', equipment: 'GYM', default_sets: 3, default_reps: '12' },
      { name: 'Face Pulls', type: 'ACCESSORY', muscle_group: 'REAR DELT', equipment: 'GYM', default_sets: 3, default_reps: '15' },
      { name: 'Barbell Curl', type: 'ACCESSORY', muscle_group: 'BICEPS', equipment: 'GYM', default_sets: 3, default_reps: '10' },
      { name: 'EZ Bar Curl', type: 'ACCESSORY', muscle_group: 'BICEPS', equipment: 'GYM', default_sets: 3, default_reps: '12' },
      { name: 'Deadlift', type: 'COMPOUND', muscle_group: 'BACK', equipment: 'GYM', default_sets: 3, default_reps: '6' },
      { name: 'Dumbbell Row', type: 'COMPOUND', muscle_group: 'BACK', equipment: 'ANY', default_sets: 3, default_reps: '10' },
      { name: 'Cable Rear Delt Fly', type: 'ACCESSORY', muscle_group: 'REAR DELT', equipment: 'GYM', default_sets: 3, default_reps: '12' },
      { name: 'Preacher Curl', type: 'ACCESSORY', muscle_group: 'BICEPS', equipment: 'GYM', default_sets: 3, default_reps: '10' },
      { name: 'Hammer Curl', type: 'ACCESSORY', muscle_group: 'BICEPS', equipment: 'ANY', default_sets: 3, default_reps: '12' },
      // GYM — Legs
      { name: 'Barbell Squat', type: 'COMPOUND', muscle_group: 'QUADS', equipment: 'GYM', default_sets: 3, default_reps: '10' },
      { name: 'Leg Press', type: 'COMPOUND', muscle_group: 'QUADS', equipment: 'GYM', default_sets: 3, default_reps: '12' },
      { name: 'Romanian Deadlift', type: 'COMPOUND', muscle_group: 'HAMSTRINGS', equipment: 'ANY', default_sets: 3, default_reps: '10' },
      { name: 'Leg Curl', type: 'ACCESSORY', muscle_group: 'HAMSTRINGS', equipment: 'GYM', default_sets: 3, default_reps: '12' },
      { name: 'Calf Raises', type: 'ACCESSORY', muscle_group: 'CALVES', equipment: 'ANY', default_sets: 3, default_reps: '15' },
      { name: 'Hip Thrust', type: 'COMPOUND', muscle_group: 'GLUTES', equipment: 'ANY', default_sets: 3, default_reps: '10' },
      { name: 'Front Squat', type: 'COMPOUND', muscle_group: 'QUADS', equipment: 'GYM', default_sets: 3, default_reps: '10' },
      { name: 'Walking Lunges', type: 'COMPOUND', muscle_group: 'QUADS', equipment: 'ANY', default_sets: 3, default_reps: '10 each' },
      { name: 'Leg Extension', type: 'ACCESSORY', muscle_group: 'QUADS', equipment: 'GYM', default_sets: 3, default_reps: '12' },
      { name: 'Seated Leg Curl', type: 'ACCESSORY', muscle_group: 'HAMSTRINGS', equipment: 'GYM', default_sets: 3, default_reps: '12' },
      { name: 'Hanging Leg Raise', type: 'ACCESSORY', muscle_group: 'CORE', equipment: 'GYM', default_sets: 3, default_reps: '12' },
      { name: 'Cable Crunch', type: 'ACCESSORY', muscle_group: 'CORE', equipment: 'GYM', default_sets: 3, default_reps: '15' },
      { name: 'Dumbbell Lateral Raise', type: 'ACCESSORY', muscle_group: 'SHOULDERS', equipment: 'DUMBBELLS', default_sets: 3, default_reps: '15' },
      // DUMBBELL plan
      { name: 'Dumbbell Press', type: 'COMPOUND', muscle_group: 'CHEST', equipment: 'DUMBBELLS', default_sets: 3, default_reps: '10' },
      { name: 'Floor Press', type: 'COMPOUND', muscle_group: 'CHEST', equipment: 'DUMBBELLS', default_sets: 3, default_reps: '12' },
      { name: 'Dumbbell Fly', type: 'ACCESSORY', muscle_group: 'CHEST', equipment: 'DUMBBELLS', default_sets: 3, default_reps: '12' },
      { name: 'Dumbbell Shoulder Press', type: 'COMPOUND', muscle_group: 'SHOULDERS', equipment: 'DUMBBELLS', default_sets: 3, default_reps: '10' },
      { name: 'Dumbbell Tricep Kickback', type: 'ACCESSORY', muscle_group: 'TRICEPS', equipment: 'DUMBBELLS', default_sets: 3, default_reps: '12' },
      { name: 'Single Arm Dumbbell Row', type: 'COMPOUND', muscle_group: 'BACK', equipment: 'DUMBBELLS', default_sets: 3, default_reps: '10 each' },
      { name: 'Reverse Fly', type: 'ACCESSORY', muscle_group: 'REAR DELT', equipment: 'DUMBBELLS', default_sets: 3, default_reps: '12' },
      { name: 'Shrugs', type: 'ACCESSORY', muscle_group: 'TRAPS', equipment: 'DUMBBELLS', default_sets: 3, default_reps: '12' },
      { name: 'Concentration Curl', type: 'ACCESSORY', muscle_group: 'BICEPS', equipment: 'DUMBBELLS', default_sets: 3, default_reps: '10' },
      { name: 'Incline Dumbbell Curl', type: 'ACCESSORY', muscle_group: 'BICEPS', equipment: 'DUMBBELLS', default_sets: 3, default_reps: '10' },
      { name: 'Goblet Squat', type: 'COMPOUND', muscle_group: 'QUADS', equipment: 'DUMBBELLS', default_sets: 3, default_reps: '12' },
      { name: 'Dumbbell Lunges', type: 'COMPOUND', muscle_group: 'QUADS', equipment: 'DUMBBELLS', default_sets: 3, default_reps: '10 each' },
      { name: 'Glute Bridge', type: 'COMPOUND', muscle_group: 'GLUTES', equipment: 'BODYWEIGHT', default_sets: 3, default_reps: '12' },
      { name: 'Arnold Press', type: 'COMPOUND', muscle_group: 'SHOULDERS', equipment: 'DUMBBELLS', default_sets: 3, default_reps: '10' },
      { name: 'Bulgarian Split Squat', type: 'COMPOUND', muscle_group: 'QUADS', equipment: 'BODYWEIGHT', default_sets: 3, default_reps: '10 each' },
      { name: 'Lateral Lunge', type: 'COMPOUND', muscle_group: 'QUADS', equipment: 'BODYWEIGHT', default_sets: 3, default_reps: '10 each' },
      { name: 'Bicycle Crunch', type: 'ACCESSORY', muscle_group: 'CORE', equipment: 'BODYWEIGHT', default_sets: 3, default_reps: '15' },
      { name: 'Crunches', type: 'ACCESSORY', muscle_group: 'CORE', equipment: 'BODYWEIGHT', default_sets: 3, default_reps: '15' },
      { name: 'Lying Leg Raise', type: 'ACCESSORY', muscle_group: 'CORE', equipment: 'BODYWEIGHT', default_sets: 3, default_reps: '12' },
      // BODYWEIGHT plan
      { name: 'Push-Ups', type: 'COMPOUND', muscle_group: 'CHEST', equipment: 'BODYWEIGHT', default_sets: 3, default_reps: '12' },
      { name: 'Diamond Push-Ups', type: 'COMPOUND', muscle_group: 'TRICEPS', equipment: 'BODYWEIGHT', default_sets: 3, default_reps: '8' },
      { name: 'Pike Push-Ups', type: 'COMPOUND', muscle_group: 'SHOULDERS', equipment: 'BODYWEIGHT', default_sets: 3, default_reps: '8' },
      { name: 'Chair Dips', type: 'COMPOUND', muscle_group: 'TRICEPS', equipment: 'BODYWEIGHT', default_sets: 3, default_reps: '10' },
      { name: 'Pull-Ups', type: 'COMPOUND', muscle_group: 'BACK', equipment: 'BODYWEIGHT', default_sets: 3, default_reps: '6' },
      { name: 'Chin-Ups', type: 'COMPOUND', muscle_group: 'BACK', equipment: 'BODYWEIGHT', default_sets: 3, default_reps: '6' },
      { name: 'Lunges', type: 'COMPOUND', muscle_group: 'QUADS', equipment: 'BODYWEIGHT', default_sets: 3, default_reps: '10 each' },
      { name: 'Single Leg Glute Bridge', type: 'COMPOUND', muscle_group: 'GLUTES', equipment: 'BODYWEIGHT', default_sets: 3, default_reps: '10 each' },
      { name: 'Wall Sit', type: 'ACCESSORY', muscle_group: 'QUADS', equipment: 'BODYWEIGHT', default_sets: 3, default_reps: '30s' },
      { name: 'Donkey Kicks', type: 'ACCESSORY', muscle_group: 'GLUTES', equipment: 'BODYWEIGHT', default_sets: 3, default_reps: '12' },
      { name: 'Reverse Crunch', type: 'ACCESSORY', muscle_group: 'CORE', equipment: 'BODYWEIGHT', default_sets: 3, default_reps: '12' },
      { name: 'Plank', type: 'ACCESSORY', muscle_group: 'CORE', equipment: 'BODYWEIGHT', default_sets: 3, default_reps: '30s' },
      { name: 'Mountain Climbers', type: 'CARDIO', muscle_group: 'CORE', equipment: 'BODYWEIGHT', default_sets: 3, default_reps: '30s' },
      { name: 'Jump Squat', type: 'COMPOUND', muscle_group: 'QUADS', equipment: 'BODYWEIGHT', default_sets: 3, default_reps: '10' },
      { name: 'Burpees', type: 'CARDIO', muscle_group: 'FULL BODY', equipment: 'BODYWEIGHT', default_sets: 3, default_reps: '8' },
      { name: 'Jumping Jacks', type: 'CARDIO', muscle_group: 'CARDIO', equipment: 'BODYWEIGHT', default_sets: 1, default_reps: '2 min' },
      // Warmup / Cooldown / Stretching
      { name: 'Brisk Walk', type: 'CARDIO', muscle_group: 'CARDIO', equipment: 'ANY', default_sets: 1, default_reps: '20 min' },
      { name: 'Inchworm Walk', type: 'STRETCH', muscle_group: 'FULL BODY', equipment: 'BODYWEIGHT', default_sets: 1, default_reps: '5 reps' },
      { name: 'Shoulder Stretch', type: 'STRETCH', muscle_group: 'SHOULDERS', equipment: 'BODYWEIGHT', default_sets: 1, default_reps: '30s each side' },
      { name: 'Hip Flexor Stretch', type: 'STRETCH', muscle_group: 'HIPS', equipment: 'BODYWEIGHT', default_sets: 1, default_reps: '30s each side' },
      { name: 'Standing Forward Bend', type: 'STRETCH', muscle_group: 'HAMSTRINGS', equipment: 'BODYWEIGHT', default_sets: 1, default_reps: '30s' },
      { name: 'Hamstring Stretch', type: 'STRETCH', muscle_group: 'HAMSTRINGS', equipment: 'BODYWEIGHT', default_sets: 1, default_reps: '30s each side' },
      { name: 'Downward Dog', type: 'STRETCH', muscle_group: 'FULL BODY', equipment: 'BODYWEIGHT', default_sets: 1, default_reps: '30s' },
      { name: 'Standing Quadriceps Stretch', type: 'STRETCH', muscle_group: 'QUADS', equipment: 'BODYWEIGHT', default_sets: 1, default_reps: '30s each side' },
      { name: 'Calf Stretch', type: 'STRETCH', muscle_group: 'CALVES', equipment: 'BODYWEIGHT', default_sets: 1, default_reps: '30s each side' },
      { name: 'Butterfly Stretch', type: 'STRETCH', muscle_group: 'HIPS', equipment: 'BODYWEIGHT', default_sets: 1, default_reps: '30s' },
      { name: 'Seated Forward Fold', type: 'STRETCH', muscle_group: 'HAMSTRINGS', equipment: 'BODYWEIGHT', default_sets: 1, default_reps: '30s' },
    ];

    const added: string[] = [];
    for (const ex of needed) {
      if (!existingNames.has(ex.name.trim().toLowerCase())) {
        const { error } = await sb.from('workout_exercises').insert({ ...ex, is_active: true, display_order: 0 });
        if (!error) added.push(ex.name);
      }
    }

    await logAdminAction('seed_missing_exercises', req, { newValue: { added: added.length } });
    return res.json({ added: added.length, exercises: added, alreadyExisted: needed.length - added.length });
  } catch (err) {
    console.error('[Admin seed missing]', err);
    return res.status(500).json({ error: 'Seed failed' });
  }
});

// Mass-update video URLs in database based on our hardcoded mappings
router.post('/exercises/sync-videos', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  try {
    // Dynamically import to ensure we have the latest mappings
    const { EXERCISE_VIDEOS } = await import('../../lib/exerciseVideos.js');
    const sb = supabaseServer() as any;
    
    // Fetch all exercises from DB
    const { data: allExercises, error: fetchErr } = await sb.from('workout_exercises').select('id, name, video_url');
    if (fetchErr) throw fetchErr;

    let updatedCount = 0;
    const updates = [];

    // Loop through DB exercises and see if we have a matching URL in the map
    for (const ex of allExercises || []) {
      const name = ex.name.trim();
      let matchedUrl = EXERCISE_VIDEOS[name];
      if (!matchedUrl) {
        const lowerName = name.toLowerCase();
        const foundKey = Object.keys(EXERCISE_VIDEOS).find(k => k.toLowerCase() === lowerName);
        if (foundKey) matchedUrl = EXERCISE_VIDEOS[foundKey];
      }

      if (matchedUrl && ex.video_url !== matchedUrl) {
        await sb.from('workout_exercises').update({ video_url: matchedUrl }).eq('id', ex.id);
        updates.push({ name: ex.name, oldUrl: ex.video_url, newUrl: matchedUrl });
        updatedCount++;
      }
    }

    await logAdminAction('sync_exercise_videos', req, { newValue: { count: updatedCount } });
    return res.json({ updatedCount, updates });
  } catch (err) {
    console.error('[Admin sync exercise videos]', err);
    return res.status(500).json({ error: 'Video sync failed' });
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
