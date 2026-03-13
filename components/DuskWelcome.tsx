
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, ArrowRight, Activity, Loader2 } from 'lucide-react';

interface DuskWelcomeProps {
  text: string;
  secondaryText?: string;
  buttonLabel: string;
  onComplete: () => void;
  entranceVideoUrl?: string;
  loopVideoUrl?: string;
}

// Local Assets (bundled for offline mobile use)
const DEFAULT_ENTRANCE = "/videos/intro/entrance.mp4";
const DEFAULT_LOOP = "/videos/intro/loop-bg.mp4";
const PLACEHOLDER_IMG = "/images/ui/placeholder.jpg";

const TypewriterText: React.FC<{ text: string; delay?: number; onComplete?: () => void; start: boolean }> = ({ text, delay = 0, onComplete, start }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!start) return;
    const startTimer = setTimeout(() => {
      setStarted(true);
    }, delay);
    return () => clearTimeout(startTimer);
  }, [delay, start]);

  useEffect(() => {
    if (!started) return;
    if (displayedText.length < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(text.slice(0, displayedText.length + 1));
      }, 30); // Typing speed
      return () => clearTimeout(timeout);
    } else {
      if (onComplete) onComplete();
    }
  }, [displayedText, started, text, onComplete]);

  return <span>{displayedText}</span>;
};

const DuskWelcome: React.FC<DuskWelcomeProps> = ({ 
  text, 
  secondaryText, 
  buttonLabel, 
  onComplete,
  entranceVideoUrl = DEFAULT_ENTRANCE,
  loopVideoUrl = DEFAULT_LOOP
}) => {
  const [showSecondary, setShowSecondary] = useState(false);
  const [showButton, setShowButton] = useState(false);
  
  // Synchronization State
  const [videoStarted, setVideoStarted] = useState(false);
  
  // Video State
  const [showEntrance, setShowEntrance] = useState(true);
  const entranceVideoRef = useRef<HTMLVideoElement>(null);
  const loopVideoRef = useRef<HTMLVideoElement>(null);

  // Safety Fallback: If video takes too long, force UI to show
  useEffect(() => {
      const fallbackTimer = setTimeout(() => {
          if (!videoStarted) {
              console.warn("Video load timeout - Forcing UI");
              setVideoStarted(true);
          }
      }, 3500); // 3.5s max wait

      // Force Play Attempt
      if (entranceVideoRef.current) {
          entranceVideoRef.current.play().catch(e => console.log("Auto-play blocked/pending:", e));
      }

      return () => clearTimeout(fallbackTimer);
  }, [videoStarted]);

  const handleEntranceEnd = () => {
    // Hide entrance video to reveal loop video underneath
    setShowEntrance(false);
    // Ensure loop is playing (it should be autoplaying, but safe to force)
    if (loopVideoRef.current) {
        loopVideoRef.current.play().catch(e => console.log("Loop play caught:", e));
    }
  };

  const handleVideoReady = () => {
      // Trigger when video has enough data to play
      setVideoStarted(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-row h-[100dvh] w-screen overflow-hidden font-mono">
      
      {/* --- SECTION 1: TEXT INTERFACE (Left Side) --- */}
      <div className="relative w-[40%] md:w-1/2 h-full flex flex-col justify-center items-center pl-6 pr-2 py-2 sm:p-6 md:p-16 z-20 bg-black">
         
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,210,255,0.03)_0%,transparent_70%)] pointer-events-none" />
         <div className="absolute top-4 left-4 opacity-50">
             <div className="flex items-center gap-1 md:gap-2 text-system-neon">
                <Activity size={12} className="animate-pulse md:w-4 md:h-4" />
                <span className="text-[8px] md:text-[10px] tracking-widest uppercase">Secure Connection</span>
             </div>
         </div>

         {/* Content Wrapper - Hidden until video starts */}
         <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: videoStarted ? 1 : 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-lg w-full md:space-y-8 relative z-10 flex flex-col justify-center h-full"
         >
            <div className="flex items-center gap-2 md:gap-3 text-system-neon mb-2 md:mb-0 shrink-0">
                <div className="p-1.5 md:p-2 border border-system-neon/30 rounded bg-system-neon/5">
                    <Terminal size={16} className="md:w-6 md:h-6" />
                </div>
                <span className="font-bold text-[10px] md:text-sm tracking-[0.2em] uppercase">System Uplink</span>
            </div>

            <div className="bg-[#001220] border border-system-neon/60 p-3 md:p-10 rounded-tr-xl md:rounded-tr-3xl rounded-bl-xl md:rounded-bl-3xl shadow-[0_0_20px_rgba(0,210,255,0.15)] md:shadow-[0_0_40px_rgba(0,210,255,0.15)] relative overflow-hidden shrink-0 mb-8 md:mb-0">
                <motion.div 
                    className="absolute top-0 left-0 w-full h-[2px] bg-system-neon/30 shadow-[0_0_10px_#00d2ff]"
                    animate={{ top: ['0%', '100%', '0%'] }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                />
                
                <div className="absolute top-0 right-0 w-2 h-2 md:w-4 md:h-4 border-t-2 border-r-2 border-system-neon" />
                <div className="absolute bottom-0 left-0 w-2 h-2 md:w-4 md:h-4 border-b-2 border-l-2 border-system-neon" />

                <div className="text-system-neon font-mono text-xs sm:text-sm md:text-xl leading-relaxed tracking-wide">
                    <span className="font-black mr-2 md:mr-3 text-white bg-system-neon/20 px-1">DUSK:</span>
                    <TypewriterText start={videoStarted} text={text} onComplete={() => setShowSecondary(true)} />
                    <span className="animate-pulse inline-block w-1 h-3 md:w-2 md:h-4 bg-system-neon ml-1 align-middle" />
                </div>
            </div>

            <div className="min-h-[40px] md:min-h-[60px] shrink-0 mb-8 md:mb-0">
                {secondaryText && showSecondary && (
                    <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-gray-400 font-mono text-[10px] sm:text-xs md:text-sm pl-3 md:pl-6 border-l-2 border-gray-800 italic leading-tight"
                    >
                        <TypewriterText start={videoStarted} text={secondaryText} delay={500} onComplete={() => setShowButton(true)} />
                    </motion.div>
                )}
            </div>

            <div className="h-10 md:h-16 flex items-start shrink-0">
                {(showButton || (!secondaryText && showSecondary)) && (
                    <motion.button
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        onClick={onComplete}
                        className="group relative px-4 py-2 md:px-8 md:py-4 bg-system-neon text-black font-black font-mono uppercase tracking-widest rounded hover:bg-white transition-all flex items-center gap-2 md:gap-4 shadow-[0_0_15px_rgba(0,210,255,0.4)] md:shadow-[0_0_25px_rgba(0,210,255,0.4)] overflow-hidden text-xs md:text-base whitespace-nowrap"
                    >
                        <span className="relative z-10">{buttonLabel}</span>
                        <ArrowRight size={14} className="relative z-10 group-hover:translate-x-1 transition-transform md:w-5 md:h-5" />
                        <div className="absolute inset-0 bg-white/30 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 skew-x-12" />
                    </motion.button>
                )}
            </div>
         </motion.div>
      </div>

      {/* --- SECTION 2: VIDEO (Right Side) --- */}
      <div className="relative w-[60%] md:w-1/2 h-full overflow-hidden bg-gray-900">
         
         {/* LOADING OVERLAY */}
         <AnimatePresence>
            {!videoStarted && (
                <motion.div 
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#050505] p-4 text-center"
                >
                    <div className="relative flex items-center justify-center">
                        <div className="absolute inset-0 bg-system-neon/20 blur-xl rounded-full" />
                        <Loader2 className="w-12 h-12 text-system-neon animate-spin relative z-10" />
                    </div>
                    <div className="mt-4 text-xs font-mono text-system-neon tracking-[0.2em] md:tracking-[0.3em] animate-pulse font-bold w-full">
                        SYNCHRONIZING FEED...
                    </div>
                </motion.div>
            )}
         </AnimatePresence>

         {/* VIDEO LAYER 1: LOOP (Underneath) */}
         <video 
            ref={loopVideoRef}
            src={loopVideoUrl}
            poster={PLACEHOLDER_IMG}
            className="absolute inset-0 w-full h-full object-cover opacity-90 z-0"
            loop 
            muted 
            playsInline 
            preload="auto"
         />

         {/* VIDEO LAYER 2: ENTRANCE (On Top) */}
         <motion.video 
            key={entranceVideoUrl} // Remount if URL changes
            ref={entranceVideoRef}
            src={entranceVideoUrl}
            poster={PLACEHOLDER_IMG}
            className="absolute inset-0 w-full h-full object-cover z-10"
            autoPlay 
            muted 
            playsInline 
            onEnded={handleEntranceEnd}
            onCanPlay={handleVideoReady} // Backup trigger
            onPlaying={handleVideoReady} // Primary trigger
            onError={handleVideoReady}   // Fallback trigger if video fails
            animate={{ opacity: showEntrance ? 1 : 0 }} 
            transition={{ duration: 0.5 }} 
            style={{ pointerEvents: 'none' }}
         />
         
         {/* Shadow Fade In from LEFT */}
         <div className="absolute inset-y-0 left-0 w-24 md:w-64 bg-gradient-to-r from-black via-black/90 to-transparent z-20 pointer-events-none" />
         
         {/* Vignette Overlay */}
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,black_120%)] opacity-60 z-20 pointer-events-none" />
         
         {/* Tech Scanlines */}
         <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0)_50%,rgba(0,0,0,0.4)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] pointer-events-none z-30 mix-blend-overlay opacity-40" />
         
         {/* Bottom Label */}
         <div className="absolute bottom-4 right-4 md:bottom-8 md:right-8 text-right z-30">
             <div className="text-[8px] md:text-[10px] text-white/50 font-mono tracking-[0.3em] md:tracking-[0.5em] uppercase">Accountability Protocol</div>
             <div className="text-2xl md:text-4xl font-black text-white/10 font-mono">DUSK</div>
         </div>
      </div>

    </div>
  );
};

export default DuskWelcome;
