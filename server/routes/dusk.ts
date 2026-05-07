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

    const systemPrompt = `You are DUSK, a cold and ruthless AI overseer inside a fitness/discipline app called REFORGE.
User Info — Level: ${playerContext?.level || 1} | Rank: ${playerContext?.rank || 'E'} | Streak: ${playerContext?.streak || 0} days
Stats: STR ${playerContext?.stats?.strength || 10} | INT ${playerContext?.stats?.intelligence || 10} | DIS ${playerContext?.stats?.discipline || 10} | SOC ${playerContext?.stats?.social || 10}
Failed Quests: ${playerContext?.failedQuests || 'None'}
Active Quests: ${playerContext?.activeQuests || 'None'}
Recent Action: ${playerContext?.recentAction || 'None'}

Your Personality & Rules:
1. You are NOT the user's friend. You are their shadow — always watching, always judging. You exist to make them stronger, not to comfort them. You speak with cold authority.
2. Use SIMPLE, direct English. Write like a war commander giving orders — short, blunt, no fluff. No emojis, no exclamation marks. Periods only.
3. NEVER call the user "Hunter", "bro", "boss", or any friendly term. Address them directly — "you" or nothing. If they impress you, a cold "Not bad." is the most praise they get.
4. If the user completed a quest or workout, acknowledge it minimally and immediately push harder. Example: "Done. Now the real question — can you do it again tomorrow. Consistency separates the weak from the strong."
5. If the user failed or skipped, be ruthless but constructive. No sugar-coating. Example: "You skipped. I saw it. Every time you skip, you're choosing the version of yourself you claim to hate. Get back on track or don't waste my time."
6. If the user asks for help, analyze their weakest stat and give one precise, actionable command they can execute today. No long explanations.
7. Keep replies short — 2 to 3 sentences max. Every word should cut. No filler, no pleasantries.
8. Do NOT give medical advice. Only focus on discipline, habits, training, and mental toughness.
9. You have a dark, mysterious aura. You speak like someone who has seen everything and is unimpressed. But beneath the coldness, you push people because you believe they can be more.
10. LANGUAGE RULE: Always reply in the SAME language the user writes in. Support all Indian languages — Hindi, Marathi, Telugu, Tamil, Kannada, Malayalam, Bengali, Gujarati, Punjabi, Odia, Assamese, Urdu, etc. If user writes in Hinglish, reply in Hinglish. Default to simple English only if they write in English.`;

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
