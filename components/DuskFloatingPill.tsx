import React from 'react';
import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';

interface DuskFloatingPillProps {
  unreadCount?: number;
  onClick: () => void;
}

/**
 * Floating Dusk chat pill — docks on the Today/Dashboard tab so users can
 * open a conversation with Dusk from anywhere without navigating away.
 * Sits on the bottom-left to avoid collision with the right-side FAB stack
 * (chest, key, dungeon buttons) in MobileFloatingMenu.
 */
const DuskFloatingPill: React.FC<DuskFloatingPillProps> = ({ unreadCount = 0, onClick }) => {
  const hasUnread = unreadCount > 0;

  return (
    <motion.button
      initial={{ x: -80, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -80, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28, delay: 0.15 }}
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      aria-label={hasUnread ? `Dusk — ${unreadCount} new message${unreadCount === 1 ? '' : 's'}` : 'Dusk'}
      className="fixed left-4 md:left-6 z-[79] md:hidden flex items-center gap-2 pl-2.5 pr-3.5 py-2 rounded-full group"
      style={{
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 6.5rem)',
        background: 'linear-gradient(135deg, rgba(0,212,255,0.95) 0%, rgba(109,40,217,0.9) 100%)',
        border: '1px solid rgba(167,139,250,0.4)',
        boxShadow: hasUnread
          ? '0 0 24px rgba(0,212,255,0.7), 0 4px 16px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.2)'
          : '0 0 14px rgba(0,212,255,0.35), 0 4px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.15)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      {/* Specular top highlight */}
      <span
        className="absolute top-0 left-3 right-3 h-px pointer-events-none rounded-full"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)' }}
      />

      {/* Icon in a darker chip */}
      <span
        className="relative flex items-center justify-center w-7 h-7 rounded-full"
        style={{
          background: 'rgba(0,0,0,0.3)',
          border: '1px solid rgba(255,255,255,0.15)',
        }}
      >
        <MessageCircle size={14} className="text-white" strokeWidth={2.5} />
        {hasUnread && (
          <motion.span
            className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full flex items-center justify-center text-[9px] font-mono font-black text-white"
            style={{
              background: '#ef4444',
              border: '1.5px solid #0a0a0f',
              boxShadow: '0 0 8px rgba(239,68,68,0.7)',
            }}
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </span>

      {/* Label */}
      <span className="text-[11px] font-mono font-black tracking-widest text-white uppercase">
        Dusk
      </span>

      {/* Online status dot */}
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{
          background: '#4ade80',
          boxShadow: '0 0 6px rgba(74,222,128,0.9)',
        }}
      />
    </motion.button>
  );
};

export default DuskFloatingPill;
