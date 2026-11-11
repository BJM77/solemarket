import { createHash, randomBytes, randomInt, timingSafeEqual } from 'crypto';

/** Server-only crypto helpers for guest checkout (codes, identity hashes, order tokens). */

export const CODE_TTL_MS = 10 * 60_000;
export const MAX_CODE_ATTEMPTS = 5;

export function sha256(s: string): string {
    return createHash('sha256').update(s).digest('hex');
}

/** Stable hash of an identity (email, mobile, device id, IP) for limit lookups. */
export function identityHash(kind: 'email' | 'phone' | 'device' | 'ip', value: string): string {
    return sha256(`benched-guest:${kind}:${String(value).trim().toLowerCase()}`);
}

export function generateCode(): string {
    return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

/** The challenge id is an unguessable random doc id, so it salts the code hash. */
export function hashCode(challengeId: string, code: string): string {
    return sha256(`benched-code:${challengeId}:${code}`);
}

export function codeMatches(challengeId: string, code: string, storedHash: string): boolean {
    const a = Buffer.from(hashCode(challengeId, code), 'hex');
    const b = Buffer.from(String(storedHash || ''), 'hex');
    return a.length === b.length && timingSafeEqual(a, b);
}

/** 256-bit order access token for the guest's order page link. Only its hash is stored. */
export function generateOrderToken(): { token: string; hash: string } {
    const token = randomBytes(32).toString('base64url');
    return { token, hash: orderTokenHash(token) };
}

export function orderTokenHash(token: string): string {
    return sha256(`benched-order:${token}`);
}

export function isPlausibleOrderToken(token: unknown): token is string {
    return typeof token === 'string' && /^[A-Za-z0-9_-]{40,64}$/.test(token);
}

export function randomId(bytes = 16): string {
    return randomBytes(bytes).toString('base64url');
}
