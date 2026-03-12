
import React, { useState } from 'react';
import { WorkoutDay } from '../types';
import { ChevronDown, ChevronUp, Clock, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProtocolMonthViewProps {
  plan: WorkoutDay[];
}

const ProtocolMonthView: React.FC<ProtocolMonthViewProps> = ({ plan }) => {
  const [expandedWeek, setExpandedWeek] = useState<number>(0);

  // Chunk into weeks
  const weeks = [];
  for (let i = 0; i < plan.length; i += 7) {
    weeks.push(plan.slice(i, i + 7));
  }

  return (
    <div className="w-full h-[500px] md:h-[600px] bg-black/40 border border-gray-800 rounded-xl overflow-hidden backdrop-blur-sm flex flex-col shadow-inner">
      <div className="p-4 border-b border-gray-800 bg-gray-900/50 flex justify-between items-center shrink-0">
        <h3 className="text-white font-mono font-bold tracking-widest flex items-center gap-2">
            <Activity size={16} className="text-system-neon" /> PROTOCOL OVERVIEW
        </h3>
        <span className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">4 Week Cycle</span>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
        {weeks.map((weekDays, weekIdx) => (
          <div key={weekIdx} className="border border-gray-800 rounded-lg overflow-hidden bg-[#0a0a0a]">
            <button 
              onClick={() => setExpandedWeek(expandedWeek === weekIdx ? -1 : weekIdx)}
              className={`w-full flex justify-between items-center p-3 transition-colors ${expandedWeek === weekIdx ? 'bg-gray-800/80' : 'bg-gray-900/30 hover:bg-gray-800/50'}`}
            >
                <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold ${expandedWeek === weekIdx ? 'bg-system-neon text-black' : 'bg-gray-800 text-gray-500'}`}>
                        W{weekIdx + 1}
                    </div>
                    <span className={`text-xs font-bold font-mono ${expandedWeek === weekIdx ? 'text-white' : 'text-gray-400'}`}>
                        PHASE {weekIdx + 1}
                    </span>
                </div>
                {expandedWeek === weekIdx ? <ChevronUp size={14} className="text-system-neon" /> : <ChevronDown size={14} className="text-gray-600" />}
            </button>
            
            <AnimatePresence>
                {expandedWeek === weekIdx && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="p-2 space-y-2 border-t border-gray-800">
                            {weekDays.map((day, dayIdx) => (
                                <div key={dayIdx} className="bg-black/40 border border-gray-800/50 rounded p-3 hover:border-gray-700 transition-colors">
                                    <div className="flex justify-between items-start mb-2 border-b border-gray-800/30 pb-2">
                                        <div>
                                            <div className="text-[9px] text-system-neon font-bold tracking-widest uppercase mb-0.5">{day.day}</div>
                                            <div className="text-xs font-bold text-white uppercase italic tracking-wider">{day.focus}</div>
                                        </div>
                                        <div className="text-[9px] text-gray-500 font-mono flex items-center gap-1 bg-gray-900 px-1.5 py-0.5 rounded">
                                            <Clock size={10} /> {day.totalDuration}m
                                        </div>
                                    </div>
                                    
                                    {day.isRecovery ? (
                                        <div className="text-[10px] text-gray-500 italic flex items-center gap-2 pl-1">
                                            <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                                            Active Recovery: {day.exercises[0]?.name || 'Rest & Recovery'}
                                        </div>
                                    ) : (
                                        <div className="space-y-1.5 mt-2">
                                            {day.exercises.map((ex, exIdx) => (
                                                <div key={exIdx} className="flex justify-between items-center text-[10px] group">
                                                    <span className="text-gray-400 truncate pr-2 group-hover:text-gray-300 transition-colors">{ex.name}</span>
                                                    <span className="font-mono text-gray-600 whitespace-nowrap bg-gray-900/50 px-1.5 py-0.5 rounded border border-gray-800">{ex.sets} x {ex.reps}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
          </div>
        ))}
        
        {plan.length === 0 && (
            <div className="text-center py-10 text-gray-600 text-xs font-mono">
                NO PROTOCOL LOADED
            </div>
        )}
      </div>
    </div>
  );
};

export default ProtocolMonthView;