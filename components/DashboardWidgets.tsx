
import React from 'react';
import { Terminal } from 'lucide-react';
import { PlayerData } from '../types';

const CLOUDINARY = 'https://res.cloudinary.com/dcnqnbvp0/video/upload';

interface DashboardWidgetsProps {
  player: PlayerData;
  onOpenDuskChat?: () => void;
  unreadCount?: number;
  onAddRewards?: (gold: number, xp: number, keys: number) => void;
}

const DashboardWidgets: React.FC<DashboardWidgetsProps> = ({
  onOpenDuskChat,
  unreadCount = 0,
}) => {
  return (
    <div className="mb-6">
      <button
        onClick={onOpenDuskChat}
        className="w-full relative rounded-2xl overflow-hidden h-[90px] flex items-center gap-4 px-5 text-left group transition-all duration-300"
        style={{
          border: '1px solid rgba(0,210,255,0.2)',
          background: 'rgba(0,210,255,0.04)',
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(0,210,255,0.4)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(0,210,255,0.2)')}
      >
        <video
          autoPlay loop muted playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-25 group-hover:opacity-35 transition-opacity"
          src={`${CLOUDINARY}/f_auto,q_auto,w_600/v1770828792/Animate_the_blue_202602112220_fete1_dsjvdd.mp4`}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-transparent" />
        <div className="relative z-10 flex items-center gap-4 w-full">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(0,210,255,0.1)', border: '1px solid rgba(0,210,255,0.4)' }}
          >
            <Terminal size={18} className="text-system-neon" />
          </div>
          <div className="flex-1">
            <div className="text-xs font-black text-white uppercase tracking-wider">DUSK</div>
            <div className="text-[9px] text-system-neon font-mono tracking-widest">// ACCOUNTABILITY PARTNER</div>
          </div>
          {unreadCount > 0 && (
            <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-[10px] font-black text-white shadow-[0_0_10px_rgba(239,68,68,0.6)] animate-pulse">
              {unreadCount}
            </div>
          )}
        </div>
      </button>
    </div>
  );
};

export default DashboardWidgets;
