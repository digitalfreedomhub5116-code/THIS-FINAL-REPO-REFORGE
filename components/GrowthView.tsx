
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Check, Settings, LogOut, Lock } from 'lucide-react';
import { PlayerData } from '../types';

interface GrowthViewProps {
  player: PlayerData;
  onAdminRequest: () => void;
  onLogout: () => void;
}

// Define explicit type for calendar items
type CalendarItem = 
  | { type: 'empty'; id: string }
  | { 
      type: 'day'; 
      id: string; 
      date: string; 
      dayNum: number; 
      percentage: number; 
      isToday: boolean; 
      isFuture: boolean; 
      stats: string; 
    };

const DAYS_OF_WEEK = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

const GrowthView: React.FC<GrowthViewProps> = ({ player, onAdminRequest, onLogout }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showSettings, setShowSettings] = useState(false);
  const [tooltip, setTooltip] = useState<{ x: number, y: number, date: string, percentage: number, stats: string } | null>(null);

  // --- CALENDAR LOGIC ---
  const calendarData = useMemo<CalendarItem[]>(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Safety check for invalid dates
    if (isNaN(year) || isNaN(month)) return [];

    const firstDay = new Date(year, month, 1).getDay(); // 0-6
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Ensure we don't have invalid loops
    const safeFirstDay = Math.max(0, Math.min(6, firstDay));
    const safeDaysInMonth = Math.max(28, Math.min(31, daysInMonth));

    // Create grid array
    const grid: CalendarItem[] = [];
    
    // Empty slots for start of month
    for (let i = 0; i < safeFirstDay; i++) {
        grid.push({ type: 'empty', id: `empty-${i}` });
    }

    // Days
    const todayStr = new Date().toISOString().split('T')[0];
    const playerHistoryMap = new Map<string, number>(player.history.map(h => [h.date, h.questCompletion]));

    // Calculate Today's Progress Live
    const activeQuests = player.quests;
    const completedToday = activeQuests.filter(q => q.isCompleted).length;
    const totalToday = activeQuests.length;
    const todayCompletion = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0;

    for (let d = 1; d <= safeDaysInMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const isToday = dateStr === todayStr;
        const isFuture = new Date(dateStr) > new Date(todayStr);
        
        let percentage = 0;
        
        if (isToday) {
            percentage = todayCompletion;
        } else if (playerHistoryMap.has(dateStr)) {
            percentage = playerHistoryMap.get(dateStr) || 0;
        }

        grid.push({
            type: 'day',
            id: dateStr,
            date: dateStr,
            dayNum: d,
            percentage,
            isToday,
            isFuture,
            stats: isToday 
                ? `${completedToday}/${totalToday} Quests` 
                : isFuture ? '-' 
                : playerHistoryMap.has(dateStr) ? `${percentage}% Complete` : 'No Data'
        });
    }

    return grid;
  }, [currentDate, player.history, player.quests]);

  const changeMonth = (delta: number) => {
      const newDate = new Date(currentDate);
      newDate.setMonth(newDate.getMonth() + delta);
      setCurrentDate(newDate);
  };

  const getDotColor = (percentage: number, isFuture: boolean) => {
      if (isFuture) return 'bg-gray-900 border border-gray-800';
      if (percentage === 0) return 'bg-gray-800 border border-gray-700';
      if (percentage < 50) return 'bg-blue-900/80 border border-blue-700 shadow-[0_0_8px_rgba(30,58,138,0.4)]';
      if (percentage < 100) return 'bg-teal-600 border border-teal-400 shadow-[0_0_10px_rgba(13,148,136,0.5)]';
      return 'bg-system-success border border-green-400 shadow-[0_0_12px_rgba(16,185,129,0.6)]';
  };

  const handleMouseEnter = (e: React.MouseEvent, day: CalendarItem) => {
      if (day.type === 'empty') return;
      if (day.isFuture) return;
      
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      setTooltip({
          x: rect.left + rect.width / 2,
          y: rect.top - 10,
          date: new Date(day.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
          percentage: day.percentage, 
          stats: day.stats
      });
  };

  return (
    <div className="flex flex-col min-h-[80vh] w-full max-w-4xl mx-auto relative px-2">
        
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
            <div>
                <h1 className="text-4xl font-black text-white tracking-tighter mb-1 font-mono">GROWTH</h1>
                <p className="text-xs text-gray-500 font-mono tracking-widest uppercase">Your consistency over time</p>
            </div>
            
            {/* Settings Toggle */}
            <div className="relative">
                <button 
                    onClick={() => setShowSettings(!showSettings)}
                    className="p-2 text-gray-600 hover:text-white transition-colors"
                >
                    <Settings size={20} />
                </button>
                <AnimatePresence>
                    {showSettings && (
                        <motion.div 
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            className="absolute right-0 top-full mt-2 w-48 bg-black border border-gray-800 rounded-xl shadow-xl overflow-hidden z-50"
                        >
                            <div className="p-1">
                                <button onClick={onAdminRequest} className="w-full text-left px-4 py-3 text-[10px] font-mono text-gray-400 hover:bg-gray-900 hover:text-white flex items-center gap-2">
                                    <Lock size={12} /> ADMIN CONSOLE
                                </button>
                                <button onClick={onLogout} className="w-full text-left px-4 py-3 text-[10px] font-mono text-red-500 hover:bg-red-900/20 flex items-center gap-2">
                                    <LogOut size={12} /> LOGOUT
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>

        {/* --- MAIN CALENDAR CARD --- */}
        <div className="bg-[#080808] border border-gray-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-system-neon/5 rounded-full blur-[100px] pointer-events-none" />
            
            {/* Month Controls */}
            <div className="flex justify-between items-center mb-8 relative z-10">
                <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-800 rounded-full text-gray-500 hover:text-white transition-colors">
                    <ChevronLeft size={20} />
                </button>
                <div className="text-xl font-bold font-mono text-white tracking-widest">
                    {MONTHS[currentDate.getMonth()]} <span className="text-gray-600">{currentDate.getFullYear()}</span>
                </div>
                <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-800 rounded-full text-gray-500 hover:text-white transition-colors">
                    <ChevronRight size={20} />
                </button>
            </div>

            {/* Grid */}
            <div className="relative z-10">
                {/* Weekday Labels */}
                <div className="grid grid-cols-7 gap-2 mb-4 text-center">
                    {DAYS_OF_WEEK.map(d => (
                        <div key={d} className="text-[10px] font-bold text-gray-600 font-mono">{d}</div>
                    ))}
                </div>

                {/* Days */}
                <div className="grid grid-cols-7 gap-3 sm:gap-4">
                    <AnimatePresence mode="popLayout">
                        {calendarData.map((day) => (
                            <motion.div
                                key={day.id}
                                layout
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.2 }}
                                className="aspect-square flex items-center justify-center relative group"
                                onMouseEnter={(e) => handleMouseEnter(e, day)}
                                onMouseLeave={() => setTooltip(null)}
                            >
                                {day.type === 'day' && (
                                    <div 
                                        className={`
                                            w-full h-full rounded-full transition-all duration-500 flex items-center justify-center relative
                                            ${getDotColor(day.percentage, day.isFuture)}
                                            ${day.isToday ? 'ring-2 ring-white ring-offset-2 ring-offset-black' : ''}
                                        `}
                                    >
                                        {/* Percentage-based Checkmark */}
                                        {day.percentage === 100 && !day.isFuture && (
                                            <motion.div 
                                                initial={{ scale: 0 }} 
                                                animate={{ scale: 1 }} 
                                                className="text-black drop-shadow-sm"
                                            >
                                                <Check size={14} strokeWidth={4} />
                                            </motion.div>
                                        )}
                                        
                                        {/* Date Number (Subtle) */}
                                        {!day.isFuture && day.percentage < 100 && (
                                            <span className="text-[10px] text-white/30 font-mono font-bold group-hover:text-white transition-colors">
                                                {day.dayNum}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>
        </div>

        {/* Legend */}
        <div className="mt-8 flex justify-center gap-6 text-[10px] font-mono text-gray-500 uppercase tracking-widest">
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-800 border border-gray-700" /> 0%
            </div>
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-900 border border-blue-700" /> 1-49%
            </div>
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-teal-600 border border-teal-400" /> 50-99%
            </div>
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-system-success border border-green-400 flex items-center justify-center text-black">
                    <Check size={8} strokeWidth={4} />
                </div> 100%
            </div>
        </div>

        {/* Tooltip Portal */}
        {tooltip && (
            <div 
                className="fixed z-50 pointer-events-none flex flex-col items-center"
                style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)' }}
            >
                <div className="bg-black border border-gray-700 text-white text-xs rounded-lg py-2 px-3 shadow-xl mb-2 text-center min-w-[120px]">
                    <div className="font-bold font-mono text-system-neon mb-1">{tooltip.date}</div>
                    <div className="text-gray-400">{tooltip.stats}</div>
                </div>
                <div className="w-2 h-2 bg-gray-700 rotate-45 -mt-3"></div>
            </div>
        )}
    </div>
  );
};

export default GrowthView;
