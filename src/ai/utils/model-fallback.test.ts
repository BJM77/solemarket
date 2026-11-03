import { describe, it, expect, vi } from 'vitest';
import { runPromptWithFallback, isTransientAIError } from './model-fallback';

describe('runPromptWithFallback', () => {
  it('falls through 503s to the next model', async () => {
    const calls: string[] = [];
    const prompt = vi.fn(async (_i: any, o: any) => {
      calls.push(o.model);
      if (calls.length < 3) throw Object.assign(new Error('[503 Service Unavailable] high demand'), { status: 'UNAVAILABLE' });
      return { output: { ok: true } };
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const r = await runPromptWithFallback(prompt, {}, { label: 't', models: ['a', 'b', 'c'] });
    expect(r).toEqual({ output: { ok: true }, model: 'c' });
    expect(calls).toEqual(['a', 'b', 'c']);
  });
  it('times out a hung model', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const prompt = vi.fn((_i: any, o: any) => o.model === 'a' ? new Promise<any>(() => {}) : Promise.resolve({ output: 1 }));
    const r = await runPromptWithFallback(prompt, {}, { label: 't', models: ['a', 'b'], timeoutMs: 50 });
    expect(r.model).toBe('b');
  });
  it('does not retry non-transient errors', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const prompt = vi.fn(async () => { throw new Error('API key not valid'); });
    await expect(runPromptWithFallback(prompt, {}, { label: 't', models: ['a', 'b'] })).rejects.toThrow('API key');
    expect(prompt).toHaveBeenCalledTimes(1);
    expect(isTransientAIError({ message: '429 Too Many Requests' })).toBe(true);
  });
});
