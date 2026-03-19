
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Check, Lock, ExternalLink, FileText, Shield } from 'lucide-react';

interface SystemAgreementProps {
  onComplete: () => void;
}

const SystemAgreement: React.FC<SystemAgreementProps> = ({ onComplete }) => {
  const [agreed, setAgreed] = useState(false);

  // External policy links
  const PRIVACY_URL = 'https://www.reforgeai.in/privacy-policy';
  const TERMS_URL = 'https://www.reforgeai.in/terms-and-conditions';

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-6 font-mono">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,210,255,0.04)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:20px_20px] opacity-20 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(0,210,255,0.08)', border: '1px solid rgba(0,210,255,0.2)', boxShadow: '0 0 30px rgba(0,210,255,0.1)' }}>
            <ShieldCheck size={28} className="text-cyan-400" />
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-white uppercase tracking-tight mb-1">Before We Begin</h1>
          <p className="text-xs text-gray-500">Please review and accept our policies to continue</p>
        </div>

        {/* Policy Links */}
        <div className="space-y-3 mb-8">
          <button
            onClick={() => window.open(PRIVACY_URL, '_blank')}
            className="w-full flex items-center justify-between px-5 py-4 rounded-xl transition-all active:scale-[0.98]"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}>
                <Shield size={16} className="text-purple-400" />
              </div>
              <div className="text-left">
                <div className="text-sm font-bold text-white">Privacy Policy</div>
                <div className="text-[10px] text-gray-500">How we handle your data</div>
              </div>
            </div>
            <ExternalLink size={14} className="text-gray-600" />
          </button>

          <button
            onClick={() => window.open(TERMS_URL, '_blank')}
            className="w-full flex items-center justify-between px-5 py-4 rounded-xl transition-all active:scale-[0.98]"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,210,255,0.1)', border: '1px solid rgba(0,210,255,0.2)' }}>
                <FileText size={16} className="text-cyan-400" />
              </div>
              <div className="text-left">
                <div className="text-sm font-bold text-white">Terms & Conditions</div>
                <div className="text-[10px] text-gray-500">Rules of the System</div>
              </div>
            </div>
            <ExternalLink size={14} className="text-gray-600" />
          </button>
        </div>

        {/* Agree checkbox */}
        <div
          className="flex items-start gap-3 mb-6 cursor-pointer px-1"
          onClick={() => setAgreed(!agreed)}
        >
          <div
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all mt-0.5 flex-shrink-0 ${
              agreed ? 'bg-cyan-500 border-cyan-500' : 'bg-transparent border-gray-600'
            }`}
          >
            {agreed && <Check size={13} className="text-black" strokeWidth={3} />}
          </div>
          <span className="text-xs text-gray-400 leading-relaxed">
            I have read and agree to the <span className="text-purple-400 font-bold">Privacy Policy</span> and{' '}
            <span className="text-cyan-400 font-bold">Terms & Conditions</span>.
          </span>
        </div>

        {/* Continue button */}
        <button
          onClick={onComplete}
          disabled={!agreed}
          className={`w-full py-4 rounded-xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 ${
            agreed
              ? 'bg-white text-black hover:scale-[1.02] shadow-[0_0_20px_rgba(255,255,255,0.15)] active:scale-[0.98]'
              : 'bg-gray-900 text-gray-600 cursor-not-allowed border border-gray-800'
          }`}
        >
          {!agreed && <Lock size={14} />}
          {agreed ? 'CONTINUE' : 'AGREE TO CONTINUE'}
        </button>
      </motion.div>
    </div>
  );
};

export default SystemAgreement;
