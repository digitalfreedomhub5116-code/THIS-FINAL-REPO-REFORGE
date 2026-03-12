import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { speakSystemMessage } from '../utils/soundEngine';

interface WelcomeCinematicProps {
  username: string;
  onComplete: () => void;
}

const WelcomeCinematic: React.FC<WelcomeCinematicProps> = ({ username, onComplete }) => {
  useEffect(() => {
    // Speak the greeting shortly after mounting
    const speechTimer = setTimeout(() => {
        speakSystemMessage(`Hello ${username}. Ready to change your life?`);
    }, 800);

    // Extend duration to ensure voice line finishes (approx 4.5s total)
    const timer = setTimeout(() => {
      onComplete();
    }, 4500);
    
    return () => {
        clearTimeout(timer);
        clearTimeout(speechTimer);
    };
  }, [onComplete, username]);

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center overflow-hidden">
      {/* Animated Background Lines */}
      <div className="absolute inset-0 opacity-20">
         {Array.from({ length: 20 }).map((_, i) => (
            <motion.div 
               key={i}
               initial={{ x: '-100%' }}
               animate={{ x: '200%' }}
               transition={{ 
                 duration: 2, 
                 repeat: Infinity, 
                 ease: "linear", 
                 delay: i * 0.1,
                 repeatDelay: Math.random() * 2
               }}
               className="h-[1px] w-full bg-system-neon mb-10 opacity-50"
               style={{ top: `${i * 5}%` }}
            />
         ))}
      </div>

      <div className="relative z-10 text-center p-8">
         <motion.div
           initial={{ opacity: 0, scale: 2 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ duration: 0.5, type: 'spring' }}
         >
           <h2 className="text-system-neon font-mono tracking-[0.5em] text-sm md:text-xl mb-4">
             SYSTEM ONLINE
           </h2>
         </motion.div>

         <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.5, duration: 0.5 }}
         >
            <h1 className="text-5xl md:text-7xl font-black text-white font-mono tracking-tighter mb-2">
               WELCOME
            </h1>
            <h1 className="text-4xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-system-neon to-system-accent font-mono">
               {username}
            </h1>
         </motion.div>

         <motion.div
           initial={{ width: 0 }}
           animate={{ width: '100%' }}
           transition={{ delay: 1, duration: 1.5 }}
           className="h-1 bg-system-neon mt-8 mx-auto max-w-lg shadow-[0_0_20px_#00d2ff]"
         />

         <motion.p
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           transition={{ delay: 1.5 }}
           className="text-gray-500 font-mono text-xs mt-4 tracking-widest"
         >
           BIOMETRICS SYNCHRONIZED
         </motion.p>
      </div>
    </div>
  );
};

export default WelcomeCinematic;