
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Lock, Terminal, ArrowLeft, Key } from 'lucide-react';

interface AdminLoginProps {
  onLoginSuccess: () => void;
  onBack: () => void;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess, onBack }) => {
  const [adminId, setAdminId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // Simulated network delay for realism
    setTimeout(() => {
      if (adminId === 'pruthvi' && password === 'psp5116') {
        onLoginSuccess();
      } else {
        setError("ACCESS DENIED: You are not the Game Master.");
        setIsLoading(false);
      }
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 relative overflow-hidden font-mono">
      {/* Background Matrix Effect */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(220,38,38,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(220,38,38,0.05)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-red-900/10 to-transparent pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-[#050505] border border-red-900/50 rounded-xl p-8 shadow-[0_0_50px_rgba(220,38,38,0.15)] relative z-10"
      >
        <button 
          onClick={onBack}
          className="absolute top-4 left-4 text-gray-600 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
        </button>

        <div className="text-center mb-8">
           <motion.div 
             initial={{ y: -10, opacity: 0 }}
             animate={{ y: 0, opacity: 1 }}
             className="inline-block p-4 border border-red-900/30 rounded-full mb-4 bg-red-950/20"
           >
             <ShieldAlert size={32} className="text-red-600 animate-pulse" />
           </motion.div>
           
           <h1 className="text-3xl font-black text-white tracking-tighter mb-1">
             SYSTEM OVERRIDE
           </h1>
           <p className="text-[10px] text-red-500 font-bold tracking-[0.3em] uppercase">
             Restricted Access // Admin Only
           </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] text-red-700 uppercase tracking-widest font-bold ml-1">Admin ID</label>
            <div className="relative group">
              <Terminal className="absolute left-3 top-3.5 text-gray-600 group-focus-within:text-red-500 transition-colors" size={18} />
              <input 
                type="text" 
                value={adminId}
                onChange={(e) => setAdminId(e.target.value)}
                className="w-full bg-black border border-gray-800 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-red-600 focus:shadow-[0_0_15px_rgba(220,38,38,0.3)] transition-all font-mono placeholder:text-gray-800"
                placeholder="IDENTIFY"
                autoFocus
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] text-red-700 uppercase tracking-widest font-bold ml-1">Password</label>
            <div className="relative group">
              <Lock className="absolute left-3 top-3.5 text-gray-600 group-focus-within:text-red-500 transition-colors" size={18} />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black border border-gray-800 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-red-600 focus:shadow-[0_0_15px_rgba(220,38,38,0.3)] transition-all font-mono tracking-widest placeholder:text-gray-800"
                placeholder="••••••••"
              />
            </div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="bg-red-950/30 border-l-2 border-red-500 p-3 text-xs text-red-400 font-bold flex items-center gap-2"
              >
                <ShieldAlert size={14} className="shrink-0" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-red-900/20 border border-red-900 text-red-500 font-bold py-4 rounded-lg mt-2 hover:bg-red-600 hover:text-black hover:shadow-[0_0_30px_rgba(220,38,38,0.6)] transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
          >
             {isLoading ? 'AUTHENTICATING...' : 'INITIATE OVERRIDE'}
             {!isLoading && <Key size={16} className="group-hover:rotate-90 transition-transform" />}
          </button>
        </form>

        <div className="mt-8 text-center">
           <p className="text-[8px] text-gray-700">
             UNAUTHORIZED ACCESS ATTEMPTS WILL BE LOGGED AND PENALIZED.
           </p>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
