import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE } from '../lib/apiConfig';

interface DuskWelcomeScreenProps {
  onComplete: () => void;
}

const DUSK_MESSAGE = "I am Dusk, your Accountability Partner.\n\nCreated by The Architect to guide your journey and ensure fairness. I monitor progress, enforce discipline, and prevent cheating.\n\nEvery achievement must be earned.\n\nYour journey begins now.";

// ── Ambient floating particles ──
const AmbientParticles: React.FC = () => {
  const particles = useMemo(() =>
    Array.from({ length: 18 }, (_, i) => ({
      id: i,
      left: `${5 + Math.random() * 90}%`,
      delay: Math.random() * 6,
      duration: 5 + Math.random() * 7,
      size: 1 + Math.random() * 2,
      drift: (Math.random() - 0.5) * 60,
      opacity: 0.15 + Math.random() * 0.35,
    })), []);

  return (
    <>
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: p.left,
            bottom: '5%',
            width: p.size,
            height: p.size,
            background: '#00d2ff',
            boxShadow: `0 0 ${p.size * 3}px rgba(0,210,255,0.6)`,
          }}
          animate={{
            y: [0, -(200 + Math.random() * 300)],
            x: [0, p.drift],
            opacity: [p.opacity, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeOut',
          }}
        />
      ))}
    </>
  );
};

// ── Horizontal scan line effect ──
const ScanLine: React.FC = () => (
  <motion.div
    className="absolute left-0 right-0 h-px pointer-events-none z-10"
    style={{
      background: 'linear-gradient(90deg, transparent, rgba(0,210,255,0.4), rgba(0,210,255,0.2), transparent)',
    }}
    animate={{ top: ['0%', '100%'] }}
    transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
  />
);

const DuskWelcomeScreen: React.FC<DuskWelcomeScreenProps> = ({ onComplete }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [typingDone, setTypingDone] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const [introEnded, setIntroEnded] = useState(false);

  // Default outfit data from DB
  const [introVideoUrl, setIntroVideoUrl] = useState('');
  const [loopVideoUrl, setLoopVideoUrl] = useState('');
  const [fallbackImage, setFallbackImage] = useState('');
  const [videosReady, setVideosReady] = useState(false);

  const introRef = useRef<HTMLVideoElement>(null);
  const loopRef = useRef<HTMLVideoElement>(null);

  // ── Fetch default outfit on mount ──
  useEffect(() => {
    fetch(`${API_BASE}/api/store/outfits`)
      .then(r => r.json())
      .then((rows: any[]) => {
        if (!Array.isArray(rows)) return;
        const defaultOutfit = rows.find((o: any) => o.is_default === true) || rows[0];
        if (!defaultOutfit) return;
        if (defaultOutfit.intro_video_url) setIntroVideoUrl(defaultOutfit.intro_video_url);
        if (defaultOutfit.loop_video_url) setLoopVideoUrl(defaultOutfit.loop_video_url);
        if (defaultOutfit.image_url) setFallbackImage(defaultOutfit.image_url);
      })
      .catch(() => { /* fail silently — fallback image or empty */ });
  }, []);

  // ── Typewriter effect ──
  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i < DUSK_MESSAGE.length) {
        setDisplayedText(DUSK_MESSAGE.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
        setTypingDone(true);
        setTimeout(() => setShowButton(true), 400);
      }
    }, 22);
    return () => clearInterval(interval);
  }, []);

  // ── Video playback: intro → loop ──
  useEffect(() => {
    if (!introVideoUrl && !loopVideoUrl) return;

    const intro = introRef.current;
    const loop = loopRef.current;

    if (introVideoUrl && intro) {
      intro.src = introVideoUrl;
      intro.load();
      intro.play().catch(() => {
        // If intro fails, jump to loop
        setIntroEnded(true);
        if (loop && loopVideoUrl) {
          loop.src = loopVideoUrl;
          loop.load();
          loop.play().catch(() => {});
        }
      });
      setVideosReady(true);
    } else if (loopVideoUrl && loop) {
      loop.src = loopVideoUrl;
      loop.load();
      loop.play().catch(() => {});
      setIntroEnded(true);
      setVideosReady(true);
    }
  }, [introVideoUrl, loopVideoUrl]);

  const handleIntroEnd = () => {
    setIntroEnded(true);
    const loop = loopRef.current;
    if (loop && loopVideoUrl) {
      loop.src = loopVideoUrl;
      loop.load();
      loop.play().catch(() => {});
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black overflow-hidden">

      {/* ═══════════════════════════════════════════════════════
          LAYOUT: stacked on mobile, side-by-side on md+
          ═══════════════════════════════════════════════════════ */}
      <div className="relative w-full h-full flex flex-col md:flex-row">

        {/* ── LEFT: Thought Box Panel ── */}
        <div className="relative flex-1 flex flex-col items-center justify-end md:justify-center px-4 py-8 overflow-hidden z-20 pb-24 md:pb-4">

          {/* Floating particles */}
          <AmbientParticles />

          {/* Slow scan line */}
          <ScanLine />

          {/* Thought box container */}
          <motion.div
            className="relative z-20 w-full max-w-[280px] md:max-w-xs"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: [0, -8, 0] }}
            transition={{ 
              opacity: { duration: 0.8, delay: 0.3 },
              y: { duration: 3, repeat: Infinity, ease: 'easeInOut' }
            }}
          >
            {/* Glass panel */}
            <div
              className="rounded-xl px-4 py-4"
              style={{
                background: 'rgba(255,255,255,0.03)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(0,210,255,0.25)',
                boxShadow: '0 0 40px rgba(0,210,255,0.08), 0 0 80px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)',
              }}
            >
              {/* Header label */}
              <div className="flex items-center gap-1.5 mb-3">
                <motion.div
                  className="w-1 h-1 rounded-full bg-cyan-400"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <p className="font-mono text-[8px] tracking-[0.25em] uppercase text-cyan-400/70">
                  DUSK // ACCOUNTABILITY AI
                </p>
              </div>

              {/* Typewriter message */}
              <div
                className="text-[12px] md:text-[13px] leading-relaxed font-medium mb-4 min-h-[100px]"
                style={{ color: 'rgba(255,255,255,0.88)', fontFamily: 'Georgia, serif' }}
              >
                {displayedText}
                {!typingDone && (
                  <motion.span
                    animate={{ opacity: [1, 0] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                    className="inline-block ml-0.5 align-middle"
                    style={{
                      width: '1.5px',
                      height: '0.9em',
                      background: '#00d2ff',
                    }}
                  />
                )}
              </div>

              {/* ARISE button */}
              <AnimatePresence>
                {showButton && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <button
                      onClick={onComplete}
                      className="w-full py-3 rounded-lg font-black text-xs tracking-[0.2em] uppercase transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                      style={{
                        background: 'linear-gradient(135deg, rgba(0,210,255,0.9), rgba(0,180,220,0.95))',
                        color: '#fff',
                        border: '1px solid rgba(0,210,255,0.6)',
                        boxShadow: '0 0 25px rgba(0,210,255,0.3), 0 4px 20px rgba(0,0,0,0.4)',
                      }}
                    >
                      ARISE
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Decorative corner accents */}
            <div className="absolute -top-px -left-px w-6 h-6 pointer-events-none">
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-cyan-400/60 to-transparent" />
              <div className="absolute top-0 left-0 h-full w-px bg-gradient-to-b from-cyan-400/60 to-transparent" />
            </div>
            <div className="absolute -top-px -right-px w-6 h-6 pointer-events-none">
              <div className="absolute top-0 right-0 w-full h-px bg-gradient-to-l from-cyan-400/60 to-transparent" />
              <div className="absolute top-0 right-0 h-full w-px bg-gradient-to-b from-cyan-400/60 to-transparent" />
            </div>
            <div className="absolute -bottom-px -left-px w-6 h-6 pointer-events-none">
              <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-cyan-400/40 to-transparent" />
              <div className="absolute bottom-0 left-0 h-full w-px bg-gradient-to-t from-cyan-400/40 to-transparent" />
            </div>
            <div className="absolute -bottom-px -right-px w-6 h-6 pointer-events-none">
              <div className="absolute bottom-0 right-0 w-full h-px bg-gradient-to-l from-cyan-400/40 to-transparent" />
              <div className="absolute bottom-0 right-0 h-full w-px bg-gradient-to-t from-cyan-400/40 to-transparent" />
            </div>
          </motion.div>

          {/* Bottom-right system tag */}
          <motion.div
            className="absolute bottom-4 right-5 z-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
          >
            <span className="font-mono text-[8px] tracking-[0.2em] text-gray-700 uppercase">
              SYS_v2.0 // REFORGE
            </span>
          </motion.div>
        </div>

        {/* ── RIGHT / Behind on mobile: Character Video Panel ── */}
        <div className="absolute inset-0 md:relative md:w-[45%] md:h-full flex-shrink-0 flex items-center justify-center overflow-hidden">

          {/* Fallback static image (shows while videos load or if no videos) */}
          {fallbackImage && !videosReady && (
            <img
              src={fallbackImage}
              alt="Character"
              className="absolute inset-0 w-full h-full object-contain object-center"
              style={{ filter: 'brightness(0.9)', maxHeight: '100%', maxWidth: '100%' }}
            />
          )}

          {/* Loop video (behind intro) */}
          <video
            ref={loopRef}
            poster="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
            className="absolute inset-0 w-full h-full"
            style={{ objectFit: 'contain', objectPosition: 'center', zIndex: 0, maxHeight: '100%', maxWidth: '100%' }}
            loop
            muted
            playsInline
            preload="auto"
            // @ts-ignore — webkit attribute for iOS/Android
            webkit-playsinline="true"
          />

          {/* Intro video — fades out when done */}
          <motion.video
            ref={introRef}
            poster="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
            className="absolute inset-0 w-full h-full"
            style={{ objectFit: 'contain', objectPosition: 'center', zIndex: 1, maxHeight: '100%', maxWidth: '100%' }}
            muted
            playsInline
            preload="auto"
            // @ts-ignore
            webkit-playsinline="true"
            onEnded={handleIntroEnd}
            animate={{ opacity: introEnded ? 0 : 1 }}
            transition={{ duration: 0.4 }}
          />

          {/* Heavy vignette overlay - all edges */}
          <div
            className="absolute inset-0 pointer-events-none z-10"
            style={{
              background: `
                linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,0.85) 8%, rgba(0,0,0,0.4) 20%, transparent 35%, transparent 65%, rgba(0,0,0,0.4) 80%, rgba(0,0,0,0.85) 92%, rgba(0,0,0,1) 100%),
                linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.9) 6%, rgba(0,0,0,0.5) 15%, transparent 30%, transparent 70%, rgba(0,0,0,0.5) 85%, rgba(0,0,0,0.9) 94%, rgba(0,0,0,1) 100%)
              `,
              boxShadow: `
                inset 0 0 120px 40px rgba(0,0,0,0.9),
                inset 0 0 80px 20px rgba(0,0,0,0.7),
                inset 0 0 40px 10px rgba(0,0,0,0.5)
              `
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default DuskWelcomeScreen;
