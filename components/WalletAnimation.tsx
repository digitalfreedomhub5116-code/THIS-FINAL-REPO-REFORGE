
import React from 'react';

interface WalletAnimationProps {
  size?: number | string;
  className?: string;
}

const WalletAnimation: React.FC<WalletAnimationProps> = ({ size = 24, className }) => {
  const style = {
    width: size,
    height: size,
    cursor: 'pointer'
  };

  return (
    <div style={style} className={`relative overflow-hidden flex items-center justify-center ${className || ''}`}>
      <video
        src="https://res.cloudinary.com/dcnqnbvp0/video/upload/v1769852116/A_seamless_looped_202601311459_nexcw_mz5bzp.mp4"
        autoPlay
        loop
        muted
        playsInline
        className="w-full h-full object-cover pointer-events-none"
      />
    </div>
  );
};

export default WalletAnimation;
