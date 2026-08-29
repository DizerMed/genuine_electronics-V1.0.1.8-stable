import React, { useState, useMemo, useRef } from 'react';
import { toCanvas } from 'html-to-image';
import { QRCodeSVG } from 'qrcode.react';
import { buildReceiptVerificationUrl } from '../services/receiptQrService';
import { POSTransaction, Order, LoanRepayment, formatTZS, formatToGMT3, StoreSettings } from '../types';
import { 
  getLoanCustomerName, 
  getLoanCustomerPhone, 
  getLoanDueDate, 
  getLoanNationalId, 
  getLoanGuarantor, 
  isLoanTransaction, 
  computeLoanMeta 
} from '../utils/loanUtils';
import { 
  Banknote, Search, Filter, Calendar, Phone, MessageCircle, 
  Printer, CheckCircle2, AlertTriangle, Clock, ArrowUpRight, 
  Plus, Download, DollarSign, User, ShieldCheck, ChevronRight,
  TrendingUp, RefreshCw, X, CreditCard, Check, SlidersHorizontal,
  Edit, Sparkles, FileSpreadsheet, Send, CalendarClock, Activity, Globe, Store,
  Flame, Zap, AlertCircle, PieChart, ListFilter, ArrowUpDown, Stamp, Split
} from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { formatTzPhone } from '../utils/phoneFormat';

export type LoanStatusFilter = 'all' | 'overdue' | 'partial' | 'unpaid' | 'active' | 'paid';
export type LoanPriorityPreset = 'all' | 'overdue' | 'due_today' | 'due_soon' | 'high_balance';

interface LoanTrackerProps {
  posTransactions: POSTransaction[];
  orders?: Order[];
  onUpdateLoanTransaction?: (updated: POSTransaction) => Promise<any> | void;
  onUpdateOrder?: (updated: Order) => Promise<any> | void;
  onDeletePOSTransaction?: (id: string) => Promise<any> | void;
  onOpenPOSReceipt: (tx: POSTransaction) => void;
  onGoToPOSWithLoan: () => void;
  isDark: boolean;
  cardBg: string;
  inputBg: string;
  textTitle: string;
  textSub: string;
  showAlert: (title: string, msg: string, type: 'alert' | 'warning' | 'error') => void;
  activeCashierName?: string;
  storeSettings?: StoreSettings;
}

export const LoanTracker: React.FC<LoanTrackerProps> = ({
  posTransactions,
  orders = [],
  onUpdateLoanTransaction,
  onUpdateOrder,
  onOpenPOSReceipt,
  onGoToPOSWithLoan,
  isDark,
  cardBg,
  inputBg,
  textTitle,
  textSub,
  showAlert,
  activeCashierName = 'Admin',
  storeSettings
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<LoanStatusFilter>('all');
  const [priorityPreset, setPriorityPreset] = useState<LoanPriorityPreset>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'pos' | 'online'>('all');
  const [sortBy, setSortBy] = useState<'dueDate' | 'balance' | 'balanceAsc' | 'total' | 'progress' | 'newest' | 'name'>('dueDate');

  // WhatsApp Receipt Prompt Modal State
  const [whatsappPromptModal, setWhatsappPromptModal] = useState<{
    isOpen: boolean;
    tx: POSTransaction | null;
    rep: LoanRepayment | null;
    currentBal: number;
    phone: string;
  }>({
    isOpen: false,
    tx: null,
    rep: null,
    currentBal: 0,
    phone: ''
  });
  const [showLoanReceiptStamp, setShowLoanReceiptStamp] = useState<boolean>(true);

  // Repayment Modal State
  const [selectedLoanForRepayment, setSelectedLoanForRepayment] = useState<POSTransaction | null>(null);
  const [repayAmount, setRepayAmount] = useState<number>(0);
  const [repayMethod, setRepayMethod] = useState<string>('M-Pesa');
  const [repayNotes, setRepayNotes] = useState<string>('');
  const [isSubmittingRepayment, setIsSubmittingRepayment] = useState(false);
  const [isSplitRepay, setIsSplitRepay] = useState<boolean>(false);
  const [splitMethodA, setSplitMethodA] = useState<string>('Cash');
  const [splitAmountA, setSplitAmountA] = useState<number>(0);
  const [splitMethodB, setSplitMethodB] = useState<string>('M-Pesa');
  const [splitAmountB, setSplitAmountB] = useState<number>(0);

  // WhatsApp Reminder Modal State
  const [whatsappReminderModal, setWhatsappReminderModal] = useState<{
    isOpen: boolean;
    tx: POSTransaction | null;
    template: 'polite' | 'urgent' | 'today' | 'guarantor';
  }>({
    isOpen: false,
    tx: null,
    template: 'polite'
  });

  // Details / History Modal State
  const [selectedLoanForDetails, setSelectedLoanForDetails] = useState<POSTransaction | null>(null);

  // Extend Due Date Modal State
  const [loanForDateExtension, setLoanForDateExtension] = useState<POSTransaction | null>(null);
  const [newDueDate, setNewDueDate] = useState<string>('');

  // Edit Customer & Loan Details Modal State
  const [loanForEditCustomer, setLoanForEditCustomer] = useState<POSTransaction | null>(null);
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editCustomerPhone, setEditCustomerPhone] = useState('');
  const [editLoanNationalId, setEditLoanNationalId] = useState('');
  const [editLoanDueDate, setEditLoanDueDate] = useState('');
  const [editLoanGuarantorName, setEditLoanGuarantorName] = useState('');
  const [editLoanGuarantorPhone, setEditLoanGuarantorPhone] = useState('');
  const [editLoanNotes, setEditLoanNotes] = useState('');
  const [isSavingCustomerInfo, setIsSavingCustomerInfo] = useState(false);

  // Extract all loan / credit transactions from POS and Orders
  const allLoanTransactions = useMemo(() => {
    const posList: (POSTransaction & { _origin?: 'pos' | 'online' })[] = posTransactions
      .filter(tx => isLoanTransaction(tx))
      .map(tx => ({ ...tx, _origin: 'pos' as const }));

    const orderList: (POSTransaction & { _origin?: 'pos' | 'online'; _originalOrder?: Order })[] = (orders || [])
      .filter(ord => isLoanTransaction(ord as any))
      .map(ord => {
        const transformed: POSTransaction & { _origin?: 'pos' | 'online'; _originalOrder?: Order } = {
          id: ord.id,
          receiptNumber: ord.id,
          createdAt: ord.createdAt,
          cashierName: 'Online System',
          total: ord.totalAmount,
          subtotal: ord.totalAmount,
          paymentMethod: ord.paymentMethod || 'Online Order',
          status: 'Completed',
          priceTier: 'retail',
          items: (ord.items || []).map((it: any) => ({
            product: it.product || {
              id: it.productId || it.id || '',
              name: it.name,
              price: it.price,
              image: it.image
            },
            quantity: it.quantity || 1,
            unitPrice: it.price
          })),
          customerName: ord.customerName,
          customerPhone: ord.customerPhone,
          isLoan: Boolean(ord.isLoan || (ord.outstandingBalance && ord.outstandingBalance > 0) || ord.paymentStatus === 'Partial'),
          downPayment: ord.downPayment ?? (ord.paidAmount !== undefined && (!ord.loanRepayments || !ord.loanRepayments.length) ? ord.paidAmount : 0),
          paidAmount: ord.paidAmount,
          outstandingBalance: ord.outstandingBalance,
          loanBalance: ord.loanBalance ?? ord.outstandingBalance ?? Math.max(0, ord.totalAmount - (ord.paidAmount || 0)),
          loanDueDate: ord.loanDueDate,
          loanDueTime: ord.loanDueTime,
          loanDueDateTime: ord.loanDueDateTime,
          loanNationalId: ord.loanNationalId,
          loanGuarantorName: ord.loanGuarantorName,
          loanGuarantorPhone: ord.loanGuarantorPhone,
          loanStatus: ord.loanStatus || (ord.paymentStatus === 'Paid' ? 'paid' : (ord.outstandingBalance && ord.outstandingBalance > 0 ? 'unpaid' : 'unpaid')),
          loanRepayments: ord.loanRepayments || ord.partialPayments || [],
          _origin: 'online' as const,
          _originalOrder: ord
        };
        return transformed;
      });

    return [...posList, ...orderList];
  }, [posTransactions, orders]);

  const todayStr = useMemo(() => {
    return new Date().toISOString().split('T')[0];
  }, []);

  // Helper to compute effective balance and status
  const getLoanMeta = (tx: POSTransaction) => {
    const meta = computeLoanMeta(tx);
    return {
      total: meta.total,
      totalPaid: meta.totalPaid,
      remainingBalance: meta.remainingBalance,
      dueDate: meta.dueDate,
      isOverdue: meta.isOverdue,
      computedStatus: meta.computedStatus,
      progressPct: meta.total > 0 ? Math.min(100, Math.round((meta.totalPaid / meta.total) * 100)) : 100
    };
  };

  // Executive Metrics
  const metrics = useMemo(() => {
    let totalLoanedValue = 0;
    let totalDebtCollected = 0;
    let totalOutstandingDebt = 0;
    let overdueCount = 0;
    let overdueDebt = 0;
    let partialCount = 0;
    let partialDebt = 0;
    let unpaidCount = 0;
    let unpaidDebt = 0;
    let paidCount = 0;
    let dueTodayCount = 0;
    let dueSoonCount = 0;
    let highBalanceCount = 0;

    const todayDate = new Date(todayStr + 'T00:00:00');

    allLoanTransactions.forEach(tx => {
      const meta = getLoanMeta(tx);
      totalLoanedValue += meta.total;
      totalDebtCollected += meta.totalPaid;
      totalOutstandingDebt += meta.remainingBalance;

      if (meta.computedStatus === 'paid' || meta.remainingBalance <= 0) {
        paidCount++;
      } else {
        if (meta.isOverdue) {
          overdueCount++;
          overdueDebt += meta.remainingBalance;
        } else if (meta.totalPaid > 0) {
          partialCount++;
          partialDebt += meta.remainingBalance;
        } else {
          unpaidCount++;
          unpaidDebt += meta.remainingBalance;
        }

        // Check due dates for priority
        if (meta.dueDate) {
          const dueDateObj = new Date(meta.dueDate + 'T00:00:00');
          const diffDays = Math.ceil((dueDateObj.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays === 0) {
            dueTodayCount++;
          } else if (diffDays > 0 && diffDays <= 3) {
            dueSoonCount++;
          }
        }

        if (meta.remainingBalance >= 500000) {
          highBalanceCount++;
        }
      }
    });

    const activeCount = overdueCount + partialCount + unpaidCount;
    const activeDebt = totalOutstandingDebt;
    const recoveryRate = totalLoanedValue > 0 ? Math.round((totalDebtCollected / totalLoanedValue) * 100) : 0;

    return {
      totalLoansCount: allLoanTransactions.length,
      totalLoanedValue,
      totalDebtCollected,
      totalOutstandingDebt,
      overdueCount,
      overdueDebt,
      partialCount,
      partialDebt,
      unpaidCount,
      unpaidDebt,
      activeCount,
      activeDebt,
      paidCount,
      dueTodayCount,
      dueSoonCount,
      highBalanceCount,
      recoveryRate
    };
  }, [allLoanTransactions, todayStr]);

  // Filtered & Sorted Loans
  const filteredLoans = useMemo(() => {
    const q = String(searchQuery || "").toLowerCase().trim();
    const todayDate = new Date(todayStr + 'T00:00:00');

    const filtered = allLoanTransactions.filter(tx => {
      const meta = getLoanMeta(tx);

      // Source filter
      if (sourceFilter === 'pos' && (tx as any)._origin !== 'pos') return false;
      if (sourceFilter === 'online' && (tx as any)._origin !== 'online') return false;

      // Status filter
      if (statusFilter === 'overdue') {
        if (!meta.isOverdue || meta.remainingBalance <= 0) return false;
      } else if (statusFilter === 'partial') {
        if (meta.computedStatus !== 'partial' && !(meta.totalPaid > 0 && meta.remainingBalance > 0 && !meta.isOverdue)) return false;
      } else if (statusFilter === 'unpaid') {
        if (meta.totalPaid > 0 || meta.remainingBalance <= 0 || meta.isOverdue) return false;
      } else if (statusFilter === 'active') {
        if (meta.remainingBalance <= 0) return false;
      } else if (statusFilter === 'paid') {
        if (meta.remainingBalance > 0) return false;
      }

      // Priority Preset filter
      if (priorityPreset === 'overdue') {
        if (!meta.isOverdue || meta.remainingBalance <= 0) return false;
      } else if (priorityPreset === 'due_today') {
        if (meta.remainingBalance <= 0 || meta.dueDate !== todayStr) return false;
      } else if (priorityPreset === 'due_soon') {
        if (meta.remainingBalance <= 0 || !meta.dueDate) return false;
        const diffDays = Math.ceil((new Date(meta.dueDate + 'T00:00:00').getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays < 0 || diffDays > 3) return false;
      } else if (priorityPreset === 'high_balance') {
        if (meta.remainingBalance < 500000) return false;
      }

      // Search Query
      if (q) {
        const custName = getLoanCustomerName(tx);
        const custPhone = getLoanCustomerPhone(tx);
        const matchesName = String(custName || "").toLowerCase().includes(q);
        const matchesPhone = String(custPhone || "").toLowerCase().includes(q);
        const matchesId = (tx.id || '').toLowerCase().includes(q);
        const matchesNationalId = (tx.loanNationalId || '').toLowerCase().includes(q);
        const matchesGuarantor = (tx.loanGuarantorName || '').toLowerCase().includes(q) || (tx.loanGuarantorPhone || '').toLowerCase().includes(q);
        const matchesProduct = (tx.items || []).some(item => (item.product?.name || '').toLowerCase().includes(q));

        if (!matchesName && !matchesPhone && !matchesId && !matchesNationalId && !matchesGuarantor && !matchesProduct) {
          return false;
        }
      }

      return true;
    });

    // Sorting
    return filtered.sort((a, b) => {
      const metaA = getLoanMeta(a);
      const metaB = getLoanMeta(b);

      if (sortBy === 'dueDate') {
        if (!metaA.dueDate) return 1;
        if (!metaB.dueDate) return -1;
        return metaA.dueDate.localeCompare(metaB.dueDate);
      }
      if (sortBy === 'balance') {
        return metaB.remainingBalance - metaA.remainingBalance;
      }
      if (sortBy === 'balanceAsc') {
        return metaA.remainingBalance - metaB.remainingBalance;
      }
      if (sortBy === 'total') {
        return metaB.total - metaA.total;
      }
      if (sortBy === 'progress') {
        return metaA.progressPct - metaB.progressPct;
      }
      if (sortBy === 'newest') {
        return new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime();
      }
      if (sortBy === 'name') {
        return getLoanCustomerName(a).localeCompare(getLoanCustomerName(b));
      }
      return 0;
    });
  }, [allLoanTransactions, searchQuery, statusFilter, priorityPreset, sourceFilter, sortBy, todayStr]);

  // Open Repayment Modal
  const handleOpenRepayModal = (tx: POSTransaction) => {
    const meta = getLoanMeta(tx);
    setSelectedLoanForRepayment(tx);
    setRepayAmount(meta.remainingBalance);
    setRepayMethod('M-Pesa');
    setRepayNotes('');
    setIsSplitRepay(false);
    const half = Math.round(meta.remainingBalance / 2);
    setSplitMethodA('Cash');
    setSplitAmountA(half);
    setSplitMethodB('M-Pesa');
    setSplitAmountB(Math.max(0, meta.remainingBalance - half));
  };

  // Submit Repayment
  const handleSubmitRepayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoanForRepayment) return;

    const meta = getLoanMeta(selectedLoanForRepayment);
    const effectiveAmount = isSplitRepay 
      ? (Number(splitAmountA) + Number(splitAmountB)) 
      : Number(repayAmount);

    if (effectiveAmount <= 0) {
      showAlert('Invalid Amount', 'Please enter a valid repayment amount greater than 0.', 'warning');
      return;
    }

    if (effectiveAmount > meta.remainingBalance + 100) {
      showAlert('Amount Too High', `Repayment cannot exceed the remaining balance of ${formatTZS(meta.remainingBalance)}.`, 'warning');
      return;
    }

    setIsSubmittingRepayment(true);

    try {
      const recordedMethod = isSplitRepay
        ? `Split (${splitMethodA}: ${formatTZS(splitAmountA)} + ${splitMethodB}: ${formatTZS(splitAmountB)})`
        : repayMethod;

      const newRepayment: LoanRepayment = {
        id: `REP-${Date.now().toString(36).toUpperCase()}`,
        amount: effectiveAmount,
        date: new Date().toISOString(),
        paymentMethod: recordedMethod,
        recordedBy: activeCashierName,
        notes: (repayNotes.trim() ? repayNotes.trim() + (isSplitRepay ? ` | Split: ${splitMethodA} ${formatTZS(splitAmountA)}, ${splitMethodB} ${formatTZS(splitAmountB)}` : '') : (isSplitRepay ? `Split: ${splitMethodA} ${formatTZS(splitAmountA)}, ${splitMethodB} ${formatTZS(splitAmountB)}` : undefined))
      };

      const existingRepayments = selectedLoanForRepayment.loanRepayments || [];
      const updatedRepayments = [...existingRepayments, newRepayment];
      const newBalance = Math.max(0, meta.remainingBalance - effectiveAmount);
      const newStatus = newBalance <= 0 ? 'paid' : 'partial';

      const updatedTx: POSTransaction = {
        ...selectedLoanForRepayment,
        loanBalance: newBalance,
        loanStatus: newStatus,
        loanRepayments: updatedRepayments,
        status: newBalance <= 0 ? 'Completed' : selectedLoanForRepayment.status
      };

      if ((selectedLoanForRepayment as any)._origin === 'online' && onUpdateOrder) {
        const orig = (selectedLoanForRepayment as any)._originalOrder || (orders || []).find(o => o.id === selectedLoanForRepayment.id);
        if (orig) {
          const updatedOrder: Order = {
            ...orig,
            paidAmount: (orig.paidAmount || 0) + effectiveAmount,
            outstandingBalance: newBalance,
            paymentStatus: newBalance <= 0 ? 'Paid' : 'Partial',
            loanBalance: newBalance,
            loanStatus: newStatus,
            loanRepayments: updatedRepayments,
            partialPayments: updatedRepayments
          };
          await onUpdateOrder(updatedOrder);
        }
      } else if (onUpdateLoanTransaction) {
        const { _origin, _originalOrder, ...cleanTx } = selectedLoanForRepayment as any;
        const updatedTx: POSTransaction = {
          ...cleanTx,
          loanBalance: newBalance,
          loanStatus: newStatus,
          loanRepayments: updatedRepayments,
          status: newBalance <= 0 ? 'Completed' : cleanTx.status,
          isLoan: true,
        };
        await onUpdateLoanTransaction(updatedTx);
      }

      triggerHaptic('success');

      showAlert(
        'Repayment Recorded', 
        `Successfully logged installment of ${formatTZS(effectiveAmount)} for ${selectedLoanForRepayment.customerName || 'Customer'}. Remaining balance: ${formatTZS(newBalance)}.`,
        'alert'
      );

      // Offer immediate WhatsApp repayment receipt using custom modal
      const custPhone = selectedLoanForRepayment.customerPhone || getLoanCustomerPhone(updatedTx) || '';
      setWhatsappPromptModal({
        isOpen: true,
        tx: updatedTx,
        rep: newRepayment,
        currentBal: newBalance,
        phone: custPhone
      });

      setSelectedLoanForRepayment(null);
    } catch (err: any) {
      triggerHaptic('error');
      console.error('Failed to log loan repayment:', err);
      showAlert('Error', err?.message || 'Could not record repayment.', 'error');
    } finally {
      setIsSubmittingRepayment(false);
    }
  };

  // WhatsApp Repayment Receipt Share
  const handleSendWhatsAppRepaymentReceipt = (tx: POSTransaction, rep: LoanRepayment, currentBal: number, overridePhone?: string) => {
    triggerHaptic('success');
    let rawPhone = (overridePhone || getLoanCustomerPhone(tx)).replace(/[^0-9+]/g, '');
    if (!rawPhone) return;

    let phone = rawPhone;
    if (phone.startsWith('0')) {
      phone = '255' + phone.slice(1);
    } else if (phone.startsWith('+')) {
      phone = phone.slice(1);
    }

    const storeName = storeSettings?.storeName || 'Genuine Electronics';
    const storeTel = storeSettings?.phone || '+255 768 929 203';

    let msg = `🧾 *UTHIBITISHO WA MALIPO YA MKOPO (INSTALLMENT RECEIPT)*\n*${storeName.toUpperCase()}*\n----------------------------------------\n`;
    msg += `👤 *Mteja:* ${getLoanCustomerName(tx)}\n`;
    msg += `📄 *Akaunti / Risiti:* ${tx.id}\n`;
    msg += `💵 *Kiasi Kilicholipwa:* ${formatTZS(rep.amount)}\n`;
    msg += `💳 *Njia ya Malipo:* ${rep.paymentMethod}\n`;
    msg += `📅 *Tarehe:* ${formatToGMT3(rep.date)}\n`;
    msg += `🧑‍💼 *Mpokeaji (Cashier):* ${rep.recordedBy || activeCashierName || 'Staff'}\n`;
    msg += `----------------------------------------\n`;
    msg += `⚠️ *SALIO LILILOBAKI:* ${formatTZS(currentBal)}\n`;
    if (currentBal <= 0) {
      msg += `🎉 *HONGERA! DENI LAKO LIMEKAMILIKA KULIPWA.* 🎉\n`;
    } else {
      const dueDateVal = getLoanDueDate(tx) || (tx as any).loanDueDate;
      if (dueDateVal) {
        msg += `🗓️ *Tarehe ya Mwisho wa Malipo (Due Date):* ${dueDateVal}\n`;
      }
    }
    msg += `----------------------------------------\nAsante kwa uaminifu wako na ${storeName}!\n📞 Mawasiliano: ${storeTel}`;

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const loanReceiptCanvasRef = useRef<HTMLDivElement>(null);
  const [isGeneratingReceiptImg, setIsGeneratingReceiptImg] = useState(false);

  const handleGenerateAndShareReceiptImage = async (tx: POSTransaction, rep: LoanRepayment, currentBal: number) => {
    if (!loanReceiptCanvasRef.current) return;
    setIsGeneratingReceiptImg(true);
    triggerHaptic('medium');
    try {
      const canvas = await toCanvas(loanReceiptCanvasRef.current, {
        pixelRatio: 3,
        backgroundColor: '#ffffff',
        filter: (node) => { if (node instanceof HTMLElement && node.classList.contains('no-print')) return false; return true; }
      });

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const fileName = `Installment_Receipt_${tx.id.replace('#', '')}.png`;
        const file = new File([blob], fileName, { type: 'image/png' });

        let shared = false;
        try {
          if (navigator.clipboard && window.ClipboardItem) {
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            showAlert('Receipt Copied!', 'Receipt image copied to clipboard! You can paste it directly into WhatsApp chat.', 'alert');
            shared = true;
          }
        } catch (clipErr) {
          console.warn('Clipboard image write failed:', clipErr);
        }

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              title: `Installment Receipt ${tx.id}`,
              files: [file]
            });
            shared = true;
          } catch (shareErr: any) {
            if (shareErr?.name !== 'AbortError') {
              console.warn('Share cancelled:', shareErr);
            }
          }
        }

        if (!shared) {
          const dataUrl = canvas.toDataURL('image/png', 1.0);
          const link = document.createElement('a');
          link.download = fileName;
          link.href = dataUrl;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          showAlert('Receipt Downloaded', 'Installment receipt PNG image downloaded to device.', 'alert');
        }
      }, 'image/png', 1.0);
    } catch (err: any) {
      console.error('Failed to generate receipt image:', err);
      showAlert('Error', 'Could not generate receipt image.', 'error');
    } finally {
      setIsGeneratingReceiptImg(false);
    }
  };

  // Extend Due Date
  const handleSaveExtendedDueDate = async () => {
    if (!loanForDateExtension || !newDueDate) return;

    try {
      const updatedTx: POSTransaction = {
        ...loanForDateExtension,
        loanDueDate: newDueDate,
      };

      if ((loanForDateExtension as any)._origin === 'online' && onUpdateOrder) {
        const orig = (loanForDateExtension as any)._originalOrder || (orders || []).find(o => o.id === loanForDateExtension.id);
        if (orig) {
          const updatedOrder: Order = {
            ...orig,
            loanDueDate: newDueDate
          };
          await onUpdateOrder(updatedOrder);
        }
      } else if (onUpdateLoanTransaction) {
        const { _origin, _originalOrder, ...cleanTx } = loanForDateExtension as any;
        const updatedTx: POSTransaction = {
          ...cleanTx,
          loanDueDate: newDueDate,
          isLoan: true,
        };
        await onUpdateLoanTransaction(updatedTx);
      }

      triggerHaptic('medium');
      showAlert('Due Date Updated', `New payment deadline set to ${newDueDate}.`, 'alert');
      setLoanForDateExtension(null);
    } catch (err: any) {
      triggerHaptic('error');
      showAlert('Error', 'Could not update due date.', 'error');
    }
  };

  // Open Edit Customer & Loan Info Modal
  const handleOpenEditCustomer = (tx: POSTransaction) => {
    setLoanForEditCustomer(tx);
    const rawName = getLoanCustomerName(tx);
    setEditCustomerName(
      rawName === 'Walk-in Customer' || rawName === 'Walk-in' || rawName.startsWith('Debtor (') || rawName.startsWith('Customer (')
        ? ''
        : rawName
    );
    setEditCustomerPhone(getLoanCustomerPhone(tx));
    setEditLoanNationalId(tx.loanNationalId || (tx as any).loan_national_id || (tx as any).loannationalid || '');
    setEditLoanDueDate(getLoanDueDate(tx) || (tx as any).loanDueDate || (tx as any).loan_due_date || '');
    const guarantor = getLoanGuarantor(tx);
    setEditLoanGuarantorName(guarantor.name || tx.loanGuarantorName || (tx as any).loan_guarantor_name || '');
    setEditLoanGuarantorPhone(guarantor.phone || tx.loanGuarantorPhone || (tx as any).loan_guarantor_phone || '');
    setEditLoanNotes(tx.notes || '');
  };

  // Save Customer & Loan Info
  const handleSaveCustomerAndLoanInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loanForEditCustomer) return;

    setIsSavingCustomerInfo(true);
    try {
      const isOnline = (loanForEditCustomer as any)._origin === 'online';
      const cleanCustomerName = editCustomerName.trim() || 'Walk-in Customer';
      const cleanCustomerPhone = editCustomerPhone.trim();
      const cleanNationalId = editLoanNationalId.trim();
      const cleanDueDate = editLoanDueDate.trim();
      const cleanGuarantorName = editLoanGuarantorName.trim();
      const cleanGuarantorPhone = editLoanGuarantorPhone.trim();
      const cleanNotes = editLoanNotes.trim();

      if (isOnline && onUpdateOrder) {
        const orig = (loanForEditCustomer as any)._originalOrder || (orders || []).find(o => o.id === loanForEditCustomer.id);
        if (orig) {
          const updatedOrder: Order = {
            ...orig,
            customerName: cleanCustomerName,
            customer_name: cleanCustomerName as any,
            customerPhone: cleanCustomerPhone,
            customer_phone: cleanCustomerPhone as any,
            loanNationalId: cleanNationalId,
            loan_national_id: cleanNationalId as any,
            loanDueDate: cleanDueDate,
            loan_due_date: cleanDueDate as any,
            deadline: cleanDueDate,
            loanGuarantorName: cleanGuarantorName,
            loan_guarantor_name: cleanGuarantorName as any,
            loanGuarantorPhone: cleanGuarantorPhone,
            loan_guarantor_phone: cleanGuarantorPhone as any,
            notes: cleanNotes || orig.notes,
            isLoan: true,
            is_loan: true as any,
          };

          // If a customer object exists, sync the name/phone into it too
          if ((updatedOrder as any).customer && typeof (updatedOrder as any).customer === 'object') {
            (updatedOrder as any).customer = {
              ...(updatedOrder as any).customer,
              name: cleanCustomerName,
              phone: cleanCustomerPhone
            };
          }

          await onUpdateOrder(updatedOrder);
        }
      } else if (onUpdateLoanTransaction) {
        const { _origin, _originalOrder, ...cleanTx } = loanForEditCustomer as any;

        const updatedTx: POSTransaction = {
          ...cleanTx,
          customerName: cleanCustomerName,
          customer_name: cleanCustomerName,
          customerPhone: cleanCustomerPhone,
          customer_phone: cleanCustomerPhone,
          loanNationalId: cleanNationalId,
          loan_national_id: cleanNationalId,
          loanDueDate: cleanDueDate,
          loan_due_date: cleanDueDate,
          deadline: cleanDueDate,
          loanGuarantorName: cleanGuarantorName,
          loan_guarantor_name: cleanGuarantorName,
          loanGuarantorPhone: cleanGuarantorPhone,
          loan_guarantor_phone: cleanGuarantorPhone,
          notes: cleanNotes || cleanTx.notes || '',
          isLoan: true,
          is_loan: true,
        };

        // If a customer object exists, sync the name/phone into it too
        if ((updatedTx as any).customer && typeof (updatedTx as any).customer === 'object') {
          (updatedTx as any).customer = {
            ...(updatedTx as any).customer,
            name: cleanCustomerName,
            phone: cleanCustomerPhone
          };
        }

        await onUpdateLoanTransaction(updatedTx);
      }

      triggerHaptic('medium');
      showAlert('Account Updated', `Customer details and loan deadline for ${editCustomerName.trim() || 'account'} have been successfully saved.`, 'alert');
      setLoanForEditCustomer(null);
    } catch (err: any) {
      triggerHaptic('error');
      showAlert('Error', err?.message || 'Could not update loan details.', 'error');
    } finally {
      setIsSavingCustomerInfo(false);
    }
  };

  // WhatsApp Reminder Generator with Multi-Template Support
  const handleSendWhatsAppReminder = (
    tx: POSTransaction,
    templateType: 'polite' | 'urgent' | 'today' | 'guarantor' = 'polite',
    overridePhone?: string
  ) => {
    triggerHaptic('light');
    const meta = getLoanMeta(tx);
    const isGuarantorTarget = templateType === 'guarantor';
    const guarantorPhone = tx.loanGuarantorPhone || (tx as any).loan_guarantor_phone || '';
    const guarantorName = tx.loanGuarantorName || (tx as any).loan_guarantor_name || 'Mdhamini';

    let rawPhone = (overridePhone || (isGuarantorTarget ? guarantorPhone : getLoanCustomerPhone(tx))).replace(/[^0-9+]/g, '');
    if (!rawPhone) {
      const entered = window.prompt(
        isGuarantorTarget ? "Enter Guarantor WhatsApp phone number (e.g. 255768...):" : "Enter customer WhatsApp phone number (e.g. 255768...):",
        "255"
      );
      if (!entered) return;
      rawPhone = entered.replace(/[^0-9+]/g, '');
    }
    if (!rawPhone) return;

    let phone = rawPhone;
    if (phone.startsWith('0')) {
      phone = '255' + phone.slice(1);
    } else if (phone.startsWith('+')) {
      phone = phone.slice(1);
    }

    const storeName = storeSettings?.storeName || 'Genuine Electronics';
    const storeTel = storeSettings?.phone || '+255 768 929 203';
    const itemsList = (tx.items || []).map(i => i.product.name).join(', ');
    const dueDateVal = getLoanDueDate(tx) || meta.dueDate || 'Hivi Karibuni';
    const custName = getLoanCustomerName(tx);

    let message = '';

    if (templateType === 'urgent') {
      message = `🚨 *NOTISI YA HARAKA YA DENI LILILOPITA MUDA (OVERDUE NOTICE)*\n*${storeName.toUpperCase()}*\n----------------------------------------\n` +
        `Ndugu ${custName},\n` +
        `Tunakukumbusha kuwa deni lako la ununuzi wa bidhaa *${itemsList}* lenye Salio la *${formatTZS(meta.remainingBalance)}* limepitiliza tarehe ya mwisho ya makubaliano (*${dueDateVal}*).\n\n` +
        `⚠️ Tafadhali fanya malipo haya mara moja ndani ya masaa 24 ili kuepuka hatua za kisheria na kuripotiwa kwa mdhamini wako.\n\n` +
        `💳 Njia za Malipo: M-Pesa / Mixx By Yas / Airtel Money / Kufika Dukani.\n` +
        `📞 Wasiliana nasi haraka: ${storeTel}\n` +
        `----------------------------------------\nAsante kwa ushirikiano wako.`;
    } else if (templateType === 'today') {
      message = `🔔 *KUMBUSHO: TAREHE YA MWISHO WA MALIPO NI LEO*\n*${storeName.toUpperCase()}*\n----------------------------------------\n` +
        `Habari ${custName},\n` +
        `Tunakukumbusha kuwa leo tarehe *${dueDateVal}* ndiyo tarehe ya mwisho ya kukamilisha installment ya ununuzi wa *${itemsList}*.\n\n` +
        `💵 Salio Lililobaki: *${formatTZS(meta.remainingBalance)}*\n` +
        `Tafadhali kamilisha malipo yako leo kwa M-Pesa / Mixx By Yas au fika dukani.\n` +
        `📞 Mawasiliano: ${storeTel}\n` +
        `----------------------------------------\nAsante kwa uaminifu wako!`;
    } else if (templateType === 'guarantor') {
      message = `🤝 *TAARIFA KWA MDHAMINI (GUARANTOR NOTICE)*\n*${storeName.toUpperCase()}*\n----------------------------------------\n` +
        `Habari Ndugu ${guarantorName},\n` +
        `Tunakutaarifu kuwa kama mdhamini wa mteja *${custName}*, kuna salio la mkopo wa bidhaa (*${itemsList}*) la *${formatTZS(meta.remainingBalance)}* ambalo linatakiwa kulipwa.\n\n` +
        `🗓️ Tarehe ya Malipo: *${dueDateVal}*\n` +
        `Tafadhali wasiliana na mteja wako au ofisi yetu kupitia ${storeTel} ili kusaidia kukamilisha malipo haya kwa wakati.\n` +
        `----------------------------------------\n${storeName} • Huduma kwa Wateja`;
    } else {
      // Standard Polite
      message = `Habari ${custName}, tunakusalimu kutoka ${storeName}.\n\nTunakukumbusha kuhusu salio la ununuzi wa bidhaa (${itemsList}) kwa mkopo:\n• Salio Lililobaki: ${formatTZS(meta.remainingBalance)}\n• Tarehe ya Mwisho wa Malipo: ${dueDateVal}\n\nTafadhali unaweza kulipia kupitia M-Pesa / Mixx By Yas / Airtel Money au kufika dukani kwetu.\nKwa maswali piga: ${storeTel}.\nAsante sana!`;
    }

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank');
  };

  // Export Debtors Ledger as CSV
  const handleExportCSV = () => {
    if (allLoanTransactions.length === 0) {
      showAlert('No Data', 'No loan or credit records to export.', 'warning');
      return;
    }

    const headers = [
      'Receipt ID',
      'Date Created',
      'Customer Name',
      'Customer Phone',
      'National ID',
      'Guarantor Name',
      'Guarantor Phone',
      'Total Sale (TZS)',
      'Down Payment (TZS)',
      'Total Paid (TZS)',
      'Remaining Balance (TZS)',
      'Due Date',
      'Status',
      'Items Purchased'
    ];

    const rows = allLoanTransactions.map(tx => {
      const meta = getLoanMeta(tx);
      const itemsStr = (tx.items || []).map(i => `${i.quantity}x ${i.product.name}`).join('; ');
      return [
        `"${tx.id}"`,
        `"${tx.createdAt}"`,
        `"${getLoanCustomerName(tx).replace(/"/g, '""')}"`,
        `"${getLoanCustomerPhone(tx).replace(/"/g, '""')}"`,
        `"${tx.loanNationalId || ''}"`,
        `"${tx.loanGuarantorName || ''}"`,
        `"${tx.loanGuarantorPhone || ''}"`,
        meta.total,
        tx.downPayment || 0,
        meta.totalPaid,
        meta.remainingBalance,
        `"${meta.dueDate}"`,
        `"${meta.computedStatus.toUpperCase()}"`,
        `"${itemsStr.replace(/"/g, '""')}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Debtors_Loan_Ledger_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Header & Fast Action */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Banknote className="w-6 h-6" />
            </div>
            <div>
              <h1 className={`text-xl sm:text-2xl font-black ${textTitle}`}>
                Credit & Sell by Loan Tracker
              </h1>
              <p className={`text-xs mt-0.5 ${textSub}`}>
                Track customer installments, outstanding debt balances, due dates and collect repayments.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleExportCSV}
            className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
              isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
            }`}
            title="Download CSV report of all unpaid and paid loans"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            <span>Export Debtors CSV</span>
          </button>

          <button
            onClick={onGoToPOSWithLoan}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>New Sell by Loan</span>
          </button>
        </div>
      </div>

      {/* Executive Financial Metrics Cards (Clickable for Instant Filtering) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Loan Principal Issued */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setStatusFilter('all');
            setPriorityPreset('all');
          }}
          className={`p-4 rounded-3xl border text-left transition-all relative overflow-hidden group hover:scale-[1.01] ${cardBg} ${
            statusFilter === 'all' && priorityPreset === 'all'
              ? 'ring-2 ring-blue-500/50 border-blue-500/60 shadow-md'
              : 'hover:border-blue-500/30'
          }`}
          title="Click to view all loans"
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${textSub}`}>Total Credit Issued</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 group-hover:scale-110 transition-transform">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-lg sm:text-xl font-black mt-2 ${textTitle}`}>
            {formatTZS(metrics.totalLoanedValue)}
          </div>
          <div className={`text-[11px] mt-1 flex items-center justify-between font-semibold ${textSub}`}>
            <span>{metrics.totalLoansCount} total loan accounts</span>
            <span className="text-[10px] text-blue-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity">View all →</span>
          </div>
        </button>

        {/* Total Debt Collected / Repaid */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setStatusFilter('paid');
            setPriorityPreset('all');
          }}
          className={`p-4 rounded-3xl border text-left transition-all relative overflow-hidden group hover:scale-[1.01] ${cardBg} ${
            statusFilter === 'paid'
              ? 'ring-2 ring-emerald-500/50 border-emerald-500/60 shadow-md'
              : 'hover:border-emerald-500/30'
          }`}
          title="Click to view fully cleared loans"
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${textSub}`}>Total Collected / Repaid</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black mt-2 text-emerald-500">
            {formatTZS(metrics.totalDebtCollected)}
          </div>
          <div className="text-[11px] mt-1 flex items-center justify-between font-semibold text-emerald-600 dark:text-emerald-400">
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              <span>{metrics.recoveryRate}% recovered ({metrics.paidCount} cleared)</span>
            </div>
            <span className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">Filter →</span>
          </div>
        </button>

        {/* Outstanding Unpaid Debt */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setStatusFilter('active');
            setPriorityPreset('all');
          }}
          className={`p-4 rounded-3xl border text-left transition-all relative overflow-hidden group hover:scale-[1.01] ${cardBg} ${
            statusFilter === 'active' || statusFilter === 'partial' || statusFilter === 'unpaid'
              ? 'ring-2 ring-amber-500/50 border-amber-500/60 shadow-md'
              : 'hover:border-amber-500/30'
          }`}
          title="Click to view all active unpaid debts"
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${textSub}`}>Outstanding Active Debt</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 group-hover:scale-110 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black mt-2 text-amber-500">
            {formatTZS(metrics.totalOutstandingDebt)}
          </div>
          <div className={`text-[11px] mt-1 flex items-center justify-between font-semibold ${textSub}`}>
            <span>{metrics.activeCount} active balance(s) ({metrics.partialCount} partial)</span>
            <span className="text-[10px] text-amber-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity">Filter →</span>
          </div>
        </button>

        {/* Overdue Delinquent Balances */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setStatusFilter('overdue');
            setPriorityPreset('overdue');
          }}
          className={`p-4 rounded-3xl border text-left transition-all relative overflow-hidden group hover:scale-[1.01] ${cardBg} ${
            statusFilter === 'overdue' || priorityPreset === 'overdue'
              ? 'ring-2 ring-rose-500/50 border-rose-500/60 shadow-md'
              : 'hover:border-rose-500/30'
          }`}
          title="Click to view high priority overdue accounts"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-500 flex items-center gap-1">
              <span>Overdue Balances</span>
              {metrics.overdueCount > 0 && <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />}
            </span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500 group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black mt-2 text-rose-500">
            {formatTZS(metrics.overdueDebt)}
          </div>
          <div className="text-[11px] mt-1 flex items-center justify-between font-black text-rose-600 dark:text-rose-400">
            <span>{metrics.overdueCount} overdue delinquent(s)</span>
            <span className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">Focus →</span>
          </div>
        </button>
      </div>

      {/* Filter, Status Selector & Priority Search Controls */}
      <div className={`p-4 sm:p-5 rounded-3xl border shadow-sm space-y-4 ${cardBg}`}>
        
        {/* Status Filter Tabs & Source Selection */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3.5">
          
          {/* Main Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
            {[
              { 
                id: 'all' as LoanStatusFilter, 
                label: 'All Loans', 
                count: allLoanTransactions.length,
                color: 'blue' 
              },
              { 
                id: 'overdue' as LoanStatusFilter, 
                label: 'Overdue', 
                count: metrics.overdueCount, 
                badgeExtra: metrics.overdueDebt > 0 ? formatTZS(metrics.overdueDebt) : undefined,
                color: 'rose',
                urgent: metrics.overdueCount > 0
              },
              { 
                id: 'partial' as LoanStatusFilter, 
                label: 'Partial', 
                count: metrics.partialCount, 
                color: 'amber' 
              },
              { 
                id: 'unpaid' as LoanStatusFilter, 
                label: 'Unpaid (0%)', 
                count: metrics.unpaidCount, 
                color: 'sky' 
              },
              { 
                id: 'active' as LoanStatusFilter, 
                label: 'Active Debts', 
                count: metrics.activeCount, 
                color: 'indigo' 
              },
              { 
                id: 'paid' as LoanStatusFilter, 
                label: 'Fully Paid', 
                count: metrics.paidCount, 
                color: 'emerald' 
              }
            ].map(tab => {
              const isSelected = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    triggerHaptic('light');
                    setStatusFilter(tab.id);
                  }}
                  className={`px-3 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 border ${
                    isSelected
                      ? tab.id === 'overdue'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-600/20'
                        : tab.id === 'partial'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-600/20'
                        : tab.id === 'paid'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                        : 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20'
                      : isDark
                      ? 'bg-slate-800/80 text-slate-300 border-slate-700/70 hover:bg-slate-700/80'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {tab.urgent && !isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                  )}
                  <span>{tab.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : isDark
                      ? 'bg-slate-700 text-slate-300'
                      : 'bg-slate-200 text-slate-700'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Source Channel Filter (All / POS / Online) */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/90 p-1 rounded-2xl shrink-0 self-start lg:self-auto border border-slate-200/80 dark:border-slate-700/60">
            <span className="text-[10px] font-bold text-slate-400 uppercase px-2">Source:</span>
            {[
              { id: 'all', label: 'All Channels' },
              { id: 'pos', label: 'POS Terminal' },
              { id: 'online', label: 'Online Store' }
            ].map(s => (
              <button
                key={s.id}
                onClick={() => {
                  triggerHaptic('light');
                  setSourceFilter(s.id as any);
                }}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  sourceFilter === s.id
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

        </div>

        {/* Priority Collections & Quick Targeting Presets */}
        <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 mr-1">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Priority Focus:</span>
            </span>

            {[
              { id: 'all' as LoanPriorityPreset, label: 'All Priorities' },
              { 
                id: 'overdue' as LoanPriorityPreset, 
                label: `🚨 Overdue (${metrics.overdueCount})`, 
                activeClass: 'bg-rose-500 text-white' 
              },
              { 
                id: 'due_today' as LoanPriorityPreset, 
                label: `⏳ Due Today (${metrics.dueTodayCount})`, 
                activeClass: 'bg-amber-500 text-slate-950 font-black' 
              },
              { 
                id: 'due_soon' as LoanPriorityPreset, 
                label: `⚠️ Due in 3 Days (${metrics.dueSoonCount})`, 
                activeClass: 'bg-indigo-600 text-white' 
              },
              { 
                id: 'high_balance' as LoanPriorityPreset, 
                label: `💰 High Debt ≥500k (${metrics.highBalanceCount})`, 
                activeClass: 'bg-purple-600 text-white' 
              }
            ].map(p => (
              <button
                key={p.id}
                onClick={() => {
                  triggerHaptic('light');
                  setPriorityPreset(p.id);
                  if (p.id === 'overdue' && statusFilter === 'paid') {
                    setStatusFilter('overdue');
                  }
                }}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all ${
                  priorityPreset === p.id
                    ? p.activeClass || 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                    : isDark
                    ? 'bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-slate-700/50'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Search & Sort Controls */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <div className="relative flex-1 sm:w-60">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search customer, phone, product, NIN..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className={`w-full pl-8 pr-7 py-1.5 rounded-xl text-xs font-semibold outline-none border focus:border-blue-500 transition-all ${inputBg}`}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold outline-none border transition-all ${inputBg}`}
            >
              <option value="dueDate">Due Date (Urgent first)</option>
              <option value="balance">Remaining Balance (Highest)</option>
              <option value="balanceAsc">Remaining Balance (Lowest)</option>
              <option value="total">Total Sale Amount (Highest)</option>
              <option value="progress">Repayment Progress (Lowest %)</option>
              <option value="newest">Creation Date (Newest)</option>
              <option value="name">Customer Name (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Active Filter Summary Bar */}
        {(statusFilter !== 'all' || priorityPreset !== 'all' || sourceFilter !== 'all' || searchQuery) && (
          <div className={`p-2.5 rounded-2xl border text-xs flex items-center justify-between gap-2 flex-wrap ${
            isDark ? 'bg-blue-950/20 border-blue-900/40 text-blue-300' : 'bg-blue-50/80 border-blue-200 text-blue-800'
          }`}>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold flex items-center gap-1">
                <ListFilter className="w-3.5 h-3.5" />
                <span>Showing <strong>{filteredLoans.length}</strong> loan{filteredLoans.length === 1 ? '' : 's'} matching:</span>
              </span>
              {statusFilter !== 'all' && (
                <span className="px-2 py-0.5 rounded-lg bg-blue-600 text-white font-bold text-[10px] uppercase">
                  Status: {statusFilter}
                </span>
              )}
              {priorityPreset !== 'all' && (
                <span className="px-2 py-0.5 rounded-lg bg-amber-500 text-slate-900 font-bold text-[10px] uppercase">
                  Priority: {priorityPreset.replace('_', ' ')}
                </span>
              )}
              {sourceFilter !== 'all' && (
                <span className="px-2 py-0.5 rounded-lg bg-purple-600 text-white font-bold text-[10px] uppercase">
                  Channel: {sourceFilter}
                </span>
              )}
              {searchQuery && (
                <span className="px-2 py-0.5 rounded-lg bg-slate-700 text-white font-bold text-[10px]">
                  "{searchQuery}"
                </span>
              )}
              <span className="text-[11px] font-semibold opacity-80">
                • Filtered Outstanding Debt: <strong>{formatTZS(filteredLoans.reduce((sum, tx) => sum + getLoanMeta(tx).remainingBalance, 0))}</strong>
              </span>
            </div>

            <button
              onClick={() => {
                triggerHaptic('light');
                setStatusFilter('all');
                setPriorityPreset('all');
                setSourceFilter('all');
                setSearchQuery('');
              }}
              className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 text-[11px] font-bold border border-slate-300 dark:border-slate-700 transition-all flex items-center gap-1 shadow-sm"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Clear All Filters</span>
            </button>
          </div>
        )}

      </div>

      {/* Loans Grid / Table Container */}
      {filteredLoans.length === 0 ? (
        <div className={`p-12 text-center rounded-3xl border space-y-3 ${cardBg}`}>
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
            <Banknote className="w-6 h-6" />
          </div>
          <h3 className={`text-base font-bold ${textTitle}`}>
            {statusFilter === 'overdue'
              ? 'No Overdue Loans Found'
              : statusFilter === 'partial'
              ? 'No Partial Repayment Loans Found'
              : statusFilter === 'unpaid'
              ? 'No 0% Paid Loans Found'
              : statusFilter === 'paid'
              ? 'No Fully Paid Loans Found'
              : 'No Credit / Loan Sales Found'}
          </h3>
          <p className={`text-xs max-w-md mx-auto ${textSub}`}>
            {searchQuery || statusFilter !== 'all' || priorityPreset !== 'all' || sourceFilter !== 'all'
              ? `No loan transactions matched your current filter criteria (${[
                  statusFilter !== 'all' ? `Status: ${statusFilter}` : '',
                  priorityPreset !== 'all' ? `Priority: ${priorityPreset}` : '',
                  searchQuery ? `Search: "${searchQuery}"` : ''
                ].filter(Boolean).join(', ')}). Try adjusting or clearing filters.`
              : 'There are no active or historic sell-by-loan transactions. You can register loan sales directly at the POS terminal.'}
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            {(statusFilter !== 'all' || priorityPreset !== 'all' || sourceFilter !== 'all' || searchQuery) && (
              <button
                onClick={() => {
                  triggerHaptic('light');
                  setStatusFilter('all');
                  setPriorityPreset('all');
                  setSourceFilter('all');
                  setSearchQuery('');
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-md"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset All Filters</span>
              </button>
            )}
            <button
              onClick={onGoToPOSWithLoan}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Loan Sale</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredLoans.map(tx => {
            const meta = getLoanMeta(tx);
            const itemsCount = (tx.items || []).reduce((s, i) => s + (i.quantity || 1), 0);
            const hasRepayments = (tx.loanRepayments || []).length > 0;

            // Days remaining calculation
            let daysText = '';
            let isPastDue = false;
            let diffDays = 0;
            if (meta.dueDate) {
              const diffTime = new Date(meta.dueDate + 'T00:00:00').getTime() - new Date(todayStr + 'T00:00:00').getTime();
              diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              if (meta.computedStatus === 'paid' || meta.remainingBalance <= 0) {
                daysText = 'Cleared';
              } else if (diffDays < 0) {
                isPastDue = true;
                daysText = `⚠️ Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) > 1 ? 's' : ''}`;
              } else if (diffDays === 0) {
                daysText = '⚠️ Due Today';
              } else {
                daysText = `Due in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
              }
            }

            return (
              <div
                key={tx.id}
                className={`p-4 sm:p-5 rounded-3xl border shadow-sm flex flex-col justify-between transition-all hover:border-blue-500/40 relative overflow-hidden ${cardBg} ${
                  meta.isOverdue && meta.remainingBalance > 0
                    ? 'border-rose-300 dark:border-rose-900/60'
                    : meta.computedStatus === 'partial'
                    ? 'border-amber-300/80 dark:border-amber-900/40'
                    : ''
                }`}
              >
                {/* Status Color Top Bar */}
                <div className={`absolute top-0 left-0 right-0 h-1.5 ${
                  meta.computedStatus === 'paid' || meta.remainingBalance <= 0
                    ? 'bg-emerald-500'
                    : meta.isOverdue
                    ? 'bg-rose-500'
                    : meta.computedStatus === 'partial'
                    ? 'bg-amber-500'
                    : 'bg-sky-500'
                }`} />

                {/* Customer Info & Status Badge */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2 pt-1">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <User className="w-4 h-4 text-blue-500 shrink-0" />
                        <h3 className={`font-black text-sm truncate ${textTitle}`}>
                          {getLoanCustomerName(tx)}
                        </h3>
                        {(tx as any)._origin === 'online' ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                            <Globe className="w-2.5 h-2.5" /> Online
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                            <Store className="w-2.5 h-2.5" /> POS
                          </span>
                        )}
                        <button
                          onClick={() => handleOpenEditCustomer(tx)}
                          className="p-1 rounded-lg hover:bg-blue-500/20 text-blue-500 transition-colors"
                          title="Edit Customer Info & Payment Deadline"
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                      </div>
                      {getLoanCustomerPhone(tx) ? (
                        <div className="flex items-center gap-1 text-[11px] text-slate-400 font-semibold mt-0.5">
                          <Phone className="w-3 h-3 text-slate-500" />
                          <span>{getLoanCustomerPhone(tx)}</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleOpenEditCustomer(tx)}
                          className="flex items-center gap-1 text-[10px] text-amber-500 font-bold hover:underline mt-0.5"
                        >
                          <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                          <span>No phone (Click to add)</span>
                        </button>
                      )}
                    </div>

                    {/* Badge */}
                    <div className="shrink-0">
                      {meta.computedStatus === 'paid' || meta.remainingBalance <= 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                          <Check className="w-3 h-3" /> Fully Paid
                        </span>
                      ) : meta.isOverdue ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 animate-pulse">
                          <AlertTriangle className="w-3 h-3" /> Overdue ({Math.abs(diffDays)}d)
                        </span>
                      ) : meta.computedStatus === 'partial' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                          <Clock className="w-3 h-3" /> Partial ({meta.progressPct}%)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30">
                          <Clock className="w-3 h-3" /> Unpaid (0%)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Warning banner if customer details or deadline is incomplete */}
                  {(getLoanCustomerName(tx) === 'Walk-in Customer' || !getLoanCustomerPhone(tx) || !meta.dueDate) && (
                    <button
                      onClick={() => handleOpenEditCustomer(tx)}
                      className="w-full py-1.5 px-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center justify-between text-[11px] font-bold transition-all text-left group"
                    >
                      <span className="flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>
                          {getLoanCustomerName(tx) === 'Walk-in Customer' || !getLoanCustomerPhone(tx)
                            ? 'Missing Customer Info & Deadline'
                            : 'No Loan Deadline Set'}
                        </span>
                      </span>
                      <span className="text-[10px] bg-amber-500 hover:bg-amber-600 text-slate-900 font-black px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-sm">
                        <Edit className="w-2.5 h-2.5" /> Set Info
                      </span>
                    </button>
                  )}

                  {/* Items purchased preview */}
                  <div className={`p-2.5 rounded-2xl border text-xs space-y-1.5 ${
                    isDark ? 'bg-slate-800/50 border-slate-700/60' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                      <span>Purchased ({itemsCount} items)</span>
                      <span>Receipt: {tx.id.slice(-8)}</span>
                    </div>
                    <div className="space-y-1">
                      {(tx.items || []).slice(0, 2).map((item, idx) => (
                        <div key={idx} className="flex justify-between text-[11px] font-semibold">
                          <span className={`truncate max-w-[170px] ${textTitle}`}>
                            {item.quantity}x {item.product.name}
                          </span>
                          <span className={textSub}>{formatTZS(item.product.price * item.quantity)}</span>
                        </div>
                      ))}
                      {(tx.items || []).length > 2 && (
                        <div className="text-[10px] text-blue-500 font-bold">
                          +{tx.items.length - 2} more product(s)
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Financial Balance & Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-baseline">
                      <span className={`text-xs font-bold ${textSub}`}>Unpaid Debt Due:</span>
                      <span className={`text-base font-black ${
                        meta.remainingBalance <= 0 ? 'text-emerald-500' : meta.isOverdue ? 'text-rose-500' : 'text-amber-500'
                      }`}>
                        {formatTZS(meta.remainingBalance)}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            meta.computedStatus === 'paid'
                              ? 'bg-emerald-500'
                              : meta.isOverdue
                              ? 'bg-rose-500'
                              : 'bg-amber-500'
                          }`}
                          style={{ width: `${meta.progressPct}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] font-bold text-slate-400">
                        <span>Paid: {formatTZS(meta.totalPaid)} ({meta.progressPct}%)</span>
                        <span>Total: {formatTZS(meta.total)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Due Date & Identification */}
                  <div className={`p-2.5 rounded-2xl border text-xs space-y-1 ${
                    isDark ? 'bg-slate-800/30 border-slate-700/50' : 'bg-slate-50/70 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-400">Payment Deadline:</span>
                      {meta.dueDate ? (
                        <div className="flex items-center gap-1.5">
                          <span className={`font-black ${meta.isOverdue && meta.remainingBalance > 0 ? 'text-rose-500' : textTitle}`}>
                            {meta.dueDate}
                          </span>
                          <button
                            onClick={() => handleOpenEditCustomer(tx)}
                            className="text-[10px] text-blue-500 hover:underline font-bold"
                            title="Edit Deadline"
                          >
                            Edit
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleOpenEditCustomer(tx)}
                          className="font-bold text-amber-500 hover:text-amber-400 text-xs flex items-center gap-1 underline underline-offset-2"
                        >
                          <span>Not set (Click to set)</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    {daysText && (
                      <div className="flex items-center justify-between text-[10px] font-bold">
                        <span className="text-slate-400">Timing:</span>
                        <span className={meta.isOverdue && meta.remainingBalance > 0 ? 'text-rose-500' : 'text-blue-500'}>
                          {daysText}
                        </span>
                      </div>
                    )}
                    {tx.loanGuarantorName && (
                      <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-200 dark:border-slate-700/60 text-slate-400">
                        <span>Guarantor:</span>
                        <span className={`font-bold ${textTitle}`}>
                          {tx.loanGuarantorName} {tx.loanGuarantorPhone ? `(${tx.loanGuarantorPhone})` : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div className="space-y-2 pt-4 mt-3 border-t border-slate-200 dark:border-slate-800">
                  
                  {/* Primary: Collect Repayment */}
                  {meta.remainingBalance > 0 ? (
                    <button
                      onClick={() => handleOpenRepayModal(tx)}
                      className="w-full py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all active:scale-98"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Record Repayment / Lipa Deni</span>
                    </button>
                  ) : (
                    <div className="w-full py-2 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs text-center border border-emerald-500/20 flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>All Installments Cleared</span>
                    </div>
                  )}

                  {/* Secondary Actions: WhatsApp, Call, Receipt, History */}
                  <div className="grid grid-cols-4 gap-1.5 pt-1">
                    {/* WhatsApp Reminder */}
                    <button
                      onClick={() => {
                        const custPhone = getLoanCustomerPhone(tx);
                        if (!custPhone) {
                          handleOpenEditCustomer(tx);
                        } else {
                          setWhatsappReminderModal({
                            isOpen: true,
                            tx,
                            template: meta.isOverdue ? 'urgent' : meta.dueDate === todayStr ? 'today' : 'polite'
                          });
                        }
                      }}
                      className="p-2 rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-all hover:bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                      title="Send payment reminder via WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span className="text-[9px] font-bold">WhatsApp</span>
                    </button>

                    {/* Direct Call */}
                    <button
                      onClick={() => {
                        const p = getLoanCustomerPhone(tx);
                        if (!p) {
                          handleOpenEditCustomer(tx);
                        } else {
                          window.location.href = `tel:${p}`;
                        }
                      }}
                      className="p-2 rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-all hover:bg-blue-500/10 text-blue-500 border-blue-500/30"
                      title="Call customer directly"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span className="text-[9px] font-bold">Call</span>
                    </button>

                    {/* Print Receipt */}
                    <button
                      onClick={() => onOpenPOSReceipt(tx)}
                      className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-all ${
                        isDark ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                      }`}
                      title="Print official thermal loan agreement receipt"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-[9px] font-bold">Receipt</span>
                    </button>

                    {/* History / Details */}
                    <button
                      onClick={() => setSelectedLoanForDetails(tx)}
                      className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-all ${
                        isDark ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                      }`}
                      title="View repayment ledger history & terms"
                    >
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-[9px] font-bold">Ledger</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: RECORD REPAYMENT (LIPA DENI) */}
      {selectedLoanForRepayment && (() => {
        const meta = getLoanMeta(selectedLoanForRepayment);
        return (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className={`w-full max-w-lg rounded-3xl border shadow-2xl p-5 sm:p-6 space-y-5 animate-in fade-in zoom-in-95 my-auto ${cardBg}`}>
              
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className={`text-base font-bold ${textTitle}`}>Record Loan Installment / Repayment</h3>
                    <p className={`text-[11px] ${textSub}`}>Log partial or full debt payment into customer ledger.</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedLoanForRepayment(null)}
                  className="p-1 rounded-xl text-slate-400 hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Customer & Debt Overview Card */}
              <div className={`p-3.5 rounded-2xl border space-y-2 text-xs ${
                isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Customer:</span>
                  <span className={`font-black ${textTitle}`}>
                    {getLoanCustomerName(selectedLoanForRepayment)} {getLoanCustomerPhone(selectedLoanForRepayment) ? `(${getLoanCustomerPhone(selectedLoanForRepayment)})` : ''}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Original Total:</span>
                  <span className={`font-bold ${textTitle}`}>{formatTZS(meta.total)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Already Paid:</span>
                  <span className="font-bold text-emerald-500">{formatTZS(meta.totalPaid)}</span>
                </div>
                <div className="flex justify-between items-center pt-1.5 border-t border-slate-200 dark:border-slate-700">
                  <span className="font-bold text-slate-400">Current Outstanding Debt:</span>
                  <span className="font-black text-base text-amber-500">{formatTZS(meta.remainingBalance)}</span>
                </div>
              </div>

              {/* Repayment Form */}
              <form onSubmit={handleSubmitRepayment} className="space-y-4">
                
                {/* Single vs Multi-Tender Payment Switch */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-500/10 border border-slate-500/20">
                  <div className="flex items-center gap-2">
                    <Split className="w-4 h-4 text-emerald-500" />
                    <div>
                      <div className={`text-xs font-bold ${textTitle}`}>Split / Multi-Tender Payment</div>
                      <div className={`text-[10px] ${textSub}`}>Pay via 2 channels (e.g. Cash + M-Pesa)</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsSplitRepay(!isSplitRepay)}
                    className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                      isSplitRepay 
                        ? 'bg-emerald-600 text-white shadow-sm' 
                        : isDark ? 'bg-slate-800 text-slate-400 border border-slate-700' : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    {isSplitRepay ? 'Active (Split)' : 'Single Method'}
                  </button>
                </div>

                {!isSplitRepay ? (
                  <>
                    {/* Amount Input */}
                    <div>
                      <label className={`block text-xs font-bold mb-1.5 ${textSub}`}>Repayment Amount (TZS) *</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        min="100"
                        max={meta.remainingBalance}
                        value={repayAmount || ''}
                        onChange={e => setRepayAmount(Number(e.target.value) || 0)}
                        required
                        placeholder="e.g. 50,000"
                        className={`w-full px-3.5 py-2.5 rounded-2xl text-sm font-black outline-none border focus:border-emerald-500 transition-all ${inputBg}`}
                      />
                      
                      {/* Quick Shortcut Buttons */}
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap text-xs">
                        <span className={`text-[10px] font-semibold ${textSub}`}>Quick Pick:</span>
                        <button
                          type="button"
                          onClick={() => setRepayAmount(meta.remainingBalance)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-black text-[11px] shadow-sm"
                        >
                          Full Balance ({formatTZS(meta.remainingBalance)})
                        </button>
                        {meta.remainingBalance > 10000 && (
                          <button
                            type="button"
                            onClick={() => setRepayAmount(Math.round(meta.remainingBalance / 2))}
                            className={`px-2 py-1 rounded-lg border font-bold text-[11px] ${
                              isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-white text-slate-700 border-slate-200'
                            }`}
                          >
                            50% ({formatTZS(Math.round(meta.remainingBalance / 2))})
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Payment Method */}
                    <div>
                      <label className={`block text-xs font-bold mb-1.5 ${textSub}`}>Payment Channel / Method *</label>
                      <div className="grid grid-cols-3 gap-2">
                        {['M-Pesa', 'Cash', 'Mixx By Yas', 'Airtel Money', 'Bank Wire', 'Card'].map(method => (
                          <button
                            key={method}
                            type="button"
                            onClick={() => setRepayMethod(method)}
                            className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                              repayMethod === method
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                                : isDark
                                ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {method}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-3 p-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5">
                    {/* Tender A */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-emerald-500">Tender 1 (Primary):</span>
                        <span className="font-mono text-emerald-600 dark:text-emerald-400">{formatTZS(splitAmountA)}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={splitMethodA}
                          onChange={e => setSplitMethodA(e.target.value)}
                          className={`px-3 py-2 rounded-xl text-xs font-bold border outline-none ${inputBg}`}
                        >
                          {['Cash', 'M-Pesa', 'Mixx By Yas', 'Airtel Money', 'Bank Wire', 'Card'].map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          max={meta.remainingBalance}
                          value={splitAmountA || ''}
                          onChange={e => {
                            const val = Number(e.target.value) || 0;
                            setSplitAmountA(val);
                            if (val <= meta.remainingBalance) {
                              setSplitAmountB(Math.max(0, meta.remainingBalance - val));
                            }
                          }}
                          placeholder="Amount TZS"
                          className={`px-3 py-2 rounded-xl text-xs font-bold border outline-none ${inputBg}`}
                        />
                      </div>
                    </div>

                    {/* Tender B */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-blue-500">Tender 2 (Secondary):</span>
                        <span className="font-mono text-blue-600 dark:text-blue-400">{formatTZS(splitAmountB)}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={splitMethodB}
                          onChange={e => setSplitMethodB(e.target.value)}
                          className={`px-3 py-2 rounded-xl text-xs font-bold border outline-none ${inputBg}`}
                        >
                          {['M-Pesa', 'Cash', 'Mixx By Yas', 'Airtel Money', 'Bank Wire', 'Card'].map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          max={meta.remainingBalance}
                          value={splitAmountB || ''}
                          onChange={e => setSplitAmountB(Number(e.target.value) || 0)}
                          placeholder="Amount TZS"
                          className={`px-3 py-2 rounded-xl text-xs font-bold border outline-none ${inputBg}`}
                        />
                      </div>
                    </div>

                    <div className="flex justify-between text-[11px] font-bold pt-1 border-t border-emerald-500/20 text-slate-400">
                      <span>Total Split Payment:</span>
                      <span className="text-emerald-500 font-mono">{formatTZS(Number(splitAmountA) + Number(splitAmountB))}</span>
                    </div>
                  </div>
                )}

                {/* Remaining Balance After Repayment Preview */}
                <div className={`p-3 rounded-xl border flex justify-between items-center text-xs ${
                  isDark ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-100 border-slate-200'
                }`}>
                  <span className="font-semibold text-slate-400">Balance After Payment:</span>
                  <span className="font-black text-sm text-blue-500">
                    {formatTZS(Math.max(0, meta.remainingBalance - (isSplitRepay ? (Number(splitAmountA) + Number(splitAmountB)) : (repayAmount || 0))))}
                  </span>
                </div>

                {/* Notes / Reference */}
                <div>
                  <label className={`block text-xs font-bold mb-1.5 ${textSub}`}>Receipt / Transaction Reference (Optional)</label>
                  <input
                    type="text"
                    value={repayNotes}
                    onChange={e => setRepayNotes(e.target.value)}
                    placeholder="e.g. M-Pesa Code: QWE892182 or cashier note"
                    className={`w-full px-3.5 py-2 rounded-xl text-xs font-semibold outline-none border transition-all ${inputBg}`}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedLoanForRepayment(null)}
                    className={`w-1/3 py-2.5 rounded-2xl border text-xs font-bold ${
                      isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingRepayment || (isSplitRepay ? (Number(splitAmountA) + Number(splitAmountB)) <= 0 : repayAmount <= 0)}
                    className="w-2/3 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>{isSubmittingRepayment ? 'Recording...' : `Confirm & Receive ${formatTZS(isSplitRepay ? (Number(splitAmountA) + Number(splitAmountB)) : repayAmount)}`}</span>
                  </button>
                </div>
              </form>

            </div>
          </div>
        );
      })()}

      {/* MODAL 2: LOAN DETAILS & REPAYMENT LEDGER */}
      {selectedLoanForDetails && (() => {
        const meta = getLoanMeta(selectedLoanForDetails);
        const repayments = selectedLoanForDetails.loanRepayments || [];

        return (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className={`w-full max-w-xl rounded-3xl border shadow-2xl p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95 my-auto max-h-[90vh] flex flex-col ${cardBg}`}>
              
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
                <div className="flex items-center gap-2">
                  <Banknote className="w-5 h-5 text-blue-500" />
                  <h3 className={`text-base font-bold ${textTitle}`}>Loan Account Ledger & Statement</h3>
                </div>
                <button onClick={() => setSelectedLoanForDetails(null)} className="text-slate-400 hover:text-slate-200">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="space-y-4 overflow-y-auto pr-1 flex-1">
                {/* Account Details Box */}
                <div className={`p-4 rounded-2xl border space-y-2 text-xs ${
                  isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Customer Name:</span>
                      <span className={`font-black ${textTitle}`}>{getLoanCustomerName(selectedLoanForDetails)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Phone Number:</span>
                      <span className={`font-bold ${textTitle}`}>{getLoanCustomerPhone(selectedLoanForDetails) || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">National ID / NIN:</span>
                      <span className={`font-bold ${textTitle}`}>
                        {selectedLoanForDetails.loanNationalId || (selectedLoanForDetails as any).loan_national_id || (selectedLoanForDetails as any).loannationalid || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Payment Due Date:</span>
                      <span className={`font-black ${meta.isOverdue ? 'text-rose-500' : 'text-blue-500'}`}>
                        {meta.dueDate || selectedLoanForDetails.loanDueDate || (selectedLoanForDetails as any).loan_due_date || (selectedLoanForDetails as any).loanduedate || 'Open'}
                      </span>
                    </div>
                    {(selectedLoanForDetails.loanGuarantorName || (selectedLoanForDetails as any).loan_guarantor_name) && (
                      <div className="col-span-2 pt-1 border-t border-slate-200 dark:border-slate-700">
                        <span className="text-slate-400 block text-[10px]">Guarantor Details:</span>
                        <span className={`font-bold ${textTitle}`}>
                          {selectedLoanForDetails.loanGuarantorName || (selectedLoanForDetails as any).loan_guarantor_name} {(selectedLoanForDetails.loanGuarantorPhone || (selectedLoanForDetails as any).loan_guarantor_phone) ? `(${selectedLoanForDetails.loanGuarantorPhone || (selectedLoanForDetails as any).loan_guarantor_phone})` : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Financial Summary & Progress Meter */}
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
                      <div className="text-[10px] text-slate-400 font-bold">TOTAL SALE</div>
                      <div className={`font-black text-sm mt-0.5 ${textTitle}`}>{formatTZS(meta.total)}</div>
                    </div>
                    <div className="p-2.5 rounded-xl border bg-emerald-500/10 border-emerald-500/20 text-emerald-500">
                      <div className="text-[10px] font-bold">TOTAL PAID</div>
                      <div className="font-black text-sm mt-0.5">{formatTZS(meta.totalPaid)}</div>
                    </div>
                    <div className="p-2.5 rounded-xl border bg-amber-500/10 border-amber-500/20 text-amber-500">
                      <div className="text-[10px] font-bold">OUTSTANDING</div>
                      <div className="font-black text-sm mt-0.5">{formatTZS(meta.remainingBalance)}</div>
                    </div>
                  </div>

                  {/* Visual Repayment Progress Bar */}
                  <div className={`p-3 rounded-2xl border space-y-1.5 ${isDark ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex justify-between items-center text-[11px] font-bold">
                      <span className="flex items-center gap-1 text-slate-500">
                        <Activity className="w-3.5 h-3.5 text-blue-500" />
                        Repayment Progress
                      </span>
                      <span className={meta.remainingBalance <= 0 ? 'text-emerald-500 font-black' : 'text-blue-500 font-black'}>
                        {meta.total > 0 ? Math.min(100, Math.round((meta.totalPaid / meta.total) * 100)) : 100}% Paid
                      </span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 rounded-full ${
                          meta.remainingBalance <= 0 
                            ? 'bg-emerald-500' 
                            : meta.isOverdue 
                              ? 'bg-rose-500' 
                              : 'bg-gradient-to-r from-blue-500 to-emerald-500'
                        }`}
                        style={{ width: `${meta.total > 0 ? Math.min(100, (meta.totalPaid / meta.total) * 100) : 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-400">
                      <span>Deposit: {formatTZS(selectedLoanForDetails.downPayment || 0)}</span>
                      <span>
                        {meta.remainingBalance <= 0 
                          ? '✓ Fully Settled' 
                          : meta.isOverdue 
                            ? `⚠️ Overdue since ${meta.dueDate}` 
                            : `Due: ${meta.dueDate || 'Flexible'}`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Items on Loan */}
                <div className="space-y-1.5">
                  <h4 className={`text-xs font-bold uppercase tracking-wider ${textSub}`}>Items Purchased Under This Loan</h4>
                  <div className={`p-3 rounded-2xl border space-y-1.5 ${isDark ? 'bg-slate-800/30 border-slate-700/60' : 'bg-slate-50 border-slate-200'}`}>
                    {(selectedLoanForDetails.items || []).map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs">
                        <span className={`font-semibold ${textTitle}`}>{item.quantity}x {item.product.name}</span>
                        <span className="font-bold">{formatTZS(item.product.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Repayments History */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className={`text-xs font-bold uppercase tracking-wider ${textSub}`}>Repayments & Installments History</h4>
                    <span className="text-[10px] text-slate-400">{repayments.length} payment(s) logged</span>
                  </div>

                  {repayments.length === 0 ? (
                    <p className={`text-xs text-center py-4 italic ${textSub}`}>
                      No partial repayments logged yet after initial down payment.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {repayments.map((rep, idx) => (
                        <div
                          key={rep.id || idx}
                          className={`p-3 rounded-2xl border flex items-center justify-between gap-3 text-xs ${
                            isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-white border-slate-200'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-black text-emerald-500">+{formatTZS(rep.amount)}</span>
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-700'
                              }`}>
                                {rep.paymentMethod}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {formatToGMT3(rep.date)} · Cashier: {rep.recordedBy || 'Staff'}
                            </div>
                            {rep.notes && (
                              <div className={`text-[10px] mt-0.5 italic ${textSub}`}>
                                Ref: {rep.notes}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => handleSendWhatsAppRepaymentReceipt(selectedLoanForDetails, rep, meta.remainingBalance)}
                              className="p-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 transition-colors flex items-center gap-1 text-[10px] font-bold"
                              title="Share this installment receipt via WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Receipt</span>
                            </button>
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Buttons */}
              <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-200 dark:border-slate-800 shrink-0">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      const target = selectedLoanForDetails;
                      setSelectedLoanForDetails(null);
                      handleOpenEditCustomer(target);
                    }}
                    className="px-3 py-2 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-600/30 text-xs font-bold flex items-center gap-1"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Edit Customer & Deadline</span>
                  </button>

                  <button
                    onClick={() => {
                      const target = selectedLoanForDetails;
                      setSelectedLoanForDetails(null);
                      setLoanForDateExtension(target);
                      setNewDueDate(target.loanDueDate || todayStr);
                    }}
                    className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1 ${
                      isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Extend Date</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const target = selectedLoanForDetails;
                      setSelectedLoanForDetails(null);
                      onOpenPOSReceipt(target);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Receipt</span>
                  </button>

                  <button
                    onClick={() => setSelectedLoanForDetails(null)}
                    className={`px-4 py-2 rounded-xl border text-xs font-bold ${
                      isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    Close
                  </button>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* MODAL 3: EXTEND DUE DATE */}
      {loanForDateExtension && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-3xl border shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 ${cardBg}`}>
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <h3 className={`text-sm font-bold ${textTitle}`}>Adjust Loan Payment Deadline</h3>
              <button onClick={() => setLoanForDateExtension(null)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className={`block text-xs font-bold mb-1 ${textSub}`}>Select New Due Date</label>
                <input
                  type="date"
                  value={newDueDate}
                  onChange={e => setNewDueDate(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-bold outline-none border ${inputBg}`}
                />
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1 text-[10px]">
                <span className={`font-semibold ${textSub}`}>Add:</span>
                {[7, 14, 30, 60].map(days => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + days);
                      setNewDueDate(d.toISOString().split('T')[0]);
                    }}
                    className={`px-2 py-1 rounded-md border font-bold ${
                      isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    +{days}d
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setLoanForDateExtension(null)}
                className={`w-1/2 py-2 rounded-xl border text-xs font-bold ${
                  isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveExtendedDueDate}
                className="w-1/2 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/20"
              >
                Save Date
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: EDIT LOAN CUSTOMER & DEADLINE */}
      {loanForEditCustomer && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className={`w-full max-w-lg rounded-3xl border shadow-2xl p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95 my-auto max-h-[95vh] flex flex-col ${cardBg}`}>
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-2xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-base font-bold ${textTitle}`}>Edit Customer Info & Payment Deadline</h3>
                  <p className={`text-[11px] ${textSub}`}>Update debtor contact details, NIDA identity & loan due date.</p>
                </div>
              </div>
              <button
                onClick={() => setLoanForEditCustomer(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form */}
            <form onSubmit={handleSaveCustomerAndLoanInfo} className="space-y-4 overflow-y-auto pr-1 flex-1">
              
              {/* Customer Name */}
              <div>
                <label htmlFor="loan-edit-customer-name" className={`block text-xs font-bold mb-1 ${textSub}`}>Customer Full Name (Jina la Mteja) *</label>
                <input
                  id="loan-edit-customer-name"
                  type="text"
                  name="name"
                  autoComplete="name"
                  inputMode="text"
                  autoCapitalize="words"
                  spellCheck={false}
                  required
                  value={editCustomerName}
                  onChange={e => setEditCustomerName(e.target.value)}
                  placeholder="e.g. Juma Ally Mussa"
                  className={`w-full px-3.5 py-2.5 rounded-2xl text-xs font-bold outline-none border focus:border-blue-500 transition-all ${inputBg}`}
                />
              </div>

              {/* Customer Phone */}
              <div>
                <label htmlFor="loan-edit-customer-phone" className={`block text-xs font-bold mb-1 ${textSub}`}>Phone Number / WhatsApp (Namba ya Simu) *</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    id="loan-edit-customer-phone"
                    type="tel"
                    name="tel"
                    autoComplete="tel"
                    inputMode="tel"
                    required
                    value={editCustomerPhone}
                    onBlur={() => setEditCustomerPhone(formatTzPhone(editCustomerPhone))}
                    onChange={e => setEditCustomerPhone(e.target.value)}
                    placeholder="e.g. 0768 929 203 or +255 768 929 203"
                    className={`w-full pl-9 pr-3.5 py-2.5 rounded-2xl text-xs font-bold outline-none border focus:border-blue-500 transition-all ${inputBg}`}
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Used for sending WhatsApp balance reminders and SMS statements.</p>
              </div>

              {/* Loan Payment Deadline / Due Date */}
              <div className={`p-3.5 rounded-2xl border space-y-2.5 ${isDark ? 'bg-amber-950/20 border-amber-900/40 text-amber-200' : 'bg-amber-50/50 border-amber-200 text-amber-900'}`}>
                <div className="flex items-center justify-between">
                  <label htmlFor="loan-edit-due-date" className="text-xs font-bold flex items-center gap-1.5">
                    <CalendarClock className="w-4 h-4 text-amber-500" />
                    <span>Loan Payment Deadline (Tarehe ya Mwisho wa Malipo) *</span>
                  </label>
                  {editLoanDueDate && (
                    <span className="text-[10px] font-black bg-amber-500/20 px-2 py-0.5 rounded-md">
                      {editLoanDueDate}
                    </span>
                  )}
                </div>

                <input
                  id="loan-edit-due-date"
                  type="date"
                  name="due-date"
                  required
                  value={editLoanDueDate}
                  onChange={e => setEditLoanDueDate(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-2xl text-xs font-black outline-none border focus:border-amber-500 transition-all ${inputBg}`}
                />

                {/* Quick Presets */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold opacity-75">Quick Presets:</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { label: '+7 Days', days: 7 },
                      { label: '+14 Days (2 Wks)', days: 14 },
                      { label: '+30 Days (1 Month)', days: 30 },
                      { label: '+60 Days (2 Mos)', days: 60 },
                      { label: '+90 Days (3 Mos)', days: 90 },
                    ].map(preset => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          const d = new Date();
                          d.setDate(d.getDate() + preset.days);
                          setEditLoanDueDate(d.toISOString().split('T')[0]);
                        }}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all ${
                          isDark ? 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date();
                        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                        setEditLoanDueDate(lastDay.toISOString().split('T')[0]);
                      }}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all ${
                        isDark ? 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      End of Month
                    </button>
                  </div>
                </div>
              </div>

              {/* National ID / NIN */}
              <div>
                <label htmlFor="loan-edit-national-id" className={`block text-xs font-bold mb-1 ${textSub}`}>Customer National ID (NIDA) / Identity (Optional)</label>
                <div className="relative">
                  <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    id="loan-edit-national-id"
                    type="text"
                    name="national-id"
                    autoComplete="off"
                    inputMode="text"
                    spellCheck={false}
                    value={editLoanNationalId}
                    onChange={e => setEditLoanNationalId(e.target.value)}
                    placeholder="e.g. 19900101-12345-67890"
                    className={`w-full pl-9 pr-3.5 py-2.5 rounded-2xl text-xs font-bold outline-none border focus:border-blue-500 transition-all ${inputBg}`}
                  />
                </div>
              </div>

              {/* Guarantor Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="loan-edit-guarantor-name" className={`block text-xs font-bold mb-1 ${textSub}`}>Guarantor Name (Mdhamini)</label>
                  <input
                    id="loan-edit-guarantor-name"
                    type="text"
                    name="guarantor-name"
                    autoComplete="name"
                    inputMode="text"
                    autoCapitalize="words"
                    spellCheck={false}
                    value={editLoanGuarantorName}
                    onChange={e => setEditLoanGuarantorName(e.target.value)}
                    placeholder="Full Name"
                    className={`w-full px-3.5 py-2 rounded-xl text-xs font-semibold outline-none border focus:border-blue-500 transition-all ${inputBg}`}
                  />
                </div>
                <div>
                  <label htmlFor="loan-edit-guarantor-phone" className={`block text-xs font-bold mb-1 ${textSub}`}>Guarantor Phone</label>
                  <input
                    id="loan-edit-guarantor-phone"
                    type="tel"
                    name="guarantor-tel"
                    autoComplete="tel"
                    inputMode="tel"
                    value={editLoanGuarantorPhone}
                    onBlur={() => setEditLoanGuarantorPhone(formatTzPhone(editLoanGuarantorPhone))}
                    onChange={e => setEditLoanGuarantorPhone(e.target.value)}
                    placeholder="07XX XXX XXX"
                    className={`w-full px-3.5 py-2 rounded-xl text-xs font-semibold outline-none border focus:border-blue-500 transition-all ${inputBg}`}
                  />
                </div>
              </div>

              {/* Loan Notes */}
              <div>
                <label className={`block text-xs font-bold mb-1 ${textSub}`}>Loan / Agreement Notes</label>
                <textarea
                  rows={2}
                  value={editLoanNotes}
                  onChange={e => setEditLoanNotes(e.target.value)}
                  placeholder="Terms, collateral, repayment schedule notes..."
                  className={`w-full px-3.5 py-2 rounded-xl text-xs font-medium outline-none border focus:border-blue-500 transition-all resize-none ${inputBg}`}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setLoanForEditCustomer(null)}
                  className={`w-1/3 py-2.5 rounded-2xl border text-xs font-bold ${
                    isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingCustomerInfo}
                  className="w-2/3 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-extrabold text-xs shadow-lg shadow-blue-600/30 flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSavingCustomerInfo ? 'Saving Changes...' : 'Save Customer & Loan Info'}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* WhatsApp Receipt Prompt Modal */}
      {whatsappPromptModal.isOpen && whatsappPromptModal.tx && whatsappPromptModal.rep && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-3xl p-6 shadow-2xl border ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 font-bold">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base">Send WhatsApp Receipt</h3>
                  <p className={`text-xs ${textSub}`}>Installment saved successfully!</p>
                </div>
              </div>
              <button
                onClick={() => setWhatsappPromptModal({ isOpen: false, tx: null, rep: null, currentBal: 0, phone: '' })}
                className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className={`text-sm font-medium mb-4 ${textSub}`}>
              Installment saved! Would you like to send a payment receipt to customer WhatsApp ({whatsappPromptModal.phone || 'Enter Phone'}) now?
            </p>

            <div className="mb-4 flex items-center justify-between">
              <div>
                <label className={`block text-xs font-bold mb-1 ${textSub}`}>Customer WhatsApp Phone Number</label>
                <input
                  type="tel"
                  value={whatsappPromptModal.phone}
                  onChange={e => setWhatsappPromptModal({ ...whatsappPromptModal, phone: e.target.value })}
                  placeholder="e.g. 255759021034"
                  className={`w-full px-3.5 py-2 rounded-xl text-sm font-semibold outline-none border focus:border-emerald-500 transition-all ${inputBg}`}
                />
              </div>
              <div className="pl-3">
                <label className={`block text-[10px] font-bold mb-1 ${textSub}`}>Official Stamp</label>
                <button
                  type="button"
                  onClick={() => setShowLoanReceiptStamp(!showLoanReceiptStamp)}
                  className={`px-3 py-2 rounded-xl font-extrabold text-xs flex items-center gap-1.5 border transition-all ${
                    showLoanReceiptStamp ? 'bg-blue-600 text-white border-blue-500 shadow-sm' : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  <Stamp className="w-3.5 h-3.5" />
                  <span>{showLoanReceiptStamp ? 'ON' : 'OFF'}</span>
                </button>
              </div>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                disabled={isGeneratingReceiptImg}
                onClick={() => {
                  if (whatsappPromptModal.tx && whatsappPromptModal.rep) {
                    handleGenerateAndShareReceiptImage(
                      whatsappPromptModal.tx,
                      whatsappPromptModal.rep,
                      whatsappPromptModal.currentBal
                    );
                  }
                }}
                className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>📸</span>
                <span>{isGeneratingReceiptImg ? 'Generating Receipt Image...' : 'Copy / Share Receipt Image (PNG)'}</span>
              </button>

              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setWhatsappPromptModal({ isOpen: false, tx: null, rep: null, currentBal: 0, phone: '' })}
                  className={`flex-1 py-3 rounded-2xl border text-xs font-bold ${
                    isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  Skip / Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (whatsappPromptModal.tx && whatsappPromptModal.rep) {
                      handleSendWhatsAppRepaymentReceipt(
                        whatsappPromptModal.tx,
                        whatsappPromptModal.rep,
                        whatsappPromptModal.currentBal,
                        whatsappPromptModal.phone
                      );
                    }
                    setWhatsappPromptModal({ isOpen: false, tx: null, rep: null, currentBal: 0, phone: '' });
                  }}
                  className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Send WhatsApp Text</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: WHATSAPP REMINDER TEMPLATE SELECTOR */}
      {whatsappReminderModal.isOpen && whatsappReminderModal.tx && (() => {
        const tx = whatsappReminderModal.tx;
        const meta = getLoanMeta(tx);
        const custName = getLoanCustomerName(tx);
        const custPhone = getLoanCustomerPhone(tx);
        const guarantorPhone = tx.loanGuarantorPhone || (tx as any).loan_guarantor_phone || '';
        const guarantorName = tx.loanGuarantorName || (tx as any).loan_guarantor_name || 'Mdhamini';

        const templates = [
          {
            id: 'polite' as const,
            title: 'Kawaida / Polite Reminder',
            desc: 'Gentle friendly reminder for upcoming or active debt installment.',
            icon: '🌸',
            color: 'emerald'
          },
          {
            id: 'today' as const,
            title: 'Tarehe ya Mwisho Leo / Due Today',
            desc: 'Urgent notice that payment deadline is scheduled for today.',
            icon: '🔔',
            color: 'amber'
          },
          {
            id: 'urgent' as const,
            title: 'Deni Limepitiliza / Overdue Notice',
            desc: 'Final legal notice with 24-hour settlement deadline & consequences.',
            icon: '🚨',
            color: 'rose'
          },
          {
            id: 'guarantor' as const,
            title: 'Taarifa kwa Mdhamini / Guarantor Alert',
            desc: `Alert sent directly to guarantor (${guarantorName || 'Mdhamini'}) about outstanding debt.`,
            icon: '🤝',
            color: 'blue'
          }
        ];

        return (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className={`w-full max-w-lg rounded-3xl border shadow-2xl p-5 sm:p-6 space-y-5 animate-in fade-in zoom-in-95 my-auto ${cardBg}`}>
              
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className={`text-base font-bold ${textTitle}`}>WhatsApp Reminder Template</h3>
                    <p className={`text-[11px] ${textSub}`}>Select localized Swahili message template for {custName}.</p>
                  </div>
                </div>
                <button
                  onClick={() => setWhatsappReminderModal({ isOpen: false, tx: null, template: 'polite' })}
                  className="p-1 rounded-xl text-slate-400 hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Debt Overview Mini-Bar */}
              <div className={`p-3 rounded-2xl border flex justify-between items-center text-xs ${
                isDark ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'
              }`}>
                <div>
                  <div className={`font-black ${textTitle}`}>{custName}</div>
                  <div className={`text-[11px] ${textSub}`}>Phone: {custPhone || 'N/A'} {guarantorPhone ? `• Mdhamini: ${guarantorPhone}` : ''}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Balance</div>
                  <div className="text-sm font-black text-rose-500 font-mono">{formatTZS(meta.remainingBalance)}</div>
                </div>
              </div>

              {/* Template Options */}
              <div className="space-y-2">
                <label className={`block text-xs font-bold ${textSub}`}>Select Message Type:</label>
                <div className="grid grid-cols-1 gap-2">
                  {templates.map(t => {
                    const isSelected = whatsappReminderModal.template === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setWhatsappReminderModal(prev => ({ ...prev, template: t.id }))}
                        className={`p-3 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                          isSelected
                            ? 'bg-emerald-600/10 border-emerald-500 ring-2 ring-emerald-500/20'
                            : isDark
                            ? 'bg-slate-800/60 border-slate-700/80 hover:bg-slate-800'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-xl shrink-0 mt-0.5">{t.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-black ${isSelected ? 'text-emerald-500' : textTitle}`}>{t.title}</span>
                            {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                          </div>
                          <p className={`text-[11px] mt-0.5 ${textSub}`}>{t.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setWhatsappReminderModal({ isOpen: false, tx: null, template: 'polite' })}
                  className={`w-1/3 py-3 rounded-2xl border text-xs font-bold ${
                    isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleSendWhatsAppReminder(tx, whatsappReminderModal.template);
                    setWhatsappReminderModal({ isOpen: false, tx: null, template: 'polite' });
                  }}
                  className="w-2/3 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Open WhatsApp & Send</span>
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* Hidden Receipt Element for Canvas Image Generation */}
      <div className="absolute -left-[9999px] top-0 pointer-events-none opacity-0">
        {whatsappPromptModal.isOpen && whatsappPromptModal.tx && whatsappPromptModal.rep && (
          <div 
            ref={loanReceiptCanvasRef}
            className="w-[360px] bg-white text-black p-5 font-mono text-[11.5px] leading-tight"
            style={{ fontFamily: "'Courier New', Courier, monospace", fontWeight: 700 }}
          >
            <div className="text-center pb-2 border-b-2 border-black">
              <h2 className="font-black text-sm uppercase">{storeSettings?.storeName || 'GENUINE ELECTRONICS'}</h2>
              <div className="text-xs font-black uppercase tracking-wider py-0.5">RISITI YA MALIPO YA MKOPO (INSTALLMENT RECEIPT)</div>
              <p className="text-[10px]">{storeSettings?.address || 'Kariakoo, Dar es Salaam'}</p>
              <p className="text-[10px]">TEL: {storeSettings?.phone || '+255 768 929 203'}</p>
            </div>
            <div className="py-2 border-b-2 border-dashed border-black space-y-1 text-[11px]">
              <div className="flex justify-between"><span>MTEJA:</span><span className="font-black">{getLoanCustomerName(whatsappPromptModal.tx)}</span></div>
              <div className="flex justify-between"><span>SIMU:</span><span className="font-black">{whatsappPromptModal.phone || getLoanCustomerPhone(whatsappPromptModal.tx)}</span></div>
              <div className="flex justify-between"><span>AKAUNTI / RISITI:</span><span className="font-black">{whatsappPromptModal.tx.id}</span></div>
              <div className="flex justify-between"><span>TAREHE:</span><span className="font-black">{formatToGMT3(whatsappPromptModal.rep.date)}</span></div>
              <div className="flex justify-between"><span>MPOKAJI:</span><span className="font-black">{whatsappPromptModal.rep.recordedBy || activeCashierName || 'Staff'}</span></div>
            </div>
            <div className="py-2 border-b-2 border-dashed border-black space-y-1 text-[11.5px]">
              <div className="flex justify-between font-black border-b border-black pb-1">
                <span>MAELEZO / ITEM</span>
                <span>KIASI (TZS)</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Malipo ya Awamu (Installment)</span>
                <span className="font-black">{formatTZS(whatsappPromptModal.rep.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Njia ya Malipo: {whatsappPromptModal.rep.paymentMethod}</span>
              </div>
            </div>
            <div className="py-2 border-b-2 border-black space-y-1 text-[11.5px]">
              <div className="flex justify-between font-black text-xs">
                <span>SALIO LILILOBAKI:</span>
                <span>{formatTZS(whatsappPromptModal.currentBal)}</span>
              </div>
              {whatsappPromptModal.currentBal <= 0 ? (
                <div className="text-center font-black text-emerald-700 py-1 uppercase">*** DENI LIMEKAMILIKA KULIPWA ***</div>
              ) : (
                <div className="flex justify-between text-[10.5px]">
                  <span>Tarehe ya Mwisho (Due Date):</span>
                  <span>{getLoanDueDate(whatsappPromptModal.tx) || 'N/A'}</span>
                </div>
              )}
            </div>

            {/* Official Digital Stamp */}
            {showLoanReceiptStamp && (
              <div className="py-2.5 border-b-2 border-dashed border-black flex justify-center">
                <div style={{ border: '2px dashed #0033a0', color: '#0033a0', backgroundColor: 'rgba(239, 246, 255, 0.8)', padding: '6px 12px', textAlign: 'center', borderRadius: '8px', transform: 'rotate(-1.5deg)' }}>
                  <p style={{ fontSize: '9px', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase' }}>★ {storeSettings?.storeName || 'GENUINE ELECTRONICS'} ★</p>
                  <p style={{ fontSize: '10.5px', fontWeight: 900, textTransform: 'uppercase', margin: '2px 0' }}>
                    {whatsappPromptModal.currentBal <= 0 ? 'IMELIPWA KIKAMILIFU • PAID' : 'OFFICIAL INSTALLMENT • PAID'}
                  </p>
                  <p style={{ fontSize: '8.5px', fontFamily: 'monospace', fontWeight: 900 }}>
                    TAREHE: {formatToGMT3(whatsappPromptModal.rep.date).split(',')[0]} • VERIFIED
                  </p>
                </div>
              </div>
            )}

            {/* Online Receipt Verification QR Code */}
            <div className="text-center pt-2 pb-1 border-b border-black">
              <div className="flex justify-center my-1">
                <div className="p-1 bg-white border border-black inline-block">
                  <QRCodeSVG 
                    value={buildReceiptVerificationUrl({
                      orderNo: whatsappPromptModal.tx.id,
                      receiptNo: whatsappPromptModal.tx.id,
                      totalAmount: whatsappPromptModal.rep.amount
                    })} 
                    size={64} 
                    level="M" 
                  />
                </div>
              </div>
              <p className="text-[9px] font-black uppercase">UTHIBITISHO WA RISITI ONLINE</p>
              <p className="text-[8px] font-mono font-bold">SCAN TO VERIFY RECEIPT</p>
            </div>

            <div className="text-center pt-3 text-[10px] space-y-0.5">
              <p className="font-black">Asante kwa uaminifu wako!</p>
              <p>Mawasiliano: {storeSettings?.phone || '+255 768 929 203'}</p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
