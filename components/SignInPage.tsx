import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, UserPlus, KeyRound, ArrowLeft } from 'lucide-react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { PlayerData, ReplitUser } from '../types';
import { API_BASE, fetchWithRetry, checkServerHealth } from '../lib/apiConfig';
import { getPlayerAuthHeaders } from '../lib/playerApi';
import { saveAuthNative } from '../lib/nativeAuth';
import { isNativePlatform } from '../lib/googleAuth';
import NativeGoogleButton from './NativeGoogleButton';
import { shuffleFacts } from '../lib/funFacts';

interface SignInPageProps {
  onLogin: (profile: Partial<PlayerData> & { replitUser?: ReplitUser }) => void;
  onNavigate?: (dest: 'AUTH_SIGN_IN_PAGE' | 'AUTH_CREATE_PAGE') => void;
}

const SignInPage: React.FC<SignInPageProps> = ({ onLogin, onNavigate }) => {
  const [checking, setChecking] = useState(true);
  const [serverWaking, setServerWaking] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ── Forgot Password State ──
  type ForgotStep = 'idle' | 'email' | 'code' | 'newPassword' | 'success';
  const [forgotStep, setForgotStep] = useState<ForgotStep>('idle');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPass, setForgotNewPass] = useState('');
  const [forgotConfirmPass, setForgotConfirmPass] = useState('');
  const [forgotShowPass, setForgotShowPass] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [resetToken, setResetToken] = useState('');

  const handleForgotRequest = async () => {
    if (!forgotEmail.trim()) {
      setForgotError('Please enter your email address');
      return;
    }
    setForgotLoading(true);
    setForgotError('');
    try {
      const res = await fetchWithRetry(`${API_BASE}/api/auth/local/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setForgotError(data.error || 'Failed to send reset code');
        return;
      }
      setForgotStep('code');
    } catch (err: any) {
      setForgotError('Network error. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotVerify = async () => {
    if (!forgotOtp.trim()) {
      setForgotError('Please enter the 6-digit code');
      return;
    }
    setForgotLoading(true);
    setForgotError('');
    try {
      const res = await fetchWithRetry(`${API_BASE}/api/auth/local/forgot-password/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim(), otp: forgotOtp.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setForgotError(data.error || 'Invalid code');
        return;
      }
      setResetToken(data.resetToken);
      setForgotStep('newPassword');
    } catch (err: any) {
      setForgotError('Network error. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotReset = async () => {
    if (!forgotNewPass || !forgotConfirmPass) {
      setForgotError('Please fill in both password fields');
      return;
    }
    if (forgotNewPass.length < 6) {
      setForgotError('Password must be at least 6 characters');
      return;
    }
    if (forgotNewPass !== forgotConfirmPass) {
      setForgotError('Passwords do not match');
      return;
    }
    setForgotLoading(true);
    setForgotError('');
    try {
      const res = await fetchWithRetry(`${API_BASE}/api/auth/local/forgot-password/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim(), resetToken, newPassword: forgotNewPass }),
      });
      const data = await res.json();
      if (!res.ok) {
        setForgotError(data.error || 'Failed to reset password');
        return;
      }
      setForgotStep('success');
    } catch (err: any) {
      setForgotError('Network error. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  const resetForgotFlow = () => {
    setForgotStep('idle');
    setForgotEmail('');
    setForgotOtp('');
    setForgotNewPass('');
    setForgotConfirmPass('');
    setForgotShowPass(false);
    setForgotError('');
    setResetToken('');
  };

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

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    setError('');
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
      if (!res.ok) {
        setError(data.error || `Sign in failed (${res.status})`);
        return;
      }
      if (data.playerToken) saveAuthNative(data.playerToken);
      await loginWithUser(data.user || data);
    } catch (err: any) {
      console.error('[SignIn] Login network error:', err);
      const msg = err?.message || String(err) || 'Unknown network error';
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('ERR_CONNECTION')) {
        setError('Server unreachable — please check your internet connection and try again.');
      } else if (msg.includes('timeout') || msg.includes('AbortError')) {
        setError('Request timed out — server may be overloaded. Please try again.');
      } else {
        setError(`Connection error: ${msg}`);
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
      console.error('[SignIn] Google auth network error:', err);
      const msg = err?.message || String(err) || 'Unknown network error';
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('ERR_CONNECTION')) {
        setError('Server unreachable — please check your internet connection and try again.');
      } else {
        setError(`Google sign-in connection error: ${msg}`);
      }
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
            <div className="text-gray-400 text-xs text-center">Signing you in...</div>
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

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.97 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md relative"
        style={{ overflow: 'hidden' }}
      >
        {/* ═══ FORGOT PASSWORD FLOW ═══ */}
        <AnimatePresence mode="wait">
          {forgotStep !== 'idle' ? (
            <motion.div
              key="forgot-flow"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.3 }}
            >
              {/* Back button */}
              {forgotStep !== 'success' && (
                <button
                  onClick={resetForgotFlow}
                  className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors text-xs mb-6"
                >
                  <ArrowLeft size={14} />
                  Back to Sign In
                </button>
              )}

              {/* Header */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4" style={{ background: 'linear-gradient(135deg, #ef4444, #f97316)' }}>
                  <KeyRound size={28} className="text-white" />
                </div>
                <h2 className="text-2xl font-black tracking-tighter" style={{ color: 'var(--color-text-heading)' }}>
                  {forgotStep === 'email' && 'Reset Password'}
                  {forgotStep === 'code' && 'Enter Code'}
                  {forgotStep === 'newPassword' && 'New Password'}
                  {forgotStep === 'success' && 'Password Updated'}
                </h2>
                <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
                  {forgotStep === 'email' && 'Enter your account email to receive a reset code'}
                  {forgotStep === 'code' && `We sent a 6-digit code to ${forgotEmail}`}
                  {forgotStep === 'newPassword' && 'Choose a strong new password'}
                  {forgotStep === 'success' && 'You can now sign in with your new password'}
                </p>
              </div>

              {/* Step: Email */}
              {forgotStep === 'email' && (
                <div className="space-y-4">
                  <input
                    type="email"
                    placeholder="Email address"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleForgotRequest()}
                    style={inputStyle}
                    disabled={forgotLoading}
                    className="w-full focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    autoFocus
                  />
                  <AnimatePresence>
                    {forgotError && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-xs"
                      >
                        {forgotError}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <button
                    onClick={handleForgotRequest}
                    disabled={forgotLoading}
                    className="w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all duration-200 active:scale-[0.97] disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #ef4444, #f97316)' }}
                  >
                    {forgotLoading ? 'Sending...' : 'Send Reset Code'}
                  </button>
                </div>
              )}

              {/* Step: OTP Code */}
              {forgotStep === 'code' && (
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="6-digit code"
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    onKeyDown={(e) => e.key === 'Enter' && handleForgotVerify()}
                    style={{ ...inputStyle, textAlign: 'center', letterSpacing: '6px', fontSize: '20px', fontWeight: 700 }}
                    disabled={forgotLoading}
                    className="w-full focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    inputMode="numeric"
                    maxLength={6}
                    autoFocus
                  />
                  <AnimatePresence>
                    {forgotError && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-xs"
                      >
                        {forgotError}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <button
                    onClick={handleForgotVerify}
                    disabled={forgotLoading || forgotOtp.length < 6}
                    className="w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all duration-200 active:scale-[0.97] disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #ef4444, #f97316)' }}
                  >
                    {forgotLoading ? 'Verifying...' : 'Verify Code'}
                  </button>
                  <button
                    onClick={handleForgotRequest}
                    disabled={forgotLoading}
                    className="w-full text-center text-xs text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    Didn't receive it? Resend code
                  </button>
                </div>
              )}

              {/* Step: New Password */}
              {forgotStep === 'newPassword' && (
                <div className="space-y-4">
                  <div className="relative">
                    <input
                      type={forgotShowPass ? 'text' : 'password'}
                      placeholder="New password"
                      value={forgotNewPass}
                      onChange={(e) => setForgotNewPass(e.target.value)}
                      style={inputStyle}
                      disabled={forgotLoading}
                      className="w-full focus:outline-none focus:ring-2 focus:ring-orange-500/50 pr-12"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setForgotShowPass(!forgotShowPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    >
                      {forgotShowPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <input
                    type={forgotShowPass ? 'text' : 'password'}
                    placeholder="Confirm new password"
                    value={forgotConfirmPass}
                    onChange={(e) => setForgotConfirmPass(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleForgotReset()}
                    style={inputStyle}
                    disabled={forgotLoading}
                    className="w-full focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  />
                  {/* Password strength hint */}
                  {forgotNewPass && (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1 rounded-full overflow-hidden bg-gray-800">
                        <motion.div
                          className="h-full rounded-full"
                          initial={{ width: 0 }}
                          animate={{
                            width: forgotNewPass.length < 6 ? '20%' : forgotNewPass.length < 10 ? '50%' : '100%',
                            backgroundColor: forgotNewPass.length < 6 ? '#ef4444' : forgotNewPass.length < 10 ? '#f59e0b' : '#22c55e',
                          }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                      <span className="text-[10px]" style={{ color: forgotNewPass.length < 6 ? '#ef4444' : forgotNewPass.length < 10 ? '#f59e0b' : '#22c55e' }}>
                        {forgotNewPass.length < 6 ? 'Too short' : forgotNewPass.length < 10 ? 'Good' : 'Strong'}
                      </span>
                    </div>
                  )}
                  <AnimatePresence>
                    {forgotError && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-xs"
                      >
                        {forgotError}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <button
                    onClick={handleForgotReset}
                    disabled={forgotLoading || forgotNewPass.length < 6}
                    className="w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all duration-200 active:scale-[0.97] disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #ef4444, #f97316)' }}
                  >
                    {forgotLoading ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              )}

              {/* Step: Success */}
              {forgotStep === 'success' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-6 text-center"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
                    className="inline-flex items-center justify-center w-16 h-16 rounded-full mx-auto"
                    style={{ background: 'rgba(34, 197, 94, 0.15)', border: '2px solid rgba(34, 197, 94, 0.3)' }}
                  >
                    <span className="text-3xl">✓</span>
                  </motion.div>
                  <p className="text-sm text-gray-300">Your password has been updated successfully.</p>
                  <button
                    onClick={resetForgotFlow}
                    className="w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all duration-200 active:scale-[0.97]"
                    style={{ background: `linear-gradient(135deg, var(--color-btn-primary-from), var(--color-btn-primary-to))` }}
                  >
                    Back to Sign In
                  </button>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="signin-form"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              transition={{ duration: 0.3 }}
            >
              {/* Header */}
              <div className="text-center mb-8">
                <h1 className="text-3xl font-black mb-2 tracking-tighter" style={{ color: 'var(--color-text-heading)' }}>Welcome Back</h1>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Sign in to continue your journey</p>
              </div>

              {/* Form */}
              <form onSubmit={handleSignIn} className="space-y-4 mb-2">
                <div>
                  <input
                    type="text"
                    placeholder="Username or Email"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
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

                {/* Forgot Password Link */}
                <div className="flex justify-end -mt-1">
                  <button
                    type="button"
                    onClick={() => { setForgotStep('email'); setForgotError(''); }}
                    className="text-[11px] text-gray-500 hover:text-orange-400 transition-colors"
                  >
                    Forgot Password?
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
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>

              {/* Google Divider */}
              <div className="flex items-center gap-3 my-5">
                <div className="h-px flex-1 bg-white/06" />
                <span className="text-[10px] font-mono text-white/25 uppercase tracking-widest">or</span>
                <div className="h-px flex-1 bg-white/06" />
              </div>

              {/* Google Sign In */}
              <div className="flex justify-center mb-6">
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

              {/* Create Account Link */}
              <div className="text-center">
                <button
                  onClick={() => onNavigate?.('AUTH_CREATE_PAGE')}
                  className="inline-flex items-center gap-2 text-system-neon hover:text-white transition-colors text-sm font-medium"
                >
                  <UserPlus size={16} />
                  Create Account
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

export default SignInPage;
