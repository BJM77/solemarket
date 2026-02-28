import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
    try {
        const { idToken } = await request.json();

        if (!idToken) {
            (await cookies()).delete("session");
            return NextResponse.json({ status: "success" }, { status: 200 });
        }

        const { authAdmin } = await import('@/lib/firebase/admin');

        // Verify the ID token first
        const decodedIdToken = await authAdmin.verifyIdToken(idToken);

        // Only process if the user recently signed in (e.g. within the last 5 minutes)
        if (new Date().getTime() / 1000 - decodedIdToken.auth_time < 5 * 60) {
            // expiry: 5 days
            const expiresIn = 60 * 60 * 24 * 5 * 1000;

            // Create the session cookie
            const sessionCookie = await authAdmin.createSessionCookie(idToken, { expiresIn });

            (await cookies()).set("session", sessionCookie, {
                maxAge: expiresIn,
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                path: "/",
                sameSite: "lax",
            });

            return NextResponse.json({ status: "success" }, { status: 200 });
        } else {
            return NextResponse.json({ error: "Recent sign in required" }, { status: 401 });
        }

    } catch (error) {
        console.error('Session creation failed:', error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}


export async function DELETE() {
    (await cookies()).delete("session");
    return NextResponse.json({ status: "success" }, { status: 200 });
}
