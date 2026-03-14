import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins } from 'lucide-react';
import { Rank } from '../types';
import { playSystemSoundEffect } from '../utils/soundEngine';

interface SystemPactScreenProps {
  visible: boolean;
  questRank: Rank;
  questTitle: string;
  playerGold: number;
  onAcceptPact: (pledgeAmount: number) => void;
  onDeclinePact: () => void;
}

const PLEDGE_AMOUNTS: Record<Rank, number> = {
  E: 10,
  D: 25,
  C: 60,
  B: 120,
  A: 250,
  S: 500,
};

const MANDATORY_RANKS = new Set<Rank>(['B', 'A', 'S']);

function isMandatory(rank: Rank): boolean {
  return MANDATORY_RANKS.has(rank);
}

const RANK_GLOW: Record<Rank, { r: number; g: number; b: number }> = {
  E: { r: 107, g: 114, b: 128 },
  D: { r: 249, g: 115, b: 22 },
  C: { r: 234, g: 179, b: 8 },
  B: { r: 34, g: 197, b: 94 },
  A: { r: 0, g: 210, b: 255 },
  S: { r: 168, g: 85, b: 247 },
};

/* ── Particle Field ── */
const ParticleField: React.FC<{ rankColor: { r: number; g: number; b: number } }> = ({ rankColor }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    interface P { x: number; y: number; speed: number; opacity: number; size: number; isGold: boolean; }
    const particles: P[] = Array.from({ length: 70 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      speed: 0.08 + Math.random() * 0.28,
      opacity: 0.06 + Math.random() * 0.22,
      size: 0.8 + Math.random() * 2,
      isGold: Math.random() < 0.45,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.y += p.speed;
        if (p.y > canvas.height) { p.y = -4; p.x = Math.random() * canvas.width; }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.isGold
          ? `rgba(251, 191, 36, ${p.opacity * 0.8})`
          : `rgba(${rankColor.r}, ${rankColor.g}, ${rankColor.b}, ${p.opacity})`;
        ctx.fill();
      }
      animRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [rankColor]);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />;
};

/* ── Slot Machine Digit ── */
const SlotDigit: React.FC<{ target: number; delay: number; onLock?: () => void }> = ({ target, delay, onLock }) => {
  const [display, setDisplay] = useState(0);
  const [locked, setLocked] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Spin phase
    intervalRef.current = setInterval(() => {
      setDisplay(Math.floor(Math.random() * 10));
    }, 50);

    // Lock after delay
    const lockTimer = setTimeout(() => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setDisplay(target);
      setLocked(true);
      onLock?.();
    }, delay);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      clearTimeout(lockTimer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, delay]);

  return (
    <span
      className="inline-block w-[1ch] text-center transition-all duration-100"
      style={{
        color: locked ? '#fbbf24' : 'rgba(251,191,36,0.4)',
        textShadow: locked ? '0 0 20px rgba(251,191,36,0.6), 0 0 40px rgba(251,191,36,0.2)' : 'none',
        transform: locked ? 'scale(1.05)' : 'scale(1)',
      }}
    >
      {display}
    </span>
  );
};

/* ── Slot Machine Number ── */
const SlotMachineNumber: React.FC<{ amount: number; onComplete: () => void }> = ({ amount, onComplete }) => {
  const digits = String(amount).split('').map(Number);
  const lockedCount = useRef(0);

  const handleDigitLock = useCallback(() => {
    lockedCount.current += 1;
    if (lockedCount.current >= digits.length) {
      setTimeout(onComplete, 200);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digits.length, onComplete]);

  return (
    <span className="font-black font-mono text-6xl sm:text-7xl tracking-wider">
      {digits.map((d, i) => (
        <SlotDigit
          key={i}
          target={d}
          delay={800 + i * 280}
          onLock={handleDigitLock}
        />
      ))}
    </span>
  );
};

/* ── SVG Seal Icon ── */
const SealIcon: React.FC<{ color: string }> = ({ color }) => (
  <svg viewBox="0 0 48 48" width="36" height="36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="24" r="18" stroke={color} strokeWidth="1.5" fill="none" />
    <circle cx="24" cy="24" r="12" stroke={color} strokeWidth="1" fill="none" opacity="0.5" />
    <path d="M24 8 L26.5 18 L24 15 L21.5 18 Z" fill={color} opacity="0.7" />
    <path d="M24 40 L21.5 30 L24 33 L26.5 30 Z" fill={color} opacity="0.7" />
    <path d="M8 24 L18 21.5 L15 24 L18 26.5 Z" fill={color} opacity="0.7" />
    <path d="M40 24 L30 26.5 L33 24 L30 21.5 Z" fill={color} opacity="0.7" />
    <circle cx="24" cy="24" r="5" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="1" />
  </svg>
);

/* ── Rotating Seal ── */
const PactSeal: React.FC<{ flare: boolean; rankColor: { r: number; g: number; b: number } }> = ({ flare, rankColor }) => {
  const rc = `${rankColor.r}, ${rankColor.g}, ${rankColor.b}`;
  return (
    <div className="relative flex items-center justify-center" style={{ width: 170, height: 170 }}>
      {/* Outer ring — rotates clockwise slowly */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 170, height: 170,
          border: `1.5px solid rgba(251,191,36,0.2)`,
          boxShadow: `0 0 30px rgba(251,191,36,0.06)`,
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
      />
      {/* Outer ring tick marks */}
      <motion.div
        className="absolute"
        style={{ width: 170, height: 170 }}
        animate={{ rotate: 360 }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
      >
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
          <div
            key={deg}
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[1px] h-[6px]"
            style={{
              background: `rgba(251,191,36,0.3)`,
              transformOrigin: '50% 85px',
              transform: `rotate(${deg}deg)`,
            }}
          />
        ))}
      </motion.div>
      {/* Inner ring — rotates counter-clockwise */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 140, height: 140,
          border: `1px solid rgba(251,191,36,0.15)`,
        }}
        animate={{ rotate: -360 }}
        transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
      />
      {/* Pulse ring */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 150, height: 150,
          border: `1px solid rgba(${rc}, 0.1)`,
        }}
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.15, 0.4, 0.15],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Center circle with SVG seal */}
      <motion.div
        className="relative w-[100px] h-[100px] rounded-full flex items-center justify-center"
        style={{
          border: `2px solid rgba(251,191,36,0.45)`,
          background: `radial-gradient(circle, rgba(251,191,36,0.08) 0%, transparent 70%)`,
          boxShadow: flare
            ? `0 0 80px rgba(251,191,36,0.9), 0 0 160px rgba(251,191,36,0.3)`
            : `0 0 25px rgba(251,191,36,0.2)`,
        }}
      >
        <SealIcon color="rgb(251,191,36)" />
      </motion.div>
    </div>
  );
};

/* ── Main Component ── */
const SystemPactScreen: React.FC<SystemPactScreenProps> = ({
  visible,
  questRank,
  questTitle,
  playerGold,
  onAcceptPact,
  onDeclinePact,
}) => {
  const pledgeAmount = PLEDGE_AMOUNTS[questRank];
  const mandatory = isMandatory(questRank);
  const rankColor = RANK_GLOW[questRank];
  const pledgePct = playerGold > 0 ? Math.min(100, Math.round((pledgeAmount / playerGold) * 100)) : 100;
  const [slotDone, setSlotDone] = useState(false);
  const [flare, setFlare] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [typewriterDone, setTypewriterDone] = useState(false);

  // Reset state when screen opens
  useEffect(() => {
    if (visible) {
      setSlotDone(false);
      setFlare(false);
      setExiting(false);
      setTypewriterDone(false);
      playSystemSoundEffect('SYSTEM');
      const twTimer = setTimeout(() => setTypewriterDone(true), 1200);
      return () => clearTimeout(twTimer);
    }
  }, [visible]);

  const handleAccept = () => {
    setFlare(true);
    setExiting(true);
    playSystemSoundEffect('PURCHASE');
    setTimeout(() => {
      onAcceptPact(pledgeAmount);
    }, 350);
  };

  const handleDecline = () => {
    setExiting(true);
    setTimeout(() => {
      onDeclinePact();
    }, 300);
  };

  const handleSlotComplete = useCallback(() => {
    setSlotDone(true);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[100] flex flex-col"
          initial={{ y: '100%' }}
          animate={exiting ? { y: '100%', opacity: 0 } : { y: 0 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ duration: exiting ? 0.3 : 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Background */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(180deg, rgba(4,2,12,0.98) 0%, rgba(8,4,20,0.99) 50%, rgba(2,1,6,1) 100%)',
            }}
          />
          <ParticleField rankColor={rankColor} />

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center justify-between h-full px-6 py-10 safe-area-inset">

            {/* Top: Seal */}
            <motion.div
              className="flex flex-col items-center gap-4 pt-8"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <PactSeal flare={flare} rankColor={rankColor} />
              <div className="text-center mt-4">
                <p className="text-[10px] font-black tracking-[0.4em] text-purple-500/70 uppercase font-mono">
                  SYSTEM PACT
                </p>
                <p className="text-[9px] text-gray-600 font-mono mt-1 max-w-[260px] leading-relaxed">
                  Shadow Pledge Protocol — {questRank}-Rank
                </p>
              </div>
            </motion.div>

            {/* Middle: Pledge Amount */}
            <motion.div
              className="flex flex-col items-center gap-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.4 }}
            >
              {/* Typewriter label */}
              <motion.p
                className="text-[10px] font-mono text-gray-400 tracking-[0.3em] uppercase h-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: typewriterDone ? 1 : 0 }}
                transition={{ duration: 0.3 }}
              >
                SHADOW PLEDGE REQUIRED
              </motion.p>

              <div className="flex items-center gap-3 mt-1">
                <SlotMachineNumber amount={pledgeAmount} onComplete={handleSlotComplete} />
                <AnimatePresence>
                  {slotDone && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5, rotate: -20 }}
                      animate={{ opacity: 1, scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                    >
                      <Coins size={32} className="text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Balance + pledge bar */}
              <AnimatePresence>
                {slotDone && (
                  <motion.div
                    className="flex flex-col items-center gap-2 mt-2 w-full max-w-[240px]"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-600 font-mono">Balance:</span>
                      <span className="text-[12px] text-gray-300 font-mono font-bold">{playerGold}G</span>
                      <span className="text-[9px] text-gray-700 font-mono">→ {playerGold - pledgeAmount}G after</span>
                    </div>
                    {/* Pledge percentage bar */}
                    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <motion.div
                        className="h-full rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${pledgePct}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                        style={{
                          background: pledgePct > 70
                            ? 'linear-gradient(90deg, #fbbf24, #ef4444)'
                            : pledgePct > 40
                            ? 'linear-gradient(90deg, #fbbf24, #f97316)'
                            : 'linear-gradient(90deg, #22c55e, #fbbf24)',
                          boxShadow: '0 0 8px rgba(251,191,36,0.3)',
                        }}
                      />
                    </div>
                    <span className={`text-[8px] font-mono font-bold ${
                      pledgePct > 70 ? 'text-red-400' : pledgePct > 40 ? 'text-amber-400' : 'text-emerald-400'
                    }`}>{pledgePct}% of your wealth</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Quest title */}
              <p className="text-[10px] text-gray-600 font-mono text-center max-w-[280px] mt-2 leading-relaxed italic">
                "{questTitle}"
              </p>
            </motion.div>

            {/* Bottom: Buttons */}
            <motion.div
              className="w-full max-w-sm flex flex-col items-center gap-3 pb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: slotDone ? 1 : 0, y: slotDone ? 0 : 20 }}
              transition={{ duration: 0.5 }}
            >
              {mandatory ? (
                <>
                  <motion.button
                    onClick={handleAccept}
                    disabled={playerGold < pledgeAmount}
                    className="w-full py-4 rounded-2xl text-sm font-black uppercase tracking-[0.2em] transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{
                      background: 'linear-gradient(135deg, rgba(251,191,36,0.18) 0%, rgba(217,119,6,0.12) 100%)',
                      border: '1px solid rgba(251,191,36,0.5)',
                      color: '#fbbf24',
                      boxShadow: '0 0 40px rgba(251,191,36,0.12), inset 0 1px 0 rgba(255,255,255,0.08)',
                    }}
                    animate={slotDone ? {
                      boxShadow: ['0 0 20px rgba(251,191,36,0.08)', '0 0 50px rgba(251,191,36,0.2)', '0 0 20px rgba(251,191,36,0.08)'],
                    } : {}}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    Accept The Pact
                  </motion.button>
                  <p className="text-[8px] text-gray-700 font-mono text-center tracking-wider">
                    There is no negotiation with The System.
                  </p>
                </>
              ) : (
                <>
                  <motion.button
                    onClick={handleAccept}
                    disabled={playerGold < pledgeAmount}
                    className="w-full py-4 rounded-2xl text-sm font-black uppercase tracking-[0.2em] transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed relative overflow-hidden"
                    style={{
                      background: 'linear-gradient(135deg, rgba(251,191,36,0.18) 0%, rgba(217,119,6,0.12) 100%)',
                      border: '1px solid rgba(251,191,36,0.5)',
                      color: '#fbbf24',
                      boxShadow: '0 0 40px rgba(251,191,36,0.12), inset 0 1px 0 rgba(255,255,255,0.08)',
                    }}
                    animate={slotDone ? {
                      boxShadow: ['0 0 20px rgba(251,191,36,0.08)', '0 0 50px rgba(251,191,36,0.2)', '0 0 20px rgba(251,191,36,0.08)'],
                    } : {}}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    {/* Shimmer sweep */}
                    <motion.div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%)',
                      }}
                      animate={{ x: ['-100%', '200%'] }}
                      transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 3, ease: 'easeInOut' }}
                    />
                    <span className="relative z-10">Enter The Pact</span>
                  </motion.button>

                  <p className="text-[9px] text-emerald-400/70 font-mono text-center font-bold">
                    Pact holders earn 1.25x XP on verified completion.
                  </p>

                  <button
                    onClick={handleDecline}
                    className="w-[80%] py-2.5 rounded-xl text-[10px] font-medium uppercase tracking-widest transition-all active:scale-95 opacity-40 hover:opacity-60"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#4b5563',
                    }}
                  >
                    Begin Without Pledge
                  </button>
                </>
              )}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export { PLEDGE_AMOUNTS, MANDATORY_RANKS, isMandatory };
export default SystemPactScreen;
