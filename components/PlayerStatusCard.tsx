import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, PolarRadiusAxis 
} from 'recharts';
import { ChevronLeft, ChevronRight, Terminal, Zap } from 'lucide-react';
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
  onOpenDuskChat: () => void;
}

const PlayerStatusCard: React.FC<PlayerStatusCardProps> = ({ 
  player, 
  equippedOutfit,
  mentorMessages,
  onDismissMentorMessage,
  history,
  onOpenDuskChat
}) => {
  const [selectedDateIndex, setSelectedDateIndex] = useState<number>(3);
  const [weekOffset, setWeekOffset] = useState(0);

  useEffect(() => {
    if (weekOffset === 0) {
      setSelectedDateIndex(3);
    }
  }, [weekOffset]);

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

  // ── Historical Comparison Ghosting ──
  const todayStats: CoreStats = useMemo(() => {
    const dateStr = todayDate.toISOString().split('T')[0];
    return historyMap[dateStr]?.stats || player.stats;
  }, [historyMap, todayDate, player.stats]);

  const activeStats: CoreStats = useMemo(() => {
    const dateStr = selectedDate.toISOString().split('T')[0];
    return historyMap[dateStr]?.stats || player.stats;
  }, [historyMap, selectedDate, player.stats]);
  
  const isViewingPast = selectedDate < todayDate;

  // Calculate dynamic maximum for the radar chart to prevent overflow
  const dynamicMax = useMemo(() => {
    const allStats = [
      activeStats.strength, activeStats.intelligence, activeStats.focus,
      activeStats.discipline, activeStats.willpower, activeStats.social,
      todayStats.strength, todayStats.intelligence, todayStats.focus,
      todayStats.discipline, todayStats.willpower, todayStats.social,
    ];
    const maxVal = Math.max(...allStats);
    // Base minimum of 200, otherwise scale up with a 15% buffer, rounded to nearest 50
    return Math.max(200, Math.ceil((maxVal * 1.15) / 50) * 50);
  }, [activeStats, todayStats]);

  const chartData = useMemo(() => {
    return [
      { subject: 'STR', A: activeStats.strength, Today: todayStats.strength, fullMark: dynamicMax },
      { subject: 'INT', A: activeStats.intelligence, Today: todayStats.intelligence, fullMark: dynamicMax },
      { subject: 'FOC', A: activeStats.focus, Today: todayStats.focus, fullMark: dynamicMax },
      { subject: 'DIS', A: activeStats.discipline, Today: todayStats.discipline, fullMark: dynamicMax },
      { subject: 'WIL', A: activeStats.willpower, Today: todayStats.willpower, fullMark: dynamicMax },
      { subject: 'SOC', A: activeStats.social, Today: todayStats.social, fullMark: dynamicMax },
    ];
  }, [activeStats, todayStats, dynamicMax]);

  // ── Dusk Contextual Voice ──
  const duskContextVoice = useMemo(() => {
    const stats = [
      { name: 'strength', val: player.stats.strength },
      { name: 'intelligence', val: player.stats.intelligence },
      { name: 'focus', val: player.stats.focus },
      { name: 'discipline', val: player.stats.discipline },
      { name: 'willpower', val: player.stats.willpower },
      { name: 'social', val: player.stats.social },
    ];
    stats.sort((a, b) => a.val - b.val);
    const lowest = stats[0];
    const highest = stats[5];

    const messages = [
      `Your ${lowest.name} is lacking today, Hunter.`,
      `I see you've been prioritizing ${highest.name}. Don't neglect the rest.`,
      `The System requires balance. Focus on ${lowest.name}.`,
      `You are growing. But is it fast enough?`,
      `I am waiting for your next command.`,
    ];
    
    // Pick one deterministically based on today's date so it doesn't flicker constantly
    const daySeed = new Date().getDate();
    return messages[daySeed % messages.length];
  }, [player.stats]);
  const dailyInsight = useMemo(() => {
    if (!historyMap) return "System initialized. Awaiting commands.";
    
    // Check if viewing today
    if (!isViewingPast) {
      // Find highest stat today
      const stats = [
        { name: 'STR', val: player.stats.strength },
        { name: 'INT', val: player.stats.intelligence },
        { name: 'FOC', val: player.stats.focus },
        { name: 'DIS', val: player.stats.discipline },
        { name: 'WIL', val: player.stats.willpower },
        { name: 'SOC', val: player.stats.social },
      ];
      stats.sort((a, b) => b.val - a.val);
      const highest = stats[0];
      const lowest = stats[5];
      
      if (player.dailyXp > 500) return `Peak performance detected. Daily XP at ${player.dailyXp}.`;
      if (lowest.val < 15) return `Low ${lowest.name} detected. Recommend targeting ${lowest.name} protocols.`;
      return `Current focus: ${highest.name}. Maintain momentum.`;
    }

    // Viewing past day
    const prevDate = new Date(selectedDate);
    prevDate.setDate(prevDate.getDate() - 1);
    const prevDateStr = prevDate.toISOString().split('T')[0];
    const prevStats = historyMap[prevDateStr]?.stats;

    if (!prevStats) {
      const xp = historyMap[selectedDate.toISOString().split('T')[0]]?.dailyXp || 0;
      return xp > 0 ? `Historical record: ${xp} XP gained.` : `Historical record analyzed.`;
    }

    // Compare selected date with day before it to find what grew the most
    const diffs = [
      { name: 'STR', diff: activeStats.strength - prevStats.strength },
      { name: 'INT', diff: activeStats.intelligence - prevStats.intelligence },
      { name: 'FOC', diff: activeStats.focus - prevStats.focus },
      { name: 'DIS', diff: activeStats.discipline - prevStats.discipline },
      { name: 'WIL', diff: activeStats.willpower - prevStats.willpower },
      { name: 'SOC', diff: activeStats.social - prevStats.social },
    ];
    diffs.sort((a, b) => b.diff - a.diff);
    const bestGrowth = diffs[0];

    if (bestGrowth.diff > 0) {
      return `${bestGrowth.name} +${bestGrowth.diff} on this day. Growth was accelerating.`;
    }
    return `Maintenance phase recorded on this day.`;
  }, [activeStats, historyMap, isViewingPast, player.stats, player.dailyXp, selectedDate]);
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

      {/* --- TOP HEADER --- */}
      <div className="w-full flex items-center justify-between px-4 py-2 bg-gradient-to-b from-[#0A0A0F] to-transparent z-30 absolute top-0 left-0 right-0 pointer-events-none">
        <div className="flex items-center gap-2">
          <div className="w-1 h-3.5 bg-system-neon rounded-full shadow-[0_0_8px_#00d2ff]" />
          <h2 className="text-[10px] font-black tracking-[0.2em] text-white uppercase opacity-90 font-mono">Growth Terminal</h2>
        </div>
      </div>

      {/* --- TOP HEXAGONAL CALENDAR --- */}
      <div className="w-full border-b border-white/5 bg-[#0A0A0F] z-20 shrink-0 px-2 py-2 pt-9 relative">
        {/* Cybernetic Background grid behind calendar */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: `linear-gradient(rgba(0, 210, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 210, 255, 0.1) 1px, transparent 1px)`,
            backgroundSize: '20px 20px',
            maskImage: 'linear-gradient(to bottom, black, transparent)',
            WebkitMaskImage: 'linear-gradient(to bottom, black, transparent)',
          }}
        />
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
        {/* Hexagonal day strip with smooth scroll on hover/drag */}
        <div 
          className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory"
          style={{ scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch' }}
        >
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
                className="flex flex-col items-center gap-0.5 transition-all duration-200 snap-center min-w-[36px]"
              >
                {/* Hexagon */}
                <div
                  className="relative flex items-center justify-center transition-all duration-200"
                  style={{
                    width: 36, height: 40,
                  }}
                >
                  {/* Outer border hex */}
                  <div
                    className="absolute inset-0"
                    style={{
                      clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                      background: borderColor,
                    }}
                  />
                  {/* Inner hex to create the stroke effect */}
                  <div
                    className="absolute flex items-center justify-center"
                    style={{
                      inset: '1.5px',
                      clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                      background: isSelected ? 'rgba(0,210,255,0.25)' : 'rgba(8,8,18,1)',
                      boxShadow: glowShadow,
                    }}
                  >
                    <span
                      className="font-mono font-black text-xs leading-none"
                      style={{ color: isSelected ? '#ffffff' : isToday ? '#00d2ff' : hasData && isPast ? '#4ade80' : '#4b5563' }}
                    >
                      {day.getDate()}
                    </span>
                  </div>
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
      
      {/* --- DAILY INSIGHTS BANNER --- */}
      <div className="w-full bg-[#0A0A0F]/80 border-b border-white/[0.02] flex items-center px-3 py-1.5 z-20 shrink-0 shadow-[0_4px_10px_rgba(0,0,0,0.2)]">
        <div className="flex items-center gap-2 w-full">
          <Zap size={10} className="text-[#00d2ff]" />
          <span className="text-[8px] font-mono text-[#00d2ff] uppercase font-bold tracking-widest shrink-0">SYS_LOG:</span>
          <motion.div 
            key={selectedDateIndex}
            initial={{ opacity: 0, x: 5 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-[9px] text-gray-400 font-mono truncate overflow-hidden"
          >
            {dailyInsight}
          </motion.div>
        </div>
      </div>

      {/* --- MAIN CONTENT (side by side) --- */}
      <div className="flex flex-row w-full relative flex-1 min-h-[350px] md:min-h-[400px]">
        
        {/* ── LEFT CONTAINER: RADAR CHART ── */}
        <div className="w-[45%] md:w-[42%] relative z-30 flex items-center justify-center shrink-0">
          
          {/* Pulsing Cybernetic Background */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30 mix-blend-screen overflow-hidden">
            <motion.div 
              key={`grid-${selectedDateIndex}`}
              className="w-[120%] aspect-square rounded-full border border-system-neon/20"
              initial={{ rotate: 0, scale: 0.8, opacity: 0 }}
              animate={{ rotate: 90, scale: 1, opacity: 1 }}
              transition={{ duration: 20, ease: "linear", repeat: Infinity }}
              style={{
                background: 'repeating-conic-gradient(from 0deg, transparent 0deg, transparent 10deg, rgba(0,210,255,0.05) 10deg, rgba(0,210,255,0.05) 20deg)',
              }}
            />
          </div>

          {/* Chart oversized with left offset so labels stay on-screen, overlaps into video */}
          <div className="w-[145%] md:w-[135%] aspect-square absolute left-[2px] md:left-[4px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
                <PolarGrid stroke="rgba(255,255,255,0.06)" strokeWidth={1} gridType="polygon" radialLines={false} />
                <PolarAngleAxis 
                  dataKey="subject" 
                  tick={{ fill: '#00d2ff', fontSize: 10, fontWeight: 900, fontFamily: 'monospace' }} 
                />
                <PolarRadiusAxis 
                  domain={[0, dynamicMax]} 
                  tick={false} 
                  axisLine={false} 
                />
                
                {/* Historical Ghost Shape (Today's Stats) - Only visible when viewing past days */}
                {isViewingPast && (
                  <Radar
                    name="Today"
                    dataKey="Today"
                    stroke="rgba(255,255,255,0.3)"
                    strokeWidth={1}
                    fill="transparent"
                    strokeDasharray="3 3"
                    isAnimationActive={false}
                  />
                )}

                {/* Main Stats Shape */}
                <Radar 
                  name="Stats" 
                  dataKey="A" 
                  stroke={radarPhase === 'dots' ? 'transparent' : '#00d2ff'} 
                  strokeWidth={2} 
                  fill={radarPhase === 'complete' ? '#00d2ff' : 'transparent'} 
                  fillOpacity={radarPhase === 'complete' ? 0.2 : 0} 
                  isAnimationActive={false}
                  dot={((props: any) => {
                    const { cx, cy, index } = props;
                    const isVisible = index < visibleDots || radarPhase !== 'dots';
                    if (!cx || !cy) return null;
                    return (
                      <svg x={cx - 5} y={cy - 5} width={10} height={10} className="overflow-visible" key={`dot-${index}`}>
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
              poster="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
              className="absolute inset-0 w-full h-full object-cover object-center bg-transparent"
              style={{ display: videoPhase === 'intro' ? 'block' : 'none' }}
            />
            <video
              ref={loopRef}
              muted playsInline loop preload="auto"
              poster="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
              className="absolute inset-0 w-full h-full object-cover object-center bg-transparent"
              style={{ display: videoPhase === 'loop' ? 'block' : 'none' }}
            />
            {videoPhase === 'image' && equippedOutfit?.image && (
              <img src={equippedOutfit.image} alt={equippedOutfit.name} className="absolute inset-0 w-full h-full object-cover object-center brightness-75" />
            )}
            {videoPhase === 'image' && !equippedOutfit?.image && (
              <video 
                autoPlay loop muted playsInline
                poster="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
                src="https://res.cloudinary.com/dcnqnbvp0/video/upload/v1769167952/Subject_animestyle_shadow_202601231701_vl45_ayicwk.mp4"
                className="absolute inset-0 w-full h-full object-cover object-center bg-transparent"
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

      {/* --- BOTTOM SECTION: TALK TO DUSK BUTTON --- */}
      <div className="w-full p-3 bg-[#0A0A0F] border-t border-white/5 z-20 relative shrink-0">
        <button
          onClick={onOpenDuskChat}
          className="w-full relative rounded-xl overflow-hidden h-[48px] flex items-center justify-center gap-3 px-4 group transition-all duration-300"
          style={{
            background: 'linear-gradient(90deg, rgba(8,8,18,0.95), rgba(15,20,35,0.95))',
            border: '1px solid rgba(0,210,255,0.15)',
            boxShadow: 'inset 0 0 20px rgba(0,210,255,0.05), 0 4px 15px rgba(0,0,0,0.4)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'rgba(0,210,255,0.4)';
            e.currentTarget.style.boxShadow = 'inset 0 0 20px rgba(0,210,255,0.1), 0 4px 20px rgba(0,210,255,0.15)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'rgba(0,210,255,0.15)';
            e.currentTarget.style.boxShadow = 'inset 0 0 20px rgba(0,210,255,0.05), 0 4px 15px rgba(0,0,0,0.4)';
          }}
        >
          {/* Animated background glow */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#00d2ff]/20 via-transparent to-transparent" />
          
          <div className="relative z-10 flex items-center justify-center gap-3 w-full">
            <div className="flex items-center justify-center w-6 h-6 rounded-md bg-[#00d2ff]/10 border border-[#00d2ff]/30 text-[#00d2ff] group-hover:scale-110 group-hover:bg-[#00d2ff]/20 transition-all duration-300">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            
            <div className="flex flex-col items-start justify-center pt-0.5">
              <span className="text-[11px] font-black text-white uppercase tracking-[0.15em] leading-none group-hover:text-system-neon transition-colors duration-300">
                TALK TO DUSK
              </span>
              <span className="text-[8px] text-[#00d2ff]/60 font-mono tracking-wide mt-1 group-hover:text-[#00d2ff]/90 transition-colors duration-300 truncate max-w-[200px] md:max-w-[250px]">
                {duskContextVoice}
              </span>
            </div>

            {(player.duskUnreadCount ?? 0) > 0 && (
              <div className="ml-auto w-5 h-5 rounded-full bg-red-500/90 border border-red-400 flex items-center justify-center text-[9px] font-black text-white shadow-[0_0_12px_rgba(239,68,68,0.8)] animate-pulse">
                {player.duskUnreadCount}
              </div>
            )}
          </div>
          
          {/* Scanning line effect on hover */}
          <motion.div 
            className="absolute left-0 right-0 h-[1px] bg-[#00d2ff]/40 shadow-[0_0_8px_#00d2ff] opacity-0 group-hover:opacity-100"
            animate={{ top: ['0%', '100%', '0%'] }}
            transition={{ duration: 2, ease: "linear", repeat: Infinity }}
          />
        </button>
      </div>

    </div>
  );
};

export default PlayerStatusCard;
