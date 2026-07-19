/**
 * ManaKeyStore.tsx — In-App Purchase key packs for REFORGE
 *
 * HORIZONTAL card layout matching KitGlowCard's exact design DNA:
 * - 3-layer structure: Outer glow → Gradient border (3px) → Inner body
 * - clipPath corner chips for sci-fi aesthetic
 * - 3 diagonal white shine streaks
 * - Top edge glow line
 * - Category color system (cyan → purple → gold)
 *
 * Psychology applied:
 * - Visual escalation: handful → bag → treasure chest (anchoring)
 * - "BEST VALUE" golden badge triggers anchoring bias
 * - Savings % triggers "smart buyer" identity
 * - Purple = Epic, Gold = Legendary (conditioned from loot systems)
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Key, CheckCircle2 } from 'lucide-react';
import PurchaseCelebrationModal from './PurchaseCelebrationModal';
import type { RevenueCatState, RevenueCatActions } from '../hooks/useRevenueCat';

// ── Pack Configuration ──

interface ManaPack {
  id: string;
  productId: string;
  name: string;
  subtitle: string;
  amount: number;
  price: string;
  image: string;
  tier: 'starter' | 'popular' | 'best';
  badge?: string;
  catColor: string;
  savings?: string;
  imgSize: number;
}

const MANA_PACKS: ManaPack[] = [
  {
    id: 'mana_small',
    productId: 'mana_crystals_10',
    name: 'Shadow Keys',
    subtitle: 'Begin your ascent',
    amount: 10,
    price: '₹29',
    image: '/assets/store/keyless-Photoroom.png',
    tier: 'starter',
    catColor: '#8B5CF6',
    imgSize: 210,
  },
  {
    id: 'mana_medium',
    productId: 'mana_crystals_30',
    name: 'Phantom Keys',
    subtitle: 'Unlock greater power',
    amount: 30,
    price: '₹79',
    image: '/assets/store/key medium-Photoroom.png',
    tier: 'popular',
    badge: 'POPULAR',
    catColor: '#8B5CF6',
    savings: 'Save 9%',
    imgSize: 210,
  },
  {
    id: 'mana_large',
    productId: 'mana_crystals_75',
    name: 'Monarch Keys',
    subtitle: 'Rule the dungeon gates',
    amount: 75,
    price: '₹149',
    image: '/assets/store/keymax-Photoroom.png',
    tier: 'best',
    badge: 'BEST VALUE',
    catColor: '#8B5CF6',
    savings: 'Save 32%',
    imgSize: 260,
  },
];

// ── Component ──

interface ManaKeyStoreProps {
  keys: number;
  rcState?: RevenueCatState;
  rcActions?: RevenueCatActions;
  onKeysUpdate?: (newKeys: number) => void;
}

const CHIP = 12; // Corner chip size for clipPath
const CLIP = `polygon(0 0, calc(100% - ${CHIP}px) 0, 100% ${CHIP}px, 100% 100%, ${CHIP}px 100%, 0 calc(100% - ${CHIP}px))`;

const ManaKeyStore: React.FC<ManaKeyStoreProps> = ({ keys, rcState, rcActions, onKeysUpdate }) => {
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [celebrationPack, setCelebrationPack] = useState<ManaPack | null>(null);

  // ── Preload all pack images, show skeleton until done ──
  useEffect(() => {
    let cancelled = false;
    const promises = MANA_PACKS.map(
      (p) => new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = p.image;
      })
    );
    Promise.all(promises).then(() => {
      if (!cancelled) setImagesLoaded(true);
    });
    return () => { cancelled = true; };
  }, []);

  const handlePurchase = async (pack: ManaPack) => {
    if (!rcState?.isNative || !rcActions || !rcState.offerings) {
      setPurchaseError('Purchases are only available in the app');
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
        setPurchaseError('Store is being set up — available soon!');
        setBuyingId(null);
        setTimeout(() => setPurchaseError(null), 4000);
        return;
      }

      // Trigger Google Play purchase flow
      const result = await rcActions.purchasePackage(rcPackage);

      if (result.success) {
        // Credit keys on server after Google confirms — with retry for reliability
        const transactionId = (result as any).transactionId || `rc_${Date.now()}_${pack.productId}`;
        let credited = false;

        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const { authFetch } = await import('../lib/auth');
            const { API_BASE } = await import('../lib/apiConfig');
            const res = await authFetch(`${API_BASE}/api/iap/credit`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                productId: pack.productId,
                transactionId,
              }),
            });

            const data = await res.json();
            if (data.success && data.keys != null && onKeysUpdate) {
              onKeysUpdate(data.keys);
            }
            credited = true;
            break; // Success — exit retry loop
          } catch (err) {
            console.error(`[ManaStore] Server credit attempt ${attempt}/3 failed:`, err);
            if (attempt < 3) {
              await new Promise(r => setTimeout(r, attempt * 1000)); // Backoff: 1s, 2s
            }
          }
        }

        if (!credited) {
          console.error('[ManaStore] All credit attempts failed — purchase went through but server credit failed');
          setPurchaseError('Purchase confirmed! Keys will be added shortly.');
          setTimeout(() => setPurchaseError(null), 5000);
        }

        setPurchaseSuccess(pack.id);
        setCelebrationPack(pack);
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
    <>
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
          Key Crystals
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

      {/* ── Skeleton Loading or Real Cards ── */}
      {!imagesLoaded ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 16px' }}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="store-skeleton-card" style={{
              clipPath: CLIP,
              padding: 3,
              background: `linear-gradient(160deg, rgba(139,92,246,0.25), rgba(139,92,246,0.08) 40%, rgba(139,92,246,0.15) 80%)`,
            }}>
              <div style={{
                clipPath: CLIP,
                background: 'linear-gradient(160deg, rgba(139,92,246,0.08), #0a0515 60%)',
                display: 'flex', flexDirection: 'row', alignItems: 'center',
                padding: '16px 14px 16px 18px', minHeight: 120,
              }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div className="store-skeleton-pulse" style={{ width: 100, height: 28 }} />
                  <div className="store-skeleton-pulse" style={{ width: 140, height: 14 }} />
                  <div className="store-skeleton-pulse" style={{ width: 80, height: 10 }} />
                  <div className="store-skeleton-pulse" style={{ width: 90, height: 32, borderRadius: 16 }} />
                </div>
                <div className="store-skeleton-pulse" style={{
                  width: 90, height: 90, borderRadius: '50%', flexShrink: 0,
                }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 16px' }}>
        {MANA_PACKS.map((pack, idx) => {
          const isBuying = buyingId === pack.id;
          const isPurchased = purchaseSuccess === pack.id;
          const c = pack.catColor; // shorthand for the tier color

          return (
            <motion.div
              key={pack.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.08, type: 'spring', stiffness: 300, damping: 30 }}
            >
              {/* ── Layer 1: Outer Glow Wrapper ── */}
              <div
                style={{
                  filter: `drop-shadow(0 0 6px ${c}30) drop-shadow(0 2px 8px rgba(0,0,0,0.4))`,
                }}
              >
                {/* ── Layer 2: Gradient Border Frame (3px) ── */}
                <div
                  style={{
                    clipPath: CLIP,
                    padding: 3,
                    background: `linear-gradient(160deg, ${c}CC, ${c}50 40%, ${c}90 80%, ${c}CC)`,
                  }}
                >
                  {/* ── Layer 3: Inner Card Body ── */}
                  <div
                    style={{
                      clipPath: CLIP,
                      background: `linear-gradient(160deg, ${c}40 0%, ${c}22 25%, #111828 55%, #0d1118 100%)`,
                      position: 'relative',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: '16px 14px 16px 18px',
                      minHeight: 120,
                    }}
                  >
                    {/* ── Diagonal Shine Streaks (same as KitGlowCard) ── */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        pointerEvents: 'none',
                        zIndex: 1,
                        overflow: 'hidden',
                      }}
                    >
                      {/* Primary Shine */}
                      <div
                        style={{
                          position: 'absolute',
                          top: '-80%',
                          left: '-25%',
                          width: '55%',
                          height: '260%',
                          background:
                            'linear-gradient(72deg, transparent 36%, rgba(255,255,255,0.06) 42%, rgba(255,255,255,0.14) 46%, rgba(255,255,255,0.22) 48%, rgba(255,255,255,0.14) 50%, rgba(255,255,255,0.06) 54%, transparent 60%)',
                          transform: 'rotate(25deg)',
                        }}
                      />
                      {/* Secondary Shine */}
                      <div
                        style={{
                          position: 'absolute',
                          top: '-80%',
                          left: '12%',
                          width: '40%',
                          height: '260%',
                          background:
                            'linear-gradient(72deg, transparent 40%, rgba(255,255,255,0.04) 44%, rgba(255,255,255,0.12) 47%, rgba(255,255,255,0.18) 49%, rgba(255,255,255,0.12) 51%, rgba(255,255,255,0.04) 54%, transparent 58%)',
                          transform: 'rotate(25deg)',
                        }}
                      />
                      {/* Tertiary Shine */}
                      <div
                        style={{
                          position: 'absolute',
                          top: '-80%',
                          left: '42%',
                          width: '28%',
                          height: '260%',
                          background:
                            'linear-gradient(72deg, transparent 44%, rgba(255,255,255,0.03) 47%, rgba(255,255,255,0.08) 49%, rgba(255,255,255,0.03) 51%, transparent 54%)',
                          transform: 'rotate(25deg)',
                        }}
                      />
                    </div>

                    {/* ── Top Edge Glow Line ── */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: CHIP,
                        right: CHIP,
                        height: 1.5,
                        background: `linear-gradient(90deg, transparent, ${c}BB, transparent)`,
                        zIndex: 2,
                      }}
                    />

                    {/* ── Badge (top-left) ── */}
                    {pack.badge && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 8,
                          left: 8,
                          zIndex: 5,
                          padding: '3px 10px',
                          borderRadius: 6,
                          background: pack.tier === 'best'
                            ? 'linear-gradient(135deg, #fbbf24, #f59e0b)'
                            : 'linear-gradient(135deg, #a78bfa, #8b5cf6)',
                          fontSize: 8,
                          fontWeight: 900,
                          letterSpacing: '0.1em',
                          color: pack.tier === 'best' ? '#000' : '#fff',
                          boxShadow: pack.tier === 'best'
                            ? '0 2px 10px rgba(251,191,36,0.5)'
                            : '0 2px 10px rgba(139,92,246,0.4)',
                        }}
                      >
                        {pack.badge}
                      </div>
                    )}

                    {/* ── LEFT SIDE: Info + Buy ── */}
                    <div
                      style={{
                        position: 'relative',
                        zIndex: 3,
                        flex: 1,
                        minWidth: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                        paddingTop: pack.badge ? 18 : 0,
                      }}
                    >
                      {/* Pack Amount */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'baseline',
                          gap: 6,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 28,
                            fontWeight: 900,
                            color: '#fff',
                            fontFamily: 'monospace',
                            lineHeight: 1,
                            textShadow: `0 0 20px ${c}50`,
                          }}
                        >
                          {pack.amount}
                        </span>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 800,
                            color: '#fff',
                            textTransform: 'uppercase' as const,
                            letterSpacing: '0.08em',
                            opacity: 0.7,
                          }}
                        >
                          Keys
                        </span>
                      </div>

                      {/* Pack Name */}
                      <div>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 900,
                            color: '#fff',
                            lineHeight: 1.2,
                            textShadow: '0 2px 8px rgba(0,0,0,0.5)',
                          }}
                        >
                          {pack.name}
                        </div>
                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            color: 'rgba(255,255,255,0.35)',
                            marginTop: 1,
                          }}
                        >
                          {pack.subtitle}
                        </div>
                      </div>

                      {/* Savings + Buy Row */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          marginTop: 2,
                        }}
                      >
                        {/* Buy Button */}
                        <button
                          onClick={() => handlePurchase(pack)}
                          disabled={isBuying || isPurchased}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '7px 20px',
                            borderRadius: 16,
                            cursor: isBuying || isPurchased ? 'default' : 'pointer',
                            fontSize: 13,
                            fontWeight: 900,
                            fontFamily: 'monospace',
                            letterSpacing: '0.03em',
                            transition: 'all 0.2s',
                            background: isPurchased
                              ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                              : `linear-gradient(135deg, ${c}35, ${c}15)`,
                            border: isPurchased ? `1.5px solid #22c55e80` : `1.5px solid ${c}60`,
                            color: isPurchased ? '#000' : '#fff',
                            boxShadow: isPurchased
                              ? '0 0 14px rgba(34,197,94,0.4)'
                              : `0 0 10px ${c}20`,
                            opacity: isBuying ? 0.6 : 1,
                            transform: isBuying ? 'scale(0.97)' : 'scale(1)',
                          }}
                        >
                          {isPurchased ? (
                            <>
                              <CheckCircle2 size={14} /> ADDED!
                            </>
                          ) : isBuying ? (
                            <>
                              <span
                                style={{
                                  width: 16,
                                  height: 16,
                                  border: '2px solid rgba(255,255,255,0.25)',
                                  borderTopColor: '#fff',
                                  borderRadius: '50%',
                                  display: 'inline-block',
                                  animation: 'spin 0.8s linear infinite',
                                  flexShrink: 0,
                                }}
                              />
                              BUYING...
                            </>
                          ) : (
                            pack.price
                          )}
                        </button>

                        {/* Savings Badge */}
                        {pack.savings && (
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: 800,
                              color: c,
                              padding: '3px 8px',
                              borderRadius: 6,
                              background: `${c}12`,
                              border: `1px solid ${c}25`,
                              letterSpacing: '0.03em',
                            }}
                          >
                            {pack.savings}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* ── RIGHT SIDE: Pack Image ── */}
                    <div
                      style={{
                        position: 'relative',
                        zIndex: 3,
                        width: 110,
                        height: 110,
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'visible',
                      }}
                    >
                      {/* Radial glow behind image */}
                      <div
                        style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          width: 160,
                          height: 160,
                          borderRadius: '50%',
                          background: `radial-gradient(circle, ${c}25 0%, ${c}08 50%, transparent 70%)`,
                          transform: 'translate(-50%, -50%)',
                          pointerEvents: 'none',
                        }}
                      />
                      <img
                        src={pack.image}
                        alt={pack.name}
                        style={{
                          width: pack.imgSize,
                          height: pack.imgSize,
                          objectFit: 'contain',
                          filter: `drop-shadow(0 0 14px ${c}40)`,
                          position: 'relative',
                          zIndex: 1,
                        }}
                        loading="lazy"
                        draggable={false}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
      )}

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

      {/* ── Purchase Celebration Modal ── */}
      <PurchaseCelebrationModal
        isOpen={!!celebrationPack}
        packName={celebrationPack?.name || ''}
        amount={celebrationPack?.amount || 0}
        currency="keys"
        packImage={celebrationPack?.image || ''}
        tierColor={celebrationPack?.catColor || '#8B5CF6'}
        onClose={() => {
          setCelebrationPack(null);
          window.dispatchEvent(new CustomEvent('reforge:sync-needed'));
        }}
      />
    </>
  );
};

export default ManaKeyStore;
