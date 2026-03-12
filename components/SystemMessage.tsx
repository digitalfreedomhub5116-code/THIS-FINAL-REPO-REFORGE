import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle, Shield, Zap, Info, Coins } from 'lucide-react';
import { SystemNotification, NotificationType } from '../types';

interface SystemMessageProps {
  notifications: SystemNotification[];
  removeNotification: (id: string) => void;
}

const SystemMessage: React.FC<SystemMessageProps> = ({ notifications, removeNotification }) => {
  
  const getStyles = (type: NotificationType) => {
    switch(type) {
      case 'SUCCESS':
        return 'border-system-success bg-system-success/10 text-system-success';
      case 'WARNING':
        return 'border-system-warning bg-system-warning/10 text-system-warning';
      case 'DANGER':
        return 'border-system-danger bg-system-danger/10 text-system-danger';
      case 'LEVEL_UP':
        return 'border-system-accent bg-system-accent/10 text-system-accent shadow-[0_0_15px_#8b5cf6]';
      case 'PURCHASE':
        return 'border-yellow-500 bg-yellow-500/10 text-yellow-500 shadow-[0_0_15px_#eab308]';
      case 'SYSTEM':
      default:
        return 'border-system-neon bg-system-neon/10 text-system-neon';
    }
  };

  const getIcon = (type: NotificationType) => {
    switch(type) {
      case 'SUCCESS': return <CheckCircle size={18} />;
      case 'WARNING': return <AlertTriangle size={18} />;
      case 'DANGER': return <Shield size={18} />;
      case 'LEVEL_UP': return <Zap size={18} />;
      case 'PURCHASE': return <Coins size={18} />;
      case 'SYSTEM': return <Info size={18} />;
    }
  };

  return (
    <div className="fixed top-20 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {notifications.map((note) => (
          <motion.div
            key={note.id}
            initial={{ x: 100, opacity: 0, skewX: -10 }}
            animate={{ x: 0, opacity: 1, skewX: 0 }}
            exit={{ 
              x: 50, 
              opacity: 0, 
              skewX: 20, 
              filter: "blur(10px)",
              transition: { duration: 0.3 } 
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className={`pointer-events-auto max-w-sm w-full border-l-4 rounded-r px-4 py-3 shadow-lg backdrop-blur-md flex items-start gap-3 font-mono text-sm relative overflow-hidden ${getStyles(note.type)}`}
            onClick={() => removeNotification(note.id)}
          >
            {/* Scanline Effect */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent opacity-20 animate-pulse pointer-events-none" />
            
            <div className="mt-0.5 shrink-0">
              {getIcon(note.type)}
            </div>
            <div>
              <div className="font-bold text-xs opacity-70 mb-0.5 tracking-wider">
                [{note.type}]
              </div>
              <div className="leading-tight drop-shadow-md">
                {note.message}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default SystemMessage;