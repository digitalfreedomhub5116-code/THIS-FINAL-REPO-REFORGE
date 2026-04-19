import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, AlertTriangle, CheckCircle, Info, Zap } from 'lucide-react';
import { playSystemSoundEffect } from '../utils/soundEngine';

export type SystemToastType = 'QUEST_FORGED' | 'WARNING' | 'SUCCESS' | 'INFO';

interface SystemToastMessage {
  id: string;
  type: SystemToastType;
  title: string;
  subtitle?: string;
  durationMs?: number;
}

// Module-level store for toasts (survives re-renders, can be called from anywhere)
let _toastQueue: SystemToastMessage[] = [];
let _onToastUpdate: ((msgs: SystemToastMessage[]) => void) | null = null;

export function showSystemToast(msg: Omit<SystemToastMessage, 'id'>) {
  const toast: SystemToastMessage = {
    ...msg,
    id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  };
  _toastQueue = [..._toastQueue, toast];
  _onToastUpdate?.([..._toastQueue]);

  // Auto-dismiss
  setTimeout(() => {
    _toastQueue = _toastQueue.filter(t => t.id !== toast.id);
    _onToastUpdate?.([..._toastQueue]);
  }, msg.durationMs || 4000);
}

const TYPE_CONFIG: Record<SystemToastType, {
  icon: React.ReactNode;
  borderColor: string;
  glowColor: string;
  accentColor: string;
  bgColor: string;
  sound: string;
}> = {
  QUEST_FORGED: {
    icon: <Swords className="w-5 h-5" />,
    borderColor: 'rgba(0,210,255,0.5)',
    glowColor: 'rgba(0,210,255,0.15)',
    accentColor: '#00d4ff',
    bgColor: 'rgba(0,210,255,0.04)',
    sound: 'PURCHASE',
  },
  WARNING: {
    icon: <AlertTriangle className="w-5 h-5" />,
    borderColor: 'rgba(251,191,36,0.5)',
    glowColor: 'rgba(251,191,36,0.15)',
    accentColor: '#fbbf24',
    bgColor: 'rgba(251,191,36,0.04)',
    sound: 'WARNING',
  },
  SUCCESS: {
    icon: <CheckCircle className="w-5 h-5" />,
    borderColor: 'rgba(34,197,94,0.5)',
    glowColor: 'rgba(34,197,94,0.15)',
    accentColor: '#22c55e',
    bgColor: 'rgba(34,197,94,0.04)',
    sound: 'PURCHASE',
  },
  INFO: {
    icon: <Info className="w-5 h-5" />,
    borderColor: 'rgba(139,92,246,0.5)',
    glowColor: 'rgba(139,92,246,0.15)',
    accentColor: '#8b5cf6',
    bgColor: 'rgba(139,92,246,0.04)',
    sound: 'SYSTEM',
  },
};

export default function SystemToastOverlay() {
  const [toasts, setToasts] = useState<SystemToastMessage[]>([]);

  useEffect(() => {
    _onToastUpdate = setToasts;
    return () => { _onToastUpdate = null; };
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 z-[99998] flex flex-col items-center pointer-events-none pt-2 px-4 gap-2"
      style={{ paddingTop: 'max(env(safe-area-inset-top, 8px), 8px)' }}
    >
      <AnimatePresence>
        {toasts.map(toast => {
          const cfg = TYPE_CONFIG[toast.type];
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -40, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -30, scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              className="w-full max-w-sm pointer-events-auto"
            >
              {/* Outer glow shell */}
              <div
                className="relative rounded-2xl overflow-hidden"
                style={{
                  background: '#08081a',
                  border: `1px solid ${cfg.borderColor}`,
                  boxShadow: `0 0 30px ${cfg.glowColor}, 0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)`,
                }}
              >
                {/* Animated top edge line */}
                <motion.div
                  className="absolute top-0 left-0 h-[2px]"
                  style={{ background: `linear-gradient(90deg, transparent, ${cfg.accentColor}, transparent)` }}
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />

                {/* Content */}
                <div className="flex items-center gap-3 px-4 py-3.5">
                  {/* Icon with pulse */}
                  <motion.div
                    className="flex-shrink-0"
                    style={{ color: cfg.accentColor }}
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                  >
                    {cfg.icon}
                  </motion.div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] font-black font-mono uppercase tracking-[0.3em] opacity-60"
                        style={{ color: cfg.accentColor }}
                      >
                        SYSTEM
                      </span>
                      <motion.div
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background: cfg.accentColor }}
                        animate={{ opacity: [1, 0.3, 1] }}
                        transition={{ duration: 1.2, repeat: Infinity }}
                      />
                    </div>
                    <div className="text-[13px] font-bold text-white mt-0.5 leading-tight truncate">
                      {toast.title}
                    </div>
                    {toast.subtitle && (
                      <div className="text-[10px] text-gray-500 font-mono mt-0.5 truncate">
                        {toast.subtitle}
                      </div>
                    )}
                  </div>

                  {/* Decorative corner glyph */}
                  <div className="flex-shrink-0 opacity-20">
                    <Zap className="w-3 h-3" style={{ color: cfg.accentColor }} />
                  </div>
                </div>

                {/* Bottom fade line */}
                <div
                  className="h-px"
                  style={{ background: `linear-gradient(90deg, transparent, ${cfg.accentColor}40, transparent)` }}
                />
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
