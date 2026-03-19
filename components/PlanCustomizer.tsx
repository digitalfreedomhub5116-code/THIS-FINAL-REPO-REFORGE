import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Trash2, Plus, Minus, Save } from 'lucide-react';
import { WorkoutDay, Exercise, WorkoutExercise } from '../types';
import { API_BASE } from '../lib/apiConfig';

interface PlanCustomizerProps {
  planName: string;
  days: WorkoutDay[];
  onSave: (name: string, days: WorkoutDay[]) => void;
  onClose: () => void;
}

const PlanCustomizer: React.FC<PlanCustomizerProps> = ({ planName, days: initialDays, onSave, onClose }) => {
  // Deep clone initial days to avoid mutation
  const [days, setDays] = useState<WorkoutDay[]>(() =>
    JSON.parse(JSON.stringify(initialDays))
  );
  const [activeDayIdx, setActiveDayIdx] = useState(0);
  const [customName, setCustomName] = useState(planName);
  const [hasChanges, setHasChanges] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dbExercises, setDbExercises] = useState<WorkoutExercise[]>([]);
  const [loadingDb, setLoadingDb] = useState(false);
  const [saving, setSaving] = useState(false);

  // Snapshot for change detection
  const initialSnapshot = useMemo(() => JSON.stringify(initialDays) + planName, [initialDays, planName]);

  useEffect(() => {
    const current = JSON.stringify(days) + customName;
    setHasChanges(current !== initialSnapshot);
  }, [days, customName, initialSnapshot]);

  // Fetch exercise DB when search opens
  useEffect(() => {
    if (showSearch && dbExercises.length === 0) {
      setLoadingDb(true);
      fetch(`${API_BASE}/api/workout/exercises`)
        .then(r => r.json())
        .then(data => setDbExercises(Array.isArray(data) ? data : []))
        .catch(() => {})
        .finally(() => setLoadingDb(false));
    }
  }, [showSearch, dbExercises.length]);

  const activeDay = days[activeDayIdx] || null;

  const filteredDb = useMemo(() => {
    if (!searchQuery.trim()) return dbExercises.slice(0, 30);
    const q = searchQuery.toLowerCase();
    return dbExercises.filter(e =>
      e.name.toLowerCase().includes(q) ||
      (e.muscle_group || '').toLowerCase().includes(q)
    ).slice(0, 30);
  }, [dbExercises, searchQuery]);

  // Update an exercise field
  const updateExercise = useCallback((dayIdx: number, exIdx: number, field: keyof Exercise, value: any) => {
    setDays(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      if (copy[dayIdx]?.exercises[exIdx]) {
        copy[dayIdx].exercises[exIdx][field] = value;
      }
      return copy;
    });
  }, []);

  // Remove an exercise
  const removeExercise = useCallback((dayIdx: number, exIdx: number) => {
    setDays(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      copy[dayIdx].exercises.splice(exIdx, 1);
      return copy;
    });
  }, []);

  // Add exercise from DB
  const addExerciseFromDb = useCallback((ex: WorkoutExercise) => {
    setDays(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      const newEx: Exercise = {
        name: ex.name,
        sets: ex.default_sets || 3,
        reps: ex.default_reps || '10-12',
        rest: 60,
        type: ex.type as Exercise['type'],
        duration: 0,
        completed: false,
        videoUrl: ex.video_url || '',
      };
      copy[activeDayIdx].exercises.push(newEx);
      return copy;
    });
    setShowSearch(false);
    setSearchQuery('');
  }, [activeDayIdx]);

  const handleSave = async () => {
    if (!hasChanges) return;
    setSaving(true);
    // Small delay for feel
    await new Promise(r => setTimeout(r, 400));
    onSave(customName, days);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[110] bg-black flex flex-col font-sans">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800/60">
        <div className="flex-1 min-w-0">
          <div className="text-[8px] text-system-neon font-bold tracking-[0.3em] uppercase mb-0.5">SESSION PROTOCOL</div>
          <input
            value={customName}
            onChange={e => setCustomName(e.target.value)}
            className="bg-transparent text-white text-lg font-black tracking-tight outline-none w-full placeholder-gray-700"
            placeholder="Plan name..."
          />
        </div>
        <button onClick={onClose} className="ml-3 w-8 h-8 flex items-center justify-center rounded-lg bg-gray-900 border border-gray-800 text-gray-500 hover:text-white transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* Day tabs */}
      <div className="flex gap-1 overflow-x-auto scrollbar-hide px-4 py-2 border-b border-gray-900/40">
        {days.map((d, i) => (
          <button
            key={i}
            onClick={() => setActiveDayIdx(i)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
              activeDayIdx === i
                ? 'bg-system-neon/15 text-system-neon border border-system-neon/30'
                : 'bg-gray-900/40 text-gray-600 border border-transparent hover:text-gray-400'
            }`}
          >
            {d.focus || `Day ${i + 1}`}
          </button>
        ))}
      </div>

      {/* Exercise list for active day */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 pb-32">
        {activeDay?.exercises.map((ex, exIdx) => (
          <div key={exIdx} className="bg-gray-950 border border-gray-800/60 rounded-2xl p-4">
            {/* Exercise header */}
            <div className="flex items-start justify-between mb-4">
              <div className="text-xs font-black text-white uppercase tracking-wide leading-tight flex-1 pr-2">
                {ex.name}
              </div>
              <button
                onClick={() => removeExercise(activeDayIdx, exIdx)}
                className="text-gray-700 hover:text-red-400 transition-colors p-1"
              >
                <Trash2 size={14} />
              </button>
            </div>

            {/* Sets / Reps / Rest fields */}
            <div className="flex gap-2">
              {/* Sets */}
              <div className="flex-1 bg-gray-900/60 border border-gray-800 rounded-xl p-2.5 text-center">
                <div className="text-[8px] text-gray-500 font-bold uppercase tracking-widest mb-1.5">Sets</div>
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => updateExercise(activeDayIdx, exIdx, 'sets', Math.max(1, ex.sets - 1))}
                    className="w-6 h-6 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                  >
                    <Minus size={10} />
                  </button>
                  <span className="text-lg font-black text-white min-w-[24px]">{ex.sets}</span>
                  <button
                    onClick={() => updateExercise(activeDayIdx, exIdx, 'sets', ex.sets + 1)}
                    className="w-6 h-6 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                  >
                    <Plus size={10} />
                  </button>
                </div>
              </div>

              {/* Reps */}
              <div className="flex-1 bg-gray-900/60 border border-gray-800 rounded-xl p-2.5 text-center">
                <div className="text-[8px] text-gray-500 font-bold uppercase tracking-widest mb-1.5">Reps</div>
                <input
                  value={ex.reps}
                  onChange={e => updateExercise(activeDayIdx, exIdx, 'reps', e.target.value)}
                  className="bg-transparent text-center text-lg font-black text-white outline-none w-full"
                  placeholder="10-12"
                />
              </div>

              {/* Rest */}
              <div className="flex-1 bg-gray-900/60 border border-gray-800 rounded-xl p-2.5 text-center">
                <div className="text-[8px] text-gray-500 font-bold uppercase tracking-widest mb-1.5">Rest (s)</div>
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => updateExercise(activeDayIdx, exIdx, 'rest', Math.max(0, (ex.rest || 60) - 15))}
                    className="w-6 h-6 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                  >
                    <Minus size={10} />
                  </button>
                  <span className="text-lg font-black text-white min-w-[24px]">{ex.rest || 60}</span>
                  <button
                    onClick={() => updateExercise(activeDayIdx, exIdx, 'rest', (ex.rest || 60) + 15)}
                    className="w-6 h-6 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                  >
                    <Plus size={10} />
                  </button>
                </div>
              </div>
            </div>

            {/* Estimated info */}
            <div className="flex gap-3 mt-2.5 text-[9px] text-gray-600 font-mono justify-end">
              <span>~{Math.round(ex.sets * 5)} kcal</span>
              <span>~{Math.round(ex.sets * ((ex.rest || 60) / 60 + 0.5))} min</span>
            </div>
          </div>
        ))}

        {/* Add exercise button */}
        <button
          onClick={() => setShowSearch(true)}
          className="w-full py-4 border-2 border-dashed border-gray-800 rounded-2xl flex items-center justify-center gap-2 text-gray-600 hover:text-system-neon hover:border-system-neon/30 transition-all"
        >
          <Plus size={16} />
          <span className="text-xs font-bold uppercase tracking-wider">Add Exercise</span>
        </button>
      </div>

      {/* Search overlay */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="absolute inset-x-0 bottom-0 top-16 bg-black/98 backdrop-blur-md z-20 flex flex-col border-t border-gray-800"
          >
            <div className="px-4 py-3 border-b border-gray-800/60">
              <div className="flex items-center gap-2 mb-2">
                <div className="text-[9px] text-system-neon font-bold tracking-widest uppercase flex-1">Search Database</div>
                <button onClick={() => { setShowSearch(false); setSearchQuery(''); }} className="text-gray-600 hover:text-white">
                  <X size={14} />
                </button>
              </div>
              <div className="relative">
                <Search size={13} className="absolute left-3 top-2.5 text-gray-600" />
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search exercises (e.g. Bench Press)..."
                  className="w-full bg-gray-900/60 border border-gray-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-system-neon/40 transition-colors"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loadingDb ? (
                <div className="flex items-center justify-center py-12 text-gray-700">
                  <div className="w-5 h-5 border-2 border-system-neon/30 border-t-system-neon rounded-full animate-spin" />
                </div>
              ) : filteredDb.length === 0 ? (
                <div className="text-center py-12 text-gray-700 text-xs font-mono">No exercises found</div>
              ) : (
                <div className="divide-y divide-gray-900/40">
                  {filteredDb.map(ex => (
                    <button
                      key={ex.id}
                      onClick={() => addExerciseFromDb(ex)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors"
                    >
                      <div className="w-7 h-7 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center text-gray-600">
                        <Plus size={12} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-white truncate">{ex.name}</div>
                        <div className="flex gap-2 items-center mt-0.5">
                          <span className="text-[9px] text-gray-600 font-mono">{ex.muscle_group}</span>
                          <span className="text-[9px] text-gray-700 font-mono">{ex.default_sets}×{ex.default_reps}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom save bar */}
      <div className="px-4 py-3 bg-black border-t border-gray-800/60">
        <button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className={`w-full py-3.5 rounded-xl text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
            hasChanges && !saving
              ? 'bg-system-neon text-black shadow-[0_0_20px_rgba(0,210,255,0.3)] hover:bg-white'
              : 'bg-gray-900 text-gray-700 cursor-not-allowed border border-gray-800'
          }`}
        >
          <Save size={14} />
          {saving ? 'Saving...' : hasChanges ? 'Save as Custom Plan' : 'No Changes'}
        </button>
      </div>
    </div>
  );
};

export default PlanCustomizer;
