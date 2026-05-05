import React, { useState, useRef, useEffect } from 'react';
import { LogOut, Edit3, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SystemNotification, ReplitUser } from '../types';
import { useThemeContext } from '../hooks/useTheme';

const AnimatedCoinIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <div style={{ width: size, height: size, flexShrink: 0 }}>
    <img src="/assets/gold-coin.png" alt="Gold" width={size} height={size} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} loading="eager" draggable={false} />
  </div>
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
  maxKeys?: number;
  currentXp?: number;
  requiredXp?: number;

  consumables?: Record<string, never>;
  replitUser?: ReplitUser;
  notificationHistory?: StoredNotification[];
  hasUnreadNotifications?: boolean;
  onGoldClick?: () => void;
  onLogout?: () => void;
  onEditProfile?: () => void;
  playerAvatarUrl?: string;
  onMarkNotificationsRead?: () => void;
  onClearNotificationHistory?: () => void;
  hideHeader?: boolean;
  headerDisabled?: boolean;
  forceHeaderVisible?: boolean;
  hideAmbientGlow?: boolean;
}

const glassDropdownDark = {
  background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(10,10,18,0.95) 15%, rgba(6,6,14,0.98) 100%)',
  backdropFilter: 'blur(24px) saturate(180%)',
  WebkitBackdropFilter: 'blur(24px) saturate(180%)',
  border: '1px solid rgba(255,255,255,0.10)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 24px 64px rgba(0,0,0,0.85)',
};
const glassDropdownLight = {
  background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(245,245,247,0.98) 100%)',
  backdropFilter: 'blur(24px) saturate(180%)',
  WebkitBackdropFilter: 'blur(24px) saturate(180%)',
  border: '1px solid rgba(0,0,0,0.08)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
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
  maxKeys = 100,
  currentXp = 0,
  requiredXp = 100,

  consumables,
  replitUser,
  playerAvatarUrl,
  notificationHistory = [],
  hasUnreadNotifications = false,
  onGoldClick,
  onLogout,
  onEditProfile,
  onMarkNotificationsRead,
  onClearNotificationHistory,
  hideHeader = false,
  headerDisabled = false,
  forceHeaderVisible = false,
  hideAmbientGlow = false,
}) => {
  const { theme } = useThemeContext();
  const isLight = theme === 'light';
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
  const levelFillPercent = Math.min(100, (currentXp / Math.max(1, requiredXp)) * 100);

  const notifTypeColor: Record<string, string> = {
    SUCCESS: 'text-green-400',
    WARNING: 'text-yellow-400',
    DANGER: 'text-red-400',
    LEVEL_UP: 'text-yellow-300',
    SYSTEM: 'text-[#00d4ff]',
    PURCHASE: 'text-[#00d4ff]'
  };

  const notifDot: Record<string, string> = {
    SUCCESS: 'bg-green-400',
    WARNING: 'bg-yellow-400',
    DANGER: 'bg-red-400',
    LEVEL_UP: 'bg-yellow-300',
    SYSTEM: 'bg-[#00d4ff]',
    PURCHASE: 'bg-[#00d4ff]'
  };

  useEffect(() => {
    const handleScroll = () => {
      if (forceHeaderVisible) return; // Don't hide during tutorial
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
  }, [forceHeaderVisible]);

  // Force header visible when tutorial requires it
  useEffect(() => {
    if (forceHeaderVisible) setHeaderVisible(true);
  }, [forceHeaderVisible]);

  const COIN_IMG_SRC = '/assets/gold-coin.png';

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
          const SIZE = 28;
          const coin = document.createElement('div');
          coin.style.cssText = `position:fixed;width:${SIZE}px;height:${SIZE}px;left:${startX - SIZE/2}px;top:${startY - SIZE/2}px;z-index:9999;pointer-events:none;overflow:hidden;`;
          const img = document.createElement('img');
          img.src = COIN_IMG_SRC;
          img.style.cssText = 'width:100%;height:100%;object-fit:contain;';
          coin.appendChild(img);
          document.body.appendChild(coin);
          const scatterX = (Math.random() - 0.5) * 60;
          const scatterY = (Math.random() - 0.5) * 60;
          const midX = (startX + endX) / 2 - startX + (Math.random() - 0.5) * 60;
          const midY = Math.min(startY, endY) - 80 - Math.random() * 60 - startY;
          const flyAnim = coin.animate([
            { transform: 'translate(0,0) scale(0.5)', opacity: 0 },
            { transform: `translate(${scatterX}px,${scatterY}px) scale(1)`, opacity: 1, offset: 0.12 },
            { transform: `translate(${midX}px,${midY}px) scale(1.1)`, offset: 0.5 },
            { transform: `translate(${endX - startX}px,${endY - startY}px) scale(0.5)`, opacity: 0 },
          ], {
            duration: 900 + Math.random() * 300,
            easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
            fill: 'forwards',
          });
          flyAnim.onfinish = () => coin.remove();
        }, i * 60);
      }
    };
    window.addEventListener('reforge:coin-earned', handleCoinEarned);


    const COIN_LOST_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 14 14"><circle cx="7" cy="7" r="6" fill="none" stroke="#ef4444" stroke-width="1.5"/><text x="7" y="10.5" text-anchor="middle" font-size="6" font-weight="900" fill="#ef4444" font-family="monospace">◈</text></svg>`;
    const handleCoinLost = (e: Event) => {
      const detail = (e as CustomEvent).detail as { amount: number; sourceRect: DOMRect | null };
      const walletEl = document.getElementById('user-wallet-balance');
      if (!walletEl) return;
      setHeaderVisible(true);
      const walletRect = walletEl.getBoundingClientRect();
      const startX = walletRect.left + walletRect.width / 2;
      const startY = walletRect.top + walletRect.height / 2;
      const COIN_COUNT = 10;
      for (let i = 0; i < COIN_COUNT; i++) {
        setTimeout(() => {
          const coin = document.createElement('div');
          coin.style.cssText = `position:fixed;width:18px;height:18px;left:${startX - 9}px;top:${startY - 9}px;z-index:9999;pointer-events:none;`;
          coin.innerHTML = COIN_LOST_SVG;
          document.body.appendChild(coin);
          const endX = (Math.random() - 0.5) * 200;
          const endY = 150 + Math.random() * 200;
          const midX = (Math.random() - 0.5) * 100;
          const midY = -30 - Math.random() * 40;
          coin.animate([
            { transform: 'translate(0,0) scale(1)', opacity: 1 },
            { transform: `translate(${midX}px,${midY}px) scale(1.2)`, opacity: 1, offset: 0.2 },
            { transform: `translate(${endX}px,${endY}px) scale(0.3)`, opacity: 0 },
          ], {
            duration: 1000 + Math.random() * 400,
            easing: 'cubic-bezier(0.4, 0, 1, 1)',
            fill: 'forwards',
          }).onfinish = () => coin.remove();
        }, i * 50);
      }
      // Damage number overlay
      if (detail.amount > 0) {
        const dmg = document.createElement('div');
        const targetRect = detail.sourceRect || walletRect;
        const dmgX = targetRect.left + targetRect.width / 2;
        const dmgY = targetRect.top;
        dmg.style.cssText = `position:fixed;left:${dmgX}px;top:${dmgY}px;z-index:9999;pointer-events:none;font-family:monospace;font-weight:900;font-size:24px;color:#ef4444;text-shadow:0 0 12px rgba(239,68,68,0.6);transform:translate(-50%,0);`;
        dmg.textContent = `-${detail.amount}G`;
        document.body.appendChild(dmg);
        dmg.animate([
          { transform: 'translate(-50%,0) scale(0.5)', opacity: 0 },
          { transform: 'translate(-50%,-10px) scale(1.2)', opacity: 1, offset: 0.15 },
          { transform: 'translate(-50%,-60px) scale(1)', opacity: 1, offset: 0.6 },
          { transform: 'translate(-50%,-100px) scale(0.8)', opacity: 0 },
        ], {
          duration: 1800,
          easing: 'ease-out',
          fill: 'forwards',
        }).onfinish = () => dmg.remove();
      }
      // Flash wallet red briefly
      walletEl.style.transition = 'filter 0.15s';
      walletEl.style.filter = 'brightness(1.5) hue-rotate(-30deg)';
      setTimeout(() => { walletEl.style.filter = ''; }, 400);
    };
    window.addEventListener('reforge:coin-lost', handleCoinLost);

    return () => {
      window.removeEventListener('reforge:coin-earned', handleCoinEarned);
      window.removeEventListener('reforge:coin-lost', handleCoinLost);
      window.removeEventListener('reforge:coin-lost', handleCoinLost);
    };
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
    <div className="min-h-screen bg-system-bg font-sans overflow-x-hidden" style={{ color: 'var(--color-text-primary)' }}>

      {/* Background ambient glow — hidden on tabs that request pitch-black bg (e.g. PROFILE) */}
      {!hideAmbientGlow && (
        <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[20%] w-96 h-96 bg-system-accent/10 rounded-full blur-[100px]" />
          <div className="absolute bottom-[10%] right-[10%] w-96 h-96 bg-system-neon/10 rounded-full blur-[100px]" />
          {isShadowMonarch && (
            <div className="absolute inset-0 opacity-30 mix-blend-screen">
              <div className="absolute inset-0 bg-gradient-to-t from-purple-900/20 to-transparent animate-pulse" />
            </div>
          )}
        </div>
      )}

      {/* Navigation (Fixed) */}
      {navigation}

      {/* Main content */}
      <div className={`relative z-10 transition-all duration-300 ${navigation ? 'md:pl-64 md:pb-0' : ''}`} style={navigation ? { paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' } : undefined}>

        {/* TOP BAR */}
        {!hideHeader && (
          <motion.header
            id="reforge-top-nav"
            animate={{ y: headerVisible ? 0 : '-100%' }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className={`fixed top-0 right-0 z-40 ${navigation ? 'left-0 md:left-64' : 'left-0'}`}
            style={{
              paddingTop: 'env(safe-area-inset-top, 0px)',
              background: isLight
                ? 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(245,245,247,0.98) 100%)'
                : 'linear-gradient(180deg, rgba(255,255,255,0.055) 0%, rgba(8,8,18,0.88) 18%, rgba(4,4,12,0.96) 100%)',
              backdropFilter: 'blur(28px) saturate(180%)',
              WebkitBackdropFilter: 'blur(28px) saturate(180%)',
              borderBottom: `1px solid var(--color-border-subtle)`,
              boxShadow: isLight
                ? '0 1px 4px rgba(0,0,0,0.06)'
                : 'inset 0 1px 0 rgba(255,255,255,0.07), 0 8px 32px rgba(0,0,0,0.5)',
            }}
          >
            {/* Specular top edge */}
            <div className="absolute top-0 left-0 right-0 h-px pointer-events-none" style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.18) 30%, rgba(0,212,255,0.12) 55%, rgba(0,212,255,0.10) 75%, transparent 100%)' }} />
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(135deg, rgba(0,212,255,0.02) 0%, transparent 50%, rgba(0,212,255,0.02) 100%)' }} />

            <div className="flex items-center justify-between px-4 py-2.5 sm:px-6 sm:py-3 max-w-7xl mx-auto relative z-10">

              {/* LEFT: Avatar with Duolingo-style Level Progress Bar */}
              <div className="flex items-center min-w-0 flex-1" ref={profileMenuRef}>
                <div className="relative flex items-start">
                  {/* Avatar with ring border */}
                  <button
                    onClick={() => { setShowProfileMenu(v => !v); setShowNotifications(false); }}
                    className="relative flex-shrink-0 focus:outline-none group z-20"
                    aria-label="Profile menu"
                  >
                    <div
                      className="rounded-full"
                      style={{
                        width: 44, height: 44,
                        padding: 2,
                        border: '2.5px solid #00d4ff',
                        boxShadow: '0 0 12px rgba(0,212,255,0.2)',
                      }}
                    >
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={displayName}
                          className="w-full h-full rounded-full object-cover group-hover:brightness-110 transition-all"
                        />
                      ) : (
                        <div className="w-full h-full rounded-full bg-gradient-to-br from-[#00d4ff] to-[#5a9ab5] flex items-center justify-center text-white text-sm font-black group-hover:brightness-110 transition-all">
                          {initial}
                        </div>
                      )}
                    </div>
                  </button>

                  {/* Lv label + thin bar (to the right of avatar, bottom-aligned) */}
                  <div style={{ marginLeft: -4, paddingTop: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {/* Level label */}
                    <span
                      className="font-mono font-black text-white"
                      style={{ fontSize: 12, marginLeft: 12, textShadow: '0 1px 4px rgba(0,0,0,0.6)', letterSpacing: '0.02em' }}
                    >
                      Lv.{playerLevel}
                    </span>

                    {/* Bar row with connecting dot */}
                    <div className="flex items-center">
                      {/* Connecting dot — visually links avatar ring to bar */}
                      <div
                        style={{
                          width: 11, height: 11, borderRadius: '50%',
                          background: '#00d4ff',
                          border: '2.5px solid rgba(6,6,16,0.95)',
                          flexShrink: 0,
                          marginRight: -4,
                          position: 'relative',
                          zIndex: 5,
                          boxShadow: '0 0 6px rgba(0,212,255,0.3)',
                        }}
                      />

                      {/* Thin progress track */}
                      <div
                        style={{
                          width: 100, height: 10, borderRadius: 999,
                          background: 'rgba(0,212,255,0.10)',
                          border: '2.5px solid rgba(0,212,255,0.30)',
                          overflow: 'hidden',
                          position: 'relative',
                        }}
                      >
                        {/* Cyan fill */}
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${levelFillPercent}%` }}
                          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                          style={{
                            position: 'absolute', top: 0, left: 0, height: '100%',
                            borderRadius: 999,
                            background: 'linear-gradient(90deg, #5a9ab5 0%, #00d4ff 40%, #00d4ff 100%)',
                            boxShadow: '0 0 8px rgba(0,212,255,0.3)',
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Profile dropdown */}
                  <AnimatePresence>
                    {showProfileMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute left-0 top-full mt-2 w-52 rounded-2xl z-50 overflow-hidden"
                        style={isLight ? glassDropdownLight : glassDropdownDark}
                      >
                        <div className="px-4 py-3 border-b border-white/[0.06]">
                          <div className="text-white font-heading font-bold text-sm truncate">{playerName}</div>
                          {playerUsername && (
                            <div className="text-[#00d4ff] text-[10px] font-medium tracking-widest truncate">@{playerUsername}</div>
                          )}
                          <div className="text-gray-600 text-[10px] font-mono mt-0.5">LVL {playerLevel}</div>
                        </div>
                        <div className="p-1">
                          {onEditProfile && (
                            <button
                              onClick={() => { onEditProfile(); setShowProfileMenu(false); }}
                              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.06] text-gray-300 hover:text-white transition-colors text-xs font-mono group"
                            >
                              <Edit3 size={13} className="text-[#00d4ff]" />
                              <span className="tracking-wide">EDIT PROFILE</span>
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
              </div>

              {/* RIGHT: Keys + Streak + Gold */}
              <div id="tut-gold-display" className="flex items-center gap-3 flex-shrink-0">

                {/* Keys */}
                <div className="flex items-center gap-1">
                  <img src="/assets/key-icon.png" alt="Keys" width={20} height={20} style={{ width: 20, height: 20, objectFit: 'contain', flexShrink: 0 }} loading="eager" draggable={false} />
                  <span className="font-mono text-[16px] font-black whitespace-nowrap" style={{ color: '#00d4ff', textShadow: '0 0 6px rgba(0,212,255,0.3)' }}><AnimatedCounter value={keys} /></span>
                </div>

                {/* Streak */}
                <div id="user-streak-count" className="flex items-center gap-1">
                  <img src="/assets/fire-image.png" alt="Streak" width={20} height={20} style={{ width: 20, height: 20, objectFit: 'contain', flexShrink: 0 }} loading="eager" draggable={false} />
                  <span className="font-mono text-[16px] font-black text-orange-400 whitespace-nowrap" style={{ textShadow: '0 0 6px rgba(249,115,22,0.3)' }}><AnimatedCounter value={streak} /></span>
                </div>

                {/* Gold */}
                <button
                  id="gold-header-btn"
                  onClick={!headerDisabled ? onGoldClick : undefined}
                  disabled={headerDisabled}
                  className="flex items-center gap-px transition-all active:scale-95"
                >
                  <div className="flex items-center justify-center" style={{ width: 20 }}>
                    <AnimatedCoinIcon size={20} />
                  </div>
                  <span id="user-wallet-balance" className="font-mono text-[16px] font-black whitespace-nowrap" style={{ color: '#F0B232', textShadow: '0 0 6px rgba(240,178,50,0.3)' }}><AnimatedCounter value={gold} /></span>
                </button>

              </div>
            </div>
          </motion.header>
        )}

        <main className={`max-w-7xl mx-auto flex flex-col min-h-screen-safe ${!hideHeader ? 'pt-[72px] sm:pt-[76px]' : ''}`} style={!hideHeader ? { paddingTop: 'calc(72px + env(safe-area-inset-top, 0px))' } : undefined}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex-1 p-4 md:p-6 lg:p-8 tablet-container"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
