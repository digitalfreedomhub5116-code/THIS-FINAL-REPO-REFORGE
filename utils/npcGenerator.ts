/**
 * NPC Generator for Leaderboard
 * 
 * Generates deterministic, per-user, per-week NPC players that look
 * indistinguishable from real players. Uses a seeded PRNG so the same
 * user always sees the same NPCs within a given week.
 * 
 * Zero server load — pure client-side math.
 */

// ── Seeded PRNG (Mulberry32) ──
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Simple string hash ──
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash);
}

// ── Get current ISO week number ──
function getWeekNumber(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / (7 * 24 * 60 * 60 * 1000));
}

// ── Get day of year (0-365) ──
function getDayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / (24 * 60 * 60 * 1000));
}

// ═══════════════════════════════════════════════════════════════
//  REALISTIC NAME POOL
//  Mix of Indian names with realistic username formatting
// ═══════════════════════════════════════════════════════════════
const FIRST_NAMES = [
  'Arjun', 'Priya', 'Rahul', 'Sneha', 'Aditya', 'Ananya', 'Vikram', 'Meera',
  'Rohan', 'Kavya', 'Aarav', 'Ishaan', 'Diya', 'Arnav', 'Sara', 'Dev',
  'Nisha', 'Karan', 'Riya', 'Varun', 'Yash', 'Shruti', 'Aakash', 'Pooja',
  'Siddharth', 'Tanvi', 'Nikhil', 'Anjali', 'Harsh', 'Simran', 'Ritik',
  'Neha', 'Abhishek', 'Kiara', 'Manish', 'Tanya', 'Rajat', 'Divya',
  'Gaurav', 'Khushi', 'Kunal', 'Sakshi', 'Akash', 'Isha', 'Deepak',
  'Palak', 'Mohit', 'Kritika', 'Avni', 'Vivek', 'Trisha', 'Saurav',
  'Mahi', 'Tushar', 'Bhavya', 'Pranav', 'Aisha', 'Rohit', 'Navya',
  'Parth', 'Zara', 'Kabir', 'Swati', 'Ayush', 'Nikita', 'Shivam',
  'Sanya', 'Raghav', 'Esha', 'Kartik', 'Pihu', 'Vishal', 'Jiya',
  'Ankit', 'Tamanna', 'Sahil', 'Kriti', 'Dhruv', 'Myra',
];

const LAST_INITIALS = [
  'S', 'K', 'R', 'M', 'P', 'D', 'V', 'G', 'T', 'A', 'N', 'B', 'J', 'C', 'L',
];

// Available borders that NPCs can equip (must match IDs in storeItems.ts)
const NPC_BORDER_POOL = [
  'border-ice-img',
  'border-dragon-img',
  'border-podium-silver',
  'border-gold-dragon',
  'border-phoenix',
  'border-streak-gold',
];

// ── Generate a realistic username from the name pool ──
function generateUsername(rng: () => number, nameIndex: number): string {
  const firstName = FIRST_NAMES[nameIndex % FIRST_NAMES.length];
  const lastInit = LAST_INITIALS[Math.floor(rng() * LAST_INITIALS.length)];
  const style = Math.floor(rng() * 8);

  switch (style) {
    case 0: return `${firstName.toLowerCase()}.${lastInit.toLowerCase()}`; // arjun.s
    case 1: return `${firstName}${lastInit}`; // ArjunS
    case 2: return `${firstName.toLowerCase()}_${Math.floor(rng() * 90 + 10)}`; // arjun_23
    case 3: return `${firstName}.${lastInit}`; // Arjun.S
    case 4: return `${firstName}${Math.floor(rng() * 900 + 100)}`; // Arjun456
    case 5: return `${firstName.toLowerCase()}${lastInit.toLowerCase()}`; // arjuns
    case 6: return `${firstName}_${lastInit}`; // Arjun_S
    case 7: return `${firstName.charAt(0).toLowerCase()}${firstName.slice(1)}${Math.floor(rng() * 9 + 1)}${Math.floor(rng() * 9)}`; // arjun42
    default: return `${firstName}${lastInit}`;
  }
}

// ═══════════════════════════════════════════════════════════════
//  MAIN GENERATOR
// ═══════════════════════════════════════════════════════════════

export interface NPCEntry {
  player_id: string;
  supabase_id: string;
  username: string;
  name: string;
  total_xp: number;
  daily_xp: number;
  weekly_xp: number;
  level: number;
  rank: string;
  streak: number;
  avatar_url: null;
  equipped_outfit_id: string;
  equipped_border: string | null;
  equipped_banner: string | null;
  isNPC: true;
}

function computeRank(level: number): string {
  if (level >= 80) return 'S';
  if (level >= 55) return 'A';
  if (level >= 39) return 'B';
  if (level >= 27) return 'C';
  if (level >= 11) return 'D';
  return 'E';
}

/**
 * Generate NPCs for a specific user for the current week.
 * Returns 8 NPCs with realistic, naturally-growing stats.
 * 
 * Each NPC has a seeded "join date" and their stats grow
 * organically from that date — level, XP, and streak all
 * look like a real player who's been using the app for weeks.
 */
export function generateNPCsForUser(userId: string, count = 8): NPCEntry[] {
  const weekNum = getWeekNumber();
  const dayOfYear = getDayOfYear();
  const seed = hashString(`${userId}-week-${weekNum}-npc-league`);
  const rng = mulberry32(seed);

  // Shuffle name indices so each user gets different names
  const nameIndices: number[] = [];
  const available = Array.from({ length: FIRST_NAMES.length }, (_, i) => i);
  for (let i = 0; i < count && available.length > 0; i++) {
    const idx = Math.floor(rng() * available.length);
    nameIndices.push(available[idx]);
    available.splice(idx, 1);
  }

  const npcs: NPCEntry[] = [];

  for (let i = 0; i < count; i++) {
    const npcSeed = hashString(`${userId}-${weekNum}-npc-${i}`);
    const npcRng = mulberry32(npcSeed);

    const username = generateUsername(npcRng, nameIndices[i]);

    // ── "Join date": how many days ago this NPC "joined" (10-200 days) ──
    const daysActive = Math.floor(npcRng() * 190) + 10;

    // ── Avg daily XP this NPC earns: 300-600 ──
    const avgDailyXp = Math.floor(npcRng() * 301) + 300;

    // ── Total XP: accumulates naturally from join date ──
    // Not every day is active — ~70-85% active rate
    const activeRate = 0.7 + npcRng() * 0.15;
    const activeDays = Math.floor(daysActive * activeRate);
    const totalXp = activeDays * avgDailyXp + Math.floor(npcRng() * 2000);

    // ── Level: derived from total XP (realistic growth) ──
    // ~800 XP per level on average (matches the game's curve)
    const baseLevel = Math.floor(totalXp / 800);
    const level = Math.min(Math.max(baseLevel, 1), 99);

    // ── Daily XP: today's XP with variation ──
    const todayVariation = mulberry32(
      hashString(`${userId}-${weekNum}-${i}-day-${dayOfYear}`)
    )();
    const dailyXp = Math.floor(avgDailyXp * (0.7 + todayVariation * 0.6)); // ±30% of avg

    // ── Streak: natural build-up + periodic break ──
    // Each NPC has a break interval (7-10 days) and a "last break" anchor
    const breakInterval = 7 + Math.floor(npcRng() * 4); // 7, 8, 9, or 10
    const breakOffset = Math.floor(npcRng() * breakInterval); // stagger break days
    const dayInCycle = (dayOfYear + breakOffset) % breakInterval;
    let streak: number;
    if (dayInCycle === 0) {
      // Break day — streak just broke today
      streak = 0;
    } else {
      // Streak is building: 1, 2, 3, 4, ...
      streak = dayInCycle;
    }
    // Cap streak to not exceed days active
    streak = Math.min(streak, daysActive);

    // ── Border: higher level NPCs more likely to have borders ──
    let border: string | null = null;
    const borderChance = level > 30 ? 0.5 : level > 15 ? 0.3 : 0.15;
    if (npcRng() < borderChance) {
      const borderIdx = Math.floor(npcRng() * NPC_BORDER_POOL.length);
      border = NPC_BORDER_POOL[borderIdx] || null;
    }

    npcs.push({
      player_id: `npc-${userId.slice(0, 8)}-${i}`,
      supabase_id: `npc-${userId.slice(0, 8)}-${i}`,
      username,
      name: username,
      total_xp: totalXp,
      daily_xp: dailyXp,
      weekly_xp: dailyXp,
      level,
      rank: computeRank(level),
      streak,
      avatar_url: null,
      equipped_outfit_id: 'outfit_starter',
      equipped_border: border,
      equipped_banner: null,
      isNPC: true,
    });
  }

  return npcs;
}
