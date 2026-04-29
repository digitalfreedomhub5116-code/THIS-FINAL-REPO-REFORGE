/**
 * Lynx AI Store — Premium Liftoff-inspired design
 * Subscription plans + cosmetic shop with glowing cards.
 */
import { useState, useEffect, type CSSProperties } from 'react';
import {
  ShoppingBag, Lock, Flame, Zap, ScanLine, Star, ShieldCheck,
  Palette, Frame, Tag, Clock, Check, Crown, BrainCircuit,
  Infinity, ChevronRight, Sparkles, ImageIcon,
} from 'lucide-react';
import Lottie from 'lottie-react';
import { ALL_STORE_ITEMS, getItemsByCategory, getTodaysDeals, type StoreItem, type StoreCategory } from '../data/storeItems';
import { getEconomy, purchaseItem, equipItem, grantFreeCredits, applyThemeVars, DEV_UNLOCK_ALL, type EquippedItems, type PlanTier, PLAN_CONFIG } from '../lib/economy';
import { LynxCoin, BorderRing, TitleBadge, ThemeSwatch } from '../components/StoreComponents';
import { syncBorderToLeaderboard } from '../lib/leaderboard';

/* ═══ Store Lottie Border Preview ═══ */
const storeLottieCache: Record<string, any> = {};

function StoreLottieBorder({ src, avatarUrl, glow }: { src: string; avatarUrl?: string; glow: string }) {
  const [data, setData] = useState<any>(storeLottieCache[src] || null);

  useEffect(() => {
    if (storeLottieCache[src]) { setData(storeLottieCache[src]); return; }
    fetch(src).then(r => r.json()).then(d => { storeLottieCache[src] = d; setData(d); }).catch(() => {});
  }, [src]);

  return (
    <div style={{ position: 'relative', width: 110, height: 110 }}>
      {/* Avatar */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        width: 72, height: 72, borderRadius: '50%',
        background: 'radial-gradient(circle, #3a3a4a, #1a1a24)',
        transform: 'translate(-50%, -50%)', zIndex: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}>
        {avatarUrl ? (
          <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
        ) : (
          <svg width="56" height="56" viewBox="0 0 40 40">
            <circle cx="20" cy="16" r="7" fill="#555568" />
            <ellipse cx="20" cy="35" rx="13" ry="10" fill="#4a4a5a" />
          </svg>
        )}
      </div>
      {/* Lottie overlay */}
      {data && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          width: 110, height: 110, borderRadius: '50%', overflow: 'hidden',
          transform: 'translate(-50%, -50%)', zIndex: 2, pointerEvents: 'none',
          mixBlendMode: 'screen',
          filter: 'brightness(1.1)',
        }}>
          <div style={{
            position: 'absolute',
            width: '100%', height: '200%',
            top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          }}>
            <Lottie animationData={data} loop autoplay style={{ width: '100%', height: '100%' }} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══ Category accent colors ═══ */
const CAT_COLORS: Record<string, string> = {
  border: '#705820',
  theme: '#8B5CF6',
  deals: '#8d702d',
  banner: '#06B6D4',
};

const CONSUMABLE_ICONS: Record<string, typeof Zap> = {
  'boost-2x': Zap,
  'boost-3x': Zap,
  'streak-shield': ShieldCheck,
  'scan-token': ScanLine,
  'spotlight': Star,
};

/* ═══ Billing types ═══ */
type BillingCycle = 'weekly' | 'monthly' | 'yearly';

const PLAN_PRICING: Record<PlanTier, Record<BillingCycle, { price: number; credits: number | 'unlimited'; label: string }>> = {
  free: {
    weekly: { price: 0, credits: 0, label: '' },
    monthly: { price: 0, credits: 200, label: 'One-time' },
    yearly: { price: 0, credits: 0, label: '' },
  },
  basic: {
    weekly: { price: 50, credits: 500, label: '/week' },
    monthly: { price: 199, credits: 1000, label: '/month' },
    yearly: { price: 999, credits: 12000, label: '/year' },
  },
  pro: {
    weekly: { price: 99, credits: 700, label: '/week' },
    monthly: { price: 349, credits: 2500, label: '/month' },
    yearly: { price: 1999, credits: 30000, label: '/year' },
  },
  ultra: {
    weekly: { price: 199, credits: 1600, label: '/week' },
    monthly: { price: 999, credits: 6000, label: '/month' },
    yearly: { price: 4999, credits: 'unlimited', label: '/year' },
  },
};

export default function Store({ user, initialShowPlans }: { user?: any; initialShowPlans?: boolean }) {
  const avatarUrl: string | undefined = user?.user_metadata?.avatar_url;
  const [economy, setEconomy] = useState(getEconomy());
  const [shopSection, setShopSection] = useState<StoreCategory | 'deals'>('deals');
  const [billing, setBilling] = useState<BillingCycle>('weekly');
  const [purchasedId, setPurchasedId] = useState<string | null>(null);
  const [dealTimer, setDealTimer] = useState('');
  const [showPlanModal, setShowPlanModal] = useState(!!initialShowPlans);
  const [infoItem, setInfoItem] = useState<StoreItem | null>(null);
  const [confettiPieces, setConfettiPieces] = useState<{x:number;y:number;vx:number;vy:number;r:number;color:string;size:number;rotation:number;rotSpeed:number;phase:number;freq:number}[]>([]);

  useEffect(() => {
    // Grant free credits on first visit
    const e = grantFreeCredits();
    setEconomy(e);
  }, []);

  // Spawn confetti when opened via navbar plan badge
  useEffect(() => {
    if (initialShowPlans) {
      // Small delay so the modal renders first
      setTimeout(() => spawnConfetti(), 200);
    }
  }, [initialShowPlans]);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const next = new Date(now);
      next.setHours(next.getHours() + 8 - (next.getHours() % 8), 0, 0, 0);
      const diff = next.getTime() - now.getTime();
      setDealTimer(`${Math.floor(diff / 3600000)}h ${String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0')}m ${String(Math.floor((diff % 60000) / 1000)).padStart(2, '0')}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // ═══ Confetti physics animation ═══
  useEffect(() => {
    if (confettiPieces.length === 0) return;
    let frame: number;
    const animate = () => {
      setConfettiPieces(prev => {
        const next = prev.map(p => ({
          ...p,
          x: p.x + p.vx + Math.sin(p.y * p.freq + p.phase) * 0.8, // unique flutter per piece
          y: p.y + p.vy,
          vy: Math.min(p.vy + 0.04, 1.8 + p.freq * 8), // slight speed variation
          vx: p.vx * 0.98,
          rotation: p.rotation + p.rotSpeed * Math.cos(p.y * p.freq * 0.7 + p.phase),
        })).filter(p => p.y < window.innerHeight + 80);
        if (next.length === 0) return [];
        return next;
      });
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [confettiPieces.length > 0]);

  const spawnConfetti = () => {
    const colors = ['#FFD700', '#C8A84E', '#F5D76E', '#E8C84A', '#B8960C', '#1a1a2e', '#2d2d44', '#111'];
    const pieces: typeof confettiPieces = [];
    for (let i = 0; i < 60; i++) {
      pieces.push({
        x: Math.random() * window.innerWidth,
        y: -30 - Math.random() * 300,
        vx: (Math.random() - 0.5) * 2.5,
        vy: Math.random() * 0.8 + 0.3,
        r: 0,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 10 + 8,
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 6,
        phase: Math.random() * Math.PI * 2, // unique phase offset
        freq: 0.01 + Math.random() * 0.03, // unique flutter frequency
      });
    }
    setConfettiPieces(pieces);
  };

  const openPlanModal = () => {
    setShowPlanModal(true);
    spawnConfetti();
  };

  const handlePurchase = (item: StoreItem) => {
    if (economy.owned.includes(item.id)) return;
    const result = purchaseItem(item.id, item.price);
    if (result) { setEconomy(result); setPurchasedId(item.id); setTimeout(() => setPurchasedId(null), 1500); }
  };

  const handleEquip = (slot: keyof EquippedItems, itemId: string) => {
    const newId = economy.equipped[slot] === itemId ? null : itemId;
    const newEco = equipItem(slot, newId);
    setEconomy(newEco);
    if (slot === 'theme') {
      const themeItem = newId ? ALL_STORE_ITEMS.find(i => i.id === newId) : null;
      applyThemeVars(themeItem?.themeVars || null);
    }
    if (slot === 'border') {
      syncBorderToLeaderboard(newId).then(() => {
        window.dispatchEvent(new Event('leaderboard:refresh'));
      }).catch(() => {});
    }
  };

  const planLabel = economy.plan === 'free' ? 'Trial' : economy.plan === 'pro' ? 'Pro' : 'Ultra';
  const planColor = economy.plan === 'free' ? '#94A3B8' : economy.plan === 'pro' ? '#C8A84E' : '#F59E0B';

  return (
    <div className="page" style={{ paddingBottom: 100 }}>
      {/* ═══ Confetti overlay ═══ */}
      {confettiPieces.length > 0 && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 9999 }}>
          {confettiPieces.map((p, i) => (
            <div key={i} style={{
              position: 'absolute', left: p.x, top: p.y,
              width: p.size, height: p.size * 0.5,
              background: p.color,
              borderRadius: 2,
              transform: `rotate(${p.rotation}deg) scaleY(${0.5 + Math.abs(Math.sin(p.rotation * 0.017)) * 0.5})`,
              opacity: 1,
              boxShadow: p.color.startsWith('#FF') || p.color.startsWith('#C8') || p.color.startsWith('#F5') || p.color.startsWith('#E8')
                ? `0 0 4px ${p.color}60` : 'none',
            }} />
          ))}
        </div>
      )}

      {/* ═══ Plan Modal ═══ */}
      {showPlanModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: '#0a0a0f', zIndex: 9998,
          display: 'flex', flexDirection: 'column', overflow: 'auto',
          animation: 'fadeIn 0.3s ease-out',
        }}>
          <div style={{ padding: '20px', maxWidth: 440, margin: '0 auto', width: '100%' }}>
            {/* Modal header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', letterSpacing: 1.5, marginBottom: 2 }}>LYNX AI</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>Choose Your Plan</div>
              </div>
              <button onClick={() => setShowPlanModal(false)} style={{
                width: 36, height: 36, borderRadius: '50%', border: 'none', cursor: 'pointer',
                background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: 18,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>✕</button>
            </div>

            {/* 15% OFF Banner */}
            <div style={{
              padding: '10px 16px', borderRadius: 10, marginBottom: 16,
              background: 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(34,197,94,0.04))',
              border: '1px solid rgba(34,197,94,0.2)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ fontSize: 18 }}>🎉</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#22C55E' }}>15% OFF — Opening Bonus!</div>
                <div style={{ fontSize: 10, color: 'rgba(34,197,94,0.7)' }}>Limited time discount on all plans</div>
              </div>
            </div>

            {/* Billing Toggle — sticky on scroll */}
            <div style={{
              position: 'sticky', top: 0, zIndex: 10,
              background: '#0a0a0f', paddingTop: 8, paddingBottom: 12, marginLeft: -20, marginRight: -20, paddingLeft: 20, paddingRight: 20,
            }}>
              <div style={{
                display: 'flex', gap: 0, borderRadius: 10, overflow: 'hidden',
                border: '1px solid rgba(200,168,78,0.15)', background: 'rgba(0,0,0,0.5)', padding: 3,
              }}>
                {(['weekly', 'monthly', 'yearly'] as BillingCycle[]).map(b => (
                  <button key={b} onClick={() => setBilling(b)} style={{
                    flex: 1, padding: '8px 0', border: 'none', cursor: 'pointer', borderRadius: 8,
                    background: billing === b ? 'rgba(200,168,78,0.2)' : 'transparent',
                    color: billing === b ? '#fff' : 'var(--text-muted)',
                    fontSize: 11, fontWeight: 700, letterSpacing: 0.3, transition: 'all 0.2s', textTransform: 'capitalize',
                  }}>
                    {b}
                    {b === 'yearly' && <span style={{ display: 'block', fontSize: 8, color: '#22C55E', fontWeight: 800, marginTop: 1 }}>SAVE 60%</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Plan Cards — Vertical stack */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 40 }}>
              <PlanCard tier="free" billing={billing} currentPlan={economy.plan} discount={0} />
              <PlanCard tier="basic" billing={billing} currentPlan={economy.plan} discount={15} />
              <PlanCard tier="pro" billing={billing} currentPlan={economy.plan} discount={15} />
              <PlanCard tier="ultra" billing={billing} currentPlan={economy.plan} discount={15} />
            </div>
          </div>
        </div>
      )}

      {/* ═══ Border Preview Modal ═══ */}
      {infoItem && infoItem.category === 'border' && (
        <BorderPreviewModal item={infoItem} avatarUrl={avatarUrl} onClose={() => setInfoItem(null)} />
      )}

      {/* ═══ Theme Preview Modal ═══ */}
      {infoItem && infoItem.category === 'theme' && (
        <ThemePreviewModal item={infoItem} onClose={() => setInfoItem(null)} />
      )}

      {/* ═══ Header ═══ */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 24, fontWeight: 800, color: '#fff' }}>Store</div>
      </div>

      {/* ═══ Upgrade Banner ═══ */}
      {economy.plan === 'free' && (
        <button onClick={openPlanModal} style={{
          width: '100%', border: 'none', cursor: 'pointer', borderRadius: 14, marginBottom: 24,
          position: 'relative', overflow: 'hidden', textAlign: 'left',
          padding: 0, background: 'transparent',
        }}>
          <div style={{
            position: 'relative', overflow: 'hidden', borderRadius: 14,
            border: '1.5px solid rgba(200,168,78,0.25)',
          }}>
            {/* Background image */}
            <img src="/upgrade-banner.png" alt="" style={{
              width: '100%', height: 100, objectFit: 'cover', display: 'block',
              filter: 'brightness(0.6)',
            }} />
            {/* Content overlay */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              background: 'linear-gradient(90deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)',
              display: 'flex', alignItems: 'center', padding: '0 20px',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Crown size={16} color="#C8A84E" />
                  <span style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>Upgrade to Pro</span>
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>
                  Unlock unlimited scans, AI chat & premium cosmetics
                </div>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '6px 14px', borderRadius: 20,
                background: 'linear-gradient(135deg, #C8A84E, #A08030)',
                boxShadow: '0 0 12px rgba(200,168,78,0.3)',
              }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#000' }}>15% OFF</span>
                <ChevronRight size={14} color="#000" />
              </div>
            </div>
          </div>
        </button>
      )}

      {/* ═══ Category Pills ═══ */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 20, margin: '0 -20px', padding: '0 20px 8px' }}>
        {([
          { id: 'deals' as const, label: 'Deals', icon: Clock },
          { id: 'border' as const, label: 'Borders', icon: Frame },
          { id: 'theme' as const, label: 'Themes', icon: Palette },
          { id: 'banner' as const, label: 'Banners', icon: ImageIcon },
        ]).map(s => {
          const isActive = shopSection === s.id;
          const color = CAT_COLORS[s.id] || '#C8A84E';
          return (
            <button key={s.id} onClick={() => setShopSection(s.id)} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '8px 14px', borderRadius: 10,
              background: isActive ? `${color}18` : 'var(--surface)',
              color: isActive ? color : 'var(--text-muted)',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              border: isActive ? `1.5px solid ${color}40` : '1.5px solid transparent',
              transition: 'all 0.2s', whiteSpace: 'nowrap',
            }}>
              <s.icon size={14} />
              {s.label}
            </button>
          );
        })}
      </div>

      {/* ═══ Deals Section ═══ */}
      {shopSection === 'deals' && (
        <>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '8px 0', marginBottom: 16, borderRadius: 8,
            background: 'rgba(200,168,78,0.06)', border: '1px solid rgba(200,168,78,0.1)',
          }}>
            <Clock size={13} color="var(--primary)" />
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>Refreshes in <span style={{ color: 'var(--primary)' }}>{dealTimer}</span></span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {getTodaysDeals().map(d => (
              <GlowCard key={d.item.id} item={d.item} discount={d.discount}
                owned={DEV_UNLOCK_ALL || economy.owned.includes(d.item.id)}
                equipped={economy.equipped[d.item.category as keyof EquippedItems] === d.item.id}
                canAfford={DEV_UNLOCK_ALL || economy.coins >= Math.round(d.item.price * (1 - d.discount / 100))}
                onBuy={() => { const p = purchaseItem(d.item.id, Math.round(d.item.price * (1 - d.discount / 100))); if (p) { setEconomy(p); setPurchasedId(d.item.id); setTimeout(() => setPurchasedId(null), 1500); } }}
                onEquip={d.item.category !== 'consumable' ? () => handleEquip(d.item.category as keyof EquippedItems, d.item.id) : undefined}
                onInfo={() => setInfoItem(d.item)}
                avatarUrl={avatarUrl}
              />
            ))}
          </div>
        </>
      )}

      {/* ═══ Category Items (non-banner) ═══ */}
      {shopSection !== 'deals' && shopSection !== 'banner' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {getItemsByCategory(shopSection).map(item => (
            <GlowCard key={item.id} item={item}
              owned={DEV_UNLOCK_ALL || economy.owned.includes(item.id)}
              equipped={economy.equipped[shopSection === 'consumable' ? 'border' : shopSection as keyof EquippedItems] === item.id}
              canAfford={DEV_UNLOCK_ALL || economy.coins >= item.price}
              onBuy={() => handlePurchase(item)}
              onEquip={item.category !== 'consumable' ? () => handleEquip(item.category as keyof EquippedItems, item.id) : undefined}
              onInfo={() => setInfoItem(item)}
              avatarUrl={avatarUrl}
            />
          ))}
        </div>
      )}

      {/* ═══ Banner Cards — image-only with equip button ═══ */}
      {shopSection === 'banner' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {getItemsByCategory('banner').map(item => {
            const isEquipped = economy.equipped.banner === item.id;
            return (
              <div key={item.id} style={{ position: 'relative', borderRadius: '16px 16px 24px 24px', overflow: 'hidden' }}>
                {/* Banner image */}
                {item.bannerImage && (
                  <img src={item.bannerImage} alt={item.name} style={{
                    width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block',
                  }} />
                )}
                {/* Bottom gradient overlay */}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%',
                  background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
                  pointerEvents: 'none',
                }} />
                {/* Name + Equip button */}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>{item.name}</div>
                    {item.price > 0 && (
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{item.price} LC</div>
                    )}
                  </div>
                  <button
                    onClick={() => handleEquip('banner', item.id)}
                    style={{
                      padding: '8px 20px', borderRadius: 12, border: 'none', cursor: 'pointer',
                      fontSize: 12, fontWeight: 800, letterSpacing: 0.5,
                      background: isEquipped
                        ? 'rgba(255,255,255,0.1)'
                        : 'linear-gradient(135deg, #06B6D4, #0891B2)',
                      color: isEquipped ? 'rgba(255,255,255,0.5)' : '#fff',
                      transition: 'all 0.2s',
                    }}
                  >
                    {isEquipped ? '✓ EQUIPPED' : 'EQUIP'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PlanCard({ tier, billing, currentPlan, discount = 0 }: { tier: PlanTier; billing: BillingCycle; currentPlan: PlanTier; discount?: number }) {
  const info = PLAN_PRICING[tier][billing];
  const discountedPrice = discount > 0 ? Math.round(info.price * (1 - discount / 100)) : info.price;
  const config = PLAN_CONFIG[tier];
  const isActive = tier === currentPlan;
  const isFree = tier === 'free';
  const isBasic = tier === 'basic';
  const isPro = tier === 'pro';
  const isUltra = tier === 'ultra';

  // Per-credit cost
  const perCredit = info.credits !== 'unlimited' && info.credits > 0 && info.price > 0
    ? `₹${(discountedPrice / info.credits).toFixed(2)}/credit` : '';

  // Color theme per tier
  const tierColor = isFree ? '#94A3B8' : isBasic ? '#22C55E' : isPro ? '#8B5CF6' : '#F59E0B';

  // Features per tier
  const features: string[] = [];
  if (isFree) {
    features.push(
      '200 AI credits (one-time)',
      `${config.scanCost} credits/scan`,
      `${config.chatCost} credits/chat`,
      'Basic face analysis',
      'Default theme only',
      'Community leaderboard',
    );
  } else if (isBasic) {
    const cr = info.credits.toLocaleString();
    features.push(
      `${cr} credits${info.label}`,
      `${config.scanCost} credits/scan`,
      `${config.chatCost} credits/chat`,
      'Detailed face analysis',
      'Color themes unlocked',
      '1.5× coin earning',
      'Basic skin remedies',
      'Exercise programs',
    );
  } else if (isPro) {
    const cr = info.credits === 'unlimited' ? 'Unlimited' : info.credits.toLocaleString();
    features.push(
      `${cr} credits${info.label}`,
      `${config.scanCost} credits/scan (save 25%)`,
      `${config.chatCost} credits/chat (save 80%)`,
      'All Color + Special themes',
      'Elemental borders',
      '2× coin earning',
      'Advanced AI suggestions',
      'Priority support',
      'Streak shield (1/month)',
    );
  } else {
    const cr = info.credits === 'unlimited' ? 'Unlimited' : info.credits.toLocaleString();
    features.push(
      `${cr} credits${info.label}`,
      `${config.scanCost} credits/scan (save 50%)`,
      `${config.chatCost} credit/chat`,
      'ALL themes & borders',
      '3× coin earning',
      '2 free Streak Shields/month',
      'Unlimited AI chat',
      'Exclusive Ultra badge',
      'Early access to features',
      'Premium AI analysis',
    );
  }

  const borderRadius = 16;

  return (
    <div style={{
      position: 'relative',
      animation: isUltra ? 'plan-pulse 3s ease-in-out infinite' : 'none',
    }}>
      {/* BEST VALUE badge */}
      {isUltra && (
        <div style={{
          position: 'absolute', top: 12, right: 12, zIndex: 10,
          padding: '4px 10px', borderRadius: 6,
          background: `linear-gradient(135deg, ${tierColor}, #FBBF24)`,
          fontSize: 9, fontWeight: 900, color: '#000', letterSpacing: 1,
          boxShadow: `0 2px 8px ${tierColor}40`,
        }}>BEST VALUE</div>
      )}

      {/* Card */}
      <div style={{
        borderRadius,
        border: `1.5px solid ${tierColor}35`,
        background: isFree
          ? 'linear-gradient(160deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))'
          : `linear-gradient(160deg, ${tierColor}10, ${tierColor}04)`,
        padding: '20px 16px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Top accent line */}
        <div style={{
          position: 'absolute', top: 0, left: 20, right: 20, height: 2,
          background: `linear-gradient(90deg, transparent, ${tierColor}, transparent)`,
          borderRadius: '0 0 4px 4px',
        }} />

        {/* Tier name + icon */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          {isUltra ? <Crown size={20} color={tierColor} /> : isPro ? <Star size={18} color={tierColor} /> : isBasic ? <Zap size={18} color={tierColor} /> : null}
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: 1 }}>
              {isFree ? 'TRIAL' : tier}
            </div>
            {isActive && (
              <div style={{ fontSize: 9, fontWeight: 700, color: '#22C55E', letterSpacing: 0.5 }}>CURRENT PLAN</div>
            )}
          </div>
        </div>

        {/* Price */}
        <div style={{ marginBottom: 14 }}>
          {isFree ? (
            <div style={{ fontSize: 28, fontWeight: 900, color: '#fff' }}>Free</div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                {discount > 0 && <span style={{ fontSize: 14, color: 'var(--text-muted)', textDecoration: 'line-through' }}>₹{info.price}</span>}
                <span style={{ fontSize: 28, fontWeight: 900, color: '#fff' }}>₹{discountedPrice}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{info.label}</span>
              </div>
              {perCredit && (
                <div style={{ fontSize: 10, color: tierColor, fontWeight: 700, marginTop: 2 }}>{perCredit}</div>
              )}
            </>
          )}
        </div>

        {/* Credits badge */}
        {(info.credits === 'unlimited' || (typeof info.credits === 'number' && info.credits > 0)) && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', marginBottom: 14,
            background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.12)',
            borderRadius: 8,
          }}>
            <BrainCircuit size={14} color="#06B6D4" />
            <span style={{ fontSize: 12, fontWeight: 800, color: '#06B6D4' }}>
              {info.credits === 'unlimited' ? '∞' : info.credits.toLocaleString()} credits
            </span>
          </div>
        )}

        {/* Features */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 16 }}>
          {features.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
              <Check size={12} color={isFree ? 'var(--text-muted)' : tierColor} strokeWidth={3} style={{ marginTop: 2, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: isFree ? 'var(--text-muted)' : 'rgba(255,255,255,0.8)', fontWeight: 500, lineHeight: 1.3 }}>{f}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        {!isActive && !isFree && (
          <button style={{
            width: '100%', padding: '11px 0', border: 'none', cursor: 'pointer',
            borderRadius: 10,
            background: `linear-gradient(135deg, ${tierColor}, ${tierColor}CC)`,
            color: isUltra ? '#000' : '#fff',
            fontSize: 12, fontWeight: 800, letterSpacing: 0.5,
            boxShadow: `0 0 16px ${tierColor}30`,
            transition: 'all 0.2s',
          }}>
            {isUltra ? 'UPGRADE TO ULTRA' : isPro ? 'UPGRADE TO PRO' : 'GET BASIC'}
          </button>
        )}
        {isActive && !isFree && (
          <div style={{
            textAlign: 'center', padding: '10px 0', fontSize: 12, fontWeight: 700,
            color: '#22C55E', letterSpacing: 0.5,
          }}>
            ✓ Active
          </div>
        )}
      </div>
    </div>
  );
}


/* ═══════════════════════════════════
   Glow Card — Liftoff-matching premium card
   ═══════════════════════════════════ */
function GlowCard({ item, discount, owned, equipped, canAfford, onBuy, onEquip, onInfo, avatarUrl }: {
  item: StoreItem; discount?: number; owned?: boolean; equipped?: boolean;
  canAfford: boolean; onBuy: () => void; onEquip?: () => void; onInfo?: () => void;
  avatarUrl?: string;
}) {
  const catColor = CAT_COLORS[item.category] || '#C8A84E';
  const finalPrice = discount ? Math.round(item.price * (1 - discount / 100)) : item.price;

  const chipSize = 14;
  const clipPath = `polygon(
    0 0,
    calc(100% - ${chipSize}px) 0,
    100% ${chipSize}px,
    100% 100%,
    ${chipSize}px 100%,
    0 calc(100% - ${chipSize}px)
  )`;

  return (
    /* Glow wrapper */
    <div style={{
      filter: `drop-shadow(0 0 12px ${catColor}40) drop-shadow(0 4px 16px rgba(0,0,0,0.6))`,
    }}>
      {/* Thick gradient border — 3px visible */}
      <div style={{
        clipPath,
        padding: 3,
        background: `linear-gradient(160deg, ${catColor}CC, ${catColor}50 40%, ${catColor}90 80%, ${catColor}CC)`,
      }}>
        {/* Inner card — RICH colored background like Liftoff */}
        <div style={{
          clipPath,
          background: `linear-gradient(160deg, ${catColor}40 0%, ${catColor}22 25%, #111828 55%, #0d1118 100%)`,
          position: 'relative',
          textAlign: 'center',
          padding: '16px 10px 14px',
          minHeight: 210,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}>

          {/* ─── PROMINENT Diagonal Shine Streaks ─── */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            pointerEvents: 'none', zIndex: 1, overflow: 'hidden',
          }}>
            {/* Primary thick shine */}
            <div style={{
              position: 'absolute', top: '-80%', left: '-25%',
              width: '55%', height: '260%',
              background: 'linear-gradient(72deg, transparent 36%, rgba(255,255,255,0.06) 42%, rgba(255,255,255,0.14) 46%, rgba(255,255,255,0.22) 48%, rgba(255,255,255,0.14) 50%, rgba(255,255,255,0.06) 54%, transparent 60%)',
              transform: 'rotate(25deg)',
            }} />
            {/* Secondary shine */}
            <div style={{
              position: 'absolute', top: '-80%', left: '12%',
              width: '40%', height: '260%',
              background: 'linear-gradient(72deg, transparent 40%, rgba(255,255,255,0.04) 44%, rgba(255,255,255,0.12) 47%, rgba(255,255,255,0.18) 49%, rgba(255,255,255,0.12) 51%, rgba(255,255,255,0.04) 54%, transparent 58%)',
              transform: 'rotate(25deg)',
            }} />
            {/* Tertiary thin */}
            <div style={{
              position: 'absolute', top: '-80%', left: '42%',
              width: '28%', height: '260%',
              background: 'linear-gradient(72deg, transparent 44%, rgba(255,255,255,0.03) 47%, rgba(255,255,255,0.08) 49%, rgba(255,255,255,0.03) 51%, transparent 54%)',
              transform: 'rotate(25deg)',
            }} />
          </div>

          {/* ─── Top edge glow line ─── */}
          <div style={{
            position: 'absolute', top: 0, left: chipSize, right: chipSize, height: 1.5,
            background: `linear-gradient(90deg, transparent, ${catColor}BB, transparent)`,
            zIndex: 2,
          }} />

          {/* ─── Discount badge (top-left) ─── */}
          {discount && (
            <div style={{
              position: 'absolute', top: 8, left: 8, zIndex: 3,
              padding: '3px 8px', borderRadius: 6,
              background: '#22C55E', fontSize: 9, fontWeight: 900, color: '#000',
              boxShadow: '0 0 10px rgba(34,197,94,0.5)',
            }}>
              -{discount}%
            </div>
          )}

          {/* ─── Info badge (top-right) like Liftoff ─── */}
          <div onClick={(e) => { e.stopPropagation(); onInfo?.(); }} style={{
            position: 'absolute', top: 8, right: 8, zIndex: 3,
            width: 22, height: 22, borderRadius: 6,
            background: `${catColor}30`, border: `1px solid ${catColor}50`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 900, color: catColor,
            cursor: 'pointer',
          }}>
            i
          </div>

          {/* ─── Name & Category (CENTERED, large bold) ─── */}
          <div style={{ position: 'relative', zIndex: 2, marginBottom: 10, marginTop: discount ? 18 : 0 }}>
            <div style={{
              fontSize: 15, fontWeight: 900, color: '#fff',
              lineHeight: 1.2, marginBottom: 3,
              textShadow: '0 2px 8px rgba(0,0,0,0.5)',
            }}>
              {item.name}
            </div>
            <div style={{
              fontSize: 11, fontWeight: 600, color: catColor,
              textTransform: 'capitalize', opacity: 0.9,
            }}>
              {item.tier} {item.category}
            </div>
          </div>

          {/* ─── Preview area (MUCH LARGER — 50% of card) ─── */}
          <div style={{
            flex: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative', zIndex: 2, width: '100%', minHeight: 110,
            overflow: 'visible',
          }}>
            {/* Radial glow behind preview */}
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              width: 110, height: 110, borderRadius: '50%',
              background: `radial-gradient(circle, ${catColor}25 0%, ${catColor}08 50%, transparent 70%)`,
              transform: 'translate(-50%, -50%)',
            }} />

            {item.category === 'border' && item.imageBorder ? (
              <div style={{ position: 'relative', width: 100, height: 100, overflow: 'visible' }}>
                <div style={{
                  position: 'absolute', top: '50%', left: '50%',
                  width: 64, height: 64, borderRadius: '50%',
                  background: 'radial-gradient(circle, #3a3a4a, #1a1a24)',
                  transform: 'translate(-50%, -50%)', zIndex: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden',
                }}>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                  ) : (
                    <svg width="46" height="46" viewBox="0 0 40 40">
                      <circle cx="20" cy="16" r="7" fill="#555568" />
                      <ellipse cx="20" cy="35" rx="13" ry="10" fill="#4a4a5a" />
                    </svg>
                  )}
                </div>
                {item.imageAnimated && item.imageAnimationType === 'pulse' ? (
                  <div style={{
                    position: 'absolute', top: '50%', left: '50%',
                    width: `${(item.imageScale || 1) * 100}%`,
                    height: `${(item.imageScale || 1) * 100}%`,
                    zIndex: 2, pointerEvents: 'none',
                    animation: 'border-breathe-centered 3s ease-in-out infinite',
                  }}>
                    <img src={item.imageBorder} alt={item.name} style={{
                      width: '100%', height: '100%', objectFit: 'contain',
                    }} />
                  </div>
                ) : (
                  <img src={item.imageBorder} alt={item.name} style={{
                    position: 'absolute', top: '50%', left: '50%',
                    width: `${(item.imageScale || 1) * 100}%`,
                    height: `${(item.imageScale || 1) * 100}%`,
                    transform: `translate(-50%, calc(-50% + ${item.imageOffsetY || 0}px))`,
                    objectFit: 'contain', zIndex: 2, pointerEvents: 'none',
                    ...(item.imageAnimated ? { animation: 'spin-clockwise 10s linear infinite' } : {}),
                  }} />
                )}
              </div>
            ) : item.category === 'border' && item.auraConfig ? (
              /* CSS Aura Glow Border — vivid neon plasma */
              <div style={{ position: 'relative', width: 110, height: 110, overflow: 'visible' }}>
                {/* Ambient radial glow behind everything */}
                <div style={{
                  position: 'absolute', top: '50%', left: '50%',
                  width: 120, height: 120, borderRadius: '50%',
                  background: `radial-gradient(circle, ${item.auraConfig.colors[0]}30 0%, ${item.auraConfig.colors[1]}15 40%, transparent 70%)`,
                  transform: 'translate(-50%, -50%)',
                  animation: item.auraConfig.animated ? `pulse-glow ${item.auraConfig.pulseSpeed || 3}s ease-in-out infinite` : undefined,
                }} />
                {/* Main aura ring — stacked box-shadows for vivid neon */}
                <div style={{
                  position: 'absolute', top: '50%', left: '50%',
                  width: 82, height: 82, borderRadius: '50%',
                  transform: 'translate(-50%, -50%)',
                  border: `3px solid ${item.auraConfig.colors[0]}CC`,
                  boxShadow: [
                    `0 0 6px 2px ${item.auraConfig.colors[0]}AA`,
                    `0 0 14px 4px ${item.auraConfig.colors[0]}70`,
                    `0 0 24px 6px ${item.auraConfig.colors[1]}50`,
                    `0 0 40px 10px ${item.auraConfig.colors[2] || item.auraConfig.colors[0]}35`,
                    `0 0 60px 14px ${item.auraConfig.colors[3] || item.auraConfig.colors[1]}20`,
                    `inset 0 0 10px 3px ${item.auraConfig.colors[0]}40`,
                    `inset 0 0 20px 6px ${item.auraConfig.colors[1]}25`,
                  ].join(', '),
                  animation: item.auraConfig.animated
                    ? `aura-rotate 8s linear infinite`
                    : undefined,
                  zIndex: 1,
                }} />
                {/* Secondary outer glow ring */}
                <div style={{
                  position: 'absolute', top: '50%', left: '50%',
                  width: 90, height: 90, borderRadius: '50%',
                  transform: 'translate(-50%, -50%)',
                  border: `1.5px solid ${item.auraConfig.colors[1]}50`,
                  boxShadow: `0 0 12px 3px ${item.auraConfig.colors[1]}40, 0 0 30px 8px ${item.auraConfig.colors[2] || item.auraConfig.colors[0]}20`,
                  animation: item.auraConfig.animated
                    ? `pulse-glow ${(item.auraConfig.pulseSpeed || 3)}s ease-in-out infinite`
                    : undefined,
                  zIndex: 1,
                }} />
                {/* Pfp in center */}
                <div style={{
                  position: 'absolute', top: '50%', left: '50%',
                  width: 72, height: 72, borderRadius: '50%',
                  background: 'radial-gradient(circle, #2a2a3a, #1a1a24)',
                  transform: 'translate(-50%, -50%)', zIndex: 3,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden',
                  boxShadow: `0 0 8px ${item.auraConfig.colors[0]}80, inset 0 0 6px ${item.auraConfig.colors[0]}30`,
                }}>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                  ) : (
                    <svg width="56" height="56" viewBox="0 0 40 40">
                      <circle cx="20" cy="16" r="7" fill="#555568" />
                      <ellipse cx="20" cy="35" rx="13" ry="10" fill="#4a4a5a" />
                    </svg>
                  )}
                </div>
              </div>
            ) : item.category === 'border' && item.lottieBorder ? (
              <StoreLottieBorder src={item.lottieBorder} avatarUrl={avatarUrl} glow={item.borderConfig?.glowColor || 'rgba(200,168,78,0.3)'} />
            ) : item.category === 'border' && item.borderConfig ? (
              <BorderRing config={item.borderConfig} size={90} profileUrl={avatarUrl} />
            ) : null}
            {item.category === 'theme' && item.themeVars && (
              <div style={{ width: '90%' }}><ThemeSwatch themeVars={item.themeVars} /></div>
            )}
            {item.category === 'banner' && item.bannerImage && (
              <div style={{
                width: '90%', aspectRatio: '16/9', borderRadius: 10, overflow: 'hidden',
                border: `1px solid ${catColor}30`,
                boxShadow: `0 0 12px ${catColor}20`,
              }}>
                <img src={item.bannerImage} alt={item.name} style={{
                  width: '100%', height: '100%', objectFit: 'cover',
                }} />
              </div>
            )}
            {item.category === 'title' && item.titleConfig && <TitleBadge name={item.name} config={item.titleConfig} />}
            {item.category === 'consumable' && (() => {
              const I = CONSUMABLE_ICONS[item.id] || Zap;
              return (
                <div style={{
                  width: 60, height: 60, borderRadius: 16,
                  background: `radial-gradient(circle, ${catColor}25 0%, transparent 70%)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <I size={30} color={catColor} />
                </div>
              );
            })()}
            {item.rankRequired && (
              <div style={{
                position: 'absolute', top: 0, right: 4, padding: '2px 7px',
                background: 'rgba(0,0,0,0.85)', fontSize: 8, fontWeight: 700, color: '#F59E0B',
                border: '1px solid rgba(245,158,11,0.3)', borderRadius: 4,
              }}>
                {item.rankRequired}
              </div>
            )}
          </div>

          {/* ─── Bottom: Styled Price Badge (Liftoff-style) ─── */}
          <div style={{ position: 'relative', zIndex: 2, marginTop: 10, width: '100%' }}>
            {owned ? (
              onEquip ? (
                <button onClick={onEquip} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '8px 24px', border: 'none', cursor: 'pointer',
                  borderRadius: 20,
                  background: equipped
                    ? `linear-gradient(135deg, ${catColor}, ${catColor}CC)`
                    : `rgba(255,255,255,0.08)`,
                  color: equipped ? '#000' : catColor,
                  fontSize: 11, fontWeight: 800, letterSpacing: 0.5,
                  boxShadow: equipped ? `0 0 14px ${catColor}50` : 'none',
                }}>
                  {equipped ? '✓ EQUIPPED' : 'EQUIP'}
                </button>
              ) : (
                <span style={{ fontSize: 11, fontWeight: 700, color: '#22C55E' }}>✓ Owned</span>
              )
            ) : (
              <button onClick={onBuy} disabled={!canAfford} style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '8px 22px', borderRadius: 20, cursor: canAfford ? 'pointer' : 'default',
                background: canAfford
                  ? `linear-gradient(135deg, ${catColor}35, ${catColor}15)`
                  : 'rgba(255,255,255,0.04)',
                border: canAfford ? `2px solid ${catColor}60` : '2px solid rgba(255,255,255,0.08)',
                color: canAfford ? '#fff' : 'var(--text-muted)',
                fontSize: 13, fontWeight: 800,
                boxShadow: canAfford ? `0 0 12px ${catColor}25` : 'none',
                transition: 'all 0.2s',
              }}>
                {discount && <span style={{ textDecoration: 'line-through', opacity: 0.35, fontSize: 10 }}>{item.price}</span>}
                {canAfford ? <LynxCoin size={15} /> : <Lock size={12} />}
                <span style={{ fontSize: 14 }}>{finalPrice}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════
   Border Preview Modal — big avatar with border
   ═══════════════════════════════════ */
function BorderPreviewModal({ item, avatarUrl, onClose }: { item: StoreItem; avatarUrl?: string; onClose: () => void }) {
  const [lottieData, setLottieData] = useState<any>(null);
  const glow = item.borderConfig?.glowColor || 'rgba(200,168,78,0.4)';
  const size = 220;

  useEffect(() => {
    if (item.lottieBorder) {
      fetch(item.lottieBorder).then(r => r.json()).then(setLottieData).catch(() => {});
    }
  }, [item.lottieBorder]);

  return (
    <div onClick={onClose} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.92)', zIndex: 9999,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      animation: 'fadeIn 0.25s ease-out',
      backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
    }}>
      <div onClick={e => e.stopPropagation()} style={{ textAlign: 'center', maxWidth: 300, width: '80%' }}>
        {/* Title */}
        <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 4 }}>{item.name}</div>
        <div style={{
          fontSize: 12, fontWeight: 700, textTransform: 'capitalize', marginBottom: 24,
          color: item.borderConfig?.colors?.[0] || '#C8A84E', opacity: 0.8,
        }}>
          {item.tier} Border
        </div>

        {/* Big avatar with border */}
        <div style={{ position: 'relative', width: size, height: size, margin: '0 auto', overflow: 'visible' }}>
          {/* Ambient glow */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            width: size + 60, height: size + 60, borderRadius: '50%',
            background: `radial-gradient(circle, ${glow} 0%, transparent 70%)`,
            transform: 'translate(-50%, -50%)',
          }} />

          {/* Avatar circle */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            width: size * 0.65, height: size * 0.65, borderRadius: '50%',
            background: 'radial-gradient(circle, #3a3a4a, #1a1a24)',
            transform: 'translate(-50%, -50%)', zIndex: 1,
            overflow: 'hidden',
          }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="80" height="80" viewBox="0 0 40 40">
                  <circle cx="20" cy="16" r="7" fill="#555568" />
                  <ellipse cx="20" cy="35" rx="13" ry="10" fill="#4a4a5a" />
                </svg>
              </div>
            )}
          </div>

          {/* Image border overlay */}
          {item.imageBorder && (
            item.imageAnimated && item.imageAnimationType === 'pulse' ? (
              <div style={{
                position: 'absolute', top: '50%', left: '50%',
                width: `${(item.imageScale || 1) * 100}%`,
                height: `${(item.imageScale || 1) * 100}%`,
                zIndex: 2, pointerEvents: 'none',
                animation: 'border-breathe-centered 3s ease-in-out infinite',
              }}>
                <img src={item.imageBorder} alt="" style={{
                  width: '100%', height: '100%', objectFit: 'contain',
                  filter: `drop-shadow(0 0 10px ${glow})`,
                }} />
              </div>
            ) : (
              <img src={item.imageBorder} alt="" style={{
                position: 'absolute', top: '50%', left: '50%',
                width: `${(item.imageScale || 1) * 100}%`,
                height: `${(item.imageScale || 1) * 100}%`,
                transform: `translate(-50%, calc(-50% + ${item.imageOffsetY || 0}px))`,
                objectFit: 'contain', zIndex: 2, pointerEvents: 'none',
                animation: item.imageAnimated ? 'spin-clockwise 10s linear infinite' : 'none',
                filter: `drop-shadow(0 0 10px ${glow})`,
              }} />
            )
          )}

          {/* Lottie border overlay */}
          {item.lottieBorder && lottieData && (
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              width: size + 10, height: size + 10, borderRadius: '50%', overflow: 'hidden',
              transform: 'translate(-50%, -50%)', zIndex: 2, pointerEvents: 'none',
              mixBlendMode: 'screen', filter: 'brightness(1.1)',
            }}>
              <div style={{
                position: 'absolute', width: '100%', height: '200%',
                top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              }}>
                <Lottie animationData={lottieData} loop autoplay style={{ width: '100%', height: '100%' }} />
              </div>
            </div>
          )}

          {/* Aura border */}
          {item.auraConfig && (
            <>
              <div style={{
                position: 'absolute', top: '50%', left: '50%',
                width: size * 0.75, height: size * 0.75, borderRadius: '50%',
                transform: 'translate(-50%, -50%)',
                border: `3px solid ${item.auraConfig.colors[0]}CC`,
                boxShadow: [
                  `0 0 10px 4px ${item.auraConfig.colors[0]}AA`,
                  `0 0 20px 8px ${item.auraConfig.colors[0]}70`,
                  `0 0 40px 12px ${item.auraConfig.colors[1]}50`,
                ].join(', '),
                animation: item.auraConfig.animated ? 'aura-rotate 8s linear infinite' : undefined,
                zIndex: 2,
              }} />
            </>
          )}
        </div>

        {/* Description */}
        <div style={{
          fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 28,
          maxWidth: 260, margin: '28px auto 0', lineHeight: 1.4,
        }}>
          {item.description}
        </div>

        {/* Close button */}
        <button onClick={onClose} style={{
          marginTop: 32, padding: '10px 36px', borderRadius: 12,
          background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
          color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
          transition: 'all 0.2s',
        }}>
          Close
        </button>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════
   Theme Preview Modal — Home & Workout mockups
   ═══════════════════════════════════ */
function ThemePreviewModal({ item, onClose }: { item: StoreItem; onClose: () => void }) {
  const tv = item.themeVars;
  if (!tv) return null;

  const primary = tv['--primary'] || '#C8A84E';
  const surface = tv['--surface'] || '#12141a';
  const bg = tv['--bg'] || '#0a0a0f';
  const border = tv['--border'] || 'rgba(200,168,78,0.08)';

  const mockCardStyle: CSSProperties = {
    background: surface,
    borderRadius: 12,
    padding: '12px 14px',
    border: `1px solid ${border}`,
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.92)', zIndex: 9999,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      overflow: 'auto', paddingTop: 40, paddingBottom: 60,
      animation: 'fadeIn 0.25s ease-out',
      backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
    }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '90%', maxWidth: 360 }}>
        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#fff' }}>{item.name}</div>
          <div style={{ fontSize: 12, color: primary, fontWeight: 700, opacity: 0.8, marginTop: 2 }}>
            {item.tier} Theme Preview
          </div>
        </div>

        {/* HOME PAGE mockup */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: primary, letterSpacing: 1.5, marginBottom: 8 }}>HOME</div>
          <div style={{
            background: bg, borderRadius: 16, padding: 16,
            border: `1px solid ${border}`, overflow: 'hidden',
          }}>
            {/* Score circle mockup */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                border: `3px solid ${primary}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 0 12px ${primary}40`,
              }}>
                <span style={{ fontSize: 18, fontWeight: 900, color: '#fff' }}>82</span>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>Overall Score</div>
                <div style={{ fontSize: 10, color: primary, fontWeight: 600 }}>Top 15% — Above Average</div>
              </div>
            </div>

            {/* Feature scores */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {['Jawline', 'Skin', 'Eyes'].map((label, i) => (
                <div key={label} style={mockCardStyle}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: primary }}>{[78, 85, 90][i]}</div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: 700, marginTop: 2 }}>{label.toUpperCase()}</div>
                </div>
              ))}
            </div>

            {/* Streak bar */}
            <div style={{
              marginTop: 12, background: surface, borderRadius: 10, padding: '10px 14px',
              border: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <Flame size={16} color={primary} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#fff' }}>7 Day Streak</div>
                <div style={{
                  height: 4, borderRadius: 2, marginTop: 4,
                  background: `linear-gradient(90deg, ${primary}, ${primary}60)`,
                  width: '70%',
                }} />
              </div>
            </div>
          </div>
        </div>

        {/* WORKOUT PAGE mockup */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, color: primary, letterSpacing: 1.5, marginBottom: 8 }}>WORKOUT</div>
          <div style={{
            background: bg, borderRadius: 16, padding: 16,
            border: `1px solid ${border}`, overflow: 'hidden',
          }}>
            {/* Exercise cards */}
            {['Mewing Exercise', 'Jaw Flex Routine', 'Neck Posture'].map((name, i) => (
              <div key={name} style={{
                ...mockCardStyle,
                marginBottom: i < 2 ? 8 : 0,
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: `${primary}20`, border: `1px solid ${primary}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Zap size={16} color={primary} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#fff' }}>{name}</div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>{[3, 5, 4][i]} min · Level {[2, 3, 1][i]}</div>
                </div>
                <div style={{
                  padding: '4px 10px', borderRadius: 6,
                  background: `${primary}20`, border: `1px solid ${primary}30`,
                  fontSize: 9, fontWeight: 800, color: primary,
                }}>
                  START
                </div>
              </div>
            ))}

            {/* Progress bar */}
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, height: 6, borderRadius: 3, background: surface }}>
                <div style={{
                  width: '45%', height: '100%', borderRadius: 3,
                  background: `linear-gradient(90deg, ${primary}, ${primary}CC)`,
                  boxShadow: `0 0 8px ${primary}50`,
                }} />
              </div>
              <span style={{ fontSize: 10, fontWeight: 800, color: primary }}>45%</span>
            </div>
          </div>
        </div>

        {/* Close button */}
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <button onClick={onClose} style={{
            padding: '10px 36px', borderRadius: 12,
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
            color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            transition: 'all 0.2s',
          }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

