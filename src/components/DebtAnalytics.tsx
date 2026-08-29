import React, { useMemo, useState } from 'react';
import { POSTransaction, formatTZS, formatToGMT3 } from '../types';
import { 
  getLoanCustomerName, 
  getLoanCustomerPhone, 
  isLoanTransaction, 
  computeLoanMeta, 
  getLoanDueDate 
} from '../utils/loanUtils';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { 
  AlertTriangle, TrendingUp, Clock, DollarSign, Users, 
  CheckCircle2, ShieldAlert, ArrowUpRight, Phone, Banknote, Calendar,
  CreditCard, PieChart as PieChartIcon, BarChart3, ChevronRight, Filter, Search
} from 'lucide-react';

interface DebtAnalyticsProps {
  posTransactions: POSTransaction[];
  isDark?: boolean;
  cardBg?: string;
  textTitle?: string;
  textSub?: string;
  onGoToLoans?: () => void;
}

export const DebtAnalytics: React.FC<DebtAnalyticsProps> = ({ 
  posTransactions,
  isDark = false,
  cardBg = 'bg-white dark:bg-slate-900',
  textTitle = 'text-slate-900 dark:text-white',
  textSub = 'text-slate-500 dark:text-slate-400',
  onGoToLoans
}) => {
  const [agingTimeframe, setAgingTimeframe] = useState<'all' | '30days' | '60days'>('all');
  const [searchDebtor, setSearchDebtor] = useState('');

  // Extract all credit/loan transactions using robust filter
  const loanData = useMemo(() => {
    return posTransactions.filter(tx => isLoanTransaction(tx));
  }, [posTransactions]);

  // Compute metadata map for efficiency
  const loanMetaMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof computeLoanMeta>>();
    loanData.forEach((tx) => {
      map.set(tx.id, computeLoanMeta(tx));
    });
    return map;
  }, [loanData]);

  const totalOutstanding = useMemo(() => {
    return loanData.reduce((sum, tx) => {
      const meta = loanMetaMap.get(tx.id);
      return sum + (meta ? meta.remainingBalance : 0);
    }, 0);
  }, [loanData, loanMetaMap]);

  const totalCollectedDownPayments = useMemo(() => {
    return loanData.reduce((sum, tx) => {
      const meta = loanMetaMap.get(tx.id);
      return sum + (meta ? meta.initialDeposit : 0);
    }, 0);
  }, [loanData, loanMetaMap]);

  const totalLoanGross = useMemo(() => {
    return loanData.reduce((sum, tx) => {
      const meta = loanMetaMap.get(tx.id);
      return sum + (meta ? meta.total : 0);
    }, 0);
  }, [loanData, loanMetaMap]);

  const totalRecovered = useMemo(() => {
    return Math.max(0, totalLoanGross - totalOutstanding);
  }, [totalLoanGross, totalOutstanding]);

  const overdueCount = useMemo(() => {
    return loanData.filter(tx => {
      const meta = loanMetaMap.get(tx.id);
      return meta ? meta.isOverdue : false;
    }).length;
  }, [loanData, loanMetaMap]);

  const activeDebtors = useMemo(() => {
    return loanData.filter(tx => {
      const meta = loanMetaMap.get(tx.id);
      return meta ? meta.remainingBalance > 0 : false;
    }).length;
  }, [loanData, loanMetaMap]);

  const recoveryRate = totalLoanGross > 0 
    ? Math.min(100, Math.max(0, Math.round((totalRecovered / totalLoanGross) * 100))) 
    : 100;

  // Aging Data with theme-aligned palette
  const agingData = useMemo(() => {
    const buckets = { 'Current (On-Time)': 0, '1-30 Days': 0, '31-60 Days': 0, '60+ Days': 0 };
    const counts = { 'Current (On-Time)': 0, '1-30 Days': 0, '31-60 Days': 0, '60+ Days': 0 };
    const now = new Date();
    
    loanData.forEach(tx => {
      const meta = loanMetaMap.get(tx.id);
      if (!meta || meta.remainingBalance <= 0) return;
      
      if (meta.dueDate) {
        const dueDateObj = new Date(meta.dueDate);
        const diffTime = now.getTime() - dueDateObj.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 0) {
          buckets['Current (On-Time)'] += meta.remainingBalance;
          counts['Current (On-Time)'] += 1;
        } else if (diffDays <= 30) {
          buckets['1-30 Days'] += meta.remainingBalance;
          counts['1-30 Days'] += 1;
        } else if (diffDays <= 60) {
          buckets['31-60 Days'] += meta.remainingBalance;
          counts['31-60 Days'] += 1;
        } else {
          buckets['60+ Days'] += meta.remainingBalance;
          counts['60+ Days'] += 1;
        }
      } else {
        buckets['Current (On-Time)'] += meta.remainingBalance;
        counts['Current (On-Time)'] += 1;
      }
    });
    
    return [
      { name: 'Current (On-Time)', value: buckets['Current (On-Time)'], count: counts['Current (On-Time)'], color: '#3b82f6', gradientId: 'currentGrad' },
      { name: '1-30 Days Overdue', value: buckets['1-30 Days'], count: counts['1-30 Days'], color: '#f59e0b', gradientId: 'warningGrad' },
      { name: '31-60 Days Overdue', value: buckets['31-60 Days'], count: counts['31-60 Days'], color: '#f97316', gradientId: 'lateGrad' },
      { name: '60+ Days Critical', value: buckets['60+ Days'], count: counts['60+ Days'], color: '#ef4444', gradientId: 'criticalGrad' },
    ];
  }, [loanData, loanMetaMap]);

  // Portfolio Distribution
  const portfolioDistribution = useMemo(() => {
    let fullyPaid = 0;
    let currentActive = 0;
    let overdue = 0;

    loanData.forEach((tx) => {
      const meta = loanMetaMap.get(tx.id);
      if (!meta) return;
      if (meta.computedStatus === 'paid') {
        fullyPaid++;
      } else if (meta.computedStatus === 'overdue') {
        overdue++;
      } else {
        currentActive++;
      }
    });

    return [
      { name: 'Fully Settled', value: fullyPaid, color: '#10b981', pct: loanData.length ? Math.round((fullyPaid / loanData.length) * 100) : 0 },
      { name: 'Active On-Track', value: currentActive, color: '#3b82f6', pct: loanData.length ? Math.round((currentActive / loanData.length) * 100) : 0 },
      { name: 'Overdue / Action Needed', value: overdue, color: '#ef4444', pct: loanData.length ? Math.round((overdue / loanData.length) * 100) : 0 },
    ].filter(item => item.value > 0);
  }, [loanData, loanMetaMap]);

  // Top High Balance Unsettled Debtors
  const topDebtors = useMemo(() => {
    return [...loanData]
      .filter(tx => {
        const meta = loanMetaMap.get(tx.id);
        return meta ? meta.remainingBalance > 0 : false;
      })
      .filter(tx => {
        if (!searchDebtor) return true;
        const q = String(searchDebtor || "").toLowerCase();
        const cPhone = getLoanCustomerPhone(tx);
        return (
          String(getLoanCustomerName(tx) || '').toLowerCase().includes(q) ||
          String(cPhone || "").toLowerCase().includes(q) ||
          (tx.id || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const balA = loanMetaMap.get(a.id)?.remainingBalance || 0;
        const balB = loanMetaMap.get(b.id)?.remainingBalance || 0;
        return balB - balA;
      })
      .slice(0, 10);
  }, [loanData, searchDebtor, loanMetaMap]);

  // Theme-aware tokens
  const borderColor = isDark ? 'border-slate-800' : 'border-slate-200';
  const subCardBg = isDark ? 'bg-slate-800/40' : 'bg-slate-50/80';
  const gridStroke = isDark ? 'rgba(51, 65, 85, 0.4)' : 'rgba(226, 232, 240, 0.9)';
  const axisColor = isDark ? '#94a3b8' : '#64748b';

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className={`text-2xl font-extrabold tracking-tight ${textTitle}`}>
              Debt & Credit Analytics
            </h2>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
              Credit Risk Radar
            </span>
          </div>
          <p className={`text-sm mt-1 ${textSub}`}>
            Portfolio intelligence on customer credit balances, installment debt aging, recovery rates, and collection follow-ups.
          </p>
        </div>

        {onGoToLoans && (
          <button
            onClick={onGoToLoans}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all active:scale-95 shrink-0"
          >
            <Banknote className="w-4 h-4" />
            <span>Manage All Loans & Repayments</span>
          </button>
        )}
      </div>

      {/* 4 Primary KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Unpaid Receivables */}
        <div className={`p-5 rounded-3xl border shadow-sm transition-all hover:shadow-md ${cardBg} ${borderColor} relative overflow-hidden group`}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-colors pointer-events-none" />
          <div className="flex items-center justify-between">
            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl border border-amber-500/20">
              <DollarSign className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
              Receivables
            </span>
          </div>
          <div className="mt-4">
            <p className={`text-[11px] font-bold uppercase tracking-wider ${textSub}`}>
              Total Unpaid Outstanding
            </p>
            <h3 className={`text-2xl font-black mt-1 tracking-tight ${textTitle}`}>
              {formatTZS(totalOutstanding)}
            </h3>
            <div className="flex items-center gap-1.5 mt-2">
              <span className={`text-[11px] font-medium ${textSub}`}>
                Across <strong>{activeDebtors}</strong> active debtor accounts
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Overdue Loans */}
        <div className={`p-5 rounded-3xl border shadow-sm transition-all hover:shadow-md ${cardBg} ${borderColor} relative overflow-hidden group`}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl group-hover:bg-rose-500/10 transition-colors pointer-events-none" />
          <div className="flex items-center justify-between">
            <div className="p-3 bg-rose-500/10 text-rose-500 rounded-2xl border border-rose-500/20">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <span
              className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                overdueCount > 0
                  ? 'bg-rose-500/15 text-rose-500 border-rose-500/30 animate-pulse'
                  : 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
              }`}
            >
              {overdueCount > 0 ? `${overdueCount} Overdue` : 'Healthy'}
            </span>
          </div>
          <div className="mt-4">
            <p className={`text-[11px] font-bold uppercase tracking-wider ${textSub}`}>
              Overdue Customer Loans
            </p>
            <h3
              className={`text-2xl font-black mt-1 tracking-tight ${
                overdueCount > 0 ? 'text-rose-500' : textTitle
              }`}
            >
              {overdueCount}{' '}
              <span className="text-xs font-semibold text-slate-400">contracts</span>
            </h3>
            <div className="flex items-center gap-1.5 mt-2">
              <span className={`text-[11px] font-medium ${textSub}`}>
                Past agreed repayment deadline
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Recovered Down Payments */}
        <div className={`p-5 rounded-3xl border shadow-sm transition-all hover:shadow-md ${cardBg} ${borderColor} relative overflow-hidden group`}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors pointer-events-none" />
          <div className="flex items-center justify-between">
            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl border border-emerald-500/20">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              {recoveryRate}% Recovered
            </span>
          </div>
          <div className="mt-4">
            <p className={`text-[11px] font-bold uppercase tracking-wider ${textSub}`}>
              Total Recovered & Paid
            </p>
            <h3 className="text-2xl font-black mt-1 tracking-tight text-emerald-500">
              {formatTZS(totalRecovered)}
            </h3>
            {/* Recovery Progress Bar */}
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${recoveryRate}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 4: Total Credit Portfolio */}
        <div className={`p-5 rounded-3xl border shadow-sm transition-all hover:shadow-md ${cardBg} ${borderColor} relative overflow-hidden group`}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors pointer-events-none" />
          <div className="flex items-center justify-between">
            <div className="p-3 bg-blue-500/10 text-blue-500 rounded-2xl border border-blue-500/20">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
              Portfolio
            </span>
          </div>
          <div className="mt-4">
            <p className={`text-[11px] font-bold uppercase tracking-wider ${textSub}`}>
              Total Credit Issued
            </p>
            <h3 className={`text-2xl font-black mt-1 tracking-tight ${textTitle}`}>
              {formatTZS(totalLoanGross)}
            </h3>
            <div className="flex items-center gap-1.5 mt-2">
              <span className={`text-[11px] font-medium ${textSub}`}>
                Across <strong>{loanData.length}</strong> total issued agreements
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Visuals Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Aging Breakdown Bar Chart */}
        <div className={`lg:col-span-8 p-6 rounded-3xl border shadow-sm ${cardBg} ${borderColor}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-500" />
                <h3 className={`text-base font-extrabold ${textTitle}`}>
                  Aging Breakdown of Unpaid Debt
                </h3>
              </div>
              <p className={`text-xs mt-0.5 ${textSub}`}>
                Classification of active credit receivables by delinquency duration.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-xl text-xs font-bold border ${isDark ? 'bg-slate-800/80 border-slate-700 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
                {formatTZS(totalOutstanding)} Total
              </span>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={agingData} margin={{ top: 15, right: 10, left: -15, bottom: 5 }}>
                <defs>
                  <linearGradient id="currentGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.75} />
                  </linearGradient>
                  <linearGradient id="warningGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#d97706" stopOpacity={0.75} />
                  </linearGradient>
                  <linearGradient id="lateGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f97316" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#ea580c" stopOpacity={0.75} />
                  </linearGradient>
                  <linearGradient id="criticalGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#dc2626" stopOpacity={0.75} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke={axisColor} 
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: gridStroke }}
                />
                <YAxis 
                  stroke={axisColor} 
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => {
                    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
                    if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
                    return `${val}`;
                  }} 
                />
                <Tooltip 
                  cursor={{ fill: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }}
                  formatter={(val: number, name: string, item: any) => [
                    `${formatTZS(val)} (${item.payload.count || 0} debtors)`,
                    'Outstanding'
                  ]}
                  contentStyle={{
                    backgroundColor: isDark ? '#0f172a' : '#ffffff',
                    borderColor: isDark ? '#334155' : '#e2e8f0',
                    borderRadius: '1rem',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.25)',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: isDark ? '#f8fafc' : '#0f172a',
                    padding: '8px 12px'
                  }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={56}>
                  {agingData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={`url(#${entry.gradientId})`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Aging Legend Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-4 mt-2 border-t border-slate-100 dark:border-slate-800">
            {agingData.map((b, i) => (
              <div key={i} className={`p-2.5 rounded-xl ${subCardBg} border ${borderColor} flex flex-col justify-between`}>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: b.color }} />
                  <span className={`text-[10px] font-semibold truncate ${textSub}`}>{b.name}</span>
                </div>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className={`text-xs font-black ${textTitle}`}>{formatTZS(b.value)}</span>
                  <span className="text-[10px] font-bold text-slate-400">{b.count} accounts</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Portfolio Status Distribution (Donut Chart) */}
        <div className={`lg:col-span-4 p-6 rounded-3xl border shadow-sm ${cardBg} ${borderColor} flex flex-col justify-between`}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <PieChartIcon className="w-4 h-4 text-purple-500" />
              <h3 className={`text-base font-extrabold ${textTitle}`}>Portfolio Health</h3>
            </div>
            <p className={`text-xs ${textSub}`}>Status distribution of all loan contracts</p>

            {portfolioDistribution.length > 0 ? (
              <div className="h-52 w-full mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={portfolioDistribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={78}
                      paddingAngle={4}
                      stroke={isDark ? '#0f172a' : '#ffffff'}
                      strokeWidth={2}
                    >
                      {portfolioDistribution.map((entry, index) => (
                        <Cell key={`slice-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(val: number, name: string, item: any) => [
                        `${val} contracts (${item.payload.pct}%)`, 
                        'Status'
                      ]}
                      contentStyle={{
                        backgroundColor: isDark ? '#0f172a' : '#ffffff',
                        borderColor: isDark ? '#334155' : '#e2e8f0',
                        borderRadius: '0.75rem',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: isDark ? '#ffffff' : '#0f172a'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-52 flex flex-col items-center justify-center text-xs opacity-50 space-y-1">
                <CreditCard className="w-6 h-6 stroke-[1.5]" />
                <span>No credit contracts issued yet</span>
              </div>
            )}
          </div>

          <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            {portfolioDistribution.map((item, idx) => (
              <div key={idx} className={`p-2 rounded-xl flex items-center justify-between text-xs ${subCardBg}`}>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className={`font-semibold ${textSub}`}>{item.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`font-black ${textTitle}`}>{item.value}</span>
                  <span className="text-[10px] font-bold text-slate-400">({item.pct}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top High-Balance Unsettled Debtors Table */}
      <div className={`p-6 rounded-3xl border shadow-sm ${cardBg} ${borderColor}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              <h3 className={`text-base font-extrabold ${textTitle}`}>Top Outstanding Debtors</h3>
            </div>
            <p className={`text-xs mt-0.5 ${textSub}`}>
              Prioritized list of active debtor accounts by unpaid balance for collection follow-ups.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search debtor..."
                value={searchDebtor}
                onChange={(e) => setSearchDebtor(e.target.value)}
                className={`pl-8 pr-3 py-1.5 rounded-xl border text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 focus:outline-none ${
                  isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              />
            </div>

            {onGoToLoans && (
              <button
                onClick={onGoToLoans}
                className="text-xs font-bold text-blue-500 hover:text-blue-400 flex items-center gap-1 transition-colors shrink-0"
              >
                <span>All Loans ({activeDebtors})</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {topDebtors.length === 0 ? (
          <div className={`text-center py-12 rounded-2xl border ${borderColor} ${subCardBg}`}>
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
            <h4 className={`text-sm font-bold ${textTitle}`}>
              {searchDebtor ? 'No debtors match your search query' : 'All Accounts Fully Settled'}
            </h4>
            <p className={`text-xs mt-1 ${textSub}`}>
              {searchDebtor ? 'Try typing a different name or phone number.' : 'There are no outstanding credit balances requiring collection.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead
                className={`uppercase text-[10px] font-black tracking-wider border-b ${
                  isDark
                    ? 'bg-slate-800/60 text-slate-400 border-slate-800'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                <tr>
                  <th className="p-3.5 rounded-l-xl">Debtor / Customer</th>
                  <th className="p-3.5">Contact Phone</th>
                  <th className="p-3.5">Due Date</th>
                  <th className="p-3.5 text-right">Total Agreement</th>
                  <th className="p-3.5 text-right">Unpaid Debt</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-right rounded-r-xl">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {topDebtors.map((tx) => {
                  const meta = loanMetaMap.get(tx.id) || computeLoanMeta(tx);
                  const now = new Date().getTime();
                  const dueDateObj = meta.dueDate ? new Date(meta.dueDate) : null;
                  const isOverdue = meta.isOverdue;
                  const diffDays = dueDateObj ? Math.ceil((dueDateObj.getTime() - now) / (1000 * 60 * 60 * 24)) : null;
                  const customerPhone = getLoanCustomerPhone(tx);
                  const customerName = getLoanCustomerName(tx);

                  return (
                    <tr
                      key={tx.id}
                      className={`transition-colors ${
                        isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="p-3.5 font-bold">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            isOverdue ? 'bg-rose-500/10 text-rose-500' : 'bg-blue-500/10 text-blue-500'
                          }`}>
                            {customerName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className={textTitle}>{customerName}</div>
                            <div className={`text-[10px] font-mono ${textSub}`}>{tx.receiptNumber || tx.id}</div>
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5 font-medium">
                        {customerPhone ? (
                          <a
                            href={`tel:${customerPhone}`}
                            className="inline-flex items-center gap-1.5 text-blue-500 hover:underline"
                          >
                            <Phone className="w-3 h-3" />
                            <span>{customerPhone}</span>
                          </a>
                        ) : (
                          <span className="text-slate-400 italic">No phone on record</span>
                        )}
                      </td>

                      <td className="p-3.5 font-medium">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <div>
                            <span className={isOverdue ? 'text-rose-500 font-bold' : textTitle}>
                              {meta.dueDate || 'Not set'}
                            </span>
                            {diffDays !== null && (
                              <div className={`text-[10px] font-semibold ${
                                isOverdue ? 'text-rose-500' : diffDays <= 7 ? 'text-amber-500' : 'text-slate-400'
                              }`}>
                                {isOverdue ? `${Math.abs(diffDays)} days overdue` : `${diffDays} days left`}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5 text-right font-semibold text-slate-500 dark:text-slate-400">
                        {formatTZS(meta.total)}
                      </td>

                      <td className="p-3.5 text-right">
                        <div className="font-black text-amber-500 text-sm">
                          {formatTZS(meta.remainingBalance)}
                        </div>
                        {meta.initialDeposit > 0 ? (
                          <div className="text-[10px] text-emerald-500 font-medium">
                            Paid: {formatTZS(meta.initialDeposit + meta.repaymentsSum)}
                          </div>
                        ) : null}
                      </td>

                      <td className="p-3.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                            isOverdue
                              ? 'bg-rose-500/10 text-rose-500 border-rose-500/30'
                              : 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isOverdue ? 'bg-rose-500' : 'bg-amber-500'}`} />
                          {isOverdue ? 'Overdue' : 'Active'}
                        </span>
                      </td>

                      <td className="p-3.5 text-right">
                        {onGoToLoans && (
                          <button
                            onClick={onGoToLoans}
                            className="px-3 py-1.5 rounded-xl bg-blue-600/10 hover:bg-blue-600 text-blue-600 hover:text-white font-bold text-xs transition-all inline-flex items-center gap-1 shadow-sm"
                          >
                            <span>Manage</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
