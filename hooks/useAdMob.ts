/**
 * useAdMob — Capacitor AdMob integration hook
 * 
 * Handles rewarded and interstitial ad loading/showing.
 * Skips gracefully on web (localhost dev).
 */

import { useCallback, useRef, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';

// ══════════════════════════════════════════════════════════════
// ── GLOBAL AD KILL SWITCH ──
// Set to false to completely disable ALL ads across the app.
// When false: SDK is never initialized, no ad calls are made,
// all functions return safe no-op values immediately.
// ══════════════════════════════════════════════════════════════
const ADS_ENABLED = true; // ✅ ADS ENABLED — set to false to globally disable

// ── Toggle for test ads (set to false for production builds) ──
const USE_TEST_ADS = false; // 🚀 PRODUCTION — real AdMob ads are live

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
let AdMobPlugin: any = null;
let AdMobEvents: any = null;

async function loadAdMob() {
  if (AdMobPlugin) return { AdMob: AdMobPlugin, events: AdMobEvents };

  const isNative = Capacitor.isNativePlatform();
  console.log('[AdMob] Platform:', Capacitor.getPlatform(), '| isNative:', isNative);
  if (!isNative) return null;

  try {
    const mod = await import('@capacitor-community/admob');
    AdMobPlugin = mod.AdMob;
    AdMobEvents = {
      RewardAdPluginEvents: mod.RewardAdPluginEvents,
      InterstitialAdPluginEvents: mod.InterstitialAdPluginEvents,
    };
    console.log('[AdMob] ✅ Plugin module loaded');
    return { AdMob: AdMobPlugin, events: AdMobEvents };
  } catch (err) {
    console.error('[AdMob] ❌ Plugin import FAILED:', err);
    return null;
  }
}

export function useAdMob() {
  const initializedRef = useRef(false);
  const [isReady, setIsReady] = useState(false);

  // ── No-op stubs when ads are globally disabled ──
  const noOpRewarded = useCallback(async (_adUnitId: string) => {
    console.log('[AdMob] 🚫 Ads disabled globally — skipping rewarded ad');
    return { rewarded: false };
  }, []);

  const noOpInterstitial = useCallback(async (_adUnitId: string) => {
    console.log('[AdMob] 🚫 Ads disabled globally — skipping interstitial');
    return true; // Allow through
  }, []);

  // If ads are disabled, return immediately with no-op functions
  if (!ADS_ENABLED) {
    return {
      isReady: false,
      showRewardedAd: noOpRewarded,
      showInterstitialAd: noOpInterstitial,
      AD_UNITS,
    };
  }

  // ── Initialize AdMob SDK ──
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    (async () => {
      console.log('[AdMob] 🔄 Initializing... USE_TEST_ADS =', USE_TEST_ADS);
      const result = await loadAdMob();
      if (!result) {
        console.warn('[AdMob] Plugin not available (web or missing plugin)');
        return;
      }

      try {
        await result.AdMob.initialize({
          initializeForTesting: USE_TEST_ADS,
          requestTrackingAuthorization: false, // Skip on Android
        });
        setIsReady(true);
        console.log('[AdMob] ✅ SDK initialized! Test mode:', USE_TEST_ADS);
      } catch (err: any) {
        console.error('[AdMob] ❌ Initialize error:', err?.message || err);
      }
    })();
  }, []);

  // ── Show Rewarded Ad ──
  const showRewardedAd = useCallback(async (adUnitId: string): Promise<{ rewarded: boolean; type?: string; amount?: number }> => {
    console.log('[AdMob] 🎬 showRewardedAd called | adId:', adUnitId);

    const result = await loadAdMob();
    if (!result) {
      console.warn('[AdMob] Plugin not loaded — cannot show ad');
      return { rewarded: false };
    }

    const { AdMob, events } = result;
    const { RewardAdPluginEvents } = events;

    return new Promise<{ rewarded: boolean; type?: string; amount?: number }>((resolve) => {
      let resolved = false;
      const listeners: any[] = [];

      const finish = (outcome: { rewarded: boolean; type?: string; amount?: number }) => {
        if (resolved) return;
        resolved = true;
        console.log('[AdMob] 🏁 Ad result:', outcome);
        // Clean up all listeners
        setTimeout(() => {
          listeners.forEach(l => { try { l?.remove?.(); } catch {} });
        }, 300);
        resolve(outcome);
      };

      // Listen for reward
      listeners.push(AdMob.addListener(RewardAdPluginEvents.Loaded, (info: any) => {
        console.log('[AdMob] ✅ Ad LOADED:', info);
      }));

      listeners.push(AdMob.addListener(RewardAdPluginEvents.Rewarded, (reward: any) => {
        console.log('[AdMob] 🎉 REWARDED!', reward);
        finish({ rewarded: true, type: reward?.type, amount: reward?.amount });
      }));

      listeners.push(AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
        console.log('[AdMob] 👋 Ad dismissed');
        setTimeout(() => finish({ rewarded: false }), 500);
      }));

      listeners.push(AdMob.addListener(RewardAdPluginEvents.FailedToLoad, (err: any) => {
        console.error('[AdMob] ❌ Ad FAILED TO LOAD:', err);
        finish({ rewarded: false });
      }));

      listeners.push(AdMob.addListener(RewardAdPluginEvents.FailedToShow, (err: any) => {
        console.error('[AdMob] ❌ Ad FAILED TO SHOW:', err);
        finish({ rewarded: false });
      }));

      // Step 1: Prepare the ad
      console.log('[AdMob] 📦 Preparing rewarded ad...', { adId: adUnitId, isTesting: USE_TEST_ADS });
      
      AdMob.prepareRewardVideoAd({ adId: adUnitId, isTesting: USE_TEST_ADS })
        .then(() => {
          console.log('[AdMob] ✅ Ad prepared, now showing...');
          return AdMob.showRewardVideoAd();
        })
        .then(() => {
          console.log('[AdMob] 📺 Ad is displaying...');
        })
        .catch((err: any) => {
          console.error('[AdMob] ❌ prepare/show error:', err?.message || err);
          finish({ rewarded: false });
        });

      // Safety timeout — 20 seconds max
      setTimeout(() => {
        if (!resolved) {
          console.warn('[AdMob] ⏰ Timeout after 20s — no ad response');
          finish({ rewarded: false });
        }
      }, 20000);
    });
  }, []);

  // ── Show Interstitial Ad ──
  const showInterstitialAd = useCallback(async (adUnitId: string): Promise<boolean> => {
    console.log('[AdMob] 🎬 showInterstitialAd called | adId:', adUnitId);

    const result = await loadAdMob();
    if (!result) {
      console.log('[AdMob] Not on native — skipping interstitial');
      return true;
    }

    const { AdMob, events } = result;
    const { InterstitialAdPluginEvents } = events;

    return new Promise<boolean>((resolve) => {
      let resolved = false;
      const listeners: any[] = [];

      const finish = (shown: boolean) => {
        if (resolved) return;
        resolved = true;
        setTimeout(() => {
          listeners.forEach(l => { try { l?.remove?.(); } catch {} });
        }, 300);
        resolve(shown);
      };

      listeners.push(AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
        console.log('[AdMob] Interstitial dismissed');
        finish(true);
      }));

      listeners.push(AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad, (err: any) => {
        console.error('[AdMob] Interstitial failed to load:', err);
        finish(true); // Allow through
      }));

      listeners.push(AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, (err: any) => {
        console.error('[AdMob] Interstitial failed to show:', err);
        finish(true);
      }));

      AdMob.prepareInterstitial({ adId: adUnitId, isTesting: USE_TEST_ADS })
        .then(() => AdMob.showInterstitial())
        .catch((err: any) => {
          console.error('[AdMob] Interstitial error:', err?.message || err);
          finish(true);
        });

      setTimeout(() => finish(true), 30000);
    });
  }, []);

  return {
    isReady,
    showRewardedAd,
    showInterstitialAd,
    AD_UNITS,
  };
}
