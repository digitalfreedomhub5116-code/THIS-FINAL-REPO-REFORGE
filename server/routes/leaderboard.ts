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

// ── GET /api/leaderboard?type=streak|guild ──
router.get('/', async (req: Request, res: Response) => {
  const type = (req.query.type as string) || 'streak';

  try {
    const dayEnd = getDayEndUTC();

    if (type === 'guild') {
      // ── GUILD LEADERBOARD: sorted by level (and secondary sort by vault_balance or name) ──
      const db = supabaseServer() as any;
      const { data: guilds, error } = await db
        .from('guilds')
        .select('id, name, tag, icon, level, vault_balance, master_id, member_cap, created_at')
        .order('level', { ascending: false })
        .order('vault_balance', { ascending: false })
        .order('name', { ascending: true })
        .limit(50);

      if (error) {
        console.error('[Leaderboard GET guild]', error);
        return res.status(500).json({ error: 'Internal server error' });
      }

      // Fetch member counts for each guild in a batch query
      const ids = (guilds || []).map((g: any) => g.id);
      const counts: Record<string, number> = {};
      if (ids.length) {
        const { data: members } = await db
          .from('guild_members')
          .select('guild_id')
          .in('guild_id', ids);
        for (const m of members || []) {
          counts[m.guild_id] = (counts[m.guild_id] || 0) + 1;
        }
      }

      const entries = (guilds || []).map((g: any, i: number) => ({
        id: g.id,
        name: g.name,
        tag: g.tag,
        icon: g.icon,
        level: g.level || 0,
        vault_balance: g.vault_balance || 0,
        memberCount: counts[g.id] || 0,
        memberCap: g.member_cap || 25,
        rank: i + 1,
      }));

      // Highlight user's own guild
      const userId = req.query.userId as string;
      let yourRank: number | null = null;
      let yourEntry: any = null;

      if (userId) {
        const { data: memberOf } = await db
          .from('guild_members')
          .select('guild_id')
          .eq('user_id', userId)
          .single();

        if (memberOf) {
          const myGuildId = memberOf.guild_id;
          const myGuildIdx = entries.findIndex((e: any) => e.id === myGuildId);
          if (myGuildIdx >= 0) {
            yourRank = myGuildIdx + 1;
            yourEntry = entries[myGuildIdx];
          } else {
            const { data: myGuild } = await db
              .from('guilds')
              .select('id, name, tag, icon, level, vault_balance, member_cap')
              .eq('id', myGuildId)
              .single();
            if (myGuild) {
              const { count } = await db
                .from('guilds')
                .select('id', { count: 'exact', head: true })
                .or(`level.gt.${myGuild.level},and(level.eq.${myGuild.level},vault_balance.gt.${myGuild.vault_balance})`);
              
              const { count: memberCountRes } = await db
                .from('guild_members')
                .select('id', { count: 'exact', head: true })
                .eq('guild_id', myGuildId);

              yourRank = (count || 0) + 1;
              yourEntry = {
                id: myGuild.id,
                name: myGuild.name,
                tag: myGuild.tag,
                icon: myGuild.icon,
                level: myGuild.level || 0,
                vault_balance: myGuild.vault_balance || 0,
                memberCount: memberCountRes || 0,
                memberCap: myGuild.member_cap || 25,
                rank: yourRank,
              };
            }
          }
        }
      }

      return res.json({
        entries,
        yourRank,
        yourEntry,
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
              const myLastLogin = me.last_login_date as string | null;
              const isActive = myLastLogin === todayStr || myLastLogin === yesterdayStr;
              const myStreak = isActive ? (me.streak || 0) : 0;

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
