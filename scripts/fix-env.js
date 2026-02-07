
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envConfig = dotenv.parse(envContent);

const saJson = envConfig.SERVICE_ACCOUNT_JSON || envConfig.FIREBASE_SERVICE_ACCOUNT_JSON;

if (!saJson) {
    console.log('SERVICE_ACCOUNT_JSON not found in .env.local');
    process.exit(1);
}

try {
    // Parse to verify it's valid JSON
    const parsed = JSON.parse(saJson);
    console.log('SERVICE_ACCOUNT_JSON is valid JSON.');

    // Re-stringify it to be a single line, safe string
    const fixedJson = JSON.stringify(parsed);

    // Create the new line
    // We use single quotes for the env value to disable most expansion
    // We need to escape single quotes if they exist (rare in JSON)
    const fixedLine = `SERVICE_ACCOUNT_JSON='${fixedJson.replace(/'/g, "'\\''")}'`;

    // We will search for the original key to see if we can just append or replace
    // But providing a new file is safer.

    const fixedPath = path.resolve(process.cwd(), '.env.local.fixed');

    console.log('Generating fixed .env file...');

    // We'll write a file that contains ONLY the fixed variable, or a suggestion.
    // Actually, let's try to reconstruct the file content with the fix if possible,
    // otherwise just give the user the fixed file with just the key.

    const lines = envContent.split('\n');
    let newLines = [];
    let replaced = false;

    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('SERVICE_ACCOUNT_JSON=')) {
            if (!replaced) {
                newLines.push(fixedLine);
                replaced = true;
            }
        } else if (trimmed.startsWith('FIREBASE_SERVICE_ACCOUNT_JSON=') && !envConfig.SERVICE_ACCOUNT_JSON) {
            if (!replaced) {
                newLines.push(`FIREBASE_SERVICE_ACCOUNT_JSON='${fixedJson.replace(/'/g, "'\\''")}'`);
                replaced = true;
            }
        } else {
            newLines.push(line);
        }
    }

    if (replaced) {
        fs.writeFileSync(fixedPath, newLines.join('\n'));
        console.log('Created .env.local.fixed with the CORRECTED content.');
        console.log('Please backup your .env.local and replace it with .env.local.fixed');
    } else {
        // If not replaced (e.g. key checking failed against raw lines due to formatting),
        // just write the key to the file.
        fs.writeFileSync(fixedPath, fixedLine);
        console.log('Could not automatically replace in full content.');
        console.log('Created .env.local.fixed with JUST the corrected line.');
        console.log('Please copy the content of .env.local.fixed into your .env.local file, replacing the old SERVICE_ACCOUNT_JSON.');
    }

} catch (error) {
    console.error('Failed to parse current value:', error.message);
    process.exit(1);
}
