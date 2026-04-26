
import React, { useState } from 'react';
import { LayoutGrid, Activity, Swords, Trophy, User, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tab } from '../types';
import SystemGlitchBadge from './SystemGlitchBadge';
import { triggerHaptic } from '../utils/soundEngine';
import { getLockedTabs, LockedFeaturePopup, FEATURE_GATES } from './FeatureGate';
import { useThemeContext } from '../hooks/useTheme';

interface NavigationProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  badges?: Record<string, boolean>;
  playerLevel?: number;
  guidedStep?: number;
  onGuidedAction?: (step: number) => void;
}

const NAV_ITEMS = [
  { id: 'DASHBOARD' as Tab, label: 'Today', icon: LayoutGrid },
  { id: 'HEALTH' as Tab, label: 'Health', icon: Activity },
  { id: 'QUESTS' as Tab, label: 'Quests', icon: Swords },
  { id: 'LEADERBOARD' as Tab, label: 'Ranks', icon: Trophy },
  { id: 'PROFILE' as Tab, label: 'You', icon: User },
];

const Navigation: React.FC<NavigationProps> = ({ activeTab, onTabChange, badges, playerLevel = 99, guidedStep, onGuidedAction }) => {
  const { theme } = useThemeContext();
  const isLight = theme === 'light';
  const [lockedPopup, setLockedPopup] = useState<{ label: string; level: number } | null>(null);
  const lockedTabs = getLockedTabs(playerLevel);
  const isGuidedQuestStep = guidedStep === 1;
  const isGuidedHealthStep = guidedStep === 7;

  const handleTabClick = (tabId: Tab) => {
    if (lockedTabs[tabId]) {
      const gateKey = tabId === 'STORE' ? 'STORE' : tabId === 'LEADERBOARD' ? 'LEADERBOARD' : '';
      const gate = FEATURE_GATES[gateKey];
      setLockedPopup({ label: gate?.label || tabId, level: lockedTabs[tabId] });
      return;
    }
    if (isGuidedQuestStep && tabId === 'QUESTS' && onGuidedAction) {
      onGuidedAction(1);
    }
    if (isGuidedHealthStep && tabId === 'HEALTH' && onGuidedAction) {
      onGuidedAction(7);
    }
    triggerHaptic('TAB_SWITCH');
    onTabChange(tabId);
  };

  return (
    <>
      <LockedFeaturePopup
        visible={!!lockedPopup}
        featureLabel={lockedPopup?.label || ''}
        requiredLevel={lockedPopup?.level || 0}
        onClose={() => setLockedPopup(null)}
      />

      {/* Desktop Sidebar */}
      <motion.nav
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="hidden md:flex fixed left-0 top-0 h-screen w-64 bg-black/95 backdrop-blur-xl border-r border-gray-800 flex-col z-40"
      >
        <div className="p-8 border-b border-gray-800/50">
          <h1 className="text-xl font-bold tracking-tighter text-white">
            <span className="text-system-accent">REFORGE</span>
          </h1>
          <p className="text-[10px] text-gray-500 mt-1 font-mono tracking-[0.2em]">OPERATING SYSTEM</p>
        </div>

        <div className="flex-1 py-6 px-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            const isLocked = !!lockedTabs[item.id];
            const Icon = item.icon;
            const isGuidedHighlight = (isGuidedQuestStep && item.id === 'QUESTS') || (isGuidedHealthStep && item.id === 'HEALTH');
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-300 relative group overflow-hidden ${
                  isLocked ? 'text-gray-700 cursor-not-allowed' : isActive ? 'text-white' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {isActive && !isLocked && (
                  <motion.div
                    layoutId="active-nav-desktop"
                    className="absolute inset-0 bg-gray-800/50 border border-gray-700/50 rounded-lg"
                    initial={false}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
                {isActive && !isLocked && (
                  <motion.div
                    layoutId="active-indicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-system-neon rounded-r-full shadow-[0_0_10px_#00d2ff]"
                  />
                )}
                {isGuidedHighlight && (
                  <motion.div
                    className="absolute inset-0 rounded-lg pointer-events-none"
                    animate={{ boxShadow: ['0 0 8px rgba(0,210,255,0.3)', '0 0 20px rgba(0,210,255,0.7)', '0 0 8px rgba(0,210,255,0.3)'] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    style={{ border: '1px solid rgba(0,210,255,0.5)' }}
                  />
                )}
                <div className={`relative z-10 transition-transform duration-300 ${isLocked ? 'opacity-40' : isActive ? 'scale-110 text-system-neon' : ''}`}>
                  {isLocked ? <Lock size={20} /> : <Icon size={20} />}
                </div>
                <span className={`font-mono text-sm tracking-wide relative z-10 font-medium ${isLocked ? 'opacity-40' : ''}`}>{item.label}</span>
                {isLocked && (
                  <span className="relative z-10 ml-auto text-[9px] font-mono text-gray-700 tracking-wider">Lv.{lockedTabs[item.id]}</span>
                )}
                {!isLocked && badges?.[item.id] && (
                  <div className="relative z-10 ml-auto">
                    <SystemGlitchBadge />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="p-6 border-t border-gray-800/50">
          <div className="flex items-center gap-2 text-[10px] text-gray-600 font-mono">
            <div className="w-1.5 h-1.5 bg-system-success rounded-full animate-pulse" />
            SYSTEM ONLINE
          </div>
        </div>
      </motion.nav>

      {/* Mobile Bottom Pill Bar — 3D liquid glass */}
      <motion.nav
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        id="tut-nav-mobile"
        className="md:hidden fixed left-4 right-4 z-40"
        style={{ bottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}
      >
        <div
          className="relative flex items-center justify-around rounded-full px-1.5 py-1 overflow-hidden"
          style={isLight ? {
            background: 'rgba(255,255,255,0.88)',
            backdropFilter: 'blur(28px) saturate(180%)',
            WebkitBackdropFilter: 'blur(28px) saturate(180%)',
            border: '1px solid rgba(0,0,0,0.08)',
            boxShadow: '0 -1px 8px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.08)',
          } : {
            background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(8,8,20,0.82) 16%, rgba(4,4,14,0.92) 100%)',
            backdropFilter: 'blur(28px) saturate(200%)',
            WebkitBackdropFilter: 'blur(28px) saturate(200%)',
            borderTop: '1px solid rgba(255,255,255,0.14)',
            borderLeft: '1px solid rgba(255,255,255,0.08)',
            borderRight: '1px solid rgba(255,255,255,0.04)',
            borderBottom: '1px solid rgba(255,255,255,0.03)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.5), 0 3px 8px rgba(0,0,0,0.35)',
          }}
        >
          {/* Specular top-edge line */}
          <div className="absolute top-0 left-4 right-4 h-px pointer-events-none rounded-full" style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 25%, rgba(0,210,255,0.15) 55%, rgba(139,92,246,0.12) 80%, transparent 100%)' }} />
          {/* Iridescent inner wash */}
          <div className="absolute inset-0 pointer-events-none rounded-full" style={{ background: 'linear-gradient(135deg, rgba(0,210,255,0.03) 0%, transparent 45%, rgba(139,92,246,0.03) 100%)' }} />

          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            const isQuest = item.id === 'QUESTS';
            const isLocked = !!lockedTabs[item.id];
            const Icon = item.icon;
            const isGuidedHighlight = (isGuidedQuestStep && item.id === 'QUESTS') || (isGuidedHealthStep && item.id === 'HEALTH');
            return (
              <button
                key={item.id}
                id={item.id === 'HEALTH' ? 'tut-nav-health' : item.id === 'QUESTS' ? 'nav-quests-btn' : undefined}
                onClick={() => handleTabClick(item.id)}
                className="relative flex flex-col items-center justify-center w-10 h-10"
              >
                {isActive && !isLocked && (
                  <motion.div
                    layoutId="active-nav-pill"
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: isQuest
                        ? 'linear-gradient(135deg, rgba(0,210,255,0.25) 0%, rgba(0,160,200,0.15) 100%)'
                        : 'linear-gradient(135deg, rgba(139,92,246,0.3) 0%, rgba(109,40,217,0.2) 100%)',
                      boxShadow: isQuest
                        ? 'inset 0 1px 0 rgba(255,255,255,0.15), 0 0 14px rgba(0,210,255,0.4), 0 2px 8px rgba(0,0,0,0.4)'
                        : 'inset 0 1px 0 rgba(255,255,255,0.12), 0 0 12px rgba(139,92,246,0.5), 0 2px 8px rgba(0,0,0,0.4)',
                    }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                {isGuidedHighlight && (
                  <motion.div
                    className="absolute inset-0 rounded-full pointer-events-none"
                    animate={{ boxShadow: ['0 0 6px rgba(0,210,255,0.3)', '0 0 18px rgba(0,210,255,0.8)', '0 0 6px rgba(0,210,255,0.3)'] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                    style={{ border: '1px solid rgba(0,210,255,0.5)' }}
                  />
                )}
                <div
                  className="relative z-10 transition-all duration-200"
                  style={{
                    color: isLocked
                      ? '#2a2a3a'
                      : isActive
                        ? (isQuest ? '#00d2ff' : '#ffffff')
                        : isQuest
                          ? '#00d2ff'
                          : '#6b7280',
                    transform: isActive && !isLocked ? 'scale(1.15)' : 'scale(1)',
                    filter: isLocked
                      ? 'none'
                      : isQuest
                        ? `drop-shadow(0 0 ${isActive ? '8px' : '5px'} rgba(0,210,255,${isActive ? '0.8' : '0.55'}))`
                        : 'none',
                  }}
                >
                  {isLocked ? <Lock size={16} /> : <Icon size={18} />}
                </div>
                {/* Label removed - icons only */}
                {isLocked && (
                  <div
                    className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center z-20"
                    style={{
                      background: 'rgba(20,20,35,0.95)',
                      border: '1px solid rgba(80,80,120,0.4)',
                      fontSize: 6,
                      fontWeight: 900,
                      color: '#5a5a6a',
                      fontFamily: 'monospace',
                    }}
                  >
                    {lockedTabs[item.id]}
                  </div>
                )}
                {!isLocked && badges?.[item.id] && !isActive && (
                  <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full z-20 shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
                )}
              </button>
            );
          })}
        </div>
      </motion.nav>
    </>
  );
};

export default Navigation;
