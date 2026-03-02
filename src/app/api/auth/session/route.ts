import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
    try {
        let idToken = null;
        try {
            const body = await request.json();
            idToken = body.idToken;
        } catch (e) {
            // body might be empty
        }

        if (!idToken) {
            const authHeader = request.headers.get("authorization");
            if (authHeader && authHeader.startsWith("Bearer ")) {
                idToken = authHeader.split("Bearer ")[1];
            }
        }

        if (!idToken) {
            (await cookies()).delete("session");
            return NextResponse.json({ status: "success" }, { status: 200 });
        }

        const { authAdmin } = await import('@/lib/firebase/admin');
        const cookieStore = await cookies();
        const existingSessionCookie = cookieStore.get("session")?.value;

        if (existingSessionCookie) {
            try {
                // If they already have a valid session, just return 200 and skip recreating it
                await authAdmin.verifySessionCookie(existingSessionCookie, true);
                return NextResponse.json({ status: "success" }, { status: 200 });
            } catch (err) {
                // Session expired or invalid, we will try to create a new one below if the ID token is fresh
            }
        }

        // Verify the ID token first
        const decodedIdToken = await authAdmin.verifyIdToken(idToken);

        // Only process if the user recently signed in (e.g. within the last 5 minutes)
        if (new Date().getTime() / 1000 - decodedIdToken.auth_time < 5 * 60) {
            // expiry: 5 days
            const expiresIn = 60 * 60 * 24 * 5 * 1000;

            // Create the session cookie
            const sessionCookie = await authAdmin.createSessionCookie(idToken, { expiresIn });

            cookieStore.set("session", sessionCookie, {
                maxAge: expiresIn,
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                path: "/",
                sameSite: "lax",
            });

            return NextResponse.json({ status: "success" }, { status: 200 });
        } else {
            const currentTime = new Date().getTime() / 1000;
            console.warn(`[Auth Session] Rejecting token. auth_time: ${decodedIdToken.auth_time}, current_time: ${currentTime}, diff: ${currentTime - decodedIdToken.auth_time}s (max 300s)`);
            // Revert back to returning a 401 to accurately report missing session creation ability
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
