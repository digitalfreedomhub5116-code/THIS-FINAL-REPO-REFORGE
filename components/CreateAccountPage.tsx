import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { PlayerData, ReplitUser } from '../types';
import { API_BASE, fetchWithRetry, checkServerHealth } from '../lib/apiConfig';
import { saveAuthNative } from '../lib/nativeAuth';
import { isNativePlatform } from '../lib/googleAuth';
import NativeGoogleButton from './NativeGoogleButton';
import { shuffleFacts } from '../lib/funFacts';

interface CreateAccountPageProps {
  onLogin: (profile: Partial<PlayerData> & { replitUser?: ReplitUser }) => void;
  onNavigate?: (dest: 'AUTH_SIGN_IN_PAGE' | 'AUTH_CREATE_PAGE') => void;
}

const CreateAccountPage: React.FC<CreateAccountPageProps> = ({ onLogin, onNavigate }) => {
  const [checking, setChecking] = useState(true);
  const [serverWaking, setServerWaking] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ── OTP VERIFICATION STATE ──
  const [otpMode, setOtpMode] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
    };
  }, []);

  // Fun facts cycling
  const shuffledFacts = useRef(shuffleFacts());
  const [factIndex, setFactIndex] = useState(0);
  useEffect(() => {
    if (!serverWaking && !loading && !otpVerifying) return;
    const interval = setInterval(() => {
      setFactIndex(i => (i + 1) % shuffledFacts.current.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [serverWaking, loading, otpVerifying]);

  const [particles] = useState(() =>
    Array.from({ length: 18 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 1.5 + 0.5,
      delay: Math.random() * 4,
      dur: Math.random() * 3 + 3,
    }))
  );

  useEffect(() => {
    const checkSession = async () => {
      // Skip auto-login if user just logged out (session may still be alive briefly)
      if (sessionStorage.getItem('reforge_logout_pending')) {
        setChecking(false);
        return;
      }
      // Pre-check server reachability (Railway cold starts can take 15-30s)
      const healthy = await checkServerHealth();
      if (!healthy) {
        setServerWaking(true);
        let woke = false;
        for (let i = 0; i < 6; i++) {
          await new Promise(r => setTimeout(r, 3000));
          if (await checkServerHealth()) { woke = true; break; }
        }
        setServerWaking(false);
        if (!woke) { setChecking(false); return; }
      }
      try {
        const res = await fetchWithRetry(`${API_BASE}/api/auth/local/whoami`, { credentials: 'include' });
        if (res.ok) {
          const json = await res.json();
          if (json.playerToken) saveAuthNative(json.playerToken);
          const user: ReplitUser = json.user || json;
          if (user?.id || (user as any)?.supabase_id) {
            await loginWithUser(user);
            return;
          }
        }
      } catch {
        // No session exists
      } finally {
        setChecking(false);
      }
    };
    checkSession();
  }, []);

  const loginWithUser = async (user: ReplitUser) => {
    let playerData: Partial<PlayerData> | null = null;
    try {
      const token = localStorage.getItem('reforge_player_token');
      const playerRes = await fetchWithRetry(`${API_BASE}/api/player/${user.id}`, { credentials: 'include', headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (playerRes.ok) {
        const row = await playerRes.json();
        if (row?.raw_data) {
          playerData = row.raw_data as Partial<PlayerData>;
          // Inject top-level avatar_url column into raw_data so player.avatarUrl gets populated
          if (row.avatar_url && !playerData.avatarUrl) {
            playerData.avatarUrl = row.avatar_url;
          }
        } else if (row?.avatar_url) {
          // No raw_data yet (brand new user) — create minimal raw_data with avatar
          playerData = { avatarUrl: row.avatar_url };
        }
      }
    } catch { /* no cloud data yet */ }
    // Also check profileImageUrl from Google auth (passed via ReplitUser)
    const avatarFallback = (user as any).profileImageUrl || undefined;
    onLogin({
      id: user.id,
      name: playerData?.name || user.firstName || 'Hunter',
      username: (user as any).username || playerData?.username,
      avatarUrl: playerData?.avatarUrl || avatarFallback,
      raw_data: playerData ? { ...playerData, avatarUrl: playerData.avatarUrl || avatarFallback } : (avatarFallback ? { avatarUrl: avatarFallback } : undefined),
      replitUser: user,
    } as any);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !email.trim() || !password || !confirm) {
      setError('Please fill in all fields');
      return;
    }

    if (username.trim().length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    const cleanEmail = email.trim();
    const cleanUsername = username.trim();
    try {
      const res = await fetchWithRetry(`${API_BASE}/api/auth/local/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username: cleanUsername,
          email: cleanEmail,
          password,
        }),
      });
      const text = await res.text();
      let data: any;
      try { data = JSON.parse(text); } catch { data = { error: `Server error (${res.status})` }; }
      if (!res.ok) {
        setError(data.error || `Registration failed (${res.status})`);
        return;
      }

      // ── Check if OTP verification is required ──
      if (data.otpRequired) {
        setOtpEmail(data.email || cleanEmail);
        setOtpMode(true);
        setResendCooldown(60);
        setOtpDigits(['', '', '', '', '', '']);
        setOtpError('');
        // Focus first OTP input after transition
        setTimeout(() => otpInputRefs.current[0]?.focus(), 300);
        return;
      }

      // Idempotent recovery — already verified account
      if (data.playerToken) saveAuthNative(data.playerToken);
      await loginWithUser(data.user || data);
    } catch (err: any) {
      console.error('[CreateAccount] Registration network error:', err);
      try {
        const loginRes = await fetchWithRetry(`${API_BASE}/api/auth/local/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ identifier: cleanEmail, password }),
        });
        if (loginRes.ok) {
          const loginData = await loginRes.json();
          if (loginData.playerToken) saveAuthNative(loginData.playerToken);
          await loginWithUser(loginData.user || loginData);
          return;
        }
      } catch { /* recovery failed */ }
      const msg = err?.message || String(err) || 'Unknown network error';
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('ERR_CONNECTION')) {
        setError('Network hiccup — please check your internet and tap Create Account again.');
      } else if (msg.includes('timeout') || msg.includes('AbortError')) {
        setError('Request timed out — please try again in a moment.');
      } else {
        setError('Something went wrong — please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── OTP DIGIT HANDLERS ──
  const handleOtpDigitChange = (index: number, value: string) => {
    // Only accept digits
    const digit = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);
    setOtpError('');

    // Auto-advance to next input
    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits entered
    if (digit && index === 5 && newDigits.every(d => d)) {
      submitOtp(newDigits.join(''));
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const newDigits = pasted.split('');
      setOtpDigits(newDigits);
      otpInputRefs.current[5]?.focus();
      submitOtp(pasted);
    }
  };

  const submitOtp = async (code: string) => {
    setOtpVerifying(true);
    setOtpError('');
    try {
      const res = await fetchWithRetry(`${API_BASE}/api/auth/local/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: otpEmail, otp: code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOtpError(data.error || 'Invalid verification code');
        setOtpDigits(['', '', '', '', '', '']);
        setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
        return;
      }
      // Success — account created
      if (data.playerToken) saveAuthNative(data.playerToken);
      await loginWithUser(data.user || data);
    } catch (err: any) {
      console.error('[OTP Verify] Error:', err);
      setOtpError('Verification failed — please try again.');
      setOtpDigits(['', '', '', '', '', '']);
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setOtpError('');
    try {
      const res = await fetchWithRetry(`${API_BASE}/api/auth/local/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: otpEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOtpError(data.error || 'Failed to resend code');
        return;
      }
      setResendCooldown(60);
      setOtpDigits(['', '', '', '', '', '']);
      setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
    } catch {
      setOtpError('Failed to resend — check your connection.');
    }
  };

  const handleGoogleIdToken = async (credential: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchWithRetry(`${API_BASE}/api/auth/google/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ credential, mode: 'register' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Google sign-up failed');
        return;
      }
      if (data.playerToken) saveAuthNative(data.playerToken);
      const googleUser = data.user || data;
      const replitUser: ReplitUser = {
        id: googleUser.id,
        email: googleUser.email,
        firstName: googleUser.name,
        lastName: '',
        profileImageUrl: googleUser.avatar_url,
      };
      await loginWithUser(replitUser);
    } catch (err: any) {
      console.error('[CreateAccount] Google auth network error:', err);
      const msg = err?.message || String(err) || 'Unknown network error';
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('ERR_CONNECTION')) {
        setError('Server unreachable — please check your internet connection and try again.');
      } else {
        setError(`Google sign-up connection error: ${msg}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      setError('Google sign-up failed — no credential received');
      return;
    }
    await handleGoogleIdToken(credentialResponse.credential);
  };

  const inputStyle: React.CSSProperties = {
    background: 'var(--color-input-bg)',
    border: '1px solid var(--color-input-border)',
    color: 'var(--color-text-heading)',
    borderRadius: '12px',
    padding: '12px 16px',
    fontSize: '14px',
    transition: 'all 0.2s',
  };

  if (checking) {
    return (
      <div className="fixed inset-0 z-[500] flex flex-col items-center justify-center font-mono gap-4 px-6" style={{ background: 'var(--color-auth-bg)', overflow: 'hidden', touchAction: 'none', overscrollBehavior: 'none' }}>
        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity }} className="text-system-neon text-lg font-black tracking-widest">
          REFORGE
        </motion.div>
        <div className="text-gray-400 text-xs text-center">
          {serverWaking ? 'Connecting to server...' : 'Checking session...'}
        </div>
        {serverWaking && (
          <>
            <div className="w-48 h-1 bg-gray-800 rounded-full overflow-hidden mt-1">
              <motion.div className="h-full bg-system-neon/60 rounded-full" animate={{ x: ['-100%', '100%'] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }} style={{ width: '40%' }} />
            </div>
            <AnimatePresence mode="wait">
              <motion.p
                key={factIndex}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.4 }}
                className="text-gray-500 text-[11px] text-center max-w-xs leading-relaxed mt-3 italic"
              >
                {shuffledFacts.current[factIndex]}
              </motion.p>
            </AnimatePresence>
          </>
        )}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[500] flex items-center justify-center p-4 sm:p-6 font-mono"
      style={{ background: 'var(--color-auth-bg)', paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)', overflow: 'hidden', overscrollBehavior: 'none', touchAction: 'pan-y pinch-zoom' }}
    >
      {/* Loading overlay with fun facts */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 px-6"
            style={{ background: 'var(--color-overlay-heavy)' }}
          >
            <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity }} className="text-system-neon text-lg font-black tracking-widest">
              REFORGE
            </motion.div>
            <div className="text-gray-400 text-xs text-center">Creating your account...</div>
            <div className="w-48 h-1 bg-gray-800 rounded-full overflow-hidden">
              <motion.div className="h-full bg-system-neon/60 rounded-full" animate={{ x: ['-100%', '100%'] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }} style={{ width: '40%' }} />
            </div>
            <AnimatePresence mode="wait">
              <motion.p
                key={factIndex}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.4 }}
                className="text-gray-500 text-[11px] text-center max-w-xs leading-relaxed mt-2 italic"
              >
                {shuffledFacts.current[factIndex]}
              </motion.p>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Particles Background */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: 'var(--color-particle)',
          }}
          animate={{
            y: [0, -20, 0],
            opacity: [0.3, 0.8, 0.3],
          }}
          transition={{
            duration: p.dur,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}

      <AnimatePresence mode="wait">
        {otpMode ? (
          /* ══════════════ OTP VERIFICATION SCREEN ══════════════ */
          <motion.div
            key="otp-screen"
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.97 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-md relative"
          >
            {/* Verifying overlay */}
            <AnimatePresence>
              {otpVerifying && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-50 bg-black/90 rounded-2xl flex flex-col items-center justify-center gap-3"
                >
                  <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity }} className="text-system-neon text-lg font-black tracking-widest">
                    REFORGE
                  </motion.div>
                  <div className="text-gray-400 text-xs">Verifying code...</div>
                  <div className="w-48 h-1 bg-gray-800 rounded-full overflow-hidden">
                    <motion.div className="h-full bg-system-neon/60 rounded-full" animate={{ x: ['-100%', '100%'] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }} style={{ width: '40%' }} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Email icon + header */}
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
                className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(0,212,255,0.15))', border: '1px solid rgba(99,102,241,0.25)' }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#33dfff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </motion.div>
              <h1 className="text-2xl font-black text-white mb-2 tracking-tighter">Verify Your Email</h1>
              <p className="text-gray-400 text-sm leading-relaxed">
                We sent a 6-digit code to
              </p>
              <p className="text-[#00d4ff] text-sm font-bold mt-1">{otpEmail}</p>
            </div>

            {/* 6-digit OTP Input */}
            <div className="flex justify-center gap-2.5 mb-6" onPaste={handleOtpPaste}>
              {otpDigits.map((digit, i) => (
                <motion.input
                  key={i}
                  ref={el => { otpInputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleOtpDigitChange(i, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(i, e)}
                  disabled={otpVerifying}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.05 }}
                  className="w-12 h-14 text-center text-xl font-black text-white rounded-xl focus:outline-none transition-all"
                  style={{
                    background: digit ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.04)',
                    border: digit
                      ? '2px solid rgba(99,102,241,0.5)'
                      : otpError
                        ? '2px solid rgba(239,68,68,0.4)'
                        : '1px solid rgba(255,255,255,0.08)',
                    caretColor: '#33dfff',
                    boxShadow: digit ? '0 0 12px rgba(99,102,241,0.15)' : 'none',
                  }}
                />
              ))}
            </div>

            {/* OTP Error */}
            <AnimatePresence>
              {otpError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-xs text-center mb-4"
                >
                  {otpError}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Resend + Timer */}
            <div className="text-center mb-6">
              {resendCooldown > 0 ? (
                <p className="text-gray-500 text-xs">
                  Resend code in <span className="text-[#00d4ff] font-bold">{resendCooldown}s</span>
                </p>
              ) : (
                <button
                  onClick={handleResendOtp}
                  className="text-[#00d4ff] hover:text-[#33dfff] text-xs font-bold transition-colors"
                >
                  Didn't receive the code? Resend
                </button>
              )}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-5">
              <div className="h-px flex-1 bg-white/06" />
              <span className="text-[10px] font-mono text-white/15 uppercase tracking-widest">or</span>
              <div className="h-px flex-1 bg-white/06" />
            </div>

            {/* Back to form */}
            <div className="text-center">
              <button
                onClick={() => { setOtpMode(false); setOtpError(''); }}
                className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-medium"
              >
                <ArrowLeft size={16} />
                Back to registration
              </button>
            </div>
          </motion.div>
        ) : (
          /* ══════════════ ORIGINAL REGISTRATION FORM ══════════════ */
          <motion.div
            key="register-form"
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.97 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-md relative"
          >
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-black mb-2 tracking-tighter" style={{ color: 'var(--color-text-heading)' }}>Create Account</h1>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Start your journey as a Hunter</p>
            </div>

            {/* Form */}
            <form onSubmit={handleCreate} className="space-y-4 mb-6">
              <div>
                <input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={inputStyle}
                  disabled={loading}
                  className="w-full focus:outline-none focus:ring-2 focus:ring-system-neon/50"
                />
              </div>

              <div>
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={inputStyle}
                  disabled={loading}
                  className="w-full focus:outline-none focus:ring-2 focus:ring-system-neon/50"
                />
              </div>

              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={inputStyle}
                  disabled={loading}
                  className="w-full focus:outline-none focus:ring-2 focus:ring-system-neon/50 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  disabled={loading}
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Confirm Password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  style={inputStyle}
                  disabled={loading}
                  className="w-full focus:outline-none focus:ring-2 focus:ring-system-neon/50 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  disabled={loading}
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-xs"
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all duration-200 active:scale-[0.97] disabled:opacity-50"
                style={{ background: `linear-gradient(135deg, var(--color-btn-primary-from), var(--color-btn-primary-to))` }}
              >
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>

            {/* Google Divider */}
            <div className="flex items-center gap-3 my-5">
              <div className="h-px flex-1 bg-white/06" />
              <span className="text-[10px] font-mono text-white/25 uppercase tracking-widest">or</span>
              <div className="h-px flex-1 bg-white/06" />
            </div>

            {/* Google Sign Up */}
            <div className="flex justify-center mb-6">
              {isNativePlatform ? (
                <NativeGoogleButton
                  text="signup_with"
                  onIdToken={handleGoogleIdToken}
                  onError={(msg) => setError(msg)}
                />
              ) : (
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setError('Google sign-up was cancelled')}
                  theme="filled_black"
                  shape="pill"
                  size="large"
                  text="signup_with"
                  width="320"
                />
              )}
            </div>

            {/* Sign In Link */}
            <div className="text-center">
              <button
                onClick={() => onNavigate?.('AUTH_SIGN_IN_PAGE')}
                className="inline-flex items-center gap-2 text-system-neon hover:text-white transition-colors text-sm font-medium"
              >
                <ArrowLeft size={16} />
                Already a user? Sign in
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default CreateAccountPage;
