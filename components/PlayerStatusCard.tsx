import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, PolarRadiusAxis 
} from 'recharts';
import { ChevronLeft, ChevronRight, Terminal, Zap, X, Layers } from 'lucide-react';
import { PlayerData, CoreStats, Outfit, HistoryEntry } from '../types';
import MentorThoughtBox from './MentorThoughtBox';

// ── Tiered Scaling System ──
const TIER_SIZE = 40;
const MAX_TIERS = 5;
const TIER_NAMES = ['I', 'II', 'III', 'IV', 'V'];
const TIER_COLORS = ['#6b7280', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];
const XP_BUFF_MAP: Record<number, number> = { 1: 0, 2: 10, 3: 30, 4: 50, 5: 100 };

function getTierInfo(value: number) {
  const safeValue = typeof value === 'number' && !isNaN(value) ? value : 0;
  const clamped = Math.max(0, Math.min(safeValue, 200));
  if (clamped >= 200) return { tier: 5, progress: TIER_SIZE, tierName: 'V', pct: 1 };
  const tier = Math.min(MAX_TIERS, Math.floor(clamped / TIER_SIZE) + 1);
  const progress = clamped % TIER_SIZE;
  return { tier, progress, tierName: TIER_NAMES[tier - 1], pct: progress / TIER_SIZE };
}

// ── Dusk thought pool for ambient floating messages ──
const DUSK_THOUGHTS = [
  "Your discipline defines you.",
  "Weakness is a choice.",
  "The System watches. Always.",
  "Stronger today than yesterday.",
  "Pain is just XP in disguise.",
  "Consistency forges legends.",
  "Don't break the chain.",
  "Evolve or stagnate. Choose.",
  "Rest is earned, not given.",
  "The grind never lies.",
  "Your rivals aren't sleeping.",
  "One more rep. One more quest.",
  "Comfort is the enemy.",
  "Show me your resolve.",
  "Stagnation is death.",
];

interface PlayerStatusCardProps {
  player: PlayerData;
  equippedOutfit?: Outfit | null;
  mentorMessages: { id: string; text: string }[];
  onDismissMentorMessage: (id: string) => void;
  history: HistoryEntry[];
  onOpenDuskChat: () => void;
}

const PlayerStatusCard: React.FC<PlayerStatusCardProps> = ({ 
  player, 
  equippedOutfit,
  mentorMessages,
  onDismissMentorMessage,
  history,
  onOpenDuskChat
}) => {
  const [selectedDateIndex, setSelectedDateIndex] = useState<number>(3);
  const [showAllLevels, setShowAllLevels] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);

  // ── Chart Level-Up System ──
  const [displayedChartLevel, setDisplayedChartLevel] = useState<number | null>(null);
  const [pendingLevelUp, setPendingLevelUp] = useState(false);
  const [isLevelingUp, setIsLevelingUp] = useState(false);
  const [animMultiplier, setAnimMultiplier] = useState(1);
  const [levelUpParticles, setLevelUpParticles] = useState<{id: number; x: number; y: number; delay: number}[]>([]);
  const levelUpAnimRef = useRef<number | null>(null);

  useEffect(() => {
    if (weekOffset === 0) {
      setSelectedDateIndex(3);
    }
  }, [weekOffset]);

  // ── Radar animation state (dots → lines → fill) ──
  const [radarPhase, setRadarPhase] = useState<'dots' | 'lines' | 'fill' | 'complete'>('dots');
  const [visibleDots, setVisibleDots] = useState(0);
  const animKeyRef = useRef(0);

  useEffect(() => {
    animKeyRef.current++;
    const key = animKeyRef.current;
    setRadarPhase('dots');
    setVisibleDots(0);
    // Sequential dot reveal: 6 dots, 180ms apart
    const dotTimers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 1; i <= 6; i++) {
      dotTimers.push(setTimeout(() => {
        if (animKeyRef.current !== key) return;
        setVisibleDots(i);
      }, i * 180));
    }
    // After all dots, show lines
    dotTimers.push(setTimeout(() => {
      if (animKeyRef.current !== key) return;
      setRadarPhase('lines');
    }, 6 * 180 + 200));
    // After lines draw, show fill
    dotTimers.push(setTimeout(() => {
      if (animKeyRef.current !== key) return;
      setRadarPhase('fill');
    }, 6 * 180 + 700));
    // Mark complete
    dotTimers.push(setTimeout(() => {
      if (animKeyRef.current !== key) return;
      setRadarPhase('complete');
    }, 6 * 180 + 1200));
    return () => dotTimers.forEach(clearTimeout);
  }, [selectedDateIndex]);

  // ── Tier transition & point gain detection ──
  const prevStatsRef = useRef<CoreStats | null>(null);
  const [tierUpStats, setTierUpStats] = useState<Set<string>>(new Set());
  const [pointGainStats, setPointGainStats] = useState<Set<string>>(new Set());

  useEffect(() => {
    const prev = prevStatsRef.current;
    if (prev) {
      const statKeys: (keyof CoreStats)[] = ['strength', 'intelligence', 'focus', 'discipline', 'willpower', 'social'];
      const keyToLabel: Record<string, string> = { strength: 'STR', intelligence: 'INT', focus: 'FOC', discipline: 'DIS', willpower: 'WIL', social: 'SOC' };
      const newTierUps = new Set<string>();
      const newPointGains = new Set<string>();

      for (const key of statKeys) {
        const prevVal = prev[key] || 0;
        const curVal = player.stats[key] || 0;
        if (curVal > prevVal) {
          newPointGains.add(keyToLabel[key]);
          const prevTier = getTierInfo(prevVal).tier;
          const curTier = getTierInfo(curVal).tier;
          if (curTier > prevTier) {
            newTierUps.add(keyToLabel[key]);
          }
        }
      }

      if (newTierUps.size > 0) {
        setTierUpStats(newTierUps);
        setTimeout(() => setTierUpStats(new Set()), 3000);
      }
      if (newPointGains.size > 0) {
        setPointGainStats(newPointGains);
        setTimeout(() => setPointGainStats(new Set()), 1500);
      }
    }
    prevStatsRef.current = { ...player.stats };
  }, [player.stats]);

  // ── Ambient thought box spawning ──
  const [ambientMessages, setAmbientMessages] = useState<{id: string; text: string}[]>([]);
  const ambientTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const thoughtIndexRef = useRef(0);
  
  const spawnAmbientThought = useCallback(() => {
    const text = DUSK_THOUGHTS[thoughtIndexRef.current % DUSK_THOUGHTS.length];
    thoughtIndexRef.current++;
    const id = `ambient-${Date.now()}`;
    setAmbientMessages([{ id, text }]);
  }, []);

  useEffect(() => {
    // Spawn first thought after 3s, then every 12-20s
    const firstTimer = setTimeout(() => {
      spawnAmbientThought();
      const loop = () => {
        const delay = 12000 + Math.random() * 8000;
        ambientTimerRef.current = setTimeout(() => {
          spawnAmbientThought();
          loop();
        }, delay);
      };
      loop();
    }, 3000);
    return () => {
      clearTimeout(firstTimer);
      if (ambientTimerRef.current) clearTimeout(ambientTimerRef.current);
    };
  }, [spawnAmbientThought]);

  const dismissAmbient = useCallback((id: string) => {
    setAmbientMessages(prev => prev.filter(m => m.id !== id));
  }, []);

  // Merge mentor messages (event-driven) with ambient ones
  // Priority: mentor messages override ambient
  const activeMessages = mentorMessages.length > 0 ? mentorMessages : ambientMessages;
  const activeDismiss = mentorMessages.length > 0 ? onDismissMentorMessage : dismissAmbient;

  // Alternate position between top and bottom to avoid face
  const thoughtPosition = useMemo(() => {
    return thoughtIndexRef.current % 2 === 0 ? 'bottom' : 'top';
  }, [ambientMessages]);

  // ── History timeline (indexed by date string for calendar lookup) ──
  const historyMap = useMemo(() => {
    const map: Record<string, HistoryEntry> = {};
    const today = new Date().toISOString().split('T')[0];
    map[today] = {
      date: today,
      stats: player.stats,
      totalXp: player.totalXp,
      dailyXp: player.dailyXp,
      questCompletion: 0
    };
    for (const h of history) {
      if (!map[h.date]) map[h.date] = h;
    }
    return map;
  }, [player.stats, player.totalXp, player.dailyXp, history]);

  // Calendar days (7-day window based on weekOffset)
  const todayDate = useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d;
  }, []);
  const calendarDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(todayDate);
      d.setDate(todayDate.getDate() + weekOffset * 7 - 3 + i);
      return d;
    });
  }, [todayDate, weekOffset]);

  const selectedDate = calendarDays[selectedDateIndex] || todayDate;

  // ── Historical Comparison Ghosting ──
  const todayStats: CoreStats = useMemo(() => {
    const dateStr = todayDate.toISOString().split('T')[0];
    return historyMap[dateStr]?.stats || player.stats;
  }, [historyMap, todayDate, player.stats]);

  const activeStats: CoreStats = useMemo(() => {
    const dateStr = selectedDate.toISOString().split('T')[0];
    return historyMap[dateStr]?.stats || player.stats;
  }, [historyMap, selectedDate, player.stats]);
  
  const isViewingPast = selectedDate < todayDate;

  // Cumulative radar domain: chart shows 0–200 absolute stat values (tier labels still shown)
  const chartData = useMemo(() => {
    const raw = [
      { subject: 'STR', active: activeStats.strength, today: todayStats.strength },
      { subject: 'INT', active: activeStats.intelligence, today: todayStats.intelligence },
      { subject: 'FOC', active: activeStats.focus, today: todayStats.focus },
      { subject: 'DIS', active: activeStats.discipline, today: todayStats.discipline },
      { subject: 'WIL', active: activeStats.willpower, today: todayStats.willpower },
      { subject: 'SOC', active: activeStats.social, today: todayStats.social },
    ];
    return raw.map(s => {
      const info = getTierInfo(s.active);
      const todayInfo = getTierInfo(s.today);
      return {
        subject: s.subject,
        A: Math.max(0, Math.min(s.active, 200)) * animMultiplier,
        Today: Math.max(0, Math.min(s.today, 200)),
        fullMark: 200,
        tier: info.tier,
        tierName: info.tierName,
        rawValue: s.active,
        todayTier: todayInfo.tier,
      };
    });
  }, [activeStats, todayStats, animMultiplier]);

  // ── Overall Radar Level & Stat Details ──
  const statTierDetails = useMemo(() => {
    const stats = [
      { key: 'STR', label: 'Strength', val: activeStats.strength },
      { key: 'INT', label: 'Intelligence', val: activeStats.intelligence },
      { key: 'FOC', label: 'Focus', val: activeStats.focus },
      { key: 'DIS', label: 'Discipline', val: activeStats.discipline },
      { key: 'WIL', label: 'Willpower', val: activeStats.willpower },
      { key: 'SOC', label: 'Social', val: activeStats.social },
    ];
    return stats.map(s => ({ ...s, ...getTierInfo(s.val) }));
  }, [activeStats]);

  const computedChartLevel = useMemo(() => {
    return Math.min(...statTierDetails.map(s => s.tier));
  }, [statTierDetails]);

  // Initialize displayed chart level on first render; detect level-up thereafter
  useEffect(() => {
    if (displayedChartLevel === null) {
      setDisplayedChartLevel(computedChartLevel);
    } else if (computedChartLevel > displayedChartLevel && !isLevelingUp) {
      setPendingLevelUp(true);
    }
  }, [computedChartLevel, displayedChartLevel, isLevelingUp]);

  const effectiveChartLevel = displayedChartLevel ?? computedChartLevel;
  const xpBuffPercent = XP_BUFF_MAP[effectiveChartLevel] || 0;

  const handleLevelUp = useCallback(() => {
    if (!pendingLevelUp || isLevelingUp) return;
    setIsLevelingUp(true);
    setPendingLevelUp(false);

    const particles = Array.from({ length: 24 }, (_, i) => ({
      id: i,
      x: 15 + Math.random() * 70,
      y: 15 + Math.random() * 70,
      delay: Math.random() * 0.6,
    }));
    setLevelUpParticles(particles);

    const startTime = performance.now();
    const SHRINK = 800, PAUSE = 600, EXPAND = 800;
    let levelUpdated = false;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      if (elapsed < SHRINK) {
        const t = elapsed / SHRINK;
        setAnimMultiplier(1 - t * t);
      } else if (elapsed < SHRINK + PAUSE) {
        setAnimMultiplier(0);
        if (!levelUpdated) {
          setDisplayedChartLevel(computedChartLevel);
          levelUpdated = true;
        }
      } else if (elapsed < SHRINK + PAUSE + EXPAND) {
        const t = (elapsed - SHRINK - PAUSE) / EXPAND;
        setAnimMultiplier(1 - Math.pow(1 - t, 3));
      } else {
        setAnimMultiplier(1);
        setIsLevelingUp(false);
        setTimeout(() => setLevelUpParticles([]), 300);
        return;
      }
      levelUpAnimRef.current = requestAnimationFrame(tick);
    };
    levelUpAnimRef.current = requestAnimationFrame(tick);
  }, [pendingLevelUp, isLevelingUp, computedChartLevel]);

  useEffect(() => {
    return () => { if (levelUpAnimRef.current) cancelAnimationFrame(levelUpAnimRef.current); };
  }, []);

  const overallRadarLevel = effectiveChartLevel;

  // ── Dusk Contextual Voice (Tier-Aware) ──
  const duskContextVoice = useMemo(() => {
    const stats = [
      { name: 'strength', label: 'STR', val: player.stats.strength },
      { name: 'intelligence', label: 'INT', val: player.stats.intelligence },
      { name: 'focus', label: 'FOC', val: player.stats.focus },
      { name: 'discipline', label: 'DIS', val: player.stats.discipline },
      { name: 'willpower', label: 'WIL', val: player.stats.willpower },
      { name: 'social', label: 'SOC', val: player.stats.social },
    ];
    stats.sort((a, b) => a.val - b.val);
    const lowest = stats[0];
    const highest = stats[5];
    const lowestTier = getTierInfo(lowest.val);
    const highestTier = getTierInfo(highest.val);

    const nearBreak = stats.find(s => {
      const info = getTierInfo(s.val);
      return info.tier < MAX_TIERS && (TIER_SIZE - info.progress) <= 5;
    });

    const messages = [
      `Your ${lowest.name} is stuck at Tier ${lowestTier.tierName}. Break through.`,
      nearBreak
        ? `${nearBreak.label} is ${TIER_SIZE - getTierInfo(nearBreak.val).progress} points from the next Tier.`
        : `I see you've been building ${highest.name}. Don't neglect the rest.`,
      `The System requires balance. Focus on ${lowest.name}.`,
      `${highest.label} leads at Tier ${highestTier.tierName}. But ${lowest.label} falls behind.`,
      `I am waiting for your next command.`,
    ];

    const daySeed = new Date().getDate();
    return messages[daySeed % messages.length];
  }, [player.stats]);
  const dailyInsight = useMemo(() => {
    if (!historyMap) return "System initialized. Awaiting commands.";

    if (!isViewingPast) {
      const stats = [
        { name: 'STR', val: player.stats.strength },
        { name: 'INT', val: player.stats.intelligence },
        { name: 'FOC', val: player.stats.focus },
        { name: 'DIS', val: player.stats.discipline },
        { name: 'WIL', val: player.stats.willpower },
        { name: 'SOC', val: player.stats.social },
      ];

      // Tier breach events (highest priority)
      for (const s of stats) {
        if (tierUpStats.has(s.name)) {
          const info = getTierInfo(s.val);
          return `TIER BREACH: ${s.name} has reached Tier ${info.tierName}. New power unlocked.`;
        }
      }

      // Near-breakthrough warning (within 3 points)
      const nearBreak = stats.find(s => {
        const info = getTierInfo(s.val);
        return info.tier < MAX_TIERS && (TIER_SIZE - info.progress) <= 3;
      });
      if (nearBreak) {
        const info = getTierInfo(nearBreak.val);
        const remaining = TIER_SIZE - info.progress;
        return `${nearBreak.name} approaching Tier ${TIER_NAMES[info.tier]} boundary. ${remaining} point${remaining !== 1 ? 's' : ''} to breakthrough.`;
      }

      stats.sort((a, b) => b.val - a.val);
      const highest = stats[0];
      const lowest = stats[5];

      if (player.dailyXp > 500) return `Peak performance detected. Daily XP at ${player.dailyXp}.`;
      if (lowest.val < 15) return `Low ${lowest.name} detected. Recommend targeting ${lowest.name} protocols.`;
      return `Current focus: ${highest.name} [Tier ${getTierInfo(highest.val).tierName}]. Maintain momentum.`;
    }

    // Viewing past day
    const prevDate = new Date(selectedDate);
    prevDate.setDate(prevDate.getDate() - 1);
    const prevDateStr = prevDate.toISOString().split('T')[0];
    const prevStats = historyMap[prevDateStr]?.stats;

    if (!prevStats) {
      const xp = historyMap[selectedDate.toISOString().split('T')[0]]?.dailyXp || 0;
      return xp > 0 ? `Historical record: ${xp} XP gained.` : `Historical record analyzed.`;
    }

    const diffs = [
      { name: 'STR', diff: activeStats.strength - prevStats.strength },
      { name: 'INT', diff: activeStats.intelligence - prevStats.intelligence },
      { name: 'FOC', diff: activeStats.focus - prevStats.focus },
      { name: 'DIS', diff: activeStats.discipline - prevStats.discipline },
      { name: 'WIL', diff: activeStats.willpower - prevStats.willpower },
      { name: 'SOC', diff: activeStats.social - prevStats.social },
    ];
    diffs.sort((a, b) => b.diff - a.diff);
    const bestGrowth = diffs[0];

    if (bestGrowth.diff > 0) {
      return `${bestGrowth.name} +${bestGrowth.diff} on this day. Growth was accelerating.`;
    }
    return `Maintenance phase recorded on this day.`;
  }, [activeStats, historyMap, isViewingPast, player.stats, player.dailyXp, selectedDate, tierUpStats]);
  const introRef = useRef<HTMLVideoElement>(null);
  const loopRef = useRef<HTMLVideoElement>(null);
  const [videoPhase, setVideoPhase] = useState<'intro' | 'loop' | 'image'>('image');

  const hasVideo = !!(equippedOutfit?.introVideoUrl || equippedOutfit?.loopVideoUrl);

  useEffect(() => {
    if (!hasVideo) { setVideoPhase('image'); return; }
    const intro = introRef.current;
    const loop = loopRef.current;
    if (!intro || !loop) return;
    loop.pause();
    loop.currentTime = 0;
    if (equippedOutfit?.introVideoUrl) {
      intro.src = equippedOutfit.introVideoUrl;
      intro.load();
      setVideoPhase('intro');
      intro.play().catch(() => {
        if (equippedOutfit.loopVideoUrl) startLoop();
        else setVideoPhase('image');
      });
    } else if (equippedOutfit?.loopVideoUrl) {
      startLoop();
    }
  }, [equippedOutfit, hasVideo]);

  const startLoop = () => {
    const loop = loopRef.current;
    if (!loop) return;
    if (equippedOutfit?.loopVideoUrl) {
      loop.src = equippedOutfit.loopVideoUrl;
      loop.load();
      loop.loop = true;
      setVideoPhase('loop');
      loop.play().catch(() => setVideoPhase('image'));
    } else {
      setVideoPhase('image');
    }
  };

  useEffect(() => {
    const intro = introRef.current;
    if (!intro) return;
    const ended = () => startLoop();
    const error = () => startLoop();
    intro.addEventListener('ended', ended);
    intro.addEventListener('error', error);
    return () => {
      intro.removeEventListener('ended', ended);
      intro.removeEventListener('error', error);
    };
  }, []);

  return (
    <div className="w-full relative rounded-2xl overflow-hidden flex flex-col group border border-white/[0.06] shadow-[0_20px_60px_rgba(0,0,0,0.7)] bg-[#0A0A0F]">

      {/* --- TOP HEADER --- */}
      <div className="w-full flex items-center justify-between px-4 py-2 bg-gradient-to-b from-[#0A0A0F] to-transparent z-30 absolute top-0 left-0 right-0 pointer-events-none">
        <div className="flex items-center gap-2">
          <div className="w-1 h-3.5 bg-system-neon rounded-full shadow-[0_0_8px_#00d2ff]" />
          <h2 className="text-[10px] font-black tracking-[0.2em] text-white uppercase opacity-90 font-mono">Growth Terminal</h2>
        </div>
      </div>

      {/* --- TOP HEXAGONAL CALENDAR --- */}
      <div className="w-full border-b border-white/5 bg-[#0A0A0F] z-20 shrink-0 px-2 py-2 pt-9 relative">
        {/* Cybernetic Background grid behind calendar */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: `linear-gradient(rgba(0, 210, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 210, 255, 0.1) 1px, transparent 1px)`,
            backgroundSize: '20px 20px',
            maskImage: 'linear-gradient(to bottom, black, transparent)',
            WebkitMaskImage: 'linear-gradient(to bottom, black, transparent)',
          }}
        />
        {/* Month nav */}
        <div className="flex items-center justify-between px-1 pb-2">
          <button
            onClick={() => { setWeekOffset(o => o - 1); setSelectedDateIndex(3); }}
            className="w-6 h-6 rounded-full flex items-center justify-center active:scale-90 transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <ChevronLeft size={11} className="text-gray-400" />
          </button>
          <span className="text-[10px] font-black text-white font-mono tracking-[0.2em] uppercase">
            {calendarDays[3]?.toLocaleDateString('en-US', { month: 'long' })} {calendarDays[3]?.getFullYear()}
          </span>
          <button
            onClick={() => { setWeekOffset(o => o + 1); setSelectedDateIndex(3); }}
            className="w-6 h-6 rounded-full flex items-center justify-center active:scale-90 transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <ChevronRight size={11} className="text-gray-400" />
          </button>
        </div>
        {/* Hexagonal day strip with smooth scroll on hover/drag */}
        <div 
          className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory"
          style={{ scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch' }}
        >
          {calendarDays.map((day, idx) => {
            const isToday = day.toDateString() === todayDate.toDateString();
            const isSelected = selectedDateIndex === idx;
            const dateStr = day.toISOString().split('T')[0];
            const hasData = !!historyMap[dateStr];
            const isPast = day < todayDate;
            const dayLabel = ['SUN','MON','TUE','WED','THU','FRI','SAT'][day.getDay()];

            let borderColor = 'rgba(255,255,255,0.08)';
            let glowShadow = 'none';
            if (isSelected) { borderColor = '#00d2ff'; glowShadow = '0 0 10px rgba(0,210,255,0.4)'; }
            else if (isToday) { borderColor = 'rgba(0,210,255,0.4)'; }
            else if (hasData && isPast) { borderColor = 'rgba(34,197,94,0.3)'; }

            return (
              <button
                key={idx}
                onClick={() => setSelectedDateIndex(idx)}
                className="flex flex-col items-center gap-0.5 transition-all duration-200 snap-center min-w-[36px]"
              >
                {/* Hexagon */}
                <div
                  className="relative flex items-center justify-center transition-all duration-200"
                  style={{
                    width: 36, height: 40,
                  }}
                >
                  {/* Outer border hex */}
                  <div
                    className="absolute inset-0"
                    style={{
                      clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                      background: borderColor,
                    }}
                  />
                  {/* Inner hex to create the stroke effect */}
                  <div
                    className="absolute flex items-center justify-center"
                    style={{
                      inset: '1.5px',
                      clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                      background: isSelected ? 'rgba(0,210,255,0.25)' : 'rgba(8,8,18,1)',
                      boxShadow: glowShadow,
                    }}
                  >
                    <span
                      className="font-mono font-black text-xs leading-none"
                      style={{ color: isSelected ? '#ffffff' : isToday ? '#00d2ff' : hasData && isPast ? '#4ade80' : '#4b5563' }}
                    >
                      {day.getDate()}
                    </span>
                  </div>
                </div>
                {/* Day label */}
                <span
                  className="text-[7px] font-mono font-bold tracking-wider"
                  style={{ color: isSelected ? '#00d2ff' : isToday ? 'rgba(0,210,255,0.6)' : '#374151' }}
                >
                  {isToday ? 'TODAY' : dayLabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      
      {/* --- DAILY INSIGHTS BANNER --- */}
      <div className="w-full bg-[#0A0A0F]/80 border-b border-white/[0.02] flex items-center px-3 py-1.5 z-20 shrink-0 shadow-[0_4px_10px_rgba(0,0,0,0.2)]">
        <div className="flex items-center gap-2 w-full">
          <Zap size={10} className="text-[#00d2ff]" />
          <span className="text-[8px] font-mono text-[#00d2ff] uppercase font-bold tracking-widest shrink-0">SYS_LOG:</span>
          <motion.div 
            key={selectedDateIndex}
            initial={{ opacity: 0, x: 5 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-[9px] text-gray-400 font-mono truncate overflow-hidden"
          >
            {dailyInsight}
          </motion.div>
        </div>
      </div>

      {/* --- MAIN CONTENT (side by side) --- */}
      <div className="flex flex-row w-full relative flex-1 min-h-[350px] md:min-h-[400px]">
        
        {/* ── LEFT CONTAINER: RADAR CHART ── */}
        <div className="w-[45%] md:w-[42%] relative z-30 flex items-center justify-center shrink-0">

          {/* Chart oversized with left offset so labels stay on-screen, overlaps into video */}
          <div className="w-[145%] md:w-[135%] aspect-square absolute left-[2px] md:left-[4px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
                <PolarGrid stroke="rgba(255,255,255,0.06)" strokeWidth={1} gridType="polygon" radialLines={false} />
                <PolarAngleAxis 
                  dataKey="subject" 
                  tick={(props: any) => {
                    const { x, y, payload } = props;
                    const item = chartData.find((d: any) => d.subject === payload.value);
                    const tier = item?.tier || 1;
                    const tierName = item?.tierName || 'I';
                    const tierColor = TIER_COLORS[tier - 1];
                    return (
                      <g>
                        <text x={x} y={y - 4} textAnchor="middle" dominantBaseline="middle" fill="#00d2ff" fontSize={10} fontWeight={900} fontFamily="monospace">
                          {payload.value}
                        </text>
                        <text x={x} y={y + 9} textAnchor="middle" dominantBaseline="middle" fill={tierColor} fontSize={7} fontWeight={700} fontFamily="monospace" opacity={0.9}>
                          T{tierName}
                        </text>
                      </g>
                    );
                  }}
                />
                <PolarRadiusAxis 
                  domain={[0, 200]} 
                  tick={false} 
                  axisLine={false} 
                />
                
                {/* Historical Ghost Shape (Today's Stats) - Only visible when viewing past days */}
                {isViewingPast && (
                  <Radar
                    name="Today"
                    dataKey="Today"
                    stroke="rgba(255,255,255,0.3)"
                    strokeWidth={1}
                    fill="transparent"
                    strokeDasharray="3 3"
                    isAnimationActive={false}
                  />
                )}

                {/* Main Stats Shape */}
                <Radar 
                  name="Stats" 
                  dataKey="A" 
                  stroke={radarPhase === 'dots' ? 'transparent' : '#00d2ff'} 
                  strokeWidth={2} 
                  fill={radarPhase === 'complete' ? '#00d2ff' : 'transparent'} 
                  fillOpacity={radarPhase === 'complete' ? 0.2 : 0} 
                  isAnimationActive={false}
                  activeDot={false}
                  dot={((props: any) => {
                    const { cx, cy, index } = props;
                    const isVisible = index < visibleDots || radarPhase !== 'dots';
                    if (!cx || !cy) return null;
                    const subject = chartData[index]?.subject;
                    const hasTierUp = tierUpStats.has(subject);
                    const hasPointGain = pointGainStats.has(subject);
                    const ctr = 15;
                    return (
                      <svg x={cx - ctr} y={cy - ctr} width={ctr * 2} height={ctr * 2} className="overflow-visible" key={`dot-${index}`}>
                        {/* Tier-up burst rings */}
                        {hasTierUp && isVisible && (
                          <>
                            <circle cx={ctr} cy={ctr} r="4" fill="none" stroke="#f59e0b" strokeWidth="2">
                              <animate attributeName="r" values="4;20;24" dur="1.5s" fill="freeze" />
                              <animate attributeName="opacity" values="1;0.5;0" dur="1.5s" fill="freeze" />
                              <animate attributeName="stroke-width" values="2;1;0" dur="1.5s" fill="freeze" />
                            </circle>
                            <circle cx={ctr} cy={ctr} r="4" fill="none" stroke="#fbbf24" strokeWidth="1.5">
                              <animate attributeName="r" values="4;14;18" dur="1.2s" fill="freeze" />
                              <animate attributeName="opacity" values="0.8;0.3;0" dur="1.2s" fill="freeze" />
                            </circle>
                            <circle cx={ctr} cy={ctr} r="3" fill="#f59e0b" opacity="0">
                              <animate attributeName="opacity" values="0;0.8;0" dur="0.6s" fill="freeze" />
                            </circle>
                          </>
                        )}
                        {/* Point gain pulse */}
                        {hasPointGain && !hasTierUp && isVisible && (
                          <circle cx={ctr} cy={ctr} r="4" fill="none" stroke="#00d2ff" strokeWidth="1.5">
                            <animate attributeName="r" values="4;12;4" dur="0.8s" repeatCount="2" />
                            <animate attributeName="opacity" values="0.8;0.15;0.8" dur="0.8s" repeatCount="2" />
                          </circle>
                        )}
                        {/* Base dot */}
                        <circle cx={ctr} cy={ctr} r="3" fill={hasTierUp ? '#f59e0b' : '#fff'} opacity={isVisible ? 0.95 : 0}>
                          {isVisible && <animate attributeName="opacity" values="0;0.95" dur="0.2s" fill="freeze" />}
                        </circle>
                        {/* Ambient pulse ring */}
                        <circle cx={ctr} cy={ctr} r="5" fill="none" stroke={hasTierUp ? '#f59e0b' : '#00d2ff'} strokeWidth="1" opacity={isVisible ? 0.5 : 0}>
                          {isVisible && (
                            <>
                              <animate attributeName="r" values="5;8;5" dur="2s" repeatCount="indefinite" />
                              <animate attributeName="opacity" values="0.5;0.15;0.5" dur="2s" repeatCount="indefinite" />
                            </>
                          )}
                        </circle>
                      </svg>
                    );
                  }) as any}
                />
                <defs>
                  <linearGradient id="radarGradientV2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00d2ff" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#0055ff" stopOpacity={0.08} />
                  </linearGradient>
                </defs>
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Level Up Button Overlay */}
          <AnimatePresence>
            {pendingLevelUp && !isLevelingUp && (
              <motion.div
                className="absolute inset-0 z-40 flex items-center justify-center"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
              >
                <motion.button
                  onClick={handleLevelUp}
                  className="px-5 py-2.5 rounded-xl font-black font-mono text-sm uppercase tracking-wider border-2 cursor-pointer"
                  style={{
                    background: 'linear-gradient(135deg, rgba(34,197,94,0.9), rgba(22,163,74,0.9))',
                    color: '#fff',
                    borderColor: 'rgba(74,222,128,0.6)',
                    boxShadow: '0 0 30px rgba(34,197,94,0.5), 0 0 60px rgba(34,197,94,0.2)',
                    textShadow: '0 0 10px rgba(255,255,255,0.5)',
                  }}
                  animate={{ scale: [1, 1.05, 1], boxShadow: ['0 0 30px rgba(34,197,94,0.5)', '0 0 50px rgba(34,197,94,0.8)', '0 0 30px rgba(34,197,94,0.5)'] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                >
                  ⬆ CHART LEVEL UP
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Level Up Particles */}
          <AnimatePresence>
            {isLevelingUp && levelUpParticles.length > 0 && (
              <motion.div
                className="absolute inset-0 z-50 pointer-events-none overflow-hidden"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {levelUpParticles.map(p => (
                  <motion.span
                    key={p.id}
                    className="absolute font-black font-mono text-green-400 text-sm drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]"
                    style={{ left: `${p.x}%`, top: `${p.y}%` }}
                    initial={{ opacity: 0, y: 10, scale: 0.3 }}
                    animate={{ opacity: [0, 1, 1, 0], y: -50, scale: [0.3, 1.3, 1, 0.6] }}
                    transition={{ duration: 2, delay: p.delay, ease: 'easeOut' }}
                  >
                    +1
                  </motion.span>
                ))}
                {/* Central flash */}
                <motion.div
                  className="absolute inset-0 flex items-center justify-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.8, 0] }}
                  transition={{ duration: 1.2, delay: 0.4 }}
                >
                  <div className="w-20 h-20 rounded-full bg-green-400/30 blur-xl" />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── RIGHT CONTAINER: VIDEO ── */}
        <div className="w-[55%] md:w-[58%] relative z-10 shrink-0 bg-[#0A0A0F]">
          <div className="absolute inset-0 w-full h-full">
            <video
              ref={introRef}
              muted playsInline preload="auto"
              poster="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
              className="absolute inset-0 w-full h-full object-cover object-center bg-transparent"
              style={{ display: videoPhase === 'intro' ? 'block' : 'none' }}
            />
            <video
              ref={loopRef}
              muted playsInline loop preload="auto"
              poster="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
              className="absolute inset-0 w-full h-full object-cover object-center bg-transparent"
              style={{ display: videoPhase === 'loop' ? 'block' : 'none' }}
            />
            {videoPhase === 'image' && equippedOutfit?.image && (
              <img src={equippedOutfit.image} alt={equippedOutfit.name} className="absolute inset-0 w-full h-full object-cover object-center brightness-75" />
            )}
            {videoPhase === 'image' && !equippedOutfit?.image && (
              <video 
                autoPlay loop muted playsInline
                poster="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
                src="https://res.cloudinary.com/dcnqnbvp0/video/upload/v1769167952/Subject_animestyle_shadow_202601231701_vl45_ayicwk.mp4"
                className="absolute inset-0 w-full h-full object-cover object-center bg-transparent"
              />
            )}
          </div>

          {/* Edge gradients for blending — stronger top/bottom shadows */}
          <div className="absolute inset-y-0 left-0 w-24 md:w-32 bg-gradient-to-r from-[#0A0A0F] via-[#0A0A0F]/80 to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-[#0A0A0F]/70 to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#0A0A0F] via-[#0A0A0F]/60 to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#0A0A0F] via-[#0A0A0F]/50 to-transparent z-10 pointer-events-none" />

          {/* ── Floating Thought Boxes (Strictly contained in right area, avoiding face center) ── */}
          <div className="absolute inset-0 z-40 pointer-events-none">
            <MentorThoughtBox 
              messages={activeMessages} 
              onDismiss={activeDismiss} 
            />
          </div>
        </div>

      </div>

      {/* --- RADAR LEVEL INDICATOR BAR --- */}
      <div className="w-full bg-[#0A0A0F]/90 border-t border-white/[0.03] px-3 py-1.5 z-20 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="flex items-center justify-center w-5 h-5 rounded"
              style={{ background: `${TIER_COLORS[overallRadarLevel - 1]}20`, border: `1px solid ${TIER_COLORS[overallRadarLevel - 1]}40` }}
            >
              <Layers size={10} style={{ color: TIER_COLORS[overallRadarLevel - 1] }} />
            </div>
            <span className="text-[9px] font-mono font-bold text-gray-400 uppercase tracking-widest">RADAR LVL:</span>
            <span
              className="text-[11px] font-black font-mono tracking-wider"
              style={{ color: TIER_COLORS[overallRadarLevel - 1] }}
            >
              TIER {TIER_NAMES[overallRadarLevel - 1]}
            </span>
            {xpBuffPercent > 0 && (
              <span
                className="text-[8px] font-black font-mono px-1.5 py-0.5 rounded-full animate-pulse"
                style={{
                  background: 'rgba(34,197,94,0.15)',
                  border: '1px solid rgba(34,197,94,0.3)',
                  color: '#4ade80',
                }}
              >
                +{xpBuffPercent}% XP
              </span>
            )}
          </div>
          <button
            onClick={() => setShowAllLevels(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[8px] font-black font-mono uppercase tracking-widest transition-all duration-200"
            style={{
              background: 'rgba(0,210,255,0.08)',
              border: '1px solid rgba(0,210,255,0.2)',
              color: '#00d2ff',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,210,255,0.15)'; e.currentTarget.style.borderColor = 'rgba(0,210,255,0.4)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,210,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(0,210,255,0.2)'; }}
          >
            ALL LEVELS
          </button>
        </div>
        {/* XP Buff Tier Progress */}
        <div className="flex items-center gap-3 mt-1.5">
          <div className="flex-1 flex items-center gap-1">
            {TIER_NAMES.map((name, i) => (
              <div
                key={name}
                className="flex-1 h-1 rounded-full transition-all duration-500"
                style={{ background: i < overallRadarLevel ? TIER_COLORS[i] : 'rgba(255,255,255,0.05)' }}
              />
            ))}
          </div>
          <span className="text-[7px] font-mono text-gray-600 shrink-0">
            {xpBuffPercent > 0 ? `${xpBuffPercent}% XP BUFF ACTIVE` : 'NO XP BUFF'}
          </span>
        </div>
      </div>

      {/* --- ALL LEVELS POPUP --- */}
      <AnimatePresence>
        {showAllLevels && (
          <motion.div
            className="absolute inset-0 z-[100] flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowAllLevels(false)} />

            {/* Panel */}
            <motion.div
              className="relative w-[92%] max-w-[380px] max-h-[85%] overflow-y-auto rounded-2xl"
              style={{
                background: 'linear-gradient(180deg, #0d0d1a 0%, #080812 100%)',
                border: '1px solid rgba(0,210,255,0.15)',
                boxShadow: '0 0 40px rgba(0,210,255,0.08), 0 20px 60px rgba(0,0,0,0.6)',
              }}
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <div className="flex items-center gap-2">
                  <Layers size={14} className="text-[#00d2ff]" />
                  <span className="text-[11px] font-black text-white uppercase tracking-[0.2em] font-mono">STAT TIER BREAKDOWN</span>
                </div>
                <button onClick={() => setShowAllLevels(false)} className="w-6 h-6 flex items-center justify-center rounded-md bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                  <X size={12} />
                </button>
              </div>

              {/* Overall Level */}
              <div className="mx-4 mb-3 px-3 py-2 rounded-lg" style={{ background: `${TIER_COLORS[overallRadarLevel - 1]}10`, border: `1px solid ${TIER_COLORS[overallRadarLevel - 1]}25` }}>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono font-bold text-gray-400 uppercase tracking-widest">Overall Radar Level</span>
                  <span className="text-[13px] font-black font-mono" style={{ color: TIER_COLORS[overallRadarLevel - 1] }}>TIER {TIER_NAMES[overallRadarLevel - 1]}</span>
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(statTierDetails.reduce((s, d) => s + d.val, 0) / 1200) * 100}%`, background: `linear-gradient(90deg, ${TIER_COLORS[0]}, ${TIER_COLORS[overallRadarLevel - 1]})` }} />
                  </div>
                  <span className="text-[8px] font-mono text-gray-500">{statTierDetails.reduce((s, d) => s + d.val, 0)}/1200</span>
                </div>
              </div>

              {/* XP Buff Info */}
              <div className="mx-4 mb-3 px-3 py-2 rounded-lg" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)' }}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] font-mono font-bold text-gray-400 uppercase tracking-widest">XP Buff from Radar Level</span>
                  <span className="text-[11px] font-black font-mono" style={{ color: xpBuffPercent > 0 ? '#4ade80' : '#6b7280' }}>
                    {xpBuffPercent > 0 ? `+${xpBuffPercent}%` : 'NONE'}
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {TIER_NAMES.map((name, i) => {
                    const buff = XP_BUFF_MAP[i + 1] || 0;
                    const isActive = (i + 1) <= overallRadarLevel;
                    const isCurrent = (i + 1) === overallRadarLevel;
                    return (
                      <div key={name} className="flex flex-col items-center gap-0.5 py-1 rounded" style={{ background: isCurrent ? 'rgba(34,197,94,0.12)' : 'transparent', border: isCurrent ? '1px solid rgba(34,197,94,0.25)' : '1px solid transparent' }}>
                        <span className="text-[8px] font-mono font-bold" style={{ color: isActive ? TIER_COLORS[i] : '#374151' }}>T{name}</span>
                        <span className="text-[7px] font-mono" style={{ color: isActive ? '#4ade80' : '#4b5563' }}>+{buff}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Individual Stats */}
              <div className="px-4 space-y-2 pb-3">
                {statTierDetails.map(stat => (
                  <div key={stat.key} className="rounded-lg px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black font-mono text-[#00d2ff] tracking-wider">{stat.key}</span>
                        <span className="text-[8px] font-mono text-gray-500">{stat.label}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black font-mono" style={{ color: TIER_COLORS[stat.tier - 1] }}>T{stat.tierName}</span>
                        <span className="text-[8px] font-mono text-gray-600">{stat.val}/200</span>
                      </div>
                    </div>
                    {/* Progress within current tier */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: TIER_COLORS[stat.tier - 1] }}
                          initial={{ width: 0 }}
                          animate={{ width: `${(stat.progress / TIER_SIZE) * 100}%` }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                        />
                      </div>
                      <span className="text-[7px] font-mono text-gray-500 w-8 text-right">{stat.progress}/{TIER_SIZE}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tier Legend */}
              <div className="mx-4 mb-4 px-3 py-2.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.03)' }}>
                <span className="text-[8px] font-mono font-bold text-gray-500 uppercase tracking-widest block mb-2">Tier Scale</span>
                <div className="grid grid-cols-5 gap-1">
                  {TIER_NAMES.map((name, i) => (
                    <div key={name} className="flex flex-col items-center gap-0.5">
                      <div className="w-full h-1 rounded-full" style={{ background: TIER_COLORS[i], opacity: i < overallRadarLevel ? 1 : 0.3 }} />
                      <span className="text-[7px] font-mono font-bold" style={{ color: TIER_COLORS[i], opacity: i < overallRadarLevel ? 1 : 0.4 }}>T{name}</span>
                      <span className="text-[6px] font-mono text-gray-600">{i * TIER_SIZE}-{(i + 1) * TIER_SIZE === 200 ? 200 : (i + 1) * TIER_SIZE - 1}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- BOTTOM SECTION: TALK TO DUSK BUTTON --- */}
      <div className="w-full p-3 bg-[#0A0A0F] border-t border-white/5 z-20 relative shrink-0">
        <button
          onClick={onOpenDuskChat}
          className="w-full relative rounded-xl overflow-hidden h-[48px] flex items-center justify-center gap-3 px-4 group transition-all duration-300"
          style={{
            background: 'linear-gradient(90deg, rgba(8,8,18,0.95), rgba(15,20,35,0.95))',
            border: '1px solid rgba(0,210,255,0.15)',
            boxShadow: 'inset 0 0 20px rgba(0,210,255,0.05), 0 4px 15px rgba(0,0,0,0.4)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'rgba(0,210,255,0.4)';
            e.currentTarget.style.boxShadow = 'inset 0 0 20px rgba(0,210,255,0.1), 0 4px 20px rgba(0,210,255,0.15)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'rgba(0,210,255,0.15)';
            e.currentTarget.style.boxShadow = 'inset 0 0 20px rgba(0,210,255,0.05), 0 4px 15px rgba(0,0,0,0.4)';
          }}
        >
          {/* Animated background glow */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#00d2ff]/20 via-transparent to-transparent" />
          
          <div className="relative z-10 flex items-center justify-center gap-3 w-full">
            <div className="flex items-center justify-center w-6 h-6 rounded-md bg-[#00d2ff]/10 border border-[#00d2ff]/30 text-[#00d2ff] group-hover:scale-110 group-hover:bg-[#00d2ff]/20 transition-all duration-300">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            
            <div className="flex flex-col items-start justify-center pt-0.5">
              <span className="text-[11px] font-black text-white uppercase tracking-[0.15em] leading-none group-hover:text-system-neon transition-colors duration-300">
                TALK TO DUSK
              </span>
              <span className="text-[8px] text-[#00d2ff]/60 font-mono tracking-wide mt-1 group-hover:text-[#00d2ff]/90 transition-colors duration-300 truncate max-w-[200px] md:max-w-[250px]">
                {duskContextVoice}
              </span>
            </div>

            {(player.duskUnreadCount ?? 0) > 0 && (
              <div className="ml-auto w-5 h-5 rounded-full bg-red-500/90 border border-red-400 flex items-center justify-center text-[9px] font-black text-white shadow-[0_0_12px_rgba(239,68,68,0.8)] animate-pulse">
                {player.duskUnreadCount}
              </div>
            )}
          </div>
          
          {/* Scanning line effect on hover */}
          <motion.div 
            className="absolute left-0 right-0 h-[1px] bg-[#00d2ff]/40 shadow-[0_0_8px_#00d2ff] opacity-0 group-hover:opacity-100"
            animate={{ top: ['0%', '100%', '0%'] }}
            transition={{ duration: 2, ease: "linear", repeat: Infinity }}
          />
        </button>
      </div>

    </div>
  );
};

export default PlayerStatusCard;
