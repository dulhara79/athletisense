const fs = require('fs');
const path = require('path');

let changedFiles = 0;

function replaceInDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const p = path.join(dir, file);
    if (fs.statSync(p).isDirectory()) {
      replaceInDir(p);
    } else if (p.endsWith('.jsx') || p.endsWith('.css')) {
      let originalContent = fs.readFileSync(p, 'utf8');
      let content = originalContent;
      
      content = content.replace(/DM Mono/g, 'DM Sans');
      
      if (content !== originalContent) {
        fs.writeFileSync(p, content);
        changedFiles++;
        console.log(`Updated ${p}`);
      }
    }
  }
}

replaceInDir('./src');
console.log(`Replaced in ${changedFiles} files.`);
