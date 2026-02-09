import { env } from 'process';

const EBAY_ENV = process.env.EBAY_ENV || 'SANDBOX';
const EBAY_API_URL = EBAY_ENV === 'PRODUCTION'
    ? 'https://api.ebay.com/identity/v1/oauth2/token'
    : 'https://api.sandbox.ebay.com/identity/v1/oauth2/token';

export async function getEbayAppToken() {
    const clientId = process.env.EBAY_APP_ID;
    const clientSecret = process.env.EBAY_CERT_ID;

    if (!clientId || !clientSecret) {
        throw new Error('eBay App ID or Cert ID not configured');
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
            const error = await response.json();
            throw new Error(`Failed to fetch eBay token: ${error.error_description || response.statusText}`);
        }

        const data = await response.json();
        return data.access_token;
    } catch (error: any) {
        console.error('eBay Auth Error:', error.message);
        throw error;
    }
}
