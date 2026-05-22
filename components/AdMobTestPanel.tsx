import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Capacitor } from '@capacitor/core';
import { ChevronDown, Play, Gift, FlaskConical } from 'lucide-react';
import { triggerHaptic } from '../utils/soundEngine';

interface AdMobTestPanelProps {
  showInterstitialAd: (adUnitId: string) => Promise<boolean>;
  showRewardedAd: (adUnitId: string) => Promise<{ rewarded: boolean; type?: string; amount?: number }>;
  AD_UNITS: {
    KEY_REWARD: string;
    BORDER_REWARD: string;
    DUNGEON_INTERSTITIAL: string;
  };
  isReady: boolean;
}

type Status = 'idle' | 'loading' | 'success' | 'error';

const AdMobTestPanel: React.FC<AdMobTestPanelProps> = ({
  showInterstitialAd,
  showRewardedAd,
  AD_UNITS,
  isReady,
}) => {
  const [open, setOpen] = useState(false);
  const [interstitialStatus, setInterstitialStatus] = useState<Status>('idle');
  const [rewardedStatus, setRewardedStatus] = useState<Status>('idle');
  const [lastResult, setLastResult] = useState<string>('');

  const platform = Capacitor.getPlatform();
  const isNative = Capacitor.isNativePlatform();

  const handleInterstitial = useCallback(async () => {
    triggerHaptic('BUTTON_TAP');
    setInterstitialStatus('loading');
    setLastResult('Loading interstitial...');
    try {
      const ok = await showInterstitialAd(AD_UNITS.DUNGEON_INTERSTITIAL);
      setInterstitialStatus(ok ? 'success' : 'error');
      setLastResult(ok ? '✅ Interstitial dismissed/shown OK' : '❌ Interstitial failed');
    } catch (err: any) {
      setInterstitialStatus('error');
      setLastResult(`❌ Error: ${err?.message || String(err)}`);
    }
  }, [showInterstitialAd, AD_UNITS]);

  const handleRewarded = useCallback(async () => {
    triggerHaptic('BUTTON_TAP');
    setRewardedStatus('loading');
    setLastResult('Loading rewarded ad...');
    try {
      const r = await showRewardedAd(AD_UNITS.KEY_REWARD);
      setRewardedStatus(r.rewarded ? 'success' : 'error');
      setLastResult(
        r.rewarded
          ? `✅ Rewarded! type=${r.type ?? '?'} amount=${r.amount ?? '?'}`
          : '❌ Not rewarded (dismissed/failed)'
      );
    } catch (err: any) {
      setRewardedStatus('error');
      setLastResult(`❌ Error: ${err?.message || String(err)}`);
    }
  }, [showRewardedAd, AD_UNITS]);

  const statusDot = (s: Status) => {
    if (s === 'loading') return 'bg-yellow-400 animate-pulse';
    if (s === 'success') return 'bg-emerald-400';
    if (s === 'error') return 'bg-red-500';
    return 'bg-gray-600';
  };

  return (
    <div
      className="mt-6 mx-1 rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, rgba(10,10,20,0.9), rgba(5,5,9,0.95))',
        border: '1px solid rgba(0,212,255,0.15)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}
    >
      {/* Header / toggle */}
      <button
        onClick={() => {
          triggerHaptic('BUTTON_TAP');
          setOpen((v) => !v);
        }}
        className="w-full flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-white/[0.02]"
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: 'linear-gradient(135deg, rgba(0,212,255,0.18), rgba(0,212,255,0.04))',
            border: '1px solid rgba(0,212,255,0.3)',
          }}
        >
          <FlaskConical size={16} className="text-[#00d4ff]" />
        </div>
        <div className="flex-1 text-left">
          <div
            className="text-[13px] font-black text-white tracking-wide"
            style={{ fontFamily: 'Outfit, Inter, sans-serif' }}
          >
            Test AdMob
          </div>
          <div className="text-[10px] text-gray-500 font-medium tracking-wide">
            Debug panel — verify ads are wired up
          </div>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }}>
          <ChevronDown size={16} className="text-gray-500" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1">
              {/* Status grid */}
              <div
                className="grid grid-cols-3 gap-2 mb-3 p-2.5 rounded-xl"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <div>
                  <div className="text-[8px] text-gray-500 uppercase tracking-[0.15em] font-bold mb-0.5">
                    Platform
                  </div>
                  <div className="text-[11px] text-white font-mono">{platform}</div>
                </div>
                <div>
                  <div className="text-[8px] text-gray-500 uppercase tracking-[0.15em] font-bold mb-0.5">
                    Native
                  </div>
                  <div className="text-[11px] font-mono">
                    <span className={isNative ? 'text-emerald-400' : 'text-red-400'}>
                      {isNative ? 'YES' : 'NO'}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-[8px] text-gray-500 uppercase tracking-[0.15em] font-bold mb-0.5">
                    SDK Ready
                  </div>
                  <div className="text-[11px] font-mono">
                    <span className={isReady ? 'text-emerald-400' : 'text-yellow-400'}>
                      {isReady ? 'YES' : 'INIT…'}
                    </span>
                  </div>
                </div>
              </div>

              {!isNative && (
                <div
                  className="mb-3 p-2.5 rounded-lg text-[10px] text-yellow-300 leading-relaxed"
                  style={{
                    background: 'rgba(250,204,21,0.06)',
                    border: '1px solid rgba(250,204,21,0.2)',
                  }}
                >
                  ⚠️ Ads only render on a native Android build. Browser dev mode will skip them.
                </div>
              )}

              {/* Buttons */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleInterstitial}
                  disabled={interstitialStatus === 'loading'}
                  className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all active:scale-[0.99] disabled:opacity-60"
                  style={{
                    background: 'rgba(0,212,255,0.08)',
                    border: '1px solid rgba(0,212,255,0.25)',
                  }}
                >
                  <div className={`w-2 h-2 rounded-full shrink-0 ${statusDot(interstitialStatus)}`} />
                  <Play size={14} className="text-[#00d4ff] shrink-0" />
                  <div className="flex-1">
                    <div
                      className="text-[12px] font-bold text-white tracking-wide"
                      style={{ fontFamily: 'Outfit, Inter, sans-serif' }}
                    >
                      Show Test Interstitial
                    </div>
                    <div className="text-[9px] text-gray-500 font-mono truncate">
                      {AD_UNITS.DUNGEON_INTERSTITIAL}
                    </div>
                  </div>
                </button>

                <button
                  onClick={handleRewarded}
                  disabled={rewardedStatus === 'loading'}
                  className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all active:scale-[0.99] disabled:opacity-60"
                  style={{
                    background: 'rgba(250,204,21,0.06)',
                    border: '1px solid rgba(250,204,21,0.2)',
                  }}
                >
                  <div className={`w-2 h-2 rounded-full shrink-0 ${statusDot(rewardedStatus)}`} />
                  <Gift size={14} className="text-yellow-400 shrink-0" />
                  <div className="flex-1">
                    <div
                      className="text-[12px] font-bold text-white tracking-wide"
                      style={{ fontFamily: 'Outfit, Inter, sans-serif' }}
                    >
                      Show Test Rewarded Ad
                    </div>
                    <div className="text-[9px] text-gray-500 font-mono truncate">
                      {AD_UNITS.KEY_REWARD}
                    </div>
                  </div>
                </button>
              </div>

              {/* Result log */}
              {lastResult && (
                <div
                  className="mt-3 p-2.5 rounded-lg text-[10px] text-gray-300 font-mono leading-relaxed break-words"
                  style={{
                    background: 'rgba(0,0,0,0.4)',
                    border: '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  {lastResult}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdMobTestPanel;
