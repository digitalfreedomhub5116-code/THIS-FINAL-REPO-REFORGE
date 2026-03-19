
import React, { useState } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence, PanInfo } from 'framer-motion';
import { Shield, Zap, Sword, ShoppingBag, ChevronRight, CheckCircle, ScanLine, MousePointerClick } from 'lucide-react';
import { playSystemSoundEffect } from '../utils/soundEngine';

interface FeatureShowcaseProps {
  onComplete: () => void;
}

const FEATURES = [
  {
    id: 'growth',
    title: 'INFINITE GROWTH',
    subtitle: 'THE SYSTEM LEVELS YOU UP',
    description: "Every action you take in real life earns XP. Level up your stats: Strength, Intelligence, and Discipline. Become the S-Rank Hunter.",
    image: "/videos/ranks/s-rank-showcase.mp4",
    isVideo: true,
    icon: Shield,
    color: '#a855f7', // Purple
    accent: 'border-purple-500',
    shadow: 'shadow-purple-500/20'
  },
  {
    id: 'quests',
    title: 'DAILY QUESTS',
    subtitle: 'COMPLETE YOUR MISSIONS',
    description: "The System issues daily tasks. Complete them to avoid the Penalty Zone. Consistency is the only currency that matters.",
    image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070&auto=format&fit=crop",
    isVideo: false,
    icon: Sword,
    color: '#00d2ff', // Neon Blue
    accent: 'border-system-neon',
    shadow: 'shadow-system-neon/20'
  },
  {
    id: 'dungeon',
    title: 'THE DUNGEON',
    subtitle: 'PHYSICAL TRIALS',
    description: "Enter the Workout Dungeon. Log your sets, reps, and nutrition. The System tracks your biological evolution in real-time.",
    image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070&auto=format&fit=crop",
    isVideo: false,
    icon: Zap,
    color: '#ef4444', // Red
    accent: 'border-red-500',
    shadow: 'shadow-red-500/20'
  },
  {
    id: 'shop',
    title: 'SYSTEM SHOP',
    subtitle: 'REWARD YOURSELF',
    description: "Earn Gold through discipline. Spend it on real-life rewards like Cheat Meals, Gaming, or Rest Days. You earn your leisure.",
    image: "https://images.unsplash.com/photo-1618335829737-2228915674e0?q=80&w=2070&auto=format&fit=crop",
    isVideo: false,
    icon: ShoppingBag,
    color: '#eab308', // Yellow
    accent: 'border-yellow-500',
    shadow: 'shadow-yellow-500/20'
  }
];

interface CardProps {
  feature: typeof FEATURES[0];
  index: number;
  activeIndex: number;
  total: number;
  onSwipe: (direction: number) => void;
}

const Card: React.FC<CardProps> = ({ 
  feature, 
  index, 
  activeIndex, 
  total, 
  onSwipe
}) => {
  const x = useMotionValue(0);
  const isFront = index === activeIndex;
  const offset = index - activeIndex;
  
  // Rotation linked to X position for the active card
  const rotateDrag = useTransform(x, [-200, 200], [-15, 15]);
  
  // Opacity fade when dragged
  const opacityDrag = useTransform(x, [-150, 0, 150], [0.5, 1, 0.5]);

  // Dynamic Styles based on stack position
  if (offset > 2) return null;

  // Calculate stack visuals
  const scale = 1 - (offset * 0.05);
  const yOffset = offset * 15;
  // Deterministic random rotation based on ID character codes
  const randomRotate = offset === 0 ? 0 : (feature.id.charCodeAt(0) % 6 - 3) * (offset + 1); 
  const baseOpacity = 1 - (offset * 0.3);
  const zIndex = total - index;

  const handleDragEnd = (e: any, info: PanInfo) => {
    const threshold = 100;
    if (Math.abs(info.offset.x) > threshold) {
        onSwipe(info.offset.x > 0 ? 1 : -1);
    }
  };

  return (
    <motion.div
      style={{ 
        zIndex,
        x: isFront ? x : 0, 
        rotate: isFront ? rotateDrag : randomRotate,
        scale,
        opacity: isFront ? opacityDrag : baseOpacity
      }}
      initial={{ scale: 0.9, opacity: 0, y: 50 }}
      animate={{ 
        scale, 
        opacity: baseOpacity, 
        y: yOffset,
        rotate: randomRotate 
      }}
      exit={{ 
        x: x.get() < 0 ? -300 : 300, 
        opacity: 0,
        rotate: x.get() < 0 ? -20 : 20,
        transition: { duration: 0.4, ease: "easeIn" }
      }}
      drag={isFront ? "x" : false}
      dragSnapToOrigin={true}
      dragElastic={0.6}
      onDragEnd={handleDragEnd}
      whileTap={{ cursor: "grabbing" }}
      className={`absolute w-full max-w-sm aspect-[3/5] md:aspect-[3/4] cursor-grab touch-none`}
    >
      <div className={`
        relative w-full h-full rounded-3xl overflow-hidden border border-white/10
        bg-black/80 backdrop-blur-xl
        flex flex-col shadow-2xl ${feature.shadow}
      `}>
        
        {/* Holographic Sheen Overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none z-20" />
        
        {/* --- CARD MEDIA (TOP) --- */}
        <div className="relative h-[55%] w-full overflow-hidden bg-gray-900 border-b border-gray-800 group">
            <div className="absolute inset-0 z-10 bg-gradient-to-b from-transparent to-black/90" />
            
            {feature.isVideo ? (
                <video 
                    src={feature.image} 
                    autoPlay 
                    loop 
                    muted 
                    playsInline 
                    poster="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
                    className="w-full h-full object-contain sm:object-cover opacity-80 bg-transparent"
                />
            ) : (
                <img 
                    src={feature.image} 
                    alt={feature.title} 
                    className="w-full h-full object-cover opacity-80"
                />
            )}

            {/* Floating Icon */}
            <div className={`absolute bottom-6 left-6 w-14 h-14 rounded-2xl bg-black/50 backdrop-blur-md border ${feature.accent} flex items-center justify-center shadow-lg z-20`}>
                <feature.icon size={28} style={{ color: feature.color }} />
            </div>
            
            {/* Scanline Effect */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] pointer-events-none z-10 opacity-30" />
        </div>

        {/* --- CARD CONTENT (BOTTOM) --- */}
        <div className="flex-1 p-6 md:p-8 flex flex-col justify-between relative z-10">
            <div>
                <div className="flex justify-between items-start mb-2">
                    <h3 className="text-[10px] font-black tracking-[0.3em] uppercase" style={{ color: feature.color }}>
                        {feature.subtitle}
                    </h3>
                    <div className="text-[8px] font-mono text-gray-600 border border-gray-800 px-1 rounded">
                        0{index + 1}
                    </div>
                </div>
                
                <h1 className="text-3xl md:text-4xl font-black text-white italic tracking-tighter mb-4 leading-none">
                    {feature.title}
                </h1>
                
                <p className="text-xs md:text-sm text-gray-400 font-mono leading-relaxed line-clamp-4">
                    {feature.description}
                </p>
            </div>

            {/* Swipe Hint / Button */}
            <div className="mt-4 pt-4 border-t border-gray-800/50 flex items-center justify-between text-gray-500">
                <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest animate-pulse">
                    <ScanLine size={12} /> {isFront ? 'Swipe to Accept' : 'Locked'}
                </div>
                <feature.icon size={16} style={{ color: feature.color, opacity: 0.5 }} />
            </div>
        </div>
      </div>
    </motion.div>
  );
};

const FeatureShowcase: React.FC<FeatureShowcaseProps> = ({ onComplete }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  const handleSwipe = (direction: number) => {
    playSystemSoundEffect('SYSTEM');
    
    // If it's the last card, trigger complete
    if (activeIndex === FEATURES.length - 1) {
        playSystemSoundEffect('LEVEL_UP');
        setTimeout(onComplete, 300);
    }
    setActiveIndex(prev => prev + 1);
  };

  const handleManualNext = () => {
      if (activeIndex < FEATURES.length) {
          handleSwipe(1);
      }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center overflow-hidden font-mono">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(20,20,20,1)_0%,rgba(0,0,0,1)_100%)]" />
      <div className="absolute inset-0 opacity-20 bg-[url('/images/ui/noise.svg')] pointer-events-none" />
      
      {/* Progress Bars */}
      <div className="absolute top-8 left-0 w-full px-8 flex gap-2 z-20">
          {FEATURES.map((_, idx) => (
              <div key={idx} className="h-1 flex-1 bg-gray-900 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-white"
                    initial={{ width: 0 }}
                    animate={{ width: idx < activeIndex ? '100%' : idx === activeIndex ? '50%' : '0%' }}
                    transition={{ duration: 0.3 }}
                  />
              </div>
          ))}
      </div>

      <div className="relative w-full h-full flex flex-col items-center justify-center">
        
        {/* Card Stack Container */}
        <div className="relative w-full max-w-sm aspect-[3/5] md:aspect-[3/4] flex items-center justify-center">
            <AnimatePresence>
                {FEATURES.map((feature, index) => {
                    // Only render current and upcoming cards
                    if (index < activeIndex) return null;
                    
                    return (
                        <Card 
                            key={feature.id}
                            feature={feature}
                            index={index}
                            activeIndex={activeIndex}
                            total={FEATURES.length}
                            onSwipe={handleSwipe}
                        />
                    );
                }).reverse()} 
                {/* Reverse so first index (0) is last in DOM = Top of stack z-index logic handled in component */}
            </AnimatePresence>

            {/* Empty State (All cards swiped) */}
            {activeIndex >= FEATURES.length && (
                <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center justify-center text-center p-8"
                >
                    <div className="w-20 h-20 bg-system-neon/10 rounded-full flex items-center justify-center mb-6 border border-system-neon/30">
                        <CheckCircle size={40} className="text-system-neon" />
                    </div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">SYSTEM INITIALIZED</h2>
                    <p className="text-gray-500 font-mono text-xs mb-8">Welcome to the Brotherhood.</p>
                    <button 
                        onClick={onComplete}
                        className="px-8 py-3 bg-white text-black font-black font-mono rounded hover:bg-gray-200 transition-colors uppercase tracking-widest"
                    >
                        ENTER
                    </button>
                </motion.div>
            )}
        </div>

        {/* Bottom Controls / Hints */}
        {activeIndex < FEATURES.length && (
            <motion.div 
                className="absolute bottom-10 flex flex-col items-center gap-4 z-20"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
            >
                <div className="flex items-center gap-4">
                    <button 
                        onClick={handleManualNext}
                        className="w-12 h-12 rounded-full border border-gray-700 bg-black/50 text-white flex items-center justify-center hover:bg-gray-800 transition-colors"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono uppercase tracking-widest">
                    <MousePointerClick size={12} /> Drag or Click to Navigate
                </div>
            </motion.div>
        )}

      </div>
    </div>
  );
};

export default FeatureShowcase;
