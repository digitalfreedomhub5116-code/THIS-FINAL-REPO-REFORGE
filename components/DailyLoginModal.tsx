import React, { useState } from 'react';
import DailyRewardCalendar from './DailyRewardCalendar';
import { useSystem } from '../hooks/useSystem';
import { REWARD_SCHEDULE } from '../lib/rewards';
import DoubleRewardModal from './DoubleRewardModal';

interface DailyLoginModalProps {
  onClose: () => void;
  onChestReward?: () => void;
  adShowRewarded?: (adUnitId: string) => Promise<{ rewarded: boolean; type?: string; amount?: number }>;
  adUnits?: { KEY_REWARD: string; BORDER_REWARD: string; DUNGEON_INTERSTITIAL: string };
  /** When true (Reforge Pro / VIP), the chest auto-claims at 1× and the watch-ad doubling modal is skipped entirely. */
  isPremium?: boolean;
}

const DailyLoginModal: React.FC<DailyLoginModalProps> = ({ onClose, onChestReward, adShowRewarded, adUnits, isPremium = false }) => {
  const { player, claimDailyReward } = useSystem();
  const [pendingChestDouble, setPendingChestDouble] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const lastLogin = player.lastLoginDate;
  const isClaimed = lastLogin === today;
  const currentStreak = player.streak || 1;
  const currentCycleDay = ((currentStreak - 1) % 7) + 1;
  const todayReward = !isClaimed ? REWARD_SCHEDULE[currentCycleDay - 1] : null;

  const dispatchRewardEvent = (rect: DOMRect | null) => {
    if (!todayReward) return;
    if (todayReward.type === 'GOLD') {
      window.dispatchEvent(new CustomEvent('reforge:coin-earned', { detail: { goldGained: todayReward.amount, startRect: rect } }));
    } else if (todayReward.type === 'VENUS_SHARDS') {
      window.dispatchEvent(new CustomEvent('reforge:shard-earned', { detail: { amount: todayReward.amount, startRect: rect } }));
    }
  };

  const handleClaim = (rect: DOMRect | null) => {
    if (!todayReward || isClaimed) return;
    if (todayReward.type === 'CHEST_LEGENDARY') {
      // Pro users skip the watch-ad-to-double modal — auto-claim at 1×
      if (isPremium) {
        handleChestClaim(1, rect);
        return;
      }
      setPendingChestDouble(true);
      return;
    }
    claimDailyReward(todayReward);
    dispatchRewardEvent(rect);
  };

  const handleChestClaim = (multiplier: number, rect: DOMRect | null) => {
    if (!todayReward) return;
    const rewardToClaim = multiplier === 2
      ? { ...todayReward, amount: todayReward.amount * 2 }
      : todayReward;
    claimDailyReward(rewardToClaim);
    setPendingChestDouble(false);
    if (todayReward.type === 'CHEST_LEGENDARY') {
      setTimeout(() => onChestReward?.(), 800);
    }
    dispatchRewardEvent(rect);
    onClose(); // Dismiss the modal now that the flow is complete
  };

  return (
    <>
      <DailyRewardCalendar
        streak={currentStreak}
        hasClaimedToday={isClaimed}
        onClaim={handleClaim}
        onClose={() => {
          // Don't auto-close if chest double modal is showing — let the user finish the flow
          if (!pendingChestDouble) {
            onClose();
          }
        }}
      />
      {pendingChestDouble && todayReward && (
        <DoubleRewardModal
          title="Legendary Chest!"
          subtitle="Watch a short ad to double your chest reward."
          rewards={[{ icon: 'chest', label: 'Legendary Chest', amount: todayReward.amount }]}
          onWatchAd={async () => {
            if (!adShowRewarded || !adUnits?.KEY_REWARD) return { rewarded: false };
            return adShowRewarded(adUnits.KEY_REWARD);
          }}
          onClaim={(multiplier) => handleChestClaim(multiplier, null)}
          onSkip={() => handleChestClaim(1, null)}
        />
      )}
    </>
  );
};

export default DailyLoginModal;
