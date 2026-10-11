import fs from 'fs';
import path from 'path';

const workspaceRoot = '/Users/bjmack/Downloads/Apps/Sneak';
const samcamTxtPath = path.join(workspaceRoot, 'samcam.txt');

function run() {
  const content = fs.readFileSync(samcamTxtPath, 'utf-8');
  
  // Split the file contents by the file markers
  const fileRegex = /={60}\r?\nFILE:\s*([^\r\n]+)\r?\n={60}\r?\n/g;
  
  const files = [];
  let match;
  let lastIndex = 0;
  
  while ((match = fileRegex.exec(content)) !== null) {
    if (files.length > 0) {
      files[files.length - 1].content = content.substring(lastIndex, match.index);
    }
    files.push({
      originalPath: match[1].trim(),
      headerIndex: match.index,
      content: ''
    });
    lastIndex = fileRegex.lastIndex;
  }
  if (files.length > 0) {
    files[files.length - 1].content = content.substring(lastIndex);
  }
  
  console.log(`Found ${files.length} files in samcam.txt`);
  
  for (const file of files) {
    const orig = file.originalPath;
    if (!orig.startsWith('src/')) {
      continue; // Skip non-src files for now (like package.json, etc.)
    }
    
    // Determine target path
    let targetRelativePath = '';
    if (orig.startsWith('src/app/')) {
      const remaining = orig.substring('src/app/'.length);
      targetRelativePath = path.join('src', 'app', 'samcam', remaining);
    } else if (orig.startsWith('src/components/')) {
      const remaining = orig.substring('src/components/'.length);
      targetRelativePath = path.join('src', 'samcam', 'components', remaining);
    } else if (orig.startsWith('src/hooks/')) {
      const remaining = orig.substring('src/hooks/'.length);
      targetRelativePath = path.join('src', 'samcam', 'hooks', remaining);
    } else if (orig.startsWith('src/lib/')) {
      const remaining = orig.substring('src/lib/'.length);
      targetRelativePath = path.join('src', 'samcam', 'lib', remaining);
    } else if (orig.startsWith('src/ai/')) {
      const remaining = orig.substring('src/ai/'.length);
      targetRelativePath = path.join('src', 'samcam', 'ai', remaining);
    }
    
    if (!targetRelativePath) {
      console.log(`Skipping unknown path: ${orig}`);
      continue;
    }
    
    const targetAbsPath = path.join(workspaceRoot, targetRelativePath);
    
    // Adjust contents (imports, link targets, etc.)
    let adjustedContent = file.content;
    
    // 1. Path imports starting with @/
    adjustedContent = adjustedContent.replace(/@\/components\//g, '@/samcam/components/');
    adjustedContent = adjustedContent.replace(/@\/hooks\//g, '@/samcam/hooks/');
    adjustedContent = adjustedContent.replace(/@\/lib\//g, '@/samcam/lib/');
    adjustedContent = adjustedContent.replace(/@\/ai\//g, '@/samcam/ai/');
    adjustedContent = adjustedContent.replace(/@\/app\//g, '@/app/samcam/');
    
    // 2. Relative imports adjust if we are moving from src/app/ to src/app/samcam/
    if (orig.startsWith('src/app/')) {
      // In src/app/capture/page.tsx, if it imports from "./auth-provider", it needs to be adjusted.
      // Wait, let's see: if we just search for import statements that import relative files
      // e.g. from "./auth-provider" or similar in files that were originally at src/app/[something]/page.tsx
      // For src/app/page.tsx:
      // it is moved to src/app/samcam/page.tsx. So "./auth-provider" is correct because auth-provider.tsx is also moved to src/app/samcam/auth-provider.tsx.
      // For src/app/capture/page.tsx:
      // it was in src/app/capture/page.tsx, importing from "@/lib/..." which we adjusted, and if it imported from "../auth-provider" or similar, wait, let's look:
      // In original src/app/capture/page.tsx, did it import from "./auth-provider"?
      // Let's look at the imports in samcam.txt for src/app/capture/page.tsx:
      // There are no local imports like "./auth-provider" in capture/page.tsx! It imports from firebase, etc.
      // Let's check other page.tsx files.
      // Wait, let's adjust `/capture`, `/review`, `/collection`, etc. in router pushes/links.
      // All page routes are nested under /samcam.
      // In original files:
      // Link href="/capture", Router.push("/review"), etc.
      // We must map these to `/samcam/capture`, `/samcam/review`, etc.
      // Let's do a search and replace for:
      // "/capture" -> "/samcam/capture"
      // "/review" -> "/samcam/review"
      // "/collection" -> "/samcam/collection"
      // "/settings" -> "/samcam/settings"
      // "/login" -> "/samcam/login"
      // "/list" -> "/samcam/list"
      // "/rare" -> "/samcam/rare"
      // "/hotwheels" -> "/samcam/hotwheels"
      // "/export" -> "/samcam/export"
      // "/" -> "/samcam" (this one is tricky, let's be careful. Usually it's Link href="/" or router.push("/") or fetch("/api/..."))
      // Wait, fetch("/api/...") -> fetch("/samcam/api/...")
      adjustedContent = adjustedContent.replace(/(["'])\/capture/g, '$1/samcam/capture');
      adjustedContent = adjustedContent.replace(/(["'])\/review/g, '$1/samcam/review');
      adjustedContent = adjustedContent.replace(/(["'])\/collection/g, '$1/samcam/collection');
      adjustedContent = adjustedContent.replace(/(["'])\/settings/g, '$1/samcam/settings');
      adjustedContent = adjustedContent.replace(/(["'])\/login/g, '$1/samcam/login');
      adjustedContent = adjustedContent.replace(/(["'])\/list/g, '$1/samcam/list');
      adjustedContent = adjustedContent.replace(/(["'])\/rare/g, '$1/samcam/rare');
      adjustedContent = adjustedContent.replace(/(["'])\/hotwheels/g, '$1/samcam/hotwheels');
      adjustedContent = adjustedContent.replace(/(["'])\/export/g, '$1/samcam/export');
      adjustedContent = adjustedContent.replace(/(["'])\/api\//g, '$1/samcam/api/');
      
      // Let's be careful with Link href="/" or router.push("/") or router.replace("/").
      // We want to map these to "/samcam".
      // Let's replace 'href="/"' with 'href="/samcam"' and 'push("/")' with 'push("/samcam")' and 'replace("/")' with 'replace("/samcam")'
      adjustedContent = adjustedContent.replace(/href=(["'])\/(["'])/g, 'href=$1/samcam$2');
      adjustedContent = adjustedContent.replace(/push\((["'])\/(["'])\)/g, 'push($1/samcam$2)');
      adjustedContent = adjustedContent.replace(/replace\((["'])\/(["'])\)/g, 'replace($1/samcam$2)');
    }
    
    // Check if the target file exists
    if (!fs.existsSync(targetAbsPath)) {
      console.log(`[NEW FILE] Writing to ${targetRelativePath}`);
      fs.mkdirSync(path.dirname(targetAbsPath), { recursive: true });
      fs.writeFileSync(targetAbsPath, adjustedContent, 'utf-8');
    } else {
      const existingContent = fs.readFileSync(targetAbsPath, 'utf-8');
      if (existingContent.trim() !== adjustedContent.trim()) {
        console.log(`[MODIFIED] Overwriting ${targetRelativePath}`);
        fs.writeFileSync(targetAbsPath, adjustedContent, 'utf-8');
      }
    }
  }
  console.log('Comparison and synchronization finished.');
}

run();
