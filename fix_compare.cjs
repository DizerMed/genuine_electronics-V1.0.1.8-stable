const fs = require('fs');
let code = fs.readFileSync('src/components/ProductCompareModal.tsx', 'utf-8');

code = code.replace(/border border-slate-200 dark:border-slate-700/g, 'border-none');
code = code.replace(/border border-slate-100/g, 'border-none');
code = code.replace(/border border-slate-200\/80/g, 'border-none');

fs.writeFileSync('src/components/ProductCompareModal.tsx', code);
