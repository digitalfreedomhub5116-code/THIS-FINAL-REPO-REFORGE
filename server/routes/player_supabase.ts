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

// Lightweight sync endpoint — returns ONLY fields needed for polling (~1KB vs ~50KB)
// Used by the 30s polling loop in App.tsx instead of the full GET
// ALSO: computes streak server-side (authoritative). If the user hasn't logged in
// today, the server updates streak + last_login_date atomically in Supabase.
router.get('/:id/sync', async (req: Request, res: Response) => {
  const { id } = req.params;
  const authUserId = getAuthenticatedUserId(req);
  if (!authUserId) return res.status(401).json({ error: 'Unauthorized' });
  if (authUserId !== id) return res.status(403).json({ error: 'Forbidden' });
  try {
    const { data, error } = await (supabaseServer() as any)
      .from('players')
      .select('gold, keys, is_banned, cheat_strikes, total_strikes_ever, pending_notifications, level, current_xp, required_xp, total_xp, daily_xp, rank, streak, last_login_date, streak_shields, streak_before_break, streak_broken_at, hp, max_hp, mp, max_mp, updated_at, daily_stats, weekly_stats, monthly_stats, last_daily_reset, last_weekly_reset, last_monthly_reset, raw_data->unlockedOutfits, raw_data->equippedOutfitId, raw_data->outfitStones')
      .eq('supabase_id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const row = data as any;

    // ── SERVER-SIDE STREAK COMPUTATION ──
    // The server is the SINGLE SOURCE OF TRUTH for streak.
    // On each sync, check if today's date differs from last_login_date.
    // If the user logged in yesterday → increment streak.
    // If the user missed >1 day → reset streak to 1.
    // If same day → keep current streak.
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const lastLogin = row.last_login_date as string | null;
    let currentStreak = row.streak ?? 0;
    let streakUpdated = false;
    let streakShieldUsed = false;
    let streakBroke = false;
    let currentShields = row.streak_shields ?? 0;

    if (lastLogin !== todayStr) {
      // First login of the day — compute new streak
      let newStreak = 1;
      const updateFields: Record<string, any> = { last_login_date: todayStr };

      if (lastLogin) {
        const lastDate = new Date(lastLogin + 'T00:00:00');
        const todayDate = new Date(todayStr + 'T00:00:00');
        const diffMs = todayDate.getTime() - lastDate.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          // Logged in yesterday — continue streak
          newStreak = (currentStreak || 0) + 1;
        } else if (diffDays === 0) {
          // Same day edge case (timezone) — keep
          newStreak = currentStreak || 1;
        } else {
          // Missed >1 day — check for streak shield
          if (currentShields > 0) {
            // Shield absorbs the break! Keep streak, decrement shield
            newStreak = (currentStreak || 0) + 1;
            currentShields -= 1;
            updateFields.streak_shields = currentShields;
            streakShieldUsed = true;
            console.log(`[Streak] ${id.slice(-8)}: Shield activated! Shields remaining: ${currentShields}`);
          } else {
            // No shield — streak breaks
            const previousStreak = currentStreak || 0;
            newStreak = 1;
            if (previousStreak > 1) {
              updateFields.streak_before_break = previousStreak;
              updateFields.streak_broken_at = new Date().toISOString();
              streakBroke = true;
              console.log(`[Streak] ${id.slice(-8)}: Streak BROKEN ${previousStreak} → 1`);
            }
          }
        }
      }

      updateFields.streak = newStreak;

      // Update streak + last_login_date atomically in Supabase
      const { error: updateErr } = await (supabaseServer() as any)
        .from('players')
        .update(updateFields)
        .eq('supabase_id', id);

      if (!updateErr) {
        currentStreak = newStreak;
        streakUpdated = true;
        console.log(`[Streak] ${id.slice(-8)}: ${lastLogin || 'null'} → ${todayStr} | streak: ${row.streak} → ${newStreak}`);
      }
    }

    // ── STREAK MILESTONE DETECTION ──
    const STREAK_MILESTONES = [
      { days: 7,   gold: 50,   keys: 0,  title: null,           border: null,                         banner: 'banner-streak-7day' },
      { days: 14,  gold: 100,  keys: 0,  title: null,           border: 'border-streak-silver',       banner: 'banner-streak-14day' },
      { days: 30,  gold: 200,  keys: 1,  title: 'Iron Will',    border: 'border-streak-gold',         banner: 'banner-streak-30day' },
      { days: 60,  gold: 400,  keys: 1,  title: null,           border: 'border-streak-inferno',      banner: 'banner-streak-60day' },
      { days: 100, gold: 1000, keys: 3,  title: 'Eternal Flame', border: 'border-streak-eternal',     banner: 'banner-streak-100day' },
      { days: 365, gold: 5000, keys: 10, title: 'Legendary',    border: 'border-streak-legendary',    banner: 'banner-streak-365day' },
    ];

    let streakMilestone: any = null;

    if (streakUpdated && currentStreak > 1 && !streakBroke) {
      const milestone = STREAK_MILESTONES.find(m => m.days === currentStreak);
      if (milestone) {
        // Award gold + keys directly
        const newGold = (row.gold || 0) + milestone.gold;
        const newKeys = (row.keys || 0) + milestone.keys;
        const milestoneUpdate: Record<string, any> = {
          gold: newGold,
          keys: newKeys,
        };

        await (supabaseServer() as any)
          .from('players')
          .update(milestoneUpdate)
          .eq('supabase_id', id);

        // Update local row values so response reflects new amounts
        row.gold = newGold;
        row.keys = newKeys;

        // Unlock milestone items (border + banner) in raw_data.ownedItems
        const unlockIds: string[] = [];
        if (milestone.border) unlockIds.push(milestone.border);
        if (milestone.banner) unlockIds.push(milestone.banner);

        if (unlockIds.length > 0) {
          const currentRawData = row.raw_data || {};
          const currentOwned: string[] = currentRawData.ownedItems || [];
          const newOwned = [...new Set([...currentOwned, ...unlockIds])];
          const updatedRawData = { ...currentRawData, ownedItems: newOwned };

          await (supabaseServer() as any)
            .from('players')
            .update({ raw_data: updatedRawData })
            .eq('supabase_id', id);

          row.raw_data = updatedRawData;
        }

        streakMilestone = {
          days: milestone.days,
          gold: milestone.gold,
          keys: milestone.keys,
          title: milestone.title,
          border: milestone.border,
          banner: milestone.banner,
          unlockedItems: unlockIds,
        };

        console.log(`[Streak] ${id.slice(-8)}: 🎉 Milestone ${milestone.days} days! +${milestone.gold}G +${milestone.keys}K, unlocked: ${unlockIds.join(', ')}`);
      }
    }

    // ── SERVER-SIDE D/W/M STAT RESETS ──
    const ZERO_STATS = {strength:0,intelligence:0,discipline:0,social:0,focus:0,willpower:0};
    let serverDailyStats = row.daily_stats || ZERO_STATS;
    let serverWeeklyStats = row.weekly_stats || ZERO_STATS;
    let serverMonthlyStats = row.monthly_stats || ZERO_STATS;
    const statResetFields: Record<string, any> = {};

    // Daily reset — check against today's date string
    const lastDailyReset = row.last_daily_reset || '';
    if (lastDailyReset !== todayStr) {
      serverDailyStats = { ...ZERO_STATS };
      statResetFields.daily_stats = ZERO_STATS;
      statResetFields.last_daily_reset = todayStr;
    }

    // Weekly reset — Monday UTC
    const nowUtc = new Date();
    const dayOfWeekUtc = nowUtc.getUTCDay();
    const mondayUtc = new Date(nowUtc);
    mondayUtc.setUTCDate(nowUtc.getUTCDate() - ((dayOfWeekUtc + 6) % 7));
    const mondayStr = `${mondayUtc.getUTCFullYear()}-${String(mondayUtc.getUTCMonth()+1).padStart(2,'0')}-${String(mondayUtc.getUTCDate()).padStart(2,'0')}`;
    const lastWeeklyReset = row.last_weekly_reset || '';
    if (lastWeeklyReset !== mondayStr) {
      serverWeeklyStats = { ...ZERO_STATS };
      statResetFields.weekly_stats = ZERO_STATS;
      statResetFields.last_weekly_reset = mondayStr;
    }

    // Monthly reset — 1st of month
    const monthStr = `${nowUtc.getFullYear()}-${String(nowUtc.getMonth()+1).padStart(2,'0')}`;
    const lastMonthlyReset = row.last_monthly_reset || '';
    if (lastMonthlyReset !== monthStr) {
      serverMonthlyStats = { ...ZERO_STATS };
      statResetFields.monthly_stats = ZERO_STATS;
      statResetFields.last_monthly_reset = monthStr;
    }

    // Persist any resets
    if (Object.keys(statResetFields).length > 0) {
      await (supabaseServer() as any)
        .from('players')
        .update(statResetFields)
        .eq('supabase_id', id);
      console.log(`[Stats Reset] ${id.slice(-8)}: Reset ${Object.keys(statResetFields).filter(k => k.includes('stats')).join(', ')}`);
    }

    // Re-read updated_at AFTER all writes (streak, milestones, stat resets)
    // so the client gets the ACTUAL current timestamp — prevents 409 conflicts
    let finalUpdatedAt = row.updated_at || null;
    if (streakUpdated || Object.keys(statResetFields).length > 0 || streakMilestone) {
      try {
        const { data: refreshed } = await (supabaseServer() as any)
          .from('players')
          .select('updated_at')
          .eq('supabase_id', id)
          .single();
        if (refreshed?.updated_at) finalUpdatedAt = refreshed.updated_at;
      } catch { /* non-critical */ }
    }

    return res.json({
      gold: row.gold,
      keys: row.keys,
      isBanned: row.is_banned,
      cheatStrikes: row.cheat_strikes,
      totalStrikesEver: row.total_strikes_ever ?? 0,
      pending_notifications: row.pending_notifications,
      unlockedOutfits: row.unlockedOutfits || [],
      equippedOutfitId: row.equippedOutfitId || 'outfit_starter',
      outfitStones: row.outfitStones || {},
      level: row.level ?? 1,
      currentXp: row.current_xp ?? 0,
      requiredXp: row.required_xp ?? 100,
      totalXp: row.total_xp ?? 0,
      dailyXp: row.daily_xp ?? 0,
      rank: row.rank ?? 'E',
      streak: currentStreak,
      streakUpdated,
      streakShieldUsed,
      streakBroke,
      streakShields: currentShields,
      streakBeforeBreak: streakBroke ? (row.streak_before_break ?? row.streak ?? 0) : (row.streak_before_break ?? 0),
      streakBrokenAt: row.streak_broken_at || null,
      streakMilestone,
      hp: row.hp ?? 100,
      maxHp: row.max_hp ?? 100,
      mp: row.mp ?? 100,
      maxMp: row.max_mp ?? 100,
      updatedAt: finalUpdatedAt,
      // D/W/M stats (server-authoritative after resets)
      dailyStats: serverDailyStats,
      weeklyStats: serverWeeklyStats,
      monthlyStats: serverMonthlyStats,
    });
  } catch (err) {
    console.error('[Player SYNC]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const authUserId = getAuthenticatedUserId(req);
  if (!authUserId) return res.status(401).json({ error: 'Unauthorized' });
  if (authUserId !== id) return res.status(403).json({ error: 'Forbidden' });
  try {
    const { data, error } = await (supabaseServer() as any)
      .from('players')
      .select('supabase_id, username, name, level, current_xp, required_xp, total_xp, daily_xp, rank, streak, hp, max_hp, mp, max_mp, gold, keys, is_configured, is_banned, is_penalty_active, penalty_end_time, cheat_strikes, total_strikes_ever, last_login_date, last_dungeon_entry, tutorial_step, tutorial_complete, daily_quest_complete, last_daily_reset, last_weekly_reset, last_monthly_reset, daily_stats, weekly_stats, monthly_stats, avatar_url, pending_notifications, raw_data, updated_at')
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

  // ── Server-side validation: reject obviously tampered data ──
  if (typeof data.level === 'number' && (data.level < 1 || data.level > 200)) {
    return res.status(400).json({ error: 'Invalid level value' });
  }
  if (typeof data.currentXp === 'number' && data.currentXp < 0) {
    return res.status(400).json({ error: 'Invalid XP value' });
  }
  if (typeof data.gold === 'number' && data.gold < 0) {
    return res.status(400).json({ error: 'Invalid gold value' });
  }
  if (typeof data.keys === 'number' && data.keys < 0) {
    return res.status(400).json({ error: 'Invalid keys value' });
  }
  if (typeof data.cheatStrikes === 'number' && data.cheatStrikes < 0) {
    return res.status(400).json({ error: 'Invalid strikes value' });
  }

  try {
    // Strip cheatStrikes and isBanned from client data — only admin routes and /record-strike may write these
    // Also extract _serverGold/_serverKeys (client's last-known server values for delta calculation)
    const { cheatStrikes: _strippedStrikes, isBanned: _strippedBan, _serverGold, _serverKeys, _lastKnownUpdatedAt, ...cleanData } = data;

    // ── Delta-based gold/keys merge ──
    // Read current DB state so we can apply only the CLIENT's delta
    const { data: currentRow, error: readError } = await (supabaseServer() as any)
      .from('players')
      .select('gold, keys, raw_data, updated_at')
      .eq('supabase_id', id)
      .single();
    if (readError) throw readError;

    // ── Phase 3: Optimistic concurrency — reject if DB was updated by another device ──
    if (_lastKnownUpdatedAt && currentRow?.updated_at) {
      const dbTime = new Date(currentRow.updated_at).getTime();
      const clientTime = new Date(_lastKnownUpdatedAt).getTime();
      // If DB was updated more than 3s after the client's last known state, reject
      if (dbTime > clientTime + 3000) {
        return res.status(409).json({
          error: 'conflict',
          message: 'Data was updated by another device. Please refresh.',
          serverUpdatedAt: currentRow.updated_at,
        });
      }
    }

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

    // ── Phase 1C: DEEP MERGE raw_data instead of overwriting ──
    // Arrays with IDs (quests, logs, nutritionLogs, history) are merged by ID.
    // Items from both DB and client are kept; client version wins on conflicts.
    const dbRaw = (currentRow?.raw_data as Record<string, any>) || {};
    const clientRaw = { ...cleanData, gold: newGold, keys: newKeys };

    // Helper: merge two arrays by item ID, preferring client items on conflict
    function mergeArraysById(dbArr: any[], clientArr: any[], idKey: string = 'id'): any[] {
      const map = new Map<string, any>();
      const noIdItems: any[] = [];
      // DB items first (will be overwritten by client if same ID)
      for (const item of (dbArr || [])) {
        const key = item?.[idKey];
        if (key) { map.set(String(key), item); }
        else { noIdItems.push(item); }
      }
      // Client items overwrite DB items with same ID, add new ones
      for (const item of (clientArr || [])) {
        const key = item?.[idKey];
        if (key) { map.set(String(key), item); }
        // Don't duplicate no-id items from client — client version of raw_data already overwrites
      }
      return [...Array.from(map.values()), ...noIdItems];
    }

    // Fields with ID-based arrays that need merging
    const MERGE_ARRAY_FIELDS: { key: string; idKey: string }[] = [
      { key: 'quests', idKey: 'id' },
      { key: 'logs', idKey: 'id' },
      { key: 'nutritionLogs', idKey: 'id' },
      { key: 'history', idKey: 'date' },
    ];

    const mergedRaw = { ...dbRaw, ...clientRaw };
    for (const { key, idKey } of MERGE_ARRAY_FIELDS) {
      const dbArr = Array.isArray(dbRaw[key]) ? dbRaw[key] : [];
      const clientArr = Array.isArray(clientRaw[key]) ? clientRaw[key] : [];
      if (dbArr.length > 0 || clientArr.length > 0) {
        mergedRaw[key] = mergeArraysById(dbArr, clientArr, idKey);
      }
    }

    const nowIso = new Date().toISOString();

    // ── Weekly XP accumulation for leaderboard ──
    // Read the current DB state for weekly XP tracking
    let weeklyXp = 0;
    let weekStartDate = nowIso;
    try {
      const { data: weekRow } = await (supabaseServer() as any)
        .from('players')
        .select('weekly_xp, week_start_date, daily_xp')
        .eq('supabase_id', id)
        .single();
      
      if (weekRow) {
        const now = new Date();
        const dayOfWeek = now.getUTCDay();
        const currentMonday = new Date(now);
        currentMonday.setUTCDate(now.getUTCDate() - ((dayOfWeek + 6) % 7));
        currentMonday.setUTCHours(0, 0, 0, 0);

        const playerWeekStart = weekRow.week_start_date ? new Date(weekRow.week_start_date) : new Date(0);
        
        if (playerWeekStart.getTime() < currentMonday.getTime()) {
          // New week! Reset weekly_xp, start fresh with this sync's dailyXp
          weeklyXp = cleanData.dailyXp || 0;
          weekStartDate = currentMonday.toISOString();
        } else {
          // Same week — add the delta between new and old daily_xp
          const oldDailyXp = weekRow.daily_xp || 0;
          const newDailyXp = cleanData.dailyXp || 0;
          const dailyDelta = Math.max(0, newDailyXp - oldDailyXp);
          weeklyXp = (weekRow.weekly_xp || 0) + dailyDelta;
          weekStartDate = weekRow.week_start_date || currentMonday.toISOString();
        }
      }
    } catch { /* weekly_xp column may not exist yet — ignore */ }

    const playerData: Record<string, any> = {
      username: cleanData.username || cleanData.name || ('u_' + id.slice(-8)),
      name: cleanData.name || 'Hunter',
      level: cleanData.level || 1,
      current_xp: cleanData.currentXp || 0,
      required_xp: cleanData.requiredXp || 100,
      total_xp: cleanData.totalXp || 0,
      daily_xp: cleanData.dailyXp || 0,
      weekly_xp: weeklyXp,
      week_start_date: weekStartDate,
      rank: cleanData.rank || 'E',
      // NOTE: streak and last_login_date are NOT set here — they are server-authoritative.
      // The /sync endpoint computes streak from last_login_date and updates Supabase atomically.
      hp: data.hp ?? 100,
      max_hp: data.maxHp ?? 100,
      mp: data.mp ?? 100,
      max_mp: data.maxMp ?? 100,
      is_configured: data.isConfigured || false,
      is_penalty_active: data.isPenaltyActive || false,
      penalty_end_time: data.penaltyEndTime || null,
      // last_login_date is server-authoritative (set by /sync endpoint)
      last_dungeon_entry: data.lastDungeonEntry || null,
      tutorial_step: data.tutorialStep || 0,
      tutorial_complete: data.tutorialComplete || false,
      daily_quest_complete: data.dailyQuestComplete || false,
      last_daily_reset: data.lastDailyReset || null,
      last_weekly_reset: data.lastWeeklyReset || null,
      last_monthly_reset: data.lastMonthlyReset || null,
      // D/W/M stats — written from client state (server resets happen in /sync)
      daily_stats: data.dailyStats || null,
      weekly_stats: data.weeklyStats || null,
      monthly_stats: data.monthlyStats || null,
      identity: data.identity || null,
      gold: newGold,
      keys: newKeys,
      raw_data: mergedRaw,
      // Keep dedicated border column in sync with raw_data (for leaderboard reads)
      equipped_border: mergedRaw.equippedBorder || null,
      updated_at: nowIso,
    };

    // Use update (not upsert) to prevent creating duplicate rows
    const { error } = await (supabaseServer() as any)
      .from('players')
      .update(playerData)
      .eq('supabase_id', id);

    if (error) throw error;

    return res.json({ success: true, _serverGold: newGold, _serverKeys: newKeys, _serverUpdatedAt: nowIso });
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
    // Fetch current gold, keys, and ban/anomaly fields so we can preserve them
    const { data: current, error: fetchErr } = await (supabaseServer() as any)
      .from('players')
      .select('gold, keys, username, name, email, auth_type, avatar_url, is_banned, cheat_strikes, total_strikes_ever')
      .eq('supabase_id', id)
      .single();
    if (fetchErr) throw fetchErr;

    const freshRawData = {
      gold: current.gold,
      keys: current.keys,
      name: current.name,
      username: current.username,
      isBanned: current.is_banned,
      cheatStrikes: current.cheat_strikes ?? 0,
      totalStrikesEver: current.total_strikes_ever ?? 0,
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
        mp: 100,
        max_mp: 100,
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

// ── Delete Account: Google Play requires self-service account deletion ──
router.delete('/:id/delete-account', async (req: Request, res: Response) => {
  const { id } = req.params;
  const authUserId = getAuthenticatedUserId(req);
  if (!authUserId) return res.status(401).json({ error: 'Unauthorized' });
  if (authUserId !== id) return res.status(403).json({ error: 'Forbidden — can only delete your own account' });

  try {
    const sb = supabaseServer() as any;

    // 1. Delete player row from public.players table (CRITICAL — must succeed)
    const { error: deleteError } = await sb
      .from('players')
      .delete()
      .eq('supabase_id', id);

    if (deleteError) {
      console.error('[Account Delete] Failed to delete player row:', deleteError);
      return res.status(500).json({ error: 'Failed to delete account data. Please try again.' });
    }

    // 2. Delete Supabase Auth user (best-effort — requires service_role key)
    try {
      const { error: authError } = await sb.auth.admin.deleteUser(id);
      if (authError) {
        console.warn('[Account Delete] Auth user delete failed (non-critical):', authError.message);
      }
    } catch (authErr) {
      // If using anon key instead of service_role, this will fail — that's OK,
      // the player row is already gone which is the critical data.
      console.warn('[Account Delete] Auth admin API unavailable:', (authErr as any)?.message);
    }

    // 3. Delete avatar from storage (best-effort)
    try {
      await sb.storage.from('avatars').remove([`avatars/${id}.webp`]);
    } catch { /* avatar may not exist */ }

    // 4. Destroy the session
    if (req.session) {
      req.session.destroy(() => {});
    }

    console.log(`[Account Delete] User ${id} — account permanently deleted`);
    return res.json({ success: true, message: 'Account and all data permanently deleted.' });
  } catch (err) {
    console.error('[Account Delete]', err);
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

// ── STREAK SHIELD PURCHASE ──
// Cost: 75 Gold, Max 2 shields at a time
router.post('/streak-shield', async (req: Request, res: Response) => {
  const authUserId = getAuthenticatedUserId(req);
  if (!authUserId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const db = supabaseServer() as any;
    const { data: player, error: fetchErr } = await db
      .from('players')
      .select('gold, streak_shields')
      .eq('supabase_id', authUserId)
      .single();

    if (fetchErr || !player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const currentShields = player.streak_shields ?? 0;
    const currentGold = player.gold ?? 0;
    const SHIELD_COST = 75;
    const MAX_SHIELDS = 2;

    if (currentShields >= MAX_SHIELDS) {
      return res.status(400).json({ error: 'You already have the maximum number of shields (2)' });
    }
    if (currentGold < SHIELD_COST) {
      return res.status(400).json({ error: `Not enough gold. Need ${SHIELD_COST}, have ${currentGold}` });
    }

    const { error: updateErr } = await db
      .from('players')
      .update({
        gold: currentGold - SHIELD_COST,
        streak_shields: currentShields + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('supabase_id', authUserId);

    if (updateErr) {
      console.error('[Streak Shield] Update error:', updateErr);
      return res.status(500).json({ error: 'Failed to purchase shield' });
    }

    console.log(`[Streak Shield] ${authUserId.slice(-8)}: Purchased shield (${currentShields} → ${currentShields + 1}), Gold: ${currentGold} → ${currentGold - SHIELD_COST}`);
    return res.json({
      success: true,
      newGold: currentGold - SHIELD_COST,
      newShieldCount: currentShields + 1,
    });
  } catch (err) {
    console.error('[Streak Shield]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── STREAK REPAIR PURCHASE ──
// Cost: min(300, 50 + streak_before_break × 5), available for 48h after break
router.post('/streak-repair', async (req: Request, res: Response) => {
  const authUserId = getAuthenticatedUserId(req);
  if (!authUserId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const db = supabaseServer() as any;
    const { data: player, error: fetchErr } = await db
      .from('players')
      .select('gold, streak, streak_before_break, streak_broken_at')
      .eq('supabase_id', authUserId)
      .single();

    if (fetchErr || !player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const previousStreak = player.streak_before_break ?? 0;
    const brokenAt = player.streak_broken_at ? new Date(player.streak_broken_at) : null;
    const currentGold = player.gold ?? 0;

    // Validate: must have a broken streak
    if (!brokenAt || previousStreak <= 1) {
      return res.status(400).json({ error: 'No broken streak to repair' });
    }

    // Validate: within 48-hour window
    const hoursSinceBreak = (Date.now() - brokenAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceBreak > 48) {
      return res.status(400).json({ error: 'Repair window expired (48 hours)' });
    }

    // Calculate cost: 50 base + 5 per streak day, capped at 300
    const repairCost = Math.min(300, 50 + previousStreak * 5);

    if (currentGold < repairCost) {
      return res.status(400).json({ error: `Not enough gold. Need ${repairCost}, have ${currentGold}` });
    }

    const { error: updateErr } = await db
      .from('players')
      .update({
        gold: currentGold - repairCost,
        streak: previousStreak,
        streak_before_break: 0,
        streak_broken_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('supabase_id', authUserId);

    if (updateErr) {
      console.error('[Streak Repair] Update error:', updateErr);
      return res.status(500).json({ error: 'Failed to repair streak' });
    }

    console.log(`[Streak Repair] ${authUserId.slice(-8)}: Restored streak to ${previousStreak}, Cost: ${repairCost}, Gold: ${currentGold} → ${currentGold - repairCost}`);
    return res.json({
      success: true,
      restoredStreak: previousStreak,
      newGold: currentGold - repairCost,
      cost: repairCost,
    });
  } catch (err) {
    console.error('[Streak Repair]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
