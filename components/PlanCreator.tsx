
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Search, Plus, Trash2, Video, Dumbbell, Clock, Flame, CheckCircle, List } from 'lucide-react';
import { WorkoutDay, Exercise, AdminExercise } from '../types';
import { calculateExerciseCalories } from '../utils/workoutGenerator';

interface PlanCreatorProps {
  initialPlan?: WorkoutDay[];
  initialName?: string;
  exerciseDatabase: AdminExercise[];
  onSave: (name: string, plan: WorkoutDay[]) => void;
  onCancel: () => void;
}

export const PlanCreator: React.FC<PlanCreatorProps> = ({ 
    initialPlan, 
    initialName, 
    exerciseDatabase, 
    onSave, 
    onCancel 
}) => {
    // --- STATE ---
    const [sessionName, setSessionName] = useState(initialName || 'Daily Session');
    const [exercises, setExercises] = useState<Exercise[]>(() => {
        if (initialPlan && initialPlan.length > 0) return initialPlan[0].exercises;
        return [];
    });
    
    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    
    // --- HANDLERS ---

    const handleAddExercise = (dbExercise: AdminExercise) => {
        const newExercise: Exercise = {
            name: dbExercise.name,
            sets: 3, // Default sets
            reps: '10', // Default reps
            rest: 60, // Default rest (seconds)
            type: dbExercise.muscleGroup === 'Cardio' ? 'CARDIO' : 'COMPOUND',
            duration: 0, // Will be calc'd
            completed: false,
            videoUrl: dbExercise.videoUrl,
            notes: ''
        };
        
        // Auto-calc duration
        newExercise.duration = Math.ceil((newExercise.sets * (60 + (newExercise.rest || 60))) / 60);

        setExercises(prev => [...prev, newExercise]);
        setSearchQuery(''); // Clear search on add for cleaner flow
    };

    const handleUpdateExercise = (index: number, field: keyof Exercise, value: any) => {
        setExercises(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            
            // Recalculate duration if sets or rest changes
            if (field === 'sets' || field === 'rest') {
                const sets = field === 'sets' ? value : updated[index].sets;
                const rest = field === 'rest' ? value : (updated[index].rest || 60);
                updated[index].duration = Math.ceil((sets * (60 + rest)) / 60); // approx 1 min per set work + rest
            }
            
            return updated;
        });
    };

    const handleRemoveExercise = (index: number) => {
        setExercises(prev => prev.filter((_, i) => i !== index));
    };

    const handleSaveSession = (markCompleted: boolean = false) => {
        if (!sessionName.trim()) {
            alert("Please name your session.");
            return;
        }
        if (exercises.length === 0) {
            alert("Add at least one exercise.");
            return;
        }

        const finalExercises = markCompleted 
            ? exercises.map(ex => ({ ...ex, completed: true }))
            : exercises;

        const totalDuration = finalExercises.reduce((acc, ex) => acc + (ex.duration || 0), 0);

        const singleDayPlan: WorkoutDay[] = [{
            day: 'TODAY',
            focus: sessionName.toUpperCase(),
            exercises: finalExercises,
            totalDuration: totalDuration,
            isRecovery: false
        }];

        onSave(sessionName, singleDayPlan);
    };

    // Filter DB based on search
    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const lowerQ = searchQuery.toLowerCase();
        return exerciseDatabase.filter(ex => 
            ex.name.toLowerCase().includes(lowerQ) || 
            ex.muscleGroup.toLowerCase().includes(lowerQ)
        );
    }, [searchQuery, exerciseDatabase]);

    // Totals
    const totalSets = exercises.reduce((acc, ex) => acc + ex.sets, 0);
    const estCalories = exercises.reduce((acc, ex) => acc + calculateExerciseCalories(ex), 0);
    const estTime = exercises.reduce((acc, ex) => acc + (ex.duration || 0), 0);

    return (
        <div className="fixed inset-0 z-[200] bg-[#050505] text-white flex flex-col font-mono">
            
            {/* --- HEADER --- */}
            <div className="h-20 border-b border-gray-800 bg-[#0a0a0a]/90 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 z-30 shrink-0">
                <div className="flex flex-col flex-1 mr-4">
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">Session Protocol</span>
                    <input 
                        value={sessionName}
                        onChange={e => setSessionName(e.target.value)}
                        placeholder="SESSION NAME"
                        className="bg-transparent border-none outline-none text-white font-black text-xl uppercase tracking-tight placeholder:text-gray-700 w-full"
                    />
                </div>
                <div className="flex gap-2">
                    <button onClick={onCancel} className="p-3 bg-gray-900 rounded-lg text-gray-400 hover:text-white border border-gray-800">
                        <X size={20} />
                    </button>
                </div>
            </div>

            {/* --- MAIN SCROLLABLE CONTENT --- */}
            <div className="flex-1 overflow-y-auto custom-scrollbar relative p-4 sm:p-6 max-w-3xl mx-auto w-full">
                
                {/* 1. SEARCH BAR */}
                <div className="sticky top-0 z-20 mb-6">
                    <div className="relative group">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-system-neon to-purple-600 rounded-xl opacity-30 group-focus-within:opacity-100 transition duration-500 blur"></div>
                        <div className="relative bg-[#0f0f0f] rounded-xl flex items-center px-4 py-4 border border-gray-800 shadow-2xl">
                            <Search size={20} className="text-gray-500 mr-3" />
                            <input 
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="SEARCH DATABASE (e.g. Bench Press, Chest...)"
                                className="bg-transparent border-none outline-none text-white text-base w-full placeholder:text-gray-600 font-bold"
                                autoFocus
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="text-gray-600 hover:text-white">
                                    <X size={16} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* DYNAMIC RESULTS DROPDOWN */}
                    <AnimatePresence>
                        {searchResults.length > 0 && (
                            <motion.div 
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="absolute top-full left-0 right-0 mt-2 bg-[#0a0a0a] border border-gray-800 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto z-30 custom-scrollbar"
                            >
                                {searchResults.map((ex) => (
                                    <button
                                        key={ex.id}
                                        onClick={() => handleAddExercise(ex)}
                                        className="w-full text-left px-4 py-3 hover:bg-gray-900 border-b border-gray-900 last:border-0 flex justify-between items-center group transition-colors"
                                    >
                                        <div>
                                            <div className="text-sm font-bold text-white group-hover:text-system-neon transition-colors">{ex.name}</div>
                                            <div className="text-[10px] text-gray-500 uppercase">{ex.muscleGroup}</div>
                                        </div>
                                        <Plus size={16} className="text-gray-600 group-hover:text-white" />
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* 2. ADDED EXERCISES LIST (LOG) */}
                <div className="space-y-3 pb-24">
                    <AnimatePresence mode="popLayout">
                        {exercises.length === 0 && !searchQuery && (
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-center py-12 text-gray-600 border-2 border-dashed border-gray-800 rounded-xl"
                            >
                                <List size={32} className="mx-auto mb-2 opacity-50" />
                                <p className="text-xs uppercase tracking-widest">Session Empty</p>
                                <p className="text-[10px] mt-1">Search above to add protocols</p>
                            </motion.div>
                        )}

                        {exercises.map((ex, idx) => (
                            <motion.div
                                key={`${ex.name}-${idx}`}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-[#0f0f0f]/80 backdrop-blur-sm border border-gray-800 rounded-xl p-4 relative group hover:border-gray-700 transition-colors shadow-lg"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-sm font-black text-white uppercase tracking-tight pr-8">{ex.name}</h3>
                                    <button 
                                        onClick={() => handleRemoveExercise(idx)}
                                        className="text-gray-600 hover:text-red-500 transition-colors p-1"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    {/* Sets */}
                                    <div className="bg-black/50 border border-gray-800 rounded-lg p-2 flex flex-col items-center">
                                        <label className="text-[8px] text-gray-500 uppercase font-bold mb-1">SETS</label>
                                        <input 
                                            type="number"
                                            value={ex.sets}
                                            onChange={(e) => handleUpdateExercise(idx, 'sets', Number(e.target.value))}
                                            className="w-full bg-transparent text-center text-system-neon font-black text-lg outline-none focus:text-white"
                                        />
                                    </div>

                                    {/* Reps */}
                                    <div className="bg-black/50 border border-gray-800 rounded-lg p-2 flex flex-col items-center">
                                        <label className="text-[8px] text-gray-500 uppercase font-bold mb-1">REPS</label>
                                        <input 
                                            value={ex.reps}
                                            onChange={(e) => handleUpdateExercise(idx, 'reps', e.target.value)}
                                            className="w-full bg-transparent text-center text-white font-bold text-sm py-1 outline-none focus:text-system-neon"
                                        />
                                    </div>

                                    {/* Rest */}
                                    <div className="bg-black/50 border border-gray-800 rounded-lg p-2 flex flex-col items-center">
                                        <label className="text-[8px] text-gray-500 uppercase font-bold mb-1">REST (s)</label>
                                        <input 
                                            type="number"
                                            value={ex.rest || 60}
                                            onChange={(e) => handleUpdateExercise(idx, 'rest', Number(e.target.value))}
                                            className="w-full bg-transparent text-center text-gray-300 font-mono text-sm py-1 outline-none focus:text-white"
                                        />
                                    </div>
                                </div>
                                
                                <div className="mt-2 text-[10px] text-gray-600 font-mono flex justify-end gap-3">
                                    <span>~{calculateExerciseCalories(ex)} kcal</span>
                                    <span>~{ex.duration} min</span>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>

            {/* --- FOOTER ACTIONS --- */}
            <div className="border-t border-gray-800 bg-[#0a0a0a] p-4 shrink-0 z-30 pb-safe">
                <div className="max-w-3xl mx-auto space-y-4">
                    {/* Stats Summary */}
                    {exercises.length > 0 && (
                        <div className="flex justify-between items-center px-2 text-[10px] text-gray-500 font-mono uppercase tracking-widest">
                            <div className="flex gap-4">
                                <span className="flex items-center gap-1"><Dumbbell size={12}/> {totalSets} Sets</span>
                                <span className="flex items-center gap-1"><Flame size={12}/> {estCalories} kcal</span>
                                <span className="flex items-center gap-1"><Clock size={12}/> {estTime} min</span>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            onClick={() => handleSaveSession(true)}
                            className="py-4 bg-system-success text-black font-black text-xs uppercase tracking-widest rounded-xl hover:bg-white transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                        >
                            <CheckCircle size={16} strokeWidth={2.5} />
                            ALREADY COMPLETED
                        </button>
                        <button 
                            onClick={() => handleSaveSession(false)}
                            className="py-4 bg-system-neon text-black font-black text-xs uppercase tracking-widest rounded-xl hover:bg-white transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,210,255,0.3)]"
                        >
                            <Save size={16} strokeWidth={2.5} />
                            SAVE SESSION
                        </button>
                    </div>
                </div>
            </div>

        </div>
    );
};
