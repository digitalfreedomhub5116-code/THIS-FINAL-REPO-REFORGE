import React, { useState, useRef, useEffect } from 'react';
import { Bell, LogOut, Flame, ChevronRight, Edit3, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SystemNotification, ReplitUser } from '../types';

const AnimatedCoinIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg
    width={size} height={size} viewBox="0 0 14 14"
    style={{ animation: 'coinFlip 3s ease-in-out infinite', filter: 'drop-shadow(0 0 5px #eab308)', flexShrink: 0 }}
  >
    <circle cx="7" cy="7" r="6" fill="none" stroke="#eab308" strokeWidth="1.5"/>
    <text x="7" y="10.5" textAnchor="middle" fontSize="6" fontWeight="900" fill="#eab308" fontFamily="monospace">◈</text>
  </svg>
);

const AnimatedKeyIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg
    width={size} height={size} viewBox="0 0 14 14"
    style={{ animation: 'keyWiggle 4s ease-in-out infinite', filter: 'drop-shadow(0 0 4px #8b5cf6)', flexShrink: 0 }}
  >
    <circle cx="5" cy="5.5" r="3" fill="none" stroke="#a78bfa" strokeWidth="1.4"/>
    <line x1="7.5" y1="7" x2="12" y2="11.5" stroke="#a78bfa" strokeWidth="1.4" strokeLinecap="round"/>
    <line x1="9.5" y1="9" x2="9.5" y2="11" stroke="#a78bfa" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
);

const AnimatedCounter: React.FC<{ value: number }> = ({ value }) => {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    const from = prev.current;
    const to = value;
    prev.current = value;
    if (from === to) return;
    const start = performance.now();
    const dur = 1400;
    const tick = (now: number) => {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value]);
  return <>{display.toLocaleString()}</>;
};

interface StoredNotification extends SystemNotification {
  timestamp?: number;
}

interface LayoutProps {
  children: React.ReactNode;
  navigation?: React.ReactNode;
  playerLevel?: number;
  playerName?: string;
  playerUsername?: string;
  playerRank?: string;
  streak?: number;
  gold?: number;
  keys?: number;
  consumables?: { healthPotions: number; shadowScrolls: number; ultOrbs: number };
  replitUser?: ReplitUser;
  notificationHistory?: StoredNotification[];
  hasUnreadNotifications?: boolean;
  onGoldClick?: () => void;
  onLogout?: () => void;
  onAdminRequest?: () => void;
  onEditProfile?: () => void;
  playerAvatarUrl?: string;
  onMarkNotificationsRead?: () => void;
  onClearNotificationHistory?: () => void;
  hideHeader?: boolean;
  headerDisabled?: boolean;
}

const glassDropdown = {
  background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(10,10,18,0.95) 15%, rgba(6,6,14,0.98) 100%)',
  backdropFilter: 'blur(24px) saturate(180%)',
  WebkitBackdropFilter: 'blur(24px) saturate(180%)',
  border: '1px solid rgba(255,255,255,0.10)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 24px 64px rgba(0,0,0,0.85)',
};

const Layout: React.FC<LayoutProps> = ({
  children,
  navigation,
  playerLevel = 1,
  playerName = 'Hunter',
  playerUsername,
  streak = 0,
  gold = 0,
  keys = 0,
  consumables,
  replitUser,
  playerAvatarUrl,
  notificationHistory = [],
  hasUnreadNotifications = false,
  onGoldClick,
  onLogout,
  onAdminRequest,
  onEditProfile,
  onMarkNotificationsRead,
  onClearNotificationHistory,
  hideHeader = false,
  headerDisabled = false
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const lastScrollY = useRef(0);

  const isShadowMonarch = playerLevel >= 10;
  const displayName = playerUsername || playerName || replitUser?.firstName || 'Hunter';
  const avatarUrl = playerAvatarUrl || replitUser?.profileImageUrl;
  const initial = (playerName || displayName).charAt(0).toUpperCase();

  const notifTypeColor: Record<string, string> = {
    SUCCESS: 'text-green-400',
    WARNING: 'text-yellow-400',
    DANGER: 'text-red-400',
    LEVEL_UP: 'text-yellow-300',
    SYSTEM: 'text-[#00d2ff]',
    PURCHASE: 'text-purple-400'
  };

  const notifDot: Record<string, string> = {
    SUCCESS: 'bg-green-400',
    WARNING: 'bg-yellow-400',
    DANGER: 'bg-red-400',
    LEVEL_UP: 'bg-yellow-300',
    SYSTEM: 'bg-[#00d2ff]',
    PURCHASE: 'bg-purple-400'
  };

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      if (currentY > lastScrollY.current + 8) {
        setHeaderVisible(false);
        setShowNotifications(false);
        setShowProfileMenu(false);
      } else if (currentY < lastScrollY.current - 4) {
        setHeaderVisible(true);
      }
      lastScrollY.current = currentY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const coinForceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const COIN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 14 14"><circle cx="7" cy="7" r="6" fill="none" stroke="#eab308" stroke-width="1.5"/><text x="7" y="10.5" text-anchor="middle" font-size="6" font-weight="900" fill="#eab308" font-family="monospace">◈</text></svg>`;
    const handleCoinEarned = (e: Event) => {
      const { startRect } = (e as CustomEvent).detail as { goldGained: number; startRect: DOMRect | null };
      setHeaderVisible(true);
      if (coinForceTimer.current) clearTimeout(coinForceTimer.current);
      coinForceTimer.current = setTimeout(() => { coinForceTimer.current = null; }, 2600);
      if (!startRect) return;
      const destEl = document.getElementById('user-wallet-balance');
      if (!destEl) return;
      const destRect = destEl.getBoundingClientRect();
      const startX = startRect.left + startRect.width / 2;
      const startY = startRect.top + startRect.height / 2;
      const endX = destRect.left + destRect.width / 2;
      const endY = destRect.top + destRect.height / 2;
      const COIN_COUNT = 8;
      for (let i = 0; i < COIN_COUNT; i++) {
        setTimeout(() => {
          const coin = document.createElement('div');
          coin.style.cssText = `position:fixed;width:18px;height:18px;left:${startX - 9}px;top:${startY - 9}px;z-index:9999;pointer-events:none;`;
          coin.innerHTML = COIN_SVG;
          document.body.appendChild(coin);
          const scatterX = (Math.random() - 0.5) * 60;
          const scatterY = (Math.random() - 0.5) * 60;
          const midX = (startX + endX) / 2 - startX + (Math.random() - 0.5) * 60;
          const midY = Math.min(startY, endY) - 80 - Math.random() * 60 - startY;
          coin.animate([
            { transform: 'translate(0,0) scale(0.5)', opacity: 0 },
            { transform: `translate(${scatterX}px,${scatterY}px) scale(1)`, opacity: 1, offset: 0.12 },
            { transform: `translate(${midX}px,${midY}px) scale(1.1)`, offset: 0.5 },
            { transform: `translate(${endX - startX}px,${endY - startY}px) scale(0.5)`, opacity: 0 },
          ], {
            duration: 900 + Math.random() * 300,
            easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
            fill: 'forwards',
          }).onfinish = () => coin.remove();
        }, i * 60);
      }
    };
    window.addEventListener('reforge:coin-earned', handleCoinEarned);
    return () => window.removeEventListener('reforge:coin-earned', handleCoinEarned);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleOpenNotifications = () => {
    setShowNotifications(v => !v);
    setShowProfileMenu(false);
    if (!showNotifications && onMarkNotificationsRead) {
      onMarkNotificationsRead();
    }
  };

  return (
    <div className="min-h-screen bg-system-bg text-gray-200 font-sans selection:bg-system-accent selection:text-white overflow-x-hidden">

      {/* Background ambient glow */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[20%] w-96 h-96 bg-system-accent/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[10%] right-[10%] w-96 h-96 bg-system-neon/10 rounded-full blur-[100px]" />
        {isShadowMonarch && (
          <div className="absolute inset-0 opacity-30 mix-blend-screen">
            <div className="absolute inset-0 bg-gradient-to-t from-purple-900/20 to-transparent animate-pulse" />
          </div>
        )}
      </div>

      {/* Navigation (Fixed) */}
      {navigation}

      {/* Main content */}
      <div className={`relative z-10 transition-all duration-300 ${navigation ? 'md:pl-64 pb-24 md:pb-0' : ''}`}>

        {/* TOP BAR */}
        {!hideHeader && (
          <motion.header
            id="reforge-top-nav"
            animate={{ y: headerVisible ? 0 : '-100%' }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className={`fixed top-0 right-0 z-40 ${navigation ? 'left-0 md:left-64' : 'left-0'}`}
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.055) 0%, rgba(8,8,18,0.88) 18%, rgba(4,4,12,0.96) 100%)',
              backdropFilter: 'blur(28px) saturate(180%)',
              WebkitBackdropFilter: 'blur(28px) saturate(180%)',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07), 0 8px 32px rgba(0,0,0,0.5)',
            }}
          >
            {/* Specular top edge */}
            <div className="absolute top-0 left-0 right-0 h-px pointer-events-none" style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.18) 30%, rgba(0,210,255,0.12) 55%, rgba(139,92,246,0.10) 75%, transparent 100%)' }} />
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(135deg, rgba(0,210,255,0.02) 0%, transparent 50%, rgba(139,92,246,0.02) 100%)' }} />

            <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-3.5 max-w-7xl mx-auto relative z-10">

              {/* LEFT: Avatar + Greeting + Username */}
              <div className="flex items-center gap-3" ref={profileMenuRef}>
                <div className="relative">
                  <button
                    onClick={() => { setShowProfileMenu(v => !v); setShowNotifications(false); }}
                    className="relative flex-shrink-0 focus:outline-none group"
                    aria-label="Profile menu"
                  >
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={displayName}
                        className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover border-2 border-[#00d2ff]/40 shadow-[0_0_16px_rgba(0,210,255,0.25)] group-hover:border-[#00d2ff]/70 transition-all"
                      />
                    ) : (
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-br from-[#8b5cf6] to-[#00d2ff] flex items-center justify-center text-white text-base font-black shadow-[0_0_16px_rgba(0,210,255,0.25)] group-hover:shadow-[0_0_20px_rgba(0,210,255,0.4)] transition-all">
                        {initial}
                      </div>
                    )}
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 border-2 border-black rounded-full" />
                  </button>

                  {/* Profile dropdown */}
                  <AnimatePresence>
                    {showProfileMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute left-0 top-full mt-2 w-52 rounded-2xl z-50 overflow-hidden"
                        style={glassDropdown}
                      >
                        <div className="px-4 py-3 border-b border-white/[0.06]">
                          <div className="text-white font-bold text-sm truncate">{playerName}</div>
                          {playerUsername && (
                            <div className="text-[#00d2ff] text-[10px] font-mono tracking-widest truncate">@{playerUsername}</div>
                          )}
                          <div className="text-gray-600 text-[10px] font-mono mt-0.5">LVL {playerLevel}</div>
                        </div>
                        <div className="p-1">
                          {onEditProfile && (
                            <button
                              onClick={() => { onEditProfile(); setShowProfileMenu(false); }}
                              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.06] text-gray-300 hover:text-white transition-colors text-xs font-mono group"
                            >
                              <Edit3 size={13} className="text-[#00d2ff]" />
                              <span className="tracking-wide">EDIT PROFILE</span>
                            </button>
                          )}
                          {onAdminRequest && (
                            <button
                              onClick={() => { onAdminRequest(); setShowProfileMenu(false); }}
                              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.06] text-gray-500 hover:text-gray-300 transition-colors text-xs font-mono"
                            >
                              <ChevronRight size={13} />
                              <span className="tracking-wide">ADMIN PANEL</span>
                            </button>
                          )}
                          <div className="h-px bg-white/[0.06] my-1" />
                          <button
                            onClick={() => { if (onLogout) onLogout(); setShowProfileMenu(false); }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors text-xs font-mono"
                          >
                            <LogOut size={13} />
                            <span className="tracking-wide">LOG OUT</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="min-w-0">
                  <div className="text-[10px] text-gray-500 font-mono tracking-widest leading-none mb-0.5 uppercase">Hello</div>
                  <div className="text-white font-black text-base sm:text-lg leading-none tracking-tight truncate max-w-[100px] sm:max-w-[160px] uppercase">
                    {displayName}
                  </div>
                  {streak > 0 && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Flame size={9} className="fill-orange-400 text-orange-400" />
                      <span className="font-mono text-[9px] font-bold text-orange-400">{streak}d streak</span>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT: Gold + Keys + Bell */}
              <div id="tut-gold-display" className="flex items-center gap-2 sm:gap-2.5">

                {/* Consumable item counts — desktop only */}
                {consumables && (
                  <div className="hidden sm:flex items-center gap-1">
                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                      <span style={{ fontSize: 11 }}>🧪</span>
                      <span className="font-mono text-[11px] font-bold text-red-300">{consumables.healthPotions}</span>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: 'rgba(0,210,255,0.08)', border: '1px solid rgba(0,210,255,0.2)' }}>
                      <span style={{ fontSize: 11 }}>📜</span>
                      <span className="font-mono text-[11px] font-bold text-cyan-300">{consumables.shadowScrolls}</span>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)' }}>
                      <span style={{ fontSize: 11 }}>⚡</span>
                      <span className="font-mono text-[11px] font-bold text-purple-300">{consumables.ultOrbs}</span>
                    </div>
                  </div>
                )}

                {/* Keys pill */}
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl"
                  style={{
                    background: 'linear-gradient(180deg, rgba(139,92,246,0.12) 0%, rgba(6,4,18,0.80) 100%)',
                    border: '1px solid rgba(139,92,246,0.25)',
                    boxShadow: 'inset 0 1px 0 rgba(139,92,246,0.15)',
                  }}
                >
                  <AnimatedKeyIcon size={15} />
                  <span className="font-mono text-xs sm:text-sm font-bold text-purple-300"><AnimatedCounter value={keys} /></span>
                </div>

                {/* Gold pill */}
                <button
                  id="gold-header-btn"
                  onClick={!headerDisabled ? onGoldClick : undefined}
                  disabled={headerDisabled}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl transition-all active:scale-95"
                  style={{
                    background: 'linear-gradient(180deg, rgba(234,179,8,0.12) 0%, rgba(10,7,0,0.80) 100%)',
                    border: '1px solid rgba(234,179,8,0.28)',
                    boxShadow: 'inset 0 1px 0 rgba(234,179,8,0.15)',
                  }}
                >
                  <AnimatedCoinIcon size={15} />
                  <span id="user-wallet-balance" className="font-mono text-xs sm:text-sm font-bold text-yellow-300"><AnimatedCounter value={gold} /></span>
                </button>

                {/* Bell */}
                <div className="relative" ref={notifRef}>
                  <button
                    onClick={handleOpenNotifications}
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all duration-200 border ${
                      showNotifications
                        ? 'bg-[#00d2ff]/15 border-[#00d2ff]/40 text-[#00d2ff]'
                        : 'bg-white/[0.05] border-white/[0.08] text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Bell size={16} />
                    {hasUnreadNotifications && (
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-black shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
                    )}
                  </button>

                  <AnimatePresence>
                    {showNotifications && (
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 w-76 rounded-2xl z-50 overflow-hidden"
                        style={{ ...glassDropdown, width: 288 }}
                      >
                        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                          <span className="text-white font-mono text-xs font-bold tracking-widest">NOTIFICATIONS</span>
                          <div className="flex items-center gap-2">
                            {notificationHistory.length > 0 && (
                              <span className="text-gray-600 text-[9px] font-mono">{notificationHistory.length}</span>
                            )}
                            {onClearNotificationHistory && notificationHistory.length > 0 && (
                              <button
                                onClick={onClearNotificationHistory}
                                className="text-gray-600 hover:text-red-400 transition-colors"
                                title="Clear all"
                              >
                                <Trash2 size={11} />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="max-h-72 overflow-y-auto">
                          {notificationHistory.length === 0 ? (
                            <div className="py-8 text-center">
                              <Bell size={20} className="text-gray-700 mx-auto mb-2" />
                              <p className="text-gray-600 text-xs font-mono">No notifications</p>
                            </div>
                          ) : (
                            notificationHistory.slice(0, 20).map(n => (
                              <div key={n.id} className="flex items-start gap-3 px-4 py-3 border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors">
                                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${notifDot[n.type] || 'bg-[#00d2ff]'}`} />
                                <div className="flex-1 min-w-0">
                                  <p className={`text-xs font-mono leading-relaxed ${notifTypeColor[n.type] || 'text-gray-300'}`}>
                                    {n.message}
                                  </p>
                                  {n.timestamp && (
                                    <p className="text-[9px] text-gray-700 font-mono mt-0.5">
                                      {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

              </div>
            </div>
          </motion.header>
        )}

        <main className={`max-w-7xl mx-auto flex flex-col min-h-screen ${!hideHeader ? 'pt-[68px] sm:pt-[72px]' : ''}`}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex-1 p-4 md:p-6"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
