import React, { useState } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Clock, 
  Calendar, 
  ChevronDown, 
  ChevronUp, 
  Wrench, 
  MessageCircle, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';
import { OrderItem, StoreSettings } from '../types';
import { calculateWarrantyStatus, WarrantyStatus } from '../utils/warranty';
import { triggerHaptic } from '../utils/haptics';

interface OrderWarrantySectionProps {
  items: OrderItem[];
  purchaseDate: string;
  orderId: string;
  customerName?: string;
  storeSettings?: StoreSettings;
  defaultExpanded?: boolean;
}

export const OrderWarrantySection: React.FC<OrderWarrantySectionProps> = ({
  items,
  purchaseDate,
  orderId,
  customerName,
  storeSettings,
  defaultExpanded = false
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (!items || items.length === 0) return null;

  // Calculate warranty for each item
  const itemWarranties = items.map((it) => ({
    item: it,
    status: calculateWarrantyStatus(purchaseDate, it.product?.warranty)
  }));

  // Overall summary for this order
  const allExpired = itemWarranties.every((w) => w.status.isExpired);
  const anyExpiringSoon = itemWarranties.some((w) => w.status.isExpiringSoon);
  const activeCount = itemWarranties.filter((w) => !w.status.isExpired).length;

  const handleClaimWarranty = (item: OrderItem, status: WarrantyStatus) => {
    triggerHaptic('light');
    const storePhone = (storeSettings?.phone || '255777000000').replace(/[^0-9+]/g, '');
    let cleanPhone = storePhone;
    if (cleanPhone.startsWith('0')) cleanPhone = '255' + cleanPhone.slice(1);
    if (cleanPhone.startsWith('+')) cleanPhone = cleanPhone.slice(1);

    const message = 
      `*🛡️ GENUINE ELECTRONICS WARRANTY SERVICE CLAIM*\n` +
      `----------------------------------------\n` +
      `🆔 *Order ID:* ${orderId}\n` +
      `👤 *Customer:* ${customerName || 'Valued Customer'}\n` +
      `📦 *Product:* ${item.product?.name}\n` +
      `🏷️ *SKU / Model:* ${item.product?.sku || 'N/A'}\n` +
      `📅 *Purchase Date:* ${status.purchaseDateFormatted}\n` +
      `⏳ *Warranty Term:* ${status.term}\n` +
      `🛡️ *Warranty Expiry:* ${status.expiryDateFormatted}\n` +
      `📊 *Current Status:* ${status.statusLabel} (${status.remainingText})\n` +
      `----------------------------------------\n` +
      `Hello, I would like to request technical support or warranty assistance for this item.`;

    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/40 dark:bg-blue-950/20 overflow-hidden text-xs transition-all">
      {/* Header / Summary Bar */}
      <button
        type="button"
        onClick={() => {
          triggerHaptic('light');
          setIsExpanded(!isExpanded);
        }}
        className="w-full px-3.5 py-2.5 flex items-center justify-between gap-3 text-left hover:bg-blue-100/50 dark:hover:bg-blue-900/30 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className={`p-1.5 rounded-lg shrink-0 ${
            allExpired 
              ? 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400' 
              : anyExpiringSoon 
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300' 
                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300'
          }`}>
            {allExpired ? <ShieldAlert className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
          </div>
          <div className="min-w-0">
            <span className="font-extrabold text-slate-800 dark:text-slate-200">
              Warranty Protection & Coverage
            </span>
            <span className="ml-2 text-[11px] text-slate-500 dark:text-slate-400">
              ({activeCount} of {items.length} active)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {allExpired ? (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              Expired
            </span>
          ) : anyExpiringSoon ? (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-200 text-amber-800 dark:bg-amber-900/80 dark:text-amber-200 animate-pulse">
              Expiring Soon
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800">
              ✓ Active Coverage
            </span>
          )}
          {isExpanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          )}
        </div>
      </button>

      {/* Expanded Breakdown */}
      {isExpanded && (
        <div className="p-3 pt-1 space-y-2.5 border-t border-blue-100 dark:border-blue-900/30">
          {itemWarranties.map(({ item, status }, index) => {
            const statusBadgeClasses = status.isExpired
              ? 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
              : status.isExpiringSoon
                ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700'
                : 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800';

            const progressBarColor = status.isExpired
              ? 'bg-slate-400'
              : status.isExpiringSoon
                ? 'bg-amber-500'
                : 'bg-emerald-500';

            return (
              <div 
                key={index} 
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 space-y-2.5 shadow-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={item.product?.image || 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=200'}
                      alt={item.product?.name || 'Product'}
                      className="w-9 h-9 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 dark:text-white truncate">
                        {item.product?.name}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Term: <span className="font-medium text-slate-600 dark:text-slate-300">{status.term}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 self-start sm:self-auto shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${statusBadgeClasses}`}>
                      {status.statusLabel}
                    </span>
                  </div>
                </div>

                {/* Dates & Countdown */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-[11px]">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 flex items-center gap-1">
                      <Calendar className="w-2.5 h-2.5" /> Purchase Date
                    </span>
                    <p className="font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                      {status.purchaseDateFormatted}
                    </p>
                  </div>

                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 flex items-center gap-1">
                      <ShieldCheck className="w-2.5 h-2.5 text-blue-500" /> Expiration Date
                    </span>
                    <p className={`font-bold mt-0.5 ${status.isExpired ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>
                      {status.expiryDateFormatted}
                    </p>
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-[9px] uppercase font-bold text-slate-400 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5 text-indigo-500" /> Remaining Time
                    </span>
                    <p className={`font-extrabold mt-0.5 ${
                      status.isExpired 
                        ? 'text-slate-400' 
                        : status.isExpiringSoon 
                          ? 'text-amber-600 dark:text-amber-400' 
                          : 'text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {status.remainingText}
                    </p>
                  </div>
                </div>

                {/* Progress bar of remaining warranty life */}
                {!status.isExpired && (
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px] text-slate-400">
                      <span>Warranty Lifespan</span>
                      <span className="font-bold text-slate-600 dark:text-slate-300">
                        {status.progressPercent}% coverage remaining
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 rounded-full ${progressBarColor}`}
                        style={{ width: `${status.progressPercent}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Claim Service / Support button */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1 text-[10px] text-slate-400">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                    <span>Official Manufacturer Guarantee</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleClaimWarranty(item, status)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1 shadow-xs transition-all active:scale-95"
                    title="Open WhatsApp warranty service request"
                  >
                    <MessageCircle className="w-3 h-3" />
                    <span>Claim Service</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
