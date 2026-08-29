import React, { useState, useMemo } from 'react';
import { 
  Flame, 
  Zap, 
  Clock, 
  Calendar, 
  Server, 
  Sparkles, 
  TrendingUp, 
  Eye, 
  Search, 
  ShoppingCart, 
  Info,
  Layers,
  ArrowUpRight,
  Sun,
  Moon
} from 'lucide-react';
import { 
  VisitorActivityHeatmapData, 
  VisitorActivityHeatmapCell 
} from '../types';

interface VisitorActivityHeatmapProps {
  heatmapData?: VisitorActivityHeatmapData;
  timeframe?: string;
  onTimeframeChange?: (tf: any) => void;
  isDark?: boolean;
}

type MetricMode = 'all' | 'views' | 'searches' | 'cart';

const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS_24 = Array.from({ length: 24 }, (_, i) => i);

export const VisitorActivityHeatmap: React.FC<VisitorActivityHeatmapProps> = ({
  heatmapData,
  timeframe = '30days',
  onTimeframeChange,
  isDark = true
}) => {
  const [selectedCell, setSelectedCell] = useState<VisitorActivityHeatmapCell | null>(null);
  const [metricMode, setMetricMode] = useState<MetricMode>('all');
  const [hoveredCell, setHoveredCell] = useState<VisitorActivityHeatmapCell | null>(null);

  // Group cells into a quick lookup map by [dayIndex][hour]
  const cellMap = useMemo(() => {
    const map = new Map<string, VisitorActivityHeatmapCell>();
    if (!heatmapData?.cells) return map;
    for (const cell of heatmapData.cells) {
      map.set(`${cell.dayIndex}_${cell.hour}`, cell);
    }
    return map;
  }, [heatmapData]);

  // Compute maximum count based on the selected metric mode to adjust relative cell intensity
  const maxMetricCount = useMemo(() => {
    if (!heatmapData?.cells || heatmapData.cells.length === 0) return 1;
    let max = 0;
    for (const cell of heatmapData.cells) {
      let val = cell.count;
      if (metricMode === 'views') val = cell.productViews;
      else if (metricMode === 'searches') val = cell.searches;
      else if (metricMode === 'cart') val = cell.cartAdds;
      if (val > max) max = val;
    }
    return Math.max(max, 1);
  }, [heatmapData, metricMode]);

  // Helper to retrieve cell metric count
  const getCellMetricValue = (cell?: VisitorActivityHeatmapCell) => {
    if (!cell) return 0;
    if (metricMode === 'views') return cell.productViews;
    if (metricMode === 'searches') return cell.searches;
    if (metricMode === 'cart') return cell.cartAdds;
    return cell.count;
  };

  // Helper for color intensity classes based on percentage (0..1)
  const getIntensityStyle = (cell?: VisitorActivityHeatmapCell) => {
    const val = getCellMetricValue(cell);
    if (!cell || val === 0) {
      return isDark 
        ? 'bg-slate-900/60 border-slate-800/80 text-slate-500 hover:border-slate-700' 
        : 'bg-slate-100/70 border-slate-200/80 text-slate-400 hover:border-slate-300';
    }

    const ratio = val / maxMetricCount;

    if (ratio >= 0.75) {
      return isDark
        ? 'bg-indigo-600 border-indigo-400 text-white font-bold shadow-sm shadow-indigo-600/30 ring-1 ring-indigo-400/50'
        : 'bg-indigo-600 border-indigo-500 text-white font-bold shadow-sm shadow-indigo-500/30';
    } else if (ratio >= 0.45) {
      return isDark
        ? 'bg-indigo-500/80 border-indigo-400/80 text-white font-semibold'
        : 'bg-indigo-500 border-indigo-400 text-white font-semibold';
    } else if (ratio >= 0.2) {
      return isDark
        ? 'bg-indigo-500/40 border-indigo-500/40 text-indigo-200'
        : 'bg-indigo-200 border-indigo-300 text-indigo-900 font-medium';
    } else {
      return isDark
        ? 'bg-indigo-500/20 border-indigo-500/20 text-indigo-300/80'
        : 'bg-indigo-50 border-indigo-100 text-indigo-800';
    }
  };

  const activeInspectCell = hoveredCell || selectedCell;

  // Formatting hours for legend and tooltips
  const formatHourShort = (h: number) => {
    if (h === 0) return '12a';
    if (h === 6) return '6a';
    if (h === 12) return '12p';
    if (h === 18) return '6p';
    if (h === 23) return '11p';
    return `${h > 12 ? h - 12 : h}${h >= 12 ? 'p' : 'a'}`;
  };

  const peakDay = heatmapData?.peakDay || 'Friday';
  const peakHour = heatmapData?.peakHour || '8:00 PM';
  const peakWindow = heatmapData?.peakTimeWindow || 'Friday 8:00 PM – 10:00 PM';
  const recommendedPromo = heatmapData?.recommendedPromoWindow || 'Friday & Saturday, 8:00 PM - 10:00 PM (EAT)';
  const quietMaintenance = heatmapData?.quietMaintenanceWindow || 'Daily 02:00 AM – 05:00 AM (EAT)';
  const serverLoad = heatmapData?.serverLoadRating || 'OPTIMAL';

  return (
    <div className={`rounded-3xl border p-6 transition-all space-y-6 ${isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
      {/* Header & Strategic Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`text-lg font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Visitor Activity Heatmap
              </h3>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Hourly & day-of-week traffic distribution in East Africa Time (EAT, UTC+3) for server load & promo timing.
              </p>
            </div>
          </div>
        </div>

        {/* Metric Switcher & Timeframe filter */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Mode Switcher */}
          <div className={`p-1 rounded-xl border flex items-center gap-1 ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
            <button
              type="button"
              onClick={() => setMetricMode('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                metricMode === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>All Actions</span>
            </button>
            <button
              type="button"
              onClick={() => setMetricMode('views')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                metricMode === 'views'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Views</span>
            </button>
            <button
              type="button"
              onClick={() => setMetricMode('searches')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                metricMode === 'searches'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Searches</span>
            </button>
            <button
              type="button"
              onClick={() => setMetricMode('cart')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                metricMode === 'cart'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Cart Adds</span>
            </button>
          </div>

          {/* Timeframe selector if callback passed */}
          {onTimeframeChange && (
            <select
              value={timeframe}
              onChange={(e) => onTimeframeChange(e.target.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-700'
              }`}
            >
              <option value="today">Today</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="60days">Full 60 Days Retention</option>
              <option value="all">All-Time Scoped</option>
            </select>
          )}
        </div>
      </div>

      {/* Strategic Decision & Load Management Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Peak Promotion Window */}
        <div className={`p-4 rounded-2xl border transition-all ${
          isDark ? 'bg-slate-950/60 border-slate-800/80 hover:border-indigo-500/40' : 'bg-slate-50/70 border-slate-200 hover:border-indigo-300'
        }`}>
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className={`text-[10px] font-black uppercase tracking-wider ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
              Peak Promotion Window
            </span>
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-base font-black truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {peakDay} at {peakHour}
          </div>
          <p className={`text-xs mt-1.5 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            <span className="font-semibold text-indigo-400">Best Strategy:</span> Launch flash sales, push banners & WhatsApp campaign broadcasts during <strong>{recommendedPromo}</strong>.
          </p>
        </div>

        {/* Card 2: Server Concurrency & Load Status */}
        <div className={`p-4 rounded-2xl border transition-all ${
          isDark ? 'bg-slate-950/60 border-slate-800/80 hover:border-emerald-500/40' : 'bg-slate-50/70 border-slate-200 hover:border-emerald-300'
        }`}>
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className={`text-[10px] font-black uppercase tracking-wider ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
              Server Concurrency Load
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {serverLoad === 'OPTIMAL' ? 'Optimal Load' : serverLoad === 'MODERATE' ? 'Moderate Concurrency' : 'High Traffic Surge'}
            </span>
          </div>
          <p className={`text-xs mt-1.5 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Peak window recorded <strong>{heatmapData?.peakHourCount || 0} interactions/hr</strong>. Server memory cache & queries respond in &lt;15ms.
          </p>
        </div>

        {/* Card 3: Quiet Maintenance Window */}
        <div className={`p-4 rounded-2xl border transition-all ${
          isDark ? 'bg-slate-950/60 border-slate-800/80 hover:border-blue-500/40' : 'bg-slate-50/70 border-slate-200 hover:border-blue-300'
        }`}>
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className={`text-[10px] font-black uppercase tracking-wider ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
              Quiet Maintenance Window
            </span>
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
              <Moon className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-base font-black truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {quietMaintenance}
          </div>
          <p className={`text-xs mt-1.5 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Ideal off-peak timeframe for bulk inventory CSV uploads, catalog price re-indexing, and store resets with zero customer disruption.
          </p>
        </div>
      </div>

      {/* Heatmap 7x24 Matrix Grid */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            <Clock className="w-3.5 h-3.5 text-indigo-500" />
            <span>24-Hour Activity Matrix by Day (East Africa Time)</span>
          </span>

          {/* Intensity Legend */}
          <div className="flex items-center gap-2 text-[11px] font-medium">
            <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>Low</span>
            <div className="flex items-center gap-1">
              <div className={`w-3.5 h-3.5 rounded-sm border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-100 border-slate-200'}`}></div>
              <div className="w-3.5 h-3.5 rounded-sm bg-indigo-500/20 border border-indigo-500/20"></div>
              <div className="w-3.5 h-3.5 rounded-sm bg-indigo-500/40 border border-indigo-500/40"></div>
              <div className="w-3.5 h-3.5 rounded-sm bg-indigo-500 border border-indigo-400"></div>
              <div className="w-3.5 h-3.5 rounded-sm bg-indigo-600 border border-indigo-400 shadow-sm"></div>
            </div>
            <span className={isDark ? 'text-indigo-400' : 'text-indigo-600'}>Peak Traffic</span>
          </div>
        </div>

        {/* Scrollable Grid Container */}
        <div className="overflow-x-auto pb-2 pt-1">
          <div className="min-w-[760px] space-y-1">
            {/* Hour Header Numbers */}
            <div className="grid grid-cols-[56px_repeat(24,1fr)] gap-1 text-center">
              <div className="text-[10px] font-bold text-slate-500 uppercase text-left pl-1">Day</div>
              {HOURS_24.map((h) => (
                <div 
                  key={`header-${h}`} 
                  className={`text-[9px] font-mono font-bold ${h % 3 === 0 ? (isDark ? 'text-slate-300' : 'text-slate-700') : (isDark ? 'text-slate-600' : 'text-slate-400')}`}
                  title={`${h}:00 EAT`}
                >
                  {formatHourShort(h)}
                </div>
              ))}
            </div>

            {/* 7 Days Rows */}
            {DAYS_SHORT.map((dayName, dayIndex) => (
              <div key={`day-row-${dayName}`} className="grid grid-cols-[56px_repeat(24,1fr)] gap-1 items-center">
                {/* Day Label */}
                <div className={`text-xs font-black tracking-tight ${
                  dayIndex === (heatmapData?.busiestDayIndex ?? 4) 
                    ? 'text-indigo-400 font-extrabold flex items-center gap-1' 
                    : (isDark ? 'text-slate-300' : 'text-slate-700')
                }`}>
                  <span>{dayName}</span>
                  {dayIndex === (heatmapData?.busiestDayIndex ?? 4) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping"></span>
                  )}
                </div>

                {/* 24 Hour Heatmap Cells */}
                {HOURS_24.map((hour) => {
                  const cellKey = `${dayIndex}_${hour}`;
                  const cell = cellMap.get(cellKey);
                  const isHovered = hoveredCell && hoveredCell.dayIndex === dayIndex && hoveredCell.hour === hour;
                  const isSelected = selectedCell && selectedCell.dayIndex === dayIndex && selectedCell.hour === hour;
                  const intensityClass = getIntensityStyle(cell);
                  const val = getCellMetricValue(cell);

                  return (
                    <button
                      key={cellKey}
                      type="button"
                      onMouseEnter={() => setHoveredCell(cell || null)}
                      onMouseLeave={() => setHoveredCell(null)}
                      onClick={() => setSelectedCell(cell || null)}
                      className={`h-7 rounded-lg border transition-all duration-150 flex items-center justify-center text-[9px] font-mono cursor-pointer relative group ${intensityClass} ${
                        isHovered || isSelected ? 'scale-110 z-20 ring-2 ring-indigo-400 shadow-lg' : ''
                      }`}
                      aria-label={`${dayName} ${hour}:00 - ${val} events`}
                    >
                      {val > 0 ? val : ''}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Selected / Hovered Cell Inspection Drawer */}
      {activeInspectCell && (
        <div className={`p-4 rounded-2xl border transition-all animate-in fade-in duration-150 ${
          isDark ? 'bg-slate-950 border-indigo-500/30 shadow-xl shadow-indigo-950/30' : 'bg-indigo-50/70 border-indigo-200 shadow-sm'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 mb-3 border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-600 text-white font-black text-xs">
                {activeInspectCell.dayName}
              </div>
              <div>
                <h4 className={`text-sm font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {activeInspectCell.dayFullName}, {activeInspectCell.hourLabel} – {((activeInspectCell.hour + 1) % 24 === 0 ? 12 : (activeInspectCell.hour + 1) % 24 > 12 ? (activeInspectCell.hour + 1) % 24 - 12 : (activeInspectCell.hour + 1) % 24)} {activeInspectCell.hour + 1 >= 12 && activeInspectCell.hour + 1 < 24 ? 'PM' : 'AM'} (EAT)
                </h4>
                <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {activeInspectCell.count > 0 ? `${activeInspectCell.uniqueVisitors} unique customer session(s) active during this hour` : 'No interactions recorded in this time slot'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-xl text-xs font-black ${
                activeInspectCell.intensity >= 0.7 
                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                  : activeInspectCell.intensity >= 0.3 
                  ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' 
                  : isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'
              }`}>
                {activeInspectCell.intensity >= 0.7 ? '🔥 Ultra Peak Window' : activeInspectCell.intensity >= 0.3 ? '⚡ Active Traffic' : '🌙 Quiet Window'}
              </span>
            </div>
          </div>

          {/* Detailed Breakdown Counters */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center">
            <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
              <span className={`text-[10px] font-black uppercase tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Total Actions
              </span>
              <span className={`text-base font-black mt-0.5 block ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {activeInspectCell.count}
              </span>
            </div>

            <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
              <span className={`text-[10px] font-black uppercase tracking-wider block ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                Product Views
              </span>
              <span className="text-base font-black text-blue-500 mt-0.5 block">
                {activeInspectCell.productViews}
              </span>
            </div>

            <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
              <span className={`text-[10px] font-black uppercase tracking-wider block ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                Store Searches
              </span>
              <span className="text-base font-black text-amber-500 mt-0.5 block">
                {activeInspectCell.searches}
              </span>
            </div>

            <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
              <span className={`text-[10px] font-black uppercase tracking-wider block ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
                Cart Adds
              </span>
              <span className="text-base font-black text-indigo-500 mt-0.5 block">
                {activeInspectCell.cartAdds}
              </span>
            </div>

            <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
              <span className={`text-[10px] font-black uppercase tracking-wider block ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                Orders Placed
              </span>
              <span className="text-base font-black text-emerald-500 mt-0.5 block">
                {activeInspectCell.orders}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 24-Hour Curve Trend & Day Ranking Distribution */}
      {heatmapData?.hourlyDistribution && heatmapData.hourlyDistribution.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2 border-t border-slate-200 dark:border-slate-800">
          {/* Hourly 24-Bar Micro Graph */}
          <div className="lg:col-span-8 space-y-2">
            <div className="flex items-center justify-between">
              <span className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                <span>Aggregated 24-Hour Traffic Curve</span>
              </span>
              <span className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                Total {heatmapData.totalHeatmapInteractions} interactions mapped
              </span>
            </div>

            {/* Micro Bars */}
            <div className="grid grid-cols-24 gap-1 h-20 items-end pt-4 pb-1">
              {heatmapData.hourlyDistribution.map((hItem) => {
                const maxH = Math.max(...heatmapData.hourlyDistribution.map(x => x.count), 1);
                const heightPct = Math.max(Math.round((hItem.count / maxH) * 100), 4);
                const isPeak = hItem.hour === heatmapData.busiestHour;

                return (
                  <div 
                    key={`bar-${hItem.hour}`}
                    className="flex flex-col items-center gap-1 h-full justify-end group relative"
                  >
                    <div 
                      style={{ height: `${heightPct}%` }}
                      className={`w-full rounded-t-md transition-all duration-300 ${
                        isPeak 
                          ? 'bg-indigo-500 shadow-md shadow-indigo-500/50' 
                          : hItem.count > 0 
                          ? isDark ? 'bg-slate-700 group-hover:bg-indigo-400' : 'bg-slate-300 group-hover:bg-indigo-500'
                          : isDark ? 'bg-slate-800/40' : 'bg-slate-200/50'
                      }`}
                    ></div>
                    <span className="text-[8px] font-mono text-slate-500 hidden sm:block truncate">
                      {hItem.hour % 4 === 0 ? formatHourShort(hItem.hour) : ''}
                    </span>

                    {/* Tooltip on hover */}
                    <div className={`absolute bottom-full mb-1 hidden group-hover:flex flex-col items-center px-2 py-1 rounded-lg text-[10px] font-bold shadow-xl border z-30 pointer-events-none whitespace-nowrap ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                    }`}>
                      <span>{hItem.hourLabel}: {hItem.count} actions</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Day of Week Ranking */}
          <div className="lg:col-span-4 space-y-2">
            <span className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
              <span>Day-of-Week Ranking</span>
            </span>

            <div className="space-y-1.5">
              {heatmapData.dailyDistribution?.map((dItem) => {
                const maxD = Math.max(...heatmapData.dailyDistribution.map(x => x.count), 1);
                const pct = Math.max(Math.round((dItem.count / maxD) * 100), 2);
                const isTopDay = dItem.dayIndex === heatmapData.busiestDayIndex;

                return (
                  <div key={`d-rank-${dItem.dayIndex}`} className="space-y-0.5">
                    <div className="flex justify-between text-xs">
                      <span className={`font-bold ${isTopDay ? 'text-indigo-400' : isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        {dItem.dayName} {isTopDay ? '👑' : ''}
                      </span>
                      <span className={`font-mono text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {dItem.count} events
                      </span>
                    </div>
                    <div className={`h-1.5 w-full rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
                      <div 
                        style={{ width: `${pct}%` }} 
                        className={`h-full rounded-full ${isTopDay ? 'bg-indigo-500' : isDark ? 'bg-slate-600' : 'bg-slate-400'}`}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
