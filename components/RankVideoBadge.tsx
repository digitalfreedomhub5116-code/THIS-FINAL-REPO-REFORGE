
import React, { useState } from 'react';

// Configuration: Map each rank to both a static Image (instant load) and a Video (high quality loop).
// OPTIMIZED: Added f_auto,q_auto,w_400 to video URLs to reduce memory footprint
const RANK_MEDIA: Record<string, { video: string; image: string }> = {
  'E': {
    video: 'https://res.cloudinary.com/dcnqnbvp0/video/upload/f_auto,q_auto,w_400/v1770384619/Untitled_video_-_Made_with_Clipchamp_17_nwvbzw.mp4',
    image: 'https://res.cloudinary.com/dcnqnbvp0/image/upload/f_auto,q_auto,w_400/v1769880473/eranklogoimg_nra2wm.jpg' 
  },
  'D': {
    video: 'https://res.cloudinary.com/dcnqnbvp0/video/upload/f_auto,q_auto,w_400/v1769923050/Drank_edited_video_-_Made_with_Clipchamp_jswcm7.mp4',
    image: 'https://res.cloudinary.com/dcnqnbvp0/image/upload/f_auto,q_auto,w_400/v1769880473/dranklogoimg_cmh3n9.jpg' 
  },
  'C': {
    video: 'https://res.cloudinary.com/dcnqnbvp0/video/upload/f_auto,q_auto,w_400/v1770384350/WhatsApp_Video_2026-02-06_at_3.19.23_PM_cfpnac.mp4',
    image: 'https://res.cloudinary.com/dcnqnbvp0/image/upload/f_auto,q_auto,w_400/v1769880473/cranklogoimg_c0bkns.jpg' 
  },
  'B': {
    video: 'https://res.cloudinary.com/dcnqnbvp0/video/upload/f_auto,q_auto,w_400/v1770384298/WhatsApp_Video_2026-02-06_at_3.19.22_PM_wq1ej5.mp4',
    image: 'https://res.cloudinary.com/dcnqnbvp0/image/upload/f_auto,q_auto,w_400/v1769880470/branklogoimg_q1yqhw.jpg' 
  },
  'A': {
    video: 'https://res.cloudinary.com/dcnqnbvp0/video/upload/f_auto,q_auto,w_400/v1770384246/WhatsApp_Video_2026-02-06_at_3.19.21_PM_ndj3ma.mp4',
    image: 'https://res.cloudinary.com/dcnqnbvp0/image/upload/f_auto,q_auto,w_400/v1769880469/aranklogoimg_oufgrc.jpg' 
  },
  'S': {
    video: 'https://res.cloudinary.com/dcnqnbvp0/video/upload/f_auto,q_auto,w_400/v1770371755/WhatsApp_Video_2026-02-06_at_3.19.20_PM_otzdld.mp4',
    image: 'https://res.cloudinary.com/dcnqnbvp0/image/upload/f_auto,q_auto,w_400/v1769880469/sranklogoimg_bd6fu1.jpg' 
  },
};

interface RankVideoBadgeProps {
  rank: string;
  className?: string;
}

const RankVideoBadge: React.FC<RankVideoBadgeProps> = ({ rank, className }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const rankKey = rank ? rank.toUpperCase() : 'E';
  const media = RANK_MEDIA[rankKey] || RANK_MEDIA['E'];

  // Default sizing if className is not provided
  const containerClass = className || "w-24 h-24";

  return (
    <div 
        className={`relative flex items-center justify-center overflow-hidden ${containerClass}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => setIsHovered(!isHovered)} // Toggle for mobile
    >
      
      {/* 1. Static Fallback Image (Always Visible Initially) */}
      <img 
        src={media.image}
        alt={`Rank ${rankKey}`}
        className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-500 ${isHovered ? 'opacity-0' : 'opacity-100'}`}
        style={{ 
            filter: 'drop-shadow(0 0 15px rgba(0,0,0,0.5))' 
        }}
        loading="lazy"
      />

      {/* 2. High Quality Video Loop (Only renders on interaction) */}
      {isHovered && (
          <video
            src={media.video}
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
            style={{ 
                filter: 'drop-shadow(0 0 15px rgba(0,0,0,0.5))' 
            }}
          />
      )}
      
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
