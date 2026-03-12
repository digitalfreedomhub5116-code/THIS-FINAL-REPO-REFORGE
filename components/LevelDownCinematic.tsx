
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDownCircle, AlertTriangle } from 'lucide-react';

interface LevelDownCinematicProps {
  onClose: () => void;
}

const LevelDownCinematic: React.FC<LevelDownCinematicProps> = ({ onClose }) => {
  const [canClose, setCanClose] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
        setCanClose(true);
    }, 4000); // Longer lock to let it sink in
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
      if (canClose) onClose();
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`fixed inset-0 z-[200] flex flex-col items-center justify-center bg-red-950/90 backdrop-blur-xl overflow-hidden ${canClose ? 'cursor-pointer' : 'cursor-wait'}`}
      onClick={handleClose}
    >
      {/* Background Pulse */}
      <motion.div 
        animate={{ opacity: [0.1, 0.4, 0.1], scale: [1, 1.1, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.5)_0%,transparent_70%)]"
      />

      {/* Main Content */}
      <div className="relative z-10 text-center select-none p-4">
        <motion.div
          initial={{ scale: 0.5, opacity: 0, y: -50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 10 }}
          className="mb-6 flex justify-center"
        >
          <div className="relative">
            <ArrowDownCircle size={100} className="text-red-500 drop-shadow-[0_0_30px_#dc2626]" />
            <motion.div 
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 0.5, repeat: Infinity }}
              className="absolute inset-0 bg-red-600 rounded-full blur-xl -z-10" 
            />
          </div>
        </motion.div>

        <motion.h1 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-5xl md:text-7xl font-black italic tracking-tighter text-white mb-2 font-mono glitch-text"
          style={{ textShadow: "0 0 30px #dc2626" }}
        >
          SYSTEM FAILURE
        </motion.h1>

        <motion.div
          initial={{ width: 0 }}
          animate={{ width: "100%" }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent mb-8"
        />

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="flex flex-col gap-4 items-center"
        >
          <div className="bg-black/50 border border-red-500/50 p-4 rounded-xl flex items-center gap-3">
             <AlertTriangle className="text-red-500 animate-pulse" size={24} />
             <span className="text-xl font-mono font-bold text-red-100">LEVEL LOST</span>
          </div>
          
          <p className="text-red-300 font-mono text-xs uppercase tracking-[0.3em] mt-4">
            Capacity Reduced. Penalties Applied.
          </p>
        </motion.div>

        {/* Interaction Prompt */}
        <AnimatePresence>
            {canClose && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-12 text-center"
                >
                    <div className="inline-block px-4 py-2 border border-red-500/30 rounded bg-red-900/20 text-red-400 text-xs font-mono animate-pulse hover:bg-red-500 hover:text-black transition-colors">
                        [ REBOOT SYSTEM ]
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
      </div>
      
      {/* Glitch Overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
    </motion.div>
  );
};

export default LevelDownCinematic;
