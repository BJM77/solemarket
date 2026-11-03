import { createPrivateKey } from 'crypto';

/**
 * Normalise a service-account private key that may have been pasted into a
 * secret store in a mangled form. Handles:
 *  - surrounding single/double quotes (and JSON-encoded strings)
 *  - literal "\n" / "\r\n" escape sequences
 *  - Windows line endings
 *  - base64-encoded PEM
 *  - a whole service-account JSON pasted into the key field
 *  - PEM collapsed onto one line (body re-wrapped at 64 chars)
 * Returns a valid PEM string, or null if the key can't be parsed.
 */
export function normalizePrivateKey(raw: string | undefined | null): string | null {
    if (!raw) return null;
    let key = String(raw).trim();
    if (!key) return null;

    // Whole service-account JSON pasted in
    if (key.startsWith('{')) {
        try {
            const parsed = JSON.parse(key);
            if (typeof parsed?.private_key === 'string') key = parsed.private_key.trim();
        } catch { /* fall through */ }
    }

    // JSON-encoded string ("-----BEGIN...\\n...")
    if (key.startsWith('"') && key.endsWith('"')) {
        try {
            const parsed = JSON.parse(key);
            if (typeof parsed === 'string') key = parsed.trim();
        } catch {
            key = key.slice(1, -1).trim();
        }
    }
    if (key.startsWith("'") && key.endsWith("'")) key = key.slice(1, -1).trim();

    // Base64-encoded PEM
    if (!key.includes('-----BEGIN')) {
        try {
            const decoded = Buffer.from(key, 'base64').toString('utf8');
            if (decoded.includes('-----BEGIN')) return normalizePrivateKey(decoded);
        } catch { /* ignore */ }
        return null;
    }

    key = key.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\r\n/g, '\n');

    const match = key.match(/-----BEGIN ([A-Z ]+)-----([\s\S]*?)-----END \1-----/);
    if (!match) return null;
    const label = match[1];
    const body = match[2].replace(/\s+/g, '');
    if (!body) return null;
    const wrapped = body.match(/.{1,64}/g)!.join('\n');
    const pem = `-----BEGIN ${label}-----\n${wrapped}\n-----END ${label}-----\n`;

    try {
        createPrivateKey(pem);
        return pem;
    } catch {
        return null;
    }
}

export type AdminCredentialSource =
    | { kind: 'cert'; clientEmail: string; privateKey: string; projectId?: string; from: string }
    | { kind: 'adc'; reason: string };

/** Decide which credential to use from env vars, never throwing. */
export function resolveAdminCredential(env: NodeJS.ProcessEnv = process.env): AdminCredentialSource {
    const saJson = env.SERVICE_ACCOUNT_JSON || env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (saJson) {
        let text = saJson.trim();
        if (!text.startsWith('{')) {
            try { text = Buffer.from(text, 'base64').toString('utf8'); } catch { /* ignore */ }
        }
        try {
            const sa = JSON.parse(text);
            const pk = normalizePrivateKey(sa.private_key);
            if (pk && sa.client_email) {
                return { kind: 'cert', clientEmail: sa.client_email, privateKey: pk, projectId: sa.project_id, from: 'SERVICE_ACCOUNT_JSON' };
            }
        } catch { /* fall through */ }
        console.warn('⚠️ Firebase Admin: SERVICE_ACCOUNT_JSON is set but not a valid service account; ignoring it.');
    }

    const clientEmail = (env.FIREBASE_ADMIN_CLIENT_EMAIL || env.FIREBASE_CLIENT_EMAIL || '').trim().replace(/^["']|["']$/g, '');
    const rawKey = env.FIREBASE_ADMIN_PRIVATE_KEY || env.FIREBASE_PRIVATE_KEY;
    if (!rawKey && !clientEmail) return { kind: 'adc', reason: 'no service-account key configured' };
    if (!rawKey || !clientEmail) {
        return { kind: 'adc', reason: `incomplete service-account secrets (${!rawKey ? 'FIREBASE_ADMIN_PRIVATE_KEY' : 'FIREBASE_ADMIN_CLIENT_EMAIL'} missing)` };
    }
    const privateKey = normalizePrivateKey(rawKey);
    if (!privateKey) {
        return { kind: 'adc', reason: 'FIREBASE_ADMIN_PRIVATE_KEY could not be parsed as a PEM private key' };
    }
    const projectId = (env.FIREBASE_ADMIN_PROJECT_ID || '').trim().replace(/^["']|["']$/g, '') || undefined;
    return { kind: 'cert', clientEmail, privateKey, projectId, from: 'FIREBASE_ADMIN_* secrets' };
}
