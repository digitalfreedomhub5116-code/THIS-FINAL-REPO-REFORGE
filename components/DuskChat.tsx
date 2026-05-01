
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, RefreshCw, Zap, Dumbbell, Apple, BarChart3, Target, Brain, Moon, Flame, Trash2 } from 'lucide-react';
import { PlayerData } from '../types';
import { API_BASE } from '../lib/apiConfig';
import { getPlayerAuthHeaders } from '../lib/playerApi';


interface DuskChatProps {
  player: PlayerData;
  updatePlayer?: (updater: (prev: PlayerData) => PlayerData) => void;
  onClose: () => void;
  onMarkRead?: () => void;
}

interface Message {
  id: string;
  sender: 'user' | 'dusk';
  text: string;
  timestamp: number;
}

// ── Animated Dusk Avatar (glowing orb with eyes) ──
const DuskAvatar: React.FC<{ isThinking: boolean }> = ({ isThinking }) => (
  <div className="relative flex items-center justify-center">
    {/* Outer glow rings */}
    <motion.div
      className="absolute rounded-full"
      style={{
        width: 130, height: 130,
        background: 'radial-gradient(circle, rgba(126,184,212,0.08) 0%, transparent 70%)',
      }}
      animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
    />
    <motion.div
      className="absolute rounded-full"
      style={{
        width: 100, height: 100,
        background: 'radial-gradient(circle, rgba(126,184,212,0.12) 0%, transparent 70%)',
      }}
      animate={{ scale: [1, 1.1, 1], opacity: [0.6, 1, 0.6] }}
      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
    />

    {/* Main orb */}
    <motion.div
      className="relative rounded-full flex items-center justify-center"
      style={{
        width: 72, height: 72,
        background: 'radial-gradient(circle at 35% 35%, rgba(0,230,255,0.6), rgba(0,180,220,0.4) 50%, rgba(0,100,140,0.3) 100%)',
        boxShadow: '0 0 40px rgba(126,184,212,0.35), 0 0 80px rgba(126,184,212,0.15), inset 0 -8px 20px rgba(0,0,0,0.3)',
        border: '1px solid rgba(126,184,212,0.25)',
      }}
      animate={isThinking
        ? { scale: [1, 1.08, 1], rotate: [0, 3, -3, 0] }
        : { scale: [1, 1.03, 1] }
      }
      transition={isThinking
        ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut' }
        : { duration: 3, repeat: Infinity, ease: 'easeInOut' }
      }
    >
      {/* Eyes */}
      <div className="flex gap-3">
        <motion.div
          className="rounded-full"
          style={{
            width: 8, height: 14, borderRadius: 6,
            background: 'rgba(255,255,255,0.95)',
            boxShadow: '0 0 8px rgba(255,255,255,0.5)',
          }}
          animate={isThinking
            ? { scaleY: [1, 0.3, 1] }
            : { scaleY: [1, 0.15, 1] }
          }
          transition={isThinking
            ? { duration: 0.8, repeat: Infinity }
            : { duration: 4, repeat: Infinity, repeatDelay: 3 }
          }
        />
        <motion.div
          className="rounded-full"
          style={{
            width: 8, height: 14, borderRadius: 6,
            background: 'rgba(255,255,255,0.95)',
            boxShadow: '0 0 8px rgba(255,255,255,0.5)',
          }}
          animate={isThinking
            ? { scaleY: [1, 0.3, 1] }
            : { scaleY: [1, 0.15, 1] }
          }
          transition={isThinking
            ? { duration: 0.8, repeat: Infinity }
            : { duration: 4, repeat: Infinity, repeatDelay: 3 }
          }
        />
      </div>
    </motion.div>
  </div>
);

// ── Floating background particles ──
const BackgroundParticles: React.FC = () => {
  const particles = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => ({
      id: i,
      left: `${10 + Math.random() * 80}%`,
      delay: Math.random() * 8,
      duration: 8 + Math.random() * 6,
      size: 1 + Math.random() * 1.5,
      drift: (Math.random() - 0.5) * 40,
    })), []);

  return (
    <>
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: p.left, bottom: '10%',
            width: p.size, height: p.size,
            background: '#7EB8D4',
            boxShadow: `0 0 ${p.size * 3}px rgba(126,184,212,0.4)`,
          }}
          animate={{
            y: [0, -(150 + Math.random() * 200)],
            x: [0, p.drift],
            opacity: [0.3, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeOut',
          }}
        />
      ))}
    </>
  );
};

// ── Suggestion Chip ──
interface ChipProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}
const SuggestionChip: React.FC<ChipProps> = ({ icon, label, onClick }) => (
  <motion.button
    onClick={onClick}
    className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-[10px] font-mono font-semibold text-gray-300 transition-all active:scale-95 whitespace-nowrap"
    style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(126,184,212,0.15)',
      backdropFilter: 'blur(8px)',
    }}
    whileHover={{ scale: 1.03, borderColor: 'rgba(126,184,212,0.4)' }}
    whileTap={{ scale: 0.97 }}
  >
    <span className="text-[#7EB8D4] flex-shrink-0">{React.cloneElement(icon as React.ReactElement, { size: 12 })}</span>
    <span className="truncate max-w-[140px]">{label}</span>
  </motion.button>
);


const DuskChat: React.FC<DuskChatProps> = ({ player, updatePlayer, onClose, onMarkRead }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasStartedChat, setHasStartedChat] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Determine if we show the welcome hero or the chat view
  const showWelcomeHero = !hasStartedChat && messages.length === 0;

  // Context-aware suggestion chips
  const suggestionChips = useMemo(() => {
    const failedQuests = player.quests?.filter(q => q.failed) || [];
    const activeQuests = player.quests?.filter(q => !q.isCompleted && !q.failed) || [];
    const hour = new Date().getHours();

    const chips: { icon: React.ReactNode; label: string; message: string }[] = [];

    // Time-based
    if (hour < 12) {
      chips.push({ icon: <Flame size={14} />, label: "Plan today's workout", message: "Help me plan my workout for today based on my goals and current level." });
    } else if (hour >= 21) {
      chips.push({ icon: <Moon size={14} />, label: "Recovery tips for tonight", message: "Give me recovery and sleep tips for tonight to maximize my gains." });
    }

    // State-based
    if (failedQuests.length > 0) {
      chips.push({ icon: <Target size={14} />, label: `Why did I fail ${failedQuests.length} quest${failedQuests.length > 1 ? 's' : ''}?`, message: `I failed ${failedQuests.length} quest(s) recently: ${failedQuests.map(q => q.title).join(', ')}. Help me understand why and how to avoid this.` });
    }
    if (player.streak >= 7) {
      chips.push({ icon: <Flame size={14} />, label: `Keep my ${player.streak}-day streak`, message: `I'm on a ${player.streak}-day streak! How do I maintain this momentum and avoid burnout?` });
    }
    if (activeQuests.length > 0) {
      chips.push({ icon: <Target size={14} />, label: "Help with my active quests", message: `I have ${activeQuests.length} active quests: ${activeQuests.slice(0, 3).map(q => q.title).join(', ')}. Give me tips to complete them.` });
    }

    // Always-available
    chips.push(
      { icon: <Dumbbell size={14} />, label: "Plan my workout", message: "Plan a workout for me based on my current fitness level and goals." },
      { icon: <Apple size={14} />, label: "Nutrition advice", message: "Give me nutrition and diet advice tailored to my fitness goals." },
      { icon: <BarChart3 size={14} />, label: "Analyze my progress", message: "Analyze my overall progress — streaks, XP, completed quests — and tell me how I'm doing." },
      { icon: <Brain size={14} />, label: "I'm unmotivated", message: "I'm feeling unmotivated and don't want to train. Help me push through this." },
    );

    // Deduplicate by label, take first 6
    const seen = new Set<string>();
    return chips.filter(c => {
      if (seen.has(c.label)) return false;
      seen.add(c.label);
      return true;
    }).slice(0, 6);
  }, [player.quests, player.streak]);

  // Load history from local storage on mount
  useEffect(() => {
    if (onMarkRead) onMarkRead();

    const savedHistory = localStorage.getItem(`dusk_chat_history_${player.userId || 'local'}`);
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          setHasStartedChat(true);
        }
      } catch {
        console.error("Failed to load chat history");
      }
    }
  }, []);

  // Auto-scroll — fires on new messages AND when loading state changes
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Use rAF to wait for DOM to paint, then scroll
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
    if (messages.length > 0) {
      localStorage.setItem(`dusk_chat_history_${player.userId || 'local'}`, JSON.stringify(messages));
    }
  }, [messages, isLoading, player.userId]);

  // Listen for autonomous messages
  useEffect(() => {
    const handleNewMessage = (e: Event) => {
      const msg = (e as CustomEvent).detail as Message;
      setMessages(prev => {
        if (prev.find(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      setHasStartedChat(true);
    };
    window.addEventListener('dusk:new_message', handleNewMessage);
    return () => window.removeEventListener('dusk:new_message', handleNewMessage);
  }, []);

  // ── Build full player context for the agent ──
  const buildPlayerContext = () => {
    const hp = player.healthProfile;
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayMeals = (player.nutritionLogs || []).filter(m => m.timestamp >= todayStart.getTime());
    const macroTarget = hp?.macros?.calories || hp?.customCalorieLimit || 2000;
    const todayCalories = todayMeals.reduce((s, m) => s + m.totalCalories, 0);
    const todayStr = new Date().toISOString().split('T')[0];
    const todaySchedule = (player.dailySchedules || []).find(s => s.date === todayStr);
    const activeQuests = (player.quests || []).filter(q => !q.isCompleted && !q.failed);
    const failedQuests = (player.quests || []).filter(q => q.failed);

    return {
      name: player.name, level: player.level, rank: player.rank,
      streak: player.streak, gold: player.gold,
      stats: player.stats,
      health: hp ? {
        weight: hp.weight, height: hp.height, bmi: hp.bmi,
        targetWeight: hp.targetWeight, goal: hp.goal,
        equipment: hp.equipment, injuries: hp.injuries,
        macros: hp.macros, currentPlan: hp.selectedPlanName,
        lastWorkoutDate: hp.lastWorkoutDate,
      } : null,
      todayNutrition: {
        mealsLogged: todayMeals.length,
        totalCalories: todayCalories,
        totalProtein: todayMeals.reduce((s, m) => s + m.totalProtein, 0),
        remainingCalories: macroTarget - todayCalories,
        meals: todayMeals.map(m => ({ label: m.label, calories: m.totalCalories, type: m.mealType })),
      },
      todaySchedule: todaySchedule?.slots?.map(s => ({
        time: `${s.startTime}-${s.endTime}`, label: s.label, status: s.status,
      })) || [],
      quests: {
        active: activeQuests.map(q => ({ id: q.id, title: q.title, scheduledTime: q.scheduledTime })),
        failed: failedQuests.map(q => q.title),
      },
      goals: (player.goals || []).filter(g => g.status === 'ACTIVE').map(g => ({
        title: g.title, category: g.category,
        progress: `Day ${Math.max(0, Math.floor((Date.now() - g.startDate) / 86400000))}/${g.totalDurationDays || '?'}`,
      })),
      workoutPlan: hp?.workoutPlan?.map(d => ({
        day: d.day, exercises: d.exercises?.map(e => e.name).join(', '),
      })) || [],
    };
  };



  const generateResponse = async (userMessage: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/dusk/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getPlayerAuthHeaders() },
        credentials: 'include',
        body: JSON.stringify({
          message: userMessage,
          history: messages.slice(-8).map(m => ({ sender: m.sender, text: m.text })),
          playerContext: buildPlayerContext(),
        })
      });

      const data = await res.json();
      
      // Server returns 402 when not enough keys
      if (res.status === 402) {
        const err: any = new Error('Not enough keys');
        err.keysError = true;
        err.keysRemaining = data.keysRemaining || 0;
        throw err;
      }
      
      const text = data.text || 'Something went wrong. Try again.';

      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        sender: 'dusk',
        text,
        timestamp: Date.now()
      }]);
    } catch (error: any) {
      console.error('Dusk AI Error:', error);
      // Handle 402 (not enough keys) — show specific message
      const errMsg = error?.keysError
        ? `Not enough keys! You need 1 🔑 per message. You have ${error.keysRemaining || 0} left.`
        : 'Oops, something went wrong. Try again in a bit.';
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        sender: 'dusk',
        text: errMsg,
        timestamp: Date.now()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const hasKeys = (player.keys ?? 10) >= 1;

  const handleSend = (overrideText?: string) => {
    const text = overrideText || inputValue.trim();
    if (!text || !hasKeys) return;

    setHasStartedChat(true);

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    generateResponse(text);
  };

  const handleChipClick = (message: string) => {
    handleSend(message);
  };

  const clearHistory = () => {
    setMessages([]);
    setHasStartedChat(false);
    localStorage.removeItem(`dusk_chat_history_${player.userId || 'local'}`);
  };

  const firstName = (player.name || 'Hunter').split(' ')[0];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3 }}
        className="w-full h-full sm:h-[85vh] sm:max-w-lg bg-[#060608] sm:border sm:border-[#7EB8D4]/20 sm:rounded-2xl shadow-[0_0_60px_rgba(126,184,212,0.1)] flex flex-col overflow-hidden relative"
      >
        {/* Background effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(126,184,212,0.04)_0%,transparent_60%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:24px_24px] opacity-30" />
          <BackgroundParticles />
        </div>

        {/* ── Header ── */}
        <div className="relative z-10 px-4 py-3 flex items-center justify-between border-b border-gray-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center relative"
              style={{
                background: 'radial-gradient(circle at 40% 40%, rgba(126,184,212,0.3), rgba(0,120,160,0.2))',
                border: '1px solid rgba(126,184,212,0.3)',
                boxShadow: '0 0 12px rgba(126,184,212,0.15)',
              }}
            >
              {/* Mini eyes */}
              <div className="flex gap-1">
                <div className="w-[3px] h-[5px] rounded-full bg-white/90" />
                <div className="w-[3px] h-[5px] rounded-full bg-white/90" />
              </div>
              <div className="absolute -bottom-px -right-px w-2 h-2 bg-emerald-500 rounded-full border border-[#060608]" />
            </div>
            <div>
              <h3 className="text-white text-sm font-bold font-mono tracking-wide">DUSK</h3>
              <p className="text-[8px] text-[#7EB8D4]/70 font-mono tracking-[0.2em] uppercase">Online • AI Buddy</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                onClick={clearHistory}
                className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-600 hover:text-red-400"
                title="Clear chat"
              >
                <Trash2 size={16} />
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-500 hover:text-white">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Main Content Area ── */}
        <div className="flex-1 overflow-y-auto relative z-10 custom-scrollbar" ref={scrollRef}>

          <AnimatePresence mode="wait">
            {showWelcomeHero ? (
              /* ═══════════════════════════════════════════
                 WELCOME HERO STATE — avatar + greeting + chips
                 ═══════════════════════════════════════════ */
              <motion.div
                key="welcome"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center justify-center px-5 py-6 min-h-full"
              >
                {/* Avatar */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >
                  <DuskAvatar isThinking={false} />
                </motion.div>

                {/* Greeting */}
                <motion.div
                  className="text-center mt-6 mb-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                >
                  <h2 className="text-xl font-bold text-white mb-1">
                    Hey, {firstName}!
                  </h2>
                  <p className="text-gray-500 text-xs font-mono">
                    How can I help you today?
                  </p>
                </motion.div>

                {/* Key indicator */}
                <motion.div
                  className="flex items-center gap-1.5 mt-2 mb-5"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <Zap size={10} className={hasKeys ? 'text-[#7EB8D4]/60' : 'text-red-500'} />
                  <span className={`text-[9px] font-mono font-bold ${hasKeys ? 'text-[#7EB8D4]/50' : 'text-red-500'}`}>
                    {hasKeys ? `${player.keys ?? 10} 🔑 KEYS • 1 / msg` : 'NO KEYS'}
                  </span>
                </motion.div>

                {/* Suggestion Chips */}
                <motion.div
                  className="w-full flex flex-wrap gap-2 justify-center max-w-sm px-2"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.5 }}
                >
                  {suggestionChips.map((chip, i) => (
                    <motion.div
                      key={chip.label}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 + i * 0.06 }}
                    >
                      <SuggestionChip
                        icon={chip.icon}
                        label={chip.label}
                        onClick={() => handleChipClick(chip.message)}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>
            ) : (
              /* ═══════════════════════════════════════════
                 CHAT VIEW — message bubbles
                 ═══════════════════════════════════════════ */
              <motion.div
                key="chat"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="p-4 space-y-3"
              >
                {messages.map((msg, idx) => {
                  const isDusk = msg.sender === 'dusk';
                  return (
                    <motion.div
                      key={msg.id}
                      initial={idx >= messages.length - 2 ? { opacity: 0, y: 8 } : false}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25 }}
                      className={`flex ${isDusk ? 'justify-start' : 'justify-end'}`}
                    >
                      {isDusk && (
                        <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mr-2 mt-1"
                          style={{
                            background: 'radial-gradient(circle, rgba(126,184,212,0.2), rgba(0,100,140,0.15))',
                            border: '1px solid rgba(126,184,212,0.2)',
                          }}
                        >
                          <div className="flex gap-0.5">
                            <div className="w-[2px] h-[3px] rounded-full bg-white/80" />
                            <div className="w-[2px] h-[3px] rounded-full bg-white/80" />
                          </div>
                        </div>
                      )}
                      <div className={`
                        max-w-[78%] px-3.5 py-2.5 text-[13px] leading-relaxed
                        ${isDusk
                          ? 'bg-gray-900/70 border border-gray-800 text-gray-200 rounded-2xl rounded-tl-md'
                          : 'bg-gradient-to-br from-cyan-500 to-cyan-600 text-black font-semibold rounded-2xl rounded-tr-md shadow-[0_2px_12px_rgba(126,184,212,0.2)]'
                        }
                      `}>
                        {msg.text}

                      </div>
                    </motion.div>
                  );
                })}

                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-start"
                  >
                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mr-2 mt-1"
                      style={{
                        background: 'radial-gradient(circle, rgba(126,184,212,0.2), rgba(0,100,140,0.15))',
                        border: '1px solid rgba(126,184,212,0.2)',
                      }}
                    >
                      <div className="flex gap-0.5">
                        <div className="w-[2px] h-[3px] rounded-full bg-white/80" />
                        <div className="w-[2px] h-[3px] rounded-full bg-white/80" />
                      </div>
                    </div>
                    <div className="bg-gray-900/70 border border-gray-800 px-4 py-3 rounded-2xl rounded-tl-md flex items-center gap-2">
                      <div className="flex gap-1">
                        {[0, 1, 2].map(i => (
                          <motion.div
                            key={i}
                            className="w-1.5 h-1.5 rounded-full bg-[#7EB8D4]"
                            animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
                            transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] text-[#7EB8D4]/60 font-mono">thinking</span>
                    </div>
                  </motion.div>
                )}

                {/* Scroll anchor — always at the very bottom */}
                <div ref={bottomRef} className="h-1" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Input Area ── */}
        <div className="relative z-10 px-3 py-3 border-t border-gray-800/50 bg-[#060608]/90 backdrop-blur-sm">
          <div className="relative flex items-center gap-2">
            <input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask me anything..."
              className="flex-1 bg-gray-900/80 border border-gray-800 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-[#7EB8D4]/40 focus:shadow-[0_0_15px_rgba(126,184,212,0.08)] transition-all placeholder:text-gray-600"
              disabled={isLoading}
            />
            <motion.button
              onClick={() => handleSend()}
              disabled={!inputValue.trim() || isLoading || !hasKeys}
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                background: inputValue.trim() && hasKeys
                  ? 'linear-gradient(135deg, #7EB8D4, #7EB8D4)'
                  : 'rgba(255,255,255,0.05)',
                boxShadow: inputValue.trim() && hasKeys ? '0 0 15px rgba(126,184,212,0.25)' : 'none',
              }}
              whileTap={{ scale: 0.92 }}
            >
              <Send size={16} className={inputValue.trim() && hasKeys ? 'text-black' : 'text-gray-600'} />
            </motion.button>
          </div>

          {/* Key footer — only when in chat mode */}
          {hasStartedChat && (
            <div className="mt-1.5 flex items-center justify-center gap-2">
              <span className={`text-[8px] font-mono font-bold flex items-center gap-0.5 ${hasKeys ? 'text-[#7EB8D4]/40' : 'text-red-500/70'}`}>
                <Zap size={7} /> {hasKeys ? '1 🔑 per message' : 'NOT ENOUGH KEYS'}
              </span>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default DuskChat;
