import { Router, Request, Response } from "express";
import { supabaseServer } from "../lib/supabase.js";
import { getAuthenticatedUserId } from "../lib/playerAuth.js";

const router = Router();

// ── Helpers ──────────────────────────────────────────────────────────────────

const auth = (req: Request, res: Response): string | null => {
  const uid = getAuthenticatedUserId(req);
  if (!uid) {
    res.status(401).json({ error: "Not authenticated" });
    return null;
  }
  return uid;
};

type Role = "master" | "vice" | "member";
const RANK_ROLE: Record<Role, number> = { master: 3, vice: 2, member: 1 };

// ── Guild creation config ────────────────────────────────────────────────────
const GUILD_CREATE_COST = 900;

// Icon catalog: key → { emoji, free, cost }. Emoji is what gets stored/displayed.
const GUILD_ICON_CATALOG: Record<
  string,
  { emoji: string; free: boolean; cost: number }
> = {
  shield: { emoji: "🛡️", free: true, cost: 0 },
  sword: { emoji: "⚔️", free: true, cost: 0 },
  trident: { emoji: "🔱", free: true, cost: 0 },
  crown: { emoji: "👑", free: true, cost: 0 },
  dragon: { emoji: "🐉", free: false, cost: 1200 },
  fire: { emoji: "🔥", free: false, cost: 1200 },
  lightning: { emoji: "⚡", free: false, cost: 1000 },
  diamond: { emoji: "💎", free: false, cost: 1500 },
  phoenix: { emoji: "🦅", free: false, cost: 1500 },
  wolf: { emoji: "🐺", free: false, cost: 1000 },
  skull: { emoji: "💀", free: false, cost: 1000 },
  star: { emoji: "⭐", free: false, cost: 800 },
};

const NAME_RE = /^[A-Za-z0-9 _-]+$/;
const CHAT_BANNED_WORDS = [
  "fuck",
  "shit",
  "bitch",
  "cunt",
  "nigger",
  "nigga",
  "faggot",
  "rape",
  "nazi",
  "whore",
  "slut",
  "dick",
  "pussy",
  "asshole",
  "porn",
  "sex"
];

function censorChatBody(text: string): string {
  let censored = text;
  for (const word of CHAT_BANNED_WORDS) {
    // Match word boundaries or substring depending on how strict we want to be
    // Using a regex with word boundaries avoids false positives in words like "association" or "document"
    const regex = new RegExp(`\\b${word}\\b`, "gi");
    censored = censored.replace(regex, (match) => {
      if (match.length <= 2) return "*".repeat(match.length);
      return match[0] + "*".repeat(match.length - 2) + match[match.length - 1];
    });
  }
  return censored;
}

function validateGuildName(
  raw: any
): { ok: true; name: string } | { ok: false; error: string } {
  const name = String(raw ?? "").trim();
  if (name.length < 3)
    return { ok: false, error: "Name must be at least 3 characters" };
  if (name.length > 30)
    return { ok: false, error: "Name must be 30 characters or fewer" };
  if (!NAME_RE.test(name))
    return {
      ok: false,
      error: "Only letters, numbers, spaces, hyphens and underscores allowed",
    };
  const lower = name.toLowerCase();
  if (CHAT_BANNED_WORDS.some((w) => lower.includes(w)))
    return { ok: false, error: "Name contains blocked words" };
  return { ok: true, name };
}

async function guildNameTaken(db: any, name: string): Promise<boolean> {
  const { data } = await db
    .from("guilds")
    .select("id")
    .ilike("name", name)
    .limit(1);
  return !!(data && data.length);
}

/** Premium guild icon keys the player has unlocked (persisted in players.raw_data). */
async function getUnlockedIcons(db: any, uid: string): Promise<string[]> {
  const { data } = await db
    .from("players")
    .select("raw_data")
    .eq("supabase_id", uid)
    .maybeSingle();
  const arr = data?.raw_data?.unlockedGuildIcons;
  return Array.isArray(arr) ? arr : [];
}

async function getMembership(db: any, userId: string): Promise<any | null> {
  const { data } = await db
    .from("guild_members")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return data || null;
}

async function getMembershipIn(
  db: any,
  guildId: string,
  userId: string
): Promise<any | null> {
  const { data } = await db
    .from("guild_members")
    .select("*")
    .eq("guild_id", guildId)
    .eq("user_id", userId)
    .maybeSingle();
  return data || null;
}

/** Fetch display info (name, avatar, level, rank, border) for a set of supabase_ids. */
async function enrichPlayers(
  db: any,
  ids: string[]
): Promise<Record<string, any>> {
  if (!ids.length) return {};
  const { data } = await db
    .from("players")
    .select(
      "supabase_id, username, name, level, rank, avatar_url, equipped_border, raw_data"
    )
    .in("supabase_id", ids);
  const map: Record<string, any> = {};
  for (const p of data || []) {
    map[p.supabase_id] = {
      userId: p.supabase_id,
      name: p.username || p.name || "Hunter",
      avatarUrl: p.avatar_url || null,
      level: p.level || 1,
      rank: p.rank || "E",
      equippedBorder: p.equipped_border || p.raw_data?.equippedBorder || null,
    };
  }
  return map;
}

/** Server → clients fan-out via Supabase Realtime Broadcast HTTP endpoint. */
async function broadcastToGuild(
  guildId: string,
  event: string,
  payload: any
): Promise<void> {
  try {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key =
      process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !key) return;
    await fetch(`${url}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        messages: [
          { topic: `guild:${guildId}`, event, payload, private: false },
        ],
      }),
    });
  } catch (err) {
    console.warn("[Guilds] broadcast failed:", (err as any)?.message);
  }
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

// RPG level system helpers (authoritative server-side calculation on reward claim)
function computeRank(level: number): string {
  if (level >= 80) return "S";
  if (level >= 55) return "A";
  if (level >= 39) return "B";
  if (level >= 27) return "C";
  if (level >= 11) return "D";
  return "E";
}

interface LevelUpResult {
  currentXp: number;
  requiredXp: number;
  level: number;
  leveledUp: boolean;
  rank: string;
}

function safeLevelUp(currentXp: number, requiredXp: number, level: number): LevelUpResult {
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

interface MissionDef {
  key: string;
  mission_type: string;
  titleTemplate: string;
  baseMultiplier: number;
  minTarget: number;
  reward: {
    gold: number;
    xp: number;
    vault_gold: number;
  };
}

// Updated daily mission pool (including the weekly Food Scan mission)
const MISSION_POOL: MissionDef[] = [
  {
    key: "clear_dungeons",
    mission_type: "dungeon",
    titleTemplate: "Clear {target} dungeons collectively",
    baseMultiplier: 0.8,
    minTarget: 1,
    reward: { gold: 250, xp: 150, vault_gold: 500 },
  },
  {
    key: "complete_quests",
    mission_type: "quest",
    titleTemplate: "Complete {target} daily quests collectively",
    baseMultiplier: 2.0,
    minTarget: 2,
    reward: { gold: 200, xp: 120, vault_gold: 400 },
  },
  {
    key: "complete_workouts",
    mission_type: "workout",
    titleTemplate: "Log {target} workouts collectively",
    baseMultiplier: 0.6,
    minTarget: 1,
    reward: { gold: 180, xp: 100, vault_gold: 350 },
  },
  {
    key: "complete_exercises",
    mission_type: "exercise",
    titleTemplate: "Perform {target} exercises collectively",
    baseMultiplier: 4.0,
    minTarget: 5,
    reward: { gold: 220, xp: 130, vault_gold: 450 },
  },
  {
    key: "earn_xp",
    mission_type: "xp",
    titleTemplate: "Earn {target} XP collectively as a guild",
    baseMultiplier: 150.0,
    minTarget: 150,
    reward: { gold: 240, xp: 140, vault_gold: 480 },
  },
  {
    key: "earn_gold",
    mission_type: "gold",
    titleTemplate: "Earn {target} Gold collectively as a guild",
    baseMultiplier: 120.0,
    minTarget: 120,
    reward: { gold: 200, xp: 125, vault_gold: 420 },
  },
  {
    key: "scan_food",
    mission_type: "food",
    titleTemplate: "Scan {target} meals collectively (min 2 per member)",
    baseMultiplier: 1.0,
    minTarget: 2,
    reward: { gold: 230, xp: 135, vault_gold: 460 },
  },
];

async function ensureTodayMission(db: any, guildId: string): Promise<any> {
  const date = todayStr();
  const { data: existing } = await db
    .from("guild_missions")
    .select("*")
    .eq("guild_id", guildId)
    .eq("date", date)
    .maybeSingle();
  if (existing) return existing;

  // 1. Fetch current member count of this guild
  const { count } = await db
    .from("guild_members")
    .select("id", { count: "exact", head: true })
    .eq("guild_id", guildId);
  const memberCount = count || 1;

  // 2. Deterministic assignment of "Food Scan" day of week (0-6) per guild
  // This guarantees that the "Scan Food" mission appears exactly once per week randomly per guild.
  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // 0 (Sunday) to 6 (Saturday)
  const foodScanDay = Math.abs(hashStr(guildId)) % 7;

  let chosenMission: MissionDef;
  if (dayOfWeek === foodScanDay) {
    chosenMission = MISSION_POOL.find((m) => m.mission_type === "food") || MISSION_POOL[0];
  } else {
    const otherMissions = MISSION_POOL.filter((m) => m.mission_type !== "food");
    const idx = Math.abs(hashStr(guildId + date)) % otherMissions.length;
    chosenMission = otherMissions[idx];
  }

  // 3. Scale the target dynamically based on the member count
  const target = Math.max(
    chosenMission.minTarget,
    Math.ceil(memberCount * chosenMission.baseMultiplier)
  );
  const title = chosenMission.titleTemplate.replace("{target}", target.toString());

  const { data: created } = await db
    .from("guild_missions")
    .insert({
      guild_id: guildId,
      date,
      title,
      target,
      progress: 0,
      reward: chosenMission.reward,
      completed: false,
      mission_type: chosenMission.mission_type,
      rewards_distributed: false,
    })
    .select("*")
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
router.get("/", async (req: Request, res: Response) => {
  try {
    const db = supabaseServer() as any;
    const search = ((req.query.search as string) || "").trim();
    const filter = ((req.query.filter as string) || "top") as
      | "top"
      | "recruiting"
      | "war";

    let q = db
      .from("guilds")
      .select("*")
      .order("level", { ascending: false })
      .limit(50);
    if (search) q = q.ilike("name", `%${search}%`);
    if (filter === "recruiting") q = q.eq("privacy", "open");
    const { data: guilds, error } = await q;
    if (error) throw error;

    // member counts
    const ids = (guilds || []).map((g: any) => g.id);
    const counts: Record<string, number> = {};
    if (ids.length) {
      const { data: members } = await db
        .from("guild_members")
        .select("guild_id")
        .in("guild_id", ids);
      for (const m of members || [])
        counts[m.guild_id] = (counts[m.guild_id] || 0) + 1;
    }

    // Which of these guilds has the caller already requested to join? (optional auth)
    const viewer = getAuthenticatedUserId(req);
    const requestedSet = new Set<string>();
    if (viewer && ids.length) {
      const { data: myReqs } = await db
        .from("guild_join_requests")
        .select("guild_id")
        .eq("user_id", viewer)
        .eq("status", "pending")
        .in("guild_id", ids);
      for (const r of myReqs || []) requestedSet.add(r.guild_id);
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
      level: g.level,
      rank: i + 1,
      requested: requestedSet.has(g.id),
    }));
    return res.json({ guilds: list });
  } catch (err) {
    console.error("[Guilds GET /]", err);
    return res.status(500).json({ error: "Failed to load guilds" });
  }
});

// GET /api/guilds/me — caller's current guild membership (or null)
router.get("/me", async (req: Request, res: Response) => {
  const uid = auth(req, res);
  if (!uid) return;
  try {
    const db = supabaseServer() as any;
    const membership = await getMembership(db, uid);
    if (!membership) return res.json({ guild: null, membership: null });
    const { data: guild } = await db
      .from("guilds")
      .select("*")
      .eq("id", membership.guild_id)
      .maybeSingle();
    if (!guild) {
      // Stale membership (guild disbanded) — clean up.
      await db.from("guild_members").delete().eq("id", membership.id);
      return res.json({ guild: null, membership: null });
    }
    return res.json({
      guild: serializeGuild(guild),
      membership: {
        role: membership.role,
        contributionPoints: membership.contribution_points,
      },
    });
  } catch (err) {
    console.error("[Guilds GET /me]", err);
    return res.status(500).json({ error: "Failed to load membership" });
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
    level: g.level,
    vaultBalance: g.vault_balance,
    createdAt: g.created_at,
  };
}

// GET /api/guilds/check-name?name=... — real-time uniqueness + validation
router.get("/check-name", async (req: Request, res: Response) => {
  const uid = auth(req, res);
  if (!uid) return;
  try {
    const db = supabaseServer() as any;
    const v = validateGuildName(req.query.name);
    if (!v.ok)
      return res.json({ available: false, valid: false, error: v.error });
    const taken = await guildNameTaken(db, v.name);
    return res.json({
      available: !taken,
      valid: true,
      error: taken ? "Name already taken" : null,
    });
  } catch (err) {
    console.error("[Guilds check-name]", err);
    return res.status(500).json({ error: "Failed to check name" });
  }
});

// GET /api/guilds/create-info — preflight data for the creation flow
router.get("/create-info", async (req: Request, res: Response) => {
  const uid = auth(req, res);
  if (!uid) return;
  try {
    const db = supabaseServer() as any;
    const [{ data: player }, membership] = await Promise.all([
      db.from("players").select("gold").eq("supabase_id", uid).maybeSingle(),
      getMembership(db, uid),
    ]);
    const unlockedIcons = await getUnlockedIcons(db, uid);
    return res.json({
      gold: player?.gold || 0,
      cost: GUILD_CREATE_COST,
      inGuild: !!membership,
      unlockedIcons,
    });
  } catch (err) {
    console.error("[Guilds create-info]", err);
    return res.status(500).json({ error: "Failed to load create info" });
  }
});

// POST /api/guilds/purchase-icon — buy a premium guild icon with gold (persisted)
router.post("/purchase-icon", async (req: Request, res: Response) => {
  const uid = auth(req, res);
  if (!uid) return;
  try {
    const db = supabaseServer() as any;
    const iconKey = String(req.body?.iconKey || "");
    const def = GUILD_ICON_CATALOG[iconKey];
    if (!def)
      return res.status(400).json({ error: "Unknown icon", code: "BAD_ICON" });
    if (def.free)
      return res.json({
        gold: undefined,
        unlockedIcons: await getUnlockedIcons(db, uid),
        status: "free",
      });

    const { data: player } = await db
      .from("players")
      .select("gold, raw_data")
      .eq("supabase_id", uid)
      .maybeSingle();
    const unlocked: string[] = Array.isArray(
      player?.raw_data?.unlockedGuildIcons
    )
      ? player.raw_data.unlockedGuildIcons
      : [];
    if (unlocked.includes(iconKey)) {
      return res.json({
        gold: player?.gold || 0,
        unlockedIcons: unlocked,
        status: "already_owned",
      });
    }
    if ((player?.gold || 0) < def.cost) {
      return res
        .status(400)
        .json({ error: "Not enough gold", code: "INSUFFICIENT_GOLD" });
    }

    const newGold = (player?.gold || 0) - def.cost;
    const newUnlocked = [...unlocked, iconKey];
    const newRaw = {
      ...(player?.raw_data || {}),
      unlockedGuildIcons: newUnlocked,
    };
    await db
      .from("players")
      .update({ gold: newGold, raw_data: newRaw })
      .eq("supabase_id", uid);
    return res.json({
      gold: newGold,
      unlockedIcons: newUnlocked,
      status: "purchased",
    });
  } catch (err) {
    console.error("[Guilds purchase-icon]", err);
    return res.status(500).json({ error: "Failed to purchase icon" });
  }
});

// GET /api/guilds/:id — full guild detail + members
router.get("/:id", async (req: Request, res: Response) => {
  const uid = auth(req, res);
  if (!uid) return;
  try {
    const db = supabaseServer() as any;
    const { id } = req.params as Record<string, string>;
    const { data: guild } = await db
      .from("guilds")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (!guild) return res.status(404).json({ error: "Guild not found" });

    const { data: members } = await db
      .from("guild_members")
      .select("*")
      .eq("guild_id", id)
      .order("contribution_points", { ascending: false });

    const info = await enrichPlayers(
      db,
      (members || []).map((m: any) => m.user_id)
    );
    const myMembership =
      (members || []).find((m: any) => m.user_id === uid) || null;

    return res.json({
      guild: serializeGuild(guild),
      myRole: myMembership?.role || null,
      members: (members || []).map((m: any) => ({
        userId: m.user_id,
        role: m.role,
        contributionPoints: m.contribution_points,
        joinedAt: m.joined_at,
        ...(info[m.user_id] || {
          name: "Hunter",
          level: 1,
          rank: "E",
          avatarUrl: null,
          equippedBorder: null,
        }),
      })),
    });
  } catch (err) {
    console.error("[Guilds GET /:id]", err);
    return res.status(500).json({ error: "Failed to load guild" });
  }
});

// POST /api/guilds — create a guild (costs 900 gold; founder becomes master)
router.post("/", async (req: Request, res: Response) => {
  const uid = auth(req, res);
  if (!uid) return;
  try {
    const db = supabaseServer() as any;
    const { name, motto, icon, banner, privacy } = req.body || {};

    // 1. Validate name
    const v = validateGuildName(name);
    if (!v.ok)
      return res.status(400).json({ error: v.error, code: "INVALID_NAME" });

    // 2. Validate icon key → emoji (default: shield)
    const iconKey = String(icon || "shield");
    const iconDef = GUILD_ICON_CATALOG[iconKey];
    if (!iconDef)
      return res.status(400).json({ error: "Invalid icon", code: "BAD_ICON" });

    // 3. Validate privacy
    const priv = privacy === "invite_only" ? "invite_only" : "open";

    // 4. One guild per user
    if (await getMembership(db, uid)) {
      return res.status(409).json({
        error: "You are already in a guild",
        code: "ALREADY_IN_GUILD",
      });
    }

    // 5. Premium icon must be unlocked
    if (!iconDef.free) {
      const unlocked = await getUnlockedIcons(db, uid);
      if (!unlocked.includes(iconKey)) {
        return res
          .status(403)
          .json({ error: "Icon not unlocked", code: "ICON_LOCKED" });
      }
    }

    // 6. Gold check
    const { data: player } = await db
      .from("players")
      .select("gold")
      .eq("supabase_id", uid)
      .maybeSingle();
    const gold = player?.gold || 0;
    if (gold < GUILD_CREATE_COST) {
      return res
        .status(400)
        .json({ error: "Not enough gold", code: "INSUFFICIENT_GOLD", gold });
    }

    // 7. Name uniqueness (case-insensitive)
    if (await guildNameTaken(db, v.name)) {
      return res
        .status(409)
        .json({ error: "Name already taken", code: "NAME_TAKEN" });
    }

    // 8. Deduct gold, then create guild + master membership.
    const newGold = gold - GUILD_CREATE_COST;
    await db.from("players").update({ gold: newGold }).eq("supabase_id", uid);

    const { data: guild, error } = await db
      .from("guilds")
      .insert({
        name: v.name,
        motto: motto ? String(motto).slice(0, 60) : "",
        icon: iconDef.emoji,
        banner: banner || "gradient-cyan",
        privacy: priv,
        master_id: uid,
      })
      .select("*")
      .single();

    if (error || !guild) {
      // Roll back the gold deduction on failure.
      await db.from("players").update({ gold }).eq("supabase_id", uid);
      if (error && String(error.message).includes("duplicate")) {
        return res
          .status(409)
          .json({ error: "Name already taken", code: "NAME_TAKEN" });
      }
      throw error || new Error("Insert failed");
    }

    await db
      .from("guild_members")
      .insert({ guild_id: guild.id, user_id: uid, role: "master" });

    // Founder system message in guild chat.
    const info = await enrichPlayers(db, [uid]);
    await postSystemMessage(
      db,
      guild.id,
      `Guild founded by ${info[uid]?.name || "the Guild Master"}.`
    );

    return res.json({
      success: true,
      guild: serializeGuild(guild),
      player: { gold: newGold, guildId: guild.id },
    });
  } catch (err) {
    console.error("[Guilds POST /]", err);
    return res
      .status(500)
      .json({ error: "Failed to create guild", code: "SERVER_ERROR" });
  }
});

// POST /api/guilds/:id/join — instant join (open) or request (invite_only)
router.post("/:id/join", async (req: Request, res: Response) => {
  const uid = auth(req, res);
  if (!uid) return;
  try {
    const db = supabaseServer() as any;
    const { id } = req.params as Record<string, string>;
    if (await getMembership(db, uid))
      return res.status(409).json({ error: "You are already in a guild" });

    const { data: guild } = await db
      .from("guilds")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (!guild) return res.status(404).json({ error: "Guild not found" });

    const { count } = await db
      .from("guild_members")
      .select("id", { count: "exact", head: true })
      .eq("guild_id", id);
    if ((count || 0) >= guild.member_cap)
      return res.status(409).json({ error: "Guild is full" });

    if (guild.privacy === "open") {
      await db
        .from("guild_members")
        .insert({ guild_id: id, user_id: uid, role: "member" });
      const info = await enrichPlayers(db, [uid]);
      await postSystemMessage(
        db,
        id,
        `${info[uid]?.name || "A hunter"} joined the guild.`
      );
      return res.json({ status: "joined" });
    }

    // invite_only → request. A user may hold only ONE outstanding request
    // across all guilds at a time.
    const { data: pendingReqs } = await db
      .from("guild_join_requests")
      .select("guild_id")
      .eq("user_id", uid)
      .eq("status", "pending");
    const otherPending = (pendingReqs || []).find(
      (r: any) => r.guild_id !== id
    );
    if (otherPending) {
      const { data: og } = await db
        .from("guilds")
        .select("name")
        .eq("id", otherPending.guild_id)
        .maybeSingle();
      return res.status(409).json({
        error: `You already have a pending request to "${
          og?.name || "another guild"
        }". Withdraw it first.`,
        code: "HAS_PENDING_REQUEST",
        guildId: otherPending.guild_id,
        guildName: og?.name || null,
      });
    }

    await db
      .from("guild_join_requests")
      .upsert(
        { guild_id: id, user_id: uid, status: "pending" },
        { onConflict: "guild_id,user_id" }
      );
    await broadcastToGuild(id, "join_request", { guildId: id, action: "create" });
    return res.json({ status: "requested" });
  } catch (err) {
    console.error("[Guilds join]", err);
    return res.status(500).json({ error: "Failed to join guild" });
  }
});

// DELETE /api/guilds/:id/request — withdraw the caller's own pending join request
router.delete("/:id/request", async (req: Request, res: Response) => {
  const uid = auth(req, res);
  if (!uid) return;
  try {
    const db = supabaseServer() as any;
    const { id } = req.params as Record<string, string>;
    await db
      .from("guild_join_requests")
      .delete()
      .eq("guild_id", id)
      .eq("user_id", uid)
      .eq("status", "pending");
    await broadcastToGuild(id, "join_request", { guildId: id, action: "cancel" });
    return res.json({ status: "cancelled" });
  } catch (err) {
    console.error("[Guilds cancel request]", err);
    return res.status(500).json({ error: "Failed to cancel request" });
  }
});

// PUT /api/guilds/:id/details { motto } — edit the guild description (master/vice)
router.put("/:id/details", async (req: Request, res: Response) => {
  const uid = auth(req, res);
  if (!uid) return;
  try {
    const db = supabaseServer() as any;
    const { id } = req.params as Record<string, string>;
    const me = await getMembershipIn(db, id, uid);
    if (!me || RANK_ROLE[me.role as Role] < RANK_ROLE.vice)
      return res
        .status(403)
        .json({ error: "Only master/vice can edit the description" });

    const motto = String(req.body?.motto ?? "").slice(0, 120);
    await db.from("guilds").update({ motto }).eq("id", id);
    return res.json({ status: "ok", motto });
  } catch (err) {
    console.error("[Guilds details]", err);
    return res.status(500).json({ error: "Failed to update description" });
  }
});

// GET /api/guilds/:id/requests — pending join requests (master/vice)
router.get("/:id/requests", async (req: Request, res: Response) => {
  const uid = auth(req, res);
  if (!uid) return;
  try {
    const db = supabaseServer() as any;
    const { id } = req.params as Record<string, string>;
    const me = await getMembershipIn(db, id, uid);
    if (!me || RANK_ROLE[me.role as Role] < RANK_ROLE.vice)
      return res.status(403).json({ error: "Insufficient role" });

    const { data: reqs } = await db
      .from("guild_join_requests")
      .select("*")
      .eq("guild_id", id)
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    const info = await enrichPlayers(
      db,
      (reqs || []).map((r: any) => r.user_id)
    );
    return res.json({
      requests: (reqs || []).map((r: any) => ({
        id: r.id,
        userId: r.user_id,
        createdAt: r.created_at,
        ...(info[r.user_id] || {}),
      })),
    });
  } catch (err) {
    console.error("[Guilds requests]", err);
    return res.status(500).json({ error: "Failed to load requests" });
  }
});

// POST /api/guilds/:id/requests/:reqId — approve/reject (master/vice)
router.post("/:id/requests/:reqId", async (req: Request, res: Response) => {
  const uid = auth(req, res);
  if (!uid) return;
  try {
    const db = supabaseServer() as any;
    const { id, reqId } = req.params as Record<string, string>;
    const { action } = req.body || {}; // 'approve' | 'reject'
    const me = await getMembershipIn(db, id, uid);
    if (!me || RANK_ROLE[me.role as Role] < RANK_ROLE.vice)
      return res.status(403).json({ error: "Insufficient role" });

    const { data: reqRow } = await db
      .from("guild_join_requests")
      .select("*")
      .eq("id", reqId)
      .maybeSingle();
    if (!reqRow || reqRow.guild_id !== id)
      return res.status(404).json({ error: "Request not found" });

    if (action === "approve") {
      if (await getMembership(db, reqRow.user_id)) {
        await db
          .from("guild_join_requests")
          .update({ status: "rejected" })
          .eq("id", reqId);
        return res
          .status(409)
          .json({ error: "User already joined another guild" });
      }
      const { count } = await db
        .from("guild_members")
        .select("id", { count: "exact", head: true })
        .eq("guild_id", id);
      const { data: guild } = await db
        .from("guilds")
        .select("member_cap")
        .eq("id", id)
        .maybeSingle();
      if ((count || 0) >= (guild?.member_cap || 150))
        return res.status(409).json({ error: "Guild is full" });

      await db
        .from("guild_members")
        .insert({ guild_id: id, user_id: reqRow.user_id, role: "member" });
      await db
        .from("guild_join_requests")
        .update({ status: "approved" })
        .eq("id", reqId);
      const info = await enrichPlayers(db, [reqRow.user_id]);
      await postSystemMessage(
        db,
        id,
        `${info[reqRow.user_id]?.name || "A hunter"} joined the guild.`
      );
      await broadcastToGuild(id, "join_request", { guildId: id, action: "resolve" });
      return res.json({ status: "approved" });
    }
    await db
      .from("guild_join_requests")
      .update({ status: "rejected" })
      .eq("id", reqId);
    await broadcastToGuild(id, "join_request", { guildId: id, action: "resolve" });
    return res.json({ status: "rejected" });
  } catch (err) {
    console.error("[Guilds request action]", err);
    return res.status(500).json({ error: "Failed to process request" });
  }
});

// POST /api/guilds/:id/leave
router.post("/:id/leave", async (req: Request, res: Response) => {
  const uid = auth(req, res);
  if (!uid) return;
  try {
    const db = supabaseServer() as any;
    const { id } = req.params as Record<string, string>;
    const me = await getMembershipIn(db, id, uid);
    if (!me) return res.status(404).json({ error: "Not a member" });

    if (me.role === "master") {
      // Promote successor (oldest vice, else oldest member). If alone → disband.
      const { data: others } = await db
        .from("guild_members")
        .select("*")
        .eq("guild_id", id)
        .neq("user_id", uid)
        .order("role", { ascending: false })
        .order("joined_at", { ascending: true });
      if (!others || others.length === 0) {
        await db.from("guilds").delete().eq("id", id); // cascade
        return res.json({ status: "disbanded" });
      }
      const successor = others.find((m: any) => m.role === "vice") || others[0];
      await db
        .from("guild_members")
        .update({ role: "master" })
        .eq("id", successor.id);
      await db
        .from("guilds")
        .update({ master_id: successor.user_id })
        .eq("id", id);
    }
    await db.from("guild_members").delete().eq("id", me.id);
    const info = await enrichPlayers(db, [uid]);
    await postSystemMessage(
      db,
      id,
      `${info[uid]?.name || "A hunter"} left the guild.`
    );
    return res.json({ status: "left" });
  } catch (err) {
    console.error("[Guilds leave]", err);
    return res.status(500).json({ error: "Failed to leave guild" });
  }
});

// POST /api/guilds/:id/members/:userId/role — promote/demote (master only)
router.post(
  "/:id/members/:userId/role",
  async (req: Request, res: Response) => {
    const uid = auth(req, res);
    if (!uid) return;
    try {
      const db = supabaseServer() as any;
      const { id, userId } = req.params as Record<string, string>;
      const { role } = req.body || {}; // 'vice' | 'member'
      const me = await getMembershipIn(db, id, uid);
      if (!me || me.role !== "master")
        return res
          .status(403)
          .json({ error: "Only the master can change roles" });
      if (userId === uid)
        return res.status(400).json({ error: "Cannot change your own role" });
      if (!["vice", "member"].includes(role))
        return res.status(400).json({ error: "Invalid role" });

      const target = await getMembershipIn(db, id, userId);
      if (!target) return res.status(404).json({ error: "Member not found" });
      await db.from("guild_members").update({ role }).eq("id", target.id);
      return res.json({ status: "updated" });
    } catch (err) {
      console.error("[Guilds role]", err);
      return res.status(500).json({ error: "Failed to update role" });
    }
  }
);

// DELETE /api/guilds/:id/members/:userId — kick (master/vice)
router.delete("/:id/members/:userId", async (req: Request, res: Response) => {
  const uid = auth(req, res);
  if (!uid) return;
  try {
    const db = supabaseServer() as any;
    const { id, userId } = req.params as Record<string, string>;
    const me = await getMembershipIn(db, id, uid);
    if (!me || RANK_ROLE[me.role as Role] < RANK_ROLE.vice)
      return res.status(403).json({ error: "Insufficient role" });
    const target = await getMembershipIn(db, id, userId);
    if (!target) return res.status(404).json({ error: "Member not found" });
    if (RANK_ROLE[target.role as Role] >= RANK_ROLE[me.role as Role]) {
      return res
        .status(403)
        .json({ error: "Cannot kick someone of equal or higher rank" });
    }
    await db.from("guild_members").delete().eq("id", target.id);
    const info = await enrichPlayers(db, [userId]);
    await postSystemMessage(
      db,
      id,
      `${info[userId]?.name || "A hunter"} was removed from the guild.`
    );
    await broadcastToGuild(id, "kicked", { userId });
    return res.json({ status: "kicked" });
  } catch (err) {
    console.error("[Guilds kick]", err);
    return res.status(500).json({ error: "Failed to kick member" });
  }
});

// POST /api/guilds/:id/disband — master only
router.post("/:id/disband", async (req: Request, res: Response) => {
  const uid = auth(req, res);
  if (!uid) return;
  try {
    const db = supabaseServer() as any;
    const { id } = req.params as Record<string, string>;
    const me = await getMembershipIn(db, id, uid);
    if (!me || me.role !== "master")
      return res.status(403).json({ error: "Only the master can disband" });
    await broadcastToGuild(id, "disbanded", {});
    await db.from("guilds").delete().eq("id", id); // cascade removes members/chat/etc.
    return res.json({ status: "disbanded" });
  } catch (err) {
    console.error("[Guilds disband]", err);
    return res.status(500).json({ error: "Failed to disband guild" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// CHAT
// ─────────────────────────────────────────────────────────────────────────────

async function postSystemMessage(db: any, guildId: string, body: string) {
  const { data: row } = await db
    .from("guild_chat")
    .insert({ guild_id: guildId, user_id: null, type: "system", body })
    .select("*")
    .single();
  if (row)
    await broadcastToGuild(guildId, "message", serializeMessage(row, {}));
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

// GET /api/guilds/:id/chat?before=<ISO>&after=<ISO>&limit=30
router.get("/:id/chat", async (req: Request, res: Response) => {
  const uid = auth(req, res);
  if (!uid) return;
  try {
    const db = supabaseServer() as any;
    const { id } = req.params as Record<string, string>;
    if (!(await getMembershipIn(db, id, uid)))
      return res.status(403).json({ error: "Not a member" });

    const limit = Math.min(parseInt((req.query.limit as string) || "30"), 50);
    let q = db
      .from("guild_chat")
      .select("*")
      .eq("guild_id", id)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (req.query.before) q = q.lt("created_at", req.query.before as string);
    if (req.query.after) q = q.gt("created_at", req.query.after as string);
    
    const { data: rows } = await q;
    const ordered = (rows || []).reverse();
    const info = await enrichPlayers(
      db,
      ordered.filter((r: any) => r.user_id).map((r: any) => r.user_id)
    );
    return res.json({
      messages: ordered.map((r: any) => serializeMessage(r, info)),
    });
  } catch (err) {
    console.error("[Guilds chat GET]", err);
    return res.status(500).json({ error: "Failed to load chat" });
  }
});

// POST /api/guilds/:id/chat  { body, type?, meta? }
router.post("/:id/chat", async (req: Request, res: Response) => {
  const uid = auth(req, res);
  if (!uid) return;
  try {
    const db = supabaseServer() as any;
    const { id } = req.params as Record<string, string>;
    if (!(await getMembershipIn(db, id, uid)))
      return res.status(403).json({ error: "Not a member" });

    const { body, type, meta } = req.body || {};
    const msgType = ["workout", "quest"].includes(type) ? type : "user";
    if (msgType === "user" && (!body || !String(body).trim())) {
      return res.status(400).json({ error: "Empty message" });
    }
    const cleanBody = msgType === "user" ? censorChatBody(String(body || "")) : String(body || "");
    const { data: row, error } = await db
      .from("guild_chat")
      .insert({
        guild_id: id,
        user_id: uid,
        type: msgType,
        body: cleanBody.slice(0, 1000),
        meta: meta || {},
      })
      .select("*")
      .single();
    if (error) throw error;
    const info = await enrichPlayers(db, [uid]);
    const message = serializeMessage(row, info);
    await broadcastToGuild(id, "message", message);
    return res.json({ message });
  } catch (err) {
    console.error("[Guilds chat POST]", err);
    return res.status(500).json({ error: "Failed to send message" });
  }
});

// POST /api/guilds/:id/chat/read { messageId } — update last read message status
router.post("/:id/chat/read", async (req: Request, res: Response) => {
  const uid = auth(req, res);
  if (!uid) return;
  try {
    const db = supabaseServer() as any;
    const { id } = req.params as Record<string, string>;
    const { messageId } = req.body || {};
    if (!messageId) return res.status(400).json({ error: "Missing messageId" });

    if (!(await getMembershipIn(db, id, uid)))
      return res.status(403).json({ error: "Not a member" });

    const { error } = await db
      .from("guild_members")
      .update({
        last_read_message_id: messageId,
        last_read_at: new Date().toISOString()
      })
      .eq("guild_id", id)
      .eq("user_id", uid);

    if (error) throw error;
    return res.json({ success: true });
  } catch (err) {
    console.error("[Guilds chat read POST]", err);
    return res.status(500).json({ error: "Failed to update read state" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// MISSIONS
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/guilds/:id/mission — today's collective mission
router.get("/:id/mission", async (req: Request, res: Response) => {
  const uid = auth(req, res);
  if (!uid) return;
  try {
    const db = supabaseServer() as any;
    const { id } = req.params as Record<string, string>;
    if (!(await getMembershipIn(db, id, uid)))
      return res.status(403).json({ error: "Not a member" });
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
    console.error("[Guilds mission]", err);
    return res.status(500).json({ error: "Failed to load mission" });
  }
});

// GET /api/guilds/:id/mission/rewards — fetch user's unclaimed rewards
router.get("/:id/mission/rewards", async (req: Request, res: Response) => {
  const uid = auth(req, res);
  if (!uid) return;
  try {
    const db = supabaseServer() as any;
    const { id } = req.params as Record<string, string>;
    if (!(await getMembershipIn(db, id, uid)))
      return res.status(403).json({ error: "Not a member" });

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: rewards, error } = await db
      .from("guild_member_rewards")
      .select("*")
      .eq("guild_id", id)
      .eq("user_id", uid)
      .eq("claimed", false)
      .gte("created_at", sevenDaysAgo);

    if (error) throw error;
    return res.json({ rewards: rewards || [] });
  } catch (err) {
    console.error("[Guilds rewards GET]", err);
    return res.status(500).json({ error: "Failed to load rewards" });
  }
});

// POST /api/guilds/:id/mission/rewards/claim — claim a specific daily mission reward
router.post("/:id/mission/rewards/claim", async (req: Request, res: Response) => {
  const uid = auth(req, res);
  if (!uid) return;
  try {
    const db = supabaseServer() as any;
    const { id } = req.params as Record<string, string>;
    const { rewardId } = req.body || {};
    if (!rewardId) {
      return res.status(400).json({ error: "rewardId is required" });
    }

    if (!(await getMembershipIn(db, id, uid)))
      return res.status(403).json({ error: "Not a member" });

    // Fetch the reward row
    const { data: reward } = await db
      .from("guild_member_rewards")
      .select("*")
      .eq("id", rewardId)
      .eq("user_id", uid)
      .eq("claimed", false)
      .maybeSingle();

    if (!reward) {
      return res.status(404).json({ error: "Reward not found or already claimed" });
    }

    // Fetch player stats
    const { data: player } = await db
      .from("players")
      .select("gold, level, current_xp, required_xp, total_xp, rank, raw_data")
      .eq("supabase_id", uid)
      .maybeSingle();

    if (!player) {
      return res.status(404).json({ error: "Player not found" });
    }

    const rewardGold = reward.gold || 0;
    const rewardXp = reward.xp || 0;

    const newGold = (player.gold || 0) + rewardGold;
    const newTotalXp = (player.total_xp || 0) + rewardXp;
    const initialCurrentXp = (player.current_xp || 0) + rewardXp;

    const lvlResult = safeLevelUp(initialCurrentXp, player.required_xp || 100, player.level || 1);

    const newRawData = {
      ...(player.raw_data || {}),
      gold: newGold,
      level: lvlResult.level,
      currentXp: lvlResult.currentXp,
      requiredXp: lvlResult.requiredXp,
      totalXp: newTotalXp,
      rank: lvlResult.rank,
    };

    const playerUpdate = {
      gold: newGold,
      level: lvlResult.level,
      current_xp: lvlResult.currentXp,
      required_xp: lvlResult.requiredXp,
      total_xp: newTotalXp,
      rank: lvlResult.rank,
      raw_data: newRawData,
      updated_at: new Date().toISOString(),
    };

    // Update player stats and mark reward as claimed
    await db
      .from("players")
      .update(playerUpdate)
      .eq("supabase_id", uid);

    await db
      .from("guild_member_rewards")
      .update({ claimed: true })
      .eq("id", rewardId);

    return res.json({
      success: true,
      rewardGold,
      rewardXp,
      player: {
        gold: newGold,
        level: lvlResult.level,
        currentXp: lvlResult.currentXp,
        requiredXp: lvlResult.requiredXp,
        totalXp: newTotalXp,
        rank: lvlResult.rank,
        leveledUp: lvlResult.leveledUp,
      }
    });
  } catch (err) {
    console.error("[Guilds rewards claim POST]", err);
    return res.status(500).json({ error: "Failed to claim reward" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// WAR
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/guilds/:id/war — current week's war (split-screen + contributors) + registration status
router.get("/:id/war", async (req: Request, res: Response) => {
  const uid = auth(req, res);
  if (!uid) return;
  try {
    const db = supabaseServer() as any;
    const { id } = req.params as Record<string, string>;
    const me = await getMembershipIn(db, id, uid);
    if (!me) return res.status(403).json({ error: "Not a member" });

    const nextWarStart = nextWarThursday(new Date());
    const { data: guildRow } = await db
      .from("guilds")
      .select("war_registered_week")
      .eq("id", id)
      .maybeSingle();
    const registrationWeek: string | null =
      guildRow?.war_registered_week || null;
    const registered = registrationWeek === nextWarStart;
    const canRegister = RANK_ROLE[me.role as Role] >= RANK_ROLE.vice;

    const { data: war } = await db
      .from("guild_wars")
      .select("*")
      .or(`guild_a.eq.${id},guild_b.eq.${id}`)
      .in("status", ["active", "ended"])
      .order("week_start", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!war) {
      return res.json({
        war: null,
        registered,
        canRegister,
        registrationWeek,
        nextWarStart,
      });
    }

    const [ga, gb] = await Promise.all([
      db
        .from("guilds")
        .select("id, name, icon, banner")
        .eq("id", war.guild_a)
        .maybeSingle(),
      db
        .from("guilds")
        .select("id, name, icon, banner")
        .eq("id", war.guild_b)
        .maybeSingle(),
    ]);

    const { data: contribs } = await db
      .from("guild_war_contributions")
      .select("*")
      .eq("war_id", war.id)
      .order("points", { ascending: false })
      .limit(20);
    const info = await enrichPlayers(
      db,
      (contribs || []).map((c: any) => c.user_id)
    );
    const contributors = (contribs || []).map((c: any) => ({
      userId: c.user_id,
      guildId: c.guild_id,
      points: c.points,
      ...(info[c.user_id] || { name: "Hunter", avatarUrl: null }),
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
    console.error("[Guilds war]", err);
    return res.status(500).json({ error: "Failed to load war" });
  }
});

// POST /api/guilds/:id/war/register — opt in to the upcoming war (master/vice)
router.post("/:id/war/register", async (req: Request, res: Response) => {
  const uid = auth(req, res);
  if (!uid) return;
  try {
    const db = supabaseServer() as any;
    const { id } = req.params as Record<string, string>;
    const me = await getMembershipIn(db, id, uid);
    if (!me || RANK_ROLE[me.role as Role] < RANK_ROLE.vice) {
      return res
        .status(403)
        .json({ error: "Only master/vice can register for war" });
    }
    const nextWarStart = nextWarThursday(new Date());
    await db
      .from("guilds")
      .update({ war_registered_week: nextWarStart })
      .eq("id", id);
    const info = await enrichPlayers(db, [uid]);
    await postSystemMessage(
      db,
      id,
      `${
        info[uid]?.name || "A leader"
      } registered the guild for the upcoming War.`
    );
    return res.json({
      status: "registered",
      registrationWeek: nextWarStart,
      nextWarStart,
    });
  } catch (err) {
    console.error("[Guilds war register]", err);
    return res.status(500).json({ error: "Failed to register for war" });
  }
});

// POST /api/guilds/:id/war/unregister — withdraw before matchmaking (master/vice)
router.post("/:id/war/unregister", async (req: Request, res: Response) => {
  const uid = auth(req, res);
  if (!uid) return;
  try {
    const db = supabaseServer() as any;
    const { id } = req.params as Record<string, string>;
    const me = await getMembershipIn(db, id, uid);
    if (!me || RANK_ROLE[me.role as Role] < RANK_ROLE.vice) {
      return res
        .status(403)
        .json({ error: "Only master/vice can change war registration" });
    }
    const nextWarStart = nextWarThursday(new Date());
    await db.from("guilds").update({ war_registered_week: null }).eq("id", id);
    return res.json({
      status: "unregistered",
      registrationWeek: null,
      nextWarStart,
    });
  } catch (err) {
    console.error("[Guilds war unregister]", err);
    return res.status(500).json({ error: "Failed to update war registration" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// VAULT
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/guilds/:id/vault — balance + recent transactions
router.get("/:id/vault", async (req: Request, res: Response) => {
  const uid = auth(req, res);
  if (!uid) return;
  try {
    const db = supabaseServer() as any;
    const { id } = req.params as Record<string, string>;
    const me = await getMembershipIn(db, id, uid);
    if (!me) return res.status(403).json({ error: "Not a member" });

    const { data: guild } = await db
      .from("guilds")
      .select("vault_balance, icon, banner, unlocked_icons")
      .eq("id", id)
      .maybeSingle();
    const { data: txns } = await db
      .from("guild_vault_transactions")
      .select("*")
      .eq("guild_id", id)
      .order("created_at", { ascending: false })
      .limit(20);
    const info = await enrichPlayers(
      db,
      (txns || []).map((t: any) => t.user_id)
    );
    return res.json({
      balance: guild?.vault_balance || 0,
      canPurchase: RANK_ROLE[me.role as Role] >= RANK_ROLE.vice,
      icon: guild?.icon || "shield",
      banner: guild?.banner || "gradient-cyan",
      unlockedIcons: Array.isArray(guild?.unlocked_icons)
        ? guild.unlocked_icons
        : [],
      transactions: (txns || []).map((t: any) => ({
        id: t.id,
        userId: t.user_id,
        kind: t.kind,
        amount: t.amount,
        itemKey: t.item_key,
        createdAt: t.created_at,
        name: info[t.user_id]?.name || "Hunter",
      })),
    });
  } catch (err) {
    console.error("[Guilds vault]", err);
    return res.status(500).json({ error: "Failed to load vault" });
  }
});

// Allowed banner keys (cosmetic gradients; equippable by master/vice).
const GUILD_BANNER_KEYS = [
  "gradient-cyan",
  "gradient-violet",
  "gradient-crimson",
  "gradient-emerald",
  "gradient-gold",
];

// POST /api/guilds/:id/vault/icon { iconKey } — equip (and buy from vault if needed). Master/vice only.
router.post("/:id/vault/icon", async (req: Request, res: Response) => {
  const uid = auth(req, res);
  if (!uid) return;
  try {
    const db = supabaseServer() as any;
    const { id } = req.params as Record<string, string>;
    const me = await getMembershipIn(db, id, uid);
    if (!me || RANK_ROLE[me.role as Role] < RANK_ROLE.vice)
      return res
        .status(403)
        .json({ error: "Only master/vice can change the icon" });

    const iconKey = String(req.body?.iconKey || "");
    const def = GUILD_ICON_CATALOG[iconKey];
    if (!def) return res.status(400).json({ error: "Unknown icon" });

    const { data: guild } = await db
      .from("guilds")
      .select("vault_balance, unlocked_icons")
      .eq("id", id)
      .maybeSingle();
    const unlocked: string[] = Array.isArray(guild?.unlocked_icons)
      ? guild.unlocked_icons
      : [];
    let balance = guild?.vault_balance || 0;

    // Premium icon that the guild hasn't unlocked yet → purchase from the vault.
    if (!def.free && !unlocked.includes(iconKey)) {
      if (balance < def.cost)
        return res.status(400).json({ error: "Insufficient vault balance" });
      await db.rpc("guild_add_vault", { p_guild: id, p_amount: -def.cost });
      await db.from("guild_vault_transactions").insert({
        guild_id: id,
        user_id: uid,
        kind: "purchase",
        amount: def.cost,
        item_key: `icon:${iconKey}`,
      });
      unlocked.push(iconKey);
      balance -= def.cost;
      const info = await enrichPlayers(db, [uid]);
      await postSystemMessage(
        db,
        id,
        `${info[uid]?.name || "A hunter"} unlocked the ${iconKey} guild icon.`
      );
    }

    await db
      .from("guilds")
      .update({ icon: iconKey, unlocked_icons: unlocked })
      .eq("id", id);
    return res.json({
      status: "ok",
      icon: iconKey,
      unlockedIcons: unlocked,
      newBalance: balance,
    });
  } catch (err) {
    console.error("[Guilds vault/icon]", err);
    return res.status(500).json({ error: "Failed to update icon" });
  }
});

// POST /api/guilds/:id/vault/banner { bannerKey } — equip a banner. Master/vice only.
router.post("/:id/vault/banner", async (req: Request, res: Response) => {
  const uid = auth(req, res);
  if (!uid) return;
  try {
    const db = supabaseServer() as any;
    const { id } = req.params as Record<string, string>;
    const me = await getMembershipIn(db, id, uid);
    if (!me || RANK_ROLE[me.role as Role] < RANK_ROLE.vice)
      return res
        .status(403)
        .json({ error: "Only master/vice can change the banner" });

    const bannerKey = String(req.body?.bannerKey || "");
    if (!GUILD_BANNER_KEYS.includes(bannerKey))
      return res.status(400).json({ error: "Unknown banner" });

    await db.from("guilds").update({ banner: bannerKey }).eq("id", id);
    return res.json({ status: "ok", banner: bannerKey });
  } catch (err) {
    console.error("[Guilds vault/banner]", err);
    return res.status(500).json({ error: "Failed to update banner" });
  }
});

// POST /api/guilds/:id/vault/donate { amount }
router.post("/:id/vault/donate", async (req: Request, res: Response) => {
  const uid = auth(req, res);
  if (!uid) return;
  try {
    const db = supabaseServer() as any;
    const { id } = req.params as Record<string, string>;
    const amount = Math.floor(Number(req.body?.amount));
    if (!(await getMembershipIn(db, id, uid)))
      return res.status(403).json({ error: "Not a member" });
    if (!amount || amount <= 0)
      return res.status(400).json({ error: "Invalid amount" });

    const { data: player } = await db
      .from("players")
      .select("gold")
      .eq("supabase_id", uid)
      .maybeSingle();
    if (!player || (player.gold || 0) < amount)
      return res.status(400).json({ error: "Not enough gold" });

    await db
      .from("players")
      .update({ gold: player.gold - amount })
      .eq("supabase_id", uid);
    await db.rpc("guild_add_vault", { p_guild: id, p_amount: amount });
    await db
      .from("guild_vault_transactions")
      .insert({ guild_id: id, user_id: uid, kind: "donate", amount });
    const info = await enrichPlayers(db, [uid]);
    await postSystemMessage(
      db,
      id,
      `${
        info[uid]?.name || "A hunter"
      } donated ${amount.toLocaleString()} G to the vault.`
    );

    const { data: guild } = await db
      .from("guilds")
      .select("vault_balance")
      .eq("id", id)
      .maybeSingle();
    return res.json({
      status: "ok",
      newBalance: guild?.vault_balance || 0,
      playerGold: player.gold - amount,
    });
  } catch (err) {
    console.error("[Guilds donate]", err);
    return res.status(500).json({ error: "Failed to donate" });
  }
});

// Vault shop catalogue (server-authoritative pricing)
const VAULT_SHOP: Record<
  string,
  { price: number; label: string; category: string }
> = {
  crest_of_valor: {
    price: 6000,
    label: "Crest of Valor",
    category: "cosmetic",
  },
  fortress_lvl2: { price: 10000, label: "Fortress Lvl 2", category: "buff" },
  xp_surge_24h: { price: 2500, label: "XP Surge (24h)", category: "buff" },
};

// POST /api/guilds/:id/vault/purchase { itemKey } — master/vice only
router.post("/:id/vault/purchase", async (req: Request, res: Response) => {
  const uid = auth(req, res);
  if (!uid) return;
  try {
    const db = supabaseServer() as any;
    const { id } = req.params as Record<string, string>;
    const me = await getMembershipIn(db, id, uid);
    if (!me || RANK_ROLE[me.role as Role] < RANK_ROLE.vice)
      return res.status(403).json({ error: "Only master/vice can purchase" });

    const item = VAULT_SHOP[req.body?.itemKey];
    if (!item) return res.status(400).json({ error: "Unknown item" });

    const { data: guild } = await db
      .from("guilds")
      .select("vault_balance")
      .eq("id", id)
      .maybeSingle();
    if ((guild?.vault_balance || 0) < item.price)
      return res.status(400).json({ error: "Insufficient vault balance" });

    await db.rpc("guild_add_vault", { p_guild: id, p_amount: -item.price });
    await db.from("guild_vault_transactions").insert({
      guild_id: id,
      user_id: uid,
      kind: "purchase",
      amount: item.price,
      item_key: req.body.itemKey,
    });
    const info = await enrichPlayers(db, [uid]);
    await postSystemMessage(
      db,
      id,
      `${info[uid]?.name || "A hunter"} purchased ${item.label}.`
    );
    return res.json({
      status: "ok",
      newBalance: (guild?.vault_balance || 0) - item.price,
    });
  } catch (err) {
    console.error("[Guilds purchase]", err);
    return res.status(500).json({ error: "Failed to purchase" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// CONTRIBUTION HOOK (mission progress + war points + member contribution)
// ─────────────────────────────────────────────────────────────────────────────

// Unified helper to record guild contribution
export async function recordGuildContribution(
  db: any,
  userId: string,
  amount: number,
  source: string
): Promise<void> {
  const membership = await getMembership(db, userId);
  if (!membership) return;
  const guildId = membership.guild_id;
  const date = todayStr();

  const mission = await ensureTodayMission(db, guildId);
  if (mission && mission.mission_type === source) {
    await db.rpc("guild_mission_progress", {
      p_guild: guildId,
      p_date: date,
      p_amount: amount,
    });
    // Check mission completion -> reward broadcast
    const { data: updatedMission } = await db
      .from("guild_missions")
      .select("*")
      .eq("guild_id", guildId)
      .eq("date", date)
      .maybeSingle();
    if (updatedMission?.completed && !mission.completed) {
      await broadcastToGuild(guildId, "mission_complete", {
        missionId: updatedMission.id,
        title: updatedMission.title,
      });
    }
  }

  await db.rpc("guild_member_contribute", {
    p_guild: guildId,
    p_user: userId,
    p_amount: amount,
  });

  // War points (Thu–Sat) if an active war exists for this guild
  const { data: war } = await db
    .from("guild_wars")
    .select("*")
    .or(`guild_a.eq.${guildId},guild_b.eq.${guildId}`)
    .eq("status", "active")
    .order("week_start", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (war) {
    const col = war.guild_a === guildId ? "score_a" : "score_b";
    await db
      .from("guild_wars")
      .update({ [col]: (war[col] || 0) + amount })
      .eq("id", war.id);
    const { data: existing } = await db
      .from("guild_war_contributions")
      .select("*")
      .eq("war_id", war.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (existing) {
      await db
        .from("guild_war_contributions")
        .update({ points: existing.points + amount })
        .eq("id", existing.id);
    } else {
      await db.from("guild_war_contributions").insert({
        war_id: war.id,
        guild_id: guildId,
        user_id: userId,
        points: amount,
      });
    }
  }
}

// POST /api/guilds/contribute { amount, source }
router.post("/contribute", async (req: Request, res: Response) => {
  const uid = auth(req, res);
  if (!uid) return;
  try {
    const db = supabaseServer() as any;
    const amount = Math.max(1, Math.floor(Number(req.body?.amount) || 1));
    const source = String(req.body?.source || "");
    const membership = await getMembership(db, uid);
    if (!membership) return res.json({ status: "no_guild" });

    await recordGuildContribution(db, uid, amount, source);
    return res.json({ status: "ok" });
  } catch (err) {
    console.error("[Guilds contribute]", err);
    return res.status(500).json({ error: "Failed to record contribution" });
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
    const { data: existing } = await db
      .from("guild_wars")
      .select("guild_a, guild_b")
      .eq("week_start", weekStart);
    const paired = new Set<string>();
    for (const w of existing || []) {
      paired.add(w.guild_a);
      paired.add(w.guild_b);
    }

    // Opt-in only: just guilds that registered for THIS week's matchmaking.
    const { data: guilds } = await db
      .from("guilds")
      .select("id, level")
      .eq("war_registered_week", weekStart)
      .order("level", { ascending: false });
    const eligible = (guilds || []).filter((g: any) => !paired.has(g.id));
    for (let i = 0; i + 1 < eligible.length; i += 2) {
      await db.from("guild_wars").insert({
        week_start: weekStart,
        guild_a: eligible[i].id,
        guild_b: eligible[i + 1].id,
        status: "active",
      });
    }
  }

  // ── Sunday: settle active wars and distribute rewards ──
  if (day === 0) {
    const { data: wars } = await db
      .from("guild_wars")
      .select("*")
      .eq("status", "active");
    for (const war of wars || []) {
      const winner =
        war.score_a === war.score_b
          ? null
          : war.score_a > war.score_b
          ? war.guild_a
          : war.guild_b;
      await db
        .from("guild_wars")
        .update({
          status: "ended",
          winner_id: winner,
          rewards_distributed: true,
        })
        .eq("id", war.id);
      if (winner) {
        await db.rpc("guild_add_vault", { p_guild: winner, p_amount: 2000 });
        await postSystemMessage(
          db,
          winner,
          "🏆 Your guild won this week's War! +2000 G to the vault."
        );
        const loser = winner === war.guild_a ? war.guild_b : war.guild_a;
        await postSystemMessage(
          db,
          loser,
          "The War has ended. Better luck next week, hunters."
        );
      }
    }
  }
}

export default router;
