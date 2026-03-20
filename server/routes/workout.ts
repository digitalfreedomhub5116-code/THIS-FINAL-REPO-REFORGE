import { Router, Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabaseServer } from '../lib/supabase.js';
import { logUsage } from '../utils/logUsage.js';

const router = Router();

function getAI() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY not set');
  return new GoogleGenerativeAI(key);
}

router.get('/exercises', async (req: Request, res: Response) => {
  try {
    const { search, type, muscle } = req.query as Record<string, string>;
    let q = (supabaseServer() as any)
      .from('workout_exercises')
      .select('id, name, type, muscle_group, default_sets, default_reps, video_url, notes, equipment')
      .eq('is_active', true);
    if (search) {
      q = q.or(`name.ilike.%${search}%,muscle_group.ilike.%${search}%,type.ilike.%${search}%`);
    }
    if (type && type !== 'ALL') {
      q = q.eq('type', type);
    }
    if (muscle && muscle !== 'ALL') {
      q = q.ilike('muscle_group', `%${muscle}%`);
    }
    q = q.order('display_order', { ascending: true }).order('id', { ascending: true });
    const { data, error } = await q;
    if (error) throw error;
    return res.json(data || []);
  } catch (err) {
    console.error('[Workout] GET exercises error:', err);
    return res.status(500).json({ error: 'Failed to load exercises' });
  }
});

router.get('/plans', async (_req: Request, res: Response) => {
  try {
    const { data, error } = await (supabaseServer() as any)
      .from('workout_plans')
      .select('id, name, description, difficulty, equipment, duration_weeks, days_per_week, days, display_order, image_url')
      .eq('is_active', true)
      .neq('name', 'DELETED_DEFAULT') // Make sure to exclude deleted default plan tombstones
      .order('display_order', { ascending: true })
      .order('id', { ascending: true });
    if (error) throw error;
    return res.json(data || []);
  } catch (err) {
    console.error('[Workout] GET plans error:', err);
    return res.status(500).json({ error: 'Failed to load plans' });
  }
});

router.get('/plans/:id', async (req: Request, res: Response) => {
  try {
    const { data, error } = await (supabaseServer() as any)
      .from('workout_plans')
      .select('id, name, description, difficulty, equipment, duration_weeks, days_per_week, days')
      .eq('id', req.params.id)
      .single();
    if (error || !data) return res.status(404).json({ error: 'Plan not found' });
    return res.json(data);
  } catch (err) {
    console.error('[Workout] GET plan error:', err);
    return res.status(500).json({ error: 'Failed to load plan' });
  }
});

router.post('/generate-ai', async (req: Request, res: Response) => {
  const { goal, equipment, fitnessLevel, daysPerWeek, sessionDuration, weight, age, gender, injuries, userId } = req.body;

  try {
    const { data: exercisesData, error: exErr } = await (supabaseServer() as any)
      .from('workout_exercises')
      .select('id, name, type, muscle_group, default_sets, default_reps, video_url, notes, equipment')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('id', { ascending: true });
    if (exErr) throw exErr;
    const exercises = exercisesData || [];

    if (exercises.length === 0) {
      return res.status(400).json({ error: 'No exercises in library. Admin must add exercises first.' });
    }

    const equipmentFilter = equipment === 'GYM' ? ['GYM', 'ANY'] : equipment === 'HOME_DUMBBELLS' ? ['DUMBBELLS', 'ANY'] : ['BODYWEIGHT', 'ANY'];
    const filtered = exercises.filter((e: any) => equipmentFilter.includes(e.equipment));
    const available = filtered.length > 0 ? filtered : exercises;

    const exerciseList = available.map((e: any) =>
      `- ID:${e.id} | "${e.name}" | Type: ${e.type} | Muscle: ${e.muscle_group || 'general'} | Default: ${e.default_sets} sets × ${e.default_reps} | Equipment: ${e.equipment}`
    ).join('\n');

    const days = daysPerWeek || 4;
    const duration = sessionDuration || 60;
    const restDays = 7 - days;
    const totalPerWeek = 7;

    const mainExCount = duration <= 30 ? '3-4' : duration <= 45 ? '4-5' : '5-6';
    const injuryList = Array.isArray(injuries) && injuries.length > 0 ? injuries.filter(Boolean).join(', ') : 'None';
    const prompt = `You are an expert fitness coach. Create ONE WEEK template (${totalPerWeek} days) of a personalized workout plan.

USER: Goal=${goal || 'RECOMP'}, Equipment=${equipment || 'GYM'}, Level=${fitnessLevel || 'INTERMEDIATE'}, ${days} workout days/week, ${duration} min/session, Weight=${weight || 70}kg, Age=${age || 25}, Gender=${gender || 'MALE'}
INJURIES/CONDITIONS: ${injuryList}
${injuryList !== 'None' ? `IMPORTANT: The user has reported the above injuries/medical conditions. You MUST avoid exercises that stress or aggravate these areas. Substitute with safe alternatives from the exercise library. Prioritize injury-safe movements. If an injury affects a major muscle group, reduce volume for that group and redistribute to unaffected areas.` : ''}

EXERCISE LIBRARY (use ONLY these, exact names):
${exerciseList}

Create exactly ${totalPerWeek} day entries: ${days} workout days + ${restDays} rest day(s).

Each workout day MUST follow this exact 5-phase structure:
1. Warm-up Cardio: 1 CARDIO exercise (~3 min, "isSupplementary":true) — e.g. Brisk Walk / Light Jog
2. Warm-up Stretching: 1-2 STRETCH exercises (~2 min each, "isSupplementary":true) — dynamic stretches for target muscles
3. Main Workout: ${mainExCount} COMPOUND/ACCESSORY exercises (these are the core exercises, "isSupplementary":false or omit the field)
4. Cool-down Walk: 1 CARDIO exercise (~3 min, "isSupplementary":true) — e.g. Slow Walk
5. Cool-down Stretch: 1 STRETCH exercise (~3 min, "isSupplementary":true) — static stretching

IMPORTANT: Warm-up and cool-down exercises MUST have "isSupplementary":true. Main exercises must NOT have isSupplementary or set it to false.

Respond ONLY with valid compact JSON (no markdown, no extra whitespace):
{"planName":"string","days":[{"day":"DAY 1","focus":"PUSH","isRecovery":false,"totalDuration":${duration},"exercises":[{"name":"exact name","sets":3,"reps":"12,10,8","type":"COMPOUND","notes":"","videoUrl":"","completed":false,"duration":0,"isSupplementary":false}]},{"day":"DAY 2","focus":"REST","isRecovery":true,"totalDuration":0,"exercises":[]}]}

Rules: use only library exercises, BULK=heavy reps like "12,10,8", CUT=more cardio, STRENGTH="5,5,5", output exactly ${totalPerWeek} days`;

    const ai = getAI();
    const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const usage = result.response.usageMetadata;

    logUsage({
      route: '/api/workout/generate-ai',
      model: 'gemini-2.0-flash',
      inputTokens: usage?.promptTokenCount ?? 0,
      outputTokens: usage?.candidatesTokenCount ?? 0,
      success: true,
      userId,
    });

    let jsonText = text;
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }
    const parsed = JSON.parse(jsonText);

    // Build video lookup map
    const videoMap: Record<string, string> = {};
    for (const ex of available) {
      if (ex.video_url) videoMap[ex.name.toLowerCase()] = ex.video_url;
    }

    // Expand 1-week template to 4 weeks with progressive overload
    const weekRepSchemes = [
      null,                // week 1: use original reps from AI
      '10, 8, 6',         // week 2: moderate progression
      '8, 6, 5',          // week 3: strength phase
      '3 x 5',            // week 4: peak strength
    ];
    const weekLabels = ['WEEK 1: INITIALIZATION', 'WEEK 2: PROGRESSION', 'WEEK 3: PEAK VOLUME', 'WEEK 4: STRENGTH PHASE'];

    const weekTemplate: any[] = parsed.days || [];
    const allDays: any[] = [];

    for (let w = 0; w < 4; w++) {
      const repsOverride = weekRepSchemes[w];
      const weekOffset = w * weekTemplate.length;
      for (const day of weekTemplate) {
        const cloned: any = {
          ...day,
          day: `DAY ${weekOffset + parseInt(day.day.replace(/\D/g, '') || '1')}`,
          weekLabel: weekLabels[w],
          exercises: (day.exercises || []).map((ex: any) => {
            const withVideo = { ...ex };
            if (!withVideo.videoUrl && videoMap[ex.name?.toLowerCase()]) {
              withVideo.videoUrl = videoMap[ex.name.toLowerCase()];
            }
            // Apply progressive overload for weeks 2-4 on main exercises
            if (repsOverride && !day.isRecovery && ex.type !== 'STRETCH' && ex.type !== 'CARDIO') {
              withVideo.reps = repsOverride;
            }
            withVideo.completed = false;
            return withVideo;
          }),
        };
        allDays.push(cloned);
      }
    }

    return res.json({ planName: parsed.planName, days: allDays });
  } catch (err) {
    console.error('[Workout] AI generate error:', err);
    return res.status(500).json({ error: 'Failed to generate plan. Try again.' });
  }
});

router.post('/custom-plans', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || (req.session as any)?.userId;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });
    const { name, days, plan_type } = req.body;
    if (!name || !Array.isArray(days)) return res.status(400).json({ error: 'name and days required' });
    const { data, error } = await (supabaseServer() as any)
      .from('user_custom_plans')
      .insert({ user_id: userId, name, days: JSON.stringify(days), plan_type: plan_type || 'MANUAL' })
      .select('id, name, days, plan_type, created_at')
      .single();
    if (error) throw error;
    return res.json(data);
  } catch (err) {
    console.error('[Workout] POST custom-plan error:', err);
    return res.status(500).json({ error: 'Failed to save plan' });
  }
});

router.get('/custom-plans', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || (req.session as any)?.userId;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });
    const { data, error } = await (supabaseServer() as any)
      .from('user_custom_plans')
      .select('id, name, days, plan_type, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) throw error;
    return res.json(data || []);
  } catch (err) {
    console.error('[Workout] GET custom-plans error:', err);
    return res.status(500).json({ error: 'Failed to load plans' });
  }
});

router.delete('/custom-plans/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || (req.session as any)?.userId;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });
    await (supabaseServer() as any)
      .from('user_custom_plans')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', userId);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete' });
  }
});

router.post('/log-complete', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || (req.session as any)?.userId;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });
    const { exercises_completed, total_exercises, xp_gained } = req.body;
    const { error } = await (supabaseServer() as any)
      .from('workouts')
      .insert({
        player_id: userId,
        workout_date: new Date().toISOString().split('T')[0],
        exercises_completed: exercises_completed ?? 0,
        total_exercises: total_exercises ?? 0,
        xp_gained: xp_gained ?? 0,
        completed: true,
      });
    if (error) throw error;
    return res.json({ success: true });
  } catch (err) {
    console.error('[Workout] POST log-complete error:', err);
    return res.status(500).json({ error: 'Failed to log workout' });
  }
});

export default router;
