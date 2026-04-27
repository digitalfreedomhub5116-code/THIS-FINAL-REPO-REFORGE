
import React, { useState, useRef, useCallback } from 'react';

// Configuration: Map each rank to both a static Image (instant load) and a Video (high quality loop).
// LOCAL: All media files bundled in public/ for offline mobile use
const RANK_MEDIA: Record<string, { video: string; image: string }> = {
  'E': {
    video: '/assets/videos/ranks/rank-e.webm',
    image: '/images/ranks/e-rank.png' 
  },
  'D': {
    video: '/assets/videos/ranks/rank-d.webm',
    image: '/images/ranks/d-rank.png' 
  },
  'C': {
    video: '/assets/videos/ranks/rank-c.mp4',
    image: '/images/ranks/c-rank.png' 
  },
  'B': {
    video: '/assets/videos/ranks/rank-b.mp4',
    image: '/images/ranks/b-rank.png' 
  },
  'A': {
    video: '/assets/videos/ranks/rank-a.mp4',
    image: '/images/ranks/a-rank.png' 
  },
  'S': {
    video: '/assets/videos/ranks/rank-s.mp4',
    image: '/images/ranks/s-rank.png' 
  },
};

interface RankVideoBadgeProps {
  rank: string;
  className?: string;
}

const RankVideoBadge: React.FC<RankVideoBadgeProps> = ({ rank, className }) => {
  const [isActive, setIsActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const rankKey = rank ? rank.toUpperCase() : 'E';
  const media = RANK_MEDIA[rankKey] || RANK_MEDIA['E'];

  // Default sizing if className is not provided
  const containerClass = className || "w-24 h-24";

  const handleToggle = useCallback(() => {
    const next = !isActive;
    setIsActive(next);
    if (next && videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().catch(() => {});
    } else if (!next && videoRef.current) {
      videoRef.current.pause();
    }
  }, [isActive]);

  return (
    <div 
        className={`relative flex items-center justify-center overflow-hidden ${containerClass}`}
        onMouseEnter={handleToggle}
        onMouseLeave={() => { if (isActive) handleToggle(); }}
        onClick={handleToggle} // Toggle for mobile
    >
      
      {/* 1. Static Fallback Image (Always Visible Initially) */}
      <img 
        src={media.image}
        alt={`Rank ${rankKey}`}
        className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-500 drop-shadow-[0_0_12px_rgba(126,184,212,0.3)] ${isActive ? 'opacity-0' : 'opacity-100'}`}
        style={{ mixBlendMode: 'screen' }}
        loading="lazy"
      />

      {/* 2. High Quality Video Loop (Pre-mounted, visibility-hidden to avoid play button) */}
      <video
        ref={videoRef}
        src={media.video}
        loop
        muted
        playsInline
        preload="none"
        className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none bg-transparent"
        style={{
            visibility: isActive ? 'visible' : 'hidden',
            transform: 'translateZ(0)',
        }}
      />

      {/* Fallback for missing media (Text Badge) */}
      {!media && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 border border-gray-800 rounded-xl z-[-1]">
            <span className="font-mono font-black text-gray-600 text-2xl">{rankKey}</span>
        </div>
      )}
    </div>
  );
};

export default RankVideoBadge;
