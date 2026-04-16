
import React, { useState, useRef, useCallback } from 'react';

// Configuration: Map each rank to both a static Image (instant load) and a Video (high quality loop).
// LOCAL: All media files bundled in public/ for offline mobile use
const RANK_MEDIA: Record<string, { video: string; image: string }> = {
  'E': {
    video: '/assets/videos/ranks/rank-e.webm',
    image: '/images/ranks/e-rank.jpg' 
  },
  'D': {
    video: '/assets/videos/ranks/rank-d.webm',
    image: '/images/ranks/d-rank.jpg' 
  },
  'C': {
    video: '/assets/videos/ranks/rank-c.mp4',
    image: '/images/ranks/c-rank.jpg' 
  },
  'B': {
    video: '/assets/videos/ranks/rank-b.mp4',
    image: '/images/ranks/b-rank.jpg' 
  },
  'A': {
    video: '/assets/videos/ranks/rank-a.mp4',
    image: '/images/ranks/a-rank.jpg' 
  },
  'S': {
    video: '/assets/videos/ranks/rank-s.mp4',
    image: '/images/ranks/s-rank.jpg' 
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
        style={{ boxShadow: '0 0 15px rgba(0,0,0,0.5)' }}
        onMouseEnter={handleToggle}
        onMouseLeave={() => { if (isActive) handleToggle(); }}
        onClick={handleToggle} // Toggle for mobile
    >
      
      {/* 1. Static Fallback Image (Always Visible Initially) */}
      <img 
        src={media.image}
        alt={`Rank ${rankKey}`}
        className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-500 ${isActive ? 'opacity-0' : 'opacity-100'}`}
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
      
      {/* Blending Shadows (Top and Bottom) */}
      <div className="absolute top-0 left-0 w-full h-[20%] bg-gradient-to-b from-[#000709] to-transparent z-10 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-full h-[20%] bg-gradient-to-t from-[#000709] to-transparent z-10 pointer-events-none" />

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
