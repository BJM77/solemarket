import { describe, it, expect, vi } from 'vitest';
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ headers: async () => new Map([['x-forwarded-for', '1.2.3.4, 10.0.0.1']]) }));
import { memoryRateLimit, clientIp } from './rate-limit-guard';

describe('memoryRateLimit', () => {
  it('allows up to the limit within the window then blocks', () => {
    const t = 1_000_000;
    expect(memoryRateLimit('k', 2, 1000, t)).toBe(true);
    expect(memoryRateLimit('k', 2, 1000, t + 1)).toBe(true);
    expect(memoryRateLimit('k', 2, 1000, t + 2)).toBe(false);
    expect(memoryRateLimit('k', 2, 1000, t + 1500)).toBe(true);
  });
  it('reads first forwarded ip', async () => {
    expect(await clientIp()).toBe('1.2.3.4');
  });
});
