import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface MentorMessage {
  id: string;
  text: string;
}

interface MentorThoughtBoxProps {
  messages: MentorMessage[];
  onDismiss: (id: string) => void;
}

// Typewriter text component with glitch flicker
const TypewriterText: React.FC<{ text: string }> = ({ text }) => {
  const [displayed, setDisplayed] = useState('');
  const [glitch, setGlitch] = useState(false);

  useEffect(() => {
    setDisplayed('');
    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayed(text.slice(0, i + 1));
        i++;
        // Random glitch flicker
        if (Math.random() < 0.15) {
          setGlitch(true);
          setTimeout(() => setGlitch(false), 80);
        }
      } else {
        clearInterval(interval);
      }
    }, 35);
    return () => clearInterval(interval);
  }, [text]);

  return (
    <span style={{ 
      opacity: glitch ? 0.4 : 1, 
      textShadow: glitch ? '2px 0 #00d2ff, -2px 0 #ff0040' : 'none',
      transition: 'all 0.05s'
    }}>
      {displayed}
      <span className="animate-pulse text-[#00d2ff]">_</span>
    </span>
  );
};

const MentorThoughtBox: React.FC<MentorThoughtBoxProps> = ({ messages, onDismiss }) => {
  const currentMessage = messages.length > 0 ? messages[messages.length - 1] : null;

  useEffect(() => {
    if (currentMessage) {
      const timer = setTimeout(() => {
        onDismiss(currentMessage.id);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [currentMessage, onDismiss]);

  return (
    <div className="absolute bottom-8 right-4 z-50 pointer-events-none flex flex-col gap-2 items-end max-w-[180px]">
      <AnimatePresence>
        {currentMessage && (
          <motion.div
            key={currentMessage.id}
            initial={{ opacity: 0, scaleY: 0, scaleX: 0.5 }}
            animate={{ opacity: 1, scaleY: 1, scaleX: 1 }}
            exit={{ 
              scaleY: 0, 
              scaleX: 0.02, 
              opacity: 0,
              transition: { duration: 0.3, ease: [0.4, 0, 1, 1] }
            }}
            transition={{ type: 'spring', damping: 18, stiffness: 300 }}
            style={{ originY: 1 }}
            className="pointer-events-auto cursor-pointer"
            onClick={() => onDismiss(currentMessage.id)}
          >
            <div className="relative">
              <div className="bg-[#0A0A0F]/90 border border-[#00d2ff]/30 px-3 py-2 rounded-lg shadow-[0_0_20px_rgba(0,210,255,0.15)] backdrop-blur-md">
                <div className="text-[8px] text-[#00d2ff]/80 font-black font-mono tracking-[0.3em] uppercase mb-1 flex items-center gap-1">
                  <div className="w-1 h-1 bg-[#00d2ff] rounded-full animate-pulse shadow-[0_0_4px_#00d2ff]" />
                  DUSK
                </div>
                <div className="text-[10px] text-white/90 font-mono leading-relaxed">
                  <TypewriterText text={currentMessage.text} />
                </div>
              </div>
              {/* Tail pointing left towards the character */}
              <div className="absolute -left-2 bottom-4 w-4 h-4 bg-[#0A0A0F]/90 border-b border-l border-[#00d2ff]/30 transform rotate-45 backdrop-blur-md -z-10" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MentorThoughtBox;
