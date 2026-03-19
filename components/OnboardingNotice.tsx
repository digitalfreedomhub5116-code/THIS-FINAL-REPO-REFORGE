
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckSquare, Square, Info } from 'lucide-react';

type PageKey = 'STORE' | 'QUEST' | 'HEALTH';

interface OnboardingNoticeProps {
  page: PageKey;
}

const LS_PREFIX = 'reforge_onboarding_';
const FIRST_VISIT_KEY = 'reforge_first_visit_date';
const ONBOARDING_WINDOW_DAYS = 3;

const PAGE_CONTENT: Record<PageKey, { title: string; sections: { icon: string; heading: string; text: string }[] }> = {
  STORE: {
    title: 'Welcome to the Store',
    sections: [
      { icon: '🏰', heading: 'Dungeon Tower', text: 'A survival reward zone — flip cards to earn Gold, XP, and Keys. Free entry resets every 24 hours, or spend 3 Keys for instant access.' },
      { icon: '📦', heading: 'Chest Vault', text: 'Open chests to win random rewards. Free Chest resets every 30 minutes. Legendary and Alliance chests cost Keys but have better loot.' },
      { icon: '👔', heading: 'Wardrobe', text: 'Purchase and equip outfits to boost your stats. Each outfit has unique Attack, Boost, Extraction, and Ultimate bonuses.' },
      { icon: '🧪', heading: 'Consumables', text: 'Buy Health Potions, Shadow Scrolls, and ULT Orbs with Gold or Keys. Use them strategically in quests and battles.' },
      { icon: '📅', heading: 'Daily Login', text: 'Log in every day to build your streak and earn escalating rewards including Gold, Potions, Scrolls, and Keys.' },
    ],
  },
  QUEST: {
    title: 'Welcome to Quests',
    sections: [
      { icon: '⚔️', heading: 'Daily Quests', text: 'Complete daily tasks to earn XP and Gold. Quests refresh every day — don\'t miss them!' },
      { icon: '🎯', heading: 'Weekly Missions', text: 'Bigger challenges with bigger rewards. Complete all weekly missions for bonus loot.' },
      { icon: '🏆', heading: 'Achievements', text: 'Track your long-term progress. Unlock achievements by hitting milestones in workouts, streaks, and more.' },
      { icon: '⚡', heading: 'Bonus XP', text: 'Some quests give multiplied XP. Look for the golden glow — those are high-value targets.' },
    ],
  },
  HEALTH: {
    title: 'Welcome to Health',
    sections: [
      { icon: '💪', heading: 'Workout Plans', text: 'AI-generated or premade workout plans tailored to your equipment and goals. Follow the schedule for maximum gains.' },
      { icon: '🏋️', heading: 'Active Workout', text: 'Start a session with guided timers, rest periods, and exercise videos. Complete exercises properly to earn full rewards.' },
      { icon: '📊', heading: 'Health Profile', text: 'Track your body stats, nutrition goals, and workout history. Your profile adapts as you progress.' },
      { icon: '🛡️', heading: 'Anti-Cheat', text: 'The system monitors workout integrity. Skipping exercises or rushing through them triggers anomaly points — too many and rewards are voided.' },
    ],
  },
};

const OnboardingNotice: React.FC<OnboardingNoticeProps> = ({ page }) => {
  const [visible, setVisible] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(`${LS_PREFIX}${page}_dismissed`);
    if (dismissed === 'true') return;

    let firstVisit = localStorage.getItem(FIRST_VISIT_KEY);
    if (!firstVisit) {
      firstVisit = new Date().toISOString();
      localStorage.setItem(FIRST_VISIT_KEY, firstVisit);
    }

    const daysSinceFirst = (Date.now() - new Date(firstVisit).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceFirst > ONBOARDING_WINDOW_DAYS) return;

    const timeout = setTimeout(() => setVisible(true), 600);
    return () => clearTimeout(timeout);
  }, [page]);

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem(`${LS_PREFIX}${page}_dismissed`, 'true');
    }
    setVisible(false);
  };

  const content = PAGE_CONTENT[page];
  if (!content) return null;

  return createPortal(
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl overflow-hidden relative"
            style={{ background: '#0a0a14', border: '1px solid rgba(139,92,246,0.25)', maxHeight: '80vh' }}
          >
            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>

            {/* Header */}
            <div className="px-5 pt-5 pb-3 relative">
              <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(139,92,246,0.12) 0%, transparent 65%)' }} />
              <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.5), transparent)' }} />
              <div className="relative flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center">
                  <Info size={16} className="text-purple-400" />
                </div>
                <div>
                  <div className="text-[9px] font-mono font-bold tracking-[0.3em] uppercase text-purple-400/70">GUIDE</div>
                  <h2 className="text-sm font-black text-white uppercase tracking-tight font-mono">{content.title}</h2>
                </div>
              </div>
            </div>

            {/* Sections */}
            <div className="px-5 pb-3 space-y-2.5 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 160px)' }}>
              {content.sections.map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.08 }}
                  className="flex gap-3 p-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <span className="text-xl flex-shrink-0 mt-0.5">{s.icon}</span>
                  <div className="min-w-0">
                    <div className="text-[11px] font-black text-white font-mono uppercase tracking-wide mb-0.5">{s.heading}</div>
                    <div className="text-[10px] text-gray-400 leading-relaxed">{s.text}</div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-white/[0.05]" style={{ background: 'rgba(0,0,0,0.4)' }}>
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={() => setDontShowAgain(p => !p)}
                  className="flex items-center gap-1.5 text-[10px] font-mono text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {dontShowAgain
                    ? <CheckSquare size={14} className="text-purple-400" />
                    : <Square size={14} className="text-gray-600" />
                  }
                  Don't show again
                </button>
                <button
                  onClick={handleClose}
                  className="px-5 py-2 rounded-xl text-xs font-black tracking-widest uppercase font-mono transition-all"
                  style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(109,40,217,0.5))', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.4)' }}
                >
                  GOT IT
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default OnboardingNotice;
