
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Skull, Plus, X, Eye } from 'lucide-react';
import { AwakeningData } from '../types';

interface AwakeningViewProps {
  data: AwakeningData;
  updateData: (type: 'vision' | 'antiVision', items: string[]) => void;
}

const AwakeningView: React.FC<AwakeningViewProps> = ({ data, updateData }) => {
  const [newVision, setNewVision] = useState('');
  const [newAntiVision, setNewAntiVision] = useState('');
  const [focusedItem, setFocusedItem] = useState<{ text: string, type: 'vision' | 'antiVision' } | null>(null);
  const [focusTimer, setFocusTimer] = useState(5);

  const handleAdd = (type: 'vision' | 'antiVision') => {
    const text = type === 'vision' ? newVision : newAntiVision;
    if (!text.trim()) return;

    const currentList = type === 'vision' ? data.vision : data.antiVision;
    updateData(type, [...currentList, text]);

    if (type === 'vision') setNewVision('');
    else setNewAntiVision('');
  };

  const handleRemove = (type: 'vision' | 'antiVision', index: number) => {
    const currentList = type === 'vision' ? data.vision : data.antiVision;
    const newList = currentList.filter((_, i) => i !== index);
    updateData(type, newList);
  };

  // Focus Mode Timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>; // Fixed: Explicit Type compatible with browser
    if (focusedItem) {
      setFocusTimer(5);
      interval = setInterval(() => {
        setFocusTimer(prev => {
          if (prev <= 1) {
            setFocusedItem(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [focusedItem]);

  return (
    <div className="relative min-h-[70vh] flex flex-col md:flex-row gap-6">
      
      {/* LEFT COLUMN: THE MONARCH (VISION) */}
      <div className="flex-1 bg-system-card/50 border border-system-neon/20 rounded-xl overflow-hidden flex flex-col relative group hover:border-system-neon/50 transition-colors">
        <div className="absolute top-0 left-0 w-full h-1 bg-system-neon shadow-[0_0_10px_#00d2ff]" />
        
        <div className="p-6 border-b border-system-border/50 bg-system-neon/5">
           <h2 className="text-2xl font-bold text-white font-mono flex items-center gap-3">
             <Crown className="text-system-neon" /> THE MONARCH
           </h2>
           <p className="text-xs text-system-neon/70 font-mono mt-1">YOUR ASCENDED SELF</p>
        </div>

        <div className="p-6 flex-1 space-y-3">
           {data.vision.map((item, idx) => (
             <motion.div 
               key={`vis-${idx}`}
               initial={{ opacity: 0, x: -10 }}
               animate={{ opacity: 1, x: 0 }}
               className="group/item flex items-center justify-between p-3 bg-black/40 border border-system-border rounded hover:border-system-neon/50 cursor-pointer transition-all"
               onClick={() => setFocusedItem({ text: item, type: 'vision' })}
             >
                <div className="flex items-center gap-3">
                   <div className="w-1.5 h-1.5 rounded-full bg-system-neon shadow-[0_0_5px_#00d2ff]" />
                   <span className="text-sm text-gray-300 font-mono group-hover/item:text-white transition-colors">{item}</span>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleRemove('vision', idx); }}
                  className="opacity-0 group-hover/item:opacity-100 text-gray-600 hover:text-red-500 transition-all"
                >
                  <X size={14} />
                </button>
             </motion.div>
           ))}

           <div className="flex gap-2 mt-4 pt-4 border-t border-system-border/30">
              <input 
                value={newVision}
                onChange={e => setNewVision(e.target.value)}
                placeholder="Declare a new ambition..."
                className="flex-1 bg-black/50 border border-system-border rounded px-3 py-2 text-xs text-white focus:border-system-neon focus:outline-none font-mono"
                onKeyDown={(e) => e.key === 'Enter' && handleAdd('vision')}
              />
              <button 
                onClick={() => handleAdd('vision')}
                className="bg-system-neon/10 text-system-neon border border-system-neon/30 rounded px-3 hover:bg-system-neon hover:text-black transition-colors"
              >
                <Plus size={16} />
              </button>
           </div>
        </div>
      </div>

      {/* RIGHT COLUMN: THE SHADOW (ANTI-VISION) */}
      <div className="flex-1 bg-system-card/50 border border-system-danger/20 rounded-xl overflow-hidden flex flex-col relative group hover:border-system-danger/50 transition-colors">
        <div className="absolute top-0 left-0 w-full h-1 bg-system-danger shadow-[0_0_10px_#ef4444]" />
        
        <div className="p-6 border-b border-system-border/50 bg-system-danger/5">
           <h2 className="text-2xl font-bold text-white font-mono flex items-center gap-3">
             <Skull className="text-system-danger" /> THE SHADOW
           </h2>
           <p className="text-xs text-system-danger/70 font-mono mt-1">THE FATE YOU MUST ESCAPE</p>
        </div>

        <div className="p-6 flex-1 space-y-3">
           {data.antiVision.map((item, idx) => (
             <motion.div 
               key={`anti-${idx}`}
               initial={{ opacity: 0, x: 10 }}
               animate={{ opacity: 1, x: 0 }}
               className="group/item flex items-center justify-between p-3 bg-black/40 border border-system-border rounded hover:border-system-danger/50 cursor-pointer transition-all"
               onClick={() => setFocusedItem({ text: item, type: 'antiVision' })}
             >
                <div className="flex items-center gap-3">
                   <div className="w-1.5 h-1.5 rounded-full bg-system-danger shadow-[0_0_5px_#ef4444]" />
                   <span className="text-sm text-gray-300 font-mono group-hover/item:text-white transition-colors">{item}</span>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleRemove('antiVision', idx); }}
                  className="opacity-0 group-hover/item:opacity-100 text-gray-600 hover:text-red-500 transition-all"
                >
                  <X size={14} />
                </button>
             </motion.div>
           ))}

           <div className="flex gap-2 mt-4 pt-4 border-t border-system-border/30">
              <input 
                value={newAntiVision}
                onChange={e => setNewAntiVision(e.target.value)}
                placeholder="Identify a fear..."
                className="flex-1 bg-black/50 border border-system-border rounded px-3 py-2 text-xs text-white focus:border-system-danger focus:outline-none font-mono"
                onKeyDown={(e) => e.key === 'Enter' && handleAdd('antiVision')}
              />
              <button 
                onClick={() => handleAdd('antiVision')}
                className="bg-system-danger/10 text-system-danger border border-system-danger/30 rounded px-3 hover:bg-system-danger hover:text-black transition-colors"
              >
                <Plus size={16} />
              </button>
           </div>
        </div>
      </div>

      {/* FOCUS MODE OVERLAY */}
      <AnimatePresence>
        {focusedItem && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md cursor-pointer"
            onClick={() => setFocusedItem(null)}
          >
             <div className="relative max-w-4xl p-10 text-center">
                <motion.div 
                  className={`absolute inset-0 blur-[100px] opacity-30 ${focusedItem.type === 'vision' ? 'bg-system-neon' : 'bg-system-danger'}`}
                  animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                  transition={{ duration: 4, repeat: Infinity }}
                />
                
                <h3 className={`text-xl font-mono mb-6 tracking-[0.5em] ${focusedItem.type === 'vision' ? 'text-system-neon' : 'text-system-danger'}`}>
                   {focusedItem.type === 'vision' ? 'MANIFEST YOUR REALITY' : 'REJECT THIS FATE'}
                </h3>
                
                <motion.h1 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-4xl md:text-6xl font-bold text-white font-mono leading-tight"
                >
                  "{focusedItem.text}"
                </motion.h1>

                <div className="mt-12 flex flex-col items-center gap-2">
                   <Eye className={`w-8 h-8 ${focusedItem.type === 'vision' ? 'text-system-neon' : 'text-system-danger'} animate-pulse`} />
                   <div className="text-xs text-gray-500 font-mono">
                      VISUALIZE FOR {focusTimer}s
                   </div>
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AwakeningView;
