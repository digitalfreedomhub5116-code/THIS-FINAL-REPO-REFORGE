import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Skull, Zap, ShieldAlert, Crosshair, Sparkles } from 'lucide-react';
import { playSystemSoundEffect } from '../utils/soundEngine';

interface AnimProps {
  onComplete: () => void;
}

export const ShadowExtractionAnim: React.FC<AnimProps> = ({ onComplete }) => {
  useEffect(() => {
    playSystemSoundEffect('LEVEL_UP');
    const timer = setTimeout(onComplete, 2500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-md overflow-hidden pointer-events-none">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: [0.5, 1.2, 1], opacity: [0, 1, 0] }}
        transition={{ duration: 2.5, times: [0, 0.2, 1], ease: 'easeOut' }}
        className="absolute w-full h-full flex flex-col items-center justify-center gap-6"
      >
        <div className="relative flex items-center justify-center w-64 h-64">
           {/* Purple aura */}
           <motion.div 
             animate={{ rotate: 360, scale: [1, 1.5, 1] }} 
             transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
             className="absolute inset-0 rounded-full border-[20px] border-purple-600/30 blur-2xl"
           />
           <Skull size={100} className="text-purple-500 drop-shadow-[0_0_30px_rgba(168,85,247,0.8)] relative z-10" />
           
           {/* Flashes */}
           <motion.div 
              animate={{ opacity: [0, 1, 0] }}
              transition={{ repeat: 3, duration: 0.2 }}
              className="absolute inset-0 bg-white mix-blend-overlay rounded-full"
           />
        </div>
        <motion.h1 
           initial={{ y: 50, opacity: 0 }}
           animate={{ y: 0, opacity: 1, letterSpacing: ['0.1em', '0.5em', '0.1em'] }}
           transition={{ duration: 2 }}
           className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-purple-400 to-purple-800 uppercase tracking-widest text-center shadow-purple-500 drop-shadow-[0_0_20px_rgba(168,85,247,0.5)]"
        >
          Arise
        </motion.h1>
      </motion.div>
    </div>
  );
};

export const ShadowExchangeAnim: React.FC<AnimProps> = ({ onComplete }) => {
  useEffect(() => {
    playSystemSoundEffect('PURCHASE');
    const timer = setTimeout(onComplete, 2200);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm pointer-events-none overflow-hidden">
      {/* Target Crosshair */}
      <motion.div 
         initial={{ scale: 5, rotate: 90, opacity: 0 }}
         animate={{ scale: 1, rotate: 0, opacity: [0, 1, 0] }}
         transition={{ duration: 1.5, ease: 'backOut' }}
         className="absolute text-cyan-500 opacity-20"
      >
          <Crosshair size={300} strokeWidth={1} />
      </motion.div>

      {/* SWAP LINES */}
      <div className="absolute inset-0 flex flex-col justify-center items-center">
        <motion.div 
          initial={{ y: -300, opacity: 0 }}
          animate={{ y: [ -300, 0, 300 ], opacity: [0, 1, 0] }}
          transition={{ duration: 0.8, times: [0, 0.5, 1] }}
          className="w-2 h-64 bg-gradient-to-b from-transparent via-cyan-400 to-blue-600 rounded-full blur-[2px] shadow-[0_0_40px_#00d2ff]"
        />
        <motion.div 
          initial={{ y: 300, opacity: 0 }}
          animate={{ y: [ 300, 0, -300 ], opacity: [0, 1, 0] }}
          transition={{ duration: 0.8, delay: 0.2, times: [0, 0.5, 1] }}
          className="w-2 h-64 bg-gradient-to-t from-transparent via-purple-500 to-fuchsia-600 rounded-full blur-[2px] shadow-[0_0_40px_#a855f7]"
        />
      </div>

      <motion.div
         initial={{ scale: 0.5, opacity: 0 }}
         animate={{ scale: [0.5, 1.5, 2], opacity: [0, 1, 0] }}
         transition={{ duration: 2, times: [0, 0.1, 1] }}
         className="text-center"
      >
        <div className="flex items-center justify-center gap-4 text-cyan-300 drop-shadow-[0_0_20px_rgba(0,210,255,1)]">
            <Zap size={64} />
        </div>
        <h2 className="text-4xl mt-4 font-black uppercase tracking-[0.3em] text-white drop-shadow-[0_0_15px_rgba(0,210,255,0.8)]">
            Shadow Exchange
        </h2>
      </motion.div>
    </div>
  );
};

export const FortifyShieldAnim: React.FC<AnimProps> = ({ onComplete }) => {
  useEffect(() => {
    playSystemSoundEffect('LEVEL_UP'); // Or a heal sound
    const timer = setTimeout(onComplete, 2000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-green-950/40 backdrop-blur-sm pointer-events-none">
       <motion.div
         initial={{ opacity: 0, scale: 0.2 }}
         animate={{ opacity: [0, 1, 0], scale: [0.2, 1.1, 1.4] }}
         transition={{ duration: 1.5 }}
         className="absolute w-96 h-96 rounded-full border-4 border-green-400 bg-green-500/10 shadow-[inset_0_0_50px_rgba(74,222,128,0.5),0_0_100px_rgba(74,222,128,0.5)] flex items-center justify-center"
       >
          <ShieldAlert size={120} className="text-green-300 opacity-50" />
       </motion.div>

       <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: [20, -10, -20], opacity: [0, 1, 0] }}
          transition={{ duration: 2 }}
          className="flex flex-col items-center gap-2 mt-40"
       >
         <Sparkles className="text-green-300" size={32} />
         <h2 className="text-3xl font-black text-green-400 uppercase tracking-widest drop-shadow-[0_0_10px_rgba(74,222,128,0.8)]">
            Fortified
         </h2>
         <p className="text-green-200/70 font-mono text-xs tracking-widest">DEBUFFS PURGED. SHIELD ACTIVE.</p>
       </motion.div>
    </div>
  );
};
