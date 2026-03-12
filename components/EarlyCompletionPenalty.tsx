import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, Clock, AlertTriangle, CheckCircle } from 'lucide-react';

interface EarlyCompletionPenaltyProps {
  questTitle: string;
  elapsedMinutes: number;
  minDurationMinutes: number;
  currentStrikes: number;
  onAcknowledge: () => void;
}

const EarlyCompletionPenalty: React.FC<EarlyCompletionPenaltyProps> = ({
  questTitle, elapsedMinutes, minDurationMinutes, currentStrikes, onAcknowledge
}) => {
  const [scanning, setScanning] = useState(true);
  const [canAck, setCanAck] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setScanning(false), 1800);
    const t2 = setTimeout(() => setCanAck(true), 2500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const elapsedStr = elapsedMinutes < 1
    ? `${Math.round(elapsedMinutes * 60)}s`
    : `${elapsedMinutes.toFixed(1)}m`;

  const percentComplete = Math.round((elapsedMinutes / minDurationMinutes) * 100);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] bg-black flex flex-col items-center justify-center p-6 font-mono"
      style={{ background: 'radial-gradient(ellipse at center, rgba(220,38,38,0.08) 0%, #000 70%)' }}
    >
      {/* Scan line animation */}
      <motion.div
        className="absolute top-0 left-0 w-full h-0.5 bg-red-500/60"
        animate={{ y: scanning ? ['0vh', '100vh'] : '100vh' }}
        transition={{ duration: 1.8, ease: 'linear' }}
      />

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-full border-2 border-red-500/50 bg-red-500/10 mb-4"
          >
            <ShieldAlert size={36} className="text-red-500" />
          </motion.div>
          <h1 className="text-2xl font-black text-red-500 tracking-widest uppercase mb-1">
            ANOMALY DETECTED
          </h1>
          <p className="text-[10px] text-red-400/60 tracking-widest">FORGEGUARD ANTI-CHEAT SYSTEM</p>
        </div>

        {/* Quest info */}
        <div className="bg-gray-950 border border-red-900/50 rounded-2xl p-5 mb-5 space-y-4">
          <div className="space-y-1">
            <p className="text-[9px] text-gray-600 uppercase tracking-widest">Quest</p>
            <p className="text-white text-sm font-bold">{questTitle}</p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-1">Elapsed</p>
              <p className="text-red-400 font-black text-lg">{elapsedStr}</p>
            </div>
            <div className="text-center">
              <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-1">Minimum</p>
              <p className="text-gray-300 font-black text-lg">{minDurationMinutes}m</p>
            </div>
            <div className="text-center">
              <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-1">Progress</p>
              <p className="text-amber-400 font-black text-lg">{percentComplete}%</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(percentComplete, 100)}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
              className="h-full bg-red-500 rounded-full"
            />
          </div>
        </div>

        {/* Warning message */}
        <div className="bg-red-950/30 border border-red-900/40 rounded-xl p-4 mb-4">
          <div className="flex items-start gap-2">
            <AlertTriangle size={14} className="text-red-400 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-[11px] text-red-300 font-bold uppercase tracking-wide">Anomaly Logged by ForgeGuard</p>
              <p className="text-[10px] text-red-400/80 leading-relaxed">
                This quest was completed in {elapsedStr}, below the ForgeGuard minimum of {minDurationMinutes} minutes.
                Acknowledging this flag will issue an <span className="text-red-300 font-bold">Anomaly Strike</span> and close this quest with <span className="text-red-300 font-bold">0 XP and 0 Gold</span>.
              </p>
            </div>
          </div>
        </div>

        {/* Strike countdown */}
        <div className="bg-black/60 border border-red-900/30 rounded-xl p-3 mb-5 flex items-center justify-between">
          <span className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Anomaly Strikes</span>
          <span className={`text-xs font-black font-mono ${currentStrikes >= 3 ? 'text-red-400' : 'text-amber-400'}`}>
            {currentStrikes + 1} / 5
            {5 - (currentStrikes + 1) > 0
              ? ` — ${5 - (currentStrikes + 1)} remaining before permanent ban`
              : ' — THIS IS YOUR FINAL VIOLATION'}
          </span>
        </div>

        {/* Acknowledge button */}
        <motion.button
          onClick={canAck ? onAcknowledge : undefined}
          initial={{ opacity: 0 }}
          animate={{ opacity: canAck ? 1 : 0.3 }}
          transition={{ duration: 0.4 }}
          whileTap={canAck ? { scale: 0.97 } : {}}
          className={`w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
            canAck
              ? 'bg-red-600 hover:bg-red-500 text-white cursor-pointer shadow-[0_0_20px_rgba(220,38,38,0.3)]'
              : 'bg-gray-900 text-gray-600 cursor-not-allowed'
          }`}
        >
          <CheckCircle size={16} />
          I ACKNOWLEDGE
        </motion.button>

        <p className="text-center text-[9px] text-gray-700 mt-3 uppercase tracking-widest">
          {canAck ? 'Quest closed · 0 XP · 0 Gold · Anomaly Strike issued' : 'Processing anomaly report...'}
        </p>
      </motion.div>

      {/* Corner decorations */}
      <div className="absolute top-4 left-4 text-[9px] text-red-900 font-mono">
        <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ duration: 1.2, repeat: Infinity }}>
          ■ FORGEGUARD ACTIVE
        </motion.span>
      </div>
      <div className="absolute top-4 right-4 text-[9px] text-red-900 font-mono">
        <Clock size={10} className="inline mr-1" />
        {new Date().toLocaleTimeString()}
      </div>
    </motion.div>
  );
};

export default EarlyCompletionPenalty;
