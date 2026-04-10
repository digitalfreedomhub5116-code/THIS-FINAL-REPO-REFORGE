import express from 'express';
import cors from 'cors';
import { json } from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, readFileSync } from 'fs';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

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
  const storeRouter = await import('./routes/store.js');
  const globalConfigRouter = await import('./routes/globalConfig_supabase.js');
  const workoutRouter = await import('./routes/workout.js');
  const systemPactRouter = await import('./routes/systemPact.js');
  const auditRouter = await import('./routes/audit.js');
  const reportsRouter = await import('./routes/reports.js');

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

  if (process.env.DATABASE_URL) {
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
  app.use('/api/store', generalRateLimit, storeRouter.default);
  app.use('/api/global-config', generalRateLimit, globalConfigRouter.default);
  app.use('/api/workout', generalRateLimit, workoutRouter.default);
  app.use('/api/system-pact', generalRateLimit, systemPactRouter.default);
  app.use('/api/reports', generalRateLimit, reportsRouter.default);
  app.use('/api/audit', generalRateLimit, auditRouter.default);
  app.use('/api/auth/local', generalRateLimit, localAuthRouter.default);

  // Google OAuth setup
  setupGoogleAuth(app);

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

    // ── Midnight Leaderboard Reward Cron ──
    // Checks every 60s if the UTC date has changed. On change, snapshots the
    // top 5 daily XP earners and credits Gold/XP/Keys to their accounts.
    try {
      const { supabaseServer: getDb } = await import('./lib/supabase.js');

      const REWARD_TIERS = [
        { rank: 1, gold: 500, xp: 300, keys: 1 },
        { rank: 2, gold: 300, xp: 200, keys: 0 },
        { rank: 3, gold: 200, xp: 150, keys: 0 },
        { rank: 4, gold: 100, xp: 75,  keys: 0 },
        { rank: 5, gold: 100, xp: 50,  keys: 0 },
      ];

      let lastCronDate = '';

      const runMidnightRewardCron = async () => {
        const now = new Date();
        const todayUTC = now.toISOString().slice(0, 10); // YYYY-MM-DD

        // Only fire once per UTC day
        if (todayUTC === lastCronDate) return;

        // The snapshot is for YESTERDAY's leaderboard
        const yesterday = new Date(now);
        yesterday.setUTCDate(yesterday.getUTCDate() - 1);
        const yesterdayStr = yesterday.toISOString().slice(0, 10);

        // Check if we already have a snapshot for yesterday
        const db = getDb() as any;
        const { data: existing } = await db
          .from('daily_rank_snapshots')
          .select('id')
          .eq('snapshot_date', yesterdayStr)
          .limit(1);

        if (existing && existing.length > 0) {
          // Already snapshotted yesterday — just update the marker
          lastCronDate = todayUTC;
          return;
        }

        console.log(`[Cron] Midnight reward distribution — snapshotting ${yesterdayStr}`);

        // Get top 5 players by daily_xp who synced since yesterday start.
        // We remove the upper-bound filter because players who opened the app
        // early today will have already reset daily_xp to 0 (filtered by gt>0)
        // while players who haven't opened yet still carry yesterday's daily_xp.
        const yesterdayStart = new Date(yesterdayStr + 'T00:00:00Z');

        const { data: topPlayers, error: fetchErr } = await db
          .from('players')
          .select('id, username, name, daily_xp, gold, keys, total_xp')
          .eq('is_banned', false)
          .gte('updated_at', yesterdayStart.toISOString())
          .gt('daily_xp', 0)
          .order('daily_xp', { ascending: false })
          .limit(5);

        if (fetchErr) {
          console.error('[Cron] Failed to fetch top players:', fetchErr);
          return;
        }

        if (!topPlayers || topPlayers.length === 0) {
          console.log('[Cron] No active players yesterday — skipping rewards');
          lastCronDate = todayUTC;
          return;
        }

        console.log(`[Cron] Top ${topPlayers.length} players:`, topPlayers.map((p: any) => `${p.username || p.name}: ${p.daily_xp} XP`));

        // Distribute rewards
        for (let i = 0; i < topPlayers.length; i++) {
          const player = topPlayers[i];
          const tier = REWARD_TIERS[i];
          if (!tier) break;

          // 1. Insert snapshot row
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

          // Rewards are credited when the player claims via /api/leaderboard/rewards/claim
          // (no direct DB credit here to prevent double-counting)
          console.log(`[Cron] Rank #${tier.rank} → ${player.username || player.name}: snapshot created (${tier.gold}G, ${tier.xp}XP, ${tier.keys}K — pending claim)`);
        }

        lastCronDate = todayUTC;
        console.log(`[Cron] Midnight reward distribution complete for ${yesterdayStr}`);
      };

      // Run immediately on startup (catches up if server was down at midnight)
      runMidnightRewardCron().catch(err => console.error('[Cron] Startup run failed:', err));
      // Then check every 60 seconds
      setInterval(() => {
        runMidnightRewardCron().catch(err => console.error('[Cron] Interval run failed:', err));
      }, 60_000);
      console.log('[Server] Midnight reward cron scheduled (checks every 60s)');
    } catch (err) {
      console.warn('[Server] Could not set up midnight reward cron:', err);
    }
  });
}

// Start the server
startServer().catch(console.error);
