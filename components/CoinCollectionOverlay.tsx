import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CoinCollectionOverlayProps {
  goldGained: number;
  startRect: DOMRect | null;
  onComplete: () => void;
}

const COIN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#eab308" stroke="#fcd34d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"></path><path d="M12 18V6"></path></svg>`;

const CoinCollectionOverlay: React.FC<CoinCollectionOverlayProps> = ({
  goldGained,
  startRect,
  onComplete,
}) => {
  const [show, setShow] = useState(false);
  const [displayGold, setDisplayGold] = useState(0);
  const overlayRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    setShow(true);

    const spawnTimer = setTimeout(() => {
      if (!overlayRef.current || !startRect) return;

      const destRect = overlayRef.current.getBoundingClientRect();
      const endX = destRect.left + destRect.width / 2;
      const endY = destRect.top + destRect.height / 2;
      const startX = startRect.left + startRect.width / 2;
      const startY = startRect.top + startRect.height / 2;

      const COIN_COUNT = 8;
      for (let i = 0; i < COIN_COUNT; i++) {
        const delay = i * 60;
        setTimeout(() => {
          const coin = document.createElement('div');
          coin.style.cssText = `position:fixed;width:20px;height:20px;left:${startX - 10}px;top:${startY - 10}px;z-index:9999;pointer-events:none;`;
          coin.innerHTML = COIN_SVG;
          document.body.appendChild(coin);

          const scatterX = (Math.random() - 0.5) * 60;
          const scatterY = (Math.random() - 0.5) * 60;
          const midX = (startX + endX) / 2 - startX + (Math.random() - 0.5) * 60;
          const midY = Math.min(startY, endY) - 100 - Math.random() * 60 - startY;

          coin.animate([
            { transform: 'translate(0,0) scale(0.5)', opacity: 0 },
            { transform: `translate(${scatterX}px,${scatterY}px) scale(1)`, opacity: 1, offset: 0.12 },
            { transform: `translate(${midX}px,${midY}px) scale(1.1)`, offset: 0.5 },
            { transform: `translate(${endX - startX}px,${endY - startY}px) scale(0.7)`, opacity: 1 },
          ], {
            duration: 900 + Math.random() * 300,
            easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
            fill: 'forwards',
          }).onfinish = () => coin.remove();
        }, delay);
      }

      // Count up gold after first coin lands
      const countStart = setTimeout(() => {
        const start = performance.now();
        const dur = 800;
        const countUp = (now: number) => {
          const p = Math.min((now - start) / dur, 1);
          const eased = 1 - Math.pow(1 - p, 2);
          setDisplayGold(Math.round(goldGained * eased));
          if (p < 1) rafRef.current = requestAnimationFrame(countUp);
        };
        rafRef.current = requestAnimationFrame(countUp);
      }, 400);

      // Dismiss after 2s hold
      const dismissTimer = setTimeout(() => {
        setShow(false);
        setTimeout(onComplete, 500);
      }, 2400);

      return () => { clearTimeout(countStart); clearTimeout(dismissTimer); };
    }, 120);

    return () => {
      clearTimeout(spawnTimer);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[201] pointer-events-none flex justify-center items-end pb-28">
      <AnimatePresence>
        {show && (
          <motion.div
            ref={overlayRef}
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 140, damping: 20 }}
            className="pointer-events-auto w-[88%] max-w-sm"
          >
            <div
              className="rounded-2xl px-5 py-3.5 flex items-center gap-4"
              style={{
                background: 'rgba(5,5,10,0.97)',
                border: '1px solid rgba(234,179,8,0.3)',
                boxShadow: '0 0 30px rgba(234,179,8,0.12), 0 8px 32px rgba(0,0,0,0.7)',
                backdropFilter: 'blur(20px)',
              }}
            >
              {/* Coin icon */}
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)' }}
              >
                <svg
                  width="20" height="20" viewBox="0 0 14 14"
                  style={{ animation: 'coinFlip 1.5s ease-in-out infinite', filter: 'drop-shadow(0 0 4px #eab308)' }}
                >
                  <circle cx="7" cy="7" r="6" fill="none" stroke="#eab308" strokeWidth="1.5"/>
                  <text x="7" y="10.5" textAnchor="middle" fontSize="6" fontWeight="900" fill="#eab308" fontFamily="monospace">◈</text>
                </svg>
              </div>

              {/* Label */}
              <div className="flex-1">
                <div className="text-[9px] font-mono font-black tracking-[0.2em] text-yellow-400/60 uppercase">Gold Acquired</div>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <div
                    className="w-1 h-1 rounded-full bg-yellow-400 animate-pulse"
                    style={{ boxShadow: '0 0 4px #eab308' }}
                  />
                  <span className="text-[9px] font-mono text-gray-600">collecting...</span>
                </div>
              </div>

              {/* Amount */}
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="font-mono font-black text-lg text-yellow-400"
                style={{ textShadow: '0 0 12px rgba(234,179,8,0.7)' }}
              >
                +{displayGold}
                <span className="text-xs ml-0.5 text-yellow-500/70">G</span>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CoinCollectionOverlay;
