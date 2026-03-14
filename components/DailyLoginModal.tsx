import React from 'react';
import DailyRewardCalendar from './DailyRewardCalendar';
import { useSystem } from '../hooks/useSystem';
import { DailyReward } from '../types';

interface DailyLoginModalProps {
  reward?: DailyReward | null;
  onClose: () => void;
}

const DailyLoginModal: React.FC<DailyLoginModalProps> = ({ reward, onClose }) => {
  const { player, claimDailyReward } = useSystem();

  const handleClaim = (rect: DOMRect | null) => {
    if (!reward) return;
    claimDailyReward(reward);
    
    // Dispatch HUD animation events based on reward type
    if (reward.type === 'GOLD') {
      window.dispatchEvent(new CustomEvent('reforge:coin-earned', { detail: { goldGained: reward.amount, startRect: rect } }));
    } else if (reward.type === 'KEYS' || reward.type === 'WELCOME_KEYS') {
      window.dispatchEvent(new CustomEvent('reforge:key-earned', { detail: { amount: reward.amount, startRect: rect } }));
    } else if (reward.type === 'HEALTH_POTION') {
      window.dispatchEvent(new CustomEvent('reforge:consumable-earned', { detail: { type: 'POTION', amount: reward.amount, startRect: rect } }));
    } else if (reward.type === 'SHADOW_SCROLL') {
      window.dispatchEvent(new CustomEvent('reforge:consumable-earned', { detail: { type: 'SCROLL', amount: reward.amount, startRect: rect } }));
    } else if (reward.type === 'ULT_ORB') {
      window.dispatchEvent(new CustomEvent('reforge:consumable-earned', { detail: { type: 'ORB', amount: reward.amount, startRect: rect } }));
    }
    
    // Close modal after short delay is handled by Calendar calling onClose
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
