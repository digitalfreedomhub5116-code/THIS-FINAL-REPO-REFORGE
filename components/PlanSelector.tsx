import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dumbbell, Zap, Clock, Calendar, ChevronRight, Sparkles, ArrowLeft } from 'lucide-react';
import { WorkoutPlan, HealthProfile } from '../types';
import { API_BASE } from '../lib/apiConfig';
import { DEFAULT_PLANS, getRecommendedPlan } from '../lib/defaultPlans';

interface PlanSelectorProps {
  healthProfile?: Partial<HealthProfile>;
  onSelectPlan: (plan: WorkoutPlan) => void;
  onGenerateAI: () => void;
  onBack?: () => void;
  isGenerating?: boolean;
}

const difficultyColor = (d: string) => {
  if (d === 'BEGINNER') return { bg: 'bg-green-900/30', border: 'border-green-700/50', text: 'text-green-400', label: 'bg-green-900/60 text-green-400' };
  if (d === 'INTERMEDIATE') return { bg: 'bg-yellow-900/20', border: 'border-yellow-700/50', text: 'text-yellow-400', label: 'bg-yellow-900/60 text-yellow-400' };
  return { bg: 'bg-red-900/20', border: 'border-red-700/50', text: 'text-red-400', label: 'bg-red-900/60 text-red-400' };
};

const equipmentLabel = (e: string) => {
  if (e === 'GYM') return '🏋️ Full Gym';
  if (e === 'HOME_DUMBBELLS') return '🏠 Home + Dumbbells';
  if (e === 'BODYWEIGHT') return '💪 Bodyweight';
  return e;
};

const PlanSelector: React.FC<PlanSelectorProps> = ({ healthProfile, onSelectPlan, onGenerateAI, onBack, isGenerating }) => {
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/workout/plans`)
      .then(r => r.json())
      .then(data => {
        const apiPlans = Array.isArray(data) ? data : [];
        // Merge: API plans first, then default plans that aren't duplicated or tombstones
        const apiIds = new Set(apiPlans.map((p: WorkoutPlan) => p.id));
        const deletedIds = new Set(apiPlans.filter((p: any) => p.name === 'DELETED_DEFAULT').map((p: any) => p.id));
        const merged = [
          ...apiPlans.filter((p: any) => p.name !== 'DELETED_DEFAULT'), 
          ...DEFAULT_PLANS.filter(dp => !apiIds.has(dp.id) && !deletedIds.has(dp.id))
        ];
        setPlans(merged);
      })
      .catch(() => setPlans(DEFAULT_PLANS))
      .finally(() => setLoading(false));
  }, []);

  // Sort: matching equipment first, then others
  const filtered = plans.filter(p => p.is_active !== false).sort((a, b) => {
    if (!healthProfile?.equipment) return 0;
    const aMatch = a.equipment === healthProfile.equipment ? 0 : 1;
    const bMatch = b.equipment === healthProfile.equipment ? 0 : 1;
    return aMatch - bMatch;
  });

  // Recommended plan based on user equipment + split
  const recommended = healthProfile?.equipment
    ? getRecommendedPlan(healthProfile.equipment as any, healthProfile.workoutSplit as any)
    : null;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <div className="sticky top-0 z-10 bg-black/90 backdrop-blur border-b border-gray-900 px-4 py-3 flex items-center gap-3">
        {onBack && (
          <button onClick={onBack} className="text-gray-500 hover:text-white transition-colors">
            <ArrowLeft size={18} />
          </button>
        )}
        <div className="flex-1">
          <div className="text-[9px] text-system-neon font-bold tracking-widest uppercase">SYSTEM PROTOCOL</div>
          <div className="text-sm font-black text-white tracking-tight">Select Your Journey</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 pb-24 space-y-8">

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="bg-gray-900/40 border border-gray-800 rounded-2xl p-5 animate-pulse">
                <div className="h-4 bg-gray-800 rounded w-2/3 mb-3" />
                <div className="h-3 bg-gray-800 rounded w-full mb-2" />
                <div className="h-3 bg-gray-800 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {filtered.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <Dumbbell size={12} className="text-system-neon" />
                  <span className="text-[10px] text-system-neon font-bold uppercase tracking-widest">Premade Programs</span>
                </div>

                <AnimatePresence>
                  {filtered.map((plan, idx) => {
                    const dc = difficultyColor(plan.difficulty);
                    const isRecommended = recommended && plan.id === recommended.id;
                    return (
                      <motion.button
                        key={plan.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.07 }}
                        onClick={() => onSelectPlan(plan)}
                        onMouseEnter={() => setHoveredId(plan.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        className={`w-full text-left ${dc.bg} border ${isRecommended ? 'border-system-neon/70 ring-1 ring-system-neon/30' : hoveredId === plan.id ? 'border-system-neon/60 shadow-[0_0_20px_rgba(0,210,255,0.1)]' : dc.border} rounded-2xl p-5 transition-all duration-300 group relative`}
                      >
                        {isRecommended && (
                          <div className="absolute -top-2 left-4 bg-system-neon text-black text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">Recommended</div>
                        )}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${dc.label}`}>
                                {plan.difficulty}
                              </span>
                              <span className="text-[9px] text-gray-500 font-mono">{equipmentLabel(plan.equipment)}</span>
                            </div>
                            <div className="text-base font-black text-white tracking-tight leading-tight mb-1">{plan.name}</div>
                            {plan.description && (
                              <div className="text-[11px] text-gray-400 leading-snug mb-3">{plan.description}</div>
                            )}
                            <div className="flex gap-4">
                              <div className="flex items-center gap-1 text-[10px] text-gray-500">
                                <Calendar size={10} className={dc.text} />
                                <span>{plan.duration_weeks} weeks</span>
                              </div>
                              <div className="flex items-center gap-1 text-[10px] text-gray-500">
                                <Clock size={10} className={dc.text} />
                                <span>{plan.days_per_week} days/week</span>
                              </div>
                              <div className="flex items-center gap-1 text-[10px] text-gray-500">
                                <Dumbbell size={10} className={dc.text} />
                                <span>{(plan.days || []).length} sessions</span>
                              </div>
                            </div>
                          </div>
                          <div className={`shrink-0 mt-1 ${dc.text} group-hover:translate-x-1 transition-transform`}>
                            <ChevronRight size={20} />
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}

            {filtered.length === 0 && !loading && (
              <div className="text-center py-8 text-gray-700">
                <Dumbbell size={28} className="mx-auto mb-3 opacity-30" />
                <div className="text-xs font-mono">No premade plans available yet.</div>
                <div className="text-[10px] text-gray-600 mt-1">Admin must create plans in the dashboard.</div>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles size={12} className="text-purple-400" />
                <span className="text-[10px] text-purple-400 font-bold uppercase tracking-widest">AI Personalized</span>
              </div>

              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: filtered.length * 0.07 + 0.1 }}
                onClick={onGenerateAI}
                disabled={isGenerating}
                className="w-full text-left bg-gradient-to-br from-purple-900/20 to-indigo-900/10 border border-purple-800/30 hover:border-purple-600/50 rounded-2xl p-5 transition-all duration-300 group disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(139,92,246,0.03)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-purple-900/60 text-purple-400">AI GENERATED</span>
                    </div>
                    <div className="text-base font-black text-white tracking-tight leading-tight mb-1">
                      {isGenerating ? 'Generating Your Plan...' : 'Generate My Personalized Plan'}
                    </div>
                    <div className="text-[11px] text-gray-400 leading-snug mb-3">
                      {isGenerating
                        ? 'ForgeGuard AI is crafting your unique program...'
                        : 'AI creates a custom program based on your goals, equipment, and fitness level using our exercise library.'}
                    </div>
                    {!isGenerating && healthProfile && (
                      <div className="flex gap-3 flex-wrap">
                        {healthProfile.goal && <span className="text-[9px] text-purple-400/70 font-mono bg-purple-900/20 px-2 py-0.5 rounded">{healthProfile.goal}</span>}
                        {healthProfile.equipment && <span className="text-[9px] text-purple-400/70 font-mono bg-purple-900/20 px-2 py-0.5 rounded">{equipmentLabel(healthProfile.equipment)}</span>}
                      </div>
                    )}
                    {isGenerating && (
                      <div className="flex gap-1 mt-3">
                        {[0,1,2].map(i => (
                          <div key={i} className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 mt-1 text-purple-400 group-hover:translate-x-1 transition-transform">
                    {isGenerating ? <Zap size={20} className="animate-pulse" /> : <ChevronRight size={20} />}
                  </div>
                </div>
              </motion.button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PlanSelector;
