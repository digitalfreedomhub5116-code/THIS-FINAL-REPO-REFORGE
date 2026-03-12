import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Crown, ArrowUp, ArrowDown, Minus, Target as TargetIcon, Activity, Sparkles } from 'lucide-react';
import { PlayerData } from '../types';

interface RankingViewProps {
  currentPlayer: PlayerData;
}

type Trend = 'UP' | 'DOWN' | 'SAME';

// Extended Interface for internal logic
interface LeaderboardEntry {
  id: string;
  name: string;
  isPlayer: boolean;
  xp: number;
  avatarColor: string;
  grindPower: number; // Used as base potential multiplier
  lastRank: number; 
  trend: Trend; 
  status: 'GRINDING' | 'RESTING' | 'OVERDRIVE';
  tier: number; // 1-15, determines XP Band cap
}

const ROSTER_SIZE = 15;
const BOT_NAMES = [
    "Arjun", "Reyansh", "Vihaan", "Aditya", "Ishaan", "Shaurya", "Aarav", 
    "Kabir", "Riyan", "Vivaan", "Anaya", "Saanvi", "Aadya", "Kiara", "Diya"
];

// XP BANDS CONFIGURATION
const XP_BANDS = [
    { tier: 1, min: 5600, max: 6210 }, 
    { tier: 2, min: 5200, max: 5590 }, 
    { tier: 3, min: 4800, max: 5190 }, 
    { tier: 6, min: 4200, max: 4790 }, 
    { tier: 10, min: 3000, max: 4190 }, 
    { tier: 15, min: 1000, max: 2990 } 
];

const getBandMax = (tier: number) => {
    const band = XP_BANDS.find(b => tier <= b.tier);
    return band ? band.max : 2990;
};

const getHunterClass = (rank: number) => {
    if (rank === 1) return "S-RANK MONARCH";
    if (rank <= 3) return "NATIONAL LEVEL";
    if (rank <= 7) return "A-RANK ELITE";
    return "RANK-B HUNTER";
};

const RankingView: React.FC<RankingViewProps> = ({ currentPlayer }) => {
  const username = currentPlayer.username || 'User';
  const todayStr = new Date().toISOString().split('T')[0];
  
  // Storage Keys
  const CONFIG_KEY = `shadow_arena_config_${username}`; // Persists identities & long-term stats
  const DAILY_KEY = `shadow_arena_daily_${username}_${todayStr}`; // Persists today's XP

  const [roster, setRoster] = useState<LeaderboardEntry[]>([]);
  const [isReady, setIsReady] = useState(false);
  const simInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- INITIALIZATION ---
  useEffect(() => {
    const now = Date.now();
    
    // 1. Load Long-term Config (Identities, Motivation Stats)
    let config = {
        bots: [] as Partial<LeaderboardEntry>[],
        lastTop3Timestamp: 0,
        wasTop3Yesterday: false,
        lastLoginDate: ''
    };
    
    try {
        const savedConfig = localStorage.getItem(CONFIG_KEY);
        if (savedConfig) config = JSON.parse(savedConfig);
    } catch (e) { console.error("Config Load Error", e); }

    // 2. Daily Reset Logic check
    if (config.lastLoginDate !== todayStr) {
        config.lastLoginDate = todayStr;
        localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    }

    // 3. Load Daily State
    let dailyData: { xpMap: Record<string, number>, lastUpdated: number } | null = null;
    try {
        const savedDaily = localStorage.getItem(DAILY_KEY);
        if (savedDaily) dailyData = JSON.parse(savedDaily);
    } catch (e) { console.error("Daily Load Error", e); }

    // 4. Generate Roster
    let currentRoster: LeaderboardEntry[] = [];
    
    // If no bots in config, generate them
    if (!config.bots || config.bots.length === 0) {
        const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
        const shuffledNames = [...BOT_NAMES].sort(() => 0.5 - Math.random());
        
        config.bots = shuffledNames.slice(0, ROSTER_SIZE - 1).map((name, i) => ({
            id: `bot_${name}`,
            name,
            isPlayer: false,
            avatarColor: colors[i % colors.length],
            grindPower: 1, 
            tier: i + 1, 
        }));
        localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    }

    // Merge Config with Daily XP
    currentRoster = config.bots.map((bot) => {
        // Base XP: Random between 300 and 400 (multiples of 10)
        // 300 + (0..10 * 10)
        const randomStart = 300 + (Math.floor(Math.random() * 11) * 10);
        const startXp = dailyData ? (dailyData.xpMap[bot.id!] || randomStart) : randomStart;
        const tier = bot.tier ?? 15;
        
        return {
            id: bot.id!,
            name: bot.name!,
            isPlayer: false,
            xp: startXp,
            avatarColor: bot.avatarColor!,
            grindPower: tier === 1 ? 1.5 : tier <= 3 ? 1.3 : 1.1,
            tier: tier,
            lastRank: 0,
            trend: 'SAME',
            status: 'GRINDING'
        } as LeaderboardEntry;
    });

    // Add Player
    currentRoster.push({
        id: 'player_main',
        name: currentPlayer.username || 'You',
        isPlayer: true,
        xp: currentPlayer.dailyXp || 0,
        avatarColor: '#00d2ff',
        grindPower: 0,
        tier: 0, 
        lastRank: ROSTER_SIZE,
        trend: 'SAME',
        status: 'GRINDING'
    });

    // 5. Offline Catch-up (Simulate missed time)
    if (dailyData) {
        const secondsPassed = (now - dailyData.lastUpdated) / 1000;
        if (secondsPassed > 60) {
            const catchUpTicks = Math.floor(secondsPassed / 30); // 30s virtual ticks
            const cappedTicks = Math.min(catchUpTicks, 120); // Max 1 hour catchup
            
            currentRoster.forEach(bot => {
                if (!bot.isPlayer) {
                    // Simulating integer gains
                    let gain = 0;
                    for(let i=0; i<cappedTicks; i++) {
                        if(Math.random() > 0.4) gain += 10; // Simple catchup logic
                    }
                    const max = getBandMax(bot.tier);
                    bot.xp = Math.min(max, bot.xp + gain);
                }
            });
        }
    }

    // Initial Sort
    const sorted = sortAndLabel(currentRoster);
    setRoster(sorted);
    setIsReady(true);
  }, [currentPlayer.username, currentPlayer.dailyXp]);

  // --- AUTO SCROLL ---
  useEffect(() => {
      if (isReady) {
          // Delay slightly to ensure render cycle finishes
          setTimeout(() => {
              const playerEl = document.getElementById('current-player-card');
              if (playerEl) {
                  playerEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
          }, 500);
      }
  }, [isReady]);

  // --- SAVE STATE ---
  const saveDaily = (data: LeaderboardEntry[]) => {
      const xpMap: Record<string, number> = {};
      data.forEach(d => { if(!d.isPlayer) xpMap[d.id] = d.xp; });
      localStorage.setItem(DAILY_KEY, JSON.stringify({
          xpMap,
          lastUpdated: Date.now()
      }));
  };

  const sortAndLabel = (data: LeaderboardEntry[]): LeaderboardEntry[] => {
    const sorted = [...data].sort((a, b) => b.xp - a.xp);
    return sorted.map((entry, index) => {
      const currentRank = index + 1;
      const prevRank = entry.lastRank || currentRank;
      
      let newTrend: Trend = 'SAME';
      if (currentRank < prevRank) newTrend = 'UP';
      else if (currentRank > prevRank) newTrend = 'DOWN';

      return {
          ...entry,
          trend: newTrend,
          lastRank: currentRank,
          status: entry.isPlayer ? 'GRINDING' : (entry.status === 'OVERDRIVE' ? 'OVERDRIVE' : (Math.random() > 0.7 ? 'GRINDING' : 'RESTING'))
      };
    });
  };

  // --- SIMULATION ENGINE (Every 10s) ---
  useEffect(() => {
    if (!isReady) return;

    simInterval.current = setInterval(() => {
      setRoster(prev => {
        // Player XP Sync
        const playerXp = currentPlayer.dailyXp || 0; 

        // 1. Analyze Current State for Rubber Banding Logic
        // We create a temporary sorted list to understand ranks *before* applying updates
        const tempSorted = [...prev].map(p => p.isPlayer ? { ...p, xp: playerXp } : p).sort((a, b) => b.xp - a.xp);
        const playerRank = tempSorted.findIndex(p => p.isPlayer) + 1;
        
        // Find the highest ranked bot (Rival)
        const topBot = tempSorted.find(p => !p.isPlayer);
        
        let rubberBandMode = false;
        
        // TRIGGER: If Player is #1 and has > 600 XP lead on the top bot
        if (playerRank === 1 && topBot) {
            const gap = playerXp - topBot.xp;
            if (gap > 600) {
                rubberBandMode = true;
            }
        }

        const next = prev.map(bot => {
          if (bot.isPlayer) {
              return { ...bot, xp: playerXp };
          }

          let change = 0;
          const roll = Math.random();
          let currentStatus = bot.status;

          // --- DYNAMIC LOGIC ---
          // If Rubber Band is active AND bot is high tier (Top 5 capability), they go into overdrive
          if (rubberBandMode && bot.tier <= 5) {
              currentStatus = 'OVERDRIVE';
              // Massive boost to catch up: 50 to 250 XP per tick
              const surge = 50 + Math.floor(Math.random() * 200); 
              change = surge;
          } 
          // Standard Logic
          else {
              // Reset status if they were in overdrive but player is no longer #1 with huge lead
              if (currentStatus === 'OVERDRIVE') currentStatus = 'GRINDING';

              // 50% Chance to GAIN XP
              if (roll < 0.50) {
                  // Gain: 10, 20, 30
                  const base = (Math.floor(Math.random() * 3) + 1) * 10;
                  change = Math.round((base * bot.grindPower) / 10) * 10;
              } 
              // 30% Chance to LOSE XP (Minus Logic)
              else if (roll < 0.80) {
                  change = -(Math.floor(Math.random() * 2) + 1) * 10;
              }
              // 20% No Change

              // Gravity System: If very close to player, slightly biased to create competition
              const distToPlayer = Math.abs(bot.xp - playerXp);
              if (distToPlayer <= 20) {
                  if (Math.random() > 0.5) change += 10;
                  else change -= 10;
              }
          }

          // XP Band Clamping
          let max = getBandMax(bot.tier);
          
          // CRITICAL: If in Overdrive, ignore the band cap so they can actually chase the player
          if (rubberBandMode && bot.tier <= 5) {
              max = playerXp + 500; // Allow them to potentially pass the player
          }

          let newXp = bot.xp + change;
          
          if (newXp > max) newXp = max;
          if (newXp < 0) newXp = 0;

          return {
              ...bot,
              xp: newXp,
              status: currentStatus
          };
        });

        const newSorted = sortAndLabel(next);
        saveDaily(newSorted);
        return newSorted;
      });
    }, 10000); // 10s Tick

    return () => { if (simInterval.current) clearInterval(simInterval.current); };
  }, [isReady, currentPlayer.dailyXp]);

  // --- RENDER HELPERS ---
  const playerRank = roster.findIndex(u => u.isPlayer) + 1;
  const rival = playerRank > 1 ? roster[playerRank - 2] : null;

  return (
    <div className="h-full flex flex-col max-w-4xl mx-auto w-full px-2 font-mono selection:bg-system-neon">
       
       {/* HEADER */}
       <div className="bg-system-card border border-system-border p-4 md:p-6 mb-4 md:mb-8 rounded-2xl shadow-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6">
          <div className="absolute inset-0 bg-gradient-to-br from-system-neon/5 to-transparent pointer-events-none" />
          <div className="flex items-center gap-3 md:gap-4 relative z-10">
              <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center">
                  <Trophy className="text-yellow-500 w-full h-full" />
              </div>
              <div>
                  <h1 className="text-xl md:text-3xl font-black text-white tracking-tighter uppercase">SHADOW ARENA</h1>
                  <p className="text-[8px] md:text-[10px] text-gray-500 tracking-[0.3em] uppercase">Global Ranking Engine // Live Sync</p>
              </div>
          </div>

          {rival && (
              <div className="bg-red-950/20 border border-red-900/40 p-2 md:p-3 rounded-xl flex items-center gap-3 md:gap-4 relative z-10 w-full md:w-auto">
                  <div className="flex flex-col items-center shrink-0">
                      <TargetIcon className="text-red-600 animate-pulse w-4 h-4 md:w-5 md:h-5" />
                      <span className="text-[8px] text-red-700 font-bold uppercase mt-1">Target</span>
                  </div>
                  <div className="min-w-0">
                      <div className="text-[8px] md:text-[9px] text-red-400 uppercase font-bold truncate">RIVAL: {rival.name}</div>
                      <div className="text-sm md:text-lg font-black text-white leading-none">
                        -{rival.xp - (currentPlayer.dailyXp || 0)} <span className="text-[8px] md:text-[10px] text-gray-600">XP</span>
                      </div>
                  </div>
              </div>
          )}
       </div>

       {/* ARENA LIST */}
       <div className="flex-1 space-y-3 md:space-y-4 relative pb-20">
          <AnimatePresence mode="popLayout">
            {roster.map((user, idx) => {
                const rank = idx + 1;
                const isMe = user.isPlayer;
                const isAscending = user.trend === 'UP';

                return (
                    <motion.div
                      key={user.id}
                      id={isMe ? "current-player-card" : undefined}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ 
                        opacity: 1, 
                        scale: isAscending ? 1.05 : 1,
                        zIndex: isAscending ? 100 : 10,
                        y: 0 
                      }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ 
                        layout: { 
                            type: "spring", 
                            stiffness: 40, 
                            damping: 15, 
                            mass: 3 
                        },
                        scale: { duration: 0.6 },
                        opacity: { duration: 0.4 }
                      }}
                      className={`relative flex items-center justify-between p-3 md:p-5 rounded-2xl border transition-colors duration-700 ${
                          isMe ? 'border-system-neon bg-system-neon/10 ring-1 ring-system-neon/30 shadow-[0_0_30px_rgba(0,210,255,0.1)]' : 
                          'border-gray-800 bg-gray-900/40 hover:border-gray-700'
                      }`}
                    >
                        {/* ASCENSION GLOW EFFECT */}
                        {isAscending && (
                             <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: [0, 0.4, 0] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="absolute inset-0 bg-system-success/10 rounded-2xl pointer-events-none" 
                             />
                        )}

                        <div className="flex items-center gap-3 md:gap-6 z-10 overflow-hidden">
                            <div className="flex flex-col items-center w-6 md:w-8 shrink-0">
                                <motion.span 
                                    layout="position"
                                    className={`text-lg md:text-2xl font-black ${isMe ? 'text-system-neon' : 'text-gray-700'}`}
                                >
                                    {rank}
                                </motion.span>
                                {isAscending && <ArrowUp size={12} className="text-system-success mt-1" />}
                                {user.trend === 'DOWN' && <ArrowDown size={12} className="text-red-700 mt-1" />}
                                {user.trend === 'SAME' && <Minus size={12} className="text-gray-800 mt-1" />}
                            </div>

                            <div className="flex items-center gap-3 md:gap-4 min-w-0">
                                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center font-bold text-black text-lg md:text-xl shrink-0" style={{ backgroundColor: user.avatarColor }}>
                                    {user.name.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs md:text-sm font-bold truncate ${isMe ? 'text-system-neon' : 'text-white'}`}>{user.name.toUpperCase()}</span>
                                        {isMe && <span className="text-[8px] bg-system-neon text-black px-1.5 rounded font-black shrink-0">YOU</span>}
                                    </div>
                                    <div className="text-[8px] md:text-[9px] text-gray-500 font-bold uppercase tracking-widest truncate">{getHunterClass(rank)}</div>
                                    {isAscending && (
                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1 text-system-success text-[8px] font-black mt-1">
                                            <Sparkles size={10} /> ASCENDING
                                        </motion.div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="text-right z-10 shrink-0 ml-2">
                            <div className="flex items-center gap-2 md:gap-3 justify-end">
                                {rank <= 3 && <Crown className={rank === 1 ? "text-yellow-500" : "text-purple-500"} size={window.innerWidth < 768 ? 14 : 18} />}
                                <span className="text-base md:text-xl font-black text-white tabular-nums">{user.xp.toLocaleString()}</span>
                            </div>
                            <div className="text-[8px] text-gray-600 font-bold uppercase tracking-widest flex items-center gap-1 md:gap-2 justify-end">
                                <Activity size={10} className={user.status === 'OVERDRIVE' ? 'text-red-500 animate-bounce' : user.status === 'GRINDING' ? 'text-system-neon animate-pulse' : ''} />
                                {user.status}
                            </div>
                        </div>
                    </motion.div>
                );
            })}
          </AnimatePresence>
       </div>

       {/* FOOTER MARQUEE */}
       <div className="fixed bottom-0 left-0 w-full bg-black/95 border-t border-gray-800 h-10 overflow-hidden z-30">
            <div className="flex whitespace-nowrap animate-[marquee_20s_linear_infinite] font-mono text-[9px] text-gray-600 items-center h-full gap-10 md:gap-20">
                <span>SYSTEM STATUS: STABLE</span>
                <span>ARENA SYNC: LIVE</span>
                <span>CATCH-UP ENGINE: ACTIVE</span>
                <span>LIMIT BREAKER DETECTED</span>
                <span>SYSTEM STATUS: STABLE</span>
            </div>
            <style>{`
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
            `}</style>
       </div>
    </div>
  );
};

export default RankingView;