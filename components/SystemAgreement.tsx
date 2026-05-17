
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Lock, ExternalLink, Shield, FileText, ChevronRight } from 'lucide-react';
import { triggerHaptic } from '../utils/soundEngine';

interface SystemAgreementProps {
  onComplete: () => void;
}

/* ── Floating particles (same as OnboardingHook) ── */
const Embers = () => (
  <>
    {Array.from({ length: 10 }).map((_, i) => (
      <motion.div
        key={i}
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 2 + (i % 3),
          height: 2 + (i % 3),
          left: `${10 + i * 9}%`,
          bottom: '2%',
          background: 'radial-gradient(circle, rgba(0,212,255,0.8), rgba(0,180,220,0.4))',
          boxShadow: '0 0 4px rgba(0,212,255,0.5)',
        }}
        animate={{ y: [0, -(200 + i * 30)], x: [0, (i % 2 === 0 ? 1 : -1) * (10 + i * 5)], opacity: [0.6, 0] }}
        transition={{ duration: 3.5 + i * 0.5, delay: i * 0.3, repeat: Infinity, ease: 'easeOut' }}
      />
    ))}
  </>
);

const SystemAgreement: React.FC<SystemAgreementProps> = ({ onComplete }) => {
  const [agreed, setAgreed] = useState(false);

  const PRIVACY_URL = 'https://www.reforgeai.in/privacy-policy';
  const TERMS_URL = 'https://www.reforgeai.in/terms-and-conditions';

  return (
    <div className="fixed inset-0 z-[100] bg-black overflow-hidden">

      {/* ── Hero Image (top half) ── */}
      <div className="absolute inset-0">
        <img
          src="/onboarding/agreement_shield.webp"
          alt=""
          className="w-full h-[45%] object-cover"
          style={{ objectPosition: 'center 30%' }}
        />
        {/* Gradient overlay — black fades in from bottom */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to top, black 38%, rgba(0,0,0,0.8) 52%, rgba(0,0,0,0.3) 70%, rgba(0,0,0,0.5) 100%)',
          }}
        />
      </div>

      {/* ── Floating embers ── */}
      <Embers />

      {/* ── Content Layer ── */}
      <div
        className="relative z-10 h-full flex flex-col justify-end px-6"
        style={{
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 32px)',
        }}
      >

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-5"
        >
          <div
            className="text-white text-xs font-bold tracking-[0.35em] uppercase mb-3"
            style={{ fontFamily: "'Orbitron', 'Rajdhani', 'Share Tech Mono', monospace" }}
          >
            REFORGE SYSTEM
          </div>
          <h1 className="text-[28px] font-black text-white leading-tight tracking-tight mb-1.5">
            Before We<br />Begin
          </h1>
          <p className="text-gray-400 text-[14px] leading-relaxed max-w-[300px]">
            Review and accept our policies to enter the System.
          </p>
        </motion.div>

        {/* ── Policy Cards ── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="space-y-2.5 mb-5"
        >
          {/* Privacy Policy */}
          <button
            onClick={() => { triggerHaptic('BUTTON_TAP'); window.open(PRIVACY_URL, '_blank'); }}
            className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl active:scale-[0.98] transition-all"
            style={{
              background: 'rgba(0,212,255,0.04)',
              border: '1px solid rgba(0,212,255,0.15)',
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.25)' }}
              >
                <Shield size={16} className="text-[#00d4ff]" />
              </div>
              <div className="text-left">
                <div className="text-[13px] font-bold text-white">Privacy Policy</div>
                <div className="text-[10px] text-gray-500">How we handle your data</div>
              </div>
            </div>
            <ExternalLink size={14} className="text-gray-600" />
          </button>

          {/* Terms & Conditions */}
          <button
            onClick={() => { triggerHaptic('BUTTON_TAP'); window.open(TERMS_URL, '_blank'); }}
            className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl active:scale-[0.98] transition-all"
            style={{
              background: 'rgba(0,212,255,0.04)',
              border: '1px solid rgba(0,212,255,0.15)',
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.25)' }}
              >
                <FileText size={16} className="text-[#00d4ff]" />
              </div>
              <div className="text-left">
                <div className="text-[13px] font-bold text-white">Terms & Conditions</div>
                <div className="text-[10px] text-gray-500">Rules of the System</div>
              </div>
            </div>
            <ExternalLink size={14} className="text-gray-600" />
          </button>
        </motion.div>

        {/* ── Agreement checkbox ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-start gap-3 mb-5 cursor-pointer px-1"
          onClick={() => { triggerHaptic('TICK'); setAgreed(!agreed); }}
        >
          <motion.div
            animate={{
              borderColor: agreed ? '#00d4ff' : '#4b5563',
              backgroundColor: agreed ? '#00d4ff' : 'transparent',
            }}
            transition={{ duration: 0.2 }}
            className="w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 flex-shrink-0"
          >
            <AnimatePresence>
              {agreed && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Check size={13} className="text-black" strokeWidth={3} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
          <span className="text-[12px] text-gray-400 leading-relaxed">
            I have read and agree to the{' '}
            <span className="text-[#00d4ff] font-semibold">Privacy Policy</span> and{' '}
            <span className="text-[#00d4ff] font-semibold">Terms & Conditions</span>.
          </span>
        </motion.div>

        {/* ── CTA Button (matches OnboardingHook's CTAButton style) ── */}
        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: agreed ? 1 : 0.5, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          onClick={() => {
            if (!agreed) return;
            triggerHaptic('BUTTON_TAP');
            onComplete();
          }}
          disabled={!agreed}
          className={`w-full py-4 font-black text-sm uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all ${
            agreed
              ? 'bg-white text-black shadow-[0_0_25px_rgba(255,255,255,0.25)] hover:bg-gray-100'
              : 'bg-gray-900 text-gray-600 cursor-not-allowed border border-gray-800'
          }`}
        >
          {!agreed && <Lock size={14} />}
          {agreed ? 'CONTINUE' : 'AGREE TO CONTINUE'}
          {agreed && <ChevronRight size={16} />}
        </motion.button>

        {/* ── Footer badge ── */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center text-[10px] text-gray-700 mt-4 tracking-wider uppercase"
          style={{ fontFamily: "'Share Tech Mono', monospace" }}
        >
          SYS_PROTOCOL // SECURE
        </motion.p>
      </div>
    </div>
  );
};

export default SystemAgreement;
