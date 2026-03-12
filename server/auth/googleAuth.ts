import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import type { Express, RequestHandler } from 'express';
import { supabaseServer } from '../lib/supabase.js';

export async function setupGoogleAuth(app: Express) {
  app.set('trust proxy', 1);
  // Session middleware is already configured in index.ts — no duplicate needed
  app.use(passport.initialize());
  app.use(passport.session());

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.error('[Auth] GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing');
    return;
  }

  // Build full callback URL — must match what is registered in Google Cloud Console
  // Uses REPLIT_DOMAINS in production; falls back to localhost:5000 for dev (Vite port)
  const primaryDomain = (process.env.REPLIT_DOMAINS || '').split(',')[0].trim();
  const callbackURL = primaryDomain
    ? `https://${primaryDomain}/auth/google/callback`
    : 'http://localhost:5000/auth/google/callback';

  console.log(`[Auth] Google OAuth callback URL: ${callbackURL}`);

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL,
        proxy: true,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const googleId = profile.id;
          const email = profile.emails?.[0]?.value ?? null;
          const firstName = profile.name?.givenName ?? null;
          const lastName = profile.name?.familyName ?? null;
          const profileImageUrl = profile.photos?.[0]?.value ?? null;

          // Check if player already exists with this email
          const sb = supabaseServer() as any;
          const { data: existing } = email
            ? await sb.from('players').select('supabase_id').eq('email', email).single()
            : { data: null };

          if (existing) {
            // Merge: update the existing account's profile info
            await sb.from('players').update({
              name: firstName || existing.name,
              avatar_url: profileImageUrl,
              updated_at: new Date().toISOString(),
            }).eq('supabase_id', existing.supabase_id);
            done(null, { id: existing.supabase_id, email, firstName, lastName, profileImageUrl });
          } else {
            // No existing account — insert new player keyed by Google ID
            await sb.from('players').upsert({
              supabase_id: googleId,
              username: email?.split('@')[0] || googleId,
              name: firstName || 'Hunter',
              email,
              auth_type: 'google',
              avatar_url: profileImageUrl,
              level: 1, current_xp: 0, required_xp: 100, total_xp: 0,
              rank: 'E', gold: 100, keys: 3, streak: 0,
              hp: 100, max_hp: 100, mp: 50, max_mp: 50,
              is_configured: false, tutorial_step: 0, tutorial_complete: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
            done(null, { id: googleId, email, firstName, lastName, profileImageUrl });
          }
        } catch (err) {
          done(err as Error);
        }
      }
    )
  );

  passport.serializeUser((user, done) => done(null, user));
  passport.deserializeUser((user: Express.User, done) => done(null, user));

  app.get(
    '/api/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
  );

  app.get(
    '/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/?auth=failed' }),
    (_req, res) => res.redirect('/')
  );

  app.get('/api/logout', (req, res) => {
    req.logout(() => res.redirect('/'));
  });
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ message: 'Unauthorized' });
};
