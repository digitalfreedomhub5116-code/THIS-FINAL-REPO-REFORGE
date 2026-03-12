
import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import RankVideoBadge from './RankVideoBadge';
import { PlayerData, Rank } from '../types';
import { Lock } from 'lucide-react';

interface RankProgressionProps {
  player: PlayerData;
}

const RANK_CONFIG: { id: Rank; label: string; minLevel: number; color: string }[] = [
    { id: 'E', label: 'Awakened', minLevel: 0, color: '#78716c' },
    { id: 'D', label: 'Rookie', minLevel: 10, color: '#c2410c' },
    { id: 'C', label: 'Soldier', minLevel: 30, color: '#60a5fa' },
    { id: 'B', label: 'Elite', minLevel: 55, color: '#06b6d4' },
    { id: 'A', label: 'Sovereign', minLevel: 70, color: '#eab308' },
    { id: 'S', label: 'Shadow Monarch', minLevel: 100, color: '#a855f7' },
];

const RankProgression: React.FC<RankProgressionProps> = ({ player }) => {
  const currentLevel = player.level;
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to current rank
  useEffect(() => {
      if (scrollRef.current) {
          const activeEl = scrollRef.current.querySelector('[data-active="true"]');
          if (activeEl) {
              activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
      }
  }, []);

  return (
    <div className="w-full h-[600px] bg-black/40 border border-gray-800 rounded-xl overflow-hidden relative flex flex-col">
        
        {/* Background Effect */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,210,255,0.05)_0%,transparent_60%)] pointer-events-none" />

        <div className="p-6 border-b border-gray-800 bg-gray-900/50 relative z-10">
            <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">HUNTER RANKING</h2>
            <p className="text-xs text-gray-500 font-mono tracking-widest uppercase">System Evaluation // Current Level: {currentLevel}</p>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 relative scrollbar-hide">
            {/* Timeline Line */}
            <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-gray-800 -translate-x-1/2 z-0" />
            
            {/* Progress Fill Line */}
            <div className="absolute left-1/2 top-0 w-1 bg-gradient-to-b from-system-neon via-system-accent to-purple-600 -translate-x-1/2 z-0" style={{ height: '100%', opacity: 0.3 }} />

            <div className="space-y-16 pb-20">
                {RANK_CONFIG.map((rank, index) => {
                    const isNext = index < RANK_CONFIG.length - 1;
                    const nextRank = isNext ? RANK_CONFIG[index + 1] : null;
                    
                    let status: 'LOCKED' | 'ACTIVE' | 'COMPLETED' = 'LOCKED';
                    
                    if (currentLevel >= rank.minLevel) {
                        if (nextRank && currentLevel >= nextRank.minLevel) {
                            status = 'COMPLETED';
                        } else {
                            status = 'ACTIVE';
                        }
                    }

                    const progressToNext = nextRank 
                        ? Math.min(100, Math.max(0, ((currentLevel - rank.minLevel) / (nextRank.minLevel - rank.minLevel)) * 100))
                        : 100; // S Rank is cap

                    return (
                        <div 
                            key={rank.id} 
                            data-active={status === 'ACTIVE'}
                            className={`relative z-10 flex flex-col items-center ${status === 'LOCKED' ? 'opacity-50 blur-[1px] grayscale' : 'opacity-100'}`}
                        >
                            {/* Animated Video Badge */}
                            <motion.div
                                animate={{ scale: status === 'ACTIVE' ? 1.25 : 1 }}
                                className="relative flex items-center justify-center"
                            >
                                <RankVideoBadge rank={rank.id} className="w-40 h-40 md:w-48 md:h-48" />
                                
                                {status === 'LOCKED' && (
                                    <div className="absolute inset-0 z-20 flex items-center justify-center">
                                        <div className="bg-black/80 px-2 py-1 rounded border border-gray-600/50 backdrop-blur-[2px]">
                                            <span className="text-[10px] md:text-xs font-black text-white tracking-widest font-mono flex items-center gap-1">
                                                <Lock size={10} /> LOCKED
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                            
                            {/* Info Card */}
                            <div className={`mt-2 text-center ${status === 'ACTIVE' ? 'scale-110' : ''} transition-transform`}>
                                <div className="text-xl font-black text-white font-mono uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{rank.label}</div>
                                <div className="text-[10px] text-gray-500 font-mono font-bold bg-black/80 px-2 py-1 rounded inline-block mt-1 border border-gray-800">
                                    LVL {rank.minLevel}+
                                </div>
                            </div>

                            {/* Current Indicator Pill */}
                            {status === 'ACTIVE' && (
                                <motion.div 
                                    layoutId="active-rank-indicator"
                                    className="mt-4 text-[10px] font-bold bg-white text-black px-3 py-1 rounded-full font-mono tracking-widest uppercase shadow-[0_0_15px_white]"
                                >
                                    CURRENT
                                </motion.div>
                            )}

                            {/* Progress Bar to Next Rank (Only for Active/Completed) */}
                            {isNext && status !== 'LOCKED' && (
                                <div className="absolute top-full left-1/2 -translate-x-1/2 w-1 h-16 mt-0 z-20">
                                    <motion.div 
                                        initial={{ height: 0 }}
                                        animate={{ height: `${progressToNext}%` }}
                                        transition={{ duration: 1.5, delay: 0.2 }}
                                        className="w-full bg-system-neon shadow-[0_0_10px_#00d2ff]"
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    </div>
  );
};

export default RankProgression;
