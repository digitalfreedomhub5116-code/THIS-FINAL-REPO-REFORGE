import React from 'react';
import { motion } from 'framer-motion';
import { Database } from 'lucide-react';

export const ShadowLoading: React.FC = () => {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/95 backdrop-blur-sm">
       <motion.div 
         initial={{ scale: 0.9, opacity: 0.5 }}
         animate={{ scale: 1, opacity: 1 }}
         transition={{ duration: 0.8, repeat: Infinity, repeatType: "reverse" }}
         className="flex flex-col items-center gap-4"
       >
          <Database size={32} className="text-system-accent drop-shadow-[0_0_10px_rgba(139,92,246,0.5)]" />
          <div className="text-system-accent font-mono text-[10px] font-bold tracking-[0.3em]">
            SYNCHRONIZING...
          </div>
       </motion.div>
    </div>
  );
};

export default ShadowLoading;