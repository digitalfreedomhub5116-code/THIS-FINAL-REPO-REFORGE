import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Crown, Check, Loader2, RotateCcw, ChevronRight, ChevronLeft,
  Target, Zap, Shield, Dumbbell, Camera, Star,
  UtensilsCrossed, Trophy, Sparkles, MessageCircle, ShieldAlert
} from 'lucide-react';
import type { PurchasesOfferings, PurchasesPackage } from '@revenuecat/purchases-capacitor';

/* ── Types ── */
interface PremiumPaywallProps {
  offerings: PurchasesOfferings | null;
  isPurchasing: boolean;
  error: string | null;
  onPurchase: (pkg: PurchasesPackage) => Promise<{ success: boolean }>;
  onRestore: () => Promise<void>;
  onSkip?: () => void;
}

/* ── Feature data ── */
const FEATURES = [
  {
    icon: Target, title: 'AI Quest System',
    desc: 'Get personalized daily missions that adapt to your goals. Complete quests to earn XP, gold, and climb the ranks.',
    color: '#00d4ff', bg: 'rgba(0,212,255,0.06)',
    screenshot: '/paywall/ss_quests.webp',
  },
  {
    icon: Camera, title: 'AI Motion Coach',
    desc: 'Real-time form correction using your camera. Never do an exercise wrong again — your AI coach watches every rep.',
    color: '#f97316', bg: 'rgba(249,115,22,0.06)',
    screenshot: '/paywall/ss_motion.webp',
  },
  {
    icon: UtensilsCrossed, title: 'AI Nutrition Scanner',
    desc: 'Snap a photo of any meal — instantly get calories, macros, and whether it fits your goals.',
    color: '#4ade80', bg: 'rgba(74,222,128,0.06)',
    screenshot: '/paywall/ss_nutrition.webp',
  },
  {
    icon: Dumbbell, title: 'Daily Dungeon Workouts',
    desc: 'The Sung Jin-woo Protocol. Push-ups, squats, running — complete daily dungeons to level up your real body.',
    color: '#a78bfa', bg: 'rgba(167,139,250,0.06)',
    screenshot: '/paywall/ss_dungeon.webp',
  },
  {
    icon: ShieldAlert, title: 'Anti-Cheat System',
    desc: 'Advanced cheat detection ensures fair play. Camera verification, motion tracking, and anomaly detection keep everyone honest.',
    color: '#f87171', bg: 'rgba(248,113,113,0.06)',
    screenshot: '/paywall/ss_anticheat.webp',
  },
  {
    icon: Trophy, title: 'Leaderboard & Ranks',
    desc: 'Compete with players worldwide. Climb from E-Rank to S-Rank. Your streaks and XP determine your rank.',
    color: '#facc15', bg: 'rgba(250,204,21,0.06)',
  },
  {
    icon: MessageCircle, title: 'Unlimited AI Mentor',
    desc: 'Chat with Dusk — your personal AI fitness mentor. Get guidance on training, nutrition, mindset. No limits.',
    color: '#818cf8', bg: 'rgba(129,140,248,0.06)',
  },
];

/* ── Testimonial data ── */
const TESTIMONIALS = [
  {
    name: 'Arjun', age: 22, location: 'Mumbai, India',
    rating: 5,
    beforeImg: '/onboarding/before_selfie.webp',
    afterImg: '/onboarding/after_selfie.webp',
    quote: "Best 90 days of my life. Lost 8kg, gained confidence, fixed my sleep schedule. The system pushed me every single day.",
    highlight: 'Best 90 days of my life',
    stats: { overall: { before: 55, after: 94 }, days: 90 },
  },
  {
    name: 'Riya', age: 19, location: 'Delhi, India',
    rating: 5,
    beforeImg: '/paywall/riya_before.webp',
    afterImg: '/paywall/riya_after.webp',
    quote: "I was a complete couch potato. The quest system made fitness feel like a game. 45 days in and I've never felt stronger.",
    highlight: "never felt stronger",
    stats: { overall: { before: 40, after: 72 }, days: 45 },
  },
  {
    name: 'Karan', age: 24, location: 'Bangalore, India',
    rating: 4.5,
    beforeImg: '/paywall/karan_before.webp',
    afterImg: '/paywall/karan_after.webp',
    quote: "The AI coach caught my squat form on day 1. Probably saved me from a back injury. This app actually cares about doing it right.",
    highlight: "saved me from a back injury",
    stats: { overall: { before: 48, after: 78 }, days: 60 },
  },
  {
    name: 'Sneha', age: 21, location: 'Pune, India',
    rating: 5,
    beforeImg: '/paywall/sneha_before.webp',
    afterImg: '/paywall/sneha_after.webp',
    quote: "I've tried 10+ fitness apps. This is the only one I opened every single day for 60 days straight. The streak system is addicting.",
    highlight: "every single day for 60 days",
    stats: { overall: { before: 35, after: 71 }, days: 60 },
  },
  {
    name: 'Vikram', age: 26, location: 'Hyderabad, India',
    rating: 4.5,
    beforeImg: '/paywall/vikram_before.webp',
    afterImg: '/paywall/vikram_after.webp',
    quote: "Lost 12kg in 3 months. The progressive difficulty is genius — it keeps pushing you just enough. E-Rank to B-Rank.",
    highlight: "Lost 12kg in 3 months",
    stats: { overall: { before: 42, after: 83 }, days: 90 },
  },
  {
    name: 'Priya', age: 20, location: 'Chennai, India',
    rating: 5,
    beforeImg: '/paywall/priya_before.webp',
    afterImg: '/paywall/priya_after.webp',
    quote: "My parents noticed the change before I did. Better sleep, better focus, better everything. This app literally changed my life.",
    highlight: "literally changed my life",
    stats: { overall: { before: 38, after: 68 }, days: 30 },
  },
];

const PERKS_LIST = [
  'AI Quest System — daily missions',
  'AI Motion Coach — form correction',
  'AI Nutrition Scanner — meal analysis',
  'Anti-Cheat System — fair play guaranteed',
  'Daily Dungeon Workouts',
  'Unlimited AI Mentor chats',
  'Leaderboard & Global Ranking',
  '2× XP Boost — level up faster',
  '5 Daily Keys',
  'No Ads — clean experience',
  'Exclusive Pro Cosmetics',
];

type Phase = 'FEATURES' | 'TESTIMONIALS' | 'PAYWALL';

/* ═══════════════════════════════════════════════════════════ */
/* MAIN COMPONENT                                            */
/* ═══════════════════════════════════════════════════════════ */
const PremiumPaywall: React.FC<PremiumPaywallProps> = ({
  offerings, isPurchasing, error, onPurchase, onRestore, onSkip,
}) => {
  const [phase, setPhase] = useState<Phase>('FEATURES');
  const [featureSlide, setFeatureSlide] = useState(0);
  const [selectedTestimonial, setSelectedTestimonial] = useState(0);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showAllPerks, setShowAllPerks] = useState(false);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-advance feature carousel
  useEffect(() => {
    if (phase !== 'FEATURES') { if (autoPlayRef.current) clearInterval(autoPlayRef.current); return; }
    autoPlayRef.current = setInterval(() => {
      setFeatureSlide(prev => (prev + 1) % FEATURES.length);
    }, 3500);
    return () => { if (autoPlayRef.current) clearInterval(autoPlayRef.current); };
  }, [phase]);

  const resetAutoPlay = () => {
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    autoPlayRef.current = setInterval(() => {
      setFeatureSlide(prev => (prev + 1) % FEATURES.length);
    }, 3500);
  };

  // Extract monthly package
  const monthlyPkg = useMemo(() => {
    const current = offerings?.current;
    if (!current) return null;
    return current.monthly || current.availablePackages?.find(p => p.identifier === '$rc_monthly') || null;
  }, [offerings]);

  const priceString = monthlyPkg?.product?.priceString || '₹299';

  const handlePurchase = async () => { if (monthlyPkg) await onPurchase(monthlyPkg); };
  const handleRestore = async () => { setIsRestoring(true); await onRestore(); setIsRestoring(false); };

  const feature = FEATURES[featureSlide];
  const testimonial = TESTIMONIALS[selectedTestimonial];

  /* ════ RENDER: FEATURE SHOWCASE ════ */
  if (phase === 'FEATURES') {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col" style={{ background: 'linear-gradient(180deg, #040410 0%, #080818 50%, #060612 100%)' }}>
        <div className="absolute top-0 left-0 right-0 h-40 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(0,212,255,0.04) 0%, transparent 70%)' }} />
        <div className="flex-1 overflow-y-auto" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 20px)', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}>
          <div className="px-5 max-w-md mx-auto">

            {/* Header */}
            <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3"
                style={{ background: 'linear-gradient(135deg, rgba(0,212,255,0.12) 0%, rgba(0,212,255,0.04) 100%)', border: '1px solid rgba(0,212,255,0.2)', boxShadow: '0 0 30px rgba(0,212,255,0.1)' }}>
                <Crown size={26} style={{ color: '#00d4ff' }} />
              </div>
              <h1 className="text-[24px] font-black text-white leading-tight">Here's What You Get</h1>
              <p className="text-[11px] text-gray-500 font-mono mt-1 tracking-wide">EVERYTHING INCLUDED • NO LIMITS</p>
            </motion.div>

            {/* Feature Card Carousel */}
            <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }} className="relative mb-5">
              <div className="rounded-2xl overflow-hidden relative" style={{ background: feature.bg, border: `1px solid ${feature.color}15`, minHeight: 150 }}>
                <AnimatePresence mode="wait">
                  <motion.div key={featureSlide} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25 }} className="px-5 py-5">
                    <div className="flex gap-3">
                      {/* Screenshot preview */}
                      {(feature as any).screenshot && (
                        <div className="w-[90px] h-[160px] rounded-xl overflow-hidden flex-shrink-0 border border-white/10"
                          style={{ boxShadow: `0 0 20px ${feature.color}15` }}>
                          <img src={(feature as any).screenshot} alt={feature.title} className="w-full h-full object-cover" loading="lazy" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${feature.color}15`, border: `1px solid ${feature.color}25` }}>
                            <feature.icon size={16} style={{ color: feature.color }} />
                          </div>
                          <span className="text-[14px] font-black text-white leading-tight">{feature.title}</span>
                        </div>
                        <p className="text-[11px] text-gray-400 leading-relaxed font-medium">{feature.desc}</p>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>

                <button onClick={() => { setFeatureSlide((featureSlide - 1 + FEATURES.length) % FEATURES.length); resetAutoPlay(); }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <ChevronLeft size={14} className="text-gray-400" />
                </button>
                <button onClick={() => { setFeatureSlide((featureSlide + 1) % FEATURES.length); resetAutoPlay(); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <ChevronRight size={14} className="text-gray-400" />
                </button>
              </div>

              {/* Dots */}
              <div className="flex items-center justify-center gap-1.5 mt-3">
                {FEATURES.map((_, i) => (
                  <button key={i} onClick={() => { setFeatureSlide(i); resetAutoPlay(); }} className="rounded-full transition-all duration-300"
                    style={{ width: i === featureSlide ? 16 : 5, height: 5, background: i === featureSlide ? '#00d4ff' : 'rgba(255,255,255,0.1)' }} />
                ))}
              </div>
            </motion.div>

            {/* Feature icon grid — quick visual of all features */}
            <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }}
              className="grid grid-cols-4 gap-2 mb-6">
              {FEATURES.map((f, i) => (
                <button key={i} onClick={() => { setFeatureSlide(i); resetAutoPlay(); }}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all"
                  style={{
                    background: i === featureSlide ? `${f.color}08` : 'rgba(255,255,255,0.015)',
                    border: `1px solid ${i === featureSlide ? f.color + '25' : 'rgba(255,255,255,0.04)'}`,
                  }}>
                  <f.icon size={16} style={{ color: i === featureSlide ? f.color : '#4b5563' }} />
                  <span className="text-[8px] font-mono text-gray-500 text-center leading-tight px-1" style={i === featureSlide ? { color: f.color } : undefined}>
                    {f.title.split(' ').slice(-1)[0]}
                  </span>
                </button>
              ))}
            </motion.div>

            {/* CTA */}
            <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.35 }}>
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => setPhase('TESTIMONIALS')}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-[14px] tracking-wide"
                style={{ background: 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)', color: '#020208', boxShadow: '0 6px 30px rgba(0,212,255,0.25)' }}>
                See Real Results <ChevronRight size={16} />
              </motion.button>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  /* ════ RENDER: TESTIMONIALS ════ */
  if (phase === 'TESTIMONIALS') {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col" style={{ background: 'linear-gradient(180deg, #040410 0%, #080818 50%, #060612 100%)' }}>
        <div className="flex-1 overflow-y-auto" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}>
          <div className="px-5 max-w-md mx-auto">

            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-4">
              <div className="text-[10px] font-mono font-bold tracking-[0.3em] text-[#00d4ff] uppercase mb-2"
                style={{ fontFamily: "'Orbitron', 'Rajdhani', monospace" }}>
                Real Stories From Our Hunters
              </div>
            </motion.div>

            {/* ── Selectable PFP Icons ── */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="flex items-center justify-center gap-3 mb-5">
              {TESTIMONIALS.map((t, i) => (
                <button key={i} onClick={() => setSelectedTestimonial(i)}
                  className="relative transition-all duration-300"
                  style={{ transform: i === selectedTestimonial ? 'scale(1.15)' : 'scale(0.9)', opacity: i === selectedTestimonial ? 1 : 0.5 }}>
                  <div className="w-[52px] h-[52px] rounded-full overflow-hidden p-[2px] transition-all duration-300"
                    style={{
                      background: i === selectedTestimonial
                        ? 'linear-gradient(135deg, #00d4ff, #0099cc)'
                        : 'rgba(255,255,255,0.1)',
                      boxShadow: i === selectedTestimonial ? '0 0 20px rgba(0,212,255,0.3)' : 'none',
                    }}>
                    <img src={t.afterImg} alt={t.name} className="w-full h-full rounded-full object-cover" loading="lazy" />
                  </div>
                  {i === selectedTestimonial && (
                    <motion.div layoutId="testimonial-indicator" className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#00d4ff]" />
                  )}
                </button>
              ))}
            </motion.div>

            {/* ── Selected Testimonial ── */}
            <AnimatePresence mode="wait">
              <motion.div key={selectedTestimonial}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}>

                {/* Before / After Photos */}
                <div className="flex items-center justify-center gap-5 mb-3">
                  <div className="text-center">
                    <div className="w-[72px] h-[72px] rounded-full overflow-hidden p-[2px] bg-gradient-to-br from-gray-700 to-gray-900">
                      <img src={testimonial.beforeImg} alt="Before" className="w-full h-full rounded-full object-cover" loading="lazy" />
                    </div>
                    <span className="text-gray-500 text-[9px] mt-1.5 block font-medium">Day 1</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="text-[#00d4ff] text-[16px]">→</div>
                    <span className="text-gray-600 text-[8px] tracking-wider uppercase">{testimonial.stats.days} days</span>
                  </div>
                  <div className="text-center">
                    <div className="w-[72px] h-[72px] rounded-full overflow-hidden p-[2px] bg-gradient-to-br from-[#00d4ff] to-[#0088aa]"
                      style={{ boxShadow: '0 0 20px rgba(0,212,255,0.2)' }}>
                      <img src={testimonial.afterImg} alt="After" className="w-full h-full rounded-full object-cover" loading="lazy" />
                    </div>
                    <span className="text-[#00d4ff] text-[9px] mt-1.5 block font-semibold">Day {testimonial.stats.days}</span>
                  </div>
                </div>

                {/* Name */}
                <div className="text-center mb-4">
                  <div className="text-white text-[16px] font-bold">{testimonial.name}, {testimonial.age}</div>
                  <div className="text-gray-500 text-[11px]">📍 {testimonial.location}</div>
                </div>

                {/* Stats */}
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.12)' }}>
                    <span className="text-gray-400 text-[10px] font-medium">★ Overall</span>
                    <span className="text-white text-[14px] font-black font-mono">{testimonial.stats.overall.before}</span>
                    <span className="text-[#00d4ff] text-[12px]">→</span>
                    <span className="text-[#00d4ff] text-[14px] font-black font-mono">{testimonial.stats.overall.after}</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ color: '#4ade80', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.15)' }}>
                      +{testimonial.stats.overall.after - testimonial.stats.overall.before} ▲
                    </span>
                  </div>
                </div>

                {/* Quote */}
                <div className="rounded-xl p-4 mb-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <p className="text-gray-300 text-[13px] leading-[1.8] italic">
                    "{testimonial.quote.split(testimonial.highlight).map((part, i, arr) => (
                      <React.Fragment key={i}>
                        {part}
                        {i < arr.length - 1 && <span className="font-bold text-white not-italic">{testimonial.highlight}</span>}
                      </React.Fragment>
                    ))}"
                  </p>
                </div>

                {/* Star rating */}
                <div className="flex items-center justify-center gap-1 mb-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={14}
                      className={i < Math.floor(testimonial.rating) ? 'fill-[#facc15] text-[#facc15]' : 'text-gray-700'}
                      style={i === Math.floor(testimonial.rating) && testimonial.rating % 1 > 0
                        ? { clipPath: 'inset(0 50% 0 0)', fill: '#facc15', color: '#facc15' }
                        : undefined} />
                  ))}
                  <span className="text-gray-400 text-[12px] font-mono ml-1">{testimonial.rating}</span>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Overall app rating */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
              className="flex items-center justify-center gap-2 mb-5 py-3 rounded-xl"
              style={{ background: 'rgba(250,204,21,0.03)', border: '1px solid rgba(250,204,21,0.08)' }}>
              <div className="flex">
                {[1, 2, 3, 4, 5].map(i => <Star key={i} size={12} className="fill-[#facc15] text-[#facc15]" />)}
              </div>
              <span className="text-white text-[12px] font-bold">4.8</span>
              <span className="text-gray-600 text-[10px]">•</span>
              <span className="text-gray-400 text-[11px] font-medium">Rated by 10,000+ Hunters</span>
            </motion.div>

            {/* CTA */}
            <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.35 }}>
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => setPhase('PAYWALL')}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-[14px] tracking-wide"
                style={{ background: 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)', color: '#020208', boxShadow: '0 6px 30px rgba(0,212,255,0.25)' }}>
                Unlock Full Access <ChevronRight size={16} />
              </motion.button>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  /* ════ RENDER: PAYWALL ════ */
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col" style={{ background: 'linear-gradient(180deg, #040410 0%, #080818 50%, #060612 100%)' }}>
      <div className="absolute top-0 left-0 right-0 h-40 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(0,212,255,0.04) 0%, transparent 70%)' }} />
      <div className="flex-1 overflow-y-auto" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}>
        <div className="px-5 max-w-md mx-auto">

          {/* Header */}
          <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center mb-5">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3"
              style={{ background: 'linear-gradient(135deg, rgba(0,212,255,0.12) 0%, rgba(0,212,255,0.04) 100%)', border: '1px solid rgba(0,212,255,0.2)', boxShadow: '0 0 30px rgba(0,212,255,0.1)' }}>
              <Crown size={26} style={{ color: '#00d4ff' }} />
            </div>
            <h1 className="text-[24px] font-black text-white leading-tight">Your Fitness RPG Awaits</h1>
            <p className="text-[11px] text-gray-500 font-mono mt-1 tracking-wide">EVERYTHING INCLUDED • NO LIMITS</p>
          </motion.div>

          {/* Feature mini-icons row */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
            className="flex items-center justify-center gap-2.5 mb-5">
            {FEATURES.map((f, i) => (
              <div key={i} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${f.color}10`, border: `1px solid ${f.color}18` }}>
                <f.icon size={14} style={{ color: f.color }} />
              </div>
            ))}
          </motion.div>

          {/* What's Included */}
          <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="mb-5">
            <button onClick={() => setShowAllPerks(!showAllPerks)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl mb-2"
              style={{ background: 'rgba(255,255,255,0.025)' }}>
              <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-gray-500 uppercase">What's Included</span>
              <motion.div animate={{ rotate: showAllPerks ? 90 : 0 }}>
                <ChevronRight size={12} className="text-gray-600" />
              </motion.div>
            </button>
            <AnimatePresence>
              {showAllPerks && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
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
                <button onClick={() => setShowAllPerks(true)} className="text-[10px] font-mono text-[#00d4ff] font-bold ml-6 mt-1">
                  +{PERKS_LIST.length - 4} more features →
                </button>
              </div>
            )}
          </motion.div>

          {/* Pricing Card */}
          <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
            className="rounded-2xl p-4 mb-4 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, rgba(0,212,255,0.06) 0%, rgba(0,212,255,0.02) 100%)', border: '1px solid rgba(0,212,255,0.12)' }}>
            <div className="absolute -top-0.5 right-4 px-2.5 py-1 rounded-b-lg"
              style={{ background: 'linear-gradient(135deg, #4ade80, #22c55e)', boxShadow: '0 2px 12px rgba(74,222,128,0.3)' }}>
              <span className="text-[7px] font-black font-mono tracking-[0.2em] text-black uppercase">Free Trial</span>
            </div>
            <div className="text-center mt-2">
              <div className="flex items-baseline justify-center gap-1.5">
                <span className="text-[36px] font-black text-white">14 Days</span>
                <span className="text-[12px] text-gray-500 font-mono">FREE</span>
              </div>
              <p className="text-[10px] text-gray-500 font-mono mt-1">Then {priceString}/month • Cancel anytime</p>
            </div>
          </motion.div>

          {/* CTA */}
          <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
            <motion.button onClick={handlePurchase} disabled={isPurchasing || !monthlyPkg} whileTap={{ scale: 0.97 }}
              className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl font-black text-[15px] tracking-wide transition-all disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)', color: '#020208', boxShadow: '0 6px 30px rgba(0,212,255,0.25), 0 0 60px rgba(0,212,255,0.08)' }}>
              {isPurchasing ? (<><Loader2 size={18} className="animate-spin" /> Processing...</>) : (<><Zap size={18} /> Start My Free Trial</>)}
            </motion.button>
            {!monthlyPkg && (
              <p className="text-center text-[9px] text-gray-600 font-mono mt-2">Loading subscription packages...</p>
            )}
          </motion.div>

          {/* Error */}
          {error && (
            <div className="px-3 py-2 rounded-lg mt-3 text-center text-[10px] font-mono"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#f87171' }}>
              {error}
            </div>
          )}

          {/* Trust section */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-5">
            <div className="flex items-center justify-center gap-3 mb-3">
              <button onClick={handleRestore} disabled={isRestoring}
                className="flex items-center gap-1 text-[10px] font-mono text-gray-500 active:text-gray-300 transition-colors">
                <RotateCcw size={10} className={isRestoring ? 'animate-spin' : ''} />
                Restore Purchases
              </button>
              <span className="text-gray-800 text-[8px]">•</span>
              <span className="text-[10px] font-mono text-gray-500">Cancel anytime</span>
            </div>
            <p className="text-center text-[8px] text-gray-700 font-mono leading-relaxed px-2">
              Start with a 14-day free trial. After your trial, subscription auto-renews at {priceString}/month.
              Payment charged to your Google Play account. Cancel at least 24 hours before the trial ends to avoid
              charges. Manage or cancel anytime via Google Play Store → Subscriptions.
            </p>
          </motion.div>

          {/* Continue with free — small grey button */}
          {onSkip && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="mt-5 mb-4">
              <button onClick={onSkip} className="w-full text-center py-2 text-[11px] text-gray-600 font-mono active:text-gray-400 transition-colors">
                Continue with free
              </button>
            </motion.div>
          )}

          <div className="h-4" />
        </div>
      </div>
    </div>
  );
};

export default PremiumPaywall;
