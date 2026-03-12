
import React from 'react';
import { motion } from 'framer-motion';

interface IconProps {
  size?: number;
  className?: string;
}

export const SystemKey: React.FC<IconProps> = ({ size = 24, className = "" }) => {
  return (
    <div style={{ width: size, height: size }} className={`relative flex items-center justify-center ${className}`}>
      <motion.div
        animate={{ y: [-1, 1, -1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="w-full h-full"
      >
        <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible drop-shadow-[0_0_5px_rgba(168,85,247,0.5)]">
            <defs>
                <linearGradient id="sysKeyGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#e879f9" />
                    <stop offset="100%" stopColor="#7e22ce" />
                </linearGradient>
            </defs>
            
            {/* Scaled Group to make key appear larger without changing container size */}
            <g transform="matrix(1.3, 0, 0, 1.3, -15, -15)">
                {/* Shaft (Longer and Thicker) */}
                <rect x="20" y="42" width="75" height="16" rx="2" fill="#6b21a8" />

                {/* Key Head (Crystal Shape on Left) - Scaled Up */}
                <path 
                    d="M5 50 L30 20 L50 50 L30 80 Z" 
                    fill="url(#sysKeyGrad)" 
                    stroke="#f3e8ff" 
                    strokeWidth="1"
                />
                
                {/* Inner Pulsing Core (Centered in Head) */}
                <motion.circle 
                    cx="30" cy="50" r="8" 
                    fill="#fff" 
                    animate={{ opacity: [0.3, 0.8, 0.3], scale: [0.9, 1.1, 0.9] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                />

                {/* Teeth (Right side, pointing down, Thicker) */}
                <rect x="70" y="58" width="10" height="12" fill="#6b21a8" />
                <rect x="85" y="58" width="8" height="18" fill="#6b21a8" />
                
                {/* Highlight Line on Shaft */}
                <rect x="35" y="45" width="55" height="3" fill="white" fillOpacity="0.15" />
            </g>
        </svg>
      </motion.div>
    </div>
  );
};
