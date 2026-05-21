import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Crown, Check, Loader2, RotateCcw, ChevronRight, ChevronLeft,
  Target, MessageCircle, Zap, Shield, Dumbbell, Camera,
  UtensilsCrossed, Calendar, Trophy, Sparkles
} from 'lucide-react';
import type { PurchasesOfferings, PurchasesPackage } from '@revenuecat/purchases-capacitor';

interface PremiumPaywallProps {
  offerings: PurchasesOfferings | null;
  isPurchasing: boolean;
  error: string | null;
  onPurchase: (pkg: PurchasesPackage) => Promise<{ success: boolean }>;
  onRestore: () => Promise<void>;
}

// ── Feature showcase slides ──
const FEATURES = [
  {
    icon: Target,
    title: 'AI Quest System',
    desc: 'Get personalized daily missions that adapt to your goals. Complete quests to earn XP, gold, and climb the ranks.',
    color: '#00d4ff',
    bg: 'rgba(0,212,255,0.06)',
  },
  {
    icon: Camera,
    title: 'AI Motion Coach',
    desc: 'Real-time form correction using your camera. Never do an exercise wrong again — your AI coach watches every rep.',
    color: '#f97316',
    bg: 'rgba(249,115,22,0.06)',
  },
  {
    icon: UtensilsCrossed,
    title: 'AI Nutrition Scanner',
    desc: 'Snap a photo of any meal — instantly get calories, macros, and whether it fits your goals.',
    color: '#4ade80',
    bg: 'rgba(74,222,128,0.06)',
  },
  {
    icon: Dumbbell,
    title: 'Daily Dungeon Workouts',
    desc: 'The Sung Jin-woo Protocol. Push-ups, squats, running — complete daily dungeons to level up your real body.',
    color: '#a78bfa',
    bg: 'rgba(167,139,250,0.06)',
  },
  {
    icon: Calendar,
    title: 'AI Schedule Builder',
    desc: 'Auto-generate your perfect daily schedule. Training, meals, rest — all optimized by AI for your lifestyle.',
    color: '#f87171',
    bg: 'rgba(248,113,113,0.06)',
  },
  {
    icon: Trophy,
    title: 'Leaderboard & Ranks',
    desc: 'Compete with players worldwide. Climb from E-Rank to S-Rank. Your streaks and XP determine your rank.',
    color: '#facc15',
    bg: 'rgba(250,204,21,0.06)',
  },
  {
    icon: MessageCircle,
    title: 'Unlimited AI Mentor',
    desc: 'Chat with Dusk — your personal AI fitness mentor. Get guidance on training, nutrition, mindset. No limits.',
    color: '#818cf8',
    bg: 'rgba(129,140,248,0.06)',
  },
];

const PERKS_LIST = [
  'AI Quest System — daily missions',
  'AI Motion Coach — form correction',
  'AI Nutrition Scanner — meal analysis',
  'AI Schedule Builder — auto plan your day',
  'Daily Dungeon Workouts',
  'Unlimited AI Mentor chats',
  'Leaderboard & Global Ranking',
  '2× XP Boost — level up faster',
  '5 Daily Keys',
  'No Ads — clean experience',
  'Exclusive Pro Cosmetics',
];

const PremiumPaywall: React.FC<PremiumPaywallProps> = ({
  offerings, isPurchasing, error, onPurchase, onRestore,
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showAllPerks, setShowAllPerks] = useState(false);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-advance carousel
  useEffect(() => {
    autoPlayRef.current = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % FEATURES.length);
    }, 4000);
    return () => { if (autoPlayRef.current) clearInterval(autoPlayRef.current); };
  }, []);

  const resetAutoPlay = () => {
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    autoPlayRef.current = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % FEATURES.length);
    }, 4000);
  };

  // Extract monthly package
  const monthlyPkg = useMemo(() => {
    const current = offerings?.current;
    if (!current) return null;
    return current.monthly || current.availablePackages?.find(p => p.identifier === '$rc_monthly') || null;
  }, [offerings]);

  const priceString = monthlyPkg?.product?.priceString || '₹299';

  const handlePurchase = async () => {
    if (!monthlyPkg) return;
    await onPurchase(monthlyPkg);
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    await onRestore();
    setIsRestoring(false);
  };

  const feature = FEATURES[currentSlide];

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col"
      style={{
        background: 'linear-gradient(180deg, #040410 0%, #080818 50%, #060612 100%)',
      }}
    >
      {/* Subtle top glow */}
      <div className="absolute top-0 left-0 right-0 h-40 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(0,212,255,0.04) 0%, transparent 70%)' }} />

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}>
        <div className="px-5 max-w-md mx-auto">

          {/* ── HEADER ── */}
          <motion.div
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-center mb-5"
          >
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3"
              style={{
                background: 'linear-gradient(135deg, rgba(0,212,255,0.12) 0%, rgba(0,212,255,0.04) 100%)',
                border: '1px solid rgba(0,212,255,0.2)',
                boxShadow: '0 0 30px rgba(0,212,255,0.1)',
              }}>
              <Crown size={26} style={{ color: '#00d4ff' }} />
            </div>
            <h1 className="text-[24px] font-black text-white leading-tight">
              Your Fitness RPG Awaits
            </h1>
            <p className="text-[11px] text-gray-500 font-mono mt-1 tracking-wide">
              EVERYTHING INCLUDED • NO LIMITS
            </p>
          </motion.div>

          {/* ── FEATURE CAROUSEL ── */}
          <motion.div
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="relative mb-5"
          >
            <div
              className="rounded-2xl overflow-hidden relative"
              style={{
                background: feature.bg,
                border: `1px solid ${feature.color}15`,
                minHeight: 140,
              }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSlide}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.3 }}
                  className="px-5 py-5"
                >
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: `${feature.color}15`, border: `1px solid ${feature.color}25` }}>
                      <feature.icon size={18} style={{ color: feature.color }} />
                    </div>
                    <span className="text-[14px] font-black text-white">{feature.title}</span>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-relaxed font-medium">
                    {feature.desc}
                  </p>
                </motion.div>
              </AnimatePresence>

              {/* Nav arrows */}
              <button
                onClick={() => { setCurrentSlide((currentSlide - 1 + FEATURES.length) % FEATURES.length); resetAutoPlay(); }}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.05)' }}
              >
                <ChevronLeft size={14} className="text-gray-400" />
              </button>
              <button
                onClick={() => { setCurrentSlide((currentSlide + 1) % FEATURES.length); resetAutoPlay(); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.05)' }}
              >
                <ChevronRight size={14} className="text-gray-400" />
              </button>
            </div>

            {/* Dots */}
            <div className="flex items-center justify-center gap-1.5 mt-3">
              {FEATURES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setCurrentSlide(i); resetAutoPlay(); }}
                  className="rounded-full transition-all duration-300"
                  style={{
                    width: i === currentSlide ? 16 : 5,
                    height: 5,
                    background: i === currentSlide ? '#00d4ff' : 'rgba(255,255,255,0.1)',
                  }}
                />
              ))}
            </div>
          </motion.div>

          {/* ── WHAT'S INCLUDED ── */}
          <motion.div
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mb-5"
          >
            <button
              onClick={() => setShowAllPerks(!showAllPerks)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl mb-2"
              style={{ background: 'rgba(255,255,255,0.025)' }}
            >
              <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-gray-500 uppercase">
                What's Included
              </span>
              <motion.div animate={{ rotate: showAllPerks ? 90 : 0 }}>
                <ChevronRight size={12} className="text-gray-600" />
              </motion.div>
            </button>

            <AnimatePresence>
              {showAllPerks && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-1 px-1">
                    {PERKS_LIST.map((perk, i) => (
                      <div key={i} className="flex items-center gap-2.5 py-1.5">
                        <Check size={12} style={{ color: '#4ade80', flexShrink: 0 }} />
                        <span className="text-[11px] text-gray-300 font-medium">{perk}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {!showAllPerks && (
              <div className="space-y-1 px-1">
                {PERKS_LIST.slice(0, 4).map((perk, i) => (
                  <div key={i} className="flex items-center gap-2.5 py-1.5">
                    <Check size={12} style={{ color: '#4ade80', flexShrink: 0 }} />
                    <span className="text-[11px] text-gray-300 font-medium">{perk}</span>
                  </div>
                ))}
                <button
                  onClick={() => setShowAllPerks(true)}
                  className="text-[10px] font-mono text-[#00d4ff] font-bold ml-6 mt-1"
                >
                  +{PERKS_LIST.length - 4} more features →
                </button>
              </div>
            )}
          </motion.div>

          {/* ── PRICING CARD ── */}
          <motion.div
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="rounded-2xl p-4 mb-4 relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(0,212,255,0.06) 0%, rgba(0,212,255,0.02) 100%)',
              border: '1px solid rgba(0,212,255,0.12)',
            }}
          >
            {/* Badge */}
            <div className="absolute -top-0.5 right-4 px-2.5 py-1 rounded-b-lg"
              style={{
                background: 'linear-gradient(135deg, #4ade80, #22c55e)',
                boxShadow: '0 2px 12px rgba(74,222,128,0.3)',
              }}>
              <span className="text-[7px] font-black font-mono tracking-[0.2em] text-black uppercase">
                Free Trial
              </span>
            </div>

            <div className="text-center mt-2">
              <div className="flex items-baseline justify-center gap-1.5">
                <span className="text-[36px] font-black text-white">14 Days</span>
                <span className="text-[12px] text-gray-500 font-mono">FREE</span>
              </div>
              <p className="text-[10px] text-gray-500 font-mono mt-1">
                Then {priceString}/month • Cancel anytime
              </p>
            </div>
          </motion.div>

          {/* ── CTA BUTTON ── */}
          <motion.div
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <motion.button
              onClick={handlePurchase}
              disabled={isPurchasing || !monthlyPkg}
              whileTap={{ scale: 0.97 }}
              className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl font-black text-[15px] tracking-wide transition-all disabled:opacity-40"
              style={{
                background: 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)',
                color: '#020208',
                boxShadow: '0 6px 30px rgba(0,212,255,0.25), 0 0 60px rgba(0,212,255,0.08)',
              }}
            >
              {isPurchasing ? (
                <><Loader2 size={18} className="animate-spin" /> Processing...</>
              ) : (
                <><Zap size={18} /> Start My Free Trial</>
              )}
            </motion.button>

            {/* No offerings fallback */}
            {!monthlyPkg && (
              <p className="text-center text-[9px] text-gray-600 font-mono mt-2">
                Loading subscription packages...
              </p>
            )}
          </motion.div>

          {/* ── ERROR ── */}
          {error && (
            <div className="px-3 py-2 rounded-lg mt-3 text-center text-[10px] font-mono"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#f87171' }}>
              {error}
            </div>
          )}

          {/* ── TRUST SECTION ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-5"
          >
            {/* Restore + Terms */}
            <div className="flex items-center justify-center gap-3 mb-3">
              <button
                onClick={handleRestore}
                disabled={isRestoring}
                className="flex items-center gap-1 text-[10px] font-mono text-gray-500 active:text-gray-300 transition-colors"
              >
                <RotateCcw size={10} className={isRestoring ? 'animate-spin' : ''} />
                Restore Purchases
              </button>
              <span className="text-gray-800 text-[8px]">•</span>
              <span className="text-[10px] font-mono text-gray-500">Cancel anytime</span>
            </div>

            {/* Legal fine print */}
            <p className="text-center text-[8px] text-gray-700 font-mono leading-relaxed px-2">
              Start with a 14-day free trial. After your trial, subscription auto-renews at {priceString}/month.
              Payment charged to your Google Play account. Cancel at least 24 hours before the trial ends to avoid
              charges. Manage or cancel anytime via Google Play Store → Subscriptions.
            </p>
          </motion.div>

          <div className="h-6" />
        </div>
      </div>
    </div>
  );
};

export default PremiumPaywall;
