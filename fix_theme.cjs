const fs = require('fs');
let code = fs.readFileSync('src/components/ProductDetailPage.tsx', 'utf-8');

code = code.replace(
  `      {/* CLEAN BREADCRUMB & BACK NAVIGATION ROW */}
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">`,
  `      {/* CLEAN BREADCRUMB & BACK NAVIGATION ROW */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-2xs">`
);

code = code.replace(
  `                      isWishlisted
                        ? 'border-rose-200 bg-rose-50 text-rose-600'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:text-slate-300'`,
  `                      isWishlisted
                        ? 'border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:text-slate-300'`
);

code = code.replace(
  `                      <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold px-3 py-1 rounded-full block mb-1">`,
  `                      <span className="text-xs bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-none font-bold px-3 py-1 rounded-full block mb-1">`
);

code = code.replace(
  `                  <button
                    onClick={() => setSelectedQuantity((q) => Math.max(1, q - 1))}
                    className="w-9 h-9 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-base shadow-sm hover:bg-slate-50 dark:bg-slate-900 flex items-center justify-center transition-colors"
                  >`,
  `                  <button
                    onClick={() => setSelectedQuantity((q) => Math.max(1, q - 1))}
                    className="w-9 h-9 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-base shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
                  >`
);

code = code.replace(
  `                  <button
                    onClick={() => setSelectedQuantity((q) => Math.min(product.stock, q + 1))}
                    className="w-9 h-9 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-base shadow-sm hover:bg-slate-50 dark:bg-slate-900 flex items-center justify-center transition-colors"
                  >`,
  `                  <button
                    onClick={() => setSelectedQuantity((q) => Math.min(product.stock, q + 1))}
                    className="w-9 h-9 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-base shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
                  >`
);

code = code.replace(
  `        {/* SMART BUNDLE & FREQUENTLY BOUGHT TOGETHER */}
        {complementaryBundleItem && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-none p-6 sm:p-8 rounded-3xl space-y-6 shadow-sm">`,
  `        {/* SMART BUNDLE & FREQUENTLY BOUGHT TOGETHER */}
        {complementaryBundleItem && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800/80 dark:to-indigo-950/30 border-none p-6 sm:p-8 rounded-3xl space-y-6 shadow-sm">`
);

code = code.replace(
  `              <span className="text-xs bg-amber-400/20 text-amber-800 border-none font-extrabold px-3 py-1 rounded-full">
                Save 5% on 2-Item Bundle
              </span>`,
  `              <span className="text-xs bg-amber-400/20 text-amber-800 dark:text-amber-300 border-none font-extrabold px-3 py-1 rounded-full">
                Save 5% on 2-Item Bundle
              </span>`
);

code = code.replace(
  `              {/* Plus Sign */}
              <div className="md:col-span-1 text-center font-extrabold text-slate-400 text-2xl">+</div>`,
  `              {/* Plus Sign */}
              <div className="md:col-span-1 text-center font-extrabold text-slate-400 dark:text-slate-500 text-2xl">+</div>`
);


code = code.replace(
  `        {/* EXPLORE ALL CATEGORIES BOTTOM SECTION */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200/80 rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xs mt-10">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">`,
  `        {/* EXPLORE ALL CATEGORIES BOTTOM SECTION */}
        <div className="bg-white dark:bg-slate-800 border-none rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xs mt-10">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">`
);

code = code.replace(
  `      {/* STICKY BOTTOM QUICK PURCHASE BAR ON SCROLL */}
      {showStickyBar && (
        <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-700 p-3 sm:p-4 z-40 shadow-2xl animate-slideUp">`,
  `      {/* STICKY BOTTOM QUICK PURCHASE BAR ON SCROLL */}
      {showStickyBar && (
        <div className="fixed bottom-0 inset-x-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 p-3 sm:p-4 z-40 shadow-2xl animate-slideUp">`
);

fs.writeFileSync('src/components/ProductDetailPage.tsx', code);
console.log("Done fixing theme on Product Detail Page");
