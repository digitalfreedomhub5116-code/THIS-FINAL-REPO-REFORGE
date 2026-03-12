import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DuskWelcomeScreenProps {
  onComplete: () => void;
}

const DUSK_MESSAGE = "You've been detected. The System has chosen you. Before we proceed — understand this: every action, every failure, every victory will be recorded. I am the New Architect. I will be watching.";

const INTRO_VIDEO = "https://res.cloudinary.com/dcnqnbvp0/video/upload/v1772375473/introvideojinwoo_1_1_1_erfku0.mp4";
const LOOP_VIDEO = "https://res.cloudinary.com/dcnqnbvp0/video/upload/v1772384042/loopvideo_1_e9ya07.mp4";

const DuskWelcomeScreen: React.FC<DuskWelcomeScreenProps> = ({ onComplete }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [typingDone, setTypingDone] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const [introEnded, setIntroEnded] = useState(false);

  const introRef = useRef<HTMLVideoElement>(null);
  const loopRef = useRef<HTMLVideoElement>(null);

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

  useEffect(() => {
    if (introRef.current) introRef.current.play().catch(() => {});
    if (loopRef.current)  loopRef.current.play().catch(() => {});
  }, []);

  const handleIntroEnd = () => {
    setIntroEnded(true);
    if (loopRef.current) {
      loopRef.current.play().catch(() => {});
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200]"
      style={{ background: '#E7E7E2' }}
    >
      {/* BACKGROUND: Loop video */}
      <video
        ref={loopRef}
        src={LOOP_VIDEO}
        className="absolute inset-0 w-full h-full"
        style={{ objectFit: 'cover', zIndex: 0 }}
        loop
        muted
        playsInline
        autoPlay
        preload="auto"
      />

      {/* BACKGROUND: Intro video — fades out when done */}
      <motion.video
        ref={introRef}
        src={INTRO_VIDEO}
        className="absolute inset-0 w-full h-full"
        style={{ objectFit: 'cover', zIndex: 1 }}
        autoPlay
        muted
        playsInline
        preload="auto"
        onEnded={handleIntroEnd}
        animate={{ opacity: introEnded ? 0 : 1 }}
        transition={{ duration: 0.3 }}
      />

      {/* FOREGROUND: Floating glass panel */}
      <div
        className="absolute bottom-0 left-0 right-0 flex justify-center px-5 pb-10"
        style={{ zIndex: 2 }}
      >
        <motion.div
          className="w-full rounded-2xl px-8 py-6"
          style={{
            maxWidth: '806px',
            background: 'rgba(231, 231, 226, 0.18)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(147, 51, 234, 0.5)',
            boxShadow: '0 24px 60px rgba(0,0,0,0.35), 0 8px 24px rgba(0,0,0,0.2), 0 0 0 1px rgba(147,51,234,0.12), inset 0 1px 0 rgba(255,255,255,0.18)',
          }}
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <p
            className="font-mono text-[11px] tracking-[0.3em] uppercase mb-3"
            style={{ color: '#000000aa' }}
          >
            DUSK // ACCOUNTABILITY AI
          </p>

          <div
            className="text-base sm:text-lg leading-relaxed font-medium mb-5"
            style={{ color: '#000000', fontFamily: 'Georgia, serif' }}
          >
            {displayedText}
            {!typingDone && (
              <motion.span
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.5, repeat: Infinity }}
                style={{
                  display: 'inline-block',
                  width: '1.5px',
                  height: '0.9em',
                  background: '#000000',
                  marginLeft: '2px',
                  verticalAlign: 'middle',
                }}
              />
            )}
          </div>

          <AnimatePresence>
            {showButton && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
              >
                <button
                  onClick={onComplete}
                  className="w-full py-3.5 rounded-xl font-black text-sm tracking-[0.2em] uppercase transition-all duration-200 hover:opacity-80 active:scale-[0.98]"
                  style={{
                    background: '#000000',
                    color: '#E7E7E2',
                    border: '1px solid rgba(147, 51, 234, 0.7)',
                    boxShadow: '0 0 18px rgba(147,51,234,0.3)',
                  }}
                >
                  ARISE
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};

export default DuskWelcomeScreen;
