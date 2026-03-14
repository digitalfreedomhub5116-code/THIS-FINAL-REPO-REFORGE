
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Lock, ShieldAlert, Eye, EyeOff, ChevronDown } from 'lucide-react';

interface BanScreenProps {
  userId?: string;
  onAdminUnban?: () => void;
}

const BanScreen: React.FC<BanScreenProps> = ({ userId, onAdminUnban }) => {
  const [showOverride, setShowOverride] = useState(false);
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle');

  const handleUnban = async () => {
    if (!password) return;
    setStatus('loading');
    try {
      const verifyRes = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyData.authorized || !verifyData.token) {
        setStatus('error');
        setTimeout(() => setStatus('idle'), 2000);
        return;
      }
      const res = await fetch(`/api/admin/users/${userId}/unban`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${verifyData.token}` },
      });
      if (!res.ok) throw new Error('API error');
      setStatus('success');
      setTimeout(() => { onAdminUnban?.(); }, 1200);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-[#030303] flex flex-col items-center justify-center p-4 select-none overflow-hidden">

      {/* Subtle background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:40px_40px]" />
      {/* Top vignette glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-red-900/10 blur-[80px] pointer-events-none rounded-full" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Main card */}
        <div className="bg-[#0a0a0a] border border-gray-800 rounded-2xl overflow-hidden shadow-[0_32px_64px_rgba(0,0,0,0.8)]">

          {/* Top accent */}
          <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-red-800/80 to-transparent" />

          {/* Icon + heading */}
          <div className="px-8 pt-10 pb-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-950/40 border border-red-900/50 mb-6">
              <ShieldAlert size={28} className="text-red-500" />
            </div>

            <div className="text-[9px] text-red-600/80 font-mono font-bold tracking-[0.25em] uppercase mb-3">
              ForgeGuard · Enforcement Division
            </div>

            <h1 className="text-2xl font-black text-white tracking-tight mb-1">
              Access Suspended
            </h1>
            <p className="text-gray-500 text-xs font-mono tracking-wider">
              ACCOUNT_STATUS: RESTRICTED
            </p>
          </div>

          {/* Divider */}
          <div className="mx-8 h-[1px] bg-gray-800/60" />

          {/* Body */}
          <div className="px-8 py-7 space-y-4">
            <p className="text-gray-400 text-sm leading-relaxed text-center">
              Your Hunter profile has been placed under a temporary restriction following the detection of activity inconsistent with the <span className="text-white font-medium">Fair Play Protocol</span>.
            </p>

            <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-[10px] font-mono text-gray-600 uppercase tracking-widest">
                <Lock size={10} className="text-gray-700" />
                Restriction Details
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-gray-500 font-mono">Status</span>
                <span className="text-[11px] text-red-400 font-mono font-bold">INTEGRITY VIOLATION</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-gray-500 font-mono">Enforcement</span>
                <span className="text-[11px] text-gray-300 font-mono">ForgeGuard v2</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-gray-500 font-mono">Appeal</span>
                <span className="text-[11px] text-gray-500 font-mono">Contact Support</span>
              </div>
            </div>

            <p className="text-gray-600 text-[11px] text-center leading-relaxed font-mono">
              "The System rewards effort, not deception."
            </p>
          </div>

          {/* Bottom */}
          <div className="px-8 pb-8">
            <button
              onClick={() => setShowOverride(v => !v)}
              className="w-full flex items-center justify-center gap-1.5 text-[9px] font-mono text-gray-700 hover:text-gray-500 transition-colors tracking-[0.2em] uppercase py-2"
            >
              <Shield size={9} />
              Admin Override
              <ChevronDown size={9} className={`transition-transform ${showOverride ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* Admin override panel */}
        <AnimatePresence>
          {showOverride && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="mt-3 bg-[#0a0a0a] border border-gray-800 rounded-2xl overflow-hidden"
            >
              <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-gray-700 to-transparent" />
              <div className="p-5 space-y-3">
                <div className="text-[9px] font-mono text-gray-600 uppercase tracking-[0.2em] mb-1">
                  System Override · Authorized Personnel Only
                </div>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleUnban()}
                    placeholder="Enter admin credential"
                    className="w-full bg-black border border-gray-800 rounded-xl px-4 py-3 pr-10 text-xs text-white font-mono focus:border-gray-600 outline-none placeholder-gray-700 tracking-wider"
                  />
                  <button
                    onClick={() => setShowPass(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-700 hover:text-gray-400 transition-colors"
                  >
                    {showPass ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
                <button
                  onClick={handleUnban}
                  disabled={!password || status === 'loading' || status === 'success'}
                  className={`w-full py-3 rounded-xl text-[10px] font-black tracking-[0.15em] uppercase transition-all font-mono
                    ${status === 'success' ? 'bg-emerald-900/60 border border-emerald-800 text-emerald-400' :
                      status === 'error' ? 'bg-red-950/60 border border-red-900 text-red-400' :
                      status === 'loading' ? 'bg-gray-900 border border-gray-800 text-gray-500' :
                      'bg-gray-900 border border-gray-700 text-gray-200 hover:border-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed'}`}
                >
                  {status === 'loading' ? 'Verifying Credential...' :
                   status === 'success' ? '✓ Access Restored' :
                   status === 'error' ? '✗ Invalid Credential' :
                   'Restore Account Access'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default BanScreen;
