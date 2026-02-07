const fs = require('fs');
const dotenv = require('dotenv');
const env = dotenv.parse(fs.readFileSync('.env.local'));
const sa = env.SERVICE_ACCOUNT_JSON;

// Parse it to verify it's valid
const parsed = JSON.parse(sa);
console.log('Original JSON is valid');
console.log('Project ID:', parsed.project_id);

// Read the full .env.local file
const envContent = fs.readFileSync('.env.local', 'utf8');

// Create a version without the SERVICE_ACCOUNT_JSON line
const lines = envContent.split('\n').filter(line => !line.trim().startsWith('SERVICE_ACCOUNT_JSON='));

// Create the new format: no quotes around the value (dotenv handles this)
const fixedJson = JSON.stringify(parsed);
const newLine = 'SERVICE_ACCOUNT_JSON=' + fixedJson;

lines.push(newLine);
fs.writeFileSync('.env.local', lines.join('\n'));
console.log('Rewrote .env.local with unquoted JSON value');
console.log('New value length:', newLine.length);
