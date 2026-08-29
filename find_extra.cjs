const fs = require('fs');
const content = fs.readFileSync('src/lib/useSupabase.ts', 'utf8');

let braces = 0;
const lines = content.split('\n');
for (let i = 87; i < 260; i++) {
  const line = lines[i] || '';
  for (const c of line) {
    if (c === '{') braces++;
    if (c === '}') braces--;
  }
  if (braces === 0) {
    console.log(`Braces hit 0 at line ${i+1}: ${line}`);
    break;
  }
}
