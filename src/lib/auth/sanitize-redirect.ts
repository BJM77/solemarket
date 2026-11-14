/**
 * Keeps post-auth redirects on this site.
 * Only same-site relative paths (optional query + hash) are allowed.
 */
const FALLBACK = '/';
const AUTH_PATHS = new Set(['/sign-in', '/sign-up']);
const DUMMY_ORIGIN = 'https://benched.invalid';

function isAuthPath(pathname: string): boolean {
  return AUTH_PATHS.has(pathname);
}

export function sanitizeRedirect(
  raw: string | null | undefined,
  fallback: string = FALLBACK,
): string {
  if (typeof raw !== 'string') return fallback;

  const value = raw.trim();
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return fallback;
  }

  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return fallback;
  }

  if (
    decoded.startsWith('//') ||
    decoded.includes('\\') ||
    /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(decoded)
  ) {
    return fallback;
  }

  try {
    const url = new URL(value, DUMMY_ORIGIN);
    if (url.origin !== DUMMY_ORIGIN) return fallback;
    if (url.username || url.password) return fallback;
    if (isAuthPath(url.pathname)) return fallback;

    const result = `${url.pathname}${url.search}${url.hash}`;
    return result || fallback;
  } catch {
    return fallback;
  }
}

/** `/sign-in` or `/sign-up` with a safe `redirect` query param. */
export function withRedirectParam(
  href: '/sign-in' | '/sign-up' | string,
  redirect: string | null | undefined,
): string {
  const safe = sanitizeRedirect(redirect, '');
  if (!safe) return href;
  const separator = href.includes('?') ? '&' : '?';
  return `${href}${separator}redirect=${encodeURIComponent(safe)}`;
}

export function currentPathAndQuery(): string {
  if (typeof window === 'undefined') return '/';
  return `${window.location.pathname}${window.location.search}`;
}
