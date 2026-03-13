import express from 'express';
import cors from 'cors';
import { json } from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
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
  // Import routes
  const { setupGoogleAuth } = await import('./auth/googleAuth.js');
  const localAuthRouter = await import('./auth/localAuth_supabase_fixed.js');
  const playerRouter = await import('./routes/player_supabase.js');
  const leaderboardRouter = await import('./routes/leaderboard.js');
  const videosRouter = await import('./routes/videos_supabase.js');
  const adminRouter = await import('./routes/admin_supabase.js');
  const nutritionRouter = await import('./routes/nutrition.js');
  const forgeGuardRouter = await import('./routes/forgeguard.js');
  const avatarRouter = await import('./routes/avatar.js');
  const duskRouter = await import('./routes/dusk.js');
  const storeRouter = await import('./routes/store.js');
  const globalConfigRouter = await import('./routes/globalConfig_supabase.js');
  const workoutRouter = await import('./routes/workout.js');
  const systemPactRouter = await import('./routes/systemPact.js');

  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8001;

  // Middleware
  const allowedOrigins = [
    'http://localhost:5000',
    'http://localhost:3000',
    'http://localhost',
    'capacitor://localhost',
    'https://localhost',
  ];
  if (process.env.DEPLOYED_URL) allowedOrigins.push(process.env.DEPLOYED_URL);

  app.use(cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(null, true); // allow all for now — tighten post-launch if needed
    },
    credentials: true
  }));
  app.use(json({ limit: '50mb' }));
  const isProduction = process.env.NODE_ENV === 'production';
  const sessionOptions: Record<string, unknown> = {
    secret: process.env.SESSION_SECRET || 'your-session-secret-here',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: isProduction, // true for HTTPS (Railway), false for HTTP (localhost)
      httpOnly: true,
      sameSite: isProduction ? 'none' : 'lax', // 'none' required for cross-origin on HTTPS
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    }
  };
  if (process.env.DATABASE_URL) {
    const pgPool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
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

  // API routes
  app.use('/api/forge-guard', aiRateLimit, forgeGuardRouter.default);
  app.use('/api/avatar', aiRateLimit, avatarRouter.default);
  app.use('/api/dusk', aiRateLimit, duskRouter.default);
  app.use('/api/player', playerRouter.default);
  app.use('/api/leaderboard', leaderboardRouter.default);
  app.use('/api/videos', videosRouter.default);
  app.use('/api/admin', adminRouter.default);
  app.use('/api/nutrition', aiRateLimit, nutritionRouter.default);
  app.use('/api/store', storeRouter.default);
  app.use('/api/global-config', globalConfigRouter.default);
  app.use('/api/workout', workoutRouter.default);
  app.use('/api/system-pact', systemPactRouter.default);
  app.use('/api/auth/local', localAuthRouter.default);

  // Google OAuth setup
  setupGoogleAuth(app);

  // Static files (if built)
  const distPath = join(__dirname, '../dist');
  if (existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get(/.*/, (_req, res) => {
      res.sendFile(join(distPath, 'index.html'));
    });
  } else {
    app.use((_req, res) => {
      res.status(404).json({ error: 'Not found' });
    });
  }

  // Start server
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] REFORGE API running on http://0.0.0.0:${PORT}`);
  });
}

// Start the server
startServer().catch(console.error);
