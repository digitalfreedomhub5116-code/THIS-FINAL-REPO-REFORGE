import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface LeaguePromotionOverlayProps {
  promoted: boolean;
  relegated: boolean;
  previousTier: string;
  currentTier: string;
  onDismiss: () => void;
}

const TIER_INFO: Record<string, { name: string; icon: string; color: string }> = {
  E: { name: 'E-Rank', icon: '⚔️', color: '#78716C' },
  D: { name: 'D-Rank', icon: '🗡️', color: '#F97316' },
  C: { name: 'C-Rank', icon: '🔵', color: '#60A5FA' },
  B: { name: 'B-Rank', icon: '💠', color: '#00d4ff' },
  A: { name: 'A-Rank', icon: '🌟', color: '#EAB308' },
  S: { name: 'S-Rank', icon: '💎', color: '#A855F7' },
};

const LeaguePromotionOverlay: React.FC<LeaguePromotionOverlayProps> = ({
  promoted, relegated, previousTier, currentTier, onDismiss,
}) => {
  const isPromo = promoted;
  const prevInfo = TIER_INFO[previousTier] || TIER_INFO['E'];
  const currInfo = TIER_INFO[currentTier] || TIER_INFO['E'];
  const accentColor = isPromo ? '#22C55E' : '#EF4444';
  const bgGlow = isPromo ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35 }}
        className="fixed inset-0 z-[305] flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}
        onClick={onDismiss}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 30 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="relative max-w-xs w-full mx-6 rounded-2xl p-6 text-center"
          style={{
            background: '#0A0A14',
            border: `1px solid ${accentColor}30`,
            boxShadow: `0 0 60px ${bgGlow}, 0 0 120px ${bgGlow}`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Direction icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="mb-3"
          >
            {isPromo ? (
              <ChevronUp size={48} style={{ color: accentColor, margin: '0 auto' }} />
            ) : (
              <ChevronDown size={48} style={{ color: accentColor, margin: '0 auto' }} />
            )}
          </motion.div>

          {/* Title */}
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-xl font-black tracking-widest uppercase mb-5"
            style={{ color: accentColor, textShadow: `0 0 20px ${accentColor}40` }}
          >
            {isPromo ? 'PROMOTED!' : 'RELEGATED'}
          </motion.h2>

          {/* Tier transition */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex items-center justify-center gap-3 mb-5"
          >
            <div className="text-center">
              <span className="text-2xl block">{prevInfo.icon}</span>
              <span className="text-xs font-bold tracking-wider" style={{ color: prevInfo.color }}>
                {prevInfo.name}
              </span>
            </div>
            <span className="text-xl" style={{ color: 'rgba(255,255,255,0.3)' }}>→</span>
            <div className="text-center">
              <motion.span
                className="text-3xl block"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                {currInfo.icon}
              </motion.span>
              <span className="text-xs font-bold tracking-wider" style={{ color: currInfo.color }}>
                {currInfo.name}
              </span>
            </div>
          </motion.div>

          {/* Message */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            transition={{ delay: 0.7 }}
            className="text-xs mb-6"
            style={{ color: '#9ca3af', fontFamily: 'monospace' }}
          >
            {isPromo
              ? "You've proven your worth, Hunter."
              : 'Fight harder next week, Hunter.'}
          </motion.p>

          {/* Continue button */}
          <motion.button
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            onClick={onDismiss}
            className="px-6 py-2.5 rounded-lg font-black text-xs tracking-widest uppercase"
            style={{
              background: `${accentColor}15`,
              border: `1px solid ${accentColor}30`,
              color: accentColor,
              cursor: 'pointer',
            }}
          >
            CONTINUE
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default LeaguePromotionOverlay;
