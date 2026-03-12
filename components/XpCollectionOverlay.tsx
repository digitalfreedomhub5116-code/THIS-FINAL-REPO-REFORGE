import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface XpCollectionOverlayProps {
  startRect: DOMRect | null;
  xpGained: number;
  currentXp: number;
  requiredXp: number;
  level: number;
  onComplete: () => void;
}

const CRYSTAL_COLORS = ['#a855f7', '#8b5cf6', '#00d2ff', '#c084fc', '#7c3aed'];

const CRYSTAL_SVG = (color: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
    <defs>
      <linearGradient id="cg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${color}" stop-opacity="1"/>
        <stop offset="100%" stop-color="#00d2ff" stop-opacity="0.8"/>
      </linearGradient>
      <filter id="glow">
        <feGaussianBlur stdDeviation="1.5" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <polygon points="10,1 19,10 10,19 1,10" fill="url(#cg)" filter="url(#glow)" stroke="rgba(255,255,255,0.4)" stroke-width="0.5"/>
  </svg>`;

const XpCollectionOverlay: React.FC<XpCollectionOverlayProps> = ({
  startRect,
  xpGained,
  currentXp,
  requiredXp,
  level,
  onComplete,
}) => {
  const [showBar, setShowBar] = useState(false);
  const [fillPercent, setFillPercent] = useState(0);
  const [displayXp, setDisplayXp] = useState(0);
  const barRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  const willLevelUp = currentXp + xpGained >= requiredXp;
  const startPercent = Math.min(100, (currentXp / requiredXp) * 100);
  const endPercent = willLevelUp ? 100 : Math.min(100, ((currentXp + xpGained) / requiredXp) * 100);

  const spawnCrystals = useCallback((barRect: DOMRect) => {
    if (!startRect) return;

    const count = willLevelUp ? 35 : 20;
    const barCenterX = barRect.left + barRect.width / 2;
    const barCenterY = barRect.top + barRect.height / 2;
    const originX = startRect.left + startRect.width / 2;
    const originY = startRect.top + startRect.height / 2;

    for (let i = 0; i < count; i++) {
      const delay = i * 35;
      setTimeout(() => {
        const el = document.createElement('div');
        el.style.cssText = `position:fixed;width:20px;height:20px;left:${originX - 10}px;top:${originY - 10}px;z-index:9999;pointer-events:none;`;
        const color = CRYSTAL_COLORS[i % CRYSTAL_COLORS.length];
        el.innerHTML = CRYSTAL_SVG(color);

        document.body.appendChild(el);

        const dx = barCenterX - originX;
        const dy = barCenterY - originY;
        const midX = dx / 2 + (Math.random() - 0.5) * 80;
        const midY = dy / 2 - Math.abs(dx) * 0.3 - Math.random() * 40;
        const scatter = (Math.random() - 0.5) * 24;

        el.animate(
          [
            { transform: 'translate(0,0) scale(0) rotate(0deg)', opacity: 0 },
            { transform: `translate(${midX}px,${midY}px) scale(1.3) rotate(${Math.random() * 180}deg)`, opacity: 1, offset: 0.45 },
            { transform: `translate(${dx + scatter}px,${dy + (Math.random() - 0.5) * 8}px) scale(0.4) rotate(${Math.random() * 360}deg)`, opacity: 0.6 },
          ],
          { duration: 700 + Math.random() * 200, easing: 'ease-in-out', fill: 'forwards' }
        ).onfinish = () => el.remove();
      }, delay);
    }
  }, [startRect, willLevelUp]);

  useEffect(() => {
    if (!startRect) return;

    // Show bar immediately
    setShowBar(true);
    setFillPercent(startPercent);

    // After bar mounts, read its position and spawn crystals
    const spawnTimer = setTimeout(() => {
      if (!barRef.current) return;
      const barRect = barRef.current.getBoundingClientRect();
      spawnCrystals(barRect);

      // XP fill starts as first crystal lands (~400ms after spawn)
      const fillTimer = setTimeout(() => {
        setFillPercent(endPercent);

        // Count up the XP label
        const fillDuration = 900;
        const start = performance.now();
        const countUp = (now: number) => {
          const p = Math.min((now - start) / fillDuration, 1);
          const eased = 1 - Math.pow(1 - p, 2);
          setDisplayXp(Math.round(xpGained * eased));
          if (p < 1) rafRef.current = requestAnimationFrame(countUp);
        };
        rafRef.current = requestAnimationFrame(countUp);
      }, 400);

      const holdTime = willLevelUp ? 2500 : 1800;
      const exitTimer = setTimeout(() => {
        setShowBar(false);
        setTimeout(onComplete, 500);
      }, 400 + holdTime);

      return () => { clearTimeout(fillTimer); clearTimeout(exitTimer); };
    }, 150);

    return () => {
      clearTimeout(spawnTimer);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [startRect]);

  const barInitial = willLevelUp ? { scale: 0.85, opacity: 0 } : { y: -120, opacity: 0 };
  const barAnimate = willLevelUp ? { scale: 1, opacity: 1 } : { y: 0, opacity: 1 };
  const barExit = willLevelUp
    ? { scale: 0.7, opacity: 0, transition: { duration: 0.4 } }
    : { y: -120, opacity: 0, transition: { duration: 0.4 } };

  return (
    <div className={`fixed inset-0 z-[200] flex justify-center pointer-events-none ${willLevelUp ? 'items-center' : 'items-start pt-20'}`}>
      <AnimatePresence>
        {showBar && (
          <motion.div
            ref={barRef}
            initial={barInitial}
            animate={barAnimate}
            exit={barExit}
            transition={{ type: 'spring', stiffness: 140, damping: 20 }}
            className={`relative bg-black/96 backdrop-blur-xl rounded-2xl p-4 pointer-events-auto z-[202] ${
              willLevelUp
                ? 'w-[85%] max-w-lg border border-[#00d2ff]/40 shadow-[0_0_60px_rgba(0,210,255,0.25)]'
                : 'w-[88%] max-w-md border border-[#8b5cf6]/30 shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_20px_rgba(139,92,246,0.2)]'
            }`}
          >
            {/* Header row */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6] animate-pulse shadow-[0_0_6px_#8b5cf6]" />
                <span className="font-mono text-[10px] font-black tracking-[0.25em] text-white/70 uppercase">
                  {willLevelUp ? 'System Overload' : 'XP Absorbed'}
                </span>
              </div>
              <motion.span
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
                className={`font-mono text-sm font-black ${willLevelUp ? 'text-[#00d2ff]' : 'text-[#8b5cf6]'}`}
                style={{ textShadow: willLevelUp ? '0 0 10px rgba(0,210,255,0.8)' : '0 0 10px rgba(139,92,246,0.8)' }}
              >
                +{displayXp} XP
              </motion.span>
            </div>

            {/* Progress bar */}
            <div className={`relative bg-white/5 rounded-full overflow-hidden border border-white/10 ${willLevelUp ? 'h-5' : 'h-3'}`}>
              <motion.div
                className="absolute top-0 left-0 h-full rounded-full"
                style={{
                  background: 'linear-gradient(90deg, #8b5cf6, #7c3aed, #00d2ff)',
                  backgroundSize: '200% 100%',
                }}
                initial={{ width: `${startPercent}%` }}
                animate={{ width: `${fillPercent}%` }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/60 blur-[2px]" />
                {willLevelUp && fillPercent >= 99 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ duration: 0.4, repeat: Infinity }}
                    className="absolute inset-0 bg-white/30"
                  />
                )}
              </motion.div>
              <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none">
                <span className="font-mono text-[8px] font-bold text-white/40 mix-blend-overlay">LVL {level}</span>
                <span className="font-mono text-[8px] font-bold text-white/40 mix-blend-overlay">LVL {level + 1}</span>
              </div>
            </div>

            {/* XP count label */}
            <div className="mt-2 flex justify-end">
              <span className="font-mono text-[10px] text-white/40">
                {Math.min(currentXp + Math.round((fillPercent / 100) * requiredXp), requiredXp)}&nbsp;/&nbsp;{requiredXp} XP
              </span>
            </div>

            {willLevelUp && fillPercent >= 99 && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 text-center font-mono text-xs font-black tracking-[0.3em] text-[#00d2ff]"
                style={{ textShadow: '0 0 12px rgba(0,210,255,0.9)' }}
              >
                LEVEL UP
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default XpCollectionOverlay;
