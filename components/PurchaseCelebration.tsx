
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingBag, Gamepad2, Pizza, Tv, Moon, Users, Star, Check,
  Coffee, Music, Smartphone, Plane, Car, Home, Gift, Zap, Heart, Smile, 
  Trophy, Crown, Cpu, Shirt, Watch, Headphones, Beer, Utensils, 
  MonitorPlay, Clapperboard, Ghost, Key
} from 'lucide-react';
import { ShopItem } from '../types';
import { playSystemSoundEffect } from '../utils/soundEngine';

interface PurchaseCelebrationProps {
  item: ShopItem;
  onClose: () => void;
}

// --- ICON MAPPING (Keep existing helper) ---
const getIcon = (iconName: string, size: number = 120, className?: string) => {
  const props = { size, className: className || "text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)]" };
  switch (iconName) {
    case 'gamepad': return <Gamepad2 {...props} />;
    case 'pizza': return <Pizza {...props} />;
    case 'coffee': return <Coffee {...props} />;
    case 'beer': return <Beer {...props} />;
    case 'utensils': return <Utensils {...props} />;
    case 'tv': return <Tv {...props} />;
    case 'music': return <Music {...props} />;
    case 'headphones': return <Headphones {...props} />;
    case 'clapperboard': return <Clapperboard {...props} />;
    case 'monitor-play': return <MonitorPlay {...props} />;
    case 'smartphone': return <Smartphone {...props} />;
    case 'cpu': return <Cpu {...props} />;
    case 'moon': return <Moon {...props} />;
    case 'zap': return <Zap {...props} />;
    case 'shirt': return <Shirt {...props} />;
    case 'watch': return <Watch {...props} />;
    case 'gift': return <Gift {...props} />;
    case 'shopping-bag': return <ShoppingBag {...props} />;
    case 'heart': return <Heart {...props} />;
    case 'smile': return <Smile {...props} />;
    case 'users': return <Users {...props} />;
    case 'trophy': return <Trophy {...props} />;
    case 'crown': return <Crown {...props} />;
    case 'plane': return <Plane {...props} />;
    case 'car': return <Car {...props} />;
    case 'home': return <Home {...props} />;
    case 'ghost': return <Ghost {...props} />;
    case 'key': return <Key {...props} />;
    default: return <Star {...props} />;
  }
};

const PurchaseCelebration: React.FC<PurchaseCelebrationProps> = ({ item, onClose }) => {
  const [phase, setPhase] = useState<'INIT' | 'SCAN' | 'REVEAL'>('INIT');

  useEffect(() => {
    // Sequence
    playSystemSoundEffect('SYSTEM');
    
    // Phase 1: Scan starts immediately via CSS/Framer
    setPhase('SCAN');

    // Phase 2: Reveal Text & Impact
    const timer = setTimeout(() => {
        setPhase('REVEAL');
        playSystemSoundEffect('PURCHASE'); 
    }, 600);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div 
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-xl overflow-hidden cursor-pointer"
        onClick={phase === 'REVEAL' ? onClose : undefined}
    >
      {/* Background Radial Glow */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(234,179,8,0.1)_0%,transparent_70%)] pointer-events-none" 
      />
      
      <div className="relative z-10 flex flex-col items-center w-full px-4 max-w-lg">
          
          {/* THE HOLOGRAPHIC CONSTRUCT */}
          <div className="relative w-48 h-48 mb-10 flex items-center justify-center">
              
              {/* 1. Wireframe Box (Expands Out) */}
              <motion.div 
                initial={{ width: 0, height: 2, opacity: 0 }}
                animate={{ width: "100%", height: "100%", opacity: 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="absolute border border-yellow-500/30 bg-yellow-500/5 shadow-[0_0_30px_rgba(234,179,8,0.1)]"
              />

              {/* 2. Corner Brackets (Decor) */}
              <motion.div 
                 initial={{ opacity: 0, scale: 1.2 }}
                 animate={{ opacity: 1, scale: 1 }}
                 transition={{ delay: 0.3 }}
                 className="absolute inset-0"
              >
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-yellow-500" />
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-yellow-500" />
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-yellow-500" />
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-yellow-500" />
              </motion.div>

              {/* 3. The Icon (Scanned Reveal) */}
              <motion.div
                  initial={{ clipPath: "inset(0% 0% 100% 0%)", opacity: 0 }}
                  animate={{ clipPath: "inset(0% 0% 0% 0%)", opacity: 1 }}
                  transition={{ duration: 0.6, ease: "easeInOut" }}
                  className="relative z-20"
              >
                  {getIcon(item.icon, 100)}
                  
                  {/* Scanline Effect inside the icon container */}
                  <motion.div 
                    initial={{ top: "-10%" }}
                    animate={{ top: "110%" }}
                    transition={{ duration: 0.8, ease: "linear", repeat: 0 }}
                    className="absolute left-0 w-full h-2 bg-yellow-400 blur-sm opacity-70"
                  />
              </motion.div>

              {/* 4. Burst Particles (Simple CSS Scale) */}
              {phase === 'REVEAL' && (
                  <>
                    <motion.div 
                        initial={{ scale: 0, opacity: 1 }}
                        animate={{ scale: 2, opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        className="absolute inset-0 border-2 border-yellow-400 rounded-full"
                    />
                    <motion.div 
                        initial={{ scale: 0, opacity: 1 }}
                        animate={{ scale: 1.5, opacity: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="absolute inset-0 border border-white rounded-full"
                    />
                  </>
              )}
          </div>

          {/* TEXT REVEAL */}
          <div className="text-center space-y-3 w-full">
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-yellow-500 font-mono text-xs tracking-[0.3em] font-bold uppercase animate-pulse"
              >
                  Transaction Complete
              </motion.div>
              
              <motion.h1 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, type: "spring" }}
                className="text-3xl sm:text-4xl font-black text-white italic tracking-tighter uppercase leading-none"
                style={{ textShadow: "0 0 25px rgba(234, 179, 8, 0.4)" }}
              >
                  {item.title}
              </motion.h1>
              
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ delay: 0.6, duration: 0.4 }}
                className="h-px bg-gradient-to-r from-transparent via-yellow-600 to-transparent my-4 mx-auto max-w-[200px]"
              />

              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="text-xs text-gray-400 font-mono max-w-xs mx-auto leading-relaxed"
              >
                  {item.description}
              </motion.p>
          </div>

          {/* Button */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            onClick={onClose}
            className="mt-10 px-8 py-3 bg-white text-black font-black font-mono text-xs uppercase tracking-widest rounded hover:bg-yellow-400 hover:scale-105 transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.3)] group z-20"
          >
              <Check size={16} strokeWidth={3} /> 
              <span className="group-hover:tracking-[0.2em] transition-all">CONFIRM</span>
          </motion.button>

      </div>
    </div>
  );
};

export default PurchaseCelebration;
