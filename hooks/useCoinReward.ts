
import React, { useCallback } from 'react';

// SVG string for the coin to keep it lightweight and zero-dependency
const COIN_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#eab308" stroke="#fcd34d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="10"></circle>
  <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"></path>
  <path d="M12 18V6"></path>
</svg>
`;

export const useCoinReward = () => {
  const triggerCoinReward = useCallback((origin: React.MouseEvent<HTMLElement> | DOMRect, targetId: string = 'user-wallet-balance') => {
    let originRect: DOMRect;

    // Determine if origin is an Event or a Rect
    if ((origin as React.MouseEvent).currentTarget) {
        originRect = (origin as React.MouseEvent).currentTarget.getBoundingClientRect();
    } else {
        originRect = origin as DOMRect;
    }

    const targetEl = document.getElementById(targetId);
    
    if (!targetEl) return;
    const targetRect = targetEl.getBoundingClientRect();

    // Center points
    const startX = originRect.left + originRect.width / 2;
    const startY = originRect.top + originRect.height / 2;
    const endX = targetRect.left + targetRect.width / 2;
    const endY = targetRect.top + targetRect.height / 2;

    const COIN_COUNT = 12;

    for (let i = 0; i < COIN_COUNT; i++) {
      const coin = document.createElement('div');
      coin.classList.add('coin-particle');
      coin.innerHTML = COIN_SVG;
      
      // Initial Position (Center of Button/Rect)
      coin.style.position = 'fixed';
      coin.style.left = `${startX}px`;
      coin.style.top = `${startY}px`;
      coin.style.width = '24px';
      coin.style.height = '24px';
      coin.style.zIndex = '9999';
      coin.style.pointerEvents = 'none';
      // Start small
      coin.style.transform = 'scale(0)'; 
      
      document.body.appendChild(coin);

      // Random scatter values for the "Explosion"
      const scatterX = (Math.random() - 0.5) * 100; // +/- 50px
      const scatterY = (Math.random() - 0.5) * 100; // +/- 50px

      // The Flight Path
      // We use Web Animations API for complex pathing
      const midX = (startX + endX) / 2 + (Math.random() - 0.5) * 100;
      // Control point is higher than both start and end to create an arc (gravity effect)
      const midY = Math.min(startY, endY) - 150 - Math.random() * 100; 

      // Slower Duration: 1.5s to 2.3s
      const duration = 1500 + Math.random() * 800; 
      const delay = Math.random() * 300; // Slightly increased stagger delay

      const animation = coin.animate([
        { 
          transform: `translate(0, 0) scale(0.5)`,
          opacity: 0 
        },
        { 
          transform: `translate(${scatterX}px, ${scatterY}px) scale(1)`,
          opacity: 1,
          offset: 0.1 // Burst out quickly 
        },
        {
          transform: `translate(${midX - startX}px, ${midY - startY}px) scale(1.1)`,
          offset: 0.5 // Peak of the arc
        },
        { 
          transform: `translate(${endX - startX}px, ${endY - startY}px) scale(0.8)`,
          opacity: 1,
          offset: 1 // Arrive at target
        }
      ], {
        duration: duration,
        delay: delay,
        easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)', // Smooth acceleration
        fill: 'forwards'
      });

      animation.onfinish = () => {
        // Cleanup coin
        coin.remove();
        
        // Impact Feedback
        targetEl.classList.remove('wallet-bump');
        // Trigger reflow
        void targetEl.offsetWidth;
        targetEl.classList.add('wallet-bump');
      };
    }
  }, []);

  return { triggerCoinReward };
};
