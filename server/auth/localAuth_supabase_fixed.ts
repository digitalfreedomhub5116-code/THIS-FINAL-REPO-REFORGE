import express from 'express';
import bcrypt from 'bcrypt';
import { supabaseServer } from '../lib/supabase.js';

const router = express.Router();

const SALT_ROUNDS = 12;

function generateUserId(): string {
  return 'local_' + Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
}

router.post('/register', async (req, res) => {
  console.log('[Auth Register] Request received:', req.body);
  
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

    console.log('[Auth Register] About to check if user exists for username:', username);

    // Check if user exists
    let existingUser, checkError;
    try {
      console.log('[Auth Register] Getting supabase client...');
      const supabaseClient = supabaseServer();
      console.log('[Auth Register] Supabase client obtained:', !!supabaseClient);
      
      const result = await supabaseClient
        .from('players')
        .select('username')
        .eq('username', username)
        .single();
      
      existingUser = result.data;
      checkError = result.error;
      
      console.log('[Auth Register] User check result:', { data: existingUser, error: checkError });
    } catch (err) {
      console.error('[Auth Register] Error checking user existence:', err);
      return res.status(500).json({ error: 'Failed to check user existence' });
    }

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('[Auth Register] Database error during user check:', checkError);
      throw checkError;
    }

    if (existingUser) {
      console.log('[Auth Register] User already exists:', existingUser);
      return res.status(409).json({ error: 'Codename already taken' });
    }

    console.log('[Auth Register] About to hash password');
    // Hash password
    let hashedPassword;
    try {
      hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
      console.log('[Auth Register] Password hashed successfully');
    } catch (err) {
      console.error('[Auth Register] Error hashing password:', err);
      return res.status(500).json({ error: 'Failed to process password' });
    }
    
    // Generate user ID
    const userId = generateUserId();
    console.log('[Auth Register] Generated user ID:', userId);

    console.log('[Auth Register] About to insert user into database:', { userId, username, email });

    // Create user in Supabase
    let insertResult;
    try {
      console.log('[Auth Register] Getting supabase client for insert...');
      const supabaseClient = supabaseServer();
      console.log('[Auth Register] Supabase client for insert:', !!supabaseClient);
      
      insertResult = await supabaseClient
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

      console.log('[Auth Register] Database insert result:', { data: insertResult.data, error: insertResult.error });
    } catch (err) {
      console.error('[Auth Register] Error inserting user:', err);
      return res.status(500).json({ error: 'Registration failed during database insert' });
    }

    if (insertResult.error) {
      console.error('[Auth Register] Database insert error details:', insertResult.error);
      throw insertResult.error;
    }

    console.log('[Auth Register] User created successfully:', insertResult.data);

    // Set session
    try {
      (req.session as any).userId = userId;
      (req.session as any).authType = 'local';
      console.log('[Auth Register] Session set successfully');
    } catch (err) {
      console.error('[Auth Register] Error setting session:', err);
    }

    return res.json({
      message: 'Account created successfully',
      user: {
        id: userId,
        username: username,
        name: username,
        email: email,
        level: 1,
        gold: 100,
        keys: 3
      }
    });
  } catch (err) {
    console.error('[Local Auth Register] Unexpected error:', err);
    return res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Codename and password are required' });
    }

    const { data: user, error } = await (supabaseServer() as any)
      .from('players')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid codename or password' });
    }

    // Type cast the user data
    const userData = user as any;

    if (!userData.password_hash) {
      return res.status(401).json({ error: 'Invalid codename or password' });
    }

    // Check password
    const isValid = await bcrypt.compare(password, userData.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid codename or password' });
    }

    // Set session
    (req.session as any).userId = userData.supabase_id;
    (req.session as any).authType = 'local';

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
      }
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

    return res.json({ user });
  } catch (err) {
    console.error('[Local Auth Whoami]', err);
    return res.status(500).json({ error: 'Failed to get user info' });
  }
});

export default router;
