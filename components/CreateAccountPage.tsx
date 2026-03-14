import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { PlayerData, ReplitUser } from '../types';

interface CreateAccountPageProps {
  onLogin: (profile: Partial<PlayerData> & { replitUser?: ReplitUser }) => void;
  onNavigate?: (dest: 'AUTH_SIGN_IN_PAGE' | 'AUTH_CREATE_PAGE') => void;
}

const CreateAccountPage: React.FC<CreateAccountPageProps> = ({ onLogin, onNavigate }) => {
  const [checking, setChecking] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      try {
        const res = await fetch('/api/auth/local/whoami', { credentials: 'include' });
        if (res.ok) {
          const json = await res.json();
          if (json.playerToken) localStorage.setItem('reforge_player_token', json.playerToken);
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
    let playerData: Partial<PlayerData> = {};
    try {
      const token = localStorage.getItem('reforge_player_token');
      const playerRes = await fetch(`/api/player/${user.id}`, { credentials: 'include', headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (playerRes.ok) {
        const row = await playerRes.json();
        if (row?.raw_data) playerData = row.raw_data as Partial<PlayerData>;
      }
    } catch { /* no cloud data yet */ }
    onLogin({
      ...playerData,
      userId: user.id,
      name: playerData.name || user.firstName || 'Hunter',
      username: (user as any).username || playerData.username,
      email: (user as any).email || (playerData as any).email,
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
    try {
      const res = await fetch('/api/auth/local/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim(),
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Registration failed');
        return;
      }
      if (data.playerToken) localStorage.setItem('reforge_player_token', data.playerToken);
      await loginWithUser(data.user || data);
    } catch {
      setError('Connection error — please try again');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      setError('Google sign-up failed — no credential received');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/google/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ credential: credentialResponse.credential }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Google sign-up failed');
        return;
      }
      if (data.playerToken) localStorage.setItem('reforge_player_token', data.playerToken);
      // Map Google user data to ReplitUser format
      const googleUser = data.user || data;
      const replitUser: ReplitUser = {
        id: googleUser.id,
        email: googleUser.email,
        firstName: googleUser.name,
        lastName: '',
        profileImageUrl: googleUser.avatar_url,
      };
      await loginWithUser(replitUser);
    } catch {
      setError('Connection error — please try again');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: 'white',
    borderRadius: '12px',
    padding: '12px 16px',
    fontSize: '14px',
    transition: 'all 0.2s',
  };

  if (checking) {
    return (
      <div className="fixed inset-0 z-[500] bg-black flex items-center justify-center font-mono">
        <div className="text-white text-sm">Checking session...</div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[500] bg-black flex items-center justify-center p-6 font-mono overflow-hidden"
    >
      {/* Particles Background */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
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
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-white mb-2 tracking-tighter">Create Account</h1>
          <p className="text-gray-400 text-sm">Start your journey as a Hunter</p>
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
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >
            {loading ? 'Creating...' : 'Create Account'}
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
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError('Google sign-up was cancelled')}
            theme="filled_black"
            shape="pill"
            size="large"
            text="signup_with"
            width="320"
          />
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
    </motion.div>
  );
};

export default CreateAccountPage;
