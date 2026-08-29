import React from 'react';
import { formatTZS, Product } from '../types';
import { ShoppingCart, CheckCircle, X, CreditCard, User, AlertTriangle, Printer, Banknote, List, Divide } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { groupCartItemsByTaxStatus } from '../utils/taxUtils';

interface POSSalePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  cart: { product: Product; quantity: number; price?: number }[];
  total: number;
  subtotal: number;
  discount: number;
  tax: number;
  paymentMethod: string;
  isSplitMode: boolean;
  splitPayments: { method: string; amount: number }[];
  tenderedAmount: number;
  changeAmount: number;
  customerName: string;
  customerPhone: string;
  isLoan: boolean;
  loanDownPayment: number;
  isDark: boolean;
  getPosItemUnitPrice: (item: any) => number;
}

export const POSSalePreviewModal: React.FC<POSSalePreviewModalProps> = ({
  isOpen, onClose, onConfirm, cart, total, subtotal, discount, tax, paymentMethod, isSplitMode,
  splitPayments, tenderedAmount, changeAmount, customerName, customerPhone, isLoan, loanDownPayment,
  isDark, getPosItemUnitPrice
}) => {
  if (!isOpen) return null;

  const taxAnalysis = groupCartItemsByTaxStatus(cart, {
    discount,
    includeVat: tax > 0,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm sm:p-6 animate-in fade-in duration-200">
      <div className={`relative w-full max-w-xl mx-auto rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden ${isDark ? 'bg-slate-900 text-white border border-slate-800' : 'bg-white text-slate-900'}`}>
        
        {/* Header */}
        <div className={`shrink-0 px-6 py-4 flex items-center justify-between border-b ${isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Review Sale Details</h2>
              <p className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Verify before completing transaction</p>
            </div>
          </div>
          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-200 text-slate-500'}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
          
          {/* Customer & Payment Mode */}
          <div className="grid grid-cols-2 gap-4">
            <div className={`p-4 rounded-2xl border ${isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-slate-50'}`}>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase mb-2">
                <User className="w-3.5 h-3.5" /> Customer Info
              </div>
              <div className="font-bold truncate">{customerName || 'Walk-in Customer'}</div>
              {customerPhone && <div className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{customerPhone}</div>}
            </div>
            <div className={`p-4 rounded-2xl border ${isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-slate-50'}`}>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase mb-2">
                <CreditCard className="w-3.5 h-3.5" /> Payment Method
              </div>
              <div className="font-bold truncate">{isSplitMode ? 'Split Payment' : paymentMethod}</div>
              {isSplitMode && (
                <div className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {splitPayments.filter(p => p.amount > 0).map(p => p.method.split(' ')[0]).join(' + ')}
                </div>
              )}
            </div>
          </div>

          {/* Cart Items */}
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase mb-3">
              <ShoppingCart className="w-4 h-4" /> Order Items ({cart.length})
            </div>
            <div className={`rounded-2xl border overflow-hidden ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              {cart.map((item, idx) => {
                const isVatItem = item.product?.isVatInclusive !== false;
                return (
                  <div key={idx} className={`p-3 flex items-center justify-between text-sm ${idx !== cart.length - 1 ? (isDark ? 'border-b border-slate-800' : 'border-b border-slate-200') : ''}`}>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{item.product.name}</span>
                        {isVatItem ? (
                          <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                            VAT Incl.
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 bg-slate-500/10 px-1.5 py-0.2 rounded border border-slate-500/20">
                            Non-VAT
                          </span>
                        )}
                      </div>
                      <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{item.quantity}x @ {formatTZS(getPosItemUnitPrice(item))}</span>
                    </div>
                    <span className="font-black">{formatTZS(getPosItemUnitPrice(item) * item.quantity)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Financial Breakdown */}
          <div className={`p-5 rounded-2xl border space-y-3 ${isDark ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-slate-100/50'}`}>
            {taxAnalysis.isMixed && tax > 0 ? (
              <>
                <div className="flex justify-between text-sm">
                  <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>1. Taxable Subtotal (Net)</span>
                  <span className="font-bold">{formatTZS(taxAnalysis.taxableNetSubtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>2. Non-VAT / Exempt Subtotal</span>
                  <span className="font-bold">{formatTZS(taxAnalysis.exemptSubtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>TRA VAT (On Taxable Items)</span>
                  <span className="font-bold">{formatTZS(tax)}</span>
                </div>
                <div className={`pt-2 border-t border-dashed flex justify-between text-xs font-semibold ${isDark ? 'border-slate-800 text-slate-400' : 'border-slate-300 text-slate-600'}`}>
                  <span>Combined Net Subtotal</span>
                  <span>{formatTZS(taxAnalysis.netSubtotal)}</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between text-sm">
                  <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                    {tax > 0 ? 'Subtotal (Excl. Tax)' : 'Subtotal'}
                  </span>
                  <span className="font-bold">{formatTZS(subtotal)}</span>
                </div>
                {tax > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>TRA VAT (Included)</span>
                    <span className="font-bold">{formatTZS(tax)}</span>
                  </div>
                )}
              </>
            )}
            {discount > 0 && (
              <div className="flex justify-between text-sm text-emerald-500">
                <span>Discount</span>
                <span className="font-bold">-{formatTZS(discount)}</span>
              </div>
            )}
            
            <div className={`pt-3 border-t flex justify-between items-center ${isDark ? 'border-slate-700' : 'border-slate-300'}`}>
              <span className="text-base font-black">Total Payable</span>
              <span className="text-xl font-black text-blue-500">{formatTZS(total)}</span>
            </div>
          </div>

          {/* Tendered & Loan Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className={`p-4 rounded-2xl border ${isDark ? 'border-slate-800 bg-emerald-500/10' : 'border-slate-200 bg-emerald-50'}`}>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-1">
                <Banknote className="w-3.5 h-3.5" /> Amount Received
              </div>
              <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                {formatTZS(isLoan ? loanDownPayment : tenderedAmount)}
              </div>
            </div>

            {isLoan ? (
              <div className={`p-4 rounded-2xl border ${isDark ? 'border-rose-900/30 bg-rose-500/5' : 'border-rose-200 bg-rose-50'}`}>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase mb-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Loan Balance
                </div>
                <div className="text-lg font-black text-rose-600 dark:text-rose-400">
                  {formatTZS(Math.max(0, total - loanDownPayment))}
                </div>
              </div>
            ) : changeAmount > 0 ? (
              <div className={`p-4 rounded-2xl border ${isDark ? 'border-amber-900/30 bg-amber-500/5' : 'border-amber-200 bg-amber-50'}`}>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase mb-1">
                  <Divide className="w-3.5 h-3.5" /> Change Due
                </div>
                <div className="text-lg font-black text-amber-600 dark:text-amber-400">
                  {formatTZS(changeAmount)}
                </div>
              </div>
            ) : (
              <div className={`p-4 rounded-2xl border opacity-50 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Change Due
                </div>
                <div className="text-lg font-black text-slate-500">
                  {formatTZS(0)}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Footer Actions */}
        <div className={`shrink-0 p-5 border-t grid grid-cols-2 gap-3 ${isDark ? 'border-slate-800 bg-slate-900/80' : 'border-slate-100 bg-white'}`}>
          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className={`py-3.5 rounded-xl font-bold text-sm transition-all ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-900'}`}
          >
            Cancel & Edit
          </button>
          
          <button
            onClick={() => {
              triggerHaptic('success');
              onConfirm();
              onClose();
            }}
            className="py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <Printer className="w-4 h-4" />
            <span>Confirm & Checkout</span>
          </button>
        </div>
      </div>
    </div>
  );
};
