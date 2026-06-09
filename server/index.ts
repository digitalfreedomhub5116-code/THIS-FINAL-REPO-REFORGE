import express from 'express';
import cors from 'cors';
import { json } from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, readFileSync } from 'fs';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import dns from 'dns';

// Force IPv4 DNS resolution — Railway containers don't support IPv6,
// and Supabase direct DB hosts resolve to IPv6 by default.
dns.setDefaultResultOrder('ipv4first');

// Import session using createRequire for ES modules
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { Pool } = require('pg');

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

// Note: Migrations are now handled by Supabase directly
// No need for PostgreSQL migrations since we're using Supabase

async function startServer() {
  // ── Required environment variables — refuse to start if missing ──
  const requiredEnvVars = ['ADMIN_PASSWORD', 'JWT_SECRET'];
  for (const key of requiredEnvVars) {
    if (!process.env[key]) {
      console.error(`\n[FATAL] ${key} environment variable is required. Server cannot start without it.\n`);
      process.exit(1);
    }
  }

  // Import routes
  const { setupGoogleAuth } = await import('./auth/googleAuth.js');
  const localAuthRouter = await import('./auth/localAuth_supabase_fixed.js');
  const playerRouter = await import('./routes/player_supabase.js');
  const leaderboardRouter = await import('./routes/leaderboard.js');
  const videosRouter = await import('./routes/videos_supabase.js');
  const adminRouter = await import('./routes/admin_supabase.js');
  const nutritionRouter = await import('./routes/nutrition.js');
  const forgeGuardRouter = await import('./routes/forgeguard.js');
  const duskRouter = await import('./routes/dusk.js');
  const duskAgentRouter = await import('./routes/duskAgent.js');
  const storeRouter = await import('./routes/store.js');
  const globalConfigRouter = await import('./routes/globalConfig_supabase.js');
  const workoutRouter = await import('./routes/workout.js');
  const systemPactRouter = await import('./routes/systemPact.js');
  const auditRouter = await import('./routes/audit.js');
  const reportsRouter = await import('./routes/reports.js');
  const goalsRouter = await import('./routes/goals.js');
  const scheduleRouter = await import('./routes/schedule.js');
  const questsRouter = await import('./routes/quests_supabase.js');
  const leagueRouter = await import('./routes/league.js');
  const economyRouter = await import('./routes/economy.js');
  const inventoryRouter = await import('./routes/inventory.js');
  const iapRouter = await import('./routes/iap.js');
  const adUnlockRouter = await import('./routes/adUnlock.js');
  const guildsRouter = await import('./routes/guilds.js');

  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8001;

  // Trust Railway's reverse proxy so secure cookies work over HTTPS
  app.set('trust proxy', 1);

  // Middleware
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost',
    'capacitor://localhost',
    'https://localhost',
    'https://this-final-repo-reforge-production-2c30.up.railway.app',
  ];
  if (process.env.DEPLOYED_URL) allowedOrigins.push(process.env.DEPLOYED_URL);

  // Fix COOP header so Google OAuth popup can postMessage back to parent
  app.use((_req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    next();
  });

  app.use(cors({
    origin: (origin, cb) => {
      // Allow requests with no origin (mobile apps, server-to-server, same-origin)
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      console.warn(`[CORS] Blocked request from origin: ${origin}`);
      cb(new Error('Not allowed by CORS'));
    },
    credentials: true
  }));
  app.use(json({ limit: '5mb' }));
  const isProduction = process.env.NODE_ENV === 'production';
  const sessionOptions: any = {
    secret: process.env.SESSION_SECRET || process.env.JWT_SECRET!,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: isProduction,
      httpOnly: true,
      sameSite: isProduction ? 'none' as const : 'lax' as const,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  };

  if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgresql')) {
    const pgPool = new Pool({ connectionString: process.env.DATABASE_URL });
    pgPool.query(`
      CREATE TABLE IF NOT EXISTS session (
        sid varchar NOT NULL COLLATE "default",
        sess json NOT NULL,
        expire timestamp(6) NOT NULL,
        CONSTRAINT session_pkey PRIMARY KEY (sid) NOT DEFERRABLE INITIALLY IMMEDIATE
      ) WITH (OIDS=FALSE);
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON session (expire);
    `).catch((err: unknown) => console.warn('[Server] Session table pre-create skipped:', (err as Error).message));
    sessionOptions.store = new pgSession({ pool: pgPool, tableName: 'session', createTableIfMissing: false });
    console.log('[Server] Session store: PostgreSQL (connect-pg-simple)');
  } else {
    console.warn('[Server] SESSION WARNING: Using MemoryStore — sessions will not survive restarts. Set DATABASE_URL to enable persistent sessions.');
  }
  app.use(session(sessionOptions));

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Deep health check — verifies Supabase DB connectivity
  app.get('/health/deep', async (_req, res) => {
    const results: Record<string, any> = {
      server: 'ok',
      timestamp: new Date().toISOString(),
      env: {
        hasSupabaseUrl: !!(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL),
        hasSupabaseKey: !!(process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY),
        hasJwtSecret: !!process.env.JWT_SECRET,
        hasDatabaseUrl: !!process.env.DATABASE_URL,
      },
    };
    try {
      const { supabaseServer } = await import('./lib/supabase.js');
      const { data, error } = await (supabaseServer() as any).from('players').select('supabase_id').limit(1);
      if (error) {
        results.supabase = 'error';
        results.supabaseError = error.message?.substring(0, 200) || String(error);
      } else {
        results.supabase = 'ok';
        results.playerCount = data?.length ?? 0;
      }
    } catch (err: any) {
      results.supabase = 'unreachable';
      results.supabaseError = err?.message?.substring(0, 200) || 'Unknown error';
    }
    const allOk = results.supabase === 'ok' && results.env.hasSupabaseUrl && results.env.hasSupabaseKey;
    res.status(allOk ? 200 : 503).json(results);
  });

  // Test endpoint
  app.get('/api/test', (_req, res) => {
    res.json({ message: 'Frontend-backend connection working!' });
  });

  // Auth routes
  app.get('/auth/google/callback', (req, res) => {
    const primaryDomain = process.env.PRIMARY_DOMAIN;
    const callbackURL = primaryDomain
      ? `https://${primaryDomain}/auth/google/callback`
      : 'http://localhost:5000/auth/google/callback';
    res.json({ callbackURL });
  });

  // Rate limiter for AI routes — 10 requests per minute per IP
  const aiRateLimit = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: { error: 'Too many requests — please wait a moment before trying again.' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // General API rate limiter — 120 requests per minute per IP
  const generalRateLimit = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    message: { error: 'Rate limit exceeded. Please slow down.' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // API routes
  app.use('/api/forge-guard', aiRateLimit, forgeGuardRouter.default);
  app.use('/api/player', generalRateLimit, playerRouter.default);
  app.use('/api/leaderboard', generalRateLimit, leaderboardRouter.default);
  app.use('/api/videos', generalRateLimit, videosRouter.default);
  app.use('/api/admin', adminRouter.default);
  app.use('/api/nutrition', aiRateLimit, nutritionRouter.default);
  app.use('/api/dusk', aiRateLimit, duskRouter.default);
  app.use('/api/dusk', aiRateLimit, duskAgentRouter.default);
  app.use('/api/store', generalRateLimit, storeRouter.default);
  app.use('/api/global-config', generalRateLimit, globalConfigRouter.default);
  app.use('/api/workout', generalRateLimit, workoutRouter.default);
  app.use('/api/system-pact', generalRateLimit, systemPactRouter.default);
  app.use('/api/reports', generalRateLimit, reportsRouter.default);
  app.use('/api/audit', generalRateLimit, auditRouter.default);
  app.use('/api/goals', aiRateLimit, goalsRouter.default);
  app.use('/api/schedule', aiRateLimit, scheduleRouter.default);
  app.use('/api/quests', generalRateLimit, questsRouter.default);
  app.use('/api/auth/local', generalRateLimit, localAuthRouter.default);
  app.use('/api/league', generalRateLimit, leagueRouter.default);
  app.use('/api/economy', generalRateLimit, economyRouter.default);
  app.use('/api/inventory', generalRateLimit, inventoryRouter.default);
  app.use('/api/iap', generalRateLimit, iapRouter.default);
  app.use('/api/guilds', generalRateLimit, guildsRouter.default);
  // ADS DISABLED — ad-unlock route returns 410 for all endpoints
  app.use('/api/ad-unlock', (_req, res) => {
    res.status(410).json({ error: 'Ad unlock is no longer available.' });
  });

  // Google OAuth setup
  setupGoogleAuth(app);

  // ADS DISABLED — app-ads.txt route removed (AdMob ads no longer served)
  // app.get('/app-ads.txt', (_req, res) => {
  //   res.setHeader('Content-Type', 'text/plain');
  //   res.send('google.com, pub-4155407212794852, DIRECT, f08c47fec0942fa0\n');
  // });

  // Static files (if built)
  const distPath = join(__dirname, '../dist');
  if (existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get(/.*/, (_req, res) => {
      try {
        let html = readFileSync(join(distPath, 'index.html'), 'utf-8');
        // Inject runtime config so VITE_ vars work even if not baked in at build time
        const runtimeConfig = JSON.stringify({
          googleClientId: process.env.VITE_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '',
          supabaseUrl: process.env.VITE_SUPABASE_URL || '',
          supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY || '',
        });
        html = html.replace(
          '</head>',
          `<script>window.__REFORGE_CONFIG__=${runtimeConfig};</script></head>`
        );
        res.setHeader('Content-Type', 'text/html');
        res.send(html);
      } catch {
        res.sendFile(join(distPath, 'index.html'));
      }
    });
  } else {
    app.use((_req, res) => {
      res.status(404).json({ error: 'Not found' });
    });
  }

  // Start server
  app.listen(PORT, '0.0.0.0', async () => {
    console.log(`[Server] REFORGE API running on http://0.0.0.0:${PORT}`);

    // ── Supabase keep-alive ping ──
    // Free-tier Supabase projects auto-pause after 7 days of inactivity.
    // Ping every 4 days to prevent this.
    const PING_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours — prevent free-tier Supabase auto-pause
    try {
      const { pingSupabase } = await import('./lib/supabase.js');
      // Initial ping on startup
      pingSupabase();
      // Schedule periodic pings
      setInterval(() => pingSupabase(), PING_INTERVAL_MS);
      console.log('[Server] Supabase keep-alive ping scheduled (every 6 hours)');
    } catch (err) {
      console.warn('[Server] Could not set up Supabase keep-alive:', err);
    }

    // ── Daily Leaderboard Reward Cron ──
    // Checks every 60s. At UTC midnight, snapshots the
    // top 5 daily XP earners and credits Gold/XP to their accounts,
    // so they can claim rewards when they open the app.
    try {
      const { supabaseServer: getDb } = await import('./lib/supabase.js');

      const REWARD_TIERS = [
        { rank: 1, gold: 500, xp: 300, keys: 0 },
        { rank: 2, gold: 300, xp: 200, keys: 0 },
        { rank: 3, gold: 200, xp: 150, keys: 0 },
        { rank: 4, gold: 100, xp: 75, keys: 0 },
        { rank: 5, gold: 100, xp: 50, keys: 0 },
      ];

      let lastCronDate = '';

      const runDailyRewardCron = async () => {
        const now = new Date();
        const todayStr = now.toISOString().slice(0, 10);

        // Only fire once per day
        if (todayStr === lastCronDate) return;

        // The snapshot is for YESTERDAY's leaderboard
        const yesterday = new Date(now);
        yesterday.setUTCDate(now.getUTCDate() - 1);
        const yesterdayStr = yesterday.toISOString().slice(0, 10);

        const db = getDb() as any;

        // Check if we already snapshotted yesterday
        const { data: existing } = await db
          .from('daily_rank_snapshots')
          .select('id')
          .eq('snapshot_date', yesterdayStr)
          .limit(1);

        if (existing && existing.length > 0) {
          lastCronDate = todayStr;
          return;
        }

        console.log(`[Cron] Daily reward distribution — snapshotting ${yesterdayStr}`);

        // Get top 5 players by daily_xp (yesterday's XP, before today's reset)
        // Note: daily_xp resets at daily reset in /sync, so we need to snapshot
        // BEFORE the reset happens. The cron runs at midnight and /sync resets
        // when lastDailyReset !== todayStr. Since the cron fires first, the
        // daily_xp values are still yesterday's totals.
        const { data: topPlayers, error: fetchErr } = await db
          .from('players')
          .select('id, username, name, daily_xp, gold, keys, total_xp')
          .eq('is_banned', false)
          .gt('daily_xp', 0)
          .order('daily_xp', { ascending: false })
          .limit(5);

        if (fetchErr) {
          console.error('[Cron] Failed to fetch top players:', fetchErr);
          return;
        }

        if (!topPlayers || topPlayers.length === 0) {
          console.log('[Cron] No active players yesterday — skipping rewards');
        } else {
          console.log(`[Cron] Top ${topPlayers.length} players:`, topPlayers.map((p: any) => `${p.username || p.name}: ${p.daily_xp} XP`));

          for (let i = 0; i < topPlayers.length; i++) {
            const player = topPlayers[i];
            const tier = REWARD_TIERS[i];
            if (!tier) break;

            const { error: snapErr } = await db
              .from('daily_rank_snapshots')
              .insert({
                snapshot_date: yesterdayStr,
                rank: tier.rank,
                player_id: player.id,
                username: player.username || player.name,
                daily_xp: player.daily_xp,
                reward_gold: tier.gold,
                reward_xp: tier.xp,
                reward_keys: tier.keys,
                claimed: false,
              });

            if (snapErr) {
              console.error(`[Cron] Failed to insert snapshot for rank ${tier.rank}:`, snapErr);
              continue;
            }

            console.log(`[Cron] Rank #${tier.rank} → ${player.username || player.name}: snapshot created (${tier.gold}G, ${tier.xp}XP — pending claim)`);
          }

          // ── Participation Rewards: everyone with daily_xp > 0 who isn't top 5 ──
          const topPlayerIds = topPlayers.slice(0, 5).map((p: any) => p.id);

          const { data: participants } = await db
            .from('players')
            .select('id, username, name, daily_xp')
            .eq('is_banned', false)
            .gt('daily_xp', 0)
            .order('daily_xp', { ascending: false });

          // Filter out top-5 players (they already got rewards)
          const eligibleParticipants = (participants || []).filter(
            (p: any) => !topPlayerIds.includes(p.id)
          );

          if (eligibleParticipants.length > 0) {
            const participantSnapshots = eligibleParticipants.map((p: any, i: number) => {
              const actualRank = i + 6; // starts after top 5
              const isHunterTier = actualRank <= 10; // ranks 6-10 get more
              return {
                snapshot_date: yesterdayStr,
                rank: actualRank,
                player_id: p.id,
                username: p.username || p.name,
                daily_xp: p.daily_xp,
                reward_gold: isHunterTier ? 50 : 25,
                reward_xp: isHunterTier ? 25 : 0,
                reward_keys: 0,
                claimed: false,
              };
            });

            // Batch insert (Supabase handles arrays)
            const { error: partErr } = await db
              .from('daily_rank_snapshots')
              .insert(participantSnapshots);

            if (partErr) {
              console.error('[Cron] Participation rewards insert error:', partErr);
            } else {
              const hunterCount = eligibleParticipants.filter((_: any, i: number) => i + 6 <= 10).length;
              console.log(`[Cron] Participation rewards: ${hunterCount} hunters (50G), ${eligibleParticipants.length - hunterCount} participants (25G)`);
            }
          }
        }

        // NOTE: daily_xp is reset to 0 by the /sync endpoint's daily reset logic
        // (when lastDailyReset !== todayStr), so we don't need to reset it here.

        // ── League Assignment: finalize yesterday + create new leagues ──
        try {
          const { runLeagueAssignmentCron } = await import('./routes/league.js');
          await runLeagueAssignmentCron(db);
        } catch (leagueErr) {
          console.error('[Cron] League assignment failed:', leagueErr);
        }

        // ── Guild Daily Missions Settlement ──
        try {
          console.log(`[Cron] Settling guild daily missions for ${yesterdayStr}`);
          
          const postGuildSystemMessage = async (dbClient: any, gId: string, msgBody: string) => {
            const { data: row } = await dbClient
              .from('guild_chat')
              .insert({ guild_id: gId, user_id: null, type: 'system', body: msgBody })
              .select('*')
              .single();
            
            if (row) {
              try {
                const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
                const key = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
                if (url && key) {
                  const payload = {
                    id: row.id,
                    guildId: row.guild_id,
                    userId: row.user_id,
                    type: row.type,
                    body: row.body,
                    meta: row.meta || {},
                    createdAt: row.created_at,
                    author: null,
                  };
                  await fetch(`${url}/realtime/v1/api/broadcast`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      apikey: key,
                      Authorization: `Bearer ${key}`,
                    },
                    body: JSON.stringify({
                      messages: [
                        { topic: `guild:${gId}`, event: 'message', payload, private: false },
                      ],
                    }),
                  });
                }
              } catch (err) {
                console.warn('[Cron] Guild chat broadcast failed:', err);
              }
            }
          };

          // 1. Fetch completed missions from yesterday that haven't been distributed
          const { data: missions, error: misErr } = await db
            .from('guild_missions')
            .select('*')
            .eq('date', yesterdayStr)
            .eq('completed', true)
            .eq('rewards_distributed', false);
            
          if (misErr) {
            console.error('[Cron] Failed to fetch yesterday\'s guild missions:', misErr);
          } else if (missions && missions.length > 0) {
            for (const m of missions) {
              const guildId = m.guild_id;
              const reward = m.reward || {};
              const goldReward = reward.gold || 0;
              const xpReward = reward.xp || 0;
              const vaultGold = reward.vault_gold || 0;
              
              console.log(`[Cron] Settle mission ${m.id} for Guild ${guildId}: Individual Gold=${goldReward}, XP=${xpReward}, Vault Gold=${vaultGold}`);
              
              // A. Add gold directly to the Guild Vault
              if (vaultGold > 0) {
                await db.rpc('guild_add_vault', { p_guild: guildId, p_amount: vaultGold });
                // Log vault transaction
                await db.from('guild_vault_transactions').insert({
                  guild_id: guildId,
                  user_id: null,
                  kind: 'donate',
                  amount: vaultGold,
                  item_key: 'daily_mission_settlement',
                });
              }
              
              // B. Fetch all members of this guild
              const { data: members } = await db
                .from('guild_members')
                .select('user_id')
                .eq('guild_id', guildId);
                
              if (members && members.length > 0) {
                // Insert a reward snapshot for each member
                const rewardSnapshots = members.map((mem: any) => ({
                  user_id: mem.user_id,
                  guild_id: guildId,
                  mission_id: m.id,
                  gold: goldReward,
                  xp: xpReward,
                  claimed: false,
                }));
                
                const { error: snapErr } = await db
                  .from('guild_member_rewards')
                  .insert(rewardSnapshots);
                  
                if (snapErr) {
                  console.error(`[Cron] Failed to insert member rewards for guild ${guildId}:`, snapErr);
                }
              }
              
              // C. Post chat announcement
              const chatMsg = `🎉 Daily Mission Completed: "${m.title}"! Members can now claim their rewards (+${goldReward} G, +${xpReward} XP) from the Mission tab. +${vaultGold} G added to the Guild Vault.`;
              await postGuildSystemMessage(db, guildId, chatMsg);
              
              // D. Mark rewards as distributed
              await db
                .from('guild_missions')
                .update({ rewards_distributed: true })
                .eq('id', m.id);
            }
          }
          
          // 2. Clean up expired rewards older than 7 days
          const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
          const { error: cleanErr } = await db
            .from('guild_member_rewards')
            .delete()
            .eq('claimed', false)
            .lt('created_at', sevenDaysAgo);
            
          if (cleanErr) {
            console.error('[Cron] Failed to clean up expired guild rewards:', cleanErr);
          } else {
            console.log('[Cron] Cleaned up expired guild rewards successfully');
          }
        } catch (guildCronErr) {
          console.error('[Cron] Guild daily mission settlement failed:', guildCronErr);
        }

        lastCronDate = todayStr;
        console.log(`[Cron] Daily reward distribution + guild daily missions settlement + league assignment complete for ${yesterdayStr}`);
      };

      // Run immediately on startup (catches up if server was down at midnight)
      runDailyRewardCron().catch(err => console.error('[Cron] Startup run failed:', err));
      // Then check every 60 seconds
      setInterval(() => {
        runDailyRewardCron().catch(err => console.error('[Cron] Interval run failed:', err));
      }, 60_000);
      console.log('[Server] Daily reward cron scheduled (checks every 60s)');
    } catch (err) {
      console.warn('[Server] Could not set up weekly reward cron:', err);
    }

    // ── Bot Simulation Cron ──
    // Simulates 7 dummy players daily: XP, streak, border changes, level/rank.
    // Idempotent — each bot skips if already simulated today.
    try {
      const { runBotSimulation } = await import('./lib/botSimulation.js');

      // Run on startup (after 5s delay to let DB connections settle)
      setTimeout(() => {
        runBotSimulation().catch(err => console.error('[BotSim] Startup run failed:', err));
      }, 5000);

      // Then check every 60 seconds (bots that already ran today will skip)
      setInterval(() => {
        runBotSimulation().catch(err => console.error('[BotSim] Interval run failed:', err));
      }, 60_000);

      console.log('[Server] Bot simulation scheduled (checks every 60s)');
    } catch (err) {
      console.warn('[Server] Could not set up bot simulation:', err);
    }

    // ── Guild War Cron ──
    // Thursday: create weekly matchups. Sunday: settle wars + distribute rewards.
    // Idempotent — runs guarded inside runGuildWarCron, checked once per day.
    try {
      const { runGuildWarCron } = await import('./routes/guilds.js');
      const { supabaseServer } = await import('./lib/supabase.js');
      let lastWarCronDate = '';
      const tickWarCron = async () => {
        const today = new Date().toISOString().slice(0, 10);
        if (today === lastWarCronDate) return;
        lastWarCronDate = today;
        await runGuildWarCron(supabaseServer() as any);
      };
      setTimeout(() => { tickWarCron().catch(err => console.error('[GuildWar] Startup run failed:', err)); }, 8000);
      setInterval(() => { tickWarCron().catch(err => console.error('[GuildWar] Interval run failed:', err)); }, 60_000);
      console.log('[Server] Guild war cron scheduled (checks every 60s)');
    } catch (err) {
      console.warn('[Server] Could not set up guild war cron:', err);
    }
  });
}

// Start the server
startServer().catch(console.error);
