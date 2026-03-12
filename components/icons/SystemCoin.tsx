
import React from 'react';
import { motion } from 'framer-motion';

interface IconProps {
  size?: number;
  className?: string;
}

export const SystemCoin: React.FC<IconProps> = ({ size = 24, className = "" }) => {
  return (
    <div style={{ width: size, height: size }} className={`relative flex items-center justify-center ${className} perspective-1000`}>
      <motion.div
        className="w-full h-full"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateY: 360 }}
        transition={{ 
          duration: 1.5, 
          repeat: Infinity, 
          repeatDelay: 3, // Pauses for 3 seconds between flips
          ease: "easeInOut" 
        }}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible drop-shadow-[0_0_2px_rgba(234,179,8,0.8)]">
          <defs>
            <linearGradient id="sysGoldGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fcd34d" />
              <stop offset="50%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#92400e" />
            </linearGradient>
          </defs>
          
          {/* Outer Coin Body */}
          <circle cx="50" cy="50" r="48" fill="url(#sysGoldGrad)" stroke="#b45309" strokeWidth="2" />
          
          {/* Inner Rim */}
          <circle cx="50" cy="50" r="38" fill="none" stroke="#fbbf24" strokeWidth="1.5" opacity="0.8" />
          
          {/* Symbol */}
          <text x="50" y="65" fontSize="35" fontWeight="900" fill="#78350f" textAnchor="middle" fontFamily="monospace" style={{pointerEvents: 'none'}}>$</text>
          
          {/* Shine */}
          <path d="M30 20 L70 80" stroke="white" strokeWidth="10" strokeOpacity="0.2" style={{ mixBlendMode: 'overlay' }} />
        </svg>
      </motion.div>
    </div>
  );
};
