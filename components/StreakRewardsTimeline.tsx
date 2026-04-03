import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, Key, Gem, Trophy, Gift, Crown, Lock, Check, ChevronRight } from 'lucide-react';

// ── Streak Checkpoint Configuration ──
const FIXED_CHECKPOINTS = [3, 5, 7, 9, 14, 17, 21, 28, 37, 42, 48, 54];

function getCheckpointDays(maxDay: number): number[] {
  const days = [...FIXED_CHECKPOINTS];
  // After day 54, every 7 days
  let next = 54 + 7;
  while (next <= Math.max(maxDay + 14, 68)) {
    days.push(next);
    next += 7;
  }
  return days;
}

// ── Reward Types ──
type StreakRewardType = 'GOLD' | 'STONES' | 'LEGENDARY_CHEST' | 'KEY' | 'ALLIANCE_CHEST';

interface StreakReward {
  type: StreakRewardType;
  amount: number;
  label: string;
}

interface CheckpointData {
  day: number;
  reward: StreakReward;
  isMilestone: boolean; // Big milestone (14, 21, 28, 42, etc.)
}

// ── Reward Schedule ──
function getRewardForDay(day: number): StreakReward {
  // Alliance chest — rare, only at big milestones
  if (day === 21 || day === 42) {
    return { type: 'ALLIANCE_CHEST', amount: 1, label: 'Alliance Chest' };
  }
  // Keys — semi-rare at celebratory milestones
  if (day === 14 || day === 28 || day === 54) {
    return { type: 'KEY', amount: day >= 28 ? 3 : 2, label: `${day >= 28 ? 3 : 2} Keys` };
  }
  // Legendary chest — frequent
  if (day === 7 || day === 17 || day === 37 || day === 48 || (day > 54 && day % 14 === 0)) {
    return { type: 'LEGENDARY_CHEST', amount: 1, label: 'Legendary Chest' };
  }
  // Stones — moderately frequent
  if (day === 5 || day === 9 || (day > 54 && (day - 54) % 7 === 0 && day % 14 !== 0)) {
    return { type: 'STONES', amount: day >= 28 ? 15 : 10, label: `${day >= 28 ? 15 : 10} Stones` };
  }
  // Gold — default / common
  const goldAmount = day <= 7 ? 200 : day <= 21 ? 350 : day <= 42 ? 500 : 750;
  return { type: 'GOLD', amount: goldAmount, label: `${goldAmount} Gold` };
}

function buildCheckpoints(currentStreak: number): CheckpointData[] {
  const days = getCheckpointDays(currentStreak);
  const milestones = new Set([7, 14, 21, 28, 42, 54]);
  // Also mark every 14 days after 54 as milestone
  return days.map(day => ({
    day,
    reward: getRewardForDay(day),
    isMilestone: milestones.has(day) || (day > 54 && day % 14 === 0),
  }));
}

// ── Reward Visual Config ──
const REWARD_CONFIG: Record<StreakRewardType, { icon: React.ReactNode; color: string; glow: string; bg: string; emoji: string }> = {
  GOLD: {
    icon: <Coins size={18} />,
    color: '#fbbf24',
    glow: 'rgba(251,191,36,0.5)',
    bg: 'radial-gradient(circle, rgba(251,191,36,0.25) 0%, rgba(251,191,36,0.05) 70%)',
    emoji: '🪙',
  },
  STONES: {
    icon: <Gem size={18} />,
    color: '#c084fc',
    glow: 'rgba(192,132,252,0.5)',
    bg: 'radial-gradient(circle, rgba(192,132,252,0.25) 0%, rgba(192,132,252,0.05) 70%)',
    emoji: '💎',
  },
  LEGENDARY_CHEST: {
    icon: <Gift size={18} />,
    color: '#f59e0b',
    glow: 'rgba(245,158,11,0.6)',
    bg: 'radial-gradient(circle, rgba(245,158,11,0.3) 0%, rgba(245,158,11,0.05) 70%)',
    emoji: '🎁',
  },
  KEY: {
    icon: <Key size={18} />,
    color: '#a855f7',
    glow: 'rgba(168,85,247,0.5)',
    bg: 'radial-gradient(circle, rgba(168,85,247,0.25) 0%, rgba(168,85,247,0.05) 70%)',
    emoji: '🗝️',
  },
  ALLIANCE_CHEST: {
    icon: <Crown size={18} />,
    color: '#bf5eff',
    glow: 'rgba(191,94,255,0.7)',
    bg: 'radial-gradient(circle, rgba(191,94,255,0.35) 0%, rgba(191,94,255,0.05) 70%)',
    emoji: '👑',
  },
};

// ── Floating 3D Node ──
const RewardNode: React.FC<{
  checkpoint: CheckpointData;
  status: 'locked' | 'claimable' | 'claimed';
  onClaim: () => void;
  index: number;
}> = ({ checkpoint, status, onClaim, index }) => {
  const cfg = REWARD_CONFIG[checkpoint.reward.type];
  const isMilestone = checkpoint.isMilestone;
  const nodeSize = isMilestone ? 64 : 52;

  return (
    <div className="flex flex-col items-center relative" style={{ minWidth: isMilestone ? 88 : 72 }}>
      {/* Day label */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.04 }}
        className="text-[9px] font-black tracking-widest mb-2 uppercase"
        style={{ color: status === 'locked' ? 'rgba(255,255,255,0.2)' : cfg.color }}
      >
        Day {checkpoint.day}
      </motion.div>

      {/* 3D Floating Node */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: index * 0.04 + 0.1, type: 'spring', stiffness: 200 }}
        className="relative"
      >
        {/* Glow ring for claimable */}
        {status === 'claimable' && (
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -inset-2 rounded-full"
            style={{ background: cfg.bg, filter: `blur(8px)` }}
          />
        )}

        {/* Outer ring */}
        <motion.button
          onClick={status === 'claimable' ? onClaim : undefined}
          whileTap={status === 'claimable' ? { scale: 0.9 } : undefined}
          animate={status === 'claimable' ? { y: [0, -4, 0] } : { y: 0 }}
          transition={status === 'claimable' ? { duration: 2.5, repeat: Infinity, ease: 'easeInOut' } : undefined}
          className="relative flex items-center justify-center rounded-full"
          style={{
            width: nodeSize,
            height: nodeSize,
            cursor: status === 'claimable' ? 'pointer' : 'default',
            background: status === 'locked'
              ? 'linear-gradient(145deg, #1a1a2e, #0f0f1a)'
              : status === 'claimed'
                ? `linear-gradient(145deg, ${cfg.color}15, ${cfg.color}08)`
                : `linear-gradient(145deg, ${cfg.color}30, ${cfg.color}10)`,
            border: status === 'locked'
              ? '2px solid rgba(255,255,255,0.06)'
              : status === 'claimed'
                ? `2px solid ${cfg.color}40`
                : `2px solid ${cfg.color}80`,
            boxShadow: status === 'claimable'
              ? `0 4px 20px ${cfg.glow}, 0 0 40px ${cfg.glow}40, inset 0 1px 0 rgba(255,255,255,0.1)`
              : status === 'claimed'
                ? `0 2px 8px rgba(0,0,0,0.3)`
                : `0 4px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03)`,
            // 3D perspective
            transform: status === 'claimable' ? 'perspective(200px) rotateX(5deg)' : 'perspective(200px) rotateX(2deg)',
          }}
        >
          {/* Inner content */}
          {status === 'locked' ? (
            <Lock size={isMilestone ? 18 : 14} style={{ color: 'rgba(255,255,255,0.15)' }} />
          ) : status === 'claimed' ? (
            <Check size={isMilestone ? 20 : 16} style={{ color: cfg.color, opacity: 0.6 }} />
          ) : (
            <motion.div
              animate={{ rotateY: [0, 10, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="flex items-center justify-center"
              style={{ color: cfg.color, filter: `drop-shadow(0 0 6px ${cfg.glow})` }}
            >
              <span style={{ fontSize: isMilestone ? 26 : 22 }}>{cfg.emoji}</span>
            </motion.div>
          )}

          {/* Shine effect for claimable */}
          {status === 'claimable' && (
            <motion.div
              animate={{ x: [-40, 80], opacity: [0, 0.3, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
              className="absolute inset-0 overflow-hidden rounded-full"
            >
              <div
                className="absolute top-0 h-full w-6"
                style={{
                  background: `linear-gradient(90deg, transparent, ${cfg.color}40, transparent)`,
                  transform: 'skewX(-20deg)',
                }}
              />
            </motion.div>
          )}
        </motion.button>

        {/* Milestone badge */}
        {isMilestone && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: index * 0.04 + 0.2, type: 'spring' }}
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
            style={{
              background: status === 'locked' ? '#1a1a2e' : cfg.color,
              border: status === 'locked' ? '1px solid rgba(255,255,255,0.1)' : 'none',
              boxShadow: status !== 'locked' ? `0 0 8px ${cfg.glow}` : 'none',
            }}
          >
            <Trophy size={10} style={{ color: status === 'locked' ? 'rgba(255,255,255,0.2)' : '#000' }} />
          </motion.div>
        )}
      </motion.div>

      {/* Reward label */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: index * 0.04 + 0.15 }}
        className="text-[8px] font-bold mt-2 text-center leading-tight max-w-[72px]"
        style={{
          color: status === 'locked' ? 'rgba(255,255,255,0.15)' : status === 'claimed' ? `${cfg.color}80` : cfg.color,
        }}
      >
        {checkpoint.reward.label}
      </motion.div>
    </div>
  );
};

// ── Claim Overlay ──
const ClaimOverlay: React.FC<{
  checkpoint: CheckpointData;
  onClaim: () => void;
  onClose: () => void;
}> = ({ checkpoint, onClaim, onClose }) => {
  const cfg = REWARD_CONFIG[checkpoint.reward.type];
  const [collecting, setCollecting] = useState(false);

  const handleClaim = () => {
    setCollecting(true);
    setTimeout(() => {
      onClaim();
    }, 600);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.7, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 18 }}
        onClick={e => e.stopPropagation()}
        className="relative w-72 rounded-3xl overflow-hidden"
        style={{
          background: '#0a0a1a',
          border: `1px solid ${cfg.color}40`,
          boxShadow: `0 0 60px ${cfg.glow}30, 0 20px 60px rgba(0,0,0,0.8)`,
        }}
      >
        {/* Glow top */}
        <div
          className="absolute top-0 left-0 right-0 h-32"
          style={{ background: `radial-gradient(ellipse at 50% 0%, ${cfg.glow}30, transparent 70%)` }}
        />

        <div className="relative p-6 flex flex-col items-center text-center">
          {/* Streak day badge */}
          <div
            className="px-3 py-1 rounded-full mb-4 text-[10px] font-black tracking-[0.2em]"
            style={{ background: `${cfg.color}20`, color: cfg.color, border: `1px solid ${cfg.color}30` }}
          >
            DAY {checkpoint.day} REWARD
          </div>

          {/* Floating reward */}
          <motion.div
            animate={collecting ? { scale: [1, 1.5, 0], opacity: [1, 1, 0], y: [0, -20, -60] } : { y: [0, -8, 0], rotateY: [0, 15, 0, -15, 0] }}
            transition={collecting ? { duration: 0.6 } : { duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="relative mb-4"
          >
            {/* Glow behind */}
            <div
              className="absolute inset-0 -m-4 rounded-full"
              style={{ background: cfg.bg, filter: 'blur(15px)' }}
            />
            <span className="relative text-6xl block" style={{ filter: `drop-shadow(0 0 20px ${cfg.glow})` }}>
              {cfg.emoji}
            </span>
          </motion.div>

          {/* Reward info */}
          <div className="text-lg font-black text-white mb-1">{checkpoint.reward.label}</div>
          <div className="text-xs text-gray-500 mb-6">
            {checkpoint.isMilestone ? '🏆 Milestone Reward' : 'Streak Checkpoint'}
          </div>

          {/* Claim button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleClaim}
            disabled={collecting}
            className="w-full py-3.5 rounded-2xl text-xs font-black tracking-[0.15em] uppercase transition-all"
            style={{
              background: collecting
                ? `${cfg.color}40`
                : `linear-gradient(135deg, ${cfg.color}, ${cfg.color}cc)`,
              color: '#0a0a1a',
              boxShadow: `0 0 20px ${cfg.glow}40`,
              border: 'none',
              cursor: collecting ? 'default' : 'pointer',
            }}
          >
            {collecting ? 'COLLECTING...' : 'CLAIM REWARD'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ── Avatar Marker ──
const AvatarMarker: React.FC<{ progress: number }> = ({ progress }) => (
  <motion.div
    className="absolute top-1/2 -translate-y-1/2 z-20"
    style={{ left: `${progress}%`, marginLeft: -14 }}
    animate={{ y: [-2, 2, -2] }}
    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
  >
    <div
      className="w-7 h-7 rounded-full flex items-center justify-center"
      style={{
        background: 'linear-gradient(135deg, #00d2ff, #0088cc)',
        border: '2px solid #00d2ff',
        boxShadow: '0 0 15px rgba(0,210,255,0.5), 0 0 30px rgba(0,210,255,0.2)',
      }}
    >
      <span className="text-xs">⚡</span>
    </div>
    {/* Trail glow */}
    <div
      className="absolute top-1/2 -translate-y-1/2 -left-4 w-6 h-3 rounded-full"
      style={{ background: 'linear-gradient(90deg, transparent, rgba(0,210,255,0.3))', filter: 'blur(4px)' }}
    />
  </motion.div>
);

// ═══════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════
interface StreakRewardsTimelineProps {
  streak: number;
  claimedDays: number[];
  onClaimReward: (day: number, reward: StreakReward) => void;
}

const StreakRewardsTimeline: React.FC<StreakRewardsTimelineProps> = ({
  streak,
  claimedDays,
  onClaimReward,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [claimTarget, setClaimTarget] = useState<CheckpointData | null>(null);
  const [showArrow, setShowArrow] = useState(true);

  const checkpoints = buildCheckpoints(streak);
  const claimedSet = new Set(claimedDays);

  // Find the first claimable checkpoint to auto-scroll to
  const firstClaimableIdx = checkpoints.findIndex(
    cp => cp.day <= streak && !claimedSet.has(cp.day)
  );
  const nextLockedIdx = checkpoints.findIndex(cp => cp.day > streak);
  const scrollTargetIdx = firstClaimableIdx >= 0 ? firstClaimableIdx : (nextLockedIdx >= 0 ? nextLockedIdx - 1 : checkpoints.length - 1);

  // Auto-scroll to current progress on mount
  useEffect(() => {
    if (scrollRef.current && scrollTargetIdx >= 0) {
      const nodeWidth = 80;
      const scrollTo = Math.max(0, scrollTargetIdx * nodeWidth - 60);
      setTimeout(() => {
        scrollRef.current?.scrollTo({ left: scrollTo, behavior: 'smooth' });
      }, 300);
    }
  }, [scrollTargetIdx]);

  // Hide arrow after scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      if (el.scrollLeft > 30) setShowArrow(false);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const handleClaimClick = useCallback((cp: CheckpointData) => {
    setClaimTarget(cp);
  }, []);

  const handleConfirmClaim = useCallback(() => {
    if (!claimTarget) return;
    onClaimReward(claimTarget.day, claimTarget.reward);
    setClaimTarget(null);
  }, [claimTarget, onClaimReward]);

  // Calculate avatar progress position
  const getAvatarProgress = () => {
    if (checkpoints.length === 0) return 0;
    const lastDay = checkpoints[checkpoints.length - 1].day;
    const firstDay = checkpoints[0].day;
    if (streak <= firstDay) return (streak / firstDay) * (1 / checkpoints.length) * 100;
    if (streak >= lastDay) return 100;
    // Find position between checkpoints
    for (let i = 0; i < checkpoints.length - 1; i++) {
      if (streak >= checkpoints[i].day && streak < checkpoints[i + 1].day) {
        const segmentStart = (i / (checkpoints.length - 1)) * 100;
        const segmentEnd = ((i + 1) / (checkpoints.length - 1)) * 100;
        const localProgress = (streak - checkpoints[i].day) / (checkpoints[i + 1].day - checkpoints[i].day);
        return segmentStart + localProgress * (segmentEnd - segmentStart);
      }
    }
    return 100;
  };

  // Count unclaimed available rewards
  const unclaimedCount = checkpoints.filter(cp => cp.day <= streak && !claimedSet.has(cp.day)).length;

  return (
    <div
      className="relative rounded-2xl overflow-hidden"
      style={{
        background: '#0B1015',
        border: '1px solid rgba(0, 210, 255, 0.1)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      }}
    >
      {/* Header */}
      <div className="px-5 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-[10px] font-black tracking-[0.2em] text-[#00d2ff]">
            STREAK REWARDS
          </div>
          {unclaimedCount > 0 && (
            <motion.div
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="px-2 py-0.5 rounded-full text-[9px] font-black"
              style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}
            >
              {unclaimedCount} NEW
            </motion.div>
          )}
        </div>
        <div className="text-[9px] font-mono text-gray-600">
          Day {streak}
        </div>
      </div>

      {/* Timeline scroll container */}
      <div className="relative">
        {/* Scroll hint arrow */}
        <AnimatePresence>
          {showArrow && checkpoints.length > 4 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, x: [0, 4, 0] }}
              exit={{ opacity: 0 }}
              transition={{ x: { duration: 1, repeat: Infinity } }}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-30 pointer-events-none"
            >
              <ChevronRight size={16} style={{ color: 'rgba(0,210,255,0.4)' }} />
            </motion.div>
          )}
        </AnimatePresence>

        <div
          ref={scrollRef}
          className="overflow-x-auto scrollbar-hide px-5 pb-5 pt-2"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {/* Progress track background */}
          <div className="relative" style={{ minWidth: checkpoints.length * 80 }}>
            {/* Track line */}
            <div
              className="absolute top-[42px] left-[36px] h-[2px]"
              style={{
                width: `calc(100% - 72px)`,
                background: 'rgba(255,255,255,0.04)',
              }}
            />
            {/* Filled progress line */}
            <div
              className="absolute top-[42px] left-[36px] h-[2px]"
              style={{
                width: `${(getAvatarProgress() / 100) * (checkpoints.length * 80 - 72)}px`,
                maxWidth: `calc(100% - 72px)`,
                background: 'linear-gradient(90deg, #00d2ff, #0088cc)',
                boxShadow: '0 0 8px rgba(0,210,255,0.4)',
                transition: 'width 0.5s ease',
              }}
            />

            {/* Checkpoint nodes */}
            <div className="flex items-start relative z-10">
              {checkpoints.map((cp, i) => {
                const status: 'locked' | 'claimable' | 'claimed' =
                  claimedSet.has(cp.day) ? 'claimed' :
                  cp.day <= streak ? 'claimable' : 'locked';

                return (
                  <RewardNode
                    key={cp.day}
                    checkpoint={cp}
                    status={status}
                    onClaim={() => handleClaimClick(cp)}
                    index={i}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Claim overlay */}
      <AnimatePresence>
        {claimTarget && (
          <ClaimOverlay
            checkpoint={claimTarget}
            onClaim={handleConfirmClaim}
            onClose={() => setClaimTarget(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default StreakRewardsTimeline;
export type { StreakReward };
