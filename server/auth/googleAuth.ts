import type { Express, RequestHandler } from 'express';
import crypto from 'crypto';
import { supabaseServer, isSupabaseDown } from '../lib/supabase.js';
import { generatePlayerToken } from '../lib/playerAuth.js';

// Google token info endpoint — verifies ID tokens without needing a client library
const GOOGLE_TOKEN_INFO_URL = 'https://oauth2.googleapis.com/tokeninfo';

interface GoogleTokenPayload {
  sub: string;       // Google user ID
  email?: string;
  email_verified?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  aud?: string;
}

export async function setupGoogleAuth(app: Express) {
  const webClientId = process.env.VITE_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
  const androidClientId = process.env.GOOGLE_ANDROID_CLIENT_ID || '20910572316-5ofu2hcterdiov6q9f1h2373ddkqnpbg.apps.googleusercontent.com';

  if (!webClientId) {
    console.error('[Auth] No Google Client ID found (VITE_GOOGLE_CLIENT_ID or GOOGLE_CLIENT_ID). Google auth disabled.');
    // Still register endpoint but return helpful error
    app.post('/api/auth/google/token', (_req, res) => {
      res.status(503).json({ error: 'Google auth not configured on server — missing VITE_GOOGLE_CLIENT_ID env var' });
    });
    return;
  }

  // Accept tokens from both web and android client IDs
  const allowedAudiences = new Set([webClientId, androidClientId]);
  console.log('[Auth] Google GIS token endpoint registered. Allowed audiences:', [...allowedAudiences]);

  // ── POST /api/auth/google/token ──
  // Receives { credential } from the frontend Google popup / One-Tap / Native Android
  app.post('/api/auth/google/token', async (req, res) => {
    try {
      const { credential } = req.body;
      if (!credential) {
        return res.status(400).json({ error: 'Missing Google credential token' });
      }

      // Verify the ID token with Google
      const verifyRes = await fetch(`${GOOGLE_TOKEN_INFO_URL}?id_token=${encodeURIComponent(credential)}`);
      if (!verifyRes.ok) {
        const errText = await verifyRes.text().catch(() => '');
        console.error('[Auth Google] Token verification failed:', verifyRes.status, errText);
        let errorMsg = 'Invalid Google token';
        try {
           const parsedErr = JSON.parse(errText);
           if (parsedErr.error_description) {
               errorMsg = `Google Token Error: ${parsedErr.error_description}`;
           }
        } catch(e) {}
        return res.status(401).json({ error: errorMsg });
      }

      const payload: GoogleTokenPayload = await verifyRes.json();

      // Verify audience matches one of our client IDs (web or android)
      if (!payload.aud || !allowedAudiences.has(payload.aud)) {
        console.error('[Auth Google] Token audience mismatch. Got:', payload.aud, 'Allowed:', [...allowedAudiences]);
        return res.status(401).json({ error: `Token audience mismatch: ${payload.aud}` });
      }

      const googleId = payload.sub;
      const email = payload.email || null;
      const name = payload.given_name || payload.name || 'Hunter';
      const picture = payload.picture || null;

      const sb = supabaseServer() as any;

      // 1. Check if a player already exists with this email
      let existingPlayer = null;
      if (email) {
        const { data, error: emailErr } = await sb.from('players').select('*').eq('email', email).single();
        if (emailErr && isSupabaseDown(emailErr)) {
          console.error('[Auth Google] Supabase is down (email lookup):', emailErr.message?.substring(0, 120));
          return res.status(503).json({ error: 'Database temporarily unavailable — please try again in a minute' });
        }
        existingPlayer = data;
      }

      // 2. If not found by email, check by supabase_id (Google ID from previous sign-in)
      if (!existingPlayer) {
        const { data, error: idErr } = await sb.from('players').select('*').eq('supabase_id', googleId).single();
        if (idErr && isSupabaseDown(idErr)) {
          console.error('[Auth Google] Supabase is down (id lookup):', idErr.message?.substring(0, 120));
          return res.status(503).json({ error: 'Database temporarily unavailable — please try again in a minute' });
        }
        existingPlayer = data;
      }

      let userId: string;
      let username: string;

      if (existingPlayer) {
        // Existing user — update profile info
        userId = existingPlayer.supabase_id;
        username = existingPlayer.username;
        await sb.from('players').update({
          avatar_url: picture || existingPlayer.avatar_url,
          name: name || existingPlayer.name,
          auth_type: existingPlayer.auth_type === 'local' ? 'local' : 'google',
          updated_at: new Date().toISOString(),
        }).eq('supabase_id', userId);
      } else {
        // New user — create player
        userId = googleId;
        // Generate unique username from email or Google ID
        const baseUsername = email ? email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_') : `hunter_${googleId.slice(-6)}`;
        // Check uniqueness
        const { data: taken } = await sb.from('players').select('username').eq('username', baseUsername).single();
        username = taken ? `${baseUsername}_${crypto.randomBytes(3).toString('hex')}` : baseUsername;

        const { error: insertError } = await sb.from('players').insert({
          supabase_id: userId,
          username,
          name,
          email,
          auth_type: 'google',
          password_hash: null,
          avatar_url: picture,
          level: 1,
          current_xp: 0,
          required_xp: 100,
          total_xp: 0,
          daily_xp: 0,
          rank: 'E',
          gold: 100,
          keys: 3,
          streak: 0,
          hp: 100,
          max_hp: 100,
          mp: 50,
          max_mp: 50,
          is_configured: false,
          is_penalty_active: false,
          tutorial_step: 0,
          tutorial_complete: false,
          daily_quest_complete: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any);

        if (insertError) {
          console.error('[Auth Google] Insert error:', insertError);
          if (isSupabaseDown(insertError)) {
            return res.status(503).json({ error: 'Database temporarily unavailable — please try again in a minute' });
          }
          return res.status(500).json({ error: `Failed to create account: ${insertError.message || insertError.code || 'database error'}` });
        }
      }

      // Set session — non-fatal if session store fails
      (req as any).session.userId = userId;
      (req as any).session.authType = 'google';
      const playerToken = generatePlayerToken(userId);
      const googlePayload = {
        message: 'Google login successful',
        user: { id: userId, username, name, email, avatar_url: picture },
        playerToken,
      };
      (req as any).session.save((saveErr: any) => {
        if (saveErr) console.error('[Auth Google] Session save error (non-fatal):', saveErr);
        return res.json(googlePayload);
      });
    } catch (err) {
      console.error('[Auth Google] Error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Keep the logout endpoint
  app.get('/api/logout', (req: any, res) => {
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      res.redirect('/');
    });
  });
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  if ((req as any).session?.userId) return next();
  res.status(401).json({ message: 'Unauthorized' });
};
