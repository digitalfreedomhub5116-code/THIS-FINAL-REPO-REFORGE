import { useState, useCallback, useRef, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

// ── AdMob Ad Unit IDs ──
const AD_UNITS = {
  KEY_REWARD: 'ca-app-pub-4155407212794852/2557191822',
  BORDER_REWARD: 'ca-app-pub-4155407212794852/7617946818',
  // Test IDs (use during development)
  KEY_REWARD_TEST: 'ca-app-pub-3940256099942544/5224354917',
  BORDER_REWARD_TEST: 'ca-app-pub-3940256099942544/5224354917',
};

// Use test ads in debug mode
const IS_TESTING = !Capacitor.isNativePlatform() || (window as any).__DEV_MODE__;

interface AdMobState {
  isInitialized: boolean;
  isAdLoading: boolean;
  adsWatchedToday: number;
  maxAdsPerDay: number;
  canWatchAd: boolean;
  error: string | null;
}

// Get today's ad count from localStorage
const getAdsWatchedToday = (): number => {
  try {
    const stored = localStorage.getItem('admob_ads_today');
    if (!stored) return 0;
    const data = JSON.parse(stored);
    const today = new Date().toISOString().split('T')[0];
    return data.date === today ? data.count : 0;
  } catch { return 0; }
};

const setAdsWatchedToday = (count: number) => {
  const today = new Date().toISOString().split('T')[0];
  localStorage.setItem('admob_ads_today', JSON.stringify({ date: today, count }));
};

export function useAdMob() {
  const [state, setState] = useState<AdMobState>({
    isInitialized: false,
    isAdLoading: false,
    adsWatchedToday: getAdsWatchedToday(),
    maxAdsPerDay: 3, // Watch 3 ads to earn 1 key
    canWatchAd: getAdsWatchedToday() < 3,
    error: null,
  });

  const admobRef = useRef<typeof import('@capacitor-community/admob').AdMob | null>(null);
  const rewardCallbackRef = useRef<((earned: boolean) => void) | null>(null);

  // ── Initialize AdMob ──
  useEffect(() => {
    const init = async () => {
      if (!Capacitor.isNativePlatform()) return;

      try {
        const { AdMob } = await import('@capacitor-community/admob');
        await AdMob.initialize({
          requestTrackingAuthorization: false, // We'll handle consent separately
          initializeForTesting: IS_TESTING,
        });
        admobRef.current = AdMob;
        setState(prev => ({ ...prev, isInitialized: true }));
        console.log('[AdMob] Initialized successfully');
      } catch (err) {
        console.error('[AdMob] Init failed:', err);
        setState(prev => ({ ...prev, error: 'AdMob initialization failed' }));
      }
    };
    init();
  }, []);

  // ── Show Rewarded Ad (for Keys) ──
  const showKeyRewardAd = useCallback(async (): Promise<boolean> => {
    if (!admobRef.current) {
      console.warn('[AdMob] Not initialized');
      return false;
    }

    if (state.adsWatchedToday >= state.maxAdsPerDay) {
      setState(prev => ({ ...prev, error: 'Daily ad limit reached. Come back tomorrow!' }));
      return false;
    }

    setState(prev => ({ ...prev, isAdLoading: true, error: null }));

    try {
      const { AdMob, RewardAdPluginEvents } = await import('@capacitor-community/admob');

      return new Promise<boolean>((resolve) => {
        let resolved = false;

        // Listen for reward
        const rewardListener = AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {
          if (!resolved) {
            resolved = true;
            const newCount = state.adsWatchedToday + 1;
            setAdsWatchedToday(newCount);
            setState(prev => ({
              ...prev,
              adsWatchedToday: newCount,
              canWatchAd: newCount < prev.maxAdsPerDay,
              isAdLoading: false,
            }));
            rewardListener.remove();
            resolve(true);
          }
        });

        // Listen for dismiss without reward
        const dismissListener = AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
          if (!resolved) {
            resolved = true;
            setState(prev => ({ ...prev, isAdLoading: false }));
            dismissListener.remove();
            resolve(false);
          }
        });

        // Listen for failure
        const failListener = AdMob.addListener(RewardAdPluginEvents.FailedToLoad, (err) => {
          if (!resolved) {
            resolved = true;
            console.error('[AdMob] Failed to load:', err);
            setState(prev => ({ ...prev, isAdLoading: false, error: 'Ad failed to load. Try again later.' }));
            failListener.remove();
            resolve(false);
          }
        });

        // Prepare and show
        AdMob.prepareRewardVideoAd({
          adId: IS_TESTING ? AD_UNITS.KEY_REWARD_TEST : AD_UNITS.KEY_REWARD,
          isTesting: IS_TESTING,
        }).then(() => {
          return AdMob.showRewardVideoAd();
        }).catch((err) => {
          if (!resolved) {
            resolved = true;
            console.error('[AdMob] Show failed:', err);
            setState(prev => ({ ...prev, isAdLoading: false, error: 'Could not show ad. Try again.' }));
            resolve(false);
          }
        });
      });
    } catch (err) {
      console.error('[AdMob] Error:', err);
      setState(prev => ({ ...prev, isAdLoading: false, error: 'Ad error. Try again.' }));
      return false;
    }
  }, [state.adsWatchedToday, state.maxAdsPerDay]);

  // ── Show Rewarded Ad (for Border) ──
  const showBorderRewardAd = useCallback(async (): Promise<boolean> => {
    if (!admobRef.current) return false;

    setState(prev => ({ ...prev, isAdLoading: true, error: null }));

    try {
      const { AdMob, RewardAdPluginEvents } = await import('@capacitor-community/admob');

      return new Promise<boolean>((resolve) => {
        let resolved = false;

        const rewardListener = AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {
          if (!resolved) {
            resolved = true;
            setState(prev => ({ ...prev, isAdLoading: false }));
            rewardListener.remove();
            resolve(true);
          }
        });

        const dismissListener = AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
          if (!resolved) {
            resolved = true;
            setState(prev => ({ ...prev, isAdLoading: false }));
            dismissListener.remove();
            resolve(false);
          }
        });

        const failListener = AdMob.addListener(RewardAdPluginEvents.FailedToLoad, () => {
          if (!resolved) {
            resolved = true;
            setState(prev => ({ ...prev, isAdLoading: false, error: 'Ad failed to load.' }));
            failListener.remove();
            resolve(false);
          }
        });

        AdMob.prepareRewardVideoAd({
          adId: IS_TESTING ? AD_UNITS.BORDER_REWARD_TEST : AD_UNITS.BORDER_REWARD,
          isTesting: IS_TESTING,
        }).then(() => {
          return AdMob.showRewardVideoAd();
        }).catch(() => {
          if (!resolved) {
            resolved = true;
            setState(prev => ({ ...prev, isAdLoading: false, error: 'Could not show ad.' }));
            resolve(false);
          }
        });
      });
    } catch {
      setState(prev => ({ ...prev, isAdLoading: false }));
      return false;
    }
  }, []);

  // ── Reset daily count (call on app open) ──
  const refreshDailyCount = useCallback(() => {
    const count = getAdsWatchedToday();
    setState(prev => ({
      ...prev,
      adsWatchedToday: count,
      canWatchAd: count < prev.maxAdsPerDay,
    }));
  }, []);

  return {
    state,
    showKeyRewardAd,
    showBorderRewardAd,
    refreshDailyCount,
    // Computed: how many ads left to earn a key
    adsRemainingForKey: Math.max(0, 3 - state.adsWatchedToday),
    hasEarnedKeyToday: state.adsWatchedToday >= 3,
  };
}
