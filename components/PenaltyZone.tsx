
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Timer, Skull, Flame, CheckCircle, Lock, Coins } from 'lucide-react';
import { PenaltyTask } from '../types';

interface PenaltyZoneProps {
  endTime?: number;
  task?: PenaltyTask;
  gold: number;
  onSurvive: () => void; // Clears penalty instantly (for physical task completion or dev)
  reducePenalty: (ms: number) => void;
  onSacrifice: () => void;
}

const PenaltyZone: React.FC<PenaltyZoneProps> = ({ endTime, task, gold, onSurvive, reducePenalty, onSacrifice }) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [clickCount, setClickCount] = useState(0);

  const TOTAL_DURATION = task?.duration || 4 * 60 * 60 * 1000; 

  useEffect(() => {
    if (!endTime) return;

    const timer = setInterval(() => {
      const remaining = Math.max(0, endTime - Date.now());
      setTimeLeft(remaining);
    }, 1000);

    // Initial calc
    setTimeLeft(Math.max(0, endTime - Date.now()));

    return () => clearInterval(timer);
  }, [endTime]);

  const formatTime = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Calculate Progress (0 to 100%)
  const progress = Math.min(100, Math.max(0, (1 - (timeLeft / TOTAL_DURATION)) * 100));

  const handleSuffer = () => {
    // Reduce by 1 minute per click
    reducePenalty(60 * 1000);
    setClickCount(prev => prev + 1);
  };

  const canAffordSacrifice = gold >= 500;

  return (
    <div className="min-h-screen bg-black text-red-600 font-mono flex flex-col items-center justify-center p-8 text-center relative overflow-hidden selection:bg-red-900 selection:text-white">
      
      {/* Background Pulse */}
      <div className="absolute inset-0 bg-red-900/10 z-0 animate-pulse" />
      
      {/* Glitch Overlay Effect */}
      <div className="absolute inset-0 pointer-events-none opacity-20 z-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] brightness-50 contrast-150"></div>

      <motion.div 
         initial={{ scale: 0.9, opacity: 0 }}
         animate={{ scale: 1, opacity: 1 }}
         className="relative z-10 max-w-2xl w-full flex flex-col items-center"
      >
         <AlertTriangle className="w-24 h-24 mb-6 text-red-600 animate-pulse drop-shadow-[0_0_15px_rgba(220,38,38,0.8)]" />
         
         <h1 className="text-5xl md:text-7xl font-bold mb-4 tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-red-500 to-red-900">
            PENALTY ZONE
         </h1>
         
         <div className="text-xl text-red-400 mb-8 max-w-lg border-l-2 border-red-800 pl-4 py-4 bg-red-950/20 w-full text-left">
            <div className="text-xs text-red-600 uppercase tracking-widest mb-2 font-bold">MANDATORY TASK</div>
            <div className="text-2xl font-bold text-white mb-1">{task?.title || "SYSTEM LOCKOUT"}</div>
            <p className="text-red-300 text-sm">{task?.description || "Survive the duration to restore synchronization."}</p>
         </div>

         {/* Timer Display - Only if Time Based */}
         {(!task || task.type === 'TIME') && (
             <div className="mb-10 p-6 border border-red-600/50 bg-black rounded-lg shadow-[0_0_30px_rgba(220,38,38,0.2)] w-full">
                <div className="flex items-center justify-center gap-4 text-4xl md:text-6xl font-bold tracking-widest text-red-500">
                   <Timer className="w-8 h-8 md:w-12 md:h-12 animate-spin-slow" />
                   {formatTime(timeLeft)}
                </div>
                <div className="text-xs text-red-800 mt-2 uppercase tracking-[0.5em]">Time Remaining</div>
             </div>
         )}

         {/* Survival Progress - Only if Time Based */}
         {(!task || task.type === 'TIME') && (
             <div className="w-full mb-8">
                <div className="flex justify-between text-xs text-red-500 mb-1">
                   <span>SURVIVAL PROGRESS</span>
                   <span>{progress.toFixed(1)}%</span>
                </div>
                <div className="h-4 bg-red-950 rounded-full overflow-hidden border border-red-900">
                   <motion.div 
                      className="h-full bg-red-600 shadow-[0_0_15px_#dc2626]"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ type: "spring", stiffness: 50 }}
                   />
                </div>
                
                {/* Suffer Button for Time */}
                <button 
                   onClick={handleSuffer}
                   className="mt-6 group relative px-8 py-4 bg-red-950 border border-red-600 rounded hover:bg-red-900 transition-all active:scale-95 overflow-hidden w-full"
                 >
                    <div className="absolute inset-0 bg-red-600/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    <span className="relative z-10 flex items-center justify-center gap-3 text-red-500 font-bold text-xl group-hover:text-white">
                       <Flame className={clickCount % 2 === 0 ? "text-orange-500" : "text-red-500"} />
                       SUFFER {-1} MIN
                       <Skull size={20} />
                    </span>
                 </button>
             </div>
         )}

         {/* Physical Task Completion */}
         {task?.type === 'PHYSICAL' && (
             <div className="w-full mb-8">
                 <div className="p-4 bg-red-900/10 border border-red-800/50 rounded mb-6 text-sm text-red-400">
                    Warning: False reporting will destabilize your mental synchronization. Perform the penalty with integrity.
                 </div>
                 
                 <button 
                   onClick={onSurvive}
                   className="w-full py-5 bg-red-600 text-black font-bold text-xl rounded shadow-[0_0_20px_#dc2626] hover:bg-white hover:text-red-600 transition-all active:scale-95 flex items-center justify-center gap-3"
                 >
                    <CheckCircle size={24} />
                    I HAVE COMPLETED THE PENALTY
                 </button>
             </div>
         )}

         {/* DIVINE OFFER / SAFETY NET */}
         <div className="w-full border-t border-red-900/50 pt-6 mt-4">
             <div className="flex justify-between items-center mb-4">
                 <span className="text-[10px] text-yellow-600 font-bold tracking-widest uppercase flex items-center gap-2">
                    <Lock size={12} /> DIVINE INTERVENTION
                 </span>
                 <span className="text-[10px] text-yellow-600 font-bold tracking-widest uppercase flex items-center gap-2">
                    BALANCE: <span className={canAffordSacrifice ? "text-white" : "text-red-500"}>{gold} G</span>
                 </span>
             </div>
             
             <button 
                onClick={onSacrifice}
                disabled={!canAffordSacrifice}
                className={`w-full py-4 rounded-lg border flex items-center justify-center gap-3 transition-all font-mono font-bold
                    ${canAffordSacrifice 
                        ? 'bg-yellow-900/20 border-yellow-600/50 text-yellow-500 hover:bg-yellow-500 hover:text-black shadow-[0_0_15px_rgba(234,179,8,0.2)]' 
                        : 'bg-gray-900/50 border-gray-800 text-gray-600 cursor-not-allowed'
                    }
                `}
             >
                <Coins size={20} />
                {canAffordSacrifice ? 'SACRIFICE 500 GOLD TO SKIP' : 'INSUFFICIENT FUNDS FOR SACRIFICE (500 G)'}
             </button>
         </div>
         
         <p className="mt-8 text-xs text-red-900/80 flex items-center gap-2">
            SYSTEM ACCESS RESTRICTED
         </p>

      </motion.div>
    </div>
  );
};

export default PenaltyZone;
