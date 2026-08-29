const fs = require('fs');
let code = fs.readFileSync('src/components/ProductDetailPage.tsx', 'utf-8');

// The main hero image container still has a border?
code = code.replace(
  `            <div className="aspect-square bg-slate-50 dark:bg-slate-900 rounded-3xl overflow-hidden border-none relative shadow-inner group">`,
  `            <div className="aspect-square bg-slate-50 dark:bg-slate-900 rounded-3xl overflow-hidden border-none relative shadow-sm group">`
);
fs.writeFileSync('src/components/ProductDetailPage.tsx', code);
