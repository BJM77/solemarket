/**
 * Model fallback chain for Gemini calls.
 *
 * Google regularly returns 503 "high demand" / 429 for individual models, and
 * a single model can hang. Every vision flow used by listing creation runs its
 * prompt through `runPromptWithFallback`, which tries each model in order with
 * a per-attempt timeout, retries transient failures, and logs the real error
 * server-side.
 */

/** Ordered by observed reliability (fast + rarely overloaded first). All verified via the models list. */
export const VISION_MODEL_CHAIN = [
  'googleai/gemini-flash-lite-latest',
  'googleai/gemini-3.5-flash',
  'googleai/gemini-3.6-flash',
  'googleai/gemini-flash-latest',
] as const;

export function isTransientAIError(error: any): boolean {
  const status = error?.status ?? error?.code;
  const msg = String(error?.message ?? error ?? '').toLowerCase();
  if (status === 'UNAVAILABLE' || status === 'RESOURCE_EXHAUSTED' || status === 'DEADLINE_EXCEEDED' || status === 'INTERNAL') return true;
  return /\b(429|500|502|503|504)\b/.test(msg) ||
    msg.includes('overloaded') || msg.includes('high demand') || msg.includes('unavailable') ||
    msg.includes('timed out') || msg.includes('timeout') || msg.includes('resource_exhausted') ||
    msg.includes('fetch failed') || msg.includes('econnreset') || msg.includes('socket hang up') ||
    // Bad / empty structured output from one model is worth trying on another.
    msg.includes('schema validation') || msg.includes('failed to return') || msg.includes('no output');
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([
    p.finally(() => clearTimeout(timer)),
    new Promise<T>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    }),
  ]);
}

type PromptFn<I, O> = (input: I, opts?: any) => Promise<{ output: O | null | undefined }>;

export interface FallbackOptions {
  label: string;
  models?: readonly string[];
  /** Per-attempt timeout. */
  timeoutMs?: number;
  /** Total time budget across all attempts. */
  budgetMs?: number;
  /** How many passes over the model chain. */
  passes?: number;
  config?: Record<string, any>;
}

/** Run a Genkit prompt across the model chain until one returns valid output. */
export async function runPromptWithFallback<I, O>(
  prompt: PromptFn<I, O>,
  input: I,
  opts: FallbackOptions,
): Promise<{ output: O; model: string }> {
  const models = opts.models ?? VISION_MODEL_CHAIN;
  const timeoutMs = opts.timeoutMs ?? 30_000;
  const budgetMs = opts.budgetMs ?? 100_000;
  const passes = opts.passes ?? 2;
  const started = Date.now();
  let lastError: any;

  for (let pass = 0; pass < passes; pass++) {
    for (const model of models) {
      const remaining = budgetMs - (Date.now() - started);
      if (remaining < 3_000) break;
      try {
        const res = await withTimeout(
          prompt(input, { model, ...(opts.config ? { config: opts.config } : {}) }),
          Math.min(timeoutMs, remaining),
          `${opts.label} [${model}]`,
        );
        if (!res?.output) throw new Error(`${model} failed to return output`);
        if (pass > 0 || model !== models[0]) console.log(`[AI fallback] ${opts.label} recovered with ${model}`);
        return { output: res.output, model };
      } catch (error: any) {
        lastError = error;
        console.error(`[AI fallback] ${opts.label} failed on ${model} (pass ${pass + 1}):`, error?.status ?? '', String(error?.message ?? error).slice(0, 500));
        if (!isTransientAIError(error)) throw error;
      }
    }
    if (pass < passes - 1) await new Promise(r => setTimeout(r, 1_000));
  }
  throw lastError ?? new Error(`${opts.label}: all AI models failed`);
}
