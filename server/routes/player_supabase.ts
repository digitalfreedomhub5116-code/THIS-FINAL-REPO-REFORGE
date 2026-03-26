import { Router, Request, Response } from 'express';
import { supabaseServer } from '../lib/supabase.js';
import { getAuthenticatedUserId } from '../lib/playerAuth.js';

const router = Router();

// ── Delta-based merge for gold/keys ──
// Instead of locking, the PUT endpoint reads the current DB values and applies
// only the DELTA (what the client actually changed) so admin adjustments are never overwritten.

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
    // Also extract _serverGold/_serverKeys (client's last-known server values for delta calculation)
    const { cheatStrikes: _strippedStrikes, isBanned: _strippedBan, _serverGold, _serverKeys, ...cleanData } = data;

    // ── Delta-based gold/keys merge ──
    // Read current DB state so we can apply only the CLIENT's delta
    const { data: currentRow, error: readError } = await (supabaseServer() as any)
      .from('players')
      .select('gold, keys')
      .eq('supabase_id', id)
      .single();
    if (readError) throw readError;

    const dbGold = currentRow?.gold ?? 0;
    const dbKeys = currentRow?.keys ?? 0;

    // The client sends its current gold/keys AND what it believes the server had (_serverGold/_serverKeys).
    // Delta = what the client changed locally. We apply that delta to the CURRENT DB value.
    const clientGold = cleanData.gold ?? 0;
    const clientKeys = cleanData.keys ?? 0;
    const baseGold = (typeof _serverGold === 'number') ? _serverGold : dbGold;
    const baseKeys = (typeof _serverKeys === 'number') ? _serverKeys : dbKeys;

    const goldDelta = clientGold - baseGold;
    const keysDelta = clientKeys - baseKeys;

    const newGold = Math.max(0, dbGold + goldDelta);
    const newKeys = Math.max(0, dbKeys + keysDelta);

    // Build safe raw_data with corrected gold/keys
    const safeRawData = { ...cleanData, gold: newGold, keys: newKeys };

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
      gold: newGold,
      keys: newKeys,
      raw_data: safeRawData,
      updated_at: new Date().toISOString()
    };

    // Use update (not upsert) to prevent creating duplicate rows
    const { data: result, error } = await (supabaseServer() as any)
      .from('players')
      .update(playerData)
      .eq('supabase_id', id)
      .select()
      .single();

    if (error) throw error;

    return res.json({ ...result, _serverGold: newGold, _serverKeys: newKeys });
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

// ── Reset Progress: wipe XP, level, rank, streak, quests, nutrition, health — keep gold & keys ──
router.post('/:id/reset-progress', async (req: Request, res: Response) => {
  const { id } = req.params;
  const authUserId = getAuthenticatedUserId(req);
  if (!authUserId) {
    return res.status(401).json({ error: 'Unauthorized — no valid token or session' });
  }
  if (authUserId !== id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    // Fetch current gold & keys so we can preserve them
    const { data: current, error: fetchErr } = await (supabaseServer() as any)
      .from('players')
      .select('gold, keys, username, name, email, auth_type, avatar_url')
      .eq('supabase_id', id)
      .single();
    if (fetchErr) throw fetchErr;

    const freshRawData = {
      gold: current.gold,
      keys: current.keys,
      name: current.name,
      username: current.username,
    };

    const { error } = await (supabaseServer() as any)
      .from('players')
      .update({
        level: 1,
        current_xp: 0,
        required_xp: 100,
        total_xp: 0,
        daily_xp: 0,
        rank: 'E',
        streak: 0,
        hp: 100,
        max_hp: 100,
        mp: 50,
        max_mp: 50,
        is_configured: false,
        is_penalty_active: false,
        penalty_end_time: null,
        tutorial_step: 0,
        tutorial_complete: false,
        daily_quest_complete: false,
        last_daily_reset: null,
        last_weekly_reset: null,
        last_monthly_reset: null,
        last_login_date: null,
        last_dungeon_entry: null,
        identity: null,
        raw_data: freshRawData,
        updated_at: new Date().toISOString(),
      })
      .eq('supabase_id', id);

    if (error) throw error;

    console.log(`[Player Reset] Progress reset for ${id} — gold(${current.gold}) & keys(${current.keys}) preserved`);
    return res.json({ success: true, message: 'Progress reset. Coins and keys preserved.' });
  } catch (err) {
    console.error('[Player Reset]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Avatar Upload: accept base64 image, store in Supabase Storage, update avatar_url ──
router.post('/:id/avatar', async (req: Request, res: Response) => {
  const { id } = req.params;
  const authUserId = getAuthenticatedUserId(req);
  if (!authUserId) return res.status(401).json({ error: 'Unauthorized' });
  if (authUserId !== id) return res.status(403).json({ error: 'Forbidden' });

  const { imageBase64 } = req.body;
  if (!imageBase64 || typeof imageBase64 !== 'string') {
    return res.status(400).json({ error: 'imageBase64 is required' });
  }

  try {
    const sb = supabaseServer() as any;

    // Strip data-URL prefix if present
    const raw = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
    const buffer = Buffer.from(raw, 'base64');

    // Limit to 2 MB
    if (buffer.length > 2 * 1024 * 1024) {
      return res.status(400).json({ error: 'Image too large (max 2 MB)' });
    }

    const filePath = `avatars/${id}.webp`;

    // Upload (upsert) to Supabase Storage bucket "avatars"
    const { error: uploadErr } = await sb.storage
      .from('avatars')
      .upload(filePath, buffer, {
        contentType: 'image/webp',
        upsert: true,
        cacheControl: '3600',
      });

    if (uploadErr) {
      console.error('[Avatar Upload] Storage error:', uploadErr);
      return res.status(500).json({ error: 'Failed to upload avatar' });
    }

    // Get the public URL
    const { data: urlData } = sb.storage.from('avatars').getPublicUrl(filePath);
    // Append cache-buster so the browser picks up new uploads
    const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    // Update avatar_url column in players table
    await sb.from('players').update({ avatar_url: publicUrl, updated_at: new Date().toISOString() }).eq('supabase_id', id);

    console.log(`[Avatar Upload] Updated avatar for ${id}`);
    return res.json({ success: true, avatarUrl: publicUrl });
  } catch (err) {
    console.error('[Avatar Upload]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
