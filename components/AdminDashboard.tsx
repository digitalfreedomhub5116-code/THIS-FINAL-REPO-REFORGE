
import React, { useState, useEffect } from 'react';
import { LogOut, Save, RefreshCw, Video, Link, Search, Activity, Plus, Edit3, Trash2, Star, Dumbbell, BookOpen, Image, ToggleLeft, ToggleRight, Flag, ChevronDown, ChevronUp, CheckSquare, XSquare, ShieldAlert } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { WorkoutDay } from '../types';
import { useSystem, isEmbed } from '../hooks/useSystem';
import { API_BASE } from '../lib/apiConfig';
import { MASTER_PROTOCOL_REGISTRY } from '../utils/workoutGenerator';
import ExerciseLibrary from './admin/ExerciseLibrary';
import PlanBuilder from './admin/PlanBuilder';
import AdminUserProfileModal from './AdminUserProfileModal';



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
  const [activeTab, setActiveTab] = useState<'PROTOCOLS' | 'REGIONS' | 'USERS' | 'STORE' | 'USAGE' | 'REPORTS' | 'APPEALS'>('PROTOCOLS');
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
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [profileInitialTab, setProfileInitialTab] = useState<'OVERVIEW' | 'QUESTS' | 'ACTIVITY' | 'GOALS' | 'RAW'>('OVERVIEW');
  const [goldInput, setGoldInput] = useState<Record<string, string>>({});
  const [keysInput, setKeysInput] = useState<Record<string, string>>({});

  // Reports State
  const [reports, setReports] = useState<any[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [expandedReportId, setExpandedReportId] = useState<number | null>(null);

  // Appeals State
  const [appeals, setAppeals] = useState<any[]>([]);
  const [appealsLoading, setAppealsLoading] = useState(false);
  const [expandedAppealId, setExpandedAppealId] = useState<string | null>(null);
  const [appealAdminNote, setAppealAdminNote] = useState<Record<string, string>>({});

  // Usage State
  const [usageData, setUsageData] = useState<any>(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [usagePeriod, setUsagePeriod] = useState<'today' | 'week' | 'month' | 'all'>('month');

  // Protocols Sub-tab
  const [protocolsSubTab, setProtocolsSubTab] = useState<'EXERCISES' | 'PLANS'>('EXERCISES');

  // Store State
  const [storeOutfits, setStoreOutfits] = useState<any[]>([]);
  const [storeSubTab, setStoreSubTab] = useState<'BANNERS' | 'ITEMS' | 'SHADOWS' | 'LIVE_STORE'>('BANNERS');

  // Remote Store (Live Store) State
  const [remoteItems, setRemoteItems] = useState<any[]>([]);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [showRemoteForm, setShowRemoteForm] = useState(false);
  const [editingRemote, setEditingRemote] = useState<any>(null);
  const [remoteForm, setRemoteForm] = useState<any>({
    name: '', category: 'border', tier: 'legendary', price: 0, description: '',
    image_base64: '', image_filename: '',
    image_scale: 1.0, image_offset_y: 0, image_pfp_scale: 1.0,
    image_animated: false, image_animation_type: 'rotate',
    glow_color: '#C8A84E', glow_intensity: 0.7, tier_color: '#C8A84E',
    rank_required: '', is_event: false, event_name: '', event_starts_at: '', event_ends_at: '',
    display_order: 0,
  });
  const [confirmDeleteRemoteId, setConfirmDeleteRemoteId] = useState<string | null>(null);
  const [remoteImagePreview, setRemoteImagePreview] = useState<string>('');

  // Banner State
  const [banners, setBanners] = useState<any[]>([]);
  const [bannerLoading, setBannerLoading] = useState(false);
  const [showBannerForm, setShowBannerForm] = useState(false);
  const [editingBanner, setEditingBanner] = useState<any>(null);
  const [bannerForm, setBannerForm] = useState({ title: '', subtitle: '', image_url: '', link_url: '', is_active: true, display_order: 0 });
  const [confirmDeleteBannerId, setConfirmDeleteBannerId] = useState<number | null>(null);
  const [storeLoading, setStoreLoading] = useState(false);
  const [storeMsg, setStoreMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
          const res = await fetch(`${API_BASE}/api/admin/users`, {
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
          const res = await fetch(`${API_BASE}/api/admin/users/${id}/ban`, {
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
              fetchUsers();
          }
      } catch (err) {
          console.error('Ban error:', err);
      }
  };

  const unbanUser = async (id: string) => {
      try {
          const res = await fetch(`${API_BASE}/api/admin/users/${id}/unban`, {
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
              fetchUsers();
          }
      } catch (err) {
          console.error('Unban error:', err);
      }
  };

  const adjustGold = async (id: string, delta: number) => {
      try {
          const res = await fetch(`${API_BASE}/api/admin/users/${id}/adjust-gold`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ amount: delta }),
          });
          const data = await res.json();
          if (data.success) {
              setUsers(prev => prev.map(u => u.supabase_id === id ? { ...u, gold: data.gold } : u));
              fetchUsers();
          }
      } catch (err) {
          console.error('Adjust gold error:', err);
      }
  };

  const adjustKeys = async (id: string, delta: number) => {
      try {
          const res = await fetch(`${API_BASE}/api/admin/users/${id}/adjust-keys`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ amount: delta }),
          });
          const data = await res.json();
          if (data.success) {
              setUsers(prev => prev.map(u => u.supabase_id === id ? { ...u, keys: data.keys } : u));
              fetchUsers();
          }
      } catch (err) {
          console.error('Adjust keys error:', err);
      }
  };

  const adjustStrikes = async (id: string, delta: 1 | -1) => {
      try {
          const res = await fetch(`${API_BASE}/api/admin/users/${id}/adjust-strikes`, {
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
              fetchUsers();
          }
      } catch (err) {
          console.error('Adjust strikes error:', err);
      }
  };

  const deleteUser = async (id: string) => {
      try {
          const res = await fetch(`${API_BASE}/api/admin/users/${id}`, {
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
          const res = await fetch(`${API_BASE}/api/admin/users/${id}/data`, {
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
          const res = await fetch(`${API_BASE}/api/admin/usage?period=${period}`, { headers: { 'Authorization': `Bearer ${adminToken}` } });
          if (res.ok) setUsageData(await res.json());
      } catch (err) { console.error('Usage fetch error:', err); }
      finally { setUsageLoading(false); }
  };

  // Banner CRUD
  const fetchBanners = async () => {
      setBannerLoading(true);
      try {
          const res = await fetch(`${API_BASE}/api/admin/banners`, { headers: { 'Authorization': `Bearer ${adminToken}` } });
          const data = await res.json();
          setBanners(data || []);
      } catch { setStoreMsg({ type: 'error', text: 'Failed to load banners' }); }
      finally { setBannerLoading(false); }
  };

  const saveBanner = async () => {
      setBannerLoading(true);
      setStoreMsg(null);
      try {
          const url = editingBanner ? `${API_BASE}/api/admin/banners/${editingBanner.id}` : `${API_BASE}/api/admin/banners`;
          const method = editingBanner ? 'PUT' : 'POST';
          const res = await fetch(url, {
              method,
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
              body: JSON.stringify(bannerForm),
          });
          if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Save failed'); }
          setStoreMsg({ type: 'success', text: editingBanner ? 'Banner updated!' : 'Banner created!' });
          setShowBannerForm(false);
          fetchBanners();
      } catch (err: any) {
          setStoreMsg({ type: 'error', text: err.message });
      } finally { setBannerLoading(false); }
  };

  const deleteBanner = async (id: number) => {
      setBannerLoading(true);
      try {
          const res = await fetch(`${API_BASE}/api/admin/banners/${id}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${adminToken}` },
          });
          if (!res.ok) throw new Error('Delete failed');
          setStoreMsg({ type: 'success', text: 'Banner removed.' });
          setConfirmDeleteBannerId(null);
          fetchBanners();
      } catch (err: any) {
          setStoreMsg({ type: 'error', text: err.message });
      } finally { setBannerLoading(false); }
  };

  const fetchReports = async () => {
      setReportsLoading(true);
      try {
          const res = await fetch(`${API_BASE}/api/reports`, {
              headers: { 'Authorization': `Bearer ${adminToken}` },
          });
          if (res.ok) setReports(await res.json());
      } catch (err) { console.error('Reports fetch error:', err); }
      finally { setReportsLoading(false); }
  };

  const resolveReport = async (id: number, status: 'resolved' | 'dismissed') => {
      try {
          await fetch(`${API_BASE}/api/reports/${id}`, {
              method: 'PATCH',
              headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ status }),
          });
          setReports(prev => prev.map(r => r.id === id ? { ...r, status } : r));
      } catch (err) { console.error('Resolve report error:', err); }
  };

  const fetchAppeals = async () => {
      setAppealsLoading(true);
      try {
          const res = await fetch(`${API_BASE}/api/admin/appeals`, {
              headers: { 'Authorization': `Bearer ${adminToken}` },
          });
          if (res.ok) setAppeals(await res.json());
      } catch (err) { console.error('Appeals fetch error:', err); }
      finally { setAppealsLoading(false); }
  };

  const resolveAppeal = async (id: string, status: 'approved' | 'denied') => {
      try {
          await fetch(`${API_BASE}/api/admin/appeals/${id}/resolve`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ status, adminNote: appealAdminNote[id] || '' }),
          });
          setAppeals(prev => prev.map(a => a.id === id ? { ...a, status, resolved_at: new Date().toISOString() } : a));
          setExpandedAppealId(null);
      } catch (err) { console.error('Resolve appeal error:', err); }
  };

  useEffect(() => { 
      if (activeTab === 'USERS') fetchUsers();
      if (activeTab === 'STORE') { fetchBanners(); fetchRemoteItems(); }
      if (activeTab === 'USAGE') fetchUsage(usagePeriod);
      if (activeTab === 'REPORTS') fetchReports();
      if (activeTab === 'APPEALS') fetchAppeals();
  }, [activeTab]);

  useEffect(() => {
      if (activeTab === 'USAGE') fetchUsage(usagePeriod);
  }, [usagePeriod]);

  useEffect(() => {
      if (activeTab !== 'USAGE') return;
      const interval = setInterval(() => fetchUsage(usagePeriod), 30000);
      return () => clearInterval(interval);
  }, [activeTab, usagePeriod]);

  // Real-time sync: poll every 15s on USERS tab to reflect player-side changes
  useEffect(() => {
      if (activeTab !== 'USERS') return;
      const interval = setInterval(() => fetchUsers(), 15000);
      return () => clearInterval(interval);
  }, [activeTab]);



  // ── Remote Store (Live Store) CRUD ──
  const fetchRemoteItems = async () => {
      setRemoteLoading(true);
      try {
          const res = await fetch(`${API_BASE}/api/admin/remote-store`, { headers: { 'Authorization': `Bearer ${adminToken}` } });
          const data = await res.json();
          setRemoteItems(data || []);
      } catch { setStoreMsg({ type: 'error', text: 'Failed to load remote items' }); }
      finally { setRemoteLoading(false); }
  };

  const handleRemoteImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) { setStoreMsg({ type: 'error', text: 'Image too large (max 2MB)' }); return; }
      const reader = new FileReader();
      reader.onload = () => {
          const base64 = reader.result as string;
          setRemoteForm((prev: any) => ({ ...prev, image_base64: base64, image_filename: file.name }));
          setRemoteImagePreview(base64);
      };
      reader.readAsDataURL(file);
  };

  const resetRemoteForm = () => {
      setRemoteForm({
          name: '', category: 'border', tier: 'legendary', price: 0, description: '',
          image_base64: '', image_filename: '',
          image_scale: 1.0, image_offset_y: 0, image_pfp_scale: 1.0,
          image_animated: false, image_animation_type: 'rotate',
          glow_color: '#C8A84E', glow_intensity: 0.7, tier_color: '#C8A84E',
          rank_required: '', is_event: false, event_name: '', event_starts_at: '', event_ends_at: '',
          display_order: 0,
      });
      setRemoteImagePreview('');
      setEditingRemote(null);
      setShowRemoteForm(false);
  };

  const saveRemoteItem = async () => {
      setRemoteLoading(true);
      setStoreMsg(null);
      try {
          const url = editingRemote ? `${API_BASE}/api/admin/remote-store/${editingRemote.id}` : `${API_BASE}/api/admin/remote-store`;
          const method = editingRemote ? 'PUT' : 'POST';
          const res = await fetch(url, {
              method,
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
              body: JSON.stringify(remoteForm),
          });
          if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Save failed'); }
          setStoreMsg({ type: 'success', text: editingRemote ? 'Item updated!' : 'Item created!' });
          resetRemoteForm();
          fetchRemoteItems();
      } catch (err: any) {
          setStoreMsg({ type: 'error', text: err.message });
      } finally { setRemoteLoading(false); }
  };

  const toggleRemoteItem = async (id: number) => {
      try {
          await fetch(`${API_BASE}/api/admin/remote-store/${id}/toggle`, {
              method: 'PATCH',
              headers: { 'Authorization': `Bearer ${adminToken}` },
          });
          fetchRemoteItems();
      } catch { setStoreMsg({ type: 'error', text: 'Toggle failed' }); }
  };

  const deleteRemoteItem = async (id: number) => {
      setRemoteLoading(true);
      try {
          const res = await fetch(`${API_BASE}/api/admin/remote-store/${id}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${adminToken}` },
          });
          if (!res.ok) throw new Error('Delete failed');
          setStoreMsg({ type: 'success', text: 'Item deleted.' });
          setConfirmDeleteRemoteId(null);
          fetchRemoteItems();
      } catch (err: any) {
          setStoreMsg({ type: 'error', text: err.message });
      } finally { setRemoteLoading(false); }
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
                    <div className="w-10 h-10 bg-system-neon text-black rounded flex items-center justify-center font-black shadow-[0_0_15px_#00d4ff]">GM</div>
                    <div>
                        <h1 className="text-xl font-black italic tracking-tighter text-white">SYSTEM OVERRIDE</h1>
                        <div className="flex gap-4 mt-1">
                            <button onClick={() => setActiveTab('PROTOCOLS')} className={`text-[10px] font-bold tracking-widest transition-colors ${activeTab === 'PROTOCOLS' ? 'text-system-neon' : 'text-gray-600 hover:text-white'}`}>[ MASTER_PROTOCOLS ]</button>
                            <button onClick={() => setActiveTab('REGIONS')} className={`text-[10px] font-bold tracking-widest transition-colors ${activeTab === 'REGIONS' ? 'text-system-neon' : 'text-gray-600 hover:text-white'}`}>[ ANATOMY_VISUALS ]</button>
                            <button onClick={() => setActiveTab('USERS')} className={`text-[10px] font-bold tracking-widest transition-colors ${activeTab === 'USERS' ? 'text-system-neon' : 'text-gray-600 hover:text-white'}`}>[ HUNTER_REGISTRY ]</button>
                            <button onClick={() => setActiveTab('STORE')} className={`text-[10px] font-bold tracking-widest transition-colors ${activeTab === 'STORE' ? 'text-yellow-400' : 'text-gray-600 hover:text-white'}`}>[ STORE ]</button>
                            <button onClick={() => setActiveTab('USAGE')} className={`text-[10px] font-bold tracking-widest transition-colors ${activeTab === 'USAGE' ? 'text-emerald-400' : 'text-gray-600 hover:text-white'}`}>[ USAGE ]</button>
                            <button onClick={() => setActiveTab('REPORTS')} className={`text-[10px] font-bold tracking-widest transition-colors ${activeTab === 'REPORTS' ? 'text-red-400' : 'text-gray-600 hover:text-white'}`}>[ REPORTS{reports.filter(r => r.status === 'pending').length > 0 ? ` (${reports.filter(r => r.status === 'pending').length})` : ''} ]</button>
                            <button onClick={() => setActiveTab('APPEALS')} className={`text-[10px] font-bold tracking-widest transition-colors ${activeTab === 'APPEALS' ? 'text-orange-400' : 'text-gray-600 hover:text-white'}`}>[ APPEALS{appeals.filter(a => a.status === 'pending').length > 0 ? ` (${appeals.filter(a => a.status === 'pending').length})` : ''} ]</button>
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
                       <button onClick={handleSaveRegions} disabled={isSaving} className="px-6 py-2 bg-system-accent text-white font-bold rounded flex items-center gap-2 hover:bg-white hover:text-black transition-all disabled:opacity-50 text-xs shadow-[0_0_15px_rgba(0,212,255,0.3)]">
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
                   {/* User Profile Modal (rich view) */}
                   {profileUserId && (
                       <AdminUserProfileModal
                           userId={profileUserId}
                           adminToken={adminToken}
                           initialTab={profileInitialTab}
                           onClose={() => { setProfileUserId(null); setProfileInitialTab('OVERVIEW'); }}
                       />
                   )}

                   {/* Legacy raw JSON modal (kept as fallback) */}
                   {viewUserData && !profileUserId && (
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
                                           <td className="p-3 cursor-pointer group" onClick={() => setProfileUserId(user.supabase_id)}>
                                               <div className="font-bold text-sm text-white group-hover:text-[#00d4ff] transition-colors">{user.username || 'ANONYMOUS'}</div>
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
                                               <div className="flex flex-col items-center gap-1.5">
                                                   <span className="text-xs font-mono font-bold text-yellow-400">{user.gold ?? 0}</span>
                                                   <div className="flex items-center gap-1">
                                                       <input
                                                           type="number"
                                                           value={goldInput[user.supabase_id] ?? ''}
                                                           onChange={e => setGoldInput(prev => ({ ...prev, [user.supabase_id]: e.target.value }))}
                                                           onKeyDown={e => { if (e.key === 'Enter') { const v = parseInt(goldInput[user.supabase_id]); if (!isNaN(v) && v !== 0) { adjustGold(user.supabase_id, v); setGoldInput(prev => ({ ...prev, [user.supabase_id]: '' })); } } }}
                                                           placeholder="±amt"
                                                           className="w-20 bg-black border border-gray-700 rounded px-2 py-1 text-[10px] text-yellow-400 text-center outline-none focus:border-yellow-500 font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                       />
                                                       <button
                                                           onClick={() => { const v = parseInt(goldInput[user.supabase_id]); if (!isNaN(v) && v !== 0) { adjustGold(user.supabase_id, v); setGoldInput(prev => ({ ...prev, [user.supabase_id]: '' })); } }}
                                                           className="px-2 py-1 rounded bg-yellow-900/40 hover:bg-yellow-900/70 text-yellow-400 text-[8px] font-black flex items-center justify-center border border-yellow-800/50 tracking-widest"
                                                       >ADD</button>
                                                   </div>
                                               </div>
                                           </td>
                                           {/* Keys column with custom input */}
                                           <td className="p-3 text-center">
                                               <div className="flex flex-col items-center gap-1.5">
                                                   <span className="text-xs font-mono font-bold text-[#00d4ff]">{user.keys ?? 0}</span>
                                                   <div className="flex items-center gap-1">
                                                       <input
                                                           type="number"
                                                           value={keysInput[user.supabase_id] ?? ''}
                                                           onChange={e => setKeysInput(prev => ({ ...prev, [user.supabase_id]: e.target.value }))}
                                                           onKeyDown={e => { if (e.key === 'Enter') { const v = parseInt(keysInput[user.supabase_id]); if (!isNaN(v) && v !== 0) { adjustKeys(user.supabase_id, v); setKeysInput(prev => ({ ...prev, [user.supabase_id]: '' })); } } }}
                                                           placeholder="±amt"
                                                           className="w-20 bg-black border border-gray-700 rounded px-2 py-1 text-[10px] text-[#00d4ff] text-center outline-none focus:border-[#00d4ff] font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                       />
                                                       <button
                                                           onClick={() => { const v = parseInt(keysInput[user.supabase_id]); if (!isNaN(v) && v !== 0) { adjustKeys(user.supabase_id, v); setKeysInput(prev => ({ ...prev, [user.supabase_id]: '' })); } }}
                                                           className="px-2 py-1 rounded bg-purple-900/40 hover:bg-purple-900/70 text-[#00d4ff] text-[8px] font-black flex items-center justify-center border border-purple-800/50 tracking-widest"
                                                       >ADD</button>
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
                                               <div className="text-[8px] text-gray-600 font-mono mt-0.5">lifetime: {user.total_strikes_ever || 0} strikes</div>
                                           </td>
                                           {/* Actions: View Data, Delete */}
                                           <td className="p-3 text-right">
                                               <div className="flex flex-col items-end gap-1">
                                                   <button
                                                       onClick={() => { setProfileInitialTab('OVERVIEW'); setProfileUserId(user.supabase_id); }}
                                                       className="text-[9px] bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-800/50 text-[#00d4ff] px-2 py-1 rounded font-bold tracking-widest uppercase transition-all"
                                                   >
                                                       PROFILE
                                                   </button>
                                                   <button
                                                       onClick={() => { setProfileInitialTab('QUESTS'); setProfileUserId(user.supabase_id); }}
                                                       className="text-[9px] bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/50 text-amber-400 px-2 py-1 rounded font-bold tracking-widest uppercase transition-all"
                                                   >
                                                       QUEST HISTORY
                                                   </button>
                                                   <button
                                                       onClick={() => fetchUserData(user.supabase_id)}
                                                       disabled={viewUserLoading}
                                                       className="text-[9px] bg-gray-900/40 hover:bg-gray-800/60 border border-gray-700/50 text-gray-500 px-2 py-1 rounded font-bold tracking-widest uppercase transition-all"
                                                   >
                                                       {viewUserLoading ? '...' : 'RAW'}
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
                  <div className="flex gap-2 flex-wrap">
                      {(['BANNERS', 'ITEMS', 'SHADOWS', 'LIVE_STORE'] as const).map(tab => (
                          <button
                              key={tab}
                              onClick={() => setStoreSubTab(tab)}
                              className={`px-4 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all ${storeSubTab === tab ? 'bg-yellow-400 text-black' : 'bg-gray-900 border border-gray-800 text-gray-500 hover:text-white'}`}
                          >
                              {tab}
                          </button>
                      ))}
                  </div>

                  {/* ── BANNERS SUB-TAB ── */}
                  {storeSubTab === 'BANNERS' && (
                      <div className="space-y-4">
                          <div className="flex items-center justify-between">
                              <h3 className="text-sm font-black text-white uppercase tracking-widest">Event Banners</h3>
                              <button
                                  onClick={() => { setEditingBanner(null); setBannerForm({ title: '', subtitle: '', image_url: '', link_url: '', is_active: true, display_order: 0 }); setShowBannerForm(true); }}
                                  className="flex items-center gap-1.5 px-3 py-2 bg-yellow-400 hover:bg-yellow-300 text-black rounded-lg text-xs font-black tracking-widest uppercase transition-all"
                              >
                                  <Plus size={12} /> ADD BANNER
                              </button>
                          </div>

                          {showBannerForm && (
                              <div className="bg-gray-900/80 border border-yellow-400/30 rounded-xl p-5 space-y-4">
                                  <h4 className="text-yellow-400 font-black text-xs tracking-widest uppercase">
                                      {editingBanner ? `EDITING: ${editingBanner.title}` : 'CREATE NEW BANNER'}
                                  </h4>
                                  <div className="grid grid-cols-2 gap-3">
                                      <div>
                                          <label className="text-[9px] text-gray-500 uppercase tracking-widest font-bold block mb-1">Title</label>
                                          <input value={bannerForm.title} onChange={e => setBannerForm(f => ({ ...f, title: e.target.value }))} placeholder="Event Title" className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-xs text-white outline-none focus:border-yellow-400" />
                                      </div>
                                      <div>
                                          <label className="text-[9px] text-gray-500 uppercase tracking-widest font-bold block mb-1">Display Order</label>
                                          <input type="number" value={bannerForm.display_order} onChange={e => setBannerForm(f => ({ ...f, display_order: parseInt(e.target.value) || 0 }))} className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-xs text-white outline-none focus:border-yellow-400" />
                                      </div>
                                      <div className="col-span-2">
                                          <label className="text-[9px] text-gray-500 uppercase tracking-widest font-bold block mb-1">Subtitle / Featured Text</label>
                                          <input value={bannerForm.subtitle} onChange={e => setBannerForm(f => ({ ...f, subtitle: e.target.value }))} placeholder="Short description..." className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-xs text-white outline-none focus:border-yellow-400" />
                                      </div>
                                      <div className="col-span-2">
                                          <label className="text-[9px] text-gray-500 uppercase tracking-widest font-bold block mb-1">Image URL</label>
                                          <div className="flex gap-2 items-center">
                                              <input value={bannerForm.image_url} onChange={e => setBannerForm(f => ({ ...f, image_url: e.target.value }))} placeholder="https://..." className="flex-1 bg-black border border-gray-700 rounded px-3 py-2 text-xs text-white outline-none focus:border-yellow-400" />
                                              {bannerForm.image_url && <img src={bannerForm.image_url} alt="preview" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} onLoad={e => { (e.target as HTMLImageElement).style.display = 'block'; }} className="w-16 h-10 object-cover rounded border border-gray-600 flex-shrink-0" />}
                                          </div>
                                      </div>
                                      <div>
                                          <label className="text-[9px] text-gray-500 uppercase tracking-widest font-bold block mb-1">Link URL (optional)</label>
                                          <input value={bannerForm.link_url} onChange={e => setBannerForm(f => ({ ...f, link_url: e.target.value }))} placeholder="https://..." className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-xs text-white outline-none focus:border-yellow-400" />
                                      </div>
                                      <div className="flex items-center gap-3">
                                          <label className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">Active</label>
                                          <button onClick={() => setBannerForm(f => ({ ...f, is_active: !f.is_active }))} className="text-yellow-400">
                                              {bannerForm.is_active ? <ToggleRight size={24} /> : <ToggleLeft size={24} className="text-gray-600" />}
                                          </button>
                                      </div>
                                  </div>
                                  <div className="flex gap-2 pt-2">
                                      <button onClick={saveBanner} disabled={bannerLoading || !bannerForm.title || !bannerForm.image_url} className="flex-1 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-black rounded-lg text-xs font-black tracking-widest uppercase transition-all disabled:opacity-50">
                                          {bannerLoading ? 'SAVING...' : editingBanner ? 'UPDATE BANNER' : 'CREATE BANNER'}
                                      </button>
                                      <button onClick={() => setShowBannerForm(false)} className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-bold uppercase transition-all">CANCEL</button>
                                  </div>
                              </div>
                          )}

                          {bannerLoading && !showBannerForm ? (
                              <div className="text-center py-8 text-gray-600 text-xs font-mono">LOADING BANNERS...</div>
                          ) : (
                              <div className="space-y-2">
                                  {banners.length === 0 && <div className="text-center py-8 text-gray-600 text-xs font-mono">No banners yet. Add one above.</div>}
                                  {banners.map(b => (
                                      <div key={b.id} className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-all">
                                          <div className="flex items-start gap-3">
                                              {b.image_url && <img src={b.image_url} alt={b.title} className="w-24 h-14 object-cover rounded-lg border border-gray-700 flex-shrink-0" />}
                                              <div className="flex-1 min-w-0">
                                                  <div className="flex items-center gap-2 mb-1">
                                                      <span className="text-sm font-black text-white truncate">{b.title}</span>
                                                      <span className={`text-[8px] font-black tracking-widest px-1.5 py-0.5 rounded-full ${b.is_active ? 'bg-green-500/20 border border-green-500/50 text-green-400' : 'bg-red-500/20 border border-red-500/50 text-red-400'}`}>
                                                          {b.is_active ? 'ACTIVE' : 'INACTIVE'}
                                                      </span>
                                                  </div>
                                                  {b.subtitle && <div className="text-[10px] text-gray-500 font-mono truncate">{b.subtitle}</div>}
                                                  <div className="text-[9px] text-gray-600 font-mono mt-1">Order: {b.display_order}</div>
                                              </div>
                                              <div className="flex flex-col gap-1 flex-shrink-0">
                                                  <button onClick={() => { setEditingBanner(b); setBannerForm({ title: b.title, subtitle: b.subtitle || '', image_url: b.image_url, link_url: b.link_url || '', is_active: b.is_active, display_order: b.display_order }); setShowBannerForm(true); }} className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-[9px] font-bold tracking-widest uppercase transition-all">
                                                      <Edit3 size={10} /> EDIT
                                                  </button>
                                                  {confirmDeleteBannerId === b.id ? (
                                                      <div className="flex gap-1">
                                                          <button onClick={() => deleteBanner(b.id)} className="flex-1 px-2 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-[8px] font-black uppercase">CONFIRM</button>
                                                          <button onClick={() => setConfirmDeleteBannerId(null)} className="flex-1 px-2 py-1.5 bg-gray-700 text-gray-300 rounded text-[8px] font-bold">NO</button>
                                                      </div>
                                                  ) : (
                                                      <button onClick={() => setConfirmDeleteBannerId(b.id)} className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-800 hover:bg-red-900/40 text-gray-300 hover:text-red-400 rounded text-[9px] font-bold tracking-widest uppercase transition-all">
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
                          <div className="text-xs text-gray-500 font-mono">Coming Soon — Phantom Legion management under development</div>
                      </div>
                  )}

                  {/* ── LIVE STORE SUB-TAB ── */}
                  {storeSubTab === 'LIVE_STORE' && (
                      <div className="space-y-4">
                          <div className="flex items-center justify-between">
                              <div>
                                  <div className="text-xs font-black text-orange-400 uppercase tracking-widest">🔥 Live Store — Remote Items</div>
                                  <div className="text-[10px] text-gray-600 font-mono mt-0.5">Add borders, banners, themes without app updates. Items sync to all users in real-time.</div>
                              </div>
                              <button onClick={() => { resetRemoteForm(); setShowRemoteForm(true); }} className="px-4 py-2 bg-orange-500 text-black text-[10px] font-black rounded-lg uppercase tracking-widest hover:bg-orange-400 transition-all flex items-center gap-1.5">
                                  <Plus size={12} /> ADD ITEM
                              </button>
                          </div>

                          {/* Create/Edit Form Modal */}
                          {showRemoteForm && (
                              <div className="bg-[#0a0a0a] border border-orange-900/50 rounded-xl p-5 space-y-4">
                                  <div className="flex justify-between items-center">
                                      <div className="text-xs font-black text-orange-400 uppercase tracking-widest">{editingRemote ? '✏️ Edit Item' : '➕ New Remote Item'}</div>
                                      <button onClick={resetRemoteForm} className="text-gray-500 hover:text-white">✕</button>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      {/* Left: Fields */}
                                      <div className="space-y-3">
                                          <div>
                                              <label className="text-[9px] text-gray-500 uppercase tracking-widest font-bold block mb-1">Name *</label>
                                              <input value={remoteForm.name} onChange={e => setRemoteForm((p: any) => ({...p, name: e.target.value}))} className="w-full bg-black border border-gray-800 rounded px-3 py-2 text-xs text-white outline-none focus:border-orange-500" placeholder="Celestial Fury" />
                                          </div>
                                          <div className="grid grid-cols-3 gap-2">
                                              <div>
                                                  <label className="text-[9px] text-gray-500 uppercase tracking-widest font-bold block mb-1">Category</label>
                                                  <select value={remoteForm.category} onChange={e => setRemoteForm((p: any) => ({...p, category: e.target.value}))} className="w-full bg-black border border-gray-800 rounded px-2 py-2 text-xs text-white outline-none">
                                                      <option value="border">Border</option>
                                                      <option value="banner">Banner</option>
                                                      <option value="theme">Theme</option>
                                                  </select>
                                              </div>
                                              <div>
                                                  <label className="text-[9px] text-gray-500 uppercase tracking-widest font-bold block mb-1">Tier</label>
                                                  <select value={remoteForm.tier} onChange={e => setRemoteForm((p: any) => ({...p, tier: e.target.value}))} className="w-full bg-black border border-gray-800 rounded px-2 py-2 text-xs text-white outline-none">
                                                      {['basic','color','elemental','special','prismatic','seasonal','premium','legendary','rank-gated'].map(t => <option key={t} value={t}>{t}</option>)}
                                                  </select>
                                              </div>
                                              <div>
                                                  <label className="text-[9px] text-gray-500 uppercase tracking-widest font-bold block mb-1">Price (Gold)</label>
                                                  <input type="number" value={remoteForm.price} onChange={e => setRemoteForm((p: any) => ({...p, price: parseInt(e.target.value) || 0}))} className="w-full bg-black border border-gray-800 rounded px-2 py-2 text-xs text-yellow-400 outline-none [appearance:textfield]" />
                                              </div>
                                          </div>
                                          <div>
                                              <label className="text-[9px] text-gray-500 uppercase tracking-widest font-bold block mb-1">Description</label>
                                              <input value={remoteForm.description} onChange={e => setRemoteForm((p: any) => ({...p, description: e.target.value}))} className="w-full bg-black border border-gray-800 rounded px-3 py-2 text-xs text-white outline-none focus:border-orange-500" placeholder="A blazing cosmic frame..." />
                                          </div>
                                          <div className="grid grid-cols-3 gap-2">
                                              <div>
                                                  <label className="text-[9px] text-gray-500 uppercase tracking-widest font-bold block mb-1">Scale</label>
                                                  <input type="number" step="0.05" value={remoteForm.image_scale} onChange={e => setRemoteForm((p: any) => ({...p, image_scale: parseFloat(e.target.value) || 1}))} className="w-full bg-black border border-gray-800 rounded px-2 py-2 text-xs text-white outline-none [appearance:textfield]" />
                                              </div>
                                              <div>
                                                  <label className="text-[9px] text-gray-500 uppercase tracking-widest font-bold block mb-1">Offset Y</label>
                                                  <input type="number" value={remoteForm.image_offset_y} onChange={e => setRemoteForm((p: any) => ({...p, image_offset_y: parseInt(e.target.value) || 0}))} className="w-full bg-black border border-gray-800 rounded px-2 py-2 text-xs text-white outline-none [appearance:textfield]" />
                                              </div>
                                              <div>
                                                  <label className="text-[9px] text-gray-500 uppercase tracking-widest font-bold block mb-1">PFP Scale</label>
                                                  <input type="number" step="0.05" value={remoteForm.image_pfp_scale} onChange={e => setRemoteForm((p: any) => ({...p, image_pfp_scale: parseFloat(e.target.value) || 1}))} className="w-full bg-black border border-gray-800 rounded px-2 py-2 text-xs text-white outline-none [appearance:textfield]" />
                                              </div>
                                          </div>
                                          <div className="grid grid-cols-2 gap-2">
                                              <div>
                                                  <label className="text-[9px] text-gray-500 uppercase tracking-widest font-bold block mb-1">Glow Color</label>
                                                  <div className="flex gap-2 items-center">
                                                      <input type="color" value={remoteForm.glow_color} onChange={e => setRemoteForm((p: any) => ({...p, glow_color: e.target.value}))} className="w-8 h-8 rounded border border-gray-700 bg-black cursor-pointer" />
                                                      <input value={remoteForm.glow_color} onChange={e => setRemoteForm((p: any) => ({...p, glow_color: e.target.value}))} className="flex-1 bg-black border border-gray-800 rounded px-2 py-1 text-[10px] text-white outline-none" />
                                                  </div>
                                              </div>
                                              <div>
                                                  <label className="text-[9px] text-gray-500 uppercase tracking-widest font-bold block mb-1">Tier Color</label>
                                                  <div className="flex gap-2 items-center">
                                                      <input type="color" value={remoteForm.tier_color} onChange={e => setRemoteForm((p: any) => ({...p, tier_color: e.target.value}))} className="w-8 h-8 rounded border border-gray-700 bg-black cursor-pointer" />
                                                      <input value={remoteForm.tier_color} onChange={e => setRemoteForm((p: any) => ({...p, tier_color: e.target.value}))} className="flex-1 bg-black border border-gray-800 rounded px-2 py-1 text-[10px] text-white outline-none" />
                                                  </div>
                                              </div>
                                          </div>
                                          {/* Event scheduling */}
                                          <div className="border border-gray-800 rounded-lg p-3">
                                              <label className="flex items-center gap-2 cursor-pointer">
                                                  <input type="checkbox" checked={remoteForm.is_event} onChange={e => setRemoteForm((p: any) => ({...p, is_event: e.target.checked}))} className="rounded" />
                                                  <span className="text-[10px] text-orange-400 font-bold uppercase tracking-widest">⚡ Event Item (time-limited)</span>
                                              </label>
                                              {remoteForm.is_event && (
                                                  <div className="mt-3 space-y-2">
                                                      <input value={remoteForm.event_name} onChange={e => setRemoteForm((p: any) => ({...p, event_name: e.target.value}))} placeholder="Event Name (e.g. Summer Blaze)" className="w-full bg-black border border-gray-800 rounded px-2 py-1.5 text-xs text-white outline-none" />
                                                      <div className="grid grid-cols-2 gap-2">
                                                          <div>
                                                              <label className="text-[8px] text-gray-600 block mb-0.5">Starts</label>
                                                              <input type="datetime-local" value={remoteForm.event_starts_at} onChange={e => setRemoteForm((p: any) => ({...p, event_starts_at: e.target.value}))} className="w-full bg-black border border-gray-800 rounded px-2 py-1 text-[10px] text-white outline-none" />
                                                          </div>
                                                          <div>
                                                              <label className="text-[8px] text-gray-600 block mb-0.5">Ends</label>
                                                              <input type="datetime-local" value={remoteForm.event_ends_at} onChange={e => setRemoteForm((p: any) => ({...p, event_ends_at: e.target.value}))} className="w-full bg-black border border-gray-800 rounded px-2 py-1 text-[10px] text-white outline-none" />
                                                          </div>
                                                      </div>
                                                  </div>
                                              )}
                                          </div>
                                      </div>

                                      {/* Right: Image Upload + Preview */}
                                      <div className="space-y-3">
                                          <div>
                                              <label className="text-[9px] text-gray-500 uppercase tracking-widest font-bold block mb-1">Asset Image *</label>
                                              <label className="flex items-center justify-center gap-2 w-full h-12 bg-black border-2 border-dashed border-gray-700 rounded-lg cursor-pointer hover:border-orange-500 transition-colors">
                                                  <Image size={14} className="text-gray-500" />
                                                  <span className="text-[10px] text-gray-500 font-bold">{remoteForm.image_filename || 'Choose PNG/WebP (max 2MB)'}</span>
                                                  <input type="file" accept="image/png,image/webp,image/jpeg" onChange={handleRemoteImagePick} className="hidden" />
                                              </label>
                                          </div>
                                          {/* Live Preview */}
                                          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 flex flex-col items-center justify-center min-h-[200px]">
                                              <div className="text-[8px] text-gray-600 uppercase tracking-widest mb-3">Live Preview</div>
                                              {(remoteImagePreview || editingRemote?.image_url) ? (
                                                  <div className="relative w-24 h-24">
                                                      <div className="w-16 h-16 rounded-full bg-gray-800 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0" />
                                                      <img
                                                          src={remoteImagePreview || editingRemote?.image_url}
                                                          alt="preview"
                                                          className="absolute inset-0 w-full h-full object-contain z-10"
                                                          style={{ transform: `scale(${remoteForm.image_scale}) translateY(${remoteForm.image_offset_y}px)` }}
                                                      />
                                                  </div>
                                              ) : (
                                                  <div className="text-gray-700 text-xs">No image selected</div>
                                              )}
                                              <div className="text-[10px] text-white font-bold mt-3">{remoteForm.name || 'Item Name'}</div>
                                              <div className="text-[9px] font-bold mt-1" style={{color: remoteForm.tier_color}}>{remoteForm.tier.toUpperCase()}</div>
                                              <div className="text-[10px] text-yellow-400 font-bold mt-1">{remoteForm.price}G</div>
                                          </div>
                                      </div>
                                  </div>

                                  <div className="flex gap-2 justify-end pt-2 border-t border-gray-800">
                                      <button onClick={resetRemoteForm} className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-[10px] text-gray-400 font-bold uppercase tracking-widest hover:text-white transition-all">Cancel</button>
                                      <button onClick={saveRemoteItem} disabled={remoteLoading || !remoteForm.name} className="px-6 py-2 bg-orange-500 text-black rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-orange-400 transition-all disabled:opacity-40 flex items-center gap-1.5">
                                          {remoteLoading ? <RefreshCw size={11} className="animate-spin" /> : <Save size={11} />}
                                          {editingRemote ? 'UPDATE' : 'CREATE'}
                                      </button>
                                  </div>
                              </div>
                          )}

                          {/* Items List */}
                          {remoteLoading && remoteItems.length === 0 ? (
                              <div className="text-center py-12 text-gray-600 text-xs font-mono">Loading remote items...</div>
                          ) : remoteItems.length === 0 ? (
                              <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-10 text-center">
                                  <div className="text-3xl mb-2">📦</div>
                                  <div className="text-sm font-bold text-gray-400">No remote items yet</div>
                                  <div className="text-[10px] text-gray-600 mt-1">Click "Add Item" to create your first live store item</div>
                              </div>
                          ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {remoteItems.map((item: any) => (
                                      <div key={item.id} className={`bg-[#0a0a0a] border rounded-xl overflow-hidden transition-all ${item.is_active ? 'border-gray-800 hover:border-orange-900/50' : 'border-red-900/30 opacity-60'}`}>
                                          <div className="flex items-center gap-3 p-3">
                                              <div className="w-14 h-14 rounded-lg bg-gray-900 flex-shrink-0 overflow-hidden flex items-center justify-center">
                                                  {item.image_url ? <img src={item.image_url} alt={item.name} className="w-full h-full object-contain" /> : <Image size={20} className="text-gray-700" />}
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                  <div className="text-xs font-black text-white truncate">{item.name}</div>
                                                  <div className="flex items-center gap-2 mt-0.5">
                                                      <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded" style={{color: item.tier_color, background: `${item.tier_color}15`, border: `1px solid ${item.tier_color}30`}}>{item.tier}</span>
                                                      <span className="text-[9px] text-gray-500 font-mono">{item.category}</span>
                                                      <span className="text-[9px] text-yellow-400 font-bold">{item.price}G</span>
                                                  </div>
                                                  {item.is_event && (
                                                      <div className="text-[8px] text-orange-400 font-bold mt-0.5">⚡ {item.event_name || 'EVENT'} {item.event_ends_at ? `· ends ${new Date(item.event_ends_at).toLocaleDateString()}` : ''}</div>
                                                  )}
                                              </div>
                                          </div>
                                          <div className="flex items-center justify-between px-3 py-2 border-t border-gray-800/50 bg-gray-900/20">
                                              <button onClick={() => toggleRemoteItem(item.id)} className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded transition-all ${item.is_active ? 'text-green-400 hover:bg-green-900/30' : 'text-red-400 hover:bg-red-900/30'}`}>
                                                  {item.is_active ? '● LIVE' : '○ OFF'}
                                              </button>
                                              <div className="flex gap-1">
                                                  <button onClick={() => { setEditingRemote(item); setRemoteForm({...item, image_base64: '', image_filename: ''}); setRemoteImagePreview(item.image_url || ''); setShowRemoteForm(true); }} className="p-1.5 rounded hover:bg-gray-800 text-gray-500 hover:text-white transition-all"><Edit3 size={12} /></button>
                                                  {confirmDeleteRemoteId === item.id ? (
                                                      <div className="flex gap-1 items-center">
                                                          <button onClick={() => deleteRemoteItem(item.id)} className="text-[8px] bg-red-900 text-red-300 px-2 py-1 rounded font-bold">DELETE</button>
                                                          <button onClick={() => setConfirmDeleteRemoteId(null)} className="text-[8px] text-gray-500 px-1">✕</button>
                                                      </div>
                                                  ) : (
                                                      <button onClick={() => setConfirmDeleteRemoteId(item.id)} className="p-1.5 rounded hover:bg-red-900/30 text-gray-600 hover:text-red-400 transition-all"><Trash2 size={12} /></button>
                                                  )}
                                              </div>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          )}
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
                          <div className="text-[10px] text-gray-600 font-mono">All users combined · costs in INR (₹{usageData?.exchangeRate ? Number(usageData.exchangeRate).toFixed(1) : '...'}/USD live) · auto-refreshes 30s</div>
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
                                      <BarChart data={(usageData.timeSeries || []).map((d: any) => ({ ...d, cost_inr: Number((d.cost_inr || d.cost_usd * (usageData?.exchangeRate || 85))).toFixed(2) }))} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
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
                                                          row.model.includes('pro') ? 'bg-purple-950/50 border border-purple-900/50 text-[#00d4ff]' :
                                                          row.model.includes('image') ? 'bg-amber-950/50 border border-amber-900/50 text-amber-400' :
                                                          'bg-gray-800 text-gray-400'
                                                      }`}>{row.model}</span>
                                                  </td>
                                                  <td className="p-3 text-right text-sm font-bold text-white">{Number(row.calls).toLocaleString()}</td>
                                                  <td className="p-3 text-right text-xs text-gray-400">{Number(row.input_tokens).toLocaleString()}</td>
                                                  <td className="p-3 text-right text-xs text-gray-400">{Number(row.output_tokens).toLocaleString()}</td>
                                                  <td className="p-3 text-right text-sm font-bold text-emerald-400">₹{(Number(row.cost_inr || row.cost_usd * (usageData?.exchangeRate || 85))).toFixed(2)}</td>
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
                                                  <td className="p-3 text-right text-sm font-bold text-emerald-400">₹{(Number(row.cost_inr || row.cost_usd * (usageData?.exchangeRate || 85))).toFixed(2)}</td>
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

                          {/* By User */}
                          <div className="bg-system-card border border-gray-800 rounded-xl overflow-hidden">
                              <div className="px-4 py-3 border-b border-gray-800 bg-gray-900/50">
                                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">By User</div>
                              </div>
                              <div className="overflow-x-auto">
                                  <table className="w-full text-left border-collapse">
                                      <thead>
                                          <tr className="text-[9px] text-gray-600 uppercase tracking-widest border-b border-gray-800/50">
                                              <th className="p-3">User</th>
                                              <th className="p-3 text-right">Calls</th>
                                              <th className="p-3 text-right">Tokens</th>
                                              <th className="p-3 text-right">Cost (INR)</th>
                                              <th className="p-3 text-right">Cost (USD)</th>
                                              <th className="p-3">Routes Used</th>
                                              <th className="p-3 text-right">Last Call</th>
                                          </tr>
                                      </thead>
                                      <tbody>
                                          {(usageData.byUser || []).map((row: any) => (
                                              <tr key={row.userId} className="border-b border-gray-800/30 hover:bg-white/5 transition-colors">
                                                  <td className="p-3">
                                                      <div className="flex items-center gap-2">
                                                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${row.userId === 'anonymous' ? 'bg-gray-600' : 'bg-emerald-500'}`} />
                                                          <span className="text-[10px] font-bold text-white">{row.username}</span>
                                                      </div>
                                                  </td>
                                                  <td className="p-3 text-right text-sm font-bold text-white">{Number(row.calls).toLocaleString()}</td>
                                                  <td className="p-3 text-right text-xs text-gray-400">{Number(row.tokens).toLocaleString()}</td>
                                                  <td className="p-3 text-right text-sm font-bold text-emerald-400">₹{Number(row.cost_inr).toFixed(2)}</td>
                                                  <td className="p-3 text-right text-xs text-gray-500">${Number(row.cost_usd).toFixed(4)}</td>
                                                  <td className="p-3">
                                                      <div className="flex gap-1 flex-wrap">
                                                          {(row.routes || []).map((r: string) => (
                                                              <span key={r} className="text-[8px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 font-mono">{r}</span>
                                                          ))}
                                                      </div>
                                                  </td>
                                                  <td className="p-3 text-right text-[9px] text-gray-600 font-mono whitespace-nowrap">
                                                      {row.lastCall ? new Date(row.lastCall).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                                                  </td>
                                              </tr>
                                          ))}
                                          {(usageData.byUser || []).length === 0 && (
                                              <tr><td colSpan={7} className="p-6 text-center text-[10px] text-gray-600 font-mono">No user data for this period</td></tr>
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
                                              <th className="p-3">User</th>
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
                                                  <td className="p-3 text-[10px] font-mono text-gray-500">{log.username || '—'}</td>
                                                  <td className="p-3">
                                                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-widest ${
                                                          log.model.includes('2.0-flash') ? 'bg-emerald-950/50 text-emerald-500' :
                                                          log.model.includes('1.5-flash') ? 'bg-blue-950/50 text-blue-400' :
                                                          'bg-purple-950/50 text-[#00d4ff]'
                                                      }`}>{log.model.replace('gemini-', '')}</span>
                                                  </td>
                                                  <td className="p-3 text-right text-[10px] text-gray-500 font-mono">{(Number(log.input_tokens) + Number(log.output_tokens)).toLocaleString()}</td>
                                                  <td className="p-3 text-right text-[10px] font-bold text-emerald-500">₹{(Number(log.cost_inr || log.cost_usd * (usageData?.exchangeRate || 85))).toFixed(3)}</td>
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

          {/* ── REPORTS TAB ── */}
          {activeTab === 'REPORTS' && (
              <div className="space-y-4 animate-in fade-in duration-500">
                  <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                          <Flag size={16} className="text-red-400" />
                          <h2 className="text-white font-black text-sm uppercase tracking-widest">Player Reports</h2>
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-red-950/50 text-red-400 font-black border border-red-900/30">
                              {reports.filter(r => r.status === 'pending').length} pending
                          </span>
                      </div>
                      <button onClick={fetchReports} disabled={reportsLoading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-800 text-gray-400 hover:text-white text-[10px] font-black tracking-widest uppercase transition-all disabled:opacity-50">
                          <RefreshCw size={11} className={reportsLoading ? 'animate-spin' : ''} /> REFRESH
                      </button>
                  </div>

                  {reportsLoading ? (
                      <div className="text-center py-20 text-gray-600 font-mono text-xs">Loading reports...</div>
                  ) : reports.length === 0 ? (
                      <div className="text-center py-20 text-gray-600 font-mono text-xs">No reports found.</div>
                  ) : (
                      <div className="space-y-2">
                          {reports.map((report: any) => {
                              const isExpanded = expandedReportId === report.id;
                              const statusColor = report.status === 'pending' ? '#f87171' : report.status === 'resolved' ? '#4ade80' : '#6b7280';

                              return (
                                  <div key={report.id} className="bg-gray-900/40 border border-gray-800 rounded-xl overflow-hidden">
                                      {/* Report row */}
                                      <div
                                          className="flex items-center gap-3 p-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                                          onClick={() => setExpandedReportId(isExpanded ? null : report.id)}
                                      >
                                          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${statusColor}15`, border: `1px solid ${statusColor}40` }}>
                                              <Flag size={13} style={{ color: statusColor }} />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                              <div className="flex items-center gap-2 flex-wrap">
                                                  <span className="text-[11px] font-black text-white">{report.reported_name}</span>
                                                  <span className="text-[9px] text-gray-500 font-mono">reported by</span>
                                                  <span className="text-[10px] font-bold text-gray-400">{report.reporter_name}</span>
                                              </div>
                                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                  {(report.reasons || []).map((r: string) => (
                                                      <span key={r} className="text-[8px] px-1.5 py-0.5 rounded bg-red-950/40 text-red-400 font-black border border-red-900/20">{r}</span>
                                                  ))}
                                                  <span className="text-[8px] text-gray-600 font-mono ml-auto">{new Date(report.created_at).toLocaleString()}</span>
                                              </div>
                                          </div>
                                          <span className="text-[8px] px-2 py-1 rounded font-black uppercase tracking-widest flex-shrink-0" style={{ background: `${statusColor}18`, color: statusColor, border: `1px solid ${statusColor}35` }}>
                                              {report.status}
                                          </span>
                                          {isExpanded ? <ChevronUp size={14} className="text-gray-600 flex-shrink-0" /> : <ChevronDown size={14} className="text-gray-600 flex-shrink-0" />}
                                      </div>

                                      {/* Expanded detail panel */}
                                      {isExpanded && (
                                          <div className="border-t border-gray-800 p-4 space-y-4 bg-black/30">
                                              {/* Reported player stats */}
                                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                  {[
                                                      { label: 'Level', value: report.reported_level ?? '—' },
                                                      { label: 'Rank', value: report.reported_rank ?? '—' },
                                                      { label: 'Total XP', value: Number(report.reported_xp || 0).toLocaleString() },
                                                      { label: 'Gold', value: Number(report.reported_gold || 0).toLocaleString() },
                                                      { label: 'Keys', value: report.reported_keys ?? 0 },
                                                  ].map(({ label, value }) => (
                                                      <div key={label} className="bg-gray-900/60 rounded-lg px-3 py-2 border border-gray-800">
                                                          <div className="text-[8px] text-gray-500 font-mono uppercase tracking-widest">{label}</div>
                                                          <div className="text-sm font-black text-white mt-0.5">{value}</div>
                                                      </div>
                                                  ))}
                                              </div>



                                              {/* Actions */}
                                              {report.status === 'pending' && (
                                                  <div className="flex gap-2">
                                                      <button
                                                          onClick={() => resolveReport(report.id, 'resolved')}
                                                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all hover:brightness-110"
                                                          style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)', color: '#4ade80' }}
                                                      >
                                                          <CheckSquare size={12} /> Mark Resolved
                                                      </button>
                                                      <button
                                                          onClick={() => resolveReport(report.id, 'dismissed')}
                                                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all hover:brightness-110"
                                                          style={{ background: 'rgba(107,114,128,0.1)', border: '1px solid rgba(107,114,128,0.25)', color: '#9ca3af' }}
                                                      >
                                                          <XSquare size={12} /> Dismiss
                                                      </button>
                                                  </div>
                                              )}
                                          </div>
                                      )}
                                  </div>
                              );
                          })}
                      </div>
                  )}
              </div>
          )}

          {/* ── APPEALS TAB ── */}
          {activeTab === 'APPEALS' && (
              <div className="space-y-4 animate-in fade-in duration-500">
                  <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                          <ShieldAlert size={16} className="text-orange-400" />
                          <h2 className="text-white font-black text-sm uppercase tracking-widest">Ban Appeals</h2>
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-orange-950/50 text-orange-400 font-black border border-orange-900/30">
                              {appeals.filter(a => a.status === 'pending').length} pending
                          </span>
                      </div>
                      <button onClick={fetchAppeals} disabled={appealsLoading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-800 text-gray-400 hover:text-white text-[10px] font-black tracking-widest uppercase transition-all disabled:opacity-50">
                          <RefreshCw size={11} className={appealsLoading ? 'animate-spin' : ''} /> REFRESH
                      </button>
                  </div>

                  {appealsLoading ? (
                      <div className="text-center py-20 text-gray-600 font-mono text-xs">Loading appeals...</div>
                  ) : appeals.length === 0 ? (
                      <div className="text-center py-20 text-gray-600 font-mono text-xs">No ban appeals found.</div>
                  ) : (
                      <div className="space-y-2">
                          {appeals.map((appeal: any) => {
                              const isExpanded = expandedAppealId === appeal.id;
                              const statusColor = appeal.status === 'pending' ? '#f97316' : appeal.status === 'approved' ? '#4ade80' : '#ef4444';
                              return (
                                  <div key={appeal.id} className="bg-gray-900/40 border border-gray-800 rounded-xl overflow-hidden">
                                      <div
                                          className="flex items-center gap-3 p-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                                          onClick={() => setExpandedAppealId(isExpanded ? null : appeal.id)}
                                      >
                                          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${statusColor}15`, border: `1px solid ${statusColor}40` }}>
                                              <ShieldAlert size={13} style={{ color: statusColor }} />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                              <div className="flex items-center gap-2 flex-wrap">
                                                  <span className="text-[11px] font-black text-white">{appeal.username || 'Unknown'}</span>
                                                  <span className="text-[9px] text-gray-600 font-mono">{appeal.user_id?.substring(0, 8)}...</span>
                                              </div>
                                              <div className="text-[10px] text-gray-500 font-mono mt-0.5 truncate">{appeal.message?.substring(0, 80)}{appeal.message?.length > 80 ? '...' : ''}</div>
                                          </div>
                                          <span className="text-[8px] px-2 py-1 rounded font-black uppercase tracking-widest flex-shrink-0" style={{ background: `${statusColor}18`, color: statusColor, border: `1px solid ${statusColor}35` }}>
                                              {appeal.status}
                                          </span>
                                          <span className="text-[8px] text-gray-600 font-mono flex-shrink-0">
                                              {new Date(appeal.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                          </span>
                                          {isExpanded ? <ChevronUp size={14} className="text-gray-600 flex-shrink-0" /> : <ChevronDown size={14} className="text-gray-600 flex-shrink-0" />}
                                      </div>

                                      {isExpanded && (
                                          <div className="border-t border-gray-800 p-4 space-y-4 bg-black/30">
                                              {/* Full message */}
                                              <div>
                                                  <div className="text-[9px] text-gray-600 font-mono uppercase tracking-widest mb-2">Full Appeal Message</div>
                                                  <div className="bg-gray-900/60 border border-gray-800 rounded-lg p-4 text-xs text-gray-300 font-mono leading-relaxed whitespace-pre-wrap">
                                                      {appeal.message}
                                                  </div>
                                              </div>

                                              {/* User info */}
                                              <div className="grid grid-cols-2 gap-3">
                                                  <div className="bg-gray-900/60 rounded-lg px-3 py-2 border border-gray-800">
                                                      <div className="text-[8px] text-gray-500 font-mono uppercase tracking-widest">User ID</div>
                                                      <div className="text-[10px] font-mono text-white mt-0.5 break-all">{appeal.user_id}</div>
                                                  </div>
                                                  <div className="bg-gray-900/60 rounded-lg px-3 py-2 border border-gray-800">
                                                      <div className="text-[8px] text-gray-500 font-mono uppercase tracking-widest">Submitted</div>
                                                      <div className="text-[10px] font-mono text-white mt-0.5">{new Date(appeal.created_at).toLocaleString()}</div>
                                                  </div>
                                              </div>

                                              {/* Admin note + actions */}
                                              {appeal.status === 'pending' && (
                                                  <div className="space-y-3">
                                                      <div>
                                                          <div className="text-[9px] text-gray-600 font-mono uppercase tracking-widest mb-1.5">Admin Note (optional)</div>
                                                          <input
                                                              value={appealAdminNote[appeal.id] || ''}
                                                              onChange={e => setAppealAdminNote(prev => ({ ...prev, [appeal.id]: e.target.value }))}
                                                              placeholder="Add a note for this decision..."
                                                              className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-xs text-white font-mono outline-none focus:border-gray-600 placeholder-gray-700"
                                                          />
                                                      </div>
                                                      <div className="flex gap-2">
                                                          <button
                                                              onClick={() => resolveAppeal(appeal.id, 'approved')}
                                                              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all hover:brightness-110"
                                                              style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)', color: '#4ade80' }}
                                                          >
                                                              <CheckSquare size={12} /> Approve & Unban
                                                          </button>
                                                          <button
                                                              onClick={() => resolveAppeal(appeal.id, 'denied')}
                                                              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all hover:brightness-110"
                                                              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444' }}
                                                          >
                                                              <XSquare size={12} /> Deny Appeal
                                                          </button>
                                                      </div>
                                                  </div>
                                              )}

                                              {/* Resolved info */}
                                              {appeal.status !== 'pending' && (
                                                  <div className="bg-gray-900/60 border border-gray-800 rounded-lg p-3">
                                                      <div className="flex items-center gap-2">
                                                          <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">Decision:</span>
                                                          <span className={`text-[10px] font-black uppercase ${appeal.status === 'approved' ? 'text-green-400' : 'text-red-400'}`}>
                                                              {appeal.status === 'approved' ? '✓ APPROVED & UNBANNED' : '✗ DENIED'}
                                                          </span>
                                                      </div>
                                                      {appeal.admin_note && (
                                                          <div className="text-[10px] text-gray-400 font-mono mt-1">Note: {appeal.admin_note}</div>
                                                      )}
                                                      {appeal.resolved_at && (
                                                          <div className="text-[9px] text-gray-600 font-mono mt-1">Resolved: {new Date(appeal.resolved_at).toLocaleString()}</div>
                                                      )}
                                                  </div>
                                              )}
                                          </div>
                                      )}
                                  </div>
                              );
                          })}
                      </div>
                  )}
              </div>
          )}
       </main>
    </div>
  );
};

export default AdminDashboard;
