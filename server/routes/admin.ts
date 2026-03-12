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
    const { data, error } = await supabaseServer
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
    const { data: userData, error: fetchError } = await supabaseServer
      .from('players')
      .select('cheat_strikes')
      .eq('id', id)
      .single();
    
    if (fetchError) throw fetchError;
    
    const newStrikes = (userData?.cheat_strikes || 0) + 1;
    const isBanned = newStrikes >= 5;
    
    const { data, error } = await supabaseServer
      .from('players')
      .update({
        cheat_strikes: newStrikes,
        is_banned: isBanned,
        raw_data: {
          cheatStrikes: newStrikes,
          isBanned: isBanned
        }
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return res.json(data);
  } catch (err) {
    console.error('[Admin ban user]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
           updated_at    = NOW()
       FROM (SELECT LEAST(COALESCE(cheat_strikes, 0) + 1, 5) AS ns
             FROM players WHERE supabase_id = $1) v
       WHERE p.supabase_id = $1
       RETURNING p.cheat_strikes, p.is_banned`,
      [id]
    );
    const row = result.rows[0] ?? {};
    return res.json({ success: true, cheat_strikes: row.cheat_strikes, is_banned: row.is_banned });
  } catch (err) {
    console.error('[Admin ban]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/users/:id/unban', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const { id } = req.params;
  try {
    const result = await query(
      `UPDATE players p
       SET cheat_strikes = v.ns,
           is_banned     = (v.ns >= 5),
           raw_data      = COALESCE(p.raw_data, '{}'::jsonb)
                           || jsonb_build_object('cheatStrikes', v.ns, 'isBanned', v.ns >= 5),
           updated_at    = NOW()
       FROM (SELECT GREATEST(COALESCE(cheat_strikes, 0) - 1, 0) AS ns
             FROM players WHERE supabase_id = $1) v
       WHERE p.supabase_id = $1
       RETURNING p.cheat_strikes, p.is_banned`,
      [id]
    );
    const row = result.rows[0] ?? {};
    return res.json({ success: true, cheat_strikes: row.cheat_strikes, is_banned: row.is_banned });
  } catch (err) {
    console.error('[Admin unban]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/users/:id/adjust-gold', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const { id } = req.params;
  const delta = Number(req.body?.delta ?? 0);
  if (!Number.isFinite(delta)) return res.status(400).json({ error: 'Invalid delta' });
  try {
    const result = await query(
      `UPDATE players
       SET gold = GREATEST(COALESCE(gold, 0) + $2, 0), updated_at = NOW()
       WHERE supabase_id = $1
       RETURNING gold`,
      [id, delta]
    );
    return res.json({ success: true, gold: result.rows[0]?.gold ?? 0 });
  } catch (err) {
    console.error('[Admin adjust-gold]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/users/:id/adjust-keys', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const { id } = req.params;
  const delta = Number(req.body?.delta ?? 0);
  if (!Number.isFinite(delta)) return res.status(400).json({ error: 'Invalid delta' });
  try {
    const result = await query(
      `UPDATE players
       SET keys = GREATEST(COALESCE(keys, 0) + $2, 0), updated_at = NOW()
       WHERE supabase_id = $1
       RETURNING keys`,
      [id, delta]
    );
    return res.json({ success: true, keys: result.rows[0]?.keys ?? 0 });
  } catch (err) {
    console.error('[Admin adjust-keys]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── USAGE ──────────────────────────────────────────────────────────────────
router.get('/usage', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const period = (req.query.period as string) || 'all';

  let whereClause = '';
  let tsInterval = '30 days';
  const now = new Date();

  if (period === 'today') {
    whereClause = `WHERE created_at >= DATE_TRUNC('day', NOW() AT TIME ZONE 'UTC')`;
    tsInterval = '1 day';
  } else if (period === 'week') {
    whereClause = `WHERE created_at >= DATE_TRUNC('week', NOW() AT TIME ZONE 'UTC')`;
    tsInterval = '7 days';
  } else if (period === 'month') {
    whereClause = `WHERE created_at >= DATE_TRUNC('month', NOW() AT TIME ZONE 'UTC')`;
    tsInterval = '30 days';
  }

  try {
    const [summary, byModel, byRoute, recentLogs, timeSeries] = await Promise.all([
      query(`SELECT
               COUNT(*)::int          AS total_calls,
               COALESCE(SUM(input_tokens + output_tokens), 0)::bigint AS total_tokens,
               COALESCE(SUM(cost_usd), 0)                             AS total_cost_usd,
               COUNT(DISTINCT user_id)::int                           AS unique_users
             FROM api_usage_logs ${whereClause}`),
      query(`SELECT
               model,
               COUNT(*)::int                                  AS calls,
               COALESCE(SUM(input_tokens), 0)::bigint         AS input_tokens,
               COALESCE(SUM(output_tokens), 0)::bigint        AS output_tokens,
               COALESCE(SUM(cost_usd), 0)                     AS cost_usd
             FROM api_usage_logs ${whereClause}
             GROUP BY model
             ORDER BY cost_usd DESC`),
      query(`SELECT
               route,
               COUNT(*)::int                       AS calls,
               COALESCE(SUM(cost_usd), 0)          AS cost_usd
             FROM api_usage_logs ${whereClause}
             GROUP BY route
             ORDER BY calls DESC`),
      query(`SELECT id, created_at, route, model, input_tokens, output_tokens, cost_usd, success
             FROM api_usage_logs ${whereClause}
             ORDER BY created_at DESC
             LIMIT 50`),
      query(`SELECT
               TO_CHAR(DATE_TRUNC('day', created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS date,
               COUNT(*)::int AS calls,
               COALESCE(SUM(cost_usd), 0) AS cost_usd
             FROM api_usage_logs
             WHERE created_at >= NOW() - INTERVAL '${tsInterval}'
             GROUP BY DATE_TRUNC('day', created_at AT TIME ZONE 'UTC')
             ORDER BY date ASC`),
    ]);

    const totalCostUsd = parseFloat(summary.rows[0]?.total_cost_usd ?? 0);

    return res.json({
      totalCostUsd,
      totalCostInr: parseFloat((totalCostUsd * USD_TO_INR).toFixed(2)),
      totalCalls:    summary.rows[0]?.total_calls ?? 0,
      totalTokens:   parseInt(summary.rows[0]?.total_tokens ?? 0),
      uniqueUsers:   summary.rows[0]?.unique_users ?? 0,
      byModel:       byModel.rows.map((r: any) => ({
        ...r,
        cost_inr: parseFloat((parseFloat(r.cost_usd) * USD_TO_INR).toFixed(4)),
      })),
      byRoute:       byRoute.rows.map((r: any) => ({
        ...r,
        cost_inr: parseFloat((parseFloat(r.cost_usd) * USD_TO_INR).toFixed(4)),
      })),
      recentLogs:    recentLogs.rows,
      timeSeries:    timeSeries.rows.map((r: any) => ({
        date: r.date,
        calls: parseInt(r.calls),
        cost_inr: parseFloat((parseFloat(r.cost_usd) * USD_TO_INR).toFixed(4)),
      })),
    });
  } catch (err) {
    console.error('[Admin usage]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── EXERCISE LIBRARY ───────────────────────────────────────────────────────
router.get('/exercises', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  try {
    const result = await query(
      `SELECT * FROM workout_exercises ORDER BY display_order ASC, id ASC`
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('[Admin exercises]', err);
    return res.status(500).json({ error: 'Failed to fetch exercises' });
  }
});

router.post('/exercises', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const { name, type, muscle_group, default_sets, default_reps, video_url, notes, equipment, display_order } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
  try {
    const result = await query(
      `INSERT INTO workout_exercises (name, type, muscle_group, default_sets, default_reps, video_url, notes, equipment, display_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [name.trim(), type || 'COMPOUND', muscle_group || '', default_sets || 3, default_reps || '10', video_url || '', notes || '', equipment || 'ANY', display_order || 0]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[Admin exercises POST]', err);
    return res.status(500).json({ error: 'Failed to create exercise' });
  }
});

router.put('/exercises/:id', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const { name, type, muscle_group, default_sets, default_reps, video_url, notes, equipment, is_active, display_order } = req.body;
  try {
    const result = await query(
      `UPDATE workout_exercises
       SET name=$1, type=$2, muscle_group=$3, default_sets=$4, default_reps=$5,
           video_url=$6, notes=$7, equipment=$8, is_active=$9, display_order=$10
       WHERE id=$11
       RETURNING *`,
      [name, type, muscle_group || '', default_sets || 3, default_reps || '10', video_url || '', notes || '', equipment || 'ANY', is_active !== false, display_order || 0, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Exercise not found' });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('[Admin exercises PUT]', err);
    return res.status(500).json({ error: 'Failed to update exercise' });
  }
});

router.delete('/exercises/:id', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  try {
    await query(`DELETE FROM workout_exercises WHERE id=$1`, [req.params.id]);
    return res.json({ success: true });
  } catch (err) {
    console.error('[Admin exercises DELETE]', err);
    return res.status(500).json({ error: 'Failed to delete exercise' });
  }
});

// ── WORKOUT PLANS ──────────────────────────────────────────────────────────
router.get('/plans', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  try {
    const result = await query(
      `SELECT id, name, description, difficulty, equipment, duration_weeks, days_per_week, days, is_active, display_order, image_url, created_at
       FROM workout_plans ORDER BY display_order ASC, id ASC`
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('[Admin plans]', err);
    return res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

router.post('/plans', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const { name, description, difficulty, equipment, duration_weeks, days_per_week, days, display_order, image_url } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
  try {
    const result = await query(
      `INSERT INTO workout_plans (name, description, difficulty, equipment, duration_weeks, days_per_week, days, display_order, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [name.trim(), description || '', difficulty || 'BEGINNER', equipment || 'GYM', duration_weeks || 4, days_per_week || 4, JSON.stringify(days || []), display_order || 0, image_url || '']
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[Admin plans POST]', err);
    return res.status(500).json({ error: 'Failed to create plan' });
  }
});

router.put('/plans/:id', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const { name, description, difficulty, equipment, duration_weeks, days_per_week, days, is_active, display_order, image_url } = req.body;
  try {
    const result = await query(
      `UPDATE workout_plans
       SET name=$1, description=$2, difficulty=$3, equipment=$4, duration_weeks=$5,
           days_per_week=$6, days=$7, is_active=$8, display_order=$9, image_url=$10
       WHERE id=$11
       RETURNING *`,
      [name, description || '', difficulty || 'BEGINNER', equipment || 'GYM', duration_weeks || 4, days_per_week || 4, JSON.stringify(days || []), is_active !== false, display_order || 0, image_url || '', req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Plan not found' });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('[Admin plans PUT]', err);
    return res.status(500).json({ error: 'Failed to update plan' });
  }
});

router.delete('/plans/:id', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  try {
    await query(`DELETE FROM workout_plans WHERE id=$1`, [req.params.id]);
    return res.json({ success: true });
  } catch (err) {
    console.error('[Admin plans DELETE]', err);
    return res.status(500).json({ error: 'Failed to delete plan' });
  }
});

export default router;
