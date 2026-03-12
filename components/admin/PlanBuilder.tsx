import React, { useState, useEffect } from 'react';
import { Plus, Edit3, Trash2, Save, X, ChevronDown, ChevronUp, Dumbbell } from 'lucide-react';
import { WorkoutExercise, WorkoutPlan, WorkoutDay } from '../../types';

const ADMIN_SECRET = 'system_admin_2025';
const DIFFICULTY_OPTIONS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];
const EQUIPMENT_OPTIONS = ['GYM', 'HOME_DUMBBELLS', 'BODYWEIGHT'];
const FOCUS_OPTIONS = ['PUSH', 'PULL', 'LEGS', 'PUSH 2', 'PULL 2', 'UPPER BODY', 'LOWER BODY', 'FULL BODY', 'CORE', 'CARDIO', 'REST'];

const difficultyColor = (d: string) => {
  if (d === 'BEGINNER') return 'bg-green-900/40 text-green-400 border-green-900';
  if (d === 'INTERMEDIATE') return 'bg-yellow-900/40 text-yellow-400 border-yellow-900';
  return 'bg-red-900/40 text-red-400 border-red-900';
};

const emptyPlanForm = () => ({
  name: '',
  description: '',
  difficulty: 'BEGINNER',
  equipment: 'GYM',
  duration_weeks: 4,
  days_per_week: 4,
  is_active: true,
  display_order: 0,
  image_url: '',
  days: [] as WorkoutDay[],
});

interface DayEditorProps {
  day: WorkoutDay;
  dayIndex: number;
  exercises: WorkoutExercise[];
  onChange: (updated: WorkoutDay) => void;
  onDelete: () => void;
}

const DayEditor: React.FC<DayEditorProps> = ({ day, dayIndex, exercises, onChange, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const [selectedExId, setSelectedExId] = useState('');

  const addExercise = () => {
    const ex = exercises.find(e => e.id === parseInt(selectedExId));
    if (!ex) return;
    const newExercise = {
      name: ex.name,
      sets: ex.default_sets,
      reps: ex.default_reps,
      type: ex.type,
      notes: ex.notes || '',
      videoUrl: ex.video_url || '',
      completed: false,
      duration: 0,
    };
    onChange({ ...day, exercises: [...(day.exercises || []), newExercise] });
    setSelectedExId('');
  };

  const removeExercise = (idx: number) => {
    onChange({ ...day, exercises: day.exercises.filter((_, i) => i !== idx) });
  };

  const updateExercise = (idx: number, field: string, value: string | number) => {
    const updated = [...day.exercises];
    (updated[idx] as any)[field] = value;
    onChange({ ...day, exercises: updated });
  };

  return (
    <div className="bg-black/40 border border-gray-800 rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-white/5" onClick={() => setExpanded(!expanded)}>
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 ${day.isRecovery ? 'bg-gray-800 text-gray-400' : 'bg-system-neon/20 text-system-neon'}`}>{dayIndex + 1}</div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white">{day.day}</span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${day.isRecovery ? 'bg-gray-800 text-gray-500' : 'bg-system-neon/10 text-system-neon'}`}>{day.focus}</span>
          </div>
          <div className="text-[10px] text-gray-600">{day.isRecovery ? 'Rest Day' : `${(day.exercises || []).length} exercises · ${day.totalDuration || 60} min`}</div>
        </div>
        <div className="flex gap-2">
          <button onClick={e => { e.stopPropagation(); onDelete(); }} className="text-gray-700 hover:text-red-500 transition-colors"><Trash2 size={12} /></button>
          {expanded ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
        </div>
      </div>

      {expanded && (
        <div className="p-3 pt-0 border-t border-gray-800/50 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[9px] text-gray-600 uppercase tracking-widest block mb-1">Focus</label>
              <select value={day.focus} onChange={e => onChange({ ...day, focus: e.target.value })} className="w-full bg-black border border-gray-800 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-system-neon">
                {FOCUS_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] text-gray-600 uppercase tracking-widest block mb-1">Duration (min)</label>
              <input type="number" value={day.totalDuration || 60} onChange={e => onChange({ ...day, totalDuration: parseInt(e.target.value) || 60 })} className="w-full bg-black border border-gray-800 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-system-neon" />
            </div>
            <div className="flex items-end pb-1.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={day.isRecovery || false} onChange={e => onChange({ ...day, isRecovery: e.target.checked, exercises: e.target.checked ? [] : day.exercises })} className="accent-system-neon" />
                <span className="text-[10px] text-gray-400">Rest Day</span>
              </label>
            </div>
          </div>

          {!day.isRecovery && (
            <>
              <div className="space-y-2">
                {(day.exercises || []).map((ex, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-gray-900/50 border border-gray-800 rounded-lg p-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-white truncate">{ex.name}</div>
                      <div className="flex gap-3">
                        <input value={ex.sets} onChange={e => updateExercise(idx, 'sets', parseInt(e.target.value) || 3)} type="number" min={1} className="w-12 bg-black border border-gray-800 rounded px-1 py-0.5 text-[10px] text-white outline-none" placeholder="sets" />
                        <input value={ex.reps} onChange={e => updateExercise(idx, 'reps', e.target.value)} className="w-20 bg-black border border-gray-800 rounded px-1 py-0.5 text-[10px] text-white outline-none" placeholder="reps" />
                      </div>
                    </div>
                    <button onClick={() => removeExercise(idx)} className="text-gray-700 hover:text-red-500 transition-colors shrink-0"><X size={12} /></button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <select value={selectedExId} onChange={e => setSelectedExId(e.target.value)} className="flex-1 bg-black border border-gray-800 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-system-neon">
                  <option value="">— Pick exercise from library —</option>
                  {exercises.filter(e => e.is_active).map(e => (
                    <option key={e.id} value={e.id}>{e.name} ({e.type})</option>
                  ))}
                </select>
                <button onClick={addExercise} disabled={!selectedExId} className="flex items-center gap-1 px-3 py-1.5 bg-system-neon/20 border border-system-neon/40 text-system-neon rounded text-xs font-bold hover:bg-system-neon/30 transition-all disabled:opacity-40">
                  <Plus size={12} /> Add
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

const PlanBuilder: React.FC = () => {
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<WorkoutPlan | null>(null);
  const [form, setForm] = useState(emptyPlanForm());
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [expandedPlan, setExpandedPlan] = useState<number | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [plansRes, exRes] = await Promise.all([
        fetch('/api/admin/plans', { headers: { 'x-admin-token': ADMIN_SECRET } }),
        fetch('/api/admin/exercises', { headers: { 'x-admin-token': ADMIN_SECRET } }),
      ]);
      const plansData = await plansRes.json();
      const exData = await exRes.json();
      setPlans(Array.isArray(plansData) ? plansData : []);
      setExercises(Array.isArray(exData) ? exData : []);
    } catch { setMsg({ type: 'error', text: 'Failed to load data' }); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyPlanForm());
    setShowForm(true);
  };

  const openEdit = (p: WorkoutPlan) => {
    setEditing(p);
    setForm({ name: p.name, description: p.description, difficulty: p.difficulty, equipment: p.equipment, duration_weeks: p.duration_weeks, days_per_week: p.days_per_week, is_active: p.is_active, display_order: p.display_order, image_url: p.image_url || '', days: Array.isArray(p.days) ? p.days : [] });
    setShowForm(true);
  };

  const addDay = () => {
    const n = form.days.length + 1;
    const newDay: WorkoutDay = { day: `DAY ${n}`, focus: 'PUSH', isRecovery: false, totalDuration: 60, exercises: [] };
    setForm(f => ({ ...f, days: [...f.days, newDay] }));
  };

  const updateDay = (idx: number, updated: WorkoutDay) => {
    setForm(f => { const d = [...f.days]; d[idx] = updated; return { ...f, days: d }; });
  };

  const deleteDay = (idx: number) => {
    setForm(f => ({ ...f, days: f.days.filter((_, i) => i !== idx) }));
  };

  const savePlan = async () => {
    if (!form.name.trim()) return setMsg({ type: 'error', text: 'Plan name is required' });
    setSaving(true);
    try {
      const url = editing ? `/api/admin/plans/${editing.id}` : '/api/admin/plans';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'x-admin-token': ADMIN_SECRET }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error('Save failed');
      setMsg({ type: 'success', text: editing ? 'Plan updated' : 'Plan created' });
      setShowForm(false);
      fetchAll();
    } catch { setMsg({ type: 'error', text: 'Failed to save plan' }); }
    finally { setSaving(false); }
  };

  const deletePlan = async (id: number) => {
    try {
      await fetch(`/api/admin/plans/${id}`, { method: 'DELETE', headers: { 'x-admin-token': ADMIN_SECRET } });
      setPlans(prev => prev.filter(p => p.id !== id));
      setConfirmDelete(null);
      setMsg({ type: 'success', text: 'Plan deleted' });
    } catch { setMsg({ type: 'error', text: 'Delete failed' }); }
  };

  return (
    <div className="space-y-5">
      {msg && (
        <div className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center justify-between ${msg.type === 'success' ? 'bg-green-900/40 border border-green-700 text-green-400' : 'bg-red-900/40 border border-red-700 text-red-400'}`}>
          {msg.text}<button onClick={() => setMsg(null)}><X size={12} /></button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-[10px] text-gray-600 font-mono">{plans.length} plans · {exercises.length} exercises in library</div>
        <button onClick={openCreate} className="flex items-center gap-1.5 px-4 py-2 bg-system-neon text-black rounded-lg text-xs font-black tracking-widest uppercase hover:bg-white transition-all">
          <Plus size={12} /> CREATE PLAN
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-900/80 border border-system-neon/30 rounded-xl p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h4 className="text-system-neon font-black text-xs tracking-widest uppercase">{editing ? `EDITING: ${editing.name}` : 'NEW WORKOUT PLAN'}</h4>
            <button onClick={() => setShowForm(false)}><X size={14} className="text-gray-500 hover:text-white" /></button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-[9px] text-gray-500 uppercase tracking-widest font-bold block mb-1">Plan Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. 4-Week Beginner PPL" className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-xs text-white outline-none focus:border-system-neon" />
            </div>
            <div className="col-span-2">
              <label className="text-[9px] text-gray-500 uppercase tracking-widest font-bold block mb-1">Description</label>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description of this plan..." className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-xs text-white outline-none focus:border-system-neon" />
            </div>
            <div className="col-span-2">
              <label className="text-[9px] text-gray-500 uppercase tracking-widest font-bold block mb-1">Cover Image URL</label>
              <input value={(form as any).image_url || ''} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="https://images.unsplash.com/... or direct image URL" className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-xs text-white outline-none focus:border-system-neon" />
              {(form as any).image_url && <img src={(form as any).image_url} alt="preview" className="mt-2 h-16 w-full object-cover rounded opacity-70" onError={e => { (e.target as any).style.display = 'none'; }} />}
            </div>
            <div>
              <label className="text-[9px] text-gray-500 uppercase tracking-widest font-bold block mb-1">Difficulty</label>
              <select value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))} className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-xs text-white outline-none focus:border-system-neon">
                {DIFFICULTY_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] text-gray-500 uppercase tracking-widest font-bold block mb-1">Equipment</label>
              <select value={form.equipment} onChange={e => setForm(f => ({ ...f, equipment: e.target.value }))} className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-xs text-white outline-none focus:border-system-neon">
                {EQUIPMENT_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] text-gray-500 uppercase tracking-widest font-bold block mb-1">Duration (weeks)</label>
              <input type="number" min={1} max={52} value={form.duration_weeks} onChange={e => setForm(f => ({ ...f, duration_weeks: parseInt(e.target.value) || 4 }))} className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-xs text-white outline-none focus:border-system-neon" />
            </div>
            <div>
              <label className="text-[9px] text-gray-500 uppercase tracking-widest font-bold block mb-1">Days per week</label>
              <input type="number" min={1} max={7} value={form.days_per_week} onChange={e => setForm(f => ({ ...f, days_per_week: parseInt(e.target.value) || 4 }))} className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-xs text-white outline-none focus:border-system-neon" />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Days ({form.days.length})</div>
              <button onClick={addDay} className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 border border-gray-700 text-gray-400 rounded text-[10px] font-bold hover:text-white hover:border-system-neon/40 transition-all">
                <Plus size={10} /> Add Day
              </button>
            </div>
            {form.days.length === 0 ? (
              <div className="text-center py-8 text-gray-700 text-xs font-mono">No days yet. Click "Add Day" to start building the plan.</div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {form.days.map((day, idx) => (
                  <DayEditor key={idx} day={day} dayIndex={idx} exercises={exercises} onChange={updated => updateDay(idx, updated)} onDelete={() => deleteDay(idx)} />
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={savePlan} disabled={saving} className="flex items-center gap-1.5 px-5 py-2 bg-system-neon text-black rounded font-black text-xs hover:bg-white transition-all">
              <Save size={12} /> {saving ? 'SAVING...' : editing ? 'UPDATE PLAN' : 'CREATE PLAN'}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-800 text-gray-400 rounded text-xs font-bold hover:text-white transition-all">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-gray-600 font-mono text-xs">Loading plans...</div>
      ) : plans.length === 0 ? (
        <div className="text-center py-16 text-gray-700">
          <Dumbbell size={32} className="mx-auto mb-3 opacity-20" />
          <div className="text-sm font-bold mb-2">No workout plans yet</div>
          <div className="text-[10px] font-mono">Create premade plans that users can pick from the Health tab.</div>
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map(plan => (
            <div key={plan.id} className={`bg-gray-900/40 border rounded-xl overflow-hidden transition-all ${plan.is_active ? 'border-gray-800' : 'border-gray-900 opacity-60'}`}>
              <div className="flex items-center gap-4 p-4 cursor-pointer hover:bg-white/5" onClick={() => setExpandedPlan(expandedPlan === plan.id ? null : plan.id)}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-white">{plan.name}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${difficultyColor(plan.difficulty)}`}>{plan.difficulty}</span>
                    <span className="text-[9px] text-gray-500 font-mono">{plan.equipment}</span>
                    {!plan.is_active && <span className="text-[9px] text-gray-600 font-mono">HIDDEN</span>}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">{plan.duration_weeks}w · {plan.days_per_week}d/wk · {(plan.days || []).length} total days</div>
                  {plan.description && <div className="text-[10px] text-gray-600 italic mt-1 truncate">{plan.description}</div>}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={e => { e.stopPropagation(); openEdit(plan); }} className="text-gray-600 hover:text-white transition-colors"><Edit3 size={14} /></button>
                  {confirmDelete === plan.id ? (
                    <div className="flex gap-1 items-center">
                      <button onClick={e => { e.stopPropagation(); deletePlan(plan.id); }} className="text-[9px] bg-red-900/50 border border-red-700 text-red-400 px-2 py-1 rounded font-bold">CONFIRM</button>
                      <button onClick={e => { e.stopPropagation(); setConfirmDelete(null); }} className="text-[9px] text-gray-600 hover:text-white">✕</button>
                    </div>
                  ) : (
                    <button onClick={e => { e.stopPropagation(); setConfirmDelete(plan.id); }} className="text-gray-700 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                  )}
                  {expandedPlan === plan.id ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
                </div>
              </div>

              {expandedPlan === plan.id && (
                <div className="border-t border-gray-800 px-4 pb-4 pt-2">
                  <div className="text-[9px] text-gray-600 uppercase tracking-widest mb-2 font-bold">Plan Structure ({(plan.days || []).length} days)</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(plan.days || []).slice(0, 8).map((day, idx) => (
                      <div key={idx} className={`text-[9px] rounded-lg px-2 py-1.5 font-mono ${day.isRecovery ? 'bg-gray-800/50 text-gray-600' : 'bg-system-neon/10 text-system-neon'}`}>
                        <div className="font-bold">{day.day}</div>
                        <div>{day.focus}</div>
                        {!day.isRecovery && <div>{(day.exercises || []).length} exercises</div>}
                      </div>
                    ))}
                    {(plan.days || []).length > 8 && (
                      <div className="text-[9px] rounded-lg px-2 py-1.5 bg-gray-900 text-gray-600 font-mono flex items-center justify-center">+{(plan.days || []).length - 8} more</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PlanBuilder;
