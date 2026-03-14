
import React, { useState, useEffect } from 'react';
import { LogOut, Save, RefreshCw, Video, Link, Search, Activity, Plus, Edit3, Trash2, Star, Dumbbell, BookOpen } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { WorkoutDay } from '../types';
import { useSystem, isEmbed } from '../hooks/useSystem';
import { MASTER_PROTOCOL_REGISTRY } from '../utils/workoutGenerator';
import ExerciseLibrary from './admin/ExerciseLibrary';
import PlanBuilder from './admin/PlanBuilder';

interface StoreOutfit {
  id: number;
  outfit_key: string;
  name: string;
  description: string;
  tier: string;
  cost: number;
  accent_color: string;
  image_url: string;
  intro_video_url: string;
  loop_video_url: string;
  attack: number;
  boost: number;
  extraction: number;
  ultimate: number;
  is_default: boolean;
  display_order: number;
}

const emptyForm = (): Omit<StoreOutfit, 'id' | 'is_default' | 'display_order'> & { display_order: number } => ({
  outfit_key: '',
  name: '',
  description: '',
  tier: 'E',
  cost: 0,
  accent_color: '#9ca3af',
  image_url: '',
  intro_video_url: '',
  loop_video_url: '',
  attack: 0,
  boost: 0,
  extraction: 0,
  ultimate: 0,
  display_order: 0,
});

interface AdminDashboardProps {
  adminToken: string;
  onLogout: () => void;
}

type ProtocolCategory = 
  | 'GYM_PPL' 
  | 'GYM_CLASSIC' 
  | 'BW_REGULAR' 
  | 'BW_PPL' 
  | 'DB_PPL' 
  | 'DB_REGULAR';


const AdminDashboard: React.FC<AdminDashboardProps> = ({ adminToken, onLogout }) => {
  const { updateFocusVideos, updateCustomProtocols, player } = useSystem();
  
  // --- STATE ---
  const [activeTab, setActiveTab] = useState<'PROTOCOLS' | 'REGIONS' | 'USERS' | 'STORE' | 'USAGE'>('PROTOCOLS');
  const [selectedCategory, _setSelectedCategory] = useState<ProtocolCategory>('GYM_PPL');
  const [selectedWeek, _setSelectedWeek] = useState<number>(1);
  const [selectedDayIdx, _setSelectedDayIdx] = useState<number>(0);
  
  // Local cache for editing protocol data (e.g. video URLs)
  // Initialize with player's saved protocols if they exist, otherwise master defaults
  const [localRegistry, setLocalRegistry] = useState<Record<string, WorkoutDay[]>>(() => {
      return player.customProtocols && Object.keys(player.customProtocols).length > 0 
        ? player.customProtocols 
        : MASTER_PROTOCOL_REGISTRY;
  });

  // User Data State
  const [users, setUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<string | null>(null);
  const [viewUserData, setViewUserData] = useState<any>(null);
  const [viewUserLoading, setViewUserLoading] = useState(false);
  const [goldInput, setGoldInput] = useState<Record<string, string>>({});
  const [keysInput, setKeysInput] = useState<Record<string, string>>({});

  // Usage State
  const [usageData, setUsageData] = useState<any>(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [usagePeriod, setUsagePeriod] = useState<'today' | 'week' | 'month' | 'all'>('month');

  // Protocols Sub-tab
  const [protocolsSubTab, setProtocolsSubTab] = useState<'EXERCISES' | 'PLANS'>('EXERCISES');

  // Store State
  const [storeOutfits, setStoreOutfits] = useState<StoreOutfit[]>([]);
  const [storeSubTab, setStoreSubTab] = useState<'OUTFITS' | 'ITEMS' | 'SHADOWS'>('OUTFITS');
  const [showOutfitForm, setShowOutfitForm] = useState(false);
  const [editingOutfit, setEditingOutfit] = useState<StoreOutfit | null>(null);
  const [outfitForm, setOutfitForm] = useState(emptyForm());
  const [storeLoading, setStoreLoading] = useState(false);
  const [storeMsg, setStoreMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  // Region Video State
  const [regionVideos, setRegionVideos] = useState<Record<string, string>>(player.focusVideos || {});
  const [isSaving, setIsSaving] = useState(false);

  // Sync state when player data loads from global fetching
  useEffect(() => {
      if (player.focusVideos) {
          setRegionVideos(player.focusVideos);
      }
  }, [player.focusVideos]);

  // --- DATA LOADING ---
  const fetchUsers = async () => {
      try {
          const res = await fetch('/api/admin/users', {
              headers: { 'Authorization': `Bearer ${adminToken}` }
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          setUsers(data || []);
      } catch (err) {
          console.error("Fetch Users Error:", err);
      }
  };

  const banUser = async (id: string) => {
      try {
          const res = await fetch(`/api/admin/users/${id}/ban`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${adminToken}` },
          });
          const data = await res.json();
          if (data.success) {
              setUsers(prev => prev.map(u =>
                  u.supabase_id === id
                      ? { ...u, is_banned: data.is_banned, cheat_strikes: data.cheat_strikes }
                      : u
              ));
          }
      } catch (err) {
          console.error('Ban error:', err);
      }
  };

  const unbanUser = async (id: string) => {
      try {
          const res = await fetch(`/api/admin/users/${id}/unban`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${adminToken}` },
          });
          const data = await res.json();
          if (data.success) {
              const updated = data.user || {};
              setUsers(prev => prev.map(u =>
                  u.supabase_id === id
                      ? { ...u, is_banned: updated.is_banned ?? false, cheat_strikes: updated.cheat_strikes ?? 0 }
                      : u
              ));
          }
      } catch (err) {
          console.error('Unban error:', err);
      }
  };

  const adjustGold = async (id: string, delta: number) => {
      try {
          const res = await fetch(`/api/admin/users/${id}/adjust-gold`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ amount: delta }),
          });
          const data = await res.json();
          if (data.success) {
              setUsers(prev => prev.map(u => u.supabase_id === id ? { ...u, gold: data.gold } : u));
          }
      } catch (err) {
          console.error('Adjust gold error:', err);
      }
  };

  const adjustKeys = async (id: string, delta: number) => {
      try {
          const res = await fetch(`/api/admin/users/${id}/adjust-keys`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ amount: delta }),
          });
          const data = await res.json();
          if (data.success) {
              setUsers(prev => prev.map(u => u.supabase_id === id ? { ...u, keys: data.keys } : u));
          }
      } catch (err) {
          console.error('Adjust keys error:', err);
      }
  };

  const adjustStrikes = async (id: string, delta: 1 | -1) => {
      try {
          const res = await fetch(`/api/admin/users/${id}/adjust-strikes`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ delta }),
          });
          const data = await res.json();
          if (data.success) {
              setUsers(prev => prev.map(u =>
                  u.supabase_id === id
                      ? { ...u, cheat_strikes: data.cheat_strikes, is_banned: data.is_banned }
                      : u
              ));
          }
      } catch (err) {
          console.error('Adjust strikes error:', err);
      }
  };

  const deleteUser = async (id: string) => {
      try {
          const res = await fetch(`/api/admin/users/${id}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${adminToken}` },
          });
          const data = await res.json();
          if (data.success) {
              setUsers(prev => prev.filter(u => u.supabase_id !== id));
              setConfirmDeleteUserId(null);
          }
      } catch (err) {
          console.error('Delete user error:', err);
      }
  };

  const fetchUserData = async (id: string) => {
      setViewUserLoading(true);
      try {
          const res = await fetch(`/api/admin/users/${id}/data`, {
              headers: { 'Authorization': `Bearer ${adminToken}` },
          });
          const data = await res.json();
          setViewUserData(data);
      } catch (err) {
          console.error('Fetch user data error:', err);
      } finally {
          setViewUserLoading(false);
      }
  };

  const fetchUsage = async (period = usagePeriod) => {
      setUsageLoading(true);
      try {
          const res = await fetch(`/api/admin/usage?period=${period}`, { headers: { 'Authorization': `Bearer ${adminToken}` } });
          if (res.ok) setUsageData(await res.json());
      } catch (err) { console.error('Usage fetch error:', err); }
      finally { setUsageLoading(false); }
  };

  useEffect(() => { 
      if (activeTab === 'USERS') fetchUsers();
      if (activeTab === 'STORE') fetchStoreOutfits();
      if (activeTab === 'USAGE') fetchUsage(usagePeriod);
  }, [activeTab]);

  useEffect(() => {
      if (activeTab === 'USAGE') fetchUsage(usagePeriod);
  }, [usagePeriod]);

  useEffect(() => {
      if (activeTab !== 'USAGE') return;
      const interval = setInterval(() => fetchUsage(usagePeriod), 30000);
      return () => clearInterval(interval);
  }, [activeTab, usagePeriod]);

  // Real-time sync: poll every 5s on USERS tab to reflect player-side changes
  useEffect(() => {
      if (activeTab !== 'USERS') return;
      const interval = setInterval(() => fetchUsers(), 5000);
      return () => clearInterval(interval);
  }, [activeTab]);

  // --- STORE ACTIONS ---
  const fetchStoreOutfits = async () => {
      setStoreLoading(true);
      try {
          const res = await fetch('/api/store/outfits', { headers: { 'Authorization': `Bearer ${adminToken}` } });
          const data = await res.json();
          setStoreOutfits(data || []);
      } catch { setStoreMsg({ type: 'error', text: 'Failed to load outfits' }); }
      finally { setStoreLoading(false); }
  };

  const openCreateForm = () => {
      setEditingOutfit(null);
      setOutfitForm(emptyForm());
      setShowOutfitForm(true);
  };

  const openEditForm = (o: StoreOutfit) => {
      setEditingOutfit(o);
      setOutfitForm({
          outfit_key: o.outfit_key,
          name: o.name,
          description: o.description,
          tier: o.tier,
          cost: o.cost,
          accent_color: o.accent_color,
          image_url: o.image_url || '',
          intro_video_url: o.intro_video_url,
          loop_video_url: o.loop_video_url,
          attack: o.attack,
          boost: o.boost,
          extraction: o.extraction,
          ultimate: o.ultimate,
          display_order: o.display_order,
      });
      setShowOutfitForm(true);
  };

  const saveOutfit = async () => {
      setStoreLoading(true);
      setStoreMsg(null);
      try {
          const url = editingOutfit ? `/api/store/outfits/${editingOutfit.id}` : '/api/store/outfits';
          const method = editingOutfit ? 'PUT' : 'POST';
          const res = await fetch(url, {
              method,
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
              body: JSON.stringify(outfitForm),
          });
          if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Save failed'); }
          setStoreMsg({ type: 'success', text: editingOutfit ? 'Outfit updated!' : 'Outfit created!' });
          setShowOutfitForm(false);
          fetchStoreOutfits();
      } catch (err: any) {
          setStoreMsg({ type: 'error', text: err.message });
      } finally { setStoreLoading(false); }
  };

  const deleteOutfit = async (id: number) => {
      setStoreLoading(true);
      try {
          const res = await fetch(`/api/store/outfits/${id}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${adminToken}` },
          });
          if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Delete failed'); }
          setStoreMsg({ type: 'success', text: 'Outfit removed.' });
          setConfirmDeleteId(null);
          fetchStoreOutfits();
      } catch (err: any) {
          setStoreMsg({ type: 'error', text: err.message });
      } finally { setStoreLoading(false); }
  };

  const setDefaultOutfit = async (id: number) => {
      setStoreLoading(true);
      try {
          await fetch(`/api/store/outfits/${id}/set-default`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${adminToken}` },
          });
          setStoreMsg({ type: 'success', text: 'Default outfit updated globally!' });
          fetchStoreOutfits();
      } catch { setStoreMsg({ type: 'error', text: 'Failed to set default' }); }
      finally { setStoreLoading(false); }
  };

  // --- ACTIONS ---
  const _handleUpdateExVideo = (exIdx: number, url: string) => {
      const updated = { ...localRegistry };
      const weekStartIdx = (selectedWeek - 1) * 7;
      const targetDayIdx = weekStartIdx + selectedDayIdx;
      
      if (updated[selectedCategory][targetDayIdx]) {
          // Deep copy to avoid mutation issues
          const days = [...updated[selectedCategory]];
          const day = { ...days[targetDayIdx] };
          const exercises = [...day.exercises];
          exercises[exIdx] = { ...exercises[exIdx], videoUrl: url };
          
          day.exercises = exercises;
          days[targetDayIdx] = day;
          updated[selectedCategory] = days;
          
          setLocalRegistry(updated);
      }
  };

  const _handleSaveProtocol = async () => {
      setIsSaving(true);
      try {
          // 1. Save Structure to Global DB
          await updateCustomProtocols(localRegistry);

          // 2. Extract Videos for Global Sync (New)
          const videoMap: Record<string, string> = {};
          // Iterate through all categories and days to find video links
          (Object.values(localRegistry) as WorkoutDay[][]).forEach(days => {
              days.forEach(day => {
                  day.exercises.forEach(ex => {
                      if (ex.videoUrl && ex.videoUrl.trim() !== '') {
                          videoMap[ex.name] = ex.videoUrl.trim();
                      }
                  });
              });
          });
          
          // 3. Upsert to Global Table
          if (Object.keys(videoMap).length > 0) {
              await updateFocusVideos(videoMap);
          }

          alert("Protocol & Video Links Saved to Cloud Core.");
      } catch (err) {
          alert("Save Failed.");
      } finally {
          setIsSaving(false);
      }
  };

  const handleSaveRegions = async () => {
      setIsSaving(true);
      try {
          // Now updates Global Table via useSystem hook
          await updateFocusVideos(regionVideos);
          alert("Neural Visuals Synced to Cloud.");
      } catch (err) {
          alert(`Sync Failed`);
      } finally {
          setIsSaving(false);
      }
  };

  const currentPlanDays = localRegistry[selectedCategory] || [];
  void currentPlanDays;

  return (
    <div className="min-h-screen bg-black text-white font-mono flex flex-col">
       <header className="sticky top-0 z-30 bg-black/90 backdrop-blur border-b border-gray-800 p-4 shadow-lg">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
             <div className="flex items-center gap-6 w-full md:w-auto">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-system-neon text-black rounded flex items-center justify-center font-black shadow-[0_0_15px_#00d2ff]">GM</div>
                    <div>
                        <h1 className="text-xl font-black italic tracking-tighter text-white">SYSTEM OVERRIDE</h1>
                        <div className="flex gap-4 mt-1">
                            <button onClick={() => setActiveTab('PROTOCOLS')} className={`text-[10px] font-bold tracking-widest transition-colors ${activeTab === 'PROTOCOLS' ? 'text-system-neon' : 'text-gray-600 hover:text-white'}`}>[ MASTER_PROTOCOLS ]</button>
                            <button onClick={() => setActiveTab('REGIONS')} className={`text-[10px] font-bold tracking-widest transition-colors ${activeTab === 'REGIONS' ? 'text-system-neon' : 'text-gray-600 hover:text-white'}`}>[ ANATOMY_VISUALS ]</button>
                            <button onClick={() => setActiveTab('USERS')} className={`text-[10px] font-bold tracking-widest transition-colors ${activeTab === 'USERS' ? 'text-system-neon' : 'text-gray-600 hover:text-white'}`}>[ HUNTER_REGISTRY ]</button>
                            <button onClick={() => setActiveTab('STORE')} className={`text-[10px] font-bold tracking-widest transition-colors ${activeTab === 'STORE' ? 'text-yellow-400' : 'text-gray-600 hover:text-white'}`}>[ STORE ]</button>
                            <button onClick={() => setActiveTab('USAGE')} className={`text-[10px] font-bold tracking-widest transition-colors ${activeTab === 'USAGE' ? 'text-emerald-400' : 'text-gray-600 hover:text-white'}`}>[ USAGE ]</button>
                        </div>
                    </div>
                </div>
             </div>
             <button onClick={onLogout} className="p-2 border border-red-900/30 rounded hover:bg-red-900/20 hover:text-red-500 text-gray-600 transition-all flex items-center gap-2 text-xs">
                <LogOut size={14} /> <span>DISCONNECT</span>
             </button>
          </div>
       </header>

       <main className="flex-1 p-4 md:p-6 overflow-y-auto max-w-7xl mx-auto w-full pb-24">
           
           {activeTab === 'PROTOCOLS' && (
               <div className="space-y-5 animate-in fade-in duration-500">
                   <div className="flex gap-2">
                       {(['EXERCISES', 'PLANS'] as const).map(sub => (
                           <button key={sub} onClick={() => setProtocolsSubTab(sub)}
                               className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all ${protocolsSubTab === sub ? 'bg-system-neon text-black' : 'bg-gray-900 border border-gray-800 text-gray-500 hover:text-white'}`}
                           >
                               {sub === 'EXERCISES' ? <Dumbbell size={11} /> : <BookOpen size={11} />}
                               {sub === 'EXERCISES' ? 'EXERCISE LIBRARY' : 'PREMADE PLANS'}
                           </button>
                       ))}
                   </div>
                   <div className="text-[10px] text-gray-600 font-mono">
                       {protocolsSubTab === 'EXERCISES'
                           ? 'Manage the exercise database. All exercises here are available to AI for generating personalized plans.'
                           : 'Create and manage premade workout programs. Users select these from the Health tab.'}
                   </div>
                   {protocolsSubTab === 'EXERCISES' && <ExerciseLibrary adminToken={adminToken} />}
                   {protocolsSubTab === 'PLANS' && <PlanBuilder adminToken={adminToken} />}
               </div>
           )}

           {activeTab === 'REGIONS' && (
               <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
                   <div className="bg-gray-900/30 border border-gray-800 p-6 rounded-xl flex justify-between items-center">
                       <div>
                           <h2 className="text-white font-bold flex items-center gap-2"><Activity size={18} className="text-system-accent" /> NEURAL VISUALIZER MAPPING</h2>
                           <p className="text-[10px] text-gray-500 font-bold mt-1 uppercase tracking-widest">Global exercise video pointers (Synced across all users)</p>
                       </div>
                       <button onClick={handleSaveRegions} disabled={isSaving} className="px-6 py-2 bg-system-accent text-white font-bold rounded flex items-center gap-2 hover:bg-white hover:text-black transition-all disabled:opacity-50 text-xs shadow-[0_0_15px_rgba(139,92,246,0.3)]">
                           {isSaving ? <RefreshCw className="animate-spin" size={14} /> : <Save size={14} />}
                           SYNC NEURAL LINKS
                       </button>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                       {['CHEST', 'BACK', 'SHOULDERS', 'ARMS', 'LEGS', 'CORE', 'CARDIO', 'REST'].map((region) => (
                           <div key={region} className="bg-[#050505] border border-gray-800 rounded-xl overflow-hidden group hover:border-system-accent/50 transition-colors">
                               <div className="aspect-video bg-gray-900 relative">
                                   {regionVideos[region] ? (
                                       isEmbed(regionVideos[region]) ? (
                                           <iframe src={regionVideos[region]} className="w-full h-full opacity-60 group-hover:opacity-100 transition-opacity" title={region} />
                                       ) : (
                                           <video src={regionVideos[region]} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" autoPlay loop muted playsInline />
                                       )
                                   ) : (
                                       <div className="flex items-center justify-center h-full text-gray-800"><Video size={32} /></div>
                                   )}
                                   <div className="absolute top-2 left-2 bg-black/80 px-2 py-1 rounded text-[10px] font-bold text-white border border-gray-700 font-mono tracking-widest uppercase">{region}</div>
                               </div>
                               <div className="p-4 border-t border-gray-800">
                                   <div className="relative">
                                       <Link size={14} className="absolute left-3 top-3 text-gray-600" />
                                       <input value={regionVideos[region] || ''} onChange={(e) => setRegionVideos({...regionVideos, [region]: e.target.value})} placeholder="Input Video URL (MP4/YT)..." className="w-full bg-black border border-gray-800 rounded p-2 pl-9 text-[10px] text-white focus:outline-none focus:border-system-accent font-mono" />
                                   </div>
                               </div>
                           </div>
                       ))}
                   </div>
               </div>
           )}

           {activeTab === 'USERS' && (
               <div className="space-y-6 animate-in fade-in duration-500">
                   {/* View User Data Modal */}
                   {viewUserData && (
                       <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setViewUserData(null)}>
                           <div className="bg-[#0a0a0a] border border-gray-700 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
                               <div className="flex justify-between items-center mb-4">
                                   <h3 className="text-sm font-black text-white uppercase tracking-widest">Player Data — {viewUserData.username || viewUserData.name || 'Unknown'}</h3>
                                   <button onClick={() => setViewUserData(null)} className="text-gray-500 hover:text-white text-lg">✕</button>
                               </div>
                               <pre className="bg-black border border-gray-800 rounded-xl p-4 text-[10px] text-green-400 font-mono overflow-x-auto whitespace-pre-wrap break-all max-h-[60vh]">
                                   {JSON.stringify(viewUserData, null, 2)}
                               </pre>
                           </div>
                       </div>
                   )}

                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                       <div className="bg-gray-900/40 border border-gray-800 p-4 rounded-xl">
                           <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Registered Hunters</div>
                           <div className="text-2xl font-bold text-white">{users.length}</div>
                       </div>
                       <div className="bg-gray-900/40 border border-gray-800 p-4 rounded-xl">
                           <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Banned</div>
                           <div className="text-2xl font-bold text-red-400">{users.filter(u => u.is_banned).length}</div>
                       </div>
                       <div className="bg-gray-900/40 border border-gray-800 p-4 rounded-xl">
                            <div className="relative h-full flex items-center">
                                <Search size={16} className="absolute left-3 text-gray-600" />
                                <input 
                                    value={userSearch}
                                    onChange={e => setUserSearch(e.target.value)}
                                    placeholder="SEARCH HUNTER REGISTRY..."
                                    className="w-full h-full bg-black border border-gray-800 rounded-lg pl-10 pr-4 text-xs text-white focus:border-system-neon outline-none"
                                />
                            </div>
                       </div>
                   </div>

                   <div className="bg-system-card border border-gray-800 rounded-xl overflow-hidden shadow-2xl">
                       <div className="overflow-x-auto">
                           <table className="w-full text-left border-collapse">
                               <thead>
                                   <tr className="bg-gray-900/50 text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                                       <th className="p-3 border-b border-gray-800">Hunter</th>
                                       <th className="p-3 border-b border-gray-800">Rank</th>
                                       <th className="p-3 border-b border-gray-800">Status</th>
                                       <th className="p-3 border-b border-gray-800 text-center">Gold</th>
                                       <th className="p-3 border-b border-gray-800 text-center">Keys</th>
                                       <th className="p-3 border-b border-gray-800 text-center">Strikes</th>
                                       <th className="p-3 border-b border-gray-800 text-right">Actions</th>
                                   </tr>
                               </thead>
                               <tbody>
                                   {users.filter(u => {
                                       const q = userSearch.toLowerCase();
                                       return (u.username?.toLowerCase().includes(q) || u.name?.toLowerCase().includes(q) || u.supabase_id?.toLowerCase().includes(q));
                                   }).map((user) => (
                                       <tr key={user.supabase_id} className={`border-b border-gray-800/50 transition-colors ${user.is_banned ? 'bg-red-950/10 hover:bg-red-950/20' : 'hover:bg-white/5'}`}>
                                           <td className="p-3">
                                               <div className="font-bold text-sm text-white">{user.username || 'ANONYMOUS'}</div>
                                               <div className="text-[10px] text-gray-600 mt-0.5">{user.name}</div>
                                               <div className="text-[8px] text-gray-700 mt-0.5 font-mono">{user.supabase_id?.slice(0, 12)}...</div>
                                           </td>
                                           <td className="p-3">
                                               <span className="text-[10px] bg-gray-800 px-2 py-1 rounded text-gray-400 font-bold tracking-widest uppercase">
                                                   {user.rank || 'E'} · Lv{user.level || 1}
                                               </span>
                                           </td>
                                           <td className="p-3">
                                               {user.is_banned ? (
                                                   <span className="text-[10px] bg-red-950 border border-red-800 px-2 py-1 rounded text-red-400 font-bold tracking-widest uppercase">BANNED</span>
                                               ) : (
                                                   <span className="text-[10px] bg-green-950/40 border border-green-900 px-2 py-1 rounded text-green-500 font-bold tracking-widest uppercase">ACTIVE</span>
                                               )}
                                           </td>
                                           {/* Gold column with custom input */}
                                           <td className="p-3 text-center">
                                               <div className="flex flex-col items-center gap-1">
                                                   <span className="text-xs font-mono font-bold text-yellow-400">{user.gold ?? 0}</span>
                                                   <div className="flex items-center gap-1">
                                                       <button onClick={() => adjustGold(user.supabase_id, -100)} className="w-5 h-5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 text-[9px] font-black flex items-center justify-center border border-gray-700" title="-100">−</button>
                                                       <input
                                                           type="number"
                                                           value={goldInput[user.supabase_id] ?? ''}
                                                           onChange={e => setGoldInput(prev => ({ ...prev, [user.supabase_id]: e.target.value }))}
                                                           onKeyDown={e => { if (e.key === 'Enter') { const v = parseInt(goldInput[user.supabase_id]); if (!isNaN(v)) { adjustGold(user.supabase_id, v); setGoldInput(prev => ({ ...prev, [user.supabase_id]: '' })); } } }}
                                                           placeholder="±"
                                                           className="w-14 bg-black border border-gray-700 rounded px-1 py-0.5 text-[10px] text-yellow-400 text-center outline-none focus:border-yellow-500 font-mono"
                                                       />
                                                       <button onClick={() => adjustGold(user.supabase_id, 100)} className="w-5 h-5 rounded bg-yellow-900/40 hover:bg-yellow-900/70 text-yellow-400 text-[9px] font-black flex items-center justify-center border border-yellow-800/50" title="+100">+</button>
                                                   </div>
                                               </div>
                                           </td>
                                           {/* Keys column with custom input */}
                                           <td className="p-3 text-center">
                                               <div className="flex flex-col items-center gap-1">
                                                   <span className="text-xs font-mono font-bold text-purple-400">{user.keys ?? 0}</span>
                                                   <div className="flex items-center gap-1">
                                                       <button onClick={() => adjustKeys(user.supabase_id, -1)} className="w-5 h-5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 text-[9px] font-black flex items-center justify-center border border-gray-700" title="-1">−</button>
                                                       <input
                                                           type="number"
                                                           value={keysInput[user.supabase_id] ?? ''}
                                                           onChange={e => setKeysInput(prev => ({ ...prev, [user.supabase_id]: e.target.value }))}
                                                           onKeyDown={e => { if (e.key === 'Enter') { const v = parseInt(keysInput[user.supabase_id]); if (!isNaN(v)) { adjustKeys(user.supabase_id, v); setKeysInput(prev => ({ ...prev, [user.supabase_id]: '' })); } } }}
                                                           placeholder="±"
                                                           className="w-14 bg-black border border-gray-700 rounded px-1 py-0.5 text-[10px] text-purple-400 text-center outline-none focus:border-purple-500 font-mono"
                                                       />
                                                       <button onClick={() => adjustKeys(user.supabase_id, 1)} className="w-5 h-5 rounded bg-purple-900/40 hover:bg-purple-900/70 text-purple-400 text-[9px] font-black flex items-center justify-center border border-purple-800/50" title="+1">+</button>
                                                   </div>
                                               </div>
                                           </td>
                                           {/* Strikes */}
                                           <td className="p-3 text-center">
                                               <div className="flex items-center justify-center gap-1">
                                                   {Array.from({ length: 5 }).map((_, i) => (
                                                       <div key={i} className={`w-2 h-2 rounded-full ${i < (user.cheat_strikes || 0) ? 'bg-red-500' : 'bg-gray-800'}`} />
                                                   ))}
                                                   <span className="text-[9px] text-gray-600 ml-1 font-mono">{user.cheat_strikes || 0}/5</span>
                                               </div>
                                               <div className="flex items-center justify-center gap-1 mt-1">
                                                   <button
                                                       onClick={() => adjustStrikes(user.supabase_id, -1)}
                                                       disabled={(user.cheat_strikes ?? 0) <= 0}
                                                       className="text-[8px] bg-green-900/30 hover:bg-green-900/60 border border-green-800/60 text-green-400 px-1.5 py-0.5 rounded font-black uppercase transition-all disabled:opacity-25 disabled:cursor-not-allowed"
                                                   >−1</button>
                                                   <button
                                                       onClick={() => adjustStrikes(user.supabase_id, 1)}
                                                       disabled={(user.cheat_strikes ?? 0) >= 5}
                                                       className="text-[8px] bg-red-950/40 hover:bg-red-950/80 border border-red-900/60 text-red-400 px-1.5 py-0.5 rounded font-black uppercase transition-all disabled:opacity-25 disabled:cursor-not-allowed"
                                                   >+1</button>
                                               </div>
                                           </td>
                                           {/* Actions: View Data, Delete */}
                                           <td className="p-3 text-right">
                                               <div className="flex flex-col items-end gap-1">
                                                   <button
                                                       onClick={() => fetchUserData(user.supabase_id)}
                                                       disabled={viewUserLoading}
                                                       className="text-[9px] bg-blue-950/40 hover:bg-blue-900/60 border border-blue-800/50 text-blue-400 px-2 py-1 rounded font-bold tracking-widest uppercase transition-all"
                                                   >
                                                       {viewUserLoading ? '...' : 'VIEW DATA'}
                                                   </button>
                                                   {confirmDeleteUserId === user.supabase_id ? (
                                                       <div className="flex gap-1">
                                                           <button onClick={() => deleteUser(user.supabase_id)} className="text-[8px] px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded font-black uppercase">CONFIRM</button>
                                                           <button onClick={() => setConfirmDeleteUserId(null)} className="text-[8px] px-2 py-1 bg-gray-700 text-gray-300 rounded font-bold">NO</button>
                                                       </div>
                                                   ) : (
                                                       <button
                                                           onClick={() => setConfirmDeleteUserId(user.supabase_id)}
                                                           className="text-[9px] bg-red-950/40 hover:bg-red-900/60 border border-red-800/50 text-red-400 px-2 py-1 rounded font-bold tracking-widest uppercase transition-all"
                                                       >
                                                           DELETE
                                                       </button>
                                                   )}
                                               </div>
                                           </td>
                                       </tr>
                                   ))}
                                   {users.length === 0 && (
                                       <tr><td colSpan={7} className="p-8 text-center text-gray-600 text-xs font-mono">No users found</td></tr>
                                   )}
                               </tbody>
                           </table>
                       </div>
                   </div>
               </div>
           )}
          {/* ── STORE TAB ── */}
          {activeTab === 'STORE' && (
              <div className="space-y-6 animate-in fade-in duration-500">
                  {/* Status message */}
                  {storeMsg && (
                      <div className={`px-4 py-2 rounded-lg text-xs font-bold ${storeMsg.type === 'success' ? 'bg-green-900/40 border border-green-700 text-green-400' : 'bg-red-900/40 border border-red-700 text-red-400'}`}>
                          {storeMsg.text}
                          <button onClick={() => setStoreMsg(null)} className="ml-2 opacity-60 hover:opacity-100">✕</button>
                      </div>
                  )}

                  {/* Sub-tabs */}
                  <div className="flex gap-2">
                      {(['OUTFITS', 'ITEMS', 'SHADOWS'] as const).map(tab => (
                          <button
                              key={tab}
                              onClick={() => setStoreSubTab(tab)}
                              className={`px-4 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all ${storeSubTab === tab ? 'bg-yellow-400 text-black' : 'bg-gray-900 border border-gray-800 text-gray-500 hover:text-white'}`}
                          >
                              {tab}
                          </button>
                      ))}
                  </div>

                  {/* ── OUTFITS SUB-TAB ── */}
                  {storeSubTab === 'OUTFITS' && (
                      <div className="space-y-4">
                          <div className="flex items-center justify-between">
                              <h3 className="text-sm font-black text-white uppercase tracking-widest">Outfit Registry</h3>
                              <button
                                  onClick={openCreateForm}
                                  className="flex items-center gap-1.5 px-3 py-2 bg-yellow-400 hover:bg-yellow-300 text-black rounded-lg text-xs font-black tracking-widest uppercase transition-all"
                              >
                                  <Plus size={12} /> CREATE NEW OUTFIT
                              </button>
                          </div>

                          {/* Create/Edit Form */}
                          {showOutfitForm && (
                              <div className="bg-gray-900/80 border border-yellow-400/30 rounded-xl p-5 space-y-4">
                                  <h4 className="text-yellow-400 font-black text-xs tracking-widest uppercase">
                                      {editingOutfit ? `EDITING: ${editingOutfit.name}` : 'CREATE NEW OUTFIT'}
                                  </h4>

                                  <div className="grid grid-cols-2 gap-3">
                                      <div>
                                          <label className="text-[9px] text-gray-500 uppercase tracking-widest font-bold block mb-1">Outfit Key (unique ID)</label>
                                          <input
                                              value={outfitForm.outfit_key}
                                              onChange={e => setOutfitForm(f => ({ ...f, outfit_key: e.target.value }))}
                                              placeholder="outfit_example"
                                              disabled={!!editingOutfit}
                                              className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-xs text-white outline-none focus:border-yellow-400 disabled:opacity-50"
                                          />
                                      </div>
                                      <div>
                                          <label className="text-[9px] text-gray-500 uppercase tracking-widest font-bold block mb-1">Name</label>
                                          <input
                                              value={outfitForm.name}
                                              onChange={e => setOutfitForm(f => ({ ...f, name: e.target.value }))}
                                              placeholder="Outfit Name"
                                              className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-xs text-white outline-none focus:border-yellow-400"
                                          />
                                      </div>
                                      <div className="col-span-2">
                                          <label className="text-[9px] text-gray-500 uppercase tracking-widest font-bold block mb-1">Description</label>
                                          <input
                                              value={outfitForm.description}
                                              onChange={e => setOutfitForm(f => ({ ...f, description: e.target.value }))}
                                              placeholder="Outfit description..."
                                              className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-xs text-white outline-none focus:border-yellow-400"
                                          />
                                      </div>
                                      <div>
                                          <label className="text-[9px] text-gray-500 uppercase tracking-widest font-bold block mb-1">Tier</label>
                                          <select
                                              value={outfitForm.tier}
                                              onChange={e => setOutfitForm(f => ({ ...f, tier: e.target.value }))}
                                              className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-xs text-white outline-none focus:border-yellow-400"
                                          >
                                              {['E','D','C','B','A','S'].map(t => <option key={t} value={t}>{t}-Rank</option>)}
                                          </select>
                                      </div>
                                      <div>
                                          <label className="text-[9px] text-gray-500 uppercase tracking-widest font-bold block mb-1">Cost (Gold)</label>
                                          <input
                                              type="number"
                                              value={outfitForm.cost}
                                              onChange={e => setOutfitForm(f => ({ ...f, cost: parseInt(e.target.value) || 0 }))}
                                              className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-xs text-white outline-none focus:border-yellow-400"
                                          />
                                      </div>
                                      <div>
                                          <label className="text-[9px] text-gray-500 uppercase tracking-widest font-bold block mb-1">Accent Color</label>
                                          <div className="flex gap-2">
                                              <input
                                                  type="color"
                                                  value={outfitForm.accent_color}
                                                  onChange={e => setOutfitForm(f => ({ ...f, accent_color: e.target.value }))}
                                                  className="w-10 h-8 rounded border border-gray-700 bg-black cursor-pointer"
                                              />
                                              <input
                                                  value={outfitForm.accent_color}
                                                  onChange={e => setOutfitForm(f => ({ ...f, accent_color: e.target.value }))}
                                                  className="flex-1 bg-black border border-gray-700 rounded px-2 py-2 text-xs text-white outline-none focus:border-yellow-400"
                                              />
                                          </div>
                                      </div>
                                      <div>
                                          <label className="text-[9px] text-gray-500 uppercase tracking-widest font-bold block mb-1">Display Order</label>
                                          <input
                                              type="number"
                                              value={outfitForm.display_order}
                                              onChange={e => setOutfitForm(f => ({ ...f, display_order: parseInt(e.target.value) || 0 }))}
                                              className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-xs text-white outline-none focus:border-yellow-400"
                                          />
                                      </div>
                                      <div className="col-span-2">
                                          <label className="text-[9px] text-gray-500 uppercase tracking-widest font-bold block mb-1">Image URL (character photo)</label>
                                          <div className="flex gap-2 items-center">
                                              <input
                                                  value={outfitForm.image_url}
                                                  onChange={e => setOutfitForm(f => ({ ...f, image_url: e.target.value }))}
                                                  placeholder="https://res.cloudinary.com/... or any image URL"
                                                  className="flex-1 bg-black border border-gray-700 rounded px-3 py-2 text-xs text-white outline-none focus:border-yellow-400"
                                              />
                                              {outfitForm.image_url && (
                                                  <img
                                                      src={outfitForm.image_url}
                                                      alt="preview"
                                                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                      onLoad={e => { (e.target as HTMLImageElement).style.display = 'block'; }}
                                                      className="w-10 h-14 object-cover rounded border border-gray-600 flex-shrink-0"
                                                  />
                                              )}
                                          </div>
                                      </div>
                                      <div className="col-span-2">
                                          <label className="text-[9px] text-gray-500 uppercase tracking-widest font-bold block mb-1">Intro Video URL (Cloudinary)</label>
                                          <input
                                              value={outfitForm.intro_video_url}
                                              onChange={e => setOutfitForm(f => ({ ...f, intro_video_url: e.target.value }))}
                                              placeholder="https://res.cloudinary.com/..."
                                              className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-xs text-white outline-none focus:border-yellow-400"
                                          />
                                      </div>
                                      <div className="col-span-2">
                                          <label className="text-[9px] text-gray-500 uppercase tracking-widest font-bold block mb-1">Loop Video URL (Cloudinary)</label>
                                          <input
                                              value={outfitForm.loop_video_url}
                                              onChange={e => setOutfitForm(f => ({ ...f, loop_video_url: e.target.value }))}
                                              placeholder="https://res.cloudinary.com/..."
                                              className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-xs text-white outline-none focus:border-yellow-400"
                                          />
                                      </div>
                                  </div>

                                  {/* Stats sliders */}
                                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-800">
                                      {(['attack', 'boost', 'extraction', 'ultimate'] as const).map(stat => {
                                          const colors: Record<string, string> = { attack: '#ef4444', boost: '#4ade80', extraction: '#3b82f6', ultimate: '#a855f7' };
                                          const labels: Record<string, string> = { attack: 'Attack', boost: 'Boost', extraction: 'Extract', ultimate: 'Ultimate' };
                                          return (
                                              <div key={stat}>
                                                  <div className="flex justify-between items-center mb-1">
                                                      <label className="text-[9px] font-black uppercase tracking-widest" style={{ color: colors[stat] }}>{labels[stat]}</label>
                                                      <span className="text-[10px] font-mono text-white">{outfitForm[stat]} / 100</span>
                                                  </div>
                                                  <div className="flex gap-2 items-center">
                                                      <input
                                                          type="range"
                                                          min={0}
                                                          max={100}
                                                          value={outfitForm[stat]}
                                                          onChange={e => setOutfitForm(f => ({ ...f, [stat]: parseInt(e.target.value) }))}
                                                          className="flex-1 accent-yellow-400"
                                                      />
                                                      <input
                                                          type="number"
                                                          min={0}
                                                          max={100}
                                                          value={outfitForm[stat]}
                                                          onChange={e => setOutfitForm(f => ({ ...f, [stat]: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) }))}
                                                          className="w-14 bg-black border border-gray-700 rounded px-2 py-1 text-xs text-white outline-none text-center"
                                                      />
                                                  </div>
                                              </div>
                                          );
                                      })}
                                  </div>

                                  <div className="flex gap-2 pt-2">
                                      <button
                                          onClick={saveOutfit}
                                          disabled={storeLoading}
                                          className="flex-1 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-black rounded-lg text-xs font-black tracking-widest uppercase transition-all disabled:opacity-50"
                                      >
                                          {storeLoading ? 'SAVING...' : editingOutfit ? 'UPDATE OUTFIT' : 'CREATE OUTFIT'}
                                      </button>
                                      <button
                                          onClick={() => setShowOutfitForm(false)}
                                          className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-bold uppercase transition-all"
                                      >
                                          CANCEL
                                      </button>
                                  </div>
                              </div>
                          )}

                          {/* Outfit List */}
                          {storeLoading && !showOutfitForm ? (
                              <div className="text-center py-8 text-gray-600 text-xs font-mono">LOADING OUTFIT REGISTRY...</div>
                          ) : (
                              <div className="space-y-2">
                                  {storeOutfits.map(o => (
                                      <div key={o.id} className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-all">
                                          <div className="flex items-start justify-between gap-3">
                                              <div className="flex-1 min-w-0">
                                                  <div className="flex items-center gap-2 mb-1">
                                                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: o.accent_color, boxShadow: `0 0 6px ${o.accent_color}` }} />
                                                      <span className="text-sm font-black text-white truncate">{o.name}</span>
                                                      <span className="text-[8px] font-black tracking-widest px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: `${o.accent_color}22`, border: `1px solid ${o.accent_color}55`, color: o.accent_color }}>
                                                          {o.tier}-RANK
                                                      </span>
                                                      {o.is_default && (
                                                          <span className="flex items-center gap-0.5 text-[8px] font-black tracking-widest px-1.5 py-0.5 rounded-full bg-yellow-400/20 border border-yellow-400/50 text-yellow-400 flex-shrink-0">
                                                              <Star size={7} /> DEFAULT
                                                          </span>
                                                      )}
                                                  </div>
                                                  <div className="text-[10px] text-gray-500 mb-2 font-mono">{o.outfit_key} · {o.cost.toLocaleString()} G</div>

                                                  {/* Mini stat bars */}
                                                  <div className="grid grid-cols-4 gap-1">
                                                      {[
                                                          { label: 'ATK', val: o.attack, color: '#ef4444' },
                                                          { label: 'BST', val: o.boost, color: '#4ade80' },
                                                          { label: 'EXT', val: o.extraction, color: '#3b82f6' },
                                                          { label: 'ULT', val: o.ultimate, color: '#a855f7' },
                                                      ].map(s => (
                                                          <div key={s.label}>
                                                              <div className="text-[7px] font-mono mb-0.5" style={{ color: s.color }}>{s.label} {s.val}</div>
                                                              <div className="h-1 rounded-full bg-gray-800 overflow-hidden">
                                                                  <div className="h-full rounded-full transition-all" style={{ width: `${s.val}%`, background: s.color }} />
                                                              </div>
                                                          </div>
                                                      ))}
                                                  </div>
                                              </div>

                                              {/* Action buttons */}
                                              <div className="flex flex-col gap-1 flex-shrink-0">
                                                  <button
                                                      onClick={() => openEditForm(o)}
                                                      className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-[9px] font-bold tracking-widest uppercase transition-all"
                                                  >
                                                      <Edit3 size={10} /> EDIT
                                                  </button>
                                                  <button
                                                      onClick={() => setDefaultOutfit(o.id)}
                                                      disabled={o.is_default}
                                                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-[9px] font-bold tracking-widest uppercase transition-all ${o.is_default ? 'bg-yellow-400/10 text-yellow-400 cursor-default' : 'bg-gray-800 hover:bg-yellow-400/20 text-gray-300 hover:text-yellow-400'}`}
                                                  >
                                                      <Star size={10} /> {o.is_default ? 'DEFAULT' : 'SET DEFAULT'}
                                                  </button>
                                                  {confirmDeleteId === o.id ? (
                                                      <div className="flex gap-1">
                                                          <button onClick={() => deleteOutfit(o.id)} className="flex-1 px-2 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-[8px] font-black uppercase">CONFIRM</button>
                                                          <button onClick={() => setConfirmDeleteId(null)} className="flex-1 px-2 py-1.5 bg-gray-700 text-gray-300 rounded text-[8px] font-bold">NO</button>
                                                      </div>
                                                  ) : (
                                                      <button
                                                          onClick={() => setConfirmDeleteId(o.id)}
                                                          className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-800 hover:bg-red-900/40 text-gray-300 hover:text-red-400 rounded text-[9px] font-bold tracking-widest uppercase transition-all"
                                                      >
                                                          <Trash2 size={10} /> REMOVE
                                                      </button>
                                                  )}
                                              </div>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          )}
                      </div>
                  )}

                  {/* ── ITEMS SUB-TAB ── */}
                  {storeSubTab === 'ITEMS' && (
                      <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-8 text-center">
                          <div className="text-4xl mb-3">⚡</div>
                          <div className="text-sm font-black text-white uppercase tracking-widest mb-1">Items System</div>
                          <div className="text-xs text-gray-500 font-mono">Coming Soon — Items system is under development</div>
                      </div>
                  )}

                  {/* ── SHADOWS SUB-TAB ── */}
                  {storeSubTab === 'SHADOWS' && (
                      <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-8 text-center">
                          <div className="text-4xl mb-3">👻</div>
                          <div className="text-sm font-black text-white uppercase tracking-widest mb-1">Shadows System</div>
                          <div className="text-xs text-gray-500 font-mono">Coming Soon — Shadow Army management under development</div>
                      </div>
                  )}
              </div>
          )}
          {/* ── USAGE TAB ── */}
          {activeTab === 'USAGE' && (
              <div className="space-y-6 animate-in fade-in duration-500">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                          <div className="text-xs font-black text-emerald-400 uppercase tracking-widest mb-0.5">Gemini API — Collective Usage</div>
                          <div className="text-[10px] text-gray-600 font-mono">All users combined · costs in INR (₹83.5/USD) · auto-refreshes 30s</div>
                      </div>
                      <div className="flex gap-2 items-center">
                          {(['today', 'week', 'month', 'all'] as const).map(p => (
                              <button key={p} onClick={() => setUsagePeriod(p)}
                                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${usagePeriod === p ? 'bg-emerald-500 text-black' : 'bg-gray-900 border border-gray-800 text-gray-500 hover:text-white'}`}
                              >
                                  {p === 'all' ? 'ALL TIME' : p.toUpperCase()}
                              </button>
                          ))}
                          <button onClick={() => fetchUsage(usagePeriod)} disabled={usageLoading} className="px-3 py-1.5 bg-gray-900 border border-gray-800 rounded-lg text-[10px] font-bold text-gray-400 hover:text-white transition-all uppercase tracking-widest">
                              {usageLoading ? '...' : '↻'}
                          </button>
                      </div>
                  </div>

                  {usageLoading && !usageData ? (
                      <div className="text-center py-20 text-gray-600 font-mono text-xs">Loading usage data...</div>
                  ) : usageData ? (
                      <>
                          {/* Summary Cards */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              <div className="bg-gray-900/40 border border-emerald-900/40 p-4 rounded-xl">
                                  <div className="text-[9px] text-emerald-600 uppercase tracking-widest font-bold mb-1">Total Cost (INR)</div>
                                  <div className="text-xl font-black text-emerald-400">₹{Number(usageData.totalCostInr || 0).toFixed(2)}</div>
                                  <div className="text-[9px] text-gray-600 mt-0.5 font-mono">${Number(usageData.totalCostUsd || 0).toFixed(4)} USD</div>
                              </div>
                              <div className="bg-gray-900/40 border border-gray-800 p-4 rounded-xl">
                                  <div className="text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1">API Calls</div>
                                  <div className="text-xl font-black text-white">{Number(usageData.totalCalls || 0).toLocaleString()}</div>
                                  <div className="text-[9px] text-gray-600 mt-0.5 font-mono">generateContent requests</div>
                              </div>
                              <div className="bg-gray-900/40 border border-gray-800 p-4 rounded-xl">
                                  <div className="text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1">Total Tokens</div>
                                  <div className="text-xl font-black text-white">{Number(usageData.totalTokens || 0).toLocaleString()}</div>
                                  <div className="text-[9px] text-gray-600 mt-0.5 font-mono">input + output</div>
                              </div>
                              <div className="bg-gray-900/40 border border-gray-800 p-4 rounded-xl">
                                  <div className="text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1">Unique Users</div>
                                  <div className="text-xl font-black text-white">{Number(usageData.uniqueUsers || 0).toLocaleString()}</div>
                                  <div className="text-[9px] text-gray-600 mt-0.5 font-mono">made AI calls</div>
                              </div>
                          </div>

                          {/* Time-series Chart */}
                          {(usageData.timeSeries || []).length > 1 && (
                              <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-5">
                                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Cost Over Time (INR)</div>
                                  <ResponsiveContainer width="100%" height={180}>
                                      <BarChart data={(usageData.timeSeries || []).map((d: any) => ({ ...d, cost_inr: Number((d.cost_inr || d.cost_usd * 83.5)).toFixed(2) }))} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                          <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                                          <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#555' }} tickLine={false} axisLine={false} />
                                          <YAxis tick={{ fontSize: 9, fill: '#555' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `₹${v}`} width={50} />
                                          <Tooltip
                                              contentStyle={{ background: '#0a0a0a', border: '1px solid #222', borderRadius: 8, fontSize: 11 }}
                                              labelStyle={{ color: '#aaa', fontWeight: 'bold' }}
                                              formatter={(v: any) => [`₹${Number(v).toFixed(2)}`, 'Cost']}
                                          />
                                          <Bar dataKey="cost_inr" fill="#10b981" radius={[3, 3, 0, 0]} />
                                      </BarChart>
                                  </ResponsiveContainer>
                              </div>
                          )}

                          {/* By Model */}
                          <div className="bg-system-card border border-gray-800 rounded-xl overflow-hidden">
                              <div className="px-4 py-3 border-b border-gray-800 bg-gray-900/50">
                                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">By Model</div>
                              </div>
                              <div className="overflow-x-auto">
                                  <table className="w-full text-left border-collapse">
                                      <thead>
                                          <tr className="text-[9px] text-gray-600 uppercase tracking-widest border-b border-gray-800/50">
                                              <th className="p-3">Model</th>
                                              <th className="p-3 text-right">Calls</th>
                                              <th className="p-3 text-right">Input</th>
                                              <th className="p-3 text-right">Output</th>
                                              <th className="p-3 text-right">Cost (INR)</th>
                                              <th className="p-3 text-right">Cost (USD)</th>
                                          </tr>
                                      </thead>
                                      <tbody>
                                          {(usageData.byModel || []).map((row: any) => (
                                              <tr key={row.model} className="border-b border-gray-800/30 hover:bg-white/5 transition-colors">
                                                  <td className="p-3">
                                                      <span className={`text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest ${
                                                          row.model.includes('2.0-flash') ? 'bg-emerald-950/50 border border-emerald-900/50 text-emerald-400' :
                                                          row.model.includes('1.5-flash') ? 'bg-blue-950/50 border border-blue-900/50 text-blue-400' :
                                                          row.model.includes('pro') ? 'bg-purple-950/50 border border-purple-900/50 text-purple-400' :
                                                          row.model.includes('image') ? 'bg-amber-950/50 border border-amber-900/50 text-amber-400' :
                                                          'bg-gray-800 text-gray-400'
                                                      }`}>{row.model}</span>
                                                  </td>
                                                  <td className="p-3 text-right text-sm font-bold text-white">{Number(row.calls).toLocaleString()}</td>
                                                  <td className="p-3 text-right text-xs text-gray-400">{Number(row.input_tokens).toLocaleString()}</td>
                                                  <td className="p-3 text-right text-xs text-gray-400">{Number(row.output_tokens).toLocaleString()}</td>
                                                  <td className="p-3 text-right text-sm font-bold text-emerald-400">₹{(Number(row.cost_inr || row.cost_usd * 83.5)).toFixed(2)}</td>
                                                  <td className="p-3 text-right text-xs text-gray-500">${Number(row.cost_usd).toFixed(4)}</td>
                                              </tr>
                                          ))}
                                          {(usageData.byModel || []).length === 0 && (
                                              <tr><td colSpan={6} className="p-6 text-center text-[10px] text-gray-600 font-mono">No API calls logged for this period</td></tr>
                                          )}
                                      </tbody>
                                  </table>
                              </div>
                          </div>

                          {/* By Route */}
                          <div className="bg-system-card border border-gray-800 rounded-xl overflow-hidden">
                              <div className="px-4 py-3 border-b border-gray-800 bg-gray-900/50">
                                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">By Route</div>
                              </div>
                              <div className="overflow-x-auto">
                                  <table className="w-full text-left border-collapse">
                                      <thead>
                                          <tr className="text-[9px] text-gray-600 uppercase tracking-widest border-b border-gray-800/50">
                                              <th className="p-3">Route</th>
                                              <th className="p-3 text-right">Calls</th>
                                              <th className="p-3 text-right">Cost (INR)</th>
                                              <th className="p-3 text-right">Cost (USD)</th>
                                          </tr>
                                      </thead>
                                      <tbody>
                                          {(usageData.byRoute || []).map((row: any) => (
                                              <tr key={row.route} className="border-b border-gray-800/30 hover:bg-white/5 transition-colors">
                                                  <td className="p-3 text-xs font-mono text-gray-300">{row.route}</td>
                                                  <td className="p-3 text-right text-sm font-bold text-white">{Number(row.calls).toLocaleString()}</td>
                                                  <td className="p-3 text-right text-sm font-bold text-emerald-400">₹{(Number(row.cost_inr || row.cost_usd * 83.5)).toFixed(2)}</td>
                                                  <td className="p-3 text-right text-xs text-gray-500">${Number(row.cost_usd).toFixed(4)}</td>
                                              </tr>
                                          ))}
                                          {(usageData.byRoute || []).length === 0 && (
                                              <tr><td colSpan={4} className="p-6 text-center text-[10px] text-gray-600 font-mono">No data for this period</td></tr>
                                          )}
                                      </tbody>
                                  </table>
                              </div>
                          </div>

                          {/* Recent Calls */}
                          <div className="bg-system-card border border-gray-800 rounded-xl overflow-hidden">
                              <div className="px-4 py-3 border-b border-gray-800 bg-gray-900/50">
                                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Recent Calls (last 50)</div>
                              </div>
                              <div className="overflow-x-auto">
                                  <table className="w-full text-left border-collapse">
                                      <thead>
                                          <tr className="text-[9px] text-gray-600 uppercase tracking-widest border-b border-gray-800/50">
                                              <th className="p-3">Time</th>
                                              <th className="p-3">Route</th>
                                              <th className="p-3">Model</th>
                                              <th className="p-3 text-right">Tokens</th>
                                              <th className="p-3 text-right">Cost (INR)</th>
                                              <th className="p-3 text-center">Status</th>
                                          </tr>
                                      </thead>
                                      <tbody>
                                          {(usageData.recentLogs || []).map((log: any) => (
                                              <tr key={log.id} className="border-b border-gray-800/20 hover:bg-white/5 transition-colors">
                                                  <td className="p-3 text-[9px] text-gray-600 font-mono whitespace-nowrap">
                                                      {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                  </td>
                                                  <td className="p-3 text-[10px] font-mono text-gray-400">{log.route}</td>
                                                  <td className="p-3">
                                                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-widest ${
                                                          log.model.includes('2.0-flash') ? 'bg-emerald-950/50 text-emerald-500' :
                                                          log.model.includes('1.5-flash') ? 'bg-blue-950/50 text-blue-400' :
                                                          'bg-purple-950/50 text-purple-400'
                                                      }`}>{log.model.replace('gemini-', '')}</span>
                                                  </td>
                                                  <td className="p-3 text-right text-[10px] text-gray-500 font-mono">{(Number(log.input_tokens) + Number(log.output_tokens)).toLocaleString()}</td>
                                                  <td className="p-3 text-right text-[10px] font-bold text-emerald-500">₹{(Number(log.cost_inr || log.cost_usd * 83.5)).toFixed(3)}</td>
                                                  <td className="p-3 text-center">
                                                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${log.success ? 'bg-green-950/50 text-green-500' : 'bg-red-950/50 text-red-500'}`}>
                                                          {log.success ? 'OK' : 'ERR'}
                                                      </span>
                                                  </td>
                                              </tr>
                                          ))}
                                          {(usageData.recentLogs || []).length === 0 && (
                                              <tr><td colSpan={6} className="p-6 text-center text-[10px] text-gray-600 font-mono">No recent calls for this period</td></tr>
                                          )}
                                      </tbody>
                                  </table>
                              </div>
                          </div>
                      </>
                  ) : (
                      <div className="text-center py-20 text-gray-600 font-mono text-xs">Failed to load usage data.</div>
                  )}
              </div>
          )}
       </main>
    </div>
  );
};

export default AdminDashboard;
