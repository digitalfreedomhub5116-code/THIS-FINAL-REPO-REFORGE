import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface SplashScreenProps {
  onComplete: () => void;
}

const INTRO_VIDEO = "https://res.cloudinary.com/dcnqnbvp0/video/upload/v1772375473/introvideojinwoo_1_1_1_erfku0.mp4";
const LOOP_VIDEO  = "https://res.cloudinary.com/dcnqnbvp0/video/upload/v1772384042/loopvideo_1_e9ya07.mp4";

const LETTERS = ['R','E','F','O','R','G','E'];

// Read theme directly from localStorage (SplashScreen renders before ThemeContext)
function getTheme(): 'dark' | 'light' {
  try {
    const stored = localStorage.getItem('reforge_theme');
    if (stored === 'light') return 'light';
  } catch { /* SSR */ }
  return 'dark';
}

const DARK_COLORS = {
  bg: '#000000',
  letterColor: '#e5e5e5',
  subLabel: '#555555',
  progressTrack: 'rgba(255,255,255,0.08)',
  progressFill: 'linear-gradient(90deg, #00d4ff, #00d4ff)',
  accentColor: '#00d4ff',
};

const LIGHT_COLORS = {
  bg: '#ffffff',
  letterColor: '#111111',
  subLabel: '#aaaaaa',
  progressTrack: '#e5e7eb',
  progressFill: '#111111',
  accentColor: '#d97706',
};

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const theme = getTheme();
  const C = theme === 'light' ? LIGHT_COLORS : DARK_COLORS;

  const doneRef         = useRef(false);
  const animDoneRef     = useRef(false);
  const videosReadyRef  = useRef(false);
  const videoCountRef   = useRef(0);

  const tryComplete = () => {
    if (animDoneRef.current && videosReadyRef.current && !doneRef.current) {
      doneRef.current = true;
      onComplete();
    }
  };

  useEffect(() => {
    const animTimer = setTimeout(() => {
      animDoneRef.current = true;
      tryComplete();
    }, 3100);

    const hardCap = setTimeout(() => {
      if (!doneRef.current) {
        doneRef.current = true;
        onComplete();
      }
    }, 5000);

    return () => {
      clearTimeout(animTimer);
      clearTimeout(hardCap);
    };
  }, []);

  const handleVideoReady = () => {
    videoCountRef.current += 1;
    if (videoCountRef.current >= 2 && !videosReadyRef.current) {
      videosReadyRef.current = true;
      tryComplete();
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (videosReadyRef.current) return Math.min(prev + 9, 100);
        return Math.min(prev + 1.6, 78);
      });
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const textDelay = 0.6;
  const lineDelay = textDelay + LETTERS.length * 0.075 + 0.1;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center select-none"
      style={{ background: C.bg }}
    >
      {/* Hidden video preloaders */}
      <video
        src={INTRO_VIDEO}
        preload="auto"
        muted
        playsInline
        className="video-ready"
        style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
        onCanPlay={handleVideoReady}
        onError={handleVideoReady}
      />
      <video
        src={LOOP_VIDEO}
        preload="auto"
        muted
        playsInline
        className="video-ready"
        style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
        onCanPlay={handleVideoReady}
        onError={handleVideoReady}
      />

      {/* Ambient radial glow */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          width: 320, height: 320,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${C.accentColor}12 0%, transparent 70%)`,
        }}
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.5, ease: 'easeOut' }}
      />

      {/* Diamond / minimal geometric mark */}
      <motion.div
        initial={{ opacity: 0, scale: 0.3, rotate: 45 }}
        animate={{ opacity: 1, scale: 1, rotate: 45 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        style={{
          width: 28,
          height: 28,
          border: `2px solid ${C.letterColor}`,
          marginBottom: 24,
        }}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.3 }}
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ width: 6, height: 6, background: C.accentColor, transform: 'rotate(0deg)' }} />
        </motion.div>
      </motion.div>

      {/* REFORGE lettering */}
      <div className="flex items-end" style={{ gap: '1px' }}>
        {LETTERS.map((letter, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, y: 24, scale: 1.35 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              delay: textDelay + i * 0.075,
              duration: 0.22,
              ease: [0.16, 1, 0.3, 1],
            }}
            style={{
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontWeight: 900,
              fontSize: 'clamp(48px, 12vw, 72px)',
              lineHeight: 1,
              color: C.letterColor,
              letterSpacing: '-0.02em',
              display: 'inline-block',
            }}
          >
            {letter}
          </motion.span>
        ))}
      </div>

      {/* Underline sweep */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: lineDelay, duration: 0.38, ease: 'easeOut' }}
        style={{
          height: '2px',
          background: C.letterColor,
          width: '100%',
          maxWidth: '300px',
          transformOrigin: 'left center',
          marginTop: '4px',
        }}
      />

      {/* SYSTEM sub-label */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: lineDelay + 0.25, duration: 0.4 }}
        style={{
          fontFamily: 'monospace',
          fontSize: '11px',
          letterSpacing: '0.55em',
          textTransform: 'uppercase',
          color: C.subLabel,
          marginTop: '6px',
        }}
      >
        SYSTEM
      </motion.p>

      {/* Progress bar — pinned to bottom */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: C.progressTrack,
        }}
      >
        <motion.div
          style={{ height: '100%', background: C.progressFill }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.08, ease: 'linear' }}
        />
      </div>
    </div>
  );
};

export default SplashScreen;
