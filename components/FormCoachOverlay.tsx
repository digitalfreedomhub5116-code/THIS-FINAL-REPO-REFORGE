/**
 * FormCoachOverlay.tsx — Live camera view with skeleton overlay, rep counter & form score
 * Replaces the video area in ActiveWorkoutPlayer when Form Coach is active.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, AlertTriangle, Zap, Eye, EyeOff } from 'lucide-react';
import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import type { FormCoachExercise } from '../lib/formCoachConfig';
import { RepDetector, drawSkeleton, type FormCoachState, type Point3D } from '../utils/poseEngine';
import { SpeechService } from '../utils/speechService';

interface FormCoachOverlayProps {
  exercise: FormCoachExercise;
  isActive: boolean; // true during WORK phase
  onStateChange?: (state: FormCoachState) => void;
}

const WASM_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';

const FormCoachOverlay: React.FC<FormCoachOverlayProps> = ({ exercise, isActive, onStateChange }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const detectorRef = useRef<RepDetector | null>(null);
  const rafRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);

  const [phase, setPhase] = useState<'LOADING' | 'CALIBRATING' | 'TRACKING' | 'ERROR'>('LOADING');
  const [state, setState] = useState<FormCoachState>({
    repCount: 0, repState: 'IDLE', currentAngle: 0, formScore: 100,
    currentViolations: [], repResults: [], isTracking: false, confidence: 0, landmarks: null,
  });
  const [errorMsg, setErrorMsg] = useState('');
  const [coachingToast, setCoachingToast] = useState<string | null>(null);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const prevRepCountRef = useRef(0);

  // Initialize MediaPipe + Camera
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        // 1. Init MediaPipe
        const vision = await FilesetResolver.forVisionTasks(WASM_CDN);
        const landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
        if (cancelled) return;
        landmarkerRef.current = landmarker;

        // 2. Start camera
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        // 3. Init rep detector
        detectorRef.current = new RepDetector(exercise);

        setPhase('CALIBRATING');
      } catch (err: any) {
        console.error('[FormCoach] Init error:', err);
        setErrorMsg(err?.message?.includes('NotAllowed')
          ? 'Camera access denied. Enable in Settings.'
          : err?.message || 'Failed to start Form Coach');
        setPhase('ERROR');
      }
    };

    init();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      landmarkerRef.current?.close();
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [exercise]);

  // Detection loop
  const detect = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const landmarker = landmarkerRef.current;
    const detector = detectorRef.current;

    if (!video || !canvas || !landmarker || !detector || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(detect);
      return;
    }

    const now = performance.now();
    const result = landmarker.detectForVideo(video, now);

    if (result.landmarks && result.landmarks.length > 0) {
      const lm = result.landmarks[0];
      const wlm = result.worldLandmarks?.[0];

      // Convert to our Point3D format
      const points: Point3D[] = lm.map((l, i) => ({
        x: l.x,
        y: l.y,
        z: wlm?.[i]?.z ?? l.z ?? 0,
        visibility: l.visibility ?? 0,
      }));

      // Process frame through rep detector
      const newState = detector.processFrame(points, now);
      setState(newState);
      onStateChange?.(newState);

      // Draw skeleton
      if (showSkeleton) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          drawSkeleton(ctx, points, canvas.width, canvas.height, newState.currentViolations);
        }
      }

      // Check for calibration → tracking transition
      if (phase === 'CALIBRATING' && newState.confidence > 0.75) {
        setPhase('TRACKING');
      }

      // Coaching toast (throttled)
      const alert = detector.getAlertViolation(now);
      if (alert) {
        setCoachingToast(alert.message);
        SpeechService.announceFormCorrection(alert.message);
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = setTimeout(() => setCoachingToast(null), 3000);
      }

      // Announce rep milestones
      if (newState.repCount > prevRepCountRef.current) {
        prevRepCountRef.current = newState.repCount;
        SpeechService.announceRepCounted(newState.repCount);
      }
    } else {
      // No person detected
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    rafRef.current = requestAnimationFrame(detect);
  }, [exercise, phase, showSkeleton, onStateChange]);

  // Start detection loop when camera is ready
  useEffect(() => {
    if (phase === 'CALIBRATING' || phase === 'TRACKING') {
      rafRef.current = requestAnimationFrame(detect);
    }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [phase, detect]);

  // Reset detector when exercise changes
  useEffect(() => {
    detectorRef.current?.reset();
  }, [exercise.name]);

  // Form score color
  const getScoreColor = (score: number) => {
    if (score >= 90) return '#22c55e';
    if (score >= 75) return '#facc15';
    if (score >= 50) return '#f59e0b';
    return '#ef4444';
  };

  const scoreColor = getScoreColor(state.formScore);

  if (phase === 'ERROR') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-black text-center p-6">
        <AlertTriangle size={48} className="text-red-500 mb-4" />
        <p className="text-sm text-gray-300 font-mono mb-2">FORM COACH ERROR</p>
        <p className="text-xs text-gray-500 font-mono">{errorMsg}</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      {/* Camera feed */}
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        style={{ transform: 'scaleX(-1)' }} // Mirror
        playsInline
        muted
        autoPlay
      />

      {/* Skeleton canvas overlay */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ transform: 'scaleX(-1)' }}
      />

      {/* Loading overlay */}
      <AnimatePresence>
        {phase === 'LOADING' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-20"
          >
            <div className="w-12 h-12 border-2 border-system-neon border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-xs text-gray-400 font-mono tracking-widest">INITIALIZING MOTION COACH...</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Calibration overlay */}
      <AnimatePresence>
        {phase === 'CALIBRATING' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-20 p-6"
          >
            {/* Body outline */}
            <div className="w-40 h-64 border-2 border-dashed border-system-neon/50 rounded-3xl flex items-center justify-center mb-4"
              style={{ boxShadow: '0 0 20px rgba(0,212,255,0.15)' }}>
              <Camera size={32} className="text-system-neon/50" />
            </div>

            <p className="text-sm font-bold text-white mb-2 text-center">Position yourself</p>
            <div className="space-y-1 text-center">
              {exercise.setupTips.map((tip, i) => (
                <p key={i} className="text-[10px] text-gray-400 font-mono">{tip}</p>
              ))}
            </div>

            {/* Confidence meter */}
            <div className="w-48 mt-4">
              <div className="flex justify-between text-[8px] font-mono text-gray-500 mb-1">
                <span>DETECTION</span>
                <span>{Math.round(state.confidence * 100)}%</span>
              </div>
              <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: state.confidence > 0.75 ? '#22c55e' : '#00d4ff' }}
                  animate={{ width: `${state.confidence * 100}%` }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HUD (only when tracking) */}
      {phase === 'TRACKING' && isActive && (
        <>
          {/* Rep counter — top left */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="absolute top-4 left-4 z-30"
          >
            <div className="bg-black/70 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-2 flex flex-col items-center"
              style={{ boxShadow: '0 0 20px rgba(0,0,0,0.5)' }}>
              <span className="text-[8px] text-gray-500 font-mono tracking-widest">REPS</span>
              <motion.span
                key={state.repCount}
                initial={{ scale: 1.4, color: '#00d4ff' }}
                animate={{ scale: 1, color: '#ffffff' }}
                className="text-3xl font-black font-mono leading-none"
              >
                {state.repCount}
              </motion.span>
            </div>
          </motion.div>

          {/* Form score — top right */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="absolute top-4 right-4 z-30"
          >
            <div className="bg-black/70 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-2 flex flex-col items-center"
              style={{ boxShadow: '0 0 20px rgba(0,0,0,0.5)' }}>
              <span className="text-[8px] text-gray-500 font-mono tracking-widest">FORM</span>
              <span className="text-2xl font-black font-mono leading-none" style={{ color: scoreColor }}>
                {state.formScore}%
              </span>
              {/* Mini progress bar */}
              <div className="w-12 h-1 bg-gray-800 rounded-full mt-1 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${state.formScore}%`, background: scoreColor }} />
              </div>
            </div>
          </motion.div>

          {/* Skeleton toggle — bottom left */}
          <button
            onClick={() => setShowSkeleton(!showSkeleton)}
            className="absolute bottom-4 left-4 z-30 w-8 h-8 bg-black/50 backdrop-blur border border-white/10 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            {showSkeleton ? <Eye size={14} /> : <EyeOff size={14} />}
          </button>

          {/* Coaching toast — bottom center */}
          <AnimatePresence>
            {coachingToast && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-xl bg-red-500/20 border border-red-500/40 backdrop-blur-md"
              >
                <p className="text-xs font-bold text-red-300 text-center font-mono">
                  ⚠️ {coachingToast}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form Coach badge — bottom right */}
          <div className="absolute bottom-4 right-4 z-30 flex items-center gap-1.5 bg-black/50 backdrop-blur border border-system-neon/30 rounded-full px-2.5 py-1">
            <Zap size={10} className="text-system-neon" />
            <span className="text-[8px] font-mono font-bold text-system-neon tracking-wider">MOTION COACH</span>
          </div>
        </>
      )}
    </div>
  );
};

export default FormCoachOverlay;
