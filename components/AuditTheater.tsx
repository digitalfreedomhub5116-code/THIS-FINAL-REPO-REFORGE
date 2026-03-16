import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScanSearch, ShieldAlert, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

interface AuditTheaterProps {
  questTitle: string;
  questRank: string;
  outcome: 'verified' | 'flagged';
  onVerified: () => void;
  onFlagged: () => void;
}

const AuditTheater: React.FC<AuditTheaterProps> = ({
  questTitle,
  questRank,
  outcome,
  onVerified,
  onFlagged
}) => {
  const [phase, setPhase] = useState<'SCANNING' | 'RESULT'>('SCANNING');
  const [scanTextIndex, setScanTextIndex] = useState(0);
  const [canDismiss, setCanDismiss] = useState(false);
  const [countdown, setCountdown] = useState(2);

  const scanLines = [
    'ANALYZING SESSION DATA...',
    'CROSS-REFERENCING HUNTER RECORD...',
    'EVALUATING SUBMISSION INTEGRITY...'
  ];

  // Phase 1: SCANNING logic
  useEffect(() => {
    if (phase !== 'SCANNING') return;

    // Cycle text every 1 second
    const textInterval = setInterval(() => {
      setScanTextIndex(prev => (prev + 1) % scanLines.length);
    }, 1000);

    // End scan phase after exactly 3 seconds
    const scanTimeout = setTimeout(() => {
      setPhase('RESULT');
    }, 3000);

    return () => {
      clearInterval(textInterval);
      clearTimeout(scanTimeout);
    };
  }, [phase]);

  // Phase 2: RESULT logic
  useEffect(() => {
    if (phase !== 'RESULT') return;

    if (outcome === 'verified') {
      setCanDismiss(true); // Verified is available immediately
    } else {
      // Flagged requires a 2-second countdown
      const countdownInterval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            setCanDismiss(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(countdownInterval);
    }
  }, [phase, outcome]);

  const isVerified = outcome === 'verified';
  
  // Theme colors based on outcome for Phase 2
  const themeColor = phase === 'SCANNING' 
    ? { border: 'border-cyan-500/50', text: 'text-cyan-400', glow: 'shadow-[0_0_20px_rgba(6,182,212,0.3)]', bg: 'bg-cyan-950/20' }
    : isVerified 
      ? { border: 'border-green-500/50', text: 'text-green-400', glow: 'shadow-[0_0_25px_rgba(34,197,94,0.3)]', bg: 'bg-green-950/20' }
      : { border: 'border-amber-500/60', text: 'text-amber-500', glow: 'shadow-[0_0_25px_rgba(245,158,11,0.3)]', bg: 'bg-amber-950/20' };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-[400] flex items-center justify-center p-5 font-mono overflow-hidden"
      style={{
        background: phase === 'SCANNING'
            ? 'radial-gradient(circle at 50% 50%, rgba(8,51,68,0.4) 0%, rgba(0,0,0,0.98) 70%, #000 100%)'
            : isVerified
                ? 'radial-gradient(circle at 50% 50%, rgba(20,83,45,0.4) 0%, rgba(0,0,0,0.98) 70%, #000 100%)'
                : 'radial-gradient(circle at 50% 50%, rgba(120,53,15,0.3) 0%, rgba(0,0,0,0.98) 70%, #000 100%)'
      }}
    >
        {/* Ambient Pulse Background */}
        <motion.div
            className="absolute inset-0 pointer-events-none"
            animate={{ opacity: [0.03, 0.08, 0.03] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            style={{
                background: phase === 'SCANNING'
                    ? 'radial-gradient(ellipse at 50% 40%, rgba(6,182,212,0.15) 0%, transparent 70%)'
                    : isVerified
                        ? 'radial-gradient(ellipse at 50% 40%, rgba(34,197,94,0.15) 0%, transparent 70%)'
                        : 'radial-gradient(ellipse at 50% 40%, rgba(245,158,11,0.15) 0%, transparent 70%)'
            }}
        />

        {/* Scan lines overlay */}
        <div
            className="absolute inset-0 pointer-events-none opacity-[0.04]"
            style={{
                backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.2) 2px, rgba(255,255,255,0.2) 3px)',
            }}
        />

        <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className={`w-full max-w-md relative z-10 p-6 rounded-xl border ${themeColor.border} ${themeColor.bg} backdrop-blur-md ${themeColor.glow} transition-colors duration-700`}
        >
            <AnimatePresence mode="wait">
                {/* ── PHASE 1: SCANNING ── */}
                {phase === 'SCANNING' && (
                    <motion.div
                        key="scanning"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                        className="flex flex-col items-center py-4"
                    >
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                            className="text-cyan-400 mb-6 drop-shadow-[0_0_15px_rgba(6,182,212,0.6)]"
                        >
                            <ScanSearch size={48} strokeWidth={1.5} />
                        </motion.div>
                        
                        <h2 className="text-cyan-400 text-lg font-black tracking-[0.2em] mb-2 uppercase text-center">
                            FORGEGUARD AUDIT
                        </h2>
                        
                        <p className="text-gray-400 text-xs tracking-widest font-mono mb-8 text-center max-w-[280px] leading-relaxed">
                            {questTitle}
                        </p>

                        <div className="w-full bg-black/50 rounded-lg p-3 border border-cyan-900/50 flex items-center justify-center h-[50px]">
                            <motion.span
                                key={scanTextIndex}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                className="text-[10px] text-cyan-300/80 font-mono tracking-widest uppercase"
                            >
                                {scanLines[scanTextIndex]}
                            </motion.span>
                        </div>
                        
                        {/* Progress Bar visual */}
                        <div className="w-full h-1 bg-black/60 rounded-full mt-6 overflow-hidden">
                            <motion.div 
                                className="h-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.8)]"
                                initial={{ width: "0%" }}
                                animate={{ width: ["0%", "60%", "65%", "95%", "100%"] }}
                                transition={{ 
                                    duration: 3, 
                                    times: [0, 0.4, 0.7, 0.9, 1],
                                    ease: "easeInOut"
                                }}
                            />
                        </div>
                    </motion.div>
                )}

                {/* ── PHASE 2: RESULT ── */}
                {phase === 'RESULT' && (
                    <motion.div
                        key="result"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="flex flex-col items-center py-2"
                    >
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', damping: 12, delay: 0.2 }}
                            className={`${themeColor.text} mb-5 drop-shadow-[0_0_15px_currentColor]`}
                        >
                            {isVerified ? <ShieldCheck size={56} strokeWidth={1.5} /> : <AlertTriangle size={56} strokeWidth={1.5} />}
                        </motion.div>

                        <h2 className={`${themeColor.text} text-2xl font-black tracking-[0.2em] mb-2 uppercase text-center`}>
                            {isVerified ? 'VERIFIED' : 'FLAGGED'}
                        </h2>

                        <p className="text-gray-400 text-[11px] tracking-wider font-mono mb-6 text-center leading-relaxed">
                            {isVerified 
                                ? 'Integrity scan complete. No anomalies detected in completion pattern. Rewards authorized.' 
                                : 'Irregular completion timing detected. ForgeGuard has logged this interaction. Rewards granted, but record noted.'}
                        </p>

                        <motion.button
                            onClick={canDismiss ? (isVerified ? onVerified : onFlagged) : undefined}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: canDismiss ? 1 : 0.4 }}
                            transition={{ duration: 0.3 }}
                            whileTap={canDismiss ? { scale: 0.96 } : {}}
                            className={`w-full py-4 rounded-xl font-black text-sm uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2 ${
                                canDismiss
                                    ? isVerified
                                        ? 'bg-green-600/20 border border-green-500/50 text-green-400 hover:bg-green-600/30 hover:shadow-[0_0_20px_rgba(34,197,94,0.3)] cursor-pointer'
                                        : 'bg-amber-600/20 border border-amber-500/50 text-amber-400 hover:bg-amber-600/30 hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] cursor-pointer'
                                    : 'bg-black/40 border border-gray-800 text-gray-600 cursor-not-allowed'
                            }`}
                        >
                            {isVerified && <CheckCircle2 size={16} />}
                            {!isVerified && !canDismiss && <ShieldAlert size={16} />}
                            {isVerified ? 'CLAIM REWARDS' : (canDismiss ? 'UNDERSTOOD' : `LOCK ENGAGED (${countdown})`)}
                        </motion.button>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>

        {/* ── Corner Readouts ── */}
        <div className="absolute top-4 left-4 text-[8px] text-gray-600 font-mono tracking-widest">
            FORGEGUARD // {phase}
        </div>
        <div className="absolute bottom-4 right-4 text-[8px] text-gray-600 font-mono tracking-widest uppercase">
            RANK: {questRank}
        </div>
    </motion.div>
  );
};

export default AuditTheater;
