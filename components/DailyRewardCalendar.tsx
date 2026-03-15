import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DailyRewardType } from '../types';
import { REWARD_SCHEDULE } from '../lib/rewards';
import { Coins, Zap, Key, Ghost, Heart, Scroll, Star, X, Check, Gift, Lock } from 'lucide-react';

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
    case 'WELCOME_KEYS': return <Key size={size} className="text-purple-300" />;
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
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  
  const handleClaim = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsClaiming(true);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    
    setTimeout(() => {
        onClaim(rect);
        setTimeout(onClose, 1500); 
    }, 500);
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2000);
  };

  // Calculate current day in the 30-day cycle (1-indexed)
  const currentCycleDay = ((streak - 1) % 30) + 1;
  
  // Determine if there's a claimable reward today
  const canClaimToday = !hasClaimedToday;
  const todayReward = canClaimToday ? REWARD_SCHEDULE[currentCycleDay - 1] : null;
  // If claimed, show the reward that was claimed
  const claimedReward = hasClaimedToday ? REWARD_SCHEDULE[currentCycleDay - 1] : null;

  const handleDayClick = (_dayNum: number, status: 'CLAIMED' | 'CURRENT' | 'LOCKED') => {
    if (status === 'CLAIMED') {
      showToast('Reward already claimed!');
    } else if (status === 'LOCKED') {
      showToast('Login tomorrow to collect this reward');
    }
    // CURRENT day: do nothing here, use the bottom claim button
  };

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
        className="w-full max-w-md rounded-3xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]"
        style={{
          background: 'linear-gradient(180deg, #0d0d1a 0%, #080810 50%, #050508 100%)',
          border: '1px solid rgba(139,92,246,0.15)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-50 p-2 bg-white/5 backdrop-blur-sm rounded-full hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* Header Card - Dark Purple Gradient */}
        <div className="relative px-5 pt-5 pb-4">
          <div 
            className="rounded-2xl p-5 relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(88,28,135,0.6) 0%, rgba(49,10,101,0.7) 50%, rgba(30,10,60,0.8) 100%)',
              border: '1px solid rgba(139,92,246,0.2)',
              boxShadow: '0 8px 30px rgba(88,28,135,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
            }}
          >
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl" />
            
            <div className="relative z-10 flex items-start justify-between">
              <div className="flex-1">
                <h2 className="text-white text-lg font-black mb-1 flex items-center gap-2">
                  <Gift size={20} className="text-purple-300" />
                  Daily Reward
                </h2>
                <p className="text-purple-300/70 text-xs leading-relaxed mb-3">
                  Day {currentCycleDay} of 30 · Streak: {streak}
                </p>
                <div className="inline-flex items-center gap-2 bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-full border border-purple-500/20">
                  <span className="text-white font-black text-sm">{todayReward?.amount || claimedReward?.amount || 0}</span>
                  <span className="text-purple-300/60 text-xs font-bold">
                    {todayReward?.type.replace(/_/g, ' ') || claimedReward?.type.replace(/_/g, ' ') || 'REWARD'}
                  </span>
                </div>
              </div>
              
              {/* Reward Icon */}
              <div 
                className="rounded-2xl p-4"
                style={{
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(139,92,246,0.2)',
                }}
              >
                <RewardIcon type={todayReward?.type || claimedReward?.type || 'GOLD'} size={36} />
              </div>
            </div>
          </div>
        </div>

        {/* Toast Message */}
        <AnimatePresence>
          {toastMsg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mx-5 mb-2 px-4 py-2.5 rounded-xl text-center text-xs font-mono font-bold"
              style={{
                background: 'rgba(139,92,246,0.15)',
                border: '1px solid rgba(139,92,246,0.3)',
                color: '#c4b5fd',
              }}
            >
              {toastMsg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Calendar Grid - 3 columns */}
        <div className="px-5 pb-4 overflow-y-auto flex-1 custom-scrollbar">
          <div className="grid grid-cols-3 gap-2.5">
            {REWARD_SCHEDULE.slice(0, 12).map((reward, idx) => {
              const dayNum = idx + 1;
              
              // Determine status
              let status: 'CLAIMED' | 'CURRENT' | 'LOCKED' = 'LOCKED';
              
              if (hasClaimedToday) {
                if (dayNum <= currentCycleDay) status = 'CLAIMED';
                else status = 'LOCKED';
              } else {
                if (dayNum < currentCycleDay) status = 'CLAIMED';
                else if (dayNum === currentCycleDay) status = 'CURRENT';
                else status = 'LOCKED';
              }

              const isCurrent = status === 'CURRENT';
              const isClaimed = status === 'CLAIMED';
              const isLocked = status === 'LOCKED';

              return (
                <motion.button
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  onClick={() => handleDayClick(dayNum, status)}
                  className={`
                    relative rounded-xl p-3 flex flex-col items-center justify-between gap-1.5 transition-all duration-300 cursor-pointer
                    ${isCurrent ? 'scale-[1.03]' : ''}
                  `}
                  style={{
                    background: isCurrent
                      ? 'linear-gradient(135deg, rgba(88,28,135,0.4) 0%, rgba(49,10,101,0.5) 100%)'
                      : isClaimed
                      ? 'rgba(255,255,255,0.03)'
                      : 'rgba(255,255,255,0.015)',
                    border: isCurrent
                      ? '1.5px solid rgba(139,92,246,0.5)'
                      : isClaimed
                      ? '1px solid rgba(34,197,94,0.15)'
                      : '1px solid rgba(255,255,255,0.04)',
                    boxShadow: isCurrent ? '0 0 20px rgba(88,28,135,0.3)' : 'none',
                    minHeight: '100px',
                    opacity: isClaimed ? 0.55 : 1,
                  }}
                >
                  {/* Day label */}
                  <div className={`text-[10px] font-mono font-bold uppercase tracking-wider ${isCurrent ? 'text-purple-300' : 'text-gray-500'}`}>
                    Day {dayNum}
                  </div>

                  {/* Reward Icon */}
                  <div className={`${isLocked ? 'opacity-25 grayscale' : ''} ${isCurrent ? 'scale-110' : ''} transition-all`}>
                    {isLocked ? (
                      <Lock size={22} className="text-gray-600" />
                    ) : (
                      <RewardIcon type={reward.type} size={26} />
                    )}
                  </div>

                  {/* Amount */}
                  <div className={`text-xs font-black ${isCurrent ? 'text-purple-200' : isClaimed ? 'text-gray-500' : 'text-gray-600'}`}>
                    ×{reward.amount}
                  </div>

                  {/* Claimed Checkmark */}
                  {isClaimed && (
                    <div className="absolute top-1.5 right-1.5 bg-green-500/80 rounded-full p-0.5">
                      <Check size={9} className="text-white" strokeWidth={3} />
                    </div>
                  )}

                  {/* Current day indicator */}
                  {isCurrent && !isClaiming && (
                    <motion.div
                      className="absolute inset-0 rounded-xl"
                      style={{ border: '1.5px solid rgba(139,92,246,0.4)' }}
                      animate={{ opacity: [0.4, 0.8, 0.4] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}

                  {/* TODAY label */}
                  {isCurrent && (
                    <div 
                      className="absolute -top-1.5 left-1/2 -translate-x-1/2 text-[7px] font-black font-mono uppercase tracking-wider px-2 py-0.5 rounded-full"
                      style={{
                        background: 'rgba(88,28,135,0.8)',
                        border: '1px solid rgba(139,92,246,0.4)',
                        color: '#c4b5fd',
                      }}
                    >
                      TODAY
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Bottom Claim Button */}
        <div className="px-5 pb-5 pt-2">
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
                className="w-full text-white font-black text-base py-4 rounded-2xl transition-all"
                style={{
                  background: 'linear-gradient(135deg, rgba(88,28,135,0.9) 0%, rgba(67,20,110,0.95) 50%, rgba(49,10,101,0.9) 100%)',
                  border: '1px solid rgba(139,92,246,0.3)',
                  boxShadow: '0 8px 30px rgba(88,28,135,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
                }}
              >
                Claim Day {currentCycleDay} Reward
              </motion.button>
            )}
            
            {canClaimToday && isClaiming && (
              <motion.div
                key="claiming"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full font-black text-base py-4 rounded-2xl text-center"
                style={{
                  background: 'rgba(88,28,135,0.3)',
                  border: '1px solid rgba(139,92,246,0.2)',
                  color: '#a78bfa',
                }}
              >
                Claiming...
              </motion.div>
            )}

            {!canClaimToday && (
              <motion.div
                key="claimed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full font-black text-sm py-4 rounded-2xl text-center flex items-center justify-center gap-2"
                style={{
                  background: 'rgba(34,197,94,0.08)',
                  border: '1px solid rgba(34,197,94,0.2)',
                  color: '#4ade80',
                }}
              >
                <Check size={18} strokeWidth={3} />
                Day {currentCycleDay} Claimed · Come back tomorrow!
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default DailyRewardCalendar;
