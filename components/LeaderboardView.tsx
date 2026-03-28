import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, ShieldAlert, Crosshair, Skull, Sparkles, RefreshCw, Zap, Flame, Infinity, FlaskConical, ScrollText } from 'lucide-react';
import { PlayerData } from '../types';
import { API_BASE } from '../lib/apiConfig';
import { getPlayerAuthHeaders } from '../lib/playerApi';
import { useWarfare } from '../hooks/useWarfare';
import { ShadowExtractionAnim, ShadowExchangeAnim, FortifyShieldAnim } from './WarfareAnimations';
import { useSystem } from '../hooks/useSystem';

interface LeaderboardEntry {
  username: string;
  name: string;
  total_xp: number;
  level: number;
  rank: string;
}

interface LeaderboardViewProps {
  player: PlayerData;
}

const RANK_COLORS: Record<string, string> = {
  E: '#78716c',
  D: '#c2410c',
  C: '#60a5fa',
  B: '#06b6d4',
  A: '#eab308',
  S: '#a855f7',
};

const LeaderboardView: React.FC<LeaderboardViewProps> = ({ player }) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [myRank, setMyRank] = useState<number | null>(null);
  
  // Warfare & Consumables
  const { consumeItem } = useSystem();
  const warfare = useWarfare(player.userId || 'local');
  const [activeAnim, setActiveAnim] = useState<'NONE' | 'EXTRACT' | 'EXCHANGE' | 'FORTIFY'>('NONE');
  
  // Interaction state
  const [expandedTarget, setExpandedTarget] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const res = await fetch(`${API_BASE}/api/leaderboard`, {
        credentials: 'include',
        headers: { ...getPlayerAuthHeaders() },
      });
      if (res.ok) {
        const data: LeaderboardEntry[] = await res.json();
        setEntries(data);
        const idx = data.findIndex(
          (e) => e.username === player.username || e.name === player.name
        );
        setMyRank(idx >= 0 ? idx + 1 : null);
      }
    } catch {
      // Offline fallback
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [player.username, player.name]);

  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(() => fetchLeaderboard(), 30_000);
    return () => clearInterval(interval);
  }, [fetchLeaderboard]);

  const getCalculatedDominance = (entry: LeaderboardEntry, isMe: boolean) => {
    let dominance = entry.total_xp || 0;
    
    if (isMe) {
      // Add local army buffs
      dominance += dominance * (warfare.armySize * 0.02);
      // Pvp debuffs on ME are purged by shields, but for now we only process debuffs WE cast on OTHERS.
    } else {
      // If we debuffed this target
      const isDebuffedByMe = warfare.activeDebuffs.some(d => d.id === (entry.username || entry.name));
      if (isDebuffedByMe) {
        dominance -= dominance * 0.15; // 15% reduction
      }
    }
    
    return Math.floor(dominance);
  };

  // Build simulated leaderboard based on current DOMINANCE (not just raw XP)
  const simulatedEntries = [...entries].map(e => {
    const isMe = e.username === player.username || e.name === player.name;
    return {
      ...e,
      isMe,
      dominance: getCalculatedDominance(e, isMe)
    };
  }).sort((a, b) => b.dominance - a.dominance);
  
  // Find real-time rank after simulation
  const myCurrentIndex = simulatedEntries.findIndex(e => e.isMe);
  const displayRank = myCurrentIndex >= 0 ? myCurrentIndex + 1 : (myRank || 999);

  // Actions
  const handleFortify = () => {
    if (warfare.isShielded) return; // Already shielded
    if (consumeItem('healthPotions', 1)) {
       warfare.activateShield();
       setActiveAnim('FORTIFY');
       setExpandedTarget(null);
    } else {
       // Out of potions (handled by generic useSystem if we wanted error popups)
    }
  };

  const handleExchange = (targetId: string) => {
    if (consumeItem('shadowScrolls', 1)) {
       warfare.castDebuff(targetId);
       setActiveAnim('EXCHANGE');
       setExpandedTarget(null);
    }
  };

  const handleExtract = () => {
    if (consumeItem('ultOrbs', 1)) {
       warfare.addShadow();
       setActiveAnim('EXTRACT');
       setExpandedTarget(null);
    }
  };

  const cons = player.consumables || { healthPotions: 0, shadowScrolls: 0, ultOrbs: 0 };

  return (
    <div className="w-full min-h-screen pb-32 font-mono relative bg-[#0a0a0a]">
      {/* Background Warfare FX */}
      <div className="fixed inset-0 pointer-events-none opacity-20" style={{ background: 'radial-gradient(circle at 50% 0%, rgba(168,85,247,0.15), transparent 70%)' }} />
      {warfare.isShielded && (
         <div className="fixed inset-0 pointer-events-none z-0 border-[8px] border-green-500/20 rounded-xl" style={{ boxShadow: 'inset 0 0 50px rgba(74,222,128,0.1)' }} />
      )}

      {/* Header */}
      <div className="relative z-10 px-5 pt-8 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-purple-500/10 border border-purple-500/30">
                <Skull size={24} className="text-purple-400" />
             </div>
             <div>
                <h1 className="text-2xl font-black text-white uppercase tracking-tighter drop-shadow-[0_2px_10px_rgba(168,85,247,0.5)]">
                   Shadow Arena
                </h1>
                <p className="text-[10px] text-gray-400 tracking-[0.2em] uppercase">Live Combat Zone</p>
             </div>
          </div>
          <button
            onClick={() => fetchLeaderboard(true)}
            className="w-10 h-10 flex items-center justify-center rounded-lg bg-white/5 border border-white/10"
          >
            <RefreshCw size={18} className={`text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Tactical Overview */}
        <div className="grid grid-cols-2 gap-3 mb-4">
           {/* My Dominance */}
           <div className="bg-white/5 border border-white/10 rounded-xl p-4 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/10 rounded-full blur-xl translate-x-1/2 -translate-y-1/2" />
               <div className="text-[10px] text-gray-500 tracking-widest uppercase mb-1">My Dominance</div>
               <div className="text-2xl font-black text-white tracking-tight flex items-baseline gap-2">
                 {myCurrentIndex >= 0 ? simulatedEntries[myCurrentIndex].dominance.toLocaleString() : '---'}
                 <span className="text-xs text-purple-400">Rank #{displayRank}</span>
               </div>
           </div>
           
           {/* Army Buff */}
           <div className="bg-white/5 border border-white/10 rounded-xl p-4 relative overflow-hidden">
               <div className="text-[10px] text-gray-500 tracking-widest uppercase mb-1">Shadow Army</div>
               <div className="text-2xl font-black text-white tracking-tight flex items-baseline gap-2">
                  {warfare.armySize}
                  <span className="text-xs text-blue-400">+{warfare.armySize * 2}%</span>
               </div>
           </div>
        </div>

        {/* Arsenal Status */}
        <div className="flex justify-between items-center bg-black/40 border border-gray-800 rounded-lg p-2 px-3">
            <span className="text-[10px] text-gray-500 uppercase tracking-widest">Arsenal</span>
            <div className="flex gap-4">
                <div className="flex items-center gap-1.5"><FlaskConical size={12} className="text-green-400" /><span className="text-xs text-white font-bold">{cons.healthPotions}</span></div>
                <div className="flex items-center gap-1.5"><ScrollText size={12} className="text-cyan-400" /><span className="text-xs text-white font-bold">{cons.shadowScrolls}</span></div>
                <div className="flex items-center gap-1.5"><Infinity size={12} className="text-purple-400" /><span className="text-xs text-white font-bold">{cons.ultOrbs}</span></div>
            </div>
        </div>
      </div>

      {/* Target List */}
      <div className="px-4 relative z-10 space-y-2">
         <div className="text-[10px] text-gray-500 tracking-widest uppercase ml-2 mb-2 flex items-center justify-between">
            <span>Target List</span>
            {warfare.isShielded && <span className="text-green-400 flex items-center gap-1"><ShieldAlert size={10} /> Active</span>}
         </div>

         {loading ? (
             <div className="text-center text-xs text-gray-600 py-10 tracking-widest">CALCULATING DOMINANCE...</div>
         ) : (
             <AnimatePresence>
                {simulatedEntries.map((entry, index) => {
                   const rColor = RANK_COLORS[entry.rank] || '#78716c';
                   const targetId = entry.username || entry.name;
                   const isExpanded = expandedTarget === targetId;
                   const isDebuffed = warfare.activeDebuffs.some(d => d.id === targetId);

                   return (
                     <motion.div
                       key={targetId}
                       layout
                       className={`rounded-xl border transition-all overflow-hidden ${entry.isMe ? 'bg-purple-900/10 border-purple-500/30 ring-1 ring-purple-500/20' : 'bg-black/40 border-gray-800'}`}
                     >
                        <div 
                          className="p-3 flex items-center gap-3 cursor-pointer"
                          onClick={() => setExpandedTarget(isExpanded ? null : targetId)}
                        >
                           {/* Position */}
                           <div className={`w-6 text-center text-sm font-black ${entry.isMe ? 'text-purple-400' : 'text-gray-500'}`}>
                             {index + 1}
                           </div>

                           {/* Identify */}
                           <div className="flex-1 min-w-0">
                               <div className="flex items-center gap-2">
                                  <span className={`text-sm font-bold truncate ${entry.isMe ? 'text-purple-300' : 'text-gray-200'} ${isDebuffed ? 'line-through text-red-400' : ''}`}>
                                     {targetId}
                                  </span>
                                  {entry.isMe && <span className="text-[9px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded font-black tracking-widest uppercase">YOU</span>}
                                  {isDebuffed && <Zap size={10} className="text-red-400" />}
                               </div>
                               <div className="text-[10px] text-gray-500 flex items-center gap-2 mt-0.5">
                                  <span>Lv.{entry.level}</span>
                                  <span className="flex items-center gap-0.5"><Flame size={9} /> {entry.dominance.toLocaleString()}</span>
                               </div>
                           </div>

                           {/* Rank Badge */}
                           <div className="text-xs font-black w-8 h-8 rounded bg-gray-900/50 flex items-center justify-center" style={{ color: rColor }}>
                               {entry.rank}
                           </div>
                        </div>

                        {/* Action Drawer */}
                        <AnimatePresence>
                           {isExpanded && (
                               <motion.div
                                 initial={{ height: 0, opacity: 0 }}
                                 animate={{ height: 'auto', opacity: 1 }}
                                 exit={{ height: 0, opacity: 0 }}
                                 className="border-t border-gray-800/50 bg-white/[0.02]"
                               >
                                  <div className="p-3 flex justify-evenly gap-2">
                                      {entry.isMe ? (
                                         <button 
                                           disabled={warfare.isShielded || cons.healthPotions < 1}
                                           onClick={handleFortify}
                                           className="flex-1 py-3 rounded-lg flex flex-col items-center justify-center gap-1 transition-colors disabled:opacity-30 disabled:cursor-not-allowed border border-green-500/20 bg-green-500/10 hover:bg-green-500/20 text-green-300"
                                         >
                                            <ShieldAlert size={16} />
                                            <span className="text-[9px] uppercase tracking-widest font-black font-mono">Fortify (1 Potion)</span>
                                         </button>
                                      ) : (
                                        <>
                                         {/* If Target is above us, we can Exchange/Steal */}
                                         {index < displayRank - 1 ? (
                                             <button 
                                               disabled={isDebuffed || cons.shadowScrolls < 1}
                                               onClick={() => handleExchange(targetId)}
                                               className="flex-1 py-3 rounded-lg flex flex-col items-center justify-center gap-1 transition-colors disabled:opacity-30 disabled:cursor-not-allowed border border-cyan-500/20 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300"
                                             >
                                                <Crosshair size={16} />
                                                <span className="text-[9px] uppercase tracking-widest font-black font-mono">Exchange (1 Scroll)</span>
                                             </button>
                                         ) : (
                                             <button 
                                               disabled={cons.ultOrbs < 1}
                                               onClick={handleExtract}
                                               className="flex-1 py-3 rounded-lg flex flex-col items-center justify-center gap-1 transition-colors disabled:opacity-30 disabled:cursor-not-allowed border border-purple-500/20 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300"
                                             >
                                                <Sparkles size={16} />
                                                <span className="text-[9px] uppercase tracking-widest font-black font-mono">Extract (1 Orb)</span>
                                             </button>
                                         )}
                                        </>
                                      )}
                                  </div>
                               </motion.div>
                           )}
                        </AnimatePresence>
                     </motion.div>
                   )
                })}
             </AnimatePresence>
         )}
      </div>

      {/* FX Overlays */}
      {activeAnim === 'EXTRACT' && <ShadowExtractionAnim onComplete={() => setActiveAnim('NONE')} />}
      {activeAnim === 'EXCHANGE' && <ShadowExchangeAnim onComplete={() => setActiveAnim('NONE')} />}
      {activeAnim === 'FORTIFY' && <FortifyShieldAnim onComplete={() => setActiveAnim('NONE')} />}
      
    </div>
  );
};

export default LeaderboardView;
