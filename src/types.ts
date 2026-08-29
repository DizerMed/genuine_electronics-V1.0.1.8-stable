export type Category = string;

export interface Review {
  id: string;
  productId: string;
  userId?: string;
  userName?: string;
  rating: number;
  comment?: string;
  createdAt?: string;
}

export interface CategoryItem {
  id: string;
  name: string;
  swahiliName?: string;
  slug?: string;
  description?: string;
  icon?: string;
  image?: string;
  productCount?: number;
  sequence?: number;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: Category;
  price: number;
  wholesalePrice?: number;
  costPrice?: number;
  originalPrice?: number;
  discountPrice?: number;
  discountPercentage?: number;
  isOnOffer?: boolean;
  offerEndsAt?: string;
  offerTitle?: string;
  rating?: number;
  reviewsCount?: number;
  inStock?: boolean;
  stockCount?: number;
  stock?: number;
  minStockAlert?: number;
  image: string;
  images?: string[];
  description?: string;
  specs?: Record<string, string>;
  featured?: boolean;
  isGenuineVerified?: boolean;
  sku?: string;
  barcode?: string;
  warranty?: string;
  tonnage?: string;
  capacity?: string;
  energyRating?: string;
  isVatInclusive?: boolean;
}

export interface LimitedTimeOffer {
  id: string;
  title: string;
  subtitle?: string;
  badgeText?: string;
  discountPercentage?: number;
  startDate?: string;
  endDate: string;
  isActive: boolean;
  categoryIds?: string[];
  productIds?: string[];
  bannerImage?: string;
  createdAt?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  price?: number;
  serialNumbers?: string[];
  priceTier?: "retail" | "wholesale";
}

export interface OrderItem {
  product: Product;
  quantity: number;
  price?: number;
  serialNumbers?: string[];
  priceTier?: "retail" | "wholesale";
}

export interface TrackingTimelineEvent {
  title: string;
  description?: string;
  time: string;
  location?: string;
  completed?: boolean;
}

export interface LoanRepayment {
  id: string;
  amount: number;
  date: string;
  paymentMethod: string;
  receiptNumber?: string;
  recordedBy: string;
  notes?: string;
}

export interface Order {
  id: string;
  createdAt: string;
  userId?: string;
  user_id?: string;
  customerId?: string;
  customer_id?: string;
  customerName: string;
  customer_name?: string;
  customerEmail: string;
  customer_email?: string;
  customerPhone?: string;
  customer_phone?: string;
  phone?: string;
  shippingAddress: string;
  shipping_address?: string;
  city?: string;
  items: OrderItem[];
  totalAmount: number;
  total_amount?: number;
  status:
    | "Pending"
    | "Processing"
    | "Shipped"
    | "Delivered"
    | "Completed"
    | "Cancelled";
  paymentMethod: string;
  payment_method?: string;
  paymentStatus?: "Pending" | "Partial" | "Paid" | "Failed";
  payment_status?: string;
  trackingNumber?: string;
  tracking_number?: string;
  courierName?: string;
  courier?: string;
  estimatedDelivery?: string;
  trackingTimeline?: TrackingTimelineEvent[];
  notes?: string;
  deliveryNotes?: string;
  customerTin?: string;
  vatPercentage?: number;
  includeVat?: boolean;
  tax?: number;
  subtotal?: number;
  discount?: number;
  extraCosts?: ExtraCost[];
  isLoan?: boolean;
  is_loan?: boolean;
  downPayment?: number;
  down_payment?: number;
  paidAmount?: number;
  paid_amount?: number;
  outstandingBalance?: number;
  outstanding_balance?: number;
  partialPayments?: LoanRepayment[];
  loanBalance?: number;
  loan_balance?: number;
  deadline?: string;
  loanDueDate?: string;
  loan_due_date?: string;
  loanDueTime?: string;
  loan_due_time?: string;
  loanDueDateTime?: string;
  loan_due_date_time?: string;
  loanGuarantorName?: string;
  loan_guarantor_name?: string;
  loanGuarantorPhone?: string;
  loan_guarantor_phone?: string;
  loanNationalId?: string;
  loan_national_id?: string;
  loanStatus?: "unpaid" | "partial" | "paid" | "overdue";
  loan_status?: string;
  loanRepayments?: LoanRepayment[];
  loan_repayments?: LoanRepayment[];
  updatedAt?: string;
  updated_at?: string;
}

export interface ExtraCost {
  id?: string;
  name: string;
  amount: number;
}

export interface POSTransaction {
  id: string;
  createdAt: string;
  cashierName: string;
  items: OrderItem[];
  subtotal?: number;
  tax?: number;
  discount?: number;
  extraCosts?: ExtraCost[];
  total?: number;
  totalAmount?: number;
  tenderedAmount?: number;
  changeAmount?: number;
  paymentMethod: string;
  splitPayments?: { method: string; amount: number; reference?: string }[];
  priceTier?: "retail" | "wholesale";
  receiptNumber?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerTin?: string;
  shippingAddress?: string;
  notes?: string;
  orderReference?: string;
  vatPercentage?: number;
  includeVat?: boolean;
  status?: "Completed" | "Refunded" | "Parked";
  userId?: string;
  user_id?: string;
  customerId?: string;
  customer_id?: string;
  // Sell by Loan / Credit Extension
  isLoan?: boolean;
  is_loan?: boolean;
  downPayment?: number;
  down_payment?: number;
  paidAmount?: number;
  paid_amount?: number;
  outstandingBalance?: number;
  outstanding_balance?: number;
  partialPayments?: LoanRepayment[];
  loanBalance?: number;
  loan_balance?: number;
  deadline?: string;
  loanDueDate?: string;
  loan_due_date?: string;
  loanDueTime?: string;
  loan_due_time?: string;
  loanDueDateTime?: string;
  loan_due_date_time?: string;
  loanGuarantorName?: string;
  loan_guarantor_name?: string;
  loanGuarantorPhone?: string;
  loan_guarantor_phone?: string;
  loanNationalId?: string;
  loan_national_id?: string;
  loanStatus?: "unpaid" | "partial" | "paid" | "overdue";
  loan_status?: string;
  loanRepayments?: LoanRepayment[];
  loan_repayments?: LoanRepayment[];
  updatedAt?: string;
  updated_at?: string;
}

export type StaffRole =
  | "Super Admin"
  | "Branch Manager"
  | "Cashier / POS Associate"
  | "Storekeeper / Dispatch"
  | "Staff";

export type StaffPermission =
  | "ALL"
  | "POS_ACCESS"
  | "VIEW_CATALOG"
  | "EDIT_PRODUCTS"
  | "MANAGE_STOCK"
  | "VIEW_FINANCIALS"
  | "MANAGE_STAFF"
  | "MANAGE_SETTINGS"
  | "MANAGE_LOANS"
  | "VIEW_AUDIT_LOGS"
  | "DISPATCH_ORDERS";

export interface Staff {
  id: string;
  name: string;
  role: StaffRole | string;
  email: string;
  phone?: string;
  status: "Active" | "Inactive";
  avatar?: string;
  permissions?: (StaffPermission | string)[];
  lastLogin?: string;
  createdAt?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorEmail: string;
  actorRole: string;
  action:
    | "PRODUCT_CREATED"
    | "PRODUCT_UPDATED"
    | "PRODUCT_DELETED"
    | "PRICE_CHANGED"
    | "STOCK_ADJUSTED"
    | "POS_SALE_COMPLETED"
    | "POS_SALE_VOIDED"
    | "LOAN_CREATED"
    | "LOAN_REPAYMENT"
    | "ORDER_CREATED"
    | "ORDER_STATUS_UPDATED"
    | "DISCOUNT_APPLIED"
    | "STAFF_ADDED"
    | "STAFF_UPDATED"
    | "STAFF_PERMISSIONS_CHANGED"
    | "STAFF_DELETED"
    | "SETTINGS_UPDATED"
    | "NOTIFICATION_DISPATCHED"
    | "BULK_STOCK_UPDATED"
    | "EXPORT_DATA"
    | string;
  targetId?: string;
  targetType?:
    | "product"
    | "order"
    | "pos_transaction"
    | "loan"
    | "staff"
    | "settings"
    | "notification"
    | "system";
  details: string;
  changesSummary?: { field: string; oldVal: any; newVal: any }[];
  ipAddress?: string;
}

export interface NotificationLog {
  id: string;
  timestamp: string;
  recipientPhone: string;
  recipientName?: string;
  channel: "SMS" | "WhatsApp";
  type:
    | "ORDER_CONFIRMATION"
    | "DISPATCH_UPDATE"
    | "LOAN_REMINDER"
    | "RECEIPT_SHARE"
    | "CUSTOM";
  status: "SENT" | "DELIVERED" | "QUEUED" | "FAILED";
  messageBody: string;
  orderId?: string;
  posTransactionId?: string;
  sentBy?: string;
}

export interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  totalOrders: number;
  totalItemsPurchased?: number;
  lifetimeValue: number;
  lastOrder?: string;
  notes?: string;
  tier?: "Platinum VIP" | "Gold VIP" | "Silver" | "Standard";
  registeredAt?: string;
}

export interface User {
  id: string;
  email: string;
  displayName?: string;
  fullName?: string;
  full_name?: string;
  role: "admin" | "customer";
  avatarUrl?: string;
  address?: string;
  phone?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  fullName?: string;
  full_name?: string;
  role: "admin" | "customer";
  avatarUrl?: string;
  address?: string;
  phone?: string;
}

export interface PaymentMethodSetting {
  id: string;
  type: string;
  provider: string;
  accountName: string;
  accountNumber: string;
  instructions?: string;
  isActive: boolean;
}

export interface StoreSettings {
  storeName: string;
  tagline: string;
  tin: string;
  vrn: string;
  address: string;
  phone: string;
  email: string;
  bankName: string;
  bankAccount: string;
  bankSwift: string;
  mobileMoneyNumber: string;
  mobileMoneyName: string;
  whatsappNumber: string;
  announcementText: string;
  showAnnouncement: boolean;
  heroBadge: string;
  heroTitle: string;
  heroSubtitle: string;
  heroImage: string;
  heroLayout?:
    | "centered"
    | "side-by-side"
    | "full-banner"
    | "modern-card"
    | "split"
    | "minimal"
    | "bold";
  logoUrl?: string;
  paymentMethods: PaymentMethodSetting[];
  fontFamily?: string;
  primaryColor?: string;
  offerEnabled?: boolean;
  offerTitle?: string;
  offerSubtitle?: string;
  offerEndsAt?: string;
  offerBadgeText?: string;
  offerDiscountPercentage?: number;
  vatPercentage?: number;
  // SEO & Search Engine Optimization Metadata
  seoTitle?: string;
  seoDescription?: string;
  canonicalUrl?: string;
  seoKeywords?: string;
  ogImage?: string;
  ogType?: string;
  twitterHandle?: string;
  twitterCardType?: "summary" | "summary_large_image";
  robotsIndex?: boolean;
  robotsFollow?: boolean;
  googleSiteVerification?: string;
  bingSiteVerification?: string;
  structuredDataEnabled?: boolean;
  searchBreadcrumbsEnabled?: boolean;
  autoSeoEnabled?: boolean;
}

export function formatTZS(amount: number): string {
  return new Intl.NumberFormat("en-TZ", {
    style: "currency",
    currency: "TZS",
    maximumFractionDigits: 0,
  })
    .format(amount || 0)
    .replace("TZS", "TZS ");
}

export function formatToGMT3(
  dateInput: string | Date | undefined | null,
): string {
  if (!dateInput) return "N/A";
  try {
    let dateStr = String(dateInput).trim();
    // Clean any pre-existing EAT suffix
    dateStr = dateStr.replace(/\s*EAT$/i, "").trim();

    // If already in local date string format "YYYY-MM-DD HH:mm:ss" without ISO 'T'/'Z'/'+', return cleanly as already in local time
    if (
      !dateStr.includes("T") &&
      !dateStr.includes("Z") &&
      !dateStr.includes("+") &&
      dateStr.match(/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/)
    ) {
      return dateStr;
    }

    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return dateStr;

    const options: Intl.DateTimeFormatOptions = {
      timeZone: "Africa/Nairobi",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    };
    const formatter = new Intl.DateTimeFormat("en-GB", options);
    const parts = formatter.formatToParts(date);
    const day = parts.find((p) => p.type === "day")?.value || "00";
    const month = parts.find((p) => p.type === "month")?.value || "00";
    const year = parts.find((p) => p.type === "year")?.value || "0000";
    const hour = parts.find((p) => p.type === "hour")?.value || "00";
    const minute = parts.find((p) => p.type === "minute")?.value || "00";
    const second = parts.find((p) => p.type === "second")?.value || "00";
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  } catch (err) {
    return String(dateInput);
  }
}

/**
 * Returns formatted date components in East Africa Time (EAT, UTC+3)
 */
export function getEATCurrentParts(now: Date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return {
    year: map.year || "2026",
    yy: (map.year || "2026").slice(-2),
    mm: map.month || "01",
    dd: map.day || "01",
    hh: map.hour || "00",
    mn: map.minute || "00",
    ss: map.second || "00",
    dateKey: `${map.year}-${map.month}-${map.day}`,
    formatted: `${map.year}-${map.month}-${map.day} ${map.hour}:${map.minute}:${map.second}`,
  };
}

export const BRAND_LOGO_URL =
  "https://ukwkseawcdwbpsjnwrut.supabase.co/storage/v1/object/public/genuine_electronics/Genuine%20Electronics%203D%2002.png";

// =========================================================================
// VISITOR & TRAFFIC ANALYTICS TYPES (2-MONTH RETENTION SPEC)
// =========================================================================

export type VisitorInteractionType =
  | "PAGE_VIEW"
  | "PRODUCT_VIEW"
  | "SEARCH"
  | "CATEGORY_FILTER"
  | "BRAND_FILTER"
  | "ADD_TO_CART"
  | "REMOVE_FROM_CART"
  | "EXPRESS_BUY_OPEN"
  | "CHECKOUT_INITIATED"
  | "ORDER_PLACED"
  | "WHATSAPP_CLICK"
  | "COMPARE_PRODUCT";

export interface VisitorLog {
  id: string;
  visitorId: string;
  sessionId: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
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
  referrer?: string;
  deviceType?: "Mobile" | "Desktop" | "Tablet" | "Unknown";
  browser?: string;
  os?: string;
  ipAddress?: string;
  country?: string;
  city?: string;
  metadata?: Record<string, any>;
  isAdmin?: boolean;
  isStaff?: boolean;
  userRole?: string;
  createdAt: string;
}

export interface ActiveStaffMember {
  id: string;
  name: string;
  email: string;
  role: string;
  lastActive: string;
  currentPage?: string;
  deviceType?: string;
  ipAddress?: string;
  status: "online" | "idle";
}

export interface VisitorTopProduct {
  id: string;
  name: string;
  category: string;
  brand: string;
  price: number;
  image?: string;
  views: number;
  cartAdds: number;
  conversions: number;
  conversionRate: number; // percentage
  topCorrelatedSearches?: {
    query: string;
    matchCount: number;
    percentage: number;
  }[];
  searchAssistedViews?: number;
  isTrending?: boolean;
  trendScore?: number; // 0-100 composite score
}

export interface VisitorTopSearch {
  query: string;
  count: number;
  resultsCountAvg: number;
  lastSearched: string;
}

export interface VisitorDailyTraffic {
  date: string;
  visitors: number;
  uniqueVisitors: number;
  productViews: number;
  searches: number;
  cartAdds: number;
  orders: number;
}

export interface VisitorAnalyticsSummary {
  totalVisits: number;
  uniqueVisitors: number;
  uniqueVisitorsToday: number;
  uniqueVisitorsWeek: number;
  uniqueVisitorsMonth: number;
  liveVisitors15m: number;
  activeStaffCount?: number;
  activeStaffList?: ActiveStaffMember[];
  totalAdminStaffEvents?: number;
  totalProductViews: number;
  totalSearches: number;
  totalCartAdds: number;
  totalOrdersPlaced: number;
  conversionRate: number;
  cartToOrderRate: number;
  topSearches: VisitorTopSearch[];
  topProducts: VisitorTopProduct[];
  topCategories: { category: string; count: number; percentage: number }[];
  deviceBreakdown: { device: string; count: number; percentage: number }[];
  browserBreakdown: { browser: string; count: number; percentage: number }[];
  dailyTraffic: VisitorDailyTraffic[];
  activityHeatmap?: VisitorActivityHeatmapData;
  retentionInfo: {
    maxRetentionDays: number;
    retentionPolicy: string;
    totalLogsStored: number;
    oldestLogDate?: string;
    newestLogDate?: string;
  };
}

export interface VisitorActivityHeatmapCell {
  dayIndex: number; // 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun
  dayName: string; // 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'
  dayFullName: string; // 'Monday', 'Tuesday', ...
  hour: number; // 0..23
  hourLabel: string; // '12 AM', '1 AM', ... '11 PM'
  count: number;
  uniqueVisitors: number;
  intensity: number; // 0.0 to 1.0
  productViews: number;
  searches: number;
  cartAdds: number;
  orders: number;
}

export interface VisitorActivityHeatmapData {
  cells: VisitorActivityHeatmapCell[];
  peakDay: string;
  peakDayCount: number;
  peakHour: string;
  peakHourCount: number;
  peakTimeWindow: string;
  recommendedPromoWindow: string;
  quietMaintenanceWindow: string;
  serverLoadRating: "OPTIMAL" | "MODERATE" | "HEAVY" | "PEAK_LOAD";
  totalHeatmapInteractions: number;
  busiestDayIndex: number;
  busiestHour: number;
  hourlyDistribution: { hour: number; hourLabel: string; count: number }[];
  dailyDistribution: { dayIndex: number; dayName: string; count: number }[];
}

export interface VisitorFilterOptions {
  productId?: string;
  interactionType?: VisitorInteractionType | "ALL";
  searchQuery?: string;
  deviceType?: string;
  timeframe?: "today" | "yesterday" | "7days" | "30days" | "60days" | "all";
  startDate?: string;
  endDate?: string;
  excludeStaff?: boolean;
  onlyStaff?: boolean;
  limit?: number;
  offset?: number;
}
