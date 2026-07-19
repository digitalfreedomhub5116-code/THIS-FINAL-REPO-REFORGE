import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { triggerHaptic } from '../utils/soundEngine';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Crown, Check, Loader2, RotateCcw, ChevronRight, ChevronLeft,
  Target, Zap, Shield, Dumbbell, Camera, Star,
  UtensilsCrossed, Trophy, Sparkles, MessageCircle, ShieldAlert
} from 'lucide-react';
import type { PurchasesOfferings, PurchasesPackage } from '@revenuecat/purchases-capacitor';

/* ── Skeleton Shimmer ── */
const shimmerStyle = `
@keyframes paywall-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.pw-skeleton {
  background: linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.08) 40%, rgba(255,255,255,0.04) 80%);
  background-size: 200% 100%;
  animation: paywall-shimmer 1.5s ease-in-out infinite;
}
`;

const SkeletonImage: React.FC<{
  src: string; alt: string; className?: string; style?: React.CSSProperties;
  skeletonClass?: string; skeletonStyle?: React.CSSProperties;
}> = ({ src, alt, className, style, skeletonClass, skeletonStyle }) => {
  const [loaded, setLoaded] = useState(false);
  return (
    <>
      {!loaded && (
        <div className={`pw-skeleton ${skeletonClass || ''}`}
          style={{ position: 'absolute', inset: 0, ...skeletonStyle }} />
      )}
      <img src={src} alt={alt} className={className}
        style={{ ...style, ...(!loaded ? { opacity: 0 } : {}) }}
        loading="lazy" onLoad={() => setLoaded(true)} />
    </>
  );
};

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
    screenshot: '/paywall/ss_leaderboard.webp',
  },
  {
    icon: MessageCircle, title: 'Unlimited AI Mentor',
    desc: 'Chat with Dusk — your personal AI fitness mentor. Get guidance on training, nutrition, mindset. No limits.',
    color: '#818cf8', bg: 'rgba(129,140,248,0.06)',
    screenshot: '/paywall/ss_mentor.webp',
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
    timeline: [
      { day: 'Day 1', label: 'Rock Bottom', text: 'No routine, sleeping late, eating junk, scrolling for hours. Body felt sluggish. Zero discipline. Decided to try Reforge as a last shot.', tasks: ['30 push-ups daily', 'Wake up at 7 AM', 'Track all meals'] },
      { day: 'Day 14', label: 'First Streak', text: 'Two weeks without missing a quest. The streak counter became my motivation — didn\'t want to lose my 14-day fire. Energy was noticeably up.', tasks: ['50 push-ups daily', 'Wake at 6:30 AM', 'No phone before 8 AM'] },
      { day: 'Day 33', label: 'Visible Changes', text: 'Friends started noticing. Lost face bloat, clothes fit better. Progressive difficulty kept pushing me just a bit harder each week.', tasks: ['Full workout 4x/week', 'Meal prep Sundays', 'Cold showers'] },
      { day: 'Day 66', label: 'The Breakthrough', text: 'Hit Level 30. Habits felt automatic — discipline replaced willpower. Body was visibly different. Couldn\'t imagine going back.', tasks: ['6-day training split', '7h consistent sleep', 'Zero junk food weeks'] },
      { day: 'Day 90', label: 'Fully Transformed', text: 'Completely different person. Lost 8kg, gained confidence, fixed sleep. The system pushed me every single day. Best 90 days of my life.' },
    ],
  },
  {
    name: 'Riya', age: 19, location: 'Delhi, India',
    rating: 5,
    beforeImg: '/paywall/riya_before.webp',
    afterImg: '/paywall/riya_after.webp',
    quote: "I was a complete couch potato. The quest system made fitness feel like a game. 45 days in and I've never felt stronger.",
    highlight: "never felt stronger",
    stats: { overall: { before: 40, after: 72 }, days: 45 },
    timeline: [
      { day: 'Day 1', label: 'Couch Potato Mode', text: 'Hadn\'t exercised in months. Walking to the kitchen felt like a workout. Downloaded Reforge because the anime theme looked cool honestly.', tasks: ['10 push-ups', '15 min walk', 'Drink 2L water'] },
      { day: 'Day 10', label: 'Actually Enjoying It', text: 'The quest system made it feel like a game. Completing daily dungeons gave me XP and I got weirdly competitive about my rank. Didn\'t feel like "exercise" anymore.', tasks: ['25 push-ups', '20 squats', '30 min walk daily'] },
      { day: 'Day 25', label: 'Mom Noticed', text: 'My mom asked if I was sick because I was waking up at 6 AM voluntarily. Nope — just chasing a streak. Lost 2kg without even trying. Clothes looser.', tasks: ['Bodyweight circuit 3x/week', 'No sugar Mon-Fri', 'Stairs only'] },
      { day: 'Day 45', label: 'Never Felt Stronger', text: 'Did 40 push-ups in one set — could barely do 5 when I started. Energy through the roof, skin clearer, sleeping better. I\'m hooked.', tasks: ['Full workout 5x/week', 'Protein tracking', '10K steps daily'] },
    ],
  },
  {
    name: 'Karan', age: 24, location: 'Bangalore, India',
    rating: 4.5,
    beforeImg: '/paywall/karan_before.webp',
    afterImg: '/paywall/karan_after.webp',
    quote: "The AI coach caught my squat form on day 1. Probably saved me from a back injury. This app actually cares about doing it right.",
    highlight: "saved me from a back injury",
    stats: { overall: { before: 48, after: 78 }, days: 60 },
    timeline: [
      { day: 'Day 1', label: 'Form Check Reality', text: 'Did my first squat with AI coach on. It flagged my form immediately — knees caving in, back rounding. Was doing this wrong for months at the gym.', tasks: ['Learn proper squat form', 'Mobility stretches', 'Watch form videos'] },
      { day: 'Day 15', label: 'Pain-Free Training', text: 'For the first time in months, my lower back didn\'t hurt after leg day. The form correction was genuinely saving me. Started trusting the system.', tasks: ['Squat 3x/week', 'Hip stretches daily', 'Core work 4x/week'] },
      { day: 'Day 35', label: 'Strength Gains', text: 'Added 15kg to my squat in a month of proper form. The anti-cheat system kept me honest — no half reps. Every rep had to be clean.', tasks: ['Progressive overload tracking', 'Deload week planned', 'Nutrition on point'] },
      { day: 'Day 60', label: 'Gym Bros Asking Me', text: 'People at the gym started asking about my form. Showed them the AI coach feature. Went from the guy who was going to hurt himself to the guy with the best squat form.', tasks: ['Full PPL split', 'PR attempts monthly', 'Helping others with form'] },
    ],
  },
  {
    name: 'Sneha', age: 21, location: 'Pune, India',
    rating: 5,
    beforeImg: '/paywall/sneha_before.webp',
    afterImg: '/paywall/sneha_after.webp',
    quote: "I've tried 10+ fitness apps. This is the only one I opened every single day for 60 days straight. The streak system is addicting.",
    highlight: "every single day for 60 days",
    stats: { overall: { before: 35, after: 71 }, days: 60 },
    timeline: [
      { day: 'Day 1', label: 'App Graveyard', text: 'Had 10+ fitness apps collecting dust. Expected to delete this one too after a week. But the daily quest notification hit different — felt like a game challenge.', tasks: ['Complete first quest', 'Set up profile', 'First workout'] },
      { day: 'Day 7', label: 'One Week Streak!', text: 'First time I\'ve ever used a fitness app for a full week. The XP system and rank progression kept me coming back. I was already D-Rank.', tasks: ['Morning workout routine', 'Track meals', '7-day streak maintained'] },
      { day: 'Day 30', label: 'The Addiction Kicked In', text: 'Realized I hadn\'t missed a single day. The streak was 30 days and I was terrified to break it. Lost 3kg. My stamina doubled. C-Rank achieved.', tasks: ['HIIT 3x/week', 'Yoga 2x/week', 'Meal prep started'] },
      { day: 'Day 60', label: '60 Day Warrior', text: '60 days straight. Never done anything this consistently in my life. Down 6kg, gained definition. The app didn\'t just build my body — it built discipline.', tasks: ['5x/week training', 'Macro counting', 'B-Rank achieved'] },
    ],
  },
  {
    name: 'Vikram', age: 26, location: 'Hyderabad, India',
    rating: 4.5,
    beforeImg: '/paywall/vikram_before.webp',
    afterImg: '/paywall/vikram_after.webp',
    quote: "Lost 12kg in 3 months. The progressive difficulty is genius — it keeps pushing you just enough. E-Rank to B-Rank.",
    highlight: "Lost 12kg in 3 months",
    stats: { overall: { before: 42, after: 83 }, days: 90 },
    timeline: [
      { day: 'Day 1', label: '92kg Starting', text: 'Weighed 92kg. Tried diets before but always quit after 2 weeks. The daily dungeon system felt different — small wins that kept adding up.', tasks: ['20 push-ups', '15 squats', '2km walk', 'No fried food'] },
      { day: 'Day 21', label: 'First 3kg Down', text: 'Lost 3kg in 3 weeks just by being consistent. The nutrition scanner helped — stopped eating 500cal more than I thought. D-Rank reached.', tasks: ['Scan all meals', 'Walk 5K steps', 'Complete daily dungeons'] },
      { day: 'Day 50', label: 'Belt Notch Down', text: 'Lost 7kg total. Had to tighten my belt by 2 notches. Wife noticed my face looked slimmer. The progressive difficulty kept challenging me — workouts got harder but I got stronger.', tasks: ['Run 3K 3x/week', 'Full body workout', 'Track macros daily'] },
      { day: 'Day 75', label: 'C-Rank Warrior', text: 'Down 10kg. Running 5K without stopping — couldn\'t run 500m on Day 1. The leaderboard kept me competitive. Climbed to C-Rank.', tasks: ['5K runs', '6-day training', 'Meal prep expert'] },
      { day: 'Day 90', label: '12kg Transformation', text: '80kg. Lost 12kg in 90 days. Went from E-Rank to B-Rank. People at work don\'t recognize me. This app literally changed my life trajectory.' },
    ],
  },
  {
    name: 'Priya', age: 20, location: 'Chennai, India',
    rating: 5,
    beforeImg: '/paywall/priya_before.webp',
    afterImg: '/paywall/priya_after.webp',
    quote: "My parents noticed the change before I did. Better sleep, better focus, better everything. This app literally changed my life.",
    highlight: "literally changed my life",
    stats: { overall: { before: 38, after: 68 }, days: 30 },
    timeline: [
      { day: 'Day 1', label: 'Exam Stress', text: 'Was stress-eating during exam season. Barely sleeping, anxiety through the roof. A friend recommended Reforge. Thought fitness would add more stress but tried anyway.', tasks: ['10 min morning stretch', 'Walk after dinner', 'Sleep by 11 PM'] },
      { day: 'Day 10', label: 'Sleeping Better', text: 'The evening walks became my therapy. Stress levels dropped noticeably. Was sleeping by 10:30 PM instead of 1 AM. Focus during study sessions improved.', tasks: ['20 min workout', 'No caffeine after 3 PM', 'Meditation 5 min'] },
      { day: 'Day 20', label: 'Parents Noticed', text: 'Dad asked "what happened to you?" because I was up early, exercising, eating breakfast. Mom said my skin looked better. I hadn\'t even noticed the changes myself.', tasks: ['30 min daily workout', 'Balanced meals', 'Digital detox after 9 PM'] },
      { day: 'Day 30', label: 'New Person', text: 'Aced my exams, lost 2kg, and gained a routine I actually love. Better sleep, better focus, better everything. Parents are proud. I\'m proud of myself.' },
    ],
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

  // Mark paywall as seen immediately — so reload/kill always goes to home
  useEffect(() => {
    try { localStorage.setItem('reforge_paywall_seen', '1'); } catch {}
  }, []);

  const handleNextSlide = () => {
    triggerHaptic('BUTTON_TAP');
    if (featureSlide < FEATURES.length - 1) {
      setFeatureSlide(prev => prev + 1);
    } else {
      setPhase('TESTIMONIALS');
    }
  };

  const handlePrevSlide = () => {
    triggerHaptic('BUTTON_TAP');
    setFeatureSlide(prev => Math.max(0, prev - 1));
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
        <style>{shimmerStyle}</style>
        <div className="absolute top-0 left-0 right-0 h-40 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(0,212,255,0.04) 0%, transparent 70%)' }} />
        <div className="flex-1 overflow-y-auto" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 20px)', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}>
          <div className="px-5 max-w-md mx-auto">

            {/* Header */}
            <div className="relative mb-5">
              {featureSlide > 0 && (
                <button onClick={handlePrevSlide} aria-label="Previous slide"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>
                  <ChevronLeft size={18} className="text-white" />
                </button>
              )}
              <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center">
                <h1 className="text-[24px] font-black text-white leading-tight">Here's What You Get</h1>
                <p className="text-[11px] text-gray-500 font-mono mt-1 tracking-wide">EVERYTHING INCLUDED • NO LIMITS</p>
              </motion.div>
            </div>

            {/* ── Fixed-frame image + caption slider ── */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="mb-4 mx-auto" style={{ width: '88%' }}>
              <AnimatePresence mode="wait">
                <motion.div key={featureSlide}
                  initial={{ opacity: 0, x: 60 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -60 }}
                  transition={{ duration: 0.35, ease: 'easeInOut' }}>

                  {/* Fixed-size frame — all screenshots render in the same box */}
                  <div className="relative w-full overflow-hidden"
                    style={{ height: 330, background: '#0a0a1a', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
                    {(feature as any).screenshot && (
                      <SkeletonImage src={(feature as any).screenshot} alt={feature.title}
                        className="w-full h-full block"
                        style={{ objectFit: 'contain', objectPosition: 'center' }}
                        skeletonStyle={{ position: 'absolute', inset: 0, borderRadius: 12 }} />
                    )}
                  </div>

                  {/* Caption BELOW the image — no overlap, reserved space keeps layout stable */}
                  <div className="mt-3 px-1" style={{ minHeight: 92 }}>
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: `${feature.color}20`, border: `1px solid ${feature.color}35` }}>
                        <feature.icon size={16} style={{ color: feature.color }} />
                      </div>
                      <span className="text-[16px] font-black text-white tracking-tight">{feature.title}</span>
                    </div>
                    <p className="text-[12px] text-white/85 leading-[1.6] font-medium">{feature.desc}</p>
                  </div>
                </motion.div>
              </AnimatePresence>
            </motion.div>

            {/* ── Dot Tracker ── */}
            <div className="flex items-center justify-center gap-2 mb-5 py-2">
              {FEATURES.map((f, i) => (
                <div key={i} className="relative flex items-center justify-center"
                  style={{ width: 20, height: 20 }}>
                  <motion.div
                    className="rounded-full"
                    animate={{
                      width: i === featureSlide ? 22 : 7,
                      height: 7,
                      backgroundColor: i === featureSlide ? f.color : 'rgba(255,255,255,0.15)',
                      boxShadow: i === featureSlide ? `0 0 10px ${f.color}50` : 'none',
                    }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  />
                </div>
              ))}
            </div>

            {/* CTA */}
            <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.35 }}>
              <motion.button whileTap={{ scale: 0.97 }} onClick={handleNextSlide}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-[14px] tracking-wide"
                style={{ background: 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)', color: '#020208', boxShadow: '0 6px 30px rgba(0,212,255,0.25)' }}>
                {featureSlide === FEATURES.length - 1 ? 'See Real Results' : 'NEXT'} <ChevronRight size={16} />
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
        <style>{shimmerStyle}</style>
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
                <button key={i} onClick={() => { triggerHaptic('BUTTON_TAP'); setSelectedTestimonial(i); }}
                  className="relative transition-all duration-300"
                  style={{ transform: i === selectedTestimonial ? 'scale(1.15)' : 'scale(0.9)', opacity: i === selectedTestimonial ? 1 : 0.5 }}>
                  <div className="w-[52px] h-[52px] rounded-full overflow-hidden p-[2px] transition-all duration-300 relative"
                    style={{
                      background: i === selectedTestimonial
                        ? 'linear-gradient(135deg, #00d4ff, #0099cc)'
                        : 'rgba(255,255,255,0.1)',
                      boxShadow: i === selectedTestimonial ? '0 0 20px rgba(0,212,255,0.3)' : 'none',
                    }}>
                    <SkeletonImage src={t.afterImg} alt={t.name} className="w-full h-full rounded-full object-cover"
                      skeletonStyle={{ borderRadius: '50%' }} />
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
                    <div className="w-[72px] h-[72px] rounded-full overflow-hidden p-[2px] bg-gradient-to-br from-gray-700 to-gray-900 relative">
                      <SkeletonImage src={testimonial.beforeImg} alt="Before" className="w-full h-full rounded-full object-cover"
                        skeletonStyle={{ borderRadius: '50%' }} />
                    </div>
                    <span className="text-gray-500 text-[9px] mt-1.5 block font-medium">Day 1</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="text-[#00d4ff] text-[16px]">→</div>
                    <span className="text-gray-600 text-[8px] tracking-wider uppercase">{testimonial.stats.days} days</span>
                  </div>
                  <div className="text-center">
                    <div className="w-[72px] h-[72px] rounded-full overflow-hidden p-[2px] bg-gradient-to-br from-[#00d4ff] to-[#0088aa] relative"
                      style={{ boxShadow: '0 0 20px rgba(0,212,255,0.2)' }}>
                      <SkeletonImage src={testimonial.afterImg} alt="After" className="w-full h-full rounded-full object-cover"
                        skeletonStyle={{ borderRadius: '50%' }} />
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

                {/* ── Journey Timeline ── */}
                {(testimonial as any).timeline && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-3 px-1">
                      <div className="w-1 h-4 rounded-full bg-[#00d4ff]" />
                      <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-gray-500 uppercase">
                        {testimonial.name}'s Journey
                      </span>
                    </div>
                    <div className="relative pl-5">
                      {/* Timeline line */}
                      <div className="absolute left-[7px] top-2 bottom-2 w-[2px]"
                        style={{ background: 'linear-gradient(to bottom, #00d4ff, rgba(0,212,255,0.1))' }} />

                      {((testimonial as any).timeline as Array<{ day: string; label: string; text: string; tasks?: string[] }>).map((milestone, mi, arr) => (
                        <div key={mi} className="relative mb-4 last:mb-0">
                          {/* Dot */}
                          <div className="absolute -left-5 top-[5px] w-[14px] h-[14px] rounded-full flex items-center justify-center"
                            style={{
                              background: mi === arr.length - 1 ? '#00d4ff' : '#0a0a1a',
                              border: `2px solid ${mi === arr.length - 1 ? '#00d4ff' : 'rgba(0,212,255,0.3)'}`,
                              boxShadow: mi === arr.length - 1 ? '0 0 8px rgba(0,212,255,0.4)' : 'none',
                            }}>
                            {mi === arr.length - 1 && (
                              <div className="w-[6px] h-[6px] rounded-full bg-white" />
                            )}
                          </div>

                          {/* Content */}
                          <div className="rounded-lg px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-mono font-bold text-[#00d4ff]">{milestone.day}</span>
                              <span className="text-[8px] text-gray-600">•</span>
                              <span className="text-[10px] font-bold text-white">{milestone.label}</span>
                            </div>
                            <p className="text-[10px] text-gray-400 leading-[1.6]">{milestone.text}</p>
                            {milestone.tasks && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {milestone.tasks.map((task, ti) => (
                                  <span key={ti} className="text-[8px] font-mono px-1.5 py-0.5 rounded-md"
                                    style={{ background: 'rgba(0,212,255,0.06)', color: 'rgba(0,212,255,0.7)', border: '1px solid rgba(0,212,255,0.1)' }}>
                                    {task}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => { triggerHaptic('BUTTON_TAP'); setPhase('PAYWALL'); }}
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

          {/* Header — no crown icon */}
          <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center mb-4">
            <h1 className="text-[22px] font-black text-white leading-tight">Become the Best Version<br/>of Yourself</h1>
            <p className="text-[11px] text-gray-500 font-mono mt-1.5 tracking-wide">EVERYTHING INCLUDED • NO LIMITS</p>
          </motion.div>

          {/* Phone Mockup with ambient effects */}
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1, duration: 0.5 }}
            className="relative flex justify-center mb-3 -mt-1">
            {/* Ambient glow behind phones */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[70%] h-[60%] rounded-full"
                style={{ background: 'radial-gradient(ellipse, rgba(0,212,255,0.08) 0%, rgba(0,100,200,0.04) 40%, transparent 70%)', filter: 'blur(30px)' }} />
            </div>
            <div className="absolute top-[20%] left-[10%] w-[80px] h-[80px] rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(248,113,113,0.06) 0%, transparent 70%)', filter: 'blur(20px)' }} />
            <div className="absolute bottom-[25%] right-[8%] w-[60px] h-[60px] rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(0,212,255,0.06) 0%, transparent 70%)', filter: 'blur(15px)' }} />
            {/* Floating dots */}
            <motion.div animate={{ y: [-3, 3, -3] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute top-[15%] right-[15%] w-1.5 h-1.5 rounded-full bg-[#00d4ff] opacity-20" />
            <motion.div animate={{ y: [3, -3, 3] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute bottom-[30%] left-[12%] w-1 h-1 rounded-full bg-[#f87171] opacity-20" />
            <motion.div animate={{ y: [-2, 4, -2] }} transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute top-[40%] left-[5%] w-1 h-1 rounded-full bg-white opacity-10" />
            {/* Image */}
            <img src="/paywall/triple_mockup-removebg-preview.png" alt="App Preview" className="w-[95%] h-auto relative z-10" loading="lazy" />
          </motion.div>

          {/* Tagline under mockup */}
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            className="text-center text-[10px] text-gray-500 font-mono mb-4 tracking-wide">
            AI-POWERED FITNESS • ANTI-CHEAT • MOTION TRACKING
          </motion.p>

          {/* ── Feature Marquee Cards ── */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            className="mb-5 -mx-5 overflow-hidden">
            <style>{`
              @keyframes perks-scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
              .perks-marquee { display: flex; animation: perks-scroll 20s linear infinite; width: max-content; }
            `}</style>
            <div className="perks-marquee">
              {[...PERKS_LIST, ...PERKS_LIST].map((perk, i) => (
                <div key={i} className="flex-shrink-0 mx-1.5 flex items-center gap-2 px-3.5 py-2.5 rounded-xl"
                  style={{ background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.1)' }}>
                  <Check size={12} style={{ color: '#4ade80', flexShrink: 0 }} />
                  <span className="text-[11px] text-gray-200 font-medium whitespace-nowrap">{perk}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Pricing Card */}
          <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
            className="rounded-2xl p-5 mb-4 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, rgba(0,212,255,0.06) 0%, rgba(0,212,255,0.02) 100%)', border: '1px solid rgba(0,212,255,0.12)' }}>
            <div className="absolute -top-0.5 right-4 px-2.5 py-1 rounded-b-lg"
              style={{ background: 'linear-gradient(135deg, #00d4ff, #0088cc)', boxShadow: '0 2px 12px rgba(0,212,255,0.25)' }}>
              <span className="text-[7px] font-black font-mono tracking-[0.2em] text-black uppercase">Reforge Pro</span>
            </div>
            <div className="text-center mt-2">
              <div className="flex items-baseline justify-center gap-1.5">
                <span className="text-[36px] font-black text-white">{priceString}</span>
                <span className="text-[12px] text-gray-500 font-mono">/MONTH</span>
              </div>
              <p className="text-[11px] text-gray-500 font-mono mt-1">
                Instant S-Rank Access • <span className="text-[#00d4ff] font-bold">Cancel anytime</span>
              </p>
            </div>
          </motion.div>

          {/* CTA */}
          <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
            <motion.button onClick={() => { triggerHaptic('BUTTON_TAP'); handlePurchase(); }} disabled={isPurchasing || !monthlyPkg} whileTap={{ scale: 0.97 }}
              className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl font-black text-[15px] tracking-wide transition-all disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)', color: '#020208', boxShadow: '0 6px 30px rgba(0,212,255,0.25), 0 0 60px rgba(0,212,255,0.08)' }}>
              {isPurchasing ? (<><Loader2 size={18} className="animate-spin" /> Processing...</>) : (<><Zap size={18} /> Unlock S-Rank Pro</>)}
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
              <button onClick={() => { triggerHaptic('BUTTON_TAP'); handleRestore(); }} disabled={isRestoring}
                className="flex items-center gap-1 text-[10px] font-mono text-gray-500 active:text-gray-300 transition-colors">
                <RotateCcw size={10} className={isRestoring ? 'animate-spin' : ''} />
                Restore Purchases
              </button>
              <span className="text-gray-800 text-[8px]">•</span>
              <span className="text-[10px] font-mono text-[#00d4ff] font-bold">Cancel anytime</span>
            </div>
            <p className="text-center text-[8px] text-gray-700 font-mono leading-relaxed px-2">
              Subscription auto-renews at {priceString}/month. Payment charged to your Google Play account on purchase confirmation.
              Cancel at least 24 hours before your billing cycle ends to avoid auto-renewal charges. Manage or cancel anytime via Google Play Store → Subscriptions.
            </p>
          </motion.div>

          {/* Continue with free — small grey button */}
          {onSkip && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="mt-5 mb-4">
              <button onClick={() => { triggerHaptic('BUTTON_TAP'); onSkip(); }} className="w-full text-center py-2 text-[11px] text-gray-600 font-mono active:text-gray-400 transition-colors">
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
