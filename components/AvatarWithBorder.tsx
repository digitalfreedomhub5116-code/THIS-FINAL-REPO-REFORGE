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


/**
 * ── Industry-level avatar optimization ──
 *
 * Problem: 50 full-size avatars loading simultaneously kills mobile perf.
 * Solution (same approach as Discord, Instagram, WhatsApp):
 *
 * 1. URL rewriting — request server-resized thumbnails (96px for 44-80px displays)
 *    - Supabase Storage: /render/image/public/... ?width=96&height=96&resize=cover
 *    - Google profile pics: append =s96-c for 96px cropped circle
 *    - Other URLs: pass through as-is
 *
 * 2. In-memory blob cache — once downloaded, avatars are stored as object URLs.
 *    Re-renders and tab switches show cached versions instantly (0ms).
 *
 * 3. Skeleton shimmer placeholder — shows immediately while image downloads.
 *
 * 4. Error resilience — falls back to original URL if thumbnail fails.
 */

// Global in-memory avatar cache (survives re-renders, cleared on page refresh)
const avatarCache = new Map<string, string>(); // optimizedUrl → objectURL
const avatarErrors = new Set<string>(); // URLs that failed (skip retries)

/** Rewrite avatar URL to request a server-resized thumbnail */
function getOptimizedAvatarUrl(originalUrl: string, targetSize: number): string {
  if (!originalUrl) return originalUrl;

  // Supabase Storage: rewrite to use render/image transformation endpoint
  // e.g. https://xyz.supabase.co/storage/v1/object/public/avatars/file.webp
  //   → https://xyz.supabase.co/storage/v1/render/image/public/avatars/file.webp?width=96&height=96&resize=cover
  if (originalUrl.includes('supabase.co/storage/v1/object/public/')) {
    const thumbUrl = originalUrl.replace(
      '/storage/v1/object/public/',
      '/storage/v1/render/image/public/'
    );
    // Strip any existing query params and add resize params
    const base = thumbUrl.split('?')[0];
    return `${base}?width=${targetSize}&height=${targetSize}&resize=cover&quality=75`;
  }

  // Google profile pictures: append size param
  // e.g. https://lh3.googleusercontent.com/a/xxx → append =s96-c
  if (originalUrl.includes('googleusercontent.com')) {
    const base = originalUrl.split('=')[0]; // strip existing size params
    return `${base}=s${targetSize}-c`;
  }

  return originalUrl;
}

/** Load and cache an avatar image, returning an object URL for instant display */
async function loadAndCacheAvatar(url: string): Promise<string> {
  // Already cached?
  const cached = avatarCache.get(url);
  if (cached) return cached;

  // Known to fail?
  if (avatarErrors.has(url)) return url;

  try {
    const resp = await fetch(url, { mode: 'cors', credentials: 'omit' });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const blob = await resp.blob();
    const objectUrl = URL.createObjectURL(blob);
    avatarCache.set(url, objectUrl);
    return objectUrl;
  } catch {
    avatarErrors.add(url);
    return url; // fallback to original URL (browser will try directly)
  }
}

/** Internal avatar image with skeleton loading + optimization */
function AvatarImage({ src, size }: { src: string; size: number }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [displaySrc, setDisplaySrc] = useState<string>('');

  // Target 2x for retina: a 44px avatar gets a 96px thumbnail
  const thumbSize = Math.min(256, Math.max(96, size * 2));

  useEffect(() => {
    if (!src) return;

    const optimizedUrl = getOptimizedAvatarUrl(src, thumbSize);

    // Check in-memory cache first (instant)
    const cached = avatarCache.get(optimizedUrl);
    if (cached) {
      setDisplaySrc(cached);
      setLoaded(true);
      return;
    }

    // Load and cache in background
    setLoaded(false);
    setError(false);

    loadAndCacheAvatar(optimizedUrl).then(finalUrl => {
      setDisplaySrc(finalUrl);
    });
  }, [src, thumbSize]);

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
      {displaySrc && (
        <img
          src={displaySrc}
          alt=""
          width={size}
          height={size}
          decoding="async"
          className="w-full h-full object-cover rounded-full"
          style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.25s ease' }}
          onLoad={() => setLoaded(true)}
          onError={() => {
            if (!error) {
              // Fallback to original URL if optimized fails
              setError(true);
              setDisplaySrc(src);
            }
          }}
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
          />
        )}
      </div>
    </>
  );
}

export default AvatarWithBorder;
