import express from 'express';
import cors from 'cors';
import { json } from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import dotenv from 'dotenv';

// Import session using createRequire for ES modules
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const session = require('express-session');

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });
console.log('[Debug] SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('[Debug] VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL);

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

  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8001;

  // Middleware
  app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? false : ['http://localhost:5000', 'http://localhost:3000'],
    credentials: true
  }));
  app.use(json({ limit: '50mb' }));
  app.use(session({
    secret: process.env.SESSION_SECRET || 'your-session-secret-here',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true if using HTTPS
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Test endpoint
  app.get('/api/test', (req, res) => {
    console.log('[Test] Request received from frontend');
    res.json({ message: 'Frontend-backend connection working!' });
  });

  // Debug endpoint for auth testing
  app.get('/api/auth/debug', (req, res) => {
    console.log('[Auth Debug] Request received');
    console.log('[Auth Debug] Session:', req.session);
    console.log('[Auth Debug] Headers:', req.headers);
    res.json({ 
      message: 'Debug endpoint working',
      session: req.session,
      timestamp: new Date().toISOString()
    });
  });

  // Auth routes
  app.get('/auth/google/callback', (req, res) => {
    const primaryDomain = process.env.PRIMARY_DOMAIN;
    const callbackURL = primaryDomain
      ? `https://${primaryDomain}/auth/google/callback`
      : 'http://localhost:5000/auth/google/callback';
    res.json({ callbackURL });
  });

  // Global auth routes
  app.get('/api/auth/whoami', async (req, res) => {
    console.log('[Auth Whoami] Request received');
    console.log('[Auth Whoami] Session data:', req.session);
    console.log('[Auth Whoami] UserId:', (req.session as any).userId);
    
    try {
      if (!(req.session as any).userId) {
        console.log('[Auth Whoami] No userId in session');
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const { supabaseServer } = await import('./lib/supabase.js');
      
      const { data: user, error } = await (supabaseServer() as any)
        .from('players')
        .select('supabase_id, username, name, email, level, gold, keys')
        .eq('supabase_id', (req.session as any).userId)
        .single();

      if (error || !user) {
        console.log('[Auth Whoami] User not found in database');
        return res.status(401).json({ error: 'User not found' });
      }

      console.log('[Auth Whoami] User found:', user);
      return res.json({ user });
    } catch (err) {
      console.error('[Auth Whoami]', err);
      return res.status(500).json({ error: 'Failed to get user info' });
    }
  });

  // API routes
  app.use('/api/forge-guard', forgeGuardRouter.default);
  app.use('/api/avatar', avatarRouter.default);
  app.use('/api/dusk', duskRouter.default);
  app.use('/api/player', playerRouter.default);
  app.use('/api/leaderboard', leaderboardRouter.default);
  app.use('/api/videos', videosRouter.default);
  app.use('/api/admin', adminRouter.default);
  app.use('/api/nutrition', nutritionRouter.default);
  app.use('/api/store', storeRouter.default);
  app.use('/api/global-config', globalConfigRouter.default);
  app.use('/api/workout', workoutRouter.default);
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
  app.listen(PORT, 'localhost', () => {
    console.log(`[Server] REFORGE API running on http://localhost:${PORT}`);
  });
}

// Start the server
startServer().catch(console.error);
