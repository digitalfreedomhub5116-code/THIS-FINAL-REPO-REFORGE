import { Router, Request, Response } from 'express';
import { supabaseServer } from '../lib/supabase.js';
import { getAuthenticatedUserId } from '../lib/playerAuth.js';

const router = Router();

// ── League tier config (Solo Leveling themed) ──
export const LEAGUE_TIERS = ['E', 'D', 'C', 'B', 'A', 'S'] as const;
export type LeagueTier = typeof LEAGUE_TIERS[number];

export const LEAGUE_TIER_CONFIG: Record<LeagueTier, {
  name: string; icon: string; color: string; glow: string; nextTier: LeagueTier | null; prevTier: LeagueTier | null;
}> = {
  E: { name: 'E-Rank', icon: '⚔️', color: '#78716C', glow: 'rgba(120,113,108,0.3)', nextTier: 'D', prevTier: null },
  D: { name: 'D-Rank', icon: '🗡️', color: '#F97316', glow: 'rgba(249,115,22,0.3)', nextTier: 'C', prevTier: 'E' },
  C: { name: 'C-Rank', icon: '🔵', color: '#60A5FA', glow: 'rgba(96,165,250,0.3)', nextTier: 'B', prevTier: 'D' },
  B: { name: 'B-Rank', icon: '💠', color: '#7EB8D4', glow: 'rgba(126,184,212,0.3)', nextTier: 'A', prevTier: 'C' },
  A: { name: 'A-Rank', icon: '🌟', color: '#EAB308', glow: 'rgba(234,179,8,0.4)', nextTier: 'S', prevTier: 'B' },
  S: { name: 'S-Rank', icon: '💎', color: '#A855F7', glow: 'rgba(168,85,247,0.5)', nextTier: null, prevTier: 'A' },
};

// ── Week helpers ──
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

// ── GET /api/league/current — Returns user's current 30-person league ──
router.get('/current', async (req: Request, res: Response) => {
  const authUserId = getAuthenticatedUserId(req);
  if (!authUserId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const db = supabaseServer() as any;
    const weekStart = getWeekStartMonday().toISOString().split('T')[0];
    const weekEnd = getWeekEndSunday().toISOString();

    // First, get the internal player ID from supabase_id
    const { data: playerRecord } = await db
      .from('players')
      .select('id, league_tier')
      .eq('supabase_id', authUserId)
      .single();

    if (!playerRecord) {
      return res.status(404).json({ error: 'Player not found' });
    }
    const internalPlayerId = playerRecord.id;

    // 1. Find the user's league for this week
    let membershipData: any = null;
    const { data: membership, error: memErr } = await db
      .from('league_members')
      .select('league_id, leagues!inner(id, tier, group_number, week_start)')
      .eq('player_id', internalPlayerId)
      .eq('leagues.week_start', weekStart)
      .limit(1)
      .single();

    if (memErr || !membership) {
      // User has no league yet this week — try to assign them
      const assigned = await assignPlayerToLeague(db, authUserId, weekStart);
      if (!assigned) {
        return res.json({
          league: null,
          members: [],
          yourPosition: 0,
          tierConfig: LEAGUE_TIER_CONFIG[(playerRecord.league_tier || 'E') as LeagueTier],
          weekEnd,
          message: 'No league assigned yet. Leagues are created each Monday.',
        });
      }
      // Re-fetch after assignment
      const { data: newMembership } = await db
        .from('league_members')
        .select('league_id, leagues!inner(id, tier, group_number, week_start)')
        .eq('player_id', internalPlayerId)
        .eq('leagues.week_start', weekStart)
        .limit(1)
        .single();
      if (!newMembership) {
        return res.json({ league: null, members: [], yourPosition: 0, tierConfig: LEAGUE_TIER_CONFIG['E'], weekEnd });
      }
      membershipData = newMembership;
    } else {
      membershipData = membership;
    }

    const leagueId = membershipData.league_id;
    const leagueInfo = membershipData.leagues;
    const tier = leagueInfo.tier as LeagueTier;

    // 2. Get all members of this league, joined with players for live weekly_xp
    const { data: members, error: memberErr } = await db
      .from('league_members')
      .select('player_id, weekly_xp, promoted, relegated, final_rank')
      .eq('league_id', leagueId);

    if (memberErr) throw memberErr;

    // 3. Fetch player details for all members
    const playerIds = (members || []).map((m: any) => m.player_id);
    const { data: players, error: playersErr } = await db
      .from('players')
      .select('id, supabase_id, username, name, level, rank, streak, avatar_url, weekly_xp, equipped_border, raw_data, is_banned')
      .in('id', playerIds);

    if (playersErr) throw playersErr;

    // 4. Merge & sort by live weekly_xp from players table
    const playerMap = new Map((players || []).map((p: any) => [p.id, p]));
    const totalMembers = (members || []).length;
    const promotionLine = Math.min(5, Math.floor(totalMembers * 0.17)); // ~top 17%
    const relegationStart = totalMembers - Math.min(5, Math.floor(totalMembers * 0.17)); // ~bottom 17%

    const enrichedMembers = (members || []).map((m: any) => {
      const p = playerMap.get(m.player_id) as any;
      return {
        player_id: m.player_id,
        username: p?.username || p?.name || 'Unknown',
        name: p?.name || '',
        level: p?.level || 1,
        rank: p?.rank || 'E',
        streak: p?.streak || 0,
        avatar_url: p?.avatar_url || null,
        weekly_xp: p?.weekly_xp || 0, // Use LIVE weekly_xp from players table
        equipped_border: p?.equipped_border || null,
        equipped_outfit_id: p?.raw_data?.equippedOutfitId || 'outfit_starter',
        promoted: m.promoted || false,
        relegated: m.relegated || false,
        is_banned: p?.is_banned || false,
      };
    }).filter((m: any) => !m.is_banned).sort((a: any, b: any) => b.weekly_xp - a.weekly_xp);

    // 5. Add zone + rank info
    const withZones = enrichedMembers.map((m: any, i: number) => ({
      ...m,
      position: i + 1,
      zone: i < promotionLine ? 'promotion' : i >= relegationStart ? 'relegation' : 'safe',
    }));

    const yourPosition = withZones.findIndex((m: any) => m.player_id === internalPlayerId) + 1;

    return res.json({
      league: {
        id: leagueId,
        tier,
        groupNumber: leagueInfo.group_number,
        weekStart,
        totalMembers,
      },
      members: withZones,
      yourPosition,
      promotionLine,
      relegationLine: relegationStart + 1,
      tierConfig: LEAGUE_TIER_CONFIG[tier],
      weekEnd,
    });
  } catch (err) {
    console.error('[League] Error fetching current league:', err);
    return res.status(500).json({ error: 'Failed to fetch league data' });
  }
});

// ── GET /api/league/history — Last 4 weeks of results ──
router.get('/history', async (req: Request, res: Response) => {
  const authUserId = getAuthenticatedUserId(req);
  if (!authUserId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const db = supabaseServer() as any;

    // Get internal player ID
    const { data: playerRecord } = await db
      .from('players')
      .select('id')
      .eq('supabase_id', authUserId)
      .single();
    if (!playerRecord) return res.json({ history: [] });

    const { data, error } = await db
      .from('league_members')
      .select('weekly_xp, final_rank, promoted, relegated, leagues!inner(tier, week_start, group_number)')
      .eq('player_id', playerRecord.id)
      .order('leagues(week_start)', { ascending: false })
      .limit(4);

    if (error) throw error;

    const history = (data || []).map((d: any) => ({
      weekStart: d.leagues.week_start,
      tier: d.leagues.tier,
      groupNumber: d.leagues.group_number,
      weeklyXp: d.weekly_xp,
      finalRank: d.final_rank,
      promoted: d.promoted,
      relegated: d.relegated,
    }));

    return res.json({ history });
  } catch (err) {
    console.error('[League] Error fetching history:', err);
    return res.status(500).json({ error: 'Failed to fetch league history' });
  }
});

// ── GET /api/league/promotion-status — Check if user was promoted/relegated last week ──
router.get('/promotion-status', async (req: Request, res: Response) => {
  const authUserId = getAuthenticatedUserId(req);
  if (!authUserId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const db = supabaseServer() as any;

    // Get last week's Monday
    const now = new Date();
    const lastMonday = new Date(now);
    lastMonday.setUTCDate(now.getUTCDate() - ((now.getUTCDay() + 6) % 7) - 7);
    const lastWeekStart = lastMonday.toISOString().split('T')[0];

    // Get internal player ID
    const { data: playerRecord } = await db
      .from('players')
      .select('id')
      .eq('supabase_id', authUserId)
      .single();
    if (!playerRecord) return res.json({ promoted: false, relegated: false, previousTier: null });

    const { data, error } = await db
      .from('league_members')
      .select('promoted, relegated, final_rank, leagues!inner(tier, week_start)')
      .eq('player_id', playerRecord.id)
      .eq('leagues.week_start', lastWeekStart)
      .limit(1)
      .single();

    if (error || !data) {
      return res.json({ promoted: false, relegated: false, previousTier: null });
    }

    // Get current tier
    const { data: playerData } = await db
      .from('players')
      .select('league_tier')
      .eq('supabase_id', authUserId)
      .single();

    return res.json({
      promoted: data.promoted || false,
      relegated: data.relegated || false,
      previousTier: data.leagues.tier,
      currentTier: playerData?.league_tier || 'E',
      finalRank: data.final_rank,
    });
  } catch (err) {
    console.error('[League] Error fetching promotion status:', err);
    return res.json({ promoted: false, relegated: false, previousTier: null });
  }
});

// ── Assign a player to a suitable league (mid-week joiner) ──
async function assignPlayerToLeague(db: any, playerId: string, weekStart: string): Promise<boolean> {
  try {
    // Get player's current tier
    const { data: player } = await db
      .from('players')
      .select('league_tier')
      .eq('supabase_id', playerId)
      .single();

    const tier = player?.league_tier || 'E';

    // Find the smallest existing group in this tier for this week
    const { data: existingLeagues } = await db
      .from('leagues')
      .select('id, group_number, league_members(count)')
      .eq('week_start', weekStart)
      .eq('tier', tier)
      .order('group_number', { ascending: true });

    let targetLeagueId: string;

    if (existingLeagues && existingLeagues.length > 0) {
      // Find group with fewest members (cap at 35)
      let smallest = existingLeagues[0];
      for (const league of existingLeagues) {
        const count = league.league_members?.[0]?.count || 0;
        const smallestCount = smallest.league_members?.[0]?.count || 0;
        if (count < smallestCount && count < 35) {
          smallest = league;
        }
      }

      const smallestCount = smallest.league_members?.[0]?.count || 0;
      if (smallestCount >= 35) {
        // All groups full — create a new one
        const newGroupNumber = existingLeagues.length + 1;
        const { data: newLeague, error: createErr } = await db
          .from('leagues')
          .insert({ week_start: weekStart, tier, group_number: newGroupNumber })
          .select('id')
          .single();

        if (createErr) throw createErr;
        targetLeagueId = newLeague.id;
      } else {
        targetLeagueId = smallest.id;
      }
    } else {
      // No leagues exist for this tier/week yet — create the first one
      const { data: newLeague, error: createErr } = await db
        .from('leagues')
        .insert({ week_start: weekStart, tier, group_number: 1 })
        .select('id')
        .single();

      if (createErr) throw createErr;
      targetLeagueId = newLeague.id;
    }

    // Insert the player
    // First get their internal UUID from the players table  
    const { data: playerRecord } = await db
      .from('players')
      .select('id')
      .eq('supabase_id', playerId)
      .single();

    if (!playerRecord) return false;

    const { error: insertErr } = await db
      .from('league_members')
      .insert({
        league_id: targetLeagueId,
        player_id: playerRecord.id,
        weekly_xp: 0,
      });

    if (insertErr) {
      // Might be duplicate — ignore
      if (insertErr.code === '23505') return true;
      throw insertErr;
    }

    console.log(`[League] Mid-week assignment: ${playerId.slice(-8)} → tier ${tier}, league ${targetLeagueId.slice(-8)}`);
    return true;
  } catch (err) {
    console.error('[League] Failed to assign player:', err);
    return false;
  }
}

// ── Weekly league assignment + promotion/relegation (called by cron) ──
export async function runLeagueAssignmentCron(db: any): Promise<void> {
  const now = new Date();
  const thisMonday = now.toISOString().split('T')[0];

  // Calculate last week's Monday
  const lastMonday = new Date(now);
  lastMonday.setUTCDate(now.getUTCDate() - 7);
  const lastMondayStr = lastMonday.toISOString().split('T')[0];

  console.log(`[League Cron] Processing leagues for week ${lastMondayStr} → ${thisMonday}`);

  // ── STEP 1: Finalize last week's leagues ──
  const { data: lastWeekLeagues } = await db
    .from('leagues')
    .select('id, tier, group_number')
    .eq('week_start', lastMondayStr);

  if (lastWeekLeagues && lastWeekLeagues.length > 0) {
    for (const league of lastWeekLeagues) {
      // Get members sorted by weekly_xp (from players table for live data)
      const { data: members } = await db
        .from('league_members')
        .select('id, player_id')
        .eq('league_id', league.id);

      if (!members || members.length === 0) continue;

      // Get live weekly_xp from players
      const playerIds = members.map((m: any) => m.player_id);
      const { data: players } = await db
        .from('players')
        .select('id, weekly_xp')
        .in('id', playerIds);

      const xpMap = new Map((players || []).map((p: any) => [p.id, p.weekly_xp || 0]));

      // Sort members by XP
      const sorted = [...members].sort((a: any, b: any) =>
        Number(xpMap.get(b.player_id) || 0) - Number(xpMap.get(a.player_id) || 0)
      );

      const total = sorted.length;
      const promoCount = Math.min(5, Math.floor(total * 0.17));
      const releCount = Math.min(5, Math.floor(total * 0.17));

      for (let i = 0; i < sorted.length; i++) {
        const member = sorted[i];
        const isPromoted = i < promoCount && league.tier !== 'S'; // S can't promote
        const isRelegated = i >= total - releCount && league.tier !== 'E'; // E can't relegate

        await db
          .from('league_members')
          .update({
            final_rank: i + 1,
            weekly_xp: xpMap.get(member.player_id) || 0,
            promoted: isPromoted,
            relegated: isRelegated,
          })
          .eq('id', member.id);

        // Apply tier change to player
        if (isPromoted) {
          const nextTier = LEAGUE_TIER_CONFIG[league.tier as LeagueTier]?.nextTier;
          if (nextTier) {
            // Need supabase_id, get it via players table
            const { data: pData } = await db
              .from('players')
              .select('supabase_id')
              .eq('id', member.player_id)
              .single();
            if (pData) {
              await db
                .from('players')
                .update({ league_tier: nextTier })
                .eq('supabase_id', pData.supabase_id);
            }
          }
        } else if (isRelegated) {
          const prevTier = LEAGUE_TIER_CONFIG[league.tier as LeagueTier]?.prevTier;
          if (prevTier) {
            const { data: pData } = await db
              .from('players')
              .select('supabase_id')
              .eq('id', member.player_id)
              .single();
            if (pData) {
              await db
                .from('players')
                .update({ league_tier: prevTier })
                .eq('supabase_id', pData.supabase_id);
            }
          }
        }

        // ── League Top-3 Rewards ──
        const TOP_3_REWARDS = [
          { gold: 200, xp: 100 }, // 1st
          { gold: 100, xp: 50 },  // 2nd
          { gold: 50,  xp: 25 },  // 3rd
        ];
        const PROMOTION_BONUS = { gold: 100, xp: 50 };

        if (i < 3) {
          const reward = TOP_3_REWARDS[i];
          await db.rpc('increment_player_rewards', {
            p_player_id: member.player_id,
            p_gold: reward.gold + (isPromoted ? PROMOTION_BONUS.gold : 0),
            p_xp: reward.xp + (isPromoted ? PROMOTION_BONUS.xp : 0),
          }).catch(async () => {
            // Fallback: direct update if RPC doesn't exist
            const { data: pData } = await db.from('players').select('gold, total_xp').eq('id', member.player_id).single();
            if (pData) {
              await db.from('players').update({
                gold: (pData.gold || 0) + reward.gold + (isPromoted ? PROMOTION_BONUS.gold : 0),
                total_xp: (pData.total_xp || 0) + reward.xp + (isPromoted ? PROMOTION_BONUS.xp : 0),
              }).eq('id', member.player_id);
            }
          });
        } else if (isPromoted) {
          // Promotion bonus only (not top 3)
          const { data: pData } = await db.from('players').select('gold, total_xp').eq('id', member.player_id).single();
          if (pData) {
            await db.from('players').update({
              gold: (pData.gold || 0) + PROMOTION_BONUS.gold,
              total_xp: (pData.total_xp || 0) + PROMOTION_BONUS.xp,
            }).eq('id', member.player_id);
          }
        }
      }

      console.log(`[League Cron] Finalized league ${league.tier}-${league.group_number}: ${total} members, ${promoCount} promoted, ${releCount} relegated`);
    }
  }

  // ── STEP 2: Create new leagues for this week ──
  // Get all active (non-banned) players grouped by their (now updated) league_tier
  const { data: allPlayers } = await db
    .from('players')
    .select('id, supabase_id, league_tier, weekly_xp')
    .eq('is_banned', false);

  if (!allPlayers || allPlayers.length === 0) {
    console.log('[League Cron] No active players — skipping league creation');
    return;
  }

  // Group players by tier
  const tierGroups: Record<string, any[]> = {};
  for (const p of allPlayers) {
    const tier = p.league_tier || 'E';
    if (!tierGroups[tier]) tierGroups[tier] = [];
    tierGroups[tier].push(p);
  }

  let totalGroups = 0;

  for (const [tier, players] of Object.entries(tierGroups)) {
    // Shuffle players for fair matchmaking
    const shuffled = [...players].sort(() => Math.random() - 0.5);

    // Split into groups of 30
    const groupSize = 30;
    const numGroups = Math.ceil(shuffled.length / groupSize);

    for (let g = 0; g < numGroups; g++) {
      const groupPlayers = shuffled.slice(g * groupSize, (g + 1) * groupSize);

      // Skip very small groups — merge with previous
      if (groupPlayers.length < 5 && g > 0) {
        // Add to previous group
        const prevLeagues = await db
          .from('leagues')
          .select('id')
          .eq('week_start', thisMonday)
          .eq('tier', tier)
          .eq('group_number', g)
          .single();

        if (prevLeagues?.data) {
          const insertData = groupPlayers.map((p: any) => ({
            league_id: prevLeagues.data.id,
            player_id: p.id,
            weekly_xp: 0,
          }));
          await db.from('league_members').insert(insertData);
        }
        continue;
      }

      // Create league group
      const { data: newLeague, error: leagueErr } = await db
        .from('leagues')
        .insert({ week_start: thisMonday, tier, group_number: g + 1 })
        .select('id')
        .single();

      if (leagueErr) {
        // Might already exist (idempotent)
        if (leagueErr.code === '23505') continue;
        console.error(`[League Cron] Failed to create league ${tier}-${g + 1}:`, leagueErr);
        continue;
      }

      // Insert members
      const insertData = groupPlayers.map((p: any) => ({
        league_id: newLeague.id,
        player_id: p.id,
        weekly_xp: 0,
      }));

      const { error: insertErr } = await db.from('league_members').insert(insertData);
      if (insertErr) {
        console.error(`[League Cron] Failed to insert members for ${tier}-${g + 1}:`, insertErr);
      }

      totalGroups++;
    }
  }

  console.log(`[League Cron] Created ${totalGroups} league groups across ${Object.keys(tierGroups).length} tiers`);
}

export default router;
