import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, AlertTriangle, Ban } from 'lucide-react';

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

  const isBanned = cheatStrikes >= 5;
  const hasStrikes = cheatStrikes > 0;
  const isDanger = cheatStrikes >= 3;

  // Compute trust score (visual only)
  const trustScore = Math.max(0, 100 - cheatStrikes * 20);

  const borderColor = isBanned
    ? 'rgba(239,68,68,0.35)'
    : isDanger
      ? 'rgba(239,68,68,0.2)'
      : hasStrikes
        ? 'rgba(251,191,36,0.15)'
        : 'rgba(255,255,255,0.06)';

  const bgColor = isBanned
    ? 'rgba(239,68,68,0.04)'
    : 'rgba(255,255,255,0.015)';

  return (
    <div
      className="relative rounded-2xl overflow-hidden select-none"
      style={{
        background: bgColor,
        border: `1px solid ${borderColor}`,
      }}
    >
      {/* Subtle scanline texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.015]"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.1) 3px, rgba(255,255,255,0.1) 4px)' }}
      />

      {/* Banned pulsing overlay */}
      {isBanned && (
        <motion.div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{ border: '1px solid rgba(239,68,68,0.4)' }}
          animate={{ opacity: [0.2, 0.6, 0.2] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      <div className="px-4 py-3.5">
        {/* Top row: icon + title + trust score */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{
                background: hasStrikes ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${hasStrikes ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.08)'}`,
              }}
            >
              {isBanned
                ? <Ban size={11} className="text-red-400" />
                : <ShieldAlert size={11} className={hasStrikes ? 'text-red-400' : 'text-gray-500'} />
              }
            </div>
            <span className={`font-mono text-[9px] font-bold tracking-[0.15em] uppercase ${hasStrikes ? 'text-red-400/90' : 'text-gray-500'}`}>
              ForgeGuard
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] text-gray-600">
              trust
            </span>
            <span className={`font-mono text-xs font-black ${
              isBanned ? 'text-red-500' : isDanger ? 'text-red-400' : hasStrikes ? 'text-amber-400' : 'text-green-500/70'
            }`}>
              {trustScore}%
            </span>
          </div>
        </div>

        {/* Strike dots row */}
        <div className="flex items-center gap-3 mb-2.5">
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
                      {/* Glow */}
                      <motion.div
                        className="absolute inset-0 rounded-full bg-red-500"
                        animate={isNewlyFilled
                          ? { opacity: [0, 0.6, 0.15], scale: [1, 2.5, 1.4] }
                          : { opacity: [0.1, 0.25, 0.1] }
                        }
                        transition={isNewlyFilled
                          ? { duration: 0.6, ease: 'easeOut' }
                          : { duration: 3.5, repeat: Infinity, ease: 'easeInOut' }
                        }
                        style={{ filter: 'blur(3px)' }}
                      />
                      <div
                        className="relative w-2.5 h-2.5 rounded-full bg-red-500"
                        style={{ boxShadow: '0 0 4px rgba(239,68,68,0.5)' }}
                      />
                    </motion.div>
                  ) : (
                    <div
                      key={`empty-${i}`}
                      className="w-2.5 h-2.5 rounded-full"
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }}
                    />
                  )}
                </AnimatePresence>
              );
            })}
          </div>

          <span className="font-mono text-[11px] font-black text-white/60 tracking-wide">
            {cheatStrikes}/5
          </span>

          {totalStrikesEver > 0 && (
            <span className="font-mono text-[8px] text-gray-700 ml-auto">
              lifetime: {totalStrikesEver}
            </span>
          )}
        </div>

        {/* Warning line — always visible */}
        <div className="flex items-start gap-1.5">
          {isBanned ? (
            <div className="flex items-center gap-1.5">
              <Ban size={9} className="text-red-500 flex-shrink-0 mt-px" />
              <span className="font-mono text-[9px] text-red-400 font-bold tracking-wide uppercase">
                ACCOUNT PERMANENTLY BANNED — 5 STRIKES REACHED
              </span>
            </div>
          ) : isDanger ? (
            <div className="flex items-center gap-1.5">
              <AlertTriangle size={9} className="text-red-400 flex-shrink-0 mt-px" />
              <span className="font-mono text-[9px] text-red-400/80 tracking-wide">
                {5 - cheatStrikes} strike{5 - cheatStrikes > 1 ? 's' : ''} remaining before permanent ban
              </span>
            </div>
          ) : hasStrikes ? (
            <div className="flex items-center gap-1.5">
              <AlertTriangle size={9} className="text-amber-500/70 flex-shrink-0 mt-px" />
              <span className="font-mono text-[9px] text-amber-400/60 tracking-wide">
                Cheating quests = strike. 5 strikes = permanent ban.
              </span>
            </div>
          ) : (
            <span className="font-mono text-[9px] text-gray-600 tracking-wide">
              Completing quests dishonestly results in strikes. <span className="text-gray-500 font-bold">5 strikes = permanent ban.</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgeGuardWidget;
