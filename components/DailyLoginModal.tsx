import React from 'react';
import DailyRewardCalendar from './DailyRewardCalendar';
import { useSystem } from '../hooks/useSystem';
import { REWARD_SCHEDULE } from '../lib/rewards';

interface DailyLoginModalProps {
  onClose: () => void;
}

const DailyLoginModal: React.FC<DailyLoginModalProps> = ({ onClose }) => {
  const { player, claimDailyReward } = useSystem();

  // Always compute reward fresh from player state + schedule
  const today = new Date().toISOString().split('T')[0];
  const lastLogin = player.lastLoginDate;
  const isClaimed = lastLogin === today;

  let currentStreak = player.streak;
  if (!isClaimed) {
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

  const currentCycleDay = ((currentStreak - 1) % 30) + 1;
  const todayReward = !isClaimed ? REWARD_SCHEDULE[currentCycleDay - 1] : null;

  const handleClaim = (rect: DOMRect | null) => {
    if (!todayReward || isClaimed) return;
    claimDailyReward(todayReward);
    
    // Dispatch HUD animation events based on reward type
    if (todayReward.type === 'GOLD') {
      window.dispatchEvent(new CustomEvent('reforge:coin-earned', { detail: { goldGained: todayReward.amount, startRect: rect } }));
    } else if (todayReward.type === 'KEYS' || todayReward.type === 'WELCOME_KEYS') {
      window.dispatchEvent(new CustomEvent('reforge:key-earned', { detail: { amount: todayReward.amount, startRect: rect } }));
    } else if (todayReward.type === 'HEALTH_POTION') {
      window.dispatchEvent(new CustomEvent('reforge:consumable-earned', { detail: { type: 'POTION', amount: todayReward.amount, startRect: rect } }));
    } else if (todayReward.type === 'SHADOW_SCROLL') {
      window.dispatchEvent(new CustomEvent('reforge:consumable-earned', { detail: { type: 'SCROLL', amount: todayReward.amount, startRect: rect } }));
    } else if (todayReward.type === 'ULT_ORB') {
      window.dispatchEvent(new CustomEvent('reforge:consumable-earned', { detail: { type: 'ORB', amount: todayReward.amount, startRect: rect } }));
    }
  };

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
