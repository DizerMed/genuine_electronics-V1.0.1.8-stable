const fs = require('fs');
const content = fs.readFileSync('src/lib/useSupabase.ts', 'utf8');

const lines = content.split('\n');
let b = 0;
for (let i = 87; i < 248; i++) {
  const line = lines[i] || '';
  for (const c of line) {
    if (c === '{') b++;
    if (c === '}') b--;
  }
  console.log(`${i+1}: b=${b} | ${line}`);
}
