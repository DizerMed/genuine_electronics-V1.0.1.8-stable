import React from 'react';
import { OverdueLoanItem, buildLoanNotificationCopy } from '../lib/loanOverdueWorker';
import { formatTZS } from '../types';
import { 
  AlertTriangle, X, DollarSign, MessageCircle, Phone, 
  Clock, ShieldAlert, Volume2, ArrowRight
} from 'lucide-react';

export interface LoanOverdueNotificationToastProps {
  overdueItem: OverdueLoanItem | null;
  onDismiss: () => void;
  onOpenRepay: (txId: string) => void;
  totalOverdueCount?: number;
}

export const LoanOverdueNotificationToast: React.FC<LoanOverdueNotificationToastProps> = ({
  overdueItem,
  onDismiss,
  onOpenRepay,
  totalOverdueCount = 1
}) => {
  if (!overdueItem) return null;

  const copy = buildLoanNotificationCopy(overdueItem);
  const cleanPhone = (overdueItem.customerPhone || '').replace(/[^0-9+]/g, '');

  return (
    <div 
      className="fixed bottom-5 right-5 z-[9999] max-w-md w-full animate-in slide-in-from-bottom-5 fade-in duration-300 pointer-events-auto"
      role="alert"
    >
      <div className="bg-slate-900 border-2 border-rose-500 text-white rounded-2xl shadow-2xl shadow-rose-950/60 p-4 space-y-3 relative overflow-hidden">
        
        {/* Glow accent behind toast */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-rose-600/20 rounded-full blur-2xl pointer-events-none" />

        {/* Header with Title & Close button */}
        <div className="flex items-start justify-between gap-2 relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0 animate-pulse">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-black text-xs uppercase tracking-tight text-rose-400">
                  Unpaid Loan Reminder (Time Exceeded)
                </h4>
                {totalOverdueCount > 1 && (
                  <span className="text-[9px] font-black bg-rose-500 text-white px-1.5 py-0.2 rounded-full">
                    +{totalOverdueCount - 1} more
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400">
                Automated credit compliance scanner notification
              </p>
            </div>
          </div>

          <button
            onClick={onDismiss}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            title="Dismiss Alert"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Core Message Body matching user specifications */}
        <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/80 space-y-1.5 relative z-10 text-xs">
          <p className="text-slate-200 leading-relaxed font-medium">
            There is an unpaid amount of{' '}
            <strong className="text-amber-400 font-black text-sm">
              {formatTZS(overdueItem.remainingBalance)}
            </strong>{' '}
            for <strong className="text-white font-bold">{overdueItem.productSummary}</strong> by{' '}
            <strong className="text-blue-300 font-bold">{overdueItem.customerName}</strong> since{' '}
            <span className="font-mono text-slate-300 font-semibold">{overdueItem.dueDateTimeStr}</span>.
          </p>

          <div className="flex items-center justify-between text-[10px] text-rose-400 font-bold pt-1 border-t border-slate-700/60">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>Time limit has exceeded ({overdueItem.overdueDurationText})</span>
            </span>
            <span className="font-mono text-slate-400">#{overdueItem.receiptNumber}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 pt-1 relative z-10">
          <button
            onClick={() => {
              onOpenRepay(overdueItem.id);
              onDismiss();
            }}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Repay / Settle Loan</span>
          </button>

          {cleanPhone && (
            <a
              href={`https://wa.me/${cleanPhone.replace(/[^0-9]/g, '')}?text=${copy.whatsappMessage}`}
              target="_blank"
              rel="noreferrer"
              title="Send WhatsApp Notice"
              className="bg-slate-800 hover:bg-slate-700 active:scale-95 text-emerald-400 border border-slate-700 font-bold p-2 rounded-xl text-xs flex items-center justify-center transition-all cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
            </a>
          )}

          {cleanPhone && (
            <a
              href={`tel:${cleanPhone}`}
              title="Call Borrower"
              className="bg-slate-800 hover:bg-slate-700 active:scale-95 text-blue-400 border border-slate-700 font-bold p-2 rounded-xl text-xs flex items-center justify-center transition-all cursor-pointer"
            >
              <Phone className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
