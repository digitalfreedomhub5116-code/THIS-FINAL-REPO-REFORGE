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
 * ── Industry-level avatar caching system ──
 *
 * 3-tier cache hierarchy (same pattern as Discord, WhatsApp):
 *   1. In-memory Map  → instant (survives re-renders, lost on page refresh)
 *   2. localStorage   → persistent (survives app restart, ~5-15KB per avatar)
 *   3. Supabase/network → slowest (only when 1 & 2 miss)
 *
 * Flow:
 *   avatar_url is null → show inline default (620 bytes, zero network)
 *   avatar_url exists  → check memory → check localStorage → fetch network
 *                         └ on fetch success: cache to memory + localStorage
 *
 * localStorage key format: "av_<hash>" = base64 data URI
 * Limit: ~50 entries (~750KB) — auto-prunes oldest when exceeded.
 */

// 620-byte inline default avatar — shows instantly (zero network request)
// Dark grey circle with person silhouette, matching the app's dark theme
export const DEFAULT_AVATAR_DATA_URI = 'data:image/webp;base64,UklGRmQCAABXRUJQVlA4WAoAAAAQAAAAPwAAPwAAQUxQSJIBAAABkFvbtmo3+z5BxsxcAMca6gDNjCmH4oxVgZntUFYBZsYP4R8KTR/N9I743Xt2AxExAbBePjR241Us8edPIvbq+uhgOXR3z4d8CeiH5rrU5J+NiuXI2TwNxRMJcZgYL3Jl9n8Sx/ETnpPWR6LwYYuD/qSozOy05S2I2jnPSu51UXwtx0Lukqi+mxPIXBLl170gC6J+JsA2Idy1pZYUQ6p5C+aRUN43mx0V0gObFH9m+Vi40aTQjm6Qn+CJ5607K8Sn14WYIgC6hbodmOeaAcJcb1Duc/mlQ0I+MM42coPt6ku258tssTjb599sv/jibJ+X2WIv2Z5fZ7syxjY8yNZf7nP9L0WI6zUwzzUNdHG1AQgxRQDgLNPpdXkJnnjeOkzwjGDDok8sHwo2wmGWfdjUPOS4ZzZDS4oh2YytDjEMYOtz+qYQ0FzQds0LgpwlXYs5CJ59TtOVHNg0M2r8KQPLfQkd6e2w33xfw70muDT7E67Sxw0cF573XfgXC6Cw97u97z3QWXnH1mIt1A5GbUT6YRdWUDggrAAAABAIAJ0BKkAAQAA+xVSeS7m2IqGz+ZqrMBiJZwDL4CEbg3iqPipvIUOC31rBwAWz5n8pNs4RXPY/rXmJHHEosMn5YQ9uaHCeAAAA/vGv3iK/E66zqXiUzW8BTCQnOyPNpmorAriWGKZ0zQt2q/FxUJsglYZqQ65OilCZP9KW1Cpk/TgrpgeDXdoTfnaCdms6LT2ChzBV1zjwex6fQZlXEiXi/tWvTYwZUkoAAAA=';

// ── Tier 1: In-memory cache (instant, cleared on page refresh) ──
const memoryCache = new Map<string, string>(); // url → dataURI or objectURL
const failedUrls = new Set<string>();

// ── Tier 2: localStorage helpers ──
const LS_PREFIX = 'av_';
const LS_MAX_ENTRIES = 50;

function getCacheKey(url: string): string {
  // Simple hash: use last 32 chars of URL (unique enough for avatar paths)
  const clean = url.split('?')[0]; // strip query params
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = ((hash << 5) - hash + clean.charCodeAt(i)) | 0;
  }
  return `${LS_PREFIX}${Math.abs(hash).toString(36)}`;
}

function getFromLocalStorage(url: string): string | null {
  try {
    const key = getCacheKey(url);
    return localStorage.getItem(key);
  } catch { return null; }
}

function saveToLocalStorage(url: string, dataUri: string): void {
  try {
    const key = getCacheKey(url);
    // Prune oldest entries if we're at the limit
    const allKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(LS_PREFIX)) allKeys.push(k);
    }
    if (allKeys.length >= LS_MAX_ENTRIES) {
      // Remove oldest entries (first ones found)
      const toRemove = allKeys.slice(0, allKeys.length - LS_MAX_ENTRIES + 5);
      toRemove.forEach(k => localStorage.removeItem(k));
    }
    localStorage.setItem(key, dataUri);
  } catch { /* localStorage full or unavailable — non-fatal */ }
}

/** Convert a blob to a base64 data URI for localStorage persistence */
function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** Rewrite avatar URL to request a server-resized thumbnail */
function getOptimizedAvatarUrl(originalUrl: string, targetSize: number): string {
  if (!originalUrl) return originalUrl;

  // Supabase Storage: use render/image transformation endpoint (Pro plan)
  if (originalUrl.includes('supabase.co/storage/v1/object/public/')) {
    const thumbUrl = originalUrl.replace(
      '/storage/v1/object/public/',
      '/storage/v1/render/image/public/'
    );
    const base = thumbUrl.split('?')[0];
    return `${base}?width=${targetSize}&height=${targetSize}&resize=cover&quality=75`;
  }

  // Google profile pictures: append size param
  if (originalUrl.includes('googleusercontent.com')) {
    const base = originalUrl.split('=')[0];
    return `${base}=s${targetSize}-c`;
  }

  return originalUrl;
}

/**
 * Load avatar with 3-tier cache: memory → localStorage → network.
 * Returns a displayable URL (data URI or object URL).
 */
async function loadAvatar(originalUrl: string, thumbSize: number): Promise<string> {
  const optimizedUrl = getOptimizedAvatarUrl(originalUrl, thumbSize);

  // Tier 1: In-memory cache (instant)
  const memCached = memoryCache.get(optimizedUrl);
  if (memCached) return memCached;

  // Tier 2: localStorage (persistent, ~1ms)
  const lsCached = getFromLocalStorage(optimizedUrl);
  if (lsCached) {
    memoryCache.set(optimizedUrl, lsCached); // promote to memory
    return lsCached;
  }

  // Known to fail? Skip network
  if (failedUrls.has(optimizedUrl)) return originalUrl;

  // Tier 3: Network fetch (slowest)
  try {
    const resp = await fetch(optimizedUrl, { mode: 'cors', credentials: 'omit' });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const blob = await resp.blob();

    // Convert to data URI for localStorage persistence
    const dataUri = await blobToDataUri(blob);

    // Cache to both tiers
    memoryCache.set(optimizedUrl, dataUri);
    saveToLocalStorage(optimizedUrl, dataUri);

    return dataUri;
  } catch {
    failedUrls.add(optimizedUrl);
    return originalUrl; // browser will try the original URL directly
  }
}

/** Internal avatar image with 3-tier cache + default placeholder */
function AvatarImage({ src, size }: { src: string; size: number }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [displaySrc, setDisplaySrc] = useState<string>('');

  // Target 2x for retina: a 44px avatar gets a 96px thumbnail
  const thumbSize = Math.min(256, Math.max(96, size * 2));

  useEffect(() => {
    if (!src) return;

    const optimizedUrl = getOptimizedAvatarUrl(src, thumbSize);

    // Check in-memory cache first (instant, no async needed)
    const memCached = memoryCache.get(optimizedUrl);
    if (memCached) {
      setDisplaySrc(memCached);
      setLoaded(true);
      return;
    }

    // Check localStorage (sync, ~1ms)
    const lsCached = getFromLocalStorage(optimizedUrl);
    if (lsCached) {
      memoryCache.set(optimizedUrl, lsCached);
      setDisplaySrc(lsCached);
      setLoaded(true);
      return;
    }

    // Need network fetch — show placeholder while loading
    setLoaded(false);
    setError(false);

    loadAvatar(src, thumbSize).then(finalUrl => {
      setDisplaySrc(finalUrl);
    });
  }, [src, thumbSize]);

  return (
    <>
      {/* Default avatar — shows instantly while real one loads */}
      {!loaded && (
        <img
          src={DEFAULT_AVATAR_DATA_URI}
          alt=""
          width={size}
          height={size}
          className="w-full h-full object-cover rounded-full absolute inset-0"
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
              setError(true);
              setDisplaySrc(src); // fallback to original URL
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
