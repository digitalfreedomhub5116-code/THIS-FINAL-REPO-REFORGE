import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Zap, Swords, Lock, RefreshCw, Key } from 'lucide-react';
import FormCoachOverlay from './FormCoachOverlay';
import { playSystemSoundEffect } from '../utils/soundEngine';
import { showSystemToast } from './SystemToast';
import { findFormCoachExercise } from '../lib/formCoachConfig';

interface DungeonLockScreenProps {
  packageName: string;
  appName: string;
  requiredReps: number;
  playerData: any;
  onConsumeKey: () => Promise<boolean>;
  onClose: () => void;
}

const STYLES_ID = 'dls-component-styles';

const STYLES_CSS = `
.dls-hsw-wrapper {
  position: relative;
  width: 100%;
  max-width: 380px;
  margin: 0 auto;
  aspect-ratio: 2400 / 1792;
  user-select: none;
  font-family: 'Rajdhani', 'Bai Jamjuree', monospace, sans-serif;
}
.dls-hsw-motion {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  will-change: transform, filter;
}
.dls-hsw-frame,
.dls-hsw-frame-fallback {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border-radius: 4px;
  pointer-events: none;
}
.dls-hsw-frame { object-fit: fill; opacity: 0; transition: opacity 280ms ease-out; }
.dls-hsw-frame.is-loaded { opacity: 1; }
.dls-hsw-frame-fallback {
  background: linear-gradient(180deg, #060d18 0%, #02060c 100%);
  border: 1.5px solid #00d4ff;
  box-shadow:
    0 0 20px rgba(0, 212, 255, 0.45),
    inset 0 0 16px rgba(0, 212, 255, 0.12);
}
.dls-hsw-frame-skeleton {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border-radius: 4px;
  pointer-events: none;
  background: linear-gradient(180deg, #060d18 0%, #02060c 100%);
  border: 1.5px solid rgba(0, 212, 255, 0.35);
  box-shadow:
    0 0 12px rgba(0, 212, 255, 0.18),
    inset 0 0 14px rgba(0, 212, 255, 0.06);
  overflow: hidden;
}
.dls-hsw-frame-skeleton::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    100deg,
    transparent 30%,
    rgba(0, 212, 255, 0.08) 50%,
    transparent 70%
  );
  background-size: 200% 100%;
  animation: dls-hsw-shimmer 1.4s linear infinite;
}
@keyframes dls-hsw-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
.dls-hsw-safezone {
  position: absolute;
  top: 14%;
  right: 5%;
  bottom: 12%;
  left: 5%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  padding: 18px 16px 14px;
  background: rgba(4, 10, 20, 0.55);
  backdrop-filter: blur(2px) saturate(110%);
  -webkit-backdrop-filter: blur(2px) saturate(110%);
  border-radius: 2px;
}
.dls-hsw-title-plate {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 4px 18px;
  background: rgba(4, 10, 20, 0.92);
  border: 1.5px solid #00d4ff;
  border-radius: 2px;
  box-shadow:
    0 0 10px rgba(0, 212, 255, 0.35),
    inset 0 0 8px rgba(0, 212, 255, 0.18);
  font-family: 'Rajdhani', 'Bai Jamjuree', sans-serif;
  font-weight: 700;
  font-size: 9px;
  letter-spacing: 0.32em;
  color: #ffffff;
  text-shadow: 0 0 6px rgba(0, 212, 255, 0.55);
  white-space: nowrap;
  z-index: 2;
}
`;

function ensureStylesInjected(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLES_ID)) return;
  const style = document.createElement('style');
  style.id = STYLES_ID;
  style.textContent = STYLES_CSS;
  document.head.appendChild(style);
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

  const [frameLoaded, setFrameLoaded] = useState(true);
  const [frameReady, setFrameReady] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    ensureStylesInjected();
  }, []);

  useEffect(() => {
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth > 0) {
      setFrameReady(true);
    }
  }, []);

  // Load real push-up configuration from FormCoach Config
  const PUSHUP_EXERCISE = findFormCoachExercise('Push-Up')!;

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

  // Holographic window opening states matching status window unfold
  const entrancePanel = {
    scaleY: [0.02, 0.02, 1],
    opacity: [0.85, 1, 1],
  };
  const entrancePanelTransition = {
    duration: 0.8,
    times: [0, 0.35, 1],
    ease: [0.22, 1, 0.36, 1] as const,
  };

  const entranceContent = { opacity: [0, 0, 1] };
  const entranceContentTransition = { duration: 0.9, times: [0, 0.55, 1], ease: 'easeOut' as const };

  const floatAnim = {
    y: [0, -3, 0, 3, 0],
    filter: [
      'drop-shadow(0 0 15px rgba(0, 212, 255, 0.22))',
      'drop-shadow(0 0 25px rgba(0, 212, 255, 0.45))',
      'drop-shadow(0 0 15px rgba(0, 212, 255, 0.22))',
    ],
  };
  const floatTransition = { duration: 6, repeat: Infinity, ease: 'easeInOut' as const };

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

      {/* Spacing top */}
      <div className="h-6" />

      {/* Center Camera Workspace or Lockdown Screen */}
      <div className="flex-1 w-full max-w-sm mx-auto flex items-center justify-center my-6">
        <AnimatePresence mode="wait">
          {!showCamera ? (
            <motion.div
              className="dls-hsw-wrapper"
              initial={{ scaleY: 0.02, opacity: 0.85 }}
              animate={entrancePanel}
              transition={entrancePanelTransition}
              style={{ transformOrigin: '50% 50%' }}
            >
              {/* Scan Line unfolding laser */}
              <motion.div
                aria-hidden="true"
                initial={{ scaleX: 0, opacity: 0.9 }}
                animate={{ scaleX: [0, 1, 1], opacity: [0.9, 0.9, 0] }}
                transition={{ duration: 0.55, times: [0, 0.6, 1], ease: 'easeOut' }}
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: '50%',
                  height: 2,
                  transform: 'translateY(-50%)',
                  transformOrigin: '50% 50%',
                  background:
                    'linear-gradient(90deg, transparent 0%, rgba(0, 212, 255, 0.95) 50%, transparent 100%)',
                  boxShadow:
                    '0 0 14px rgba(0, 212, 255, 0.85), 0 0 28px rgba(0, 212, 255, 0.45)',
                  pointerEvents: 'none',
                  zIndex: 3,
                }}
              />

              {/* Floating inner content wrapper */}
              <motion.div
                style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
                animate={floatAnim}
                transition={floatTransition}
              >
                <motion.div
                  style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
                  initial={{ opacity: 0 }}
                  animate={entranceContent}
                  transition={entranceContentTransition}
                >
                  {/* Status Frame Image / Fallback */}
                  {frameLoaded ? (
                    <>
                      {!frameReady && <div className="dls-hsw-frame-skeleton" aria-hidden="true" />}
                      <img
                        ref={imgRef}
                        className={`dls-hsw-frame${frameReady ? ' is-loaded' : ''}`}
                        src="/assets/status-frame.jpg"
                        alt=""
                        aria-hidden="true"
                        draggable={false}
                        decoding="async"
                        loading="eager"
                        onLoad={() => setFrameReady(true)}
                        onError={() => { setFrameLoaded(false); setFrameReady(true); }}
                      />
                    </>
                  ) : (
                    <div className="dls-hsw-frame-fallback" aria-hidden="true" />
                  )}

                  {/* Content safe zone overlay */}
                  <div className="dls-hsw-safezone">
                    <div className="dls-hsw-title-plate">SYSTEM LOCKDOWN</div>

                    {/* Exceeded limit warning text (written directly, no typewriter animation) */}
                    <div className="flex-1 flex flex-col justify-center items-center text-center px-2">
                      <p className="text-[12px] md:text-sm font-bold tracking-wide text-white font-mono leading-relaxed">
                        <span className="text-[#00d4ff] font-extrabold uppercase">{appName}</span> has exceeded the limit.
                      </p>
                      <p className="text-[10px] md:text-[11px] text-gray-400 font-mono mt-2 leading-relaxed">
                        Complete the dungeon to unlock the access.
                      </p>
                    </div>

                    {/* Unlock Button */}
                    <button
                      onClick={() => {
                        playSystemSoundEffect('SELECT');
                        setShowCamera(true);
                      }}
                      className="w-full py-2.5 bg-[#00d4ff] hover:bg-[#00d4ff]/90 text-black text-[11px] font-black font-mono uppercase tracking-wider rounded border border-[#00d4ff] shadow-[0_0_15px_rgba(0,212,255,0.3)] transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
                    >
                      <Swords className="w-3.5 h-3.5" /> Enter Dungeon
                    </button>
                  </div>
                </motion.div>
              </motion.div>
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
        
        {/* Refined Mana Key Emergency Bypass */}
        <div className="w-full bg-gray-950/60 border border-purple-500/20 rounded-xl px-4 py-3.5 flex items-center justify-between shadow-[0_0_15px_rgba(168,85,247,0.05)] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-950/10 to-transparent pointer-events-none" />
          
          <div className="flex-1 flex items-center gap-3 relative z-10">
            <div className="p-2 bg-purple-500/10 border border-purple-500/30 rounded-lg">
              <Key className="w-4 h-4 text-purple-400 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] text-gray-300 font-mono font-bold tracking-wider uppercase block">
                Mana Key Bypass
              </span>
              <p className="text-[8.5px] text-purple-400/80 font-mono mt-0.5">
                Cost: 1 Key for 15m bypass
              </p>
            </div>
          </div>

          <button
            onClick={handleShadowBypass}
            disabled={bypassLoading || clearing}
            className={`relative z-10 px-3.5 py-2 border rounded-lg text-[10px] font-black font-mono tracking-wider transition-all uppercase flex items-center gap-1.5 active:scale-95 ${
              (playerData?.keys ?? 0) < 1
                ? 'border-gray-800 bg-gray-900/40 text-gray-500 cursor-not-allowed'
                : 'border-purple-500 bg-purple-500/10 hover:bg-purple-500/25 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.2)]'
            }`}
          >
            {bypassLoading ? (
              <Zap className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <>Use Key <span className="text-white font-sans font-bold">({playerData?.keys ?? 0})</span></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
