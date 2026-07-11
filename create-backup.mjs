import fs from 'fs';
import path from 'path';

const ROOT_DIR = process.cwd();
const OUTPUT_FILE = path.join(ROOT_DIR, 'sneak.txt');

const EXCLUDED_DIRS = new Set([
    'node_modules', 
    '.next', 
    '.git', 
    '.gemini', 
    'out', 
    'build', 
    '.vscode'
]);

const EXCLUDED_EXTENSIONS = new Set([
    '.jpg', '.jpeg', '.png', '.gif', '.svg', '.ico', 
    '.woff', '.woff2', '.ttf', '.eot', 
    '.pdf', '.zip', '.tar', '.gz', 
    '.mp4', '.webm', 
    '.txt', // Exclude .txt to avoid duplicating previous backups like listing.txt or allsneak.txt
    '.lock'
]);

const EXCLUDED_FILES = new Set([
    'package-lock.json',
    'sneak.txt',
    '.DS_Store'
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
            if (!EXCLUDED_EXTENSIONS.has(ext) && !EXCLUDED_FILES.has(file) && !file.endsWith('.log')) {
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
    
    // Write Architecture (Tree)
    outStream.write("========================================================================\n");
    outStream.write("PROJECT ARCHITECTURE / FILE LIST\n");
    outStream.write("========================================================================\n\n");
    for (const file of allFiles) {
        outStream.write(path.relative(ROOT_DIR, file) + '\n');
    }
    outStream.write("\n\n");

    // Write file contents
    console.log(`Writing ${allFiles.length} files to sneak.txt...`);
    for (const file of allFiles) {
        outStream.write("========================================================================\n");
        outStream.write(`FILE: ${path.relative(ROOT_DIR, file)}\n`);
        outStream.write("========================================================================\n\n");
        const content = fs.readFileSync(file, 'utf-8');
        outStream.write(content);
        outStream.write("\n\n");
    }
    
    outStream.end();
    
    outStream.on('finish', () => {
        const stats = fs.statSync(OUTPUT_FILE);
        const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
        console.log(`✅ Successfully created complete backup at ${OUTPUT_FILE} (${sizeMB} MB)`);
    });

} catch (error) {
    console.error("Error creating backup:", error);
}
