
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { 
    Users, Shield, Lock, Search, Plus, Swords, Crown, 
    MessageSquare, Info, Zap, AlertTriangle, User,
    LogOut, Send, Award, Coins, Flame, Trophy, ScrollText, Bell, Gift, Timer
} from 'lucide-react';
import { Alliance, AllianceMember, AllianceChatMessage, PlayerData, GuildLog } from '../types';
import { playSystemSoundEffect } from '../utils/soundEngine';

// --- MOCK DATA GENERATORS ---
const MOCK_NAMES = ["Shadow Legion", "Iron Blood", "Void Walkers", "Solaris", "Night's Edge"];
const MOCK_BADGES = ["🛡️", "⚔️", "🐉", "🐺", "👁️"];

// Separate Chat from Logs
const MOCK_CHAT_MESSAGES: AllianceChatMessage[] = [
    { id: 'c1', senderName: 'Sung Jin-Woo', text: 'Everyone focus on daily quests.', timestamp: Date.now() - 3600000, isSystem: false },
    { id: 'c2', senderName: 'Cha Hae-In', text: 'On it. Just logged my workout.', timestamp: Date.now() - 1800000, isSystem: false },
    { id: 'c3', senderName: 'Thomas Andre', text: 'I need 2 more keys for the dungeon.', timestamp: Date.now() - 900000, isSystem: false },
];

const MOCK_SYSTEM_LOGS: GuildLog[] = [
    { id: 'l1', type: 'SYSTEM', content: 'War declared against "Iron Blood"!', timestamp: Date.now() - 10000000 },
    { id: 'l2', type: 'ACHIEVEMENT', user: 'Sung Jin-Woo', content: 'reached Level 100', timestamp: Date.now() - 5000000 },
    { id: 'l3', type: 'SYSTEM', content: 'Alliance leveled up to Rank 5', timestamp: Date.now() - 2000000 },
    { id: 'l4', type: 'SYSTEM', content: 'Thomas Andre joined the alliance', timestamp: Date.now() - 900000 },
];

const generateDummyAlliances = (): Alliance[] => {
    return MOCK_NAMES.map((name, i) => ({
        id: `mock_alliance_${i}`,
        name: name,
        badge: MOCK_BADGES[i],
        description: "Elite hunters only. Daily login required.",
        type: i % 2 === 0 ? 'OPEN' : 'CLOSED',
        members: [], // Populated on view
        memberCount: Math.floor(Math.random() * 5) + 3, // 3 to 8 members
        totalPower: Math.floor(Math.random() * 50000) + 10000,
        rules: "1. Login daily. 2. Min 500 XP/week. 3. Respect the Monarch."
    }));
};

const MOCK_MEMBERS: AllianceMember[] = [
    { id: 'm1', name: 'Sung Jin-Woo', role: 'LEADER', totalXpContribution: 15200, status: 'ONLINE', lastActive: Date.now() },
    { id: 'm2', name: 'Cha Hae-In', role: 'OFFICER', totalXpContribution: 12100, status: 'ONLINE', lastActive: Date.now() },
    { id: 'm3', name: 'Thomas Andre', role: 'MEMBER', totalXpContribution: 9800, status: 'OFFLINE', lastActive: Date.now() - 3600000 },
    { id: 'm4', name: 'Go Gun-Hee', role: 'MEMBER', totalXpContribution: 8500, status: 'OFFLINE', lastActive: Date.now() - 86400000 },
];

interface GuildsViewProps {
    player: PlayerData;
    onJoin: (allianceId: string) => void;
    onLeave: () => void;
}

// --- ANIMATION VARIANTS ---
const tabContentVariants: Variants = {
    hidden: { opacity: 0, x: 20 },
    visible: { 
        opacity: 1, 
        x: 0, 
        transition: { type: "spring", stiffness: 300, damping: 30 } 
    },
    exit: { 
        opacity: 0, 
        x: -20, 
        transition: { duration: 0.2 } 
    }
};

// --- EVENT BANNER COMPONENT ---
const EventBanner = ({ title, subtitle, icon: Icon, color, onClick }: { title: string, subtitle: string, icon: any, color: string, onClick?: () => void }) => (
    <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className={`relative overflow-hidden rounded-xl border border-white/10 bg-black/40 p-3 flex items-center gap-3 flex-1 min-w-0 shadow-lg group transition-all hover:border-white/20 backdrop-blur-sm`}
    >
        <div className={`absolute inset-0 opacity-5 ${color}`} />
        <div className={`p-2 rounded-full bg-black/50 border border-white/10 ${color.replace('bg-', 'text-')} shrink-0`}>
            <Icon size={18} />
        </div>
        <div className="text-left min-w-0">
            <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider truncate">{subtitle}</div>
            <div className="text-sm font-black text-white uppercase italic leading-none truncate">{title}</div>
        </div>
    </motion.button>
);

// --- VS GAUGE COMPONENT ---
const WarGauge = ({ myScore, enemyScore }: { myScore: number; enemyScore: number }) => {
    const total = myScore + enemyScore;
    const percentage = total === 0 ? 50 : (myScore / total) * 100;
    const rotation = (percentage / 100) * 180 - 90;

    return (
        <div className="relative w-full h-40 flex items-end justify-center overflow-hidden mb-4">
            <div className="absolute bottom-0 w-64 h-32 bg-gray-800 rounded-t-full border-t-4 border-gray-700 overflow-hidden">
                <div className="absolute inset-0 bg-red-900/30" />
                <div 
                    className="absolute inset-0 bg-system-neon/30 origin-bottom-center" 
                    style={{ transformOrigin: 'bottom center', clipPath: 'polygon(0 0, 50% 0, 50% 100%, 0 100%)' }} 
                />
            </div>
            <motion.div 
                className="absolute bottom-0 left-1/2 w-1 h-28 bg-white origin-bottom z-20"
                initial={{ rotate: -90 }}
                animate={{ rotate: rotation }}
                transition={{ type: "spring", stiffness: 50, damping: 10 }}
                style={{ marginLeft: '-2px' }} 
            >
                <div className="w-4 h-4 bg-white rounded-full absolute -top-2 -left-1.5 shadow-[0_0_10px_white]" />
            </motion.div>
            <div className="absolute bottom-[-10px] w-10 h-10 bg-gray-900 rounded-full border-2 border-gray-600 z-30 flex items-center justify-center">
                <div className="w-2 h-2 bg-gray-500 rounded-full" />
            </div>
            <div className="absolute bottom-10 z-40 bg-gradient-to-r from-orange-500 to-red-600 text-white font-black text-xl italic px-3 py-1 rounded shadow-lg border border-orange-400 transform -skew-x-12">VS</div>
        </div>
    );
};

// --- MAIN COMPONENT ---
const GuildsView: React.FC<GuildsViewProps> = ({ player, onJoin, onLeave }) => {
    // --- STATE ---
    const [viewMode, setViewMode] = useState<'LOCKED' | 'BROWSER' | 'DASHBOARD'>('LOCKED');
    const [activeAlliance, setActiveAlliance] = useState<Alliance | null>(null);
    const [browserList, setBrowserList] = useState<Alliance[]>([]);
    
    // Dashboard Tabs
    const [dashboardTab, setDashboardTab] = useState<'LOGS' | 'CHAT' | 'MEMBERS' | 'INFO' | 'WAR'>('LOGS');
    
    // Creation Form
    const [isCreating, setIsCreating] = useState(false);
    const [createName, setCreateName] = useState('');
    const [createType, setCreateType] = useState<'OPEN' | 'CLOSED'>('OPEN');

    // Chat & Logs
    const [chatLog, setChatLog] = useState<AllianceChatMessage[]>(MOCK_CHAT_MESSAGES);
    const [systemLogs, setSystemLogs] = useState<GuildLog[]>(MOCK_SYSTEM_LOGS);
    const [chatInput, setChatInput] = useState('');
    const chatEndRef = useRef<HTMLDivElement>(null);

    // --- INITIALIZATION ---
    useEffect(() => {
        // 1. Check Level Lock
        if (player.level < 50) {
            setViewMode('LOCKED');
            return;
        }

        // 2. Load Browser List (Static 5 for now)
        const list = generateDummyAlliances();
        setBrowserList(list);

        // 3. Check Persistence
        if (player.allianceId) {
            // Restore alliance data from local storage or mock list
            const savedData = localStorage.getItem(`alliance_data_${player.allianceId}`);
            if (savedData) {
                setActiveAlliance(JSON.parse(savedData));
                setViewMode('DASHBOARD');
            } else {
                // Fallback: Find in list or create temp
                const found = list.find(a => a.id === player.allianceId);
                if (found) {
                    setActiveAlliance(found);
                    setViewMode('DASHBOARD');
                } else {
                    // Player has ID but data missing? (Reset or fetch)
                    // For now, reset
                    onLeave(); 
                    setViewMode('BROWSER');
                }
            }
        } else {
            setViewMode('BROWSER');
        }
    }, [player.level, player.allianceId]);

    // Scroll chat
    useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatLog, dashboardTab]);

    // --- HANDLERS ---

    const handleCreateAlliance = () => {
        if (!createName.trim()) return;
        
        if (player.gold < 5000) {
            playSystemSoundEffect('DANGER');
            alert("Insufficient Gold! Requires 5000 G.");
            return;
        }

        // NOTE: Gold deduction should be handled by parent or hook, 
        // but for now we assume check passed and proceed visually.
        
        const newAlliance: Alliance = {
            id: `alliance_${Date.now()}`,
            name: createName,
            badge: '🛡️',
            description: "A new power rises.",
            type: createType,
            members: [
                { id: 'me', name: player.username || 'You', role: 'LEADER', totalXpContribution: 0, status: 'ONLINE', lastActive: Date.now(), avatarUrl: player.avatarUrl }
            ],
            memberCount: 1,
            totalPower: player.totalXp,
            rules: "Respect the grind."
        };
        
        joinAllianceProcess(newAlliance);
        playSystemSoundEffect('LEVEL_UP');
    };

    const handleJoinClick = (alliance: Alliance) => {
        if (alliance.type === 'CLOSED') {
            alert("Request sent to clan leader.");
            return;
        }
        joinAllianceProcess(alliance);
        playSystemSoundEffect('SUCCESS');
    };

    const joinAllianceProcess = (alliance: Alliance) => {
        const updated = { ...alliance };
        // Save to local storage for persistence
        localStorage.setItem(`alliance_data_${alliance.id}`, JSON.stringify(updated));
        
        setActiveAlliance(updated);
        onJoin(alliance.id); // Update global player state
        setViewMode('DASHBOARD');
    };

    const handleLeave = () => {
        if(confirm("Abandon your clan? This cannot be undone.")) {
            setActiveAlliance(null);
            onLeave(); // Clear global ID
            setViewMode('BROWSER');
        }
    };

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim()) return;
        
        const msg: AllianceChatMessage = {
            id: Date.now().toString(),
            senderName: player.username || 'You',
            text: chatInput,
            timestamp: Date.now(),
            isSystem: false
        };
        setChatLog(prev => [...prev, msg]);
        setChatInput('');
    };

    // --- RENDERERS ---

    if (viewMode === 'LOCKED') {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center p-6 border border-white/10 rounded-2xl glass-panel">
                <Lock size={64} className="text-gray-600 mb-6" />
                <h2 className="text-2xl font-black text-white uppercase tracking-tighter">ALLIANCE SYSTEM LOCKED</h2>
                <p className="text-gray-500 font-mono text-xs mt-2">REQUIRED LEVEL: 50</p>
                <p className="text-system-neon font-mono text-sm mt-4">Current Level: {player.level}</p>
            </div>
        );
    }

    if (viewMode === 'BROWSER') {
        return (
            <div className="w-full max-w-4xl mx-auto pb-24">
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter">Hunter Alliances</h1>
                        <p className="text-xs text-gray-500 font-mono">Join forces. Dominate the War. (Max 10 Members)</p>
                    </div>
                    
                    <button 
                        onClick={() => setIsCreating(!isCreating)}
                        className="px-6 py-3 bg-system-neon text-black font-bold uppercase tracking-widest text-xs rounded hover:bg-white transition-colors shadow-lg flex items-center gap-2"
                    >
                        {isCreating ? <span className="flex items-center gap-2"><Search size={14}/> Browse</span> : <span className="flex items-center gap-2"><Plus size={14}/> Create Clan</span>}
                    </button>
                </div>

                {isCreating ? (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-panel rounded-2xl p-6 max-w-md mx-auto"
                    >
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Crown size={18} className="text-yellow-500" /> Establish New Clan</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] text-gray-500 uppercase font-bold">Clan Name</label>
                                <input 
                                    value={createName}
                                    onChange={e => setCreateName(e.target.value)}
                                    className="w-full bg-black/50 border border-white/10 rounded p-2 text-white font-mono focus:border-system-neon outline-none"
                                    placeholder="e.g. Shadow Monarchs"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-gray-500 uppercase font-bold">Privacy</label>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => setCreateType('OPEN')}
                                        className={`flex-1 py-2 text-xs font-bold rounded border ${createType === 'OPEN' ? 'bg-system-neon text-black border-system-neon' : 'bg-black/50 text-gray-500 border-white/10'}`}
                                    >
                                        OPEN
                                    </button>
                                    <button 
                                        onClick={() => setCreateType('CLOSED')}
                                        className={`flex-1 py-2 text-xs font-bold rounded border ${createType === 'CLOSED' ? 'bg-system-neon text-black border-system-neon' : 'bg-black/50 text-gray-500 border-white/10'}`}
                                    >
                                        CLOSED
                                    </button>
                                </div>
                            </div>
                            <div className="pt-4 border-t border-gray-800">
                                <div className="flex justify-between items-center mb-4 text-xs">
                                    <span className="text-gray-400">Creation Cost</span>
                                    <span className={`font-bold ${player.gold >= 5000 ? 'text-yellow-500' : 'text-red-500'}`}>5000 G</span>
                                </div>
                                <button 
                                    onClick={handleCreateAlliance}
                                    className="w-full py-3 bg-white text-black font-black uppercase tracking-widest text-xs rounded hover:bg-gray-200 transition-colors"
                                >
                                    Confirm Creation
                                </button>
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {browserList.map((alliance) => (
                            <motion.div 
                                key={alliance.id}
                                layout
                                className="glass-card rounded-xl p-4 flex justify-between items-center hover:border-system-neon/30 transition-colors group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-black/40 rounded-lg flex items-center justify-center text-2xl border border-white/10 group-hover:border-system-neon/50 transition-colors">
                                        {alliance.badge}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white uppercase tracking-tight">{alliance.name}</h3>
                                        <div className="flex items-center gap-3 text-[10px] text-gray-500 font-mono mt-1">
                                            <span className="flex items-center gap-1"><Users size={10} /> {alliance.memberCount}/10</span>
                                            <span className="flex items-center gap-1"><Zap size={10} className="text-yellow-500" /> {alliance.totalPower.toLocaleString()} XP</span>
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => handleJoinClick(alliance)}
                                    className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded border transition-all ${alliance.type === 'OPEN' ? 'bg-system-neon text-black border-system-neon hover:bg-white' : 'bg-transparent text-gray-400 border-gray-700 hover:text-white'}`}
                                >
                                    {alliance.type === 'OPEN' ? 'JOIN' : 'REQUEST'}
                                </button>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // --- DASHBOARD VIEW ---
    return (
        <div className="w-full max-w-6xl mx-auto pb-24 h-[calc(100vh-100px)] flex flex-row gap-2 md:gap-4 overflow-hidden">
            
            {/* LEFT SIDEBAR: Controls & Info */}
            <div className="w-20 md:w-1/4 shrink-0 flex flex-col gap-2 md:gap-4">
                
                {/* 1. Clan Power Widget */}
                <div className="glass-card rounded-xl p-2 md:p-4 flex flex-col items-center md:items-start text-center md:text-left relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-yellow-600" />
                    <Trophy className="text-yellow-500 mb-1" size={20} />
                    <div className="text-[9px] md:text-xs text-gray-500 font-bold uppercase tracking-wide">Power</div>
                    <div className="text-[10px] md:text-xl font-black text-white font-mono">{activeAlliance?.totalPower.toLocaleString()}</div>
                </div>

                {/* 2. Member Count Widget */}
                <div className="glass-card rounded-xl p-2 md:p-4 flex flex-col items-center md:items-start text-center md:text-left relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-blue-600" />
                    <Users className="text-blue-500 mb-1" size={20} />
                    <div className="text-[9px] md:text-xs text-gray-500 font-bold uppercase tracking-wide">Members</div>
                    <div className="text-[10px] md:text-xl font-black text-white font-mono">{activeAlliance?.memberCount}/10</div>
                </div>

                {/* 3. Navigation Buttons (Vertical List) */}
                <div className="flex-1 flex flex-col gap-2 mt-2">
                    <button 
                        onClick={() => setDashboardTab('LOGS')}
                        className={`p-2 md:p-3 rounded-lg border text-center md:text-left font-bold text-[9px] md:text-xs uppercase tracking-wider flex flex-col md:flex-row items-center md:gap-3 transition-colors h-16 md:h-auto justify-center ${dashboardTab === 'LOGS' ? 'bg-white/10 border-white/20 text-white shadow-lg backdrop-blur-md' : 'glass-card border-white/5 text-gray-500 hover:bg-white/5'}`}
                    >
                        <ScrollText size={18} className="mb-1 md:mb-0" /> <span className="hidden md:inline">System Log</span> <span className="md:hidden">Log</span>
                    </button>
                    <button 
                        onClick={() => setDashboardTab('CHAT')}
                        className={`p-2 md:p-3 rounded-lg border text-center md:text-left font-bold text-[9px] md:text-xs uppercase tracking-wider flex flex-col md:flex-row items-center md:gap-3 transition-colors h-16 md:h-auto justify-center ${dashboardTab === 'CHAT' ? 'bg-white/10 border-white/20 text-white shadow-lg backdrop-blur-md' : 'glass-card border-white/5 text-gray-500 hover:bg-white/5'}`}
                    >
                        <MessageSquare size={18} className="mb-1 md:mb-0" /> <span className="hidden md:inline">Clan Chat</span> <span className="md:hidden">Chat</span>
                    </button>
                    <button 
                        onClick={() => setDashboardTab('MEMBERS')}
                        className={`p-2 md:p-3 rounded-lg border text-center md:text-left font-bold text-[9px] md:text-xs uppercase tracking-wider flex flex-col md:flex-row items-center md:gap-3 transition-colors h-16 md:h-auto justify-center ${dashboardTab === 'MEMBERS' ? 'bg-white/10 border-white/20 text-white shadow-lg backdrop-blur-md' : 'glass-card border-white/5 text-gray-500 hover:bg-white/5'}`}
                    >
                        <Users size={18} className="mb-1 md:mb-0" /> <span className="hidden md:inline">Roster</span> <span className="md:hidden">Team</span>
                    </button>
                    <button 
                        onClick={() => setDashboardTab('INFO')}
                        className={`p-2 md:p-3 rounded-lg border text-center md:text-left font-bold text-[9px] md:text-xs uppercase tracking-wider flex flex-col md:flex-row items-center md:gap-3 transition-colors h-16 md:h-auto justify-center ${dashboardTab === 'INFO' ? 'bg-white/10 border-white/20 text-white shadow-lg backdrop-blur-md' : 'glass-card border-white/5 text-gray-500 hover:bg-white/5'}`}
                    >
                        <Info size={18} className="mb-1 md:mb-0" /> <span className="hidden md:inline">Clan Intel</span> <span className="md:hidden">Info</span>
                    </button>
                    
                    {/* WAR TAB BUTTON */}
                    <button 
                        onClick={() => setDashboardTab('WAR')}
                        className={`mt-auto p-2 md:p-3 rounded-lg border text-center md:text-left font-bold text-[9px] md:text-xs uppercase tracking-wider flex flex-col md:flex-row items-center md:gap-3 transition-colors h-20 md:h-auto justify-center relative overflow-hidden group ${dashboardTab === 'WAR' ? 'bg-red-950/50 border-red-600 text-white' : 'glass-card border-red-900/30 text-red-500 hover:bg-red-900/20'}`}
                    >
                        <div className={`absolute inset-0 bg-red-600/10 ${true ? 'animate-pulse' : ''}`} />
                        <Swords size={20} className="mb-1 md:mb-0 relative z-10" /> 
                        <span className="relative z-10 hidden md:inline">WAR ROOM</span>
                        <span className="relative z-10 md:hidden">WAR</span>
                        <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-bounce shadow-[0_0_5px_red]" />
                    </button>
                </div>
            </div>

            {/* RIGHT COLUMN: Main Feed / Content */}
            <div className="flex-1 glass-panel rounded-xl flex flex-col overflow-hidden relative shadow-2xl">
                <div className="absolute inset-0 bg-[url('/images/ui/noise.svg')] opacity-5 pointer-events-none" />
                
                {/* --- CONTENT AREA --- */}
                <div className="flex-1 overflow-y-auto relative custom-scrollbar">
                    <AnimatePresence mode="wait">
                        
                        {/* --- LOGS TAB --- */}
                        {dashboardTab === 'LOGS' && (
                            <motion.div 
                                key="logs"
                                variants={tabContentVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                className="flex flex-col h-full"
                            >
                                <div className="p-3 border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm z-10 flex justify-between items-center sticky top-0">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <Bell size={14} /> SYSTEM EVENTS
                                    </span>
                                </div>
                                <div className="p-4 space-y-3">
                                    {systemLogs.map((log) => (
                                        <div key={log.id} className="flex items-start gap-3 p-3 bg-black/20 border border-white/5 rounded-lg hover:bg-white/5 transition-colors">
                                            <div className={`p-2 rounded-full ${log.type === 'SYSTEM' ? 'bg-blue-900/30 text-blue-400' : 'bg-yellow-900/30 text-yellow-400'}`}>
                                                {log.type === 'SYSTEM' ? <Info size={14} /> : <Award size={14} />}
                                            </div>
                                            <div>
                                                <div className="text-[10px] text-gray-500 font-mono mb-1">{new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                                <div className="text-xs text-gray-300">
                                                    {log.user && <span className="font-bold text-white mr-1">{log.user}</span>}
                                                    {log.content}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* --- CHAT TAB --- */}
                        {dashboardTab === 'CHAT' && (
                            <motion.div 
                                key="chat"
                                variants={tabContentVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                className="flex flex-col h-full"
                            >
                                <div className="p-3 border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm z-10 flex justify-between items-center sticky top-0">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <MessageSquare size={14} /> SQUAD COMMS
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <span className="text-[8px] text-gray-600 uppercase">Live</span>
                                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                                    </div>
                                </div>
                                
                                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                    {chatLog.map((msg) => (
                                        <div key={msg.id} className={`flex flex-col ${msg.senderName === (player.username || 'You') ? 'items-end' : 'items-start'}`}>
                                            <span className="text-[9px] text-gray-500 font-bold mb-0.5 ml-1">{msg.senderName}</span>
                                            <div className={`px-3 py-2 rounded-lg max-w-[85%] text-xs font-mono border ${msg.senderName === (player.username || 'You') ? 'bg-system-neon/10 border-system-neon/30 text-white rounded-tr-none' : 'bg-black/40 border-white/10 text-gray-300 rounded-tl-none'}`}>
                                                {msg.text}
                                            </div>
                                            <span className="text-[8px] text-gray-600 mt-0.5 mr-1">{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                        </div>
                                    ))}
                                    <div ref={chatEndRef} />
                                </div>

                                <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-800 bg-black/50 backdrop-blur-sm flex gap-2">
                                    <input 
                                        value={chatInput}
                                        onChange={e => setChatInput(e.target.value)}
                                        placeholder="Transmit..."
                                        className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-system-neon outline-none"
                                    />
                                    <button type="submit" className="p-2 bg-system-neon text-black rounded-lg hover:bg-white transition-colors">
                                        <Send size={16} />
                                    </button>
                                </form>
                            </motion.div>
                        )}

                        {/* --- MEMBERS TAB --- */}
                        {dashboardTab === 'MEMBERS' && (
                            <motion.div 
                                key="members"
                                variants={tabContentVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                className="h-full"
                            >
                                <div className="sticky top-0 bg-gray-900/90 border-b border-gray-800 p-3 text-xs font-bold text-gray-400 uppercase tracking-widest z-10 backdrop-blur-sm flex items-center gap-2">
                                    <Users size={14} /> Active Roster
                                </div>
                                {MOCK_MEMBERS.map((m) => (
                                    <div key={m.id} className="flex items-center p-3 border-b border-gray-800/50 hover:bg-white/5 transition-colors">
                                        <div className="w-8 h-8 bg-black/40 rounded flex items-center justify-center font-bold text-gray-500 mr-3 shrink-0">
                                            {m.name.charAt(0)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-white truncate">{m.name}</span>
                                                {m.role === 'LEADER' && <Crown size={12} className="text-yellow-500" />}
                                            </div>
                                            <div className="text-[10px] text-gray-500 font-mono flex items-center gap-2">
                                                <span className={`w-1.5 h-1.5 rounded-full ${m.status === 'ONLINE' ? 'bg-green-500' : 'bg-gray-600'}`} />
                                                {m.status}
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <div className="text-xs font-black text-system-neon">{m.totalXpContribution.toLocaleString()}</div>
                                            <div className="text-[8px] text-gray-600 uppercase">Contrib</div>
                                        </div>
                                    </div>
                                ))}
                            </motion.div>
                        )}

                        {/* --- INFO TAB --- */}
                        {dashboardTab === 'INFO' && (
                            <motion.div 
                                key="info"
                                variants={tabContentVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                className="p-6 space-y-6"
                            >
                                <div className="text-center pb-4 border-b border-gray-800">
                                    <div className="text-4xl mb-2">{activeAlliance?.badge}</div>
                                    <h2 className="text-2xl font-black text-white uppercase italic">{activeAlliance?.name}</h2>
                                </div>
                                <div>
                                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Manifesto</h3>
                                    <p className="text-sm text-gray-300 font-mono leading-relaxed bg-black/40 p-4 rounded border border-white/5">
                                        {activeAlliance?.description}
                                    </p>
                                </div>
                                <div>
                                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Rules of Engagement</h3>
                                    <p className="text-sm text-gray-300 font-mono leading-relaxed bg-black/40 p-4 rounded border border-white/5">
                                        {activeAlliance?.rules}
                                    </p>
                                </div>
                                <button 
                                    className="w-full py-3 border border-red-900/50 text-red-500 font-bold uppercase text-xs tracking-widest hover:bg-red-900/10 transition-colors rounded"
                                    onClick={handleLeave}
                                >
                                    Leave Alliance
                                </button>
                            </motion.div>
                        )}

                        {/* --- WAR TAB --- */}
                        {dashboardTab === 'WAR' && (
                            <motion.div 
                                key="war"
                                variants={tabContentVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                className="flex flex-col h-full"
                            >
                                <div className="bg-gradient-to-b from-red-950 to-transparent p-6 border-b border-red-900/30 text-center shrink-0">
                                    <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter flex items-center justify-center gap-2">
                                        <Swords size={24} className="text-red-500" /> Alliance War
                                    </h3>
                                    <div className="text-xs text-red-400 font-mono tracking-widest uppercase mt-2 animate-pulse bg-red-900/20 inline-block px-3 py-1 rounded border border-red-900/50">
                                        Combat Phase Active
                                    </div>
                                </div>

                                <div className="flex-1 p-6 flex flex-col items-center">
                                    <div className="flex items-center gap-2 mb-4 w-full justify-center opacity-70">
                                        <span className="text-base font-bold text-gray-400">IRON BLOOD</span>
                                        <div className="w-8 h-8 bg-red-900 rounded flex items-center justify-center text-lg shadow-[0_0_15px_red]">🩸</div>
                                    </div>

                                    <div className="scale-125 mb-4">
                                        <WarGauge myScore={2630} enemyScore={1300} />
                                    </div>

                                    <div className="flex items-center gap-2 mt-[-20px] mb-8 w-full justify-center z-10">
                                        <div className="w-8 h-8 bg-system-neon/20 rounded flex items-center justify-center text-lg shadow-[0_0_15px_#00d2ff]">{activeAlliance?.badge}</div>
                                        <span className="text-base font-bold text-white">{activeAlliance?.name}</span>
                                    </div>

                                    <div className="w-full bg-black/60 border border-gray-800 rounded-xl p-4 mb-4">
                                        <div className="text-[10px] text-gray-500 uppercase font-bold text-center mb-3">Victory Prizes</div>
                                        <div className="flex justify-center gap-6">
                                            <div className="flex flex-col items-center">
                                                <Award className="text-yellow-500 mb-1" size={24} />
                                                <span className="text-[10px] text-white font-mono">Rank Up</span>
                                            </div>
                                            <div className="flex flex-col items-center">
                                                <Coins className="text-yellow-500 mb-1" size={24} />
                                                <span className="text-[10px] text-white font-mono">2000 G</span>
                                            </div>
                                            <div className="flex flex-col items-center">
                                                <Shield className="text-purple-500 mb-1" size={24} />
                                                <span className="text-[10px] text-white font-mono">Legendary</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* --- ACTIVE EVENTS FOOTER (Bottom of Right Column) --- */}
                <div className="p-3 border-t border-gray-800 bg-black/60 backdrop-blur-md grid grid-cols-2 gap-3 shrink-0 relative z-20">
                     <EventBanner 
                        title="COLLECT" 
                        subtitle="DAILY TRIBUTE" 
                        icon={Gift} 
                        color="bg-yellow-500 text-yellow-500" 
                        onClick={() => alert("Tribute Collected!")}
                     />
                     <EventBanner 
                        title="13H 49M" 
                        subtitle="WAR PREP" 
                        icon={Timer} 
                        color="bg-red-500 text-red-500" 
                        onClick={() => setDashboardTab('WAR')}
                     />
                </div>

            </div>

        </div>
    );
};

export default GuildsView;
