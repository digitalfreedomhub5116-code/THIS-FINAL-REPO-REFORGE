import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, Target, MessageCircle, UtensilsCrossed, Shield, Crown, Sparkles, Check, Loader2, RotateCcw, Camera } from 'lucide-react';
import type { PurchasesOfferings, PurchasesPackage } from '@revenuecat/purchases-capacitor';
import { triggerHaptic } from '../utils/soundEngine';

interface ManaPowerScreenProps {
  onClose: () => void;
  offerings: PurchasesOfferings | null;
  isPurchasing: boolean;
  onPurchase: (pkg: PurchasesPackage) => Promise<{ success: boolean }>;
  onRestore: () => Promise<void>;
  error: string | null;
}

const PERKS = [
  { icon: Camera, label: 'AI Motion Coach', desc: 'Real-time form correction with camera tracking', color: '#f97316' },
  { icon: Target, label: 'AI Goal Autopilot', desc: 'Auto-generated daily quests for your goals', color: '#00d4ff' },
  { icon: MessageCircle, label: 'Unlimited Dusk Guidance', desc: 'Chat with your AI mentor without limits', color: '#a78bfa' },
  { icon: Zap, label: '5 Keys Every Day', desc: 'Daily keys for Nutrition Scan & Schedule', color: '#facc15' },
  { icon: UtensilsCrossed, label: 'AI Nutrition Intel', desc: 'Scan meals with AI-powered analysis', color: '#4ade80' },
  { icon: Sparkles, label: '2× XP Boost', desc: 'Level up twice as fast', color: '#f59e0b' },
  { icon: Shield, label: 'No Ads Ever', desc: 'Clean, distraction-free experience', color: '#60a5fa' },
  { icon: Crown, label: 'Exclusive Border', desc: 'Reforge Pro subscriber-only cosmetic', color: '#facc15' },
];

/* Marquee labels for the scrolling strip */
const MARQUEE_ITEMS = [
  'AI Motion Coach', 'Unlimited Dusk AI', 'AI Quest Autopilot', '5 Keys Daily',
  'Nutrition Intel', '2× XP Boost', 'No Ads', 'Exclusive Cosmetics',
  'Form Correction', 'Goal Tracking', 'Pro Badge', 'Priority Support',
];

type PlanKey = 'weekly' | 'monthly' | 'yearly';

const ManaPowerScreen: React.FC<ManaPowerScreenProps> = ({
  onClose, offerings, isPurchasing, onPurchase, onRestore, error,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>('monthly');
  const [isRestoring, setIsRestoring] = useState(false);

  // Extract packages from offerings
  const packages = useMemo(() => {
    const current = offerings?.current;
    if (!current) return null;

    const weekly = current.weekly || current.availablePackages?.find(p => p.identifier === '$rc_weekly');
    const monthly = current.monthly || current.availablePackages?.find(p => p.identifier === '$rc_monthly');
    const annual = current.annual || current.availablePackages?.find(p => p.identifier === '$rc_annual');

    return { weekly, monthly, annual };
  }, [offerings]);

  const plans: { key: PlanKey; label: string; price: string; period: string; badge?: string; pkg?: PurchasesPackage }[] = [
    {
      key: 'weekly',
      label: 'Weekly',
      price: packages?.weekly?.product?.priceString || '₹79',
      period: '/week',
      pkg: packages?.weekly || undefined,
    },
    {
      key: 'monthly',
      label: 'Monthly',
      price: packages?.monthly?.product?.priceString || '₹249',
      period: '/month',
      badge: 'POPULAR',
      pkg: packages?.monthly || undefined,
    },
    {
      key: 'yearly',
      label: 'Yearly',
      price: packages?.annual?.product?.priceString || '₹1,999',
      period: '/year',
      badge: 'BEST VALUE',
      pkg: packages?.annual || undefined,
    },
  ];

  const handlePurchase = async () => {
    const plan = plans.find(p => p.key === selectedPlan);
    if (!plan?.pkg) return;
    await onPurchase(plan.pkg);
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    await onRestore();
    setIsRestoring(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex flex-col"
      style={{ background: '#060610' }}
    >
      {/* Ambient background effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[10%] left-[20%] w-[200px] h-[200px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(250,204,21,0.06) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        <div className="absolute bottom-[30%] right-[10%] w-[150px] h-[150px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(0,212,255,0.05) 0%, transparent 70%)', filter: 'blur(30px)' }} />
        <div className="absolute top-[50%] left-[5%] w-[100px] h-[100px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.05) 0%, transparent 70%)', filter: 'blur(25px)' }} />

        {/* Floating particles */}
        <motion.div animate={{ y: [-5, 5, -5], x: [0, 3, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-[8%] right-[20%] w-1.5 h-1.5 rounded-full bg-[#facc15] opacity-20" />
        <motion.div animate={{ y: [4, -4, 4] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-[25%] left-[8%] w-1 h-1 rounded-full bg-[#00d4ff] opacity-15" />
        <motion.div animate={{ y: [-3, 6, -3], x: [-2, 2, -2] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-[40%] right-[15%] w-1 h-1 rounded-full bg-white opacity-10" />
        <motion.div animate={{ y: [3, -5, 3] }} transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-[60%] left-[25%] w-1 h-1 rounded-full bg-[#a78bfa] opacity-15" />
      </div>

      {/* Close button */}
      <div className="flex justify-end px-4 pb-1 relative z-10" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}>
        <button
          onClick={() => { triggerHaptic('BUTTON_TAP'); onClose(); }}
          className="w-8 h-8 flex items-center justify-center rounded-full"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <X size={16} className="text-gray-400" />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-6 px-5 relative z-10">
        {/* Header — title only, no icon */}
        <div className="text-center mb-3">
          <motion.h1
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-[28px] font-black text-white leading-tight mb-1"
          >
            Reforge Pro
          </motion.h1>
          <motion.p
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="text-[12px] text-gray-500 font-mono"
          >
            Unlock your full potential
          </motion.p>
        </div>

        {/* ── Triple Phone Mockup ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="relative flex justify-center mb-4 -mx-2"
        >
          {/* Glow behind phones */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[80%] h-[70%] rounded-full"
              style={{ background: 'radial-gradient(ellipse, rgba(250,204,21,0.06) 0%, rgba(0,212,255,0.03) 50%, transparent 70%)', filter: 'blur(30px)' }} />
          </div>
          <img src="/paywall/triple_mockup.webp" alt="Reforge Pro Features" className="w-full h-auto relative z-10" loading="lazy" />
        </motion.div>

        {/* ── Feature Marquee ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="mb-5 -mx-5 overflow-hidden"
        >
          <style>{`
            @keyframes mana-scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
            .mana-marquee { display: flex; animation: mana-scroll 25s linear infinite; width: max-content; }
            .mana-marquee:hover { animation-play-state: paused; }
          `}</style>
          <div className="mana-marquee">
            {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
              <div key={i} className="flex-shrink-0 mx-1.5 flex items-center gap-1.5 px-3 py-2 rounded-lg"
                style={{ background: 'rgba(250,204,21,0.04)', border: '1px solid rgba(250,204,21,0.08)' }}>
                <Sparkles size={10} style={{ color: '#facc15', opacity: 0.6 }} />
                <span className="text-[10px] text-gray-300 font-medium whitespace-nowrap">{item}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Perks Grid (2-column cards) ── */}
        <motion.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-5"
        >
          <div className="flex items-center gap-2 mb-3 px-1">
            <div className="w-1 h-4 rounded-full bg-[#facc15]" />
            <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-gray-500 uppercase">What's Included</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {PERKS.map((perk, i) => (
              <motion.div
                key={perk.label}
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.35 + i * 0.03 }}
                className="flex flex-col items-center text-center px-2 py-3 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-1.5"
                  style={{ background: `${perk.color}12`, border: `1px solid ${perk.color}20` }}>
                  <perk.icon size={14} style={{ color: perk.color }} />
                </div>
                <div className="text-[10px] font-bold text-white leading-tight">{perk.label}</div>
                <div className="text-[8px] text-gray-600 font-mono mt-0.5 leading-tight">{perk.desc}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Plan selector */}
        <motion.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="space-y-2 mb-5"
        >
          {plans.map((plan) => (
            <button
              key={plan.key}
              onClick={() => { triggerHaptic('BUTTON_TAP'); setSelectedPlan(plan.key); }}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all relative"
              style={{
                background: selectedPlan === plan.key ? 'rgba(250,204,21,0.08)' : 'rgba(255,255,255,0.025)',
                border: `1.5px solid ${selectedPlan === plan.key ? 'rgba(250,204,21,0.4)' : 'rgba(255,255,255,0.06)'}`,
              }}
            >
              {/* Radio */}
              <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  border: `2px solid ${selectedPlan === plan.key ? '#facc15' : 'rgba(255,255,255,0.15)'}`,
                  background: selectedPlan === plan.key ? '#facc15' : 'transparent',
                }}>
                {selectedPlan === plan.key && <div className="w-2 h-2 rounded-full bg-black" />}
              </div>

              {/* Info */}
              <div className="flex-1 text-left">
                <div className="text-[13px] font-bold text-white">{plan.label}</div>
              </div>

              {/* Price */}
              <div className="text-right">
                <span className="text-[14px] font-black text-white">{plan.price}</span>
                <span className="text-[10px] text-gray-500 font-mono">{plan.period}</span>
              </div>

              {/* Badge */}
              {plan.badge && (
                <div className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-md text-[7px] font-black font-mono uppercase tracking-wider"
                  style={{
                    background: plan.key === 'yearly' ? 'linear-gradient(135deg, #4ade80, #22c55e)' : 'linear-gradient(135deg, #facc15, #f59e0b)',
                    color: '#000',
                  }}>
                  {plan.badge}
                </div>
              )}
            </button>
          ))}
        </motion.div>

        {/* Error message */}
        {error && (
          <div className="px-3 py-2 rounded-lg mb-3 text-center text-[10px] font-mono"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
            {error}
          </div>
        )}

        {/* Purchase button */}
        <motion.button
          onClick={() => { triggerHaptic('BUTTON_TAP'); handlePurchase(); }}
          disabled={isPurchasing || !plans.find(p => p.key === selectedPlan)?.pkg}
          whileTap={{ scale: 0.97 }}
          className="w-full flex items-center justify-center gap-2.5 py-4 rounded-xl font-black text-[15px] tracking-wide transition-all disabled:opacity-50"
          style={{
            background: 'linear-gradient(135deg, #facc15 0%, #f59e0b 100%)',
            color: '#0a0a14',
            boxShadow: '0 6px 30px rgba(250,204,21,0.3)',
          }}
        >
          {isPurchasing ? (
            <><Loader2 size={18} className="animate-spin" /> Processing...</>
          ) : (
            <><Crown size={18} /> Subscribe to Reforge Pro</>
          )}
        </motion.button>

        {/* No offerings fallback */}
        {!packages && (
          <p className="text-center text-[9px] text-gray-600 font-mono mt-2">
            Subscription packages loading... Make sure you're on a mobile device.
          </p>
        )}

        {/* Restore + Terms */}
        <div className="flex items-center justify-center gap-4 mt-4">
          <button
            onClick={() => { triggerHaptic('BUTTON_TAP'); handleRestore(); }}
            disabled={isRestoring}
            className="flex items-center gap-1 text-[10px] font-mono text-gray-500 hover:text-gray-300 transition-colors"
          >
            <RotateCcw size={10} className={isRestoring ? 'animate-spin' : ''} />
            Restore Purchases
          </button>
          <span className="text-gray-800">•</span>
          <span className="text-[9px] font-mono text-[#4ade80] font-bold">Cancel anytime</span>
        </div>

        <p className="text-center text-[8px] text-gray-700 font-mono mt-3 px-4 leading-relaxed">
          Payment will be charged to your Google Play account. Subscription auto-renews unless cancelled at least 24 hours before the end of the current period.
        </p>
      </div>
    </motion.div>
  );
};

export default ManaPowerScreen;
