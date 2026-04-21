import express from 'express';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { supabaseServer, isSupabaseDown } from '../lib/supabase.js';
import { generatePlayerToken, getAuthenticatedUserId } from '../lib/playerAuth.js';

const router = express.Router();

const SALT_ROUNDS = 12;

function generateUserId(): string {
  return crypto.randomUUID();
}

router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Codename, email, and password are all required' });
    }

    if (username.length < 3 || username.length > 30) {
      return res.status(400).json({ error: 'Codename must be 3–30 characters' });
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.status(400).json({ error: 'Codename can only contain letters, numbers, and underscores' });
    }

    // Normalize email for consistent storage + lookups (prevents dup rows differing by case)
    const normalizedEmail = email.trim().toLowerCase();
    const trimmedUsername = username.trim();

    // ──────────────────────────────────────────────────────────────────────
    // IDEMPOTENT REGISTER RECOVERY
    // Mobile networks (esp. on Railway cold starts) sometimes drop the HTTP
    // response AFTER the server has successfully inserted the user. The client
    // then sees "Connection error" and, on retry, would normally get a 409.
    // Result: account is actually created, but user thinks signup failed and
    // uninstalls the app — this is the #1 cause of the 30% signup-failure
    // complaint.
    //
    // To recover: if the (email + password) combination matches an existing
    // LOCAL account exactly, we treat this retry as a successful login instead
    // of a duplicate-error. This is safe — we only return the session if the
    // password actually verifies.
    // ──────────────────────────────────────────────────────────────────────
    try {
      // Use .ilike() for case-insensitive email match. Paired with the
      // UNIQUE(LOWER(email)) DB index this guarantees at most one row
      // regardless of historical case variation.
      const { data: emailExists } = await (supabaseServer() as any)
        .from('players')
        .select('supabase_id, username, name, email, password_hash, level, gold, keys, auth_type')
        .ilike('email', normalizedEmail)
        .limit(1);
      if (emailExists && emailExists.length > 0) {
        const existing: any = emailExists[0];
        // Only allow recovery for local-auth accounts with a password hash.
        if (existing.password_hash && existing.auth_type === 'local') {
          const pwMatches = await bcrypt.compare(password, existing.password_hash).catch(() => false);
          if (pwMatches) {
            // Skip req.session write — see note on the success path below.
            // JWT is the primary auth mechanism; avoiding the session PG write
            // keeps the response under ~200ms so mobile networks don't drop it.
            const playerToken = generatePlayerToken(existing.supabase_id);
            return res.json({
              message: 'Account already existed — signed in',
              user: {
                id: existing.supabase_id,
                username: existing.username,
                name: existing.name,
                email: existing.email,
                level: existing.level,
                gold: existing.gold,
                keys: existing.keys,
              },
              playerToken,
              recovered: true,
            });
          }
        }
        return res.status(409).json({ error: 'An account with this email already exists. Try signing in instead.' });
      }
    } catch (emailCheckErr) {
      console.error('[Auth Register] Email check error:', emailCheckErr);
      // Continue — username check below will still catch duplicates
    }

    // Check if username is taken — use maybeSingle() so "not found" is not an error
    try {
      const { data: existingUser, error: checkError } = await (supabaseServer() as any)
        .from('players')
        .select('username')
        .eq('username', trimmedUsername)
        .maybeSingle();
      if (checkError) throw checkError;
      if (existingUser) {
        return res.status(409).json({ error: 'Codename already taken' });
      }
    } catch (err) {
      console.error('[Auth Register] Error checking username:', err);
      return res.status(500).json({ error: 'Failed to check user existence' });
    }

    // Hash password
    let hashedPassword;
    try {
      hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    } catch (err) {
      console.error('[Auth Register] Error hashing password:', err);
      return res.status(500).json({ error: 'Failed to process password' });
    }

    const userId = generateUserId();

    // Create user in Supabase
    let insertResult;
    try {
      insertResult = await supabaseServer()
        .from('players')
        .insert({
          supabase_id: userId,
          username: trimmedUsername,
          name: trimmedUsername,
          email: normalizedEmail,
          password_hash: hashedPassword,
          auth_type: 'local',
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
          updated_at: new Date().toISOString()
        } as any)
        .select()
        .single();

    } catch (err) {
      console.error('[Auth Register] Error inserting user:', err);
      return res.status(500).json({ error: 'Registration failed during database insert' });
    }

    if (insertResult.error) {
      console.error('[Auth Register] Supabase insert error:', JSON.stringify(insertResult.error));
      if (isSupabaseDown(insertResult.error)) {
        return res.status(503).json({ error: 'Database temporarily unavailable — please try again in a minute' });
      }
      return res.status(500).json({ error: `Registration failed: ${insertResult.error.message || insertResult.error.code || 'database error'}` });
    }

    // IMPORTANT: We intentionally DO NOT set req.session here.
    // express-session auto-saves on res.end, which blocks the response on a
    // Postgres write to the `session` table (1-5s of added latency on a
    // moderately busy pool). On a flaky mobile network this extra window
    // is enough for the response packet to get dropped — the classic
    // "account created but client sees Connection error" failure mode.
    //
    // The client already receives `playerToken` (JWT) which is the real
    // auth token used by `getAuthenticatedUserId` (see playerAuth.ts — JWT
    // is checked before session). So the session cookie is redundant.
    const playerToken = generatePlayerToken(userId);
    return res.json({
      message: 'Account created successfully',
      user: { id: userId, username: trimmedUsername, name: trimmedUsername, email: normalizedEmail, level: 1, gold: 100, keys: 3 },
      playerToken,
    });
  } catch (err: any) {
    console.error('[Local Auth Register] Unexpected error:', err);
    return res.status(500).json({ error: `Registration failed: ${err?.message || err?.code || 'unknown error'}` });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { identifier, username: legacyUsername, password } = req.body;
    const loginId = (identifier || legacyUsername || '').trim();

    if (!loginId || !password) {
      return res.status(400).json({ error: 'Codename/email and password are required' });
    }

    // Try username first (case-sensitive — usernames are canonical), then email
    // (case-insensitive — users often mis-type the case of their email).
    // Use .order() to prefer rows WITH password_hash (handles legacy duplicates).
    let user = null;

    const { data: byName } = await (supabaseServer() as any)
      .from('players')
      .select('*')
      .eq('username', loginId)
      .order('password_hash', { ascending: false, nullsFirst: false })
      .limit(1);

    if (byName && byName.length > 0) {
      user = byName[0];
    } else {
      // Case-insensitive email lookup via .ilike() with no wildcards.
      // This lets "John@Gmail.com" match a row stored as "john@gmail.com"
      // even for legacy users whose email was written mixed-case before we
      // started normalizing at insert time.
      const normalizedLoginId = loginId.toLowerCase();
      const { data: byEmail } = await (supabaseServer() as any)
        .from('players')
        .select('*')
        .ilike('email', normalizedLoginId)
        .order('password_hash', { ascending: false, nullsFirst: false })
        .limit(1);
      if (byEmail && byEmail.length > 0) user = byEmail[0];
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid codename or password' });
    }

    // Type cast the user data
    const userData = user as any;

    if (!userData.password_hash) {
      return res.status(401).json({ error: 'Invalid codename or password (no hash found)' });
    }

    // Check password
    const isValid = await bcrypt.compare(password, userData.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid codename or password' });
    }

    // Skip req.session write — JWT is the primary auth. See detailed note in
    // the /register handler above.
    const playerToken = generatePlayerToken(userData.supabase_id);
    return res.json({
      message: 'Login successful',
      user: {
        id: userData.supabase_id,
        username: userData.username,
        name: userData.name,
        email: userData.email,
        level: userData.level,
        gold: userData.gold,
        keys: userData.keys
      },
      playerToken,
    });
  } catch (err) {
    console.error('[Local Auth Login]', err);
    return res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('[Local Auth Logout]', err);
    }
    res.json({ message: 'Logged out successfully' });
  });
});

router.get('/me', async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Not logged in' });
    }

    const { data: user, error } = await (supabaseServer() as any)
      .from('players')
      .select('supabase_id, username, name, email, level, gold, keys')
      .eq('supabase_id', userId)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'User not found' });
    }

    return res.json({ user });
  } catch (err) {
    console.error('[Local Auth Me]', err);
    return res.status(500).json({ error: 'Failed to get user info' });
  }
});

router.get('/whoami', async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { data: user, error } = await (supabaseServer() as any)
      .from('players')
      .select('supabase_id, username, name, email, level, gold, keys')
      .eq('supabase_id', userId)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const playerToken = generatePlayerToken(user.supabase_id);
    return res.json({ user, playerToken });
  } catch (err) {
    console.error('[Local Auth Whoami]', err);
    return res.status(500).json({ error: 'Failed to get user info' });
  }
});

export default router;
