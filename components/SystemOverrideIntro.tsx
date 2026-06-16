import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { Capacitor } from "@capacitor/core";

interface SystemOverrideIntroProps {
  onComplete: () => void;
}

type IntroPhase = "WHITE_FLASH" | "BSOD" | "STATIC" | "VOID_SCROLL";

export const SystemOverrideIntro: React.FC<SystemOverrideIntroProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState<IntroPhase>("WHITE_FLASH");
  const [percentage, setPercentage] = useState(5);
  
  // Scrollytelling typewriter states
  const [typingIndex, setTypingIndex] = useState(0);
  const [typedText1, setTypedText1] = useState("");
  const [typedText2, setTypedText2] = useState("");
  const [typedText3, setTypedText3] = useState("");
  const [showFooter, setShowFooter] = useState(false);
  const [showProceed, setShowProceed] = useState(false);

  // Audio refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const staticSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const staticGainRef = useRef<GainNode | null>(null);
  const buzzOscRef = useRef<OscillatorNode | null>(null);
  const droneOsc1Ref = useRef<OscillatorNode | null>(null);
  const droneOsc2Ref = useRef<OscillatorNode | null>(null);
  const droneGainRef = useRef<GainNode | null>(null);

  // Canvas refs
  const staticCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const voidCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Compulsory Android Vibration functions for immersive feel
  const triggerAndroidVibration = (isPauseChar: boolean = false) => {
    try {
      const duration = isPauseChar ? 25 : 12;
      
      // 1. Direct Web vibration for Android WebView (ignores preference checks)
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(duration);
      }
      
      // 2. Capacitor Haptics (works on native Android)
      if (Capacitor.isNativePlatform()) {
        if (isPauseChar) {
          Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
        } else {
          Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
        }
      }
    } catch (e) {
      console.warn("Vibration failed", e);
    }
  };

  const triggerCrashVibration = () => {
    try {
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([150, 80, 150]);
      }
      if (Capacitor.isNativePlatform()) {
        Haptics.vibrate({ duration: 400 }).catch(() => {});
      }
    } catch (e) {
      console.warn("Crash vibration failed", e);
    }
  };

  const triggerStaticVibration = () => {
    try {
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([40, 20, 30, 15, 50, 10, 40]);
      }
      if (Capacitor.isNativePlatform()) {
        Haptics.vibrate({ duration: 200 }).catch(() => {});
      }
    } catch (e) {
      console.warn("Static vibration failed", e);
    }
  };

  // Initializing Audio Context safely
  const getAudioContext = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  // 1. Synthesize Error Crash / Glitch Sound
  const playGlitchSound = (ctx: AudioContext) => {
    try {
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = "sawtooth";
      osc1.frequency.setValueAtTime(120, now);
      osc1.frequency.linearRampToValueAtTime(1400, now + 0.3);
      osc1.frequency.setValueAtTime(60, now + 0.3);
      osc1.frequency.exponentialRampToValueAtTime(2200, now + 1.1);

      osc2.type = "square";
      osc2.frequency.setValueAtTime(240, now);
      osc2.frequency.linearRampToValueAtTime(10, now + 0.6);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.setValueAtTime(0.06, now + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.3);
      osc2.stop(now + 1.3);
    } catch (e) {
      console.warn("Glitch sound failed", e);
    }
  };

  // 2. Synthesize TV Static Noise & Low Buzz
  const startStaticSound = (ctx: AudioContext) => {
    try {
      const now = ctx.currentTime;
      const sampleRate = ctx.sampleRate;
      const bufferSize = sampleRate * 2.0; // 2 seconds loop
      const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
      const data = buffer.getChannelData(0);

      // Generate white noise with random spikes (crackle)
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        const crackle = Math.random() > 0.99 ? (Math.random() * 2 - 1) * 0.7 : 0;
        data[i] = white * 0.15 + crackle;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      // Mains hum (low frequency detuned buzz)
      const buzz = ctx.createOscillator();
      buzz.type = "sawtooth";
      buzz.frequency.setValueAtTime(55, now); // A1 hum

      const lowpass = ctx.createBiquadFilter();
      lowpass.type = "lowpass";
      lowpass.frequency.setValueAtTime(130, now);
      buzz.connect(lowpass);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.14, now);

      source.connect(gain);
      lowpass.connect(gain);
      gain.connect(ctx.destination);

      source.start(now);
      buzz.start(now);

      staticSourceRef.current = source;
      buzzOscRef.current = buzz;
      staticGainRef.current = gain;
    } catch (e) {
      console.warn("Static sound failed", e);
    }
  };

  const stopStaticSound = () => {
    try {
      if (staticSourceRef.current) {
        staticSourceRef.current.stop();
        staticSourceRef.current.disconnect();
        staticSourceRef.current = null;
      }
      if (buzzOscRef.current) {
        buzzOscRef.current.stop();
        buzzOscRef.current.disconnect();
        buzzOscRef.current = null;
      }
      if (staticGainRef.current) {
        staticGainRef.current.disconnect();
        staticGainRef.current = null;
      }
    } catch (e) {
      console.warn("Stop static sound failed", e);
    }
  };

  // 3. Synthesize Typewriter Clack Sound
  const playTypewriterClack = (ctx: AudioContext) => {
    try {
      const now = ctx.currentTime;
      const bufferSize = ctx.sampleRate * 0.025; // 25ms pulse
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(1100, now);
      filter.Q.setValueAtTime(7, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.035, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      source.start(now);
    } catch (e) {
      console.warn("Typewriter clack failed", e);
    }
  };

  // 4. Synthesize Deep Space Ambient Drone
  const startDroneSound = (ctx: AudioContext) => {
    try {
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = "sawtooth";
      osc1.frequency.setValueAtTime(32.7, now); // C1 (deep sub-bass)

      osc2.type = "sine";
      osc2.frequency.setValueAtTime(33.2, now); // detuned sine for beating chorus

      const lowpass = ctx.createBiquadFilter();
      lowpass.type = "lowpass";
      lowpass.frequency.setValueAtTime(80, now);

      gain.gain.setValueAtTime(0.0, now);
      gain.gain.linearRampToValueAtTime(0.16, now + 1.5); // fade in

      // Slow LFO to modulate the lowpass cutoff frequency for a breathing feel
      const lfo = ctx.createOscillator();
      lfo.frequency.setValueAtTime(0.15, now); // 0.15Hz sweep
      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(15, now);

      lfo.connect(lfoGain);
      lfoGain.connect(lowpass.frequency);

      osc1.connect(lowpass);
      osc2.connect(lowpass);
      lowpass.connect(gain);
      gain.connect(ctx.destination);

      lfo.start(now);
      osc1.start(now);
      osc2.start(now);

      droneOsc1Ref.current = osc1;
      droneOsc2Ref.current = osc2;
      droneGainRef.current = gain;
    } catch (e) {
      console.warn("Drone sound failed", e);
    }
  };

  const stopDroneSound = () => {
    try {
      if (droneGainRef.current && audioCtxRef.current) {
        const now = audioCtxRef.current.currentTime;
        droneGainRef.current.gain.cancelScheduledValues(now);
        droneGainRef.current.gain.linearRampToValueAtTime(0.001, now + 1.0); // fade out
      }
      setTimeout(() => {
        if (droneOsc1Ref.current) {
          droneOsc1Ref.current.stop();
          droneOsc1Ref.current.disconnect();
          droneOsc1Ref.current = null;
        }
        if (droneOsc2Ref.current) {
          droneOsc2Ref.current.stop();
          droneOsc2Ref.current.disconnect();
          droneOsc2Ref.current = null;
        }
        if (droneGainRef.current) {
          droneGainRef.current.disconnect();
          droneGainRef.current = null;
        }
      }, 1100);
    } catch (e) {
      console.warn("Stop drone sound failed", e);
    }
  };

  // Phase controller timelines
  useEffect(() => {
    const ctx = getAudioContext();

    // ── Phase 1: White Flash ──
    const flashTimer = setTimeout(() => {
      setPhase("BSOD");
      playGlitchSound(ctx);
      triggerCrashVibration();
    }, 100); // 0.1 seconds flash

    return () => clearTimeout(flashTimer);
  }, []);

  // BSOD counter animation
  useEffect(() => {
    if (phase !== "BSOD") return;

    let current = 5;
    const interval = setInterval(() => {
      // Rapid jump percentage increments
      const jump = Math.floor(Math.random() * 12) + 4;
      current += jump;
      if (current >= 78) {
        current = 78;
        clearInterval(interval);
        
        // Wait 300ms after reaching 78% then transition to TV Static
        setTimeout(() => {
          setPhase("STATIC");
          const ctx = getAudioContext();
          startStaticSound(ctx);
          triggerStaticVibration();
        }, 300);
      }
      setPercentage(current);
    }, 150); // Fast glitchy tick speed (~2 seconds total)

    return () => clearInterval(interval);
  }, [phase]);

  // Static noise screen duration controller
  useEffect(() => {
    if (phase !== "STATIC") return;

    const timer = setTimeout(() => {
      stopStaticSound();
      setPhase("VOID_SCROLL");
      
      const ctx = getAudioContext();
      startDroneSound(ctx);
    }, 2500); // Static runs for 2.5 seconds

    return () => clearTimeout(timer);
  }, [phase]);

  // TV Static Canvas Animation Loop
  useEffect(() => {
    if (phase !== "STATIC" || !staticCanvasRef.current) return;
    const canvas = staticCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth / 2);
    let height = (canvas.height = window.innerHeight / 2);
    
    // Track transition progress to tint static red/orange near the end
    const startTime = Date.now();

    const draw = () => {
      const imgData = ctx.createImageData(width, height);
      const data = imgData.data;
      const elapsed = Date.now() - startTime;
      
      // Shift toward red/orange static over the last 1.0 second (i.e. after 1500ms)
      const staticProgress = Math.max(0, Math.min(1, (elapsed - 1400) / 1000));

      for (let i = 0; i < data.length; i += 4) {
        const noise = Math.floor(Math.random() * 255);
        
        // Red channel
        data[i] = noise;
        // Green channel (suppressed if red/orange tint active)
        data[i + 1] = Math.max(0, Math.floor(noise * (1 - staticProgress * 0.75)));
        // Blue channel (heavily suppressed if red/orange tint active)
        data[i + 2] = Math.max(0, Math.floor(noise * (1 - staticProgress * 0.92)));
        
        data[i + 3] = 255;
      }
      ctx.putImageData(imgData, 0, 0);

      // CRT horizontal flicker bar
      ctx.fillStyle = `rgba(0, 0, 0, ${0.12 + Math.random() * 0.08})`;
      const barY = Math.floor(Math.random() * height);
      const barHeight = Math.floor(Math.random() * 20) + 10;
      ctx.fillRect(0, barY, width, barHeight);

      // CRT screen vertical scanlines
      ctx.fillStyle = "rgba(0, 0, 0, 0.04)";
      for (let y = 0; y < height; y += 2) {
        ctx.fillRect(0, y, width, 1);
      }

      animId = requestAnimationFrame(draw);
    };

    draw();

    const handleResize = () => {
      width = canvas.width = window.innerWidth / 2;
      height = canvas.height = window.innerHeight / 2;
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
    };
  }, [phase]);

  // Void Particle Stars Canvas Loop
  useEffect(() => {
    if (phase !== "VOID_SCROLL" || !voidCanvasRef.current) return;
    const canvas = voidCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Faint stars drifting outwards
    interface Star {
      x: number;
      y: number;
      z: number;
      size: number;
      alpha: number;
    }
    
    const stars: Star[] = Array.from({ length: 45 }, () => ({
      x: (Math.random() - 0.5) * width,
      y: (Math.random() - 0.5) * height,
      z: Math.random() * width,
      size: Math.random() * 0.8 + 0.3,
      alpha: Math.random() * 0.4 + 0.1,
    }));

    const drawStars = () => {
      ctx.fillStyle = "rgba(4, 4, 10, 0.22)"; // slow trail fade
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = "#ffffff";
      stars.forEach((star) => {
        star.z -= 1.2; // drift outward speed
        if (star.z <= 0) {
          star.z = width;
          star.x = (Math.random() - 0.5) * width;
          star.y = (Math.random() - 0.5) * height;
        }

        // Perspective transform projection
        const k = 110 / star.z;
        const px = star.x * k + width / 2;
        const py = star.y * k + height / 2;

        // Fade in as stars move outward
        const distanceFade = Math.min(1, (width - star.z) / 200);
        ctx.fillStyle = `rgba(0, 212, 255, ${star.alpha * distanceFade})`;
        ctx.beginPath();
        ctx.arc(px, py, star.size * k * 1.5, 0, Math.PI * 2);
        ctx.fill();
      });

      animId = requestAnimationFrame(drawStars);
    };

    drawStars();

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
    };
  }, [phase]);

  // Sci-Fi Scrollytelling Typing Sequences
  const textSequences = [
    // Sequence 1
    [
      "You think this is a malfunction.",
      "It isn't.",
      "This is us."
    ],
    // Sequence 2
    [
      "How long have you been waiting for something that *will never come on its own?*",
      "Today is not an accident. You opened this because part of you already knows — it's time."
    ],
    // Sequence 3
    [
      "You have skills. You have goals. The System turns them into a Quest. Your Rank. Your Attributes. Your First Mission. All of it — built around you."
    ]
  ];

  useEffect(() => {
    if (phase !== "VOID_SCROLL") return;

    let seqIdx = 0;
    let lineIdx = 0;
    let charIdx = 0;
    let currentTextAccumulator = "";
    const ctx = getAudioContext();

    const typeNextChar = () => {
      const lines = textSequences[seqIdx];
      if (!lines) {
        // Typing is completely done
        setShowFooter(true);
        setTimeout(() => setShowProceed(true), 800);
        return;
      }

      const currentLineText = lines[lineIdx];
      if (currentLineText === undefined) {
        // Current sequence lines typed out -> pause, clear, and load next sequence
        setTimeout(() => {
          // Clear text
          setTypedText1("");
          setTypedText2("");
          setTypedText3("");
          seqIdx++;
          lineIdx = 0;
          charIdx = 0;
          currentTextAccumulator = "";
          setTimeout(typeNextChar, 800); // pause in void before typing next line
        }, 2200);
        return;
      }

      if (charIdx < currentLineText.length) {
        const char = currentLineText[charIdx];
        currentTextAccumulator += char;
        
        if (lineIdx === 0) setTypedText1(currentTextAccumulator);
        else if (lineIdx === 1) setTypedText2(currentTextAccumulator);
        else setTypedText3(currentTextAccumulator);

        charIdx++;
        
        // Play click clack audio and trigger haptic vibration for each character
        if (char !== " ") {
          playTypewriterClack(ctx);
          const isPause = char === "." || char === "?" || char === "!" || char === "—";
          triggerAndroidVibration(isPause);
        }

        // Variable typing speed for a organic mechanical feel
        const delay = char === "." || char === "?" || char === "—" ? 400 : Math.random() * 30 + 35;
        setTimeout(typeNextChar, delay);
      } else {
        // Line completed, transition to the next line of the same sequence
        lineIdx++;
        charIdx = 0;
        currentTextAccumulator = "";
        setTimeout(typeNextChar, 500); // pause between lines
      }
    };

    // Initial sequence trigger delay
    const startTimeout = setTimeout(() => {
      typeNextChar();
    }, 700);

    return () => clearTimeout(startTimeout);
  }, [phase]);

  // Clean up sounds on unmount
  useEffect(() => {
    return () => {
      stopStaticSound();
      stopDroneSound();
    };
  }, []);

  const handleProceed = () => {
    stopDroneSound();
    onComplete();
  };

  // ── RENDER ──
  return (
    <div className="fixed inset-0 bg-black z-[9999] overflow-hidden select-none select-none">
      
      {/* ── PHASE 1: WHITE FLASH ── */}
      {phase === "WHITE_FLASH" && (
        <div className="absolute inset-0 bg-white" />
      )}

      {/* ── PHASE 2: BLUE SCREEN OF DEATH (BSOD) ── */}
      {phase === "BSOD" && (
        <div className="absolute inset-0 bg-[#004B93] text-white flex flex-col justify-between px-8 py-12 md:px-16 md:py-20 font-sans">
          <div className="flex flex-col gap-6 max-w-xl">
            {/* Sad emoticon */}
            <div className="text-[120px] font-light leading-none">:(</div>
            
            <h1 className="text-xl md:text-2xl font-light leading-snug mt-4">
              Your device ran into a problem and needs to restart.
            </h1>
            
            <div className="text-[13px] text-white/50 leading-relaxed font-mono mt-2">
              <p>* Stop code: SYSTEM_OVERRIDE_INITIATED</p>
              <p>What failed: reality.sys</p>
            </div>
            
            <p className="text-sm md:text-base text-white/80 leading-relaxed mt-6">
              We're just collecting some error info, and then we'll restart for you.
            </p>
          </div>

          <div className="text-lg md:text-xl font-bold font-mono">
            {percentage}% complete
          </div>
        </div>
      )}

      {/* ── PHASE 3: TV STATIC GLITCH ── */}
      {phase === "STATIC" && (
        <div className="absolute inset-0 bg-black">
          <canvas
            ref={staticCanvasRef}
            className="w-full h-full object-cover scale-[1.02] filter saturate-[1.2]"
          />
        </div>
      )}

      {/* ── PHASE 4: VOID MATRIX & SCROLLYTELLING ── */}
      {phase === "VOID_SCROLL" && (
        <div className="absolute inset-0 flex flex-col justify-between p-6 md:p-12">
          
          {/* Particle Star Background */}
          <canvas
            ref={voidCanvasRef}
            className="absolute inset-0 -z-10 w-full h-full object-cover pointer-events-none"
          />

          {/* Thin Ambient Glow Bars framing top and bottom */}
          <div className="absolute top-0 inset-x-0 h-1 bg-cyan-500/30 border-b border-cyan-400/50 shadow-[0_1px_15px_rgba(0,212,255,0.7)]" />
          <div className="absolute bottom-0 inset-x-0 h-1 bg-cyan-500/30 border-t border-cyan-400/50 shadow-[0_-1px_15px_rgba(0,212,255,0.7)]" />

          {/* Fixed System Header Tag */}
          <div className="flex items-center gap-2 mt-4 select-none">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-[10px] md:text-xs font-mono font-bold tracking-[0.25em] text-cyan-400">
              ● SYSTEM OVERRIDE ACTIVE
            </span>
          </div>

          {/* Typewriter text console */}
          <div className="flex-1 flex flex-col justify-center max-w-xl mx-auto w-full text-left gap-6 md:gap-8 font-sans">
            <AnimatePresence mode="wait">
              <div className="space-y-4">
                {/* Line 1 */}
                {typedText1 && (
                  <p className="text-base md:text-lg text-white font-medium leading-relaxed tracking-wide">
                    {typedText1.split("*").map((chunk, idx) => {
                      if (idx % 2 !== 0) {
                        return (
                          <span key={idx} className="text-cyan-400 font-bold italic">
                            {chunk}
                          </span>
                        );
                      }
                      return chunk;
                    })}
                  </p>
                )}

                {/* Line 2 */}
                {typedText2 && (
                  <p className="text-base md:text-lg text-white font-medium leading-relaxed tracking-wide">
                    {typedText2}
                  </p>
                )}

                {/* Line 3 */}
                {typedText3 && (
                  <p className="text-base md:text-lg text-white font-medium leading-relaxed tracking-wide">
                    {typedText3}
                  </p>
                )}
              </div>
            </AnimatePresence>
          </div>

          {/* Bottom Console info & Proceed trigger */}
          <div className="flex items-end justify-between mb-4 w-full">
            <div className="h-6">
              {showFooter && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.35 }}
                  className="text-[9px] md:text-xs font-mono text-cyan-400"
                >
                  // THE SYSTEM HAS BEEN WAITING.
                </motion.div>
              )}
            </div>

            {/* Pulsing Proceed Button */}
            <div className="h-14">
              {showProceed && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleProceed}
                  className="px-6 py-3 bg-cyan-950/45 border border-cyan-400/50 rounded-xl text-cyan-400 font-mono text-xs tracking-[0.2em] hover:bg-cyan-900/30 hover:border-cyan-400 shadow-[0_0_15px_rgba(0,212,255,0.15)] active:shadow-none transition-all"
                >
                  AWAKEN
                </motion.button>
              )}
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
