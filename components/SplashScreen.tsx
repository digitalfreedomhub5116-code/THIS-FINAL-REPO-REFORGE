import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface SplashScreenProps {
  onComplete: () => void;
}

const INTRO_VIDEO = "https://res.cloudinary.com/dcnqnbvp0/video/upload/v1772375473/introvideojinwoo_1_1_1_erfku0.mp4";
const LOOP_VIDEO  = "https://res.cloudinary.com/dcnqnbvp0/video/upload/v1772384042/loopvideo_1_e9ya07.mp4";

const LETTERS = ['R','E','F','O','R','G','E'];

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);

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

  const textDelay  = 2.2;
  const lineDelay  = textDelay + LETTERS.length * 0.075 + 0.1;

  const STROKE = '#111111';

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center select-none"
      style={{ background: '#ffffff' }}
    >
      {/* Hidden video preloaders */}
      <video
        src={INTRO_VIDEO}
        preload="auto"
        muted
        playsInline
        style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
        onCanPlay={handleVideoReady}
        onError={handleVideoReady}
      />
      <video
        src={LOOP_VIDEO}
        preload="auto"
        muted
        playsInline
        style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
        onCanPlay={handleVideoReady}
        onError={handleVideoReady}
      />

      {/* ── Sword SVG ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        {/*
          ViewBox  : 0 0 120 310
          Tip      : (60, 7)
          Blade    : y 7–196
          Guard    : y 193–214   (wider, pointed quillon tips)
          Grip     : y 216–278
          Pommel   : cx 60 cy 292 r 14
        */}
        <svg
          viewBox="0 0 120 310"
          width="105"
          height="272"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ display: 'block' }}
        >

          {/* ═══════════════════════════════
              BLADE
          ═══════════════════════════════ */}

          {/* Right outer edge */}
          <motion.path
            d="M 60 7 C 61 55 64.5 140 65.5 192"
            stroke={STROKE} strokeWidth="1.6" strokeLinecap="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
            transition={{ duration: 1.25, ease: [0.4, 0, 0.2, 1] }}
          />
          {/* Left outer edge */}
          <motion.path
            d="M 60 7 C 59 55 55.5 140 54.5 192"
            stroke={STROKE} strokeWidth="1.6" strokeLinecap="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
            transition={{ duration: 1.25, ease: [0.4, 0, 0.2, 1] }}
          />
          {/* Blade base connector (ricasso bottom) */}
          <motion.path
            d="M 54.5 192 C 55.5 196 57.5 198 60 198 C 62.5 198 64.5 196 65.5 192"
            stroke={STROKE} strokeWidth="1.6" strokeLinecap="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
            transition={{ duration: 0.28, delay: 1.25, ease: 'easeOut' }}
          />

          {/* Right face bevel — inner ridge line (gives the blade 3-D diamond cross-section) */}
          <motion.path
            d="M 60 10 C 60.5 55 63 140 63.5 188"
            stroke={STROKE} strokeWidth="0.75" strokeOpacity="0.28" strokeLinecap="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
            transition={{ duration: 1.05, delay: 0.18, ease: 'easeInOut' }}
          />
          {/* Left face bevel */}
          <motion.path
            d="M 60 10 C 59.5 55 57 140 56.5 188"
            stroke={STROKE} strokeWidth="0.75" strokeOpacity="0.28" strokeLinecap="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
            transition={{ duration: 1.05, delay: 0.18, ease: 'easeInOut' }}
          />

          {/* Fuller (shallow groove running down centre of each face) */}
          <motion.line
            x1="60" y1="36" x2="60" y2="180"
            stroke={STROKE} strokeWidth="0.55" strokeOpacity="0.18" strokeLinecap="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
            transition={{ duration: 0.95, delay: 0.3, ease: 'easeInOut' }}
          />

          {/* Tip spark */}
          <motion.circle
            cx="60" cy="7" r="4"
            fill="#d97706"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 5, 0], opacity: [0, 0.9, 0] }}
            transition={{ delay: 1.25, duration: 0.42, ease: 'easeOut' }}
            style={{ transformOrigin: '60px 7px' }}
          />


          {/* ═══════════════════════════════
              GUARD  (crossguard with pointed quillon tips + visible depth)
          ═══════════════════════════════ */}

          {/* Main guard silhouette — wider, pointed at both ends */}
          <motion.path
            d="
              M 17 201
              C 22 195 38 193 54 193
              C 56 193 58 192 60 192
              C 62 192 64 193 66 193
              C 82 193 98 195 103 201
              C 98 208 82 210 66 210
              C 64 211 62 212 60 212
              C 58 212 56 211 54 210
              C 38 210 22 208 17 201
              Z
            "
            stroke={STROKE} strokeWidth="1.8" strokeLinejoin="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
            transition={{ duration: 0.55, delay: 1.5, ease: 'easeOut' }}
          />
          {/* Guard top depth line — subtle inner ridge showing the top flat face */}
          <motion.path
            d="M 24 197 C 38 195 54 194 60 194 C 66 194 82 195 96 197"
            stroke={STROKE} strokeWidth="0.7" strokeOpacity="0.35" strokeLinecap="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
            transition={{ duration: 0.35, delay: 1.95, ease: 'easeOut' }}
          />
          {/* Guard centre notch top (blade slot) */}
          <motion.path
            d="M 54 193 C 56.5 193.5 58.5 194 60 194 C 61.5 194 63.5 193.5 66 193"
            stroke={STROKE} strokeWidth="0.8" strokeOpacity="0.45"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
            transition={{ duration: 0.18, delay: 2.0, ease: 'easeOut' }}
          />


          {/* ═══════════════════════════════
              GRIP
          ═══════════════════════════════ */}

          {/* Left grip edge */}
          <motion.line
            x1="54" y1="214" x2="55" y2="273"
            stroke={STROKE} strokeWidth="1.6" strokeLinecap="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
            transition={{ duration: 0.45, delay: 2.02, ease: 'easeOut' }}
          />
          {/* Right grip edge */}
          <motion.line
            x1="66" y1="214" x2="65" y2="273"
            stroke={STROKE} strokeWidth="1.6" strokeLinecap="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
            transition={{ duration: 0.45, delay: 2.02, ease: 'easeOut' }}
          />
          {/* Grip bottom cap */}
          <motion.path
            d="M 55 273 Q 55 278 60 278 Q 65 278 65 273"
            stroke={STROKE} strokeWidth="1.4" strokeLinecap="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
            transition={{ duration: 0.18, delay: 2.46, ease: 'easeOut' }}
          />

          {/* Grip wrap — diagonal crossed-leather pattern */}
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.14, duration: 0.28 }}
          >
            {/* Each pair: main wrap line + shadow edge below it */}
            {[
              { y: 218, slant: 2 },
              { y: 226, slant: -2 },
              { y: 234, slant: 2 },
              { y: 242, slant: -2 },
              { y: 250, slant: 2 },
              { y: 258, slant: -2 },
              { y: 266, slant: 2 },
            ].map(({ y, slant }) => (
              <React.Fragment key={y}>
                <line
                  x1="54" y1={y} x2="66" y2={y + slant}
                  stroke={STROKE} strokeWidth="1.0" strokeOpacity="0.42"
                />
                <line
                  x1="54" y1={y + 2} x2="66" y2={y + slant + 2}
                  stroke={STROKE} strokeWidth="0.5" strokeOpacity="0.15"
                />
              </React.Fragment>
            ))}
          </motion.g>


          {/* ═══════════════════════════════
              POMMEL  (wheel pommel — outer ring, inner ring, spokes, gem)
          ═══════════════════════════════ */}

          {/* Outer ring */}
          <motion.circle
            cx="60" cy="292" r="14"
            stroke={STROKE} strokeWidth="1.8"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
            transition={{ duration: 0.48, delay: 2.3, ease: 'easeOut' }}
          />
          {/* Inner decorative ring */}
          <motion.circle
            cx="60" cy="292" r="8"
            stroke={STROKE} strokeWidth="0.9" strokeOpacity="0.45"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
            transition={{ duration: 0.32, delay: 2.62, ease: 'easeOut' }}
          />
          {/* Horizontal spoke */}
          <motion.line
            x1="52" y1="292" x2="68" y2="292"
            stroke={STROKE} strokeWidth="0.55" strokeOpacity="0.3"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
            transition={{ duration: 0.18, delay: 2.78, ease: 'easeOut' }}
          />
          {/* Vertical spoke */}
          <motion.line
            x1="60" y1="284" x2="60" y2="300"
            stroke={STROKE} strokeWidth="0.55" strokeOpacity="0.3"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
            transition={{ duration: 0.18, delay: 2.78, ease: 'easeOut' }}
          />
          {/* Centre gem */}
          <motion.circle
            cx="60" cy="292" r="2.8"
            fill={STROKE}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 2.88, duration: 0.18 }}
          />

        </svg>
      </motion.div>

      {/* REFORGE lettering */}
      <div className="flex items-end mt-5" style={{ gap: '1px' }}>
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
              color: '#111111',
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
          background: '#111111',
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
          color: '#aaaaaa',
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
          background: '#e5e7eb',
        }}
      >
        <motion.div
          style={{ height: '100%', background: '#111111' }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.08, ease: 'linear' }}
        />
      </div>
    </div>
  );
};

export default SplashScreen;
