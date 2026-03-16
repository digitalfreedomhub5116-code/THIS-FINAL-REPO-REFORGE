import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, PolarRadiusAxis 
} from 'recharts';
import { PlayerData, CoreStats, Outfit, HistoryEntry } from '../types';
import MentorThoughtBox from './MentorThoughtBox';

// ── Dusk thought pool for ambient floating messages ──
const DUSK_THOUGHTS = [
  "Your discipline defines you.",
  "Weakness is a choice.",
  "The System watches. Always.",
  "Stronger today than yesterday.",
  "Pain is just XP in disguise.",
  "Consistency forges legends.",
  "Don't break the chain.",
  "Evolve or stagnate. Choose.",
  "Rest is earned, not given.",
  "The grind never lies.",
  "Your rivals aren't sleeping.",
  "One more rep. One more quest.",
  "Comfort is the enemy.",
  "Show me your resolve.",
  "Stagnation is death.",
];

interface PlayerStatusCardProps {
  player: PlayerData;
  equippedOutfit?: Outfit | null;
  mentorMessages: { id: string; text: string }[];
  onDismissMentorMessage: (id: string) => void;
  history: HistoryEntry[];
}

const PlayerStatusCard: React.FC<PlayerStatusCardProps> = ({ 
  player, 
  equippedOutfit,
  mentorMessages,
  onDismissMentorMessage,
  history
}) => {
  const [selectedDateIndex, setSelectedDateIndex] = useState<number>(0);
  
  // ── Ambient thought box spawning ──
  const [ambientMessages, setAmbientMessages] = useState<{id: string; text: string}[]>([]);
  const ambientTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const thoughtIndexRef = useRef(0);
  
  const spawnAmbientThought = useCallback(() => {
    const text = DUSK_THOUGHTS[thoughtIndexRef.current % DUSK_THOUGHTS.length];
    thoughtIndexRef.current++;
    const id = `ambient-${Date.now()}`;
    setAmbientMessages([{ id, text }]);
  }, []);

  useEffect(() => {
    // Spawn first thought after 3s, then every 12-20s
    const firstTimer = setTimeout(() => {
      spawnAmbientThought();
      const loop = () => {
        const delay = 12000 + Math.random() * 8000;
        ambientTimerRef.current = setTimeout(() => {
          spawnAmbientThought();
          loop();
        }, delay);
      };
      loop();
    }, 3000);
    return () => {
      clearTimeout(firstTimer);
      if (ambientTimerRef.current) clearTimeout(ambientTimerRef.current);
    };
  }, [spawnAmbientThought]);

  const dismissAmbient = useCallback((id: string) => {
    setAmbientMessages(prev => prev.filter(m => m.id !== id));
  }, []);

  // Merge mentor messages (event-driven) with ambient ones
  // Priority: mentor messages override ambient
  const activeMessages = mentorMessages.length > 0 ? mentorMessages : ambientMessages;
  const activeDismiss = mentorMessages.length > 0 ? onDismissMentorMessage : dismissAmbient;

  // Alternate position between top and bottom to avoid face
  const thoughtPosition = useMemo(() => {
    return thoughtIndexRef.current % 2 === 0 ? 'bottom' : 'top';
  }, [ambientMessages]);

  // ── History timeline ──
  const allHistory = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayEntry: HistoryEntry = {
      date: today,
      stats: player.stats,
      totalXp: player.totalXp,
      dailyXp: player.dailyXp,
      questCompletion: 0
    };
    const pastHistory = [...history]
      .filter(h => h.date !== today)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return [todayEntry, ...pastHistory].slice(0, 7);
  }, [player.stats, player.totalXp, player.dailyXp, history]);

  const activeStats: CoreStats = useMemo(() => {
    return allHistory[selectedDateIndex]?.stats || player.stats;
  }, [allHistory, selectedDateIndex, player.stats]);
  
  const chartData = useMemo(() => [
    { subject: 'STR', A: activeStats.strength, fullMark: 200 },
    { subject: 'INT', A: activeStats.intelligence, fullMark: 200 },
    { subject: 'FOC', A: activeStats.focus, fullMark: 200 },
    { subject: 'DIS', A: activeStats.discipline, fullMark: 200 },
    { subject: 'WIL', A: activeStats.willpower, fullMark: 200 },
    { subject: 'SOC', A: activeStats.social, fullMark: 200 },
  ], [activeStats]);

  // ── Video handling ──
  const introRef = useRef<HTMLVideoElement>(null);
  const loopRef = useRef<HTMLVideoElement>(null);
  const [videoPhase, setVideoPhase] = useState<'intro' | 'loop' | 'image'>('image');

  const hasVideo = !!(equippedOutfit?.introVideoUrl || equippedOutfit?.loopVideoUrl);

  useEffect(() => {
    if (!hasVideo) { setVideoPhase('image'); return; }
    const intro = introRef.current;
    const loop = loopRef.current;
    if (!intro || !loop) return;
    loop.pause();
    loop.currentTime = 0;
    if (equippedOutfit?.introVideoUrl) {
      intro.src = equippedOutfit.introVideoUrl;
      intro.load();
      setVideoPhase('intro');
      intro.play().catch(() => {
        if (equippedOutfit.loopVideoUrl) startLoop();
        else setVideoPhase('image');
      });
    } else if (equippedOutfit?.loopVideoUrl) {
      startLoop();
    }
  }, [equippedOutfit, hasVideo]);

  const startLoop = () => {
    const loop = loopRef.current;
    if (!loop) return;
    if (equippedOutfit?.loopVideoUrl) {
      loop.src = equippedOutfit.loopVideoUrl;
      loop.load();
      loop.loop = true;
      setVideoPhase('loop');
      loop.play().catch(() => setVideoPhase('image'));
    } else {
      setVideoPhase('image');
    }
  };

  useEffect(() => {
    const intro = introRef.current;
    if (!intro) return;
    const ended = () => startLoop();
    const error = () => startLoop();
    intro.addEventListener('ended', ended);
    intro.addEventListener('error', error);
    return () => {
      intro.removeEventListener('ended', ended);
      intro.removeEventListener('error', error);
    };
  }, []);

  return (
    <div className="w-full relative rounded-2xl overflow-hidden flex flex-col group border border-white/[0.06] shadow-[0_20px_60px_rgba(0,0,0,0.7)] bg-[#0A0A0F]">

      {/* --- TOP DATE NAVIGATION --- */}
      <div className="w-full border-b border-white/5 bg-[#0A0A0F] z-20 flex overflow-x-auto hide-scrollbar px-3 py-2.5 gap-1.5 shrink-0">
        {allHistory.map((entry, idx) => {
          const dateObj = new Date(entry.date + 'T12:00:00Z');
          let label = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          if (idx === 0) label = "TODAY";
          if (idx === 1 && allHistory.length > 1) {
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            if (dateObj.toDateString() === yesterday.toDateString()) label = "YTD";
          }
          const isSelected = selectedDateIndex === idx;
          return (
            <button
              key={entry.date}
              onClick={() => setSelectedDateIndex(idx)}
              className={`relative px-3 py-1 rounded-full whitespace-nowrap text-[10px] font-mono font-bold tracking-widest transition-all duration-300 ${
                isSelected 
                  ? 'text-[#00d2ff] bg-[#00d2ff]/10 border border-[#00d2ff]/30' 
                  : 'text-gray-600 hover:text-gray-400 border border-transparent'
              }`}
            >
              {label}
              {isSelected && (
                <motion.div 
                  layoutId="dateIndicator" 
                  className="absolute inset-0 rounded-full border border-[#00d2ff]/50 shadow-[0_0_12px_rgba(0,210,255,0.25)] pointer-events-none" 
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>
      
      {/* --- MAIN CONTENT (side by side) --- */}
      <div className="flex flex-row w-full relative flex-1 min-h-[350px] md:min-h-[400px]">
        
        {/* ── LEFT CONTAINER: RADAR CHART ── */}
        <div className="w-[50%] md:w-[45%] relative z-30 flex items-center justify-center shrink-0">
          {/* We make the chart slightly larger than its container to create the overlap effect */}
          <div className="w-[140%] md:w-[130%] aspect-square absolute right-[-20%] md:right-[-15%]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
                <PolarGrid stroke="rgba(255,255,255,0.06)" strokeWidth={1} gridType="polygon" radialLines={false} />
                <PolarAngleAxis 
                  dataKey="subject" 
                  tick={{ fill: '#00d2ff', fontSize: 11, fontWeight: '900', fontFamily: 'monospace', letterSpacing: '0.5px' }} 
                />
                <PolarRadiusAxis angle={30} domain={[0, 200]} tick={false} axisLine={false} />
                <Radar
                  name="Stats"
                  dataKey="A"
                  stroke="#00d2ff"
                  strokeWidth={2.5}
                  fill="url(#radarGradientV2)"
                  fillOpacity={1}
                  isAnimationActive={true}
                  animationDuration={800}
                  animationEasing="ease-out"
                  dot={((props: any) => {
                    const { cx, cy } = props;
                    if (!Number.isFinite(cx) || !Number.isFinite(cy)) return <g></g>;
                    return (
                      <svg x={cx - 4} y={cy - 4} width={8} height={8} className="overflow-visible">
                        <circle cx="4" cy="4" r="2.5" fill="#fff" opacity={0.9} />
                        <circle cx="4" cy="4" r="4" fill="none" stroke="#00d2ff" strokeWidth="1" opacity={0.5}>
                          <animate attributeName="r" values="4;7;4" dur="2s" repeatCount="indefinite" />
                          <animate attributeName="opacity" values="0.5;0.1;0.5" dur="2s" repeatCount="indefinite" />
                        </circle>
                      </svg>
                    );
                  }) as any}
                />
                <defs>
                  <linearGradient id="radarGradientV2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00d2ff" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#0055ff" stopOpacity={0.08} />
                  </linearGradient>
                </defs>
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── RIGHT CONTAINER: VIDEO ── */}
        <div className="w-[50%] md:w-[55%] relative z-10 shrink-0 bg-[#0A0A0F]">
          <div className="absolute inset-0 w-full h-full">
            <video
              ref={introRef}
              muted playsInline preload="auto"
              className="absolute inset-0 w-full h-full object-cover object-center"
              style={{ display: videoPhase === 'intro' ? 'block' : 'none' }}
            />
            <video
              ref={loopRef}
              muted playsInline loop preload="auto"
              className="absolute inset-0 w-full h-full object-cover object-center"
              style={{ display: videoPhase === 'loop' ? 'block' : 'none' }}
            />
            {videoPhase === 'image' && equippedOutfit?.image && (
              <img src={equippedOutfit.image} alt={equippedOutfit.name} className="absolute inset-0 w-full h-full object-cover object-center brightness-75" />
            )}
            {videoPhase === 'image' && !equippedOutfit?.image && (
              <video 
                autoPlay loop muted playsInline
                src="https://res.cloudinary.com/dcnqnbvp0/video/upload/v1769167952/Subject_animestyle_shadow_202601231701_vl45_ayicwk.mp4"
                className="absolute inset-0 w-full h-full object-cover object-center"
              />
            )}
          </div>

          {/* Edge gradients for blending into left area */}
          <div className="absolute inset-y-0 left-0 w-24 md:w-32 bg-gradient-to-r from-[#0A0A0F] via-[#0A0A0F]/80 to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[#0A0A0F]/50 to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0A0A0F] to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-[#0A0A0F] to-transparent z-10 pointer-events-none" />

          {/* ── Floating Thought Boxes (Strictly contained in right area, avoiding face center) ── */}
          <div className="absolute inset-0 z-40 pointer-events-none">
            <MentorThoughtBox 
              messages={activeMessages} 
              onDismiss={activeDismiss} 
            />
          </div>
        </div>

      </div>
    </div>
  );
};

export default PlayerStatusCard;
