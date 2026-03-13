import { supabaseServer } from '../lib/supabase.js';

const PRICING: Record<string, { input: number; output: number }> = {
  'gemini-2.0-flash':                        { input: 0.10,  output: 0.40 },
  'gemini-2.0-flash-exp':                    { input: 0.10,  output: 0.40 },
  'gemini-1.5-flash':                        { input: 0.075, output: 0.30 },
  'gemini-1.5-flash-latest':                 { input: 0.075, output: 0.30 },
  'gemini-1.5-pro':                          { input: 1.25,  output: 5.00 },
  'gemini-2.0-pro-exp':                      { input: 0,     output: 0    },
  'gemini-2.0-flash-exp-image-generation':   { input: 0,     output: 0    },
  'gemini-2.0-flash-preview-image-generation':{ input: 0,    output: 0    },
};

const IMAGE_FLAT_COST = 0.039;

export interface UsageEntry {
  route: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  success?: boolean;
  userId?: string;
  isImageGeneration?: boolean;
}

function calcCost(model: string, inputTokens: number, outputTokens: number, isImage: boolean): number {
  if (isImage) return IMAGE_FLAT_COST;
  const p = PRICING[model];
  if (!p) return 0;
  return (inputTokens / 1_000_000) * p.input + (outputTokens / 1_000_000) * p.output;
}

export function logUsage(entry: UsageEntry): void {
  try {
    const inputTokens  = entry.inputTokens  ?? 0;
    const outputTokens = entry.outputTokens ?? 0;
    const cost = calcCost(entry.model, inputTokens, outputTokens, entry.isImageGeneration ?? false);

    (supabaseServer() as any)
      .from('api_usage_logs')
      .insert({
        route: entry.route,
        model: entry.model,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cost_usd: cost,
        success: entry.success ?? true,
        user_id: entry.userId ?? null,
      })
      .then(() => {})
      .catch((err: any) => {
        console.warn('[logUsage] Failed to log API usage:', err?.message);
      });
  } catch (err: any) {
    console.warn('[logUsage] Skipped (Supabase not configured):', err?.message);
  }
}
