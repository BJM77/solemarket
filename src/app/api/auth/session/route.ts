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

        // ALWAYS allow session creation if the ID token is valid. 
        // Previously we checked if auth_time was < 5 mins, but this caused 
        // persistent 401s for returning users who were still logged into 
        // the client SDK but had no session cookie.

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

    } catch (error) {
        console.error('Session creation failed:', error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}


export async function DELETE() {
    (await cookies()).delete("session");
    return NextResponse.json({ status: "success" }, { status: 200 });
}
