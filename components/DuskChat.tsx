
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, RefreshCw, Zap, Dumbbell, Apple, BarChart3, Target, Brain, Moon, Flame, Trash2 } from 'lucide-react';
import { PlayerData } from '../types';
import { API_BASE } from '../lib/apiConfig';
import { getPlayerAuthHeaders, authenticatedFetch } from '../lib/playerApi';
import {
  Message,
  loadHistory,
  appendMessage,
  clearHistory as clearDuskHistory,
  subscribe as subscribeDuskHistory,
} from '../lib/duskHistory';


interface DuskChatProps {
  player: PlayerData;
  updatePlayer?: (updater: (prev: PlayerData) => PlayerData) => void;
  onClose: () => void;
  onMarkRead?: () => void;
  onWatchAdForKeys?: () => Promise<boolean>;
}

// ── Dusk Avatar (hooded figure with glowing eyes) ──
const DuskAvatar: React.FC<{ isThinking: boolean }> = ({ isThinking }) => (
  <div className="relative flex items-center justify-center">
    {/* Outer glow rings */}
    <motion.div
      className="absolute rounded-full"
      style={{
        width: 130, height: 130,
        background: 'radial-gradient(circle, rgba(0,212,255,0.08) 0%, transparent 70%)',
      }}
      animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
    />
    <motion.div
      className="absolute rounded-full"
      style={{
        width: 100, height: 100,
        background: 'radial-gradient(circle, rgba(0,212,255,0.12) 0%, transparent 70%)',
      }}
      animate={{ scale: [1, 1.1, 1], opacity: [0.6, 1, 0.6] }}
      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
    />

    {/* Main avatar image */}
    <motion.div
      className="relative rounded-full overflow-hidden flex items-center justify-center"
      style={{
        width: 72, height: 72,
        boxShadow: '0 0 40px rgba(0,212,255,0.35), 0 0 80px rgba(0,212,255,0.15)',
        border: '2px solid rgba(0,212,255,0.3)',
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
      <img src="/assets/dusk-avatar.png" alt="Dusk" className="w-full h-full object-cover" draggable={false} />
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
            background: '#00d4ff',
            boxShadow: `0 0 ${p.size * 3}px rgba(0,212,255,0.4)`,
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
      border: '1px solid rgba(0,212,255,0.15)',
      backdropFilter: 'blur(8px)',
    }}
    whileHover={{ scale: 1.03, borderColor: 'rgba(0,212,255,0.4)' }}
    whileTap={{ scale: 0.97 }}
  >
    <span className="text-[#00d4ff] flex-shrink-0">{React.cloneElement(icon as React.ReactElement, { size: 12 })}</span>
    <span className="truncate max-w-[140px]">{label}</span>
  </motion.button>
);


const DuskChat: React.FC<DuskChatProps> = ({ player, updatePlayer, onClose, onMarkRead, onWatchAdForKeys }) => {
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

  // Seed state from the single-writer history store on mount, and subscribe to
  // it so ALL updates (user sends, dusk replies, and autonomous system messages
  // from useSystem.triggerDuskMessage) flow through one source of truth. The
  // store is the only writer of localStorage['dusk_chat_history_...'], which
  // removes the previous read-modify-write clobber race between this component
  // and useSystem, and guarantees stable ordering via each message's `seq`.
  useEffect(() => {
    if (onMarkRead) onMarkRead();

    const initial = loadHistory(player.userId);
    if (initial.length > 0) {
      setMessages(initial);
      setHasStartedChat(true);
    }

    const unsubscribe = subscribeDuskHistory((uid, history) => {
      // Ignore updates for a different user's history.
      if (uid !== (player.userId || 'local')) return;
      setMessages(history);
      if (history.length > 0) setHasStartedChat(true);
    });
    return unsubscribe;
  }, [player.userId]);

  // Auto-scroll — fires on new messages AND when loading state changes.
  // (History persistence is handled by the duskHistory store, not here.)
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Use rAF to wait for DOM to paint, then scroll
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
  }, [messages, isLoading]);

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
      const res = await authenticatedFetch(`${API_BASE}/api/dusk/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getPlayerAuthHeaders() },
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

      // Single-writer store append — subscription drives the UI update.
      appendMessage(player.userId, { sender: 'dusk', text });
    } catch (error: any) {
      console.error('Dusk AI Error:', error);
      // Handle 402 (not enough keys) — show specific message
      const errMsg = error?.keysError
        ? `Not enough keys! You need 1 🔑 per 5 messages. You have ${error.keysRemaining || 0} left.`
        : 'Oops, something went wrong. Try again in a bit.';
      appendMessage(player.userId, { sender: 'dusk', text: errMsg });
    } finally {
      setIsLoading(false);
    }
  };

  const hasKeys = (player.keys ?? 10) >= 1;

  const handleSend = (overrideText?: string) => {
    const text = overrideText || inputValue.trim();
    if (!text || !hasKeys) return;

    setHasStartedChat(true);

    // Single-writer store append — subscription drives the UI update.
    appendMessage(player.userId, { sender: 'user', text });
    setInputValue('');
    generateResponse(text);
  };

  const handleChipClick = (message: string) => {
    handleSend(message);
  };

  const clearHistory = () => {
    setHasStartedChat(false);
    // Store clears localStorage + cache and notifies the subscription (which
    // will set messages to []).
    clearDuskHistory(player.userId);
  };

  const firstName = (player.name || 'Hunter').split(' ')[0];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3 }}
        className="w-full h-full sm:h-[85vh] sm:max-w-lg bg-[#060608] sm:border sm:border-[#00d4ff]/20 sm:rounded-2xl shadow-[0_0_60px_rgba(0,212,255,0.1)] flex flex-col overflow-hidden relative"
      >
        {/* Background effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,212,255,0.04)_0%,transparent_60%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:24px_24px] opacity-30" />
          <BackgroundParticles />
        </div>

        {/* ── Header ── */}
        <div className="relative z-10 px-4 py-3 flex items-center justify-between border-b border-gray-800/60"
          style={{ paddingTop: 'max(env(safe-area-inset-top, 12px), 28px)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full overflow-hidden relative"
              style={{
                border: '1.5px solid rgba(0,212,255,0.3)',
                boxShadow: '0 0 12px rgba(0,212,255,0.15)',
              }}
            >
              <img src="/assets/dusk-avatar.png" alt="Dusk" className="w-full h-full object-cover" />
              <div className="absolute -bottom-px -right-px w-2 h-2 bg-emerald-500 rounded-full border border-[#060608]" />
            </div>
            <div>
              <h3 className="text-white text-sm font-bold font-mono tracking-wide">DUSK</h3>
              <p className="text-[8px] text-[#00d4ff]/70 font-mono tracking-[0.2em] uppercase">Online • Shadow Overseer</p>
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
                    Speak, {firstName}.
                  </h2>
                  <p className="text-gray-500 text-xs font-mono">
                    What do you need?
                  </p>
                </motion.div>

                {/* Key indicator */}
                <motion.div
                  className="flex items-center gap-1.5 mt-2 mb-5"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <Zap size={10} className={hasKeys ? 'text-[#00d4ff]/60' : 'text-red-500'} />
                  <span className={`text-[9px] font-mono font-bold ${hasKeys ? 'text-[#00d4ff]/50' : 'text-red-500'}`}>
                    {hasKeys ? `${player.keys ?? 10} 🔑 KEYS • 1 / 5 msgs` : 'NO KEYS'}
                  </span>
                  {onWatchAdForKeys && (
                    <button
                      onClick={async () => { await onWatchAdForKeys(); }}
                      className="ml-2 px-2 py-0.5 rounded text-[8px] font-black font-mono uppercase tracking-wider transition-all active:scale-95"
                      style={{
                        background: 'rgba(168,85,247,0.15)',
                        border: '1px solid rgba(168,85,247,0.3)',
                        color: '#a855f7',
                      }}
                    >
                      ▶ +3 Keys
                    </button>
                  )}
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
                        <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 mr-2 mt-1"
                          style={{
                            border: '1px solid rgba(0,212,255,0.2)',
                            boxShadow: '0 0 6px rgba(0,212,255,0.1)',
                          }}
                        >
                          <img src="/assets/dusk-avatar.png" alt="Dusk" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className={`
                        max-w-[78%] px-3.5 py-2.5 text-[13px] leading-relaxed
                        ${isDusk
                          ? 'bg-gray-900/70 border border-gray-800 text-gray-200 rounded-2xl rounded-tl-md'
                          : 'bg-gradient-to-br from-cyan-500 to-cyan-600 text-black font-semibold rounded-2xl rounded-tr-md shadow-[0_2px_12px_rgba(0,212,255,0.2)]'
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
                    <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 mr-2 mt-1"
                      style={{
                        border: '1px solid rgba(0,212,255,0.2)',
                        boxShadow: '0 0 6px rgba(0,212,255,0.1)',
                      }}
                    >
                      <img src="/assets/dusk-avatar.png" alt="Dusk" className="w-full h-full object-cover" />
                    </div>
                    <div className="bg-gray-900/70 border border-gray-800 px-4 py-3 rounded-2xl rounded-tl-md flex items-center gap-2">
                      <div className="flex gap-1">
                        {[0, 1, 2].map(i => (
                          <motion.div
                            key={i}
                            className="w-1.5 h-1.5 rounded-full bg-[#00d4ff]"
                            animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
                            transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] text-[#00d4ff]/60 font-mono">thinking</span>
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
        <div className="relative z-10 px-3 py-3 border-t border-gray-800/50 bg-[#060608]/90 backdrop-blur-sm"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 12px), 12px)' }}>
          <div className="relative flex items-center gap-2">
            <input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask me anything..."
              className="flex-1 bg-gray-900/80 border border-gray-800 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-[#00d4ff]/40 focus:shadow-[0_0_15px_rgba(0,212,255,0.08)] transition-all placeholder:text-gray-600"
              disabled={isLoading}
            />
            <motion.button
              onClick={() => handleSend()}
              disabled={!inputValue.trim() || isLoading || !hasKeys}
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                background: inputValue.trim() && hasKeys
                  ? 'linear-gradient(135deg, #00d4ff, #00d4ff)'
                  : 'rgba(255,255,255,0.05)',
                boxShadow: inputValue.trim() && hasKeys ? '0 0 15px rgba(0,212,255,0.25)' : 'none',
              }}
              whileTap={{ scale: 0.92 }}
            >
              <Send size={16} className={inputValue.trim() && hasKeys ? 'text-black' : 'text-gray-600'} />
            </motion.button>
          </div>

          {/* Key footer — only when in chat mode */}
          {hasStartedChat && (
            <div className="mt-1.5 flex items-center justify-center gap-2">
              <span className={`text-[8px] font-mono font-bold flex items-center gap-0.5 ${hasKeys ? 'text-[#00d4ff]/40' : 'text-red-500/70'}`}>
                <Zap size={7} /> {hasKeys ? '1 🔑 per 5 messages' : 'NOT ENOUGH KEYS'}
              </span>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default DuskChat;
