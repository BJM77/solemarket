import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { NextResponse } from 'next/server';

// Initialize the client with credentials from environment variables
// Use a singleton pattern to avoid re-initializing on every request
let analyticsClient: BetaAnalyticsDataClient | null = null;

function getAnalyticsClient() {
    if (analyticsClient) return analyticsClient;

    const clientEmail = process.env.GA_CLIENT_EMAIL;
    const privateKey = process.env.GA_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!clientEmail || !privateKey) {
        return null;
    }

    try {
        analyticsClient = new BetaAnalyticsDataClient({
            credentials: {
                client_email: clientEmail,
                private_key: privateKey,
            },
        });
        return analyticsClient;
    } catch (error) {
        console.error('Failed to initialize GA client:', error);
        return null;
    }
}

export async function GET() {
    const propertyId = process.env.GA_PROPERTY_ID;
    const client = getAnalyticsClient();

    if (!propertyId || !client) {
        return NextResponse.json(
            { error: 'GA4 credentials or Property ID not configured' },
            { status: 500 }
        );
    }

    try {
        // Fetch real-time active users
        const [response] = await client.runRealtimeReport({
            property: `properties/${propertyId}`,
            metrics: [
                {
                    name: 'activeUsers',
                },
            ],
        });

        const activeUsers = response.rows?.[0]?.metricValues?.[0]?.value || '0';

        return NextResponse.json({ activeUsers: parseInt(activeUsers, 10) });
    } catch (error: any) {
        console.error('Error fetching real-time GA data:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch real-time data' },
            { status: 500 }
        );
    }
}
