import { Router, Request, Response } from 'express';
import { supabaseServer } from '../lib/supabase.js';
import { getAuthenticatedUserId } from '../lib/playerAuth.js';
// ── Inline safeLevelUp (mirrors lib/levelSystem.ts) ──
function computeRank(level: number): string {
  if (level >= 80) return 'S';
  if (level >= 55) return 'A';
  if (level >= 39) return 'B';
  if (level >= 27) return 'C';
  if (level >= 11) return 'D';
  return 'E';
}
function safeLevelUp(currentXp: number, requiredXp: number, level: number) {
  if (!requiredXp || requiredXp < 50) requiredXp = 100;
  let leveledUp = false;
  let iterations = 0;
  while (currentXp >= requiredXp && iterations < 100) {
    currentXp -= requiredXp;
    level++;
    const next = Math.floor(requiredXp * 1.5);
    requiredXp = next > requiredXp ? next : requiredXp + 1;
    leveledUp = true;
    iterations++;
  }
  return { currentXp, requiredXp, level, leveledUp, rank: computeRank(level) };
}

// ── Day boundary helpers ──
function getDayStartUTC(): Date {
  const now = new Date();
  const today = new Date(now);
  today.setUTCHours(0, 0, 0, 0);
  return today;
}

function getDayEndUTC(): Date {
  const today = getDayStartUTC();
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(today.getUTCDate() + 1);
  return tomorrow;
}

const router = Router();

// ── GET /api/leaderboard?type=xp|streak ──
router.get('/', async (req: Request, res: Response) => {
  const type = (req.query.type as string) || 'xp';

  try {
    const dayEnd = getDayEndUTC();

    if (type === 'xp') {
      // ── XP LEADERBOARD: daily_xp, resets every midnight UTC ──
      // Also fetch last_daily_reset to zero-out stale players at query time
      const todayStr = getDayStartUTC().toISOString().split('T')[0]; // "2026-05-09"

      const { data, error } = await (supabaseServer() as any)
        .from('players')
        .select('id, supabase_id, username, name, total_xp, daily_xp, last_daily_reset, level, rank, streak, avatar_url, raw_data, equipped_border, updated_at')
        .eq('is_banned', false)
        .order('daily_xp', { ascending: false })
        .limit(100); // Fetch more to account for stale entries we'll zero out

      if (error) {
        console.error('[Leaderboard GET xp]', error);
        return res.status(500).json({ error: 'Internal server error' });
      }

      const entries = (data || []).map((row: any) => {
        const lastActive = row.updated_at ? new Date(row.updated_at) : null;
        const isToday = lastActive && (Date.now() - lastActive.getTime()) < 24 * 60 * 60 * 1000;
        const effectiveDailyXp = isToday ? (row.daily_xp || 0) : 0;

        return {
          player_id: row.id,
          supabase_id: row.supabase_id,
          username: row.username,
          name: row.name,
          total_xp: row.total_xp || 0,
          daily_xp: effectiveDailyXp,
          weekly_xp: effectiveDailyXp, // API compat — client reads weekly_xp
          level: row.level || 1,
          rank: row.rank || 'E',
          streak: row.streak || 0,
          avatar_url: row.avatar_url || null,
          equipped_outfit_id: row.raw_data?.equippedOutfitId || 'outfit_starter',
          equipped_border: row.equipped_border || row.raw_data?.equippedBorder || null,
          equipped_banner: row.raw_data?.equippedBanner || null,
        };
      });

      // Sort by effective daily XP (after stale detection) and take top 50
      entries.sort((a: any, b: any) => b.daily_xp - a.daily_xp);
      entries.splice(50); // Trim to top 50

      // ── Neighborhood View: find user's position if not in top results ──
      const userId = req.query.userId as string;
      let yourRank: number | null = null;
      let yourEntry: any = null;
      let neighborhood: { above: any[]; below: any[] } | null = null;

      if (userId) {
        const isInList = entries.some((e: any) => e.supabase_id === userId);
        if (!isInList) {
          try {
            const { data: me } = await (supabaseServer() as any)
              .from('players')
              .select('id, supabase_id, username, name, total_xp, daily_xp, last_daily_reset, level, rank, streak, avatar_url, raw_data, equipped_border, updated_at')
              .eq('supabase_id', userId)
              .eq('is_banned', false)
              .single();

            if (me) {
              const lastActiveMe = me.updated_at ? new Date(me.updated_at) : null;
              const meIsToday = lastActiveMe && (Date.now() - lastActiveMe.getTime()) < 24 * 60 * 60 * 1000;
              const myDailyXp = meIsToday ? (me.daily_xp || 0) : 0;

              const activeTimeCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

              // Count players above — only those who were active in the last 24 hours
              const { count } = await (supabaseServer() as any)
                .from('players')
                .select('id', { count: 'exact', head: true })
                .eq('is_banned', false)
                .gte('updated_at', activeTimeCutoff)
                .gt('daily_xp', myDailyXp);

              yourRank = (count || 0) + 1;
              yourEntry = {
                player_id: me.id,
                supabase_id: me.supabase_id,
                username: me.username,
                name: me.name,
                total_xp: me.total_xp || 0,
                daily_xp: myDailyXp,
                weekly_xp: myDailyXp,
                level: me.level || 1,
                rank: me.rank || 'E',
                streak: me.streak || 0,
                avatar_url: me.avatar_url || null,
                equipped_outfit_id: me.raw_data?.equippedOutfitId || 'outfit_starter',
                equipped_border: me.equipped_border || me.raw_data?.equippedBorder || null,
                equipped_banner: me.raw_data?.equippedBanner || null,
              };

              // Get 2 players just above (higher daily_xp, active in last 24 hours)
              const { data: aboveData } = await (supabaseServer() as any)
                .from('players')
                .select('id, supabase_id, username, name, total_xp, daily_xp, last_daily_reset, level, rank, streak, avatar_url, raw_data, equipped_border, updated_at')
                .eq('is_banned', false)
                .gte('updated_at', activeTimeCutoff)
                .gt('daily_xp', myDailyXp)
                .order('daily_xp', { ascending: true })
                .limit(2);

              // Get 2 players just below (lower daily_xp, active in last 24 hours)
              const { data: belowData } = await (supabaseServer() as any)
                .from('players')
                .select('id, supabase_id, username, name, total_xp, daily_xp, last_daily_reset, level, rank, streak, avatar_url, raw_data, equipped_border, updated_at')
                .eq('is_banned', false)
                .gte('updated_at', activeTimeCutoff)
                .lt('daily_xp', myDailyXp)
                .order('daily_xp', { ascending: false })
                .limit(2);

              const mapEntry = (row: any) => ({
                player_id: row.id,
                supabase_id: row.supabase_id,
                username: row.username,
                name: row.name,
                total_xp: row.total_xp || 0,
                daily_xp: row.daily_xp || 0,
                weekly_xp: row.daily_xp || 0,
                level: row.level || 1,
                rank: row.rank || 'E',
                streak: row.streak || 0,
                avatar_url: row.avatar_url || null,
                equipped_outfit_id: row.raw_data?.equippedOutfitId || 'outfit_starter',
                equipped_border: row.equipped_border || row.raw_data?.equippedBorder || null,
                equipped_banner: row.raw_data?.equippedBanner || null,
              });

              neighborhood = {
                above: (aboveData || []).reverse().map(mapEntry),
                below: (belowData || []).map(mapEntry),
              };
            }
          } catch (nErr) {
            console.error('[Leaderboard] Neighborhood query failed:', nErr);
            // Non-fatal: continue without neighborhood
          }
        }
      }

      // Add day timing info
      return res.json({
        entries,
        weekEnd: dayEnd.toISOString(),
        yourRank,
        yourEntry,
        neighborhood,
      });

    } else {
      // ── STREAK LEADERBOARD: sorted by streak, with server-side decay ──
      // Players who haven't logged in for >1 day have their streak broken.
      const { data, error } = await (supabaseServer() as any)
        .from('players')
        .select('id, supabase_id, username, name, total_xp, daily_xp, weekly_xp, level, rank, streak, last_login_date, avatar_url, raw_data, equipped_border, updated_at')
        .eq('is_banned', false)
        .gt('streak', 0)
        .order('streak', { ascending: false })
        .limit(50);

      if (error) {
        console.error('[Leaderboard GET streak]', error);
        return res.status(500).json({ error: 'Internal server error' });
      }

      // Compute effective streak: if updated_at is >24h ago, streak is broken
      const now = new Date();

      const stalePlayerIds: string[] = [];

      const entries = (data || []).map((row: any) => {
        const lastActiveAt = row.updated_at ? new Date(row.updated_at) : null;
        const hoursSinceActive = lastActiveAt
          ? (now.getTime() - lastActiveAt.getTime()) / (1000 * 60 * 60)
          : Infinity;
        const isActive = hoursSinceActive <= 24;
        const effectiveStreak = isActive ? (row.streak || 0) : 0;

        // Track stale players for batch DB reset
        if (!isActive && (row.streak || 0) > 0) {
          stalePlayerIds.push(row.id);
        }

        return {
          player_id: row.id,
          supabase_id: row.supabase_id,
          username: row.username,
          name: row.name,
          total_xp: row.total_xp || 0,
          daily_xp: row.daily_xp || 0,
          weekly_xp: row.weekly_xp || 0,
          level: row.level || 1,
          rank: row.rank || 'E',
          streak: effectiveStreak,
          avatar_url: row.avatar_url || null,
          equipped_outfit_id: row.raw_data?.equippedOutfitId || 'outfit_starter',
          equipped_border: row.equipped_border || row.raw_data?.equippedBorder || null,
          equipped_banner: row.raw_data?.equippedBanner || null,
        };
      }).filter((e: any) => e.streak > 0) // Remove broken streaks from results
        .sort((a: any, b: any) => b.streak - a.streak);

      // Batch-reset stale streaks in DB (fire-and-forget, don't block response)
      if (stalePlayerIds.length > 0) {
        (supabaseServer() as any)
          .from('players')
          .update({ streak: 0 })
          .in('id', stalePlayerIds)
          .then(({ error: resetErr }: any) => {
            if (resetErr) console.error('[Leaderboard] Failed to reset stale streaks:', resetErr);
            else console.log(`[Leaderboard] Reset ${stalePlayerIds.length} stale streaks to 0`);
          });
      }

      // ── Neighborhood View for streak tab ──
      const userId = req.query.userId as string;
      let yourRank: number | null = null;
      let yourEntry: any = null;
      let neighborhood: { above: any[]; below: any[] } | null = null;

      if (userId) {
        const isInList = entries.some((e: any) => e.supabase_id === userId);
        if (!isInList) {
          try {
            const { data: me } = await (supabaseServer() as any)
              .from('players')
              .select('id, supabase_id, username, name, total_xp, daily_xp, weekly_xp, level, rank, streak, last_login_date, avatar_url, raw_data, equipped_border')
              .eq('supabase_id', userId)
              .eq('is_banned', false)
              .single();

            if (me) {
              // Use same 24h window logic as main leaderboard
              const myStreak = me.streak || 0;

              if (myStreak > 0) {
                const { count } = await (supabaseServer() as any)
                  .from('players')
                  .select('id', { count: 'exact', head: true })
                  .eq('is_banned', false)
                  .gt('streak', myStreak);

                yourRank = (count || 0) + 1;
                yourEntry = {
                  player_id: me.id,
                  supabase_id: me.supabase_id,
                  username: me.username,
                  name: me.name,
                  total_xp: me.total_xp || 0,
                  daily_xp: me.daily_xp || 0,
                  weekly_xp: me.weekly_xp || 0,
                  level: me.level || 1,
                  rank: me.rank || 'E',
                  streak: myStreak,
                  avatar_url: me.avatar_url || null,
                  equipped_outfit_id: me.raw_data?.equippedOutfitId || 'outfit_starter',
                  equipped_border: me.equipped_border || me.raw_data?.equippedBorder || null,
                  equipped_banner: me.raw_data?.equippedBanner || null,
                };
              }
            }
          } catch (nErr) {
            console.error('[Leaderboard] Streak neighborhood failed:', nErr);
          }
        }
      }

      return res.json({ entries, yourRank, yourEntry, neighborhood });
    }
  } catch (err) {
    console.error('[Leaderboard GET]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Check for unclaimed rank rewards for a specific player ──
router.get('/rewards', async (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  try {
    const db = supabaseServer() as any;

    // Translate userId (Google OAuth numeric ID / supabase_id) to internal DB UUID
    const { data: playerRow, error: playerErr } = await db
      .from('players')
      .select('id')
      .eq('supabase_id', userId)
      .limit(1)
      .single();

    if (playerErr || !playerRow) {
      // Player not found — no rewards to show
      return res.json({ reward: null });
    }

    const internalId: string = playerRow.id;

    const { data, error } = await db
      .from('daily_rank_snapshots')
      .select('id, player_id, snapshot_date, rank, daily_xp, reward_gold, reward_xp, reward_keys, claimed')
      .eq('player_id', internalId)
      .eq('claimed', false)
      .order('snapshot_date', { ascending: false })
      .limit(1);

    if (error) {
      console.error('[Leaderboard Rewards GET]', error);
      return res.status(500).json({ error: 'Internal server error' });
    }

    if (!data || data.length === 0) {
      return res.json({ reward: null });
    }

    return res.json({ reward: data[0] });
  } catch (err) {
    console.error('[Leaderboard Rewards GET]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Claim a rank reward: auth-gated, credits rewards server-side, prevents double-claim ──
router.post('/rewards/claim', async (req: Request, res: Response) => {
  const authUserId = getAuthenticatedUserId(req);
  if (!authUserId) return res.status(401).json({ error: 'Unauthorized' });

  const { snapshotId } = req.body;
  if (!snapshotId) return res.status(400).json({ error: 'snapshotId required' });

  try {
    const db = supabaseServer() as any;

    // 1. Fetch snapshot and verify it exists + not already claimed
    const { data: snapshot, error: snapErr } = await db
      .from('daily_rank_snapshots')
      .select('id, player_id, reward_gold, reward_xp, reward_keys, claimed')
      .eq('id', snapshotId)
      .single();

    if (snapErr || !snapshot) {
      return res.status(404).json({ error: 'Snapshot not found' });
    }
    if (snapshot.claimed) {
      return res.json({ success: true, already_claimed: true });
    }

    // 2. Verify the requesting user owns this snapshot
    const { data: playerRow, error: playerErr } = await db
      .from('players')
      .select('id, gold, keys, total_xp, current_xp, required_xp, daily_xp, level, rank')
      .eq('supabase_id', authUserId)
      .single();

    if (playerErr || !playerRow) {
      return res.status(403).json({ error: 'Player not found' });
    }
    if (playerRow.id !== snapshot.player_id) {
      return res.status(403).json({ error: 'Forbidden — snapshot does not belong to you' });
    }

    // 3. Credit rewards to the player's DB account
    const rewardXp = snapshot.reward_xp || 0;
    const newGold = (playerRow.gold || 0) + (snapshot.reward_gold || 0);
    const newKeys = (playerRow.keys || 0) + (snapshot.reward_keys || 0);
    const newTotalXp = (playerRow.total_xp || 0) + rewardXp;
    const newDailyXp = (playerRow.daily_xp || 0) + rewardXp;

    // Run safeLevelUp to handle overflow into level-ups
    const lu = safeLevelUp(
      (playerRow.current_xp || 0) + rewardXp,
      playerRow.required_xp || 100,
      playerRow.level || 1
    );

    const { error: creditErr } = await db
      .from('players')
      .update({
        gold: newGold,
        keys: newKeys,
        total_xp: newTotalXp,
        daily_xp: newDailyXp,
        current_xp: lu.currentXp,
        required_xp: lu.requiredXp,
        level: lu.level,
        rank: lu.rank,
      })
      .eq('id', playerRow.id);

    if (creditErr) {
      console.error('[Leaderboard Rewards Claim] Credit failed:', creditErr);
      return res.status(500).json({ error: 'Failed to credit rewards' });
    }

    // 4. Mark snapshot as claimed
    const { error: claimErr } = await db
      .from('daily_rank_snapshots')
      .update({ claimed: true })
      .eq('id', snapshotId);

    if (claimErr) {
      console.error('[Leaderboard Rewards Claim] Mark claimed failed:', claimErr);
    }

    console.log(`[Leaderboard Claim] Player ${authUserId} claimed rank reward: +${snapshot.reward_gold}G, +${snapshot.reward_xp}XP, +${snapshot.reward_keys}K (lvl ${lu.level})`);
    return res.json({
      success: true,
      rewards: { gold: snapshot.reward_gold, xp: snapshot.reward_xp, keys: snapshot.reward_keys },
      player: { gold: newGold, keys: newKeys, currentXp: lu.currentXp, requiredXp: lu.requiredXp, level: lu.level, rank: lu.rank, totalXp: newTotalXp, dailyXp: newDailyXp },
    });
  } catch (err) {
    console.error('[Leaderboard Rewards Claim]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
