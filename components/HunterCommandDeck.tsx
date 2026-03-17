
import React from 'react';
import { motion } from 'framer-motion';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, PolarRadiusAxis 
} from 'recharts';
import { Dumbbell, Brain, Users, Shield, Activity, ScanLine } from 'lucide-react';
import { PlayerData, CoreStats } from '../types';

interface HunterCommandDeckProps {
  player: PlayerData;
  triggerActionId?: string | null;
  videoMap?: Record<string, string>;
}

// --- MINI CIRCULAR STAT ---
const MiniCircularStat = ({ value, max = 100, label, icon: Icon, colorHex, colorClass }: any) => {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(100, Math.max(0, (value / max) * 100));
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2 group w-full">
      <div className="relative flex items-center justify-center w-12 h-12">
        {/* Background Glow */}
        <div className="absolute inset-0 bg-white/5 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        {/* Background Track */}
        <svg className="absolute inset-0 w-full h-full -rotate-90 overflow-visible">
           <circle cx="50%" cy="50%" r={radius} stroke="rgba(255,255,255,0.1)" strokeWidth="2" fill="transparent" />
           {/* Progress Path */}
           <motion.circle 
             initial={{ strokeDashoffset: circumference }}
             animate={{ strokeDashoffset: offset }}
             transition={{ duration: 1.5, ease: "easeOut" }}
             cx="50%" cy="50%" r={radius} 
             stroke={colorHex}
             strokeWidth="2" 
             strokeDasharray={circumference} 
             strokeLinecap="round" 
             fill="transparent" 
             style={{ filter: `drop-shadow(0 0 3px ${colorHex})` }}
           />
        </svg>
        <div className="relative z-10 p-1.5 transition-transform group-hover:scale-110 duration-300">
            <Icon size={14} className={colorClass} style={{ filter: `drop-shadow(0 0 8px ${colorHex})` }} />
        </div>
      </div>
      <div className="text-center leading-none">
        <div className="text-[9px] font-black text-white/90 tracking-widest mb-0.5">{label}</div>
        <div className="text-[8px] font-mono text-gray-500 font-bold">{Math.floor(value)}</div>
      </div>
    </div>
  );
};

const HunterCommandDeck: React.FC<HunterCommandDeckProps> = ({ player, triggerActionId, videoMap }) => {
  // Use core stats for the hexagonal chart
  const stats: CoreStats = player.stats;

  // 4-Point Diamond Chart Data
  const chartData = [
    { subject: 'STR', A: stats.strength, fullMark: 100 },
    { subject: 'INT', A: stats.intelligence, fullMark: 100 },
    { subject: 'DIS', A: stats.discipline, fullMark: 100 },
    { subject: 'SOC', A: stats.social, fullMark: 100 },
  ];

  // 4-Stat Icons configuration
  const statConfig = [
      { key: 'strength', label: 'STR', icon: Dumbbell, color: 'text-red-400', glow: '#f87171' },
      { key: 'intelligence', label: 'INT', icon: Brain, color: 'text-blue-400', glow: '#60a5fa' },
      { key: 'discipline', label: 'DIS', icon: Shield, color: 'text-purple-400', glow: '#c084fc' },
      { key: 'social', label: 'SOC', icon: Users, color: 'text-yellow-400', glow: '#facc15' },
  ];

  const defaultVideo = "https://res.cloudinary.com/dcnqnbvp0/video/upload/v1769167952/Subject_animestyle_shadow_202601231701_vl45_ayicwk.mp4";
  const currentVideo = (triggerActionId && videoMap && videoMap[triggerActionId]) ? videoMap[triggerActionId] : defaultVideo;

  return (
    <div className="w-full relative rounded-[2rem] overflow-hidden flex flex-col md:flex-row group border border-white/10 shadow-2xl backdrop-blur-xl bg-black/40">
      
      {/* Background Ambient Glows */}
      <div className="absolute top-[-50%] left-[-10%] w-[500px] h-[500px] bg-purple-900/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] bg-blue-900/10 rounded-full blur-[80px] pointer-events-none" />

      {/* --- LEFT CONTAINER (DATA) --- */}
      <div className="w-full md:w-1/2 flex flex-col relative z-10 shrink-0 md:border-r border-white/5">
          
          {/* Header */}
          <div className="flex justify-between items-start p-6 pb-2 shrink-0">
              <div>
                <div className="flex items-center gap-2 mb-1">
                    <div className="w-1.5 h-1.5 bg-system-neon rounded-full animate-pulse shadow-[0_0_5px_#00d2ff]" />
                    <span className="text-[10px] text-gray-400 tracking-[0.2em] font-mono uppercase">System Active</span>
                </div>
                <h2 className="text-2xl font-black italic tracking-tighter text-white uppercase leading-none drop-shadow-md">
                    Hunter Status
                </h2>
              </div>
              <div className="bg-white/5 border border-white/10 px-2 py-1 rounded text-[10px] font-mono font-bold text-gray-300">
                  RANK: {player.rank}
              </div>
          </div>

          {/* Radar Chart Container */}
          <div className="w-full h-[280px] md:h-auto md:flex-1 relative z-10 min-h-[280px] flex items-center justify-center">
              {/* Radar Glow Underlay */}
              <div className="absolute w-[200px] h-[200px] bg-system-neon/5 rounded-full blur-3xl" />
              
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="65%" data={chartData}>
                  <PolarGrid stroke="rgba(255,255,255,0.1)" strokeWidth={1} gridType="polygon" />
                  <PolarAngleAxis 
                    dataKey="subject" 
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: '900', fontFamily: 'Inter', letterSpacing: '1px' }} 
                  />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  
                  {/* Max Potential Boundary */}
                  <Radar
                    name="Max"
                    dataKey="fullMark"
                    stroke="#334155"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    fill="transparent"
                    fillOpacity={0}
                  />

                  {/* Player Stats Radar */}
                  <Radar
                    name="Stats"
                    dataKey="A"
                    stroke="#c084fc" /* Purple-400 */
                    strokeWidth={2}
                    fill="#a855f7" /* Purple-500 */
                    fillOpacity={0.4}
                    isAnimationActive={true}
                    // Glowing Dots
                    dot={((props: any) => {
                        const { cx, cy } = props;
                        if (!Number.isFinite(cx) || !Number.isFinite(cy)) return <g></g>;
                        return (
                            <svg x={cx - 3} y={cy - 3} width={6} height={6} className="overflow-visible">
                                <circle cx="3" cy="3" r="3" fill="#fff" className="drop-shadow-[0_0_5px_rgba(192,132,252,1)]" />
                            </svg>
                        );
                    }) as any}
                  />
                </RadarChart>
              </ResponsiveContainer>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-y-6 gap-x-2 px-6 pb-8 pt-2 justify-items-center mt-auto shrink-0 border-t border-white/5 bg-black/20">
              {statConfig.map((conf) => (
                  <MiniCircularStat 
                    key={conf.key}
                    icon={conf.icon} 
                    colorClass={conf.color} 
                    colorHex={conf.glow} 
                    label={conf.label} 
                    value={(stats as any)[conf.key] || 0} 
                  />
              ))}
          </div>
      </div>

      {/* --- RIGHT CONTAINER (HOLOGRAPHIC FEED) --- */}
      <div className="w-full md:w-1/2 relative bg-black/60 overflow-hidden shrink-0 h-[220px] md:h-full border-t md:border-t-0 md:border-l border-white/10 group">
         
         {/* Video Feed */}
         <video 
            key={currentVideo}
            autoPlay 
            loop 
            muted 
            playsInline
            poster="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
            className="absolute inset-0 w-full h-full object-cover opacity-60 scale-110 origin-center mix-blend-screen grayscale contrast-125 group-hover:opacity-80 transition-opacity duration-700 bg-transparent"
         >
             <source src={currentVideo} type="video/mp4" />
         </video>
         
         {/* Holographic Overlays */}
         <div className="absolute inset-0 bg-[linear-gradient(rgba(168,85,247,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(168,85,247,0.05)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none z-10" />
         <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/50 z-10 pointer-events-none" />
         
         {/* Scanning Line */}
         <motion.div 
            initial={{ top: '-10%' }}
            animate={{ top: '110%' }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            className="absolute left-0 w-full h-[2px] bg-purple-500/50 shadow-[0_0_15px_#a855f7] z-20 pointer-events-none"
         />

         {/* Corner Brackets */}
         <div className="absolute top-4 left-4 w-4 h-4 border-t border-l border-white/30 z-20" />
         <div className="absolute top-4 right-4 w-4 h-4 border-t border-r border-white/30 z-20" />
         <div className="absolute bottom-4 left-4 w-4 h-4 border-b border-l border-white/30 z-20" />
         <div className="absolute bottom-4 right-4 w-4 h-4 border-b border-r border-white/30 z-20" />

         {/* Sync Indicator */}
         <div className="absolute top-6 right-6 z-20">
             <div className="flex items-center gap-2 px-3 py-1.5 bg-black/60 border border-white/10 rounded-full backdrop-blur-md">
                 <div className="relative">
                    <Activity size={12} className="text-purple-400" />
                    <div className="absolute inset-0 bg-purple-500 blur-sm opacity-50 animate-pulse" />
                 </div>
                 <span className="text-[9px] font-mono font-bold text-white tracking-widest uppercase">LIVE LINK</span>
             </div>
         </div>

         {/* Bottom Data */}
         <div className="absolute bottom-6 left-6 z-20">
             <div className="text-[10px] text-white font-mono font-bold tracking-widest uppercase mb-1 flex items-center gap-2">
                 <ScanLine size={12} className="text-gray-400" />
                 Biometrics
             </div>
             <div className="text-[8px] text-gray-500 font-mono">
                 HR: {Math.floor(60 + Math.random() * 40)} BPM // O2: 98%
             </div>
         </div>
      </div>

    </div>
  );
};

export default HunterCommandDeck;
