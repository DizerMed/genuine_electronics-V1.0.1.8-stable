const fs = require('fs');

function replaceCreatedAt(filePath) {
  let code = fs.readFileSync(filePath, 'utf-8');
  
  const target = "createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),";
  const replacement = "createdAt: (() => { const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Africa/Nairobi' })); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); })(),";
  
  if (code.includes(target)) {
    code = code.split(target).join(replacement);
    fs.writeFileSync(filePath, code);
    console.log("Fixed createdAt in", filePath);
  }
}

replaceCreatedAt('src/App.tsx');
replaceCreatedAt('src/components/AdminPortal.tsx');
