import React, { useMemo, useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, PolarRadiusAxis 
} from 'recharts';
import { ScanLine, Activity, Shield } from 'lucide-react';
import { PlayerData, CoreStats, Outfit, HistoryEntry } from '../types';
import MentorThoughtBox from './MentorThoughtBox';

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
  
  // Combine today's stats with history for navigation
  const allHistory = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayEntry: HistoryEntry = {
      date: today,
      stats: player.stats,
      totalXp: player.totalXp,
      dailyXp: player.dailyXp,
      questCompletion: 0 // Mock or calculate if needed
    };
    
    // Sort history by date descending, remove duplicates of today
    const pastHistory = [...history]
      .filter(h => h.date !== today)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
    // Return max 7 days for the top bar
    return [todayEntry, ...pastHistory].slice(0, 7);
  }, [player.stats, player.totalXp, player.dailyXp, history]);

  // Selected stats based on timeline
  const activeStats: CoreStats = useMemo(() => {
    return allHistory[selectedDateIndex]?.stats || player.stats;
  }, [allHistory, selectedDateIndex, player.stats]);
  
  const chartData = useMemo(() => [
    { subject: 'STRENGTH', A: activeStats.strength, fullMark: 200 },
    { subject: 'INTEL', A: activeStats.intelligence, fullMark: 200 },
    { subject: 'FOCUS', A: activeStats.focus, fullMark: 200 },
    { subject: 'DISCIPLINE', A: activeStats.discipline, fullMark: 200 },
    { subject: 'WILL', A: activeStats.willpower, fullMark: 200 },
    { subject: 'SOCIAL', A: activeStats.social, fullMark: 200 },
  ], [activeStats]);

  const statList = useMemo(() => [
    { label: 'STR', value: activeStats.strength },
    { label: 'SOC', value: activeStats.social },
    { label: 'INT', value: activeStats.intelligence },
    { label: 'WIL', value: activeStats.willpower },
    { label: 'FOC', value: activeStats.focus },
    { label: 'DIS', value: activeStats.discipline },
  ], [activeStats]);

  // Video loop handling
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

  const progressPct = Math.min(100, Math.max(0, (player.currentXp / player.requiredXp) * 100));

  return (
    <div className="w-full relative rounded-3xl overflow-hidden flex flex-col group border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl bg-[#0A0A0F]">
      
      {/* Background Ambient Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[400px] h-[400px] bg-[#00d2ff]/10 rounded-full blur-[80px] pointer-events-none" />

      {/* --- TOP DATE NAVIGATION --- */}
      <div className="w-full border-b border-white/5 bg-[#0A0A0F]/80 backdrop-blur-md z-20 flex overflow-x-auto hide-scrollbar px-4 py-3 gap-2 shrink-0">
        {allHistory.map((entry, idx) => {
          const dateObj = new Date(entry.date + 'T12:00:00Z'); // force midday to avoid timezone shift issues
          let label = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          if (idx === 0) label = "TODAY";
          if (idx === 1 && allHistory.length > 1) {
             const today = new Date();
             const yesterday = new Date(today);
             yesterday.setDate(yesterday.getDate() - 1);
             if (dateObj.toDateString() === yesterday.toDateString()) {
                label = "YESTERDAY";
             }
          }
          
          const isSelected = selectedDateIndex === idx;
          
          return (
            <button
              key={entry.date}
              onClick={() => {
                setSelectedDateIndex(idx);
                // Simple sound effect mock if we had a global sound function, 
                // but we can trigger a visual effect instead via state if needed
              }}
              className={`relative px-4 py-1.5 rounded-full whitespace-nowrap text-xs font-mono font-bold tracking-widest transition-all duration-300 ${
                isSelected 
                  ? 'text-[#00d2ff] bg-[#00d2ff]/10 border border-[#00d2ff]/30 shadow-[0_0_15px_rgba(0,210,255,0.2)]' 
                  : 'text-gray-500 hover:text-gray-300 border border-transparent'
              }`}
            >
              {label}
              {isSelected && (
                <motion.div 
                  layoutId="dateIndicator" 
                  className="absolute inset-0 rounded-full border border-[#00d2ff] shadow-[0_0_10px_rgba(0,210,255,0.4)] pointer-events-none" 
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>
      
      <div className="flex flex-row w-full relative z-10 flex-1">
        {/* --- LEFT CONTAINER (DATA) --- */}
        <div className="w-[50%] md:w-[45%] flex flex-col relative z-10 shrink-0 p-4 md:p-8">
          
        {/* Radar Chart Container */}
        <div className="w-full aspect-square relative z-10 flex items-center justify-center -mt-4 mb-2 max-w-[320px] mx-auto scale-110">
            {/* Radar Glow Underlay */}
            <div className="absolute w-[180px] h-[180px] bg-[#00d2ff]/10 rounded-full blur-3xl" />
            
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="65%" data={chartData}>
                {/* Hexagonal grid */}
                <PolarGrid stroke="rgba(255,255,255,0.05)" strokeWidth={1} gridType="polygon" radialLines={false} />
                
                {/* Axes labels */}
                <PolarAngleAxis 
                  dataKey="subject" 
                  tick={{ fill: '#00d2ff', fontSize: 10, fontWeight: '900', fontFamily: 'monospace', letterSpacing: '1px' }} 
                />
                <PolarRadiusAxis angle={30} domain={[0, 200]} tick={false} axisLine={false} />

                {/* Player Stats Radar */}
                <Radar
                  name="Stats"
                  dataKey="A"
                  stroke="#00d2ff"
                  strokeWidth={2}
                  fill="url(#radarGradient)"
                  fillOpacity={1}
                  isAnimationActive={true}
                  // Glowing Dots
                  dot={((props: any) => {
                      const { cx, cy } = props;
                      if (!Number.isFinite(cx) || !Number.isFinite(cy)) return <g></g>;
                      return (
                          <svg x={cx - 3} y={cy - 3} width={6} height={6} className="overflow-visible">
                              <circle cx="3" cy="3" r="3" fill="#fff" className="drop-shadow-[0_0_5px_rgba(0,210,255,1)]" />
                          </svg>
                      );
                  }) as any}
                />
                <defs>
                  <linearGradient id="radarGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00d2ff" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#0055ff" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
              </RadarChart>
            </ResponsiveContainer>
        </div>

        {/* Rank & Title */}
        <div className="mb-4 md:mb-6 border-b border-white/10 pb-3 md:pb-4">
          <div className="text-3xl md:text-4xl font-black italic tracking-tighter text-white mb-1 drop-shadow-md">
            {player.rank}
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-gray-400 font-mono text-[10px] tracking-[0.2em]">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              {player.job.toUpperCase()}
            </div>
            <div className="flex items-center gap-2 text-gray-500 font-mono text-[10px] tracking-[0.2em]">
              <Shield size={10} />
              RANK: {player.rank}
            </div>
          </div>
        </div>

        {/* Stat List */}
        <div className="flex flex-col gap-1.5 md:gap-2 mb-6 md:mb-8 flex-1">
          {statList.map((stat, i) => (
            <div key={stat.label} className="flex justify-between items-center border-b border-white/5 pb-1 md:pb-1.5">
              <span className="text-gray-500 font-mono text-[9px] md:text-[11px] font-bold tracking-widest">{stat.label}</span>
              <motion.span 
                key={`${stat.label}-${selectedDateIndex}`}
                initial={{ opacity: 0.5, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[#00d2ff] font-mono text-[9px] md:text-[11px] font-black drop-shadow-[0_0_8px_rgba(0,210,255,0.4)]"
              >
                {Math.floor(stat.value)}
              </motion.span>
            </div>
          ))}
        </div>

        {/* Level & XP */}
        <div className="mt-auto">
          <div className="flex justify-between items-end mb-2">
            <div className="text-xl font-black italic tracking-tighter text-white drop-shadow-md">
              LVL {player.level}
            </div>
            <div className="text-[9px] font-mono text-gray-500 font-bold tracking-widest">
              {Math.floor(player.currentXp)} / {player.requiredXp} XP
            </div>
          </div>
          {/* Custom Clean Progress Bar */}
          <div className="h-1 bg-white/10 rounded-full overflow-hidden w-full">
            <motion.div 
              className="h-full bg-[#00d2ff] shadow-[0_0_10px_rgba(0,210,255,0.5)]"
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>

      {/* --- RIGHT CONTAINER (VIDEO / MENTOR) --- */}
      {/* Notice there is no explicit border-left or partition here, blending seamlessly */}
      <div className="w-[50%] md:w-[55%] relative bg-black overflow-hidden shrink-0 min-h-[300px] md:min-h-0 flex items-center justify-center shadow-[inset_20px_0_50px_rgba(10,10,15,1)]">
         
         {/* Video Feed */}
         <div className="absolute inset-0 w-full h-full mix-blend-screen scale-[1.05] origin-center opacity-80 group-hover:opacity-100 transition-opacity duration-700">
           <video
              ref={introRef}
              muted playsInline preload="auto"
              className="absolute inset-0 w-full h-full object-cover"
              style={{ display: videoPhase === 'intro' ? 'block' : 'none' }}
           />
           <video
              ref={loopRef}
              muted playsInline loop preload="auto"
              className="absolute inset-0 w-full h-full object-cover"
              style={{ display: videoPhase === 'loop' ? 'block' : 'none' }}
           />
           {videoPhase === 'image' && equippedOutfit?.image && (
             <img src={equippedOutfit.image} alt={equippedOutfit.name} className="absolute inset-0 w-full h-full object-cover grayscale contrast-125 brightness-75" />
           )}
           {/* Fallback if no outfit or image */}
           {videoPhase === 'image' && !equippedOutfit?.image && (
             <video 
                autoPlay loop muted playsInline
                src="https://res.cloudinary.com/dcnqnbvp0/video/upload/v1769167952/Subject_animestyle_shadow_202601231701_vl45_ayicwk.mp4"
                className="absolute inset-0 w-full h-full object-cover"
             />
           )}
         </div>

         {/* Gradient blend on left edge to fade into stats */}
         <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[#0A0A0F] via-[#0A0A0F]/80 to-transparent z-10 pointer-events-none" />
         <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#0A0A0F] to-transparent z-10 pointer-events-none" />
         <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#0A0A0F] to-transparent z-10 pointer-events-none" />
         <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#0A0A0F] to-transparent z-10 pointer-events-none" />
         
         {/* Holographic Overlays */}
         <div className="absolute inset-0 bg-[linear-gradient(rgba(0,210,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,210,255,0.03)_1px,transparent_1px)] bg-[size:10px_10px] pointer-events-none z-10" />
         
         {/* Scanning Line */}
         <motion.div 
            initial={{ top: '-10%' }}
            animate={{ top: '110%' }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            className="absolute left-0 w-full h-px bg-[#00d2ff]/20 shadow-[0_0_10px_rgba(0,210,255,0.3)] z-20 pointer-events-none"
         />

         {/* Subtle Eye Glow Override (if needed to simulate glowing eyes over video) */}
         {/* We place it absolutely roughly where a face might be, but it's risky without tracking. Best left out if video has it built in. */}

         {/* Mentor Thought Box Overlay (Safe Zone: Top Right or Center Right) */}
         <MentorThoughtBox messages={mentorMessages} onDismiss={onDismissMentorMessage} />

         {/* Corner Brackets */}
         <div className="absolute top-4 left-4 w-4 h-4 border-t border-l border-white/20 z-20" />
         <div className="absolute top-4 right-4 w-4 h-4 border-t border-r border-white/20 z-20" />
         <div className="absolute bottom-4 left-4 w-4 h-4 border-b border-l border-white/20 z-20" />
         <div className="absolute bottom-4 right-4 w-4 h-4 border-b border-r border-white/20 z-20" />

         {/* Sync Indicator */}
         <div className="absolute bottom-6 right-6 z-20">
             <div className="flex items-center gap-2 px-3 py-1.5 bg-black/60 border border-white/10 rounded-full backdrop-blur-md">
                 <div className="relative">
                    <Activity size={10} className="text-[#00d2ff]" />
                    <div className="absolute inset-0 bg-[#00d2ff] blur-[2px] opacity-50 animate-pulse" />
                 </div>
                 <span className="text-[8px] font-mono font-bold text-white tracking-widest uppercase">SYS.LINK</span>
             </div>
         </div>
      </div>
      </div>

    </div>
  );
};

export default PlayerStatusCard;
