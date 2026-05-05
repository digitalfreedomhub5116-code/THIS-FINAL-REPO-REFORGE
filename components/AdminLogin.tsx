
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Lock, Terminal, ArrowLeft, Key } from 'lucide-react';
import { API_BASE } from '../lib/apiConfig';

const STORAGE_KEY = 'reforge_admin_remember';

interface AdminLoginProps {
  onLoginSuccess: (token: string) => void;
  onBack: () => void;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess, onBack }) => {
  const [adminId, setAdminId] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [autoLoginAttempted, setAutoLoginAttempted] = useState(false);

  // On mount: check if saved credentials exist and auto-login
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) { setAutoLoginAttempted(true); return; }
    try {
      const { id, pwd } = JSON.parse(saved);
      if (id && pwd) {
        setAdminId(id);
        setPassword(pwd);
        setRememberMe(true);
        // Auto-login with saved credentials
        (async () => {
          try {
            const res = await fetch(`${API_BASE}/api/admin/verify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ password: pwd }),
            });
            const data = await res.json();
            if (data.authorized && data.token) {
              onLoginSuccess(data.token);
              return;
            }
          } catch { /* auto-login failed, show form */ }
          // If auto-login failed, clear saved data and show form
          localStorage.removeItem(STORAGE_KEY);
          setAutoLoginAttempted(true);
        })();
        return;
      }
    } catch { /* corrupted storage, ignore */ }
    setAutoLoginAttempted(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.authorized && data.token) {
        // Save credentials if "Remember Me" is checked
        if (rememberMe) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: adminId, pwd: password }));
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
        onLoginSuccess(data.token);
      } else {
        setError(data.error || 'ACCESS DENIED.');
        setIsLoading(false);
      }
    } catch {
      setError('Connection failed — try again.');
      setIsLoading(false);
    }
  };

  // Show loading while auto-login is in progress
  if (!autoLoginAttempted) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center font-mono">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-[10px] text-red-600 tracking-[0.3em] uppercase font-bold">
            RESTORING SESSION...
          </span>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 relative overflow-hidden font-mono">
      {/* Background Matrix Effect */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(220,38,38,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(220,38,38,0.05)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-red-900/10 to-transparent pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-[#050505] border border-red-900/50 rounded-xl p-8 shadow-[0_0_50px_rgba(220,38,38,0.15)] relative z-10"
      >
        <button 
          onClick={onBack}
          className="absolute top-4 left-4 text-gray-600 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
        </button>

        <div className="text-center mb-8">
           <motion.div 
             initial={{ y: -10, opacity: 0 }}
             animate={{ y: 0, opacity: 1 }}
             className="inline-block p-4 border border-red-900/30 rounded-full mb-4 bg-red-950/20"
           >
             <ShieldAlert size={32} className="text-red-600 animate-pulse" />
           </motion.div>
           
           <h1 className="text-3xl font-black text-white tracking-tighter mb-1">
             SYSTEM OVERRIDE
           </h1>
           <p className="text-[10px] text-red-500 font-bold tracking-[0.3em] uppercase">
             Restricted Access // Admin Only
           </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] text-red-700 uppercase tracking-widest font-bold ml-1">Admin ID</label>
            <div className="relative group">
              <Terminal className="absolute left-3 top-3.5 text-gray-600 group-focus-within:text-red-500 transition-colors" size={18} />
              <input 
                type="text" 
                value={adminId}
                onChange={(e) => setAdminId(e.target.value)}
                className="w-full bg-black border border-gray-800 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-red-600 focus:shadow-[0_0_15px_rgba(220,38,38,0.3)] transition-all font-mono placeholder:text-gray-800"
                placeholder="IDENTIFY"
                autoFocus
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] text-red-700 uppercase tracking-widest font-bold ml-1">Password</label>
            <div className="relative group">
              <Lock className="absolute left-3 top-3.5 text-gray-600 group-focus-within:text-red-500 transition-colors" size={18} />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black border border-gray-800 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-red-600 focus:shadow-[0_0_15px_rgba(220,38,38,0.3)] transition-all font-mono tracking-widest placeholder:text-gray-800"
                placeholder="••••••••"
              />
            </div>
          </div>

          {/* Remember Me */}
          <label className="flex items-center gap-3 cursor-pointer group select-none">
            <div
              className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                rememberMe
                  ? 'bg-red-600 border-red-600 shadow-[0_0_8px_rgba(220,38,38,0.4)]'
                  : 'border-gray-700 group-hover:border-gray-500'
              }`}
              onClick={() => setRememberMe(!rememberMe)}
            >
              {rememberMe && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5L4.5 7.5L8 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold group-hover:text-gray-300 transition-colors">
              Remember credentials
            </span>
          </label>

          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="bg-red-950/30 border-l-2 border-red-500 p-3 text-xs text-red-400 font-bold flex items-center gap-2"
              >
                <ShieldAlert size={14} className="shrink-0" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-red-900/20 border border-red-900 text-red-500 font-bold py-4 rounded-lg mt-2 hover:bg-red-600 hover:text-black hover:shadow-[0_0_30px_rgba(220,38,38,0.6)] transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
          >
             {isLoading ? 'AUTHENTICATING...' : 'INITIATE OVERRIDE'}
             {!isLoading && <Key size={16} className="group-hover:rotate-90 transition-transform" />}
          </button>
        </form>

        <div className="mt-8 text-center">
           <p className="text-[8px] text-gray-700">
             UNAUTHORIZED ACCESS ATTEMPTS WILL BE LOGGED AND PENALIZED.
           </p>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
