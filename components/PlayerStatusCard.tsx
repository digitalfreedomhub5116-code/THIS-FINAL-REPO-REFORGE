import React, { useMemo, useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, PolarRadiusAxis 
} from 'recharts';
import { ChevronLeft, ChevronRight, Zap } from 'lucide-react';
import { PlayerData, CoreStats, HistoryEntry } from '../types';
import MentorThoughtBox from './MentorThoughtBox';
import ForgeGuardWidget from './ForgeGuardWidget';



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
  mentorMessages: { id: string; text: string }[];
  onDismissMentorMessage: (id: string) => void;
  history: HistoryEntry[];
  onOpenDuskChat: () => void;
}

const PlayerStatusCard: React.FC<PlayerStatusCardProps> = ({ 
  player, 
  mentorMessages,
  onDismissMentorMessage,
  history,
  onOpenDuskChat
}) => {
  const [selectedDateIndex, setSelectedDateIndex] = useState<number>(3);
  const [showAllLevels, setShowAllLevels] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [chartMode, setChartMode] = useState<'D' | 'W' | 'M'>('D');

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



  // Dusk ambient thought box removed for cleaner UI

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
  
  const isViewingPast = selectedDate < todayDate;

  // D/W/M chart domains
  const CHART_DOMAINS = { D: 5, W: 35, M: 155 } as const;
  const chartDomain = CHART_DOMAINS[chartMode];

  // Active stats for the current chart mode
  const activeDisplayStats: CoreStats = useMemo(() => {
    if (chartMode === 'D') {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const todayStr = todayDate.toISOString().split('T')[0];
      if (dateStr === todayStr) return player.dailyStats || { strength:0, intelligence:0, discipline:0, social:0, focus:0, willpower:0 };
      // Past day — look up from history (use cumulative stats difference or zeros)
      return historyMap[dateStr]?.stats || { strength:0, intelligence:0, discipline:0, social:0, focus:0, willpower:0 };
    }
    if (chartMode === 'W') return player.weeklyStats || { strength:0, intelligence:0, discipline:0, social:0, focus:0, willpower:0 };
    return player.monthlyStats || { strength:0, intelligence:0, discipline:0, social:0, focus:0, willpower:0 };
  }, [chartMode, player.dailyStats, player.weeklyStats, player.monthlyStats, selectedDate, todayDate, historyMap]);

  const chartData = useMemo(() => {
    return [
      { subject: 'STR', A: activeDisplayStats.strength || 0, fullMark: chartDomain },
      { subject: 'INT', A: activeDisplayStats.intelligence || 0, fullMark: chartDomain },
      { subject: 'FOC', A: activeDisplayStats.focus || 0, fullMark: chartDomain },
      { subject: 'DIS', A: activeDisplayStats.discipline || 0, fullMark: chartDomain },
      { subject: 'WIL', A: activeDisplayStats.willpower || 0, fullMark: chartDomain },
      { subject: 'SOC', A: activeDisplayStats.social || 0, fullMark: chartDomain },
    ];
  }, [activeDisplayStats, chartDomain]);


  // ── Dusk Contextual Voice ──
  const duskContextVoice = useMemo(() => {
    const ds = player.dailyStats || { strength:0, intelligence:0, discipline:0, social:0, focus:0, willpower:0 };
    const stats = [
      { name: 'strength', label: 'STR', val: ds.strength || 0 },
      { name: 'intelligence', label: 'INT', val: ds.intelligence || 0 },
      { name: 'focus', label: 'FOC', val: ds.focus || 0 },
      { name: 'discipline', label: 'DIS', val: ds.discipline || 0 },
      { name: 'willpower', label: 'WIL', val: ds.willpower || 0 },
      { name: 'social', label: 'SOC', val: ds.social || 0 },
    ];
    stats.sort((a, b) => a.val - b.val);
    const lowest = stats[0];
    const highest = stats[5];
    const total = stats.reduce((s, x) => s + x.val, 0);

    const messages = [
      lowest.val === 0 ? `${lowest.label} is at 0 today. Time to act.` : `${lowest.label} needs more attention. Only ${lowest.val}/5.`,
      total >= 25 ? `Outstanding day. ${total}/30 stat points earned.` : `${highest.label} leads today at ${highest.val}/5. Keep pushing.`,
      `The System requires balance. Focus on ${lowest.name}.`,
      total === 0 ? `No stats earned yet. Begin your quests.` : `${total}/30 total today. ${30 - total} remaining.`,
      `I am waiting for your next command.`,
    ];

    const daySeed = new Date().getDate();
    return messages[daySeed % messages.length];
  }, [player.dailyStats]);

  const dailyInsight = useMemo(() => {
    const ds = player.dailyStats || { strength:0, intelligence:0, discipline:0, social:0, focus:0, willpower:0 };
    const modeLabel = chartMode === 'D' ? 'today' : chartMode === 'W' ? 'this week' : 'this month';
    const src = activeDisplayStats;

    if (chartMode === 'D' && isViewingPast) {
      // Viewing past day
      const xp = historyMap[selectedDate.toISOString().split('T')[0]]?.dailyXp || 0;
      return xp > 0 ? `Historical record: ${xp} XP gained.` : `Historical record analyzed.`;
    }

    const statArr = [
      { name: 'STR', val: src.strength || 0 },
      { name: 'INT', val: src.intelligence || 0 },
      { name: 'FOC', val: src.focus || 0 },
      { name: 'DIS', val: src.discipline || 0 },
      { name: 'WIL', val: src.willpower || 0 },
      { name: 'SOC', val: src.social || 0 },
    ];
    statArr.sort((a, b) => b.val - a.val);
    const highest = statArr[0];
    const lowest = statArr[5];
    const total = statArr.reduce((s, x) => s + x.val, 0);
    const cap = chartDomain;

    if (chartMode === 'D') {
      const maxedStats = statArr.filter(s => s.val >= 5);
      if (maxedStats.length === 6) return `All stats maxed ${modeLabel}. Perfect discipline.`;
      if (total === 0) return `No stats earned yet. Complete quests to grow.`;
      if (highest.val >= 5) return `${highest.name} maxed at 5/5 ${modeLabel}. Focus on ${lowest.name} (${lowest.val}/5).`;
      return `${highest.name} leads at ${highest.val}/5 ${modeLabel}. ${lowest.name} at ${lowest.val}/5.`;
    }

    if (total === 0) return `No stats recorded ${modeLabel} yet.`;
    return `${highest.name} leads at ${highest.val}/${cap} ${modeLabel}. Total: ${total}/${cap * 6}.`;
  }, [activeDisplayStats, chartMode, chartDomain, isViewingPast, historyMap, selectedDate, player.dailyStats]);


  return (
    <div className="w-full relative rounded-2xl overflow-hidden flex flex-col group shadow-[0_20px_60px_rgba(0,0,0,0.7)] bg-[#0A0A0F]" style={{ border: '1px solid rgba(0,212,255,0.3)' }}>

      {/* --- TOP HEADER --- */}
      <div className="w-full flex items-center justify-between px-4 pt-3.5 pb-2 bg-gradient-to-b from-[#0A0A0F] to-transparent z-30 absolute top-0 left-0 right-0 pointer-events-none">
        <div className="flex items-center gap-2">
          <div className="w-1 h-3.5 bg-system-neon rounded-full shadow-[0_0_8px_#00d4ff]" />
          <h2 className="text-[10px] font-black tracking-[0.2em] text-white uppercase opacity-90 font-mono">Growth Terminal</h2>
        </div>
      </div>

      {/* --- TOP HEXAGONAL CALENDAR --- */}
      <div className="w-full border-b border-white/5 bg-[#0A0A0F] z-20 shrink-0 px-2 py-2 pt-11 relative">
        {/* Cybernetic Background grid behind calendar */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: `linear-gradient(rgba(0,212,255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255, 0.1) 1px, transparent 1px)`,
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
          className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory justify-center"
          style={{ scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch' }}
        >
          {calendarDays.map((day, idx) => {
            const isToday = day.toDateString() === todayDate.toDateString();
            const isSelected = selectedDateIndex === idx;
            const dayLabel = ['SUN','MON','TUE','WED','THU','FRI','SAT'][day.getDay()];

            let borderColor = 'rgba(255,255,255,0.08)';
            let glowShadow = 'none';
            if (isSelected) { borderColor = '#00d4ff'; glowShadow = '0 0 10px rgba(0,212,255,0.4)'; }
            else if (isToday) { borderColor = 'rgba(0,212,255,0.4)'; }

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
                      background: isSelected ? 'rgba(0,212,255,0.25)' : 'rgba(8,8,18,1)',
                      boxShadow: glowShadow,
                    }}
                  >
                    <span
                      className="font-mono font-black text-xs leading-none"
                      style={{ color: isSelected ? '#ffffff' : isToday ? '#00d4ff' : '#4b5563' }}
                    >
                      {day.getDate()}
                    </span>
                  </div>
                </div>
                {/* Day label */}
                <span
                  className="text-[7px] font-mono font-bold tracking-wider"
                  style={{ color: isSelected ? '#00d4ff' : isToday ? 'rgba(0,212,255,0.6)' : '#374151' }}
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
          <Zap size={10} className="text-[#00d4ff]" />
          <span className="text-[8px] font-mono text-[#00d4ff] uppercase font-bold tracking-widest shrink-0">SYS_LOG:</span>
          <motion.div 
            key={`${selectedDateIndex}-${chartMode}`}
            initial={{ opacity: 0, x: 5 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-[9px] text-gray-400 font-mono truncate overflow-hidden"
          >
            {dailyInsight}
          </motion.div>
        </div>
      </div>

      {/* --- D/W/M TOGGLE --- */}
      <div className="w-full flex items-center justify-center gap-2 py-1.5 bg-[#0A0A0F]/80 border-b border-white/[0.02] z-20 shrink-0">
        {(['D', 'W', 'M'] as const).map(mode => {
          const active = chartMode === mode;
          const labels = { D: 'Daily', W: 'Weekly', M: 'Monthly' };
          return (
            <button
              key={mode}
              onClick={() => setChartMode(mode)}
              className="px-4 py-1 rounded-lg text-[9px] font-black font-mono uppercase tracking-widest transition-all duration-200"
              style={active ? {
                background: 'rgba(0,212,255,0.15)',
                border: '1px solid rgba(0,212,255,0.4)',
                color: '#00d4ff',
                boxShadow: '0 0 8px rgba(0,212,255,0.15)',
              } : {
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                color: '#4b5563',
              }}
            >
              {labels[mode]}
            </button>
          );
        })}
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
                  tick={(props: any) => {
                    const { x, y, payload } = props;
                    const item = chartData.find((d: any) => d.subject === payload.value);
                    const val = item?.A || 0;
                    return (
                      <g>
                        <text x={x} y={y - 4} textAnchor="middle" dominantBaseline="middle" fill="#00d4ff" fontSize={10} fontWeight={900} fontFamily="monospace">
                          {payload.value}
                        </text>
                        <text x={x} y={y + 9} textAnchor="middle" dominantBaseline="middle" fill="#6b7280" fontSize={7} fontWeight={700} fontFamily="monospace">
                          {val}/{chartDomain}
                        </text>
                      </g>
                    );
                  }}
                />
                <PolarRadiusAxis 
                  domain={[0, chartDomain]} 
                  tick={false} 
                  axisLine={false} 
                />
                


                {/* Main Stats Shape */}
                <Radar 
                  name="Stats" 
                  dataKey="A" 
                  stroke={radarPhase === 'dots' ? 'transparent' : '#00d4ff'} 
                  strokeWidth={2} 
                  fill={radarPhase === 'complete' ? '#00d4ff' : 'transparent'} 
                  fillOpacity={radarPhase === 'complete' ? 0.2 : 0} 
                  isAnimationActive={false}
                  activeDot={false}
                  dot={((props: any) => {
                    const { cx, cy, index } = props;
                    const isVisible = index < visibleDots || radarPhase !== 'dots';
                    if (!cx || !cy) return null;
                    const ctr = 15;
                    return (
                      <svg x={cx - ctr} y={cy - ctr} width={ctr * 2} height={ctr * 2} className="overflow-visible" key={`dot-${index}`}>
                        {/* Base dot */}
                        <circle cx={ctr} cy={ctr} r="3" fill="#fff" opacity={isVisible ? 0.95 : 0}>
                          {isVisible && <animate attributeName="opacity" values="0;0.95" dur="0.2s" fill="freeze" />}
                        </circle>
                        {/* Ambient pulse ring */}
                        <circle cx={ctr} cy={ctr} r="5" fill="none" stroke="#00d4ff" strokeWidth="1" opacity={isVisible ? 0.5 : 0}>
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
                    <stop offset="0%" stopColor="#00d4ff" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#0055ff" stopOpacity={0.08} />
                  </linearGradient>
                </defs>
              </RadarChart>
            </ResponsiveContainer>
          </div>


        </div>

        {/* ── RIGHT CONTAINER: VIDEO ── */}
        <div className="w-[55%] md:w-[58%] relative z-10 shrink-0 bg-[#0A0A0F] overflow-hidden">
          <div className="absolute inset-0 w-full h-full">
            <video 
              autoPlay loop muted playsInline
              poster="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
              src="https://res.cloudinary.com/dcnqnbvp0/video/upload/v1769167952/Subject_animestyle_shadow_202601231701_vl45_ayicwk.mp4"
              className="absolute inset-0 w-full h-full object-cover object-center bg-transparent"
              onCanPlay={(e) => (e.target as HTMLVideoElement).classList.add('video-ready')}
            />
          </div>

          {/* Edge gradients for blending — stronger top/bottom shadows */}
          <div className="absolute inset-y-0 left-0 w-24 md:w-32 bg-gradient-to-r from-[#0A0A0F] via-[#0A0A0F]/80 to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-[#0A0A0F]/70 to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#0A0A0F] via-[#0A0A0F]/60 to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#0A0A0F] via-[#0A0A0F]/50 to-transparent z-10 pointer-events-none" />



        </div>

      </div>

    </div>
  );
};

export default PlayerStatusCard;
