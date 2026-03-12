
import React, { useState, useEffect } from 'react';
import { RefreshCw, Dumbbell, Home, Building2, Activity, X, Maximize2, Layers, Wrench } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Types for our data structure
interface ExerciseData {
  name: string;
  environment: 'Home' | 'Dumbbells' | 'Gym';
  difficulty: string;
  equipment: string;
}

interface ScheduleData {
  [day: string]: ExerciseData[];
}

const WorkoutPlanPreview: React.FC = () => {
  // --- STATE MANAGEMENT ---
  const [equipment, setEquipment] = useState<string>('Gym');
  const [experience, setExperience] = useState<string>('Intermediate');
  const [schedule, setSchedule] = useState<ScheduleData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // --- MOCK DATA GENERATOR (Simulates API) ---
  const generateMockSchedule = () => {
    setLoading(true);
    
    // Simulate network delay
    setTimeout(() => {
      const getEnv = () => equipment as 'Home' | 'Dumbbells' | 'Gym';
      
      const getEquipment = (name: string, env: string): string => {
          if (env === 'Home') return 'Bodyweight / Mat';
          if (env === 'Dumbbells') return 'Pair of Dumbbells, Bench (Optional)';
          if (name.includes('Cable')) return 'Cable Machine';
          if (name.includes('Barbell') || name.includes('Deadlift') || name.includes('Squat')) return 'Barbell, Plates, Rack';
          if (name.includes('Machine') || name.includes('Leg Press')) return 'Gym Machine';
          if (name.includes('Pull-Up')) return 'Pull-Up Bar';
          return 'Standard Gym Equipment';
      };

      const createExercise = (name: string): ExerciseData => {
          const env = getEnv();
          return {
              name,
              environment: env,
              difficulty: experience,
              equipment: getEquipment(name, env)
          };
      };
      
      const mockData: ScheduleData = {
        "Monday": [
          createExercise(equipment === 'Home' ? "Wide Pushups" : "Barbell Bench Press"),
          createExercise(equipment === 'Home' ? "Incline Pushups" : "Incline DB Press"),
          createExercise("Chest Flys"),
          createExercise("Dips"),
          createExercise("Pushup Burnout"),
        ],
        "Tuesday": [
          createExercise("Pull-Ups"),
          createExercise("Bent Over Rows"),
          createExercise("Lat Pulldowns"),
          createExercise("Face Pulls"),
          createExercise("Deadlifts"),
        ],
        "Wednesday": [
          createExercise("Overhead Press"),
          createExercise("Lateral Raises"),
          createExercise("Front Raises"),
          createExercise("Rear Delt Flys"),
          createExercise("Shrugs"),
        ],
        "Thursday": [
          createExercise("Barbell Curls"),
          createExercise("Hammer Curls"),
          createExercise("Preacher Curls"),
          createExercise("Skullcrushers"),
          createExercise("Tricep Pushdowns"),
          createExercise("Overhead Extensions"),
        ],
        "Friday": [
          createExercise("Plank"),
          createExercise("Russian Twists"),
          createExercise("Leg Raises"),
          createExercise("Cable Crunches"),
          createExercise("Ab Rollout"),
        ],
        "Saturday": [
          createExercise("Squats"),
          createExercise("Leg Press"),
          createExercise("Lunges"),
          createExercise("Hamstring Curls"),
          createExercise("Calf Raises"),
        ]
      };
      
      setSchedule(mockData);
      setLoading(false);
    }, 600);
  };

  // Load initial data
  useEffect(() => {
    generateMockSchedule();
  }, []);

  // --- HELPER: BADGE STYLES ---
  const getBadgeStyle = (env: string) => {
    switch (env) {
      case 'Gym': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'Dumbbells': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'Home': return 'bg-green-500/10 text-green-400 border-green-500/20';
      default: return 'bg-gray-800 text-gray-400';
    }
  };

  const getEnvIcon = (env: string) => {
    switch (env) {
      case 'Gym': return <Building2 size={10} />;
      case 'Dumbbells': return <Dumbbell size={10} />;
      case 'Home': return <Home size={10} />;
      default: return <Activity size={10} />;
    }
  };

  // Map days to specific focus areas for the header
  const dayFocusMap: Record<string, string> = {
    "Monday": "Chest Focus",
    "Tuesday": "Back Focus",
    "Wednesday": "Shoulder Focus",
    "Thursday": "Arms (Bi & Tri)",
    "Friday": "Core Stability",
    "Saturday": "Leg Day"
  };

  // Order of display
  const daysOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  return (
    <div className="w-full max-w-7xl mx-auto p-6 bg-[#050505] min-h-screen font-mono text-gray-200 relative">
      
      {/* --- HEADER & CONTROLS --- */}
      <div className="mb-8 border-b border-gray-800 pb-6">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <Activity className="text-system-neon" /> WORKOUT GENERATOR PREVIEW
        </h2>
        
        <div className="flex flex-col md:flex-row gap-4 items-end">
          {/* Equipment Dropdown */}
          <div className="w-full md:w-1/4">
            <label className="block text-xs text-gray-500 mb-1 font-bold uppercase tracking-wider">Equipment</label>
            <select 
              value={equipment}
              onChange={(e) => setEquipment(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm focus:border-system-neon focus:outline-none transition-colors appearance-none"
            >
              <option value="Gym">Gym (Full Access)</option>
              <option value="Dumbbells">Dumbbells Only</option>
              <option value="Home">Home (Bodyweight)</option>
            </select>
          </div>

          {/* Experience Dropdown */}
          <div className="w-full md:w-1/4">
            <label className="block text-xs text-gray-500 mb-1 font-bold uppercase tracking-wider">Experience</label>
            <select 
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm focus:border-system-neon focus:outline-none transition-colors appearance-none"
            >
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </div>

          {/* Generate Button */}
          <button 
            onClick={generateMockSchedule}
            disabled={loading}
            className="w-full md:w-auto px-8 py-3 bg-system-neon text-black font-bold rounded-lg hover:bg-white transition-all active:scale-95 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,210,255,0.3)]"
          >
            {loading ? <RefreshCw className="animate-spin" size={18} /> : <RefreshCw size={18} />}
            {loading ? 'GENERATING...' : 'GENERATE PLAN'}
          </button>
        </div>
      </div>

      {/* --- GRID LAYOUT --- */}
      {schedule && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {daysOrder.map((day) => {
            const exercises = schedule[day] || [];
            
            return (
              <motion.div 
                key={day}
                layoutId={`card-${day}`}
                onClick={() => setSelectedDay(day)}
                className="bg-gray-900/40 border border-gray-800 rounded-xl overflow-hidden hover:border-system-neon/50 hover:bg-gray-900/60 transition-all cursor-pointer group flex flex-col h-full relative"
              >
                {/* Hover Effect Hint */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-system-neon">
                    <Maximize2 size={16} />
                </div>

                {/* Day Header */}
                <div className="bg-gray-950/80 p-4 border-b border-gray-800 flex justify-between items-center">
                  <div>
                    <h3 className="text-white font-bold text-lg">{day}</h3>
                    <div className="text-[10px] text-system-neon uppercase tracking-widest font-bold">
                      {dayFocusMap[day]}
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 font-bold bg-gray-900 px-2 py-1 rounded">
                    {exercises.length} EXERCISES
                  </div>
                </div>

                {/* Exercise List Preview (Truncated) */}
                <div className="p-4 space-y-3 flex-1">
                  {exercises.slice(0, 4).map((ex, idx) => (
                    <div key={idx} className="flex items-start gap-3 text-sm opacity-80">
                      <span className="text-gray-600 font-mono text-xs mt-0.5 w-4">{idx + 1}.</span>
                      <div className="flex-1 truncate">
                        <div className="text-gray-200 font-medium leading-tight truncate">
                          {ex.name}
                        </div>
                      </div>
                    </div>
                  ))}
                  {exercises.length > 4 && (
                      <div className="text-[10px] text-gray-500 font-mono pt-2 border-t border-gray-800/50">
                          + {exercises.length - 4} MORE EXERCISES
                      </div>
                  )}
                  
                  {/* Empty State Fill */}
                  {exercises.length === 0 && (
                    <div className="h-full flex items-center justify-center text-gray-700 text-xs italic">
                      Rest Day or No Data
                    </div>
                  )}
                </div>
                
                {/* Card Footer (Visual Only) */}
                <div className="h-1 w-full bg-gradient-to-r from-transparent via-gray-800 to-transparent opacity-50 group-hover:via-system-neon group-hover:opacity-100 transition-all"></div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* --- DETAILED MODAL --- */}
      <AnimatePresence>
        {selectedDay && schedule && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setSelectedDay(null)}
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                />

                {/* Modal Container */}
                <motion.div 
                    layoutId={`card-${selectedDay}`}
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="relative w-full max-w-2xl bg-[#0a0a0a] border border-gray-700 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[85vh]"
                >
                    {/* Modal Header */}
                    <div className="p-6 border-b border-gray-800 flex justify-between items-start bg-gray-900/50 relative">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-system-neon to-transparent opacity-50" />
                        <div>
                            <div className="text-[10px] text-system-neon font-bold tracking-widest uppercase mb-1">
                                {dayFocusMap[selectedDay]}
                            </div>
                            <h2 className="text-3xl font-black italic text-white tracking-tighter uppercase">{selectedDay}</h2>
                        </div>
                        <button 
                            onClick={() => setSelectedDay(null)}
                            className="p-2 bg-gray-800 rounded-full text-gray-400 hover:text-white hover:bg-red-900/50 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Modal Content - Scrollable */}
                    <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                        <div className="space-y-4">
                            {schedule[selectedDay]?.map((ex, idx) => (
                                <motion.div 
                                    key={idx}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="bg-gray-900/30 border border-gray-800 rounded-xl p-4 flex flex-col md:flex-row gap-4 hover:border-gray-700 transition-colors"
                                >
                                    {/* Exercise Number */}
                                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-800 text-gray-400 font-mono font-bold text-xs shrink-0">
                                        {idx + 1}
                                    </div>

                                    <div className="flex-1">
                                        <h3 className="text-white font-bold text-lg mb-2">{ex.name}</h3>
                                        
                                        <div className="flex flex-wrap gap-2">
                                            {/* Environment Badge */}
                                            <span className={`text-[10px] px-2 py-1 rounded border flex items-center gap-1.5 ${getBadgeStyle(ex.environment)}`}>
                                                {getEnvIcon(ex.environment)}
                                                {ex.environment.toUpperCase()}
                                            </span>

                                            {/* Difficulty Badge */}
                                            <span className="text-[10px] px-2 py-1 rounded border bg-gray-800 border-gray-700 text-gray-400 flex items-center gap-1.5">
                                                <Layers size={10} />
                                                {ex.difficulty.toUpperCase()}
                                            </span>

                                            {/* Equipment Badge */}
                                            <span className="text-[10px] px-2 py-1 rounded border bg-gray-800 border-gray-700 text-gray-400 flex items-center gap-1.5">
                                                <Wrench size={10} />
                                                {ex.equipment.toUpperCase()}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Placeholder for Sets/Reps visuals if we had them in mock data */}
                                    <div className="hidden md:flex flex-col items-end justify-center pl-4 border-l border-gray-800">
                                        <div className="text-xs text-gray-500 font-mono mb-1">STANDARD SETS</div>
                                        <div className="text-system-neon font-bold">3 - 4</div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Modal Footer */}
                    <div className="p-4 bg-gray-900/50 border-t border-gray-800 text-center">
                        <p className="text-[10px] text-gray-500 font-mono">
                            TOTAL VOLUME: {schedule[selectedDay]?.length} EXERCISES // ESTIMATED DURATION: {schedule[selectedDay]?.length * 10} MIN
                        </p>
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WorkoutPlanPreview;
