import React, { useState, useEffect, useRef } from 'react';
import { auth } from '../../lib/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone, Lock, ShieldAlert, Terminal, Loader2, Zap, AlertCircle } from 'lucide-react';

const PhoneLogin: React.FC = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const recaptchaInitialized = useRef(false);

  useEffect(() => {
    const initRecaptcha = async () => {
      try {
        if (!window.recaptchaVerifier && !recaptchaInitialized.current) {
          recaptchaInitialized.current = true;
          window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
            'size': 'invisible',
            'callback': () => {
              // reCAPTCHA solved
            },
            'expired-callback': () => {
              setError("Security Token Expired. Refreshing...");
              if (window.recaptchaVerifier) {
                window.recaptchaVerifier.clear();
                window.recaptchaVerifier = null;
                recaptchaInitialized.current = false;
              }
            }
          });
          // Pre-render to ensure it's ready
          await window.recaptchaVerifier.render();
        }
      } catch (err) {
        console.error("Recaptcha Init Error:", err);
      }
    };

    initRecaptcha();

    return () => {
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (e) {
          console.error("Clear Error", e);
        }
        window.recaptchaVerifier = null;
        recaptchaInitialized.current = false;
      }
    };
  }, []);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!phoneNumber) {
      setError("COMM LINK REQUIRED");
      setLoading(false);
      return;
    }

    try {
      if (!window.recaptchaVerifier) {
         throw new Error("Security Module Failed to Load. Refresh.");
      }
      
      const appVerifier = window.recaptchaVerifier;
      // Ensure phone number format
      const formattedNumber = phoneNumber.startsWith('+') ? phoneNumber : `+1${phoneNumber}`; 
      
      const confirmation = await signInWithPhoneNumber(auth, formattedNumber, appVerifier);
      setConfirmationResult(confirmation);
      setStep('OTP');
    } catch (err: any) {
      console.error("Phone Auth Error:", err);
      
      if (err.code === 'auth/internal-error') {
        setError("System Internal Error. Check connection or project settings.");
      } else if (err.code === 'auth/invalid-phone-number') {
        setError("Invalid Comm ID Format.");
      } else if (err.code === 'auth/too-many-requests') {
        setError("Rate Limit Exceeded. Cooldown Active.");
      } else {
         setError(err.message || "Signal Transmission Failed");
      }

      // Reset captcha if failed to allow retry
      if (window.recaptchaVerifier) {
        try {
            // Do not fully clear, just reset
            window.recaptchaVerifier.reset(); 
        } catch (resetError) {
            // If reset fails, fully clear
            window.recaptchaVerifier.clear();
            window.recaptchaVerifier = null;
            recaptchaInitialized.current = false;
            // Trigger re-init logic if possible, but component structure handles it on remount
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!confirmationResult) return;

    try {
      await confirmationResult.confirm(verificationCode);
      // Auth state change will be caught by parent listener
    } catch (err: any) {
      console.error(err);
      setError("Invalid Access Code");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-system-neon selection:text-black">
      <div id="recaptcha-container"></div>
      
      {/* Ambient Effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-900/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-900/20 rounded-full blur-[120px] pointer-events-none" />
      
      {/* Decorative Grid */}
      <div className="absolute inset-0 opacity-20 pointer-events-none bg-[linear-gradient(rgba(0,210,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,210,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px]" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-[#050505] border border-system-border/50 rounded-none p-8 relative z-10 shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-sm"
      >
        {/* Top Accent Line */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-system-neon to-transparent opacity-50" />
        
        <div className="text-center mb-10">
          <div className="flex justify-center mb-6">
             <div className="relative">
               <div className="absolute inset-0 bg-system-neon blur-xl opacity-20 animate-pulse" />
               <div className="p-4 bg-black border border-system-neon/30 rounded-full relative z-10">
                 <Terminal size={32} className="text-system-neon" />
               </div>
             </div>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tighter mb-2 font-mono">
            SHADOW SYSTEM
          </h1>
          <p className="text-[10px] text-system-neon/60 font-mono tracking-[0.3em] uppercase">
            SECURE LINK ESTABLISHMENT
          </p>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-red-950/30 border-l-2 border-red-500 p-3 mb-6 flex items-start gap-3 overflow-hidden"
            >
              <ShieldAlert size={16} className="text-red-500 shrink-0 mt-0.5" />
              <span className="text-xs text-red-400 font-mono leading-tight">{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {step === 'PHONE' ? (
          <form onSubmit={handleSendCode} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] text-system-neon/70 font-mono ml-1 uppercase tracking-wider">Mobile Interface ID</label>
              <div className="relative group">
                <Smartphone className="absolute left-3 top-3.5 text-gray-600 group-focus-within:text-system-neon transition-colors" size={18} />
                <input 
                  type="tel" 
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                  className="w-full bg-black border border-gray-800 rounded-sm py-3 pl-10 pr-4 text-white focus:outline-none focus:border-system-neon focus:shadow-[0_0_15px_rgba(0,210,255,0.15)] transition-all font-mono text-lg tracking-wider placeholder:text-gray-800"
                  placeholder="+1 555 000 0000"
                />
              </div>
              <p className="text-[10px] text-gray-600 font-mono text-right pt-1">Format: +1 555 123 4567</p>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-system-neon text-black font-bold py-3.5 rounded-sm mt-4 font-mono flex items-center justify-center gap-2 hover:bg-white hover:shadow-[0_0_20px_rgba(0,210,255,0.5)] transition-all disabled:opacity-50 disabled:cursor-not-allowed group uppercase tracking-widest text-sm"
            >
               {loading ? <Loader2 className="animate-spin" size={18} /> : 'INITIALIZE SYNC'}
               {!loading && <Zap size={16} className="group-hover:text-black transition-colors" />}
            </button>
            
            {/* Helpful hint for development/test numbers */}
            <div className="mt-4 flex items-start gap-2 bg-gray-900/50 p-2 rounded border border-gray-800">
               <AlertCircle size={14} className="text-gray-500 mt-0.5 shrink-0" />
               <p className="text-[10px] text-gray-500 font-mono">
                  If connection fails (Error: auth/internal-error), ensure the domain is whitelisted in Firebase Console.
               </p>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] text-system-accent/70 font-mono ml-1 uppercase tracking-wider">Authentication Token</label>
              <div className="relative group">
                <Lock className="absolute left-3 top-3.5 text-gray-600 group-focus-within:text-system-accent transition-colors" size={18} />
                <input 
                  type="text" 
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  required
                  className="w-full bg-black border border-gray-800 rounded-sm py-3 pl-10 pr-4 text-white focus:outline-none focus:border-system-accent focus:shadow-[0_0_15px_rgba(139,92,246,0.15)] transition-all font-mono text-xl tracking-[0.5em] text-center placeholder:text-gray-800"
                  placeholder="000000"
                  maxLength={6}
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-system-accent text-white font-bold py-3.5 rounded-sm mt-4 font-mono flex items-center justify-center gap-2 hover:bg-white hover:text-black hover:shadow-[0_0_20px_rgba(139,92,246,0.5)] transition-all disabled:opacity-50 disabled:cursor-not-allowed group uppercase tracking-widest text-sm"
            >
               {loading ? <Loader2 className="animate-spin" size={18} /> : 'CONFIRM UPLINK'}
               {!loading && <Terminal size={16} />}
            </button>
            
            <button
               type="button"
               onClick={() => setStep('PHONE')}
               className="w-full text-[10px] text-gray-600 hover:text-system-neon transition-colors font-mono mt-4 uppercase tracking-wider"
            >
               [ ABORT SEQUENCE ]
            </button>
          </form>
        )}
      </motion.div>
      
      {/* Footer Status */}
      <div className="absolute bottom-4 left-0 w-full text-center">
        <span className="text-[10px] text-gray-800 font-mono animate-pulse">SYSTEM STATUS: WAITING FOR INPUT</span>
      </div>

      {/* Typescript fix for window.recaptchaVerifier */}
      <script dangerouslySetInnerHTML={{__html: `
        window.recaptchaVerifier = null;
      `}} />
    </div>
  );
};

// Add type definition for window to avoid TS errors
declare global {
  interface Window {
    recaptchaVerifier: any;
  }
}

export default PhoneLogin;