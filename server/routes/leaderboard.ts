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

// ── Week boundary helpers ──
function getWeekStartMonday(): Date {
  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // 0=Sun, 1=Mon...
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - ((dayOfWeek + 6) % 7));
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

function getWeekEndSunday(): Date {
  const monday = getWeekStartMonday();
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 7);
  return sunday;
}

const router = Router();

// ── GET /api/leaderboard?type=xp|streak ──
router.get('/', async (req: Request, res: Response) => {
  const type = (req.query.type as string) || 'xp';

  try {
    const weekStart = getWeekStartMonday();
    const weekEnd = getWeekEndSunday();

    if (type === 'xp') {
      // ── XP LEADERBOARD: weekly_xp, resets every Monday ──
      const { data, error } = await (supabaseServer() as any)
        .from('players')
        .select('id, supabase_id, username, name, total_xp, daily_xp, weekly_xp, week_start_date, level, rank, streak, avatar_url, raw_data, equipped_border, updated_at')
        .eq('is_banned', false)
        .order('weekly_xp', { ascending: false })
        .limit(50);

      if (error) {
        console.error('[Leaderboard GET xp]', error);
        return res.status(500).json({ error: 'Internal server error' });
      }

      const entries = (data || []).map((row: any) => {
        // Check if this player's weekly_xp is from the current week
        const playerWeekStart = row.week_start_date ? new Date(row.week_start_date).getTime() : 0;
        const currentWeekStart = weekStart.getTime();
        // If the player's week_start_date is before this Monday, their weekly_xp is stale
        const isCurrentWeek = playerWeekStart >= currentWeekStart;
        const effectiveWeeklyXp = isCurrentWeek ? (row.weekly_xp || 0) : 0;

        return {
          player_id: row.id,
          supabase_id: row.supabase_id,
          username: row.username,
          name: row.name,
          total_xp: row.total_xp || 0,
          daily_xp: row.daily_xp || 0,
          weekly_xp: effectiveWeeklyXp,
          level: row.level || 1,
          rank: row.rank || 'E',
          streak: row.streak || 0,
          avatar_url: row.avatar_url || null,
          equipped_outfit_id: row.raw_data?.equippedOutfitId || 'outfit_starter',
          equipped_border: row.equipped_border || row.raw_data?.equippedBorder || null,
          equipped_banner: row.raw_data?.equippedBanner || null,
        };
      });

      // Re-sort by effective weekly XP (after stale detection)
      entries.sort((a: any, b: any) => b.weekly_xp - a.weekly_xp);

      // Add week timing info
      return res.json({
        entries,
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
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

      // Compute effective streak: if last_login_date is >1 day ago, streak is broken
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const yesterdayDate = new Date(now);
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterdayStr = `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth() + 1).padStart(2, '0')}-${String(yesterdayDate.getDate()).padStart(2, '0')}`;

      const stalePlayerIds: string[] = [];

      const entries = (data || []).map((row: any) => {
        const lastLogin = row.last_login_date as string | null;
        const isActive = lastLogin === todayStr || lastLogin === yesterdayStr;
        const effectiveStreak = isActive ? (row.streak || 0) : 0;

        // Track stale players for batch DB reset
        if (!isActive && (row.streak || 0) > 1) {
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
          .update({ streak: 1 })
          .in('id', stalePlayerIds)
          .then(({ error: resetErr }: any) => {
            if (resetErr) console.error('[Leaderboard] Failed to reset stale streaks:', resetErr);
            else console.log(`[Leaderboard] Reset ${stalePlayerIds.length} stale streaks to 1`);
          });
      }

      return res.json({ entries });
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
