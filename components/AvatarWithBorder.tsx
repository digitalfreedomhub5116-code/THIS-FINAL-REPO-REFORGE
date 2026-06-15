/**
 * AvatarWithBorder — Renders avatar with image or video-based store borders.
 * Supports PNG image borders AND video/GIF borders from storeItems.ts.
 * Uses mix-blend-mode: screen to eliminate black backgrounds from video borders.
 */
import React, { useState, useRef, useEffect } from 'react';
import { User as UserIcon } from 'lucide-react';
import { getItemById } from '../utils/storeItems';
import { BORDERS_ACTIVE } from '../utils/gameData';

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
  /** Extra scale multiplier for the border overlay (default 1.0). Use <1 to shrink borders. */
  borderScale?: number;
  /** Extra className for the outermost container */
  className?: string;
  /** Extra style for the outermost container */
  style?: React.CSSProperties;
}

const AvatarWithBorder: React.FC<AvatarWithBorderProps> = ({
  avatarUrl,
  borderId,
  size = 88,
  borderScale = 1.0,
  className = '',
  style,
}) => {
  // CRITICAL: Strip boxShadow from style — it creates a rectangular shadow
  // on a component that renders circular/irregular PNG borders.
  // Callers should NEVER pass boxShadow; use CSS filter: drop-shadow instead.
  const { boxShadow: _stripped, ...safeStyle } = (style || {}) as any;
  // ── BORDERS_ACTIVE toggle: when false, act as if no border is equipped ──
  const effectiveBorderId = BORDERS_ACTIVE ? borderId : null;
  // Resolve as a Store item (image-based border)
  const storeItem = effectiveBorderId ? getItemById(effectiveBorderId) : null;
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
    const scale = (storeItem.imageScale || 1.0) * borderScale;
    // Container matches `size` so bordered/unbordered avatars occupy the same layout footprint
    const outerSize = size;
    const borderSize = (size + 20) * scale;
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
    const scale = (storeItem.imageScale || 1.0) * borderScale;
    // Container matches `size` so bordered/unbordered avatars occupy the same
    // layout footprint. The border image overflows via overflow:visible.
    const outerSize = size;
    const borderImgSize = (size + 20) * scale;
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


/**
 * ── Production avatar caching ──
 *
 * Content-hash filenames + immutable Cache-Control headers on Supabase Storage
 * means the browser's native HTTP disk cache handles cross-session persistence.
 *
 * This client only needs:
 *   1. In-memory Map → instant re-renders within same session
 *   2. URL rewriting → Supabase Image Transform for thumbnails (Pro plan)
 *   3. Default inline PFP → instant placeholder while network loads
 *
 * No localStorage hacking needed — the browser does it natively and better.
 */

// 620-byte inline default avatar — shows instantly (zero network request)
export const DEFAULT_AVATAR_DATA_URI = 'data:image/webp;base64,UklGRmQCAABXRUJQVlA4WAoAAAAQAAAAPwAAPwAAQUxQSJIBAAABkFvbtmo3+z5BxsxcAMca6gDNjCmH4oxVgZntUFYBZsYP4R8KTR/N9I743Xt2AxExAbBePjR241Us8edPIvbq+uhgOXR3z4d8CeiH5rrU5J+NiuXI2TwNxRMJcZgYL3Jl9n8Sx/ETnpPWR6LwYYuD/qSozOy05S2I2jnPSu51UXwtx0Lukqi+mxPIXBLl170gC6J+JsA2Idy1pZYUQ6p5C+aRUN43mx0V0gObFH9m+Vi40aTQjm6Qn+CJ5607K8Sn14WYIgC6hbodmOeaAcJcb1Duc/mlQ0I+MM42coPt6ku258tssTjb599sv/jibJ+X2WIv2Z5fZ7syxjY8yNZf7nP9L0WI6zUwzzUNdHG1AQgxRQDgLNPpdXkJnnjeOkzwjGDDok8sHwo2wmGWfdjUPOS4ZzZDS4oh2YytDjEMYOtz+qYQ0FzQds0LgpwlXYs5CJ59TtOVHNg0M2r8KQPLfQkd6e2w33xfw70muDT7E67Sxw0cF573XfgXC6Cw97u97z3QWXnH1mIt1A5GbUT6YRdWUDggrAAAABAIAJ0BKkAAQAA+xVSeS7m2IqGz+ZqrMBiJZwDL4CEbg3iqPipvIUOC31rBwAWz5n8pNs4RXPY/rXmJHHEosMn5YQ9uaHCeAAAA/vGv3iK/E66zqXiUzW8BTCQnOyPNpmorAriWGKZ0zQt2q/FxUJsglYZqQ65OilCZP9KW1Cpk/TgrpgeDXdoTfnaCdms6LT2ChzBV1zjwex6fQZlXEiXi/tWvTYwZUkoAAAA=';

// In-memory cache — instant re-renders, cleared on page refresh
const memCache = new Map<string, string>();
const failedUrls = new Set<string>();

/** Rewrite avatar URL to request a server-resized thumbnail */
function getOptimizedAvatarUrl(originalUrl: string, targetSize: number): string {
  if (!originalUrl) return originalUrl;

  // Supabase Storage → Image Transform API (Pro plan)
  if (originalUrl.includes('supabase.co/storage/v1/object/public/')) {
    const thumbUrl = originalUrl.replace(
      '/storage/v1/object/public/',
      '/storage/v1/render/image/public/'
    );
    const base = thumbUrl.split('?')[0];
    return `${base}?width=${targetSize}&height=${targetSize}&resize=cover&quality=75`;
  }

  // Google profile pictures → server-cropped thumbnail
  if (originalUrl.includes('googleusercontent.com')) {
    return `${originalUrl.split('=')[0]}=s${targetSize}-c`;
  }

  return originalUrl;
}

/** Internal avatar image with default placeholder + browser cache */
function AvatarImage({ src, size }: { src: string; size: number }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  // Target 2x retina: 44px display → 96px thumbnail
  const thumbSize = Math.min(256, Math.max(96, size * 2));
  const optimizedUrl = src ? getOptimizedAvatarUrl(src, thumbSize) : '';

  // Check in-memory cache for instant display (no async needed)
  const cachedUrl = optimizedUrl ? memCache.get(optimizedUrl) : undefined;
  const imgSrc = cachedUrl || optimizedUrl;

  return (
    <>
      {/* Default PFP — shows instantly while real one loads */}
      {!loaded && (
        <img
          src={DEFAULT_AVATAR_DATA_URI}
          alt=""
          width={size}
          height={size}
          className="w-full h-full object-cover rounded-full absolute inset-0"
        />
      )}
      {imgSrc && (
        <img
          src={imgSrc}
          alt=""
          width={size}
          height={size}
          decoding="async"
          className="w-full h-full object-cover rounded-full"
          style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.25s ease' }}
          onLoad={(e) => {
            setLoaded(true);
            // Cache the successful URL in memory for instant re-renders
            if (optimizedUrl) memCache.set(optimizedUrl, imgSrc);
          }}
          onError={() => {
            if (!error && optimizedUrl !== src) {
              // Thumbnail API failed → fallback to original full-size URL
              setError(true);
              failedUrls.add(optimizedUrl);
            }
          }}
        />
      )}
      {/* If optimized URL failed, try original */}
      {error && (
        <img
          src={src}
          alt=""
          width={size}
          height={size}
          decoding="async"
          className="w-full h-full object-cover rounded-full"
          style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.25s ease' }}
          onLoad={() => setLoaded(true)}
        />
      )}
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
            onCanPlay={(e) => (e.target as HTMLVideoElement).classList.add('video-ready')}
          />
        )}
      </div>
    </>
  );
}

export default AvatarWithBorder;
