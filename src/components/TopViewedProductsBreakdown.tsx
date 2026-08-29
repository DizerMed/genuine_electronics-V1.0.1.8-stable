import React, { useState } from 'react';
import { 
  Eye, 
  Search, 
  Flame, 
  TrendingUp, 
  ShoppingCart, 
  Sparkles, 
  ArrowUpRight, 
  CheckCircle2, 
  Filter, 
  Tag,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Percent
} from 'lucide-react';
import { VisitorTopProduct } from '../types';

interface TopViewedProductsBreakdownProps {
  products: VisitorTopProduct[];
  onSelectProduct?: (productId: string) => void;
  onSelectSearchQuery?: (query: string) => void;
  isDark?: boolean;
}

export const TopViewedProductsBreakdown: React.FC<TopViewedProductsBreakdownProps> = ({
  products = [],
  onSelectProduct,
  onSelectSearchQuery,
  isDark = false
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'trending' | 'search-driven'>('all');
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);

  // Filter products based on selected mode
  const filteredProducts = products.filter(p => {
    if (filterMode === 'trending') return p.isTrending || (p.trendScore && p.trendScore >= 35);
    if (filterMode === 'search-driven') return (p.topCorrelatedSearches && p.topCorrelatedSearches.length > 0) || (p.searchAssistedViews && p.searchAssistedViews > 0);
    return true;
  });

  const trendingCount = products.filter(p => p.isTrending || (p.trendScore && p.trendScore >= 35)).length;
  const searchDrivenCount = products.filter(p => (p.topCorrelatedSearches && p.topCorrelatedSearches.length > 0) || (p.searchAssistedViews && p.searchAssistedViews > 0)).length;

  const bgCard = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80';
  const textTitle = isDark ? 'text-white' : 'text-slate-900';
  const textSub = isDark ? 'text-slate-400' : 'text-slate-500';
  const bgSubtle = isDark ? 'bg-slate-800/80 border-slate-700/80' : 'bg-slate-50 border-slate-100';

  return (
    <div className={`rounded-2xl border ${bgCard} p-5 sm:p-6 shadow-sm flex flex-col justify-between`}>
      <div>
        {/* Header & Mode Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Eye className="w-3.5 h-3.5" />
              </div>
              <h3 className={`text-base font-bold ${textTitle}`}>Top Viewed Products &amp; Search Correlation</h3>
            </div>
            <p className={`text-xs ${textSub} mt-0.5`}>
              Identifies high-traffic catalog items correlated with visitor keyword searches.
            </p>
          </div>

          {/* Sub-Tabs: All vs Trending vs Search-Driven */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All ({products.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('trending')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                filterMode === 'trending'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/30'
              }`}
            >
              <Flame className="w-3 h-3" />
              <span>Trending ({trendingCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('search-driven')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                filterMode === 'search-driven'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30'
              }`}
            >
              <Search className="w-3 h-3" />
              <span>Search-Driven ({searchDrivenCount})</span>
            </button>
          </div>
        </div>

        {/* Product Items List */}
        {filteredProducts.length > 0 ? (
          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {filteredProducts.slice(0, 10).map((prod, idx) => {
              const isExpanded = expandedProductId === prod.id;
              const hasSearches = prod.topCorrelatedSearches && prod.topCorrelatedSearches.length > 0;
              const trendScore = prod.trendScore || (prod.isTrending ? 85 : 40);

              return (
                <div
                  key={prod.id || idx}
                  className={`rounded-xl border transition-all ${bgSubtle} hover:border-blue-300 dark:hover:border-blue-700/60`}
                >
                  <div className="p-3 flex items-center justify-between gap-3">
                    {/* Product Image & Info */}
                    <div 
                      className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                      onClick={() => onSelectProduct && onSelectProduct(prod.id)}
                      title={`Filter logs for ${prod.name}`}
                    >
                      <div className="relative shrink-0">
                        {prod.image ? (
                          <img
                            src={prod.image}
                            alt={prod.name}
                            className="w-11 h-11 rounded-lg object-contain bg-white border border-slate-200 dark:border-slate-700 p-0.5"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
                            <Eye className="w-4 h-4" />
                          </div>
                        )}
                        <span className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] font-black flex items-center justify-center border border-white dark:border-slate-800 shadow-xs">
                          #{idx + 1}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className={`text-xs font-bold ${textTitle} truncate max-w-[200px] sm:max-w-xs hover:text-blue-600`}>
                            {prod.name}
                          </p>
                          {prod.isTrending && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400 text-[9px] font-extrabold border border-orange-200 dark:border-orange-800/40">
                              <Flame className="w-2.5 h-2.5" />
                              <span>TRENDING</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap">
                          <span>{prod.category}</span>
                          <span>•</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            TZS {(prod.price || 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Stats & Expand CTA */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                            {prod.views} views
                          </span>
                          {trendScore > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold" title="Composite Trend Score">
                              {trendScore} pts
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                          {prod.cartAdds} in cart ({prod.conversionRate}%)
                        </div>
                      </div>

                      {hasSearches && (
                        <button
                          type="button"
                          onClick={() => setExpandedProductId(isExpanded ? null : prod.id)}
                          className="p-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                          title="Toggle correlated search queries"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Correlated Search Queries Breakdown Drawer */}
                  {hasSearches && isExpanded && (
                    <div className="px-3 pb-3 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                          <Search className="w-2.5 h-2.5" />
                          <span>Search Terms that Led to this Product Visit:</span>
                        </span>
                        {prod.searchAssistedViews !== undefined && (
                          <span className="text-[10px] text-slate-500">
                            {prod.searchAssistedViews} search-assisted visits
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {prod.topCorrelatedSearches?.map((s, sIdx) => (
                          <button
                            key={sIdx}
                            type="button"
                            onClick={() => onSelectSearchQuery && onSelectSearchQuery(s.query)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/40 text-[11px] font-medium transition-colors cursor-pointer group"
                            title={`Filter logs for search "${s.query}"`}
                          >
                            <span>"{s.query}"</span>
                            <span className="text-[9px] px-1 rounded bg-white dark:bg-slate-800 font-bold text-indigo-900 dark:text-indigo-200">
                              {s.matchCount} ({s.percentage}%)
                            </span>
                            <ArrowUpRight className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center text-sm text-slate-400">
            No product view events found matching the active filter.
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-500" />
          <span>Click any product or correlated search tag to inspect corresponding session journey logs.</span>
        </span>
        <span className="font-semibold text-slate-700 dark:text-slate-300">
          Ranked by Trending Velocity &amp; Traffic Volume
        </span>
      </div>
    </div>
  );
};
