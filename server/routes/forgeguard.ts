import { Router, Request, Response } from 'express';
import { logUsage } from '../utils/logUsage.js';
import { getAuthenticatedUserId } from '../lib/playerAuth.js';
import { getSharedAI, generateWithFallback, DEFAULT_MODEL_CHAIN } from '../utils/geminiRetry.js';

const router = Router();

function stripMarkdown(text: string): string {
  return text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
}

function isGibberish(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 3) return true;

  const lower = trimmed.toLowerCase();
  const words = lower.split(/\s+/);

  // Multi-word inputs (3+ words) are almost never gibberish — let the AI judge
  if (words.length >= 3) return false;

  const vowelRegex = /[aeiou]/;
  // At least one word must have a vowel (but numbers like "5km" don't need one)
  const anyWordHasVowel = words.some(w => vowelRegex.test(w));
  const hasNumbers = /\d/.test(lower);
  if (!anyWordHasVowel && !hasNumbers) return true;

  const consonants = new Set('bcdfghjklmnpqrstvwxyz');
  for (const word of words) {
    let run = 0;
    for (const ch of word) {
      if (!ch.match(/[a-z]/)) { run = 0; continue; }
      if (consonants.has(ch)) {
        run++;
        if (run >= 6) return true; // Relaxed from 5 to 6 for typo tolerance
      } else {
        run = 0;
      }
    }
  }

  if (words.length === 1) {
    const letters = lower.replace(/[^a-z]/g, '');
    if (letters.length > 6) {
      const vowelCount = (letters.match(/[aeiou]/g) || []).length;
      if (vowelCount / letters.length < 0.10) return true; // Relaxed from 0.15 to 0.10
    }
  }

  return false;
}

router.post('/analyze-quest', async (req: Request, res: Response) => {
  try {
    const ai = getSharedAI();
    const userId = getAuthenticatedUserId(req) || null;
    const { title, userStats, healthProfile, timezone } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'title is required' });
    }

    if (isGibberish(title)) {
      return res.json({
        isSpam: true,
        rank: 'E', xp: 0, categories: ['discipline'],
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

    const prompt = `You are ForgeGuard, an elite AI quest judge for a gamified RPG fitness app called Reforge. Dusk is the System's male overseer — refer to him with he/his pronouns.

${tzContext}
${calibrationContext}
${statsContext}

Quest Title: "${title}"

=== TYPO & SPELLING TOLERANCE ===
Users type quest titles quickly on mobile. If the title contains typos, misspellings, or shorthand but the INTENT is clearly a real-world task, interpret it correctly and proceed with analysis.
Examples: "runnig 5km" → "running 5km", "stdy 2 hours" → "study 2 hours", "pushps 50" → "pushups 50", "mediatte 15 min" → "meditate 15 min", "red 30 pges" → "read 30 pages", "wlk 3km" → "walk 3km".
Only reject as gibberish if the text is truly random characters with NO recognizable intent (e.g. "xkjqw", "aaaa", "12345").

=== REJECTION RULES (isSpam = true) ===

Reject ANY quest that:
1. Is a biological necessity or involuntary action:
   - Breathing, blinking, existing, living, being alive, waking up (alone), heartbeat, digesting, ageing, speaking/talking (without specific target), hearing, seeing, thinking (vaguely)
2. Is too vague to estimate time:
   - No duration, distance, quantity, repetition count, or clear endpoint
   - Examples of SPAM: "run", "exercise", "study", "read", "eat", "clean", "work", "meditate", "walk", "cycling", "static cycling", "jogging", "swimming", "pushups", "gym", "workout", "cardio", "yoga", "stretching", "plank" (alone with no specific target/duration)
   - ANY physical exercise, workout, or sport activity MUST include an explicit time duration (e.g. "30 minutes"), distance (e.g. "5km"), or rep count (e.g. "100 pushups"). Without one of these, isSpam = true. No exceptions.
   - Examples of VALID: "run 5km", "exercise for 30 minutes", "read 20 pages", "meditate for 10 minutes", "walk 3km", "clean my room for 45 minutes", "static cycling 20 mins", "100 pushups", "swim 1km"
   - HOWEVER: If a NON-exercise task is inherently clear and self-contained (e.g. "do laundry", "wash dishes", "make bed", "cook lunch"), accept it — these have obvious endpoints even without explicit targets. This exception does NOT apply to exercise/workout/sport tasks.
3. Contains nonsense, keyboard mashing, random letters, or gibberish:
   - Examples: "rinmfpr", "asdfghjk", "qwerty", "lkjhg", "zxcvbn", "aaaaaa", "test123", "abc", "xyz"
   - If it cannot be parsed as a real-world activity in any language, isSpam = true
4. Is something literally everyone does passively without effort (e.g. "blink 100 times", "take 10 breaths")
5. Has no real-world effort or achievement attached
6. Is physically, scientifically, or logically impossible for any living human being:
   - Space travel, climbing to the moon, flying unaided, teleportation, time travel, breathing underwater without equipment, lifting a building, running faster than the speed of light, visiting another planet, talking to aliens, becoming immortal, etc.
   - CRITICAL: Do NOT rationalize impossible quests as metaphors. Take the LITERAL meaning. "Climb to the moon" = physically impossible = isSpam true. "Fly to New York" (on a plane) = possible = valid. "Fly unaided to New York" = impossible = isSpam true.
   - If no human being can complete this task under the laws of real-world physics and biology, isSpam = true.
7. Is harmful, dangerous, illegal, or self-destructive:
   - Any quest that promotes self-harm, illegal activity, substance abuse, or endangers others = isSpam true.

The GOLDEN RULE: A valid quest MUST be physically possible for a human, AND have a measurable target or obvious endpoint that allows estimating completion time. If either condition fails, isSpam = true.

=== ANALYSIS RULES (for valid quests only) ===

1. Rank based on calibrated effort for THIS user:
   E = trivial (5-15 min), D = easy (15-30 min), C = moderate (30-60 min),
   B = hard (60-120 min), A = very hard (2-4 hrs), S = elite (4+ hrs)
2. XP: E=10-30, D=30-75, C=75-150, B=150-250, A=250-400, S=400-600 (scale within range by effort)
3. categories: An array of 1-2 pillars from: "strength", "intelligence", "discipline", "social", "focus", "willpower"
   - Assign COMBINED pillars when the quest genuinely engages multiple areas:
     * Physical exercise/health activities → ["strength", "willpower"] (physical effort + mental push)
     * Study/learning with deep focus → ["intelligence", "focus"] (mental effort + sustained attention)
     * Team sports / group workouts → ["strength", "social"] (physical + social engagement)
     * Teaching / tutoring / mentoring → ["intelligence", "social"]
     * Chores / self-care / cleaning → ["discipline"] (single pillar is fine)
     * Meditation / Mindfulness → ["focus", "willpower"]
     * Solo intellectual tasks → ["intelligence"] (single pillar)
     * Networking / calling friends → ["social"] (single pillar)
   - Use 1 pillar for simple/focused tasks. Use 2 pillars when the quest clearly spans two areas.
   - NEVER assign more than 2 pillars. NEVER assign all 6.
4. estimatedDuration: realistic total time in minutes for THIS user
5. minDurationMinutes: the MINIMUM possible time a human could complete this task — strict anti-cheat floor:
   - Physical tasks: use realistic minimum human pace (e.g. 5km run = 18 min absolute minimum even for elite athletes)
   - Study/read tasks: use words-per-page × minimum reading speed
   - Never below 3 minutes for any non-trivial task
   - For tasks measured in time (e.g. "meditate 10 minutes") = exactly that duration
6. autoDetectedTime: if the quest title contains a specific clock time or time-of-day indicator, extract it in HH:MM (24h) format:
   - "Cook dinner at 9 pm" → "21:00"
   - "Morning jog 6am" → "06:00"
   - If no time mentioned → null
7. Calibration adjustments:
   - If user stats are LOW in a pillar (<25), quests targeting that pillar should be ranked slightly harder (user is a beginner)
   - If user stats are HIGH in a pillar (>70), quests targeting that pillar can be ranked slightly easier (user is experienced)
   - DRAINED/BURNOUT energy: increase difficulty one rank, reduce minDurationMinutes by 10%
   - Energy HIGH/PEAK: may reduce perceived rank
8. reasoning: Write a SHORT, punchy 1-2 sentence analysis. Be direct and motivational. Avoid generic filler.
9. sensorRequirements: For physical/outdoor quests, provide an object specifying what device sensors should verify.
   Use this activity→sensor mapping TABLE strictly:

   WALKING (walk, stroll, hike, trek):
     - steps: N×80 per minute of walking, OR exact step target if stated
     - distanceKm: N×0.067 km per minute, OR exact distance if stated
     - activeMinutes: duration in minutes
     Example: "Walk 10 min" → {"steps":800,"distanceKm":0.67,"activeMinutes":10}
     Example: "Hike 5km" → {"steps":6500,"distanceKm":5,"activeMinutes":60}

   RUNNING / JOGGING / SPRINTING (run, jog, sprint):
     - steps: N×130 per minute, OR derive from distance (1km≈1300 steps)
     - distanceKm: exact if stated, OR N×0.17 km per minute
     - activeMinutes: duration in minutes
     Example: "Run 10 min" → {"steps":1300,"distanceKm":1.7,"activeMinutes":10}
     Example: "Jog 3km" → {"steps":3900,"distanceKm":3,"activeMinutes":18}

   CYCLING / BIKING / RIDING (cycle, bike, ride, spin):
     - distanceKm: exact if stated, OR N×0.25 km per minute
     - activeMinutes: duration in minutes
     - NO steps (phone pedometer is unreliable on a bicycle)
     Example: "Cycle 20 min" → {"distanceKm":5,"activeMinutes":20}
     Example: "Bike 10km" → {"distanceKm":10,"activeMinutes":24}

   SWIMMING (swim, laps):
     - activeMinutes ONLY (GPS and phone pedometer are unusable in water)
     Example: "Swim 30 min" → {"activeMinutes":30}

   GYM / INDOOR WORKOUT (gym, workout, lift, pushups, pullups, squats, weights, HIIT, circuit, CrossFit):
     - activeMinutes ONLY
     Example: "Gym workout 45 min" → {"activeMinutes":45}
     Example: "100 pushups" → {"activeMinutes":15}

   OUTDOOR SPORT (football, basketball, tennis, etc.):
     - activeMinutes ONLY (no reliable GPS path)
     Example: "Play football 1 hour" → {"activeMinutes":60}

   NON-PHYSICAL (reading, studying, cooking, meditating, journaling, coding):
     - sensorRequirements: null
     Example: "Read 30 pages" → null
     Example: "Meditate 20 min" → null

   IMPORTANT: Always include activeMinutes for ANY physical quest that has a time component. Always include distanceKm for outdoor locomotion (walk/run/cycle). Always include steps for walk/run but NEVER for cycle/swim/gym.

Respond with ONLY valid JSON, no markdown:
{"rank":"C","xp":100,"categories":["strength","discipline"],"reasoning":"Running 10km demands serious endurance and mental fortitude at your current fitness level.","estimatedDuration":70,"minDurationMinutes":36,"autoDetectedTime":null,"isSpam":false,"sensorRequirements":{"steps":13000,"distanceKm":10,"activeMinutes":50}}`;

    let modelName: string;
    let responseText: string;
    let inputTokens = 0;
    let outputTokens = 0;
    try {
      const r = await generateWithFallback(ai, [...DEFAULT_MODEL_CHAIN], prompt);
      modelName = r.modelName;
      responseText = r.result.response.text();
      inputTokens = r.result.response.usageMetadata?.promptTokenCount ?? 0;
      outputTokens = r.result.response.usageMetadata?.candidatesTokenCount ?? 0;
    } catch (err) {
      console.error('[ForgeGuard] All models failed', err);
      return res.status(500).json({ error: 'All AI models failed' });
    }

    logUsage({
      route: 'forgeguard/analyze-quest',
      model: modelName,
      inputTokens,
      outputTokens,
      success: true,
      userId: userId || undefined,
    });

    const cleaned = stripMarkdown(responseText);
    const parsed = JSON.parse(cleaned);
    // Normalize: AI now returns categories array, ensure backward compat
    if (parsed.categories && !parsed.category) {
      parsed.category = parsed.categories[0];
    } else if (parsed.category && !parsed.categories) {
      parsed.categories = [parsed.category];
    }
    return res.json(parsed);
  } catch (err: any) {
    console.error('[ForgeGuard analyze-quest]', err);
    return res.status(500).json({ error: err.message || 'Analysis failed' });
  }
});

export default router;
