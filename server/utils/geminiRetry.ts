import { GoogleGenAI, type GenerateContentResponse } from '@google/genai';
import fs from 'fs';
import os from 'os';
import path from 'path';

// ── Write credentials file from env var (for Railway/CI deployments) ──
// Railway can't store files, so we store the JSON as an env var and
// write it to a temp file at startup for the Google SDK to find.
const credsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
if (credsJson && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  try {
    const tmpPath = path.join(os.tmpdir(), 'gcp-credentials.json');
    fs.writeFileSync(tmpPath, credsJson, { mode: 0o600 });
    process.env.GOOGLE_APPLICATION_CREDENTIALS = tmpPath;
  } catch (err: any) {
    console.warn('[GeminiRetry] Could not write credentials file:', err?.message);
  }
}

// ── Backward-compatible result wrapper ──
// OLD SDK: result.response.text()  ← method call
// NEW SDK: response.text           ← property
// This wrapper lets all route files keep using result.response.text()
// without ANY changes.
export interface CompatResponse {
  text(): string;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
  };
}

export interface CompatResult {
  response: CompatResponse;
}

function wrapResult(response: GenerateContentResponse): CompatResult {
  return {
    response: {
      text: () => response.text || '',
      usageMetadata: response.usageMetadata ? {
        promptTokenCount: response.usageMetadata.promptTokenCount,
        candidatesTokenCount: response.usageMetadata.candidatesTokenCount,
      } : undefined,
    },
  };
}

// ── Convert prompt format ──
// OLD SDK: prompt can be string or [string, { inlineData: ... }]
// NEW SDK: contents is string or [{ text: ... }, { inlineData: ... }]
function convertPrompt(
  prompt: string | Array<string | { inlineData: { data: string; mimeType: string } }>
): any {
  if (typeof prompt === 'string') return prompt;
  return prompt.map(part => {
    if (typeof part === 'string') return { text: part };
    return part;
  });
}

// ── Shared Gemini client (singleton) ──
let _cachedAI: GoogleGenAI | null = null;
let _usingVertexAI = false;

export function getSharedAI(): GoogleGenAI {
  if (_cachedAI) return _cachedAI;

  const project = process.env.GOOGLE_CLOUD_PROJECT;
  const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
  const hasVertexCreds = !!process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const apiKey = process.env.GEMINI_API_KEY;

  // ── Prefer Vertex AI (uses ₹90,957 free credits!) ──
  if (project && hasVertexCreds) {
    _cachedAI = new GoogleGenAI({
      vertexai: true,
      project,
      location,
    });
    _usingVertexAI = true;
    console.log(`[GeminiRetry] ✅ Using Vertex AI (project: ${project}, location: ${location}) — FREE CREDITS ACTIVE`);
    return _cachedAI;
  }

  // ── Fallback to standard API key ──
  if (apiKey) {
    _cachedAI = new GoogleGenAI({ apiKey });
    _usingVertexAI = false;
    console.log('[GeminiRetry] Using standard Gemini API key (no free credits)');
    return _cachedAI;
  }

  throw new Error(
    'No Gemini credentials configured. Set GOOGLE_CLOUD_PROJECT + GOOGLE_APPLICATION_CREDENTIALS_JSON for Vertex AI, or GEMINI_API_KEY for standard API.'
  );
}

/** Whether the client is using Vertex AI (free credits) or standard API key */
export function isUsingVertexAI(): boolean {
  return _usingVertexAI;
}

// ── Retry configuration ──
interface RetryOptions {
  maxRetries?: number;       // default 1 (only transient 503s get one retry)
  baseDelayMs?: number;      // default 1500
  maxDelayMs?: number;       // default 5000
}

// ── Error classification ──
export type ErrorKind = 'quota' | 'transient' | 'not_found' | 'other';

function classifyError(err: any): ErrorKind {
  const message = (err?.message || '').toString();
  const status = err?.status ?? err?.response?.status;
  if (status === 429 || message.includes('429') ||
      message.includes('Too Many Requests') ||
      message.includes('RESOURCE_EXHAUSTED') ||
      message.includes('Resource exhausted') ||
      message.includes('quota')) {
    return 'quota';
  }
  if (status === 503 || message.includes('503') ||
      message.includes('UNAVAILABLE') || message.includes('overloaded')) {
    return 'transient';
  }
  if (status === 404 || message.includes('404') ||
      message.includes('not found') || message.includes('not supported')) {
    return 'not_found';
  }
  return 'other';
}

// ── Circuit breaker: when a model returns 429, mark it as throttled for 60s.
// Subsequent requests skip it immediately and go straight to the fallback,
// saving both latency (~no wasted call) and one "wasted" attempt that would
// itself count toward Google's throttling heuristics. ──
const CIRCUIT_OPEN_MS = 60_000;
const throttledUntil = new Map<string, number>();

export function isModelThrottled(modelName: string): boolean {
  const until = throttledUntil.get(modelName);
  if (!until) return false;
  if (Date.now() >= until) {
    throttledUntil.delete(modelName);
    return false;
  }
  return true;
}

export function markModelThrottled(modelName: string, ms: number = CIRCUIT_OPEN_MS): void {
  throttledUntil.set(modelName, Date.now() + ms);
  console.warn(`[GeminiRetry] Circuit OPEN for ${modelName} for ${Math.round(ms / 1000)}s (will skip and use fallback).`);
}

/**
 * Calls ai.models.generateContent() with a single retry on transient (503) errors ONLY.
 * Quota errors (429) are thrown immediately so the caller can fail over to a
 * different model — retrying the same model when Google is capacity-throttling
 * it only makes the situation worse.
 */
async function generateWithRetrySingle(
  ai: GoogleGenAI,
  modelName: string,
  prompt: string | Array<string | { inlineData: { data: string; mimeType: string } }>,
  options: RetryOptions = {}
): Promise<CompatResult> {
  const { maxRetries = 1, baseDelayMs = 1500, maxDelayMs = 5000 } = options;
  let lastError: Error | null = null;
  const contents = convertPrompt(prompt);

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: contents,
      });
      return wrapResult(response);
    } catch (err: any) {
      lastError = err;
      const kind = classifyError(err);

      // Quota/capacity errors: do NOT retry — bubble up for failover.
      if (kind === 'quota' || kind === 'not_found') throw err;

      // Only 'transient' (503/UNAVAILABLE) gets a single quick retry.
      if (kind !== 'transient' || attempt === maxRetries) throw err;

      const delay = Math.min(baseDelayMs * Math.pow(2, attempt) + Math.random() * 500, maxDelayMs);
      console.warn(`[GeminiRetry] Transient 503 on attempt ${attempt + 1}/${maxRetries + 1}. Retrying in ${Math.round(delay)}ms...`);
      await sleep(delay);
    }
  }

  throw lastError || new Error('generateWithRetry: unreachable');
}

// ── Legacy export: generateWithRetry (kept for any direct callers) ──
// In the new SDK, model is created inline, so we accept ai + modelName instead of a GenerativeModel.
// However, no route currently calls this directly — they all use generateWithFallback.
export const generateWithRetry = generateWithRetrySingle;

/**
 * Tries multiple model names in order with fast failover.
 *
 * Order semantics: the FIRST model in the list is the preferred (cheaper/faster)
 * model. When it returns a quota (429) or not-found (404) error, we immediately
 * fail over to the next model — no waiting, no retries within the bad model.
 *
 * A circuit breaker remembers models that just 429'd so we don't even try them
 * for the next 60s. This dramatically cuts latency and wasted API calls during
 * Google-side capacity throttling of popular models like gemini-2.0-flash.
 */
export async function generateWithFallback(
  ai: GoogleGenAI,
  modelNames: string[],
  prompt: string | Array<string | { inlineData: { data: string; mimeType: string } }>,
  retryOptions?: RetryOptions
): Promise<{ result: CompatResult; modelName: string }> {
  let lastError: Error | null = null;
  const attempted: string[] = [];

  for (const modelName of modelNames) {
    // Circuit-breaker: if this model was throttled within the last 60s, skip it.
    if (isModelThrottled(modelName)) {
      attempted.push(`${modelName}(skipped:circuit-open)`);
      continue;
    }

    try {
      const result = await generateWithRetrySingle(ai, modelName, prompt, retryOptions);
      attempted.push(`${modelName}(ok)`);
      if (attempted.length > 1) {
        console.log(`[GeminiRetry] Fallback succeeded via ${modelName}. Path: ${attempted.join(' -> ')}`);
      }
      return { result, modelName };
    } catch (err: any) {
      lastError = err;
      const kind = classifyError(err);

      if (kind === 'quota') {
        markModelThrottled(modelName);
        attempted.push(`${modelName}(429)`);
        continue; // try next model immediately
      }
      if (kind === 'not_found') {
        attempted.push(`${modelName}(404)`);
        // Longer open window for 404: the model is gone, don't retry for 10 min.
        markModelThrottled(modelName, 10 * 60_000);
        continue;
      }
      // Transient or other — still try the next model, but don't circuit-break.
      attempted.push(`${modelName}(${kind})`);
    }
  }

  console.error(`[GeminiRetry] All models exhausted. Path: ${attempted.join(' -> ')}`);
  throw lastError || new Error('All AI models failed');
}

/**
 * The canonical model-fallback order used across the app.
 * Primary = cheaper 2.0-flash; fallback = 2.5-flash (higher capacity).
 * Exported so routes have a single source of truth.
 */
export const DEFAULT_MODEL_CHAIN: readonly string[] = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
];

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
