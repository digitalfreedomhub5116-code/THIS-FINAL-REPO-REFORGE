import React from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, LogIn, UserPlus, X } from 'lucide-react';

interface LogoutChoiceScreenProps {
  onLogout: () => void;
  onCancel: () => void;
}

const LogoutChoiceScreen: React.FC<LogoutChoiceScreenProps> = ({ onLogout, onCancel }) => {
  const handleSelect = (dest: 'CALIBRATION' | 'AUTH_SIGN_IN' | 'AUTH_CREATE') => {
    sessionStorage.setItem('reforge_logout_dest', dest);
    onLogout();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[500] flex items-center justify-center p-6 font-mono"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      {/* Subtle radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 40%, rgba(0,210,255,0.05) 0%, transparent 65%)' }}
      />

      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm flex flex-col items-center gap-5 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute -top-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center text-gray-600 hover:text-gray-300 transition-colors"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <X size={13} />
        </button>

        {/* Header */}
        <div className="text-center space-y-1.5 w-full">
          <div className="text-[9px] tracking-[0.4em] font-bold uppercase text-gray-600">
            Bio-Sync OS · Logging Out
          </div>
          <h1 className="text-xl font-black uppercase tracking-[0.1em] text-white">
            What's Next, Hunter?
          </h1>
          <p className="text-[11px] text-gray-500 tracking-wide">
            Your data is saved. Choose where to go.
          </p>
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-gray-800" />

        {/* Choice buttons */}
        <div className="w-full flex flex-col gap-3">

          {/* RECALIBRATE — primary */}
          <motion.button
            onClick={() => handleSelect('CALIBRATION')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-colors"
            style={{
              background: 'rgba(0,210,255,0.06)',
              border: '1.5px solid rgba(0,210,255,0.35)',
              boxShadow: '0 0 20px rgba(0,210,255,0.07)',
            }}
          >
            <div
              className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(0,210,255,0.12)', border: '1px solid rgba(0,210,255,0.3)' }}
            >
              <RefreshCw size={16} style={{ color: '#00d2ff' }} />
            </div>
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.2em] text-white mb-0.5">
                Recalibrate
              </div>
              <div className="text-[10px] text-gray-500 leading-relaxed">
                Run a new assessment, then log back in
              </div>
            </div>
          </motion.button>

          {/* SIGN IN */}
          <motion.button
            onClick={() => handleSelect('AUTH_SIGN_IN')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-colors"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1.5px solid rgba(255,255,255,0.12)',
            }}
          >
            <div
              className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <LogIn size={16} className="text-white" />
            </div>
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.2em] text-white mb-0.5">
                Sign In
              </div>
              <div className="text-[10px] text-gray-500 leading-relaxed">
                Continue with your existing account
              </div>
            </div>
          </motion.button>

          {/* CREATE ACCOUNT — ghost */}
          <motion.button
            onClick={() => handleSelect('AUTH_CREATE')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-colors"
            style={{
              background: 'transparent',
              border: '1.5px solid rgba(255,255,255,0.07)',
            }}
          >
            <div
              className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <UserPlus size={16} className="text-gray-400" />
            </div>
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-300 mb-0.5">
                Create Account
              </div>
              <div className="text-[10px] text-gray-600 leading-relaxed">
                Start fresh with a new hunter profile
              </div>
            </div>
          </motion.button>

        </div>

        {/* Cancel link */}
        <button
          onClick={onCancel}
          className="text-[10px] uppercase tracking-widest text-gray-600 hover:text-gray-400 transition-colors py-1"
        >
          Cancel — stay in app
        </button>

      </motion.div>
    </motion.div>
  );
};

export default LogoutChoiceScreen;
