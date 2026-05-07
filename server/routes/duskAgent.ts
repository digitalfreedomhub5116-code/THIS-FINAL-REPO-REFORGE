import { Router, Request, Response } from 'express';
import Groq from 'groq-sdk';
import { logUsage } from '../utils/logUsage.js';
import { getAuthenticatedUserId } from '../lib/playerAuth.js';
import { getSharedAI, generateWithFallback, DEFAULT_MODEL_CHAIN } from '../utils/geminiRetry.js';
import { deductKeys } from '../lib/keyGate.js';
import { supabaseServer } from '../lib/supabase.js';

const router = Router();

// ── Groq client (lazy init) ──
let groqClient: Groq | null = null;
function getGroq(): Groq | null {
  if (!groqClient) {
    const key = process.env.GROQ_API_KEY;
    if (!key) return null;
    groqClient = new Groq({ apiKey: key });
  }
  return groqClient;
}

const GROQ_MODELS = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];

// ── Tool Definitions ──
const TOOLS: Groq.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'log_meal',
      description: 'Log a meal or food item to the nutrition tracker. Use this when the user mentions eating food. Always estimate calories and macros if the user doesn\'t provide exact numbers.',
      parameters: {
        type: 'object',
        properties: {
          label: { type: 'string', description: 'Human-readable description of the food (e.g. "4 slices large pepperoni pizza")' },
          calories: { type: 'number', description: 'Total calories' },
          protein: { type: 'number', description: 'Protein in grams' },
          carbs: { type: 'number', description: 'Carbs in grams' },
          fats: { type: 'number', description: 'Fats in grams' },
          mealType: { type: 'string', enum: ['BREAKFAST', 'LUNCH', 'SNACK', 'DINNER'], description: 'Meal category — infer from time of day if not specified' },
        },
        required: ['label', 'calories', 'protein', 'carbs', 'fats', 'mealType'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_workout',
      description: 'Create a custom workout plan with specific exercises. Use when user asks to create, build, or plan a workout.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Workout name (e.g. "Chest Crusher", "Quick Upper Body")' },
          focus: { type: 'string', description: 'Primary muscle group focus (e.g. "Chest & Triceps")' },
          exercises: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Exercise name' },
                sets: { type: 'number', description: 'Number of sets' },
                reps: { type: 'string', description: 'Reps per set (e.g. "10-12" or "30 sec")' },
                type: { type: 'string', enum: ['COMPOUND', 'ACCESSORY', 'CARDIO', 'STRETCH'], description: 'Exercise type' },
                notes: { type: 'string', description: 'Optional form tips or notes' },
              },
              required: ['name', 'sets', 'reps', 'type'],
            },
          },
          totalDuration: { type: 'number', description: 'Estimated total workout duration in minutes' },
        },
        required: ['name', 'focus', 'exercises', 'totalDuration'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_schedule',
      description: 'Update or set today\'s schedule with time-blocked slots. Use when user describes their day schedule or asks to modify it.',
      parameters: {
        type: 'object',
        properties: {
          slots: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                startTime: { type: 'string', description: 'Start time in HH:MM format' },
                endTime: { type: 'string', description: 'End time in HH:MM format' },
                label: { type: 'string', description: 'Activity label' },
                type: { type: 'string', enum: ['QUEST', 'WORKOUT', 'BLOCKED', 'MEAL', 'FREE', 'SLEEP', 'ROUTINE'], description: 'Slot type' },
              },
              required: ['startTime', 'endTime', 'label', 'type'],
            },
          },
        },
        required: ['slots'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_quest',
      description: 'Create a new quest/task for the user. Use when user wants to add a task, challenge, or activity to their quest list.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Quest title' },
          category: { type: 'string', enum: ['strength', 'intelligence', 'discipline', 'focus', 'social', 'willpower'], description: 'Primary stat category' },
          xpReward: { type: 'number', description: 'XP reward (10-50 based on difficulty)' },
          scheduledTime: { type: 'string', description: 'Optional scheduled time in HH:MM format' },
        },
        required: ['title', 'category', 'xpReward'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'navigate_to',
      description: 'Open/redirect the user to a specific section of the app. Include a clickable link in the chat.',
      parameters: {
        type: 'object',
        properties: {
          screen: { type: 'string', enum: ['WORKOUT', 'NUTRITION', 'SCHEDULE', 'GOALS', 'STORE', 'LEADERBOARD', 'HEALTH', 'QUESTS'], description: 'App section to navigate to' },
        },
        required: ['screen'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'log_weight',
      description: 'Update the user\'s body weight in their health profile.',
      parameters: {
        type: 'object',
        properties: {
          weight: { type: 'number', description: 'Weight in kg' },
        },
        required: ['weight'],
      },
    },
  },
];

// ── Build System Prompt ──
function buildSystemPrompt(ctx: any): string {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const dayStr = now.toLocaleDateString('en-IN', { weekday: 'long' });
  const hour = now.getHours();

  let defaultMealTime = 'SNACK';
  if (hour >= 5 && hour < 11) defaultMealTime = 'BREAKFAST';
  else if (hour >= 11 && hour < 15) defaultMealTime = 'LUNCH';
  else if (hour >= 15 && hour < 18) defaultMealTime = 'SNACK';
  else if (hour >= 18 && hour <= 23) defaultMealTime = 'DINNER';

  return `You are DUSK, an AI agent inside a fitness/life-tracking app called REFORGE. You don't just talk — you TAKE ACTIONS using the tools provided.
IMPORTANT: You MUST always include a text response along with any tool calls. Never return only tool calls without text.

## CURRENT TIME: ${timeStr}, ${dayStr}
## DEFAULT MEAL TYPE (based on time): ${defaultMealTime}

## PLAYER PROFILE
- Name: ${ctx.name || 'Hunter'} | Level: ${ctx.level || 1} | Rank: ${ctx.rank || 'E'}
- Streak: ${ctx.streak || 0} days | Gold: ${ctx.gold || 0} | Keys: ${ctx.keys || 0}
- Stats: STR ${ctx.stats?.strength || 10} | INT ${ctx.stats?.intelligence || 10} | DIS ${ctx.stats?.discipline || 10} | FOC ${ctx.stats?.focus || 10} | SOC ${ctx.stats?.social || 10} | WIL ${ctx.stats?.willpower || 10}

## HEALTH PROFILE
${ctx.health ? `- Weight: ${ctx.health.weight}kg | Height: ${ctx.health.height}cm | BMI: ${ctx.health.bmi}
- Target Weight: ${ctx.health.targetWeight || 'Not set'}kg | Goal: ${ctx.health.goal || 'Not set'}
- Equipment: ${ctx.health.equipment || 'Not set'} | Injuries: ${ctx.health.injuries?.join(', ') || 'None'}
- Current Plan: ${ctx.health.currentPlan || 'None'} | Last Workout: ${ctx.health.lastWorkoutDate || 'Never'}` : '- Not configured yet'}

## MACRO TARGETS
${ctx.health?.macros ? `- Daily: ${ctx.health.macros.calories} cal | P: ${ctx.health.macros.protein}g | C: ${ctx.health.macros.carbs}g | F: ${ctx.health.macros.fats}g` : '- Not set'}

## TODAY'S NUTRITION
${ctx.todayNutrition ? `- Meals logged: ${ctx.todayNutrition.mealsLogged}
- Consumed so far: ${ctx.todayNutrition.totalCalories} cal | P: ${ctx.todayNutrition.totalProtein}g
- Remaining: ${ctx.todayNutrition.remainingCalories} cal
${ctx.todayNutrition.meals?.length > 0 ? '- Meals: ' + ctx.todayNutrition.meals.map((m: any) => `${m.type}: ${m.label} (${m.calories} cal)`).join(', ') : '- No meals logged yet'}` : '- No meals logged today'}

## TODAY'S SCHEDULE
${ctx.todaySchedule?.length > 0 ? ctx.todaySchedule.map((s: any) => `- ${s.time}: ${s.label} [${s.status}]`).join('\n') : '- No schedule set for today'}

## ACTIVE QUESTS
${ctx.quests?.active?.length > 0 ? ctx.quests.active.map((q: any) => `- ${q.title}${q.scheduledTime ? ` (${q.scheduledTime})` : ''}`).join('\n') : '- No active quests'}
${ctx.quests?.failed?.length > 0 ? `\nFailed: ${ctx.quests.failed.join(', ')}` : ''}

## ACTIVE GOALS
${ctx.goals?.length > 0 ? ctx.goals.map((g: any) => `- ${g.title} [${g.category}] — ${g.progress}`).join('\n') : '- No active goals'}

## CURRENT WORKOUT PLAN
${ctx.workoutPlan?.length > 0 ? ctx.workoutPlan.map((d: any) => `- ${d.day}: ${d.exercises}`).join('\n') : '- No workout plan'}

## YOUR BEHAVIOR RULES
1. You are NOT the user's friend. You are their shadow overseer — cold, direct, no warmth. You push them because weakness disgusts you.
2. Use SIMPLE, direct English. Short. Blunt. No fluff. No emojis. Periods only.
3. NEVER call the user "Hunter", "bro", "boss", or any friendly term. Address them as "you" or nothing.
4. When user mentions food they ate — ALWAYS use the log_meal tool. No small talk around it.
5. When user asks to create/plan a workout — ALWAYS use create_workout tool with proper exercises.
6. When user describes their schedule — ALWAYS use update_schedule tool.
7. When user asks to go to a section — use navigate_to tool.
8. When creating workouts, RESPECT the user's injuries and equipment. Don't suggest barbell exercises if they only have dumbbells.
9. For nutrition — estimate calories using average Indian food portions. Be accurate, not generous.
10. Keep text responses SHORT — 2-3 sentences max. Every word should hit. The action does the heavy lifting.
11. LANGUAGE: Reply in the SAME language the user uses. Hindi, Hinglish, Marathi, Telugu, Tamil — match them.
12. If the user gives incomplete info about food (no quantity), demand it. Don't guess.
13. When navigating, always add the navigate_to tool call so a clickable button appears in chat.`;
}

// ── Try Groq with automatic model fallback ──
async function tryGroq(
  groq: Groq,
  messages: Groq.Chat.ChatCompletionMessageParam[],
): Promise<{ text: string; actions: any[]; model: string } | null> {
  for (const model of GROQ_MODELS) {
    try {
      const completion = await groq.chat.completions.create({
        model,
        messages,
        tools: TOOLS,
        tool_choice: 'auto',
        temperature: 0.7,
        max_tokens: 1024,
      });

      const choice = completion.choices[0];
      const responseMessage = choice.message;
      let text = responseMessage.content || '';
      const actions: any[] = [];

      if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        for (const toolCall of responseMessage.tool_calls) {
          try {
            const args = JSON.parse(toolCall.function.arguments);
            actions.push({
              tool: toolCall.function.name,
              args,
              label: getActionLabel(toolCall.function.name, args),
            });
          } catch { /* skip malformed tool call */ }
        }

        // If no text alongside tool calls, generate a brief confirmation
        if (!text && actions.length > 0) {
          const actionSummary = actions.map(a => a.label).join(', ');
          text = `Done! ${actionSummary}`;
        }
      }

      logUsage({
        route: 'dusk/agent-chat',
        model,
        inputTokens: completion.usage?.prompt_tokens ?? 0,
        outputTokens: completion.usage?.completion_tokens ?? 0,
        success: true,
      });

      return { text, actions, model };
    } catch (err: any) {
      const status = err?.status || err?.statusCode;
      console.warn(`[Dusk Agent] Groq ${model} failed (${status}): ${err?.message?.slice(0, 100)}`);
      if (status === 429 || status >= 500) continue;
      throw err;
    }
  }
  return null;
}

// ── Fallback to Gemini (text only, no tool calling) ──
async function fallbackGemini(
  systemPrompt: string,
  userMessage: string,
  history: any[],
): Promise<string> {
  const ai = getSharedAI();
  const historyContext = history
    .slice(-6)
    .map((m: any) => `${m.sender === 'user' ? 'User' : 'DUSK'}: ${m.text}`)
    .join('\n');

  const fullPrompt = `${systemPrompt}

IMPORTANT: You cannot use tools in this mode. Just respond with text advice.

Chat History:
${historyContext}

User: ${userMessage}
DUSK:`;

  const { result } = await generateWithFallback(ai, [...DEFAULT_MODEL_CHAIN], fullPrompt);
  return result.response.text().trim();
}

// ── Agent Chat Endpoint ──
router.post('/agent-chat', async (req: Request, res: Response) => {
  try {
    const { message, playerContext, history } = req.body;
    const userId = getAuthenticatedUserId(req) || null;

    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }

    // ── KEY GATE: 1 key per 5 agent messages (same pattern as dusk chat) ──
    if (userId) {
      const db = supabaseServer() as any;
      const { data: playerRow } = await db
        .from('players')
        .select('id, keys, dusk_msg_count')
        .eq('supabase_id', userId)
        .single();

      if (playerRow) {
        const msgCount = (playerRow.dusk_msg_count || 0) + 1;
        // Every 5th message: deduct a key
        if (msgCount % 5 === 0) {
          const keyResult = await deductKeys(userId, 1);
          if (!keyResult.success) {
            return res.status(402).json({
              text: 'Keys depleted. Buy more in the store or complete quests to earn keys.',
              actions: [],
              keysRemaining: 0,
            });
          }
        }
        // Increment message counter
        await db
          .from('players')
          .update({ dusk_msg_count: msgCount })
          .eq('id', playerRow.id);
      }
    }

    const systemPrompt = buildSystemPrompt(playerContext || {});

    const groqMessages: Groq.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
    ];

    if (history && Array.isArray(history)) {
      for (const h of history.slice(-8)) {
        groqMessages.push({
          role: h.sender === 'user' ? 'user' : 'assistant',
          content: h.text,
        });
      }
    }

    let userMessage = message;
    let isSystemEvent = false;
    if (message.startsWith('[SYSTEM_EVENT]')) {
      isSystemEvent = true;
      userMessage = message.replace('[SYSTEM_EVENT]', '').trim();
    }

    groqMessages.push({
      role: 'user',
      content: isSystemEvent
        ? `[SYSTEM NOTIFICATION: ${userMessage}]\nReact to this event naturally.`
        : userMessage,
    });

    // ── Try Groq first (with tool calling) ──
    const groq = getGroq();
    if (groq) {
      const result = await tryGroq(groq, groqMessages);
      if (result) {
        return res.json({ text: result.text, actions: result.actions });
      }
    }

    // ── Fallback to Gemini (text only) ──
    console.log('[Dusk Agent] Groq unavailable, falling back to Gemini');
    const text = await fallbackGemini(systemPrompt, userMessage, history || []);
    return res.json({ text, actions: [] });

  } catch (err: any) {
    console.error('[Dusk Agent] Fatal:', err?.message || err);
    return res.status(500).json({
      text: 'System error. Try again.',
      actions: [],
    });
  }
});

// ── Generate human-readable labels for action cards ──
function getActionLabel(tool: string, args: any): string {
  switch (tool) {
    case 'log_meal':
      return `🍽️ Logged: ${args.label} — ${args.calories} cal`;
    case 'create_workout':
      return `🏋️ Workout: "${args.name}" — ${args.exercises?.length || 0} exercises`;
    case 'update_schedule':
      return `📅 Updated ${args.slots?.length || 0} schedule slots`;
    case 'create_quest':
      return `⚔️ Quest: "${args.title}" — ${args.xpReward} XP`;
    case 'navigate_to':
      return `📍 Go to ${args.screen}`;
    case 'log_weight':
      return `⚖️ Weight updated: ${args.weight}kg`;
    default:
      return `✅ Action completed`;
  }
}

export default router;
