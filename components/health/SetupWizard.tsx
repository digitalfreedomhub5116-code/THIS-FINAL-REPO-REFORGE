import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Ruler, Target, User, Weight, ChevronRight, ChevronLeft, SkipForward } from 'lucide-react';
import { HealthProfile } from '../../types';
import { setupContainerVariants, setupItemVariants } from './HealthHelpers';

interface SetupWizardProps {
  step: number;
  setStep: (step: number) => void;
  totalSteps: number;
  formData: Partial<HealthProfile>;
  setFormData: (data: Partial<HealthProfile>) => void;
  onSkip: () => void;
  onInitialize: () => void;
}

const SetupWizard: React.FC<SetupWizardProps> = ({
  step, setStep, totalSteps, formData, setFormData, onSkip, onInitialize,
}) => {
  const TOTAL_STEPS = totalSteps;

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-4 font-mono">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-system-card border border-system-border rounded-3xl p-8 shadow-2xl relative overflow-hidden"
      >
        {/* Minimal progress indicator */}
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gray-900">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${(step/TOTAL_STEPS)*100}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            className="h-full bg-system-neon/80" 
          />
        </div>
        
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="text-[9px] text-gray-600 font-mono tracking-widest uppercase">Calibration</div>
            <div className="text-sm font-bold text-white tracking-wide mt-0.5">Step {step} <span className="text-gray-600 font-normal">of {TOTAL_STEPS}</span></div>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
              <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i < step ? 'bg-system-neon' : 'bg-gray-800'}`} />
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="s1" variants={setupContainerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6">
              <motion.div variants={setupItemVariants} className="flex items-center gap-3 mb-4">
                <User className="text-system-neon" size={24} />
                <div className="text-xs text-gray-500 uppercase tracking-widest font-bold">Vessel Identification</div>
              </motion.div>
              <motion.div variants={setupItemVariants} className="grid grid-cols-2 gap-4">
                {['MALE', 'FEMALE'].map(g => (
                  <button 
                    key={g} 
                    onClick={() => { setFormData({...formData, gender: g as any}); setStep(2); }} 
                    className="py-6 border border-gray-800 rounded-2xl hover:bg-white hover:text-black hover:shadow-[0_0_20px_white] transition-all font-black text-sm tracking-widest"
                  >
                    {g}
                  </button>
                ))}
              </motion.div>
              
              {/* Skip / Later Button */}
              <motion.div variants={setupItemVariants} className="flex justify-center mt-6 pt-4 border-t border-gray-800/50">
                <button 
                  onClick={onSkip}
                  className="text-gray-600 text-xs font-mono flex items-center gap-2 hover:text-white transition-colors uppercase tracking-widest"
                >
                  <SkipForward size={14} /> Calibrate Later
                </button>
              </motion.div>
            </motion.div>
          )}
          
          {step === 2 && (
            <motion.div key="s2" variants={setupContainerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6">
              <motion.div variants={setupItemVariants} className="flex items-center gap-3 mb-4">
                <Activity className="text-system-neon" size={24} />
                <div className="text-xs text-gray-500 uppercase tracking-widest font-bold">Chronological Age</div>
              </motion.div>
              <motion.input 
                variants={setupItemVariants}
                type="number" 
                value={formData.age} 
                onChange={e => setFormData({...formData, age: Number(e.target.value)})} 
                className="w-full bg-black border-b-2 border-gray-800 text-center text-6xl text-white outline-none focus:border-system-neon py-6 transition-colors"
              />
              <motion.div variants={setupItemVariants} className="flex justify-between items-center mt-8">
                <button onClick={() => setStep(1)} className="text-gray-600 hover:text-white flex items-center gap-1 font-bold text-xs uppercase"><ChevronLeft size={14}/> BACK</button>
                <button onClick={() => setStep(3)} className="bg-system-neon text-black px-10 py-3 rounded-full font-black text-xs shadow-[0_0_15px_#00d2ff] hover:bg-white transition-all uppercase flex items-center gap-2">NEXT <ChevronRight size={14}/></button>
              </motion.div>
            </motion.div>
          )}
          {step === 3 && (
            <motion.div key="s3" variants={setupContainerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6">
              <motion.div variants={setupItemVariants} className="flex items-center gap-3 mb-4">
                <Ruler className="text-system-neon" size={24} />
                <div className="text-xs text-gray-500 uppercase tracking-widest font-bold">Verticality Mapping (CM)</div>
              </motion.div>
              <motion.input 
                variants={setupItemVariants}
                type="number" 
                value={formData.height} 
                onChange={e => setFormData({...formData, height: Number(e.target.value)})} 
                className="w-full bg-black border-b-2 border-gray-800 text-center text-6xl text-white outline-none focus:border-system-neon py-6 transition-colors"
              />
              <motion.div variants={setupItemVariants} className="flex justify-between items-center mt-8">
                <button onClick={() => setStep(2)} className="text-gray-600 hover:text-white flex items-center gap-1 font-bold text-xs uppercase"><ChevronLeft size={14}/> BACK</button>
                <button onClick={() => setStep(4)} className="bg-system-neon text-black px-10 py-3 rounded-full font-black text-xs shadow-[0_0_15px_#00d2ff] hover:bg-white transition-all uppercase flex items-center gap-2">NEXT <ChevronRight size={14}/></button>
              </motion.div>
            </motion.div>
          )}
          {step === 4 && (
            <motion.div key="s4" variants={setupContainerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6">
              <motion.div variants={setupItemVariants} className="flex items-center gap-3 mb-4">
                <Weight className="text-system-neon" size={24} />
                <div className="text-xs text-gray-500 uppercase tracking-widest font-bold">Current Mass (KG)</div>
              </motion.div>
              <motion.input 
                variants={setupItemVariants}
                type="number" 
                value={formData.weight} 
                onChange={e => setFormData({...formData, weight: Number(e.target.value)})} 
                className="w-full bg-black border-b-2 border-gray-800 text-center text-6xl text-white outline-none focus:border-system-neon py-6 transition-colors"
              />
              <motion.div variants={setupItemVariants} className="flex justify-between items-center mt-8">
                <button onClick={() => setStep(3)} className="text-gray-600 hover:text-white flex items-center gap-1 font-bold text-xs uppercase"><ChevronLeft size={14}/> BACK</button>
                <button onClick={() => setStep(5)} className="bg-system-neon text-black px-10 py-3 rounded-full font-black text-xs shadow-[0_0_15px_#00d2ff] hover:bg-white transition-all uppercase flex items-center gap-2">NEXT <ChevronRight size={14}/></button>
              </motion.div>
            </motion.div>
          )}
          {step === 5 && (
            <motion.div key="s5" variants={setupContainerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6">
              <motion.div variants={setupItemVariants} className="flex items-center gap-3 mb-4">
                <Target className="text-system-accent" size={24} />
                <div className="text-xs text-system-accent uppercase tracking-widest font-black">Target Mass (KG)</div>
              </motion.div>
              <motion.div variants={setupItemVariants} className="relative">
                <div className="absolute inset-0 bg-system-accent/10 blur-xl -z-10 rounded-full" />
                <input 
                  type="number" 
                  value={formData.targetWeight} 
                  onChange={e => setFormData({...formData, targetWeight: Number(e.target.value)})} 
                  className="w-full bg-black border-b-2 border-system-accent text-center text-6xl text-white outline-none focus:shadow-[0_4px_15px_rgba(139,92,246,0.5)] py-6 transition-all font-black"
                />
              </motion.div>
              <motion.div variants={setupItemVariants} className="flex justify-between items-center mt-8">
                <button onClick={() => setStep(4)} className="text-gray-600 hover:text-white flex items-center gap-1 font-bold text-xs uppercase"><ChevronLeft size={14}/> BACK</button>
                <button onClick={() => setStep(6)} className="bg-system-accent text-white px-10 py-3 rounded-full font-black text-xs shadow-[0_0_20px_#8b5cf6] hover:bg-white hover:text-black transition-all uppercase flex items-center gap-2">NEXT <ChevronRight size={14}/></button>
              </motion.div>
            </motion.div>
          )}
          {step === 6 && (
            <motion.div key="s6" variants={setupContainerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-4">
              <motion.div variants={setupItemVariants} className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-4">Energy Flux Levels</motion.div>
              <motion.div variants={setupItemVariants} className="grid gap-2">
                {['SEDENTARY', 'LIGHT', 'MODERATE', 'VERY_ACTIVE'].map(a => (
                  <button 
                    key={a} 
                    onClick={() => { setFormData({...formData, activityLevel: a as any}); setStep(7); }} 
                    className="w-full py-4 border border-gray-800 rounded-xl font-black text-[10px] tracking-widest hover:bg-white hover:text-black transition-all uppercase"
                  >
                    {a}
                  </button>
                ))}
              </motion.div>
              <motion.button variants={setupItemVariants} onClick={() => setStep(5)} className="text-gray-600 hover:text-white flex items-center gap-1 font-bold text-xs uppercase mt-4"><ChevronLeft size={14}/> BACK</motion.button>
            </motion.div>
          )}
          {step === 7 && (
            <motion.div key="s7" variants={setupContainerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-4">
              <motion.div variants={setupItemVariants} className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-4">Primary Directive</motion.div>
              <motion.div variants={setupItemVariants} className="grid gap-2">
                {['LOSE_WEIGHT', 'BUILD_MUSCLE', 'RECOMP'].map(g => (
                  <button 
                    key={g} 
                    onClick={() => { setFormData({...formData, goal: g as any}); setStep(8); }} 
                    className="w-full py-4 border border-gray-800 rounded-xl font-black text-[10px] tracking-widest hover:bg-white hover:text-black transition-all uppercase"
                  >
                    {g === 'RECOMP' ? 'LOSE WEIGHT + BUILD MUSCLE' : g.replace('_', ' ')}
                  </button>
                ))}
              </motion.div>
              <motion.button variants={setupItemVariants} onClick={() => setStep(6)} className="text-gray-600 hover:text-white flex items-center gap-1 font-bold text-xs uppercase mt-4"><ChevronLeft size={14}/> BACK</motion.button>
            </motion.div>
          )}
          {step === 8 && (
            <motion.div key="s8" variants={setupContainerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-4">
              <motion.div variants={setupItemVariants} className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-4">Resource Availability</motion.div>
              <motion.div variants={setupItemVariants} className="grid gap-2">
                {['GYM', 'HOME_DUMBBELLS', 'BODYWEIGHT'].map(eq => (
                  <button 
                    key={eq} 
                    onClick={() => { 
                      setFormData({...formData, equipment: eq as any}); 
                      if (eq === 'BODYWEIGHT') onInitialize(); 
                      else setStep(9); 
                    }} 
                    className="w-full py-4 border border-gray-800 rounded-xl font-black text-[10px] tracking-widest hover:bg-white hover:text-black transition-all uppercase"
                  >
                    {eq.replace('_', ' ')}
                  </button>
                ))}
              </motion.div>
              <motion.button variants={setupItemVariants} onClick={() => setStep(7)} className="text-gray-600 hover:text-white flex items-center gap-1 font-bold text-xs uppercase mt-4"><ChevronLeft size={14}/> BACK</motion.button>
            </motion.div>
          )}
          {step === 9 && (
            <motion.div key="s9" variants={setupContainerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6 text-center">
              <motion.h3 variants={setupItemVariants} className="text-xl text-white font-black italic">CONFIRM CONFIGURATION</motion.h3>
              <motion.div variants={setupItemVariants} className="bg-gray-900/50 p-6 rounded-xl border border-gray-800 text-left space-y-3 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">PROFILE</span>
                  <span className="text-white">{formData.gender}, {formData.age}y</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">METRICS</span>
                  <span className="text-white">{formData.height}cm / {formData.weight}kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">GOAL</span>
                  <span className="text-system-neon">
                    {formData.goal === 'RECOMP' ? 'LOSE WEIGHT + BUILD MUSCLE' : formData.goal?.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">PROTOCOL</span>
                  <span className="text-white">{formData.equipment} / {formData.workoutSplit}</span>
                </div>
              </motion.div>
              <motion.button 
                variants={setupItemVariants}
                onClick={onInitialize}
                className="w-full bg-system-neon text-black font-black py-5 rounded-xl shadow-[0_0_30px_#00d2ff] hover:scale-105 transition-transform"
              >
                INITIALIZE SYSTEM
              </motion.button>
              <motion.button variants={setupItemVariants} onClick={() => setStep(8)} className="text-gray-600 hover:text-white flex items-center gap-1 font-bold text-xs uppercase mt-6 mx-auto"><ChevronLeft size={14}/> BACK</motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default SetupWizard;
