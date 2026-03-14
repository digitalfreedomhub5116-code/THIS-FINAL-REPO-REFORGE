
// AudioContext singleton to prevent multiple contexts
let audioCtx: AudioContext | null = null;

const getContext = () => {
    if (!audioCtx) {
        // Support for standard and webkit prefix
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtx;
}

export const speakSystemMessage = (text: string) => {
    try {
        if (!('speechSynthesis' in window)) return;
        
        // Cancel any existing speech
        window.speechSynthesis.cancel();

        const utter = () => {
             const msg = new SpeechSynthesisUtterance(text);
             msg.rate = 0.95; // Slightly slower for clarity
             msg.pitch = 1;
             msg.volume = 1;
             
             // Try to get a decent female voice
             const voices = window.speechSynthesis.getVoices();
             const bestVoice = voices.find(v => 
                v.name.includes("Samantha") || 
                v.name.includes("Google US English") ||
                v.name.includes("Zira") ||
                (v.lang === "en-US" && v.name.includes("Female"))
             );
             
             if (bestVoice) msg.voice = bestVoice;
             window.speechSynthesis.speak(msg);
        };

        // Chrome loads voices asynchronously
        if (window.speechSynthesis.getVoices().length === 0) {
             window.speechSynthesis.addEventListener('voiceschanged', utter, { once: true });
        } else {
             utter();
        }

    } catch (e) {
        console.error("TTS Error", e);
    }
};

export const playSystemSoundEffect = (type: string) => {
    try {
        const ctx = getContext();
        // Ensure context is running (browser autoplay policy)
        if (ctx.state === 'suspended') {
            ctx.resume();
        }
        
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        // Sound profiles based on NotificationType
        switch (type) {
            case 'TICK':
                // Countdown Tick: Short, high-pitch blip
                osc.type = 'sine';
                osc.frequency.setValueAtTime(880, now); // A5
                
                gain.gain.setValueAtTime(0.05, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
                
                osc.start(now);
                osc.stop(now + 0.05);
                break;

            case 'SUCCESS': 
                // Quest Complete: Uplifting major third chime
                osc.type = 'sine';
                osc.frequency.setValueAtTime(523.25, now); // C5
                osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
                
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
                
                osc.start(now);
                osc.stop(now + 0.4);
                break;
                
            case 'PURCHASE': 
                // Shop Buy: Retro digital coin sound
                osc.type = 'square';
                osc.frequency.setValueAtTime(1200, now);
                osc.frequency.setValueAtTime(1800, now + 0.08);
                
                gain.gain.setValueAtTime(0.05, now);
                gain.gain.linearRampToValueAtTime(0.001, now + 0.2);
                
                osc.start(now);
                osc.stop(now + 0.2);
                break;

            case 'LEVEL_UP': {
                // Cinematic ascending chord: E4 → G4 → B4, then soft rise pad
                const tones = [
                    { freq: 329.63, delay: 0 },
                    { freq: 392.00, delay: 0.15 },
                    { freq: 493.88, delay: 0.30 },
                ];
                osc.disconnect();
                gain.disconnect();
                tones.forEach(({ freq, delay }) => {
                    const t = ctx.createOscillator();
                    const g = ctx.createGain();
                    t.type = 'sine';
                    t.connect(g);
                    g.connect(ctx.destination);
                    t.frequency.setValueAtTime(freq, now + delay);
                    g.gain.setValueAtTime(0, now + delay);
                    g.gain.linearRampToValueAtTime(0.07, now + delay + 0.01);
                    g.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.55);
                    t.start(now + delay);
                    t.stop(now + delay + 0.6);
                });
                // Soft rise pad
                const pad = ctx.createOscillator();
                const padGain = ctx.createGain();
                pad.type = 'sine';
                pad.connect(padGain);
                padGain.connect(ctx.destination);
                pad.frequency.setValueAtTime(100, now + 0.5);
                pad.frequency.linearRampToValueAtTime(200, now + 1.1);
                padGain.gain.setValueAtTime(0, now + 0.5);
                padGain.gain.linearRampToValueAtTime(0.04, now + 0.55);
                padGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
                pad.start(now + 0.5);
                pad.stop(now + 1.2);
                break;
            }

            case 'CLICK':
                // UI Click: Very short, crisp blip
                osc.type = 'sine';
                osc.frequency.setValueAtTime(1200, now);
                gain.gain.setValueAtTime(0.02, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
                osc.start(now);
                osc.stop(now + 0.03);
                break;

            case 'COIN':
                // Single Coin: High pitched ting
                osc.type = 'sine';
                osc.frequency.setValueAtTime(1500, now);
                osc.frequency.setValueAtTime(2000, now + 0.05); // slight pitch bend up
                
                gain.gain.setValueAtTime(0.05, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
                
                osc.start(now);
                osc.stop(now + 0.3);
                break;

            case 'GAME_OVER':
                // Defeat: Descending dissonant tone
                const tri = ctx.createOscillator();
                const triGain = ctx.createGain();
                tri.type = 'triangle';
                tri.connect(triGain);
                triGain.connect(ctx.destination);
                
                tri.frequency.setValueAtTime(300, now);
                tri.frequency.linearRampToValueAtTime(50, now + 1.5); // Slow slide down
                
                triGain.gain.setValueAtTime(0.2, now);
                triGain.gain.linearRampToValueAtTime(0, now + 1.5);
                
                tri.start(now);
                tri.stop(now + 1.5);
                
                // Rumble
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(50, now);
                osc.frequency.linearRampToValueAtTime(20, now + 1.5);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.linearRampToValueAtTime(0, now + 1.5);
                osc.start(now);
                osc.stop(now + 1.5);
                break;

            case 'VICTORY_BURST':
                // Explosion/Burst: Low end impact with high sparkle
                const burstOsc = ctx.createOscillator();
                const burstGain = ctx.createGain();
                burstOsc.type = 'sawtooth';
                burstOsc.frequency.setValueAtTime(60, now);
                burstOsc.frequency.exponentialRampToValueAtTime(10, now + 0.6);
                
                burstGain.gain.setValueAtTime(0.3, now);
                burstGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
                
                burstOsc.connect(burstGain);
                burstGain.connect(ctx.destination);
                burstOsc.start(now);
                burstOsc.stop(now + 0.6);
                
                // Sparkle sweep
                const sparkleOsc = ctx.createOscillator();
                const sparkleGain = ctx.createGain();
                sparkleOsc.type = 'triangle';
                sparkleOsc.frequency.setValueAtTime(300, now);
                sparkleOsc.frequency.linearRampToValueAtTime(1500, now + 0.4);
                sparkleGain.gain.setValueAtTime(0.1, now);
                sparkleGain.gain.linearRampToValueAtTime(0, now + 0.4);
                
                sparkleOsc.connect(sparkleGain);
                sparkleGain.connect(ctx.destination);
                sparkleOsc.start(now);
                sparkleOsc.stop(now + 0.4);
                break;

            case 'WARNING': 
                // Decay/Warning: Low descending buzz
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(100, now);
                osc.frequency.linearRampToValueAtTime(80, now + 0.3);
                
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.linearRampToValueAtTime(0.001, now + 0.3);
                
                osc.start(now);
                osc.stop(now + 0.3);
                break;
                
             case 'DANGER': 
                // Penalty: Harsh lower buzz
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(60, now);
                
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
                
                osc.start(now);
                osc.stop(now + 0.5);
                break;

            case 'SYSTEM':
            default: 
                // Generic: Short high-tech blip
                osc.type = 'sine';
                osc.frequency.setValueAtTime(800, now);
                
                gain.gain.setValueAtTime(0.03, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
                
                osc.start(now);
                osc.stop(now + 0.1);
                break;
        }

    } catch (e) {
        console.error("Audio Playback Error", e);
    }
};
