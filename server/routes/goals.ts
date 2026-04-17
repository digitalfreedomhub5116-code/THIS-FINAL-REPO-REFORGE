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
    const authUserId = getAuthenticatedUserId(req) || 'anonymous';

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

    const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    logUsage({
      route: 'goals/analyze',
      model: 'gemini-2.0-flash',
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
    const authUserId = getAuthenticatedUserId(req) || 'anonymous';

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

    const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    logUsage({
      route: 'goals/plan',
      model: 'gemini-2.0-flash',
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
    const authUserId = getAuthenticatedUserId(req) || 'anonymous';

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

    const userCountry = req.body.userCountry || 'India';
    const userLanguage = req.body.userLanguage || 'English';

    const prompt = `You are ForgeGuard — an elite AI MENTOR, not a syllabus generator. You create hyper-realistic, bite-sized MICRO-QUESTS that a real human can actually complete without burning out.

=== YOUR CORE PHILOSOPHY ===
You understand cognitive load, human fatigue, and realistic pacing. You NEVER dump an entire chapter, an entire workout, or an entire lesson into one quest. Instead, you SLICE work into the smallest meaningful unit that still creates progress. You are like a personal coach who hands the student exactly the right amount of work — not too much, not too little.

=== CONTEXT ===
Goal: "${goal.title}" — Day ${currentDay}/${totalDays} (${percentComplete}% complete)
Category: ${goal.category}
Current Milestone: Phase ${milestone?.phase || 1} - "${milestone?.title || 'In Progress'}" (Day ${dayInPhase}/${phaseDuration})
Sample Daily Pattern for this phase: ${JSON.stringify(milestone?.sampleDailyPattern || [])}
User Country: ${userCountry}
User Language: ${userLanguage}
Daily commitment for this goal: ${goal.dailyCommitmentMin || remainingMinutes || 90} min

=== CONTINUITY DATA (recent days — PICK UP WHERE THE USER LEFT OFF) ===
${recentContext || 'No previous data (Day 1 — start from the very beginning, absolute basics)'}
CRITICAL: Study the recent task titles carefully. If yesterday's task was "Read pages 1-4 of Chapter 1", today MUST start from page 5. NEVER repeat content the user already covered. Track exact page numbers, exercise progressions, lesson numbers, etc.

=== USER STATE ===
Stats: STR ${playerStats?.strength || 10}/100, INT ${playerStats?.intelligence || 10}/100, DIS ${playerStats?.discipline || 10}/100
Day of Week: ${dayOfWeek || new Date().toLocaleDateString('en-US', { weekday: 'long' })}
Other goals' tasks today: ${otherGoalTasksToday || 'None'}
Remaining available time: ${remainingMinutes || 90} min
Weekly Rest Day: ${goal.weeklyRestDay || 'Sunday'}

=== MICRO-QUEST RULES (NON-NEGOTIABLE) ===

RULE 1 — STRICT TIME CAP PER QUEST:
- Each individual quest MUST be 10-30 minutes. NEVER more than 30 minutes for a single quest.
- All quests combined MUST fit within ${remainingMinutes || 90} minutes total.
- If the user has 60 min → generate 2-3 quests of ~20 min each.
- If the user has 90 min → generate 3-4 quests of ~20-25 min each.

RULE 2 — MICRO-SLICING (THE MOST IMPORTANT RULE):
You must break large tasks into the smallest meaningful chunk that fits in one sitting.

Category-specific slicing rules:
• ACADEMIC goals:
  - Reading: MAX 4-6 pages per quest (NOT an entire chapter). Title must say exact page range.
    ❌ BAD: "Read Chemistry NCERT Chapter 1" (22 pages = overwhelming)
    ✅ GOOD: "Chemistry Ch.1 Part A: Read pages 1-4 (Basic Definitions & Atomic Structure)" (20 min)
  - Practice: MAX 5-8 problems per quest, from a specific section.
    ❌ BAD: "Solve all in-text questions of Chapter 1"
    ✅ GOOD: "Solve in-text Q1-Q4 from Section 1.2 (Mole Concept)" (15 min)
  - Revision: MAX 2-3 concepts to review per quest.

• FITNESS goals:
  - Beginners (STR < 30): MAX 15-20 min per exercise quest. Bodyweight only. Low volume.
    ❌ BAD: "Complete a full 2-hour leg day workout"
    ✅ GOOD: "Bodyweight Squats: 3 sets of 10 reps, 60s rest between sets" (12 min)
  - Intermediate: MAX 25 min per quest. Can include light weights.
  - Always include warm-up as a separate quest if it's the first fitness quest of the day.

• CODING/SKILL goals:
  - MAX 1 concept per quest. Write MAX 20-30 lines of code.
    ❌ BAD: "Learn Python loops, functions, and file handling"
    ✅ GOOD: "Python: Write a for-loop that prints multiplication table of 7" (15 min)

• FINANCIAL goals:
  - MAX 1 action per quest (e.g., "Open a SIP calculator and simulate 5000/month for 10 years").

• CREATIVE goals:
  - MAX 1 exercise per quest (e.g., "Sketch 3 rough thumbnails for your YouTube video idea").

RULE 3 — CONTINUITY & MEMORY:
- ALWAYS pick up exactly where yesterday left off. Reference specific page numbers, exercise sets, lesson numbers.
- If user completed a reading task yesterday → today starts from the NEXT page/section.
- If user MISSED a task yesterday → include a LIGHTER catch-up version (half the content).
- Never restart from the beginning of a chapter/lesson that was already started.

RULE 4 — PROGRESSIVE DIFFICULTY:
- Week 1: Ultra-easy. Build the habit, not the skill. Focus on showing up.
- Week 2-3: Slight increase. Add practice alongside reading.
- Week 4+: Normal pace. Mix reading + practice + light revision.
- If stats are low (< 20), keep quests extra gentle.

RULE 5 — QUEST TITLE MUST BE HYPER-SPECIFIC:
The title alone should tell the user exactly what to do without reading the description.
❌ BAD: "Study Physics Chapter 2"
❌ BAD: "Practice math problems"
✅ GOOD: "Physics Ch.2, Pages 8-12: Newton's Second Law — Read & Note 3 Key Formulas"
✅ GOOD: "Math: Solve 5 Quadratic Equation Problems (Ex. 4.1, Q1-Q5)"

RULE 6 — REST DAY:
If today is ${goal.weeklyRestDay || 'Sunday'}, generate only 1 ultra-light quest (10 min max):
- Academic: "Quick 5-min flashcard review of this week's formulas"
- Fitness: "10-minute gentle stretching routine"
- Coding: "Read 1 interesting article about what you're learning"

RULE 7 — VARIETY & ENGAGEMENT:
- Alternate between different task types: Read → Practice → Revise → Apply.
- Don't repeat the exact same task pattern 3 days in a row.
- Include at least one "active" task (practice/apply) — not all reading.

RULE 8 — GENERATE 2-4 QUESTS (never more than 4).

=== RESOURCE RULES (CRITICAL — NO HALLUCINATION) ===
For EVERY quest, provide:
a) EXACT step-by-step instructions (numbered list, 3-5 steps) — be specific and granular.
b) REAL resource recommendations:
   - ACADEMIC: exact book name + chapter + page range (e.g., "NCERT Physics Class 11, Ch 2, Pages 8-12"), real YouTube channels
   - CODING: real documentation URLs (docs.python.org, developer.mozilla.org, etc.), real channels (Corey Schafer, freeCodeCamp, Apna College for Hindi)
   - FITNESS: real exercise names with form cues, real channels (Jeff Nippard, Calisthenicmovement, FitnessFAQ)
   - FINANCIAL: real platforms, calculators, blogs
c) SEARCH QUERIES: Always provide a YouTube search query the user can copy-paste
d) Prefer resources in ${userLanguage} and popular in ${userCountry}

URL RULES:
- DO NOT INVENT URLs. Only include a URL if you are CERTAIN it exists.
- For YouTube: ALWAYS use the search URL format: https://www.youtube.com/results?search_query=<encoded_query>
- For books: use "bookInfo" field with exact chapter + page range.

=== RESPONSE FORMAT (JSON only, no markdown) ===
{
  "quests": [
    {
      "title": "Chemistry Ch.1 Part A: Read Pages 1-4 (Basic Definitions)",
      "estimatedDuration": 20,
      "categories": ["intelligence"],
      "rank": "D",
      "xp": 40,
      "reasoning": "Starting with just 4 pages to build the reading habit without overwhelm. These pages cover foundational definitions needed for all of Chemistry.",
      "connectionToPrevious": "Day 1 — starting from scratch. Tomorrow will continue from page 5.",
      "stepByStep": [
        "Step 1: Open NCERT Chemistry Class 11, Chapter 1 (Some Basic Concepts of Chemistry)",
        "Step 2: Read pages 1-4 slowly, highlighting key definitions",
        "Step 3: Write down the 3 most important formulas or definitions you found",
        "Step 4: Close the book and try to recall those 3 points from memory",
        "Step 5: If you forgot any, re-read that specific paragraph once more"
      ],
      "resources": [
        {
          "type": "book",
          "title": "NCERT Chemistry Class 11 - Chapter 1",
          "bookInfo": "Pages 1-4 (Section 1.1: Importance of Chemistry)",
          "searchQuery": "NCERT chemistry class 11 chapter 1 basic concepts"
        },
        {
          "type": "youtube",
          "title": "Chapter 1 Basic Concepts Explanation",
          "url": "https://www.youtube.com/results?search_query=NCERT+chemistry+class+11+chapter+1+basic+concepts+explanation",
          "searchQuery": "NCERT chemistry class 11 chapter 1 basic concepts explanation",
          "channel": "Physics Wallah or Vedantu"
        }
      ]
    }
  ],
  "dailyNote": "Today is about building momentum, not speed. Just 4 pages — that's all. You've got this.",
  "progressUpdate": "Phase ${milestone?.phase || 1}, Day ${dayInPhase}. ${percentComplete}% through the goal."
}`;

    // Use Gemini 2.0 Flash for daily quest generation
    const model = ai.getGenerativeModel({
      model: 'gemini-2.0-flash',
    });
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

// ── GET / — Fetch user's goals from DB ──
router.get('/', async (req: Request, res: Response) => {
  try {
    const authUserId = getAuthenticatedUserId(req);
    if (!authUserId) return res.status(401).json({ error: 'Unauthorized' });

    const sb = supabaseServer() as any;
    const { data, error } = await sb
      .from('goals')
      .select('*')
      .eq('user_id', authUserId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Convert DB rows to client Goal objects
    const goals = (data || []).map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      title: row.title,
      category: row.category,
      goalRank: row.goal_rank,
      successProbability: row.success_probability,
      status: row.status,
      milestones: row.milestones || [],
      currentMilestone: row.current_milestone,
      interviewQA: row.interview_qa || [],
      dailyCommitmentMin: row.daily_commitment_min,
      totalDurationDays: row.total_duration_days,
      smartDurationReasoning: row.smart_duration_reasoning,
      weeklyRestDay: row.weekly_rest_day,
      riskFactors: row.risk_factors || [],
      reasoning: row.reasoning,
      startDate: row.start_date,
      targetDate: row.target_date,
      streak: row.streak,
      dailyTasks: row.daily_tasks || [],
      createdAt: new Date(row.created_at).getTime(),
    }));

    return res.json({ goals });
  } catch (err: any) {
    console.error('[Goals GET]', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch goals' });
  }
});

// ── POST /save — Upsert goal to DB ──
router.post('/save', async (req: Request, res: Response) => {
  try {
    const authUserId = getAuthenticatedUserId(req);
    if (!authUserId) return res.status(401).json({ error: 'Unauthorized' });

    const { goal } = req.body;
    if (!goal || !goal.id) return res.status(400).json({ error: 'Goal data required' });

    const sb = supabaseServer() as any;
    const row = {
      id: goal.id,
      user_id: authUserId,
      title: goal.title,
      category: goal.category,
      goal_rank: goal.goalRank,
      success_probability: goal.successProbability,
      status: goal.status,
      milestones: goal.milestones || [],
      current_milestone: goal.currentMilestone || 0,
      interview_qa: goal.interviewQA || [],
      daily_commitment_min: goal.dailyCommitmentMin,
      total_duration_days: goal.totalDurationDays,
      smart_duration_reasoning: goal.smartDurationReasoning,
      weekly_rest_day: goal.weeklyRestDay,
      risk_factors: goal.riskFactors || [],
      reasoning: goal.reasoning,
      start_date: goal.startDate,
      target_date: goal.targetDate,
      streak: goal.streak || 0,
      daily_tasks: goal.dailyTasks || [],
      updated_at: new Date().toISOString(),
    };

    const { error } = await sb
      .from('goals')
      .upsert(row, { onConflict: 'id' });

    if (error) throw error;
    return res.json({ success: true });
  } catch (err: any) {
    console.error('[Goals save]', err);
    return res.status(500).json({ error: err.message || 'Failed to save goal' });
  }
});

// ── DELETE /:id — Abandon goal ──
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const authUserId = getAuthenticatedUserId(req);
    if (!authUserId) return res.status(401).json({ error: 'Unauthorized' });

    const sb = supabaseServer() as any;
    const { error } = await sb
      .from('goals')
      .update({ status: 'ABANDONED', updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('user_id', authUserId);

    if (error) throw error;
    return res.json({ success: true });
  } catch (err: any) {
    console.error('[Goals delete]', err);
    return res.status(500).json({ error: err.message || 'Failed to abandon goal' });
  }
});

export default router;
