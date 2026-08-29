const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

const target = `          saveDiskDb();
          return res.json({ data: normalizedList });`;

const replacement = `          saveDiskDb();
          return res.json({ data: Object.values(memoryStore[colName]) });`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('server.ts', code);
  console.log("Fixed server returning stale Supabase data instead of memory store.");
} else {
  console.log("target not found");
}
