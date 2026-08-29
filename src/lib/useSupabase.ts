/// <reference types="vite/client" />
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabaseClient, isSupabaseConfigured } from './supabaseClient';
import { safeLocalStorage } from '../utils/storage';

export interface PendingSyncItem {
  id: string;
  tableName: string;
  type: 'ADD' | 'UPDATE' | 'DELETE' | 'STOCK_ADJUST';
  _syncState?: 'NEW' | 'DIRTY';
  _lastSyncedAt?: string;
  _localUpdatedAt?: string;
  _baseSnapshot?: any;
  item?: any;
  timestamp: number;
  error?: string;
  attempts?: number;
}

const QUEUE_STORAGE_KEY = 'ge_offline_sync_queue';

// Global rate limiting backoff state
let isRateLimited = false;
let rateLimitResetTime = 0;

export function getRateLimitStatus() {
  if (isRateLimited && Date.now() < rateLimitResetTime) {
    return { limited: true, retryAfter: Math.ceil((rateLimitResetTime - Date.now()) / 1000) };
  }
  isRateLimited = false;
  return { limited: false, retryAfter: 0 };
}

export interface SupabaseSyncNotification {
  type: 'syncing' | 'synced' | 'warning' | 'error';
  table?: string;
  action?: string;
  message: string;
  error?: string;
  timestamp: number;
}

export function notifySyncStatus(notification: Omit<SupabaseSyncNotification, 'timestamp'>) {
  if (typeof window !== 'undefined') {
    const payload: SupabaseSyncNotification = {
      ...notification,
      timestamp: Date.now()
    };
    window.dispatchEvent(new CustomEvent('supabase-sync-status', { detail: payload }));
  }
}

export function getOfflineQueue(): PendingSyncItem[] {
  try {
    safeLocalStorage.removeItem(QUEUE_STORAGE_KEY);
  } catch {}
  return [];
}

export function saveOfflineQueue(_queue: PendingSyncItem[]) {
  try {
    safeLocalStorage.removeItem(QUEUE_STORAGE_KEY);
  } catch {}
}

export async function processOfflineSyncQueue(): Promise<void> {
  try {
    safeLocalStorage.removeItem(QUEUE_STORAGE_KEY);
  } catch {}
  return Promise.resolve();
}

let isReconnectingAndSyncing = false;

export async function handleOnlineReconnect() {
  if (isReconnectingAndSyncing || !navigator.onLine) return;
  isReconnectingAndSyncing = true;

  try {
    window.dispatchEvent(new CustomEvent('cloud-live-event', {
      detail: { type: 'FORCE_ONLINE_REFRESH', timestamp: Date.now() }
    }));
    window.dispatchEvent(new Event('force-store-refresh'));

    notifySyncStatus({
      type: 'synced',
      message: 'Online connected. Real-time data synchronized with Cloud.'
    });
  } catch (err) {
    console.error('[Online Reconnect Error]:', err);
  } finally {
    isReconnectingAndSyncing = false;
  }
}

export async function queueStockDelta(adjustments: { productId: string; delta: number; reason?: string; txId?: string }[]) {
  if (!adjustments || adjustments.length === 0) return;
  try {
    const response = await fetch('/api/stock-adjust', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adjustments })
    });
    if (response.ok) {
      window.dispatchEvent(new Event('force-store-refresh'));
    }
  } catch (err) {
    console.error('Direct online stock adjustment failed:', err);
  }
}

// Global Real-time Live Event listener connected to backend SSE
if (typeof window !== 'undefined') {
  let eventSource: EventSource | null = null;
  let reconnectTimeout: any = null;
  let sseRetryCount = 0;

  function connectSSE() {
    try {
      if (eventSource) {
        eventSource.close();
      }
      eventSource = new EventSource('/api/events');
      
      eventSource.onopen = () => {
        sseRetryCount = 0;
      };

      eventSource.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload && payload.type) {
            window.dispatchEvent(new CustomEvent('cloud-live-event', { detail: payload }));
          }
        } catch {
          // ignore keepalive
        }
      };

      eventSource.onerror = () => {
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        sseRetryCount++;
        clearTimeout(reconnectTimeout);
        const delay = Math.min(20000, 2000 * Math.pow(1.5, Math.min(sseRetryCount, 10)));
        reconnectTimeout = setTimeout(connectSSE, delay);
      };
    } catch {}
  }

  window.addEventListener('online', () => {
    sseRetryCount = 0;
    connectSSE();
    handleOnlineReconnect();
  });
  window.addEventListener('focus', () => {
    if (!eventSource || eventSource.readyState === EventSource.CLOSED) {
      sseRetryCount = 0;
      connectSSE();
    }
  });

  connectSSE();
}

function isMatchingCollection(colA?: any, colB?: any): boolean {
  if (!colA || !colB) return false;
  const strA = String(colA);
  const strB = String(colB);
  if (strA === strB) return true;
  const normalize = (s: string) => String(s || "").toLowerCase().replace(/_/g, '');
  return normalize(strA) === normalize(strB);
}

function normalizeClientItem<T>(tableName: string, item: any): T {
  if (!item || typeof item !== 'object') return item;
  const clone = { ...item };

  if (isMatchingCollection(tableName, 'products')) {
    if (clone.is_on_offer !== undefined && clone.is_on_offer !== null) clone.isOnOffer = Boolean(clone.is_on_offer);
    if (clone.isonoffer !== undefined && clone.isonoffer !== null) clone.isOnOffer = Boolean(clone.isonoffer);
    if (clone.isOnOffer !== undefined && clone.isOnOffer !== null) clone.isOnOffer = Boolean(clone.isOnOffer);

    if (clone.original_price !== undefined && clone.original_price !== null) clone.originalPrice = Number(clone.original_price);
    if (clone.originalprice !== undefined && clone.originalprice !== null) clone.originalPrice = Number(clone.originalprice);
    if (clone.originalPrice !== undefined && clone.originalPrice !== null) clone.originalPrice = Number(clone.originalPrice);

    if (clone.discount_price !== undefined && clone.discount_price !== null) clone.discountPrice = Number(clone.discount_price);
    if (clone.discountprice !== undefined && clone.discountprice !== null) clone.discountPrice = Number(clone.discountprice);
    if (clone.discountPrice !== undefined && clone.discountPrice !== null) clone.discountPrice = Number(clone.discountPrice);

    if (clone.discount_percentage !== undefined && clone.discount_percentage !== null) clone.discountPercentage = Number(clone.discount_percentage);
    if (clone.discountpercentage !== undefined && clone.discountpercentage !== null) clone.discountPercentage = Number(clone.discountpercentage);
    if (clone.discountPercentage !== undefined && clone.discountPercentage !== null) clone.discountPercentage = Number(clone.discountPercentage);

    if (clone.offer_ends_at !== undefined && clone.offer_ends_at !== null) clone.offerEndsAt = String(clone.offer_ends_at);
    if (clone.offerendsat !== undefined && clone.offerendsat !== null) clone.offerEndsAt = String(clone.offerendsat);
    if (clone.offerEndsAt !== undefined && clone.offerEndsAt !== null) clone.offerEndsAt = String(clone.offerEndsAt);

    if (clone.offer_title !== undefined && clone.offer_title !== null) clone.offerTitle = String(clone.offer_title);
    if (clone.offertitle !== undefined && clone.offertitle !== null) clone.offerTitle = String(clone.offertitle);
    if (clone.offerTitle !== undefined && clone.offerTitle !== null) clone.offerTitle = String(clone.offerTitle);

    if (clone.is_vat_inclusive !== undefined && clone.is_vat_inclusive !== null) clone.isVatInclusive = Boolean(clone.is_vat_inclusive);
    if (clone.isvatinclusive !== undefined && clone.isvatinclusive !== null) clone.isVatInclusive = Boolean(clone.isvatinclusive);
    if (clone.isVatInclusive !== undefined && clone.isVatInclusive !== null) clone.isVatInclusive = Boolean(clone.isVatInclusive);

    if (clone.cost_price !== undefined && clone.cost_price !== null) clone.costPrice = Number(clone.cost_price);
    if (clone.costprice !== undefined && clone.costprice !== null) clone.costPrice = Number(clone.costprice);
    if (clone.min_stock_alert !== undefined && clone.min_stock_alert !== null) clone.minStockAlert = Number(clone.min_stock_alert);
    if (clone.minstockalert !== undefined && clone.minstockalert !== null) clone.minStockAlert = Number(clone.minstockalert);
    if (clone.reviews_count !== undefined && clone.reviews_count !== null) clone.reviewsCount = Number(clone.reviews_count);
    if (clone.reviewscount !== undefined && clone.reviewscount !== null) clone.reviewsCount = Number(clone.reviewscount);
    if (clone.is_genuine_verified !== undefined && clone.is_genuine_verified !== null) clone.isGenuineVerified = Boolean(clone.is_genuine_verified);
    if (clone.isgenuineverified !== undefined && clone.isgenuineverified !== null) clone.isGenuineVerified = Boolean(clone.isgenuineverified);

    const rawImages = clone.images ?? clone.images_gallery ?? clone.imagesgallery ?? clone.additional_images ?? clone.additionalimages ?? clone.gallery_images;
    if (rawImages !== undefined && rawImages !== null) {
      if (Array.isArray(rawImages)) {
        clone.images = rawImages.filter((img: any) => typeof img === 'string' && img.trim().length > 0);
      } else if (typeof rawImages === 'string') {
        try {
          const parsed = JSON.parse(rawImages);
          if (Array.isArray(parsed)) {
            clone.images = parsed.filter((img: any) => typeof img === 'string' && img.trim().length > 0);
          } else if (typeof parsed === 'string' && parsed.trim().length > 0) {
            clone.images = [parsed.trim()];
          }
        } catch (_) {
          const str = rawImages.trim();
          if (str.startsWith('{') && str.endsWith('}')) {
            clone.images = str.slice(1, -1).split(',').map((s: string) => s.replace(/^"|"$/g, '').trim()).filter(Boolean);
          } else if (str.includes(',')) {
            clone.images = str.split(',').map((s: string) => s.trim()).filter(Boolean);
          } else if (str.length > 0) {
            clone.images = [str];
          }
        }
      }
    }
    if (!Array.isArray(clone.images)) {
      clone.images = clone.image ? [clone.image] : [];
    }
    if (clone.specs && typeof clone.specs === 'string') {
      try { clone.specs = JSON.parse(clone.specs); } catch (_) {}
    }
  }

  if (isMatchingCollection(tableName, 'orders') || isMatchingCollection(tableName, 'posTransactions') || isMatchingCollection(tableName, 'pos_transactions')) {
    if (clone.items && typeof clone.items === 'string') {
      try { clone.items = JSON.parse(clone.items); } catch (_) {}
    }
    if (clone.extra_costs && typeof clone.extra_costs === 'string') {
      try { clone.extra_costs = JSON.parse(clone.extra_costs); } catch (_) {}
    }
    if (clone.extraCosts && typeof clone.extraCosts === 'string') {
      try { clone.extraCosts = JSON.parse(clone.extraCosts); } catch (_) {}
    }
    if (clone.extra_costs !== undefined && clone.extraCosts === undefined) {
      clone.extraCosts = clone.extra_costs;
    }
    if (clone.loan_repayments && typeof clone.loan_repayments === 'string') {
      try { clone.loan_repayments = JSON.parse(clone.loan_repayments); } catch (_) {}
    }
    if (clone.loanRepayments && typeof clone.loanRepayments === 'string') {
      try { clone.loanRepayments = JSON.parse(clone.loanRepayments); } catch (_) {}
    }

    // Direct mappings & bidirectional sync
    const resolvedPaymentStatus = clone.paymentStatus ?? clone.payment_status ?? clone.paymentstatus;
    if (resolvedPaymentStatus !== undefined && resolvedPaymentStatus !== null) {
      clone.paymentStatus = resolvedPaymentStatus;
      clone.payment_status = resolvedPaymentStatus;
      clone.paymentstatus = resolvedPaymentStatus;
    }

    const resolvedPaymentMethod = clone.paymentMethod ?? clone.payment_method ?? clone.paymentmethod;
    if (resolvedPaymentMethod !== undefined && resolvedPaymentMethod !== null) {
      clone.paymentMethod = resolvedPaymentMethod;
      clone.payment_method = resolvedPaymentMethod;
      clone.paymentmethod = resolvedPaymentMethod;
    }

    const resolvedPaidAmount = clone.paidAmount ?? clone.paid_amount ?? clone.paidamount;
    if (resolvedPaidAmount !== undefined && resolvedPaidAmount !== null) {
      const pAmt = Number(resolvedPaidAmount) || 0;
      clone.paidAmount = pAmt;
      clone.paid_amount = pAmt;
      clone.paidamount = pAmt;
    }

    const resolvedOutstandingBalance = clone.outstandingBalance ?? clone.outstanding_balance ?? clone.outstandingbalance;
    if (resolvedOutstandingBalance !== undefined && resolvedOutstandingBalance !== null) {
      const oBal = Number(resolvedOutstandingBalance) || 0;
      clone.outstandingBalance = oBal;
      clone.outstanding_balance = oBal;
      clone.outstandingbalance = oBal;
    }

    const resolvedOrderStatus = clone.status ?? clone.order_status ?? clone.orderstatus;
    if (resolvedOrderStatus !== undefined && resolvedOrderStatus !== null) {
      clone.status = resolvedOrderStatus;
      clone.order_status = resolvedOrderStatus;
      clone.orderstatus = resolvedOrderStatus;
    }

    if (clone.receipt_number !== undefined && clone.receiptNumber === undefined) clone.receiptNumber = clone.receipt_number;
    if (clone.receiptnumber !== undefined && clone.receiptNumber === undefined) clone.receiptNumber = clone.receiptnumber;
    if (clone.price_tier !== undefined && clone.priceTier === undefined) clone.priceTier = clone.price_tier;
    if (clone.split_payments !== undefined && clone.splitPayments === undefined) clone.splitPayments = clone.split_payments;
    if (clone.splitpayments !== undefined && clone.splitPayments === undefined) clone.splitPayments = clone.splitpayments;
    
    if (clone.customer_name !== undefined && clone.customer_name !== null && String(clone.customer_name).trim() !== '') {
      clone.customerName = String(clone.customer_name).trim();
    }
    if (clone.customername !== undefined && clone.customername !== null && String(clone.customername).trim() !== '' && !clone.customerName) {
      clone.customerName = String(clone.customername).trim();
    }
    if (clone.client_name !== undefined && clone.client_name !== null && String(clone.client_name).trim() !== '' && !clone.customerName) {
      clone.customerName = String(clone.client_name).trim();
    }
    if (clone.buyer_name !== undefined && clone.buyer_name !== null && String(clone.buyer_name).trim() !== '' && !clone.customerName) {
      clone.customerName = String(clone.buyer_name).trim();
    }
    if (clone.customer && typeof clone.customer === 'object' && !clone.customerName) {
      const nestedName = clone.customer.name || clone.customer.fullName || clone.customer.full_name;
      if (nestedName && String(nestedName).trim()) {
        clone.customerName = String(nestedName).trim();
      }
    }
    if (clone.customer_email !== undefined && clone.customer_email !== null && String(clone.customer_email).trim() !== '') {
      clone.customerEmail = String(clone.customer_email).trim();
    }
    if (clone.customeremail !== undefined && clone.customeremail !== null && String(clone.customeremail).trim() !== '' && !clone.customerEmail) {
      clone.customerEmail = String(clone.customeremail).trim();
    }
    if (clone.customer_phone !== undefined && clone.customer_phone !== null && String(clone.customer_phone).trim() !== '') {
      clone.customerPhone = String(clone.customer_phone).trim();
    }
    if (clone.customerphone !== undefined && clone.customerphone !== null && String(clone.customerphone).trim() !== '' && !clone.customerPhone) {
      clone.customerPhone = String(clone.customerphone).trim();
    }
    if (clone.customer && typeof clone.customer === 'object' && !clone.customerPhone) {
      const nestedPhone = clone.customer.phone || clone.customer.telephone;
      if (nestedPhone && String(nestedPhone).trim()) {
        clone.customerPhone = String(nestedPhone).trim();
      }
    }
    if (clone.customer_tin !== undefined) clone.customerTin = clone.customer_tin;
    if (clone.customertin !== undefined && clone.customerTin === undefined) clone.customerTin = clone.customertin;
    if (clone.tendered_amount !== undefined && clone.tenderedAmount === undefined) clone.tenderedAmount = Number(clone.tendered_amount);
    if (clone.tenderedamount !== undefined && clone.tenderedAmount === undefined) clone.tenderedAmount = Number(clone.tenderedamount);
    if (clone.change_amount !== undefined && clone.changeAmount === undefined) clone.changeAmount = Number(clone.change_amount);
    if (clone.changeamount !== undefined && clone.changeAmount === undefined) clone.changeAmount = Number(clone.changeamount);
    if (clone.shipping_address !== undefined) clone.shippingAddress = clone.shipping_address;
    if (clone.total_amount !== undefined) clone.totalAmount = clone.total_amount;
    if (clone.cashier_name !== undefined) clone.cashierName = clone.cashier_name;
    if (clone.cashiername !== undefined && clone.cashierName === undefined) clone.cashierName = clone.cashiername;
    if (clone.vat_percentage !== undefined) clone.vatPercentage = clone.vat_percentage;
    if (clone.include_vat !== undefined) clone.includeVat = clone.include_vat;
    if (clone.created_at !== undefined) clone.createdAt = clone.created_at;
    if (clone.updated_at !== undefined) clone.updatedAt = clone.updated_at;

    // Loan mappings
    const pmNorm = (String(clone.paymentMethod || clone.payment_method || '')).toLowerCase();
    const isCreditCardNorm = pmNorm.includes('credit card') || pmNorm.includes('card') || pmNorm.includes('visa') || pmNorm.includes('mastercard');
    const isStandardCashOrMobileNorm = pmNorm.includes('cash') || pmNorm.includes('m-pesa') || pmNorm.includes('mpesa') || pmNorm.includes('tigo') || pmNorm.includes('airtel') || pmNorm.includes('halo') || pmNorm.includes('bank') || pmNorm.includes('transfer') || pmNorm.includes('orbi');
    const hasExplicitLoanMethodNorm = 
      pmNorm.includes('loan') ||
      pmNorm.includes('installment') ||
      pmNorm.includes('mkopo') ||
      pmNorm.includes('debt') ||
      pmNorm.includes('deni') ||
      pmNorm.includes('store credit') ||
      (pmNorm.includes('credit') && !isCreditCardNorm);

    if ((isCreditCardNorm || isStandardCashOrMobileNorm) && !hasExplicitLoanMethodNorm) {
      clone.isLoan = false;
    } else if (clone.is_loan !== undefined && clone.is_loan !== null) {
      clone.isLoan = Boolean(clone.is_loan);
    } else if (clone.isloan !== undefined && clone.isloan !== null) {
      clone.isLoan = Boolean(clone.isloan);
    } else {
      const hasLoanBal = (clone.loan_balance !== undefined && Number(clone.loan_balance) > 0) || (clone.loanBalance !== undefined && Number(clone.loanBalance) > 0);
      const hasExplicitLoanDue = Boolean(clone.loan_due_date || clone.loanDueDate);

      if (hasExplicitLoanMethodNorm || (hasLoanBal && hasExplicitLoanDue)) {
        clone.isLoan = true;
      } else {
        clone.isLoan = false;
      }
    }

    if (clone.down_payment !== undefined) clone.downPayment = Number(clone.down_payment);
    if (clone.downpayment !== undefined && clone.downPayment === undefined) clone.downPayment = Number(clone.downpayment);
    if (clone.paid_amount !== undefined) clone.paidAmount = Number(clone.paid_amount);
    if (clone.paidamount !== undefined && clone.paidAmount === undefined) clone.paidAmount = Number(clone.paidamount);
    if (clone.outstanding_balance !== undefined) clone.outstandingBalance = Number(clone.outstanding_balance);
    if (clone.outstandingbalance !== undefined && clone.outstandingBalance === undefined) clone.outstandingBalance = Number(clone.outstandingbalance);
    if (clone.partial_payments && typeof clone.partial_payments === 'string') {
      try { clone.partial_payments = JSON.parse(clone.partial_payments); } catch (_) {}
    }
    if (clone.partial_payments !== undefined && (!Array.isArray(clone.partialPayments) || clone.partialPayments.length === 0)) {
      clone.partialPayments = clone.partial_payments;
    }
    if (clone.partialpayments !== undefined && (!Array.isArray(clone.partialPayments) || clone.partialPayments.length === 0)) {
      clone.partialPayments = clone.partialpayments;
    }
    if (clone.loan_balance !== undefined) clone.loanBalance = Number(clone.loan_balance);
    if (clone.loanbalance !== undefined && clone.loanBalance === undefined) clone.loanBalance = Number(clone.loanbalance);
    if (clone.loan_due_date !== undefined && !clone.loanDueDate) clone.loanDueDate = clone.loan_due_date;
    if (clone.loanduedate !== undefined && !clone.loanDueDate) clone.loanDueDate = clone.loanduedate;
    if (clone.loan_due_time !== undefined && !clone.loanDueTime) clone.loanDueTime = clone.loan_due_time;
    if (clone.loanduetime !== undefined && !clone.loanDueTime) clone.loanDueTime = clone.loanduetime;
    if (clone.loan_due_date_time !== undefined && !clone.loanDueDateTime) clone.loanDueDateTime = clone.loan_due_date_time;
    if (clone.loanduedatetime !== undefined && !clone.loanDueDateTime) clone.loanDueDateTime = clone.loanduedatetime;
    if (clone.loan_national_id !== undefined && !clone.loanNationalId) clone.loanNationalId = clone.loan_national_id;
    if (clone.loannationalid !== undefined && !clone.loanNationalId) clone.loanNationalId = clone.loannationalid;
    if (clone.loan_guarantor_name !== undefined && !clone.loanGuarantorName) clone.loanGuarantorName = clone.loan_guarantor_name;
    if (clone.loanguarantorname !== undefined && !clone.loanGuarantorName) clone.loanGuarantorName = clone.loanguarantorname;
    if (clone.loan_guarantor_phone !== undefined && !clone.loanGuarantorPhone) clone.loanGuarantorPhone = clone.loan_guarantor_phone;
    if (clone.loanguarantorphone !== undefined && !clone.loanGuarantorPhone) clone.loanGuarantorPhone = clone.loanguarantorphone;
    if (clone.loan_status !== undefined && !clone.loanStatus) clone.loanStatus = clone.loan_status;
    if (clone.loanstatus !== undefined && !clone.loanStatus) clone.loanStatus = clone.loanstatus;
    if (clone.customer_id !== undefined && !clone.customerId) clone.customerId = clone.customer_id;
    if (clone.customerid !== undefined && !clone.customerId) clone.customerId = clone.customerid;
    if (clone.customerId && !clone.userId) clone.userId = clone.customerId;
    if (clone.user_id !== undefined && !clone.userId) clone.userId = clone.user_id;
    if (clone.userid !== undefined && !clone.userId) clone.userId = clone.userid;
    if (clone.userId && !clone.customerId) clone.customerId = clone.userId;
    if (clone.deadline !== undefined && !clone.loanDueDate) clone.loanDueDate = clone.deadline;
    if (clone.loanDueDate && !clone.deadline) clone.deadline = clone.loanDueDate;
    if (clone.loan_repayments !== undefined && (!Array.isArray(clone.loanRepayments) || clone.loanRepayments.length === 0)) {
      clone.loanRepayments = clone.loan_repayments;
    }
  }

  return clone as T;
}

async function fetchWithTimeout(resource: string, options: any = {}, timeout: number = 12000) {
  const controller = new AbortController();
  const id = setTimeout(() => {
    try {
      controller.abort('Timeout');
    } catch (_) {}
  }, timeout);
  try {
    const response = await fetch(resource, {
      ...options,
      headers: {
        'Cache-Control': 'no-cache, no-store',
        'Pragma': 'no-cache',
        ...(options.headers || {})
      },
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

export function useSupabaseCollection<T extends { id: string }>(
  tableName: string,
  initialData: T[],
  isAdmin: boolean = false
) {
  const [data, setData] = useState<T[]>(initialData);
  const [loading, setLoading] = useState(true);
  const isFetchingRef = useRef(false);

  const processCloudItems = useCallback((rawItems: T[]) => {
    const itemMap = new Map<string, T>();
    rawItems.forEach(rawItem => {
      if (rawItem && (rawItem as any).id && (rawItem as any).id !== 'undefined' && (rawItem as any).id !== 'null') {
        const item = normalizeClientItem<T>(tableName, rawItem);
        itemMap.set(item.id, item);
      }
    });

    const merged = Array.from(itemMap.values()).sort((a: any, b: any) => {
      const timeA = (a as any).createdAt ? new Date((a as any).createdAt).getTime() : 0;
      const timeB = (b as any).createdAt ? new Date((b as any).createdAt).getTime() : 0;
      return timeB - timeA;
    });

    setData(merged);
  }, [tableName]);

  const fetchData = useCallback(async () => {
    if (!navigator.onLine) {
      setLoading(false);
      return;
    }

    if (isRateLimited) {
      if (Date.now() < rateLimitResetTime) return;
      isRateLimited = false;
    }

    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      let cloudItems: T[] | null = null;
      let isBackendSuccess = false;

      // 1. Fetch live data from Express backend API
      try {
        const response = await fetchWithTimeout(`/api/data/${tableName}`, {}, 6000);

        if (response.status === 429) {
          isRateLimited = true;
          rateLimitResetTime = Date.now() + 60000;
          return;
        }

        if (response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const json = await response.json();
            if (json.data && Array.isArray(json.data)) {
              cloudItems = (json.data as T[]).sort((a: any, b: any) => {
                if (a.createdAt && b.createdAt) return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                return 0;
              });
              isBackendSuccess = true;
            }
          }
        }
      } catch (err: any) {
        console.warn(`Fetch /api/data/${tableName} failed:`, err?.message || err);
      }

      // 2. Try direct Supabase client if backend endpoint returned error
      if (!isBackendSuccess && isSupabaseConfigured) {
        try {
          const { data: supaRows, error } = await supabaseClient.from(tableName).select('*');
          if (!error && Array.isArray(supaRows)) {
            cloudItems = supaRows as unknown as T[];
            isBackendSuccess = true;
          }
        } catch (err: any) {
          console.error(`Direct Supabase fetch for ${tableName} failed:`, err?.message || err);
        }
      }

      if (isBackendSuccess && cloudItems && Array.isArray(cloudItems)) {
        processCloudItems(cloudItems);
      }
    } catch (err: any) {
      console.error(`Error loading collection ${tableName}:`, err);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, [tableName, processCloudItems]);

  useEffect(() => {
    fetchData();

    const handleLiveEvent = (e: Event) => {
      const customEvent = e as CustomEvent<any>;
      const payload = customEvent.detail;
      if (!payload) return;

      if (payload.type === 'PULL_COMPLETED' || payload.type === 'FORCE_ONLINE_REFRESH') {
        fetchData();
        return;
      }

      if (payload.type === 'COLLECTION_UPDATE' && isMatchingCollection(payload.collection, tableName)) {
        if (payload.action === 'UPDATE' || payload.action === 'ADD') {
          if (payload.item && payload.item.id) {
            const normalizedItem = normalizeClientItem<T>(tableName, payload.item);
            setData(prev => {
              const itemMap = new Map<string, T>();
              itemMap.set(normalizedItem.id, normalizedItem);
              prev.forEach(i => {
                if (i.id !== normalizedItem.id) {
                  itemMap.set(i.id, i);
                }
              });
              return Array.from(itemMap.values()).sort((a: any, b: any) => {
                const timeA = (a as any).createdAt ? new Date((a as any).createdAt).getTime() : 0;
                const timeB = (b as any).createdAt ? new Date((b as any).createdAt).getTime() : 0;
                return timeB - timeA;
              });
            });
          }
        } else if (payload.action === 'DELETE' && payload.id) {
          setData(prev => prev.filter(i => i.id !== payload.id));
        }
      }
    };

    const handleOnline = () => fetchData();
    const handleSyncComplete = () => fetchData();
    const handleFocus = () => { if (navigator.onLine) fetchData(); };

    window.addEventListener('cloud-live-event', handleLiveEvent);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline-sync-completed', handleSyncComplete);
    window.addEventListener('force-store-refresh', handleSyncComplete);
    window.addEventListener('focus', handleFocus);

    const interval = setInterval(() => {
      if (navigator.onLine && typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchData();
      }
    }, 60000);

    return () => {
      window.removeEventListener('cloud-live-event', handleLiveEvent);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline-sync-completed', handleSyncComplete);
      window.removeEventListener('force-store-refresh', handleSyncComplete);
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, [fetchData, tableName]);

  const addItem = async (rawItem: T) => {
    const validId = (rawItem as any).id || `${tableName.slice(0, 4)}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const item: T = { ...rawItem, id: validId };

    if (!navigator.onLine) {
      notifySyncStatus({
        type: 'warning',
        table: tableName,
        action: 'ADD',
        message: 'Active internet connection required.'
      });
      return { success: false, offline: true, error: 'Device is offline' };
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('supabase-write-start', { detail: { tableName, action: 'ADD' } }));
    }

    try {
      const response = await fetch(`/api/data/${tableName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
      const resJson = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(resJson.error || resJson.supabaseError || `Server error (${response.status})`);
      }

      const finalItem = (resJson && resJson.data) ? normalizeClientItem<T>(tableName, resJson.data) : item;
      setData(prev => {
        const itemMap = new Map<string, T>();
        if (finalItem && (finalItem as any).id) itemMap.set((finalItem as any).id, finalItem);
        prev.forEach(i => {
          if (i && i.id && i.id !== (finalItem as any).id) itemMap.set(i.id, i);
        });
        return Array.from(itemMap.values()).sort((a: any, b: any) => {
          const timeA = (a as any).createdAt ? new Date((a as any).createdAt).getTime() : 0;
          const timeB = (b as any).createdAt ? new Date((b as any).createdAt).getTime() : 0;
          return timeB - timeA;
        });
      });

      return { success: true, supabaseSynced: resJson.supabaseSynced, data: resJson.data };
    } catch (e: any) {
      const errorMsg = e?.message || 'Network error';
      console.error(`Add item to ${tableName} failed:`, e);
      return { success: false, error: errorMsg };
    } finally {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('supabase-write-end', { detail: { tableName, action: 'ADD' } }));
      }
    }
  };

  const updateItem = async (item: T) => {
    if (!navigator.onLine) {
      notifySyncStatus({
        type: 'warning',
        table: tableName,
        action: 'UPDATE',
        message: 'Active internet connection required.'
      });
      return { success: false, offline: true, error: 'Device is offline' };
    }

    // Apply immediate optimistic state update to provide instant UI reactivity
    const normalizedInput = normalizeClientItem<T>(tableName, item);
    setData(prev => {
      const itemMap = new Map<string, T>();
      prev.forEach(i => { if (i && i.id) itemMap.set(i.id, i); });
      if (normalizedInput && (normalizedInput as any).id) itemMap.set((normalizedInput as any).id, normalizedInput);
      return Array.from(itemMap.values()).sort((a: any, b: any) => {
        const timeA = (a as any).createdAt ? new Date((a as any).createdAt).getTime() : 0;
        const timeB = (b as any).createdAt ? new Date((b as any).createdAt).getTime() : 0;
        return timeB - timeA;
      });
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('supabase-write-start', { detail: { tableName, action: 'UPDATE' } }));
    }

    try {
      const response = await fetch(`/api/data/${tableName}/${encodeURIComponent(item.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
      const resJson = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(resJson.error || resJson.supabaseError || `Server error (${response.status})`);
      }

      const finalItem = (resJson && resJson.data) ? normalizeClientItem<T>(tableName, resJson.data) : normalizedInput;
      setData(prev => {
        const itemMap = new Map<string, T>();
        prev.forEach(i => { if (i && i.id) itemMap.set(i.id, i); });
        if (finalItem && (finalItem as any).id) itemMap.set((finalItem as any).id, finalItem);
        return Array.from(itemMap.values()).sort((a: any, b: any) => {
          const timeA = (a as any).createdAt ? new Date((a as any).createdAt).getTime() : 0;
          const timeB = (b as any).createdAt ? new Date((b as any).createdAt).getTime() : 0;
          return timeB - timeA;
        });
      });

      return { success: true, supabaseSynced: resJson.supabaseSynced, data: resJson.data };
    } catch (e: any) {
      const errorMsg = e?.message || 'Network error';
      console.error(`Update item in ${tableName} failed:`, e);
      return { success: false, error: errorMsg };
    } finally {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('supabase-write-end', { detail: { tableName, action: 'UPDATE' } }));
      }
    }
  };

  const deleteItem = async (id: string) => {
    if (!navigator.onLine) {
      notifySyncStatus({
        type: 'warning',
        table: tableName,
        action: 'DELETE',
        message: 'Active internet connection required.'
      });
      return { success: false, offline: true, error: 'Device is offline' };
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('supabase-write-start', { detail: { tableName, action: 'DELETE' } }));
    }

    try {
      const response = await fetch(`/api/data/${tableName}/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      const resJson = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(resJson.error || resJson.supabaseError || `Server error (${response.status})`);
      }

      setData(prev => prev.filter(p => p && p.id !== id));
      return { success: true };
    } catch (e: any) {
      const errorMsg = e?.message || 'Network error';
      console.error(`Delete item from ${tableName} failed:`, e);
      return { success: false, error: errorMsg };
    } finally {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('supabase-write-end', { detail: { tableName, action: 'DELETE' } }));
      }
    }
  };

  const clearCollection = async () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('supabase-write-start', { detail: { tableName, action: 'CLEAR' } }));
    }

    try {
      const response = await fetch(`/api/data/${tableName}`, {
        method: 'DELETE'
      });
      const resJson = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(resJson.error || resJson.supabaseError || `Server error (${response.status})`);
      }
      setData([]);
      return { success: true };
    } catch (e: any) {
      console.error(`Clear collection ${tableName} failed:`, e);
      return { success: false, error: e?.message || 'Unknown error' };
    } finally {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('supabase-write-end', { detail: { tableName, action: 'CLEAR' } }));
      }
    }
  };

  return { data, loading, updateItem, addItem, deleteItem, clearCollection, setItems: setData, refresh: fetchData };
}

export function useSupabaseSyncStatus() {
  const [notification, setNotification] = useState<SupabaseSyncNotification | null>(null);

  useEffect(() => {
    let timeout: any = null;

    const handleSyncStatus = (e: Event) => {
      const detail = (e as CustomEvent).detail as SupabaseSyncNotification;
      if (detail) {
        setNotification(detail);
        if (detail.type === 'synced') {
          clearTimeout(timeout);
          timeout = setTimeout(() => {
            setNotification((prev) => (prev?.timestamp === detail.timestamp ? null : prev));
          }, 4000);
        }
      }
    };

    window.addEventListener('supabase-sync-status', handleSyncStatus);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('supabase-sync-status', handleSyncStatus);
    };
  }, []);

  return {
    notification,
    queueCount: 0,
    isRetrying: false,
    clearNotification: () => setNotification(null),
    triggerRetry: () => Promise.resolve()
  };
}

export async function fetchSupabaseStatus() {
  try {
    const res = await fetch('/api/supabase/status');
    if (!res.ok) throw new Error('Status endpoint returned HTTP ' + res.status);
    return await res.json();
  } catch (err: any) {
    return {
      connected: false,
      configured: false,
      message: err?.message || 'Network or server error checking Supabase status',
      tables: {}
    };
  }
}

export async function syncAllToSupabase() {
  return { success: true, message: 'App is running in direct online sync mode.' };
}

export async function pullAllFromSupabase() {
  return { success: true, message: 'App is running in direct online sync mode.' };
}

const getInitialUserSession = () => {
  try {
    const saved = safeLocalStorage.getItem('ge_user_session');
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

const buildProfileFromUser = (u: any) => {
  if (!u) return null;
  const adminEmail = 'admin@genuine-electronics.com';
  const isOnlyAdmin = (u.email || '').toLowerCase() === adminEmail;
  const role = isOnlyAdmin ? 'admin' : (u.role || u.user_metadata?.role || 'customer');
  const name = u.displayName || u.fullName || u.full_name || u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || 'User';

  return {
    id: u.id || u.sub || 'user-' + Date.now(),
    email: u.email,
    displayName: name,
    fullName: name,
    full_name: name,
    role,
    permissions: u.permissions || (isOnlyAdmin ? ['ALL'] : []),
    avatarUrl: u.avatarUrl || u.avatar_url || u.user_metadata?.avatar_url
  };
};

export function useSupabaseAuth() {
  const [user, setUser] = useState<any>(getInitialUserSession);
  const [profile, setProfile] = useState<any>(() => buildProfileFromUser(getInitialUserSession()));
  const [loading, setLoading] = useState(true);

  const syncAuth = useCallback((authUser: any) => {
    if (authUser) {
      const formattedProfile = buildProfileFromUser(authUser);
      const sessionUser = {
        id: formattedProfile?.id,
        email: authUser.email,
        displayName: formattedProfile?.displayName,
        fullName: formattedProfile?.fullName,
        full_name: formattedProfile?.full_name,
        role: formattedProfile?.role,
        avatarUrl: formattedProfile?.avatarUrl,
        user_metadata: authUser.user_metadata || {}
      };
      setUser(sessionUser);
      setProfile(formattedProfile);
      try {
        safeLocalStorage.setItem('ge_user_session', JSON.stringify(sessionUser));
      } catch (e) {
        console.warn('Failed to persist user session', e);
      }
    } else {
      const localUser = getInitialUserSession();
      if (localUser && localUser.email) {
        const formattedProfile = buildProfileFromUser(localUser);
        setUser(localUser);
        setProfile(formattedProfile);
      } else {
        setUser(null);
        setProfile(null);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let subscription: any = null;

    if (isSupabaseConfigured) {
      supabaseClient.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          syncAuth(session.user);
        } else {
          syncAuth(null);
        }
      }).catch(() => {
        syncAuth(null);
      });

      const authSub = supabaseClient.auth.onAuthStateChange((_event, session) => {
        syncAuth(session?.user ?? null);
      });
      subscription = authSub?.data?.subscription;
    } else {
      syncAuth(null);
    }

    const handleAuthChange = () => {
      if (isSupabaseConfigured) {
        supabaseClient.auth.getSession().then(({ data: { session } }) => {
          if (session?.user) {
            syncAuth(session.user);
          } else {
            const localUser = getInitialUserSession();
            syncAuth(localUser);
          }
        }).catch(() => {
          const localUser = getInitialUserSession();
          syncAuth(localUser);
        });
      } else {
        const localUser = getInitialUserSession();
        syncAuth(localUser);
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'ge_user_session') {
        handleAuthChange();
      }
    };

    const validateSessionOnline = async () => {
      if (!navigator.onLine) return;
      const currentLocalSession = getInitialUserSession();
      if (!currentLocalSession) return;

      try {
        let isSessionValid = true;
        let tokenToVerify = currentLocalSession.session?.access_token || currentLocalSession.access_token;
        const expiresAt = currentLocalSession.session?.expires_at || currentLocalSession.expires_at;

        if (expiresAt && typeof expiresAt === 'number') {
          const nowSec = Math.floor(Date.now() / 1000);
          if (expiresAt < nowSec) {
            isSessionValid = false;
          }
        }

        if (isSessionValid && isSupabaseConfigured) {
          try {
            const { data: { session }, error: sessionErr } = await supabaseClient.auth.getSession();
            if (sessionErr || !session) {
              isSessionValid = false;
            } else {
              tokenToVerify = session.access_token;
              const { data: { user: supaUser }, error: userErr } = await supabaseClient.auth.getUser(session.access_token);
              if (userErr || !supaUser) {
                isSessionValid = false;
              } else {
                syncAuth(supaUser);
              }
            }
          } catch {
            isSessionValid = false;
          }
        }

        if (isSessionValid) {
          try {
            const res = await fetch('/api/auth/validate-session', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(tokenToVerify ? { 'Authorization': `Bearer ${tokenToVerify}` } : {})
              },
              body: JSON.stringify({
                token: tokenToVerify,
                email: currentLocalSession.email,
                userId: currentLocalSession.id,
                expiresAt
              })
            });

            if (!res.ok) {
              isSessionValid = false;
            } else {
              const resData = await res.json().catch(() => ({}));
              if (resData.valid === false) {
                isSessionValid = false;
              }
            }
          } catch (e) {
            // Server unreachable
          }
        }

        if (!isSessionValid) {
          try {
            if (isSupabaseConfigured) {
              await supabaseClient.auth.signOut().catch(() => {});
            }
          } catch (_) {}

          safeLocalStorage.removeItem('ge_user_session');
          setUser(null);
          setProfile(null);

          window.dispatchEvent(new CustomEvent('session-expired', {
            detail: {
              reason: 'TOKEN_EXPIRED',
              message: 'Your session expired. Please sign in again.'
            }
          }));
          window.dispatchEvent(new Event('auth-state-changed'));
        }
      } catch (err) {
        console.error('[Auth Re-Validation Error]', err);
      }
    };

    window.addEventListener('auth-state-changed', handleAuthChange);
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('online', validateSessionOnline);

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
      window.removeEventListener('auth-state-changed', handleAuthChange);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('online', validateSessionOnline);
    };
  }, [syncAuth]);

  return { user, profile, loading };
}
