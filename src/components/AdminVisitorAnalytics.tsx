import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Users, 
  Search, 
  Eye, 
  ShoppingCart, 
  TrendingUp, 
  Filter, 
  Calendar, 
  Smartphone, 
  Monitor, 
  Tablet, 
  RotateCw, 
  Download, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  ArrowUpRight, 
  Sparkles, 
  Layers, 
  MessageSquare, 
  HelpCircle,
  X,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  UserCheck,
  Globe,
  Radio,
  SlidersHorizontal,
  ChevronDown,
  LayoutList,
  Maximize2,
  ShieldCheck,
  User
} from 'lucide-react';
import { Product, VisitorLog, VisitorAnalyticsSummary, VisitorInteractionType, formatToGMT3 } from '../types';
import { fetchVisitorSummary, fetchVisitorLogs, triggerVisitorLogsCleanup, exportVisitorLogsToCSV } from '../lib/visitorTrackingService';
import { VisitorActivityHeatmap } from './VisitorActivityHeatmap';
import { TopViewedProductsBreakdown } from './TopViewedProductsBreakdown';

interface AdminVisitorAnalyticsProps {
  products: Product[];
  categories?: any[];
  theme?: 'light' | 'dark' | string;
}

export const AdminVisitorAnalytics: React.FC<AdminVisitorAnalyticsProps> = ({
  products = [],
  categories = [],
  theme = 'dark'
}) => {
  const isDark = theme === 'dark';

  // Timeframe and Filters State
  const [timeframe, setTimeframe] = useState<'today' | 'yesterday' | '7days' | '30days' | '60days'>('30days');
  const [selectedProductId, setSelectedProductId] = useState<string>('ALL');
  const [selectedInteraction, setSelectedInteraction] = useState<VisitorInteractionType | 'ALL'>('ALL');
  const [selectedDevice, setSelectedDevice] = useState<string>('ALL');
  const [audienceFilter, setAudienceFilter] = useState<'customers_only' | 'staff_only' | 'all'>('customers_only');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [showStaffList, setShowStaffList] = useState<boolean>(false);

  // Pagination & Display limit controls for Inline Scroll View
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');

  // Data State
  const [summary, setSummary] = useState<VisitorAnalyticsSummary | null>(null);
  const [logs, setLogs] = useState<VisitorLog[]>([]);
  const [totalLogsCount, setTotalLogsCount] = useState<number>(0);
  const [isLoadingSummary, setIsLoadingSummary] = useState<boolean>(true);
  const [isLoadingLogs, setIsLoadingLogs] = useState<boolean>(true);
  const [isCleaning, setIsCleaning] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Selected Visitor Journey Modal
  const [selectedVisitorId, setSelectedVisitorId] = useState<string | null>(null);

  // Load Analytics Summary
  const loadSummary = useCallback(async () => {
    setIsLoadingSummary(true);
    try {
      const data = await fetchVisitorSummary(timeframe);
      setSummary(data);
    } catch (err: any) {
      console.error('Error fetching visitor summary:', err);
    } finally {
      setIsLoadingSummary(false);
    }
  }, [timeframe]);

  // Load Filtered Visitor Logs
  const loadLogs = useCallback(async () => {
    setIsLoadingLogs(true);
    try {
      const data = await fetchVisitorLogs({
        timeframe,
        productId: selectedProductId !== 'ALL' ? selectedProductId : undefined,
        interactionType: selectedInteraction !== 'ALL' ? selectedInteraction : undefined,
        deviceType: selectedDevice !== 'ALL' ? selectedDevice : undefined,
        searchQuery: searchQuery.trim() || undefined,
        startDate: customStartDate || undefined,
        endDate: customEndDate || undefined,
        excludeStaff: audienceFilter === 'customers_only',
        onlyStaff: audienceFilter === 'staff_only',
        limit: 500
      });
      setLogs(data.logs || []);
      setTotalLogsCount(data.total || 0);
      setCurrentPage(1); // Reset to first page whenever filter changes
    } catch (err: any) {
      console.error('Error fetching visitor logs:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  }, [timeframe, selectedProductId, selectedInteraction, selectedDevice, searchQuery, customStartDate, customEndDate, audienceFilter]);

  // Initial Load and on Filter Change
  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadLogs();
    }, 200);
    return () => clearTimeout(timer);
  }, [loadLogs]);

  // Handle Manual Purge of Logs Older Than 60 Days (2-Month Retention Spec)
  const handlePurgeLogs = async () => {
    if (!window.confirm('Are you sure you want to purge visitor logs older than 60 days (2 months)? This will free up database space while preserving recent traffic data.')) {
      return;
    }
    setIsCleaning(true);
    try {
      const result = await triggerVisitorLogsCleanup(60);
      setStatusMessage({
        type: 'success',
        text: `Cleanup successful: ${result.deletedCount} expired logs (older than 2 months) were purged.`
      });
      await Promise.all([loadSummary(), loadLogs()]);
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Cleanup failed: ${err.message || 'Error executing retention purge'}`
      });
    } finally {
      setIsCleaning(false);
      setTimeout(() => setStatusMessage(null), 5000);
    }
  };

  // Handle CSV Export
  const handleExportCSV = () => {
    if (logs.length === 0) {
      alert('No visitor logs to export with current filters.');
      return;
    }
    exportVisitorLogsToCSV(logs, `genuine_visitor_analytics_${timeframe}_${new Date().toISOString().substring(0, 10)}.csv`);
  };

  // Quick helper to filter by a specific product from the top product table
  const handleQuickFilterProduct = (productId: string) => {
    setSelectedProductId(productId);
    const filterSection = document.getElementById('visitor-logs-section');
    if (filterSection) {
      filterSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Quick helper to filter by a specific search keyword from top searches
  const handleQuickFilterSearch = (keyword: string) => {
    setSearchQuery(keyword);
    setSelectedInteraction('SEARCH');
    const filterSection = document.getElementById('visitor-logs-section');
    if (filterSection) {
      filterSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Active product details for banner
  const activeSelectedProduct = useMemo(() => {
    if (!selectedProductId || selectedProductId === 'ALL') return null;
    return products.find(p => p.id === selectedProductId) || null;
  }, [selectedProductId, products]);

  // Selected Visitor Journey events
  const visitorJourneyLogs = useMemo(() => {
    if (!selectedVisitorId) return [];
    return logs
      .filter(l => l.visitorId === selectedVisitorId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [selectedVisitorId, logs]);

  // Paginated logs slice
  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return logs.slice(startIndex, startIndex + pageSize);
  }, [logs, currentPage, pageSize]);

  const totalPages = Math.max(1, Math.ceil(logs.length / pageSize));
  const currentStart = logs.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const currentEnd = Math.min(currentPage * pageSize, logs.length);

  // Format interaction badge
  const renderInteractionBadge = (type: VisitorInteractionType) => {
    switch (type) {
      case 'PRODUCT_VIEW':
        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
            isDark ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-blue-50 text-blue-700 border border-blue-200'
          }`}>
            <Eye className="w-3 h-3 text-blue-400" /> View
          </span>
        );
      case 'SEARCH':
        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
            isDark ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-amber-50 text-amber-700 border border-amber-200'
          }`}>
            <Search className="w-3 h-3 text-amber-400" /> Search
          </span>
        );
      case 'ADD_TO_CART':
        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
            isDark ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}>
            <ShoppingCart className="w-3 h-3 text-emerald-400" /> Cart
          </span>
        );
      case 'REMOVE_FROM_CART':
        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
            isDark ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}>
            Remove
          </span>
        );
      case 'EXPRESS_BUY_OPEN':
        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
            isDark ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
          }`}>
            <Sparkles className="w-3 h-3 text-indigo-400" /> Express Buy
          </span>
        );
      case 'CHECKOUT_INITIATED':
        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
            isDark ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-purple-50 text-purple-700 border border-purple-200'
          }`}>
            Checkout
          </span>
        );
      case 'ORDER_PLACED':
        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
            isDark ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' : 'bg-teal-50 text-teal-800 border border-teal-200'
          }`}>
            <CheckCircle2 className="w-3 h-3 text-teal-400" /> Order Placed
          </span>
        );
      case 'CATEGORY_FILTER':
        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
            isDark ? 'bg-slate-800 text-slate-300 border border-slate-700' : 'bg-slate-100 text-slate-700 border border-slate-200'
          }`}>
            <Layers className="w-3 h-3 text-slate-400" /> Category
          </span>
        );
      case 'BRAND_FILTER':
        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
            isDark ? 'bg-zinc-800 text-zinc-300 border border-zinc-700' : 'bg-zinc-100 text-zinc-700 border border-zinc-200'
          }`}>
            Brand
          </span>
        );
      case 'WHATSAPP_CLICK':
        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
            isDark ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-green-50 text-green-700 border border-green-200'
          }`}>
            <MessageSquare className="w-3 h-3 text-green-400" /> WhatsApp
          </span>
        );
      case 'PAGE_VIEW':
      default:
        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
            isDark ? 'bg-slate-800 text-slate-400 border border-slate-700' : 'bg-gray-100 text-gray-700 border border-gray-200'
          }`}>
            <Globe className="w-3 h-3 text-slate-400" /> Page Visit
          </span>
        );
    }
  };

  // Device icon helper
  const renderDeviceIcon = (device?: string) => {
    if (device === 'Mobile') return <Smartphone className="w-3.5 h-3.5 text-blue-500" />;
    if (device === 'Tablet') return <Tablet className="w-3.5 h-3.5 text-indigo-500" />;
    return <Monitor className="w-3.5 h-3.5 text-slate-400" />;
  };

  const hasActiveFilters = selectedProductId !== 'ALL' || selectedInteraction !== 'ALL' || selectedDevice !== 'ALL' || audienceFilter !== 'customers_only' || searchQuery.trim() !== '';

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Retention Notice */}
      <div className={`rounded-3xl border p-5 sm:p-6 transition-all ${
        isDark ? 'bg-slate-900/90 border-slate-800 text-slate-100 shadow-lg shadow-black/20' : 'bg-white border-slate-200 shadow-sm text-slate-900'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border ${
                isDark ? 'bg-blue-600/10 border-blue-500/30 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-600'
              }`}>
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h1 className={`text-xl sm:text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Visitor &amp; Buyer Demand Analytics
                </h1>
                <p className={`text-xs sm:text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Real visitor volume, keyword searches, viewed products, and interaction logs in East Africa Time (EAT).
                </p>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Timeframe selector */}
            <div className={`flex items-center p-1 rounded-2xl border text-xs font-semibold ${
              isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
            }`}>
              <button
                type="button"
                onClick={() => setTimeframe('today')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  timeframe === 'today' 
                    ? isDark ? 'bg-blue-600 text-white shadow-sm font-bold' : 'bg-white text-blue-600 shadow-xs font-bold'
                    : 'hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setTimeframe('7days')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  timeframe === '7days' 
                    ? isDark ? 'bg-blue-600 text-white shadow-sm font-bold' : 'bg-white text-blue-600 shadow-xs font-bold'
                    : 'hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                7 Days
              </button>
              <button
                type="button"
                onClick={() => setTimeframe('30days')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  timeframe === '30days' 
                    ? isDark ? 'bg-blue-600 text-white shadow-sm font-bold' : 'bg-white text-blue-600 shadow-xs font-bold'
                    : 'hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                30 Days
              </button>
              <button
                type="button"
                onClick={() => setTimeframe('60days')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  timeframe === '60days' 
                    ? isDark ? 'bg-blue-600 text-white shadow-sm font-bold' : 'bg-white text-blue-600 shadow-xs font-bold'
                    : 'hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                60 Days Max
              </button>
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={() => { loadSummary(); loadLogs(); }}
              disabled={isLoadingSummary || isLoadingLogs}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border transition-colors cursor-pointer ${
                isDark 
                  ? 'bg-slate-800/90 hover:bg-slate-700 border-slate-700 text-slate-200' 
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
              }`}
              title="Refresh Analytics Data"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isLoadingSummary || isLoadingLogs ? 'animate-spin text-blue-500' : ''}`} />
              <span>Refresh</span>
            </button>

            {/* Export CSV */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-sm cursor-pointer"
              title="Export Filtered Logs to CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            {/* Purge 60+ Days Button */}
            <button
              type="button"
              onClick={handlePurgeLogs}
              disabled={isCleaning}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border transition-colors cursor-pointer ${
                isDark 
                  ? 'bg-rose-950/40 hover:bg-rose-900/60 border-rose-800 text-rose-400' 
                  : 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-700'
              }`}
              title="Purge logs older than 60 days to save space"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isCleaning ? 'Purging...' : 'Purge 60d+'}</span>
            </button>
          </div>
        </div>

        {/* 2-Month Retention Banner */}
        <div className={`mt-4 pt-3 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
          isDark ? 'border-slate-800 text-slate-400' : 'border-slate-100 text-slate-500'
        }`}>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-semibold border ${
              isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}>
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              2-Month Retention Active
            </span>
            <span>Logs persist for 60 days maximum and auto-purge to save database storage.</span>
          </div>
          <div className={isDark ? 'text-slate-400' : 'text-slate-500'}>
            Total Stored Logs: <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>{summary?.retentionInfo?.totalLogsStored || totalLogsCount}</strong> records
          </div>
        </div>
      </div>

      {/* Status Feedback Toast */}
      {statusMessage && (
        <div className={`p-4 rounded-2xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 ${
          statusMessage.type === 'success' 
            ? isDark ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            : isDark ? 'bg-rose-950/60 text-rose-300 border border-rose-800' : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          {statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Active Admin & Staff Presence Real-Time Detection Bar */}
      <div className={`p-4 sm:p-5 rounded-3xl border transition-all ${
        isDark ? 'bg-slate-900/90 border-slate-800 text-slate-100 shadow-sm' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${
              isDark ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'bg-indigo-50 border-indigo-200 text-indigo-600'
            }`}>
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`text-sm sm:text-base font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Admin &amp; Staff Isolation System
                </h3>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                  (summary?.activeStaffCount || 0) > 0 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                    : isDark ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${(summary?.activeStaffCount || 0) > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
                  {summary?.activeStaffCount || 0} Staff Active
                </span>
              </div>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Internal staff activity is detected in real-time and isolated so customer visitor analytics remain clean and accurate.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            {summary?.activeStaffList && summary.activeStaffList.length > 0 && (
              <button
                type="button"
                onClick={() => setShowStaffList(!showStaffList)}
                className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                  showStaffList
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>{showStaffList ? 'Hide Active Staff' : 'View Active Staff'}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showStaffList ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>
        </div>

        {/* Expandable Active Staff List */}
        {showStaffList && summary?.activeStaffList && summary.activeStaffList.length > 0 && (
          <div className="mt-4 pt-4 border-t border-dashed border-slate-700/60 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {summary.activeStaffList.map((st: any) => (
              <div
                key={st.id || st.email}
                className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                  isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs uppercase border ${
                    st.role?.toLowerCase().includes('admin')
                      ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                      : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                  }`}>
                    {st.name?.slice(0, 2) || 'ST'}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-bold truncate block ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {st.name || st.email}
                      </span>
                      <span className={`w-2 h-2 rounded-full shrink-0 ${st.status === 'online' ? 'bg-emerald-400' : 'bg-amber-400'}`} title={st.status} />
                    </div>
                    <span className={`text-[10px] block truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {st.role || 'Staff'} • {st.currentPage || 'Portal'}
                    </span>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border uppercase tracking-wider shrink-0 ${
                  st.status === 'online' 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                }`}>
                  {st.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Unique Visitors */}
        <div className={`p-5 rounded-3xl border transition-all ${
          isDark ? 'bg-slate-900/90 border-slate-800 text-slate-100 shadow-md' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-black uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Unique Visitors
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              isDark ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-blue-50 text-blue-600 border border-blue-200'
            }`}>
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-2xl sm:text-3xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {summary?.uniqueVisitors ?? 0}
            </span>
            <span className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>in timeframe</span>
          </div>
          <div className={`mt-3 pt-3 border-t flex items-center justify-between text-xs ${
            isDark ? 'border-slate-800 text-slate-400' : 'border-slate-100 text-slate-500'
          }`}>
            <span>Today: <strong className={isDark ? 'text-white' : 'text-slate-800'}>{summary?.uniqueVisitorsToday ?? 0}</strong></span>
            <span>Week: <strong className={isDark ? 'text-white' : 'text-slate-800'}>{summary?.uniqueVisitorsWeek ?? 0}</strong></span>
          </div>
        </div>

        {/* Card 2: Live Visitors & Traffic */}
        <div className={`p-5 rounded-3xl border transition-all ${
          isDark ? 'bg-slate-900/90 border-slate-800 text-slate-100 shadow-md' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-black uppercase tracking-wider ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
              Live Active (15m)
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              isDark ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
            }`}>
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-500 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping inline-block" />
              {summary?.liveVisitors15m ?? 0}
            </span>
            <span className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>browsing right now</span>
          </div>
          <div className={`mt-3 pt-3 border-t flex items-center justify-between text-xs ${
            isDark ? 'border-slate-800 text-slate-400' : 'border-slate-100 text-slate-500'
          }`}>
            <span>Total Visits: <strong className={isDark ? 'text-white' : 'text-slate-800'}>{summary?.totalVisits ?? 0}</strong></span>
            <span className="text-emerald-500 font-semibold">Live stream</span>
          </div>
        </div>

        {/* Card 3: Product Views & Searches */}
        <div className={`p-5 rounded-3xl border transition-all ${
          isDark ? 'bg-slate-900/90 border-slate-800 text-slate-100 shadow-md' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-black uppercase tracking-wider ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
              Products Browsed
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              isDark ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-amber-50 text-amber-600 border border-amber-200'
            }`}>
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-2xl sm:text-3xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {summary?.totalProductViews ?? 0}
            </span>
            <span className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>item views</span>
          </div>
          <div className={`mt-3 pt-3 border-t flex items-center justify-between text-xs ${
            isDark ? 'border-slate-800 text-slate-400' : 'border-slate-100 text-slate-500'
          }`}>
            <span>Searches: <strong className="text-amber-500 font-bold">{summary?.totalSearches ?? 0}</strong></span>
            <span>Cart Adds: <strong className="text-emerald-500 font-bold">{summary?.totalCartAdds ?? 0}</strong></span>
          </div>
        </div>

        {/* Card 4: Conversion & Buyer Needs */}
        <div className={`p-5 rounded-3xl border transition-all ${
          isDark ? 'bg-slate-900/90 border-slate-800 text-slate-100 shadow-md' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-black uppercase tracking-wider ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>
              View-to-Cart Rate
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              isDark ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-purple-50 text-purple-600 border border-purple-200'
            }`}>
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-purple-400">
              {summary?.conversionRate ?? 0}%
            </span>
            <span className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>conversion</span>
          </div>
          <div className={`mt-3 pt-3 border-t flex items-center justify-between text-xs ${
            isDark ? 'border-slate-800 text-slate-400' : 'border-slate-100 text-slate-500'
          }`}>
            <span>Cart &rarr; Order: <strong className={isDark ? 'text-white' : 'text-slate-800'}>{summary?.cartToOrderRate ?? 0}%</strong></span>
            <span>Orders: <strong className={isDark ? 'text-white' : 'text-slate-800'}>{summary?.totalOrdersPlaced ?? 0}</strong></span>
          </div>
        </div>
      </div>

      {/* Visitor Activity Heatmap Section */}
      <VisitorActivityHeatmap 
        heatmapData={summary?.activityHeatmap}
        timeframe={timeframe}
        onTimeframeChange={setTimeframe}
        isDark={isDark}
      />

      {/* Deep Insights: Top Searched Keywords & Most Viewed Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Top Search Queries Leaderboard */}
        <div className={`rounded-3xl border p-5 sm:p-6 transition-all flex flex-col justify-between ${
          isDark ? 'bg-slate-900/90 border-slate-800 text-slate-100 shadow-md' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  isDark ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-amber-50 text-amber-600 border border-amber-200'
                }`}>
                  <Search className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`text-base font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>Top Search Queries</h3>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Customer demand terms in search bar</p>
                </div>
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                isDark ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}>
                Demand Evaluation
              </span>
            </div>

            {summary?.topSearches && summary.topSearches.length > 0 ? (
              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                {summary.topSearches.slice(0, 10).map((s, idx) => (
                  <div 
                    key={idx}
                    className={`flex items-center justify-between p-2.5 rounded-2xl border transition-all group cursor-pointer ${
                      isDark 
                        ? 'bg-slate-950/60 hover:bg-slate-800/80 border-slate-800/80 hover:border-amber-500/40' 
                        : 'bg-slate-50 hover:bg-amber-50/60 border-slate-200/80 hover:border-amber-300'
                    }`}
                    onClick={() => handleQuickFilterSearch(s.query)}
                    title={`Click to filter logs for "${s.query}"`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`w-6 h-6 rounded-lg text-[10px] font-black flex items-center justify-center border ${
                        idx === 0 
                          ? 'bg-amber-500 text-white border-amber-400' 
                          : isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-white text-slate-700 border-slate-200'
                      }`}>
                        #{idx + 1}
                      </span>
                      <span className={`text-xs sm:text-sm font-bold truncate group-hover:text-amber-500 ${
                        isDark ? 'text-slate-200' : 'text-slate-800'
                      }`}>
                        {s.query}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5 text-xs shrink-0">
                      <span className={`font-semibold px-2 py-0.5 rounded-lg border text-[11px] ${
                        isDark ? 'bg-slate-900 text-amber-400 border-slate-700' : 'bg-white text-amber-700 border-slate-200'
                      }`}>
                        {s.count} searches
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`py-12 text-center text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                No search queries recorded in this timeframe yet.
              </div>
            )}
          </div>
          <div className={`mt-4 pt-3 border-t text-xs flex items-center justify-between ${
            isDark ? 'border-slate-800 text-slate-400' : 'border-slate-100 text-slate-500'
          }`}>
            <span>Tip: Click any query to instantly filter logs stream below.</span>
          </div>
        </div>

        {/* Right: Top Viewed Products */}
        <TopViewedProductsBreakdown
          products={summary?.topProducts || []}
          onSelectProduct={handleQuickFilterProduct}
          onSelectSearchQuery={handleQuickFilterSearch}
          isDark={isDark}
        />
      </div>

      {/* Device & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Device Distribution */}
        <div className={`rounded-3xl border p-5 transition-all ${
          isDark ? 'bg-slate-900/90 border-slate-800 text-slate-100 shadow-md' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
        }`}>
          <h3 className={`text-sm font-black mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <Smartphone className="w-4 h-4 text-blue-500" />
            Device Distribution
          </h3>
          <div className="space-y-3.5">
            {(summary?.deviceBreakdown || []).map((dev) => (
              <div key={dev.device} className="space-y-1.5">
                <div className={`flex justify-between text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  <span className="flex items-center gap-2">
                    {renderDeviceIcon(dev.device)}
                    {dev.device}
                  </span>
                  <span className="font-mono">{dev.count} ({dev.percentage}%)</span>
                </div>
                <div className={`w-full h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  <div 
                    className={`h-full rounded-full ${
                      dev.device === 'Mobile' ? 'bg-blue-600' : dev.device === 'Desktop' ? 'bg-indigo-600' : 'bg-slate-400'
                    }`}
                    style={{ width: `${Math.max(4, dev.percentage)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Product Categories Breakdown */}
        <div className={`lg:col-span-2 rounded-3xl border p-5 transition-all ${
          isDark ? 'bg-slate-900/90 border-slate-800 text-slate-100 shadow-md' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
        }`}>
          <h3 className={`text-sm font-black mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <Layers className="w-4 h-4 text-indigo-500" />
            Category Interest Breakdown
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(summary?.topCategories || []).slice(0, 8).map((cat) => (
              <div key={cat.category} className={`p-3 rounded-2xl border transition-all ${
                isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200/80'
              }`}>
                <p className={`text-xs font-bold truncate ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{cat.category}</p>
                <p className="text-lg font-black text-blue-500 mt-1">{cat.count}</p>
                <p className={`text-[10px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{cat.percentage}% of views</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* =========================================================================
          FILTERS & INLINE SCROLL VISITOR LOGS STREAM (USER REQUEST SPECIFICATION)
          ========================================================================= */}
      <div id="visitor-logs-section" className={`rounded-3xl border p-5 sm:p-6 transition-all space-y-4 ${
        isDark ? 'bg-slate-900/90 border-slate-800 text-slate-100 shadow-lg' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className={`text-base sm:text-lg font-black flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <Filter className="w-4 h-4 text-blue-500" />
              Visitor Activity Stream &amp; Filters
            </h2>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Filter real customer events with inline scrollable stream and view limits.
            </p>
          </div>

          {/* Active Filter Pill Counter & Reset Button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setSelectedProductId('ALL');
                setSelectedInteraction('ALL');
                setSelectedDevice('ALL');
                setSearchQuery('');
              }}
              className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                isDark 
                  ? 'bg-blue-950/60 text-blue-400 border-blue-800 hover:bg-blue-900/60' 
                  : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
              }`}
            >
              <X className="w-3.5 h-3.5" />
              Reset All Filters
            </button>
          )}
        </div>

        {/* Filter Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* 1. AUDIENCE FILTER */}
          <div>
            <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Audience Filter
            </label>
            <select
              value={audienceFilter}
              onChange={(e) => setAudienceFilter(e.target.value as any)}
              className={`w-full text-xs rounded-xl px-3 py-2.5 border font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                audienceFilter === 'customers_only'
                  ? isDark ? 'bg-blue-950/40 border-blue-800 text-blue-300' : 'bg-blue-50 border-blue-300 text-blue-800 font-bold'
                  : isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <option value="customers_only">👥 Customers Only (Default)</option>
              <option value="staff_only">🛡️ Staff &amp; Admin Only</option>
              <option value="all">🌐 All Interactions (Combined)</option>
            </select>
          </div>

          {/* 2. FILTER BY PRODUCT VIEWED */}
          <div>
            <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Product Viewed
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className={`w-full text-xs rounded-xl px-3 py-2.5 border font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <option value="ALL">📦 All Products ({products.length})</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name.length > 35 ? p.name.substring(0, 35) + '...' : p.name} — TZS {(p.price || 0).toLocaleString()}
                </option>
              ))}
            </select>
          </div>

          {/* 3. FILTER BY INTERACTION TYPE */}
          <div>
            <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Interaction Type
            </label>
            <select
              value={selectedInteraction}
              onChange={(e) => setSelectedInteraction(e.target.value as any)}
              className={`w-full text-xs rounded-xl px-3 py-2.5 border font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <option value="ALL">⚡ All Interactions</option>
              <option value="PRODUCT_VIEW">👁️ Product Views</option>
              <option value="SEARCH">🔍 Search Queries</option>
              <option value="ADD_TO_CART">🛒 Add to Cart</option>
              <option value="EXPRESS_BUY_OPEN">⚡ Express Buy Clicks</option>
              <option value="CHECKOUT_INITIATED">💳 Checkout Initiated</option>
              <option value="ORDER_PLACED">✅ Orders Placed</option>
              <option value="WHATSAPP_CLICK">💬 WhatsApp Inquiries</option>
              <option value="CATEGORY_FILTER">🗂️ Category Filters</option>
              <option value="PAGE_VIEW">🌐 Page Visits</option>
            </select>
          </div>

          {/* 4. FILTER BY DEVICE */}
          <div>
            <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Device
            </label>
            <select
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
              className={`w-full text-xs rounded-xl px-3 py-2.5 border font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <option value="ALL">📱 All Devices</option>
              <option value="Mobile">Mobile Phone</option>
              <option value="Desktop">Desktop / Laptop</option>
              <option value="Tablet">Tablet</option>
            </select>
          </div>

          {/* 5. KEYWORD & SEARCH FILTER */}
          <div>
            <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Keyword / Visitor ID / Email
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search keyword, visitor, URL..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full text-xs rounded-xl pl-8 pr-8 py-2.5 border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isDark ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'
                }`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Quick Filter Chips */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          <span className={`text-[10px] font-black uppercase tracking-wider mr-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Quick Filters:
          </span>
          <button
            type="button"
            onClick={() => setSelectedInteraction('PRODUCT_VIEW')}
            className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              selectedInteraction === 'PRODUCT_VIEW'
                ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
                : isDark ? 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
            }`}
          >
            👁️ Product Views
          </button>
          <button
            type="button"
            onClick={() => setSelectedInteraction('SEARCH')}
            className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              selectedInteraction === 'SEARCH'
                ? 'bg-amber-600 text-white border-amber-500 shadow-xs'
                : isDark ? 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
            }`}
          >
            🔍 Searches
          </button>
          <button
            type="button"
            onClick={() => setSelectedInteraction('ADD_TO_CART')}
            className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              selectedInteraction === 'ADD_TO_CART'
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                : isDark ? 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
            }`}
          >
            🛒 Cart Adds
          </button>
          <button
            type="button"
            onClick={() => setSelectedInteraction('EXPRESS_BUY_OPEN')}
            className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              selectedInteraction === 'EXPRESS_BUY_OPEN'
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs'
                : isDark ? 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
            }`}
          >
            ⚡ Express Buys
          </button>
          <button
            type="button"
            onClick={() => setSelectedInteraction('WHATSAPP_CLICK')}
            className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              selectedInteraction === 'WHATSAPP_CLICK'
                ? 'bg-green-600 text-white border-green-500 shadow-xs'
                : isDark ? 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
            }`}
          >
            💬 WhatsApp
          </button>
          <button
            type="button"
            onClick={() => setSelectedDevice(selectedDevice === 'Mobile' ? 'ALL' : 'Mobile')}
            className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              selectedDevice === 'Mobile'
                ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
                : isDark ? 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
            }`}
          >
            📱 Mobile Only
          </button>
        </div>

        {/* Selected Product Banner Indicator */}
        {activeSelectedProduct && (
          <div className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
            isDark ? 'bg-blue-950/40 border-blue-800 text-blue-200' : 'bg-blue-50 border-blue-200 text-blue-950'
          }`}>
            <div className="flex items-center gap-3 min-w-0">
              {activeSelectedProduct.image && (
                <img 
                  src={activeSelectedProduct.image} 
                  alt={activeSelectedProduct.name} 
                  className="w-10 h-10 rounded-xl object-contain bg-white border border-blue-200 p-0.5 shrink-0" 
                  referrerPolicy="no-referrer"
                />
              )}
              <div className="min-w-0">
                <p className="text-xs font-black truncate">
                  Filtered by Product: {activeSelectedProduct.name}
                </p>
                <p className={`text-[11px] ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
                  Category: {activeSelectedProduct.category} • Price: TZS {(activeSelectedProduct.price || 0).toLocaleString()} • Stock: {activeSelectedProduct.stock}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedProductId('ALL')}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all shrink-0 cursor-pointer ${
                isDark ? 'bg-slate-900 border-slate-700 text-blue-300 hover:bg-slate-800' : 'bg-white border-blue-200 text-blue-700 hover:bg-blue-50'
              }`}
            >
              Clear Product Filter
            </button>
          </div>
        )}

        {/* =========================================================================
            INLINE SCROLLABLE VISITOR ACTIVITY TABLE WITH VIEW CONTROLS
            ========================================================================= */}
        <div className={`rounded-2xl border overflow-hidden ${
          isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-white'
        }`}>
          {/* Table Sub-Header Controls */}
          <div className={`p-3.5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-50/80'
          }`}>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className={`text-xs font-black uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                Logs Stream
              </span>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-200/80 text-slate-700 border-slate-300'
              }`}>
                Showing {currentStart}–{currentEnd} of {logs.length} matched (Total Stored: {totalLogsCount})
              </span>
            </div>

            {/* Density & View Limit Selector */}
            <div className="flex items-center gap-3">
              {/* Density toggle */}
              <div className={`flex items-center p-0.5 rounded-lg border text-xs font-semibold ${
                isDark ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-600'
              }`}>
                <button
                  type="button"
                  onClick={() => setDensity('comfortable')}
                  className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                    density === 'comfortable' ? (isDark ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-900') : ''
                  }`}
                  title="Comfortable row height"
                >
                  Comfortable
                </button>
                <button
                  type="button"
                  onClick={() => setDensity('compact')}
                  className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                    density === 'compact' ? (isDark ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-900') : ''
                  }`}
                  title="Compact dense rows"
                >
                  Compact
                </button>
              </div>

              {/* Rows per page */}
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className={`rounded-lg px-2 py-1 border text-xs font-bold ${
                    isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
          </div>

          {/* Inline Scroll Container with Sticky Headers */}
          <div className="max-h-[500px] overflow-y-auto overflow-x-auto relative">
            {isLoadingLogs ? (
              <div className="py-24 text-center">
                <RotateCw className="w-7 h-7 animate-spin text-blue-500 mx-auto mb-2" />
                <p className={`text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Loading visitor activity stream...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="py-20 text-center space-y-3">
                <AlertCircle className="w-9 h-9 text-slate-500 mx-auto" />
                <div>
                  <p className={`text-sm font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>No Visitor Logs Found</p>
                  <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    No interactions match the selected filter criteria or timeframe.
                  </p>
                </div>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProductId('ALL');
                      setSelectedInteraction('ALL');
                      setSelectedDevice('ALL');
                      setSearchQuery('');
                    }}
                    className="inline-flex items-center gap-1 text-xs font-bold text-blue-500 hover:text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-xl border border-blue-500/20"
                  >
                    Clear Filter Criteria
                  </button>
                )}
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                {/* Sticky Header */}
                <thead className="sticky top-0 z-20">
                  <tr className={`text-[11px] font-black uppercase tracking-wider border-b backdrop-blur-md ${
                    isDark 
                      ? 'bg-slate-950/95 text-slate-400 border-slate-800' 
                      : 'bg-slate-100/95 text-slate-600 border-slate-200'
                  }`}>
                    <th className="py-3 px-4">Time (EAT)</th>
                    <th className="py-3 px-4">Visitor &amp; Session</th>
                    <th className="py-3 px-4">Interaction</th>
                    <th className="py-3 px-4">Target Details</th>
                    <th className="py-3 px-4">Device &amp; City</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y text-xs ${isDark ? 'divide-slate-800/80' : 'divide-slate-100'}`}>
                  {paginatedLogs.map((log) => {
                    const rowPadding = density === 'compact' ? 'py-2 px-4' : 'py-3.5 px-4';

                    return (
                      <tr 
                        key={log.id} 
                        className={`transition-colors ${
                          isDark 
                            ? 'hover:bg-slate-800/60 text-slate-300' 
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        {/* Timestamp */}
                        <td className={`${rowPadding} whitespace-nowrap font-mono text-[11px] ${
                          isDark ? 'text-slate-400' : 'text-slate-600'
                        }`}>
                          {formatToGMT3(log.createdAt)}
                        </td>

                        {/* Visitor ID & User */}
                        <td className={rowPadding}>
                          <div className={`font-mono text-[11px] font-bold truncate max-w-[140px] ${
                            isDark ? 'text-slate-200' : 'text-slate-900'
                          }`} title={log.visitorId}>
                            {log.visitorId.slice(0, 16)}...
                          </div>
                          {(log.isAdmin || log.isStaff) ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 w-fit mt-0.5">
                              <ShieldCheck className="w-2.5 h-2.5" />
                              {log.userRole || 'Staff'}
                            </span>
                          ) : log.userEmail ? (
                            <span className="text-[10px] text-blue-500 font-semibold block truncate max-w-[140px]" title={log.userEmail}>
                              {log.userName || log.userEmail}
                            </span>
                          ) : (
                            <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                              Anonymous Visitor
                            </span>
                          )}
                        </td>

                        {/* Interaction Type Badge */}
                        <td className={`${rowPadding} whitespace-nowrap`}>
                          {renderInteractionBadge(log.interactionType)}
                        </td>

                        {/* Target Details (Product or Search Query) */}
                        <td className={rowPadding}>
                          {log.interactionType === 'SEARCH' ? (
                            <div className="flex items-center gap-2">
                              <span className={`font-bold px-2 py-0.5 rounded-lg border text-xs ${
                                isDark ? 'bg-amber-950/60 text-amber-300 border-amber-800' : 'bg-amber-50 text-amber-900 border-amber-200'
                              }`}>
                                "{log.searchQuery}"
                              </span>
                              <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                ({log.searchResultsCount || 0} hits)
                              </span>
                            </div>
                          ) : log.productName ? (
                            <div className="flex items-center gap-2.5 min-w-0 max-w-[280px]">
                              {log.productImage && (
                                <img 
                                  src={log.productImage} 
                                  alt={log.productName} 
                                  className={`w-8 h-8 rounded-lg object-contain p-0.5 shrink-0 border ${
                                    isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
                                  }`}
                                  referrerPolicy="no-referrer"
                                />
                              )}
                              <div className="min-w-0">
                                <span className={`font-bold truncate block text-xs ${
                                  isDark ? 'text-slate-100' : 'text-slate-900'
                                }`} title={log.productName}>
                                  {log.productName}
                                </span>
                                <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                  {log.productCategory || 'General'} • TZS {(log.productPrice || 0).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          ) : log.categoryFilter ? (
                            <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>
                              Category: <strong className="text-blue-500">{log.categoryFilter}</strong>
                            </span>
                          ) : (
                            <span className={`truncate block max-w-[200px] text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`} title={log.pageUrl}>
                              {log.pageUrl || '/'}
                            </span>
                          )}
                        </td>

                        {/* Device & Browser / City */}
                        <td className={`${rowPadding} whitespace-nowrap`}>
                          <div className={`flex items-center gap-1.5 font-bold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                            {renderDeviceIcon(log.deviceType)}
                            <span>{log.deviceType || 'Mobile'}</span>
                            <span className={`text-[10px] font-normal ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                              ({(log as any).city || 'Dar es Salaam'})
                            </span>
                          </div>
                          <span className={`text-[10px] block ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                            {log.browser || 'Browser'} • {log.os || 'OS'}
                          </span>
                        </td>

                        {/* Actions: View Journey */}
                        <td className={`${rowPadding} text-right whitespace-nowrap`}>
                          <button
                            type="button"
                            onClick={() => setSelectedVisitorId(log.visitorId)}
                            className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-xl transition-all cursor-pointer ${
                              isDark 
                                ? 'bg-blue-950/60 hover:bg-blue-900/80 text-blue-400 border border-blue-800' 
                                : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200'
                            }`}
                          >
                            <span>Journey</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination Footer */}
          {!isLoadingLogs && logs.length > 0 && (
            <div className={`p-3.5 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
              isDark ? 'border-slate-800 bg-slate-950 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600'
            }`}>
              <div className="font-semibold">
                Page <span className={isDark ? 'text-white font-bold' : 'text-slate-900 font-bold'}>{currentPage}</span> of <span className={isDark ? 'text-white font-bold' : 'text-slate-900 font-bold'}>{totalPages}</span> ({logs.length} filtered records)
              </div>

              {/* Navigation Page Buttons */}
              <div className="flex items-center gap-1.5 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                    currentPage === 1 
                      ? 'opacity-40 cursor-not-allowed border-transparent' 
                      : isDark ? 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200' : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                  title="First Page"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border font-bold text-xs transition-all cursor-pointer ${
                    currentPage === 1 
                      ? 'opacity-40 cursor-not-allowed border-transparent' 
                      : isDark ? 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200' : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </button>

                {/* Page Numbers Indicator */}
                <div className="flex items-center gap-1 px-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum = i + 1;
                    if (totalPages > 5) {
                      if (currentPage <= 3) pageNum = i + 1;
                      else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                      else pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={`page-btn-${pageNum}`}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white shadow-xs'
                            : isDark ? 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white' : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border font-bold text-xs transition-all cursor-pointer ${
                    currentPage === totalPages 
                      ? 'opacity-40 cursor-not-allowed border-transparent' 
                      : isDark ? 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200' : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                    currentPage === totalPages 
                      ? 'opacity-40 cursor-not-allowed border-transparent' 
                      : isDark ? 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200' : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                  title="Last Page"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          VISITOR JOURNEY MODAL / DRAWER (THEME AWARE)
          ========================================================================= */}
      {selectedVisitorId && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`rounded-3xl border w-full max-w-2xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Modal Header */}
            <div className={`p-5 border-b flex items-center justify-between ${
              isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-100'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-base font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Visitor Journey Timeline
                  </h3>
                  <p className={`text-xs font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    ID: {selectedVisitorId}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedVisitorId(null)}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                  isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Chronological Journey Steps */}
            <div className="p-6 overflow-y-auto space-y-4">
              <p className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Step-by-step chronology of this buyer's actions, product views, and cart additions:
              </p>

              {visitorJourneyLogs.length === 0 ? (
                <div className={`py-8 text-center text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  No detailed steps found for this visitor in the current cached query.
                </div>
              ) : (
                <div className="relative pl-6 border-l-2 border-blue-500/40 space-y-5">
                  {visitorJourneyLogs.map((step, idx) => (
                    <div key={step.id} className="relative group">
                      {/* Timeline node */}
                      <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-slate-900 border-2 border-blue-500 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      </div>

                      <div className={`p-3.5 rounded-2xl border space-y-2 transition-all ${
                        isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200/80'
                      }`}>
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className={`font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                              Step {idx + 1}
                            </span>
                            {renderInteractionBadge(step.interactionType)}
                          </div>
                          <span className={`text-[11px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {formatToGMT3(step.createdAt)}
                          </span>
                        </div>

                        {step.productName && (
                          <div className="flex items-center gap-2.5 pt-1">
                            {step.productImage && (
                              <img 
                                src={step.productImage} 
                                alt={step.productName} 
                                className={`w-9 h-9 rounded-xl object-contain p-0.5 border ${
                                  isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
                                }`} 
                                referrerPolicy="no-referrer"
                              />
                            )}
                            <div>
                              <p className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                {step.productName}
                              </p>
                              <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                TZS {(step.productPrice || 0).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        )}

                        {step.searchQuery && (
                          <p className={`text-xs ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                            Searched: <strong className="text-amber-500">"{step.searchQuery}"</strong> ({step.searchResultsCount || 0} hits)
                          </p>
                        )}

                        {step.categoryFilter && (
                          <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            Selected Category: <strong className="text-blue-500">{step.categoryFilter}</strong>
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className={`p-4 border-t flex justify-end ${
              isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-100'
            }`}>
              <button
                type="button"
                onClick={() => setSelectedVisitorId(null)}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
                  isDark ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-slate-900 text-white hover:bg-slate-800'
                }`}
              >
                Close Journey
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
