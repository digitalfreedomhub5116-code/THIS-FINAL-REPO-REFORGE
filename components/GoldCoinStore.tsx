/**
 * GoldCoinStore.tsx — In-App Purchase gold crystal packs for REFORGE
 *
 * HORIZONTAL card layout matching ManaKeyStore's exact design DNA:
 * - 3-layer structure: Outer glow → Gradient border (3px) → Inner body
 * - clipPath corner chips for sci-fi aesthetic
 * - 3 diagonal white shine streaks
 * - Top edge glow line
 * - YELLOW / GOLD theme throughout
 *
 * Psychology applied:
 * - Visual escalation: few crystals → bag → treasure (anchoring)
 * - "BEST VALUE" golden badge triggers anchoring bias
 * - Savings % triggers "smart buyer" identity
 *
 * highlightPopular: when true, the POPULAR pack pulses with a zoom animation
 * to draw the user's attention after clicking "Add Crystals".
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, CheckCircle2 } from 'lucide-react';
import PurchaseCelebrationModal from './PurchaseCelebrationModal';
import type { RevenueCatState, RevenueCatActions } from '../hooks/useRevenueCat';

// ── Pack Configuration ──

interface GoldPack {
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

const GOLD_PACKS: GoldPack[] = [
  {
    id: 'gold_small',
    productId: 'gold_crystals_1000',
    name: 'Gold Pouch',
    subtitle: 'Start your fortune',
    amount: 1000,
    price: '₹49',
    image: '/assets/store/coinsless-Photoroom.png',
    tier: 'starter',
    catColor: '#F59E0B',
    imgSize: 210,
  },
  {
    id: 'gold_medium',
    productId: 'gold_crystals_4000',
    name: 'Gold Vault',
    subtitle: 'Unlock greater riches',
    amount: 4000,
    price: '₹149',
    image: '/assets/store/coins medium-Photoroom.png',
    tier: 'popular',
    badge: 'POPULAR',
    catColor: '#F59E0B',
    savings: 'Save 24%',
    imgSize: 210,
  },
  {
    id: 'gold_large',
    productId: 'gold_crystals_12000',
    name: 'Gold Treasury',
    subtitle: 'Rule the economy',
    amount: 12000,
    price: '₹449',
    image: '/assets/store/coinsmax-Photoroom.png',
    tier: 'best',
    badge: 'BEST VALUE',
    catColor: '#F59E0B',
    savings: 'Save 39%',
    imgSize: 260,
  },
];

// ── Component ──

interface GoldCoinStoreProps {
  gold: number;
  rcState?: RevenueCatState;
  rcActions?: RevenueCatActions;
  onGoldUpdate?: (newGold: number) => void;
  /** When true, scroll into view and pulse the POPULAR pack */
  highlightPopular?: boolean;
  /** Called after the highlight animation completes */
  onHighlightDone?: () => void;
}

const CHIP = 12; // Corner chip size for clipPath
const CLIP = `polygon(0 0, calc(100% - ${CHIP}px) 0, 100% ${CHIP}px, 100% 100%, ${CHIP}px 100%, 0 calc(100% - ${CHIP}px))`;

const GoldCoinStore: React.FC<GoldCoinStoreProps> = ({ gold, rcState, rcActions, onGoldUpdate, highlightPopular, onHighlightDone }) => {
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [isPulsing, setIsPulsing] = useState(false);
  const [celebrationPack, setCelebrationPack] = useState<GoldPack | null>(null);

  // ── Preload all pack images, show skeleton until done ──
  useEffect(() => {
    let cancelled = false;
    const promises = GOLD_PACKS.map(
      (p) => new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => resolve(); // Don't block on error
        img.src = p.image;
      })
    );
    Promise.all(promises).then(() => {
      if (!cancelled) setImagesLoaded(true);
    });
    return () => { cancelled = true; };
  }, []);
  const sectionRef = useRef<HTMLElement>(null);
  const popularRef = useRef<HTMLDivElement>(null);
  // Store callback in ref to avoid useEffect dependency loop
  const onHighlightDoneRef = useRef(onHighlightDone);
  onHighlightDoneRef.current = onHighlightDone;

  // ── Handle highlight: scroll into view + pulse animation ──
  useEffect(() => {
    if (!highlightPopular) {
      setIsPulsing(false);
      return;
    }

    // Step 1: Scroll the Gold Crystal section into view
    if (sectionRef.current) {
      sectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Step 2: After scroll completes (~600ms), start pulsing
    const pulseDelay = setTimeout(() => {
      setIsPulsing(true);
    }, 600);

    // Step 3: Stop pulsing after 3 cycles (~2.4s) and notify parent
    const stopDelay = setTimeout(() => {
      setIsPulsing(false);
      onHighlightDoneRef.current?.();
    }, 3200);

    return () => {
      clearTimeout(pulseDelay);
      clearTimeout(stopDelay);
    };
  // ONLY depend on highlightPopular — callback is in a ref
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightPopular]);

  const handlePurchase = async (pack: GoldPack) => {
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
          `[GoldStore] Package not found: ${pack.productId}`,
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
        // Credit gold on server after Google confirms — with retry for reliability
        const transactionId = `rc_${Date.now()}_${pack.productId}`;
        let credited = false;

        for (let attempt = 1; attempt <= 3; attempt++) {
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
                transactionId,
              }),
            });

            const data = await res.json();
            if (data.success && data.gold != null && onGoldUpdate) {
              onGoldUpdate(data.gold);
            }
            credited = true;
            break; // Success — exit retry loop
          } catch (err) {
            console.error(`[GoldStore] Server credit attempt ${attempt}/3 failed:`, err);
            if (attempt < 3) {
              await new Promise(r => setTimeout(r, attempt * 1000)); // Backoff: 1s, 2s
            }
          }
        }

        if (!credited) {
          console.error('[GoldStore] All credit attempts failed — purchase went through but server credit failed');
          setPurchaseError('Purchase confirmed! Gold will be added shortly.');
          setTimeout(() => setPurchaseError(null), 5000);
        }

        setPurchaseSuccess(pack.id);
        setCelebrationPack(pack);
        setTimeout(() => setPurchaseSuccess(null), 3000);
      }
    } catch (err) {
      console.error('[GoldStore] Purchase error:', err);
      setPurchaseError('Purchase failed — try again');
      setTimeout(() => setPurchaseError(null), 3000);
    }

    setBuyingId(null);
  };

  return (
    <>
    <section ref={sectionRef} id="gold-crystal-store">
      {/* Section Header */}
      <div className="store-section-hdr">
        <div
          className="hdr-icon"
          style={{
            background: 'rgba(245,158,11,0.12)',
            border: '1px solid rgba(245,158,11,0.25)',
          }}
        >
          <Coins size={15} style={{ color: '#F59E0B' }} />
        </div>
        <span className="hdr-title" style={{ color: '#fff' }}>
          Gold Crystals
        </span>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            borderRadius: 8,
            background: 'rgba(245,158,11,0.06)',
            border: '1px solid rgba(245,158,11,0.15)',
          }}
        >
          <span
            style={{
              fontSize: 14,
              filter: 'drop-shadow(0 0 4px rgba(245,158,11,0.5))',
            }}
          >
            🪙
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 900,
              color: '#F59E0B',
              fontFamily: 'monospace',
            }}
          >
            {gold.toLocaleString()}
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
              background: `linear-gradient(160deg, rgba(245,158,11,0.25), rgba(245,158,11,0.08) 40%, rgba(245,158,11,0.15) 80%)`,
            }}>
              <div style={{
                clipPath: CLIP,
                background: 'linear-gradient(160deg, rgba(245,158,11,0.08), #0d0c05 60%)',
                display: 'flex', flexDirection: 'row', alignItems: 'center',
                padding: '16px 14px 16px 18px', minHeight: 120,
              }}>
                {/* Left side shimmer blocks */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div className="store-skeleton-pulse" style={{ width: 100, height: 28 }} />
                  <div className="store-skeleton-pulse" style={{ width: 140, height: 14 }} />
                  <div className="store-skeleton-pulse" style={{ width: 80, height: 10 }} />
                  <div className="store-skeleton-pulse" style={{ width: 90, height: 32, borderRadius: 16 }} />
                </div>
                {/* Right side image placeholder */}
                <div className="store-skeleton-pulse" style={{
                  width: 90, height: 90, borderRadius: '50%', flexShrink: 0,
                }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 16px' }}>
        {GOLD_PACKS.map((pack, idx) => {
          const isBuying = buyingId === pack.id;
          const isPurchased = purchaseSuccess === pack.id;
          const c = pack.catColor; // gold amber color
          const isPopular = pack.tier === 'popular';
          const shouldPulse = isPopular && isPulsing;

          return (
            <motion.div
              key={pack.id}
              ref={isPopular ? popularRef : undefined}
              initial={{ opacity: 0, x: -20 }}
              animate={shouldPulse ? {
                opacity: 1,
                x: 0,
                scale: [1, 1.04, 1, 1.04, 1, 1.04, 1],
                boxShadow: [
                  '0 0 0px rgba(245,158,11,0)',
                  '0 0 30px rgba(245,158,11,0.6)',
                  '0 0 0px rgba(245,158,11,0)',
                  '0 0 30px rgba(245,158,11,0.6)',
                  '0 0 0px rgba(245,158,11,0)',
                  '0 0 30px rgba(245,158,11,0.6)',
                  '0 0 0px rgba(245,158,11,0)',
                ],
              } : { opacity: 1, x: 0, scale: 1 }}
              transition={shouldPulse ? {
                duration: 2.4,
                ease: 'easeInOut',
              } : { delay: idx * 0.08, type: 'spring', stiffness: 300, damping: 30 }}
              style={{ borderRadius: 14 }}
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
                      background: `linear-gradient(160deg, ${c}40 0%, ${c}22 25%, #1a1508 55%, #0d0c05 100%)`,
                      position: 'relative',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: '16px 14px 16px 18px',
                      minHeight: 120,
                    }}
                  >
                    {/* ── Diagonal Shine Streaks ── */}
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
                            : 'linear-gradient(135deg, #fcd34d, #f59e0b)',
                          fontSize: 8,
                          fontWeight: 900,
                          letterSpacing: '0.1em',
                          color: '#000',
                          boxShadow: '0 2px 10px rgba(251,191,36,0.5)',
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
                          {pack.amount.toLocaleString()}
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
                          Gold
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
                                  animation: 'spin-clockwise 1s linear infinite',
                                  display: 'inline-block',
                                }}
                              >
                                ⟳
                              </span>
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
          background: 'rgba(245,158,11,0.03)',
          border: '1px solid rgba(245,158,11,0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <Coins
          size={12}
          style={{ color: 'rgba(245,158,11,0.4)', flexShrink: 0 }}
        />
        <span
          style={{
            fontSize: 9,
            color: 'rgba(255,255,255,0.3)',
            fontFamily: 'monospace',
            lineHeight: 1.4,
          }}
        >
          Gold Crystals unlock premium borders, outfits, banners, and store items.
          Charged via Google Play.
        </span>
      </div>
    </section>

      {/* ── Purchase Celebration Modal ── */}
      <PurchaseCelebrationModal
        isOpen={!!celebrationPack}
        packName={celebrationPack?.name || ''}
        amount={celebrationPack?.amount || 0}
        currency="gold"
        packImage={celebrationPack?.image || ''}
        tierColor={celebrationPack?.catColor || '#F59E0B'}
        onClose={() => setCelebrationPack(null)}
      />
    </>
  );
};

export default GoldCoinStore;
