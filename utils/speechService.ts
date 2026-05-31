// Speech Synthesis Service for System AI.
//
// Two paths:
//   - Native (Capacitor) → @capacitor-community/text-to-speech, which uses
//     the Android TextToSpeech Java API. This is what makes voice prompts
//     actually audible inside the APK; the WebView's built-in
//     window.speechSynthesis is broken on most Android System WebView builds.
//   - Web (browsers, Vite dev server) → window.speechSynthesis, the standard
//     Web Speech API.
//
// All public methods (announceStart, announceRest, etc.) use the same
// interface as before so callers don't change. The mute toggle stored at
// localStorage['system_sound_muted'] still applies on both paths.

import { Capacitor } from '@capacitor/core';
import { TextToSpeech } from '@capacitor-community/text-to-speech';

const isNative = (): boolean => {
    try { return Capacitor.isNativePlatform(); } catch { return false; }
};

// ── Web path state ──
const synth: SpeechSynthesis | null =
    typeof window !== 'undefined' && 'speechSynthesis' in window
        ? window.speechSynthesis
        : null;
let webVoice: SpeechSynthesisVoice | null = null;

const loadWebVoice = () => {
    if (!synth) return;
    const voices = synth.getVoices();
    webVoice =
        voices.find(v => v.name === 'Google US English') ||
        voices.find(v => v.name === 'Samantha') ||
        voices.find(v => v.name.includes('Zira')) ||
        voices.find(v => v.lang === 'en-US') ||
        null;
};

if (synth && synth.onvoiceschanged !== undefined) {
    synth.onvoiceschanged = loadWebVoice;
}

// ── Native path state ──
//
// First call to TextToSpeech.speak() on Android can take a beat to spin up
// the system TTS engine, so we resolve voices/locale lazily and cache.
let nativeReady = false;
let nativeReadyPromise: Promise<void> | null = null;

const ensureNativeReady = async (): Promise<void> => {
    if (nativeReady) return;
    if (nativeReadyPromise) return nativeReadyPromise;
    nativeReadyPromise = (async () => {
        try {
            // Probing supportedLanguages forces the Android TTS engine to bind.
            // We don't actually need the result — we just need the side-effect
            // of binding before the first speak() is issued.
            await TextToSpeech.getSupportedLanguages().catch(() => null);
            nativeReady = true;
        } catch (err) {
            console.warn('[speech] native init failed', err);
            nativeReady = true; // give up gracefully — fall through to no-op
        }
    })();
    return nativeReadyPromise;
};

const isMuted = (): boolean => {
    try { return localStorage.getItem('system_sound_muted') === 'true'; } catch { return false; }
};

// ── Unified speak() ──
//
// Native: Capacitor plugin. The plugin's `rate` is 0.1..2.0 (1.0 = normal),
// `pitch` is 0.5..2.0, mapped from the web's same scale.
// Web: SpeechSynthesisUtterance.

const speak = (text: string, rate: number = 1.0, pitch: number = 1.0): void => {
    if (isMuted()) return;
    if (!text) return;

    if (isNative()) {
        // Fire and forget — we never want a TTS error to crash the workout.
        (async () => {
            try {
                await ensureNativeReady();
                // Cancel any in-flight utterance so new urgent prompts win.
                await TextToSpeech.stop().catch(() => null);
                await TextToSpeech.speak({
                    text,
                    lang: 'en-US',
                    rate: Math.min(2.0, Math.max(0.1, rate)),
                    pitch: Math.min(2.0, Math.max(0.5, pitch)),
                    volume: 1.0,
                    category: 'ambient',
                });
            } catch (err) {
                console.warn('[speech] native speak failed', err);
            }
        })();
        return;
    }

    // ── Web fallback ──
    if (!synth) return;
    if (!webVoice) loadWebVoice();
    try {
        synth.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        if (webVoice) utter.voice = webVoice;
        utter.rate = rate;
        utter.pitch = pitch;
        utter.volume = 1.0;
        synth.speak(utter);
    } catch (err) {
        console.warn('[speech] web speak failed', err);
    }
};

export const SpeechService = {
    announceStart: (exerciseName: string, sets: number, reps: string) => {
        speak(`Protocol initiated. Target: ${exerciseName}. ${sets} sets of ${reps}. Begin.`, 1.1, 0.9);
    },
    announceSetStart: (setNum: number) => {
        speak(`Set ${setNum}. Engage.`, 1.2, 1.0);
    },
    announceHalfway: () => {
        speak('Energy levels at 50%. Maintain intensity.', 1.1, 1.0);
    },
    announceRest: (seconds: number) => {
        speak(`Set complete. Recover for ${seconds} seconds.`, 1.0, 0.9);
    },
    announceNextExercise: (nextName: string) => {
        speak(`Next target: ${nextName}. Prepare.`, 1.1, 1.0);
    },
    announceVictory: () => {
        speak('Dungeon cleared. Experience acquired. Well done, Hunter.', 1.0, 0.8);
    },
    announceFailure: () => {
        speak('System aborted. Penalty applied.', 0.9, 0.7);
    },

    // ── Form Coach Audio Coaching ──
    announceFormCorrection: (message: string) => {
        speak(message, 1.3, 1.1); // Faster + higher pitch for urgency
    },
    announceRepCounted: (repNumber: number) => {
        if (repNumber <= 1) return;
        if (repNumber % 5 === 0) {
            speak(`${repNumber} reps. Keep going.`, 1.2, 1.0);
        }
    },
    announceFormScore: (score: number) => {
        if (score >= 90) {
            speak('Perfect form. Excellent work.', 1.0, 0.9);
        } else if (score >= 75) {
            speak('Good form. Minor adjustments needed.', 1.0, 0.9);
        } else if (score >= 50) {
            speak('Form needs improvement. Focus on technique.', 1.0, 0.9);
        } else {
            speak('Poor form detected. Reduce weight and focus on technique.', 1.0, 0.8);
        }
    },
};
