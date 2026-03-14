import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield } from 'lucide-react';

interface StrikeLiftedModalProps {
  visible: boolean;
  onAcknowledge: () => void;
}

const StrikeLiftedModal: React.FC<StrikeLiftedModalProps> = ({ visible, onAcknowledge }) => {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" />

          {/* Modal */}
          <motion.div
            className="relative w-[90vw] max-w-md mx-auto"
            initial={{ scale: 0.8, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.1 }}
          >
            {/* Glow border */}
            <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-b from-emerald-500/40 via-emerald-600/20 to-transparent blur-sm" />

            <div className="relative rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 overflow-hidden">
              {/* Top accent line */}
              <div className="h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent" />

              {/* Scanline overlay */}
              <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
                style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)' }}
              />

              <div className="px-6 py-8 flex flex-col items-center text-center">
                {/* Icon */}
                <motion.div
                  className="mb-5 relative"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.3 }}
                >
                  <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl scale-150" />
                  <div className="relative w-16 h-16 rounded-full border-2 border-emerald-400/50 bg-emerald-950/50 flex items-center justify-center">
                    <Shield size={32} className="text-emerald-400" />
                  </div>
                </motion.div>

                {/* Title */}
                <motion.h2
                  className="text-lg font-black tracking-[0.2em] uppercase text-emerald-300 mb-4 font-mono"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  System Review Complete
                </motion.h2>

                {/* Divider */}
                <div className="w-16 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent mb-5" />

                {/* Body */}
                <motion.p
                  className="text-sm text-gray-300 leading-relaxed mb-6 max-w-[320px]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  Your account has been reviewed by The System. One strike has been lifted from your record.
                  <br /><br />
                  This decision reflects our commitment to fair play among all hunters. REFORGE is built on the principle that every achievement must be earned.
                  <br /><br />
                  We are constantly improving our systems to ensure every hunter is treated with accuracy and fairness.
                </motion.p>

                {/* Button */}
                <motion.button
                  onClick={onAcknowledge}
                  className="px-8 py-3 rounded-lg font-mono font-black text-xs uppercase tracking-[0.15em] transition-all border border-emerald-500/50 bg-emerald-950/50 text-emerald-300 hover:bg-emerald-900/60 hover:border-emerald-400/70 hover:shadow-[0_0_20px_rgba(16,185,129,0.2)] active:scale-95"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  whileTap={{ scale: 0.95 }}
                >
                  I Understand
                </motion.button>
              </div>

              {/* Bottom accent line */}
              <div className="h-[1px] bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default StrikeLiftedModal;
