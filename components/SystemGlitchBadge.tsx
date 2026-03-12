
import React, { useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';

interface SystemGlitchBadgeProps {
  className?: string;
}

const SystemGlitchBadge: React.FC<SystemGlitchBadgeProps> = ({ className }) => {
  const controls = useAnimation();

  useEffect(() => {
    let isMounted = true;

    const triggerGlitch = async () => {
      if (!isMounted) return;

      // Random delay between 2 and 5 seconds for organic feel
      const delay = Math.random() * 3000 + 2000; 
      await new Promise((resolve) => setTimeout(resolve, delay));

      if (!isMounted) return;

      // Glitch Sequence
      await controls.start({
        x: [0, -2, 2, -1, 1, 0],
        backgroundColor: [
          "#7c3aed", // Violet (Base)
          "#06b6d4", // Cyan
          "#d946ef", // Magenta
          "#7c3aed"  // Back to Violet
        ],
        transition: { duration: 0.2, ease: "linear" }
      });

      triggerGlitch();
    };

    triggerGlitch();

    return () => {
      isMounted = false;
    };
  }, [controls]);

  return (
    <motion.div 
      animate={controls}
      className={`absolute -top-1 -right-1 z-50 flex h-4 w-4 items-center justify-center rounded-full bg-violet-600 ring-1 ring-violet-400 shadow-[0_0_8px_rgba(139,92,246,0.8)] ${className || ''}`}
    >
      <span className="font-mono text-[10px] font-black text-white leading-none select-none">
        !
      </span>
    </motion.div>
  );
};

export default SystemGlitchBadge;
