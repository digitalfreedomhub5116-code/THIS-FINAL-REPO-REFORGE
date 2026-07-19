import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Wrench, X, Flame, AlertTriangle } from 'lucide-react';
import { API_BASE } from '../lib/apiConfig';
import { authFetch } from '../lib/auth';
import { SystemCoin } from './icons/SystemCoin';

interface StreakBreakPromptProps {
  previousStreak: number;
  brokenAt: string; // ISO timestamp
  shieldCount: number;
  playerGold: number;
  onRepairSuccess: (restoredStreak: number, newGold: number) => void;
  onShieldSuccess: (newShieldCount: number, newGold: number) => void;
  onDismiss: () => void;
}

const StreakBreakPrompt: React.FC<StreakBreakPromptProps> = ({
  previousStreak,
  brokenAt,
  shieldCount,
  playerGold,
  onRepairSuccess,
  onShieldSuccess,
  onDismiss,
}) => {
  const [repairing, setRepairing] = useState(false);
  const [buyingShield, setBuyingShield] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');

  const repairCost = Math.min(300, 50 + previousStreak * 5);
  const shieldCost = 75;
  const canAffordRepair = playerGold >= repairCost;
  const canAffordShield = playerGold >= shieldCost;
  const canBuyShield = shieldCount < 2 && canAffordShield;

  // Countdown to repair expiry (48h from break)
  useEffect(() => {
    if (!brokenAt) return;
    const tick = () => {
      const expiresAt = new Date(brokenAt).getTime() + 48 * 60 * 60 * 1000;
      const diff = Math.max(0, expiresAt - Date.now());
      if (diff <= 0) {
        setTimeLeft('Expired');
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setTimeLeft(`${h}h ${m}m`);
    };
    tick();
    const iv = setInterval(tick, 60000);
    return () => clearInterval(iv);
  }, [brokenAt]);

  const handleRepair = async () => {
    setRepairing(true);
    try {
      const res = await authFetch(`${API_BASE}/api/players/streak-repair`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        onRepairSuccess(data.restoredStreak, data.newGold);
      }
    } catch { /* offline */ }
    setRepairing(false);
  };

  const handleBuyShield = async () => {
    setBuyingShield(true);
    try {
      const res = await authFetch(`${API_BASE}/api/players/streak-shield`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        onShieldSuccess(data.newShieldCount, data.newGold);
      }
    } catch { /* offline */ }
    setBuyingShield(false);
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[9500] flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onDismiss}
      >
        <motion.div
          className="w-full max-w-[360px] mx-4 rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, #1a0a0a 0%, #0a0a14 100%)',
            border: '1px solid rgba(239,68,68,0.2)',
          }}
          initial={{ y: 80, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 80, opacity: 0, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          onClick={e => e.stopPropagation()}
        >
          {/* Red accent bar */}
          <div style={{ height: 3, background: 'linear-gradient(90deg, #EF4444, #B91C1C)' }} />

          {/* Header */}
          <div className="px-5 pt-5 pb-3 text-center relative">
            <button
              onClick={onDismiss}
              className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              <X size={12} className="text-gray-500" />
            </button>

            <div className="text-3xl mb-2">💔</div>
            <h2 className="text-base font-black text-red-400 tracking-wider font-mono">
              YOUR STREAK WAS BROKEN
            </h2>
          </div>

          {/* Streak comparison */}
          <div className="mx-5 px-4 py-3 rounded-xl mb-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-gray-500 font-mono">PREVIOUS</span>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-black text-orange-400 font-mono">{previousStreak}</span>
                <Flame size={16} className="text-orange-400" />
                <span className="text-[10px] text-gray-500 font-mono">days</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-500 font-mono">CURRENT</span>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-black text-red-400 font-mono">1</span>
                <Flame size={16} className="text-red-400" />
                <span className="text-[10px] text-gray-500 font-mono">day</span>
              </div>
            </div>
          </div>

          {/* Repair option */}
          <div className="mx-5 mb-3 px-4 py-3.5 rounded-xl" style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.15)' }}>
            <div className="flex items-center gap-2 mb-2">
              <Wrench size={14} className="text-orange-400" />
              <span className="text-xs font-black text-white tracking-wider font-mono">REPAIR STREAK</span>
            </div>
            <p className="text-[10px] text-gray-400 font-mono mb-2">
              Restore to {previousStreak} days
            </p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="flex items-center -mx-0.5" style={{ width: 18 }}><SystemCoin size={18} /></div>
                <span className="text-sm font-black text-orange-400 font-mono">{repairCost}</span>
                {timeLeft && timeLeft !== 'Expired' && (
                  <span className="text-[9px] text-gray-600 font-mono ml-1">· Expires {timeLeft}</span>
                )}
              </div>
              <button
                onClick={handleRepair}
                disabled={!canAffordRepair || repairing || timeLeft === 'Expired'}
                className="px-4 py-1.5 rounded-lg text-[10px] font-black tracking-wider font-mono transition-all active:scale-95"
                style={{
                  background: canAffordRepair && timeLeft !== 'Expired'
                    ? 'linear-gradient(135deg, #F97316, #EA580C)'
                    : 'rgba(255,255,255,0.06)',
                  color: canAffordRepair && timeLeft !== 'Expired' ? '#0a0a14' : 'rgba(255,255,255,0.3)',
                  opacity: repairing ? 0.5 : 1,
                }}
              >
                {repairing ? 'REPAIRING...' : timeLeft === 'Expired' ? 'EXPIRED' : 'REPAIR'}
              </button>
            </div>
          </div>

          {/* Shield option */}
          <div className="mx-5 mb-5 px-4 py-3.5 rounded-xl" style={{ background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.12)' }}>
            <div className="flex items-center gap-2 mb-2">
              <Shield size={14} className="text-[#00d4ff]" />
              <span className="text-xs font-black text-white tracking-wider font-mono">PREVENT FUTURE BREAKS</span>
            </div>
            <p className="text-[10px] text-gray-400 font-mono mb-2">
              Buy Streak Shield · You own: {shieldCount}/2
            </p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="flex items-center -mx-0.5" style={{ width: 18 }}><SystemCoin size={18} /></div>
                <span className="text-sm font-black text-[#00d4ff] font-mono">{shieldCost}</span>
              </div>
              <button
                onClick={handleBuyShield}
                disabled={!canBuyShield || buyingShield}
                className="px-4 py-1.5 rounded-lg text-[10px] font-black tracking-wider font-mono transition-all active:scale-95"
                style={{
                  background: canBuyShield
                    ? 'linear-gradient(135deg, #00d4ff, #5A9AB5)'
                    : 'rgba(255,255,255,0.06)',
                  color: canBuyShield ? '#0a0a14' : 'rgba(255,255,255,0.3)',
                  opacity: buyingShield ? 0.5 : 1,
                }}
              >
                {buyingShield ? 'BUYING...' : shieldCount >= 2 ? 'MAX OWNED' : !canAffordShield ? 'NOT ENOUGH' : 'BUY SHIELD'}
              </button>
            </div>
          </div>

          {/* Dismiss */}
          <div className="text-center pb-5">
            <button
              onClick={onDismiss}
              className="text-[10px] text-gray-600 font-mono underline underline-offset-2 hover:text-gray-400 transition-colors"
            >
              DISMISS
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default StreakBreakPrompt;
