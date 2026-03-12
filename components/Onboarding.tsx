import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Terminal, ArrowRight, User, Loader2 } from 'lucide-react';

interface OnboardingProps {
  onComplete: (name: string, userId: string) => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    const codename = name.trim();

    try {
      const shadowId = Math.random().toString(36).substring(2, 15);
      onComplete(codename, `local-${shadowId}`);
    } catch (err) {
      console.error("Initialization Error", err);
      onComplete(codename, `local-${Date.now()}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center p-6 z-50">
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-[linear-gradient(rgba(0,210,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,210,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px]" />
      <div className="absolute top-0 left-0 w-full h-1 bg-system-neon opacity-20 shadow-[0_0_20px_#00d2ff]" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative"
      >
        <div className="text-center mb-12">
           <motion.div 
             initial={{ y: -20, opacity: 0 }}
             animate={{ y: 0, opacity: 1 }}
             transition={{ delay: 0.2 }}
             className="inline-block p-4 border border-system-neon/30 rounded-full mb-6 relative"
           >
             <div className="absolute inset-0 rounded-full bg-system-neon/10 animate-pulse" />
             <Terminal size={32} className="text-system-neon relative z-10" />
           </motion.div>
           
           <h1 className="text-3xl md:text-4xl font-black text-white font-mono tracking-tighter mb-2">
             IDENTIFY YOURSELF
           </h1>
           <p className="text-xs text-gray-500 font-mono tracking-[0.2em] uppercase">
             Bio-Sync OS v1.0 Initialization
           </p>
        </div>

        <form onSubmit={handleSubmit} className="relative">
          <div className="relative group">
             <User className="absolute left-4 top-4 text-gray-600 group-focus-within:text-system-neon transition-colors" size={20} />
             <input 
               autoFocus
               type="text"
               value={name}
               onChange={(e) => setName(e.target.value)}
               placeholder="ENTER CODENAME..."
               disabled={loading}
               className="w-full bg-black border border-system-border rounded-lg py-4 pl-12 pr-4 text-xl text-white font-mono focus:outline-none focus:border-system-neon focus:shadow-[0_0_20px_rgba(0,210,255,0.15)] transition-all placeholder:text-gray-800 disabled:opacity-50"
             />
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={!name.trim() || loading}
            className="w-full mt-6 bg-system-neon text-black font-bold font-mono py-4 rounded-lg flex items-center justify-center gap-2 hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
          >
             {loading ? <Loader2 className="animate-spin" size={20} /> : 'INITIALIZE SYSTEM'}
             {!loading && <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />}
          </motion.button>
        </form>

        <div className="mt-8 text-center">
           <p className="text-[10px] text-gray-700 font-mono">
             SYSTEM WILL CALIBRATE TO YOUR IDENTITY
           </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Onboarding;
