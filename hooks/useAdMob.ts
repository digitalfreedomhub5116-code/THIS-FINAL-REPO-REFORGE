/**
 * useAdMob — Capacitor AdMob integration hook
 * 
 * Handles rewarded and interstitial ad loading/showing.
 * Skips gracefully on web (localhost dev).
 */

import { useCallback, useRef, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';

// ── Toggle for test ads (set to false for production builds) ──
const USE_TEST_ADS = true; // 🧪 TEST MODE — switch to false once AdMob app is approved

// Google's official test ad unit IDs (always return test ads, safe to use)
const TEST_AD_UNITS = {
  KEY_REWARD: 'ca-app-pub-3940256099942544/5224354917',
  BORDER_REWARD: 'ca-app-pub-3940256099942544/5224354917',
  DUNGEON_INTERSTITIAL: 'ca-app-pub-3940256099942544/1033173712',
} as const;

// Real production ad unit IDs (from AdMob Console)
const PROD_AD_UNITS = {
  KEY_REWARD: 'ca-app-pub-4155407212794852/2557191822',
  BORDER_REWARD: 'ca-app-pub-4155407212794852/7617946818',
  DUNGEON_INTERSTITIAL: 'ca-app-pub-4155407212794852/6424585968',
} as const;

export const AD_UNITS = USE_TEST_ADS ? TEST_AD_UNITS : PROD_AD_UNITS;

// Lazy-load the AdMob plugin only on native
let AdMobModule: any = null;
async function getAdMob() {
  if (AdMobModule) return AdMobModule;
  const isNative = Capacitor.isNativePlatform();
  console.log('[AdMob] Platform check:', { isNative, platform: Capacitor.getPlatform() });
  if (!isNative) return null;
  try {
    const mod = await import('@capacitor-community/admob');
    AdMobModule = mod.AdMob;
    console.log('[AdMob] Plugin loaded successfully:', !!AdMobModule);
    return AdMobModule;
  } catch (err) {
    console.error('[AdMob] Plugin import FAILED:', err);
    return null;
  }
}

export function useAdMob() {
  const initializedRef = useRef(false);
  const [isReady, setIsReady] = useState(false);

  // ── Initialize AdMob SDK ──
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    (async () => {
      console.log('[AdMob] Starting initialization... USE_TEST_ADS =', USE_TEST_ADS);
      const AdMob = await getAdMob();
      if (!AdMob) {
        console.warn('[AdMob] getAdMob() returned null — skipping init');
        return;
      }

      try {
        await AdMob.initialize({
          // Set to true while using test ads, false for production
          initializeForTesting: USE_TEST_ADS,
          // Request user consent (GDPR)
          requestTrackingAuthorization: true,
        });
        setIsReady(true);
        console.log('[AdMob] ✅ Initialized successfully! Ready to serve ads.');
      } catch (err) {
        console.error('[AdMob] ❌ Init FAILED:', err);
      }
    })();
  }, []);

  // ── Show Rewarded Ad ──
  // Returns: { rewarded: boolean, type?: string }
  const showRewardedAd = useCallback(async (adUnitId: string): Promise<{ rewarded: boolean; type?: string; amount?: number }> => {
    console.log('[AdMob] showRewardedAd called with adUnitId:', adUnitId);
    const AdMob = await getAdMob();
    if (!AdMob) {
      console.warn('[AdMob] Not on native platform — ads not available');
      // On web/browser: do NOT grant reward. Only native app can show real ads.
      return { rewarded: false };
    }

    try {
      // Prepare the rewarded ad
      const { RewardAdPluginEvents } = await import('@capacitor-community/admob');

      return new Promise<{ rewarded: boolean; type?: string; amount?: number }>((resolve) => {
        let resolved = false;

        // Listen for reward event
        const rewardListener = AdMob.addListener(
          RewardAdPluginEvents.Rewarded,
          (reward: any) => {
            if (!resolved) {
              resolved = true;
              resolve({ rewarded: true, type: reward?.type, amount: reward?.amount });
            }
          }
        );

        // Listen for dismiss without reward
        const dismissListener = AdMob.addListener(
          RewardAdPluginEvents.Dismissed,
          () => {
            // Give a small delay to let Rewarded event fire first
            setTimeout(() => {
              if (!resolved) {
                resolved = true;
                resolve({ rewarded: false });
              }
            }, 300);
          }
        );

        // Listen for failure
        const failListener = AdMob.addListener(
          RewardAdPluginEvents.FailedToLoad,
          () => {
            if (!resolved) {
              resolved = true;
              resolve({ rewarded: false });
            }
          }
        );

        // Clean up listeners after resolution
        const cleanup = () => {
          setTimeout(() => {
            rewardListener?.remove?.();
            dismissListener?.remove?.();
            failListener?.remove?.();
          }, 500);
        };

        // Prepare and show
        AdMob.prepareRewardVideoAd({ adId: adUnitId, isTesting: USE_TEST_ADS })
          .then(() => AdMob.showRewardVideoAd())
          .then(() => {
            // Ad shown, waiting for reward/dismiss events
          })
          .catch((err: any) => {
            console.error('[AdMob] Rewarded ad error:', err);
            if (!resolved) {
              resolved = true;
              resolve({ rewarded: false });
            }
            cleanup();
          });

        // Safety timeout — resolve after 60s regardless
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            resolve({ rewarded: false });
          }
          cleanup();
        }, 60000);
      });
    } catch (err) {
      console.error('[AdMob] Rewarded ad error:', err);
      return { rewarded: false };
    }
  }, []);

  // ── Show Interstitial Ad ──
  // Returns: boolean (true = ad was shown)
  const showInterstitialAd = useCallback(async (adUnitId: string): Promise<boolean> => {
    const AdMob = await getAdMob();
    if (!AdMob) {
      console.log('[AdMob] Not on native platform, skipping interstitial');
      return true; // Allow through on web
    }

    try {
      const { InterstitialAdPluginEvents } = await import('@capacitor-community/admob');

      return new Promise<boolean>((resolve) => {
        let resolved = false;

        const dismissListener = AdMob.addListener(
          InterstitialAdPluginEvents.Dismissed,
          () => {
            if (!resolved) {
              resolved = true;
              resolve(true);
            }
          }
        );

        const failListener = AdMob.addListener(
          InterstitialAdPluginEvents.FailedToLoad,
          () => {
            if (!resolved) {
              resolved = true;
              resolve(true); // Allow through even if ad fails
            }
          }
        );

        const cleanup = () => {
          setTimeout(() => {
            dismissListener?.remove?.();
            failListener?.remove?.();
          }, 500);
        };

        AdMob.prepareInterstitial({ adId: adUnitId, isTesting: USE_TEST_ADS })
          .then(() => AdMob.showInterstitial())
          .catch((err: any) => {
            console.error('[AdMob] Interstitial error:', err);
            if (!resolved) {
              resolved = true;
              resolve(true); // Allow through on error
            }
            cleanup();
          });

        // Safety timeout
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            resolve(true);
          }
          cleanup();
        }, 30000);
      });
    } catch (err) {
      console.error('[AdMob] Interstitial error:', err);
      return true;
    }
  }, []);

  return {
    isReady,
    showRewardedAd,
    showInterstitialAd,
    AD_UNITS,
  };
}
