import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
    try {
        const { idToken } = await request.json();

        if (!idToken) {
            (await cookies()).delete("session");
            return NextResponse.json({ status: "success" }, { status: 200 });
        }

        // Set the cookie
        // In a real app, you might want to verify the token with firebase-admin here
        // before setting it as a session cookie, or swap it for a session cookie.
        // For now, we will store the ID token (or a flag) to indicate auth.
        // NOTE: Storing the raw ID token in a cookie is checking for existence in middleware.

        // expiry: 5 days
        const expiresIn = 60 * 60 * 24 * 5 * 1000;

        (await cookies()).set("session", idToken, {
            maxAge: expiresIn,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            path: "/",
            sameSite: "lax",
        });

        return NextResponse.json({ status: "success" }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE() {
    (await cookies()).delete("session");
    return NextResponse.json({ status: "success" }, { status: 200 });
}
