import React, { useEffect, useRef } from 'react';

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
 * FAST version — minimal delays, snappy feel.
 *
 * Flow:
 * 1. Force header visible (immediate)
 * 2. Spawn crystals from startRect → fly to #navbar-xp-bar (rapid burst)
 * 3. Pulse/glow the bar as crystals land
 * 4. Show floating "+XP" label
 * 5. Quick hold → onComplete (triggers coin animation)
 */
const XpCollectionOverlay: React.FC<XpCollectionOverlayProps> = ({
  startRect,
  xpGained,
  onComplete,
}) => {
  const completedRef = useRef(false);

  useEffect(() => {
    if (!startRect || completedRef.current) return;
    completedRef.current = true;

    // ── 1. Force header visible IMMEDIATELY ──
    window.dispatchEvent(new CustomEvent('reforge:force-header', {
      detail: { duration: 2000 }
    }));

    // ── 2. Find the bar — try instantly, retry once after a short wait ──
    const tryRun = () => {
      const bar = document.getElementById('navbar-xp-bar');
      if (bar) {
        runCrystalAnimation(bar.getBoundingClientRect());
        return true;
      }
      return false;
    };

    // Try immediately (header may already be visible from scroll position)
    if (!tryRun()) {
      // Retry after minimal header slide-in time
      const t = setTimeout(() => {
        if (!tryRun()) {
          // Last resort: skip animation, move to coins
          onComplete();
        }
      }, 180);
      return () => clearTimeout(t);
    }

    function runCrystalAnimation(barRect: DOMRect) {
      const originX = startRect!.left + startRect!.width / 2;
      const originY = startRect!.top + startRect!.height / 2;
      const destX = barRect.left + barRect.width / 2;
      const destY = barRect.top + barRect.height / 2;

      const count = 12; // Fewer crystals = faster burst
      let landed = 0;

      // ── 3. Create floating "+XP" label ──
      const xpLabel = document.createElement('div');
      xpLabel.style.cssText = `
        position:fixed; z-index:9999; pointer-events:none;
        left:${barRect.right + 8}px; top:${barRect.top - 4}px;
        font-family:monospace; font-weight:900; font-size:14px;
        color:#00d4ff; text-shadow:0 0 10px rgba(0,212,255,0.7);
        opacity:0; transform:translateY(4px);
        transition: opacity 0.2s, transform 0.2s;
      `;
      xpLabel.textContent = `+${xpGained} XP`;
      document.body.appendChild(xpLabel);

      const showLabelAfter = 3; // Show label early

      // ── 4. Rapid-fire crystals ──
      for (let i = 0; i < count; i++) {
        const delay = i * 22; // 22ms stagger (was 40ms)
        setTimeout(() => {
          const el = document.createElement('div');
          el.style.cssText = `position:fixed;width:20px;height:20px;left:${originX - 10}px;top:${originY - 10}px;z-index:9999;pointer-events:none;`;
          const color = CRYSTAL_COLORS[i % CRYSTAL_COLORS.length];
          el.innerHTML = CRYSTAL_SVG(color);
          document.body.appendChild(el);

          const dx = destX - originX;
          const dy = destY - originY;
          const midX = dx / 2 + (Math.random() - 0.5) * 60;
          const midY = dy / 2 - Math.abs(dx) * 0.25 - Math.random() * 30;
          const scatter = (Math.random() - 0.5) * 12;

          el.animate([
            { transform: 'translate(0,0) scale(0) rotate(0deg)', opacity: 0 },
            { transform: `translate(${midX}px,${midY}px) scale(1.2) rotate(${Math.random() * 180}deg)`, opacity: 1, offset: 0.4 },
            { transform: `translate(${dx + scatter}px,${dy + (Math.random() - 0.5) * 6}px) scale(0.3) rotate(${Math.random() * 360}deg)`, opacity: 0.6 },
          ], {
            duration: 380 + Math.random() * 120, // 380-500ms (was 650-850ms)
            easing: 'ease-in',
            fill: 'forwards',
          }).onfinish = () => {
            el.remove();
            landed++;

            // Pulse the XP bar
            const bar = document.getElementById('navbar-xp-bar');
            if (bar) {
              bar.animate([
                { boxShadow: '0 0 14px rgba(0,212,255,0.7), 0 0 6px rgba(0,212,255,0.4) inset' },
                { boxShadow: '0 0 2px rgba(0,212,255,0.1)' },
              ], { duration: 150, easing: 'ease-out' });
            }

            // Show label early
            if (landed >= showLabelAfter && xpLabel.style.opacity === '0') {
              xpLabel.style.opacity = '1';
              xpLabel.style.transform = 'translateY(0)';
            }

            // After all crystals land → quick hold → done
            if (landed >= count) {
              setTimeout(() => {
                xpLabel.style.opacity = '0';
                xpLabel.style.transform = 'translateY(-8px)';
                setTimeout(() => {
                  xpLabel.remove();
                  onComplete();
                }, 200); // 200ms fade (was 400ms)
              }, 350); // 350ms hold (was 700ms)
            }
          };
        }, delay);
      }
    }
  }, [startRect]);

  return null;
};

export default XpCollectionOverlay;
