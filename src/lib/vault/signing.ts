import * as jose from 'jose';

// In production, these should be loaded from secure environment variables / KMS
// and NEVER hardcoded. For the MVP, we use fallback mock keys if env vars are missing.
// A real Ed25519 key pair can be generated via: await jose.generateKeyPair('EdDSA', { crv: 'Ed25519' })
const MOCK_PRIVATE_KEY = process.env.VAULT_PRIVATE_KEY_B64 || '';
const MOCK_PUBLIC_KEY = process.env.VAULT_PUBLIC_KEY_B64 || '';

export interface PassportPayload extends jose.JWTPayload {
    certId: string;
    itemId: string;
    itemTitle: string;
    verifiedAt: string;
    authenticatorId: string;
    photoHash?: string; // Optional hash of the physical item's photos to prove condition
}

/**
 * Signs a Vault Passport using the Benched private Ed25519 key.
 */
export async function signPassport(payload: PassportPayload): Promise<string> {
    let privateKey: any | Uint8Array;
    
    if (MOCK_PRIVATE_KEY) {
        const pkBuffer = Buffer.from(MOCK_PRIVATE_KEY, 'base64');
        privateKey = await jose.importPKCS8(pkBuffer.toString(), 'EdDSA');
    } else {
        // Fallback for local testing if env vars aren't set
        const { privateKey: mockKey } = await jose.generateKeyPair('EdDSA');
        privateKey = mockKey;
    }

    const jwt = await new jose.SignJWT(payload)
        .setProtectedHeader({ alg: 'EdDSA', typ: 'JWT' })
        .setIssuedAt()
        .setIssuer('urn:benched:vault:passport')
        .setSubject(payload.certId)
        .sign(privateKey);

    return jwt;
}

/**
 * Verifies a Vault Passport JWT using the Benched public Ed25519 key.
 * Returns the decoded payload if valid, or throws an error if invalid/forged.
 */
export async function verifyPassport(jwt: string): Promise<PassportPayload> {
    let publicKey: any | Uint8Array;

    if (MOCK_PUBLIC_KEY) {
        const pubBuffer = Buffer.from(MOCK_PUBLIC_KEY, 'base64');
        publicKey = await jose.importSPKI(pubBuffer.toString(), 'EdDSA');
    } else {
        // Warning: This only works in testing if we somehow pass the exact same key.
        // In a real flow without env vars, verification of a previously signed token will fail 
        // because it generates a fresh keypair here.
        throw new Error('VAULT_PUBLIC_KEY_B64 environment variable is required to verify passports.');
    }

    const { payload } = await jose.jwtVerify(jwt, publicKey, {
        issuer: 'urn:benched:vault:passport',
    });

    return payload as PassportPayload;
}
