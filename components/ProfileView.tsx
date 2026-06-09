import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, User, Briefcase, Award, Shield, Terminal, Activity, Settings, LogOut, Lock, ArrowLeft, CheckCircle, XCircle, AlertTriangle, Camera, Loader2 } from 'lucide-react';
import { PlayerData, HealthProfile } from '../types';
import { API_BASE } from '../lib/apiConfig';
import { getPlayerAuthHeaders, getOrRefreshPlayerHeaders } from '../lib/playerApi';



interface ProfileViewProps {
  player: PlayerData;
  onUpdate: (data: { name: string; username: string; job: string; title: string; healthProfile?: HealthProfile }) => void;
  onAvatarChange?: (newUrl: string) => void;
  onLogout: () => void;
  onBack?: () => void;
  onDeleteAccount?: () => Promise<void>;
}

const glassPanel = {
  background: 'var(--glass-panel-bg)',
  backdropFilter: 'blur(20px) saturate(180%)',
  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
  borderTop: 'var(--glass-panel-border-t)',
  borderLeft: 'var(--glass-panel-border-l)',
  borderRight: 'var(--glass-panel-border-r)',
  borderBottom: 'var(--glass-panel-border-b)',
  boxShadow: 'var(--glass-panel-shadow)',
};

const inputClass = "w-full border rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-1 transition-all placeholder-gray-700";
const inputClassStyle: React.CSSProperties = {
  background: 'var(--color-input-bg)',
  borderColor: 'var(--color-input-border)',
  color: 'var(--color-text-heading)',
};
const labelClass = "block text-[10px] text-gray-500 mb-1.5 font-mono tracking-widest uppercase";

// Compress & resize image to max 512×512, returns base64 data URL.
// Tries WebP first for smallest size; falls back to JPEG if WebView doesn't support WebP canvas.
function compressImage(file: File, maxSize = 512): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let w = img.width, h = img.height;
          if (w > h) { if (w > maxSize) { h = Math.round(h * maxSize / w); w = maxSize; } }
          else { if (h > maxSize) { w = Math.round(w * maxSize / h); h = maxSize; } }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0, w, h);
          let dataUrl = canvas.toDataURL('image/webp', 0.80);
          if (!dataUrl.startsWith('data:image/webp')) {
            dataUrl = canvas.toDataURL('image/jpeg', 0.82);
          }
          resolve(dataUrl);
        } catch (canvasErr) {
          resolve(reader.result as string);
        }
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

const ProfileView: React.FC<ProfileViewProps> = ({ player, onUpdate, onAvatarChange, onLogout, onBack, onDeleteAccount }) => {

  const [activeTab, setActiveTab] = useState<'LOGS' | 'CONFIG'>('LOGS');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0);
  const [deleteTyped, setDeleteTyped] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const [name, setName] = useState(player.name || '');
  const [username, setUsername] = useState(player.username || '');
  const [job, setJob] = useState(player.job || '');
  const [title, setTitle] = useState(player.title || '');

  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const usernameDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const originalUsername = useRef(player.username || '');

  // Avatar upload state
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Sound & Haptic preferences (backed by localStorage)
  const [soundMuted, setSoundMuted] = useState(() => localStorage.getItem('system_sound_muted') === 'true');
  const [hapticDisabled, setHapticDisabled] = useState(() => localStorage.getItem('system_haptic_disabled') === 'true');

  const handleAvatarPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setAvatarError('Please select an image file'); return; }
    if (file.size > 10 * 1024 * 1024) { setAvatarError('Image must be under 10 MB'); return; }

    setAvatarError('');
    setAvatarUploading(true);
    try {
      const compressed = await compressImage(file);
      const authHeaders = await getOrRefreshPlayerHeaders(API_BASE);
      const res = await fetch(`${API_BASE}/api/player/${player.userId}/avatar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        credentials: 'include',
        body: JSON.stringify({ imageBase64: compressed }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(err.error || 'Upload failed');
      }
      const { avatarUrl } = await res.json();
      if (onAvatarChange) onAvatarChange(avatarUrl);
    } catch (err: any) {
      setAvatarError(err.message || 'Upload failed');
    } finally {
      setAvatarUploading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const hp = player.healthProfile;
  const [age, setAge] = useState(hp?.age?.toString() || '');
  const [height, setHeight] = useState(hp?.height?.toString() || '');
  const [weight, setWeight] = useState(hp?.weight?.toString() || '');
  const [targetWeight, setTargetWeight] = useState(hp?.targetWeight?.toString() || '');
  const [gender, setGender] = useState<'MALE' | 'FEMALE'>(hp?.gender || 'MALE');
  const [goal, setGoal] = useState<HealthProfile['goal']>(hp?.goal || 'BUILD_MUSCLE');
  const [activityLevel, setActivityLevel] = useState<HealthProfile['activityLevel']>(hp?.activityLevel || 'MODERATE');
  const [equipment, setEquipment] = useState<HealthProfile['equipment']>(hp?.equipment || 'GYM');

  useEffect(() => {
    const trimmed = username.trim().toLowerCase();
    const origTrimmed = originalUsername.current.trim().toLowerCase();
    if (!trimmed || trimmed === origTrimmed) {
      setUsernameStatus('idle');
      return;
    }
    setUsernameStatus('checking');
    if (usernameDebounce.current) clearTimeout(usernameDebounce.current);
    usernameDebounce.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/player/codename/check?name=${encodeURIComponent(trimmed)}`);
        const data = await res.json();
        setUsernameStatus(data.available ? 'available' : 'taken');
      } catch {
        setUsernameStatus('idle');
      }
    }, 600);
    return () => { if (usernameDebounce.current) clearTimeout(usernameDebounce.current); };
  }, [username]);

  const canSave = usernameStatus !== 'taken' && usernameStatus !== 'checking';

  const handleSave = () => {
    if (!canSave) return;
    let updatedHealth: HealthProfile | undefined = undefined;
    if (hp) {
      updatedHealth = {
        ...hp,
        age: parseInt(age) || hp.age,
        height: parseFloat(height) || hp.height,
        weight: parseFloat(weight) || hp.weight,
        targetWeight: parseFloat(targetWeight) || hp.targetWeight,
        gender,
        goal: goal as HealthProfile['goal'],
        activityLevel: activityLevel as HealthProfile['activityLevel'],
        equipment: equipment as HealthProfile['equipment'],
      };
    }
    onUpdate({ name: name.trim(), username: username.trim(), job: job.trim(), title: title.trim(), healthProfile: updatedHealth });
    originalUsername.current = username.trim();
    setUsernameStatus('idle');
  };


  return (
    <div className="flex flex-col items-center justify-start min-h-[80vh] gap-6 w-full max-w-2xl mx-auto pb-32">

      {/* Back Button */}
      {onBack && (
        <div className="w-full flex items-center">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-xs font-mono tracking-widest group"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
            BACK TO DASHBOARD
          </button>
        </div>
      )}

      {/* ID Card */}
      <motion.div
        initial={{ rotateY: 10, rotateX: 5 }}
        animate={{ rotateY: [10, -10, 10], rotateX: [5, -5, 5], y: [0, -5, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        className="relative group perspective-1000 shrink-0"
      >
        <div className="relative w-[320px] md:w-[380px] h-[200px] bg-black border border-gray-800 rounded-xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-xl flex">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-20 z-20 pointer-events-none" />
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-system-neon via-system-accent to-system-neon opacity-80" />
          <div className="w-1/3 bg-gray-900/50 border-r border-gray-800 relative flex flex-col items-center justify-center p-2">
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarUploading}
              className="relative w-20 h-20 rounded-full border-2 border-system-neon/50 flex items-center justify-center bg-black/50 mb-2 group/avatar cursor-pointer overflow-hidden"
              title="Change avatar"
            >
              {(player.avatarUrl || player.replitUser?.profileImageUrl) ? (
                <img src={player.avatarUrl || player.replitUser!.profileImageUrl!} alt={name} className="w-full h-full rounded-full object-cover" />
              ) : (
                <User size={32} className="text-gray-400" />
              )}
              {/* Hover overlay */}
              <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                {avatarUploading ? (
                  <Loader2 size={20} className="text-system-neon animate-spin" />
                ) : (
                  <Camera size={18} className="text-white" />
                )}
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarPick}
              />
            </button>
            {avatarError && <div className="text-[8px] text-red-400 text-center font-mono mt-0.5 max-w-[100px] truncate">{avatarError}</div>}
            <div className="text-[10px] font-mono text-system-neon tracking-widest bg-system-neon/10 px-2 py-0.5 rounded border border-system-neon/20">
              RANK: {player.rank}
            </div>
            <motion.div
              animate={{ top: ['0%', '100%', '0%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              className="absolute left-0 w-full h-[1px] bg-system-neon shadow-[0_0_10px_#00d4ff] z-20 opacity-30"
            />
          </div>
          <div className="flex-1 p-4 font-mono flex flex-col justify-between relative z-30">
            <div>
              <h2 className="text-white font-bold text-lg tracking-tight uppercase truncate">{name || player.name}</h2>
              {player.username && <div className="text-[#00d4ff] text-[10px] tracking-widest">@{player.username}</div>}
              <div className="text-xs text-system-accent font-bold truncate">{job || player.job}</div>
              <div className="text-[10px] text-gray-500 mt-1 truncate">TITLE: {title || player.title}</div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-gray-400 border-b border-gray-800 pb-1">
                <span>LEVEL</span>
                <span className="text-white font-bold">{player.level}</span>
              </div>
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>ID</span>
                <span className="text-gray-600">#{player.userId?.substring(0, 6) || 'SYS-001'}</span>
              </div>
            </div>
            <div className="absolute bottom-2 right-2">
              <Shield size={24} className="text-gray-800/50" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="w-full rounded-2xl overflow-hidden" style={glassPanel}>
        <div className="flex border-b border-white/[0.06]">
          {(['LOGS', 'CONFIG'] as const).map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`flex-1 py-3 text-xs font-mono font-bold tracking-widest transition-colors flex items-center justify-center gap-2 ${
                activeTab === t ? 'text-[#00d4ff] border-b-2 border-[#00d4ff]' : 'text-gray-600 hover:text-gray-300'
              }`}
            >
              {t === 'LOGS' && <Terminal size={13} />}
              {t === 'CONFIG' && <Settings size={13} />}
              {t}
            </button>
          ))}
        </div>

        <div className="p-5 min-h-[320px]">
          <AnimatePresence mode="wait">

            {/* LOGS */}
            {activeTab === 'LOGS' && (
              <motion.div key="logs" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2 }} className="h-full flex flex-col">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-xs text-gray-400 font-mono uppercase tracking-widest">System Activity</h3>
                  <span className="text-[10px] text-gray-600 font-mono">{player.logs.length} ENTRIES</span>
                </div>
                <div className="flex-1 overflow-y-auto max-h-[260px] space-y-1.5 custom-scrollbar">
                  {player.logs.length > 0 ? player.logs.map((log) => (
                    <div key={log.id} className="text-[10px] font-mono p-2 border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors rounded">
                      <div className="flex justify-between text-gray-600 mb-0.5">
                        <span>{new Date(log.timestamp).toLocaleDateString()}</span>
                        <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <div className={
                        log.type === 'PENALTY' ? 'text-red-400' :
                        log.type === 'LEVEL_UP' ? 'text-[#00d4ff] font-bold' :
                        log.type === 'PURCHASE' ? 'text-yellow-500' : 'text-gray-300'
                      }>{log.message}</div>
                    </div>
                  )) : (
                    <div className="text-center text-gray-600 text-xs py-10 font-mono">NO RECORDS FOUND</div>
                  )}
                </div>
              </motion.div>
            )}

            {/* CONFIG */}
            {activeTab === 'CONFIG' && (
              <motion.div key="config" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2 }} className="space-y-5">

                {/* Identity */}
                <div className="space-y-3">
                  <div className="text-[10px] text-[#00d4ff] font-mono tracking-widest mb-2">IDENTITY</div>

                  <div>
                    <label className={labelClass}>Username (Codename)</label>
                    <div className="relative">
                      <input
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        placeholder="unique codename..."
                        className={inputClass}
                      />
                      {usernameStatus !== 'idle' && (
                        <div className="absolute right-3 top-2.5">
                          {usernameStatus === 'checking' && (
                            <div className="w-4 h-4 border-2 border-gray-600 border-t-[#00d4ff] rounded-full animate-spin" />
                          )}
                          {usernameStatus === 'available' && <CheckCircle size={14} className="text-green-400" />}
                          {usernameStatus === 'taken' && <XCircle size={14} className="text-red-400" />}
                        </div>
                      )}
                    </div>
                    {usernameStatus === 'taken' && (
                      <p className="text-red-400 text-[10px] font-mono mt-1">Codename already in use.</p>
                    )}
                    {usernameStatus === 'available' && (
                      <p className="text-green-400 text-[10px] font-mono mt-1">Codename available.</p>
                    )}
                  </div>

                  <div>
                    <label className={labelClass}>Display Name</label>
                    <div className="relative">
                      <User size={14} className="absolute left-3 top-3 text-gray-600" />
                      <input value={name} onChange={e => setName(e.target.value)} className={`${inputClass} pl-9`} />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Job Class</label>
                    <div className="relative">
                      <Briefcase size={14} className="absolute left-3 top-3 text-gray-600" />
                      <input value={job} onChange={e => setJob(e.target.value)} className={`${inputClass} pl-9`} />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Title</label>
                    <div className="relative">
                      <Award size={14} className="absolute left-3 top-3 text-gray-600" />
                      <input value={title} onChange={e => setTitle(e.target.value)} className={`${inputClass} pl-9`} />
                    </div>
                  </div>
                </div>

                {/* Biometrics — only if health profile exists */}
                {hp && (
                  <div className="space-y-3 pt-3 border-t border-white/[0.06]">
                    <div className="text-[10px] text-[#00d4ff] font-mono tracking-widest mb-2">BIOMETRICS</div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>Age</label>
                        <input type="number" value={age} onChange={e => setAge(e.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Height (cm)</label>
                        <input type="number" value={height} onChange={e => setHeight(e.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Weight (kg)</label>
                        <input type="number" value={weight} onChange={e => setWeight(e.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Target Weight (kg)</label>
                        <input type="number" value={targetWeight} onChange={e => setTargetWeight(e.target.value)} className={inputClass} />
                      </div>
                    </div>

                    <div>
                      <label className={labelClass}>Gender</label>
                      <div className="flex gap-2">
                        {(['MALE', 'FEMALE'] as const).map(g => (
                          <button
                            key={g}
                            onClick={() => setGender(g)}
                            className={`flex-1 py-2 rounded-lg text-xs font-mono font-bold transition-all border ${
                              gender === g
                                ? 'bg-[#00d4ff]/15 border-[#00d4ff]/50 text-[#00d4ff]'
                                : 'bg-black/40 border-white/10 text-gray-500 hover:text-gray-300'
                            }`}
                          >{g}</button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className={labelClass}>Goal</label>
                      <select value={goal} onChange={e => setGoal(e.target.value as HealthProfile['goal'])} className={inputClass}>
                        <option value="LOSE_WEIGHT">Lose Weight</option>
                        <option value="BUILD_MUSCLE">Build Muscle</option>
                        <option value="ENDURANCE">Endurance</option>
                        <option value="RECOMP">Body Recomp</option>
                      </select>
                    </div>

                    <div>
                      <label className={labelClass}>Activity Level</label>
                      <select value={activityLevel} onChange={e => setActivityLevel(e.target.value as HealthProfile['activityLevel'])} className={inputClass}>
                        <option value="SEDENTARY">Sedentary</option>
                        <option value="LIGHT">Light</option>
                        <option value="MODERATE">Moderate</option>
                        <option value="VERY_ACTIVE">Very Active</option>
                      </select>
                    </div>

                    <div>
                      <label className={labelClass}>Equipment</label>
                      <select value={equipment} onChange={e => setEquipment(e.target.value as HealthProfile['equipment'])} className={inputClass}>
                        <option value="GYM">Gym</option>
                        <option value="HOME_DUMBBELLS">Home (Dumbbells)</option>
                        <option value="BODYWEIGHT">Bodyweight Only</option>
                      </select>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleSave}
                  disabled={!canSave}
                  className={`w-full py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-xs font-mono tracking-widest transition-all ${
                    canSave
                      ? 'hover:opacity-90 active:scale-[0.98]'
                      : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                  }`}
                  style={canSave ? { background: 'var(--color-btn-save-bg)', color: 'var(--color-btn-save-text)' } : undefined}
                >
                  <Save size={14} />
                  SAVE CHANGES
                </button>



                {/* ── Sound & Haptic toggles ── */}
                <div className="space-y-2">
                  {/* Sound toggle */}
                  <button
                    onClick={() => { const next = !soundMuted; setSoundMuted(next); localStorage.setItem('system_sound_muted', next ? 'true' : 'false'); }}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: soundMuted ? 'rgba(239,68,68,0.15)' : 'rgba(0,212,255,0.15)' }}>
                        <Activity size={16} className={soundMuted ? 'text-red-400' : 'text-[#00d4ff]'} />
                      </div>
                      <div className="text-left">
                        <div className="text-[11px] font-bold text-white tracking-wide">{soundMuted ? 'SOUND OFF' : 'SOUND ON'}</div>
                        <div className="text-[9px] text-gray-500 font-mono">Game audio effects</div>
                      </div>
                    </div>
                    <div
                      className="w-10 h-5 rounded-full relative transition-colors"
                      style={{ background: !soundMuted ? '#00d4ff' : 'rgba(255,255,255,0.12)' }}
                    >
                      <motion.div
                        className="w-4 h-4 rounded-full bg-white absolute top-0.5"
                        animate={{ left: !soundMuted ? 22 : 2 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }}
                      />
                    </div>
                  </button>

                  {/* Haptic toggle */}
                  <button
                    onClick={() => { const next = !hapticDisabled; setHapticDisabled(next); localStorage.setItem('system_haptic_disabled', next ? 'true' : 'false'); }}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: hapticDisabled ? 'rgba(239,68,68,0.15)' : 'rgba(76,217,100,0.15)' }}>
                        <Shield size={16} className={hapticDisabled ? 'text-red-400' : 'text-green-400'} />
                      </div>
                      <div className="text-left">
                        <div className="text-[11px] font-bold text-white tracking-wide">{hapticDisabled ? 'HAPTIC OFF' : 'HAPTIC ON'}</div>
                        <div className="text-[9px] text-gray-500 font-mono">Vibration feedback</div>
                      </div>
                    </div>
                    <div
                      className="w-10 h-5 rounded-full relative transition-colors"
                      style={{ background: !hapticDisabled ? '#4ade80' : 'rgba(255,255,255,0.12)' }}
                    >
                      <motion.div
                        className="w-4 h-4 rounded-full bg-white absolute top-0.5"
                        animate={{ left: !hapticDisabled ? 22 : 2 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }}
                      />
                    </div>
                  </button>
                </div>

                <div className="pt-3 border-t border-white/[0.06] space-y-3">
                  <button
                    onClick={onLogout}
                    className="w-full bg-red-900/20 border border-red-900/50 text-red-500 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-red-900/40 hover:text-red-400 transition-colors text-xs font-mono"
                  >
                    <LogOut size={12} /> LOGOUT
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full border border-red-900/30 text-red-700 py-2 rounded-lg flex items-center justify-center gap-2 hover:border-red-600/50 hover:text-red-500 hover:bg-red-900/10 transition-all text-[10px] font-mono tracking-widest"
                  >
                    DELETE ACCOUNT
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && onDeleteAccount && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[800] bg-black/90 flex items-center justify-center p-6 font-mono"
            onClick={() => { setShowDeleteConfirm(false); setDeleteStep(0); setDeleteTyped(''); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm bg-[#0a0a14] border border-red-900/40 rounded-2xl p-6 space-y-4"
            >
              {deleteStep === 2 ? (
                <div className="text-center py-4">
                  {deleteError ? (
                    <>
                      <XCircle size={32} className="text-red-500 mx-auto mb-3" />
                      <div className="text-xs text-red-400 font-bold tracking-widest mb-1">DELETION FAILED</div>
                      <p className="text-[11px] text-gray-400 mt-2 px-2">{deleteError}</p>
                      <div className="grid grid-cols-2 gap-3 mt-4">
                        <button onClick={() => { setShowDeleteConfirm(false); setDeleteStep(0); setDeleteTyped(''); setDeleteError(''); }} className="py-3 rounded-xl border border-gray-700 text-gray-400 font-bold text-xs tracking-widest">
                          CANCEL
                        </button>
                        <button onClick={() => { setDeleteError(''); setDeleteStep(1); }} className="py-3 rounded-xl bg-red-600 text-white font-bold text-xs tracking-widest hover:bg-red-500 transition-colors">
                          RETRY
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                      <div className="text-xs text-gray-400 tracking-widest">DELETING ACCOUNT...</div>
                    </>
                  )}
                </div>
              ) : deleteStep === 1 ? (
                <>
                  <div className="text-center">
                    <AlertTriangle size={32} className="text-red-500 mx-auto mb-2" />
                    <h3 className="text-lg font-black text-red-400">FINAL CONFIRMATION</h3>
                    <p className="text-[11px] text-gray-400 mt-2">Type <span className="text-red-400 font-bold">DELETE</span> below to permanently erase your account.</p>
                  </div>
                  <input
                    type="text"
                    value={deleteTyped}
                    onChange={e => setDeleteTyped(e.target.value.toUpperCase())}
                    placeholder="Type DELETE"
                    className="w-full bg-black/60 border border-red-900/40 rounded-lg px-3 py-2.5 text-sm font-mono text-white focus:border-red-500/50 focus:outline-none text-center tracking-widest"
                    autoFocus
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => { setShowDeleteConfirm(false); setDeleteStep(0); setDeleteTyped(''); }} className="py-3 rounded-xl border border-gray-700 text-gray-400 font-bold text-xs tracking-widest">
                      CANCEL
                    </button>
                    <button
                      disabled={deleteTyped !== 'DELETE'}
                      onClick={async () => {
                        setDeleteStep(2);
                        setDeleteError('');
                        try {
                          await onDeleteAccount();
                        } catch (err: any) {
                          setDeleteError(err?.message || 'Something went wrong. Your data was NOT deleted.');
                        }
                      }}
                      className={`py-3 rounded-xl font-bold text-xs tracking-widest transition-all ${
                        deleteTyped === 'DELETE'
                          ? 'bg-red-600 text-white hover:bg-red-500'
                          : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                      }`}
                    >
                      DELETE FOREVER
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-center">
                    <AlertTriangle size={32} className="text-red-500 mx-auto mb-2" />
                    <h3 className="text-lg font-black text-white">Delete Account?</h3>
                    <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">This will <span className="text-red-400 font-bold">permanently delete</span> everything:</p>
                    <ul className="text-[10px] text-gray-500 mt-3 space-y-1 text-left px-4">
                      <li className="flex items-center gap-2"><span className="text-red-400">✕</span> Your profile & codename</li>
                      <li className="flex items-center gap-2"><span className="text-red-400">✕</span> All XP, level, rank, streak</li>
                      <li className="flex items-center gap-2"><span className="text-red-400">✕</span> All coins & keys</li>
                      <li className="flex items-center gap-2"><span className="text-red-400">✕</span> Workout history & nutrition logs</li>
                      <li className="flex items-center gap-2"><span className="text-red-400">✕</span> Borders, themes & purchases</li>
                    </ul>
                    <p className="text-[10px] text-red-400 font-bold mt-3">This action CANNOT be undone.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => { setShowDeleteConfirm(false); setDeleteStep(0); }} className="py-3 rounded-xl border border-gray-700 text-gray-400 font-bold text-xs tracking-widest">
                      CANCEL
                    </button>
                    <button
                      onClick={() => setDeleteStep(1)}
                      className="py-3 rounded-xl bg-red-600 text-white font-bold text-xs tracking-widest hover:bg-red-500 transition-colors"
                    >
                      CONTINUE
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProfileView;
