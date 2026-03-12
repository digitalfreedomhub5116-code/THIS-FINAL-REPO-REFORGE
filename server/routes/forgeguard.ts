import { Router, Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { logUsage } from '../utils/logUsage.js';

const router = Router();

function getAI() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY not set');
  return new GoogleGenerativeAI(key);
}

function stripMarkdown(text: string): string {
  return text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
}

function isGibberish(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 3) return true;

  const lower = trimmed.toLowerCase();
  const words = lower.split(/\s+/);
  const vowelRegex = /[aeiou]/;

  const anyWordHasVowel = words.some(w => vowelRegex.test(w));
  if (!anyWordHasVowel) return true;

  const consonants = new Set('bcdfghjklmnpqrstvwxyz');
  for (const word of words) {
    let run = 0;
    for (const ch of word) {
      if (!ch.match(/[a-z]/)) { run = 0; continue; }
      if (consonants.has(ch)) {
        run++;
        if (run >= 5) return true;
      } else {
        run = 0;
      }
    }
  }

  if (words.length === 1) {
    const letters = lower.replace(/[^a-z]/g, '');
    if (letters.length > 6) {
      const vowelCount = (letters.match(/[aeiou]/g) || []).length;
      if (vowelCount / letters.length < 0.15) return true;
    }
  }

  return false;
}

interface ModelResult {
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

async function tryModel(ai: GoogleGenerativeAI, modelName: string, prompt: string): Promise<ModelResult> {
  const model = ai.getGenerativeModel({ model: modelName });
  const result = await model.generateContent(prompt);
  const usage = result.response.usageMetadata;
  return {
    text: result.response.text(),
    model: modelName,
    inputTokens: usage?.promptTokenCount ?? 0,
    outputTokens: usage?.candidatesTokenCount ?? 0,
  };
}

router.post('/analyze-quest', async (req: Request, res: Response) => {
  try {
    const ai = getAI();
    const { title, userStats, healthProfile, timezone } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'title is required' });
    }

    if (isGibberish(title)) {
      return res.json({
        isSpam: true,
        rank: 'E', xp: 0, category: 'discipline',
        reasoning: 'ForgeGuard has flagged this objective as unverifiable. The System only accepts real-world tasks. Dusk is watching.',
        estimatedDuration: 0, minDurationMinutes: 0, autoDetectedTime: null,
      });
    }

    const tzContext = timezone ? `User's timezone: ${timezone}` : 'Timezone unknown';

    const calibrationContext = healthProfile ? `
User Calibration Data:
- Activity Level: ${healthProfile.activityLevel || 'MODERATE'}
- Goal: ${healthProfile.goal || 'BUILD_MUSCLE'}
- Equipment: ${healthProfile.equipment || 'GYM'}
- Injuries: ${(healthProfile.injuries || []).join(', ') || 'none'}
- Baseline Max Pushups: ${healthProfile.baselines?.pushups ?? 'unknown'}
- Max Unbroken Focus (min): ${healthProfile.baselines?.focusDuration ?? 'unknown'}
- Sleep Average (hrs): ${healthProfile.baselines?.sleepAvg ?? 'unknown'}
- Reading (pgs/day): ${healthProfile.baselines?.readingTime ?? 'unknown'}
- BMR: ${healthProfile.bmr ?? 'unknown'} kcal/day
- Age: ${healthProfile.age ?? 'unknown'}
- Current Energy Level: ${healthProfile.energyLevel ?? 'MODERATE'}
- Daily Available Time (min): ${healthProfile.dailyTimeAvailable ?? 60}
- Stress Level: ${healthProfile.stressLevel ?? 'MODERATE'}
` : 'No calibration data available. Use moderate difficulty defaults.';

    const statsContext = userStats ? `
Current Hunter Stats:
- Strength: ${userStats.strength || 10}/100
- Intelligence: ${userStats.intelligence || 10}/100
- Discipline: ${userStats.discipline || 10}/100
- Social: ${userStats.social || 10}/100
` : '';

    const prompt = `You are ForgeGuard, an elite AI quest judge for a solo-leveling RPG fitness app called Bio-Sync OS.

${tzContext}
${calibrationContext}
${statsContext}

Quest Title: "${title}"

=== REJECTION RULES (isSpam = true) ===

Reject ANY quest that:
1. Is a biological necessity or involuntary action:
   - Breathing, blinking, existing, living, being alive, waking up (alone), heartbeat, digesting, ageing, speaking/talking (without specific target), hearing, seeing, thinking (vaguely)
2. Is too vague to estimate time:
   - No duration, distance, quantity, repetition count, or clear endpoint
   - Examples of SPAM: "run", "exercise", "study", "read", "eat", "clean", "work", "meditate", "walk" (alone with no target)
   - Examples of VALID: "run 5km", "exercise for 30 minutes", "read 20 pages", "meditate for 10 minutes", "walk 3km", "clean my room for 45 minutes"
3. Contains nonsense, keyboard mashing, random letters, or gibberish:
   - Examples: "rinmfpr", "asdfghjk", "qwerty", "lkjhg", "zxcvbn", "aaaaaa", "test123", "abc", "xyz"
   - If it cannot be parsed as a real-world activity in any language, isSpam = true
4. Is something literally everyone does passively without effort (e.g. "blink 100 times", "take 10 breaths")
5. Has no real-world effort or achievement attached
6. Is physically, scientifically, or logically impossible for any living human being:
   - Space travel, climbing to the moon, flying unaided, teleportation, time travel, breathing underwater without equipment, lifting a building, running faster than the speed of light, visiting another planet, talking to aliens, becoming immortal, etc.
   - CRITICAL: Do NOT rationalize impossible quests as metaphors. Take the LITERAL meaning. "Climb to the moon" = physically impossible = isSpam true. "Fly to New York" (on a plane) = possible = valid. "Fly unaided to New York" = impossible = isSpam true.
   - If no human being can complete this task under the laws of real-world physics and biology, isSpam = true.

The GOLDEN RULE: A valid quest MUST be physically possible for a human, AND have a measurable target that allows estimating completion time. If either condition fails, isSpam = true.

=== ANALYSIS RULES (for valid quests only) ===

1. Rank based on calibrated effort for THIS user:
   E = trivial (5-15 min), D = easy (15-30 min), C = moderate (30-60 min),
   B = hard (60-120 min), A = very hard (2-4 hrs), S = elite (4+ hrs)
2. XP: E=10-30, D=30-75, C=75-150, B=150-250, A=250-400, S=400-600 (scale within range by effort)
3. Category: strength, intelligence, discipline, social
4. estimatedDuration: realistic total time in minutes for THIS user
5. minDurationMinutes: the MINIMUM possible time a human could complete this task — strict anti-cheat floor:
   - Physical tasks: use realistic minimum human pace (e.g. 5km run = 18 min absolute minimum even for elite athletes)
   - Study/read tasks: use words-per-page × minimum reading speed
   - Never below 5 minutes for any non-trivial task
   - For tasks measured in time (e.g. "meditate 10 minutes") = exactly that duration
6. autoDetectedTime: if the quest title contains a specific clock time or time-of-day indicator, extract it in HH:MM (24h) format:
   - "Cook dinner at 9 pm" → "21:00"
   - "Morning jog 6am" → "06:00"
   - If no time mentioned → null
7. Calibration adjustments:
   - DRAINED/BURNOUT: increase difficulty one rank, reduce minDurationMinutes by 10%
   - Energy HIGH/PEAK: may reduce perceived rank

Respond with ONLY valid JSON, no markdown:
{"rank":"C","xp":100,"category":"strength","reasoning":"Running 5km is moderate effort for your fitness baseline.","estimatedDuration":35,"minDurationMinutes":18,"autoDetectedTime":null,"isSpam":false}`;

    let modelResult: ModelResult | null = null;
    const models = ['gemini-2.0-flash', 'gemini-1.5-flash'];
    for (const modelName of models) {
      try {
        modelResult = await tryModel(ai, modelName, prompt);
        break;
      } catch (err) {
        console.warn(`[ForgeGuard] Model ${modelName} failed, trying next...`);
      }
    }

    if (!modelResult) {
      return res.status(500).json({ error: 'All AI models failed' });
    }

    logUsage({
      route: 'forgeguard/analyze-quest',
      model: modelResult.model,
      inputTokens: modelResult.inputTokens,
      outputTokens: modelResult.outputTokens,
      success: true,
    });

    const cleaned = stripMarkdown(modelResult.text);
    const parsed = JSON.parse(cleaned);
    return res.json(parsed);
  } catch (err: any) {
    console.error('[ForgeGuard analyze-quest]', err);
    return res.status(500).json({ error: err.message || 'Analysis failed' });
  }
});

router.post('/verify-proof', async (req: Request, res: Response) => {
  try {
    const ai = getAI();
    const { imageBase64, reason, context } = req.body;

    if (!imageBase64 || !reason) {
      return res.status(400).json({ error: 'imageBase64 and reason are required' });
    }

    const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;

    const prompt = `You are ForgeGuard, an AI anti-cheat investigator for a fitness RPG.

The player claims: "${reason}"
Context: ${context || 'Quest completion verification'}

Examine the submitted photo. Determine if it legitimately supports the claim.

Respond with ONLY a JSON object:
{"verdict":"APPROVED","confidence":85,"analysis":"The image clearly shows the claimed activity."}`;

    const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
          { text: prompt }
        ]
      }]
    });

    logUsage({
      route: 'forgeguard/verify-proof',
      model: 'gemini-2.0-flash',
      inputTokens: result.response.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: result.response.usageMetadata?.candidatesTokenCount ?? 0,
      success: true,
    });

    const text = result.response.text();
    const cleaned = stripMarkdown(text);
    const parsed = JSON.parse(cleaned);
    return res.json(parsed);
  } catch (err: any) {
    console.error('[ForgeGuard verify-proof]', err);
    return res.status(500).json({ error: err.message || 'Verification failed' });
  }
});

export default router;
