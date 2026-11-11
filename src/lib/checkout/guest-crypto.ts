import { createHash, randomBytes } from 'crypto';

/** Server-only crypto helpers for guest checkout (identity hashes, order tokens). */

export function sha256(s: string): string {
    return createHash('sha256').update(s).digest('hex');
}

/** Stable hash of an identity (email, mobile, device id, IP) for limit lookups. */
export function identityHash(kind: 'email' | 'phone' | 'device' | 'ip', value: string): string {
    return sha256(`benched-guest:${kind}:${String(value).trim().toLowerCase()}`);
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
