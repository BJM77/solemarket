import fetch from 'node-fetch';

/**
 * Verification Script for Security Fixes
 * 
 * Run this against your local development server:
 * npm run dev
 * npx ts-node scripts/verify-security-fixes.ts
 */

const BASE_URL = 'http://localhost:9007';

// Mock values for testing (should match what you have in .env for local testing)
const SECRETS = {
    ADMIN_SEED_TOKEN: 'test_seed_token_1234567890',
    TELEGRAM_SECRET_TOKEN: 'test_telegram_token',
    LOG_SECRET: 'test_log_secret',
    HEALTH_CHECK_SECRET: 'test_health_secret'
};

async function testEndpoint(name: string, path: string, method: string, headers: any, body: any = null) {
    console.log(`\n--- Testing ${name} ---`);
    console.log(`Target: ${method} ${path}`);
    
    try {
        const response = await fetch(`${BASE_URL}${path}`, {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            },
            body: body ? JSON.stringify(body) : null
        });

        const status = response.status;
        let data: any = {};
        try {
            data = await response.json();
        } catch (e) {
            data = { text: await response.text() };
        }

        console.log(`Result: ${status} ${response.statusText}`);
        if (status === 200 || status === 201) {
            console.log('✅ SUCCESS (Access Granted)');
        } else if (status === 401 || status === 403) {
            console.log('🔒 SECURE (Access Denied as expected)');
        } else {
            console.log('⚠️ UNEXPECTED STATUS');
        }
        
        return { status, data };
    } catch (error: any) {
        console.error(`❌ Error testing ${name}:`, error.message);
        return { error: error.message };
    }
}

async function runVerification() {
    console.log('🚀 Starting Security Verification...');
    console.log(`Base URL: ${BASE_URL}`);

    // 1. Admin Seed API
    await testEndpoint('Admin Seed (No Token)', '/api/admin/seed', 'POST', {});
    await testEndpoint('Admin Seed (Invalid Token)', '/api/admin/seed', 'POST', { 'Authorization': 'Bearer wrong' });

    // 2. Telegram Webhook
    await testEndpoint('Telegram Webhook (No Secret)', '/api/webhooks/telegram', 'POST', {}, {});
    await testEndpoint('Telegram Webhook (Invalid Secret)', '/api/webhooks/telegram', 'POST', { 'x-telegram-bot-api-secret-token': 'wrong' }, {});

    // 3. Error Logger
    await testEndpoint('Error Logger (No Secret)', '/api/log-error', 'POST', {}, { error: 'test' });
    await testEndpoint('Error Logger (Invalid Secret)', '/api/log-error', 'POST', { 'x-log-secret': 'wrong' }, { error: 'test' });

    // 4. Health Check
    await testEndpoint('Health Check (No Secret)', '/api/health/db', 'GET', {});
    await testEndpoint('Health Check (Invalid Secret)', '/api/health/db', 'GET', { 'x-health-check-secret': 'wrong' });

    console.log('\n--- Verification Complete ---');
    console.log('Note: To test success cases (200 OK), ensure your .env variables match the tokens in this script and the server is running.');
}

runVerification();
