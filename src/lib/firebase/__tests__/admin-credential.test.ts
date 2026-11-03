// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { generateKeyPairSync } from 'crypto';
import { normalizePrivateKey, resolveAdminCredential } from '../admin-credential';

const pem = generateKeyPairSync('rsa', { modulusLength: 1024 }).privateKey
    .export({ type: 'pkcs8', format: 'pem' }).toString();

describe('normalizePrivateKey', () => {
    it('accepts a normal PEM', () => expect(normalizePrivateKey(pem)).toBeTruthy());
    it('handles escaped \\n', () => expect(normalizePrivateKey(pem.replace(/\n/g, '\\n'))).toBeTruthy());
    it('handles surrounding quotes', () => expect(normalizePrivateKey(`"${pem.replace(/\n/g, '\\n')}"`)).toBeTruthy());
    it('handles single quotes and CRLF', () => expect(normalizePrivateKey(`'${pem.replace(/\n/g, '\r\n')}'`)).toBeTruthy());
    it('handles base64', () => expect(normalizePrivateKey(Buffer.from(pem).toString('base64'))).toBeTruthy());
    it('handles a key collapsed to one line', () => expect(normalizePrivateKey(pem.replace(/\n/g, ' '))).toBeTruthy());
    it('handles full service-account JSON', () => expect(normalizePrivateKey(JSON.stringify({ private_key: pem }))).toBeTruthy());
    it('rejects garbage', () => {
        expect(normalizePrivateKey('-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----')).toBeNull();
        expect(normalizePrivateKey('nope')).toBeNull();
        expect(normalizePrivateKey('')).toBeNull();
    });
});

describe('resolveAdminCredential', () => {
    it('uses ADC when nothing set', () => expect(resolveAdminCredential({} as any).kind).toBe('adc'));
    it('uses ADC when key invalid', () => {
        const r = resolveAdminCredential({ FIREBASE_ADMIN_PRIVATE_KEY: 'bad', FIREBASE_ADMIN_CLIENT_EMAIL: 'a@b.c' } as any);
        expect(r.kind).toBe('adc');
    });
    it('uses cert when valid', () => {
        const r = resolveAdminCredential({ FIREBASE_ADMIN_PRIVATE_KEY: pem.replace(/\n/g, '\\n'), FIREBASE_ADMIN_CLIENT_EMAIL: 'a@b.c' } as any);
        expect(r.kind).toBe('cert');
    });
});
