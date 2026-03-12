
import React, { useState } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { ShieldAlert, Mail, ArrowRight, X, CheckCircle, AlertTriangle } from 'lucide-react';

interface ForgotPasswordProps {
  onCancel: () => void;
  onSuccess: () => void;
}

const glitchVariants: Variants = {
  hidden: { opacity: 0, x: -20, skewX: 10 },
  visible: { 
    opacity: 1, 
    x: 0, 
    skewX: 0,
    transition: { type: "spring", stiffness: 300, damping: 20 }
  },
  exit: { 
    opacity: 0, 
    x: 20, 
    skewX: -10,
    transition: { duration: 0.2 }
  }
};

const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onCancel, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
        setError("EMAIL REQUIRED");
        return;
    }
    setLoading(true);
    setError(null);

    setSent(true);
    setLoading(false);
    setTimeout(() => {
        onSuccess();
    }, 4000);
  };

  return (
    <div className="w-full max-w-md bg-[#050505]/90 border border-system-danger/30 backdrop-blur-xl rounded-xl p-8 relative overflow-hidden shadow-[0_0_50px_rgba(220,38,38,0.2)]">
       <div className="absolute inset-0 bg-system-danger/5 pointer-events-none" />
       
       <div className="relative z-10">
          <div className="flex justify-between items-start mb-6 border-b border-system-border pb-4">
             <div>
                <h2 className="text-xl font-bold text-white font-mono flex items-center gap-2">
                    <ShieldAlert className="text-system-danger animate-pulse" size={20} />
                    RECOVERY MODE
                </h2>
                <p className="text-[10px] text-system-danger/70 font-mono tracking-widest mt-1">
                    PROTOCOL: PASSWORD RESET
                </p>
             </div>
             <button onClick={onCancel} className="text-gray-500 hover:text-white transition-colors">
                <X size={20} />
             </button>
          </div>

          <AnimatePresence mode="wait">
            {error && (
               <motion.div 
                 initial={{ height: 0, opacity: 0 }}
                 animate={{ height: 'auto', opacity: 1 }}
                 exit={{ height: 0, opacity: 0 }}
                 className="bg-black/50 border-l-2 border-system-danger text-system-danger p-3 rounded mb-4 text-xs font-mono flex items-center gap-2"
               >
                 <AlertTriangle size={14} /> {error}
               </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {!sent ? (
                <motion.form
                   key="request"
                   variants={glitchVariants}
                   initial="hidden"
                   animate="visible"
                   exit="exit"
                   className="space-y-4"
                   onSubmit={handleReset}
                >
                   <div>
                      <label className="text-[10px] text-system-danger font-mono tracking-widest block mb-2 font-bold">TARGET EMAIL</label>
                      <div className="relative group">
                         <Mail className="absolute left-3 top-3.5 text-gray-500 group-focus-within:text-system-danger transition-colors" size={18} />
                         <input 
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="w-full bg-[#0a0a0a] border border-gray-800 rounded p-3 pl-10 text-white font-mono focus:border-system-danger focus:shadow-[0_0_15px_rgba(220,38,38,0.2)] focus:outline-none placeholder:text-gray-800 transition-all"
                            placeholder="USER@SYSTEM.IO"
                            required
                         />
                      </div>
                   </div>
                   <button 
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 bg-system-danger/10 border border-system-danger/50 text-system-danger font-bold font-mono rounded hover:bg-system-danger hover:text-black hover:shadow-[0_0_20px_rgba(220,38,38,0.5)] transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
                   >
                      {loading ? <Loader2 className="animate-spin" size={16} /> : 'INITIATE RESET PROTOCOL'}
                      {!loading && <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />}
                   </button>
                </motion.form>
            ) : (
                <motion.div
                   key="success"
                   variants={glitchVariants}
                   initial="hidden"
                   animate="visible"
                   exit="exit"
                   className="space-y-4 text-center py-4"
                >
                   <div className="w-16 h-16 bg-system-success/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-system-success/30">
                       <CheckCircle size={32} className="text-system-success" />
                   </div>
                   <h3 className="text-white font-bold font-mono text-lg">LINK DISPATCHED</h3>
                   <p className="text-gray-400 text-xs font-mono">
                       Check your comms (email) for the reset uplink. Redirecting to login...
                   </p>
                </motion.div>
            )}
          </AnimatePresence>
       </div>
    </div>
  );
};

export default ForgotPassword;
