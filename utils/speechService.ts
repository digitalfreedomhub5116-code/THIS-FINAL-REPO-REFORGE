
// Speech Synthesis Service for System AI

let synth: SpeechSynthesis | null = typeof window !== 'undefined' ? window.speechSynthesis : null;
let voice: SpeechSynthesisVoice | null = null;

const loadVoice = () => {
  if (!synth) return;
  const voices = synth.getVoices();
  // Priority: 1. Google US English (Chrome), 2. Samantha (Mac), 3. Zira (Win), 4. Default
  voice = voices.find(v => v.name === "Google US English") || 
          voices.find(v => v.name === "Samantha") || 
          voices.find(v => v.name.includes("Zira")) || 
          voices.find(v => v.lang === "en-US") || 
          null;
};

if (synth && synth.onvoiceschanged !== undefined) {
  synth.onvoiceschanged = loadVoice;
}

const speak = (text: string, rate: number = 1.0, pitch: number = 1.0) => {
  if (!synth) return;
  if (!voice) loadVoice(); // Retry load

  // Cancel current queue to prioritize new alerts
  synth.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  if (voice) utterance.voice = voice;
  utterance.rate = rate;
  utterance.pitch = pitch;
  utterance.volume = 1.0;

  synth.speak(utterance);
};

export const SpeechService = {
  announceStart: (exerciseName: string, sets: number, reps: string) => {
    const text = `Protocol initiated. Target: ${exerciseName}. ${sets} sets of ${reps}. Begin.`;
    speak(text, 1.1, 0.9);
  },

  announceSetStart: (setNum: number) => {
    speak(`Set ${setNum}. Engage.`, 1.2, 1.0);
  },

  announceHalfway: () => {
    speak("Energy levels at 50%. Maintain intensity.", 1.1, 1.0);
  },

  announceRest: (seconds: number) => {
    speak(`Set complete. Recover for ${seconds} seconds.`, 1.0, 0.9);
  },

  announceNextExercise: (nextName: string) => {
    speak(`Next target: ${nextName}. Prepare.`, 1.1, 1.0);
  },

  announceVictory: () => {
    speak("Dungeon cleared. Experience acquired. Well done, Hunter.", 1.0, 0.8);
  },

  announceFailure: () => {
    speak("System aborted. Penalty applied.", 0.9, 0.7);
  }
};
