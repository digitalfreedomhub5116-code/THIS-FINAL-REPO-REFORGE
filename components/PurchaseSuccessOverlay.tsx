
import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Box, X } from 'lucide-react';

interface PurchaseSuccessOverlayProps {
  isOpen: boolean;
  itemImage?: string; // URL or null
  itemName: string;
  onClose: () => void;
  price?: number;
}

const PurchaseSuccessOverlay: React.FC<PurchaseSuccessOverlayProps> = ({ 
  isOpen, 
  itemImage, 
  itemName, 
  onClose,
  price 
}) => {
  
  // Generate random starting positions for the "Implosion" particles
  const particles = useMemo(() => {
    return Array.from({ length: 30 }).map((_, i) => {
      const angle = Math.random() * Math.PI * 2;
      const radius = 300 + Math.random() * 200; // Start 300-500px away
      return {
        id: i,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        size: Math.random() * 6 + 4, // 4px to 10px squares
        duration: 0.4 + Math.random() * 0.2 // Slight variation in speed
      };
    });
  }, []);

  // Text Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.6 // Wait for implosion
      }
    }
  };

  const letterVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-md"
          onClick={onClose}
        >
          {/* --- PHASE 1: IMPLOSION PARTICLES --- */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {particles.map((p) => (
              <motion.div
                key={p.id}
                className="absolute bg-system-neon shadow-[0_0_10px_#00d2ff]"
                style={{ 
                  width: p.size, 
                  height: p.size,
                  // Digital square look (no border radius)
                }}
                initial={{ x: p.x, y: p.y, opacity: 1, scale: 1 }}
                animate={{ x: 0, y: 0, opacity: 0, scale: 0.5 }}
                transition={{ 
                  duration: p.duration, 
                  ease: "easeIn" 
                }}
              />
            ))}
          </div>

          {/* --- PHASE 2: THE FLASH --- */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 0.2, delay: 0.35, ease: "easeInOut" }}
          >
             <div className="w-[500px] h-[500px] bg-radial-gradient from-white via-system-neon to-transparent blur-3xl opacity-50" />
          </motion.div>

          {/* --- PHASE 3: THE REVEAL (Main Card) --- */}
          <div className="relative z-10 flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            
            {/* Holographic Ring Background */}
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-system-neon/30 rounded-full"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1, rotate: 180 }}
              transition={{ 
                scale: { type: "spring", stiffness: 200, damping: 20, delay: 0.4 },
                opacity: { duration: 0.2, delay: 0.4 },
                rotate: { duration: 20, repeat: Infinity, ease: "linear" }
              }}
            >
               {/* Inner dashed ring */}
               <div className="absolute inset-2 border border-dashed border-system-neon/50 rounded-full" />
               <div className="absolute -inset-10 bg-radial-gradient from-system-neon/10 to-transparent blur-2xl" />
            </motion.div>

            {/* The Item Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.4 }}
              className="relative w-32 h-32 bg-black border-2 border-system-neon rounded-xl flex items-center justify-center shadow-[0_0_50px_rgba(0,210,255,0.4)] overflow-hidden mb-8"
            >
               <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(0,210,255,0.1)_50%,transparent_75%)] bg-[size:10px_10px]" />
               
               {itemImage ? (
                 <img src={itemImage} alt={itemName} className="w-20 h-20 object-contain drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
               ) : (
                 <Box size={48} className="text-white drop-shadow-[0_0_15px_#00d2ff]" />
               )}
               
               {/* Shine Effect */}
               <motion.div 
                  className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent"
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
               />
            </motion.div>

            {/* --- PHASE 4: TEXT & INFO --- */}
            
            {/* System Message */}
            <motion.div 
              className="flex gap-1 mb-2"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {"[ ITEM ACQUIRED ]".split("").map((char, index) => (
                <motion.span 
                  key={index} 
                  variants={letterVariants}
                  className="text-system-neon font-mono text-xs md:text-sm font-bold tracking-widest"
                >
                  {char}
                </motion.span>
              ))}
            </motion.div>

            {/* Item Name */}
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="text-3xl md:text-4xl font-black text-white font-mono uppercase tracking-tighter mb-2 text-center"
            >
              {itemName}
            </motion.h2>

            {/* Price paid (optional) */}
            {price && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                    className="text-gray-500 font-mono text-xs mb-8"
                >
                    -{price} GOLD
                </motion.div>
            )}

            {/* Close Button */}
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
              onClick={onClose}
              className="group relative px-8 py-3 bg-white text-black font-black font-mono text-sm uppercase tracking-widest rounded hover:bg-system-neon transition-colors"
            >
               <span className="flex items-center gap-2 relative z-10">
                 CONFIRM <Check size={16} strokeWidth={3} />
               </span>
               {/* Button Glitch Hover Effect */}
               <div className="absolute inset-0 bg-system-neon translate-y-full group-hover:translate-y-0 transition-transform duration-200 z-0" />
            </motion.button>

          </div>
          
          {/* Close X (Top Right) */}
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 text-gray-600 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>

        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PurchaseSuccessOverlay;
