/**
 * Graceful recovery when a tab still runs an old Next.js build after a deploy.
 * Old Server Action IDs then fail with "Server Action … was not found on the server".
 */

import { toast } from '@/hooks/use-toast';

const RELOAD_GUARD_KEY = 'benched:stale-deploy-reload';
/** Don't reload again within this window (avoids loops if the error persists). */
const RELOAD_GUARD_MS = 60_000;
const INSTALL_FLAG = '__benchedStaleDeployInstalled';

export function isStaleServerActionError(err: unknown): boolean {
  const msg =
    err instanceof Error
      ? err.message
      : typeof err === 'string'
        ? err
        : err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : String(err ?? '');
  if (!msg) return false;
  const lower = msg.toLowerCase();
  return (
    lower.includes('was not found on the server') ||
    lower.includes('failed to find server action') ||
    /server action ["'`][^"'`]+["'`] was not found/i.test(msg)
  );
}

export type StaleDeployOptions = {
  /** Run before reload (e.g. persist AutoCard blobs to IndexedDB). */
  beforeReload?: () => void | Promise<void>;
};

/**
 * If `err` is a stale Server Action error, show a toast and reload once.
 * Returns true when handled (caller should not show a normal error toast).
 */
export function handleStaleDeploy(err: unknown, opts?: StaleDeployOptions): boolean {
  if (typeof window === 'undefined') return false;
  if (!isStaleServerActionError(err)) return false;

  try {
    const last = sessionStorage.getItem(RELOAD_GUARD_KEY);
    if (last) {
      const t = Number(last);
      if (Number.isFinite(t) && Date.now() - t < RELOAD_GUARD_MS) {
        return false;
      }
    }
    sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
  } catch {
    // sessionStorage blocked — still attempt a single reload
  }

  try {
    toast({ title: 'Site updated — reloading…' });
  } catch {
    /* toaster may not be mounted */
  }

  void Promise.resolve()
    .then(() => opts?.beforeReload?.())
    .catch(() => {})
    .finally(() => {
      // Brief delay so the toast can paint before the navigation tears the page down.
      window.setTimeout(() => {
        window.location.reload();
      }, 350);
    });

  return true;
}

/** Install a one-time window `unhandledrejection` listener (safe to call repeatedly). */
export function installStaleDeployHandler(): void {
  if (typeof window === 'undefined') return;
  const w = window as Window & { [INSTALL_FLAG]?: boolean };
  if (w[INSTALL_FLAG]) return;
  w[INSTALL_FLAG] = true;

  window.addEventListener('unhandledrejection', (ev) => {
    if (handleStaleDeploy(ev.reason)) {
      ev.preventDefault();
    }
  });
}

/** Test helper: clear the reload guard. */
export function clearStaleDeployReloadGuard(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(RELOAD_GUARD_KEY);
  } catch {
    /* ignore */
  }
}
