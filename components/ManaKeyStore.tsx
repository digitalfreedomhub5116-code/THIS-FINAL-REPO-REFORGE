/**
 * ManaKeyStore.tsx — In-App Purchase key packs for REFORGE
 *
 * Psychology applied:
 * - Visual Escalation: handful → bag → treasure chest (anchoring bias)
 * - "BEST VALUE" badge on largest pack (anchoring + loss aversion)
 * - Glow intensity scales with tier to signal premium value
 * - Savings percentage shown to trigger "smart buyer" identity
 * - Purple = Epic rarity (conditioned from Fortnite/WoW/Diablo)
 * - Gold = Legendary (conditioned from loot systems)
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Key, CheckCircle2 } from 'lucide-react';
import type { RevenueCatState, RevenueCatActions } from '../hooks/useRevenueCat';

// ── Pack Configuration ──

interface ManaPack {
  id: string;
  productId: string;
  name: string;
  amount: number;
  price: string;
  image: string;
  tier: 'starter' | 'popular' | 'best';
  badge?: string;
  glowColor: string;
  savings?: string;
}

const MANA_PACKS: ManaPack[] = [
  {
    id: 'mana_small',
    productId: 'mana_crystals_10',
    name: 'Mana Shard',
    amount: 10,
    price: '₹29',
    image: '/assets/store/keyless-Photoroom.png',
    tier: 'starter',
    glowColor: '#7dd3fc',
  },
  {
    id: 'mana_medium',
    productId: 'mana_crystals_30',
    name: 'Mana Pouch',
    amount: 30,
    price: '₹79',
    image: '/assets/store/key medium-Photoroom.png',
    tier: 'popular',
    badge: 'POPULAR',
    glowColor: '#818cf8',
    savings: 'Save 9%',
  },
  {
    id: 'mana_large',
    productId: 'mana_crystals_75',
    name: 'Mana Vault',
    amount: 75,
    price: '₹149',
    image: '/assets/store/keymax-Photoroom.png',
    tier: 'best',
    badge: 'BEST VALUE',
    glowColor: '#fbbf24',
    savings: 'Save 32%',
  },
];

// ── Component ──

interface ManaKeyStoreProps {
  keys: number;
  rcState?: RevenueCatState;
  rcActions?: RevenueCatActions;
  onKeysUpdate?: (newKeys: number) => void;
}

const ManaKeyStore: React.FC<ManaKeyStoreProps> = ({ keys, rcState, rcActions, onKeysUpdate }) => {
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  const handlePurchase = async (pack: ManaPack) => {
    if (!rcState?.isNative || !rcActions || !rcState.offerings) {
      setPurchaseError('Purchases are only available on mobile');
      setTimeout(() => setPurchaseError(null), 3000);
      return;
    }

    setBuyingId(pack.id);
    setPurchaseError(null);

    try {
      // Find the matching package from RevenueCat offerings
      const allPackages: any[] = [];
      Object.values(rcState.offerings.all || {}).forEach((offering: any) => {
        if (offering?.availablePackages) {
          allPackages.push(...offering.availablePackages);
        }
      });

      const rcPackage = allPackages.find(
        (p: any) => p.product?.identifier === pack.productId
      );

      if (!rcPackage) {
        console.error(
          `[ManaStore] Package not found: ${pack.productId}`,
          allPackages.map((p: any) => p.product?.identifier)
        );
        setPurchaseError('Package not available — check Play Console setup');
        setBuyingId(null);
        setTimeout(() => setPurchaseError(null), 4000);
        return;
      }

      // Trigger Google Play purchase flow
      const result = await rcActions.purchasePackage(rcPackage);

      if (result.success) {
        // Credit keys on server after Google confirms
        try {
          const { getPlayerAuthHeaders } = await import('../lib/playerApi');
          const { API_BASE } = await import('../lib/apiConfig');
          const res = await fetch(`${API_BASE}/api/iap/credit`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...getPlayerAuthHeaders(),
            },
            credentials: 'include',
            body: JSON.stringify({
              productId: pack.productId,
              transactionId: `rc_${Date.now()}_${pack.productId}`,
            }),
          });

          const data = await res.json();
          if (data.success && data.keys != null && onKeysUpdate) {
            onKeysUpdate(data.keys);
          }
        } catch (err) {
          console.error('[ManaStore] Server credit failed:', err);
          // Purchase succeeded on Google Play — keys will sync on next login
        }

        setPurchaseSuccess(pack.id);
        setTimeout(() => setPurchaseSuccess(null), 3000);
      }
    } catch (err) {
      console.error('[ManaStore] Purchase error:', err);
      setPurchaseError('Purchase failed — try again');
      setTimeout(() => setPurchaseError(null), 3000);
    }

    setBuyingId(null);
  };

  return (
    <section>
      {/* Section Header */}
      <div className="store-section-hdr">
        <div
          className="hdr-icon"
          style={{
            background: 'rgba(0,212,255,0.12)',
            border: '1px solid rgba(0,212,255,0.25)',
          }}
        >
          <Key size={15} style={{ color: '#00d4ff' }} />
        </div>
        <span className="hdr-title" style={{ color: '#fff' }}>
          Mana Crystals
        </span>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            borderRadius: 8,
            background: 'rgba(0,212,255,0.06)',
            border: '1px solid rgba(0,212,255,0.15)',
          }}
        >
          <img
            src="/assets/key-icon.png"
            alt=""
            width={14}
            height={14}
            style={{ width: 14, height: 14, objectFit: 'contain' }}
          />
          <span
            style={{
              fontSize: 11,
              fontWeight: 900,
              color: '#00d4ff',
              fontFamily: 'monospace',
            }}
          >
            {keys}
          </span>
        </div>
        <div className="hdr-line" />
      </div>

      {/* Error Toast */}
      <AnimatePresence>
        {purchaseError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              margin: '0 16px 12px',
              padding: '10px 16px',
              borderRadius: 12,
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.25)',
              fontSize: 11,
              fontWeight: 700,
              color: '#EF4444',
              textAlign: 'center',
              fontFamily: 'monospace',
            }}
          >
            {purchaseError}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 3 Key Pack Cards ── */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          padding: '0 16px',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
        }}
      >
        {MANA_PACKS.map((pack) => {
          const isBuying = buyingId === pack.id;
          const isPurchased = purchaseSuccess === pack.id;
          const isBest = pack.tier === 'best';
          const isPopular = pack.tier === 'popular';

          return (
            <motion.div
              key={pack.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay:
                  pack.tier === 'starter'
                    ? 0
                    : pack.tier === 'popular'
                    ? 0.08
                    : 0.16,
              }}
              style={{
                flex: '1 0 0',
                minWidth: 0,
                borderRadius: 20,
                overflow: 'hidden',
                position: 'relative',
                background: isBest
                  ? 'linear-gradient(180deg, rgba(251,191,36,0.08) 0%, rgba(10,10,20,0.98) 40%)'
                  : isPopular
                  ? 'linear-gradient(180deg, rgba(139,92,246,0.08) 0%, rgba(10,10,20,0.98) 40%)'
                  : 'linear-gradient(180deg, rgba(0,212,255,0.05) 0%, rgba(10,10,20,0.98) 40%)',
                border: isBest
                  ? '1.5px solid rgba(251,191,36,0.35)'
                  : isPopular
                  ? '1.5px solid rgba(139,92,246,0.3)'
                  : '1px solid rgba(0,212,255,0.12)',
                boxShadow: isBest
                  ? '0 4px 30px rgba(251,191,36,0.12), inset 0 1px 0 rgba(251,191,36,0.1)'
                  : isPopular
                  ? '0 4px 24px rgba(139,92,246,0.08)'
                  : '0 2px 16px rgba(0,0,0,0.3)',
              }}
            >
              {/* Tier Badge */}
              {pack.badge && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 5,
                    padding: '3px 12px',
                    borderRadius: '0 0 8px 8px',
                    background: isBest
                      ? 'linear-gradient(135deg, #fbbf24, #f59e0b)'
                      : 'linear-gradient(135deg, #a78bfa, #8b5cf6)',
                    fontSize: 8,
                    fontWeight: 900,
                    letterSpacing: '0.12em',
                    color: isBest ? '#000' : '#fff',
                    textTransform: 'uppercase' as const,
                    boxShadow: isBest
                      ? '0 4px 12px rgba(251,191,36,0.4)'
                      : '0 4px 12px rgba(139,92,246,0.4)',
                  }}
                >
                  {pack.badge}
                </div>
              )}

              {/* Radial glow behind image */}
              <div
                style={{
                  position: 'absolute',
                  top: '15%',
                  left: '50%',
                  transform: 'translate(-50%, -30%)',
                  width: '80%',
                  height: '60%',
                  background: `radial-gradient(ellipse, ${pack.glowColor}18 0%, transparent 70%)`,
                  pointerEvents: 'none',
                  filter: 'blur(12px)',
                }}
              />

              <div
                style={{
                  padding: '28px 8px 8px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 0,
                }}
              >
                {/* Pack Image */}
                <div
                  style={{
                    width: '85%',
                    maxWidth: 120,
                    aspectRatio: '1',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 6,
                  }}
                >
                  <img
                    src={pack.image}
                    alt={pack.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      filter: `drop-shadow(0 0 12px ${pack.glowColor}40)`,
                      animation: isBest
                        ? 'border-breathe-centered 3s ease-in-out infinite'
                        : undefined,
                    }}
                    loading="lazy"
                    draggable={false}
                  />
                </div>

                {/* Key Count + Pack Name */}
                <div style={{ textAlign: 'center', marginBottom: 4 }}>
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 900,
                      color: '#fff',
                      fontFamily: 'monospace',
                      textShadow: `0 0 16px ${pack.glowColor}50`,
                      lineHeight: 1.1,
                    }}
                  >
                    {pack.amount}
                  </div>
                  <div
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      color: 'rgba(255,255,255,0.45)',
                      textTransform: 'uppercase' as const,
                      letterSpacing: '0.1em',
                      fontFamily: 'monospace',
                    }}
                  >
                    {pack.name}
                  </div>
                </div>

                {/* Savings Badge */}
                {pack.savings && (
                  <div
                    style={{
                      fontSize: 8,
                      fontWeight: 800,
                      color: isBest ? '#fbbf24' : '#a78bfa',
                      padding: '2px 8px',
                      borderRadius: 6,
                      marginBottom: 6,
                      background: isBest
                        ? 'rgba(251,191,36,0.08)'
                        : 'rgba(139,92,246,0.08)',
                      border: `1px solid ${
                        isBest
                          ? 'rgba(251,191,36,0.2)'
                          : 'rgba(139,92,246,0.2)'
                      }`,
                      letterSpacing: '0.05em',
                    }}
                  >
                    {pack.savings}
                  </div>
                )}

                {/* Buy Button — triggers Google Play */}
                <button
                  onClick={() => handlePurchase(pack)}
                  disabled={isBuying || isPurchased}
                  style={{
                    width: '100%',
                    padding: '10px 0',
                    borderRadius: 12,
                    border: 'none',
                    cursor:
                      isBuying || isPurchased ? 'default' : 'pointer',
                    fontSize: 12,
                    fontWeight: 900,
                    fontFamily: 'monospace',
                    letterSpacing: '0.05em',
                    transition: 'all 0.2s',
                    position: 'relative',
                    overflow: 'hidden',
                    background: isPurchased
                      ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                      : isBest
                      ? 'linear-gradient(135deg, #fbbf24, #f59e0b)'
                      : isPopular
                      ? 'linear-gradient(135deg, #a78bfa, #8b5cf6)'
                      : 'linear-gradient(135deg, #00d4ff, #0ea5e9)',
                    color: isPurchased || isBest ? '#000' : '#fff',
                    boxShadow: isPurchased
                      ? '0 4px 16px rgba(34,197,94,0.3)'
                      : isBest
                      ? '0 4px 16px rgba(251,191,36,0.3)'
                      : isPopular
                      ? '0 4px 12px rgba(139,92,246,0.25)'
                      : '0 2px 8px rgba(0,212,255,0.2)',
                    opacity: isBuying ? 0.7 : 1,
                    transform: isBuying ? 'scale(0.97)' : 'scale(1)',
                  }}
                >
                  {isPurchased ? (
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                      }}
                    >
                      <CheckCircle2 size={14} /> ADDED!
                    </span>
                  ) : isBuying ? (
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                      }}
                    >
                      <span
                        style={{
                          animation:
                            'spin-clockwise 1s linear infinite',
                          display: 'inline-block',
                        }}
                      >
                        ⟳
                      </span>{' '}
                      BUYING...
                    </span>
                  ) : (
                    pack.price
                  )}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Info Footer */}
      <div
        style={{
          margin: '10px 16px 0',
          padding: '8px 12px',
          borderRadius: 10,
          background: 'rgba(0,212,255,0.03)',
          border: '1px solid rgba(0,212,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <Key
          size={12}
          style={{ color: 'rgba(0,212,255,0.4)', flexShrink: 0 }}
        />
        <span
          style={{
            fontSize: 9,
            color: 'rgba(255,255,255,0.3)',
            fontFamily: 'monospace',
            lineHeight: 1.4,
          }}
        >
          Keys unlock Dungeon Gates, purchase premium borders, and boost your
          progression. Charged via Google Play.
        </span>
      </div>
    </section>
  );
};

export default ManaKeyStore;
