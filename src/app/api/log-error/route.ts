import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const errorData = await request.json();

        // Log to console in development
        if (process.env.NODE_ENV === 'development') {
            console.error('Client Error:', errorData);
        }

        // In production, you would send to error tracking service (Sentry, LogRocket, etc.)
        // Example: await Sentry.captureException(errorData);

        // For now, just log to server console
        console.error('[Client Error]', {
            timestamp: errorData.timestamp,
            url: errorData.url,
            error: errorData.error,
            userAgent: errorData.userAgent,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to log error:', error);
        return NextResponse.json({ success: false }, { status: 500 });
    }
}
