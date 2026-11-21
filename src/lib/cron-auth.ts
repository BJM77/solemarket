import { timingSafeEqual } from 'crypto';

/**
 * True only when CRON_SECRET is configured AND the request presents it as
 * `Authorization: Bearer <secret>`. Fails closed: with no secret set, nothing is authorised
 * (so `Bearer undefined` can never pass).
 */
export function isAuthorizedCronRequest(request: Request, opts: { allowQueryParam?: boolean } = {}): boolean {
    const secret = process.env.CRON_SECRET;
    if (!secret) return false;
    const header = request.headers.get('authorization') || '';
    let presented = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!presented && opts.allowQueryParam) {
        try {
            presented = new URL(request.url).searchParams.get('secret') || '';
        } catch {
            presented = '';
        }
    }
    if (!presented) return false;
    const a = Buffer.from(presented);
    const b = Buffer.from(secret);
    return a.length === b.length && timingSafeEqual(a, b);
}
