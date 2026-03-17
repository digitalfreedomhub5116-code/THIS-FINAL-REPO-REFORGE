import express from 'express';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { supabaseServer, isSupabaseDown } from '../lib/supabase.js';
import { generatePlayerToken } from '../lib/playerAuth.js';

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

    // Check if user exists
    let existingUser, checkError;
    try {
      const result = await supabaseServer()
        .from('players')
        .select('username')
        .eq('username', username)
        .single();
      existingUser = result.data;
      checkError = result.error;
    } catch (err) {
      console.error('[Auth Register] Error checking user existence:', err);
      return res.status(500).json({ error: 'Failed to check user existence' });
    }

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    if (existingUser) {
      return res.status(409).json({ error: 'Codename already taken' });
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
          username: username,
          name: username,
          email: email,
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

    // Set session — non-fatal if session store fails
    (req.session as any).userId = userId;
    (req.session as any).authType = 'local';
    const playerToken = generatePlayerToken(userId);
    const successPayload = {
      message: 'Account created successfully',
      user: { id: userId, username, name: username, email, level: 1, gold: 100, keys: 3 },
      playerToken,
    };
    req.session.save((saveErr) => {
      if (saveErr) console.error('[Auth Register] Session save error (non-fatal):', saveErr);
      return res.json(successPayload);
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

    // Try username first, then email
    // Use .order() to prefer rows WITH password_hash (handles legacy duplicates)
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
      const { data: byEmail } = await (supabaseServer() as any)
        .from('players')
        .select('*')
        .eq('email', loginId)
        .order('password_hash', { ascending: false, nullsFirst: false })
        .limit(1);
      if (byEmail && byEmail.length > 0) user = byEmail[0];
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid codename or password' });
    }

    // Type cast the user data
    const userData = user as any;

    // DEBUG: Log password_hash state to diagnose login failures
    console.log('[Auth Login DEBUG]', {
      username: userData.username,
      hasPasswordHash: !!userData.password_hash,
      hashLength: userData.password_hash?.length,
      hashPrefix: userData.password_hash?.substring(0, 7),
      authType: userData.auth_type,
    });

    if (!userData.password_hash) {
      return res.status(401).json({ error: 'Invalid codename or password (no hash found)' });
    }

    // Check password
    const isValid = await bcrypt.compare(password, userData.password_hash);
    console.log('[Auth Login DEBUG] bcrypt compare result:', isValid);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid codename or password' });
    }

    // Set session — non-fatal if session store fails
    (req.session as any).userId = userData.supabase_id;
    (req.session as any).authType = 'local';
    const playerToken = generatePlayerToken(userData.supabase_id);
    const loginPayload = {
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
    };
    req.session.save((saveErr) => {
      if (saveErr) console.error('[Auth Login] Session save error (non-fatal):', saveErr);
      return res.json(loginPayload);
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
    if (!(req.session as any).userId) {
      return res.status(401).json({ error: 'Not logged in' });
    }

    const { data: user, error } = await (supabaseServer() as any)
      .from('players')
      .select('supabase_id, username, name, email, level, gold, keys')
      .eq('supabase_id', (req.session as any).userId)
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
    if (!(req.session as any).userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { data: user, error } = await (supabaseServer() as any)
      .from('players')
      .select('supabase_id, username, name, email, level, gold, keys')
      .eq('supabase_id', (req.session as any).userId)
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
