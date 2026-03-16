
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';

interface SystemPersonalizationScreenProps {
  onComplete: () => void;
}

const LOADING_STATES = [
  "CONNECTING...",
  "REFORGING...",
  "GRINDING...",
  "REFORMING...",
  "RECREATING...",
  "SYSTEM SYNC..."
];

const SystemPersonalizationScreen: React.FC<SystemPersonalizationScreenProps> = ({ onComplete }) => {
  const [textIndex, setTextIndex] = useState(0);

  useEffect(() => {
    // Cycle through text every 600ms
    const interval = setInterval(() => {
      setTextIndex((prev) => (prev + 1) % LOADING_STATES.length);
    }, 700);

    // Total duration of the loading sequence (approx 4s)
    const completionTimer = setTimeout(() => {
      onComplete();
    }, 4200);

    return () => {
      clearInterval(interval);
      clearTimeout(completionTimer);
    };
  }, [onComplete]);

  // Animation variants for the sword paths
  const drawVariant: Variants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: { 
      pathLength: 1, 
      opacity: 1,
      transition: { 
        pathLength: { duration: 3.5, ease: "easeInOut" },
        opacity: { duration: 0.2 }
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-[#050505] flex flex-col items-center justify-center font-mono overflow-hidden cursor-wait">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.05)_0%,transparent_60%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20 pointer-events-none" />

      {/* Main Animation Container */}
      <div className="relative flex items-center justify-center w-64 h-64 mb-12">
        
        {/* Glow Effect behind sword */}
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 bg-gradient-to-b from-cyan-500/20 via-purple-500/20 to-transparent blur-3xl rounded-full"
        />

        <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible drop-shadow-[0_0_15px_rgba(124,58,237,0.5)]">
            <defs>
                <linearGradient id="swordGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#06b6d4" /> {/* Cyan */}
                    <stop offset="100%" stopColor="#7c3aed" /> {/* Purple */}
                </linearGradient>
                <filter id="glow">
                    <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
                    <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>
            </defs>

            {/* Sword Group */}
            <motion.g 
                initial="hidden"
                animate="visible"
                stroke="url(#swordGradient)"
                fill="none" // Outline only as requested
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#glow)"
            >
                {/* Blade */}
                <motion.path 
                  d="M 50 5 L 55 70 L 50 75 L 45 70 Z" 
                  variants={drawVariant}
                />
                
                {/* Fuller (Center Line) */}
                <motion.path 
                  d="M 50 15 L 50 70" 
                  strokeWidth="0.5"
                  variants={drawVariant}
                />

                {/* Crossguard */}
                <motion.path 
                  d="M 35 70 L 65 70 L 65 74 L 50 78 L 35 74 Z" 
                  variants={drawVariant}
                />

                {/* Grip */}
                <motion.path 
                  d="M 48 78 L 48 90 Q 48 92 50 92 Q 52 92 52 90 L 52 78" 
                  variants={drawVariant}
                />

                {/* Pommel */}
                <motion.circle 
                  cx="50" cy="94" r="2.5" 
                  variants={drawVariant}
                />
            </motion.g>
        </svg>
      </div>

      {/* Cycling Text */}
      <div className="h-10 flex flex-col items-center justify-center relative w-full max-w-lg text-center px-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={textIndex}
            initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
            transition={{ duration: 0.2 }}
            className="text-lg md:text-xl text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 font-black tracking-[0.2em] font-mono uppercase"
          >
            {LOADING_STATES[textIndex]}
          </motion.div>
        </AnimatePresence>
        
        {/* Progress Line */}
        <div className="w-48 h-0.5 bg-gray-900 rounded-full mt-4 overflow-hidden relative">
            {/* Base track */}
            <div className="absolute inset-0 bg-purple-900/20" />
            
            <motion.div 
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 to-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]"
                initial={{ width: "0%" }}
                animate={{ width: ["0%", "30%", "45%", "85%", "100%"] }}
                transition={{ 
                    duration: 4, 
                    times: [0, 0.25, 0.5, 0.8, 1],
                    ease: "easeInOut" 
                }} 
            />
        </div>
      </div>

    </div>
  );
};

export default SystemPersonalizationScreen;
