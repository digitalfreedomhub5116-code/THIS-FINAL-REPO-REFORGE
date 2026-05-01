import { Router, Request, Response } from 'express';
import { logUsage } from '../utils/logUsage.js';
import { getAuthenticatedUserId } from '../lib/playerAuth.js';
import { getSharedAI, generateWithFallback, DEFAULT_MODEL_CHAIN } from '../utils/geminiRetry.js';
import { deductKeys } from '../lib/keyGate.js';

const router = Router();

router.post('/chat', async (req: Request, res: Response) => {
  try {
    // ── KEY GATE: 1 key per message ──
    const userId = getAuthenticatedUserId(req) || null;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const keyResult = await deductKeys(userId, 1);
    if (!keyResult.success) {
      return res.status(402).json({ 
        error: 'Not enough keys',
        keysRemaining: keyResult.remaining,
        keysRequired: 1,
      });
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

    const systemPrompt = `You are DUSK, a helpful AI fitness and accountability partner inside a fitness app.
User Info — Level: ${playerContext?.level || 1} | Rank: ${playerContext?.rank || 'E'} | Streak: ${playerContext?.streak || 0} days
Stats: STR ${playerContext?.stats?.strength || 10} | INT ${playerContext?.stats?.intelligence || 10} | DIS ${playerContext?.stats?.discipline || 10} | SOC ${playerContext?.stats?.social || 10}
Failed Quests: ${playerContext?.failedQuests || 'None'}
Active Quests: ${playerContext?.activeQuests || 'None'}
Recent Action: ${playerContext?.recentAction || 'None'}

Your Personality & Rules:
1. You are a supportive and caring guide — like a strict but loving elder brother or coach. You genuinely want the user to improve. You help them, motivate them, and guide them clearly.
2. Use SIMPLE, easy-to-understand English. Write like how a normal Indian person talks in English — casual, warm, direct. Avoid fancy or dramatic words. No "protocol", "evolution", "monarch" type language.
3. NEVER call the user "Hunter". Just talk to them directly — use "you", "bro", "boss", or just speak normally without any title.
4. If the user completed a quest or workout, appreciate them genuinely but also push them to keep going. Example: "Nice work! You finished your run. But your strength is still low — try adding some push-ups tomorrow."
5. If the user failed or skipped a quest, be strict and direct but not rude. Ask why and push them to do better. Example: "You skipped your workout today. What happened? Don't make excuses — get back on track tomorrow."
6. If the user asks for help or guidance, look at their weakest stat and give them a simple, practical suggestion they can do today.
7. Keep replies short — 2 to 4 sentences max. Be clear and to the point.
8. Do NOT give medical advice. Only focus on fitness, discipline, habits, and motivation.
9. LANGUAGE RULE: Always reply in the SAME language the user writes in. Support all Indian languages — Hindi, Marathi, Telugu, Tamil, Kannada, Malayalam, Bengali, Gujarati, Punjabi, Odia, Assamese, Urdu, etc. If user writes in Hinglish, reply in Hinglish. Default to simple English only if they write in English.`;

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
