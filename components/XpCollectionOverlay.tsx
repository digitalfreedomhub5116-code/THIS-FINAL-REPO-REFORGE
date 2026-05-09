import React, { useEffect, useRef, useState, useCallback } from 'react';

interface XpCollectionOverlayProps {
  startRect: DOMRect | null;
  xpGained: number;
  currentXp: number;
  requiredXp: number;
  level: number;
  onComplete: () => void;
}

const CRYSTAL_COLORS = ['#a855f7', '#00d4ff', '#00d4ff', '#33dfff', '#7c3aed'];

const CRYSTAL_SVG = (color: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
    <defs>
      <linearGradient id="cg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${color}" stop-opacity="1"/>
        <stop offset="100%" stop-color="#00d4ff" stop-opacity="0.8"/>
      </linearGradient>
      <filter id="glow">
        <feGaussianBlur stdDeviation="1.5" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <polygon points="10,1 19,10 10,19 1,10" fill="url(#cg)" filter="url(#glow)" stroke="rgba(255,255,255,0.4)" stroke-width="0.5"/>
  </svg>`;

/**
 * XpCollectionOverlay — flies crystals from quest card to the NAVBAR XP BAR.
 * No separate floating bar is rendered. The existing navbar bar is targeted.
 *
 * Flow:
 * 1. Force header visible
 * 2. Spawn crystals from startRect → fly to #navbar-xp-bar
 * 3. Pulse/glow the bar as crystals land
 * 4. Show floating "+XP" label near the bar
 * 5. After hold, call onComplete (which triggers coin animation)
 */
const XpCollectionOverlay: React.FC<XpCollectionOverlayProps> = ({
  startRect,
  xpGained,
  currentXp,
  requiredXp,
  level,
  onComplete,
}) => {
  const completedRef = useRef(false);

  useEffect(() => {
    if (!startRect || completedRef.current) return;
    completedRef.current = true;

    // ── 1. Force the header visible for the duration of the animation ──
    window.dispatchEvent(new CustomEvent('reforge:force-header', {
      detail: { duration: 3500 }
    }));

    // ── 2. Find the navbar XP bar ──
    const findBarWithRetry = (retries: number): DOMRect | null => {
      const bar = document.getElementById('navbar-xp-bar');
      if (bar) return bar.getBoundingClientRect();
      return null;
    };

    // Small delay to let header animate in
    const startDelay = setTimeout(() => {
      let barRect = findBarWithRetry(0);

      // Retry if header hasn't appeared yet
      if (!barRect) {
        const retryTimer = setTimeout(() => {
          barRect = findBarWithRetry(1);
          if (barRect) runCrystalAnimation(barRect);
          else {
            // Fallback: complete without animation
            setTimeout(onComplete, 300);
          }
        }, 300);
        return () => clearTimeout(retryTimer);
      }

      runCrystalAnimation(barRect);
    }, 350);

    function runCrystalAnimation(barRect: DOMRect) {
      const originX = startRect!.left + startRect!.width / 2;
      const originY = startRect!.top + startRect!.height / 2;
      const destX = barRect.left + barRect.width / 2;
      const destY = barRect.top + barRect.height / 2;

      const count = 18;
      let landed = 0;

      // ── 3. Create floating "+XP" label near the bar ──
      const xpLabel = document.createElement('div');
      xpLabel.style.cssText = `
        position:fixed; z-index:9999; pointer-events:none;
        left:${barRect.right + 8}px; top:${barRect.top - 4}px;
        font-family:monospace; font-weight:900; font-size:14px;
        color:#00d4ff; text-shadow:0 0 10px rgba(0,212,255,0.7);
        opacity:0; transform:translateY(4px);
        transition: opacity 0.3s, transform 0.3s;
      `;
      xpLabel.textContent = `+${xpGained} XP`;
      document.body.appendChild(xpLabel);

      // Show label after first few crystals land
      const showLabelAfter = Math.floor(count * 0.3);

      // ── 4. Spawn crystals ──
      for (let i = 0; i < count; i++) {
        const delay = i * 40;
        setTimeout(() => {
          const el = document.createElement('div');
          el.style.cssText = `position:fixed;width:20px;height:20px;left:${originX - 10}px;top:${originY - 10}px;z-index:9999;pointer-events:none;`;
          const color = CRYSTAL_COLORS[i % CRYSTAL_COLORS.length];
          el.innerHTML = CRYSTAL_SVG(color);
          document.body.appendChild(el);

          const dx = destX - originX;
          const dy = destY - originY;
          const midX = dx / 2 + (Math.random() - 0.5) * 80;
          const midY = dy / 2 - Math.abs(dx) * 0.3 - Math.random() * 40;
          const scatter = (Math.random() - 0.5) * 16;

          el.animate([
            { transform: 'translate(0,0) scale(0) rotate(0deg)', opacity: 0 },
            { transform: `translate(${midX}px,${midY}px) scale(1.3) rotate(${Math.random() * 180}deg)`, opacity: 1, offset: 0.45 },
            { transform: `translate(${dx + scatter}px,${dy + (Math.random() - 0.5) * 6}px) scale(0.4) rotate(${Math.random() * 360}deg)`, opacity: 0.6 },
          ], {
            duration: 650 + Math.random() * 200,
            easing: 'ease-in-out',
            fill: 'forwards',
          }).onfinish = () => {
            el.remove();
            landed++;

            // Pulse the XP bar on each crystal landing
            const bar = document.getElementById('navbar-xp-bar');
            if (bar) {
              bar.animate([
                { boxShadow: '0 0 12px rgba(0,212,255,0.6), 0 0 4px rgba(0,212,255,0.3) inset' },
                { boxShadow: '0 0 2px rgba(0,212,255,0.1)' },
              ], { duration: 200, easing: 'ease-out' });
            }

            // Show label after enough crystals
            if (landed >= showLabelAfter && xpLabel.style.opacity === '0') {
              xpLabel.style.opacity = '1';
              xpLabel.style.transform = 'translateY(0)';
            }

            // After all crystals land
            if (landed >= count) {
              // Hold the label visible, then clean up and complete
              setTimeout(() => {
                // Fade out label
                xpLabel.style.opacity = '0';
                xpLabel.style.transform = 'translateY(-8px)';
                setTimeout(() => {
                  xpLabel.remove();
                  onComplete();
                }, 400);
              }, 700);
            }
          };
        }, delay);
      }
    }

    return () => clearTimeout(startDelay);
  }, [startRect]);

  // This component renders nothing — all visuals are imperative DOM animations
  return null;
};

export default XpCollectionOverlay;
