import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, PolarRadiusAxis 
} from 'recharts';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
  const [weekOffset, setWeekOffset] = useState(0);

  // ── Radar animation state (dots → lines → fill) ──
  const [radarPhase, setRadarPhase] = useState<'dots' | 'lines' | 'fill' | 'complete'>('dots');
  const [visibleDots, setVisibleDots] = useState(0);
  const animKeyRef = useRef(0);

  useEffect(() => {
    animKeyRef.current++;
    const key = animKeyRef.current;
    setRadarPhase('dots');
    setVisibleDots(0);
    // Sequential dot reveal: 6 dots, 180ms apart
    const dotTimers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 1; i <= 6; i++) {
      dotTimers.push(setTimeout(() => {
        if (animKeyRef.current !== key) return;
        setVisibleDots(i);
      }, i * 180));
    }
    // After all dots, show lines
    dotTimers.push(setTimeout(() => {
      if (animKeyRef.current !== key) return;
      setRadarPhase('lines');
    }, 6 * 180 + 200));
    // After lines draw, show fill
    dotTimers.push(setTimeout(() => {
      if (animKeyRef.current !== key) return;
      setRadarPhase('fill');
    }, 6 * 180 + 700));
    // Mark complete
    dotTimers.push(setTimeout(() => {
      if (animKeyRef.current !== key) return;
      setRadarPhase('complete');
    }, 6 * 180 + 1200));
    return () => dotTimers.forEach(clearTimeout);
  }, [selectedDateIndex]);

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

  // ── History timeline (indexed by date string for calendar lookup) ──
  const historyMap = useMemo(() => {
    const map: Record<string, HistoryEntry> = {};
    const today = new Date().toISOString().split('T')[0];
    map[today] = {
      date: today,
      stats: player.stats,
      totalXp: player.totalXp,
      dailyXp: player.dailyXp,
      questCompletion: 0
    };
    for (const h of history) {
      if (!map[h.date]) map[h.date] = h;
    }
    return map;
  }, [player.stats, player.totalXp, player.dailyXp, history]);

  // Calendar days (7-day window based on weekOffset)
  const todayDate = useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d;
  }, []);
  const calendarDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(todayDate);
      d.setDate(todayDate.getDate() + weekOffset * 7 - 3 + i);
      return d;
    });
  }, [todayDate, weekOffset]);

  const selectedDate = calendarDays[selectedDateIndex] || todayDate;

  const activeStats: CoreStats = useMemo(() => {
    const dateStr = selectedDate.toISOString().split('T')[0];
    return historyMap[dateStr]?.stats || player.stats;
  }, [historyMap, selectedDate, player.stats]);
  
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

      {/* --- TOP HEXAGONAL CALENDAR --- */}
      <div className="w-full border-b border-white/5 bg-[#0A0A0F] z-20 shrink-0 px-2 py-2">
        {/* Month nav */}
        <div className="flex items-center justify-between px-1 pb-2">
          <button
            onClick={() => { setWeekOffset(o => o - 1); setSelectedDateIndex(3); }}
            className="w-6 h-6 rounded-full flex items-center justify-center active:scale-90 transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <ChevronLeft size={11} className="text-gray-400" />
          </button>
          <span className="text-[10px] font-black text-white font-mono tracking-[0.2em] uppercase">
            {calendarDays[3]?.toLocaleDateString('en-US', { month: 'long' })} {calendarDays[3]?.getFullYear()}
          </span>
          <button
            onClick={() => { setWeekOffset(o => o + 1); setSelectedDateIndex(3); }}
            className="w-6 h-6 rounded-full flex items-center justify-center active:scale-90 transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <ChevronRight size={11} className="text-gray-400" />
          </button>
        </div>
        {/* Hexagonal day strip */}
        <div className="flex justify-center gap-1.5">
          {calendarDays.map((day, idx) => {
            const isToday = day.toDateString() === todayDate.toDateString();
            const isSelected = selectedDateIndex === idx;
            const dateStr = day.toISOString().split('T')[0];
            const hasData = !!historyMap[dateStr];
            const isPast = day < todayDate;
            const dayLabel = ['SUN','MON','TUE','WED','THU','FRI','SAT'][day.getDay()];

            let borderColor = 'rgba(255,255,255,0.08)';
            let glowShadow = 'none';
            if (isSelected) { borderColor = '#00d2ff'; glowShadow = '0 0 10px rgba(0,210,255,0.4)'; }
            else if (isToday) { borderColor = 'rgba(0,210,255,0.4)'; }
            else if (hasData && isPast) { borderColor = 'rgba(34,197,94,0.3)'; }

            return (
              <button
                key={idx}
                onClick={() => setSelectedDateIndex(idx)}
                className="flex flex-col items-center gap-0.5 transition-all duration-200"
              >
                {/* Hexagon */}
                <div
                  className="relative flex items-center justify-center transition-all duration-200"
                  style={{
                    width: 36, height: 40,
                    clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                    background: isSelected ? 'rgba(0,210,255,0.15)' : 'rgba(8,8,18,0.9)',
                  }}
                >
                  {/* Inner hex border via a slightly smaller hex */}
                  <div
                    className="absolute inset-[1.5px] flex items-center justify-center"
                    style={{
                      clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                      background: isSelected ? 'rgba(0,210,255,0.12)' : 'rgba(10,10,15,0.95)',
                      boxShadow: glowShadow,
                    }}
                  >
                    <span
                      className="font-mono font-black text-xs leading-none"
                      style={{ color: isSelected ? '#00d2ff' : isToday ? '#00d2ff' : hasData && isPast ? '#4ade80' : '#4b5563' }}
                    >
                      {day.getDate()}
                    </span>
                  </div>
                  {/* Outer border effect */}
                  <div
                    className="absolute inset-0"
                    style={{
                      clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                      background: borderColor,
                      zIndex: -1,
                    }}
                  />
                </div>
                {/* Day label */}
                <span
                  className="text-[7px] font-mono font-bold tracking-wider"
                  style={{ color: isSelected ? '#00d2ff' : isToday ? 'rgba(0,210,255,0.6)' : '#374151' }}
                >
                  {isToday ? 'TODAY' : dayLabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      
      {/* --- MAIN CONTENT (side by side) --- */}
      <div className="flex flex-row w-full relative flex-1 min-h-[350px] md:min-h-[400px]">
        
        {/* ── LEFT CONTAINER: RADAR CHART ── */}
        <div className="w-[45%] md:w-[42%] relative z-30 flex items-center justify-center shrink-0">
          {/* Chart oversized with left offset so labels stay on-screen, overlaps into video */}
          <div className="w-[145%] md:w-[135%] aspect-square absolute left-[2px] md:left-[4px]">
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
                  fillOpacity={radarPhase === 'fill' || radarPhase === 'complete' ? 1 : 0}
                  strokeOpacity={radarPhase === 'lines' || radarPhase === 'fill' || radarPhase === 'complete' ? 1 : 0}
                  isAnimationActive={false}
                  dot={((props: any) => {
                    const { cx, cy, index } = props;
                    if (!Number.isFinite(cx) || !Number.isFinite(cy)) return <g></g>;
                    const isVisible = (index as number) < visibleDots;
                    return (
                      <svg x={cx - 5} y={cy - 5} width={10} height={10} className="overflow-visible">
                        <circle cx="5" cy="5" r="3" fill="#fff" opacity={isVisible ? 0.95 : 0}>
                          {isVisible && <animate attributeName="opacity" values="0;0.95" dur="0.2s" fill="freeze" />}
                        </circle>
                        <circle cx="5" cy="5" r="5" fill="none" stroke="#00d2ff" strokeWidth="1" opacity={isVisible ? 0.5 : 0}>
                          {isVisible && (
                            <>
                              <animate attributeName="r" values="5;8;5" dur="2s" repeatCount="indefinite" />
                              <animate attributeName="opacity" values="0.5;0.15;0.5" dur="2s" repeatCount="indefinite" />
                            </>
                          )}
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
        <div className="w-[55%] md:w-[58%] relative z-10 shrink-0 bg-[#0A0A0F]">
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

          {/* Edge gradients for blending — stronger top/bottom shadows */}
          <div className="absolute inset-y-0 left-0 w-24 md:w-32 bg-gradient-to-r from-[#0A0A0F] via-[#0A0A0F]/80 to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-[#0A0A0F]/70 to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#0A0A0F] via-[#0A0A0F]/60 to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#0A0A0F] via-[#0A0A0F]/50 to-transparent z-10 pointer-events-none" />

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
