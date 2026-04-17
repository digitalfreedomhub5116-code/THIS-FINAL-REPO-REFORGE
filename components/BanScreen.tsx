
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Lock, Send, CheckCircle, MessageSquare } from 'lucide-react';
import { API_BASE } from '../lib/apiConfig';

interface BanScreenProps {
  userId?: string;
  username?: string;
  onAdminUnban?: () => void;
}

const BanScreen: React.FC<BanScreenProps> = ({ userId, username }) => {
  const [showAppeal, setShowAppeal] = useState(false);
  const [appealText, setAppealText] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error' | 'already'>('idle');
  const MAX_CHARS = 500;

  const submitAppeal = async () => {
    if (!appealText.trim() || appealText.trim().length < 20) return;
    setStatus('sending');
    try {
      const res = await fetch(`${API_BASE}/api/admin/appeals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId,
          username: username || 'Unknown',
          message: appealText.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data?.error?.includes('already')) {
          setStatus('already');
        } else {
          throw new Error(data.error);
        }
        return;
      }
      setStatus('sent');
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
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
              Your Hunter profile has been placed under a permanent restriction following the detection of activity inconsistent with the <span className="text-white font-medium">Fair Play Protocol</span>.
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
                <span className="text-[11px] text-gray-500 font-mono">Strike Count</span>
                <span className="text-[11px] text-red-400 font-mono font-bold">5 / 5</span>
              </div>
            </div>

            <p className="text-gray-600 text-[11px] text-center leading-relaxed font-mono">
              "The System rewards effort, not deception."
            </p>
          </div>

          {/* Appeal section */}
          <div className="px-8 pb-8">
            {status === 'sent' ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-emerald-950/30 border border-emerald-900/40 rounded-xl p-5 text-center"
              >
                <CheckCircle size={20} className="text-emerald-500 mx-auto mb-2" />
                <div className="text-xs font-black text-emerald-400 uppercase tracking-widest mb-1">Appeal Submitted</div>
                <div className="text-[10px] text-gray-500 font-mono">Your appeal has been sent to the admin for review. You will be notified if your account is restored.</div>
              </motion.div>
            ) : status === 'already' ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-amber-950/20 border border-amber-900/30 rounded-xl p-5 text-center"
              >
                <MessageSquare size={20} className="text-amber-500 mx-auto mb-2" />
                <div className="text-xs font-black text-amber-400 uppercase tracking-widest mb-1">Appeal Pending</div>
                <div className="text-[10px] text-gray-500 font-mono">You already have a pending appeal. Please wait for admin review.</div>
              </motion.div>
            ) : (
              <>
                <button
                  onClick={() => setShowAppeal(v => !v)}
                  className="w-full flex items-center justify-center gap-2 text-[10px] font-mono text-gray-400 hover:text-white transition-colors tracking-[0.15em] uppercase py-2.5 bg-gray-900/50 border border-gray-800 rounded-xl hover:border-gray-700"
                >
                  <MessageSquare size={11} />
                  {showAppeal ? 'Close Appeal Form' : 'Submit an Appeal'}
                </button>

                <AnimatePresence>
                  {showAppeal && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-4 space-y-3">
                        <div className="text-[9px] font-mono text-gray-600 uppercase tracking-[0.2em]">
                          Explain why your ban should be reconsidered
                        </div>
                        <textarea
                          value={appealText}
                          onChange={e => setAppealText(e.target.value.slice(0, MAX_CHARS))}
                          placeholder="Write your appeal here... Be honest and explain the situation. Minimum 20 characters."
                          rows={4}
                          className="w-full bg-black border border-gray-800 rounded-xl px-4 py-3 text-xs text-white font-mono focus:border-gray-600 outline-none placeholder-gray-700 resize-none leading-relaxed"
                        />
                        <div className="flex items-center justify-between">
                          <span className={`text-[9px] font-mono ${appealText.length >= MAX_CHARS ? 'text-red-500' : 'text-gray-700'}`}>
                            {appealText.length}/{MAX_CHARS}
                          </span>
                          {appealText.trim().length < 20 && appealText.trim().length > 0 && (
                            <span className="text-[9px] font-mono text-amber-600">Min 20 characters</span>
                          )}
                        </div>
                        <button
                          onClick={submitAppeal}
                          disabled={!appealText.trim() || appealText.trim().length < 20 || status === 'sending'}
                          className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black tracking-[0.15em] uppercase transition-all font-mono
                            ${status === 'sending'
                              ? 'bg-gray-900 border border-gray-800 text-gray-500 cursor-wait'
                              : status === 'error'
                                ? 'bg-red-950/60 border border-red-900 text-red-400'
                                : 'bg-gray-900 border border-gray-700 text-gray-200 hover:border-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed'
                            }`}
                        >
                          <Send size={11} />
                          {status === 'sending' ? 'Submitting Appeal...' :
                           status === 'error' ? 'Failed — Try Again' :
                           'Submit Appeal'}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default BanScreen;
