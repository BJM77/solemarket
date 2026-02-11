import { NextResponse } from 'next/server';
import { authAdmin } from '@/lib/firebase/admin';
import { SUPER_ADMIN_EMAILS } from '@/lib/constants';

export async function POST(request: Request) {
    try {
        const { idToken } = await request.json();

        if (!idToken) {
            return NextResponse.json({ error: 'Missing ID token' }, { status: 400 });
        }

        const decodedToken = await authAdmin.verifyIdToken(idToken);
        const { uid, email } = decodedToken;

        if (!email || !SUPER_ADMIN_EMAILS.includes(email)) {
            return NextResponse.json({ error: 'Unauthorized: Email not in super admin list' }, { status: 403 });
        }

        await authAdmin.setCustomUserClaims(uid, {
            role: 'superadmin',
            admin: true // Backward compatibility
        });

        return NextResponse.json({
            success: true,
            message: `Successfully set superadmin claim for ${email} (${uid})`
        });

    } catch (error: any) {
        console.error('Error setting custom claims:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
