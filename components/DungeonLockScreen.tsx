import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Zap, Swords, Lock, RefreshCw, Key } from 'lucide-react';
import FormCoachOverlay from './FormCoachOverlay';
import { playSystemSoundEffect } from '../utils/soundEngine';
import { showSystemToast } from './SystemToast';

interface DungeonLockScreenProps {
  packageName: string;
  appName: string;
  requiredReps: number;
  playerData: any;
  onConsumeKey: () => Promise<boolean>;
  onClose: () => void;
}

export default function DungeonLockScreen({
  packageName,
  appName,
  requiredReps = 20,
  playerData,
  onConsumeKey,
  onClose,
}: DungeonLockScreenProps) {
  const [showCamera, setShowCamera] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [repCount, setRepCount] = useState(0);
  const [bypassLoading, setBypassLoading] = useState(false);

  // Focus Shield pushup exercise definition for MediaPipe FormCoach
  const PUSHUP_EXERCISE = {
    name: 'Push-ups',
    sets: 1,
    reps: requiredReps.toString(),
    duration: 300,
    setupTips: [
      'Place device on the floor or lean it securely.',
      'Align your full body in the camera frame.',
      'Lower chest fully and extend arms on reps.'
    ]
  } as any;

  const handleDungeonClear = async () => {
    if (clearing) return;
    setClearing(true);
    playSystemSoundEffect('LEVEL_UP');

    try {
      const plugin = (window as any).Capacitor?.Plugins?.TrackingPlugin;
      if (plugin) {
        // Unlock monitored app for 60 minutes
        await plugin.grantBypass({ packageName, durationMinutes: 60 });
        await plugin.clearActiveLockdown();
        
        showSystemToast({
          type: 'SUCCESS',
          title: 'Dungeon Cleared!',
          subtitle: `Unlocked ${appName} for 60 minutes.`,
          durationMs: 4500
        });

        // Minimize app to return user back to their active screen
        setTimeout(async () => {
          await plugin.minimizeApp();
          onClose();
        }, 1500);
      } else {
        onClose();
      }
    } catch (e) {
      console.error('Failed to clear lockdown', e);
      onClose();
    }
  };

  const handleShadowBypass = async () => {
    if (bypassLoading || clearing) return;

    if (!playerData || (playerData.keys ?? 0) < 1) {
      playSystemSoundEffect('DEBUFF_CAST');
      showSystemToast({
        type: 'WARNING',
        title: 'Bypass Failed',
        subtitle: 'Insufficient Mana Keys in your inventory.',
        durationMs: 4000
      });
      return;
    }

    setBypassLoading(true);
    playSystemSoundEffect('PURCHASE');

    try {
      const success = await onConsumeKey();
      if (success) {
        const plugin = (window as any).Capacitor?.Plugins?.TrackingPlugin;
        if (plugin) {
          // Grant 15 minute temporary bypass
          await plugin.grantBypass({ packageName, durationMinutes: 15 });
          await plugin.clearActiveLockdown();

          showSystemToast({
            type: 'QUEST_FORGED',
            title: 'Shadow Extraction Active',
            subtitle: `Shield bypassed on ${appName} for 15 minutes.`,
            durationMs: 4000
          });

          setTimeout(async () => {
            await plugin.minimizeApp();
            onClose();
          }, 1000);
        } else {
          onClose();
        }
      } else {
        setBypassLoading(false);
      }
    } catch (e) {
      console.error('Failed to deduct key or grant bypass', e);
      setBypassLoading(false);
    }
  };

  const handlePoseStateChange = (state: any) => {
    setRepCount(state.repCount);
    if (state.repCount >= requiredReps) {
      handleDungeonClear();
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col justify-between p-6 select-none overflow-hidden">
      {/* Background RPG Atmosphere Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-950/20 via-black to-black opacity-90 -z-10 pointer-events-none" />
      <div 
        className="absolute inset-0 -z-10 opacity-5 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
          backgroundSize: '24px 24px'
        }}
      />

      {/* Header Warning Banner */}
      <div className="w-full flex flex-col items-center text-center mt-6">
        <div className="p-2 border border-red-500/30 bg-red-500/10 rounded-xl mb-4 animate-pulse">
          <ShieldAlert className="w-6 h-6 text-red-500" />
        </div>
        <h1 className="text-[10px] font-black font-mono uppercase tracking-[0.3em] text-red-500">
          Focus Shield Quarantine
        </h1>
        <div className="h-px w-24 bg-red-500/30 my-3" />
        <p className="text-xs text-gray-400 max-w-xs leading-relaxed font-mono">
          <span className="text-white font-bold">{appName}</span> has exceeded your configured daily focus limit. 
          Complete the active dungeon to restore access.
        </p>
      </div>

      {/* Center Camera Workspace or Lockdown Screen */}
      <div className="flex-1 w-full max-w-sm mx-auto flex items-center justify-center my-6">
        <AnimatePresence mode="wait">
          {!showCamera ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full flex flex-col items-center p-6 bg-gray-950/50 border border-gray-900 rounded-2xl relative"
            >
              {/* Outer tech circles */}
              <div className="w-24 h-24 rounded-full border border-gray-800 flex items-center justify-center relative mb-4">
                <Lock className="w-6 h-6 text-gray-500" />
                <motion.div 
                  className="absolute inset-0 rounded-full border border-dashed border-[#00d4ff]/30"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
                />
              </div>

              <span className="text-[9px] font-bold font-mono text-gray-500 uppercase tracking-widest">DUNGEON CLEAR QUEST</span>
              <h2 className="text-lg font-black text-white uppercase tracking-wider mt-1">{requiredReps} PUSH-UPS</h2>
              
              <p className="text-[10px] text-gray-500 text-center font-mono mt-2 leading-normal max-w-[200px]">
                Requires live camera tracking via Front Camera. Correct reps will be automatically counted.
              </p>

              <button
                onClick={() => { playSystemSoundEffect('SELECT'); setShowCamera(true); }}
                className="mt-6 w-full py-3 bg-[#00d4ff] hover:bg-[#00d4ff]/90 text-black text-xs font-black font-mono uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(0,212,255,0.25)] flex items-center justify-center gap-2"
              >
                <Swords className="w-4 h-4" /> Enter Dungeon
              </button>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full h-80 border border-gray-900 rounded-2xl overflow-hidden relative"
            >
              {clearing ? (
                <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-40 text-center p-6">
                  <div className="w-12 h-12 border-2 border-system-success border-t-transparent rounded-full animate-spin mb-4" />
                  <span className="text-[9px] font-black font-mono text-system-success tracking-widest uppercase">SYSTEM RESPONSE</span>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider mt-1">Dungeon Cleared</h3>
                  <p className="text-[10px] text-gray-500 mt-1 font-mono">Restoring device state...</p>
                </div>
              ) : (
                <FormCoachOverlay 
                  exercise={PUSHUP_EXERCISE}
                  isActive={true}
                  onStateChange={handlePoseStateChange}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Controls & Emergency Bypass */}
      <div className="w-full max-w-sm mx-auto flex flex-col items-center gap-4 mb-6">
        <div className="w-full h-px bg-gray-900/60" />
        
        {/* Mana Key Shadow Extraction Bypass */}
        <div className="w-full bg-gray-950/40 border border-gray-900/60 rounded-xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-lg text-purple-400">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-[10px] font-bold text-white font-mono uppercase tracking-wide">Shadow Extraction</h4>
              <p className="text-[9px] text-gray-500 font-mono mt-0.5">
                Bypass shield for 15 mins (Cost: 1 Key)
              </p>
            </div>
          </div>

          <button
            onClick={handleShadowBypass}
            disabled={bypassLoading || clearing}
            className={`px-3 py-2 border rounded-xl text-[9px] font-bold font-mono tracking-wider transition-all uppercase flex items-center gap-1.5 ${
              (playerData?.keys ?? 0) < 1
                ? 'border-gray-950 bg-gray-900/40 text-gray-600 cursor-not-allowed'
                : 'border-purple-500/40 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400'
            }`}
          >
            {bypassLoading ? (
              <Zap className="w-3 h-3 animate-spin" />
            ) : (
              <>Use Key <span className="font-sans text-[8px] font-black">({playerData?.keys ?? 0})</span></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
