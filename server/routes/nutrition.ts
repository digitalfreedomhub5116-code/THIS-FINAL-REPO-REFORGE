import { Router, Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { logUsage } from '../utils/logUsage.js';

const router = Router();

const MODELS_TO_TRY = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
];

const NUTRITION_PROMPT = `You are a strict, professional nutritionist AI.

CRITICAL FIRST STEP: Look at the image. If the image does NOT contain food, meals, ingredients, or drinks (e.g., if it's a screenshot, a person, a landscape, a blank screen, etc.), you MUST return exactly this JSON:
{ "error": "NOT_FOOD" }

If and ONLY IF the image clearly contains food/drink, analyze it and return ONLY a valid JSON object (no markdown, no code fences) with this exact structure:
{
  "name": "Full descriptive name of the meal/food",
  "serving_size": "Exact visual quantity (e.g. '1 slice', 'half a bowl ~150g', '2 whole eggs')",
  "calories": 450,
  "protein_g": 32.5,
  "carbs_g": 48.0,
  "fats_g": 12.3,
  "fiber_g": 6.2,
  "sugar_g": 8.1,
  "sodium_mg": 620,
  "vitamin_a_dv": 15,
  "vitamin_c_dv": 22,
  "vitamin_d_dv": 5,
  "vitamin_b12_dv": 18,
  "calcium_dv": 12,
  "iron_dv": 20,
  "potassium_mg": 780,
  "ingredients": ["chicken breast", "rice", "broccoli", "olive oil"],
  "confidence": "High"
}

Rules:
- If NOT food, return { "error": "NOT_FOOD" } and nothing else.
- PORTION AWARENESS (CRITICAL): You MUST estimate calories and macros based ONLY on the exact visual quantity shown in the image. If you see 1 slice of pizza, provide macros for 1 slice, NOT the whole pizza. If you see half a bowl of rice, calculate for half a bowl.
- All numeric values must be numbers, not strings.
- confidence must be exactly "High", "Medium", or "Low".
- Daily value percentages (fields ending in _dv) are integers 0-100.
- Return ONLY raw JSON, no markdown formatting (\`\`\`json ... \`\`\`), no conversational text.`;

router.post('/analyze', async (req: Request, res: Response) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Gemini API key not configured. Add GEMINI_API_KEY to environment secrets.' });
  }

  const { imageBase64, mimeType } = req.body as { imageBase64?: string; mimeType?: string };

  if (!imageBase64) {
    return res.status(400).json({ error: 'imageBase64 is required' });
  }

  const imagePart = {
    inlineData: {
      data: imageBase64,
      mimeType: (mimeType || 'image/jpeg') as string,
    },
  };

  const genAI = new GoogleGenerativeAI(apiKey);
  let lastError = '';

  for (const modelName of MODELS_TO_TRY) {
    try {
      console.log(`[Nutrition] Trying model: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent([NUTRITION_PROMPT, imagePart]);
      const text = result.response.text().trim();

      const cleaned = text
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();

      let nutrition: Record<string, unknown>;
      try {
        nutrition = JSON.parse(cleaned);
      } catch {
        console.error(`[Nutrition] ${modelName} returned non-JSON:`, text.substring(0, 200));
        lastError = 'Could not parse AI response. Try a clearer food photo.';
        continue;
      }

      if (nutrition.error === "NOT_FOOD") {
        console.log(`[Nutrition] Image rejected as non-food by ${modelName}`);
        return res.status(400).json({ error: "No food detected. Please scan a clear image of a meal or ingredients." });
      }

      console.log(`[Nutrition] Success with model: ${modelName}`);
      logUsage({
        route: 'nutrition/analyze',
        model: modelName,
        inputTokens: result.response.usageMetadata?.promptTokenCount ?? 0,
        outputTokens: result.response.usageMetadata?.candidatesTokenCount ?? 0,
        success: true,
      });
      return res.json({ success: true, data: nutrition, model: modelName });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.warn(`[Nutrition] Model ${modelName} failed: ${message.substring(0, 120)}`);
      lastError = message;

      const isNotFound = message.includes('404') || message.includes('not found') || message.includes('not supported');
      if (!isNotFound) {
        return res.status(500).json({ error: `AI analysis failed: ${message}` });
      }
    }
  }

  return res.status(500).json({ error: `No available Gemini model could process this request. Last error: ${lastError}` });
});

export default router;
