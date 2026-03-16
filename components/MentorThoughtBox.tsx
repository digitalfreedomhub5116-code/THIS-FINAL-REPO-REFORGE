import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface MentorMessage {
  id: string;
  text: string;
}

interface MentorThoughtBoxProps {
  messages: MentorMessage[];
  onDismiss: (id: string) => void;
}

const MentorThoughtBox: React.FC<MentorThoughtBoxProps> = ({ messages, onDismiss }) => {
  // We only show the latest message to avoid cluttering the screen
  const currentMessage = messages.length > 0 ? messages[messages.length - 1] : null;

  useEffect(() => {
    if (currentMessage) {
      const timer = setTimeout(() => {
        onDismiss(currentMessage.id);
      }, 8000); // Auto-dismiss after 8 seconds
      return () => clearTimeout(timer);
    }
  }, [currentMessage, onDismiss]);

  return (
    <div className="absolute top-4 right-4 z-50 pointer-events-none flex flex-col gap-2 items-end max-w-[200px]">
      <AnimatePresence>
        {currentMessage && (
          <motion.div
            key={currentMessage.id}
            initial={{ opacity: 0, scale: 0.8, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: 20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="pointer-events-auto cursor-pointer"
            onClick={() => onDismiss(currentMessage.id)}
          >
            <div className="relative">
              {/* Box */}
              <div 
                className="bg-black/80 border border-[#00d2ff]/40 p-3 rounded-xl rounded-tr-sm shadow-[0_0_15px_rgba(0,210,255,0.2)] backdrop-blur-md"
              >
                <div className="text-[10px] text-[#00d2ff] font-black font-mono tracking-widest uppercase mb-1 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-[#00d2ff] rounded-full animate-pulse shadow-[0_0_5px_#00d2ff]" />
                  DUSK
                </div>
                <div className="text-xs text-white font-mono leading-relaxed">
                  "{currentMessage.text}"
                </div>
              </div>
              {/* Tail pointing right */}
              <div className="absolute -right-2 top-0 w-4 h-4 bg-black/80 border-t border-r border-[#00d2ff]/40 transform rotate-45 translate-y-2 -translate-x-1 backdrop-blur-md -z-10" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MentorThoughtBox;
