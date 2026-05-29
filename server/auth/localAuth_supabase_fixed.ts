import express from 'express';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { supabaseServer, isSupabaseDown } from '../lib/supabase.js';
import { generatePlayerToken, getAuthenticatedUserId } from '../lib/playerAuth.js';
import { generateOtp, storeOtp, sendOtpEmail, verifyOtp, sendPasswordResetEmail } from '../lib/otp.js';

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

    const normalizedEmail = email.trim().toLowerCase();
    const trimmedUsername = username.trim();

    // ── Check if email already exists as a verified account ──
    try {
      const { data: emailExists } = await (supabaseServer() as any)
        .from('players')
        .select('supabase_id, username, name, email, password_hash, level, gold, keys, auth_type')
        .ilike('email', normalizedEmail)
        .limit(1);
      if (emailExists && emailExists.length > 0) {
        const existing: any = emailExists[0];
        // Idempotent recovery: if same password, sign them in
        if (existing.password_hash && existing.auth_type === 'local') {
          const pwMatches = await bcrypt.compare(password, existing.password_hash).catch(() => false);
          if (pwMatches) {
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
    }

    // ── Check if username is taken (in verified accounts) ──
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

    // ── Hash password ──
    let hashedPassword;
    try {
      hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    } catch (err) {
      console.error('[Auth Register] Error hashing password:', err);
      return res.status(500).json({ error: 'Failed to process password' });
    }

    // ── Store as pending signup (upsert — if they re-register before verifying, update the entry) ──
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min

    // Delete any existing pending signup for this email or username
    await (supabaseServer() as any).from('pending_signups').delete().eq('email', normalizedEmail);
    await (supabaseServer() as any).from('pending_signups').delete().eq('username', trimmedUsername);

    const { error: pendingError } = await (supabaseServer() as any)
      .from('pending_signups')
      .insert({
        email: normalizedEmail,
        username: trimmedUsername,
        password_hash: hashedPassword,
        expires_at: expiresAt,
      });

    if (pendingError) {
      console.error('[Auth Register] Failed to store pending signup:', pendingError);
      return res.status(500).json({ error: 'Registration failed — please try again' });
    }

    // ── Generate and send OTP ──
    try {
      const otp = generateOtp();
      await storeOtp(normalizedEmail, otp);
      await sendOtpEmail(normalizedEmail, otp, trimmedUsername);
    } catch (otpErr: any) {
      console.error('[Auth Register] OTP error:', otpErr);
      return res.status(500).json({ error: 'Failed to send verification email. Please try again.' });
    }

    return res.json({
      message: 'Verification code sent to your email',
      otpRequired: true,
      email: normalizedEmail,
    });

  } catch (err: any) {
    console.error('[Local Auth Register] Unexpected error:', err);
    return res.status(500).json({ error: `Registration failed: ${err?.message || err?.code || 'unknown error'}` });
  }
});

// ── VERIFY OTP & COMPLETE REGISTRATION ──
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and verification code are required' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // ── Verify OTP ──
    const result = await verifyOtp(normalizedEmail, otp);
    if (!result.valid) {
      return res.status(400).json({ error: result.error || 'Invalid verification code' });
    }

    // ── Fetch pending signup ──
    const { data: pending, error: fetchError } = await (supabaseServer() as any)
      .from('pending_signups')
      .select('*')
      .eq('email', normalizedEmail)
      .single();

    if (fetchError || !pending) {
      return res.status(400).json({ error: 'No pending registration found. Please start over.' });
    }

    // Check if pending signup expired
    if (new Date(pending.expires_at) < new Date()) {
      await (supabaseServer() as any).from('pending_signups').delete().eq('email', normalizedEmail);
      return res.status(400).json({ error: 'Registration expired. Please sign up again.' });
    }

    // ── Create the actual user account ──
    const userId = crypto.randomUUID();

    const { error: insertError } = await supabaseServer()
      .from('players')
      .insert({
        supabase_id: userId,
        username: pending.username,
        name: pending.username,
        email: normalizedEmail,
        password_hash: pending.password_hash,
        auth_type: 'local',
        level: 1,
        current_xp: 0,
        required_xp: 100,
        total_xp: 0,
        daily_xp: 0,
        rank: 'E',
        gold: 600,
        keys: 10,
        streak: 1,
        hp: 100,
        max_hp: 100,
        mp: 50,
        max_mp: 50,
        is_configured: false,
        is_penalty_active: false,
        tutorial_step: 0,
        tutorial_complete: false,
        daily_quest_complete: false,
        last_daily_reset: new Date().toISOString().split('T')[0],
        last_login_date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any);

    if (insertError) {
      console.error('[Auth Verify-OTP] Insert error:', insertError);
      return res.status(500).json({ error: 'Failed to create account. Please try again.' });
    }

    // ── Clean up pending signup ──
    await (supabaseServer() as any).from('pending_signups').delete().eq('email', normalizedEmail);

    // ── Return session ──
    const playerToken = generatePlayerToken(userId);
    return res.json({
      message: 'Email verified — account created successfully',
      verified: true,
      user: {
        id: userId,
        username: pending.username,
        name: pending.username,
        email: normalizedEmail,
        level: 1,
        gold: 600,
        keys: 10,
      },
      playerToken,
    });

  } catch (err: any) {
    console.error('[Auth Verify-OTP] Unexpected error:', err);
    return res.status(500).json({ error: `Verification failed: ${err?.message || 'unknown error'}` });
  }
});

// ── RESEND OTP ──
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check pending signup exists
    const { data: pending } = await (supabaseServer() as any)
      .from('pending_signups')
      .select('username, expires_at')
      .eq('email', normalizedEmail)
      .single();

    if (!pending) {
      return res.status(400).json({ error: 'No pending registration found. Please start over.' });
    }

    if (new Date(pending.expires_at) < new Date()) {
      await (supabaseServer() as any).from('pending_signups').delete().eq('email', normalizedEmail);
      return res.status(400).json({ error: 'Registration expired. Please sign up again.' });
    }

    // Generate and send new OTP
    const otp = generateOtp();
    await storeOtp(normalizedEmail, otp);
    await sendOtpEmail(normalizedEmail, otp, pending.username);

    return res.json({ message: 'New verification code sent', otpRequired: true });

  } catch (err: any) {
    console.error('[Auth Resend-OTP] Error:', err);
    return res.status(500).json({ error: 'Failed to resend code. Please try again.' });
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

// ── FORGOT PASSWORD — Step 1: Send OTP ──
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user exists with this email and has a local password
    const { data: users } = await (supabaseServer() as any)
      .from('players')
      .select('supabase_id, username, email, password_hash, auth_type')
      .ilike('email', normalizedEmail)
      .limit(1);

    if (!users || users.length === 0) {
      // Don't reveal whether the email exists — always say "sent"
      return res.json({ message: 'If an account exists with that email, a reset code has been sent.', otpSent: true });
    }

    const user = users[0] as any;

    // If they signed up with Google only (no password_hash), tell them
    if (user.auth_type === 'google' && !user.password_hash) {
      return res.status(400).json({ error: 'This account uses Google sign-in. Please sign in with Google instead.' });
    }

    // Generate and send OTP
    const otp = generateOtp();
    await storeOtp(normalizedEmail, otp);
    await sendPasswordResetEmail(normalizedEmail, otp);

    return res.json({ message: 'Reset code sent to your email', otpSent: true });

  } catch (err: any) {
    console.error('[Auth Forgot-Password] Error:', err);
    return res.status(500).json({ error: 'Failed to send reset code. Please try again.' });
  }
});

// ── FORGOT PASSWORD — Step 2: Verify OTP & issue reset token ──
router.post('/forgot-password/verify', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and verification code are required' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Verify the OTP
    const result = await verifyOtp(normalizedEmail, otp);
    if (!result.valid) {
      return res.status(400).json({ error: result.error || 'Invalid verification code' });
    }

    // OTP is valid — generate a short-lived reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

    // Store the reset token hash in the players table (add columns or use a separate approach)
    // We'll use the email_otps table with a special prefix to avoid needing schema changes
    await (supabaseServer() as any)
      .from('email_otps')
      .delete()
      .eq('email', `reset:${normalizedEmail}`);

    await (supabaseServer() as any)
      .from('email_otps')
      .insert({
        email: `reset:${normalizedEmail}`,
        otp_hash: resetTokenHash,
        expires_at: expiresAt,
        attempts: 0,
      });

    return res.json({ message: 'Code verified. You can now set a new password.', verified: true, resetToken });

  } catch (err: any) {
    console.error('[Auth Forgot-Password Verify] Error:', err);
    return res.status(500).json({ error: 'Verification failed. Please try again.' });
  }
});

// ── FORGOT PASSWORD — Step 3: Reset password with token ──
router.post('/forgot-password/reset', async (req, res) => {
  try {
    const { email, resetToken, newPassword } = req.body;
    if (!email || !resetToken || !newPassword) {
      return res.status(400).json({ error: 'Email, reset token, and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Validate the reset token
    const { data: tokenRecord, error: fetchError } = await (supabaseServer() as any)
      .from('email_otps')
      .select('*')
      .eq('email', `reset:${normalizedEmail}`)
      .single();

    if (fetchError || !tokenRecord) {
      return res.status(400).json({ error: 'Invalid or expired reset session. Please start over.' });
    }

    if (new Date(tokenRecord.expires_at) < new Date()) {
      await (supabaseServer() as any).from('email_otps').delete().eq('email', `reset:${normalizedEmail}`);
      return res.status(400).json({ error: 'Reset session expired. Please start over.' });
    }

    if (tokenRecord.otp_hash !== resetTokenHash) {
      return res.status(400).json({ error: 'Invalid reset token. Please start over.' });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // Update the player's password
    const { error: updateError } = await (supabaseServer() as any)
      .from('players')
      .update({ password_hash: hashedPassword, updated_at: new Date().toISOString() })
      .ilike('email', normalizedEmail);

    if (updateError) {
      console.error('[Auth Forgot-Password Reset] Update error:', updateError);
      return res.status(500).json({ error: 'Failed to update password. Please try again.' });
    }

    // Clean up the reset token
    await (supabaseServer() as any).from('email_otps').delete().eq('email', `reset:${normalizedEmail}`);

    return res.json({ message: 'Password updated successfully. You can now sign in.', success: true });

  } catch (err: any) {
    console.error('[Auth Forgot-Password Reset] Error:', err);
    return res.status(500).json({ error: 'Password reset failed. Please try again.' });
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

// ── REFRESH TOKEN — Cookie-free token renewal for native apps ──
// Accepts a valid (but potentially near-expiry) JWT and returns a fresh one.
// This replaces the session-cookie-dependent whoami refresh for Android WebView.
router.post('/refresh-token', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing Authorization header' });
    }
    const token = authHeader.slice(7);
    const userId = verifyPlayerToken(token);
    if (!userId) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Verify user still exists in DB
    const { data: user, error } = await (supabaseServer() as any)
      .from('players')
      .select('supabase_id, username, name, email, level, gold, keys')
      .eq('supabase_id', userId)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Issue fresh token
    const playerToken = generatePlayerToken(user.supabase_id);
    return res.json({ user, playerToken });
  } catch (err) {
    console.error('[Local Auth Refresh]', err);
    return res.status(500).json({ error: 'Token refresh failed' });
  }
});

export default router;
