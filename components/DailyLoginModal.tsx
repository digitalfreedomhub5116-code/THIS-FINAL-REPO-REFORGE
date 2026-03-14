import React from 'react';
import DailyRewardCalendar from './DailyRewardCalendar';
import { useSystem } from '../hooks/useSystem';
import { DailyReward } from '../types';

interface DailyLoginModalProps {
  reward: DailyReward;
  onClose: () => void;
}

const DailyLoginModal: React.FC<DailyLoginModalProps> = ({ reward, onClose }) => {
  const { player, claimDailyReward } = useSystem();

  const handleClaim = () => {
    claimDailyReward(reward);
    
    // Dispatch HUD animation events based on reward type
    if (reward.type === 'GOLD') {
      window.dispatchEvent(new CustomEvent('reforge:coin-earned', { detail: { goldGained: reward.amount, startRect: null } }));
    }
    // Note: We can add other events for keys/xp if the HUD supports them, or just rely on the logs/toasts from useSystem.
    
    // Close modal after short delay (Calendar handles the immediate "Claiming..." state)
    // The Calendar component calls onClaim then waits 1.5s before calling onClose? 
    // No, Calendar calls onClaim inside its timeout.
    // Actually Calendar calls onClaim immediately after animation delay?
    // Let's check Calendar: setTimeout(() => { onClaim(); setTimeout(onClose, 1500); }, 500);
    // So onClaim runs, then 1.5s later onClose.
    // This is fine.
  };

  // Calculate display streak
  const today = new Date().toISOString().split('T')[0];
  const lastLogin = player.lastLoginDate;
  const isClaimed = lastLogin === today;

  let currentStreak = player.streak;
  if (!isClaimed) {
      // Calculate what the streak WILL be
      if (lastLogin) {
          const lastDate = new Date(lastLogin);
          const currentDate = new Date();
          lastDate.setHours(0,0,0,0);
          currentDate.setHours(0,0,0,0);
          const diffDays = Math.ceil(Math.abs(currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays === 1) currentStreak += 1;
          else currentStreak = 1;
      } else {
          currentStreak = 1;
      }
  }

  return (
    <DailyRewardCalendar 
      streak={currentStreak} 
      hasClaimedToday={isClaimed} 
      onClaim={handleClaim} 
      onClose={onClose} 
    />
  );
};

export default DailyLoginModal;
