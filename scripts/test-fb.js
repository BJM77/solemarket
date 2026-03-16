require('dotenv').config({ path: '.env.local' });
const https = require('https');

const ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
const PAGE_ID = process.env.FACEBOOK_PAGE_ID || '982242931644882';

if (!ACCESS_TOKEN) {
    console.error('Error: FACEBOOK_PAGE_ACCESS_TOKEN is missing in .env.local');
    process.exit(1);
}

const postData = JSON.stringify({
    message: 'Test post from Benched.au backend integration! 🏀',
    access_token: ACCESS_TOKEN
});

const options = {
    hostname: 'graph.facebook.com',
    path: `/v22.0/${PAGE_ID}/feed`,
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
};

const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        console.log('Response:', data);
    });
});

req.on('error', (e) => {
    console.error('Request failed:', e);
});

req.write(postData);
req.end();
