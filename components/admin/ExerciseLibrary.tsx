import React, { useState, useEffect } from 'react';
import { Plus, Edit3, Trash2, Search, Save, X, Video } from 'lucide-react';
import { WorkoutExercise } from '../../types';

const TYPES = ['COMPOUND', 'ISOLATION', 'CARDIO', 'ACCESSORY', 'STRETCH'];
const EQUIPMENT_OPTIONS = ['GYM', 'BODYWEIGHT', 'HOME_DUMBBELLS', 'ANY'];
const MUSCLE_GROUPS = ['CHEST', 'BACK', 'SHOULDERS', 'BICEPS', 'TRICEPS', 'QUADS', 'HAMSTRINGS', 'GLUTES', 'CALVES', 'CORE', 'REAR DELT', 'FULL BODY', 'CARDIO', 'MOBILITY'];

const emptyForm = () => ({
  name: '',
  type: 'COMPOUND',
  muscle_group: '',
  default_sets: 3,
  default_reps: '10',
  video_url: '',
  notes: '',
  equipment: 'GYM',
  display_order: 0,
  is_active: true,
});

const ExerciseLibrary: React.FC<{ adminToken: string }> = ({ adminToken }) => {
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterEquip, setFilterEquip] = useState('ALL');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<WorkoutExercise | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const fetchExercises = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/exercises', { headers: { 'x-admin-token': adminToken } });
      const data = await res.json();
      setExercises(Array.isArray(data) ? data : []);
    } catch { setMsg({ type: 'error', text: 'Failed to load exercises' }); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchExercises(); }, []);

  const openCreate = () => { setEditing(null); setForm(emptyForm()); setShowForm(true); };
  const openEdit = (ex: WorkoutExercise) => {
    setEditing(ex);
    setForm({ name: ex.name, type: ex.type, muscle_group: ex.muscle_group, default_sets: ex.default_sets, default_reps: ex.default_reps, video_url: ex.video_url, notes: ex.notes, equipment: ex.equipment, display_order: ex.display_order, is_active: ex.is_active });
    setShowForm(true);
  };

  const saveExercise = async () => {
    if (!form.name.trim()) return setMsg({ type: 'error', text: 'Name is required' });
    setSaving(true);
    try {
      const url = editing ? `/api/admin/exercises/${editing.id}` : '/api/admin/exercises';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error('Save failed');
      setMsg({ type: 'success', text: editing ? 'Exercise updated' : 'Exercise created' });
      setShowForm(false);
      fetchExercises();
    } catch { setMsg({ type: 'error', text: 'Failed to save exercise' }); }
    finally { setSaving(false); }
  };

  const deleteExercise = async (id: number) => {
    try {
      await fetch(`/api/admin/exercises/${id}`, { method: 'DELETE', headers: { 'x-admin-token': adminToken } });
      setExercises(prev => prev.filter(e => e.id !== id));
      setConfirmDelete(null);
      setMsg({ type: 'success', text: 'Exercise deleted' });
    } catch { setMsg({ type: 'error', text: 'Delete failed' }); }
  };

  const filtered = exercises.filter(e => {
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase()) || e.muscle_group.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'ALL' || e.type === filterType;
    const matchEquip = filterEquip === 'ALL' || e.equipment === filterEquip;
    return matchSearch && matchType && matchEquip;
  });

  const typeColor = (t: string) => {
    if (t === 'COMPOUND') return 'bg-red-900/40 text-red-400 border-red-900';
    if (t === 'ISOLATION') return 'bg-purple-900/40 text-purple-400 border-purple-900';
    if (t === 'ACCESSORY') return 'bg-blue-900/40 text-blue-400 border-blue-900';
    if (t === 'CARDIO') return 'bg-orange-900/40 text-orange-400 border-orange-900';
    return 'bg-green-900/40 text-green-400 border-green-900';
  };

  return (
    <div className="space-y-5">
      {msg && (
        <div className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center justify-between ${msg.type === 'success' ? 'bg-green-900/40 border border-green-700 text-green-400' : 'bg-red-900/40 border border-red-700 text-red-400'}`}>
          {msg.text}
          <button onClick={() => setMsg(null)}><X size={12} /></button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-2.5 text-gray-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search exercises..." className="bg-black border border-gray-800 rounded-lg pl-8 pr-3 py-2 text-xs text-white focus:border-system-neon outline-none w-48" />
          </div>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="bg-black border border-gray-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-system-neon">
            <option value="ALL">All Types</option>
            {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={filterEquip} onChange={e => setFilterEquip(e.target.value)} className="bg-black border border-gray-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-system-neon">
            <option value="ALL">All Equipment</option>
            {EQUIPMENT_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <button onClick={openCreate} className="flex items-center gap-1.5 px-4 py-2 bg-system-neon text-black rounded-lg text-xs font-black tracking-widest uppercase hover:bg-white transition-all shrink-0">
          <Plus size={12} /> ADD EXERCISE
        </button>
      </div>

      <div className="text-[10px] text-gray-600 font-mono">{filtered.length} of {exercises.length} exercises</div>

      {showForm && (
        <div className="bg-gray-900/80 border border-system-neon/30 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-system-neon font-black text-xs tracking-widest uppercase">{editing ? `EDIT: ${editing.name}` : 'NEW EXERCISE'}</h4>
            <button onClick={() => setShowForm(false)}><X size={14} className="text-gray-500 hover:text-white" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-[9px] text-gray-500 uppercase tracking-widest font-bold block mb-1">Exercise Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Barbell Back Squat" className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-xs text-white outline-none focus:border-system-neon" />
            </div>
            <div>
              <label className="text-[9px] text-gray-500 uppercase tracking-widest font-bold block mb-1">Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-xs text-white outline-none focus:border-system-neon">
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] text-gray-500 uppercase tracking-widest font-bold block mb-1">Equipment</label>
              <select value={form.equipment} onChange={e => setForm(f => ({ ...f, equipment: e.target.value }))} className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-xs text-white outline-none focus:border-system-neon">
                {EQUIPMENT_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] text-gray-500 uppercase tracking-widest font-bold block mb-1">Muscle Group</label>
              <select value={form.muscle_group} onChange={e => setForm(f => ({ ...f, muscle_group: e.target.value }))} className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-xs text-white outline-none focus:border-system-neon">
                <option value="">— Select —</option>
                {MUSCLE_GROUPS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] text-gray-500 uppercase tracking-widest font-bold block mb-1">Default Sets</label>
              <input type="number" min={1} max={10} value={form.default_sets} onChange={e => setForm(f => ({ ...f, default_sets: parseInt(e.target.value) || 3 }))} className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-xs text-white outline-none focus:border-system-neon" />
            </div>
            <div>
              <label className="text-[9px] text-gray-500 uppercase tracking-widest font-bold block mb-1">Default Reps / Duration</label>
              <input value={form.default_reps} onChange={e => setForm(f => ({ ...f, default_reps: e.target.value }))} placeholder="e.g. 12, 10, 8 or 5 min" className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-xs text-white outline-none focus:border-system-neon" />
            </div>
            <div className="col-span-2">
              <label className="text-[9px] text-gray-500 uppercase tracking-widest font-bold block mb-1">Video URL (Demo)</label>
              <div className="flex gap-2 items-center">
                <Video size={12} className="text-gray-500 shrink-0" />
                <input value={form.video_url} onChange={e => setForm(f => ({ ...f, video_url: e.target.value }))} placeholder="https://youtube.com/... or direct video URL" className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-xs text-white outline-none focus:border-system-neon" />
              </div>
            </div>
            <div className="col-span-2">
              <label className="text-[9px] text-gray-500 uppercase tracking-widest font-bold block mb-1">Coach Notes</label>
              <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="e.g. Keep back straight, use full ROM" className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-xs text-white outline-none focus:border-system-neon" />
            </div>
            <div>
              <label className="text-[9px] text-gray-500 uppercase tracking-widest font-bold block mb-1">Display Order</label>
              <input type="number" value={form.display_order} onChange={e => setForm(f => ({ ...f, display_order: parseInt(e.target.value) || 0 }))} className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-xs text-white outline-none focus:border-system-neon" />
            </div>
            <div className="flex items-center gap-2 mt-4">
              <input type="checkbox" id="ex-active" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="accent-system-neon" />
              <label htmlFor="ex-active" className="text-[10px] text-gray-400 font-mono">Active (visible to AI)</label>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={saveExercise} disabled={saving} className="flex items-center gap-1.5 px-5 py-2 bg-system-neon text-black rounded font-black text-xs hover:bg-white transition-all">
              <Save size={12} /> {saving ? 'SAVING...' : editing ? 'UPDATE' : 'CREATE'}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-800 text-gray-400 rounded text-xs font-bold hover:text-white transition-all">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-gray-600 font-mono text-xs">Loading exercise library...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-700">
          <div className="text-sm font-bold mb-2">No exercises found</div>
          <div className="text-[10px] font-mono">Add exercises to the library so AI can use them when generating plans.</div>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(ex => (
            <div key={ex.id} className={`bg-gray-900/40 border rounded-xl p-4 flex items-center gap-4 transition-all hover:border-gray-600 ${ex.is_active ? 'border-gray-800' : 'border-gray-900 opacity-50'}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${typeColor(ex.type)}`}>{ex.type}</span>
                  <span className="text-sm font-bold text-white truncate">{ex.name}</span>
                  {ex.muscle_group && <span className="text-[9px] text-gray-500 font-mono">{ex.muscle_group}</span>}
                </div>
                <div className="flex gap-4 mt-1">
                  <span className="text-[10px] text-gray-500 font-mono">{ex.default_sets}×{ex.default_reps}</span>
                  <span className="text-[10px] text-gray-600 font-mono">{ex.equipment}</span>
                  {ex.notes && <span className="text-[10px] text-gray-600 italic truncate max-w-[200px]">{ex.notes}</span>}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                {ex.video_url && <a href={ex.video_url} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-system-neon transition-colors"><Video size={14} /></a>}
                <button onClick={() => openEdit(ex)} className="text-gray-600 hover:text-white transition-colors"><Edit3 size={14} /></button>
                {confirmDelete === ex.id ? (
                  <div className="flex gap-1 items-center">
                    <button onClick={() => deleteExercise(ex.id)} className="text-[9px] bg-red-900/50 border border-red-700 text-red-400 px-2 py-1 rounded font-bold">CONFIRM</button>
                    <button onClick={() => setConfirmDelete(null)} className="text-[9px] text-gray-600 hover:text-white">✕</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDelete(ex.id)} className="text-gray-700 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExerciseLibrary;
