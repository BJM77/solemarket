import { NextResponse } from 'next/server';
import { verifyPassport } from '@/lib/vault/signing';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        
        if (!body.jwt) {
            return NextResponse.json({ error: 'Missing jwt in request body' }, { status: 400 });
        }

        try {
            // This validates the signature and throws if it's invalid/expired/tampered
            const payload = await verifyPassport(body.jwt);
            
            return NextResponse.json({
                verified: true,
                message: 'Signature is valid and originated from the Benched Vault.',
                payload
            });
        } catch (verifyError: any) {
            return NextResponse.json({
                verified: false,
                error: 'Invalid signature. This passport may be forged or tampered with.',
                details: verifyError.message
            }, { status: 401 });
        }

    } catch (e: any) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
