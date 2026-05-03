
import React from 'react';

interface IconProps {
  size?: number;
  className?: string;
}

export const SystemCoin: React.FC<IconProps> = ({ size = 24, className = "" }) => {
  return (
    <div
      style={{ width: size, height: size }}
      className={`relative flex-shrink-0 ${className}`}
    >
      <img
        src="/assets/gold-coin.png"
        alt="Gold"
        width={size}
        height={size}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          display: 'block',
        }}
        loading="eager"
        draggable={false}
      />
    </div>
  );
};
