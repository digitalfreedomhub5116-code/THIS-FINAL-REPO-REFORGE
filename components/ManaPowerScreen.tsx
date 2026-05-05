import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, Target, MessageCircle, UtensilsCrossed, Calendar, Shield, Crown, Sparkles, Check, Loader2, RotateCcw } from 'lucide-react';
import type { PurchasesOfferings, PurchasesPackage } from '@revenuecat/purchases-capacitor';

interface ManaPowerScreenProps {
  onClose: () => void;
  offerings: PurchasesOfferings | null;
  isPurchasing: boolean;
  onPurchase: (pkg: PurchasesPackage) => Promise<{ success: boolean }>;
  onRestore: () => Promise<void>;
  error: string | null;
}

const PERKS = [
  { icon: Target, label: 'AI Goal Autopilot', desc: 'Auto-generated daily quests for your goals', color: '#00d4ff' },
  { icon: MessageCircle, label: 'Unlimited Dusk Guidance', desc: 'Chat with your AI mentor without limits', color: '#a78bfa' },
  { icon: Zap, label: '5 Keys Every Day', desc: 'Daily keys for Nutrition Scan & Schedule', color: '#facc15' },
  { icon: UtensilsCrossed, label: 'AI Nutrition Intel', desc: 'Scan meals with AI-powered analysis', color: '#4ade80' },
  { icon: Calendar, label: 'AI Schedule Forge', desc: 'Auto-generate your perfect daily schedule', color: '#f87171' },
  { icon: Sparkles, label: '2× XP Boost', desc: 'Level up twice as fast', color: '#f59e0b' },
  { icon: Shield, label: 'No Ads Ever', desc: 'Clean, distraction-free experience', color: '#60a5fa' },
  { icon: Crown, label: 'Exclusive Border', desc: 'Reforge Pro subscriber-only cosmetic', color: '#facc15' },
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
      {/* Close button */}
      <div className="flex justify-end px-4 pb-1" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <X size={16} className="text-gray-400" />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-6 px-5">
        {/* Header */}
        <div className="text-center mb-6">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-3"
            style={{
              background: 'linear-gradient(135deg, rgba(250,204,21,0.15) 0%, rgba(245,158,11,0.1) 100%)',
              border: '1px solid rgba(250,204,21,0.25)',
              boxShadow: '0 0 40px rgba(250,204,21,0.15)',
            }}
          >
            <Zap size={28} style={{ color: '#facc15' }} />
          </motion.div>

          <motion.h1
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="text-[28px] font-black text-white leading-tight mb-1"
          >
            Reforge Pro
          </motion.h1>
          <motion.p
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-[12px] text-gray-500 font-mono"
          >
            Unlock your full potential
          </motion.p>
        </div>

        {/* Perks list */}
        <div className="space-y-2 mb-6">
          {PERKS.map((perk, i) => (
            <motion.div
              key={perk.label}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.25 + i * 0.04 }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.04)' }}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${perk.color}12`, border: `1px solid ${perk.color}20` }}>
                <perk.icon size={14} style={{ color: perk.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-bold text-white">{perk.label}</div>
                <div className="text-[9px] text-gray-600 font-mono">{perk.desc}</div>
              </div>
              <Check size={14} style={{ color: '#4ade80' }} className="flex-shrink-0" />
            </motion.div>
          ))}
        </div>

        {/* Plan selector */}
        <div className="space-y-2 mb-5">
          {plans.map((plan) => (
            <button
              key={plan.key}
              onClick={() => setSelectedPlan(plan.key)}
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
        </div>

        {/* Error message */}
        {error && (
          <div className="px-3 py-2 rounded-lg mb-3 text-center text-[10px] font-mono"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
            {error}
          </div>
        )}

        {/* Purchase button */}
        <motion.button
          onClick={handlePurchase}
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
            onClick={handleRestore}
            disabled={isRestoring}
            className="flex items-center gap-1 text-[10px] font-mono text-gray-500 hover:text-gray-300 transition-colors"
          >
            <RotateCcw size={10} className={isRestoring ? 'animate-spin' : ''} />
            Restore Purchases
          </button>
          <span className="text-gray-800">•</span>
          <span className="text-[9px] font-mono text-gray-600">Cancel anytime</span>
        </div>

        <p className="text-center text-[8px] text-gray-700 font-mono mt-3 px-4 leading-relaxed">
          Payment will be charged to your Google Play account. Subscription auto-renews unless cancelled at least 24 hours before the end of the current period.
        </p>
      </div>
    </motion.div>
  );
};

export default ManaPowerScreen;
