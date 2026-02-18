import { env } from 'process';

const EBAY_ENV = process.env.EBAY_ENV || 'sandbox'; // Default to lowercase to match typical usage
const EBAY_API_URL = EBAY_ENV.toLowerCase() === 'production'
    ? 'https://api.ebay.com/identity/v1/oauth2/token'
    : 'https://api.sandbox.ebay.com/identity/v1/oauth2/token';

export async function getEbayAppToken() {
    // Support both naming conventions to be safe, preferring CLIENT_ID
    const clientId = process.env.EBAY_CLIENT_ID || process.env.EBAY_APP_ID;
    const clientSecret = process.env.EBAY_CLIENT_SECRET || process.env.EBAY_CERT_ID;

    if (!clientId || !clientSecret) {
        console.warn('eBay API not configured. Research tools will be limited.');
        return null;
    }

    // Base64 encode the client ID and secret
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    try {
        const response = await fetch(EBAY_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${credentials}`
            },
            body: new URLSearchParams({
                grant_type: 'client_credentials',
                scope: 'https://api.ebay.com/oauth/api_scope'
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('eBay Token Error Response:', errorText);
            return null;
        }

        const data = await response.json();
        return data.access_token;
    } catch (error: any) {
        console.error('eBay Auth Exception:', error.message);
        return null;
    }
}
