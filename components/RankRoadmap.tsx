
import React from 'react';
import { PlayerData } from '../types';
import { Zap, Play } from 'lucide-react';

interface RankRoadmapProps {
  player: PlayerData;
}

const RankRoadmap: React.FC<RankRoadmapProps> = ({ player }) => {
  // Using this component to represent the "Today's Challenge" section from the reference
  return (
    <div className="w-full card-lime p-6 relative overflow-hidden flex flex-row items-center justify-between min-h-[140px]">
        
        {/* Left Text */}
        <div className="relative z-10 flex-1">
            <h3 className="text-xl font-bold text-black leading-tight mb-2">
                Today's Challenge
            </h3>
            <p className="text-xs text-black/70 font-medium mb-4 max-w-[150px]">
                Do your plan before 9:00 AM to boost streak.
            </p>
            
            <div className="flex gap-2">
                <span className="px-3 py-1 bg-black/10 rounded-full text-[10px] font-bold text-black uppercase">
                    Running
                </span>
                <span className="px-3 py-1 bg-black/10 rounded-full text-[10px] font-bold text-black uppercase">
                    Cycling
                </span>
            </div>
        </div>

        {/* Right Visual / Image */}
        <div className="w-24 h-24 relative">
             {/* Character Image Placeholder (Man running from reference) */}
             <img 
                src="https://images.unsplash.com/photo-1552674605-1e95bf3e3e23?q=80&w=200&auto=format&fit=crop" 
                className="w-full h-full object-cover rounded-2xl mix-blend-multiply opacity-80"
                alt="Runner"
             />
             <div className="absolute bottom-0 right-0 bg-black text-white p-2 rounded-tl-xl rounded-br-xl">
                 <Play size={12} fill="white" />
             </div>
        </div>

        {/* Decorative Background Circles */}
        <div className="absolute right-[-20px] top-[-20px] w-32 h-32 border-[20px] border-white/20 rounded-full pointer-events-none" />
    </div>
  );
};

export default RankRoadmap;
