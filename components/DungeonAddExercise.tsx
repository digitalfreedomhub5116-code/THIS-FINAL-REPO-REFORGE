/**
 * DungeonAddExercise.tsx
 *
 * Fullscreen "select exercise" sheet for adding custom exercises to the
 * Daily Dungeon. Mirrors the exercise-picker UX from CustomPlanBuilder
 * (search + muscle filter + multi-select with per-set rep editing) but,
 * instead of building a workout plan, it hands the chosen exercises back to
 * the caller which appends them to DungeonState.customExercises.
 *
 * The added exercises then render as dungeon cards and are trained inside
 * the ActiveWorkoutPlayer like any other dungeon exercise — so XP is granted
 * through the normal dungeon-completion path (exercisesCompleted × 40 + pool).
 *
 * Color theme matches the dungeon container (cyan on near-black).
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Plus, Minus, CheckCircle, ArrowLeft, Dumbbell, Swords } from 'lucide-react';
import type { WorkoutExercise, DungeonCustomExercise } from '../types';
import { API_BASE } from '../lib/apiConfig';

const TYPE_COLORS: Record<string, string> = {
  COMPOUND: 'bg-red-900/50 text-red-400 border-red-900/60',
  ACCESSORY: 'bg-blue-900/50 text-blue-400 border-blue-900/60',
  CARDIO: 'bg-orange-900/50 text-orange-400 border-orange-900/60',
  STRETCH: 'bg-green-900/50 text-green-400 border-green-900/60',
};

const MUSCLE_FILTERS = ['ALL', 'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Legs', 'Core', 'Glutes', 'Cardio'];

interface SelectedExercise {
  exercise: WorkoutExercise;
  sets: number;
  repsPerSet: string[];
}

interface DungeonAddExerciseProps {
  /** Names already in the dungeon (base + custom) so we can disable duplicates. */
  existingNames: string[];
  onClose: () => void;
  /** Called with the finalized custom exercises to append to the dungeon. */
  onAdd: (exercises: Omit<DungeonCustomExercise, 'id' | 'addedAt'>[]) => void;
}

const DungeonAddExercise: React.FC<DungeonAddExerciseProps> = ({ existingNames, onClose, onAdd }) => {
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [muscleFilter, setMuscleFilter] = useState('ALL');
  const [selected, setSelected] = useState<SelectedExercise[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);

  const existingLower = useMemo(
    () => new Set(existingNames.map(n => n.toLowerCase())),
    [existingNames]
  );

  useEffect(() => {
    fetch(`${API_BASE}/api/workout/exercises`)
      .then(r => r.json())
      .then(data => setExercises(Array.isArray(data) ? data : []))
      .catch(() => setExercises([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('reforge:hide-nav'));
    return () => {
      window.dispatchEvent(new CustomEvent('reforge:show-nav'));
    };
  }, []);

  const filtered = useMemo(() => {
    return exercises.filter(ex => {
      const q = search.toLowerCase();
      const matchSearch = !q
        || ex.name.toLowerCase().includes(q)
        || (ex.muscle_group || '').toLowerCase().includes(q)
        || ex.type.toLowerCase().includes(q);
      const matchMuscle = muscleFilter === 'ALL'
        || (ex.muscle_group || '').toLowerCase().includes(muscleFilter.toLowerCase());
      return matchSearch && matchMuscle;
    });
  }, [exercises, search, muscleFilter]);

  const isSelected = (id: number) => selected.some(s => s.exercise.id === id);

  const toggleExercise = (ex: WorkoutExercise) => {
    if (existingLower.has(ex.name.toLowerCase())) return; // already in dungeon
    if (isSelected(ex.id)) {
      setSelected(prev => prev.filter(s => s.exercise.id !== ex.id));
    } else {
      const numSets = ex.default_sets || 3;
      const parsed = (ex.default_reps || '12').split(',').map(r => r.trim()).filter(Boolean);
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
      while (repsPerSet.length < clamped) repsPerSet.push(repsPerSet[repsPerSet.length - 1] || '12');
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

  const handleAdd = () => {
    if (selected.length === 0) return;
    const mapped: Omit<DungeonCustomExercise, 'id' | 'addedAt'>[] = selected.map(s => {
      const isCardio = s.exercise.type === 'CARDIO';
      return {
        name: s.exercise.name,
        type: s.exercise.type,
        sets: s.sets,
        reps: s.repsPerSet.join(', '),
        videoUrl: s.exercise.video_url || undefined,
        muscleGroup: s.exercise.muscle_group || undefined,
        // For cardio entries we leave distanceKm undefined (rep-based) unless
        // the library encodes a km target; the dungeon treats it as sets/reps.
        ...(isCardio ? {} : {}),
      };
    });
    onAdd(mapped);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[160] bg-black flex flex-col font-sans"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-900">
        <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors" aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <div className="text-[9px] font-bold tracking-widest uppercase mb-0.5" style={{ color: '#00d4ff' }}>
            Daily Dungeon
          </div>
          <div className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
            <Swords size={13} style={{ color: '#5ab8cc' }} /> Add Exercise
          </div>
        </div>
        {selected.length > 0 && (
          <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full"
            style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.3)' }}>
            <Dumbbell size={11} style={{ color: '#00d4ff' }} />
            <span className="text-[10px] font-bold" style={{ color: '#00d4ff' }}>{selected.length}</span>
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
            className="w-full bg-gray-900/60 border border-gray-800 rounded-xl pl-9 pr-10 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-[#00d4ff]/50 transition-colors"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-2.5 text-gray-600 hover:text-white" aria-label="Clear">
              <X size={13} />
            </button>
          )}
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
          {MUSCLE_FILTERS.map(f => (
            <button key={f} onClick={() => setMuscleFilter(f)}
              className={`shrink-0 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
                muscleFilter === f ? 'text-black' : 'bg-gray-900 border border-gray-800 text-gray-500 hover:text-white'
              }`}
              style={muscleFilter === f ? { background: '#00d4ff' } : undefined}
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
            <div className="w-6 h-6 border-2 rounded-full animate-spin mb-3"
              style={{ borderColor: 'rgba(0,212,255,0.3)', borderTopColor: '#00d4ff' }} />
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
              const alreadyAdded = existingLower.has(ex.name.toLowerCase());
              return (
                <div key={ex.id} className={`transition-all ${sel ? 'bg-[#00d4ff]/5' : ''} ${alreadyAdded ? 'opacity-40' : ''}`}>
                  <div className="flex items-center gap-2 px-3 py-3">
                    <button
                      onClick={() => toggleExercise(ex)}
                      disabled={alreadyAdded}
                      className="flex-1 flex items-center gap-2.5 text-left min-w-0 disabled:cursor-not-allowed"
                    >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all ${
                        sel ? 'text-black' : 'bg-gray-900 border border-gray-800 text-gray-600'
                      }`} style={sel ? { background: '#00d4ff' } : undefined}>
                        {sel ? <CheckCircle size={13} /> : <Plus size={12} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-white truncate leading-tight">{ex.name}</div>
                        <div className="flex gap-1.5 items-center mt-0.5">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${TYPE_COLORS[ex.type] || 'bg-gray-800 text-gray-500 border-gray-700'}`}>{ex.type}</span>
                          {ex.muscle_group && <span className="text-[10px] text-gray-500 font-mono">{ex.muscle_group}</span>}
                          {alreadyAdded && <span className="text-[9px] text-[#5ab8cc] font-mono uppercase tracking-wider">In Dungeon</span>}
                          {!sel && !alreadyAdded && <span className="text-[10px] text-gray-700 font-mono">{ex.default_sets}×{ex.default_reps}</span>}
                        </div>
                      </div>
                    </button>
                    {sel && (
                      <button onClick={() => removeSelected(ex.id)} className="shrink-0 text-gray-700 hover:text-red-400 transition-colors" aria-label="Remove">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  {sel && selData && (
                    <div className="px-3 pb-4 pt-0" onClick={e => e.stopPropagation()}>
                      <div className="ml-9 bg-gray-900/80 border border-gray-800 rounded-xl p-3 space-y-3">
                        <div className="flex items-center gap-3">
                          <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest w-10 shrink-0">Sets</span>
                          <div className="flex items-center gap-2">
                            <button onClick={() => updateSets(ex.id, selData.sets - 1)}
                              className="w-7 h-7 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg flex items-center justify-center text-gray-300 transition-colors active:scale-95">
                              <Minus size={12} />
                            </button>
                            <span className="text-base text-white font-black w-6 text-center font-mono">{selData.sets}</span>
                            <button onClick={() => updateSets(ex.id, selData.sets + 1)}
                              className="w-7 h-7 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg flex items-center justify-center text-gray-300 transition-colors active:scale-95">
                              <Plus size={12} />
                            </button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Reps per Set</span>
                          <div className="flex flex-wrap gap-2">
                            {selData.repsPerSet.map((rep, setIdx) => (
                              <div key={setIdx} className="flex flex-col items-center gap-0.5">
                                <span className="text-[8px] text-gray-600 font-mono font-bold">S{setIdx + 1}</span>
                                <input
                                  value={rep}
                                  onChange={e => updateRep(ex.id, setIdx, e.target.value)}
                                  className="w-12 bg-gray-800 border border-gray-700 rounded-lg px-1 py-1.5 text-xs text-white font-mono text-center outline-none focus:border-[#00d4ff]/60 transition-colors"
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
      <AnimatePresence>
        {selected.length > 0 && (
          <motion.div
            initial={{ y: 80 }}
            animate={{ y: 0 }}
            exit={{ y: 80 }}
            className="px-4 pt-3 pb-8 md:pb-4 bg-black border-t border-gray-900 space-y-2"
          >
            <div className="text-[10px] text-gray-600 font-mono text-center">
              {selected.length} exercise{selected.length !== 1 ? 's' : ''} · {selected.reduce((acc, s) => acc + s.sets, 0)} total sets
            </div>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleAdd}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-black uppercase tracking-widest text-black transition-all"
              style={{ background: '#00d4ff', boxShadow: '0 0 20px rgba(0,212,255,0.3)' }}
            >
              <Plus size={16} strokeWidth={3} />
              ADD TO DUNGEON
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default DungeonAddExercise;
