
import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, AlertTriangle, CheckCircle, Eye, Camera, Send, X, RefreshCw } from 'lucide-react';

interface CheatWarningModalProps {
  strikes: number;
  onAcknowledge: () => void;
  originalSelfieUrl?: string;
  onRemoveStrike: () => void;
  onVerifyTicket: (proof: string, reason: string) => void;
}

type ModalView = 'WARNING' | 'TICKET';

const CheatWarningModal: React.FC<CheatWarningModalProps> = ({ 
    strikes, 
    onAcknowledge, 
    originalSelfieUrl, 
    onVerifyTicket
}) => {
  const [view, setView] = useState<ModalView>('WARNING');
  
  // Ticket State
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [reason, setReason] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 5-strike ban system
  const currentStrikeCount = strikes;
  const isCritical = currentStrikeCount >= 3;
  const penaltyActive = isCritical;
  
  // Determine next penalty text based on current strike count
  let warningMessage = "System Analysis has flagged this completion event. The timeline contradicts the difficulty matrix parameters assigned by ForgeGuard.";
  let penaltyText = "";

  if (currentStrikeCount === 1) penaltyText = "WARNING: 10% XP DEDUCTION ON NEXT VIOLATION";
  else if (currentStrikeCount === 2) penaltyText = "CRITICAL: -10% XP APPLIED — 2 violations remaining";
  else if (currentStrikeCount === 3) penaltyText = "DANGER: -20% XP APPLIED — 1 violation remaining before permanent ban";
  else if (currentStrikeCount === 4) penaltyText = "FINAL WARNING: -20% XP APPLIED — NEXT ANOMALY = PERMANENT BAN";
  else penaltyText = "ACCOUNT TERMINATION IMMINENT";

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = () => setProofImage(reader.result as string);
          reader.readAsDataURL(file);
      }
  };

  const handleSubmitTicket = () => {
      if (!proofImage || !reason) return;
      onAcknowledge();
      onVerifyTicket(proofImage, reason);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-black/95 backdrop-blur-xl">
        <AnimatePresence mode="wait">
            
            {/* --- WARNING VIEW --- */}
            {view === 'WARNING' && (
                <motion.div 
                    key="warning"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className={`bg-[#0a0a0a] border-2 w-full max-w-md rounded-2xl p-6 shadow-[0_0_100px_rgba(220,38,38,0.6)] text-center relative overflow-hidden ${isCritical ? 'border-red-600' : 'border-orange-500'}`}
                >
                    <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(220,38,38,0.05)_10px,rgba(220,38,38,0.05)_20px)] pointer-events-none" />
                    
                    <div className="relative z-10">
                        <div className="flex justify-center mb-6">
                            <div className="relative">
                                <div className="absolute inset-0 bg-red-500 blur-xl opacity-20 animate-pulse" />
                                <ShieldAlert size={64} className={`${isCritical ? "text-red-600 animate-pulse" : "text-orange-500"} relative z-10`} />
                            </div>
                        </div>

                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-2 font-mono">
                            {isCritical ? "XP HEMORRHAGE" : "INTEGRITY VIOLATION"}
                        </h2>
                        
                        {/* 8-Segment Bar */}
                        <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl mb-6">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">System Tolerance</span>
                                <span className={`text-xs font-black ${isCritical ? 'text-red-500' : 'text-orange-500'}`}>{currentStrikeCount} / 8</span>
                            </div>
                            <div className="flex gap-1 h-2">
                                {Array.from({ length: 8 }).map((_, i) => (
                                    <div 
                                        key={i} 
                                        className={`flex-1 rounded-sm ${i < currentStrikeCount ? (i >= 5 ? 'bg-red-600 shadow-[0_0_5px_red]' : 'bg-orange-500') : 'bg-gray-800'}`}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className={`space-y-4 text-xs font-mono leading-relaxed text-left border-l-2 pl-4 py-2 mb-8 bg-gradient-to-r from-gray-900/50 to-transparent ${isCritical ? 'border-red-600 text-red-200' : 'border-orange-500 text-orange-200'}`}>
                            <p>
                                <strong className="text-white flex items-center gap-2 mb-1"><AlertTriangle size={12}/> ANOMALY DETECTED</strong>
                                {warningMessage}
                            </p>
                            {penaltyText && (
                                <p className="text-red-500 font-black mt-2 animate-pulse uppercase tracking-wider">
                                    {penaltyText}
                                </p>
                            )}
                            {!isCritical && (
                                <p className="text-orange-400 font-bold mt-2">
                                    Continued violations will result in XP LOSS & DE-LEVELING.
                                </p>
                            )}
                        </div>

                        <div className="space-y-3">
                            <button 
                                onClick={onAcknowledge}
                                className={`w-full py-4 text-black font-black uppercase tracking-widest rounded-xl hover:bg-white transition-all shadow-[0_0_20px_rgba(220,38,38,0.4)] flex items-center justify-center gap-2 group ${isCritical ? 'bg-red-600' : 'bg-orange-500'}`}
                            >
                                <CheckCircle size={18} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
                                {isCritical ? "ACCEPT PENALTY" : "I ACKNOWLEDGE"}
                            </button>
                            
                            <button 
                                onClick={() => setView('TICKET')}
                                className="w-full py-3 bg-transparent border border-gray-800 text-gray-400 font-bold uppercase tracking-widest rounded-xl hover:border-white hover:text-white transition-all flex items-center justify-center gap-2 text-xs"
                            >
                                SUBMIT APPEAL TICKET
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* --- TICKET VIEW (Unchanged logic, just style tweaks if needed) --- */}
            {view === 'TICKET' && (
                <motion.div 
                    key="ticket"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-[#0a0a0a] border border-gray-800 w-full max-w-md rounded-2xl p-6 shadow-2xl relative"
                >
                    <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
                        <h2 className="text-xl font-bold text-white font-mono flex items-center gap-2">
                            <Eye className="text-system-neon" /> FORENSIC APPEAL
                        </h2>
                        <button onClick={() => setView('WARNING')} className="text-gray-500 hover:text-white"><X size={20} /></button>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2 block">1. Defense Statement</label>
                            <select 
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className="w-full bg-black border border-gray-800 rounded-lg p-3 text-white text-xs font-mono focus:border-system-neon outline-none"
                            >
                                <option value="">Select Reason...</option>
                                <option value="I completed the task faster than estimated.">I completed the task faster than estimated.</option>
                                <option value="The timer was bugged.">The timer was bugged.</option>
                                <option value="I forgot to log it earlier.">I forgot to log it earlier.</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2 block">2. Visual Evidence</label>
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className={`w-full aspect-video border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors ${proofImage ? 'border-system-neon bg-black' : 'border-gray-800 bg-gray-900/50 hover:bg-gray-900 hover:border-gray-600'}`}
                            >
                                {proofImage ? (
                                    <img src={proofImage} alt="Proof" className="w-full h-full object-cover rounded-lg opacity-80" />
                                ) : (
                                    <>
                                        <Camera className="text-gray-500 mb-2" size={24} />
                                        <span className="text-[10px] text-gray-500 font-mono uppercase">Upload Proof (Selfie/Notes)</span>
                                    </>
                                )}
                            </div>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
                        </div>

                        <div className="bg-blue-900/20 border border-blue-500/30 p-3 rounded text-[10px] text-blue-300 font-mono leading-relaxed">
                            <strong className="text-blue-400">NOTE:</strong> The System AI (Gemini 3 Pro) will cross-reference this photo with your registered biometric profile. Deceptive imagery will result in immediate penalty escalation.
                        </div>

                        <button 
                            onClick={handleSubmitTicket}
                            disabled={!reason || !proofImage}
                            className="w-full py-4 bg-system-neon text-black font-black uppercase tracking-widest rounded-xl hover:bg-white transition-all shadow-[0_0_20px_rgba(0,210,255,0.4)] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            SUBMIT FOR REVIEW <Send size={16} />
                        </button>
                    </div>
                </motion.div>
            )}

        </AnimatePresence>
    </div>
  );
};

export default CheatWarningModal;
