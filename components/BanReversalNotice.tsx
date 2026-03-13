
import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Eye, AlertTriangle } from 'lucide-react';

interface BanReversalNoticeProps {
  onClose: () => void;
}

const BanReversalNotice: React.FC<BanReversalNoticeProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative max-w-lg w-full"
      >
        {/* Card */}
        <div className="bg-[#080808] border border-gray-800 rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.8)]">

          {/* Top accent bar */}
          <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />

          {/* Header */}
          <div className="px-8 pt-8 pb-6 border-b border-gray-800/60">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-950/50 border border-emerald-800/60 flex items-center justify-center flex-shrink-0">
                <ShieldCheck size={20} className="text-emerald-400" />
              </div>
              <div>
                <div className="text-[9px] text-emerald-500 font-mono font-bold tracking-[0.2em] uppercase mb-0.5">
                  ForgeGuard Integrity Division
                </div>
                <h2 className="text-white font-black text-lg tracking-tight leading-tight">
                  Account Access Restored
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[9px] font-mono text-gray-600 tracking-widest uppercase">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Official Notice · Automated Enforcement System
            </div>
          </div>

          {/* Body */}
          <div className="px-8 py-6 space-y-4">
            <p className="text-gray-300 text-sm leading-relaxed">
              Following a formal review of your account, the disciplinary restriction applied to your Hunter profile has been successfully reversed. This decision was reached upon careful evaluation of the circumstances surrounding the flagged activity by our review board.
            </p>
            <p className="text-gray-400 text-sm leading-relaxed">
              Please be advised that this is a singular consideration extended in good faith. <span className="text-white font-semibold">ForgeGuard</span> — the System's dedicated integrity enforcement engine — continuously monitors all platform activity to maintain equal and fair conditions for every registered Hunter. No activity goes unobserved.
            </p>

            {/* Warning block */}
            <div className="bg-amber-950/20 border border-amber-900/40 rounded-xl p-4 flex gap-3">
              <AlertTriangle size={15} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-amber-200/80 text-xs leading-relaxed">
                Any future conduct deemed to be in violation of the <span className="font-bold text-amber-300">Fair Play Protocol</span> will result in immediate and permanent corrective action, with no provision for further appeal. We strongly advise adherence to all platform guidelines going forward.
              </p>
            </div>

            <p className="text-gray-500 text-xs leading-relaxed">
              We trust that you understand the gravity of this notice and will conduct yourself with the integrity expected of every Hunter within the System.
            </p>
          </div>

          {/* Footer */}
          <div className="px-8 pb-8 space-y-3">
            <button
              onClick={onClose}
              className="w-full py-3.5 bg-white text-black text-xs font-black tracking-[0.15em] uppercase rounded-xl hover:bg-gray-100 active:scale-[0.98] transition-all"
            >
              I Understand
            </button>
            <div className="flex items-center justify-center gap-2 text-[9px] text-gray-700 font-mono tracking-widest uppercase">
              <Eye size={9} />
              ForgeGuard is watching · Fair Play Enforcement Active
            </div>
          </div>

        </div>
      </motion.div>
    </div>
  );
};

export default BanReversalNotice;
