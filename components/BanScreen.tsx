
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Lock, Skull, ShieldCheck, X, Eye, EyeOff } from 'lucide-react';

interface BanScreenProps {
  userId?: string;
  onAdminUnban?: () => void;
}

const OVERRIDE_PASSWORD = 'jayshreekrishna';
const API_TOKEN = 'system_admin_2025';

const BanScreen: React.FC<BanScreenProps> = ({ userId, onAdminUnban }) => {
  const [showOverride, setShowOverride] = useState(false);
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle');

  const handleUnban = async () => {
    if (!password) return;
    if (password !== OVERRIDE_PASSWORD) {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 2000);
      return;
    }
    setStatus('loading');
    try {
      const res = await fetch(`/api/admin/users/${userId}/unban`, {
        method: 'POST',
        headers: { 'x-admin-token': API_TOKEN },
      });
      if (!res.ok) throw new Error('API error');
      setStatus('success');
      setTimeout(() => {
        onAdminUnban?.();
      }, 1000);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center p-6 text-center select-none overflow-hidden">
        {/* Background Glitch */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(220,38,38,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(220,38,38,0.1)_1px,transparent_1px)] bg-[size:20px_20px]" />
        <div className="absolute inset-0 bg-red-900/10 animate-pulse pointer-events-none" />

        <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative z-10 max-w-lg w-full bg-black border-2 border-red-600 p-8 rounded-xl shadow-[0_0_100px_rgba(220,38,38,0.5)]"
        >
            <div className="flex justify-center mb-6">
                <div className="p-6 bg-red-950/50 rounded-full border border-red-600 animate-pulse">
                    <Skull size={64} className="text-red-500" />
                </div>
            </div>

            <h1 className="text-5xl md:text-6xl font-black text-red-600 tracking-tighter uppercase mb-2" style={{ textShadow: "0 0 20px #dc2626" }}>
                SYSTEM LOCKOUT
            </h1>
            
            <div className="h-1 w-full bg-red-600/50 my-6" />

            <h2 className="text-xl text-white font-mono font-bold mb-4 uppercase tracking-widest">
                Account Terminated
            </h2>

            <p className="text-red-400 font-mono text-xs md:text-sm leading-relaxed mb-8">
                Multiple violations of the Fair Play Protocol detected. 
                Your hunter license has been revoked due to excessive XP Boosting and Integrity Violations.
                <br/><br/>
                "The System rewards effort, not deception."
            </p>

            <div className="flex items-center justify-center gap-2 text-[10px] text-gray-500 font-mono border border-gray-800 p-2 rounded bg-gray-900 mb-6">
                <Lock size={12} /> ERROR_CODE: INTEGRITY_FATAL_ERROR
            </div>

            {/* Admin Override Button */}
            <button
                onClick={() => setShowOverride(v => !v)}
                className="text-[9px] font-mono text-gray-700 hover:text-gray-400 transition-colors tracking-widest uppercase flex items-center gap-1.5 mx-auto"
            >
                <ShieldCheck size={11} /> ADMIN OVERRIDE
            </button>
        </motion.div>

        {/* Admin Override Panel */}
        <AnimatePresence>
          {showOverride && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="relative z-10 mt-4 max-w-lg w-full bg-gray-950 border border-gray-700 rounded-xl p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono">
                  System Override — Admin Access
                </span>
                <button onClick={() => { setShowOverride(false); setPassword(''); setStatus('idle'); }}>
                  <X size={14} className="text-gray-600 hover:text-white transition-colors" />
                </button>
              </div>

              <div className="relative mb-3">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleUnban()}
                  placeholder="ENTER ADMIN TOKEN"
                  className="w-full bg-black border border-gray-800 rounded-lg px-4 py-2.5 pr-10 text-xs text-white font-mono focus:border-gray-500 outline-none tracking-widest"
                />
                <button
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300"
                >
                  {showPass ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>

              <button
                onClick={handleUnban}
                disabled={status === 'loading' || status === 'success'}
                className={`w-full py-2.5 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all font-mono
                  ${status === 'success' ? 'bg-green-700 text-white' :
                    status === 'error' ? 'bg-red-900 text-red-300 border border-red-700' :
                    'bg-gray-800 hover:bg-gray-700 text-white'}`}
              >
                {status === 'loading' ? 'VERIFYING...' :
                 status === 'success' ? '✓ ACCOUNT RESTORED' :
                 status === 'error' ? '✗ INVALID TOKEN' :
                 'RESTORE ACCOUNT ACCESS'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
    </div>
  );
};

export default BanScreen;
