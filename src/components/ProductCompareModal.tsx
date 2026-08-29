import React, { useState } from 'react';
import { 
  X, Check, ShoppingCart, ArrowRight, Star, ShieldCheck, 
  Trash2, Scale, Plus, AlertCircle, Sparkles, Layers, CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { Product, formatTZS } from '../types';

interface ProductCompareModalProps {
  compareProducts: Product[];
  allProducts: Product[];
  isOpen: boolean;
  onClose: () => void;
  onRemoveProduct: (productId: string) => void;
  onClearAll: () => void;
  onAddProduct: (product: Product) => void;
  addToCart: (product: Product, quantity?: number) => void;
  onSelectProduct?: (product: Product) => void;
  isDark?: boolean;
}

export const ProductCompareModal: React.FC<ProductCompareModalProps> = ({
  compareProducts,
  allProducts,
  isOpen,
  onClose,
  onRemoveProduct,
  onClearAll,
  onAddProduct,
  addToCart,
  onSelectProduct,
  isDark = false,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  // Find lowest price among compared items if more than 1 item
  const lowestPrice = compareProducts.length > 1 
    ? Math.min(...compareProducts.map(p => p.price))
    : null;

  // Extract all unique spec keys across compared products
  const allSpecKeys: string[] = Array.from(
    new Set<string>(
      compareProducts.flatMap(p => Object.keys(p.specs || {}))
    )
  );

  // Filter available products for adding to compare (not already selected)
  const q = (searchQuery || '').toLowerCase().trim();
  const availableToAdd = allProducts.filter(
    p => !compareProducts.some(cp => cp.id === p.id) &&
    (!q ||
     (p.name && String(p.name || "").toLowerCase().includes(q)) ||
     (p.brand && String(p.brand || "").toLowerCase().includes(q)) ||
     (p.category && String(p.category || "").toLowerCase().includes(q)))
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border-none w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden my-auto">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600/30 p-2.5 rounded-2xl border border-blue-500/40 text-blue-400">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white">Product Side-by-Side Comparison</h2>
                <span className="bg-blue-600 text-white text-xs font-extrabold px-2.5 py-0.5 rounded-full">
                  {compareProducts.length} / 3 Selected
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Analyze specs, features, and prices side-by-side to find your ideal genuine electronic.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {compareProducts.length > 0 && (
              <button
                onClick={onClearAll}
                className="text-xs text-slate-400 hover:text-rose-400 font-semibold px-3 py-2 rounded-xl hover:bg-slate-800 transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear All</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
              aria-label="Close Comparison"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

            {/* Empty State */}
            {compareProducts.length === 0 ? (
              <div className={`text-center py-16 rounded-2xl border-2 border-dashed p-8 ${
                isDark 
                  ? 'bg-slate-900 border-slate-800 text-slate-100' 
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}>
                <Scale className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
                <h3 className={`text-lg font-extrabold ${isDark ? 'text-white' : 'text-slate-800'}`}>No products selected for comparison</h3>
                <p className={`text-xs mt-1 max-w-md mx-auto ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Select up to 3 products while browsing the catalog by clicking the <strong>Compare</strong> button on any item.
                </p>
                <button
                  onClick={onClose}
                  className="mt-5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-6 py-2.5 rounded-xl transition-all shadow-md"
                >
                  Browse Products Now
                </button>
              </div>
            ) : (
              <>
                {/* Add Product Toolbar if < 3 items */}
                {compareProducts.length < 3 && (
                  <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                    isDark 
                      ? 'bg-slate-900 border-slate-800 text-slate-200' 
                      : 'bg-blue-50/80 border-blue-200/80 text-blue-900'
                  }`}>
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-blue-500 shrink-0" />
                      <span className={`text-xs font-bold ${isDark ? 'text-blue-300' : 'text-blue-900'}`}>
                        You can add {3 - compareProducts.length} more product{3 - compareProducts.length > 1 ? 's' : ''} to compare!
                      </span>
                    </div>

                    {!isAdding ? (
                      <button
                        onClick={() => setIsAdding(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-sm active:scale-95 shrink-0"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Product to Compare</span>
                      </button>
                    ) : (
                      <div className="w-full sm:w-auto flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Search product to add..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className={`border rounded-xl px-3 py-1.5 text-xs w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${
                            isDark 
                              ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' 
                              : 'bg-white border-blue-300 text-slate-800'
                          }`}
                          autoFocus
                        />
                        <button
                          onClick={() => { setIsAdding(false); setSearchQuery(''); }}
                          className={`text-xs px-2.5 py-1.5 font-bold ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          Cancel
                        </button>
                      </div>
                    )}

                    {/* Dropdown options when searching */}
                    {isAdding && availableToAdd.length > 0 && (
                      <div className={`w-full sm:col-span-2 border rounded-2xl shadow-xl p-2 max-h-48 overflow-y-auto space-y-1 mt-2 ${
                        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                      }`}>
                        {availableToAdd.slice(0, 6).map((product) => (
                          <div
                            key={product.id}
                            onClick={() => {
                              onAddProduct(product);
                              setIsAdding(false);
                              setSearchQuery('');
                            }}
                            className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors ${
                              isDark ? 'hover:bg-slate-800' : 'hover:bg-blue-50'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <img src={product.image} alt={product.name} className="w-8 h-8 rounded-lg object-cover bg-slate-800 border border-slate-700" />
                              <div className="min-w-0">
                                <p className={`text-xs font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{product.name}</p>
                                <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{product.brand} • {formatTZS(product.price)}</p>
                              </div>
                            </div>
                            <button className="bg-blue-600 text-white p-1 rounded-lg hover:bg-blue-700 shrink-0">
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Product Comparison Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {compareProducts.map((product) => {
                    const isLowest = lowestPrice !== null && product.price === lowestPrice && compareProducts.length > 1;

                    return (
                      <div
                        key={product.id}
                        className={`rounded-2xl border p-4 sm:p-5 flex flex-col justify-between relative shadow-sm transition-all ${
                          isDark 
                            ? isLowest ? 'bg-slate-800/90 border-emerald-500 ring-1 ring-emerald-500/20' : 'bg-slate-800/90 border-slate-700/80'
                            : isLowest ? 'bg-white border-emerald-400 ring-2 ring-emerald-500/20' : 'bg-white border-slate-200'
                        }`}
                      >
                        {/* Top Badges & Remove Button */}
                        <div className="flex items-center justify-between mb-3">
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border ${
                            isDark 
                              ? 'bg-blue-950/80 text-blue-400 border-blue-900' 
                              : 'bg-blue-50 text-blue-600 border-blue-100'
                          }`}>
                            {product.category}
                          </span>
                          <button
                            onClick={() => onRemoveProduct(product.id)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isDark ? 'text-slate-400 hover:text-rose-400 hover:bg-slate-700' : 'text-slate-400 hover:text-rose-500 hover:bg-rose-50'
                            }`}
                            title="Remove from comparison"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Product Image & Title */}
                        <div className="text-center mb-4">
                          <div 
                            className={`relative aspect-square w-full max-w-[180px] mx-auto rounded-2xl overflow-hidden mb-3 border cursor-pointer group ${
                              isDark ? 'bg-slate-900 border-slate-700/60' : 'bg-slate-50 border-slate-100'
                            }`}
                            onClick={() => {
                              if (onSelectProduct) {
                                onSelectProduct(product);
                                onClose();
                              }
                            }}
                          >
                            <img
                              src={product.image}
                              alt={product.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            {isLowest && (
                              <div className="absolute top-2 left-2 bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-md flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Best Price</span>
                              </div>
                            )}
                          </div>

                          <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{product.brand}</p>
                          <h3 
                            className={`font-extrabold text-sm leading-snug line-clamp-2 hover:text-blue-500 cursor-pointer transition-colors ${
                              isDark ? 'text-white' : 'text-slate-900'
                            }`}
                            onClick={() => {
                              if (onSelectProduct) {
                                onSelectProduct(product);
                                onClose();
                              }
                            }}
                          >
                            {product.name}
                          </h3>
                        </div>

                        {/* Price & Rating */}
                        <div className={`p-3.5 rounded-xl border mb-4 text-center ${
                          isDark ? 'bg-slate-900/90 border-slate-700/60' : 'bg-slate-50 border-slate-100'
                        }`}>
                          <div className={`text-lg font-black mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {formatTZS(product.price)}
                          </div>
                          <div className="flex items-center justify-center gap-1.5 text-xs">
                            <div className="flex items-center gap-1 text-amber-500 font-extrabold">
                              <Star className="w-3.5 h-3.5 fill-amber-500" />
                              <span>{product.rating}</span>
                            </div>
                            <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>({product.reviewsCount} reviews)</span>
                          </div>
                        </div>

                        {/* Key Attributes summary */}
                        <div className={`space-y-2 text-xs mb-4 border-t pt-3 ${isDark ? 'border-slate-700/60' : 'border-slate-100'}`}>
                          <div className={`flex justify-between py-1 border-b ${isDark ? 'border-slate-800' : 'border-slate-50'}`}>
                            <span className={`font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Availability:</span>
                            <span className={`font-bold ${product.stock > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                              {product.stock > 0 ? `${product.stock} units in stock` : 'Out of Stock'}
                            </span>
                          </div>
                          <div className={`flex justify-between py-1 border-b ${isDark ? 'border-slate-800' : 'border-slate-50'}`}>
                            <span className={`font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Warranty:</span>
                            <span className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{product.warranty}</span>
                          </div>
                          <div className={`flex justify-between py-1 border-b ${isDark ? 'border-slate-800' : 'border-slate-50'}`}>
                            <span className={`font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>SKU:</span>
                            <span className={`font-mono ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{product.sku}</span>
                          </div>
                          {product.tonnage && (
                            <div className={`flex justify-between py-1 border-b ${isDark ? 'border-slate-800' : 'border-slate-50'}`}>
                              <span className={`font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Cooling Capacity:</span>
                              <span className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{product.tonnage}</span>
                            </div>
                          )}
                          {product.capacity && (
                            <div className={`flex justify-between py-1 border-b ${isDark ? 'border-slate-800' : 'border-slate-50'}`}>
                              <span className={`font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Volume/Capacity:</span>
                              <span className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{product.capacity}</span>
                            </div>
                          )}
                          {product.energyRating && (
                            <div className={`flex justify-between py-1 border-b ${isDark ? 'border-slate-800' : 'border-slate-50'}`}>
                              <span className={`font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Energy Saver:</span>
                              <span className="font-bold text-amber-500">{product.energyRating}</span>
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-2 pt-2">
                          <button
                            onClick={() => addToCart(product, 1)}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-3 rounded-xl transition-all text-xs flex items-center justify-center gap-2 shadow-sm"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                            <span>Add to Cart</span>
                          </button>
                          
                          {onSelectProduct && (
                            <button
                              onClick={() => {
                                onSelectProduct(product);
                                onClose();
                              }}
                              className={`w-full font-semibold py-2 px-3 rounded-xl transition-all text-xs flex items-center justify-center gap-1.5 border ${
                                isDark 
                                  ? 'bg-slate-700/80 hover:bg-slate-600 border-slate-600 text-white' 
                                  : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                              }`}
                            >
                              <span>View Details</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Technical Specifications Matrix Table */}
                {allSpecKeys.length > 0 && (
                  <div className={`rounded-2xl border p-4 sm:p-6 mt-6 ${
                    isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200/80'
                  }`}>
                    <h4 className={`text-base font-extrabold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      <Layers className="w-4 h-4 text-blue-500" />
                      <span>Technical Specifications Matrix</span>
                    </h4>

                    <div className={`overflow-x-auto rounded-xl border ${
                      isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'
                    }`}>
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className={`font-bold border-b ${
                            isDark 
                              ? 'bg-slate-900 text-slate-200 border-slate-800' 
                              : 'bg-slate-100/90 text-slate-700 border-slate-200'
                          }`}>
                            <th className={`p-3 w-1/4 border-r ${isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-100'}`}>Specification</th>
                            {compareProducts.map((p) => (
                              <th key={p.id} className={`p-3 border-r last:border-r-0 min-w-[160px] ${isDark ? 'border-slate-800 text-white' : 'border-slate-200 text-slate-900'}`}>
                                {p.name}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className={`divide-y ${isDark ? 'divide-slate-800/80' : 'divide-slate-100'}`}>
                          {allSpecKeys.map((key) => {
                            const values = compareProducts.map((p) => p.specs?.[key] || 'N/A');
                            const allSame = values.every((val) => val === values[0]);

                            return (
                              <tr key={key} className={`transition-colors ${
                                !allSame ? (isDark ? 'bg-amber-950/30' : 'bg-amber-50/40') : (isDark ? 'hover:bg-slate-900/60' : 'hover:bg-slate-50/80')
                              }`}>
                                <td className={`p-3 font-semibold border-r ${
                                  isDark 
                                    ? 'bg-slate-900/90 text-slate-200 border-slate-800' 
                                    : 'bg-slate-50/90 text-slate-800 border-slate-200'
                                }`}>
                                  {key}
                                </td>
                                {compareProducts.map((p) => {
                                  const val = p.specs?.[key];
                                  return (
                                    <td key={p.id} className={`p-3 border-r last:border-r-0 ${
                                      isDark ? 'border-slate-800 text-slate-200' : 'border-slate-200 text-slate-800'
                                    }`}>
                                      {val ? (
                                        <span className={`font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{val}</span>
                                      ) : (
                                        <span className={isDark ? 'text-slate-500 italic' : 'text-slate-400 italic'}>Not specified</span>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}

          </div>

          {/* Modal Footer */}
          <div className={`px-6 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className={`text-xs flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>All products listed are 100% genuine with official manufacturer warranty.</span>
            </div>
            <button
              onClick={onClose}
              className={`w-full sm:w-auto font-bold px-6 py-2.5 rounded-xl transition-all text-xs ${
                isDark ? 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700' : 'bg-slate-900 hover:bg-slate-800 text-white'
              }`}
            >
              Close Comparison
            </button>
          </div>

      </div>
    </div>
  );
};

/* Floating Bottom Comparison Drawer Bar */
interface CompareFloatingBarProps {
  compareProducts: Product[];
  onOpenCompareModal: () => void;
  onRemoveProduct: (id: string) => void;
  onClearAll: () => void;
  isDark?: boolean;
}

export const CompareFloatingBar: React.FC<CompareFloatingBarProps> = ({
  compareProducts,
  onOpenCompareModal,
  onRemoveProduct,
  onClearAll,
}) => {
  if (compareProducts.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-2xl bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-800 p-3 sm:px-5 sm:py-3.5 flex items-center justify-between gap-3 animate-slideUp">
      <div className="flex items-center gap-3 min-w-0">
        <div className="bg-blue-600 text-white p-2 rounded-xl shrink-0 hidden sm:flex items-center justify-center">
          <Scale className="w-5 h-5" />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm text-white">Compare Products</span>
            <span className="bg-blue-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
              {compareProducts.length}/3
            </span>
          </div>

          {/* Thumbnails */}
          <div className="flex items-center gap-1.5 mt-1">
            {compareProducts.map((product) => (
              <div key={product.id} className="relative group shrink-0">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-8 h-8 rounded-lg object-cover bg-slate-800 border border-slate-700"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveProduct(product.id);
                  }}
                  className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white rounded-full p-0.5 shadow hover:bg-rose-700 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onClearAll}
          className="text-xs text-slate-400 hover:text-rose-400 font-semibold px-2 py-1 rounded-lg transition-colors hidden sm:inline"
        >
          Clear
        </button>

        <button
          onClick={onOpenCompareModal}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center gap-1.5 active:scale-95"
        >
          <span>Compare Side-by-Side</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
