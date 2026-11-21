import { describe, it, expect, afterEach } from 'vitest';
import { isAuthorizedCronRequest } from './cron-auth';

const req = (auth?: string, url = 'https://benched.au/api/cron/x') =>
    new Request(url, { headers: auth ? { authorization: auth } : {} });

describe('isAuthorizedCronRequest', () => {
    const original = process.env.CRON_SECRET;
    afterEach(() => {
        if (original === undefined) delete process.env.CRON_SECRET;
        else process.env.CRON_SECRET = original;
    });

    it('rejects everything when CRON_SECRET is not set', () => {
        delete process.env.CRON_SECRET;
        expect(isAuthorizedCronRequest(req('Bearer undefined'))).toBe(false);
        expect(isAuthorizedCronRequest(req('Bearer '))).toBe(false);
        expect(isAuthorizedCronRequest(req())).toBe(false);
    });

    it('accepts only the exact bearer secret', () => {
        process.env.CRON_SECRET = 'test-secret';
        expect(isAuthorizedCronRequest(req('Bearer test-secret'))).toBe(true);
        expect(isAuthorizedCronRequest(req('Bearer wrong'))).toBe(false);
        expect(isAuthorizedCronRequest(req('test-secret'))).toBe(false);
    });

    it('accepts ?secret= only when allowed', () => {
        process.env.CRON_SECRET = 'test-secret';
        const r = req(undefined, 'https://benched.au/api/cron/x?secret=test-secret');
        expect(isAuthorizedCronRequest(r)).toBe(false);
        expect(isAuthorizedCronRequest(r, { allowQueryParam: true })).toBe(true);
    });
});
