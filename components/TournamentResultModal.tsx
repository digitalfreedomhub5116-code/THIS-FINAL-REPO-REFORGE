
import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Coins, Award, Sparkles } from 'lucide-react';
import { TournamentReward } from '../types';

interface TournamentResultModalProps {
  reward: TournamentReward;
  onClaim: () => void;
}

const TournamentResultModal: React.FC<TournamentResultModalProps> = ({ reward, onClaim }) => {
  const isTopThree = reward.rank <= 3;
  const isWinner = reward.rank === 1;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
        {/* Background Rays for Top Ranks */}
        {isTopThree && (
            <motion.div 
               animate={{ rotate: 360 }}
               transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
               className="absolute inset-0 flex items-center justify-center z-0 opacity-20 pointer-events-none"
            >
                <div className={`w-[800px] h-[800px] rounded-full border-[2px] border-dashed ${isWinner ? 'border-yellow-500' : 'border-system-neon'}`} />
            </motion.div>
        )}

        <motion.div 
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: -20 }}
            className={`relative z-10 w-full max-w-sm bg-[#0a0a0a] border-2 rounded-2xl overflow-hidden shadow-2xl flex flex-col text-center ${isWinner ? 'border-yellow-500 shadow-[0_0_50px_rgba(234,179,8,0.3)]' : 'border-system-neon shadow-[0_0_30px_rgba(0,210,255,0.2)]'}`}
        >
            {/* Header Art */}
            <div className={`h-24 flex items-center justify-center relative overflow-hidden ${isWinner ? 'bg-yellow-900/20' : 'bg-gray-900/50'}`}>
                <div className={`absolute inset-0 bg-gradient-to-b ${isWinner ? 'from-yellow-500/10' : 'from-system-neon/10'} to-transparent`} />
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1, rotate: [0, -10, 10, 0] }}
                    transition={{ type: "spring", stiffness: 200, damping: 10, delay: 0.2 }}
                >
                    {isWinner ? (
                        <Trophy size={64} className="text-yellow-500 drop-shadow-[0_0_15px_rgba(234,179,8,0.8)]" />
                    ) : isTopThree ? (
                        <Award size={64} className="text-system-neon drop-shadow-[0_0_15px_rgba(0,210,255,0.8)]" />
                    ) : (
                        <Award size={64} className="text-gray-400" />
                    )}
                </motion.div>
            </div>

            <div className="p-8 space-y-4">
                <div>
                    <h2 className="text-2xl font-black text-white font-mono tracking-tighter uppercase mb-1">
                        TOURNAMENT COMPLETE
                    </h2>
                    <p className="text-[10px] text-gray-500 font-mono tracking-[0.2em] uppercase">
                        YESTERDAY'S PERFORMANCE
                    </p>
                </div>

                <div className="py-4 border-y border-gray-800">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <div className="text-[10px] text-gray-500 font-mono mb-1">RANK</div>
                            <div className={`text-3xl font-black font-mono ${isWinner ? 'text-yellow-500' : 'text-white'}`}>
                                #{reward.rank}
                            </div>
                        </div>
                        <div>
                            <div className="text-[10px] text-gray-500 font-mono mb-1">REWARD</div>
                            <div className="text-3xl font-black font-mono text-system-accent flex items-center justify-center gap-2">
                                <Coins size={24} /> {reward.gold}
                            </div>
                        </div>
                    </div>
                </div>

                <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onClaim}
                    className={`w-full py-4 rounded-xl font-bold font-mono text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${isWinner ? 'bg-yellow-500 text-black hover:bg-white' : 'bg-system-neon text-black hover:bg-white'}`}
                >
                    <Sparkles size={16} fill="black" /> CLAIM REWARD
                </motion.button>
            </div>
        </motion.div>
    </div>
  );
};

export default TournamentResultModal;
