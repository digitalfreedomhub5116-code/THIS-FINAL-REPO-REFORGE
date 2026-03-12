import { Router, Request, Response } from 'express';
import { query } from '../db/pool.js';

const router = Router();

router.get('/codename/check', async (req: Request, res: Response) => {
  const name = ((req.query.name as string) || '').trim();
  if (!name) return res.json({ available: false });
  try {
    const result = await query(
      'SELECT 1 FROM players WHERE LOWER(username) = LOWER($1) LIMIT 1',
      [name]
    );
    return res.json({ available: result.rows.length === 0 });
  } catch (err) {
    console.error('[Codename check]', err);
    return res.json({ available: true });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await query(
      'SELECT * FROM players WHERE supabase_id = $1 LIMIT 1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('[Player GET]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ error: 'Invalid body' });
  }

  try {
    const result = await query(
      `INSERT INTO players (supabase_id, username, name, email, level, current_xp, required_xp,
        total_xp, daily_xp, rank, gold, keys, streak, hp, max_hp, mp, max_mp,
        is_configured, is_penalty_active, penalty_end_time, last_login_date, 
        last_dungeon_entry, tutorial_step, tutorial_complete, daily_quest_complete,
        last_daily_reset, last_weekly_reset, last_monthly_reset, identity, raw_data, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,NOW())
       ON CONFLICT (supabase_id) DO UPDATE SET
         name = EXCLUDED.name,
         level = EXCLUDED.level,
         current_xp = EXCLUDED.current_xp,
         required_xp = EXCLUDED.required_xp,
         total_xp = EXCLUDED.total_xp,
         daily_xp = EXCLUDED.daily_xp,
         rank = EXCLUDED.rank,
         gold = EXCLUDED.gold,
         keys = EXCLUDED.keys,
         streak = EXCLUDED.streak,
         hp = EXCLUDED.hp,
         max_hp = EXCLUDED.max_hp,
         mp = EXCLUDED.mp,
         max_mp = EXCLUDED.max_mp,
         is_configured = EXCLUDED.is_configured,
         is_penalty_active = EXCLUDED.is_penalty_active,
         penalty_end_time = EXCLUDED.penalty_end_time,
         last_login_date = EXCLUDED.last_login_date,
         last_dungeon_entry = EXCLUDED.last_dungeon_entry,
         tutorial_step = EXCLUDED.tutorial_step,
         tutorial_complete = EXCLUDED.tutorial_complete,
         daily_quest_complete = EXCLUDED.daily_quest_complete,
         last_daily_reset = EXCLUDED.last_daily_reset,
         last_weekly_reset = EXCLUDED.last_weekly_reset,
         last_monthly_reset = EXCLUDED.last_monthly_reset,
         identity = EXCLUDED.identity,
         raw_data = EXCLUDED.raw_data,
         updated_at = NOW()
       RETURNING *`,
      [
        id,
        data.username || data.name || ('u_' + id.slice(-8)),
        data.name || 'Hunter',
        data.email || null,
        data.level || 1,
        data.currentXp || 0,
        data.requiredXp || 100,
        data.totalXp || 0,
        data.dailyXp || 0,
        data.rank || 'E',
        data.gold || 0,
        data.keys || 0,
        data.streak || 0,
        data.hp || 100,
        data.maxHp || 100,
        data.mp || 100,
        data.maxMp || 100,
        data.isConfigured || false,
        data.isPenaltyActive || false,
        data.penaltyEndTime || null,
        data.lastLoginDate || '',
        data.lastDungeonEntry || 0,
        data.tutorialStep || 0,
        data.tutorialComplete || false,
        data.dailyQuestComplete || false,
        data.lastDailyReset || 0,
        data.lastWeeklyReset || 0,
        data.lastMonthlyReset || 0,
        data.identity || null,
        JSON.stringify(data),
      ]
    );

    await query(
      `INSERT INTO leaderboard_cache (player_id, username, name, total_xp, level, rank, updated_at)
       SELECT id, username, name, total_xp, level, rank, NOW()
       FROM players WHERE supabase_id = $1
       ON CONFLICT (player_id) DO UPDATE SET
         username = EXCLUDED.username,
         name = EXCLUDED.name,
         total_xp = EXCLUDED.total_xp,
         level = EXCLUDED.level,
         rank = EXCLUDED.rank,
         updated_at = NOW()`,
      [id]
    );

    return res.json(result.rows[0]);
  } catch (err) {
    console.error('[Player PUT]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
