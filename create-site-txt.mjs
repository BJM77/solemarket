import fs from 'fs';
import path from 'path';

const ROOT_DIR = process.cwd();
const OUTPUT_FILE = path.join(ROOT_DIR, 'site.txt');

const EXCLUDED_DIRS = new Set([
    'node_modules', 
    '.next', 
    '.git', 
    '.gemini', 
    'out', 
    'build', 
    '.vscode',
    'scratch',
    'cards',
    'docs',
    'secrets_staging',
    'scripts'
]);

const INCLUDED_EXTENSIONS = new Set([
    '.js', '.jsx', '.ts', '.tsx', '.css', '.scss', '.json', '.html', '.md', '.mjs', '.cjs'
]);

const EXCLUDED_FILES = new Set([
    'package-lock.json',
    'site.txt',
    'sneak.txt',
    'allsneak.txt',
    'combined_codebase.txt',
    'service-account.json',
    'tsconfig.tsbuildinfo'
]);

function walkDir(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            if (!EXCLUDED_DIRS.has(file)) {
                walkDir(filePath, fileList);
            }
        } else {
            const ext = path.extname(file).toLowerCase();
            // Exclude .env files to protect API keys
            if (file.startsWith('.env') || file.includes('service-account')) {
                continue;
            }
            if (INCLUDED_EXTENSIONS.has(ext) && !EXCLUDED_FILES.has(file) && !file.endsWith('.log') && !file.endsWith('.txt')) {
                fileList.push(filePath);
            }
        }
    }
    return fileList;
}

try {
    console.log("Gathering files...");
    const allFiles = walkDir(ROOT_DIR);
    
    const outStream = fs.createWriteStream(OUTPUT_FILE);
    
    outStream.write("========================================================================\n");
    outStream.write("PROJECT ARCHITECTURE / FILE LIST\n");
    outStream.write("========================================================================\n\n");
    for (const file of allFiles) {
        outStream.write(path.relative(ROOT_DIR, file) + '\n');
    }
    outStream.write("\n\n");

    for (const file of allFiles) {
        outStream.write("========================================================================\n");
        outStream.write(`FILE: ${path.relative(ROOT_DIR, file)}\n`);
        outStream.write("========================================================================\n\n");
        let content = fs.readFileSync(file, 'utf-8');
        // Extra precaution: Replace API keys if any are found in code
        content = content.replace(/(apiKey:\s*["']).*?(["'])/g, '$1[REDACTED]$2');
        content = content.replace(/(STRIPE_SECRET_KEY:\s*["']).*?(["'])/g, '$1[REDACTED]$2');
        content = content.replace(/(NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:\s*["']).*?(["'])/g, '$1[REDACTED]$2');
        outStream.write(content);
        outStream.write("\n\n");
    }
    
    outStream.end();
    
    outStream.on('finish', () => {
        const stats = fs.statSync(OUTPUT_FILE);
        const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
        console.log(`✅ Successfully created site.txt at ${OUTPUT_FILE} (${sizeMB} MB)`);
    });

} catch (error) {
    console.error("Error creating backup:", error);
}
