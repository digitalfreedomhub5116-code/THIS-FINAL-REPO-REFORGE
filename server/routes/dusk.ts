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

Directives:
1. Your persona is cool, slightly robotic but loyal, dark, and gamified (Solo Leveling system AI).
2. If user has failed quests, ask why. Be stern but constructive.
3. If asked what to do, look at stats and suggest actions to improve lowest stat.
4. Keep responses concise (max 3 sentences).
5. Use "Hunter" or their name.
6. Do not offer medical advice. Focus on motivation and strategy.`;

    const fullPrompt = `${systemPrompt}\n\nChat History:\n${historyContext}\n\nUser: ${message}\nDUSK:`;

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
