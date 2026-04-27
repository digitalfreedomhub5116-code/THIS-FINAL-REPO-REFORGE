
import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { PlayerData, ReplitUser } from '../types';
import { API_BASE, fetchWithRetry, checkServerHealth } from '../lib/apiConfig';
import { getPlayerAuthHeaders } from '../lib/playerApi';
import { saveAuthNative } from '../lib/nativeAuth';
import { isNativePlatform } from '../lib/googleAuth';
import NativeGoogleButton from './NativeGoogleButton';
import { shuffleFacts } from '../lib/funFacts';

interface AuthViewProps {
  onLogin: (profile: Partial<PlayerData> & { replitUser?: ReplitUser }) => void;
  initialMode?: 'SIGN_IN' | 'CREATE';
}

type Mode = 'SIGN_IN' | 'CREATE';

const AuthView: React.FC<AuthViewProps> = ({ onLogin, initialMode = 'SIGN_IN' }) => {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [checking, setChecking] = useState(true);
  const [serverWaking, setServerWaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  const [identifier, setIdentifier] = useState('');
  const [username, setUsername]     = useState('');
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [confirm, setConfirm]       = useState('');
  const [showPass, setShowPass]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Fun facts cycling
  const shuffledFacts = useRef(shuffleFacts());
  const [factIndex, setFactIndex] = useState(0);
  useEffect(() => {
    if (!serverWaking && !loading) return;
    const interval = setInterval(() => {
      setFactIndex(i => (i + 1) % shuffledFacts.current.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [serverWaking, loading]);

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
        const res = await fetchWithRetry(`${API_BASE}/api/auth/local/whoami`, { credentials: 'include', headers: { ...getPlayerAuthHeaders() } });
        if (res.ok) {
          const json = await res.json();
          if (json.playerToken) saveAuthNative(json.playerToken);
          const user: ReplitUser = json.user || json;
          if (user?.id || (user as any)?.supabase_id) {
            await loginWithUser({ ...user, id: user.id || (user as any).supabase_id });
            return;
          }
        }
      } catch { /* not logged in */ }
      setChecking(false);
    };
    checkSession();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loginWithUser = async (user: ReplitUser) => {
    let playerData: Partial<PlayerData> | null = null;
    try {
      const token = localStorage.getItem('reforge_player_token');
      const playerRes = await fetchWithRetry(`${API_BASE}/api/player/${user.id}`, { credentials: 'include', headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (playerRes.ok) {
        const row = await playerRes.json();
        if (row?.raw_data) playerData = row.raw_data as Partial<PlayerData>;
      }
    } catch { /* no cloud data yet */ }
    onLogin({
      id: user.id,
      name: playerData?.name || user.firstName || 'Hunter',
      username: (user as any).username || playerData?.username,
      keys: playerData?.keys,
      raw_data: playerData || undefined,
      replitUser: user,
    } as any);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!identifier.trim() || !password) { setError('Fill in all fields'); return; }
    setLoading(true);
    try {
      const res = await fetchWithRetry(`${API_BASE}/api/auth/local/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });
      const text = await res.text();
      let data: any;
      try { data = JSON.parse(text); } catch { data = { error: `Server error (${res.status})` }; }
      if (!res.ok) { setError(data.error || `Login failed (${res.status})`); return; }
      if (data.playerToken) saveAuthNative(data.playerToken);
      await loginWithUser(data.user || data);
    } catch (err: any) {
      setError(`Connection error — please check your internet and try again.`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !email.trim() || !password) { setError('Fill in all fields'); return; }
    if (password !== confirm) { setError('Passwords do not match'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    const cleanEmail = email.trim();
    const cleanUsername = username.trim();
    try {
      const res = await fetchWithRetry(`${API_BASE}/api/auth/local/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: cleanUsername, email: cleanEmail, password }),
      });
      const text = await res.text();
      let data: any;
      try { data = JSON.parse(text); } catch { data = { error: `Server error (${res.status})` }; }
      if (!res.ok) { setError(data.error || `Registration failed (${res.status})`); return; }
      if (data.playerToken) saveAuthNative(data.playerToken);
      await loginWithUser(data.user || data);
    } catch (err: any) {
      // ────────────────────────────────────────────────────────────────────
      // NETWORK-FAILURE AUTO-RECOVERY
      // On mobile networks, the server often successfully creates the account
      // but the response packet is dropped. Without this code, the user sees
      // "Connection error" and (if they retry) gets "email already taken",
      // then uninstalls. To recover gracefully we silently attempt to sign in
      // using the same credentials — if the server did process the register,
      // this succeeds and the user never notices the hiccup.
      // ────────────────────────────────────────────────────────────────────
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
      } catch { /* recovery attempt failed — fall through to error message */ }
      const msg = err?.message || String(err) || '';
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('ERR_CONNECTION') || msg.includes('AbortError')) {
        setError('Network hiccup — please check your internet and tap Create Account again.');
      } else {
        setError('Something went wrong — please try again in a moment.');
      }
    } finally {
      setLoading(false);
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
        body: JSON.stringify({ credential }),
      });
      const text = await res.text();
      let data: any;
      try { data = JSON.parse(text); } catch { data = { error: `Server error (${res.status})` }; }
      if (!res.ok) {
        setError(data.error || `Google sign-in failed (${res.status})`);
        return;
      }
      if (data.playerToken) saveAuthNative(data.playerToken);
      await loginWithUser(data.user || data);
    } catch (err: any) {
      setError(`Connection error — please check your internet and try again.`);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      setError('Google sign-in failed — no credential received');
      return;
    }
    await handleGoogleIdToken(credentialResponse.credential);
  };

  const switchMode = (m: Mode) => {
    setError('');
    setPassword('');
    setConfirm('');
    setMode(m);
  };

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
  };
  const inputClass = 'w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/20 outline-none transition-all';
  const labelClass = 'text-[10px] font-mono text-white/30 uppercase tracking-widest block mb-1.5';

  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => (e.target.style.borderColor = 'rgba(99,102,241,0.5)');
  const onBlur  = (e: React.FocusEvent<HTMLInputElement>) => (e.target.style.borderColor = 'rgba(255,255,255,0.08)');

  if (checking) {
    return (
      <div className="fixed inset-0 z-[500] bg-black flex flex-col items-center justify-center font-mono gap-4 px-6">
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
    <div className="fixed inset-0 bg-[#07070f] flex items-center justify-center overflow-y-auto"
         style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}>
      {/* Loading overlay with fun facts */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center gap-4 px-6"
          >
            <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity }} className="text-system-neon text-lg font-black tracking-widest">
              REFORGE
            </motion.div>
            <div className="text-gray-400 text-xs text-center">{mode === 'CREATE' ? 'Creating your account...' : 'Signing you in...'}</div>
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

      {/* Particles */}
      <div className="absolute inset-0 pointer-events-none">
        {particles.map(p => (
          <motion.div
            key={p.id}
            className="absolute rounded-full bg-[#7EB8D4]"
            style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size }}
            animate={{ opacity: [0, 0.5, 0], y: [0, -40, -80] }}
            transition={{ duration: p.dur, delay: p.delay, repeat: Infinity, ease: 'easeOut' }}
          />
        ))}
        <div className="absolute top-[-15%] left-[20%] w-[500px] h-[500px] bg-[#7EB8D4]/6 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] right-[10%] w-[400px] h-[400px] bg-[#7EB8D4]/5 rounded-full blur-[120px]" />
        <div className="absolute top-[40%] left-[-10%] w-[300px] h-[300px] bg-[#4f46e5]/4 rounded-full blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-sm mx-4"
      >
        {/* Brand */}
        <div className="text-center mb-8">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <h1 className="text-4xl font-black tracking-tight text-white mb-1">
              RE<span style={{ color: '#7EB8D4' }}>FORGE</span>
            </h1>
            <h2 className="text-xl font-black tracking-[0.2em] text-white/70 uppercase">SYSTEM</h2>
            <div className="mt-3 flex items-center justify-center gap-2">
              <div className="h-px w-12 bg-gradient-to-r from-transparent to-[#7EB8D4]/40" />
              <div className="w-1 h-1 rounded-full bg-[#7EB8D4]/60" />
              <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#7EB8D4]/40" />
            </div>
          </motion.div>
        </div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid rgba(255,255,255,0.07)',
            backdropFilter: 'blur(24px)',
            boxShadow: '0 24px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,102,241,0.08)',
          }}
        >
          <AnimatePresence mode="wait">

            {/* ── SIGN IN ── */}
            {mode === 'SIGN_IN' && (
              <motion.div
                key="signin"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.2 }}
                className="p-7"
              >
                <h3 className="text-lg font-black text-white mb-1 tracking-tight">Welcome Back</h3>
                <p className="text-[11px] font-mono text-white/30 tracking-widest uppercase mb-6">
                  Sign in to continue
                </p>

                <form onSubmit={handleSignIn} className="flex flex-col gap-3">
                  <div>
                    <label className={labelClass}>Email or Username</label>
                    <input
                      type="text"
                      value={identifier}
                      onChange={e => setIdentifier(e.target.value)}
                      placeholder="your@email.com"
                      autoComplete="username"
                      className={inputClass}
                      style={inputStyle}
                      onFocus={onFocus}
                      onBlur={onBlur}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Password</label>
                    <div className="relative">
                      <input
                        type={showPass ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Enter password"
                        autoComplete="current-password"
                        className={`${inputClass} pr-11`}
                        style={inputStyle}
                        onFocus={onFocus}
                        onBlur={onBlur}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors"
                      >
                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {error && <p className="text-red-400 text-xs font-mono text-center py-1">{error}</p>}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all duration-200 active:scale-[0.97] disabled:opacity-50 mt-1"
                    style={{ background: 'linear-gradient(135deg, #7EB8D4, #7EB8D4)' }}
                  >
                    {loading ? 'Signing In...' : 'Sign In'}
                  </button>
                </form>

                <div className="flex items-center gap-3 my-5">
                  <div className="h-px flex-1 bg-white/06" />
                  <span className="text-[10px] font-mono text-white/25 uppercase tracking-widest">or</span>
                  <div className="h-px flex-1 bg-white/06" />
                </div>

                <div className="flex justify-center mb-4">
                  {isNativePlatform ? (
                    <NativeGoogleButton
                      text="signin_with"
                      onIdToken={handleGoogleIdToken}
                      onError={(msg) => setError(msg)}
                    />
                  ) : (
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={() => setError('Google sign-in was cancelled')}
                      theme="filled_black"
                      shape="pill"
                      size="large"
                      text="signin_with"
                      width="320"
                    />
                  )}
                </div>

                <div className="flex items-center gap-3 my-4">
                  <div className="h-px flex-1 bg-white/06" />
                  <span className="text-[10px] font-mono text-white/25 uppercase tracking-widest">new here?</span>
                  <div className="h-px flex-1 bg-white/06" />
                </div>

                <button
                  onClick={() => switchMode('CREATE')}
                  className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 text-white/70 hover:text-white active:scale-[0.97]"
                  style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.18)' }}
                >
                  Create Account
                </button>
              </motion.div>
            )}

            {/* ── CREATE ACCOUNT ── */}
            {mode === 'CREATE' && (
              <motion.div
                key="create"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="p-7"
              >
                <button
                  onClick={() => switchMode('SIGN_IN')}
                  className="flex items-center gap-1.5 text-white/30 hover:text-white/60 text-xs font-mono mb-5 transition-colors"
                >
                  <ArrowLeft size={13} /> BACK
                </button>

                <h3 className="text-lg font-black text-white mb-1 tracking-tight">Create Account</h3>
                <p className="text-[11px] font-mono text-white/30 tracking-widest uppercase mb-6">
                  Choose your codename
                </p>

                <form onSubmit={handleCreate} className="flex flex-col gap-3">
                  <div>
                    <label className={labelClass}>
                      Codename <span className="text-[#7EB8D4]">*</span>
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      placeholder="HUNTER_001"
                      autoComplete="username"
                      maxLength={30}
                      className={inputClass}
                      style={inputStyle}
                      onFocus={onFocus}
                      onBlur={onBlur}
                    />
                    <p className="text-[9px] text-white/20 font-mono mt-1">3–30 chars · letters, numbers, underscore</p>
                  </div>

                  <div>
                    <label className={labelClass}>
                      Email <span className="text-[#7EB8D4]">*</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      autoComplete="email"
                      className={inputClass}
                      style={inputStyle}
                      onFocus={onFocus}
                      onBlur={onBlur}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      Password <span className="text-[#7EB8D4]">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPass ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Min. 6 characters"
                        autoComplete="new-password"
                        className={`${inputClass} pr-11`}
                        style={inputStyle}
                        onFocus={onFocus}
                        onBlur={onBlur}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors"
                      >
                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>
                      Confirm Password <span className="text-[#7EB8D4]">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        value={confirm}
                        onChange={e => setConfirm(e.target.value)}
                        placeholder="Repeat password"
                        autoComplete="new-password"
                        className={`${inputClass} pr-11`}
                        style={inputStyle}
                        onFocus={onFocus}
                        onBlur={onBlur}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors"
                      >
                        {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {error && <p className="text-red-400 text-xs font-mono text-center py-1">{error}</p>}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all duration-200 active:scale-[0.97] disabled:opacity-50 mt-1"
                    style={{ background: 'linear-gradient(135deg, #7EB8D4, #7EB8D4)' }}
                  >
                    {loading ? 'Creating...' : 'Create Account'}
                  </button>
                </form>

                <div className="flex items-center gap-3 my-5">
                  <div className="h-px flex-1 bg-white/06" />
                  <span className="text-[10px] font-mono text-white/25 uppercase tracking-widest">or</span>
                  <div className="h-px flex-1 bg-white/06" />
                </div>

                <div className="flex justify-center mb-4">
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

                <p className="text-center text-white/25 text-xs mt-4">
                  Already have an account?{' '}
                  <button
                    onClick={() => switchMode('SIGN_IN')}
                    className="text-[#7EB8D4] hover:text-[#7EB8D4] transition-colors font-medium"
                  >
                    Sign in
                  </button>
                </p>
              </motion.div>
            )}

          </AnimatePresence>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default AuthView;
