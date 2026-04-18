import { GoogleGenerativeAI, GenerativeModel, GenerateContentResult } from '@google/generative-ai';

// ── Shared Gemini client (singleton per API key) ──
let _cachedAI: GoogleGenerativeAI | null = null;
let _cachedKey: string | null = null;

export function getSharedAI(): GoogleGenerativeAI {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY not set');
  if (_cachedAI && _cachedKey === key) return _cachedAI;
  _cachedAI = new GoogleGenerativeAI(key);
  _cachedKey = key;
  return _cachedAI;
}

// ── Retry configuration ──
interface RetryOptions {
  maxRetries?: number;       // default 3
  baseDelayMs?: number;      // default 2000 (2s)
  maxDelayMs?: number;       // default 30000 (30s)
}

/**
 * Calls model.generateContent() with exponential backoff retry on 429/503 errors.
 * Returns the GenerateContentResult on success.
 */
export async function generateWithRetry(
  model: GenerativeModel,
  prompt: string | Array<string | { inlineData: { data: string; mimeType: string } }>,
  options: RetryOptions = {}
): Promise<GenerateContentResult> {
  const { maxRetries = 3, baseDelayMs = 2000, maxDelayMs = 30000 } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await model.generateContent(prompt as any);
      return result;
    } catch (err: any) {
      lastError = err;
      const message = err?.message || '';
      const isRetryable =
        message.includes('429') ||
        message.includes('Too Many Requests') ||
        message.includes('Resource exhausted') ||
        message.includes('503') ||
        message.includes('UNAVAILABLE') ||
        message.includes('overloaded');

      if (!isRetryable || attempt === maxRetries) {
        throw err;
      }

      // Exponential backoff with jitter: 2s, 4s, 8s (± random)
      const delay = Math.min(
        baseDelayMs * Math.pow(2, attempt) + Math.random() * 1000,
        maxDelayMs
      );
      console.warn(
        `[GeminiRetry] 429/503 on attempt ${attempt + 1}/${maxRetries + 1}. ` +
        `Retrying in ${Math.round(delay)}ms...`
      );
      await sleep(delay);
    }
  }

  // Should never reach here, but just in case
  throw lastError || new Error('generateWithRetry: all retries exhausted');
}

/**
 * Tries multiple model names in order, with retry on each.
 * Returns the result and the model name that succeeded.
 */
export async function generateWithFallback(
  ai: GoogleGenerativeAI,
  modelNames: string[],
  prompt: string | Array<string | { inlineData: { data: string; mimeType: string } }>,
  retryOptions?: RetryOptions
): Promise<{ result: GenerateContentResult; modelName: string }> {
  let lastError: Error | null = null;

  for (const modelName of modelNames) {
    try {
      const model = ai.getGenerativeModel({ model: modelName });
      const result = await generateWithRetry(model, prompt, retryOptions);
      return { result, modelName };
    } catch (err: any) {
      lastError = err;
      const message = err?.message || '';
      const isModelNotFound =
        message.includes('404') ||
        message.includes('not found') ||
        message.includes('not supported');

      if (isModelNotFound) {
        console.warn(`[GeminiRetry] Model ${modelName} not available, trying next...`);
        continue;
      }
      // If it's not a model-not-found error, the retry logic already exhausted.
      // Try the next model anyway.
      console.warn(`[GeminiRetry] Model ${modelName} failed after retries, trying next...`);
    }
  }

  throw lastError || new Error('All AI models failed after retries');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
