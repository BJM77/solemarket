import { describe, it, expect } from 'vitest';
import { TaskQueue } from './queue';

describe('TaskQueue', () => {
  it('limits concurrency and completes all', async () => {
    let active = 0, peak = 0;
    const q = new TaskQueue<number>({ concurrency: 3, retryDelayMs: 0 });
    for (let i = 0; i < 10; i++) q.add(String(i), async () => { active++; peak = Math.max(peak, active); await new Promise((r) => setTimeout(r, 5)); active--; return i; });
    await q.onIdle();
    expect(peak).toBe(3);
    expect(q.counts()).toEqual({ queued: 0, running: 0, done: 10, error: 0 });
    expect(q.get('4')?.result).toBe(4);
  });
  it('retries then marks error, and can be re-added', async () => {
    let calls = 0;
    const q = new TaskQueue<string>({ concurrency: 1, retries: 1, retryDelayMs: 0 });
    q.add('a', async () => { calls++; throw new Error('boom'); });
    await q.onIdle();
    expect(calls).toBe(2);
    expect(q.get('a')).toMatchObject({ status: 'error', error: 'boom', attempts: 2 });
    q.add('a', async () => 'ok');
    await q.onIdle();
    expect(q.get('a')).toMatchObject({ status: 'done', result: 'ok', attempts: 3 });
  });
  it('succeeds on retry', async () => {
    let n = 0;
    const q = new TaskQueue<string>({ retries: 2, retryDelayMs: 0 });
    q.add('x', async () => { if (++n < 2) throw new Error('flaky'); return 'y'; });
    await q.onIdle();
    expect(q.get('x')?.status).toBe('done');
  });
});
