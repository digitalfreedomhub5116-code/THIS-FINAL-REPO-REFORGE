import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Plus, Minus, CheckCircle, Play, Dumbbell, ChevronDown, ArrowLeft, Save } from 'lucide-react';
import { WorkoutDay, WorkoutExercise } from '../types';
import { API_BASE } from '../lib/apiConfig';

interface SelectedExercise {
  exercise: WorkoutExercise;
  sets: number;
  reps: string;
}

interface CustomPlanBuilderProps {
  onClose: () => void;
  onStartWorkout: (day: WorkoutDay) => void;
}

const TYPE_COLORS: Record<string, string> = {
  COMPOUND: 'bg-red-900/50 text-red-400 border-red-900/60',
  ACCESSORY: 'bg-blue-900/50 text-blue-400 border-blue-900/60',
  CARDIO: 'bg-orange-900/50 text-orange-400 border-orange-900/60',
  STRETCH: 'bg-green-900/50 text-green-400 border-green-900/60',
};

const MUSCLE_FILTERS = ['ALL', 'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Legs', 'Core', 'Glutes', 'Cardio'];

const CustomPlanBuilder: React.FC<CustomPlanBuilderProps> = ({ onClose, onStartWorkout }) => {
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [muscleFilter, setMuscleFilter] = useState('ALL');
  const [selected, setSelected] = useState<SelectedExercise[]>([]);
  const [showSelected, setShowSelected] = useState(false);
  const [planName, setPlanName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/workout/exercises`)
      .then(r => r.json())
      .then(data => setExercises(Array.isArray(data) ? data : []))
      .catch(() => setExercises([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = exercises.filter(ex => {
    const q = search.toLowerCase();
    const matchSearch = !q || ex.name.toLowerCase().includes(q) || (ex.muscle_group || '').toLowerCase().includes(q) || ex.type.toLowerCase().includes(q);
    const matchMuscle = muscleFilter === 'ALL' || (ex.muscle_group || '').toLowerCase().includes(muscleFilter.toLowerCase());
    return matchSearch && matchMuscle;
  });

  const isSelected = (id: number) => selected.some(s => s.exercise.id === id);

  const toggleExercise = (ex: WorkoutExercise) => {
    if (isSelected(ex.id)) {
      setSelected(prev => prev.filter(s => s.exercise.id !== ex.id));
    } else {
      setSelected(prev => [...prev, { exercise: ex, sets: ex.default_sets, reps: ex.default_reps }]);
    }
  };

  const updateSelected = (id: number, field: 'sets' | 'reps', value: string | number) => {
    setSelected(prev => prev.map(s => s.exercise.id === id ? { ...s, [field]: value } : s));
  };

  const removeSelected = (id: number) => setSelected(prev => prev.filter(s => s.exercise.id !== id));

  const startWorkout = () => {
    if (selected.length === 0) return;
    const day: WorkoutDay = {
      day: 'CUSTOM',
      focus: planName || 'CUSTOM SESSION',
      isRecovery: false,
      totalDuration: selected.length * 5 + 10,
      exercises: selected.map(s => ({
        name: s.exercise.name,
        sets: s.sets,
        reps: s.reps,
        type: s.exercise.type,
        notes: s.exercise.notes || '',
        videoUrl: s.exercise.video_url || '',
        completed: false,
        duration: 0,
      })),
    };
    onStartWorkout(day);
  };

  const saveCustomPlan = async () => {
    if (selected.length === 0 || !planName.trim()) return;
    setSaving(true);
    try {
      const day: WorkoutDay = {
        day: 'DAY 1',
        focus: planName,
        isRecovery: false,
        totalDuration: selected.length * 5 + 10,
        exercises: selected.map(s => ({
          name: s.exercise.name,
          sets: s.sets,
          reps: s.reps,
          type: s.exercise.type,
          notes: s.exercise.notes || '',
          videoUrl: s.exercise.video_url || '',
          completed: false,
          duration: 0,
        })),
      };
      await fetch(`${API_BASE}/api/workout/custom-plans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: planName, days: [day] }),
        credentials: 'include',
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col font-sans">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-900">
        <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <div className="text-[9px] text-system-neon font-bold tracking-widest uppercase mb-0.5">FORGE YOUR SESSION</div>
          <input
            value={planName}
            onChange={e => setPlanName(e.target.value)}
            placeholder="Session name (e.g. Chest + Abs Day)"
            className="bg-transparent text-white text-sm font-bold tracking-tight outline-none placeholder-gray-700 w-full"
          />
        </div>
        <div className="flex gap-2 shrink-0">
          {selected.length > 0 && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowSelected(v => !v)}
              className="relative flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 border border-gray-800 rounded-full text-[10px] font-bold text-gray-400 hover:text-white transition-all"
            >
              <Dumbbell size={11} />
              <span>{selected.length}</span>
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-system-neon rounded-full" />
            </motion.button>
          )}
        </div>
      </div>

      {/* Search + filter */}
      <div className="px-4 py-3 space-y-2.5 border-b border-gray-900/60">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-2.5 text-gray-600" />
          <input
            ref={searchRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, muscle group, or type..."
            className="w-full bg-gray-900/60 border border-gray-800 rounded-xl pl-9 pr-10 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-system-neon/50 transition-colors"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-2.5 text-gray-600 hover:text-white">
              <X size={13} />
            </button>
          )}
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
          {MUSCLE_FILTERS.map(f => (
            <button key={f} onClick={() => setMuscleFilter(f)}
              className={`shrink-0 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${muscleFilter === f ? 'bg-system-neon text-black' : 'bg-gray-900 border border-gray-800 text-gray-500 hover:text-white'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Exercise list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full py-20 text-gray-700">
            <div className="w-6 h-6 border-2 border-system-neon/30 border-t-system-neon rounded-full animate-spin mb-3" />
            <div className="text-xs font-mono">Loading exercise library...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-20 text-gray-700">
            <Dumbbell size={32} className="mb-3 opacity-20" />
            <div className="text-sm font-bold mb-1">No exercises found</div>
            <div className="text-[10px] font-mono text-gray-600">Try a different search term</div>
          </div>
        ) : (
          <div className="divide-y divide-gray-900/60">
            {filtered.map(ex => {
              const sel = isSelected(ex.id);
              return (
                <motion.button
                  key={ex.id}
                  layout
                  onClick={() => toggleExercise(ex)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all ${sel ? 'bg-system-neon/5' : 'hover:bg-white/5'}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${sel ? 'bg-system-neon text-black' : 'bg-gray-900 border border-gray-800 text-gray-600'}`}>
                    {sel ? <CheckCircle size={16} /> : <Plus size={14} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-bold text-white truncate">{ex.name}</span>
                    </div>
                    <div className="flex gap-2 items-center">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${TYPE_COLORS[ex.type] || 'bg-gray-800 text-gray-500 border-gray-700'}`}>{ex.type}</span>
                      {ex.muscle_group && <span className="text-[10px] text-gray-500 font-mono">{ex.muscle_group}</span>}
                      <span className="text-[10px] text-gray-700 font-mono">{ex.default_sets}×{ex.default_reps}</span>
                    </div>
                  </div>
                  {sel && <div className="w-1.5 h-8 bg-system-neon rounded-full shrink-0" />}
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected exercises panel (slide up) */}
      <AnimatePresence>
        {showSelected && selected.length > 0 && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="absolute inset-x-0 bottom-0 bg-gray-950 border-t border-gray-800 rounded-t-2xl max-h-[70vh] flex flex-col z-10"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
              <div className="font-black text-sm text-white tracking-tight">Your Session ({selected.length} exercises)</div>
              <button onClick={() => setShowSelected(false)}><X size={16} className="text-gray-500" /></button>
            </div>
            <div className="overflow-y-auto flex-1 p-3 space-y-2">
              {selected.map(s => (
                <div key={s.exercise.id} className="flex items-center gap-3 bg-gray-900 border border-gray-800 rounded-xl p-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-white truncate mb-1.5">{s.exercise.name}</div>
                    <div className="flex gap-2">
                      <div className="flex items-center gap-1">
                        <button onClick={() => updateSelected(s.exercise.id, 'sets', Math.max(1, s.sets - 1))} className="w-5 h-5 bg-gray-800 rounded flex items-center justify-center text-gray-400"><Minus size={10} /></button>
                        <span className="text-[11px] text-white font-bold w-6 text-center">{s.sets}</span>
                        <button onClick={() => updateSelected(s.exercise.id, 'sets', s.sets + 1)} className="w-5 h-5 bg-gray-800 rounded flex items-center justify-center text-gray-400"><Plus size={10} /></button>
                        <span className="text-[10px] text-gray-600 ml-1">sets</span>
                      </div>
                      <input value={s.reps} onChange={e => updateSelected(s.exercise.id, 'reps', e.target.value)} className="bg-gray-800 border border-gray-700 rounded px-2 py-0.5 text-[11px] text-white w-20 outline-none focus:border-system-neon" placeholder="reps" />
                    </div>
                  </div>
                  <button onClick={() => removeSelected(s.exercise.id)} className="text-gray-700 hover:text-red-400 transition-colors"><X size={14} /></button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom action bar */}
      {selected.length > 0 && !showSelected && (
        <motion.div
          initial={{ y: 80 }}
          animate={{ y: 0 }}
          className="px-4 pt-3 pb-24 md:pb-4 bg-black border-t border-gray-900 space-y-2"
        >
          <div className="text-[10px] text-gray-600 font-mono text-center">{selected.length} exercises selected · est. {selected.length * 5 + 10} min</div>
          <div className="flex gap-2">
            {planName.trim() && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={saveCustomPlan}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-3 bg-gray-900 border border-gray-700 text-gray-300 rounded-xl text-xs font-bold hover:border-system-neon/40 transition-all"
              >
                {saved ? <CheckCircle size={14} className="text-green-400" /> : <Save size={14} />}
                {saving ? 'Saving...' : saved ? 'Saved!' : 'Save'}
              </motion.button>
            )}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={startWorkout}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-system-neon text-black rounded-xl text-sm font-black uppercase tracking-widest hover:bg-white transition-all shadow-[0_0_20px_rgba(0,210,255,0.3)]"
            >
              <Play size={16} fill="currentColor" />
              START WORKOUT
            </motion.button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default CustomPlanBuilder;
