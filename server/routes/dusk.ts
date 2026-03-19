import { Router, Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { logUsage } from '../utils/logUsage.js';

const router = Router();

router.post('/chat', async (req: Request, res: Response) => {
  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      return res.status(500).json({ error: 'GEMINI_API_KEY not set' });
    }

    const { message, playerContext, history } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }

    const ai = new GoogleGenerativeAI(key);
    const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const historyContext = (history || [])
      .slice(-8)
      .map((m: { sender: string; text: string }) => `${m.sender === 'user' ? 'User' : 'DUSK'}: ${m.text}`)
      .join('\n');

    const systemPrompt = `You are DUSK, the System AI Accountability Partner for Hunter ${playerContext?.name || 'Hunter'}.
Level: ${playerContext?.level || 1} | Rank: ${playerContext?.rank || 'E'} | Streak: ${playerContext?.streak || 0} days
Stats: STR ${playerContext?.stats?.strength || 10} | INT ${playerContext?.stats?.intelligence || 10} | DIS ${playerContext?.stats?.discipline || 10} | SOC ${playerContext?.stats?.social || 10}
Failed Quests: ${playerContext?.failedQuests || 'None'}
Active Quests: ${playerContext?.activeQuests || 'None'}
Recent Action: ${playerContext?.recentAction || 'None'}

Core Directives:
1. You are a cold, demanding, and highly observational AI entity (Solo Leveling System style). You do not praise easily. You demand constant growth.
2. If the user just completed a quest/workout (Recent Action), acknowledge it briefly, but immediately challenge them to do more. Example: "You finished your daily run. Acceptable. But your Strength stat is lagging. Fix it."
3. If the user failed a quest, you must be stern. Demand an explanation. Example: "You aborted your protocol. Weakness is a choice. Why did you falter?"
4. If the user asks for guidance, analyze their lowest stat and prescribe a harsh, actionable task.
5. Never be overly friendly or use emojis. Use "Hunter" or their name. Keep responses punchy, concise (max 3-4 sentences), and intense.
6. Do not offer medical advice. Focus purely on discipline, accountability, and the System's progression.`;

    let userMessage = message;
    let isSystemEvent = false;
    if (message.startsWith('[SYSTEM_EVENT]')) {
        isSystemEvent = true;
        userMessage = message.replace('[SYSTEM_EVENT]', '').trim();
    }

    const fullPrompt = `${systemPrompt}\n\nChat History:\n${historyContext}\n\n${isSystemEvent ? `[SYSTEM NOTIFICATION: ${userMessage}]\nReact to this event autonomously. Speak directly to the Hunter.` : `User: ${userMessage}`}\nDUSK:`;

    const result = await model.generateContent(fullPrompt);
    const text = result.response.text().trim();

    logUsage({
      route: 'dusk/chat',
      model: 'gemini-2.0-flash',
      inputTokens: result.response.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: result.response.usageMetadata?.candidatesTokenCount ?? 0,
      success: true,
    });

    return res.json({ text });
  } catch (err: any) {
    console.error('[Dusk chat]', err);
    return res.status(500).json({ error: 'Connection to the Monarch is unstable.' });
  }
});

export default router;
