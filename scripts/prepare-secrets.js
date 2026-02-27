const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// 1. Create secrets directory
const secretsDir = path.join(process.cwd(), 'secrets_staging');
if (!fs.existsSync(secretsDir)) {
    fs.mkdirSync(secretsDir);
}

console.log('🔒 Preparing secrets in ./secrets_staging ...');

// 2. Read .env.local for GenAI Key
const envConfig = dotenv.parse(fs.readFileSync(path.join(process.cwd(), '.env.local')));
const genAiKey = envConfig.GOOGLE_GENAI_API_KEY;

if (genAiKey) {
    fs.writeFileSync(path.join(secretsDir, 'GOOGLE_GENAI_API_KEY.txt'), genAiKey);
    console.log('✅ Generated GOOGLE_GENAI_API_KEY.txt');
} else {
    console.error('❌ GOOGLE_GENAI_API_KEY not found in .env.local');
}

// 3. Read Service Account JSON
try {
    const saPath = path.join(process.cwd(), 'service-account.json');
    if (fs.existsSync(saPath)) {
        const sa = JSON.parse(fs.readFileSync(saPath, 'utf8'));

        fs.writeFileSync(path.join(secretsDir, 'FIREBASE_ADMIN_PRIVATE_KEY.txt'), sa.private_key);
        console.log('✅ Generated FIREBASE_ADMIN_PRIVATE_KEY.txt');

        fs.writeFileSync(path.join(secretsDir, 'FIREBASE_ADMIN_CLIENT_EMAIL.txt'), sa.client_email);
        console.log('✅ Generated FIREBASE_ADMIN_CLIENT_EMAIL.txt');

        fs.writeFileSync(path.join(secretsDir, 'FIREBASE_ADMIN_PROJECT_ID.txt'), sa.project_id);
        console.log('✅ Generated FIREBASE_ADMIN_PROJECT_ID.txt');
    } else {
        console.error('❌ Service Account JSON file not found');
    }
} catch (error) {
    console.error('❌ Error processing Service Account JSON:', error.message);
}

console.log('\n📂 Secret files are ready in ./secrets_staging/');
console.log('👉 You can now upload these files to Google Cloud Secret Manager.');
