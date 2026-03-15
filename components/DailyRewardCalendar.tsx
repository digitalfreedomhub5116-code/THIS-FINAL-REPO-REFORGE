import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DailyRewardType } from '../types';
import { REWARD_SCHEDULE } from '../lib/rewards';
import { Coins, Zap, Key, Ghost, Heart, Scroll, Star, X, Check, Gift } from 'lucide-react';
import { format, addDays, startOfMonth } from 'date-fns';

interface DailyRewardCalendarProps {
  streak: number; 
  hasClaimedToday: boolean;
  onClaim: (rect: DOMRect | null) => void;
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
  
  const handleClaim = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsClaiming(true);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    
    setTimeout(() => {
        onClaim(rect);
        setTimeout(onClose, 1500); 
    }, 500);
  };

  // Calculate current day in the 30-day cycle (1-indexed)
  const currentCycleDay = ((streak - 1) % 30) + 1;
  
  // Determine if there's a claimable reward today
  const canClaimToday = !hasClaimedToday;
  const todayReward = canClaimToday ? REWARD_SCHEDULE[currentCycleDay - 1] : null;

  // Generate date labels for display
  const today = new Date();
  const monthStart = startOfMonth(today);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-md bg-gradient-to-b from-[#1a1a2e] to-[#0f0f1e] rounded-3xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 left-4 z-50 p-2 bg-white/10 backdrop-blur-sm rounded-full hover:bg-white/20 transition-colors text-white"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* Header Card - Purple Gradient */}
        <div className="relative px-6 pt-16 pb-6">
          <div className="bg-gradient-to-br from-purple-600 via-purple-500 to-indigo-600 rounded-2xl p-5 shadow-[0_8px_30px_rgba(139,92,246,0.4)] relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-400/20 rounded-full blur-2xl" />
            
            <div className="relative z-10 flex items-start justify-between">
              <div className="flex-1">
                <h2 className="text-white text-lg font-black mb-1 flex items-center gap-2">
                  <Gift size={20} className="text-yellow-300" />
                  Daily Reward
                </h2>
                <p className="text-purple-100 text-xs leading-relaxed mb-3">
                  Claim your daily reward<br />and collect bonus coins
                </p>
                <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full">
                  <span className="text-white font-black text-sm">{todayReward?.amount || 0}</span>
                  <span className="text-purple-100 text-xs font-bold">Reward Point</span>
                </div>
              </div>
              
              {/* Reward Icon */}
              {todayReward && (
                <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 shadow-lg">
                  <RewardIcon type={todayReward.type} size={40} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Calendar Grid - 3 columns */}
        <div className="px-6 pb-6 overflow-y-auto flex-1 custom-scrollbar">
          <div className="grid grid-cols-3 gap-3">
            {REWARD_SCHEDULE.slice(0, 12).map((reward, idx) => {
              const dayNum = idx + 1;
              const dateLabel = format(addDays(monthStart, idx), 'd MMM');
              
              // Determine status
              let status: 'CLAIMED' | 'CURRENT' | 'LOCKED' = 'LOCKED';
              
              if (hasClaimedToday) {
                // If already claimed today, all days up to and including current are claimed
                if (dayNum <= currentCycleDay) status = 'CLAIMED';
                else status = 'LOCKED';
              } else {
                // If not claimed yet
                if (dayNum < currentCycleDay) status = 'CLAIMED';
                else if (dayNum === currentCycleDay) status = 'CURRENT';
                else status = 'LOCKED';
              }

              const isCurrent = status === 'CURRENT';
              const isClaimed = status === 'CLAIMED';

              return (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className={`
                    relative rounded-2xl p-3 flex flex-col items-center justify-between gap-2 transition-all duration-300
                    ${isCurrent ? 'bg-gradient-to-br from-purple-600/40 to-indigo-600/40 border-2 border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.4)] scale-105' : ''}
                    ${isClaimed ? 'bg-white/5 border border-white/10 opacity-60' : ''}
                    ${status === 'LOCKED' ? 'bg-white/[0.02] border border-white/5' : ''}
                  `}
                  style={{
                    backdropFilter: 'blur(10px)',
                    minHeight: '110px'
                  }}
                >
                  {/* Day label */}
                  <div className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider">
                    Day {dayNum}
                  </div>
                  
                  {/* Date */}
                  <div className={`text-[9px] font-mono ${isCurrent ? 'text-purple-300' : 'text-gray-500'}`}>
                    {dateLabel}
                  </div>

                  {/* Reward Icon */}
                  <div className={`${status === 'LOCKED' ? 'opacity-30 grayscale' : ''} ${isCurrent ? 'scale-110' : ''} transition-all`}>
                    <RewardIcon type={reward.type} size={28} />
                  </div>

                  {/* Amount */}
                  <div className={`text-sm font-black ${isCurrent ? 'text-yellow-400' : isClaimed ? 'text-gray-500' : 'text-gray-600'}`}>
                    {reward.amount}
                  </div>

                  {/* Claimed Checkmark */}
                  {isClaimed && (
                    <div className="absolute top-2 right-2 bg-green-500 rounded-full p-0.5">
                      <Check size={10} className="text-white" strokeWidth={3} />
                    </div>
                  )}

                  {/* Current day pulse */}
                  {isCurrent && !isClaiming && (
                    <motion.div
                      className="absolute inset-0 rounded-2xl border-2 border-purple-400"
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Bottom Claim Button */}
        <div className="px-6 pb-6 pt-2">
          <AnimatePresence mode="wait">
            {canClaimToday && !isClaiming && (
              <motion.button
                key="claim-btn"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleClaim}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black text-base py-4 rounded-2xl shadow-[0_8px_30px_rgba(139,92,246,0.5)] hover:shadow-[0_8px_40px_rgba(139,92,246,0.7)] transition-all"
              >
                Claim
              </motion.button>
            )}
            
            {canClaimToday && isClaiming && (
              <motion.div
                key="claiming"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full bg-gradient-to-r from-purple-600/50 to-indigo-600/50 text-purple-200 font-black text-base py-4 rounded-2xl text-center"
              >
                Claiming...
              </motion.div>
            )}

            {!canClaimToday && (
              <motion.div
                key="claimed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full bg-green-600/20 border-2 border-green-500/30 text-green-400 font-black text-base py-4 rounded-2xl text-center flex items-center justify-center gap-2"
              >
                <Check size={20} strokeWidth={3} />
                Claimed Today
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default DailyRewardCalendar;
