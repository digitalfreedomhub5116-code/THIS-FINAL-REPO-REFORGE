import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { DailyRewardType } from '../types';
import { REWARD_SCHEDULE } from '../lib/rewards';
import { Coins, Zap, Key, Ghost, Heart, Scroll, Star, X, Check } from 'lucide-react';

interface DailyRewardCalendarProps {
  streak: number; 
  hasClaimedToday: boolean;
  onClaim: () => void;
  onClose: () => void;
}

const RewardIcon = ({ type, size = 24 }: { type: DailyRewardType; size?: number }) => {
  switch (type) {
    case 'GOLD': return <Coins size={size} className="text-yellow-400" />;
    case 'XP': return <Zap size={size} className="text-blue-400" />;
    case 'KEYS':
    case 'WELCOME_KEYS': return <Key size={size} className="text-purple-400" />;
    case 'DUNGEON_PASS': return <Ghost size={size} className="text-red-500" />;
    case 'HEALTH_POTION': return <Heart size={size} className="text-red-400" />;
    case 'SHADOW_SCROLL': return <Scroll size={size} className="text-indigo-400" />;
    case 'ULT_ORB': return <Star size={size} className="text-orange-400" />;
    default: return <Coins size={size} className="text-gray-400" />;
  }
};

const DailyRewardCalendar: React.FC<DailyRewardCalendarProps> = ({ 
  streak, 
  hasClaimedToday, 
  onClaim, 
  onClose 
}) => {
  const [isClaiming, setIsClaiming] = useState(false);
  
  const handleClaim = () => {
    setIsClaiming(true);
    // Play sound?
    // Dispatch animation event?
    setTimeout(() => {
        onClaim();
        // Close after a delay or let parent handle?
        // Let's wait for animation then close.
        setTimeout(onClose, 1500); 
    }, 500); // Wait for button press anim
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
    >
      <div className="w-full max-w-4xl bg-[#0a0a0a] border border-gray-800 rounded-2xl overflow-hidden shadow-2xl relative">
        {/* Header */}
        <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gradient-to-r from-gray-900 to-black">
          <div>
            <h2 className="text-2xl font-black text-white font-serif tracking-tight flex items-center gap-2">
              <span className="text-yellow-500">DAILY LOGIN</span> REWARDS
            </h2>
            <p className="text-gray-400 text-xs font-mono uppercase tracking-widest mt-1">
              Consecutive Login: <span className="text-white font-bold">{streak} Days</span>
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors text-gray-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="p-6 grid grid-cols-5 md:grid-cols-7 gap-3 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {REWARD_SCHEDULE.map((reward, idx) => {
            const dayNum = idx + 1;
            // Determine state
            // If claiming today (hasClaimedToday=false):
            //   - Days < activeDayIndex: CLAIMED
            //   - Day == activeDayIndex: CURRENT (CLAIMABLE)
            //   - Days > activeDayIndex: LOCKED
            // If claimed today (hasClaimedToday=true):
            //   - Days <= (streak-1)%30: CLAIMED
            //   - Days > (streak-1)%30: LOCKED
            
            const currentCycleDay = (streak - 1) % 30;
            
            let status: 'CLAIMED' | 'CURRENT' | 'LOCKED' = 'LOCKED';
            
            if (hasClaimedToday) {
                if (idx <= currentCycleDay) status = 'CLAIMED';
                else status = 'LOCKED';
            } else {
                if (idx < currentCycleDay) status = 'CLAIMED';
                else if (idx === currentCycleDay) status = 'CURRENT';
                else status = 'LOCKED';
            }

            const isMilestone = idx === 6 || idx === 13 || idx === 20 || idx === 27 || idx === 29;
            const isLegendary = idx === 29;

            return (
              <div 
                key={idx}
                className={`
                  relative aspect-[4/5] rounded-xl border flex flex-col items-center justify-center gap-2 p-2 transition-all
                  ${status === 'CLAIMED' ? 'bg-gray-900/50 border-gray-800 opacity-60 grayscale-[0.5]' : ''}
                  ${status === 'CURRENT' ? 'bg-gradient-to-br from-gray-800 to-black border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.2)] scale-105 z-10' : ''}
                  ${status === 'LOCKED' ? 'bg-black border-gray-800/50 text-gray-600' : ''}
                  ${isMilestone && status !== 'CLAIMED' ? 'border-purple-500/50 shadow-[0_0_10px_rgba(168,85,247,0.1)]' : ''}
                  ${isLegendary && status !== 'CLAIMED' ? 'border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.15)]' : ''}
                `}
              >
                <div className="absolute top-2 left-2 text-[10px] font-mono font-bold text-gray-500">Day {dayNum}</div>
                {status === 'CLAIMED' && (
                    <div className="absolute top-2 right-2 text-green-500"><Check size={14} /></div>
                )}
                
                <div className={`
                    ${status === 'CURRENT' ? 'animate-pulse' : ''}
                    ${status === 'LOCKED' ? 'opacity-30' : ''}
                `}>
                    <RewardIcon type={reward.type} size={isLegendary ? 40 : isMilestone ? 32 : 24} />
                </div>
                
                <div className="text-center">
                    <div className={`text-xs font-bold ${status === 'CURRENT' ? 'text-white' : 'text-gray-400'}`}>
                        {reward.type.replace('_', ' ')}
                    </div>
                    <div className={`text-sm font-black ${status === 'CURRENT' ? 'text-yellow-500' : 'text-gray-500'}`}>
                        x{reward.amount}
                    </div>
                </div>

                {status === 'CURRENT' && !isClaiming && (
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleClaim}
                        className="mt-2 px-3 py-1 bg-yellow-500 text-black text-[10px] font-black uppercase tracking-wider rounded-full shadow-lg hover:bg-yellow-400"
                    >
                        CLAIM
                    </motion.button>
                )}
                
                {status === 'CURRENT' && isClaiming && (
                    <div className="mt-2 text-[10px] text-yellow-500 font-mono animate-pulse">
                        CLAIMING...
                    </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};

export default DailyRewardCalendar;
