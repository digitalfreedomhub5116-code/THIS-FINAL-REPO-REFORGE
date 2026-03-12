import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera, ScanFace, ShieldCheck, AlertTriangle,
  RefreshCw, CheckCircle, Lock, ChevronRight, X
} from 'lucide-react';

interface AvatarGeneratorProps {
  playerId: string;
  gender?: string;
  onComplete: (avatarUrl: string, originalUrl: string) => void;
}

type Phase = 'UPLOAD' | 'VALIDATING' | 'GENERATING' | 'COMPLETE' | 'ERROR' | 'SAVING';

interface ValidationResult {
  valid: boolean;
  hasFace: boolean;
  isAIGenerated: boolean;
  isClear: boolean;
  detectedGender?: string;
  reason: string;
}

const GLASS_BG = {
  background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(8,8,20,0.88) 14%, rgba(4,4,14,0.96) 100%)',
  backdropFilter: 'blur(24px) saturate(180%)',
};

const compressImage = (base64Str: string, maxWidth = 512, quality = 0.82): Promise<string> =>
  new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ratio = maxWidth / img.width;
      const w = ratio < 1 ? maxWidth : img.width;
      const h = ratio < 1 ? img.height * ratio : img.height;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } else {
        resolve(base64Str);
      }
    };
    img.onerror = () => resolve(base64Str);
  });

const StatusRow: React.FC<{ label: string; state: 'waiting' | 'active' | 'done' | 'failed' }> = ({ label, state }) => {
  const colors = { waiting: 'text-gray-600', active: 'text-system-neon', done: 'text-green-400', failed: 'text-red-400' };
  return (
    <div className={`flex items-center gap-3 text-[11px] font-mono uppercase tracking-widest ${colors[state]}`}>
      <div className="w-4 flex-shrink-0">
        {state === 'waiting' && <div className="w-1.5 h-1.5 rounded-full bg-current mx-auto opacity-40" />}
        {state === 'active' && <RefreshCw size={12} className="animate-spin" />}
        {state === 'done' && <CheckCircle size={12} />}
        {state === 'failed' && <X size={12} />}
      </div>
      {label}
    </div>
  );
};

const ScanOverlay: React.FC = () => (
  <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
    <motion.div
      className="absolute inset-x-0 h-[2px]"
      style={{ background: 'linear-gradient(90deg, transparent, rgba(0,210,255,0.8), transparent)', top: 0 }}
      animate={{ y: [0, 500] }}
      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
    />
    <div
      className="absolute inset-0 rounded-2xl"
      style={{ border: '1px solid rgba(0,210,255,0.3)', boxShadow: 'inset 0 0 30px rgba(0,210,255,0.08)' }}
    />
  </div>
);

const AvatarGenerator: React.FC<AvatarGeneratorProps> = ({ playerId, gender, onComplete }) => {
  const [phase, setPhase] = useState<Phase>('UPLOAD');
  const [selfie, setSelfie] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [validationStep, setValidationStep] = useState<'waiting' | 'active' | 'done' | 'failed'>('waiting');
  const [forgeStep, setForgeStep] = useState<'waiting' | 'active' | 'done' | 'failed'>('waiting');
  const [error, setError] = useState<{ title: string; body: string; canRetry: boolean } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setSelfie(reader.result as string);
      setAvatar(null);
      setError(null);
      setPhase('UPLOAD');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSynthesize = async () => {
    if (!selfie) return;
    setPhase('VALIDATING');
    setValidationStep('active');
    setForgeStep('waiting');
    setError(null);

    try {
      const compressed = await compressImage(selfie, 512, 0.82);

      // Step 1: Validate
      const valRes = await fetch('/api/avatar/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: compressed, mimeType: 'image/jpeg' })
      });
      const valData: ValidationResult = await valRes.json();

      if (!valData.valid) {
        setValidationStep('failed');
        const isAI = valData.isAIGenerated;
        const noFace = !valData.hasFace;
        const serviceDown = /unavailable|retry|error/i.test(valData.reason || '');
        setPhase('ERROR');
        setError({
          title: isAI
            ? 'AI-Generated Image Detected'
            : serviceDown
              ? 'Scan Unavailable'
              : noFace
                ? 'No Human Face Detected'
                : 'Not a Human Photo',
          body: isAI
            ? 'Our scanner detected this image was AI-generated or is not a real photograph. Please upload an actual selfie.'
            : serviceDown
              ? valData.reason || 'The scan service is temporarily unavailable. Please retry in a moment.'
              : noFace
                ? 'No clear human face was found. Make sure your face is centred, well-lit and facing forward.'
                : 'This image does not appear to be a real photograph of a human person. Please upload a selfie — photos of animals, objects, or illustrations are not accepted.',
          canRetry: true,
        });
        return;
      }

      setValidationStep('done');
      setPhase('GENERATING');
      setForgeStep('active');

      // Step 2: Generate avatar — pass detected gender from the photo alongside profile gender
      const genRes = await fetch('/api/avatar/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: compressed,
          mimeType: 'image/jpeg',
          gender,
          detectedGender: valData.detectedGender,
        })
      });
      const genData = await genRes.json();

      if (genData.avatarBase64) {
        const optimised = await compressImage(genData.avatarBase64, 400, 0.85);
        setAvatar(optimised);
        setForgeStep('done');
        setPhase('COMPLETE');
      } else {
        // USE_ORIGINAL fallback
        const fallback = await compressImage(selfie, 400, 0.75);
        setAvatar(fallback);
        setForgeStep('done');
        setPhase('COMPLETE');
      }
    } catch (err: any) {
      console.error('[AvatarGenerator]', err);
      setValidationStep('failed');
      setForgeStep('failed');
      setPhase('ERROR');
      setError({ title: 'Connection Error', body: 'Failed to reach the synthesis server. Check your connection and try again.', canRetry: true });
    }
  };

  const handleConfirm = async () => {
    if (!avatar || !selfie) return;
    setPhase('SAVING');
    try {
      const compOriginal = await compressImage(selfie, 300, 0.65);
      if (playerId && !playerId.startsWith('local-')) {
        await fetch('/api/avatar/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId, avatarUrl: avatar, originalSelfieUrl: compOriginal })
        });
      }
      onComplete(avatar, compOriginal);
    } catch (err) {
      console.error('[AvatarGenerator save]', err);
      // Still complete even if save fails — local state has it
      const compOriginal = await compressImage(selfie, 300, 0.65);
      onComplete(avatar, compOriginal);
    }
  };

  const handleRetry = () => {
    setSelfie(null);
    setAvatar(null);
    setError(null);
    setValidationStep('waiting');
    setForgeStep('waiting');
    setPhase('UPLOAD');
  };

  const isProcessing = phase === 'VALIDATING' || phase === 'GENERATING';

  return (
    <div className="fixed inset-0 z-[200] bg-[#02020a] flex items-center justify-center p-3 font-mono">
      {/* Ambient grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: 'linear-gradient(rgba(0,210,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,210,255,0.06) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 60%, rgba(0,60,120,0.18) 0%, transparent 70%)' }}
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-md flex flex-col rounded-3xl overflow-hidden"
        style={{
          ...GLASS_BG,
          border: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '0 0 60px rgba(0,0,0,0.9), 0 0 1px rgba(0,210,255,0.15)',
          maxHeight: 'calc(100dvh - 1.5rem)',
        }}
      >
        {/* Header — pinned, never scrolls */}
        <div
          className="flex-shrink-0 px-5 pt-5 pb-4 border-b"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(0,210,255,0.08)', border: '1px solid rgba(0,210,255,0.2)' }}
            >
              <ScanFace size={18} className="text-system-neon" />
            </div>
            <div>
              <div className="text-white font-black text-sm uppercase tracking-tight">Avatar Synthesis</div>
              <div className="text-[9px] text-gray-500 tracking-[0.2em] uppercase mt-0.5">
                {phase === 'UPLOAD' && 'Phase 1 · Identity Registration'}
                {phase === 'VALIDATING' && 'Phase 2 · Biometric Scan'}
                {phase === 'GENERATING' && 'Phase 3 · Hunter Forge'}
                {phase === 'COMPLETE' && 'Phase 4 · Profile Ready'}
                {phase === 'ERROR' && 'Scan Rejected'}
                {phase === 'SAVING' && 'Integrating...'}
              </div>
            </div>
          </div>
        </div>

        {/* Body — scrollable so content never pushes the button off-screen */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <AnimatePresence mode="wait">

            {/* ── UPLOAD phase ─────────────────────────────────────── */}
            {(phase === 'UPLOAD') && (
              <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Upload a clear selfie to register your hunter identity. Your likeness will be transformed into a Solo Leveling-style avatar — your face will not be recognizable.
                </p>

                {selfie ? (
                  // Image preview
                  <div className="relative rounded-2xl overflow-hidden" style={{ aspectRatio: '1/1', maxHeight: '52vw' }}>
                    <img src={selfie} alt="Selfie preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-3 right-3 text-[10px] uppercase tracking-widest font-black px-3 py-1.5 rounded-lg transition-all hover:scale-105"
                      style={{ background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.2)', color: 'white' }}
                    >
                      Change
                    </button>
                    <div
                      className="absolute top-3 left-3 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded"
                      style={{ background: 'rgba(0,210,255,0.15)', border: '1px solid rgba(0,210,255,0.3)', color: '#00d2ff' }}
                    >
                      Ready
                    </div>
                  </div>
                ) : (
                  // Empty upload zone
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="relative w-full rounded-2xl flex flex-col items-center justify-center gap-3 transition-all hover:border-system-neon/40 group"
                    style={{
                      border: '2px dashed rgba(255,255,255,0.1)',
                      background: 'rgba(255,255,255,0.02)',
                      minHeight: '140px',
                      maxHeight: '200px',
                      height: '40vw',
                    }}
                  >
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(0,210,255,0.06)', border: '1px solid rgba(0,210,255,0.15)' }}
                    >
                      <Camera size={28} className="text-gray-500 group-hover:text-system-neon transition-colors" />
                    </div>
                    <div className="text-center">
                      <div className="text-[12px] font-black uppercase tracking-widest text-white">Upload Selfie</div>
                      <div className="text-[10px] text-gray-600 mt-1">Face forward · Well lit · No filters</div>
                    </div>
                  </button>
                )}

                {/* Privacy badge */}
                <div
                  className="flex items-start gap-2.5 rounded-xl p-3"
                  style={{ background: 'rgba(0,210,255,0.04)', border: '1px solid rgba(0,210,255,0.1)' }}
                >
                  <Lock size={12} className="text-system-neon flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] text-gray-400 leading-relaxed">
                    Your face will be completely stylized into manhwa art. No recognizable features will remain. Original photo is stored privately and used only for AI generation.
                  </p>
                </div>

                {/* Requirements */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Real photo', ok: true },
                    { label: 'Face visible', ok: true },
                    { label: 'No AI art', ok: true },
                  ].map(item => (
                    <div
                      key={item.label}
                      className="flex items-center gap-1.5 rounded-lg px-2 py-1.5"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <CheckCircle size={10} className="text-green-400 flex-shrink-0" />
                      <span className="text-[9px] text-gray-400 font-mono">{item.label}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── PROCESSING phases ─────────────────────────────────── */}
            {(isProcessing) && (
              <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">

                {/* Selfie with scan overlay */}
                <div className="relative rounded-2xl overflow-hidden" style={{ aspectRatio: '1/1', maxHeight: '52vw' }}>
                  {selfie && (
                    <img
                      src={selfie}
                      alt="Scanning"
                      className="w-full h-full object-cover"
                      style={{ filter: 'grayscale(60%) brightness(0.7)' }}
                    />
                  )}
                  <ScanOverlay />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div
                      className="px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest text-system-neon"
                      style={{ background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(0,210,255,0.3)' }}
                    >
                      {phase === 'VALIDATING' ? 'Scanning Identity...' : 'Forging Avatar...'}
                    </div>
                  </div>
                </div>

                {/* Step list */}
                <div
                  className="rounded-xl p-4 space-y-3"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <StatusRow
                    label="Biometric validation"
                    state={phase === 'VALIDATING' ? 'active' : validationStep === 'done' ? 'done' : 'waiting'}
                  />
                  <StatusRow
                    label="AI-generation detection"
                    state={phase === 'VALIDATING' ? 'active' : validationStep === 'done' ? 'done' : 'waiting'}
                  />
                  <StatusRow
                    label="Hunter forge synthesis"
                    state={phase === 'GENERATING' ? 'active' : forgeStep === 'done' ? 'done' : 'waiting'}
                  />
                </div>

                <p className="text-[10px] text-gray-500 text-center">
                  {phase === 'VALIDATING' ? 'Verifying your identity...' : 'Generating your Solo Leveling avatar. This may take 30–60 seconds.'}
                </p>
              </motion.div>
            )}

            {/* ── COMPLETE phase ────────────────────────────────────── */}
            {phase === 'COMPLETE' && (
              <motion.div key="complete" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
                <div className="flex items-center gap-2 text-green-400">
                  <CheckCircle size={16} />
                  <span className="text-[11px] font-black uppercase tracking-widest">Hunter Avatar Forged</span>
                </div>

                {/* Avatar result */}
                <div
                  className="relative rounded-2xl overflow-hidden"
                  style={{
                    aspectRatio: '1/1',
                    maxHeight: '52vw',
                    border: '1.5px solid rgba(0,210,255,0.3)',
                    boxShadow: '0 0 40px rgba(0,210,255,0.12)',
                  }}
                >
                  {avatar && <img src={avatar} alt="Hunter Avatar" className="w-full h-full object-cover" />}
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{ background: 'linear-gradient(to top, rgba(0,210,255,0.12) 0%, transparent 40%)' }}
                  />
                  <div
                    className="absolute bottom-3 left-3 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded"
                    style={{ background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(0,210,255,0.4)', color: '#00d2ff' }}
                  >
                    Hunter Profile
                  </div>
                </div>

                {/* Before thumbnail */}
                <div className="flex items-center gap-3">
                  <div
                    className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0"
                    style={{ border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    {selfie && <img src={selfie} alt="Original" className="w-full h-full object-cover opacity-60 grayscale" />}
                  </div>
                  <ChevronRight size={14} className="text-gray-600 flex-shrink-0" />
                  <div className="text-[10px] text-gray-400 leading-relaxed">
                    Original selfie transformed. Your face is unrecognizable — only your energy remains.
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── ERROR phase ───────────────────────────────────────── */}
            {phase === 'ERROR' && error && (
              <motion.div key="error" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
                <div
                  className="rounded-2xl p-4 space-y-2"
                  style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}
                >
                  <div className="flex items-center gap-2 text-red-400">
                    <AlertTriangle size={14} />
                    <span className="text-[11px] font-black uppercase tracking-wider">{error.title}</span>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-relaxed pl-5">{error.body}</p>
                </div>

                {selfie && (
                  <div
                    className="relative rounded-xl overflow-hidden opacity-50"
                    style={{ aspectRatio: '1/1', maxHeight: '160px' }}
                  >
                    <img src={selfie} alt="Rejected" className="w-full h-full object-cover grayscale" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <X size={32} className="text-red-400 opacity-80" />
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── SAVING phase ─────────────────────────────────────── */}
            {phase === 'SAVING' && (
              <motion.div key="saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-8 flex flex-col items-center gap-4">
                <RefreshCw size={28} className="text-system-neon animate-spin" />
                <div className="text-[11px] text-gray-400 uppercase tracking-widest font-mono">Integrating Hunter Profile...</div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Footer — always pinned at bottom, never scrolls */}
        <div
          className="flex-shrink-0 px-5 pb-5 pt-2"
          style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
        >
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            capture="user"
            onChange={handleFileSelect}
          />

          {phase === 'UPLOAD' && (
            <button
              onClick={selfie ? handleSynthesize : () => fileInputRef.current?.click()}
              className="w-full py-3.5 rounded-2xl font-black uppercase tracking-widest text-[12px] transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #00d2ff, #0070ff)',
                color: 'black',
                boxShadow: '0 0 20px rgba(0,210,255,0.3)',
              }}
            >
              <ScanFace size={16} />
              GENERATE AVATAR
            </button>
          )}

          {isProcessing && (
            <div className="w-full py-3.5 rounded-2xl text-center text-[11px] font-black uppercase tracking-widest text-gray-600"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
            >
              <RefreshCw size={14} className="inline animate-spin mr-2" />
              Processing...
            </div>
          )}

          {phase === 'COMPLETE' && (
            <button
              onClick={handleConfirm}
              className="w-full py-3.5 rounded-2xl font-black uppercase tracking-widest text-[12px] transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #00d2ff, #0070ff)',
                color: 'black',
                boxShadow: '0 0 24px rgba(0,210,255,0.35)',
              }}
            >
              <ShieldCheck size={16} />
              CONFIRM AVATAR
            </button>
          )}

          {phase === 'ERROR' && error?.canRetry && (
            <button
              onClick={handleRetry}
              className="w-full py-3.5 rounded-2xl font-black uppercase tracking-widest text-[12px] transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)',
                color: '#f87171',
              }}
            >
              Try Again
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default AvatarGenerator;
