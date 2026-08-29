import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Search,
  Plus,
  Edit,
  Copy,
  Trash2,
  Package,
  Layers,
  Sparkles,
  TrendingUp,
  Tag,
  AlertTriangle,
  Check,
  Percent,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Eye,
  SlidersHorizontal,
  Flame,
  CheckCircle2,
  ArrowLeft,
  LayoutGrid,
  List,
  Filter,
  Building2,
  DollarSign
} from 'lucide-react';
import { CategoryItem, Product } from '../types';

interface CategoryProductsPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: CategoryItem | null;
  categories?: CategoryItem[];
  onSelectCategory?: (category: CategoryItem) => void;
  products: Product[];
  onUpdateProduct: (product: Product) => Promise<void> | void;
  onDeleteProduct?: (id: string) => Promise<void> | void;
  onEditFullProduct: (product: Product) => void;
  onDuplicateProduct?: (product: Product) => void;
  onAddNewProductInCategory: (categoryName: string) => void;
  isDark: boolean;
  showConfirm?: (title: string, message: string, onConfirm: () => void, type?: 'confirm' | 'warning') => void;
  showAlert?: (title: string, message: string, type?: 'alert' | 'error' | 'warning') => void;
}

export const CategoryProductsPreviewModal: React.FC<CategoryProductsPreviewModalProps> = ({
  isOpen,
  onClose,
  category,
  categories = [],
  onSelectCategory,
  products,
  onUpdateProduct,
  onDeleteProduct,
  onEditFullProduct,
  onDuplicateProduct,
  onAddNewProductInCategory,
  isDark,
  showConfirm,
  showAlert,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'inStock' | 'lowStock' | 'outOfStock' | 'onOffer'>('all');
  const [selectedBrand, setSelectedBrand] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'name' | 'priceAsc' | 'priceDesc' | 'stockAsc' | 'stockDesc' | 'margin'>('name');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  
  // Quick inline edit tracking
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState<string>('');
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [tempStock, setTempStock] = useState<string>('');
  const [savingProductId, setSavingProductId] = useState<string | null>(null);
  const [savedSuccessId, setSavedSuccessId] = useState<string | null>(null);

  // Handle ESC key to exit
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const formatTZS = (val: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const safeConfirm = (title: string, message: string, onConfirm: () => void, type?: 'confirm' | 'warning') => {
    if (showConfirm) {
      showConfirm(title, message, onConfirm, type);
    } else if (window.confirm(message)) {
      onConfirm();
    }
  };

  // Get products strictly belonging to this category
  const categoryProducts = useMemo(() => {
    if (!category) return [];
    const catNameLower = (category.name || '').toLowerCase().trim();
    return (products || []).filter((p) => {
      const pCat = (p.category || '').toLowerCase().trim();
      return pCat === catNameLower;
    });
  }, [category, products]);

  // Unique brands within this category for quick filtering
  const categoryBrands = useMemo(() => {
    const brandsSet = new Set<string>();
    categoryProducts.forEach((p) => {
      if (p.brand && p.brand.trim()) {
        brandsSet.add(p.brand.trim());
      }
    });
    return Array.from(brandsSet).sort();
  }, [categoryProducts]);

  // Financial and inventory stats for this category
  const categoryStats = useMemo(() => {
    const total = categoryProducts.length;
    let totalStockUnits = 0;
    let inStockCount = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let onOfferCount = 0;
    let totalRetailValuation = 0;
    let totalCostValuation = 0;

    categoryProducts.forEach((p) => {
      const stock = p.stock ?? p.stockCount ?? 0;
      const minAlert = p.minStockAlert ?? 3;
      const price = p.price || 0;
      const cost = p.costPrice || 0;

      totalStockUnits += stock;
      totalRetailValuation += price * stock;
      totalCostValuation += cost * stock;

      if (stock <= 0) {
        outOfStockCount++;
      } else if (stock <= minAlert) {
        lowStockCount++;
        inStockCount++;
      } else {
        inStockCount++;
      }

      if (p.isOnOffer) {
        onOfferCount++;
      }
    });

    const potentialGrossProfit = totalRetailValuation - totalCostValuation;
    const avgMarginPercent =
      totalRetailValuation > 0
        ? Math.round((potentialGrossProfit / totalRetailValuation) * 100)
        : 0;

    return {
      total,
      totalStockUnits,
      inStockCount,
      lowStockCount,
      outOfStockCount,
      onOfferCount,
      totalRetailValuation,
      totalCostValuation,
      potentialGrossProfit,
      avgMarginPercent,
    };
  }, [categoryProducts]);

  // Filtered and sorted products
  const filteredProducts = useMemo(() => {
    const q = String(searchQuery || "").toLowerCase().trim();
    let list = categoryProducts.filter((p) => {
      const matchesSearch =
        !q ||
        (p.name && String(p.name || "").toLowerCase().includes(q)) ||
        (p.brand && String(p.brand || "").toLowerCase().includes(q)) ||
        (p.sku && String(p.sku || "").toLowerCase().includes(q)) ||
        (p.barcode && String(p.barcode || "").toLowerCase().includes(q)) ||
        (p.description && String(p.description || "").toLowerCase().includes(q));

      const stock = p.stock ?? p.stockCount ?? 0;
      const minAlert = p.minStockAlert ?? 3;

      let matchesStock = true;
      if (stockFilter === 'inStock') matchesStock = stock > 0;
      else if (stockFilter === 'lowStock') matchesStock = stock > 0 && stock <= minAlert;
      else if (stockFilter === 'outOfStock') matchesStock = stock <= 0;
      else if (stockFilter === 'onOffer') matchesStock = !!p.isOnOffer;

      const matchesBrand = selectedBrand === 'All' || (p.brand || '').trim().toLowerCase() === String(selectedBrand || "").toLowerCase();

      return matchesSearch && matchesStock && matchesBrand;
    });

    // Sorting
    list.sort((a, b) => {
      const stockA = a.stock ?? a.stockCount ?? 0;
      const stockB = b.stock ?? b.stockCount ?? 0;
      const priceA = a.price || 0;
      const priceB = b.price || 0;

      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'priceAsc') return priceA - priceB;
      if (sortBy === 'priceDesc') return priceB - priceA;
      if (sortBy === 'stockAsc') return stockA - stockB;
      if (sortBy === 'stockDesc') return stockB - stockA;
      if (sortBy === 'margin') {
        const marginA = priceA - (a.costPrice || 0);
        const marginB = priceB - (b.costPrice || 0);
        return marginB - marginA;
      }
      return 0;
    });

    return list;
  }, [categoryProducts, searchQuery, stockFilter, selectedBrand, sortBy]);

  if (!isOpen || !category) return null;

  // Quick Action Handlers
  const handleQuickStockChange = async (product: Product, delta: number) => {
    const currentStock = product.stock ?? product.stockCount ?? 0;
    const newStock = Math.max(0, currentStock + delta);
    if (newStock === currentStock) return;

    try {
      setSavingProductId(product.id);
      await onUpdateProduct({
        ...product,
        stock: newStock,
        stockCount: newStock,
        inStock: newStock > 0,
      });
      setSavedSuccessId(product.id);
      setTimeout(() => setSavedSuccessId(null), 1500);
    } catch (err) {
      console.error('Failed to update stock:', err);
    } finally {
      setSavingProductId(null);
    }
  };

  const handleSaveInlineStock = async (product: Product) => {
    const parsed = parseInt(tempStock, 10);
    if (isNaN(parsed) || parsed < 0) {
      setEditingStockId(null);
      return;
    }

    try {
      setSavingProductId(product.id);
      await onUpdateProduct({
        ...product,
        stock: parsed,
        stockCount: parsed,
        inStock: parsed > 0,
      });
      setSavedSuccessId(product.id);
      setTimeout(() => setSavedSuccessId(null), 1500);
    } catch (err) {
      console.error('Failed to save stock:', err);
    } finally {
      setSavingProductId(null);
      setEditingStockId(null);
    }
  };

  const handleSaveInlinePrice = async (product: Product) => {
    const parsed = parseFloat(tempPrice);
    if (isNaN(parsed) || parsed <= 0) {
      setEditingPriceId(null);
      return;
    }

    try {
      setSavingProductId(product.id);
      await onUpdateProduct({
        ...product,
        price: parsed,
      });
      setSavedSuccessId(product.id);
      setTimeout(() => setSavedSuccessId(null), 1500);
    } catch (err) {
      console.error('Failed to save price:', err);
    } finally {
      setSavingProductId(null);
      setEditingPriceId(null);
    }
  };

  const handleToggleOffer = async (product: Product) => {
    const newOfferState = !product.isOnOffer;
    try {
      setSavingProductId(product.id);
      await onUpdateProduct({
        ...product,
        isOnOffer: newOfferState,
        offerTitle: newOfferState ? (product.offerTitle || 'SPECIAL OFFER') : undefined,
      });
      setSavedSuccessId(product.id);
      setTimeout(() => setSavedSuccessId(null), 1500);
    } catch (err) {
      console.error('Failed to toggle offer:', err);
    } finally {
      setSavingProductId(null);
    }
  };

  const cardBg = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
  const textTitle = isDark ? 'text-white' : 'text-slate-900';
  const textSub = isDark ? 'text-slate-400' : 'text-slate-500';
  const inputBg = isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400';

  return (
    <div
      id="category-products-preview-fullscreen-page"
      className={`fixed inset-0 z-50 w-screen h-screen flex flex-col overflow-hidden animate-in fade-in duration-150 ${
        isDark ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-900'
      }`}
    >
      {/* Top Main Navigation Bar with prominent Back <= button */}
      <header
        className={`px-4 sm:px-6 py-3 border-b flex items-center justify-between gap-4 shrink-0 shadow-sm z-20 ${
          isDark ? 'bg-slate-900/95 border-slate-800/90 backdrop-blur-md' : 'bg-white/95 border-slate-200 backdrop-blur-md'
        }`}
      >
        {/* Left Side: Back Navigation Button & Category Identity */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <button
            id="category-modal-back-btn"
            type="button"
            onClick={onClose}
            className={`p-2 sm:p-2.5 rounded-2xl border transition-all duration-150 shadow-sm group active:scale-95 flex items-center justify-center shrink-0 ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-700 hover:border-slate-600'
                : 'bg-slate-50 hover:bg-slate-200 text-slate-800 border-slate-300 hover:border-slate-400'
            }`}
            title="Back to Categories (Esc)"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
          </button>

          {/* Quick Category Switcher */}
          <div className="hidden lg:flex items-center gap-2">
            <select
              value={category.id}
              onChange={(e) => {
                const selected = categories.find(c => c.id === e.target.value);
                if (selected && onSelectCategory) onSelectCategory(selected);
              }}
              className={`text-sm font-bold bg-transparent border-none outline-none cursor-pointer focus:ring-0 hover:opacity-80 transition-opacity ${textTitle}`}
            >
              {categories.map(cat => (
                <option key={cat.id} value={cat.id} className={isDark ? 'bg-slate-800 text-white' : 'bg-white text-slate-900'}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

          {/* Category Mini Info */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl border p-1 shrink-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:6px_6px] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] dark:border-slate-700 flex items-center justify-center overflow-hidden">
              {category.image ? (
                <img
                  src={category.image}
                  alt={category.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <Package className="w-5 h-5 text-blue-500 opacity-60" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className={`text-sm sm:text-base font-black tracking-tight truncate ${textTitle}`}>
                  {category.name}
                </h1>
                {category.swahiliName && (
                  <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    🇹🇿 {category.swahiliName}
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  {categoryProducts.length} Products
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: View Mode Toggles & Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Grid vs Table View Mode Switcher */}
          <div className={`p-1 rounded-xl border flex items-center gap-1 ${
            isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-100 border-slate-300'
          }`}>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                viewMode === 'grid'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Grid View (Spacious Cards)"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden xl:inline">Grid</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                viewMode === 'table'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Dense Table View (High-volume inventory list)"
            >
              <List className="w-4 h-4" />
              <span className="hidden xl:inline">Table</span>
            </button>
          </div>

          {/* Add Product in this Category */}
          <button
            id="category-fullscreen-add-product-btn"
            type="button"
            onClick={() => {
              onAddNewProductInCategory(category.name);
            }}
            className="px-3 py-2 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 transition-all flex items-center gap-1.5 active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Product Here</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </header>

      {/* Financial & Inventory Valuation KPI Bar */}
      <div
        className={`px-4 sm:px-6 py-2.5 border-b grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 shrink-0 ${
          isDark ? 'bg-slate-900/60 border-slate-800/80' : 'bg-slate-50 border-slate-200'
        }`}
      >
        <div className="p-2.5 rounded-xl border bg-white/70 dark:bg-slate-900/80 dark:border-slate-800/80 flex items-center gap-2.5 shadow-sm">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 shrink-0">
            <Package className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Items</span>
            <span className="text-xs sm:text-sm font-black text-blue-600 dark:text-blue-400 truncate block">
              {categoryStats.total} ({categoryStats.totalStockUnits} Units)
            </span>
          </div>
        </div>

        <div className="p-2.5 rounded-xl border bg-white/70 dark:bg-slate-900/80 dark:border-slate-800/80 flex items-center gap-2.5 shadow-sm">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">In Stock</span>
            <span className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400 truncate block">
              {categoryStats.inStockCount} SKUs Available
            </span>
          </div>
        </div>

        <div className="p-2.5 rounded-xl border bg-white/70 dark:bg-slate-900/80 dark:border-slate-800/80 flex items-center gap-2.5 shadow-sm">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Low / Out Alerts</span>
            <span className="text-xs sm:text-sm font-black text-amber-600 dark:text-amber-400 truncate block">
              {categoryStats.lowStockCount} Low • {categoryStats.outOfStockCount} Out
            </span>
          </div>
        </div>

        <div className="p-2.5 rounded-xl border bg-white/70 dark:bg-slate-900/80 dark:border-slate-800/80 flex items-center gap-2.5 shadow-sm">
          <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500 shrink-0">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Retail Inventory Value</span>
            <span className="text-xs sm:text-sm font-black text-purple-600 dark:text-purple-400 truncate block">
              {formatTZS(categoryStats.totalRetailValuation)}
            </span>
          </div>
        </div>

        <div className="p-2.5 rounded-xl border bg-white/70 dark:bg-slate-900/80 dark:border-slate-800/80 flex items-center gap-2.5 shadow-sm">
          <div className="p-2 rounded-lg bg-slate-500/10 text-slate-500 shrink-0">
            <Tag className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Wholesale Cost Value</span>
            <span className="text-xs sm:text-sm font-black text-slate-600 dark:text-slate-300 truncate block">
              {formatTZS(categoryStats.totalCostValuation)}
            </span>
          </div>
        </div>

        <div className="p-2.5 rounded-xl border bg-white/70 dark:bg-slate-900/80 dark:border-slate-800/80 flex items-center gap-2.5 shadow-sm">
          <div className="p-2 rounded-lg bg-rose-500/10 text-rose-500 shrink-0">
            <Flame className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Deals & Est GPM</span>
            <span className="text-xs sm:text-sm font-black text-rose-600 dark:text-rose-400 truncate block" title="Average Gross Profit Margin for this category">
              {categoryStats.onOfferCount} Deals • ~{categoryStats.avgMarginPercent}% GPM
            </span>
          </div>
        </div>
      </div>

      {/* Filter, Multi-field Search, Brand, and Sorting Toolbar */}
      <div
        className={`px-4 sm:px-6 py-3 border-b flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shrink-0 ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="category-fullscreen-search-input"
            type="text"
            placeholder={`Search across ${category.name} (Name, Brand, SKU, Barcode, Description)...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-9 py-2 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all ${inputBg}`}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap overflow-x-auto pb-1 md:pb-0">
          <button
            type="button"
            onClick={() => setStockFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              stockFilter === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : isDark
                ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All ({categoryProducts.length})
          </button>

          <button
            type="button"
            onClick={() => setStockFilter('inStock')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              stockFilter === 'inStock'
                ? 'bg-emerald-600 text-white shadow-sm'
                : isDark
                ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            In Stock ({categoryStats.inStockCount})
          </button>

          <button
            type="button"
            onClick={() => setStockFilter('lowStock')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              stockFilter === 'lowStock'
                ? 'bg-amber-600 text-white shadow-sm'
                : isDark
                ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Low Stock ({categoryStats.lowStockCount})
          </button>

          <button
            type="button"
            onClick={() => setStockFilter('outOfStock')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              stockFilter === 'outOfStock'
                ? 'bg-rose-600 text-white shadow-sm'
                : isDark
                ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Out of Stock ({categoryStats.outOfStockCount})
          </button>

          <button
            type="button"
            onClick={() => setStockFilter('onOffer')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              stockFilter === 'onOffer'
                ? 'bg-purple-600 text-white shadow-sm'
                : isDark
                ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            🔥 Deals ({categoryStats.onOfferCount})
          </button>
        </div>

        {/* Brand & Sort Dropdowns */}
        <div className="flex items-center gap-2 shrink-0">
          {categoryBrands.length > 1 && (
            <div className="flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <select
                id="category-fullscreen-brand-select"
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className={`py-1.5 px-3 rounded-xl border text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 focus:outline-none ${inputBg}`}
              >
                <option value="All">All Brands</option>
                {categoryBrands.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-1">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <select
              id="category-fullscreen-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className={`py-1.5 px-3 rounded-xl border text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 focus:outline-none ${inputBg}`}
            >
              <option value="name">Sort: Name (A-Z)</option>
              <option value="priceDesc">Price: High to Low</option>
              <option value="priceAsc">Price: Low to High</option>
              <option value="stockDesc">Stock: Highest First</option>
              <option value="stockAsc">Stock: Lowest / Depleted</option>
              <option value="margin">Highest GPM (Profit Margin)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Spacious Products Inventory Viewport */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {filteredProducts.length === 0 ? (
          <div className={`p-16 rounded-3xl border text-center shadow-sm max-w-2xl mx-auto my-12 ${cardBg}`}>
            <Package className="w-20 h-20 text-slate-400 mx-auto mb-4 opacity-40 animate-pulse" />
            <h3 className={`text-lg font-black ${textTitle}`}>
              {categoryProducts.length === 0
                ? `No products saved in "${category.name}" yet.`
                : 'No products match your search or filter.'}
            </h3>
            <p className={`text-xs sm:text-sm mt-2 max-w-md mx-auto leading-relaxed ${textSub}`}>
              {categoryProducts.length === 0
                ? 'Click "Add Product Here" to upload your first electronics unit directly into this category.'
                : 'Try resetting your search query, adjusting brand selection, or switching stock filter tabs.'}
            </p>
            {categoryProducts.length === 0 ? (
              <button
                type="button"
                onClick={() => onAddNewProductInCategory(category.name)}
                className="mt-6 px-6 py-2.5 rounded-2xl text-xs sm:text-sm font-black bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 transition-all inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add First Product to {category.name}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStockFilter('all');
                  setSelectedBrand('All');
                }}
                className="mt-6 px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all"
              >
                Clear All Filters
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View - Large Responsive Cards */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-5">
            {filteredProducts.map((product) => {
              const stock = product.stock ?? product.stockCount ?? 0;
              const minAlert = product.minStockAlert ?? 3;
              const isOutOfStock = stock <= 0;
              const isLowStock = !isOutOfStock && stock <= minAlert;
              const isSaving = savingProductId === product.id;
              const isSaved = savedSuccessId === product.id;

              const costPrice = product.costPrice || 0;
              const retailPrice = product.price || 0;
              const profitMarginPct =
                retailPrice > 0 && costPrice > 0
                  ? Math.round(((retailPrice - costPrice) / retailPrice) * 100)
                  : null;

              const cleanDesc = (product.description || '')
                .replace(/<[^>]+>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();

              return (
                <div
                  key={product.id}
                  className={`rounded-2xl border flex flex-col justify-between overflow-hidden transition-all duration-200 hover:shadow-2xl hover:border-blue-500/50 group relative ${cardBg}`}
                >
                  {/* Status Feedback Toast Indicator */}
                  {isSaved && (
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 bg-emerald-600 text-white px-3 py-1 rounded-full text-[10px] font-black shadow-lg flex items-center gap-1 animate-in fade-in slide-in-from-top-2">
                      <Check className="w-3 h-3" />
                      <span>Saved Live!</span>
                    </div>
                  )}

                  {/* Top Media & Badges */}
                  <div>
                    <div className="relative h-44 w-full bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:12px_12px] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] border-b flex items-center justify-center p-3 overflow-hidden dark:border-slate-800">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-400">
                          <Package className="w-10 h-10 mb-1 opacity-50" />
                          <span className="text-[10px] font-semibold">No Image</span>
                        </div>
                      )}

                      {/* Top Badges */}
                      <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1 z-10">
                        {product.brand && (
                          <span className="bg-slate-950/80 backdrop-blur-md text-white text-[10px] font-extrabold px-2 py-0.5 rounded-lg border border-white/20 shadow-sm">
                            {product.brand}
                          </span>
                        )}

                        {product.isOnOffer && (
                          <span className="bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-lg shadow-sm flex items-center gap-0.5">
                            <Flame className="w-3 h-3" />
                            <span>DEAL</span>
                          </span>
                        )}
                      </div>

                      {/* Stock Badge */}
                      <div className="absolute top-2.5 right-2.5 z-10">
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-lg shadow-sm backdrop-blur-md ${
                            isOutOfStock
                              ? 'bg-rose-600 text-white'
                              : isLowStock
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-emerald-600 text-white'
                          }`}
                        >
                          {isOutOfStock
                            ? 'Out of Stock'
                            : isLowStock
                            ? `Low: ${stock} left`
                            : `${stock} in Stock`}
                        </span>
                      </div>
                    </div>

                    {/* Info Body */}
                    <div className="p-3.5 space-y-2">
                      <div>
                        <h4
                          className={`text-xs sm:text-sm font-extrabold leading-snug line-clamp-2 group-hover:text-blue-500 transition-colors ${textTitle}`}
                          title={product.name}
                        >
                          {product.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400 font-semibold truncate">
                          {product.sku && <span>SKU: {product.sku}</span>}
                          {product.barcode && <span>• {product.barcode}</span>}
                        </div>
                      </div>

                      {/* Pricing & Margin info */}
                      <div className="p-2 rounded-xl bg-slate-100/80 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-500 uppercase">Selling Price</span>
                          {editingPriceId === product.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={tempPrice}
                                onChange={(e) => setTempPrice(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveInlinePrice(product);
                                  if (e.key === 'Escape') setEditingPriceId(null);
                                }}
                                autoFocus
                                className="w-24 px-1.5 py-0.5 text-xs font-black rounded bg-white dark:bg-slate-900 border border-blue-500 text-blue-600 dark:text-blue-400 focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveInlinePrice(product)}
                                className="p-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                                title="Save Price"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPriceId(product.id);
                                setTempPrice(String(product.price || 0));
                              }}
                              className="text-xs font-black text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 group/price"
                              title="Click to quick-edit price"
                            >
                              <span>{formatTZS(product.price)}</span>
                              <Edit className="w-2.5 h-2.5 opacity-0 group-hover/price:opacity-100 transition-opacity" />
                            </button>
                          )}
                        </div>

                        {costPrice > 0 && (
                          <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/40 dark:border-slate-700/40">
                            <span>Cost: {formatTZS(costPrice)}</span>
                            {profitMarginPct !== null && (
                              <span
                                className={`font-extrabold cursor-help ${profitMarginPct >= 20 ? 'text-emerald-500' : 'text-amber-500'}`}
                                title={`Gross Profit Margin (GPM): +${profitMarginPct}%\nCalculated as: (Selling Price - Cost Price) / Selling Price`}
                              >
                                +{profitMarginPct}% GPM
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Specs / Description snippet */}
                      {cleanDesc && (
                        <p className={`text-[10px] line-clamp-1 leading-relaxed ${textSub}`}>
                          {cleanDesc}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Quick Interactive Actions Footer */}
                  <div className="p-3 border-t space-y-2.5 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                    {/* Quick Stock Controls */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                        Stock:
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={isSaving || stock <= 0}
                          onClick={() => handleQuickStockChange(product, -1)}
                          className="w-7 h-7 rounded-lg bg-slate-200/70 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-950/60 text-slate-700 dark:text-slate-200 hover:text-rose-600 font-black text-sm flex items-center justify-center transition-colors disabled:opacity-30 active:scale-95"
                          title="Decrease Stock by 1"
                        >
                          -
                        </button>

                        {editingStockId === product.id ? (
                          <input
                            type="number"
                            value={tempStock}
                            onChange={(e) => setTempStock(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveInlineStock(product);
                              if (e.key === 'Escape') setEditingStockId(null);
                            }}
                            onBlur={() => handleSaveInlineStock(product)}
                            autoFocus
                            className="w-12 h-7 text-center font-black text-xs rounded-lg border border-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingStockId(product.id);
                              setTempStock(String(stock));
                            }}
                            className={`w-12 h-7 rounded-lg font-black text-xs flex items-center justify-center border transition-colors ${
                              isOutOfStock
                                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 border-rose-200 dark:border-rose-900'
                                : isLowStock
                                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 border-amber-200 dark:border-amber-900'
                                : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                            }`}
                            title="Click to type exact stock quantity"
                          >
                            {stock}
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => handleQuickStockChange(product, 1)}
                          className="w-7 h-7 rounded-lg bg-slate-200/70 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 text-slate-700 dark:text-slate-200 hover:text-emerald-600 font-black text-sm flex items-center justify-center transition-colors active:scale-95"
                          title="Increase Stock by 1"
                        >
                          +
                        </button>
                      </div>

                      {/* Quick Deal Toggle */}
                      <button
                        type="button"
                        onClick={() => handleToggleOffer(product)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-extrabold flex items-center gap-1 transition-all ${
                          product.isOnOffer
                            ? 'bg-rose-600 text-white shadow-sm'
                            : 'bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-rose-500'
                        }`}
                        title={product.isOnOffer ? 'Disable Offer' : 'Enable Special Offer'}
                      >
                        <Flame className="w-2.5 h-2.5" />
                        <span>{product.isOnOffer ? 'Active' : 'Offer'}</span>
                      </button>
                    </div>

                    {/* Primary Button Toolbar */}
                    <div className="flex items-center justify-between gap-1.5 pt-1">
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onDuplicateProduct) onDuplicateProduct(product);
                        }}
                        className="flex-1 py-1.5 px-2 rounded-xl text-xs font-bold bg-emerald-600/10 hover:bg-emerald-600 text-emerald-600 hover:text-white dark:text-emerald-400 dark:hover:text-white transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                        title="Duplicate Product"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Duplicate</span>
                      </button>
<button
                        type="button"
                        onClick={() => {
                          onClose();
                          onEditFullProduct(product);
                        }}
                        className="flex-1 py-1.5 px-2 rounded-xl text-xs font-bold bg-blue-600/10 hover:bg-blue-600 text-blue-600 hover:text-white dark:text-blue-400 dark:hover:text-white transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                        title="Open Full Product Editor (Specs, Images, Description)"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      {onDeleteProduct && (
                        <button
                          type="button"
                          onClick={() => {
                            safeConfirm(
                              'Delete Product',
                              `Are you sure you want to delete "${product.name}" from category "${category.name}"?`,
                              async () => {
                                await onDeleteProduct(product.id);
                              },
                              'warning'
                            );
                          }}
                          className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-600 text-rose-500 hover:text-white transition-all active:scale-95"
                          title="Delete Product"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Table View - High Density Data Rows */
          <div className={`rounded-2xl border overflow-hidden shadow-sm ${cardBg}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className={`border-b font-extrabold uppercase tracking-wider text-[10px] ${
                  isDark ? 'bg-slate-900/80 text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}>
                  <tr>
                    <th className="p-3">Product / SKU</th>
                    <th className="p-3">Brand</th>
                    <th className="p-3">Selling Price</th>
                    <th className="p-3">Cost & GPM</th>
                    <th className="p-3 text-center">Live Stock</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center">Deal Offer</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {filteredProducts.map((product) => {
                    const stock = product.stock ?? product.stockCount ?? 0;
                    const minAlert = product.minStockAlert ?? 3;
                    const isOutOfStock = stock <= 0;
                    const isLowStock = !isOutOfStock && stock <= minAlert;
                    const isSaving = savingProductId === product.id;

                    const costPrice = product.costPrice || 0;
                    const retailPrice = product.price || 0;
                    const profitMarginPct =
                      retailPrice > 0 && costPrice > 0
                        ? Math.round(((retailPrice - costPrice) / retailPrice) * 100)
                        : null;

                    return (
                      <tr key={product.id} className="hover:bg-blue-50/50 dark:hover:bg-slate-800/50 transition-colors">
                        {/* Image & Name & SKU */}
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl border p-1 shrink-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:6px_6px] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] dark:border-slate-700 flex items-center justify-center overflow-hidden">
                              {product.image ? (
                                <img src={product.image} alt={product.name} className="w-full h-full object-contain" />
                              ) : (
                                <Package className="w-5 h-5 text-slate-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <span className={`font-bold block leading-snug line-clamp-1 ${textTitle}`}>
                                {product.name}
                              </span>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-semibold mt-0.5">
                                {product.sku && <span>SKU: {product.sku}</span>}
                                {product.barcode && <span>• {product.barcode}</span>}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Brand */}
                        <td className="p-3">
                          {product.brand ? (
                            <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {product.brand}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">—</span>
                          )}
                        </td>

                        {/* Price Inline Edit */}
                        <td className="p-3">
                          {editingPriceId === product.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={tempPrice}
                                onChange={(e) => setTempPrice(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveInlinePrice(product);
                                  if (e.key === 'Escape') setEditingPriceId(null);
                                }}
                                autoFocus
                                className="w-24 px-1.5 py-0.5 text-xs font-black rounded bg-white dark:bg-slate-900 border border-blue-500 text-blue-600 dark:text-blue-400 focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveInlinePrice(product)}
                                className="p-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPriceId(product.id);
                                setTempPrice(String(product.price || 0));
                              }}
                              className="font-black text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 group/price"
                              title="Click to edit price"
                            >
                              <span>{formatTZS(product.price)}</span>
                              <Edit className="w-2.5 h-2.5 opacity-0 group-hover/price:opacity-100 transition-opacity" />
                            </button>
                          )}
                        </td>

                        {/* Cost & Margin */}
                        <td className="p-3">
                          {costPrice > 0 ? (
                            <div>
                              <span className="text-slate-500 dark:text-slate-400 text-[11px] block">
                                {formatTZS(costPrice)}
                              </span>
                              {profitMarginPct !== null && (
                                <span
                                  className={`text-[10px] font-extrabold cursor-help ${profitMarginPct >= 20 ? 'text-emerald-500' : 'text-amber-500'}`}
                                  title={`Gross Profit Margin (GPM): +${profitMarginPct}%`}
                                >
                                  +{profitMarginPct}% GPM
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">Not set</span>
                          )}
                        </td>

                        {/* Stock Controls */}
                        <td className="p-3 text-center">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              disabled={isSaving || stock <= 0}
                              onClick={() => handleQuickStockChange(product, -1)}
                              className="w-6 h-6 rounded bg-slate-200 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-950 text-slate-700 dark:text-slate-300 font-black text-xs flex items-center justify-center disabled:opacity-30"
                            >
                              -
                            </button>

                            {editingStockId === product.id ? (
                              <input
                                type="number"
                                value={tempStock}
                                onChange={(e) => setTempStock(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveInlineStock(product);
                                  if (e.key === 'Escape') setEditingStockId(null);
                                }}
                                onBlur={() => handleSaveInlineStock(product)}
                                autoFocus
                                className="w-12 h-6 text-center font-black text-xs rounded border border-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                              />
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingStockId(product.id);
                                  setTempStock(String(stock));
                                }}
                                className="w-12 h-6 font-black text-xs rounded border text-center hover:border-blue-500"
                              >
                                {stock}
                              </button>
                            )}

                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={() => handleQuickStockChange(product, 1)}
                              className="w-6 h-6 rounded bg-slate-200 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-950 text-slate-700 dark:text-slate-300 font-black text-xs flex items-center justify-center"
                            >
                              +
                            </button>
                          </div>
                        </td>

                        {/* Stock Status Badge */}
                        <td className="p-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                              isOutOfStock
                                ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                                : isLowStock
                                ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                            }`}
                          >
                            {isOutOfStock ? 'Out of Stock' : isLowStock ? 'Low Stock' : 'In Stock'}
                          </span>
                        </td>

                        {/* Deal Offer Toggle */}
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleOffer(product)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-extrabold inline-flex items-center gap-1 transition-all ${
                              product.isOnOffer
                                ? 'bg-rose-600 text-white shadow-sm'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-rose-500'
                            }`}
                          >
                            <Flame className="w-2.5 h-2.5" />
                            <span>{product.isOnOffer ? 'Active Deal' : 'No Deal'}</span>
                          </button>
                        </td>

                        {/* Action Buttons */}
                        <td className="p-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                onEditFullProduct(product);
                              }}
                              className="p-1.5 rounded-lg bg-blue-600/10 hover:bg-blue-600 text-blue-600 hover:text-white transition-all"
                              title="Full Product Editor"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            {onDuplicateProduct && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDuplicateProduct(product);
                                }}
                                className="p-1.5 rounded-lg bg-emerald-600/10 hover:bg-emerald-600 text-emerald-600 hover:text-white transition-all"
                                title="Duplicate Product"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {onDeleteProduct && (
                              <button
                                type="button"
                                onClick={() => {
                                  safeConfirm(
                                    'Delete Product',
                                    `Are you sure you want to delete "${product.name}"?`,
                                    async () => {
                                      await onDeleteProduct(product.id);
                                    },
                                    'warning'
                                  );
                                }}
                                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-600 text-rose-500 hover:text-white transition-all"
                                title="Delete Product"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Sticky Status Bar */}
      <footer
        className={`px-4 sm:px-6 py-3 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 shadow-lg z-20 ${
          isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
        }`}
      >
        <div className="flex items-center gap-2 text-xs">
          <span>Showing <strong>{filteredProducts.length}</strong> of <strong>{categoryProducts.length}</strong> products</span>
          <span>•</span>
          <span>Category: <strong className={textTitle}>{category.name}</strong></span>
          {categoryBrands.length > 0 && (
            <>
              <span>•</span>
              <span className="text-slate-400">{categoryBrands.length} Brands represented</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onAddNewProductInCategory(category.name)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all flex items-center gap-1.5 active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add New Product to {category.name}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 active:scale-95 ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
            }`}
          >
            <ArrowLeft className="w-3.5 h-3.5 text-blue-500" />
            <span>Back to Categories</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
