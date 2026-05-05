/**
 * AvatarWithBorder — Renders avatar with image or video-based store borders.
 * Supports PNG image borders AND video/GIF borders from storeItems.ts.
 * Uses mix-blend-mode: screen to eliminate black backgrounds from video borders.
 */
import React, { useState, useRef, useEffect } from 'react';
import { User as UserIcon } from 'lucide-react';
import { getItemById } from '../utils/storeItems';

/* ── Only these borders keep their glow (Tier 4 Exclusive) ── */
const GLOW_WHITELIST = new Set([
  'border-streak-gold',      // Iron Will
  'border-streak-inferno',   // Inferno
  'border-streak-eternal',   // Eternal Flame
  'border-podium-gold',      // Sovereign's Crown
]);

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
  // CRITICAL: Strip boxShadow from style — it creates a rectangular shadow
  // on a component that renders circular/irregular PNG borders.
  // Callers should NEVER pass boxShadow; use CSS filter: drop-shadow instead.
  const { boxShadow: _stripped, ...safeStyle } = (style || {}) as any;
  // Resolve as a Store item (image-based border)
  const storeItem = borderId ? getItemById(borderId) : null;
  const hasImageBorder = !!storeItem?.imageBorder;
  const hasVideoBorder = !!storeItem?.videoBorder;

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
        <AvatarImage src={avatarUrl} size={size} />
      ) : (
        <UserIcon size={size * 0.36} className="text-gray-500" />
      )}
    </div>
  );

  // ── Video border (GIF/MP4/WebM wrapping avatar) ──
  if (hasVideoBorder && storeItem) {
    const cfg = storeItem.borderConfig;
    const glow = cfg?.glowColor || '#00d4ff';
    const scale = storeItem.imageScale || 1.0;
    const outerSize = size + 20;
    const borderSize = outerSize * scale;
    const offsetY = (storeItem as any).imageOffsetY || 0;

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
          ...safeStyle,
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

        {/* Video border overlay */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: borderSize,
            height: borderSize,
            transform: `translate(-50%, calc(-50% + ${offsetY}px))`,
            pointerEvents: 'none',
            zIndex: 2,
            mixBlendMode: 'screen'
          }}
        >
          <BorderVideo src={storeItem.videoBorder!} />
        </div>
      </div>
    );
  }

  // ── Image border (PNG wrapping avatar) ──
  if (hasImageBorder && storeItem) {
    const cfg = storeItem.borderConfig;
    const glow = cfg?.glowColor || '#00d4ff';
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
          ...safeStyle,
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
          }}
        >
            <BorderImage
            src={storeItem.imageBorder!}
            isAnimated={isAnimated}
            animType={animType}
            glowColor={glow}
            borderId={borderId || undefined}
          />
        </div>
      </div>
    );
  }

  // ── No border — just avatar with subtle ring ──
  return (
    <div className={`relative ${className}`} style={safeStyle}>
      <div
        className="absolute -inset-[1px] rounded-full z-0"
        style={{ border: '1px solid rgba(255,255,255,0.12)' }}
      />
      <div className="relative z-10">{avatarElement}</div>
    </div>
  );
};


/** Internal avatar image with skeleton loading */
function AvatarImage({ src, size }: { src: string; size: number }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <>
      {!loaded && (
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'linear-gradient(110deg, rgba(255,255,255,0.03) 30%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 70%)',
            backgroundSize: '200% 100%',
            animation: 'skeleton-shimmer 1.5s ease-in-out infinite',
          }}
        />
      )}
      <img
        src={src}
        alt=""
        className="w-full h-full object-cover"
        style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.3s ease' }}
        onLoad={() => setLoaded(true)}
      />
    </>
  );
}

/** Internal border image with skeleton loading */
function BorderImage({ src, isAnimated, animType, glowColor, borderId }: { src: string; isAnimated?: boolean; animType?: string; glowColor?: string; borderId?: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <>
      {!loaded && (
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'linear-gradient(110deg, rgba(0,212,255,0.04) 30%, rgba(0,212,255,0.1) 50%, rgba(0,212,255,0.04) 70%)',
            backgroundSize: '200% 100%',
            animation: 'skeleton-shimmer 1.5s ease-in-out infinite',
          }}
        />
      )}
      <img
        src={src}
        alt=""
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          opacity: loaded ? 1 : 0,
          transition: 'opacity 0.3s ease',
          // mix-blend-mode: screen makes white pixels invisible on dark backgrounds.
          // Many border PNGs have white backgrounds instead of true transparency.
          mixBlendMode: 'screen',
          filter: glowColor && GLOW_WHITELIST.has(borderId || '') ? `drop-shadow(0 0 6px ${glowColor})` : undefined,
          animation: isAnimated
            ? animType === 'pulse'
              ? 'pulse 2s ease-in-out infinite'
              : 'spin 8s linear infinite'
            : 'none',
        }}
        onLoad={() => setLoaded(true)}
      />
      <style>{`
        @keyframes skeleton-shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </>
  );
}

/**
 * Video/GIF border overlay — uses mix-blend-mode: screen to remove black background.
 * For GIFs: renders as <img> (GIFs autoplay natively).
 * For MP4/WebM: renders as <video> with autoplay, loop, muted.
 */
export function BorderVideo({ src, glowColor, borderId }: { src: string; glowColor?: string; borderId?: string }) {
  const [loaded, setLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isGif = src.toLowerCase().endsWith('.gif');
  const isVideo = /\.(mp4|webm|mov)$/i.test(src);

  useEffect(() => {
    if (isVideo && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [src, isVideo]);

  const mediaStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    opacity: loaded ? 1 : 0,
    transition: 'opacity 0.3s ease',
  };

  const filterStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    overflow: 'hidden',
    // The filter crushes the compression artifacts (dark grays) into true #000000 black.
    // We isolate the filter in this child div, while the parent div handles mix-blend-mode.
    filter: `contrast(1.6) brightness(0.8) ${glowColor && GLOW_WHITELIST.has(borderId || '') ? `drop-shadow(0 0 6px ${glowColor})` : ''}`.trim(),
  };

  return (
    <>
      {!loaded && (
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'linear-gradient(110deg, rgba(0,212,255,0.04) 30%, rgba(0,212,255,0.1) 50%, rgba(0,212,255,0.04) 70%)',
            backgroundSize: '200% 100%',
            animation: 'skeleton-shimmer 1.5s ease-in-out infinite',
          }}
        />
      )}
      <div style={filterStyle}>
        {isGif ? (
          <img
            src={src}
            alt=""
            style={mediaStyle}
            onLoad={() => setLoaded(true)}
          />
        ) : (
          <video
            ref={videoRef}
            src={src}
            autoPlay
            loop
            muted
            playsInline
            style={mediaStyle}
            onLoadedData={() => setLoaded(true)}
          />
        )}
      </div>
    </>
  );
}

export default AvatarWithBorder;
