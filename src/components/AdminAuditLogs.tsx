import React, { useState, useEffect, useMemo } from 'react';
import { AuditLog, formatToGMT3 } from '../types';
import { fetchAuditLogs, exportAuditLogsToCSV } from '../lib/enterpriseAuditService';
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  Download, 
  RefreshCw, 
  Clock, 
  User, 
  FileText, 
  Tag, 
  DollarSign, 
  Package, 
  Key, 
  Bell, 
  Settings, 
  ChevronDown, 
  ChevronUp, 
  Activity,
  Layers,
  AlertCircle
} from 'lucide-react';

interface AdminAuditLogsProps {
  theme?: 'light' | 'dark';
}

export const AdminAuditLogs: React.FC<AdminAuditLogsProps> = ({ theme = 'dark' }) => {
  const isDark = theme === 'dark';
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const data = await fetchAuditLogs(300);
      setLogs(data);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const getActionBadge = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('DELETE') || act.includes('VOID')) {
      return { bg: 'bg-rose-500/10 border-rose-500/20 text-rose-400', icon: AlertCircle };
    }
    if (act.includes('PRICE') || act.includes('FINANCIAL') || act.includes('SALE') || act.includes('LOAN')) {
      return { bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400', icon: DollarSign };
    }
    if (act.includes('STOCK') || act.includes('PRODUCT')) {
      return { bg: 'bg-blue-500/10 border-blue-500/20 text-blue-400', icon: Package };
    }
    if (act.includes('STAFF') || act.includes('PERMISSION')) {
      return { bg: 'bg-amber-500/10 border-amber-500/20 text-amber-400', icon: Key };
    }
    if (act.includes('NOTIFICATION') || act.includes('SMS') || act.includes('WHATSAPP')) {
      return { bg: 'bg-purple-500/10 border-purple-500/20 text-purple-400', icon: Bell };
    }
    return { bg: 'bg-slate-500/10 border-slate-500/20 text-slate-400', icon: Activity };
  };

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Search
      const matchSearch = !searchQuery.trim() || 
        String(log.action || '').toLowerCase().includes(String(searchQuery || '').toLowerCase()) ||
        String(log.actorName || '').toLowerCase().includes(String(searchQuery || '').toLowerCase()) ||
        String(log.actorEmail || '').toLowerCase().includes(String(searchQuery || '').toLowerCase()) ||
        String(log.details || '').toLowerCase().includes(String(searchQuery || '').toLowerCase()) ||
        (log.targetId && String(log.targetId).toLowerCase().includes(String(searchQuery || '').toLowerCase()));

      // Category filter
      let matchCat = true;
      if (selectedCategory === 'INVENTORY') {
        matchCat = log.action.includes('PRODUCT') || log.action.includes('STOCK') || log.action.includes('PRICE');
      } else if (selectedCategory === 'FINANCIAL') {
        matchCat = log.action.includes('SALE') || log.action.includes('LOAN') || log.action.includes('REPAYMENT');
      } else if (selectedCategory === 'SECURITY') {
        matchCat = log.action.includes('STAFF') || log.action.includes('PERMISSION') || log.action.includes('PASSWORD');
      } else if (selectedCategory === 'NOTIFICATIONS') {
        matchCat = log.action.includes('NOTIFICATION') || log.action.includes('SMS') || log.action.includes('WHATSAPP');
      }

      // Role filter
      const matchRole = selectedRole === 'ALL' || String(log.actorRole || '').toLowerCase().includes(String(selectedRole || '').toLowerCase());

      return matchSearch && matchCat && matchRole;
    });
  }, [logs, searchQuery, selectedCategory, selectedRole]);

  // Statistics
  const stats = useMemo(() => {
    return {
      total: logs.length,
      inventory: logs.filter(l => l.action.includes('PRODUCT') || l.action.includes('STOCK') || l.action.includes('PRICE')).length,
      financial: logs.filter(l => l.action.includes('SALE') || l.action.includes('LOAN') || l.action.includes('REPAYMENT')).length,
      security: logs.filter(l => l.action.includes('STAFF') || l.action.includes('PERMISSION')).length,
      notifications: logs.filter(l => l.action.includes('NOTIFICATION') || l.action.includes('SMS')).length,
    };
  }, [logs]);

  return (
    <div className="space-y-6">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-600/10 text-blue-500 border border-blue-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Enterprise Audit Trail & Security Logs
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Immutable, tamper-evident chronological activity logs across inventory adjustments, POS transactions, loan repayments, and staff actions.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={loadLogs}
            disabled={isLoading}
            className={`p-2.5 rounded-xl border font-bold text-xs flex items-center gap-1.5 transition-all ${
              isDark 
                ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200' 
                : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-500' : ''}`} />
            <span className="hidden sm:inline">Refresh Logs</span>
          </button>

          <button
            type="button"
            onClick={() => exportAuditLogsToCSV(filteredLogs)}
            disabled={filteredLogs.length === 0}
            className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Recorded</div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1">{stats.total}</div>
        </div>

        <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">Inventory & Stock</div>
          <div className="text-xl font-black text-blue-500 mt-1">{stats.inventory}</div>
        </div>

        <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">POS & Financials</div>
          <div className="text-xl font-black text-emerald-500 mt-1">{stats.financial}</div>
        </div>

        <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Staff & Security</div>
          <div className="text-xl font-black text-amber-500 mt-1">{stats.security}</div>
        </div>

        <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} col-span-2 sm:col-span-1`}>
          <div className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">Notifications</div>
          <div className="text-xl font-black text-purple-500 mt-1">{stats.notifications}</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className={`p-3.5 rounded-2xl border space-y-3 ${isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search action, staff member, email, product ID, receipt number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-9 pr-4 py-2 rounded-xl text-xs font-medium border outline-none transition-all ${
                isDark 
                  ? 'bg-slate-800/80 border-slate-700 text-white focus:border-blue-500' 
                  : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
              }`}
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border outline-none cursor-pointer ${
                isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <option value="ALL">All Categories</option>
              <option value="INVENTORY">Inventory & Stock</option>
              <option value="FINANCIAL">POS, Sales & Loans</option>
              <option value="SECURITY">Staff & Roles</option>
              <option value="NOTIFICATIONS">Notifications & SMS</option>
            </select>

            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border outline-none cursor-pointer ${
                isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <option value="ALL">All Roles</option>
              <option value="Super Admin">Super Admin</option>
              <option value="Branch Manager">Branch Manager</option>
              <option value="Cashier">Cashier</option>
              <option value="Storekeeper">Storekeeper / Dispatch</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table / List */}
      <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
        {isLoading ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
            <span className="text-xs font-bold text-slate-400">Loading audit trail records...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
            <ShieldCheck className="w-10 h-10 text-slate-600" />
            <p className="text-sm font-bold text-slate-400">No audit log records match your search criteria.</p>
            <button
              type="button"
              onClick={() => { setSearchQuery(''); setSelectedCategory('ALL'); setSelectedRole('ALL'); }}
              className="text-xs text-blue-500 font-bold hover:underline mt-1"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {filteredLogs.map((log) => {
              const badge = getActionBadge(log.action);
              const BadgeIcon = badge.icon;
              const isExpanded = expandedLogId === log.id;

              return (
                <div 
                  key={log.id} 
                  className={`p-4 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30 ${
                    isExpanded ? (isDark ? 'bg-slate-800/40' : 'bg-blue-50/30') : ''
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Left: Action Badge & Actor info */}
                    <div className="flex items-start sm:items-center gap-3">
                      <div className={`p-2 rounded-xl border flex items-center justify-center shrink-0 ${badge.bg}`}>
                        <BadgeIcon className="w-4 h-4" />
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                            {log.action.replace(/_/g, ' ')}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {log.actorRole}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-1 leading-relaxed">
                          {log.details}
                        </p>
                      </div>
                    </div>

                    {/* Right: Actor & Timestamp */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center shrink-0 text-right gap-1 pl-11 sm:pl-0">
                      <div className="flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-300">
                        <User className="w-3 h-3 text-slate-400" />
                        <span>{log.actorName}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{formatToGMT3(log.timestamp)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Expand toggle if log has changes summary */}
                  {log.changesSummary && log.changesSummary.length > 0 && (
                    <div className="mt-3 pl-11">
                      <button
                        type="button"
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        className="text-[11px] font-bold text-blue-500 hover:text-blue-400 flex items-center gap-1 transition-colors"
                      >
                        <span>{isExpanded ? 'Hide changes diff' : `Inspect field diff (${log.changesSummary.length} fields)`}</span>
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>

                      {isExpanded && (
                        <div className="mt-2 p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 font-mono text-[11px]">
                          {log.changesSummary.map((diff, idx) => (
                            <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-slate-300">
                              <span className="font-bold text-blue-400">{diff.field}:</span>
                              <div className="flex items-center gap-2">
                                <span className="text-rose-400 bg-rose-950/50 px-1.5 py-0.5 rounded line-through">
                                  {JSON.stringify(diff.oldVal)}
                                </span>
                                <span className="text-slate-500">➔</span>
                                <span className="text-emerald-400 bg-emerald-950/50 px-1.5 py-0.5 rounded">
                                  {JSON.stringify(diff.newVal)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
