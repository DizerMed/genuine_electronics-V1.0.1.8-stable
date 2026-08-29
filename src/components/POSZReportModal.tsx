import React, { useState, useRef } from 'react';
import { POSTransaction, StoreSettings, formatTZS, formatToGMT3 } from '../types';
import { Printer, Download, X, Calendar, DollarSign, CreditCard, Smartphone, CheckCircle, FileText, ArrowDownRight } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

interface POSZReportModalProps {
  transactions: POSTransaction[];
  storeSettings?: StoreSettings;
  cashierName?: string;
  onClose: () => void;
}

export const POSZReportModal: React.FC<POSZReportModalProps> = ({
  transactions,
  storeSettings,
  cashierName,
  onClose,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  });
  const [openingCash, setOpeningCash] = useState<number>(50000);
  const [actualClosingCash, setActualClosingCash] = useState<number>(0);
  const reportRef = useRef<HTMLDivElement>(null);

  // Filter transactions for selected date
  const filteredTransactions = transactions.filter((t) => {
    if (!t.createdAt) return false;
    const tDate = t.createdAt.split('T')[0];
    return tDate === selectedDate && t.status !== 'Refunded';
  });

  // Financial calculations
  const totalSales = filteredTransactions.reduce((sum, t) => sum + (t.total || t.totalAmount || 0), 0);
  const totalDiscount = filteredTransactions.reduce((sum, t) => sum + (t.discount || 0), 0);
  const totalVat = filteredTransactions.reduce((sum, t) => sum + (t.tax || 0), 0);
  const totalNetSubtotal = filteredTransactions.reduce((sum, t) => sum + (t.subtotal || 0), 0);
  const totalItemsSold = filteredTransactions.reduce(
    (sum, t) => sum + (t.items || []).reduce((itemSum, item) => itemSum + Number(item.quantity || 1), 0),
    0
  );

  // Breakdown by payment method
  const paymentBreakdown: Record<string, { count: number; total: number }> = {};
  filteredTransactions.forEach((t) => {
    const method = t.paymentMethod || 'Cash';
    if (!paymentBreakdown[method]) {
      paymentBreakdown[method] = { count: 0, total: 0 };
    }
    paymentBreakdown[method].count += 1;
    paymentBreakdown[method].total += (t.total || t.totalAmount || 0);

    // Also account for split payments if present
    if (t.splitPayments && t.splitPayments.length > 0) {
      t.splitPayments.forEach((sp) => {
        const spMethod = sp.method || 'Cash';
        if (!paymentBreakdown[spMethod]) {
          paymentBreakdown[spMethod] = { count: 0, total: 0 };
        }
      });
    }
  });

  const cashCollected = paymentBreakdown['Cash']?.total || 0;
  const expectedClosingCash = openingCash + cashCollected;
  const cashDiscrepancy = actualClosingCash > 0 ? actualClosingCash - expectedClosingCash : 0;

  const handlePrint = () => {
    triggerHaptic('medium');
    window.print();
  };

  const activeVatPct = storeSettings?.vatPercentage ?? 18;

  const handleExportCSV = () => {
    triggerHaptic('light');
    const headers = ['Receipt No', 'Date Time (EAT)', 'Cashier', 'Customer Name', 'Customer TIN', 'Payment Method', 'Items Count', 'Subtotal (Net)', `VAT ${activeVatPct}%`, 'Total Amount'];
    const rows = filteredTransactions.map((t) => [
      `"${t.id || t.receiptNumber || ''}"`,
      `"${formatToGMT3(t.createdAt)}"`,
      `"${t.cashierName || ''}"`,
      `"${t.customerName || 'Walk-in'}"`,
      `"${t.customerTin || ''}"`,
      `"${t.paymentMethod || 'Cash'}"`,
      (t.items || []).reduce((acc, i) => acc + Number(i.quantity || 1), 0),
      t.subtotal || 0,
      t.tax || 0,
      t.total || t.totalAmount || 0,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Z_REPORT_${selectedDate}_${(storeSettings?.storeName || 'GENUINE').replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="z-report-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8">
        {/* Header toolbar */}
        <div className="flex items-center justify-between p-4 bg-slate-900 text-white border-b border-slate-800 no-print">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-base tracking-wide">POS Z-Report (Daily Register Closure)</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              id="z-report-export-csv-btn"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors border border-slate-700"
              title="Download accounting CSV"
            >
              <Download className="w-3.5 h-3.5" />
              CSV Export
            </button>
            <button
              id="z-report-print-btn"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition-colors shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Z-Report
            </button>
            <button
              id="z-report-close-btn"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Date Selector & Drawer Configuration */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700/50 no-print flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">Report Date:</span>
            <input
              id="z-report-date-picker"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Opening Float:</span>
            <input
              id="z-report-opening-float"
              type="number"
              value={openingCash}
              onChange={(e) => setOpeningCash(Math.max(0, Number(e.target.value) || 0))}
              placeholder="50,000"
              className="w-24 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-right font-semibold text-slate-800 dark:text-slate-200"
            />
            <span className="text-slate-400">TZS</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Physical Cash Count:</span>
            <input
              id="z-report-closing-cash-count"
              type="number"
              value={actualClosingCash || ''}
              onChange={(e) => setActualClosingCash(Math.max(0, Number(e.target.value) || 0))}
              placeholder="Count in drawer"
              className="w-28 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-right font-semibold text-slate-800 dark:text-slate-200"
            />
            <span className="text-slate-400">TZS</span>
          </div>
        </div>

        {/* Printable Report Content (Thermal Monospace Friendly) */}
        <div className="p-6 overflow-y-auto max-h-[70vh] bg-white text-black font-mono">
          <div ref={reportRef} className="max-w-[480px] mx-auto p-4 border-2 border-black space-y-3 text-xs leading-relaxed">
            {/* Store Banner */}
            <div className="text-center pb-2 border-b-2 border-black space-y-0.5">
              <h2 className="font-black text-base uppercase tracking-wider">{storeSettings?.storeName || 'GENUINE ELECTRONICS'}</h2>
              <p className="font-bold text-[11px]">END OF DAY REGISTER CLOSURE (Z-REPORT)</p>
              <p className="text-[10px] font-bold">{storeSettings?.address || 'Kariakoo, Dar es Salaam'}</p>
              <p className="text-[10px] font-black">TIN: {storeSettings?.tin || '104-982-371'}</p>
            </div>

            {/* Shift & Time Details */}
            <div className="py-1 border-b border-black text-[11px] font-bold space-y-0.5">
              <div className="flex justify-between">
                <span>DATE:</span>
                <span className="font-black">{selectedDate}</span>
              </div>
              <div className="flex justify-between">
                <span>GENERATED AT:</span>
                <span className="font-black">{formatToGMT3(new Date().toISOString())}</span>
              </div>
              <div className="flex justify-between">
                <span>CASHIER / OPERATOR:</span>
                <span className="font-black">{cashierName || 'Primary Cashier'}</span>
              </div>
              <div className="flex justify-between">
                <span>TOTAL TRANSACTIONS:</span>
                <span className="font-black">{filteredTransactions.length}</span>
              </div>
              <div className="flex justify-between">
                <span>ITEMS SOLD:</span>
                <span className="font-black">{totalItemsSold} units</span>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="py-1 border-b-2 border-black text-[11px] font-bold space-y-1">
              <p className="font-black uppercase tracking-wider text-[11px] border-b border-dashed border-black pb-0.5">SALES REVENUE SUMMARY</p>
              <div className="flex justify-between">
                <span>GROSS SALES:</span>
                <span className="font-black">{formatTZS(totalSales + totalDiscount)}</span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex justify-between text-black">
                  <span>TOTAL DISCOUNTS GIVEN:</span>
                  <span className="font-black">-{formatTZS(totalDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>NET SALES (EXCL. VAT):</span>
                <span className="font-black">{formatTZS(totalNetSubtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>VAT COLLECTED ({activeVatPct}%):</span>
                <span className="font-black">{formatTZS(totalVat)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t-2 border-black font-black text-sm bg-black/5 px-1">
                <span>TOTAL REVENUE (Z-TOTAL):</span>
                <span>{formatTZS(totalSales)}</span>
              </div>
            </div>

            {/* Payment Method Breakdown */}
            <div className="py-1 border-b-2 border-black text-[11px] font-bold space-y-1">
              <p className="font-black uppercase tracking-wider text-[11px] border-b border-dashed border-black pb-0.5">TENDER TYPE BREAKDOWN</p>
              {Object.keys(paymentBreakdown).length === 0 ? (
                <p className="text-center py-2 italic">No sales recorded on this date.</p>
              ) : (
                Object.entries(paymentBreakdown).map(([method, data]) => (
                  <div key={method} className="flex justify-between">
                    <span>{method.toUpperCase()} ({data.count}x):</span>
                    <span className="font-black">{formatTZS(data.total)}</span>
                  </div>
                ))
              )}
            </div>

            {/* Cash Drawer Reconciliation */}
            <div className="py-1 border-b-2 border-black text-[11px] font-bold space-y-1 bg-amber-50/50 p-2">
              <p className="font-black uppercase tracking-wider text-[11px]">CASH DRAWER RECONCILIATION</p>
              <div className="flex justify-between">
                <span>(+) OPENING FLOAT:</span>
                <span className="font-black">{formatTZS(openingCash)}</span>
              </div>
              <div className="flex justify-between">
                <span>(+) CASH SALES COLLECTED:</span>
                <span className="font-black">{formatTZS(cashCollected)}</span>
              </div>
              <div className="flex justify-between border-t border-black pt-0.5 font-black">
                <span>(=) EXPECTED CASH IN DRAWER:</span>
                <span className="font-black">{formatTZS(expectedClosingCash)}</span>
              </div>
              {actualClosingCash > 0 && (
                <>
                  <div className="flex justify-between">
                    <span>PHYSICAL CASH COUNT:</span>
                    <span className="font-black">{formatTZS(actualClosingCash)}</span>
                  </div>
                  <div className={`flex justify-between font-black border-t border-black pt-0.5 ${cashDiscrepancy === 0 ? 'text-green-800' : cashDiscrepancy < 0 ? 'text-red-800' : 'text-blue-800'}`}>
                    <span>VARIANCE / DISCREPANCY:</span>
                    <span>{cashDiscrepancy >= 0 ? `+${formatTZS(cashDiscrepancy)}` : `-${formatTZS(Math.abs(cashDiscrepancy))}`}</span>
                  </div>
                </>
              )}
            </div>

            {/* Signature / Auditor Section */}
            <div className="pt-4 pb-2 text-[10px] font-bold space-y-4">
              <div className="flex justify-between pt-2">
                <div className="text-center w-1/2 border-t border-black pt-1">
                  <p>Cashier Signature</p>
                </div>
                <div className="text-center w-1/2 border-t border-black pt-1 ml-4">
                  <p>Manager Verification</p>
                </div>
              </div>
              <p className="text-center font-black tracking-widest text-[9px] uppercase">
                *** END OF Z-REPORT • OFFICIAL RECORD ***
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
