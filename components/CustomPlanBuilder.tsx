import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Search, X, Plus, Minus, CheckCircle, Play, Dumbbell, ArrowLeft, Save, Star } from 'lucide-react';
import { WorkoutDay, WorkoutExercise } from '../types';
import { API_BASE } from '../lib/apiConfig';
import { useSystem } from '../hooks/useSystem';

const getStarredKey = (userId: string) => `reforge_starred_exercises_${userId || 'local'}`;

const loadStarred = (userId: string): Set<number> => {
  try {
    const arr = JSON.parse(localStorage.getItem(getStarredKey(userId)) || '[]');
    return new Set<number>(arr);
  } catch { return new Set<number>(); }
};

const saveStarred = (userId: string, ids: Set<number>) => {
  try { localStorage.setItem(getStarredKey(userId), JSON.stringify([...ids])); } catch {}
};

interface SelectedExercise {
  exercise: WorkoutExercise;
  sets: number;
  repsPerSet: string[];
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
  const { player } = useSystem();
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [muscleFilter, setMuscleFilter] = useState('ALL');
  const [selected, setSelected] = useState<SelectedExercise[]>([]);
  const [planName, setPlanName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [starredIds, setStarredIds] = useState<Set<number>>(() => loadStarred(player.userId || 'local'));
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/workout/exercises`)
      .then(r => r.json())
      .then(data => setExercises(Array.isArray(data) ? data : []))
      .catch(() => setExercises([]))
      .finally(() => setLoading(false));
  }, []);

  const toggleStar = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setStarredIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveStarred(player.userId || 'local', next);
      return next;
    });
  };

  const baseFiltered = exercises.filter(ex => {
    const q = search.toLowerCase();
    const matchSearch = !q || ex.name.toLowerCase().includes(q) || (ex.muscle_group || '').toLowerCase().includes(q) || ex.type.toLowerCase().includes(q);
    const matchMuscle = muscleFilter === 'ALL' || (ex.muscle_group || '').toLowerCase().includes(muscleFilter.toLowerCase());
    return matchSearch && matchMuscle;
  });

  const filtered = [
    ...baseFiltered.filter(ex => starredIds.has(ex.id)),
    ...baseFiltered.filter(ex => !starredIds.has(ex.id)),
  ];

  const isSelected = (id: number) => selected.some(s => s.exercise.id === id);

  const toggleExercise = (ex: WorkoutExercise) => {
    if (isSelected(ex.id)) {
      setSelected(prev => prev.filter(s => s.exercise.id !== ex.id));
    } else {
      const numSets = ex.default_sets || 3;
      // default_reps may be "12, 12, 10" (per-set) or just "12"
      const parsed = (ex.default_reps || '12')
        .split(',')
        .map(r => r.trim())
        .filter(Boolean);
      const repsPerSet = Array.from({ length: numSets }, (_, i) =>
        parsed[i] ?? parsed[parsed.length - 1] ?? '12'
      );
      setSelected(prev => [...prev, { exercise: ex, sets: numSets, repsPerSet }]);
    }
  };

  const updateSets = (id: number, newSets: number) => {
    const clamped = Math.max(1, Math.min(20, newSets));
    setSelected(prev => prev.map(s => {
      if (s.exercise.id !== id) return s;
      let repsPerSet = [...s.repsPerSet];
      while (repsPerSet.length < clamped) {
        repsPerSet.push(repsPerSet[repsPerSet.length - 1] || '12');
      }
      repsPerSet = repsPerSet.slice(0, clamped);
      return { ...s, sets: clamped, repsPerSet };
    }));
  };

  const updateRep = (id: number, setIdx: number, value: string) => {
    setSelected(prev => prev.map(s => {
      if (s.exercise.id !== id) return s;
      const repsPerSet = [...s.repsPerSet];
      repsPerSet[setIdx] = value;
      return { ...s, repsPerSet };
    }));
  };

  const removeSelected = (id: number) => setSelected(prev => prev.filter(s => s.exercise.id !== id));

  const buildExercises = () => selected.map(s => ({
    name: s.exercise.name,
    sets: s.sets,
    reps: s.repsPerSet.join(', '),
    type: s.exercise.type,
    notes: s.exercise.notes || '',
    videoUrl: s.exercise.video_url || '',
    completed: false,
    duration: 0,
  }));

  const startWorkout = () => {
    if (selected.length === 0) return;
    const day: WorkoutDay = {
      day: 'CUSTOM',
      focus: planName || 'CUSTOM SESSION',
      isRecovery: false,
      totalDuration: selected.length * 5 + 10,
      exercises: buildExercises(),
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
        exercises: buildExercises(),
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
        {selected.length > 0 && (
          <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 bg-system-neon/10 border border-system-neon/30 rounded-full">
            <Dumbbell size={11} className="text-system-neon" />
            <span className="text-[10px] font-bold text-system-neon">{selected.length}</span>
          </div>
        )}
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
              const selData = selected.find(s => s.exercise.id === ex.id);
              const isStarred = starredIds.has(ex.id);
              return (
                <div key={ex.id} className={`transition-all ${sel ? 'bg-system-neon/5' : ''}`}>
                  {/* Exercise row */}
                  <div className="flex items-center gap-2 px-3 py-3">
                    <button
                      onClick={e => toggleStar(ex.id, e)}
                      className={`shrink-0 w-7 h-7 flex items-center justify-center rounded-full transition-all ${isStarred ? 'text-amber-400' : 'text-gray-700 hover:text-amber-500'}`}
                    >
                      <Star size={13} fill={isStarred ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      onClick={() => toggleExercise(ex)}
                      className="flex-1 flex items-center gap-2.5 text-left min-w-0"
                    >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all ${sel ? 'bg-system-neon text-black' : 'bg-gray-900 border border-gray-800 text-gray-600'}`}>
                        {sel ? <CheckCircle size={13} /> : <Plus size={12} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-white truncate leading-tight">{ex.name}</div>
                        <div className="flex gap-1.5 items-center mt-0.5">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${TYPE_COLORS[ex.type] || 'bg-gray-800 text-gray-500 border-gray-700'}`}>{ex.type}</span>
                          {ex.muscle_group && <span className="text-[10px] text-gray-500 font-mono">{ex.muscle_group}</span>}
                          {!sel && <span className="text-[10px] text-gray-700 font-mono">{ex.default_sets}×{ex.default_reps}</span>}
                        </div>
                      </div>
                    </button>
                    {sel && (
                      <button onClick={() => removeSelected(ex.id)} className="shrink-0 text-gray-700 hover:text-red-400 transition-colors">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  {/* Inline sets/reps editor */}
                  {sel && selData && (
                    <div className="px-3 pb-4 pt-0" onClick={e => e.stopPropagation()}>
                      <div className="ml-9 bg-gray-900/80 border border-gray-800 rounded-xl p-3 space-y-3">
                        {/* Sets row */}
                        <div className="flex items-center gap-3">
                          <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest w-10 shrink-0">Sets</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateSets(ex.id, selData.sets - 1)}
                              className="w-7 h-7 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg flex items-center justify-center text-gray-300 transition-colors active:scale-95"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="text-base text-white font-black w-6 text-center font-mono">{selData.sets}</span>
                            <button
                              onClick={() => updateSets(ex.id, selData.sets + 1)}
                              className="w-7 h-7 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg flex items-center justify-center text-gray-300 transition-colors active:scale-95"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        </div>
                        {/* Per-set reps */}
                        <div className="space-y-2">
                          <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Reps per Set</span>
                          <div className="flex flex-wrap gap-2">
                            {selData.repsPerSet.map((rep, setIdx) => (
                              <div key={setIdx} className="flex flex-col items-center gap-0.5">
                                <span className="text-[8px] text-gray-600 font-mono font-bold">S{setIdx + 1}</span>
                                <input
                                  value={rep}
                                  onChange={e => updateRep(ex.id, setIdx, e.target.value)}
                                  className="w-12 bg-gray-800 border border-gray-700 rounded-lg px-1 py-1.5 text-xs text-white font-mono text-center outline-none focus:border-system-neon/60 transition-colors"
                                  placeholder="12"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom action bar */}
      {selected.length > 0 && (
        <motion.div
          initial={{ y: 80 }}
          animate={{ y: 0 }}
          className="px-4 pt-3 pb-8 md:pb-4 bg-black border-t border-gray-900 space-y-2"
        >
          <div className="text-[10px] text-gray-600 font-mono text-center">
            {selected.length} exercise{selected.length !== 1 ? 's' : ''} · {selected.reduce((acc, s) => acc + s.sets, 0)} total sets · est. {selected.length * 5 + 10} min
          </div>
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
