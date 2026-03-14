import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert } from 'lucide-react';

interface ForgeGuardWidgetProps {
  cheatStrikes: number;
  totalStrikesEver: number;
}

const ForgeGuardWidget: React.FC<ForgeGuardWidgetProps> = ({ cheatStrikes, totalStrikesEver }) => {
  const prevStrikesRef = useRef(cheatStrikes);
  const isNewStrike = cheatStrikes > prevStrikesRef.current;

  useEffect(() => {
    prevStrikesRef.current = cheatStrikes;
  }, [cheatStrikes]);

  const isFlagged = cheatStrikes >= 5;
  const hasStrikes = cheatStrikes > 0;

  const statusText = isFlagged
    ? 'ACCOUNT FLAGGED'
    : cheatStrikes === 0
      ? 'CLEAN RECORD'
      : cheatStrikes === 1
        ? '1 STRIKE RECORDED'
        : `${cheatStrikes} STRIKES RECORDED`;

  const labelColor = hasStrikes ? 'text-red-400' : 'text-purple-400/70';
  const statusColor = isFlagged ? 'text-red-400' : hasStrikes ? 'text-red-400/80' : 'text-gray-600';

  return (
    <div
      className="relative rounded-2xl p-4 overflow-hidden select-none pointer-events-none"
      style={{
        background: 'rgba(15,15,26,0.9)',
        border: isFlagged
          ? '1px solid rgba(239,68,68,0.4)'
          : '1px solid rgba(139,92,246,0.15)',
        boxShadow: isFlagged
          ? '0 0 25px rgba(239,68,68,0.12)'
          : '0 0 20px rgba(139,92,246,0.06)',
      }}
    >
      {/* Flagged pulsing border overlay */}
      {isFlagged && (
        <motion.div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{ border: '1px solid rgba(239,68,68,0.5)' }}
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* Subtle scanline */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.02]"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)' }}
      />

      {/* Header row */}
      <div className="flex items-center gap-2 mb-3">
        <ShieldAlert size={12} className={labelColor} />
        <span className={`font-mono text-[9px] font-bold tracking-[0.2em] uppercase ${labelColor}`}>
          ForgeGuard Integrity
        </span>
      </div>

      {/* Strike dots */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          {Array.from({ length: 5 }).map((_, i) => {
            const isFilled = i < cheatStrikes;
            const isNewlyFilled = isNewStrike && i === cheatStrikes - 1;

            return (
              <AnimatePresence key={i} mode="wait">
                {isFilled ? (
                  <motion.div
                    key={`filled-${i}`}
                    className="relative"
                    initial={isNewlyFilled ? { scale: 0 } : { scale: 1 }}
                    animate={{ scale: 1 }}
                    transition={isNewlyFilled ? { type: 'spring', stiffness: 400, damping: 12, delay: 0.1 } : { duration: 0 }}
                  >
                    {/* Glow behind */}
                    <motion.div
                      className="absolute inset-0 rounded-full bg-red-500"
                      animate={isNewlyFilled
                        ? { opacity: [0, 0.6, 0.2], scale: [1, 2.2, 1.4] }
                        : { opacity: [0.15, 0.35, 0.15] }
                      }
                      transition={isNewlyFilled
                        ? { duration: 0.6, ease: 'easeOut' }
                        : { duration: 3, repeat: Infinity, ease: 'easeInOut' }
                      }
                      style={{ filter: 'blur(4px)' }}
                    />
                    {/* Dot */}
                    <motion.div
                      className="relative w-3 h-3 rounded-full bg-red-500 border border-red-400/50"
                      animate={{ opacity: [0.8, 1, 0.8] }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                      style={{ boxShadow: '0 0 6px rgba(239,68,68,0.6)' }}
                    />
                  </motion.div>
                ) : (
                  <div
                    key={`empty-${i}`}
                    className="w-3 h-3 rounded-full border"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      borderColor: 'rgba(139,92,246,0.25)',
                    }}
                  />
                )}
              </AnimatePresence>
            );
          })}
        </div>

        {/* Fraction counter */}
        <span className="font-mono text-sm font-black text-white/80 tracking-wide ml-1">
          [ {cheatStrikes} / 5 ]
        </span>

        {/* Lifetime counter */}
        <span className="font-mono text-[9px] text-gray-600 ml-auto">
          lifetime: {totalStrikesEver}
        </span>
      </div>

      {/* Status text */}
      <div className={`font-mono text-[10px] tracking-[0.15em] uppercase ${statusColor}`}>
        {statusText}
      </div>
    </div>
  );
};

export default ForgeGuardWidget;
