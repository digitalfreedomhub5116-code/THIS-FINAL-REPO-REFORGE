import { Router, Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { logUsage } from '../utils/logUsage.js';
import { getAuthenticatedUserId } from '../lib/playerAuth.js';
import { supabaseServer } from '../lib/supabase.js';

const router = Router();

// ── Helpers ──

function getAI() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY not set');
  return new GoogleGenerativeAI(key);
}

function stripMarkdown(text: string): string {
  return text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
}

// ── POST /analyze — Step 1: Validate goal + generate interview questions ──
router.post('/analyze', async (req: Request, res: Response) => {
  try {
    const authUserId = getAuthenticatedUserId(req);
    if (!authUserId) return res.status(401).json({ error: 'Unauthorized' });

    const ai = getAI();
    const { goalText, playerStats, healthProfile, activeGoalsCount, timezone } = req.body;

    if (!goalText || goalText.trim().length < 5) {
      return res.status(400).json({ error: 'Goal must be at least 5 characters' });
    }

    if ((activeGoalsCount ?? 0) >= 3) {
      return res.json({
        isInvalid: true,
        invalidReason: 'SYSTEM LIMIT: Maximum 3 active goals allowed. Complete or abandon an existing goal first.',
      });
    }

    const statsContext = playerStats ? `
Stats: STR ${playerStats.strength || 10}/100, INT ${playerStats.intelligence || 10}/100, DIS ${playerStats.discipline || 10}/100, SOC ${playerStats.social || 10}/100, FOC ${playerStats.focus || 10}/100, WIL ${playerStats.willpower || 10}/100` : '';

    const calibrationContext = healthProfile ? `
Calibration: Age ${healthProfile.age ?? 'unknown'}, Activity Level ${healthProfile.activityLevel || 'MODERATE'},
  BMR ${healthProfile.bmr ?? 'unknown'} kcal/day, Weight ${healthProfile.weight ?? 'unknown'}kg,
  Daily Available Time: ${healthProfile.sessionDuration ?? 60} min,
  Energy Level: ${healthProfile.energyLevel ?? 'MODERATE'}, Stress Level: ${healthProfile.stressLevel ?? 'MODERATE'}
  Equipment: ${healthProfile.equipment || 'BODYWEIGHT'}
  Baselines: Pushups ${healthProfile.baselines?.pushups ?? 'unknown'}, Focus ${healthProfile.baselines?.focusDuration ?? 'unknown'}min, Sleep ${healthProfile.baselines?.sleepAvg ?? 'unknown'}hrs` : 'No calibration data available.';

    const prompt = `You are ForgeGuard, the elite AI goal analyst for Bio-Sync OS — a real-world RPG fitness and productivity app.

=== USER PROFILE ===
${statsContext}
${calibrationContext}
Active Goals Count: ${activeGoalsCount ?? 0}/3
Timezone: ${timezone || 'unknown'}

=== GOAL TEXT ===
"${goalText.trim()}"

=== HARD REJECTION RULES ===
REJECT (isInvalid: true) if the goal is:
1. Physically/scientifically impossible (fly unaided, grow taller as adult, time travel, climb to moon, become immortal)
2. Would realistically take >365 days for THIS user given their profile
3. Too short (<7 days) — suggest using a regular quest instead
4. Too vague to create a plan ("be happy", "be successful", "get better", "improve myself")
5. Harmful, illegal, dangerous, or self-destructive
6. Nonsense, gibberish, or random characters

If the user's stated timeline is unrealistic but the goal itself is valid, do NOT reject — instead flag it and calculate the REAL timeline.

=== TYPO TOLERANCE ===
Users type on mobile. If the goal has typos but intent is clear, interpret correctly. Only reject truly random gibberish.

=== TASK ===
1. Validate the goal against rejection rules
2. If valid, classify: ACADEMIC | FITNESS | FINANCIAL | SKILL | CAREER | HEALTH | CREATIVE
3. Estimate a SMART duration in days based on the user's actual capabilities:
   - Weight loss: safe rate is 0.5-1kg/week. Calculate from current weight to target.
   - Academic exams: count syllabus size vs hours/day available
   - Financial: assess realistic earning trajectory
   - Fitness: progressive overload timelines based on current baseline
4. Generate 3-5 interview questions to refine the plan. Pre-fill answers from calibration data where possible.

=== RESPONSE FORMAT (JSON only, no markdown) ===
{
  "isInvalid": false,
  "invalidReason": null,
  "category": "FITNESS",
  "estimatedDurationDays": 210,
  "initialAssessment": "Brief 1-2 line assessment of the goal and its feasibility.",
  "timelineOverride": null,
  "questions": [
    {"id": 1, "question": "What is your current weight in kg?", "type": "number", "prefilled": 80},
    {"id": 2, "question": "Target weight in kg?", "type": "number", "prefilled": null},
    {"id": 3, "question": "How many hours per day can you dedicate?", "type": "number", "prefilled": 1},
    {"id": 4, "question": "Do you have gym access or only home workouts?", "type": "text", "prefilled": "GYM"},
    {"id": 5, "question": "Any dietary restrictions or health conditions?", "type": "text", "prefilled": null}
  ]
}`;

    // Use Gemini 2.5 Pro for goal analysis (best reasoning)
    const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash-preview-05-20' });
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    logUsage({
      route: 'goals/analyze',
      model: 'gemini-2.5-flash-preview-05-20',
      inputTokens: result.response.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: result.response.usageMetadata?.candidatesTokenCount ?? 0,
      success: true,
      userId: authUserId,
    });

    const cleaned = stripMarkdown(text);
    const parsed = JSON.parse(cleaned);

    // Enforce 365-day max
    if (!parsed.isInvalid && parsed.estimatedDurationDays > 365) {
      parsed.isInvalid = true;
      parsed.invalidReason = `This goal would take ~${parsed.estimatedDurationDays} days (${Math.round(parsed.estimatedDurationDays / 30)} months). Maximum allowed is 365 days. Try narrowing the scope.`;
    }

    return res.json(parsed);
  } catch (err: any) {
    console.error('[Goals analyze]', err);
    return res.status(500).json({ error: err.message || 'Goal analysis failed' });
  }
});

// ── POST /plan — Step 2: Generate feasibility report + milestone plan ──
router.post('/plan', async (req: Request, res: Response) => {
  try {
    const authUserId = getAuthenticatedUserId(req);
    if (!authUserId) return res.status(401).json({ error: 'Unauthorized' });

    const ai = getAI();
    const { goalText, category, estimatedDurationDays, interviewAnswers, playerStats, healthProfile, otherGoals, timezone } = req.body;

    if (!goalText || !category || !interviewAnswers) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const statsContext = playerStats ? `
Stats: STR ${playerStats.strength || 10}/100, INT ${playerStats.intelligence || 10}/100, DIS ${playerStats.discipline || 10}/100, SOC ${playerStats.social || 10}/100` : '';

    const calibrationContext = healthProfile ? `
Calibration: Age ${healthProfile.age ?? 'unknown'}, Activity ${healthProfile.activityLevel || 'MODERATE'},
  BMR ${healthProfile.bmr ?? 'unknown'} kcal/day, Weight ${healthProfile.weight ?? 'unknown'}kg,
  Daily Time: ${healthProfile.sessionDuration ?? 60} min, Equipment: ${healthProfile.equipment || 'BODYWEIGHT'}` : '';

    const otherGoalsContext = (otherGoals && otherGoals.length > 0)
      ? `Other Active Goals: ${otherGoals.map((g: any) => `"${g.title}" (${g.dailyCommitmentMin}min/day)`).join(', ')}`
      : 'No other active goals.';

    const otherGoalsMinutes = (otherGoals || []).reduce((sum: number, g: any) => sum + (g.dailyCommitmentMin || 0), 0);
    const dailyAvailable = healthProfile?.sessionDuration ?? 120;
    const remainingMinutes = Math.max(30, dailyAvailable - otherGoalsMinutes);

    const prompt = `You are ForgeGuard. Create a detailed, interconnected goal plan.

=== CONTEXT ===
Goal: "${goalText}"
Category: ${category}
Estimated Duration: ${estimatedDurationDays} days
${statsContext}
${calibrationContext}
Interview Answers: ${JSON.stringify(interviewAnswers)}
${otherGoalsContext}

=== PLANNING RULES ===
1. INTERCONNECTED MILESTONES: Each phase must build on the previous. Phase 2 assumes Phase 1 knowledge/habits are established.
2. PROGRESSIVE DIFFICULTY: Phase 1 is the easiest (habit building), final phase is the hardest (peak performance).
3. HUMAN-PRACTICAL: Total daily commitment across ALL active goals must not exceed the user's stated available time.
   - User has ${dailyAvailable} min/day total
   - Other goals already consume ${otherGoalsMinutes} min/day
   - This goal gets max ${remainingMinutes} min/day
4. SMART DURATION: Calculate based on real-world data:
   - Weight loss: 0.5-1kg/week safe rate, adjusted for user's BMR and activity
   - Academic: syllabus size / (effective study hours x retention rate)
   - Financial: realistic growth curves
   - Fitness: progressive overload timelines
5. REST BUILT IN: Include recovery/rest periods. No 7-day-a-week intensity.
6. Each milestone must have sample daily task patterns that CONNECT day-to-day.
7. Generate 4-6 milestones for goals >90 days, 3-4 for shorter goals.

=== RESPONSE FORMAT (JSON only, no markdown) ===
{
  "goalRank": "B",
  "successProbability": 72,
  "dailyCommitmentMinutes": 90,
  "totalDurationDays": 210,
  "smartDurationReasoning": "Detailed explanation of how the duration was calculated based on user's profile.",
  "riskFactors": ["Plateau around week 8-10", "Holiday season may disrupt routine"],
  "reasoning": "2-3 sentence honest assessment of the goal's feasibility for this user.",
  "milestones": [
    {
      "phase": 1,
      "title": "Foundation & Habit Building",
      "description": "Establish base routine. Target: initial progress.",
      "startDay": 1,
      "endDay": 30,
      "targetOutcome": "Specific measurable outcome for this phase",
      "sampleDailyPattern": ["Task 1 with specific target", "Task 2 with specific target", "Task 3"],
      "connectionToNext": "How this phase prepares for the next"
    }
  ],
  "weeklyRestDay": "Sunday"
}`;

    const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash-preview-05-20' });
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    logUsage({
      route: 'goals/plan',
      model: 'gemini-2.5-flash-preview-05-20',
      inputTokens: result.response.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: result.response.usageMetadata?.candidatesTokenCount ?? 0,
      success: true,
      userId: authUserId,
    });

    const cleaned = stripMarkdown(text);
    const parsed = JSON.parse(cleaned);

    // Enforce 365-day cap on plan output too
    if (parsed.totalDurationDays > 365) {
      parsed.totalDurationDays = 365;
      parsed.smartDurationReasoning += ' (Capped at 365 days — system maximum.)';
    }

    return res.json(parsed);
  } catch (err: any) {
    console.error('[Goals plan]', err);
    return res.status(500).json({ error: err.message || 'Plan generation failed' });
  }
});

// ── POST /daily-quests — Generate today's quests for an active goal ──
router.post('/daily-quests', async (req: Request, res: Response) => {
  try {
    const authUserId = getAuthenticatedUserId(req);
    if (!authUserId) return res.status(401).json({ error: 'Unauthorized' });

    const ai = getAI();
    const { goal, recentTasks, playerStats, otherGoalTasksToday, remainingMinutes, dayOfWeek } = req.body;

    if (!goal) {
      return res.status(400).json({ error: 'Goal data is required' });
    }

    const currentDay = Math.max(1, Math.floor((Date.now() - goal.startDate) / (1000 * 60 * 60 * 24)) + 1);
    const totalDays = goal.totalDurationDays;
    const percentComplete = Math.min(100, Math.round((currentDay / totalDays) * 100));

    // Find current milestone
    const milestone = (goal.milestones || []).find((m: any) =>
      currentDay >= m.startDay && currentDay <= m.endDay
    ) || goal.milestones?.[goal.currentMilestone || 0] || goal.milestones?.[0];

    const dayInPhase = milestone ? currentDay - milestone.startDay + 1 : currentDay;
    const phaseDuration = milestone ? milestone.endDay - milestone.startDay + 1 : totalDays;

    const recentContext = (recentTasks || []).slice(-7).map((t: any) =>
      `Day ${t.dayNumber}: tasks=[${t.quests?.map((q: any) => `"${q.title}"(${q.completed ? 'DONE' : 'MISSED'})`).join(', ')}]`
    ).join('\n  ');

    const prompt = `You are ForgeGuard generating today's goal quests.

=== CONTEXT ===
Goal: "${goal.title}" — Day ${currentDay}/${totalDays} (${percentComplete}% complete)
Category: ${goal.category}
Current Milestone: Phase ${milestone?.phase || 1} - "${milestone?.title || 'In Progress'}" (Day ${dayInPhase}/${phaseDuration})
Sample Daily Pattern for this phase: ${JSON.stringify(milestone?.sampleDailyPattern || [])}

=== CONTINUITY DATA (recent days) ===
${recentContext || 'No previous data (Day 1)'}

=== USER STATE ===
Stats: STR ${playerStats?.strength || 10}, INT ${playerStats?.intelligence || 10}, DIS ${playerStats?.discipline || 10}
Day of Week: ${dayOfWeek || new Date().toLocaleDateString('en-US', { weekday: 'long' })}
Other goals' tasks today: ${otherGoalTasksToday || 'None'}
Remaining available time: ${remainingMinutes || 90} min
Weekly Rest Day: ${goal.weeklyRestDay || 'Sunday'}

=== RULES ===
1. INTERCONNECTED: Today's tasks must logically follow yesterday's. Reference what was done/missed.
   - If user completed a reading task yesterday → today include practice/application of that material
   - If user MISSED a task yesterday → include a lighter catch-up version today
2. PRACTICAL TOTAL: All tasks combined must fit within ${remainingMinutes || 90} minutes.
3. PROGRESSIVE: If early in the phase, tasks are easier. If late in phase, expect growing competence.
4. REST DAY: If today is the designated rest day (${goal.weeklyRestDay || 'Sunday'}), generate only 1 light/recovery task.
5. VARIETY: Don't repeat the exact same task title 3 days in a row. Vary the approach.
6. Each quest must have a specific, measurable target (time, reps, pages, distance, etc.)
7. Generate 2-4 quests.

=== RESPONSE FORMAT (JSON only, no markdown) ===
{
  "quests": [
    {
      "title": "Specific task with measurable target",
      "estimatedDuration": 45,
      "categories": ["intelligence"],
      "rank": "D",
      "xp": 50,
      "reasoning": "Why this task matters for the goal today",
      "connectionToPrevious": "How this connects to yesterday's work"
    }
  ],
  "dailyNote": "Brief motivational or practical note for today.",
  "progressUpdate": "Phase X, Day Y. Progress summary."
}`;

    // Use Flash for daily generation (cheap + fast)
    const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    logUsage({
      route: 'goals/daily-quests',
      model: 'gemini-2.0-flash',
      inputTokens: result.response.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: result.response.usageMetadata?.candidatesTokenCount ?? 0,
      success: true,
      userId: authUserId,
    });

    const cleaned = stripMarkdown(text);
    const parsed = JSON.parse(cleaned);

    // Add IDs to quests
    if (parsed.quests) {
      parsed.quests = parsed.quests.map((q: any, i: number) => ({
        ...q,
        id: `goal-quest-${goal.id}-${Date.now()}-${i}`,
        completed: false,
      }));
    }

    return res.json(parsed);
  } catch (err: any) {
    console.error('[Goals daily-quests]', err);
    return res.status(500).json({ error: err.message || 'Daily quest generation failed' });
  }
});

export default router;
