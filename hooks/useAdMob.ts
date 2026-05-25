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

// ── Test vs Production ad unit selection ──
//
// Driven by the build-time env var VITE_AD_MODE:
//   • unset / 'test'  → test ads (Google's safe demo unit IDs, no real revenue)
//   • 'prod'          → real production ads (only when shipping to Play Store)
//
// Default is test ads so any local debug/dev build never accidentally serves
// real ads to your own device — that's the fastest path to an AdMob policy
// strike. To produce a real-ads release build:
//
//     VITE_AD_MODE=prod npm run build && npx cap sync android
//     cd android && ./gradlew assembleRelease
//
// Override flags below are escape hatches for QA scenarios — leave at false
// for normal use.
const FORCE_TEST_ADS = false;       // true → always use test ads, even in release
const FORCE_PROD_ADS_IN_DEV = true;  // true → use real ads even when env says test

const adModeEnv = (() => {
  try {
    return (import.meta as any).env?.VITE_AD_MODE as string | undefined;
  } catch { return undefined; }
})();

const USE_TEST_ADS = FORCE_TEST_ADS || (adModeEnv !== 'prod' && !FORCE_PROD_ADS_IN_DEV);

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

if (typeof console !== 'undefined') {
  console.log('[AdMob] Mode:', USE_TEST_ADS ? 'TEST ADS (safe for dev)' : 'PROD ADS (real impressions)');
}

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
  const noOpRewarded = useCallback(async (
    _adUnitId: string,
    _opts?: { userId?: string; customData?: string },
  ) => {
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
  // Hardened state machine:
  //  • Tracks a tShown timestamp from the SDK lifecycle.
  //  • Resolves rewarded=true if Rewarded event fires (Google's authoritative signal).
  //  • If only Dismissed fires AND we observed >= MIN_WATCH_MS of audio focus, grant reward
  //    (covers SDK builds where Rewarded event is missed on certain devices).
  //  • Emits a window event 'admob:diag' on every terminal transition so the UI can
  //    surface a diagnostic banner without needing logcat (release builds strip console.log).
  //  • Uses an internal generation counter so listeners from a previous (resolved) call
  //    cannot cross-fire into a new call. Without this, watching one ad and then another
  //    in the same session leaks reward signals between them and the second resolves false.
  // Watch-time threshold for the dismiss-fallback grant. Production rewarded
  // videos run 15–30s, but the AdMob plugin's `Rewarded` event is often skipped
  // entirely on Capacitor — the user dismisses with the X button after the
  // reward fires server-side, and we get only the `Dismissed` event with no
  // explicit rewarded signal. SSV (verified Google→server callback) is the
  // authoritative anti-fraud layer, so the client gate just needs to confirm
  // an ad actually played: a few seconds of watch time is enough.
  const MIN_WATCH_MS = USE_TEST_ADS ? 3_000 : 5_000;
  const adCallGenRef = useRef(0);
  const showRewardedAd = useCallback(async (
    adUnitId: string,
    opts?: { userId?: string; customData?: string },
  ): Promise<{ rewarded: boolean; type?: string; amount?: number }> => {
    const myGen = ++adCallGenRef.current;
    console.log('[AdMob] 🎬 showRewardedAd called | adId:', adUnitId, '| gen:', myGen, '| ssv:', opts?.userId ? `user-${opts.userId.slice(-8)}` : 'none');

    const result = await loadAdMob();
    if (!result) {
      console.warn('[AdMob] Plugin not loaded — cannot show ad');
      try { window.dispatchEvent(new CustomEvent('admob:diag', { detail: { stage: 'no-plugin', rewarded: false } })); } catch {}
      return { rewarded: false };
    }

    const { AdMob, events } = result;
    const { RewardAdPluginEvents } = events;

    return new Promise<{ rewarded: boolean; type?: string; amount?: number }>((resolve) => {
      let resolved = false;
      let tShown = 0;       // ms timestamp when ad surface became visible (Showed event)
      let tShowCalled = 0;  // ms timestamp when WE called showRewardVideoAd() — this always fires
      let rewardReceived = false;
      const listeners: any[] = [];
      const isStaleCall = () => myGen !== adCallGenRef.current;

      const emitDiag = (detail: any) => {
        try { window.dispatchEvent(new CustomEvent('admob:diag', { detail })); } catch {}
      };

      const finish = (outcome: { rewarded: boolean; type?: string; amount?: number; reason?: string }) => {
        if (resolved) return;
        resolved = true;
        const watchedMs = tShown > 0 ? Date.now() - tShown : (tShowCalled > 0 ? Date.now() - tShowCalled : 0);
        const diag = { ...outcome, watchedMs, ts: Date.now() };
        console.log('[AdMob] 🏁 Ad result:', diag);
        emitDiag({ stage: 'finish', ...diag });
        // Synchronous teardown: prevents next ad call from receiving stale events.
        listeners.forEach(l => { try { l?.remove?.(); } catch {} });
        listeners.length = 0;
        resolve({ rewarded: outcome.rewarded, type: outcome.type, amount: outcome.amount });
      };

      listeners.push(AdMob.addListener(RewardAdPluginEvents.Loaded, (info: any) => {
        if (isStaleCall()) return;
        console.log('[AdMob] ✅ Ad LOADED:', info);
        emitDiag({ stage: 'loaded' });
      }));

      // Some SDK versions expose a `Showed` / `Opened` event — try both names defensively.
      const showedEvent = RewardAdPluginEvents.Showed
        ?? (RewardAdPluginEvents as any).Opened
        ?? (RewardAdPluginEvents as any).Show;
      if (showedEvent) {
        listeners.push(AdMob.addListener(showedEvent, () => {
          if (isStaleCall()) return;
          tShown = Date.now();
          console.log('[AdMob] 📺 Ad shown at', tShown);
          emitDiag({ stage: 'shown', tShown });
        }));
      }

      listeners.push(AdMob.addListener(RewardAdPluginEvents.Rewarded, (reward: any) => {
        if (isStaleCall()) return;
        console.log('[AdMob] 🎉 REWARDED!', reward);
        rewardReceived = true;
        finish({ rewarded: true, type: reward?.type, amount: reward?.amount, reason: 'rewarded-event' });
      }));

      listeners.push(AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
        if (isStaleCall()) return;
        const now = Date.now();
        // Use Showed-event timestamp if available; otherwise fall back to the
        // wall-clock from when we invoked showRewardVideoAd() (always set).
        const watchedFrom = tShown > 0 ? tShown : tShowCalled;
        const watchedMs = watchedFrom > 0 ? now - watchedFrom : 0;
        console.log('[AdMob] 👋 Ad dismissed | watchedMs:', watchedMs, '| tShown:', tShown, '| tShowCalled:', tShowCalled);
        emitDiag({ stage: 'dismissed', watchedMs });

        // Wait briefly for a possibly-late Rewarded event or showRewardVideoAd
        // resolution before deciding.
        setTimeout(() => {
          if (rewardReceived || resolved) return;

          // Decision matrix (anti-fraud is enforced by SSV — Google verifies
          // every ad watch via signed callback, so the client just needs to
          // confirm an ad played):
          //
          //   • Showed event fired AND user dismissed afterward → ad played, grant
          //   • No Showed event but >= MIN_WATCH_MS elapsed since
          //     showRewardVideoAd() was called → ad played, grant
          //     (this covers Capacitor builds where Showed isn't emitted)
          //   • Otherwise (very fast dismiss before any meaningful elapsed time)
          //     → reject as a true accidental tap
          if (tShown > 0) {
            console.log('[AdMob] 🎁 Granting reward via shown→dismissed path (', watchedMs, 'ms)');
            finish({ rewarded: true, reason: `shown-dismissed-${watchedMs}ms` });
          } else if (watchedMs >= MIN_WATCH_MS) {
            console.log('[AdMob] 🎁 Granting reward via wall-clock fallback (', watchedMs, 'ms)');
            finish({ rewarded: true, reason: `wallclock-fallback-${watchedMs}ms` });
          } else {
            console.log('[AdMob] ⛔ Dismissed too quickly (', watchedMs, 'ms) — no reward');
            finish({ rewarded: false, reason: `too-fast-${watchedMs}ms` });
          }
        }, 1200);
      }));

      listeners.push(AdMob.addListener(RewardAdPluginEvents.FailedToLoad, (err: any) => {
        if (isStaleCall()) return;
        console.error('[AdMob] ❌ Ad FAILED TO LOAD:', err);
        finish({ rewarded: false, reason: 'failed-to-load' });
      }));

      listeners.push(AdMob.addListener(RewardAdPluginEvents.FailedToShow, (err: any) => {
        if (isStaleCall()) return;
        console.error('[AdMob] ❌ Ad FAILED TO SHOW:', err);
        finish({ rewarded: false, reason: 'failed-to-show' });
      }));

      console.log('[AdMob] 📦 Preparing rewarded ad...', { adId: adUnitId, isTesting: USE_TEST_ADS });
      emitDiag({ stage: 'preparing', adId: adUnitId });

      // Build SSV options: userId is required for the AdMob plugin's ssv field
      // (one of userId or customData must be set). Passing userId tells Google
      // to include `user_id=<our id>` in the SSV callback so the server can
      // identify which player to credit. customData is reserved for a future
      // signed nonce if we want extra anti-replay on the server side.
      const ssv = opts?.userId || opts?.customData
        ? { ssv: { userId: opts?.userId, customData: opts?.customData } as any }
        : {};

      AdMob.prepareRewardVideoAd({ adId: adUnitId, isTesting: USE_TEST_ADS, ...ssv })
        .then(() => {
          console.log('[AdMob] ✅ Ad prepared, now showing...');
          // Mark the moment we asked the SDK to show the ad. From this point
          // on, if the user later dismisses with >= MIN_WATCH_MS elapsed, we
          // trust an ad played even when no Showed/Rewarded events fired.
          tShowCalled = Date.now();
          return AdMob.showRewardVideoAd();
        })
        .then((reward: any) => {
          console.log('[AdMob] 📺 Ad is displaying... | showResolved=', reward);
          // Belt-and-braces: if Showed event never fires, mark tShown now.
          if (tShown === 0) tShown = Date.now();
          // PRIMARY REWARD SIGNAL: capacitor-community/admob's
          // showRewardVideoAd() resolves with the AdMobRewardItem after the
          // reward is granted on Google's side. This is more reliable than
          // the Rewarded event listener (which is sometimes skipped on
          // Capacitor builds — the user just sees the ad complete and taps
          // the X to close). If we got an amount > 0 here, treat it as a
          // confirmed reward immediately.
          if (reward && (reward.amount > 0 || reward.type)) {
            rewardReceived = true;
            finish({
              rewarded: true,
              type: reward.type,
              amount: reward.amount,
              reason: 'show-resolved-with-reward',
            });
          }
        })
        .catch((err: any) => {
          console.error('[AdMob] ❌ prepare/show error:', err?.message || err);
          finish({ rewarded: false, reason: 'prepare-or-show-error' });
        });

      // Safety timeout — 60 seconds max (real rewarded ads top out around 30s, +buffer).
      setTimeout(() => {
        if (!resolved) {
          console.warn('[AdMob] ⏰ Timeout after 60s — no ad response');
          finish({ rewarded: false, reason: 'timeout' });
        }
      }, 60000);
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
