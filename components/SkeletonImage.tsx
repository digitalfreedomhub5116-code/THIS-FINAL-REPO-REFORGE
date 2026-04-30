/**
 * SkeletonImage — Shows a pulsing skeleton placeholder until the image loads,
 * then fades in smoothly. Supports circular and rectangular modes.
 */
import React, { useState, useCallback } from 'react';

interface SkeletonImageProps {
  src: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  /** If true, skeleton and image are rendered as circles */
  circle?: boolean;
  /** Width/height for the skeleton placeholder */
  width?: number | string;
  height?: number | string;
  /** objectFit for the image */
  objectFit?: React.CSSProperties['objectFit'];
  /** objectPosition for the image */
  objectPosition?: string;
}

const SkeletonImage: React.FC<SkeletonImageProps> = ({
  src,
  alt = '',
  className = '',
  style,
  circle = false,
  width,
  height,
  objectFit = 'cover',
  objectPosition = 'center',
}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const handleLoad = useCallback(() => setLoaded(true), []);
  const handleError = useCallback(() => { setError(true); setLoaded(true); }, []);

  const borderRadius = circle ? '50%' : undefined;

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width,
        height,
        overflow: 'hidden',
        borderRadius,
        ...style,
      }}
    >
      {/* Skeleton pulse */}
      {!loaded && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius,
            background: 'linear-gradient(110deg, rgba(255,255,255,0.03) 30%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 70%)',
            backgroundSize: '200% 100%',
            animation: 'skeleton-shimmer 1.5s ease-in-out infinite',
          }}
        />
      )}

      {/* Actual image */}
      {!error && (
        <img
          src={src}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          style={{
            width: '100%',
            height: '100%',
            objectFit,
            objectPosition,
            opacity: loaded ? 1 : 0,
            transition: 'opacity 0.35s ease-in-out',
            display: 'block',
            borderRadius,
          }}
        />
      )}

      {/* Keyframes (injected once via style tag) */}
      <style>{`
        @keyframes skeleton-shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
};

export default SkeletonImage;
