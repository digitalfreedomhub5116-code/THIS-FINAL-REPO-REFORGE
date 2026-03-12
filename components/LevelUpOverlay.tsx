
import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LevelUpOverlayProps {
  oldLevel: number;
  newLevel: number;
  onClose: () => void;
}

// Helper to generate random ranges
const randomRange = (min: number, max: number) => Math.random() * (max - min) + min;

const LevelUpOverlay: React.FC<LevelUpOverlayProps> = ({ oldLevel, newLevel, onClose }) => {
  const [phase, setPhase] = useState<'BUILDUP' | 'EXPLODE' | 'ARISE'>('BUILDUP');
  const [canClose, setCanClose] = useState(false);

  // Generate static debris data (Now digital shards instead of rocks)
  const debris = useMemo(() => {
    return Array.from({ length: 40 }).map((_, i) => {
      const color = Math.random() > 0.5 ? '#00d2ff' : '#a855f7'; // Cyan or Purple
      return {
        id: i,
        x: 0,
        y: 0,
        targetX: randomRange(-800, 800),
        targetY: randomRange(-800, 800),
        rotate: randomRange(0, 360),
        scale: randomRange(0.5, 1.5),
        duration: randomRange(0.8, 1.5),
        delay: 0,
        color: color,
        size: randomRange(4, 15),
        // Rectangles and lines for "digital" look
        width: randomRange(4, 20),
        height: randomRange(2, 6),
      };
    });
  }, []);

  useEffect(() => {
    // Sequence Timeline
    const buildUpDuration = 2200; // Time spent glowing
    const ariseDelay = 100;
    const interactionDelay = 2000;
    const autoCloseDelay = 12000;

    const timer1 = setTimeout(() => setPhase('EXPLODE'), buildUpDuration);
    const timer2 = setTimeout(() => setPhase('ARISE'), buildUpDuration + ariseDelay);
    
    const timerInteractive = setTimeout(() => {
        setCanClose(true);
    }, buildUpDuration + ariseDelay + interactionDelay);

    const timer3 = setTimeout(() => {
        onClose();
    }, autoCloseDelay);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timerInteractive);
    };
  }, [onClose]);

  const handleInteraction = () => {
      if (canClose) onClose();
  };

  return (
    <div 
        className={`fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-md overflow-hidden select-none ${canClose ? 'cursor-pointer' : 'cursor-wait'}`} 
        onClick={handleInteraction}
    >
      <AnimatePresence mode="wait">
        
        {/* --- PHASE 1: THE BUILD UP (Energy Overload) --- */}
        {phase === 'BUILDUP' && (
          <motion.div
            key="buildup"
            className="flex flex-col items-center justify-center relative z-20"
            exit={{ opacity: 0, scale: 2, filter: "blur(20px)", transition: { duration: 0.1 } }}
          >
            <div className="relative">
                {/* Core Number */}
                <motion.h1
                    className="font-black text-white relative z-10"
                    style={{ 
                        fontSize: 'clamp(8rem, 20vw, 14rem)', // Responsive sizing
                        fontFamily: '"Inter", sans-serif',
                        lineHeight: 1
                    }}
                    animate={{
                        scale: [1, 1.05, 1, 1.1, 0.95, 1.2], // Heartbeat -> Contraction -> Expand
                        textShadow: [
                            "0 0 10px rgba(255,255,255,0.2)",
                            "0 0 30px rgba(0,210,255,0.6)",
                            "0 0 60px rgba(168,85,247,0.8)",
                            "0 0 100px rgba(255,255,255,1)"
                        ],
                        color: ["#ffffff", "#e0e7ff", "#ffffff"]
                    }}
                    transition={{
                        duration: 2.2,
                        times: [0, 0.4, 0.6, 0.8, 0.9, 1],
                        ease: "easeInOut"
                    }}
                >
                    {oldLevel}
                </motion.h1>

                {/* Glitch/Ghost layers that separate out */}
                <motion.h1
                    className="absolute inset-0 font-black text-cyan-500 mix-blend-screen z-0 opacity-50"
                    style={{ 
                        fontSize: 'clamp(8rem, 20vw, 14rem)',
                        fontFamily: '"Inter", sans-serif',
                        lineHeight: 1
                    }}
                    animate={{ x: [-2, 2, -5, 5, 0], opacity: [0, 0.5, 0.8, 0] }}
                    transition={{ duration: 2.2, times: [0, 0.8, 0.9, 1] }}
                >
                    {oldLevel}
                </motion.h1>
                <motion.h1
                    className="absolute inset-0 font-black text-purple-500 mix-blend-screen z-0 opacity-50"
                    style={{ 
                        fontSize: 'clamp(8rem, 20vw, 14rem)',
                        fontFamily: '"Inter", sans-serif',
                        lineHeight: 1
                    }}
                    animate={{ x: [2, -2, 5, -5, 0], opacity: [0, 0.5, 0.8, 0] }}
                    transition={{ duration: 2.2, times: [0, 0.8, 0.9, 1] }}
                >
                    {oldLevel}
                </motion.h1>
            </div>

            <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-system-neon font-mono text-sm tracking-[0.5em] uppercase mt-8 animate-pulse font-bold"
            >
                Capacity Exceeded...
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- PHASE 2: EXPLOSION & BACKGROUND --- */}
      {(phase === 'EXPLODE' || phase === 'ARISE') && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {/* 1. Digital Debris */}
            {debris.map((shard) => (
                <motion.div
                    key={`shard-${shard.id}`}
                    className="absolute z-30 rounded-sm"
                    style={{
                        backgroundColor: shard.color,
                        width: shard.width,
                        height: shard.height,
                        boxShadow: `0 0 10px ${shard.color}`
                    }}
                    initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                    animate={{ 
                        x: shard.targetX, 
                        y: shard.targetY, 
                        rotate: shard.rotate,
                        scale: 0,
                        opacity: 0
                    }}
                    transition={{ 
                        duration: shard.duration, 
                        ease: "easeOut",
                    }}
                />
            ))}

            {/* 2. Shockwave Ring */}
            <motion.div 
                className="absolute rounded-full border-4 border-white/50 z-20"
                initial={{ width: 0, height: 0, opacity: 1, borderWidth: '50px' }}
                animate={{ width: '150vw', height: '150vw', opacity: 0, borderWidth: '0px' }}
                transition={{ duration: 0.8, ease: "easeOut" }}
            />
            
            {/* 3. Flash */}
            <motion.div 
                className="absolute inset-0 bg-white z-[60]"
                initial={{ opacity: 1 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
            />
        </div>
      )}

      {/* --- PHASE 3: THE ARISE (New Level) --- */}
      <AnimatePresence>
        {phase === 'ARISE' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center w-full h-full z-[50] p-4">
            
            {/* Rotating Background Aura */}
            <div className="absolute inset-0 flex items-center justify-center -z-10">
                <motion.div 
                    animate={{ rotate: 360, scale: [1, 1.2, 1] }}
                    transition={{ 
                        rotate: { duration: 20, repeat: Infinity, ease: "linear" },
                        scale: { duration: 4, repeat: Infinity, ease: "easeInOut" }
                    }}
                    className="w-[100vw] h-[100vw] max-w-[800px] max-h-[800px] bg-gradient-to-tr from-purple-900/40 via-transparent to-cyan-900/40 rounded-full blur-[80px] opacity-60"
                />
            </div>

            <motion.div
                key="arise-label"
                initial={{ opacity: 0, y: 20, letterSpacing: "0.2em" }}
                animate={{ opacity: 1, y: 0, letterSpacing: "0.5em" }}
                transition={{ delay: 0.5, duration: 1 }}
                className="text-system-neon font-bold text-sm md:text-xl uppercase mb-2 drop-shadow-[0_0_10px_rgba(0,210,255,0.8)] text-center"
            >
                System Level Up
            </motion.div>

            {/* MAIN NUMBER CONTAINER - FIXED CLIPPING */}
            <motion.div
                key="arise-number"
                initial={{ opacity: 0, scale: 0.5, filter: 'blur(20px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                transition={{ 
                    type: "spring", 
                    stiffness: 100, 
                    damping: 15,
                    delay: 0.2 
                }}
                className="relative flex items-center justify-center w-full max-w-[95vw]"
            >
                {/* Main Number - Responsive Clamp Font Size */}
                <h1 
                    className="font-black italic text-transparent bg-clip-text bg-gradient-to-b from-white via-cyan-100 to-purple-500 filter drop-shadow-[0_0_40px_rgba(168,85,247,0.5)] text-center w-full"
                    style={{ 
                        fontFamily: '"Inter", sans-serif',
                        fontSize: 'clamp(8rem, 25vw, 16rem)', // Ensures it fits any screen
                        lineHeight: 1
                    }}
                >
                    {newLevel}
                </h1>
                
                {/* Glow Copy Behind */}
                <h1 
                    className="absolute inset-0 flex items-center justify-center font-black italic text-cyan-400 blur-3xl opacity-40 pointer-events-none w-full"
                    style={{ 
                        fontFamily: '"Inter", sans-serif',
                        fontSize: 'clamp(8rem, 25vw, 16rem)',
                        lineHeight: 1
                    }}
                >
                    {newLevel}
                </h1>
            </motion.div>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="text-gray-400 font-mono text-xs tracking-[0.3em] uppercase mt-8 text-center"
            >
                Limits Transcended
            </motion.div>
             
             {/* Interaction Hint */}
             <motion.div
                key="arise-hint"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 2.5, duration: 0.5 }}
                className="absolute bottom-12 left-0 w-full text-center pointer-events-none"
             >
                <div className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-md rounded-full border border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                    <div className="w-2 h-2 bg-system-success rounded-full animate-pulse" />
                    <span className="text-xs font-bold text-white tracking-widest uppercase">
                        Click to Continue
                    </span>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LevelUpOverlay;
