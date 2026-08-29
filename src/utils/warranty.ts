/**
 * Utility for calculating warranty durations, expiration dates, and remaining countdowns.
 */

export interface WarrantyStatus {
  term: string;
  purchaseDate: Date;
  purchaseDateFormatted: string;
  expiryDate: Date;
  expiryDateFormatted: string;
  isExpired: boolean;
  isExpiringSoon: boolean; // Less than 30 days remaining
  remainingDays: number;
  remainingText: string;
  progressPercent: number; // 0 to 100% of warranty lifespan remaining
  statusLabel: 'Active' | 'Expiring Soon' | 'Expired';
}

/**
 * Parses warranty string like "2 Years Official Warranty", "1 Year", "6 Months", "3 Years", etc.
 * Defaults to 2 Years if unspecified or unparseable.
 */
export function calculateWarrantyStatus(
  purchaseDateInput: string | Date | undefined,
  warrantyString?: string
): WarrantyStatus {
  const defaultTerm = warrantyString && warrantyString.trim().length > 0 
    ? warrantyString.trim() 
    : '2 Years Official Warranty';

  const purchaseDate = purchaseDateInput ? new Date(purchaseDateInput) : new Date();
  // Fallback if invalid date
  const validPurchaseDate = isNaN(purchaseDate.getTime()) ? new Date() : purchaseDate;

  // Determine warranty duration in months or days
  const lower = String(defaultTerm || "").toLowerCase();
  let durationMonths = 24; // default 2 years (24 months)

  const yearMatch = lower.match(/(\d+)\s*(?:year|yr|years|yrs)/);
  const monthMatch = lower.match(/(\d+)\s*(?:month|mo|months|mos)/);
  const dayMatch = lower.match(/(\d+)\s*(?:day|days)/);

  if (yearMatch && yearMatch[1]) {
    durationMonths = parseInt(yearMatch[1], 10) * 12;
  } else if (monthMatch && monthMatch[1]) {
    durationMonths = parseInt(monthMatch[1], 10);
  } else if (dayMatch && dayMatch[1]) {
    durationMonths = Math.max(1, Math.round(parseInt(dayMatch[1], 10) / 30));
  } else if (lower.includes('1 year') || lower.includes('1yr')) {
    durationMonths = 12;
  } else if (lower.includes('2 year') || lower.includes('2yr')) {
    durationMonths = 24;
  } else if (lower.includes('3 year') || lower.includes('3yr')) {
    durationMonths = 36;
  } else if (lower.includes('5 year') || lower.includes('5yr')) {
    durationMonths = 60;
  }

  // Calculate Expiry Date
  const expiryDate = new Date(validPurchaseDate);
  expiryDate.setMonth(expiryDate.getMonth() + durationMonths);

  const now = new Date();
  const totalDurationMs = expiryDate.getTime() - validPurchaseDate.getTime();
  const remainingMs = expiryDate.getTime() - now.getTime();
  const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));

  const isExpired = remainingMs <= 0 || remainingDays <= 0;
  const isExpiringSoon = !isExpired && remainingDays <= 30;

  // Format Dates in clean East Africa Standard / GMT+3 locale
  const formatDate = (d: Date) => {
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'Africa/Dar_es_Salaam',
    });
  };

  // Human-readable countdown text
  let remainingText = '';
  if (isExpired) {
    const expiredAgoDays = Math.abs(remainingDays);
    if (expiredAgoDays === 0) {
      remainingText = 'Expired today';
    } else if (expiredAgoDays === 1) {
      remainingText = 'Expired yesterday';
    } else if (expiredAgoDays < 30) {
      remainingText = `Expired ${expiredAgoDays} days ago`;
    } else if (expiredAgoDays < 365) {
      const mos = Math.floor(expiredAgoDays / 30);
      remainingText = `Expired ${mos} ${mos === 1 ? 'month' : 'months'} ago`;
    } else {
      const yrs = (expiredAgoDays / 365).toFixed(1);
      remainingText = `Expired ${yrs} years ago`;
    }
  } else {
    if (remainingDays === 1) {
      remainingText = '1 day remaining (Expires tomorrow)';
    } else if (remainingDays <= 30) {
      remainingText = `${remainingDays} days remaining`;
    } else if (remainingDays < 365) {
      const mos = Math.floor(remainingDays / 30);
      const remDays = remainingDays % 30;
      remainingText = remDays > 0 
        ? `${mos} mos, ${remDays} days left (${remainingDays}d)`
        : `${mos} months remaining`;
    } else {
      const yrs = Math.floor(remainingDays / 365);
      const remMos = Math.floor((remainingDays % 365) / 30);
      remainingText = remMos > 0 
        ? `${yrs} yr, ${remMos} mos left (${remainingDays} days)`
        : `${yrs} ${yrs === 1 ? 'year' : 'years'} left (${remainingDays} days)`;
    }
  }

  // Calculate percentage of warranty remaining (0 - 100%)
  const progressPercent = isExpired 
    ? 0 
    : totalDurationMs > 0 
      ? Math.min(100, Math.max(0, Math.round((remainingMs / totalDurationMs) * 100)))
      : 0;

  const statusLabel: 'Active' | 'Expiring Soon' | 'Expired' = isExpired 
    ? 'Expired' 
    : isExpiringSoon 
      ? 'Expiring Soon' 
      : 'Active';

  return {
    term: defaultTerm,
    purchaseDate: validPurchaseDate,
    purchaseDateFormatted: formatDate(validPurchaseDate),
    expiryDate,
    expiryDateFormatted: formatDate(expiryDate),
    isExpired,
    isExpiringSoon,
    remainingDays: isExpired ? 0 : remainingDays,
    remainingText,
    progressPercent,
    statusLabel
  };
}
