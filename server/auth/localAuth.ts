import express from 'express';
import bcrypt from 'bcrypt';
import { query } from '../db/pool.js';

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

    const existingUsername = await query(
      `SELECT id FROM users WHERE LOWER(username) = LOWER($1)`,
      [username]
    );
    if (existingUsername.rows.length > 0) {
      return res.status(409).json({ error: 'Codename is already taken' });
    }

    const existingEmail = await query(
      `SELECT id FROM users WHERE LOWER(email) = LOWER($1)`,
      [email]
    );
    if (existingEmail.rows.length > 0) {
      return res.status(409).json({ error: 'Email is already registered' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const userId = generateUserId();

    await query(
      `INSERT INTO users (id, username, email, password_hash, auth_type, first_name)
       VALUES ($1, $2, $3, $4, 'local', $2)`,
      [userId, username, email, passwordHash]
    );

    const userRecord = {
      id: userId,
      email,
      firstName: username,
      lastName: null,
      profileImageUrl: null,
    };

    req.login(userRecord, (err) => {
      if (err) {
        console.error('[LocalAuth] Session error after register:', err);
        return res.status(500).json({ error: 'Session error' });
      }
      return res.json(userRecord);
    });
  } catch (err) {
    console.error('[LocalAuth] Register error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body as {
      identifier?: string;
      password?: string;
    };

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Email/username and password are required' });
    }

    const result = await query(
      `SELECT id, username, email, password_hash, first_name, last_name, profile_image_url
       FROM users
       WHERE (LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($1))
         AND auth_type = 'local'
       LIMIT 1`,
      [identifier]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const row = result.rows[0];
    const match = await bcrypt.compare(password, row.password_hash);

    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const userRecord = {
      id: row.id,
      email: row.email,
      firstName: row.first_name || row.username,
      lastName: row.last_name,
      profileImageUrl: row.profile_image_url,
    };

    req.login(userRecord, (err) => {
      if (err) {
        console.error('[LocalAuth] Session error after login:', err);
        return res.status(500).json({ error: 'Session error' });
      }
      return res.json(userRecord);
    });
  } catch (err) {
    console.error('[LocalAuth] Login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
