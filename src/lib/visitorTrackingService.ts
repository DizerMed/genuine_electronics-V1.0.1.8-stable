import { VisitorLog, VisitorInteractionType, VisitorAnalyticsSummary, VisitorFilterOptions, Product, formatToGMT3 } from '../types';
import { safeLocalStorage } from '../utils/storage';

// Storage & Cookie keys
const VISITOR_ID_KEY = 'ge_visitor_id';
const SESSION_ID_KEY = 'ge_session_id';
const SESSION_EXPIRY_KEY = 'ge_session_last_active';
const COOKIE_CONSENT_KEY = 'buydil_cookie_consent';
const COOKIE_VID_NAME = '_buydil_vid';
const COOKIE_SID_NAME = '_buydil_sid';
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes of inactivity creates a new session

export type CookieConsentLevel = 'all' | 'essential' | 'declined';

// Active Authenticated Staff & Admin Context
let currentAuthContext: {
  isAdmin: boolean;
  isStaff: boolean;
  userRole?: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
} = {
  isAdmin: false,
  isStaff: false,
};

/**
 * Configure the current authenticated staff or admin session so their visits
 * are recognized as internal activity and excluded from customer visitor counts.
 */
export function setVisitorAuthContext(ctx: {
  isAdmin: boolean;
  isStaff: boolean;
  userRole?: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
}): void {
  currentAuthContext = { ...currentAuthContext, ...ctx };
  if (ctx.isAdmin || ctx.isStaff) {
    // Send immediate presence heartbeat
    sendStaffHeartbeat({
      id: ctx.userId,
      name: ctx.userName,
      email: ctx.userEmail,
      role: ctx.userRole || (ctx.isAdmin ? 'Super Admin' : 'Staff'),
      currentPage: typeof window !== 'undefined' ? window.location.pathname : undefined
    }).catch(() => {});
  }
}

export function getVisitorAuthContext() {
  return currentAuthContext;
}

/**
 * Send live presence heartbeat for active admin / staff members
 */
export async function sendStaffHeartbeat(staffInfo: {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  currentPage?: string;
}): Promise<{ success: boolean }> {
  if (typeof window === 'undefined') return { success: false };
  try {
    const { deviceType, browser, os } = getDeviceContext();
    const res = await fetch('/api/analytics/staff-heartbeat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: staffInfo.id || 'admin_user',
        name: staffInfo.name || 'System Admin',
        email: staffInfo.email || 'admin@genuine-electronics.com',
        role: staffInfo.role || 'Admin',
        currentPage: staffInfo.currentPage || window.location.pathname,
        deviceType,
        browser,
        os,
        lastActive: new Date().toISOString()
      })
    });
    return await res.json().catch(() => ({ success: true }));
  } catch {
    return { success: false };
  }
}

/**
 * Helper to write a client cookie
 */
export function setClientCookie(name: string, value: string, days?: number): void {
  if (typeof document === 'undefined') return;
  try {
    let expires = '';
    if (days) {
      const date = new Date();
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
      expires = `; expires=${date.toUTCString()}`;
    }
    const secureFlag = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${name}=${encodeURIComponent(value)}${expires}; path=/; SameSite=Lax${secureFlag}`;
  } catch (err) {
    console.warn('Could not set cookie:', name, err);
  }
}

/**
 * Helper to read a client cookie
 */
export function getClientCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  try {
    const nameEQ = `${name}=`;
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i].trim();
      if (c.indexOf(nameEQ) === 0) {
        return decodeURIComponent(c.substring(nameEQ.length, c.length));
      }
    }
  } catch (err) {
    console.warn('Could not read cookie:', name, err);
  }
  return null;
}

/**
 * Cookie consent helper functions
 */
export function getCookieConsentStatus(): CookieConsentLevel | null {
  if (typeof window === 'undefined') return null;
  try {
    const fromCookie = getClientCookie(COOKIE_CONSENT_KEY) as CookieConsentLevel | null;
    if (fromCookie) return fromCookie;
    return (safeLocalStorage.getItem(COOKIE_CONSENT_KEY) as CookieConsentLevel | null) || null;
  } catch {
    return null;
  }
}

export function setCookieConsentStatus(level: CookieConsentLevel): void {
  if (typeof window === 'undefined') return;
  try {
    safeLocalStorage.setItem(COOKIE_CONSENT_KEY, level);
    setClientCookie(COOKIE_CONSENT_KEY, level, 180); // 6 months consent retention
  } catch (err) {
    console.warn('Could not set cookie consent:', err);
  }
}

// In-memory queue for event batching
let eventQueue: Partial<VisitorLog>[] = [];
let flushTimeout: any = null;
let isFlushing = false;

/**
 * Generate a unique ID with high entropy
 */
function generateUid(prefix = 'ev'): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `${prefix}_${timestamp}_${randomPart}`;
}

/**
 * Get or initialize persistent Visitor ID (Cookie + LocalStorage Hybrid)
 */
export function getOrCreateVisitorId(): string {
  if (typeof window === 'undefined') return 'server_visitor';
  try {
    // 1. Check Cookie first
    let vid = getClientCookie(COOKIE_VID_NAME);
    
    // 2. Check localStorage if cookie was absent
    if (!vid) {
      vid = safeLocalStorage.getItem(VISITOR_ID_KEY);
    }
    
    // 3. If neither exists, generate new ID
    if (!vid) {
      vid = generateUid('vid');
    }
    
    // 4. Synchronize across both localStorage and Cookie (60-day expiry to match retention policy)
    try {
      safeLocalStorage.setItem(VISITOR_ID_KEY, vid);
      setClientCookie(COOKIE_VID_NAME, vid, 60);
    } catch {}
    
    return vid;
  } catch {
    return 'fallback_visitor';
  }
}

/**
 * Get or initialize current Session ID (Cookie + SessionStorage Hybrid)
 */
export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return 'server_session';
  try {
    const now = Date.now();
    const lastActive = parseInt(sessionStorage.getItem(SESSION_EXPIRY_KEY) || '0', 10);
    
    let sessId = getClientCookie(COOKIE_SID_NAME) || sessionStorage.getItem(SESSION_ID_KEY);

    if (!sessId || (now - lastActive > SESSION_TIMEOUT_MS)) {
      sessId = generateUid('sess');
    }
    
    // Synchronize session state
    try {
      sessionStorage.setItem(SESSION_ID_KEY, sessId);
      sessionStorage.setItem(SESSION_EXPIRY_KEY, now.toString());
      setClientCookie(COOKIE_SID_NAME, sessId); // Session cookie (no days param = expires on browser close)
    } catch {}
    
    return sessId;
  } catch {
    return 'fallback_session';
  }
}

/**
 * Detect client device, browser, and OS safely
 */
export function getDeviceContext(): {
  deviceType: 'Mobile' | 'Desktop' | 'Tablet';
  browser: string;
  os: string;
  referrer: string;
} {
  if (typeof window === 'undefined') {
    return { deviceType: 'Desktop', browser: 'Node', os: 'Server', referrer: '' };
  }

  const ua = navigator.userAgent || '';
  
  // Device Type detection
  let deviceType: 'Mobile' | 'Desktop' | 'Tablet' = 'Desktop';
  if (/iPad|Tablet|(Android(?!.*Mobile))/i.test(ua)) {
    deviceType = 'Tablet';
  } else if (/Mobi|Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) || window.innerWidth < 768) {
    deviceType = 'Mobile';
  }

  // Browser detection
  let browser = 'Unknown Browser';
  if (/Edg\//i.test(ua)) browser = 'Microsoft Edge';
  else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) browser = 'Google Chrome';
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = 'Apple Safari';
  else if (/Firefox\//i.test(ua)) browser = 'Mozilla Firefox';
  else if (/Opera|OPR\//i.test(ua)) browser = 'Opera';
  else if (/SamsungBrowser/i.test(ua)) browser = 'Samsung Internet';

  // OS detection
  let os = 'Unknown OS';
  if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Macintosh|Mac OS X/i.test(ua)) os = 'macOS';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  return {
    deviceType,
    browser,
    os,
    referrer: document.referrer || 'Direct'
  };
}

/**
 * Core event logger that queues interactions and sends them to backend
 */
export function logVisitorInteraction(interaction: {
  interactionType: VisitorInteractionType;
  productId?: string;
  productName?: string;
  productPrice?: number;
  productCategory?: string;
  productBrand?: string;
  productImage?: string;
  searchQuery?: string;
  searchResultsCount?: number;
  categoryFilter?: string;
  brandFilter?: string;
  quantity?: number;
  orderId?: string;
  pageUrl?: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  metadata?: Record<string, any>;
  immediate?: boolean;
}): void {
  if (typeof window === 'undefined') return;

  try {
    const visitorId = getOrCreateVisitorId();
    const sessionId = getOrCreateSessionId();
    const { deviceType, browser, os, referrer } = getDeviceContext();

    const effectiveUserId = interaction.userId || currentAuthContext.userId;
    const effectiveEmail = interaction.userEmail || currentAuthContext.userEmail;
    const effectiveName = interaction.userName || currentAuthContext.userName;
    const isAdminUser = Boolean(
      currentAuthContext.isAdmin || 
      effectiveEmail === 'admin@genuine-electronics.com' || 
      currentAuthContext.userRole === 'admin' || 
      currentAuthContext.userRole === 'super_admin'
    );
    const isStaffUser = Boolean(
      currentAuthContext.isStaff || 
      currentAuthContext.userRole === 'staff' || 
      currentAuthContext.userRole === 'manager' || 
      currentAuthContext.userRole === 'cashier'
    );

    const logEntry: VisitorLog = {
      id: generateUid('vlog'),
      visitorId,
      sessionId,
      userId: effectiveUserId,
      userEmail: effectiveEmail,
      userName: effectiveName,
      interactionType: interaction.interactionType,
      productId: interaction.productId,
      productName: interaction.productName,
      productPrice: interaction.productPrice,
      productCategory: interaction.productCategory,
      productBrand: interaction.productBrand,
      productImage: interaction.productImage,
      searchQuery: interaction.searchQuery?.trim(),
      searchResultsCount: interaction.searchResultsCount,
      categoryFilter: interaction.categoryFilter,
      brandFilter: interaction.brandFilter,
      quantity: interaction.quantity || 1,
      orderId: interaction.orderId,
      pageUrl: interaction.pageUrl || window.location.pathname + window.location.search,
      referrer,
      deviceType,
      browser,
      os,
      metadata: interaction.metadata,
      isAdmin: isAdminUser,
      isStaff: isStaffUser,
      userRole: currentAuthContext.userRole || (isAdminUser ? 'Admin' : isStaffUser ? 'Staff' : undefined),
      createdAt: new Date().toISOString()
    };

    eventQueue.push(logEntry);

    if (interaction.immediate) {
      flushQueue();
    } else {
      if (!flushTimeout) {
        flushTimeout = setTimeout(flushQueue, 1500);
      }
    }
  } catch (err) {
    // Fail silently so storefront interaction is never blocked
    console.debug('[VisitorTracker] Error queueing log:', err);
  }
}

/**
 * Flush queued events to backend API
 */
async function flushQueue() {
  if (flushTimeout) {
    clearTimeout(flushTimeout);
    flushTimeout = null;
  }

  if (eventQueue.length === 0 || isFlushing) return;
  if (!navigator.onLine) return; // Keep in memory until connection restored

  const batch = [...eventQueue];
  eventQueue = [];
  isFlushing = true;

  try {
    const response = await fetch('/api/analytics/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ events: batch })
    });

    if (!response.ok) {
      // Re-queue on failure (preserving up to 50 max to prevent memory growth)
      eventQueue = [...batch.slice(-30), ...eventQueue];
    }
  } catch (err) {
    // Re-queue on network error
    eventQueue = [...batch.slice(-30), ...eventQueue];
  } finally {
    isFlushing = false;
  }
}

// Flush queue before page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (eventQueue.length > 0 && navigator.sendBeacon) {
      try {
        const payload = JSON.stringify({ events: eventQueue });
        navigator.sendBeacon('/api/analytics/track', payload);
      } catch {
        // Ignored
      }
    }
  });

  window.addEventListener('online', () => {
    flushQueue();
  });
}

// =========================================================================
// HIGH-LEVEL TRACKING HELPERS
// =========================================================================

export function trackPageView(pageUrl?: string, metadata?: any) {
  logVisitorInteraction({
    interactionType: 'PAGE_VIEW',
    pageUrl,
    metadata
  });
}

export function trackProductView(product: Product, metadata?: any) {
  if (!product) return;
  logVisitorInteraction({
    interactionType: 'PRODUCT_VIEW',
    productId: product.id,
    productName: product.name,
    productPrice: Number(product.price || product.discountPrice || 0),
    productCategory: product.category,
    productBrand: product.brand,
    productImage: product.image || (product.images && product.images[0]),
    metadata
  });
}

// Debounced search tracking ref
let searchDebounceTimer: any = null;
export function trackSearch(query: string, resultsCount: number, category?: string) {
  const clean = String(query || '').trim();
  if (!clean || clean.length < 2) return;

  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    logVisitorInteraction({
      interactionType: 'SEARCH',
      searchQuery: clean,
      searchResultsCount: resultsCount,
      categoryFilter: category,
      metadata: { queryLength: clean.length }
    });
  }, 1200);
}

export function trackCategoryFilter(category: string) {
  if (!category || category === 'All') return;
  logVisitorInteraction({
    interactionType: 'CATEGORY_FILTER',
    categoryFilter: category
  });
}

export function trackBrandFilter(brand: string) {
  if (!brand || brand === 'All') return;
  logVisitorInteraction({
    interactionType: 'BRAND_FILTER',
    brandFilter: brand
  });
}

export function trackAddToCart(product: Product, quantity: number = 1) {
  if (!product) return;
  logVisitorInteraction({
    interactionType: 'ADD_TO_CART',
    productId: product.id,
    productName: product.name,
    productPrice: Number(product.price || product.discountPrice || 0),
    productCategory: product.category,
    productBrand: product.brand,
    productImage: product.image || (product.images && product.images[0]),
    quantity,
    immediate: true
  });
}

export function trackRemoveFromCart(productId: string, productName?: string) {
  logVisitorInteraction({
    interactionType: 'REMOVE_FROM_CART',
    productId,
    productName
  });
}

export function trackExpressBuy(product: Product) {
  if (!product) return;
  logVisitorInteraction({
    interactionType: 'EXPRESS_BUY_OPEN',
    productId: product.id,
    productName: product.name,
    productPrice: Number(product.price || product.discountPrice || 0),
    productCategory: product.category,
    productBrand: product.brand,
    productImage: product.image,
    immediate: true
  });
}

export const trackExpressBuyOpen = trackExpressBuy;

export function identifyVisitorUser(userId?: string, userEmail?: string, userName?: string) {
  if (typeof window === 'undefined' || (!userId && !userEmail)) return;
  try {
    if (userId) sessionStorage.setItem('ge_auth_user_id', userId);
    if (userEmail) sessionStorage.setItem('ge_auth_user_email', userEmail);
    if (userName) sessionStorage.setItem('ge_auth_user_name', userName);
  } catch {
    // Ignored
  }
}

export function trackCheckoutInitiated(cartCount: number, totalAmount: number) {
  logVisitorInteraction({
    interactionType: 'CHECKOUT_INITIATED',
    quantity: cartCount,
    productPrice: totalAmount,
    immediate: true
  });
}

export function trackOrderPlaced(orderId: string, totalAmount: number, itemsCount: number) {
  logVisitorInteraction({
    interactionType: 'ORDER_PLACED',
    orderId,
    productPrice: totalAmount,
    quantity: itemsCount,
    immediate: true
  });
}

export function trackWhatsAppClick(sourceOrPayload: string | { itemsCount?: number; totalAmount?: number; products?: string[] }, product?: Product) {
  const metadata = typeof sourceOrPayload === 'string' 
    ? { source: sourceOrPayload } 
    : sourceOrPayload;

  logVisitorInteraction({
    interactionType: 'WHATSAPP_CLICK',
    productId: product?.id,
    productName: product?.name,
    productPrice: product ? Number(product.price || 0) : undefined,
    productCategory: product?.category,
    productBrand: product?.brand,
    metadata,
    immediate: true
  });
}

export function trackCompareProduct(productIds: string[]) {
  logVisitorInteraction({
    interactionType: 'COMPARE_PRODUCT',
    metadata: { productIds, count: productIds.length }
  });
}

// =========================================================================
// ADMIN API CLIENT FUNCTIONS
// =========================================================================

/**
 * Fetch aggregated Visitor Analytics Summary for the Admin UI
 */
export async function fetchVisitorSummary(timeframe: string = '30days'): Promise<VisitorAnalyticsSummary> {
  const res = await fetch(`/api/analytics/summary?timeframe=${encodeURIComponent(timeframe)}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch analytics summary: ${res.statusText}`);
  }
  return await res.json();
}

/**
 * Fetch filtered raw visitor logs for the Admin UI
 */
export async function fetchVisitorLogs(filters: VisitorFilterOptions = {}): Promise<{
  logs: VisitorLog[];
  total: number;
  retentionDays: number;
}> {
  const params = new URLSearchParams();
  if (filters.productId) params.append('productId', filters.productId);
  if (filters.interactionType && filters.interactionType !== 'ALL') params.append('interactionType', filters.interactionType);
  if (filters.searchQuery) params.append('searchQuery', filters.searchQuery);
  if (filters.deviceType && filters.deviceType !== 'ALL') params.append('deviceType', filters.deviceType);
  if (filters.timeframe) params.append('timeframe', filters.timeframe);
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  if (filters.excludeStaff !== undefined) params.append('excludeStaff', filters.excludeStaff.toString());
  if (filters.onlyStaff !== undefined) params.append('onlyStaff', filters.onlyStaff.toString());
  if (filters.limit) params.append('limit', filters.limit.toString());
  if (filters.offset) params.append('offset', filters.offset.toString());

  const res = await fetch(`/api/analytics/visitors?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch visitor logs: ${res.statusText}`);
  }
  return await res.json();
}

/**
 * Trigger explicit cleanup of visitor logs older than 60 days
 */
export async function triggerVisitorLogsCleanup(maxDays: number = 60): Promise<{
  success: boolean;
  deletedCount: number;
  message: string;
}> {
  const res = await fetch('/api/analytics/cleanup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ maxDays })
  });
  if (!res.ok) {
    throw new Error(`Failed to cleanup logs: ${res.statusText}`);
  }
  return await res.json();
}

/**
 * Export visitor logs to CSV format for download
 */
export function exportVisitorLogsToCSV(logs: VisitorLog[], filename = 'victor_analytics_logs.csv') {
  if (!logs || logs.length === 0) return;

  const headers = [
    'Log ID',
    'Timestamp (EAT)',
    'Visitor ID',
    'Session ID',
    'Interaction Type',
    'Product Name',
    'Product ID',
    'Category',
    'Brand',
    'Price (TZS)',
    'Search Query',
    'Search Results Count',
    'Device',
    'Browser',
    'OS',
    'Page URL',
    'Referrer'
  ];

  const rows = logs.map(l => [
    `"${l.id}"`,
    `"${formatToGMT3(l.createdAt)}"`,
    `"${l.visitorId || ''}"`,
    `"${l.sessionId || ''}"`,
    `"${l.interactionType || ''}"`,
    `"${(l.productName || '').replace(/"/g, '""')}"`,
    `"${l.productId || ''}"`,
    `"${l.productCategory || ''}"`,
    `"${l.productBrand || ''}"`,
    l.productPrice || 0,
    `"${(l.searchQuery || '').replace(/"/g, '""')}"`,
    l.searchResultsCount || 0,
    `"${l.deviceType || ''}"`,
    `"${l.browser || ''}"`,
    `"${l.os || ''}"`,
    `"${(l.pageUrl || '').replace(/"/g, '""')}"`,
    `"${(l.referrer || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
