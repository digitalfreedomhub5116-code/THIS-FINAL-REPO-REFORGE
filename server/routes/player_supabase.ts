import { Router, Request, Response } from 'express';
import { supabaseServer } from '../lib/supabase.js';
import { getAuthenticatedUserId } from '../lib/playerAuth.js';

const router = Router();

// ── Admin adjustment lock: prevents stale client syncToCloud from overwriting recent admin changes ──
// Key: playerId, Value: { gold?: timestamp, keys?: timestamp }
export const adminAdjustLocks = new Map<string, { gold?: number; keys?: number }>();
const ADMIN_LOCK_TTL_MS = 5000; // 5 seconds

function isAdminLocked(playerId: string, field: 'gold' | 'keys'): boolean {
  const lock = adminAdjustLocks.get(playerId);
  if (!lock || !lock[field]) return false;
  if (Date.now() - lock[field]! < ADMIN_LOCK_TTL_MS) return true;
  // Expired — clean up
  delete lock[field];
  if (!lock.gold && !lock.keys) adminAdjustLocks.delete(playerId);
  return false;
}

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
    const { data, error } = await (supabaseServer() as any)
      .from('players')
      .select('*')
      .eq('supabase_id', id)
      .single();
    
    if (error || !data) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const row = data as any;
    // Always override raw_data with authoritative DB column values
    // so admin changes to gold, keys, ban status are reflected on next load
    const mergedRawData = {
      ...(row.raw_data || {}),
      gold: row.gold,
      keys: row.keys,
      isBanned: row.is_banned,
      cheatStrikes: row.cheat_strikes,
      totalStrikesEver: row.total_strikes_ever ?? 0,
    };
    return res.json({ ...row, raw_data: mergedRawData });
  } catch (err) {
    console.error('[Player GET]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const authUserId = getAuthenticatedUserId(req);
  if (!authUserId) {
    return res.status(401).json({ error: 'Unauthorized — no valid token or session' });
  }
  if (authUserId !== id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const data = req.body;
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ error: 'Invalid body' });
  }

  try {
    // Strip cheatStrikes and isBanned from client data — only admin routes and /record-strike may write these
    const { cheatStrikes: _strippedStrikes, isBanned: _strippedBan, ...cleanData } = data;

    // NEVER overwrite auth fields (email, password_hash, auth_type) from frontend sync
    const goldLocked = isAdminLocked(id, 'gold');
    const keysLocked = isAdminLocked(id, 'keys');

    // Strip stale gold/keys from raw_data when admin recently adjusted them
    const safeRawData = { ...cleanData };
    if (goldLocked) delete safeRawData.gold;
    if (keysLocked) delete safeRawData.keys;

    const playerData: Record<string, any> = {
      username: cleanData.username || cleanData.name || ('u_' + id.slice(-8)),
      name: cleanData.name || 'Hunter',
      level: cleanData.level || 1,
      current_xp: cleanData.currentXp || 0,
      required_xp: cleanData.requiredXp || 100,
      total_xp: cleanData.totalXp || 0,
      daily_xp: cleanData.dailyXp || 0,
      rank: cleanData.rank || 'E',
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
      raw_data: safeRawData,
      updated_at: new Date().toISOString()
    };
    // Only write gold/keys columns if admin hasn't recently adjusted them
    if (!goldLocked) playerData.gold = cleanData.gold || 0;
    if (!keysLocked) playerData.keys = cleanData.keys || 0;

    // Use update (not upsert) to prevent creating duplicate rows
    const { data: result, error } = await (supabaseServer() as any)
      .from('players')
      .update(playerData)
      .eq('supabase_id', id)
      .select()
      .single();

    if (error) throw error;

    // Fire-and-forget leaderboard cache sync
    (supabaseServer() as any)
      .from('leaderboard_cache')
      .upsert({
        player_id: id,
        username: playerData.username,
        name: playerData.name,
        level: playerData.level,
        rank: playerData.rank,
        total_xp: playerData.total_xp,
        updated_at: new Date().toISOString()
      }, { onConflict: 'username' })
      .then(({ error: lbErr }: { error: unknown }) => {
        if (lbErr) console.error('[Leaderboard cache upsert]', lbErr);
      });

    return res.json(result);
  } catch (err) {
    console.error('[Player PUT]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── FIX 5: Clear a pending notification after user acknowledges it ──
router.delete('/:id/notification/:notificationId', async (req: Request, res: Response) => {
  const { id, notificationId } = req.params;
  const authUserId = getAuthenticatedUserId(req);
  if (!authUserId) {
    return res.status(401).json({ error: 'Unauthorized — no valid token or session' });
  }
  if (authUserId !== id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const { data: current, error: fetchError } = await (supabaseServer() as any)
      .from('players')
      .select('pending_notifications')
      .eq('supabase_id', id)
      .single();
    if (fetchError) throw fetchError;

    const notifications = Array.isArray(current?.pending_notifications) ? current.pending_notifications : [];
    const filtered = notifications.filter((n: any) => n.id !== notificationId);

    const { error } = await (supabaseServer() as any)
      .from('players')
      .update({ pending_notifications: filtered })
      .eq('supabase_id', id);
    if (error) throw error;

    return res.json({ success: true });
  } catch (err) {
    console.error('[Player clear notification]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── FIX 3: Dedicated strike endpoint for client-side ForgeGuard ──
// Authenticated via user session (not admin). Increments cheat_strikes,
// total_strikes_ever, sets is_banned at 5, merges raw_data.
router.post('/:id/record-strike', async (req: Request, res: Response) => {
  const { id } = req.params;
  const authUserId = getAuthenticatedUserId(req);
  if (!authUserId) {
    return res.status(401).json({ error: 'Unauthorized — no valid token or session' });
  }
  if (authUserId !== id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const { data: current, error: fetchError } = await (supabaseServer() as any)
      .from('players')
      .select('cheat_strikes, total_strikes_ever, raw_data')
      .eq('supabase_id', id)
      .single();
    if (fetchError) throw fetchError;

    const newStrikes = Math.min(5, (current?.cheat_strikes || 0) + 1);
    const isBanned = newStrikes >= 5;
    const newTotalEver = (current?.total_strikes_ever || 0) + 1;
    const updatedRawData = { ...(current?.raw_data || {}), cheatStrikes: newStrikes, isBanned };

    const { data, error } = await (supabaseServer() as any)
      .from('players')
      .update({
        cheat_strikes: newStrikes,
        is_banned: isBanned,
        total_strikes_ever: newTotalEver,
        raw_data: updatedRawData
      })
      .eq('supabase_id', id)
      .select('cheat_strikes, is_banned')
      .single();
    if (error) throw error;

    return res.json({ success: true, cheat_strikes: data.cheat_strikes, is_banned: data.is_banned });
  } catch (err) {
    console.error('[Player record-strike]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
