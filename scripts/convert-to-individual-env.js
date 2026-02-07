const fs = require('fs');
const dotenv = require('dotenv');
const env = dotenv.parse(fs.readFileSync('.env.local'));
const sa = env.SERVICE_ACCOUNT_JSON;

// Parse the JSON
const parsed = JSON.parse(sa);
console.log('Parsed successfully');
console.log('Project ID:', parsed.project_id);
console.log('Client Email:', parsed.client_email);

// Read the full .env.local file
const envContent = fs.readFileSync('.env.local', 'utf8');

// Remove the SERVICE_ACCOUNT_JSON line
const lines = envContent.split('\n').filter(line => !line.trim().startsWith('SERVICE_ACCOUNT_JSON='));

// Add individual variables
lines.push('');
lines.push('# Firebase Admin SDK Individual Secrets');
lines.push(`FIREBASE_ADMIN_PROJECT_ID=${parsed.project_id}`);
lines.push(`FIREBASE_ADMIN_CLIENT_EMAIL=${parsed.client_email}`);
// For the private key, we need to preserve \n as literal characters
// Just use the raw private_key from the parsed JSON but replace actual newlines with \\n
const privateKey = parsed.private_key.replace(/\n/g, '\\n');
lines.push(`FIREBASE_ADMIN_PRIVATE_KEY="${privateKey}"`);

fs.writeFileSync('.env.local', lines.join('\n'));
console.log('Converted SERVICE_ACCOUNT_JSON to individual env vars');
console.log('Private key length:', privateKey.length);
