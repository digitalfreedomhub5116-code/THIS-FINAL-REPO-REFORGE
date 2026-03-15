
import React from 'react';
import { Calendar, Check, Flame } from 'lucide-react';
import { PlayerData } from '../types';

interface DashboardWidgetsProps {
  player: PlayerData;
  onOpenDailyCalendar?: () => void;
}

const DashboardWidgets: React.FC<DashboardWidgetsProps> = ({
  player,
  onOpenDailyCalendar,
}) => {
  const isClaimed = player.lastLoginDate === new Date().toISOString().split('T')[0];

  return (
    <div className="grid grid-cols-1 gap-4 mb-6">
      {/* Daily Login Widget */}
      <button
        onClick={!isClaimed ? onOpenDailyCalendar : undefined}
        className={`w-full relative rounded-2xl overflow-hidden h-[90px] flex items-center gap-4 px-5 text-left group transition-all duration-300 ${isClaimed ? 'cursor-default' : ''}`}
        style={{
          border: isClaimed ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(234,179,8,0.4)',
          background: isClaimed ? 'rgba(255,255,255,0.03)' : 'rgba(234,179,8,0.08)',
        }}
        onMouseEnter={e => {
          if (!isClaimed) e.currentTarget.style.borderColor = 'rgba(234,179,8,0.6)';
        }}
        onMouseLeave={e => {
          if (!isClaimed) e.currentTarget.style.borderColor = 'rgba(234,179,8,0.4)';
        }}
      >
        <div className={`absolute inset-0 bg-gradient-to-r ${isClaimed ? 'from-black/60' : 'from-yellow-900/20'} to-transparent`} />
        
        {/* Icon */}
        <div className="relative z-10 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ 
            background: isClaimed ? 'rgba(255,255,255,0.05)' : 'rgba(234,179,8,0.2)', 
            border: isClaimed ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(234,179,8,0.5)'
          }}
        >
          {isClaimed ? (
            <Check size={18} className="text-gray-400" />
          ) : (
            <Calendar size={18} className="text-yellow-400 animate-pulse" />
          )}
        </div>

        {/* Text */}
        <div className="relative z-10 flex-1">
          <div className="flex items-center gap-2">
            <div className={`text-xs font-black uppercase tracking-wider ${isClaimed ? 'text-gray-400' : 'text-yellow-400'}`}>
              Daily Login
            </div>
            {player.streak > 0 && (
              <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-black/40 border border-white/10">
                <Flame size={10} className="text-orange-500 fill-orange-500" />
                <span className="text-[9px] font-mono font-bold text-orange-400">{player.streak}</span>
              </div>
            )}
          </div>
          <div className={`text-[10px] font-mono tracking-widest mt-0.5 ${isClaimed ? 'text-gray-600' : 'text-yellow-200/80'}`}>
            {isClaimed ? '// STREAK SECURED' : '// REWARD AVAILABLE'}
          </div>
        </div>

        {/* Status Indicator */}
        {!isClaimed && (
          <div className="relative z-10 w-2 h-2 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.8)] animate-ping" />
        )}
      </button>
    </div>
  );
};

export default DashboardWidgets;
