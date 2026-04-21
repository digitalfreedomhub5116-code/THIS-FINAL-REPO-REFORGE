import { Router, Request, Response } from 'express';
import { logUsage } from '../utils/logUsage.js';
import { getAuthenticatedUserId } from '../lib/playerAuth.js';
import { getSharedAI, generateWithFallback, DEFAULT_MODEL_CHAIN } from '../utils/geminiRetry.js';

const router = Router();

function stripMarkdown(text: string): string {
  return text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
}

// ── Generate daily schedule slots by assigning time slots to goal quests ──
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const ai = getSharedAI();
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const { scheduleProfile, goals, existingQuests, date } = req.body;

    if (!scheduleProfile) {
      return res.status(400).json({ error: 'scheduleProfile is required' });
    }

    // Build blocked time slots from profile
    const blockedSlots: string[] = [];
    const profile = scheduleProfile;
    const role = profile.role;

    // Morning routine
    blockedSlots.push(`${profile.wakeUpTime}-${addMin(profile.wakeUpTime, profile.morningRoutineMin || 30)}: Morning Routine (ROUTINE)`);

    // Role-specific blocks
    if (role === 'STUDENT') {
      if (profile.schoolStart && profile.schoolEnd) {
        blockedSlots.push(`${profile.schoolStart}-${profile.schoolEnd}: School/College (BLOCKED)`);
      }
      if (profile.coachingEnabled && profile.coachingStart && profile.coachingEnd) {
        blockedSlots.push(`${profile.coachingStart}-${profile.coachingEnd}: Tuition/Coaching (BLOCKED)`);
      }
    } else if (role === 'PROFESSIONAL') {
      if (profile.workStart && profile.workEnd) {
        blockedSlots.push(`${profile.workStart}-${profile.workEnd}: Work (BLOCKED)`);
      }
    }

    // Meals
    blockedSlots.push(`${profile.dinnerTime}-${addMin(profile.dinnerTime, 30)}: Dinner (MEAL)`);

    // Wind-down + Sleep
    const windDownStart = subtractMin(profile.bedtime, profile.windDownMinutes || 30);
    blockedSlots.push(`${windDownStart}-${profile.bedtime}: Wind-Down (ROUTINE)`);
    blockedSlots.push(`${profile.bedtime}: Sleep (SLEEP)`);

    // Build goal quest list
    const goalContext = (goals || [])
      .filter((g: any) => g.status === 'ACTIVE')
      .map((g: any) => `- "${g.title}" (${g.category}, ${g.dailyCommitmentMin} min/day, Day ${Math.floor((Date.now() - g.startDate) / 86400000) + 1})`)
      .join('\n');

    // Existing quests for today
    const questContext = (existingQuests || [])
      .map((q: any) => `- "${q.title}" (${q.estimatedDuration || 20} min, ${q.categories?.join(',')||'general'}, Goal: ${q.goalTitle || 'System'})`)
      .join('\n');

    const prompt = `You are ForgeGuard Schedule Engine for Bio-Sync OS — a real-world RPG productivity app.

Given the user's daily structure and their active quests, assign SPECIFIC TIME SLOTS to each quest.

=== USER PROFILE ===
Role: ${role}
Wake up: ${profile.wakeUpTime}
Bedtime: ${profile.bedtime} (user's choice, respect it)
Preferred workout time: ${profile.preferredWorkoutTime}
Preferred study/focus time: ${profile.preferredStudyTime}
${profile.napEnabled ? `Nap: ${profile.napDuration || 30} min` : 'No nap'}
${profile.fixedCommitments ? `Other commitments: ${profile.fixedCommitments}` : ''}

=== BLOCKED/FIXED SLOTS (cannot schedule quests here) ===
${blockedSlots.join('\n')}

=== ACTIVE GOALS ===
${goalContext || 'No active goals'}

=== TODAY'S QUESTS TO SCHEDULE ===
${questContext || 'No quests yet — generate placeholder free-time slots'}

=== RULES ===
1. NEVER schedule quests during blocked slots
2. Place workout quest in the user's preferred workout time slot
3. Place study/focus quests in the user's preferred study time
4. Leave 15-min buffer between consecutive intensive tasks
5. Meal times get 30-min buffer (no quests 15 min before or after meals)
6. Light tasks (revision, reading) can go in evening/wind-down adjacent slots
7. Respect the user's bedtime — work BACKWARD from it
8. Include FREE time blocks where nothing is scheduled (breaks are healthy)
9. Add a commute slot if commute > 0 min (can suggest audio quests)
10. Each slot must have: startTime (HH:MM), endTime (HH:MM), type, label

=== OUTPUT FORMAT ===
Return ONLY a valid JSON array of schedule slots:
[
  {"startTime":"06:30","endTime":"07:00","type":"ROUTINE","label":"Morning Routine","isFlexible":false},
  {"startTime":"07:00","endTime":"07:30","type":"WORKOUT","label":"Morning HIIT Session","questId":"quest1","isFlexible":true},
  {"startTime":"08:00","endTime":"14:30","type":"BLOCKED","label":"School","isFlexible":false},
  {"startTime":"15:00","endTime":"15:25","type":"QUEST","label":"JEE Physics: Ch.2 Pages 8-12","questId":"quest2","goalId":"goal1","isFlexible":true},
  {"startTime":"17:00","endTime":"17:30","type":"FREE","label":"Free Time","isFlexible":false},
  {"startTime":"20:30","endTime":"21:00","type":"MEAL","label":"Dinner","isFlexible":false},
  {"startTime":"22:30","endTime":"23:00","type":"ROUTINE","label":"Wind Down","isFlexible":false},
  {"startTime":"23:00","endTime":"23:00","type":"SLEEP","label":"Lights Out","isFlexible":false}
]

IMPORTANT: Return ONLY the JSON array, no markdown, no explanation.`;

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
      console.error('[Schedule] All models failed', err);
      return res.status(500).json({ error: 'All AI models failed' });
    }

    logUsage({
      route: 'schedule/generate',
      model: modelName,
      inputTokens,
      outputTokens,
      success: true,
      userId: userId || undefined,
    });

    const cleaned = stripMarkdown(responseText);
    const slotsRaw = JSON.parse(cleaned);

    // Normalize slots — add IDs and default status
    const slots = slotsRaw.map((s: any, idx: number) => ({
      id: `sched-${date || new Date().toISOString().split('T')[0]}-${idx}`,
      startTime: s.startTime,
      endTime: s.endTime,
      type: s.type || 'FREE',
      questId: s.questId || undefined,
      goalId: s.goalId || undefined,
      label: s.label || 'Unnamed',
      status: 'PENDING',
      isFlexible: s.isFlexible ?? false,
      isCarryOver: false,
      notifyEnabled: s.type === 'QUEST' || s.type === 'WORKOUT',
    }));

    const schedule = {
      date: date || new Date().toISOString().split('T')[0],
      slots,
      swapsUsed: 0,
      restDayUsed: false,
      generatedAt: Date.now(),
    };

    return res.json({ schedule });
  } catch (err: any) {
    console.error('[Schedule generate]', err);
    return res.status(500).json({ error: err.message || 'Schedule generation failed' });
  }
});

// ── Swap a quest in the schedule with AI-generated alternatives ──
router.post('/swap', async (req: Request, res: Response) => {
  try {
    const ai = getSharedAI();
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const { currentQuest, goalContext, scheduleProfile, swapsUsedToday } = req.body;

    if (!currentQuest) {
      return res.status(400).json({ error: 'currentQuest is required' });
    }

    if ((swapsUsedToday || 0) >= 2) {
      return res.status(429).json({ error: 'Maximum 2 swaps per day reached' });
    }

    const prompt = `You are ForgeGuard. Generate exactly 3 alternative quests to replace this one.

CURRENT QUEST:
- Title: "${currentQuest.title}"
- Duration: ${currentQuest.estimatedDuration || 20} min
- Rank: ${currentQuest.rank || 'D'}
- XP: ${currentQuest.xp || 30}
- Goal: ${currentQuest.goalTitle || 'General'}
- Category: ${currentQuest.categories?.join(', ') || 'general'}

RULES:
1. Each alternative MUST be equal or HIGHER rank than the current quest
2. Each alternative MUST require equal or MORE time
3. Alternatives must be related to the same goal/topic area
4. Make alternatives genuinely different approaches to the same learning objective
5. Include specific, measurable targets (page numbers, problem counts, etc.)

Return ONLY valid JSON array of 3 alternatives:
[
  {"title":"...","estimatedDuration":25,"rank":"D","xp":35,"categories":["intelligence","focus"],"reasoning":"...","stepByStep":["Step 1","Step 2"]},
  {"title":"...","estimatedDuration":20,"rank":"D","xp":30,"categories":["intelligence"],"reasoning":"...","stepByStep":["Step 1"]},
  {"title":"...","estimatedDuration":30,"rank":"C","xp":45,"categories":["intelligence","discipline"],"reasoning":"...","stepByStep":["Step 1","Step 2"]}
]`;

    const { result, modelName } = await generateWithFallback(ai, [...DEFAULT_MODEL_CHAIN], prompt);
    const usage = result.response.usageMetadata;

    logUsage({
      route: 'schedule/swap',
      model: modelName,
      inputTokens: usage?.promptTokenCount ?? 0,
      outputTokens: usage?.candidatesTokenCount ?? 0,
      success: true,
      userId: userId || undefined,
    });

    const cleaned = stripMarkdown(result.response.text());
    const alternatives = JSON.parse(cleaned);

    return res.json({ alternatives, model: modelName });
  } catch (err: any) {
    console.error('[Schedule swap]', err);
    return res.status(500).json({ error: err.message || 'Swap generation failed' });
  }
});

// Helper functions
function addMin(time: string, mins: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + mins;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

function subtractMin(time: string, mins: number): string {
  const [h, m] = time.split(':').map(Number);
  let total = h * 60 + m - mins;
  if (total < 0) total += 24 * 60;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

export default router;
