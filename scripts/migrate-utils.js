const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Find all ts/tsx files in src
const files = execSync('find src -type f -name "*.ts" -o -name "*.tsx"').toString().split('\n').filter(Boolean);

let updated = 0;
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  
  // Replace import { cn } from "@/lib/utils" with ui
  // We need to handle both single and double quotes, and semicolons
  if (content.includes('@/lib/utils')) {
    const original = content;
    content = content.replace(/from\s+['"]@\/lib\/utils['"]/g, 'from "@/lib/utils/ui"');
    if (content !== original) {
      fs.writeFileSync(file, content);
      changed = true;
      updated++;
    }
  }
}
console.log(`Updated ${updated} files.`);
