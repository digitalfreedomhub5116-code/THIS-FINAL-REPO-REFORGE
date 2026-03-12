
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, FileText, Check, ChevronDown, Lock } from 'lucide-react';

interface SystemAgreementProps {
  onComplete: () => void;
}

const SystemAgreement: React.FC<SystemAgreementProps> = ({ onComplete }) => {
  const [agreed, setAgreed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = useState(true);

  const handleScroll = () => {
    if (scrollRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        if (scrollTop + clientHeight >= scrollHeight - 20) {
            setCanScroll(false);
        } else {
            setCanScroll(true);
        }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-6 font-mono">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.05)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:20px_20px] opacity-20 pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl bg-[#0a0a0a] border border-gray-800 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] relative z-10"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-800 bg-gray-900/50 flex items-center gap-4">
            <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                <ShieldAlert className="text-red-500" size={24} />
            </div>
            <div>
                <h1 className="text-xl font-black text-white uppercase tracking-tighter">System User Agreement</h1>
                <p className="text-[10px] text-gray-500 tracking-[0.2em] uppercase">Mandatory Protocol v2.4</p>
            </div>
        </div>

        {/* Scrollable Content */}
        <div 
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-6 text-gray-400 text-xs leading-relaxed space-y-6 custom-scrollbar relative"
        >
            <div className="text-center mb-6">
                <p className="text-system-neon font-bold uppercase tracking-widest text-[10px] mb-2">Notice to Player</p>
                <p>Read the following terms carefully. Acceptance is irrevocable.</p>
            </div>

            <section>
                <h3 className="text-white font-bold uppercase mb-2 flex items-center gap-2"><FileText size={12}/> 1. The Awakening Protocol</h3>
                <p>
                    By initializing this application, you ("The Player") agree to submit to the System's guidance. The System is designed to gamify your physical and mental evolution. You acknowledge that the "Game" is reality, and the results are binding to your physical vessel.
                </p>
            </section>

            <section>
                <h3 className="text-white font-bold uppercase mb-2 flex items-center gap-2"><FileText size={12}/> 2. Data Collection & Privacy</h3>
                <div className="bg-gray-900/50 p-4 border-l-2 border-system-neon rounded-r-lg">
                    <p className="text-gray-300 font-bold">
                        The data, images, and video feeds provided by The Player will be saved, encrypted, and processed for further use. This includes usage for personalization, structural analysis, AI avatar generation, and difficulty calibration purposes.
                    </p>
                </div>
                <p className="mt-2">
                    Your biometrics are essential for the System to calculate accurate XP rewards and health projections. This data is stored within your Shadow Profile and synced to the secure cloud database.
                </p>
            </section>

            <section>
                <h3 className="text-white font-bold uppercase mb-2 flex items-center gap-2"><FileText size={12}/> 3. Fair Play (ForgeGuard™)</h3>
                <p>
                    The System employs <strong>ForgeGuard AI</strong> to monitor input integrity. Falsifying workout logs, nutrition data, or activity duration is a violation of the Hunter Code.
                </p>
                <p className="mt-2 text-red-400">
                    WARNING: Detected dishonesty will result in immediate XP deduction, rank demotion, and potential permanent ban from the Global Leaderboards.
                </p>
            </section>

            <section>
                <h3 className="text-white font-bold uppercase mb-2 flex items-center gap-2"><FileText size={12}/> 4. The Penalty Zone</h3>
                <p>
                    Failure to complete Daily Quests results in a "Penalty Quest". This is non-negotiable. If The Player fails to maintain their streak or meet the minimum activity threshold, the System will enforce a Penalty Zone state where features are locked until a survival task is completed.
                </p>
            </section>

            <section>
                <h3 className="text-white font-bold uppercase mb-2 flex items-center gap-2"><FileText size={12}/> 5. DUSK AI Interaction</h3>
                <p>
                    You accept <strong>DUSK</strong> as your accountability partner. Dusk's personality is designed to be stern and objective. Do not expect sympathy for laziness. Interactions with Dusk are logged to improve coaching algorithms.
                </p>
            </section>

            <section>
                <h3 className="text-white font-bold uppercase mb-2 flex items-center gap-2"><FileText size={12}/> 6. Liability Disclaimer</h3>
                <p>
                    The System pushes you to your limits. You acknowledge that you are physically capable of performing the exercises prescribed. The developers and the System AI are not liable for injuries sustained during the "Dungeon" (Workout) phases. Listen to your body, but do not yield to weakness.
                </p>
            </section>

            <div className="pt-8 pb-4 text-center text-gray-600 uppercase tracking-widest text-[10px]">
                --- END OF DOCUMENT ---
            </div>
        </div>

        {/* Scroll Hint Overlay */}
        <AnimatePresence>
            {canScroll && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute bottom-24 left-0 w-full h-12 bg-gradient-to-t from-[#0a0a0a] to-transparent pointer-events-none flex justify-center items-end pb-2"
                >
                    <ChevronDown className="text-system-neon animate-bounce" size={20} />
                </motion.div>
            )}
        </AnimatePresence>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-800 bg-gray-900/30">
            <div className="flex items-start gap-3 mb-6 cursor-pointer" onClick={() => setAgreed(!agreed)}>
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all mt-0.5 ${agreed ? 'bg-system-neon border-system-neon' : 'bg-black border-gray-600'}`}>
                    {agreed && <Check size={14} className="text-black" strokeWidth={3} />}
                </div>
                <div className="text-xs text-gray-400 select-none">
                    I have read and agree to the System Protocols, Data Usage Policy, and the Hunter Code of Conduct.
                </div>
            </div>

            <button 
                onClick={onComplete}
                disabled={!agreed}
                className={`w-full py-4 rounded-xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2
                    ${agreed 
                        ? 'bg-white text-black hover:bg-system-neon hover:scale-[1.02] shadow-[0_0_20px_rgba(255,255,255,0.2)]' 
                        : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
                    }
                `}
            >
                {!agreed && <Lock size={14} />}
                {agreed ? 'ACCEPT & INITIALIZE' : 'READ & AGREE TO CONTINUE'}
            </button>
        </div>

      </motion.div>
    </div>
  );
};

export default SystemAgreement;
