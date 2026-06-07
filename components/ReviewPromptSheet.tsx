import React, { useEffect, useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, X, Sparkles, MessageSquare, Send } from 'lucide-react';
import { triggerHaptic } from '../utils/soundEngine';
import {
  launchNativeReview,
  markAsked,
  markDeclined,
} from '../lib/appReview';

type Stage = 'INTRO' | 'POSITIVE' | 'NEGATIVE';

const ReviewPromptSheet: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<Stage>('INTRO');
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Listen for the global dispatch event.
  useEffect(() => {
    const handler = () => {
      setStage('INTRO');
      setFeedback('');
      setOpen(true);
      markAsked();
    };
    window.addEventListener('reforge:show-review-prompt', handler);
    return () =>
      window.removeEventListener('reforge:show-review-prompt', handler);
  }, []);

  const close = useCallback((declined: boolean) => {
    if (declined) markDeclined();
    setOpen(false);
  }, []);

  const handleLovingIt = () => {
    triggerHaptic('BUTTON_TAP');
    setStage('POSITIVE');
  };

  const handleNotReally = () => {
    triggerHaptic('BUTTON_TAP');
    setStage('NEGATIVE');
  };

  const handleLeaveReview = async () => {
    triggerHaptic('BUTTON_TAP');
    await launchNativeReview();
    setOpen(false);
  };

  const handleSendFeedback = async () => {
    triggerHaptic('BUTTON_TAP');
    if (!feedback.trim()) {
      close(true);
      return;
    }
    setSubmitting(true);
    try {
      // Best-effort POST; non-blocking if endpoint isn't present.
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'review_prompt',
          message: feedback.trim(),
          createdAt: Date.now(),
        }),
      }).catch(() => {});
    } finally {
      setSubmitting(false);
      close(true);
    }
  };

  if (!open) return null;

  const sheet = (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-end justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => close(true)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="relative w-full max-w-md mx-auto rounded-t-3xl overflow-hidden"
            style={{
              background:
                'linear-gradient(180deg, #0a0a14 0%, #050509 100%)',
              border: '1px solid rgba(0,212,255,0.18)',
              borderBottom: 'none',
              boxShadow:
                '0 -16px 60px rgba(0,212,255,0.12), 0 -4px 20px rgba(0,0,0,0.8)',
              paddingBottom:
                'calc(env(safe-area-inset-bottom, 0px) + 24px)',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            {/* Glow accent */}
            <div
              className="absolute inset-x-0 top-0 h-[1px]"
              style={{
                background:
                  'linear-gradient(90deg, transparent, #00d4ff, transparent)',
              }}
            />

            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-gray-700" />
            </div>

            {/* Close button */}
            <button
              onClick={() => close(true)}
              className="absolute top-3 right-3 p-2 rounded-full hover:bg-white/5 transition-colors"
              aria-label="Close"
            >
              <X size={16} className="text-gray-500" />
            </button>

            <div className="px-6 pt-2 pb-6">
              <AnimatePresence mode="wait">
                {stage === 'INTRO' && (
                  <motion.div
                    key="intro"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* Icon */}
                    <div className="flex justify-center mb-4">
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center"
                        style={{
                          background:
                            'linear-gradient(135deg, rgba(0,212,255,0.18), rgba(0,212,255,0.04))',
                          border: '1px solid rgba(0,212,255,0.3)',
                        }}
                      >
                        <Sparkles size={26} className="text-[#00d4ff]" />
                      </div>
                    </div>

                    <h2
                      className="text-center text-[22px] font-black text-white leading-tight mb-2"
                      style={{ fontFamily: 'Outfit, Inter, sans-serif' }}
                    >
                      Enjoying Reforge?
                    </h2>
                    <p className="text-center text-gray-400 text-[13px] leading-relaxed mb-6 px-2">
                      You've cleared a few Daily Dungeons. The System wants
                      to know — is it serving you well?
                    </p>

                    <div className="flex flex-col gap-2.5">
                      <button
                        onClick={handleLovingIt}
                        className="w-full py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all hover:scale-[1.01] active:scale-[0.99]"
                        style={{
                          background:
                            'linear-gradient(135deg, #00d4ff, #33dfff)',
                          color: '#000',
                          boxShadow:
                            '0 4px 24px rgba(0,212,255,0.35)',
                          fontFamily: 'Outfit, Inter, sans-serif',
                        }}
                      >
                        Loving it ⚡
                      </button>
                      <button
                        onClick={handleNotReally}
                        className="w-full py-3 rounded-2xl font-bold text-xs uppercase tracking-widest transition-colors text-gray-400 hover:text-white"
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.08)',
                        }}
                      >
                        Not really
                      </button>
                    </div>
                  </motion.div>
                )}

                {stage === 'POSITIVE' && (
                  <motion.div
                    key="positive"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* Stars */}
                    <div className="flex justify-center gap-1 mb-4">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <motion.div
                          key={i}
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: i * 0.08, type: 'spring' }}
                        >
                          <Star
                            size={28}
                            className="text-[#00d4ff]"
                            fill="#00d4ff"
                            style={{
                              filter:
                                'drop-shadow(0 0 8px rgba(0,212,255,0.5))',
                            }}
                          />
                        </motion.div>
                      ))}
                    </div>

                    <h2
                      className="text-center text-[22px] font-black text-white leading-tight mb-2"
                      style={{ fontFamily: 'Outfit, Inter, sans-serif' }}
                    >
                      Help others find the System
                    </h2>
                    <p className="text-center text-gray-400 text-[13px] leading-relaxed mb-6 px-2">
                      A quick 5-star review on the Play Store helps more
                      hunters discover Reforge. Takes 10 seconds.
                    </p>

                    <div className="flex flex-col gap-2.5">
                      <button
                        onClick={handleLeaveReview}
                        className="w-full py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
                        style={{
                          background:
                            'linear-gradient(135deg, #00d4ff, #33dfff)',
                          color: '#000',
                          boxShadow:
                            '0 4px 24px rgba(0,212,255,0.35)',
                          fontFamily: 'Outfit, Inter, sans-serif',
                        }}
                      >
                        <Star size={14} fill="#000" /> Leave a Review
                      </button>
                      <button
                        onClick={() => close(true)}
                        className="w-full py-3 rounded-2xl font-bold text-xs uppercase tracking-widest transition-colors text-gray-500 hover:text-gray-300"
                      >
                        Maybe later
                      </button>
                    </div>
                  </motion.div>
                )}

                {stage === 'NEGATIVE' && (
                  <motion.div
                    key="negative"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex justify-center mb-4">
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center"
                        style={{
                          background:
                            'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
                          border: '1px solid rgba(255,255,255,0.1)',
                        }}
                      >
                        <MessageSquare
                          size={24}
                          className="text-gray-300"
                        />
                      </div>
                    </div>

                    <h2
                      className="text-center text-[22px] font-black text-white leading-tight mb-2"
                      style={{ fontFamily: 'Outfit, Inter, sans-serif' }}
                    >
                      What would make it better?
                    </h2>
                    <p className="text-center text-gray-400 text-[13px] leading-relaxed mb-4 px-2">
                      Tell us what's not working. We read everything — and
                      we ship fixes fast.
                    </p>

                    <textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="The dungeon is too hard… the UI feels…"
                      rows={4}
                      maxLength={500}
                      className="w-full rounded-2xl p-3 text-[13px] text-white placeholder-gray-600 resize-none focus:outline-none mb-4"
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        fontFamily: 'Inter, sans-serif',
                      }}
                    />

                    <div className="flex flex-col gap-2.5">
                      <button
                        onClick={handleSendFeedback}
                        disabled={submitting}
                        className="w-full py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-60"
                        style={{
                          background: '#ffffff',
                          color: '#000',
                          fontFamily: 'Outfit, Inter, sans-serif',
                        }}
                      >
                        <Send size={14} />{' '}
                        {submitting ? 'Sending…' : 'Send Feedback'}
                      </button>
                      <button
                        onClick={() => close(true)}
                        className="w-full py-3 rounded-2xl font-bold text-xs uppercase tracking-widest transition-colors text-gray-500 hover:text-gray-300"
                      >
                        Skip
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return ReactDOM.createPortal(sheet, document.body);
};

export default ReviewPromptSheet;
