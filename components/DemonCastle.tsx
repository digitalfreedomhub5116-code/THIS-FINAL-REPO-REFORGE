
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, animate } from 'framer-motion';
import { Ghost, Key, Coins, Skull, LogOut, Timer, AlertOctagon, Sparkles, Crown, ArrowUpCircle } from 'lucide-react';
import { playSystemSoundEffect } from '../utils/soundEngine';
import { useCoinReward } from '../hooks/useCoinReward';

type CardType = 'SAFE' | 'TRAP' | 'JACKPOT';

interface FloorCardData {
  id: string;
  type: CardType;
  reward: { gold: number; xp: number; keys: number };
}

interface DemonCastleProps {
  gold: number;
  keys: number;
  lastDungeonEntry: number | undefined;
  onDeductGold: (amount: number) => boolean;
  onConsumeKey: (amount?: number) => Promise<boolean>;
  onEnterDungeon: (isFree: boolean) => Promise<boolean>;
  onAddRewards: (gold: number, xp: number, keys?: number) => void;
  onPlayStateChange: (isPlaying: boolean) => void; 
  initialMode?: 'LOBBY' | 'PLAYING';
  onExit?: () => void;
}

// --- SUB-COMPONENT: COUNTING NUMBER ---
const CountingNumber = ({ value }: { value: number }) => {
  const nodeRef = useRef<HTMLSpanElement>(null);
  const prevValue = useRef(value);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;

    // Animate from previous value to new value
    const controls = animate(prevValue.current, value, {
      duration: 1.0, // Faster count up
      ease: "easeOut",
      onUpdate: (v) => {
        node.textContent = Math.round(v).toString();
      }
    });
    
    prevValue.current = value;
    return () => controls.stop();
  }, [value]);

  // Initial render
  return <span ref={nodeRef}>{value}</span>;
};

// --- SCALING LOGIC HELPERS ---
const getReviveCost = (floor: number): number => {
  if (floor <= 6) return 1;
  if (floor <= 12) return 3;
  if (floor <= 18) return 6;
  if (floor <= 24) return 12;
  if (floor <= 30) return 24;
  if (floor <= 36) return 35;
  return 46; // Cap at 46 for very high floors, or extend if needed
};

const getKeyReward = (floor: number): number => {
  if (floor <= 10) return 1;
  if (floor <= 20) return 3;
  if (floor <= 30) return 5;
  if (floor <= 40) return 8;
  if (floor <= 50) return 11;
  // 51+ adds 3 every 10 floors (14, 17, 20...)
  const extraTiers = Math.floor((floor - 51) / 10);
  return 14 + (Math.max(0, extraTiers) * 3);
};

// --- SUB-COMPONENT: VINTAGE ELEVATOR GAUGE ---
const ElevatorGauge: React.FC<{ floor: number }> = ({ floor }) => {
    const rotation = ((floor % 10) / 10) * 180 - 90;

    return (
        <div className="relative w-48 h-24 mx-auto mb-[-10px] z-20">
            {/* Gauge Housing */}
            <div className="absolute inset-0 bg-gradient-to-b from-yellow-700 to-yellow-900 rounded-t-full border-[4px] border-[#3a2d20] shadow-xl overflow-hidden">
                <div className="absolute inset-1 bg-[#1a120b] rounded-t-full opacity-90" />
                
                {/* Tick Marks & Numbers */}
                {Array.from({ length: 11 }).map((_, i) => {
                    const deg = (i / 10) * 180 - 90;
                    return (
                        <div 
                            key={i}
                            className="absolute bottom-0 left-1/2 w-full h-full origin-bottom"
                            style={{ transform: `translateX(-50%) rotate(${deg}deg)` }}
                        >
                            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-0.5 h-2 bg-yellow-500/30" />
                            {i % 2 === 0 && (
                                <span 
                                    className="absolute top-4 left-1/2 -translate-x-1/2 text-[8px] font-bold text-yellow-500/50 transform -rotate-90 font-mono"
                                    style={{ transform: `translateX(-50%) rotate(${-deg}deg)` }}
                                >
                                    {Math.floor(floor / 10) * 10 + i}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* The Needle */}
            <motion.div 
                className="absolute bottom-2 left-1/2 w-1 h-[80%] bg-red-600 origin-bottom z-20 rounded-full shadow-[0_0_5px_rgba(220,38,38,0.8)]"
                animate={{ rotate: rotation }}
                transition={{ type: "spring", stiffness: 80, damping: 15 }}
                style={{ marginLeft: '-2px' }}
            >
                <div className="w-2 h-2 bg-red-400 rounded-full absolute top-0 left-1/2 -translate-x-1/2" />
            </motion.div>
            
            {/* Center Hub */}
            <div className="absolute bottom-[-10px] left-1/2 -translate-x-1/2 w-8 h-8 bg-gradient-to-t from-gray-800 to-gray-600 rounded-full border-2 border-[#3a2d20] z-30 shadow-lg" />
        </div>
    );
};

// --- SUB-COMPONENT: REALISTIC DUNGEON DOORS ---
const DungeonDoors: React.FC<{ isOpen: boolean }> = ({ isOpen }) => {
    return (
        <div className="absolute inset-0 z-40 pointer-events-none flex overflow-hidden rounded-t-[10rem] rounded-b-lg">
            {/* Left Door */}
            <motion.div 
                initial={{ x: 0 }}
                animate={{ x: isOpen ? '-100%' : '0%' }}
                transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] }} 
                className="w-1/2 h-full bg-[#1a1a1a] border-r border-black relative shadow-2xl bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]"
            >
                <div className="absolute inset-y-0 right-4 w-1 bg-black/50" />
                <div className="absolute inset-y-0 right-8 w-px bg-white/5" />
                <div className="absolute top-1/2 right-6 w-2 h-16 bg-yellow-900/50 rounded-l shadow-inner border border-yellow-900/30" />
            </motion.div>

            {/* Right Door */}
            <motion.div 
                initial={{ x: 0 }}
                animate={{ x: isOpen ? '100%' : '0%' }}
                transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
                className="w-1/2 h-full bg-[#1a1a1a] border-l border-black relative shadow-2xl bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]"
            >
                <div className="absolute inset-y-0 left-4 w-1 bg-black/50" />
                <div className="absolute inset-y-0 left-8 w-px bg-white/5" />
                <div className="absolute top-1/2 left-6 w-2 h-16 bg-yellow-900/50 rounded-r shadow-inner border border-yellow-900/30" />
            </motion.div>
            
            {/* Center Seam Glow */}
            <motion.div 
                animate={{ opacity: isOpen ? 0 : 1 }}
                className="absolute inset-y-0 left-1/2 w-0.5 bg-black -translate-x-1/2 z-50 shadow-[0_0_10px_rgba(0,0,0,0.8)]"
            />
        </div>
    );
};

// --- ANIMATION COMPONENT: VINTAGE CARD ---
const VintageCardBack = () => (
  <div className="w-full h-full bg-gradient-to-br from-[#450a0a] to-[#2b0003] rounded-xl border-[4px] border-[#92400e] relative overflow-hidden shadow-inner group">
    {/* Pattern */}
    <div className="absolute inset-0 opacity-10" 
         style={{ backgroundImage: 'radial-gradient(#d97706 1px, transparent 1px)', backgroundSize: '12px 12px' }} />
    
    <div className="absolute inset-2 border border-[#92400e]/50 rounded-lg flex items-center justify-center">
        <div className="absolute inset-0 border border-[#92400e]/20 rounded-lg scale-90" />
    </div>
    
    <div className="absolute inset-0 flex items-center justify-center">
        <motion.div 
            className="w-16 h-16 bg-gradient-to-br from-[#78350f] to-[#451a03] rounded-full border-2 border-[#b45309] flex items-center justify-center shadow-[0_0_20px_rgba(180,83,9,0.3)]"
            animate={{ boxShadow: ['0 0 10px rgba(180,83,9,0.2)', '0 0 20px rgba(180,83,9,0.5)', '0 0 10px rgba(180,83,9,0.2)'] }}
            transition={{ duration: 3, repeat: Infinity }}
        >
            <span className="text-[#fcd34d] font-serif text-2xl font-bold opacity-80">?</span>
        </motion.div>
    </div>
  </div>
);

const VintageCardFront = ({ data }: { data: FloorCardData }) => {
  const isTrap = data.type === 'TRAP';
  const isJackpot = data.type === 'JACKPOT';
  const hasKey = data.reward.keys > 0;

  // Memoize random particle values
  const jackpotParticles = useMemo(() => Array.from({ length: 6 }).map(() => ({
      x: (Math.random() - 0.5) * 60,
      y: (Math.random() - 0.5) * 60,
      delay: Math.random()
  })), []);

  const goldParticles = useMemo(() => Array.from({ length: 4 }).map(() => ({
      marginLeft: (Math.random() - 0.5) * 50,
      delay: Math.random() * 0.7
  })), []);

  // Base Styles based on Type
  const bgClass = isTrap 
    ? "bg-[#0f0f0f] border-red-900"
    : isJackpot 
      ? "bg-[#1a0b2e] border-purple-500"
      : "bg-[#f5e6ca] border-[#c2a168]"; // Parchment

  return (
    <div className={`w-full h-full rounded-xl border-[4px] relative overflow-hidden flex flex-col items-center justify-center shadow-[inset_0_0_30px_rgba(0,0,0,0.2)] ${bgClass}`}>
      
      {/* Texture Overlays */}
      <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/paper-fibers.png")' }} />
      
      {/* Corner Decorations */}
      <div className={`absolute top-1 left-1 w-4 h-4 border-t-2 border-l-2 rounded-tl-sm opacity-50 ${isTrap ? 'border-red-700' : 'border-current'}`} style={{ color: isTrap ? '' : isJackpot ? '#a855f7' : '#854d0e' }} />
      <div className={`absolute top-1 right-1 w-4 h-4 border-t-2 border-r-2 rounded-tr-sm opacity-50 ${isTrap ? 'border-red-700' : 'border-current'}`} style={{ color: isTrap ? '' : isJackpot ? '#a855f7' : '#854d0e' }} />
      <div className={`absolute bottom-1 left-1 w-4 h-4 border-b-2 border-l-2 rounded-bl-sm opacity-50 ${isTrap ? 'border-red-700' : 'border-current'}`} style={{ color: isTrap ? '' : isJackpot ? '#a855f7' : '#854d0e' }} />
      <div className={`absolute bottom-1 right-1 w-4 h-4 border-b-2 border-r-2 rounded-br-sm opacity-50 ${isTrap ? 'border-red-700' : 'border-current'}`} style={{ color: isTrap ? '' : isJackpot ? '#a855f7' : '#854d0e' }} />

      {/* Floating Content Wrapper */}
      <motion.div 
        className="flex flex-col items-center justify-center relative z-10"
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        {isTrap ? (
            <>
               <div className="absolute inset-[-60px] bg-red-900/20 blur-2xl animate-pulse pointer-events-none" />
               <motion.div 
                 animate={{ scale: [1, 1.1, 1], rotate: [0, 3, -3, 0] }}
                 transition={{ duration: 0.4, repeat: Infinity }}
                 className="text-red-600 drop-shadow-[0_0_15px_rgba(220,38,38,0.9)] mb-2 relative"
               >
                   <Skull size={52} strokeWidth={2} />
                   <div className="absolute inset-0 flex items-center justify-center opacity-40 text-white mix-blend-overlay">
                      <AlertOctagon size={36} />
                   </div>
               </motion.div>
               <div className="font-black text-red-600 uppercase tracking-[0.2em] text-lg font-serif drop-shadow-md">CURSED</div>
               <div className="h-px w-8 bg-red-800/50 mt-1 mb-1" />
               <div className="text-[8px] text-red-500/70 font-mono tracking-widest">SYSTEM LOCK</div>
            </>
        ) : isJackpot ? (
            <>
               <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  {jackpotParticles.map((p, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: [0, 1, 0], scale: [0, 1, 0], x: p.x, y: p.y }}
                        transition={{ duration: 2, repeat: Infinity, delay: p.delay }}
                        className="absolute top-1/2 left-1/2"
                      >
                          <Sparkles size={8} className="text-yellow-200" />
                      </motion.div>
                  ))}
               </div>

               <motion.div 
                 animate={{ rotateY: 360 }}
                 transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                 className="text-purple-400 drop-shadow-[0_0_15px_rgba(168,85,247,0.6)] mb-2 relative z-10"
               >
                   <Crown size={48} strokeWidth={1.5} />
               </motion.div>
               <div className="font-black text-purple-300 uppercase tracking-widest text-base font-serif relative z-10">JACKPOT</div>
               <div className="text-[8px] text-purple-400/70 font-mono tracking-widest mt-1 flex items-center gap-1 justify-center">
                   <Key size={8} /> +{data.reward.keys}
               </div>
            </>
        ) : hasKey ? (
            <>
               <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  {jackpotParticles.map((p, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: [0, 1, 0], scale: [0, 1, 0], x: p.x, y: p.y }}
                        transition={{ duration: 2, repeat: Infinity, delay: p.delay }}
                        className="absolute top-1/2 left-1/2"
                      >
                          <Sparkles size={8} className="text-purple-200" />
                      </motion.div>
                  ))}
               </div>

               <motion.div 
                 animate={{ rotateY: 360 }}
                 transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                 className="text-purple-600 drop-shadow-[0_0_15px_rgba(147,51,234,0.4)] mb-2 relative z-10"
               >
                   <Key size={48} strokeWidth={1.5} fill="#a855f7" className="text-purple-800" />
               </motion.div>
               <div className="font-black text-purple-800 uppercase tracking-widest text-xl font-serif relative z-10 drop-shadow-sm">+{data.reward.keys} KEY</div>
               <div className="text-[8px] text-purple-700 font-bold uppercase tracking-widest relative z-10">DUNGEON ITEM</div>
            </>
        ) : (
            <>
               {/* Gold Particles */}
               <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  {goldParticles.map((p, i) => (
                      <motion.div
                        key={i}
                        initial={{ y: 60, opacity: 0 }}
                        animate={{ y: -60, opacity: [0, 1, 0] }}
                        transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.7, ease: "easeOut" }}
                        className="absolute left-1/2 text-[#b08d55]/20"
                        style={{ marginLeft: p.marginLeft }}
                      >
                          <Coins size={10} fill="currentColor" />
                      </motion.div>
                  ))}
               </div>

               <motion.div 
                 animate={{ rotateY: 360 }}
                 transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                 className="text-[#b08d55] drop-shadow-sm mb-2 relative z-10"
               >
                   <Coins size={48} strokeWidth={1.5} fill="#eab308" className="text-yellow-700" />
               </motion.div>
               <div className="font-black text-[#5c4033] uppercase tracking-widest text-xl font-serif relative z-10 drop-shadow-sm">{data.reward.gold}</div>
               <div className="text-[8px] text-[#854d0e] font-bold uppercase tracking-widest relative z-10">GOLD COINS</div>
            </>
        )}
      </motion.div>
    </div>
  );
};

interface DemonCardProps {
    data: FloorCardData;
    isFlipped: boolean;
    isDimmed: boolean; 
    onClick: (rect: DOMRect) => void;
    disabled: boolean;
}

const DemonCard: React.FC<DemonCardProps> = ({ data, isFlipped, isDimmed, onClick, disabled }) => {
    const cardRef = useRef<HTMLDivElement>(null);

    const handleClick = () => {
        if (disabled || isFlipped) return;
        if (cardRef.current) {
            onClick(cardRef.current.getBoundingClientRect());
        }
    };

    return (
        <div className="relative aspect-[3/4] perspective-1000 group">
            <motion.div
                ref={cardRef}
                onClick={handleClick}
                animate={{ 
                    rotateY: isFlipped ? 180 : 0,
                    scale: isFlipped && !isDimmed ? 1.05 : isDimmed ? 0.95 : 1,
                    opacity: isDimmed ? 0.8 : 1, 
                    filter: isDimmed ? 'grayscale(0.3)' : 'none'
                }}
                transition={{ duration: 0.4, type: "spring", stiffness: 260, damping: 20 }}
                className={`w-full h-full relative preserve-3d cursor-pointer transition-all duration-300 ${disabled && !isFlipped ? 'cursor-not-allowed' : ''}`}
                style={{ transformStyle: "preserve-3d" }}
            >
                {/* FRONT (HIDDEN INITIALLY) */}
                <div className="absolute inset-0 backface-hidden shadow-xl rounded-xl" style={{ backfaceVisibility: 'hidden' }}>
                    <VintageCardBack />
                </div>

                {/* BACK (REVEALED) */}
                <div className="absolute inset-0 backface-hidden shadow-xl rounded-xl" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                    <VintageCardFront data={data} />
                </div>
            </motion.div>
        </div>
    );
};

// --- WRAPPER FOR FLOATING ANIMATION ---
const FloatingCardWrapper: React.FC<{ children: React.ReactNode, index: number }> = ({ children, index }) => {
    const floatDuration = useMemo(() => 3 + Math.random(), []);
    const delay = useMemo(() => index * 0.2, [index]);

    return (
        <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ 
                duration: floatDuration, 
                repeat: Infinity, 
                ease: "easeInOut",
                delay: delay 
            }}
        >
            {children}
        </motion.div>
    );
};

// --- LOOT FLYING ANIMATION ---
const FlyingLoot: React.FC<{ lootType: 'GOLD' | 'KEY'; startRect: DOMRect | null }> = ({ lootType, startRect }) => {
    if (!startRect) return null;

    // Calculate different destinations based on type
    // Gold goes to "loot-bag-balance" (top right, upper)
    // Key goes to "loot-bag-keys" (top right, lower)
    const endTop = lootType === 'GOLD' ? 40 : 65; 

    return (
        <motion.div
            initial={{ 
                position: 'fixed',
                top: startRect.top + startRect.height / 2,
                left: startRect.left + startRect.width / 2,
                opacity: 1, 
                scale: 0.5,
                zIndex: 100 
            }}
            animate={{ 
                top: endTop, 
                left: window.innerWidth - 60, // Approximate right align
                scale: [1, 1.5, 0.5],
                opacity: [1, 1, 0]
            }}
            transition={{ duration: 0.6, ease: "easeInOut" }} 
            className="pointer-events-none"
        >
            <div className={`p-2 rounded-full border-2 shadow-[0_0_20px_rgba(255,255,255,0.8)] ${lootType === 'KEY' ? 'bg-purple-500 border-white' : 'bg-yellow-400 border-white'}`}>
                {lootType === 'KEY' ? <Key size={20} color="white" fill="currentColor" /> : <Coins size={20} color="white" fill="currentColor" />}
            </div>
        </motion.div>
    );
};

// --- SUB-COMPONENT: IMPACT CONFETTI ---
const ImpactConfetti: React.FC<{ active: boolean }> = ({ active }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: any[] = [];
    const colors = ['#60a5fa', '#a855f7', '#fbbf24', '#34d399', '#f472b6'];

    // Create particles from left and right
    for (let i = 0; i < 150; i++) {
      const isLeft = i % 2 === 0;
      particles.push({
        x: isLeft ? 0 : canvas.width,
        y: canvas.height * 0.5,
        vx: (isLeft ? 1 : -1) * (Math.random() * 15 + 10),
        vy: (Math.random() - 0.5) * 20,
        gravity: 0.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 4,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
        opacity: 1,
        decay: Math.random() * 0.02 + 0.01
      });
    }

    let animationFrame: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      let alive = false;
      particles.forEach(p => {
        if (p.opacity <= 0) return;
        alive = true;
        
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.vx *= 0.95; // Drag
        p.rotation += p.rotationSpeed;
        p.opacity -= p.decay;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      });

      if (alive) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animate();

    return () => cancelAnimationFrame(animationFrame);
  }, [active]);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[300]" />;
};

// --- SUB-COMPONENT: SEQUENTIAL REWARD ---
const SequentialReward: React.FC<{ 
  value: number; 
  label: string; 
  icon: React.ReactNode; 
  delay: number; 
  color: string;
  onComplete?: () => void;
  start: boolean;
}> = ({ value, label, icon, delay, color, onComplete, start }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const hasRun = useRef(false);

  useEffect(() => {
    if (!start || hasRun.current) return;
    
    // Zero handling: if 0, just show it dimmed immediately (or after delay)
    if (value <= 0) {
       const t = setTimeout(() => {
         setDisplayValue(0);
         hasRun.current = true;
         onComplete?.();
       }, delay * 1000);
       return () => clearTimeout(t);
    }

    const t = setTimeout(() => {
      let startTime: number;
      const duration = 1500; // 1.5s spin up
      let lastSoundTime = 0;
      
      const animate = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3); // EaseOutCubic
        
        const current = Math.floor(ease * value);
        setDisplayValue(current);

        // Sound clicks (throttled)
        if (progress < 1 && timestamp - lastSoundTime > 100) {
           if (Math.random() > 0.5) playSystemSoundEffect('CLICK');
           lastSoundTime = timestamp;
        }

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setDisplayValue(value);
          hasRun.current = true;
          playSystemSoundEffect('COIN');
          onComplete?.();
        }
      };
      
      requestAnimationFrame(animate);
    }, delay * 1000);

    return () => clearTimeout(t);
  }, [start, value, delay, onComplete]);

  // Determine styles based on color prop
  const colorStyles = {
    'yellow-500': { text: 'text-yellow-500', border: 'border-yellow-500/30', bg: 'bg-yellow-500/5' },
    'blue-500': { text: 'text-blue-500', border: 'border-blue-500/30', bg: 'bg-blue-500/5' },
    'purple-500': { text: 'text-purple-500', border: 'border-purple-500/30', bg: 'bg-purple-500/5' },
  }[color] || { text: 'text-gray-500', border: 'border-gray-500', bg: 'bg-gray-500/5' };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: start ? (value > 0 ? 1 : 0.5) : 0, y: start ? 0 : 20 }}
      className={`flex flex-col items-center p-4 rounded-xl border ${value > 0 ? `${colorStyles.border} ${colorStyles.bg}` : 'border-gray-800 bg-black/40'}`}
    >
      <div className={`mb-2 ${value > 0 ? colorStyles.text : 'text-gray-600'}`}>
        {icon}
      </div>
      <div className={`text-2xl font-black font-mono ${value > 0 ? colorStyles.text : 'text-gray-600'}`}>
        {displayValue}
      </div>
      <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mt-1">
        {label}
      </div>
    </motion.div>
  );
};

// --- SUB-COMPONENT: VICTORY SCREEN (PREMIUM) ---
const VictoryScreen: React.FC<{ 
  loot: { gold: number; xp: number; keys: number };
  onClose: () => void;
}> = ({ loot, onClose }) => {
  const [stage, setStage] = useState<'intro' | 'rewards' | 'done'>('intro');
  const [rewardStage, setRewardStage] = useState(0); // 0: Gold, 1: XP, 2: Keys
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    // Start rewards after intro
    const t = setTimeout(() => setStage('rewards'), 1000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (stage === 'rewards' && rewardStage === 3) {
      setTimeout(() => {
        setStage('done');
        if (loot.gold > 0 || loot.xp > 0 || loot.keys > 0) {
            setShowConfetti(true);
            playSystemSoundEffect('LEVEL_UP'); 
        }
      }, 500);
    }
  }, [rewardStage, stage, loot]);

  // Gold Rays Calculation
  const goldRays = Array.from({ length: 16 }, (_, i) => i * 22.5);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-xl">
      <ImpactConfetti active={showConfetti} />
      
      {/* Background Rays */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        {goldRays.map((deg) => (
        <motion.div
            key={deg}
            initial={{ opacity: 0, scaleY: 0 }}
            animate={{ opacity: [0, 0.15, 0.08, 0.15], scaleY: 1 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: (deg / 360) * 2 }}
            className="absolute w-[2px] origin-bottom"
            style={{
            height: '60vh',
            background: deg % 2 === 0 
                ? 'linear-gradient(to top, rgba(59,130,246,0.3), transparent)'
                : 'linear-gradient(to top, rgba(147,51,234,0.25), transparent)',
            transform: `rotate(${deg}deg)`,
            transformOrigin: 'bottom center',
            }}
        />
        ))}
      </div>

      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md bg-[#0a0a0f] border border-blue-900/50 rounded-3xl p-8 relative overflow-hidden shadow-[0_0_50px_rgba(59,130,246,0.2)]"
      >
        {/* Header */}
        <div className="text-center mb-10 relative z-10">
          <motion.h1 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-4xl font-black italic text-transparent bg-clip-text bg-gradient-to-b from-blue-400 to-blue-600 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]"
          >
            DUNGEON CLEARED
          </motion.h1>
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: "100px" }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="h-1 bg-blue-500 mx-auto mt-4 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)]" 
          />
        </div>

        {/* Rewards Grid */}
        <div className="grid grid-cols-3 gap-4 mb-10 relative z-10">
           <SequentialReward 
             start={stage === 'rewards' || stage === 'done'}
             value={loot.gold} 
             label="Gold" 
             icon={<Coins size={24} />} 
             delay={0}
             color="yellow-500"
             onComplete={() => setRewardStage(prev => Math.max(prev, 1))}
           />
           <SequentialReward 
             start={rewardStage >= 1}
             value={loot.xp} 
             label="XP" 
             icon={<ArrowUpCircle size={24} />} 
             delay={0.2} 
             color="blue-500"
             onComplete={() => setRewardStage(prev => Math.max(prev, 2))}
           />
           <SequentialReward 
             start={rewardStage >= 2}
             value={loot.keys} 
             label="Keys" 
             icon={<Key size={24} />} 
             delay={0.2} 
             color="purple-500"
             onComplete={() => setRewardStage(prev => Math.max(prev, 3))}
           />
        </div>

        {/* Footer Button */}
        <div className="h-14 relative z-10">
            <AnimatePresence>
            {stage === 'done' && (
                <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className="w-full py-4 bg-blue-900/20 border border-blue-500/50 text-blue-400 font-bold tracking-widest rounded-xl hover:bg-blue-500/20 transition-all shadow-[0_0_20px_rgba(59,130,246,0.15)]"
                >
                CONFIRM
                </motion.button>
            )}
            </AnimatePresence>
        </div>

      </motion.div>
    </div>
  );
};

// --- SUB-COMPONENT: GAME OVER SCREEN (PREMIUM) ---
const GameOverScreen: React.FC<{ 
  onClose: () => void;
}> = ({ onClose }) => {
  const [screenShake, setScreenShake] = useState(true);

  useEffect(() => {
    // Initial impact shake
    const t = setTimeout(() => setScreenShake(false), 500);
    playSystemSoundEffect('GAME_OVER'); // Assume this exists or fallback
    return () => clearTimeout(t);
  }, []);

  /* ── SVG Fractured Diamond (DEFEATED icon) ── */
  const FracturedDiamond = () => (
    <svg viewBox="0 0 64 64" width="48" height="48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M32 4 L58 32 L32 60 L6 32 Z" stroke="currentColor" strokeWidth="2.5" fill="none" />
      <line x1="18" y1="18" x2="46" y2="46" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
      <line x1="46" y1="18" x2="18" y2="46" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
      <line x1="32" y1="4" x2="32" y2="60" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      <line x1="6" y1="32" x2="58" y2="32" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      <path d="M24 28 L20 32 L26 36" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.8" strokeLinecap="round" />
      <path d="M40 28 L44 32 L38 36" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.8" strokeLinecap="round" />
    </svg>
  );

  return (
    <motion.div 
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center p-6 text-center bg-black/95 backdrop-blur-xl overflow-hidden"
      animate={screenShake ? { x: [0, -4, 4, -4, 4, 0], y: [0, -2, 2, -2, 2, 0] } : {}}
      transition={{ duration: 0.4 }}
    >
        {/* Background Overlay */}
        <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.3),transparent_70%)]" />

        {/* Scanlines */}
        <div
            className="absolute inset-0 pointer-events-none opacity-[0.05]"
            style={{
                backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, #ef4444 3px, #ef4444 4px)',
            }}
        />

        <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-full max-w-md bg-[#0a0505] border-2 border-red-600/50 rounded-3xl p-8 relative overflow-hidden shadow-[0_0_60px_rgba(220,38,38,0.25)]"
        >
            {/* Top Glow Line */}
            <motion.div 
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 1.5, delay: 0.2 }}
                className="absolute top-0 left-0 h-[2px] bg-red-600 shadow-[0_0_15px_#ef4444]"
            />

            {/* Icon Circle */}
            <div className="mb-8 relative flex justify-center">
                <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                    className="w-28 h-28 rounded-full border-4 border-red-600/30 flex items-center justify-center bg-black/50 backdrop-blur-sm relative z-10"
                >
                    <div className="text-red-600 drop-shadow-[0_0_15px_rgba(220,38,38,0.8)]">
                        <FracturedDiamond />
                    </div>
                </motion.div>
                {/* Outer Pulse Ring */}
                <motion.div 
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full border border-red-600/50" 
                />
            </div>
            
            {/* Typography */}
            <div className="space-y-3 mb-10">
                <motion.h1 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-5xl font-black font-serif uppercase tracking-tighter text-red-600 drop-shadow-[0_0_10px_rgba(220,38,38,0.6)]"
                >
                    DEFEATED
                </motion.h1>
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="flex items-center justify-center gap-2"
                >
                    <div className="h-px w-8 bg-red-900/50" />
                    <p className="text-[10px] text-red-500/60 font-mono tracking-[0.3em] uppercase">
                        SYSTEM CRITICAL FAILURE
                    </p>
                    <div className="h-px w-8 bg-red-900/50" />
                </motion.div>
            </div>
            
            {/* Zeroed Rewards */}
            <div className="bg-black/40 border border-red-900/30 rounded-xl p-5 grid grid-cols-3 gap-4 mb-10 relative">
                {/* Corner Accents */}
                <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-red-600/50" />
                <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-red-600/50" />
                <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-red-600/50" />
                <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-red-600/50" />

                <div className="flex flex-col items-center gap-2 opacity-50 grayscale">
                    <Coins size={20} className="text-gray-600" />
                    <div className="text-xs font-bold text-gray-700 font-mono">0</div>
                    <div className="text-[8px] font-bold uppercase tracking-wider text-gray-800">GOLD</div>
                </div>
                <div className="flex flex-col items-center gap-2 opacity-50 grayscale border-x border-red-900/20 px-2">
                    <ArrowUpCircle size={20} className="text-gray-600" />
                    <div className="text-xs font-bold text-gray-700 font-mono">0</div>
                    <div className="text-[8px] font-bold uppercase tracking-wider text-gray-800">XP</div>
                </div>
                <div className="flex flex-col items-center gap-2 opacity-50 grayscale">
                    <Key size={20} className="text-gray-600" />
                    <div className="text-xs font-bold text-gray-700 font-mono">0</div>
                    <div className="text-[8px] font-bold uppercase tracking-wider text-gray-800">KEYS</div>
                </div>
            </div>
            
            {/* Action Button */}
            <motion.button 
                whileHover={{ scale: 1.02, backgroundColor: "rgba(220, 38, 38, 0.1)" }}
                whileTap={{ scale: 0.98 }}
                onClick={onClose} 
                className="w-full py-4 border border-red-600/50 bg-[#1a0505] text-red-500 font-bold font-mono rounded-xl uppercase tracking-widest text-xs shadow-[0_0_20px_rgba(220,38,38,0.1)] hover:shadow-[0_0_30px_rgba(220,38,38,0.2)] hover:text-red-400 transition-all"
            >
                RETURN TO LOBBY
            </motion.button>
        </motion.div>
    </motion.div>
  );
};

// --- MAIN COMPONENT ---

const DemonCastle: React.FC<DemonCastleProps> = ({ 
    keys, 
    lastDungeonEntry, 
    onConsumeKey, 
    onAddRewards, 
    onEnterDungeon,
    onPlayStateChange,
    initialMode,
    onExit
}) => {
  const { triggerCoinReward } = useCoinReward();
  const [windowSize, setWindowSize] = useState({ w: typeof window !== 'undefined' ? window.innerWidth : 0, h: typeof window !== 'undefined' ? window.innerHeight : 0 });
  const isMounted = useRef(true);

  // Initialize mode based on prop or default to LOBBY
  const [mode, setMode] = useState<'LOBBY' | 'PLAYING' | 'VICTORY' | 'GAMEOVER'>(initialMode || 'LOBBY');
  const [turnState, setTurnState] = useState<'IDLE' | 'REVEALING' | 'SHOW_ALL' | 'TRANSITION'>('IDLE');
  
  // Visual States
  const [isDoorOpen, setIsDoorOpen] = useState(false);
  const [areCardsVisible, setAreCardsVisible] = useState(false);
  const [isTrapped, setIsTrapped] = useState(false);

  // Data
  const [floor, setFloor] = useState(1);
  const [lootBag, setLootBag] = useState({ gold: 0, xp: 0, keys: 0 });
  const [cards, setCards] = useState<FloorCardData[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  
  // Timer State for Free Entry
  const [timeUntilFree, setTimeUntilFree] = useState<number>(0);
  
  // Zoom Animation State
  const [zoomedCard, setZoomedCard] = useState<{ data: FloorCardData; initialRect: DOMRect } | null>(null);
  const [zoomFlipped, setZoomFlipped] = useState(false);

  // FX
  const [flyingLoot, setFlyingLoot] = useState<{ lootType: 'GOLD' | 'KEY'; rect: DOMRect } | null>(null);
  const [isScreenShaking, setIsScreenShaking] = useState(false);

  const PAID_ENTRY_COST = 3;

  useEffect(() => {
      isMounted.current = true;
      const handleResize = () => setWindowSize({ w: window.innerWidth, h: window.innerHeight });
      window.addEventListener('resize', handleResize);
      return () => {
          isMounted.current = false;
          window.removeEventListener('resize', handleResize);
      };
  }, []);

  // --- LOGIC ---

  const generateFloor = (floorNum: number) => {
      const ts = Date.now();
      const isJackpotFloor = floorNum % 5 === 0;
      
      let trapCount = 1;
      if (floorNum === 1) trapCount = 0;
      else if (isJackpotFloor) trapCount = 0; // Guaranteed win floor
      else if (floorNum >= 8) trapCount = 2;

      const newCards: FloorCardData[] = [];

      for (let i = 0; i < trapCount; i++) {
          newCards.push({ 
              id: `trap-${i}-${floorNum}-${ts}`, 
              type: 'TRAP', 
              reward: { gold: 0, xp: 0, keys: 0 } 
          });
      }

      const safeSlots = 4 - trapCount;
      
      for (let i = 0; i < safeSlots; i++) {
          const isJackpotCard = isJackpotFloor && i === 0; 
          
          let hasKey = false;
          if (isJackpotFloor) {
              hasKey = true; 
          } else {
              hasKey = Math.random() < 0.25;
          }

          // Use the helper to determine key count if a key is present
          const keyRewardCount = hasKey ? getKeyReward(floorNum) : 0;

          if (isJackpotCard) {
              newCards.push({
                  id: `jackpot-${floorNum}-${ts}`,
                  type: 'JACKPOT',
                  reward: { 
                      gold: 100 + floorNum * 10, 
                      xp: 200 + floorNum * 20, 
                      keys: Math.max(1, getKeyReward(floorNum)) // Jackpot usually guarantees good loot
                  }
              });
          } else {
              newCards.push({
                  id: `safe-${i}-${floorNum}-${ts}`,
                  type: 'SAFE',
                  reward: { 
                      gold: 10 + (floorNum * 5) + Math.floor(Math.random() * 20), 
                      xp: 20 + (floorNum * 5), 
                      keys: keyRewardCount
                  }
              });
          }
      }

      return newCards.sort(() => Math.random() - 0.5);
  };

  // If initialMode is PLAYING, initialize game state immediately
  useEffect(() => {
      if (initialMode === 'PLAYING') {
          // Initialize game state logic that normally happens in handleStartRun
          setFloor(1);
          setLootBag({ gold: 0, xp: 0, keys: 0 });
          setCards(generateFloor(1));
          setTurnState('IDLE');
          setSelectedCardId(null);
          setIsTrapped(false);
          playSystemSoundEffect('SYSTEM');
          
          setIsDoorOpen(false); 
          setAreCardsVisible(false);
          
          setTimeout(() => {
              if (isMounted.current) setIsDoorOpen(true);
              setTimeout(() => {
                  if (isMounted.current) setAreCardsVisible(true);
              }, 400); 
          }, 800);
      }
  }, [initialMode]);

  // Timer Logic
  useEffect(() => {
      const checkTimer = () => {
          const lastEntry = lastDungeonEntry || 0;
          const nextEntry = lastEntry + (24 * 60 * 60 * 1000);
          const remaining = Math.max(0, nextEntry - Date.now());
          if (isMounted.current) setTimeUntilFree(remaining);
      };
      
      checkTimer();
      const interval = setInterval(checkTimer, 1000);
      return () => clearInterval(interval);
  }, [lastDungeonEntry]);

  const formatTime = (ms: number) => {
      const h = Math.floor(ms / (1000 * 60 * 60));
      const m = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((ms % (1000 * 60)) / 1000);
      return `${h}h ${m}m ${s}s`;
  };

  const handleStartRun = async () => {
      const isFree = timeUntilFree <= 0;
      
      if (!isFree && keys < PAID_ENTRY_COST) {
          playSystemSoundEffect('DANGER');
          return;
      }

      // Attempt entry via parent
      const success = await onEnterDungeon(isFree);
      
      if (success) {
          onPlayStateChange(true); // Lock Navigation
          setMode('PLAYING');
          setFloor(1);
          setLootBag({ gold: 0, xp: 0, keys: 0 });
          setCards(generateFloor(1));
          setTurnState('IDLE');
          setSelectedCardId(null);
          setIsTrapped(false);
          playSystemSoundEffect('SYSTEM');
          
          // Initial sequence
          setIsDoorOpen(false); 
          setAreCardsVisible(false);
          
          setTimeout(() => {
              if (isMounted.current) setIsDoorOpen(true);
              setTimeout(() => {
                  if (isMounted.current) setAreCardsVisible(true);
              }, 400); 
          }, 800);
      }
  };

  const handleCardClick = (card: FloorCardData, rect: DOMRect) => {
      if (turnState !== 'IDLE' || !areCardsVisible) return;

      setSelectedCardId(card.id);
      
      // 1. Start Zoom Sequence
      setZoomedCard({ data: card, initialRect: rect });
      setZoomFlipped(false);
      setTurnState('REVEALING'); 

      // 2. Animate to center then Reveal (Reduced delay to 50ms)
      setTimeout(() => {
          if (!isMounted.current) return;
          setZoomFlipped(true);
          
          // 3. Trigger Reward/Trap Effects (Wait 400ms for flip animation)
          setTimeout(() => {
              if (!isMounted.current) return;
              if (card.type === 'TRAP') {
                  playSystemSoundEffect('WARNING');
                  // For Traps, we proceed to logic after a longer gaze
                  setTimeout(() => {
                      if (isMounted.current) handleTrapTrigger();
                  }, 800);
              } else {
                  playSystemSoundEffect('PURCHASE');
                  
                  // Construct center rect since card is now centered
                  const centerRect = new DOMRect(window.innerWidth / 2, window.innerHeight / 2, 0, 0);

                  // Decide Loot Type Animation
                  const isKeyReward = card.reward.keys > 0;
                  
                  // Trigger Coin Animation (DOM particles) if gold present
                  if (card.reward.gold > 0 && !isKeyReward) {
                      triggerCoinReward(centerRect, 'loot-bag-balance');
                  }
                  
                  // Flying Loot Animation (React Motion)
                  if (isKeyReward) {
                      // Prioritize Key animation if keys are present
                      setFlyingLoot({ lootType: 'KEY', rect: centerRect });
                  } else if (card.reward.gold > 0) {
                      setFlyingLoot({ lootType: 'GOLD', rect: centerRect });
                  }

                  // Clear flying loot after animation
                  setTimeout(() => {
                      if (isMounted.current) setFlyingLoot(null);
                  }, 600);
                  
                  setLootBag(prev => ({
                      gold: prev.gold + card.reward.gold,
                      xp: prev.xp + card.reward.xp,
                      keys: prev.keys + card.reward.keys
                  }));

                  // 4. "NEAR MISS" REVEAL SEQUENCE (Reduced to 700ms)
                  setTimeout(() => {
                      if (!isMounted.current) return;
                      
                      // Calculate "Near Miss" display probability based on current difficulty
                      // Higher floors = More traps visible in reveal = Scarier
                      // Jackpot floor = NO TRAPS visible
                      const isJackpotFloor = floor % 5 === 0;
                      let trapProbability = floor >= 8 ? 0.6 : 0.3;
                      if (isJackpotFloor) trapProbability = 0;

                      setCards(prevCards => prevCards.map(c => {
                          if (c.id === card.id) return c; // Keep selected safe
                          
                          const r = Math.random();
                          if (r < trapProbability) return { ...c, type: 'TRAP' }; 
                          if (r < trapProbability + 0.2) return { ...c, type: 'JACKPOT', reward: { ...c.reward, gold: 100, keys: getKeyReward(floor) } };
                          return { ...c, type: 'SAFE', reward: { ...c.reward, gold: 5 } };
                      }));

                      // Trigger the flip for all cards in the grid
                      setTurnState('SHOW_ALL'); 
                      playSystemSoundEffect('SYSTEM'); // Sound for the group flip

                      // 5. Cleanup & Next Floor (Reduced to 1000ms)
                      setTimeout(() => {
                          if (isMounted.current) {
                              setZoomedCard(null);
                              handleFloorSuccess();
                          }
                      }, 1000); 
                  }, 700); 
              }
          }, 400); // 400ms allows flip to complete before rewards trigger
      }, 50); // Start flip almost immediately
  };

  const handleTrapTrigger = () => {
      setIsScreenShaking(true);
      playSystemSoundEffect('DANGER');
      setTimeout(() => {
          if (isMounted.current) {
              setIsScreenShaking(false);
              setIsTrapped(true);
          }
      }, 500);
  };

  // --- THE ELEVATOR CYCLE (OPTIMIZED) ---
  const handleFloorSuccess = () => {
      // 1. Retreat Cards
      setAreCardsVisible(false);
      setTurnState('TRANSITION'); 

      // 2. Close Doors (300ms delay)
      setTimeout(() => {
          if (!isMounted.current) return;
          setIsDoorOpen(false);
          playSystemSoundEffect('SYSTEM'); // Hydraulic sound
          
          // 3. Move Floor (Needle Rotation) while Door is Closed (600ms)
          setTimeout(() => {
              if (!isMounted.current) return;
              setFloor(prev => {
                  const nextFloor = prev + 1;
                  setCards(generateFloor(nextFloor));
                  return nextFloor;
              });
              
              setSelectedCardId(null);
              setTurnState('IDLE');

              // 4. Open Doors (800ms travel time)
              setTimeout(() => {
                  if (!isMounted.current) return;
                  setIsDoorOpen(true);
                  playSystemSoundEffect('SYSTEM'); // Door opening sound
                  
                  // 5. Show New Cards (200ms delay)
                  setTimeout(() => {
                      if (isMounted.current) setAreCardsVisible(true);
                  }, 200); 
              }, 800); 
          }, 600); 
      }, 300); 
  };

  const handleSuppressBreak = async () => {
      const reviveCost = getReviveCost(floor);
      if (await onConsumeKey(reviveCost)) {
          playSystemSoundEffect('SUCCESS');
          setIsTrapped(false);
          setZoomedCard(null);
          handleFloorSuccess();
      }
  };

  const handleAbandon = () => {
      setIsTrapped(false);
      setMode('GAMEOVER');
      setLootBag({ gold: 0, xp: 0, keys: 0 });
      playSystemSoundEffect('DANGER');
  };

  const handleCashOut = () => {
      onAddRewards(lootBag.gold, lootBag.xp, lootBag.keys);
      setMode('VICTORY');
      playSystemSoundEffect('LEVEL_UP');
  };

  const resetToLobby = () => {
      if (onExit) {
          onExit(); // Exit to parent (Rewards page)
      } else {
          setMode('LOBBY'); // Fallback if no exit prop
          onPlayStateChange(false); 
      }
  };

  // Calculate Zoom Target Geometry
  const ZOOM_W = 240;
  const ZOOM_H = 320;
  const targetLeft = (windowSize.w - ZOOM_W) / 2;
  // If trapped, shift up slightly to make room for UI
  const targetTop = (windowSize.h - ZOOM_H) / 2 - (isTrapped ? 60 : 0);

  // --- RENDER ---

  if (mode === 'LOBBY') {
      const isFree = timeUntilFree <= 0;
      const canAfford = keys >= PAID_ENTRY_COST;

      return (
          <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 relative overflow-hidden bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-900 to-black">
              <div className="text-center space-y-6 max-w-md w-full relative z-10">
                  <div className="w-28 h-28 mx-auto bg-red-900/30 rounded-full flex items-center justify-center border-4 border-red-500 shadow-[0_0_60px_rgba(239,68,68,0.3)]">
                      <Ghost size={56} className="text-red-500 animate-pulse" />
                  </div>
                  <div>
                      <h1 className="text-5xl font-black text-white font-serif tracking-tight mb-2 drop-shadow-xl">DEMON CASTLE</h1>
                      <p className="text-red-400 font-mono text-xs tracking-[0.3em] uppercase">High Risk // High Reward</p>
                  </div>
                  
                  <div className="bg-black/60 border border-gray-700 rounded-xl p-6 space-y-4 backdrop-blur-md">
                      <div className="flex justify-between text-xs font-mono border-b border-gray-800 pb-2">
                          <span className="text-gray-400">ENTRY COST</span>
                          {isFree ? (
                              <span className="text-system-success font-bold animate-pulse">FREE (DAILY)</span>
                          ) : (
                              <span className={canAfford ? "text-purple-500 font-bold" : "text-gray-600 font-bold"}>
                                  {PAID_ENTRY_COST} KEYS
                              </span>
                          )}
                      </div>
                      
                      {!isFree && (
                          <div className="flex justify-between text-xs font-mono border-b border-gray-800 pb-2">
                              <span className="text-gray-400">NEXT FREE ENTRY</span>
                              <span className="text-yellow-500 font-bold flex items-center gap-2">
                                  <Timer size={12} /> {formatTime(timeUntilFree)}
                              </span>
                          </div>
                      )}

                      <div className="flex justify-between text-xs font-mono">
                          <span className="text-gray-400">RISK FACTOR</span>
                          <span className="text-red-500 font-bold">EXTREME (25%)</span>
                      </div>
                  </div>

                  <button 
                      onClick={handleStartRun}
                      disabled={!isFree && !canAfford}
                      className={`w-full py-5 font-black font-mono text-sm uppercase tracking-widest rounded-xl transition-all shadow-lg flex items-center justify-center gap-2
                          ${isFree
                              ? 'bg-gradient-to-r from-red-700 to-red-600 text-white hover:scale-[1.02] border border-red-500 shadow-[0_0_30px_rgba(220,38,38,0.4)]' 
                              : canAfford 
                                  ? 'bg-purple-900/50 border border-purple-500 text-purple-200 hover:bg-purple-900 hover:text-white shadow-[0_0_20px_rgba(168,85,247,0.3)]'
                                  : 'bg-gray-900 text-gray-600 cursor-not-allowed border border-gray-800'}
                      `}
                  >
                      {isFree ? (
                          'ENTER THE ELEVATOR' 
                      ) : canAfford ? (
                          <>
                             <Key size={16} /> REPLAY ({PAID_ENTRY_COST} KEYS)
                          </>
                      ) : (
                          'INSUFFICIENT KEYS'
                      )}
                  </button>
              </div>
          </div>
      );
  }

  if (mode === 'PLAYING') {
      return (
          <div className="min-h-[80vh] flex flex-col items-center justify-start p-4 relative overflow-hidden bg-[#111]">
              
              {/* Shake Wrapper */}
              <motion.div 
                  className="absolute inset-0 pointer-events-none z-50 border-4 border-transparent"
                  animate={isScreenShaking ? { x: [-10, 10, -10, 10, 0], borderColor: ['rgba(255,0,0,0)', 'rgba(255,0,0,0.5)', 'rgba(255,0,0,0)'] } : {}}
                  transition={{ duration: 0.4 }}
              />

              {/* Loot Animation Layer */}
              <AnimatePresence>
                  {flyingLoot && <FlyingLoot lootType={flyingLoot.lootType} startRect={flyingLoot.rect} />}
              </AnimatePresence>

              {/* Header Info */}
              <div className="w-full max-w-lg flex justify-between items-center mb-2 z-10 px-2">
                  <div className="text-left">
                      <div className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">Floor</div>
                      <div className="text-2xl font-black text-white font-serif">{floor}</div>
                  </div>
                  <div className="text-right">
                      <div className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">Loot Bag</div>
                      <div id="loot-bag-balance" className="flex items-center justify-end gap-2 text-xl font-bold text-yellow-500 font-serif">
                          <Coins size={18} fill="currentColor" /> <CountingNumber value={lootBag.gold} />
                      </div>
                      <div id="loot-bag-keys" className="flex items-center justify-end gap-2 text-sm font-bold text-purple-400 font-serif mt-0.5">
                          <Key size={14} className="text-purple-500" /> <CountingNumber value={lootBag.keys} />
                      </div>
                  </div>
              </div>

              {/* ELEVATOR FRAME CONTAINER */}
              <div className="relative w-full max-w-md aspect-[4/5] z-10 mt-12">
                  
                  {/* Top Gauge Section - MOVED OUTSIDE to prevent clipping */}
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-64 h-32 z-30 pointer-events-none">
                      <ElevatorGauge floor={floor} />
                  </div>

                  {/* Main Elevator Body - Rounded Arch Top */}
                  <div className="w-full h-full bg-[#111] border-[12px] border-[#3a2d20] rounded-t-[10rem] rounded-b-lg shadow-2xl flex flex-col overflow-hidden relative z-20">
                      
                      {/* Inner Shaft (Card Area) */}
                      <div className="flex-1 relative bg-[#2a2a2a] flex flex-col items-center justify-end p-6 pt-24 overflow-hidden">
                          {/* Depth Shadow */}
                          <div className="absolute inset-0 shadow-[inset_0_0_60px_rgba(0,0,0,0.9)] pointer-events-none z-10" />

                          {/* DOORS WRAPPER - Positioned over cards */}
                          <div className="absolute inset-0 z-20 pointer-events-none">
                              <DungeonDoors isOpen={isDoorOpen} />
                          </div>

                          {/* CARDS GRID */}
                          <div className="grid grid-cols-2 gap-3 w-full relative z-0 mb-4">
                              <AnimatePresence mode="wait">
                                  {areCardsVisible && cards.map((card, index) => {
                                      // Determine visibility state
                                      // If zoomedCard matches this ID, hide grid version
                                      const isHidden = zoomedCard && zoomedCard.data.id === card.id;
                                      
                                      const isRevealed = (selectedCardId === card.id && turnState !== 'IDLE') || turnState === 'SHOW_ALL';
                                      const isDimmed = turnState === 'SHOW_ALL' && selectedCardId !== card.id;

                                      return (
                                          <motion.div
                                              key={card.id}
                                              layout
                                              initial={{ opacity: 0, scale: 0.8, y: 50 }}
                                              animate={{ opacity: isHidden ? 0 : 1, scale: 1, y: 0 }}
                                              exit={{ opacity: 0, scale: 0.8, y: 50 }}
                                              transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                              className="relative"
                                          >
                                              {/* Isolated Floating Container to prevent transform conflicts */}
                                              <FloatingCardWrapper index={index}>
                                                  <DemonCard 
                                                      data={card}
                                                      isFlipped={isRevealed}
                                                      isDimmed={isDimmed}
                                                      onClick={(rect) => handleCardClick(card, rect)}
                                                      disabled={turnState !== 'IDLE'}
                                                  />
                                              </FloatingCardWrapper>
                                          </motion.div>
                                      );
                                  })}
                              </AnimatePresence>
                          </div>
                      </div>
                  </div>
              </div>

              {/* Leave Button */}
              <div className="mt-8 z-10">
                  <button 
                      onClick={handleCashOut}
                      disabled={turnState !== 'IDLE' || floor === 1} 
                      className="px-8 py-3 bg-gray-800 text-gray-400 font-mono font-bold text-xs rounded-full border border-gray-700 hover:bg-gray-700 hover:text-white transition-all flex items-center gap-2 uppercase tracking-widest disabled:opacity-0 disabled:pointer-events-none"
                  >
                      <LogOut size={14} /> EXIT TOWER
                  </button>
              </div>

              {/* --- PORTAL: ZOOMED CARD OVERLAY + TRAP UI --- */}
              {zoomedCard && createPortal(
                  <div className="fixed inset-0 z-[150] flex items-center justify-center font-mono">
                      {/* Dark Backdrop (Red tint if trapped) */}
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1, backgroundColor: isTrapped ? 'rgba(20,0,0,0.9)' : 'rgba(0,0,0,0.6)' }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 backdrop-blur-sm transition-colors duration-500" 
                      />
                      
                      {/* The Zoomed Card - Fixed Positioning Animation */}
                      <motion.div
                          initial={{ 
                              position: 'fixed',
                              top: zoomedCard.initialRect.top,
                              left: zoomedCard.initialRect.left,
                              width: zoomedCard.initialRect.width,
                              height: zoomedCard.initialRect.height,
                              zIndex: 160
                          }}
                          animate={{ 
                              top: targetTop,
                              left: targetLeft,
                              width: ZOOM_W, 
                              height: ZOOM_H,
                          }}
                          transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 25 }}
                          className="shadow-[0_0_50px_rgba(0,0,0,0.8)] rounded-xl overflow-hidden"
                      >
                          <DemonCard 
                              data={zoomedCard.data}
                              isFlipped={zoomFlipped}
                              isDimmed={false}
                              onClick={() => {}}
                              disabled={true}
                          />
                      </motion.div>

                      {/* TRAP UI: Controls & Loot Preview */}
                      <AnimatePresence>
                          {isTrapped && (
                              <motion.div 
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: 10 }}
                                  transition={{ delay: 0.2 }}
                                  style={{ marginTop: ZOOM_H + 40 }} // Push below fixed card
                                  className="relative z-10 flex flex-col items-center gap-4 w-full max-w-sm px-6"
                              >
                                  {/* Header */}
                                  <div className="text-center">
                                      <div className="text-2xl font-black text-red-500 tracking-tighter uppercase drop-shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse">
                                          TRAP TRIGGERED
                                      </div>
                                      <div className="text-[10px] text-red-400/70 uppercase tracking-[0.3em]">
                                          SYSTEM LOCKOUT ACTIVE
                                      </div>
                                  </div>

                                  {/* Pending Loot Loss Display */}
                                  <div className="w-full bg-red-950/30 border border-red-900/50 rounded-xl p-4 flex justify-between items-center relative overflow-hidden">
                                      <div className="absolute inset-0 bg-red-500/5 animate-pulse pointer-events-none" />
                                      <div className="relative z-10 flex flex-col">
                                          <span className="text-[9px] text-red-400 font-bold uppercase tracking-widest">Risk of Loss</span>
                                          <div className="flex gap-3 mt-1">
                                              <span className="text-yellow-500 font-bold text-sm flex items-center gap-1"><Coins size={12} /> {lootBag.gold}</span>
                                              <span className="text-blue-400 font-bold text-sm flex items-center gap-1"><ArrowUpCircle size={12} /> {lootBag.xp}</span>
                                          </div>
                                      </div>
                                      <div className="relative z-10">
                                          <Skull className="text-red-800" size={24} />
                                      </div>
                                  </div>

                                  {/* Decision Buttons */}
                                  <div className="grid grid-cols-2 gap-3 w-full">
                                      <button 
                                          onClick={handleSuppressBreak}
                                          disabled={keys < getReviveCost(floor)}
                                          className={`py-4 rounded-xl font-black text-xs uppercase tracking-widest flex flex-col items-center gap-1 transition-all ${keys >= getReviveCost(floor) ? 'bg-white text-black shadow-[0_0_20px_white] hover:scale-105' : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'}`}
                                      >
                                          <div className="flex items-center gap-2">
                                              <span>REVIVE</span>
                                              <Key size={14} className={keys >= getReviveCost(floor) ? "text-purple-600" : "text-gray-600"} />
                                          </div>
                                          <span className="text-[9px] opacity-70">COST: {getReviveCost(floor)} KEYS</span>
                                      </button>

                                      <button 
                                          onClick={handleAbandon}
                                          className="py-4 bg-transparent border-2 border-red-900 text-red-500 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-red-950/50 transition-colors"
                                      >
                                          GIVE UP
                                      </button>
                                  </div>
                              </motion.div>
                          )}
                      </AnimatePresence>
                  </div>,
                  document.body
              )}

          </div>
      );
  }

  // GAMEOVER / VICTORY Screens (Enhanced)
  if (mode === 'VICTORY') {
      return <VictoryScreen loot={lootBag} onClose={resetToLobby} />;
  }

  if (mode === 'GAMEOVER') {
      return <GameOverScreen onClose={resetToLobby} />;
  }

  return null;
};

export default DemonCastle;
