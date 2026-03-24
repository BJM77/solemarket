const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

function findMissingAltTags() {
  const missingAltFiles = [];
  walkDir('/Users/ai/Desktop/Sneak/src', (filePath) => {
    if (filePath.endsWith('.tsx') || filePath.endsWith('.jsx')) {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      let inImageTag = false;
      let hasAlt = false;
      let startLine = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Very basic JSX pseudo-parser for <Image and <img
        if ((line.includes('<Image') || line.includes('<img')) && !line.includes('//')) {
          inImageTag = true;
          hasAlt = false;
          startLine = i + 1;
        }

        if (inImageTag) {
          if (line.includes('alt=')) {
            hasAlt = true;
          }

          if (line.includes('>')) {
            inImageTag = false;
            if (!hasAlt) {
              missingAltFiles.push(`${filePath}:${startLine}`);
            }
          }
        }
      }
    }
  });

  console.log(`Found ${missingAltFiles.length} images without alt props:`);
  missingAltFiles.forEach(f => console.log(f));
}

findMissingAltTags();
