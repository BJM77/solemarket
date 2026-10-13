const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const srcDir = path.join(rootDir, 'src');
const scriptsDir = path.join(rootDir, 'scripts');
const outputFile = path.join(rootDir, 'benched_trust_engine_backup.txt');

const ignoreDirs = ['node_modules', '.next', '.git', 'dist'];
const ignoreFiles = ['.env', '.env.local', '.env.development', '.env.production', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'];
const allowedExtensions = ['.ts', '.tsx', '.js', '.jsx', '.css', '.md', '.json'];

let fileContents = '';

function traverse(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            if (!ignoreDirs.includes(file)) {
                traverse(fullPath);
            }
        } else {
            if (ignoreFiles.includes(file)) continue;
            
            const ext = path.extname(file);
            if (allowedExtensions.includes(ext) || file === 'package.json' || file === 'tsconfig.json') {
                const content = fs.readFileSync(fullPath, 'utf8');
                const relativePath = path.relative(rootDir, fullPath);
                
                // Extra safety: Check if file contains API keys based on simple heuristics
                if (content.includes('NEXT_PUBLIC_FIREBASE_API_KEY') && file.endsWith('.env')) {
                    continue; // Double check .env exclusion
                }

                fileContents += `\n\n================================================================================\n`;
                fileContents += `FILE: ${relativePath}\n`;
                fileContents += `================================================================================\n\n`;
                fileContents += content;
            }
        }
    }
}

console.log('Generating backup...');
traverse(srcDir);
traverse(scriptsDir);

// Add top level config files
const topLevelFiles = ['package.json', 'tsconfig.json', 'tailwind.config.ts', 'postcss.config.js', 'next.config.mjs'];
topLevelFiles.forEach(file => {
    const fullPath = path.join(rootDir, file);
    if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        fileContents += `\n\n================================================================================\n`;
        fileContents += `FILE: ${file}\n`;
        fileContents += `================================================================================\n\n`;
        fileContents += content;
    }
});

fs.writeFileSync(outputFile, fileContents);
console.log(`Backup successfully created at ${outputFile}`);
