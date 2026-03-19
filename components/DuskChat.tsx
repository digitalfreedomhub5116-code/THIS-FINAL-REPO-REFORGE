
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Terminal, AlertTriangle, Shield, RefreshCw } from 'lucide-react';
import { PlayerData } from '../types';
import { API_BASE } from '../lib/apiConfig';

interface DuskChatProps {
  player: PlayerData;
  onClose: () => void;
  onMarkRead?: () => void;
}

interface Message {
  id: string;
  sender: 'user' | 'dusk';
  text: string;
  timestamp: number;
}

const DuskChat: React.FC<DuskChatProps> = ({ player, onClose, onMarkRead }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load history from local storage on mount
  useEffect(() => {
    // Trigger read
    if (onMarkRead) onMarkRead();

    const savedHistory = localStorage.getItem(`dusk_chat_history_${player.userId || 'local'}`);
    if (savedHistory) {
        try {
            setMessages(JSON.parse(savedHistory));
        } catch (e) {
            console.error("Failed to load chat history");
        }
    } else {
        // Initial greeting if no history
        const failures = player.quests.filter(q => q.failed);
        let initialText = `System Link Established. Greetings, Hunter ${player.name}.`;
        
        if (failures.length > 0) {
            initialText += ` I detect ${failures.length} failed protocols recently. Explain yourself. Why did you fail "${failures[0].title}"?`;
        } else {
            initialText += " How can I assist your evolution today?";
        }

        setMessages([{
            id: 'init',
            sender: 'dusk',
            text: initialText,
            timestamp: Date.now()
        }]);
    }
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    // Persist messages whenever they change
    if (messages.length > 0) {
        localStorage.setItem(`dusk_chat_history_${player.userId || 'local'}`, JSON.stringify(messages));
    }
  }, [messages, player.userId]);

  // Listen for autonomous messages triggered outside the component
  useEffect(() => {
    const handleNewMessage = (e: Event) => {
        const msg = (e as CustomEvent).detail as Message;
        setMessages(prev => {
            // Prevent duplicates
            if (prev.find(m => m.id === msg.id)) return prev;
            return [...prev, msg];
        });
    };
    window.addEventListener('dusk:new_message', handleNewMessage);
    return () => window.removeEventListener('dusk:new_message', handleNewMessage);
  }, []);

  const generateResponse = async (userMessage: string) => {
    setIsLoading(true);
    try {
        const failedQuests = player.quests.filter(q => q.failed).map(q => q.title).join(', ');
        const activeQuests = player.quests.filter(q => !q.isCompleted && !q.failed).map(q => q.title).join(', ');

        const res = await fetch(`${API_BASE}/api/dusk/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                message: userMessage,
                history: messages.slice(-8),
                playerContext: {
                    name: player.name,
                    level: player.level,
                    rank: player.rank,
                    streak: player.streak,
                    stats: player.stats,
                    failedQuests: failedQuests || 'None',
                    activeQuests: activeQuests || 'None'
                }
            })
        });

        const data = await res.json();
        const text = data.text || 'Signal lost. Try again.';

        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            sender: 'dusk',
            text,
            timestamp: Date.now()
        }]);
    } catch (error) {
        console.error('Dusk AI Error:', error);
        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            sender: 'dusk',
            text: 'Connection to the Monarch is unstable. Try again later.',
            timestamp: Date.now()
        }]);
    } finally {
        setIsLoading(false);
    }
  };

  const handleSend = () => {
      if (!inputValue.trim()) return;
      
      const userMsg: Message = {
          id: Date.now().toString(),
          sender: 'user',
          text: inputValue,
          timestamp: Date.now()
      };

      setMessages(prev => [...prev, userMsg]);
      setInputValue('');
      generateResponse(userMsg.text);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-full max-w-lg bg-[#050505] border border-system-neon/50 rounded-xl shadow-[0_0_50px_rgba(0,210,255,0.15)] flex flex-col h-[80vh] overflow-hidden relative"
        >
            {/* Header */}
            <div className="p-4 border-b border-gray-800 bg-gray-900/50 flex justify-between items-center relative z-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-system-neon/10 border border-system-neon/50 flex items-center justify-center relative">
                        <Terminal size={20} className="text-system-neon" />
                        <div className="absolute top-0 right-0 w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_5px_#22c55e]" />
                    </div>
                    <div>
                        <h3 className="text-white font-bold font-mono tracking-wider">DUSK AI</h3>
                        <p className="text-[10px] text-system-neon font-mono tracking-widest uppercase">Accountability Protocol Active</p>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
                    <X size={20} />
                </button>
            </div>

            {/* Background Effect */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,210,255,0.03)_0%,transparent_70%)] pointer-events-none" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none opacity-20" />

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar relative z-10" ref={scrollRef}>
                {messages.map((msg) => {
                    const isDusk = msg.sender === 'dusk';
                    return (
                        <div key={msg.id} className={`flex ${isDusk ? 'justify-start' : 'justify-end'}`}>
                            <div className={`
                                max-w-[80%] p-3 rounded-xl text-sm font-mono leading-relaxed relative
                                ${isDusk 
                                    ? 'bg-gray-900/80 border border-system-neon/30 text-gray-200 rounded-tl-none' 
                                    : 'bg-system-neon text-black font-bold rounded-tr-none'
                                }
                            `}>
                                {isDusk && <div className="absolute -top-3 left-0 text-[8px] text-system-neon font-black tracking-widest uppercase bg-[#050505] px-1">SYSTEM</div>}
                                {msg.text}
                            </div>
                        </div>
                    );
                })}
                
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-gray-900/50 border border-system-neon/20 p-3 rounded-xl rounded-tl-none flex items-center gap-2">
                            <RefreshCw size={14} className="text-system-neon animate-spin" />
                            <span className="text-xs text-system-neon font-mono animate-pulse">THINKING...</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-gray-800 bg-black relative z-10">
                <div className="relative flex items-center">
                    <input 
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Report status or ask for guidance..."
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg py-3 pl-4 pr-12 text-white font-mono text-xs md:text-sm focus:outline-none focus:border-system-neon focus:shadow-[0_0_15px_rgba(0,210,255,0.15)] transition-all placeholder:text-gray-600"
                        autoFocus
                    />
                    <button 
                        onClick={handleSend}
                        disabled={!inputValue.trim() || isLoading}
                        className="absolute right-2 p-2 bg-system-neon text-black rounded hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send size={16} />
                    </button>
                </div>
                <div className="mt-2 text-[9px] text-gray-600 text-center font-mono">
                    Dusk analyzes failures to optimize your growth. Be honest.
                </div>
            </div>
        </motion.div>
    </div>
  );
};

export default DuskChat;
