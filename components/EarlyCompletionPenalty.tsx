import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface EarlyCompletionPenaltyProps {
  questTitle: string;
  elapsedMinutes: number;
  minDurationMinutes: number;
  currentStrikes: number;
  onAcknowledge: () => void;
}

/* ── SVG Geometric Eye ── */
const DuskEye: React.FC = () => (
  <svg viewBox="0 0 120 80" width="120" height="80" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Outer eye shape */}
    <path
      d="M60 8 C30 8 6 40 6 40 C6 40 30 72 60 72 C90 72 114 40 114 40 C114 40 90 8 60 8Z"
      stroke="currentColor" strokeWidth="2.5" fill="none"
    />
    {/* Inner iris ring */}
    <circle cx="60" cy="40" r="16" stroke="currentColor" strokeWidth="2" fill="none" />
    {/* Pupil */}
    <circle cx="60" cy="40" r="7" fill="currentColor" />
    {/* Angular accent lines */}
    <line x1="20" y1="40" x2="38" y2="40" stroke="currentColor" strokeWidth="1" opacity="0.4" />
    <line x1="82" y1="40" x2="100" y2="40" stroke="currentColor" strokeWidth="1" opacity="0.4" />
  </svg>
);

const EarlyCompletionPenalty: React.FC<EarlyCompletionPenaltyProps> = ({
  questTitle, currentStrikes, onAcknowledge
}) => {
  const [canAck, setCanAck] = useState(false);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setRevealed(true), 800);
    const t2 = setTimeout(() => setCanAck(true), 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const nextStrike = currentStrikes + 1;
  const strikeColor = nextStrike >= 3 ? 'text-red-500' : 'text-amber-400';
  const strikeBorderColor = nextStrike >= 3 ? 'border-red-600/60' : 'border-amber-500/40';
  const strikeGlow = nextStrike >= 3
    ? 'shadow-[0_0_15px_rgba(220,38,38,0.25)]'
    : 'shadow-[0_0_10px_rgba(245,158,11,0.15)]';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="fixed inset-0 z-[300] flex flex-col items-center justify-center p-5 font-mono overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at 50% 30%, rgba(127,29,29,0.15) 0%, rgba(10,0,0,0.98) 60%, #000 100%)',
      }}
    >
      {/* Ambient red vignette pulse */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{ opacity: [0.03, 0.08, 0.03] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          background: 'radial-gradient(ellipse at 50% 40%, rgba(220,38,38,0.12) 0%, transparent 70%)',
        }}
      />

      {/* Subtle horizontal scan lines */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,0,0,0.15) 2px, rgba(255,0,0,0.15) 3px)',
        }}
      />

      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md relative z-10"
      >
        {/* ── Eye Icon ── */}
        <div className="flex justify-center mb-6">
          <motion.div
            animate={{ scale: [1, 1.06, 1], opacity: [0.85, 1, 0.85] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="text-red-500 relative"
            style={{ filter: 'drop-shadow(0 0 20px rgba(220,38,38,0.4))' }}
          >
            <DuskEye />
          </motion.div>
        </div>

        {/* ── Title ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="text-center mb-2"
        >
          <h1 className="text-[18px] sm:text-xl font-black text-red-500 tracking-[0.2em] uppercase leading-tight">
            DUSK HAS FLAGGED THIS SUBMISSION
          </h1>
        </motion.div>

        {/* Quest name */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.4 }}
          className="text-center text-xs text-gray-400 tracking-widest mb-7 font-mono"
        >
          {questTitle}
        </motion.p>

        {/* ── Main body card ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: revealed ? 1 : 0, y: revealed ? 0 : 12 }}
          transition={{ duration: 0.6 }}
          className="bg-[#0a0000]/80 border border-red-900/50 rounded-lg p-5 mb-4 backdrop-blur-sm"
        >
          <p className="text-[12px] text-gray-300 leading-relaxed tracking-wide">
            An anomaly has been recorded in your session data.{' '}
            <span className="text-red-400 font-bold">DUSK does not tolerate deception.</span>{' '}
            This violation has been logged permanently against your hunter profile.
          </p>
          <p className="text-[11px] text-amber-400/90 leading-relaxed tracking-wide mt-4">
            Acknowledging this flag will issue an Anomaly Strike. Continued violations will result in permanent account termination.
          </p>
        </motion.div>

        {/* ── Anomaly Record ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: revealed ? 1 : 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className={`bg-black/70 border ${strikeBorderColor} rounded-lg p-4 mb-5 ${strikeGlow}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-500 uppercase tracking-[0.25em]">Anomaly Record</span>
            <span className={`text-sm font-black tracking-widest ${strikeColor}`}>
              {nextStrike} / 5
            </span>
          </div>
          {nextStrike >= 5 ? (
            <p className="text-[10px] text-red-400 mt-2 tracking-wide font-bold uppercase">
              Final violation — account termination imminent
            </p>
          ) : nextStrike >= 3 ? (
            <p className="text-[10px] text-red-400/70 mt-2 tracking-wide">
              {5 - nextStrike} violation{5 - nextStrike !== 1 ? 's' : ''} remaining before permanent ban
            </p>
          ) : (
            <p className="text-[10px] text-amber-400/50 mt-2 tracking-wide">
              {5 - nextStrike} violation{5 - nextStrike !== 1 ? 's' : ''} remaining before permanent ban
            </p>
          )}
        </motion.div>

        {/* ── Accept Consequence button ── */}
        <motion.button
          onClick={canAck ? onAcknowledge : undefined}
          initial={{ opacity: 0 }}
          animate={{ opacity: canAck ? 1 : 0.25 }}
          transition={{ duration: 0.5 }}
          whileTap={canAck ? { scale: 0.97 } : {}}
          whileHover={canAck ? { backgroundColor: 'rgba(153,27,27,0.9)' } : {}}
          className={`w-full py-4 rounded-lg font-black text-[13px] uppercase tracking-[0.2em] transition-all font-mono ${
            canAck
              ? 'bg-[#7f1d1d]/70 border border-red-700/60 text-red-100 cursor-pointer shadow-[0_0_25px_rgba(220,38,38,0.2)]'
              : 'bg-gray-950 border border-gray-800/50 text-gray-700 cursor-not-allowed'
          }`}
        >
          ACCEPT CONSEQUENCE
        </motion.button>
      </motion.div>

      {/* ── Corner system readout ── */}
      <div className="absolute top-4 left-4 text-[8px] text-red-900/60 font-mono tracking-widest">
        <motion.span animate={{ opacity: [0.4, 0.8, 0.4] }} transition={{ duration: 2, repeat: Infinity }}>
          DUSK // ACTIVE
        </motion.span>
      </div>
      <div className="absolute bottom-4 right-4 text-[8px] text-red-900/40 font-mono tracking-widest">
        VIOLATION LOGGED
      </div>
    </motion.div>
  );
};

export default EarlyCompletionPenalty;
