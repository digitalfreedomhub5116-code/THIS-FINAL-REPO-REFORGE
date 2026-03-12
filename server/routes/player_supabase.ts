import { Router, Request, Response } from 'express';
import { supabaseServer } from '../lib/supabase.js';

const router = Router();

router.get('/codename/check', async (req: Request, res: Response) => {
  const name = ((req.query.name as string) || '').trim();
  if (!name) return res.json({ available: false });
  try {
    const { data, error } = await supabaseServer()
      .from('players')
      .select('username')
      .eq('username', name)
      .limit(1);
    
    if (error) throw error;
    return res.json({ available: !data || data.length === 0 });
  } catch (err) {
    console.error('[Codename check]', err);
    return res.json({ available: true });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabaseServer()
      .from('players')
      .select('*')
      .eq('supabase_id', id)
      .single();
    
    if (error || !data) {
      return res.status(404).json({ error: 'Player not found' });
    }
    return res.json(data);
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
    const playerData = {
      supabase_id: id,
      username: data.username || data.name || ('u_' + id.slice(-8)),
      name: data.name || 'Hunter',
      email: data.email || null,
      level: data.level || 1,
      current_xp: data.currentXp || 0,
      required_xp: data.requiredXp || 100,
      total_xp: data.totalXp || 0,
      daily_xp: data.dailyXp || 0,
      rank: data.rank || 'E',
      gold: data.gold || 0,
      keys: data.keys || 0,
      streak: data.streak || 0,
      hp: data.hp || 100,
      max_hp: data.maxHp || 100,
      mp: data.mp || 100,
      max_mp: data.maxMp || 100,
      is_configured: data.isConfigured || false,
      is_penalty_active: data.isPenaltyActive || false,
      penalty_end_time: data.penaltyEndTime || null,
      last_login_date: data.lastLoginDate || null,
      last_dungeon_entry: data.lastDungeonEntry || null,
      tutorial_step: data.tutorialStep || 0,
      tutorial_complete: data.tutorialComplete || false,
      daily_quest_complete: data.dailyQuestComplete || false,
      last_daily_reset: data.lastDailyReset || null,
      last_weekly_reset: data.lastWeeklyReset || null,
      last_monthly_reset: data.lastMonthlyReset || null,
      identity: data.identity || null,
      raw_data: data.rawData || {},
      updated_at: new Date().toISOString()
    };

    const { data: result, error } = await supabaseServer()
      .from('players')
      .upsert(playerData)
      .select()
      .single();

    if (error) throw error;
    return res.json(result);
  } catch (err) {
    console.error('[Player PUT]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
