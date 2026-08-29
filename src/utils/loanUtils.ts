import { POSTransaction } from '../types';

/**
 * Robustly resolves the customer / debtor name for any transaction or loan record.
 * Handles diverse database formats, object shapes, fallback fields, and guarantors.
 */
export function getLoanCustomerName(tx: Partial<POSTransaction> & Record<string, any> | null | undefined): string {
  if (!tx) return 'Walk-in Customer';

  // 1. Direct customer name fields
  const directName = tx.customerName || tx.customer_name || tx.clientName || tx.client_name || tx.buyerName || tx.buyer_name;
  if (
    directName &&
    typeof directName === 'string' &&
    directName.trim() &&
    String(directName || '').trim().toLowerCase() !== 'walk-in customer' &&
    String(directName || '').trim().toLowerCase() !== 'walk-in' &&
    !directName.trim().startsWith('Debtor (') &&
    !directName.trim().startsWith('Customer (')
  ) {
    return directName.trim();
  }

  // 2. Customer object
  if (tx.customer) {
    if (typeof tx.customer === 'string' && tx.customer.trim() && tx.customer.trim().toLowerCase() !== 'walk-in customer' && tx.customer.trim().toLowerCase() !== 'walk-in') {
      return tx.customer.trim();
    }
    if (typeof tx.customer === 'object') {
      const cName = tx.customer.name || tx.customer.fullName || tx.customer.customerName || tx.customer.full_name;
      if (cName && typeof cName === 'string' && cName.trim() && cName.trim().toLowerCase() !== 'walk-in customer') {
        return cName.trim();
      }
    }
  }

  // 3. Shipping address object or string
  if (tx.shippingAddress) {
    if (typeof tx.shippingAddress === 'object') {
      const sName = (tx.shippingAddress as any).fullName || (tx.shippingAddress as any).name || (tx.shippingAddress as any).customerName;
      if (sName && typeof sName === 'string' && sName.trim()) {
        return sName.trim();
      }
    } else if (typeof tx.shippingAddress === 'string' && tx.shippingAddress.trim() && !tx.shippingAddress.startsWith('{')) {
      const parts = tx.shippingAddress.split(',');
      if (parts[0] && parts[0].trim().length > 2 && !String(parts[0] || '').toLowerCase().includes('street') && !String(parts[0] || '').toLowerCase().includes('house')) {
        return parts[0].trim();
      }
    }
  }

  // 4. Fallback to directName if provided
  if (directName && typeof directName === 'string' && directName.trim() && String(directName || '').trim().toLowerCase() !== 'walk-in') {
    return directName.trim();
  }

  // 5. Fallback to Guarantor Name if available
  if (tx.loanGuarantorName && typeof tx.loanGuarantorName === 'string' && tx.loanGuarantorName.trim()) {
    return `${tx.loanGuarantorName.trim()} (Guarantor)`;
  }

  return 'Walk-in Customer';
}

/**
 * Robustly resolves the customer phone number for any loan transaction record.
 */
export function getLoanCustomerPhone(tx: Partial<POSTransaction> & Record<string, any> | null | undefined): string {
  if (!tx) return '';
  const phone =
    tx.customerPhone ||
    tx.customer_phone ||
    tx.customerphone ||
    (typeof tx.customer === 'object' ? (tx.customer as any)?.phone || (tx.customer as any)?.telephone : '') ||
    tx.loanGuarantorPhone ||
    tx.loan_guarantor_phone ||
    tx.phone ||
    '';
  return typeof phone === 'string' ? phone.trim() : String(phone || '').trim();
}

/**
 * Robustly resolves the payment deadline / due date for any transaction or loan record.
 * Handles ISO strings, dates, YYYY-MM-DD, and snake_case / camelCase column variations.
 */
export function getLoanDueDate(tx: Partial<POSTransaction> & Record<string, any> | null | undefined): string {
  if (!tx) return '';
  if (tx.isLoan === false || tx.is_loan === false) return '';
  if (!isLoanTransaction(tx) && !tx.loanDueDate && !tx.loan_due_date && !tx.loanduedate) return '';

  const dateVal =
    tx.loanDueDate ||
    tx.loan_due_date ||
    tx.loanduedate ||
    tx.loanDueDateTime ||
    tx.loan_due_date_time ||
    tx.dueDate ||
    tx.due_date ||
    (tx.metadata && (tx.metadata.loanDueDate || tx.metadata.loan_due_date)) ||
    '';

  const rawStr = typeof dateVal === 'string' ? dateVal.trim() : String(dateVal || '').trim();
  if (!rawStr) return '';

  // Extract YYYY-MM-DD if ISO timestamp
  if (rawStr.includes('T')) {
    return rawStr.split('T')[0];
  }
  return rawStr;
}

/**
 * Robustly resolves National ID / NIN for a loan transaction.
 */
export function getLoanNationalId(tx: Partial<POSTransaction> & Record<string, any> | null | undefined): string {
  if (!tx) return '';
  if (tx.isLoan === false || tx.is_loan === false) return '';
  const val =
    tx.loanNationalId ||
    tx.loan_national_id ||
    tx.loannationalid ||
    tx.nationalId ||
    tx.national_id ||
    '';
  return typeof val === 'string' ? val.trim() : String(val || '').trim();
}

/**
 * Robustly resolves Guarantor information for a loan transaction.
 */
export function getLoanGuarantor(tx: Partial<POSTransaction> & Record<string, any> | null | undefined): { name: string; phone: string } {
  if (!tx) return { name: '', phone: '' };
  if (tx.isLoan === false || tx.is_loan === false) return { name: '', phone: '' };
  const name = String(
    tx.loanGuarantorName ||
    tx.loan_guarantor_name ||
    tx.loanguarantorname ||
    tx.guarantorName ||
    tx.guarantor_name ||
    ''
  ).trim();

  const phone = String(
    tx.loanGuarantorPhone ||
    tx.loan_guarantor_phone ||
    tx.loanguarantorphone ||
    tx.guarantorPhone ||
    tx.guarantor_phone ||
    ''
  ).trim();

  return { name, phone };
}

/**
 * Determines whether a transaction or order is a credit / loan / debt contract or has partial payment balance.
 */
export function isLoanTransaction(tx: Partial<POSTransaction> & Record<string, any> | null | undefined): boolean {
  if (!tx) return false;

  const pm = String(tx.paymentMethod || tx.payment_method || '').toLowerCase();
  const isCreditCard = pm.includes('credit card') || pm.includes('card') || pm.includes('visa') || pm.includes('mastercard');
  const isStandardCashOrMobile = pm.includes('cash') || pm.includes('m-pesa') || pm.includes('mpesa') || pm.includes('tigo') || pm.includes('airtel') || pm.includes('halo') || pm.includes('bank') || pm.includes('transfer') || pm.includes('orbi');

  const hasExplicitLoanKeyword = 
    pm.includes('loan') ||
    pm.includes('installment') ||
    pm.includes('mkopo') ||
    pm.includes('debt') ||
    pm.includes('deni') ||
    pm.includes('store credit') ||
    (pm.includes('credit') && !isCreditCard);

  if ((isCreditCard || isStandardCashOrMobile) && !hasExplicitLoanKeyword) {
    return false;
  }

  if (tx.isLoan === false || tx.is_loan === false) return false;
  if (tx.isLoan === true || tx.is_loan === true) return true;

  if (hasExplicitLoanKeyword) {
    return true;
  }

  const ps = String(tx.paymentStatus || tx.payment_status || '').toLowerCase();
  if (ps === 'partial' || ps.includes('partial')) return true;

  const loanBal = Number(tx.loanBalance ?? tx.loan_balance ?? tx.outstandingBalance ?? tx.outstanding_balance ?? 0);
  if (loanBal > 0) return true;

  const reps = tx.loanRepayments || tx.loan_repayments || tx.partialPayments || tx.partial_payments;
  if (Array.isArray(reps) && reps.length > 0) return true;

  return false;
}

export interface LoanMeta {
  total: number;
  initialDeposit: number;
  repaymentsSum: number;
  totalPaid: number;
  remainingBalance: number;
  dueDate: string;
  nationalId: string;
  guarantorName: string;
  guarantorPhone: string;
  isOverdue: boolean;
  computedStatus: 'paid' | 'partial' | 'unpaid' | 'overdue';
}

/**
 * Calculates current loan balance, repayments sum, status, and overdue markers.
 */
export function computeLoanMeta(tx: Partial<POSTransaction> & Record<string, any> | null | undefined): LoanMeta {
  if (!tx) {
    return {
      total: 0,
      initialDeposit: 0,
      repaymentsSum: 0,
      totalPaid: 0,
      remainingBalance: 0,
      dueDate: '',
      nationalId: '',
      guarantorName: '',
      guarantorPhone: '',
      isOverdue: false,
      computedStatus: 'unpaid'
    };
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const total = Number(tx.total ?? tx.totalAmount ?? tx.total_amount ?? 0);

  const repaymentsList: any[] = tx.loanRepayments || tx.loan_repayments || tx.partialPayments || tx.partial_payments || [];
  const repaymentsSum = repaymentsList.reduce((sum: number, r: any) => sum + (Number(r?.amount) || 0), 0);

  // Consider downPayment or paidAmount if repaymentsList is empty
  let initialDeposit = Number(tx.downPayment ?? tx.down_payment ?? 0);
  if (initialDeposit === 0 && tx.paidAmount !== undefined) {
    initialDeposit = Math.max(0, Number(tx.paidAmount) - repaymentsSum);
  } else if (initialDeposit === 0 && tx.paid_amount !== undefined) {
    initialDeposit = Math.max(0, Number(tx.paid_amount) - repaymentsSum);
  }

  const totalPaid = Math.min(total, initialDeposit + repaymentsSum);
  const calculatedRemBal = Math.max(0, total - totalPaid);

  let remainingBalance = calculatedRemBal;
  if (repaymentsSum === 0 && initialDeposit === 0) {
    const rawBal = tx.loanBalance ?? tx.loan_balance ?? tx.outstandingBalance ?? tx.outstanding_balance;
    if (rawBal !== undefined && rawBal !== null) {
      remainingBalance = Number(rawBal);
    }
  }

  const dueDate = getLoanDueDate(tx);
  const nationalId = getLoanNationalId(tx);
  const guarantor = getLoanGuarantor(tx);

  const isOverdue = Boolean(dueDate && dueDate < todayStr && remainingBalance > 0);

  let computedStatus: 'paid' | 'partial' | 'unpaid' | 'overdue' = 'unpaid';
  if (remainingBalance <= 0 && (total > 0 || initialDeposit > 0 || repaymentsSum > 0 || tx.paymentStatus === 'Paid' || tx.loanStatus === 'paid')) {
    computedStatus = 'paid';
  } else if (isOverdue) {
    computedStatus = 'overdue';
  } else if (totalPaid > 0 && remainingBalance > 0) {
    computedStatus = 'partial';
  } else {
    computedStatus = 'unpaid';
  }

  return {
    total,
    initialDeposit,
    repaymentsSum,
    totalPaid,
    remainingBalance,
    dueDate,
    nationalId,
    guarantorName: guarantor.name,
    guarantorPhone: guarantor.phone,
    isOverdue,
    computedStatus,
  };
}
