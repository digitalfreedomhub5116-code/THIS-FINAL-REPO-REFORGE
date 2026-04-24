import React from 'react';
import DailyRewardCalendar from './DailyRewardCalendar';
import { useSystem } from '../hooks/useSystem';
import { REWARD_SCHEDULE } from '../lib/rewards';

interface DailyLoginModalProps {
  onClose: () => void;
  onChestReward?: () => void;
}

const DailyLoginModal: React.FC<DailyLoginModalProps> = ({ onClose, onChestReward }) => {
  const { player, claimDailyReward } = useSystem();

  // Always compute reward fresh from player state + schedule
  const today = new Date().toISOString().split('T')[0];
  const lastLogin = player.lastLoginDate;
  const isClaimed = lastLogin === today;

  // Streak is already computed by auto-streak tracker in useSystem (single source of truth)
  const currentStreak = player.streak || 1;

  const currentCycleDay = ((currentStreak - 1) % 7) + 1;
  const todayReward = !isClaimed ? REWARD_SCHEDULE[currentCycleDay - 1] : null;

  const handleClaim = (rect: DOMRect | null) => {
    if (!todayReward || isClaimed) return;
    claimDailyReward(todayReward);
    
    // Dispatch HUD animation events based on reward type
    if (todayReward.type === 'GOLD') {
      window.dispatchEvent(new CustomEvent('reforge:coin-earned', { detail: { goldGained: todayReward.amount, startRect: rect } }));
    } else if (todayReward.type === 'KEYS' || todayReward.type === 'WELCOME_KEYS') {
      window.dispatchEvent(new CustomEvent('reforge:key-earned', { detail: { amount: todayReward.amount, startRect: rect } }));
    } else if (todayReward.type === 'CHEST_LEGENDARY') {
      setTimeout(() => onChestReward?.(), 800);
    } else if (todayReward.type === 'VENUS_SHARDS') {
      window.dispatchEvent(new CustomEvent('reforge:shard-earned', { detail: { amount: todayReward.amount, startRect: rect } }));
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
