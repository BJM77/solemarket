import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  isStaleServerActionError,
  handleStaleDeploy,
  clearStaleDeployReloadGuard,
} from './stale-deploy';

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

describe('isStaleServerActionError', () => {
  it('detects Next.js 15 missing Server Action messages', () => {
    expect(
      isStaleServerActionError(
        new Error('Server Action "abc123" was not found on the server. The client and server may be out of sync.'),
      ),
    ).toBe(true);
    expect(isStaleServerActionError('Failed to find Server Action `xyz`')).toBe(true);
    expect(isStaleServerActionError({ message: 'Failed to find Server Action' })).toBe(true);
  });

  it('ignores unrelated errors', () => {
    expect(isStaleServerActionError(new Error('Network request failed'))).toBe(false);
    expect(isStaleServerActionError('Upload failed')).toBe(false);
    expect(isStaleServerActionError(null)).toBe(false);
    expect(isStaleServerActionError(undefined)).toBe(false);
  });
});

describe('handleStaleDeploy', () => {
  beforeEach(() => {
    clearStaleDeployReloadGuard();
    vi.useFakeTimers();
  });

  it('reloads once for a stale action error', async () => {
    const reload = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload },
    });
    const before = vi.fn(async () => {});
    const handled = handleStaleDeploy(new Error('Server Action "x" was not found on the server'), {
      beforeReload: before,
    });
    expect(handled).toBe(true);
    await vi.runAllTimersAsync();
    expect(before).toHaveBeenCalled();
    expect(reload).toHaveBeenCalled();
  });

  it('does not reload twice within the guard window', () => {
    const reload = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload },
    });
    expect(handleStaleDeploy(new Error('Failed to find Server Action'))).toBe(true);
    expect(handleStaleDeploy(new Error('Failed to find Server Action'))).toBe(false);
  });

  it('returns false for non-stale errors', () => {
    expect(handleStaleDeploy(new Error('boom'))).toBe(false);
  });
});
