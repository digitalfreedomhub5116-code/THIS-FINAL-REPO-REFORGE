/**
 * AvatarWithBorder — Renders avatar with image-based store borders only.
 * Old AnimatedBorder/SVG system has been removed.
 * Only supports PNG image borders from storeItems.ts.
 */
import React from 'react';
import { User as UserIcon } from 'lucide-react';
import { getItemById } from '../utils/storeItems';

interface AvatarWithBorderProps {
  avatarUrl?: string | null;
  borderId?: string | null;
  /** Avatar circle diameter in pixels */
  size?: number;
  /** Extra className for the outermost container */
  className?: string;
  /** Extra style for the outermost container */
  style?: React.CSSProperties;
}

const AvatarWithBorder: React.FC<AvatarWithBorderProps> = ({
  avatarUrl,
  borderId,
  size = 88,
  className = '',
  style,
}) => {
  // Resolve as a Store item (image-based border)
  const storeItem = borderId ? getItemById(borderId) : null;
  const hasImageBorder = !!storeItem?.imageBorder;

  // Avatar element — perfectly circular, transparent background (no dark square)
  const avatarElement = (
    <div
      className="rounded-full overflow-hidden flex items-center justify-center"
      style={{
        width: size,
        height: size,
        background: avatarUrl ? 'transparent' : '#0d0d1a',
      }}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        <UserIcon size={size * 0.36} className="text-gray-500" />
      )}
    </div>
  );

  // ── Image border (PNG wrapping avatar) ──
  if (hasImageBorder && storeItem) {
    const cfg = storeItem.borderConfig;
    const glow = cfg?.glowColor || 'rgba(126,184,212,0.3)';
    const scale = storeItem.imageScale || 1.0;
    const outerSize = size + 20;
    const borderImgSize = outerSize * scale;
    const offsetY = (storeItem as any).imageOffsetY || 0;
    const isAnimated = storeItem.imageAnimated;
    const animType = (storeItem as any).imageAnimationType;

    return (
      <div
        className={`relative ${className}`}
        style={{
          width: outerSize,
          height: outerSize,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'visible',
          ...style,
        }}
      >
        {/* Avatar (centred) */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1,
          }}
        >
          {avatarElement}
        </div>

        {/* Image border overlay */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: borderImgSize,
            height: borderImgSize,
            transform: `translate(-50%, calc(-50% + ${offsetY}px))`,
            pointerEvents: 'none',
            zIndex: 2,
            filter: `drop-shadow(0 0 6px ${glow})`,
          }}
        >
          <img
            src={storeItem.imageBorder}
            alt=""
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              animation: isAnimated
                ? animType === 'pulse'
                  ? 'pulse 2s ease-in-out infinite'
                  : 'spin 8s linear infinite'
                : 'none',
            }}
          />
        </div>
      </div>
    );
  }

  // ── No border — just avatar with subtle ring ──
  return (
    <div className={`relative ${className}`} style={style}>
      <div
        className="absolute -inset-[1px] rounded-full z-0"
        style={{ border: '1px solid rgba(255,255,255,0.12)' }}
      />
      <div className="relative z-10">{avatarElement}</div>
    </div>
  );
};

export default AvatarWithBorder;
