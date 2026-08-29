import { POSTransaction, formatTZS, formatToGMT3 } from '../types';
import { getLoanCustomerName, getLoanCustomerPhone, getLoanDueDate, isLoanTransaction, computeLoanMeta } from '../utils/loanUtils';

export interface OverdueLoanItem {
  id: string;
  receiptNumber: string;
  customerName: string;
  customerPhone?: string;
  productSummary: string;
  totalAmount: number;
  paidAmount: number;
  remainingBalance: number;
  saleDate: string;
  dueDate: string;
  dueTime?: string;
  dueDateTimeStr: string;
  dueTimestamp: number;
  overdueDurationText: string;
  isOverdue: boolean;
  rawTransaction: POSTransaction;
}

/**
 * Parse loan due date and time into a valid Date object.
 */
export function parseLoanDueDateTime(
  dueDate?: string, 
  dueTime?: string, 
  dueDateTime?: string
): Date | null {
  if (dueDateTime) {
    const d = new Date(dueDateTime);
    if (!isNaN(d.getTime())) return d;
  }

  if (!dueDate) return null;

  // If dueDate already contains full ISO or space datetime
  if (dueDate.includes('T') || (dueDate.includes(' ') && dueDate.length > 10)) {
    const d = new Date(dueDate);
    if (!isNaN(d.getTime())) return d;
  }

  const timePart = dueTime && dueTime.trim().length >= 4 
    ? (dueTime.length === 5 ? `${dueTime}:00` : dueTime) 
    : '23:59:59';

  const combined = `${dueDate}T${timePart}`;
  const d = new Date(combined);
  if (!isNaN(d.getTime())) return d;

  const fallback = new Date(dueDate);
  return !isNaN(fallback.getTime()) ? fallback : null;
}

/**
 * Check if the loan's agreed deadline/time limit has passed.
 */
export function isLoanTimeExceeded(
  dueDate?: string, 
  dueTime?: string, 
  dueDateTime?: string
): boolean {
  const target = parseLoanDueDateTime(dueDate, dueTime, dueDateTime);
  if (!target) return false;
  return Date.now() > target.getTime();
}

/**
 * Format relative duration text for overdue loans (e.g., "Exceeded by 3 hours", "Exceeded by 2 days").
 */
export function getOverdueDurationText(targetDate: Date): string {
  const diffMs = Date.now() - targetDate.getTime();
  if (diffMs <= 0) {
    const remainingMs = Math.abs(diffMs);
    const hours = Math.floor(remainingMs / (1000 * 60 * 60));
    const mins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `Due in ${days} day${days > 1 ? 's' : ''}`;
    }
    if (hours > 0) return `Due in ${hours}h ${mins}m`;
    return `Due in ${mins}m`;
  }

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    const remHours = diffHours % 24;
    return `Exceeded by ${diffDays} day${diffDays > 1 ? 's' : ''}${remHours > 0 ? ` ${remHours}h` : ''}`;
  }
  if (diffHours > 0) {
    const remMins = diffMinutes % 60;
    return `Exceeded by ${diffHours} hour${diffHours > 1 ? 's' : ''}${remMins > 0 ? ` ${remMins}m` : ''}`;
  }
  return `Exceeded by ${Math.max(1, diffMinutes)} minute${diffMinutes > 1 ? 's' : ''}`;
}

/**
 * Extract summary string of purchased products for the transaction.
 */
export function getTransactionProductSummary(tx: POSTransaction): string {
  if (!tx.items || tx.items.length === 0) {
    return 'Electronics / Merchandise';
  }
  const names = tx.items.map(i => i.product?.name || 'Product').filter(Boolean);
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names[0]}, ${names[1]} (+${names.length - 2} more)`;
}

/**
 * Calculate financial totals and overdue state for a transaction.
 */
export function analyzeLoanTransaction(tx: POSTransaction): OverdueLoanItem | null {
  if (!isLoanTransaction(tx)) {
    return null;
  }

  const meta = computeLoanMeta(tx);

  if (meta.remainingBalance <= 0) {
    return null; // Fully settled
  }

  const dueDateStr = meta.dueDate || getLoanDueDate(tx);
  const dueTime = tx.loanDueTime || (tx as any).loan_due_time;
  const dueDateTime = (tx as any).loan_due_date_time || tx.loanDueDateTime;

  const targetDate = parseLoanDueDateTime(dueDateStr, dueTime, dueDateTime);
  const isOverdue = targetDate ? Date.now() > targetDate.getTime() : meta.isOverdue;
  const overdueDurationText = targetDate ? getOverdueDurationText(targetDate) : 'No time limit set';

  const customerName = getLoanCustomerName(tx);
  const customerPhone = getLoanCustomerPhone(tx);
  const productSummary = getTransactionProductSummary(tx);

  const dueTimeDisplay = dueTime ? ` ${dueTime}` : '';
  const dueDateTimeStr = dueDateStr 
    ? `${dueDateStr}${dueTimeDisplay}`
    : 'No Date';

  return {
    id: tx.id,
    receiptNumber: tx.receiptNumber || tx.id,
    customerName,
    customerPhone,
    productSummary,
    totalAmount: meta.total,
    paidAmount: meta.totalPaid,
    remainingBalance: meta.remainingBalance,
    saleDate: tx.createdAt ? formatToGMT3(tx.createdAt) : 'Recent Sale',
    dueDate: dueDateStr,
    dueTime,
    dueDateTimeStr,
    dueTimestamp: targetDate ? targetDate.getTime() : 0,
    overdueDurationText,
    isOverdue,
    rawTransaction: tx
  };
}

/**
 * Scan all transactions and return only those with overdue balances.
 */
export function scanOverdueLoansList(transactions: POSTransaction[]): OverdueLoanItem[] {
  const list: OverdueLoanItem[] = [];
  for (const tx of transactions) {
    const loan = analyzeLoanTransaction(tx);
    if (loan && loan.isOverdue && loan.remainingBalance > 0) {
      list.push(loan);
    }
  }
  // Sort by most critically overdue first (earliest due timestamp)
  return list.sort((a, b) => a.dueTimestamp - b.dueTimestamp);
}

/**
 * Play a high-contrast synthesizer throat alert tone using the Web Audio API (browser safe, no external files needed).
 */
export function playLoanAlertChime(): void {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    
    // Play a distinct two-tone alert: 520Hz then 780Hz
    const now = ctx.currentTime;
    
    // Tone 1
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.25);

    // Tone 2
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880, now + 0.18); // A5
    gain2.gain.setValueAtTime(0.2, now + 0.18);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.18);
    osc2.stop(now + 0.55);

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 1000);
  } catch (e) {
    // Audio Context might be locked by browser autoplay policy before user interaction
    console.debug('Loan alert chime skipped (waiting for user interaction)');
  }
}

/**
 * Build professional Swahili and English reminder templates for overdue loans.
 */
export function buildLoanNotificationCopy(loan: OverdueLoanItem): {
  headline: string;
  body: string;
  whatsappMessage: string;
} {
  const headline = `Overdue Loan Alert: ${formatTZS(loan.remainingBalance)} unpaid`;
  const body = `There is an unpaid amount of ${formatTZS(loan.remainingBalance)} for ${loan.productSummary} by ${loan.customerName} since ${loan.dueDateTimeStr}. The agreed time limit has exceeded (${loan.overdueDurationText}).`;
  
  const whatsappMessage = encodeURIComponent(
    `Habari ${loan.customerName},\n\n` +
    `Huu ni ukumbusho rasmi kutoka Genuine Electronics Ltd kuhusu ununuzi wako wa "${loan.productSummary}" (Risiti Na: ${loan.receiptNumber}).\n\n` +
    `📌 Kiasi Kilichobaki (Unpaid Balance): ${formatTZS(loan.remainingBalance)}\n` +
    `⏰ Tarehe na Muda wa Marejesho Uliopita: ${loan.dueDateTimeStr}\n` +
    `⚠️ Hali: Muda wa malipo umekwisha pitiliza (${loan.overdueDurationText}).\n\n` +
    `Tafadhali kamilisha malipo yako kupitia Lipa Namba yetu (M-Pesa / Mixx By Yas: 0768 929 203) au fika dukani kwetu Kariakoo. Kwa maswali tupigie: +255 768 929 203.\n\n` +
    `Asante kwa uaminifu wako,\nGenuine Electronics Tanzania`
  );

  return {
    headline,
    body,
    whatsappMessage
  };
}
