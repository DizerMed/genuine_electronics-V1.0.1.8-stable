const fs = require('fs');
const content = fs.readFileSync('src/lib/useSupabase.ts', 'utf8');

const lines = content.split('\n');
let b = 0;
for (let i = 94; i < 242; i++) {
  const line = lines[i] || '';
  for (const c of line) {
    if (c === '{') b++;
    if (c === '}') b--;
  }
}
console.log('Braces inside try block:', b);
