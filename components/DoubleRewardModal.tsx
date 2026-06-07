import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, X, Zap, Coins, Package } from 'lucide-react';

interface RewardItem {
  icon: 'xp' | 'gold' | 'chest';
  label: string;
  amount: number;
}

interface DoubleRewardModalProps {
  title?: string;
  subtitle?: string;
  rewards: RewardItem[];
  onWatchAd: () => Promise<{ rewarded: boolean }>;
  onClaim: (multiplier: number) => void;
  onSkip: () => void;
}

const ICONS = {
  xp: <Zap size={18} style={{ color: '#38bdf8' }} />,
  gold: <Coins size={18} style={{ color: '#fbbf24' }} />,
  chest: <Package size={18} style={{ color: '#a855f7' }} />,
};

const DoubleRewardModal: React.FC<DoubleRewardModalProps> = ({
  title = 'Reward Claimed!',
  subtitle = 'Watch a short ad to double your rewards.',
  rewards,
  onWatchAd,
  onClaim,
  onSkip,
}) => {
  const [watching, setWatching] = useState(false);

  const handleWatchAd = async () => {
    setWatching(true);
    try {
      const result = await onWatchAd();
      if (result.rewarded) {
        onClaim(2);
      } else {
        // Skipped — give base rewards
        onClaim(1);
      }
    } catch {
      // Ad failed — give base rewards
      onClaim(1);
    } finally {
      setWatching(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 20 }}
        style={{
          width: 'min(340px, 90vw)',
          borderRadius: 20,
          background: 'linear-gradient(160deg, #1a1030 0%, #0d0a14 100%)',
          border: '1px solid rgba(168,85,247,0.25)',
          boxShadow: '0 0 40px rgba(168,85,247,0.15)',
          padding: 28,
          textAlign: 'center',
          position: 'relative',
        }}
      >
          {/* Close */}
          <button
            onClick={() => onClaim(1)}
            style={{
              position: 'absolute', top: 12, right: 12,
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(255,255,255,0.3)',
            }}
          >
            <X size={18} />
          </button>

          {/* Title */}
          <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', marginBottom: 4 }}>
            {title}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 20 }}>
            {subtitle}
          </div>

          {/* Rewards list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            {rewards.map((r, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px', borderRadius: 12,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {ICONS[r.icon]}
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>
                    {r.label}
                  </span>
                </div>
                <span style={{ fontSize: 16, fontWeight: 900, color: '#fff' }}>
                  ×{r.amount}
                </span>
              </div>
            ))}
          </div>

          {/* 2x Arrow */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 8, marginBottom: 20,
            color: '#a855f7', fontSize: 11, fontWeight: 800,
          }}>
            <span>1×</span>
            <span style={{ opacity: 0.4 }}>→</span>
            <span style={{ color: '#22C55E' }}>2×</span>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>with ad</span>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={handleWatchAd}
              disabled={watching}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                width: '100%', padding: '14px 0', borderRadius: 14,
                background: 'linear-gradient(135deg, #a855f7, #7c3aed)',
                border: 'none', cursor: watching ? 'wait' : 'pointer',
                color: '#fff', fontSize: 14, fontWeight: 900,
                boxShadow: '0 0 20px rgba(168,85,247,0.3)',
                opacity: watching ? 0.6 : 1,
              }}
            >
              <Play size={16} />
              {watching ? 'Loading Ad...' : 'Watch Ad for 2× Rewards'}
            </button>
            <button
              onClick={() => onClaim(1)}
              style={{
                width: '100%', padding: '10px 0', borderRadius: 12,
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.1)',
                cursor: 'pointer',
                color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 700,
              }}
            >
              No thanks, claim base rewards
            </button>
          </div>
      </motion.div>
    </motion.div>
  );
};

export default DoubleRewardModal;
