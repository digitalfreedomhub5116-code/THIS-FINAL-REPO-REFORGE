import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface WelcomeIntroProps {
  onComplete: () => void;
}

const WelcomeIntro: React.FC<WelcomeIntroProps> = ({ onComplete }) => {
  const [text, setText] = useState("SYSTEM AWAKENING...");
  const [show, setShow] = useState(true);

  // Particle generation
  const particles = Array.from({ length: 30 }).map((_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    duration: Math.random() * 2 + 1,
    delay: Math.random() * 2
  }));

  useEffect(() => {
    const sequence = async () => {
      // Cinematic Text Sequence
      setTimeout(() => setText("INITIALIZING SHADOW PROTOCOL..."), 800);
      setTimeout(() => setText("WELCOME TO THE SYSTEM"), 2000);
      
      // Exit Sequence
      setTimeout(() => {
        setShow(false);
        setTimeout(onComplete, 800); // Allow exit animation to finish
      }, 3500);
    };

    sequence();
  }, [onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div 
          className="fixed inset-0 z-[60] bg-black flex items-center justify-center overflow-hidden"
          exit={{ 
            opacity: 0,
            filter: "blur(20px)",
            transition: { duration: 0.8 } 
          }}
        >
          {/* Neon Data Particles */}
          <div className="absolute inset-0 pointer-events-none">
            {particles.map((p) => (
              <motion.div
                key={p.id}
                className="absolute w-1 h-1 bg-system-neon rounded-full shadow-[0_0_5px_#00d2ff]"
                initial={{ opacity: 0, top: `${p.y}%`, left: `${p.x}%` }}
                animate={{ 
                  opacity: [0, 1, 0],
                  y: [0, -50], // Float up
                }}
                transition={{ 
                  duration: p.duration, 
                  repeat: Infinity, 
                  delay: p.delay,
                  ease: "linear"
                }}
              />
            ))}
          </div>

          {/* Grid Overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,210,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,210,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none" />

          {/* Glitch Text Container */}
          <div className="relative z-10 text-center px-4">
            <motion.div
              key={text}
              initial={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
              transition={{ duration: 0.3 }}
            >
                <h1 className="text-3xl md:text-5xl font-black text-white font-mono tracking-tighter relative inline-block">
                  <span className="relative z-10">{text}</span>
                  {/* Glitch Layers */}
                  <span className="absolute top-0 left-0 -ml-0.5 text-system-danger opacity-70 animate-pulse z-0 hidden md:block" style={{ clipPath: 'inset(10% 0 60% 0)' }}>{text}</span>
                  <span className="absolute top-0 left-0 ml-0.5 text-system-neon opacity-70 animate-pulse z-0 hidden md:block" style={{ clipPath: 'inset(40% 0 10% 0)' }}>{text}</span>
                </h1>
            </motion.div>
            
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
              className="h-px bg-gradient-to-r from-transparent via-system-neon to-transparent mt-6 mx-auto max-w-md"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WelcomeIntro;