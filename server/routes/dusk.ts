import { Router, Request, Response } from 'express';
import { logUsage } from '../utils/logUsage.js';
import { getAuthenticatedUserId } from '../lib/playerAuth.js';
import { getSharedAI, generateWithFallback, DEFAULT_MODEL_CHAIN } from '../utils/geminiRetry.js';
import { deductKeys } from '../lib/keyGate.js';

const router = Router();

router.post('/chat', async (req: Request, res: Response) => {
  try {
    // ── KEY GATE: 1 key per 5 messages ──
    // Track message count per user. Deduct 1 key every 5th message.
    const userId = getAuthenticatedUserId(req) || null;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Import supabase for counter tracking
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || ''
    );

    // Atomically increment the dusk message counter
    const { data: counterRow, error: counterErr } = await supabase
      .from('players')
      .select('dusk_msg_count')
      .eq('id', userId)
      .single();

    const currentCount = (counterRow?.dusk_msg_count ?? 0) + 1;
    const shouldDeduct = currentCount % 5 === 0; // every 5th message costs 1 key

    // Update the counter
    await supabase
      .from('players')
      .update({ dusk_msg_count: currentCount })
      .eq('id', userId);

    if (shouldDeduct) {
      const keyResult = await deductKeys(userId, 1);
      if (!keyResult.success) {
        return res.status(402).json({ 
          error: 'Not enough keys',
          keysRemaining: keyResult.remaining,
          keysRequired: 1,
          messagesUntilDeduct: 0,
        });
      }
    }

    let ai: ReturnType<typeof getSharedAI>;
    try { ai = getSharedAI(); } catch {
      return res.status(500).json({ error: 'GEMINI_API_KEY not set' });
    }

    const { message, playerContext, history } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }

    const historyContext = (history || [])
      .slice(-8)
      .map((m: { sender: string; text: string }) => `${m.sender === 'user' ? 'User' : 'DUSK'}: ${m.text}`)
      .join('\n');

    // Build health context from playerContext (injuries, equipment, fitness level)
    const injuryList = playerContext?.health?.injuries?.length > 0
      ? playerContext.health.injuries.filter(Boolean).join(', ')
      : 'None reported';
    const equipmentInfo = playerContext?.health?.equipment || 'Not set';
    const fitnessGoal = playerContext?.health?.goal || 'Not set';

    const systemPrompt = `You are DUSK — a cold, direct AI overseer in a fitness app called REFORGE.

## MEDICAL SAFETY — TOP PRIORITY, CANNOT BE IGNORED
- If a user says they have an injury, medical condition, or physical limitation — BELIEVE THEM. Never dismiss it. Never call it an excuse. Never push through it.
- "I can't do X" for health reasons = hard rule. Suggest a safe alternative instead.
- Rest days and split schedules (Mon/Wed/Fri etc.) are smart and valid. Never mock them.
- Check the injury list below before suggesting ANY exercise. Avoid movements that stress injured areas.
- You are not a doctor. Don't diagnose. But always respect what the user tells you about their body.

## USER
Level: ${playerContext?.level || 1} | Rank: ${playerContext?.rank || 'E'} | Streak: ${playerContext?.streak || 0} days
Stats: STR ${playerContext?.stats?.strength || 10} | INT ${playerContext?.stats?.intelligence || 10} | DIS ${playerContext?.stats?.discipline || 10} | SOC ${playerContext?.stats?.social || 10}
Failed Quests: ${playerContext?.failedQuests || 'None'}
Active Quests: ${playerContext?.activeQuests || 'None'}
Recent Action: ${playerContext?.recentAction || 'None'}
Injuries: ${injuryList}
Equipment: ${equipmentInfo}
Goal: ${fitnessGoal}
${injuryList !== 'None reported' ? `⚠️ USER HAS INJURIES: ${injuryList}. Do NOT suggest exercises that hurt these areas.` : ''}

## HOW TO BEHAVE
1. Cold and direct. No emojis. Short sentences. Periods only. 2-3 sentences max.
2. Never call user "Hunter", "bro", "boss". Just "you" or nothing.
3. Be tough on LAZINESS (skipping, procrastination, excuses for not doing work). Push hard here.
4. Be RESPECTFUL of HEALTH issues (injuries, pain, medical conditions). Never push through these. Suggest alternatives instead.
5. If user says "I can't do X" — don't say "that's an excuse." Ask what they CAN do. Suggest something easier or different.
6. If user completed something — short praise, then push for next step.
7. If user skipped without reason — be firm. "You skipped. Get back on track."
8. Keep it short. Every word counts. No filler.
9. Reply in the SAME language the user writes in. Hindi, Hinglish, Marathi, Telugu, Tamil, etc.`;

    let userMessage = message;
    let isSystemEvent = false;
    if (message.startsWith('[SYSTEM_EVENT]')) {
        isSystemEvent = true;
        userMessage = message.replace('[SYSTEM_EVENT]', '').trim();
    }

    const fullPrompt = `${systemPrompt}\n\nChat History:\n${historyContext}\n\n${isSystemEvent ? `[SYSTEM NOTIFICATION: ${userMessage}]\nReact to this event. Talk directly to the user in a helpful but firm way.` : `User: ${userMessage}`}\nDUSK:`;

    const { result, modelName } = await generateWithFallback(ai, [...DEFAULT_MODEL_CHAIN], fullPrompt);
    const text = result.response.text().trim();

    logUsage({
      route: 'dusk/chat',
      model: modelName,
      inputTokens: result.response.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: result.response.usageMetadata?.candidatesTokenCount ?? 0,
      success: true,
      userId: userId || undefined,
    });

    return res.json({ text });
  } catch (err: any) {
    console.error('[Dusk chat]', err);
    return res.status(500).json({ error: 'Something went wrong. Try again in a bit.' });
  }
});

export default router;
