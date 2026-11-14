import { describe, it, expect, vi, beforeEach } from 'vitest';

const verifyIdToken = vi.fn();
const generate = vi.fn();

vi.mock('@/lib/firebase/auth-admin', () => ({ verifyIdToken: (t: string) => verifyIdToken(t) }));
vi.mock('@/ai/genkit', () => ({ ai: { generate: (o: unknown) => generate(o) } }));

import { parseFacebookMarketplaceScreenshot } from './proload-parser';

const small = 'data:image/jpeg;base64,' + 'A'.repeat(1000);

describe('parseFacebookMarketplaceScreenshot', () => {
  beforeEach(() => {
    verifyIdToken.mockReset().mockResolvedValue({ uid: 'u1' });
    generate.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('returns parsed data on success', async () => {
    generate.mockResolvedValue({ output: { title: 'Shaq Auto', price: 290 } });
    const res = await parseFacebookMarketplaceScreenshot('tok', small);
    expect(res).toEqual({ success: true, data: { title: 'Shaq Auto', price: 290 } });
  });

  it('rejects oversized screenshots without calling the model', async () => {
    const res = await parseFacebookMarketplaceScreenshot('tok', 'data:image/png;base64,' + 'A'.repeat(2_300_000));
    expect(res.success).toBe(false);
    expect(generate).not.toHaveBeenCalled();
  });

  it('returns a friendly error when the token is invalid', async () => {
    verifyIdToken.mockRejectedValue(new Error('Invalid or expired authentication token.'));
    const res = await parseFacebookMarketplaceScreenshot('bad', small);
    expect(res).toEqual({ success: false, error: expect.stringMatching(/sign-in has expired/) });
  });

  it('returns a friendly error (and logs the real one) when Gemini fails', async () => {
    generate.mockRejectedValue(new Error('API key not valid'));
    const res = await parseFacebookMarketplaceScreenshot('tok', small);
    expect(res.success).toBe(false);
    if (!res.success) expect(res.error).not.toMatch(/API key/);
    expect(console.error).toHaveBeenCalled();
  });
});
