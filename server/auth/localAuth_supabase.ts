import express from 'express';
import bcrypt from 'bcrypt';
import { supabaseServer } from '../lib/supabase.js';

const router = express.Router();

const SALT_ROUNDS = 12;

function generateUserId(): string {
  return 'local_' + Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
}

router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body as {
      username?: string;
      email?: string;
      password?: string;
    };

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Codename, email, and password are all required' });
    }

    if (username.length < 3 || username.length > 30) {
      return res.status(400).json({ error: 'Codename must be 3–30 characters' });
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.status(400).json({ error: 'Codename can only contain letters, numbers, and underscores' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if username already exists
    const { data: existingUser, error: checkError } = await supabaseServer()
      .from('players')
      .select('username')
      .eq('username', username)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    if (existingUser) {
      return res.status(409).json({ error: 'Codename already taken' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    
    // Generate user ID
    const userId = generateUserId();

    // Create user in Supabase
    const playerData = {
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
    };

    const { data, error } = await supabaseServer.from('players').insert(playerData).select().single();
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
      })
      .select()
      .single();

    if (error) throw error;

    // Set session
    req.session.userId = userId;
    req.session.authType = 'local';

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
    console.error('[Local Auth Register]', err);
    return res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body as {
      username?: string;
      password?: string;
    };

    if (!username || !password) {
      return res.status(400).json({ error: 'Codename and password are required' });
    }

    // Find user by username
    const { data: user, error } = await supabaseServer()
      .from('players')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid codename or password' });
    }

    if (!user.password_hash) {
      return res.status(401).json({ error: 'Invalid codename or password' });
    }

    // Check password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid codename or password' });
    }

    // Set session
    req.session.userId = user.supabase_id;
    req.session.authType = 'local';

    return res.json({
      message: 'Login successful',
      user: {
        id: user.supabase_id,
        username: user.username,
        name: user.name,
        email: user.email,
        level: user.level,
        gold: user.gold,
        keys: user.keys
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
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not logged in' });
    }

    const { data: user, error } = await supabaseServer()
      .from('players')
      .select('supabase_id, username, name, email, level, gold, keys')
      .eq('supabase_id', req.session.userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ user });
  } catch (err) {
    console.error('[Local Auth Me]', err);
    return res.status(500).json({ error: 'Failed to get user info' });
  }
});

export default router;
