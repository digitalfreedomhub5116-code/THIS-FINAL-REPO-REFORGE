import { Router, Request, Response } from 'express';
import { supabaseServer } from '../lib/supabase.js';
import { getAuthenticatedUserId } from '../lib/playerAuth.js';

const router = Router();

// ── Helpers ──────────────────────────────────────────────────────────────────

const auth = (req: Request, res: Response): string | null => {
  const uid = getAuthenticatedUserId(req);
  if (!uid) {
    res.status(401).json({ error: 'Not authenticated' });
    return null;
  }
  return uid;
};

type Role = 'master' | 'vice' | 'member';
const RANK_ROLE: Record<Role, number> = { master: 3, vice: 2, member: 1 };

async function getMembership(db: any, userId: string): Promise<any | null> {
  const { data } = await db.from('guild_members').select('*').eq('user_id', userId).maybeSingle();
  return data || null;
}

async function getMembershipIn(db: any, guildId: string, userId: string): Promise<any | null> {
  const { data } = await db
    .from('guild_members')
    .select('*')
    .eq('guild_id', guildId)
    .eq('user_id', userId)
    .maybeSingle();
  return data || null;
}

/** Fetch display info (name, avatar, level, rank, border) for a set of supabase_ids. */
async function enrichPlayers(db: any, ids: string[]): Promise<Record<string, any>> {
  if (!ids.length) return {};
  const { data } = await db
    .from('players')
    .select('supabase_id, username, name, level, rank, avatar_url, equipped_border, raw_data')
    .in('supabase_id', ids);
  const map: Record<string, any> = {};
  for (const p of data || []) {
    map[p.supabase_id] = {
      userId: p.supabase_id,
      name: p.username || p.name || 'Hunter',
      avatarUrl: p.avatar_url || null,
      level: p.level || 1,
      rank: p.rank || 'E',
      equippedBorder: p.equipped_border || p.raw_data?.equippedBorder || null,
    };
  }
  return map;
}

/** Server → clients fan-out via Supabase Realtime Broadcast HTTP endpoint. */
async function broadcastToGuild(guildId: string, event: string, payload: any): Promise<void> {
  try {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !key) return;
    await fetch(`${url}/realtime/v1/api/broadcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        messages: [{ topic: `guild:${guildId}`, event, payload, private: false }],
      }),
    });
  } catch (err) {
    console.warn('[Guilds] broadcast failed:', (err as any)?.message);
  }
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

// Daily mission pool — one is chosen per guild per day.
const MISSION_POOL = [
  { title: 'Complete 50 workouts together', target: 50, reward: { gold: 500, glory: 100 } },
  { title: 'Earn 10,000 XP as a guild', target: 10000, reward: { gold: 600, glory: 120 } },
  { title: 'Finish 80 quests collectively', target: 80, reward: { gold: 550, glory: 110 } },
  { title: 'Clear 30 dungeons together', target: 30, reward: { gold: 700, glory: 150 } },
];

async function ensureTodayMission(db: any, guildId: string): Promise<any> {
  const date = todayStr();
  const { data: existing } = await db
    .from('guild_missions')
    .select('*')
    .eq('guild_id', guildId)
    .eq('date', date)
    .maybeSingle();
  if (existing) return existing;

  // Deterministic pick so all members see the same mission.
  const idx = Math.abs(hashStr(guildId + date)) % MISSION_POOL.length;
  const m = MISSION_POOL[idx];
  const { data: created } = await db
    .from('guild_missions')
    .insert({ guild_id: guildId, date, title: m.title, target: m.target, progress: 0, reward: m.reward, completed: false })
    .select('*')
    .single();
  return created;
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return h;
}

// ─────────────────────────────────────────────────────────────────────────────
// BROWSER & MEMBERSHIP
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/guilds  — ranked guild list with optional search/filter
router.get('/', async (req: Request, res: Response) => {
  try {
    const db = supabaseServer() as any;
    const search = (req.query.search as string || '').trim();
    const filter = (req.query.filter as string || 'top') as 'top' | 'recruiting' | 'war';

    let q = db.from('guilds').select('*').order('glory_points', { ascending: false }).limit(50);
    if (search) q = q.ilike('name', `%${search}%`);
    if (filter === 'recruiting') q = q.eq('privacy', 'open');
    const { data: guilds, error } = await q;
    if (error) throw error;

    // member counts
    const ids = (guilds || []).map((g: any) => g.id);
    const counts: Record<string, number> = {};
    if (ids.length) {
      const { data: members } = await db.from('guild_members').select('guild_id').in('guild_id', ids);
      for (const m of members || []) counts[m.guild_id] = (counts[m.guild_id] || 0) + 1;
    }

    const list = (guilds || []).map((g: any, i: number) => ({
      id: g.id,
      name: g.name,
      tag: g.tag,
      motto: g.motto,
      icon: g.icon,
      banner: g.banner,
      privacy: g.privacy,
      memberCount: counts[g.id] || 0,
      memberCap: g.member_cap,
      gloryPoints: g.glory_points,
      rank: i + 1,
    }));
    return res.json({ guilds: list });
  } catch (err) {
    console.error('[Guilds GET /]', err);
    return res.status(500).json({ error: 'Failed to load guilds' });
  }
});

// GET /api/guilds/me — caller's current guild membership (or null)
router.get('/me', async (req: Request, res: Response) => {
  const uid = auth(req, res);
  if (!uid) return;
  try {
    const db = supabaseServer() as any;
    const membership = await getMembership(db, uid);
    if (!membership) return res.json({ guild: null, membership: null });
    const { data: guild } = await db.from('guilds').select('*').eq('id', membership.guild_id).maybeSingle();
    if (!guild) {
      // Stale membership (guild disbanded) — clean up.
      await db.from('guild_members').delete().eq('id', membership.id);
      return res.json({ guild: null, membership: null });
    }
    return res.json({ guild: serializeGuild(guild), membership: { role: membership.role, contributionPoints: membership.contribution_points } });
  } catch (err) {
    console.error('[Guilds GET /me]', err);
    return res.status(500).json({ error: 'Failed to load membership' });
  }
});

function serializeGuild(g: any) {
  return {
    id: g.id,
    name: g.name,
    tag: g.tag,
    motto: g.motto,
    icon: g.icon,
    banner: g.banner,
    privacy: g.privacy,
    masterId: g.master_id,
    memberCap: g.member_cap,
    gloryPoints: g.glory_points,
    vaultBalance: g.vault_balance,
    createdAt: g.created_at,
  };
}

// GET /api/guilds/:id — full guild detail + members
router.get('/:id', async (req: Request, res: Response) => {
  const uid = auth(req, res);
  if (!uid) return;
  try {
    const db = supabaseServer() as any;
    const { id } = req.params as Record<string, string>;
    const { data: guild } = await db.from('guilds').select('*').eq('id', id).maybeSingle();
    if (!guild) return res.status(404).json({ error: 'Guild not found' });

    const { data: members } = await db
      .from('guild_members')
      .select('*')
      .eq('guild_id', id)
      .order('contribution_points', { ascending: false });

    const info = await enrichPlayers(db, (members || []).map((m: any) => m.user_id));
    const myMembership = (members || []).find((m: any) => m.user_id === uid) || null;

    return res.json({
      guild: serializeGuild(guild),
      myRole: myMembership?.role || null,
      members: (members || []).map((m: any) => ({
        userId: m.user_id,
        role: m.role,
        contributionPoints: m.contribution_points,
        joinedAt: m.joined_at,
        ...(info[m.user_id] || { name: 'Hunter', level: 1, rank: 'E', avatarUrl: null, equippedBorder: null }),
      })),
    });
  } catch (err) {
    console.error('[Guilds GET /:id]', err);
    return res.status(500).json({ error: 'Failed to load guild' });
  }
});

// POST /api/guilds — create a guild (Pro-gated on client)
router.post('/', async (req: Request, res: Response) => {
  const uid = auth(req, res);
  if (!uid) return;
  try {
    const db = supabaseServer() as any;
    const { name, tag, motto, icon, banner, privacy } = req.body || {};
    if (!name || String(name).trim().length < 3) {
      return res.status(400).json({ error: 'Guild name must be at least 3 characters' });
    }
    // One guild per user
    const existing = await getMembership(db, uid);
    if (existing) return res.status(409).json({ error: 'You are already in a guild' });

    const { data: guild, error } = await db
      .from('guilds')
      .insert({
        name: String(name).trim(),
        tag: tag ? String(tag).trim().slice(0, 6) : null,
        motto: motto ? String(motto).slice(0, 120) : '',
        icon: icon || '🛡️',
        banner: banner || 'gradient-cyan',
        privacy: privacy === 'invite_only' ? 'invite_only' : 'open',
        master_id: uid,
      })
      .select('*')
      .single();
    if (error) {
      if (String(error.message).includes('duplicate')) return res.status(409).json({ error: 'Guild name already taken' });
      throw error;
    }

    await db.from('guild_members').insert({ guild_id: guild.id, user_id: uid, role: 'master' });
    return res.json({ guild: serializeGuild(guild) });
  } catch (err) {
    console.error('[Guilds POST /]', err);
    return res.status(500).json({ error: 'Failed to create guild' });
  }
});

// POST /api/guilds/:id/join — instant join (open) or request (invite_only)
router.post('/:id/join', async (req: Request, res: Response) => {
  const uid = auth(req, res);
  if (!uid) return;
  try {
    const db = supabaseServer() as any;
    const { id } = req.params as Record<string, string>;
    if (await getMembership(db, uid)) return res.status(409).json({ error: 'You are already in a guild' });

    const { data: guild } = await db.from('guilds').select('*').eq('id', id).maybeSingle();
    if (!guild) return res.status(404).json({ error: 'Guild not found' });

    const { count } = await db.from('guild_members').select('id', { count: 'exact', head: true }).eq('guild_id', id);
    if ((count || 0) >= guild.member_cap) return res.status(409).json({ error: 'Guild is full' });

    if (guild.privacy === 'open') {
      await db.from('guild_members').insert({ guild_id: id, user_id: uid, role: 'member' });
      const info = await enrichPlayers(db, [uid]);
      await postSystemMessage(db, id, `${info[uid]?.name || 'A hunter'} joined the guild.`);
      return res.json({ status: 'joined' });
    }

    // invite_only → request
    await db
      .from('guild_join_requests')
      .upsert({ guild_id: id, user_id: uid, status: 'pending' }, { onConflict: 'guild_id,user_id' });
    return res.json({ status: 'requested' });
  } catch (err) {
    console.error('[Guilds join]', err);
    return res.status(500).json({ error: 'Failed to join guild' });
  }
});

// GET /api/guilds/:id/requests — pending join requests (master/vice)
router.get('/:id/requests', async (req: Request, res: Response) => {
  const uid = auth(req, res);
  if (!uid) return;
  try {
    const db = supabaseServer() as any;
    const { id } = req.params as Record<string, string>;
    const me = await getMembershipIn(db, id, uid);
    if (!me || RANK_ROLE[me.role as Role] < RANK_ROLE.vice) return res.status(403).json({ error: 'Insufficient role' });

    const { data: reqs } = await db
      .from('guild_join_requests')
      .select('*')
      .eq('guild_id', id)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });
    const info = await enrichPlayers(db, (reqs || []).map((r: any) => r.user_id));
    return res.json({
      requests: (reqs || []).map((r: any) => ({ id: r.id, userId: r.user_id, createdAt: r.created_at, ...(info[r.user_id] || {}) })),
    });
  } catch (err) {
    console.error('[Guilds requests]', err);
    return res.status(500).json({ error: 'Failed to load requests' });
  }
});

// POST /api/guilds/:id/requests/:reqId — approve/reject (master/vice)
router.post('/:id/requests/:reqId', async (req: Request, res: Response) => {
  const uid = auth(req, res);
  if (!uid) return;
  try {
    const db = supabaseServer() as any;
    const { id, reqId } = req.params as Record<string, string>;
    const { action } = req.body || {}; // 'approve' | 'reject'
    const me = await getMembershipIn(db, id, uid);
    if (!me || RANK_ROLE[me.role as Role] < RANK_ROLE.vice) return res.status(403).json({ error: 'Insufficient role' });

    const { data: reqRow } = await db.from('guild_join_requests').select('*').eq('id', reqId).maybeSingle();
    if (!reqRow || reqRow.guild_id !== id) return res.status(404).json({ error: 'Request not found' });

    if (action === 'approve') {
      if (await getMembership(db, reqRow.user_id)) {
        await db.from('guild_join_requests').update({ status: 'rejected' }).eq('id', reqId);
        return res.status(409).json({ error: 'User already joined another guild' });
      }
      const { count } = await db.from('guild_members').select('id', { count: 'exact', head: true }).eq('guild_id', id);
      const { data: guild } = await db.from('guilds').select('member_cap').eq('id', id).maybeSingle();
      if ((count || 0) >= (guild?.member_cap || 150)) return res.status(409).json({ error: 'Guild is full' });

      await db.from('guild_members').insert({ guild_id: id, user_id: reqRow.user_id, role: 'member' });
      await db.from('guild_join_requests').update({ status: 'approved' }).eq('id', reqId);
      const info = await enrichPlayers(db, [reqRow.user_id]);
      await postSystemMessage(db, id, `${info[reqRow.user_id]?.name || 'A hunter'} joined the guild.`);
      return res.json({ status: 'approved' });
    }
    await db.from('guild_join_requests').update({ status: 'rejected' }).eq('id', reqId);
    return res.json({ status: 'rejected' });
  } catch (err) {
    console.error('[Guilds request action]', err);
    return res.status(500).json({ error: 'Failed to process request' });
  }
});

// POST /api/guilds/:id/leave
router.post('/:id/leave', async (req: Request, res: Response) => {
  const uid = auth(req, res);
  if (!uid) return;
  try {
    const db = supabaseServer() as any;
    const { id } = req.params as Record<string, string>;
    const me = await getMembershipIn(db, id, uid);
    if (!me) return res.status(404).json({ error: 'Not a member' });

    if (me.role === 'master') {
      // Promote successor (oldest vice, else oldest member). If alone → disband.
      const { data: others } = await db
        .from('guild_members')
        .select('*')
        .eq('guild_id', id)
        .neq('user_id', uid)
        .order('role', { ascending: false })
        .order('joined_at', { ascending: true });
      if (!others || others.length === 0) {
        await db.from('guilds').delete().eq('id', id); // cascade
        return res.json({ status: 'disbanded' });
      }
      const successor = others.find((m: any) => m.role === 'vice') || others[0];
      await db.from('guild_members').update({ role: 'master' }).eq('id', successor.id);
      await db.from('guilds').update({ master_id: successor.user_id }).eq('id', id);
    }
    await db.from('guild_members').delete().eq('id', me.id);
    const info = await enrichPlayers(db, [uid]);
    await postSystemMessage(db, id, `${info[uid]?.name || 'A hunter'} left the guild.`);
    return res.json({ status: 'left' });
  } catch (err) {
    console.error('[Guilds leave]', err);
    return res.status(500).json({ error: 'Failed to leave guild' });
  }
});

// POST /api/guilds/:id/members/:userId/role — promote/demote (master only)
router.post('/:id/members/:userId/role', async (req: Request, res: Response) => {
  const uid = auth(req, res);
  if (!uid) return;
  try {
    const db = supabaseServer() as any;
    const { id, userId } = req.params as Record<string, string>;
    const { role } = req.body || {}; // 'vice' | 'member'
    const me = await getMembershipIn(db, id, uid);
    if (!me || me.role !== 'master') return res.status(403).json({ error: 'Only the master can change roles' });
    if (userId === uid) return res.status(400).json({ error: 'Cannot change your own role' });
    if (!['vice', 'member'].includes(role)) return res.status(400).json({ error: 'Invalid role' });

    const target = await getMembershipIn(db, id, userId);
    if (!target) return res.status(404).json({ error: 'Member not found' });
    await db.from('guild_members').update({ role }).eq('id', target.id);
    return res.json({ status: 'updated' });
  } catch (err) {
    console.error('[Guilds role]', err);
    return res.status(500).json({ error: 'Failed to update role' });
  }
});

// DELETE /api/guilds/:id/members/:userId — kick (master/vice)
router.delete('/:id/members/:userId', async (req: Request, res: Response) => {
  const uid = auth(req, res);
  if (!uid) return;
  try {
    const db = supabaseServer() as any;
    const { id, userId } = req.params as Record<string, string>;
    const me = await getMembershipIn(db, id, uid);
    if (!me || RANK_ROLE[me.role as Role] < RANK_ROLE.vice) return res.status(403).json({ error: 'Insufficient role' });
    const target = await getMembershipIn(db, id, userId);
    if (!target) return res.status(404).json({ error: 'Member not found' });
    if (RANK_ROLE[target.role as Role] >= RANK_ROLE[me.role as Role]) {
      return res.status(403).json({ error: 'Cannot kick someone of equal or higher rank' });
    }
    await db.from('guild_members').delete().eq('id', target.id);
    const info = await enrichPlayers(db, [userId]);
    await postSystemMessage(db, id, `${info[userId]?.name || 'A hunter'} was removed from the guild.`);
    await broadcastToGuild(id, 'kicked', { userId });
    return res.json({ status: 'kicked' });
  } catch (err) {
    console.error('[Guilds kick]', err);
    return res.status(500).json({ error: 'Failed to kick member' });
  }
});

// POST /api/guilds/:id/disband — master only
router.post('/:id/disband', async (req: Request, res: Response) => {
  const uid = auth(req, res);
  if (!uid) return;
  try {
    const db = supabaseServer() as any;
    const { id } = req.params as Record<string, string>;
    const me = await getMembershipIn(db, id, uid);
    if (!me || me.role !== 'master') return res.status(403).json({ error: 'Only the master can disband' });
    await broadcastToGuild(id, 'disbanded', {});
    await db.from('guilds').delete().eq('id', id); // cascade removes members/chat/etc.
    return res.json({ status: 'disbanded' });
  } catch (err) {
    console.error('[Guilds disband]', err);
    return res.status(500).json({ error: 'Failed to disband guild' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// CHAT
// ─────────────────────────────────────────────────────────────────────────────

async function postSystemMessage(db: any, guildId: string, body: string) {
  const { data: row } = await db
    .from('guild_chat')
    .insert({ guild_id: guildId, user_id: null, type: 'system', body })
    .select('*')
    .single();
  if (row) await broadcastToGuild(guildId, 'message', serializeMessage(row, {}));
}

function serializeMessage(row: any, info: Record<string, any>) {
  return {
    id: row.id,
    guildId: row.guild_id,
    userId: row.user_id,
    type: row.type,
    body: row.body,
    meta: row.meta || {},
    createdAt: row.created_at,
    author: row.user_id ? info[row.user_id] || null : null,
  };
}

// GET /api/guilds/:id/chat?before=<ISO>&limit=30
router.get('/:id/chat', async (req: Request, res: Response) => {
  const uid = auth(req, res);
  if (!uid) return;
  try {
    const db = supabaseServer() as any;
    const { id } = req.params as Record<string, string>;
    if (!(await getMembershipIn(db, id, uid))) return res.status(403).json({ error: 'Not a member' });

    const limit = Math.min(parseInt((req.query.limit as string) || '30'), 50);
    let q = db.from('guild_chat').select('*').eq('guild_id', id).order('created_at', { ascending: false }).limit(limit);
    if (req.query.before) q = q.lt('created_at', req.query.before as string);
    const { data: rows } = await q;
    const ordered = (rows || []).reverse();
    const info = await enrichPlayers(db, ordered.filter((r: any) => r.user_id).map((r: any) => r.user_id));
    return res.json({ messages: ordered.map((r: any) => serializeMessage(r, info)) });
  } catch (err) {
    console.error('[Guilds chat GET]', err);
    return res.status(500).json({ error: 'Failed to load chat' });
  }
});

// POST /api/guilds/:id/chat  { body, type?, meta? }
router.post('/:id/chat', async (req: Request, res: Response) => {
  const uid = auth(req, res);
  if (!uid) return;
  try {
    const db = supabaseServer() as any;
    const { id } = req.params as Record<string, string>;
    if (!(await getMembershipIn(db, id, uid))) return res.status(403).json({ error: 'Not a member' });

    const { body, type, meta } = req.body || {};
    const msgType = type === 'workout' ? 'workout' : 'user';
    if (msgType === 'user' && (!body || !String(body).trim())) {
      return res.status(400).json({ error: 'Empty message' });
    }
    const { data: row, error } = await db
      .from('guild_chat')
      .insert({ guild_id: id, user_id: uid, type: msgType, body: String(body || '').slice(0, 1000), meta: meta || {} })
      .select('*')
      .single();
    if (error) throw error;
    const info = await enrichPlayers(db, [uid]);
    const message = serializeMessage(row, info);
    await broadcastToGuild(id, 'message', message);
    return res.json({ message });
  } catch (err) {
    console.error('[Guilds chat POST]', err);
    return res.status(500).json({ error: 'Failed to send message' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// MISSIONS
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/guilds/:id/mission — today's collective mission
router.get('/:id/mission', async (req: Request, res: Response) => {
  const uid = auth(req, res);
  if (!uid) return;
  try {
    const db = supabaseServer() as any;
    const { id } = req.params as Record<string, string>;
    if (!(await getMembershipIn(db, id, uid))) return res.status(403).json({ error: 'Not a member' });
    const m = await ensureTodayMission(db, id);
    return res.json({
      mission: {
        id: m.id,
        title: m.title,
        target: m.target,
        progress: m.progress,
        reward: m.reward,
        completed: m.completed,
        date: m.date,
      },
    });
  } catch (err) {
    console.error('[Guilds mission]', err);
    return res.status(500).json({ error: 'Failed to load mission' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// WAR
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/guilds/:id/war — current week's war (split-screen + contributors) + registration status
router.get('/:id/war', async (req: Request, res: Response) => {
  const uid = auth(req, res);
  if (!uid) return;
  try {
    const db = supabaseServer() as any;
    const { id } = req.params as Record<string, string>;
    const me = await getMembershipIn(db, id, uid);
    if (!me) return res.status(403).json({ error: 'Not a member' });

    const nextWarStart = nextWarThursday(new Date());
    const { data: guildRow } = await db.from('guilds').select('war_registered_week').eq('id', id).maybeSingle();
    const registrationWeek: string | null = guildRow?.war_registered_week || null;
    const registered = registrationWeek === nextWarStart;
    const canRegister = RANK_ROLE[me.role as Role] >= RANK_ROLE.vice;

    const { data: war } = await db
      .from('guild_wars')
      .select('*')
      .or(`guild_a.eq.${id},guild_b.eq.${id}`)
      .in('status', ['active', 'ended'])
      .order('week_start', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!war) {
      return res.json({ war: null, registered, canRegister, registrationWeek, nextWarStart });
    }

    const [ga, gb] = await Promise.all([
      db.from('guilds').select('id, name, icon, banner').eq('id', war.guild_a).maybeSingle(),
      db.from('guilds').select('id, name, icon, banner').eq('id', war.guild_b).maybeSingle(),
    ]);

    const { data: contribs } = await db
      .from('guild_war_contributions')
      .select('*')
      .eq('war_id', war.id)
      .order('points', { ascending: false })
      .limit(20);
    const info = await enrichPlayers(db, (contribs || []).map((c: any) => c.user_id));
    const contributors = (contribs || []).map((c: any) => ({
      userId: c.user_id,
      guildId: c.guild_id,
      points: c.points,
      ...(info[c.user_id] || { name: 'Hunter', avatarUrl: null }),
    }));

    return res.json({
      war: {
        id: war.id,
        weekStart: war.week_start,
        status: war.status,
        winnerId: war.winner_id,
        myGuildId: id,
        guildA: { ...(ga.data || {}), score: war.score_a },
        guildB: { ...(gb.data || {}), score: war.score_b },
        contributors,
      },
      registered,
      canRegister,
      registrationWeek,
      nextWarStart,
    });
  } catch (err) {
    console.error('[Guilds war]', err);
    return res.status(500).json({ error: 'Failed to load war' });
  }
});

// POST /api/guilds/:id/war/register — opt in to the upcoming war (master/vice)
router.post('/:id/war/register', async (req: Request, res: Response) => {
  const uid = auth(req, res);
  if (!uid) return;
  try {
    const db = supabaseServer() as any;
    const { id } = req.params as Record<string, string>;
    const me = await getMembershipIn(db, id, uid);
    if (!me || RANK_ROLE[me.role as Role] < RANK_ROLE.vice) {
      return res.status(403).json({ error: 'Only master/vice can register for war' });
    }
    const nextWarStart = nextWarThursday(new Date());
    await db.from('guilds').update({ war_registered_week: nextWarStart }).eq('id', id);
    const info = await enrichPlayers(db, [uid]);
    await postSystemMessage(db, id, `${info[uid]?.name || 'A leader'} registered the guild for the upcoming War.`);
    return res.json({ status: 'registered', registrationWeek: nextWarStart, nextWarStart });
  } catch (err) {
    console.error('[Guilds war register]', err);
    return res.status(500).json({ error: 'Failed to register for war' });
  }
});

// POST /api/guilds/:id/war/unregister — withdraw before matchmaking (master/vice)
router.post('/:id/war/unregister', async (req: Request, res: Response) => {
  const uid = auth(req, res);
  if (!uid) return;
  try {
    const db = supabaseServer() as any;
    const { id } = req.params as Record<string, string>;
    const me = await getMembershipIn(db, id, uid);
    if (!me || RANK_ROLE[me.role as Role] < RANK_ROLE.vice) {
      return res.status(403).json({ error: 'Only master/vice can change war registration' });
    }
    const nextWarStart = nextWarThursday(new Date());
    await db.from('guilds').update({ war_registered_week: null }).eq('id', id);
    return res.json({ status: 'unregistered', registrationWeek: null, nextWarStart });
  } catch (err) {
    console.error('[Guilds war unregister]', err);
    return res.status(500).json({ error: 'Failed to update war registration' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// VAULT
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/guilds/:id/vault — balance + recent transactions
router.get('/:id/vault', async (req: Request, res: Response) => {
  const uid = auth(req, res);
  if (!uid) return;
  try {
    const db = supabaseServer() as any;
    const { id } = req.params as Record<string, string>;
    const me = await getMembershipIn(db, id, uid);
    if (!me) return res.status(403).json({ error: 'Not a member' });

    const { data: guild } = await db.from('guilds').select('vault_balance').eq('id', id).maybeSingle();
    const { data: txns } = await db
      .from('guild_vault_transactions')
      .select('*')
      .eq('guild_id', id)
      .order('created_at', { ascending: false })
      .limit(20);
    const info = await enrichPlayers(db, (txns || []).map((t: any) => t.user_id));
    return res.json({
      balance: guild?.vault_balance || 0,
      canPurchase: RANK_ROLE[me.role as Role] >= RANK_ROLE.vice,
      transactions: (txns || []).map((t: any) => ({
        id: t.id,
        userId: t.user_id,
        kind: t.kind,
        amount: t.amount,
        itemKey: t.item_key,
        createdAt: t.created_at,
        name: info[t.user_id]?.name || 'Hunter',
      })),
    });
  } catch (err) {
    console.error('[Guilds vault]', err);
    return res.status(500).json({ error: 'Failed to load vault' });
  }
});

// POST /api/guilds/:id/vault/donate { amount }
router.post('/:id/vault/donate', async (req: Request, res: Response) => {
  const uid = auth(req, res);
  if (!uid) return;
  try {
    const db = supabaseServer() as any;
    const { id } = req.params as Record<string, string>;
    const amount = Math.floor(Number(req.body?.amount));
    if (!(await getMembershipIn(db, id, uid))) return res.status(403).json({ error: 'Not a member' });
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });

    const { data: player } = await db.from('players').select('gold').eq('supabase_id', uid).maybeSingle();
    if (!player || (player.gold || 0) < amount) return res.status(400).json({ error: 'Not enough gold' });

    await db.from('players').update({ gold: player.gold - amount }).eq('supabase_id', uid);
    await db.rpc('guild_add_vault', { p_guild: id, p_amount: amount });
    await db.from('guild_vault_transactions').insert({ guild_id: id, user_id: uid, kind: 'donate', amount });
    const info = await enrichPlayers(db, [uid]);
    await postSystemMessage(db, id, `${info[uid]?.name || 'A hunter'} donated ${amount.toLocaleString()} G to the vault.`);

    const { data: guild } = await db.from('guilds').select('vault_balance').eq('id', id).maybeSingle();
    return res.json({ status: 'ok', newBalance: guild?.vault_balance || 0, playerGold: player.gold - amount });
  } catch (err) {
    console.error('[Guilds donate]', err);
    return res.status(500).json({ error: 'Failed to donate' });
  }
});

// Vault shop catalogue (server-authoritative pricing)
const VAULT_SHOP: Record<string, { price: number; label: string; category: string }> = {
  crest_of_valor: { price: 6000, label: 'Crest of Valor', category: 'cosmetic' },
  fortress_lvl2: { price: 10000, label: 'Fortress Lvl 2', category: 'buff' },
  xp_surge_24h: { price: 2500, label: 'XP Surge (24h)', category: 'buff' },
};

// POST /api/guilds/:id/vault/purchase { itemKey } — master/vice only
router.post('/:id/vault/purchase', async (req: Request, res: Response) => {
  const uid = auth(req, res);
  if (!uid) return;
  try {
    const db = supabaseServer() as any;
    const { id } = req.params as Record<string, string>;
    const me = await getMembershipIn(db, id, uid);
    if (!me || RANK_ROLE[me.role as Role] < RANK_ROLE.vice) return res.status(403).json({ error: 'Only master/vice can purchase' });

    const item = VAULT_SHOP[req.body?.itemKey];
    if (!item) return res.status(400).json({ error: 'Unknown item' });

    const { data: guild } = await db.from('guilds').select('vault_balance').eq('id', id).maybeSingle();
    if ((guild?.vault_balance || 0) < item.price) return res.status(400).json({ error: 'Insufficient vault balance' });

    await db.rpc('guild_add_vault', { p_guild: id, p_amount: -item.price });
    await db.from('guild_vault_transactions').insert({ guild_id: id, user_id: uid, kind: 'purchase', amount: item.price, item_key: req.body.itemKey });
    const info = await enrichPlayers(db, [uid]);
    await postSystemMessage(db, id, `${info[uid]?.name || 'A hunter'} purchased ${item.label}.`);
    return res.json({ status: 'ok', newBalance: (guild?.vault_balance || 0) - item.price });
  } catch (err) {
    console.error('[Guilds purchase]', err);
    return res.status(500).json({ error: 'Failed to purchase' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// CONTRIBUTION HOOK (mission progress + war points + member contribution)
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/guilds/contribute { amount, source }
router.post('/contribute', async (req: Request, res: Response) => {
  const uid = auth(req, res);
  if (!uid) return;
  try {
    const db = supabaseServer() as any;
    const amount = Math.max(1, Math.floor(Number(req.body?.amount) || 1));
    const membership = await getMembership(db, uid);
    if (!membership) return res.json({ status: 'no_guild' });

    const guildId = membership.guild_id;
    const date = todayStr();

    await ensureTodayMission(db, guildId);
    await db.rpc('guild_mission_progress', { p_guild: guildId, p_date: date, p_amount: amount });
    await db.rpc('guild_member_contribute', { p_guild: guildId, p_user: uid, p_amount: amount });
    await db.rpc('guild_add_glory', { p_guild: guildId, p_amount: amount });

    // War points (Thu–Sat) if an active war exists for this guild
    const { data: war } = await db
      .from('guild_wars')
      .select('*')
      .or(`guild_a.eq.${guildId},guild_b.eq.${guildId}`)
      .eq('status', 'active')
      .order('week_start', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (war) {
      const col = war.guild_a === guildId ? 'score_a' : 'score_b';
      await db.from('guild_wars').update({ [col]: (war[col] || 0) + amount }).eq('id', war.id);
      const { data: existing } = await db
        .from('guild_war_contributions')
        .select('*')
        .eq('war_id', war.id)
        .eq('user_id', uid)
        .maybeSingle();
      if (existing) {
        await db.from('guild_war_contributions').update({ points: existing.points + amount }).eq('id', existing.id);
      } else {
        await db.from('guild_war_contributions').insert({ war_id: war.id, guild_id: guildId, user_id: uid, points: amount });
      }
    }

    // Check mission completion → reward broadcast
    const { data: mission } = await db.from('guild_missions').select('*').eq('guild_id', guildId).eq('date', date).maybeSingle();
    if (mission?.completed) {
      await broadcastToGuild(guildId, 'mission_complete', { missionId: mission.id, title: mission.title });
    }
    return res.json({ status: 'ok' });
  } catch (err) {
    console.error('[Guilds contribute]', err);
    return res.status(500).json({ error: 'Failed to record contribution' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// CRON — war matchmaking (Thursday) + settlement (Sunday)
// ─────────────────────────────────────────────────────────────────────────────

function weekThursday(d: Date): string {
  // Returns the date (YYYY-MM-DD) of the Thursday of the current week (war start).
  const day = d.getUTCDay(); // 0 Sun .. 6 Sat
  const diff = 4 - day; // 4 = Thursday
  const thu = new Date(d);
  thu.setUTCDate(d.getUTCDate() + diff);
  return thu.toISOString().slice(0, 10);
}

function nextWarThursday(d: Date): string {
  // The next matchmaking Thursday a guild can register for. On Fri/Sat the current
  // week's Thursday is past, so roll forward to next week.
  const day = d.getUTCDay();
  let diff = 4 - day;
  if (diff < 0) diff += 7;
  const thu = new Date(d);
  thu.setUTCDate(d.getUTCDate() + diff);
  return thu.toISOString().slice(0, 10);
}

export async function runGuildWarCron(db: any): Promise<void> {
  const now = new Date();
  const day = now.getUTCDay(); // 0 Sun, 4 Thu, 5 Fri, 6 Sat

  // ── Thursday: create matchups for guilds without an active war this week ──
  if (day === 4) {
    const weekStart = weekThursday(now);
    const { data: existing } = await db.from('guild_wars').select('guild_a, guild_b').eq('week_start', weekStart);
    const paired = new Set<string>();
    for (const w of existing || []) { paired.add(w.guild_a); paired.add(w.guild_b); }

    // Opt-in only: just guilds that registered for THIS week's matchmaking.
    const { data: guilds } = await db
      .from('guilds')
      .select('id, glory_points')
      .eq('war_registered_week', weekStart)
      .order('glory_points', { ascending: false });
    const eligible = (guilds || []).filter((g: any) => !paired.has(g.id));
    for (let i = 0; i + 1 < eligible.length; i += 2) {
      await db.from('guild_wars').insert({
        week_start: weekStart,
        guild_a: eligible[i].id,
        guild_b: eligible[i + 1].id,
        status: 'active',
      });
    }
  }

  // ── Sunday: settle active wars and distribute rewards ──
  if (day === 0) {
    const { data: wars } = await db.from('guild_wars').select('*').eq('status', 'active');
    for (const war of wars || []) {
      const winner = war.score_a === war.score_b ? null : war.score_a > war.score_b ? war.guild_a : war.guild_b;
      await db.from('guild_wars').update({ status: 'ended', winner_id: winner, rewards_distributed: true }).eq('id', war.id);
      if (winner) {
        await db.rpc('guild_add_glory', { p_guild: winner, p_amount: 500 });
        await db.rpc('guild_add_vault', { p_guild: winner, p_amount: 2000 });
        await postSystemMessage(db, winner, '🏆 Your guild won this week\'s War! +500 Glory, +2000 G to the vault.');
        const loser = winner === war.guild_a ? war.guild_b : war.guild_a;
        await postSystemMessage(db, loser, 'The War has ended. Better luck next week, hunters.');
      }
    }
  }
}

export default router;
