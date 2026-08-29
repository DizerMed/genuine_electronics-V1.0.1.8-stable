const fs = require('fs');
let code = fs.readFileSync('src/components/ProductDetailPage.tsx', 'utf-8');

// Fix Specifications Table Borders
code = code.replace(
  /className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200\/80 flex justify-between items-center text-xs sm:text-sm"/g,
  'className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border-none flex justify-between items-center text-xs sm:text-sm"'
);

// Fix Warranty Tab Theme Issue
code = code.replace(
  `              <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl flex items-start gap-4">
                <ShieldCheck className="w-7 h-7 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-base mb-1">Official Country Warranty Coverage</h4>
                  <p>Every single unit sold by Genuine Electronics is sourced directly from authorized brand distributors. Your receipt includes official serial number registration valid for direct service across Tanzania.</p>`,
  `              <div className="bg-emerald-50 dark:bg-emerald-500/10 border-none p-5 rounded-2xl flex items-start gap-4">
                <ShieldCheck className="w-7 h-7 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-emerald-900 dark:text-emerald-300 text-base mb-1">Official Country Warranty Coverage</h4>
                  <p className="text-emerald-800 dark:text-emerald-200/80">Every single unit sold by Genuine Electronics is sourced directly from authorized brand distributors. Your receipt includes official serial number registration valid for direct service across Tanzania.</p>`
);

fs.writeFileSync('src/components/ProductDetailPage.tsx', code);
console.log("Fixed specs and warranty theme!");
