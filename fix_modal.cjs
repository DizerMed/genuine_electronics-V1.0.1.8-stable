const fs = require('fs');
let code = fs.readFileSync('src/components/ProductDetailModal.tsx', 'utf-8');

// The modal doesn't use the isDark prop apparently, it's just hardcoded.
// But actually `ProductDetailModal` seems to not be receiving a dark mode prop, wait let's just add standard dark: classes.
code = code.replace(/bg-slate-50 /g, 'bg-slate-50 dark:bg-slate-900 ');
code = code.replace(/bg-white /g, 'bg-white dark:bg-slate-800 ');
code = code.replace(/text-slate-700 /g, 'text-slate-700 dark:text-slate-200 ');
code = code.replace(/text-slate-800 /g, 'text-slate-800 dark:text-slate-100 ');
code = code.replace(/border border-slate-200/g, 'border-none'); // the user wants NO borders
code = code.replace(/border border-slate-200\/80/g, 'border-none'); 

fs.writeFileSync('src/components/ProductDetailModal.tsx', code);
