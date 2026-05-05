/**
 * useRevenueCat.ts — RevenueCat integration for REFORGE
 *
 * Handles:
 * - SDK initialization (Android/iOS/Web fallback)
 * - Fetching available offerings (subscriptions + consumables)
 * - Making purchases
 * - Checking entitlements (e.g., "mana_power" subscription)
 * - Restoring purchases
 *
 * Product IDs (configure these in Google Play Console + RevenueCat dashboard):
 *
 * Subscriptions:
 *   - mana_power_weekly
 *   - mana_power_monthly
 *   - mana_power_yearly
 *
 * Consumables:
 *   - mana_crystals_10
 *   - mana_crystals_30
 *   - mana_crystals_75
 *   - gold_crystals_1000
 *   - gold_crystals_4000
 *   - gold_crystals_12000
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  Purchases,
  LOG_LEVEL,
  PURCHASES_ERROR_CODE,
  type PurchasesOfferings,
  type PurchasesPackage,
  type CustomerInfo,
} from '@revenuecat/purchases-capacitor';

// ── RevenueCat API Keys ──
// Replace with your real keys from RevenueCat dashboard → Project → API Keys
const RC_API_KEY_ANDROID = 'goog_eOzEbZhFBupbAubEqTBkZzBqWCy'; // Production Play Store key
const RC_API_KEY_IOS = 'appl_REPLACE_WITH_IOS_KEY';             // Add when you have iOS

// ── Entitlement IDs (must match RevenueCat dashboard) ──
export const ENTITLEMENT_MANA_POWER = 'Reforge System Pro';

// ── Gold/Mana credit mapping for consumables ──
// Maps RevenueCat product IDs to the amount of currency to credit
export const CONSUMABLE_CREDITS: Record<string, { type: 'gold' | 'mana'; amount: number }> = {
  'gold_crystals_1000':  { type: 'gold', amount: 1000 },
  'gold_crystals_4000':  { type: 'gold', amount: 4000 },
  'gold_crystals_12000': { type: 'gold', amount: 12000 },
  'mana_crystals_10':    { type: 'mana', amount: 10 },
  'mana_crystals_30':    { type: 'mana', amount: 30 },
  'mana_crystals_75':    { type: 'mana', amount: 75 },
};

export interface RevenueCatState {
  /** Whether the SDK is ready */
  isReady: boolean;
  /** Whether we're on a native platform (Android/iOS) */
  isNative: boolean;
  /** Available offerings from RevenueCat */
  offerings: PurchasesOfferings | null;
  /** Current customer info (entitlements, etc.) */
  customerInfo: CustomerInfo | null;
  /** Whether the user has an active "mana_power" subscription */
  hasManaPower: boolean;
  /** Whether a purchase is in progress */
  isPurchasing: boolean;
  /** Last error message */
  error: string | null;
}

export interface RevenueCatActions {
  /** Purchase a specific package */
  purchasePackage: (pkg: PurchasesPackage) => Promise<{ success: boolean; creditType?: string; creditAmount?: number }>;
  /** Restore previous purchases */
  restorePurchases: () => Promise<void>;
  /** Refresh offerings */
  refreshOfferings: () => Promise<void>;
  /** Refresh customer info */
  refreshCustomerInfo: () => Promise<void>;
  /** Log in a user (call after authentication) */
  loginUser: (userId: string) => Promise<void>;
  /** Log out (reset to anonymous) */
  logoutUser: () => Promise<void>;
}

export function useRevenueCat(): [RevenueCatState, RevenueCatActions] {
  const [isReady, setIsReady] = useState(false);
  const [offerings, setOfferings] = useState<PurchasesOfferings | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initRef = useRef(false);

  const platform = Capacitor.getPlatform();
  const isNative = platform === 'android' || platform === 'ios';

  // ── Initialize SDK ──
  useEffect(() => {
    if (initRef.current || !isNative) {
      // On web, mark as ready but with no offerings
      if (!isNative) setIsReady(true);
      return;
    }
    initRef.current = true;

    (async () => {
      try {
        // Enable debug logging in dev
        await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });

        // Configure with platform-specific key
        const apiKey = platform === 'ios' ? RC_API_KEY_IOS : RC_API_KEY_ANDROID;
        await Purchases.configure({ apiKey });

        console.log('[RevenueCat] SDK configured for', platform);

        // Fetch initial data
        const [offeringsResult, customerResult] = await Promise.all([
          Purchases.getOfferings().catch(() => null),
          Purchases.getCustomerInfo().catch(() => null),
        ]);

        if (offeringsResult) {
          setOfferings(offeringsResult);
          console.log('[RevenueCat] Offerings loaded:', Object.keys(offeringsResult.all || {}));
        }

        if (customerResult?.customerInfo) {
          setCustomerInfo(customerResult.customerInfo);
          const activeEntitlements = Object.keys(customerResult.customerInfo.entitlements.active || {});
          console.log('[RevenueCat] Active entitlements:', activeEntitlements);
        }

        setIsReady(true);
      } catch (err) {
        console.error('[RevenueCat] Init error:', err);
        setError('Failed to initialize purchases');
        setIsReady(true); // Still mark ready so app doesn't hang
      }
    })();
  }, [isNative, platform]);

  // ── Derived: has active Mana Power subscription ──
  const hasManaPower = !!customerInfo?.entitlements?.active?.[ENTITLEMENT_MANA_POWER];

  // ── Purchase a package ──
  const purchasePackage = useCallback(async (pkg: PurchasesPackage) => {
    if (!isNative) {
      setError('Purchases are only available on mobile devices');
      return { success: false };
    }

    setIsPurchasing(true);
    setError(null);

    try {
      const result = await Purchases.purchasePackage({ aPackage: pkg });
      setCustomerInfo(result.customerInfo);

      // Check if it was a consumable and return credit info
      const productId = pkg.product.identifier;
      const credit = CONSUMABLE_CREDITS[productId];

      console.log('[RevenueCat] Purchase successful:', productId);

      return {
        success: true,
        creditType: credit?.type,
        creditAmount: credit?.amount,
      };
    } catch (err: unknown) {
      const rcError = err as { code?: string; message?: string };

      if (rcError.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
        console.log('[RevenueCat] Purchase cancelled by user');
        setError(null); // Don't show error for user cancellation
      } else {
        console.error('[RevenueCat] Purchase error:', rcError);
        setError(rcError.message || 'Purchase failed');
      }

      return { success: false };
    } finally {
      setIsPurchasing(false);
    }
  }, [isNative]);

  // ── Restore purchases ──
  const restorePurchases = useCallback(async () => {
    if (!isNative) return;
    try {
      const result = await Purchases.restorePurchases();
      setCustomerInfo(result.customerInfo);
      console.log('[RevenueCat] Purchases restored');
    } catch (err) {
      console.error('[RevenueCat] Restore error:', err);
      setError('Failed to restore purchases');
    }
  }, [isNative]);

  // ── Refresh offerings ──
  const refreshOfferings = useCallback(async () => {
    if (!isNative) return;
    try {
      const result = await Purchases.getOfferings();
      if (result) setOfferings(result);
    } catch (err) {
      console.error('[RevenueCat] Refresh offerings error:', err);
    }
  }, [isNative]);

  // ── Refresh customer info ──
  const refreshCustomerInfo = useCallback(async () => {
    if (!isNative) return;
    try {
      const result = await Purchases.getCustomerInfo();
      if (result?.customerInfo) setCustomerInfo(result.customerInfo);
    } catch (err) {
      console.error('[RevenueCat] Refresh customer info error:', err);
    }
  }, [isNative]);

  // ── Login user (call after your auth flow) ──
  const loginUser = useCallback(async (userId: string) => {
    if (!isNative) return;
    try {
      const result = await Purchases.logIn({ appUserID: userId });
      setCustomerInfo(result.customerInfo);
      console.log('[RevenueCat] Logged in user:', userId);
    } catch (err) {
      console.error('[RevenueCat] Login error:', err);
    }
  }, [isNative]);

  // ── Logout user ──
  const logoutUser = useCallback(async () => {
    if (!isNative) return;
    try {
      const result = await Purchases.logOut();
      setCustomerInfo(result.customerInfo);
      console.log('[RevenueCat] Logged out');
    } catch (err) {
      console.error('[RevenueCat] Logout error:', err);
    }
  }, [isNative]);

  const state: RevenueCatState = {
    isReady,
    isNative,
    offerings,
    customerInfo,
    hasManaPower,
    isPurchasing,
    error,
  };

  const actions: RevenueCatActions = {
    purchasePackage,
    restorePurchases,
    refreshOfferings,
    refreshCustomerInfo,
    loginUser,
    logoutUser,
  };

  return [state, actions];
}
