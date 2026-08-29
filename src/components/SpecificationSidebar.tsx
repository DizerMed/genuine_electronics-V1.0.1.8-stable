import React, { useState, useMemo, useEffect } from 'react';
import { 
  SlidersHorizontal, 
  X, 
  RotateCcw, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  Zap, 
  ShieldCheck, 
  Star, 
  Tag, 
  Layers, 
  DollarSign, 
  Filter, 
  CheckCircle2, 
  Box, 
  Cpu, 
  Tv, 
  Smartphone, 
  Gauge, 
  HardDrive, 
  MemoryStick, 
  Monitor, 
  Flame, 
  Search, 
  CheckSquare, 
  Square,
  ChevronRight,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, formatTZS } from '../types';

export interface FilterState {
  minPrice: number | null;
  maxPrice: number | null;
  selectedBrands: string[];
  inStockOnly: boolean;
  onSaleOnly: boolean;
  genuineOnly: boolean;
  minRating: number | null;
  selectedWarranties: string[];
  selectedSpecs: Record<string, string[]>; // specKey -> array of selected values
}

export const INITIAL_FILTER_STATE: FilterState = {
  minPrice: null,
  maxPrice: null,
  selectedBrands: [],
  inStockOnly: false,
  onSaleOnly: false,
  genuineOnly: false,
  minRating: null,
  selectedWarranties: [],
  selectedSpecs: {}
};

interface SpecificationSidebarProps {
  products: Product[];
  category: string;
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onResetFilters: () => void;
  isDark?: boolean;
  isSwahili?: boolean;
  totalMatchingCount: number;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

// Extraction regex patterns for smart spec recovery if specs dictionary is partial
const SPEC_PATTERNS = {
  ram: /\b(2|3|4|6|8|12|16|24|32|64|128)\s*(?:GB|gb)\s*(?:RAM|Unified Memory|Memory|DDR\d)?\b/i,
  storage: /\b(32|64|128|256|512)\s*(?:GB|gb)\s*(?:SSD|NVMe|Storage|ROM|eMMC)?\b|\b(1|2|4)\s*(?:TB|tb)\s*(?:SSD|NVMe|HDD|Storage)?\b/i,
  screenSize: /\b(5\.8|6\.1|6\.2|6\.3|6\.4|6\.5|6\.6|6\.7|6\.8|6\.9|11|12\.9|13|13\.3|13\.6|14|14\.2|15|15\.6|16|16\.2|24|27|32|40|43|50|55|65|70|75|85)\s*(?:["”]|inch|Inch|-inch|in\b)/i,
  resolution: /\b(4K|8K|UHD|QLED|OLED|Mini-LED|Full HD|1080p|Crystal UHD|Retina|Liquid Retina|Super AMOLED|AMOLED)\b/i,
  tonnage: /\b(1\.0|1\.5|2\.0|2\.5|3\.0)\s*(?:HP|hp|Ton|ton|BTU)\b/i,
  capacityLiters: /\b(\d{2,3})\s*(?:L|Litres|Liters|liters|litres|Ltr)\b/i,
  refreshRate: /\b(60Hz|90Hz|120Hz|144Hz|165Hz|240Hz)\b/i,
};

export const SpecificationSidebar: React.FC<SpecificationSidebarProps> = ({
  products,
  category,
  filters,
  onFilterChange,
  onResetFilters,
  isDark = false,
  isSwahili = false,
  totalMatchingCount,
  isOpenMobile = false,
  onCloseMobile,
  isCollapsed = false,
  onToggleCollapse
}) => {
  // Accordion toggle states
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    price: true,
    specs: true,
    brands: true,
    warranty: false,
    rating: false,
    stock: true
  });

  const [brandSearchTerm, setBrandSearchTerm] = useState('');
  const [localMinPrice, setLocalMinPrice] = useState<string>('');
  const [localMaxPrice, setLocalMaxPrice] = useState<string>('');

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // 1. Price boundaries
  const priceBounds = useMemo(() => {
    if (!products || products.length === 0) {
      return { min: 0, max: 10000000, step: 10000 };
    }
    const prices = products.map(p => Number(p.price) || 0).filter(p => p > 0);
    if (prices.length === 0) return { min: 0, max: 10000000, step: 10000 };

    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const neatMin = Math.floor(min / 10000) * 10000;
    const neatMax = Math.ceil(max / 10000) * 10000;
    const step = Math.max(10000, Math.round((neatMax - neatMin) / 100));

    return {
      min: neatMin,
      max: neatMax > neatMin ? neatMax : neatMin + 100000,
      step
    };
  }, [products]);

  // Synchronize numeric price inputs with active filters
  useEffect(() => {
    setLocalMinPrice(filters.minPrice !== null ? String(filters.minPrice) : '');
    setLocalMaxPrice(filters.maxPrice !== null ? String(filters.maxPrice) : '');
  }, [filters.minPrice, filters.maxPrice]);

  // Quick price tiers
  const quickPriceTiers = useMemo(() => {
    const { min, max } = priceBounds;
    const range = max - min;
    if (range <= 0) return [];

    const tiers = [];
    if (min < 300000 && max > 200000) {
      tiers.push({ label: isSwahili ? 'Chini ya 250K' : 'Under 250K', min: null, max: 250000 });
    }
    if (max > 500000) {
      tiers.push({ label: '250K - 750K', min: 250000, max: 750000 });
    }
    if (max > 1200000) {
      tiers.push({ label: '750K - 1.5M', min: 750000, max: 1500000 });
    }
    if (max > 3000000) {
      tiers.push({ label: '1.5M - 3M', min: 1500000, max: 3000000 });
      tiers.push({ label: '3M+', min: 3000000, max: null });
    } else if (max > 1500000) {
      tiers.push({ label: '1.5M+', min: 1500000, max: null });
    }

    return tiers;
  }, [priceBounds, isSwahili]);

  // 2. Comprehensive Dynamic Technical Specs & Attributes Extraction
  const extractedSpecsData = useMemo(() => {
    const brandsMap: Record<string, number> = {};
    const warrantiesMap: Record<string, number> = {};
    
    // Grouped technical specifications
    const specsMap: Record<string, Record<string, number>> = {
      'RAM / Memory': {},
      'Storage / ROM': {},
      'Screen Size': {},
      'Display & Resolution': {},
      'Processor / Chip': {},
      'Energy / Power': {},
      'Capacity / Size': {}
    };

    let inStockCount = 0;
    let onSaleCount = 0;
    let genuineCount = 0;
    let topRatedCount = 0;

    products.forEach(p => {
      // Brands
      if (p.brand) {
        brandsMap[p.brand] = (brandsMap[p.brand] || 0) + 1;
      }

      // Stock, Sale, Genuine, Rating counts
      if (Number(p.stock || 0) > 0) inStockCount++;
      if (p.isOnOffer || (p.originalPrice && p.originalPrice > p.price)) onSaleCount++;
      if (p.isGenuineVerified !== false) genuineCount++;
      if (Number(p.rating || 0) >= 4.0) topRatedCount++;

      // Warranties
      if (p.warranty && p.warranty.trim()) {
        const w = p.warranty.trim();
        warrantiesMap[w] = (warrantiesMap[w] || 0) + 1;
      }

      // Energy / Tonnage / Capacity from dedicated fields
      if (p.energyRating && p.energyRating.trim()) {
        const val = p.energyRating.trim();
        specsMap['Energy / Power'][val] = (specsMap['Energy / Power'][val] || 0) + 1;
      }
      if (p.tonnage && p.tonnage.trim()) {
        const val = p.tonnage.trim();
        specsMap['Energy / Power'][val] = (specsMap['Energy / Power'][val] || 0) + 1;
      }
      if (p.capacity && p.capacity.trim()) {
        const val = p.capacity.trim();
        specsMap['Capacity / Size'][val] = (specsMap['Capacity / Size'][val] || 0) + 1;
      }

      // Explicit specs dictionary inspection
      if (p.specs && typeof p.specs === 'object') {
        Object.entries(p.specs).forEach(([k, v]) => {
          if (!k || !v) return;
          const cleanK = k.trim();
          const cleanV = String(v).trim();
          if (!cleanK || !cleanV || cleanV.length > 35) return;

          // Categorize spec into friendly standard buckets or create clean custom spec
          const lowerK = cleanK.toLowerCase();
          if (lowerK.includes('ram') || lowerK.includes('memory')) {
            specsMap['RAM / Memory'][cleanV] = (specsMap['RAM / Memory'][cleanV] || 0) + 1;
          } else if (lowerK.includes('storage') || lowerK.includes('rom') || lowerK.includes('ssd') || lowerK.includes('hdd') || lowerK.includes('capacity')) {
            specsMap['Storage / ROM'][cleanV] = (specsMap['Storage / ROM'][cleanV] || 0) + 1;
          } else if (lowerK.includes('screen') || lowerK.includes('display size') || lowerK.includes('inch')) {
            specsMap['Screen Size'][cleanV] = (specsMap['Screen Size'][cleanV] || 0) + 1;
          } else if (lowerK.includes('resolution') || lowerK.includes('display') || lowerK.includes('panel') || lowerK.includes('refresh')) {
            specsMap['Display & Resolution'][cleanV] = (specsMap['Display & Resolution'][cleanV] || 0) + 1;
          } else if (lowerK.includes('processor') || lowerK.includes('cpu') || lowerK.includes('chip') || lowerK.includes('gpu')) {
            specsMap['Processor / Chip'][cleanV] = (specsMap['Processor / Chip'][cleanV] || 0) + 1;
          } else {
            if (!specsMap[cleanK]) specsMap[cleanK] = {};
            specsMap[cleanK][cleanV] = (specsMap[cleanK][cleanV] || 0) + 1;
          }
        });
      }

      // Smart Regex Parsing on Product Title & Description for missing explicit specs
      const fullText = `${p.name || ''} ${p.description || ''}`;

      // Smart RAM extraction if RAM not present
      const ramMatch = fullText.match(SPEC_PATTERNS.ram);
      if (ramMatch && ramMatch[1]) {
        const val = `${ramMatch[1].toUpperCase()}GB RAM`;
        specsMap['RAM / Memory'][val] = (specsMap['RAM / Memory'][val] || 0) + 1;
      }

      // Smart Storage extraction
      const storageMatch = fullText.match(SPEC_PATTERNS.storage);
      if (storageMatch) {
        const val = storageMatch[0].toUpperCase().replace(/\s+/g, ' ');
        specsMap['Storage / ROM'][val] = (specsMap['Storage / ROM'][val] || 0) + 1;
      }

      // Smart Screen Size extraction
      const screenMatch = fullText.match(SPEC_PATTERNS.screenSize);
      if (screenMatch && screenMatch[1]) {
        const val = `${screenMatch[1]}"`;
        specsMap['Screen Size'][val] = (specsMap['Screen Size'][val] || 0) + 1;
      }

      // Smart Display / Resolution extraction
      const resMatch = fullText.match(SPEC_PATTERNS.resolution);
      if (resMatch && resMatch[0]) {
        const val = resMatch[0].toUpperCase();
        specsMap['Display & Resolution'][val] = (specsMap['Display & Resolution'][val] || 0) + 1;
      }
    });

    // Clean up empty spec categories and format
    const formattedSpecs: {
      key: string;
      icon: React.ReactNode;
      options: { value: string; count: number }[];
    }[] = [];

    const getSpecIcon = (key: string) => {
      const lower = key.toLowerCase();
      if (lower.includes('ram') || lower.includes('memory')) return <MemoryStick className="w-4 h-4 text-blue-500" />;
      if (lower.includes('storage') || lower.includes('rom')) return <HardDrive className="w-4 h-4 text-emerald-500" />;
      if (lower.includes('screen')) return <Monitor className="w-4 h-4 text-indigo-500" />;
      if (lower.includes('display') || lower.includes('resolution')) return <Tv className="w-4 h-4 text-purple-500" />;
      if (lower.includes('processor') || lower.includes('cpu') || lower.includes('chip')) return <Cpu className="w-4 h-4 text-amber-500" />;
      if (lower.includes('energy') || lower.includes('power')) return <Zap className="w-4 h-4 text-yellow-500" />;
      return <Gauge className="w-4 h-4 text-cyan-500" />;
    };

    Object.entries(specsMap).forEach(([key, valMap]) => {
      const options = Object.entries(valMap)
        .map(([value, count]) => ({ value, count }))
        .filter(opt => opt.count > 0 && opt.value.trim().length > 0)
        .sort((a, b) => b.count - a.count);

      if (options.length > 0) {
        formattedSpecs.push({
          key,
          icon: getSpecIcon(key),
          options
        });
      }
    });

    return {
      brands: Object.entries(brandsMap).map(([brand, count]) => ({ brand, count })).sort((a, b) => b.count - a.count),
      warranties: Object.entries(warrantiesMap).map(([warranty, count]) => ({ warranty, count })).sort((a, b) => b.count - a.count),
      specs: formattedSpecs,
      inStockCount,
      onSaleCount,
      genuineCount,
      topRatedCount
    };
  }, [products]);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.minPrice !== null || filters.maxPrice !== null) count++;
    if (filters.selectedBrands.length > 0) count += filters.selectedBrands.length;
    if (filters.inStockOnly) count++;
    if (filters.onSaleOnly) count++;
    if (filters.genuineOnly) count++;
    if (filters.minRating !== null) count++;
    if (filters.selectedWarranties.length > 0) count += filters.selectedWarranties.length;
    Object.values(filters.selectedSpecs).forEach(arr => {
      count += arr.length;
    });
    return count;
  }, [filters]);

  // Handlers
  const handleToggleBrand = (brand: string) => {
    const exists = filters.selectedBrands.includes(brand);
    const updated = exists 
      ? filters.selectedBrands.filter(b => b !== brand)
      : [...filters.selectedBrands, brand];
    onFilterChange({ ...filters, selectedBrands: updated });
  };

  const handleToggleWarranty = (warranty: string) => {
    const exists = filters.selectedWarranties.includes(warranty);
    const updated = exists
      ? filters.selectedWarranties.filter(w => w !== warranty)
      : [...filters.selectedWarranties, warranty];
    onFilterChange({ ...filters, selectedWarranties: updated });
  };

  const handleToggleSpec = (specKey: string, specValue: string) => {
    const currentList = filters.selectedSpecs[specKey] || [];
    const exists = currentList.includes(specValue);
    const updatedList = exists 
      ? currentList.filter(v => v !== specValue)
      : [...currentList, specValue];

    const updatedSpecs = { ...filters.selectedSpecs };
    if (updatedList.length === 0) {
      delete updatedSpecs[specKey];
    } else {
      updatedSpecs[specKey] = updatedList;
    }
    onFilterChange({ ...filters, selectedSpecs: updatedSpecs });
  };

  const handleApplyPriceInputs = () => {
    const minVal = localMinPrice.trim() ? Number(localMinPrice) : null;
    const maxVal = localMaxPrice.trim() ? Number(localMaxPrice) : null;
    onFilterChange({
      ...filters,
      minPrice: !isNaN(Number(minVal)) && minVal !== null ? Math.max(0, minVal) : null,
      maxPrice: !isNaN(Number(maxVal)) && maxVal !== null ? Math.max(0, maxVal) : null
    });
  };

  const handleApplyPriceSlider = (val: number) => {
    onFilterChange({
      ...filters,
      maxPrice: val
    });
  };

  const handleSelectPriceTier = (min: number | null, max: number | null) => {
    onFilterChange({
      ...filters,
      minPrice: min,
      maxPrice: max
    });
  };

  const currentMaxSliderValue = filters.maxPrice !== null ? filters.maxPrice : priceBounds.max;

  // Filtered brands by search term
  const displayedBrands = useMemo(() => {
    if (!brandSearchTerm.trim()) return extractedSpecsData.brands;
    const term = brandSearchTerm.toLowerCase();
    return extractedSpecsData.brands.filter(b => b.brand.toLowerCase().includes(term));
  }, [extractedSpecsData.brands, brandSearchTerm]);

  // Sidebar Inner Content JSX
  const sidebarContent = (
    <div className="flex flex-col h-full overflow-y-auto pr-1 select-none space-y-5 text-sm custom-scrollbar">
      {/* 1. Header with Active Counter & Reset Button */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-black text-slate-900 dark:text-white text-sm uppercase tracking-wider">
              {isSwahili ? 'Vichujio & Sifa' : 'Filters & Specs'}
            </h4>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              <b className="text-blue-600 dark:text-blue-400">{totalMatchingCount}</b> {isSwahili ? 'vifaa vipo' : 'matching products'}
            </span>
          </div>
        </div>

        {activeFiltersCount > 0 && (
          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 transition-colors cursor-pointer"
            title="Reset all filters"
          >
            <RotateCcw className="w-3 h-3" />
            <span>{isSwahili ? 'Safisha' : 'Reset'}</span>
          </button>
        )}
      </div>

      {/* 2. Stock & Fast Highlights Section */}
      <div className="bg-slate-50/80 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 space-y-2">
        <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
          {isSwahili ? 'Hali ya Bidhaa' : 'Quick Availability'}
        </span>

        {/* In Stock Toggle */}
        <label className="flex items-center justify-between p-2 rounded-xl hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer">
          <div className="flex items-center gap-2.5">
            <input
              type="checkbox"
              checked={filters.inStockOnly}
              onChange={() => onFilterChange({ ...filters, inStockOnly: !filters.inStockOnly })}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>{isSwahili ? 'Vipo Dukani Pekee' : 'In Stock Only'}</span>
            </span>
          </div>
          <span className="text-[11px] font-bold text-slate-400 bg-white dark:bg-slate-700 px-2 py-0.5 rounded-md">
            {extractedSpecsData.inStockCount}
          </span>
        </label>

        {/* On Sale / Offers Toggle */}
        <label className="flex items-center justify-between p-2 rounded-xl hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer">
          <div className="flex items-center gap-2.5">
            <input
              type="checkbox"
              checked={filters.onSaleOnly}
              onChange={() => onFilterChange({ ...filters, onSaleOnly: !filters.onSaleOnly })}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>{isSwahili ? 'Ofa na Punguzo' : 'On Sale / Deals'}</span>
            </span>
          </div>
          <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md">
            {extractedSpecsData.onSaleCount}
          </span>
        </label>

        {/* Genuine Verified Only */}
        <label className="flex items-center justify-between p-2 rounded-xl hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer">
          <div className="flex items-center gap-2.5">
            <input
              type="checkbox"
              checked={filters.genuineOnly}
              onChange={() => onFilterChange({ ...filters, genuineOnly: !filters.genuineOnly })}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
              <span>{isSwahili ? '100% Halisi' : 'Genuine Verified'}</span>
            </span>
          </div>
          <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md">
            {extractedSpecsData.genuineCount}
          </span>
        </label>
      </div>

      {/* 3. Price Range Accordion */}
      <div className="border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900/60 shadow-xs">
        <button
          type="button"
          onClick={() => toggleSection('price')}
          className="w-full p-3.5 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100/60 dark:hover:bg-slate-800/80 transition-colors"
        >
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
              {isSwahili ? 'Kiwango cha Bei (TZS)' : 'Price Range (TZS)'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {(filters.minPrice !== null || filters.maxPrice !== null) && (
              <span className="w-2 h-2 rounded-full bg-blue-600" />
            )}
            {openSections.price ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>
        </button>

        {openSections.price && (
          <div className="p-3.5 space-y-3.5 border-t border-slate-100 dark:border-slate-800/80">
            {/* Range Slider */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-400 font-medium">{formatTZS(priceBounds.min)}</span>
                <span className="font-black text-blue-600 dark:text-blue-400 font-mono">
                  Max: {formatTZS(currentMaxSliderValue)}
                </span>
              </div>
              <input
                type="range"
                min={priceBounds.min}
                max={priceBounds.max}
                step={priceBounds.step}
                value={currentMaxSliderValue}
                onChange={(e) => handleApplyPriceSlider(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            {/* Min and Max Number Inputs */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Min (TZS)</span>
                <input
                  type="number"
                  placeholder={String(priceBounds.min)}
                  value={localMinPrice}
                  onChange={(e) => setLocalMinPrice(e.target.value)}
                  onBlur={handleApplyPriceInputs}
                  className="w-full px-2.5 py-1.5 rounded-xl border text-xs font-semibold bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Max (TZS)</span>
                <input
                  type="number"
                  placeholder={String(priceBounds.max)}
                  value={localMaxPrice}
                  onChange={(e) => setLocalMaxPrice(e.target.value)}
                  onBlur={handleApplyPriceInputs}
                  className="w-full px-2.5 py-1.5 rounded-xl border text-xs font-semibold bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Quick Price Tier Pills */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {quickPriceTiers.map((tier, idx) => {
                const isSelected = filters.minPrice === tier.min && filters.maxPrice === tier.max;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectPriceTier(tier.min, tier.max)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {tier.label}
                  </button>
                );
              })}
            </div>

            {(filters.minPrice !== null || filters.maxPrice !== null) && (
              <button
                type="button"
                onClick={() => onFilterChange({ ...filters, minPrice: null, maxPrice: null })}
                className="w-full py-1 text-center text-[11px] font-bold text-rose-500 hover:underline"
              >
                {isSwahili ? 'Weka Upya Bei' : 'Clear Price Filter'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* 4. DYNAMIC TECHNICAL SPECIFICATIONS (RAM, Storage, Screen Size, Processor, etc.) */}
      {extractedSpecsData.specs.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5 text-cyan-500" />
              <span>{isSwahili ? 'Sifa za Kiufundi' : 'Technical Specifications'}</span>
            </span>
            {Object.keys(filters.selectedSpecs).length > 0 && (
              <button
                type="button"
                onClick={() => onFilterChange({ ...filters, selectedSpecs: {} })}
                className="text-[11px] font-bold text-rose-500 hover:underline"
              >
                Clear Specs
              </button>
            )}
          </div>

          {/* Render each dynamic technical spec category */}
          {extractedSpecsData.specs.map(({ key, icon, options }) => {
            const activeOptions = filters.selectedSpecs[key] || [];
            const isSectionOpen = openSections[`spec_${key}`] !== false; // default open

            return (
              <div 
                key={key} 
                className="border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900/60 shadow-xs"
              >
                {/* Spec Category Header */}
                <button
                  type="button"
                  onClick={() => toggleSection(`spec_${key}`)}
                  className="w-full p-3 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100/60 dark:hover:bg-slate-800/80 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {icon}
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {key}
                    </span>
                    {activeOptions.length > 0 && (
                      <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center">
                        {activeOptions.length}
                      </span>
                    )}
                  </div>
                  {isSectionOpen ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                </button>

                {/* Spec Category Options */}
                {isSectionOpen && (
                  <div className="p-3 border-t border-slate-100 dark:border-slate-800/80">
                    <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
                      {options.map(({ value, count }) => {
                        const isSelected = activeOptions.includes(value);
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => handleToggleSpec(key, value)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs'
                                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750'
                            }`}
                          >
                            <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border text-[9px] ${
                              isSelected ? 'bg-white text-blue-600 border-white font-black' : 'border-slate-400'
                            }`}>
                              {isSelected && <Check className="w-2.5 h-2.5" />}
                            </div>
                            <span>{value}</span>
                            <span className={`text-[10px] ${isSelected ? 'text-blue-100' : 'opacity-60'}`}>
                              ({count})
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Brand Selection Accordion */}
      {extractedSpecsData.brands.length > 0 && (
        <div className="border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900/60 shadow-xs">
          <button
            type="button"
            onClick={() => toggleSection('brands')}
            className="w-full p-3.5 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100/60 dark:hover:bg-slate-800/80 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-indigo-500" />
              <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                {isSwahili ? 'Chapa / Brands' : 'Brands'}
              </span>
              {filters.selectedBrands.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] font-black flex items-center justify-center">
                  {filters.selectedBrands.length}
                </span>
              )}
            </div>
            {openSections.brands ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {openSections.brands && (
            <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
              {/* Brand Search Input if > 6 brands */}
              {extractedSpecsData.brands.length > 6 && (
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search brand..."
                    value={brandSearchTerm}
                    onChange={(e) => setBrandSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-2 py-1 rounded-lg border text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              )}

              {/* Brands Checkboxes List */}
              <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                {displayedBrands.map(({ brand, count }) => {
                  const isSelected = filters.selectedBrands.includes(brand);
                  return (
                    <label
                      key={brand}
                      className={`flex items-center justify-between p-1.5 rounded-xl transition-colors cursor-pointer text-xs ${
                        isSelected 
                          ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-200 font-bold'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleBrand(brand)}
                          className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span>{brand}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">({count})</span>
                    </label>
                  );
                })}
              </div>

              {filters.selectedBrands.length > 0 && (
                <button
                  type="button"
                  onClick={() => onFilterChange({ ...filters, selectedBrands: [] })}
                  className="w-full pt-1 text-center text-[11px] font-bold text-rose-500 hover:underline"
                >
                  Clear Brands
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* 6. Warranty Section Accordion */}
      {extractedSpecsData.warranties.length > 0 && (
        <div className="border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900/60 shadow-xs">
          <button
            type="button"
            onClick={() => toggleSection('warranty')}
            className="w-full p-3.5 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100/60 dark:hover:bg-slate-800/80 transition-colors"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                {isSwahili ? 'Waranti Rasmi' : 'Official Warranty'}
              </span>
              {filters.selectedWarranties.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center">
                  {filters.selectedWarranties.length}
                </span>
              )}
            </div>
            {openSections.warranty ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {openSections.warranty && (
            <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 space-y-1">
              {extractedSpecsData.warranties.map(({ warranty, count }) => {
                const isSelected = filters.selectedWarranties.includes(warranty);
                return (
                  <label
                    key={warranty}
                    className={`flex items-center justify-between p-1.5 rounded-xl transition-colors cursor-pointer text-xs ${
                      isSelected 
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 font-bold'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleWarranty(warranty)}
                        className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span>{warranty}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">({count})</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 7. Rating Accordion */}
      <div className="border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900/60 shadow-xs">
        <button
          type="button"
          onClick={() => toggleSection('rating')}
          className="w-full p-3.5 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100/60 dark:hover:bg-slate-800/80 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
              {isSwahili ? 'Kiwango cha Nyota' : 'Customer Rating'}
            </span>
          </div>
          {openSections.rating ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {openSections.rating && (
          <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5">
            {[4.5, 4.0, 3.5].map((stars) => {
              const isSelected = filters.minRating === stars;
              return (
                <button
                  key={stars}
                  type="button"
                  onClick={() => onFilterChange({ ...filters, minRating: isSelected ? null : stars })}
                  className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <div className="flex text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`w-3.5 h-3.5 ${i < Math.floor(stars) ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'}`} 
                        />
                      ))}
                    </div>
                    <span>{stars}+ Stars</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-amber-600" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 8. Reset All Bottom Action */}
      {activeFiltersCount > 0 && (
        <button
          type="button"
          onClick={onResetFilters}
          className="w-full py-2.5 px-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{isSwahili ? 'Weka Upya Vichujio Vyote' : 'Reset All Filters & Specs'}</span>
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* 1. Desktop Sticky Sidebar Component */}
      <aside 
        className={`hidden lg:block shrink-0 transition-all duration-300 select-none ${
          isCollapsed ? 'w-12' : 'w-72 xl:w-80'
        }`}
      >
        <div className={`sticky top-24 max-h-[calc(100vh-7rem)] flex flex-col p-4 rounded-3xl border shadow-xs transition-all ${
          isDark 
            ? 'bg-slate-900/95 border-slate-800 text-white' 
            : 'bg-white/95 border-slate-200/90 text-slate-900'
        }`}>
          {isCollapsed ? (
            <div className="flex flex-col items-center py-4 space-y-4">
              <button
                type="button"
                onClick={onToggleCollapse}
                className="p-2.5 rounded-2xl bg-blue-600 text-white shadow-md hover:bg-blue-700 transition-colors"
                title="Expand Specification Filters"
              >
                <SlidersHorizontal className="w-5 h-5" />
              </button>
              {activeFiltersCount > 0 && (
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </div>
          ) : (
            <>
              {onToggleCollapse && (
                <div className="flex items-center justify-end mb-1">
                  <button
                    type="button"
                    onClick={onToggleCollapse}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 text-xs font-bold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Collapse Sidebar"
                  >
                    Hide Sidebar
                  </button>
                </div>
              )}
              {sidebarContent}
            </>
          )}
        </div>
      </aside>

      {/* 2. Mobile & Tablet Slide-Over Drawer */}
      <AnimatePresence>
        {isOpenMobile && (
          <div className="fixed inset-0 z-50 lg:hidden flex justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCloseMobile}
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs"
            />

            {/* Slide Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className={`relative w-full max-w-sm h-full shadow-2xl flex flex-col z-10 ${
                isDark ? 'bg-slate-900 border-l border-slate-800 text-white' : 'bg-white border-l border-slate-200 text-slate-900'
              }`}
            >
              {/* Drawer Top Bar */}
              <div className={`p-4 border-b flex items-center justify-between ${
                isDark ? 'border-slate-800' : 'border-slate-100'
              }`}>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                    <SlidersHorizontal className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">
                      {isSwahili ? 'Vichujio & Sifa' : 'Filters & Specs'}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {category}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onCloseMobile}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="p-4 flex-1 overflow-y-auto">
                {sidebarContent}
              </div>

              {/* Drawer Apply Bottom */}
              <div className={`p-4 border-t ${
                isDark ? 'border-slate-800 bg-slate-950/50' : 'border-slate-100 bg-slate-50'
              }`}>
                <button
                  type="button"
                  onClick={onCloseMobile}
                  className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{isSwahili ? `Onyesha Vifaa ${totalMatchingCount}` : `Show ${totalMatchingCount} Products`}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export interface ActiveFilterBarProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onResetFilters: () => void;
  isSwahili?: boolean;
}

export const ActiveFilterBar: React.FC<ActiveFilterBarProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  isSwahili = false
}) => {
  const chips: { label: string; onRemove: () => void }[] = [];

  // Price chip
  if (filters.minPrice !== null || filters.maxPrice !== null) {
    let label = '';
    if (filters.minPrice !== null && filters.maxPrice !== null) {
      label = `${formatTZS(filters.minPrice)} - ${formatTZS(filters.maxPrice)}`;
    } else if (filters.minPrice !== null) {
      label = `>= ${formatTZS(filters.minPrice)}`;
    } else if (filters.maxPrice !== null) {
      label = `<= ${formatTZS(filters.maxPrice)}`;
    }
    chips.push({
      label: `Price: ${label}`,
      onRemove: () => onFilterChange({ ...filters, minPrice: null, maxPrice: null })
    });
  }

  // Brands chips
  filters.selectedBrands.forEach(brand => {
    chips.push({
      label: `Brand: ${brand}`,
      onRemove: () => onFilterChange({
        ...filters,
        selectedBrands: filters.selectedBrands.filter(b => b !== brand)
      })
    });
  });

  // Stock, offer, genuine chips
  if (filters.inStockOnly) {
    chips.push({
      label: isSwahili ? 'Vipo Dukani' : 'In Stock Only',
      onRemove: () => onFilterChange({ ...filters, inStockOnly: false })
    });
  }
  if (filters.onSaleOnly) {
    chips.push({
      label: isSwahili ? 'Ofa' : 'On Sale',
      onRemove: () => onFilterChange({ ...filters, onSaleOnly: false })
    });
  }
  if (filters.genuineOnly) {
    chips.push({
      label: isSwahili ? 'Halisi' : 'Genuine Verified',
      onRemove: () => onFilterChange({ ...filters, genuineOnly: false })
    });
  }

  // Rating chip
  if (filters.minRating !== null) {
    chips.push({
      label: `${filters.minRating}+ Stars`,
      onRemove: () => onFilterChange({ ...filters, minRating: null })
    });
  }

  // Warranties chips
  filters.selectedWarranties.forEach(warranty => {
    chips.push({
      label: `Warranty: ${warranty}`,
      onRemove: () => onFilterChange({
        ...filters,
        selectedWarranties: filters.selectedWarranties.filter(w => w !== warranty)
      })
    });
  });

  // Specs chips
  Object.entries(filters.selectedSpecs).forEach(([specKey, values]) => {
    values.forEach(val => {
      chips.push({
        label: `${specKey}: ${val}`,
        onRemove: () => {
          const updatedList = values.filter(v => v !== val);
          const updatedSpecs = { ...filters.selectedSpecs };
          if (updatedList.length === 0) {
            delete updatedSpecs[specKey];
          } else {
            updatedSpecs[specKey] = updatedList;
          }
          onFilterChange({ ...filters, selectedSpecs: updatedSpecs });
        }
      });
    });
  });

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4 p-3 rounded-2xl bg-blue-50/60 dark:bg-slate-800/60 border border-blue-100 dark:border-slate-700/80">
      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mr-1">
        <Filter className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
        <span>{isSwahili ? 'Vichujio vilivyotumika:' : 'Active Filters:'}</span>
      </span>

      {chips.map((chip, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 shadow-2xs"
        >
          <span>{chip.label}</span>
          <button
            type="button"
            onClick={chip.onRemove}
            className="hover:text-rose-600 p-0.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </span>
      ))}

      <button
        type="button"
        onClick={onResetFilters}
        className="ml-auto text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline px-2 py-1 cursor-pointer"
      >
        {isSwahili ? 'Ondoa Vyote' : 'Clear All'}
      </button>
    </div>
  );
};
